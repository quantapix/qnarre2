import * as qb from './bases';
import * as qc from './classes';
import { qf } from './frame';
import { Node, SymbolFlags } from '../type';
import * as qt from '../type';
import * as qu from '../util';
import { Syntax } from '../syntax';
export { MutableNodes, Nodes, Signature, Symbol, SymbolTable, Type } from './bases';
export * from './classes';
export { qf, Fcreate, Feach, Frame, Fget, Fhas, Fis, newFrame } from './frame';
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
    qu.assert(!!propertyName || e.kind === Syntax.SpreadAssignment);
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
        qf.assert.node(e.name, isIdentifier);
        return new qc.SpreadElem(e.name).setRange(e).setOriginal(e);
      }
      const e2 = convertToAssignmentElemTarget(e.name);
      return e.initer ? qf.create.assignment(e2, e.initer).setRange(e).setOriginal(e) : e2;
    }
    qf.assert.node(e, isExpression);
    return <qt.Expression>e;
  }
  export function convertToObjectAssignmentElem(e: qt.BindingOrAssignmentElem) {
    if (e.kind === Syntax.BindingElem) {
      if (e.dot3Token) {
        qf.assert.node(e.name, isIdentifier);
        return new qc.SpreadAssignment(e.name).setRange(e).setOriginal(e);
      }
      if (e.propertyName) {
        const e2 = convertToAssignmentElemTarget(e.name);
        return new qc.PropertyAssignment(e.propertyName, e.initer ? qf.create.assignment(e2, e.initer) : e2).setRange(e).setOriginal(e);
      }
      qf.assert.node(e.name, isIdentifier);
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
export function cloneMap(m: qb.SymbolTable): qb.SymbolTable;
export function cloneMap<T>(m: qu.QReadonlyMap<T>): qu.QMap<T>;
export function cloneMap<T>(m: qu.ReadonlyEscapedMap<T>): qu.EscapedMap<T>;
export function cloneMap<T>(m: qu.QReadonlyMap<T> | qu.ReadonlyEscapedMap<T> | qb.SymbolTable): qu.QMap<T> | qu.EscapedMap<T> | qb.SymbolTable {
  const c = new qu.QMap<T>();
  qu.copyEntries(m as qu.QMap<T>, c);
  return c;
}
export function findAncestor<T extends Node>(n: Node | undefined, cb: (n: Node) => n is T): T | undefined;
export function findAncestor(n: Node | undefined, cb: (n: Node) => boolean | 'quit'): Node | undefined;
export function findAncestor(n: Node | undefined, cb: (n: Node) => boolean | 'quit'): Node | undefined {
  while (n) {
    const r = cb(n);
    if (r === 'quit') return;
    if (r) return n;
    n = n.parent;
  }
  return;
}
export function getExcluded(f: SymbolFlags): SymbolFlags {
  let r: SymbolFlags = 0;
  if (f & SymbolFlags.Alias) r |= SymbolFlags.AliasExcludes;
  if (f & SymbolFlags.BlockScopedVariable) r |= SymbolFlags.BlockScopedVariableExcludes;
  if (f & SymbolFlags.Class) r |= SymbolFlags.ClassExcludes;
  if (f & SymbolFlags.ConstEnum) r |= SymbolFlags.ConstEnumExcludes;
  if (f & SymbolFlags.EnumMember) r |= SymbolFlags.EnumMemberExcludes;
  if (f & SymbolFlags.Function) r |= SymbolFlags.FunctionExcludes;
  if (f & SymbolFlags.FunctionScopedVariable) r |= SymbolFlags.FunctionScopedVariableExcludes;
  if (f & SymbolFlags.GetAccessor) r |= SymbolFlags.GetAccessorExcludes;
  if (f & SymbolFlags.Interface) r |= SymbolFlags.InterfaceExcludes;
  if (f & SymbolFlags.Method) r |= SymbolFlags.MethodExcludes;
  if (f & SymbolFlags.Property) r |= SymbolFlags.PropertyExcludes;
  if (f & SymbolFlags.RegularEnum) r |= SymbolFlags.RegularEnumExcludes;
  if (f & SymbolFlags.SetAccessor) r |= SymbolFlags.SetAccessorExcludes;
  if (f & SymbolFlags.TypeAlias) r |= SymbolFlags.TypeAliasExcludes;
  if (f & SymbolFlags.TypeParam) r |= SymbolFlags.TypeParamExcludes;
  if (f & SymbolFlags.ValueModule) r |= SymbolFlags.ValueModuleExcludes;
  return r;
}
