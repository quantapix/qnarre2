import { Node, Nodes } from '../types';
import { qf } from './frame';
import { Syntax } from '../syntax';
import * as qb from './bases';
import * as qc from './classes';
import * as qt from '../types';
import * as qu from '../utils';
export { cloneMap, findAncestor } from './bases';
export { Fsign, Fsymb, Ftype, newSign, newSymb, newType } from './groups';
export { MutableNodes, Nodes, Signature, Symbol, SymbolTable, Type } from './bases';
export { qf, Fmake, Feach, Frame, Fget, Fhas, Fis, Fskip, newFrame, newIs, newHas } from './frame';
export * from './classes';
export function convertToFunctionBody(n: qt.ConciseBody, multiLine?: boolean) {
  return n.kind === Syntax.Block ? (n as qc.Block) : new qc.Block([new qc.ReturnStatement(n).setRange(n)], multiLine).setRange(n);
}
export function liftToBlock(ns?: readonly Node[]): qt.Statement {
  qf.assert.true(qu.every(ns, qf.is.statement));
  return (qu.singleOrUndefined(ns) as qt.Statement) || new qc.Block(ns as qt.Statement[]);
}
export function mergeLexicalEnv(ss: Nodes<qt.Statement>, ds?: readonly qt.Statement[]): Nodes<qt.Statement>;
export function mergeLexicalEnv(ss: qt.Statement[], ds?: readonly qt.Statement[]): qt.Statement[];
export function mergeLexicalEnv(ss: qt.Statement[] | Nodes<qt.Statement>, ds?: readonly qt.Statement[]) {
  if (!qu.some(ds)) return ss;
  const findEnd = <T>(ts: readonly T[], cb: (v: T) => boolean, start: number) => {
    let i = start;
    while (i < ts.length && cb(ts[i])) {
      i++;
    }
    return i;
  };
  const ls = findEnd(ss, qf.is.prologueDirective, 0);
  const lf = findEnd(ss, qf.stmt.is.hoistedFunction, ls);
  const lv = findEnd(ss, qf.stmt.is.hoistedVariableStatement, lf);
  const rs = findEnd(ds, qf.is.prologueDirective, 0);
  const rf = findEnd(ds, qf.stmt.is.hoistedFunction, rs);
  const rv = findEnd(ds, qf.stmt.is.hoistedVariableStatement, rf);
  const rc = findEnd(ds, qf.stmt.is.customPrologue, rv);
  qf.assert.true(rc === ds.length);
  const left = qb.Nodes.is(ss) ? ss.slice() : ss;
  if (rc > rv) left.splice(lv, 0, ...ds.slice(rv, rc));
  if (rv > rf) left.splice(lf, 0, ...ds.slice(rf, rv));
  if (rf > rs) left.splice(ls, 0, ...ds.slice(rs, rf));
  if (rs > 0) {
    if (ls === 0) left.splice(0, 0, ...ds.slice(0, rs));
    else {
      const m = qu.createMap<boolean>();
      for (let i = 0; i < ls; i++) {
        const p = ss[i] as qt.PrologueDirective;
        m.set(p.expression.text, true);
      }
      for (let i = rs - 1; i >= 0; i--) {
        const p = ds[i] as qt.PrologueDirective;
        if (!m.has(p.expression.text)) left.unshift(p);
      }
    }
  }
  if (qb.Nodes.is(ss)) return new qb.Nodes(left, ss.trailingComma).setRange(ss);
  return ss;
}
export namespace BindingOrAssignmentElem {
  export function getIniterOfBindingOrAssignmentElem(e: qt.BindingOrAssignmentElem): qt.Expression | undefined {
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
    if (e.kind === Syntax.PropertyAssignment) {
      // `1` in `({ a: b = 1 } = ...)`
      // `1` in `({ a: {b} = 1 } = ...)`
      // `1` in `({ a: [b] = 1 } = ...)`
      const i = e.initer;
      return qf.is.assignmentExpression(i, true) ? i.right : undefined;
    }
    if (e.kind === Syntax.ShorthandPropertyAssignment) {
      // `1` in `({ a = 1 } = ...)`
      return e.objectAssignmentIniter;
    }
    if (qf.is.assignmentExpression(e, true)) {
      // `1` in `[a = 1] = ...`
      // `1` in `[{a} = 1] = ...`
      // `1` in `[[a] = 1] = ...`
      return e.right;
    }
    if (e.kind === Syntax.SpreadElem) return getIniterOfBindingOrAssignmentElem(<qt.BindingOrAssignmentElem>e.expression);
    return;
  }
  export function getTargetOfBindingOrAssignmentElem(e: qt.BindingOrAssignmentElem): qt.BindingOrAssignmentElemTarget | undefined {
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
          return getTargetOfBindingOrAssignmentElem(<qt.BindingOrAssignmentElem>e.initer);
        case Syntax.ShorthandPropertyAssignment:
          // `a` in `({ a } = ...)`
          // `a` in `({ a = 1 } = ...)`
          return e.name;
        case Syntax.SpreadAssignment:
          // `a` in `({ ...a } = ...)`
          return getTargetOfBindingOrAssignmentElem(<qt.BindingOrAssignmentElem>e.expression);
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
      return getTargetOfBindingOrAssignmentElem(<qt.BindingOrAssignmentElem>e.left);
    }
    if (e.kind === Syntax.SpreadElem) {
      // `a` in `[...a] = ...`
      return getTargetOfBindingOrAssignmentElem(<qt.BindingOrAssignmentElem>e.expression);
    }
    // `a` in `[a] = ...`
    // `{a}` in `[{a}] = ...`
    // `[a]` in `[[a]] = ...`
    // `a.b` in `[a.b] = ...`
    // `a[0]` in `[a[0]] = ...`
    return e;
  }
  export function getRestIndicatorOfBindingOrAssignmentElem(e: qt.BindingOrAssignmentElem): qt.BindingOrAssignmentElemRestIndicator | undefined {
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
  export function getPropertyNameOfBindingOrAssignmentElem(e: qt.BindingOrAssignmentElem): Exclude<qc.PropertyName, qt.PrivateIdentifier> | undefined {
    const propertyName = tryGetPropertyNameOfBindingOrAssignmentElem(e);
    qf.assert.true(!!propertyName || e.kind === Syntax.SpreadAssignment);
    return propertyName;
  }
  export function tryGetPropertyNameOfBindingOrAssignmentElem(e: qt.BindingOrAssignmentElem): Exclude<qc.PropertyName, qt.PrivateIdentifier> | undefined {
    switch (e.kind) {
      case Syntax.BindingElem:
        // `a` in `let { a: b } = ...`
        // `[a]` in `let { [a]: b } = ...`
        // `"a"` in `let { "a": b } = ...`
        // `1` in `let { 1: b } = ...`
        if (e.propertyName) {
          const propertyName = e.propertyName;
          if (propertyName.kind === Syntax.PrivateIdentifier) return qb.failBadSyntax(propertyName);
          return propertyName.kind === Syntax.ComputedPropertyName && qf.is.stringOrNumericLiteral(propertyName.expression) ? propertyName.expression : propertyName;
        }
        break;
      case Syntax.PropertyAssignment:
        // `a` in `({ a: b } = ...)`
        // `[a]` in `({ [a]: b } = ...)`
        // `"a"` in `({ "a": b } = ...)`
        // `1` in `({ 1: b } = ...)`
        if (e.name) {
          const propertyName = e.name;
          if (propertyName.kind === Syntax.PrivateIdentifier) return qb.failBadSyntax(propertyName);
          return propertyName.kind === Syntax.ComputedPropertyName && qf.is.stringOrNumericLiteral(propertyName.expression) ? propertyName.expression : propertyName;
        }
        break;
      case Syntax.SpreadAssignment:
        // `a` in `({ ...a } = ...)`
        if (e.name && e.name.kind === Syntax.PrivateIdentifier) return qb.failBadSyntax(e.name);
        return e.name;
    }
    const target = getTargetOfBindingOrAssignmentElem(e);
    if (target && qf.is.propertyName(target)) return target;
    return;
  }
  export function convertToArrayAssignmentElem(e: qt.BindingOrAssignmentElem) {
    if (e.kind === Syntax.BindingElem) {
      if (e.dot3Token) {
        qf.assert.node(e.name, qf.is.identifier);
        return new qc.SpreadElem(e.name).setRange(e).setOriginal(e);
      }
      const e2 = convertToAssignmentElemTarget(e.name);
      return e.initer ? qf.make.assignment(e2, e.initer).setRange(e).setOriginal(e) : e2;
    }
    qf.assert.node(e, isExpression);
    return <qt.Expression>e;
  }
  export function convertToObjectAssignmentElem(e: qt.BindingOrAssignmentElem) {
    if (e.kind === Syntax.BindingElem) {
      if (e.dot3Token) {
        qf.assert.node(e.name, qf.is.identifier);
        return new qc.SpreadAssignment(e.name).setRange(e).setOriginal(e);
      }
      if (e.propertyName) {
        const e2 = convertToAssignmentElemTarget(e.name);
        return new qc.PropertyAssignment(e.propertyName, e.initer ? qf.make.assignment(e2, e.initer) : e2).setRange(e).setOriginal(e);
      }
      qf.assert.node(e.name, qf.is.identifier);
      return new qc.ShorthandPropertyAssignment(e.name, e.initer).setRange(e).setOriginal(e);
    }
    qf.assert.node(e, isObjectLiteralElemLike);
    return <qt.ObjectLiteralElemLike>e;
  }
}
export namespace BindingOrAssignmentPattern {
  export function getElemsOfBindingOrAssignmentPattern(name: qt.BindingOrAssignmentPattern): readonly qt.BindingOrAssignmentElem[] {
    switch (name.kind) {
      case Syntax.ObjectBindingPattern:
      case Syntax.ArrayBindingPattern:
      case Syntax.ArrayLiteralExpression:
        // `a` in `{a}`
        // `a` in `[a]`
        return <readonly qt.BindingOrAssignmentElem[]>name.elems;
      case Syntax.ObjectLiteralExpression:
        // `a` in `{a}`
        return <readonly qt.BindingOrAssignmentElem[]>name.properties;
    }
  }
  export function convertToAssignmentPattern(n: qt.BindingOrAssignmentPattern): qt.AssignmentPattern {
    switch (n.kind) {
      case Syntax.ArrayBindingPattern:
      case Syntax.ArrayLiteralExpression:
        return convertToArrayAssignmentPattern(n);
      case Syntax.ObjectBindingPattern:
      case Syntax.ObjectLiteralExpression:
        return convertToObjectAssignmentPattern(n);
    }
  }
  export function convertToObjectAssignmentPattern(n: qt.ObjectBindingOrAssignmentPattern) {
    if (n.kind === Syntax.ObjectBindingPattern) return new qc.ObjectLiteralExpression(qu.map(n.elems, convertToObjectAssignmentElem)).setOriginal(n).setRange(n);
    qf.assert.node(n, isObjectLiteralExpression);
    return n;
  }
  export function convertToArrayAssignmentPattern(n: qt.ArrayBindingOrAssignmentPattern) {
    if (n.kind === Syntax.ArrayBindingPattern) return new qc.ArrayLiteralExpression(qu.map(n.elems, convertToArrayAssignmentElem)).setOriginal(n).setRange(n);
    qf.assert.node(n, isArrayLiteralExpression);
    return n;
  }
  export function convertToAssignmentElemTarget(n: qt.BindingOrAssignmentElemTarget): qt.Expression {
    if (n.kind === Syntax.BindingPattern) return convertToAssignmentPattern(n);
    qf.assert.node(n, isExpression);
    return n;
  }
}
