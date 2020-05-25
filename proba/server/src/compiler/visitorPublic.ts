const isTypeNodeOrTypeParameterDeclaration = or(isTypeNode, isTypeParameterDeclaration);

/**
 * Visits a Node using the supplied visitor, possibly returning a new Node in its place.
 *
 * @param node The Node to visit.
 * @param visitor The callback used to visit the Node.
 * @param test A callback to execute to verify the Node is valid.
 * @param lift An optional callback to execute to lift a NodeArray into a valid Node.
 */
export function visitNode<T extends Node>(node: T | undefined, visitor: Visitor | undefined, test?: (node: qt.Node) => boolean, lift?: (node: qt.NodeArray<Node>) => T): T;

/**
 * Visits a Node using the supplied visitor, possibly returning a new Node in its place.
 *
 * @param node The Node to visit.
 * @param visitor The callback used to visit the Node.
 * @param test A callback to execute to verify the Node is valid.
 * @param lift An optional callback to execute to lift a NodeArray into a valid Node.
 */
export function visitNode<T extends Node>(node: T | undefined, visitor: Visitor | undefined, test?: (node: qt.Node) => boolean, lift?: (node: qt.NodeArray<Node>) => T): T | undefined;

export function visitNode<T extends Node>(node: T | undefined, visitor: Visitor | undefined, test?: (node: qt.Node) => boolean, lift?: (node: qt.NodeArray<Node>) => T): T | undefined {
  if (node === undefined || visitor === undefined) {
    return node;
  }

  aggregateTransformFlags(node);
  const visited = visitor(node);
  if (visited === node) {
    return node;
  }

  let visitedNode: Node | undefined;
  if (visited === undefined) {
    return undefined;
  } else if (isArray(visited)) {
    visitedNode = (lift || extractSingleNode)(visited);
  } else {
    visitedNode = visited;
  }

  Debug.assertNode(visitedNode, test);
  aggregateTransformFlags(visitedNode!);
  return <T>visitedNode;
}

/**
 * Visits a NodeArray using the supplied visitor, possibly returning a new NodeArray in its place.
 *
 * @param nodes The NodeArray to visit.
 * @param visitor The callback used to visit a Node.
 * @param test A node test to execute for each node.
 * @param start An optional value indicating the starting offset at which to start visiting.
 * @param count An optional value indicating the maximum number of nodes to visit.
 */
export function visitNodes<T extends Node>(nodes: NodeArray<T> | undefined, visitor: Visitor, test?: (node: qt.Node) => boolean, start?: number, count?: number): NodeArray<T>;

/**
 * Visits a NodeArray using the supplied visitor, possibly returning a new NodeArray in its place.
 *
 * @param nodes The NodeArray to visit.
 * @param visitor The callback used to visit a Node.
 * @param test A node test to execute for each node.
 * @param start An optional value indicating the starting offset at which to start visiting.
 * @param count An optional value indicating the maximum number of nodes to visit.
 */
export function visitNodes<T extends Node>(nodes: NodeArray<T> | undefined, visitor: Visitor, test?: (node: qt.Node) => boolean, start?: number, count?: number): NodeArray<T> | undefined;

/**
 * Visits a NodeArray using the supplied visitor, possibly returning a new NodeArray in its place.
 *
 * @param nodes The NodeArray to visit.
 * @param visitor The callback used to visit a Node.
 * @param test A node test to execute for each node.
 * @param start An optional value indicating the starting offset at which to start visiting.
 * @param count An optional value indicating the maximum number of nodes to visit.
 */
export function visitNodes<T extends Node>(nodes: NodeArray<T> | undefined, visitor: Visitor, test?: (node: qt.Node) => boolean, start?: number, count?: number): NodeArray<T> | undefined {
  if (nodes === undefined || visitor === undefined) {
    return nodes;
  }

  let updated: MutableNodeArray<T> | undefined;

  // Ensure start and count have valid values
  const length = nodes.length;
  if (start === undefined || start < 0) {
    start = 0;
  }

  if (count === undefined || count > length - start) {
    count = length - start;
  }

  if (start > 0 || count < length) {
    // If we are not visiting all of the original nodes, we must always create a new array.
    // Since this is a fragment of a node array, we do not copy over the previous location
    // and will only copy over `hasTrailingComma` if we are including the last element.
    updated = createNodeArray<T>([], /*hasTrailingComma*/ nodes.hasTrailingComma && start + count === length);
  }

  // Visit each original node.
  for (let i = 0; i < count; i++) {
    const node: T = nodes[i + start];
    aggregateTransformFlags(node);
    const visited = node !== undefined ? visitor(node) : undefined;
    if (updated !== undefined || visited === undefined || visited !== node) {
      if (updated === undefined) {
        // Ensure we have a copy of `nodes`, up to the current index.
        updated = createNodeArray(nodes.slice(0, i), nodes.hasTrailingComma);
        setTextRange(updated, nodes);
      }
      if (visited) {
        if (isArray(visited)) {
          for (const visitedNode of visited) {
            Debug.assertNode(visitedNode, test);
            aggregateTransformFlags(visitedNode);
            updated.push(<T>visitedNode);
          }
        } else {
          Debug.assertNode(visited, test);
          aggregateTransformFlags(visited);
          updated.push(<T>visited);
        }
      }
    }
  }

  return updated || nodes;
}

/**
 * Starts a new lexical environment and visits a statement list, ending the lexical environment
 * and merging hoisted declarations upon completion.
 */
export function visitLexicalEnvironment(statements: NodeArray<Statement>, visitor: Visitor, context: TransformationContext, start?: number, ensureUseStrict?: boolean) {
  context.startLexicalEnvironment();
  statements = visitNodes(statements, visitor, isStatement, start);
  if (ensureUseStrict) statements = ts.ensureUseStrict(statements); // eslint-disable-line @typescript-eslint/no-unnecessary-qualifier
  return mergeLexicalEnvironment(statements, context.endLexicalEnvironment());
}

/**
 * Starts a new lexical environment and visits a parameter list, suspending the lexical
 * environment upon completion.
 */
export function visitParameterList(nodes: NodeArray<qt.ParameterDeclaration>, visitor: Visitor, context: TransformationContext, nodesVisitor?: <T extends Node>(nodes: NodeArray<T>, visitor: Visitor, test?: (node: qt.Node) => boolean, start?: number, count?: number) => NodeArray<T>): NodeArray<qt.ParameterDeclaration>;
export function visitParameterList(nodes: NodeArray<qt.ParameterDeclaration> | undefined, visitor: Visitor, context: TransformationContext, nodesVisitor?: <T extends Node>(nodes: NodeArray<T> | undefined, visitor: Visitor, test?: (node: qt.Node) => boolean, start?: number, count?: number) => NodeArray<T> | undefined): NodeArray<qt.ParameterDeclaration> | undefined;
export function visitParameterList(nodes: NodeArray<qt.ParameterDeclaration> | undefined, visitor: Visitor, context: TransformationContext, nodesVisitor = visitNodes) {
  let updated: NodeArray<qt.ParameterDeclaration> | undefined;
  context.startLexicalEnvironment();
  if (nodes) {
    context.setLexicalEnvironmentFlags(LexicalEnvironmentFlags.InParameters, true);
    updated = nodesVisitor(nodes, visitor, isParameterDeclaration);

    // As of ES2015, any runtime execution of that occurs in for a parameter (such as evaluating an
    // initializer or a binding pattern), occurs in its own lexical scope. As a result, any expression
    // that we might transform that introduces a temporary variable would fail as the temporary variable
    // exists in a different lexical scope. To address this, we move any binding patterns and initializers
    // in a parameter list to the body if we detect a variable being hoisted while visiting a parameter list
    // when the emit target is greater than ES2015.
    if (context.getLexicalEnvironmentFlags() & LexicalEnvironmentFlags.VariablesHoistedInParameters && getEmitScriptTarget(context.getCompilerOptions()) >= ScriptTarget.ES2015) {
      updated = addDefaultValueAssignmentsIfNeeded(updated, context);
    }
    context.setLexicalEnvironmentFlags(LexicalEnvironmentFlags.InParameters, false);
  }
  context.suspendLexicalEnvironment();
  return updated;
}

function addDefaultValueAssignmentsIfNeeded(parameters: NodeArray<qt.ParameterDeclaration>, context: TransformationContext) {
  let result: ParameterDeclaration[] | undefined;
  for (let i = 0; i < parameters.length; i++) {
    const parameter = parameters[i];
    const updated = addDefaultValueAssignmentIfNeeded(parameter, context);
    if (result || updated !== parameter) {
      if (!result) result = parameters.slice(0, i);
      result[i] = updated;
    }
  }
  if (result) {
    return setTextRange(createNodeArray(result, parameters.hasTrailingComma), parameters);
  }
  return parameters;
}

function addDefaultValueAssignmentIfNeeded(parameter: ParameterDeclaration, context: TransformationContext) {
  // A rest parameter cannot have a binding pattern or an initializer,
  // so let's just ignore it.
  return parameter.dotDotDotToken ? parameter : isBindingPattern(parameter.name) ? addDefaultValueAssignmentForBindingPattern(parameter, context) : parameter.initializer ? addDefaultValueAssignmentForInitializer(parameter, parameter.name, parameter.initializer, context) : parameter;
}

function addDefaultValueAssignmentForBindingPattern(parameter: ParameterDeclaration, context: TransformationContext) {
  context.addInitializationStatement(createVariableStatement(/*modifiers*/ undefined, createVariableDeclarationList([createVariableDeclaration(parameter.name, parameter.type, parameter.initializer ? createConditional(createStrictEquality(getGeneratedNameForNode(parameter), createVoidZero()), parameter.initializer, getGeneratedNameForNode(parameter)) : getGeneratedNameForNode(parameter))])));
  return updateParameter(parameter, parameter.decorators, parameter.modifiers, parameter.dotDotDotToken, getGeneratedNameForNode(parameter), parameter.questionToken, parameter.type, /*initializer*/ undefined);
}

function addDefaultValueAssignmentForInitializer(parameter: ParameterDeclaration, name: Identifier, initializer: Expression, context: TransformationContext) {
  context.addInitializationStatement(
    createIf(createTypeCheck(getSynthesizedClone(name), 'undefined'), setEmitFlags(setTextRange(createBlock([createExpressionStatement(setEmitFlags(setTextRange(createAssignment(setEmitFlags(getMutableClone(name), EmitFlags.NoSourceMap), setEmitFlags(initializer, EmitFlags.NoSourceMap | getEmitFlags(initializer) | EmitFlags.NoComments)), parameter), EmitFlags.NoComments))]), parameter), EmitFlags.SingleLine | EmitFlags.NoTrailingSourceMap | EmitFlags.NoTokenSourceMaps | EmitFlags.NoComments))
  );
  return updateParameter(parameter, parameter.decorators, parameter.modifiers, parameter.dotDotDotToken, parameter.name, parameter.questionToken, parameter.type, /*initializer*/ undefined);
}

/**
 * Resumes a suspended lexical environment and visits a function body, ending the lexical
 * environment and merging hoisted declarations upon completion.
 */
export function visitFunctionBody(node: FunctionBody, visitor: Visitor, context: TransformationContext): FunctionBody;
/**
 * Resumes a suspended lexical environment and visits a function body, ending the lexical
 * environment and merging hoisted declarations upon completion.
 */
export function visitFunctionBody(node: FunctionBody | undefined, visitor: Visitor, context: TransformationContext): FunctionBody | undefined;
/**
 * Resumes a suspended lexical environment and visits a concise body, ending the lexical
 * environment and merging hoisted declarations upon completion.
 */
export function visitFunctionBody(node: ConciseBody, visitor: Visitor, context: TransformationContext): ConciseBody;
export function visitFunctionBody(node: ConciseBody | undefined, visitor: Visitor, context: TransformationContext): ConciseBody | undefined {
  context.resumeLexicalEnvironment();
  const updated = visitNode(node, visitor, isConciseBody);
  const declarations = context.endLexicalEnvironment();
  if (some(declarations)) {
    const block = convertToFunctionBody(updated);
    const statements = mergeLexicalEnvironment(block.statements, declarations);
    return updateBlock(block, statements);
  }
  return updated;
}

/**
 * Visits each child of a Node using the supplied visitor, possibly returning a new Node of the same kind in its place.
 *
 * @param node The Node whose children will be visited.
 * @param visitor The callback used to visit each child.
 * @param context A lexical environment context for the visitor.
 */
export function visitEachChild<T extends Node>(node: T, visitor: Visitor, context: TransformationContext): T;

/**
 * Visits each child of a Node using the supplied visitor, possibly returning a new Node of the same kind in its place.
 *
 * @param node The Node whose children will be visited.
 * @param visitor The callback used to visit each child.
 * @param context A lexical environment context for the visitor.
 */
export function visitEachChild<T extends Node>(node: T | undefined, visitor: Visitor, context: TransformationContext, nodesVisitor?: typeof visitNodes, tokenVisitor?: Visitor): T | undefined;

export function visitEachChild(node: qt.Node | undefined, visitor: Visitor, context: TransformationContext, nodesVisitor = visitNodes, tokenVisitor?: Visitor): Node | undefined {
  if (node === undefined) {
    return undefined;
  }

  const kind = node.kind;

  // No need to visit nodes with no children.
  if ((kind > qt.SyntaxKind.FirstToken && kind <= qt.SyntaxKind.LastToken) || kind === qt.SyntaxKind.ThisType) {
    return node;
  }

  switch (kind) {
    // Names

    case qt.SyntaxKind.Identifier:
      return updateIdentifier(<Identifier>node, nodesVisitor((<Identifier>node).typeArguments, visitor, isTypeNodeOrTypeParameterDeclaration));

    case qt.SyntaxKind.QualifiedName:
      return updateQualifiedName(<QualifiedName>node, visitNode((<QualifiedName>node).left, visitor, isEntityName), visitNode((<QualifiedName>node).right, visitor, isIdentifier));

    case qt.SyntaxKind.ComputedPropertyName:
      return updateComputedPropertyName(<ComputedPropertyName>node, visitNode((<ComputedPropertyName>node).expression, visitor, isExpression));

    // Signature elements
    case qt.SyntaxKind.TypeParameter:
      return updateTypeParameterDeclaration(<TypeParameterDeclaration>node, visitNode((<TypeParameterDeclaration>node).name, visitor, isIdentifier), visitNode((<TypeParameterDeclaration>node).constraint, visitor, isTypeNode), visitNode((<TypeParameterDeclaration>node).default, visitor, isTypeNode));

    case qt.SyntaxKind.Parameter:
      return updateParameter(
        <qt.ParameterDeclaration>node,
        nodesVisitor((<qt.ParameterDeclaration>node).decorators, visitor, isDecorator),
        nodesVisitor((<qt.ParameterDeclaration>node).modifiers, visitor, isModifier),
        visitNode((<qt.ParameterDeclaration>node).dotDotDotToken, tokenVisitor, isToken),
        visitNode((<qt.ParameterDeclaration>node).name, visitor, isBindingName),
        visitNode((<qt.ParameterDeclaration>node).questionToken, tokenVisitor, isToken),
        visitNode((<qt.ParameterDeclaration>node).type, visitor, isTypeNode),
        visitNode((<qt.ParameterDeclaration>node).initializer, visitor, isExpression)
      );

    case qt.SyntaxKind.Decorator:
      return updateDecorator(<qt.Decorator>node, visitNode((<qt.Decorator>node).expression, visitor, isExpression));

    // Type elements
    case qt.SyntaxKind.PropertySignature:
      return updatePropertySignature(<qt.PropertySignature>node, nodesVisitor((<qt.PropertySignature>node).modifiers, visitor, isToken), visitNode((<qt.PropertySignature>node).name, visitor, isPropertyName), visitNode((<qt.PropertySignature>node).questionToken, tokenVisitor, isToken), visitNode((<qt.PropertySignature>node).type, visitor, isTypeNode), visitNode((<qt.PropertySignature>node).initializer, visitor, isExpression));

    case qt.SyntaxKind.PropertyDeclaration:
      return updateProperty(
        <qt.PropertyDeclaration>node,
        nodesVisitor((<qt.PropertyDeclaration>node).decorators, visitor, isDecorator),
        nodesVisitor((<qt.PropertyDeclaration>node).modifiers, visitor, isModifier),
        visitNode((<qt.PropertyDeclaration>node).name, visitor, isPropertyName),
        // QuestionToken and ExclamationToken is uniqued in Property Declaration and the signature of 'updateProperty' is that too
        visitNode((<qt.PropertyDeclaration>node).questionToken || (<qt.PropertyDeclaration>node).exclamationToken, tokenVisitor, isToken),
        visitNode((<qt.PropertyDeclaration>node).type, visitor, isTypeNode),
        visitNode((<qt.PropertyDeclaration>node).initializer, visitor, isExpression)
      );

    case qt.SyntaxKind.MethodSignature:
      return updateMethodSignature(<MethodSignature>node, nodesVisitor((<MethodSignature>node).typeParameters, visitor, isTypeParameterDeclaration), nodesVisitor((<MethodSignature>node).parameters, visitor, isParameterDeclaration), visitNode((<MethodSignature>node).type, visitor, isTypeNode), visitNode((<MethodSignature>node).name, visitor, isPropertyName), visitNode((<MethodSignature>node).questionToken, tokenVisitor, isToken));

    case qt.SyntaxKind.MethodDeclaration:
      return updateMethod(
        <qt.MethodDeclaration>node,
        nodesVisitor((<qt.MethodDeclaration>node).decorators, visitor, isDecorator),
        nodesVisitor((<qt.MethodDeclaration>node).modifiers, visitor, isModifier),
        visitNode((<qt.MethodDeclaration>node).asteriskToken, tokenVisitor, isToken),
        visitNode((<qt.MethodDeclaration>node).name, visitor, isPropertyName),
        visitNode((<qt.MethodDeclaration>node).questionToken, tokenVisitor, isToken),
        nodesVisitor((<qt.MethodDeclaration>node).typeParameters, visitor, isTypeParameterDeclaration),
        visitParameterList((<qt.MethodDeclaration>node).parameters, visitor, context, nodesVisitor),
        visitNode((<qt.MethodDeclaration>node).type, visitor, isTypeNode),
        visitFunctionBody((<qt.MethodDeclaration>node).body!, visitor, context)
      );

    case qt.SyntaxKind.Constructor:
      return updateConstructor(<qt.ConstructorDeclaration>node, nodesVisitor((<qt.ConstructorDeclaration>node).decorators, visitor, isDecorator), nodesVisitor((<qt.ConstructorDeclaration>node).modifiers, visitor, isModifier), visitParameterList((<qt.ConstructorDeclaration>node).parameters, visitor, context, nodesVisitor), visitFunctionBody((<qt.ConstructorDeclaration>node).body!, visitor, context));

    case qt.SyntaxKind.GetAccessor:
      return updateGetAccessor(
        <qt.GetAccessorDeclaration>node,
        nodesVisitor((<qt.GetAccessorDeclaration>node).decorators, visitor, isDecorator),
        nodesVisitor((<qt.GetAccessorDeclaration>node).modifiers, visitor, isModifier),
        visitNode((<qt.GetAccessorDeclaration>node).name, visitor, isPropertyName),
        visitParameterList((<qt.GetAccessorDeclaration>node).parameters, visitor, context, nodesVisitor),
        visitNode((<qt.GetAccessorDeclaration>node).type, visitor, isTypeNode),
        visitFunctionBody((<qt.GetAccessorDeclaration>node).body!, visitor, context)
      );

    case qt.SyntaxKind.SetAccessor:
      return updateSetAccessor(<SetAccessorDeclaration>node, nodesVisitor((<SetAccessorDeclaration>node).decorators, visitor, isDecorator), nodesVisitor((<SetAccessorDeclaration>node).modifiers, visitor, isModifier), visitNode((<SetAccessorDeclaration>node).name, visitor, isPropertyName), visitParameterList((<SetAccessorDeclaration>node).parameters, visitor, context, nodesVisitor), visitFunctionBody((<SetAccessorDeclaration>node).body!, visitor, context));

    case qt.SyntaxKind.CallSignature:
      return updateCallSignature(<CallSignatureDeclaration>node, nodesVisitor((<CallSignatureDeclaration>node).typeParameters, visitor, isTypeParameterDeclaration), nodesVisitor((<CallSignatureDeclaration>node).parameters, visitor, isParameterDeclaration), visitNode((<CallSignatureDeclaration>node).type, visitor, isTypeNode));

    case qt.SyntaxKind.ConstructSignature:
      return updateConstructSignature(<ConstructSignatureDeclaration>node, nodesVisitor((<ConstructSignatureDeclaration>node).typeParameters, visitor, isTypeParameterDeclaration), nodesVisitor((<ConstructSignatureDeclaration>node).parameters, visitor, isParameterDeclaration), visitNode((<ConstructSignatureDeclaration>node).type, visitor, isTypeNode));

    case qt.SyntaxKind.IndexSignature:
      return updateIndexSignature(<IndexSignatureDeclaration>node, nodesVisitor((<IndexSignatureDeclaration>node).decorators, visitor, isDecorator), nodesVisitor((<IndexSignatureDeclaration>node).modifiers, visitor, isModifier), nodesVisitor((<IndexSignatureDeclaration>node).parameters, visitor, isParameterDeclaration), visitNode((<IndexSignatureDeclaration>node).type, visitor, isTypeNode));

    // Types
    case qt.SyntaxKind.TypePredicate:
      return updateTypePredicateNodeWithModifier(<TypePredicateNode>node, visitNode((<TypePredicateNode>node).assertsModifier, visitor), visitNode((<TypePredicateNode>node).parameterName, visitor), visitNode((<TypePredicateNode>node).type, visitor, isTypeNode));

    case qt.SyntaxKind.TypeReference:
      return updateTypeReferenceNode(<TypeReferenceNode>node, visitNode((<TypeReferenceNode>node).typeName, visitor, isEntityName), nodesVisitor((<TypeReferenceNode>node).typeArguments, visitor, isTypeNode));

    case qt.SyntaxKind.FunctionType:
      return updateFunctionTypeNode(<FunctionTypeNode>node, nodesVisitor((<FunctionTypeNode>node).typeParameters, visitor, isTypeParameterDeclaration), nodesVisitor((<FunctionTypeNode>node).parameters, visitor, isParameterDeclaration), visitNode((<FunctionTypeNode>node).type, visitor, isTypeNode));

    case qt.SyntaxKind.ConstructorType:
      return updateConstructorTypeNode(<ConstructorTypeNode>node, nodesVisitor((<ConstructorTypeNode>node).typeParameters, visitor, isTypeParameterDeclaration), nodesVisitor((<ConstructorTypeNode>node).parameters, visitor, isParameterDeclaration), visitNode((<ConstructorTypeNode>node).type, visitor, isTypeNode));

    case qt.SyntaxKind.TypeQuery:
      return updateTypeQueryNode(<TypeQueryNode>node, visitNode((<TypeQueryNode>node).exprName, visitor, isEntityName));

    case qt.SyntaxKind.TypeLiteral:
      return updateTypeLiteralNode(<TypeLiteralNode>node, nodesVisitor((<TypeLiteralNode>node).members, visitor, isTypeElement));

    case qt.SyntaxKind.ArrayType:
      return updateArrayTypeNode(<ArrayTypeNode>node, visitNode((<ArrayTypeNode>node).elementType, visitor, isTypeNode));

    case qt.SyntaxKind.TupleType:
      return updateTupleTypeNode(<TupleTypeNode>node, nodesVisitor((<TupleTypeNode>node).elements, visitor, isTypeNode));

    case qt.SyntaxKind.OptionalType:
      return updateOptionalTypeNode(<OptionalTypeNode>node, visitNode((<OptionalTypeNode>node).type, visitor, isTypeNode));

    case qt.SyntaxKind.RestType:
      return updateRestTypeNode(<RestTypeNode>node, visitNode((<RestTypeNode>node).type, visitor, isTypeNode));

    case qt.SyntaxKind.UnionType:
      return updateUnionTypeNode(<UnionTypeNode>node, nodesVisitor((<UnionTypeNode>node).types, visitor, isTypeNode));

    case qt.SyntaxKind.IntersectionType:
      return updateIntersectionTypeNode(<IntersectionTypeNode>node, nodesVisitor((<IntersectionTypeNode>node).types, visitor, isTypeNode));

    case qt.SyntaxKind.ConditionalType:
      return updateConditionalTypeNode(<ConditionalTypeNode>node, visitNode((<ConditionalTypeNode>node).checkType, visitor, isTypeNode), visitNode((<ConditionalTypeNode>node).extendsType, visitor, isTypeNode), visitNode((<ConditionalTypeNode>node).trueType, visitor, isTypeNode), visitNode((<ConditionalTypeNode>node).falseType, visitor, isTypeNode));

    case qt.SyntaxKind.InferType:
      return updateInferTypeNode(<InferTypeNode>node, visitNode((<InferTypeNode>node).typeParameter, visitor, isTypeParameterDeclaration));

    case qt.SyntaxKind.ImportType:
      return updateImportTypeNode(<ImportTypeNode>node, visitNode((<ImportTypeNode>node).argument, visitor, isTypeNode), visitNode((<ImportTypeNode>node).qualifier, visitor, isEntityName), visitNodes((<ImportTypeNode>node).typeArguments, visitor, isTypeNode), (<ImportTypeNode>node).isTypeOf);

    case qt.SyntaxKind.NamedTupleMember:
      return updateNamedTupleMember(<NamedTupleMember>node, visitNode((<NamedTupleMember>node).dotDotDotToken, visitor, isToken), visitNode((<NamedTupleMember>node).name, visitor, isIdentifier), visitNode((<NamedTupleMember>node).questionToken, visitor, isToken), visitNode((<NamedTupleMember>node).type, visitor, isTypeNode));

    case qt.SyntaxKind.ParenthesizedType:
      return updateParenthesizedType(<ParenthesizedTypeNode>node, visitNode((<ParenthesizedTypeNode>node).type, visitor, isTypeNode));

    case qt.SyntaxKind.TypeOperator:
      return updateTypeOperatorNode(<TypeOperatorNode>node, visitNode((<TypeOperatorNode>node).type, visitor, isTypeNode));

    case qt.SyntaxKind.IndexedAccessType:
      return updateIndexedAccessTypeNode(<IndexedAccessTypeNode>node, visitNode((<IndexedAccessTypeNode>node).objectType, visitor, isTypeNode), visitNode((<IndexedAccessTypeNode>node).indexType, visitor, isTypeNode));

    case qt.SyntaxKind.MappedType:
      return updateMappedTypeNode(<MappedTypeNode>node, visitNode((<MappedTypeNode>node).readonlyToken, tokenVisitor, isToken), visitNode((<MappedTypeNode>node).typeParameter, visitor, isTypeParameterDeclaration), visitNode((<MappedTypeNode>node).questionToken, tokenVisitor, isToken), visitNode((<MappedTypeNode>node).type, visitor, isTypeNode));

    case qt.SyntaxKind.LiteralType:
      return updateLiteralTypeNode(<LiteralTypeNode>node, visitNode((<LiteralTypeNode>node).literal, visitor, isExpression));

    // Binding patterns
    case qt.SyntaxKind.ObjectBindingPattern:
      return updateObjectBindingPattern(<ObjectBindingPattern>node, nodesVisitor((<ObjectBindingPattern>node).elements, visitor, isBindingElement));

    case qt.SyntaxKind.ArrayBindingPattern:
      return updateArrayBindingPattern(<ArrayBindingPattern>node, nodesVisitor((<ArrayBindingPattern>node).elements, visitor, isArrayBindingElement));

    case qt.SyntaxKind.BindingElement:
      return updateBindingElement(<BindingElement>node, visitNode((<BindingElement>node).dotDotDotToken, tokenVisitor, isToken), visitNode((<BindingElement>node).propertyName, visitor, isPropertyName), visitNode((<BindingElement>node).name, visitor, isBindingName), visitNode((<BindingElement>node).initializer, visitor, isExpression));

    // Expression
    case qt.SyntaxKind.ArrayLiteralExpression:
      return updateArrayLiteral(<ArrayLiteralExpression>node, nodesVisitor((<ArrayLiteralExpression>node).elements, visitor, isExpression));

    case qt.SyntaxKind.ObjectLiteralExpression:
      return updateObjectLiteral(<ObjectLiteralExpression>node, nodesVisitor((<ObjectLiteralExpression>node).properties, visitor, isObjectLiteralElementLike));

    case qt.SyntaxKind.PropertyAccessExpression:
      if (node.flags & NodeFlags.OptionalChain) {
        return updatePropertyAccessChain(<PropertyAccessChain>node, visitNode((<PropertyAccessChain>node).expression, visitor, isExpression), visitNode((<PropertyAccessChain>node).questionDotToken, tokenVisitor, isToken), visitNode((<PropertyAccessChain>node).name, visitor, isIdentifier));
      }
      return updatePropertyAccess(<PropertyAccessExpression>node, visitNode((<PropertyAccessExpression>node).expression, visitor, isExpression), visitNode((<PropertyAccessExpression>node).name, visitor, isIdentifierOrPrivateIdentifier));

    case qt.SyntaxKind.ElementAccessExpression:
      if (node.flags & NodeFlags.OptionalChain) {
        return updateElementAccessChain(<ElementAccessChain>node, visitNode((<ElementAccessChain>node).expression, visitor, isExpression), visitNode((<ElementAccessChain>node).questionDotToken, tokenVisitor, isToken), visitNode((<ElementAccessChain>node).argumentExpression, visitor, isExpression));
      }
      return updateElementAccess(<ElementAccessExpression>node, visitNode((<ElementAccessExpression>node).expression, visitor, isExpression), visitNode((<ElementAccessExpression>node).argumentExpression, visitor, isExpression));

    case qt.SyntaxKind.CallExpression:
      if (node.flags & NodeFlags.OptionalChain) {
        return updateCallChain(<CallChain>node, visitNode((<CallChain>node).expression, visitor, isExpression), visitNode((<CallChain>node).questionDotToken, tokenVisitor, isToken), nodesVisitor((<CallChain>node).typeArguments, visitor, isTypeNode), nodesVisitor((<CallChain>node).arguments, visitor, isExpression));
      }
      return updateCall(<CallExpression>node, visitNode((<CallExpression>node).expression, visitor, isExpression), nodesVisitor((<CallExpression>node).typeArguments, visitor, isTypeNode), nodesVisitor((<CallExpression>node).arguments, visitor, isExpression));

    case qt.SyntaxKind.NewExpression:
      return updateNew(<NewExpression>node, visitNode((<NewExpression>node).expression, visitor, isExpression), nodesVisitor((<NewExpression>node).typeArguments, visitor, isTypeNode), nodesVisitor((<NewExpression>node).arguments, visitor, isExpression));

    case qt.SyntaxKind.TaggedTemplateExpression:
      return updateTaggedTemplate(<TaggedTemplateExpression>node, visitNode((<TaggedTemplateExpression>node).tag, visitor, isExpression), visitNodes((<TaggedTemplateExpression>node).typeArguments, visitor, isExpression), visitNode((<TaggedTemplateExpression>node).template, visitor, isTemplateLiteral));

    case qt.SyntaxKind.TypeAssertionExpression:
      return updateTypeAssertion(<TypeAssertion>node, visitNode((<TypeAssertion>node).type, visitor, isTypeNode), visitNode((<TypeAssertion>node).expression, visitor, isExpression));

    case qt.SyntaxKind.ParenthesizedExpression:
      return updateParen(<ParenthesizedExpression>node, visitNode((<ParenthesizedExpression>node).expression, visitor, isExpression));

    case qt.SyntaxKind.FunctionExpression:
      return updateFunctionExpression(
        <qt.FunctionExpression>node,
        nodesVisitor((<qt.FunctionExpression>node).modifiers, visitor, isModifier),
        visitNode((<qt.FunctionExpression>node).asteriskToken, tokenVisitor, isToken),
        visitNode((<qt.FunctionExpression>node).name, visitor, isIdentifier),
        nodesVisitor((<qt.FunctionExpression>node).typeParameters, visitor, isTypeParameterDeclaration),
        visitParameterList((<qt.FunctionExpression>node).parameters, visitor, context, nodesVisitor),
        visitNode((<qt.FunctionExpression>node).type, visitor, isTypeNode),
        visitFunctionBody((<qt.FunctionExpression>node).body, visitor, context)
      );

    case qt.SyntaxKind.ArrowFunction:
      return updateArrowFunction(
        <ArrowFunction>node,
        nodesVisitor((<ArrowFunction>node).modifiers, visitor, isModifier),
        nodesVisitor((<ArrowFunction>node).typeParameters, visitor, isTypeParameterDeclaration),
        visitParameterList((<ArrowFunction>node).parameters, visitor, context, nodesVisitor),
        visitNode((<ArrowFunction>node).type, visitor, isTypeNode),
        visitNode((<ArrowFunction>node).equalsGreaterThanToken, tokenVisitor, isToken),
        visitFunctionBody((<ArrowFunction>node).body, visitor, context)
      );

    case qt.SyntaxKind.DeleteExpression:
      return updateDelete(<DeleteExpression>node, visitNode((<DeleteExpression>node).expression, visitor, isExpression));

    case qt.SyntaxKind.TypeOfExpression:
      return updateTypeOf(<TypeOfExpression>node, visitNode((<TypeOfExpression>node).expression, visitor, isExpression));

    case qt.SyntaxKind.VoidExpression:
      return updateVoid(<VoidExpression>node, visitNode((<VoidExpression>node).expression, visitor, isExpression));

    case qt.SyntaxKind.AwaitExpression:
      return updateAwait(<AwaitExpression>node, visitNode((<AwaitExpression>node).expression, visitor, isExpression));

    case qt.SyntaxKind.PrefixUnaryExpression:
      return updatePrefix(<PrefixUnaryExpression>node, visitNode((<PrefixUnaryExpression>node).operand, visitor, isExpression));

    case qt.SyntaxKind.PostfixUnaryExpression:
      return updatePostfix(<PostfixUnaryExpression>node, visitNode((<PostfixUnaryExpression>node).operand, visitor, isExpression));

    case qt.SyntaxKind.BinaryExpression:
      return updateBinary(<BinaryExpression>node, visitNode((<BinaryExpression>node).left, visitor, isExpression), visitNode((<BinaryExpression>node).right, visitor, isExpression), visitNode((<BinaryExpression>node).operatorToken, tokenVisitor, isToken));

    case qt.SyntaxKind.ConditionalExpression:
      return updateConditional(<ConditionalExpression>node, visitNode((<ConditionalExpression>node).condition, visitor, isExpression), visitNode((<ConditionalExpression>node).questionToken, tokenVisitor, isToken), visitNode((<ConditionalExpression>node).whenTrue, visitor, isExpression), visitNode((<ConditionalExpression>node).colonToken, tokenVisitor, isToken), visitNode((<ConditionalExpression>node).whenFalse, visitor, isExpression));

    case qt.SyntaxKind.TemplateExpression:
      return updateTemplateExpression(<TemplateExpression>node, visitNode((<TemplateExpression>node).head, visitor, isTemplateHead), nodesVisitor((<TemplateExpression>node).templateSpans, visitor, isTemplateSpan));

    case qt.SyntaxKind.YieldExpression:
      return updateYield(<YieldExpression>node, visitNode((<YieldExpression>node).asteriskToken, tokenVisitor, isToken), visitNode((<YieldExpression>node).expression, visitor, isExpression));

    case qt.SyntaxKind.SpreadElement:
      return updateSpread(<SpreadElement>node, visitNode((<SpreadElement>node).expression, visitor, isExpression));

    case qt.SyntaxKind.ClassExpression:
      return updateClassExpression(<ClassExpression>node, nodesVisitor((<ClassExpression>node).modifiers, visitor, isModifier), visitNode((<ClassExpression>node).name, visitor, isIdentifier), nodesVisitor((<ClassExpression>node).typeParameters, visitor, isTypeParameterDeclaration), nodesVisitor((<ClassExpression>node).heritageClauses, visitor, isHeritageClause), nodesVisitor((<ClassExpression>node).members, visitor, isClassElement));

    case qt.SyntaxKind.ExpressionWithTypeArguments:
      return updateExpressionWithTypeArguments(<ExpressionWithTypeArguments>node, nodesVisitor((<ExpressionWithTypeArguments>node).typeArguments, visitor, isTypeNode), visitNode((<ExpressionWithTypeArguments>node).expression, visitor, isExpression));

    case qt.SyntaxKind.AsExpression:
      return updateAsExpression(<AsExpression>node, visitNode((<AsExpression>node).expression, visitor, isExpression), visitNode((<AsExpression>node).type, visitor, isTypeNode));

    case qt.SyntaxKind.NonNullExpression:
      return updateNonNullExpression(<NonNullExpression>node, visitNode((<NonNullExpression>node).expression, visitor, isExpression));

    case qt.SyntaxKind.MetaProperty:
      return updateMetaProperty(<MetaProperty>node, visitNode((<MetaProperty>node).name, visitor, isIdentifier));

    // Misc
    case qt.SyntaxKind.TemplateSpan:
      return updateTemplateSpan(<TemplateSpan>node, visitNode((<TemplateSpan>node).expression, visitor, isExpression), visitNode((<TemplateSpan>node).literal, visitor, isTemplateMiddleOrTemplateTail));

    // Element
    case qt.SyntaxKind.Block:
      return updateBlock(<Block>node, nodesVisitor((<Block>node).statements, visitor, isStatement));

    case qt.SyntaxKind.VariableStatement:
      return updateVariableStatement(<VariableStatement>node, nodesVisitor((<VariableStatement>node).modifiers, visitor, isModifier), visitNode((<VariableStatement>node).declarationList, visitor, isVariableDeclarationList));

    case qt.SyntaxKind.ExpressionStatement:
      return updateExpressionStatement(<ExpressionStatement>node, visitNode((<ExpressionStatement>node).expression, visitor, isExpression));

    case qt.SyntaxKind.IfStatement:
      return updateIf(<IfStatement>node, visitNode((<IfStatement>node).expression, visitor, isExpression), visitNode((<IfStatement>node).thenStatement, visitor, isStatement, liftToBlock), visitNode((<IfStatement>node).elseStatement, visitor, isStatement, liftToBlock));

    case qt.SyntaxKind.DoStatement:
      return updateDo(<DoStatement>node, visitNode((<DoStatement>node).statement, visitor, isStatement, liftToBlock), visitNode((<DoStatement>node).expression, visitor, isExpression));

    case qt.SyntaxKind.WhileStatement:
      return updateWhile(<WhileStatement>node, visitNode((<WhileStatement>node).expression, visitor, isExpression), visitNode((<WhileStatement>node).statement, visitor, isStatement, liftToBlock));

    case qt.SyntaxKind.ForStatement:
      return updateFor(<ForStatement>node, visitNode((<ForStatement>node).initializer, visitor, isForInitializer), visitNode((<ForStatement>node).condition, visitor, isExpression), visitNode((<ForStatement>node).incrementor, visitor, isExpression), visitNode((<ForStatement>node).statement, visitor, isStatement, liftToBlock));

    case qt.SyntaxKind.ForInStatement:
      return updateForIn(<ForInStatement>node, visitNode((<ForInStatement>node).initializer, visitor, isForInitializer), visitNode((<ForInStatement>node).expression, visitor, isExpression), visitNode((<ForInStatement>node).statement, visitor, isStatement, liftToBlock));

    case qt.SyntaxKind.ForOfStatement:
      return updateForOf(<ForOfStatement>node, visitNode((<ForOfStatement>node).awaitModifier, tokenVisitor, isToken), visitNode((<ForOfStatement>node).initializer, visitor, isForInitializer), visitNode((<ForOfStatement>node).expression, visitor, isExpression), visitNode((<ForOfStatement>node).statement, visitor, isStatement, liftToBlock));

    case qt.SyntaxKind.ContinueStatement:
      return updateContinue(<ContinueStatement>node, visitNode((<ContinueStatement>node).label, visitor, isIdentifier));

    case qt.SyntaxKind.BreakStatement:
      return updateBreak(<BreakStatement>node, visitNode((<BreakStatement>node).label, visitor, isIdentifier));

    case qt.SyntaxKind.ReturnStatement:
      return updateReturn(<ReturnStatement>node, visitNode((<ReturnStatement>node).expression, visitor, isExpression));

    case qt.SyntaxKind.WithStatement:
      return updateWith(<WithStatement>node, visitNode((<WithStatement>node).expression, visitor, isExpression), visitNode((<WithStatement>node).statement, visitor, isStatement, liftToBlock));

    case qt.SyntaxKind.SwitchStatement:
      return updateSwitch(<SwitchStatement>node, visitNode((<SwitchStatement>node).expression, visitor, isExpression), visitNode((<SwitchStatement>node).caseBlock, visitor, isCaseBlock));

    case qt.SyntaxKind.LabeledStatement:
      return updateLabel(<LabeledStatement>node, visitNode((<LabeledStatement>node).label, visitor, isIdentifier), visitNode((<LabeledStatement>node).statement, visitor, isStatement, liftToBlock));

    case qt.SyntaxKind.ThrowStatement:
      return updateThrow(<ThrowStatement>node, visitNode((<ThrowStatement>node).expression, visitor, isExpression));

    case qt.SyntaxKind.TryStatement:
      return updateTry(<TryStatement>node, visitNode((<TryStatement>node).tryBlock, visitor, isBlock), visitNode((<TryStatement>node).catchClause, visitor, isCatchClause), visitNode((<TryStatement>node).finallyBlock, visitor, isBlock));

    case qt.SyntaxKind.VariableDeclaration:
      return updateTypeScriptVariableDeclaration(<VariableDeclaration>node, visitNode((<VariableDeclaration>node).name, visitor, isBindingName), visitNode((<VariableDeclaration>node).exclamationToken, tokenVisitor, isToken), visitNode((<VariableDeclaration>node).type, visitor, isTypeNode), visitNode((<VariableDeclaration>node).initializer, visitor, isExpression));

    case qt.SyntaxKind.VariableDeclarationList:
      return updateVariableDeclarationList(<VariableDeclarationList>node, nodesVisitor((<VariableDeclarationList>node).declarations, visitor, isVariableDeclaration));

    case qt.SyntaxKind.FunctionDeclaration:
      return updateFunctionDeclaration(
        <qt.FunctionDeclaration>node,
        nodesVisitor((<qt.FunctionDeclaration>node).decorators, visitor, isDecorator),
        nodesVisitor((<qt.FunctionDeclaration>node).modifiers, visitor, isModifier),
        visitNode((<qt.FunctionDeclaration>node).asteriskToken, tokenVisitor, isToken),
        visitNode((<qt.FunctionDeclaration>node).name, visitor, isIdentifier),
        nodesVisitor((<qt.FunctionDeclaration>node).typeParameters, visitor, isTypeParameterDeclaration),
        visitParameterList((<qt.FunctionDeclaration>node).parameters, visitor, context, nodesVisitor),
        visitNode((<qt.FunctionDeclaration>node).type, visitor, isTypeNode),
        visitFunctionBody((<qt.FunctionExpression>node).body, visitor, context)
      );

    case qt.SyntaxKind.ClassDeclaration:
      return updateClassDeclaration(
        <ClassDeclaration>node,
        nodesVisitor((<ClassDeclaration>node).decorators, visitor, isDecorator),
        nodesVisitor((<ClassDeclaration>node).modifiers, visitor, isModifier),
        visitNode((<ClassDeclaration>node).name, visitor, isIdentifier),
        nodesVisitor((<ClassDeclaration>node).typeParameters, visitor, isTypeParameterDeclaration),
        nodesVisitor((<ClassDeclaration>node).heritageClauses, visitor, isHeritageClause),
        nodesVisitor((<ClassDeclaration>node).members, visitor, isClassElement)
      );

    case qt.SyntaxKind.InterfaceDeclaration:
      return updateInterfaceDeclaration(
        <InterfaceDeclaration>node,
        nodesVisitor((<InterfaceDeclaration>node).decorators, visitor, isDecorator),
        nodesVisitor((<InterfaceDeclaration>node).modifiers, visitor, isModifier),
        visitNode((<InterfaceDeclaration>node).name, visitor, isIdentifier),
        nodesVisitor((<InterfaceDeclaration>node).typeParameters, visitor, isTypeParameterDeclaration),
        nodesVisitor((<InterfaceDeclaration>node).heritageClauses, visitor, isHeritageClause),
        nodesVisitor((<InterfaceDeclaration>node).members, visitor, isTypeElement)
      );

    case qt.SyntaxKind.TypeAliasDeclaration:
      return updateTypeAliasDeclaration(<TypeAliasDeclaration>node, nodesVisitor((<TypeAliasDeclaration>node).decorators, visitor, isDecorator), nodesVisitor((<TypeAliasDeclaration>node).modifiers, visitor, isModifier), visitNode((<TypeAliasDeclaration>node).name, visitor, isIdentifier), nodesVisitor((<TypeAliasDeclaration>node).typeParameters, visitor, isTypeParameterDeclaration), visitNode((<TypeAliasDeclaration>node).type, visitor, isTypeNode));

    case qt.SyntaxKind.EnumDeclaration:
      return updateEnumDeclaration(<EnumDeclaration>node, nodesVisitor((<EnumDeclaration>node).decorators, visitor, isDecorator), nodesVisitor((<EnumDeclaration>node).modifiers, visitor, isModifier), visitNode((<EnumDeclaration>node).name, visitor, isIdentifier), nodesVisitor((<EnumDeclaration>node).members, visitor, isEnumMember));

    case qt.SyntaxKind.ModuleDeclaration:
      return updateModuleDeclaration(<ModuleDeclaration>node, nodesVisitor((<ModuleDeclaration>node).decorators, visitor, isDecorator), nodesVisitor((<ModuleDeclaration>node).modifiers, visitor, isModifier), visitNode((<ModuleDeclaration>node).name, visitor, isIdentifier), visitNode((<ModuleDeclaration>node).body, visitor, isModuleBody));

    case qt.SyntaxKind.ModuleBlock:
      return updateModuleBlock(<ModuleBlock>node, nodesVisitor((<ModuleBlock>node).statements, visitor, isStatement));

    case qt.SyntaxKind.CaseBlock:
      return updateCaseBlock(<CaseBlock>node, nodesVisitor((<CaseBlock>node).clauses, visitor, isCaseOrDefaultClause));

    case qt.SyntaxKind.NamespaceExportDeclaration:
      return updateNamespaceExportDeclaration(<NamespaceExportDeclaration>node, visitNode((<NamespaceExportDeclaration>node).name, visitor, isIdentifier));

    case qt.SyntaxKind.ImportEqualsDeclaration:
      return updateImportEqualsDeclaration(<ImportEqualsDeclaration>node, nodesVisitor((<ImportEqualsDeclaration>node).decorators, visitor, isDecorator), nodesVisitor((<ImportEqualsDeclaration>node).modifiers, visitor, isModifier), visitNode((<ImportEqualsDeclaration>node).name, visitor, isIdentifier), visitNode((<ImportEqualsDeclaration>node).moduleReference, visitor, isModuleReference));

    case qt.SyntaxKind.ImportDeclaration:
      return updateImportDeclaration(<ImportDeclaration>node, nodesVisitor((<ImportDeclaration>node).decorators, visitor, isDecorator), nodesVisitor((<ImportDeclaration>node).modifiers, visitor, isModifier), visitNode((<ImportDeclaration>node).importClause, visitor, isImportClause), visitNode((<ImportDeclaration>node).moduleSpecifier, visitor, isExpression));

    case qt.SyntaxKind.ImportClause:
      return updateImportClause(<ImportClause>node, visitNode((<ImportClause>node).name, visitor, isIdentifier), visitNode((<ImportClause>node).namedBindings, visitor, isNamedImportBindings), (node as ImportClause).isTypeOnly);

    case qt.SyntaxKind.NamespaceImport:
      return updateNamespaceImport(<NamespaceImport>node, visitNode((<NamespaceImport>node).name, visitor, isIdentifier));

    case qt.SyntaxKind.NamespaceExport:
      return updateNamespaceExport(<NamespaceExport>node, visitNode((<NamespaceExport>node).name, visitor, isIdentifier));

    case qt.SyntaxKind.NamedImports:
      return updateNamedImports(<NamedImports>node, nodesVisitor((<NamedImports>node).elements, visitor, isImportSpecifier));

    case qt.SyntaxKind.ImportSpecifier:
      return updateImportSpecifier(<ImportSpecifier>node, visitNode((<ImportSpecifier>node).propertyName, visitor, isIdentifier), visitNode((<ImportSpecifier>node).name, visitor, isIdentifier));

    case qt.SyntaxKind.ExportAssignment:
      return updateExportAssignment(<ExportAssignment>node, nodesVisitor((<ExportAssignment>node).decorators, visitor, isDecorator), nodesVisitor((<ExportAssignment>node).modifiers, visitor, isModifier), visitNode((<ExportAssignment>node).expression, visitor, isExpression));

    case qt.SyntaxKind.ExportDeclaration:
      return updateExportDeclaration(<ExportDeclaration>node, nodesVisitor((<ExportDeclaration>node).decorators, visitor, isDecorator), nodesVisitor((<ExportDeclaration>node).modifiers, visitor, isModifier), visitNode((<ExportDeclaration>node).exportClause, visitor, isNamedExportBindings), visitNode((<ExportDeclaration>node).moduleSpecifier, visitor, isExpression), (node as ExportDeclaration).isTypeOnly);

    case qt.SyntaxKind.NamedExports:
      return updateNamedExports(<NamedExports>node, nodesVisitor((<NamedExports>node).elements, visitor, isExportSpecifier));

    case qt.SyntaxKind.ExportSpecifier:
      return updateExportSpecifier(<ExportSpecifier>node, visitNode((<ExportSpecifier>node).propertyName, visitor, isIdentifier), visitNode((<ExportSpecifier>node).name, visitor, isIdentifier));

    // Module references
    case qt.SyntaxKind.ExternalModuleReference:
      return updateExternalModuleReference(<ExternalModuleReference>node, visitNode((<ExternalModuleReference>node).expression, visitor, isExpression));

    // JSX
    case qt.SyntaxKind.JsxElement:
      return updateJsxElement(<JsxElement>node, visitNode((<JsxElement>node).openingElement, visitor, isJsxOpeningElement), nodesVisitor((<JsxElement>node).children, visitor, isJsxChild), visitNode((<JsxElement>node).closingElement, visitor, isJsxClosingElement));

    case qt.SyntaxKind.JsxSelfClosingElement:
      return updateJsxSelfClosingElement(<JsxSelfClosingElement>node, visitNode((<JsxSelfClosingElement>node).tagName, visitor, isJsxTagNameExpression), nodesVisitor((<JsxSelfClosingElement>node).typeArguments, visitor, isTypeNode), visitNode((<JsxSelfClosingElement>node).attributes, visitor, isJsxAttributes));

    case qt.SyntaxKind.JsxOpeningElement:
      return updateJsxOpeningElement(<JsxOpeningElement>node, visitNode((<JsxOpeningElement>node).tagName, visitor, isJsxTagNameExpression), nodesVisitor((<JsxSelfClosingElement>node).typeArguments, visitor, isTypeNode), visitNode((<JsxOpeningElement>node).attributes, visitor, isJsxAttributes));

    case qt.SyntaxKind.JsxClosingElement:
      return updateJsxClosingElement(<JsxClosingElement>node, visitNode((<JsxClosingElement>node).tagName, visitor, isJsxTagNameExpression));

    case qt.SyntaxKind.JsxFragment:
      return updateJsxFragment(<JsxFragment>node, visitNode((<JsxFragment>node).openingFragment, visitor, isJsxOpeningFragment), nodesVisitor((<JsxFragment>node).children, visitor, isJsxChild), visitNode((<JsxFragment>node).closingFragment, visitor, isJsxClosingFragment));

    case qt.SyntaxKind.JsxAttribute:
      return updateJsxAttribute(<JsxAttribute>node, visitNode((<JsxAttribute>node).name, visitor, isIdentifier), visitNode((<JsxAttribute>node).initializer, visitor, isStringLiteralOrJsxExpression));

    case qt.SyntaxKind.JsxAttributes:
      return updateJsxAttributes(<JsxAttributes>node, nodesVisitor((<JsxAttributes>node).properties, visitor, isJsxAttributeLike));

    case qt.SyntaxKind.JsxSpreadAttribute:
      return updateJsxSpreadAttribute(<JsxSpreadAttribute>node, visitNode((<JsxSpreadAttribute>node).expression, visitor, isExpression));

    case qt.SyntaxKind.JsxExpression:
      return updateJsxExpression(<JsxExpression>node, visitNode((<JsxExpression>node).expression, visitor, isExpression));

    // Clauses
    case qt.SyntaxKind.CaseClause:
      return updateCaseClause(<CaseClause>node, visitNode((<CaseClause>node).expression, visitor, isExpression), nodesVisitor((<CaseClause>node).statements, visitor, isStatement));

    case qt.SyntaxKind.DefaultClause:
      return updateDefaultClause(<DefaultClause>node, nodesVisitor((<DefaultClause>node).statements, visitor, isStatement));

    case qt.SyntaxKind.HeritageClause:
      return updateHeritageClause(<HeritageClause>node, nodesVisitor((<HeritageClause>node).types, visitor, isExpressionWithTypeArguments));

    case qt.SyntaxKind.CatchClause:
      return updateCatchClause(<CatchClause>node, visitNode((<CatchClause>node).variableDeclaration, visitor, isVariableDeclaration), visitNode((<CatchClause>node).block, visitor, isBlock));

    // Property assignments
    case qt.SyntaxKind.PropertyAssignment:
      return updatePropertyAssignment(<PropertyAssignment>node, visitNode((<PropertyAssignment>node).name, visitor, isPropertyName), visitNode((<PropertyAssignment>node).initializer, visitor, isExpression));

    case qt.SyntaxKind.ShorthandPropertyAssignment:
      return updateShorthandPropertyAssignment(<ShorthandPropertyAssignment>node, visitNode((<ShorthandPropertyAssignment>node).name, visitor, isIdentifier), visitNode((<ShorthandPropertyAssignment>node).objectAssignmentInitializer, visitor, isExpression));

    case qt.SyntaxKind.SpreadAssignment:
      return updateSpreadAssignment(<SpreadAssignment>node, visitNode((<SpreadAssignment>node).expression, visitor, isExpression));

    // Enum
    case qt.SyntaxKind.EnumMember:
      return updateEnumMember(<EnumMember>node, visitNode((<EnumMember>node).name, visitor, isPropertyName), visitNode((<EnumMember>node).initializer, visitor, isExpression));

    // Top-level nodes
    case qt.SyntaxKind.SourceFile:
      return updateSourceFileNode(<SourceFile>node, visitLexicalEnvironment((<SourceFile>node).statements, visitor, context));

    // Transformation nodes
    case qt.SyntaxKind.PartiallyEmittedExpression:
      return updatePartiallyEmittedExpression(<PartiallyEmittedExpression>node, visitNode((<PartiallyEmittedExpression>node).expression, visitor, isExpression));

    case qt.SyntaxKind.CommaListExpression:
      return updateCommaList(<CommaListExpression>node, nodesVisitor((<CommaListExpression>node).elements, visitor, isExpression));

    default:
      // No need to visit nodes with no children.
      return node;
  }
}

/**
 * Extracts the single node from a NodeArray.
 *
 * @param nodes The NodeArray.
 */
function extractSingleNode(nodes: readonly Node[]): Node | undefined {
  Debug.assert(nodes.length <= 1, 'Too many nodes written to output.');
  return singleOrUndefined(nodes);
}
