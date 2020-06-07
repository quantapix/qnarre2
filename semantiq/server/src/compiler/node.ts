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
        (e.kind === SyntaxKind.PrefixUnaryExpression &&
          (e as PrefixUnaryExpression).operator === SyntaxKind.MinusToken &&
          (e as PrefixUnaryExpression).operand.kind === SyntaxKind.BigIntLiteral)
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
    export function orNumericLiteralLike(node: Node): node is StringLiteralLike | NumericLiteral {
      return like(node) || NumericLiteral.kind(node);
    }
    export function orJsxExpressionKind(n: Node): n is StringLiteral | JsxExpression {
      const k = n.kind;
      return k === SyntaxKind.StringLiteral || k === SyntaxKind.JsxExpression;
    }
    export function orNumberLiteralExpression(e: Expression) {
      return (
        orNumericLiteralLike(e) ||
        (e.kind === SyntaxKind.PrefixUnaryExpression &&
          (e as PrefixUnaryExpression).operator === SyntaxKind.MinusToken &&
          (e as PrefixUnaryExpression).operand.kind === SyntaxKind.NumericLiteral)
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
}
