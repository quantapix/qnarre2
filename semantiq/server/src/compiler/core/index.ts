import { NodeType } from './tree';
import * as qc from './tree';
import * as qd from '../diagnostic';
import { qf } from './frame';
import { EmitFlags, Modifier, ModifierFlags, Node, NodeFlags, Nodes, TokenFlags } from '../type';
import * as qt from '../type';
import * as qu from '../util';
import { Syntax } from '../syntax';
import * as qy from '../syntax';
export * from './tree';
export abstract class Declaration extends qc.Declaration {
  getName(comments?: boolean, sourceMaps?: boolean, f: EmitFlags = 0) {
    const nodeName = qf.get.nameOfDeclaration(this);
    if (nodeName && qf.is.kind(qc.Identifier, nodeName) && !qf.is.generatedIdentifier(nodeName)) {
      const name = getMutableClone(nodeName);
      f |= this.emitFlags(nodeName);
      if (!sourceMaps) f |= EmitFlags.NoSourceMap;
      if (!comments) f |= EmitFlags.NoComments;
      if (f) setEmitFlags(name, f);
      return name;
    }
    return qf.get.generatedNameForNode(this);
  }
}
export abstract class Expression extends qc.Expression {
  createExpressionFromEntityName(n: qc.EntityName | Expression): qt.Expression {
    if (qf.is.kind(QualifiedName, n)) {
      const left = createExpressionFromEntityName(n.left);
      const right = getMutableClone(n.right);
      return setRange(new qc.PropertyAccessExpression(left, right), n);
    }
    return getMutableClone(n);
  }
  createExpressionForPropertyName(memberName: Exclude<qt.PropertyName, qt.PrivateIdentifier>): qt.Expression {
    if (qf.is.kind(qc.Identifier, memberName)) return qc.asLiteral(memberName);
    else if (qf.is.kind(qc.ComputedPropertyName, memberName)) return getMutableClone(memberName.expression);
    return getMutableClone(memberName);
  }
  createExpressionForObjectLiteralElementLike(n: qt.ObjectLiteralExpression, property: qt.ObjectLiteralElementLike, receiver: Expression): qt.Expression | undefined {
    if (property.name && qf.is.kind(qc.PrivateIdentifier, property.name)) qc.failBadSyntax(property.name, 'Private identifiers are not allowed in object literals.');
    function createExpressionForAccessorDeclaration(
      properties: Nodes<Declaration>,
      property: qt.AccessorDeclaration & { name: Exclude<PropertyName, qt.PrivateIdentifier> },
      receiver: Expression,
      multiLine: boolean
    ) {
      const { firstAccessor, getAccessor, setAccessor } = qf.get.allAccessorDeclarations(properties, property);
      if (property === firstAccessor) {
        const properties: ObjectLiteralElementLike[] = [];
        if (getAccessor) {
          const getterFunction = new qc.FunctionExpression(getAccessor.modifiers, undefined, undefined, undefined, getAccessor.parameters, undefined, getAccessor.body!);
          setRange(getterFunction, getAccessor);
          getterFunction.setOriginal(getAccessor);
          const getter = new qc.PropertyAssignment('get', getterFunction);
          properties.push(getter);
        }
        if (setAccessor) {
          const setterFunction = new qc.FunctionExpression(setAccessor.modifiers, undefined, undefined, undefined, setAccessor.parameters, undefined, setAccessor.body!);
          setRange(setterFunction, setAccessor);
          setterFunction.setOriginal(setAccessor);
          const setter = new qc.PropertyAssignment('set', setterFunction);
          properties.push(setter);
        }
        properties.push(new qc.PropertyAssignment('enumerable', getAccessor || setAccessor ? new qc.BooleanLiteral(false) : new qc.BooleanLiteral(true)));
        properties.push(new qc.PropertyAssignment('configurable', new qc.BooleanLiteral(true)));
        const expression = setRange(
          new qc.CallExpression(new qc.PropertyAccessExpression(new qc.Identifier('Object'), 'defineProperty'), undefined, [
            receiver,
            createExpressionForPropertyName(property.name),
            new qc.ObjectLiteralExpression(properties, multiLine),
          ]),
          firstAccessor
        );
        return aggregateTransformFlags(expression);
      }
      return;
    }
    function createExpressionForPropertyAssignment(property: qt.PropertyAssignment, receiver: Expression) {
      return aggregateTransformFlags(setRange(createAssignment(createMemberAccessForPropertyName(receiver, property.name, property.name), property.initer), property).setOriginal(property));
    }
    function createExpressionForShorthandPropertyAssignment(property: qt.ShorthandPropertyAssignment, receiver: Expression) {
      return aggregateTransformFlags(
        setRange(createAssignment(createMemberAccessForPropertyName(receiver, property.name, property.name), getSynthesizedClone(property.name)), property).setOriginal(property)
      );
    }
    function createExpressionForMethodDeclaration(method: MethodDeclaration, receiver: Expression) {
      return aggregateTransformFlags(
        setOriginalNode(
          setRange(
            createAssignment(
              createMemberAccessForPropertyName(receiver, method.name, method.name),
              setRange(new qc.FunctionExpression(method.modifiers, method.asteriskToken, undefined, undefined, method.parameters, undefined, method.body!), method).setOriginal(method)
            ),
            method
          ),
          method
        )
      );
    }
    switch (property.kind) {
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        return createExpressionForAccessorDeclaration(n.properties, property as typeof property & { name: Exclude<PropertyName, qt.PrivateIdentifier> }, receiver, !!n.multiLine);
      case Syntax.PropertyAssignment:
        return createExpressionForPropertyAssignment(property, receiver);
      case Syntax.ShorthandPropertyAssignment:
        return createExpressionForShorthandPropertyAssignment(property, receiver);
      case Syntax.MethodDeclaration:
        return createExpressionForMethodDeclaration(property, receiver);
    }
    return;
  }
  createTypeCheck(value: Expression, tag: TypeOfTag) {
    return tag === 'undefined' ? createStrictEquality(value, VoidExpression.zero()) : createStrictEquality(new TypeOfExpression(value), qc.asLiteral(tag));
  }
  createMemberAccessForPropertyName(target: Expression, memberName: qt.PropertyName, location?: qu.TextRange): MemberExpression {
    if (qf.is.kind(qc.ComputedPropertyName, memberName)) return setRange(new qc.ElementAccessExpression(target, memberName.expression), location);
    else {
      const expression = setRange(
        qf.is.kind(qc.Identifier, memberName) || qf.is.kind(qc.PrivateIdentifier, memberName)
          ? new qc.PropertyAccessExpression(target, memberName)
          : new qc.ElementAccessExpression(target, memberName),
        memberName
      );
      getOrCreateEmitNode(expression).flags |= EmitFlags.NoNestedSourceMaps;
      return expression;
    }
  }
  createFunctionCall(func: Expression, thisArg: Expression, argumentsList: readonly Expression[], location?: qu.TextRange) {
    return setRange(new qc.CallExpression(new qc.PropertyAccessExpression(func, 'call'), undefined, [thisArg, ...argumentsList]), location);
  }
  createFunctionApply(func: Expression, thisArg: Expression, argumentsExpression: Expression, location?: qu.TextRange) {
    return setRange(new qc.CallExpression(new qc.PropertyAccessExpression(func, 'apply'), undefined, [thisArg, argumentsExpression]), location);
  }
  createArraySlice(array: Expression, start?: number | Expression) {
    const argumentsList: Expression[] = [];
    if (start !== undefined) argumentsList.push(typeof start === 'number' ? qc.asLiteral(start) : start);
    return new qc.CallExpression(new qc.PropertyAccessExpression(array, 'slice'), undefined, argumentsList);
  }
  createArrayConcat(array: Expression, values: readonly Expression[]) {
    return new qc.CallExpression(new qc.PropertyAccessExpression(array, 'concat'), undefined, values);
  }
  createMathPow(left: Expression, right: Expression, location?: qu.TextRange) {
    return setRange(new qc.CallExpression(new qc.PropertyAccessExpression(new qc.Identifier('Math'), 'pow'), undefined, [left, right]), location);
  }
  getLeftmostExpression(n: Expression, stopAtCallExpressions: boolean) {
    while (true) {
      switch (n.kind) {
        case Syntax.PostfixUnaryExpression:
          n = (<PostfixUnaryExpression>n).operand;
          continue;
        case Syntax.BinaryExpression:
          n = (<BinaryExpression>n).left;
          continue;
        case Syntax.ConditionalExpression:
          n = (<ConditionalExpression>n).condition;
          continue;
        case Syntax.TaggedTemplateExpression:
          n = (<TaggedTemplateExpression>n).tag;
          continue;
        case Syntax.CallExpression:
          if (stopAtCallExpressions) return n;
        case Syntax.AsExpression:
        case Syntax.ElementAccessExpression:
        case Syntax.PropertyAccessExpression:
        case Syntax.NonNullExpression:
        case Syntax.PartiallyEmittedExpression:
          n = (<CallExpression | qt.PropertyAccessExpression | qt.ElementAccessExpression | AsExpression | NonNullExpression | PartiallyEmittedExpression>n).expression;
          continue;
      }
      return n;
    }
  }
  isCommaSequence(): this is (BinaryExpression & { operatorToken: Token<Syntax.CommaToken> }) | CommaListExpression {
    return (this.kind === Syntax.BinaryExpression && (<BinaryExpression>this).operatorToken.kind === Syntax.CommaToken) || this.kind === Syntax.CommaListExpression;
  }
  isSameEntityName(name: Expression, initer: Expression) {
    if (qf.is.propertyNameLiteral(name) && qf.is.propertyNameLiteral(initer)) return qf.get.textOfIdentifierOrLiteral(name) === qf.get.textOfIdentifierOrLiteral(name);
    if (
      qf.is.kind(qc.Identifier, name) &&
      qf.is.literalLikeAccess(initer) &&
      (initer.expression.kind === Syntax.ThisKeyword ||
        (qf.is.kind(qc.Identifier, initer.expression) && (initer.expression.escapedText === 'window' || initer.expression.escapedText === 'self' || initer.expression.escapedText === 'global')))
    ) {
      const nameOrArgument = qf.get.nameOrArgument(initer);
      if (qf.is.kind(qc.PrivateIdentifier, nameOrArgument)) {
        qu.fail('Unexpected qt.PrivateIdentifier in name expression with literal-like access.');
      }
      return isSameEntityName(name, nameOrArgument);
    }
    if (qf.is.literalLikeAccess(name) && qf.is.literalLikeAccess(initer))
      return qf.get.elementOrPropertyAccessName(name) === qf.get.elementOrPropertyAccessName(initer) && isSameEntityName(name.expression, initer.expression);
    return false;
  }
  getRightMostAssignedExpression(n: Expression) {
    while (qf.is.assignmentExpression(n, true)) {
      n = n.right;
    }
    return n;
  }
  getDefaultedExpandoIniter(name: Expression, initer: Expression, isPrototypeAssignment: boolean) {
    const e =
      qf.is.kind(qc.BinaryExpression, initer) &&
      (initer.operatorToken.kind === Syntax.Bar2Token || initer.operatorToken.kind === Syntax.Question2Token) &&
      qf.get.expandoIniter(initer.right, isPrototypeAssignment);
    if (e && isSameEntityName(name, (initer as qt.BinaryExpression).left)) return e;
    return;
  }
  isDefaultedExpandoIniter(n: qt.BinaryExpression) {
    const name = qf.is.kind(qc.VariableDeclaration, n.parent)
      ? n.parent.name
      : qf.is.kind(qc.BinaryExpression, n.parent) && n.parent.operatorToken.kind === Syntax.EqualsToken
      ? n.parent.left
      : undefined;
    return name && qf.get.expandoIniter(n.right, qf.is.prototypeAccess(name)) && qf.is.entityNameExpression(name) && isSameEntityName(name, n.left);
  }
  getExpressionAssociativity(expression: Expression) {
    const operator = getOperator(expression);
    const hasArguments = expression.kind === Syntax.NewExpression && (<NewExpression>expression).arguments !== undefined;
    return qy.get.operatorAssociativity(expression.kind, operator, hasArguments);
  }
  getExpressionPrecedence(expression: Expression) {
    const operator = getOperator(expression);
    const hasArguments = expression.kind === Syntax.NewExpression && (<NewExpression>expression).arguments !== undefined;
    return qy.get.operatorPrecedence(expression.kind, operator, hasArguments);
  }
  getOperator(expression: Expression): Syntax {
    if (expression.kind === Syntax.BinaryExpression) return (<BinaryExpression>expression).operatorToken.kind;
    else if (expression.kind === Syntax.PrefixUnaryExpression || expression.kind === Syntax.PostfixUnaryExpression) return (<PrefixUnaryExpression | PostfixUnaryExpression>expression).operator;
    return expression.kind;
  }
  isDottedName(n: Expression): boolean {
    return (
      n.kind === Syntax.Identifier ||
      n.kind === Syntax.ThisKeyword ||
      n.kind === Syntax.SuperKeyword ||
      (n.kind === Syntax.PropertyAccessExpression && isDottedName((<PropertyAccessExpression>n).expression)) ||
      (n.kind === Syntax.ParenthesizedExpression && isDottedName((<ParenthesizedExpression>n).expression))
    );
  }
  tryGetPropertyAccessOrIdentifierToString(expr: Expression): string | undefined {
    if (qf.is.kind(qc.PropertyAccessExpression, expr)) {
      const baseStr = tryGetPropertyAccessOrIdentifierToString(expr.expression);
      if (baseStr !== undefined) return baseStr + '.' + expr.name;
    } else if (qf.is.kind(qc.Identifier, expr)) {
      return qy.get.unescUnderscores(expr.escapedText);
    }
    return;
  }
}
export abstract class Statement extends qc.Statement {
  isUseStrictPrologue(n: qt.ExpressionStatement): boolean {
    return qf.is.kind(StringLiteral, n.expression) && n.expression.text === 'use strict';
  }
  addPrologue(target: Statement[], source: readonly Statement[], ensureUseStrict?: boolean, visitor?: (n: Nobj) => VisitResult<Nobj>): number {
    const offset = addStandardPrologue(target, source, ensureUseStrict);
    return addCustomPrologue(target, source, offset, visitor);
  }
  addStandardPrologue(target: Statement[], source: readonly Statement[], ensureUseStrict?: boolean): number {
    qu.assert(target.length === 0, 'Prologue directives should be at the first statement in the target statements array');
    let foundUseStrict = false;
    let statementOffset = 0;
    const numStatements = source.length;
    while (statementOffset < numStatements) {
      const statement = source[statementOffset];
      if (qf.is.prologueDirective(statement)) {
        if (isUseStrictPrologue(statement)) foundUseStrict = true;
        target.push(statement);
      } else {
        break;
      }
      statementOffset++;
    }
    if (ensureUseStrict && !foundUseStrict) target.push(startOnNewLine(new qc.ExpressionStatement(qc.asLiteral('use strict'))));
    return statementOffset;
  }
  addCustomPrologue(target: Statement[], source: readonly Statement[], statementOffset: number, visitor?: (n: Nobj) => VisitResult<Nobj>, filter?: (n: Nobj) => boolean): number;
  addCustomPrologue(
    target: Statement[],
    source: readonly Statement[],
    statementOffset: number | undefined,
    visitor?: (n: Nobj) => VisitResult<Nobj>,
    filter?: (n: Nobj) => boolean
  ): number | undefined;
  addCustomPrologue(
    target: Statement[],
    source: readonly Statement[],
    statementOffset: number | undefined,
    visitor?: (n: Nobj) => VisitResult<Nobj>,
    filter: (n: Nobj) => boolean = () => true
  ): number | undefined {
    const numStatements = source.length;
    while (statementOffset !== undefined && statementOffset < numStatements) {
      const statement = source[statementOffset];
      if (qf.get.emitFlags(statement) & EmitFlags.CustomPrologue && filter(statement)) qu.append(target, visitor ? visitNode(statement, visitor, isStatement) : statement);
      else break;
      statementOffset++;
    }
    return statementOffset;
  }
  findUseStrictPrologue(statements: readonly Statement[]): Statement | undefined {
    for (const statement of statements) {
      if (qf.is.prologueDirective(statement)) {
        if (isUseStrictPrologue(statement)) return statement;
      } else break;
    }
    return;
  }
  startsWithUseStrict(statements: readonly Statement[]) {
    const firstStatement = qu.firstOrUndefined(statements);
    return firstStatement !== undefined && qf.is.prologueDirective(firstStatement) && isUseStrictPrologue(firstStatement);
  }
  createForOfBindingStatement(n: ForIniter, boundValue: Expression): Statement {
    if (qf.is.kind(qc.VariableDeclarationList, n)) {
      const firstDeclaration = first(n.declarations);
      const updatedDeclaration = firstDeclaration.update(firstDeclaration.name, undefined, boundValue);
      return setRange(new qc.VariableStatement(undefined, n.update([updatedDeclaration])), n);
    } else {
      const updatedExpression = setRange(createAssignment(n, boundValue), n);
      return setRange(new qc.ExpressionStatement(updatedExpression), n);
    }
  }
  insertLeadingStatement(dest: Statement, source: Statement) {
    if (qf.is.kind(qc.Block, dest)) return dest.update(setRange(new qc.Nodes([source, ...dest.statements]), dest.statements));
    return new qc.Block(new qc.Nodes([dest, source]), true);
  }
  restoreEnclosingLabel(n: Statement, outermostLabeledStatement: LabeledStatement | undefined, afterRestoreLabelCallback?: (n: LabeledStatement) => void): Statement {
    if (!outermostLabeledStatement) return n;
    const updated = updateLabel(
      outermostLabeledStatement,
      outermostLabeledStatement.label,
      outermostLabeledStatement.statement.kind === Syntax.LabeledStatement ? restoreEnclosingLabel(n, <LabeledStatement>outermostLabeledStatement.statement) : n
    );
    if (afterRestoreLabelCallback) afterRestoreLabelCallback(outermostLabeledStatement);
    return updated;
  }
  canHaveExportModifier() {
    return (
      qf.is.kind(qc.EnumDeclaration, this) ||
      qf.is.kind(qc.VariableStatement, this) ||
      qf.is.kind(qc.FunctionDeclaration, this) ||
      qf.is.kind(qc.ClassDeclaration, this) ||
      (qf.is.kind(qc.ModuleDeclaration, this) && !qf.is.externalModuleAugmentation(this) && !n.isGlobalScopeAugmentation()) ||
      qf.is.kind(qc.InterfaceDeclaration, this) ||
      qf.is.qf.is.typeDeclaration(this)
    );
  }
}
export namespace BindingOrAssignmentElement {
  export function getIniterOfBindingOrAssignmentElement(e: qc.BindingOrAssignmentElement): qc.Expression | undefined {
    if (qf.is.declarationBindingElement(e)) {
      // `1` in `let { a = 1 } = ...`
      // `1` in `let { a: b = 1 } = ...`
      // `1` in `let { a: {b} = 1 } = ...`
      // `1` in `let { a: [b] = 1 } = ...`
      // `1` in `let [a = 1] = ...`
      // `1` in `let [{a} = 1] = ...`
      // `1` in `let [[a] = 1] = ...`
      return e.initer;
    }
    if (qf.is.kind(qc.PropertyAssignment, e)) {
      // `1` in `({ a: b = 1 } = ...)`
      // `1` in `({ a: {b} = 1 } = ...)`
      // `1` in `({ a: [b] = 1 } = ...)`
      const i = e.initer;
      return qf.is.assignmentExpression(i, true) ? i.right : undefined;
    }
    if (qf.is.kind(qc.ShorthandPropertyAssignment, e)) {
      // `1` in `({ a = 1 } = ...)`
      return e.objectAssignmentIniter;
    }
    if (qf.is.assignmentExpression(e, true)) {
      // `1` in `[a = 1] = ...`
      // `1` in `[{a} = 1] = ...`
      // `1` in `[[a] = 1] = ...`
      return e.right;
    }
    if (qf.is.kind(qc.SpreadElement, e)) return getIniterOfBindingOrAssignmentElement(<qc.BindingOrAssignmentElement>e.expression);
    return;
  }
  export function getTargetOfBindingOrAssignmentElement(e: qc.BindingOrAssignmentElement): qc.BindingOrAssignmentElementTarget | undefined {
    if (qf.is.declarationBindingElement(e)) {
      // `a` in `let { a } = ...`
      // `a` in `let { a = 1 } = ...`
      // `b` in `let { a: b } = ...`
      // `b` in `let { a: b = 1 } = ...`
      // `a` in `let { ...a } = ...`
      // `{b}` in `let { a: {b} } = ...`
      // `{b}` in `let { a: {b} = 1 } = ...`
      // `[b]` in `let { a: [b] } = ...`
      // `[b]` in `let { a: [b] = 1 } = ...`
      // `a` in `let [a] = ...`
      // `a` in `let [a = 1] = ...`
      // `a` in `let [...a] = ...`
      // `{a}` in `let [{a}] = ...`
      // `{a}` in `let [{a} = 1] = ...`
      // `[a]` in `let [[a]] = ...`
      // `[a]` in `let [[a] = 1] = ...`
      return e.name;
    }
    if (qf.is.objectLiteralElementLike(e)) {
      switch (e.kind) {
        case Syntax.PropertyAssignment:
          // `b` in `({ a: b } = ...)`
          // `b` in `({ a: b = 1 } = ...)`
          // `{b}` in `({ a: {b} } = ...)`
          // `{b}` in `({ a: {b} = 1 } = ...)`
          // `[b]` in `({ a: [b] } = ...)`
          // `[b]` in `({ a: [b] = 1 } = ...)`
          // `b.c` in `({ a: b.c } = ...)`
          // `b.c` in `({ a: b.c = 1 } = ...)`
          // `b[0]` in `({ a: b[0] } = ...)`
          // `b[0]` in `({ a: b[0] = 1 } = ...)`
          return getTargetOfBindingOrAssignmentElement(<qc.BindingOrAssignmentElement>e.initer);
        case Syntax.ShorthandPropertyAssignment:
          // `a` in `({ a } = ...)`
          // `a` in `({ a = 1 } = ...)`
          return e.name;
        case Syntax.SpreadAssignment:
          // `a` in `({ ...a } = ...)`
          return getTargetOfBindingOrAssignmentElement(<qc.BindingOrAssignmentElement>e.expression);
      }
      // no target
      return;
    }
    if (qf.is.assignmentExpression(e, true)) {
      // `a` in `[a = 1] = ...`
      // `{a}` in `[{a} = 1] = ...`
      // `[a]` in `[[a] = 1] = ...`
      // `a.b` in `[a.b = 1] = ...`
      // `a[0]` in `[a[0] = 1] = ...`
      return getTargetOfBindingOrAssignmentElement(<qc.BindingOrAssignmentElement>e.left);
    }
    if (qf.is.kind(qc.SpreadElement, e)) {
      // `a` in `[...a] = ...`
      return getTargetOfBindingOrAssignmentElement(<qc.BindingOrAssignmentElement>e.expression);
    }
    // `a` in `[a] = ...`
    // `{a}` in `[{a}] = ...`
    // `[a]` in `[[a]] = ...`
    // `a.b` in `[a.b] = ...`
    // `a[0]` in `[a[0]] = ...`
    return e;
  }
  export function getRestIndicatorOfBindingOrAssignmentElement(e: qc.BindingOrAssignmentElement): qc.BindingOrAssignmentElementRestIndicator | undefined {
    switch (e.kind) {
      case Syntax.Parameter:
      case Syntax.BindingElement:
        // `...` in `let [...a] = ...`
        return e.dot3Token;
      case Syntax.SpreadElement:
      case Syntax.SpreadAssignment:
        // `...` in `[...a] = ...`
        return e;
    }
    return;
  }
  export function getPropertyNameOfBindingOrAssignmentElement(e: qc.BindingOrAssignmentElement): Exclude<qc.PropertyName, qt.PrivateIdentifier> | undefined {
    const propertyName = tryGetPropertyNameOfBindingOrAssignmentElement(e);
    qu.assert(!!propertyName || qf.is.kind(qc.SpreadAssignment, e));
    return propertyName;
  }
  export function tryGetPropertyNameOfBindingOrAssignmentElement(e: qc.BindingOrAssignmentElement): Exclude<qc.PropertyName, qt.PrivateIdentifier> | undefined {
    switch (e.kind) {
      case Syntax.BindingElement:
        // `a` in `let { a: b } = ...`
        // `[a]` in `let { [a]: b } = ...`
        // `"a"` in `let { "a": b } = ...`
        // `1` in `let { 1: b } = ...`
        if (e.propertyName) {
          const propertyName = e.propertyName;
          if (qf.is.kind(qc.PrivateIdentifier, propertyName)) return qc.failBadSyntax(propertyName);
          return qf.is.kind(qc.ComputedPropertyName, propertyName) && qf.is.stringOrNumericLiteral(propertyName.expression) ? propertyName.expression : propertyName;
        }
        break;
      case Syntax.PropertyAssignment:
        // `a` in `({ a: b } = ...)`
        // `[a]` in `({ [a]: b } = ...)`
        // `"a"` in `({ "a": b } = ...)`
        // `1` in `({ 1: b } = ...)`
        if (e.name) {
          const propertyName = e.name;
          if (qf.is.kind(qc.PrivateIdentifier, propertyName)) return qc.failBadSyntax(propertyName);
          return qf.is.kind(qc.ComputedPropertyName, propertyName) && qf.is.stringOrNumericLiteral(propertyName.expression) ? propertyName.expression : propertyName;
        }
        break;
      case Syntax.SpreadAssignment:
        // `a` in `({ ...a } = ...)`
        if (e.name && qf.is.kind(qc.PrivateIdentifier, e.name)) return qc.failBadSyntax(e.name);
        return e.name;
    }
    const target = getTargetOfBindingOrAssignmentElement(e);
    if (target && qf.is.propertyName(target)) return target;
    return;
  }
  export function convertToArrayAssignmentElement(e: qc.BindingOrAssignmentElement) {
    if (qf.is.kind(qc.BindingElement, e)) {
      if (e.dot3Token) {
        qc.assertNode(e.name, isIdentifier);
        return new qc.SpreadElement(e.name).setRange(e).setOriginal(e);
      }
      const e2 = convertToAssignmentElementTarget(e.name);
      return e.initer ? createAssignment(e2, e.initer).setRange(e).setOriginal(e) : e2;
    }
    qc.assertNode(e, isExpression);
    return <qc.Expression>e;
  }
  export function convertToObjectAssignmentElement(e: qc.BindingOrAssignmentElement) {
    if (qf.is.kind(qc.BindingElement, e)) {
      if (e.dot3Token) {
        qc.assertNode(e.name, isIdentifier);
        return new qc.SpreadAssignment(e.name).setRange(e).setOriginal(e);
      }
      if (e.propertyName) {
        const e2 = convertToAssignmentElementTarget(e.name);
        return new qc.PropertyAssignment(e.propertyName, e.initer ? createAssignment(e2, e.initer) : e2).setRange(e).setOriginal(e);
      }
      qc.assertNode(e.name, isIdentifier);
      return new qc.ShorthandPropertyAssignment(e.name, e.initer).setRange(e).setOriginal(e);
    }
    qc.assertNode(e, isObjectLiteralElementLike);
    return <qc.ObjectLiteralElementLike>e;
  }
}
export namespace BindingOrAssignmentPattern {
  export function getElementsOfBindingOrAssignmentPattern(name: qc.BindingOrAssignmentPattern): readonly qc.BindingOrAssignmentElement[] {
    switch (name.kind) {
      case Syntax.ObjectBindingPattern:
      case Syntax.ArrayBindingPattern:
      case Syntax.ArrayLiteralExpression:
        // `a` in `{a}`
        // `a` in `[a]`
        return <readonly qc.BindingOrAssignmentElement[]>name.elements;
      case Syntax.ObjectLiteralExpression:
        // `a` in `{a}`
        return <readonly qc.BindingOrAssignmentElement[]>name.properties;
    }
  }
  export function convertToAssignmentPattern(n: qc.BindingOrAssignmentPattern): qc.AssignmentPattern {
    switch (n.kind) {
      case Syntax.ArrayBindingPattern:
      case Syntax.ArrayLiteralExpression:
        return convertToArrayAssignmentPattern(n);
      case Syntax.ObjectBindingPattern:
      case Syntax.ObjectLiteralExpression:
        return convertToObjectAssignmentPattern(n);
    }
  }
  export function convertToObjectAssignmentPattern(n: qc.ObjectBindingOrAssignmentPattern) {
    if (qf.is.kind(qc.ObjectBindingPattern, n)) return new qc.ObjectLiteralExpression(qu.map(n.elements, convertToObjectAssignmentElement)).setOriginal(n).setRange(n);
    qc.assertNode(n, isObjectLiteralExpression);
    return n;
  }
  export function convertToArrayAssignmentPattern(n: qc.ArrayBindingOrAssignmentPattern) {
    if (qf.is.kind(qc.ArrayBindingPattern, n)) return new qc.ArrayLiteralExpression(qu.map(n.elements, convertToArrayAssignmentElement)).setOriginal(n).setRange(n);
    qc.assertNode(n, isArrayLiteralExpression);
    return n;
  }
  export function convertToAssignmentElementTarget(n: qc.BindingOrAssignmentElementTarget): qc.Expression {
    if (qf.is.kind(qc.BindingPattern, n)) return convertToAssignmentPattern(n);
    qc.assertNode(n, isExpression);
    return n;
  }
}
