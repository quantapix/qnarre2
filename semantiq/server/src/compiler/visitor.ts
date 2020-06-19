namespace qnr {
  const isTypeNodeOrTypeParameterDeclaration = qa.or(isTypeNode, isTypeParameterDeclaration);
  export function visitNode<T extends Node>(node: T | undefined, visitor: Visitor | undefined, test?: (node: Node) => boolean, lift?: (node: Nodes<Node>) => T): T;
  export function visitNode<T extends Node>(node: T | undefined, visitor: Visitor | undefined, test?: (node: Node) => boolean, lift?: (node: Nodes<Node>) => T): T | undefined;
  export function visitNode<T extends Node>(node: T | undefined, visitor: Visitor | undefined, test?: (node: Node) => boolean, lift?: (node: Nodes<Node>) => T): T | undefined {
    if (node === undefined || visitor === undefined) return node;
    aggregateTransformFlags(node);
    const visited = visitor(node);
    if (visited === node) return node;
    let visitedNode: Node | undefined;
    if (visited === undefined) return;
    if (qa.isArray(visited)) visitedNode = (lift || extractSingleNode)(visited);
    else visitedNode = visited;
    Debug.assertNode(visitedNode, test);
    aggregateTransformFlags(visitedNode!);
    return <T>visitedNode;
  }
  export function visitNodes<T extends Node>(nodes: Nodes<T> | undefined, visitor: Visitor, test?: (node: Node) => boolean, start?: number, count?: number): Nodes<T>;
  export function visitNodes<T extends Node>(nodes: Nodes<T> | undefined, visitor: Visitor, test?: (node: Node) => boolean, start?: number, count?: number): Nodes<T> | undefined;
  export function visitNodes<T extends Node>(nodes: Nodes<T> | undefined, visitor: Visitor, test?: (node: Node) => boolean, start?: number, count?: number): Nodes<T> | undefined {
    if (nodes === undefined || visitor === undefined) return nodes;
    let updated: MutableNodes<T> | undefined;
    const length = nodes.length;
    if (start === undefined || start < 0) start = 0;
    if (count === undefined || count > length - start) count = length - start;
    if (start > 0 || count < length) updated = Nodes.create<T>([], nodes.trailingComma && start + count === length);
    for (let i = 0; i < count; i++) {
      const node: T = nodes[i + start];
      aggregateTransformFlags(node);
      const visited = node !== undefined ? visitor(node) : undefined;
      if (updated !== undefined || visited === undefined || visited !== node) {
        if (updated === undefined) {
          updated = Nodes.create(nodes.slice(0, i), nodes.trailingComma);
          setTextRange(updated, nodes);
        }
        if (visited) {
          if (qa.isArray(visited)) {
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
  export function visitLexicalEnvironment(statements: Nodes<Statement>, visitor: Visitor, context: TransformationContext, start?: number, ensureUseStrict?: boolean) {
    context.startLexicalEnvironment();
    statements = Nodes.visit(statements, visitor, isStatement, start);
    if (ensureUseStrict) statements = qnr.ensureUseStrict(statements);
    return mergeLexicalEnvironment(statements, context.endLexicalEnvironment());
  }
  export function visitParameterList(
    nodes: Nodes,
    visitor: Visitor,
    context: TransformationContext,
    nodesVisitor?: <T extends Node>(nodes: Nodes<T>, visitor: Visitor, test?: (node: Node) => boolean, start?: number, count?: number) => Nodes<T>
  ): Nodes;
  export function visitParameterList(
    nodes: Nodes | undefined,
    visitor: Visitor,
    context: TransformationContext,
    nodesVisitor?: <T extends Node>(nodes: Nodes<T> | undefined, visitor: Visitor, test?: (node: Node) => boolean, start?: number, count?: number) => Nodes<T> | undefined
  ): Nodes | undefined;
  export function visitParameterList(nodes: Nodes | undefined, visitor: Visitor, context: TransformationContext, nodesVisitor = Nodes.visit) {
    let updated: Nodes | undefined;
    context.startLexicalEnvironment();
    if (nodes) {
      context.setLexicalEnvironmentFlags(LexicalEnvironmentFlags.InParameters, true);
      updated = nodesVisitor(nodes, visitor, isParameterDeclaration);
      if (context.getLexicalEnvironmentFlags() & LexicalEnvironmentFlags.VariablesHoistedInParameters) updated = addDefaultValueAssignmentsIfNeeded(updated, context);
      context.setLexicalEnvironmentFlags(LexicalEnvironmentFlags.InParameters, false);
    }
    context.suspendLexicalEnvironment();
    return updated;
  }
  function addDefaultValueAssignmentsIfNeeded(parameters: Nodes, context: TransformationContext) {
    let r: ParameterDeclaration[] | undefined;
    for (let i = 0; i < parameters.length; i++) {
      const parameter = parameters[i];
      const updated = addDefaultValueAssignmentIfNeeded(parameter, context);
      if (r || updated !== parameter) {
        if (!r) r = parameters.slice(0, i);
        r[i] = updated;
      }
    }
    if (r) return setTextRange(Nodes.create(r, parameters.trailingComma), parameters);
    return parameters;
  }
  function addDefaultValueAssignmentIfNeeded(parameter: ParameterDeclaration, context: TransformationContext) {
    return parameter.dot3Token
      ? parameter
      : Node.is.kind(BindingPattern, parameter.name)
      ? addDefaultValueAssignmentForBindingPattern(parameter, context)
      : parameter.initializer
      ? addDefaultValueAssignmentForInitializer(parameter, parameter.name, parameter.initializer, context)
      : parameter;
  }
  function addDefaultValueAssignmentForBindingPattern(parameter: ParameterDeclaration, context: TransformationContext) {
    context.addInitializationStatement(
      createVariableStatement(
        undefined,
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
    return updateParameter(parameter, parameter.decorators, parameter.modifiers, parameter.dot3Token, getGeneratedNameForNode(parameter), parameter.questionToken, parameter.type, undefined);
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
                      setEmitFlags(initializer, EmitFlags.NoSourceMap | Node.get.emitFlags(initializer) | EmitFlags.NoComments)
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
    return updateParameter(parameter, parameter.decorators, parameter.modifiers, parameter.dot3Token, parameter.name, parameter.questionToken, parameter.type, undefined);
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
  export function visitEachChild<T extends Node>(node: T | undefined, visitor: Visitor, context: TransformationContext, nodesVisitor?: typeof Nodes.visit, tokenVisitor?: Visitor): T | undefined;
  export function visitEachChild(node: Node | undefined, visitor: Visitor, context: TransformationContext, nodesVisitor = Nodes.visit, tokenVisitor?: Visitor): Node | undefined {
    if (!node) return;
    const k = node.kind;
    if ((k > Syntax.FirstToken && k <= Syntax.LastToken) || k === Syntax.ThisType) return node;
    const n = node as NodeTypes;
    switch (n.kind) {
      case Syntax.Identifier:
        return updateIdentifier(n, nodesVisitor(n.typeArguments, visitor, isTypeNodeOrTypeParameterDeclaration));
      case Syntax.QualifiedName:
        return QualifiedName.update(n, visitNode(n.left, visitor, isEntityName), visitNode(n.right, visitor, isIdentifier));
      case Syntax.ComputedPropertyName:
        return ComputedPropertyName.update(n, visitNode(n.expression, visitor, isExpression));
      case Syntax.TypeParameter:
        return updateTypeParameterDeclaration(n, visitNode(n.name, visitor, isIdentifier), visitNode(n.constraint, visitor, isTypeNode), visitNode(n.default, visitor, isTypeNode));
      case Syntax.Parameter:
        return updateParameter(
          n,
          nodesVisitor(n.decorators, visitor, isDecorator),
          nodesVisitor(n.modifiers, visitor, isModifier),
          visitNode(n.dot3Token, tokenVisitor, isToken),
          visitNode(n.name, visitor, isBindingName),
          visitNode(n.questionToken, tokenVisitor, isToken),
          visitNode(n.type, visitor, isTypeNode),
          visitNode(n.initializer, visitor, isExpression)
        );
      case Syntax.Decorator:
        return updateDecorator(n, visitNode(n.expression, visitor, isExpression));
      case Syntax.PropertySignature:
        return PropertySignature.update(
          n,
          nodesVisitor(n.modifiers, visitor, isToken),
          visitNode(n.name, visitor, isPropertyName),
          visitNode(n.questionToken, tokenVisitor, isToken),
          visitNode(n.type, visitor, isTypeNode),
          visitNode(n.initializer, visitor, isExpression)
        );
      case Syntax.PropertyDeclaration:
        return PropertyDeclaration.update(
          n,
          nodesVisitor(n.decorators, visitor, isDecorator),
          nodesVisitor(n.modifiers, visitor, isModifier),
          visitNode(n.name, visitor, isPropertyName),
          visitNode(n.questionToken || n.exclamationToken, tokenVisitor, isToken),
          visitNode(n.type, visitor, isTypeNode),
          visitNode(n.initializer, visitor, isExpression)
        );
      case Syntax.MethodSignature:
        return MethodSignature.update(
          n,
          nodesVisitor(n.typeParameters, visitor, isTypeParameterDeclaration),
          nodesVisitor(n.parameters, visitor, isParameterDeclaration),
          visitNode(n.type, visitor, isTypeNode),
          visitNode(n.name, visitor, isPropertyName),
          visitNode(n.questionToken, tokenVisitor, isToken)
        );
      case Syntax.MethodDeclaration:
        return MethodDeclaration.update(
          n,
          nodesVisitor(n.decorators, visitor, isDecorator),
          nodesVisitor(n.modifiers, visitor, isModifier),
          visitNode(n.asteriskToken, tokenVisitor, isToken),
          visitNode(n.name, visitor, isPropertyName),
          visitNode(n.questionToken, tokenVisitor, isToken),
          nodesVisitor(n.typeParameters, visitor, isTypeParameterDeclaration),
          visitParameterList(n.parameters, visitor, context, nodesVisitor),
          visitNode(n.type, visitor, isTypeNode),
          visitFunctionBody(n.body!, visitor, context)
        );
      case Syntax.Constructor:
        return ConstructorDeclaration.update(
          n,
          nodesVisitor(n.decorators, visitor, isDecorator),
          nodesVisitor(n.modifiers, visitor, isModifier),
          visitParameterList(n.parameters, visitor, context, nodesVisitor),
          visitFunctionBody(n.body!, visitor, context)
        );
      case Syntax.GetAccessor:
        return GetAccessorDeclaration.update(
          n,
          nodesVisitor(n.decorators, visitor, isDecorator),
          nodesVisitor(n.modifiers, visitor, isModifier),
          visitNode(n.name, visitor, isPropertyName),
          visitParameterList(n.parameters, visitor, context, nodesVisitor),
          visitNode(n.type, visitor, isTypeNode),
          visitFunctionBody(n.body!, visitor, context)
        );
      case Syntax.SetAccessor:
        return SetAccessorDeclaration.update(
          n,
          nodesVisitor(n.decorators, visitor, isDecorator),
          nodesVisitor(n.modifiers, visitor, isModifier),
          visitNode(n.name, visitor, isPropertyName),
          visitParameterList(n.parameters, visitor, context, nodesVisitor),
          visitFunctionBody(n.body!, visitor, context)
        );
      case Syntax.CallSignature:
        return CallSignatureDeclaration.update(
          n,
          nodesVisitor(n.typeParameters, visitor, isTypeParameterDeclaration),
          nodesVisitor(n.parameters, visitor, isParameterDeclaration),
          visitNode(n.type, visitor, isTypeNode)
        );
      case Syntax.ConstructSignature:
        return ConstructSignatureDeclaration.update(
          n,
          nodesVisitor(n.typeParameters, visitor, isTypeParameterDeclaration),
          nodesVisitor(n.parameters, visitor, isParameterDeclaration),
          visitNode(n.type, visitor, isTypeNode)
        );
      case Syntax.IndexSignature:
        return IndexSignatureDeclaration.update(
          n,
          nodesVisitor(n.decorators, visitor, isDecorator),
          nodesVisitor(n.modifiers, visitor, isModifier),
          nodesVisitor(n.parameters, visitor, isParameterDeclaration),
          visitNode(n.type, visitor, isTypeNode)
        );
      case Syntax.TypePredicate:
        return TypePredicateNode.updateWithModifier(n, visitNode(n.assertsModifier, visitor), visitNode(n.parameterName, visitor), visitNode(n.type, visitor, isTypeNode));
      case Syntax.TypeReference:
        return TypeReferenceNode.update(n, visitNode(n.typeName, visitor, isEntityName), nodesVisitor(n.typeArguments, visitor, isTypeNode));
      case Syntax.FunctionType:
        return FunctionTypeNode.update(
          n,
          nodesVisitor(n.typeParameters, visitor, isTypeParameterDeclaration),
          nodesVisitor(n.parameters, visitor, isParameterDeclaration),
          visitNode(n.type, visitor, isTypeNode)
        );
      case Syntax.ConstructorType:
        return ConstructorDeclaration.updateTypeNode(
          n,
          nodesVisitor(n.typeParameters, visitor, isTypeParameterDeclaration),
          nodesVisitor(n.parameters, visitor, isParameterDeclaration),
          visitNode(n.type, visitor, isTypeNode)
        );
      case Syntax.TypeQuery:
        return TypeQueryNode.update(n, visitNode(n.exprName, visitor, isEntityName));
      case Syntax.TypeLiteral:
        return TypeLiteralNode.update(n, nodesVisitor(n.members, visitor, isTypeElement));
      case Syntax.ArrayType:
        return ArrayTypeNode.update(n, visitNode(n.elementType, visitor, isTypeNode));
      case Syntax.TupleType:
        return TupleTypeNode.update(n, nodesVisitor(n.elements, visitor, isTypeNode));
      case Syntax.OptionalType:
        return OptionalTypeNode.update(n, visitNode(n.type, visitor, isTypeNode));
      case Syntax.RestType:
        return RestTypeNode.update(n, visitNode(n.type, visitor, isTypeNode));
      case Syntax.UnionType:
        return UnionTypeNode.update(n, nodesVisitor(n.types, visitor, isTypeNode));
      case Syntax.IntersectionType:
        return IntersectionTypeNode.update(n, nodesVisitor(n.types, visitor, isTypeNode));
      case Syntax.ConditionalType:
        return ConditionalTypeNode.update(
          n,
          visitNode(n.checkType, visitor, isTypeNode),
          visitNode(n.extendsType, visitor, isTypeNode),
          visitNode(n.trueType, visitor, isTypeNode),
          visitNode(n.falseType, visitor, isTypeNode)
        );
      case Syntax.InferType:
        return InferTypeNode.update(n, visitNode(n.typeParameter, visitor, isTypeParameterDeclaration));
      case Syntax.ImportType:
        return ImportTypeNode.update(n, visitNode(n.argument, visitor, isTypeNode), visitNode(n.qualifier, visitor, isEntityName), Nodes.visit(n.typeArguments, visitor, isTypeNode), n.isTypeOf);
      case Syntax.NamedTupleMember:
        return NamedTupleMember.update(
          n,
          visitNode(n.dot3Token, visitor, isToken),
          visitNode(n.name, visitor, isIdentifier),
          visitNode(n.questionToken, visitor, isToken),
          visitNode(n.type, visitor, isTypeNode)
        );
      case Syntax.ParenthesizedType:
        return ParenthesizedTypeNode.update(n, visitNode(n.type, visitor, isTypeNode));
      case Syntax.TypeOperator:
        return TypeOperatorNode.update(n, visitNode(n.type, visitor, isTypeNode));
      case Syntax.IndexedAccessType:
        return IndexedAccessTypeNode.update(n, visitNode(n.objectType, visitor, isTypeNode), visitNode(n.indexType, visitor, isTypeNode));
      case Syntax.MappedType:
        return MappedTypeNode.update(
          n,
          visitNode(n.readonlyToken, tokenVisitor, isToken),
          visitNode(n.typeParameter, visitor, isTypeParameterDeclaration),
          visitNode(n.questionToken, tokenVisitor, isToken),
          visitNode(n.type, visitor, isTypeNode)
        );
      case Syntax.LiteralType:
        return LiteralTypeNode.update(n, visitNode(n.literal, visitor, isExpression));
      case Syntax.ObjectBindingPattern:
        return ObjectBindingPattern.update(n, nodesVisitor(n.elements, visitor, BindingElement.kind));
      case Syntax.ArrayBindingPattern:
        return ArrayBindingPattern.update(n, nodesVisitor(n.elements, visitor, isArrayBindingElement));
      case Syntax.BindingElement:
        return BindingElement.update(
          n,
          visitNode(n.dot3Token, tokenVisitor, isToken),
          visitNode(n.propertyName, visitor, isPropertyName),
          visitNode(n.name, visitor, isBindingName),
          visitNode(n.initializer, visitor, isExpression)
        );
      case Syntax.ArrayLiteralExpression:
        return updateArrayLiteral(n, nodesVisitor(n.elements, visitor, isExpression));
      case Syntax.ObjectLiteralExpression:
        return updateObjectLiteral(n, nodesVisitor(n.properties, visitor, isObjectLiteralElementLike));
      case Syntax.PropertyAccessExpression:
        if (node.flags & NodeFlags.OptionalChain) {
          return updatePropertyAccessChain(n, visitNode(n.expression, visitor, isExpression), visitNode(n.questionDotToken, tokenVisitor, isToken), visitNode(n.name, visitor, isIdentifier));
        }
        return updatePropertyAccess(n, visitNode(n.expression, visitor, isExpression), visitNode(n.name, visitor, isIdentifierOrPrivateIdentifier));
      case Syntax.ElementAccessExpression:
        if (node.flags & NodeFlags.OptionalChain) {
          return updateElementAccessChain(
            n,
            visitNode(n.expression, visitor, isExpression),
            visitNode(n.questionDotToken, tokenVisitor, isToken),
            visitNode(n.argumentExpression, visitor, isExpression)
          );
        }
        return updateElementAccess(n, visitNode(n.expression, visitor, isExpression), visitNode(n.argumentExpression, visitor, isExpression));
      case Syntax.CallExpression:
        if (node.flags & NodeFlags.OptionalChain) {
          return updateCallChain(
            n,
            visitNode(n.expression, visitor, isExpression),
            visitNode(n.questionDotToken, tokenVisitor, isToken),
            nodesVisitor(n.typeArguments, visitor, isTypeNode),
            nodesVisitor(n.arguments, visitor, isExpression)
          );
        }
        return updateCall(n, visitNode(n.expression, visitor, isExpression), nodesVisitor(n.typeArguments, visitor, isTypeNode), nodesVisitor(n.arguments, visitor, isExpression));
      case Syntax.NewExpression:
        return updateNew(n, visitNode(n.expression, visitor, isExpression), nodesVisitor(n.typeArguments, visitor, isTypeNode), nodesVisitor(n.arguments, visitor, isExpression));
      case Syntax.TaggedTemplateExpression:
        return updateTaggedTemplate(n, visitNode(n.tag, visitor, isExpression), Nodes.visit(n.typeArguments, visitor, isExpression), visitNode(n.template, visitor, isTemplateLiteral));
      case Syntax.TypeAssertionExpression:
        return updateTypeAssertion(n, visitNode(n.type, visitor, isTypeNode), visitNode(n.expression, visitor, isExpression));
      case Syntax.ParenthesizedExpression:
        return updateParen(n, visitNode(n.expression, visitor, isExpression));
      case Syntax.FunctionExpression:
        return updateFunctionExpression(
          n,
          nodesVisitor(n.modifiers, visitor, isModifier),
          visitNode(n.asteriskToken, tokenVisitor, isToken),
          visitNode(n.name, visitor, isIdentifier),
          nodesVisitor(n.typeParameters, visitor, isTypeParameterDeclaration),
          visitParameterList(n.parameters, visitor, context, nodesVisitor),
          visitNode(n.type, visitor, isTypeNode),
          visitFunctionBody(n.body, visitor, context)
        );
      case Syntax.ArrowFunction:
        return updateArrowFunction(
          n,
          nodesVisitor(n.modifiers, visitor, isModifier),
          nodesVisitor(n.typeParameters, visitor, isTypeParameterDeclaration),
          visitParameterList(n.parameters, visitor, context, nodesVisitor),
          visitNode(n.type, visitor, isTypeNode),
          visitNode(n.equalsGreaterThanToken, tokenVisitor, isToken),
          visitFunctionBody(n.body, visitor, context)
        );
      case Syntax.DeleteExpression:
        return updateDelete(n, visitNode(n.expression, visitor, isExpression));
      case Syntax.TypeOfExpression:
        return updateTypeOf(n, visitNode(n.expression, visitor, isExpression));
      case Syntax.VoidExpression:
        return updateVoid(n, visitNode(n.expression, visitor, isExpression));
      case Syntax.AwaitExpression:
        return updateAwait(n, visitNode(n.expression, visitor, isExpression));
      case Syntax.PrefixUnaryExpression:
        return updatePrefix(n, visitNode(n.operand, visitor, isExpression));
      case Syntax.PostfixUnaryExpression:
        return updatePostfix(n, visitNode(n.operand, visitor, isExpression));
      case Syntax.BinaryExpression:
        return updateBinary(n, visitNode(n.left, visitor, isExpression), visitNode(n.right, visitor, isExpression), visitNode(n.operatorToken, tokenVisitor, isToken));
      case Syntax.ConditionalExpression:
        return updateConditional(
          n,
          visitNode(n.condition, visitor, isExpression),
          visitNode(n.questionToken, tokenVisitor, isToken),
          visitNode(n.whenTrue, visitor, isExpression),
          visitNode(n.colonToken, tokenVisitor, isToken),
          visitNode(n.whenFalse, visitor, isExpression)
        );
      case Syntax.TemplateExpression:
        return updateTemplateExpression(n, visitNode(n.head, visitor, TemplateHead.kind), nodesVisitor(n.templateSpans, visitor, isTemplateSpan));
      case Syntax.YieldExpression:
        return updateYield(n, visitNode(n.asteriskToken, tokenVisitor, isToken), visitNode(n.expression, visitor, isExpression));
      case Syntax.SpreadElement:
        return updateSpread(n, visitNode(n.expression, visitor, isExpression));
      case Syntax.ClassExpression:
        return updateClassExpression(
          n,
          nodesVisitor(n.modifiers, visitor, isModifier),
          visitNode(n.name, visitor, isIdentifier),
          nodesVisitor(n.typeParameters, visitor, isTypeParameterDeclaration),
          nodesVisitor(n.heritageClauses, visitor, isHeritageClause),
          nodesVisitor(n.members, visitor, isClassElement)
        );
      case Syntax.ExpressionWithTypeArguments:
        return updateExpressionWithTypeArguments(n, nodesVisitor(n.typeArguments, visitor, isTypeNode), visitNode(n.expression, visitor, isExpression));
      case Syntax.AsExpression:
        return updateAsExpression(n, visitNode(n.expression, visitor, isExpression), visitNode(n.type, visitor, isTypeNode));
      case Syntax.NonNullExpression:
        return updateNonNullExpression(n, visitNode(n.expression, visitor, isExpression));
      case Syntax.MetaProperty:
        return updateMetaProperty(n, visitNode(n.name, visitor, isIdentifier));
      // Misc
      case Syntax.TemplateSpan:
        return updateTemplateSpan(n, visitNode(n.expression, visitor, isExpression), visitNode(n.literal, visitor, TemplateMiddle.kindOrTemplateTail));
      // Element
      case Syntax.Block:
        return updateBlock(n, nodesVisitor(n.statements, visitor, isStatement));
      case Syntax.VariableStatement:
        return updateVariableStatement(n, nodesVisitor(n.modifiers, visitor, isModifier), visitNode(n.declarationList, visitor, isVariableDeclarationList));
      case Syntax.ExpressionStatement:
        return updateExpressionStatement(n, visitNode(n.expression, visitor, isExpression));
      case Syntax.IfStatement:
        return updateIf(
          n,
          visitNode(n.expression, visitor, isExpression),
          visitNode(n.thenStatement, visitor, isStatement, liftToBlock),
          visitNode(n.elseStatement, visitor, isStatement, liftToBlock)
        );
      case Syntax.DoStatement:
        return updateDo(n, visitNode(n.statement, visitor, isStatement, liftToBlock), visitNode(n.expression, visitor, isExpression));
      case Syntax.WhileStatement:
        return updateWhile(n, visitNode(n.expression, visitor, isExpression), visitNode(n.statement, visitor, isStatement, liftToBlock));
      case Syntax.ForStatement:
        return updateFor(
          n,
          visitNode(n.initializer, visitor, isForInitializer),
          visitNode(n.condition, visitor, isExpression),
          visitNode(n.incrementor, visitor, isExpression),
          visitNode(n.statement, visitor, isStatement, liftToBlock)
        );
      case Syntax.ForInStatement:
        return updateForIn(n, visitNode(n.initializer, visitor, isForInitializer), visitNode(n.expression, visitor, isExpression), visitNode(n.statement, visitor, isStatement, liftToBlock));
      case Syntax.ForOfStatement:
        return updateForOf(
          n,
          visitNode(n.awaitModifier, tokenVisitor, isToken),
          visitNode(n.initializer, visitor, isForInitializer),
          visitNode(n.expression, visitor, isExpression),
          visitNode(n.statement, visitor, isStatement, liftToBlock)
        );
      case Syntax.ContinueStatement:
        return updateContinue(n, visitNode(n.label, visitor, isIdentifier));
      case Syntax.BreakStatement:
        return updateBreak(n, visitNode(n.label, visitor, isIdentifier));
      case Syntax.ReturnStatement:
        return updateReturn(n, visitNode(n.expression, visitor, isExpression));
      case Syntax.WithStatement:
        return updateWith(n, visitNode(n.expression, visitor, isExpression), visitNode(n.statement, visitor, isStatement, liftToBlock));
      case Syntax.SwitchStatement:
        return updateSwitch(n, visitNode(n.expression, visitor, isExpression), visitNode(n.caseBlock, visitor, isCaseBlock));
      case Syntax.LabeledStatement:
        return updateLabel(n, visitNode(n.label, visitor, isIdentifier), visitNode(n.statement, visitor, isStatement, liftToBlock));
      case Syntax.ThrowStatement:
        return updateThrow(n, visitNode(n.expression, visitor, isExpression));
      case Syntax.TryStatement:
        return updateTry(n, visitNode(n.tryBlock, visitor, isBlock), visitNode(n.catchClause, visitor, isCatchClause), visitNode(n.finallyBlock, visitor, isBlock));
      case Syntax.VariableDeclaration:
        return updateTypeScriptVariableDeclaration(
          n,
          visitNode(n.name, visitor, isBindingName),
          visitNode(n.exclamationToken, tokenVisitor, isToken),
          visitNode(n.type, visitor, isTypeNode),
          visitNode(n.initializer, visitor, isExpression)
        );
      case Syntax.VariableDeclarationList:
        return updateVariableDeclarationList(n, nodesVisitor(n.declarations, visitor, isVariableDeclaration));
      case Syntax.FunctionDeclaration:
        return updateFunctionDeclaration(
          n,
          nodesVisitor(n.decorators, visitor, isDecorator),
          nodesVisitor(n.modifiers, visitor, isModifier),
          visitNode(n.asteriskToken, tokenVisitor, isToken),
          visitNode(n.name, visitor, isIdentifier),
          nodesVisitor(n.typeParameters, visitor, isTypeParameterDeclaration),
          visitParameterList(n.parameters, visitor, context, nodesVisitor),
          visitNode(n.type, visitor, isTypeNode),
          visitFunctionBody(n.body, visitor, context)
        );
      case Syntax.ClassDeclaration:
        return updateClassDeclaration(
          n,
          nodesVisitor(n.decorators, visitor, isDecorator),
          nodesVisitor(n.modifiers, visitor, isModifier),
          visitNode(n.name, visitor, isIdentifier),
          nodesVisitor(n.typeParameters, visitor, isTypeParameterDeclaration),
          nodesVisitor(n.heritageClauses, visitor, isHeritageClause),
          nodesVisitor(n.members, visitor, isClassElement)
        );
      case Syntax.InterfaceDeclaration:
        return updateInterfaceDeclaration(
          n,
          nodesVisitor(n.decorators, visitor, isDecorator),
          nodesVisitor(n.modifiers, visitor, isModifier),
          visitNode(n.name, visitor, isIdentifier),
          nodesVisitor(n.typeParameters, visitor, isTypeParameterDeclaration),
          nodesVisitor(n.heritageClauses, visitor, isHeritageClause),
          nodesVisitor(n.members, visitor, isTypeElement)
        );
      case Syntax.TypeAliasDeclaration:
        return updateTypeAliasDeclaration(
          n,
          nodesVisitor(n.decorators, visitor, isDecorator),
          nodesVisitor(n.modifiers, visitor, isModifier),
          visitNode(n.name, visitor, isIdentifier),
          nodesVisitor(n.typeParameters, visitor, isTypeParameterDeclaration),
          visitNode(n.type, visitor, isTypeNode)
        );
      case Syntax.EnumDeclaration:
        return updateEnumDeclaration(
          n,
          nodesVisitor(n.decorators, visitor, isDecorator),
          nodesVisitor(n.modifiers, visitor, isModifier),
          visitNode(n.name, visitor, isIdentifier),
          nodesVisitor(n.members, visitor, isEnumMember)
        );
      case Syntax.ModuleDeclaration:
        return updateModuleDeclaration(
          n,
          nodesVisitor(n.decorators, visitor, isDecorator),
          nodesVisitor(n.modifiers, visitor, isModifier),
          visitNode(n.name, visitor, isIdentifier),
          visitNode(n.body, visitor, isModuleBody)
        );
      case Syntax.ModuleBlock:
        return updateModuleBlock(n, nodesVisitor(n.statements, visitor, isStatement));
      case Syntax.CaseBlock:
        return updateCaseBlock(n, nodesVisitor(n.clauses, visitor, isCaseOrDefaultClause));
      case Syntax.NamespaceExportDeclaration:
        return updateNamespaceExportDeclaration(n, visitNode(n.name, visitor, isIdentifier));
      case Syntax.ImportEqualsDeclaration:
        return updateImportEqualsDeclaration(
          n,
          nodesVisitor(n.decorators, visitor, isDecorator),
          nodesVisitor(n.modifiers, visitor, isModifier),
          visitNode(n.name, visitor, isIdentifier),
          visitNode(n.moduleReference, visitor, isModuleReference)
        );
      case Syntax.ImportDeclaration:
        return updateImportDeclaration(
          n,
          nodesVisitor(n.decorators, visitor, isDecorator),
          nodesVisitor(n.modifiers, visitor, isModifier),
          visitNode(n.importClause, visitor, isImportClause),
          visitNode(n.moduleSpecifier, visitor, isExpression)
        );
      case Syntax.ImportClause:
        return updateImportClause(n, visitNode(n.name, visitor, isIdentifier), visitNode(n.namedBindings, visitor, isNamedImportBindings), (node as ImportClause).isTypeOnly);
      case Syntax.NamespaceImport:
        return updateNamespaceImport(n, visitNode(n.name, visitor, isIdentifier));
      case Syntax.NamespaceExport:
        return updateNamespaceExport(n, visitNode(n.name, visitor, isIdentifier));
      case Syntax.NamedImports:
        return updateNamedImports(n, nodesVisitor(n.elements, visitor, isImportSpecifier));
      case Syntax.ImportSpecifier:
        return updateImportSpecifier(n, visitNode(n.propertyName, visitor, isIdentifier), visitNode(n.name, visitor, isIdentifier));
      case Syntax.ExportAssignment:
        return updateExportAssignment(n, nodesVisitor(n.decorators, visitor, isDecorator), nodesVisitor(n.modifiers, visitor, isModifier), visitNode(n.expression, visitor, isExpression));
      case Syntax.ExportDeclaration:
        return updateExportDeclaration(
          n,
          nodesVisitor(n.decorators, visitor, isDecorator),
          nodesVisitor(n.modifiers, visitor, isModifier),
          visitNode(n.exportClause, visitor, isNamedExportBindings),
          visitNode(n.moduleSpecifier, visitor, isExpression),
          (node as ExportDeclaration).isTypeOnly
        );
      case Syntax.NamedExports:
        return updateNamedExports(n, nodesVisitor(n.elements, visitor, isExportSpecifier));
      case Syntax.ExportSpecifier:
        return updateExportSpecifier(n, visitNode(n.propertyName, visitor, isIdentifier), visitNode(n.name, visitor, isIdentifier));
      case Syntax.ExternalModuleReference:
        return updateExternalModuleReference(n, visitNode(n.expression, visitor, isExpression));
      case Syntax.JsxElement:
        return updateJsxElement(n, visitNode(n.openingElement, visitor, isJsxOpeningElement), nodesVisitor(n.children, visitor, isJsxChild), visitNode(n.closingElement, visitor, isJsxClosingElement));
      case Syntax.JsxSelfClosingElement:
        return updateJsxSelfClosingElement(
          n,
          visitNode(n.tagName, visitor, isJsxTagNameExpression),
          nodesVisitor(n.typeArguments, visitor, isTypeNode),
          visitNode(n.attributes, visitor, isJsxAttributes)
        );
      case Syntax.JsxOpeningElement:
        return updateJsxOpeningElement(n, visitNode(n.tagName, visitor, isJsxTagNameExpression), nodesVisitor(n.typeArguments, visitor, isTypeNode), visitNode(n.attributes, visitor, isJsxAttributes));
      case Syntax.JsxClosingElement:
        return updateJsxClosingElement(n, visitNode(n.tagName, visitor, isJsxTagNameExpression));
      case Syntax.JsxFragment:
        return updateJsxFragment(
          n,
          visitNode(n.openingFragment, visitor, isJsxOpeningFragment),
          nodesVisitor(n.children, visitor, isJsxChild),
          visitNode(n.closingFragment, visitor, isJsxClosingFragment)
        );
      case Syntax.JsxAttribute:
        return updateJsxAttribute(n, visitNode(n.name, visitor, isIdentifier), visitNode(n.initializer, visitor, StringLiteral.orJsxExpressionKind));
      case Syntax.JsxAttributes:
        return updateJsxAttributes(n, nodesVisitor(n.properties, visitor, isJsxAttributeLike));
      case Syntax.JsxSpreadAttribute:
        return updateJsxSpreadAttribute(n, visitNode(n.expression, visitor, isExpression));
      case Syntax.JsxExpression:
        return updateJsxExpression(n, visitNode(n.expression, visitor, isExpression));
      case Syntax.CaseClause:
        return updateCaseClause(n, visitNode(n.expression, visitor, isExpression), nodesVisitor(n.statements, visitor, isStatement));
      case Syntax.DefaultClause:
        return updateDefaultClause(n, nodesVisitor(n.statements, visitor, isStatement));
      case Syntax.HeritageClause:
        return updateHeritageClause(n, nodesVisitor(n.types, visitor, isExpressionWithTypeArguments));
      case Syntax.CatchClause:
        return updateCatchClause(n, visitNode(n.variableDeclaration, visitor, isVariableDeclaration), visitNode(n.block, visitor, isBlock));
      case Syntax.PropertyAssignment:
        return updatePropertyAssignment(n, visitNode(n.name, visitor, isPropertyName), visitNode(n.initializer, visitor, isExpression));
      case Syntax.ShorthandPropertyAssignment:
        return updateShorthandPropertyAssignment(n, visitNode(n.name, visitor, isIdentifier), visitNode(n.objectAssignmentInitializer, visitor, isExpression));
      case Syntax.SpreadAssignment:
        return updateSpreadAssignment(n, visitNode(n.expression, visitor, isExpression));
      case Syntax.EnumMember:
        return updateEnumMember(n, visitNode(n.name, visitor, isPropertyName), visitNode(n.initializer, visitor, isExpression));
      case Syntax.SourceFile:
        return qp_updateSourceNode(n, visitLexicalEnvironment(n.statements, visitor, context));
      case Syntax.PartiallyEmittedExpression:
        return updatePartiallyEmittedExpression(n, visitNode(n.expression, visitor, isExpression));
      case Syntax.CommaListExpression:
        return updateCommaList(n, nodesVisitor(n.elements, visitor, isExpression));
      default:
        return node;
    }
  }
  function extractSingleNode(nodes: readonly Node[]): Node | undefined {
    qa.assert(nodes.length <= 1, 'Too many nodes written to output.');
    return qa.singleOrUndefined(nodes);
  }
  function reduceNode<T>(node: Node | undefined, f: (memo: T, node: Node) => T, initial: T) {
    return node ? f(initial, node) : initial;
  }
  function reduceNodes<T>(nodes: Nodes<Node> | undefined, f: (memo: T, nodes: Nodes<Node>) => T, initial: T) {
    return nodes ? f(initial, nodes) : initial;
  }
  export function reduceEachChild<T>(node: Node | undefined, initial: T, cb: (memo: T, node: Node) => T, cbs?: (memo: T, ns: Nodes<Node>) => T): T {
    if (node === undefined) return initial;
    const reduceNodes: (ns: Nodes<Node> | undefined, f: ((memo: T, n: Node) => T) | ((memo: T, ns: Nodes<Node>) => T), initial: T) => T = cbs ? reduceNodes : reduceLeft;
    cbs = cbs || cb;
    const kind = node.kind;
    if (kind > Syntax.FirstToken && kind <= Syntax.LastToken) return initial;
    if (kind >= Syntax.TypePredicate && kind <= Syntax.LiteralType) return initial;
    let r = initial;
    const n = node as NodeTypes;
    switch (n.kind) {
      case Syntax.SemicolonClassElement:
      case Syntax.EmptyStatement:
      case Syntax.OmittedExpression:
      case Syntax.DebuggerStatement:
      case Syntax.NotEmittedStatement:
        break;
      case Syntax.QualifiedName:
        r = reduceNode(n.left, cb, r);
        r = reduceNode(n.right, cb, r);
        break;
      case Syntax.ComputedPropertyName:
        r = reduceNode(n.expression, cb, r);
        break;
      case Syntax.Parameter:
        r = reduceNodes(n.decorators, cbs, r);
        r = reduceNodes(n.modifiers, cbs, r);
        r = reduceNode(n.name, cb, r);
        r = reduceNode(n.type, cb, r);
        r = reduceNode(n.initializer, cb, r);
        break;
      case Syntax.Decorator:
        r = reduceNode(n.expression, cb, r);
        break;
      case Syntax.PropertySignature:
        r = reduceNodes(n.modifiers, cbs, r);
        r = reduceNode(n.name, cb, r);
        r = reduceNode(n.questionToken, cb, r);
        r = reduceNode(n.type, cb, r);
        r = reduceNode(n.initializer, cb, r);
        break;
      case Syntax.PropertyDeclaration:
        r = reduceNodes(n.decorators, cbs, r);
        r = reduceNodes(n.modifiers, cbs, r);
        r = reduceNode(n.name, cb, r);
        r = reduceNode(n.type, cb, r);
        r = reduceNode(n.initializer, cb, r);
        break;
      case Syntax.MethodDeclaration:
        r = reduceNodes(n.decorators, cbs, r);
        r = reduceNodes(n.modifiers, cbs, r);
        r = reduceNode(n.name, cb, r);
        r = reduceNodes(n.typeParameters, cbs, r);
        r = reduceNodes(n.parameters, cbs, r);
        r = reduceNode(n.type, cb, r);
        r = reduceNode(n.body, cb, r);
        break;
      case Syntax.Constructor:
        r = reduceNodes(n.modifiers, cbs, r);
        r = reduceNodes(n.parameters, cbs, r);
        r = reduceNode(n.body, cb, r);
        break;
      case Syntax.GetAccessor:
        r = reduceNodes(n.decorators, cbs, r);
        r = reduceNodes(n.modifiers, cbs, r);
        r = reduceNode(n.name, cb, r);
        r = reduceNodes(n.parameters, cbs, r);
        r = reduceNode(n.type, cb, r);
        r = reduceNode(n.body, cb, r);
        break;
      case Syntax.SetAccessor:
        r = reduceNodes(n.decorators, cbs, r);
        r = reduceNodes(n.modifiers, cbs, r);
        r = reduceNode(n.name, cb, r);
        r = reduceNodes(n.parameters, cbs, r);
        r = reduceNode(n.body, cb, r);
        break;
      case Syntax.ObjectBindingPattern:
      case Syntax.ArrayBindingPattern:
        r = reduceNodes(n.elements, cbs, r);
        break;
      case Syntax.BindingElement:
        r = reduceNode(n.propertyName, cb, r);
        r = reduceNode(n.name, cb, r);
        r = reduceNode(n.initializer, cb, r);
        break;
      case Syntax.ArrayLiteralExpression:
        r = reduceNodes(n.elements, cbs, r);
        break;
      case Syntax.ObjectLiteralExpression:
        r = reduceNodes(n.properties, cbs, r);
        break;
      case Syntax.PropertyAccessExpression:
        r = reduceNode(n.expression, cb, r);
        r = reduceNode(n.name, cb, r);
        break;
      case Syntax.ElementAccessExpression:
        r = reduceNode(n.expression, cb, r);
        r = reduceNode(n.argumentExpression, cb, r);
        break;
      case Syntax.CallExpression:
        r = reduceNode(n.expression, cb, r);
        r = reduceNodes(n.typeArguments, cbs, r);
        r = reduceNodes(n.arguments, cbs, r);
        break;
      case Syntax.NewExpression:
        r = reduceNode(n.expression, cb, r);
        r = reduceNodes(n.typeArguments, cbs, r);
        r = reduceNodes(n.arguments, cbs, r);
        break;
      case Syntax.TaggedTemplateExpression:
        r = reduceNode(n.tag, cb, r);
        r = reduceNodes(n.typeArguments, cbs, r);
        r = reduceNode(n.template, cb, r);
        break;
      case Syntax.TypeAssertionExpression:
        r = reduceNode(n.type, cb, r);
        r = reduceNode(n.expression, cb, r);
        break;
      case Syntax.FunctionExpression:
        r = reduceNodes(n.modifiers, cbs, r);
        r = reduceNode(n.name, cb, r);
        r = reduceNodes(n.typeParameters, cbs, r);
        r = reduceNodes(n.parameters, cbs, r);
        r = reduceNode(n.type, cb, r);
        r = reduceNode(n.body, cb, r);
        break;
      case Syntax.ArrowFunction:
        r = reduceNodes(n.modifiers, cbs, r);
        r = reduceNodes(n.typeParameters, cbs, r);
        r = reduceNodes(n.parameters, cbs, r);
        r = reduceNode(n.type, cb, r);
        r = reduceNode(n.body, cb, r);
        break;
      case Syntax.ParenthesizedExpression:
      case Syntax.DeleteExpression:
      case Syntax.TypeOfExpression:
      case Syntax.VoidExpression:
      case Syntax.AwaitExpression:
      case Syntax.YieldExpression:
      case Syntax.SpreadElement:
      case Syntax.NonNullExpression:
        r = reduceNode(n.expression, cb, r);
        break;
      case Syntax.PrefixUnaryExpression:
      case Syntax.PostfixUnaryExpression:
        r = reduceNode(n.operand, cb, r);
        break;
      case Syntax.BinaryExpression:
        r = reduceNode(n.left, cb, r);
        r = reduceNode(n.right, cb, r);
        break;
      case Syntax.ConditionalExpression:
        r = reduceNode(n.condition, cb, r);
        r = reduceNode(n.whenTrue, cb, r);
        r = reduceNode(n.whenFalse, cb, r);
        break;
      case Syntax.TemplateExpression:
        r = reduceNode(n.head, cb, r);
        r = reduceNodes(n.templateSpans, cbs, r);
        break;
      case Syntax.ClassExpression:
        r = reduceNodes(n.modifiers, cbs, r);
        r = reduceNode(n.name, cb, r);
        r = reduceNodes(n.typeParameters, cbs, r);
        r = reduceNodes(n.heritageClauses, cbs, r);
        r = reduceNodes(n.members, cbs, r);
        break;
      case Syntax.ExpressionWithTypeArguments:
        r = reduceNode(n.expression, cb, r);
        r = reduceNodes(n.typeArguments, cbs, r);
        break;
      case Syntax.AsExpression:
        r = reduceNode(n.expression, cb, r);
        r = reduceNode(n.type, cb, r);
        break;
      case Syntax.TemplateSpan:
        r = reduceNode(n.expression, cb, r);
        r = reduceNode(n.literal, cb, r);
        break;
      case Syntax.Block:
        r = reduceNodes(n.statements, cbs, r);
        break;
      case Syntax.VariableStatement:
        r = reduceNodes(n.modifiers, cbs, r);
        r = reduceNode(n.declarationList, cb, r);
        break;
      case Syntax.ExpressionStatement:
        r = reduceNode(n.expression, cb, r);
        break;
      case Syntax.IfStatement:
        r = reduceNode(n.expression, cb, r);
        r = reduceNode(n.thenStatement, cb, r);
        r = reduceNode(n.elseStatement, cb, r);
        break;
      case Syntax.DoStatement:
        r = reduceNode(n.statement, cb, r);
        r = reduceNode(n.expression, cb, r);
        break;
      case Syntax.WhileStatement:
      case Syntax.WithStatement:
        r = reduceNode(n.expression, cb, r);
        r = reduceNode(n.statement, cb, r);
        break;
      case Syntax.ForStatement:
        r = reduceNode(n.initializer, cb, r);
        r = reduceNode(n.condition, cb, r);
        r = reduceNode(n.incrementor, cb, r);
        r = reduceNode(n.statement, cb, r);
        break;
      case Syntax.ForInStatement:
      case Syntax.ForOfStatement:
        r = reduceNode(n.initializer, cb, r);
        r = reduceNode(n.expression, cb, r);
        r = reduceNode(n.statement, cb, r);
        break;
      case Syntax.ReturnStatement:
      case Syntax.ThrowStatement:
        r = reduceNode(n.expression, cb, r);
        break;
      case Syntax.SwitchStatement:
        r = reduceNode(n.expression, cb, r);
        r = reduceNode(n.caseBlock, cb, r);
        break;
      case Syntax.LabeledStatement:
        r = reduceNode(n.label, cb, r);
        r = reduceNode(n.statement, cb, r);
        break;
      case Syntax.TryStatement:
        r = reduceNode(n.tryBlock, cb, r);
        r = reduceNode(n.catchClause, cb, r);
        r = reduceNode(n.finallyBlock, cb, r);
        break;
      case Syntax.VariableDeclaration:
        r = reduceNode(n.name, cb, r);
        r = reduceNode(n.type, cb, r);
        r = reduceNode(n.initializer, cb, r);
        break;
      case Syntax.VariableDeclarationList:
        r = reduceNodes(n.declarations, cbs, r);
        break;
      case Syntax.FunctionDeclaration:
        r = reduceNodes(n.decorators, cbs, r);
        r = reduceNodes(n.modifiers, cbs, r);
        r = reduceNode(n.name, cb, r);
        r = reduceNodes(n.typeParameters, cbs, r);
        r = reduceNodes(n.parameters, cbs, r);
        r = reduceNode(n.type, cb, r);
        r = reduceNode(n.body, cb, r);
        break;
      case Syntax.ClassDeclaration:
        r = reduceNodes(n.decorators, cbs, r);
        r = reduceNodes(n.modifiers, cbs, r);
        r = reduceNode(n.name, cb, r);
        r = reduceNodes(n.typeParameters, cbs, r);
        r = reduceNodes(n.heritageClauses, cbs, r);
        r = reduceNodes(n.members, cbs, r);
        break;
      case Syntax.EnumDeclaration:
        r = reduceNodes(n.decorators, cbs, r);
        r = reduceNodes(n.modifiers, cbs, r);
        r = reduceNode(n.name, cb, r);
        r = reduceNodes(n.members, cbs, r);
        break;
      case Syntax.ModuleDeclaration:
        r = reduceNodes(n.decorators, cbs, r);
        r = reduceNodes(n.modifiers, cbs, r);
        r = reduceNode(n.name, cb, r);
        r = reduceNode(n.body, cb, r);
        break;
      case Syntax.ModuleBlock:
        r = reduceNodes(n.statements, cbs, r);
        break;
      case Syntax.CaseBlock:
        r = reduceNodes(n.clauses, cbs, r);
        break;
      case Syntax.ImportEqualsDeclaration:
        r = reduceNodes(n.decorators, cbs, r);
        r = reduceNodes(n.modifiers, cbs, r);
        r = reduceNode(n.name, cb, r);
        r = reduceNode(n.moduleReference, cb, r);
        break;
      case Syntax.ImportDeclaration:
        r = reduceNodes(n.decorators, cbs, r);
        r = reduceNodes(n.modifiers, cbs, r);
        r = reduceNode(n.importClause, cb, r);
        r = reduceNode(n.moduleSpecifier, cb, r);
        break;
      case Syntax.ImportClause:
        r = reduceNode(n.name, cb, r);
        r = reduceNode(n.namedBindings, cb, r);
        break;
      case Syntax.NamespaceImport:
        r = reduceNode(n.name, cb, r);
        break;
      case Syntax.NamespaceExport:
        r = reduceNode(n.name, cb, r);
        break;
      case Syntax.NamedImports:
      case Syntax.NamedExports:
        r = reduceNodes(n.elements, cbs, r);
        break;
      case Syntax.ImportSpecifier:
      case Syntax.ExportSpecifier:
        r = reduceNode(n.propertyName, cb, r);
        r = reduceNode(n.name, cb, r);
        break;
      case Syntax.ExportAssignment:
        r = reduceLeft(n.decorators, cb, r);
        r = reduceLeft(n.modifiers, cb, r);
        r = reduceNode(n.expression, cb, r);
        break;
      case Syntax.ExportDeclaration:
        r = reduceLeft(n.decorators, cb, r);
        r = reduceLeft(n.modifiers, cb, r);
        r = reduceNode(n.exportClause, cb, r);
        r = reduceNode(n.moduleSpecifier, cb, r);
        break;
      case Syntax.ExternalModuleReference:
        r = reduceNode(n.expression, cb, r);
        break;
      case Syntax.JsxElement:
        r = reduceNode(n.openingElement, cb, r);
        r = reduceLeft(n.children, cb, r);
        r = reduceNode(n.closingElement, cb, r);
        break;
      case Syntax.JsxFragment:
        r = reduceNode(n.openingFragment, cb, r);
        r = reduceLeft(n.children, cb, r);
        r = reduceNode(n.closingFragment, cb, r);
        break;
      case Syntax.JsxSelfClosingElement:
      case Syntax.JsxOpeningElement:
        r = reduceNode(n.tagName, cb, r);
        r = reduceNodes(n.typeArguments, cb, r);
        r = reduceNode(n.attributes, cb, r);
        break;
      case Syntax.JsxAttributes:
        r = reduceNodes(n.properties, cbs, r);
        break;
      case Syntax.JsxClosingElement:
        r = reduceNode(n.tagName, cb, r);
        break;
      case Syntax.JsxAttribute:
        r = reduceNode(n.name, cb, r);
        r = reduceNode(n.initializer, cb, r);
        break;
      case Syntax.JsxSpreadAttribute:
        r = reduceNode(n.expression, cb, r);
        break;
      case Syntax.JsxExpression:
        r = reduceNode(n.expression, cb, r);
        break;
      case Syntax.CaseClause:
        r = reduceNode(n.expression, cb, r);
      case Syntax.DefaultClause:
        r = reduceNodes(n.statements, cbs, r);
        break;
      case Syntax.HeritageClause:
        r = reduceNodes(n.types, cbs, r);
        break;
      case Syntax.CatchClause:
        r = reduceNode(n.variableDeclaration, cb, r);
        r = reduceNode(n.block, cb, r);
        break;
      case Syntax.PropertyAssignment:
        r = reduceNode(n.name, cb, r);
        r = reduceNode(n.initializer, cb, r);
        break;
      case Syntax.ShorthandPropertyAssignment:
        r = reduceNode(n.name, cb, r);
        r = reduceNode(n.objectAssignmentInitializer, cb, r);
        break;
      case Syntax.SpreadAssignment:
        r = reduceNode(n.expression, cb, r);
        break;
      case Syntax.EnumMember:
        r = reduceNode(n.name, cb, r);
        r = reduceNode(n.initializer, cb, r);
        break;
      case Syntax.SourceFile:
        r = reduceNodes(n.statements, cbs, r);
        break;
      case Syntax.PartiallyEmittedExpression:
        r = reduceNode(n.expression, cb, r);
        break;
      case Syntax.CommaListExpression:
        r = reduceNodes(n.elements, cbs, r);
        break;
      default:
        break;
    }
    return r;
  }
  function findSpanEnd<T>(array: readonly T[], test: (value: T) => boolean, start: number) {
    let i = start;
    while (i < array.length && test(array[i])) {
      i++;
    }
    return i;
  }
  export function mergeLexicalEnvironment(statements: Nodes<Statement>, declarations: readonly Statement[] | undefined): Nodes<Statement>;
  export function mergeLexicalEnvironment(statements: Statement[], declarations: readonly Statement[] | undefined): Statement[];
  export function mergeLexicalEnvironment(statements: Statement[] | Nodes<Statement>, declarations: readonly Statement[] | undefined) {
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
    qa.assert(rightCustomPrologueEnd === declarations.length, 'Expected declarations to be valid standard or custom prologues');
    // splice prologues from the right into the left. We do this in reverse order
    // so that we don't need to recompute the index on the left when we insert items.
    const left = isNodes(statements) ? statements.slice() : statements;
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
    if (isNodes(statements)) {
      return setTextRange(Nodes.create(left, statements.trailingComma), statements);
    }
    return statements;
  }
  export function liftToBlock(nodes: readonly Node[]): Statement {
    qa.assert(every(nodes, isStatement), 'Cannot lift nodes to a Block.');
    return <Statement>qa.singleOrUndefined(nodes) || createBlock(<Nodes<Statement>>nodes);
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
  function aggregateTransformFlagsForNodes(nodes: Nodes<Node>): TransformFlags {
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
    if (hasSyntacticModifier(node, ModifierFlags.Ambient) || (Node.is.typeNode(node) && node.kind !== Syntax.ExpressionWithTypeArguments)) {
      return TransformFlags.None;
    }
    // Aggregate the transform flags of each child.
    return reduceEachChild(node, TransformFlags.None, aggregateTransformFlagsForChildNode, aggregateTransformFlagsForChildNodes);
  }
  function aggregateTransformFlagsForChildNode(transformFlags: TransformFlags, node: Node): TransformFlags {
    return transformFlags | aggregateTransformFlagsForNode(node);
  }
  function aggregateTransformFlagsForChildNodes(transformFlags: TransformFlags, nodes: Nodes<Node>): TransformFlags {
    return transformFlags | aggregateTransformFlagsForNodes(nodes);
  }
}
