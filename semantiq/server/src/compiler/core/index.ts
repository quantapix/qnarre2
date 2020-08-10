import * as qb from './base';
import { NodeType } from './classes';
import * as qc from './classes';
import * as qd from '../diagnostic';
import { qf } from './frame';
import { EmitFlags, Modifier, ModifierFlags, Node, NodeFlags, Nodes, TokenFlags } from '../type';
import * as qt from '../type';
import * as qu from '../util';
import { Syntax } from '../syntax';
export { assert, findAncestor, format, skip, MutableNodes, Nodes, Symbol, SymbolTable } from './base';
export * from './classes';
export { qf, Fcreate, Feach, Frame, Fget, Fhas, Fis, newFrame } from './frame';
export namespace BindingOrAssignmentElem {
  export function getIniterOfBindingOrAssignmentElem(e: qc.BindingOrAssignmentElem): qc.Expression | undefined {
    if (qf.is.declarationBindingElem(e)) {
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
    if (qf.is.kind(qc.SpreadElem, e)) return getIniterOfBindingOrAssignmentElem(<qc.BindingOrAssignmentElem>e.expression);
    return;
  }
  export function getTargetOfBindingOrAssignmentElem(e: qc.BindingOrAssignmentElem): qc.BindingOrAssignmentElemTarget | undefined {
    if (qf.is.declarationBindingElem(e)) {
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
    if (qf.is.objectLiteralElemLike(e)) {
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
          return getTargetOfBindingOrAssignmentElem(<qc.BindingOrAssignmentElem>e.initer);
        case Syntax.ShorthandPropertyAssignment:
          // `a` in `({ a } = ...)`
          // `a` in `({ a = 1 } = ...)`
          return e.name;
        case Syntax.SpreadAssignment:
          // `a` in `({ ...a } = ...)`
          return getTargetOfBindingOrAssignmentElem(<qc.BindingOrAssignmentElem>e.expression);
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
      return getTargetOfBindingOrAssignmentElem(<qc.BindingOrAssignmentElem>e.left);
    }
    if (qf.is.kind(qc.SpreadElem, e)) {
      // `a` in `[...a] = ...`
      return getTargetOfBindingOrAssignmentElem(<qc.BindingOrAssignmentElem>e.expression);
    }
    // `a` in `[a] = ...`
    // `{a}` in `[{a}] = ...`
    // `[a]` in `[[a]] = ...`
    // `a.b` in `[a.b] = ...`
    // `a[0]` in `[a[0]] = ...`
    return e;
  }
  export function getRestIndicatorOfBindingOrAssignmentElem(e: qc.BindingOrAssignmentElem): qc.BindingOrAssignmentElemRestIndicator | undefined {
    switch (e.kind) {
      case Syntax.Param:
      case Syntax.BindingElem:
        // `...` in `let [...a] = ...`
        return e.dot3Token;
      case Syntax.SpreadElem:
      case Syntax.SpreadAssignment:
        // `...` in `[...a] = ...`
        return e;
    }
    return;
  }
  export function getPropertyNameOfBindingOrAssignmentElem(e: qc.BindingOrAssignmentElem): Exclude<qc.PropertyName, qt.PrivateIdentifier> | undefined {
    const propertyName = tryGetPropertyNameOfBindingOrAssignmentElem(e);
    qu.assert(!!propertyName || qf.is.kind(qc.SpreadAssignment, e));
    return propertyName;
  }
  export function tryGetPropertyNameOfBindingOrAssignmentElem(e: qc.BindingOrAssignmentElem): Exclude<qc.PropertyName, qt.PrivateIdentifier> | undefined {
    switch (e.kind) {
      case Syntax.BindingElem:
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
    const target = getTargetOfBindingOrAssignmentElem(e);
    if (target && qf.is.propertyName(target)) return target;
    return;
  }
  export function convertToArrayAssignmentElem(e: qc.BindingOrAssignmentElem) {
    if (qf.is.kind(qc.BindingElem, e)) {
      if (e.dot3Token) {
        qc.assert.node(e.name, isIdentifier);
        return new qc.SpreadElem(e.name).setRange(e).setOriginal(e);
      }
      const e2 = convertToAssignmentElemTarget(e.name);
      return e.initer ? qf.create.assignment(e2, e.initer).setRange(e).setOriginal(e) : e2;
    }
    qc.assert.node(e, isExpression);
    return <qc.Expression>e;
  }
  export function convertToObjectAssignmentElem(e: qc.BindingOrAssignmentElem) {
    if (qf.is.kind(qc.BindingElem, e)) {
      if (e.dot3Token) {
        qc.assert.node(e.name, isIdentifier);
        return new qc.SpreadAssignment(e.name).setRange(e).setOriginal(e);
      }
      if (e.propertyName) {
        const e2 = convertToAssignmentElemTarget(e.name);
        return new qc.PropertyAssignment(e.propertyName, e.initer ? qf.create.assignment(e2, e.initer) : e2).setRange(e).setOriginal(e);
      }
      qc.assert.node(e.name, isIdentifier);
      return new qc.ShorthandPropertyAssignment(e.name, e.initer).setRange(e).setOriginal(e);
    }
    qc.assert.node(e, isObjectLiteralElemLike);
    return <qc.ObjectLiteralElemLike>e;
  }
}
export namespace BindingOrAssignmentPattern {
  export function getElemsOfBindingOrAssignmentPattern(name: qc.BindingOrAssignmentPattern): readonly qc.BindingOrAssignmentElem[] {
    switch (name.kind) {
      case Syntax.ObjectBindingPattern:
      case Syntax.ArrayBindingPattern:
      case Syntax.ArrayLiteralExpression:
        // `a` in `{a}`
        // `a` in `[a]`
        return <readonly qc.BindingOrAssignmentElem[]>name.elems;
      case Syntax.ObjectLiteralExpression:
        // `a` in `{a}`
        return <readonly qc.BindingOrAssignmentElem[]>name.properties;
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
    if (qf.is.kind(qc.ObjectBindingPattern, n)) return new qc.ObjectLiteralExpression(qu.map(n.elems, convertToObjectAssignmentElem)).setOriginal(n).setRange(n);
    qc.assert.node(n, isObjectLiteralExpression);
    return n;
  }
  export function convertToArrayAssignmentPattern(n: qc.ArrayBindingOrAssignmentPattern) {
    if (qf.is.kind(qc.ArrayBindingPattern, n)) return new qc.ArrayLiteralExpression(qu.map(n.elems, convertToArrayAssignmentElem)).setOriginal(n).setRange(n);
    qc.assert.node(n, isArrayLiteralExpression);
    return n;
  }
  export function convertToAssignmentElemTarget(n: qc.BindingOrAssignmentElemTarget): qc.Expression {
    if (qf.is.kind(qc.BindingPattern, n)) return convertToAssignmentPattern(n);
    qc.assert.node(n, isExpression);
    return n;
  }
}
