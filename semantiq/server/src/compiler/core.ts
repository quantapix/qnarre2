import * as qb from './base';
import { QContext } from './context';
import { NodeFlags, TransformFlags } from './types';
import * as qt from './types';
import { Modifier, ModifierFlags, Syntax } from './syntax';
import * as qy from './syntax';
export * from './types';
export class Nodes<T extends qt.Node> extends Array<T> implements qt.Nodes<T> {
  pos = -1;
  end = -1;
  trailingComma?: boolean;
  transformFlags = TransformFlags.None;
  static isNodes<T extends qt.Node>(ns: readonly T[]): ns is Nodes<T> {
    return ns.hasOwnProperty('pos') && ns.hasOwnProperty('end');
  }
  static from<T extends qt.Node>(ts: readonly T[]): Nodes<T>;
  static from<T extends qt.Node>(ts?: readonly T[]): Nodes<T> | undefined;
  static from<T extends qt.Node>(ts?: readonly T[]) {
    return ts ? new Nodes(ts) : undefined;
  }
  constructor(ts?: readonly T[], trailingComma?: boolean) {
    super(...(!ts || ts === qb.empty ? [] : ts));
    if (trailingComma) this.trailingComma = trailingComma;
  }
  visit<T>(cb: (n: qt.Node) => T | undefined, cbs?: (ns: Nodes<qt.Node>) => T | undefined): T | undefined {
    if (cbs) return cbs(this);
    for (const n of this) {
      const r = cb(n);
      if (r) return r;
    }
    return;
  }
}
export type MutableNodes<T extends qt.Node> = Nodes<T> & T[];
export abstract class Node extends qb.TextRange implements qt.NodeBase {
  //static readonly kind = Syntax.Unknown;
  id?: number;
  kind!: any;
  flags = NodeFlags.None;
  transformFlags = TransformFlags.None;
  modifierFlagsCache = ModifierFlags.None;
  decorators?: qt.Nodes<qt.Decorator>;
  modifiers?: qt.Modifiers;
  original?: qt.Node;
  symbol!: qt.Symbol;
  localSymbol?: qt.Symbol;
  locals?: qt.SymbolTable;
  nextContainer?: qt.Node;
  flowNode?: qt.FlowNode;
  emitNode?: qt.EmitNode;
  contextualType?: qt.Type;
  inferenceContext?: qt.InferenceContext;
  doc?: qt.Doc[];
  private _children?: Node[];
  constructor(synth?: boolean, k?: Syntax, pos?: number, end?: number, public parent?: qt.Node) {
    super(pos, end);
    if (k) this.kind = k;
    if (synth) this.flags |= NodeFlags.Synthesized;
    if (parent) this.flags = parent.flags & NodeFlags.ContextFlags;
  }
  isPrivateIdentifierPropertyDeclaration(): this is qt.PrivateIdentifierPropertyDeclaration {
    return this.is(PropertyDeclaration) && this.name.is(PrivateIdentifier);
  }
  getSourceFile(): SourceFile {
    return qc.get.sourceFileOf(this);
  }
  getStart(s?: qt.SourceFileLike, includeDocComment?: boolean) {
    qb.assert(!qb.isSynthesized(this.pos) && !qb.isSynthesized(this.end));
    return getTokenPosOfNode(this, s, includeDocComment);
  }
  getFullStart() {
    qb.assert(!qb.isSynthesized(this.pos) && !qb.isSynthesized(this.end));
    return this.pos;
  }
  getEnd() {
    qb.assert(!qb.isSynthesized(this.pos) && !qb.isSynthesized(this.end));
    return this.end;
  }
  getWidth(s?: SourceFile) {
    qb.assert(!qb.isSynthesized(this.pos) && !qb.isSynthesized(this.end));
    return this.getEnd() - this.getStart(s);
  }
  fullWidth() {
    qb.assert(!qb.isSynthesized(this.pos) && !qb.isSynthesized(this.end));
    return this.end - this.pos;
  }
  getLeadingTriviaWidth(s?: SourceFile) {
    qb.assert(!qb.isSynthesized(this.pos) && !qb.isSynthesized(this.end));
    return this.getStart(s) - this.pos;
  }
  getFullText(s?: SourceFile) {
    qb.assert(!qb.isSynthesized(this.pos) && !qb.isSynthesized(this.end));
    return (s || this.getSourceFile()).text.substring(this.pos, this.end);
  }
  getText(s?: SourceFile) {
    qb.assert(!qb.isSynthesized(this.pos) && !qb.isSynthesized(this.end));
    if (!s) s = this.getSourceFile();
    return s.text.substring(this.getStart(s), this.getEnd());
  }
  getChildCount(s?: SourceFile) {
    return this.getChildren(s).length;
  }
  getChildAt(i: number, s?: SourceFile) {
    return this.getChildren(s)[i];
  }
  getChildren(s?: qt.SourceFileLike) {
    qb.assert(!qb.isSynthesized(this.pos) && !qb.isSynthesized(this.end));
    const scanner = qs_getRaw();
    const addSynthetics = (ns: qb.Push<Node>, pos: number, end: number) => {
      scanner.setTextPos(pos);
      while (pos < end) {
        const t = scanner.scan();
        const p = scanner.getTextPos();
        if (p <= end) {
          if (t === Syntax.Identifier) qb.fail(`Did not expect ${Debug.formatSyntax(this.kind)} to have an Identifier in its trivia`);
          ns.push(Node.create(t, pos, p, this));
        }
        pos = p;
        if (t === Syntax.EndOfFileToken) break;
      }
    };
    const createSyntaxList = (ns: Nodes<Node>) => {
      const list = Node.create(Syntax.SyntaxList, ns.pos, ns.end, this);
      list._children = [];
      let p = ns.pos;
      for (const n of ns) {
        addSynthetics(list._children, p, n.pos);
        list._children.push(n);
        p = n.end;
      }
      addSynthetics(list._children, p, ns.end);
      return list;
    };
    const createChildren = () => {
      const cs = [] as Node[];
      if (qy.is.node(this.kind)) {
        if (qc.isDoc.commentContainingNode(this)) {
          qc.forEach.child(this, (c) => {
            cs.push(c);
          });
          return cs;
        }
        scanner.setText((s || this.getSourceFile()).text);
        let p = this.pos;
        const processNode = (c: Node) => {
          addSynthetics(cs, p, c.pos);
          cs.push(c);
          p = c.end;
        };
        const processNodes = (ns: Nodes<Node>) => {
          addSynthetics(cs, p, ns.pos);
          cs.push(createSyntaxList(ns));
          p = ns.end;
        };
        qb.forEach((this as qt.DocContainer).doc, processNode);
        p = this.pos;
        qc.forEach.child(this, processNode, processNodes);
        addSynthetics(cs, p, this.end);
        scanner.setText(undefined);
      }
      return cs;
    };
    return this._children || (this._children = createChildren());
  }
  getFirstToken(s?: qt.SourceFileLike): Node | undefined {
    qb.assert(!qb.isSynthesized(this.pos) && !qb.isSynthesized(this.end));
    const cs = this.getChildren(s);
    if (!cs.length) return;
    const c = qb.find(cs, (c) => c.kind < Syntax.FirstDocNode || c.kind > Syntax.LastDocNode)!;
    return c.kind < Syntax.FirstNode ? c : c.getFirstToken(s);
  }
  getLastToken(s?: qt.SourceFileLike): Node | undefined {
    qb.assert(!qb.isSynthesized(this.pos) && !qb.isSynthesized(this.end));
    const cs = this.getChildren(s);
    const c = qb.lastOrUndefined(cs);
    if (!c) return;
    return c.kind < Syntax.FirstNode ? c : c.getLastToken(s);
  }
  visit<T>(cb: (n: qt.Node) => T | undefined) {
    return cb(this);
  }
  updateFrom(n: qt.Node): this {
    if (this !== n) return this.setOriginal(n).setRange(n).aggregateTransformFlags();
    return this;
  }
  setOriginal(n?: qt.Node): this {
    this.original = n;
    if (n) {
      const e = n.emitNode;
      if (e) this.emitNode = mergeEmitNode(e, this.emitNode);
    }
    return this;
  }
  aggregateTransformFlags(): this {
    const aggregate = (n: Node): TransformFlags => {
      if (n === undefined) return TransformFlags.None;
      if (n.transformFlags & TransformFlags.HasComputedFlags) return n.transformFlags & ~getTransformFlagsSubtreeExclusions(n.kind);
      return computeTransformFlagsForNode(n, subtree(n));
    };
    const nodes = (ns: Nodes<Node>): TransformFlags => {
      if (ns === undefined) return TransformFlags.None;
      let sub = TransformFlags.None;
      let f = TransformFlags.None;
      for (const n of ns) {
        sub |= aggregate(n);
        f |= n.transformFlags & ~TransformFlags.HasComputedFlags;
      }
      ns.transformFlags = f | TransformFlags.HasComputedFlags;
      return sub;
    };
    const subtree = (n: Node): TransformFlags => {
      if (hasSyntacticModifier(n, ModifierFlags.Ambient) || (qc.is.typeNode(n) && n.kind !== Syntax.ExpressionWithTypeArguments)) return TransformFlags.None;
      return reduceEachChild(n, TransformFlags.None, child, children);
    };
    const child = (f: TransformFlags, n: Node): TransformFlags => f | aggregate(n);
    const children = (f: TransformFlags, ns: Nodes<Node>): TransformFlags => f | nodes(ns);
    aggregate(this);
    return this;
  }

  /// new
  static createModifier<T extends Modifier['kind']>(kind: T): Token<T> {
    return new Token(kind);
  }
  static createModifiersFromModifierFlags(flags: ModifierFlags) {
    const result: Modifier[] = [];
    if (flags & ModifierFlags.Export) {
      result.push(this.createModifier(Syntax.ExportKeyword));
    }
    if (flags & ModifierFlags.Ambient) {
      result.push(this.createModifier(Syntax.DeclareKeyword));
    }
    if (flags & ModifierFlags.Default) {
      result.push(this.createModifier(Syntax.DefaultKeyword));
    }
    if (flags & ModifierFlags.Const) {
      result.push(this.createModifier(Syntax.ConstKeyword));
    }
    if (flags & ModifierFlags.Public) {
      result.push(this.createModifier(Syntax.PublicKeyword));
    }
    if (flags & ModifierFlags.Private) {
      result.push(this.createModifier(Syntax.PrivateKeyword));
    }
    if (flags & ModifierFlags.Protected) {
      result.push(this.createModifier(Syntax.ProtectedKeyword));
    }
    if (flags & ModifierFlags.Abstract) {
      result.push(this.createModifier(Syntax.AbstractKeyword));
    }
    if (flags & ModifierFlags.Static) {
      result.push(this.createModifier(Syntax.StaticKeyword));
    }
    if (flags & ModifierFlags.Readonly) {
      result.push(this.createModifier(Syntax.ReadonlyKeyword));
    }
    if (flags & ModifierFlags.Async) {
      result.push(this.createModifier(Syntax.AsyncKeyword));
    }
    return result;
  }
  static updateNode<T extends Node>(updated: T, original: T): T {
    if (updated !== original) {
      updated.setOriginal(original);
      setRange(updated, original);
      aggregateTransformFlags(updated);
    }
    return updated;
  }
  static movePastDecorators(n: Node): qb.TextRange {
    return n.decorators && n.decorators.length > 0 ? n.movePos(n.decorators.end) : n;
  }
  static movePastModifiers(n: Node): qb.TextRange {
    return n.modifiers && n.modifiers.length > 0 ? n.movePos(n.modifiers.end) : movePastDecorators(n);
  }
  static createTokenRange(pos: number, token: Syntax): qb.TextRange {
    return new qb.TextRange(pos, pos + qy.toString(token)!.length);
  }
  static ofNode(n: Node): qb.TextRange {
    return new qb.TextRange(getTokenPosOfNode(n), n.end);
  }
  static ofTypeParams(a: Nodes<TypeParameterDeclaration>): qb.TextRange {
    return new qb.TextRange(a.pos - 1, a.end + 1);
  }
  static mergeTokenSourceMapRanges(sourceRanges: (qb.TextRange | undefined)[], destRanges: (qb.TextRange | undefined)[]) {
    if (!destRanges) destRanges = [];
    for (const key in sourceRanges) {
      destRanges[key] = sourceRanges[key];
    }
    return destRanges;
  }
}

export class SyntaxList extends Node implements qc.SyntaxList {
  static readonly kind = Syntax.SyntaxList;
  children!: Node[];
}
SyntaxList.prototype.kind = SyntaxList.kind;
export abstract class TypeNode extends Node implements qt.TypeNode {
  _typeNodeBrand: any;
}
export abstract class NodeWithTypeArguments extends TypeNode implements qt.NodeWithTypeArguments {
  typeArguments?: Nodes<TypeNode>;
}
export abstract class Declaration extends Node implements qt.Declaration {
  _declarationBrand: any;
  isNotAccessor(declaration: Declaration) {
    return !qc.is.accessor(declaration);
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
    if (nodeName && qc.is.kind(Identifier, nodeName) && !qc.is.generatedIdentifier(nodeName)) {
      const name = getMutableClone(nodeName);
      emitFlags |= qc.get.emitFlags(nodeName);
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
export abstract class DeclarationStatement extends NamedDeclaration implements qt.DeclarationStatement {
  name?: Identifier | StringLiteral | NumericLiteral;
}
export abstract class ClassElement extends NamedDeclaration implements qt.ClassElement {
  _classElementBrand: any;
  name?: PropertyName;
}
export abstract class ClassLikeDeclarationBase extends NamedDeclaration implements qt.ClassLikeDeclarationBase {
  name?: Identifier;
  typeParameters?: Nodes<TypeParameterDeclaration>;
  heritageClauses?: Nodes<qt.HeritageClause>;
  members: Nodes<ClassElement>;
  constructor(
    s: boolean,
    k: Syntax.ClassDeclaration | Syntax.ClassExpression,
    ts: readonly TypeParameterDeclaration[] | undefined,
    hs: readonly HeritageClause[] | undefined,
    es: readonly qc.ClassElement[]
  ) {
    super(s, k);
    this.typeParameters = Nodes.from(ts);
    this.heritageClauses = Nodes.from(hs);
    this.members = new Nodes(es);
  }
}
export abstract class ObjectLiteralElement extends NamedDeclaration implements qt.ObjectLiteralElement {
  _objectLiteralBrand: any;
  name?: qt.PropertyName;
}
export abstract class PropertyLikeDeclaration extends NamedDeclaration implements qt.PropertyLikeDeclaration {
  name: qt.PropertyName;
}
export abstract class TypeElement extends NamedDeclaration implements qt.TypeElement {
  _typeElementBrand: any;
  name?: PropertyName;
  questionToken?: qt.QuestionToken;
}
export abstract class SignatureDeclarationBase extends NamedDeclaration implements qt.SignatureDeclarationBase {
  name?: qt.PropertyName;
  typeParameters?: Nodes<TypeParameterDeclaration>;
  parameters!: Nodes<ParameterDeclaration>;
  type?: TypeNode;
  typeArguments?: Nodes<qt.TypeNode>;
  constructor(s: boolean, k: qt.SignatureDeclaration['kind'], ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode, ta?: readonly qc.TypeNode[]) {
    super(s, k);
    this.typeParameters = Nodes.from(ts);
    this.parameters = new Nodes(ps);
    this.type = t;
    this.typeArguments = Nodes.from(ta);
  }
  /*
  update<T extends SignatureDeclaration>(n: T, ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: qc.TypeNode): T {
    return this.typeParameters !== ts || this.parameters !== ps || this.type !== t ? (new create(this.kind, ts, ps, t) as T).updateFrom(this) : this;
  }
  */
}
export abstract class FunctionLikeDeclarationBase extends SignatureDeclarationBase implements qt.FunctionLikeDeclarationBase {
  docCache?: readonly qt.DocTag[];
  asteriskToken?: qt.AsteriskToken;
  questionToken?: qt.QuestionToken;
  exclamationToken?: qt.ExclamationToken;
  body?: qt.Block | qt.Expression;
  endFlowNode?: qt.FlowNode;
  returnFlowNode?: qt.FlowNode;
  _functionLikeDeclarationBrand: any;
}
export abstract class FunctionOrConstructorTypeNodeBase extends SignatureDeclarationBase implements qt.FunctionOrConstructorTypeNodeBase {
  type: TypeNode;
  constructor(s: boolean, k: Syntax.FunctionType | Syntax.ConstructorType, ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
    super(s, k, ts, ps, t);
  }
}
export abstract class Expression extends Node implements qt.Expression {
  _expressionBrand: any;
  createExpressionFromEntityName(node: EntityName | Expression): Expression {
    if (qc.is.kind(QualifiedName, node)) {
      const left = createExpressionFromEntityName(node.left);
      const right = getMutableClone(node.right);
      return setRange(new qc.PropertyAccessExpression(left, right), node);
    }
    return getMutableClone(node);
  }
  createExpressionForPropertyName(memberName: Exclude<PropertyName, PrivateIdentifier>): Expression {
    if (qc.is.kind(Identifier, memberName)) return qc.asLiteral(memberName);
    else if (qc.is.kind(ComputedPropertyName, memberName)) return getMutableClone(memberName.expression);
    return getMutableClone(memberName);
  }
  createExpressionForObjectLiteralElementLike(node: ObjectLiteralExpression, property: ObjectLiteralElementLike, receiver: Expression): Expression | undefined {
    if (property.name && qc.is.kind(PrivateIdentifier, property.name)) qg.failBadSyntax(property.name, 'Private identifiers are not allowed in object literals.');
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
          getterFunction.setOriginal(getAccessor);
          const getter = new qc.PropertyAssignment('get', getterFunction);
          properties.push(getter);
        }
        if (setAccessor) {
          const setterFunction = new FunctionExpression(setAccessor.modifiers, undefined, undefined, undefined, setAccessor.parameters, undefined, setAccessor.body!);
          setRange(setterFunction, setAccessor);
          setterFunction.setOriginal(setAccessor);
          const setter = new qc.PropertyAssignment('set', setterFunction);
          properties.push(setter);
        }
        properties.push(new qc.PropertyAssignment('enumerable', getAccessor || setAccessor ? new qc.BooleanLiteral(false) : new qc.BooleanLiteral(true)));
        properties.push(new qc.PropertyAssignment('configurable', new qc.BooleanLiteral(true)));
        const expression = setRange(
          new CallExpression(new qc.PropertyAccessExpression(new Identifier('Object'), 'defineProperty'), undefined, [
            receiver,
            createExpressionForPropertyName(property.name),
            new qc.ObjectLiteralExpression(properties, multiLine),
          ]),
          firstAccessor
        );
        return aggregateTransformFlags(expression);
      }
      return;
    }
    function createExpressionForPropertyAssignment(property: PropertyAssignment, receiver: Expression) {
      return aggregateTransformFlags(setRange(createAssignment(createMemberAccessForPropertyName(receiver, property.name, property.name), property.initializer), property).setOriginal(property));
    }
    function createExpressionForShorthandPropertyAssignment(property: ShorthandPropertyAssignment, receiver: Expression) {
      return aggregateTransformFlags(
        setRange(createAssignment(createMemberAccessForPropertyName(receiver, property.name, property.name), getSynthesizedClone(property.name)), property).setOriginal(property)
      );
    }
    function createExpressionForMethodDeclaration(method: MethodDeclaration, receiver: Expression) {
      return aggregateTransformFlags(
        setOriginalNode(
          setRange(
            createAssignment(
              createMemberAccessForPropertyName(receiver, method.name, method.name),
              setRange(new FunctionExpression(method.modifiers, method.asteriskToken, undefined, undefined, method.parameters, undefined, method.body!), method).setOriginal(method)
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
    return tag === 'undefined' ? createStrictEquality(value, VoidExpression.zero()) : createStrictEquality(new TypeOfExpression(value), qc.asLiteral(tag));
  }
  createMemberAccessForPropertyName(target: Expression, memberName: PropertyName, location?: TextRange): MemberExpression {
    if (qc.is.kind(ComputedPropertyName, memberName)) return setRange(new ElementAccessExpression(target, memberName.expression), location);
    else {
      const expression = setRange(
        qc.is.kind(Identifier, memberName) || qc.is.kind(PrivateIdentifier, memberName) ? new qc.PropertyAccessExpression(target, memberName) : new ElementAccessExpression(target, memberName),
        memberName
      );
      getOrCreateEmitNode(expression).flags |= EmitFlags.NoNestedSourceMaps;
      return expression;
    }
  }
  createFunctionCall(func: Expression, thisArg: Expression, argumentsList: readonly Expression[], location?: TextRange) {
    return setRange(new CallExpression(new qc.PropertyAccessExpression(func, 'call'), undefined, [thisArg, ...argumentsList]), location);
  }
  createFunctionApply(func: Expression, thisArg: Expression, argumentsExpression: Expression, location?: TextRange) {
    return setRange(new CallExpression(new qc.PropertyAccessExpression(func, 'apply'), undefined, [thisArg, argumentsExpression]), location);
  }
  createArraySlice(array: Expression, start?: number | Expression) {
    const argumentsList: Expression[] = [];
    if (start !== undefined) argumentsList.push(typeof start === 'number' ? qc.asLiteral(start) : start);
    return new CallExpression(new qc.PropertyAccessExpression(array, 'slice'), undefined, argumentsList);
  }
  createArrayConcat(array: Expression, values: readonly Expression[]) {
    return new CallExpression(new qc.PropertyAccessExpression(array, 'concat'), undefined, values);
  }
  createMathPow(left: Expression, right: Expression, location?: TextRange) {
    return setRange(new CallExpression(new qc.PropertyAccessExpression(new Identifier('Math'), 'pow'), undefined, [left, right]), location);
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
  isCommaSequence(): this is (BinaryExpression & { operatorToken: Token<Syntax.CommaToken> }) | CommaListExpression {
    return (this.kind === Syntax.BinaryExpression && (<BinaryExpression>this).operatorToken.kind === Syntax.CommaToken) || this.kind === Syntax.CommaListExpression;
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
export abstract class ObjectLiteralExpressionBase<T extends qt.ObjectLiteralElement> extends PrimaryExpression implements qt.ObjectLiteralExpressionBase<T> {
  properties: Nodes<T>;
  _declarationBrand: any;
}
export abstract class TokenOrIdentifier extends Node {
  getChildren(): Node[] {
    return this.kind === Syntax.EndOfFileToken ? this.doc || qb.empty : qb.empty;
  }
}
export class Token<T extends Syntax> extends TokenOrIdentifier implements qt.Token<T> {
  constructor(k: T, pos?: number, end?: number) {
    super(undefined, k, pos, end);
  }
}
export abstract class Statement extends Node implements qt.Statement {
  _statementBrand: any;
  isUseStrictPrologue(node: ExpressionStatement): boolean {
    return qc.is.kind(StringLiteral, node.expression) && node.expression.text === 'use strict';
  }
  addPrologue(target: Statement[], source: readonly Statement[], ensureUseStrict?: boolean, visitor?: (node: Node) => VisitResult<Node>): number {
    const offset = addStandardPrologue(target, source, ensureUseStrict);
    return addCustomPrologue(target, source, offset, visitor);
  }
  addStandardPrologue(target: Statement[], source: readonly Statement[], ensureUseStrict?: boolean): number {
    qb.assert(target.length === 0, 'Prologue directives should be at the first statement in the target statements array');
    let foundUseStrict = false;
    let statementOffset = 0;
    const numStatements = source.length;
    while (statementOffset < numStatements) {
      const statement = source[statementOffset];
      if (qc.is.prologueDirective(statement)) {
        if (isUseStrictPrologue(statement)) foundUseStrict = true;
        target.push(statement);
      } else {
        break;
      }
      statementOffset++;
    }
    if (ensureUseStrict && !foundUseStrict) target.push(startOnNewLine(new qc.ExpressionStatement(qc.asLiteral('use strict'))));
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
      if (qc.get.emitFlags(statement) & EmitFlags.CustomPrologue && filter(statement)) append(target, visitor ? visitNode(statement, visitor, isStatement) : statement);
      else break;
      statementOffset++;
    }
    return statementOffset;
  }
  findUseStrictPrologue(statements: readonly Statement[]): Statement | undefined {
    for (const statement of statements) {
      if (qc.is.prologueDirective(statement)) {
        if (isUseStrictPrologue(statement)) return statement;
      } else break;
    }
    return;
  }
  startsWithUseStrict(statements: readonly Statement[]) {
    const firstStatement = firstOrUndefined(statements);
    return firstStatement !== undefined && qc.is.prologueDirective(firstStatement) && isUseStrictPrologue(firstStatement);
  }
  createForOfBindingStatement(node: ForInitializer, boundValue: Expression): Statement {
    if (qc.is.kind(VariableDeclarationList, node)) {
      const firstDeclaration = first(node.declarations);
      const updatedDeclaration = firstDeclaration.update(firstDeclaration.name, undefined, boundValue);
      return setRange(new qc.VariableStatement(undefined, node.update([updatedDeclaration])), node);
    } else {
      const updatedExpression = setRange(createAssignment(node, boundValue), node);
      return setRange(new qc.ExpressionStatement(updatedExpression), node);
    }
  }
  insertLeadingStatement(dest: Statement, source: Statement) {
    if (qc.is.kind(Block, dest)) return dest.update(setRange(new Nodes([source, ...dest.statements]), dest.statements));
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
export abstract class IterationStatement extends Statement implements qc.IterationStatement {
  statement: Statement;
}
export abstract class UnionOrIntersectionTypeNode extends TypeNode implements qt.UnionOrIntersectionType {
  types: Type[];
  objectFlags: ObjectFlags;
  propertyCache: SymbolTable;
  resolvedProperties: Symbol[];
  resolvedIndexType: IndexType;
  resolvedStringIndexType: IndexType;
  resolvedBaseConstraint: Type;
  constructor(k: Syntax.UnionType | Syntax.IntersectionType, ts: readonly TypeNode[]) {
    super(true);
    this.types = parenthesize.elementTypeMembers(ts);
  }
  update<T extends UnionOrIntersectionTypeNode>(n: T, ts: Nodes<TypeNode>): T {
    return this.types !== ts ? (new UnionOrIntersectionTypeNode(this.kind, ts) as T).updateFrom(this) : this;
  }
}
export abstract class LiteralLikeNode extends Node implements qt.LiteralLikeNode {
  text!: string;
  isUnterminated?: boolean;
  hasExtendedEscape?: boolean;
}
export abstract class TemplateLiteralLikeNode extends LiteralLikeNode implements qt.TemplateLiteralLikeNode {
  rawText?: string;
  constructor(k: qt.TemplateLiteralToken['kind'], t: string, raw?: string) {
    super(true, k);
    this.text = t;
    if (raw === undefined || t === raw) this.rawText = raw;
    else {
      const r = qs_process(k, raw);
      if (typeof r === 'object') return qb.fail('Invalid raw text');
      qb.assert(t === r, "Expected 'text' to be the normalized version of 'rawText'");
      this.rawText = raw;
    }
  }
}
export abstract class LiteralExpression extends PrimaryExpression implements qt.LiteralExpression {
  text!: string;
  isUnterminated?: boolean;
  hasExtendedEscape?: boolean;
  _literalExpressionBrand: any;
}
export abstract class DocType extends TypeNode implements qt.DocType {
  _docTypeBrand: any;
}
export abstract class DocTag extends Node implements qt.DocTag {
  parent: qt.Doc | qt.DocTypeLiteral;
  tagName: qt.Identifier;
  comment?: string;
  constructor(k: Syntax, n: string, c?: string) {
    super(true, k);
    this.tagName = new Identifier(n);
    this.comment = c;
  }
}
export abstract class DocContainer implements qt.DocContainer {
  doc?: Doc[];
  docCache?: readonly DocTag[];
  append(d: Doc) {
    this.doc = qb.append(this.doc, d);
    return this;
  }
}
export function idText(n: Identifier | PrivateIdentifier): string {
  return qy.get.unescUnderscores(n.escapedText);
}
export class Type implements qt.Type {
  flags: TypeFlags;
  id!: number;
  checker: TypeChecker;
  symbol!: Symbol;
  pattern?: DestructuringPattern;
  aliasSymbol?: Symbol;
  aliasTypeArguments?: readonly Type[];
  aliasTypeArgumentsContainsMarker?: boolean;
  permissiveInstantiation?: Type;
  restrictiveInstantiation?: Type;
  immediateBaseConstraint?: Type;
  widened?: Type;
  objectFlags?: ObjectFlags;
  constructor(public checker: TypeChecker, public flags: TypeFlags) {}
  getFlags(): TypeFlags {
    return this.flags;
  }
  getSymbol(): Symbol | undefined {
    return this.symbol;
  }
  getProperties(): Symbol[] {
    return this.checker.getPropertiesOfType(this);
  }
  getProperty(propertyName: string): Symbol | undefined {
    return this.checker.getPropertyOfType(this, propertyName);
  }
  getApparentProperties(): Symbol[] {
    return this.checker.getAugmentedPropertiesOfType(this);
  }
  getCallSignatures(): readonly Signature[] {
    return this.checker.getSignaturesOfType(this, SignatureKind.Call);
  }
  getConstructSignatures(): readonly Signature[] {
    return this.checker.getSignaturesOfType(this, SignatureKind.Construct);
  }
  getStringIndexType(): Type | undefined {
    return this.checker.getIndexTypeOfType(this, IndexKind.String);
  }
  getNumberIndexType(): Type | undefined {
    return this.checker.getIndexTypeOfType(this, IndexKind.Number);
  }
  getBaseTypes(): BaseType[] | undefined {
    return this.isClassOrInterface() ? this.checker.getBaseTypes(this) : undefined;
  }
  isNullableType() {
    return this.checker.isNullableType(this);
  }
  getNonNullableType(): Type {
    return this.checker.getNonNullableType(this);
  }
  getNonOptionalType(): Type {
    return this.checker.getNonOptionalType(this);
  }
  getConstraint(): Type | undefined {
    return this.checker.getBaseConstraintOfType(this);
  }
  getDefault(): Type | undefined {
    return this.checker.getDefaultFromTypeParameter(this);
  }
  isUnion(): this is UnionType {
    return !!(this.flags & TypeFlags.Union);
  }
  isIntersection(): this is IntersectionType {
    return !!(this.flags & TypeFlags.Intersection);
  }
  isUnionOrIntersection(): this is UnionOrIntersectionType {
    return !!(this.flags & TypeFlags.UnionOrIntersection);
  }
  isLiteral(): this is LiteralType {
    return !!(this.flags & TypeFlags.StringOrNumberLiteral);
  }
  isStringLiteral(): this is StringLiteralType {
    return !!(this.flags & TypeFlags.StringLiteral);
  }
  isNumberLiteral(): this is NumberLiteralType {
    return !!(this.flags & TypeFlags.NumberLiteral);
  }
  isTypeParameter(): this is TypeParameter {
    return !!(this.flags & TypeFlags.TypeParameter);
  }
  isClassOrInterface(): this is InterfaceType {
    return !!(getObjectFlags(this) & ObjectFlags.ClassOrInterface);
  }
  isClass(): this is InterfaceType {
    return !!(getObjectFlags(this) & ObjectFlags.Class);
  }
  get typeArguments() {
    if (getObjectFlags(this) & ObjectFlags.Reference) return this.checker.getTypeArguments((this as Type) as TypeReference);
    return;
  }
}
export class Signature implements qt.Signature {
  flags: SignatureFlags;
  checker?: TypeChecker;
  declaration?: SignatureDeclaration | qt.DocSignature;
  typeParameters?: readonly TypeParameter[];
  parameters!: readonly Symbol[];
  thisParameter?: Symbol;
  resolvedReturnType?: Type;
  resolvedTypePredicate?: TypePredicate;
  minArgumentCount!: number;
  target?: Signature;
  mapper?: TypeMapper;
  unionSignatures?: Signature[];
  erasedSignatureCache?: Signature;
  canonicalSignatureCache?: Signature;
  optionalCallSignatureCache?: { inner?: Signature; outer?: Signature };
  isolatedSignatureType?: ObjectType;
  instantiations?: QMap<Signature>;
  minTypeArgumentCount!: number;
  docComment?: SymbolDisplayPart[];
  docTags?: qt.DocTagInfo[];
  constructor(public checker: TypeChecker, public flags: SignatureFlags) {}
  getDeclaration(): SignatureDeclaration {
    return this.declaration;
  }
  getTypeParameters(): TypeParameter[] | undefined {
    return this.typeParameters;
  }
  getParameters(): Symbol[] {
    return this.parameters;
  }
  getReturnType(): Type {
    return this.checker.getReturnTypeOfSignature(this);
  }
  getDocComment(): SymbolDisplayPart[] {
    return this.docComment || (this.docComment = getDocComment(singleElementArray(this.declaration), this.checker));
  }
  getDocTags(): qt.DocTagInfo[] {
    if (this.docTags === undefined) {
      this.docTags = this.declaration ? Doc.getDocTagsFromDeclarations([this.declaration]) : [];
    }
    return this.docTags;
  }
  signatureHasRestParameter(s: Signature) {
    return !!(s.flags & SignatureFlags.HasRestParameter);
  }
  signatureHasLiteralTypes(s: Signature) {
    return !!(s.flags & SignatureFlags.HasLiteralTypes);
  }
}
export class SourceFile extends Declaration implements qt.SourceFile {
  static readonly kind = Syntax.SourceFile;
  kind: Syntax.SourceFile;
  statements: Nodes<Statement>;
  endOfFileToken: Token<Syntax.EndOfFileToken>;
  fileName: string;
  path: Path;
  text: string;
  resolvedPath: Path;
  originalFileName: string;
  redirectInfo?: RedirectInfo;
  amdDependencies: readonly AmdDependency[];
  moduleName?: string;
  referencedFiles: readonly FileReference[];
  typeReferenceDirectives: readonly FileReference[];
  libReferenceDirectives: readonly FileReference[];
  languageVariant: LanguageVariant;
  isDeclarationFile: boolean;
  renamedDependencies?: QReadonlyMap<string>;
  hasNoDefaultLib: boolean;
  languageVersion: ScriptTarget;
  scriptKind: ScriptKind;
  externalModuleIndicator?: Node;
  commonJsModuleIndicator?: Node;
  jsGlobalAugmentations?: SymbolTable;
  identifiers: QMap<string>;
  nodeCount: number;
  identifierCount: number;
  symbolCount: number;
  parseDiagnostics: DiagnosticWithLocation[];
  bindDiagnostics: DiagnosticWithLocation[];
  bindSuggestionDiagnostics?: DiagnosticWithLocation[];
  docDiagnostics?: DiagnosticWithLocation[];
  additionalSyntacticDiagnostics?: readonly DiagnosticWithLocation[];
  lineMap: readonly number[];
  classifiableNames?: ReadonlyUnderscoreEscapedMap<true>;
  commentDirectives?: CommentDirective[];
  resolvedModules?: QMap<ResolvedModuleFull | undefined>;
  resolvedTypeReferenceDirectiveNames: QMap<ResolvedTypeReferenceDirective | undefined>;
  imports: readonly StringLiteralLike[];
  moduleAugmentations: readonly (StringLiteral | Identifier)[];
  patternAmbientModules?: PatternAmbientModule[];
  ambientModuleNames: readonly string[];
  checkJsDirective?: CheckJsDirective;
  version: string;
  pragmas: ReadonlyPragmaMap;
  localJsxNamespace?: __String;
  localJsxFactory?: EntityName;
  exportedModulesFromDeclarationEmit?: ExportedModulesFromDeclarationEmit;
  kind: Syntax.SourceFile = Syntax.SourceFile;
  _declarationBrand: any;
  fileName!: string;
  path!: Path;
  resolvedPath!: Path;
  originalFileName!: string;
  text!: string;
  scriptSnapshot!: IScriptSnapshot;
  lineMap!: readonly number[];
  statements!: Nodes<Statement>;
  endOfFileToken!: Token<Syntax.EndOfFileToken>;
  amdDependencies!: { name: string; path: string }[];
  moduleName!: string;
  referencedFiles!: FileReference[];
  typeReferenceDirectives!: FileReference[];
  libReferenceDirectives!: FileReference[];
  syntacticDiagnostics!: DiagnosticWithLocation[];
  parseDiagnostics!: DiagnosticWithLocation[];
  bindDiagnostics!: DiagnosticWithLocation[];
  bindSuggestionDiagnostics?: DiagnosticWithLocation[];
  isDeclarationFile!: boolean;
  isDefaultLib!: boolean;
  hasNoDefaultLib!: boolean;
  externalModuleIndicator!: Node;
  commonJsModuleIndicator!: Node;
  nodeCount!: number;
  identifierCount!: number;
  symbolCount!: number;
  version!: string;
  scriptKind!: ScriptKind;
  languageVersion!: ScriptTarget;
  languageVariant!: LanguageVariant;
  identifiers!: QMap<string>;
  nameTable: UnderscoreEscapedMap<number> | undefined;
  resolvedModules: QMap<ResolvedModuleFull> | undefined;
  resolvedTypeReferenceDirectiveNames!: QMap<ResolvedTypeReferenceDirective>;
  imports!: readonly StringLiteralLike[];
  moduleAugmentations!: StringLiteral[];
  private namedDeclarations: QMap<Declaration[]> | undefined;
  ambientModuleNames!: string[];
  checkJsDirective: CheckJsDirective | undefined;
  errorExpectations: qb.TextRange[] | undefined;
  possiblyContainDynamicImport?: boolean;
  pragmas!: PragmaMap;
  localJsxFactory: EntityName | undefined;
  localJsxNamespace: __String | undefined;
  constructor(kind: Syntax, pos: number, end: number) {
    super(kind, pos, end);
  }
  redirectInfo?: RedirectInfo | undefined;
  renamedDependencies?: QReadonlyMap<string> | undefined;
  jsGlobalAugmentations?: SymbolTable<Symbol> | undefined;
  docDiagnostics?: DiagnosticWithLocation[] | undefined;
  additionalSyntacticDiagnostics?: readonly DiagnosticWithLocation[] | undefined;
  classifiableNames?: ReadonlyUnderscoreEscapedMap<true> | undefined;
  commentDirectives?: CommentDirective[] | undefined;
  patternAmbientModules?: PatternAmbientModule[] | undefined;
  exportedModulesFromDeclarationEmit?: ExportedModulesFromDeclarationEmit | undefined;
  id: number;
  flags: NodeFlags;
  modifierFlagsCache: ModifierFlags;
  transformFlags: TransformFlags;
  decorators?: Nodes<Decorator> | undefined;
  modifiers?: qt.Modifiers | undefined;
  original?: Node | undefined;
  symbol: Symbol;
  localSymbol?: Symbol | undefined;
  locals?: SymbolTable<Symbol> | undefined;
  nextContainer?: Node | undefined;
  flowNode?: FlowStart | FlowLabel | FlowAssignment | FlowCall | FlowCondition | FlowSwitchClause | FlowArrayMutation | FlowReduceLabel | undefined;
  emitNode?: qt.EmitNode | undefined;
  contextualType?: Type | undefined;
  inferenceContext?: qt.InferenceContext | undefined;
  doc?: qt.Doc[] | undefined;
  is<S extends Syntax, T extends { kind: S; also?: Syntax[] | undefined }>(t: T): this is qt.NodeType<T['kind']> {
    throw new Error('Method not implemented.');
  }
  getSourceFile(): SourceFile {
    throw new Error('Method not implemented.');
  }
  getStart(s?: qt.SourceFileLike | undefined, includeDocComment?: boolean | undefined) {
    throw new Error('Method not implemented.');
  }
  getFullStart(): number {
    throw new Error('Method not implemented.');
  }
  getEnd(): number {
    throw new Error('Method not implemented.');
  }
  getWidth(s?: SourceFile | undefined): number {
    throw new Error('Method not implemented.');
  }
  fullWidth(): number {
    throw new Error('Method not implemented.');
  }
  getLeadingTriviaWidth(s?: SourceFile | undefined): number {
    throw new Error('Method not implemented.');
  }
  getFullText(s?: SourceFile | undefined): string {
    throw new Error('Method not implemented.');
  }
  getText(s?: SourceFile | undefined): string {
    throw new Error('Method not implemented.');
  }
  getChildCount(s?: SourceFile | undefined): number {
    throw new Error('Method not implemented.');
  }
  getChildAt(i: number, s?: SourceFile | undefined): Node {
    throw new Error('Method not implemented.');
  }
  getChildren(s?: qt.SourceFileLike | undefined): Node[] {
    throw new Error('Method not implemented.');
  }
  getFirstToken(s?: qt.SourceFileLike | undefined): Node | undefined {
    throw new Error('Method not implemented.');
  }
  getLastToken(s?: qt.SourceFileLike | undefined): Node | undefined {
    throw new Error('Method not implemented.');
  }
  visit<T>(cb: (n: Node) => T | undefined): T | undefined {
    throw new Error('Method not implemented.');
  }
  updateFrom(n: Node): this {
    throw new Error('Method not implemented.');
  }
  setOriginal(n?: Node | undefined): this {
    throw new Error('Method not implemented.');
  }
  aggregateTransformFlags(): this {
    throw new Error('Method not implemented.');
  }
  isCollapsed(): boolean {
    throw new Error('Method not implemented.');
  }
  containsInclusive(p: number): boolean {
    throw new Error('Method not implemented.');
  }
  setRange(r?: Range | undefined): this {
    throw new Error('Method not implemented.');
  }
  movePos(p: number): qb.TextRange {
    throw new Error('Method not implemented.');
  }
  moveEnd(e: number): qb.TextRange {
    throw new Error('Method not implemented.');
  }
  update(newText: string, textChangeRange: TextChangeRange): SourceFile {
    return qp_updateSource(this, newText, textChangeRange);
  }
  getLineAndCharacterOfPosition(position: number): LineAndCharacter {
    return getLineAndCharacterOfPosition(this, position);
  }
  getLineStarts(): readonly number[] {
    return getLineStarts(this);
  }
  getPositionOfLineAndCharacter(line: number, character: number, allowEdits?: true): number {
    return computePositionOfLineAndCharacter(getLineStarts(this), line, character, this.text, allowEdits);
  }
  getLineEndOfPosition(pos: number): number {
    const { line } = this.getLineAndCharacterOfPosition(pos);
    const lineStarts = this.getLineStarts();
    let lastCharPos: number | undefined;
    if (line + 1 >= lineStarts.length) {
      lastCharPos = this.getEnd();
    }
    if (!lastCharPos) {
      lastCharPos = lineStarts[line + 1] - 1;
    }
    const fullText = this.getFullText();
    return fullText[lastCharPos] === '\n' && fullText[lastCharPos - 1] === '\r' ? lastCharPos - 1 : lastCharPos;
  }
  getNamedDeclarations(): QMap<Declaration[]> {
    if (!this.namedDeclarations) {
      this.namedDeclarations = this.computeNamedDeclarations();
    }
    return this.namedDeclarations;
  }
  qp_updateSourceNode(
    node: SourceFile,
    statements: readonly Statement[],
    isDeclarationFile?: boolean,
    referencedFiles?: SourceFile['referencedFiles'],
    typeReferences?: SourceFile['typeReferenceDirectives'],
    hasNoDefaultLib?: boolean,
    libReferences?: SourceFile['libReferenceDirectives']
  ) {
    if (
      node.statements !== statements ||
      (isDeclarationFile !== undefined && node.isDeclarationFile !== isDeclarationFile) ||
      (referencedFiles !== undefined && node.referencedFiles !== referencedFiles) ||
      (typeReferences !== undefined && node.typeReferenceDirectives !== typeReferences) ||
      (libReferences !== undefined && node.libReferenceDirectives !== libReferences) ||
      (hasNoDefaultLib !== undefined && node.hasNoDefaultLib !== hasNoDefaultLib)
    ) {
      const updated = <SourceFile>Node.createSynthesized(Syntax.SourceFile);
      updated.flags |= node.flags;
      updated.statements = new Nodes(statements);
      updated.endOfFileToken = node.endOfFileToken;
      updated.fileName = node.fileName;
      updated.path = node.path;
      updated.text = node.text;
      updated.isDeclarationFile = isDeclarationFile === undefined ? node.isDeclarationFile : isDeclarationFile;
      updated.referencedFiles = referencedFiles === undefined ? node.referencedFiles : referencedFiles;
      updated.typeReferenceDirectives = typeReferences === undefined ? node.typeReferenceDirectives : typeReferences;
      updated.hasNoDefaultLib = hasNoDefaultLib === undefined ? node.hasNoDefaultLib : hasNoDefaultLib;
      updated.libReferenceDirectives = libReferences === undefined ? node.libReferenceDirectives : libReferences;
      if (node.amdDependencies !== undefined) updated.amdDependencies = node.amdDependencies;
      if (node.moduleName !== undefined) updated.moduleName = node.moduleName;
      if (node.languageVariant !== undefined) updated.languageVariant = node.languageVariant;
      if (node.renamedDependencies !== undefined) updated.renamedDependencies = node.renamedDependencies;
      if (node.languageVersion !== undefined) updated.languageVersion = node.languageVersion;
      if (node.scriptKind !== undefined) updated.scriptKind = node.scriptKind;
      if (node.externalModuleIndicator !== undefined) updated.externalModuleIndicator = node.externalModuleIndicator;
      if (node.commonJsModuleIndicator !== undefined) updated.commonJsModuleIndicator = node.commonJsModuleIndicator;
      if (node.identifiers !== undefined) updated.identifiers = node.identifiers;
      if (node.nodeCount !== undefined) updated.nodeCount = node.nodeCount;
      if (node.identifierCount !== undefined) updated.identifierCount = node.identifierCount;
      if (node.symbolCount !== undefined) updated.symbolCount = node.symbolCount;
      if (node.parseDiagnostics !== undefined) updated.parseDiagnostics = node.parseDiagnostics;
      if (node.bindDiagnostics !== undefined) updated.bindDiagnostics = node.bindDiagnostics;
      if (node.bindSuggestionDiagnostics !== undefined) updated.bindSuggestionDiagnostics = node.bindSuggestionDiagnostics;
      if (node.lineMap !== undefined) updated.lineMap = node.lineMap;
      if (node.classifiableNames !== undefined) updated.classifiableNames = node.classifiableNames;
      if (node.resolvedModules !== undefined) updated.resolvedModules = node.resolvedModules;
      if (node.resolvedTypeReferenceDirectiveNames !== undefined) updated.resolvedTypeReferenceDirectiveNames = node.resolvedTypeReferenceDirectiveNames;
      if (node.imports !== undefined) updated.imports = node.imports;
      if (node.moduleAugmentations !== undefined) updated.moduleAugmentations = node.moduleAugmentations;
      if (node.pragmas !== undefined) updated.pragmas = node.pragmas;
      if (node.localJsxFactory !== undefined) updated.localJsxFactory = node.localJsxFactory;
      if (node.localJsxNamespace !== undefined) updated.localJsxNamespace = node.localJsxNamespace;
      return updated.updateFrom(node);
    }
    return node;
  }
  private computeNamedDeclarations(): QMap<Declaration[]> {
    const r = new MultiMap<Declaration>();
    this.qc.forEach.child(visit);
    return r;
    function addDeclaration(declaration: Declaration) {
      const name = getDeclarationName(declaration);
      if (name) r.add(name, declaration);
    }
    function getDeclarations(name: string) {
      let declarations = r.get(name);
      if (!declarations) r.set(name, (declarations = []));
      return declarations;
    }
    function getDeclarationName(declaration: Declaration) {
      const name = getNonAssignedNameOfDeclaration(declaration);
      return (
        name &&
        (isComputedPropertyName(name) && qc.is.kind(PropertyAccessExpression, name.expression) ? name.expression.name.text : qc.is.propertyName(name) ? getNameFromPropertyName(name) : undefined)
      );
    }
    function visit(node: Node): void {
      switch (node.kind) {
        case Syntax.FunctionDeclaration:
        case Syntax.FunctionExpression:
        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
          const functionDeclaration = <FunctionLikeDeclaration>node;
          const declarationName = getDeclarationName(functionDeclaration);
          if (declarationName) {
            const declarations = getDeclarations(declarationName);
            const lastDeclaration = qb.lastOrUndefined(declarations);
            if (lastDeclaration && functionDeclaration.parent === lastDeclaration.parent && functionDeclaration.symbol === lastDeclaration.symbol) {
              if (functionDeclaration.body && !(<FunctionLikeDeclaration>lastDeclaration).body) declarations[declarations.length - 1] = functionDeclaration;
            } else declarations.push(functionDeclaration);
          }
          forEach.child(node, visit);
          break;
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
        case Syntax.InterfaceDeclaration:
        case Syntax.TypeAliasDeclaration:
        case Syntax.EnumDeclaration:
        case Syntax.ModuleDeclaration:
        case Syntax.ImportEqualsDeclaration:
        case Syntax.ExportSpecifier:
        case Syntax.ImportSpecifier:
        case Syntax.ImportClause:
        case Syntax.NamespaceImport:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
        case Syntax.TypeLiteral:
          addDeclaration(<Declaration>node);
          forEach.child(node, visit);
          break;
        case Syntax.Parameter:
          if (!hasSyntacticModifier(node, ModifierFlags.ParameterPropertyModifier)) break;
        case Syntax.VariableDeclaration:
        case Syntax.BindingElement: {
          const decl = <VariableDeclaration>node;
          if (qc.is.kind(BindingPattern, decl.name)) {
            qc.forEach.child(decl.name, visit);
            break;
          }
          if (decl.initializer) visit(decl.initializer);
        }
        case Syntax.EnumMember:
        case Syntax.PropertyDeclaration:
        case Syntax.PropertySignature:
          addDeclaration(<Declaration>node);
          break;
        case Syntax.ExportDeclaration:
          const exportDeclaration = <ExportDeclaration>node;
          if (exportDeclaration.exportClause) {
            if (qc.is.kind(NamedExports, exportDeclaration.exportClause)) forEach(exportDeclaration.exportClause.elements, visit);
            else visit(exportDeclaration.exportClause.name);
          }
          break;
        case Syntax.ImportDeclaration:
          const importClause = (<ImportDeclaration>node).importClause;
          if (importClause) {
            if (importClause.name) addDeclaration(importClause.name);
            if (importClause.namedBindings) {
              if (importClause.namedBindings.kind === Syntax.NamespaceImport) addDeclaration(importClause.namedBindings);
              else forEach(importClause.namedBindings.elements, visit);
            }
          }
          break;
        case Syntax.BinaryExpression:
          if (getAssignmentDeclarationKind(node as BinaryExpression) !== AssignmentDeclarationKind.None) addDeclaration(node as BinaryExpression);
        default:
          qc.forEach.child(node, visit);
      }
    }
  }
}
export class SourceMapSource implements qt.SourceMapSource {
  lineMap!: number[];
  constructor(public fileName: string, public text: string, public skipTrivia = (pos: number) => pos) {}
  getLineAndCharacterOfPosition(pos: number): LineAndCharacter {
    return getLineAndCharacterOfPosition(this, pos);
  }
}
export class SourceFile2 implements qt.SourceFileLike {
  text = '';
  lineMap?: number[];
  lineStarts(): readonly number[] {
    return this.lineMap ?? (this.lineMap = qy.get.lineStarts(this.text));
  }
  lineAndCharOf(pos: number) {
    return qy.get.lineAndCharOf(this.lineStarts(), pos);
  }
  posOf(line: number, char: number): number;
  posOf(line: number, char: number, edits?: true): number;
  posOf(line: number, char: number, edits?: true): number {
    return qy.get.posOf(this.lineStarts(), line, char, this.text, edits);
  }
  linesBetween(p1: number, p2: number): number;
  linesBetween(r1: Range, r2: Range, comments: boolean): number;
  linesBetween(x1: Range | number, x2: Range | number, comments = false) {
    if (typeof x1 === 'number') {
      if (x1 === x2) return 0;
      qb.assert(typeof x2 === 'number');
      const ss = this.lineStarts();
      const min = Math.min(x1, x2);
      const isNegative = min === x2;
      const max = isNegative ? x1 : x2;
      const lower = qy.get.lineOf(ss, min);
      const upper = qy.get.lineOf(ss, max, lower);
      return isNegative ? lower - upper : upper - lower;
    }
    const s = this.startPos(x2 as Range, comments);
    return this.linesBetween(x1.end, s);
  }
  linesBetweenEnds(r1: Range, r2: Range) {
    return this.linesBetween(r1.end, r2.end);
  }
  linesToPrevNonWhitespace(pos: number, stop: number, comments = false) {
    const s = qy.skipTrivia(this.text, pos, false, comments);
    const p = this.prevNonWhitespacePos(s, stop);
    return this.linesBetween(p ?? stop, s);
  }
  linesToNextNonWhitespace(pos: number, stop: number, comments = false) {
    const s = qy.skipTrivia(this.text, pos, false, comments);
    return this.linesBetween(pos, Math.min(stop, s));
  }
  startPos(r: Range, comments = false) {
    return qb.isSynthesized(r.pos) ? -1 : qy.skipTrivia(this.text, r.pos, false, comments);
  }
  prevNonWhitespacePos(pos: number, stop = 0) {
    while (pos-- > stop) {
      if (!qy.is.whiteSpaceLike(this.text.charCodeAt(pos))) return pos;
    }
    return;
  }
  onSameLine(p1: number, p2: number) {
    return this.linesBetween(p1, p2) === 0;
  }
  onSingleLine(r: Range) {
    return this.onSameLine(r.pos, r.end);
  }
  multiLine(a: Nodes<Node>) {
    return !this.onSameLine(a.pos, a.end);
  }
  startsOnSameLine(r1: Range, r2: Range) {
    return this.onSameLine(this.startPos(r1), this.startPos(r2));
  }
  endsOnSameLine(r1: Range, r2: Range) {
    return this.onSameLine(r1.end, r2.end);
  }
  startOnSameLineAsEnd(r1: Range, r2: Range) {
    return this.onSameLine(this.startPos(r1), r2.end);
  }
  endOnSameLineAsStart(r1: Range, r2: Range) {
    return this.onSameLine(r1.end, this.startPos(r2));
  }
}
export function getExcludedSymbolFlags(flags: SymbolFlags): SymbolFlags {
  let result: SymbolFlags = 0;
  if (flags & SymbolFlags.BlockScopedVariable) result |= SymbolFlags.BlockScopedVariableExcludes;
  if (flags & SymbolFlags.FunctionScopedVariable) result |= SymbolFlags.FunctionScopedVariableExcludes;
  if (flags & SymbolFlags.Property) result |= SymbolFlags.PropertyExcludes;
  if (flags & SymbolFlags.EnumMember) result |= SymbolFlags.EnumMemberExcludes;
  if (flags & SymbolFlags.Function) result |= SymbolFlags.FunctionExcludes;
  if (flags & SymbolFlags.Class) result |= SymbolFlags.ClassExcludes;
  if (flags & SymbolFlags.Interface) result |= SymbolFlags.InterfaceExcludes;
  if (flags & SymbolFlags.RegularEnum) result |= SymbolFlags.RegularEnumExcludes;
  if (flags & SymbolFlags.ConstEnum) result |= SymbolFlags.ConstEnumExcludes;
  if (flags & SymbolFlags.ValueModule) result |= SymbolFlags.ValueModuleExcludes;
  if (flags & SymbolFlags.Method) result |= SymbolFlags.MethodExcludes;
  if (flags & SymbolFlags.GetAccessor) result |= SymbolFlags.GetAccessorExcludes;
  if (flags & SymbolFlags.SetAccessor) result |= SymbolFlags.SetAccessorExcludes;
  if (flags & SymbolFlags.TypeParameter) result |= SymbolFlags.TypeParameterExcludes;
  if (flags & SymbolFlags.TypeAlias) result |= SymbolFlags.TypeAliasExcludes;
  if (flags & SymbolFlags.Alias) result |= SymbolFlags.AliasExcludes;
  return result;
}
export abstract class Symbol implements qt.Symbol {
  id?: number;
  mergeId?: number;
  parent?: Symbol;
  members?: SymbolTable;
  exports?: SymbolTable;
  exportSymbol?: Symbol;
  globalExports?: SymbolTable;
  declarations?: Declaration[];
  valueDeclaration?: Declaration;
  isAssigned?: boolean;
  assignmentDeclarationMembers?: QMap<Declaration>;
  isReferenced?: SymbolFlags;
  isReplaceableByMethod?: boolean;
  constEnumOnlyModule?: boolean;
  docComment?: SymbolDisplayPart[];
  getComment?: SymbolDisplayPart[];
  setComment?: SymbolDisplayPart[];
  tags?: qt.DocTagInfo[];
  constructor(public flags: SymbolFlags, public escName: __String) {}
  get name() {
    const d = this.valueDeclaration;
    if (d?.isPrivateIdentifierPropertyDeclaration()) return idText(d.name);
    return qy.get.unescUnderscores(this.escName);
  }
  abstract getId(): number;
  getName() {
    return this.name;
  }
  getEscName() {
    return this.escName;
  }
  getFlags() {
    return this.flags;
  }
  getDeclarations() {
    return this.declarations;
  }
  getDocComment(checker?: TypeChecker): SymbolDisplayPart[] {
    if (!this.docComment) {
      this.docComment = empty;
      if (!this.declarations && ((this as Symbol) as TransientSymbol).target && (((this as Symbol) as TransientSymbol).target as TransientSymbol).tupleLabelDeclaration) {
        const labelDecl = (((this as Symbol) as TransientSymbol).target as TransientSymbol).tupleLabelDeclaration!;
        this.docComment = getDocComment([labelDecl], checker);
      } else {
        this.docComment = getDocComment(this.declarations, checker);
      }
    }
    return this.docComment!;
  }
  getCtxComment(context?: Node, checker?: TypeChecker): SymbolDisplayPart[] {
    switch (context?.kind) {
      case Syntax.GetAccessor:
        if (!this.getComment) {
          this.getComment = empty;
          this.getComment = getDocComment(filter(this.declarations, isGetAccessor), checker);
        }
        return this.getComment!;
      case Syntax.SetAccessor:
        if (!this.setComment) {
          this.setComment = empty;
          this.setComment = getDocComment(filter(this.declarations, isSetAccessor), checker);
        }
        return this.setComment!;
      default:
        return this.getDocComment(checker);
    }
  }
  getDocTags(): qt.DocTagInfo[] {
    if (!this.tags) this.tags = Doc.getDocTagsFromDeclarations(this.declarations);
    return this.tags!;
  }
  getPropertyNameForUniqueESSymbol(): __String {
    return `__@${this.getId()}@${this.escName}` as __String;
  }
  getSymbolNameForPrivateIdentifier(description: __String): __String {
    return `__#${this.getId()}@${description}` as __String;
  }
  isKnownSymbol() {
    return startsWith(this.escName as string, '__@');
  }
  getLocalSymbolForExportDefault() {
    return this.isExportDefaultSymbol() ? this.declarations![0].localSymbol : undefined;
  }
  isExportDefaultSymbol() {
    return length(this.declarations) > 0 && hasSyntacticModifier(this.declarations![0], ModifierFlags.Default);
  }
  getDeclarationOfKind<T extends Declaration>(k: T['kind']): T | undefined {
    const ds = this.declarations;
    if (ds) {
      for (const d of ds) {
        if (d.kind === k) return d as T;
      }
    }
    return;
  }
  isTransientSymbol(): this is TransientSymbol {
    return (this.flags & SymbolFlags.Transient) !== 0;
  }
  getNonAugmentationDeclaration() {
    const ds = this.declarations;
    return ds && find(ds, (d) => !qc.is.externalModuleAugmentation(d) && !(qc.is.kind(ModuleDeclaration, d) && isGlobalScopeAugmentation(d)));
  }
  setValueDeclaration(d: Declaration) {
    const v = this.valueDeclaration;
    if (
      !v ||
      (!(d.flags & NodeFlags.Ambient && !(v.flags & NodeFlags.Ambient)) && isAssignmentDeclaration(v) && !isAssignmentDeclaration(d)) ||
      (v.kind !== d.kind && qc.is.effectiveModuleDeclaration(v))
    ) {
      this.valueDeclaration = d;
    }
  }
  isFunctionSymbol() {
    if (!this.valueDeclaration) return false;
    const v = this.valueDeclaration;
    return v.kind === Syntax.FunctionDeclaration || (qc.is.kind(VariableDeclaration, v) && v.initializer && qc.is.functionLike(v.initializer));
  }
  getCheckFlags(): CheckFlags {
    return this.isTransientSymbol() ? this.checkFlags : 0;
  }
  getDeclarationModifierFlagsFromSymbol(): ModifierFlags {
    if (this.valueDeclaration) {
      const f = getCombinedModifierFlags(this.valueDeclaration);
      return this.parent && this.parent.flags & SymbolFlags.Class ? f : f & ~ModifierFlags.AccessibilityModifier;
    }
    if (this.isTransientSymbol() && this.getCheckFlags() & CheckFlags.Synthetic) {
      const f = this.checkFlags;
      const a = f & CheckFlags.ContainsPrivate ? ModifierFlags.Private : f & CheckFlags.ContainsPublic ? ModifierFlags.Public : ModifierFlags.Protected;
      const s = f & CheckFlags.ContainsStatic ? ModifierFlags.Static : 0;
      return a | s;
    }
    if (this.flags & SymbolFlags.Prototype) return ModifierFlags.Public | ModifierFlags.Static;
    return 0;
  }
  skipAlias(c: TypeChecker) {
    return this.flags & SymbolFlags.Alias ? c.getAliasedSymbol(this) : this;
  }
  getCombinedLocalAndExportSymbolFlags(): SymbolFlags {
    return this.exportSymbol ? this.exportSymbol.flags | this.flags : this.flags;
  }
  isAbstractConstructorSymbol() {
    if (this.flags & SymbolFlags.Class) {
      const d = this.getClassLikeDeclarationOfSymbol();
      return !!d && hasSyntacticModifier(d, ModifierFlags.Abstract);
    }
    return false;
  }
  getClassLikeDeclarationOfSymbol(): ClassLikeDeclaration | undefined {
    const ds = this.declarations;
    return ds && find(ds, isClassLike);
  }
  isUMDExportSymbol() {
    return this.declarations?.[0] && qc.is.kind(NamespaceExportDeclaration, this.declarations[0]);
  }
  isShorthandAmbientModuleSymbol() {
    return qc.is.shorthandAmbientModule(this.valueDeclaration);
  }
  abstract merge(t: Symbol, unidirectional?: boolean): Symbol;
}
export class SymbolTable<S extends Symbol = Symbol> extends Map<__String, S> implements UnderscoreEscapedMap<S> {
  constructor(ss?: readonly S[]) {
    super();
    if (ss) {
      for (const s of ss) {
        this.set(s.escName, s);
      }
    }
  }
  add(ss: SymbolTable<S>, m: DiagnosticMessage) {
    ss.forEach((s, id) => {
      const t = this.get(id);
      if (t) forEach(t.declarations, addDeclarationDiagnostic(qy.get.unescUnderscores(id), m));
      else this.set(id, s);
    });
    function addDeclarationDiagnostic(id: string, m: DiagnosticMessage) {
      return (d: Declaration) => diagnostics.add(createDiagnosticForNode(d, m, id));
    }
  }
  merge(ss: SymbolTable<S>, unidirectional = false) {
    ss.forEach((s, i) => {
      const t = this.get(i);
      this.set(i, t ? s.merge(t, unidirectional) : s);
    });
  }
  combine(ss?: SymbolTable<S>): SymbolTable<S> | undefined {
    if (!hasEntries(this)) return ss;
    if (!hasEntries(ss)) return this;
    const t = new SymbolTable<S>();
    t.merge(this);
    t.merge(ss!);
    return t;
  }
  copy(to: SymbolTable<S>, meaning: SymbolFlags) {
    if (meaning) {
      this.forEach((s) => {
        copySymbol(s, to, meaning);
      });
    }
  }
}
export function cloneMap(m: SymbolTable): SymbolTable;
export function cloneMap<T>(m: QReadonlyMap<T>): QMap<T>;
export function cloneMap<T>(m: ReadonlyUnderscoreEscapedMap<T>): UnderscoreEscapedMap<T>;
export function cloneMap<T>(m: QReadonlyMap<T> | ReadonlyUnderscoreEscapedMap<T> | SymbolTable): QMap<T> | UnderscoreEscapedMap<T> | SymbolTable {
  const c = new QMap<T>();
  copyEntries(m as QMap<T>, c);
  return c;
}
export function createGetSymbolWalker(
  getRestTypeOfSignature: (sig: Signature) => Type,
  getTypePredicateOfSignature: (sig: Signature) => TypePredicate | undefined,
  getReturnTypeOfSignature: (sig: Signature) => Type,
  getBaseTypes: (type: Type) => Type[],
  resolveStructuredTypeMembers: (type: ObjectType) => ResolvedType,
  getTypeOfSymbol: (sym: Symbol) => Type,
  getResolvedSymbol: (node: Node) => Symbol,
  getIndexTypeOfStructuredType: (type: Type, kind: IndexKind) => Type | undefined,
  getConstraintOfTypeParameter: (typeParameter: TypeParameter) => Type | undefined,
  getFirstIdentifier: (node: EntityNameOrEntityNameExpression) => Identifier,
  getTypeArguments: (type: TypeReference) => readonly Type[]
) {
  return getSymbolWalker;
  function getSymbolWalker(accept: (symbol: Symbol) => boolean = () => true): SymbolWalker {
    const visitedTypes: Type[] = [];
    const visitedSymbols: Symbol[] = [];
    return {
      walkType: (type) => {
        try {
          visitType(type);
          return { visitedTypes: getOwnValues(visitedTypes), visitedSymbols: getOwnValues(visitedSymbols) };
        } finally {
          clear(visitedTypes);
          clear(visitedSymbols);
        }
      },
      walkSymbol: (symbol) => {
        try {
          visitSymbol(symbol);
          return { visitedTypes: getOwnValues(visitedTypes), visitedSymbols: getOwnValues(visitedSymbols) };
        } finally {
          clear(visitedTypes);
          clear(visitedSymbols);
        }
      },
    };
    function visitType(type: Type | undefined) {
      if (!type) return;
      if (visitedTypes[type.id]) return;
      visitedTypes[type.id] = type;
      const shouldBail = visitSymbol(type.symbol);
      if (shouldBail) return;
      if (type.flags & TypeFlags.Object) {
        const objectType = type as ObjectType;
        const objectFlags = objectType.objectFlags;
        if (objectFlags & ObjectFlags.Reference) visitTypeReference(type as TypeReference);
        if (objectFlags & ObjectFlags.Mapped) visitMappedType(type as MappedType);
        if (objectFlags & (ObjectFlags.Class | ObjectFlags.Interface)) visitInterfaceType(type as InterfaceType);
        if (objectFlags & (ObjectFlags.Tuple | ObjectFlags.Anonymous)) visitObjectType(objectType);
      }
      if (type.flags & TypeFlags.TypeParameter) visitTypeParameter(type as TypeParameter);
      if (type.flags & TypeFlags.UnionOrIntersection) visitUnionOrIntersectionType(type as UnionOrIntersectionType);
      if (type.flags & TypeFlags.Index) visitIndexType(type as IndexType);
      if (type.flags & TypeFlags.IndexedAccess) visitIndexedAccessType(type as IndexedAccessType);
    }
    function visitTypeReference(type: TypeReference) {
      visitType(type.target);
      forEach(getTypeArguments(type), visitType);
    }
    function visitTypeParameter(type: TypeParameter) {
      visitType(getConstraintOfTypeParameter(type));
    }
    function visitUnionOrIntersectionType(type: UnionOrIntersectionType) {
      forEach(type.types, visitType);
    }
    function visitIndexType(type: IndexType) {
      visitType(type.type);
    }
    function visitIndexedAccessType(type: IndexedAccessType) {
      visitType(type.objectType);
      visitType(type.indexType);
      visitType(type.constraint);
    }
    function visitMappedType(type: MappedType) {
      visitType(type.typeParameter);
      visitType(type.constraintType);
      visitType(type.templateType);
      visitType(type.modifiersType);
    }
    function visitSignature(signature: Signature) {
      const typePredicate = getTypePredicateOfSignature(signature);
      if (typePredicate) visitType(typePredicate.type);
      forEach(signature.typeParameters, visitType);
      for (const parameter of signature.parameters) {
        visitSymbol(parameter);
      }
      visitType(getRestTypeOfSignature(signature));
      visitType(getReturnTypeOfSignature(signature));
    }
    function visitInterfaceType(interfaceT: InterfaceType) {
      visitObjectType(interfaceT);
      forEach(interfaceT.typeParameters, visitType);
      forEach(getBaseTypes(interfaceT), visitType);
      visitType(interfaceT.thisType);
    }
    function visitObjectType(type: ObjectType) {
      const stringIndexType = getIndexTypeOfStructuredType(type, IndexKind.String);
      visitType(stringIndexType);
      const numberIndexType = getIndexTypeOfStructuredType(type, IndexKind.Number);
      visitType(numberIndexType);
      const resolved = resolveStructuredTypeMembers(type);
      for (const signature of resolved.callSignatures) {
        visitSignature(signature);
      }
      for (const signature of resolved.constructSignatures) {
        visitSignature(signature);
      }
      for (const p of resolved.properties) {
        visitSymbol(p);
      }
    }
    function visitSymbol(s?: Symbol): boolean {
      if (!s) return false;
      const i = s.getId();
      if (visitedSymbols[i]) return false;
      visitedSymbols[i] = s;
      if (!accept(s)) return true;
      const t = getTypeOfSymbol(s);
      visitType(t);
      if (s.exports) s.exports.forEach(visitSymbol);
      forEach(s.declarations, (d) => {
        if ((d as any).type && (d as any).type.kind === Syntax.TypeQuery) {
          const query = (d as any).type as TypeQueryNode;
          const entity = getResolvedSymbol(getFirstIdentifier(query.exprName));
          visitSymbol(entity);
        }
      });
      return false;
    }
  }
}
export namespace Node {
  function hasDocInheritDocTag(node: Node) {
    return getDoc.tags(node).some((tag) => tag.tagName.text === 'inheritDoc');
  }
  function getDocComment(declarations: readonly Declaration[] | undefined, checker: TypeChecker | undefined): SymbolDisplayPart[] {
    if (!declarations) return empty;
    let doc = Doc.getDocCommentsFromDeclarations(declarations);
    if (doc.length === 0 || declarations.some(hasDocInheritDocTag)) {
      forEachUnique(declarations, (declaration) => {
        const inheritedDocs = findInheritedDocComments(declaration, declaration.symbol.name, checker!);
        if (inheritedDocs) doc = doc.length === 0 ? inheritedDocs.slice() : inheritedDocs.concat(lineBreakPart(), doc);
      });
    }
    return doc;
  }
  function findInheritedDocComments(declaration: Declaration, propertyName: string, typeChecker: TypeChecker): readonly SymbolDisplayPart[] | undefined {
    return firstDefined(declaration.parent ? getAllSuperTypeNodes(declaration.parent) : empty, (superTypeNode) => {
      const superType = typeChecker.getTypeAtLocation(superTypeNode);
      const baseProperty = superType && typeChecker.getPropertyOfType(superType, propertyName);
      const inheritedDocs = baseProperty && baseProperty.getDocComment(typeChecker);
      return inheritedDocs && inheritedDocs.length ? inheritedDocs : undefined;
    });
  }
}
qb.addMixins(ClassLikeDeclarationBase, [DocContainer]);
qb.addMixins(FunctionOrConstructorTypeNodeBase, [TypeNode]);
qb.addMixins(ObjectLiteralExpressionBase, [Declaration]);
qb.addMixins(LiteralExpression, [LiteralLikeNode]);
