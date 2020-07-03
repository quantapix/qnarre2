namespace core {
  export function transformES2016(context: TransformationContext) {
    const { hoistVariableDeclaration } = context;

    return chainBundle(transformSourceFile);

    function transformSourceFile(node: SourceFile) {
      if (node.isDeclarationFile) {
        return node;
      }

      return visitEachChild(node, visitor, context);
    }

    function visitor(node: Node): VisitResult<Node> {
      if ((node.transformFlags & TransformFlags.ContainsES2016) === 0) {
        return node;
      }
      switch (node.kind) {
        case Syntax.BinaryExpression:
          return visitBinaryExpression(<BinaryExpression>node);
        default:
          return visitEachChild(node, visitor, context);
      }
    }

    function visitBinaryExpression(node: BinaryExpression): Expression {
      switch (node.operatorToken.kind) {
        case Syntax.Asterisk2EqualsToken:
          return visitExponentiationAssignmentExpression(node);
        case Syntax.Asterisk2Token:
          return visitExponentiationExpression(node);
        default:
          return visitEachChild(node, visitor, context);
      }
    }

    function visitExponentiationAssignmentExpression(node: BinaryExpression) {
      let target: Expression;
      let value: Expression;
      const left = visitNode(node.left, visitor, isExpression);
      const right = visitNode(node.right, visitor, isExpression);
      if (Node.is.kind(ElementAccessExpression, left)) {
        // Transforms `a[x] **= b` into `(_a = a)[_x = x] = Math.pow(_a[_x], b)`
        const expressionTemp = createTempVariable(hoistVariableDeclaration);
        const argumentExpressionTemp = createTempVariable(hoistVariableDeclaration);
        target = setRange(
          new qs.ElementAccessExpression(
            setRange(createAssignment(expressionTemp, left.expression), left.expression),
            setRange(createAssignment(argumentExpressionTemp, left.argumentExpression), left.argumentExpression)
          ),
          left
        );
        value = setRange(new qs.ElementAccessExpression(expressionTemp, argumentExpressionTemp), left);
      } else if (Node.is.kind(PropertyAccessExpression, left)) {
        // Transforms `a.x **= b` into `(_a = a).x = Math.pow(_a.x, b)`
        const expressionTemp = createTempVariable(hoistVariableDeclaration);
        target = setRange(createPropertyAccess(setRange(createAssignment(expressionTemp, left.expression), left.expression), left.name), left);
        value = setRange(createPropertyAccess(expressionTemp, left.name), left);
      } else {
        // Transforms `a **= b` into `a = Math.pow(a, b)`
        target = left;
        value = left;
      }
      return setRange(createAssignment(target, createMathPow(value, right, /*location*/ node)), node);
    }

    function visitExponentiationExpression(node: BinaryExpression) {
      // Transforms `a ** b` into `Math.pow(a, b)`
      const left = visitNode(node.left, visitor, isExpression);
      const right = visitNode(node.right, visitor, isExpression);
      return createMathPow(left, right, /*location*/ node);
    }
  }
}
