import * as qb from '../base';
import * as qc from '../core';
import { Node, Nodes } from '../core';
import * as qs from '../classes';
import * as qt from '../types';
import * as qy from '../syntax';
import { Modifier, Syntax } from '../syntax';
const enum ClassPropertySubstitutionFlags {
  ClassAliases = 1 << 0,
}
const enum PrivateIdentifierPlacement {
  InstanceField,
}
type PrivateIdentifierInfo = PrivateIdentifierInstanceField;
interface PrivateIdentifierInstanceField {
  placement: PrivateIdentifierPlacement.InstanceField;
  weakMapName: Identifier;
}
type PrivateIdentifierEnvironment = UnderscoreEscapedMap<PrivateIdentifierInfo>;
export function transformClassFields(context: TransformationContext) {
  const { hoistVariableDeclaration, endLexicalEnvironment, resumeLexicalEnvironment } = context;
  const resolver = context.getEmitResolver();
  const compilerOptions = context.getCompilerOptions();
  const languageVersion = getEmitScriptTarget(compilerOptions);
  const shouldTransformPrivateFields = languageVersion < ScriptTarget.ESNext;
  const previousOnSubstituteNode = context.onSubstituteNode;
  context.onSubstituteNode = onSubstituteNode;
  let enabledSubstitutions: ClassPropertySubstitutionFlags;
  let classAliases: Identifier[];
  let pendingExpressions: Expression[] | undefined;
  let pendingStatements: Statement[] | undefined;
  const privateIdentifierEnvironmentStack: (PrivateIdentifierEnvironment | undefined)[] = [];
  let currentPrivateIdentifierEnvironment: PrivateIdentifierEnvironment | undefined;
  return chainBundle(transformSourceFile);
  function transformSourceFile(node: SourceFile) {
    const options = context.getCompilerOptions();
    if (node.isDeclarationFile || (options.useDefineForClassFields && options.target === ScriptTarget.ESNext)) return node;
    const visited = visitEachChild(node, visitor, context);
    addEmitHelpers(visited, context.readEmitHelpers());
    return visited;
  }
  function visitor(node: Node): VisitResult<Node> {
    if (!(node.transformFlags & TransformFlags.ContainsClassFields)) return node;
    switch (node.kind) {
      case Syntax.ClassExpression:
      case Syntax.ClassDeclaration:
        return visitClassLike(node as ClassLikeDeclaration);
      case Syntax.PropertyDeclaration:
        return visitPropertyDeclaration(node as PropertyDeclaration);
      case Syntax.VariableStatement:
        return visitVariableStatement(node as VariableStatement);
      case Syntax.ComputedPropertyName:
        return visitComputedPropertyName(node as ComputedPropertyName);
      case Syntax.PropertyAccessExpression:
        return visitPropertyAccessExpression(node as PropertyAccessExpression);
      case Syntax.PrefixUnaryExpression:
        return visitPrefixUnaryExpression(node as PrefixUnaryExpression);
      case Syntax.PostfixUnaryExpression:
        return visitPostfixUnaryExpression(node as PostfixUnaryExpression, false);
      case Syntax.CallExpression:
        return visitCallExpression(node as CallExpression);
      case Syntax.BinaryExpression:
        return visitBinaryExpression(node as BinaryExpression);
      case Syntax.PrivateIdentifier:
        return visitPrivateIdentifier(node as PrivateIdentifier);
      case Syntax.ExpressionStatement:
        return visitExpressionStatement(node as ExpressionStatement);
      case Syntax.ForStatement:
        return visitForStatement(node as ForStatement);
      case Syntax.TaggedTemplateExpression:
        return visitTaggedTemplateExpression(node as TaggedTemplateExpression);
    }
    return visitEachChild(node, visitor, context);
  }
  function visitorDestructuringTarget(node: Node): VisitResult<Node> {
    switch (node.kind) {
      case Syntax.ObjectLiteralExpression:
      case Syntax.ArrayLiteralExpression:
        return visitAssignmentPattern(node as AssignmentPattern);
      default:
        return visitor(node);
    }
  }
  function visitPrivateIdentifier(node: PrivateIdentifier) {
    if (!shouldTransformPrivateFields) return node;
    return setOriginalNode(new Identifier(''), node);
  }
  function classElementVisitor(node: Node): VisitResult<Node> {
    switch (node.kind) {
      case Syntax.Constructor:
        return;
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
      case Syntax.MethodDeclaration:
        return visitEachChild(node, classElementVisitor, context);
      case Syntax.PropertyDeclaration:
        return visitPropertyDeclaration(node as PropertyDeclaration);
      case Syntax.ComputedPropertyName:
        return visitComputedPropertyName(node as ComputedPropertyName);
      case Syntax.SemicolonClassElement:
        return node;
      default:
        return visitor(node);
    }
  }
  function visitVariableStatement(node: VariableStatement) {
    const savedPendingStatements = pendingStatements;
    pendingStatements = [];
    const visitedNode = visitEachChild(node, visitor, context);
    const statement = some(pendingStatements) ? [visitedNode, ...pendingStatements] : visitedNode;
    pendingStatements = savedPendingStatements;
    return statement;
  }
  function visitComputedPropertyName(name: ComputedPropertyName) {
    let node = visitEachChild(name, visitor, context);
    if (some(pendingExpressions)) {
      const expressions = pendingExpressions;
      expressions.push(name.expression);
      pendingExpressions = [];
      node = node.update(inlineExpressions(expressions));
    }
    return node;
  }
  function visitPropertyDeclaration(node: PropertyDeclaration) {
    assert(!some(node.decorators));
    if (!shouldTransformPrivateFields && Node.is.kind(PrivateIdentifier, node.name))
      return node.update(undefined, Nodes.visit(node.modifiers, visitor, isModifier), node.name, undefined, undefined, undefined);
    const expr = getPropertyNameExpressionIfNeeded(node.name, !!node.initializer || !!context.getCompilerOptions().useDefineForClassFields);
    if (expr && !isSimpleInlineableExpression(expr)) {
      (pendingExpressions || (pendingExpressions = [])).push(expr);
    }
    return;
  }
  function createPrivateIdentifierAccess(info: PrivateIdentifierInfo, receiver: Expression): Expression {
    receiver = visitNode(receiver, visitor, isExpression);
    switch (info.placement) {
      case PrivateIdentifierPlacement.InstanceField:
        return createClassPrivateFieldGetHelper(context, isSynthesized(receiver) ? receiver : getSynthesizedClone(receiver), info.weakMapName);
      default:
        return fail('Unexpected private identifier placement');
    }
  }
  function visitPropertyAccessExpression(node: PropertyAccessExpression) {
    if (shouldTransformPrivateFields && Node.is.kind(PrivateIdentifier, node.name)) {
      const privateIdentifierInfo = accessPrivateIdentifier(node.name);
      if (privateIdentifierInfo) return setOriginalNode(createPrivateIdentifierAccess(privateIdentifierInfo, node.expression), node);
    }
    return visitEachChild(node, visitor, context);
  }
  function visitPrefixUnaryExpression(node: PrefixUnaryExpression) {
    if (shouldTransformPrivateFields && Node.is.privateIdentifierPropertyAccessExpression(node.operand)) {
      const operator = node.operator === Syntax.Plus2Token ? Syntax.PlusToken : node.operator === Syntax.Minus2Token ? Syntax.MinusToken : undefined;
      let info: PrivateIdentifierInfo | undefined;
      if (operator && (info = accessPrivateIdentifier(node.operand.name))) {
        const receiver = visitNode(node.operand.expression, visitor, isExpression);
        const { readExpression, initializeExpression } = createCopiableReceiverExpr(receiver);
        const existingValue = new qs.PrefixUnaryExpression(Syntax.PlusToken, createPrivateIdentifierAccess(info, readExpression));
        return setOriginalNode(
          createPrivateIdentifierAssignment(info, initializeExpression || readExpression, new BinaryExpression(existingValue, operator, createLiteral(1)), Syntax.EqualsToken),
          node
        );
      }
    }
    return visitEachChild(node, visitor, context);
  }
  function visitPostfixUnaryExpression(node: PostfixUnaryExpression, valueIsDiscarded: boolean) {
    if (shouldTransformPrivateFields && Node.is.privateIdentifierPropertyAccessExpression(node.operand)) {
      const operator = node.operator === Syntax.Plus2Token ? Syntax.PlusToken : node.operator === Syntax.Minus2Token ? Syntax.MinusToken : undefined;
      let info: PrivateIdentifierInfo | undefined;
      if (operator && (info = accessPrivateIdentifier(node.operand.name))) {
        const receiver = visitNode(node.operand.expression, visitor, isExpression);
        const { readExpression, initializeExpression } = createCopiableReceiverExpr(receiver);
        const existingValue = new qs.PrefixUnaryExpression(Syntax.PlusToken, createPrivateIdentifierAccess(info, readExpression));
        const returnValue = valueIsDiscarded ? undefined : createTempVariable(hoistVariableDeclaration);
        return setOriginalNode(
          inlineExpressions(
            compact<Expression>([
              createPrivateIdentifierAssignment(
                info,
                initializeExpression || readExpression,
                new BinaryExpression(returnValue ? createAssignment(returnValue, existingValue) : existingValue, operator, createLiteral(1)),
                Syntax.EqualsToken
              ),
              returnValue,
            ])
          ),
          node
        );
      }
    }
    return visitEachChild(node, visitor, context);
  }
  function visitForStatement(node: ForStatement) {
    if (node.incrementor && Node.is.kind(PostfixUnaryExpression, node.incrementor)) {
      return updateFor(
        node,
        visitNode(node.initializer, visitor, isForInitializer),
        visitNode(node.condition, visitor, isExpression),
        visitPostfixUnaryExpression(node.incrementor, true),
        visitNode(node.statement, visitor, isStatement)
      );
    }
    return visitEachChild(node, visitor, context);
  }
  function visitExpressionStatement(node: ExpressionStatement) {
    if (Node.is.kind(PostfixUnaryExpression, node.expression)) return node.update(visitPostfixUnaryExpression(node.expression, true));
    return visitEachChild(node, visitor, context);
  }
  function createCopiableReceiverExpr(receiver: Expression): { readExpression: Expression; initializeExpression: Expression | undefined } {
    const clone = isSynthesized(receiver) ? receiver : getSynthesizedClone(receiver);
    if (isSimpleInlineableExpression(receiver)) return { readExpression: clone, initializeExpression: undefined };
    const readExpression = createTempVariable(hoistVariableDeclaration);
    const initializeExpression = createAssignment(readExpression, clone);
    return { readExpression, initializeExpression };
  }
  function visitCallExpression(node: CallExpression) {
    if (shouldTransformPrivateFields && Node.is.privateIdentifierPropertyAccessExpression(node.expression)) {
      const { thisArg, target } = createCallBinding(node.expression, hoistVariableDeclaration, languageVersion);
      return node.update(createPropertyAccess(visitNode(target, visitor), 'call'), undefined, [visitNode(thisArg, visitor, isExpression), ...Nodes.visit(node.arguments, visitor, isExpression)]);
    }
    return visitEachChild(node, visitor, context);
  }
  function visitTaggedTemplateExpression(node: TaggedTemplateExpression) {
    if (shouldTransformPrivateFields && Node.is.privateIdentifierPropertyAccessExpression(node.tag)) {
      const { thisArg, target } = createCallBinding(node.tag, hoistVariableDeclaration, languageVersion);
      return node.update(
        new qs.CallExpression(createPropertyAccess(visitNode(target, visitor), 'bind'), undefined, [visitNode(thisArg, visitor, isExpression)]),
        visitNode(node.template, visitor, isTemplateLiteral)
      );
    }
    return visitEachChild(node, visitor, context);
  }
  function visitBinaryExpression(node: BinaryExpression) {
    if (shouldTransformPrivateFields) {
      if (isDestructuringAssignment(node)) {
        const savedPendingExpressions = pendingExpressions;
        pendingExpressions = undefined!;
        node = node.update(visitNode(node.left, visitorDestructuringTarget), visitNode(node.right, visitor), node.operatorToken);
        const expr = some(pendingExpressions) ? inlineExpressions(compact([...pendingExpressions!, node])) : node;
        pendingExpressions = savedPendingExpressions;
        return expr;
      }
      if (isAssignmentExpression(node) && Node.is.privateIdentifierPropertyAccessExpression(node.left)) {
        const info = accessPrivateIdentifier(node.left.name);
        if (info) return setOriginalNode(createPrivateIdentifierAssignment(info, node.left.expression, node.right, node.operatorToken.kind), node);
      }
    }
    return visitEachChild(node, visitor, context);
  }
  function createPrivateIdentifierAssignment(info: PrivateIdentifierInfo, receiver: Expression, right: Expression, operator: AssignmentOperator) {
    switch (info.placement) {
      case PrivateIdentifierPlacement.InstanceField: {
        return createPrivateIdentifierInstanceFieldAssignment(info, receiver, right, operator);
      }
      default:
        return fail('Unexpected private identifier placement');
    }
  }
  function createPrivateIdentifierInstanceFieldAssignment(info: PrivateIdentifierInstanceField, receiver: Expression, right: Expression, operator: AssignmentOperator) {
    receiver = visitNode(receiver, visitor, isExpression);
    right = visitNode(right, visitor, isExpression);
    if (isCompoundAssignment(operator)) {
      const { readExpression, initializeExpression } = createCopiableReceiverExpr(receiver);
      return createClassPrivateFieldSetHelper(
        context,
        initializeExpression || readExpression,
        info.weakMapName,
        new BinaryExpression(createClassPrivateFieldGetHelper(context, readExpression, info.weakMapName), getNonAssignmentOperatorForCompoundAssignment(operator), right)
      );
    }
    return createClassPrivateFieldSetHelper(context, receiver, info.weakMapName, right);
  }
  function visitClassLike(node: ClassLikeDeclaration) {
    const savedPendingExpressions = pendingExpressions;
    pendingExpressions = undefined;
    if (shouldTransformPrivateFields) {
      startPrivateIdentifierEnvironment();
    }
    const result = Node.is.kind(ClassDeclaration, node) ? visitClassDeclaration(node) : visitClassExpression(node);
    if (shouldTransformPrivateFields) {
      endPrivateIdentifierEnvironment();
    }
    pendingExpressions = savedPendingExpressions;
    return result;
  }
  function doesClassElementNeedTransform(node: ClassElement) {
    return Node.is.kind(PropertyDeclaration, node) || (shouldTransformPrivateFields && node.name && Node.is.kind(PrivateIdentifier, node.name));
  }
  function visitClassDeclaration(node: ClassDeclaration) {
    if (!forEach(node.members, doesClassElementNeedTransform)) return visitEachChild(node, visitor, context);
    const extendsClauseElement = getEffectiveBaseTypeNode(node);
    const isDerivedClass = !!(extendsClauseElement && skipOuterExpressions(extendsClauseElement.expression).kind !== Syntax.NullKeyword);
    const statements: Statement[] = [
      node.update(undefined, node.modifiers, node.name, undefined, Nodes.visit(node.heritageClauses, visitor, isHeritageClause), transformClassMembers(node, isDerivedClass)),
    ];
    if (some(pendingExpressions)) {
      statements.push(createExpressionStatement(inlineExpressions(pendingExpressions)));
    }
    const staticProperties = getProperties(node, true);
    if (some(staticProperties)) {
      addPropertyStatements(statements, staticProperties, getInternalName(node));
    }
    return statements;
  }
  function visitClassExpression(node: ClassExpression): Expression {
    if (!forEach(node.members, doesClassElementNeedTransform)) return visitEachChild(node, visitor, context);
    const isDecoratedClassDeclaration = Node.is.kind(ClassDeclaration, Node.get.originalOf(node));
    const staticProperties = getProperties(node, true);
    const extendsClauseElement = getEffectiveBaseTypeNode(node);
    const isDerivedClass = !!(extendsClauseElement && skipOuterExpressions(extendsClauseElement.expression).kind !== Syntax.NullKeyword);
    const classExpression = node.update(node.modifiers, node.name, undefined, Nodes.visit(node.heritageClauses, visitor, isHeritageClause), transformClassMembers(node, isDerivedClass));
    if (some(staticProperties) || some(pendingExpressions)) {
      if (isDecoratedClassDeclaration) {
        Debug.assertIsDefined(pendingStatements, 'Decorated classes transformed by TypeScript are expected to be within a variable declaration.');
        if (pendingStatements && pendingExpressions && some(pendingExpressions)) {
          pendingStatements.push(createExpressionStatement(inlineExpressions(pendingExpressions)));
        }
        if (pendingStatements && some(staticProperties)) {
          addPropertyStatements(pendingStatements, staticProperties, getInternalName(node));
        }
        return classExpression;
      } else {
        const expressions: Expression[] = [];
        const isClassWithConstructorReference = resolver.getNodeCheckFlags(node) & NodeCheckFlags.ClassWithConstructorReference;
        const temp = createTempVariable(hoistVariableDeclaration, !!isClassWithConstructorReference);
        if (isClassWithConstructorReference) {
          enableSubstitutionForClassAliases();
          const alias = getSynthesizedClone(temp);
          alias.autoGenerateFlags &= ~GeneratedIdentifierFlags.ReservedInNestedScopes;
          classAliases[getOriginalNodeId(node)] = alias;
        }
        setEmitFlags(classExpression, EmitFlags.Indented | Node.get.emitFlags(classExpression));
        expressions.push(startOnNewLine(createAssignment(temp, classExpression)));
        addRange(expressions, map(pendingExpressions, startOnNewLine));
        addRange(expressions, generateInitializedPropertyExpressions(staticProperties, temp));
        expressions.push(startOnNewLine(temp));
        return inlineExpressions(expressions);
      }
    }
    return classExpression;
  }
  function transformClassMembers(n: ClassDeclaration | ClassExpression, isDerivedClass: boolean) {
    if (shouldTransformPrivateFields) {
      for (const m of n.members) {
        if (m.isPrivateIdentifierPropertyDeclaration()) addPrivateIdentifierToEnvironment(m.name);
      }
    }
    const ms: ClassElement[] = [];
    const constructor = transformConstructor(n, isDerivedClass);
    if (constructor) ms.push(constructor);
    addRange(ms, Nodes.visit(n.members, classElementVisitor, isClassElement));
    return setRange(new Nodes(ms), n.members);
  }
  function isPropertyDeclarationThatRequiresConstructorStatement(member: ClassElement): member is PropertyDeclaration {
    if (!Node.is.kind(PropertyDeclaration, member) || hasStaticModifier(member)) return false;
    if (context.getCompilerOptions().useDefineForClassFields) return languageVersion < ScriptTarget.ESNext;
    return isInitializedProperty(member) || (shouldTransformPrivateFields && member.isPrivateIdentifierPropertyDeclaration());
  }
  function transformConstructor(node: ClassDeclaration | ClassExpression, isDerivedClass: boolean) {
    const constructor = visitNode(getFirstConstructorWithBody(node), visitor, ConstructorDeclaration.kind);
    const properties = node.members.filter(isPropertyDeclarationThatRequiresConstructorStatement);
    if (!some(properties)) return constructor;
    const parameters = visitParameterList(constructor ? constructor.parameters : undefined, visitor, context);
    const body = transformConstructorBody(node, constructor, isDerivedClass);
    if (!body) {
      return;
    }
    return startOnNewLine(setOriginalNode(setRange(ConstructorDeclaration.create(undefined, undefined, parameters ?? [], body), constructor || node), constructor));
  }
  function transformConstructorBody(node: ClassDeclaration | ClassExpression, constructor: ConstructorDeclaration | undefined, isDerivedClass: boolean) {
    const useDefineForClassFields = context.getCompilerOptions().useDefineForClassFields;
    let properties = getProperties(node, false);
    if (!useDefineForClassFields) {
      properties = filter(properties, (property) => !!property.initializer || Node.is.kind(PrivateIdentifier, property.name));
    }
    if (!constructor && !some(properties)) return visitFunctionBody(undefined, visitor, context);
    resumeLexicalEnvironment();
    let indexOfFirstStatement = 0;
    let statements: Statement[] = [];
    if (!constructor && isDerivedClass) {
      statements.push(createExpressionStatement(new qs.CallExpression(createSuper(), undefined, [createSpread(new Identifier('arguments'))])));
    }
    if (constructor) {
      indexOfFirstStatement = addPrologueDirectivesAndInitialSuperCall(constructor, statements, visitor);
    }
    if (constructor?.body) {
      let afterParameterProperties = findIndex(constructor.body.statements, (s) => !Node.is.parameterPropertyDeclaration(Node.get.originalOf(s), constructor), indexOfFirstStatement);
      if (afterParameterProperties === -1) {
        afterParameterProperties = constructor.body.statements.length;
      }
      if (afterParameterProperties > indexOfFirstStatement) {
        if (!useDefineForClassFields) {
          addRange(statements, Nodes.visit(constructor.body.statements, visitor, isStatement, indexOfFirstStatement, afterParameterProperties - indexOfFirstStatement));
        }
        indexOfFirstStatement = afterParameterProperties;
      }
    }
    addPropertyStatements(statements, properties, createThis());
    if (constructor) {
      addRange(statements, Nodes.visit(constructor.body!.statements, visitor, isStatement, indexOfFirstStatement));
    }
    statements = mergeLexicalEnvironment(statements, endLexicalEnvironment());
    return setRange(new Block(setRange(new Nodes(statements), constructor ? constructor.body!.statements : node.members), true), constructor ? constructor.body : undefined);
  }
  function addPropertyStatements(statements: Statement[], properties: readonly PropertyDeclaration[], receiver: LeftHandSideExpression) {
    for (const property of properties) {
      const expression = transformProperty(property, receiver);
      if (!expression) {
        continue;
      }
      const statement = createExpressionStatement(expression);
      setSourceMapRange(statement, moveRangePastModifiers(property));
      setCommentRange(statement, property);
      setOriginalNode(statement, property);
      statements.push(statement);
    }
  }
  function generateInitializedPropertyExpressions(properties: readonly PropertyDeclaration[], receiver: LeftHandSideExpression) {
    const expressions: Expression[] = [];
    for (const property of properties) {
      const expression = transformProperty(property, receiver);
      if (!expression) {
        continue;
      }
      startOnNewLine(expression);
      setSourceMapRange(expression, moveRangePastModifiers(property));
      setCommentRange(expression, property);
      setOriginalNode(expression, property);
      expressions.push(expression);
    }
    return expressions;
  }
  function transformProperty(property: PropertyDeclaration, receiver: LeftHandSideExpression) {
    const emitAssignment = !context.getCompilerOptions().useDefineForClassFields;
    const propertyName =
      Node.is.kind(ComputedPropertyName, property.name) && !isSimpleInlineableExpression(property.name.expression) ? property.name.update(getGeneratedNameForNode(property.name)) : property.name;
    if (shouldTransformPrivateFields && Node.is.kind(PrivateIdentifier, propertyName)) {
      const privateIdentifierInfo = accessPrivateIdentifier(propertyName);
      if (privateIdentifierInfo) {
        switch (privateIdentifierInfo.placement) {
          case PrivateIdentifierPlacement.InstanceField: {
            return createPrivateInstanceFieldInitializer(receiver, visitNode(property.initializer, visitor, isExpression), privateIdentifierInfo.weakMapName);
          }
        }
      } else {
        fail('Undeclared private name for property declaration.');
      }
    }
    if (Node.is.kind(PrivateIdentifier, propertyName) && !property.initializer) {
      return;
    }
    if (Node.is.kind(PrivateIdentifier, propertyName) && !property.initializer) {
      return;
    }
    const propertyOriginalNode = Node.get.originalOf(property);
    const initializer =
      property.initializer || emitAssignment
        ? visitNode(property.initializer, visitor, isExpression)
        : Node.is.parameterPropertyDeclaration(propertyOriginalNode, propertyOriginalNode.parent) && Node.is.kind(Identifier, propertyName)
        ? propertyName
        : qs.VoidExpression.zero();
    if (emitAssignment || Node.is.kind(PrivateIdentifier, propertyName)) {
      const memberAccess = createMemberAccessForPropertyName(receiver, propertyName, propertyName);
      return createAssignment(memberAccess, initializer);
    } else {
      const name = Node.is.kind(ComputedPropertyName, propertyName)
        ? propertyName.expression
        : Node.is.kind(Identifier, propertyName)
        ? StringLiteral.create(syntax.get.unescUnderscores(propertyName.escapedText))
        : propertyName;
      const descriptor = createPropertyDescriptor({ value: initializer, configurable: true, writable: true, enumerable: true });
      return createObjectDefinePropertyCall(receiver, name, descriptor);
    }
  }
  function enableSubstitutionForClassAliases() {
    if ((enabledSubstitutions & ClassPropertySubstitutionFlags.ClassAliases) === 0) {
      enabledSubstitutions |= ClassPropertySubstitutionFlags.ClassAliases;
      context.enableSubstitution(Syntax.Identifier);
      classAliases = [];
    }
  }
  function onSubstituteNode(hint: EmitHint, node: Node) {
    node = previousOnSubstituteNode(hint, node);
    if (hint === EmitHint.Expression) return substituteExpression(node as Expression);
    return node;
  }
  function substituteExpression(node: Expression) {
    switch (node.kind) {
      case Syntax.Identifier:
        return substituteExpressionIdentifier(node as Identifier);
    }
    return node;
  }
  function substituteExpressionIdentifier(node: Identifier): Expression {
    return trySubstituteClassAlias(node) || node;
  }
  function trySubstituteClassAlias(node: Identifier): Expression | undefined {
    if (enabledSubstitutions & ClassPropertySubstitutionFlags.ClassAliases) {
      if (resolver.getNodeCheckFlags(node) & NodeCheckFlags.ConstructorReferenceInClass) {
        const declaration = resolver.getReferencedValueDeclaration(node);
        if (declaration) {
          const classAlias = classAliases[declaration.id!];
          if (classAlias) {
            const clone = getSynthesizedClone(classAlias);
            setSourceMapRange(clone, node);
            setCommentRange(clone, node);
            return clone;
          }
        }
      }
    }
    return;
  }
  function getPropertyNameExpressionIfNeeded(name: PropertyName, shouldHoist: boolean): Expression | undefined {
    if (Node.is.kind(ComputedPropertyName, name)) {
      const expression = visitNode(name.expression, visitor, isExpression);
      const innerExpression = skipPartiallyEmittedExpressions(expression);
      const inlinable = isSimpleInlineableExpression(innerExpression);
      const alreadyTransformed = isAssignmentExpression(innerExpression) && Node.is.generatedIdentifier(innerExpression.left);
      if (!alreadyTransformed && !inlinable && shouldHoist) {
        const generatedName = getGeneratedNameForNode(name);
        hoistVariableDeclaration(generatedName);
        return createAssignment(generatedName, expression);
      }
      return inlinable || Node.is.kind(Identifier, innerExpression) ? undefined : expression;
    }
  }
  function startPrivateIdentifierEnvironment() {
    privateIdentifierEnvironmentStack.push(currentPrivateIdentifierEnvironment);
    currentPrivateIdentifierEnvironment = undefined;
  }
  function endPrivateIdentifierEnvironment() {
    currentPrivateIdentifierEnvironment = privateIdentifierEnvironmentStack.pop();
  }
  function addPrivateIdentifierToEnvironment(name: PrivateIdentifier) {
    const text = getTextOfPropertyName(name) as string;
    const weakMapName = createOptimisticUniqueName('_' + text.substring(1));
    weakMapName.autoGenerateFlags |= GeneratedIdentifierFlags.ReservedInNestedScopes;
    hoistVariableDeclaration(weakMapName);
    (currentPrivateIdentifierEnvironment || (currentPrivateIdentifierEnvironment = createUnderscoreEscapedMap())).set(name.escapedText, {
      placement: PrivateIdentifierPlacement.InstanceField,
      weakMapName,
    });
    (pendingExpressions || (pendingExpressions = [])).push(createAssignment(weakMapName, createNew(new Identifier('WeakMap'), undefined, [])));
  }
  function accessPrivateIdentifier(name: PrivateIdentifier) {
    if (currentPrivateIdentifierEnvironment) {
      const info = currentPrivateIdentifierEnvironment.get(name.escapedText);
      if (info) return info;
    }
    for (let i = privateIdentifierEnvironmentStack.length - 1; i >= 0; --i) {
      const env = privateIdentifierEnvironmentStack[i];
      if (!env) {
        continue;
      }
      const info = env.get(name.escapedText);
      if (info) return info;
    }
    return;
  }
  function wrapPrivateIdentifierForDestructuringTarget(node: PrivateIdentifierPropertyAccessExpression) {
    const parameter = getGeneratedNameForNode(node);
    const info = accessPrivateIdentifier(node.name);
    if (!info) return visitEachChild(node, visitor, context);
    let receiver = node.expression;
    if (Node.is.thisProperty(node) || Node.is.superProperty(node) || !isSimpleCopiableExpression(node.expression)) {
      receiver = createTempVariable(hoistVariableDeclaration);
      (receiver as Identifier).autoGenerateFlags! |= GeneratedIdentifierFlags.ReservedInNestedScopes;
      (pendingExpressions || (pendingExpressions = [])).push(new BinaryExpression(receiver, Syntax.EqualsToken, node.expression));
    }
    return createPropertyAccess(
      new qc.ParenthesizedExpression(
        createObjectLiteral([
          SetAccessorDeclaration.create(
            undefined,
            undefined,
            'value',
            [createParameter(undefined, undefined, undefined, undefined)],
            new Block([createExpressionStatement(createPrivateIdentifierAssignment(info, receiver, parameter, Syntax.EqualsToken))])
          ),
        ])
      ),
      'value'
    );
  }
  function visitArrayAssignmentTarget(node: BindingOrAssignmentElement) {
    const target = getTargetOfBindingOrAssignmentElement(node);
    if (target && Node.is.privateIdentifierPropertyAccessExpression(target)) {
      const wrapped = wrapPrivateIdentifierForDestructuringTarget(target);
      if (isAssignmentExpression(node)) return node.update(wrapped, visitNode(node.right, visitor, isExpression), node.operatorToken);
      if (Node.is.kind(SpreadElement, node)) return node.update(wrapped);
      return wrapped;
    }
    return visitNode(node, visitorDestructuringTarget);
  }
  function visitObjectAssignmentTarget(node: ObjectLiteralElementLike) {
    if (Node.is.kind(PropertyAssignment, node)) {
      const target = getTargetOfBindingOrAssignmentElement(node);
      if (target && Node.is.privateIdentifierPropertyAccessExpression(target)) {
        const initializer = getInitializerOfBindingOrAssignmentElement(node);
        const wrapped = wrapPrivateIdentifierForDestructuringTarget(target);
        return node.update(visitNode(node.name, visitor), initializer ? createAssignment(wrapped, visitNode(initializer, visitor)) : wrapped);
      }
      return node.update(visitNode(node.name, visitor), visitNode(node.initializer, visitorDestructuringTarget));
    }
    return visitNode(node, visitor);
  }
  function visitAssignmentPattern(node: AssignmentPattern) {
    if (node.is(ArrayLiteralExpression)) return node.update(Nodes.visit(node.elements, visitArrayAssignmentTarget, isExpression));
    return node.update(Nodes.visit(node.properties, visitObjectAssignmentTarget, isObjectLiteralElementLike));
  }
}
function createPrivateInstanceFieldInitializer(receiver: LeftHandSideExpression, initializer: Expression | undefined, weakMapName: Identifier) {
  return new qs.CallExpression(createPropertyAccess(weakMapName, 'set'), undefined, [receiver, initializer || qs.VoidExpression.zero()]);
}
export const classPrivateFieldGetHelper: UnscopedEmitHelper = {
  name: 'typescript:classPrivateFieldGet',
  scoped: false,
  text: `
            var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
                if (!privateMap.has(receiver)) {
                    throw new TypeError("attempted to get private field on non-instance");
                }
                return privateMap.get(receiver);
            };`,
};
function createClassPrivateFieldGetHelper(context: TransformationContext, receiver: Expression, privateField: Identifier) {
  context.requestEmitHelper(classPrivateFieldGetHelper);
  return new qs.CallExpression(getUnscopedHelperName('__classPrivateFieldGet'), undefined, [receiver, privateField]);
}
export const classPrivateFieldSetHelper: UnscopedEmitHelper = {
  name: 'typescript:classPrivateFieldSet',
  scoped: false,
  text: `
            var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
                if (!privateMap.has(receiver)) {
                    throw new TypeError("attempted to set private field on non-instance");
                }
                privateMap.set(receiver, value);
                return value;
            };`,
};
function createClassPrivateFieldSetHelper(context: TransformationContext, receiver: Expression, privateField: Identifier, value: Expression) {
  context.requestEmitHelper(classPrivateFieldSetHelper);
  return new qs.CallExpression(getUnscopedHelperName('__classPrivateFieldSet'), undefined, [receiver, privateField, value]);
}