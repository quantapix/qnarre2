import { Node, Modifier, ModifierFlags } from '../types';
import { qf, Nodes } from '../core';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from '../types';
import * as qu from '../utils';
import * as qy from '../syntax';
interface FlattenContext {
  context: qt.TrafoContext;
  level: FlattenLevel;
  downlevelIteration: boolean;
  hoistTempVariables: boolean;
  emitExpression: (value: qt.Expression) => void;
  emitBindingOrAssignment: (target: qt.BindingOrAssignmentElemTarget, value: qt.Expression, location: TextRange, original: Node | undefined) => void;
  createArrayBindingOrAssignmentPattern: (elems: qt.BindingOrAssignmentElem[]) => qt.ArrayBindingOrAssignmentPattern;
  createObjectBindingOrAssignmentPattern: (elems: qt.BindingOrAssignmentElem[]) => qt.ObjectBindingOrAssignmentPattern;
  createArrayBindingOrAssignmentElem: (node: qt.Identifier) => qt.BindingOrAssignmentElem;
  visitor?: (node: Node) => VisitResult<Node>;
}
export const enum FlattenLevel {
  All,
  ObjectRest,
}
export function flattenDestructuringAssignment(
  node: qt.VariableDeclaration | qt.DestructuringAssignment,
  visitor: ((node: Node) => VisitResult<Node>) | undefined,
  context: qt.TrafoContext,
  level: FlattenLevel,
  needsValue?: boolean,
  createAssignmentCallback?: (name: qt.Identifier, value: qt.Expression, location?: TextRange) => qt.Expression
): qt.Expression {
  let location: TextRange = node;
  let value: qt.Expression | undefined;
  if (qf.is.destructuringAssignment(node)) {
    value = node.right;
    while (qf.is.emptyArrayLiteral(node.left) || qf.is.emptyObjectLiteral(node.left)) {
      if (qf.is.destructuringAssignment(value)) {
        location = node = value;
        value = node.right;
      } else {
        return visitNode(value, visitor, isExpression);
      }
    }
  }
  let expressions: qt.Expression[] | undefined;
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
    if ((qf.is.kind(qc.Identifier, value) && bindingOrAssignmentElemAssignsToName(node, value.escapedText)) || bindingOrAssignmentElemContainsNonLiteralComputedName(node)) {
      value = ensureIdentifier(flattenContext, value, false, location);
    } else if (needsValue) {
      value = ensureIdentifier(flattenContext, value, true, location);
    } else if (isSynthesized(node)) {
      location = value;
    }
  }
  flattenBindingOrAssignmentElem(flattenContext, node, value, location, qf.is.destructuringAssignment(node));
  if (value && needsValue) {
    if (!some(expressions)) return value;
    expressions.push(value);
  }
  return qf.calc.aggregate(inlineExpressions(expressions!)) || new qc.OmittedExpression();
  function emitExpression(expression: qt.Expression) {
    qf.calc.aggregate(expression);
    expressions = append(expressions, expression);
  }
  function emitBindingOrAssignment(target: qt.BindingOrAssignmentElemTarget, value: qt.Expression, location: TextRange, original: Node) {
    qf.assert.node(target, qf.create.assignmentCallback ? isIdentifier : isExpression);
    const expression = qf.create.assignmentCallback
      ? qf.create.assignmentCallback(<qt.Identifier>target, value, location)
      : qf.create.assignment(visitNode(<qt.Expression>target, visitor, isExpression), value).setRange(location);
    expression.original = original;
    emitExpression(expression);
  }
}
function bindingOrAssignmentElemAssignsToName(elem: qt.BindingOrAssignmentElem, escName: __String): boolean {
  const target = getTargetOfBindingOrAssignmentElem(elem)!;
  if (qf.is.bindingOrAssignmentPattern(target)) return bindingOrAssignmentPatternAssignsToName(target, escName);
  if (qf.is.kind(qc.Identifier, target)) return target.escapedText === escName;
  return false;
}
function bindingOrAssignmentPatternAssignsToName(pattern: qt.BindingOrAssignmentPattern, escName: __String): boolean {
  const elems = getElemsOfBindingOrAssignmentPattern(pattern);
  for (const elem of elems) {
    if (bindingOrAssignmentElemAssignsToName(elem, escName)) return true;
  }
  return false;
}
function bindingOrAssignmentElemContainsNonLiteralComputedName(elem: qt.BindingOrAssignmentElem): boolean {
  const propertyName = tryGetPropertyNameOfBindingOrAssignmentElem(elem);
  if (propertyName && qf.is.kind(qc.ComputedPropertyName, propertyName) && !qf.is.literalExpression(propertyName.expression)) return true;
  const target = getTargetOfBindingOrAssignmentElem(elem);
  return !!target && qf.is.bindingOrAssignmentPattern(target) && bindingOrAssignmentPatternContainsNonLiteralComputedName(target);
}
function bindingOrAssignmentPatternContainsNonLiteralComputedName(pattern: qt.BindingOrAssignmentPattern): boolean {
  return !!forEach(getElemsOfBindingOrAssignmentPattern(pattern), bindingOrAssignmentElemContainsNonLiteralComputedName);
}
export function flattenDestructuringBinding(
  node: qt.VariableDeclaration | qt.ParamDeclaration,
  visitor: (node: Node) => VisitResult<Node>,
  context: qt.TrafoContext,
  level: FlattenLevel,
  rval?: qt.Expression,
  hoistTempVariables = false,
  skipIniter?: boolean
): qt.VariableDeclaration[] {
  let pendingExpressions: qt.Expression[] | undefined;
  const pendingDeclarations: {
    pendingExpressions?: qt.Expression[];
    name: qt.BindingName;
    value: qt.Expression;
    location?: TextRange;
    original?: Node;
  }[] = [];
  const declarations: qt.VariableDeclaration[] = [];
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
  if (qf.is.kind(qc.VariableDeclaration, node)) {
    let initer = getIniterOfBindingOrAssignmentElem(node);
    if (initer && ((qf.is.kind(qc.Identifier, initer) && bindingOrAssignmentElemAssignsToName(node, initer.escapedText)) || bindingOrAssignmentElemContainsNonLiteralComputedName(node))) {
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
    variable.setRange(location);
    qf.calc.aggregate(variable);
    declarations.push(variable);
  }
  return declarations;
  function emitExpression(value: qt.Expression) {
    pendingExpressions = append(pendingExpressions, value);
  }
  function emitBindingOrAssignment(target: qt.BindingOrAssignmentElemTarget, value: qt.Expression, location: TextRange | undefined, original: Node | undefined) {
    qf.assert.node(target, isBindingName);
    if (pendingExpressions) {
      value = inlineExpressions(append(pendingExpressions, value));
      pendingExpressions = undefined;
    }
    pendingDeclarations.push({ pendingExpressions, name: target, value, location, original });
  }
}
function flattenBindingOrAssignmentElem(flattenContext: FlattenContext, elem: qt.BindingOrAssignmentElem, value: qt.Expression | undefined, location: TextRange, skipIniter?: boolean) {
  if (!skipIniter) {
    const initer = visitNode(getIniterOfBindingOrAssignmentElem(elem), flattenContext.visitor, isExpression);
    if (initer) {
      value = value ? createDefaultValueCheck(flattenContext, value, initer, location) : initer;
    } else if (!value) {
      value = qc.VoidExpression.zero();
    }
  }
  const bindingTarget = getTargetOfBindingOrAssignmentElem(elem)!;
  if (qf.is.objectBindingOrAssignmentPattern(bindingTarget)) {
    flattenObjectBindingOrAssignmentPattern(flattenContext, elem, bindingTarget, value!, location);
  } else if (qf.is.arrayBindingOrAssignmentPattern(bindingTarget)) {
    flattenArrayBindingOrAssignmentPattern(flattenContext, elem, bindingTarget, value!, location);
  } else {
    flattenContext.emitBindingOrAssignment(bindingTarget, value!, location, elem);
  }
}
function flattenObjectBindingOrAssignmentPattern(
  flattenContext: FlattenContext,
  parent: qt.BindingOrAssignmentElem,
  pattern: qt.ObjectBindingOrAssignmentPattern,
  value: qt.Expression,
  location: TextRange
) {
  const elems = getElemsOfBindingOrAssignmentPattern(pattern);
  const numElems = elems.length;
  if (numElems !== 1) {
    const reuseIdentifierExpressions = !qf.is.declarationBindingElem(parent) || numElems !== 0;
    value = ensureIdentifier(flattenContext, value, reuseIdentifierExpressions, location);
  }
  let bindingElems: qt.BindingOrAssignmentElem[] | undefined;
  let computedTempVariables: qt.Expression[] | undefined;
  for (let i = 0; i < numElems; i++) {
    const elem = elems[i];
    if (!getRestIndicatorOfBindingOrAssignmentElem(elem)) {
      const propertyName = getPropertyNameOfBindingOrAssignmentElem(elem)!;
      if (
        flattenContext.level >= FlattenLevel.ObjectRest &&
        !(elem.trafoFlags & (TrafoFlags.ContainsRestOrSpread | TrafoFlags.ContainsObjectRestOrSpread)) &&
        !(getTargetOfBindingOrAssignmentElem(elem)!.trafoFlags & (TrafoFlags.ContainsRestOrSpread | TrafoFlags.ContainsObjectRestOrSpread)) &&
        !qf.is.kind(qc.ComputedPropertyName, propertyName)
      ) {
        bindingElems = append(bindingElems, visitNode(elem, flattenContext.visitor));
      } else {
        if (bindingElems) {
          flattenContext.emitBindingOrAssignment(flattenContext.createObjectBindingOrAssignmentPattern(bindingElems), value, location, pattern);
          bindingElems = undefined;
        }
        const rhsValue = createDestructuringPropertyAccess(flattenContext, value, propertyName);
        if (qf.is.kind(qc.ComputedPropertyName, propertyName)) {
          computedTempVariables = append<qt.Expression>(computedTempVariables, (rhsValue as qt.ElemAccessExpression).argExpression);
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
function flattenArrayBindingOrAssignmentPattern(
  flattenContext: FlattenContext,
  parent: qt.BindingOrAssignmentElem,
  pattern: qt.ArrayBindingOrAssignmentPattern,
  value: qt.Expression,
  location: TextRange
) {
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
    const reuseIdentifierExpressions = !qf.is.declarationBindingElem(parent) || numElems !== 0;
    value = ensureIdentifier(flattenContext, value, reuseIdentifierExpressions, location);
  }
  let bindingElems: qt.BindingOrAssignmentElem[] | undefined;
  let restContainingElems: [Identifier, qt.BindingOrAssignmentElem][] | undefined;
  for (let i = 0; i < numElems; i++) {
    const elem = elems[i];
    if (flattenContext.level >= FlattenLevel.ObjectRest) {
      if (elem.trafoFlags & TrafoFlags.ContainsObjectRestOrSpread) {
        const temp = createTempVariable(undefined);
        if (flattenContext.hoistTempVariables) {
          flattenContext.context.hoistVariableDeclaration(temp);
        }
        restContainingElems = append(restContainingElems, <[Identifier, qt.BindingOrAssignmentElem]>[temp, elem]);
        bindingElems = append(bindingElems, flattenContext.createArrayBindingOrAssignmentElem(temp));
      } else {
        bindingElems = append(bindingElems, elem);
      }
    } else if (qf.is.kind(qc.OmittedExpression, elem)) {
      continue;
    } else if (!getRestIndicatorOfBindingOrAssignmentElem(elem)) {
      const rhsValue = new qc.ElemAccessExpression(value, i);
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
function createDefaultValueCheck(flattenContext: FlattenContext, value: qt.Expression, defaultValue: qt.Expression, location: TextRange): qt.Expression {
  value = ensureIdentifier(flattenContext, value, true, location);
  return new qc.ConditionalExpression(createTypeCheck(value, 'undefined'), defaultValue, value);
}
function createDestructuringPropertyAccess(flattenContext: FlattenContext, value: qt.Expression, propertyName: qt.PropertyName): qt.LeftExpression {
  if (qf.is.kind(qc.ComputedPropertyName, propertyName)) {
    const argExpression = ensureIdentifier(flattenContext, visitNode(propertyName.expression, flattenContext.visitor), propertyName);
    return new qc.ElemAccessExpression(value, argExpression);
  } else if (qf.is.stringOrNumericLiteralLike(propertyName)) {
    const argExpression = getSynthesizedClone(propertyName);
    argExpression.text = argExpression.text;
    return new qc.ElemAccessExpression(value, argExpression);
  } else {
    const name = new qc.Identifier(idText(propertyName));
    return new qc.PropertyAccessExpression(value, name);
  }
}
function ensureIdentifier(flattenContext: FlattenContext, value: qt.Expression, reuseIdentifierExpressions: boolean, location: TextRange) {
  if (qf.is.kind(qc.Identifier, value) && reuseIdentifierExpressions) return value;
  else {
    const temp = createTempVariable(undefined);
    if (flattenContext.hoistTempVariables) {
      flattenContext.context.hoistVariableDeclaration(temp);
      flattenContext.emitExpression(qf.create.assignment(temp, value).setRange(location));
    } else {
      flattenContext.emitBindingOrAssignment(temp, value, location, undefined);
    }
    return temp;
  }
}
function makeArrayBindingPattern(elems: qt.BindingOrAssignmentElem[]) {
  qf.assert.eachNode(elems, isArrayBindingElem);
  return new qc.ArrayBindingPattern(<qt.ArrayBindingElem[]>elems);
}
function makeArrayAssignmentPattern(elems: qt.BindingOrAssignmentElem[]) {
  return new qc.ArrayLiteralExpression(map(elems, convertToArrayAssignmentElem));
}
function makeObjectBindingPattern(elems: qt.BindingOrAssignmentElem[]) {
  qf.assert.eachNode(elems, qt.BindingElem.kind);
  return qt.ObjectBindingPattern.create(<qt.BindingElem[]>elems);
}
function makeObjectAssignmentPattern(elems: qt.BindingOrAssignmentElem[]) {
  return new qc.ObjectLiteralExpression(map(elems, convertToObjectAssignmentElem));
}
function makeBindingElem(name: qt.Identifier) {
  return new qc.BindingElem(undefined, name);
}
function makeAssignmentElem(name: qt.Identifier) {
  return name;
}
export const restHelper: qt.UnscopedEmitHelper = {
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
  context: qt.TrafoContext,
  value: qt.Expression,
  elems: readonly qt.BindingOrAssignmentElem[],
  computedTempVariables: readonly qt.Expression[],
  location: TextRange
): qt.Expression {
  context.requestEmitHelper(restHelper);
  const propertyNames: qt.Expression[] = [];
  let computedTempVariableOffset = 0;
  for (let i = 0; i < elems.length - 1; i++) {
    const propertyName = getPropertyNameOfBindingOrAssignmentElem(elems[i]);
    if (propertyName) {
      if (qf.is.kind(qc.ComputedPropertyName, propertyName)) {
        const temp = computedTempVariables[computedTempVariableOffset];
        computedTempVariableOffset++;
        propertyNames.push(new qc.ConditionalExpression(createTypeCheck(temp, 'symbol'), temp, qf.create.add(temp, qc.asLiteral(''))));
      } else {
        propertyNames.push(qc.asLiteral(propertyName));
      }
    }
  }
  return new qc.CallExpression(getUnscopedHelperName('__rest'), undefined, [value, new qc.ArrayLiteralExpression(propertyNames).setRange(location)]);
}
