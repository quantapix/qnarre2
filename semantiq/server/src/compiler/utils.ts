const MAX_SMI_X86 = 0x3fff_ffff;

export function asName<T extends Identifier | BindingName | PropertyName | EntityName | ThisTypeNode | undefined>(n: string | T): T | Identifier {
  return isString(n) ? new Identifier(n) : n;
}

export function asExpression<T extends Expression | undefined>(e: string | number | boolean | T): T | StringLiteral | NumericLiteral | BooleanLiteral {
  return typeof e === 'string' ? StringLiteral.create(e) : typeof e === 'number' ? NumericLiteral.create('' + e) : typeof e === 'boolean' ? (e ? createTrue() : createFalse()) : e;
}

export function asToken<TKind extends Syntax>(t: TKind | Token<TKind>): Token<TKind> {
  return typeof t === 'number' ? new Token(t) : t;
}

export function asEmbeddedStatement<T extends Node>(s: T): T | EmptyStatement;
export function asEmbeddedStatement<T extends Node>(s: T | undefined): T | EmptyStatement | undefined;
export function asEmbeddedStatement<T extends Node>(s: T | undefined): T | EmptyStatement | undefined {
  return s && Node.is.kind(NotEmittedStatement, s) ? setRange(setOriginalNode(createEmptyStatement(), statement), statement) : statement;
}

function createMethodCall(object: Expression, methodName: string | Identifier, argumentsList: readonly Expression[]) {
  return createCall(createPropertyAccess(object, asName(methodName)), /*typeArguments*/ undefined, argumentsList);
}

function createGlobalMethodCall(globalObjectName: string, methodName: string, argumentsList: readonly Expression[]) {
  return createMethodCall(new Identifier(globalObjectName), methodName, argumentsList);
}

export function createObjectDefinePropertyCall(target: Expression, propertyName: string | Expression, attributes: Expression) {
  return createGlobalMethodCall('Object', 'defineProperty', [target, asExpression(propertyName), attributes]);
}

function tryAddPropertyAssignment(ps: Push<PropertyAssignment>, p: string, e?: Expression) {
  if (e) {
    ps.push(createPropertyAssignment(p, e));
    return true;
  }
  return false;
}

export function createPropertyDescriptor(attributes: PropertyDescriptorAttributes, singleLine?: boolean) {
  const ps: PropertyAssignment[] = [];
  tryAddPropertyAssignment(ps, 'enumerable', asExpression(attributes.enumerable));
  tryAddPropertyAssignment(ps, 'configurable', asExpression(attributes.configurable));
  let isData = tryAddPropertyAssignment(ps, 'writable', asExpression(attributes.writable));
  isData = tryAddPropertyAssignment(ps, 'value', attributes.value) || isData;
  let isAccessor = tryAddPropertyAssignment(ps, 'get', attributes.get);
  isAccessor = tryAddPropertyAssignment(ps, 'set', attributes.set) || isAccessor;
  assert(!(isData && isAccessor), 'A PropertyDescriptor may not be both an accessor descriptor and a data descriptor.');
  return createObjectLiteral(ps, !singleLine);
}
