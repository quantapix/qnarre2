namespace qnr {
  const isTypeNodeOrTypeParameterDeclaration = qa.or(isTypeNode, isTypeParameterDeclaration);

  export function visitNode<T extends Node>(node: T | undefined, visitor: Visitor | undefined, test?: (node: Node) => boolean, lift?: (node: NodeArray<Node>) => T): T;
  export function visitNode<T extends Node>(node: T | undefined, visitor: Visitor | undefined, test?: (node: Node) => boolean, lift?: (node: NodeArray<Node>) => T): T | undefined;
  export function visitNode<T extends Node>(node: T | undefined, visitor: Visitor | undefined, test?: (node: Node) => boolean, lift?: (node: NodeArray<Node>) => T): T | undefined {
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
      return;
    } else if (isArray(visited)) {
      visitedNode = (lift || extractSingleNode)(visited);
    } else {
      visitedNode = visited;
    }

    Debug.assertNode(visitedNode, test);
    aggregateTransformFlags(visitedNode!);
    return <T>visitedNode;
  }

  export function visitNodeArray<T extends Node>(nodes: NodeArray<T> | undefined, visitor: Visitor, test?: (node: Node) => boolean, start?: number, count?: number): NodeArray<T>;
  export function visitNodeArray<T extends Node>(nodes: NodeArray<T> | undefined, visitor: Visitor, test?: (node: Node) => boolean, start?: number, count?: number): NodeArray<T> | undefined;
  export function visitNodeArray<T extends Node>(nodes: NodeArray<T> | undefined, visitor: Visitor, test?: (node: Node) => boolean, start?: number, count?: number): NodeArray<T> | undefined {
    if (nodes === undefined || visitor === undefined) {
      return nodes;
    }

    let updated: MutableNodeArray<T> | undefined;
    const length = nodes.length;
    if (start === undefined || start < 0) {
      start = 0;
    }

    if (count === undefined || count > length - start) {
      count = length - start;
    }

    if (start > 0 || count < length) {
      updated = NodeArray.create<T>([], /*trailingComma*/ nodes.trailingComma && start + count === length);
    }

    for (let i = 0; i < count; i++) {
      const node: T = nodes[i + start];
      aggregateTransformFlags(node);
      const visited = node !== undefined ? visitor(node) : undefined;
      if (updated !== undefined || visited === undefined || visited !== node) {
        if (updated === undefined) {
          // Ensure we have a copy of `nodes`, up to the current index.
          updated = NodeArray.create(nodes.slice(0, i), nodes.trailingComma);
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

  export function visitLexicalEnvironment(statements: NodeArray<Statement>, visitor: Visitor, context: TransformationContext, start?: number, ensureUseStrict?: boolean) {
    context.startLexicalEnvironment();
    statements = NodeArray.visit(statements, visitor, isStatement, start);
    if (ensureUseStrict) statements = qnr.ensureUseStrict(statements); // eslint-disable-line @typescript-eslint/no-unnecessary-qualifier
    return mergeLexicalEnvironment(statements, context.endLexicalEnvironment());
  }

  export function visitParameterList(
    nodes: NodeArray<ParameterDeclaration>,
    visitor: Visitor,
    context: TransformationContext,
    nodesVisitor?: <T extends Node>(nodes: NodeArray<T>, visitor: Visitor, test?: (node: Node) => boolean, start?: number, count?: number) => NodeArray<T>
  ): NodeArray<ParameterDeclaration>;
  export function visitParameterList(
    nodes: NodeArray<ParameterDeclaration> | undefined,
    visitor: Visitor,
    context: TransformationContext,
    nodesVisitor?: <T extends Node>(nodes: NodeArray<T> | undefined, visitor: Visitor, test?: (node: Node) => boolean, start?: number, count?: number) => NodeArray<T> | undefined
  ): NodeArray<ParameterDeclaration> | undefined;
  export function visitParameterList(nodes: NodeArray<ParameterDeclaration> | undefined, visitor: Visitor, context: TransformationContext, nodesVisitor = NodeArray.visit) {
    let updated: NodeArray<ParameterDeclaration> | undefined;
    context.startLexicalEnvironment();
    if (nodes) {
      context.setLexicalEnvironmentFlags(LexicalEnvironmentFlags.InParameters, true);
      updated = nodesVisitor(nodes, visitor, isParameterDeclaration);
      if (context.getLexicalEnvironmentFlags() & LexicalEnvironmentFlags.VariablesHoistedInParameters) {
        updated = addDefaultValueAssignmentsIfNeeded(updated, context);
      }
      context.setLexicalEnvironmentFlags(LexicalEnvironmentFlags.InParameters, false);
    }
    context.suspendLexicalEnvironment();
    return updated;
  }

  function addDefaultValueAssignmentsIfNeeded(parameters: NodeArray<ParameterDeclaration>, context: TransformationContext) {
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
      return setTextRange(NodeArray.create(result, parameters.trailingComma), parameters);
    }
    return parameters;
  }

  function addDefaultValueAssignmentIfNeeded(parameter: ParameterDeclaration, context: TransformationContext) {
    return parameter.dot3Token
      ? parameter
      : qn.is.kind(BindingPattern, parameter.name)
      ? addDefaultValueAssignmentForBindingPattern(parameter, context)
      : parameter.initializer
      ? addDefaultValueAssignmentForInitializer(parameter, parameter.name, parameter.initializer, context)
      : parameter;
  }

  function addDefaultValueAssignmentForBindingPattern(parameter: ParameterDeclaration, context: TransformationContext) {
    context.addInitializationStatement(
      createVariableStatement(
        /*modifiers*/ undefined,
        createVariableDeclarationList([
          createVariableDeclaration(
            parameter.name,
            parameter.type,
            parameter.initializer
              ? createConditional(createStrictEquality(getGeneratedNameForNode(parameter), createVoidZero()), parameter.initializer, getGeneratedNameForNode(parameter))
              : getGeneratedNameForNode(parameter)
          ),
        ])
      )
    );
    return updateParameter(
      parameter,
      parameter.decorators,
      parameter.modifiers,
      parameter.dot3Token,
      getGeneratedNameForNode(parameter),
      parameter.questionToken,
      parameter.type,
      /*initializer*/ undefined
    );
  }

  function addDefaultValueAssignmentForInitializer(parameter: ParameterDeclaration, name: Identifier, initializer: Expression, context: TransformationContext) {
    context.addInitializationStatement(
      createIf(
        createTypeCheck(getSynthesizedClone(name), 'undefined'),
        setEmitFlags(
          setTextRange(
            createBlock([
              createExpressionStatement(
                setEmitFlags(
                  setTextRange(
                    createAssignment(
                      setEmitFlags(getMutableClone(name), EmitFlags.NoSourceMap),
                      setEmitFlags(initializer, EmitFlags.NoSourceMap | qn.get.emitFlags(initializer) | EmitFlags.NoComments)
                    ),
                    parameter
                  ),
                  EmitFlags.NoComments
                )
              ),
            ]),
            parameter
          ),
          EmitFlags.SingleLine | EmitFlags.NoTrailingSourceMap | EmitFlags.NoTokenSourceMaps | EmitFlags.NoComments
        )
      )
    );
    return updateParameter(parameter, parameter.decorators, parameter.modifiers, parameter.dot3Token, parameter.name, parameter.questionToken, parameter.type, /*initializer*/ undefined);
  }

  export function visitFunctionBody(node: FunctionBody, visitor: Visitor, context: TransformationContext): FunctionBody;
  export function visitFunctionBody(node: FunctionBody | undefined, visitor: Visitor, context: TransformationContext): FunctionBody | undefined;
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

  export function visitEachChild<T extends Node>(node: T, visitor: Visitor, context: TransformationContext): T;
  export function visitEachChild<T extends Node>(node: T | undefined, visitor: Visitor, context: TransformationContext, nodesVisitor?: typeof NodeArray.visit, tokenVisitor?: Visitor): T | undefined;
  export function visitEachChild(node: Node | undefined, visitor: Visitor, context: TransformationContext, nodesVisitor = NodeArray.visit, tokenVisitor?: Visitor): Node | undefined {
    if (node === undefined) {
      return;
    }

    const kind = node.kind;

    // No need to visit nodes with no children.
    if ((kind > Syntax.FirstToken && kind <= Syntax.LastToken) || kind === Syntax.ThisType) {
      return node;
    }

    switch (kind) {
      // Names

      case Syntax.Identifier:
        return updateIdentifier(<Identifier>node, nodesVisitor((<Identifier>node).typeArguments, visitor, isTypeNodeOrTypeParameterDeclaration));

      case Syntax.QualifiedName:
        return QualifiedName.update(<QualifiedName>node, visitNode((<QualifiedName>node).left, visitor, isEntityName), visitNode((<QualifiedName>node).right, visitor, isIdentifier));

      case Syntax.ComputedPropertyName:
        return ComputedPropertyName.update(<ComputedPropertyName>node, visitNode((<ComputedPropertyName>node).expression, visitor, isExpression));

      // Signature elements
      case Syntax.TypeParameter:
        return updateTypeParameterDeclaration(
          <TypeParameterDeclaration>node,
          visitNode((<TypeParameterDeclaration>node).name, visitor, isIdentifier),
          visitNode((<TypeParameterDeclaration>node).constraint, visitor, isTypeNode),
          visitNode((<TypeParameterDeclaration>node).default, visitor, isTypeNode)
        );

      case Syntax.Parameter:
        return updateParameter(
          <ParameterDeclaration>node,
          nodesVisitor((<ParameterDeclaration>node).decorators, visitor, isDecorator),
          nodesVisitor((<ParameterDeclaration>node).modifiers, visitor, isModifier),
          visitNode((<ParameterDeclaration>node).dot3Token, tokenVisitor, isToken),
          visitNode((<ParameterDeclaration>node).name, visitor, isBindingName),
          visitNode((<ParameterDeclaration>node).questionToken, tokenVisitor, isToken),
          visitNode((<ParameterDeclaration>node).type, visitor, isTypeNode),
          visitNode((<ParameterDeclaration>node).initializer, visitor, isExpression)
        );

      case Syntax.Decorator:
        return updateDecorator(<Decorator>node, visitNode((<Decorator>node).expression, visitor, isExpression));

      // Type elements
      case Syntax.PropertySignature:
        return PropertySignature.update(
          <PropertySignature>node,
          nodesVisitor((<PropertySignature>node).modifiers, visitor, isToken),
          visitNode((<PropertySignature>node).name, visitor, isPropertyName),
          visitNode((<PropertySignature>node).questionToken, tokenVisitor, isToken),
          visitNode((<PropertySignature>node).type, visitor, isTypeNode),
          visitNode((<PropertySignature>node).initializer, visitor, isExpression)
        );

      case Syntax.PropertyDeclaration:
        return PropertyDeclaration.update(
          <PropertyDeclaration>node,
          nodesVisitor((<PropertyDeclaration>node).decorators, visitor, isDecorator),
          nodesVisitor((<PropertyDeclaration>node).modifiers, visitor, isModifier),
          visitNode((<PropertyDeclaration>node).name, visitor, isPropertyName),
          // QuestionToken and ExclamationToken is uniqued in Property Declaration and the signature of 'updateProperty' is that too
          visitNode((<PropertyDeclaration>node).questionToken || (<PropertyDeclaration>node).exclamationToken, tokenVisitor, isToken),
          visitNode((<PropertyDeclaration>node).type, visitor, isTypeNode),
          visitNode((<PropertyDeclaration>node).initializer, visitor, isExpression)
        );

      case Syntax.MethodSignature:
        return MethodSignature.update(
          <MethodSignature>node,
          nodesVisitor((<MethodSignature>node).typeParameters, visitor, isTypeParameterDeclaration),
          nodesVisitor((<MethodSignature>node).parameters, visitor, isParameterDeclaration),
          visitNode((<MethodSignature>node).type, visitor, isTypeNode),
          visitNode((<MethodSignature>node).name, visitor, isPropertyName),
          visitNode((<MethodSignature>node).questionToken, tokenVisitor, isToken)
        );

      case Syntax.MethodDeclaration:
        return MethodDeclaration.update(
          <MethodDeclaration>node,
          nodesVisitor((<MethodDeclaration>node).decorators, visitor, isDecorator),
          nodesVisitor((<MethodDeclaration>node).modifiers, visitor, isModifier),
          visitNode((<MethodDeclaration>node).asteriskToken, tokenVisitor, isToken),
          visitNode((<MethodDeclaration>node).name, visitor, isPropertyName),
          visitNode((<MethodDeclaration>node).questionToken, tokenVisitor, isToken),
          nodesVisitor((<MethodDeclaration>node).typeParameters, visitor, isTypeParameterDeclaration),
          visitParameterList((<MethodDeclaration>node).parameters, visitor, context, nodesVisitor),
          visitNode((<MethodDeclaration>node).type, visitor, isTypeNode),
          visitFunctionBody((<MethodDeclaration>node).body!, visitor, context)
        );

      case Syntax.Constructor:
        return ConstructorDeclaration.update(
          <ConstructorDeclaration>node,
          nodesVisitor((<ConstructorDeclaration>node).decorators, visitor, isDecorator),
          nodesVisitor((<ConstructorDeclaration>node).modifiers, visitor, isModifier),
          visitParameterList((<ConstructorDeclaration>node).parameters, visitor, context, nodesVisitor),
          visitFunctionBody((<ConstructorDeclaration>node).body!, visitor, context)
        );

      case Syntax.GetAccessor:
        return GetAccessorDeclaration.update(
          <GetAccessorDeclaration>node,
          nodesVisitor((<GetAccessorDeclaration>node).decorators, visitor, isDecorator),
          nodesVisitor((<GetAccessorDeclaration>node).modifiers, visitor, isModifier),
          visitNode((<GetAccessorDeclaration>node).name, visitor, isPropertyName),
          visitParameterList((<GetAccessorDeclaration>node).parameters, visitor, context, nodesVisitor),
          visitNode((<GetAccessorDeclaration>node).type, visitor, isTypeNode),
          visitFunctionBody((<GetAccessorDeclaration>node).body!, visitor, context)
        );

      case Syntax.SetAccessor:
        return SetAccessorDeclaration.update(
          <SetAccessorDeclaration>node,
          nodesVisitor((<SetAccessorDeclaration>node).decorators, visitor, isDecorator),
          nodesVisitor((<SetAccessorDeclaration>node).modifiers, visitor, isModifier),
          visitNode((<SetAccessorDeclaration>node).name, visitor, isPropertyName),
          visitParameterList((<SetAccessorDeclaration>node).parameters, visitor, context, nodesVisitor),
          visitFunctionBody((<SetAccessorDeclaration>node).body!, visitor, context)
        );

      case Syntax.CallSignature:
        return CallSignatureDeclaration.update(
          <CallSignatureDeclaration>node,
          nodesVisitor((<CallSignatureDeclaration>node).typeParameters, visitor, isTypeParameterDeclaration),
          nodesVisitor((<CallSignatureDeclaration>node).parameters, visitor, isParameterDeclaration),
          visitNode((<CallSignatureDeclaration>node).type, visitor, isTypeNode)
        );

      case Syntax.ConstructSignature:
        return ConstructSignatureDeclaration.update(
          <ConstructSignatureDeclaration>node,
          nodesVisitor((<ConstructSignatureDeclaration>node).typeParameters, visitor, isTypeParameterDeclaration),
          nodesVisitor((<ConstructSignatureDeclaration>node).parameters, visitor, isParameterDeclaration),
          visitNode((<ConstructSignatureDeclaration>node).type, visitor, isTypeNode)
        );

      case Syntax.IndexSignature:
        return IndexSignatureDeclaration.update(
          <IndexSignatureDeclaration>node,
          nodesVisitor((<IndexSignatureDeclaration>node).decorators, visitor, isDecorator),
          nodesVisitor((<IndexSignatureDeclaration>node).modifiers, visitor, isModifier),
          nodesVisitor((<IndexSignatureDeclaration>node).parameters, visitor, isParameterDeclaration),
          visitNode((<IndexSignatureDeclaration>node).type, visitor, isTypeNode)
        );

      // Types
      case Syntax.TypePredicate:
        return TypePredicateNode.updateWithModifier(
          <TypePredicateNode>node,
          visitNode((<TypePredicateNode>node).assertsModifier, visitor),
          visitNode((<TypePredicateNode>node).parameterName, visitor),
          visitNode((<TypePredicateNode>node).type, visitor, isTypeNode)
        );

      case Syntax.TypeReference:
        return TypeReferenceNode.update(
          <TypeReferenceNode>node,
          visitNode((<TypeReferenceNode>node).typeName, visitor, isEntityName),
          nodesVisitor((<TypeReferenceNode>node).typeArguments, visitor, isTypeNode)
        );

      case Syntax.FunctionType:
        return FunctionTypeNode.update(
          <FunctionTypeNode>node,
          nodesVisitor((<FunctionTypeNode>node).typeParameters, visitor, isTypeParameterDeclaration),
          nodesVisitor((<FunctionTypeNode>node).parameters, visitor, isParameterDeclaration),
          visitNode((<FunctionTypeNode>node).type, visitor, isTypeNode)
        );

      case Syntax.ConstructorType:
        return ConstructorDeclaration.updateTypeNode(
          <ConstructorTypeNode>node,
          nodesVisitor((<ConstructorTypeNode>node).typeParameters, visitor, isTypeParameterDeclaration),
          nodesVisitor((<ConstructorTypeNode>node).parameters, visitor, isParameterDeclaration),
          visitNode((<ConstructorTypeNode>node).type, visitor, isTypeNode)
        );

      case Syntax.TypeQuery:
        return TypeQueryNode.update(<TypeQueryNode>node, visitNode((<TypeQueryNode>node).exprName, visitor, isEntityName));

      case Syntax.TypeLiteral:
        return TypeLiteralNode.update(<TypeLiteralNode>node, nodesVisitor((<TypeLiteralNode>node).members, visitor, isTypeElement));

      case Syntax.ArrayType:
        return ArrayTypeNode.update(<ArrayTypeNode>node, visitNode((<ArrayTypeNode>node).elementType, visitor, isTypeNode));

      case Syntax.TupleType:
        return TupleTypeNode.update(<TupleTypeNode>node, nodesVisitor((<TupleTypeNode>node).elements, visitor, isTypeNode));

      case Syntax.OptionalType:
        return OptionalTypeNode.update(<OptionalTypeNode>node, visitNode((<OptionalTypeNode>node).type, visitor, isTypeNode));

      case Syntax.RestType:
        return RestTypeNode.update(<RestTypeNode>node, visitNode((<RestTypeNode>node).type, visitor, isTypeNode));

      case Syntax.UnionType:
        return UnionTypeNode.update(<UnionTypeNode>node, nodesVisitor((<UnionTypeNode>node).types, visitor, isTypeNode));

      case Syntax.IntersectionType:
        return IntersectionTypeNode.update(<IntersectionTypeNode>node, nodesVisitor((<IntersectionTypeNode>node).types, visitor, isTypeNode));

      case Syntax.ConditionalType:
        return ConditionalTypeNode.update(
          <ConditionalTypeNode>node,
          visitNode((<ConditionalTypeNode>node).checkType, visitor, isTypeNode),
          visitNode((<ConditionalTypeNode>node).extendsType, visitor, isTypeNode),
          visitNode((<ConditionalTypeNode>node).trueType, visitor, isTypeNode),
          visitNode((<ConditionalTypeNode>node).falseType, visitor, isTypeNode)
        );

      case Syntax.InferType:
        return InferTypeNode.update(<InferTypeNode>node, visitNode((<InferTypeNode>node).typeParameter, visitor, isTypeParameterDeclaration));

      case Syntax.ImportType:
        return ImportTypeNode.update(
          <ImportTypeNode>node,
          visitNode((<ImportTypeNode>node).argument, visitor, isTypeNode),
          visitNode((<ImportTypeNode>node).qualifier, visitor, isEntityName),
          NodeArray.visit((<ImportTypeNode>node).typeArguments, visitor, isTypeNode),
          (<ImportTypeNode>node).isTypeOf
        );

      case Syntax.NamedTupleMember:
        return NamedTupleMember.update(
          <NamedTupleMember>node,
          visitNode((<NamedTupleMember>node).dot3Token, visitor, isToken),
          visitNode((<NamedTupleMember>node).name, visitor, isIdentifier),
          visitNode((<NamedTupleMember>node).questionToken, visitor, isToken),
          visitNode((<NamedTupleMember>node).type, visitor, isTypeNode)
        );

      case Syntax.ParenthesizedType:
        return ParenthesizedTypeNode.update(<ParenthesizedTypeNode>node, visitNode((<ParenthesizedTypeNode>node).type, visitor, isTypeNode));

      case Syntax.TypeOperator:
        return TypeOperatorNode.update(<TypeOperatorNode>node, visitNode((<TypeOperatorNode>node).type, visitor, isTypeNode));

      case Syntax.IndexedAccessType:
        return IndexedAccessTypeNode.update(
          <IndexedAccessTypeNode>node,
          visitNode((<IndexedAccessTypeNode>node).objectType, visitor, isTypeNode),
          visitNode((<IndexedAccessTypeNode>node).indexType, visitor, isTypeNode)
        );

      case Syntax.MappedType:
        return MappedTypeNode.update(
          <MappedTypeNode>node,
          visitNode((<MappedTypeNode>node).readonlyToken, tokenVisitor, isToken),
          visitNode((<MappedTypeNode>node).typeParameter, visitor, isTypeParameterDeclaration),
          visitNode((<MappedTypeNode>node).questionToken, tokenVisitor, isToken),
          visitNode((<MappedTypeNode>node).type, visitor, isTypeNode)
        );

      case Syntax.LiteralType:
        return LiteralTypeNode.update(<LiteralTypeNode>node, visitNode((<LiteralTypeNode>node).literal, visitor, isExpression));

      // Binding patterns
      case Syntax.ObjectBindingPattern:
        return ObjectBindingPattern.update(<ObjectBindingPattern>node, nodesVisitor((<ObjectBindingPattern>node).elements, visitor, BindingElement.kind));

      case Syntax.ArrayBindingPattern:
        return ArrayBindingPattern.update(<ArrayBindingPattern>node, nodesVisitor((<ArrayBindingPattern>node).elements, visitor, isArrayBindingElement));

      case Syntax.BindingElement:
        return BindingElement.update(
          <BindingElement>node,
          visitNode((<BindingElement>node).dot3Token, tokenVisitor, isToken),
          visitNode((<BindingElement>node).propertyName, visitor, isPropertyName),
          visitNode((<BindingElement>node).name, visitor, isBindingName),
          visitNode((<BindingElement>node).initializer, visitor, isExpression)
        );

      // Expression
      case Syntax.ArrayLiteralExpression:
        return updateArrayLiteral(<ArrayLiteralExpression>node, nodesVisitor((<ArrayLiteralExpression>node).elements, visitor, isExpression));

      case Syntax.ObjectLiteralExpression:
        return updateObjectLiteral(<ObjectLiteralExpression>node, nodesVisitor((<ObjectLiteralExpression>node).properties, visitor, isObjectLiteralElementLike));

      case Syntax.PropertyAccessExpression:
        if (node.flags & NodeFlags.OptionalChain) {
          return updatePropertyAccessChain(
            <PropertyAccessChain>node,
            visitNode((<PropertyAccessChain>node).expression, visitor, isExpression),
            visitNode((<PropertyAccessChain>node).questionDotToken, tokenVisitor, isToken),
            visitNode((<PropertyAccessChain>node).name, visitor, isIdentifier)
          );
        }
        return updatePropertyAccess(
          <PropertyAccessExpression>node,
          visitNode((<PropertyAccessExpression>node).expression, visitor, isExpression),
          visitNode((<PropertyAccessExpression>node).name, visitor, isIdentifierOrPrivateIdentifier)
        );

      case Syntax.ElementAccessExpression:
        if (node.flags & NodeFlags.OptionalChain) {
          return updateElementAccessChain(
            <ElementAccessChain>node,
            visitNode((<ElementAccessChain>node).expression, visitor, isExpression),
            visitNode((<ElementAccessChain>node).questionDotToken, tokenVisitor, isToken),
            visitNode((<ElementAccessChain>node).argumentExpression, visitor, isExpression)
          );
        }
        return updateElementAccess(
          <ElementAccessExpression>node,
          visitNode((<ElementAccessExpression>node).expression, visitor, isExpression),
          visitNode((<ElementAccessExpression>node).argumentExpression, visitor, isExpression)
        );

      case Syntax.CallExpression:
        if (node.flags & NodeFlags.OptionalChain) {
          return updateCallChain(
            <CallChain>node,
            visitNode((<CallChain>node).expression, visitor, isExpression),
            visitNode((<CallChain>node).questionDotToken, tokenVisitor, isToken),
            nodesVisitor((<CallChain>node).typeArguments, visitor, isTypeNode),
            nodesVisitor((<CallChain>node).arguments, visitor, isExpression)
          );
        }
        return updateCall(
          <CallExpression>node,
          visitNode((<CallExpression>node).expression, visitor, isExpression),
          nodesVisitor((<CallExpression>node).typeArguments, visitor, isTypeNode),
          nodesVisitor((<CallExpression>node).arguments, visitor, isExpression)
        );

      case Syntax.NewExpression:
        return updateNew(
          <NewExpression>node,
          visitNode((<NewExpression>node).expression, visitor, isExpression),
          nodesVisitor((<NewExpression>node).typeArguments, visitor, isTypeNode),
          nodesVisitor((<NewExpression>node).arguments, visitor, isExpression)
        );

      case Syntax.TaggedTemplateExpression:
        return updateTaggedTemplate(
          <TaggedTemplateExpression>node,
          visitNode((<TaggedTemplateExpression>node).tag, visitor, isExpression),
          NodeArray.visit((<TaggedTemplateExpression>node).typeArguments, visitor, isExpression),
          visitNode((<TaggedTemplateExpression>node).template, visitor, isTemplateLiteral)
        );

      case Syntax.TypeAssertionExpression:
        return updateTypeAssertion(<TypeAssertion>node, visitNode((<TypeAssertion>node).type, visitor, isTypeNode), visitNode((<TypeAssertion>node).expression, visitor, isExpression));

      case Syntax.ParenthesizedExpression:
        return updateParen(<ParenthesizedExpression>node, visitNode((<ParenthesizedExpression>node).expression, visitor, isExpression));

      case Syntax.FunctionExpression:
        return updateFunctionExpression(
          <FunctionExpression>node,
          nodesVisitor((<FunctionExpression>node).modifiers, visitor, isModifier),
          visitNode((<FunctionExpression>node).asteriskToken, tokenVisitor, isToken),
          visitNode((<FunctionExpression>node).name, visitor, isIdentifier),
          nodesVisitor((<FunctionExpression>node).typeParameters, visitor, isTypeParameterDeclaration),
          visitParameterList((<FunctionExpression>node).parameters, visitor, context, nodesVisitor),
          visitNode((<FunctionExpression>node).type, visitor, isTypeNode),
          visitFunctionBody((<FunctionExpression>node).body, visitor, context)
        );

      case Syntax.ArrowFunction:
        return updateArrowFunction(
          <ArrowFunction>node,
          nodesVisitor((<ArrowFunction>node).modifiers, visitor, isModifier),
          nodesVisitor((<ArrowFunction>node).typeParameters, visitor, isTypeParameterDeclaration),
          visitParameterList((<ArrowFunction>node).parameters, visitor, context, nodesVisitor),
          visitNode((<ArrowFunction>node).type, visitor, isTypeNode),
          visitNode((<ArrowFunction>node).equalsGreaterThanToken, tokenVisitor, isToken),
          visitFunctionBody((<ArrowFunction>node).body, visitor, context)
        );

      case Syntax.DeleteExpression:
        return updateDelete(<DeleteExpression>node, visitNode((<DeleteExpression>node).expression, visitor, isExpression));

      case Syntax.TypeOfExpression:
        return updateTypeOf(<TypeOfExpression>node, visitNode((<TypeOfExpression>node).expression, visitor, isExpression));

      case Syntax.VoidExpression:
        return updateVoid(<VoidExpression>node, visitNode((<VoidExpression>node).expression, visitor, isExpression));

      case Syntax.AwaitExpression:
        return updateAwait(<AwaitExpression>node, visitNode((<AwaitExpression>node).expression, visitor, isExpression));

      case Syntax.PrefixUnaryExpression:
        return updatePrefix(<PrefixUnaryExpression>node, visitNode((<PrefixUnaryExpression>node).operand, visitor, isExpression));

      case Syntax.PostfixUnaryExpression:
        return updatePostfix(<PostfixUnaryExpression>node, visitNode((<PostfixUnaryExpression>node).operand, visitor, isExpression));

      case Syntax.BinaryExpression:
        return updateBinary(
          <BinaryExpression>node,
          visitNode((<BinaryExpression>node).left, visitor, isExpression),
          visitNode((<BinaryExpression>node).right, visitor, isExpression),
          visitNode((<BinaryExpression>node).operatorToken, tokenVisitor, isToken)
        );

      case Syntax.ConditionalExpression:
        return updateConditional(
          <ConditionalExpression>node,
          visitNode((<ConditionalExpression>node).condition, visitor, isExpression),
          visitNode((<ConditionalExpression>node).questionToken, tokenVisitor, isToken),
          visitNode((<ConditionalExpression>node).whenTrue, visitor, isExpression),
          visitNode((<ConditionalExpression>node).colonToken, tokenVisitor, isToken),
          visitNode((<ConditionalExpression>node).whenFalse, visitor, isExpression)
        );

      case Syntax.TemplateExpression:
        return updateTemplateExpression(
          <TemplateExpression>node,
          visitNode((<TemplateExpression>node).head, visitor, TemplateHead.kind),
          nodesVisitor((<TemplateExpression>node).templateSpans, visitor, isTemplateSpan)
        );

      case Syntax.YieldExpression:
        return updateYield(<YieldExpression>node, visitNode((<YieldExpression>node).asteriskToken, tokenVisitor, isToken), visitNode((<YieldExpression>node).expression, visitor, isExpression));

      case Syntax.SpreadElement:
        return updateSpread(<SpreadElement>node, visitNode((<SpreadElement>node).expression, visitor, isExpression));

      case Syntax.ClassExpression:
        return updateClassExpression(
          <ClassExpression>node,
          nodesVisitor((<ClassExpression>node).modifiers, visitor, isModifier),
          visitNode((<ClassExpression>node).name, visitor, isIdentifier),
          nodesVisitor((<ClassExpression>node).typeParameters, visitor, isTypeParameterDeclaration),
          nodesVisitor((<ClassExpression>node).heritageClauses, visitor, isHeritageClause),
          nodesVisitor((<ClassExpression>node).members, visitor, isClassElement)
        );

      case Syntax.ExpressionWithTypeArguments:
        return updateExpressionWithTypeArguments(
          <ExpressionWithTypeArguments>node,
          nodesVisitor((<ExpressionWithTypeArguments>node).typeArguments, visitor, isTypeNode),
          visitNode((<ExpressionWithTypeArguments>node).expression, visitor, isExpression)
        );

      case Syntax.AsExpression:
        return updateAsExpression(<AsExpression>node, visitNode((<AsExpression>node).expression, visitor, isExpression), visitNode((<AsExpression>node).type, visitor, isTypeNode));

      case Syntax.NonNullExpression:
        return updateNonNullExpression(<NonNullExpression>node, visitNode((<NonNullExpression>node).expression, visitor, isExpression));

      case Syntax.MetaProperty:
        return updateMetaProperty(<MetaProperty>node, visitNode((<MetaProperty>node).name, visitor, isIdentifier));

      // Misc
      case Syntax.TemplateSpan:
        return updateTemplateSpan(
          <TemplateSpan>node,
          visitNode((<TemplateSpan>node).expression, visitor, isExpression),
          visitNode((<TemplateSpan>node).literal, visitor, TemplateMiddle.kindOrTemplateTail)
        );

      // Element
      case Syntax.Block:
        return updateBlock(<Block>node, nodesVisitor((<Block>node).statements, visitor, isStatement));

      case Syntax.VariableStatement:
        return updateVariableStatement(
          <VariableStatement>node,
          nodesVisitor((<VariableStatement>node).modifiers, visitor, isModifier),
          visitNode((<VariableStatement>node).declarationList, visitor, isVariableDeclarationList)
        );

      case Syntax.ExpressionStatement:
        return updateExpressionStatement(<ExpressionStatement>node, visitNode((<ExpressionStatement>node).expression, visitor, isExpression));

      case Syntax.IfStatement:
        return updateIf(
          <IfStatement>node,
          visitNode((<IfStatement>node).expression, visitor, isExpression),
          visitNode((<IfStatement>node).thenStatement, visitor, isStatement, liftToBlock),
          visitNode((<IfStatement>node).elseStatement, visitor, isStatement, liftToBlock)
        );

      case Syntax.DoStatement:
        return updateDo(<DoStatement>node, visitNode((<DoStatement>node).statement, visitor, isStatement, liftToBlock), visitNode((<DoStatement>node).expression, visitor, isExpression));

      case Syntax.WhileStatement:
        return updateWhile(<WhileStatement>node, visitNode((<WhileStatement>node).expression, visitor, isExpression), visitNode((<WhileStatement>node).statement, visitor, isStatement, liftToBlock));

      case Syntax.ForStatement:
        return updateFor(
          <ForStatement>node,
          visitNode((<ForStatement>node).initializer, visitor, isForInitializer),
          visitNode((<ForStatement>node).condition, visitor, isExpression),
          visitNode((<ForStatement>node).incrementor, visitor, isExpression),
          visitNode((<ForStatement>node).statement, visitor, isStatement, liftToBlock)
        );

      case Syntax.ForInStatement:
        return updateForIn(
          <ForInStatement>node,
          visitNode((<ForInStatement>node).initializer, visitor, isForInitializer),
          visitNode((<ForInStatement>node).expression, visitor, isExpression),
          visitNode((<ForInStatement>node).statement, visitor, isStatement, liftToBlock)
        );

      case Syntax.ForOfStatement:
        return updateForOf(
          <ForOfStatement>node,
          visitNode((<ForOfStatement>node).awaitModifier, tokenVisitor, isToken),
          visitNode((<ForOfStatement>node).initializer, visitor, isForInitializer),
          visitNode((<ForOfStatement>node).expression, visitor, isExpression),
          visitNode((<ForOfStatement>node).statement, visitor, isStatement, liftToBlock)
        );

      case Syntax.ContinueStatement:
        return updateContinue(<ContinueStatement>node, visitNode((<ContinueStatement>node).label, visitor, isIdentifier));

      case Syntax.BreakStatement:
        return updateBreak(<BreakStatement>node, visitNode((<BreakStatement>node).label, visitor, isIdentifier));

      case Syntax.ReturnStatement:
        return updateReturn(<ReturnStatement>node, visitNode((<ReturnStatement>node).expression, visitor, isExpression));

      case Syntax.WithStatement:
        return updateWith(<WithStatement>node, visitNode((<WithStatement>node).expression, visitor, isExpression), visitNode((<WithStatement>node).statement, visitor, isStatement, liftToBlock));

      case Syntax.SwitchStatement:
        return updateSwitch(<SwitchStatement>node, visitNode((<SwitchStatement>node).expression, visitor, isExpression), visitNode((<SwitchStatement>node).caseBlock, visitor, isCaseBlock));

      case Syntax.LabeledStatement:
        return updateLabel(<LabeledStatement>node, visitNode((<LabeledStatement>node).label, visitor, isIdentifier), visitNode((<LabeledStatement>node).statement, visitor, isStatement, liftToBlock));

      case Syntax.ThrowStatement:
        return updateThrow(<ThrowStatement>node, visitNode((<ThrowStatement>node).expression, visitor, isExpression));

      case Syntax.TryStatement:
        return updateTry(
          <TryStatement>node,
          visitNode((<TryStatement>node).tryBlock, visitor, isBlock),
          visitNode((<TryStatement>node).catchClause, visitor, isCatchClause),
          visitNode((<TryStatement>node).finallyBlock, visitor, isBlock)
        );

      case Syntax.VariableDeclaration:
        return updateTypeScriptVariableDeclaration(
          <VariableDeclaration>node,
          visitNode((<VariableDeclaration>node).name, visitor, isBindingName),
          visitNode((<VariableDeclaration>node).exclamationToken, tokenVisitor, isToken),
          visitNode((<VariableDeclaration>node).type, visitor, isTypeNode),
          visitNode((<VariableDeclaration>node).initializer, visitor, isExpression)
        );

      case Syntax.VariableDeclarationList:
        return updateVariableDeclarationList(<VariableDeclarationList>node, nodesVisitor((<VariableDeclarationList>node).declarations, visitor, isVariableDeclaration));

      case Syntax.FunctionDeclaration:
        return updateFunctionDeclaration(
          <FunctionDeclaration>node,
          nodesVisitor((<FunctionDeclaration>node).decorators, visitor, isDecorator),
          nodesVisitor((<FunctionDeclaration>node).modifiers, visitor, isModifier),
          visitNode((<FunctionDeclaration>node).asteriskToken, tokenVisitor, isToken),
          visitNode((<FunctionDeclaration>node).name, visitor, isIdentifier),
          nodesVisitor((<FunctionDeclaration>node).typeParameters, visitor, isTypeParameterDeclaration),
          visitParameterList((<FunctionDeclaration>node).parameters, visitor, context, nodesVisitor),
          visitNode((<FunctionDeclaration>node).type, visitor, isTypeNode),
          visitFunctionBody((<FunctionExpression>node).body, visitor, context)
        );

      case Syntax.ClassDeclaration:
        return updateClassDeclaration(
          <ClassDeclaration>node,
          nodesVisitor((<ClassDeclaration>node).decorators, visitor, isDecorator),
          nodesVisitor((<ClassDeclaration>node).modifiers, visitor, isModifier),
          visitNode((<ClassDeclaration>node).name, visitor, isIdentifier),
          nodesVisitor((<ClassDeclaration>node).typeParameters, visitor, isTypeParameterDeclaration),
          nodesVisitor((<ClassDeclaration>node).heritageClauses, visitor, isHeritageClause),
          nodesVisitor((<ClassDeclaration>node).members, visitor, isClassElement)
        );

      case Syntax.InterfaceDeclaration:
        return updateInterfaceDeclaration(
          <InterfaceDeclaration>node,
          nodesVisitor((<InterfaceDeclaration>node).decorators, visitor, isDecorator),
          nodesVisitor((<InterfaceDeclaration>node).modifiers, visitor, isModifier),
          visitNode((<InterfaceDeclaration>node).name, visitor, isIdentifier),
          nodesVisitor((<InterfaceDeclaration>node).typeParameters, visitor, isTypeParameterDeclaration),
          nodesVisitor((<InterfaceDeclaration>node).heritageClauses, visitor, isHeritageClause),
          nodesVisitor((<InterfaceDeclaration>node).members, visitor, isTypeElement)
        );

      case Syntax.TypeAliasDeclaration:
        return updateTypeAliasDeclaration(
          <TypeAliasDeclaration>node,
          nodesVisitor((<TypeAliasDeclaration>node).decorators, visitor, isDecorator),
          nodesVisitor((<TypeAliasDeclaration>node).modifiers, visitor, isModifier),
          visitNode((<TypeAliasDeclaration>node).name, visitor, isIdentifier),
          nodesVisitor((<TypeAliasDeclaration>node).typeParameters, visitor, isTypeParameterDeclaration),
          visitNode((<TypeAliasDeclaration>node).type, visitor, isTypeNode)
        );

      case Syntax.EnumDeclaration:
        return updateEnumDeclaration(
          <EnumDeclaration>node,
          nodesVisitor((<EnumDeclaration>node).decorators, visitor, isDecorator),
          nodesVisitor((<EnumDeclaration>node).modifiers, visitor, isModifier),
          visitNode((<EnumDeclaration>node).name, visitor, isIdentifier),
          nodesVisitor((<EnumDeclaration>node).members, visitor, isEnumMember)
        );

      case Syntax.ModuleDeclaration:
        return updateModuleDeclaration(
          <ModuleDeclaration>node,
          nodesVisitor((<ModuleDeclaration>node).decorators, visitor, isDecorator),
          nodesVisitor((<ModuleDeclaration>node).modifiers, visitor, isModifier),
          visitNode((<ModuleDeclaration>node).name, visitor, isIdentifier),
          visitNode((<ModuleDeclaration>node).body, visitor, isModuleBody)
        );

      case Syntax.ModuleBlock:
        return updateModuleBlock(<ModuleBlock>node, nodesVisitor((<ModuleBlock>node).statements, visitor, isStatement));

      case Syntax.CaseBlock:
        return updateCaseBlock(<CaseBlock>node, nodesVisitor((<CaseBlock>node).clauses, visitor, isCaseOrDefaultClause));

      case Syntax.NamespaceExportDeclaration:
        return updateNamespaceExportDeclaration(<NamespaceExportDeclaration>node, visitNode((<NamespaceExportDeclaration>node).name, visitor, isIdentifier));

      case Syntax.ImportEqualsDeclaration:
        return updateImportEqualsDeclaration(
          <ImportEqualsDeclaration>node,
          nodesVisitor((<ImportEqualsDeclaration>node).decorators, visitor, isDecorator),
          nodesVisitor((<ImportEqualsDeclaration>node).modifiers, visitor, isModifier),
          visitNode((<ImportEqualsDeclaration>node).name, visitor, isIdentifier),
          visitNode((<ImportEqualsDeclaration>node).moduleReference, visitor, isModuleReference)
        );

      case Syntax.ImportDeclaration:
        return updateImportDeclaration(
          <ImportDeclaration>node,
          nodesVisitor((<ImportDeclaration>node).decorators, visitor, isDecorator),
          nodesVisitor((<ImportDeclaration>node).modifiers, visitor, isModifier),
          visitNode((<ImportDeclaration>node).importClause, visitor, isImportClause),
          visitNode((<ImportDeclaration>node).moduleSpecifier, visitor, isExpression)
        );

      case Syntax.ImportClause:
        return updateImportClause(
          <ImportClause>node,
          visitNode((<ImportClause>node).name, visitor, isIdentifier),
          visitNode((<ImportClause>node).namedBindings, visitor, isNamedImportBindings),
          (node as ImportClause).isTypeOnly
        );

      case Syntax.NamespaceImport:
        return updateNamespaceImport(<NamespaceImport>node, visitNode((<NamespaceImport>node).name, visitor, isIdentifier));

      case Syntax.NamespaceExport:
        return updateNamespaceExport(<NamespaceExport>node, visitNode((<NamespaceExport>node).name, visitor, isIdentifier));

      case Syntax.NamedImports:
        return updateNamedImports(<NamedImports>node, nodesVisitor((<NamedImports>node).elements, visitor, isImportSpecifier));

      case Syntax.ImportSpecifier:
        return updateImportSpecifier(<ImportSpecifier>node, visitNode((<ImportSpecifier>node).propertyName, visitor, isIdentifier), visitNode((<ImportSpecifier>node).name, visitor, isIdentifier));

      case Syntax.ExportAssignment:
        return updateExportAssignment(
          <ExportAssignment>node,
          nodesVisitor((<ExportAssignment>node).decorators, visitor, isDecorator),
          nodesVisitor((<ExportAssignment>node).modifiers, visitor, isModifier),
          visitNode((<ExportAssignment>node).expression, visitor, isExpression)
        );

      case Syntax.ExportDeclaration:
        return updateExportDeclaration(
          <ExportDeclaration>node,
          nodesVisitor((<ExportDeclaration>node).decorators, visitor, isDecorator),
          nodesVisitor((<ExportDeclaration>node).modifiers, visitor, isModifier),
          visitNode((<ExportDeclaration>node).exportClause, visitor, isNamedExportBindings),
          visitNode((<ExportDeclaration>node).moduleSpecifier, visitor, isExpression),
          (node as ExportDeclaration).isTypeOnly
        );

      case Syntax.NamedExports:
        return updateNamedExports(<NamedExports>node, nodesVisitor((<NamedExports>node).elements, visitor, isExportSpecifier));

      case Syntax.ExportSpecifier:
        return updateExportSpecifier(<ExportSpecifier>node, visitNode((<ExportSpecifier>node).propertyName, visitor, isIdentifier), visitNode((<ExportSpecifier>node).name, visitor, isIdentifier));

      // Module references
      case Syntax.ExternalModuleReference:
        return updateExternalModuleReference(<ExternalModuleReference>node, visitNode((<ExternalModuleReference>node).expression, visitor, isExpression));

      // JSX
      case Syntax.JsxElement:
        return updateJsxElement(
          <JsxElement>node,
          visitNode((<JsxElement>node).openingElement, visitor, isJsxOpeningElement),
          nodesVisitor((<JsxElement>node).children, visitor, isJsxChild),
          visitNode((<JsxElement>node).closingElement, visitor, isJsxClosingElement)
        );

      case Syntax.JsxSelfClosingElement:
        return updateJsxSelfClosingElement(
          <JsxSelfClosingElement>node,
          visitNode((<JsxSelfClosingElement>node).tagName, visitor, isJsxTagNameExpression),
          nodesVisitor((<JsxSelfClosingElement>node).typeArguments, visitor, isTypeNode),
          visitNode((<JsxSelfClosingElement>node).attributes, visitor, isJsxAttributes)
        );

      case Syntax.JsxOpeningElement:
        return updateJsxOpeningElement(
          <JsxOpeningElement>node,
          visitNode((<JsxOpeningElement>node).tagName, visitor, isJsxTagNameExpression),
          nodesVisitor((<JsxSelfClosingElement>node).typeArguments, visitor, isTypeNode),
          visitNode((<JsxOpeningElement>node).attributes, visitor, isJsxAttributes)
        );

      case Syntax.JsxClosingElement:
        return updateJsxClosingElement(<JsxClosingElement>node, visitNode((<JsxClosingElement>node).tagName, visitor, isJsxTagNameExpression));

      case Syntax.JsxFragment:
        return updateJsxFragment(
          <JsxFragment>node,
          visitNode((<JsxFragment>node).openingFragment, visitor, isJsxOpeningFragment),
          nodesVisitor((<JsxFragment>node).children, visitor, isJsxChild),
          visitNode((<JsxFragment>node).closingFragment, visitor, isJsxClosingFragment)
        );

      case Syntax.JsxAttribute:
        return updateJsxAttribute(
          <JsxAttribute>node,
          visitNode((<JsxAttribute>node).name, visitor, isIdentifier),
          visitNode((<JsxAttribute>node).initializer, visitor, StringLiteral.orJsxExpressionKind)
        );

      case Syntax.JsxAttributes:
        return updateJsxAttributes(<JsxAttributes>node, nodesVisitor((<JsxAttributes>node).properties, visitor, isJsxAttributeLike));

      case Syntax.JsxSpreadAttribute:
        return updateJsxSpreadAttribute(<JsxSpreadAttribute>node, visitNode((<JsxSpreadAttribute>node).expression, visitor, isExpression));

      case Syntax.JsxExpression:
        return updateJsxExpression(<JsxExpression>node, visitNode((<JsxExpression>node).expression, visitor, isExpression));

      // Clauses
      case Syntax.CaseClause:
        return updateCaseClause(<CaseClause>node, visitNode((<CaseClause>node).expression, visitor, isExpression), nodesVisitor((<CaseClause>node).statements, visitor, isStatement));

      case Syntax.DefaultClause:
        return updateDefaultClause(<DefaultClause>node, nodesVisitor((<DefaultClause>node).statements, visitor, isStatement));

      case Syntax.HeritageClause:
        return updateHeritageClause(<HeritageClause>node, nodesVisitor((<HeritageClause>node).types, visitor, isExpressionWithTypeArguments));

      case Syntax.CatchClause:
        return updateCatchClause(<CatchClause>node, visitNode((<CatchClause>node).variableDeclaration, visitor, isVariableDeclaration), visitNode((<CatchClause>node).block, visitor, isBlock));

      // Property assignments
      case Syntax.PropertyAssignment:
        return updatePropertyAssignment(
          <PropertyAssignment>node,
          visitNode((<PropertyAssignment>node).name, visitor, isPropertyName),
          visitNode((<PropertyAssignment>node).initializer, visitor, isExpression)
        );

      case Syntax.ShorthandPropertyAssignment:
        return updateShorthandPropertyAssignment(
          <ShorthandPropertyAssignment>node,
          visitNode((<ShorthandPropertyAssignment>node).name, visitor, isIdentifier),
          visitNode((<ShorthandPropertyAssignment>node).objectAssignmentInitializer, visitor, isExpression)
        );

      case Syntax.SpreadAssignment:
        return updateSpreadAssignment(<SpreadAssignment>node, visitNode((<SpreadAssignment>node).expression, visitor, isExpression));

      // Enum
      case Syntax.EnumMember:
        return updateEnumMember(<EnumMember>node, visitNode((<EnumMember>node).name, visitor, isPropertyName), visitNode((<EnumMember>node).initializer, visitor, isExpression));

      // Top-level nodes
      case Syntax.SourceFile:
        return qp_updateSourceNode(<SourceFile>node, visitLexicalEnvironment((<SourceFile>node).statements, visitor, context));

      // Transformation nodes
      case Syntax.PartiallyEmittedExpression:
        return updatePartiallyEmittedExpression(<PartiallyEmittedExpression>node, visitNode((<PartiallyEmittedExpression>node).expression, visitor, isExpression));

      case Syntax.CommaListExpression:
        return updateCommaList(<CommaListExpression>node, nodesVisitor((<CommaListExpression>node).elements, visitor, isExpression));

      default:
        // No need to visit nodes with no children.
        return node;
    }
  }

  function extractSingleNode(nodes: readonly Node[]): Node | undefined {
    assert(nodes.length <= 1, 'Too many nodes written to output.');
    return singleOrUndefined(nodes);
  }

  function reduceNode<T>(node: Node | undefined, f: (memo: T, node: Node) => T, initial: T) {
    return node ? f(initial, node) : initial;
  }

  function reduceNodeArray<T>(nodes: NodeArray<Node> | undefined, f: (memo: T, nodes: NodeArray<Node>) => T, initial: T) {
    return nodes ? f(initial, nodes) : initial;
  }

  export function reduceEachChild<T>(node: Node | undefined, initial: T, cbNode: (memo: T, node: Node) => T, cbNodeArray?: (memo: T, nodes: NodeArray<Node>) => T): T {
    if (node === undefined) {
      return initial;
    }

    const reduceNodes: (nodes: NodeArray<Node> | undefined, f: ((memo: T, node: Node) => T) | ((memo: T, node: NodeArray<Node>) => T), initial: T) => T = cbNodeArray ? reduceNodeArray : reduceLeft;
    const cbNodes = cbNodeArray || cbNode;
    const kind = node.kind;

    // No need to visit nodes with no children.
    if (kind > Syntax.FirstToken && kind <= Syntax.LastToken) {
      return initial;
    }

    // We do not yet support types.
    if (kind >= Syntax.TypePredicate && kind <= Syntax.LiteralType) {
      return initial;
    }

    let result = initial;
    switch (node.kind) {
      // Leaf nodes
      case Syntax.SemicolonClassElement:
      case Syntax.EmptyStatement:
      case Syntax.OmittedExpression:
      case Syntax.DebuggerStatement:
      case Syntax.NotEmittedStatement:
        // No need to visit nodes with no children.
        break;

      // Names
      case Syntax.QualifiedName:
        result = reduceNode((<QualifiedName>node).left, cbNode, result);
        result = reduceNode((<QualifiedName>node).right, cbNode, result);
        break;

      case Syntax.ComputedPropertyName:
        result = reduceNode((<ComputedPropertyName>node).expression, cbNode, result);
        break;

      // Signature elements
      case Syntax.Parameter:
        result = reduceNodes((<ParameterDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<ParameterDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<ParameterDeclaration>node).name, cbNode, result);
        result = reduceNode((<ParameterDeclaration>node).type, cbNode, result);
        result = reduceNode((<ParameterDeclaration>node).initializer, cbNode, result);
        break;

      case Syntax.Decorator:
        result = reduceNode((<Decorator>node).expression, cbNode, result);
        break;

      // Type member
      case Syntax.PropertySignature:
        result = reduceNodes((<PropertySignature>node).modifiers, cbNodes, result);
        result = reduceNode((<PropertySignature>node).name, cbNode, result);
        result = reduceNode((<PropertySignature>node).questionToken, cbNode, result);
        result = reduceNode((<PropertySignature>node).type, cbNode, result);
        result = reduceNode((<PropertySignature>node).initializer, cbNode, result);
        break;

      case Syntax.PropertyDeclaration:
        result = reduceNodes((<PropertyDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<PropertyDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<PropertyDeclaration>node).name, cbNode, result);
        result = reduceNode((<PropertyDeclaration>node).type, cbNode, result);
        result = reduceNode((<PropertyDeclaration>node).initializer, cbNode, result);
        break;

      case Syntax.MethodDeclaration:
        result = reduceNodes((<MethodDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<MethodDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<MethodDeclaration>node).name, cbNode, result);
        result = reduceNodes((<MethodDeclaration>node).typeParameters, cbNodes, result);
        result = reduceNodes((<MethodDeclaration>node).parameters, cbNodes, result);
        result = reduceNode((<MethodDeclaration>node).type, cbNode, result);
        result = reduceNode((<MethodDeclaration>node).body, cbNode, result);
        break;

      case Syntax.Constructor:
        result = reduceNodes((<ConstructorDeclaration>node).modifiers, cbNodes, result);
        result = reduceNodes((<ConstructorDeclaration>node).parameters, cbNodes, result);
        result = reduceNode((<ConstructorDeclaration>node).body, cbNode, result);
        break;

      case Syntax.GetAccessor:
        result = reduceNodes((<GetAccessorDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<GetAccessorDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<GetAccessorDeclaration>node).name, cbNode, result);
        result = reduceNodes((<GetAccessorDeclaration>node).parameters, cbNodes, result);
        result = reduceNode((<GetAccessorDeclaration>node).type, cbNode, result);
        result = reduceNode((<GetAccessorDeclaration>node).body, cbNode, result);
        break;

      case Syntax.SetAccessor:
        result = reduceNodes((<GetAccessorDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<GetAccessorDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<GetAccessorDeclaration>node).name, cbNode, result);
        result = reduceNodes((<GetAccessorDeclaration>node).parameters, cbNodes, result);
        result = reduceNode((<GetAccessorDeclaration>node).body, cbNode, result);
        break;

      // Binding patterns
      case Syntax.ObjectBindingPattern:
      case Syntax.ArrayBindingPattern:
        result = reduceNodes((<BindingPattern>node).elements, cbNodes, result);
        break;

      case Syntax.BindingElement:
        result = reduceNode((<BindingElement>node).propertyName, cbNode, result);
        result = reduceNode((<BindingElement>node).name, cbNode, result);
        result = reduceNode((<BindingElement>node).initializer, cbNode, result);
        break;

      // Expression
      case Syntax.ArrayLiteralExpression:
        result = reduceNodes((<ArrayLiteralExpression>node).elements, cbNodes, result);
        break;

      case Syntax.ObjectLiteralExpression:
        result = reduceNodes((<ObjectLiteralExpression>node).properties, cbNodes, result);
        break;

      case Syntax.PropertyAccessExpression:
        result = reduceNode((<PropertyAccessExpression>node).expression, cbNode, result);
        result = reduceNode((<PropertyAccessExpression>node).name, cbNode, result);
        break;

      case Syntax.ElementAccessExpression:
        result = reduceNode((<ElementAccessExpression>node).expression, cbNode, result);
        result = reduceNode((<ElementAccessExpression>node).argumentExpression, cbNode, result);
        break;

      case Syntax.CallExpression:
        result = reduceNode((<CallExpression>node).expression, cbNode, result);
        result = reduceNodes((<CallExpression>node).typeArguments, cbNodes, result);
        result = reduceNodes((<CallExpression>node).arguments, cbNodes, result);
        break;

      case Syntax.NewExpression:
        result = reduceNode((<NewExpression>node).expression, cbNode, result);
        result = reduceNodes((<NewExpression>node).typeArguments, cbNodes, result);
        result = reduceNodes((<NewExpression>node).arguments, cbNodes, result);
        break;

      case Syntax.TaggedTemplateExpression:
        result = reduceNode((<TaggedTemplateExpression>node).tag, cbNode, result);
        result = reduceNodes((<TaggedTemplateExpression>node).typeArguments, cbNodes, result);
        result = reduceNode((<TaggedTemplateExpression>node).template, cbNode, result);
        break;

      case Syntax.TypeAssertionExpression:
        result = reduceNode((<TypeAssertion>node).type, cbNode, result);
        result = reduceNode((<TypeAssertion>node).expression, cbNode, result);
        break;

      case Syntax.FunctionExpression:
        result = reduceNodes((<FunctionExpression>node).modifiers, cbNodes, result);
        result = reduceNode((<FunctionExpression>node).name, cbNode, result);
        result = reduceNodes((<FunctionExpression>node).typeParameters, cbNodes, result);
        result = reduceNodes((<FunctionExpression>node).parameters, cbNodes, result);
        result = reduceNode((<FunctionExpression>node).type, cbNode, result);
        result = reduceNode((<FunctionExpression>node).body, cbNode, result);
        break;

      case Syntax.ArrowFunction:
        result = reduceNodes((<ArrowFunction>node).modifiers, cbNodes, result);
        result = reduceNodes((<ArrowFunction>node).typeParameters, cbNodes, result);
        result = reduceNodes((<ArrowFunction>node).parameters, cbNodes, result);
        result = reduceNode((<ArrowFunction>node).type, cbNode, result);
        result = reduceNode((<ArrowFunction>node).body, cbNode, result);
        break;

      case Syntax.ParenthesizedExpression:
      case Syntax.DeleteExpression:
      case Syntax.TypeOfExpression:
      case Syntax.VoidExpression:
      case Syntax.AwaitExpression:
      case Syntax.YieldExpression:
      case Syntax.SpreadElement:
      case Syntax.NonNullExpression:
        result = reduceNode(
          (<ParenthesizedExpression | DeleteExpression | TypeOfExpression | VoidExpression | AwaitExpression | YieldExpression | SpreadElement | NonNullExpression>node).expression,
          cbNode,
          result
        );
        break;

      case Syntax.PrefixUnaryExpression:
      case Syntax.PostfixUnaryExpression:
        result = reduceNode((<PrefixUnaryExpression | PostfixUnaryExpression>node).operand, cbNode, result);
        break;

      case Syntax.BinaryExpression:
        result = reduceNode((<BinaryExpression>node).left, cbNode, result);
        result = reduceNode((<BinaryExpression>node).right, cbNode, result);
        break;

      case Syntax.ConditionalExpression:
        result = reduceNode((<ConditionalExpression>node).condition, cbNode, result);
        result = reduceNode((<ConditionalExpression>node).whenTrue, cbNode, result);
        result = reduceNode((<ConditionalExpression>node).whenFalse, cbNode, result);
        break;

      case Syntax.TemplateExpression:
        result = reduceNode((<TemplateExpression>node).head, cbNode, result);
        result = reduceNodes((<TemplateExpression>node).templateSpans, cbNodes, result);
        break;

      case Syntax.ClassExpression:
        result = reduceNodes((<ClassExpression>node).modifiers, cbNodes, result);
        result = reduceNode((<ClassExpression>node).name, cbNode, result);
        result = reduceNodes((<ClassExpression>node).typeParameters, cbNodes, result);
        result = reduceNodes((<ClassExpression>node).heritageClauses, cbNodes, result);
        result = reduceNodes((<ClassExpression>node).members, cbNodes, result);
        break;

      case Syntax.ExpressionWithTypeArguments:
        result = reduceNode((<ExpressionWithTypeArguments>node).expression, cbNode, result);
        result = reduceNodes((<ExpressionWithTypeArguments>node).typeArguments, cbNodes, result);
        break;

      case Syntax.AsExpression:
        result = reduceNode((<AsExpression>node).expression, cbNode, result);
        result = reduceNode((<AsExpression>node).type, cbNode, result);
        break;

      // Misc
      case Syntax.TemplateSpan:
        result = reduceNode((<TemplateSpan>node).expression, cbNode, result);
        result = reduceNode((<TemplateSpan>node).literal, cbNode, result);
        break;

      // Element
      case Syntax.Block:
        result = reduceNodes((<Block>node).statements, cbNodes, result);
        break;

      case Syntax.VariableStatement:
        result = reduceNodes((<VariableStatement>node).modifiers, cbNodes, result);
        result = reduceNode((<VariableStatement>node).declarationList, cbNode, result);
        break;

      case Syntax.ExpressionStatement:
        result = reduceNode((<ExpressionStatement>node).expression, cbNode, result);
        break;

      case Syntax.IfStatement:
        result = reduceNode((<IfStatement>node).expression, cbNode, result);
        result = reduceNode((<IfStatement>node).thenStatement, cbNode, result);
        result = reduceNode((<IfStatement>node).elseStatement, cbNode, result);
        break;

      case Syntax.DoStatement:
        result = reduceNode((<DoStatement>node).statement, cbNode, result);
        result = reduceNode((<DoStatement>node).expression, cbNode, result);
        break;

      case Syntax.WhileStatement:
      case Syntax.WithStatement:
        result = reduceNode((<WhileStatement | WithStatement>node).expression, cbNode, result);
        result = reduceNode((<WhileStatement | WithStatement>node).statement, cbNode, result);
        break;

      case Syntax.ForStatement:
        result = reduceNode((<ForStatement>node).initializer, cbNode, result);
        result = reduceNode((<ForStatement>node).condition, cbNode, result);
        result = reduceNode((<ForStatement>node).incrementor, cbNode, result);
        result = reduceNode((<ForStatement>node).statement, cbNode, result);
        break;

      case Syntax.ForInStatement:
      case Syntax.ForOfStatement:
        result = reduceNode((<ForInOrOfStatement>node).initializer, cbNode, result);
        result = reduceNode((<ForInOrOfStatement>node).expression, cbNode, result);
        result = reduceNode((<ForInOrOfStatement>node).statement, cbNode, result);
        break;

      case Syntax.ReturnStatement:
      case Syntax.ThrowStatement:
        result = reduceNode((<ReturnStatement>node).expression, cbNode, result);
        break;

      case Syntax.SwitchStatement:
        result = reduceNode((<SwitchStatement>node).expression, cbNode, result);
        result = reduceNode((<SwitchStatement>node).caseBlock, cbNode, result);
        break;

      case Syntax.LabeledStatement:
        result = reduceNode((<LabeledStatement>node).label, cbNode, result);
        result = reduceNode((<LabeledStatement>node).statement, cbNode, result);
        break;

      case Syntax.TryStatement:
        result = reduceNode((<TryStatement>node).tryBlock, cbNode, result);
        result = reduceNode((<TryStatement>node).catchClause, cbNode, result);
        result = reduceNode((<TryStatement>node).finallyBlock, cbNode, result);
        break;

      case Syntax.VariableDeclaration:
        result = reduceNode((<VariableDeclaration>node).name, cbNode, result);
        result = reduceNode((<VariableDeclaration>node).type, cbNode, result);
        result = reduceNode((<VariableDeclaration>node).initializer, cbNode, result);
        break;

      case Syntax.VariableDeclarationList:
        result = reduceNodes((<VariableDeclarationList>node).declarations, cbNodes, result);
        break;

      case Syntax.FunctionDeclaration:
        result = reduceNodes((<FunctionDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<FunctionDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<FunctionDeclaration>node).name, cbNode, result);
        result = reduceNodes((<FunctionDeclaration>node).typeParameters, cbNodes, result);
        result = reduceNodes((<FunctionDeclaration>node).parameters, cbNodes, result);
        result = reduceNode((<FunctionDeclaration>node).type, cbNode, result);
        result = reduceNode((<FunctionDeclaration>node).body, cbNode, result);
        break;

      case Syntax.ClassDeclaration:
        result = reduceNodes((<ClassDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<ClassDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<ClassDeclaration>node).name, cbNode, result);
        result = reduceNodes((<ClassDeclaration>node).typeParameters, cbNodes, result);
        result = reduceNodes((<ClassDeclaration>node).heritageClauses, cbNodes, result);
        result = reduceNodes((<ClassDeclaration>node).members, cbNodes, result);
        break;

      case Syntax.EnumDeclaration:
        result = reduceNodes((<EnumDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<EnumDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<EnumDeclaration>node).name, cbNode, result);
        result = reduceNodes((<EnumDeclaration>node).members, cbNodes, result);
        break;

      case Syntax.ModuleDeclaration:
        result = reduceNodes((<ModuleDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<ModuleDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<ModuleDeclaration>node).name, cbNode, result);
        result = reduceNode((<ModuleDeclaration>node).body, cbNode, result);
        break;

      case Syntax.ModuleBlock:
        result = reduceNodes((<ModuleBlock>node).statements, cbNodes, result);
        break;

      case Syntax.CaseBlock:
        result = reduceNodes((<CaseBlock>node).clauses, cbNodes, result);
        break;

      case Syntax.ImportEqualsDeclaration:
        result = reduceNodes((<ImportEqualsDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<ImportEqualsDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<ImportEqualsDeclaration>node).name, cbNode, result);
        result = reduceNode((<ImportEqualsDeclaration>node).moduleReference, cbNode, result);
        break;

      case Syntax.ImportDeclaration:
        result = reduceNodes((<ImportDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<ImportDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<ImportDeclaration>node).importClause, cbNode, result);
        result = reduceNode((<ImportDeclaration>node).moduleSpecifier, cbNode, result);
        break;

      case Syntax.ImportClause:
        result = reduceNode((<ImportClause>node).name, cbNode, result);
        result = reduceNode((<ImportClause>node).namedBindings, cbNode, result);
        break;

      case Syntax.NamespaceImport:
        result = reduceNode((<NamespaceImport>node).name, cbNode, result);
        break;

      case Syntax.NamespaceExport:
        result = reduceNode((<NamespaceExport>node).name, cbNode, result);
        break;

      case Syntax.NamedImports:
      case Syntax.NamedExports:
        result = reduceNodes((<NamedImports | NamedExports>node).elements, cbNodes, result);
        break;

      case Syntax.ImportSpecifier:
      case Syntax.ExportSpecifier:
        result = reduceNode((<ImportSpecifier | ExportSpecifier>node).propertyName, cbNode, result);
        result = reduceNode((<ImportSpecifier | ExportSpecifier>node).name, cbNode, result);
        break;

      case Syntax.ExportAssignment:
        result = reduceLeft((<ExportAssignment>node).decorators, cbNode, result);
        result = reduceLeft((<ExportAssignment>node).modifiers, cbNode, result);
        result = reduceNode((<ExportAssignment>node).expression, cbNode, result);
        break;

      case Syntax.ExportDeclaration:
        result = reduceLeft((<ExportDeclaration>node).decorators, cbNode, result);
        result = reduceLeft((<ExportDeclaration>node).modifiers, cbNode, result);
        result = reduceNode((<ExportDeclaration>node).exportClause, cbNode, result);
        result = reduceNode((<ExportDeclaration>node).moduleSpecifier, cbNode, result);
        break;

      // Module references
      case Syntax.ExternalModuleReference:
        result = reduceNode((<ExternalModuleReference>node).expression, cbNode, result);
        break;

      // JSX
      case Syntax.JsxElement:
        result = reduceNode((<JsxElement>node).openingElement, cbNode, result);
        result = reduceLeft((<JsxElement>node).children, cbNode, result);
        result = reduceNode((<JsxElement>node).closingElement, cbNode, result);
        break;

      case Syntax.JsxFragment:
        result = reduceNode((<JsxFragment>node).openingFragment, cbNode, result);
        result = reduceLeft((<JsxFragment>node).children, cbNode, result);
        result = reduceNode((<JsxFragment>node).closingFragment, cbNode, result);
        break;

      case Syntax.JsxSelfClosingElement:
      case Syntax.JsxOpeningElement:
        result = reduceNode((<JsxSelfClosingElement | JsxOpeningElement>node).tagName, cbNode, result);
        result = reduceNodes((<JsxSelfClosingElement | JsxOpeningElement>node).typeArguments, cbNode, result);
        result = reduceNode((<JsxSelfClosingElement | JsxOpeningElement>node).attributes, cbNode, result);
        break;

      case Syntax.JsxAttributes:
        result = reduceNodes((<JsxAttributes>node).properties, cbNodes, result);
        break;

      case Syntax.JsxClosingElement:
        result = reduceNode((<JsxClosingElement>node).tagName, cbNode, result);
        break;

      case Syntax.JsxAttribute:
        result = reduceNode((<JsxAttribute>node).name, cbNode, result);
        result = reduceNode((<JsxAttribute>node).initializer, cbNode, result);
        break;

      case Syntax.JsxSpreadAttribute:
        result = reduceNode((<JsxSpreadAttribute>node).expression, cbNode, result);
        break;

      case Syntax.JsxExpression:
        result = reduceNode((<JsxExpression>node).expression, cbNode, result);
        break;

      // Clauses
      case Syntax.CaseClause:
        result = reduceNode((<CaseClause>node).expression, cbNode, result);
      // falls through

      case Syntax.DefaultClause:
        result = reduceNodes((<CaseClause | DefaultClause>node).statements, cbNodes, result);
        break;

      case Syntax.HeritageClause:
        result = reduceNodes((<HeritageClause>node).types, cbNodes, result);
        break;

      case Syntax.CatchClause:
        result = reduceNode((<CatchClause>node).variableDeclaration, cbNode, result);
        result = reduceNode((<CatchClause>node).block, cbNode, result);
        break;

      // Property assignments
      case Syntax.PropertyAssignment:
        result = reduceNode((<PropertyAssignment>node).name, cbNode, result);
        result = reduceNode((<PropertyAssignment>node).initializer, cbNode, result);
        break;

      case Syntax.ShorthandPropertyAssignment:
        result = reduceNode((<ShorthandPropertyAssignment>node).name, cbNode, result);
        result = reduceNode((<ShorthandPropertyAssignment>node).objectAssignmentInitializer, cbNode, result);
        break;

      case Syntax.SpreadAssignment:
        result = reduceNode((<SpreadAssignment>node).expression, cbNode, result);
        break;

      // Enum
      case Syntax.EnumMember:
        result = reduceNode((<EnumMember>node).name, cbNode, result);
        result = reduceNode((<EnumMember>node).initializer, cbNode, result);
        break;

      // Top-level nodes
      case Syntax.SourceFile:
        result = reduceNodes((<SourceFile>node).statements, cbNodes, result);
        break;

      // Transformation nodes
      case Syntax.PartiallyEmittedExpression:
        result = reduceNode((<PartiallyEmittedExpression>node).expression, cbNode, result);
        break;

      case Syntax.CommaListExpression:
        result = reduceNodes((<CommaListExpression>node).elements, cbNodes, result);
        break;

      default:
        break;
    }

    return result;
  }

  function findSpanEnd<T>(array: readonly T[], test: (value: T) => boolean, start: number) {
    let i = start;
    while (i < array.length && test(array[i])) {
      i++;
    }
    return i;
  }

  export function mergeLexicalEnvironment(statements: NodeArray<Statement>, declarations: readonly Statement[] | undefined): NodeArray<Statement>;
  export function mergeLexicalEnvironment(statements: Statement[], declarations: readonly Statement[] | undefined): Statement[];
  export function mergeLexicalEnvironment(statements: Statement[] | NodeArray<Statement>, declarations: readonly Statement[] | undefined) {
    if (!some(declarations)) {
      return statements;
    }
    // find standard prologues on left in the following order: standard directives, hoisted functions, hoisted variables, other custom
    const leftStandardPrologueEnd = findSpanEnd(statements, isPrologueDirective, 0);
    const leftHoistedFunctionsEnd = findSpanEnd(statements, isHoistedFunction, leftStandardPrologueEnd);
    const leftHoistedVariablesEnd = findSpanEnd(statements, isHoistedVariableStatement, leftHoistedFunctionsEnd);

    // find standard prologues on right in the following order: standard directives, hoisted functions, hoisted variables, other custom
    const rightStandardPrologueEnd = findSpanEnd(declarations, isPrologueDirective, 0);
    const rightHoistedFunctionsEnd = findSpanEnd(declarations, isHoistedFunction, rightStandardPrologueEnd);
    const rightHoistedVariablesEnd = findSpanEnd(declarations, isHoistedVariableStatement, rightHoistedFunctionsEnd);
    const rightCustomPrologueEnd = findSpanEnd(declarations, isCustomPrologue, rightHoistedVariablesEnd);
    assert(rightCustomPrologueEnd === declarations.length, 'Expected declarations to be valid standard or custom prologues');

    // splice prologues from the right into the left. We do this in reverse order
    // so that we don't need to recompute the index on the left when we insert items.
    const left = isNodeArray(statements) ? statements.slice() : statements;

    // splice other custom prologues from right into left
    if (rightCustomPrologueEnd > rightHoistedVariablesEnd) {
      left.splice(leftHoistedVariablesEnd, 0, ...declarations.slice(rightHoistedVariablesEnd, rightCustomPrologueEnd));
    }

    // splice hoisted variables from right into left
    if (rightHoistedVariablesEnd > rightHoistedFunctionsEnd) {
      left.splice(leftHoistedFunctionsEnd, 0, ...declarations.slice(rightHoistedFunctionsEnd, rightHoistedVariablesEnd));
    }

    // splice hoisted functions from right into left
    if (rightHoistedFunctionsEnd > rightStandardPrologueEnd) {
      left.splice(leftStandardPrologueEnd, 0, ...declarations.slice(rightStandardPrologueEnd, rightHoistedFunctionsEnd));
    }

    // splice standard prologues from right into left (that are not already in left)
    if (rightStandardPrologueEnd > 0) {
      if (leftStandardPrologueEnd === 0) {
        left.splice(0, 0, ...declarations.slice(0, rightStandardPrologueEnd));
      } else {
        const leftPrologues = createMap<boolean>();
        for (let i = 0; i < leftStandardPrologueEnd; i++) {
          const leftPrologue = statements[i] as PrologueDirective;
          leftPrologues.set(leftPrologue.expression.text, true);
        }
        for (let i = rightStandardPrologueEnd - 1; i >= 0; i--) {
          const rightPrologue = declarations[i] as PrologueDirective;
          if (!leftPrologues.has(rightPrologue.expression.text)) {
            left.unshift(rightPrologue);
          }
        }
      }
    }

    if (isNodeArray(statements)) {
      return setTextRange(NodeArray.create(left, statements.trailingComma), statements);
    }

    return statements;
  }

  export function liftToBlock(nodes: readonly Node[]): Statement {
    assert(every(nodes, isStatement), 'Cannot lift nodes to a Block.');
    return <Statement>singleOrUndefined(nodes) || createBlock(<NodeArray<Statement>>nodes);
  }

  export function aggregateTransformFlags<T extends Node>(node: T): T {
    aggregateTransformFlagsForNode(node);
    return node;
  }

  function aggregateTransformFlagsForNode(node: Node): TransformFlags {
    if (node === undefined) {
      return TransformFlags.None;
    }
    if (node.transformFlags & TransformFlags.HasComputedFlags) {
      return node.transformFlags & ~getTransformFlagsSubtreeExclusions(node.kind);
    }
    const subtreeFlags = aggregateTransformFlagsForSubtree(node);
    return computeTransformFlagsForNode(node, subtreeFlags);
  }

  function aggregateTransformFlagsForNodeArray(nodes: NodeArray<Node>): TransformFlags {
    if (nodes === undefined) {
      return TransformFlags.None;
    }
    let subtreeFlags = TransformFlags.None;
    let nodeArrayFlags = TransformFlags.None;
    for (const node of nodes) {
      subtreeFlags |= aggregateTransformFlagsForNode(node);
      nodeArrayFlags |= node.transformFlags & ~TransformFlags.HasComputedFlags;
    }
    nodes.transformFlags = nodeArrayFlags | TransformFlags.HasComputedFlags;
    return subtreeFlags;
  }

  function aggregateTransformFlagsForSubtree(node: Node): TransformFlags {
    // We do not transform ambient declarations or types, so there is no need to
    // recursively aggregate transform flags.
    if (hasSyntacticModifier(node, ModifierFlags.Ambient) || (qn.is.typeNode(node) && node.kind !== Syntax.ExpressionWithTypeArguments)) {
      return TransformFlags.None;
    }

    // Aggregate the transform flags of each child.
    return reduceEachChild(node, TransformFlags.None, aggregateTransformFlagsForChildNode, aggregateTransformFlagsForChildNodes);
  }

  function aggregateTransformFlagsForChildNode(transformFlags: TransformFlags, node: Node): TransformFlags {
    return transformFlags | aggregateTransformFlagsForNode(node);
  }

  function aggregateTransformFlagsForChildNodes(transformFlags: TransformFlags, nodes: NodeArray<Node>): TransformFlags {
    return transformFlags | aggregateTransformFlagsForNodeArray(nodes);
  }
}
