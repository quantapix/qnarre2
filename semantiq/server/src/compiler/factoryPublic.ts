namespace qnr {
  export function updateNode<T extends Node>(updated: T, original: T): T {
    if (updated !== original) {
      setOriginalNode(updated, original);
      setTextRange(updated, original);
      aggregateTransformFlags(updated);
    }
    return updated;
  }

  export function getSynthesizedClone<T extends Node>(node: T): T {
    if (node === undefined) return node;
    const clone = qn.createSynthesized(node.kind) as T;
    clone.flags |= node.flags;
    setOriginalNode(clone, node);
    for (const key in node) {
      if (clone.hasOwnProperty(key) || !node.hasOwnProperty(key)) continue;
      (<any>clone)[key] = (<any>node)[key];
    }
    return clone;
  }

  // Literals

  export function createLiteral(value: string | StringLiteral | NoSubstitutionLiteral | NumericLiteral | Identifier, isSingleQuote: boolean): StringLiteral; // eslint-disable-line @typescript-eslint/unified-signatures
  export function createLiteral(value: string | number, isSingleQuote: boolean): StringLiteral | NumericLiteral;
  /** If a node is passed, creates a string literal whose source text is read from a source node during emit. */
  export function createLiteral(value: string | StringLiteral | NoSubstitutionLiteral | NumericLiteral | Identifier): StringLiteral;
  export function createLiteral(value: number | PseudoBigInt): NumericLiteral;
  export function createLiteral(value: boolean): BooleanLiteral;
  export function createLiteral(value: string | number | PseudoBigInt | boolean): PrimaryExpression;
  export function createLiteral(value: string | number | PseudoBigInt | boolean | StringLiteral | NoSubstitutionLiteral | NumericLiteral | Identifier, isSingleQuote?: boolean): PrimaryExpression {
    if (typeof value === 'number') {
      return NumericLiteral.create(value + '');
    }
    // eslint-disable-next-line no-in-operator
    if (typeof value === 'object' && 'base10Value' in value) {
      // PseudoBigInt
      return BigIntLiteral.create(pseudoBigIntToString(value) + 'n');
    }
    if (typeof value === 'boolean') {
      return value ? createTrue() : createFalse();
    }
    if (isString(value)) {
      const res = StringLiteral.create(value);
      if (isSingleQuote) res.singleQuote = true;
      return res;
    }
    return createLiteralFromNode(value);
  }

  function createLiteralFromNode(sourceNode: Exclude<PropertyNameLiteral, PrivateIdentifier>): StringLiteral {
    const node = StringLiteral.create(getTextOfIdentifierOrLiteral(sourceNode));
    node.textSourceNode = sourceNode;
    return node;
  }

  // Identifiers

  export function createIdentifier(text: string): Identifier;
  export function createIdentifier(text: string, typeArguments: readonly (TypeNode | TypeParameterDeclaration)[] | undefined): Identifier; // eslint-disable-line @typescript-eslint/unified-signatures
  export function createIdentifier(text: string, typeArguments?: readonly (TypeNode | TypeParameterDeclaration)[]): Identifier {
    const node = <Identifier>qn.createSynthesized(Syntax.Identifier);
    node.escapedText = qy_get.escUnderscores(text);
    node.originalKeywordKind = text ? Token.fromString(text) : Syntax.Unknown;
    node.autoGenerateFlags = GeneratedIdentifierFlags.None;
    node.autoGenerateId = 0;
    if (typeArguments) {
      node.typeArguments = NodeArray.create(typeArguments as readonly TypeNode[]);
    }
    return node;
  }

  export function updateIdentifier(node: Identifier): Identifier;
  export function updateIdentifier(node: Identifier, typeArguments: NodeArray<TypeNode | TypeParameterDeclaration> | undefined): Identifier; // eslint-disable-line @typescript-eslint/unified-signatures
  export function updateIdentifier(node: Identifier, typeArguments?: NodeArray<TypeNode | TypeParameterDeclaration> | undefined): Identifier {
    return node.typeArguments !== typeArguments ? updateNode(createIdentifier(idText(node), typeArguments), node) : node;
  }

  let nextAutoGenerateId = 0;

  /** Create a unique temporary variable. */
  export function createTempVariable(recordTempVariable: ((node: Identifier) => void) | undefined): Identifier;
  export function createTempVariable(recordTempVariable: ((node: Identifier) => void) | undefined, reservedInNestedScopes: boolean): GeneratedIdentifier;
  export function createTempVariable(recordTempVariable: ((node: Identifier) => void) | undefined, reservedInNestedScopes?: boolean): GeneratedIdentifier {
    const name = createIdentifier('') as GeneratedIdentifier;
    name.autoGenerateFlags = GeneratedIdentifierFlags.Auto;
    name.autoGenerateId = nextAutoGenerateId;
    nextAutoGenerateId++;
    if (recordTempVariable) {
      recordTempVariable(name);
    }
    if (reservedInNestedScopes) {
      name.autoGenerateFlags |= GeneratedIdentifierFlags.ReservedInNestedScopes;
    }
    return name;
  }

  /** Create a unique temporary variable for use in a loop. */
  export function createLoopVariable(): Identifier {
    const name = createIdentifier('');
    name.autoGenerateFlags = GeneratedIdentifierFlags.Loop;
    name.autoGenerateId = nextAutoGenerateId;
    nextAutoGenerateId++;
    return name;
  }

  /** Create a unique name based on the supplied text. */
  export function createUniqueName(text: string): Identifier {
    const name = createIdentifier(text);
    name.autoGenerateFlags = GeneratedIdentifierFlags.Unique;
    name.autoGenerateId = nextAutoGenerateId;
    nextAutoGenerateId++;
    return name;
  }

  export function createOptimisticUniqueName(text: string): GeneratedIdentifier;
  /** Create a unique name based on the supplied text. */
  export function createOptimisticUniqueName(text: string): Identifier;
  export function createOptimisticUniqueName(text: string): GeneratedIdentifier {
    const name = createIdentifier(text) as GeneratedIdentifier;
    name.autoGenerateFlags = GeneratedIdentifierFlags.Unique | GeneratedIdentifierFlags.Optimistic;
    name.autoGenerateId = nextAutoGenerateId;
    nextAutoGenerateId++;
    return name;
  }

  /** Create a unique name based on the supplied text. This does not consider names injected by the transformer. */
  export function createFileLevelUniqueName(text: string): Identifier {
    const name = createOptimisticUniqueName(text);
    name.autoGenerateFlags |= GeneratedIdentifierFlags.FileLevel;
    return name;
  }

  /** Create a unique name generated for a node. */
  export function getGeneratedNameForNode(node: Node | undefined): Identifier;
  export function getGeneratedNameForNode(node: Node | undefined, flags: GeneratedIdentifierFlags): Identifier; // eslint-disable-line @typescript-eslint/unified-signatures
  export function getGeneratedNameForNode(node: Node | undefined, flags?: GeneratedIdentifierFlags): Identifier {
    const name = createIdentifier(node && qn.is.kind(Identifier, node) ? idText(node) : '');
    name.autoGenerateFlags = GeneratedIdentifierFlags.Node | flags!;
    name.autoGenerateId = nextAutoGenerateId;
    name.original = node;
    nextAutoGenerateId++;
    return name;
  }

  // Private Identifiers
  export function createPrivateIdentifier(text: string): PrivateIdentifier {
    if (text[0] !== '#') {
      fail('First character of private identifier must be #: ' + text);
    }
    const node = qn.createSynthesized(Syntax.PrivateIdentifier) as PrivateIdentifier;
    node.escapedText = qy_get.escUnderscores(text);
    return node;
  }

  // Punctuation

  export function createToken<TKind extends Syntax>(token: TKind) {
    return <Token<TKind>>qn.createSynthesized(token);
  }

  // Reserved words

  export function createSuper() {
    return <SuperExpression>qn.createSynthesized(Syntax.SuperKeyword);
  }

  export function createThis() {
    return <ThisExpression & Token<Syntax.ThisKeyword>>qn.createSynthesized(Syntax.ThisKeyword);
  }

  export function createNull() {
    return <NullLiteral & Token<Syntax.NullKeyword>>qn.createSynthesized(Syntax.NullKeyword);
  }

  export function createTrue() {
    return <BooleanLiteral & Token<Syntax.TrueKeyword>>qn.createSynthesized(Syntax.TrueKeyword);
  }

  export function createFalse() {
    return <BooleanLiteral & Token<Syntax.FalseKeyword>>qn.createSynthesized(Syntax.FalseKeyword);
  }

  // Modifiers

  export function createModifier<T extends Modifier['kind']>(kind: T): Token<T> {
    return createToken(kind);
  }

  export function createModifiersFromModifierFlags(flags: ModifierFlags) {
    const result: Modifier[] = [];
    if (flags & ModifierFlags.Export) {
      result.push(createModifier(Syntax.ExportKeyword));
    }
    if (flags & ModifierFlags.Ambient) {
      result.push(createModifier(Syntax.DeclareKeyword));
    }
    if (flags & ModifierFlags.Default) {
      result.push(createModifier(Syntax.DefaultKeyword));
    }
    if (flags & ModifierFlags.Const) {
      result.push(createModifier(Syntax.ConstKeyword));
    }
    if (flags & ModifierFlags.Public) {
      result.push(createModifier(Syntax.PublicKeyword));
    }
    if (flags & ModifierFlags.Private) {
      result.push(createModifier(Syntax.PrivateKeyword));
    }
    if (flags & ModifierFlags.Protected) {
      result.push(createModifier(Syntax.ProtectedKeyword));
    }
    if (flags & ModifierFlags.Abstract) {
      result.push(createModifier(Syntax.AbstractKeyword));
    }
    if (flags & ModifierFlags.Static) {
      result.push(createModifier(Syntax.StaticKeyword));
    }
    if (flags & ModifierFlags.Readonly) {
      result.push(createModifier(Syntax.ReadonlyKeyword));
    }
    if (flags & ModifierFlags.Async) {
      result.push(createModifier(Syntax.AsyncKeyword));
    }
    return result;
  }

  // Signature elements

  export function createTypeParameterDeclaration(name: string | Identifier, constraint?: TypeNode, defaultType?: TypeNode) {
    const node = qn.createSynthesized(Syntax.TypeParameter) as TypeParameterDeclaration;
    node.name = asName(name);
    node.constraint = constraint;
    node.default = defaultType;
    return node;
  }

  export function updateTypeParameterDeclaration(node: TypeParameterDeclaration, name: Identifier, constraint: TypeNode | undefined, defaultType: TypeNode | undefined) {
    return node.name !== name || node.constraint !== constraint || node.default !== defaultType ? updateNode(createTypeParameterDeclaration(name, constraint, defaultType), node) : node;
  }

  export function createParameter(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    dot3Token: Dot3Token | undefined,
    name: string | BindingName,
    questionToken?: QuestionToken,
    type?: TypeNode,
    initializer?: Expression
  ) {
    const node = <ParameterDeclaration>qn.createSynthesized(Syntax.Parameter);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.dot3Token = dot3Token;
    node.name = asName(name);
    node.questionToken = questionToken;
    node.type = type;
    node.initializer = initializer ? parenthesizeExpressionForList(initializer) : undefined;
    return node;
  }

  export function updateParameter(
    node: ParameterDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    dot3Token: Dot3Token | undefined,
    name: string | BindingName,
    questionToken: QuestionToken | undefined,
    type: TypeNode | undefined,
    initializer: Expression | undefined
  ) {
    return node.decorators !== decorators ||
      node.modifiers !== modifiers ||
      node.dot3Token !== dot3Token ||
      node.name !== name ||
      node.questionToken !== questionToken ||
      node.type !== type ||
      node.initializer !== initializer
      ? updateNode(createParameter(decorators, modifiers, dot3Token, name, questionToken, type, initializer), node)
      : node;
  }

  export function createDecorator(expression: Expression) {
    const node = <Decorator>qn.createSynthesized(Syntax.Decorator);
    node.expression = parenthesizeForAccess(expression);
    return node;
  }

  export function updateDecorator(node: Decorator, expression: Expression) {
    return node.expression !== expression ? updateNode(createDecorator(expression), node) : node;
  }
  // Expression

  export function createArrayLiteral(elements?: readonly Expression[], multiLine?: boolean) {
    const node = <ArrayLiteralExpression>qn.createSynthesized(Syntax.ArrayLiteralExpression);
    node.elements = parenthesizeListElements(NodeArray.create(elements));
    if (multiLine) node.multiLine = true;
    return node;
  }

  export function updateArrayLiteral(node: ArrayLiteralExpression, elements: readonly Expression[]) {
    return node.elements !== elements ? updateNode(createArrayLiteral(elements, node.multiLine), node) : node;
  }

  export function createObjectLiteral(properties?: readonly ObjectLiteralElementLike[], multiLine?: boolean) {
    const node = <ObjectLiteralExpression>qn.createSynthesized(Syntax.ObjectLiteralExpression);
    node.properties = NodeArray.create(properties);
    if (multiLine) node.multiLine = true;
    return node;
  }

  export function updateObjectLiteral(node: ObjectLiteralExpression, properties: readonly ObjectLiteralElementLike[]) {
    return node.properties !== properties ? updateNode(createObjectLiteral(properties, node.multiLine), node) : node;
  }

  export function createPropertyAccess(expression: Expression, name: string | Identifier | PrivateIdentifier) {
    const node = <PropertyAccessExpression>qn.createSynthesized(Syntax.PropertyAccessExpression);
    node.expression = parenthesizeForAccess(expression);
    node.name = asName(name);
    setEmitFlags(node, EmitFlags.NoIndentation);
    return node;
  }

  export function updatePropertyAccess(node: PropertyAccessExpression, expression: Expression, name: Identifier | PrivateIdentifier) {
    if (qn.is.propertyAccessChain(node)) {
      return updatePropertyAccessChain(node, expression, node.questionDotToken, cast(name, isIdentifier));
    }
    // Because we are updating existed propertyAccess we want to inherit its emitFlags
    // instead of using the default from createPropertyAccess
    return node.expression !== expression || node.name !== name ? updateNode(setEmitFlags(createPropertyAccess(expression, name), getEmitFlags(node)), node) : node;
  }

  export function createPropertyAccessChain(expression: Expression, questionDotToken: QuestionDotToken | undefined, name: string | Identifier) {
    const node = <PropertyAccessChain>qn.createSynthesized(Syntax.PropertyAccessExpression);
    node.flags |= NodeFlags.OptionalChain;
    node.expression = parenthesizeForAccess(expression);
    node.questionDotToken = questionDotToken;
    node.name = asName(name);
    setEmitFlags(node, EmitFlags.NoIndentation);
    return node;
  }

  export function updatePropertyAccessChain(node: PropertyAccessChain, expression: Expression, questionDotToken: QuestionDotToken | undefined, name: Identifier) {
    assert(!!(node.flags & NodeFlags.OptionalChain), 'Cannot update a PropertyAccessExpression using updatePropertyAccessChain. Use updatePropertyAccess instead.');
    // Because we are updating an existing PropertyAccessChain we want to inherit its emitFlags
    // instead of using the default from createPropertyAccess
    return node.expression !== expression || node.questionDotToken !== questionDotToken || node.name !== name
      ? updateNode(setEmitFlags(createPropertyAccessChain(expression, questionDotToken, name), getEmitFlags(node)), node)
      : node;
  }

  export function createElementAccess(expression: Expression, index: number | Expression) {
    const node = <ElementAccessExpression>qn.createSynthesized(Syntax.ElementAccessExpression);
    node.expression = parenthesizeForAccess(expression);
    node.argumentExpression = asExpression(index);
    return node;
  }

  export function updateElementAccess(node: ElementAccessExpression, expression: Expression, argumentExpression: Expression) {
    if (qn.is.optionalChain(node)) {
      return updateElementAccessChain(node, expression, node.questionDotToken, argumentExpression);
    }
    return node.expression !== expression || node.argumentExpression !== argumentExpression ? updateNode(createElementAccess(expression, argumentExpression), node) : node;
  }

  export function createElementAccessChain(expression: Expression, questionDotToken: QuestionDotToken | undefined, index: number | Expression) {
    const node = <ElementAccessChain>qn.createSynthesized(Syntax.ElementAccessExpression);
    node.flags |= NodeFlags.OptionalChain;
    node.expression = parenthesizeForAccess(expression);
    node.questionDotToken = questionDotToken;
    node.argumentExpression = asExpression(index);
    return node;
  }

  export function updateElementAccessChain(node: ElementAccessChain, expression: Expression, questionDotToken: QuestionDotToken | undefined, argumentExpression: Expression) {
    assert(!!(node.flags & NodeFlags.OptionalChain), 'Cannot update an ElementAccessExpression using updateElementAccessChain. Use updateElementAccess instead.');
    return node.expression !== expression || node.questionDotToken !== questionDotToken || node.argumentExpression !== argumentExpression
      ? updateNode(createElementAccessChain(expression, questionDotToken, argumentExpression), node)
      : node;
  }

  export function createCall(expression: Expression, typeArguments: readonly TypeNode[] | undefined, argumentsArray: readonly Expression[] | undefined) {
    const node = <CallExpression>qn.createSynthesized(Syntax.CallExpression);
    node.expression = parenthesizeForAccess(expression);
    node.typeArguments = NodeArray.from(typeArguments);
    node.arguments = parenthesizeListElements(NodeArray.create(argumentsArray));
    return node;
  }

  export function updateCall(node: CallExpression, expression: Expression, typeArguments: readonly TypeNode[] | undefined, argumentsArray: readonly Expression[]) {
    if (qn.is.optionalChain(node)) {
      return updateCallChain(node, expression, node.questionDotToken, typeArguments, argumentsArray);
    }
    return node.expression !== expression || node.typeArguments !== typeArguments || node.arguments !== argumentsArray ? updateNode(createCall(expression, typeArguments, argumentsArray), node) : node;
  }

  export function createCallChain(
    expression: Expression,
    questionDotToken: QuestionDotToken | undefined,
    typeArguments: readonly TypeNode[] | undefined,
    argumentsArray: readonly Expression[] | undefined
  ) {
    const node = <CallChain>qn.createSynthesized(Syntax.CallExpression);
    node.flags |= NodeFlags.OptionalChain;
    node.expression = parenthesizeForAccess(expression);
    node.questionDotToken = questionDotToken;
    node.typeArguments = NodeArray.from(typeArguments);
    node.arguments = parenthesizeListElements(NodeArray.create(argumentsArray));
    return node;
  }

  export function updateCallChain(
    node: CallChain,
    expression: Expression,
    questionDotToken: QuestionDotToken | undefined,
    typeArguments: readonly TypeNode[] | undefined,
    argumentsArray: readonly Expression[]
  ) {
    assert(!!(node.flags & NodeFlags.OptionalChain), 'Cannot update a CallExpression using updateCallChain. Use updateCall instead.');
    return node.expression !== expression || node.questionDotToken !== questionDotToken || node.typeArguments !== typeArguments || node.arguments !== argumentsArray
      ? updateNode(createCallChain(expression, questionDotToken, typeArguments, argumentsArray), node)
      : node;
  }

  export function createNew(expression: Expression, typeArguments: readonly TypeNode[] | undefined, argumentsArray: readonly Expression[] | undefined) {
    const node = <NewExpression>qn.createSynthesized(Syntax.NewExpression);
    node.expression = parenthesizeForNew(expression);
    node.typeArguments = NodeArray.from(typeArguments);
    node.arguments = argumentsArray ? parenthesizeListElements(NodeArray.create(argumentsArray)) : undefined;
    return node;
  }

  export function updateNew(node: NewExpression, expression: Expression, typeArguments: readonly TypeNode[] | undefined, argumentsArray: readonly Expression[] | undefined) {
    return node.expression !== expression || node.typeArguments !== typeArguments || node.arguments !== argumentsArray ? updateNode(createNew(expression, typeArguments, argumentsArray), node) : node;
  }

  /** @deprecated */ export function createTaggedTemplate(tag: Expression, template: TemplateLiteral): TaggedTemplateExpression;
  export function createTaggedTemplate(tag: Expression, typeArguments: readonly TypeNode[] | undefined, template: TemplateLiteral): TaggedTemplateExpression;

  export function createTaggedTemplate(tag: Expression, typeArgumentsOrTemplate: readonly TypeNode[] | TemplateLiteral | undefined, template?: TemplateLiteral): TaggedTemplateExpression;
  export function createTaggedTemplate(tag: Expression, typeArgumentsOrTemplate: readonly TypeNode[] | TemplateLiteral | undefined, template?: TemplateLiteral) {
    const node = <TaggedTemplateExpression>qn.createSynthesized(Syntax.TaggedTemplateExpression);
    node.tag = parenthesizeForAccess(tag);
    if (template) {
      node.typeArguments = NodeArray.from(typeArgumentsOrTemplate as readonly TypeNode[]);
      node.template = template;
    } else {
      node.typeArguments = undefined;
      node.template = typeArgumentsOrTemplate as TemplateLiteral;
    }
    return node;
  }

  /** @deprecated */ export function updateTaggedTemplate(node: TaggedTemplateExpression, tag: Expression, template: TemplateLiteral): TaggedTemplateExpression;
  export function updateTaggedTemplate(node: TaggedTemplateExpression, tag: Expression, typeArguments: readonly TypeNode[] | undefined, template: TemplateLiteral): TaggedTemplateExpression;
  export function updateTaggedTemplate(node: TaggedTemplateExpression, tag: Expression, typeArgumentsOrTemplate: readonly TypeNode[] | TemplateLiteral | undefined, template?: TemplateLiteral) {
    return node.tag !== tag || (template ? node.typeArguments !== typeArgumentsOrTemplate || node.template !== template : node.typeArguments !== undefined || node.template !== typeArgumentsOrTemplate)
      ? updateNode(createTaggedTemplate(tag, typeArgumentsOrTemplate, template), node)
      : node;
  }

  export function createTypeAssertion(type: TypeNode, expression: Expression) {
    const node = <TypeAssertion>qn.createSynthesized(Syntax.TypeAssertionExpression);
    node.type = type;
    node.expression = parenthesizePrefixOperand(expression);
    return node;
  }

  export function updateTypeAssertion(node: TypeAssertion, type: TypeNode, expression: Expression) {
    return node.type !== type || node.expression !== expression ? updateNode(createTypeAssertion(type, expression), node) : node;
  }

  export function createParen(expression: Expression) {
    const node = <ParenthesizedExpression>qn.createSynthesized(Syntax.ParenthesizedExpression);
    node.expression = expression;
    return node;
  }

  export function updateParen(node: ParenthesizedExpression, expression: Expression) {
    return node.expression !== expression ? updateNode(createParen(expression), node) : node;
  }

  export function createFunctionExpression(
    modifiers: readonly Modifier[] | undefined,
    asteriskToken: AsteriskToken | undefined,
    name: string | Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    parameters: readonly ParameterDeclaration[] | undefined,
    type: TypeNode | undefined,
    body: Block
  ) {
    const node = <FunctionExpression>qn.createSynthesized(Syntax.FunctionExpression);
    node.modifiers = NodeArray.from(modifiers);
    node.asteriskToken = asteriskToken;
    node.name = asName(name);
    node.typeParameters = NodeArray.from(typeParameters);
    node.parameters = NodeArray.create(parameters);
    node.type = type;
    node.body = body;
    return node;
  }

  export function updateFunctionExpression(
    node: FunctionExpression,
    modifiers: readonly Modifier[] | undefined,
    asteriskToken: AsteriskToken | undefined,
    name: Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    parameters: readonly ParameterDeclaration[],
    type: TypeNode | undefined,
    body: Block
  ) {
    return node.name !== name ||
      node.modifiers !== modifiers ||
      node.asteriskToken !== asteriskToken ||
      node.typeParameters !== typeParameters ||
      node.parameters !== parameters ||
      node.type !== type ||
      node.body !== body
      ? updateNode(createFunctionExpression(modifiers, asteriskToken, name, typeParameters, parameters, type, body), node)
      : node;
  }

  export function createArrowFunction(
    modifiers: readonly Modifier[] | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    parameters: readonly ParameterDeclaration[],
    type: TypeNode | undefined,
    equalsGreaterThanToken: EqualsGreaterThanToken | undefined,
    body: ConciseBody
  ) {
    const node = <ArrowFunction>qn.createSynthesized(Syntax.ArrowFunction);
    node.modifiers = NodeArray.from(modifiers);
    node.typeParameters = NodeArray.from(typeParameters);
    node.parameters = NodeArray.create(parameters);
    node.type = type;
    node.equalsGreaterThanToken = equalsGreaterThanToken || createToken(Syntax.EqualsGreaterThanToken);
    node.body = parenthesizeConciseBody(body);
    return node;
  }
  export function updateArrowFunction(
    node: ArrowFunction,
    modifiers: readonly Modifier[] | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    parameters: readonly ParameterDeclaration[],
    type: TypeNode | undefined,
    equalsGreaterThanToken: Token<Syntax.EqualsGreaterThanToken>,
    body: ConciseBody
  ): ArrowFunction {
    return node.modifiers !== modifiers ||
      node.typeParameters !== typeParameters ||
      node.parameters !== parameters ||
      node.type !== type ||
      node.equalsGreaterThanToken !== equalsGreaterThanToken ||
      node.body !== body
      ? updateNode(createArrowFunction(modifiers, typeParameters, parameters, type, equalsGreaterThanToken, body), node)
      : node;
  }

  export function createDelete(expression: Expression) {
    const node = <DeleteExpression>qn.createSynthesized(Syntax.DeleteExpression);
    node.expression = parenthesizePrefixOperand(expression);
    return node;
  }

  export function updateDelete(node: DeleteExpression, expression: Expression) {
    return node.expression !== expression ? updateNode(createDelete(expression), node) : node;
  }

  export function createTypeOf(expression: Expression) {
    const node = <TypeOfExpression>qn.createSynthesized(Syntax.TypeOfExpression);
    node.expression = parenthesizePrefixOperand(expression);
    return node;
  }

  export function updateTypeOf(node: TypeOfExpression, expression: Expression) {
    return node.expression !== expression ? updateNode(createTypeOf(expression), node) : node;
  }

  export function createVoid(expression: Expression) {
    const node = <VoidExpression>qn.createSynthesized(Syntax.VoidExpression);
    node.expression = parenthesizePrefixOperand(expression);
    return node;
  }

  export function updateVoid(node: VoidExpression, expression: Expression) {
    return node.expression !== expression ? updateNode(createVoid(expression), node) : node;
  }

  export function createAwait(expression: Expression) {
    const node = <AwaitExpression>qn.createSynthesized(Syntax.AwaitExpression);
    node.expression = parenthesizePrefixOperand(expression);
    return node;
  }

  export function updateAwait(node: AwaitExpression, expression: Expression) {
    return node.expression !== expression ? updateNode(createAwait(expression), node) : node;
  }

  export function createPrefix(operator: PrefixUnaryOperator, operand: Expression) {
    const node = <PrefixUnaryExpression>qn.createSynthesized(Syntax.PrefixUnaryExpression);
    node.operator = operator;
    node.operand = parenthesizePrefixOperand(operand);
    return node;
  }

  export function updatePrefix(node: PrefixUnaryExpression, operand: Expression) {
    return node.operand !== operand ? updateNode(createPrefix(node.operator, operand), node) : node;
  }

  export function createPostfix(operand: Expression, operator: PostfixUnaryOperator) {
    const node = <PostfixUnaryExpression>qn.createSynthesized(Syntax.PostfixUnaryExpression);
    node.operand = parenthesizePostfixOperand(operand);
    node.operator = operator;
    return node;
  }

  export function updatePostfix(node: PostfixUnaryExpression, operand: Expression) {
    return node.operand !== operand ? updateNode(createPostfix(operand, node.operator), node) : node;
  }

  export function createBinary(left: Expression, operator: BinaryOperator | BinaryOperatorToken, right: Expression) {
    const node = <BinaryExpression>qn.createSynthesized(Syntax.BinaryExpression);
    const operatorToken = asToken(operator);
    const operatorKind = operatorToken.kind;
    node.left = parenthesizeBinaryOperand(operatorKind, left, /*isLeftSideOfBinary*/ true, /*leftOperand*/ undefined);
    node.operatorToken = operatorToken;
    node.right = parenthesizeBinaryOperand(operatorKind, right, /*isLeftSideOfBinary*/ false, node.left);
    return node;
  }

  export function updateBinary(node: BinaryExpression, left: Expression, right: Expression, operator: BinaryOperator | BinaryOperatorToken = node.operatorToken) {
    return node.left !== left || node.right !== right || node.operatorToken !== operator ? updateNode(createBinary(left, operator, right), node) : node;
  }

  /** @deprecated */ export function createConditional(condition: Expression, whenTrue: Expression, whenFalse: Expression): ConditionalExpression;
  export function createConditional(condition: Expression, questionToken: QuestionToken, whenTrue: Expression, colonToken: ColonToken, whenFalse: Expression): ConditionalExpression;
  export function createConditional(condition: Expression, questionTokenOrWhenTrue: QuestionToken | Expression, whenTrueOrWhenFalse: Expression, colonToken?: ColonToken, whenFalse?: Expression) {
    const node = <ConditionalExpression>qn.createSynthesized(Syntax.ConditionalExpression);
    node.condition = parenthesizeForConditionalHead(condition);
    node.questionToken = whenFalse ? <QuestionToken>questionTokenOrWhenTrue : createToken(Syntax.QuestionToken);
    node.whenTrue = parenthesizeSubexpressionOfConditionalExpression(whenFalse ? whenTrueOrWhenFalse : <Expression>questionTokenOrWhenTrue);
    node.colonToken = whenFalse ? colonToken! : createToken(Syntax.ColonToken);
    node.whenFalse = parenthesizeSubexpressionOfConditionalExpression(whenFalse ? whenFalse : whenTrueOrWhenFalse);
    return node;
  }
  export function updateConditional(
    node: ConditionalExpression,
    condition: Expression,
    questionToken: Token<Syntax.QuestionToken>,
    whenTrue: Expression,
    colonToken: Token<Syntax.ColonToken>,
    whenFalse: Expression
  ): ConditionalExpression {
    return node.condition !== condition || node.questionToken !== questionToken || node.whenTrue !== whenTrue || node.colonToken !== colonToken || node.whenFalse !== whenFalse
      ? updateNode(createConditional(condition, questionToken, whenTrue, colonToken, whenFalse), node)
      : node;
  }

  export function createTemplateExpression(head: TemplateHead, templateSpans: readonly TemplateSpan[]) {
    const node = <TemplateExpression>qn.createSynthesized(Syntax.TemplateExpression);
    node.head = head;
    node.templateSpans = NodeArray.create(templateSpans);
    return node;
  }

  export function updateTemplateExpression(node: TemplateExpression, head: TemplateHead, templateSpans: readonly TemplateSpan[]) {
    return node.head !== head || node.templateSpans !== templateSpans ? updateNode(createTemplateExpression(head, templateSpans), node) : node;
  }

  export function createYield(expression?: Expression): YieldExpression;
  export function createYield(asteriskToken: AsteriskToken | undefined, expression: Expression): YieldExpression;
  export function createYield(asteriskTokenOrExpression?: AsteriskToken | undefined | Expression, expression?: Expression) {
    const asteriskToken = asteriskTokenOrExpression && asteriskTokenOrExpression.kind === Syntax.AsteriskToken ? <AsteriskToken>asteriskTokenOrExpression : undefined;
    expression = asteriskTokenOrExpression && asteriskTokenOrExpression.kind !== Syntax.AsteriskToken ? asteriskTokenOrExpression : expression;
    const node = <YieldExpression>qn.createSynthesized(Syntax.YieldExpression);
    node.asteriskToken = asteriskToken;
    node.expression = expression && parenthesizeExpressionForList(expression);
    return node;
  }

  export function updateYield(node: YieldExpression, asteriskToken: AsteriskToken | undefined, expression: Expression) {
    return node.expression !== expression || node.asteriskToken !== asteriskToken ? updateNode(createYield(asteriskToken, expression), node) : node;
  }

  export function createSpread(expression: Expression) {
    const node = <SpreadElement>qn.createSynthesized(Syntax.SpreadElement);
    node.expression = parenthesizeExpressionForList(expression);
    return node;
  }

  export function updateSpread(node: SpreadElement, expression: Expression) {
    return node.expression !== expression ? updateNode(createSpread(expression), node) : node;
  }

  export function createClassExpression(
    modifiers: readonly Modifier[] | undefined,
    name: string | Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    heritageClauses: readonly HeritageClause[] | undefined,
    members: readonly ClassElement[]
  ) {
    const node = <ClassExpression>qn.createSynthesized(Syntax.ClassExpression);
    node.decorators = undefined;
    node.modifiers = NodeArray.from(modifiers);
    node.name = asName(name);
    node.typeParameters = NodeArray.from(typeParameters);
    node.heritageClauses = NodeArray.from(heritageClauses);
    node.members = NodeArray.create(members);
    return node;
  }

  export function updateClassExpression(
    node: ClassExpression,
    modifiers: readonly Modifier[] | undefined,
    name: Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    heritageClauses: readonly HeritageClause[] | undefined,
    members: readonly ClassElement[]
  ) {
    return node.modifiers !== modifiers || node.name !== name || node.typeParameters !== typeParameters || node.heritageClauses !== heritageClauses || node.members !== members
      ? updateNode(createClassExpression(modifiers, name, typeParameters, heritageClauses, members), node)
      : node;
  }

  export function createOmittedExpression() {
    return <OmittedExpression>qn.createSynthesized(Syntax.OmittedExpression);
  }

  export function createExpressionWithTypeArguments(typeArguments: readonly TypeNode[] | undefined, expression: Expression) {
    const node = <ExpressionWithTypeArguments>qn.createSynthesized(Syntax.ExpressionWithTypeArguments);
    node.expression = parenthesizeForAccess(expression);
    node.typeArguments = NodeArray.from(typeArguments);
    return node;
  }

  export function updateExpressionWithTypeArguments(node: ExpressionWithTypeArguments, typeArguments: readonly TypeNode[] | undefined, expression: Expression) {
    return node.typeArguments !== typeArguments || node.expression !== expression ? updateNode(createExpressionWithTypeArguments(typeArguments, expression), node) : node;
  }

  export function createAsExpression(expression: Expression, type: TypeNode) {
    const node = <AsExpression>qn.createSynthesized(Syntax.AsExpression);
    node.expression = expression;
    node.type = type;
    return node;
  }

  export function updateAsExpression(node: AsExpression, expression: Expression, type: TypeNode) {
    return node.expression !== expression || node.type !== type ? updateNode(createAsExpression(expression, type), node) : node;
  }

  export function createNonNullExpression(expression: Expression) {
    const node = <NonNullExpression>qn.createSynthesized(Syntax.NonNullExpression);
    node.expression = parenthesizeForAccess(expression);
    return node;
  }

  export function updateNonNullExpression(node: NonNullExpression, expression: Expression) {
    if (qn.is.nonNullChain(node)) {
      return updateNonNullChain(node, expression);
    }
    return node.expression !== expression ? updateNode(createNonNullExpression(expression), node) : node;
  }

  export function createNonNullChain(expression: Expression) {
    const node = <NonNullChain>qn.createSynthesized(Syntax.NonNullExpression);
    node.flags |= NodeFlags.OptionalChain;
    node.expression = parenthesizeForAccess(expression);
    return node;
  }

  export function updateNonNullChain(node: NonNullChain, expression: Expression) {
    assert(!!(node.flags & NodeFlags.OptionalChain), 'Cannot update a NonNullExpression using updateNonNullChain. Use updateNonNullExpression instead.');
    return node.expression !== expression ? updateNode(createNonNullChain(expression), node) : node;
  }

  export function createMetaProperty(keywordToken: MetaProperty['keywordToken'], name: Identifier) {
    const node = <MetaProperty>qn.createSynthesized(Syntax.MetaProperty);
    node.keywordToken = keywordToken;
    node.name = name;
    return node;
  }

  export function updateMetaProperty(node: MetaProperty, name: Identifier) {
    return node.name !== name ? updateNode(createMetaProperty(node.keywordToken, name), node) : node;
  }

  // Misc

  export function createTemplateSpan(expression: Expression, literal: TemplateMiddle | TemplateTail) {
    const node = <TemplateSpan>qn.createSynthesized(Syntax.TemplateSpan);
    node.expression = expression;
    node.literal = literal;
    return node;
  }

  export function updateTemplateSpan(node: TemplateSpan, expression: Expression, literal: TemplateMiddle | TemplateTail) {
    return node.expression !== expression || node.literal !== literal ? updateNode(createTemplateSpan(expression, literal), node) : node;
  }

  export function createSemicolonClassElement() {
    return <SemicolonClassElement>qn.createSynthesized(Syntax.SemicolonClassElement);
  }

  // Element

  export function createBlock(statements: readonly Statement[], multiLine?: boolean): Block {
    const block = <Block>qn.createSynthesized(Syntax.Block);
    block.statements = NodeArray.create(statements);
    if (multiLine) block.multiLine = multiLine;
    return block;
  }

  export function updateBlock(node: Block, statements: readonly Statement[]) {
    return node.statements !== statements ? updateNode(createBlock(statements, node.multiLine), node) : node;
  }

  export function createVariableStatement(modifiers: readonly Modifier[] | undefined, declarationList: VariableDeclarationList | readonly VariableDeclaration[]) {
    const node = <VariableStatement>qn.createSynthesized(Syntax.VariableStatement);
    node.decorators = undefined;
    node.modifiers = NodeArray.from(modifiers);
    node.declarationList = isArray(declarationList) ? createVariableDeclarationList(declarationList) : declarationList;
    return node;
  }

  export function updateVariableStatement(node: VariableStatement, modifiers: readonly Modifier[] | undefined, declarationList: VariableDeclarationList) {
    return node.modifiers !== modifiers || node.declarationList !== declarationList ? updateNode(createVariableStatement(modifiers, declarationList), node) : node;
  }

  export function createEmptyStatement() {
    return <EmptyStatement>qn.createSynthesized(Syntax.EmptyStatement);
  }

  export function createExpressionStatement(expression: Expression): ExpressionStatement {
    const node = <ExpressionStatement>qn.createSynthesized(Syntax.ExpressionStatement);
    node.expression = parenthesizeExpressionForExpressionStatement(expression);
    return node;
  }

  export function updateExpressionStatement(node: ExpressionStatement, expression: Expression) {
    return node.expression !== expression ? updateNode(createExpressionStatement(expression), node) : node;
  }

  /** @deprecated Use `createExpressionStatement` instead.  */
  export const createStatement = createExpressionStatement;
  /** @deprecated Use `updateExpressionStatement` instead.  */
  export const updateStatement = updateExpressionStatement;

  export function createIf(expression: Expression, thenStatement: Statement, elseStatement?: Statement) {
    const node = <IfStatement>qn.createSynthesized(Syntax.IfStatement);
    node.expression = expression;
    node.thenStatement = asEmbeddedStatement(thenStatement);
    node.elseStatement = asEmbeddedStatement(elseStatement);
    return node;
  }

  export function updateIf(node: IfStatement, expression: Expression, thenStatement: Statement, elseStatement: Statement | undefined) {
    return node.expression !== expression || node.thenStatement !== thenStatement || node.elseStatement !== elseStatement ? updateNode(createIf(expression, thenStatement, elseStatement), node) : node;
  }

  export function createDo(statement: Statement, expression: Expression) {
    const node = <DoStatement>qn.createSynthesized(Syntax.DoStatement);
    node.statement = asEmbeddedStatement(statement);
    node.expression = expression;
    return node;
  }

  export function updateDo(node: DoStatement, statement: Statement, expression: Expression) {
    return node.statement !== statement || node.expression !== expression ? updateNode(createDo(statement, expression), node) : node;
  }

  export function createWhile(expression: Expression, statement: Statement) {
    const node = <WhileStatement>qn.createSynthesized(Syntax.WhileStatement);
    node.expression = expression;
    node.statement = asEmbeddedStatement(statement);
    return node;
  }

  export function updateWhile(node: WhileStatement, expression: Expression, statement: Statement) {
    return node.expression !== expression || node.statement !== statement ? updateNode(createWhile(expression, statement), node) : node;
  }

  export function createFor(initializer: ForInitializer | undefined, condition: Expression | undefined, incrementor: Expression | undefined, statement: Statement) {
    const node = <ForStatement>qn.createSynthesized(Syntax.ForStatement);
    node.initializer = initializer;
    node.condition = condition;
    node.incrementor = incrementor;
    node.statement = asEmbeddedStatement(statement);
    return node;
  }

  export function updateFor(node: ForStatement, initializer: ForInitializer | undefined, condition: Expression | undefined, incrementor: Expression | undefined, statement: Statement) {
    return node.initializer !== initializer || node.condition !== condition || node.incrementor !== incrementor || node.statement !== statement
      ? updateNode(createFor(initializer, condition, incrementor, statement), node)
      : node;
  }

  export function createForIn(initializer: ForInitializer, expression: Expression, statement: Statement) {
    const node = <ForInStatement>qn.createSynthesized(Syntax.ForInStatement);
    node.initializer = initializer;
    node.expression = expression;
    node.statement = asEmbeddedStatement(statement);
    return node;
  }

  export function updateForIn(node: ForInStatement, initializer: ForInitializer, expression: Expression, statement: Statement) {
    return node.initializer !== initializer || node.expression !== expression || node.statement !== statement ? updateNode(createForIn(initializer, expression, statement), node) : node;
  }

  export function createForOf(awaitModifier: AwaitKeywordToken | undefined, initializer: ForInitializer, expression: Expression, statement: Statement) {
    const node = <ForOfStatement>qn.createSynthesized(Syntax.ForOfStatement);
    node.awaitModifier = awaitModifier;
    node.initializer = initializer;
    node.expression = isCommaSequence(expression) ? createParen(expression) : expression;
    node.statement = asEmbeddedStatement(statement);
    return node;
  }

  export function updateForOf(node: ForOfStatement, awaitModifier: AwaitKeywordToken | undefined, initializer: ForInitializer, expression: Expression, statement: Statement) {
    return node.awaitModifier !== awaitModifier || node.initializer !== initializer || node.expression !== expression || node.statement !== statement
      ? updateNode(createForOf(awaitModifier, initializer, expression, statement), node)
      : node;
  }

  export function createContinue(label?: string | Identifier): ContinueStatement {
    const node = <ContinueStatement>qn.createSynthesized(Syntax.ContinueStatement);
    node.label = asName(label);
    return node;
  }

  export function updateContinue(node: ContinueStatement, label: Identifier | undefined) {
    return node.label !== label ? updateNode(createContinue(label), node) : node;
  }

  export function createBreak(label?: string | Identifier): BreakStatement {
    const node = <BreakStatement>qn.createSynthesized(Syntax.BreakStatement);
    node.label = asName(label);
    return node;
  }

  export function updateBreak(node: BreakStatement, label: Identifier | undefined) {
    return node.label !== label ? updateNode(createBreak(label), node) : node;
  }

  export function createReturn(expression?: Expression): ReturnStatement {
    const node = <ReturnStatement>qn.createSynthesized(Syntax.ReturnStatement);
    node.expression = expression;
    return node;
  }

  export function updateReturn(node: ReturnStatement, expression: Expression | undefined) {
    return node.expression !== expression ? updateNode(createReturn(expression), node) : node;
  }

  export function createWith(expression: Expression, statement: Statement) {
    const node = <WithStatement>qn.createSynthesized(Syntax.WithStatement);
    node.expression = expression;
    node.statement = asEmbeddedStatement(statement);
    return node;
  }

  export function updateWith(node: WithStatement, expression: Expression, statement: Statement) {
    return node.expression !== expression || node.statement !== statement ? updateNode(createWith(expression, statement), node) : node;
  }

  export function createSwitch(expression: Expression, caseBlock: CaseBlock): SwitchStatement {
    const node = <SwitchStatement>qn.createSynthesized(Syntax.SwitchStatement);
    node.expression = parenthesizeExpressionForList(expression);
    node.caseBlock = caseBlock;
    return node;
  }

  export function updateSwitch(node: SwitchStatement, expression: Expression, caseBlock: CaseBlock) {
    return node.expression !== expression || node.caseBlock !== caseBlock ? updateNode(createSwitch(expression, caseBlock), node) : node;
  }

  export function createLabel(label: string | Identifier, statement: Statement) {
    const node = <LabeledStatement>qn.createSynthesized(Syntax.LabeledStatement);
    node.label = asName(label);
    node.statement = asEmbeddedStatement(statement);
    return node;
  }

  export function updateLabel(node: LabeledStatement, label: Identifier, statement: Statement) {
    return node.label !== label || node.statement !== statement ? updateNode(createLabel(label, statement), node) : node;
  }

  export function createThrow(expression: Expression) {
    const node = <ThrowStatement>qn.createSynthesized(Syntax.ThrowStatement);
    node.expression = expression;
    return node;
  }

  export function updateThrow(node: ThrowStatement, expression: Expression) {
    return node.expression !== expression ? updateNode(createThrow(expression), node) : node;
  }

  export function createTry(tryBlock: Block, catchClause: CatchClause | undefined, finallyBlock: Block | undefined) {
    const node = <TryStatement>qn.createSynthesized(Syntax.TryStatement);
    node.tryBlock = tryBlock;
    node.catchClause = catchClause;
    node.finallyBlock = finallyBlock;
    return node;
  }

  export function updateTry(node: TryStatement, tryBlock: Block, catchClause: CatchClause | undefined, finallyBlock: Block | undefined) {
    return node.tryBlock !== tryBlock || node.catchClause !== catchClause || node.finallyBlock !== finallyBlock ? updateNode(createTry(tryBlock, catchClause, finallyBlock), node) : node;
  }

  export function createDebuggerStatement() {
    return <DebuggerStatement>qn.createSynthesized(Syntax.DebuggerStatement);
  }

  export function createVariableDeclaration(name: string | BindingName, type?: TypeNode, initializer?: Expression) {
    /* Internally, one should probably use createTypeScriptVariableDeclaration instead and handle definite assignment assertions */
    const node = <VariableDeclaration>qn.createSynthesized(Syntax.VariableDeclaration);
    node.name = asName(name);
    node.type = type;
    node.initializer = initializer !== undefined ? parenthesizeExpressionForList(initializer) : undefined;
    return node;
  }

  export function updateVariableDeclaration(node: VariableDeclaration, name: BindingName, type: TypeNode | undefined, initializer: Expression | undefined) {
    /* Internally, one should probably use updateTypeScriptVariableDeclaration instead and handle definite assignment assertions */
    return node.name !== name || node.type !== type || node.initializer !== initializer ? updateNode(createVariableDeclaration(name, type, initializer), node) : node;
  }

  export function createTypeScriptVariableDeclaration(name: string | BindingName, exclaimationToken?: Token<Syntax.ExclamationToken>, type?: TypeNode, initializer?: Expression) {
    const node = <VariableDeclaration>qn.createSynthesized(Syntax.VariableDeclaration);
    node.name = asName(name);
    node.type = type;
    node.initializer = initializer !== undefined ? parenthesizeExpressionForList(initializer) : undefined;
    node.exclamationToken = exclaimationToken;
    return node;
  }

  export function updateTypeScriptVariableDeclaration(
    node: VariableDeclaration,
    name: BindingName,
    exclaimationToken: Token<Syntax.ExclamationToken> | undefined,
    type: TypeNode | undefined,
    initializer: Expression | undefined
  ) {
    return node.name !== name || node.type !== type || node.initializer !== initializer || node.exclamationToken !== exclaimationToken
      ? updateNode(createTypeScriptVariableDeclaration(name, exclaimationToken, type, initializer), node)
      : node;
  }

  export function createVariableDeclarationList(declarations: readonly VariableDeclaration[], flags = NodeFlags.None) {
    const node = <VariableDeclarationList>qn.createSynthesized(Syntax.VariableDeclarationList);
    node.flags |= flags & NodeFlags.BlockScoped;
    node.declarations = NodeArray.create(declarations);
    return node;
  }

  export function updateVariableDeclarationList(node: VariableDeclarationList, declarations: readonly VariableDeclaration[]) {
    return node.declarations !== declarations ? updateNode(createVariableDeclarationList(declarations, node.flags), node) : node;
  }

  export function createFunctionDeclaration(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    asteriskToken: AsteriskToken | undefined,
    name: string | Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    parameters: readonly ParameterDeclaration[],
    type: TypeNode | undefined,
    body: Block | undefined
  ) {
    const node = <FunctionDeclaration>qn.createSynthesized(Syntax.FunctionDeclaration);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.asteriskToken = asteriskToken;
    node.name = asName(name);
    node.typeParameters = NodeArray.from(typeParameters);
    node.parameters = NodeArray.create(parameters);
    node.type = type;
    node.body = body;
    return node;
  }

  export function updateFunctionDeclaration(
    node: FunctionDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    asteriskToken: AsteriskToken | undefined,
    name: Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    parameters: readonly ParameterDeclaration[],
    type: TypeNode | undefined,
    body: Block | undefined
  ) {
    return node.decorators !== decorators ||
      node.modifiers !== modifiers ||
      node.asteriskToken !== asteriskToken ||
      node.name !== name ||
      node.typeParameters !== typeParameters ||
      node.parameters !== parameters ||
      node.type !== type ||
      node.body !== body
      ? updateNode(createFunctionDeclaration(decorators, modifiers, asteriskToken, name, typeParameters, parameters, type, body), node)
      : node;
  }

  export function updateFunctionLikeBody(declaration: FunctionLikeDeclaration, body: Block): FunctionLikeDeclaration {
    switch (declaration.kind) {
      case Syntax.FunctionDeclaration:
        return createFunctionDeclaration(
          declaration.decorators,
          declaration.modifiers,
          declaration.asteriskToken,
          declaration.name,
          declaration.typeParameters,
          declaration.parameters,
          declaration.type,
          body
        );
      case Syntax.MethodDeclaration:
        return MethodDeclaration.create(
          declaration.decorators,
          declaration.modifiers,
          declaration.asteriskToken,
          declaration.name,
          declaration.questionToken,
          declaration.typeParameters,
          declaration.parameters,
          declaration.type,
          body
        );
      case Syntax.GetAccessor:
        return GetAccessorDeclaration.create(declaration.decorators, declaration.modifiers, declaration.name, declaration.parameters, declaration.type, body);
      case Syntax.SetAccessor:
        return SetAccessorDeclaration.create(declaration.decorators, declaration.modifiers, declaration.name, declaration.parameters, body);
      case Syntax.Constructor:
        return ConstructorDeclaration.create(declaration.decorators, declaration.modifiers, declaration.parameters, body);
      case Syntax.FunctionExpression:
        return createFunctionExpression(declaration.modifiers, declaration.asteriskToken, declaration.name, declaration.typeParameters, declaration.parameters, declaration.type, body);
      case Syntax.ArrowFunction:
        return createArrowFunction(declaration.modifiers, declaration.typeParameters, declaration.parameters, declaration.type, declaration.equalsGreaterThanToken, body);
    }
  }

  export function createClassDeclaration(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: string | Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    heritageClauses: readonly HeritageClause[] | undefined,
    members: readonly ClassElement[]
  ) {
    const node = <ClassDeclaration>qn.createSynthesized(Syntax.ClassDeclaration);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.name = asName(name);
    node.typeParameters = NodeArray.from(typeParameters);
    node.heritageClauses = NodeArray.from(heritageClauses);
    node.members = NodeArray.create(members);
    return node;
  }

  export function updateClassDeclaration(
    node: ClassDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    heritageClauses: readonly HeritageClause[] | undefined,
    members: readonly ClassElement[]
  ) {
    return node.decorators !== decorators ||
      node.modifiers !== modifiers ||
      node.name !== name ||
      node.typeParameters !== typeParameters ||
      node.heritageClauses !== heritageClauses ||
      node.members !== members
      ? updateNode(createClassDeclaration(decorators, modifiers, name, typeParameters, heritageClauses, members), node)
      : node;
  }

  export function createInterfaceDeclaration(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: string | Identifier,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    heritageClauses: readonly HeritageClause[] | undefined,
    members: readonly TypeElement[]
  ) {
    const node = <InterfaceDeclaration>qn.createSynthesized(Syntax.InterfaceDeclaration);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.name = asName(name);
    node.typeParameters = NodeArray.from(typeParameters);
    node.heritageClauses = NodeArray.from(heritageClauses);
    node.members = NodeArray.create(members);
    return node;
  }

  export function updateInterfaceDeclaration(
    node: InterfaceDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: Identifier,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    heritageClauses: readonly HeritageClause[] | undefined,
    members: readonly TypeElement[]
  ) {
    return node.decorators !== decorators ||
      node.modifiers !== modifiers ||
      node.name !== name ||
      node.typeParameters !== typeParameters ||
      node.heritageClauses !== heritageClauses ||
      node.members !== members
      ? updateNode(createInterfaceDeclaration(decorators, modifiers, name, typeParameters, heritageClauses, members), node)
      : node;
  }

  export function createTypeAliasDeclaration(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: string | Identifier,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    type: TypeNode
  ) {
    const node = <TypeAliasDeclaration>qn.createSynthesized(Syntax.TypeAliasDeclaration);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.name = asName(name);
    node.typeParameters = NodeArray.from(typeParameters);
    node.type = type;
    return node;
  }

  export function updateTypeAliasDeclaration(
    node: TypeAliasDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: Identifier,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    type: TypeNode
  ) {
    return node.decorators !== decorators || node.modifiers !== modifiers || node.name !== name || node.typeParameters !== typeParameters || node.type !== type
      ? updateNode(createTypeAliasDeclaration(decorators, modifiers, name, typeParameters, type), node)
      : node;
  }

  export function createEnumDeclaration(decorators: readonly Decorator[] | undefined, modifiers: readonly Modifier[] | undefined, name: string | Identifier, members: readonly EnumMember[]) {
    const node = <EnumDeclaration>qn.createSynthesized(Syntax.EnumDeclaration);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.name = asName(name);
    node.members = NodeArray.create(members);
    return node;
  }

  export function updateEnumDeclaration(
    node: EnumDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: Identifier,
    members: readonly EnumMember[]
  ) {
    return node.decorators !== decorators || node.modifiers !== modifiers || node.name !== name || node.members !== members
      ? updateNode(createEnumDeclaration(decorators, modifiers, name, members), node)
      : node;
  }

  export function createModuleDeclaration(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: ModuleName,
    body: ModuleBody | undefined,
    flags = NodeFlags.None
  ) {
    const node = <ModuleDeclaration>qn.createSynthesized(Syntax.ModuleDeclaration);
    node.flags |= flags & (NodeFlags.Namespace | NodeFlags.NestedNamespace | NodeFlags.GlobalAugmentation);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.name = name;
    node.body = body;
    return node;
  }

  export function updateModuleDeclaration(
    node: ModuleDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: ModuleName,
    body: ModuleBody | undefined
  ) {
    return node.decorators !== decorators || node.modifiers !== modifiers || node.name !== name || node.body !== body
      ? updateNode(createModuleDeclaration(decorators, modifiers, name, body, node.flags), node)
      : node;
  }

  export function createModuleBlock(statements: readonly Statement[]) {
    const node = <ModuleBlock>qn.createSynthesized(Syntax.ModuleBlock);
    node.statements = NodeArray.create(statements);
    return node;
  }

  export function updateModuleBlock(node: ModuleBlock, statements: readonly Statement[]) {
    return node.statements !== statements ? updateNode(createModuleBlock(statements), node) : node;
  }

  export function createCaseBlock(clauses: readonly CaseOrDefaultClause[]): CaseBlock {
    const node = <CaseBlock>qn.createSynthesized(Syntax.CaseBlock);
    node.clauses = NodeArray.create(clauses);
    return node;
  }

  export function updateCaseBlock(node: CaseBlock, clauses: readonly CaseOrDefaultClause[]) {
    return node.clauses !== clauses ? updateNode(createCaseBlock(clauses), node) : node;
  }

  export function createNamespaceExportDeclaration(name: string | Identifier) {
    const node = <NamespaceExportDeclaration>qn.createSynthesized(Syntax.NamespaceExportDeclaration);
    node.name = asName(name);
    return node;
  }

  export function updateNamespaceExportDeclaration(node: NamespaceExportDeclaration, name: Identifier) {
    return node.name !== name ? updateNode(createNamespaceExportDeclaration(name), node) : node;
  }

  export function createImportEqualsDeclaration(decorators: readonly Decorator[] | undefined, modifiers: readonly Modifier[] | undefined, name: string | Identifier, moduleReference: ModuleReference) {
    const node = <ImportEqualsDeclaration>qn.createSynthesized(Syntax.ImportEqualsDeclaration);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.name = asName(name);
    node.moduleReference = moduleReference;
    return node;
  }

  export function updateImportEqualsDeclaration(
    node: ImportEqualsDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: Identifier,
    moduleReference: ModuleReference
  ) {
    return node.decorators !== decorators || node.modifiers !== modifiers || node.name !== name || node.moduleReference !== moduleReference
      ? updateNode(createImportEqualsDeclaration(decorators, modifiers, name, moduleReference), node)
      : node;
  }

  export function createImportDeclaration(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    importClause: ImportClause | undefined,
    moduleSpecifier: Expression
  ): ImportDeclaration {
    const node = <ImportDeclaration>qn.createSynthesized(Syntax.ImportDeclaration);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.importClause = importClause;
    node.moduleSpecifier = moduleSpecifier;
    return node;
  }

  export function updateImportDeclaration(
    node: ImportDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    importClause: ImportClause | undefined,
    moduleSpecifier: Expression
  ) {
    return node.decorators !== decorators || node.modifiers !== modifiers || node.importClause !== importClause || node.moduleSpecifier !== moduleSpecifier
      ? updateNode(createImportDeclaration(decorators, modifiers, importClause, moduleSpecifier), node)
      : node;
  }

  export function createImportClause(name: Identifier | undefined, namedBindings: NamedImportBindings | undefined, isTypeOnly = false): ImportClause {
    const node = <ImportClause>qn.createSynthesized(Syntax.ImportClause);
    node.name = name;
    node.namedBindings = namedBindings;
    node.isTypeOnly = isTypeOnly;
    return node;
  }

  export function updateImportClause(node: ImportClause, name: Identifier | undefined, namedBindings: NamedImportBindings | undefined, isTypeOnly: boolean) {
    return node.name !== name || node.namedBindings !== namedBindings || node.isTypeOnly !== isTypeOnly ? updateNode(createImportClause(name, namedBindings, isTypeOnly), node) : node;
  }

  export function createNamespaceImport(name: Identifier): NamespaceImport {
    const node = <NamespaceImport>qn.createSynthesized(Syntax.NamespaceImport);
    node.name = name;
    return node;
  }

  export function createNamespaceExport(name: Identifier): NamespaceExport {
    const node = <NamespaceExport>qn.createSynthesized(Syntax.NamespaceExport);
    node.name = name;
    return node;
  }

  export function updateNamespaceImport(node: NamespaceImport, name: Identifier) {
    return node.name !== name ? updateNode(createNamespaceImport(name), node) : node;
  }

  export function updateNamespaceExport(node: NamespaceExport, name: Identifier) {
    return node.name !== name ? updateNode(createNamespaceExport(name), node) : node;
  }

  export function createNamedImports(elements: readonly ImportSpecifier[]): NamedImports {
    const node = <NamedImports>qn.createSynthesized(Syntax.NamedImports);
    node.elements = NodeArray.create(elements);
    return node;
  }

  export function updateNamedImports(node: NamedImports, elements: readonly ImportSpecifier[]) {
    return node.elements !== elements ? updateNode(createNamedImports(elements), node) : node;
  }

  export function createImportSpecifier(propertyName: Identifier | undefined, name: Identifier) {
    const node = <ImportSpecifier>qn.createSynthesized(Syntax.ImportSpecifier);
    node.propertyName = propertyName;
    node.name = name;
    return node;
  }

  export function updateImportSpecifier(node: ImportSpecifier, propertyName: Identifier | undefined, name: Identifier) {
    return node.propertyName !== propertyName || node.name !== name ? updateNode(createImportSpecifier(propertyName, name), node) : node;
  }

  export function createExportAssignment(decorators: readonly Decorator[] | undefined, modifiers: readonly Modifier[] | undefined, isExportEquals: boolean | undefined, expression: Expression) {
    const node = <ExportAssignment>qn.createSynthesized(Syntax.ExportAssignment);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.isExportEquals = isExportEquals;
    node.expression = isExportEquals ? parenthesizeBinaryOperand(Syntax.EqualsToken, expression, /*isLeftSideOfBinary*/ false, /*leftOperand*/ undefined) : parenthesizeDefaultExpression(expression);
    return node;
  }

  export function updateExportAssignment(node: ExportAssignment, decorators: readonly Decorator[] | undefined, modifiers: readonly Modifier[] | undefined, expression: Expression) {
    return node.decorators !== decorators || node.modifiers !== modifiers || node.expression !== expression
      ? updateNode(createExportAssignment(decorators, modifiers, node.isExportEquals, expression), node)
      : node;
  }

  export function createExportDeclaration(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    exportClause: NamedExportBindings | undefined,
    moduleSpecifier?: Expression,
    isTypeOnly = false
  ) {
    const node = <ExportDeclaration>qn.createSynthesized(Syntax.ExportDeclaration);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.isTypeOnly = isTypeOnly;
    node.exportClause = exportClause;
    node.moduleSpecifier = moduleSpecifier;
    return node;
  }

  export function updateExportDeclaration(
    node: ExportDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    exportClause: NamedExportBindings | undefined,
    moduleSpecifier: Expression | undefined,
    isTypeOnly: boolean
  ) {
    return node.decorators !== decorators || node.modifiers !== modifiers || node.isTypeOnly !== isTypeOnly || node.exportClause !== exportClause || node.moduleSpecifier !== moduleSpecifier
      ? updateNode(createExportDeclaration(decorators, modifiers, exportClause, moduleSpecifier, isTypeOnly), node)
      : node;
  }

  export function createEmptyExports() {
    return createExportDeclaration(/*decorators*/ undefined, /*modifiers*/ undefined, createNamedExports([]), /*moduleSpecifier*/ undefined);
  }

  export function createNamedExports(elements: readonly ExportSpecifier[]) {
    const node = <NamedExports>qn.createSynthesized(Syntax.NamedExports);
    node.elements = NodeArray.create(elements);
    return node;
  }

  export function updateNamedExports(node: NamedExports, elements: readonly ExportSpecifier[]) {
    return node.elements !== elements ? updateNode(createNamedExports(elements), node) : node;
  }

  export function createExportSpecifier(propertyName: string | Identifier | undefined, name: string | Identifier) {
    const node = <ExportSpecifier>qn.createSynthesized(Syntax.ExportSpecifier);
    node.propertyName = asName(propertyName);
    node.name = asName(name);
    return node;
  }

  export function updateExportSpecifier(node: ExportSpecifier, propertyName: Identifier | undefined, name: Identifier) {
    return node.propertyName !== propertyName || node.name !== name ? updateNode(createExportSpecifier(propertyName, name), node) : node;
  }

  // Module references

  export function createExternalModuleReference(expression: Expression) {
    const node = <ExternalModuleReference>qn.createSynthesized(Syntax.ExternalModuleReference);
    node.expression = expression;
    return node;
  }

  export function updateExternalModuleReference(node: ExternalModuleReference, expression: Expression) {
    return node.expression !== expression ? updateNode(createExternalModuleReference(expression), node) : node;
  }

  // JSDoc

  export function createJSDocTypeExpression(type: TypeNode): JSDocTypeExpression {
    const node = qn.createSynthesized(Syntax.JSDocTypeExpression) as JSDocTypeExpression;
    node.type = type;
    return node;
  }

  export function createJSDocTypeTag(typeExpression: JSDocTypeExpression, comment?: string): JSDocTypeTag {
    const tag = createJSDocTag<JSDocTypeTag>(Syntax.JSDocTypeTag, 'type', comment);
    tag.typeExpression = typeExpression;
    return tag;
  }

  export function createJSDocReturnTag(typeExpression?: JSDocTypeExpression, comment?: string): JSDocReturnTag {
    const tag = createJSDocTag<JSDocReturnTag>(Syntax.JSDocReturnTag, 'returns', comment);
    tag.typeExpression = typeExpression;
    return tag;
  }

  export function createJSDocThisTag(typeExpression?: JSDocTypeExpression): JSDocThisTag {
    const tag = createJSDocTag<JSDocThisTag>(Syntax.JSDocThisTag, 'this');
    tag.typeExpression = typeExpression;
    return tag;
  }

  /**
   * @deprecated Use `createJSDocParameterTag` to create jsDoc param tag.
   */
  export function createJSDocParamTag(name: EntityName, isBracketed: boolean, typeExpression?: JSDocTypeExpression, comment?: string): JSDocParameterTag {
    const tag = createJSDocTag<JSDocParameterTag>(Syntax.JSDocParameterTag, 'param', comment);
    tag.typeExpression = typeExpression;
    tag.name = name;
    tag.isBracketed = isBracketed;
    return tag;
  }

  export function createJSDocClassTag(comment?: string): JSDocClassTag {
    return createJSDocTag<JSDocClassTag>(Syntax.JSDocClassTag, 'class', comment);
  }

  export function createJSDocComment(comment?: string | undefined, tags?: NodeArray<JSDocTag> | undefined) {
    const node = qn.createSynthesized(Syntax.JSDocComment) as JSDoc;
    node.comment = comment;
    node.tags = tags;
    return node;
  }

  export function createJSDocTag<T extends JSDocTag>(kind: T['kind'], tagName: string, comment?: string): T {
    const node = qn.createSynthesized(kind) as T;
    node.tagName = createIdentifier(tagName);
    node.comment = comment;
    return node;
  }

  export function createJSDocAugmentsTag(classExpression: JSDocAugmentsTag['class'], comment?: string) {
    const tag = createJSDocTag<JSDocAugmentsTag>(Syntax.JSDocAugmentsTag, 'augments', comment);
    tag.class = classExpression;
    return tag;
  }

  export function createJSDocEnumTag(typeExpression?: JSDocTypeExpression, comment?: string) {
    const tag = createJSDocTag<JSDocEnumTag>(Syntax.JSDocEnumTag, 'enum', comment);
    tag.typeExpression = typeExpression;
    return tag;
  }

  export function createJSDocTemplateTag(constraint: JSDocTypeExpression | undefined, typeParameters: readonly TypeParameterDeclaration[], comment?: string) {
    const tag = createJSDocTag<JSDocTemplateTag>(Syntax.JSDocTemplateTag, 'template', comment);
    tag.constraint = constraint;
    tag.typeParameters = NodeArray.from(typeParameters);
    return tag;
  }

  export function createJSDocTypedefTag(fullName?: JSDocNamespaceDeclaration | Identifier, name?: Identifier, comment?: string, typeExpression?: JSDocTypeExpression | JSDocTypeLiteral) {
    const tag = createJSDocTag<JSDocTypedefTag>(Syntax.JSDocTypedefTag, 'typedef', comment);
    tag.fullName = fullName;
    tag.name = name;
    tag.typeExpression = typeExpression;
    return tag;
  }

  export function createJSDocCallbackTag(fullName: JSDocNamespaceDeclaration | Identifier | undefined, name: Identifier | undefined, comment: string | undefined, typeExpression: JSDocSignature) {
    const tag = createJSDocTag<JSDocCallbackTag>(Syntax.JSDocCallbackTag, 'callback', comment);
    tag.fullName = fullName;
    tag.name = name;
    tag.typeExpression = typeExpression;
    return tag;
  }

  export function createJSDocSignature(typeParameters: readonly JSDocTemplateTag[] | undefined, parameters: readonly JSDocParameterTag[], type?: JSDocReturnTag) {
    const tag = qn.createSynthesized(Syntax.JSDocSignature) as JSDocSignature;
    tag.typeParameters = typeParameters;
    tag.parameters = parameters;
    tag.type = type;
    return tag;
  }

  function createJSDocPropertyLikeTag<T extends JSDocPropertyLikeTag>(
    kind: T['kind'],
    tagName: 'arg' | 'argument' | 'param',
    typeExpression: JSDocTypeExpression | undefined,
    name: EntityName,
    isNameFirst: boolean,
    isBracketed: boolean,
    comment?: string
  ) {
    const tag = createJSDocTag<T>(kind, tagName, comment);
    tag.typeExpression = typeExpression;
    tag.name = name;
    tag.isNameFirst = isNameFirst;
    tag.isBracketed = isBracketed;
    return tag;
  }

  export function createJSDocPropertyTag(typeExpression: JSDocTypeExpression | undefined, name: EntityName, isNameFirst: boolean, isBracketed: boolean, comment?: string) {
    return createJSDocPropertyLikeTag<JSDocPropertyTag>(Syntax.JSDocPropertyTag, 'param', typeExpression, name, isNameFirst, isBracketed, comment);
  }

  export function createJSDocParameterTag(typeExpression: JSDocTypeExpression | undefined, name: EntityName, isNameFirst: boolean, isBracketed: boolean, comment?: string) {
    return createJSDocPropertyLikeTag<JSDocParameterTag>(Syntax.JSDocParameterTag, 'param', typeExpression, name, isNameFirst, isBracketed, comment);
  }

  export function createJSDocTypeLiteral(jsDocPropertyTags?: readonly JSDocPropertyLikeTag[], isArrayType?: boolean) {
    const tag = qn.createSynthesized(Syntax.JSDocTypeLiteral) as JSDocTypeLiteral;
    tag.jsDocPropertyTags = jsDocPropertyTags;
    tag.isArrayType = isArrayType;
    return tag;
  }

  export function createJSDocImplementsTag(classExpression: JSDocImplementsTag['class'], comment?: string) {
    const tag = createJSDocTag<JSDocImplementsTag>(Syntax.JSDocImplementsTag, 'implements', comment);
    tag.class = classExpression;
    return tag;
  }

  export function createJSDocAuthorTag(comment?: string) {
    return createJSDocTag<JSDocAuthorTag>(Syntax.JSDocAuthorTag, 'author', comment);
  }

  export function createJSDocPublicTag() {
    return createJSDocTag<JSDocPublicTag>(Syntax.JSDocPublicTag, 'public');
  }

  export function createJSDocPrivateTag() {
    return createJSDocTag<JSDocPrivateTag>(Syntax.JSDocPrivateTag, 'private');
  }

  export function createJSDocProtectedTag() {
    return createJSDocTag<JSDocProtectedTag>(Syntax.JSDocProtectedTag, 'protected');
  }

  export function createJSDocReadonlyTag() {
    return createJSDocTag<JSDocReadonlyTag>(Syntax.JSDocReadonlyTag, 'readonly');
  }

  export function appendJSDocToContainer(node: JSDocContainer, jsdoc: JSDoc) {
    node.jsDoc = append(node.jsDoc, jsdoc);
    return node;
  }

  export function createJSDocVariadicType(type: TypeNode): JSDocVariadicType {
    const node = qn.createSynthesized(Syntax.JSDocVariadicType) as JSDocVariadicType;
    node.type = type;
    return node;
  }

  export function updateJSDocVariadicType(node: JSDocVariadicType, type: TypeNode): JSDocVariadicType {
    return node.type !== type ? updateNode(createJSDocVariadicType(type), node) : node;
  }

  // JSX

  export function createJsxElement(openingElement: JsxOpeningElement, children: readonly JsxChild[], closingElement: JsxClosingElement) {
    const node = <JsxElement>qn.createSynthesized(Syntax.JsxElement);
    node.openingElement = openingElement;
    node.children = NodeArray.create(children);
    node.closingElement = closingElement;
    return node;
  }

  export function updateJsxElement(node: JsxElement, openingElement: JsxOpeningElement, children: readonly JsxChild[], closingElement: JsxClosingElement) {
    return node.openingElement !== openingElement || node.children !== children || node.closingElement !== closingElement
      ? updateNode(createJsxElement(openingElement, children, closingElement), node)
      : node;
  }

  export function createJsxSelfClosingElement(tagName: JsxTagNameExpression, typeArguments: readonly TypeNode[] | undefined, attributes: JsxAttributes) {
    const node = <JsxSelfClosingElement>qn.createSynthesized(Syntax.JsxSelfClosingElement);
    node.tagName = tagName;
    node.typeArguments = NodeArray.from(typeArguments);
    node.attributes = attributes;
    return node;
  }

  export function updateJsxSelfClosingElement(node: JsxSelfClosingElement, tagName: JsxTagNameExpression, typeArguments: readonly TypeNode[] | undefined, attributes: JsxAttributes) {
    return node.tagName !== tagName || node.typeArguments !== typeArguments || node.attributes !== attributes
      ? updateNode(createJsxSelfClosingElement(tagName, typeArguments, attributes), node)
      : node;
  }

  export function createJsxOpeningElement(tagName: JsxTagNameExpression, typeArguments: readonly TypeNode[] | undefined, attributes: JsxAttributes) {
    const node = <JsxOpeningElement>qn.createSynthesized(Syntax.JsxOpeningElement);
    node.tagName = tagName;
    node.typeArguments = NodeArray.from(typeArguments);
    node.attributes = attributes;
    return node;
  }

  export function updateJsxOpeningElement(node: JsxOpeningElement, tagName: JsxTagNameExpression, typeArguments: readonly TypeNode[] | undefined, attributes: JsxAttributes) {
    return node.tagName !== tagName || node.typeArguments !== typeArguments || node.attributes !== attributes ? updateNode(createJsxOpeningElement(tagName, typeArguments, attributes), node) : node;
  }

  export function createJsxClosingElement(tagName: JsxTagNameExpression) {
    const node = <JsxClosingElement>qn.createSynthesized(Syntax.JsxClosingElement);
    node.tagName = tagName;
    return node;
  }

  export function updateJsxClosingElement(node: JsxClosingElement, tagName: JsxTagNameExpression) {
    return node.tagName !== tagName ? updateNode(createJsxClosingElement(tagName), node) : node;
  }

  export function createJsxFragment(openingFragment: JsxOpeningFragment, children: readonly JsxChild[], closingFragment: JsxClosingFragment) {
    const node = <JsxFragment>qn.createSynthesized(Syntax.JsxFragment);
    node.openingFragment = openingFragment;
    node.children = NodeArray.create(children);
    node.closingFragment = closingFragment;
    return node;
  }

  export function updateJsxText(node: JsxText, text: string, onlyTriviaWhitespaces?: boolean) {
    return node.text !== text || node.onlyTriviaWhitespaces !== onlyTriviaWhitespaces ? updateNode(JsxText.create(text, onlyTriviaWhitespaces), node) : node;
  }

  export function createJsxOpeningFragment() {
    return <JsxOpeningFragment>qn.createSynthesized(Syntax.JsxOpeningFragment);
  }

  export function createJsxJsxClosingFragment() {
    return <JsxClosingFragment>qn.createSynthesized(Syntax.JsxClosingFragment);
  }

  export function updateJsxFragment(node: JsxFragment, openingFragment: JsxOpeningFragment, children: readonly JsxChild[], closingFragment: JsxClosingFragment) {
    return node.openingFragment !== openingFragment || node.children !== children || node.closingFragment !== closingFragment
      ? updateNode(createJsxFragment(openingFragment, children, closingFragment), node)
      : node;
  }

  export function createJsxAttribute(name: Identifier, initializer: StringLiteral | JsxExpression) {
    const node = <JsxAttribute>qn.createSynthesized(Syntax.JsxAttribute);
    node.name = name;
    node.initializer = initializer;
    return node;
  }

  export function updateJsxAttribute(node: JsxAttribute, name: Identifier, initializer: StringLiteral | JsxExpression) {
    return node.name !== name || node.initializer !== initializer ? updateNode(createJsxAttribute(name, initializer), node) : node;
  }

  export function createJsxAttributes(properties: readonly JsxAttributeLike[]) {
    const node = <JsxAttributes>qn.createSynthesized(Syntax.JsxAttributes);
    node.properties = NodeArray.create(properties);
    return node;
  }

  export function updateJsxAttributes(node: JsxAttributes, properties: readonly JsxAttributeLike[]) {
    return node.properties !== properties ? updateNode(createJsxAttributes(properties), node) : node;
  }

  export function createJsxSpreadAttribute(expression: Expression) {
    const node = <JsxSpreadAttribute>qn.createSynthesized(Syntax.JsxSpreadAttribute);
    node.expression = expression;
    return node;
  }

  export function updateJsxSpreadAttribute(node: JsxSpreadAttribute, expression: Expression) {
    return node.expression !== expression ? updateNode(createJsxSpreadAttribute(expression), node) : node;
  }

  export function createJsxExpression(dot3Token: Dot3Token | undefined, expression: Expression | undefined) {
    const node = <JsxExpression>qn.createSynthesized(Syntax.JsxExpression);
    node.dot3Token = dot3Token;
    node.expression = expression;
    return node;
  }

  export function updateJsxExpression(node: JsxExpression, expression: Expression | undefined) {
    return node.expression !== expression ? updateNode(createJsxExpression(node.dot3Token, expression), node) : node;
  }

  // Clauses

  export function createCaseClause(expression: Expression, statements: readonly Statement[]) {
    const node = <CaseClause>qn.createSynthesized(Syntax.CaseClause);
    node.expression = parenthesizeExpressionForList(expression);
    node.statements = NodeArray.create(statements);
    return node;
  }

  export function updateCaseClause(node: CaseClause, expression: Expression, statements: readonly Statement[]) {
    return node.expression !== expression || node.statements !== statements ? updateNode(createCaseClause(expression, statements), node) : node;
  }

  export function createDefaultClause(statements: readonly Statement[]) {
    const node = <DefaultClause>qn.createSynthesized(Syntax.DefaultClause);
    node.statements = NodeArray.create(statements);
    return node;
  }

  export function updateDefaultClause(node: DefaultClause, statements: readonly Statement[]) {
    return node.statements !== statements ? updateNode(createDefaultClause(statements), node) : node;
  }

  export function createHeritageClause(token: HeritageClause['token'], types: readonly ExpressionWithTypeArguments[]) {
    const node = <HeritageClause>qn.createSynthesized(Syntax.HeritageClause);
    node.token = token;
    node.types = NodeArray.create(types);
    return node;
  }

  export function updateHeritageClause(node: HeritageClause, types: readonly ExpressionWithTypeArguments[]) {
    return node.types !== types ? updateNode(createHeritageClause(node.token, types), node) : node;
  }

  export function createCatchClause(variableDeclaration: string | VariableDeclaration | undefined, block: Block) {
    const node = <CatchClause>qn.createSynthesized(Syntax.CatchClause);
    node.variableDeclaration = isString(variableDeclaration) ? createVariableDeclaration(variableDeclaration) : variableDeclaration;
    node.block = block;
    return node;
  }

  export function updateCatchClause(node: CatchClause, variableDeclaration: VariableDeclaration | undefined, block: Block) {
    return node.variableDeclaration !== variableDeclaration || node.block !== block ? updateNode(createCatchClause(variableDeclaration, block), node) : node;
  }

  // Property assignments

  export function createPropertyAssignment(name: string | PropertyName, initializer: Expression) {
    const node = <PropertyAssignment>qn.createSynthesized(Syntax.PropertyAssignment);
    node.name = asName(name);
    node.questionToken = undefined;
    node.initializer = parenthesizeExpressionForList(initializer);
    return node;
  }

  export function updatePropertyAssignment(node: PropertyAssignment, name: PropertyName, initializer: Expression) {
    return node.name !== name || node.initializer !== initializer ? updateNode(createPropertyAssignment(name, initializer), node) : node;
  }

  export function createShorthandPropertyAssignment(name: string | Identifier, objectAssignmentInitializer?: Expression) {
    const node = <ShorthandPropertyAssignment>qn.createSynthesized(Syntax.ShorthandPropertyAssignment);
    node.name = asName(name);
    node.objectAssignmentInitializer = objectAssignmentInitializer !== undefined ? parenthesizeExpressionForList(objectAssignmentInitializer) : undefined;
    return node;
  }

  export function updateShorthandPropertyAssignment(node: ShorthandPropertyAssignment, name: Identifier, objectAssignmentInitializer: Expression | undefined) {
    return node.name !== name || node.objectAssignmentInitializer !== objectAssignmentInitializer ? updateNode(createShorthandPropertyAssignment(name, objectAssignmentInitializer), node) : node;
  }

  export function createSpreadAssignment(expression: Expression) {
    const node = <SpreadAssignment>qn.createSynthesized(Syntax.SpreadAssignment);
    node.expression = parenthesizeExpressionForList(expression);
    return node;
  }

  export function updateSpreadAssignment(node: SpreadAssignment, expression: Expression) {
    return node.expression !== expression ? updateNode(createSpreadAssignment(expression), node) : node;
  }

  // Enum

  export function createEnumMember(name: string | PropertyName, initializer?: Expression) {
    const node = <EnumMember>qn.createSynthesized(Syntax.EnumMember);
    node.name = asName(name);
    node.initializer = initializer && parenthesizeExpressionForList(initializer);
    return node;
  }

  export function updateEnumMember(node: EnumMember, name: PropertyName, initializer: Expression | undefined) {
    return node.name !== name || node.initializer !== initializer ? updateNode(createEnumMember(name, initializer), node) : node;
  }

  // Top-level nodes

  export function qp_updateSourceNode(
    node: SourceFile,
    statements: readonly Statement[],
    isDeclarationFile?: boolean,
    referencedFiles?: SourceFile['referencedFiles'],
    typeReferences?: SourceFile['typeReferenceDirectives'],
    hasNoDefaultLib?: boolean,
    libReferences?: SourceFile['libReferenceDirectives']
  ) {
    if (
      node.statements !== statements ||
      (isDeclarationFile !== undefined && node.isDeclarationFile !== isDeclarationFile) ||
      (referencedFiles !== undefined && node.referencedFiles !== referencedFiles) ||
      (typeReferences !== undefined && node.typeReferenceDirectives !== typeReferences) ||
      (libReferences !== undefined && node.libReferenceDirectives !== libReferences) ||
      (hasNoDefaultLib !== undefined && node.hasNoDefaultLib !== hasNoDefaultLib)
    ) {
      const updated = <SourceFile>qn.createSynthesized(Syntax.SourceFile);
      updated.flags |= node.flags;
      updated.statements = NodeArray.create(statements);
      updated.endOfFileToken = node.endOfFileToken;
      updated.fileName = node.fileName;
      updated.path = node.path;
      updated.text = node.text;
      updated.isDeclarationFile = isDeclarationFile === undefined ? node.isDeclarationFile : isDeclarationFile;
      updated.referencedFiles = referencedFiles === undefined ? node.referencedFiles : referencedFiles;
      updated.typeReferenceDirectives = typeReferences === undefined ? node.typeReferenceDirectives : typeReferences;
      updated.hasNoDefaultLib = hasNoDefaultLib === undefined ? node.hasNoDefaultLib : hasNoDefaultLib;
      updated.libReferenceDirectives = libReferences === undefined ? node.libReferenceDirectives : libReferences;
      if (node.amdDependencies !== undefined) updated.amdDependencies = node.amdDependencies;
      if (node.moduleName !== undefined) updated.moduleName = node.moduleName;
      if (node.languageVariant !== undefined) updated.languageVariant = node.languageVariant;
      if (node.renamedDependencies !== undefined) updated.renamedDependencies = node.renamedDependencies;
      if (node.languageVersion !== undefined) updated.languageVersion = node.languageVersion;
      if (node.scriptKind !== undefined) updated.scriptKind = node.scriptKind;
      if (node.externalModuleIndicator !== undefined) updated.externalModuleIndicator = node.externalModuleIndicator;
      if (node.commonJsModuleIndicator !== undefined) updated.commonJsModuleIndicator = node.commonJsModuleIndicator;
      if (node.identifiers !== undefined) updated.identifiers = node.identifiers;
      if (node.nodeCount !== undefined) updated.nodeCount = node.nodeCount;
      if (node.identifierCount !== undefined) updated.identifierCount = node.identifierCount;
      if (node.symbolCount !== undefined) updated.symbolCount = node.symbolCount;
      if (node.parseDiagnostics !== undefined) updated.parseDiagnostics = node.parseDiagnostics;
      if (node.bindDiagnostics !== undefined) updated.bindDiagnostics = node.bindDiagnostics;
      if (node.bindSuggestionDiagnostics !== undefined) updated.bindSuggestionDiagnostics = node.bindSuggestionDiagnostics;
      if (node.lineMap !== undefined) updated.lineMap = node.lineMap;
      if (node.classifiableNames !== undefined) updated.classifiableNames = node.classifiableNames;
      if (node.resolvedModules !== undefined) updated.resolvedModules = node.resolvedModules;
      if (node.resolvedTypeReferenceDirectiveNames !== undefined) updated.resolvedTypeReferenceDirectiveNames = node.resolvedTypeReferenceDirectiveNames;
      if (node.imports !== undefined) updated.imports = node.imports;
      if (node.moduleAugmentations !== undefined) updated.moduleAugmentations = node.moduleAugmentations;
      if (node.pragmas !== undefined) updated.pragmas = node.pragmas;
      if (node.localJsxFactory !== undefined) updated.localJsxFactory = node.localJsxFactory;
      if (node.localJsxNamespace !== undefined) updated.localJsxNamespace = node.localJsxNamespace;
      return updateNode(updated, node);
    }

    return node;
  }

  /**
   * Creates a shallow, memberwise clone of a node for mutation.
   */
  export function getMutableClone<T extends Node>(node: T): T {
    const clone = getSynthesizedClone(node);
    clone.pos = node.pos;
    clone.end = node.end;
    clone.parent = node.parent;
    return clone;
  }

  // Transformation nodes

  /**
   * Creates a synthetic statement to act as a placeholder for a not-emitted statement in
   * order to preserve comments.
   *
   * @param original The original statement.
   */
  export function createNotEmittedStatement(original: Node) {
    const node = <NotEmittedStatement>qn.createSynthesized(Syntax.NotEmittedStatement);
    node.original = original;
    setTextRange(node, original);
    return node;
  }

  /**
   * Creates a synthetic element to act as a placeholder for the end of an emitted declaration in
   * order to properly emit exports.
   */
  export function createEndOfDeclarationMarker(original: Node) {
    const node = <EndOfDeclarationMarker>qn.createSynthesized(Syntax.EndOfDeclarationMarker);
    node.emitNode = {} as EmitNode;
    node.original = original;
    return node;
  }

  /**
   * Creates a synthetic element to act as a placeholder for the beginning of a merged declaration in
   * order to properly emit exports.
   */
  export function createMergeDeclarationMarker(original: Node) {
    const node = <MergeDeclarationMarker>qn.createSynthesized(Syntax.MergeDeclarationMarker);
    node.emitNode = {} as EmitNode;
    node.original = original;
    return node;
  }

  /**
   * Creates a synthetic expression to act as a placeholder for a not-emitted expression in
   * order to preserve comments or sourcemap positions.
   *
   * @param expression The inner expression to emit.
   * @param original The original outer expression.
   * @param location The location for the expression. Defaults to the positions from "original" if provided.
   */
  export function createPartiallyEmittedExpression(expression: Expression, original?: Node) {
    const node = <PartiallyEmittedExpression>qn.createSynthesized(Syntax.PartiallyEmittedExpression);
    node.expression = expression;
    node.original = original;
    setTextRange(node, original);
    return node;
  }

  export function updatePartiallyEmittedExpression(node: PartiallyEmittedExpression, expression: Expression) {
    if (node.expression !== expression) {
      return updateNode(createPartiallyEmittedExpression(expression, node.original), node);
    }
    return node;
  }

  function flattenCommaElements(node: Expression): Expression | readonly Expression[] {
    if (isSynthesized(node) && !qn.is.parseTreeNode(node) && !node.original && !node.emitNode && !node.id) {
      if (node.kind === Syntax.CommaListExpression) {
        return (<CommaListExpression>node).elements;
      }
      if (qn.is.kind(node, BinaryExpression) && node.operatorToken.kind === Syntax.CommaToken) {
        return [node.left, node.right];
      }
    }
    return node;
  }

  export function createCommaList(elements: readonly Expression[]) {
    const node = <CommaListExpression>qn.createSynthesized(Syntax.CommaListExpression);
    node.elements = NodeArray.create(sameFlatMap(elements, flattenCommaElements));
    return node;
  }

  export function updateCommaList(node: CommaListExpression, elements: readonly Expression[]) {
    return node.elements !== elements ? updateNode(createCommaList(elements), node) : node;
  }

  export function createSyntheticReferenceExpression(expression: Expression, thisArg: Expression) {
    const node = <SyntheticReferenceExpression>qn.createSynthesized(Syntax.SyntheticReferenceExpression);
    node.expression = expression;
    node.thisArg = thisArg;
    return node;
  }

  export function updateSyntheticReferenceExpression(node: SyntheticReferenceExpression, expression: Expression, thisArg: Expression) {
    return node.expression !== expression || node.thisArg !== thisArg ? updateNode(createSyntheticReferenceExpression(expression, thisArg), node) : node;
  }

  export function createBundle(sourceFiles: readonly SourceFile[], prepends: readonly (UnparsedSource | InputFiles)[] = emptyArray) {
    const node = <Bundle>createNode(Syntax.Bundle);
    node.prepends = prepends;
    node.sourceFiles = sourceFiles;
    return node;
  }

  let allUnscopedEmitHelpers: QReadonlyMap<UnscopedEmitHelper> | undefined;
  function getAllUnscopedEmitHelpers() {
    return (
      allUnscopedEmitHelpers ||
      (allUnscopedEmitHelpers = arrayToMap(
        [
          valuesHelper,
          readHelper,
          spreadHelper,
          spreadArraysHelper,
          restHelper,
          decorateHelper,
          metadataHelper,
          paramHelper,
          awaiterHelper,
          assignHelper,
          awaitHelper,
          asyncGeneratorHelper,
          asyncDelegator,
          asyncValues,
          extendsHelper,
          templateObjectHelper,
          generatorHelper,
          importStarHelper,
          importDefaultHelper,
          classPrivateFieldGetHelper,
          classPrivateFieldSetHelper,
          createBindingHelper,
          setModuleDefaultHelper,
        ],
        (helper) => helper.name
      ))
    );
  }

  function createUnparsedSource() {
    const node = <UnparsedSource>createNode(Syntax.UnparsedSource);
    node.prologues = emptyArray;
    node.referencedFiles = emptyArray;
    node.libReferenceDirectives = emptyArray;
    node.lineAndCharOf = (pos) => qy_get.lineAndCharOf(node, pos);
    return node;
  }

  export function createUnparsedSourceFile(text: string): UnparsedSource;
  export function createUnparsedSourceFile(inputFile: InputFiles, type: 'js' | 'dts', stripInternal?: boolean): UnparsedSource;
  export function createUnparsedSourceFile(text: string, mapPath: string | undefined, map: string | undefined): UnparsedSource;
  export function createUnparsedSourceFile(textOrInputFiles: string | InputFiles, mapPathOrType?: string, mapTextOrStripInternal?: string | boolean): UnparsedSource {
    const node = createUnparsedSource();
    let stripInternal: boolean | undefined;
    let bundleFileInfo: BundleFileInfo | undefined;
    if (!isString(textOrInputFiles)) {
      assert(mapPathOrType === 'js' || mapPathOrType === 'dts');
      node.fileName = (mapPathOrType === 'js' ? textOrInputFiles.javascriptPath : textOrInputFiles.declarationPath) || '';
      node.sourceMapPath = mapPathOrType === 'js' ? textOrInputFiles.javascriptMapPath : textOrInputFiles.declarationMapPath;
      Object.defineProperties(node, {
        text: {
          get() {
            return mapPathOrType === 'js' ? textOrInputFiles.javascriptText : textOrInputFiles.declarationText;
          },
        },
        sourceMapText: {
          get() {
            return mapPathOrType === 'js' ? textOrInputFiles.javascriptMapText : textOrInputFiles.declarationMapText;
          },
        },
      });

      if (textOrInputFiles.buildInfo && textOrInputFiles.buildInfo.bundle) {
        node.oldFileOfCurrentEmit = textOrInputFiles.oldFileOfCurrentEmit;
        assert(mapTextOrStripInternal === undefined || typeof mapTextOrStripInternal === 'boolean');
        stripInternal = mapTextOrStripInternal;
        bundleFileInfo = mapPathOrType === 'js' ? textOrInputFiles.buildInfo.bundle.js : textOrInputFiles.buildInfo.bundle.dts;
        if (node.oldFileOfCurrentEmit) {
          parseOldFileOfCurrentEmit(node, Debug.checkDefined(bundleFileInfo));
          return node;
        }
      }
    } else {
      node.fileName = '';
      node.text = textOrInputFiles;
      node.sourceMapPath = mapPathOrType;
      node.sourceMapText = mapTextOrStripInternal as string;
    }
    assert(!node.oldFileOfCurrentEmit);
    parseUnparsedSourceFile(node, bundleFileInfo, stripInternal);
    return node;
  }

  function parseUnparsedSourceFile(node: UnparsedSource, bundleFileInfo: BundleFileInfo | undefined, stripInternal: boolean | undefined) {
    let prologues: UnparsedPrologue[] | undefined;
    let helpers: UnscopedEmitHelper[] | undefined;
    let referencedFiles: FileReference[] | undefined;
    let typeReferenceDirectives: string[] | undefined;
    let libReferenceDirectives: FileReference[] | undefined;
    let texts: UnparsedSourceText[] | undefined;

    for (const section of bundleFileInfo ? bundleFileInfo.sections : emptyArray) {
      switch (section.kind) {
        case BundleFileSectionKind.Prologue:
          (prologues || (prologues = [])).push(createUnparsedNode(section, node) as UnparsedPrologue);
          break;
        case BundleFileSectionKind.EmitHelpers:
          (helpers || (helpers = [])).push(getAllUnscopedEmitHelpers().get(section.data)!);
          break;
        case BundleFileSectionKind.NoDefaultLib:
          node.hasNoDefaultLib = true;
          break;
        case BundleFileSectionKind.Reference:
          (referencedFiles || (referencedFiles = [])).push({ pos: -1, end: -1, fileName: section.data });
          break;
        case BundleFileSectionKind.Type:
          (typeReferenceDirectives || (typeReferenceDirectives = [])).push(section.data);
          break;
        case BundleFileSectionKind.Lib:
          (libReferenceDirectives || (libReferenceDirectives = [])).push({ pos: -1, end: -1, fileName: section.data });
          break;
        case BundleFileSectionKind.Prepend:
          const prependNode = createUnparsedNode(section, node) as UnparsedPrepend;
          let prependTexts: UnparsedTextLike[] | undefined;
          for (const text of section.texts) {
            if (!stripInternal || text.kind !== BundleFileSectionKind.Internal) {
              (prependTexts || (prependTexts = [])).push(createUnparsedNode(text, node) as UnparsedTextLike);
            }
          }
          prependNode.texts = prependTexts || emptyArray;
          (texts || (texts = [])).push(prependNode);
          break;
        case BundleFileSectionKind.Internal:
          if (stripInternal) {
            if (!texts) texts = [];
            break;
          }
        // falls through

        case BundleFileSectionKind.Text:
          (texts || (texts = [])).push(createUnparsedNode(section, node) as UnparsedTextLike);
          break;
        default:
          Debug.assertNever(section);
      }
    }

    node.prologues = prologues || emptyArray;
    node.helpers = helpers;
    node.referencedFiles = referencedFiles || emptyArray;
    node.typeReferenceDirectives = typeReferenceDirectives;
    node.libReferenceDirectives = libReferenceDirectives || emptyArray;
    node.texts = texts || [<UnparsedTextLike>createUnparsedNode({ kind: BundleFileSectionKind.Text, pos: 0, end: node.text.length }, node)];
  }

  function parseOldFileOfCurrentEmit(node: UnparsedSource, bundleFileInfo: BundleFileInfo) {
    assert(!!node.oldFileOfCurrentEmit);
    let texts: UnparsedTextLike[] | undefined;
    let syntheticReferences: UnparsedSyntheticReference[] | undefined;
    for (const section of bundleFileInfo.sections) {
      switch (section.kind) {
        case BundleFileSectionKind.Internal:
        case BundleFileSectionKind.Text:
          (texts || (texts = [])).push(createUnparsedNode(section, node) as UnparsedTextLike);
          break;

        case BundleFileSectionKind.NoDefaultLib:
        case BundleFileSectionKind.Reference:
        case BundleFileSectionKind.Type:
        case BundleFileSectionKind.Lib:
          (syntheticReferences || (syntheticReferences = [])).push(createUnparsedSyntheticReference(section, node));
          break;

        // Ignore
        case BundleFileSectionKind.Prologue:
        case BundleFileSectionKind.EmitHelpers:
        case BundleFileSectionKind.Prepend:
          break;

        default:
          Debug.assertNever(section);
      }
    }
    node.texts = texts || emptyArray;
    node.helpers = map(bundleFileInfo.sources && bundleFileInfo.sources.helpers, (name) => getAllUnscopedEmitHelpers().get(name)!);
    node.syntheticReferences = syntheticReferences;
    return node;
  }

  function mapBundleFileSectionKindToSyntax(kind: BundleFileSectionKind): Syntax {
    switch (kind) {
      case BundleFileSectionKind.Prologue:
        return Syntax.UnparsedPrologue;
      case BundleFileSectionKind.Prepend:
        return Syntax.UnparsedPrepend;
      case BundleFileSectionKind.Internal:
        return Syntax.UnparsedInternalText;
      case BundleFileSectionKind.Text:
        return Syntax.UnparsedText;

      case BundleFileSectionKind.EmitHelpers:
      case BundleFileSectionKind.NoDefaultLib:
      case BundleFileSectionKind.Reference:
      case BundleFileSectionKind.Type:
      case BundleFileSectionKind.Lib:
        return fail(`BundleFileSectionKind: ${kind} not yet mapped to SyntaxKind`);

      default:
        return Debug.assertNever(kind);
    }
  }

  function createUnparsedNode(section: BundleFileSection, parent: UnparsedSource): UnparsedNode {
    const node = createNode(mapBundleFileSectionKindToSyntax(section.kind), section.pos, section.end) as UnparsedNode;
    node.parent = parent;
    node.data = section.data;
    return node;
  }

  function createUnparsedSyntheticReference(section: BundleFileHasNoDefaultLib | BundleFileReference, parent: UnparsedSource) {
    const node = createNode(Syntax.UnparsedSyntheticReference, section.pos, section.end) as UnparsedSyntheticReference;
    node.parent = parent;
    node.data = section.data;
    node.section = section;
    return node;
  }

  export function createInputFiles(javascriptText: string, declarationText: string): InputFiles;
  export function createInputFiles(
    readFileText: (path: string) => string | undefined,
    javascriptPath: string,
    javascriptMapPath: string | undefined,
    declarationPath: string,
    declarationMapPath: string | undefined,
    buildInfoPath: string | undefined
  ): InputFiles;
  export function createInputFiles(
    javascriptText: string,
    declarationText: string,
    javascriptMapPath: string | undefined,
    javascriptMapText: string | undefined,
    declarationMapPath: string | undefined,
    declarationMapText: string | undefined
  ): InputFiles;

  export function createInputFiles(
    javascriptText: string,
    declarationText: string,
    javascriptMapPath: string | undefined,
    javascriptMapText: string | undefined,
    declarationMapPath: string | undefined,
    declarationMapText: string | undefined,
    javascriptPath: string | undefined,
    declarationPath: string | undefined,
    buildInfoPath?: string | undefined,
    buildInfo?: BuildInfo,
    oldFileOfCurrentEmit?: boolean
  ): InputFiles;
  export function createInputFiles(
    javascriptTextOrReadFileText: string | ((path: string) => string | undefined),
    declarationTextOrJavascriptPath: string,
    javascriptMapPath?: string,
    javascriptMapTextOrDeclarationPath?: string,
    declarationMapPath?: string,
    declarationMapTextOrBuildInfoPath?: string,
    javascriptPath?: string | undefined,
    declarationPath?: string | undefined,
    buildInfoPath?: string | undefined,
    buildInfo?: BuildInfo,
    oldFileOfCurrentEmit?: boolean
  ): InputFiles {
    const node = <InputFiles>createNode(Syntax.InputFiles);
    if (!isString(javascriptTextOrReadFileText)) {
      const cache = createMap<string | false>();
      const textGetter = (path: string | undefined) => {
        if (path === undefined) return;
        let value = cache.get(path);
        if (value === undefined) {
          value = javascriptTextOrReadFileText(path);
          cache.set(path, value !== undefined ? value : false);
        }
        return value !== false ? (value as string) : undefined;
      };
      const definedTextGetter = (path: string) => {
        const result = textGetter(path);
        return result !== undefined ? result : `/* Input file ${path} was missing */\r\n`;
      };
      let buildInfo: BuildInfo | false;
      const getAndCacheBuildInfo = (getText: () => string | undefined) => {
        if (buildInfo === undefined) {
          const result = getText();
          buildInfo = result !== undefined ? getBuildInfo(result) : false;
        }
        return buildInfo || undefined;
      };
      node.javascriptPath = declarationTextOrJavascriptPath;
      node.javascriptMapPath = javascriptMapPath;
      node.declarationPath = Debug.checkDefined(javascriptMapTextOrDeclarationPath);
      node.declarationMapPath = declarationMapPath;
      node.buildInfoPath = declarationMapTextOrBuildInfoPath;
      Object.defineProperties(node, {
        javascriptText: {
          get() {
            return definedTextGetter(declarationTextOrJavascriptPath);
          },
        },
        javascriptMapText: {
          get() {
            return textGetter(javascriptMapPath);
          },
        }, // TODO:: if there is inline sourceMap in jsFile, use that
        declarationText: {
          get() {
            return definedTextGetter(Debug.checkDefined(javascriptMapTextOrDeclarationPath));
          },
        },
        declarationMapText: {
          get() {
            return textGetter(declarationMapPath);
          },
        }, // TODO:: if there is inline sourceMap in dtsFile, use that
        buildInfo: {
          get() {
            return getAndCacheBuildInfo(() => textGetter(declarationMapTextOrBuildInfoPath));
          },
        },
      });
    } else {
      node.javascriptText = javascriptTextOrReadFileText;
      node.javascriptMapPath = javascriptMapPath;
      node.javascriptMapText = javascriptMapTextOrDeclarationPath;
      node.declarationText = declarationTextOrJavascriptPath;
      node.declarationMapPath = declarationMapPath;
      node.declarationMapText = declarationMapTextOrBuildInfoPath;
      node.javascriptPath = javascriptPath;
      node.declarationPath = declarationPath;
      node.buildInfoPath = buildInfoPath;
      node.buildInfo = buildInfo;
      node.oldFileOfCurrentEmit = oldFileOfCurrentEmit;
    }
    return node;
  }

  export function updateBundle(node: Bundle, sourceFiles: readonly SourceFile[], prepends: readonly (UnparsedSource | InputFiles)[] = emptyArray) {
    if (node.sourceFiles !== sourceFiles || node.prepends !== prepends) {
      return createBundle(sourceFiles, prepends);
    }
    return node;
  }

  // Compound nodes

  export function createImmediatelyInvokedFunctionExpression(statements: readonly Statement[]): CallExpression;
  export function createImmediatelyInvokedFunctionExpression(statements: readonly Statement[], param: ParameterDeclaration, paramValue: Expression): CallExpression;
  export function createImmediatelyInvokedFunctionExpression(statements: readonly Statement[], param?: ParameterDeclaration, paramValue?: Expression) {
    return createCall(
      createFunctionExpression(
        /*modifiers*/ undefined,
        /*asteriskToken*/ undefined,
        /*name*/ undefined,
        /*typeParameters*/ undefined,
        /*parameters*/ param ? [param] : [],
        /*type*/ undefined,
        createBlock(statements, /*multiLine*/ true)
      ),
      /*typeArguments*/ undefined,
      /*argumentsArray*/ paramValue ? [paramValue] : []
    );
  }

  export function createImmediatelyInvokedArrowFunction(statements: readonly Statement[]): CallExpression;
  export function createImmediatelyInvokedArrowFunction(statements: readonly Statement[], param: ParameterDeclaration, paramValue: Expression): CallExpression;
  export function createImmediatelyInvokedArrowFunction(statements: readonly Statement[], param?: ParameterDeclaration, paramValue?: Expression) {
    return createCall(
      createArrowFunction(
        /*modifiers*/ undefined,
        /*typeParameters*/ undefined,
        /*parameters*/ param ? [param] : [],
        /*type*/ undefined,
        /*equalsGreaterThanToken*/ undefined,
        createBlock(statements, /*multiLine*/ true)
      ),
      /*typeArguments*/ undefined,
      /*argumentsArray*/ paramValue ? [paramValue] : []
    );
  }

  export function createComma(left: Expression, right: Expression) {
    return <Expression>createBinary(left, Syntax.CommaToken, right);
  }

  export function createLessThan(left: Expression, right: Expression) {
    return <Expression>createBinary(left, Syntax.LessThanToken, right);
  }

  export function createAssignment(left: ObjectLiteralExpression | ArrayLiteralExpression, right: Expression): DestructuringAssignment;
  export function createAssignment(left: Expression, right: Expression): BinaryExpression;
  export function createAssignment(left: Expression, right: Expression) {
    return createBinary(left, Syntax.EqualsToken, right);
  }

  export function createStrictEquality(left: Expression, right: Expression) {
    return createBinary(left, Syntax.Equals3Token, right);
  }

  export function createStrictInequality(left: Expression, right: Expression) {
    return createBinary(left, Syntax.ExclamationEquals2Token, right);
  }

  export function createAdd(left: Expression, right: Expression) {
    return createBinary(left, Syntax.PlusToken, right);
  }

  export function createSubtract(left: Expression, right: Expression) {
    return createBinary(left, Syntax.MinusToken, right);
  }

  export function createPostfixIncrement(operand: Expression) {
    return createPostfix(operand, Syntax.Plus2Token);
  }

  export function createLogicalAnd(left: Expression, right: Expression) {
    return createBinary(left, Syntax.Ampersand2Token, right);
  }

  export function createLogicalOr(left: Expression, right: Expression) {
    return createBinary(left, Syntax.Bar2Token, right);
  }

  export function createNullishCoalesce(left: Expression, right: Expression) {
    return createBinary(left, Syntax.Question2Token, right);
  }

  export function createLogicalNot(operand: Expression) {
    return createPrefix(Syntax.ExclamationToken, operand);
  }

  export function createVoidZero() {
    return createVoid(createLiteral(0));
  }

  export function createExportDefault(expression: Expression) {
    return createExportAssignment(/*decorators*/ undefined, /*modifiers*/ undefined, /*isExportEquals*/ false, expression);
  }

  export function createExternalModuleExport(exportName: Identifier) {
    return createExportDeclaration(/*decorators*/ undefined, /*modifiers*/ undefined, createNamedExports([createExportSpecifier(/*propertyName*/ undefined, exportName)]));
  }

  // Utilities

  /**
   * Clears any EmitNode entries from parse-tree nodes.
   * @param sourceFile A source file.
   */
  export function disposeEmitNodes(sourceFile: SourceFile) {
    // During transformation we may need to annotate a parse tree node with transient
    // transformation properties. As parse tree nodes live longer than transformation
    // nodes, we need to make sure we reclaim any memory allocated for custom ranges
    // from these nodes to ensure we do not hold onto entire subtrees just for position
    // information. We also need to reset these nodes to a pre-transformation state
    // for incremental parsing scenarios so that we do not impact later emit.
    sourceFile = getSourceFileOfNode(getParseTreeNode(sourceFile));
    const emitNode = sourceFile && sourceFile.emitNode;
    const annotatedNodes = emitNode && emitNode.annotatedNodes;
    if (annotatedNodes) {
      for (const node of annotatedNodes) {
        node.emitNode = undefined;
      }
    }
  }

  export function getOrCreateEmitNode(node: Node): EmitNode {
    if (!node.emitNode) {
      if (qn.is.parseTreeNode(node)) {
        if (node.kind === Syntax.SourceFile) {
          return (node.emitNode = { annotatedNodes: [node] } as EmitNode);
        }

        const sourceFile = getSourceFileOfNode(getParseTreeNode(getSourceFileOfNode(node)));
        getOrCreateEmitNode(sourceFile).annotatedNodes!.push(node);
      }

      node.emitNode = {} as EmitNode;
    }

    return node.emitNode;
  }

  export function removeAllComments<T extends Node>(node: T): T {
    const emitNode = getOrCreateEmitNode(node);
    emitNode.flags |= EmitFlags.NoComments;
    emitNode.leadingComments = undefined;
    emitNode.trailingComments = undefined;
    return node;
  }

  export function setTextRange<T extends TextRange>(range: T, location: TextRange | undefined): T {
    if (location) {
      range.pos = location.pos;
      range.end = location.end;
    }
    return range;
  }

  export function setEmitFlags<T extends Node>(node: T, emitFlags: EmitFlags) {
    getOrCreateEmitNode(node).flags = emitFlags;
    return node;
  }

  export function addEmitFlags<T extends Node>(node: T, emitFlags: EmitFlags) {
    const emitNode = getOrCreateEmitNode(node);
    emitNode.flags = emitNode.flags | emitFlags;
    return node;
  }

  export function getSourceMapRange(node: Node): SourceMapRange {
    const emitNode = node.emitNode;
    return (emitNode && emitNode.sourceMapRange) || node;
  }

  export function setSourceMapRange<T extends Node>(node: T, range: SourceMapRange | undefined) {
    getOrCreateEmitNode(node).sourceMapRange = range;
    return node;
  }

  let SourceMapSource: new (fileName: string, text: string, skipTrivia?: (pos: number) => number) => SourceMapSource;

  export function createSourceMapSource(fileName: string, text: string, skipTrivia?: (pos: number) => number): SourceMapSource {
    return new (SourceMapSource || (SourceMapSource = Node.SourceMapSourceObj))(fileName, text, qy_syntax.skipTrivia);
  }

  export function getTokenSourceMapRange(node: Node, token: Syntax): SourceMapRange | undefined {
    const emitNode = node.emitNode;
    const tokenSourceMapRanges = emitNode && emitNode.tokenSourceMapRanges;
    return tokenSourceMapRanges && tokenSourceMapRanges[token];
  }

  export function setTokenSourceMapRange<T extends Node>(node: T, token: Syntax, range: SourceMapRange | undefined) {
    const emitNode = getOrCreateEmitNode(node);
    const tokenSourceMapRanges = emitNode.tokenSourceMapRanges || (emitNode.tokenSourceMapRanges = []);
    tokenSourceMapRanges[token] = range;
    return node;
  }

  export function getStartsOnNewLine(node: Node) {
    const emitNode = node.emitNode;
    return emitNode && emitNode.startsOnNewLine;
  }

  export function setStartsOnNewLine<T extends Node>(node: T, newLine: boolean) {
    getOrCreateEmitNode(node).startsOnNewLine = newLine;
    return node;
  }

  export function getCommentRange(node: Node) {
    const emitNode = node.emitNode;
    return (emitNode && emitNode.commentRange) || node;
  }

  export function setCommentRange<T extends Node>(node: T, range: TextRange) {
    getOrCreateEmitNode(node).commentRange = range;
    return node;
  }

  export function getSyntheticLeadingComments(node: Node): SynthesizedComment[] | undefined {
    const emitNode = node.emitNode;
    return emitNode && emitNode.leadingComments;
  }

  export function setSyntheticLeadingComments<T extends Node>(node: T, comments: SynthesizedComment[] | undefined) {
    getOrCreateEmitNode(node).leadingComments = comments;
    return node;
  }

  export function addSyntheticLeadingComment<T extends Node>(node: T, kind: Syntax.SingleLineCommentTrivia | Syntax.MultiLineCommentTrivia, text: string, hasTrailingNewLine?: boolean) {
    return setSyntheticLeadingComments(
      node,
      append<SynthesizedComment>(getSyntheticLeadingComments(node), { kind, pos: -1, end: -1, hasTrailingNewLine, text })
    );
  }

  export function getSyntheticTrailingComments(node: Node): SynthesizedComment[] | undefined {
    const emitNode = node.emitNode;
    return emitNode && emitNode.trailingComments;
  }

  export function setSyntheticTrailingComments<T extends Node>(node: T, comments: SynthesizedComment[] | undefined) {
    getOrCreateEmitNode(node).trailingComments = comments;
    return node;
  }

  export function addSyntheticTrailingComment<T extends Node>(node: T, kind: Syntax.SingleLineCommentTrivia | Syntax.MultiLineCommentTrivia, text: string, hasTrailingNewLine?: boolean) {
    return setSyntheticTrailingComments(
      node,
      append<SynthesizedComment>(getSyntheticTrailingComments(node), { kind, pos: -1, end: -1, hasTrailingNewLine, text })
    );
  }

  export function moveSyntheticComments<T extends Node>(node: T, original: Node): T {
    setSyntheticLeadingComments(node, getSyntheticLeadingComments(original));
    setSyntheticTrailingComments(node, getSyntheticTrailingComments(original));
    const emit = getOrCreateEmitNode(original);
    emit.leadingComments = undefined;
    emit.trailingComments = undefined;
    return node;
  }

  export function ignoreSourceNewlines<T extends Node>(node: T): T {
    getOrCreateEmitNode(node).flags |= EmitFlags.IgnoreSourceNewlines;
    return node;
  }

  /**
   * Gets the constant value to emit for an expression.
   */
  export function getConstantValue(node: PropertyAccessExpression | ElementAccessExpression): string | number | undefined {
    const emitNode = node.emitNode;
    return emitNode && emitNode.constantValue;
  }

  /**
   * Sets the constant value to emit for an expression.
   */
  export function setConstantValue(node: PropertyAccessExpression | ElementAccessExpression, value: string | number): PropertyAccessExpression | ElementAccessExpression {
    const emitNode = getOrCreateEmitNode(node);
    emitNode.constantValue = value;
    return node;
  }

  /**
   * Adds an EmitHelper to a node.
   */
  export function addEmitHelper<T extends Node>(node: T, helper: EmitHelper): T {
    const emitNode = getOrCreateEmitNode(node);
    emitNode.helpers = append(emitNode.helpers, helper);
    return node;
  }

  /**
   * Add EmitHelpers to a node.
   */
  export function addEmitHelpers<T extends Node>(node: T, helpers: EmitHelper[] | undefined): T {
    if (some(helpers)) {
      const emitNode = getOrCreateEmitNode(node);
      for (const helper of helpers) {
        emitNode.helpers = appendIfUnique(emitNode.helpers, helper);
      }
    }
    return node;
  }

  /**
   * Removes an EmitHelper from a node.
   */
  export function removeEmitHelper(node: Node, helper: EmitHelper): boolean {
    const emitNode = node.emitNode;
    if (emitNode) {
      const helpers = emitNode.helpers;
      if (helpers) {
        return orderedRemoveItem(helpers, helper);
      }
    }
    return false;
  }

  /**
   * Gets the EmitHelpers of a node.
   */
  export function getEmitHelpers(node: Node): EmitHelper[] | undefined {
    const emitNode = node.emitNode;
    return emitNode && emitNode.helpers;
  }

  /**
   * Moves matching emit helpers from a source node to a target node.
   */
  export function moveEmitHelpers(source: Node, target: Node, predicate: (helper: EmitHelper) => boolean) {
    const sourceEmitNode = source.emitNode;
    const sourceEmitHelpers = sourceEmitNode && sourceEmitNode.helpers;
    if (!some(sourceEmitHelpers)) return;

    const targetEmitNode = getOrCreateEmitNode(target);
    let helpersRemoved = 0;
    for (let i = 0; i < sourceEmitHelpers.length; i++) {
      const helper = sourceEmitHelpers[i];
      if (predicate(helper)) {
        helpersRemoved++;
        targetEmitNode.helpers = appendIfUnique(targetEmitNode.helpers, helper);
      } else if (helpersRemoved > 0) {
        sourceEmitHelpers[i - helpersRemoved] = helper;
      }
    }

    if (helpersRemoved > 0) {
      sourceEmitHelpers.length -= helpersRemoved;
    }
  }

  export function compareEmitHelpers(x: EmitHelper, y: EmitHelper) {
    if (x === y) return Comparison.EqualTo;
    if (x.priority === y.priority) return Comparison.EqualTo;
    if (x.priority === undefined) return Comparison.GreaterThan;
    if (y.priority === undefined) return Comparison.LessThan;
    return compareValues(x.priority, y.priority);
  }

  export function setOriginalNode<T extends Node>(node: T, original: Node | undefined): T {
    node.original = original;
    if (original) {
      const emitNode = original.emitNode;
      if (emitNode) node.emitNode = mergeEmitNode(emitNode, node.emitNode);
    }
    return node;
  }

  function mergeEmitNode(sourceEmitNode: EmitNode, destEmitNode: EmitNode | undefined) {
    const { flags, leadingComments, trailingComments, commentRange, sourceMapRange, tokenSourceMapRanges, constantValue, helpers, startsOnNewLine } = sourceEmitNode;
    if (!destEmitNode) destEmitNode = {} as EmitNode;
    // We are using `.slice()` here in case `destEmitNode.leadingComments` is pushed to later.
    if (leadingComments) destEmitNode.leadingComments = addRange(leadingComments.slice(), destEmitNode.leadingComments);
    if (trailingComments) destEmitNode.trailingComments = addRange(trailingComments.slice(), destEmitNode.trailingComments);
    if (flags) destEmitNode.flags = flags;
    if (commentRange) destEmitNode.commentRange = commentRange;
    if (sourceMapRange) destEmitNode.sourceMapRange = sourceMapRange;
    if (tokenSourceMapRanges) destEmitNode.tokenSourceMapRanges = mergeTokenSourceMapRanges(tokenSourceMapRanges, destEmitNode.tokenSourceMapRanges!);
    if (constantValue !== undefined) destEmitNode.constantValue = constantValue;
    if (helpers) destEmitNode.helpers = addRange(destEmitNode.helpers, helpers);
    if (startsOnNewLine !== undefined) destEmitNode.startsOnNewLine = startsOnNewLine;
    return destEmitNode;
  }

  function mergeTokenSourceMapRanges(sourceRanges: (TextRange | undefined)[], destRanges: (TextRange | undefined)[]) {
    if (!destRanges) destRanges = [];
    for (const key in sourceRanges) {
      destRanges[key] = sourceRanges[key];
    }
    return destRanges;
  }
}
