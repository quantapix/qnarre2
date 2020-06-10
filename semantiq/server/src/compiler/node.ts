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

  const enum Codes {
    AAA,
    BBB,
  }
  interface QNode {
    kind: Codes;
  }
  namespace QNode {
    export function create(kind: Codes) {
      return { kind } as QNode;
    }
  }
  interface Aaa extends QNode {
    kind: Codes.AAA;
    aa?: number;
  }
  namespace Aaa {
    export const kind = Codes.AAA;
  }
  interface Bbb extends QNode {
    kind: Codes.BBB;
    bb?: number;
  }
  namespace Bbb {
    export const kind = Codes.BBB;
  }
  interface CMap {
    [Codes.AAA]: Aaa;
    [Codes.BBB]: Bbb;
  }
  type GN<C extends Codes> = C extends keyof CMap ? CMap[C] : never;

  function isKind<C extends Codes, T extends { kind: C }>(t: T, n: GN<C>): n is GN<C> {
    return n.kind === t.kind;
  }

  const a = QNode.create(Codes.AAA);
  const b = QNode.create(Codes.BBB);

  console.log(isKind(Aaa, a), '*** true');
  console.log(isKind(Bbb, a), '*** false');
  console.log(isKind(Aaa, b), '*** false');
  console.log(isKind(Bbb, b), '*** true');

  export namespace Node {
    const kind = SyntaxKind.Unknown;
    export function createSynthesized(k: SyntaxKind): Node {
      const n = createNode(k, -1, -1);
      n.flags |= NodeFlags.Synthesized;
      return n;
    }
    export function createTemplateLiteralLike(k: TemplateLiteralToken['kind'], t: string, raw?: string) {
      const n = createSynthesized(k) as TemplateLiteralLikeNode;
      n.text = t;
      if (raw === undefined || t === raw) n.rawText = raw;
      else {
        const r = Scanner.process(k, raw);
        if (typeof r === 'object') return fail('Invalid raw text');
        assert(t === r, "Expected 'text' to be the normalized version of 'rawText'");
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
    export const kind = SyntaxKind.NumericLiteral;
    export function create(t: string, fs: TokenFlags = TokenFlags.None) {
      const n = Node.createSynthesized(SyntaxKind.NumericLiteral) as NumericLiteral;
      n.text = t;
      n.numericLiteralFlags = fs;
      return n;
    }
    export function kinda(n: Node): n is NumericLiteral {
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
      return n.kind === SyntaxKind.StringLiteral || n.kind === SyntaxKind.NoSubstitutionLiteral;
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

  export interface RegexLiteral extends LiteralExpression {
    kind: SyntaxKind.RegexLiteral;
  }
  export namespace RegexLiteral {
    export function create(t: string) {
      const n = Node.createSynthesized(SyntaxKind.RegexLiteral) as RegexLiteral;
      n.text = t;
      return n;
    }
    export function kind(n: Node): n is RegexLiteral {
      return n.kind === SyntaxKind.RegexLiteral;
    }
  }

  export interface NoSubstitutionLiteral extends LiteralExpression, TemplateLiteralLikeNode, Declaration {
    kind: SyntaxKind.NoSubstitutionLiteral;
    templateFlags?: TokenFlags;
  }
  export namespace NoSubstitutionLiteral {
    export function create(t: string, raw?: string) {
      return Node.createTemplateLiteralLike(SyntaxKind.NoSubstitutionLiteral, t, raw) as NoSubstitutionLiteral;
    }
    export function kind(n: Node): n is NoSubstitutionLiteral {
      return n.kind === SyntaxKind.NoSubstitutionLiteral;
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
    export function create(k: KeywordTypeNode['kind']) {
      return Node.createSynthesized(k) as KeywordTypeNode;
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
    export function create(p: Identifier | ThisTypeNode | string, t: TypeNode) {
      return createWithModifier(undefined, p, t);
    }
    export function createWithModifier(a: AssertsToken | undefined, p: Identifier | ThisTypeNode | string, t?: TypeNode) {
      const n = Node.createSynthesized(SyntaxKind.TypePredicate) as TypePredicateNode;
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
    export function kind(n: Node): n is TypePredicateNode {
      return n.kind === SyntaxKind.TypePredicate;
    }
  }

  export interface TypeReferenceNode extends NodeWithTypeArguments {
    kind: SyntaxKind.TypeReference;
    typeName: EntityName;
  }
  export namespace TypeReferenceNode {
    export function create(t: string | EntityName, ts?: readonly TypeNode[]) {
      const n = Node.createSynthesized(SyntaxKind.TypeReference) as TypeReferenceNode;
      n.typeName = asName(t);
      n.typeArguments = ts && parenthesizeTypeParameters(ts);
      return n;
    }
    export function update(n: TypeReferenceNode, t: EntityName, ts?: NodeArray<TypeNode>) {
      return n.typeName !== t || n.typeArguments !== ts ? updateNode(create(t, ts), n) : n;
    }
    export function kind(n: Node): n is TypeReferenceNode {
      return n.kind === SyntaxKind.TypeReference;
    }
  }

  export interface FunctionTypeNode extends FunctionOrConstructorTypeNodeBase {
    kind: SyntaxKind.FunctionType;
  }
  export namespace FunctionTypeNode {
    export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
      return SignatureDeclaration.create(SyntaxKind.FunctionType, ts, ps, t) as FunctionTypeNode;
    }
    export function update(n: FunctionTypeNode, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t?: TypeNode) {
      return SignatureDeclaration.update(n, ts, ps, t);
    }
    export function kind(n: Node): n is FunctionTypeNode {
      return n.kind === SyntaxKind.FunctionType;
    }
  }

  export interface ConstructorTypeNode extends FunctionOrConstructorTypeNodeBase {
    kind: SyntaxKind.ConstructorType;
  }
  export namespace ConstructorTypeNode {
    export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
      return SignatureDeclaration.create(SyntaxKind.ConstructorType, ts, ps, t) as ConstructorTypeNode;
    }
    export function update(n: ConstructorTypeNode, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t?: TypeNode) {
      return SignatureDeclaration.update(n, ts, ps, t);
    }
    export function kind(n: Node): n is ConstructorTypeNode {
      return n.kind === SyntaxKind.ConstructorType;
    }
  }

  export interface TypeQueryNode extends TypeNode {
    kind: SyntaxKind.TypeQuery;
    exprName: EntityName;
  }
  export namespace TypeQueryNode {
    export function create(e: EntityName) {
      const n = Node.createSynthesized(SyntaxKind.TypeQuery) as TypeQueryNode;
      n.exprName = e;
      return n;
    }
    export function update(n: TypeQueryNode, e: EntityName) {
      return n.exprName !== e ? updateNode(create(e), n) : n;
    }
    export function kind(n: Node): n is TypeQueryNode {
      return n.kind === SyntaxKind.TypeQuery;
    }
  }

  export interface TypeLiteralNode extends TypeNode, Declaration {
    kind: SyntaxKind.TypeLiteral;
    members: NodeArray<TypeElement>;
  }
  export namespace TypeLiteralNode {
    export function create(ms: readonly TypeElement[] | undefined) {
      const n = Node.createSynthesized(SyntaxKind.TypeLiteral) as TypeLiteralNode;
      n.members = createNodeArray(ms);
      return n;
    }
    export function update(n: TypeLiteralNode, ms: NodeArray<TypeElement>) {
      return n.members !== ms ? updateNode(create(ms), n) : n;
    }
    export function kind(n: Node): n is TypeLiteralNode {
      return n.kind === SyntaxKind.TypeLiteral;
    }
  }

  export interface ArrayTypeNode extends TypeNode {
    kind: SyntaxKind.ArrayType;
    elementType: TypeNode;
  }
  export namespace ArrayTypeNode {
    export function create(t: TypeNode) {
      const n = Node.createSynthesized(SyntaxKind.ArrayType) as ArrayTypeNode;
      n.elementType = parenthesizeArrayTypeMember(t);
      return n;
    }
    export function update(n: ArrayTypeNode, t: TypeNode) {
      return n.elementType !== t ? updateNode(create(t), n) : n;
    }
    export function kind(n: Node): n is ArrayTypeNode {
      return n.kind === SyntaxKind.ArrayType;
    }
  }

  export interface TupleTypeNode extends TypeNode {
    kind: SyntaxKind.TupleType;
    elements: NodeArray<TypeNode | NamedTupleMember>;
  }
  export namespace TupleTypeNode {
    export function create(es: readonly (TypeNode | NamedTupleMember)[]) {
      const n = Node.createSynthesized(SyntaxKind.TupleType) as TupleTypeNode;
      n.elements = createNodeArray(es);
      return n;
    }
    export function update(n: TupleTypeNode, es: readonly (TypeNode | NamedTupleMember)[]) {
      return n.elements !== es ? updateNode(create(es), n) : n;
    }
    export function kind(n: Node): n is TupleTypeNode {
      return n.kind === SyntaxKind.TupleType;
    }
  }

  export interface OptionalTypeNode extends TypeNode {
    kind: SyntaxKind.OptionalType;
    type: TypeNode;
  }
  export namespace OptionalTypeNode {
    export function create(t: TypeNode) {
      const n = Node.createSynthesized(SyntaxKind.OptionalType) as OptionalTypeNode;
      n.type = parenthesizeArrayTypeMember(t);
      return n;
    }
    export function update(n: OptionalTypeNode, t: TypeNode): OptionalTypeNode {
      return n.type !== t ? updateNode(create(t), n) : n;
    }
  }

  export interface RestTypeNode extends TypeNode {
    kind: SyntaxKind.RestType;
    type: TypeNode;
  }
  export namespace RestTypeNode {
    export function create(t: TypeNode) {
      const n = Node.createSynthesized(SyntaxKind.RestType) as RestTypeNode;
      n.type = t;
      return n;
    }
    export function update(n: RestTypeNode, t: TypeNode): RestTypeNode {
      return n.type !== t ? updateNode(create(t), n) : n;
    }
  }

  export interface UnionTypeNode extends TypeNode {
    kind: SyntaxKind.UnionType;
    types: NodeArray<TypeNode>;
  }
  export namespace UnionTypeNode {
    export function create(ts: readonly TypeNode[]) {
      return orIntersectionCreate(SyntaxKind.UnionType, ts) as UnionTypeNode;
    }
    export function orIntersectionCreate(k: SyntaxKind.UnionType | SyntaxKind.IntersectionType, ts: readonly TypeNode[]) {
      const n = Node.createSynthesized(k) as UnionTypeNode | IntersectionTypeNode;
      n.types = parenthesizeElementTypeMembers(ts);
      return n;
    }
    export function update(n: UnionTypeNode, ts: NodeArray<TypeNode>) {
      return orIntersectionUpdate(n, ts);
    }
    export function orIntersectionUpdate<T extends UnionOrIntersectionTypeNode>(n: T, ts: NodeArray<TypeNode>): T {
      return n.types !== ts ? updateNode(orIntersectionCreate(n.kind, ts) as T, n) : n;
    }
    export function kind(n: Node): n is UnionTypeNode {
      return n.kind === SyntaxKind.UnionType;
    }
  }

  export interface IntersectionTypeNode extends TypeNode {
    kind: SyntaxKind.IntersectionType;
    types: NodeArray<TypeNode>;
  }
  export namespace IntersectionTypeNode {
    export function create(ts: readonly TypeNode[]) {
      return UnionTypeNode.orIntersectionCreate(SyntaxKind.IntersectionType, ts) as IntersectionTypeNode;
    }
    export function update(n: IntersectionTypeNode, ts: NodeArray<TypeNode>) {
      return UnionTypeNode.orIntersectionUpdate(n, ts);
    }
    export function kind(n: Node): n is IntersectionTypeNode {
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
    export function create(c: TypeNode, e: TypeNode, t: TypeNode, f: TypeNode) {
      const n = Node.createSynthesized(SyntaxKind.ConditionalType) as ConditionalTypeNode;
      n.checkType = parenthesizeConditionalTypeMember(c);
      n.extendsType = parenthesizeConditionalTypeMember(e);
      n.trueType = t;
      n.falseType = f;
      return n;
    }
    export function update(n: ConditionalTypeNode, c: TypeNode, e: TypeNode, t: TypeNode, f: TypeNode) {
      return n.checkType !== c || n.extendsType !== e || n.trueType !== t || n.falseType !== f ? updateNode(create(c, e, t, f), n) : n;
    }
    export function kind(n: Node): n is ConditionalTypeNode {
      return n.kind === SyntaxKind.ConditionalType;
    }
  }

  export interface InferTypeNode extends TypeNode {
    kind: SyntaxKind.InferType;
    typeParameter: TypeParameterDeclaration;
  }
  export namespace InferTypeNode {
    export function create(p: TypeParameterDeclaration) {
      const n = Node.createSynthesized(SyntaxKind.InferType) as InferTypeNode;
      n.typeParameter = p;
      return n;
    }
    export function update(n: InferTypeNode, p: TypeParameterDeclaration) {
      return n.typeParameter !== p ? updateNode(create(p), n) : n;
    }
    export function kind(n: Node): n is InferTypeNode {
      return n.kind === SyntaxKind.InferType;
    }
  }

  export interface ParenthesizedTypeNode extends TypeNode {
    kind: SyntaxKind.ParenthesizedType;
    type: TypeNode;
  }
  export namespace ParenthesizedTypeNode {
    export function create(t: TypeNode) {
      const n = Node.createSynthesized(SyntaxKind.ParenthesizedType) as ParenthesizedTypeNode;
      n.type = t;
      return n;
    }
    export function update(n: ParenthesizedTypeNode, t: TypeNode) {
      return n.type !== t ? updateNode(create(t), n) : n;
    }
    export function kind(n: Node): n is ParenthesizedTypeNode {
      return n.kind === SyntaxKind.ParenthesizedType;
    }
  }

  export interface ThisTypeNode extends TypeNode {
    kind: SyntaxKind.ThisType;
  }
  export namespace ThisTypeNode {
    export function create() {
      return Node.createSynthesized(SyntaxKind.ThisType) as ThisTypeNode;
    }
    export function kind(n: Node): n is ThisTypeNode {
      return n.kind === SyntaxKind.ThisType;
    }
  }

  export interface TypeOperatorNode extends TypeNode {
    kind: SyntaxKind.TypeOperator;
    operator: SyntaxKind.KeyOfKeyword | SyntaxKind.UniqueKeyword | SyntaxKind.ReadonlyKeyword;
    type: TypeNode;
  }
  export namespace TypeOperatorNode {
    export function create(t: TypeNode): TypeOperatorNode;
    export function create(o: SyntaxKind.KeyOfKeyword | SyntaxKind.UniqueKeyword | SyntaxKind.ReadonlyKeyword, t: TypeNode): TypeOperatorNode;
    export function create(o: SyntaxKind.KeyOfKeyword | SyntaxKind.UniqueKeyword | SyntaxKind.ReadonlyKeyword | TypeNode, t?: TypeNode) {
      const n = Node.createSynthesized(SyntaxKind.TypeOperator) as TypeOperatorNode;
      n.operator = typeof o === 'number' ? o : SyntaxKind.KeyOfKeyword;
      n.type = parenthesizeElementTypeMember(typeof o === 'number' ? t! : o);
      return n;
    }
    export function update(n: TypeOperatorNode, t: TypeNode) {
      return n.type !== t ? updateNode(create(n.operator, t), n) : n;
    }
    export function kind(n: Node): n is TypeOperatorNode {
      return n.kind === SyntaxKind.TypeOperator;
    }
  }

  export interface IndexedAccessTypeNode extends TypeNode {
    kind: SyntaxKind.IndexedAccessType;
    objectType: TypeNode;
    indexType: TypeNode;
  }
  export namespace IndexedAccessTypeNode {
    export function create(o: TypeNode, i: TypeNode) {
      const n = Node.createSynthesized(SyntaxKind.IndexedAccessType) as IndexedAccessTypeNode;
      n.objectType = parenthesizeElementTypeMember(o);
      n.indexType = i;
      return n;
    }
    export function update(n: IndexedAccessTypeNode, o: TypeNode, i: TypeNode) {
      return n.objectType !== o || n.indexType !== i ? updateNode(create(o, i), n) : n;
    }
    export function kind(n: Node): n is IndexedAccessTypeNode {
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
    export function create(r: ReadonlyToken | PlusToken | MinusToken | undefined, p: TypeParameterDeclaration, q?: QuestionToken | PlusToken | MinusToken, t?: TypeNode) {
      const n = Node.createSynthesized(SyntaxKind.MappedType) as MappedTypeNode;
      n.readonlyToken = r;
      n.typeParameter = p;
      n.questionToken = q;
      n.type = t;
      return n;
    }
    export function update(n: MappedTypeNode, r: ReadonlyToken | PlusToken | MinusToken | undefined, p: TypeParameterDeclaration, q?: QuestionToken | PlusToken | MinusToken, t?: TypeNode) {
      return n.readonlyToken !== r || n.typeParameter !== p || n.questionToken !== q || n.type !== t ? updateNode(create(r, p, q, t), n) : n;
    }
    export function kind(n: Node): n is MappedTypeNode {
      return n.kind === SyntaxKind.MappedType;
    }
  }

  export interface LiteralTypeNode extends TypeNode {
    kind: SyntaxKind.LiteralType;
    literal: BooleanLiteral | LiteralExpression | PrefixUnaryExpression;
  }
  export namespace LiteralTypeNode {
    export function create(l: LiteralTypeNode['literal']) {
      const n = Node.createSynthesized(SyntaxKind.LiteralType) as LiteralTypeNode;
      n.literal = l;
      return n;
    }
    export function update(n: LiteralTypeNode, l: LiteralTypeNode['literal']) {
      return n.literal !== l ? updateNode(create(l), n) : n;
    }
    export function kind(n: Node): n is LiteralTypeNode {
      return n.kind === SyntaxKind.LiteralType;
    }
  }

  export interface NamedTupleMember extends TypeNode, JSDocContainer, Declaration {
    kind: SyntaxKind.NamedTupleMember;
    dot3Token?: Token<SyntaxKind.Dot3Token>;
    name: Identifier;
    questionToken?: Token<SyntaxKind.QuestionToken>;
    type: TypeNode;
  }
  export namespace NamedTupleMember {
    export function create(d: Token<SyntaxKind.Dot3Token> | undefined, i: Identifier, q: Token<SyntaxKind.QuestionToken> | undefined, t: TypeNode) {
      const n = Node.createSynthesized(SyntaxKind.NamedTupleMember) as NamedTupleMember;
      n.dot3Token = d;
      n.name = i;
      n.questionToken = q;
      n.type = t;
      return n;
    }
    export function update(n: NamedTupleMember, d: Token<SyntaxKind.Dot3Token> | undefined, i: Identifier, q: Token<SyntaxKind.QuestionToken> | undefined, t: TypeNode) {
      return n.dot3Token !== d || n.name !== i || n.questionToken !== q || n.type !== t ? updateNode(create(d, i, q, t), n) : n;
    }
  }

  export interface ImportTypeNode extends NodeWithTypeArguments {
    kind: SyntaxKind.ImportType;
    isTypeOf?: boolean;
    argument: TypeNode;
    qualifier?: EntityName;
  }
  export namespace ImportTypeNode {
    export function create(a: TypeNode, q?: EntityName, ts?: readonly TypeNode[], tof?: boolean) {
      const n = Node.createSynthesized(SyntaxKind.ImportType) as ImportTypeNode;
      n.argument = a;
      n.qualifier = q;
      n.typeArguments = parenthesizeTypeParameters(ts);
      n.isTypeOf = tof;
      return n;
    }
    export function update(n: ImportTypeNode, a: TypeNode, q?: EntityName, ts?: readonly TypeNode[], tof?: boolean) {
      return n.argument !== a || n.qualifier !== q || n.typeArguments !== ts || n.isTypeOf !== tof ? updateNode(create(a, q, ts, tof), n) : n;
    }
    export function kind(n: Node): n is ImportTypeNode {
      return n.kind === SyntaxKind.ImportType;
    }
  }

  export interface ObjectBindingPattern extends Node {
    kind: SyntaxKind.ObjectBindingPattern;
    parent: VariableDeclaration | ParameterDeclaration | BindingElement;
    elements: NodeArray<BindingElement>;
  }
  export namespace ObjectBindingPattern {
    export function create(es: readonly BindingElement[]) {
      const n = Node.createSynthesized(SyntaxKind.ObjectBindingPattern) as ObjectBindingPattern;
      n.elements = createNodeArray(es);
      return n;
    }
    export function update(n: ObjectBindingPattern, es: readonly BindingElement[]) {
      return n.elements !== es ? updateNode(create(es), n) : n;
    }
    export function kind(n: Node): n is ObjectBindingPattern {
      return n.kind === SyntaxKind.ObjectBindingPattern;
    }
  }

  export interface ArrayBindingPattern extends Node {
    kind: SyntaxKind.ArrayBindingPattern;
    parent: VariableDeclaration | ParameterDeclaration | BindingElement;
    elements: NodeArray<ArrayBindingElement>;
  }
  export namespace ArrayBindingPattern {
    export function create(es: readonly ArrayBindingElement[]) {
      const n = Node.createSynthesized(SyntaxKind.ArrayBindingPattern) as ArrayBindingPattern;
      n.elements = createNodeArray(es);
      return n;
    }
    export function update(n: ArrayBindingPattern, es: readonly ArrayBindingElement[]) {
      return n.elements !== es ? updateNode(create(es), n) : n;
    }
    export function kind(n: Node): n is ArrayBindingPattern {
      return n.kind === SyntaxKind.ArrayBindingPattern;
    }
  }

  export interface BindingElement extends NamedDeclaration {
    kind: SyntaxKind.BindingElement;
    parent: BindingPattern;
    propertyName?: PropertyName;
    dot3Token?: Dot3Token;
    name: BindingName;
    initializer?: Expression;
  }
  export namespace BindingElement {
    export function create(d: Dot3Token | undefined, p: string | PropertyName | undefined, b: string | BindingName, i?: Expression) {
      const n = Node.createSynthesized(SyntaxKind.BindingElement) as BindingElement;
      n.dot3Token = d;
      n.propertyName = asName(p);
      n.name = asName(b);
      n.initializer = i;
      return n;
    }
    export function update(n: BindingElement, d: Dot3Token | undefined, p: PropertyName | undefined, b: BindingName, i?: Expression) {
      return n.propertyName !== p || n.dot3Token !== d || n.name !== b || n.initializer !== i ? updateNode(create(d, p, b, i), n) : n;
    }
    export function kind(n: Node): n is BindingElement {
      return n.kind === SyntaxKind.BindingElement;
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
