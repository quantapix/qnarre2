import * as qb from './base';
import { Node, NodeFlags, Nodes, Type } from './core';
import * as qc from './core';
import * as qg from './debug';
import { Modifier, Syntax } from './syntax';
import * as qy from './syntax';
import * as qu from './utils';
export * from './core';
// prettier-ignore
export type NodeTypes = | ArrayBindingPattern | ArrayLiteralExpression | ArrayTypeNode | AsExpression | AwaitExpression | BinaryExpression | BindingElement | BindingPattern | Block | BreakOrContinueStatement | CallExpression | CaseBlock | CaseClause | CatchClause | ClassLikeDeclaration | CommaListExpression | ComputedPropertyName | ConditionalExpression | ConditionalTypeNode | Decorator | DefaultClause | DeleteExpression | DeleteExpression | DoStatement | ElementAccessExpression | EnumDeclaration | EnumMember | ExportAssignment | ExportDeclaration | ExpressionStatement | ExpressionWithTypeArguments | ExternalModuleReference | ForInStatement | ForOfStatement | ForStatement | FunctionLikeDeclaration | HeritageClause | Identifier | IfStatement | ImportClause | ImportDeclaration | ImportEqualsDeclaration | ImportOrExportSpecifier | ImportTypeNode | IndexedAccessTypeNode | InferTypeNode | InterfaceDeclaration | JSDoc | JSDocAugmentsTag | JSDocAuthorTag | JSDocFunctionType | JSDocImplementsTag | JSDocSignature | JSDocTemplateTag | JSDocTypedefTag | JSDocTypeExpression | JSDocTypeLiteral | JSDocTypeReferencingNode | JsxAttribute | JsxAttributes | JsxClosingElement | JsxElement | JsxExpression | JsxFragment | JsxOpeningLikeElement | JsxSpreadAttribute | LabeledStatement | LiteralTypeNode | MappedTypeNode | MetaProperty | MissingDeclaration | ModuleDeclaration | NamedImportsOrExports | NamedTupleMember | NamespaceExport | NamespaceExportDeclaration | NamespaceImport | NonNullExpression | ObjectLiteralExpression | OptionalTypeNode | ParameterDeclaration | ParenthesizedExpression | ParenthesizedTypeNode | PartiallyEmittedExpression | PostfixUnaryExpression | PrefixUnaryExpression | PropertyAccessExpression | PropertyAssignment | PropertyDeclaration | PropertySignature | QualifiedName | RestTypeNode | ReturnStatement | ShorthandPropertyAssignment | SignatureDeclaration | SourceFile | SpreadAssignment | SpreadElement | SwitchStatement | TaggedTemplateExpression | TemplateExpression | TemplateSpan | ThrowStatement | TryStatement | TupleTypeNode | TypeAliasDeclaration | TypeAssertion | TypeLiteralNode | TypeOfExpression | TypeOperatorNode | TypeParameterDeclaration | TypePredicateNode | TypeQueryNode | TypeReferenceNode | UnionOrIntersectionTypeNode | VariableDeclaration | VariableDeclarationList | VariableStatement | VoidExpression | WhileStatement | WithStatement | YieldExpression;
///
export namespace ArrayBindingElement {
  export const also = [Syntax.BindingElement, Syntax.OmittedExpression];
}
export class ArrayBindingPattern extends Node implements qc.ArrayBindingPattern {
  static readonly kind = Syntax.ArrayBindingPattern;
  parent: VariableDeclaration | ParameterDeclaration | BindingElement;
  elements: Nodes<qc.ArrayBindingElement>;
  constructor(es: readonly qc.ArrayBindingElement[]) {
    super(true);
    this.elements = new Nodes(es);
  }
  update(es: readonly qc.ArrayBindingElement[]) {
    return this.elements !== es ? new ArrayBindingPattern(es).updateFrom(this) : this;
  }
}
ArrayBindingPattern.prototype.kind = ArrayBindingPattern.kind;
export class ArrayLiteralExpression extends qc.PrimaryExpression implements qc.ArrayLiteralExpression {
  static readonly kind = Syntax.ArrayLiteralExpression;
  elements: Nodes<qc.Expression>;
  multiLine?: boolean;
  constructor(es?: readonly qc.Expression[], multiLine?: boolean) {
    super(true);
    this.elements = parenthesize.listElements(new Nodes(es));
    if (multiLine) this.multiLine = true;
  }
  update(es: readonly qc.Expression[]) {
    return this.elements !== es ? new ArrayLiteralExpression(es, this.multiLine).updateFrom(this) : this;
  }
}
ArrayLiteralExpression.prototype.kind = ArrayLiteralExpression.kind;
export class ArrayTypeNode extends qc.TypeNode implements qc.ArrayTypeNode {
  static readonly kind = Syntax.ArrayType;
  elementType: qc.TypeNode;
  constructor(t: qc.TypeNode) {
    super(true);
    this.elementType = parenthesize.arrayTypeMember(t);
  }
  update(t: qc.TypeNode) {
    return this.elementType !== t ? new ArrayTypeNode(t).updateFrom(this) : this;
  }
}
ArrayTypeNode.prototype.kind = ArrayTypeNode.kind;
export class ArrowFunction extends qc.FunctionLikeDeclarationBase implements qc.ArrowFunction {
  static readonly kind = Syntax.ArrowFunction;
  equalsGreaterThanToken: qc.EqualsGreaterThanToken;
  body: qc.ConciseBody;
  name: never;
  constructor(
    ms: readonly Modifier[] | undefined,
    ts: readonly TypeParameterDeclaration[] | undefined,
    ps: readonly ParameterDeclaration[],
    t: qc.TypeNode | undefined,
    a: qc.EqualsGreaterThanToken | undefined,
    b: qc.ConciseBody
  ) {
    super(true);
    this.modifiers = Nodes.from(ms);
    this.typeParameters = Nodes.from(ts);
    this.parameters = new Nodes(ps);
    this.type = t;
    this.equalsGreaterThanToken = a || new qc.Token(Syntax.EqualsGreaterThanToken);
    this.body = parenthesize.conciseBody(b);
  }
  update(
    ms: readonly Modifier[] | undefined,
    ts: readonly TypeParameterDeclaration[] | undefined,
    ps: readonly ParameterDeclaration[],
    t: qc.TypeNode | undefined,
    a: qc.Token<Syntax.EqualsGreaterThanToken>,
    b: qc.ConciseBody
  ) {
    return this.modifiers !== ms || this.typeParameters !== ts || this.parameters !== ps || this.type !== t || this.equalsGreaterThanToken !== a || this.body !== b
      ? new ArrowFunction(ms, ts, ps, t, a, b).updateFrom(this)
      : this;
  }
  _expressionBrand: any;
}
ArrowFunction.prototype.kind = ArrowFunction.kind;
qb.addMixins(ArrowFunction, [qc.Expression, qc.JSDocContainer]);
export class AsExpression extends qc.Expression implements qc.AsExpression {
  static readonly kind = Syntax.AsExpression;
  expression: qc.Expression;
  type: qc.TypeNode;
  constructor(e: qc.Expression, t: qc.TypeNode) {
    super(true);
    this.expression = e;
    this.type = t;
  }
  update(e: qc.Expression, t: qc.TypeNode) {
    return this.expression !== e || this.type !== t ? new AsExpression(e, t).updateFrom(this) : this;
  }
}
AsExpression.prototype.kind = AsExpression.kind;
export namespace AssignmentPattern {
  export const kind = Syntax.ArrayLiteralExpression;
  export const also = [Syntax.ObjectLiteralExpression];
}
export class AwaitExpression extends qc.UnaryExpression implements qc.AwaitExpression {
  static readonly kind = Syntax.AwaitExpression;
  expression: qc.UnaryExpression;
  constructor(e: qc.Expression) {
    super(true);
    this.expression = parenthesize.prefixOperand(e);
  }
  update(e: qc.Expression) {
    return this.expression !== e ? new AwaitExpression(e).updateFrom(this) : this;
  }
}
AwaitExpression.prototype.kind = AwaitExpression.kind;
export class BigIntLiteral extends qc.LiteralExpression implements qc.BigIntLiteral {
  static readonly kind: Syntax.BigIntLiteral;
  constructor(public text: string) {
    super(true);
  }
  expression(e: qc.Expression) {
    return (
      e.kind === Syntax.BigIntLiteral ||
      (e.kind === Syntax.PrefixUnaryExpression && (e as PrefixUnaryExpression).operator === Syntax.MinusToken && (e as PrefixUnaryExpression).operand.kind === Syntax.BigIntLiteral)
    );
  }
}
BigIntLiteral.prototype.kind = BigIntLiteral.kind;
export class BinaryExpression extends qc.Expression implements qc.BinaryExpression {
  static readonly kind = Syntax.BinaryExpression;
  left: qc.Expression;
  operatorToken: qc.BinaryOperatorToken;
  right: qc.Expression;
  constructor(l: qc.Expression, o: qc.BinaryOperator | qc.BinaryOperatorToken, r: qc.Expression) {
    super();
    const t = asToken(o);
    const k = t.kind;
    this.left = parenthesize.binaryOperand(k, l, true, undefined);
    this.operatorToken = t;
    this.right = parenthesize.binaryOperand(k, r, false, this.left);
  }
  update(l: qc.Expression, r: qc.Expression, o: qc.BinaryOperator | qc.BinaryOperatorToken = this.operatorToken) {
    return this.left !== l || this.right !== r || this.operatorToken !== o ? new BinaryExpression(l, o, r).updateFrom(this) : this;
  }
  static createStrictEquality(left: qc.Expression, right: qc.Expression) {
    return new BinaryExpression(left, Syntax.Equals3Token, right);
  }
  static createStrictInequality(left: qc.Expression, right: qc.Expression) {
    return new BinaryExpression(left, Syntax.ExclamationEquals2Token, right);
  }
  static createAdd(left: qc.Expression, right: qc.Expression) {
    return new BinaryExpression(left, Syntax.PlusToken, right);
  }
  static createSubtract(left: qc.Expression, right: qc.Expression) {
    return new BinaryExpression(left, Syntax.MinusToken, right);
  }
  static createLogicalAnd(left: qc.Expression, right: qc.Expression) {
    return new BinaryExpression(left, Syntax.Ampersand2Token, right);
  }
  static createLogicalOr(left: qc.Expression, right: qc.Expression) {
    return new BinaryExpression(left, Syntax.Bar2Token, right);
  }
  static createNullishCoalesce(left: qc.Expression, right: qc.Expression) {
    return new BinaryExpression(left, Syntax.Question2Token, right);
  }
  static createComma(left: qc.Expression, right: qc.Expression) {
    return <qc.Expression>new BinaryExpression(left, Syntax.CommaToken, right);
  }
  static createLessThan(left: qc.Expression, right: qc.Expression) {
    return <qc.Expression>new BinaryExpression(left, Syntax.LessThanToken, right);
  }
  static createAssignment(left: ObjectLiteralExpression | ArrayLiteralExpression, right: qc.Expression): qc.DestructuringAssignment;
  static createAssignment(left: qc.Expression, right: qc.Expression): BinaryExpression;
  static createAssignment(left: qc.Expression, right: qc.Expression) {
    return new BinaryExpression(left, Syntax.EqualsToken, right);
  }
  _declarationBrand: any;
}
BinaryExpression.prototype.kind = BinaryExpression.kind;
qb.addMixins(BinaryExpression, [qc.Declaration]);
export class BindingElement extends qc.NamedDeclaration implements qc.BindingElement {
  static readonly kind = Syntax.BindingElement;
  parent?: qc.BindingPattern;
  propertyName?: qc.PropertyName;
  dot3Token?: qc.Dot3Token;
  name: qc.BindingName;
  initializer?: qc.Expression;
  constructor(d: qc.Dot3Token | undefined, p: string | qc.PropertyName | undefined, b: string | qc.BindingName, i?: qc.Expression) {
    super();
    this.dot3Token = d;
    this.propertyName = asName(p);
    this.name = asName(b);
    this.initializer = i;
  }
  update(d: qc.Dot3Token | undefined, p: qc.PropertyName | undefined, b: qc.BindingName, i?: qc.Expression) {
    return this.propertyName !== p || this.dot3Token !== d || this.name !== b || this.initializer !== i ? new BindingElement(d, p, b, i).updateFrom(this) : this;
  }
}
BindingElement.prototype.kind = BindingElement.kind;
export namespace BindingOrAssignmentElement {
  export function getInitializerOfBindingOrAssignmentElement(bindingElement: qc.BindingOrAssignmentElement): qc.Expression | undefined {
    if (isDeclarationBindingElement(bindingElement)) {
      // `1` in `let { a = 1 } = ...`
      // `1` in `let { a: b = 1 } = ...`
      // `1` in `let { a: {b} = 1 } = ...`
      // `1` in `let { a: [b] = 1 } = ...`
      // `1` in `let [a = 1] = ...`
      // `1` in `let [{a} = 1] = ...`
      // `1` in `let [[a] = 1] = ...`
      return bindingElement.initializer;
    }
    if (Node.is.kind(PropertyAssignment, bindingElement)) {
      // `1` in `({ a: b = 1 } = ...)`
      // `1` in `({ a: {b} = 1 } = ...)`
      // `1` in `({ a: [b] = 1 } = ...)`
      const initializer = bindingElement.initializer;
      return isAssignmentExpression(initializer, true) ? initializer.right : undefined;
    }
    if (Node.is.kind(ShorthandPropertyAssignment, bindingElement)) {
      // `1` in `({ a = 1 } = ...)`
      return bindingElement.objectAssignmentInitializer;
    }
    if (isAssignmentExpression(bindingElement, true)) {
      // `1` in `[a = 1] = ...`
      // `1` in `[{a} = 1] = ...`
      // `1` in `[[a] = 1] = ...`
      return bindingElement.right;
    }
    if (Node.is.kind(SpreadElement, bindingElement)) return getInitializerOfBindingOrAssignmentElement(<BindingOrAssignmentElement>bindingElement.expression);
    return;
  }
  export function getTargetOfBindingOrAssignmentElement(bindingElement: qc.BindingOrAssignmentElement): qc.BindingOrAssignmentElementTarget | undefined {
    if (isDeclarationBindingElement(bindingElement)) {
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
      return bindingElement.name;
    }
    if (Node.is.objectLiteralElementLike(bindingElement)) {
      switch (bindingElement.kind) {
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
          return getTargetOfBindingOrAssignmentElement(<BindingOrAssignmentElement>bindingElement.initializer);
        case Syntax.ShorthandPropertyAssignment:
          // `a` in `({ a } = ...)`
          // `a` in `({ a = 1 } = ...)`
          return bindingElement.name;
        case Syntax.SpreadAssignment:
          // `a` in `({ ...a } = ...)`
          return getTargetOfBindingOrAssignmentElement(<BindingOrAssignmentElement>bindingElement.expression);
      }
      // no target
      return;
    }
    if (isAssignmentExpression(bindingElement, true)) {
      // `a` in `[a = 1] = ...`
      // `{a}` in `[{a} = 1] = ...`
      // `[a]` in `[[a] = 1] = ...`
      // `a.b` in `[a.b = 1] = ...`
      // `a[0]` in `[a[0] = 1] = ...`
      return getTargetOfBindingOrAssignmentElement(<BindingOrAssignmentElement>bindingElement.left);
    }
    if (Node.is.kind(SpreadElement, bindingElement)) {
      // `a` in `[...a] = ...`
      return getTargetOfBindingOrAssignmentElement(<BindingOrAssignmentElement>bindingElement.expression);
    }
    // `a` in `[a] = ...`
    // `{a}` in `[{a}] = ...`
    // `[a]` in `[[a]] = ...`
    // `a.b` in `[a.b] = ...`
    // `a[0]` in `[a[0]] = ...`
    return bindingElement;
  }
  export function getRestIndicatorOfBindingOrAssignmentElement(bindingElement: qc.BindingOrAssignmentElement): qc.BindingOrAssignmentElementRestIndicator | undefined {
    switch (bindingElement.kind) {
      case Syntax.Parameter:
      case Syntax.BindingElement:
        // `...` in `let [...a] = ...`
        return bindingElement.dot3Token;
      case Syntax.SpreadElement:
      case Syntax.SpreadAssignment:
        // `...` in `[...a] = ...`
        return bindingElement;
    }
    return;
  }
  export function getPropertyNameOfBindingOrAssignmentElement(bindingElement: qc.BindingOrAssignmentElement): Exclude<qc.PropertyName, PrivateIdentifier> | undefined {
    const propertyName = tryGetPropertyNameOfBindingOrAssignmentElement(bindingElement);
    qb.assert(!!propertyName || Node.is.kind(SpreadAssignment, bindingElement), 'Invalid property name for binding element.');
    return propertyName;
  }
  export function tryGetPropertyNameOfBindingOrAssignmentElement(bindingElement: qc.BindingOrAssignmentElement): Exclude<qc.PropertyName, PrivateIdentifier> | undefined {
    switch (bindingElement.kind) {
      case Syntax.BindingElement:
        // `a` in `let { a: b } = ...`
        // `[a]` in `let { [a]: b } = ...`
        // `"a"` in `let { "a": b } = ...`
        // `1` in `let { 1: b } = ...`
        if (bindingElement.propertyName) {
          const propertyName = bindingElement.propertyName;
          if (Node.is.kind(PrivateIdentifier, propertyName)) return qg.failBadSyntax(propertyName);
          return Node.is.kind(ComputedPropertyName, propertyName) && isStringOrNumericLiteral(propertyName.expression) ? propertyName.expression : propertyName;
        }
        break;
      case Syntax.PropertyAssignment:
        // `a` in `({ a: b } = ...)`
        // `[a]` in `({ [a]: b } = ...)`
        // `"a"` in `({ "a": b } = ...)`
        // `1` in `({ 1: b } = ...)`
        if (bindingElement.name) {
          const propertyName = bindingElement.name;
          if (Node.is.kind(PrivateIdentifier, propertyName)) return qg.failBadSyntax(propertyName);
          return Node.is.kind(ComputedPropertyName, propertyName) && isStringOrNumericLiteral(propertyName.expression) ? propertyName.expression : propertyName;
        }
        break;
      case Syntax.SpreadAssignment:
        // `a` in `({ ...a } = ...)`
        if (bindingElement.name && Node.is.kind(PrivateIdentifier, bindingElement.name)) return qg.failBadSyntax(bindingElement.name);
        return bindingElement.name;
    }
    const target = getTargetOfBindingOrAssignmentElement(bindingElement);
    if (target && Node.is.propertyName(target)) return target;
    return;
  }
  export function convertToArrayAssignmentElement(element: qc.BindingOrAssignmentElement) {
    if (Node.is.kind(BindingElement, element)) {
      if (element.dot3Token) {
        qg.assertNode(element.name, isIdentifier);
        return setOriginalNode(setRange(createSpread(element.name), element), element);
      }
      const expression = convertToAssignmentElementTarget(element.name);
      return element.initializer ? setOriginalNode(setRange(createAssignment(expression, element.initializer), element), element) : expression;
    }
    qg.assertNode(element, isExpression);
    return <qc.Expression>element;
  }
  export function convertToObjectAssignmentElement(element: qc.BindingOrAssignmentElement) {
    if (Node.is.kind(BindingElement, element)) {
      if (element.dot3Token) {
        qg.assertNode(element.name, isIdentifier);
        return setOriginalNode(setRange(createSpreadAssignment(element.name), element), element);
      }
      if (element.propertyName) {
        const expression = convertToAssignmentElementTarget(element.name);
        return setOriginalNode(setRange(createPropertyAssignment(element.propertyName, element.initializer ? createAssignment(expression, element.initializer) : expression), element), element);
      }
      qg.assertNode(element.name, isIdentifier);
      return setOriginalNode(setRange(createShorthandPropertyAssignment(element.name, element.initializer), element), element);
    }
    qg.assertNode(element, isObjectLiteralElementLike);
    return <ObjectLiteralElementLike>element;
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
    if (Node.is.kind(ObjectBindingPattern, n)) return setOriginalNode(setRange(createObjectLiteral(map(n.elements, convertToObjectAssignmentElement)), n), n);
    qg.assertNode(n, isObjectLiteralExpression);
    return n;
  }
  export function convertToArrayAssignmentPattern(n: qc.ArrayBindingOrAssignmentPattern) {
    if (Node.is.kind(ArrayBindingPattern, n)) return setOriginalNode(setRange(new ArrayLiteralExpression(map(n.elements, convertToArrayAssignmentElement)), n), n);
    qg.assertNode(n, isArrayLiteralExpression);
    return n;
  }
  export function convertToAssignmentElementTarget(n: qc.BindingOrAssignmentElementTarget): qc.Expression {
    if (Node.is.kind(BindingPattern, n)) return convertToAssignmentPattern(n);
    qg.assertNode(n, isExpression);
    return n;
  }
}
export namespace BindingPattern {
  export const kind = Syntax.ArrayBindingPattern;
  export const also = [Syntax.ObjectBindingPattern];
}
export class Block extends qc.Statement implements qc.Block {
  static readonly kind = Syntax.Block;
  statements: Nodes<qc.Statement>;
  multiLine?: boolean;
  constructor(ss: readonly qc.Statement[], multiLine?: boolean) {
    super();
    this.statements = new Nodes(ss);
    if (multiLine) this.multiLine = multiLine;
  }
  update(ss: readonly qc.Statement[]) {
    return this.statements !== ss ? new Block(ss, this.multiLine).updateFrom(this) : this;
  }
}
Block.prototype.kind = Block.kind;
export class BreakStatement extends qc.Statement implements qc.BreakStatement {
  static readonly kind = Syntax.BreakStatement;
  label?: Identifier;
  constructor(l?: string | Identifier) {
    super();
    this.label = asName(l);
  }
  update(l?: Identifier) {
    return this.label !== l ? new BreakStatement(l).updateFrom(this) : this;
  }
}
BreakStatement.prototype.kind = BreakStatement.kind;
export class Bundle extends Node implements qc.Bundle {
  static readonly kind = Syntax.Bundle;
  prepends: readonly (InputFiles | UnparsedSource)[];
  sourceFiles: readonly SourceFile[];
  syntheticFileReferences?: readonly FileReference[];
  syntheticTypeReferences?: readonly FileReference[];
  syntheticLibReferences?: readonly FileReference[];
  hasNoDefaultLib?: boolean;
  constructor(ss: readonly SourceFile[], ps: readonly (UnparsedSource | InputFiles)[] = qb.empty) {
    super();
    this.prepends = ps;
    this.sourceFiles = ss;
  }
  update(ss: readonly SourceFile[], ps: readonly (UnparsedSource | InputFiles)[] = qb.empty) {
    if (this.sourceFiles !== ss || this.prepends !== ps) return new Bundle(ss, ps);
    return this;
  }
}
Bundle.prototype.kind = Bundle.kind;
export class CallBinding extends Node {
  target: qc.LeftHandSideExpression;
  thisArg: qc.Expression;
  shouldBeCapturedInTempVariable(n: qc.Expression, cacheIdentifiers: boolean): boolean {
    const target = skipParentheses(n) as qc.Expression | ArrayLiteralExpression | ObjectLiteralExpression;
    switch (target.kind) {
      case Syntax.Identifier:
        return cacheIdentifiers;
      case Syntax.ThisKeyword:
      case Syntax.NumericLiteral:
      case Syntax.BigIntLiteral:
      case Syntax.StringLiteral:
        return false;
      case Syntax.ArrayLiteralExpression:
        const elements = target.elements;
        if (elements.length === 0) return false;
        return true;
      case Syntax.ObjectLiteralExpression:
        return (<ObjectLiteralExpression>target).properties.length > 0;
      default:
        return true;
    }
  }
  createCallBinding(expression: qc.Expression, recordTempVariable: (temp: Identifier) => void, _?: qc.ScriptTarget, cacheIdentifiers = false): CallBinding {
    const callee = skipOuterExpressions(expression, OuterExpressionKinds.All);
    let thisArg: qc.Expression;
    let target: qc.LeftHandSideExpression;
    if (Node.is.superProperty(callee)) {
      thisArg = createThis();
      target = callee;
    } else if (callee.kind === Syntax.SuperKeyword) {
      thisArg = createThis();
      target = <PrimaryExpression>callee;
    } else if (Node.get.emitFlags(callee) & qc.EmitFlags.HelperName) {
      thisArg = VoidExpression.zero();
      target = parenthesize.forAccess(callee);
    } else {
      switch (callee.kind) {
        case Syntax.PropertyAccessExpression: {
          if (shouldBeCapturedInTempVariable((<PropertyAccessExpression>callee).expression, cacheIdentifiers)) {
            // for `a.b()` target is `(_a = a).b` and thisArg is `_a`
            thisArg = createTempVariable(recordTempVariable);
            target = createPropertyAccess(
              setRange(createAssignment(thisArg, (<PropertyAccessExpression>callee).expression), (<PropertyAccessExpression>callee).expression),
              (<PropertyAccessExpression>callee).name
            );
            setRange(target, callee);
          } else {
            thisArg = (<PropertyAccessExpression>callee).expression;
            target = <PropertyAccessExpression>callee;
          }
          break;
        }
        case Syntax.ElementAccessExpression: {
          if (shouldBeCapturedInTempVariable((<ElementAccessExpression>callee).expression, cacheIdentifiers)) {
            // for `a[b]()` target is `(_a = a)[b]` and thisArg is `_a`
            thisArg = createTempVariable(recordTempVariable);
            target = new ElementAccessExpression(
              setRange(createAssignment(thisArg, (<ElementAccessExpression>callee).expression), (<ElementAccessExpression>callee).expression),
              (<ElementAccessExpression>callee).argumentExpression
            );
            setRange(target, callee);
          } else {
            thisArg = (<ElementAccessExpression>callee).expression;
            target = <ElementAccessExpression>callee;
          }
          break;
        }
        default: {
          // for `a()` target is `a` and thisArg is `void 0`
          thisArg = VoidExpression.zero();
          target = parenthesize.forAccess(expression);
          break;
        }
      }
    }
    return { target, thisArg };
  }
}
export class CallExpression extends qc.LeftHandSideExpression implements qc.CallExpression {
  static readonly kind = Syntax.CallExpression;
  expression: qc.LeftHandSideExpression;
  questionDotToken?: qc.QuestionDotToken;
  typeArguments?: Nodes<qc.TypeNode>;
  arguments: Nodes<qc.Expression>;
  constructor(e: qc.Expression, ts?: readonly qc.TypeNode[], es?: readonly qc.Expression[]) {
    super(true);
    this.expression = parenthesize.forAccess(e);
    this.typeArguments = Nodes.from(ts);
    this.arguments = parenthesize.listElements(new Nodes(es));
  }
  update(e: qc.Expression, ts: readonly qc.TypeNode[] | undefined, es: readonly qc.Expression[]): CallExpression {
    if (Node.is.optionalChain(this)) return this.update(e, this.questionDotToken, ts, es);
    return this.expression !== e || this.typeArguments !== ts || this.arguments !== es ? new CallExpression(e, ts, es).updateFrom(this) : this;
  }
  static immediateFunctionExpression(ss: readonly qc.Statement[]): CallExpression;
  static immediateFunctionExpression(ss: readonly qc.Statement[], param: ParameterDeclaration, paramValue: qc.Expression): CallExpression;
  static immediateFunctionExpression(ss: readonly qc.Statement[], param?: ParameterDeclaration, paramValue?: qc.Expression) {
    return new CallExpression(new FunctionExpression(undefined, undefined, undefined, undefined, param ? [param] : [], undefined, new Block(ss, true)), undefined, paramValue ? [paramValue] : []);
  }
  static immediateArrowFunction(ss: readonly qc.Statement[]): CallExpression;
  static immediateArrowFunction(ss: readonly qc.Statement[], param: ParameterDeclaration, paramValue: qc.Expression): CallExpression;
  static immediateArrowFunction(ss: readonly qc.Statement[], param?: ParameterDeclaration, paramValue?: qc.Expression) {
    return new CallExpression(new ArrowFunction(undefined, undefined, param ? [param] : [], undefined, undefined, new Block(ss, true)), undefined, paramValue ? [paramValue] : []);
  }
  _declarationBrand: any;
}
CallExpression.prototype.kind = CallExpression.kind;
qb.addMixins(CallExpression, [qc.Declaration]);
export class CallChain extends CallExpression implements qc.CallChain {
  _optionalChainBrand: any;
  constructor(e: qc.Expression, q?: qc.QuestionDotToken, ts?: readonly qc.TypeNode[], es?: readonly qc.Expression[]) {
    super();
    this.flags |= NodeFlags.OptionalChain;
    this.expression = parenthesize.forAccess(e);
    this.questionDotToken = q;
    this.typeArguments = Nodes.from(ts);
    this.arguments = parenthesize.listElements(new Nodes(es));
  }
  update(e: qc.Expression, q: qc.QuestionDotToken | undefined, ts: readonly qc.TypeNode[] | undefined, es: readonly qc.Expression[]) {
    qb.assert(!!(this.flags & NodeFlags.OptionalChain));
    return this.expression !== e || this.questionDotToken !== q || this.typeArguments !== ts || this.arguments !== es ? new CallChain(e, q, ts, es).updateFrom(this) : this;
  }
}
CallChain.prototype.kind = CallChain.kind;
export class CallSignatureDeclaration extends qc.SignatureDeclarationBase implements qc.CallSignatureDeclaration {
  static readonly kind = Syntax.CallSignature;
  jsDocCache?: readonly qc.JSDocTag[];
  questionToken?: qc.QuestionToken;
  constructor(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: qc.TypeNode) {
    super(true, Syntax.CallSignature, ts, ps, t);
  }
  update(ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: qc.TypeNode) {
    return super.update(ts, ps, t);
  }
  _typeElementBrand: any;
}
CallSignatureDeclaration.prototype.kind = CallSignatureDeclaration.kind;
export class CaseBlock extends Node implements qc.CaseBlock {
  static readonly kind = Syntax.CaseBlock;
  parent!: SwitchStatement;
  clauses: Nodes<qc.CaseOrDefaultClause>;
  constructor(cs: readonly qc.CaseOrDefaultClause[]) {
    super(true);
    this.clauses = new Nodes(cs);
  }
  update(cs: readonly qc.CaseOrDefaultClause[]) {
    return this.clauses !== cs ? new CaseBlock(cs).updateFrom(this) : this;
  }
}
CaseBlock.prototype.kind = CaseBlock.kind;
export class CaseClause extends Node implements qc.CaseClause {
  static readonly kind = Syntax.CaseClause;
  parent!: CaseBlock;
  expression: qc.Expression;
  statements: Nodes<qc.Statement>;
  fallthroughFlowNode?: qc.FlowNode;
  constructor(e: qc.Expression, ss: readonly qc.Statement[]) {
    super(true);
    this.expression = parenthesize.expressionForList(e);
    this.statements = new Nodes(ss);
  }
  update(e: qc.Expression, ss: readonly qc.Statement[]) {
    return this.expression !== e || this.statements !== ss ? new CaseClause(e, ss).updateFrom(this) : this;
  }
}
CaseClause.prototype.kind = CaseClause.kind;
export class CatchClause extends Node implements qc.CatchClause {
  static readonly kind = Syntax.CatchClause;
  parent!: TryStatement;
  variableDeclaration?: VariableDeclaration;
  block: Block;
  constructor(v: string | VariableDeclaration | undefined, b: Block) {
    super(true);
    this.variableDeclaration = isString(v) ? createVariableDeclaration(v) : v;
    this.block = b;
  }
  update(v: VariableDeclaration | undefined, b: Block) {
    return this.variableDeclaration !== v || this.block !== b ? new CatchClause(v, b).updateFrom(this) : this;
  }
}
CatchClause.prototype.kind = CatchClause.kind;
export class ClassDeclaration extends qc.ClassLikeDeclarationBase implements qc.ClassDeclaration {
  static readonly kind = Syntax.ClassDeclaration;
  name?: Identifier;
  constructor(
    ds: readonly Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    name: string | Identifier | undefined,
    ts: readonly TypeParameterDeclaration[] | undefined,
    hs: readonly HeritageClause[] | undefined,
    es: readonly qc.ClassElement[]
  ) {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(name);
    this.typeParameters = Nodes.from(ts);
    this.heritageClauses = Nodes.from(hs);
    this.members = new Nodes(es);
  }
  update(
    ds: readonly Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    name: Identifier | undefined,
    ts: readonly TypeParameterDeclaration[] | undefined,
    hs: readonly HeritageClause[] | undefined,
    es: readonly qc.ClassElement[]
  ) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== name || this.typeParameters !== ts || this.heritageClauses !== hs || this.members !== es
      ? new ClassDeclaration(ds, ms, name, ts, hs, es).updateFrom(this)
      : this;
  }
}
ClassDeclaration.prototype.kind = ClassDeclaration.kind;
qb.addMixins(ClassDeclaration, [qc.DeclarationStatement]);
export class ClassExpression extends qc.ClassLikeDeclarationBase implements qc.ClassExpression {
  static readonly kind = Syntax.ClassExpression;
  jsDocCache?: readonly qc.JSDocTag[];
  constructor(
    ms: readonly Modifier[] | undefined,
    name: string | Identifier | undefined,
    ts: readonly TypeParameterDeclaration[] | undefined,
    hs: readonly HeritageClause[] | undefined,
    es: readonly qc.ClassElement[]
  ) {
    super(true);
    this.decorators = undefined;
    this.modifiers = Nodes.from(ms);
    this.name = asName(name);
    this.typeParameters = Nodes.from(ts);
    this.heritageClauses = Nodes.from(hs);
    this.members = new Nodes(es);
  }
  update(
    ms: readonly Modifier[] | undefined,
    name: Identifier | undefined,
    ts: readonly TypeParameterDeclaration[] | undefined,
    hs: readonly HeritageClause[] | undefined,
    es: readonly qc.ClassElement[]
  ) {
    return this.modifiers !== ms || this.name !== name || this.typeParameters !== ts || this.heritageClauses !== hs || this.members !== es
      ? new ClassExpression(ms, name, ts, hs, es).updateFrom(this)
      : this;
  }
  _primaryExpressionBrand: any;
  _memberExpressionBrand: any;
  _leftHandSideExpressionBrand: any;
  _updateExpressionBrand: any;
  _unaryExpressionBrand: any;
  _expressionBrand: any;
}
ClassExpression.prototype.kind = ClassExpression.kind;
qb.addMixins(ClassExpression, [qc.PrimaryExpression]);
export class CommaListExpression extends qc.Expression implements qc.CommaListExpression {
  static readonly kind: Syntax.CommaListExpression;
  elements: Nodes<qc.Expression>;
  constructor(es: readonly qc.Expression[]) {
    super(true);
    const flatten = (e: qc.Expression): qc.Expression | readonly qc.Expression[] => {
      if (qb.isSynthesized(e) && !Node.is.parseTreeNode(e) && !e.original && !e.emitNode && !e.id) {
        if (e.kind === Syntax.CommaListExpression) return (<CommaListExpression>e).elements;
        if (e.is(BinaryExpression) && e.operatorToken.kind === Syntax.CommaToken) return [e.left, e.right];
      }
      return this;
    };
    this.elements = new Nodes(qb.sameFlatMap(es, flatten));
  }
  update(es: readonly qc.Expression[]) {
    return this.elements !== es ? new CommaListExpression(es).updateFrom(this) : this;
  }
}
CommaListExpression.prototype.kind = CommaListExpression.kind;
export class ComputedPropertyName extends Node implements qc.ComputedPropertyName {
  static readonly kind = Syntax.ComputedPropertyName;
  parent!: qc.Declaration;
  expression: qc.Expression;
  constructor(e: qc.Expression) {
    super(true);
    this.expression = e.isCommaSequence() ? new ParenthesizedExpression(e) : e;
  }
  update(e: qc.Expression) {
    return this.expression !== e ? new ComputedPropertyName(e).updateFrom(this) : this;
  }
}
ComputedPropertyName.prototype.kind = ComputedPropertyName.kind;
export class ConditionalExpression extends qc.Expression implements qc.ConditionalExpression {
  static readonly kind = Syntax.ConditionalExpression;
  condition: qc.Expression;
  questionToken: qc.QuestionToken;
  whenTrue: qc.Expression;
  colonToken: qc.ColonToken;
  whenFalse: qc.Expression;
  constructor(c: qc.Expression, q: qc.QuestionToken, t: qc.Expression, s: qc.ColonToken, f: qc.Expression);
  constructor(c: qc.Expression, q: qc.QuestionToken | qc.Expression, t: qc.Expression, s?: qc.ColonToken, f?: qc.Expression) {
    super(true);
    this.condition = parenthesize.forConditionalHead(c);
    this.questionToken = f ? <qc.QuestionToken>q : new qc.Token(Syntax.QuestionToken);
    this.whenTrue = parenthesize.subexpressionOfConditionalExpression(f ? t : <qc.Expression>q);
    this.colonToken = f ? s! : new qc.Token(Syntax.ColonToken);
    this.whenFalse = parenthesize.subexpressionOfConditionalExpression(f ? f : t);
  }
  update(c: qc.Expression, q: qc.Token<Syntax.QuestionToken>, t: qc.Expression, s: qc.Token<Syntax.ColonToken>, f: qc.Expression): ConditionalExpression {
    return this.condition !== c || this.questionToken !== q || this.whenTrue !== t || this.colonToken !== s || this.whenFalse !== f ? new ConditionalExpression(c, q, t, s, f).updateFrom(this) : this;
  }
}
ConditionalExpression.prototype.kind = ConditionalExpression.kind;
export class ConditionalTypeNode extends qc.TypeNode implements qc.ConditionalTypeNode {
  static readonly kind = Syntax.ConditionalType;
  checkType: qc.TypeNode;
  extendsType: qc.TypeNode;
  trueType: qc.TypeNode;
  falseType: qc.TypeNode;
  constructor(c: qc.TypeNode, e: qc.TypeNode, t: qc.TypeNode, f: qc.TypeNode) {
    super(true);
    this.checkType = parenthesize.conditionalTypeMember(c);
    this.extendsType = parenthesize.conditionalTypeMember(e);
    this.trueType = t;
    this.falseType = f;
  }
  update(c: qc.TypeNode, e: qc.TypeNode, t: qc.TypeNode, f: qc.TypeNode) {
    return this.checkType !== c || this.extendsType !== e || this.trueType !== t || this.falseType !== f ? new ConditionalTypeNode(c, e, t, f).updateFrom(this) : this;
  }
}
ConditionalTypeNode.prototype.kind = ConditionalTypeNode.kind;
export class ConstructorDeclaration extends qc.FunctionLikeDeclarationBase implements qc.ConstructorDeclaration {
  static readonly kind = Syntax.Constructor;
  parent!: qc.ClassLikeDeclaration;
  body?: qc.FunctionBody;
  constructor(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], b?: Block) {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.typeParameters = undefined;
    this.parameters = new Nodes(ps);
    this.type = undefined;
    this.body = b;
  }
  update(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], b?: Block) {
    return this.decorators !== ds || this.modifiers !== ms || this.parameters !== ps || this.body !== b ? new ConstructorDeclaration(ds, ms, ps, b).updateFrom(this) : this;
  }
  _classElementBrand: any;
}
ConstructorDeclaration.prototype.kind = ConstructorDeclaration.kind;
qb.addMixins(ConstructorDeclaration, [qc.ClassElement, qc.JSDocContainer]);
export class ConstructorTypeNode extends qc.FunctionOrConstructorTypeNodeBase implements qc.ConstructorTypeNode {
  static readonly kind = Syntax.ConstructorType;
  jsDocCache?: readonly qc.JSDocTag[];
  constructor(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: qc.TypeNode) {
    super(true, Syntax.ConstructorType, ts, ps, t);
  }
  update(ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: qc.TypeNode) {
    return super.update(ts, ps, t);
  }
  _typeNodeBrand: any;
}
ConstructorTypeNode.prototype.kind = ConstructorTypeNode.kind;
export class ConstructSignatureDeclaration extends qc.SignatureDeclarationBase implements qc.ConstructSignatureDeclaration {
  static readonly kind = Syntax.ConstructSignature;
  questionToken?: qc.QuestionToken;
  jsDocCache?: readonly qc.JSDocTag[];
  constructor(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: qc.TypeNode) {
    super(true, Syntax.ConstructSignature, ts, ps, t);
  }
  update(ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: qc.TypeNode) {
    return super.update(ts, ps, t);
  }
  _typeElementBrand: any;
}
ConstructSignatureDeclaration.prototype.kind = ConstructSignatureDeclaration.kind;
qb.addMixins(ConstructSignatureDeclaration, [qc.TypeElement]);
export class ContinueStatement extends qc.Statement implements qc.ContinueStatement {
  static readonly kind = Syntax.ContinueStatement;
  label?: Identifier;
  constructor(l?: string | Identifier) {
    super(true);
    this.label = asName(l);
  }
  update(l: Identifier) {
    return this.label !== l ? new ContinueStatement(l).updateFrom(this) : this;
  }
}
ContinueStatement.prototype.kind = ContinueStatement.kind;
export class DebuggerStatement extends qc.Statement implements qc.DebuggerStatement {
  static readonly kind = Syntax.DebuggerStatement;
  constructor() {
    super(true);
  }
}
DebuggerStatement.prototype.kind = DebuggerStatement.kind;
export class Decorator extends Node implements qc.Decorator {
  static readonly kind = Syntax.Decorator;
  parent: qc.NamedDeclaration;
  expression: qc.LeftHandSideExpression;
  constructor(e: qc.Expression) {
    super();
    this.expression = parenthesize.forAccess(e);
  }
  update(e: qc.Expression) {
    return this.expression !== e ? new Decorator(e).updateFrom(this) : this;
  }
}
Decorator.prototype.kind = Decorator.kind;
export class DefaultClause extends Node implements qc.DefaultClause {
  static readonly kind = Syntax.DefaultClause;
  parent: CaseBlock;
  statements: Nodes<qc.Statement>;
  fallthroughFlowNode?: qc.FlowNode;
  constructor(ss: readonly qc.Statement[]) {
    super();
    this.statements = new Nodes(ss);
  }
  update(ss: readonly qc.Statement[]) {
    return this.statements !== ss ? new DefaultClause(ss).updateFrom(this) : this;
  }
}
DefaultClause.prototype.kind = DefaultClause.kind;
export class DeleteExpression extends qc.UnaryExpression implements qc.DeleteExpression {
  static readonly kind = Syntax.DeleteExpression;
  expression: qc.UnaryExpression;
  constructor(e: qc.Expression) {
    super(true);
    this.expression = parenthesize.prefixOperand(e);
  }
  update(e: qc.Expression) {
    return this.expression !== e ? new DeleteExpression(e).updateFrom(this) : this;
  }
}
DeleteExpression.prototype.kind = DeleteExpression.kind;
export class DoStatement extends qc.IterationStatement implements qc.DoStatement {
  static readonly kind = Syntax.DoStatement;
  expression: qc.Expression;
  constructor(s: qc.Statement, e: qc.Expression) {
    super();
    this.statement = asEmbeddedStatement(s);
    this.expression = e;
  }
  updateDo(s: qc.Statement, e: qc.Expression) {
    return this.statement !== s || this.expression !== e ? new DoStatement(s, e).updateFrom(this) : this;
  }
}
DoStatement.prototype.kind = DoStatement.kind;
export class ElementAccessExpression extends qc.MemberExpression implements qc.ElementAccessExpression {
  static readonly kind = Syntax.ElementAccessExpression;
  expression: qc.LeftHandSideExpression;
  questionDotToken?: qc.QuestionDotToken;
  argumentExpression: qc.Expression;
  constructor(e: qc.Expression, i: number | qc.Expression) {
    super(true);
    this.expression = parenthesize.forAccess(e);
    this.argumentExpression = asExpression(i);
  }
  update(e: qc.Expression, a: qc.Expression) {
    if (Node.is.optionalChain(this)) return this.updateElementAccessChain(e, this.questionDotToken, a);
    return this.expression !== e || this.argumentExpression !== a ? new ElementAccessExpression(e, a).updateFrom(this) : this;
  }
}
ElementAccessExpression.prototype.kind = ElementAccessExpression.kind;
export class ElementAccessChain extends ElementAccessExpression implements qc.ElementAccessChain {
  _optionalChainBrand: any;
  constructor(e: qc.Expression, q: qc.QuestionDotToken | undefined, i: number | qc.Expression) {
    super(true);
    this.flags |= NodeFlags.OptionalChain;
    this.expression = parenthesize.forAccess(e);
    this.questionDotToken = q;
    this.argumentExpression = asExpression(i);
  }
  updateElementAccessChain(e: qc.Expression, q: qc.QuestionDotToken | undefined, a: qc.Expression) {
    qb.assert(!!(this.flags & NodeFlags.OptionalChain), 'Cannot update an ElementAccessExpression using updateElementAccessChain. Use updateElementAccess instead.');
    return this.expression !== e || this.questionDotToken !== q || this.argumentExpression !== a ? new ElementAccessChain(e, q, a).updateFrom(this) : this;
  }
}
ElementAccessChain.prototype.kind = ElementAccessChain.kind;
export class EmptyStatement extends qc.Statement implements qc.EmptyStatement {
  static readonly kind = Syntax.EmptyStatement;
  createEmptyStatement() {}
}
EmptyStatement.prototype.kind = EmptyStatement.kind;
export class EndOfDeclarationMarker extends qc.Statement implements qc.EndOfDeclarationMarker {
  static readonly kind = Syntax.EndOfDeclarationMarker;
  constructor(o: Node) {
    super();
    this.emitNode = {} as qc.EmitNode;
    this.original = o;
  }
}
EndOfDeclarationMarker.prototype.kind = EndOfDeclarationMarker.kind;
export class EnumDeclaration extends qc.DeclarationStatement implements qc.EnumDeclaration {
  static readonly kind = Syntax.EnumDeclaration;
  name: Identifier;
  members: Nodes<qc.EnumMember>;
  constructor(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, n: string | Identifier, es: readonly EnumMember[]) {
    super();
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(n);
    this.members = new Nodes(es);
  }
  update(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, n: Identifier, es: readonly EnumMember[]) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== n || this.members !== es ? new EnumDeclaration(ds, ms, n, es).updateFrom(this) : this;
  }
}
EnumDeclaration.prototype.kind = EnumDeclaration.kind;
qb.addMixins(EnumDeclaration, [qc.JSDocContainer]);
export class EnumMember extends qc.NamedDeclaration implements qc.EnumMember {
  static readonly kind = Syntax.EnumMember;
  parent: EnumDeclaration;
  name: qc.PropertyName;
  initializer?: qc.Expression;
  createEnumMember(n: string | qc.PropertyName, i?: qc.Expression) {
    this.name = asName(n);
    this.initializer = i && parenthesize.expressionForList(i);
  }
  updateEnumMember(n: qc.PropertyName, i?: qc.Expression) {
    return this.name !== n || this.initializer !== i ? new EnumMember(n, i).updateFrom(this) : this;
  }
}
EnumMember.prototype.kind = EnumMember.kind;
qb.addMixins(EnumMember, [qc.JSDocContainer]);
export class ExportAssignment extends qc.DeclarationStatement implements qc.ExportAssignment {
  static readonly kind = Syntax.ExportAssignment;
  parent: qc.SourceFile;
  isExportEquals?: boolean;
  expression: qc.Expression;
  constructor(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, eq: boolean | undefined, e: qc.Expression) {
    super();
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.isExportEquals = eq;
    this.expression = eq ? parenthesize.binaryOperand(Syntax.EqualsToken, e, false, undefined) : parenthesize.defaultExpression(e);
  }
  createExportDefault(e: qc.Expression) {
    return new ExportAssignment(undefined, undefined, false, e);
  }
  update(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, e: qc.Expression) {
    return this.decorators !== ds || this.modifiers !== ms || this.expression !== e ? new ExportAssignment(ds, ms, this.isExportEquals, e).updateFrom(this) : this;
  }
}
ExportAssignment.prototype.kind = ExportAssignment.kind;
export class ExportDeclaration extends qc.DeclarationStatement implements qc.ExportDeclaration {
  static readonly kind = Syntax.ExportDeclaration;
  parent: SourceFile | ModuleBlock;
  isTypeOnly: boolean;
  exportClause?: qc.NamedExportBindings;
  moduleSpecifier?: qc.Expression;
  jsDocCache?: readonly qc.JSDocTag[];
  constructor(ds?: readonly Decorator[], ms?: readonly Modifier[], e?: qc.NamedExportBindings, m?: qc.Expression, t = false) {
    super();
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.isTypeOnly = t;
    this.exportClause = e;
    this.moduleSpecifier = m;
  }
  createExternalModuleExport(exportName: Identifier) {
    return new ExportDeclaration(undefined, undefined, new qc.NamedExports([new qc.ExportSpecifier(undefined, exportName)]));
  }
  createEmptyExports() {
    return new ExportDeclaration(undefined, undefined, new qc.NamedExports([]), undefined);
  }
  update(ds?: readonly Decorator[], ms?: readonly Modifier[], e?: qc.NamedExportBindings, m?: qc.Expression, t = false) {
    return this.decorators !== ds || this.modifiers !== ms || this.isTypeOnly !== t || this.exportClause !== e || this.moduleSpecifier !== m
      ? new ExportDeclaration(ds, ms, e, m, t).updateFrom(this)
      : this;
  }
  _statementBrand: any;
}
ExportDeclaration.prototype.kind = ExportDeclaration.kind;
qb.addMixins(ExportDeclaration, [qc.JSDocContainer]);
export class ExportSpecifier extends qc.NamedDeclaration implements qc.ExportSpecifier {
  static readonly kind = Syntax.ExportSpecifier;
  parent: NamedExports;
  propertyName?: Identifier;
  name: Identifier;
  constructor(p: string | Identifier | undefined, n: string | Identifier) {
    super();
    this.propertyName = asName(p);
    this.name = asName(n);
  }
  update(p: Identifier | undefined, n: Identifier) {
    return this.propertyName !== p || this.name !== n ? new ExportSpecifier(p, n).updateFrom(this) : this;
  }
}
ExportSpecifier.prototype.kind = ExportSpecifier.kind;
export class ExpressionStatement extends qc.Statement implements qc.ExpressionStatement {
  static readonly kind = Syntax.ExpressionStatement;
  expression: qc.Expression;
  constructor(e: qc.Expression) {
    super(true);
    this.expression = parenthesize.expressionForExpressionStatement(e);
  }
  update(e: qc.Expression) {
    return this.expression !== e ? new ExpressionStatement(e).updateFrom(this) : this;
  }
}
ExpressionStatement.prototype.kind = ExpressionStatement.kind;
qb.addMixins(ExpressionStatement, [qc.JSDocContainer]);
export class ExpressionWithTypeArguments extends qc.NodeWithTypeArguments implements qc.ExpressionWithTypeArguments {
  static readonly kind = Syntax.ExpressionWithTypeArguments;
  parent: HeritageClause | JSDocAugmentsTag | JSDocImplementsTag;
  expression: qc.LeftHandSideExpression;
  constructor(ts: readonly qc.TypeNode[] | undefined, e: qc.Expression) {
    super(true);
    this.expression = parenthesize.forAccess(e);
    this.typeArguments = Nodes.from(ts);
  }
  update(ts: readonly qc.TypeNode[] | undefined, e: qc.Expression) {
    return this.typeArguments !== ts || this.expression !== e ? new ExpressionWithTypeArguments(ts, e).updateFrom(this) : this;
  }
}
ExpressionWithTypeArguments.prototype.kind = ExpressionWithTypeArguments.kind;
export class ExternalModuleReference extends Node implements qc.ExternalModuleReference {
  static readonly kind = Syntax.ExternalModuleReference;
  parent: ImportEqualsDeclaration;
  expression: qc.Expression;
  constructor(e: qc.Expression) {
    super(true);
    this.expression = e;
  }
  update(e: qc.Expression) {
    return this.expression !== e ? new ExternalModuleReference(e).updateFrom(this) : this;
  }
}
ExternalModuleReference.prototype.kind = ExternalModuleReference.kind;
export class ForInStatement extends qc.IterationStatement implements qc.ForInStatement {
  static readonly kind = Syntax.ForInStatement;
  initializer: qc.ForInitializer;
  expression: qc.Expression;
  constructor(i: qc.ForInitializer, e: qc.Expression, s: qc.Statement) {
    super(true);
    this.initializer = i;
    this.expression = e;
    this.statement = asEmbeddedStatement(s);
  }
  update(i: qc.ForInitializer, e: qc.Expression, s: qc.Statement) {
    return this.initializer !== i || this.expression !== e || this.statement !== s ? new ForInStatement(i, e, s).updateFrom(this) : this;
  }
}
ForInStatement.prototype.kind = ForInStatement.kind;
export class ForOfStatement extends qc.IterationStatement implements qc.ForOfStatement {
  static readonly kind = Syntax.ForOfStatement;
  awaitModifier?: qc.AwaitKeywordToken;
  initializer: qc.ForInitializer;
  expression: qc.Expression;
  constructor(a: qc.AwaitKeywordToken | undefined, i: qc.ForInitializer, e: qc.Expression, s: qc.Statement) {
    super(true);
    this.awaitModifier = a;
    this.initializer = i;
    this.expression = e.isCommaSequence() ? new ParenthesizedExpression(e) : e;
    this.statement = asEmbeddedStatement(s);
  }
  update(a: qc.AwaitKeywordToken | undefined, i: qc.ForInitializer, e: qc.Expression, s: qc.Statement) {
    return this.awaitModifier !== a || this.initializer !== i || this.expression !== e || this.statement !== s ? new ForOfStatement(a, i, e, s).updateFrom(this) : this;
  }
}
ForOfStatement.prototype.kind = ForOfStatement.kind;
export class ForStatement extends qc.IterationStatement implements qc.ForStatement {
  static readonly kind = Syntax.ForStatement;
  initializer?: qc.ForInitializer;
  condition?: qc.Expression;
  incrementor?: qc.Expression;
  constructor(i: qc.ForInitializer | undefined, c: qc.Expression | undefined, inc: qc.Expression | undefined, s: qc.Statement) {
    super(true);
    this.initializer = i;
    this.condition = c;
    this.incrementor = inc;
    this.statement = asEmbeddedStatement(s);
  }
  update(i: qc.ForInitializer | undefined, c: qc.Expression | undefined, inc: qc.Expression | undefined, s: qc.Statement) {
    return this.initializer !== i || this.condition !== c || this.incrementor !== inc || this.statement !== s ? new ForStatement(i, c, inc, s).updateFrom(this) : this;
  }
}
ForStatement.prototype.kind = ForStatement.kind;
export class FunctionDeclaration extends qc.FunctionLikeDeclarationBase implements qc.FunctionDeclaration {
  static readonly kind = Syntax.FunctionDeclaration;
  name?: Identifier;
  body?: qc.FunctionBody;
  constructor(
    ds: readonly Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    a: qc.AsteriskToken | undefined,
    name: string | Identifier | undefined,
    ts: readonly TypeParameterDeclaration[] | undefined,
    ps: readonly ParameterDeclaration[],
    t?: qc.TypeNode,
    b?: Block
  ) {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.asteriskToken = a;
    this.name = asName(name);
    this.typeParameters = Nodes.from(ts);
    this.parameters = new Nodes(ps);
    this.type = t;
    this.body = b;
  }
  update(
    ds: readonly Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    a: qc.AsteriskToken | undefined,
    name: Identifier | undefined,
    ts: readonly TypeParameterDeclaration[] | undefined,
    ps: readonly ParameterDeclaration[],
    t: qc.TypeNode | undefined,
    b: Block | undefined
  ) {
    return this.decorators !== ds ||
      this.modifiers !== ms ||
      this.asteriskToken !== a ||
      this.name !== name ||
      this.typeParameters !== ts ||
      this.parameters !== ps ||
      this.type !== t ||
      this.body !== b
      ? new FunctionDeclaration(ds, ms, a, name, ts, ps, t, b).updateFrom(this)
      : this;
  }
}
FunctionDeclaration.prototype.kind = FunctionDeclaration.kind;
qb.addMixins(FunctionDeclaration, [qc.DeclarationStatement]);
export class FunctionExpression extends qc.FunctionLikeDeclarationBase implements qc.FunctionExpression {
  static readonly kind = Syntax.FunctionExpression;
  name?: Identifier;
  body: qc.FunctionBody;
  constructor(
    ms: readonly Modifier[] | undefined,
    a: qc.AsteriskToken | undefined,
    name: string | Identifier | undefined,
    ts: readonly TypeParameterDeclaration[] | undefined,
    ps: readonly ParameterDeclaration[] | undefined,
    t: qc.TypeNode | undefined,
    b: Block
  ) {
    super(true);
    this.modifiers = Nodes.from(ms);
    this.asteriskToken = a;
    this.name = asName(name);
    this.typeParameters = Nodes.from(ts);
    this.parameters = new Nodes(ps);
    this.type = t;
    this.body = b;
  }
  update(
    ms: readonly Modifier[] | undefined,
    a: qc.AsteriskToken | undefined,
    name: Identifier | undefined,
    ts: readonly TypeParameterDeclaration[] | undefined,
    ps: readonly ParameterDeclaration[],
    t: qc.TypeNode | undefined,
    b: Block
  ) {
    return this.name !== name || this.modifiers !== ms || this.asteriskToken !== a || this.typeParameters !== ts || this.parameters !== ps || this.type !== t || this.body !== b
      ? new FunctionExpression(ms, a, name, ts, ps, t, b).updateFrom(this)
      : this;
  }
}
FunctionExpression.prototype.kind = FunctionExpression.kind;
qb.addMixins(FunctionExpression, [qc.PrimaryExpression, qc.JSDocContainer]);
export class FunctionTypeNode extends qc.FunctionOrConstructorTypeNodeBase implements qc.FunctionTypeNode {
  static readonly kind = Syntax.FunctionType;
  jsDocCache?: readonly qc.JSDocTag[];
  constructor(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: qc.TypeNode) {
    super(true, Syntax.FunctionType, ts, ps, t);
  }
  update(ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: qc.TypeNode) {
    return super.update(ts, ps, t);
  }
  _typeNodeBrand: any;
}
FunctionTypeNode.prototype.kind = FunctionTypeNode.kind;
export class GetAccessorDeclaration extends qc.FunctionOrConstructorTypeNodeBase implements qc.GetAccessorDeclaration {
  static readonly kind = Syntax.GetAccessor;
  parent: qc.ClassLikeDeclaration | ObjectLiteralExpression;
  name: qc.PropertyName;
  body?: qc.FunctionBody;
  constructor(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | qc.PropertyName, ps: readonly ParameterDeclaration[], t?: qc.TypeNode, b?: Block) {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(p);
    this.typeParameters = undefined;
    this.parameters = new Nodes(ps);
    this.type = t;
    this.body = b;
  }
  update(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: qc.PropertyName, ps: readonly ParameterDeclaration[], t?: qc.TypeNode, b?: Block) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== p || this.parameters !== ps || this.type !== t || this.body !== b
      ? new GetAccessorDeclaration(ds, ms, p, ps, t, b).updateFrom(this)
      : this;
  }
  orSetKind(): this is qc.AccessorDeclaration {
    return this.kind === Syntax.SetAccessor || this.kind === Syntax.GetAccessor;
  }
}
GetAccessorDeclaration.prototype.kind = GetAccessorDeclaration.kind;
qb.addMixins(GetAccessorDeclaration, [qc.ClassElement, qc.ObjectLiteralElement, qc.JSDocContainer]);
export class HeritageClause extends Node implements qc.HeritageClause {
  static readonly kind = Syntax.HeritageClause;
  parent: InterfaceDeclaration | qc.ClassLikeDeclaration;
  token: Syntax.ExtendsKeyword | Syntax.ImplementsKeyword;
  types: Nodes<qc.ExpressionWithTypeArguments>;
  constructor(t: HeritageClause['token'], ts: readonly ExpressionWithTypeArguments[]) {
    super(true);
    this.token = t;
    this.types = new Nodes(ts);
  }
  update(ts: readonly ExpressionWithTypeArguments[]) {
    return this.types !== ts ? new HeritageClause(this.token, ts).updateFrom(this) : this;
  }
}
HeritageClause.prototype.kind = HeritageClause.kind;
let nextAutoGenerateId = 0;
export class Identifier extends qc.TokenOrIdentifier implements qc.Identifier {
  static readonly kind = Syntax.Identifier;
  escapedText!: qb.__String;
  autoGenerateFlags = qc.GeneratedIdentifierFlags.None;
  typeArguments?: Nodes<qc.TypeNode | TypeParameterDeclaration>;
  flowNode = undefined;
  originalKeywordKind?: Syntax;
  autoGenerateId = 0;
  isInJSDocNamespace?: boolean;
  jsdocDotPos?: number;
  constructor(t: string);
  constructor(t: string, typeArgs: readonly (qc.TypeNode | TypeParameterDeclaration)[] | undefined);
  constructor(t: string, typeArgs?: readonly (qc.TypeNode | TypeParameterDeclaration)[]) {
    super();
    this.escapedText = qy.get.escUnderscores(t);
    this.originalKeywordKind = t ? qy.fromString(t) : Syntax.Unknown;
    if (typeArgs) {
      this.typeArguments = new Nodes(typeArgs as readonly qc.TypeNode[]);
    }
  }
  get text(): string {
    return qc.idText(this);
  }
  isInternalName() {
    return (Node.get.emitFlags(this) & qc.EmitFlags.InternalName) !== 0;
  }
  isLocalName() {
    return (Node.get.emitFlags(this) & qc.EmitFlags.LocalName) !== 0;
  }
  isExportName() {
    return (Node.get.emitFlags(this) & qc.EmitFlags.ExportName) !== 0;
  }
  update(ts?: Nodes<qc.TypeNode | TypeParameterDeclaration>) {
    return this.typeArguments !== ts ? new Identifier(this.text, ts).updateFrom(this) : this;
  }
  static createTempVariable(record?: (i: Identifier) => void): Identifier;
  static createTempVariable(record: ((i: Identifier) => void) | undefined, reserved: boolean): GeneratedIdentifier;
  static createTempVariable(record?: (i: Identifier) => void, reserved?: boolean): GeneratedIdentifier {
    const n = new Identifier('') as GeneratedIdentifier;
    n.autoGenerateFlags = qc.GeneratedIdentifierFlags.Auto;
    n.autoGenerateId = nextAutoGenerateId;
    nextAutoGenerateId++;
    if (record) record(n);
    if (reserved) n.autoGenerateFlags |= qc.GeneratedIdentifierFlags.ReservedInNestedScopes;
    return n;
  }
  static createLoopVariable(): Identifier {
    const n = new Identifier('');
    n.autoGenerateFlags = qc.GeneratedIdentifierFlags.Loop;
    n.autoGenerateId = nextAutoGenerateId;
    nextAutoGenerateId++;
    return n;
  }
  static createUniqueName(t: string): Identifier {
    const n = new Identifier(t);
    n.autoGenerateFlags = qc.GeneratedIdentifierFlags.Unique;
    n.autoGenerateId = nextAutoGenerateId;
    nextAutoGenerateId++;
    return n;
  }
  static createOptimisticUniqueName(t: string): Identifier;
  static createOptimisticUniqueName(t: string): GeneratedIdentifier;
  static createOptimisticUniqueName(t: string): GeneratedIdentifier {
    const n = new Identifier(t) as GeneratedIdentifier;
    n.autoGenerateFlags = qc.GeneratedIdentifierFlags.Unique | qc.GeneratedIdentifierFlags.Optimistic;
    n.autoGenerateId = nextAutoGenerateId;
    nextAutoGenerateId++;
    return n;
  }
  static createFileLevelUniqueName(t: string): Identifier {
    const n = this.createOptimisticUniqueName(t);
    n.autoGenerateFlags |= qc.GeneratedIdentifierFlags.FileLevel;
    return n;
  }
  static getGeneratedNameForNode(o?: Node): Identifier;
  static getGeneratedNameForNode(o: Node | undefined, f: qc.GeneratedIdentifierFlags): Identifier;
  static getGeneratedNameForNode(o?: Node, f?: qc.GeneratedIdentifierFlags): Identifier {
    const n = new Identifier(o && Node.is.kind(Identifier, o) ? qc.idText(o) : '');
    n.autoGenerateFlags = qc.GeneratedIdentifierFlags.Node | f!;
    n.autoGenerateId = nextAutoGenerateId;
    n.original = o;
    nextAutoGenerateId++;
    return n;
  }
  static getNamespaceMemberName(ns: Identifier, i: Identifier, comments?: boolean, sourceMaps?: boolean): PropertyAccessExpression {
    const n = createPropertyAccess(ns, qb.isSynthesized(i) ? i : getSynthesizedClone(i));
    setRange(n, i);
    let f: qc.EmitFlags = 0;
    if (!sourceMaps) f |= qc.EmitFlags.NoSourceMap;
    if (!comments) f |= qc.EmitFlags.NoComments;
    if (f) setEmitFlags(n, f);
    return n;
  }
  static getLocalNameForExternalImport(d: ImportDeclaration | ExportDeclaration | ImportEqualsDeclaration, sourceFile: SourceFile): Identifier | undefined {
    const d2 = getNamespaceDeclarationNode(d);
    if (d2 && !isDefaultImport(d)) {
      const n = d2.name;
      return Node.is.generatedIdentifier(n) ? n : new Identifier(getSourceTextOfNodeFromSourceFile(sourceFile, n) || qc.idText(n));
    }
    if (d.kind === Syntax.ImportDeclaration && d.importClause) return getGeneratedNameForNode(d);
    if (d.kind === Syntax.ExportDeclaration && d.moduleSpecifier) return getGeneratedNameForNode(d);
    return;
  }
}
Identifier.prototype.kind = Identifier.kind;
qb.addMixins(Identifier, [qc.Declaration, qc.PrimaryExpression]);
export class GeneratedIdentifier extends Identifier implements qc.GeneratedIdentifier {
  _primaryExpressionBrand: any;
  _memberExpressionBrand: any;
  _leftHandSideExpressionBrand: any;
  _updateExpressionBrand: any;
  _unaryExpressionBrand: any;
  _expressionBrand: any;
  _declarationBrand: any;
}
export class IfStatement extends qc.Statement implements qc.IfStatement {
  static readonly kind = Syntax.IfStatement;
  expression: qc.Expression;
  thenStatement: qc.Statement;
  elseStatement?: qc.Statement;
  constructor(e: qc.Expression, t: qc.Statement, f?: qc.Statement) {
    super(true);
    this.expression = e;
    this.thenStatement = asEmbeddedStatement(t);
    this.elseStatement = asEmbeddedStatement(f);
  }
  update(e: qc.Expression, t: qc.Statement, f?: qc.Statement) {
    return this.expression !== e || this.thenStatement !== t || this.elseStatement !== f ? new IfStatement(e, t, f).updateFrom(this) : this;
  }
}
IfStatement.prototype.kind = IfStatement.kind;
export class ImportClause extends qc.NamedDeclaration implements qc.ImportClause {
  static readonly kind = Syntax.ImportClause;
  parent: ImportDeclaration;
  isTypeOnly: boolean;
  name?: Identifier;
  namedBindings?: qc.NamedImportBindings;
  constructor(n?: Identifier, b?: qc.NamedImportBindings, isTypeOnly = false) {
    super(true);
    this.name = n;
    this.namedBindings = b;
    this.isTypeOnly = isTypeOnly;
  }
  update(n?: Identifier, b?: qc.NamedImportBindings, isTypeOnly?: boolean) {
    return this.name !== n || this.namedBindings !== b || this.isTypeOnly !== isTypeOnly ? new ImportClause(n, b, isTypeOnly).updateFrom(this) : this;
  }
}
ImportClause.prototype.kind = ImportClause.kind;
export class ImportDeclaration extends qc.Statement implements qc.ImportDeclaration {
  static readonly kind = Syntax.ImportDeclaration;
  parent: SourceFile | ModuleBlock;
  importClause?: ImportClause;
  moduleSpecifier: qc.Expression;
  constructor(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, c: ImportClause | undefined, s: qc.Expression) {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.importClause = c;
    this.moduleSpecifier = s;
  }
  update(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, c: ImportClause | undefined, s: qc.Expression) {
    return this.decorators !== ds || this.modifiers !== ms || this.importClause !== c || this.moduleSpecifier !== s ? new ImportDeclaration(ds, ms, c, s).updateFrom(this) : this;
  }
}
ImportDeclaration.prototype.kind = ImportDeclaration.kind;
export class ImportEqualsDeclaration extends qc.DeclarationStatement implements qc.ImportEqualsDeclaration {
  static readonly kind = Syntax.ImportEqualsDeclaration;
  parent: SourceFile | ModuleBlock;
  name: Identifier;
  moduleReference: qc.ModuleReference;
  constructor(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, name: string | Identifier, r: qc.ModuleReference) {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(name);
    this.moduleReference = r;
  }
  update(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, name: Identifier, r: qc.ModuleReference) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== name || this.moduleReference !== r ? new ImportEqualsDeclaration(ds, ms, name, r).updateFrom(this) : this;
  }
}
ImportEqualsDeclaration.prototype.kind = ImportEqualsDeclaration.kind;
export class ImportSpecifier extends qc.NamedDeclaration implements qc.ImportSpecifier {
  static readonly kind = Syntax.ImportSpecifier;
  parent: NamedImports;
  propertyName?: Identifier;
  name: Identifier;
  constructor(p: Identifier | undefined, name: Identifier) {
    super(true);
    this.propertyName = p;
    this.name = name;
  }
  update(p: Identifier | undefined, name: Identifier) {
    return this.propertyName !== p || this.name !== name ? new ImportSpecifier(p, name).updateFrom(this) : this;
  }
}
ImportSpecifier.prototype.kind = ImportSpecifier.kind;
export class ImportTypeNode extends qc.NodeWithTypeArguments implements qc.ImportTypeNode {
  static readonly kind = Syntax.ImportType;
  isTypeOf?: boolean;
  argument: qc.TypeNode;
  qualifier?: qc.EntityName;
  constructor(a: qc.TypeNode, q?: qc.EntityName, ts?: readonly qc.TypeNode[], tof?: boolean) {
    super(true);
    this.argument = a;
    this.qualifier = q;
    this.typeArguments = parenthesize.typeParameters(ts);
    this.isTypeOf = tof;
  }
  update(a: qc.TypeNode, q?: qc.EntityName, ts?: readonly qc.TypeNode[], tof?: boolean) {
    return this.argument !== a || this.qualifier !== q || this.typeArguments !== ts || this.isTypeOf !== tof ? new ImportTypeNode(a, q, ts, tof).updateFrom(this) : this;
  }
}
ImportTypeNode.prototype.kind = ImportTypeNode.kind;
export class IndexedAccessTypeNode extends qc.TypeNode implements qc.IndexedAccessTypeNode {
  static readonly kind = Syntax.IndexedAccessType;
  objectType: qc.TypeNode;
  indexType: qc.TypeNode;
  constructor(o: qc.TypeNode, i: qc.TypeNode) {
    super(true);
    this.objectType = parenthesize.elementTypeMember(o);
    this.indexType = i;
  }
  update(o: qc.TypeNode, i: qc.TypeNode) {
    return this.objectType !== o || this.indexType !== i ? new IndexedAccessTypeNode(o, i).updateFrom(this) : this;
  }
}
IndexedAccessTypeNode.prototype.kind = IndexedAccessTypeNode.kind;
export class IndexSignatureDeclaration extends qc.SignatureDeclarationBase implements qc.IndexSignatureDeclaration {
  static readonly kind = Syntax.IndexSignature;
  parent: qc.ObjectTypeDeclaration;
  jsDocCache?: readonly qc.JSDocTag[];
  constructor(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], t: qc.TypeNode): IndexSignatureDeclaration {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.parameters = new Nodes(ps);
    this.type = t;
  }
  questionToken?: qc.QuestionToken | undefined;
  update(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], t: qc.TypeNode) {
    return this.parameters !== ps || this.type !== t || this.decorators !== ds || this.modifiers !== ms ? new IndexSignatureDeclaration(ds, ms, ps, t).updateFrom(this) : this;
  }
  _classElementBrand: any;
  _typeElementBrand: any;
}
IndexSignatureDeclaration.prototype.kind = IndexSignatureDeclaration.kind;
qb.addMixins(IndexSignatureDeclaration, [qc.ClassElement, qc.TypeElement]);
export class InferTypeNode extends qc.TypeNode implements qc.InferTypeNode {
  static readonly kind = Syntax.InferType;
  typeParameter: TypeParameterDeclaration;
  constructor(p: TypeParameterDeclaration) {
    super(true);
    this.typeParameter = p;
  }
  update(p: TypeParameterDeclaration) {
    return this.typeParameter !== p ? new InferTypeNode(p).updateFrom(this) : this;
  }
}
InferTypeNode.prototype.kind = InferTypeNode.kind;
export class InterfaceDeclaration extends qc.DeclarationStatement implements qc.InterfaceDeclaration {
  static readonly kind = Syntax.InterfaceDeclaration;
  name: Identifier;
  typeParameters?: Nodes<TypeParameterDeclaration>;
  heritageClauses?: Nodes<HeritageClause>;
  members: Nodes<qc.TypeElement>;
  constructor(
    ds: readonly Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    name: string | Identifier,
    ts: readonly TypeParameterDeclaration[] | undefined,
    hs: readonly HeritageClause[] | undefined,
    members: readonly qc.TypeElement[]
  ) {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(name);
    this.typeParameters = Nodes.from(ts);
    this.heritageClauses = Nodes.from(hs);
    this.members = new Nodes(members);
  }
  update(
    ds: readonly Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    name: Identifier,
    ts: readonly TypeParameterDeclaration[] | undefined,
    hs: readonly HeritageClause[] | undefined,
    members: readonly qc.TypeElement[]
  ) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== name || this.typeParameters !== ts || this.heritageClauses !== hs || this.members !== members
      ? new InterfaceDeclaration(ds, ms, name, ts, hs, members).updateFrom(this)
      : this;
  }
}
InterfaceDeclaration.prototype.kind = InterfaceDeclaration.kind;
qb.addMixins(InterfaceDeclaration, [qc.JSDocContainer]);
export class IntersectionTypeNode extends qc.UnionOrIntersectionTypeNode implements qc.IntersectionTypeNode {
  static readonly kind = Syntax.IntersectionType;
  types: Nodes<qc.TypeNode>;
  constructor(ts: readonly qc.TypeNode[]) {
    super(Syntax.IntersectionType, ts);
  }
  update(ts: Nodes<qc.TypeNode>) {
    return super.update(ts);
  }
}
IntersectionTypeNode.prototype.kind = IntersectionTypeNode.kind;
export class JSDoc extends Node implements qc.JSDoc {
  static readonly kind = Syntax.JSDocComment;
  parent: qc.HasJSDoc;
  tags?: Nodes<qc.JSDocTag>;
  comment?: string;
  constructor(c?: string, ts?: Nodes<qc.JSDocTag>) {
    super(true);
    this.comment = c;
    this.tags = ts;
  }
}
JSDoc.prototype.kind = JSDoc.kind;
export class JSDocAllType extends qc.JSDocType implements qc.JSDocAllType {
  static readonly kind = Syntax.JSDocAllType;
}
JSDocAllType.prototype.kind = JSDocAllType.kind;
export class JSDocAugmentsTag extends qc.JSDocTag implements qc.JSDocAugmentsTag {
  static readonly kind = Syntax.JSDocAugmentsTag;
  class: ExpressionWithTypeArguments & { expression: Identifier | qc.PropertyAccessEntityNameExpression };
  constructor(c: JSDocAugmentsTag['class'], s?: string) {
    super(Syntax.JSDocAugmentsTag, 'augments', s);
    this.class = c;
  }
}
JSDocAugmentsTag.prototype.kind = JSDocAugmentsTag.kind;
export class JSDocAuthorTag extends qc.JSDocTag implements qc.JSDocAuthorTag {
  static readonly kind = Syntax.JSDocAuthorTag;
  constructor(c?: string) {
    super(Syntax.JSDocAuthorTag, 'author', c);
  }
}
JSDocAuthorTag.prototype.kind = JSDocAuthorTag.kind;
export class JSDocCallbackTag extends qc.JSDocTag implements qc.JSDocCallbackTag {
  static readonly kind = Syntax.JSDocCallbackTag;
  parent: JSDoc;
  fullName?: JSDocNamespaceDeclaration | Identifier;
  name?: Identifier;
  typeExpression: JSDocSignature;
  constructor(f: JSDocNamespaceDeclaration | Identifier | undefined, n: Identifier | undefined, c: string | undefined, s: JSDocSignature) {
    super(Syntax.JSDocCallbackTag, 'callback', c);
    this.fullName = f;
    this.name = n;
    this.typeExpression = s;
  }
}
JSDocCallbackTag.prototype.kind = JSDocCallbackTag.kind;
qb.addMixins(JSDocCallbackTag, [qc.NamedDeclaration]);
export class JSDocClassTag extends qc.JSDocTag implements qc.JSDocClassTag {
  static readonly kind = Syntax.JSDocClassTag;
  constructor(c?: string) {
    super(Syntax.JSDocClassTag, 'class', c);
  }
}
JSDocClassTag.prototype.kind = JSDocClassTag.kind;
export class JSDocEnumTag extends qc.JSDocTag implements qc.JSDocEnumTag {
  static readonly kind = Syntax.JSDocEnumTag;
  parent: JSDoc;
  typeExpression?: JSDocTypeExpression;
  constructor(e?: JSDocTypeExpression, c?: string) {
    super(Syntax.JSDocEnumTag, 'enum', c);
    this.typeExpression = e;
  }
  _declarationBrand: any;
}
JSDocEnumTag.prototype.kind = JSDocEnumTag.kind;
qb.addMixins(JSDocEnumTag, [qc.Declaration]);
export class JSDocFunctionType extends qc.SignatureDeclarationBase implements qc.JSDocFunctionType {
  jsDocCache?: readonly qc.JSDocTag[];
  static readonly kind = Syntax.JSDocFunctionType;
  _jsDocTypeBrand: any;
  _typeNodeBrand: any;
}
JSDocFunctionType.prototype.kind = JSDocFunctionType.kind;
qb.addMixins(JSDocFunctionType, [qc.JSDocType]);
export class JSDocImplementsTag extends qc.JSDocTag implements qc.JSDocImplementsTag {
  static readonly kind = Syntax.JSDocImplementsTag;
  class: ExpressionWithTypeArguments & { expression: Identifier | qc.PropertyAccessEntityNameExpression };
  constructor(e: JSDocImplementsTag['class'], c?: string) {
    super(Syntax.JSDocImplementsTag, 'implements', c);
    this.class = e;
  }
}
JSDocImplementsTag.prototype.kind = JSDocImplementsTag.kind;
export class JSDocNamespaceDeclaration extends ModuleDeclaration {
  name: Identifier;
  body?: qc.JSDocNamespaceBody;
}
export class JSDocNonNullableType extends qc.JSDocType implements qc.JSDocNonNullableType {
  static readonly kind = Syntax.JSDocNonNullableType;
  type!: qc.TypeNode;
}
JSDocNonNullableType.prototype.kind = JSDocNonNullableType.kind;
export class JSDocNullableType extends qc.JSDocType implements qc.JSDocNullableType {
  static readonly kind = Syntax.JSDocNullableType;
  type!: qc.TypeNode;
}
JSDocNullableType.prototype.kind = JSDocNullableType.kind;
export class JSDocOptionalType extends qc.JSDocType implements qc.JSDocOptionalType {
  static readonly kind = Syntax.JSDocOptionalType;
  type!: qc.TypeNode;
}
JSDocOptionalType.prototype.kind = JSDocOptionalType.kind;
export class JSDocPropertyLikeTag extends qc.JSDocTag implements qc.JSDocPropertyLikeTag {
  parent: JSDoc;
  name: qc.EntityName;
  typeExpression?: JSDocTypeExpression;
  isNameFirst: boolean;
  isBracketed: boolean;
  constructor(kind: Syntax, tagName: 'arg' | 'argument' | 'param', e: JSDocTypeExpression | undefined, n: qc.EntityName, isNameFirst: boolean, isBracketed: boolean, c?: string) {
    super(kind, tagName, c);
    this.typeExpression = e;
    this.name = n;
    this.isNameFirst = isNameFirst;
    this.isBracketed = isBracketed;
  }
  _declarationBrand: any;
}
qb.addMixins(JSDocPropertyLikeTag, [qc.Declaration]);

export class JSDocParameterTag extends JSDocPropertyLikeTag implements qc.JSDocParameterTag {
  static readonly kind = Syntax.JSDocParameterTag;
  constructor(e: JSDocTypeExpression | undefined, n: qc.EntityName, isNameFirst: boolean, isBracketed: boolean, c?: string) {
    super(Syntax.JSDocParameterTag, 'param', e, n, isNameFirst, isBracketed, c);
  }
}
JSDocParameterTag.prototype.kind = JSDocParameterTag.kind;
export class JSDocPrivateTag extends qc.JSDocTag implements qc.JSDocPrivateTag {
  static readonly kind = Syntax.JSDocPrivateTag;
  constructor() {
    super(Syntax.JSDocPrivateTag, 'private');
  }
}
JSDocPrivateTag.prototype.kind = JSDocPrivateTag.kind;
export class JSDocPropertyTag extends JSDocPropertyLikeTag implements qc.JSDocPropertyTag {
  static readonly kind = Syntax.JSDocPropertyTag;
  constructor(e: JSDocTypeExpression | undefined, n: qc.EntityName, isNameFirst: boolean, isBracketed: boolean, c?: string) {
    super(Syntax.JSDocPropertyTag, 'param', e, n, isNameFirst, isBracketed, c);
  }
}
JSDocPropertyTag.prototype.kind = JSDocPropertyTag.kind;
export class JSDocProtectedTag extends qc.JSDocTag implements qc.JSDocProtectedTag {
  static readonly kind = Syntax.JSDocProtectedTag;
  constructor() {
    super(Syntax.JSDocProtectedTag, 'protected');
  }
}
JSDocProtectedTag.prototype.kind = JSDocProtectedTag.kind;
export class JSDocPublicTag extends qc.JSDocTag implements qc.JSDocPublicTag {
  static readonly kind = Syntax.JSDocPublicTag;
  constructor() {
    super(Syntax.JSDocPublicTag, 'public');
  }
}
JSDocPublicTag.prototype.kind = JSDocPublicTag.kind;
export class JSDocReadonlyTag extends qc.JSDocTag implements qc.JSDocReadonlyTag {
  static readonly kind = Syntax.JSDocReadonlyTag;
  constructor() {
    super(Syntax.JSDocReadonlyTag, 'readonly');
  }
}
JSDocReadonlyTag.prototype.kind = JSDocReadonlyTag.kind;
export class JSDocReturnTag extends qc.JSDocTag implements qc.JSDocReturnTag {
  static readonly kind = Syntax.JSDocReturnTag;
  typeExpression?: JSDocTypeExpression;
  constructor(e?: JSDocTypeExpression, c?: string) {
    super(Syntax.JSDocReturnTag, 'returns', c);
    this.typeExpression = e;
  }
}
JSDocReturnTag.prototype.kind = JSDocReturnTag.kind;
export class JSDocSignature extends qc.JSDocType implements qc.JSDocSignature {
  static readonly kind = Syntax.JSDocSignature;
  typeParameters?: readonly JSDocTemplateTag[];
  parameters: readonly JSDocParameterTag[];
  type?: JSDocReturnTag;
  constructor(ts: readonly JSDocTemplateTag[] | undefined, ps: readonly JSDocParameterTag[], t?: JSDocReturnTag) {
    super(true);
    this.typeParameters = ts;
    this.parameters = ps;
    this.type = t;
  }
}
JSDocSignature.prototype.kind = JSDocSignature.kind;
qb.addMixins(JSDocSignature, [qc.Declaration]);
export class JSDocTemplateTag extends qc.JSDocTag implements qc.JSDocTemplateTag {
  static readonly kind = Syntax.JSDocTemplateTag;
  constraint?: JSDocTypeExpression;
  typeParameters: Nodes<TypeParameterDeclaration>;
  constructor(c: JSDocTypeExpression | undefined, ts: readonly TypeParameterDeclaration[], s?: string) {
    super(Syntax.JSDocTemplateTag, 'template', s);
    this.constraint = c;
    this.typeParameters = Nodes.from(ts);
  }
}
JSDocTemplateTag.prototype.kind = JSDocTemplateTag.kind;
export class JSDocThisTag extends qc.JSDocTag implements qc.JSDocThisTag {
  static readonly kind = Syntax.JSDocThisTag;
  typeExpression?: JSDocTypeExpression;
  constructor(e?: JSDocTypeExpression) {
    super(Syntax.JSDocThisTag, 'this');
    this.typeExpression = e;
  }
}
JSDocThisTag.prototype.kind = JSDocThisTag.kind;
export class JSDocTypedefTag extends qc.JSDocTag implements qc.JSDocTypedefTag {
  static readonly kind = Syntax.JSDocTypedefTag;
  parent: JSDoc;
  fullName?: JSDocNamespaceDeclaration | Identifier;
  name?: Identifier;
  typeExpression?: JSDocTypeExpression | JSDocTypeLiteral;
  constructor(f?: JSDocNamespaceDeclaration | Identifier, n?: Identifier, c?: string, t?: JSDocTypeExpression | JSDocTypeLiteral) {
    super(Syntax.JSDocTypedefTag, 'typedef', c);
    this.fullName = f;
    this.name = n;
    this.typeExpression = t;
  }
}
JSDocTypedefTag.prototype.kind = JSDocTypedefTag.kind;
qb.addMixins(JSDocTypedefTag, [qc.NamedDeclaration]);
export class JSDocTypeExpression extends qc.TypeNode implements qc.JSDocTypeExpression {
  static readonly kind = Syntax.JSDocTypeExpression;
  type: qc.TypeNode;
  constructor(t: qc.TypeNode) {
    super(true);
    this.type = t;
  }
}
JSDocTypeExpression.prototype.kind = JSDocTypeExpression.kind;
export class JSDocTypeLiteral extends qc.JSDocType implements qc.JSDocTypeLiteral {
  static readonly kind = Syntax.JSDocTypeLiteral;
  jsDocPropertyTags?: readonly JSDocPropertyLikeTag[];
  isArrayType?: boolean;
  constructor(ts?: readonly JSDocPropertyLikeTag[], isArray?: boolean) {
    super(true);
    this.jsDocPropertyTags = ts;
    this.isArrayType = isArray;
  }
}
JSDocTypeLiteral.prototype.kind = JSDocTypeLiteral.kind;
export class JSDocTypeTag extends qc.JSDocTag implements qc.JSDocTypeTag {
  static readonly kind = Syntax.JSDocTypeTag;
  typeExpression: JSDocTypeExpression;
  constructor(e: JSDocTypeExpression, c?: string) {
    super(Syntax.JSDocTypeTag, 'type', c);
    this.typeExpression = e;
  }
}
JSDocTypeTag.prototype.kind = JSDocTypeTag.kind;
export class JSDocUnknownType extends qc.JSDocType implements qc.JSDocUnknownType {
  static readonly kind = Syntax.JSDocUnknownType;
}
JSDocUnknownType.prototype.kind = JSDocUnknownType.kind;
export class JSDocVariadicType extends qc.JSDocType implements qc.JSDocVariadicType {
  static readonly kind = Syntax.JSDocVariadicType;
  type: qc.TypeNode;
  constructor(t: qc.TypeNode) {
    super(true);
    this.type = t;
  }
  update(t: qc.TypeNode): JSDocVariadicType {
    return this.type !== t ? new JSDocVariadicType(t).updateFrom(this) : this;
  }
}
JSDocVariadicType.prototype.kind = JSDocVariadicType.kind;
export class JsxAttribute extends qc.ObjectLiteralElement implements qc.JsxAttribute {
  static readonly kind = Syntax.JsxAttribute;
  parent: JsxAttributes;
  name: Identifier;
  initializer?: StringLiteral | JsxExpression;
  createJsxAttribute(name: Identifier, initializer: StringLiteral | JsxExpression) {
    super(true);
    this.name = name;
    this.initializer = initializer;
  }
  update(name: Identifier, initializer: StringLiteral | JsxExpression) {
    return this.name !== name || this.initializer !== initializer ? new JsxAttribute(name, initializer).updateFrom(this) : this;
  }
}
JsxAttribute.prototype.kind = JsxAttribute.kind;
export class JsxAttributes extends Node implements qc.JsxAttributes {
  static readonly kind = Syntax.JsxAttributes;
  parent: JsxOpeningLikeElement;
  createJsxAttributes(properties: readonly JsxAttributeLike[]) {
    super(true);
    this.properties = new Nodes(properties);
  }
  update(properties: readonly JsxAttributeLike[]) {
    return this.properties !== properties ? new JsxAttributes(properties).updateFrom(this) : this;
  }
}
JsxAttributes.prototype.kind = JsxAttributes.kind;
export class JsxClosingElement extends Node implements qc.JsxClosingElement {
  static readonly kind = Syntax.JsxClosingElement;
  parent: JsxElement;
  tagName: qc.JsxTagNameExpression;
  createJsxClosingElement(tagName: qc.JsxTagNameExpression) {
    super(true);
    this.tagName = tagName;
  }
  update(tagName: qc.JsxTagNameExpression) {
    return this.tagName !== tagName ? new JsxClosingElement(tagName).updateFrom(this) : this;
  }
}
JsxClosingElement.prototype.kind = JsxClosingElement.kind;
export class JsxClosingFragment extends qc.Expression implements qc.JsxClosingFragment {
  static readonly kind = Syntax.JsxClosingFragment;
  parent: JsxFragment;
  createJsxJsxClosingFragment() {
    super(true);
  }
}
JsxClosingFragment.prototype.kind = JsxClosingFragment.kind;
export class JsxElement extends qc.PrimaryExpression implements qc.JsxElement {
  static readonly kind = Syntax.JsxElement;
  openingElement: JsxOpeningElement;
  children: Nodes<JsxChild>;
  closingElement: JsxClosingElement;
  constructor(o: JsxOpeningElement, children: readonly JsxChild[], c: JsxClosingElement) {
    super(true);
    this.openingElement = o;
    this.children = new Nodes(children);
    this.closingElement = c;
  }
  update(o: JsxOpeningElement, children: readonly JsxChild[], c: JsxClosingElement) {
    return this.openingElement !== o || this.children !== children || this.closingElement !== c ? new JsxElement(o, children, c).updateFrom(this) : this;
  }
  static createExpression(
    jsxFactoryEntity: EntityName | undefined,
    reactNamespace: string,
    tagName: qc.Expression,
    props: qc.Expression,
    children: readonly qc.Expression[],
    parentElement: JsxOpeningLikeElement,
    location: TextRange
  ): qc.LeftHandSideExpression {
    const argumentsList = [tagName];
    if (props) argumentsList.push(props);
    if (children && children.length > 0) {
      if (!props) argumentsList.push(createNull());
      if (children.length > 1) {
        for (const child of children) {
          startOnNewLine(child);
          argumentsList.push(child);
        }
      } else argumentsList.push(children[0]);
    }
    return setRange(new CallExpression(createJsxFactoryExpression(jsxFactoryEntity, reactNamespace, parentElement), undefined, argumentsList), location);
  }
}
JsxElement.prototype.kind = JsxElement.kind;
export class JsxExpression extends qc.Expression implements qc.JsxExpression {
  static readonly kind = Syntax.JsxExpression;
  parent: JsxElement | JsxAttributeLike;
  dot3Token?: qc.Token<Syntax.qc.Dot3Token>;
  expression?: qc.Expression;
  createJsxExpression(dot3Token: qc.Dot3Token | undefined, expression: qc.Expression | undefined) {
    super(true);
    this.dot3Token = dot3Token;
    this.expression = expression;
  }
  update(expression: qc.Expression | undefined) {
    return this.expression !== expression ? new JsxExpression(this.dot3Token, expression).updateFrom(this) : this;
  }
}
JsxExpression.prototype.kind = JsxExpression.kind;
export class JsxFragment extends qc.PrimaryExpression implements qc.JsxFragment {
  static readonly kind = Syntax.JsxFragment;
  openingFragment: JsxOpeningFragment;
  children: Nodes<JsxChild>;
  closingFragment: JsxClosingFragment;
  createJsxFragment(openingFragment: JsxOpeningFragment, children: readonly JsxChild[], closingFragment: JsxClosingFragment) {
    super(true);
    this.openingFragment = openingFragment;
    this.children = new Nodes(children);
    this.closingFragment = closingFragment;
  }
  update(openingFragment: JsxOpeningFragment, children: readonly JsxChild[], closingFragment: JsxClosingFragment) {
    return this.openingFragment !== openingFragment || this.children !== children || this.closingFragment !== closingFragment
      ? new JsxFragment(openingFragment, children, closingFragment).updateFrom(this)
      : this;
  }
  createExpressionForJsxFragment(
    jsxFactoryEntity: EntityName | undefined,
    reactNamespace: string,
    children: readonly qc.Expression[],
    parentElement: JsxOpeningFragment,
    location: TextRange
  ): qc.LeftHandSideExpression {
    const tagName = createPropertyAccess(createReactNamespace(reactNamespace, parentElement), 'Fragment');
    const argumentsList = [<qc.Expression>tagName];
    argumentsList.push(createNull());
    if (children && children.length > 0) {
      if (children.length > 1) {
        for (const child of children) {
          startOnNewLine(child);
          argumentsList.push(child);
        }
      } else argumentsList.push(children[0]);
    }
    return setRange(new CallExpression(createJsxFactoryExpression(jsxFactoryEntity, reactNamespace, parentElement), undefined, argumentsList), location);
  }
}
JsxFragment.prototype.kind = JsxFragment.kind;
export class JsxOpeningElement extends qc.Expression implements qc.JsxOpeningElement {
  static readonly kind = Syntax.JsxOpeningElement;
  parent: JsxElement;
  tagName: qc.JsxTagNameExpression;
  typeArguments?: Nodes<qc.TypeNode>;
  attributes: JsxAttributes;
  constructor(n: qc.JsxTagNameExpression, ts: readonly qc.TypeNode[] | undefined, s: JsxAttributes) {
    super(true);
    this.tagName = n;
    this.typeArguments = Nodes.from(ts);
    this.attributes = a;
  }
  update(n: qc.JsxTagNameExpression, ts: readonly qc.TypeNode[] | undefined, s: JsxAttributes) {
    return this.tagName !== n || this.typeArguments !== ts || this.attributes !== s ? new JsxOpeningElement(n, ts, s).updateFrom(this) : this;
  }
}
JsxOpeningElement.prototype.kind = JsxOpeningElement.kind;
export class JsxOpeningFragment extends qc.Expression implements qc.JsxOpeningFragment {
  static readonly kind = Syntax.JsxOpeningFragment;
  parent: JsxFragment;
  createJsxOpeningFragment() {
    super(true);
  }
  createReactNamespace(reactNamespace: string, parent: JsxOpeningLikeElement | JsxOpeningFragment) {
    const react = new Identifier(reactNamespace || 'React');
    react.flags &= ~NodeFlags.Synthesized;
    react.parent = Node.get.parseTreeOf(parent);
    return react;
  }
  createJsxFactoryExpressionFromEntityName(jsxFactory: qc.EntityName, parent: JsxOpeningLikeElement | JsxOpeningFragment): qc.Expression {
    if (Node.is.kind(QualifiedName, jsxFactory)) {
      const left = createJsxFactoryExpressionFromEntityName(jsxFactory.left, parent);
      const right = new Identifier(qc.idText(jsxFactory.right));
      right.escapedText = jsxFactory.right.escapedText;
      return createPropertyAccess(left, right);
    }
    return createReactNamespace(qc.idText(jsxFactory), parent);
  }
  createJsxFactoryExpression(jsxFactoryEntity: EntityName | undefined, reactNamespace: string, parent: JsxOpeningLikeElement | JsxOpeningFragment): qc.Expression {
    return jsxFactoryEntity ? createJsxFactoryExpressionFromEntityName(jsxFactoryEntity, parent) : createPropertyAccess(createReactNamespace(reactNamespace, parent), 'createElement');
  }
}
JsxOpeningFragment.prototype.kind = JsxOpeningFragment.kind;
export class JsxSelfClosingElement extends qc.PrimaryExpression implements qc.JsxSelfClosingElement {
  static readonly kind = Syntax.JsxSelfClosingElement;
  tagName: qc.JsxTagNameExpression;
  typeArguments?: Nodes<qc.TypeNode>;
  attributes: JsxAttributes;
  constructor(n: qc.JsxTagNameExpression, ts: readonly qc.TypeNode[] | undefined, a: JsxAttributes) {
    super(true);
    this.tagName = n;
    this.typeArguments = Nodes.from(ts);
    this.attributes = a;
  }
  update(n: qc.JsxTagNameExpression, ts: readonly qc.TypeNode[] | undefined, a: JsxAttributes) {
    return this.tagName !== n || this.typeArguments !== ts || this.attributes !== a ? new JsxSelfClosingElement(n, ts, s).updateFrom(this) : this;
  }
}
JsxSelfClosingElement.prototype.kind = JsxSelfClosingElement.kind;
export class JsxSpreadAttribute extends qc.ObjectLiteralElement implements qc.JsxSpreadAttribute {
  static readonly kind = Syntax.JsxSpreadAttribute;
  parent: JsxAttributes;
  expression: qc.Expression;
  constructor(e: qc.Expression) {
    super(true);
    this.expression = e;
  }
  update(e: qc.Expression) {
    return this.expression !== e ? new JsxSpreadAttribute(e).updateFrom(this) : this;
  }
}
JsxSpreadAttribute.prototype.kind = JsxSpreadAttribute.kind;
export class JsxText extends LiteralLikeNode implements qc.JsxText {
  static readonly kind = Syntax.JsxText;
  onlyTriviaWhitespaces: boolean;
  parent: JsxElement;
  constructor(t: string, onlyTriviaWhitespaces?: boolean) {
    super(true);
    this.text = t;
    this.onlyTriviaWhitespaces = !!onlyTriviaWhitespaces;
  }
  update(text: string, onlyTriviaWhitespaces?: boolean) {
    return this.text !== text || this.onlyTriviaWhitespaces !== onlyTriviaWhitespaces ? new JsxText(text, onlyTriviaWhitespaces).updateFrom(this) : this;
  }
}
JsxText.prototype.kind = JsxText.kind;
export class KeywordTypeNode extends qc.TypeNode implements qc.KeywordTypeNode {
  kind:
    | Syntax.AnyKeyword
    | Syntax.UnknownKeyword
    | Syntax.NumberKeyword
    | Syntax.BigIntKeyword
    | Syntax.ObjectKeyword
    | Syntax.BooleanKeyword
    | Syntax.StringKeyword
    | Syntax.SymbolKeyword
    | Syntax.ThisKeyword
    | Syntax.VoidKeyword
    | Syntax.UndefinedKeyword
    | Syntax.NullKeyword
    | Syntax.NeverKeyword;
  constructor(k: KeywordTypeNode['kind']) {
    super(true, k);
  }
}
KeywordTypeNode.prototype.kind = KeywordTypeNode.kind;
export class LabeledStatement extends qc.Statement implements qc.LabeledStatement {
  //, JSDocContainer {
  static readonly kind = Syntax.LabeledStatement;
  label: Identifier;
  statement: qc.Statement;
  createLabel(label: string | Identifier, statement: qc.Statement) {
    super(true);
    this.label = asName(label);
    this.statement = asEmbeddedStatement(statement);
  }
  update(label: Identifier, statement: qc.Statement) {
    return this.label !== label || this.statement !== statement ? new create(label, statement).updateFrom(this) : this;
  }
}
LabeledStatement.prototype.kind = LabeledStatement.kind;
export class LiteralTypeNode extends qc.TypeNode implements qc.LiteralTypeNode {
  static readonly kind = Syntax.LiteralType;
  literal: BooleanLiteral | LiteralExpression | PrefixUnaryExpression;
  constructor(l: LiteralTypeNode['literal']) {
    super(true);
    this.literal = l;
  }
  update(l: LiteralTypeNode['literal']) {
    return this.literal !== l ? new LiteralTypeNode(l).updateFrom(this) : this;
  }
}
LiteralTypeNode.prototype.kind = LiteralTypeNode.kind;
export class MappedTypeNode extends qc.TypeNode implements qc.MappedTypeNode {
  static readonly kind = Syntax.MappedType;
  readonlyToken?: ReadonlyToken | PlusToken | MinusToken;
  typeParameter: TypeParameterDeclaration;
  questionToken?: qc.QuestionToken | PlusToken | MinusToken;
  type?: qc.TypeNode;
  constructor(r: ReadonlyToken | PlusToken | MinusToken | undefined, p: TypeParameterDeclaration, q?: qc.QuestionToken | PlusToken | MinusToken, t?: qc.TypeNode) {
    super(true);
    this.readonlyToken = r;
    this.typeParameter = p;
    this.questionToken = q;
    this.type = t;
  }
  update(r: ReadonlyToken | PlusToken | MinusToken | undefined, p: TypeParameterDeclaration, q?: qc.QuestionToken | PlusToken | MinusToken, t?: qc.TypeNode) {
    return this.readonlyToken !== r || this.typeParameter !== p || this.questionToken !== q || this.type !== t ? new MappedTypeNode(r, p, q, t).updateFrom(this) : this;
  }
}
MappedTypeNode.prototype.kind = MappedTypeNode.kind;
qb.addMixins(MappedTypeNode, [Declaration]);
export class MergeDeclarationMarker extends qc.Statement implements qc.MergeDeclarationMarker {
  static readonly kind: Syntax.MergeDeclarationMarker;
  createMergeDeclarationMarker(original: Node) {
    super(true);
    this.emitNode = {} as EmitNode;
    this.original = original;
  }
}
MergeDeclarationMarker.prototype.kind = MergeDeclarationMarker.kind;
export class MetaProperty extends qc.PrimaryExpression implements qc.MetaProperty {
  static readonly kind = Syntax.MetaProperty;
  keywordToken: Syntax.NewKeyword | Syntax.ImportKeyword;
  name: Identifier;
  createMetaProperty(keywordToken: MetaProperty['keywordToken'], name: Identifier) {
    super(true);
    this.keywordToken = keywordToken;
    this.name = name;
  }
  update(name: Identifier) {
    return this.name !== name ? new create(this.keywordToken, name).updateFrom(this) : this;
  }
}
MetaProperty.prototype.kind = MetaProperty.kind;
export class MethodDeclaration extends Node implements qc.MethodDeclaration {
  //FunctionLikeDeclarationBase, qc.ClassElement, ObjectLiteralElement, JSDocContainer {
  static readonly kind = Syntax.MethodDeclaration;
  parent: ClassLikeDeclaration | ObjectLiteralExpression;
  name: qc.PropertyName;
  body?: qc.FunctionBody;
  constructor(
    ds: readonly Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    a: qc.AsteriskToken | undefined,
    p: string | qc.PropertyName,
    q: qc.QuestionToken | undefined,
    ts: readonly TypeParameterDeclaration[] | undefined,
    ps: readonly ParameterDeclaration[],
    t?: qc.TypeNode,
    b?: Block
  ) {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.asteriskToken = a;
    this.name = asName(p);
    this.questionToken = q;
    this.typeParameters = Nodes.from(ts);
    this.parameters = new Nodes(ps);
    this.type = t;
    this.body = b;
  }
  update(
    n: MethodDeclaration,
    ds: readonly Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    a: qc.AsteriskToken | undefined,
    p: qc.PropertyName,
    q: qc.QuestionToken | undefined,
    ts: readonly TypeParameterDeclaration[] | undefined,
    ps: readonly ParameterDeclaration[],
    t?: qc.TypeNode,
    b?: Block
  ) {
    return this.decorators !== ds ||
      this.modifiers !== ms ||
      this.asteriskToken !== a ||
      this.name !== p ||
      this.questionToken !== q ||
      this.typeParameters !== ts ||
      this.parameters !== ps ||
      this.type !== t ||
      this.body !== b
      ? new MethodDeclaration(ds, ms, a, p, q, ts, ps, t, b).updateFrom(n)
      : n;
  }
}
MethodDeclaration.prototype.kind = MethodDeclaration.kind;
export class MethodSignature extends Node implements qc.MethodSignature {
  //qc.SignatureDeclarationBase, TypeElement {
  static readonly kind = Syntax.MethodSignature;
  parent: qc.ObjectTypeDeclaration;
  name: qc.PropertyName;
  constructor(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t: qc.TypeNode | undefined, p: string | qc.PropertyName, q?: qc.QuestionToken) {
    const n = SignatureDeclaration.create(Syntax.MethodSignature, ts, ps, t) as MethodSignature;
    this.name = asName(p);
    this.questionToken = q;
  }
  update(ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t: qc.TypeNode | undefined, p: qc.PropertyName, q?: qc.QuestionToken) {
    return this.typeParameters !== ts || this.parameters !== ps || this.type !== t || this.name !== p || this.questionToken !== q ? new MethodSignature(ts, ps, t, p, q).updateFrom(this) : this;
  }
}
MethodSignature.prototype.kind = MethodSignature.kind;
export class MissingDeclaration extends qc.DeclarationStatement implements qc.MissingDeclaration {
  static readonly kind = Syntax.MissingDeclaration;
  name?: Identifier;
}
MissingDeclaration.prototype.kind = MissingDeclaration.kind;
export class ModuleBlock extends Node implements qc.ModuleBlock {
  //}, Statement {
  static readonly kind = Syntax.ModuleBlock;
  parent: ModuleDeclaration;
  statements: Nodes<qc.Statement>;
  createModuleBlock(statements: readonly qc.Statement[]) {
    super(true);
    this.statements = new Nodes(statements);
  }
  update(statements: readonly qc.Statement[]) {
    return this.statements !== statements ? new create(statements).updateFrom(this) : this;
  }
}
ModuleBlock.prototype.kind = ModuleBlock.kind;
export class ModuleDeclaration extends qc.DeclarationStatement implements qc.ModuleDeclaration {
  //}, JSDocContainer {
  static readonly kind = Syntax.ModuleDeclaration;
  parent: ModuleBody | SourceFile;
  name: ModuleName;
  body?: ModuleBody | JSDocNamespaceDeclaration;
  createModuleDeclaration(decorators: readonly Decorator[] | undefined, modifiers: readonly Modifier[] | undefined, name: ModuleName, body: ModuleBody | undefined, flags = NodeFlags.None) {
    super(true);
    this.flags |= flags & (NodeFlags.Namespace | NodeFlags.NestedNamespace | NodeFlags.GlobalAugmentation);
    this.decorators = Nodes.from(decorators);
    this.modifiers = Nodes.from(modifiers);
    this.name = name;
    this.body = body;
  }
  update(decorators: readonly Decorator[] | undefined, modifiers: readonly Modifier[] | undefined, name: ModuleName, body: ModuleBody | undefined) {
    return this.decorators !== decorators || this.modifiers !== modifiers || this.name !== name || this.body !== body
      ? new create(decorators, modifiers, name, body, this.flags).updateFrom(this)
      : this;
  }
}
ModuleDeclaration.prototype.kind = ModuleDeclaration.kind;
export class NamedExports extends Node implements qc.NamedExports {
  static readonly kind = Syntax.NamedExports;
  parent: ExportDeclaration;
  elements: Nodes<ExportSpecifier>;
  constructor(es: readonly ExportSpecifier[]) {
    super(true);
    this.elements = new Nodes(es);
  }
  update(es: readonly ExportSpecifier[]) {
    return this.elements !== es ? new NamedExports(es).updateFrom(this) : this;
  }
}
NamedExports.prototype.kind = NamedExports.kind;
export class NamedImports extends Node implements qc.NamedImports {
  static readonly kind = Syntax.NamedImports;
  parent: ImportClause;
  elements: Nodes<ImportSpecifier>;
  constructor(es: readonly ImportSpecifier[]) {
    super(true);
    this.elements = new Nodes(es);
  }
  update(es: readonly ImportSpecifier[]) {
    return this.elements !== es ? new NamedImports(es).updateFrom(this) : this;
  }
}
NamedImports.prototype.kind = NamedImports.kind;
export class NamedTupleMember extends qc.TypeNode implements qc.NamedTupleMember {
  static readonly kind = Syntax.NamedTupleMember;
  dot3Token?: qc.Token<Syntax.Dot3Token>;
  name: Identifier;
  questionToken?: qc.Token<Syntax.QuestionToken>;
  type: qc.TypeNode;
  constructor(d: qc.Token<Syntax.Dot3Token> | undefined, i: Identifier, q: qc.Token<Syntax.QuestionToken> | undefined, t: qc.TypeNode) {
    super(true);
    this.dot3Token = d;
    this.name = i;
    this.questionToken = q;
    this.type = t;
  }
  update(d: qc.Token<Syntax.Dot3Token> | undefined, i: Identifier, q: qc.Token<Syntax.QuestionToken> | undefined, t: qc.TypeNode) {
    return this.dot3Token !== d || this.name !== i || this.questionToken !== q || this.type !== t ? new NamedTupleMember(d, i, q, t).updateFrom(this) : this;
  }
}
NamedTupleMember.prototype.kind = NamedTupleMember.kind;
qb.addMixins(NamedTupleMember, [qc.Declaration, qc.JSDocContainer]);
export class NamespaceExport extends qc.NamedDeclaration implements qc.NamespaceExport {
  static readonly kind = Syntax.NamespaceExport;
  parent: ExportDeclaration;
  name: Identifier;
  constructor(n: Identifier) {
    super(true);
    this.name = n;
  }
  update(n: Identifier) {
    return this.name !== n ? new NamespaceExport(n).updateFrom(this) : this;
  }
}
NamespaceExport.prototype.kind = NamespaceExport.kind;
export class NamespaceExportDeclaration extends qc.DeclarationStatement implements qc.NamespaceExportDeclaration {
  static readonly kind = Syntax.NamespaceExportDeclaration;
  name: Identifier;
  constructor(n: string | Identifier) {
    super(true);
    this.name = asName(n);
  }
  update(n: Identifier) {
    return this.name !== n ? new NamespaceExportDeclaration(n).updateFrom(this) : this;
  }
}
NamespaceExportDeclaration.prototype.kind = NamespaceExportDeclaration.kind;
export class NamespaceImport extends qc.NamedDeclaration implements qc.NamespaceImport {
  static readonly kind = Syntax.NamespaceImport;
  parent: ImportClause;
  name: Identifier;
  constructor(n: Identifier) {
    super(true);
    this.name = n;
  }
  update(n: Identifier) {
    return this.name !== n ? new NamespaceImport(n).updateFrom(this) : this;
  }
}
NamespaceImport.prototype.kind = NamespaceImport.kind;
export class NewExpression extends qc.PrimaryExpression implements qc.NewExpression {
  static readonly kind = Syntax.NewExpression;
  expression: qc.LeftHandSideExpression;
  typeArguments?: Nodes<qc.TypeNode>;
  arguments?: Nodes<qc.Expression>;
  constructor(e: qc.Expression, ts?: readonly qc.TypeNode[], a?: readonly qc.Expression[]) {
    super(true);
    this.expression = parenthesize.forNew(e);
    this.typeArguments = Nodes.from(ts);
    this.arguments = a ? parenthesize.listElements(new Nodes(a)) : undefined;
  }
  update(e: qc.Expression, ts?: readonly qc.TypeNode[], a?: readonly qc.Expression[]) {
    return this.expression !== e || this.typeArguments !== ts || this.arguments !== a ? new NewExpression(e, ts, a).updateFrom(this) : this;
  }
  _declarationBrand: any;
}
NewExpression.prototype.kind = NewExpression.kind;
qb.addMixins(NewExpression, [qc.Declaration]);
export class NonNullExpression extends qc.LeftHandSideExpression implements qc.NonNullExpression {
  static readonly kind = Syntax.NonNullExpression;
  expression: qc.Expression;
  constructor(e: qc.Expression) {
    super(true);
    this.expression = parenthesize.forAccess(e);
  }
  update(e: qc.Expression) {
    if (Node.is.nonNullChain(this)) return this.update(e);
    return this.expression !== e ? new NonNullExpression(e).updateFrom(this) : this;
  }
}
NonNullExpression.prototype.kind = NonNullExpression.kind;
export class NonNullChain extends NonNullExpression implements qc.NonNullChain {
  constructor(e: qc.Expression) {
    super();
    this.flags |= NodeFlags.OptionalChain;
    this.expression = parenthesize.forAccess(e);
  }
  update(e: qc.Expression) {
    qb.assert(!!(this.flags & NodeFlags.OptionalChain));
    return this.expression !== e ? new NonNullChain(e).updateFrom(this) : this;
  }
  _optionalChainBrand: any;
}
NonNullChain.prototype.kind = NonNullChain.kind;
export class NoSubstitutionLiteral extends qc.LiteralExpression implements qc.NoSubstitutionLiteral {
  //, TemplateLiteralLikeNode, Declaration {
  static readonly kind = Syntax.NoSubstitutionLiteral;
  templateFlags?: TokenFlags;
  constructor(t: string, raw?: string) {
    return Node.createTemplateLiteralLike(Syntax.NoSubstitutionLiteral, t, raw) as NoSubstitutionLiteral;
  }
}
NoSubstitutionLiteral.prototype.kind = NoSubstitutionLiteral.kind;
export class NotEmittedStatement extends qc.Statement implements qc.NotEmittedStatement {
  static readonly kind = Syntax.NotEmittedStatement;
  createNotEmittedStatement(original: Node) {
    super(true);
    this.original = original;
    setRange(this, original);
  }
}
NotEmittedStatement.prototype.kind = NotEmittedStatement.kind;
export class NumericLiteral extends qc.LiteralExpression implements qc.NumericLiteral {
  //, Declaration {
  static readonly kind = Syntax.NumericLiteral;
  numericLiteralFlags: TokenFlags;
  constructor(t: string, fs: TokenFlags = TokenFlags.None) {
    super(true);
    this.text = t;
    this.numericLiteralFlags = fs;
  }
  name(name: string | qb.__String) {
    return (+name).toString() === name;
  }
}
NumericLiteral.prototype.kind = NumericLiteral.kind;
export class ObjectBindingPattern extends Node implements qc.ObjectBindingPattern {
  static readonly kind = Syntax.ObjectBindingPattern;
  parent: VariableDeclaration | ParameterDeclaration | BindingElement;
  elements: Nodes<BindingElement>;
  constructor(es: readonly BindingElement[]) {
    super(true);
    this.elements = new Nodes(es);
  }
  update(es: readonly BindingElement[]) {
    return this.elements !== es ? new ObjectBindingPattern(es).updateFrom(this) : this;
  }
}
ObjectBindingPattern.prototype.kind = ObjectBindingPattern.kind;
export class ObjectLiteralExpression extends ObjectLiteralExpressionBase<ObjectLiteralElementLike> implements qc.ObjectLiteralExpression {
  static readonly kind = Syntax.ObjectLiteralExpression;
  multiLine?: boolean;
  createObjectLiteral(properties?: readonly ObjectLiteralElementLike[], multiLine?: boolean) {
    super(true);
    this.properties = new Nodes(properties);
    if (multiLine) this.multiLine = true;
  }
  update(properties: readonly ObjectLiteralElementLike[]) {
    return this.properties !== properties ? new create(properties, this.multiLine).updateFrom(this) : this;
  }
}
ObjectLiteralExpression.prototype.kind = ObjectLiteralExpression.kind;
export class OmittedExpression extends qc.Expression implements qc.OmittedExpression {
  static readonly kind = Syntax.OmittedExpression;
  createOmittedExpression() {
    super(true);
  }
}
OmittedExpression.prototype.kind = OmittedExpression.kind;
export class OptionalTypeNode extends qc.TypeNode implements qc.OptionalTypeNode {
  static readonly kind = Syntax.OptionalType;
  type: qc.TypeNode;
  constructor(t: qc.TypeNode) {
    super(true);
    this.type = parenthesize.arrayTypeMember(t);
  }
  update(t: qc.TypeNode): OptionalTypeNode {
    return this.type !== t ? new OptionalTypeNode(t).updateFrom(this) : this;
  }
}
OptionalTypeNode.prototype.kind = OptionalTypeNode.kind;
export namespace OuterExpression {
  export function isOuterExpression(this: Node, kinds = OuterExpressionKinds.All): this is OuterExpression {
    switch (this.kind) {
      case Syntax.ParenthesizedExpression:
        return (kinds & OuterExpressionKinds.Parentheses) !== 0;
      case Syntax.TypeAssertionExpression:
      case Syntax.AsExpression:
        return (kinds & OuterExpressionKinds.TypeAssertions) !== 0;
      case Syntax.NonNullExpression:
        return (kinds & OuterExpressionKinds.NonNullAssertions) !== 0;
      case Syntax.PartiallyEmittedExpression:
        return (kinds & OuterExpressionKinds.PartiallyEmittedExpressions) !== 0;
    }
    return false;
  }
  export function skipOuterExpressions(this: qc.Expression, kinds?: OuterExpressionKinds): qc.Expression;
  export function skipOuterExpressions(this: Node, kinds?: OuterExpressionKinds): Node;
  export function skipOuterExpressions(this: Node, kinds = OuterExpressionKinds.All) {
    while (isOuterExpression(this, kinds)) {
      this = this.expression;
    }
    return this;
  }
  export function skipAssertions(this: qc.Expression): qc.Expression;
  export function skipAssertions(this: Node): Node;
  export function skipAssertions(this: Node): Node {
    return skipOuterExpressions(this, OuterExpressionKinds.Assertions);
  }
  export function updateOuterExpression(o: OuterExpression, e: qc.Expression) {
    switch (o.kind) {
      case Syntax.ParenthesizedExpression:
        return o.update(e);
      case Syntax.TypeAssertionExpression:
        return o.update(o.type, e);
      case Syntax.AsExpression:
        return o.update(e, o.type);
      case Syntax.NonNullExpression:
        return o.update(e);
      case Syntax.PartiallyEmittedExpression:
        return o.update(e);
    }
  }
  export function isIgnorableParen(this: qc.Expression) {
    return (
      this.kind === Syntax.ParenthesizedExpression &&
      isSynthesized(this) &&
      isSynthesized(getSourceMapRange(this)) &&
      isSynthesized(getCommentRange(this)) &&
      !some(getSyntheticLeadingComments(this)) &&
      !some(getSyntheticTrailingComments(this))
    );
  }
  export function recreateOuterExpressions(outerExpression: qc.Expression | undefined, innerExpression: qc.Expression, kinds = OuterExpressionKinds.All): qc.Expression {
    if (outerExpression && isOuterExpression(outerExpression, kinds) && !isIgnorableParen(outerExpression))
      return outerExpression.update(recreateOuterExpressions(outerExpression.expression, innerExpression));
    return innerExpression;
  }
}
export class ParameterDeclaration extends qc.NamedDeclaration implements qc.ParameterDeclaration {
  //}, JSDocContainer {
  static readonly kind = Syntax.Parameter;
  parent: SignatureDeclaration;
  dot3Token?: qc.Dot3Token;
  name: qc.BindingName;
  questionToken?: qc.QuestionToken;
  type?: qc.TypeNode;
  initializer?: qc.Expression;
  createParameter(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    dot3Token: qc.Dot3Token | undefined,
    name: string | qc.BindingName,
    questionToken?: qc.QuestionToken,
    type?: qc.TypeNode,
    initializer?: Expression
  ) {
    super(true);
    this.decorators = Nodes.from(decorators);
    this.modifiers = Nodes.from(modifiers);
    this.dot3Token = dot3Token;
    this.name = asName(name);
    this.questionToken = questionToken;
    this.type = type;
    this.initializer = initializer ? parenthesize.expressionForList(initializer) : undefined;
  }
  updateParameter(
    this: ParameterDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    dot3Token: qc.Dot3Token | undefined,
    name: string | qc.BindingName,
    questionToken: qc.QuestionToken | undefined,
    type: qc.TypeNode | undefined,
    initializer: qc.Expression | undefined
  ) {
    return this.decorators !== decorators ||
      this.modifiers !== modifiers ||
      this.dot3Token !== dot3Token ||
      this.name !== name ||
      this.questionToken !== questionToken ||
      this.type !== type ||
      this.initializer !== initializer
      ? new create(decorators, modifiers, dot3Token, name, questionToken, type, initializer).updateFrom(this)
      : this;
  }
}
ParameterDeclaration.prototype.kind = ParameterDeclaration.kind;
export class ParenthesizedExpression extends qc.PrimaryExpression implements qc.ParenthesizedExpression {
  static readonly kind = Syntax.ParenthesizedExpression;
  expression: qc.Expression;
  constructor(e: qc.Expression) {
    super(true);
    this.expression = e;
  }
  update(e: qc.Expression) {
    return this.expression !== e ? new create(e).updateFrom(this) : this;
  }
}
qb.addMixins(ParenthesizedExpression, [JSDocContainer]);
ParenthesizedExpression.prototype.kind = ParenthesizedExpression.kind;
export class ParenthesizedTypeNode extends qc.TypeNode implements qc.ParenthesizedTypeNode {
  static readonly kind = Syntax.ParenthesizedType;
  type: qc.TypeNode;
  constructor(t: qc.TypeNode) {
    super(true);
    this.type = t;
  }
  update(t: qc.TypeNode) {
    return this.type !== t ? new ParenthesizedTypeNode(t).updateFrom(this) : this;
  }
}
ParenthesizedTypeNode.prototype.kind = ParenthesizedTypeNode.kind;
export class PartiallyEmittedExpression extends qc.LeftHandSideExpression implements qc.PartiallyEmittedExpression {
  static readonly kind = Syntax.PartiallyEmittedExpression;
  expression: qc.Expression;
  constructor(e: qc.Expression, original?: Node) {
    super(true);
    this.expression = e;
    this.original = original;
    setRange(this, original);
  }
  update(e: qc.Expression) {
    return this.expression !== e ? new PartiallyEmittedExpression(e, this.original).updateFrom(this) : this;
  }
}
PartiallyEmittedExpression.prototype.kind = PartiallyEmittedExpression.kind;
export class PostfixUnaryExpression extends UpdateExpression implements qc.PostfixUnaryExpression {
  static readonly kind = Syntax.PostfixUnaryExpression;
  operand: qc.LeftHandSideExpression;
  operator: PostfixUnaryOperator;
  static increment(e: qc.Expression) {
    return new PostfixUnaryExpression(e, Syntax.Plus2Token);
  }
  constructor(e: qc.Expression, o: PostfixUnaryOperator) {
    super(true);
    this.operand = parenthesize.postfixOperand(e);
    this.operator = o;
  }
  update(e: qc.Expression) {
    return this.operand !== e ? new PostfixUnaryExpression(e, this.operator).updateFrom(this) : this;
  }
}
PostfixUnaryExpression.prototype.kind = PostfixUnaryExpression.kind;
export class PrefixUnaryExpression extends UpdateExpression implements qc.PrefixUnaryExpression {
  static readonly kind = Syntax.PrefixUnaryExpression;
  operator: PrefixUnaryOperator;
  operand: qc.UnaryExpression;
  static logicalNot(e: qc.Expression) {
    return new PrefixUnaryExpression(Syntax.ExclamationToken, operand);
  }
  constructor(o: PrefixUnaryOperator, e: qc.Expression) {
    super(true);
    this.operator = o;
    this.operand = parenthesize.prefixOperand(e);
  }
  update(e: qc.Expression) {
    return this.operand !== e ? new PrefixUnaryExpression(this.operator, e).updateFrom(this) : this;
  }
}
PrefixUnaryExpression.prototype.kind = PrefixUnaryExpression.kind;
export class PrivateIdentifier extends TokenOrIdentifier implements qc.PrivateIdentifier {
  static readonly kind = Syntax.PrivateIdentifier;
  escapedText!: qb.__String;
  constructor(t: string) {
    super(PrivateIdentifier.kind);
    if (t[0] !== '#') qb.fail('First character of private identifier must be #: ' + t);
    this.escapedText = qy.get.escUnderscores(t);
  }
  get text(): string {
    return qc.idText(this);
  }
}
PrivateIdentifier.prototype.kind = PrivateIdentifier.kind;
export class PropertyAccessChain extends Node implements qc.PropertyAccessChain {
  createPropertyAccessChain(expression: qc.Expression, questionDotToken: qc.QuestionDotToken | undefined, name: string | Identifier) {
    super(true);
    this.flags |= NodeFlags.OptionalChain;
    this.expression = parenthesize.forAccess(expression);
    this.questionDotToken = questionDotToken;
    this.name = asName(name);
    setEmitFlags(this, qc.EmitFlags.NoIndentation);
  }
  update(expression: qc.Expression, questionDotToken: qc.QuestionDotToken | undefined, name: Identifier) {
    qb.assert(!!(this.flags & NodeFlags.OptionalChain), 'Cannot update a PropertyAccessExpression using updatePropertyAccessChain. Use updatePropertyAccess instead.');
    return this.expression !== expression || this.questionDotToken !== questionDotToken || this.name !== name
      ? setEmitFlags(new PropertyAccessChain(expression, questionDotToken, name), Node.get.emitFlags(this)).updateFrom(this)
      : this;
  }
}
PropertyAccessChain.prototype.kind = PropertyAccessChain.kind;
export class PropertyAccessExpression extends qc.MemberExpression implements qc.PropertyAccessExpression {
  //}, NamedDeclaration {
  static readonly kind = Syntax.PropertyAccessExpression;
  expression: qc.LeftHandSideExpression;
  questionDotToken?: qc.QuestionDotToken;
  name: Identifier | PrivateIdentifier;
  createPropertyAccess(expression: qc.Expression, name: string | Identifier | PrivateIdentifier) {
    super(true);
    this.expression = parenthesize.forAccess(expression);
    this.name = asName(name);
    setEmitFlags(this, qc.EmitFlags.NoIndentation);
  }
  update(expression: qc.Expression, name: Identifier | PrivateIdentifier) {
    if (Node.is.propertyAccessChain(this)) return this.update(expression, this.questionDotToken, cast(name, isIdentifier));
    return this.expression !== expression || this.name !== name ? setEmitFlags(new PropertyAccessExpression(expression, name), Node.get.emitFlags(this)).updateFrom(this) : this;
  }
}
PropertyAccessExpression.prototype.kind = PropertyAccessExpression.kind;
export class PropertyAssignment extends qc.ObjectLiteralElement implements qc.PropertyAssignment {
  //}, JSDocContainer {
  static readonly kind = Syntax.PropertyAssignment;
  parent: ObjectLiteralExpression;
  name: qc.PropertyName;
  questionToken?: qc.QuestionToken;
  initializer: qc.Expression;
  createPropertyAssignment(name: string | qc.PropertyName, initializer: qc.Expression) {
    super(true);
    this.name = asName(name);
    this.questionToken = undefined;
    this.initializer = parenthesize.expressionForList(initializer);
  }
  update(name: qc.PropertyName, initializer: qc.Expression) {
    return this.name !== name || this.initializer !== initializer ? new create(name, initializer).updateFrom(this) : this;
  }
}
PropertyAssignment.prototype.kind = PropertyAssignment.kind;
export class PropertyDeclaration extends qc.ClassElement implements qc.PropertyDeclaration {
  //}, JSDocContainer {
  static readonly kind = Syntax.PropertyDeclaration;
  parent: qc.ClassLikeDeclaration;
  name: qc.PropertyName;
  questionToken?: qc.QuestionToken;
  exclamationToken?: ExclamationToken;
  type?: qc.TypeNode;
  initializer?: qc.Expression;
  constructor(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | qc.PropertyName, q?: qc.QuestionToken | ExclamationToken, t?: qc.TypeNode, i?: qc.Expression) {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(p);
    this.questionToken = q !== undefined && q.kind === qc.QuestionToken ? q : undefined;
    this.exclamationToken = q !== undefined && q.kind === Syntax.ExclamationToken ? q : undefined;
    this.type = t;
    this.initializer = i;
  }
  update(
    n: PropertyDeclaration,
    ds: readonly Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    p: string | qc.PropertyName,
    q?: qc.QuestionToken | ExclamationToken,
    t?: qc.TypeNode,
    i?: Expression
  ) {
    return this.decorators !== ds ||
      this.modifiers !== ms ||
      this.name !== p ||
      this.questionToken !== (q !== undefined && q.kind === qc.QuestionToken ? q : undefined) ||
      this.exclamationToken !== (q !== undefined && q.kind === Syntax.ExclamationToken ? q : undefined) ||
      this.type !== t ||
      this.initializer !== i
      ? new PropertyDeclaration(ds, ms, p, q, t, i).updateFrom(n)
      : n;
  }
}
PropertyDeclaration.prototype.kind = PropertyDeclaration.kind;
export class PropertySignature extends TypeElement implements qc.PropertySignature {
  //}, JSDocContainer {
  static readonly kind = Syntax.PropertySignature;
  name: qc.PropertyName;
  questionToken?: qc.QuestionToken;
  type?: qc.TypeNode;
  initializer?: qc.Expression;
  constructor(ms: readonly Modifier[] | undefined, p: qc.PropertyName | string, q?: qc.QuestionToken, t?: qc.TypeNode, i?: qc.Expression) {
    super(true);
    this.modifiers = Nodes.from(ms);
    this.name = asName(p);
    this.questionToken = q;
    this.type = t;
    this.initializer = i;
  }
  update(ms: readonly Modifier[] | undefined, p: qc.PropertyName, q?: qc.QuestionToken, t?: qc.TypeNode, i?: qc.Expression) {
    return this.modifiers !== ms || this.name !== p || this.questionToken !== q || this.type !== t || this.initializer !== i ? new PropertySignature(ms, p, q, t, i).updateFrom(this) : this;
  }
}
PropertySignature.prototype.kind = PropertySignature.kind;
export class QualifiedName extends Node implements qc.QualifiedName {
  static readonly kind = Syntax.QualifiedName;
  left: qc.EntityName;
  right: Identifier;
  jsdocDotPos?: number;
  constructor(left: qc.EntityName, right: string | Identifier) {
    super(true);
    this.left = left;
    this.right = asName(right);
  }
  update(left: qc.EntityName, right: Identifier) {
    return this.left !== left || this.right !== right ? new QualifiedName(left, right).updateFrom(this) : this;
  }
}
QualifiedName.prototype.kind = QualifiedName.kind;
export class RegexLiteral extends qc.LiteralExpression implements qc.RegexLiteral {
  static readonly kind = Syntax.RegexLiteral;
  constructor(t: string) {
    super(true);
    this.text = t;
  }
}
RegexLiteral.prototype.kind = RegexLiteral.kind;
export class RestTypeNode extends qc.TypeNode implements qc.RestTypeNode {
  static readonly kind = Syntax.RestType;
  type: qc.TypeNode;
  constructor(t: qc.TypeNode) {
    super(true);
    this.type = t;
  }
  update(t: qc.TypeNode) {
    return this.type !== t ? new RestTypeNode(t).updateFrom(this) : this;
  }
}
RestTypeNode.prototype.kind = RestTypeNode.kind;
export class ReturnStatement extends qc.Statement implements qc.ReturnStatement {
  static readonly kind = Syntax.ReturnStatement;
  expression?: qc.Expression;
  createReturn(expression?: qc.Expression): ReturnStatement {
    super(true);
    this.expression = expression;
  }
  update(expression: qc.Expression | undefined) {
    return this.expression !== expression ? new create(expression).updateFrom(this) : this;
  }
}
ReturnStatement.prototype.kind = ReturnStatement.kind;
export class SemicolonClassElement extends qc.ClassElement implements qc.SemicolonClassElement {
  static readonly kind = Syntax.SemicolonClassElement;
  parent: qc.ClassLikeDeclaration;
  createSemicolonClassElement() {
    super(true);
  }
}
SemicolonClassElement.prototype.kind = SemicolonClassElement.kind;
export class SetAccessorDeclaration extends qc.FunctionLikeDeclarationBase implements qc.SetAccessorDeclaration {
  //}, qc.ClassElement, ObjectLiteralElement, JSDocContainer {
  static readonly kind = Syntax.SetAccessor;
  parent: ClassLikeDeclaration | ObjectLiteralExpression;
  name: qc.PropertyName;
  body?: qc.FunctionBody;
  constructor(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | qc.PropertyName, ps: readonly ParameterDeclaration[], b?: Block) {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(p);
    this.typeParameters = undefined;
    this.parameters = new Nodes(ps);
    this.body = b;
  }
  update(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: qc.PropertyName, ps: readonly ParameterDeclaration[], b?: Block) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== p || this.parameters !== ps || this.body !== b ? new SetAccessorDeclaration(ds, ms, p, ps, b).updateFrom(this) : this;
  }
}
SetAccessorDeclaration.prototype.kind = SetAccessorDeclaration.kind;
export class ShorthandPropertyAssignment extends qc.ObjectLiteralElement implements qc.ShorthandPropertyAssignment {
  //}, JSDocContainer {
  static readonly kind = Syntax.ShorthandPropertyAssignment;
  parent: ObjectLiteralExpression;
  name: Identifier;
  questionToken?: qc.QuestionToken;
  exclamationToken?: ExclamationToken;
  equalsToken?: qc.Token<Syntax.EqualsToken>;
  objectAssignmentInitializer?: qc.Expression;
  createShorthandPropertyAssignment(name: string | Identifier, objectAssignmentInitializer?: qc.Expression) {
    super(true);
    this.name = asName(name);
    this.objectAssignmentInitializer = objectAssignmentInitializer !== undefined ? parenthesize.expressionForList(objectAssignmentInitializer) : undefined;
  }
  update(name: Identifier, objectAssignmentInitializer: qc.Expression | undefined) {
    return this.name !== name || this.objectAssignmentInitializer !== objectAssignmentInitializer ? new create(name, objectAssignmentInitializer).updateFrom(this) : this;
  }
}
ShorthandPropertyAssignment.prototype.kind = ShorthandPropertyAssignment.kind;
export namespace SignatureDeclaration {
  export function create(k: Syntax, ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: qc.TypeNode, ta?: readonly qc.TypeNode[]) {
    super(true);
    this.typeParameters = Nodes.from(ts);
    this.parameters = Nodes.from(ps);
    this.type = t;
    this.typeArguments = Nodes.from(ta);
  }
  export function update<T extends SignatureDeclaration>(n: T, ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: qc.TypeNode): T {
    return this.typeParameters !== ts || this.parameters !== ps || this.type !== t ? (new create(this.kind, ts, ps, t) as T).updateFrom(this) : this;
  }
}
export class SpreadElement extends qc.Expression implements qc.SpreadElement {
  static readonly kind = Syntax.SpreadElement;
  parent: ArrayLiteralExpression | CallExpression | NewExpression;
  expression: qc.Expression;
  createSpread(expression: qc.Expression) {
    super(true);
    this.expression = parenthesize.expressionForList(expression);
  }
  update(expression: qc.Expression) {
    return this.expression !== expression ? new create(expression).updateFrom(this) : this;
  }
}
SpreadElement.prototype.kind = SpreadElement.kind;
export class SpreadAssignment extends qc.ObjectLiteralElement implements qc.SpreadAssignment {
  //}, JSDocContainer {
  static readonly kind = Syntax.SpreadAssignment;
  parent: ObjectLiteralExpression;
  expression: qc.Expression;
  createSpreadAssignment(expression: qc.Expression) {
    super(true);
    this.expression = parenthesize.expressionForList(expression);
  }
  update(expression: qc.Expression) {
    return this.expression !== expression ? new create(expression).updateFrom(this) : this;
  }
}
SpreadAssignment.prototype.kind = SpreadAssignment.kind;
export class StringLiteral extends qc.LiteralExpression implements qc.StringLiteral {
  //}, Declaration {
  static readonly kind = Syntax.StringLiteral;
  textSourceNode?: Identifier | StringLiteralLike | NumericLiteral;
  singleQuote?: boolean;
  constructor(t: string) {
    super(true);
    this.text = t;
  }
  like(n: Node): n is StringLiteralLike {
    return this.kind === Syntax.StringLiteral || this.kind === Syntax.NoSubstitutionLiteral;
  }
  orNumericLiteralLike(n: Node): n is StringLiteralLike | NumericLiteral {
    return like(n) || Node.is.kind(NumericLiteral, n);
  }
  orJsxExpressionKind(n: Node): n is StringLiteral | JsxExpression {
    const k = this.kind;
    return k === Syntax.StringLiteral || k === Syntax.JsxExpression;
  }
  orNumberLiteralExpression(e: qc.Expression) {
    return (
      orNumericLiteralLike(e) ||
      (e.kind === Syntax.PrefixUnaryExpression && (e as PrefixUnaryExpression).operator === Syntax.MinusToken && (e as PrefixUnaryExpression).operand.kind === Syntax.NumericLiteral)
    );
  }
  createLiteralFromNode(sourceNode: Exclude<PropertyNameLiteral, PrivateIdentifier>): StringLiteral {
    const r = StringLiteral.create(getTextOfIdentifierOrLiteral(sourceNode));
    r.textSourceNode = sourceNode;
    return r;
  }
}
StringLiteral.prototype.kind = StringLiteral.kind;
export class SwitchStatement extends qc.Statement implements qc.SwitchStatement {
  static readonly kind = Syntax.SwitchStatement;
  expression: qc.Expression;
  caseBlock: CaseBlock;
  possiblyExhaustive?: boolean;
  createSwitch(expression: qc.Expression, caseBlock: CaseBlock): SwitchStatement {
    super(true);
    this.expression = parenthesize.expressionForList(expression);
    this.caseBlock = caseBlock;
  }
  update(expression: qc.Expression, caseBlock: CaseBlock) {
    return this.expression !== expression || this.caseBlock !== caseBlock ? new create(expression, caseBlock).updateFrom(this) : this;
  }
}
SwitchStatement.prototype.kind = SwitchStatement.kind;
export class SyntaxList extends Node implements qc.SyntaxList {
  static readonly kind = Syntax.SyntaxList;
  _children: Node[];
}
SyntaxList.prototype.kind = SyntaxList.kind;
export class SyntheticReferenceExpression extends qc.LeftHandSideExpression implements qc.SyntheticReferenceExpression {
  static readonly kind = Syntax.SyntheticReferenceExpression;
  expression: qc.Expression;
  thisArg: qc.Expression;
  constructor(e: qc.Expression, thisArg: qc.Expression) {
    super(true);
    this.expression = e;
    this.thisArg = thisArg;
  }
  update(e: qc.Expression, thisArg: qc.Expression) {
    return this.expression !== e || this.thisArg !== thisArg ? new SyntheticReferenceExpression(e, thisArg).updateFrom(this) : this;
  }
}
SyntheticReferenceExpression.prototype.kind = SyntheticReferenceExpression.kind;
export class TaggedTemplateExpression extends qc.MemberExpression implements qc.TaggedTemplateExpression {
  static readonly kind = Syntax.TaggedTemplateExpression;
  tag: qc.LeftHandSideExpression;
  typeArguments?: Nodes<qc.TypeNode>;
  template: TemplateLiteral;
  questionDotToken?: qc.QuestionDotToken;
  createTaggedTemplate(tag: qc.Expression, ts: readonly qc.TypeNode[] | undefined, template: TemplateLiteral);
  createTaggedTemplate(tag: qc.Expression, ts?: readonly qc.TypeNode[] | TemplateLiteral, template?: TemplateLiteral);
  createTaggedTemplate(tag: qc.Expression, ts?: readonly qc.TypeNode[] | TemplateLiteral, template?: TemplateLiteral) {
    super(true);
    this.tag = parenthesize.forAccess(tag);
    if (template) {
      this.typeArguments = Nodes.from(ts as readonly qc.TypeNode[]);
      this.template = template;
    } else {
      this.typeArguments = undefined;
      this.template = ts as TemplateLiteral;
    }
  }
  update(tag: qc.Expression, ts: readonly qc.TypeNode[] | undefined, template: TemplateLiteral): TaggedTemplateExpression;
  update(tag: qc.Expression, ts?: readonly qc.TypeNode[] | TemplateLiteral, template?: TemplateLiteral) {
    return this.tag !== tag || (template ? this.typeArguments !== ts || this.template !== template : this.typeArguments || this.template !== ts)
      ? new TaggedTemplateExpression(tag, ts, template).updateFrom(this)
      : this;
  }
}
TaggedTemplateExpression.prototype.kind = TaggedTemplateExpression.kind;
export class TemplateExpression extends qc.PrimaryExpression implements qc.TemplateExpression {
  static readonly kind = Syntax.TemplateExpression;
  head: TemplateHead;
  templateSpans: Nodes<TemplateSpan>;
  createTemplateExpression(head: TemplateHead, templateSpans: readonly TemplateSpan[]) {
    super(true);
    this.head = head;
    this.templateSpans = new Nodes(templateSpans);
  }
  update(head: TemplateHead, templateSpans: readonly TemplateSpan[]) {
    return this.head !== head || this.templateSpans !== templateSpans ? new create(head, templateSpans).updateFrom(this) : this;
  }
}
TemplateExpression.prototype.kind = TemplateExpression.kind;
export class TemplateHead extends TemplateLiteralLikeNode implements qc.TemplateHead {
  static readonly kind = Syntax.TemplateHead;
  parent: TemplateExpression;
  templateFlags?: TokenFlags;
  constructor(t: string, raw?: string) {
    return Node.createTemplateLiteralLike(Syntax.TemplateHead, t, raw) as TemplateHead;
  }
}
TemplateHead.prototype.kind = TemplateHead.kind;
export class TemplateMiddle extends TemplateLiteralLikeNode implements qc.TemplateMiddle {
  static readonly kind = Syntax.TemplateMiddle;
  parent: TemplateSpan;
  templateFlags?: TokenFlags;
  constructor(t: string, raw?: string) {
    return Node.createTemplateLiteralLike(Syntax.TemplateMiddle, t, raw) as TemplateMiddle;
  }
  orTemplateTailKind(n: Node): n is TemplateMiddle | TemplateTail {
    const k = this.kind;
    return k === Syntax.TemplateMiddle || k === Syntax.TemplateTail;
  }
}
TemplateMiddle.prototype.kind = TemplateMiddle.kind;
export class TemplateSpan extends Node implements qc.TemplateSpan {
  static readonly kind = Syntax.TemplateSpan;
  parent: TemplateExpression;
  expression: qc.Expression;
  literal: TemplateMiddle | TemplateTail;
  createTemplateSpan(expression: qc.Expression, literal: TemplateMiddle | TemplateTail) {
    super(true);
    this.expression = expression;
    this.literal = literal;
  }
  update(expression: qc.Expression, literal: TemplateMiddle | TemplateTail) {
    return this.expression !== expression || this.literal !== literal ? new create(expression, literal).updateFrom(this) : this;
  }
}
TemplateSpan.prototype.kind = TemplateSpan.kind;
export class TemplateTail extends TemplateLiteralLikeNode implements qc.TemplateTail {
  static readonly kind = Syntax.TemplateTail;
  parent: TemplateSpan;
  templateFlags?: TokenFlags;
  constructor(t: string, raw?: string) {
    return Node.createTemplateLiteralLike(Syntax.TemplateTail, t, raw) as TemplateTail;
  }
}
TemplateTail.prototype.kind = TemplateTail.kind;
export class ThisTypeNode extends qc.TypeNode implements qc.ThisTypeNode {
  static readonly kind = Syntax.ThisType;
  constructor() {
    super(true);
  }
}
ThisTypeNode.prototype.kind = ThisTypeNode.kind;
export class ThrowStatement extends qc.Statement implements qc.ThrowStatement {
  static readonly kind = Syntax.ThrowStatement;
  expression?: qc.Expression;
  createThrow(expression: qc.Expression) {
    super(true);
    this.expression = expression;
  }
  update(expression: qc.Expression) {
    return this.expression !== expression ? new create(expression).updateFrom(this) : this;
  }
}
ThrowStatement.prototype.kind = ThrowStatement.kind;
export class TryStatement extends qc.Statement implements qc.TryStatement {
  static readonly kind = Syntax.TryStatement;
  tryBlock: Block;
  catchClause?: CatchClause;
  finallyBlock?: Block;
  createTry(tryBlock: Block, catchClause: CatchClause | undefined, finallyBlock: Block | undefined) {
    super(true);
    this.tryBlock = tryBlock;
    this.catchClause = catchClause;
    this.finallyBlock = finallyBlock;
  }
  update(tryBlock: Block, catchClause: CatchClause | undefined, finallyBlock: Block | undefined) {
    return this.tryBlock !== tryBlock || this.catchClause !== catchClause || this.finallyBlock !== finallyBlock ? new create(tryBlock, catchClause, finallyBlock).updateFrom(this) : this;
  }
}
TryStatement.prototype.kind = TryStatement.kind;
export class TupleType extends GenericType implements qc.TupleType {
  static readonly kind = Syntax.TupleType;
  minLength: number;
  hasRestElement: boolean;
  readonly: boolean;
  labeledElementDeclarations?: readonly (NamedTupleMember | ParameterDeclaration)[];
  constructor(es: readonly (qc.TypeNode | NamedTupleMember)[]) {
    super(true);
    this.elements = new Nodes(es);
  }
  update(es: readonly (qc.TypeNode | NamedTupleMember)[]) {
    return this.elements !== es ? new TupleType(es).updateFrom(this) : this;
  }
}
TupleType.prototype.kind = TupleType.kind;
export class TypeAliasDeclaration extends qc.DeclarationStatement implements qc.TypeAliasDeclaration {
  //}, JSDocContainer {
  static readonly kind = Syntax.TypeAliasDeclaration;
  name: Identifier;
  typeParameters?: Nodes<TypeParameterDeclaration>;
  type: qc.TypeNode;
  createTypeAliasDeclaration(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: string | Identifier,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    type: TypeNode
  ) {
    super(true);
    this.decorators = Nodes.from(decorators);
    this.modifiers = Nodes.from(modifiers);
    this.name = asName(name);
    this.typeParameters = Nodes.from(typeParameters);
    this.type = type;
  }
  updateTypeAliasDeclaration(
    this: TypeAliasDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: Identifier,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    type: TypeNode
  ) {
    return this.decorators !== decorators || this.modifiers !== modifiers || this.name !== name || this.typeParameters !== typeParameters || this.type !== type
      ? new create(decorators, modifiers, name, typeParameters, type).updateFrom(this)
      : this;
  }
}
TypeAliasDeclaration.prototype.kind = TypeAliasDeclaration.kind;
export class TypeAssertion extends qc.UnaryExpression implements qc.TypeAssertion {
  static readonly kind = Syntax.TypeAssertionExpression;
  type: qc.TypeNode;
  expression: qc.UnaryExpression;
  constructor(t: qc.TypeNode, e: qc.Expression) {
    super(true);
    this.type = t;
    this.expression = parenthesize.prefixOperand(e);
  }
  update(t: qc.TypeNode, e: qc.Expression) {
    return this.type !== t || this.expression !== e ? new TypeAssertion(t, e).updateFrom(this) : this;
  }
}
TypeAssertion.prototype.kind = TypeAssertion.kind;
export class TypeLiteralNode extends qc.TypeNode implements qc.TypeLiteralNode {
  static readonly kind = Syntax.TypeLiteral;
  members: Nodes<qc.TypeElement>;
  constructor(ms?: readonly qc.TypeElement[]) {
    super(true);
    this.members = new Nodes(ms);
  }
  update(ms: Nodes<qc.TypeElement>) {
    return this.members !== ms ? new TypeLiteralNode(ms).updateFrom(this) : this;
  }
}
TypeLiteralNode.prototype.kind = TypeLiteralNode.kind;
qb.addMixins(TypeLiteralNode, [Declaration]);
export class TypeOfExpression extends qc.UnaryExpression implements qc.TypeOfExpression {
  static readonly kind = Syntax.TypeOfExpression;
  expression: qc.UnaryExpression;
  constructor(e: qc.Expression) {
    super(true);
    this.expression = parenthesize.prefixOperand(e);
  }
  update(e: qc.Expression) {
    return this.expression !== e ? new TypeOfExpression(e).updateFrom(this) : this;
  }
}
TypeOfExpression.prototype.kind = TypeOfExpression.kind;
export class TypeOperatorNode extends qc.TypeNode implements qc.TypeOperatorNode {
  static readonly kind = Syntax.TypeOperator;
  operator: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword;
  type: qc.TypeNode;
  constructor(t: qc.TypeNode);
  constructor(o: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword, t: qc.TypeNode);
  constructor(o: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword | qc.TypeNode, t?: qc.TypeNode) {
    super(true);
    this.operator = typeof o === 'number' ? o : Syntax.KeyOfKeyword;
    this.type = parenthesizeElementTypeMember(typeof o === 'number' ? t! : o);
  }
  update(t: qc.TypeNode) {
    return this.type !== t ? new TypeOperatorNode(this.operator, t).updateFrom(this) : this;
  }
}
TypeOperatorNode.prototype.kind = TypeOperatorNode.kind;
export class TypeParameterDeclaration extends qc.NamedDeclaration implements qc.TypeParameterDeclaration {
  static readonly kind = Syntax.TypeParameter;
  parent: DeclarationWithTypeParameterChildren | InferTypeNode;
  name: Identifier;
  constraint?: qc.TypeNode;
  default?: qc.TypeNode;
  expression?: qc.Expression;
  createTypeParameterDeclaration(name: string | Identifier, constraint?: qc.TypeNode, defaultType?: qc.TypeNode) {
    super(true);
    this.name = asName(name);
    this.constraint = constraint;
    this.default = defaultType;
  }
  update(name: Identifier, constraint: qc.TypeNode | undefined, defaultType: qc.TypeNode | undefined) {
    return this.name !== name || this.constraint !== constraint || this.default !== defaultType ? new create(name, constraint, defaultType).updateFrom(this) : this;
  }
}
TypeParameterDeclaration.prototype.kind = TypeParameterDeclaration.kind;
export class TypePredicateNode extends qc.TypeNode implements qc.TypePredicateNode {
  static readonly kind = Syntax.TypePredicate;
  parent: SignatureDeclaration | JSDocTypeExpression;
  assertsModifier?: AssertsToken;
  parameterName: Identifier | ThisTypeNode;
  type?: qc.TypeNode;
  constructor(a: AssertsToken | undefined, p: Identifier | ThisTypeNode | string, t?: qc.TypeNode) {
    super(true);
    this.assertsModifier = a;
    this.parameterName = asName(p);
    this.type = t;
  }
  update(p: Identifier | ThisTypeNode, t: qc.TypeNode) {
    return this.updateWithModifier(this.assertsModifier, p, t);
  }
  updateWithModifier(a: AssertsToken | undefined, p: Identifier | ThisTypeNode, t?: qc.TypeNode) {
    return this.assertsModifier !== a || this.parameterName !== p || this.type !== t ? new create(a, p, t).updateFrom(this) : this;
  }
}
TypePredicateNode.prototype.kind = TypePredicateNode.kind;
export class TypeQueryNode extends qc.TypeNode implements qc.TypeQueryNode {
  static readonly kind = Syntax.TypeQuery;
  exprName: qc.EntityName;
  constructor(e: EntityName) {
    super(true);
    this.exprName = e;
  }
  update(e: EntityName) {
    return this.exprName !== e ? new TypeQueryNode(e).updateFrom(this) : this;
  }
}
TypeQueryNode.prototype.kind = TypeQueryNode.kind;
export class TypeReferenceNode extends qc.NodeWithTypeArguments implements qc.TypeReferenceNode {
  static readonly kind = Syntax.TypeReference;
  typeName: qc.EntityName;
  constructor(t: string | EntityName, ts?: readonly qc.TypeNode[]) {
    super(true);
    this.typeName = asName(t);
    this.typeArguments = ts && parenthesize.typeParameters(ts);
  }
  update(t: qc.EntityName, ts?: Nodes<qc.TypeNode>) {
    return this.typeName !== t || this.typeArguments !== ts ? new TypeReferenceNode(t, ts).updateFrom(this) : this;
  }
}
TypeReferenceNode.prototype.kind = TypeReferenceNode.kind;
export class UnionTypeNode extends UnionOrIntersectionTypeNode implements qc.UnionTypeNode {
  static readonly kind = Syntax.UnionType;
  types: Nodes<qc.TypeNode>;
  constructor(ts: readonly qc.TypeNode[]) {
    super(Syntax.UnionType, ts);
  }
  update(ts: Nodes<qc.TypeNode>) {
    return super.update(n, ts);
  }
}
UnionTypeNode.prototype.kind = UnionTypeNode.kind;
export namespace UnparsedNode {
  export function createUnparsedNode(section: BundleFileSection, parent: UnparsedSource): UnparsedNode {
    const r = createNode(mapBundleFileSectionKindToSyntax(section.kind), section.pos, section.end) as UnparsedNode;
    r.parent = parent;
    r.data = section.data;
  }
  export function mapBundleFileSectionKindToSyntax(kind: BundleFileSectionKind): Syntax {
    switch (kind) {
      case BundleFileSectionKind.Prologue:
        return Syntax.UnparsedPrologue;
      case BundleFileSectionKind.Prepend:
        return Syntax.UnparsedPrepend;
      case BundleFileSectionKind.Internal:
        return Syntax.UnparsedInternalText;
      case BundleFileSectionKind.Text:
        return Syntax.UnparsedText;
      case BundleFileSectionKind.EmitHelpers:
      case BundleFileSectionKind.NoDefaultLib:
      case BundleFileSectionKind.Reference:
      case BundleFileSectionKind.Type:
      case BundleFileSectionKind.Lib:
        return fail(`BundleFileSectionKind: ${kind} not yet mapped to SyntaxKind`);
      default:
        return qg.assertNever(kind);
    }
  }
}
export class UnparsedPrepend extends UnparsedSection implements qc.UnparsedPrepend {
  static readonly kind = Syntax.UnparsedPrepend;
  data: string;
  parent: UnparsedSource;
  texts: readonly UnparsedTextLike[];
}
UnparsedPrepend.prototype.kind = UnparsedPrepend.kind;
let allUnscopedEmitHelpers: QReadonlyMap<UnscopedEmitHelper> | undefined;
export class UnparsedSource extends Node implements qc.UnparsedSource {
  static readonly kind = Syntax.UnparsedSource;
  fileName: string;
  text: string;
  prologues: readonly UnparsedPrologue[];
  helpers: readonly UnscopedEmitHelper[] | undefined;
  referencedFiles: readonly FileReference[];
  typeReferenceDirectives: readonly string[] | undefined;
  libReferenceDirectives: readonly FileReference[];
  hasNoDefaultLib?: boolean;
  sourceMapPath?: string;
  sourceMapText?: string;
  syntheticReferences?: readonly UnparsedSyntheticReference[];
  texts: readonly UnparsedSourceText[];
  oldFileOfCurrentEmit?: boolean;
  parsedSourceMap?: RawSourceMap | false | undefined;
  lineAndCharOf(pos: number): LineAndChar;
  createUnparsedSource() {
    super();
    this.prologues = empty;
    this.referencedFiles = empty;
    this.libReferenceDirectives = empty;
    this.lineAndCharOf = (pos) => qy.get.lineAndCharOf(this, pos);
  }
  createUnparsedSourceFile(text: string): UnparsedSource;
  createUnparsedSourceFile(inputFile: InputFiles, type: 'js' | 'dts', stripInternal?: boolean): UnparsedSource;
  createUnparsedSourceFile(text: string, mapPath: string | undefined, map: string | undefined): UnparsedSource;
  createUnparsedSourceFile(textOrInputFiles: string | InputFiles, mapPathOrType?: string, mapTextOrStripInternal?: string | boolean): UnparsedSource {
    const r = createUnparsedSource();
    let stripInternal: boolean | undefined;
    let bundleFileInfo: BundleFileInfo | undefined;
    if (!isString(textOrInputFiles)) {
      qb.assert(mapPathOrType === 'js' || mapPathOrType === 'dts');
      r.fileName = (mapPathOrType === 'js' ? textOrInputFiles.javascriptPath : textOrInputFiles.declarationPath) || '';
      r.sourceMapPath = mapPathOrType === 'js' ? textOrInputFiles.javascriptMapPath : textOrInputFiles.declarationMapPath;
      Object.defineProperties(r, {
        text: {
          get() {
            return mapPathOrType === 'js' ? textOrInputFiles.javascriptText : textOrInputFiles.declarationText;
          },
        },
        sourceMapText: {
          get() {
            return mapPathOrType === 'js' ? textOrInputFiles.javascriptMapText : textOrInputFiles.declarationMapText;
          },
        },
      });
      if (textOrInputFiles.buildInfo && textOrInputFiles.buildInfo.bundle) {
        r.oldFileOfCurrentEmit = textOrInputFiles.oldFileOfCurrentEmit;
        qb.assert(mapTextOrStripInternal === undefined || typeof mapTextOrStripInternal === 'boolean');
        stripInternal = mapTextOrStripInternal;
        bundleFileInfo = mapPathOrType === 'js' ? textOrInputFiles.buildInfo.bundle.js : textOrInputFiles.buildInfo.bundle.dts;
        if (r.oldFileOfCurrentEmit) {
          parseOldFileOfCurrentEmit(r, qg.checkDefined(bundleFileInfo));
          return r;
        }
      }
    } else {
      r.fileName = '';
      r.text = textOrInputFiles;
      r.sourceMapPath = mapPathOrType;
      r.sourceMapText = mapTextOrStripInternal as string;
    }
    qb.assert(!r.oldFileOfCurrentEmit);
    parseUnparsedSourceFile(r, bundleFileInfo, stripInternal);
    return r;
  }
  getAllUnscopedEmitHelpers() {
    return (
      allUnscopedEmitHelpers ||
      (allUnscopedEmitHelpers = arrayToMap(
        [
          valuesHelper,
          readHelper,
          spreadHelper,
          spreadArraysHelper,
          restHelper,
          decorateHelper,
          metadataHelper,
          paramHelper,
          awaiterHelper,
          assignHelper,
          awaitHelper,
          asyncGeneratorHelper,
          asyncDelegator,
          asyncValues,
          extendsHelper,
          templateObjectHelper,
          generatorHelper,
          importStarHelper,
          importDefaultHelper,
          classPrivateFieldGetHelper,
          classPrivateFieldSetHelper,
          createBindingHelper,
          setModuleDefaultHelper,
        ],
        (helper) => helper.name
      ))
    );
  }
  parseUnparsedSourceFile(this: UnparsedSource, bundleFileInfo: BundleFileInfo | undefined, stripInternal: boolean | undefined) {
    let prologues: UnparsedPrologue[] | undefined;
    let helpers: UnscopedEmitHelper[] | undefined;
    let referencedFiles: FileReference[] | undefined;
    let typeReferenceDirectives: string[] | undefined;
    let libReferenceDirectives: FileReference[] | undefined;
    let texts: UnparsedSourceText[] | undefined;
    for (const section of bundleFileInfo ? bundleFileInfo.sections : empty) {
      switch (section.kind) {
        case BundleFileSectionKind.Prologue:
          (prologues || (prologues = [])).push(createUnparsedNode(section, this) as UnparsedPrologue);
          break;
        case BundleFileSectionKind.EmitHelpers:
          (helpers || (helpers = [])).push(getAllUnscopedEmitHelpers().get(section.data)!);
          break;
        case BundleFileSectionKind.NoDefaultLib:
          this.hasNoDefaultLib = true;
          break;
        case BundleFileSectionKind.Reference:
          (referencedFiles || (referencedFiles = [])).push({ pos: -1, end: -1, fileName: section.data });
          break;
        case BundleFileSectionKind.Type:
          (typeReferenceDirectives || (typeReferenceDirectives = [])).push(section.data);
          break;
        case BundleFileSectionKind.Lib:
          (libReferenceDirectives || (libReferenceDirectives = [])).push({ pos: -1, end: -1, fileName: section.data });
          break;
        case BundleFileSectionKind.Prepend:
          const prependNode = createUnparsedNode(section, this) as UnparsedPrepend;
          let prependTexts: UnparsedTextLike[] | undefined;
          for (const text of section.texts) {
            if (!stripInternal || text.kind !== BundleFileSectionKind.Internal) {
              (prependTexts || (prependTexts = [])).push(createUnparsedNode(text, this) as UnparsedTextLike);
            }
          }
          prependNode.texts = prependTexts || empty;
          (texts || (texts = [])).push(prependNode);
          break;
        case BundleFileSectionKind.Internal:
          if (stripInternal) {
            if (!texts) texts = [];
            break;
          }
        case BundleFileSectionKind.Text:
          (texts || (texts = [])).push(createUnparsedNode(section, this) as UnparsedTextLike);
          break;
        default:
          qg.assertNever(section);
      }
    }
    this.prologues = prologues || empty;
    this.helpers = helpers;
    this.referencedFiles = referencedFiles || empty;
    this.typeReferenceDirectives = typeReferenceDirectives;
    this.libReferenceDirectives = libReferenceDirectives || empty;
    this.texts = texts || [<UnparsedTextLike>createUnparsedNode({ kind: BundleFileSectionKind.Text, pos: 0, end: this.text.length }, this)];
  }
  parseOldFileOfCurrentEmit(this: UnparsedSource, bundleFileInfo: BundleFileInfo) {
    qb.assert(!!this.oldFileOfCurrentEmit);
    let texts: UnparsedTextLike[] | undefined;
    let syntheticReferences: UnparsedSyntheticReference[] | undefined;
    for (const section of bundleFileInfo.sections) {
      switch (section.kind) {
        case BundleFileSectionKind.Internal:
        case BundleFileSectionKind.Text:
          (texts || (texts = [])).push(createUnparsedNode(section, this) as UnparsedTextLike);
          break;
        case BundleFileSectionKind.NoDefaultLib:
        case BundleFileSectionKind.Reference:
        case BundleFileSectionKind.Type:
        case BundleFileSectionKind.Lib:
          (syntheticReferences || (syntheticReferences = [])).push(createUnparsedSyntheticReference(section, this));
          break;
        // Ignore
        case BundleFileSectionKind.Prologue:
        case BundleFileSectionKind.EmitHelpers:
        case BundleFileSectionKind.Prepend:
          break;
        default:
          qg.assertNever(section);
      }
    }
    this.texts = texts || empty;
    this.helpers = map(bundleFileInfo.sources && bundleFileInfo.sources.helpers, (name) => getAllUnscopedEmitHelpers().get(name)!);
    this.syntheticReferences = syntheticReferences;
    return this;
  }
}
UnparsedSource.prototype.kind = UnparsedSource.kind;
export class UnparsedSyntheticReference extends UnparsedSection implements qc.UnparsedSyntheticReference {
  static readonly kind: Syntax.UnparsedSyntheticReference;
  parent: UnparsedSource;
  section: BundleFileHasNoDefaultLib | BundleFileReference;
  createUnparsedSyntheticReference(section: BundleFileHasNoDefaultLib | BundleFileReference, parent: UnparsedSource) {
    super(undefined, Syntax.UnparsedSyntheticReference, section.pos, section.end);
    this.parent = parent;
    this.data = section.data;
    this.section = section;
  }
}
UnparsedSyntheticReference.prototype.kind = UnparsedSyntheticReference.kind;
export class VariableDeclaration extends qc.NamedDeclaration implements qc.VariableDeclaration {
  static readonly kind = Syntax.VariableDeclaration;
  parent: VariableDeclarationList | CatchClause;
  name: qc.BindingName;
  exclamationToken?: ExclamationToken;
  type?: qc.TypeNode;
  initializer?: qc.Expression;
  createVariableDeclaration(name: string | qc.BindingName, type?: qc.TypeNode, initializer?: qc.Expression) {
    super(true);
    this.name = asName(name);
    this.type = type;
    this.initializer = initializer !== undefined ? parenthesize.expressionForList(initializer) : undefined;
  }
  update(name: qc.BindingName, type: qc.TypeNode | undefined, initializer: qc.Expression | undefined) {
    return this.name !== name || this.type !== type || this.initializer !== initializer ? new create(name, type, initializer).updateFrom(this) : this;
  }
  createTypeScriptVariableDeclaration(name: string | qc.BindingName, exclaimationToken?: qc.Token<Syntax.ExclamationToken>, type?: qc.TypeNode, initializer?: qc.Expression) {
    super(true);
    this.name = asName(name);
    this.type = type;
    this.initializer = initializer !== undefined ? parenthesize.expressionForList(initializer) : undefined;
    this.exclamationToken = exclaimationToken;
  }
  updateTypeScriptVariableDeclaration(
    this: VariableDeclaration,
    name: qc.BindingName,
    exclaimationToken: qc.Token<Syntax.ExclamationToken> | undefined,
    type: qc.TypeNode | undefined,
    initializer: qc.Expression | undefined
  ) {
    return this.name !== name || this.type !== type || this.initializer !== initializer || this.exclamationToken !== exclaimationToken
      ? new create(name, exclaimationToken, type, initializer).updateFrom(this)
      : this;
  }
}
VariableDeclaration.prototype.kind = VariableDeclaration.kind;
export class VariableDeclarationList extends Node implements qc.VariableDeclarationList {
  static readonly kind = Syntax.VariableDeclarationList;
  parent: VariableStatement | ForStatement | ForOfStatement | ForInStatement;
  declarations: Nodes<VariableDeclaration>;
  createVariableDeclarationList(declarations: readonly VariableDeclaration[], flags = NodeFlags.None) {
    super(true);
    this.flags |= flags & NodeFlags.BlockScoped;
    this.declarations = new Nodes(declarations);
  }
  update(declarations: readonly VariableDeclaration[]) {
    return this.declarations !== declarations ? new create(declarations, this.flags).updateFrom(this) : this;
  }
}
VariableDeclarationList.prototype.kind = VariableDeclarationList.kind;
export class VariableStatement extends qc.Statement implements qc.VariableStatement {
  //}, JSDocContainer {
  static readonly kind = Syntax.VariableStatement;
  declarationList: VariableDeclarationList;
  createVariableStatement(modifiers: readonly Modifier[] | undefined, declarationList: VariableDeclarationList | readonly VariableDeclaration[]) {
    super(true);
    this.decorators = undefined;
    this.modifiers = Nodes.from(modifiers);
    this.declarationList = isArray(declarationList) ? createVariableDeclarationList(declarationList) : declarationList;
  }
  update(modifiers: readonly Modifier[] | undefined, declarationList: VariableDeclarationList) {
    return this.modifiers !== modifiers || this.declarationList !== declarationList ? new create(modifiers, declarationList).updateFrom(this) : this;
  }
}
VariableStatement.prototype.kind = VariableStatement.kind;
export class VoidExpression extends qc.UnaryExpression implements qc.VoidExpression {
  static readonly kind = Syntax.VoidExpression;
  expression: qc.UnaryExpression;
  constructor(e: qc.Expression) {
    super(true);
    this.expression = parenthesize.prefixOperand(e);
  }
  update(e: qc.Expression) {
    return this.expression !== e ? new VoidExpression(e).updateFrom(this) : this;
  }
  static zero() {
    return new VoidExpression(createLiteral(0));
  }
}
VoidExpression.prototype.kind = VoidExpression.kind;
export class WhileStatement extends IterationStatement implements qc.WhileStatement {
  static readonly kind = Syntax.WhileStatement;
  expression: qc.Expression;
  createWhile(expression: qc.Expression, statement: qc.Statement) {
    super(true);
    this.expression = expression;
    this.statement = asEmbeddedStatement(statement);
  }
  update(expression: qc.Expression, statement: qc.Statement) {
    return this.expression !== expression || this.statement !== statement ? new create(expression, statement).updateFrom(this) : this;
  }
}
WhileStatement.prototype.kind = WhileStatement.kind;
export class WithStatement extends qc.Statement implements qc.WithStatement {
  static readonly kind = Syntax.WithStatement;
  expression: qc.Expression;
  statement: qc.Statement;
  createWith(expression: qc.Expression, statement: qc.Statement) {
    super(true);
    this.expression = expression;
    this.statement = asEmbeddedStatement(statement);
  }
  update(expression: qc.Expression, statement: qc.Statement) {
    return this.expression !== expression || this.statement !== statement ? new create(expression, statement).updateFrom(this) : this;
  }
}
WithStatement.prototype.kind = WithStatement.kind;
export class YieldExpression extends qc.Expression implements qc.YieldExpression {
  static readonly kind = Syntax.YieldExpression;
  asteriskToken?: AsteriskToken;
  expression?: qc.Expression;
  createYield(expression?: qc.Expression): YieldExpression;
  createYield(asteriskToken: qc.AsteriskToken | undefined, expression: qc.Expression): YieldExpression;
  createYield(asteriskTokenOrExpression?: qc.AsteriskToken | undefined | qc.Expression, expression?: qc.Expression) {
    const asteriskToken = asteriskTokenOrExpression && asteriskTokenOrExpression.kind === Syntax.AsteriskToken ? <AsteriskToken>asteriskTokenOrExpression : undefined;
    expression = asteriskTokenOrExpression && asteriskTokenOrExpression.kind !== Syntax.AsteriskToken ? asteriskTokenOrExpression : expression;
    super(true);
    this.asteriskToken = asteriskToken;
    this.expression = expression && parenthesize.expressionForList(expression);
  }
  update(asteriskToken: qc.AsteriskToken | undefined, expression: qc.Expression) {
    return this.expression !== expression || this.asteriskToken !== asteriskToken ? new create(asteriskToken, expression).updateFrom(this) : this;
  }
}
YieldExpression.prototype.kind = YieldExpression.kind;
export namespace parenthesize {
  interface BinaryPlusExpression extends BinaryExpression {
    cachedLiteralKind: Syntax;
  }
  function getLiteralKindOfBinaryPlusOperand(this: qc.Expression): Syntax {
    this = skipPartiallyEmittedExpressions(this);
    if (qy.is.literal(this.kind)) return this.kind;
    if (this.kind === Syntax.BinaryExpression && (<BinaryExpression>this).operatorToken.kind === Syntax.PlusToken) {
      if ((<BinaryPlusExpression>this).cachedLiteralKind !== undefined) return (<BinaryPlusExpression>this).cachedLiteralKind;
      const leftKind = getLiteralKindOfBinaryPlusOperand((<BinaryExpression>this).left);
      const literalKind = qy.is.literal(leftKind) && leftKind === getLiteralKindOfBinaryPlusOperand((<BinaryExpression>this).right) ? leftKind : Syntax.Unknown;
      (<BinaryPlusExpression>this).cachedLiteralKind = literalKind;
      return literalKind;
    }
    return Syntax.Unknown;
  }
  export function binaryOperand(binaryOperator: Syntax, operand: qc.Expression, isLeftSideOfBinary: boolean, leftOperand?: qc.Expression) {
    const skipped = skipPartiallyEmittedExpressions(operand);
    if (skipped.kind === Syntax.ParenthesizedExpression) return operand;
    function operatorHasAssociativeProperty(binaryOperator: Syntax) {
      // The following operators are associative in JavaScript:
      //  (a*b)*c     -> a*(b*c)  -> a*b*c
      //  (a|b)|c     -> a|(b|c)  -> a|b|c
      //  (a&b)&c     -> a&(b&c)  -> a&b&c
      //  (a^b)^c     -> a^(b^c)  -> a^b^c
      //
      // While addition is associative in mathematics, JavaScript's `+` is not
      // guaranteed to be associative as it is overloaded with string concatenation.
      return binaryOperator === Syntax.AsteriskToken || binaryOperator === Syntax.BarToken || binaryOperator === Syntax.AmpersandToken || binaryOperator === Syntax.CaretToken;
    }
    function binaryOperandNeedsParentheses(binaryOperator: Syntax, operand: qc.Expression, isLeftSideOfBinary: boolean, leftOperand: qc.Expression | undefined) {
      const binaryOperatorPrecedence = qy.get.operatorPrecedence(Syntax.BinaryExpression, binaryOperator);
      const binaryOperatorAssociativity = qy.get.operatorAssociativity(Syntax.BinaryExpression, binaryOperator);
      const emittedOperand = skipPartiallyEmittedExpressions(operand);
      if (!isLeftSideOfBinary && operand.kind === Syntax.ArrowFunction && binaryOperatorPrecedence > 3) return true;
      const operandPrecedence = getExpressionPrecedence(emittedOperand);
      switch (compareValues(operandPrecedence, binaryOperatorPrecedence)) {
        case Comparison.LessThan:
          if (!isLeftSideOfBinary && binaryOperatorAssociativity === Associativity.Right && operand.kind === Syntax.YieldExpression) return false;
          return true;
        case Comparison.GreaterThan:
          return false;
        case Comparison.EqualTo:
          if (isLeftSideOfBinary) {
            // No need to parenthesize the left operand when the binary operator is
            // left associative:
            //  (a*b)/x    -> a*b/x
            //  (a**b)/x   -> a**b/x
            //
            // Parentheses are needed for the left operand when the binary operator is
            // right associative:
            //  (a/b)**x   -> (a/b)**x
            //  (a**b)**x  -> (a**b)**x
            return binaryOperatorAssociativity === Associativity.Right;
          } else {
            if (Node.is.kind(emittedOperand, BinaryExpression) && emittedOperand.operatorToken.kind === binaryOperator) {
              // No need to parenthesize the right operand when the binary operator and
              // operand are the same and one of the following:
              //  x*(a*b)     => x*a*b
              //  x|(a|b)     => x|a|b
              //  x&(a&b)     => x&a&b
              //  x^(a^b)     => x^a^b
              if (operatorHasAssociativeProperty(binaryOperator)) return false;
              // No need to parenthesize the right operand when the binary operator
              // is plus (+) if both the left and right operands consist solely of either
              // literals of the same kind or binary plus (+) expressions for literals of
              // the same kind (recursively).
              //  "a"+(1+2)       => "a"+(1+2)
              //  "a"+("b"+"c")   => "a"+"b"+"c"
              if (binaryOperator === Syntax.PlusToken) {
                const leftKind = leftOperand ? getLiteralKindOfBinaryPlusOperand(leftOperand) : Syntax.Unknown;
                if (qy.is.literal(leftKind) && leftKind === getLiteralKindOfBinaryPlusOperand(emittedOperand)) return false;
              }
            }
            // No need to parenthesize the right operand when the operand is right
            // associative:
            //  x/(a**b)    -> x/a**b
            //  x**(a**b)   -> x**a**b
            //
            // Parentheses are needed for the right operand when the operand is left
            // associative:
            //  x/(a*b)     -> x/(a*b)
            //  x**(a/b)    -> x**(a/b)
            const operandAssociativity = getExpressionAssociativity(emittedOperand);
            return operandAssociativity === Associativity.Left;
          }
      }
    }
    return binaryOperandNeedsParentheses(binaryOperator, operand, isLeftSideOfBinary, leftOperand) ? new ParenthesizedExpression(operand) : operand;
  }
  export function forConditionalHead(c: qc.Expression) {
    const conditionalPrecedence = qy.get.operatorPrecedence(Syntax.ConditionalExpression, qc.QuestionToken);
    const emittedCondition = skipPartiallyEmittedExpressions(c);
    const conditionPrecedence = getExpressionPrecedence(emittedCondition);
    if (compareValues(conditionPrecedence, conditionalPrecedence) !== Comparison.GreaterThan) return new ParenthesizedExpression(c);
    return c;
  }
  export function subexpressionOfConditionalExpression(e: qc.Expression): qc.Expression {
    const emittedExpression = skipPartiallyEmittedExpressions(e);
    return isCommaSequence(emittedExpression) ? new ParenthesizedExpression(e) : e;
  }
  export function forAccess(e: qc.Expression): qc.LeftHandSideExpression {
    const e2 = skipPartiallyEmittedExpressions(e);
    if (Node.is.leftHandSideExpression(e2) && (e2.kind !== Syntax.NewExpression || (<NewExpression>e2).arguments)) return <qc.LeftHandSideExpression>e;
    return setRange(new ParenthesizedExpression(e), e);
  }
  export function postfixOperand(e: qc.Expression) {
    return Node.is.leftHandSideExpression(e) ? e : setRange(new ParenthesizedExpression(e), e);
  }
  export function prefixOperand(e: qc.Expression) {
    return Node.is.unaryExpression(e) ? e : setRange(new ParenthesizedExpression(e), e);
  }
  export function listElements(es: Nodes<qc.Expression>) {
    let r: qc.Expression[] | undefined;
    for (let i = 0; i < es.length; i++) {
      const e = parenthesize.expressionForList(es[i]);
      if (r || e !== es[i]) {
        if (!r) r = es.slice(0, i);
        r.push(e);
      }
    }
    return r ? setRange(new Nodes(r, es.trailingComma), es) : es;
  }
  export function expressionForList(e: qc.Expression) {
    const emittedExpression = skipPartiallyEmittedExpressions(e);
    const expressionPrecedence = getExpressionPrecedence(emittedExpression);
    const commaPrecedence = qy.get.operatorPrecedence(Syntax.BinaryExpression, Syntax.CommaToken);
    return expressionPrecedence > commaPrecedence ? e : setRange(new ParenthesizedExpression(e), e);
  }
  export function expressionForExpressionStatement(expression: qc.Expression) {
    const emittedExpression = skipPartiallyEmittedExpressions(expression);
    if (Node.is.kind(CallExpression, emittedExpression)) {
      const callee = emittedExpression.expression;
      const kind = skipPartiallyEmittedExpressions(callee).kind;
      if (kind === Syntax.FunctionExpression || kind === Syntax.ArrowFunction) {
        const mutableCall = getMutableClone(emittedExpression);
        mutableCall.expression = setRange(new ParenthesizedExpression(callee), callee);
        return recreateOuterExpressions(expression, mutableCall, OuterExpressionKinds.PartiallyEmittedExpressions);
      }
    }
    const leftmostExpressionKind = getLeftmostExpression(emittedExpression, false).kind;
    if (leftmostExpressionKind === Syntax.ObjectLiteralExpression || leftmostExpressionKind === Syntax.FunctionExpression) return setRange(new ParenthesizedExpression(expression), expression);
    return expression;
  }
  export function conditionalTypeMember(n: qc.TypeNode) {
    return n.kind === Syntax.ConditionalType ? ParenthesizedTypeNode.create(n) : n;
  }
  export function elementTypeMember(n: qc.TypeNode) {
    switch (n.kind) {
      case Syntax.UnionType:
      case Syntax.IntersectionType:
      case Syntax.FunctionType:
      case Syntax.ConstructorType:
        return ParenthesizedTypeNode.create(n);
    }
    return conditionalTypeMember(n);
  }
  export function arrayTypeMember(n: qc.TypeNode) {
    switch (n.kind) {
      case Syntax.TypeQuery:
      case Syntax.TypeOperator:
      case Syntax.InferType:
        return ParenthesizedTypeNode.create(n);
    }
    return elementTypeMember(n);
  }
  export function elementTypeMembers(ns: readonly qc.TypeNode[]) {
    return new Nodes(sameMap(ns, elementTypeMember));
  }
  export function typeParameters(ns?: readonly qc.TypeNode[]) {
    if (some(ns)) {
      const ps: qc.TypeNode[] = [];
      for (let i = 0; i < ns.length; ++i) {
        const p = ns[i];
        ps.push(i === 0 && Node.is.functionOrConstructorTypeNode(p) && p.typeParameters ? ParenthesizedTypeNode.create(p) : p);
      }
      return new Nodes(ps);
    }
    return;
  }
  export function defaultExpression(e: qc.Expression) {
    const check = skipPartiallyEmittedExpressions(e);
    let needsParens = isCommaSequence(check);
    if (!needsParens) {
      switch (getLeftmostExpression(check, false).kind) {
        case Syntax.ClassExpression:
        case Syntax.FunctionExpression:
          needsParens = true;
      }
    }
    return needsParens ? new ParenthesizedExpression(e) : e;
  }
  export function forNew(e: qc.Expression): qc.LeftHandSideExpression {
    const leftmostExpr = getLeftmostExpression(e, true);
    switch (leftmostExpr.kind) {
      case Syntax.CallExpression:
        return new ParenthesizedExpression(e);
      case Syntax.NewExpression:
        return !(leftmostExpr as NewExpression).arguments ? new ParenthesizedExpression(e) : <qc.LeftHandSideExpression>e;
    }
    return forAccess(e);
  }
  export function conciseBody(b: qc.ConciseBody): qc.ConciseBody {
    if (!Node.is.kind(Block, b) && (isCommaSequence(b) || getLeftmostExpression(b, false).kind === Syntax.ObjectLiteralExpression)) return setRange(new ParenthesizedExpression(b), b);
    return b;
  }
}
export namespace emit {
  export function disposeEmitNodes(sourceFile: SourceFile) {
    sourceFile = Node.get.sourceFileOf(Node.get.parseTreeOf(sourceFile));
    const emitNode = sourceFile && sourceFile.emitNode;
    const annotatedNodes = emitNode && emitNode.annotatedNodes;
    if (annotatedNodes) {
      for (const n of annotatedNodes) {
        n.emitNode = undefined;
      }
    }
  }
  export function getOrCreateEmitNode(n: Node): EmitNode {
    if (!n.emitNode) {
      if (Node.is.parseTreeNode(n)) {
        if (n.kind === Syntax.SourceFile) return (n.emitNode = { annotatedNodes: [n] } as EmitNode);
        const sourceFile = Node.get.sourceFileOf(Node.get.parseTreeOf(Node.get.sourceFileOf(n)));
        getOrCreateEmitNode(sourceFile).annotatedNodes!.push(n);
      }
      n.emitNode = {} as EmitNode;
    }
    return n.emitNode;
  }
  export function removeAllComments<T extends Node>(n: T): T {
    const emitNode = getOrCreateEmitNode(n);
    emitNode.flags |= qc.EmitFlags.NoComments;
    emitNode.leadingComments = undefined;
    emitNode.trailingComments = undefined;
    return n;
  }
  export function setEmitFlags<T extends Node>(n: T, emitFlags: EmitFlags) {
    getOrCreateEmitNode(n).flags = emitFlags;
    return n;
  }
  export function addEmitFlags<T extends Node>(n: T, emitFlags: EmitFlags) {
    const emitNode = getOrCreateEmitNode(n);
    emitNode.flags = emitNode.flags | emitFlags;
    return n;
  }
  export function getSourceMapRange(n: Node): SourceMapRange {
    const emitNode = n.emitNode;
    return (emitNode && emitNode.sourceMapRange) || n;
  }
  export function setSourceMapRange<T extends Node>(n: T, range: SourceMapRange | undefined) {
    getOrCreateEmitNode(n).sourceMapRange = range;
    return n;
  }
  export function getTokenSourceMapRange(n: Node, token: Syntax): SourceMapRange | undefined {
    const emitNode = n.emitNode;
    const tokenSourceMapRanges = emitNode && emitNode.tokenSourceMapRanges;
    return tokenSourceMapRanges && tokenSourceMapRanges[token];
  }
  export function setTokenSourceMapRange<T extends Node>(n: T, token: Syntax, range: SourceMapRange | undefined) {
    const emitNode = getOrCreateEmitNode(n);
    const tokenSourceMapRanges = emitNode.tokenSourceMapRanges || (emitNode.tokenSourceMapRanges = []);
    tokenSourceMapRanges[token] = range;
    return n;
  }
  export function getStartsOnNewLine(n: Node) {
    const emitNode = n.emitNode;
    return emitNode && emitNode.startsOnNewLine;
  }
  export function setStartsOnNewLine<T extends Node>(n: T, newLine: boolean) {
    getOrCreateEmitNode(n).startsOnNewLine = newLine;
    return n;
  }
  export function getCommentRange(n: Node) {
    const emitNode = n.emitNode;
    return (emitNode && emitNode.commentRange) || n;
  }
  export function setCommentRange<T extends Node>(n: T, range: TextRange) {
    getOrCreateEmitNode(n).commentRange = range;
    return n;
  }
  export function getSyntheticLeadingComments(n: Node): SynthesizedComment[] | undefined {
    const emitNode = n.emitNode;
    return emitNode && emitNode.leadingComments;
  }
  export function setSyntheticLeadingComments<T extends Node>(n: T, comments: SynthesizedComment[] | undefined) {
    getOrCreateEmitNode(n).leadingComments = comments;
    return n;
  }
  export function addSyntheticLeadingComment<T extends Node>(n: T, kind: Syntax.SingleLineCommentTrivia | Syntax.MultiLineCommentTrivia, text: string, hasTrailingNewLine?: boolean) {
    return setSyntheticLeadingComments(
      n,
      append<SynthesizedComment>(getSyntheticLeadingComments(n), { kind, pos: -1, end: -1, hasTrailingNewLine, text })
    );
  }
  export function getSyntheticTrailingComments(n: Node): SynthesizedComment[] | undefined {
    const emitNode = n.emitNode;
    return emitNode && emitNode.trailingComments;
  }
  export function setSyntheticTrailingComments<T extends Node>(n: T, comments: SynthesizedComment[] | undefined) {
    getOrCreateEmitNode(n).trailingComments = comments;
    return n;
  }
  export function addSyntheticTrailingComment<T extends Node>(n: T, kind: Syntax.SingleLineCommentTrivia | Syntax.MultiLineCommentTrivia, text: string, hasTrailingNewLine?: boolean) {
    return setSyntheticTrailingComments(
      n,
      append<SynthesizedComment>(getSyntheticTrailingComments(n), { kind, pos: -1, end: -1, hasTrailingNewLine, text })
    );
  }
  export function moveSyntheticComments<T extends Node>(n: T, original: Node): T {
    setSyntheticLeadingComments(n, getSyntheticLeadingComments(original));
    setSyntheticTrailingComments(n, getSyntheticTrailingComments(original));
    const emit = getOrCreateEmitNode(original);
    emit.leadingComments = undefined;
    emit.trailingComments = undefined;
    return n;
  }
  export function ignoreSourceNewlines<T extends Node>(n: T): T {
    getOrCreateEmitNode(n).flags |= qc.EmitFlags.IgnoreSourceNewlines;
    return n;
  }
  export function getConstantValue(n: PropertyAccessExpression | ElementAccessExpression): string | number | undefined {
    const emitNode = n.emitNode;
    return emitNode && emitNode.constantValue;
  }
  export function setConstantValue(n: PropertyAccessExpression | ElementAccessExpression, value: string | number): PropertyAccessExpression | ElementAccessExpression {
    const emitNode = getOrCreateEmitNode(n);
    emitNode.constantValue = value;
    return n;
  }
  export function addEmitHelper<T extends Node>(n: T, helper: EmitHelper): T {
    const emitNode = getOrCreateEmitNode(n);
    emitNode.helpers = append(emitNode.helpers, helper);
    return n;
  }
  export function addEmitHelpers<T extends Node>(n: T, helpers: EmitHelper[] | undefined): T {
    if (some(helpers)) {
      const emitNode = getOrCreateEmitNode(n);
      for (const helper of helpers) {
        emitNode.helpers = appendIfUnique(emitNode.helpers, helper);
      }
    }
    return n;
  }
  export function removeEmitHelper(n: Node, helper: EmitHelper): boolean {
    const emitNode = n.emitNode;
    if (emitNode) {
      const helpers = emitNode.helpers;
      if (helpers) return orderedRemoveItem(helpers, helper);
    }
    return false;
  }
  export function getEmitHelpers(n: Node): EmitHelper[] | undefined {
    const emitNode = n.emitNode;
    return emitNode && emitNode.helpers;
  }
  export function moveEmitHelpers(source: Node, target: Node, predicate: (helper: EmitHelper) => boolean) {
    const sourceEmitNode = source.emitNode;
    const sourceEmitHelpers = sourceEmitNode && sourceEmitNode.helpers;
    if (!some(sourceEmitHelpers)) return;
    const targetEmitNode = getOrCreateEmitNode(target);
    let helpersRemoved = 0;
    for (let i = 0; i < sourceEmitHelpers.length; i++) {
      const helper = sourceEmitHelpers[i];
      if (predicate(helper)) {
        helpersRemoved++;
        targetEmitNode.helpers = appendIfUnique(targetEmitNode.helpers, helper);
      } else if (helpersRemoved > 0) sourceEmitHelpers[i - helpersRemoved] = helper;
    }
    if (helpersRemoved > 0) sourceEmitHelpers.length -= helpersRemoved;
  }
  export function compareEmitHelpers(x: EmitHelper, y: EmitHelper) {
    if (x === y) return Comparison.EqualTo;
    if (x.priority === y.priority) return Comparison.EqualTo;
    if (x.priority === undefined) return Comparison.GreaterThan;
    if (y.priority === undefined) return Comparison.LessThan;
    return compareValues(x.priority, y.priority);
  }
  function mergeEmitNode(sourceEmitNode: EmitNode, destEmitNode: EmitNode | undefined) {
    const { flags, leadingComments, trailingComments, commentRange, sourceMapRange, tokenSourceMapRanges, constantValue, helpers, startsOnNewLine } = sourceEmitNode;
    if (!destEmitNode) destEmitNode = {} as EmitNode;
    // We are using `.slice()` here in case `destEmitNode.leadingComments` is pushed to later.
    if (leadingComments) destEmitNode.leadingComments = addRange(leadingComments.slice(), destEmitNode.leadingComments);
    if (trailingComments) destEmitNode.trailingComments = addRange(trailingComments.slice(), destEmitNode.trailingComments);
    if (flags) destEmitNode.flags = flags;
    if (commentRange) destEmitNode.commentRange = commentRange;
    if (sourceMapRange) destEmitNode.sourceMapRange = sourceMapRange;
    if (tokenSourceMapRanges) destEmitNode.tokenSourceMapRanges = mergeTokenSourceMapRanges(tokenSourceMapRanges, destEmitNode.tokenSourceMapRanges!);
    if (constantValue !== undefined) destEmitNode.constantValue = constantValue;
    if (helpers) destEmitNode.helpers = addRange(destEmitNode.helpers, helpers);
    if (startsOnNewLine !== undefined) destEmitNode.startsOnNewLine = startsOnNewLine;
    return destEmitNode;
  }
  export function getExternalHelpersModuleName(n: SourceFile) {
    const parseNode = Node.get.originalOf(n, isSourceFile);
    const emitNode = parseNode && parseNode.emitNode;
    return emitNode && emitNode.externalHelpersModuleName;
  }
  export function hasRecordedExternalHelpers(sourceFile: SourceFile) {
    const parseNode = Node.get.originalOf(sourceFile, isSourceFile);
    const emitNode = parseNode && parseNode.emitNode;
    return !!emitNode && (!!emitNode.externalHelpersModuleName || !!emitNode.externalHelpers);
  }
}
export namespace fixme {
  export function createLiteral(value: string | StringLiteral | NoSubstitutionLiteral | NumericLiteral | Identifier, isSingleQuote: boolean): StringLiteral; // eslint-disable-line @typescript-eslint/unified-signatures
  export function createLiteral(value: string | number, isSingleQuote: boolean): StringLiteral | NumericLiteral;
  export function createLiteral(value: string | StringLiteral | NoSubstitutionLiteral | NumericLiteral | Identifier): StringLiteral;
  export function createLiteral(value: number | PseudoBigInt): NumericLiteral;
  export function createLiteral(value: boolean): BooleanLiteral;
  export function createLiteral(value: string | number | PseudoBigInt | boolean): qc.PrimaryExpression;
  export function createLiteral(value: string | number | PseudoBigInt | boolean | StringLiteral | NoSubstitutionLiteral | NumericLiteral | Identifier, isSingleQuote?: boolean): qc.PrimaryExpression {
    if (typeof value === 'number') return NumericLiteral.create(value + '');
    if (typeof value === 'object' && 'base10Value' in value) return BigIntLiteral.create(pseudoBigIntToString(value) + 'n');
    if (typeof value === 'boolean') return value ? createTrue() : createFalse();
    if (isString(value)) {
      const res = StringLiteral.create(value);
      if (isSingleQuote) res.singleQuote = true;
      return res;
    }
    return createLiteralFromNode(value);
  }
  export function createSuper() {
    return <SuperExpression>Node.createSynthesized(Syntax.SuperKeyword);
  }
  export function createThis() {
    return <ThisExpression & qc.Token<Syntax.ThisKeyword>>Node.createSynthesized(Syntax.ThisKeyword);
  }
  export function createNull() {
    return <NullLiteral & qc.Token<Syntax.NullKeyword>>Node.createSynthesized(Syntax.NullKeyword);
  }
  export function createTrue() {
    return <BooleanLiteral & qc.Token<Syntax.TrueKeyword>>Node.createSynthesized(Syntax.TrueKeyword);
  }
  export function createFalse() {
    return <BooleanLiteral & qc.Token<Syntax.FalseKeyword>>Node.createSynthesized(Syntax.FalseKeyword);
  }
  export function updateFunctionLikeBody(declaration: FunctionLikeDeclaration, body: Block): FunctionLikeDeclaration {
    switch (declaration.kind) {
      case Syntax.FunctionDeclaration:
        return new qc.FunctionDeclaration(
          declaration.decorators,
          declaration.modifiers,
          declaration.asteriskToken,
          declaration.name,
          declaration.typeParameters,
          declaration.parameters,
          declaration.type,
          body
        );
      case Syntax.MethodDeclaration:
        return MethodDeclaration.create(
          declaration.decorators,
          declaration.modifiers,
          declaration.asteriskToken,
          declaration.name,
          declaration.questionToken,
          declaration.typeParameters,
          declaration.parameters,
          declaration.type,
          body
        );
      case Syntax.GetAccessor:
        return GetAccessorDeclaration.create(declaration.decorators, declaration.modifiers, declaration.name, declaration.parameters, declaration.type, body);
      case Syntax.SetAccessor:
        return SetAccessorDeclaration.create(declaration.decorators, declaration.modifiers, declaration.name, declaration.parameters, body);
      case Syntax.Constructor:
        return ConstructorDeclaration.create(declaration.decorators, declaration.modifiers, declaration.parameters, body);
      case Syntax.FunctionExpression:
        return new FunctionExpression(declaration.modifiers, declaration.asteriskToken, declaration.name, declaration.typeParameters, declaration.parameters, declaration.type, body);
      case Syntax.ArrowFunction:
        return new ArrowFunction(declaration.modifiers, declaration.typeParameters, declaration.parameters, declaration.type, declaration.equalsGreaterThanToken, body);
    }
  }
  export function appendJSDocToContainer(n: JSDocContainer, jsdoc: JSDoc) {
    n.jsDoc = append(n.jsDoc, jsdoc);
    return n;
  }
  export function createInputFiles(javascriptText: string, declarationText: string): InputFiles;
  export function createInputFiles(
    readFileText: (path: string) => string | undefined,
    javascriptPath: string,
    javascriptMapPath: string | undefined,
    declarationPath: string,
    declarationMapPath: string | undefined,
    buildInfoPath: string | undefined
  ): InputFiles;
  export function createInputFiles(
    javascriptText: string,
    declarationText: string,
    javascriptMapPath: string | undefined,
    javascriptMapText: string | undefined,
    declarationMapPath: string | undefined,
    declarationMapText: string | undefined
  ): InputFiles;
  export function createInputFiles(
    javascriptText: string,
    declarationText: string,
    javascriptMapPath: string | undefined,
    javascriptMapText: string | undefined,
    declarationMapPath: string | undefined,
    declarationMapText: string | undefined,
    javascriptPath: string | undefined,
    declarationPath: string | undefined,
    buildInfoPath?: string | undefined,
    buildInfo?: BuildInfo,
    oldFileOfCurrentEmit?: boolean
  ): InputFiles;
  export function createInputFiles(
    javascriptTextOrReadFileText: string | ((path: string) => string | undefined),
    declarationTextOrJavascriptPath: string,
    javascriptMapPath?: string,
    javascriptMapTextOrDeclarationPath?: string,
    declarationMapPath?: string,
    declarationMapTextOrBuildInfoPath?: string,
    javascriptPath?: string | undefined,
    declarationPath?: string | undefined,
    buildInfoPath?: string | undefined,
    buildInfo?: BuildInfo,
    oldFileOfCurrentEmit?: boolean
  ): InputFiles {
    const node = <InputFiles>createNode(Syntax.InputFiles);
    if (!isString(javascriptTextOrReadFileText)) {
      const cache = createMap<string | false>();
      const textGetter = (path: string | undefined) => {
        if (path === undefined) return;
        let value = cache.get(path);
        if (value === undefined) {
          value = javascriptTextOrReadFileText(path);
          cache.set(path, value !== undefined ? value : false);
        }
        return value !== false ? (value as string) : undefined;
      };
      const definedTextGetter = (path: string) => {
        const result = textGetter(path);
        return result !== undefined ? result : `Input file ${path} was missing \r\n`;
      };
      let buildInfo: BuildInfo | false;
      const getAndCacheBuildInfo = (getText: () => string | undefined) => {
        if (buildInfo === undefined) {
          const result = getText();
          buildInfo = result !== undefined ? getBuildInfo(result) : false;
        }
        return buildInfo || undefined;
      };
      node.javascriptPath = declarationTextOrJavascriptPath;
      node.javascriptMapPath = javascriptMapPath;
      node.declarationPath = qg.checkDefined(javascriptMapTextOrDeclarationPath);
      node.declarationMapPath = declarationMapPath;
      node.buildInfoPath = declarationMapTextOrBuildInfoPath;
      Object.defineProperties(node, {
        javascriptText: {
          get() {
            return definedTextGetter(declarationTextOrJavascriptPath);
          },
        },
        javascriptMapText: {
          get() {
            return textGetter(javascriptMapPath);
          },
        },
        declarationText: {
          get() {
            return definedTextGetter(qg.checkDefined(javascriptMapTextOrDeclarationPath));
          },
        },
        declarationMapText: {
          get() {
            return textGetter(declarationMapPath);
          },
        },
        buildInfo: {
          get() {
            return getAndCacheBuildInfo(() => textGetter(declarationMapTextOrBuildInfoPath));
          },
        },
      });
    } else {
      node.javascriptText = javascriptTextOrReadFileText;
      node.javascriptMapPath = javascriptMapPath;
      node.javascriptMapText = javascriptMapTextOrDeclarationPath;
      node.declarationText = declarationTextOrJavascriptPath;
      node.declarationMapPath = declarationMapPath;
      node.declarationMapText = declarationMapTextOrBuildInfoPath;
      node.javascriptPath = javascriptPath;
      node.declarationPath = declarationPath;
      node.buildInfoPath = buildInfoPath;
      node.buildInfo = buildInfo;
      node.oldFileOfCurrentEmit = oldFileOfCurrentEmit;
    }
    return node;
  }
  let SourceMapSource: new (fileName: string, text: string, skipTrivia?: (pos: number) => number) => SourceMapSource;
  export function createSourceMapSource(fileName: string, text: string, skipTrivia?: (pos: number) => number): SourceMapSource {
    return new (SourceMapSource || (SourceMapSource = Node.SourceMapSourceObj))(fileName, text, qy.skipTrivia);
  }
  export function getUnscopedHelperName(name: string) {
    return setEmitFlags(new Identifier(name), qc.EmitFlags.HelperName | qc.EmitFlags.AdviseOnEmitNode);
  }
  export function inlineExpressions(expressions: readonly qc.Expression[]) {
    return expressions.length > 10 ? new CommaListExpression(expressions) : reduceLeft(expressions, createComma)!;
  }
  export function convertToFunctionBody(node: ConciseBody, multiLine?: boolean): Block {
    return Node.is.kind(Block, node) ? node : setRange(new Block([setRange(createReturn(node), node)], multiLine), node);
  }
  export function convertFunctionDeclarationToExpression(node: FunctionDeclaration) {
    if (!node.body) return fail();
    const updated = new FunctionExpression(node.modifiers, node.asteriskToken, node.name, node.typeParameters, node.parameters, node.type, node.body);
    setOriginalNode(updated, node);
    setRange(updated, node);
    if (getStartsOnNewLine(node)) setStartsOnNewLine(updated, true);
    aggregateTransformFlags(updated);
    return updated;
  }
  export function ensureUseStrict(statements: Nodes<qc.Statement>): Nodes<qc.Statement> {
    const foundUseStrict = findUseStrictPrologue(statements);
    if (!foundUseStrict) {
      return setRange(
        new Nodes<qc.Statement>([startOnNewLine(createStatement(createLiteral('use strict'))), ...statements]),
        statements
      );
    }
    return statements;
  }
  export function startOnNewLine<T extends Node>(node: T): T {
    return setStartsOnNewLine(node, true);
  }
  export function createExternalHelpersImportDeclarationIfNeeded(
    sourceFile: SourceFile,
    compilerOptions: CompilerOptions,
    hasExportStarsToExportValues?: boolean,
    hasImportStar?: boolean,
    hasImportDefault?: boolean
  ) {
    if (compilerOptions.importHelpers && isEffectiveExternalModule(sourceFile, compilerOptions)) {
      let namedBindings: qc.NamedImportBindings | undefined;
      const moduleKind = getEmitModuleKind(compilerOptions);
      if (moduleKind >= ModuleKind.ES2015 && moduleKind <= ModuleKind.ESNext) {
        const helpers = getEmitHelpers(sourceFile);
        if (helpers) {
          const helperNames: string[] = [];
          for (const helper of helpers) {
            if (!helper.scoped) {
              const importName = (helper as UnscopedEmitHelper).importName;
              if (importName) {
                pushIfUnique(helperNames, importName);
              }
            }
          }
          if (some(helperNames)) {
            helperNames.sort(compareStringsCaseSensitive);
            namedBindings = new qc.NamedImports(
              map(helperNames, (name) =>
                isFileLevelUniqueName(sourceFile, name) ? new qc.ImportSpecifier(undefined, new Identifier(name)) : new qc.ImportSpecifier(new Identifier(name), getUnscopedHelperName(name))
              )
            );
            const parseNode = Node.get.originalOf(sourceFile, isSourceFile);
            const emitNode = getOrCreateEmitNode(parseNode);
            emitNode.externalHelpers = true;
          }
        }
      } else {
        const externalHelpersModuleName = getOrCreateExternalHelpersModuleNameIfNeeded(sourceFile, compilerOptions, hasExportStarsToExportValues, hasImportStar || hasImportDefault);
        if (externalHelpersModuleName) {
          namedBindings = new qc.NamespaceImport(externalHelpersModuleName);
        }
      }
      if (namedBindings) {
        const externalHelpersImportDeclaration = new qc.ImportDeclaration(undefined, undefined, new qc.ImportClause(undefined, namedBindings), createLiteral(externalHelpersModuleNameText));
        addEmitFlags(externalHelpersImportDeclaration, qc.EmitFlags.NeverApplyImportHelper);
        return externalHelpersImportDeclaration;
      }
    }
    return;
  }
  export function getOrCreateExternalHelpersModuleNameIfNeeded(node: SourceFile, compilerOptions: CompilerOptions, hasExportStarsToExportValues?: boolean, hasImportStarOrImportDefault?: boolean) {
    if (compilerOptions.importHelpers && isEffectiveExternalModule(node, compilerOptions)) {
      const externalHelpersModuleName = getExternalHelpersModuleName(node);
      if (externalHelpersModuleName) return externalHelpersModuleName;
      const moduleKind = getEmitModuleKind(compilerOptions);
      let create = (hasExportStarsToExportValues || (compilerOptions.esModuleInterop && hasImportStarOrImportDefault)) && moduleKind !== ModuleKind.System && moduleKind < ModuleKind.ES2015;
      if (!create) {
        const helpers = getEmitHelpers(node);
        if (helpers) {
          for (const helper of helpers) {
            if (!helper.scoped) {
              create = true;
              break;
            }
          }
        }
      }
      if (create) {
        const parseNode = Node.get.originalOf(node, isSourceFile);
        const emitNode = getOrCreateEmitNode(parseNode);
        return emitNode.externalHelpersModuleName || (emitNode.externalHelpersModuleName = createUniqueName(externalHelpersModuleNameText));
      }
    }
    return;
  }
  export function getExternalModuleNameLiteral(
    importNode: ImportDeclaration | ExportDeclaration | ImportEqualsDeclaration,
    sourceFile: SourceFile,
    host: EmitHost,
    resolver: EmitResolver,
    compilerOptions: CompilerOptions
  ) {
    const moduleName = getExternalModuleName(importNode)!;
    if (moduleName.kind === Syntax.StringLiteral) {
      function tryRenameExternalModule(moduleName: LiteralExpression, sourceFile: SourceFile) {
        const rename = sourceFile.renamedDependencies && sourceFile.renamedDependencies.get(moduleName.text);
        return rename && createLiteral(rename);
      }
      function tryGetModuleNameFromDeclaration(declaration: ImportEqualsDeclaration | ImportDeclaration | ExportDeclaration, host: EmitHost, resolver: EmitResolver, compilerOptions: CompilerOptions) {
        return tryGetModuleNameFromFile(resolver.getExternalModuleFileFromDeclaration(declaration), host, compilerOptions);
      }
      return (
        tryGetModuleNameFromDeclaration(importNode, host, resolver, compilerOptions) || tryRenameExternalModule(<StringLiteral>moduleName, sourceFile) || getSynthesizedClone(<StringLiteral>moduleName)
      );
    }
    return;
  }
  export function tryGetModuleNameFromFile(file: SourceFile | undefined, host: EmitHost, options: CompilerOptions): StringLiteral | undefined {
    if (!file) {
      return;
    }
    if (file.moduleName) return createLiteral(file.moduleName);
    if (!file.isDeclarationFile && (options.out || options.outFile)) return createLiteral(getExternalModuleNameFromPath(host, file.fileName));
    return;
  }
}

export function asToken<T extends Syntax>(t: T | Token<T>): Token<T> {
  return typeof t === 'number' ? new Token(t) : t;
}
export function asName<T extends Identifier | BindingName | PropertyName | EntityName | ThisTypeNode | undefined>(n: string | T): T | Identifier {
  return isString(n) ? new Identifier(n) : n;
}
export function asExpression<T extends Expression | undefined>(e: string | number | boolean | T): T | StringLiteral | NumericLiteral | BooleanLiteral {
  return typeof e === 'string' ? StringLiteral.create(e) : typeof e === 'number' ? NumericLiteral.create('' + e) : typeof e === 'boolean' ? (e ? createTrue() : createFalse()) : e;
}
export function asEmbeddedStatement<T extends Node>(s: T): T | EmptyStatement;
export function asEmbeddedStatement<T extends Node>(s?: T): T | EmptyStatement | undefined;
export function asEmbeddedStatement<T extends Node>(s?: T): T | EmptyStatement | undefined {
  return s && Node.is.kind(NotEmittedStatement, s) ? setRange(setOriginalNode(createEmptyStatement(), s), s) : s;
}

export function skipParentheses(n: Expression): Expression;
export function skipParentheses(n: Node): Node;
export function skipParentheses(n: Node): Node {
  return skipOuterExpressions(n, OuterExpressionKinds.Parentheses);
}
