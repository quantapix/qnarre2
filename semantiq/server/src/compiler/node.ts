namespace qnr {
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
    export function createProperty(
      ds: readonly Decorator[] | undefined,
      ms: readonly Modifier[] | undefined,
      p: string | PropertyName,
      q?: QuestionToken | ExclamationToken,
      t?: TypeNode,
      i?: Expression
    ) {
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
    export function updateProperty(
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
        ? updateNode(createProperty(ds, ms, p, q, t, i), n)
        : n;
    }
    export function isPropertyDeclaration(n: Node): n is PropertyDeclaration {
      return n.kind === SyntaxKind.PropertyDeclaration;
    }
  }

  export interface MethodSignature extends SignatureDeclarationBase, TypeElement {
    kind: SyntaxKind.MethodSignature;
    parent: ObjectTypeDeclaration;
    name: PropertyName;
  }
  export namespace MethodSignature {
    export function createSignature(
      ts: readonly TypeParameterDeclaration[] | undefined,
      ps: readonly ParameterDeclaration[],
      t: TypeNode | undefined,
      p: string | PropertyName,
      q?: QuestionToken
    ) {
      const n = SignatureDeclaration.create(SyntaxKind.MethodSignature, ts, ps, t) as MethodSignature;
      n.name = asName(p);
      n.questionToken = q;
      return n;
    }
    export function updateSignature(
      n: MethodSignature,
      ts: NodeArray<TypeParameterDeclaration> | undefined,
      ps: NodeArray<ParameterDeclaration>,
      t: TypeNode | undefined,
      p: PropertyName,
      q?: QuestionToken
    ) {
      return n.typeParameters !== ts || n.parameters !== ps || n.type !== t || n.name !== p || n.questionToken !== q ? updateNode(createSignature(ts, ps, t, p, q), n) : n;
    }
    export function isMethodSignature(n: Node): n is MethodSignature {
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

  function MethodDeclaration.createCall(object: Expression, methodName: string | Identifier, argumentsList: readonly Expression[]) {
    return createCall(createPropertyAccess(object, asName(methodName)), /*typeArguments*/ undefined, argumentsList);
  }

  function createGlobalMethodCall(globalObjectName: string, methodName: string, argumentsList: readonly Expression[]) {
    return MethodDeclaration.createCall(createIdentifier(globalObjectName), methodName, argumentsList);
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
