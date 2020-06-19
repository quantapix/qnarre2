namespace core {
  type SuperContainer = ClassDeclaration | MethodDeclaration | GetAccessorDeclaration | SetAccessorDeclaration | ConstructorDeclaration;

  const enum ES2017SubstitutionFlags {
    /** Enables substitutions for async methods with `super` calls. */
    AsyncMethodsWithSuper = 1 << 0,
  }

  const enum ContextFlags {
    NonTopLevel = 1 << 0,
    HasLexicalThis = 1 << 1,
  }

  export function transformES2017(context: TransformationContext) {
    const { resumeLexicalEnvironment, endLexicalEnvironment, hoistVariableDeclaration } = context;

    const resolver = context.getEmitResolver();
    const compilerOptions = context.getCompilerOptions();
    const languageVersion = getEmitScriptTarget(compilerOptions);

    /**
     * Keeps track of whether expression substitution has been enabled for specific edge cases.
     * They are persisted between each SourceFile transformation and should not be reset.
     */
    let enabledSubstitutions: ES2017SubstitutionFlags;

    /**
     * This keeps track of containers where `super` is valid, for use with
     * just-in-time substitution for `super` expressions inside of async methods.
     */
    let enclosingSuperContainerFlags: NodeCheckFlags = 0;

    let enclosingFunctionParameterNames: UnderscoreEscapedMap<true>;

    /**
     * Keeps track of property names accessed on super (`super.x`) within async functions.
     */
    let capturedSuperProperties: UnderscoreEscapedMap<true>;
    /** Whether the async function contains an element access on super (`super[x]`). */
    let hasSuperElementAccess: boolean;
    /** A set of node IDs for generated super accessors (variable statements). */
    const substitutedSuperAccessors: boolean[] = [];

    let contextFlags: ContextFlags = 0;

    // Save the previous transformation hooks.
    const previousOnEmitNode = context.onEmitNode;
    const previousOnSubstituteNode = context.onSubstituteNode;

    // Set new transformation hooks.
    context.onEmitNode = onEmitNode;
    context.onSubstituteNode = onSubstituteNode;

    return chainBundle(transformSourceFile);

    function transformSourceFile(node: SourceFile) {
      if (node.isDeclarationFile) {
        return node;
      }

      setContextFlag(ContextFlags.NonTopLevel, false);
      setContextFlag(ContextFlags.HasLexicalThis, !isEffectiveStrictModeSourceFile(node, compilerOptions));
      const visited = visitEachChild(node, visitor, context);
      addEmitHelpers(visited, context.readEmitHelpers());
      return visited;
    }

    function setContextFlag(flag: ContextFlags, val: boolean) {
      contextFlags = val ? contextFlags | flag : contextFlags & ~flag;
    }

    function inContext(flags: ContextFlags) {
      return (contextFlags & flags) !== 0;
    }

    function inTopLevelContext() {
      return !inContext(ContextFlags.NonTopLevel);
    }

    function inHasLexicalThisContext() {
      return inContext(ContextFlags.HasLexicalThis);
    }

    function doWithContext<T, U>(flags: ContextFlags, cb: (value: T) => U, value: T) {
      const contextFlagsToSet = flags & ~contextFlags;
      if (contextFlagsToSet) {
        setContextFlag(contextFlagsToSet, /*val*/ true);
        const result = cb(value);
        setContextFlag(contextFlagsToSet, /*val*/ false);
        return result;
      }
      return cb(value);
    }

    function visitDefault(node: Node): VisitResult<Node> {
      return visitEachChild(node, visitor, context);
    }

    function visitor(node: Node): VisitResult<Node> {
      if ((node.transformFlags & TransformFlags.ContainsES2017) === 0) {
        return node;
      }
      switch (node.kind) {
        case Syntax.AsyncKeyword:
          // ES2017 async modifier should be elided for targets < ES2017
          return;

        case Syntax.AwaitExpression:
          return visitAwaitExpression(<AwaitExpression>node);

        case Syntax.MethodDeclaration:
          return doWithContext(ContextFlags.NonTopLevel | ContextFlags.HasLexicalThis, visitMethodDeclaration, <MethodDeclaration>node);

        case Syntax.FunctionDeclaration:
          return doWithContext(ContextFlags.NonTopLevel | ContextFlags.HasLexicalThis, visitFunctionDeclaration, <FunctionDeclaration>node);

        case Syntax.FunctionExpression:
          return doWithContext(ContextFlags.NonTopLevel | ContextFlags.HasLexicalThis, visitFunctionExpression, <FunctionExpression>node);

        case Syntax.ArrowFunction:
          return doWithContext(ContextFlags.NonTopLevel, visitArrowFunction, <ArrowFunction>node);

        case Syntax.PropertyAccessExpression:
          if (capturedSuperProperties && Node.is.kind(PropertyAccessExpression, node) && node.expression.kind === Syntax.SuperKeyword) {
            capturedSuperProperties.set(node.name.escapedText, true);
          }
          return visitEachChild(node, visitor, context);

        case Syntax.ElementAccessExpression:
          if (capturedSuperProperties && (<ElementAccessExpression>node).expression.kind === Syntax.SuperKeyword) {
            hasSuperElementAccess = true;
          }
          return visitEachChild(node, visitor, context);

        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
        case Syntax.Constructor:
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
          return doWithContext(ContextFlags.NonTopLevel | ContextFlags.HasLexicalThis, visitDefault, node);

        default:
          return visitEachChild(node, visitor, context);
      }
    }

    function asyncBodyVisitor(node: Node): VisitResult<Node> {
      if (isNodeWithPossibleHoistedDeclaration(node)) {
        switch (node.kind) {
          case Syntax.VariableStatement:
            return visitVariableStatementInAsyncBody(node);
          case Syntax.ForStatement:
            return visitForStatementInAsyncBody(node);
          case Syntax.ForInStatement:
            return visitForInStatementInAsyncBody(node);
          case Syntax.ForOfStatement:
            return visitForOfStatementInAsyncBody(node);
          case Syntax.CatchClause:
            return visitCatchClauseInAsyncBody(node);
          case Syntax.Block:
          case Syntax.SwitchStatement:
          case Syntax.CaseBlock:
          case Syntax.CaseClause:
          case Syntax.DefaultClause:
          case Syntax.TryStatement:
          case Syntax.DoStatement:
          case Syntax.WhileStatement:
          case Syntax.IfStatement:
          case Syntax.WithStatement:
          case Syntax.LabeledStatement:
            return visitEachChild(node, asyncBodyVisitor, context);
          default:
            return Debug.assertNever(node, 'Unhandled node.');
        }
      }
      return visitor(node);
    }

    function visitCatchClauseInAsyncBody(node: CatchClause) {
      const catchClauseNames = createUnderscoreEscapedMap<true>();
      recordDeclarationName(node.variableDeclaration!, catchClauseNames); // TODO: GH#18217

      // names declared in a catch variable are block scoped
      let catchClauseUnshadowedNames: UnderscoreEscapedMap<true> | undefined;
      catchClauseNames.forEach((_, escName) => {
        if (enclosingFunctionParameterNames.has(escName)) {
          if (!catchClauseUnshadowedNames) {
            catchClauseUnshadowedNames = cloneMap(enclosingFunctionParameterNames);
          }
          catchClauseUnshadowedNames.delete(escName);
        }
      });

      if (catchClauseUnshadowedNames) {
        const savedEnclosingFunctionParameterNames = enclosingFunctionParameterNames;
        enclosingFunctionParameterNames = catchClauseUnshadowedNames;
        const result = visitEachChild(node, asyncBodyVisitor, context);
        enclosingFunctionParameterNames = savedEnclosingFunctionParameterNames;
        return result;
      } else {
        return visitEachChild(node, asyncBodyVisitor, context);
      }
    }

    function visitVariableStatementInAsyncBody(node: VariableStatement) {
      if (isVariableDeclarationListWithCollidingName(node.declarationList)) {
        const expression = visitVariableDeclarationListWithCollidingNames(node.declarationList, /*hasReceiver*/ false);
        return expression ? createExpressionStatement(expression) : undefined;
      }
      return visitEachChild(node, visitor, context);
    }

    function visitForInStatementInAsyncBody(node: ForInStatement) {
      return updateForIn(
        node,
        isVariableDeclarationListWithCollidingName(node.initializer)
          ? visitVariableDeclarationListWithCollidingNames(node.initializer, /*hasReceiver*/ true)!
          : visitNode(node.initializer, visitor, isForInitializer),
        visitNode(node.expression, visitor, isExpression),
        visitNode(node.statement, asyncBodyVisitor, isStatement, liftToBlock)
      );
    }

    function visitForOfStatementInAsyncBody(node: ForOfStatement) {
      return updateForOf(
        node,
        visitNode(node.awaitModifier, visitor, isToken),
        isVariableDeclarationListWithCollidingName(node.initializer)
          ? visitVariableDeclarationListWithCollidingNames(node.initializer, /*hasReceiver*/ true)!
          : visitNode(node.initializer, visitor, isForInitializer),
        visitNode(node.expression, visitor, isExpression),
        visitNode(node.statement, asyncBodyVisitor, isStatement, liftToBlock)
      );
    }

    function visitForStatementInAsyncBody(node: ForStatement) {
      const initializer = node.initializer!; // TODO: GH#18217
      return updateFor(
        node,
        isVariableDeclarationListWithCollidingName(initializer)
          ? visitVariableDeclarationListWithCollidingNames(initializer, /*hasReceiver*/ false)
          : visitNode(node.initializer, visitor, isForInitializer),
        visitNode(node.condition, visitor, isExpression),
        visitNode(node.incrementor, visitor, isExpression),
        visitNode(node.statement, asyncBodyVisitor, isStatement, liftToBlock)
      );
    }

    /**
     * Visits an AwaitExpression node.
     *
     * This function will be called any time a ES2017 await expression is encountered.
     *
     * @param node The node to visit.
     */
    function visitAwaitExpression(node: AwaitExpression): Expression {
      // do not downlevel a top-level await as it is module syntax...
      if (inTopLevelContext()) {
        return visitEachChild(node, visitor, context);
      }
      return setOriginalNode(setTextRange(createYield(/*asteriskToken*/ undefined, visitNode(node.expression, visitor, isExpression)), node), node);
    }

    /**
     * Visits a MethodDeclaration node.
     *
     * This function will be called when one of the following conditions are met:
     * - The node is marked as async
     *
     * @param node The node to visit.
     */
    function visitMethodDeclaration(node: MethodDeclaration) {
      return MethodDeclaration.update(
        node,
        /*decorators*/ undefined,
        Nodes.visit(node.modifiers, visitor, isModifier),
        node.asteriskToken,
        node.name,
        /*questionToken*/ undefined,
        /*typeParameters*/ undefined,
        visitParameterList(node.parameters, visitor, context),
        /*type*/ undefined,
        getFunctionFlags(node) & FunctionFlags.Async ? transformAsyncFunctionBody(node) : visitFunctionBody(node.body, visitor, context)
      );
    }

    /**
     * Visits a FunctionDeclaration node.
     *
     * This function will be called when one of the following conditions are met:
     * - The node is marked async
     *
     * @param node The node to visit.
     */
    function visitFunctionDeclaration(node: FunctionDeclaration): VisitResult<Statement> {
      return updateFunctionDeclaration(
        node,
        /*decorators*/ undefined,
        Nodes.visit(node.modifiers, visitor, isModifier),
        node.asteriskToken,
        node.name,
        /*typeParameters*/ undefined,
        visitParameterList(node.parameters, visitor, context),
        /*type*/ undefined,
        getFunctionFlags(node) & FunctionFlags.Async ? transformAsyncFunctionBody(node) : visitFunctionBody(node.body, visitor, context)
      );
    }

    /**
     * Visits a FunctionExpression node.
     *
     * This function will be called when one of the following conditions are met:
     * - The node is marked async
     *
     * @param node The node to visit.
     */
    function visitFunctionExpression(node: FunctionExpression): Expression {
      return updateFunctionExpression(
        node,
        Nodes.visit(node.modifiers, visitor, isModifier),
        node.asteriskToken,
        node.name,
        /*typeParameters*/ undefined,
        visitParameterList(node.parameters, visitor, context),
        /*type*/ undefined,
        getFunctionFlags(node) & FunctionFlags.Async ? transformAsyncFunctionBody(node) : visitFunctionBody(node.body, visitor, context)
      );
    }

    /**
     * Visits an ArrowFunction.
     *
     * This function will be called when one of the following conditions are met:
     * - The node is marked async
     *
     * @param node The node to visit.
     */
    function visitArrowFunction(node: ArrowFunction) {
      return updateArrowFunction(
        node,
        Nodes.visit(node.modifiers, visitor, isModifier),
        /*typeParameters*/ undefined,
        visitParameterList(node.parameters, visitor, context),
        /*type*/ undefined,
        node.equalsGreaterThanToken,
        getFunctionFlags(node) & FunctionFlags.Async ? transformAsyncFunctionBody(node) : visitFunctionBody(node.body, visitor, context)
      );
    }

    function recordDeclarationName({ name }: ParameterDeclaration | VariableDeclaration | BindingElement, names: UnderscoreEscapedMap<true>) {
      if (Node.is.kind(Identifier, name)) {
        names.set(name.escapedText, true);
      } else {
        for (const element of name.elements) {
          if (!Node.is.kind(OmittedExpression, element)) {
            recordDeclarationName(element, names);
          }
        }
      }
    }

    function isVariableDeclarationListWithCollidingName(node: ForInitializer): node is VariableDeclarationList {
      return !!node && Node.is.kind(VariableDeclarationList, node) && !(node.flags & NodeFlags.BlockScoped) && node.declarations.some(collidesWithParameterName);
    }

    function visitVariableDeclarationListWithCollidingNames(node: VariableDeclarationList, hasReceiver: boolean) {
      hoistVariableDeclarationList(node);

      const variables = getInitializedVariables(node);
      if (variables.length === 0) {
        if (hasReceiver) {
          return visitNode(convertToAssignmentElementTarget(node.declarations[0].name), visitor, isExpression);
        }
        return;
      }

      return inlineExpressions(map(variables, transformInitializedVariable));
    }

    function hoistVariableDeclarationList(node: VariableDeclarationList) {
      forEach(node.declarations, hoistVariable);
    }

    function hoistVariable({ name }: VariableDeclaration | BindingElement) {
      if (Node.is.kind(Identifier, name)) {
        hoistVariableDeclaration(name);
      } else {
        for (const element of name.elements) {
          if (!Node.is.kind(OmittedExpression, element)) {
            hoistVariable(element);
          }
        }
      }
    }

    function transformInitializedVariable(node: VariableDeclaration) {
      const converted = setSourceMapRange(createAssignment(convertToAssignmentElementTarget(node.name), node.initializer!), node);
      return visitNode(converted, visitor, isExpression);
    }

    function collidesWithParameterName({ name }: VariableDeclaration | BindingElement): boolean {
      if (Node.is.kind(Identifier, name)) {
        return enclosingFunctionParameterNames.has(name.escapedText);
      } else {
        for (const element of name.elements) {
          if (!Node.is.kind(OmittedExpression, element) && collidesWithParameterName(element)) {
            return true;
          }
        }
      }
      return false;
    }

    function transformAsyncFunctionBody(node: MethodDeclaration | AccessorDeclaration | FunctionDeclaration | FunctionExpression): FunctionBody;
    function transformAsyncFunctionBody(node: ArrowFunction): ConciseBody;
    function transformAsyncFunctionBody(node: FunctionLikeDeclaration): ConciseBody {
      resumeLexicalEnvironment();

      const original = Node.get.originalOf(node, isFunctionLike);
      const nodeType = original.type;
      const promiseConstructor = languageVersion < ScriptTarget.ES2015 ? getPromiseConstructor(nodeType) : undefined;
      const isArrowFunction = node.kind === Syntax.ArrowFunction;
      const hasLexicalArguments = (resolver.getNodeCheckFlags(node) & NodeCheckFlags.CaptureArguments) !== 0;

      // An async function is emit as an outer function that calls an inner
      // generator function. To preserve lexical bindings, we pass the current
      // `this` and `arguments` objects to `__awaiter`. The generator function
      // passed to `__awaiter` is executed inside of the callback to the
      // promise constructor.

      const savedEnclosingFunctionParameterNames = enclosingFunctionParameterNames;
      enclosingFunctionParameterNames = createUnderscoreEscapedMap<true>();
      for (const parameter of node.parameters) {
        recordDeclarationName(parameter, enclosingFunctionParameterNames);
      }

      const savedCapturedSuperProperties = capturedSuperProperties;
      const savedHasSuperElementAccess = hasSuperElementAccess;
      if (!isArrowFunction) {
        capturedSuperProperties = createUnderscoreEscapedMap<true>();
        hasSuperElementAccess = false;
      }

      let result: ConciseBody;
      if (!isArrowFunction) {
        const statements: Statement[] = [];
        const statementOffset = addPrologue(statements, (<Block>node.body).statements, /*ensureUseStrict*/ false, visitor);
        statements.push(
          createReturn(createAwaiterHelper(context, inHasLexicalThisContext(), hasLexicalArguments, promiseConstructor, transformAsyncFunctionBodyWorker(<Block>node.body, statementOffset)))
        );

        insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());

        // Minor optimization, emit `_super` helper to capture `super` access in an arrow.
        // This step isn't needed if we eventually transform this to ES5.
        const emitSuperHelpers = languageVersion >= ScriptTarget.ES2015 && resolver.getNodeCheckFlags(node) & (NodeCheckFlags.AsyncMethodWithSuperBinding | NodeCheckFlags.AsyncMethodWithSuper);

        if (emitSuperHelpers) {
          enableSubstitutionForAsyncMethodsWithSuper();
          if (hasEntries(capturedSuperProperties)) {
            const variableStatement = createSuperAccessVariableStatement(resolver, node, capturedSuperProperties);
            substitutedSuperAccessors[getNodeId(variableStatement)] = true;
            insertStatementsAfterStandardPrologue(statements, [variableStatement]);
          }
        }

        const block = createBlock(statements, /*multiLine*/ true);
        setTextRange(block, node.body);

        if (emitSuperHelpers && hasSuperElementAccess) {
          // Emit helpers for super element access expressions (`super[x]`).
          if (resolver.getNodeCheckFlags(node) & NodeCheckFlags.AsyncMethodWithSuperBinding) {
            addEmitHelper(block, advancedAsyncSuperHelper);
          } else if (resolver.getNodeCheckFlags(node) & NodeCheckFlags.AsyncMethodWithSuper) {
            addEmitHelper(block, asyncSuperHelper);
          }
        }

        result = block;
      } else {
        const expression = createAwaiterHelper(context, inHasLexicalThisContext(), hasLexicalArguments, promiseConstructor, transformAsyncFunctionBodyWorker(node.body!));

        const declarations = endLexicalEnvironment();
        if (some(declarations)) {
          const block = convertToFunctionBody(expression);
          result = updateBlock(block, setTextRange(Nodes.create(concatenate(declarations, block.statements)), block.statements));
        } else {
          result = expression;
        }
      }

      enclosingFunctionParameterNames = savedEnclosingFunctionParameterNames;
      if (!isArrowFunction) {
        capturedSuperProperties = savedCapturedSuperProperties;
        hasSuperElementAccess = savedHasSuperElementAccess;
      }
      return result;
    }

    function transformAsyncFunctionBodyWorker(body: ConciseBody, start?: number) {
      if (Node.is.kind(Block, body)) {
        return updateBlock(body, Nodes.visit(body.statements, asyncBodyVisitor, isStatement, start));
      } else {
        return convertToFunctionBody(visitNode(body, asyncBodyVisitor, isConciseBody));
      }
    }

    function getPromiseConstructor(type: TypeNode | undefined) {
      const typeName = type && getEntityNameFromTypeNode(type);
      if (typeName && Node.is.entityName(typeName)) {
        const serializationKind = resolver.getTypeReferenceSerializationKind(typeName);
        if (serializationKind === TypeReferenceSerializationKind.TypeWithConstructSignatureAndValue || serializationKind === TypeReferenceSerializationKind.Unknown) {
          return typeName;
        }
      }

      return;
    }

    function enableSubstitutionForAsyncMethodsWithSuper() {
      if ((enabledSubstitutions & ES2017SubstitutionFlags.AsyncMethodsWithSuper) === 0) {
        enabledSubstitutions |= ES2017SubstitutionFlags.AsyncMethodsWithSuper;

        // We need to enable substitutions for call, property access, and element access
        // if we need to rewrite super calls.
        context.enableSubstitution(Syntax.CallExpression);
        context.enableSubstitution(Syntax.PropertyAccessExpression);
        context.enableSubstitution(Syntax.ElementAccessExpression);

        // We need to be notified when entering and exiting declarations that bind super.
        context.enableEmitNotification(Syntax.ClassDeclaration);
        context.enableEmitNotification(Syntax.MethodDeclaration);
        context.enableEmitNotification(Syntax.GetAccessor);
        context.enableEmitNotification(Syntax.SetAccessor);
        context.enableEmitNotification(Syntax.Constructor);
        // We need to be notified when entering the generated accessor arrow functions.
        context.enableEmitNotification(Syntax.VariableStatement);
      }
    }

    /**
     * Hook for node emit.
     *
     * @param hint A hint as to the intended usage of the node.
     * @param node The node to emit.
     * @param emit A callback used to emit the node in the printer.
     */
    function onEmitNode(hint: EmitHint, node: Node, emitCallback: (hint: EmitHint, node: Node) => void): void {
      // If we need to support substitutions for `super` in an async method,
      // we should track it here.
      if (enabledSubstitutions & ES2017SubstitutionFlags.AsyncMethodsWithSuper && isSuperContainer(node)) {
        const superContainerFlags = resolver.getNodeCheckFlags(node) & (NodeCheckFlags.AsyncMethodWithSuper | NodeCheckFlags.AsyncMethodWithSuperBinding);
        if (superContainerFlags !== enclosingSuperContainerFlags) {
          const savedEnclosingSuperContainerFlags = enclosingSuperContainerFlags;
          enclosingSuperContainerFlags = superContainerFlags;
          previousOnEmitNode(hint, node, emitCallback);
          enclosingSuperContainerFlags = savedEnclosingSuperContainerFlags;
          return;
        }
      }
      // Disable substitution in the generated super accessor itself.
      else if (enabledSubstitutions && substitutedSuperAccessors[getNodeId(node)]) {
        const savedEnclosingSuperContainerFlags = enclosingSuperContainerFlags;
        enclosingSuperContainerFlags = 0;
        previousOnEmitNode(hint, node, emitCallback);
        enclosingSuperContainerFlags = savedEnclosingSuperContainerFlags;
        return;
      }
      previousOnEmitNode(hint, node, emitCallback);
    }

    /**
     * Hooks node substitutions.
     *
     * @param hint A hint as to the intended usage of the node.
     * @param node The node to substitute.
     */
    function onSubstituteNode(hint: EmitHint, node: Node) {
      node = previousOnSubstituteNode(hint, node);
      if (hint === EmitHint.Expression && enclosingSuperContainerFlags) {
        return substituteExpression(<Expression>node);
      }

      return node;
    }

    function substituteExpression(node: Expression) {
      switch (node.kind) {
        case Syntax.PropertyAccessExpression:
          return substitutePropertyAccessExpression(<PropertyAccessExpression>node);
        case Syntax.ElementAccessExpression:
          return substituteElementAccessExpression(<ElementAccessExpression>node);
        case Syntax.CallExpression:
          return substituteCallExpression(<CallExpression>node);
      }
      return node;
    }

    function substitutePropertyAccessExpression(node: PropertyAccessExpression) {
      if (node.expression.kind === Syntax.SuperKeyword) {
        return setTextRange(createPropertyAccess(createFileLevelUniqueName('_super'), node.name), node);
      }
      return node;
    }

    function substituteElementAccessExpression(node: ElementAccessExpression) {
      if (node.expression.kind === Syntax.SuperKeyword) {
        return createSuperElementAccessInAsyncMethod(node.argumentExpression, node);
      }
      return node;
    }

    function substituteCallExpression(node: CallExpression): Expression {
      const expression = node.expression;
      if (Node.is.superProperty(expression)) {
        const argumentExpression = Node.is.kind(PropertyAccessExpression, expression) ? substitutePropertyAccessExpression(expression) : substituteElementAccessExpression(expression);
        return createCall(createPropertyAccess(argumentExpression, 'call'), /*typeArguments*/ undefined, [createThis(), ...node.arguments]);
      }
      return node;
    }

    function isSuperContainer(node: Node): node is SuperContainer {
      const kind = node.kind;
      return kind === Syntax.ClassDeclaration || kind === Syntax.Constructor || kind === Syntax.MethodDeclaration || kind === Syntax.GetAccessor || kind === Syntax.SetAccessor;
    }

    function createSuperElementAccessInAsyncMethod(argumentExpression: Expression, location: TextRange): LeftHandSideExpression {
      if (enclosingSuperContainerFlags & NodeCheckFlags.AsyncMethodWithSuperBinding) {
        return setTextRange(createPropertyAccess(createCall(createFileLevelUniqueName('_superIndex'), /*typeArguments*/ undefined, [argumentExpression]), 'value'), location);
      } else {
        return setTextRange(createCall(createFileLevelUniqueName('_superIndex'), /*typeArguments*/ undefined, [argumentExpression]), location);
      }
    }
  }

  /** Creates a variable named `_super` with accessor properties for the given property names. */
  export function createSuperAccessVariableStatement(resolver: EmitResolver, node: FunctionLikeDeclaration, names: UnderscoreEscapedMap<true>) {
    // Create a variable declaration with a getter/setter (if binding) definition for each name:
    //   const _super = Object.create(null, { x: { get: () => super.x, set: (v) => super.x = v }, ... });
    const hasBinding = (resolver.getNodeCheckFlags(node) & NodeCheckFlags.AsyncMethodWithSuperBinding) !== 0;
    const accessors: PropertyAssignment[] = [];
    names.forEach((_, key) => {
      const name = syntax.get.unescUnderscores(key);
      const getterAndSetter: PropertyAssignment[] = [];
      getterAndSetter.push(
        createPropertyAssignment(
          'get',
          createArrowFunction(
            /* modifiers */ undefined,
            /* typeParameters */ undefined,
            /* parameters */ [],
            /* type */ undefined,
            /* equalsGreaterThanToken */ undefined,
            setEmitFlags(createPropertyAccess(setEmitFlags(createSuper(), EmitFlags.NoSubstitution), name), EmitFlags.NoSubstitution)
          )
        )
      );
      if (hasBinding) {
        getterAndSetter.push(
          createPropertyAssignment(
            'set',
            createArrowFunction(
              /* modifiers */ undefined,
              /* typeParameters */ undefined,
              /* parameters */ [
                createParameter(
                  /* decorators */ undefined,
                  /* modifiers */ undefined,
                  /* dot3Token */ undefined,
                  'v',
                  /* questionToken */ undefined,
                  /* type */ undefined,
                  /* initializer */ undefined
                ),
              ],
              /* type */ undefined,
              /* equalsGreaterThanToken */ undefined,
              createAssignment(setEmitFlags(createPropertyAccess(setEmitFlags(createSuper(), EmitFlags.NoSubstitution), name), EmitFlags.NoSubstitution), createIdentifier('v'))
            )
          )
        );
      }
      accessors.push(createPropertyAssignment(name, createObjectLiteral(getterAndSetter)));
    });
    return createVariableStatement(
      /* modifiers */ undefined,
      createVariableDeclarationList(
        [
          createVariableDeclaration(
            createFileLevelUniqueName('_super'),
            /* type */ undefined,
            createCall(createPropertyAccess(createIdentifier('Object'), 'create'), /* typeArguments */ undefined, [createNull(), createObjectLiteral(accessors, /* multiline */ true)])
          ),
        ],
        NodeFlags.Const
      )
    );
  }

  export const awaiterHelper: UnscopedEmitHelper = {
    name: 'typescript:awaiter',
    importName: '__awaiter',
    scoped: false,
    priority: 5,
    text: `
            var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
                function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
                return new (P || (P = Promise))(function (resolve, reject) {
                    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
                    function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
                    function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
                    step((generator = generator.apply(thisArg, _arguments || [])).next());
                });
            };`,
  };

  function createAwaiterHelper(context: TransformationContext, hasLexicalThis: boolean, hasLexicalArguments: boolean, promiseConstructor: EntityName | Expression | undefined, body: Block) {
    context.requestEmitHelper(awaiterHelper);

    const generatorFunc = createFunctionExpression(
      /*modifiers*/ undefined,
      createToken(Syntax.AsteriskToken),
      /*name*/ undefined,
      /*typeParameters*/ undefined,
      /*parameters*/ [],
      /*type*/ undefined,
      body
    );

    // Mark this node as originally an async function
    (generatorFunc.emitNode || (generatorFunc.emitNode = {} as EmitNode)).flags |= EmitFlags.AsyncFunctionBody | EmitFlags.ReuseTempVariableScope;

    return createCall(getUnscopedHelperName('__awaiter'), /*typeArguments*/ undefined, [
      hasLexicalThis ? createThis() : createVoidZero(),
      hasLexicalArguments ? createIdentifier('arguments') : createVoidZero(),
      promiseConstructor ? createExpressionFromEntityName(promiseConstructor) : createVoidZero(),
      generatorFunc,
    ]);
  }

  export const asyncSuperHelper: EmitHelper = {
    name: 'typescript:async-super',
    scoped: true,
    text: helperString`
            const ${'_superIndex'} = name => super[name];`,
  };

  export const advancedAsyncSuperHelper: EmitHelper = {
    name: 'typescript:advanced-async-super',
    scoped: true,
    text: helperString`
            const ${'_superIndex'} = (function (geti, seti) {
                const cache = Object.create(null);
                return name => cache[name] || (cache[name] = { get value() { return geti(name); }, set value(v) { seti(name, v); } });
            })(name => super[name], (name, value) => super[name] = value);`,
  };
}
