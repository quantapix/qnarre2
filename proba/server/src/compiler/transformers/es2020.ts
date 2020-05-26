export function transformES2020(context: TransformationContext) {
  const { hoistVariableDeclaration } = context;

  return chainBundle(transformSourceFile);

  function transformSourceFile(node: SourceFile) {
    if (node.isDeclarationFile) {
      return node;
    }

    return visitEachChild(node, visitor, context);
  }

  function visitor(node: qt.Node): VisitResult<Node> {
    if ((node.transformFlags & TransformFlags.ContainsES2020) === 0) {
      return node;
    }
    switch (node.kind) {
      case qt.SyntaxKind.PropertyAccessExpression:
      case qt.SyntaxKind.ElementAccessExpression:
      case qt.SyntaxKind.CallExpression:
        if (node.flags & NodeFlags.OptionalChain) {
          const updated = visitOptionalExpression(node, /*captureThisArg*/ false, /*isDelete*/ false);
          Debug.assertNotNode(updated, isSyntheticReference);
          return updated;
        }
        return visitEachChild(node, visitor, context);
      case qt.SyntaxKind.BinaryExpression:
        if (node.operatorToken.kind === qt.SyntaxKind.QuestionQuestionToken) {
          return transformNullishCoalescingExpression(node);
        }
        return visitEachChild(node, visitor, context);
      case qt.SyntaxKind.DeleteExpression:
        return visitDeleteExpression(node);
      default:
        return visitEachChild(node, visitor, context);
    }
  }

  function flattenChain(chain: qt.OptionalChain) {
    Debug.assertNotNode(chain, isNonNullChain);
    const links: qt.OptionalChain[] = [chain];
    while (!chain.questionDotToken && !isTaggedTemplateExpression(chain)) {
      chain = cast(skipPartiallyEmittedExpressions(chain.expression), isOptionalChain);
      Debug.assertNotNode(chain, isNonNullChain);
      links.unshift(chain);
    }
    return { expression: chain.expression, chain: links };
  }

  function visitNonOptionalParenthesizedExpression(node: ParenthesizedExpression, captureThisArg: boolean, isDelete: boolean): qt.Expression {
    const expression = visitNonOptionalExpression(node.expression, captureThisArg, isDelete);
    if (isSyntheticReference(expression)) {
      // `(a.b)` -> { expression `((_a = a).b)`, thisArg: `_a` }
      // `(a[b])` -> { expression `((_a = a)[b])`, thisArg: `_a` }
      return createSyntheticReferenceExpression(updateParen(node, expression.expression), expression.thisArg);
    }
    return updateParen(node, expression);
  }

  function visitNonOptionalPropertyOrElementAccessExpression(node: AccessExpression, captureThisArg: boolean, isDelete: boolean): qt.Expression {
    if (isOptionalChain(node)) {
      // If `node` is an optional chain, then it is the outermost chain of an optional expression.
      return visitOptionalExpression(node, captureThisArg, isDelete);
    }

    let expression: qt.Expression = visitNode(node.expression, visitor, isExpression);
    Debug.assertNotNode(expression, isSyntheticReference);

    let thisArg: qt.Expression | undefined;
    if (captureThisArg) {
      if (shouldCaptureInTempVariable(expression)) {
        thisArg = createTempVariable(hoistVariableDeclaration);
        expression = createAssignment(thisArg, expression);
        // if (inParameterInitializer) tempVariableInParameter = true;
      } else {
        thisArg = expression;
      }
    }

    expression = node.kind === qt.SyntaxKind.PropertyAccessExpression ? updatePropertyAccess(node, expression, visitNode(node.name, visitor, isIdentifier)) : updateElementAccess(node, expression, visitNode(node.argumentExpression, visitor, isExpression));
    return thisArg ? createSyntheticReferenceExpression(expression, thisArg) : expression;
  }

  function visitNonOptionalCallExpression(node: CallExpression, captureThisArg: boolean): qt.Expression {
    if (isOptionalChain(node)) {
      // If `node` is an optional chain, then it is the outermost chain of an optional expression.
      return visitOptionalExpression(node, captureThisArg, /*isDelete*/ false);
    }
    return visitEachChild(node, visitor, context);
  }

  function visitNonOptionalExpression(node: qt.Expression, captureThisArg: boolean, isDelete: boolean): qt.Expression {
    switch (node.kind) {
      case qt.SyntaxKind.ParenthesizedExpression:
        return visitNonOptionalParenthesizedExpression(node, captureThisArg, isDelete);
      case qt.SyntaxKind.PropertyAccessExpression:
      case qt.SyntaxKind.ElementAccessExpression:
        return visitNonOptionalPropertyOrElementAccessExpression(node, captureThisArg, isDelete);
      case qt.SyntaxKind.CallExpression:
        return visitNonOptionalCallExpression(node, captureThisArg);
      default:
        return visitNode(node, visitor, isExpression);
    }
  }

  function visitOptionalExpression(node: qt.OptionalChain, captureThisArg: boolean, isDelete: boolean): qt.Expression {
    const { expression, chain } = flattenChain(node);
    const left = visitNonOptionalExpression(expression, isCallChain(chain[0]), /*isDelete*/ false);
    const leftThisArg = isSyntheticReference(left) ? left.thisArg : undefined;
    let leftExpression = isSyntheticReference(left) ? left.expression : left;
    let capturedLeft: qt.Expression = leftExpression;
    if (shouldCaptureInTempVariable(leftExpression)) {
      capturedLeft = createTempVariable(hoistVariableDeclaration);
      leftExpression = createAssignment(capturedLeft, leftExpression);
      // if (inParameterInitializer) tempVariableInParameter = true;
    }
    let rightExpression = capturedLeft;
    let thisArg: qt.Expression | undefined;
    for (let i = 0; i < chain.length; i++) {
      const segment = chain[i];
      switch (segment.kind) {
        case qt.SyntaxKind.PropertyAccessExpression:
        case qt.SyntaxKind.ElementAccessExpression:
          if (i === chain.length - 1 && captureThisArg) {
            if (shouldCaptureInTempVariable(rightExpression)) {
              thisArg = createTempVariable(hoistVariableDeclaration);
              rightExpression = createAssignment(thisArg, rightExpression);
              // if (inParameterInitializer) tempVariableInParameter = true;
            } else {
              thisArg = rightExpression;
            }
          }
          rightExpression = segment.kind === qt.SyntaxKind.PropertyAccessExpression ? createPropertyAccess(rightExpression, visitNode(segment.name, visitor, isIdentifier)) : createElementAccess(rightExpression, visitNode(segment.argumentExpression, visitor, isExpression));
          break;
        case qt.SyntaxKind.CallExpression:
          if (i === 0 && leftThisArg) {
            rightExpression = createFunctionCall(rightExpression, leftThisArg.kind === qt.SyntaxKind.SuperKeyword ? createThis() : leftThisArg, visitNodes(segment.arguments, visitor, isExpression));
          } else {
            rightExpression = createCall(rightExpression, /*typeArguments*/ undefined, visitNodes(segment.arguments, visitor, isExpression));
          }
          break;
      }
      setOriginalNode(rightExpression, segment);
    }

    const target = isDelete ? createConditional(createNotNullCondition(leftExpression, capturedLeft, /*invert*/ true), createTrue(), createDelete(rightExpression)) : createConditional(createNotNullCondition(leftExpression, capturedLeft, /*invert*/ true), createVoidZero(), rightExpression);
    return thisArg ? createSyntheticReferenceExpression(target, thisArg) : target;
  }

  function createNotNullCondition(left: qt.Expression, right: qt.Expression, invert?: boolean) {
    return createBinary(createBinary(left, createToken(invert ? qt.SyntaxKind.EqualsEqualsEqualsToken : qt.SyntaxKind.ExclamationEqualsEqualsToken), createNull()), createToken(invert ? qt.SyntaxKind.BarBarToken : qt.SyntaxKind.AmpersandAmpersandToken), createBinary(right, createToken(invert ? qt.SyntaxKind.EqualsEqualsEqualsToken : qt.SyntaxKind.ExclamationEqualsEqualsToken), createVoidZero()));
  }

  function transformNullishCoalescingExpression(node: qt.BinaryExpression) {
    let left = visitNode(node.left, visitor, isExpression);
    let right = left;
    if (shouldCaptureInTempVariable(left)) {
      right = createTempVariable(hoistVariableDeclaration);
      left = createAssignment(right, left);
      // if (inParameterInitializer) tempVariableInParameter = true;
    }
    return createConditional(createNotNullCondition(left, right), right, visitNode(node.right, visitor, isExpression));
  }

  function shouldCaptureInTempVariable(expression: qt.Expression): boolean {
    // don't capture identifiers and `this` in a temporary variable
    // `super` cannot be captured as it's no real variable
    return !isIdentifier(expression) && expression.kind !== qt.SyntaxKind.ThisKeyword && expression.kind !== qt.SyntaxKind.SuperKeyword;
  }

  function visitDeleteExpression(node: DeleteExpression) {
    return isOptionalChain(skipParentheses(node.expression)) ? setOriginalNode(visitNonOptionalExpression(node.expression, /*captureThisArg*/ false, /*isDelete*/ true), node) : updateDelete(node, visitNode(node.expression, visitor, isExpression));
  }
}