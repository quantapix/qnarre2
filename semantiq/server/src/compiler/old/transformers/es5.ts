namespace core {
  /**
   * Transforms ES5 syntax into ES3 syntax.
   *
   * @param context Context and state information for the transformation.
   */
  export function transformES5(context: TransformationContext) {
    const compilerOptions = context.getCompilerOptions();

    // enable emit notification only if using --jsx preserve or react-native
    let previousOnEmitNode: (hint: EmitHint, node: Node, emitCallback: (hint: EmitHint, node: Node) => void) => void;
    let noSubstitution: boolean[];
    if (compilerOptions.jsx === JsxEmit.Preserve || compilerOptions.jsx === JsxEmit.ReactNative) {
      previousOnEmitNode = context.onEmitNode;
      context.onEmitNode = onEmitNode;
      context.enableEmitNotification(Syntax.JsxOpeningElement);
      context.enableEmitNotification(Syntax.JsxClosingElement);
      context.enableEmitNotification(Syntax.JsxSelfClosingElement);
      noSubstitution = [];
    }

    const previousOnSubstituteNode = context.onSubstituteNode;
    context.onSubstituteNode = onSubstituteNode;
    context.enableSubstitution(Syntax.PropertyAccessExpression);
    context.enableSubstitution(Syntax.PropertyAssignment);
    return chainBundle(transformSourceFile);

    /**
     * Transforms an ES5 source file to ES3.
     *
     * @param node A SourceFile
     */
    function transformSourceFile(node: SourceFile) {
      return node;
    }

    /**
     * Called by the printer just before a node is printed.
     *
     * @param hint A hint as to the intended usage of the node.
     * @param node The node to emit.
     * @param emitCallback A callback used to emit the node.
     */
    function onEmitNode(hint: EmitHint, node: Node, emitCallback: (emitContext: EmitHint, node: Node) => void) {
      switch (node.kind) {
        case Syntax.JsxOpeningElement:
        case Syntax.JsxClosingElement:
        case Syntax.JsxSelfClosingElement:
          const tagName = (<JsxOpeningElement | JsxClosingElement | JsxSelfClosingElement>node).tagName;
          noSubstitution[getOriginalNodeId(tagName)] = true;
          break;
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
      if (node.id && noSubstitution && noSubstitution[node.id]) {
        return previousOnSubstituteNode(hint, node);
      }

      node = previousOnSubstituteNode(hint, node);
      if (Node.is.kind(PropertyAccessExpression, node)) {
        return substitutePropertyAccessExpression(node);
      } else if (Node.is.kind(PropertyAssignment, node)) {
        return substitutePropertyAssignment(node);
      }
      return node;
    }

    /**
     * Substitutes a PropertyAccessExpression whose name is a reserved word.
     *
     * @param node A PropertyAccessExpression
     */
    function substitutePropertyAccessExpression(node: PropertyAccessExpression): Expression {
      if (Node.is.kind(PrivateIdentifier, node.name)) {
        return node;
      }
      const literalName = trySubstituteReservedName(node.name);
      if (literalName) {
        return setRange(createElementAccess(node.expression, literalName), node);
      }
      return node;
    }

    /**
     * Substitutes a PropertyAssignment whose name is a reserved word.
     *
     * @param node A PropertyAssignment
     */
    function substitutePropertyAssignment(node: PropertyAssignment): PropertyAssignment {
      const literalName = Node.is.kind(Identifier, node.name) && trySubstituteReservedName(node.name);
      if (literalName) {
        return updatePropertyAssignment(node, literalName, node.initializer);
      }
      return node;
    }

    /**
     * If an identifier name is a reserved word, returns a string literal for the name.
     *
     * @param name An Identifier
     */
    function trySubstituteReservedName(name: Identifier) {
      const token = name.originalKeywordKind || (isSynthesized(name) ? Token.fromString(idText(name)) : undefined);
      if (token !== undefined && token >= Syntax.FirstReservedWord && token <= Syntax.LastReservedWord) {
        return setRange(createLiteral(name), name);
      }
      return;
    }
  }
}