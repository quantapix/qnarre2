namespace core {
  interface FlattenContext {
    context: TransformationContext;
    level: FlattenLevel;
    downlevelIteration: boolean;
    hoistTempVariables: boolean;
    emitExpression: (value: Expression) => void;
    emitBindingOrAssignment: (target: BindingOrAssignmentElementTarget, value: Expression, location: TextRange, original: Node | undefined) => void;
    createArrayBindingOrAssignmentPattern: (elements: BindingOrAssignmentElement[]) => ArrayBindingOrAssignmentPattern;
    createObjectBindingOrAssignmentPattern: (elements: BindingOrAssignmentElement[]) => ObjectBindingOrAssignmentPattern;
    createArrayBindingOrAssignmentElement: (node: Identifier) => BindingOrAssignmentElement;
    visitor?: (node: Node) => VisitResult<Node>;
  }

  export const enum FlattenLevel {
    All,
    ObjectRest,
  }

  export function flattenDestructuringAssignment(
    node: VariableDeclaration | DestructuringAssignment,
    visitor: ((node: Node) => VisitResult<Node>) | undefined,
    context: TransformationContext,
    level: FlattenLevel,
    needsValue?: boolean,
    createAssignmentCallback?: (name: Identifier, value: Expression, location?: TextRange) => Expression
  ): Expression {
    let location: TextRange = node;
    let value: Expression | undefined;
    if (isDestructuringAssignment(node)) {
      value = node.right;
      while (isEmptyArrayLiteral(node.left) || isEmptyObjectLiteral(node.left)) {
        if (isDestructuringAssignment(value)) {
          location = node = value;
          value = node.right;
        } else {
          return visitNode(value, visitor, isExpression);
        }
      }
    }

    let expressions: Expression[] | undefined;
    const flattenContext: FlattenContext = {
      context,
      level,
      downlevelIteration: !!context.getCompilerOptions().downlevelIteration,
      hoistTempVariables: true,
      emitExpression,
      emitBindingOrAssignment,
      createArrayBindingOrAssignmentPattern: makeArrayAssignmentPattern,
      createObjectBindingOrAssignmentPattern: makeObjectAssignmentPattern,
      createArrayBindingOrAssignmentElement: makeAssignmentElement,
      visitor,
    };

    if (value) {
      value = visitNode(value, visitor, isExpression);

      if ((Node.is.kind(Identifier, value) && bindingOrAssignmentElementAssignsToName(node, value.escapedText)) || bindingOrAssignmentElementContainsNonLiteralComputedName(node)) {
        value = ensureIdentifier(flattenContext, value, false, location);
      } else if (needsValue) {
        value = ensureIdentifier(flattenContext, value, true, location);
      } else if (isSynthesized(node)) {
        location = value;
      }
    }

    flattenBindingOrAssignmentElement(flattenContext, node, value, location, isDestructuringAssignment(node));

    if (value && needsValue) {
      if (!some(expressions)) {
        return value;
      }

      expressions.push(value);
    }

    return aggregateTransformFlags(inlineExpressions(expressions!)) || createOmittedExpression();

    function emitExpression(expression: Expression) {
      aggregateTransformFlags(expression);
      expressions = append(expressions, expression);
    }

    function emitBindingOrAssignment(target: BindingOrAssignmentElementTarget, value: Expression, location: TextRange, original: Node) {
      Debug.assertNode(target, createAssignmentCallback ? isIdentifier : isExpression);
      const expression = createAssignmentCallback
        ? createAssignmentCallback(<Identifier>target, value, location)
        : setRange(createAssignment(visitNode(<Expression>target, visitor, isExpression), value), location);
      expression.original = original;
      emitExpression(expression);
    }
  }

  function bindingOrAssignmentElementAssignsToName(element: BindingOrAssignmentElement, escName: __String): boolean {
    const target = getTargetOfBindingOrAssignmentElement(element)!;
    if (isBindingOrAssignmentPattern(target)) {
      return bindingOrAssignmentPatternAssignsToName(target, escName);
    } else if (Node.is.kind(Identifier, target)) {
      return target.escapedText === escName;
    }
    return false;
  }

  function bindingOrAssignmentPatternAssignsToName(pattern: BindingOrAssignmentPattern, escName: __String): boolean {
    const elements = getElementsOfBindingOrAssignmentPattern(pattern);
    for (const element of elements) {
      if (bindingOrAssignmentElementAssignsToName(element, escName)) {
        return true;
      }
    }
    return false;
  }

  function bindingOrAssignmentElementContainsNonLiteralComputedName(element: BindingOrAssignmentElement): boolean {
    const propertyName = tryGetPropertyNameOfBindingOrAssignmentElement(element);
    if (propertyName && Node.is.kind(ComputedPropertyName, propertyName) && !Node.is.literalExpression(propertyName.expression)) {
      return true;
    }
    const target = getTargetOfBindingOrAssignmentElement(element);
    return !!target && isBindingOrAssignmentPattern(target) && bindingOrAssignmentPatternContainsNonLiteralComputedName(target);
  }

  function bindingOrAssignmentPatternContainsNonLiteralComputedName(pattern: BindingOrAssignmentPattern): boolean {
    return !!forEach(getElementsOfBindingOrAssignmentPattern(pattern), bindingOrAssignmentElementContainsNonLiteralComputedName);
  }

  export function flattenDestructuringBinding(
    node: VariableDeclaration | ParameterDeclaration,
    visitor: (node: Node) => VisitResult<Node>,
    context: TransformationContext,
    level: FlattenLevel,
    rval?: Expression,
    hoistTempVariables = false,
    skipInitializer?: boolean
  ): VariableDeclaration[] {
    let pendingExpressions: Expression[] | undefined;
    const pendingDeclarations: {
      pendingExpressions?: Expression[];
      name: BindingName;
      value: Expression;
      location?: TextRange;
      original?: Node;
    }[] = [];
    const declarations: VariableDeclaration[] = [];
    const flattenContext: FlattenContext = {
      context,
      level,
      downlevelIteration: !!context.getCompilerOptions().downlevelIteration,
      hoistTempVariables,
      emitExpression,
      emitBindingOrAssignment,
      createArrayBindingOrAssignmentPattern: makeArrayBindingPattern,
      createObjectBindingOrAssignmentPattern: makeObjectBindingPattern,
      createArrayBindingOrAssignmentElement: makeBindingElement,
      visitor,
    };

    if (Node.is.kind(VariableDeclaration, node)) {
      let initializer = getInitializerOfBindingOrAssignmentElement(node);
      if (
        initializer &&
        ((Node.is.kind(Identifier, initializer) && bindingOrAssignmentElementAssignsToName(node, initializer.escapedText)) || bindingOrAssignmentElementContainsNonLiteralComputedName(node))
      ) {
        initializer = ensureIdentifier(flattenContext, initializer, false, initializer);
        node = updateVariableDeclaration(node, node.name, node.type, initializer);
      }
    }

    flattenBindingOrAssignmentElement(flattenContext, node, rval, node, skipInitializer);
    if (pendingExpressions) {
      const temp = createTempVariable(undefined);
      if (hoistTempVariables) {
        const value = inlineExpressions(pendingExpressions);
        pendingExpressions = undefined;
        emitBindingOrAssignment(temp, value, undefined);
      } else {
        context.hoistVariableDeclaration(temp);
        const pendingDeclaration = last(pendingDeclarations);
        pendingDeclaration.pendingExpressions = append(pendingDeclaration.pendingExpressions, createAssignment(temp, pendingDeclaration.value));
        addRange(pendingDeclaration.pendingExpressions, pendingExpressions);
        pendingDeclaration.value = temp;
      }
    }
    for (const { pendingExpressions, name, value, location, original } of pendingDeclarations) {
      const variable = createVariableDeclaration(name, undefined, pendingExpressions ? inlineExpressions(append(pendingExpressions, value)) : value);
      variable.original = original;
      setRange(variable, location);
      aggregateTransformFlags(variable);
      declarations.push(variable);
    }
    return declarations;

    function emitExpression(value: Expression) {
      pendingExpressions = append(pendingExpressions, value);
    }

    function emitBindingOrAssignment(target: BindingOrAssignmentElementTarget, value: Expression, location: TextRange | undefined, original: Node | undefined) {
      Debug.assertNode(target, isBindingName);
      if (pendingExpressions) {
        value = inlineExpressions(append(pendingExpressions, value));
        pendingExpressions = undefined;
      }
      pendingDeclarations.push({ pendingExpressions, name: target, value, location, original });
    }
  }

  function flattenBindingOrAssignmentElement(flattenContext: FlattenContext, element: BindingOrAssignmentElement, value: Expression | undefined, location: TextRange, skipInitializer?: boolean) {
    if (!skipInitializer) {
      const initializer = visitNode(getInitializerOfBindingOrAssignmentElement(element), flattenContext.visitor, isExpression);
      if (initializer) {
        value = value ? createDefaultValueCheck(flattenContext, value, initializer, location) : initializer;
      } else if (!value) {
        value = qs.VoidExpression.zero();
      }
    }
    const bindingTarget = getTargetOfBindingOrAssignmentElement(element)!;
    if (isObjectBindingOrAssignmentPattern(bindingTarget)) {
      flattenObjectBindingOrAssignmentPattern(flattenContext, element, bindingTarget, value!, location);
    } else if (isArrayBindingOrAssignmentPattern(bindingTarget)) {
      flattenArrayBindingOrAssignmentPattern(flattenContext, element, bindingTarget, value!, location);
    } else {
      flattenContext.emitBindingOrAssignment(bindingTarget, value!, location, element);
    }
  }

  function flattenObjectBindingOrAssignmentPattern(
    flattenContext: FlattenContext,
    parent: BindingOrAssignmentElement,
    pattern: ObjectBindingOrAssignmentPattern,
    value: Expression,
    location: TextRange
  ) {
    const elements = getElementsOfBindingOrAssignmentPattern(pattern);
    const numElements = elements.length;
    if (numElements !== 1) {
      const reuseIdentifierExpressions = !isDeclarationBindingElement(parent) || numElements !== 0;
      value = ensureIdentifier(flattenContext, value, reuseIdentifierExpressions, location);
    }
    let bindingElements: BindingOrAssignmentElement[] | undefined;
    let computedTempVariables: Expression[] | undefined;
    for (let i = 0; i < numElements; i++) {
      const element = elements[i];
      if (!getRestIndicatorOfBindingOrAssignmentElement(element)) {
        const propertyName = getPropertyNameOfBindingOrAssignmentElement(element)!;
        if (
          flattenContext.level >= FlattenLevel.ObjectRest &&
          !(element.transformFlags & (TransformFlags.ContainsRestOrSpread | TransformFlags.ContainsObjectRestOrSpread)) &&
          !(getTargetOfBindingOrAssignmentElement(element)!.transformFlags & (TransformFlags.ContainsRestOrSpread | TransformFlags.ContainsObjectRestOrSpread)) &&
          !Node.is.kind(ComputedPropertyName, propertyName)
        ) {
          bindingElements = append(bindingElements, visitNode(element, flattenContext.visitor));
        } else {
          if (bindingElements) {
            flattenContext.emitBindingOrAssignment(flattenContext.createObjectBindingOrAssignmentPattern(bindingElements), value, location, pattern);
            bindingElements = undefined;
          }
          const rhsValue = createDestructuringPropertyAccess(flattenContext, value, propertyName);
          if (Node.is.kind(ComputedPropertyName, propertyName)) {
            computedTempVariables = append<Expression>(computedTempVariables, (rhsValue as ElementAccessExpression).argumentExpression);
          }
          flattenBindingOrAssignmentElement(flattenContext, element, rhsValue, element);
        }
      } else if (i === numElements - 1) {
        if (bindingElements) {
          flattenContext.emitBindingOrAssignment(flattenContext.createObjectBindingOrAssignmentPattern(bindingElements), value, location, pattern);
          bindingElements = undefined;
        }
        const rhsValue = createRestCall(flattenContext.context, value, elements, computedTempVariables!, pattern);
        flattenBindingOrAssignmentElement(flattenContext, element, rhsValue, element);
      }
    }
    if (bindingElements) {
      flattenContext.emitBindingOrAssignment(flattenContext.createObjectBindingOrAssignmentPattern(bindingElements), value, location, pattern);
    }
  }

  function flattenArrayBindingOrAssignmentPattern(
    flattenContext: FlattenContext,
    parent: BindingOrAssignmentElement,
    pattern: ArrayBindingOrAssignmentPattern,
    value: Expression,
    location: TextRange
  ) {
    const elements = getElementsOfBindingOrAssignmentPattern(pattern);
    const numElements = elements.length;
    if (flattenContext.level < FlattenLevel.ObjectRest && flattenContext.downlevelIteration) {
      value = ensureIdentifier(
        flattenContext,
        createReadHelper(flattenContext.context, value, numElements > 0 && getRestIndicatorOfBindingOrAssignmentElement(elements[numElements - 1]) ? undefined : numElements, location),
        false,
        location
      );
    } else if ((numElements !== 1 && (flattenContext.level < FlattenLevel.ObjectRest || numElements === 0)) || every(elements, isOmittedExpression)) {
      const reuseIdentifierExpressions = !isDeclarationBindingElement(parent) || numElements !== 0;
      value = ensureIdentifier(flattenContext, value, reuseIdentifierExpressions, location);
    }
    let bindingElements: BindingOrAssignmentElement[] | undefined;
    let restContainingElements: [Identifier, BindingOrAssignmentElement][] | undefined;
    for (let i = 0; i < numElements; i++) {
      const element = elements[i];
      if (flattenContext.level >= FlattenLevel.ObjectRest) {
        if (element.transformFlags & TransformFlags.ContainsObjectRestOrSpread) {
          const temp = createTempVariable(undefined);
          if (flattenContext.hoistTempVariables) {
            flattenContext.context.hoistVariableDeclaration(temp);
          }

          restContainingElements = append(restContainingElements, <[Identifier, BindingOrAssignmentElement]>[temp, element]);
          bindingElements = append(bindingElements, flattenContext.createArrayBindingOrAssignmentElement(temp));
        } else {
          bindingElements = append(bindingElements, element);
        }
      } else if (Node.is.kind(OmittedExpression, element)) {
        continue;
      } else if (!getRestIndicatorOfBindingOrAssignmentElement(element)) {
        const rhsValue = new qs.ElementAccessExpression(value, i);
        flattenBindingOrAssignmentElement(flattenContext, element, rhsValue, element);
      } else if (i === numElements - 1) {
        const rhsValue = createArraySlice(value, i);
        flattenBindingOrAssignmentElement(flattenContext, element, rhsValue, element);
      }
    }
    if (bindingElements) {
      flattenContext.emitBindingOrAssignment(flattenContext.createArrayBindingOrAssignmentPattern(bindingElements), value, location, pattern);
    }
    if (restContainingElements) {
      for (const [id, element] of restContainingElements) {
        flattenBindingOrAssignmentElement(flattenContext, element, id, element);
      }
    }
  }

  function createDefaultValueCheck(flattenContext: FlattenContext, value: Expression, defaultValue: Expression, location: TextRange): Expression {
    value = ensureIdentifier(flattenContext, value, true, location);
    return createConditional(createTypeCheck(value, 'undefined'), defaultValue, value);
  }

  function createDestructuringPropertyAccess(flattenContext: FlattenContext, value: Expression, propertyName: PropertyName): LeftHandSideExpression {
    if (Node.is.kind(ComputedPropertyName, propertyName)) {
      const argumentExpression = ensureIdentifier(flattenContext, visitNode(propertyName.expression, flattenContext.visitor), propertyName);
      return new qs.ElementAccessExpression(value, argumentExpression);
    } else if (StringLiteral.orNumericLiteralLike(propertyName)) {
      const argumentExpression = getSynthesizedClone(propertyName);
      argumentExpression.text = argumentExpression.text;
      return new qs.ElementAccessExpression(value, argumentExpression);
    } else {
      const name = new Identifier(idText(propertyName));
      return createPropertyAccess(value, name);
    }
  }

  function ensureIdentifier(flattenContext: FlattenContext, value: Expression, reuseIdentifierExpressions: boolean, location: TextRange) {
    if (Node.is.kind(Identifier, value) && reuseIdentifierExpressions) {
      return value;
    } else {
      const temp = createTempVariable(undefined);
      if (flattenContext.hoistTempVariables) {
        flattenContext.context.hoistVariableDeclaration(temp);
        flattenContext.emitExpression(setRange(createAssignment(temp, value), location));
      } else {
        flattenContext.emitBindingOrAssignment(temp, value, location, undefined);
      }
      return temp;
    }
  }

  function makeArrayBindingPattern(elements: BindingOrAssignmentElement[]) {
    Debug.assertEachNode(elements, isArrayBindingElement);
    return new ArrayBindingPattern(<ArrayBindingElement[]>elements);
  }

  function makeArrayAssignmentPattern(elements: BindingOrAssignmentElement[]) {
    return new ArrayLiteralExpression(map(elements, convertToArrayAssignmentElement));
  }

  function makeObjectBindingPattern(elements: BindingOrAssignmentElement[]) {
    Debug.assertEachNode(elements, BindingElement.kind);
    return ObjectBindingPattern.create(<BindingElement[]>elements);
  }

  function makeObjectAssignmentPattern(elements: BindingOrAssignmentElement[]) {
    return createObjectLiteral(map(elements, convertToObjectAssignmentElement));
  }

  function makeBindingElement(name: Identifier) {
    return new BindingElement(undefined, name);
  }

  function makeAssignmentElement(name: Identifier) {
    return name;
  }

  export const restHelper: UnscopedEmitHelper = {
    name: 'typescript:rest',
    importName: '__rest',
    scoped: false,
    text: `
            var __rest = (this && this.__rest) || function (s, e) {
                var t = {};
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
                    t[p] = s[p];
                if (s != null && typeof Object.getOwnPropertySymbols === "function")
                    for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                        if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                            t[p[i]] = s[p[i]];
                    }
                return t;
            };`,
  };

  /** Given value: o, propName: p, pattern: { a, b, ...p } from the original statement
   * `{ a, b, ...p } = o`, create `p = __rest(o, ["a", "b"]);`
   */
  function createRestCall(
    context: TransformationContext,
    value: Expression,
    elements: readonly BindingOrAssignmentElement[],
    computedTempVariables: readonly Expression[],
    location: TextRange
  ): Expression {
    context.requestEmitHelper(restHelper);
    const propertyNames: Expression[] = [];
    let computedTempVariableOffset = 0;
    for (let i = 0; i < elements.length - 1; i++) {
      const propertyName = getPropertyNameOfBindingOrAssignmentElement(elements[i]);
      if (propertyName) {
        if (Node.is.kind(ComputedPropertyName, propertyName)) {
          const temp = computedTempVariables[computedTempVariableOffset];
          computedTempVariableOffset++;

          propertyNames.push(createConditional(createTypeCheck(temp, 'symbol'), temp, createAdd(temp, createLiteral(''))));
        } else {
          propertyNames.push(createLiteral(propertyName));
        }
      }
    }
    return new qs.CallExpression(getUnscopedHelperName('__rest'), undefined, [value, setRange(new ArrayLiteralExpression(propertyNames), location)]);
  }
}
