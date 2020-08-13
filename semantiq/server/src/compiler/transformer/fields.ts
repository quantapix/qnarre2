import { Node, Modifier, ModifierFlags } from '../types';
import { qf, Nodes } from '../core';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from '../types';
import * as qu from '../utils';
import * as qy from '../syntax';
const enum ClassPropertySubstitutionFlags {
  ClassAliases = 1 << 0,
}
const enum PrivateIdentifierPlacement {
  InstanceField,
}
type PrivateIdentifierInfo = PrivateIdentifierInstanceField;
interface PrivateIdentifierInstanceField {
  placement: PrivateIdentifierPlacement.InstanceField;
  weakMapName: qt.Identifier;
}
type PrivateIdentifierEnvironment = EscapedMap<PrivateIdentifierInfo>;
export function transformClassFields(context: qt.TrafoContext) {
  const { hoistVariableDeclaration, endLexicalEnvironment, resumeLexicalEnvironment } = context;
  const resolver = context.getEmitResolver();
  const compilerOpts = context.getCompilerOpts();
  const languageVersion = getEmitScriptTarget(compilerOpts);
  const shouldTransformPrivateFields = languageVersion < ScriptTarget.ESNext;
  const previousOnSubstituteNode = context.onSubstituteNode;
  context.onSubstituteNode = onSubstituteNode;
  let enabledSubstitutions: ClassPropertySubstitutionFlags;
  let classAliases: qt.Identifier[];
  let pendingExpressions: qt.Expression[] | undefined;
  let pendingStatements: qt.Statement[] | undefined;
  const privateIdentifierEnvironmentStack: (PrivateIdentifierEnvironment | undefined)[] = [];
  let currentPrivateIdentifierEnvironment: PrivateIdentifierEnvironment | undefined;
  return chainBundle(transformSourceFile);
  function transformSourceFile(node: qt.SourceFile) {
    const opts = context.getCompilerOpts();
    if (node.isDeclarationFile || (opts.useDefineForClassFields && opts.target === ScriptTarget.ESNext)) return node;
    const visited = visitEachChild(node, visitor, context);
    qf.emit.addHelpers(visited, context.readEmitHelpers());
    return visited;
  }
  function visitor(node: Node): VisitResult<Node> {
    if (!(node.trafoFlags & TrafoFlags.ContainsClassFields)) return node;
    switch (node.kind) {
      case Syntax.ClassExpression:
      case Syntax.ClassDeclaration:
        return visitClassLike(node as qt.ClassLikeDeclaration);
      case Syntax.PropertyDeclaration:
        return visitPropertyDeclaration(node as qt.PropertyDeclaration);
      case Syntax.VariableStatement:
        return visitVariableStatement(node as qt.VariableStatement);
      case Syntax.ComputedPropertyName:
        return visitComputedPropertyName(node as qt.ComputedPropertyName);
      case Syntax.PropertyAccessExpression:
        return visitPropertyAccessExpression(node as qt.PropertyAccessExpression);
      case Syntax.PrefixUnaryExpression:
        return visitPrefixUnaryExpression(node as qt.PrefixUnaryExpression);
      case Syntax.PostfixUnaryExpression:
        return visitPostfixUnaryExpression(node as qt.PostfixUnaryExpression, false);
      case Syntax.CallExpression:
        return visitCallExpression(node as qt.CallExpression);
      case Syntax.BinaryExpression:
        return visitBinaryExpression(node as qt.BinaryExpression);
      case Syntax.PrivateIdentifier:
        return visitPrivateIdentifier(node as qt.PrivateIdentifier);
      case Syntax.ExpressionStatement:
        return visitExpressionStatement(node as qt.ExpressionStatement);
      case Syntax.ForStatement:
        return visitForStatement(node as qt.ForStatement);
      case Syntax.TaggedTemplateExpression:
        return visitTaggedTemplateExpression(node as qt.TaggedTemplateExpression);
    }
    return visitEachChild(node, visitor, context);
  }
  function visitorDestructuringTarget(node: Node): VisitResult<Node> {
    switch (node.kind) {
      case Syntax.ObjectLiteralExpression:
      case Syntax.ArrayLiteralExpression:
        return visitAssignmentPattern(node as qt.AssignmentPattern);
      default:
        return visitor(node);
    }
  }
  function visitPrivateIdentifier(node: qt.PrivateIdentifier) {
    if (!shouldTransformPrivateFields) return node;
    return new qc.Identifier('').setOriginal(node);
  }
  function classElemVisitor(node: Node): VisitResult<Node> {
    switch (node.kind) {
      case Syntax.Constructor:
        return;
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
      case Syntax.MethodDeclaration:
        return visitEachChild(node, classElemVisitor, context);
      case Syntax.PropertyDeclaration:
        return visitPropertyDeclaration(node as qt.PropertyDeclaration);
      case Syntax.ComputedPropertyName:
        return visitComputedPropertyName(node as qt.ComputedPropertyName);
      case Syntax.SemicolonClassElem:
        return node;
      default:
        return visitor(node);
    }
  }
  function visitVariableStatement(node: qt.VariableStatement) {
    const savedPendingStatements = pendingStatements;
    pendingStatements = [];
    const visitedNode = visitEachChild(node, visitor, context);
    const statement = some(pendingStatements) ? [visitedNode, ...pendingStatements] : visitedNode;
    pendingStatements = savedPendingStatements;
    return statement;
  }
  function visitComputedPropertyName(name: qt.ComputedPropertyName) {
    let node = visitEachChild(name, visitor, context);
    if (some(pendingExpressions)) {
      const expressions = pendingExpressions;
      expressions.push(name.expression);
      pendingExpressions = [];
      node = node.update(inlineExpressions(expressions));
    }
    return node;
  }
  function visitPropertyDeclaration(node: qt.PropertyDeclaration) {
    assert(!some(node.decorators));
    if (!shouldTransformPrivateFields && node.name.kind === Syntax.PrivateIdentifier)
      return node.update(undefined, Nodes.visit(node.modifiers, visitor, isModifier), node.name, undefined, undefined, undefined);
    const expr = getPropertyNameExpressionIfNeeded(node.name, !!node.initer || !!context.getCompilerOpts().useDefineForClassFields);
    if (expr && !isSimpleInlineableExpression(expr)) {
      (pendingExpressions || (pendingExpressions = [])).push(expr);
    }
    return;
  }
  function createPrivateIdentifierAccess(info: PrivateIdentifierInfo, receiver: qt.Expression): qt.Expression {
    receiver = visitNode(receiver, visitor, isExpression);
    switch (info.placement) {
      case PrivateIdentifierPlacement.InstanceField:
        return createClassPrivateFieldGetHelper(context, isSynthesized(receiver) ? receiver : getSynthesizedClone(receiver), info.weakMapName);
      default:
        return fail('Unexpected private identifier placement');
    }
  }
  function visitPropertyAccessExpression(node: qt.PropertyAccessExpression) {
    if (shouldTransformPrivateFields && node.name.kind === Syntax.PrivateIdentifier) {
      const privateIdentifierInfo = accessPrivateIdentifier(node.name);
      if (privateIdentifierInfo) return createPrivateIdentifierAccess(privateIdentifierInfo, node.expression).setOriginal(node);
    }
    return visitEachChild(node, visitor, context);
  }
  function visitPrefixUnaryExpression(node: qt.PrefixUnaryExpression) {
    if (shouldTransformPrivateFields && qf.is.privateIdentifierPropertyAccessExpression(node.operand)) {
      const operator = node.operator === Syntax.Plus2Token ? Syntax.PlusToken : node.operator === Syntax.Minus2Token ? Syntax.MinusToken : undefined;
      let info: PrivateIdentifierInfo | undefined;
      if (operator && (info = accessPrivateIdentifier(node.operand.name))) {
        const receiver = visitNode(node.operand.expression, visitor, isExpression);
        const { readExpression, initializeExpression } = createCopiableReceiverExpr(receiver);
        const existingValue = new qc.PrefixUnaryExpression(Syntax.PlusToken, createPrivateIdentifierAccess(info, readExpression));
        return setOriginalNode(
          createPrivateIdentifierAssignment(info, initializeExpression || readExpression, new qc.BinaryExpression(existingValue, operator, qc.asLiteral(1)), Syntax.EqualsToken),
          node
        );
      }
    }
    return visitEachChild(node, visitor, context);
  }
  function visitPostfixUnaryExpression(node: qt.PostfixUnaryExpression, valueIsDiscarded: boolean) {
    if (shouldTransformPrivateFields && qf.is.privateIdentifierPropertyAccessExpression(node.operand)) {
      const operator = node.operator === Syntax.Plus2Token ? Syntax.PlusToken : node.operator === Syntax.Minus2Token ? Syntax.MinusToken : undefined;
      let info: PrivateIdentifierInfo | undefined;
      if (operator && (info = accessPrivateIdentifier(node.operand.name))) {
        const receiver = visitNode(node.operand.expression, visitor, isExpression);
        const { readExpression, initializeExpression } = createCopiableReceiverExpr(receiver);
        const existingValue = new qc.PrefixUnaryExpression(Syntax.PlusToken, createPrivateIdentifierAccess(info, readExpression));
        const returnValue = valueIsDiscarded ? undefined : createTempVariable(hoistVariableDeclaration);
        return setOriginalNode(
          inlineExpressions(
            compact<qt.Expression>([
              createPrivateIdentifierAssignment(
                info,
                initializeExpression || readExpression,
                new qc.BinaryExpression(returnValue ? qf.create.assignment(returnValue, existingValue) : existingValue, operator, qc.asLiteral(1)),
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
  function visitForStatement(node: qt.ForStatement) {
    if (node.incrementor && node.incrementor.kind === Syntax.PostfixUnaryExpression) {
      return updateFor(
        node,
        visitNode(node.initer, visitor, isForIniter),
        visitNode(node.condition, visitor, isExpression),
        visitPostfixUnaryExpression(node.incrementor, true),
        visitNode(node.statement, visitor, qf.is.statement)
      );
    }
    return visitEachChild(node, visitor, context);
  }
  function visitExpressionStatement(node: qt.ExpressionStatement) {
    if (node.expression.kind === Syntax.PostfixUnaryExpression) return node.update(visitPostfixUnaryExpression(node.expression, true));
    return visitEachChild(node, visitor, context);
  }
  function createCopiableReceiverExpr(receiver: qt.Expression): { readExpression: qt.Expression; initializeExpression: qt.Expression | undefined } {
    const clone = isSynthesized(receiver) ? receiver : getSynthesizedClone(receiver);
    if (isSimpleInlineableExpression(receiver)) return { readExpression: clone, initializeExpression: undefined };
    const readExpression = createTempVariable(hoistVariableDeclaration);
    const initializeExpression = qf.create.assignment(readExpression, clone);
    return { readExpression, initializeExpression };
  }
  function visitCallExpression(node: qt.CallExpression) {
    if (shouldTransformPrivateFields && qf.is.privateIdentifierPropertyAccessExpression(node.expression)) {
      const { thisArg, target } = qf.create.callBinding(node.expression, hoistVariableDeclaration, languageVersion);
      return node.update(new qc.PropertyAccessExpression(visitNode(target, visitor), 'call'), undefined, [visitNode(thisArg, visitor, isExpression), ...Nodes.visit(node.args, visitor, isExpression)]);
    }
    return visitEachChild(node, visitor, context);
  }
  function visitTaggedTemplateExpression(node: qt.TaggedTemplateExpression) {
    if (shouldTransformPrivateFields && qf.is.privateIdentifierPropertyAccessExpression(node.tag)) {
      const { thisArg, target } = qf.create.callBinding(node.tag, hoistVariableDeclaration, languageVersion);
      return node.update(
        new qc.CallExpression(new qc.PropertyAccessExpression(visitNode(target, visitor), 'bind'), undefined, [visitNode(thisArg, visitor, isExpression)]),
        visitNode(node.template, visitor, isTemplateLiteral)
      );
    }
    return visitEachChild(node, visitor, context);
  }
  function visitBinaryExpression(node: qt.BinaryExpression) {
    if (shouldTransformPrivateFields) {
      if (qf.is.destructuringAssignment(node)) {
        const savedPendingExpressions = pendingExpressions;
        pendingExpressions = undefined!;
        node = node.update(visitNode(node.left, visitorDestructuringTarget), visitNode(node.right, visitor), node.operatorToken);
        const expr = some(pendingExpressions) ? inlineExpressions(compact([...pendingExpressions!, node])) : node;
        pendingExpressions = savedPendingExpressions;
        return expr;
      }
      if (qf.is.assignmentExpression(node) && qf.is.privateIdentifierPropertyAccessExpression(node.left)) {
        const info = accessPrivateIdentifier(node.left.name);
        if (info) return createPrivateIdentifierAssignment(info, node.left.expression, node.right, node.operatorToken.kind).setOriginal(node);
      }
    }
    return visitEachChild(node, visitor, context);
  }
  function createPrivateIdentifierAssignment(info: PrivateIdentifierInfo, receiver: qt.Expression, right: qt.Expression, operator: qt.AssignmentOperator) {
    switch (info.placement) {
      case PrivateIdentifierPlacement.InstanceField: {
        return createPrivateIdentifierInstanceFieldAssignment(info, receiver, right, operator);
      }
      default:
        return fail('Unexpected private identifier placement');
    }
  }
  function createPrivateIdentifierInstanceFieldAssignment(info: PrivateIdentifierInstanceField, receiver: qt.Expression, right: qt.Expression, operator: qt.AssignmentOperator) {
    receiver = visitNode(receiver, visitor, isExpression);
    right = visitNode(right, visitor, isExpression);
    if (isCompoundAssignment(operator)) {
      const { readExpression, initializeExpression } = createCopiableReceiverExpr(receiver);
      return createClassPrivateFieldSetHelper(
        context,
        initializeExpression || readExpression,
        info.weakMapName,
        new qc.BinaryExpression(createClassPrivateFieldGetHelper(context, readExpression, info.weakMapName), getNonAssignmentOperatorForCompoundAssignment(operator), right)
      );
    }
    return createClassPrivateFieldSetHelper(context, receiver, info.weakMapName, right);
  }
  function visitClassLike(node: qt.ClassLikeDeclaration) {
    const savedPendingExpressions = pendingExpressions;
    pendingExpressions = undefined;
    if (shouldTransformPrivateFields) {
      startPrivateIdentifierEnvironment();
    }
    const result = node.kind === Syntax.ClassDeclaration ? visitClassDeclaration(node) : visitClassExpression(node);
    if (shouldTransformPrivateFields) {
      endPrivateIdentifierEnvironment();
    }
    pendingExpressions = savedPendingExpressions;
    return result;
  }
  function doesClassElemNeedTransform(node: qt.ClassElem) {
    return node.kind === Syntax.PropertyDeclaration || (shouldTransformPrivateFields && node.name && node.name.kind === Syntax.PrivateIdentifier);
  }
  function visitClassDeclaration(node: qt.ClassDeclaration) {
    if (!forEach(node.members, doesClassElemNeedTransform)) return visitEachChild(node, visitor, context);
    const extendsClauseElem = qf.get.effectiveBaseTypeNode(node);
    const isDerivedClass = !!(extendsClauseElem && qf.skip.outerExpressions(extendsClauseElem.expression).kind !== Syntax.NullKeyword);
    const statements: qt.Statement[] = [
      node.update(undefined, node.modifiers, node.name, undefined, Nodes.visit(node.heritageClauses, visitor, isHeritageClause), transformClassMembers(node, isDerivedClass)),
    ];
    if (some(pendingExpressions)) {
      statements.push(new qc.ExpressionStatement(inlineExpressions(pendingExpressions)));
    }
    const staticProperties = getProperties(node, true);
    if (some(staticProperties)) {
      addPropertyStatements(statements, staticProperties, qf.decl.internalName(node));
    }
    return statements;
  }
  function visitClassExpression(node: qt.ClassExpression): qt.Expression {
    if (!forEach(node.members, doesClassElemNeedTransform)) return visitEachChild(node, visitor, context);
    const isDecoratedClassDeclaration = qf.get.originalOf(node).kind === Syntax.ClassDeclaration;
    const staticProperties = getProperties(node, true);
    const extendsClauseElem = qf.get.effectiveBaseTypeNode(node);
    const isDerivedClass = !!(extendsClauseElem && qf.skip.outerExpressions(extendsClauseElem.expression).kind !== Syntax.NullKeyword);
    const classExpression = node.update(node.modifiers, node.name, undefined, Nodes.visit(node.heritageClauses, visitor, isHeritageClause), transformClassMembers(node, isDerivedClass));
    if (some(staticProperties) || some(pendingExpressions)) {
      if (isDecoratedClassDeclaration) {
        Debug.assertIsDefined(pendingStatements, 'Decorated classes transformed by TypeScript are expected to be within a variable declaration.');
        if (pendingStatements && pendingExpressions && some(pendingExpressions)) {
          pendingStatements.push(new qc.ExpressionStatement(inlineExpressions(pendingExpressions)));
        }
        if (pendingStatements && some(staticProperties)) {
          addPropertyStatements(pendingStatements, staticProperties, qf.decl.internalName(node));
        }
        return classExpression;
      } else {
        const expressions: qt.Expression[] = [];
        const isClassWithConstructorReference = resolver.getNodeCheckFlags(node) & NodeCheckFlags.ClassWithConstructorReference;
        const temp = createTempVariable(hoistVariableDeclaration, !!isClassWithConstructorReference);
        if (isClassWithConstructorReference) {
          enableSubstitutionForClassAliases();
          const alias = getSynthesizedClone(temp);
          alias.autoGenerateFlags &= ~GeneratedIdentifierFlags.ReservedInNestedScopes;
          classAliases[getOriginalNodeId(node)] = alias;
        }
        qf.emit.setFlags(classExpression, EmitFlags.Indented | qf.get.emitFlags(classExpression));
        expressions.push(qf.emit.setStartsOnNewLine(qf.create.assignment(temp, classExpression)));
        qu.addRange(expressions, map(pendingExpressions, qf.emit.setStartsOnNewLine));
        qu.addRange(expressions, generateInitializedPropertyExpressions(staticProperties, temp));
        expressions.push(qf.emit.setStartsOnNewLine(temp));
        return inlineExpressions(expressions);
      }
    }
    return classExpression;
  }
  function transformClassMembers(n: qt.ClassDeclaration | qt.ClassExpression, isDerivedClass: boolean) {
    if (shouldTransformPrivateFields) {
      for (const m of n.members) {
        if (qf.is.privateIdentifierPropertyDeclaration(m)) addPrivateIdentifierToEnvironment(m.name);
      }
    }
    const ms: qt.ClassElem[] = [];
    const constructor = transformConstructor(n, isDerivedClass);
    if (constructor) ms.push(constructor);
    qu.addRange(ms, Nodes.visit(n.members, classElemVisitor, isClassElem));
    return new Nodes(ms).setRange(n.members);
  }
  function isPropertyDeclarationThatRequiresConstructorStatement(member: qt.ClassElem): member is qt.PropertyDeclaration {
    if (!member.kind === Syntax.PropertyDeclaration || qf.has.staticModifier(member)) return false;
    if (context.getCompilerOpts().useDefineForClassFields) return languageVersion < ScriptTarget.ESNext;
    return isInitializedProperty(member) || (shouldTransformPrivateFields && qf.is.privateIdentifierPropertyDeclaration(member));
  }
  function transformConstructor(node: qt.ClassDeclaration | qt.ClassExpression, isDerivedClass: boolean) {
    const constructor = visitNode(qf.get.firstConstructorWithBody(node), visitor, qt.ConstructorDeclaration.kind);
    const properties = node.members.filter(isPropertyDeclarationThatRequiresConstructorStatement);
    if (!some(properties)) return constructor;
    const params = visitParamList(constructor ? constructor.params : undefined, visitor, context);
    const body = transformConstructorBody(node, constructor, isDerivedClass);
    if (!body) {
      return;
    }
    return qf.emit.setStartsOnNewLine(new qc.ConstructorDeclaration(undefined, undefined, params ?? [], body).setRange(constructor || node).setOriginal(constructor));
  }
  function transformConstructorBody(node: qt.ClassDeclaration | qt.ClassExpression, constructor: qt.ConstructorDeclaration | undefined, isDerivedClass: boolean) {
    const useDefineForClassFields = context.getCompilerOpts().useDefineForClassFields;
    let properties = getProperties(node, false);
    if (!useDefineForClassFields) {
      properties = filter(properties, (property) => !!property.initer || property.name.kind === Syntax.PrivateIdentifier);
    }
    if (!constructor && !some(properties)) return visitFunctionBody(undefined, visitor, context);
    resumeLexicalEnvironment();
    let indexOfFirstStatement = 0;
    let statements: qt.Statement[] = [];
    if (!constructor && isDerivedClass) {
      statements.push(new qc.ExpressionStatement(new qc.CallExpression(new qc.SuperExpression(), undefined, [new qc.SpreadElem(new qc.Identifier('args'))])));
    }
    if (constructor) {
      indexOfFirstStatement = addPrologueDirectivesAndInitialSuperCall(constructor, statements, visitor);
    }
    if (constructor?.body) {
      let afterParamProperties = findIndex(constructor.body.statements, (s) => !qf.is.paramPropertyDeclaration(qf.get.originalOf(s), constructor), indexOfFirstStatement);
      if (afterParamProperties === -1) {
        afterParamProperties = constructor.body.statements.length;
      }
      if (afterParamProperties > indexOfFirstStatement) {
        if (!useDefineForClassFields) {
          qu.addRange(statements, Nodes.visit(constructor.body.statements, visitor, qf.is.statement, indexOfFirstStatement, afterParamProperties - indexOfFirstStatement));
        }
        indexOfFirstStatement = afterParamProperties;
      }
    }
    addPropertyStatements(statements, properties, new qc.ThisExpression());
    if (constructor) {
      qu.addRange(statements, Nodes.visit(constructor.body!.statements, visitor, qf.is.statement, indexOfFirstStatement));
    }
    statements = mergeLexicalEnvironment(statements, endLexicalEnvironment());
    return new qc.Block(new Nodes(statements).setRange(constructor ? constructor.body!.statements : node.members), true).setRange(constructor ? constructor.body : undefined);
  }
  function addPropertyStatements(statements: qt.Statement[], properties: readonly qt.PropertyDeclaration[], receiver: qt.LeftExpression) {
    for (const property of properties) {
      const expression = transformProperty(property, receiver);
      if (!expression) continue;
      const statement = new qc.ExpressionStatement(expression);
      qf.emit.setSourceMapRange(statement, property.movePastModifiers());
      qf.emit.setCommentRange(statement, property);
      statement.setOriginal(property);
      statements.push(statement);
    }
  }
  function generateInitializedPropertyExpressions(properties: readonly qt.PropertyDeclaration[], receiver: qt.LeftExpression) {
    const expressions: qt.Expression[] = [];
    for (const property of properties) {
      const expression = transformProperty(property, receiver);
      if (!expression) continue;
      qf.emit.setStartsOnNewLine(expression);
      qf.emit.setSourceMapRange(expression, property.movePastModifiers());
      qf.emit.setCommentRange(expression, property);
      expression.setOriginal(property);
      expressions.push(expression);
    }
    return expressions;
  }
  function transformProperty(property: qt.PropertyDeclaration, receiver: qt.LeftExpression) {
    const emitAssignment = !context.getCompilerOpts().useDefineForClassFields;
    const propertyName =
      property.name.kind === Syntax.ComputedPropertyName && !isSimpleInlineableExpression(property.name.expression) ? property.name.update(qf.get.generatedNameForNode(property.name)) : property.name;
    if (shouldTransformPrivateFields && propertyName.kind === Syntax.PrivateIdentifier) {
      const privateIdentifierInfo = accessPrivateIdentifier(propertyName);
      if (privateIdentifierInfo) {
        switch (privateIdentifierInfo.placement) {
          case PrivateIdentifierPlacement.InstanceField: {
            return createPrivateInstanceFieldIniter(receiver, visitNode(property.initer, visitor, isExpression), privateIdentifierInfo.weakMapName);
          }
        }
      } else {
        fail('Undeclared private name for property declaration.');
      }
    }
    if (propertyName.kind === Syntax.PrivateIdentifier && !property.initer) {
      return;
    }
    if (propertyName.kind === Syntax.PrivateIdentifier && !property.initer) {
      return;
    }
    const propertyOriginalNode = qf.get.originalOf(property);
    const initer =
      property.initer || emitAssignment
        ? visitNode(property.initer, visitor, isExpression)
        : qf.is.paramPropertyDeclaration(propertyOriginalNode, propertyOriginalNode.parent) && propertyName.kind === Syntax.Identifier
        ? propertyName
        : qc.VoidExpression.zero();
    if (emitAssignment || propertyName.kind === Syntax.PrivateIdentifier) {
      const memberAccess = createMemberAccessForPropertyName(receiver, propertyName, propertyName);
      return qf.create.assignment(memberAccess, initer);
    } else {
      const name =
        propertyName.kind === Syntax.ComputedPropertyName
          ? propertyName.expression
          : propertyName.kind === Syntax.Identifier
          ? new qc.StringLiteral(syntax.get.unescUnderscores(propertyName.escapedText))
          : propertyName;
      const descriptor = qf.create.propertyDescriptor({ value: initer, configurable: true, writable: true, enumerable: true });
      return qf.create.objectDefinePropertyCall(receiver, name, descriptor);
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
    if (hint === EmitHint.Expression) return substituteExpression(node as qt.Expression);
    return node;
  }
  function substituteExpression(node: qt.Expression) {
    switch (node.kind) {
      case Syntax.Identifier:
        return substituteExpressionIdentifier(node as qt.Identifier);
    }
    return node;
  }
  function substituteExpressionIdentifier(node: qt.Identifier): qt.Expression {
    return trySubstituteClassAlias(node) || node;
  }
  function trySubstituteClassAlias(node: qt.Identifier): qt.Expression | undefined {
    if (enabledSubstitutions & ClassPropertySubstitutionFlags.ClassAliases) {
      if (resolver.getNodeCheckFlags(node) & NodeCheckFlags.ConstructorReferenceInClass) {
        const declaration = resolver.getReferencedValueDeclaration(node);
        if (declaration) {
          const classAlias = classAliases[declaration.id!];
          if (classAlias) {
            const clone = getSynthesizedClone(classAlias);
            qf.emit.setSourceMapRange(clone, node);
            qf.emit.setCommentRange(clone, node);
            return clone;
          }
        }
      }
    }
    return;
  }
  function getPropertyNameExpressionIfNeeded(name: qt.PropertyName, shouldHoist: boolean): qt.Expression | undefined {
    if (name.kind === Syntax.ComputedPropertyName) {
      const expression = visitNode(name.expression, visitor, isExpression);
      const innerExpression = qf.skip.partiallyEmittedExpressions(expression);
      const inlinable = isSimpleInlineableExpression(innerExpression);
      const alreadyTransformed = qf.is.assignmentExpression(innerExpression) && qf.is.generatedIdentifier(innerExpression.left);
      if (!alreadyTransformed && !inlinable && shouldHoist) {
        const generatedName = qf.get.generatedNameForNode(name);
        hoistVariableDeclaration(generatedName);
        return qf.create.assignment(generatedName, expression);
      }
      return inlinable || innerExpression.kind === Syntax.Identifier ? undefined : expression;
    }
  }
  function startPrivateIdentifierEnvironment() {
    privateIdentifierEnvironmentStack.push(currentPrivateIdentifierEnvironment);
    currentPrivateIdentifierEnvironment = undefined;
  }
  function endPrivateIdentifierEnvironment() {
    currentPrivateIdentifierEnvironment = privateIdentifierEnvironmentStack.pop();
  }
  function addPrivateIdentifierToEnvironment(name: qt.PrivateIdentifier) {
    const text = qf.get.textOfPropertyName(name) as string;
    const weakMapName = createOptimisticUniqueName('_' + text.substring(1));
    weakMapName.autoGenerateFlags |= GeneratedIdentifierFlags.ReservedInNestedScopes;
    hoistVariableDeclaration(weakMapName);
    (currentPrivateIdentifierEnvironment || (currentPrivateIdentifierEnvironment = qc.createEscapedMap())).set(name.escapedText, {
      placement: PrivateIdentifierPlacement.InstanceField,
      weakMapName,
    });
    (pendingExpressions || (pendingExpressions = [])).push(qf.create.assignment(weakMapName, new qc.NewExpression(new qc.Identifier('WeakMap'), undefined, [])));
  }
  function accessPrivateIdentifier(name: qt.PrivateIdentifier) {
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
  function wrapPrivateIdentifierForDestructuringTarget(node: qt.PrivateIdentifierPropertyAccessExpression) {
    const param = qf.get.generatedNameForNode(node);
    const info = accessPrivateIdentifier(node.name);
    if (!info) return visitEachChild(node, visitor, context);
    let receiver = node.expression;
    if (qf.is.thisProperty(node) || qf.is.superProperty(node) || !isSimpleCopiableExpression(node.expression)) {
      receiver = createTempVariable(hoistVariableDeclaration);
      (receiver as qt.Identifier).autoGenerateFlags! |= GeneratedIdentifierFlags.ReservedInNestedScopes;
      (pendingExpressions || (pendingExpressions = [])).push(new qc.BinaryExpression(receiver, Syntax.EqualsToken, node.expression));
    }
    return new qc.PropertyAccessExpression(
      new qc.ParenthesizedExpression(
        new qc.ObjectLiteralExpression([
          new qc.SetAccessorDeclaration(
            undefined,
            undefined,
            'value',
            [new qc.ParamDeclaration(undefined, undefined, undefined, undefined)],
            new qc.Block([new qc.ExpressionStatement(createPrivateIdentifierAssignment(info, receiver, param, Syntax.EqualsToken))])
          ),
        ])
      ),
      'value'
    );
  }
  function visitArrayAssignmentTarget(node: qt.BindingOrAssignmentElem) {
    const target = getTargetOfBindingOrAssignmentElem(node);
    if (target && qf.is.privateIdentifierPropertyAccessExpression(target)) {
      const wrapped = wrapPrivateIdentifierForDestructuringTarget(target);
      if (qf.is.assignmentExpression(node)) return node.update(wrapped, visitNode(node.right, visitor, isExpression), node.operatorToken);
      if (node.kind === Syntax.SpreadElem) return node.update(wrapped);
      return wrapped;
    }
    return visitNode(node, visitorDestructuringTarget);
  }
  function visitObjectAssignmentTarget(node: qt.ObjectLiteralElemLike) {
    if (node.kind === Syntax.PropertyAssignment) {
      const target = getTargetOfBindingOrAssignmentElem(node);
      if (target && qf.is.privateIdentifierPropertyAccessExpression(target)) {
        const initer = getIniterOfBindingOrAssignmentElem(node);
        const wrapped = wrapPrivateIdentifierForDestructuringTarget(target);
        return node.update(visitNode(node.name, visitor), initer ? qf.create.assignment(wrapped, visitNode(initer, visitor)) : wrapped);
      }
      return node.update(visitNode(node.name, visitor), visitNode(node.initer, visitorDestructuringTarget));
    }
    return visitNode(node, visitor);
  }
  function visitAssignmentPattern(node: qt.AssignmentPattern) {
    if (node.is(ArrayLiteralExpression)) return node.update(Nodes.visit(node.elems, visitArrayAssignmentTarget, isExpression));
    return node.update(Nodes.visit(node.properties, visitObjectAssignmentTarget, isObjectLiteralElemLike));
  }
}
function createPrivateInstanceFieldIniter(receiver: qt.LeftExpression, initer: qt.Expression | undefined, weakMapName: qt.Identifier) {
  return new qc.CallExpression(new qc.PropertyAccessExpression(weakMapName, 'set'), undefined, [receiver, initer || qc.VoidExpression.zero()]);
}
export const classPrivateFieldGetHelper: qt.UnscopedEmitHelper = {
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
function createClassPrivateFieldGetHelper(context: qt.TrafoContext, receiver: qt.Expression, privateField: qt.Identifier) {
  context.requestEmitHelper(classPrivateFieldGetHelper);
  return new qc.CallExpression(getUnscopedHelperName('__classPrivateFieldGet'), undefined, [receiver, privateField]);
}
export const classPrivateFieldSetHelper: qt.UnscopedEmitHelper = {
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
function createClassPrivateFieldSetHelper(context: qt.TrafoContext, receiver: qt.Expression, privateField: qt.Identifier, value: qt.Expression) {
  context.requestEmitHelper(classPrivateFieldSetHelper);
  return new qc.CallExpression(getUnscopedHelperName('__classPrivateFieldSet'), undefined, [receiver, privateField, value]);
}
