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
export { qf } from './frame';
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
