import * as qb from './base';
import * as qc from './core';
import { Node, Nodes, Token } from './core';
import * as qt from './types';
import * as qy from './syntax';
import { Modifier, Syntax } from './syntax';

export function addMixins(t: any, ss: any[]) {
  ss.forEach((s: any) => {
    Object.getOwnPropertyNames(s.prototype).forEach((n) => {
      if (n == 'constructor') return;
      console.log(`adding ${s.name}.${n}`);
      Object.defineProperty(t.prototype, n, Object.getOwnPropertyDescriptor(s.prototype, n)!);
    });
  });
}

// prettier-ignore
export type NodeTypes = | ArrayBindingPattern | ArrayLiteralExpression | ArrayTypeNode | AsExpression | AwaitExpression | BinaryExpression | BindingElement | BindingPattern | Block | BreakOrContinueStatement | CallExpression | CaseBlock | CaseClause | CatchClause | ClassLikeDeclaration | CommaListExpression | ComputedPropertyName | ConditionalExpression | ConditionalTypeNode | Decorator | DefaultClause | DeleteExpression | DeleteExpression | DoStatement | ElementAccessExpression | EnumDeclaration | EnumMember | ExportAssignment | ExportDeclaration | ExpressionStatement | ExpressionWithTypeArguments | ExternalModuleReference | ForInStatement | ForOfStatement | ForStatement | FunctionLikeDeclaration | HeritageClause | Identifier | IfStatement | ImportClause | ImportDeclaration | ImportEqualsDeclaration | ImportOrExportSpecifier | ImportTypeNode | IndexedAccessTypeNode | InferTypeNode | InterfaceDeclaration | JSDoc | JSDocAugmentsTag | JSDocAuthorTag | JSDocFunctionType | JSDocImplementsTag | JSDocSignature | JSDocTemplateTag | JSDocTypedefTag | JSDocTypeExpression | JSDocTypeLiteral | JSDocTypeReferencingNode | JsxAttribute | JsxAttributes | JsxClosingElement | JsxElement | JsxExpression | JsxFragment | JsxOpeningLikeElement | JsxSpreadAttribute | LabeledStatement | LiteralTypeNode | MappedTypeNode | MetaProperty | MissingDeclaration | ModuleDeclaration | NamedImportsOrExports | NamedTupleMember | NamespaceExport | NamespaceExportDeclaration | NamespaceImport | NonNullExpression | ObjectLiteralExpression | OptionalTypeNode | ParameterDeclaration | ParenthesizedExpression | ParenthesizedTypeNode | PartiallyEmittedExpression | PostfixUnaryExpression | PrefixUnaryExpression | PropertyAccessExpression | PropertyAssignment | PropertyDeclaration | PropertySignature | QualifiedName | RestTypeNode | ReturnStatement | ShorthandPropertyAssignment | SignatureDeclaration | SourceFile | SpreadAssignment | SpreadElement | SwitchStatement | TaggedTemplateExpression | TemplateExpression | TemplateSpan | ThrowStatement | TryStatement | TupleTypeNode | TypeAliasDeclaration | TypeAssertion | TypeLiteralNode | TypeOfExpression | TypeOperatorNode | TypeParameterDeclaration | TypePredicateNode | TypeQueryNode | TypeReferenceNode | UnionOrIntersectionTypeNode | VariableDeclaration | VariableDeclarationList | VariableStatement | VoidExpression | WhileStatement | WithStatement | YieldExpression;

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
export class SignatureDeclarationBase extends NamedDeclaration implements qt.SignatureDeclarationBase {
  //kind!: qt.SignatureDeclaration['kind'];
  name?: qt.PropertyName;
  typeParameters?: Nodes<TypeParameterDeclaration>;
  parameters!: Nodes<ParameterDeclaration>;
  type?: qt.TypeNode;
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
    } else {
      return getMutableClone(node);
    }
  }
  createExpressionForPropertyName(memberName: Exclude<PropertyName, PrivateIdentifier>): Expression {
    if (Node.is.kind(Identifier, memberName)) {
      return createLiteral(memberName);
    } else if (Node.is.kind(ComputedPropertyName, memberName)) {
      return getMutableClone(memberName.expression);
    } else {
      return getMutableClone(memberName);
    }
  }
  createExpressionForObjectLiteralElementLike(node: ObjectLiteralExpression, property: ObjectLiteralElementLike, receiver: Expression): Expression | undefined {
    if (property.name && Node.is.kind(PrivateIdentifier, property.name)) {
      Debug.failBadSyntax(property.name, 'Private identifiers are not allowed in object literals.');
    }
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
          const getterFunction = createFunctionExpression(
            getAccessor.modifiers,
            undefined,
            undefined,
            undefined,
            getAccessor.parameters,
            undefined,
            getAccessor.body! // TODO: GH#18217
          );
          setRange(getterFunction, getAccessor);
          setOriginalNode(getterFunction, getAccessor);
          const getter = createPropertyAssignment('get', getterFunction);
          properties.push(getter);
        }

        if (setAccessor) {
          const setterFunction = createFunctionExpression(
            setAccessor.modifiers,
            undefined,
            undefined,
            undefined,
            setAccessor.parameters,
            undefined,
            setAccessor.body! // TODO: GH#18217
          );
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
              setOriginalNode(
                setRange(
                  createFunctionExpression(
                    method.modifiers,
                    method.asteriskToken,
                    undefined,
                    undefined,
                    method.parameters,
                    undefined,
                    method.body! // TODO: GH#18217
                  ),
                  method
                ),
                method
              )
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
    if (Node.is.kind(ComputedPropertyName, memberName)) {
      return setRange(new ElementAccessExpression(target, memberName.expression), location);
    } else {
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
    if (start !== undefined) {
      argumentsList.push(typeof start === 'number' ? createLiteral(start) : start);
    }
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
export class Statement extends Synthesized {
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
        if (isUseStrictPrologue(statement)) {
          foundUseStrict = true;
        }
        target.push(statement);
      } else {
        break;
      }
      statementOffset++;
    }
    if (ensureUseStrict && !foundUseStrict) {
      target.push(startOnNewLine(createStatement(createLiteral('use strict'))));
    }
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
      if (Node.get.emitFlags(statement) & EmitFlags.CustomPrologue && filter(statement)) {
        append(target, visitor ? visitNode(statement, visitor, isStatement) : statement);
      } else {
        break;
      }
      statementOffset++;
    }
    return statementOffset;
  }
  findUseStrictPrologue(statements: readonly Statement[]): Statement | undefined {
    for (const statement of statements) {
      if (Node.is.prologueDirective(statement)) {
        if (isUseStrictPrologue(statement)) {
          return statement;
        }
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
      const updatedDeclaration = updateVariableDeclaration(firstDeclaration, firstDeclaration.name, undefined, boundValue);
      return setRange(createVariableStatement(undefined, updateVariableDeclarationList(node, [updatedDeclaration])), node);
    } else {
      const updatedExpression = setRange(createAssignment(node, boundValue), node);
      return setRange(createStatement(updatedExpression), node);
    }
  }
  insertLeadingStatement(dest: Statement, source: Statement) {
    if (Node.is.kind(Block, dest)) {
      return dest.update(setRange(new Nodes([source, ...dest.statements]), dest.statements));
    } else {
      return new Block(new Nodes([dest, source]), true);
    }
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

export class ArrayLiteralExpression extends Node implements qt.ArrayLiteralExpression {
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
  _primaryExpressionBrand: any;
  _memberExpressionBrand: any;
  _leftHandSideExpressionBrand: any;
  _updateExpressionBrand: any;
  _unaryExpressionBrand: any;
  _expressionBrand: any;
}
ArrayLiteralExpression.prototype.kind = ArrayLiteralExpression.kind;

export class ArrayTypeNode extends Node implements qt.ArrayTypeNode {
  static readonly kind = Syntax.ArrayType;
  elementType: qt.TypeNode;
  constructor(t: qt.TypeNode) {
    super(true);
    this.elementType = parenthesize.arrayTypeMember(t);
  }
  update(t: qt.TypeNode) {
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

export class BigIntLiteral extends Synthesized implements LiteralExpression {
  static readonly kind: Syntax.BigIntLiteral;
  readonly kind = BigIntLiteral.kind;
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
export class BinaryExpression extends Synthesized implements Expression, Declaration {
  static readonly kind = Syntax.BinaryExpression;
  readonly kind = BinaryExpression.kind;
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
export class BindingElement extends Synthesized implements NamedDeclaration {
  static readonly kind = Syntax.BindingElement;
  readonly kind = BindingElement.kind;
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
    if (Node.is.kind(SpreadElement, bindingElement)) {
      return getInitializerOfBindingOrAssignmentElement(<BindingOrAssignmentElement>bindingElement.expression);
    }
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
          if (Node.is.kind(PrivateIdentifier, propertyName)) {
            return Debug.failBadSyntax(propertyName);
          }
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
          if (Node.is.kind(PrivateIdentifier, propertyName)) {
            return Debug.failBadSyntax(propertyName);
          }
          return Node.is.kind(ComputedPropertyName, propertyName) && isStringOrNumericLiteral(propertyName.expression) ? propertyName.expression : propertyName;
        }
        break;
      case Syntax.SpreadAssignment:
        // `a` in `({ ...a } = ...)`
        if (bindingElement.name && Node.is.kind(PrivateIdentifier, bindingElement.name)) {
          return Debug.failBadSyntax(bindingElement.name);
        }
        return bindingElement.name;
    }
    const target = getTargetOfBindingOrAssignmentElement(bindingElement);
    if (target && Node.is.propertyName(target)) {
      return target;
    }
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
    if (Node.is.kind(ObjectBindingPattern, node)) {
      return setOriginalNode(setRange(createObjectLiteral(map(node.elements, convertToObjectAssignmentElement)), node), node);
    }
    Debug.assertNode(node, isObjectLiteralExpression);
    return node;
  }
  export function convertToArrayAssignmentPattern(node: ArrayBindingOrAssignmentPattern) {
    if (Node.is.kind(ArrayBindingPattern, node)) {
      return setOriginalNode(setRange(new ArrayLiteralExpression(map(node.elements, convertToArrayAssignmentElement)), node), node);
    }
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
export class Block extends Synthesized implements Statement {
  static readonly kind = Syntax.Block;
  readonly kind = Block.kind;
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
export class BreakStatement extends Synthesized implements Statement {
  static readonly kind = Syntax.BreakStatement;
  readonly kind = BreakStatement.kind;
  label?: Identifier;
  createBreak(l?: string | Identifier) {
    this.label = asName(l);
  }
  updateBreak(l?: Identifier) {
    return this.label !== l ? updateNode(createBreak(l), this) : this;
  }
}
export class Bundle extends Node {
  static readonly kind = Syntax.Bundle;
  readonly kind = Bundle.kind;
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
export class CallBinding {
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
        if (elements.length === 0) {
          return false;
        }
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
    return new CallExpression(createFunctionExpression(undefined, undefined, undefined, undefined, param ? [param] : [], undefined, new Block(ss, true)), undefined, paramValue ? [paramValue] : []);
  }
  static immediateArrowFunction(ss: readonly Statement[]): CallExpression;
  static immediateArrowFunction(ss: readonly Statement[], param: ParameterDeclaration, paramValue: Expression): CallExpression;
  static immediateArrowFunction(ss: readonly Statement[], param?: ParameterDeclaration, paramValue?: Expression) {
    return new CallExpression(new ArrowFunction(undefined, undefined, param ? [param] : [], undefined, undefined, new Block(ss, true)), undefined, paramValue ? [paramValue] : []);
  }
  _declarationBrand: any;
}
CallExpression.prototype.kind = CallExpression.kind;
addMixins(CallExpression, [Declaration]);

export class CallChain extends CallExpression {
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
export class CallSignatureDeclaration extends SignatureDeclarationBase implements TypeElement {
  static readonly kind = Syntax.CallSignature;
  readonly kind = CallSignatureDeclaration.kind;
  create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
    return SignatureDeclaration.create(Syntax.CallSignature, ts, ps, t) as CallSignatureDeclaration;
  }
  update(n: CallSignatureDeclaration, ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: TypeNode) {
    return SignatureDeclaration.update(n, ts, ps, t);
  }
}
export class CaseBlock extends Node {
  static readonly kind = Syntax.CaseBlock;
  readonly kind = CaseBlock.kind;
  parent: SwitchStatement;
  clauses: Nodes<CaseOrDefaultClause>;
  createCaseBlock(clauses: readonly CaseOrDefaultClause[]): CaseBlock {
    const node = <CaseBlock>Node.createSynthesized(Syntax.CaseBlock);
    this.clauses = new Nodes(clauses);
  }
  updateCaseBlock(clauses: readonly CaseOrDefaultClause[]) {
    return this.clauses !== clauses ? updateNode(createCaseBlock(clauses), this) : this;
  }
}
export class CaseClause extends Node {
  static readonly kind = Syntax.CaseClause;
  readonly kind = CaseClause.kind;
  parent: CaseBlock;
  expression: Expression;
  statements: Nodes<Statement>;
  fallthroughFlowNode?: FlowNode;
  createCaseClause(expression: Expression, statements: readonly Statement[]) {
    const node = <CaseClause>Node.createSynthesized(Syntax.CaseClause);
    this.expression = parenthesizeExpressionForList(expression);
    this.statements = new Nodes(statements);
  }
  updateCaseClause(expression: Expression, statements: readonly Statement[]) {
    return this.expression !== expression || this.statements !== statements ? updateNode(createCaseClause(expression, statements), this) : this;
  }
}
export class CatchClause extends Node {
  static readonly kind = Syntax.CatchClause;
  readonly kind = CatchClause.kind;
  parent: TryStatement;
  variableDeclaration?: VariableDeclaration;
  block: Block;
  createCatchClause(variableDeclaration: string | VariableDeclaration | undefined, block: Block) {
    const node = <CatchClause>Node.createSynthesized(Syntax.CatchClause);
    this.variableDeclaration = isString(variableDeclaration) ? createVariableDeclaration(variableDeclaration) : variableDeclaration;
    this.block = block;
    return this;
  }
  updateCatchClause(this: CatchClause, variableDeclaration: VariableDeclaration | undefined, block: Block) {
    return this.variableDeclaration !== variableDeclaration || this.block !== block ? updateNode(createCatchClause(variableDeclaration, block), this) : this;
  }
}
export class ClassDeclaration extends Synthesized implements ClassLikeDeclarationBase, DeclarationStatement {
  static readonly kind = Syntax.ClassDeclaration;
  readonly kind = ClassDeclaration.kind;
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
    return this;
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
export class ClassExpression extends Synthesized implements ClassLikeDeclarationBase, PrimaryExpression {
  static readonly kind = Syntax.ClassExpression;
  readonly kind = ClassExpression.kind;
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
    return this;
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
export class CommaListExpression extends Expression {
  static readonly kind: Syntax.CommaListExpression;
  readonly kind = CommaListExpression.kind;
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
    return this;
  }
  updateCommaList(this: CommaListExpression, elements: readonly Expression[]) {
    return this.elements !== elements ? updateNode(createCommaList(elements), this) : this;
  }
}
export class ComputedPropertyName extends Node {
  static readonly kind = Syntax.ComputedPropertyName;
  readonly kind = ComputedPropertyName.kind;
  parent: Declaration;
  expression: Expression;
  create(e: Expression) {
    const n = Node.createSynthesized(Syntax.ComputedPropertyName);
    n.expression = isCommaSequence(e) ? createParen(e) : e;
    return n;
  }
  update(n: ComputedPropertyName, e: Expression) {
    return n.expression !== e ? updateNode(create(e), n) : n;
  }
}
export class ConditionalExpression extends Expression {
  static readonly kind = Syntax.ConditionalExpression;
  readonly kind = ConditionalExpression.kind;
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
    return this;
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
export class ConditionalTypeNode extends TypeNode {
  static readonly kind = Syntax.ConditionalType;
  readonly kind = ConditionalTypeNode.kind;
  checkType: TypeNode;
  extendsType: TypeNode;
  trueType: TypeNode;
  falseType: TypeNode;
  create(c: TypeNode, e: TypeNode, t: TypeNode, f: TypeNode) {
    const n = Node.createSynthesized(Syntax.ConditionalType);
    n.checkType = parenthesizeConditionalTypeMember(c);
    n.extendsType = parenthesizeConditionalTypeMember(e);
    n.trueType = t;
    n.falseType = f;
    return n;
  }
  update(n: ConditionalTypeNode, c: TypeNode, e: TypeNode, t: TypeNode, f: TypeNode) {
    return n.checkType !== c || n.extendsType !== e || n.trueType !== t || n.falseType !== f ? updateNode(create(c, e, t, f), n) : n;
  }
}
export class ConstructorDeclaration extends FunctionLikeDeclarationBase implements ClassElement, JSDocContainer {
  static readonly kind = Syntax.Constructor;
  readonly kind = ConstructorDeclaration.kind;
  parent: ClassLikeDeclaration;
  body?: FunctionBody;
  create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], b?: Block) {
    const n = Node.createSynthesized(Syntax.Constructor);
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
export class ConstructorTypeNode extends Synthesized implements FunctionOrConstructorTypeNodeBase {
  static readonly kind = Syntax.ConstructorType;
  readonly kind = ConstructorType.kind;
  create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
    return SignatureDeclaration.create(Syntax.ConstructorType, ts, ps, t) as ConstructorTypeNode;
  }
  update(ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: TypeNode) {
    return SignatureDeclaration.update(this, ts, ps, t);
  }
}
export class ConstructSignatureDeclaration extends SignatureDeclarationBase implements TypeElement {
  static readonly kind = Syntax.ConstructSignature;
  readonly kind = ConstructSignature.kind;
  create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
    return SignatureDeclaration.create(Syntax.ConstructSignature, ts, ps, t) as ConstructSignatureDeclaration;
  }
  update(ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: TypeNode) {
    return SignatureDeclaration.update(this, ts, ps, t);
  }
}
export class ContinueStatement extends Synthesized implements Statement {
  static readonly kind = Syntax.ContinueStatement;
  readonly kind = ContinueStatement.kind;
  label?: Identifier;
  createContinue(l?: string | Identifier) {
    this.label = asName(l);
  }
  updateContinue(l: Identifier) {
    return this.label !== l ? updateNode(createContinue(l), this) : this;
  }
}
export class DebuggerStatement extends Synthesized implements Statement {
  static readonly kind = Syntax.DebuggerStatement;
  readonly kind = DebuggerStatement.kind;
  createDebuggerStatement() {
    return <DebuggerStatement>Node.createSynthesized(Syntax.DebuggerStatement);
  }
}
export class Decorator extends Synthesized {
  static readonly kind = Syntax.Decorator;
  readonly kind = Decorator.kind;
  parent: NamedDeclaration;
  expression: LeftHandSideExpression;
  createDecorator(e: Expression) {
    this.expression = parenthesize.forAccess(e);
  }
  updateDecorator(e: Expression) {
    return this.expression !== e ? updateNode(createDecorator(e), this) : this;
  }
}
export class DefaultClause extends Synthesized {
  static readonly kind = Syntax.DefaultClause;
  readonly kind = DefaultClause.kind;
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

export class DoStatement extends Synthesized implements IterationStatement {
  static readonly kind = Syntax.DoStatement;
  readonly kind = DoStatement.kind;
  expression: Expression;
  createDo(s: Statement, e: Expression) {
    this.statement = asEmbeddedStatement(s);
    this.expression = e;
  }
  updateDo(s: Statement, e: Expression) {
    return this.statement !== s || this.expression !== e ? updateNode(createDo(s, e), this) : this;
  }
}
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

export class ElementAccessChain extends ElementAccessExpression {
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
export class EmptyStatement extends Synthesized implements Statement {
  static readonly kind = Syntax.EmptyStatement;
  readonly kind = EmptyStatement.kind;
  createEmptyStatement() {}
}
export class EndOfDeclarationMarker extends Synthesized implements Statement {
  static readonly kind = Syntax.EndOfDeclarationMarker;
  readonly kind = EndOfDeclarationMarker.kind;
  createEndOfDeclarationMarker(o: Node) {
    this.emitNode = {} as EmitNode;
    this.original = o;
  }
}
export class EnumDeclaration extends Synthesized implements DeclarationStatement, JSDocContainer {
  static readonly kind = Syntax.EnumDeclaration;
  readonly kind = EnumDeclaration.kind;
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
export class EnumMember extends Synthesized implements NamedDeclaration, JSDocContainer {
  static readonly kind = Syntax.EnumMember;
  readonly kind = EnumMember.kind;
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
export class ExportAssignment extends Synthesized implements DeclarationStatement {
  static readonly kind = Syntax.ExportAssignment;
  readonly kind = ExportAssignment.kind;
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
export class ExportDeclaration extends Synthesized implements DeclarationStatement, JSDocContainer {
  static readonly kind = Syntax.ExportDeclaration;
  readonly kind = ExportDeclaration.kind;
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
export class ExportSpecifier extends Synthesized implements NamedDeclaration {
  static readonly kind = Syntax.ExportSpecifier;
  readonly kind = ExportSpecifier.kind;
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
export class ExpressionStatement extends Statement implements JSDocContainer {
  static readonly kind = Syntax.ExpressionStatement;
  readonly kind = ExpressionStatement.kind;
  expression: Expression;
  createExpressionStatement(expression: Expression): ExpressionStatement {
    const node = <ExpressionStatement>Node.createSynthesized(Syntax.ExpressionStatement);
    node.expression = parenthesizeExpressionForExpressionStatement(expression);
    return node;
  }
  updateExpressionStatement(node: ExpressionStatement, expression: Expression) {
    return node.expression !== expression ? updateNode(createExpressionStatement(expression), node) : node;
  }
}
export class ExpressionWithTypeArguments extends NodeWithTypeArguments {
  static readonly kind = Syntax.ExpressionWithTypeArguments;
  readonly kind = ExpressionWithTypeArguments.kind;
  parent: HeritageClause | JSDocAugmentsTag | JSDocImplementsTag;
  expression: LeftHandSideExpression;
  createExpressionWithTypeArguments(typeArguments: readonly TypeNode[] | undefined, expression: Expression) {
    const node = <ExpressionWithTypeArguments>Node.createSynthesized(Syntax.ExpressionWithTypeArguments);
    node.expression = parenthesize.forAccess(expression);
    node.typeArguments = Nodes.from(typeArguments);
    return node;
  }
  updateExpressionWithTypeArguments(node: ExpressionWithTypeArguments, typeArguments: readonly TypeNode[] | undefined, expression: Expression) {
    return node.typeArguments !== typeArguments || node.expression !== expression ? updateNode(createExpressionWithTypeArguments(typeArguments, expression), node) : node;
  }
}
export class ExternalModuleReference extends Node {
  static readonly kind = Syntax.ExternalModuleReference;
  readonly kind = ExternalModuleReference.kind;
  parent: ImportEqualsDeclaration;
  expression: Expression;
  createExternalModuleReference(expression: Expression) {
    const node = <ExternalModuleReference>Node.createSynthesized(Syntax.ExternalModuleReference);
    node.expression = expression;
    return node;
  }
  updateExternalModuleReference(node: ExternalModuleReference, expression: Expression) {
    return node.expression !== expression ? updateNode(createExternalModuleReference(expression), node) : node;
  }
}
export class ForInStatement extends Synthesized implements IterationStatement {
  static readonly kind = Syntax.ForInStatement;
  readonly kind = ForInStatement.kind;
  initializer: ForInitializer;
  expression: Expression;
  createForIn(initializer: ForInitializer, expression: Expression, statement: Statement) {
    const node = <ForInStatement>Node.createSynthesized(Syntax.ForInStatement);
    node.initializer = initializer;
    node.expression = expression;
    node.statement = asEmbeddedStatement(statement);
    return node;
  }
  updateForIn(node: ForInStatement, initializer: ForInitializer, expression: Expression, statement: Statement) {
    return node.initializer !== initializer || node.expression !== expression || node.statement !== statement ? updateNode(createForIn(initializer, expression, statement), node) : node;
  }
}
export class ForOfStatement extends Synthesized implements IterationStatement {
  static readonly kind = Syntax.ForOfStatement;
  readonly kind = ForOfStatement.kind;
  awaitModifier?: AwaitKeywordToken;
  initializer: ForInitializer;
  expression: Expression;
  createForOf(awaitModifier: AwaitKeywordToken | undefined, initializer: ForInitializer, expression: Expression, statement: Statement) {
    const node = <ForOfStatement>Node.createSynthesized(Syntax.ForOfStatement);
    node.awaitModifier = awaitModifier;
    node.initializer = initializer;
    node.expression = isCommaSequence(expression) ? createParen(expression) : expression;
    node.statement = asEmbeddedStatement(statement);
    return node;
  }
  updateForOf(node: ForOfStatement, awaitModifier: AwaitKeywordToken | undefined, initializer: ForInitializer, expression: Expression, statement: Statement) {
    return node.awaitModifier !== awaitModifier || node.initializer !== initializer || node.expression !== expression || node.statement !== statement
      ? updateNode(createForOf(awaitModifier, initializer, expression, statement), node)
      : node;
  }
}
export class ForStatement extends Synthesized implements IterationStatement {
  static readonly kind = Syntax.ForStatement;
  readonly kind = ForStatement.kind;
  initializer?: ForInitializer;
  condition?: Expression;
  incrementor?: Expression;
  createFor(initializer: ForInitializer | undefined, condition: Expression | undefined, incrementor: Expression | undefined, statement: Statement) {
    const node = <ForStatement>Node.createSynthesized(Syntax.ForStatement);
    node.initializer = initializer;
    node.condition = condition;
    node.incrementor = incrementor;
    node.statement = asEmbeddedStatement(statement);
    return node;
  }
  updateFor(node: ForStatement, initializer: ForInitializer | undefined, condition: Expression | undefined, incrementor: Expression | undefined, statement: Statement) {
    return node.initializer !== initializer || node.condition !== condition || node.incrementor !== incrementor || node.statement !== statement
      ? updateNode(createFor(initializer, condition, incrementor, statement), node)
      : node;
  }
}
export class FunctionDeclaration extends DeclarationStatement implements FunctionLikeDeclarationBase {
  static readonly kind = Syntax.FunctionDeclaration;
  readonly kind = FunctionDeclaration.kind;
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
    const node = <FunctionDeclaration>Node.createSynthesized(Syntax.FunctionDeclaration);
    node.decorators = Nodes.from(decorators);
    node.modifiers = Nodes.from(modifiers);
    node.asteriskToken = asteriskToken;
    node.name = asName(name);
    node.typeParameters = Nodes.from(typeParameters);
    node.parameters = new Nodes(parameters);
    node.type = type;
    node.body = body;
    return node;
  }
  updateFunctionDeclaration(
    node: FunctionDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    asteriskToken: AsteriskToken | undefined,
    name: Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    parameters: readonly ParameterDeclaration[],
    type: TypeNode | undefined,
    body: Block | undefined
  ) {
    return node.decorators !== decorators ||
      node.modifiers !== modifiers ||
      node.asteriskToken !== asteriskToken ||
      node.name !== name ||
      node.typeParameters !== typeParameters ||
      node.parameters !== parameters ||
      node.type !== type ||
      node.body !== body
      ? updateNode(createFunctionDeclaration(decorators, modifiers, asteriskToken, name, typeParameters, parameters, type, body), node)
      : node;
  }
}
export class FunctionExpression extends Expression implements PrimaryExpression, FunctionLikeDeclarationBase, JSDocContainer {
  static readonly kind = Syntax.FunctionExpression;
  readonly kind = FunctionExpression.kind;
  name?: Identifier;
  body: FunctionBody;
  createFunctionExpression(
    modifiers: readonly Modifier[] | undefined,
    asteriskToken: AsteriskToken | undefined,
    name: string | Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    parameters: readonly ParameterDeclaration[] | undefined,
    type: TypeNode | undefined,
    body: Block
  ) {
    const node = <FunctionExpression>Node.createSynthesized(Syntax.FunctionExpression);
    node.modifiers = Nodes.from(modifiers);
    node.asteriskToken = asteriskToken;
    node.name = asName(name);
    node.typeParameters = Nodes.from(typeParameters);
    node.parameters = new Nodes(parameters);
    node.type = type;
    node.body = body;
    return node;
  }
  updateFunctionExpression(
    node: FunctionExpression,
    modifiers: readonly Modifier[] | undefined,
    asteriskToken: AsteriskToken | undefined,
    name: Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    parameters: readonly ParameterDeclaration[],
    type: TypeNode | undefined,
    body: Block
  ) {
    return node.name !== name ||
      node.modifiers !== modifiers ||
      node.asteriskToken !== asteriskToken ||
      node.typeParameters !== typeParameters ||
      node.parameters !== parameters ||
      node.type !== type ||
      node.body !== body
      ? updateNode(createFunctionExpression(modifiers, asteriskToken, name, typeParameters, parameters, type, body), node)
      : node;
  }
}
export class FunctionTypeNode extends FunctionOrConstructorTypeNodeBase {
  static readonly kind = Syntax.FunctionType;
  readonly kind = FunctionTypeNode.kind;
  create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
    return SignatureDeclaration.create(Syntax.FunctionType, ts, ps, t) as FunctionTypeNode;
  }
  update(n: FunctionTypeNode, ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: TypeNode) {
    return SignatureDeclaration.update(n, ts, ps, t);
  }
}
export class GetAccessorDeclaration extends Node implements FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
  static readonly kind = Syntax.GetAccessor;
  readonly kind = GetAccessorDeclaration.kind;
  parent: ClassLikeDeclaration | ObjectLiteralExpression;
  name: PropertyName;
  body?: FunctionBody;
  create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | PropertyName, ps: readonly ParameterDeclaration[], t?: TypeNode, b?: Block) {
    const n = Node.createSynthesized(Syntax.GetAccessor);
    n.decorators = Nodes.from(ds);
    n.modifiers = Nodes.from(ms);
    n.name = asName(p);
    n.typeParameters = undefined;
    n.parameters = new Nodes(ps);
    n.type = t;
    n.body = b;
    return n;
  }
  update(n: GetAccessorDeclaration, ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: PropertyName, ps: readonly ParameterDeclaration[], t?: TypeNode, b?: Block) {
    return n.decorators !== ds || n.modifiers !== ms || n.name !== p || n.parameters !== ps || n.type !== t || n.body !== b ? updateNode(create(ds, ms, p, ps, t, b), n) : n;
  }
  orSetKind(n: Node): n is AccessorDeclaration {
    return n.kind === Syntax.SetAccessor || n.kind === Syntax.GetAccessor;
  }
}
export class HeritageClause extends Node {
  static readonly kind = Syntax.HeritageClause;
  readonly kind = HeritageClause.kind;
  parent: InterfaceDeclaration | ClassLikeDeclaration;
  token: Syntax.ExtendsKeyword | Syntax.ImplementsKeyword;
  types: Nodes<ExpressionWithTypeArguments>;
  createHeritageClause(token: HeritageClause['token'], types: readonly ExpressionWithTypeArguments[]) {
    const node = <HeritageClause>Node.createSynthesized(Syntax.HeritageClause);
    node.token = token;
    node.types = new Nodes(types);
    return node;
  }
  updateHeritageClause(node: HeritageClause, types: readonly ExpressionWithTypeArguments[]) {
    return node.types !== types ? updateNode(createHeritageClause(node.token, types), node) : node;
  }
}
export class IfStatement extends Statement {
  static readonly kind = Syntax.IfStatement;
  readonly kind = IfStatement.kind;
  expression: Expression;
  thenStatement: Statement;
  elseStatement?: Statement;
  createIf(expression: Expression, thenStatement: Statement, elseStatement?: Statement) {
    const node = <IfStatement>Node.createSynthesized(Syntax.IfStatement);
    node.expression = expression;
    node.thenStatement = asEmbeddedStatement(thenStatement);
    node.elseStatement = asEmbeddedStatement(elseStatement);
    return node;
  }
  updateIf(node: IfStatement, expression: Expression, thenStatement: Statement, elseStatement: Statement | undefined) {
    return node.expression !== expression || node.thenStatement !== thenStatement || node.elseStatement !== elseStatement ? updateNode(createIf(expression, thenStatement, elseStatement), node) : node;
  }
}
export class ImportClause extends NamedDeclaration {
  static readonly kind = Syntax.ImportClause;
  readonly kind = ImportClause.kind;
  parent: ImportDeclaration;
  isTypeOnly: boolean;
  name?: Identifier;
  namedBindings?: NamedImportBindings;
  createImportClause(name: Identifier | undefined, namedBindings: NamedImportBindings | undefined, isTypeOnly = false): ImportClause {
    const node = <ImportClause>Node.createSynthesized(Syntax.ImportClause);
    node.name = name;
    node.namedBindings = namedBindings;
    node.isTypeOnly = isTypeOnly;
    return node;
  }
  updateImportClause(node: ImportClause, name: Identifier | undefined, namedBindings: NamedImportBindings | undefined, isTypeOnly: boolean) {
    return node.name !== name || node.namedBindings !== namedBindings || node.isTypeOnly !== isTypeOnly ? updateNode(createImportClause(name, namedBindings, isTypeOnly), node) : node;
  }
}
export class ImportDeclaration extends Statement {
  static readonly kind = Syntax.ImportDeclaration;
  readonly kind = ImportDeclaration.kind;
  parent: SourceFile | ModuleBlock;
  importClause?: ImportClause;
  moduleSpecifier: Expression;
  createImportDeclaration(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    importClause: ImportClause | undefined,
    moduleSpecifier: Expression
  ): ImportDeclaration {
    const node = <ImportDeclaration>Node.createSynthesized(Syntax.ImportDeclaration);
    node.decorators = Nodes.from(decorators);
    node.modifiers = Nodes.from(modifiers);
    node.importClause = importClause;
    node.moduleSpecifier = moduleSpecifier;
    return node;
  }
  updateImportDeclaration(
    node: ImportDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    importClause: ImportClause | undefined,
    moduleSpecifier: Expression
  ) {
    return node.decorators !== decorators || node.modifiers !== modifiers || node.importClause !== importClause || node.moduleSpecifier !== moduleSpecifier
      ? updateNode(createImportDeclaration(decorators, modifiers, importClause, moduleSpecifier), node)
      : node;
  }
}
export class ImportEqualsDeclaration extends Node implements DeclarationStatement, JSDocContainer {
  static readonly kind = Syntax.ImportEqualsDeclaration;
  readonly kind = ImportEqualsDeclaration.kind;
  parent: SourceFile | ModuleBlock;
  name: Identifier;
  moduleReference: ModuleReference;
  createImportEqualsDeclaration(decorators: readonly Decorator[] | undefined, modifiers: readonly Modifier[] | undefined, name: string | Identifier, moduleReference: ModuleReference) {
    const node = <ImportEqualsDeclaration>Node.createSynthesized(Syntax.ImportEqualsDeclaration);
    node.decorators = Nodes.from(decorators);
    node.modifiers = Nodes.from(modifiers);
    node.name = asName(name);
    node.moduleReference = moduleReference;
    return node;
  }
  updateImportEqualsDeclaration(
    node: ImportEqualsDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: Identifier,
    moduleReference: ModuleReference
  ) {
    return node.decorators !== decorators || node.modifiers !== modifiers || node.name !== name || node.moduleReference !== moduleReference
      ? updateNode(createImportEqualsDeclaration(decorators, modifiers, name, moduleReference), node)
      : node;
  }
}
export class ImportSpecifier extends NamedDeclaration {
  static readonly kind = Syntax.ImportSpecifier;
  readonly kind = ImportSpecifier.kind;
  parent: NamedImports;
  propertyName?: Identifier;
  name: Identifier;
  createImportSpecifier(propertyName: Identifier | undefined, name: Identifier) {
    const node = <ImportSpecifier>Node.createSynthesized(Syntax.ImportSpecifier);
    node.propertyName = propertyName;
    node.name = name;
    return node;
  }
  updateImportSpecifier(node: ImportSpecifier, propertyName: Identifier | undefined, name: Identifier) {
    return node.propertyName !== propertyName || node.name !== name ? updateNode(createImportSpecifier(propertyName, name), node) : node;
  }
}
export class ImportTypeNode extends NodeWithTypeArguments {
  static readonly kind = Syntax.ImportType;
  readonly kind = ImportTypeNode.kind;
  isTypeOf?: boolean;
  argument: TypeNode;
  qualifier?: EntityName;
  create(a: TypeNode, q?: EntityName, ts?: readonly TypeNode[], tof?: boolean) {
    const n = Node.createSynthesized(Syntax.ImportType);
    n.argument = a;
    n.qualifier = q;
    n.typeArguments = parenthesizeTypeParameters(ts);
    n.isTypeOf = tof;
    return n;
  }
  update(n: ImportTypeNode, a: TypeNode, q?: EntityName, ts?: readonly TypeNode[], tof?: boolean) {
    return n.argument !== a || n.qualifier !== q || n.typeArguments !== ts || n.isTypeOf !== tof ? updateNode(create(a, q, ts, tof), n) : n;
  }
}
export class IndexedAccessTypeNode extends TypeNode {
  static readonly kind = Syntax.IndexedAccessType;
  readonly kind = IndexedAccessTypeNode.kind;
  objectType: TypeNode;
  indexType: TypeNode;
  create(o: TypeNode, i: TypeNode) {
    const n = Node.createSynthesized(Syntax.IndexedAccessType);
    n.objectType = parenthesizeElementTypeMember(o);
    n.indexType = i;
    return n;
  }
  update(n: IndexedAccessTypeNode, o: TypeNode, i: TypeNode) {
    return n.objectType !== o || n.indexType !== i ? updateNode(create(o, i), n) : n;
  }
}
export class IndexSignatureDeclaration extends Node implements SignatureDeclarationBase, ClassElement, TypeElement {
  static readonly kind = Syntax.IndexSignature;
  readonly kind = IndexSignatureDeclaration.kind;
  parent: ObjectTypeDeclaration;
  create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], t: TypeNode): IndexSignatureDeclaration {
    const n = Node.createSynthesized(Syntax.IndexSignature);
    n.decorators = Nodes.from(ds);
    n.modifiers = Nodes.from(ms);
    n.parameters = new Nodes(ps);
    n.type = t;
    return n;
  }
  update(n: IndexSignatureDeclaration, ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], t: TypeNode) {
    return n.parameters !== ps || n.type !== t || n.decorators !== ds || n.modifiers !== ms ? updateNode(create(ds, ms, ps, t), n) : n;
  }
}
export class InferTypeNode extends TypeNode {
  static readonly kind = Syntax.InferType;
  readonly kind = InferTypeNode.kind;
  typeParameter: TypeParameterDeclaration;
  create(p: TypeParameterDeclaration) {
    const n = Node.createSynthesized(Syntax.InferType);
    n.typeParameter = p;
    return n;
  }
  update(n: InferTypeNode, p: TypeParameterDeclaration) {
    return n.typeParameter !== p ? updateNode(create(p), n) : n;
  }
}
export class InterfaceDeclaration extends Node implements DeclarationStatement, JSDocContainer {
  static readonly kind = Syntax.InterfaceDeclaration;
  readonly kind = InterfaceDeclaration.kind;
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
    const node = <InterfaceDeclaration>Node.createSynthesized(Syntax.InterfaceDeclaration);
    node.decorators = Nodes.from(decorators);
    node.modifiers = Nodes.from(modifiers);
    node.name = asName(name);
    node.typeParameters = Nodes.from(typeParameters);
    node.heritageClauses = Nodes.from(heritageClauses);
    node.members = new Nodes(members);
    return node;
  }
  updateInterfaceDeclaration(
    node: InterfaceDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: Identifier,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    heritageClauses: readonly HeritageClause[] | undefined,
    members: readonly TypeElement[]
  ) {
    return node.decorators !== decorators ||
      node.modifiers !== modifiers ||
      node.name !== name ||
      node.typeParameters !== typeParameters ||
      node.heritageClauses !== heritageClauses ||
      node.members !== members
      ? updateNode(createInterfaceDeclaration(decorators, modifiers, name, typeParameters, heritageClauses, members), node)
      : node;
  }
}
export class IntersectionTypeNode extends TypeNode {
  static readonly kind = Syntax.IntersectionType;
  readonly kind = IntersectionTypeNode.kind;
  types: Nodes<TypeNode>;
  create(ts: readonly TypeNode[]) {
    return UnionTypeNode.orIntersectionCreate(Syntax.IntersectionType, ts) as IntersectionTypeNode;
  }
  update(n: IntersectionTypeNode, ts: Nodes<TypeNode>) {
    return UnionTypeNode.orIntersectionUpdate(n, ts);
  }
}
export class JSDoc extends Node {
  static readonly kind = Syntax.JSDocComment;
  readonly kind = JSDoc.kind;
  parent: HasJSDoc;
  tags?: Nodes<JSDocTag>;
  comment?: string;
  createJSDocComment(comment?: string | undefined, tags?: Nodes<JSDocTag> | undefined) {
    const node = Node.createSynthesized(Syntax.JSDocComment) as JSDoc;
    node.comment = comment;
    node.tags = tags;
    return node;
  }
}
export class JSDocAllType extends JSDocType {
  static readonly kind = Syntax.JSDocAllType;
  readonly kind = JSDocAllType.kind;
}
export class JSDocAugmentsTag extends JSDocTag {
  static readonly kind = Syntax.JSDocAugmentsTag;
  readonly kind = JSDocAugmentsTag.kind;
  class: ExpressionWithTypeArguments & { expression: Identifier | PropertyAccessEntityNameExpression };
  createJSDocAugmentsTag(classExpression: JSDocAugmentsTag['class'], comment?: string) {
    const tag = createJSDocTag<JSDocAugmentsTag>(Syntax.JSDocAugmentsTag, 'augments', comment);
    tag.class = classExpression;
    return tag;
  }
}
export class JSDocAuthorTag extends JSDocTag {
  static readonly kind = Syntax.JSDocAuthorTag;
  readonly kind = JSDocAuthorTag.kind;
  createJSDocAuthorTag(comment?: string) {
    return createJSDocTag<JSDocAuthorTag>(Syntax.JSDocAuthorTag, 'author', comment);
  }
}
export class JSDocCallbackTag extends JSDocTag {
  //}, NamedDeclaration {
  static readonly kind = Syntax.JSDocCallbackTag;
  readonly kind = JSDocCallbackTag.kind;
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
export class JSDocClassTag extends JSDocTag {
  static readonly kind = Syntax.JSDocClassTag;
  readonly kind = JSDocClassTag.kind;
  createJSDocClassTag(comment?: string): JSDocClassTag {
    return createJSDocTag<JSDocClassTag>(Syntax.JSDocClassTag, 'class', comment);
  }
}
export class JSDocEnumTag extends JSDocTag {
  //}, Declaration {
  static readonly kind = Syntax.JSDocEnumTag;
  readonly kind = JSDocEnumTag.kind;
  parent: JSDoc;
  typeExpression?: JSDocTypeExpression;
  createJSDocEnumTag(typeExpression?: JSDocTypeExpression, comment?: string) {
    const tag = createJSDocTag<JSDocEnumTag>(Syntax.JSDocEnumTag, 'enum', comment);
    tag.typeExpression = typeExpression;
    return tag;
  }
}
export class JSDocFunctionType extends JSDocType {
  // , SignatureDeclarationBase {
  static readonly kind = Syntax.JSDocFunctionType;
  readonly kind = JSDocFunctionType.kind;
}
export class JSDocImplementsTag extends JSDocTag {
  static readonly kind = Syntax.JSDocImplementsTag;
  readonly kind = JSDocImplementsTag.kind;
  class: ExpressionWithTypeArguments & { expression: Identifier | PropertyAccessEntityNameExpression };
  createJSDocImplementsTag(classExpression: JSDocImplementsTag['class'], comment?: string) {
    const tag = createJSDocTag<JSDocImplementsTag>(Syntax.JSDocImplementsTag, 'implements', comment);
    tag.class = classExpression;
    return tag;
  }
}
export class JSDocNonNullableType extends JSDocType {
  static readonly kind = Syntax.JSDocNonNullableType;
  readonly kind = JSDocNonNullableType.kind;
  type: TypeNode;
}
export class JSDocNullableType extends JSDocType {
  static readonly kind = Syntax.JSDocNullableType;
  readonly kind = JSDocNullableType.kind;
  type: TypeNode;
}
export class JSDocOptionalType extends JSDocType {
  static readonly kind = Syntax.JSDocOptionalType;
  readonly kind = JSDocOptionalType.kind;
  type: TypeNode;
}
export class JSDocParameterTag extends JSDocPropertyLikeTag {
  static readonly kind = Syntax.JSDocParameterTag;
  readonly kind = JSDocParameterTag.kind;
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
export class JSDocPrivateTag extends JSDocTag {
  static readonly kind = Syntax.JSDocPrivateTag;
  readonly kind = JSDocPrivateTag.kind;
  createJSDocPrivateTag() {
    return createJSDocTag<JSDocPrivateTag>(Syntax.JSDocPrivateTag, 'private');
  }
}
export class JSDocPropertyLikeTag extends JSDocTag {
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
export class JSDocPropertyTag extends JSDocPropertyLikeTag {
  static readonly kind = Syntax.JSDocPropertyTag;
  readonly kind = JSDocPropertyTag.kind;
  createJSDocPropertyTag(typeExpression: JSDocTypeExpression | undefined, name: EntityName, isNameFirst: boolean, isBracketed: boolean, comment?: string) {
    return createJSDocPropertyLikeTag<JSDocPropertyTag>(Syntax.JSDocPropertyTag, 'param', typeExpression, name, isNameFirst, isBracketed, comment);
  }
}
export class JSDocProtectedTag extends JSDocTag {
  static readonly kind = Syntax.JSDocProtectedTag;
  readonly kind = JSDocProtectedTag.kind;
  createJSDocProtectedTag() {
    return createJSDocTag<JSDocProtectedTag>(Syntax.JSDocProtectedTag, 'protected');
  }
}
export class JSDocPublicTag extends JSDocTag {
  static readonly kind = Syntax.JSDocPublicTag;
  readonly kind = JSDocPublicTag.kind;
  createJSDocPublicTag() {
    return createJSDocTag<JSDocPublicTag>(Syntax.JSDocPublicTag, 'public');
  }
}
export class JSDocReadonlyTag extends JSDocTag {
  static readonly kind = Syntax.JSDocReadonlyTag;
  readonly kind = JSDocReadonlyTag.kind;
  createJSDocReadonlyTag() {
    return createJSDocTag<JSDocReadonlyTag>(Syntax.JSDocReadonlyTag, 'readonly');
  }
}
export class JSDocReturnTag extends JSDocTag {
  static readonly kind = Syntax.JSDocReturnTag;
  readonly kind = JSDocReturnTag.kind;
  typeExpression?: JSDocTypeExpression;
  createJSDocReturnTag(typeExpression?: JSDocTypeExpression, comment?: string): JSDocReturnTag {
    const tag = createJSDocTag<JSDocReturnTag>(Syntax.JSDocReturnTag, 'returns', comment);
    tag.typeExpression = typeExpression;
    return tag;
  }
}
export class JSDocSignature extends JSDocType {
  //}, Declaration {
  static readonly kind = Syntax.JSDocSignature;
  readonly kind = JSDocSignature.kind;
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
export class JSDocTag extends Node {
  parent: JSDoc | JSDocTypeLiteral;
  tagName: Identifier;
  comment?: string;
  createJSDocTag<T extends JSDocTag>(kind: T['kind'], tagName: string, comment?: string): T {
    const node = Node.createSynthesized(kind) as T;
    node.tagName = new Identifier(tagName);
    node.comment = comment;
    return node;
  }
}
export class JSDocTemplateTag extends JSDocTag {
  static readonly kind = Syntax.JSDocTemplateTag;
  readonly kind = JSDocTemplateTag.kind;
  constraint: JSDocTypeExpression | undefined;
  typeParameters: Nodes<TypeParameterDeclaration>;
  createJSDocTemplateTag(constraint: JSDocTypeExpression | undefined, typeParameters: readonly TypeParameterDeclaration[], comment?: string) {
    const tag = createJSDocTag<JSDocTemplateTag>(Syntax.JSDocTemplateTag, 'template', comment);
    tag.constraint = constraint;
    tag.typeParameters = Nodes.from(typeParameters);
    return tag;
  }
}
export class JSDocThisTag extends JSDocTag {
  static readonly kind = Syntax.JSDocThisTag;
  readonly kind = JSDocThisTag.kind;
  typeExpression?: JSDocTypeExpression;
  createJSDocThisTag(typeExpression?: JSDocTypeExpression): JSDocThisTag {
    const tag = createJSDocTag<JSDocThisTag>(Syntax.JSDocThisTag, 'this');
    tag.typeExpression = typeExpression;
    return tag;
  }
}
export class JSDocTypedefTag extends JSDocTag {
  //, NamedDeclaration {
  static readonly kind = Syntax.JSDocTypedefTag;
  readonly kind = JSDocTypedefTag.kind;
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
export class JSDocTypeExpression extends TypeNode {
  static readonly kind = Syntax.JSDocTypeExpression;
  readonly kind = JSDocTypeExpression.kind;
  type: TypeNode;
  createJSDocTypeExpression(type: TypeNode): JSDocTypeExpression {
    const node = Node.createSynthesized(Syntax.JSDocTypeExpression) as JSDocTypeExpression;
    node.type = type;
    return node;
  }
}
export class JSDocTypeLiteral extends JSDocType {
  static readonly kind = Syntax.JSDocTypeLiteral;
  readonly kind = JSDocTypeLiteral.kind;
  jsDocPropertyTags?: readonly JSDocPropertyLikeTag[];
  isArrayType?: boolean;
  createJSDocTypeLiteral(jsDocPropertyTags?: readonly JSDocPropertyLikeTag[], isArrayType?: boolean) {
    const tag = Node.createSynthesized(Syntax.JSDocTypeLiteral) as JSDocTypeLiteral;
    tag.jsDocPropertyTags = jsDocPropertyTags;
    tag.isArrayType = isArrayType;
    return tag;
  }
}
export class JSDocTypeTag extends JSDocTag {
  static readonly kind = Syntax.JSDocTypeTag;
  readonly kind = JSDocTypeTag.kind;
  typeExpression: JSDocTypeExpression;
  createJSDocTypeTag(typeExpression: JSDocTypeExpression, comment?: string): JSDocTypeTag {
    const tag = createJSDocTag<JSDocTypeTag>(Syntax.JSDocTypeTag, 'type', comment);
    tag.typeExpression = typeExpression;
    return tag;
  }
}
export class JSDocUnknownType extends JSDocType {
  static readonly kind = Syntax.JSDocUnknownType;
  readonly kind = JSDocUnknownType.kind;
}
export class JSDocVariadicType extends JSDocType {
  static readonly kind = Syntax.JSDocVariadicType;
  readonly kind = JSDocVariadicType.kind;
  type: TypeNode;
  createJSDocVariadicType(type: TypeNode): JSDocVariadicType {
    const node = Node.createSynthesized(Syntax.JSDocVariadicType) as JSDocVariadicType;
    node.type = type;
    return node;
  }
  updateJSDocVariadicType(node: JSDocVariadicType, type: TypeNode): JSDocVariadicType {
    return node.type !== type ? updateNode(createJSDocVariadicType(type), node) : node;
  }
}
export class JsxAttribute extends ObjectLiteralElement {
  static readonly kind = Syntax.JsxAttribute;
  readonly kind = JsxAttribute.kind;
  parent: JsxAttributes;
  name: Identifier;
  initializer?: StringLiteral | JsxExpression;
  createJsxAttribute(name: Identifier, initializer: StringLiteral | JsxExpression) {
    const node = <JsxAttribute>Node.createSynthesized(Syntax.JsxAttribute);
    node.name = name;
    node.initializer = initializer;
    return node;
  }
  updateJsxAttribute(node: JsxAttribute, name: Identifier, initializer: StringLiteral | JsxExpression) {
    return node.name !== name || node.initializer !== initializer ? updateNode(createJsxAttribute(name, initializer), node) : node;
  }
}
export class JsxAttributes extends ObjectLiteralExpressionBase<JsxAttributeLike> {
  static readonly kind = Syntax.JsxAttributes;
  readonly kind = JsxAttributes.kind;
  parent: JsxOpeningLikeElement;
  createJsxAttributes(properties: readonly JsxAttributeLike[]) {
    const node = <JsxAttributes>Node.createSynthesized(Syntax.JsxAttributes);
    node.properties = new Nodes(properties);
    return node;
  }
  updateJsxAttributes(node: JsxAttributes, properties: readonly JsxAttributeLike[]) {
    return node.properties !== properties ? updateNode(createJsxAttributes(properties), node) : node;
  }
}
export class JsxClosingElement extends Node {
  static readonly kind = Syntax.JsxClosingElement;
  readonly kind = JsxClosingElement.kind;
  parent: JsxElement;
  tagName: JsxTagNameExpression;
  createJsxClosingElement(tagName: JsxTagNameExpression) {
    const node = <JsxClosingElement>Node.createSynthesized(Syntax.JsxClosingElement);
    node.tagName = tagName;
    return node;
  }
  updateJsxClosingElement(node: JsxClosingElement, tagName: JsxTagNameExpression) {
    return node.tagName !== tagName ? updateNode(createJsxClosingElement(tagName), node) : node;
  }
}
export class JsxClosingFragment extends Expression {
  static readonly kind = Syntax.JsxClosingFragment;
  readonly kind = JsxClosingFragment.kind;
  parent: JsxFragment;
  createJsxJsxClosingFragment() {
    return <JsxClosingFragment>Node.createSynthesized(Syntax.JsxClosingFragment);
  }
}
export class JsxElement extends PrimaryExpression {
  static readonly kind = Syntax.JsxElement;
  readonly kind = JsxElement.kind;
  openingElement: JsxOpeningElement;
  children: Nodes<JsxChild>;
  closingElement: JsxClosingElement;
  createJsxElement(openingElement: JsxOpeningElement, children: readonly JsxChild[], closingElement: JsxClosingElement) {
    const node = <JsxElement>Node.createSynthesized(Syntax.JsxElement);
    node.openingElement = openingElement;
    node.children = new Nodes(children);
    node.closingElement = closingElement;
    return node;
  }
  updateJsxElement(node: JsxElement, openingElement: JsxOpeningElement, children: readonly JsxChild[], closingElement: JsxClosingElement) {
    return node.openingElement !== openingElement || node.children !== children || node.closingElement !== closingElement
      ? updateNode(createJsxElement(openingElement, children, closingElement), node)
      : node;
  }
  createExpressionForJsxElement(
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
export class JsxExpression extends Expression {
  static readonly kind = Syntax.JsxExpression;
  readonly kind = JsxExpression.kind;
  parent: JsxElement | JsxAttributeLike;
  dot3Token?: Token<Syntax.Dot3Token>;
  expression?: Expression;
  createJsxExpression(dot3Token: Dot3Token | undefined, expression: Expression | undefined) {
    const node = <JsxExpression>Node.createSynthesized(Syntax.JsxExpression);
    node.dot3Token = dot3Token;
    node.expression = expression;
    return node;
  }
  updateJsxExpression(node: JsxExpression, expression: Expression | undefined) {
    return node.expression !== expression ? updateNode(createJsxExpression(node.dot3Token, expression), node) : node;
  }
}
export class JsxFragment extends PrimaryExpression {
  static readonly kind = Syntax.JsxFragment;
  readonly kind = JsxFragment.kind;
  openingFragment: JsxOpeningFragment;
  children: Nodes<JsxChild>;
  closingFragment: JsxClosingFragment;
  createJsxFragment(openingFragment: JsxOpeningFragment, children: readonly JsxChild[], closingFragment: JsxClosingFragment) {
    const node = <JsxFragment>Node.createSynthesized(Syntax.JsxFragment);
    node.openingFragment = openingFragment;
    node.children = new Nodes(children);
    node.closingFragment = closingFragment;
    return node;
  }
  updateJsxFragment(node: JsxFragment, openingFragment: JsxOpeningFragment, children: readonly JsxChild[], closingFragment: JsxClosingFragment) {
    return node.openingFragment !== openingFragment || node.children !== children || node.closingFragment !== closingFragment
      ? updateNode(createJsxFragment(openingFragment, children, closingFragment), node)
      : node;
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
export class JsxOpeningElement extends Expression {
  static readonly kind = Syntax.JsxOpeningElement;
  readonly kind = JsxOpeningElement.kind;
  parent: JsxElement;
  tagName: JsxTagNameExpression;
  typeArguments?: Nodes<TypeNode>;
  attributes: JsxAttributes;
  createJsxOpeningElement(tagName: JsxTagNameExpression, typeArguments: readonly TypeNode[] | undefined, attributes: JsxAttributes) {
    const node = <JsxOpeningElement>Node.createSynthesized(Syntax.JsxOpeningElement);
    node.tagName = tagName;
    node.typeArguments = Nodes.from(typeArguments);
    node.attributes = attributes;
    return node;
  }
  updateJsxOpeningElement(node: JsxOpeningElement, tagName: JsxTagNameExpression, typeArguments: readonly TypeNode[] | undefined, attributes: JsxAttributes) {
    return node.tagName !== tagName || node.typeArguments !== typeArguments || node.attributes !== attributes ? updateNode(createJsxOpeningElement(tagName, typeArguments, attributes), node) : node;
  }
}
export class JsxOpeningFragment extends Expression {
  static readonly kind = Syntax.JsxOpeningFragment;
  readonly kind = JsxOpeningFragment.kind;
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
    } else {
      return createReactNamespace(idText(jsxFactory), parent);
    }
  }
  createJsxFactoryExpression(jsxFactoryEntity: EntityName | undefined, reactNamespace: string, parent: JsxOpeningLikeElement | JsxOpeningFragment): Expression {
    return jsxFactoryEntity ? createJsxFactoryExpressionFromEntityName(jsxFactoryEntity, parent) : createPropertyAccess(createReactNamespace(reactNamespace, parent), 'createElement');
  }
}
export class JsxSelfClosingElement extends PrimaryExpression {
  static readonly kind = Syntax.JsxSelfClosingElement;
  readonly kind = JsxSelfClosingElement.kind;
  tagName: JsxTagNameExpression;
  typeArguments?: Nodes<TypeNode>;
  attributes: JsxAttributes;
  createJsxSelfClosingElement(tagName: JsxTagNameExpression, typeArguments: readonly TypeNode[] | undefined, attributes: JsxAttributes) {
    const node = <JsxSelfClosingElement>Node.createSynthesized(Syntax.JsxSelfClosingElement);
    node.tagName = tagName;
    node.typeArguments = Nodes.from(typeArguments);
    node.attributes = attributes;
    return node;
  }
  updateJsxSelfClosingElement(node: JsxSelfClosingElement, tagName: JsxTagNameExpression, typeArguments: readonly TypeNode[] | undefined, attributes: JsxAttributes) {
    return node.tagName !== tagName || node.typeArguments !== typeArguments || node.attributes !== attributes
      ? updateNode(createJsxSelfClosingElement(tagName, typeArguments, attributes), node)
      : node;
  }
}
export class JsxSpreadAttribute extends ObjectLiteralElement {
  static readonly kind = Syntax.JsxSpreadAttribute;
  readonly kind = JsxSpreadAttribute.kind;
  parent: JsxAttributes;
  expression: Expression;
  createJsxSpreadAttribute(expression: Expression) {
    const node = <JsxSpreadAttribute>Node.createSynthesized(Syntax.JsxSpreadAttribute);
    node.expression = expression;
    return node;
  }
  updateJsxSpreadAttribute(node: JsxSpreadAttribute, expression: Expression) {
    return node.expression !== expression ? updateNode(createJsxSpreadAttribute(expression), node) : node;
  }
}
export class JsxText extends LiteralLikeNode {
  static readonly kind = Syntax.JsxText;
  readonly kind = JsxText.kind;
  onlyTriviaWhitespaces: boolean;
  parent: JsxElement;
  create(t: string, onlyTriviaWhitespaces?: boolean) {
    const n = Node.createSynthesized(Syntax.JsxText);
    n.text = t;
    n.onlyTriviaWhitespaces = !!onlyTriviaWhitespaces;
    return n;
  }
  updateJsxText(node: JsxText, text: string, onlyTriviaWhitespaces?: boolean) {
    return node.text !== text || node.onlyTriviaWhitespaces !== onlyTriviaWhitespaces ? updateNode(JsxText.create(text, onlyTriviaWhitespaces), node) : node;
  }
}
export class KeywordTypeNode extends TypeNode {
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
  create(k: KeywordTypeNode['kind']) {
    return Node.createSynthesized(k) as KeywordTypeNode;
  }
}
export class LabeledStatement extends Statement {
  //, JSDocContainer {
  static readonly kind = Syntax.LabeledStatement;
  readonly kind = LabeledStatement.kind;
  label: Identifier;
  statement: Statement;
  createLabel(label: string | Identifier, statement: Statement) {
    const node = <LabeledStatement>Node.createSynthesized(Syntax.LabeledStatement);
    node.label = asName(label);
    node.statement = asEmbeddedStatement(statement);
    return node;
  }
  updateLabel(node: LabeledStatement, label: Identifier, statement: Statement) {
    return node.label !== label || node.statement !== statement ? updateNode(createLabel(label, statement), node) : node;
  }
}
export class LiteralTypeNode extends TypeNode {
  static readonly kind = Syntax.LiteralType;
  readonly kind = LiteralTypeNode.kind;
  literal: BooleanLiteral | LiteralExpression | PrefixUnaryExpression;
  create(l: LiteralTypeNode['literal']) {
    const n = Node.createSynthesized(Syntax.LiteralType);
    n.literal = l;
    return n;
  }
  update(n: LiteralTypeNode, l: LiteralTypeNode['literal']) {
    return n.literal !== l ? updateNode(create(l), n) : n;
  }
}
export class MappedTypeNode extends TypeNode {
  //, Declaration {
  static readonly kind = Syntax.MappedType;
  readonly kind = MappedTypeNode.kind;
  readonlyToken?: ReadonlyToken | PlusToken | MinusToken;
  typeParameter: TypeParameterDeclaration;
  questionToken?: QuestionToken | PlusToken | MinusToken;
  type?: TypeNode;
  create(r: ReadonlyToken | PlusToken | MinusToken | undefined, p: TypeParameterDeclaration, q?: QuestionToken | PlusToken | MinusToken, t?: TypeNode) {
    const n = Node.createSynthesized(Syntax.MappedType);
    n.readonlyToken = r;
    n.typeParameter = p;
    n.questionToken = q;
    n.type = t;
    return n;
  }
  update(n: MappedTypeNode, r: ReadonlyToken | PlusToken | MinusToken | undefined, p: TypeParameterDeclaration, q?: QuestionToken | PlusToken | MinusToken, t?: TypeNode) {
    return n.readonlyToken !== r || n.typeParameter !== p || n.questionToken !== q || n.type !== t ? updateNode(create(r, p, q, t), n) : n;
  }
}
export class MergeDeclarationMarker extends Statement {
  static readonly kind: Syntax.MergeDeclarationMarker;
  readonly kind = MergeDeclarationMarker.kind;
  createMergeDeclarationMarker(original: Node) {
    const node = <MergeDeclarationMarker>Node.createSynthesized(Syntax.MergeDeclarationMarker);
    node.emitNode = {} as EmitNode;
    node.original = original;
    return node;
  }
}
export class MetaProperty extends PrimaryExpression {
  static readonly kind = Syntax.MetaProperty;
  readonly kind = MetaProperty.kind;
  keywordToken: Syntax.NewKeyword | Syntax.ImportKeyword;
  name: Identifier;
  createMetaProperty(keywordToken: MetaProperty['keywordToken'], name: Identifier) {
    const node = <MetaProperty>Node.createSynthesized(Syntax.MetaProperty);
    node.keywordToken = keywordToken;
    node.name = name;
    return node;
  }
  updateMetaProperty(node: MetaProperty, name: Identifier) {
    return node.name !== name ? updateNode(createMetaProperty(node.keywordToken, name), node) : node;
  }
}

export class MethodDeclaration extends Node {
  //FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
  static readonly kind = Syntax.MethodDeclaration;
  readonly kind = MethodDeclaration.kind;
  parent: ClassLikeDeclaration | ObjectLiteralExpression;
  name: PropertyName;
  body?: FunctionBody;
  create(
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
    const n = Node.createSynthesized(Syntax.MethodDeclaration);
    n.decorators = Nodes.from(ds);
    n.modifiers = Nodes.from(ms);
    n.asteriskToken = a;
    n.name = asName(p);
    n.questionToken = q;
    n.typeParameters = Nodes.from(ts);
    n.parameters = new Nodes(ps);
    n.type = t;
    n.body = b;
    return n;
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
    return n.decorators !== ds || n.modifiers !== ms || n.asteriskToken !== a || n.name !== p || n.questionToken !== q || n.typeParameters !== ts || n.parameters !== ps || n.type !== t || n.body !== b
      ? updateNode(create(ds, ms, a, p, q, ts, ps, t, b), n)
      : n;
  }
}
export class MethodSignature extends Node {
  //SignatureDeclarationBase, TypeElement {
  static readonly kind = Syntax.MethodSignature;
  readonly kind = MethodSignature.kind;
  parent: ObjectTypeDeclaration;
  name: PropertyName;
  create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t: TypeNode | undefined, p: string | PropertyName, q?: QuestionToken) {
    const n = SignatureDeclaration.create(Syntax.MethodSignature, ts, ps, t) as MethodSignature;
    n.name = asName(p);
    n.questionToken = q;
    return n;
  }
  update(n: MethodSignature, ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t: TypeNode | undefined, p: PropertyName, q?: QuestionToken) {
    return n.typeParameters !== ts || n.parameters !== ps || n.type !== t || n.name !== p || n.questionToken !== q ? updateNode(create(ts, ps, t, p, q), n) : n;
  }
}
export class MissingDeclaration extends DeclarationStatement {
  static readonly kind = Syntax.MissingDeclaration;
  readonly kind = MissingDeclaration.kind;
  name?: Identifier;
}
export class ModuleBlock extends Node {
  //}, Statement {
  static readonly kind = Syntax.ModuleBlock;
  readonly kind = ModuleBlock.kind;
  parent: ModuleDeclaration;
  statements: Nodes<Statement>;
  createModuleBlock(statements: readonly Statement[]) {
    const node = <ModuleBlock>Node.createSynthesized(Syntax.ModuleBlock);
    node.statements = new Nodes(statements);
    return node;
  }
  updateModuleBlock(node: ModuleBlock, statements: readonly Statement[]) {
    return node.statements !== statements ? updateNode(createModuleBlock(statements), node) : node;
  }
}
export class ModuleDeclaration extends DeclarationStatement {
  //}, JSDocContainer {
  static readonly kind = Syntax.ModuleDeclaration;
  readonly kind = ModuleDeclaration.kind;
  parent: ModuleBody | SourceFile;
  name: ModuleName;
  body?: ModuleBody | JSDocNamespaceDeclaration;
  createModuleDeclaration(decorators: readonly Decorator[] | undefined, modifiers: readonly Modifier[] | undefined, name: ModuleName, body: ModuleBody | undefined, flags = NodeFlags.None) {
    const node = <ModuleDeclaration>Node.createSynthesized(Syntax.ModuleDeclaration);
    node.flags |= flags & (NodeFlags.Namespace | NodeFlags.NestedNamespace | NodeFlags.GlobalAugmentation);
    node.decorators = Nodes.from(decorators);
    node.modifiers = Nodes.from(modifiers);
    node.name = name;
    node.body = body;
    return node;
  }
  updateModuleDeclaration(node: ModuleDeclaration, decorators: readonly Decorator[] | undefined, modifiers: readonly Modifier[] | undefined, name: ModuleName, body: ModuleBody | undefined) {
    return node.decorators !== decorators || node.modifiers !== modifiers || node.name !== name || node.body !== body
      ? updateNode(createModuleDeclaration(decorators, modifiers, name, body, node.flags), node)
      : node;
  }
}
export class NamedExports extends Node {
  static readonly kind = Syntax.NamedExports;
  readonly kind = NamedExports.kind;
  parent: ExportDeclaration;
  elements: Nodes<ExportSpecifier>;
  createNamedExports(elements: readonly ExportSpecifier[]) {
    const node = <NamedExports>Node.createSynthesized(Syntax.NamedExports);
    node.elements = new Nodes(elements);
    return node;
  }
  updateNamedExports(node: NamedExports, elements: readonly ExportSpecifier[]) {
    return node.elements !== elements ? updateNode(createNamedExports(elements), node) : node;
  }
}
export class NamedImports extends Node {
  static readonly kind = Syntax.NamedImports;
  readonly kind = NamedImports.kind;
  parent: ImportClause;
  elements: Nodes<ImportSpecifier>;
  createNamedImports(elements: readonly ImportSpecifier[]): NamedImports {
    const node = <NamedImports>Node.createSynthesized(Syntax.NamedImports);
    node.elements = new Nodes(elements);
    return node;
  }
  updateNamedImports(node: NamedImports, elements: readonly ImportSpecifier[]) {
    return node.elements !== elements ? updateNode(createNamedImports(elements), node) : node;
  }
}
export class NamedTupleMember extends TypeNode {
  //, JSDocContainer, Declaration {
  static readonly kind = Syntax.NamedTupleMember;
  readonly kind = NamedTupleMember.kind;
  dot3Token?: Token<Syntax.Dot3Token>;
  name: Identifier;
  questionToken?: Token<Syntax.QuestionToken>;
  type: TypeNode;
  create(d: Token<Syntax.Dot3Token> | undefined, i: Identifier, q: Token<Syntax.QuestionToken> | undefined, t: TypeNode) {
    const n = Node.createSynthesized(Syntax.NamedTupleMember);
    n.dot3Token = d;
    n.name = i;
    n.questionToken = q;
    n.type = t;
    return n;
  }
  update(n: NamedTupleMember, d: Token<Syntax.Dot3Token> | undefined, i: Identifier, q: Token<Syntax.QuestionToken> | undefined, t: TypeNode) {
    return n.dot3Token !== d || n.name !== i || n.questionToken !== q || n.type !== t ? updateNode(create(d, i, q, t), n) : n;
  }
}
export class NamespaceExport extends NamedDeclaration {
  static readonly kind = Syntax.NamespaceExport;
  readonly kind = NamespaceExport.kind;
  parent: ExportDeclaration;
  name: Identifier;
  createNamespaceExport(name: Identifier): NamespaceExport {
    const node = <NamespaceExport>Node.createSynthesized(Syntax.NamespaceExport);
    node.name = name;
    return node;
  }
  updateNamespaceExport(node: NamespaceExport, name: Identifier) {
    return node.name !== name ? updateNode(createNamespaceExport(name), node) : node;
  }
}
export class NamespaceExportDeclaration extends DeclarationStatement {
  static readonly kind = Syntax.NamespaceExportDeclaration;
  readonly kind = NamespaceExportDeclaration.kind;
  name: Identifier;
  createNamespaceExportDeclaration(name: string | Identifier) {
    const node = <NamespaceExportDeclaration>Node.createSynthesized(Syntax.NamespaceExportDeclaration);
    node.name = asName(name);
    return node;
  }
  updateNamespaceExportDeclaration(node: NamespaceExportDeclaration, name: Identifier) {
    return node.name !== name ? updateNode(createNamespaceExportDeclaration(name), node) : node;
  }
}
export class NamespaceImport extends NamedDeclaration {
  static readonly kind = Syntax.NamespaceImport;
  readonly kind = NamespaceImport.kind;
  parent: ImportClause;
  name: Identifier;
  createNamespaceImport(name: Identifier): NamespaceImport {
    const node = <NamespaceImport>Node.createSynthesized(Syntax.NamespaceImport);
    node.name = name;
    return node;
  }
  updateNamespaceImport(node: NamespaceImport, name: Identifier) {
    return node.name !== name ? updateNode(createNamespaceImport(name), node) : node;
  }
}
export class NewExpression extends PrimaryExpression {
  //}, Declaration {
  static readonly kind = Syntax.NewExpression;
  readonly kind = NewExpression.kind;
  expression: LeftHandSideExpression;
  typeArguments?: Nodes<TypeNode>;
  arguments?: Nodes<Expression>;
  createNew(expression: Expression, typeArguments: readonly TypeNode[] | undefined, argumentsArray: readonly Expression[] | undefined) {
    const node = <NewExpression>Node.createSynthesized(Syntax.NewExpression);
    node.expression = parenthesizeForNew(expression);
    node.typeArguments = Nodes.from(typeArguments);
    node.arguments = argumentsArray ? parenthesize.listElements(new Nodes(argumentsArray)) : undefined;
    return node;
  }
  updateNew(node: NewExpression, expression: Expression, typeArguments: readonly TypeNode[] | undefined, argumentsArray: readonly Expression[] | undefined) {
    return node.expression !== expression || node.typeArguments !== typeArguments || node.arguments !== argumentsArray ? updateNode(createNew(expression, typeArguments, argumentsArray), node) : node;
  }
}
export class NonNullChain {
  createNonNullChain(expression: Expression) {
    const node = <NonNullChain>Node.createSynthesized(Syntax.NonNullExpression);
    node.flags |= NodeFlags.OptionalChain;
    node.expression = parenthesize.forAccess(expression);
    return node;
  }
  updateNonNullChain(node: NonNullChain, expression: Expression) {
    assert(!!(node.flags & NodeFlags.OptionalChain), 'Cannot update a NonNullExpression using updateNonNullChain. Use updateNonNullExpression instead.');
    return node.expression !== expression ? updateNode(createNonNullChain(expression), node) : node;
  }
}
export class NonNullExpression extends LeftHandSideExpression implements qt.NonNullExpression {
  static readonly kind = Syntax.NonNullExpression;
  expression: Expression;
  constructor(e: Expression) {
    super(true);
    this.expression = parenthesize.forAccess(e);
  }
  update(e: Expression) {
    if (Node.is.nonNullChain(this)) return updateNonNullChain(this, e);
    return this.expression !== e ? new NonNullExpression(e).updateFrom(this) : this;
  }
}
NonNullExpression.prototype.kind = NonNullExpression.kind;

export class NoSubstitutionLiteral extends LiteralExpression {
  //, TemplateLiteralLikeNode, Declaration {
  static readonly kind = Syntax.NoSubstitutionLiteral;
  readonly kind = NoSubstitutionLiteral.kind;
  templateFlags?: TokenFlags;
  create(t: string, raw?: string) {
    return Node.createTemplateLiteralLike(Syntax.NoSubstitutionLiteral, t, raw) as NoSubstitutionLiteral;
  }
}
export class NotEmittedStatement extends Statement {
  static readonly kind = Syntax.NotEmittedStatement;
  readonly kind = NotEmittedStatement.kind;
  createNotEmittedStatement(original: Node) {
    const node = <NotEmittedStatement>Node.createSynthesized(Syntax.NotEmittedStatement);
    node.original = original;
    setRange(node, original);
    return node;
  }
}
export class NumericLiteral extends LiteralExpression {
  //, Declaration {
  static readonly kind = Syntax.NumericLiteral;
  readonly kind = NumericLiteral.kind;
  numericLiteralFlags: TokenFlags;
  create(t: string, fs: TokenFlags = TokenFlags.None) {
    const n = Node.createSynthesized(Syntax.NumericLiteral);
    n.text = t;
    n.numericLiteralFlags = fs;
    return n;
  }
  name(name: string | __String) {
    return (+name).toString() === name;
  }
}
export class ObjectBindingPattern extends Node {
  static readonly kind = Syntax.ObjectBindingPattern;
  readonly kind = ObjectBindingPattern.kind;
  parent: VariableDeclaration | ParameterDeclaration | BindingElement;
  elements: Nodes<BindingElement>;
  create(es: readonly BindingElement[]) {
    const n = Node.createSynthesized(Syntax.ObjectBindingPattern);
    n.elements = new Nodes(es);
    return n;
  }
  update(n: ObjectBindingPattern, es: readonly BindingElement[]) {
    return n.elements !== es ? updateNode(create(es), n) : n;
  }
}
export class ObjectLiteralExpression extends ObjectLiteralExpressionBase<ObjectLiteralElementLike> {
  static readonly kind = Syntax.ObjectLiteralExpression;
  readonly kind = ObjectLiteralExpression.kind;
  multiLine?: boolean;
  createObjectLiteral(properties?: readonly ObjectLiteralElementLike[], multiLine?: boolean) {
    const node = <ObjectLiteralExpression>Node.createSynthesized(Syntax.ObjectLiteralExpression);
    node.properties = new Nodes(properties);
    if (multiLine) node.multiLine = true;
    return node;
  }
  updateObjectLiteral(node: ObjectLiteralExpression, properties: readonly ObjectLiteralElementLike[]) {
    return node.properties !== properties ? updateNode(createObjectLiteral(properties, node.multiLine), node) : node;
  }
}
export class OmittedExpression extends Expression {
  static readonly kind = Syntax.OmittedExpression;
  readonly kind = OmittedExpression.kind;
  createOmittedExpression() {
    return <OmittedExpression>Node.createSynthesized(Syntax.OmittedExpression);
  }
}
export class OptionalTypeNode extends TypeNode {
  static readonly kind = Syntax.OptionalType;
  readonly kind = OptionalTypeNode.kind;
  type: TypeNode;
  create(t: TypeNode) {
    const n = Node.createSynthesized(Syntax.OptionalType);
    n.type = parenthesize.arrayTypeMember(t);
    return n;
  }
  update(n: OptionalTypeNode, t: TypeNode): OptionalTypeNode {
    return n.type !== t ? updateNode(create(t), n) : n;
  }
}
export namespace OuterExpression {
  export function isOuterExpression(node: Node, kinds = OuterExpressionKinds.All): node is OuterExpression {
    switch (node.kind) {
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
  export function skipOuterExpressions(node: Expression, kinds?: OuterExpressionKinds): Expression;
  export function skipOuterExpressions(node: Node, kinds?: OuterExpressionKinds): Node;
  export function skipOuterExpressions(node: Node, kinds = OuterExpressionKinds.All) {
    while (isOuterExpression(node, kinds)) {
      node = node.expression;
    }
    return node;
  }
  export function skipAssertions(node: Expression): Expression;
  export function skipAssertions(node: Node): Node;
  export function skipAssertions(node: Node): Node {
    return skipOuterExpressions(node, OuterExpressionKinds.Assertions);
  }
  export function updateOuterExpression(o: OuterExpression, e: Expression) {
    switch (o.kind) {
      case Syntax.ParenthesizedExpression:
        return updateParen(o, e);
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
  export function isIgnorableParen(node: Expression) {
    return (
      node.kind === Syntax.ParenthesizedExpression &&
      isSynthesized(node) &&
      isSynthesized(getSourceMapRange(node)) &&
      isSynthesized(getCommentRange(node)) &&
      !some(getSyntheticLeadingComments(node)) &&
      !some(getSyntheticTrailingComments(node))
    );
  }
  export function recreateOuterExpressions(outerExpression: Expression | undefined, innerExpression: Expression, kinds = OuterExpressionKinds.All): Expression {
    if (outerExpression && isOuterExpression(outerExpression, kinds) && !isIgnorableParen(outerExpression)) {
      return updateOuterExpression(outerExpression, recreateOuterExpressions(outerExpression.expression, innerExpression));
    }
    return innerExpression;
  }
}
export class ParameterDeclaration extends NamedDeclaration implements qt.ParameterDeclaration {
  //}, JSDocContainer {
  static readonly kind = Syntax.Parameter;
  readonly kind = ParameterDeclaration.kind;
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
    const node = <ParameterDeclaration>Node.createSynthesized(Syntax.Parameter);
    node.decorators = Nodes.from(decorators);
    node.modifiers = Nodes.from(modifiers);
    node.dot3Token = dot3Token;
    node.name = asName(name);
    node.questionToken = questionToken;
    node.type = type;
    node.initializer = initializer ? parenthesizeExpressionForList(initializer) : undefined;
    return node;
  }
  updateParameter(
    node: ParameterDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    dot3Token: Dot3Token | undefined,
    name: string | BindingName,
    questionToken: QuestionToken | undefined,
    type: TypeNode | undefined,
    initializer: Expression | undefined
  ) {
    return node.decorators !== decorators ||
      node.modifiers !== modifiers ||
      node.dot3Token !== dot3Token ||
      node.name !== name ||
      node.questionToken !== questionToken ||
      node.type !== type ||
      node.initializer !== initializer
      ? updateNode(createParameter(decorators, modifiers, dot3Token, name, questionToken, type, initializer), node)
      : node;
  }
}
export class ParenthesizedExpression extends PrimaryExpression {
  //}, JSDocContainer {
  static readonly kind = Syntax.ParenthesizedExpression;
  readonly kind = ParenthesizedExpression.kind;
  expression: Expression;
  createParen(expression: Expression) {
    const node = <ParenthesizedExpression>Node.createSynthesized(Syntax.ParenthesizedExpression);
    node.expression = expression;
    return node;
  }
  updateParen(node: ParenthesizedExpression, expression: Expression) {
    return node.expression !== expression ? updateNode(createParen(expression), node) : node;
  }
}
export class ParenthesizedTypeNode extends TypeNode {
  static readonly kind = Syntax.ParenthesizedType;
  readonly kind = ParenthesizedTypeNode.kind;
  type: TypeNode;
  create(t: TypeNode) {
    const n = Node.createSynthesized(Syntax.ParenthesizedType);
    n.type = t;
    return n;
  }
  update(n: ParenthesizedTypeNode, t: TypeNode) {
    return n.type !== t ? updateNode(create(t), n) : n;
  }
}
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
    node.operand = parenthesize.postfixOperand(e);
    node.operator = o;
  }
  update(e: Expression) {
    return node.operand !== e ? new PostfixUnaryExpression(e, this.operator).updateFrom(this) : this;
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
    node.operator = o;
    node.operand = parenthesize.prefixOperand(e);
  }
  update(e: Expression) {
    return this.operand !== e ? new PrefixUnaryExpression(this.operator, e).updateFrom(this) : this;
  }
}
PrefixUnaryExpression.prototype.kind = PrefixUnaryExpression.kind;

export class PropertyAccessChain {
  createPropertyAccessChain(expression: Expression, questionDotToken: QuestionDotToken | undefined, name: string | Identifier) {
    const node = <PropertyAccessChain>Node.createSynthesized(Syntax.PropertyAccessExpression);
    node.flags |= NodeFlags.OptionalChain;
    node.expression = parenthesize.forAccess(expression);
    node.questionDotToken = questionDotToken;
    node.name = asName(name);
    setEmitFlags(node, EmitFlags.NoIndentation);
    return node;
  }
  updatePropertyAccessChain(node: PropertyAccessChain, expression: Expression, questionDotToken: QuestionDotToken | undefined, name: Identifier) {
    assert(!!(node.flags & NodeFlags.OptionalChain), 'Cannot update a PropertyAccessExpression using updatePropertyAccessChain. Use updatePropertyAccess instead.');
    return node.expression !== expression || node.questionDotToken !== questionDotToken || node.name !== name
      ? updateNode(setEmitFlags(createPropertyAccessChain(expression, questionDotToken, name), Node.get.emitFlags(node)), node)
      : node;
  }
}
export class PropertyAccessExpression extends MemberExpression {
  //}, NamedDeclaration {
  static readonly kind = Syntax.PropertyAccessExpression;
  readonly kind = PropertyAccessExpression.kind;
  expression: LeftHandSideExpression;
  questionDotToken?: QuestionDotToken;
  name: Identifier | PrivateIdentifier;
  createPropertyAccess(expression: Expression, name: string | Identifier | PrivateIdentifier) {
    const node = <PropertyAccessExpression>Node.createSynthesized(Syntax.PropertyAccessExpression);
    node.expression = parenthesize.forAccess(expression);
    node.name = asName(name);
    setEmitFlags(node, EmitFlags.NoIndentation);
    return node;
  }
  updatePropertyAccess(node: PropertyAccessExpression, expression: Expression, name: Identifier | PrivateIdentifier) {
    if (Node.is.propertyAccessChain(node)) {
      return updatePropertyAccessChain(node, expression, node.questionDotToken, cast(name, isIdentifier));
    }
    return node.expression !== expression || node.name !== name ? updateNode(setEmitFlags(createPropertyAccess(expression, name), Node.get.emitFlags(node)), node) : node;
  }
}
export class PropertyAssignment extends ObjectLiteralElement {
  //}, JSDocContainer {
  static readonly kind = Syntax.PropertyAssignment;
  readonly kind = PropertyAssignment.kind;
  parent: ObjectLiteralExpression;
  name: PropertyName;
  questionToken?: QuestionToken;
  initializer: Expression;
  createPropertyAssignment(name: string | PropertyName, initializer: Expression) {
    const node = <PropertyAssignment>Node.createSynthesized(Syntax.PropertyAssignment);
    node.name = asName(name);
    node.questionToken = undefined;
    node.initializer = parenthesizeExpressionForList(initializer);
    return node;
  }
  updatePropertyAssignment(node: PropertyAssignment, name: PropertyName, initializer: Expression) {
    return node.name !== name || node.initializer !== initializer ? updateNode(createPropertyAssignment(name, initializer), node) : node;
  }
}
export class PropertyDeclaration extends ClassElement {
  //}, JSDocContainer {
  static readonly kind = Syntax.PropertyDeclaration;
  readonly kind = PropertyDeclaration.kind;
  parent: ClassLikeDeclaration;
  name: PropertyName;
  questionToken?: QuestionToken;
  exclamationToken?: ExclamationToken;
  type?: TypeNode;
  initializer?: Expression;
  create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | PropertyName, q?: QuestionToken | ExclamationToken, t?: TypeNode, i?: Expression) {
    const n = Node.createSynthesized(Syntax.PropertyDeclaration);
    n.decorators = Nodes.from(ds);
    n.modifiers = Nodes.from(ms);
    n.name = asName(p);
    n.questionToken = q !== undefined && q.kind === Syntax.QuestionToken ? q : undefined;
    n.exclamationToken = q !== undefined && q.kind === Syntax.ExclamationToken ? q : undefined;
    n.type = t;
    n.initializer = i;
    return n;
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
    return n.decorators !== ds ||
      n.modifiers !== ms ||
      n.name !== p ||
      n.questionToken !== (q !== undefined && q.kind === Syntax.QuestionToken ? q : undefined) ||
      n.exclamationToken !== (q !== undefined && q.kind === Syntax.ExclamationToken ? q : undefined) ||
      n.type !== t ||
      n.initializer !== i
      ? updateNode(create(ds, ms, p, q, t, i), n)
      : n;
  }
}
export class PropertySignature extends TypeElement {
  //}, JSDocContainer {
  static readonly kind = Syntax.PropertySignature;
  readonly kind = PropertySignature.kind;
  name: PropertyName;
  questionToken?: QuestionToken;
  type?: TypeNode;
  initializer?: Expression;
  create(ms: readonly Modifier[] | undefined, p: PropertyName | string, q?: QuestionToken, t?: TypeNode, i?: Expression) {
    const n = Node.createSynthesized(Syntax.PropertySignature);
    n.modifiers = Nodes.from(ms);
    n.name = asName(p);
    n.questionToken = q;
    n.type = t;
    n.initializer = i;
    return n;
  }
  update(n: PropertySignature, ms: readonly Modifier[] | undefined, p: PropertyName, q?: QuestionToken, t?: TypeNode, i?: Expression) {
    return n.modifiers !== ms || n.name !== p || n.questionToken !== q || n.type !== t || n.initializer !== i ? updateNode(create(ms, p, q, t, i), n) : n;
  }
}
export class QualifiedName extends Node {
  static readonly kind = Syntax.QualifiedName;
  readonly kind = QualifiedName.kind;
  left: EntityName;
  right: Identifier;
  jsdocDotPos?: number;
  create(left: EntityName, right: string | Identifier) {
    const n = Node.createSynthesized(Syntax.QualifiedName);
    n.left = left;
    n.right = asName(right);
    return n;
  }
  update(n: QualifiedName, left: EntityName, right: Identifier) {
    return n.left !== left || n.right !== right ? updateNode(create(left, right), n) : n;
  }
}
export class RegexLiteral extends LiteralExpression {
  static readonly kind = Syntax.RegexLiteral;
  readonly kind = RegexLiteral.kind;
  create(t: string) {
    const n = Node.createSynthesized(Syntax.RegexLiteral);
    n.text = t;
    return n;
  }
}
export class RestTypeNode extends TypeNode {
  static readonly kind = Syntax.RestType;
  readonly kind = RestTypeNode.kind;
  type: TypeNode;
  create(t: TypeNode) {
    const n = Node.createSynthesized(Syntax.RestType);
    n.type = t;
    return n;
  }
  update(n: RestTypeNode, t: TypeNode): RestTypeNode {
    return n.type !== t ? updateNode(create(t), n) : n;
  }
}
export class ReturnStatement extends Statement {
  static readonly kind = Syntax.ReturnStatement;
  readonly kind = ReturnStatement.kind;
  expression?: Expression;
  createReturn(expression?: Expression): ReturnStatement {
    const node = <ReturnStatement>Node.createSynthesized(Syntax.ReturnStatement);
    node.expression = expression;
    return node;
  }
  updateReturn(node: ReturnStatement, expression: Expression | undefined) {
    return node.expression !== expression ? updateNode(createReturn(expression), node) : node;
  }
}
export class SemicolonClassElement extends ClassElement {
  static readonly kind = Syntax.SemicolonClassElement;
  readonly kind = SemicolonClassElement.kind;
  parent: ClassLikeDeclaration;
  createSemicolonClassElement() {
    return <SemicolonClassElement>Node.createSynthesized(Syntax.SemicolonClassElement);
  }
}
export class SetAccessorDeclaration extends FunctionLikeDeclarationBase {
  //}, ClassElement, ObjectLiteralElement, JSDocContainer {
  static readonly kind = Syntax.SetAccessor;
  readonly kind = SetAccessorDeclaration.kind;
  parent: ClassLikeDeclaration | ObjectLiteralExpression;
  name: PropertyName;
  body?: FunctionBody;
  create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | PropertyName, ps: readonly ParameterDeclaration[], b?: Block) {
    const n = Node.createSynthesized(Syntax.SetAccessor);
    n.decorators = Nodes.from(ds);
    n.modifiers = Nodes.from(ms);
    n.name = asName(p);
    n.typeParameters = undefined;
    n.parameters = new Nodes(ps);
    n.body = b;
    return n;
  }
  update(n: SetAccessorDeclaration, ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: PropertyName, ps: readonly ParameterDeclaration[], b?: Block) {
    return n.decorators !== ds || n.modifiers !== ms || n.name !== p || n.parameters !== ps || n.body !== b ? updateNode(create(ds, ms, p, ps, b), n) : n;
  }
}
export class ShorthandPropertyAssignment extends ObjectLiteralElement {
  //}, JSDocContainer {
  static readonly kind = Syntax.ShorthandPropertyAssignment;
  readonly kind = ShorthandPropertyAssignment.kind;
  parent: ObjectLiteralExpression;
  name: Identifier;
  questionToken?: QuestionToken;
  exclamationToken?: ExclamationToken;
  equalsToken?: Token<Syntax.EqualsToken>;
  objectAssignmentInitializer?: Expression;
  createShorthandPropertyAssignment(name: string | Identifier, objectAssignmentInitializer?: Expression) {
    const node = <ShorthandPropertyAssignment>Node.createSynthesized(Syntax.ShorthandPropertyAssignment);
    node.name = asName(name);
    node.objectAssignmentInitializer = objectAssignmentInitializer !== undefined ? parenthesizeExpressionForList(objectAssignmentInitializer) : undefined;
    return node;
  }
  updateShorthandPropertyAssignment(node: ShorthandPropertyAssignment, name: Identifier, objectAssignmentInitializer: Expression | undefined) {
    return node.name !== name || node.objectAssignmentInitializer !== objectAssignmentInitializer ? updateNode(createShorthandPropertyAssignment(name, objectAssignmentInitializer), node) : node;
  }
}
export namespace SignatureDeclaration {
  export function create(k: Syntax, ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode, ta?: readonly TypeNode[]) {
    const n = Node.createSynthesized(k);
    n.typeParameters = Nodes.from(ts);
    n.parameters = Nodes.from(ps);
    n.type = t;
    n.typeArguments = Nodes.from(ta);
    return n;
  }
  export function update<T extends SignatureDeclaration>(n: T, ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: TypeNode): T {
    return n.typeParameters !== ts || n.parameters !== ps || n.type !== t ? updateNode(create(n.kind, ts, ps, t) as T, n) : n;
  }
}
export class SpreadElement extends Expression {
  static readonly kind = Syntax.SpreadElement;
  readonly kind = SpreadElement.kind;
  parent: ArrayLiteralExpression | CallExpression | NewExpression;
  expression: Expression;
  createSpread(expression: Expression) {
    const node = <SpreadElement>Node.createSynthesized(Syntax.SpreadElement);
    node.expression = parenthesizeExpressionForList(expression);
    return node;
  }
  updateSpread(node: SpreadElement, expression: Expression) {
    return node.expression !== expression ? updateNode(createSpread(expression), node) : node;
  }
}
export class SpreadAssignment extends ObjectLiteralElement {
  //}, JSDocContainer {
  static readonly kind = Syntax.SpreadAssignment;
  readonly kind = SpreadAssignment.kind;
  parent: ObjectLiteralExpression;
  expression: Expression;
  createSpreadAssignment(expression: Expression) {
    const node = <SpreadAssignment>Node.createSynthesized(Syntax.SpreadAssignment);
    node.expression = parenthesizeExpressionForList(expression);
    return node;
  }
  updateSpreadAssignment(node: SpreadAssignment, expression: Expression) {
    return node.expression !== expression ? updateNode(createSpreadAssignment(expression), node) : node;
  }
}
export class StringLiteral extends LiteralExpression {
  //}, Declaration {
  static readonly kind = Syntax.StringLiteral;
  readonly kind = StringLiteral.kind;
  textSourceNode?: Identifier | StringLiteralLike | NumericLiteral;
  singleQuote?: boolean;
  create(t: string) {
    const n = Node.createSynthesized(Syntax.StringLiteral);
    n.text = t;
    return n;
  }
  like(n: Node): n is StringLiteralLike {
    return n.kind === Syntax.StringLiteral || n.kind === Syntax.NoSubstitutionLiteral;
  }
  orNumericLiteralLike(n: Node): n is StringLiteralLike | NumericLiteral {
    return like(n) || Node.is.kind(NumericLiteral, n);
  }
  orJsxExpressionKind(n: Node): n is StringLiteral | JsxExpression {
    const k = n.kind;
    return k === Syntax.StringLiteral || k === Syntax.JsxExpression;
  }
  orNumberLiteralExpression(e: Expression) {
    return (
      orNumericLiteralLike(e) ||
      (e.kind === Syntax.PrefixUnaryExpression && (e as PrefixUnaryExpression).operator === Syntax.MinusToken && (e as PrefixUnaryExpression).operand.kind === Syntax.NumericLiteral)
    );
  }
  createLiteralFromNode(sourceNode: Exclude<PropertyNameLiteral, PrivateIdentifier>): StringLiteral {
    const node = StringLiteral.create(getTextOfIdentifierOrLiteral(sourceNode));
    node.textSourceNode = sourceNode;
    return node;
  }
}
export class SwitchStatement extends Statement {
  static readonly kind = Syntax.SwitchStatement;
  readonly kind = SwitchStatement.kind;
  expression: Expression;
  caseBlock: CaseBlock;
  possiblyExhaustive?: boolean;
  createSwitch(expression: Expression, caseBlock: CaseBlock): SwitchStatement {
    const node = <SwitchStatement>Node.createSynthesized(Syntax.SwitchStatement);
    node.expression = parenthesizeExpressionForList(expression);
    node.caseBlock = caseBlock;
    return node;
  }
  updateSwitch(node: SwitchStatement, expression: Expression, caseBlock: CaseBlock) {
    return node.expression !== expression || node.caseBlock !== caseBlock ? updateNode(createSwitch(expression, caseBlock), node) : node;
  }
}
export class SyntaxList extends Node {
  static readonly kind = Syntax.SyntaxList;
  readonly kind = SyntaxList.kind;
  _children: Node[];
}
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

export class TemplateExpression extends PrimaryExpression {
  static readonly kind = Syntax.TemplateExpression;
  readonly kind = TemplateExpression.kind;
  head: TemplateHead;
  templateSpans: Nodes<TemplateSpan>;
  createTemplateExpression(head: TemplateHead, templateSpans: readonly TemplateSpan[]) {
    const node = <TemplateExpression>Node.createSynthesized(Syntax.TemplateExpression);
    node.head = head;
    node.templateSpans = new Nodes(templateSpans);
    return node;
  }
  updateTemplateExpression(node: TemplateExpression, head: TemplateHead, templateSpans: readonly TemplateSpan[]) {
    return node.head !== head || node.templateSpans !== templateSpans ? updateNode(createTemplateExpression(head, templateSpans), node) : node;
  }
}
export class TemplateHead extends TemplateLiteralLikeNode {
  static readonly kind = Syntax.TemplateHead;
  readonly kind = TemplateHead.kind;
  parent: TemplateExpression;
  templateFlags?: TokenFlags;
  create(t: string, raw?: string) {
    return Node.createTemplateLiteralLike(Syntax.TemplateHead, t, raw) as TemplateHead;
  }
}
export class TemplateMiddle extends TemplateLiteralLikeNode {
  static readonly kind = Syntax.TemplateMiddle;
  readonly kind = TemplateMiddle.kind;
  parent: TemplateSpan;
  templateFlags?: TokenFlags;
  create(t: string, raw?: string) {
    return Node.createTemplateLiteralLike(Syntax.TemplateMiddle, t, raw) as TemplateMiddle;
  }
  orTemplateTailKind(n: Node): n is TemplateMiddle | TemplateTail {
    const k = n.kind;
    return k === Syntax.TemplateMiddle || k === Syntax.TemplateTail;
  }
}
export class TemplateSpan extends Node {
  static readonly kind = Syntax.TemplateSpan;
  readonly kind = TemplateSpan.kind;
  parent: TemplateExpression;
  expression: Expression;
  literal: TemplateMiddle | TemplateTail;
  createTemplateSpan(expression: Expression, literal: TemplateMiddle | TemplateTail) {
    const node = <TemplateSpan>Node.createSynthesized(Syntax.TemplateSpan);
    node.expression = expression;
    node.literal = literal;
    return node;
  }
  updateTemplateSpan(node: TemplateSpan, expression: Expression, literal: TemplateMiddle | TemplateTail) {
    return node.expression !== expression || node.literal !== literal ? updateNode(createTemplateSpan(expression, literal), node) : node;
  }
}
export class TemplateTail extends TemplateLiteralLikeNode {
  static readonly kind = Syntax.TemplateTail;
  readonly kind = TemplateTail.kind;
  parent: TemplateSpan;
  templateFlags?: TokenFlags;
  create(t: string, raw?: string) {
    return Node.createTemplateLiteralLike(Syntax.TemplateTail, t, raw) as TemplateTail;
  }
}
export class ThisTypeNode extends TypeNode {
  static readonly kind = Syntax.ThisType;
  readonly kind = ThisTypeNode.kind;
  create() {
    return Node.createSynthesized(Syntax.ThisType);
  }
}
export class ThrowStatement extends Statement {
  static readonly kind = Syntax.ThrowStatement;
  readonly kind = ThrowStatement.kind;
  expression?: Expression;
  createThrow(expression: Expression) {
    const node = <ThrowStatement>Node.createSynthesized(Syntax.ThrowStatement);
    node.expression = expression;
    return node;
  }
  updateThrow(node: ThrowStatement, expression: Expression) {
    return node.expression !== expression ? updateNode(createThrow(expression), node) : node;
  }
}
export class TryStatement extends Statement {
  static readonly kind = Syntax.TryStatement;
  readonly kind = TryStatement.kind;
  tryBlock: Block;
  catchClause?: CatchClause;
  finallyBlock?: Block;
  createTry(tryBlock: Block, catchClause: CatchClause | undefined, finallyBlock: Block | undefined) {
    const node = <TryStatement>Node.createSynthesized(Syntax.TryStatement);
    node.tryBlock = tryBlock;
    node.catchClause = catchClause;
    node.finallyBlock = finallyBlock;
    return node;
  }
  updateTry(node: TryStatement, tryBlock: Block, catchClause: CatchClause | undefined, finallyBlock: Block | undefined) {
    return node.tryBlock !== tryBlock || node.catchClause !== catchClause || node.finallyBlock !== finallyBlock ? updateNode(createTry(tryBlock, catchClause, finallyBlock), node) : node;
  }
}
export class TupleType extends GenericType {
  static readonly kind = Syntax.TupleType;
  readonly kind = TupleType.kind;
  minLength: number;
  hasRestElement: boolean;
  readonly: boolean;
  labeledElementDeclarations?: readonly (NamedTupleMember | ParameterDeclaration)[];
  create(es: readonly (TypeNode | NamedTupleMember)[]) {
    const n = Node.createSynthesized(Syntax.TupleType);
    n.elements = new Nodes(es);
    return n;
  }
  update(n: TupleTypeNode, es: readonly (TypeNode | NamedTupleMember)[]) {
    return n.elements !== es ? updateNode(create(es), n) : n;
  }
}
export class TypeAliasDeclaration extends DeclarationStatement {
  //}, JSDocContainer {
  static readonly kind = Syntax.TypeAliasDeclaration;
  readonly kind = TypeAliasDeclaration.kind;
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
    const node = <TypeAliasDeclaration>Node.createSynthesized(Syntax.TypeAliasDeclaration);
    node.decorators = Nodes.from(decorators);
    node.modifiers = Nodes.from(modifiers);
    node.name = asName(name);
    node.typeParameters = Nodes.from(typeParameters);
    node.type = type;
    return node;
  }
  updateTypeAliasDeclaration(
    node: TypeAliasDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: Identifier,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    type: TypeNode
  ) {
    return node.decorators !== decorators || node.modifiers !== modifiers || node.name !== name || node.typeParameters !== typeParameters || node.type !== type
      ? updateNode(createTypeAliasDeclaration(decorators, modifiers, name, typeParameters, type), node)
      : node;
  }
}
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

export class TypeLiteralNode extends TypeNode {
  //}, Declaration {
  static readonly kind = Syntax.TypeLiteral;
  readonly kind = TypeLiteralNode.kind;
  members: Nodes<TypeElement>;
  create(ms: readonly TypeElement[] | undefined) {
    const n = Node.createSynthesized(Syntax.TypeLiteral);
    n.members = new Nodes(ms);
    return n;
  }
  update(n: TypeLiteralNode, ms: Nodes<TypeElement>) {
    return n.members !== ms ? updateNode(create(ms), n) : n;
  }
}
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

export class TypeOperatorNode extends TypeNode {
  static readonly kind = Syntax.TypeOperator;
  readonly kind = TypeOperatorNode.kind;
  operator: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword;
  type: TypeNode;
  create(t: TypeNode): TypeOperatorNode;
  create(o: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword, t: TypeNode): TypeOperatorNode;
  create(o: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword | TypeNode, t?: TypeNode) {
    const n = Node.createSynthesized(Syntax.TypeOperator);
    n.operator = typeof o === 'number' ? o : Syntax.KeyOfKeyword;
    n.type = parenthesizeElementTypeMember(typeof o === 'number' ? t! : o);
    return n;
  }
  update(n: TypeOperatorNode, t: TypeNode) {
    return n.type !== t ? updateNode(create(n.operator, t), n) : n;
  }
}
export class TypeParameterDeclaration extends NamedDeclaration {
  static readonly kind = Syntax.TypeParameter;
  readonly kind = TypeParameterDeclaration.kind;
  parent: DeclarationWithTypeParameterChildren | InferTypeNode;
  name: Identifier;
  constraint?: TypeNode;
  default?: TypeNode;
  expression?: Expression;
  createTypeParameterDeclaration(name: string | Identifier, constraint?: TypeNode, defaultType?: TypeNode) {
    const node = Node.createSynthesized(Syntax.TypeParameter) as TypeParameterDeclaration;
    node.name = asName(name);
    node.constraint = constraint;
    node.default = defaultType;
    return node;
  }
  updateTypeParameterDeclaration(node: TypeParameterDeclaration, name: Identifier, constraint: TypeNode | undefined, defaultType: TypeNode | undefined) {
    return node.name !== name || node.constraint !== constraint || node.default !== defaultType ? updateNode(createTypeParameterDeclaration(name, constraint, defaultType), node) : node;
  }
}
export class TypePredicateNode extends TypeNode {
  static readonly kind = Syntax.TypePredicate;
  readonly kind = TypePredicateNode.kind;
  parent: SignatureDeclaration | JSDocTypeExpression;
  assertsModifier?: AssertsToken;
  parameterName: Identifier | ThisTypeNode;
  type?: TypeNode;
  create(p: Identifier | ThisTypeNode | string, t: TypeNode) {
    return createWithModifier(undefined, p, t);
  }
  createWithModifier(a: AssertsToken | undefined, p: Identifier | ThisTypeNode | string, t?: TypeNode) {
    const n = Node.createSynthesized(Syntax.TypePredicate);
    n.assertsModifier = a;
    n.parameterName = asName(p);
    n.type = t;
    return n;
  }
  update(n: TypePredicateNode, p: Identifier | ThisTypeNode, t: TypeNode) {
    return updateWithModifier(n, n.assertsModifier, p, t);
  }
  updateWithModifier(n: TypePredicateNode, a: AssertsToken | undefined, p: Identifier | ThisTypeNode, t?: TypeNode) {
    return n.assertsModifier !== a || n.parameterName !== p || n.type !== t ? updateNode(createWithModifier(a, p, t), n) : n;
  }
}
export class TypeQueryNode extends TypeNode {
  static readonly kind = Syntax.TypeQuery;
  readonly kind = TypeQueryNode.kind;
  exprName: EntityName;
  create(e: EntityName) {
    const n = Node.createSynthesized(Syntax.TypeQuery);
    n.exprName = e;
    return n;
  }
  update(n: TypeQueryNode, e: EntityName) {
    return n.exprName !== e ? updateNode(create(e), n) : n;
  }
}
export class TypeReferenceNode extends NodeWithTypeArguments {
  static readonly kind = Syntax.TypeReference;
  readonly kind = TypeReferenceNode.kind;
  typeName: EntityName;
  create(t: string | EntityName, ts?: readonly TypeNode[]) {
    const n = Node.createSynthesized(Syntax.TypeReference);
    n.typeName = asName(t);
    n.typeArguments = ts && parenthesizeTypeParameters(ts);
    return n;
  }
  update(n: TypeReferenceNode, t: EntityName, ts?: Nodes<TypeNode>) {
    return n.typeName !== t || n.typeArguments !== ts ? updateNode(create(t, ts), n) : n;
  }
}
export class UnionTypeNode extends TypeNode {
  static readonly kind = Syntax.UnionType;
  readonly kind = UnionTypeNode.kind;
  types: Nodes<TypeNode>;
  create(ts: readonly TypeNode[]) {
    return orIntersectionCreate(Syntax.UnionType, ts) as UnionTypeNode;
  }
  orIntersectionCreate(k: Syntax.UnionType | Syntax.IntersectionType, ts: readonly TypeNode[]) {
    const n = Node.createSynthesized(k);
    n.types = parenthesizeElementTypeMembers(ts);
    return n;
  }
  update(n: UnionTypeNode, ts: Nodes<TypeNode>) {
    return orIntersectionUpdate(n, ts);
  }
  orIntersectionUpdate<T extends UnionOrIntersectionTypeNode>(n: T, ts: Nodes<TypeNode>): T {
    return n.types !== ts ? updateNode(orIntersectionCreate(n.kind, ts) as T, n) : n;
  }
}
export namespace UnparsedNode {
  export function createUnparsedNode(section: BundleFileSection, parent: UnparsedSource): UnparsedNode {
    const node = createNode(mapBundleFileSectionKindToSyntax(section.kind), section.pos, section.end) as UnparsedNode;
    node.parent = parent;
    node.data = section.data;
    return node;
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
export class UnparsedPrepend extends UnparsedSection {
  static readonly kind = Syntax.UnparsedPrepend;
  readonly kind = UnparsedPrepend.kind;
  data: string;
  parent: UnparsedSource;
  texts: readonly UnparsedTextLike[];
}
let allUnscopedEmitHelpers: QReadonlyMap<UnscopedEmitHelper> | undefined;
export class UnparsedSource extends Node {
  static readonly kind = Syntax.UnparsedSource;
  readonly kind = UnparsedSource.kind;
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
    const node = <UnparsedSource>createNode(Syntax.UnparsedSource);
    node.prologues = empty;
    node.referencedFiles = empty;
    node.libReferenceDirectives = empty;
    node.lineAndCharOf = (pos) => syntax.get.lineAndCharOf(node, pos);
    return node;
  }
  createUnparsedSourceFile(text: string): UnparsedSource;
  createUnparsedSourceFile(inputFile: InputFiles, type: 'js' | 'dts', stripInternal?: boolean): UnparsedSource;
  createUnparsedSourceFile(text: string, mapPath: string | undefined, map: string | undefined): UnparsedSource;
  createUnparsedSourceFile(textOrInputFiles: string | InputFiles, mapPathOrType?: string, mapTextOrStripInternal?: string | boolean): UnparsedSource {
    const node = createUnparsedSource();
    let stripInternal: boolean | undefined;
    let bundleFileInfo: BundleFileInfo | undefined;
    if (!isString(textOrInputFiles)) {
      assert(mapPathOrType === 'js' || mapPathOrType === 'dts');
      node.fileName = (mapPathOrType === 'js' ? textOrInputFiles.javascriptPath : textOrInputFiles.declarationPath) || '';
      node.sourceMapPath = mapPathOrType === 'js' ? textOrInputFiles.javascriptMapPath : textOrInputFiles.declarationMapPath;
      Object.defineProperties(node, {
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
        node.oldFileOfCurrentEmit = textOrInputFiles.oldFileOfCurrentEmit;
        assert(mapTextOrStripInternal === undefined || typeof mapTextOrStripInternal === 'boolean');
        stripInternal = mapTextOrStripInternal;
        bundleFileInfo = mapPathOrType === 'js' ? textOrInputFiles.buildInfo.bundle.js : textOrInputFiles.buildInfo.bundle.dts;
        if (node.oldFileOfCurrentEmit) {
          parseOldFileOfCurrentEmit(node, Debug.checkDefined(bundleFileInfo));
          return node;
        }
      }
    } else {
      node.fileName = '';
      node.text = textOrInputFiles;
      node.sourceMapPath = mapPathOrType;
      node.sourceMapText = mapTextOrStripInternal as string;
    }
    assert(!node.oldFileOfCurrentEmit);
    parseUnparsedSourceFile(node, bundleFileInfo, stripInternal);
    return node;
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
  parseUnparsedSourceFile(node: UnparsedSource, bundleFileInfo: BundleFileInfo | undefined, stripInternal: boolean | undefined) {
    let prologues: UnparsedPrologue[] | undefined;
    let helpers: UnscopedEmitHelper[] | undefined;
    let referencedFiles: FileReference[] | undefined;
    let typeReferenceDirectives: string[] | undefined;
    let libReferenceDirectives: FileReference[] | undefined;
    let texts: UnparsedSourceText[] | undefined;

    for (const section of bundleFileInfo ? bundleFileInfo.sections : empty) {
      switch (section.kind) {
        case BundleFileSectionKind.Prologue:
          (prologues || (prologues = [])).push(createUnparsedNode(section, node) as UnparsedPrologue);
          break;
        case BundleFileSectionKind.EmitHelpers:
          (helpers || (helpers = [])).push(getAllUnscopedEmitHelpers().get(section.data)!);
          break;
        case BundleFileSectionKind.NoDefaultLib:
          node.hasNoDefaultLib = true;
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
          const prependNode = createUnparsedNode(section, node) as UnparsedPrepend;
          let prependTexts: UnparsedTextLike[] | undefined;
          for (const text of section.texts) {
            if (!stripInternal || text.kind !== BundleFileSectionKind.Internal) {
              (prependTexts || (prependTexts = [])).push(createUnparsedNode(text, node) as UnparsedTextLike);
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
          (texts || (texts = [])).push(createUnparsedNode(section, node) as UnparsedTextLike);
          break;
        default:
          Debug.assertNever(section);
      }
    }
    node.prologues = prologues || empty;
    node.helpers = helpers;
    node.referencedFiles = referencedFiles || empty;
    node.typeReferenceDirectives = typeReferenceDirectives;
    node.libReferenceDirectives = libReferenceDirectives || empty;
    node.texts = texts || [<UnparsedTextLike>createUnparsedNode({ kind: BundleFileSectionKind.Text, pos: 0, end: node.text.length }, node)];
  }
  parseOldFileOfCurrentEmit(node: UnparsedSource, bundleFileInfo: BundleFileInfo) {
    assert(!!node.oldFileOfCurrentEmit);
    let texts: UnparsedTextLike[] | undefined;
    let syntheticReferences: UnparsedSyntheticReference[] | undefined;
    for (const section of bundleFileInfo.sections) {
      switch (section.kind) {
        case BundleFileSectionKind.Internal:
        case BundleFileSectionKind.Text:
          (texts || (texts = [])).push(createUnparsedNode(section, node) as UnparsedTextLike);
          break;

        case BundleFileSectionKind.NoDefaultLib:
        case BundleFileSectionKind.Reference:
        case BundleFileSectionKind.Type:
        case BundleFileSectionKind.Lib:
          (syntheticReferences || (syntheticReferences = [])).push(createUnparsedSyntheticReference(section, node));
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
    node.texts = texts || empty;
    node.helpers = map(bundleFileInfo.sources && bundleFileInfo.sources.helpers, (name) => getAllUnscopedEmitHelpers().get(name)!);
    node.syntheticReferences = syntheticReferences;
    return node;
  }
}
export class UnparsedSyntheticReference extends UnparsedSection {
  static readonly kind: Syntax.UnparsedSyntheticReference;
  readonly kind = UnparsedSyntheticReference.kind;
  parent: UnparsedSource;
  section: BundleFileHasNoDefaultLib | BundleFileReference;
  createUnparsedSyntheticReference(section: BundleFileHasNoDefaultLib | BundleFileReference, parent: UnparsedSource) {
    const node = createNode(Syntax.UnparsedSyntheticReference, section.pos, section.end) as UnparsedSyntheticReference;
    node.parent = parent;
    node.data = section.data;
    node.section = section;
    return node;
  }
}
export class VariableDeclaration extends NamedDeclaration {
  static readonly kind = Syntax.VariableDeclaration;
  readonly kind = VariableDeclaration.kind;
  parent: VariableDeclarationList | CatchClause;
  name: BindingName;
  exclamationToken?: ExclamationToken;
  type?: TypeNode;
  initializer?: Expression;
  createVariableDeclaration(name: string | BindingName, type?: TypeNode, initializer?: Expression) {
    const node = <VariableDeclaration>Node.createSynthesized(Syntax.VariableDeclaration);
    node.name = asName(name);
    node.type = type;
    node.initializer = initializer !== undefined ? parenthesizeExpressionForList(initializer) : undefined;
    return node;
  }
  updateVariableDeclaration(node: VariableDeclaration, name: BindingName, type: TypeNode | undefined, initializer: Expression | undefined) {
    return node.name !== name || node.type !== type || node.initializer !== initializer ? updateNode(createVariableDeclaration(name, type, initializer), node) : node;
  }
  createTypeScriptVariableDeclaration(name: string | BindingName, exclaimationToken?: Token<Syntax.ExclamationToken>, type?: TypeNode, initializer?: Expression) {
    const node = <VariableDeclaration>Node.createSynthesized(Syntax.VariableDeclaration);
    node.name = asName(name);
    node.type = type;
    node.initializer = initializer !== undefined ? parenthesizeExpressionForList(initializer) : undefined;
    node.exclamationToken = exclaimationToken;
    return node;
  }
  updateTypeScriptVariableDeclaration(
    node: VariableDeclaration,
    name: BindingName,
    exclaimationToken: Token<Syntax.ExclamationToken> | undefined,
    type: TypeNode | undefined,
    initializer: Expression | undefined
  ) {
    return node.name !== name || node.type !== type || node.initializer !== initializer || node.exclamationToken !== exclaimationToken
      ? updateNode(createTypeScriptVariableDeclaration(name, exclaimationToken, type, initializer), node)
      : node;
  }
}
export class VariableDeclarationList extends Node {
  static readonly kind = Syntax.VariableDeclarationList;
  readonly kind = VariableDeclarationList.kind;
  parent: VariableStatement | ForStatement | ForOfStatement | ForInStatement;
  declarations: Nodes<VariableDeclaration>;
  createVariableDeclarationList(declarations: readonly VariableDeclaration[], flags = NodeFlags.None) {
    const node = <VariableDeclarationList>Node.createSynthesized(Syntax.VariableDeclarationList);
    node.flags |= flags & NodeFlags.BlockScoped;
    node.declarations = new Nodes(declarations);
    return node;
  }
  updateVariableDeclarationList(node: VariableDeclarationList, declarations: readonly VariableDeclaration[]) {
    return node.declarations !== declarations ? updateNode(createVariableDeclarationList(declarations, node.flags), node) : node;
  }
}
export class VariableStatement extends Statement {
  //}, JSDocContainer {
  static readonly kind = Syntax.VariableStatement;
  readonly kind = VariableStatement.kind;
  declarationList: VariableDeclarationList;
  createVariableStatement(modifiers: readonly Modifier[] | undefined, declarationList: VariableDeclarationList | readonly VariableDeclaration[]) {
    const node = <VariableStatement>Node.createSynthesized(Syntax.VariableStatement);
    node.decorators = undefined;
    node.modifiers = Nodes.from(modifiers);
    node.declarationList = isArray(declarationList) ? createVariableDeclarationList(declarationList) : declarationList;
    return node;
  }
  updateVariableStatement(node: VariableStatement, modifiers: readonly Modifier[] | undefined, declarationList: VariableDeclarationList) {
    return node.modifiers !== modifiers || node.declarationList !== declarationList ? updateNode(createVariableStatement(modifiers, declarationList), node) : node;
  }
}
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

export class WhileStatement extends IterationStatement {
  static readonly kind = Syntax.WhileStatement;
  readonly kind = WhileStatement.kind;
  expression: Expression;
  createWhile(expression: Expression, statement: Statement) {
    const node = <WhileStatement>Node.createSynthesized(Syntax.WhileStatement);
    node.expression = expression;
    node.statement = asEmbeddedStatement(statement);
    return node;
  }
  updateWhile(node: WhileStatement, expression: Expression, statement: Statement) {
    return node.expression !== expression || node.statement !== statement ? updateNode(createWhile(expression, statement), node) : node;
  }
}
export class WithStatement extends Statement {
  static readonly kind = Syntax.WithStatement;
  readonly kind = WithStatement.kind;
  expression: Expression;
  statement: Statement;
  createWith(expression: Expression, statement: Statement) {
    const node = <WithStatement>Node.createSynthesized(Syntax.WithStatement);
    node.expression = expression;
    node.statement = asEmbeddedStatement(statement);
    return node;
  }
  updateWith(node: WithStatement, expression: Expression, statement: Statement) {
    return node.expression !== expression || node.statement !== statement ? updateNode(createWith(expression, statement), node) : node;
  }
}
export class YieldExpression extends Expression {
  static readonly kind = Syntax.YieldExpression;
  readonly kind = YieldExpression.kind;
  asteriskToken?: AsteriskToken;
  expression?: Expression;
  createYield(expression?: Expression): YieldExpression;
  createYield(asteriskToken: AsteriskToken | undefined, expression: Expression): YieldExpression;
  createYield(asteriskTokenOrExpression?: AsteriskToken | undefined | Expression, expression?: Expression) {
    const asteriskToken = asteriskTokenOrExpression && asteriskTokenOrExpression.kind === Syntax.AsteriskToken ? <AsteriskToken>asteriskTokenOrExpression : undefined;
    expression = asteriskTokenOrExpression && asteriskTokenOrExpression.kind !== Syntax.AsteriskToken ? asteriskTokenOrExpression : expression;
    const node = <YieldExpression>Node.createSynthesized(Syntax.YieldExpression);
    node.asteriskToken = asteriskToken;
    node.expression = expression && parenthesizeExpressionForList(expression);
    return node;
  }
  updateYield(node: YieldExpression, asteriskToken: AsteriskToken | undefined, expression: Expression) {
    return node.expression !== expression || node.asteriskToken !== asteriskToken ? updateNode(createYield(asteriskToken, expression), node) : node;
  }
}

export namespace parenthesize {
  interface BinaryPlusExpression extends BinaryExpression {
    cachedLiteralKind: Syntax;
  }
  function getLiteralKindOfBinaryPlusOperand(node: Expression): Syntax {
    node = skipPartiallyEmittedExpressions(node);
    if (syntax.is.literal(node.kind)) return node.kind;

    if (node.kind === Syntax.BinaryExpression && (<BinaryExpression>node).operatorToken.kind === Syntax.PlusToken) {
      if ((<BinaryPlusExpression>node).cachedLiteralKind !== undefined) {
        return (<BinaryPlusExpression>node).cachedLiteralKind;
      }

      const leftKind = getLiteralKindOfBinaryPlusOperand((<BinaryExpression>node).left);
      const literalKind = syntax.is.literal(leftKind) && leftKind === getLiteralKindOfBinaryPlusOperand((<BinaryExpression>node).right) ? leftKind : Syntax.Unknown;

      (<BinaryPlusExpression>node).cachedLiteralKind = literalKind;
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
      // If the operand has lower precedence, then it needs to be parenthesized to preserve the
      // intent of the expression. For example, if the operand is `a + b` and the operator is
      // `*`, then we need to parenthesize the operand to preserve the intended order of
      // operations: `(a + b) * x`.
      //
      // If the operand has higher precedence, then it does not need to be parenthesized. For
      // example, if the operand is `a * b` and the operator is `+`, then we do not need to
      // parenthesize to preserve the intended order of operations: `a * b + x`.
      //
      // If the operand has the same precedence, then we need to check the associativity of
      // the operator based on whether this is the left or right operand of the expression.
      //
      // For example, if `a / d` is on the right of operator `*`, we need to parenthesize
      // to preserve the intended order of operations: `x * (a / d)`
      //
      // If `a ** d` is on the left of operator `**`, we need to parenthesize to preserve
      // the intended order of operations: `(a ** b) ** c`
      const binaryOperatorPrecedence = syntax.get.operatorPrecedence(Syntax.BinaryExpression, binaryOperator);
      const binaryOperatorAssociativity = syntax.get.operatorAssociativity(Syntax.BinaryExpression, binaryOperator);
      const emittedOperand = skipPartiallyEmittedExpressions(operand);
      if (!isLeftSideOfBinary && operand.kind === Syntax.ArrowFunction && binaryOperatorPrecedence > 3) {
        // We need to parenthesize arrow functions on the right side to avoid it being
        // parsed as parenthesized expression: `a && (() => {})`
        return true;
      }
      const operandPrecedence = getExpressionPrecedence(emittedOperand);
      switch (compareValues(operandPrecedence, binaryOperatorPrecedence)) {
        case Comparison.LessThan:
          // If the operand is the right side of a right-associative binary operation
          // and is a yield expression, then we do not need parentheses.
          if (!isLeftSideOfBinary && binaryOperatorAssociativity === Associativity.Right && operand.kind === Syntax.YieldExpression) {
            return false;
          }

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
              if (operatorHasAssociativeProperty(binaryOperator)) {
                return false;
              }

              // No need to parenthesize the right operand when the binary operator
              // is plus (+) if both the left and right operands consist solely of either
              // literals of the same kind or binary plus (+) expressions for literals of
              // the same kind (recursively).
              //  "a"+(1+2)       => "a"+(1+2)
              //  "a"+("b"+"c")   => "a"+"b"+"c"
              if (binaryOperator === Syntax.PlusToken) {
                const leftKind = leftOperand ? getLiteralKindOfBinaryPlusOperand(leftOperand) : Syntax.Unknown;
                if (syntax.is.literal(leftKind) && leftKind === getLiteralKindOfBinaryPlusOperand(emittedOperand)) {
                  return false;
                }
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
    if (Node.is.leftHandSideExpression(e2) && (e2.kind !== Syntax.NewExpression || (<NewExpression>e2).arguments)) {
      return <LeftHandSideExpression>e;
    }
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
    if (leftmostExpressionKind === Syntax.ObjectLiteralExpression || leftmostExpressionKind === Syntax.FunctionExpression) {
      return setRange(createParen(expression), expression);
    }
    return expression;
  }
  export function parenthesizeConditionalTypeMember(member: TypeNode) {
    return member.kind === Syntax.ConditionalType ? ParenthesizedTypeNode.create(member) : member;
  }
  export function parenthesizeElementTypeMember(member: TypeNode) {
    switch (member.kind) {
      case Syntax.UnionType:
      case Syntax.IntersectionType:
      case Syntax.FunctionType:
      case Syntax.ConstructorType:
        return ParenthesizedTypeNode.create(member);
    }
    return parenthesizeConditionalTypeMember(member);
  }
  export function arrayTypeMember(member: qt.TypeNode) {
    switch (member.kind) {
      case Syntax.TypeQuery:
      case Syntax.TypeOperator:
      case Syntax.InferType:
        return ParenthesizedTypeNode.create(member);
    }
    return parenthesizeElementTypeMember(member);
  }
  export function parenthesizeElementTypeMembers(members: readonly TypeNode[]) {
    return new Nodes(sameMap(members, parenthesizeElementTypeMember));
  }
  export function arenthesizeTypeParameters(typeParameters: readonly TypeNode[] | undefined) {
    if (some(typeParameters)) {
      const params: TypeNode[] = [];
      for (let i = 0; i < typeParameters.length; ++i) {
        const entry = typeParameters[i];
        params.push(i === 0 && Node.is.functionOrConstructorTypeNode(entry) && entry.typeParameters ? ParenthesizedTypeNode.create(entry) : entry);
      }
      return new Nodes(params);
    }
    return;
  }
  export function parenthesizeDefaultExpression(e: Expression) {
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
  export function parenthesizeForNew(expression: Expression): LeftHandSideExpression {
    const leftmostExpr = getLeftmostExpression(expression, true);
    switch (leftmostExpr.kind) {
      case Syntax.CallExpression:
        return createParen(expression);
      case Syntax.NewExpression:
        return !(leftmostExpr as NewExpression).arguments ? createParen(expression) : <LeftHandSideExpression>expression;
    }
    return forAccess(expression);
  }
  export function conciseBody(b: qt.ConciseBody): qt.ConciseBody {
    if (!Node.is.kind(Block, b) && (isCommaSequence(b) || getLeftmostExpression(b, false).kind === Syntax.ObjectLiteralExpression)) {
      return setRange(createParen(b), b);
    }
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
    if (typeof value === 'number') {
      return NumericLiteral.create(value + '');
    }
    // eslint-disable-next-line no-in-operator
    if (typeof value === 'object' && 'base10Value' in value) {
      // PseudoBigInt
      return BigIntLiteral.create(pseudoBigIntToString(value) + 'n');
    }
    if (typeof value === 'boolean') {
      return value ? createTrue() : createFalse();
    }
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
        return createFunctionExpression(declaration.modifiers, declaration.asteriskToken, declaration.name, declaration.typeParameters, declaration.parameters, declaration.type, body);
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
        }, // TODO:: if there is inline sourceMap in jsFile, use that
        declarationText: {
          get() {
            return definedTextGetter(Debug.checkDefined(javascriptMapTextOrDeclarationPath));
          },
        },
        declarationMapText: {
          get() {
            return textGetter(declarationMapPath);
          },
        }, // TODO:: if there is inline sourceMap in dtsFile, use that
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
    const updated = createFunctionExpression(node.modifiers, node.asteriskToken, node.name, node.typeParameters, node.parameters, node.type, node.body);
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
        // use named imports
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
            // Alias the imports if the names are used somewhere in the file.
            // NOTE: We don't need to care about global import collisions as this is a module.
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
        // use a namespace import
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
      if (externalHelpersModuleName) {
        return externalHelpersModuleName;
      }

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
    const moduleName = getExternalModuleName(importNode)!; // TODO: GH#18217
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
    if (file.moduleName) {
      return createLiteral(file.moduleName);
    }
    if (!file.isDeclarationFile && (options.out || options.outFile)) {
      return createLiteral(getExternalModuleNameFromPath(host, file.fileName));
    }
    return;
  }
}
