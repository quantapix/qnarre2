namespace qnr {
  function createSynthesizedNode(k: SyntaxKind): Node {
    const n = createNode(k, -1, -1);
    n.flags |= NodeFlags.Synthesized;
    return n;
  }

  export interface NumericLiteral extends LiteralExpression, Declaration {
    kind: SyntaxKind.NumericLiteral;
    numericLiteralFlags: TokenFlags;
  }
  export namespace NumericLiteral {
    export function create(t: string, fs: TokenFlags = TokenFlags.None) {
      const n = createSynthesizedNode(SyntaxKind.NumericLiteral) as NumericLiteral;
      n.text = t;
      n.numericLiteralFlags = fs;
      return n;
    }
    export function kind(n: Node): n is NumericLiteral {
      return n.kind === SyntaxKind.NumericLiteral;
    }
  }

  export interface BigIntLiteral extends LiteralExpression {
    kind: SyntaxKind.BigIntLiteral;
  }
  export namespace BigIntLiteral {
    export function create(t: string) {
      const n = createSynthesizedNode(SyntaxKind.BigIntLiteral) as BigIntLiteral;
      n.text = t;
      return n;
    }
    export function kind(n: Node): n is BigIntLiteral {
      return n.kind === SyntaxKind.BigIntLiteral;
    }
  }

  export namespace StringLiteral {
    export function create(t: string) {
      const n = createSynthesizedNode(SyntaxKind.StringLiteral) as StringLiteral;
      n.text = t;
      return n;
    }
    export function kind(n: Node): n is StringLiteral {
      return n.kind === SyntaxKind.StringLiteral;
    }
  }

  export interface JsxText extends LiteralLikeNode {
    kind: SyntaxKind.JsxText;
    containsOnlyTriviaWhiteSpaces: boolean;
    parent: JsxElement;
  }

  export interface RegularExpressionLiteral extends LiteralExpression {
    kind: SyntaxKind.RegularExpressionLiteral;
  }
  export namespace RegularExpressionLiteral {
    export function create(t: string) {
      const n = createSynthesizedNode(SyntaxKind.RegularExpressionLiteral) as RegularExpressionLiteral;
      n.text = t;
      return n;
    }
    export function kind(n: Node): n is RegularExpressionLiteral {
      return n.kind === SyntaxKind.RegularExpressionLiteral;
    }
  }
}
