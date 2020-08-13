import * as qb from '../base';
import * as qc from '../core';
import { Node, Nodes } from '../core';
import * as qs from '../core3';
import * as qt from '../types';
import * as qy from '../syntax';
import { Modifier, Syntax } from '../syntax';
interface FlattenContext {
  context: TrafoContext;
  level: FlattenLevel;
  downlevelIteration: boolean;
  hoistTempVariables: boolean;
  emitExpression: (value: Expression) => void;
  emitBindingOrAssignment: (target: BindingOrAssignmentElemTarget, value: Expression, location: TextRange, original: Node | undefined) => void;
  createArrayBindingOrAssignmentPattern: (elems: BindingOrAssignmentElem[]) => ArrayBindingOrAssignmentPattern;
  createObjectBindingOrAssignmentPattern: (elems: BindingOrAssignmentElem[]) => ObjectBindingOrAssignmentPattern;
  createArrayBindingOrAssignmentElem: (node: Identifier) => BindingOrAssignmentElem;
  visitor?: (node: Node) => VisitResult<Node>;
}
export const enum FlattenLevel {
  All,
  ObjectRest,
}
export function flattenDestructuringAssignment(
  node: VariableDeclaration | DestructuringAssignment,
  visitor: ((node: Node) => VisitResult<Node>) | undefined,
  context: TrafoContext,
  level: FlattenLevel,
  needsValue?: boolean,
  qf.create.assignmentCallback?: (name: Identifier, value: Expression, location?: TextRange) => Expression
): Expression {
  let location: TextRange = node;
  let value: Expression | undefined;
  if (qc.is.destructuringAssignment(node)) {
    value = node.right;
    while (qc.is.emptyArrayLiteral(node.left) || qc.is.emptyObjectLiteral(node.left)) {
      if (qc.is.destructuringAssignment(value)) {
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
    downlevelIteration: !!context.getCompilerOpts().downlevelIteration,
    hoistTempVariables: true,
    emitExpression,
    emitBindingOrAssignment,
    createArrayBindingOrAssignmentPattern: makeArrayAssignmentPattern,
    createObjectBindingOrAssignmentPattern: makeObjectAssignmentPattern,
    createArrayBindingOrAssignmentElem: makeAssignmentElem,
    visitor,
  };
  if (value) {
    value = visitNode(value, visitor, isExpression);
    if ((qc.is.kind(qc.Identifier, value) && bindingOrAssignmentElemAssignsToName(node, value.escapedText)) || bindingOrAssignmentElemContainsNonLiteralComputedName(node)) {
      value = ensureIdentifier(flattenContext, value, false, location);
    } else if (needsValue) {
      value = ensureIdentifier(flattenContext, value, true, location);
    } else if (isSynthesized(node)) {
      location = value;
    }
  }
  flattenBindingOrAssignmentElem(flattenContext, node, value, location, qc.is.destructuringAssignment(node));
  if (value && needsValue) {
    if (!some(expressions)) return value;
    expressions.push(value);
  }
  return qc.compute.aggregate(inlineExpressions(expressions!)) || new qc.OmittedExpression();
  function emitExpression(expression: Expression) {
    qc.compute.aggregate(expression);
    expressions = append(expressions, expression);
  }
  function emitBindingOrAssignment(target: BindingOrAssignmentElemTarget, value: Expression, location: TextRange, original: Node) {
    qc.assert.node(target, qf.create.assignmentCallback ? isIdentifier : isExpression);
    const expression = qf.create.assignmentCallback
      ? qf.create.assignmentCallback(<Identifier>target, value, location)
      : setRange(qf.create.assignment(visitNode(<Expression>target, visitor, isExpression), value), location);
    expression.original = original;
    emitExpression(expression);
  }
}
function bindingOrAssignmentElemAssignsToName(elem: BindingOrAssignmentElem, escName: __String): boolean {
  const target = getTargetOfBindingOrAssignmentElem(elem)!;
  if (qc.is.bindingOrAssignmentPattern(target)) return bindingOrAssignmentPatternAssignsToName(target, escName);
  if (qc.is.kind(qc.Identifier, target)) return target.escapedText === escName;
  return false;
}
function bindingOrAssignmentPatternAssignsToName(pattern: BindingOrAssignmentPattern, escName: __String): boolean {
  const elems = getElemsOfBindingOrAssignmentPattern(pattern);
  for (const elem of elems) {
    if (bindingOrAssignmentElemAssignsToName(elem, escName)) return true;
  }
  return false;
}
function bindingOrAssignmentElemContainsNonLiteralComputedName(elem: BindingOrAssignmentElem): boolean {
  const propertyName = tryGetPropertyNameOfBindingOrAssignmentElem(elem);
  if (propertyName && qc.is.kind(qc.ComputedPropertyName, propertyName) && !qc.is.literalExpression(propertyName.expression)) return true;
  const target = getTargetOfBindingOrAssignmentElem(elem);
  return !!target && qc.is.bindingOrAssignmentPattern(target) && bindingOrAssignmentPatternContainsNonLiteralComputedName(target);
}
function bindingOrAssignmentPatternContainsNonLiteralComputedName(pattern: BindingOrAssignmentPattern): boolean {
  return !!forEach(getElemsOfBindingOrAssignmentPattern(pattern), bindingOrAssignmentElemContainsNonLiteralComputedName);
}
export function flattenDestructuringBinding(
  node: VariableDeclaration | ParamDeclaration,
  visitor: (node: Node) => VisitResult<Node>,
  context: TrafoContext,
  level: FlattenLevel,
  rval?: Expression,
  hoistTempVariables = false,
  skipIniter?: boolean
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
    downlevelIteration: !!context.getCompilerOpts().downlevelIteration,
    hoistTempVariables,
    emitExpression,
    emitBindingOrAssignment,
    createArrayBindingOrAssignmentPattern: makeArrayBindingPattern,
    createObjectBindingOrAssignmentPattern: makeObjectBindingPattern,
    createArrayBindingOrAssignmentElem: makeBindingElem,
    visitor,
  };
  if (qc.is.kind(qc.VariableDeclaration, node)) {
    let initer = getIniterOfBindingOrAssignmentElem(node);
    if (initer && ((qc.is.kind(qc.Identifier, initer) && bindingOrAssignmentElemAssignsToName(node, initer.escapedText)) || bindingOrAssignmentElemContainsNonLiteralComputedName(node))) {
      initer = ensureIdentifier(flattenContext, initer, false, initer);
      node = node.update(node.name, node.type, initer);
    }
  }
  flattenBindingOrAssignmentElem(flattenContext, node, rval, node, skipIniter);
  if (pendingExpressions) {
    const temp = createTempVariable(undefined);
    if (hoistTempVariables) {
      const value = inlineExpressions(pendingExpressions);
      pendingExpressions = undefined;
      emitBindingOrAssignment(temp, value, undefined);
    } else {
      context.hoistVariableDeclaration(temp);
      const pendingDeclaration = last(pendingDeclarations);
      pendingDeclaration.pendingExpressions = append(pendingDeclaration.pendingExpressions, qf.create.assignment(temp, pendingDeclaration.value));
      qu.addRange(pendingDeclaration.pendingExpressions, pendingExpressions);
      pendingDeclaration.value = temp;
    }
  }
  for (const { pendingExpressions, name, value, location, original } of pendingDeclarations) {
    const variable = new qc.VariableDeclaration(name, undefined, pendingExpressions ? inlineExpressions(append(pendingExpressions, value)) : value);
    variable.original = original;
    setRange(variable, location);
    qc.compute.aggregate(variable);
    declarations.push(variable);
  }
  return declarations;
  function emitExpression(value: Expression) {
    pendingExpressions = append(pendingExpressions, value);
  }
  function emitBindingOrAssignment(target: BindingOrAssignmentElemTarget, value: Expression, location: TextRange | undefined, original: Node | undefined) {
    qc.assert.node(target, isBindingName);
    if (pendingExpressions) {
      value = inlineExpressions(append(pendingExpressions, value));
      pendingExpressions = undefined;
    }
    pendingDeclarations.push({ pendingExpressions, name: target, value, location, original });
  }
}
function flattenBindingOrAssignmentElem(flattenContext: FlattenContext, elem: BindingOrAssignmentElem, value: Expression | undefined, location: TextRange, skipIniter?: boolean) {
  if (!skipIniter) {
    const initer = visitNode(getIniterOfBindingOrAssignmentElem(elem), flattenContext.visitor, isExpression);
    if (initer) {
      value = value ? createDefaultValueCheck(flattenContext, value, initer, location) : initer;
    } else if (!value) {
      value = qs.VoidExpression.zero();
    }
  }
  const bindingTarget = getTargetOfBindingOrAssignmentElem(elem)!;
  if (qc.is.objectBindingOrAssignmentPattern(bindingTarget)) {
    flattenObjectBindingOrAssignmentPattern(flattenContext, elem, bindingTarget, value!, location);
  } else if (qc.is.arrayBindingOrAssignmentPattern(bindingTarget)) {
    flattenArrayBindingOrAssignmentPattern(flattenContext, elem, bindingTarget, value!, location);
  } else {
    flattenContext.emitBindingOrAssignment(bindingTarget, value!, location, elem);
  }
}
function flattenObjectBindingOrAssignmentPattern(
  flattenContext: FlattenContext,
  parent: BindingOrAssignmentElem,
  pattern: ObjectBindingOrAssignmentPattern,
  value: Expression,
  location: TextRange
) {
  const elems = getElemsOfBindingOrAssignmentPattern(pattern);
  const numElems = elems.length;
  if (numElems !== 1) {
    const reuseIdentifierExpressions = !qc.is.declarationBindingElem(parent) || numElems !== 0;
    value = ensureIdentifier(flattenContext, value, reuseIdentifierExpressions, location);
  }
  let bindingElems: BindingOrAssignmentElem[] | undefined;
  let computedTempVariables: Expression[] | undefined;
  for (let i = 0; i < numElems; i++) {
    const elem = elems[i];
    if (!getRestIndicatorOfBindingOrAssignmentElem(elem)) {
      const propertyName = getPropertyNameOfBindingOrAssignmentElem(elem)!;
      if (
        flattenContext.level >= FlattenLevel.ObjectRest &&
        !(elem.trafoFlags & (TrafoFlags.ContainsRestOrSpread | TrafoFlags.ContainsObjectRestOrSpread)) &&
        !(getTargetOfBindingOrAssignmentElem(elem)!.trafoFlags & (TrafoFlags.ContainsRestOrSpread | TrafoFlags.ContainsObjectRestOrSpread)) &&
        !qc.is.kind(qc.ComputedPropertyName, propertyName)
      ) {
        bindingElems = append(bindingElems, visitNode(elem, flattenContext.visitor));
      } else {
        if (bindingElems) {
          flattenContext.emitBindingOrAssignment(flattenContext.createObjectBindingOrAssignmentPattern(bindingElems), value, location, pattern);
          bindingElems = undefined;
        }
        const rhsValue = createDestructuringPropertyAccess(flattenContext, value, propertyName);
        if (qc.is.kind(qc.ComputedPropertyName, propertyName)) {
          computedTempVariables = append<Expression>(computedTempVariables, (rhsValue as ElemAccessExpression).argExpression);
        }
        flattenBindingOrAssignmentElem(flattenContext, elem, rhsValue, elem);
      }
    } else if (i === numElems - 1) {
      if (bindingElems) {
        flattenContext.emitBindingOrAssignment(flattenContext.createObjectBindingOrAssignmentPattern(bindingElems), value, location, pattern);
        bindingElems = undefined;
      }
      const rhsValue = createRestCall(flattenContext.context, value, elems, computedTempVariables!, pattern);
      flattenBindingOrAssignmentElem(flattenContext, elem, rhsValue, elem);
    }
  }
  if (bindingElems) {
    flattenContext.emitBindingOrAssignment(flattenContext.createObjectBindingOrAssignmentPattern(bindingElems), value, location, pattern);
  }
}
function flattenArrayBindingOrAssignmentPattern(flattenContext: FlattenContext, parent: BindingOrAssignmentElem, pattern: ArrayBindingOrAssignmentPattern, value: Expression, location: TextRange) {
  const elems = getElemsOfBindingOrAssignmentPattern(pattern);
  const numElems = elems.length;
  if (flattenContext.level < FlattenLevel.ObjectRest && flattenContext.downlevelIteration) {
    value = ensureIdentifier(
      flattenContext,
      createReadHelper(flattenContext.context, value, numElems > 0 && getRestIndicatorOfBindingOrAssignmentElem(elems[numElems - 1]) ? undefined : numElems, location),
      false,
      location
    );
  } else if ((numElems !== 1 && (flattenContext.level < FlattenLevel.ObjectRest || numElems === 0)) || every(elems, isOmittedExpression)) {
    const reuseIdentifierExpressions = !qc.is.declarationBindingElem(parent) || numElems !== 0;
    value = ensureIdentifier(flattenContext, value, reuseIdentifierExpressions, location);
  }
  let bindingElems: BindingOrAssignmentElem[] | undefined;
  let restContainingElems: [Identifier, BindingOrAssignmentElem][] | undefined;
  for (let i = 0; i < numElems; i++) {
    const elem = elems[i];
    if (flattenContext.level >= FlattenLevel.ObjectRest) {
      if (elem.trafoFlags & TrafoFlags.ContainsObjectRestOrSpread) {
        const temp = createTempVariable(undefined);
        if (flattenContext.hoistTempVariables) {
          flattenContext.context.hoistVariableDeclaration(temp);
        }
        restContainingElems = append(restContainingElems, <[Identifier, BindingOrAssignmentElem]>[temp, elem]);
        bindingElems = append(bindingElems, flattenContext.createArrayBindingOrAssignmentElem(temp));
      } else {
        bindingElems = append(bindingElems, elem);
      }
    } else if (qc.is.kind(qc.OmittedExpression, elem)) {
      continue;
    } else if (!getRestIndicatorOfBindingOrAssignmentElem(elem)) {
      const rhsValue = new qs.ElemAccessExpression(value, i);
      flattenBindingOrAssignmentElem(flattenContext, elem, rhsValue, elem);
    } else if (i === numElems - 1) {
      const rhsValue = createArraySlice(value, i);
      flattenBindingOrAssignmentElem(flattenContext, elem, rhsValue, elem);
    }
  }
  if (bindingElems) {
    flattenContext.emitBindingOrAssignment(flattenContext.createArrayBindingOrAssignmentPattern(bindingElems), value, location, pattern);
  }
  if (restContainingElems) {
    for (const [id, elem] of restContainingElems) {
      flattenBindingOrAssignmentElem(flattenContext, elem, id, elem);
    }
  }
}
function createDefaultValueCheck(flattenContext: FlattenContext, value: Expression, defaultValue: Expression, location: TextRange): Expression {
  value = ensureIdentifier(flattenContext, value, true, location);
  return new qc.ConditionalExpression(createTypeCheck(value, 'undefined'), defaultValue, value);
}
function createDestructuringPropertyAccess(flattenContext: FlattenContext, value: Expression, propertyName: PropertyName): LeftExpression {
  if (qc.is.kind(qc.ComputedPropertyName, propertyName)) {
    const argExpression = ensureIdentifier(flattenContext, visitNode(propertyName.expression, flattenContext.visitor), propertyName);
    return new qs.ElemAccessExpression(value, argExpression);
  } else if (qf.is.stringOrNumericLiteralLike(propertyName)) {
    const argExpression = getSynthesizedClone(propertyName);
    argExpression.text = argExpression.text;
    return new qs.ElemAccessExpression(value, argExpression);
  } else {
    const name = new Identifier(idText(propertyName));
    return new qc.PropertyAccessExpression(value, name);
  }
}
function ensureIdentifier(flattenContext: FlattenContext, value: Expression, reuseIdentifierExpressions: boolean, location: TextRange) {
  if (qc.is.kind(qc.Identifier, value) && reuseIdentifierExpressions) return value;
  else {
    const temp = createTempVariable(undefined);
    if (flattenContext.hoistTempVariables) {
      flattenContext.context.hoistVariableDeclaration(temp);
      flattenContext.emitExpression(setRange(qf.create.assignment(temp, value), location));
    } else {
      flattenContext.emitBindingOrAssignment(temp, value, location, undefined);
    }
    return temp;
  }
}
function makeArrayBindingPattern(elems: BindingOrAssignmentElem[]) {
  qc.assert.eachNode(elems, isArrayBindingElem);
  return new ArrayBindingPattern(<ArrayBindingElem[]>elems);
}
function makeArrayAssignmentPattern(elems: BindingOrAssignmentElem[]) {
  return new ArrayLiteralExpression(map(elems, convertToArrayAssignmentElem));
}
function makeObjectBindingPattern(elems: BindingOrAssignmentElem[]) {
  qc.assert.eachNode(elems, BindingElem.kind);
  return ObjectBindingPattern.create(<BindingElem[]>elems);
}
function makeObjectAssignmentPattern(elems: BindingOrAssignmentElem[]) {
  return new qc.ObjectLiteralExpression(map(elems, convertToObjectAssignmentElem));
}
function makeBindingElem(name: Identifier) {
  return new BindingElem(undefined, name);
}
function makeAssignmentElem(name: Identifier) {
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
function createRestCall(
  context: TrafoContext,
  value: Expression,
  elems: readonly BindingOrAssignmentElem[],
  computedTempVariables: readonly Expression[],
  location: TextRange
): Expression {
  context.requestEmitHelper(restHelper);
  const propertyNames: Expression[] = [];
  let computedTempVariableOffset = 0;
  for (let i = 0; i < elems.length - 1; i++) {
    const propertyName = getPropertyNameOfBindingOrAssignmentElem(elems[i]);
    if (propertyName) {
      if (qc.is.kind(qc.ComputedPropertyName, propertyName)) {
        const temp = computedTempVariables[computedTempVariableOffset];
        computedTempVariableOffset++;
        propertyNames.push(new qc.ConditionalExpression(createTypeCheck(temp, 'symbol'), temp, qf.create.add(temp, qc.asLiteral(''))));
      } else {
        propertyNames.push(qc.asLiteral(propertyName));
      }
    }
  }
  return new qs.CallExpression(getUnscopedHelperName('__rest'), undefined, [value, setRange(new ArrayLiteralExpression(propertyNames), location)]);
}
