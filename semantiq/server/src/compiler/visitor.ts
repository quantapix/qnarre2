namespace core {
  export type Visitor = (n: Node) => VisitResult<Node>;
  export type VisitResult<T extends Node> = T | T[] | undefined;

  const isTypeNodeOrTypeParameterDeclaration = qa.or(isTypeNode, isTypeParameterDeclaration);

  export function visitNode<T extends Node>(n?: T, cb?: Visitor, test?: (n: Node) => boolean, lift?: (ns: Nodes<Node>) => T): T;
  export function visitNode<T extends Node>(n?: T, cb?: Visitor, test?: (n: Node) => boolean, lift?: (ns: Nodes<Node>) => T): T | undefined;
  export function visitNode<T extends Node>(n?: T, cb?: Visitor, test?: (n: Node) => boolean, lift?: (ns: Nodes<Node>) => T): T | undefined {
    if (!n || !cb) return n;
    aggregateTransformFlags(n);
    const r = cb(n);
    if (r === n) return n;
    let n2: Node | undefined;
    if (!r) return;
    if (qa.isArray(r)) n2 = (lift || extractSingleNode)(r);
    else n2 = r;
    Debug.assertNode(n2, test);
    aggregateTransformFlags(n2!);
    return n2 as T;
  }
  export function visitNodes<T extends Node>(ns?: Nodes<T>, cb?: Visitor, test?: (n: Node) => boolean, start?: number, count?: number): Nodes<T>;
  export function visitNodes<T extends Node>(ns?: Nodes<T>, cb?: Visitor, test?: (n: Node) => boolean, start?: number, count?: number): Nodes<T> | undefined;
  export function visitNodes<T extends Node>(ns?: Nodes<T>, cb?: Visitor, test?: (n: Node) => boolean, start?: number, count?: number): Nodes<T> | undefined {
    if (!ns || !cb) return ns;
    let updated: MutableNodes<T> | undefined;
    const length = ns.length;
    if (start === undefined || start < 0) start = 0;
    if (count === undefined || count > length - start) count = length - start;
    if (start > 0 || count < length) updated = Nodes.create<T>([], ns.trailingComma && start + count === length);
    for (let i = 0; i < count; i++) {
      const n: T = ns[i + start];
      aggregateTransformFlags(n);
      const r = n ? cb(n) : undefined;
      if (updated !== undefined || r === undefined || r !== n) {
        if (updated === undefined) {
          updated = Nodes.create(ns.slice(0, i), ns.trailingComma);
          setRange(updated, ns);
        }
        if (r) {
          if (qa.isArray(r)) {
            for (const n2 of r) {
              Debug.assertNode(n2, test);
              aggregateTransformFlags(n2);
              updated.push(n2 as T);
            }
          } else {
            Debug.assertNode(r, test);
            aggregateTransformFlags(r);
            updated.push(r as T);
          }
        }
      }
    }
    return updated || ns;
  }
  export function visitLexicalEnvironment(ss: Nodes<Statement>, cb: Visitor, c: TransformationContext, start?: number, strict?: boolean) {
    c.startLexicalEnvironment();
    ss = visitNodes(ss, cb, isStatement, start);
    if (strict) ss = ensureUseStrict(ss);
    return mergeLexicalEnvironment(ss, c.endLexicalEnvironment());
  }
  export function visitParameterList<T extends Node>(
    ns: Nodes<T>,
    cb: Visitor,
    c: TransformationContext,
    v?: (ns?: Nodes<T>, cb?: Visitor, test?: (n: Node) => boolean, start?: number, count?: number) => Nodes<T>
  ): Nodes<T>;
  export function visitParameterList<T extends Node>(
    ns: Nodes<T> | undefined,
    cb: Visitor,
    c: TransformationContext,
    v?: (ns?: Nodes<T>, cb?: Visitor, test?: (n: Node) => boolean, start?: number, count?: number) => Nodes<T> | undefined
  ): Nodes<T> | undefined;
  export function visitParameterList<T extends Node>(ns: Nodes<T> | undefined, cb: Visitor, c: TransformationContext, v = visitNodes) {
    let updated: Nodes<ParameterDeclaration> | undefined;
    c.startLexicalEnvironment();
    if (ns) {
      c.setLexicalEnvironmentFlags(LexicalEnvironmentFlags.InParameters, true);
      updated = v(ns, cb, isParameterDeclaration);
      if (c.getLexicalEnvironmentFlags() & LexicalEnvironmentFlags.VariablesHoistedInParameters) updated = addValueAssignments(updated!, c);
      c.setLexicalEnvironmentFlags(LexicalEnvironmentFlags.InParameters, false);
    }
    c.suspendLexicalEnvironment();
    return updated;
  }
  function addValueAssignments(ps: Nodes<ParameterDeclaration>, c: TransformationContext) {
    let r: ParameterDeclaration[] | undefined;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const updated = addValueAssignmentIfNeeded(p, c);
      if (r || updated !== p) {
        if (!r) r = ps.slice(0, i);
        r[i] = updated;
      }
    }
    if (r) return setRange(Nodes.create(r, ps.trailingComma), ps);
    return ps;
  }
  function addValueAssignmentIfNeeded(p: ParameterDeclaration, c: TransformationContext) {
    return p.dot3Token ? p : Node.is.kind(BindingPattern, p.name) ? addForBindingPattern(p, c) : p.initializer ? addForInitializer(p, p.name, p.initializer, c) : p;
  }
  function addForBindingPattern(p: ParameterDeclaration, c: TransformationContext) {
    c.addInitializationStatement(
      createVariableStatement(
        undefined,
        createVariableDeclarationList([
          createVariableDeclaration(
            p.name,
            p.type,
            p.initializer ? createConditional(createStrictEquality(getGeneratedNameForNode(p), createVoidZero()), p.initializer, getGeneratedNameForNode(p)) : getGeneratedNameForNode(p)
          ),
        ])
      )
    );
    return updateParameter(p, p.decorators, p.modifiers, p.dot3Token, getGeneratedNameForNode(p), p.questionToken, p.type, undefined);
  }
  function addForInitializer(p: ParameterDeclaration, name: Identifier, init: Expression, c: TransformationContext) {
    c.addInitializationStatement(
      createIf(
        createTypeCheck(getSynthesizedClone(name), 'undefined'),
        setEmitFlags(
          setRange(
            createBlock([
              createExpressionStatement(
                setEmitFlags(
                  setRange(
                    createAssignment(setEmitFlags(getMutableClone(name), EmitFlags.NoSourceMap), setEmitFlags(init, EmitFlags.NoSourceMap | Node.get.emitFlags(init) | EmitFlags.NoComments)),
                    p
                  ),
                  EmitFlags.NoComments
                )
              ),
            ]),
            p
          ),
          EmitFlags.SingleLine | EmitFlags.NoTrailingSourceMap | EmitFlags.NoTokenSourceMaps | EmitFlags.NoComments
        )
      )
    );
    return updateParameter(p, p.decorators, p.modifiers, p.dot3Token, p.name, p.questionToken, p.type, undefined);
  }
  export function visitFunctionBody(n: FunctionBody, cb: Visitor, c: TransformationContext): FunctionBody;
  export function visitFunctionBody(n: FunctionBody | undefined, cb: Visitor, c: TransformationContext): FunctionBody | undefined;
  export function visitFunctionBody(n: ConciseBody, cb: Visitor, c: TransformationContext): ConciseBody;
  export function visitFunctionBody(n: ConciseBody | undefined, cb: Visitor, c: TransformationContext): ConciseBody | undefined {
    c.resumeLexicalEnvironment();
    const updated = visitNode(n, cb, isConciseBody);
    const declarations = c.endLexicalEnvironment();
    if (qa.some(declarations)) {
      const block = convertToFunctionBody(updated);
      const ss = mergeLexicalEnvironment(block.statements, declarations);
      return updateBlock(block, ss);
    }
    return updated;
  }
  const isExpression = (n: Node) => Node.is.expressionNode(n);
  const isTypeNode = (n: Node) => Node.is.typeNode(n);
  const isDecorator = (n: Node) => Node.is.decorator(n);
  const isModifier = (n: Node) => Node.is.modifier(n);

  export function visitEachChild<T extends Node>(node: T, cb: Visitor, c: TransformationContext): T;
  export function visitEachChild<T extends Node>(node: T | undefined, cb: Visitor, c: TransformationContext, nodesVisitor?: typeof Nodes.visit, tokenVisitor?: Visitor): T | undefined;
  export function visitEachChild(node: Node | undefined, cb: Visitor, c: TransformationContext, nodesVisitor = Nodes.visit, tokenVisitor?: Visitor): Node | undefined {
    if (!node) return;
    const k = node.kind;
    if ((k > Syntax.FirstToken && k <= Syntax.LastToken) || k === Syntax.ThisType) return node;
    const n = node as NodeTypes;
    switch (n.kind) {
      case Syntax.Identifier:
        return n.update(nodesVisitor(n.typeArguments, cb, isTypeNodeOrTypeParameterDeclaration));
      case Syntax.QualifiedName:
        return QualifiedName.update(n, visitNode(n.left, cb, isEntityName), visitNode(n.right, cb, isIdentifier));
      case Syntax.ComputedPropertyName:
        return ComputedPropertyName.update(n, visitNode(n.expression, cb, isExpression));
      case Syntax.TypeParameter:
        return updateTypeParameterDeclaration(n, visitNode(n.name, cb, isIdentifier), visitNode(n.constraint, cb, isTypeNode), visitNode(n.default, cb, isTypeNode));
      case Syntax.Parameter:
        return updateParameter(
          n,
          nodesVisitor(n.decorators, cb, isDecorator),
          nodesVisitor(n.modifiers, cb, isModifier),
          visitNode(n.dot3Token, tokenVisitor, isToken),
          visitNode(n.name, cb, isBindingName),
          visitNode(n.questionToken, tokenVisitor, isToken),
          visitNode(n.type, cb, isTypeNode),
          visitNode(n.initializer, cb, isExpression)
        );
      case Syntax.Decorator:
        return updateDecorator(n, visitNode(n.expression, cb, isExpression));
      case Syntax.PropertySignature:
        return PropertySignature.update(
          n,
          nodesVisitor(n.modifiers, cb, isToken),
          visitNode(n.name, cb, isPropertyName),
          visitNode(n.questionToken, tokenVisitor, isToken),
          visitNode(n.type, cb, isTypeNode),
          visitNode(n.initializer, cb, isExpression)
        );
      case Syntax.PropertyDeclaration:
        return PropertyDeclaration.update(
          n,
          nodesVisitor(n.decorators, cb, isDecorator),
          nodesVisitor(n.modifiers, cb, isModifier),
          visitNode(n.name, cb, isPropertyName),
          visitNode(n.questionToken || n.exclamationToken, tokenVisitor, isToken),
          visitNode(n.type, cb, isTypeNode),
          visitNode(n.initializer, cb, isExpression)
        );
      case Syntax.MethodSignature:
        return MethodSignature.update(
          n,
          nodesVisitor(n.typeParameters, cb, isTypeParameterDeclaration),
          nodesVisitor(n.parameters, cb, isParameterDeclaration),
          visitNode(n.type, cb, isTypeNode),
          visitNode(n.name, cb, isPropertyName),
          visitNode(n.questionToken, tokenVisitor, isToken)
        );
      case Syntax.MethodDeclaration:
        return MethodDeclaration.update(
          n,
          nodesVisitor(n.decorators, cb, isDecorator),
          nodesVisitor(n.modifiers, cb, isModifier),
          visitNode(n.asteriskToken, tokenVisitor, isToken),
          visitNode(n.name, cb, isPropertyName),
          visitNode(n.questionToken, tokenVisitor, isToken),
          nodesVisitor(n.typeParameters, cb, isTypeParameterDeclaration),
          visitParameterList(n.parameters, cb, c, nodesVisitor),
          visitNode(n.type, cb, isTypeNode),
          visitFunctionBody(n.body!, cb, c)
        );
      case Syntax.Constructor:
        return ConstructorDeclaration.update(
          n,
          nodesVisitor(n.decorators, cb, isDecorator),
          nodesVisitor(n.modifiers, cb, isModifier),
          visitParameterList(n.parameters, cb, c, nodesVisitor),
          visitFunctionBody(n.body!, cb, c)
        );
      case Syntax.GetAccessor:
        return GetAccessorDeclaration.update(
          n,
          nodesVisitor(n.decorators, cb, isDecorator),
          nodesVisitor(n.modifiers, cb, isModifier),
          visitNode(n.name, cb, isPropertyName),
          visitParameterList(n.parameters, cb, c, nodesVisitor),
          visitNode(n.type, cb, isTypeNode),
          visitFunctionBody(n.body!, cb, c)
        );
      case Syntax.SetAccessor:
        return SetAccessorDeclaration.update(
          n,
          nodesVisitor(n.decorators, cb, isDecorator),
          nodesVisitor(n.modifiers, cb, isModifier),
          visitNode(n.name, cb, isPropertyName),
          visitParameterList(n.parameters, cb, c, nodesVisitor),
          visitFunctionBody(n.body!, cb, c)
        );
      case Syntax.CallSignature:
        return CallSignatureDeclaration.update(
          n,
          nodesVisitor(n.typeParameters, cb, isTypeParameterDeclaration),
          nodesVisitor(n.parameters, cb, isParameterDeclaration),
          visitNode(n.type, cb, isTypeNode)
        );
      case Syntax.ConstructSignature:
        return ConstructSignatureDeclaration.update(
          n,
          nodesVisitor(n.typeParameters, cb, isTypeParameterDeclaration),
          nodesVisitor(n.parameters, cb, isParameterDeclaration),
          visitNode(n.type, cb, isTypeNode)
        );
      case Syntax.IndexSignature:
        return IndexSignatureDeclaration.update(
          n,
          nodesVisitor(n.decorators, cb, isDecorator),
          nodesVisitor(n.modifiers, cb, isModifier),
          nodesVisitor(n.parameters, cb, isParameterDeclaration),
          visitNode(n.type, cb, isTypeNode)
        );
      case Syntax.TypePredicate:
        return TypePredicateNode.updateWithModifier(n, visitNode(n.assertsModifier, cb), visitNode(n.parameterName, cb), visitNode(n.type, cb, isTypeNode));
      case Syntax.TypeReference:
        return TypeReferenceNode.update(n, visitNode(n.typeName, cb, isEntityName), nodesVisitor(n.typeArguments, cb, isTypeNode));
      case Syntax.FunctionType:
        return FunctionTypeNode.update(n, nodesVisitor(n.typeParameters, cb, isTypeParameterDeclaration), nodesVisitor(n.parameters, cb, isParameterDeclaration), visitNode(n.type, cb, isTypeNode));
      case Syntax.ConstructorType:
        return ConstructorDeclaration.updateTypeNode(
          n,
          nodesVisitor(n.typeParameters, cb, isTypeParameterDeclaration),
          nodesVisitor(n.parameters, cb, isParameterDeclaration),
          visitNode(n.type, cb, isTypeNode)
        );
      case Syntax.TypeQuery:
        return TypeQueryNode.update(n, visitNode(n.exprName, cb, isEntityName));
      case Syntax.TypeLiteral:
        return TypeLiteralNode.update(n, nodesVisitor(n.members, cb, isTypeElement));
      case Syntax.ArrayType:
        return n.update(visitNode(n.elementType, cb, isTypeNode));
      case Syntax.TupleType:
        return TupleTypeNode.update(n, nodesVisitor(n.elements, cb, isTypeNode));
      case Syntax.OptionalType:
        return OptionalTypeNode.update(n, visitNode(n.type, cb, isTypeNode));
      case Syntax.RestType:
        return RestTypeNode.update(n, visitNode(n.type, cb, isTypeNode));
      case Syntax.UnionType:
        return UnionTypeNode.update(n, nodesVisitor(n.types, cb, isTypeNode));
      case Syntax.IntersectionType:
        return IntersectionTypeNode.update(n, nodesVisitor(n.types, cb, isTypeNode));
      case Syntax.ConditionalType:
        return ConditionalTypeNode.update(
          n,
          visitNode(n.checkType, cb, isTypeNode),
          visitNode(n.extendsType, cb, isTypeNode),
          visitNode(n.trueType, cb, isTypeNode),
          visitNode(n.falseType, cb, isTypeNode)
        );
      case Syntax.InferType:
        return InferTypeNode.update(n, visitNode(n.typeParameter, cb, isTypeParameterDeclaration));
      case Syntax.ImportType:
        return ImportTypeNode.update(n, visitNode(n.argument, cb, isTypeNode), visitNode(n.qualifier, cb, isEntityName), Nodes.visit(n.typeArguments, cb, isTypeNode), n.isTypeOf);
      case Syntax.NamedTupleMember:
        return NamedTupleMember.update(n, visitNode(n.dot3Token, cb, isToken), visitNode(n.name, cb, isIdentifier), visitNode(n.questionToken, cb, isToken), visitNode(n.type, cb, isTypeNode));
      case Syntax.ParenthesizedType:
        return ParenthesizedTypeNode.update(n, visitNode(n.type, cb, isTypeNode));
      case Syntax.TypeOperator:
        return TypeOperatorNode.update(n, visitNode(n.type, cb, isTypeNode));
      case Syntax.IndexedAccessType:
        return IndexedAccessTypeNode.update(n, visitNode(n.objectType, cb, isTypeNode), visitNode(n.indexType, cb, isTypeNode));
      case Syntax.MappedType:
        return MappedTypeNode.update(
          n,
          visitNode(n.readonlyToken, tokenVisitor, isToken),
          visitNode(n.typeParameter, cb, isTypeParameterDeclaration),
          visitNode(n.questionToken, tokenVisitor, isToken),
          visitNode(n.type, cb, isTypeNode)
        );
      case Syntax.LiteralType:
        return LiteralTypeNode.update(n, visitNode(n.literal, cb, isExpression));
      case Syntax.ObjectBindingPattern:
        return ObjectBindingPattern.update(n, nodesVisitor(n.elements, cb, BindingElement.kind));
      case Syntax.ArrayBindingPattern:
        return n.update(nodesVisitor(n.elements, cb, isArrayBindingElement));
      case Syntax.BindingElement:
        return BindingElement.update(
          n,
          visitNode(n.dot3Token, tokenVisitor, isToken),
          visitNode(n.propertyName, cb, isPropertyName),
          visitNode(n.name, cb, isBindingName),
          visitNode(n.initializer, cb, isExpression)
        );
      case Syntax.ArrayLiteralExpression:
        return n.update(nodesVisitor(n.elements, cb, isExpression));
      case Syntax.ObjectLiteralExpression:
        return updateObjectLiteral(n, nodesVisitor(n.properties, cb, isObjectLiteralElementLike));
      case Syntax.PropertyAccessExpression:
        if (node.flags & NodeFlags.OptionalChain) {
          return updatePropertyAccessChain(n, visitNode(n.expression, cb, isExpression), visitNode(n.questionDotToken, tokenVisitor, isToken), visitNode(n.name, cb, isIdentifier));
        }
        return updatePropertyAccess(n, visitNode(n.expression, cb, isExpression), visitNode(n.name, cb, isIdentifierOrPrivateIdentifier));
      case Syntax.ElementAccessExpression:
        if (node.flags & NodeFlags.OptionalChain) {
          return updateElementAccessChain(n, visitNode(n.expression, cb, isExpression), visitNode(n.questionDotToken, tokenVisitor, isToken), visitNode(n.argumentExpression, cb, isExpression));
        }
        return updateElementAccess(n, visitNode(n.expression, cb, isExpression), visitNode(n.argumentExpression, cb, isExpression));
      case Syntax.CallExpression:
        if (node.flags & NodeFlags.OptionalChain) {
          return updateCallChain(
            n,
            visitNode(n.expression, cb, isExpression),
            visitNode(n.questionDotToken, tokenVisitor, isToken),
            nodesVisitor(n.typeArguments, cb, isTypeNode),
            nodesVisitor(n.arguments, cb, isExpression)
          );
        }
        return updateCall(n, visitNode(n.expression, cb, isExpression), nodesVisitor(n.typeArguments, cb, isTypeNode), nodesVisitor(n.arguments, cb, isExpression));
      case Syntax.NewExpression:
        return updateNew(n, visitNode(n.expression, cb, isExpression), nodesVisitor(n.typeArguments, cb, isTypeNode), nodesVisitor(n.arguments, cb, isExpression));
      case Syntax.TaggedTemplateExpression:
        return updateTaggedTemplate(n, visitNode(n.tag, cb, isExpression), Nodes.visit(n.typeArguments, cb, isExpression), visitNode(n.template, cb, isTemplateLiteral));
      case Syntax.TypeAssertionExpression:
        return updateTypeAssertion(n, visitNode(n.type, cb, isTypeNode), visitNode(n.expression, cb, isExpression));
      case Syntax.ParenthesizedExpression:
        return updateParen(n, visitNode(n.expression, cb, isExpression));
      case Syntax.FunctionExpression:
        return updateFunctionExpression(
          n,
          nodesVisitor(n.modifiers, cb, isModifier),
          visitNode(n.asteriskToken, tokenVisitor, isToken),
          visitNode(n.name, cb, isIdentifier),
          nodesVisitor(n.typeParameters, cb, isTypeParameterDeclaration),
          visitParameterList(n.parameters, cb, c, nodesVisitor),
          visitNode(n.type, cb, isTypeNode),
          visitFunctionBody(n.body, cb, c)
        );
      case Syntax.ArrowFunction:
        return n.update(
          nodesVisitor(n.modifiers, cb, isModifier),
          nodesVisitor(n.typeParameters, cb, isTypeParameterDeclaration),
          visitParameterList(n.parameters, cb, c, nodesVisitor),
          visitNode(n.type, cb, isTypeNode),
          visitNode(n.equalsGreaterThanToken, tokenVisitor, isToken),
          visitFunctionBody(n.body, cb, c)
        );
      case Syntax.DeleteExpression:
        return updateDelete(n, visitNode(n.expression, cb, isExpression));
      case Syntax.TypeOfExpression:
        return updateTypeOf(n, visitNode(n.expression, cb, isExpression));
      case Syntax.VoidExpression:
        return updateVoid(n, visitNode(n.expression, cb, isExpression));
      case Syntax.AwaitExpression:
        return updateAwait(n, visitNode(n.expression, cb, isExpression));
      case Syntax.PrefixUnaryExpression:
        return updatePrefix(n, visitNode(n.operand, cb, isExpression));
      case Syntax.PostfixUnaryExpression:
        return updatePostfix(n, visitNode(n.operand, cb, isExpression));
      case Syntax.BinaryExpression:
        return updateBinary(n, visitNode(n.left, cb, isExpression), visitNode(n.right, cb, isExpression), visitNode(n.operatorToken, tokenVisitor, isToken));
      case Syntax.ConditionalExpression:
        return updateConditional(
          n,
          visitNode(n.condition, cb, isExpression),
          visitNode(n.questionToken, tokenVisitor, isToken),
          visitNode(n.whenTrue, cb, isExpression),
          visitNode(n.colonToken, tokenVisitor, isToken),
          visitNode(n.whenFalse, cb, isExpression)
        );
      case Syntax.TemplateExpression:
        return updateTemplateExpression(n, visitNode(n.head, cb, TemplateHead.kind), nodesVisitor(n.templateSpans, cb, isTemplateSpan));
      case Syntax.YieldExpression:
        return updateYield(n, visitNode(n.asteriskToken, tokenVisitor, isToken), visitNode(n.expression, cb, isExpression));
      case Syntax.SpreadElement:
        return updateSpread(n, visitNode(n.expression, cb, isExpression));
      case Syntax.ClassExpression:
        return updateClassExpression(
          n,
          nodesVisitor(n.modifiers, cb, isModifier),
          visitNode(n.name, cb, isIdentifier),
          nodesVisitor(n.typeParameters, cb, isTypeParameterDeclaration),
          nodesVisitor(n.heritageClauses, cb, isHeritageClause),
          nodesVisitor(n.members, cb, isClassElement)
        );
      case Syntax.ExpressionWithTypeArguments:
        return updateExpressionWithTypeArguments(n, nodesVisitor(n.typeArguments, cb, isTypeNode), visitNode(n.expression, cb, isExpression));
      case Syntax.AsExpression:
        return n.update(visitNode(n.expression, cb, isExpression), visitNode(n.type, cb, isTypeNode));
      case Syntax.NonNullExpression:
        return updateNonNullExpression(n, visitNode(n.expression, cb, isExpression));
      case Syntax.MetaProperty:
        return updateMetaProperty(n, visitNode(n.name, cb, isIdentifier));
      // Misc
      case Syntax.TemplateSpan:
        return updateTemplateSpan(n, visitNode(n.expression, cb, isExpression), visitNode(n.literal, cb, TemplateMiddle.kindOrTemplateTail));
      // Element
      case Syntax.Block:
        return updateBlock(n, nodesVisitor(n.statements, cb, isStatement));
      case Syntax.VariableStatement:
        return updateVariableStatement(n, nodesVisitor(n.modifiers, cb, isModifier), visitNode(n.declarationList, cb, isVariableDeclarationList));
      case Syntax.ExpressionStatement:
        return updateExpressionStatement(n, visitNode(n.expression, cb, isExpression));
      case Syntax.IfStatement:
        return updateIf(n, visitNode(n.expression, cb, isExpression), visitNode(n.thenStatement, cb, isStatement, liftToBlock), visitNode(n.elseStatement, cb, isStatement, liftToBlock));
      case Syntax.DoStatement:
        return updateDo(n, visitNode(n.statement, cb, isStatement, liftToBlock), visitNode(n.expression, cb, isExpression));
      case Syntax.WhileStatement:
        return updateWhile(n, visitNode(n.expression, cb, isExpression), visitNode(n.statement, cb, isStatement, liftToBlock));
      case Syntax.ForStatement:
        return updateFor(
          n,
          visitNode(n.initializer, cb, isForInitializer),
          visitNode(n.condition, cb, isExpression),
          visitNode(n.incrementor, cb, isExpression),
          visitNode(n.statement, cb, isStatement, liftToBlock)
        );
      case Syntax.ForInStatement:
        return updateForIn(n, visitNode(n.initializer, cb, isForInitializer), visitNode(n.expression, cb, isExpression), visitNode(n.statement, cb, isStatement, liftToBlock));
      case Syntax.ForOfStatement:
        return updateForOf(
          n,
          visitNode(n.awaitModifier, tokenVisitor, isToken),
          visitNode(n.initializer, cb, isForInitializer),
          visitNode(n.expression, cb, isExpression),
          visitNode(n.statement, cb, isStatement, liftToBlock)
        );
      case Syntax.ContinueStatement:
        return updateContinue(n, visitNode(n.label, cb, isIdentifier));
      case Syntax.BreakStatement:
        return updateBreak(n, visitNode(n.label, cb, isIdentifier));
      case Syntax.ReturnStatement:
        return updateReturn(n, visitNode(n.expression, cb, isExpression));
      case Syntax.WithStatement:
        return updateWith(n, visitNode(n.expression, cb, isExpression), visitNode(n.statement, cb, isStatement, liftToBlock));
      case Syntax.SwitchStatement:
        return updateSwitch(n, visitNode(n.expression, cb, isExpression), visitNode(n.caseBlock, cb, isCaseBlock));
      case Syntax.LabeledStatement:
        return updateLabel(n, visitNode(n.label, cb, isIdentifier), visitNode(n.statement, cb, isStatement, liftToBlock));
      case Syntax.ThrowStatement:
        return updateThrow(n, visitNode(n.expression, cb, isExpression));
      case Syntax.TryStatement:
        return updateTry(n, visitNode(n.tryBlock, cb, isBlock), visitNode(n.catchClause, cb, isCatchClause), visitNode(n.finallyBlock, cb, isBlock));
      case Syntax.VariableDeclaration:
        return updateTypeScriptVariableDeclaration(
          n,
          visitNode(n.name, cb, isBindingName),
          visitNode(n.exclamationToken, tokenVisitor, isToken),
          visitNode(n.type, cb, isTypeNode),
          visitNode(n.initializer, cb, isExpression)
        );
      case Syntax.VariableDeclarationList:
        return updateVariableDeclarationList(n, nodesVisitor(n.declarations, cb, isVariableDeclaration));
      case Syntax.FunctionDeclaration:
        return updateFunctionDeclaration(
          n,
          nodesVisitor(n.decorators, cb, isDecorator),
          nodesVisitor(n.modifiers, cb, isModifier),
          visitNode(n.asteriskToken, tokenVisitor, isToken),
          visitNode(n.name, cb, isIdentifier),
          nodesVisitor(n.typeParameters, cb, isTypeParameterDeclaration),
          visitParameterList(n.parameters, cb, c, nodesVisitor),
          visitNode(n.type, cb, isTypeNode),
          visitFunctionBody(n.body, cb, c)
        );
      case Syntax.ClassDeclaration:
        return updateClassDeclaration(
          n,
          nodesVisitor(n.decorators, cb, isDecorator),
          nodesVisitor(n.modifiers, cb, isModifier),
          visitNode(n.name, cb, isIdentifier),
          nodesVisitor(n.typeParameters, cb, isTypeParameterDeclaration),
          nodesVisitor(n.heritageClauses, cb, isHeritageClause),
          nodesVisitor(n.members, cb, isClassElement)
        );
      case Syntax.InterfaceDeclaration:
        return updateInterfaceDeclaration(
          n,
          nodesVisitor(n.decorators, cb, isDecorator),
          nodesVisitor(n.modifiers, cb, isModifier),
          visitNode(n.name, cb, isIdentifier),
          nodesVisitor(n.typeParameters, cb, isTypeParameterDeclaration),
          nodesVisitor(n.heritageClauses, cb, isHeritageClause),
          nodesVisitor(n.members, cb, isTypeElement)
        );
      case Syntax.TypeAliasDeclaration:
        return updateTypeAliasDeclaration(
          n,
          nodesVisitor(n.decorators, cb, isDecorator),
          nodesVisitor(n.modifiers, cb, isModifier),
          visitNode(n.name, cb, isIdentifier),
          nodesVisitor(n.typeParameters, cb, isTypeParameterDeclaration),
          visitNode(n.type, cb, isTypeNode)
        );
      case Syntax.EnumDeclaration:
        return updateEnumDeclaration(
          n,
          nodesVisitor(n.decorators, cb, isDecorator),
          nodesVisitor(n.modifiers, cb, isModifier),
          visitNode(n.name, cb, isIdentifier),
          nodesVisitor(n.members, cb, isEnumMember)
        );
      case Syntax.ModuleDeclaration:
        return updateModuleDeclaration(
          n,
          nodesVisitor(n.decorators, cb, isDecorator),
          nodesVisitor(n.modifiers, cb, isModifier),
          visitNode(n.name, cb, isIdentifier),
          visitNode(n.body, cb, isModuleBody)
        );
      case Syntax.ModuleBlock:
        return updateModuleBlock(n, nodesVisitor(n.statements, cb, isStatement));
      case Syntax.CaseBlock:
        return updateCaseBlock(n, nodesVisitor(n.clauses, cb, isCaseOrDefaultClause));
      case Syntax.NamespaceExportDeclaration:
        return updateNamespaceExportDeclaration(n, visitNode(n.name, cb, isIdentifier));
      case Syntax.ImportEqualsDeclaration:
        return updateImportEqualsDeclaration(
          n,
          nodesVisitor(n.decorators, cb, isDecorator),
          nodesVisitor(n.modifiers, cb, isModifier),
          visitNode(n.name, cb, isIdentifier),
          visitNode(n.moduleReference, cb, isModuleReference)
        );
      case Syntax.ImportDeclaration:
        return updateImportDeclaration(
          n,
          nodesVisitor(n.decorators, cb, isDecorator),
          nodesVisitor(n.modifiers, cb, isModifier),
          visitNode(n.importClause, cb, isImportClause),
          visitNode(n.moduleSpecifier, cb, isExpression)
        );
      case Syntax.ImportClause:
        return updateImportClause(n, visitNode(n.name, cb, isIdentifier), visitNode(n.namedBindings, cb, isNamedImportBindings), (node as ImportClause).isTypeOnly);
      case Syntax.NamespaceImport:
        return updateNamespaceImport(n, visitNode(n.name, cb, isIdentifier));
      case Syntax.NamespaceExport:
        return updateNamespaceExport(n, visitNode(n.name, cb, isIdentifier));
      case Syntax.NamedImports:
        return updateNamedImports(n, nodesVisitor(n.elements, cb, isImportSpecifier));
      case Syntax.ImportSpecifier:
        return updateImportSpecifier(n, visitNode(n.propertyName, cb, isIdentifier), visitNode(n.name, cb, isIdentifier));
      case Syntax.ExportAssignment:
        return updateExportAssignment(n, nodesVisitor(n.decorators, cb, isDecorator), nodesVisitor(n.modifiers, cb, isModifier), visitNode(n.expression, cb, isExpression));
      case Syntax.ExportDeclaration:
        return updateExportDeclaration(
          n,
          nodesVisitor(n.decorators, cb, isDecorator),
          nodesVisitor(n.modifiers, cb, isModifier),
          visitNode(n.exportClause, cb, isNamedExportBindings),
          visitNode(n.moduleSpecifier, cb, isExpression),
          (node as ExportDeclaration).isTypeOnly
        );
      case Syntax.NamedExports:
        return updateNamedExports(n, nodesVisitor(n.elements, cb, isExportSpecifier));
      case Syntax.ExportSpecifier:
        return updateExportSpecifier(n, visitNode(n.propertyName, cb, isIdentifier), visitNode(n.name, cb, isIdentifier));
      case Syntax.ExternalModuleReference:
        return updateExternalModuleReference(n, visitNode(n.expression, cb, isExpression));
      case Syntax.JsxElement:
        return updateJsxElement(n, visitNode(n.openingElement, cb, isJsxOpeningElement), nodesVisitor(n.children, cb, isJsxChild), visitNode(n.closingElement, cb, isJsxClosingElement));
      case Syntax.JsxSelfClosingElement:
        return updateJsxSelfClosingElement(n, visitNode(n.tagName, cb, isJsxTagNameExpression), nodesVisitor(n.typeArguments, cb, isTypeNode), visitNode(n.attributes, cb, isJsxAttributes));
      case Syntax.JsxOpeningElement:
        return updateJsxOpeningElement(n, visitNode(n.tagName, cb, isJsxTagNameExpression), nodesVisitor(n.typeArguments, cb, isTypeNode), visitNode(n.attributes, cb, isJsxAttributes));
      case Syntax.JsxClosingElement:
        return updateJsxClosingElement(n, visitNode(n.tagName, cb, isJsxTagNameExpression));
      case Syntax.JsxFragment:
        return updateJsxFragment(n, visitNode(n.openingFragment, cb, isJsxOpeningFragment), nodesVisitor(n.children, cb, isJsxChild), visitNode(n.closingFragment, cb, isJsxClosingFragment));
      case Syntax.JsxAttribute:
        return updateJsxAttribute(n, visitNode(n.name, cb, isIdentifier), visitNode(n.initializer, cb, StringLiteral.orJsxExpressionKind));
      case Syntax.JsxAttributes:
        return updateJsxAttributes(n, nodesVisitor(n.properties, cb, isJsxAttributeLike));
      case Syntax.JsxSpreadAttribute:
        return updateJsxSpreadAttribute(n, visitNode(n.expression, cb, isExpression));
      case Syntax.JsxExpression:
        return updateJsxExpression(n, visitNode(n.expression, cb, isExpression));
      case Syntax.CaseClause:
        return updateCaseClause(n, visitNode(n.expression, cb, isExpression), nodesVisitor(n.statements, cb, isStatement));
      case Syntax.DefaultClause:
        return updateDefaultClause(n, nodesVisitor(n.statements, cb, isStatement));
      case Syntax.HeritageClause:
        return updateHeritageClause(n, nodesVisitor(n.types, cb, isExpressionWithTypeArguments));
      case Syntax.CatchClause:
        return updateCatchClause(n, visitNode(n.variableDeclaration, cb, isVariableDeclaration), visitNode(n.block, cb, isBlock));
      case Syntax.PropertyAssignment:
        return updatePropertyAssignment(n, visitNode(n.name, cb, isPropertyName), visitNode(n.initializer, cb, isExpression));
      case Syntax.ShorthandPropertyAssignment:
        return updateShorthandPropertyAssignment(n, visitNode(n.name, cb, isIdentifier), visitNode(n.objectAssignmentInitializer, cb, isExpression));
      case Syntax.SpreadAssignment:
        return updateSpreadAssignment(n, visitNode(n.expression, cb, isExpression));
      case Syntax.EnumMember:
        return updateEnumMember(n, visitNode(n.name, cb, isPropertyName), visitNode(n.initializer, cb, isExpression));
      case Syntax.SourceFile:
        return qp_updateSourceNode(n, visitLexicalEnvironment(n.statements, cb, c));
      case Syntax.PartiallyEmittedExpression:
        return updatePartiallyEmittedExpression(n, visitNode(n.expression, cb, isExpression));
      case Syntax.CommaListExpression:
        return updateCommaList(n, nodesVisitor(n.elements, cb, isExpression));
      default:
        return node;
    }
  }
  function extractSingleNode(ns: readonly Node[]): Node | undefined {
    qa.assert(ns.length <= 1, 'Too many nodes written to output.');
    return qa.singleOrUndefined(ns);
  }
  function reduceNode<T>(node: Node | undefined, f: (memo: T, node: Node) => T, initial: T) {
    return node ? f(initial, node) : initial;
  }
  function reduceNodes<T>(ns: Nodes<Node> | undefined, f: (memo: T, ns: Nodes<Node>) => T, initial: T) {
    return ns ? f(initial, ns) : initial;
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
  export function mergeLexicalEnvironment(ss: Nodes<Statement>, declarations: readonly Statement[] | undefined): Nodes<Statement>;
  export function mergeLexicalEnvironment(ss: Statement[], declarations: readonly Statement[] | undefined): Statement[];
  export function mergeLexicalEnvironment(ss: Statement[] | Nodes<Statement>, declarations: readonly Statement[] | undefined) {
    if (!some(declarations)) return ss;
    const ls = findSpanEnd(ss, isPrologueDirective, 0);
    const lf = findSpanEnd(ss, isHoistedFunction, ls);
    const lv = findSpanEnd(ss, isHoistedVariableStatement, lf);
    const rs = findSpanEnd(declarations, isPrologueDirective, 0);
    const rf = findSpanEnd(declarations, isHoistedFunction, rs);
    const rv = findSpanEnd(declarations, isHoistedVariableStatement, rf);
    const rc = findSpanEnd(declarations, isCustomPrologue, rv);
    qa.assert(rc === declarations.length, 'Expected declarations to be valid standard or custom prologues');
    const left = isNodes(ss) ? ss.slice() : ss;
    if (rc > rv) left.splice(lv, 0, ...declarations.slice(rv, rc));
    if (rv > rf) left.splice(lf, 0, ...declarations.slice(rf, rv));
    if (rf > rs) left.splice(ls, 0, ...declarations.slice(rs, rf));
    if (rs > 0) {
      if (ls === 0) left.splice(0, 0, ...declarations.slice(0, rs));
      else {
        const lp = createMap<boolean>();
        for (let i = 0; i < ls; i++) {
          const lp = ss[i] as PrologueDirective;
          lp.set(leftPrologue.expression.text, true);
        }
        for (let i = rs - 1; i >= 0; i--) {
          const rp = declarations[i] as PrologueDirective;
          if (!lp.has(rp.expression.text)) {
            left.unshift(rp);
          }
        }
      }
    }
    if (isNodes(ss)) return setRange(Nodes.create(left, ss.trailingComma), ss);
    return ss;
  }
  export function liftToBlock(ns: readonly Node[]): Statement {
    qa.assert(every(ns, isStatement), 'Cannot lift nodes to a Block.');
    return (qa.singleOrUndefined(ns) as Statement) || createBlock(<Nodes<Statement>>ns);
  }
}
