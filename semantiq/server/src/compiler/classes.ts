import * as qb from './base';
import * as qc from './core';
import { Node, Nodes } from './core';
import * as qt from './types';
import * as qy from './syntax';
import { Modifier, Syntax } from './syntax';
// prettier-ignore
export type NodeTypes = | ArrayBindingPattern | ArrayLiteralExpression | ArrayTypeNode | AsExpression | AwaitExpression | BinaryExpression | BindingElement | BindingPattern | Block | BreakOrContinueStatement | CallExpression | CaseBlock | CaseClause | CatchClause | ClassLikeDeclaration | CommaListExpression | ComputedPropertyName | ConditionalExpression | ConditionalTypeNode | Decorator | DefaultClause | DeleteExpression | DeleteExpression | DoStatement | ElementAccessExpression | EnumDeclaration | EnumMember | ExportAssignment | ExportDeclaration | ExpressionStatement | ExpressionWithTypeArguments | ExternalModuleReference | ForInStatement | ForOfStatement | ForStatement | FunctionLikeDeclaration | HeritageClause | Identifier | IfStatement | ImportClause | ImportDeclaration | ImportEqualsDeclaration | ImportOrExportSpecifier | ImportTypeNode | IndexedAccessTypeNode | InferTypeNode | InterfaceDeclaration | JSDoc | JSDocAugmentsTag | JSDocAuthorTag | JSDocFunctionType | JSDocImplementsTag | JSDocSignature | JSDocTemplateTag | JSDocTypedefTag | JSDocTypeExpression | JSDocTypeLiteral | JSDocTypeReferencingNode | JsxAttribute | JsxAttributes | JsxClosingElement | JsxElement | JsxExpression | JsxFragment | JsxOpeningLikeElement | JsxSpreadAttribute | LabeledStatement | LiteralTypeNode | MappedTypeNode | MetaProperty | MissingDeclaration | ModuleDeclaration | NamedImportsOrExports | NamedTupleMember | NamespaceExport | NamespaceExportDeclaration | NamespaceImport | NonNullExpression | ObjectLiteralExpression | OptionalTypeNode | ParameterDeclaration | ParenthesizedExpression | ParenthesizedTypeNode | PartiallyEmittedExpression | PostfixUnaryExpression | PrefixUnaryExpression | PropertyAccessExpression | PropertyAssignment | PropertyDeclaration | PropertySignature | QualifiedName | RestTypeNode | ReturnStatement | ShorthandPropertyAssignment | SignatureDeclaration | SourceFile | SpreadAssignment | SpreadElement | SwitchStatement | TaggedTemplateExpression | TemplateExpression | TemplateSpan | ThrowStatement | TryStatement | TupleTypeNode | TypeAliasDeclaration | TypeAssertion | TypeLiteralNode | TypeOfExpression | TypeOperatorNode | TypeParameterDeclaration | TypePredicateNode | TypeQueryNode | TypeReferenceNode | UnionOrIntersectionTypeNode | VariableDeclaration | VariableDeclarationList | VariableStatement | VoidExpression | WhileStatement | WithStatement | YieldExpression;
export abstract class TypeNode extends Node implements qt.TypeNode {
  _typeNodeBrand: any;
}
export abstract class JSDocType extends TypeNode {
  _jsDocTypeBrand: any;
}
export abstract class Declaration extends Node implements qt.Declaration {
  _declarationBrand: any;
  isNotAccessor(declaration: Declaration) {
    return !Node.is.accessor(declaration);
  }
  isNotOverload(declaration: Declaration): boolean {
    return (declaration.kind !== Syntax.FunctionDeclaration && declaration.kind !== Syntax.MethodDeclaration) || !!(declaration as FunctionDeclaration).body;
  }
  getInternalName(allowComments?: boolean, allowSourceMaps?: boolean) {
    return this.getName(allowComments, allowSourceMaps, EmitFlags.LocalName | EmitFlags.InternalName);
  }
  getLocalName(allowComments?: boolean, allowSourceMaps?: boolean) {
    return this.getName(allowComments, allowSourceMaps, EmitFlags.LocalName);
  }
  getExportName(allowComments?: boolean, allowSourceMaps?: boolean): Identifier {
    return this.getName(allowComments, allowSourceMaps, EmitFlags.ExportName);
  }
  getDeclarationName(allowComments?: boolean, allowSourceMaps?: boolean) {
    return this.getName(allowComments, allowSourceMaps);
  }
  getName(allowComments?: boolean, allowSourceMaps?: boolean, emitFlags: EmitFlags = 0) {
    const nodeName = getNameOfDeclaration(this);
    if (nodeName && Node.is.kind(Identifier, nodeName) && !Node.is.generatedIdentifier(nodeName)) {
      const name = getMutableClone(nodeName);
      emitFlags |= Node.get.emitFlags(nodeName);
      if (!allowSourceMaps) emitFlags |= EmitFlags.NoSourceMap;
      if (!allowComments) emitFlags |= EmitFlags.NoComments;
      if (emitFlags) setEmitFlags(name, emitFlags);
      return name;
    }
    return getGeneratedNameForNode(this);
  }
  getExternalModuleOrNamespaceExportName(s: Identifier | undefined, allowComments?: boolean, allowSourceMaps?: boolean): Identifier | PropertyAccessExpression {
    if (s && hasSyntacticModifier(this, ModifierFlags.Export)) return getNamespaceMemberName(s, getName(this), allowComments, allowSourceMaps);
    return this.getExportName(allowComments, allowSourceMaps);
  }
}
export abstract class NamedDeclaration extends Declaration implements qt.NamedDeclaration {
  name?: qt.DeclarationName;
}
export abstract class ObjectLiteralElement extends NamedDeclaration {
  _objectLiteralBrand: any;
  name?: qt.PropertyName;
}
export abstract class PropertyLikeDeclaration extends NamedDeclaration {
  name: qt.PropertyName;
}
export class SignatureDeclarationBase extends NamedDeclaration implements qt.SignatureDeclarationBase {
  //kind!: qt.SignatureDeclaration['kind'];
  name?: qt.PropertyName;
  typeParameters?: Nodes<TypeParameterDeclaration>;
  parameters!: Nodes<ParameterDeclaration>;
  type?: TypeNode;
  typeArguments?: Nodes<qt.TypeNode>;
}
export abstract class FunctionLikeDeclarationBase extends SignatureDeclarationBase implements qt.FunctionLikeDeclarationBase {
  jsDocCache?: readonly qt.JSDocTag[] | undefined;
  asteriskToken?: qt.AsteriskToken;
  questionToken?: qt.QuestionToken;
  exclamationToken?: qt.ExclamationToken;
  body?: qt.Block | qt.Expression;
  endFlowNode?: qt.FlowNode;
  returnFlowNode?: qt.FlowNode;
  _functionLikeDeclarationBrand: any;
}
export abstract class Expression extends Node implements qt.Expression {
  _expressionBrand: any;
  createExpressionFromEntityName(node: EntityName | Expression): Expression {
    if (Node.is.kind(QualifiedName, node)) {
      const left = createExpressionFromEntityName(node.left);
      const right = getMutableClone(node.right);
      return setRange(createPropertyAccess(left, right), node);
    }
    return getMutableClone(node);
  }
  createExpressionForPropertyName(memberName: Exclude<PropertyName, PrivateIdentifier>): Expression {
    if (Node.is.kind(Identifier, memberName)) return createLiteral(memberName);
    else if (Node.is.kind(ComputedPropertyName, memberName)) return getMutableClone(memberName.expression);
    return getMutableClone(memberName);
  }
  createExpressionForObjectLiteralElementLike(node: ObjectLiteralExpression, property: ObjectLiteralElementLike, receiver: Expression): Expression | undefined {
    if (property.name && Node.is.kind(PrivateIdentifier, property.name)) Debug.failBadSyntax(property.name, 'Private identifiers are not allowed in object literals.');
    function createExpressionForAccessorDeclaration(
      properties: Nodes<Declaration>,
      property: AccessorDeclaration & { name: Exclude<PropertyName, PrivateIdentifier> },
      receiver: Expression,
      multiLine: boolean
    ) {
      const { firstAccessor, getAccessor, setAccessor } = getAllAccessorDeclarations(properties, property);
      if (property === firstAccessor) {
        const properties: ObjectLiteralElementLike[] = [];
        if (getAccessor) {
          const getterFunction = new FunctionExpression(getAccessor.modifiers, undefined, undefined, undefined, getAccessor.parameters, undefined, getAccessor.body!);
          setRange(getterFunction, getAccessor);
          setOriginalNode(getterFunction, getAccessor);
          const getter = createPropertyAssignment('get', getterFunction);
          properties.push(getter);
        }
        if (setAccessor) {
          const setterFunction = new FunctionExpression(setAccessor.modifiers, undefined, undefined, undefined, setAccessor.parameters, undefined, setAccessor.body!);
          setRange(setterFunction, setAccessor);
          setOriginalNode(setterFunction, setAccessor);
          const setter = createPropertyAssignment('set', setterFunction);
          properties.push(setter);
        }
        properties.push(createPropertyAssignment('enumerable', getAccessor || setAccessor ? createFalse() : createTrue()));
        properties.push(createPropertyAssignment('configurable', createTrue()));
        const expression = setRange(
          new CallExpression(createPropertyAccess(new Identifier('Object'), 'defineProperty'), undefined, [
            receiver,
            createExpressionForPropertyName(property.name),
            createObjectLiteral(properties, multiLine),
          ]),
          firstAccessor
        );
        return aggregateTransformFlags(expression);
      }
      return;
    }
    function createExpressionForPropertyAssignment(property: PropertyAssignment, receiver: Expression) {
      return aggregateTransformFlags(setOriginalNode(setRange(createAssignment(createMemberAccessForPropertyName(receiver, property.name, property.name), property.initializer), property), property));
    }
    function createExpressionForShorthandPropertyAssignment(property: ShorthandPropertyAssignment, receiver: Expression) {
      return aggregateTransformFlags(
        setOriginalNode(setRange(createAssignment(createMemberAccessForPropertyName(receiver, property.name, property.name), getSynthesizedClone(property.name)), property), property)
      );
    }
    function createExpressionForMethodDeclaration(method: MethodDeclaration, receiver: Expression) {
      return aggregateTransformFlags(
        setOriginalNode(
          setRange(
            createAssignment(
              createMemberAccessForPropertyName(receiver, method.name, method.name),
              setOriginalNode(setRange(new FunctionExpression(method.modifiers, method.asteriskToken, undefined, undefined, method.parameters, undefined, method.body!), method), method)
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
        return createExpressionForAccessorDeclaration(node.properties, property as typeof property & { name: Exclude<PropertyName, PrivateIdentifier> }, receiver, !!node.multiLine);
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
    return tag === 'undefined' ? createStrictEquality(value, VoidExpression.zero()) : createStrictEquality(new TypeOfExpression(value), createLiteral(tag));
  }
  createMemberAccessForPropertyName(target: Expression, memberName: PropertyName, location?: TextRange): MemberExpression {
    if (Node.is.kind(ComputedPropertyName, memberName)) return setRange(new ElementAccessExpression(target, memberName.expression), location);
    else {
      const expression = setRange(
        Node.is.kind(Identifier, memberName) || Node.is.kind(PrivateIdentifier, memberName) ? createPropertyAccess(target, memberName) : new ElementAccessExpression(target, memberName),
        memberName
      );
      getOrCreateEmitNode(expression).flags |= EmitFlags.NoNestedSourceMaps;
      return expression;
    }
  }
  createFunctionCall(func: Expression, thisArg: Expression, argumentsList: readonly Expression[], location?: TextRange) {
    return setRange(new CallExpression(createPropertyAccess(func, 'call'), undefined, [thisArg, ...argumentsList]), location);
  }
  createFunctionApply(func: Expression, thisArg: Expression, argumentsExpression: Expression, location?: TextRange) {
    return setRange(new CallExpression(createPropertyAccess(func, 'apply'), undefined, [thisArg, argumentsExpression]), location);
  }
  createArraySlice(array: Expression, start?: number | Expression) {
    const argumentsList: Expression[] = [];
    if (start !== undefined) argumentsList.push(typeof start === 'number' ? createLiteral(start) : start);
    return new CallExpression(createPropertyAccess(array, 'slice'), undefined, argumentsList);
  }
  createArrayConcat(array: Expression, values: readonly Expression[]) {
    return new CallExpression(createPropertyAccess(array, 'concat'), undefined, values);
  }
  createMathPow(left: Expression, right: Expression, location?: TextRange) {
    return setRange(new CallExpression(createPropertyAccess(new Identifier('Math'), 'pow'), undefined, [left, right]), location);
  }
  getLeftmostExpression(node: Expression, stopAtCallExpressions: boolean) {
    while (true) {
      switch (node.kind) {
        case Syntax.PostfixUnaryExpression:
          node = (<PostfixUnaryExpression>node).operand;
          continue;
        case Syntax.BinaryExpression:
          node = (<BinaryExpression>node).left;
          continue;
        case Syntax.ConditionalExpression:
          node = (<ConditionalExpression>node).condition;
          continue;
        case Syntax.TaggedTemplateExpression:
          node = (<TaggedTemplateExpression>node).tag;
          continue;
        case Syntax.CallExpression:
          if (stopAtCallExpressions) return node;
        case Syntax.AsExpression:
        case Syntax.ElementAccessExpression:
        case Syntax.PropertyAccessExpression:
        case Syntax.NonNullExpression:
        case Syntax.PartiallyEmittedExpression:
          node = (<CallExpression | PropertyAccessExpression | ElementAccessExpression | AsExpression | NonNullExpression | PartiallyEmittedExpression>node).expression;
          continue;
      }
      return node;
    }
  }
  isCommaSequence(node: Expression): node is (BinaryExpression & { operatorToken: Token<Syntax.CommaToken> }) | CommaListExpression {
    return (node.kind === Syntax.BinaryExpression && (<BinaryExpression>node).operatorToken.kind === Syntax.CommaToken) || node.kind === Syntax.CommaListExpression;
  }
}
export abstract class UnaryExpression extends Expression implements qt.UnaryExpression {
  _unaryExpressionBrand: any;
}
export abstract class UpdateExpression extends UnaryExpression implements qt.UpdateExpression {
  _updateExpressionBrand: any;
}
export abstract class LeftHandSideExpression extends UpdateExpression implements qt.LeftHandSideExpression {
  _leftHandSideExpressionBrand: any;
}
export abstract class MemberExpression extends LeftHandSideExpression implements qt.MemberExpression {
  _memberExpressionBrand: any;
}
export abstract class PrimaryExpression extends MemberExpression implements qt.PrimaryExpression {
  _primaryExpressionBrand: any;
}
export abstract class ObjectLiteralExpressionBase<T extends qt.ObjectLiteralElement> extends PrimaryExpression {
  properties: Nodes<T>;
}
qb.addMixins(ObjectLiteralExpressionBase, [Declaration]);
export abstract class TokenOrIdentifier extends Node {
  getChildren(): Node[] {
    return this.kind === Syntax.EndOfFileToken ? this.jsDoc || qb.empty : qb.empty;
  }
}
export class Token<T extends Syntax> extends TokenOrIdentifier implements qt.Token<T> {
  constructor(k: T, pos?: number, end?: number) {
    super(undefined, k, pos, end);
  }
}
export class Statement extends Node implements qt.Statement {
  //_statementBrand: any;
  isUseStrictPrologue(node: ExpressionStatement): boolean {
    return Node.is.kind(StringLiteral, node.expression) && node.expression.text === 'use strict';
  }
  addPrologue(target: Statement[], source: readonly Statement[], ensureUseStrict?: boolean, visitor?: (node: Node) => VisitResult<Node>): number {
    const offset = addStandardPrologue(target, source, ensureUseStrict);
    return addCustomPrologue(target, source, offset, visitor);
  }
  addStandardPrologue(target: Statement[], source: readonly Statement[], ensureUseStrict?: boolean): number {
    assert(target.length === 0, 'Prologue directives should be at the first statement in the target statements array');
    let foundUseStrict = false;
    let statementOffset = 0;
    const numStatements = source.length;
    while (statementOffset < numStatements) {
      const statement = source[statementOffset];
      if (Node.is.prologueDirective(statement)) {
        if (isUseStrictPrologue(statement)) foundUseStrict = true;
        target.push(statement);
      } else {
        break;
      }
      statementOffset++;
    }
    if (ensureUseStrict && !foundUseStrict) target.push(startOnNewLine(createStatement(createLiteral('use strict'))));
    return statementOffset;
  }
  addCustomPrologue(target: Statement[], source: readonly Statement[], statementOffset: number, visitor?: (node: Node) => VisitResult<Node>, filter?: (node: Node) => boolean): number;
  addCustomPrologue(
    target: Statement[],
    source: readonly Statement[],
    statementOffset: number | undefined,
    visitor?: (node: Node) => VisitResult<Node>,
    filter?: (node: Node) => boolean
  ): number | undefined;
  addCustomPrologue(
    target: Statement[],
    source: readonly Statement[],
    statementOffset: number | undefined,
    visitor?: (node: Node) => VisitResult<Node>,
    filter: (node: Node) => boolean = () => true
  ): number | undefined {
    const numStatements = source.length;
    while (statementOffset !== undefined && statementOffset < numStatements) {
      const statement = source[statementOffset];
      if (Node.get.emitFlags(statement) & EmitFlags.CustomPrologue && filter(statement)) append(target, visitor ? visitNode(statement, visitor, isStatement) : statement);
      else {
        break;
      }
      statementOffset++;
    }
    return statementOffset;
  }
  findUseStrictPrologue(statements: readonly Statement[]): Statement | undefined {
    for (const statement of statements) {
      if (Node.is.prologueDirective(statement)) {
        if (isUseStrictPrologue(statement)) return statement;
      } else {
        break;
      }
    }
    return;
  }
  startsWithUseStrict(statements: readonly Statement[]) {
    const firstStatement = firstOrUndefined(statements);
    return firstStatement !== undefined && Node.is.prologueDirective(firstStatement) && isUseStrictPrologue(firstStatement);
  }
  createForOfBindingStatement(node: ForInitializer, boundValue: Expression): Statement {
    if (Node.is.kind(VariableDeclarationList, node)) {
      const firstDeclaration = first(node.declarations);
      const updatedDeclaration = firstDeclaration.update(firstDeclaration.name, undefined, boundValue);
      return setRange(createVariableStatement(undefined, node.update([updatedDeclaration])), node);
    } else {
      const updatedExpression = setRange(createAssignment(node, boundValue), node);
      return setRange(createStatement(updatedExpression), node);
    }
  }
  insertLeadingStatement(dest: Statement, source: Statement) {
    if (Node.is.kind(Block, dest)) return dest.update(setRange(new Nodes([source, ...dest.statements]), dest.statements));
    return new Block(new Nodes([dest, source]), true);
  }
  restoreEnclosingLabel(node: Statement, outermostLabeledStatement: LabeledStatement | undefined, afterRestoreLabelCallback?: (node: LabeledStatement) => void): Statement {
    if (!outermostLabeledStatement) return node;
    const updated = updateLabel(
      outermostLabeledStatement,
      outermostLabeledStatement.label,
      outermostLabeledStatement.statement.kind === Syntax.LabeledStatement ? restoreEnclosingLabel(node, <LabeledStatement>outermostLabeledStatement.statement) : node
    );
    if (afterRestoreLabelCallback) afterRestoreLabelCallback(outermostLabeledStatement);
    return updated;
  }
}
export class DeclarationStatement extends NamedDeclaration implements Statement {
  name?: Identifier | StringLiteral | NumericLiteral;
}
export class IterationStatement extends Statement {
  statement: Statement;
}
export abstract class JSDocContainer implements JSDocContainer {
  jsDoc?: JSDoc[];
  jsDocCache?: readonly JSDocTag[];
}
export namespace ArrayBindingElement {
  export const also = [Syntax.BindingElement, Syntax.OmittedExpression];
}
export class ArrayBindingPattern extends Node implements qt.ArrayBindingPattern {
  static readonly kind = Syntax.ArrayBindingPattern;
  parent?: VariableDeclaration | ParameterDeclaration | BindingElement;
  elements: Nodes<qt.ArrayBindingElement>;
  constructor(es: readonly qt.ArrayBindingElement[]) {
    super(true);
    this.elements = new Nodes(es);
  }
  update(es: readonly qt.ArrayBindingElement[]) {
    return this.elements !== es ? new ArrayBindingPattern(es).updateFrom(this) : this;
  }
}
ArrayBindingPattern.prototype.kind = ArrayBindingPattern.kind;
export class ArrayLiteralExpression extends PrimaryExpression implements qt.ArrayLiteralExpression {
  static readonly kind = Syntax.ArrayLiteralExpression;
  elements: Nodes<Expression>;
  multiLine?: boolean;
  constructor(es?: readonly Expression[], multiLine?: boolean) {
    super(true);
    this.elements = parenthesize.listElements(new Nodes(es));
    if (multiLine) this.multiLine = true;
  }
  update(es: readonly Expression[]) {
    return this.elements !== es ? new ArrayLiteralExpression(es, this.multiLine).updateFrom(this) : this;
  }
}
ArrayLiteralExpression.prototype.kind = ArrayLiteralExpression.kind;
export class ArrayTypeNode extends TypeNode implements qt.ArrayTypeNode {
  static readonly kind = Syntax.ArrayType;
  elementType: TypeNode;
  constructor(t: TypeNode) {
    super(true);
    this.elementType = parenthesize.arrayTypeMember(t);
  }
  update(t: TypeNode) {
    return this.elementType !== t ? new ArrayTypeNode(t).updateFrom(this) : this;
  }
  _typeNodeBrand: any;
}
ArrayTypeNode.prototype.kind = ArrayTypeNode.kind;
export class ArrowFunction extends FunctionLikeDeclarationBase implements qt.ArrowFunction {
  static readonly kind = Syntax.ArrowFunction;
  equalsGreaterThanToken: qt.EqualsGreaterThanToken;
  body: qt.ConciseBody;
  name: never;
  constructor(
    modifiers: readonly Modifier[] | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    parameters: readonly ParameterDeclaration[],
    type: qt.TypeNode | undefined,
    equalsGreaterThanToken: qt.EqualsGreaterThanToken | undefined,
    body: qt.ConciseBody
  ) {
    super(true);
    this.modifiers = Nodes.from(modifiers);
    this.typeParameters = Nodes.from(typeParameters);
    this.parameters = new Nodes(parameters);
    this.type = type;
    this.equalsGreaterThanToken = equalsGreaterThanToken || new Token(Syntax.EqualsGreaterThanToken);
    this.body = parenthesize.conciseBody(body);
  }
  update(
    modifiers: readonly Modifier[] | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    parameters: readonly ParameterDeclaration[],
    type: qt.TypeNode | undefined,
    equalsGreaterThanToken: Token<Syntax.EqualsGreaterThanToken>,
    body: qt.ConciseBody
  ) {
    return this.modifiers !== modifiers ||
      this.typeParameters !== typeParameters ||
      this.parameters !== parameters ||
      this.type !== type ||
      this.equalsGreaterThanToken !== equalsGreaterThanToken ||
      this.body !== body
      ? new ArrowFunction(modifiers, typeParameters, parameters, type, equalsGreaterThanToken, body).updateFrom(this)
      : this;
  }
  _expressionBrand: any;
}
ArrowFunction.prototype.kind = ArrowFunction.kind;
export class AsExpression extends Expression implements qt.AsExpression {
  static readonly kind = Syntax.AsExpression;
  expression: Expression;
  type: qt.TypeNode;
  constructor(e: Expression, t: qt.TypeNode) {
    super(true);
    this.expression = e;
    this.type = t;
  }
  update(e: Expression, t: qt.TypeNode) {
    return this.expression !== e || this.type !== t ? new AsExpression(e, t).updateFrom(this) : this;
  }
}
AsExpression.prototype.kind = AsExpression.kind;
export namespace AssignmentPattern {
  export const kind = Syntax.ArrayLiteralExpression;
  export const also = [Syntax.ObjectLiteralExpression];
}
export class AwaitExpression extends UnaryExpression implements qt.AwaitExpression {
  static readonly kind = Syntax.AwaitExpression;
  expression: UnaryExpression;
  constructor(e: Expression) {
    super(true);
    this.expression = parenthesize.prefixOperand(e);
  }
  update(e: Expression) {
    return this.expression !== e ? new AwaitExpression(e).updateFrom(this) : this;
  }
}
AwaitExpression.prototype.kind = AwaitExpression.kind;
export class BigIntLiteral extends Node implements qt.BigIntLiteral {
  static readonly kind: Syntax.BigIntLiteral;
  text: string;
  isUnterminated?: boolean;
  hasExtendedEscape?: boolean;
  constructor(t: string) {
    super(true);
    this.text = t;
  }
  expression(e: Expression) {
    return (
      e.kind === Syntax.BigIntLiteral ||
      (e.kind === Syntax.PrefixUnaryExpression && (e as PrefixUnaryExpression).operator === Syntax.MinusToken && (e as PrefixUnaryExpression).operand.kind === Syntax.BigIntLiteral)
    );
  }
}
BigIntLiteral.prototype.kind = BigIntLiteral.kind;

export class BinaryExpression extends Node implements qt.BinaryExpression {
  static readonly kind = Syntax.BinaryExpression;
  left: Expression;
  operatorToken: BinaryOperatorToken;
  right: Expression;
  constructor(l: Expression, o: BinaryOperator | BinaryOperatorToken, r: Expression) {
    super();
    const t = asToken(o);
    const k = t.kind;
    this.left = parenthesizeBinaryOperand(k, l, true, undefined);
    this.operatorToken = t;
    this.right = parenthesizeBinaryOperand(k, r, false, this.left);
  }
  update(l: Expression, r: Expression, o: BinaryOperator | BinaryOperatorToken = this.operatorToken) {
    return this.left !== l || this.right !== r || this.operatorToken !== o ? new BinaryExpression(l, o, r).updateFrom(this) : this;
  }
  static createStrictEquality(left: Expression, right: Expression) {
    return new BinaryExpression(left, Syntax.Equals3Token, right);
  }
  static createStrictInequality(left: Expression, right: Expression) {
    return new BinaryExpression(left, Syntax.ExclamationEquals2Token, right);
  }
  static createAdd(left: Expression, right: Expression) {
    return new BinaryExpression(left, Syntax.PlusToken, right);
  }
  static createSubtract(left: Expression, right: Expression) {
    return new BinaryExpression(left, Syntax.MinusToken, right);
  }
  static createLogicalAnd(left: Expression, right: Expression) {
    return new BinaryExpression(left, Syntax.Ampersand2Token, right);
  }
  static createLogicalOr(left: Expression, right: Expression) {
    return new BinaryExpression(left, Syntax.Bar2Token, right);
  }
  static createNullishCoalesce(left: Expression, right: Expression) {
    return new BinaryExpression(left, Syntax.Question2Token, right);
  }
  static createComma(left: Expression, right: Expression) {
    return <Expression>new BinaryExpression(left, Syntax.CommaToken, right);
  }
  static createLessThan(left: Expression, right: Expression) {
    return <Expression>new BinaryExpression(left, Syntax.LessThanToken, right);
  }
  static createAssignment(left: ObjectLiteralExpression | ArrayLiteralExpression, right: Expression): DestructuringAssignment;
  static createAssignment(left: Expression, right: Expression): BinaryExpression;
  static createAssignment(left: Expression, right: Expression) {
    return new BinaryExpression(left, Syntax.EqualsToken, right);
  }
}
BinaryExpression.prototype.kind = BinaryExpression.kind;

export class BindingElement extends Node implements qt.BindingElement {
  static readonly kind = Syntax.BindingElement;
  parent?: BindingPattern;
  propertyName?: PropertyName;
  dot3Token?: Dot3Token;
  name: BindingName;
  initializer?: Expression;
  constructor(d: Dot3Token | undefined, p: string | PropertyName | undefined, b: string | BindingName, i?: Expression) {
    super();
    this.dot3Token = d;
    this.propertyName = asName(p);
    this.name = asName(b);
    this.initializer = i;
  }
  update(d: Dot3Token | undefined, p: PropertyName | undefined, b: BindingName, i?: Expression) {
    return this.propertyName !== p || this.dot3Token !== d || this.name !== b || this.initializer !== i ? new BindingElement(d, p, b, i).updateFrom(this) : this;
  }
}
BindingElement.prototype.kind = BindingElement.kind;

export namespace BindingOrAssignmentElement {
  export function getInitializerOfBindingOrAssignmentElement(bindingElement: BindingOrAssignmentElement): Expression | undefined {
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
  export function getTargetOfBindingOrAssignmentElement(bindingElement: BindingOrAssignmentElement): BindingOrAssignmentElementTarget | undefined {
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
  export function getRestIndicatorOfBindingOrAssignmentElement(bindingElement: BindingOrAssignmentElement): BindingOrAssignmentElementRestIndicator | undefined {
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
  export function getPropertyNameOfBindingOrAssignmentElement(bindingElement: BindingOrAssignmentElement): Exclude<PropertyName, PrivateIdentifier> | undefined {
    const propertyName = tryGetPropertyNameOfBindingOrAssignmentElement(bindingElement);
    assert(!!propertyName || Node.is.kind(SpreadAssignment, bindingElement), 'Invalid property name for binding element.');
    return propertyName;
  }
  export function tryGetPropertyNameOfBindingOrAssignmentElement(bindingElement: BindingOrAssignmentElement): Exclude<PropertyName, PrivateIdentifier> | undefined {
    switch (bindingElement.kind) {
      case Syntax.BindingElement:
        // `a` in `let { a: b } = ...`
        // `[a]` in `let { [a]: b } = ...`
        // `"a"` in `let { "a": b } = ...`
        // `1` in `let { 1: b } = ...`
        if (bindingElement.propertyName) {
          const propertyName = bindingElement.propertyName;
          if (Node.is.kind(PrivateIdentifier, propertyName)) return Debug.failBadSyntax(propertyName);
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
          if (Node.is.kind(PrivateIdentifier, propertyName)) return Debug.failBadSyntax(propertyName);
          return Node.is.kind(ComputedPropertyName, propertyName) && isStringOrNumericLiteral(propertyName.expression) ? propertyName.expression : propertyName;
        }
        break;
      case Syntax.SpreadAssignment:
        // `a` in `({ ...a } = ...)`
        if (bindingElement.name && Node.is.kind(PrivateIdentifier, bindingElement.name)) return Debug.failBadSyntax(bindingElement.name);
        return bindingElement.name;
    }
    const target = getTargetOfBindingOrAssignmentElement(bindingElement);
    if (target && Node.is.propertyName(target)) return target;
    return;
  }
  export function convertToArrayAssignmentElement(element: BindingOrAssignmentElement) {
    if (Node.is.kind(BindingElement, element)) {
      if (element.dot3Token) {
        Debug.assertNode(element.name, isIdentifier);
        return setOriginalNode(setRange(createSpread(element.name), element), element);
      }
      const expression = convertToAssignmentElementTarget(element.name);
      return element.initializer ? setOriginalNode(setRange(createAssignment(expression, element.initializer), element), element) : expression;
    }
    Debug.assertNode(element, isExpression);
    return <Expression>element;
  }
  export function convertToObjectAssignmentElement(element: BindingOrAssignmentElement) {
    if (Node.is.kind(BindingElement, element)) {
      if (element.dot3Token) {
        Debug.assertNode(element.name, isIdentifier);
        return setOriginalNode(setRange(createSpreadAssignment(element.name), element), element);
      }
      if (element.propertyName) {
        const expression = convertToAssignmentElementTarget(element.name);
        return setOriginalNode(setRange(createPropertyAssignment(element.propertyName, element.initializer ? createAssignment(expression, element.initializer) : expression), element), element);
      }
      Debug.assertNode(element.name, isIdentifier);
      return setOriginalNode(setRange(createShorthandPropertyAssignment(element.name, element.initializer), element), element);
    }
    Debug.assertNode(element, isObjectLiteralElementLike);
    return <ObjectLiteralElementLike>element;
  }
}

export namespace BindingOrAssignmentPattern {
  export function getElementsOfBindingOrAssignmentPattern(name: BindingOrAssignmentPattern): readonly BindingOrAssignmentElement[] {
    switch (name.kind) {
      case Syntax.ObjectBindingPattern:
      case Syntax.ArrayBindingPattern:
      case Syntax.ArrayLiteralExpression:
        // `a` in `{a}`
        // `a` in `[a]`
        return <readonly BindingOrAssignmentElement[]>name.elements;
      case Syntax.ObjectLiteralExpression:
        // `a` in `{a}`
        return <readonly BindingOrAssignmentElement[]>name.properties;
    }
  }
  export function convertToAssignmentPattern(node: BindingOrAssignmentPattern): AssignmentPattern {
    switch (node.kind) {
      case Syntax.ArrayBindingPattern:
      case Syntax.ArrayLiteralExpression:
        return convertToArrayAssignmentPattern(node);
      case Syntax.ObjectBindingPattern:
      case Syntax.ObjectLiteralExpression:
        return convertToObjectAssignmentPattern(node);
    }
  }
  export function convertToObjectAssignmentPattern(node: ObjectBindingOrAssignmentPattern) {
    if (Node.is.kind(ObjectBindingPattern, node)) return setOriginalNode(setRange(createObjectLiteral(map(node.elements, convertToObjectAssignmentElement)), node), node);
    Debug.assertNode(node, isObjectLiteralExpression);
    return node;
  }
  export function convertToArrayAssignmentPattern(node: ArrayBindingOrAssignmentPattern) {
    if (Node.is.kind(ArrayBindingPattern, node)) return setOriginalNode(setRange(new ArrayLiteralExpression(map(node.elements, convertToArrayAssignmentElement)), node), node);
    Debug.assertNode(node, isArrayLiteralExpression);
    return node;
  }
  export function convertToAssignmentElementTarget(node: BindingOrAssignmentElementTarget): Expression {
    if (Node.is.kind(BindingPattern, node)) return convertToAssignmentPattern(node);
    Debug.assertNode(node, isExpression);
    return node;
  }
}

export namespace BindingPattern {
  export const kind = Syntax.ArrayBindingPattern;
  export const also = [Syntax.ObjectBindingPattern];
}

export class Block extends Node implements qt.Block {
  static readonly kind = Syntax.Block;
  statements: Nodes<Statement>;
  multiLine?: boolean;
  constructor(ss: readonly Statement[], multiLine?: boolean) {
    super();
    this.statements = new Nodes(ss);
    if (multiLine) this.multiLine = multiLine;
  }
  update(ss: readonly Statement[]) {
    return this.statements !== ss ? new Block(ss, this.multiLine).updateFrom(this) : this;
  }
}
Block.prototype.kind = Block.kind;

export class BreakStatement extends Node implements qt.BreakStatement {
  static readonly kind = Syntax.BreakStatement;
  label?: Identifier;
  createBreak(l?: string | Identifier) {
    this.label = asName(l);
  }
  updateBreak(l?: Identifier) {
    return this.label !== l ? updateNode(createBreak(l), this) : this;
  }
}
BreakStatement.prototype.kind = BreakStatement.kind;

export class Bundle extends Node implements qt.Bundle {
  static readonly kind = Syntax.Bundle;
  prepends: readonly (InputFiles | UnparsedSource)[];
  sourceFiles: readonly SourceFile[];
  syntheticFileReferences?: readonly FileReference[];
  syntheticTypeReferences?: readonly FileReference[];
  syntheticLibReferences?: readonly FileReference[];
  hasNoDefaultLib?: boolean;
  createBundle(ss: readonly SourceFile[], ps: readonly (UnparsedSource | InputFiles)[] = empty) {
    this.prepends = ps;
    this.sourceFiles = ss;
  }
  updateBundle(ss: readonly SourceFile[], ps: readonly (UnparsedSource | InputFiles)[] = empty) {
    if (this.sourceFiles !== ss || this.prepends !== ps) return createBundle(ss, ps);
    return this;
  }
}
Bundle.prototype.kind = Bundle.kind;

export class CallBinding extends Node implements qt.CallBinding {
  target: LeftHandSideExpression;
  thisArg: Expression;
  shouldBeCapturedInTempVariable(node: Expression, cacheIdentifiers: boolean): boolean {
    const target = skipParentheses(node) as Expression | ArrayLiteralExpression | ObjectLiteralExpression;
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
  createCallBinding(expression: Expression, recordTempVariable: (temp: Identifier) => void, _?: ScriptTarget, cacheIdentifiers = false): CallBinding {
    const callee = skipOuterExpressions(expression, OuterExpressionKinds.All);
    let thisArg: Expression;
    let target: LeftHandSideExpression;
    if (Node.is.superProperty(callee)) {
      thisArg = createThis();
      target = callee;
    } else if (callee.kind === Syntax.SuperKeyword) {
      thisArg = createThis();
      target = <PrimaryExpression>callee;
    } else if (Node.get.emitFlags(callee) & EmitFlags.HelperName) {
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
CallBinding.prototype.kind = CallBinding.kind;

export class CallExpression extends LeftHandSideExpression implements qt.CallExpression {
  static readonly kind = Syntax.CallExpression;
  expression: LeftHandSideExpression;
  questionDotToken?: qt.QuestionDotToken;
  typeArguments?: Nodes<TypeNode>;
  arguments: Nodes<Expression>;
  constructor(e: Expression, ts?: readonly TypeNode[], es?: readonly Expression[]) {
    super(true);
    this.expression = parenthesize.forAccess(e);
    this.typeArguments = Nodes.from(ts);
    this.arguments = parenthesize.listElements(new Nodes(es));
  }
  update(e: Expression, ts: readonly TypeNode[] | undefined, es: readonly Expression[]) {
    if (Node.is.optionalChain(this)) return this.updateCallChain(e, this.questionDotToken, ts, es);
    return this.expression !== e || this.typeArguments !== ts || this.arguments !== es ? new CallExpression(e, ts, es).updateFrom(this) : this;
  }
  static immediateFunctionExpression(ss: readonly Statement[]): CallExpression;
  static immediateFunctionExpression(ss: readonly Statement[], param: ParameterDeclaration, paramValue: Expression): CallExpression;
  static immediateFunctionExpression(ss: readonly Statement[], param?: ParameterDeclaration, paramValue?: Expression) {
    return new CallExpression(new FunctionExpression(undefined, undefined, undefined, undefined, param ? [param] : [], undefined, new Block(ss, true)), undefined, paramValue ? [paramValue] : []);
  }
  static immediateArrowFunction(ss: readonly Statement[]): CallExpression;
  static immediateArrowFunction(ss: readonly Statement[], param: ParameterDeclaration, paramValue: Expression): CallExpression;
  static immediateArrowFunction(ss: readonly Statement[], param?: ParameterDeclaration, paramValue?: Expression) {
    return new CallExpression(new ArrowFunction(undefined, undefined, param ? [param] : [], undefined, undefined, new Block(ss, true)), undefined, paramValue ? [paramValue] : []);
  }
  _declarationBrand: any;
}
CallExpression.prototype.kind = CallExpression.kind;
qb.addMixins(CallExpression, [Declaration]);
export class CallChain extends CallExpression implements qt.CallChain {
  _optionalChainBrand: any;
  createCallChain(expression: Expression, questionDotToken: QuestionDotToken | undefined, typeArguments: readonly TypeNode[] | undefined, argumentsArray: readonly Expression[] | undefined) {
    const node = <CallChain>Node.createSynthesized(Syntax.CallExpression);
    this.flags |= NodeFlags.OptionalChain;
    this.expression = parenthesize.forAccess(expression);
    this.questionDotToken = questionDotToken;
    this.typeArguments = Nodes.from(typeArguments);
    this.arguments = parenthesize.listElements(new Nodes(argumentsArray));
  }
  updateCallChain(expression: Expression, questionDotToken: QuestionDotToken | undefined, typeArguments: readonly TypeNode[] | undefined, argumentsArray: readonly Expression[]) {
    assert(!!(this.flags & NodeFlags.OptionalChain), 'Cannot update a CallExpression using updateCallChain. Use updateCall instead.');
    return this.expression !== expression || this.questionDotToken !== questionDotToken || this.typeArguments !== typeArguments || this.arguments !== argumentsArray
      ? updateNode(createCallChain(expression, questionDotToken, typeArguments, argumentsArray), this)
      : this;
  }
}
CallChain.prototype.kind = CallChain.kind;

export class CallSignatureDeclaration extends SignatureDeclarationBase implements qt.CallSignatureDeclaration {
  static readonly kind = Syntax.CallSignature;
  constructor(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
    return SignatureDeclaration.create(Syntax.CallSignature, ts, ps, t) as CallSignatureDeclaration;
  }
  update(ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: TypeNode) {
    return SignatureDeclaration.update(n, ts, ps, t);
  }
}
CallSignatureDeclaration.prototype.kind = CallSignatureDeclaration.kind;

export class CaseBlock extends Node implements qt.CaseBlock {
  static readonly kind = Syntax.CaseBlock;
  parent: SwitchStatement;
  clauses: Nodes<CaseOrDefaultClause>;
  createCaseBlock(clauses: readonly CaseOrDefaultClause[]): CaseBlock {
    super(true);
    this.clauses = new Nodes(clauses);
  }
  updateCaseBlock(clauses: readonly CaseOrDefaultClause[]) {
    return this.clauses !== clauses ? updateNode(createCaseBlock(clauses), this) : this;
  }
}
CaseBlock.prototype.kind = CaseBlock.kind;

export class CaseClause extends Node implements qt.CaseClause {
  static readonly kind = Syntax.CaseClause;
  parent: CaseBlock;
  expression: Expression;
  statements: Nodes<Statement>;
  fallthroughFlowNode?: FlowNode;
  createCaseClause(expression: Expression, statements: readonly Statement[]) {
    super(true);
    this.expression = parenthesizeExpressionForList(expression);
    this.statements = new Nodes(statements);
  }
  updateCaseClause(expression: Expression, statements: readonly Statement[]) {
    return this.expression !== expression || this.statements !== statements ? updateNode(createCaseClause(expression, statements), this) : this;
  }
}
CaseClause.prototype.kind = CaseClause.kind;

export class CatchClause extends Node implements qt.CatchClause {
  static readonly kind = Syntax.CatchClause;
  parent: TryStatement;
  variableDeclaration?: VariableDeclaration;
  block: Block;
  createCatchClause(variableDeclaration: string | VariableDeclaration | undefined, block: Block) {
    super(true);
    this.variableDeclaration = isString(variableDeclaration) ? createVariableDeclaration(variableDeclaration) : variableDeclaration;
    this.block = block;
  }
  update(variableDeclaration: VariableDeclaration | undefined, block: Block) {
    return this.variableDeclaration !== variableDeclaration || this.block !== block ? updateNode(createCatchClause(variableDeclaration, block), this) : this;
  }
}
CatchClause.prototype.kind = CatchClause.kind;

export class ClassDeclaration extends Node implements qt.ClassDeclaration {
  static readonly kind = Syntax.ClassDeclaration;
  name?: Identifier;
  createClassDeclaration(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: string | Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    heritageClauses: readonly HeritageClause[] | undefined,
    members: readonly ClassElement[]
  ) {
    const n = <ClassDeclaration>Node.createSynthesized(Syntax.ClassDeclaration);
    this.decorators = Nodes.from(decorators);
    this.modifiers = Nodes.from(modifiers);
    this.name = asName(name);
    this.typeParameters = Nodes.from(typeParameters);
    this.heritageClauses = Nodes.from(heritageClauses);
    this.members = new Nodes(members);
  }
  updateClassDeclaration(
    this: ClassDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    heritageClauses: readonly HeritageClause[] | undefined,
    members: readonly ClassElement[]
  ) {
    return this.decorators !== decorators ||
      this.modifiers !== modifiers ||
      this.name !== name ||
      this.typeParameters !== typeParameters ||
      this.heritageClauses !== heritageClauses ||
      this.members !== members
      ? updateNode(createClassDeclaration(decorators, modifiers, name, typeParameters, heritageClauses, members), this)
      : this;
  }
}
ClassDeclaration.prototype.kind = ClassDeclaration.kind;

export class ClassExpression extends Node implements qt.ClassExpression {
  static readonly kind = Syntax.ClassExpression;
  createClassExpression(
    modifiers: readonly Modifier[] | undefined,
    name: string | Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    heritageClauses: readonly HeritageClause[] | undefined,
    members: readonly ClassElement[]
  ) {
    const n = <ClassExpression>Node.createSynthesized(Syntax.ClassExpression);
    this.decorators = undefined;
    this.modifiers = Nodes.from(modifiers);
    this.name = asName(name);
    this.typeParameters = Nodes.from(typeParameters);
    this.heritageClauses = Nodes.from(heritageClauses);
    this.members = new Nodes(members);
  }
  updateClassExpression(
    this: ClassExpression,
    modifiers: readonly Modifier[] | undefined,
    name: Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    heritageClauses: readonly HeritageClause[] | undefined,
    members: readonly ClassElement[]
  ) {
    return this.modifiers !== modifiers || this.name !== name || this.typeParameters !== typeParameters || this.heritageClauses !== heritageClauses || this.members !== members
      ? updateNode(createClassExpression(modifiers, name, typeParameters, heritageClauses, members), this)
      : this;
  }
}
ClassExpression.prototype.kind = ClassExpression.kind;

export class CommaListExpression extends Expression implements qt.CommaListExpression {
  static readonly kind: Syntax.CommaListExpression;
  elements: Nodes<Expression>;
  flattenCommaElements(this: Expression): Expression | readonly Expression[] {
    if (isSynthesized(this) && !Node.is.parseTreeNode(this) && !this.original && !this.emitNode && !this.id) {
      if (this.kind === Syntax.CommaListExpression) return (<CommaListExpression>this).elements;
      if (Node.is.kind(this, BinaryExpression) && this.operatorToken.kind === Syntax.CommaToken) return [this.left, this.right];
    }
    return this;
  }
  createCommaList(elements: readonly Expression[]) {
    const n = <CommaListExpression>Node.createSynthesized(Syntax.CommaListExpression);
    this.elements = new Nodes(sameFlatMap(elements, flattenCommaElements));
  }
  update(elements: readonly Expression[]) {
    return this.elements !== elements ? updateNode(createCommaList(elements), this) : this;
  }
}
CommaListExpression.prototype.kind = CommaListExpression.kind;

export class ComputedPropertyName extends Node implements qt.ComputedPropertyName {
  static readonly kind = Syntax.ComputedPropertyName;
  parent: Declaration;
  expression: Expression;
  constructor(e: Expression) {
    super(true);
    this.expression = isCommaSequence(e) ? createParen(e) : e;
  }
  update(e: Expression) {
    return this.expression !== e ? updateNode(create(e), n) : n;
  }
}
ComputedPropertyName.prototype.kind = ComputedPropertyName.kind;

export class ConditionalExpression extends Expression implements qt.ConditionalExpression {
  static readonly kind = Syntax.ConditionalExpression;
  condition: Expression;
  questionToken: QuestionToken;
  whenTrue: Expression;
  colonToken: ColonToken;
  whenFalse: Expression;
  createConditional(condition: Expression, questionToken: QuestionToken, whenTrue: Expression, colonToken: ColonToken, whenFalse: Expression): ConditionalExpression;
  createConditional(condition: Expression, questionTokenOrWhenTrue: QuestionToken | Expression, whenTrueOrWhenFalse: Expression, colonToken?: ColonToken, whenFalse?: Expression) {
    const n = <ConditionalExpression>Node.createSynthesized(Syntax.ConditionalExpression);
    this.condition = parenthesizeForConditionalHead(condition);
    this.questionToken = whenFalse ? <QuestionToken>questionTokenOrWhenTrue : new Token(Syntax.QuestionToken);
    this.whenTrue = parenthesizeSubexpressionOfConditionalExpression(whenFalse ? whenTrueOrWhenFalse : <Expression>questionTokenOrWhenTrue);
    this.colonToken = whenFalse ? colonToken! : new Token(Syntax.ColonToken);
    this.whenFalse = parenthesizeSubexpressionOfConditionalExpression(whenFalse ? whenFalse : whenTrueOrWhenFalse);
  }
  updateConditional(
    this: ConditionalExpression,
    condition: Expression,
    questionToken: Token<Syntax.QuestionToken>,
    whenTrue: Expression,
    colonToken: Token<Syntax.ColonToken>,
    whenFalse: Expression
  ): ConditionalExpression {
    return this.condition !== condition || this.questionToken !== questionToken || this.whenTrue !== whenTrue || this.colonToken !== colonToken || this.whenFalse !== whenFalse
      ? updateNode(createConditional(condition, questionToken, whenTrue, colonToken, whenFalse), this)
      : this;
  }
}
ConditionalExpression.prototype.kind = ConditionalExpression.kind;

export class ConditionalTypeNode extends TypeNode implements qt.ConditionalTypeNode {
  static readonly kind = Syntax.ConditionalType;
  checkType: TypeNode;
  extendsType: TypeNode;
  trueType: TypeNode;
  falseType: TypeNode;
  constructor(c: TypeNode, e: TypeNode, t: TypeNode, f: TypeNode) {
    super(true);
    this.checkType = parenthesize.conditionalTypeMember(c);
    this.extendsType = parenthesize.conditionalTypeMember(e);
    this.trueType = t;
    this.falseType = f;
  }
  update(c: TypeNode, e: TypeNode, t: TypeNode, f: TypeNode) {
    return this.checkType !== c || this.extendsType !== e || this.trueType !== t || this.falseType !== f ? new ConditionalTypeNode(c, e, t, f).updateFrom(this) : this;
  }
}
ConditionalTypeNode.prototype.kind = ConditionalTypeNode.kind;

export class ConstructorDeclaration extends FunctionLikeDeclarationBase implements qt.ConstructorDeclaration {
  static readonly kind = Syntax.Constructor;
  parent: ClassLikeDeclaration;
  body?: FunctionBody;
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
    return this.decorators !== ds || this.modifiers !== ms || this.parameters !== ps || this.body !== b ? updateNode(create(ds, ms, ps, b), this) : this;
  }
}
ConstructorDeclaration.prototype.kind = ConstructorDeclaration.kind;

export class ConstructorTypeNode extends Node implements qt.ConstructorTypeNode {
  static readonly kind = Syntax.ConstructorType;
  constructor(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
    return SignatureDeclaration.create(Syntax.ConstructorType, ts, ps, t) as ConstructorTypeNode;
  }
  update(ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: TypeNode) {
    return SignatureDeclaration.update(this, ts, ps, t);
  }
}
ConstructorTypeNode.prototype.kind = ConstructorTypeNode.kind;

export class ConstructSignatureDeclaration extends SignatureDeclarationBase implements qt.ConstructSignatureDeclaration {
  static readonly kind = Syntax.ConstructSignature;
  constructor(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
    return SignatureDeclaration.create(Syntax.ConstructSignature, ts, ps, t) as ConstructSignatureDeclaration;
  }
  update(ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: TypeNode) {
    return SignatureDeclaration.update(this, ts, ps, t);
  }
}
ConstructSignatureDeclaration.prototype.kind = ConstructSignatureDeclaration.kind;

export class ContinueStatement extends Node implements qt.ContinueStatement {
  static readonly kind = Syntax.ContinueStatement;
  label?: Identifier;
  createContinue(l?: string | Identifier) {
    this.label = asName(l);
  }
  updateContinue(l: Identifier) {
    return this.label !== l ? updateNode(createContinue(l), this) : this;
  }
}
ContinueStatement.prototype.kind = ContinueStatement.kind;

export class DebuggerStatement extends Node implements qt.DebuggerStatement {
  static readonly kind = Syntax.DebuggerStatement;
  createDebuggerStatement() {
    return <DebuggerStatement>Node.createSynthesized(Syntax.DebuggerStatement);
  }
}
DebuggerStatement.prototype.kind = DebuggerStatement.kind;

export class Decorator extends Node implements qt.Decorator {
  static readonly kind = Syntax.Decorator;
  parent: NamedDeclaration;
  expression: LeftHandSideExpression;
  createDecorator(e: Expression) {
    this.expression = parenthesize.forAccess(e);
  }
  updateDecorator(e: Expression) {
    return this.expression !== e ? updateNode(createDecorator(e), this) : this;
  }
}
Decorator.prototype.kind = Decorator.kind;
export class DefaultClause extends Node implements qt.DefaultClause {
  static readonly kind = Syntax.DefaultClause;
  parent: CaseBlock;
  statements: Nodes<Statement>;
  fallthroughFlowNode?: FlowNode;
  createDefaultClause(ss: readonly Statement[]) {
    this.statements = new Nodes(ss);
  }
  updateDefaultClause(ss: readonly Statement[]) {
    return this.statements !== ss ? updateNode(createDefaultClause(ss), this) : this;
  }
}
DefaultClause.prototype.kind = DefaultClause.kind;
export class DeleteExpression extends UnaryExpression implements qt.DeleteExpression {
  static readonly kind = Syntax.DeleteExpression;
  expression: UnaryExpression;
  constructor(e: Expression) {
    super(true);
    this.expression = parenthesize.prefixOperand(e);
  }
  update(e: Expression) {
    return this.expression !== e ? new DeleteExpression(e).updateFrom(this) : this;
  }
}
DeleteExpression.prototype.kind = DeleteExpression.kind;
export class DoStatement extends Node implements qt.DoStatement {
  static readonly kind = Syntax.DoStatement;
  expression: Expression;
  createDo(s: Statement, e: Expression) {
    this.statement = asEmbeddedStatement(s);
    this.expression = e;
  }
  updateDo(s: Statement, e: Expression) {
    return this.statement !== s || this.expression !== e ? updateNode(createDo(s, e), this) : this;
  }
}
DoStatement.prototype.kind = DoStatement.kind;
export class ElementAccessExpression extends MemberExpression implements qt.ElementAccessExpression {
  static readonly kind = Syntax.ElementAccessExpression;
  expression: LeftHandSideExpression;
  questionDotToken?: qt.QuestionDotToken;
  argumentExpression: Expression;
  constructor(e: Expression, i: number | Expression) {
    this.expression = parenthesize.forAccess(e);
    this.argumentExpression = asExpression(i);
  }
  update(e: Expression, a: Expression) {
    if (Node.is.optionalChain(this)) return this.updateElementAccessChain(e, this.questionDotToken, a);
    return this.expression !== e || this.argumentExpression !== a ? new ElementAccessExpression(e, a).updateFrom(this) : this;
  }
}
ElementAccessExpression.prototype.kind = ElementAccessExpression.kind;
export class ElementAccessChain extends ElementAccessExpression implements qt.ElementAccessChain {
  _optionalChainBrand: any;
  createElementAccessChain(e: Expression, q: QuestionDotToken | undefined, i: number | Expression) {
    const n = <ElementAccessChain>Node.createSynthesized(Syntax.ElementAccessExpression);
    this.flags |= NodeFlags.OptionalChain;
    this.expression = parenthesize.forAccess(e);
    this.questionDotToken = q;
    this.argumentExpression = asExpression(i);
  }
  updateElementAccessChain(e: Expression, q: QuestionDotToken | undefined, a: Expression) {
    assert(!!(this.flags & NodeFlags.OptionalChain), 'Cannot update an ElementAccessExpression using updateElementAccessChain. Use updateElementAccess instead.');
    return this.expression !== e || this.questionDotToken !== q || this.argumentExpression !== a ? updateNode(createElementAccessChain(e, q, a), this) : this;
  }
}
ElementAccessChain.prototype.kind = ElementAccessChain.kind;
export class EmptyStatement extends Node implements qt.EmptyStatement {
  static readonly kind = Syntax.EmptyStatement;
  createEmptyStatement() {}
}
EmptyStatement.prototype.kind = EmptyStatement.kind;
export class EndOfDeclarationMarker extends Node implements qt.EndOfDeclarationMarker {
  static readonly kind = Syntax.EndOfDeclarationMarker;
  createEndOfDeclarationMarker(o: Node) {
    this.emitNode = {} as EmitNode;
    this.original = o;
  }
}
EndOfDeclarationMarker.prototype.kind = EndOfDeclarationMarker.kind;
export class EnumDeclaration extends Node implements qt.EnumDeclaration {
  static readonly kind = Syntax.EnumDeclaration;
  name: Identifier;
  members: Nodes<EnumMember>;
  createEnumDeclaration(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, n: string | Identifier, es: readonly EnumMember[]) {
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(n);
    this.members = new Nodes(es);
  }
  updateEnumDeclaration(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, n: Identifier, es: readonly EnumMember[]) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== n || this.members !== es ? updateNode(createEnumDeclaration(ds, ms, n, es), this) : this;
  }
}
EnumDeclaration.prototype.kind = EnumDeclaration.kind;
export class EnumMember extends Node implements qt.EnumMember {
  static readonly kind = Syntax.EnumMember;
  parent: EnumDeclaration;
  name: PropertyName;
  initializer?: Expression;
  createEnumMember(n: string | PropertyName, i?: Expression) {
    this.name = asName(n);
    this.initializer = i && parenthesizeExpressionForList(i);
  }
  updateEnumMember(n: PropertyName, i?: Expression) {
    return this.name !== n || this.initializer !== i ? updateNode(createEnumMember(n, i), this) : this;
  }
}
EnumMember.prototype.kind = EnumMember.kind;
export class ExportAssignment extends Node implements qt.ExportAssignment {
  static readonly kind = Syntax.ExportAssignment;
  parent: SourceFile;
  isExportEquals?: boolean;
  expression: Expression;
  createExportAssignment(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, eq: boolean | undefined, e: Expression) {
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.isExportEquals = eq;
    this.expression = eq ? parenthesizeBinaryOperand(Syntax.EqualsToken, e, false, undefined) : parenthesizeDefaultExpression(e);
  }
  createExportDefault(e: Expression) {
    return createExportAssignment(undefined, undefined, false, e);
  }
  updateExportAssignment(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, e: Expression) {
    return this.decorators !== ds || this.modifiers !== ms || this.expression !== e ? updateNode(createExportAssignment(ds, ms, this.isExportEquals, e), this) : this;
  }
}
ExportAssignment.prototype.kind = ExportAssignment.kind;
export class ExportDeclaration extends Node implements qt.ExportDeclaration {
  static readonly kind = Syntax.ExportDeclaration;
  parent: SourceFile | ModuleBlock;
  isTypeOnly: boolean;
  exportClause?: NamedExportBindings;
  moduleSpecifier?: Expression;
  createExportDeclaration(ds?: readonly Decorator[], ms?: readonly Modifier[], e?: NamedExportBindings, m?: Expression, t = false) {
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.isTypeOnly = t;
    this.exportClause = e;
    this.moduleSpecifier = m;
  }
  createExternalModuleExport(exportName: Identifier) {
    return createExportDeclaration(undefined, undefined, createNamedExports([createExportSpecifier(undefined, exportName)]));
  }
  createEmptyExports() {
    return createExportDeclaration(undefined, undefined, createNamedExports([]), undefined);
  }
  updateExportDeclaration(ds?: readonly Decorator[], ms?: readonly Modifier[], e?: NamedExportBindings, m?: Expression, t = false) {
    return this.decorators !== ds || this.modifiers !== ms || this.isTypeOnly !== t || this.exportClause !== e || this.moduleSpecifier !== m
      ? updateNode(createExportDeclaration(ds, ms, e, m, t), this)
      : this;
  }
}
ExportDeclaration.prototype.kind = ExportDeclaration.kind;
export class ExportSpecifier extends Node implements qt.ExportSpecifier {
  static readonly kind = Syntax.ExportSpecifier;
  parent: NamedExports;
  propertyName?: Identifier;
  name: Identifier;
  createExportSpecifier(p: string | Identifier | undefined, n: string | Identifier) {
    this.propertyName = asName(p);
    this.name = asName(n);
  }
  updateExportSpecifier(p: Identifier | undefined, n: Identifier) {
    return this.propertyName !== p || this.name !== n ? updateNode(createExportSpecifier(p, n), this) : this;
  }
}
ExportSpecifier.prototype.kind = ExportSpecifier.kind;
export class ExpressionStatement extends Statement implements qt.ExpressionStatement {
  static readonly kind = Syntax.ExpressionStatement;
  expression: Expression;
  createExpressionStatement(expression: Expression): ExpressionStatement {
    super(true);
    this.expression = parenthesizeExpressionForExpressionStatement(expression);
  }
  update(expression: Expression) {
    return this.expression !== expression ? updateNode(createExpressionStatement(expression), this) : this;
  }
}
ExpressionStatement.prototype.kind = ExpressionStatement.kind;
export class ExpressionWithTypeArguments extends NodeWithTypeArguments implements qt.ExpressionWithTypeArguments {
  static readonly kind = Syntax.ExpressionWithTypeArguments;
  parent: HeritageClause | JSDocAugmentsTag | JSDocImplementsTag;
  expression: LeftHandSideExpression;
  createExpressionWithTypeArguments(typeArguments: readonly TypeNode[] | undefined, expression: Expression) {
    super(true);
    this.expression = parenthesize.forAccess(expression);
    this.typeArguments = Nodes.from(typeArguments);
  }
  update(typeArguments: readonly TypeNode[] | undefined, expression: Expression) {
    return this.typeArguments !== typeArguments || this.expression !== expression ? updateNode(createExpressionWithTypeArguments(typeArguments, expression), this) : this;
  }
}
ExpressionWithTypeArguments.prototype.kind = ExpressionWithTypeArguments.kind;
export class ExternalModuleReference extends Node implements qt.ExternalModuleReference {
  static readonly kind = Syntax.ExternalModuleReference;
  parent: ImportEqualsDeclaration;
  expression: Expression;
  createExternalModuleReference(expression: Expression) {
    super(true);
    this.expression = expression;
  }
  update(expression: Expression) {
    return this.expression !== expression ? updateNode(createExternalModuleReference(expression), this) : this;
  }
}
ExternalModuleReference.prototype.kind = ExternalModuleReference.kind;
export class ForInStatement extends Node implements qt.ForInStatement {
  static readonly kind = Syntax.ForInStatement;
  initializer: ForInitializer;
  expression: Expression;
  createForIn(initializer: ForInitializer, expression: Expression, statement: Statement) {
    super(true);
    this.initializer = initializer;
    this.expression = expression;
    this.statement = asEmbeddedStatement(statement);
  }
  update(initializer: ForInitializer, expression: Expression, statement: Statement) {
    return this.initializer !== initializer || this.expression !== expression || this.statement !== statement ? updateNode(createForIn(initializer, expression, statement), this) : this;
  }
}
ForInStatement.prototype.kind = ForInStatement.kind;
export class ForOfStatement extends Node implements qt.ForOfStatement {
  static readonly kind = Syntax.ForOfStatement;
  awaitModifier?: AwaitKeywordToken;
  initializer: ForInitializer;
  expression: Expression;
  createForOf(awaitModifier: AwaitKeywordToken | undefined, initializer: ForInitializer, expression: Expression, statement: Statement) {
    super(true);
    this.awaitModifier = awaitModifier;
    this.initializer = initializer;
    this.expression = isCommaSequence(expression) ? createParen(expression) : expression;
    this.statement = asEmbeddedStatement(statement);
  }
  update(awaitModifier: AwaitKeywordToken | undefined, initializer: ForInitializer, expression: Expression, statement: Statement) {
    return this.awaitModifier !== awaitModifier || this.initializer !== initializer || this.expression !== expression || this.statement !== statement
      ? updateNode(createForOf(awaitModifier, initializer, expression, statement), this)
      : this;
  }
}
ForOfStatement.prototype.kind = ForOfStatement.kind;
export class ForStatement extends Node implements qt.ForStatement {
  static readonly kind = Syntax.ForStatement;
  initializer?: ForInitializer;
  condition?: Expression;
  incrementor?: Expression;
  createFor(initializer: ForInitializer | undefined, condition: Expression | undefined, incrementor: Expression | undefined, statement: Statement) {
    super(true);
    this.initializer = initializer;
    this.condition = condition;
    this.incrementor = incrementor;
    this.statement = asEmbeddedStatement(statement);
  }
  update(initializer: ForInitializer | undefined, condition: Expression | undefined, incrementor: Expression | undefined, statement: Statement) {
    return this.initializer !== initializer || this.condition !== condition || this.incrementor !== incrementor || this.statement !== statement
      ? updateNode(createFor(initializer, condition, incrementor, statement), this)
      : this;
  }
}
ForStatement.prototype.kind = ForStatement.kind;
export class FunctionDeclaration extends DeclarationStatement implements qt.FunctionDeclaration {
  static readonly kind = Syntax.FunctionDeclaration;
  name?: Identifier;
  body?: FunctionBody;
  createFunctionDeclaration(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    asteriskToken: AsteriskToken | undefined,
    name: string | Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    parameters: readonly ParameterDeclaration[],
    type: TypeNode | undefined,
    body: Block | undefined
  ) {
    super(true);
    this.decorators = Nodes.from(decorators);
    this.modifiers = Nodes.from(modifiers);
    this.asteriskToken = asteriskToken;
    this.name = asName(name);
    this.typeParameters = Nodes.from(typeParameters);
    this.parameters = new Nodes(parameters);
    this.type = type;
    this.body = body;
  }
  updateFunctionDeclaration(
    this: FunctionDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    asteriskToken: AsteriskToken | undefined,
    name: Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    parameters: readonly ParameterDeclaration[],
    type: TypeNode | undefined,
    body: Block | undefined
  ) {
    return this.decorators !== decorators ||
      this.modifiers !== modifiers ||
      this.asteriskToken !== asteriskToken ||
      this.name !== name ||
      this.typeParameters !== typeParameters ||
      this.parameters !== parameters ||
      this.type !== type ||
      this.body !== body
      ? updateNode(createFunctionDeclaration(decorators, modifiers, asteriskToken, name, typeParameters, parameters, type, body), this)
      : this;
  }
}
FunctionDeclaration.prototype.kind = FunctionDeclaration.kind;
export class FunctionExpression extends FunctionLikeDeclarationBase implements qt.FunctionExpression {
  static readonly kind = Syntax.FunctionExpression;
  name?: Identifier;
  body: FunctionBody;
  constructor(
    ms: readonly Modifier[] | undefined,
    a: AsteriskToken | undefined,
    name: string | Identifier | undefined,
    ts: readonly TypeParameterDeclaration[] | undefined,
    ps: readonly ParameterDeclaration[] | undefined,
    t: TypeNode | undefined,
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
    a: AsteriskToken | undefined,
    name: Identifier | undefined,
    ts: readonly TypeParameterDeclaration[] | undefined,
    ps: readonly ParameterDeclaration[],
    t: TypeNode | undefined,
    b: Block
  ) {
    return this.name !== name || this.modifiers !== ms || this.asteriskToken !== a || this.typeParameters !== ts || this.parameters !== parameters || this.type !== type || this.body !== body
      ? new new FunctionExpression(ms, a, name, ts, ps, t, b).updateFrom(this)
      : this;
  }
}
FunctionExpression.prototype.kind = FunctionExpression.kind;
qb.addMixins(FunctionExpression, [PrimaryExpression, JSDocContainer]);
export class FunctionTypeNode extends FunctionOrConstructorTypeNodeBase implements qt.FunctionTypeNode {
  static readonly kind = Syntax.FunctionType;
  constructor(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
    return SignatureDeclaration.create(Syntax.FunctionType, ts, ps, t) as FunctionTypeNode;
  }
  update(ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: TypeNode) {
    return SignatureDeclaration.update(n, ts, ps, t);
  }
}
FunctionTypeNode.prototype.kind = FunctionTypeNode.kind;
export class GetAccessorDeclaration extends Node implements qt.GetAccessorDeclaration {
  static readonly kind = Syntax.GetAccessor;
  parent: ClassLikeDeclaration | ObjectLiteralExpression;
  name: PropertyName;
  body?: FunctionBody;
  constructor(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | PropertyName, ps: readonly ParameterDeclaration[], t?: TypeNode, b?: Block) {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(p);
    this.typeParameters = undefined;
    this.parameters = new Nodes(ps);
    this.type = t;
    this.body = b;
  }
  update(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: PropertyName, ps: readonly ParameterDeclaration[], t?: TypeNode, b?: Block) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== p || this.parameters !== ps || this.type !== t || this.body !== b ? updateNode(create(ds, ms, p, ps, t, b), n) : n;
  }
  orSetKind(n: Node): n is AccessorDeclaration {
    return this.kind === Syntax.SetAccessor || this.kind === Syntax.GetAccessor;
  }
}
GetAccessorDeclaration.prototype.kind = GetAccessorDeclaration.kind;
export class HeritageClause extends Node implements qt.HeritageClause {
  static readonly kind = Syntax.HeritageClause;
  parent: InterfaceDeclaration | ClassLikeDeclaration;
  token: Syntax.ExtendsKeyword | Syntax.ImplementsKeyword;
  types: Nodes<ExpressionWithTypeArguments>;
  createHeritageClause(token: HeritageClause['token'], types: readonly ExpressionWithTypeArguments[]) {
    super(true);
    this.token = token;
    this.types = new Nodes(types);
  }
  update(types: readonly ExpressionWithTypeArguments[]) {
    return this.types !== types ? updateNode(createHeritageClause(this.token, types), this) : this;
  }
}
HeritageClause.prototype.kind = HeritageClause.kind;
export class Identifier extends TokenOrIdentifier implements qt.Identifier {
  static readonly kind = Syntax.Identifier;
  escapedText!: __String;
  autoGenerateFlags = GeneratedIdentifierFlags.None;
  typeArguments?: Nodes<TypeNode | TypeParameterDeclaration>;
  flowNode = undefined;
  originalKeywordKind?: Syntax;
  autoGenerateId = 0;
  isInJSDocNamespace?: boolean;
  jsdocDotPos?: number;
  constructor(t: string);
  constructor(t: string, typeArgs: readonly (TypeNode | TypeParameterDeclaration)[] | undefined);
  constructor(t: string, typeArgs?: readonly (TypeNode | TypeParameterDeclaration)[]) {
    super();
    this.escapedText = syntax.get.escUnderscores(t);
    this.originalKeywordKind = t ? syntax.fromString(t) : Syntax.Unknown;
    if (typeArgs) {
      this.typeArguments = new Nodes(typeArgs as readonly TypeNode[]);
    }
  }
  get text(): string {
    return idText(this);
  }
  isInternalName(this: Identifier) {
    return (Node.get.emitFlags(this) & EmitFlags.InternalName) !== 0;
  }
  isLocalName(this: Identifier) {
    return (Node.get.emitFlags(this) & EmitFlags.LocalName) !== 0;
  }
  isExportName(this: Identifier) {
    return (Node.get.emitFlags(this) & EmitFlags.ExportName) !== 0;
  }
  update(typeArgs?: Nodes<TypeNode | TypeParameterDeclaration> | undefined): Identifier {
    return this.typeArguments !== typeArgs ? new Identifier(this.text, typeArgs).updateFrom(this) : this;
  }
  static createTempVariable(recordTempVariable: ((this: Identifier) => void) | undefined): Identifier;
  static createTempVariable(recordTempVariable: ((this: Identifier) => void) | undefined, reservedInNestedScopes: boolean): GeneratedIdentifier;
  static createTempVariable(recordTempVariable: ((this: Identifier) => void) | undefined, reservedInNestedScopes?: boolean): GeneratedIdentifier {
    const name = new Identifier('') as GeneratedIdentifier;
    name.autoGenerateFlags = GeneratedIdentifierFlags.Auto;
    name.autoGenerateId = nextAutoGenerateId;
    nextAutoGenerateId++;
    if (recordTempVariable) recordTempVariable(name);
    if (reservedInNestedScopes) name.autoGenerateFlags |= GeneratedIdentifierFlags.ReservedInNestedScopes;
    return name;
  }
  static createLoopVariable(): Identifier {
    const name = new Identifier('');
    name.autoGenerateFlags = GeneratedIdentifierFlags.Loop;
    name.autoGenerateId = nextAutoGenerateId;
    nextAutoGenerateId++;
    return name;
  }
  static createUniqueName(text: string): Identifier {
    const name = new Identifier(text);
    name.autoGenerateFlags = GeneratedIdentifierFlags.Unique;
    name.autoGenerateId = nextAutoGenerateId;
    nextAutoGenerateId++;
    return name;
  }
  static createOptimisticUniqueName(text: string): GeneratedIdentifier;
  static createOptimisticUniqueName(text: string): Identifier;
  static createOptimisticUniqueName(text: string): GeneratedIdentifier {
    const name = new Identifier(text) as GeneratedIdentifier;
    name.autoGenerateFlags = GeneratedIdentifierFlags.Unique | GeneratedIdentifierFlags.Optimistic;
    name.autoGenerateId = nextAutoGenerateId;
    nextAutoGenerateId++;
    return name;
  }
  static createFileLevelUniqueName(text: string): Identifier {
    const name = createOptimisticUniqueName(text);
    name.autoGenerateFlags |= GeneratedIdentifierFlags.FileLevel;
    return name;
  }
  static getGeneratedNameForNode(this: Node | undefined): Identifier;
  static getGeneratedNameForNode(this: Node | undefined, flags: GeneratedIdentifierFlags): Identifier;
  static getGeneratedNameForNode(this: Node | undefined, flags?: GeneratedIdentifierFlags): Identifier {
    const name = new Identifier(this && Node.is.kind(Identifier, this) ? idText(this) : '');
    name.autoGenerateFlags = GeneratedIdentifierFlags.Node | flags!;
    name.autoGenerateId = nextAutoGenerateId;
    name.original = this;
    nextAutoGenerateId++;
    return name;
  }
  static getNamespaceMemberName(ns: Identifier, name: Identifier, allowComments?: boolean, allowSourceMaps?: boolean): PropertyAccessExpression {
    const qualifiedName = createPropertyAccess(ns, qb.isSynthesized(name) ? name : getSynthesizedClone(name));
    setRange(qualifiedName, name);
    let emitFlags: EmitFlags = 0;
    if (!allowSourceMaps) emitFlags |= EmitFlags.NoSourceMap;
    if (!allowComments) emitFlags |= EmitFlags.NoComments;
    if (emitFlags) setEmitFlags(qualifiedName, emitFlags);
    return qualifiedName;
  }
  static getLocalNameForExternalImport(this: ImportDeclaration | ExportDeclaration | ImportEqualsDeclaration, sourceFile: SourceFile): Identifier | undefined {
    const namespaceDeclaration = getNamespaceDeclarationNode(this);
    if (namespaceDeclaration && !isDefaultImport(this)) {
      const name = namespaceDeclaration.name;
      return Node.is.generatedIdentifier(name) ? name : new Identifier(getSourceTextOfNodeFromSourceFile(sourceFile, name) || idText(name));
    }
    if (this.kind === Syntax.ImportDeclaration && this.importClause) return getGeneratedNameForNode(this);
    if (this.kind === Syntax.ExportDeclaration && this.moduleSpecifier) return getGeneratedNameForNode(this);
    return;
  }
}
Identifier.prototype.kind = Identifier.kind;
qb.addMixins(Identifier, [Declaration, PrimaryExpression]);
export class IfStatement extends Statement implements qt.IfStatement {
  static readonly kind = Syntax.IfStatement;
  expression: Expression;
  thenStatement: Statement;
  elseStatement?: Statement;
  createIf(expression: Expression, thenStatement: Statement, elseStatement?: Statement) {
    super(true);
    this.expression = expression;
    this.thenStatement = asEmbeddedStatement(thenStatement);
    this.elseStatement = asEmbeddedStatement(elseStatement);
  }
  update(expression: Expression, thenStatement: Statement, elseStatement: Statement | undefined) {
    return this.expression !== expression || this.thenStatement !== thenStatement || this.elseStatement !== elseStatement ? updateNode(createIf(expression, thenStatement, elseStatement), this) : this;
  }
}
IfStatement.prototype.kind = IfStatement.kind;
export class ImportClause extends NamedDeclaration implements qt.ImportClause {
  static readonly kind = Syntax.ImportClause;
  parent: ImportDeclaration;
  isTypeOnly: boolean;
  name?: Identifier;
  namedBindings?: NamedImportBindings;
  createImportClause(name: Identifier | undefined, namedBindings: NamedImportBindings | undefined, isTypeOnly = false): ImportClause {
    super(true);
    this.name = name;
    this.namedBindings = namedBindings;
    this.isTypeOnly = isTypeOnly;
  }
  update(name: Identifier | undefined, namedBindings: NamedImportBindings | undefined, isTypeOnly: boolean) {
    return this.name !== name || this.namedBindings !== namedBindings || this.isTypeOnly !== isTypeOnly ? updateNode(createImportClause(name, namedBindings, isTypeOnly), this) : this;
  }
}
ImportClause.prototype.kind = ImportClause.kind;
export class ImportDeclaration extends Statement implements qt.ImportDeclaration {
  static readonly kind = Syntax.ImportDeclaration;
  parent: SourceFile | ModuleBlock;
  importClause?: ImportClause;
  moduleSpecifier: Expression;
  createImportDeclaration(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    importClause: ImportClause | undefined,
    moduleSpecifier: Expression
  ): ImportDeclaration {
    super(true);
    this.decorators = Nodes.from(decorators);
    this.modifiers = Nodes.from(modifiers);
    this.importClause = importClause;
    this.moduleSpecifier = moduleSpecifier;
  }
  updateImportDeclaration(
    this: ImportDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    importClause: ImportClause | undefined,
    moduleSpecifier: Expression
  ) {
    return this.decorators !== decorators || this.modifiers !== modifiers || this.importClause !== importClause || this.moduleSpecifier !== moduleSpecifier
      ? updateNode(createImportDeclaration(decorators, modifiers, importClause, moduleSpecifier), this)
      : this;
  }
}
ImportDeclaration.prototype.kind = ImportDeclaration.kind;
export class ImportEqualsDeclaration extends Node implements qt.ImportEqualsDeclaration {
  static readonly kind = Syntax.ImportEqualsDeclaration;
  parent: SourceFile | ModuleBlock;
  name: Identifier;
  moduleReference: ModuleReference;
  createImportEqualsDeclaration(decorators: readonly Decorator[] | undefined, modifiers: readonly Modifier[] | undefined, name: string | Identifier, moduleReference: ModuleReference) {
    super(true);
    this.decorators = Nodes.from(decorators);
    this.modifiers = Nodes.from(modifiers);
    this.name = asName(name);
    this.moduleReference = moduleReference;
  }
  updateImportEqualsDeclaration(
    this: ImportEqualsDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: Identifier,
    moduleReference: ModuleReference
  ) {
    return this.decorators !== decorators || this.modifiers !== modifiers || this.name !== name || this.moduleReference !== moduleReference
      ? updateNode(createImportEqualsDeclaration(decorators, modifiers, name, moduleReference), this)
      : this;
  }
}
ImportEqualsDeclaration.prototype.kind = ImportEqualsDeclaration.kind;
export class ImportSpecifier extends NamedDeclaration implements qt.ImportSpecifier {
  static readonly kind = Syntax.ImportSpecifier;
  parent: NamedImports;
  propertyName?: Identifier;
  name: Identifier;
  createImportSpecifier(propertyName: Identifier | undefined, name: Identifier) {
    super(true);
    this.propertyName = propertyName;
    this.name = name;
  }
  update(propertyName: Identifier | undefined, name: Identifier) {
    return this.propertyName !== propertyName || this.name !== name ? updateNode(createImportSpecifier(propertyName, name), this) : this;
  }
}
ImportSpecifier.prototype.kind = ImportSpecifier.kind;
export class ImportTypeNode extends NodeWithTypeArguments implements qt.ImportTypeNode {
  static readonly kind = Syntax.ImportType;
  isTypeOf?: boolean;
  argument: TypeNode;
  qualifier?: EntityName;
  constructor(a: TypeNode, q?: EntityName, ts?: readonly TypeNode[], tof?: boolean) {
    super(true);
    this.argument = a;
    this.qualifier = q;
    this.typeArguments = parenthesizeTypeParameters(ts);
    this.isTypeOf = tof;
  }
  update(a: TypeNode, q?: EntityName, ts?: readonly TypeNode[], tof?: boolean) {
    return this.argument !== a || this.qualifier !== q || this.typeArguments !== ts || this.isTypeOf !== tof ? updateNode(create(a, q, ts, tof), n) : n;
  }
}
ImportTypeNode.prototype.kind = ImportTypeNode.kind;
export class IndexedAccessTypeNode extends TypeNode implements qt.IndexedAccessTypeNode {
  static readonly kind = Syntax.IndexedAccessType;
  objectType: TypeNode;
  indexType: TypeNode;
  constructor(o: TypeNode, i: TypeNode) {
    super(true);
    this.objectType = parenthesize.elementTypeMember(o);
    this.indexType = i;
  }
  update(o: TypeNode, i: TypeNode) {
    return this.objectType !== o || this.indexType !== i ? new IndexedAccessTypeNode(o, i).updateFrom(this) : this;
  }
}
IndexedAccessTypeNode.prototype.kind = IndexedAccessTypeNode.kind;
export class IndexSignatureDeclaration extends Node implements qt.IndexSignatureDeclaration {
  static readonly kind = Syntax.IndexSignature;
  parent: ObjectTypeDeclaration;
  constructor(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], t: TypeNode): IndexSignatureDeclaration {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.parameters = new Nodes(ps);
    this.type = t;
  }
  update(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], t: TypeNode) {
    return this.parameters !== ps || this.type !== t || this.decorators !== ds || this.modifiers !== ms ? updateNode(create(ds, ms, ps, t), n) : n;
  }
}
IndexSignatureDeclaration.prototype.kind = IndexSignatureDeclaration.kind;
export class InferTypeNode extends TypeNode implements qt.InferTypeNode {
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
export class InterfaceDeclaration extends Node implements qt.InterfaceDeclaration {
  static readonly kind = Syntax.InterfaceDeclaration;
  name: Identifier;
  typeParameters?: Nodes<TypeParameterDeclaration>;
  heritageClauses?: Nodes<HeritageClause>;
  members: Nodes<TypeElement>;
  createInterfaceDeclaration(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: string | Identifier,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    heritageClauses: readonly HeritageClause[] | undefined,
    members: readonly TypeElement[]
  ) {
    super(true);
    this.decorators = Nodes.from(decorators);
    this.modifiers = Nodes.from(modifiers);
    this.name = asName(name);
    this.typeParameters = Nodes.from(typeParameters);
    this.heritageClauses = Nodes.from(heritageClauses);
    this.members = new Nodes(members);
  }
  updateInterfaceDeclaration(
    this: InterfaceDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: Identifier,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    heritageClauses: readonly HeritageClause[] | undefined,
    members: readonly TypeElement[]
  ) {
    return this.decorators !== decorators ||
      this.modifiers !== modifiers ||
      this.name !== name ||
      this.typeParameters !== typeParameters ||
      this.heritageClauses !== heritageClauses ||
      this.members !== members
      ? updateNode(createInterfaceDeclaration(decorators, modifiers, name, typeParameters, heritageClauses, members), this)
      : this;
  }
}
InterfaceDeclaration.prototype.kind = InterfaceDeclaration.kind;
export class IntersectionTypeNode extends TypeNode implements qt.IntersectionTypeNode {
  static readonly kind = Syntax.IntersectionType;
  types: Nodes<TypeNode>;
  constructor(ts: readonly TypeNode[]) {
    this.types = ts;
    // return UnionTypeNode.orIntersectionCreate(Syntax.IntersectionType, ts) as IntersectionTypeNode;
  }
  update(ts: Nodes<TypeNode>) {
    // return UnionTypeNode.orIntersectionUpdate(n, ts);
  }
}
IntersectionTypeNode.prototype.kind = IntersectionTypeNode.kind;
export class JSDoc extends Node implements qt.JSDoc {
  static readonly kind = Syntax.JSDocComment;
  parent: HasJSDoc;
  tags?: Nodes<JSDocTag>;
  comment?: string;
  createJSDocComment(comment?: string | undefined, tags?: Nodes<JSDocTag> | undefined) {
    super(true);
    this.comment = comment;
    this.tags = tags;
  }
}
JSDoc.prototype.kind = JSDoc.kind;
export class JSDocAllType extends JSDocType implements qt.JSDocAllType {
  static readonly kind = Syntax.JSDocAllType;
}
JSDocAllType.prototype.kind = JSDocAllType.kind;
export class JSDocAugmentsTag extends JSDocTag implements qt.JSDocAugmentsTag {
  static readonly kind = Syntax.JSDocAugmentsTag;
  class: ExpressionWithTypeArguments & { expression: Identifier | PropertyAccessEntityNameExpression };
  createJSDocAugmentsTag(classExpression: JSDocAugmentsTag['class'], comment?: string) {
    const tag = createJSDocTag<JSDocAugmentsTag>(Syntax.JSDocAugmentsTag, 'augments', comment);
    tag.class = classExpression;
    return tag;
  }
}
JSDocAugmentsTag.prototype.kind = JSDocAugmentsTag.kind;
export class JSDocAuthorTag extends JSDocTag implements qt.JSDocAuthorTag {
  static readonly kind = Syntax.JSDocAuthorTag;
  createJSDocAuthorTag(comment?: string) {
    return createJSDocTag<JSDocAuthorTag>(Syntax.JSDocAuthorTag, 'author', comment);
  }
}
JSDocAuthorTag.prototype.kind = JSDocAuthorTag.kind;
export class JSDocCallbackTag extends JSDocTag implements qt.JSDocCallbackTag {
  //}, NamedDeclaration {
  static readonly kind = Syntax.JSDocCallbackTag;
  parent: JSDoc;
  fullName?: JSDocNamespaceDeclaration | Identifier;
  name?: Identifier;
  typeExpression: JSDocSignature;
  createJSDocCallbackTag(fullName: JSDocNamespaceDeclaration | Identifier | undefined, name: Identifier | undefined, comment: string | undefined, typeExpression: JSDocSignature) {
    const tag = createJSDocTag<JSDocCallbackTag>(Syntax.JSDocCallbackTag, 'callback', comment);
    tag.fullName = fullName;
    tag.name = name;
    tag.typeExpression = typeExpression;
    return tag;
  }
}
JSDocCallbackTag.prototype.kind = JSDocCallbackTag.kind;
export class JSDocClassTag extends JSDocTag implements qt.JSDocClassTag {
  static readonly kind = Syntax.JSDocClassTag;
  createJSDocClassTag(comment?: string): JSDocClassTag {
    return createJSDocTag<JSDocClassTag>(Syntax.JSDocClassTag, 'class', comment);
  }
}
JSDocClassTag.prototype.kind = JSDocClassTag.kind;
export class JSDocEnumTag extends JSDocTag implements qt.JSDocEnumTag {
  //}, Declaration {
  static readonly kind = Syntax.JSDocEnumTag;
  parent: JSDoc;
  typeExpression?: JSDocTypeExpression;
  createJSDocEnumTag(typeExpression?: JSDocTypeExpression, comment?: string) {
    const tag = createJSDocTag<JSDocEnumTag>(Syntax.JSDocEnumTag, 'enum', comment);
    tag.typeExpression = typeExpression;
    return tag;
  }
}
JSDocEnumTag.prototype.kind = JSDocEnumTag.kind;
export class JSDocFunctionType extends JSDocType implements qt.JSDocFunctionType {
  // , SignatureDeclarationBase {
  static readonly kind = Syntax.JSDocFunctionType;
}
JSDocFunctionType.prototype.kind = JSDocFunctionType.kind;
export class JSDocImplementsTag extends JSDocTag implements qt.JSDocImplementsTag {
  static readonly kind = Syntax.JSDocImplementsTag;
  class: ExpressionWithTypeArguments & { expression: Identifier | PropertyAccessEntityNameExpression };
  createJSDocImplementsTag(classExpression: JSDocImplementsTag['class'], comment?: string) {
    const tag = createJSDocTag<JSDocImplementsTag>(Syntax.JSDocImplementsTag, 'implements', comment);
    tag.class = classExpression;
    return tag;
  }
}
JSDocImplementsTag.prototype.kind = JSDocImplementsTag.kind;
export class JSDocNonNullableType extends JSDocType implements qt.JSDocNonNullableType {
  static readonly kind = Syntax.JSDocNonNullableType;
  type: TypeNode;
}
JSDocNonNullableType.prototype.kind = JSDocNonNullableType.kind;
export class JSDocNullableType extends JSDocType implements qt.JSDocNullableType {
  static readonly kind = Syntax.JSDocNullableType;
  type: TypeNode;
}
JSDocNullableType.prototype.kind = JSDocNullableType.kind;
export class JSDocOptionalType extends JSDocType implements qt.JSDocOptionalType {
  static readonly kind = Syntax.JSDocOptionalType;
  type: TypeNode;
}
JSDocOptionalType.prototype.kind = JSDocOptionalType.kind;
export class JSDocParameterTag extends JSDocPropertyLikeTag implements qt.JSDocParameterTag {
  static readonly kind = Syntax.JSDocParameterTag;
  createJSDocParamTag(name: EntityName, isBracketed: boolean, typeExpression?: JSDocTypeExpression, comment?: string): JSDocParameterTag {
    const tag = createJSDocTag<JSDocParameterTag>(Syntax.JSDocParameterTag, 'param', comment);
    tag.typeExpression = typeExpression;
    tag.name = name;
    tag.isBracketed = isBracketed;
    return tag;
  }
  createJSDocParameterTag(typeExpression: JSDocTypeExpression | undefined, name: EntityName, isNameFirst: boolean, isBracketed: boolean, comment?: string) {
    return createJSDocPropertyLikeTag<JSDocParameterTag>(Syntax.JSDocParameterTag, 'param', typeExpression, name, isNameFirst, isBracketed, comment);
  }
}
JSDocParameterTag.prototype.kind = JSDocParameterTag.kind;
export class JSDocPrivateTag extends JSDocTag implements qt.JSDocPrivateTag {
  static readonly kind = Syntax.JSDocPrivateTag;
  createJSDocPrivateTag() {
    return createJSDocTag<JSDocPrivateTag>(Syntax.JSDocPrivateTag, 'private');
  }
}
JSDocPrivateTag.prototype.kind = JSDocPrivateTag.kind;
export class JSDocPropertyLikeTag extends JSDocTag implements qt.JSDocPropertyLikeTag {
  //}, Declaration {
  parent: JSDoc;
  name: EntityName;
  typeExpression?: JSDocTypeExpression;
  isNameFirst: boolean;
  isBracketed: boolean;
  createJSDocPropertyLikeTag<T extends JSDocPropertyLikeTag>(
    kind: T['kind'],
    tagName: 'arg' | 'argument' | 'param',
    typeExpression: JSDocTypeExpression | undefined,
    name: EntityName,
    isNameFirst: boolean,
    isBracketed: boolean,
    comment?: string
  ) {
    const tag = createJSDocTag<T>(kind, tagName, comment);
    tag.typeExpression = typeExpression;
    tag.name = name;
    tag.isNameFirst = isNameFirst;
    tag.isBracketed = isBracketed;
    return tag;
  }
}
JSDocPropertyLikeTag.prototype.kind = JSDocPropertyLikeTag.kind;
export class JSDocPropertyTag extends JSDocPropertyLikeTag implements qt.JSDocPropertyTag {
  static readonly kind = Syntax.JSDocPropertyTag;
  createJSDocPropertyTag(typeExpression: JSDocTypeExpression | undefined, name: EntityName, isNameFirst: boolean, isBracketed: boolean, comment?: string) {
    return createJSDocPropertyLikeTag<JSDocPropertyTag>(Syntax.JSDocPropertyTag, 'param', typeExpression, name, isNameFirst, isBracketed, comment);
  }
}
JSDocPropertyTag.prototype.kind = JSDocPropertyTag.kind;
export class JSDocProtectedTag extends JSDocTag implements qt.JSDocProtectedTag {
  static readonly kind = Syntax.JSDocProtectedTag;
  createJSDocProtectedTag() {
    return createJSDocTag<JSDocProtectedTag>(Syntax.JSDocProtectedTag, 'protected');
  }
}
JSDocProtectedTag.prototype.kind = JSDocProtectedTag.kind;
export class JSDocPublicTag extends JSDocTag implements qt.JSDocPublicTag {
  static readonly kind = Syntax.JSDocPublicTag;
  createJSDocPublicTag() {
    return createJSDocTag<JSDocPublicTag>(Syntax.JSDocPublicTag, 'public');
  }
}
JSDocPublicTag.prototype.kind = JSDocPublicTag.kind;
export class JSDocReadonlyTag extends JSDocTag implements qt.JSDocReadonlyTag {
  static readonly kind = Syntax.JSDocReadonlyTag;
  createJSDocReadonlyTag() {
    return createJSDocTag<JSDocReadonlyTag>(Syntax.JSDocReadonlyTag, 'readonly');
  }
}
JSDocReadonlyTag.prototype.kind = JSDocReadonlyTag.kind;
export class JSDocReturnTag extends JSDocTag implements qt.JSDocReturnTag {
  static readonly kind = Syntax.JSDocReturnTag;
  typeExpression?: JSDocTypeExpression;
  createJSDocReturnTag(typeExpression?: JSDocTypeExpression, comment?: string): JSDocReturnTag {
    const tag = createJSDocTag<JSDocReturnTag>(Syntax.JSDocReturnTag, 'returns', comment);
    tag.typeExpression = typeExpression;
    return tag;
  }
}
JSDocReturnTag.prototype.kind = JSDocReturnTag.kind;
export class JSDocSignature extends JSDocType implements qt.JSDocSignature {
  //}, Declaration {
  static readonly kind = Syntax.JSDocSignature;
  typeParameters?: readonly JSDocTemplateTag[];
  parameters: readonly JSDocParameterTag[];
  type: JSDocReturnTag | undefined;
  createJSDocSignature(typeParameters: readonly JSDocTemplateTag[] | undefined, parameters: readonly JSDocParameterTag[], type?: JSDocReturnTag) {
    const tag = Node.createSynthesized(Syntax.JSDocSignature) as JSDocSignature;
    tag.typeParameters = typeParameters;
    tag.parameters = parameters;
    tag.type = type;
    return tag;
  }
}
JSDocSignature.prototype.kind = JSDocSignature.kind;
export class JSDocTag extends Node implements qt.JSDocTag {
  parent: JSDoc | JSDocTypeLiteral;
  tagName: Identifier;
  comment?: string;
  createJSDocTag<T extends JSDocTag>(kind: T['kind'], tagName: string, comment?: string): T {
    super(true);
    this.tagName = new Identifier(tagName);
    this.comment = comment;
  }
}
JSDocTag.prototype.kind = JSDocTag.kind;
export class JSDocTemplateTag extends JSDocTag implements qt.JSDocTemplateTag {
  static readonly kind = Syntax.JSDocTemplateTag;
  constraint: JSDocTypeExpression | undefined;
  typeParameters: Nodes<TypeParameterDeclaration>;
  createJSDocTemplateTag(constraint: JSDocTypeExpression | undefined, typeParameters: readonly TypeParameterDeclaration[], comment?: string) {
    const tag = createJSDocTag<JSDocTemplateTag>(Syntax.JSDocTemplateTag, 'template', comment);
    tag.constraint = constraint;
    tag.typeParameters = Nodes.from(typeParameters);
    return tag;
  }
}
JSDocTemplateTag.prototype.kind = JSDocTemplateTag.kind;
export class JSDocThisTag extends JSDocTag implements qt.JSDocThisTag {
  static readonly kind = Syntax.JSDocThisTag;
  typeExpression?: JSDocTypeExpression;
  createJSDocThisTag(typeExpression?: JSDocTypeExpression): JSDocThisTag {
    const tag = createJSDocTag<JSDocThisTag>(Syntax.JSDocThisTag, 'this');
    tag.typeExpression = typeExpression;
    return tag;
  }
}
JSDocThisTag.prototype.kind = JSDocThisTag.kind;
export class JSDocTypedefTag extends JSDocTag implements qt.JSDocTypedefTag {
  //, NamedDeclaration {
  static readonly kind = Syntax.JSDocTypedefTag;
  parent: JSDoc;
  fullName?: JSDocNamespaceDeclaration | Identifier;
  name?: Identifier;
  typeExpression?: JSDocTypeExpression | JSDocTypeLiteral;
  createJSDocTypedefTag(fullName?: JSDocNamespaceDeclaration | Identifier, name?: Identifier, comment?: string, typeExpression?: JSDocTypeExpression | JSDocTypeLiteral) {
    const tag = createJSDocTag<JSDocTypedefTag>(Syntax.JSDocTypedefTag, 'typedef', comment);
    tag.fullName = fullName;
    tag.name = name;
    tag.typeExpression = typeExpression;
    return tag;
  }
}
JSDocTypedefTag.prototype.kind = JSDocTypedefTag.kind;
export class JSDocTypeExpression extends TypeNode implements qt.JSDocTypeExpression {
  static readonly kind = Syntax.JSDocTypeExpression;
  type: TypeNode;
  constructor(t: TypeNode): JSDocTypeExpression {
    super(true);
    this.type = t;
  }
}
JSDocTypeExpression.prototype.kind = JSDocTypeExpression.kind;
export class JSDocTypeLiteral extends JSDocType implements qt.JSDocTypeLiteral {
  static readonly kind = Syntax.JSDocTypeLiteral;
  jsDocPropertyTags?: readonly JSDocPropertyLikeTag[];
  isArrayType?: boolean;
  createJSDocTypeLiteral(jsDocPropertyTags?: readonly JSDocPropertyLikeTag[], isArrayType?: boolean) {
    const tag = Node.createSynthesized(Syntax.JSDocTypeLiteral) as JSDocTypeLiteral;
    tag.jsDocPropertyTags = jsDocPropertyTags;
    tag.isArrayType = isArrayType;
    return tag;
  }
}
JSDocTypeLiteral.prototype.kind = JSDocTypeLiteral.kind;
export class JSDocTypeTag extends JSDocTag implements qt.JSDocTypeTag {
  static readonly kind = Syntax.JSDocTypeTag;
  typeExpression: JSDocTypeExpression;
  createJSDocTypeTag(typeExpression: JSDocTypeExpression, comment?: string): JSDocTypeTag {
    const tag = createJSDocTag<JSDocTypeTag>(Syntax.JSDocTypeTag, 'type', comment);
    tag.typeExpression = typeExpression;
    return tag;
  }
}
JSDocTypeTag.prototype.kind = JSDocTypeTag.kind;
export class JSDocUnknownType extends JSDocType implements qt.JSDocUnknownType {
  static readonly kind = Syntax.JSDocUnknownType;
}
JSDocUnknownType.prototype.kind = JSDocUnknownType.kind;
export class JSDocVariadicType extends JSDocType implements qt.JSDocVariadicType {
  static readonly kind = Syntax.JSDocVariadicType;
  type: TypeNode;
  createJSDocVariadicType(type: TypeNode): JSDocVariadicType {
    super(true);
    this.type = type;
  }
  update(type: TypeNode): JSDocVariadicType {
    return this.type !== type ? updateNode(createJSDocVariadicType(type), this) : this;
  }
}
JSDocVariadicType.prototype.kind = JSDocVariadicType.kind;
export class JsxAttribute extends ObjectLiteralElement implements qt.JsxAttribute {
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
    return this.name !== name || this.initializer !== initializer ? updateNode(createJsxAttribute(name, initializer), this) : this;
  }
}
JsxAttribute.prototype.kind = JsxAttribute.kind;
export class JsxAttributes extends Node implements qt.JsxAttributes {
  static readonly kind = Syntax.JsxAttributes;
  parent: JsxOpeningLikeElement;
  createJsxAttributes(properties: readonly JsxAttributeLike[]) {
    super(true);
    this.properties = new Nodes(properties);
  }
  update(properties: readonly JsxAttributeLike[]) {
    return this.properties !== properties ? updateNode(createJsxAttributes(properties), this) : this;
  }
}
JsxAttributes.prototype.kind = JsxAttributes.kind;
export class JsxClosingElement extends Node implements qt.JsxClosingElement {
  static readonly kind = Syntax.JsxClosingElement;
  parent: JsxElement;
  tagName: JsxTagNameExpression;
  createJsxClosingElement(tagName: JsxTagNameExpression) {
    super(true);
    this.tagName = tagName;
  }
  update(tagName: JsxTagNameExpression) {
    return this.tagName !== tagName ? updateNode(createJsxClosingElement(tagName), this) : this;
  }
}
JsxClosingElement.prototype.kind = JsxClosingElement.kind;
export class JsxClosingFragment extends Expression implements qt.JsxClosingFragment {
  static readonly kind = Syntax.JsxClosingFragment;
  parent: JsxFragment;
  createJsxJsxClosingFragment() {
    return <JsxClosingFragment>Node.createSynthesized(Syntax.JsxClosingFragment);
  }
}
JsxClosingFragment.prototype.kind = JsxClosingFragment.kind;
export class JsxElement extends PrimaryExpression implements qt.JsxElement {
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
    tagName: Expression,
    props: Expression,
    children: readonly Expression[],
    parentElement: JsxOpeningLikeElement,
    location: TextRange
  ): LeftHandSideExpression {
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
export class JsxExpression extends Expression implements qt.JsxExpression {
  static readonly kind = Syntax.JsxExpression;
  parent: JsxElement | JsxAttributeLike;
  dot3Token?: Token<Syntax.Dot3Token>;
  expression?: Expression;
  createJsxExpression(dot3Token: Dot3Token | undefined, expression: Expression | undefined) {
    super(true);
    this.dot3Token = dot3Token;
    this.expression = expression;
  }
  update(expression: Expression | undefined) {
    return this.expression !== expression ? updateNode(createJsxExpression(this.dot3Token, expression), this) : this;
  }
}
JsxExpression.prototype.kind = JsxExpression.kind;
export class JsxFragment extends PrimaryExpression implements qt.JsxFragment {
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
      ? updateNode(createJsxFragment(openingFragment, children, closingFragment), this)
      : this;
  }
  createExpressionForJsxFragment(
    jsxFactoryEntity: EntityName | undefined,
    reactNamespace: string,
    children: readonly Expression[],
    parentElement: JsxOpeningFragment,
    location: TextRange
  ): LeftHandSideExpression {
    const tagName = createPropertyAccess(createReactNamespace(reactNamespace, parentElement), 'Fragment');
    const argumentsList = [<Expression>tagName];
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
export class JsxOpeningElement extends Expression implements qt.JsxOpeningElement {
  static readonly kind = Syntax.JsxOpeningElement;
  parent: JsxElement;
  tagName: JsxTagNameExpression;
  typeArguments?: Nodes<TypeNode>;
  attributes: JsxAttributes;
  createJsxOpeningElement(tagName: JsxTagNameExpression, typeArguments: readonly TypeNode[] | undefined, attributes: JsxAttributes) {
    super(true);
    this.tagName = tagName;
    this.typeArguments = Nodes.from(typeArguments);
    this.attributes = attributes;
  }
  update(tagName: JsxTagNameExpression, typeArguments: readonly TypeNode[] | undefined, attributes: JsxAttributes) {
    return this.tagName !== tagName || this.typeArguments !== typeArguments || this.attributes !== attributes ? updateNode(createJsxOpeningElement(tagName, typeArguments, attributes), this) : this;
  }
}
JsxOpeningElement.prototype.kind = JsxOpeningElement.kind;
export class JsxOpeningFragment extends Expression implements qt.JsxOpeningFragment {
  static readonly kind = Syntax.JsxOpeningFragment;
  parent: JsxFragment;
  createJsxOpeningFragment() {
    return <JsxOpeningFragment>Node.createSynthesized(Syntax.JsxOpeningFragment);
  }
  createReactNamespace(reactNamespace: string, parent: JsxOpeningLikeElement | JsxOpeningFragment) {
    const react = new Identifier(reactNamespace || 'React');
    react.flags &= ~NodeFlags.Synthesized;
    react.parent = Node.get.parseTreeOf(parent);
    return react;
  }
  createJsxFactoryExpressionFromEntityName(jsxFactory: EntityName, parent: JsxOpeningLikeElement | JsxOpeningFragment): Expression {
    if (Node.is.kind(QualifiedName, jsxFactory)) {
      const left = createJsxFactoryExpressionFromEntityName(jsxFactory.left, parent);
      const right = new Identifier(idText(jsxFactory.right));
      right.escapedText = jsxFactory.right.escapedText;
      return createPropertyAccess(left, right);
    }
    return createReactNamespace(idText(jsxFactory), parent);
  }
  createJsxFactoryExpression(jsxFactoryEntity: EntityName | undefined, reactNamespace: string, parent: JsxOpeningLikeElement | JsxOpeningFragment): Expression {
    return jsxFactoryEntity ? createJsxFactoryExpressionFromEntityName(jsxFactoryEntity, parent) : createPropertyAccess(createReactNamespace(reactNamespace, parent), 'createElement');
  }
}
JsxOpeningFragment.prototype.kind = JsxOpeningFragment.kind;
export class JsxSelfClosingElement extends PrimaryExpression implements qt.JsxSelfClosingElement {
  static readonly kind = Syntax.JsxSelfClosingElement;
  tagName: JsxTagNameExpression;
  typeArguments?: Nodes<TypeNode>;
  attributes: JsxAttributes;
  createJsxSelfClosingElement(tagName: JsxTagNameExpression, typeArguments: readonly TypeNode[] | undefined, attributes: JsxAttributes) {
    super(true);
    this.tagName = tagName;
    this.typeArguments = Nodes.from(typeArguments);
    this.attributes = attributes;
  }
  update(tagName: JsxTagNameExpression, typeArguments: readonly TypeNode[] | undefined, attributes: JsxAttributes) {
    return this.tagName !== tagName || this.typeArguments !== typeArguments || this.attributes !== attributes
      ? updateNode(createJsxSelfClosingElement(tagName, typeArguments, attributes), this)
      : this;
  }
}
JsxSelfClosingElement.prototype.kind = JsxSelfClosingElement.kind;
export class JsxSpreadAttribute extends ObjectLiteralElement implements qt.JsxSpreadAttribute {
  static readonly kind = Syntax.JsxSpreadAttribute;
  parent: JsxAttributes;
  expression: Expression;
  createJsxSpreadAttribute(expression: Expression) {
    super(true);
    this.expression = expression;
  }
  update(expression: Expression) {
    return this.expression !== expression ? updateNode(createJsxSpreadAttribute(expression), this) : this;
  }
}
JsxSpreadAttribute.prototype.kind = JsxSpreadAttribute.kind;
export class JsxText extends LiteralLikeNode implements qt.JsxText {
  static readonly kind = Syntax.JsxText;
  onlyTriviaWhitespaces: boolean;
  parent: JsxElement;
  constructor(t: string, onlyTriviaWhitespaces?: boolean) {
    super(true);
    this.text = t;
    this.onlyTriviaWhitespaces = !!onlyTriviaWhitespaces;
  }
  update(text: string, onlyTriviaWhitespaces?: boolean) {
    return this.text !== text || this.onlyTriviaWhitespaces !== onlyTriviaWhitespaces ? updateNode(JsxText.create(text, onlyTriviaWhitespaces), this) : this;
  }
}
JsxText.prototype.kind = JsxText.kind;
export class KeywordTypeNode extends TypeNode implements qt.KeywordTypeNode {
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
export class LabeledStatement extends Statement implements qt.LabeledStatement {
  //, JSDocContainer {
  static readonly kind = Syntax.LabeledStatement;
  label: Identifier;
  statement: Statement;
  createLabel(label: string | Identifier, statement: Statement) {
    super(true);
    this.label = asName(label);
    this.statement = asEmbeddedStatement(statement);
  }
  update(label: Identifier, statement: Statement) {
    return this.label !== label || this.statement !== statement ? updateNode(createLabel(label, statement), this) : this;
  }
}
LabeledStatement.prototype.kind = LabeledStatement.kind;
export class LiteralTypeNode extends TypeNode implements qt.LiteralTypeNode {
  static readonly kind = Syntax.LiteralType;
  literal: BooleanLiteral | LiteralExpression | PrefixUnaryExpression;
  constructor(l: LiteralTypeNode['literal']) {
    super(true);
    this.literal = l;
  }
  update(l: LiteralTypeNode['literal']) {
    return this.literal !== l ? updateNode(create(l), n) : n;
  }
}
LiteralTypeNode.prototype.kind = LiteralTypeNode.kind;
export class MappedTypeNode extends TypeNode implements qt.MappedTypeNode {
  //, Declaration {
  static readonly kind = Syntax.MappedType;
  readonlyToken?: ReadonlyToken | PlusToken | MinusToken;
  typeParameter: TypeParameterDeclaration;
  questionToken?: QuestionToken | PlusToken | MinusToken;
  type?: TypeNode;
  constructor(r: ReadonlyToken | PlusToken | MinusToken | undefined, p: TypeParameterDeclaration, q?: QuestionToken | PlusToken | MinusToken, t?: TypeNode) {
    super(true);
    this.readonlyToken = r;
    this.typeParameter = p;
    this.questionToken = q;
    this.type = t;
  }
  update(r: ReadonlyToken | PlusToken | MinusToken | undefined, p: TypeParameterDeclaration, q?: QuestionToken | PlusToken | MinusToken, t?: TypeNode) {
    return this.readonlyToken !== r || this.typeParameter !== p || this.questionToken !== q || this.type !== t ? updateNode(create(r, p, q, t), n) : n;
  }
}
MappedTypeNode.prototype.kind = MappedTypeNode.kind;
export class MergeDeclarationMarker extends Statement implements qt.MergeDeclarationMarker {
  static readonly kind: Syntax.MergeDeclarationMarker;
  createMergeDeclarationMarker(original: Node) {
    super(true);
    this.emitNode = {} as EmitNode;
    this.original = original;
  }
}
MergeDeclarationMarker.prototype.kind = MergeDeclarationMarker.kind;
export class MetaProperty extends PrimaryExpression implements qt.MetaProperty {
  static readonly kind = Syntax.MetaProperty;
  keywordToken: Syntax.NewKeyword | Syntax.ImportKeyword;
  name: Identifier;
  createMetaProperty(keywordToken: MetaProperty['keywordToken'], name: Identifier) {
    super(true);
    this.keywordToken = keywordToken;
    this.name = name;
  }
  update(name: Identifier) {
    return this.name !== name ? updateNode(createMetaProperty(this.keywordToken, name), this) : this;
  }
}
MetaProperty.prototype.kind = MetaProperty.kind;
export class MethodDeclaration extends Node implements qt.MethodDeclaration {
  //FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
  static readonly kind = Syntax.MethodDeclaration;
  parent: ClassLikeDeclaration | ObjectLiteralExpression;
  name: PropertyName;
  body?: FunctionBody;
  constructor(
    ds: readonly Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    a: AsteriskToken | undefined,
    p: string | PropertyName,
    q: QuestionToken | undefined,
    ts: readonly TypeParameterDeclaration[] | undefined,
    ps: readonly ParameterDeclaration[],
    t?: TypeNode,
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
    a: AsteriskToken | undefined,
    p: PropertyName,
    q: QuestionToken | undefined,
    ts: readonly TypeParameterDeclaration[] | undefined,
    ps: readonly ParameterDeclaration[],
    t?: TypeNode,
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
      ? updateNode(create(ds, ms, a, p, q, ts, ps, t, b), n)
      : n;
  }
}
MethodDeclaration.prototype.kind = MethodDeclaration.kind;
export class MethodSignature extends Node implements qt.MethodSignature {
  //SignatureDeclarationBase, TypeElement {
  static readonly kind = Syntax.MethodSignature;
  parent: ObjectTypeDeclaration;
  name: PropertyName;
  constructor(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t: TypeNode | undefined, p: string | PropertyName, q?: QuestionToken) {
    const n = SignatureDeclaration.create(Syntax.MethodSignature, ts, ps, t) as MethodSignature;
    this.name = asName(p);
    this.questionToken = q;
  }
  update(ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t: TypeNode | undefined, p: PropertyName, q?: QuestionToken) {
    return this.typeParameters !== ts || this.parameters !== ps || this.type !== t || this.name !== p || this.questionToken !== q ? updateNode(create(ts, ps, t, p, q), n) : n;
  }
}
MethodSignature.prototype.kind = MethodSignature.kind;
export class MissingDeclaration extends DeclarationStatement implements qt.MissingDeclaration {
  static readonly kind = Syntax.MissingDeclaration;
  name?: Identifier;
}
MissingDeclaration.prototype.kind = MissingDeclaration.kind;
export class ModuleBlock extends Node implements qt.ModuleBlock {
  //}, Statement {
  static readonly kind = Syntax.ModuleBlock;
  parent: ModuleDeclaration;
  statements: Nodes<Statement>;
  createModuleBlock(statements: readonly Statement[]) {
    super(true);
    this.statements = new Nodes(statements);
  }
  update(statements: readonly Statement[]) {
    return this.statements !== statements ? updateNode(createModuleBlock(statements), this) : this;
  }
}
ModuleBlock.prototype.kind = ModuleBlock.kind;
export class ModuleDeclaration extends DeclarationStatement implements qt.ModuleDeclaration {
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
      ? updateNode(createModuleDeclaration(decorators, modifiers, name, body, this.flags), this)
      : this;
  }
}
ModuleDeclaration.prototype.kind = ModuleDeclaration.kind;
export class NamedExports extends Node implements qt.NamedExports {
  static readonly kind = Syntax.NamedExports;
  parent: ExportDeclaration;
  elements: Nodes<ExportSpecifier>;
  createNamedExports(elements: readonly ExportSpecifier[]) {
    super(true);
    this.elements = new Nodes(elements);
  }
  update(elements: readonly ExportSpecifier[]) {
    return this.elements !== elements ? updateNode(createNamedExports(elements), this) : this;
  }
}
NamedExports.prototype.kind = NamedExports.kind;
export class NamedImports extends Node implements qt.NamedImports {
  static readonly kind = Syntax.NamedImports;
  parent: ImportClause;
  elements: Nodes<ImportSpecifier>;
  createNamedImports(elements: readonly ImportSpecifier[]): NamedImports {
    super(true);
    this.elements = new Nodes(elements);
  }
  update(elements: readonly ImportSpecifier[]) {
    return this.elements !== elements ? updateNode(createNamedImports(elements), this) : this;
  }
}
NamedImports.prototype.kind = NamedImports.kind;
export class NamedTupleMember extends TypeNode implements qt.NamedTupleMember {
  //, JSDocContainer, Declaration {
  static readonly kind = Syntax.NamedTupleMember;
  dot3Token?: Token<Syntax.Dot3Token>;
  name: Identifier;
  questionToken?: Token<Syntax.QuestionToken>;
  type: TypeNode;
  constructor(d: Token<Syntax.Dot3Token> | undefined, i: Identifier, q: Token<Syntax.QuestionToken> | undefined, t: TypeNode) {
    super(true);
    this.dot3Token = d;
    this.name = i;
    this.questionToken = q;
    this.type = t;
  }
  update(d: Token<Syntax.Dot3Token> | undefined, i: Identifier, q: Token<Syntax.QuestionToken> | undefined, t: TypeNode) {
    return this.dot3Token !== d || this.name !== i || this.questionToken !== q || this.type !== t ? updateNode(create(d, i, q, t), n) : n;
  }
}
NamedTupleMember.prototype.kind = NamedTupleMember.kind;
export class NamespaceExport extends NamedDeclaration implements qt.NamespaceExport {
  static readonly kind = Syntax.NamespaceExport;
  parent: ExportDeclaration;
  name: Identifier;
  createNamespaceExport(name: Identifier): NamespaceExport {
    super(true);
    this.name = name;
  }
  update(name: Identifier) {
    return this.name !== name ? updateNode(createNamespaceExport(name), this) : this;
  }
}
NamespaceExport.prototype.kind = NamespaceExport.kind;
export class NamespaceExportDeclaration extends DeclarationStatement implements qt.NamespaceExportDeclaration {
  static readonly kind = Syntax.NamespaceExportDeclaration;
  name: Identifier;
  createNamespaceExportDeclaration(name: string | Identifier) {
    super(true);
    this.name = asName(name);
  }
  update(name: Identifier) {
    return this.name !== name ? updateNode(createNamespaceExportDeclaration(name), this) : this;
  }
}
NamespaceExportDeclaration.prototype.kind = NamespaceExportDeclaration.kind;
export class NamespaceImport extends NamedDeclaration implements qt.NamespaceImport {
  static readonly kind = Syntax.NamespaceImport;
  parent: ImportClause;
  name: Identifier;
  createNamespaceImport(name: Identifier): NamespaceImport {
    super(true);
    this.name = name;
  }
  update(name: Identifier) {
    return this.name !== name ? updateNode(createNamespaceImport(name), this) : this;
  }
}
NamespaceImport.prototype.kind = NamespaceImport.kind;
export class NewExpression extends PrimaryExpression implements qt.NewExpression {
  //}, Declaration {
  static readonly kind = Syntax.NewExpression;
  expression: LeftHandSideExpression;
  typeArguments?: Nodes<TypeNode>;
  arguments?: Nodes<Expression>;
  createNew(expression: Expression, typeArguments: readonly TypeNode[] | undefined, argumentsArray: readonly Expression[] | undefined) {
    super(true);
    this.expression = parenthesizeForNew(expression);
    this.typeArguments = Nodes.from(typeArguments);
    this.arguments = argumentsArray ? parenthesize.listElements(new Nodes(argumentsArray)) : undefined;
  }
  update(expression: Expression, typeArguments: readonly TypeNode[] | undefined, argumentsArray: readonly Expression[] | undefined) {
    return this.expression !== expression || this.typeArguments !== typeArguments || this.arguments !== argumentsArray ? updateNode(createNew(expression, typeArguments, argumentsArray), this) : this;
  }
}
NewExpression.prototype.kind = NewExpression.kind;
qb.addMixins(NewExpression, [Declaration]);
export class NonNullChain extends Node implements qt.NonNullChain {
  createNonNullChain(expression: Expression) {
    super(true);
    this.flags |= NodeFlags.OptionalChain;
    this.expression = parenthesize.forAccess(expression);
  }
  update(expression: Expression) {
    assert(!!(this.flags & NodeFlags.OptionalChain), 'Cannot update a NonNullExpression using updateNonNullChain. Use updateNonNullExpression instead.');
    return this.expression !== expression ? updateNode(createNonNullChain(expression), this) : this;
  }
}
NonNullChain.prototype.kind = NonNullChain.kind;
export class NonNullExpression extends LeftHandSideExpression implements qt.NonNullExpression {
  static readonly kind = Syntax.NonNullExpression;
  expression: Expression;
  constructor(e: Expression) {
    super(true);
    this.expression = parenthesize.forAccess(e);
  }
  update(e: Expression) {
    if (Node.is.nonNullChain(this)) return this.update(e);
    return this.expression !== e ? new NonNullExpression(e).updateFrom(this) : this;
  }
}
NonNullExpression.prototype.kind = NonNullExpression.kind;
export class NoSubstitutionLiteral extends LiteralExpression implements qt.NoSubstitutionLiteral {
  //, TemplateLiteralLikeNode, Declaration {
  static readonly kind = Syntax.NoSubstitutionLiteral;
  templateFlags?: TokenFlags;
  constructor(t: string, raw?: string) {
    return Node.createTemplateLiteralLike(Syntax.NoSubstitutionLiteral, t, raw) as NoSubstitutionLiteral;
  }
}
NoSubstitutionLiteral.prototype.kind = NoSubstitutionLiteral.kind;
export class NotEmittedStatement extends Statement implements qt.NotEmittedStatement {
  static readonly kind = Syntax.NotEmittedStatement;
  createNotEmittedStatement(original: Node) {
    super(true);
    this.original = original;
    setRange(this, original);
  }
}
NotEmittedStatement.prototype.kind = NotEmittedStatement.kind;
export class NumericLiteral extends LiteralExpression implements qt.NumericLiteral {
  //, Declaration {
  static readonly kind = Syntax.NumericLiteral;
  numericLiteralFlags: TokenFlags;
  constructor(t: string, fs: TokenFlags = TokenFlags.None) {
    super(true);
    this.text = t;
    this.numericLiteralFlags = fs;
  }
  name(name: string | __String) {
    return (+name).toString() === name;
  }
}
NumericLiteral.prototype.kind = NumericLiteral.kind;
export class ObjectBindingPattern extends Node implements qt.ObjectBindingPattern {
  static readonly kind = Syntax.ObjectBindingPattern;
  parent: VariableDeclaration | ParameterDeclaration | BindingElement;
  elements: Nodes<BindingElement>;
  constructor(es: readonly BindingElement[]) {
    super(true);
    this.elements = new Nodes(es);
  }
  update(es: readonly BindingElement[]) {
    return this.elements !== es ? updateNode(create(es), n) : n;
  }
}
ObjectBindingPattern.prototype.kind = ObjectBindingPattern.kind;
export class ObjectLiteralExpression extends ObjectLiteralExpressionBase<ObjectLiteralElementLike> implements qt.ObjectLiteralExpression {
  static readonly kind = Syntax.ObjectLiteralExpression;
  multiLine?: boolean;
  createObjectLiteral(properties?: readonly ObjectLiteralElementLike[], multiLine?: boolean) {
    super(true);
    this.properties = new Nodes(properties);
    if (multiLine) this.multiLine = true;
  }
  update(properties: readonly ObjectLiteralElementLike[]) {
    return this.properties !== properties ? updateNode(createObjectLiteral(properties, this.multiLine), this) : this;
  }
}
ObjectLiteralExpression.prototype.kind = ObjectLiteralExpression.kind;
export class OmittedExpression extends Expression implements qt.OmittedExpression {
  static readonly kind = Syntax.OmittedExpression;
  createOmittedExpression() {
    return <OmittedExpression>Node.createSynthesized(Syntax.OmittedExpression);
  }
}
OmittedExpression.prototype.kind = OmittedExpression.kind;
export class OptionalTypeNode extends TypeNode implements qt.OptionalTypeNode {
  static readonly kind = Syntax.OptionalType;
  type: TypeNode;
  constructor(t: TypeNode) {
    super(true);
    this.type = parenthesize.arrayTypeMember(t);
  }
  update(t: TypeNode): OptionalTypeNode {
    return this.type !== t ? updateNode(create(t), n) : n;
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
  export function skipOuterExpressions(this: Expression, kinds?: OuterExpressionKinds): Expression;
  export function skipOuterExpressions(this: Node, kinds?: OuterExpressionKinds): Node;
  export function skipOuterExpressions(this: Node, kinds = OuterExpressionKinds.All) {
    while (isOuterExpression(this, kinds)) {
      this = this.expression;
    }
    return this;
  }
  export function skipAssertions(this: Expression): Expression;
  export function skipAssertions(this: Node): Node;
  export function skipAssertions(this: Node): Node {
    return skipOuterExpressions(this, OuterExpressionKinds.Assertions);
  }
  export function updateOuterExpression(o: OuterExpression, e: Expression) {
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
  export function isIgnorableParen(this: Expression) {
    return (
      this.kind === Syntax.ParenthesizedExpression &&
      isSynthesized(this) &&
      isSynthesized(getSourceMapRange(this)) &&
      isSynthesized(getCommentRange(this)) &&
      !some(getSyntheticLeadingComments(this)) &&
      !some(getSyntheticTrailingComments(this))
    );
  }
  export function recreateOuterExpressions(outerExpression: Expression | undefined, innerExpression: Expression, kinds = OuterExpressionKinds.All): Expression {
    if (outerExpression && isOuterExpression(outerExpression, kinds) && !isIgnorableParen(outerExpression))
      return outerExpression.update(recreateOuterExpressions(outerExpression.expression, innerExpression));
    return innerExpression;
  }
}
export class ParameterDeclaration extends NamedDeclaration implements qt.ParameterDeclaration {
  //}, JSDocContainer {
  static readonly kind = Syntax.Parameter;
  parent: SignatureDeclaration;
  dot3Token?: Dot3Token;
  name: BindingName;
  questionToken?: QuestionToken;
  type?: TypeNode;
  initializer?: Expression;
  createParameter(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    dot3Token: Dot3Token | undefined,
    name: string | BindingName,
    questionToken?: QuestionToken,
    type?: TypeNode,
    initializer?: Expression
  ) {
    super(true);
    this.decorators = Nodes.from(decorators);
    this.modifiers = Nodes.from(modifiers);
    this.dot3Token = dot3Token;
    this.name = asName(name);
    this.questionToken = questionToken;
    this.type = type;
    this.initializer = initializer ? parenthesizeExpressionForList(initializer) : undefined;
  }
  updateParameter(
    this: ParameterDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    dot3Token: Dot3Token | undefined,
    name: string | BindingName,
    questionToken: QuestionToken | undefined,
    type: TypeNode | undefined,
    initializer: Expression | undefined
  ) {
    return this.decorators !== decorators ||
      this.modifiers !== modifiers ||
      this.dot3Token !== dot3Token ||
      this.name !== name ||
      this.questionToken !== questionToken ||
      this.type !== type ||
      this.initializer !== initializer
      ? updateNode(createParameter(decorators, modifiers, dot3Token, name, questionToken, type, initializer), this)
      : this;
  }
}
ParameterDeclaration.prototype.kind = ParameterDeclaration.kind;
export class ParenthesizedExpression extends PrimaryExpression implements qt.ParenthesizedExpression {
  //}, JSDocContainer {
  static readonly kind = Syntax.ParenthesizedExpression;
  expression: Expression;
  createParen(expression: Expression) {
    super(true);
    this.expression = expression;
  }
  update(expression: Expression) {
    return this.expression !== expression ? updateNode(createParen(expression), this) : this;
  }
}
ParenthesizedExpression.prototype.kind = ParenthesizedExpression.kind;
export class ParenthesizedTypeNode extends TypeNode implements qt.ParenthesizedTypeNode {
  static readonly kind = Syntax.ParenthesizedType;
  type: TypeNode;
  constructor(t: TypeNode) {
    super(true);
    this.type = t;
  }
  update(t: TypeNode) {
    return this.type !== t ? updateNode(create(t), n) : n;
  }
}
ParenthesizedTypeNode.prototype.kind = ParenthesizedTypeNode.kind;
export class PartiallyEmittedExpression extends LeftHandSideExpression implements qt.PartiallyEmittedExpression {
  static readonly kind = Syntax.PartiallyEmittedExpression;
  expression: Expression;
  constructor(e: Expression, original?: Node) {
    super(true);
    this.expression = e;
    this.original = original;
    setRange(this, original);
  }
  update(e: Expression) {
    return this.expression !== e ? new PartiallyEmittedExpression(e, this.original).updateFrom(this) : this;
  }
}
PartiallyEmittedExpression.prototype.kind = PartiallyEmittedExpression.kind;
export class PostfixUnaryExpression extends UpdateExpression implements qt.PostfixUnaryExpression {
  static readonly kind = Syntax.PostfixUnaryExpression;
  operand: LeftHandSideExpression;
  operator: PostfixUnaryOperator;
  static increment(e: Expression) {
    return new PostfixUnaryExpression(e, Syntax.Plus2Token);
  }
  constructor(e: Expression, o: PostfixUnaryOperator) {
    super(true);
    this.operand = parenthesize.postfixOperand(e);
    this.operator = o;
  }
  update(e: Expression) {
    return this.operand !== e ? new PostfixUnaryExpression(e, this.operator).updateFrom(this) : this;
  }
}
PostfixUnaryExpression.prototype.kind = PostfixUnaryExpression.kind;
export class PrefixUnaryExpression extends UpdateExpression implements qt.PrefixUnaryExpression {
  static readonly kind = Syntax.PrefixUnaryExpression;
  operator: PrefixUnaryOperator;
  operand: UnaryExpression;
  static logicalNot(e: Expression) {
    return new PrefixUnaryExpression(Syntax.ExclamationToken, operand);
  }
  constructor(o: PrefixUnaryOperator, e: Expression) {
    super(true);
    this.operator = o;
    this.operand = parenthesize.prefixOperand(e);
  }
  update(e: Expression) {
    return this.operand !== e ? new PrefixUnaryExpression(this.operator, e).updateFrom(this) : this;
  }
}
PrefixUnaryExpression.prototype.kind = PrefixUnaryExpression.kind;
export class PrivateIdentifier extends TokenOrIdentifier implements qt.PrivateIdentifier {
  static readonly kind = Syntax.PrivateIdentifier;
  escapedText!: __String;
  constructor(t: string) {
    super(PrivateIdentifier.kind);
    if (t[0] !== '#') qb.fail('First character of private identifier must be #: ' + t);
    this.escapedText = syntax.get.escUnderscores(t);
  }
  get text(): string {
    return idText(this);
  }
}
PrivateIdentifier.prototype.kind = PrivateIdentifier.kind;
export class PropertyAccessChain extends Node implements qt.PropertyAccessChain {
  createPropertyAccessChain(expression: Expression, questionDotToken: QuestionDotToken | undefined, name: string | Identifier) {
    super(true);
    this.flags |= NodeFlags.OptionalChain;
    this.expression = parenthesize.forAccess(expression);
    this.questionDotToken = questionDotToken;
    this.name = asName(name);
    setEmitFlags(this, EmitFlags.NoIndentation);
  }
  update(expression: Expression, questionDotToken: QuestionDotToken | undefined, name: Identifier) {
    assert(!!(this.flags & NodeFlags.OptionalChain), 'Cannot update a PropertyAccessExpression using updatePropertyAccessChain. Use updatePropertyAccess instead.');
    return this.expression !== expression || this.questionDotToken !== questionDotToken || this.name !== name
      ? updateNode(setEmitFlags(createPropertyAccessChain(expression, questionDotToken, name), Node.get.emitFlags(this)), this)
      : this;
  }
}
PropertyAccessChain.prototype.kind = PropertyAccessChain.kind;
export class PropertyAccessExpression extends MemberExpression implements qt.PropertyAccessExpression {
  //}, NamedDeclaration {
  static readonly kind = Syntax.PropertyAccessExpression;
  expression: LeftHandSideExpression;
  questionDotToken?: QuestionDotToken;
  name: Identifier | PrivateIdentifier;
  createPropertyAccess(expression: Expression, name: string | Identifier | PrivateIdentifier) {
    super(true);
    this.expression = parenthesize.forAccess(expression);
    this.name = asName(name);
    setEmitFlags(this, EmitFlags.NoIndentation);
  }
  update(expression: Expression, name: Identifier | PrivateIdentifier) {
    if (Node.is.propertyAccessChain(this)) return this.update(expression, this.questionDotToken, cast(name, isIdentifier));
    return this.expression !== expression || this.name !== name ? updateNode(setEmitFlags(createPropertyAccess(expression, name), Node.get.emitFlags(this)), this) : this;
  }
}
PropertyAccessExpression.prototype.kind = PropertyAccessExpression.kind;
export class PropertyAssignment extends ObjectLiteralElement implements qt.PropertyAssignment {
  //}, JSDocContainer {
  static readonly kind = Syntax.PropertyAssignment;
  parent: ObjectLiteralExpression;
  name: PropertyName;
  questionToken?: QuestionToken;
  initializer: Expression;
  createPropertyAssignment(name: string | PropertyName, initializer: Expression) {
    super(true);
    this.name = asName(name);
    this.questionToken = undefined;
    this.initializer = parenthesizeExpressionForList(initializer);
  }
  update(name: PropertyName, initializer: Expression) {
    return this.name !== name || this.initializer !== initializer ? updateNode(createPropertyAssignment(name, initializer), this) : this;
  }
}
PropertyAssignment.prototype.kind = PropertyAssignment.kind;
export class PropertyDeclaration extends ClassElement implements qt.PropertyDeclaration {
  //}, JSDocContainer {
  static readonly kind = Syntax.PropertyDeclaration;
  parent: ClassLikeDeclaration;
  name: PropertyName;
  questionToken?: QuestionToken;
  exclamationToken?: ExclamationToken;
  type?: TypeNode;
  initializer?: Expression;
  constructor(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | PropertyName, q?: QuestionToken | ExclamationToken, t?: TypeNode, i?: Expression) {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(p);
    this.questionToken = q !== undefined && q.kind === Syntax.QuestionToken ? q : undefined;
    this.exclamationToken = q !== undefined && q.kind === Syntax.ExclamationToken ? q : undefined;
    this.type = t;
    this.initializer = i;
  }
  update(
    n: PropertyDeclaration,
    ds: readonly Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    p: string | PropertyName,
    q?: QuestionToken | ExclamationToken,
    t?: TypeNode,
    i?: Expression
  ) {
    return this.decorators !== ds ||
      this.modifiers !== ms ||
      this.name !== p ||
      this.questionToken !== (q !== undefined && q.kind === Syntax.QuestionToken ? q : undefined) ||
      this.exclamationToken !== (q !== undefined && q.kind === Syntax.ExclamationToken ? q : undefined) ||
      this.type !== t ||
      this.initializer !== i
      ? updateNode(create(ds, ms, p, q, t, i), n)
      : n;
  }
}
PropertyDeclaration.prototype.kind = PropertyDeclaration.kind;
export class PropertySignature extends TypeElement implements qt.PropertySignature {
  //}, JSDocContainer {
  static readonly kind = Syntax.PropertySignature;
  name: PropertyName;
  questionToken?: QuestionToken;
  type?: TypeNode;
  initializer?: Expression;
  constructor(ms: readonly Modifier[] | undefined, p: PropertyName | string, q?: QuestionToken, t?: TypeNode, i?: Expression) {
    super(true);
    this.modifiers = Nodes.from(ms);
    this.name = asName(p);
    this.questionToken = q;
    this.type = t;
    this.initializer = i;
  }
  update(ms: readonly Modifier[] | undefined, p: PropertyName, q?: QuestionToken, t?: TypeNode, i?: Expression) {
    return this.modifiers !== ms || this.name !== p || this.questionToken !== q || this.type !== t || this.initializer !== i ? updateNode(create(ms, p, q, t, i), n) : n;
  }
}
PropertySignature.prototype.kind = PropertySignature.kind;
export class QualifiedName extends Node implements qt.QualifiedName {
  static readonly kind = Syntax.QualifiedName;
  left: EntityName;
  right: Identifier;
  jsdocDotPos?: number;
  constructor(left: EntityName, right: string | Identifier) {
    super(true);
    this.left = left;
    this.right = asName(right);
  }
  update(left: EntityName, right: Identifier) {
    return this.left !== left || this.right !== right ? updateNode(create(left, right), n) : n;
  }
}
QualifiedName.prototype.kind = QualifiedName.kind;
export class RegexLiteral extends LiteralExpression implements qt.RegexLiteral {
  static readonly kind = Syntax.RegexLiteral;
  constructor(t: string) {
    super(true);
    this.text = t;
  }
}
RegexLiteral.prototype.kind = RegexLiteral.kind;
export class RestTypeNode extends TypeNode implements qt.RestTypeNode {
  static readonly kind = Syntax.RestType;
  type: TypeNode;
  constructor(t: TypeNode) {
    super(true);
    this.type = t;
  }
  update(t: TypeNode): RestTypeNode {
    return this.type !== t ? updateNode(create(t), n) : n;
  }
}
RestTypeNode.prototype.kind = RestTypeNode.kind;
export class ReturnStatement extends Statement implements qt.ReturnStatement {
  static readonly kind = Syntax.ReturnStatement;
  expression?: Expression;
  createReturn(expression?: Expression): ReturnStatement {
    super(true);
    this.expression = expression;
  }
  update(expression: Expression | undefined) {
    return this.expression !== expression ? updateNode(createReturn(expression), this) : this;
  }
}
ReturnStatement.prototype.kind = ReturnStatement.kind;
export class SemicolonClassElement extends ClassElement implements qt.SemicolonClassElement {
  static readonly kind = Syntax.SemicolonClassElement;
  parent: ClassLikeDeclaration;
  createSemicolonClassElement() {
    return <SemicolonClassElement>Node.createSynthesized(Syntax.SemicolonClassElement);
  }
}
SemicolonClassElement.prototype.kind = SemicolonClassElement.kind;
export class SetAccessorDeclaration extends FunctionLikeDeclarationBase implements qt.SetAccessorDeclaration {
  //}, ClassElement, ObjectLiteralElement, JSDocContainer {
  static readonly kind = Syntax.SetAccessor;
  parent: ClassLikeDeclaration | ObjectLiteralExpression;
  name: PropertyName;
  body?: FunctionBody;
  constructor(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | PropertyName, ps: readonly ParameterDeclaration[], b?: Block) {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(p);
    this.typeParameters = undefined;
    this.parameters = new Nodes(ps);
    this.body = b;
  }
  update(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: PropertyName, ps: readonly ParameterDeclaration[], b?: Block) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== p || this.parameters !== ps || this.body !== b ? updateNode(create(ds, ms, p, ps, b), n) : n;
  }
}
SetAccessorDeclaration.prototype.kind = SetAccessorDeclaration.kind;
export class ShorthandPropertyAssignment extends ObjectLiteralElement implements qt.ShorthandPropertyAssignment {
  //}, JSDocContainer {
  static readonly kind = Syntax.ShorthandPropertyAssignment;
  parent: ObjectLiteralExpression;
  name: Identifier;
  questionToken?: QuestionToken;
  exclamationToken?: ExclamationToken;
  equalsToken?: Token<Syntax.EqualsToken>;
  objectAssignmentInitializer?: Expression;
  createShorthandPropertyAssignment(name: string | Identifier, objectAssignmentInitializer?: Expression) {
    super(true);
    this.name = asName(name);
    this.objectAssignmentInitializer = objectAssignmentInitializer !== undefined ? parenthesizeExpressionForList(objectAssignmentInitializer) : undefined;
  }
  update(name: Identifier, objectAssignmentInitializer: Expression | undefined) {
    return this.name !== name || this.objectAssignmentInitializer !== objectAssignmentInitializer ? updateNode(createShorthandPropertyAssignment(name, objectAssignmentInitializer), this) : this;
  }
}
ShorthandPropertyAssignment.prototype.kind = ShorthandPropertyAssignment.kind;
export namespace SignatureDeclaration {
  export function create(k: Syntax, ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode, ta?: readonly TypeNode[]) {
    super(true);
    this.typeParameters = Nodes.from(ts);
    this.parameters = Nodes.from(ps);
    this.type = t;
    this.typeArguments = Nodes.from(ta);
  }
  export function update<T extends SignatureDeclaration>(n: T, ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: TypeNode): T {
    return this.typeParameters !== ts || this.parameters !== ps || this.type !== t ? updateNode(create(this.kind, ts, ps, t) as T, n) : n;
  }
}
export class SpreadElement extends Expression implements qt.SpreadElement {
  static readonly kind = Syntax.SpreadElement;
  parent: ArrayLiteralExpression | CallExpression | NewExpression;
  expression: Expression;
  createSpread(expression: Expression) {
    super(true);
    this.expression = parenthesizeExpressionForList(expression);
  }
  update(expression: Expression) {
    return this.expression !== expression ? updateNode(createSpread(expression), this) : this;
  }
}
SpreadElement.prototype.kind = SpreadElement.kind;
export class SpreadAssignment extends ObjectLiteralElement implements qt.SpreadAssignment {
  //}, JSDocContainer {
  static readonly kind = Syntax.SpreadAssignment;
  parent: ObjectLiteralExpression;
  expression: Expression;
  createSpreadAssignment(expression: Expression) {
    super(true);
    this.expression = parenthesizeExpressionForList(expression);
  }
  update(expression: Expression) {
    return this.expression !== expression ? updateNode(createSpreadAssignment(expression), this) : this;
  }
}
SpreadAssignment.prototype.kind = SpreadAssignment.kind;
export class StringLiteral extends LiteralExpression implements qt.StringLiteral {
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
  orNumberLiteralExpression(e: Expression) {
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
export class SwitchStatement extends Statement implements qt.SwitchStatement {
  static readonly kind = Syntax.SwitchStatement;
  expression: Expression;
  caseBlock: CaseBlock;
  possiblyExhaustive?: boolean;
  createSwitch(expression: Expression, caseBlock: CaseBlock): SwitchStatement {
    super(true);
    this.expression = parenthesizeExpressionForList(expression);
    this.caseBlock = caseBlock;
  }
  update(expression: Expression, caseBlock: CaseBlock) {
    return this.expression !== expression || this.caseBlock !== caseBlock ? updateNode(createSwitch(expression, caseBlock), this) : this;
  }
}
SwitchStatement.prototype.kind = SwitchStatement.kind;
export class SyntaxList extends Node implements qt.SyntaxList {
  static readonly kind = Syntax.SyntaxList;
  _children: Node[];
}
SyntaxList.prototype.kind = SyntaxList.kind;
export class SyntheticReferenceExpression extends LeftHandSideExpression implements qt.SyntheticReferenceExpression {
  static readonly kind = Syntax.SyntheticReferenceExpression;
  expression: Expression;
  thisArg: Expression;
  constructor(e: Expression, thisArg: Expression) {
    super(true);
    this.expression = e;
    this.thisArg = thisArg;
  }
  update(e: Expression, thisArg: Expression) {
    return this.expression !== e || this.thisArg !== thisArg ? new SyntheticReferenceExpression(e, thisArg).updateFrom(this) : this;
  }
}
SyntheticReferenceExpression.prototype.kind = SyntheticReferenceExpression.kind;
export class TaggedTemplateExpression extends MemberExpression implements qt.TaggedTemplateExpression {
  static readonly kind = Syntax.TaggedTemplateExpression;
  tag: LeftHandSideExpression;
  typeArguments?: Nodes<TypeNode>;
  template: TemplateLiteral;
  questionDotToken?: qt.QuestionDotToken;
  createTaggedTemplate(tag: Expression, ts: readonly TypeNode[] | undefined, template: TemplateLiteral);
  createTaggedTemplate(tag: Expression, ts?: readonly TypeNode[] | TemplateLiteral, template?: TemplateLiteral);
  createTaggedTemplate(tag: Expression, ts?: readonly TypeNode[] | TemplateLiteral, template?: TemplateLiteral) {
    super(true);
    this.tag = parenthesize.forAccess(tag);
    if (template) {
      this.typeArguments = Nodes.from(ts as readonly TypeNode[]);
      this.template = template;
    } else {
      this.typeArguments = undefined;
      this.template = ts as TemplateLiteral;
    }
  }
  update(tag: Expression, ts: readonly TypeNode[] | undefined, template: TemplateLiteral): TaggedTemplateExpression;
  update(tag: Expression, ts?: readonly TypeNode[] | TemplateLiteral, template?: TemplateLiteral) {
    return this.tag !== tag || (template ? this.typeArguments !== ts || this.template !== template : this.typeArguments || this.template !== ts)
      ? new createTaggedTemplate(tag, ts, template).updateFrom(this)
      : this;
  }
}
TaggedTemplateExpression.prototype.kind = TaggedTemplateExpression.kind;
export class TemplateExpression extends PrimaryExpression implements qt.TemplateExpression {
  static readonly kind = Syntax.TemplateExpression;
  head: TemplateHead;
  templateSpans: Nodes<TemplateSpan>;
  createTemplateExpression(head: TemplateHead, templateSpans: readonly TemplateSpan[]) {
    super(true);
    this.head = head;
    this.templateSpans = new Nodes(templateSpans);
  }
  update(head: TemplateHead, templateSpans: readonly TemplateSpan[]) {
    return this.head !== head || this.templateSpans !== templateSpans ? updateNode(createTemplateExpression(head, templateSpans), this) : this;
  }
}
TemplateExpression.prototype.kind = TemplateExpression.kind;
export class TemplateHead extends TemplateLiteralLikeNode implements qt.TemplateHead {
  static readonly kind = Syntax.TemplateHead;
  parent: TemplateExpression;
  templateFlags?: TokenFlags;
  constructor(t: string, raw?: string) {
    return Node.createTemplateLiteralLike(Syntax.TemplateHead, t, raw) as TemplateHead;
  }
}
TemplateHead.prototype.kind = TemplateHead.kind;
export class TemplateMiddle extends TemplateLiteralLikeNode implements qt.TemplateMiddle {
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
export class TemplateSpan extends Node implements qt.TemplateSpan {
  static readonly kind = Syntax.TemplateSpan;
  parent: TemplateExpression;
  expression: Expression;
  literal: TemplateMiddle | TemplateTail;
  createTemplateSpan(expression: Expression, literal: TemplateMiddle | TemplateTail) {
    super(true);
    this.expression = expression;
    this.literal = literal;
  }
  update(expression: Expression, literal: TemplateMiddle | TemplateTail) {
    return this.expression !== expression || this.literal !== literal ? updateNode(createTemplateSpan(expression, literal), this) : this;
  }
}
TemplateSpan.prototype.kind = TemplateSpan.kind;
export class TemplateTail extends TemplateLiteralLikeNode implements qt.TemplateTail {
  static readonly kind = Syntax.TemplateTail;
  parent: TemplateSpan;
  templateFlags?: TokenFlags;
  constructor(t: string, raw?: string) {
    return Node.createTemplateLiteralLike(Syntax.TemplateTail, t, raw) as TemplateTail;
  }
}
TemplateTail.prototype.kind = TemplateTail.kind;
export class ThisTypeNode extends TypeNode implements qt.ThisTypeNode {
  static readonly kind = Syntax.ThisType;
  constructor() {
    return Node.createSynthesized(Syntax.ThisType);
  }
}
ThisTypeNode.prototype.kind = ThisTypeNode.kind;
export class ThrowStatement extends Statement implements qt.ThrowStatement {
  static readonly kind = Syntax.ThrowStatement;
  expression?: Expression;
  createThrow(expression: Expression) {
    super(true);
    this.expression = expression;
  }
  update(expression: Expression) {
    return this.expression !== expression ? updateNode(createThrow(expression), this) : this;
  }
}
ThrowStatement.prototype.kind = ThrowStatement.kind;
export class TryStatement extends Statement implements qt.TryStatement {
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
    return this.tryBlock !== tryBlock || this.catchClause !== catchClause || this.finallyBlock !== finallyBlock ? updateNode(createTry(tryBlock, catchClause, finallyBlock), this) : this;
  }
}
TryStatement.prototype.kind = TryStatement.kind;
export class TupleType extends GenericType implements qt.TupleType {
  static readonly kind = Syntax.TupleType;
  minLength: number;
  hasRestElement: boolean;
  readonly: boolean;
  labeledElementDeclarations?: readonly (NamedTupleMember | ParameterDeclaration)[];
  constructor(es: readonly (TypeNode | NamedTupleMember)[]) {
    super(true);
    this.elements = new Nodes(es);
  }
  update(es: readonly (TypeNode | NamedTupleMember)[]) {
    return this.elements !== es ? updateNode(create(es), n) : n;
  }
}
TupleType.prototype.kind = TupleType.kind;
export class TypeAliasDeclaration extends DeclarationStatement implements qt.TypeAliasDeclaration {
  //}, JSDocContainer {
  static readonly kind = Syntax.TypeAliasDeclaration;
  name: Identifier;
  typeParameters?: Nodes<TypeParameterDeclaration>;
  type: TypeNode;
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
      ? updateNode(createTypeAliasDeclaration(decorators, modifiers, name, typeParameters, type), this)
      : this;
  }
}
TypeAliasDeclaration.prototype.kind = TypeAliasDeclaration.kind;
export class TypeAssertion extends UnaryExpression implements qt.TypeAssertion {
  static readonly kind = Syntax.TypeAssertionExpression;
  type: TypeNode;
  expression: UnaryExpression;
  constructor(t: TypeNode, e: Expression) {
    super(true);
    this.type = t;
    this.expression = parenthesize.prefixOperand(e);
  }
  update(t: TypeNode, e: Expression) {
    return this.type !== t || this.expression !== e ? new TypeAssertion(t, e).updateFrom(this) : this;
  }
}
TypeAssertion.prototype.kind = TypeAssertion.kind;
export class TypeLiteralNode extends TypeNode implements qt.TypeLiteralNode {
  //}, Declaration {
  static readonly kind = Syntax.TypeLiteral;
  members: Nodes<TypeElement>;
  constructor(ms: readonly TypeElement[] | undefined) {
    super(true);
    this.members = new Nodes(ms);
  }
  update(ms: Nodes<TypeElement>) {
    return this.members !== ms ? updateNode(create(ms), n) : n;
  }
}
TypeLiteralNode.prototype.kind = TypeLiteralNode.kind;
export class TypeOfExpression extends UnaryExpression implements qt.TypeOfExpression {
  static readonly kind = Syntax.TypeOfExpression;
  expression: UnaryExpression;
  constructor(e: Expression) {
    super(true);
    this.expression = parenthesize.prefixOperand(e);
  }
  update(e: Expression) {
    return this.expression !== e ? new TypeOfExpression(e).updateFrom(this) : this;
  }
}
TypeOfExpression.prototype.kind = TypeOfExpression.kind;
export class TypeOperatorNode extends TypeNode implements qt.TypeOperatorNode {
  static readonly kind = Syntax.TypeOperator;
  operator: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword;
  type: TypeNode;
  constructor(t: TypeNode): TypeOperatorNode;
  constructor(o: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword, t: TypeNode): TypeOperatorNode;
  constructor(o: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword | TypeNode, t?: TypeNode) {
    super(true);
    this.operator = typeof o === 'number' ? o : Syntax.KeyOfKeyword;
    this.type = parenthesizeElementTypeMember(typeof o === 'number' ? t! : o);
  }
  update(t: TypeNode) {
    return this.type !== t ? updateNode(create(this.operator, t), n) : n;
  }
}
TypeOperatorNode.prototype.kind = TypeOperatorNode.kind;
export class TypeParameterDeclaration extends NamedDeclaration implements qt.TypeParameterDeclaration {
  static readonly kind = Syntax.TypeParameter;
  parent: DeclarationWithTypeParameterChildren | InferTypeNode;
  name: Identifier;
  constraint?: TypeNode;
  default?: TypeNode;
  expression?: Expression;
  createTypeParameterDeclaration(name: string | Identifier, constraint?: TypeNode, defaultType?: TypeNode) {
    super(true);
    this.name = asName(name);
    this.constraint = constraint;
    this.default = defaultType;
  }
  update(name: Identifier, constraint: TypeNode | undefined, defaultType: TypeNode | undefined) {
    return this.name !== name || this.constraint !== constraint || this.default !== defaultType ? updateNode(createTypeParameterDeclaration(name, constraint, defaultType), this) : this;
  }
}
TypeParameterDeclaration.prototype.kind = TypeParameterDeclaration.kind;
export class TypePredicateNode extends TypeNode implements qt.TypePredicateNode {
  static readonly kind = Syntax.TypePredicate;
  parent: SignatureDeclaration | JSDocTypeExpression;
  assertsModifier?: AssertsToken;
  parameterName: Identifier | ThisTypeNode;
  type?: TypeNode;
  constructor(p: Identifier | ThisTypeNode | string, t: TypeNode) {
    return createWithModifier(undefined, p, t);
  }
  createWithModifier(a: AssertsToken | undefined, p: Identifier | ThisTypeNode | string, t?: TypeNode) {
    super(true);
    this.assertsModifier = a;
    this.parameterName = asName(p);
    this.type = t;
  }
  update(p: Identifier | ThisTypeNode, t: TypeNode) {
    return updateWithModifier(n, this.assertsModifier, p, t);
  }
  updateWithModifier(n: TypePredicateNode, a: AssertsToken | undefined, p: Identifier | ThisTypeNode, t?: TypeNode) {
    return this.assertsModifier !== a || this.parameterName !== p || this.type !== t ? updateNode(createWithModifier(a, p, t), n) : n;
  }
}
TypePredicateNode.prototype.kind = TypePredicateNode.kind;
export class TypeQueryNode extends TypeNode implements qt.TypeQueryNode {
  static readonly kind = Syntax.TypeQuery;
  exprName: EntityName;
  constructor(e: EntityName) {
    super(true);
    this.exprName = e;
  }
  update(e: EntityName) {
    return this.exprName !== e ? updateNode(create(e), n) : n;
  }
}
TypeQueryNode.prototype.kind = TypeQueryNode.kind;
export class TypeReferenceNode extends NodeWithTypeArguments implements qt.TypeReferenceNode {
  static readonly kind = Syntax.TypeReference;
  typeName: EntityName;
  constructor(t: string | EntityName, ts?: readonly TypeNode[]) {
    super(true);
    this.typeName = asName(t);
    this.typeArguments = ts && parenthesizeTypeParameters(ts);
  }
  update(t: EntityName, ts?: Nodes<TypeNode>) {
    return this.typeName !== t || this.typeArguments !== ts ? updateNode(create(t, ts), n) : n;
  }
}
TypeReferenceNode.prototype.kind = TypeReferenceNode.kind;
export class UnionTypeNode extends TypeNode implements qt.UnionTypeNode {
  static readonly kind = Syntax.UnionType;
  types: Nodes<TypeNode>;
  constructor(ts: readonly TypeNode[]) {
    return orIntersectionCreate(Syntax.UnionType, ts) as UnionTypeNode;
  }
  orIntersectionCreate(k: Syntax.UnionType | Syntax.IntersectionType, ts: readonly TypeNode[]) {
    super(true);
    this.types = parenthesizeElementTypeMembers(ts);
  }
  update(ts: Nodes<TypeNode>) {
    return orIntersectionUpdate(n, ts);
  }
  orIntersectionUpdate<T extends UnionOrIntersectionTypeNode>(n: T, ts: Nodes<TypeNode>): T {
    return this.types !== ts ? updateNode(orIntersectionCreate(this.kind, ts) as T, n) : n;
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
        return Debug.assertNever(kind);
    }
  }
}
export class UnparsedPrepend extends UnparsedSection implements qt.UnparsedPrepend {
  static readonly kind = Syntax.UnparsedPrepend;
  data: string;
  parent: UnparsedSource;
  texts: readonly UnparsedTextLike[];
}
UnparsedPrepend.prototype.kind = UnparsedPrepend.kind;
let allUnscopedEmitHelpers: QReadonlyMap<UnscopedEmitHelper> | undefined;
export class UnparsedSource extends Node implements qt.UnparsedSource {
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
    this.lineAndCharOf = (pos) => syntax.get.lineAndCharOf(this, pos);
  }
  createUnparsedSourceFile(text: string): UnparsedSource;
  createUnparsedSourceFile(inputFile: InputFiles, type: 'js' | 'dts', stripInternal?: boolean): UnparsedSource;
  createUnparsedSourceFile(text: string, mapPath: string | undefined, map: string | undefined): UnparsedSource;
  createUnparsedSourceFile(textOrInputFiles: string | InputFiles, mapPathOrType?: string, mapTextOrStripInternal?: string | boolean): UnparsedSource {
    const r = createUnparsedSource();
    let stripInternal: boolean | undefined;
    let bundleFileInfo: BundleFileInfo | undefined;
    if (!isString(textOrInputFiles)) {
      assert(mapPathOrType === 'js' || mapPathOrType === 'dts');
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
        assert(mapTextOrStripInternal === undefined || typeof mapTextOrStripInternal === 'boolean');
        stripInternal = mapTextOrStripInternal;
        bundleFileInfo = mapPathOrType === 'js' ? textOrInputFiles.buildInfo.bundle.js : textOrInputFiles.buildInfo.bundle.dts;
        if (r.oldFileOfCurrentEmit) {
          parseOldFileOfCurrentEmit(r, Debug.checkDefined(bundleFileInfo));
          return r;
        }
      }
    } else {
      r.fileName = '';
      r.text = textOrInputFiles;
      r.sourceMapPath = mapPathOrType;
      r.sourceMapText = mapTextOrStripInternal as string;
    }
    assert(!r.oldFileOfCurrentEmit);
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
          Debug.assertNever(section);
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
    assert(!!this.oldFileOfCurrentEmit);
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
          Debug.assertNever(section);
      }
    }
    this.texts = texts || empty;
    this.helpers = map(bundleFileInfo.sources && bundleFileInfo.sources.helpers, (name) => getAllUnscopedEmitHelpers().get(name)!);
    this.syntheticReferences = syntheticReferences;
    return this;
  }
}
UnparsedSource.prototype.kind = UnparsedSource.kind;
export class UnparsedSyntheticReference extends UnparsedSection implements qt.UnparsedSyntheticReference {
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
export class VariableDeclaration extends NamedDeclaration implements qt.VariableDeclaration {
  static readonly kind = Syntax.VariableDeclaration;
  parent: VariableDeclarationList | CatchClause;
  name: BindingName;
  exclamationToken?: ExclamationToken;
  type?: TypeNode;
  initializer?: Expression;
  createVariableDeclaration(name: string | BindingName, type?: TypeNode, initializer?: Expression) {
    super(true);
    this.name = asName(name);
    this.type = type;
    this.initializer = initializer !== undefined ? parenthesizeExpressionForList(initializer) : undefined;
  }
  update(name: BindingName, type: TypeNode | undefined, initializer: Expression | undefined) {
    return this.name !== name || this.type !== type || this.initializer !== initializer ? updateNode(createVariableDeclaration(name, type, initializer), this) : this;
  }
  createTypeScriptVariableDeclaration(name: string | BindingName, exclaimationToken?: Token<Syntax.ExclamationToken>, type?: TypeNode, initializer?: Expression) {
    super(true);
    this.name = asName(name);
    this.type = type;
    this.initializer = initializer !== undefined ? parenthesizeExpressionForList(initializer) : undefined;
    this.exclamationToken = exclaimationToken;
  }
  updateTypeScriptVariableDeclaration(
    this: VariableDeclaration,
    name: BindingName,
    exclaimationToken: Token<Syntax.ExclamationToken> | undefined,
    type: TypeNode | undefined,
    initializer: Expression | undefined
  ) {
    return this.name !== name || this.type !== type || this.initializer !== initializer || this.exclamationToken !== exclaimationToken
      ? updateNode(createTypeScriptVariableDeclaration(name, exclaimationToken, type, initializer), this)
      : this;
  }
}
VariableDeclaration.prototype.kind = VariableDeclaration.kind;
export class VariableDeclarationList extends Node implements qt.VariableDeclarationList {
  static readonly kind = Syntax.VariableDeclarationList;
  parent: VariableStatement | ForStatement | ForOfStatement | ForInStatement;
  declarations: Nodes<VariableDeclaration>;
  createVariableDeclarationList(declarations: readonly VariableDeclaration[], flags = NodeFlags.None) {
    super(true);
    this.flags |= flags & NodeFlags.BlockScoped;
    this.declarations = new Nodes(declarations);
  }
  update(declarations: readonly VariableDeclaration[]) {
    return this.declarations !== declarations ? updateNode(createVariableDeclarationList(declarations, this.flags), this) : this;
  }
}
VariableDeclarationList.prototype.kind = VariableDeclarationList.kind;
export class VariableStatement extends Statement implements qt.VariableStatement {
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
    return this.modifiers !== modifiers || this.declarationList !== declarationList ? updateNode(createVariableStatement(modifiers, declarationList), this) : this;
  }
}
VariableStatement.prototype.kind = VariableStatement.kind;
export class VoidExpression extends UnaryExpression implements qt.VoidExpression {
  static readonly kind = Syntax.VoidExpression;
  expression: UnaryExpression;
  constructor(e: Expression) {
    super(true);
    this.expression = parenthesize.prefixOperand(e);
  }
  update(e: Expression) {
    return this.expression !== e ? new VoidExpression(e).updateFrom(this) : this;
  }
  static zero() {
    return new VoidExpression(createLiteral(0));
  }
}
VoidExpression.prototype.kind = VoidExpression.kind;
export class WhileStatement extends IterationStatement implements qt.WhileStatement {
  static readonly kind = Syntax.WhileStatement;
  expression: Expression;
  createWhile(expression: Expression, statement: Statement) {
    super(true);
    this.expression = expression;
    this.statement = asEmbeddedStatement(statement);
  }
  update(expression: Expression, statement: Statement) {
    return this.expression !== expression || this.statement !== statement ? updateNode(createWhile(expression, statement), this) : this;
  }
}
WhileStatement.prototype.kind = WhileStatement.kind;
export class WithStatement extends Statement implements qt.WithStatement {
  static readonly kind = Syntax.WithStatement;
  expression: Expression;
  statement: Statement;
  createWith(expression: Expression, statement: Statement) {
    super(true);
    this.expression = expression;
    this.statement = asEmbeddedStatement(statement);
  }
  update(expression: Expression, statement: Statement) {
    return this.expression !== expression || this.statement !== statement ? updateNode(createWith(expression, statement), this) : this;
  }
}
WithStatement.prototype.kind = WithStatement.kind;
export class YieldExpression extends Expression implements qt.YieldExpression {
  static readonly kind = Syntax.YieldExpression;
  asteriskToken?: AsteriskToken;
  expression?: Expression;
  createYield(expression?: Expression): YieldExpression;
  createYield(asteriskToken: AsteriskToken | undefined, expression: Expression): YieldExpression;
  createYield(asteriskTokenOrExpression?: AsteriskToken | undefined | Expression, expression?: Expression) {
    const asteriskToken = asteriskTokenOrExpression && asteriskTokenOrExpression.kind === Syntax.AsteriskToken ? <AsteriskToken>asteriskTokenOrExpression : undefined;
    expression = asteriskTokenOrExpression && asteriskTokenOrExpression.kind !== Syntax.AsteriskToken ? asteriskTokenOrExpression : expression;
    super(true);
    this.asteriskToken = asteriskToken;
    this.expression = expression && parenthesizeExpressionForList(expression);
  }
  update(asteriskToken: AsteriskToken | undefined, expression: Expression) {
    return this.expression !== expression || this.asteriskToken !== asteriskToken ? updateNode(createYield(asteriskToken, expression), this) : this;
  }
}
YieldExpression.prototype.kind = YieldExpression.kind;
export namespace parenthesize {
  interface BinaryPlusExpression extends BinaryExpression {
    cachedLiteralKind: Syntax;
  }
  function getLiteralKindOfBinaryPlusOperand(this: Expression): Syntax {
    this = skipPartiallyEmittedExpressions(this);
    if (syntax.is.literal(this.kind)) return this.kind;
    if (this.kind === Syntax.BinaryExpression && (<BinaryExpression>this).operatorToken.kind === Syntax.PlusToken) {
      if ((<BinaryPlusExpression>this).cachedLiteralKind !== undefined) return (<BinaryPlusExpression>this).cachedLiteralKind;
      const leftKind = getLiteralKindOfBinaryPlusOperand((<BinaryExpression>this).left);
      const literalKind = syntax.is.literal(leftKind) && leftKind === getLiteralKindOfBinaryPlusOperand((<BinaryExpression>this).right) ? leftKind : Syntax.Unknown;
      (<BinaryPlusExpression>this).cachedLiteralKind = literalKind;
      return literalKind;
    }
    return Syntax.Unknown;
  }
  export function parenthesizeBinaryOperand(binaryOperator: Syntax, operand: Expression, isLeftSideOfBinary: boolean, leftOperand?: Expression) {
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
    function binaryOperandNeedsParentheses(binaryOperator: Syntax, operand: Expression, isLeftSideOfBinary: boolean, leftOperand: Expression | undefined) {
      const binaryOperatorPrecedence = syntax.get.operatorPrecedence(Syntax.BinaryExpression, binaryOperator);
      const binaryOperatorAssociativity = syntax.get.operatorAssociativity(Syntax.BinaryExpression, binaryOperator);
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
                if (syntax.is.literal(leftKind) && leftKind === getLiteralKindOfBinaryPlusOperand(emittedOperand)) return false;
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
    return binaryOperandNeedsParentheses(binaryOperator, operand, isLeftSideOfBinary, leftOperand) ? createParen(operand) : operand;
  }
  export function parenthesizeForConditionalHead(condition: Expression) {
    const conditionalPrecedence = syntax.get.operatorPrecedence(Syntax.ConditionalExpression, Syntax.QuestionToken);
    const emittedCondition = skipPartiallyEmittedExpressions(condition);
    const conditionPrecedence = getExpressionPrecedence(emittedCondition);
    if (compareValues(conditionPrecedence, conditionalPrecedence) !== Comparison.GreaterThan) return createParen(condition);
    return condition;
  }
  export function parenthesizeSubexpressionOfConditionalExpression(e: Expression): Expression {
    const emittedExpression = skipPartiallyEmittedExpressions(e);
    return isCommaSequence(emittedExpression) ? createParen(e) : e;
  }
  export function forAccess(e: Expression): LeftHandSideExpression {
    const e2 = skipPartiallyEmittedExpressions(e);
    if (Node.is.leftHandSideExpression(e2) && (e2.kind !== Syntax.NewExpression || (<NewExpression>e2).arguments)) return <LeftHandSideExpression>e;
    return setRange(createParen(e), e);
  }
  export function postfixOperand(e: Expression) {
    return Node.is.leftHandSideExpression(e) ? e : setRange(createParen(e), e);
  }
  export function prefixOperand(e: Expression) {
    return Node.is.unaryExpression(e) ? e : setRange(createParen(e), e);
  }
  export function listElements(es: Nodes<Expression>) {
    let r: Expression[] | undefined;
    for (let i = 0; i < es.length; i++) {
      const e = parenthesizeExpressionForList(es[i]);
      if (r || e !== es[i]) {
        if (!r) r = es.slice(0, i);
        r.push(e);
      }
    }
    return r ? setRange(new Nodes(r, es.trailingComma), es) : es;
  }
  export function parenthesizeExpressionForList(expression: Expression) {
    const emittedExpression = skipPartiallyEmittedExpressions(expression);
    const expressionPrecedence = getExpressionPrecedence(emittedExpression);
    const commaPrecedence = syntax.get.operatorPrecedence(Syntax.BinaryExpression, Syntax.CommaToken);
    return expressionPrecedence > commaPrecedence ? expression : setRange(createParen(expression), expression);
  }
  export function parenthesizeExpressionForExpressionStatement(expression: Expression) {
    const emittedExpression = skipPartiallyEmittedExpressions(expression);
    if (Node.is.kind(CallExpression, emittedExpression)) {
      const callee = emittedExpression.expression;
      const kind = skipPartiallyEmittedExpressions(callee).kind;
      if (kind === Syntax.FunctionExpression || kind === Syntax.ArrowFunction) {
        const mutableCall = getMutableClone(emittedExpression);
        mutableCall.expression = setRange(createParen(callee), callee);
        return recreateOuterExpressions(expression, mutableCall, OuterExpressionKinds.PartiallyEmittedExpressions);
      }
    }
    const leftmostExpressionKind = getLeftmostExpression(emittedExpression, false).kind;
    if (leftmostExpressionKind === Syntax.ObjectLiteralExpression || leftmostExpressionKind === Syntax.FunctionExpression) return setRange(createParen(expression), expression);
    return expression;
  }
  export function conditionalTypeMember(n: TypeNode) {
    return n.kind === Syntax.ConditionalType ? ParenthesizedTypeNode.create(n) : n;
  }
  export function elementTypeMember(n: TypeNode) {
    switch (n.kind) {
      case Syntax.UnionType:
      case Syntax.IntersectionType:
      case Syntax.FunctionType:
      case Syntax.ConstructorType:
        return ParenthesizedTypeNode.create(n);
    }
    return conditionalTypeMember(n);
  }
  export function arrayTypeMember(n: qt.TypeNode) {
    switch (n.kind) {
      case Syntax.TypeQuery:
      case Syntax.TypeOperator:
      case Syntax.InferType:
        return ParenthesizedTypeNode.create(n);
    }
    return elementTypeMember(n);
  }
  export function elementTypeMembers(ns: readonly TypeNode[]) {
    return new Nodes(sameMap(ns, elementTypeMember));
  }
  export function typeParameters(ns?: readonly TypeNode[]) {
    if (some(ns)) {
      const ps: TypeNode[] = [];
      for (let i = 0; i < ns.length; ++i) {
        const p = ns[i];
        ps.push(i === 0 && Node.is.functionOrConstructorTypeNode(p) && p.typeParameters ? ParenthesizedTypeNode.create(p) : p);
      }
      return new Nodes(ps);
    }
    return;
  }
  export function defaultExpression(e: Expression) {
    const check = skipPartiallyEmittedExpressions(e);
    let needsParens = isCommaSequence(check);
    if (!needsParens) {
      switch (getLeftmostExpression(check, false).kind) {
        case Syntax.ClassExpression:
        case Syntax.FunctionExpression:
          needsParens = true;
      }
    }
    return needsParens ? createParen(e) : e;
  }
  export function forNew(e: Expression): LeftHandSideExpression {
    const leftmostExpr = getLeftmostExpression(e, true);
    switch (leftmostExpr.kind) {
      case Syntax.CallExpression:
        return createParen(e);
      case Syntax.NewExpression:
        return !(leftmostExpr as NewExpression).arguments ? createParen(e) : <LeftHandSideExpression>e;
    }
    return forAccess(e);
  }
  export function conciseBody(b: qt.ConciseBody): qt.ConciseBody {
    if (!Node.is.kind(Block, b) && (isCommaSequence(b) || getLeftmostExpression(b, false).kind === Syntax.ObjectLiteralExpression)) return setRange(createParen(b), b);
    return b;
  }
}
export namespace emit {
  export function disposeEmitNodes(sourceFile: SourceFile) {
    sourceFile = Node.get.sourceFileOf(Node.get.parseTreeOf(sourceFile));
    const emitNode = sourceFile && sourceFile.emitNode;
    const annotatedNodes = emitNode && emitNode.annotatedNodes;
    if (annotatedNodes) {
      for (const node of annotatedNodes) {
        node.emitNode = undefined;
      }
    }
  }
  export function getOrCreateEmitNode(node: Node): EmitNode {
    if (!node.emitNode) {
      if (Node.is.parseTreeNode(node)) {
        if (node.kind === Syntax.SourceFile) return (node.emitNode = { annotatedNodes: [node] } as EmitNode);
        const sourceFile = Node.get.sourceFileOf(Node.get.parseTreeOf(Node.get.sourceFileOf(node)));
        getOrCreateEmitNode(sourceFile).annotatedNodes!.push(node);
      }
      node.emitNode = {} as EmitNode;
    }
    return node.emitNode;
  }
  export function removeAllComments<T extends Node>(node: T): T {
    const emitNode = getOrCreateEmitNode(node);
    emitNode.flags |= EmitFlags.NoComments;
    emitNode.leadingComments = undefined;
    emitNode.trailingComments = undefined;
    return node;
  }
  export function setEmitFlags<T extends Node>(node: T, emitFlags: EmitFlags) {
    getOrCreateEmitNode(node).flags = emitFlags;
    return node;
  }
  export function addEmitFlags<T extends Node>(node: T, emitFlags: EmitFlags) {
    const emitNode = getOrCreateEmitNode(node);
    emitNode.flags = emitNode.flags | emitFlags;
    return node;
  }
  export function getSourceMapRange(node: Node): SourceMapRange {
    const emitNode = node.emitNode;
    return (emitNode && emitNode.sourceMapRange) || node;
  }
  export function setSourceMapRange<T extends Node>(node: T, range: SourceMapRange | undefined) {
    getOrCreateEmitNode(node).sourceMapRange = range;
    return node;
  }
  export function getTokenSourceMapRange(node: Node, token: Syntax): SourceMapRange | undefined {
    const emitNode = node.emitNode;
    const tokenSourceMapRanges = emitNode && emitNode.tokenSourceMapRanges;
    return tokenSourceMapRanges && tokenSourceMapRanges[token];
  }
  export function setTokenSourceMapRange<T extends Node>(node: T, token: Syntax, range: SourceMapRange | undefined) {
    const emitNode = getOrCreateEmitNode(node);
    const tokenSourceMapRanges = emitNode.tokenSourceMapRanges || (emitNode.tokenSourceMapRanges = []);
    tokenSourceMapRanges[token] = range;
    return node;
  }
  export function getStartsOnNewLine(node: Node) {
    const emitNode = node.emitNode;
    return emitNode && emitNode.startsOnNewLine;
  }
  export function setStartsOnNewLine<T extends Node>(node: T, newLine: boolean) {
    getOrCreateEmitNode(node).startsOnNewLine = newLine;
    return node;
  }
  export function getCommentRange(node: Node) {
    const emitNode = node.emitNode;
    return (emitNode && emitNode.commentRange) || node;
  }
  export function setCommentRange<T extends Node>(node: T, range: TextRange) {
    getOrCreateEmitNode(node).commentRange = range;
    return node;
  }
  export function getSyntheticLeadingComments(node: Node): SynthesizedComment[] | undefined {
    const emitNode = node.emitNode;
    return emitNode && emitNode.leadingComments;
  }
  export function setSyntheticLeadingComments<T extends Node>(node: T, comments: SynthesizedComment[] | undefined) {
    getOrCreateEmitNode(node).leadingComments = comments;
    return node;
  }
  export function addSyntheticLeadingComment<T extends Node>(node: T, kind: Syntax.SingleLineCommentTrivia | Syntax.MultiLineCommentTrivia, text: string, hasTrailingNewLine?: boolean) {
    return setSyntheticLeadingComments(
      node,
      append<SynthesizedComment>(getSyntheticLeadingComments(node), { kind, pos: -1, end: -1, hasTrailingNewLine, text })
    );
  }
  export function getSyntheticTrailingComments(node: Node): SynthesizedComment[] | undefined {
    const emitNode = node.emitNode;
    return emitNode && emitNode.trailingComments;
  }
  export function setSyntheticTrailingComments<T extends Node>(node: T, comments: SynthesizedComment[] | undefined) {
    getOrCreateEmitNode(node).trailingComments = comments;
    return node;
  }
  export function addSyntheticTrailingComment<T extends Node>(node: T, kind: Syntax.SingleLineCommentTrivia | Syntax.MultiLineCommentTrivia, text: string, hasTrailingNewLine?: boolean) {
    return setSyntheticTrailingComments(
      node,
      append<SynthesizedComment>(getSyntheticTrailingComments(node), { kind, pos: -1, end: -1, hasTrailingNewLine, text })
    );
  }
  export function moveSyntheticComments<T extends Node>(node: T, original: Node): T {
    setSyntheticLeadingComments(node, getSyntheticLeadingComments(original));
    setSyntheticTrailingComments(node, getSyntheticTrailingComments(original));
    const emit = getOrCreateEmitNode(original);
    emit.leadingComments = undefined;
    emit.trailingComments = undefined;
    return node;
  }
  export function ignoreSourceNewlines<T extends Node>(node: T): T {
    getOrCreateEmitNode(node).flags |= EmitFlags.IgnoreSourceNewlines;
    return node;
  }
  export function getConstantValue(node: PropertyAccessExpression | ElementAccessExpression): string | number | undefined {
    const emitNode = node.emitNode;
    return emitNode && emitNode.constantValue;
  }
  export function setConstantValue(node: PropertyAccessExpression | ElementAccessExpression, value: string | number): PropertyAccessExpression | ElementAccessExpression {
    const emitNode = getOrCreateEmitNode(node);
    emitNode.constantValue = value;
    return node;
  }
  export function addEmitHelper<T extends Node>(node: T, helper: EmitHelper): T {
    const emitNode = getOrCreateEmitNode(node);
    emitNode.helpers = append(emitNode.helpers, helper);
    return node;
  }
  export function addEmitHelpers<T extends Node>(node: T, helpers: EmitHelper[] | undefined): T {
    if (some(helpers)) {
      const emitNode = getOrCreateEmitNode(node);
      for (const helper of helpers) {
        emitNode.helpers = appendIfUnique(emitNode.helpers, helper);
      }
    }
    return node;
  }
  export function removeEmitHelper(node: Node, helper: EmitHelper): boolean {
    const emitNode = node.emitNode;
    if (emitNode) {
      const helpers = emitNode.helpers;
      if (helpers) return orderedRemoveItem(helpers, helper);
    }
    return false;
  }
  export function getEmitHelpers(node: Node): EmitHelper[] | undefined {
    const emitNode = node.emitNode;
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
  export function getExternalHelpersModuleName(node: SourceFile) {
    const parseNode = Node.get.originalOf(node, isSourceFile);
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
  export function createLiteral(value: string | number | PseudoBigInt | boolean): PrimaryExpression;
  export function createLiteral(value: string | number | PseudoBigInt | boolean | StringLiteral | NoSubstitutionLiteral | NumericLiteral | Identifier, isSingleQuote?: boolean): PrimaryExpression {
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
    return <ThisExpression & Token<Syntax.ThisKeyword>>Node.createSynthesized(Syntax.ThisKeyword);
  }
  export function createNull() {
    return <NullLiteral & Token<Syntax.NullKeyword>>Node.createSynthesized(Syntax.NullKeyword);
  }
  export function createTrue() {
    return <BooleanLiteral & Token<Syntax.TrueKeyword>>Node.createSynthesized(Syntax.TrueKeyword);
  }
  export function createFalse() {
    return <BooleanLiteral & Token<Syntax.FalseKeyword>>Node.createSynthesized(Syntax.FalseKeyword);
  }
  export function updateFunctionLikeBody(declaration: FunctionLikeDeclaration, body: Block): FunctionLikeDeclaration {
    switch (declaration.kind) {
      case Syntax.FunctionDeclaration:
        return createFunctionDeclaration(
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
  export function appendJSDocToContainer(node: JSDocContainer, jsdoc: JSDoc) {
    node.jsDoc = append(node.jsDoc, jsdoc);
    return node;
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
      node.declarationPath = Debug.checkDefined(javascriptMapTextOrDeclarationPath);
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
            return definedTextGetter(Debug.checkDefined(javascriptMapTextOrDeclarationPath));
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
    return new (SourceMapSource || (SourceMapSource = Node.SourceMapSourceObj))(fileName, text, syntax.skipTrivia);
  }
  export function getUnscopedHelperName(name: string) {
    return setEmitFlags(new Identifier(name), EmitFlags.HelperName | EmitFlags.AdviseOnEmitNode);
  }
  export function inlineExpressions(expressions: readonly Expression[]) {
    return expressions.length > 10 ? createCommaList(expressions) : reduceLeft(expressions, createComma)!;
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
  export function ensureUseStrict(statements: Nodes<Statement>): Nodes<Statement> {
    const foundUseStrict = findUseStrictPrologue(statements);
    if (!foundUseStrict) {
      return setRange(
        new Nodes<Statement>([startOnNewLine(createStatement(createLiteral('use strict'))), ...statements]),
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
      let namedBindings: NamedImportBindings | undefined;
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
            namedBindings = createNamedImports(
              map(helperNames, (name) =>
                isFileLevelUniqueName(sourceFile, name) ? createImportSpecifier(undefined, new Identifier(name)) : createImportSpecifier(new Identifier(name), getUnscopedHelperName(name))
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
          namedBindings = createNamespaceImport(externalHelpersModuleName);
        }
      }
      if (namedBindings) {
        const externalHelpersImportDeclaration = createImportDeclaration(undefined, undefined, createImportClause(undefined, namedBindings), createLiteral(externalHelpersModuleNameText));
        addEmitFlags(externalHelpersImportDeclaration, EmitFlags.NeverApplyImportHelper);
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
