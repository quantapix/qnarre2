import { Nodes, Token } from './base';
import * as qb from './base';
import { qf } from './frame';
import { DocTag, Modifier, Node, NodeFlags, ObjectFlags } from '../type';
import * as qt from '../type';
import * as qu from '../util';
import { Syntax } from '../syntax';
import * as qy from '../syntax';
export type NodeType<S extends Syntax> = S extends keyof SynMap ? SynMap[S] : never;
export class Nobj extends qb.Nobj {
  is<S extends Syntax, T extends { kind: S; also?: Syntax[] }>(t: T): this is NodeType<T['kind']> {
    return this.kind === t.kind || !!t.also?.includes(this.kind);
  }
}
export abstract class UnionOrIntersectionTyping extends qb.Tobj implements qt.UnionOrIntersectionType {
  types: qt.Nodes<qt.Typing>;
  objectFlags: ObjectFlags;
  propertyCache: qb.SymbolTable;
  resolvedProperties: qb.Symbol[];
  resolvedIndexType: qt.IndexType;
  resolvedStringIndexType: qt.IndexType;
  resolvedBaseConstraint: qb.Type;
  constructor(k: Syntax.UnionTyping | Syntax.IntersectionTyping, ts: readonly qt.Typing[]) {
    super(true, k);
    this.types = parenthesize.elemTypeMembers(ts);
  }
  update(ts: qt.Nodes<qt.Typing>) {
    return this.types !== ts ? new UnionOrIntersectionTyping(this.kind, ts).updateFrom(this) : this;
  }
}
export namespace ArrayBindingElem {
  export const also = [Syntax.BindingElem, Syntax.OmittedExpression];
}
export class ArrayBindingPattern extends Nobj implements qt.ArrayBindingPattern {
  static readonly kind = Syntax.ArrayBindingPattern;
  parent?: qt.VariableDeclaration | qt.ParameterDeclaration | qt.BindingElem;
  elems: qt.Nodes<qt.ArrayBindingElem>;
  constructor(es: readonly qt.ArrayBindingElem[]) {
    super(true);
    this.elems = new Nodes(es);
  }
  update(es: readonly qt.ArrayBindingElem[]) {
    return this.elems !== es ? new ArrayBindingPattern(es).updateFrom(this) : this;
  }
}
ArrayBindingPattern.prototype.kind = ArrayBindingPattern.kind;
export class ArrayLiteralExpression extends qb.PrimaryExpr implements qt.ArrayLiteralExpression {
  static readonly kind = Syntax.ArrayLiteralExpression;
  elems: qt.Nodes<qt.Expression>;
  multiLine?: boolean;
  constructor(es?: readonly qt.Expression[], multiLine?: boolean) {
    super(true);
    this.elems = parenthesize.listElems(new Nodes(es));
    if (multiLine) this.multiLine = true;
  }
  update(es: readonly qt.Expression[]) {
    return this.elems !== es ? new ArrayLiteralExpression(es, this.multiLine).updateFrom(this) : this;
  }
}
ArrayLiteralExpression.prototype.kind = ArrayLiteralExpression.kind;
export class ArrayTyping extends qb.Tobj implements qt.ArrayTyping {
  static readonly kind = Syntax.ArrayTyping;
  elemType: qt.Typing;
  constructor(t: qt.Typing) {
    super(true);
    this.elemType = parenthesize.arrayTypeMember(t);
  }
  update(t: qt.Typing) {
    return this.elemType !== t ? new ArrayTyping(t).updateFrom(this) : this;
  }
}
ArrayTyping.prototype.kind = ArrayTyping.kind;
export class ArrowFunction extends qb.FunctionLikeDecl implements qt.ArrowFunction {
  static readonly kind = Syntax.ArrowFunction;
  equalsGreaterThanToken: qt.EqualsGreaterThanToken;
  body: qt.ConciseBody;
  name: never;
  constructor(
    ms: readonly Modifier[] | undefined,
    ts: readonly qt.TypeParameterDeclaration[] | undefined,
    ps: readonly qt.ParameterDeclaration[],
    t: qt.Typing | undefined,
    a: qt.EqualsGreaterThanToken | undefined,
    b: qt.ConciseBody
  ) {
    super(true, Syntax.ArrowFunction, ts, ps, t);
    this.modifiers = Nodes.from(ms);
    this.equalsGreaterThanToken = a || new qb.Token(Syntax.EqualsGreaterThanToken);
    this.body = parenthesize.conciseBody(b);
  }
  update(
    ms: readonly Modifier[] | undefined,
    ts: readonly qt.TypeParameterDeclaration[] | undefined,
    ps: readonly qt.ParameterDeclaration[],
    t: qt.Typing | undefined,
    a: qt.EqualsGreaterThanToken,
    b: qt.ConciseBody
  ) {
    return this.modifiers !== ms || this.typeParameters !== ts || this.parameters !== ps || this.type !== t || this.equalsGreaterThanToken !== a || this.body !== b
      ? new ArrowFunction(ms, ts, ps, t, a, b).updateFrom(this)
      : this;
  }
  _expressionBrand: any;
}
ArrowFunction.prototype.kind = ArrowFunction.kind;
qu.addMixins(ArrowFunction, [qb.Expr, qb.DocContainer]);
export class AsExpression extends qb.Expr implements qt.AsExpression {
  static readonly kind = Syntax.AsExpression;
  expression: qt.Expression;
  type: qt.Typing;
  constructor(e: qt.Expression, t: qt.Typing) {
    super(true);
    this.expression = e;
    this.type = t;
  }
  update(e: qt.Expression, t: qt.Typing) {
    return this.expression !== e || this.type !== t ? new AsExpression(e, t).updateFrom(this) : this;
  }
}
AsExpression.prototype.kind = AsExpression.kind;
export namespace AssignmentPattern {
  export const kind = Syntax.ArrayLiteralExpression;
  export const also = [Syntax.ObjectLiteralExpression];
}
export class AwaitExpression extends qb.UnaryExpr implements qt.AwaitExpression {
  static readonly kind = Syntax.AwaitExpression;
  expression: qt.UnaryExpression;
  constructor(e: qt.Expression) {
    super(true);
    this.expression = parenthesize.prefixOperand(e);
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new AwaitExpression(e).updateFrom(this) : this;
  }
}
AwaitExpression.prototype.kind = AwaitExpression.kind;
export class BigIntLiteral extends qb.LiteralExpr implements qt.BigIntLiteral {
  static readonly kind: Syntax.BigIntLiteral;
  constructor(public text: string) {
    super(true);
  }
  expression(e: qt.Expression) {
    return e.kind === Syntax.BigIntLiteral || (e.kind === Syntax.PrefixUnaryExpression && e.operator === Syntax.MinusToken && e.operand.kind === Syntax.BigIntLiteral);
  }
}
BigIntLiteral.prototype.kind = BigIntLiteral.kind;
export class BinaryExpression extends qb.Expr implements qt.BinaryExpression {
  static readonly kind = Syntax.BinaryExpression;
  left: qt.Expression;
  operatorToken: qt.BinaryOperatorToken;
  right: qt.Expression;
  constructor(l: qt.Expression, o: qt.BinaryOperator | qt.BinaryOperatorToken, r: qt.Expression) {
    super();
    const t = asToken(o);
    const k = t.kind;
    this.left = parenthesize.binaryOperand(k, l, true, undefined);
    this.operatorToken = t;
    this.right = parenthesize.binaryOperand(k, r, false, this.left);
  }
  update(l: qt.Expression, r: qt.Expression, o: qt.BinaryOperator | qt.BinaryOperatorToken = this.operatorToken) {
    return this.left !== l || this.right !== r || this.operatorToken !== o ? new BinaryExpression(l, o, r).updateFrom(this) : this;
  }
  _declarationBrand: any;
}
BinaryExpression.prototype.kind = BinaryExpression.kind;
qu.addMixins(BinaryExpression, [qb.Decl]);
export class BindingElem extends qb.NamedDecl implements qt.BindingElem {
  static readonly kind = Syntax.BindingElem;
  parent?: qt.BindingPattern;
  propertyName?: qt.PropertyName;
  dot3Token?: qt.Dot3Token;
  name: qt.BindingName;
  initer?: qt.Expression;
  constructor(d: qt.Dot3Token | undefined, p: string | qt.PropertyName | undefined, b: string | qt.BindingName, i?: qt.Expression) {
    super();
    this.dot3Token = d;
    this.propertyName = asName(p);
    this.name = asName(b);
    this.initer = i;
  }
  update(d: qt.Dot3Token | undefined, p: qt.PropertyName | undefined, b: qt.BindingName, i?: qt.Expression) {
    return this.propertyName !== p || this.dot3Token !== d || this.name !== b || this.initer !== i ? new BindingElem(d, p, b, i).updateFrom(this) : this;
  }
}
BindingElem.prototype.kind = BindingElem.kind;
export namespace BindingPattern {
  export const kind = Syntax.ArrayBindingPattern;
  export const also = [Syntax.ObjectBindingPattern];
}
export class Block extends qb.Stmt implements qt.Block {
  static readonly kind = Syntax.Block;
  statements: qt.Nodes<qt.Statement>;
  multiLine?: boolean;
  constructor(ss: readonly qt.Statement[], multiLine?: boolean) {
    super();
    this.statements = new Nodes(ss);
    if (multiLine) this.multiLine = multiLine;
  }
  update(ss: readonly qt.Statement[]) {
    return this.statements !== ss ? new Block(ss, this.multiLine).updateFrom(this) : this;
  }
}
Block.prototype.kind = Block.kind;
export class BooleanLiteral extends qb.PrimaryExpr implements qt.BooleanLiteral {
  static readonly kind = Syntax.NullKeyword;
  constructor(k: boolean) {
    super(true, k ? Syntax.TrueKeyword : Syntax.FalseKeyword);
  }
  _typingBrand: any;
}
BooleanLiteral.prototype.kind = BooleanLiteral.kind;
export class BreakStatement extends qb.Stmt implements qt.BreakStatement {
  static readonly kind = Syntax.BreakStatement;
  label?: qt.Identifier;
  constructor(l?: string | qt.Identifier) {
    super();
    this.label = asName(l);
  }
  update(l?: qt.Identifier) {
    return this.label !== l ? new BreakStatement(l).updateFrom(this) : this;
  }
}
BreakStatement.prototype.kind = BreakStatement.kind;
export class Bundle extends Nobj implements qt.Bundle {
  static readonly kind = Syntax.Bundle;
  prepends: readonly (qt.InputFiles | qt.UnparsedSource)[];
  sourceFiles: readonly qt.SourceFile[];
  syntheticFileReferences?: readonly qt.FileReference[];
  syntheticTypeReferences?: readonly qt.FileReference[];
  syntheticLibReferences?: readonly qt.FileReference[];
  hasNoDefaultLib?: boolean;
  constructor(ss: readonly qt.SourceFile[], ps: readonly (qt.UnparsedSource | qt.InputFiles)[] = qu.empty) {
    super();
    this.prepends = ps;
    this.sourceFiles = ss;
  }
  update(ss: readonly qt.SourceFile[], ps: readonly (qt.UnparsedSource | qt.InputFiles)[] = qu.empty) {
    if (this.sourceFiles !== ss || this.prepends !== ps) return new Bundle(ss, ps);
    return this;
  }
}
Bundle.prototype.kind = Bundle.kind;
export class CallBinding extends Nobj {
  target!: qt.LeftExpression;
  thisArg!: qt.Expression;
}
export class CallExpression extends qb.LeftExpr implements qt.CallExpression {
  static readonly kind = Syntax.CallExpression;
  expression: qt.LeftExpression;
  questionDotToken?: qt.QuestionDotToken;
  typeArguments?: qt.Nodes<qt.Typing>;
  arguments: qt.Nodes<qt.Expression>;
  constructor(e: qt.Expression, ts?: readonly qt.Typing[], es?: readonly qt.Expression[]) {
    super(true);
    this.expression = parenthesize.forAccess(e);
    this.typeArguments = Nodes.from(ts);
    this.arguments = parenthesize.listElems(new Nodes(es));
  }
  update(e: qt.Expression, ts: readonly qt.Typing[] | undefined, es: readonly qt.Expression[]): CallExpression {
    if (qf.is.optionalChain(this)) return super.update(e, this.questionDotToken, ts, es);
    return this.expression !== e || this.typeArguments !== ts || this.arguments !== es ? new CallExpression(e, ts, es).updateFrom(this) : this;
  }
  _declarationBrand: any;
}
CallExpression.prototype.kind = CallExpression.kind;
qu.addMixins(CallExpression, [qb.Decl]);
export class CallChain extends CallExpression implements qt.CallChain {
  _optionalChainBrand: any;
  constructor(e: qt.Expression, q?: qt.QuestionDotToken, ts?: readonly qt.Typing[], es?: readonly qt.Expression[]) {
    super(e, ts, es);
    this.flags |= NodeFlags.OptionalChain;
    this.questionDotToken = q;
  }
  update(e: qt.Expression, ts: readonly qt.Typing[] | undefined, es: readonly qt.Expression[], q?: qt.QuestionDotToken) {
    qu.assert(!!(this.flags & NodeFlags.OptionalChain));
    return this.expression !== e || this.questionDotToken !== q || this.typeArguments !== ts || this.arguments !== es ? new CallChain(e, q, ts, es).updateFrom(this) : this;
  }
}
CallChain.prototype.kind = CallChain.kind;
export class CallSignatureDeclaration extends qb.SignatureDecl implements qt.CallSignatureDeclaration {
  static readonly kind = Syntax.CallSignature;
  docCache?: readonly qt.DocTag[];
  questionToken?: qt.QuestionToken;
  constructor(ts: readonly qt.TypeParameterDeclaration[] | undefined, ps: readonly qt.ParameterDeclaration[], t?: qt.Typing) {
    super(true, Syntax.CallSignature, ts, ps, t);
  }
  update(ts: qt.Nodes<qt.TypeParameterDeclaration> | undefined, ps: qt.Nodes<qt.ParameterDeclaration>, t?: qt.Typing) {
    return super.update(ts, ps, t);
  }
  _typeElemBrand: any;
}
CallSignatureDeclaration.prototype.kind = CallSignatureDeclaration.kind;
export class CaseBlock extends Nobj implements qt.CaseBlock {
  static readonly kind = Syntax.CaseBlock;
  parent?: qt.SwitchStatement;
  clauses: qt.Nodes<qt.CaseOrDefaultClause>;
  constructor(cs: readonly qt.CaseOrDefaultClause[]) {
    super(true);
    this.clauses = new Nodes(cs);
  }
  update(cs: readonly qt.CaseOrDefaultClause[]) {
    return this.clauses !== cs ? new CaseBlock(cs).updateFrom(this) : this;
  }
}
CaseBlock.prototype.kind = CaseBlock.kind;
export class CaseClause extends Nobj implements qt.CaseClause {
  static readonly kind = Syntax.CaseClause;
  parent?: qt.CaseBlock;
  expression: qt.Expression;
  statements: qt.Nodes<qt.Statement>;
  fallthroughFlowNode?: qt.FlowNode;
  constructor(e: qt.Expression, ss: readonly qt.Statement[]) {
    super(true);
    this.expression = parenthesize.expressionForList(e);
    this.statements = new Nodes(ss);
  }
  update(e: qt.Expression, ss: readonly qt.Statement[]) {
    return this.expression !== e || this.statements !== ss ? new CaseClause(e, ss).updateFrom(this) : this;
  }
}
CaseClause.prototype.kind = CaseClause.kind;
export class CatchClause extends Nobj implements qt.CatchClause {
  static readonly kind = Syntax.CatchClause;
  parent?: qt.TryStatement;
  variableDeclaration?: qt.VariableDeclaration;
  block: qt.Block;
  constructor(v: string | qt.VariableDeclaration | undefined, b: qt.Block) {
    super(true);
    this.variableDeclaration = qu.isString(v) ? new VariableDeclaration(v) : v;
    this.block = b;
  }
  update(v: qt.VariableDeclaration | undefined, b: qt.Block) {
    return this.variableDeclaration !== v || this.block !== b ? new CatchClause(v, b).updateFrom(this) : this;
  }
}
CatchClause.prototype.kind = CatchClause.kind;
export class ClassDeclaration extends qb.ClassLikeDecl implements qt.ClassDeclaration {
  static readonly kind = Syntax.ClassDeclaration;
  name?: qt.Identifier;
  docCache?: readonly qt.DocTag[];
  constructor(
    ds: readonly qt.Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    name: string | qt.Identifier | undefined,
    ts: readonly qt.TypeParameterDeclaration[] | undefined,
    hs: readonly qt.HeritageClause[] | undefined,
    es: readonly qt.ClassElem[]
  ) {
    super(true, Syntax.ClassDeclaration, ts, hs, es);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(name);
  }
  update(
    ds: readonly qt.Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    name: qt.Identifier | undefined,
    ts: readonly qt.TypeParameterDeclaration[] | undefined,
    hs: readonly qt.HeritageClause[] | undefined,
    es: readonly qt.ClassElem[]
  ) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== name || this.typeParameters !== ts || this.heritageClauses !== hs || this.members !== es
      ? new ClassDeclaration(ds, ms, name, ts, hs, es).updateFrom(this)
      : this;
  }
  _statementBrand: any;
}
ClassDeclaration.prototype.kind = ClassDeclaration.kind;
qu.addMixins(ClassDeclaration, [qb.DeclarationStmt]);
export class ClassExpression extends qb.ClassLikeDecl implements qt.ClassExpression {
  static readonly kind = Syntax.ClassExpression;
  docCache?: readonly qt.DocTag[];
  constructor(
    ms: readonly Modifier[] | undefined,
    name: string | qt.Identifier | undefined,
    ts: readonly qt.TypeParameterDeclaration[] | undefined,
    hs: readonly qt.HeritageClause[] | undefined,
    es: readonly qt.ClassElem[]
  ) {
    super(true, Syntax.ClassExpression, ts, hs, es);
    this.decorators = undefined;
    this.modifiers = Nodes.from(ms);
    this.name = asName(name);
  }
  update(
    ms: readonly Modifier[] | undefined,
    name: qt.Identifier | undefined,
    ts: readonly qt.TypeParameterDeclaration[] | undefined,
    hs: readonly qt.HeritageClause[] | undefined,
    es: readonly qt.ClassElem[]
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
qu.addMixins(ClassExpression, [qb.PrimaryExpr]);
export class CommaListExpression extends qb.Expr implements qt.CommaListExpression {
  static readonly kind: Syntax.CommaListExpression;
  elems: qt.Nodes<qt.Expression>;
  constructor(es: readonly qt.Expression[]) {
    super(true);
    const flatten = (e: qt.Expression): qt.Expression | readonly qt.Expression[] => {
      const n = e as Node;
      if (qu.isSynthesized(n) && !qf.is.parseTreeNode(n) && !n.original && !n.emitNode && !n.id) {
        if (n.kind === Syntax.CommaListExpression) return n.elems;
        if (n.kind === Syntax.BinaryExpression && n.operatorToken.kind === Syntax.CommaToken) return [n.left, n.right];
      }
      return e;
    };
    this.elems = new Nodes(qu.sameFlatMap(es, flatten));
  }
  update(es: readonly qt.Expression[]) {
    return this.elems !== es ? new CommaListExpression(es).updateFrom(this) : this;
  }
}
CommaListExpression.prototype.kind = CommaListExpression.kind;
export class ComputedPropertyName extends Nobj implements qt.ComputedPropertyName {
  static readonly kind = Syntax.ComputedPropertyName;
  parent?: qt.Declaration;
  expression: qt.Expression;
  constructor(e: qt.Expression) {
    super(true);
    this.expression = qf.is.commaSequence(e) ? new ParenthesizedExpression(e) : e;
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new ComputedPropertyName(e).updateFrom(this) : this;
  }
}
ComputedPropertyName.prototype.kind = ComputedPropertyName.kind;
export class ConditionalExpression extends qb.Expr implements qt.ConditionalExpression {
  static readonly kind = Syntax.ConditionalExpression;
  condition: qt.Expression;
  questionToken: qt.QuestionToken;
  whenTrue: qt.Expression;
  colonToken: qt.ColonToken;
  whenFalse: qt.Expression;
  constructor(c: qt.Expression, q: qt.QuestionToken, t: qt.Expression, s: qt.ColonToken, f: qt.Expression);
  constructor(c: qt.Expression, q: qt.QuestionToken | qb.Expr, t: qt.Expression, s?: qt.ColonToken, f?: qt.Expression) {
    super(true);
    this.condition = parenthesize.forConditionalHead(c);
    this.questionToken = f ? q : new qb.Token(Syntax.QuestionToken);
    this.whenTrue = parenthesize.subexpressionOfConditionalExpression(f ? t : q);
    this.colonToken = f ? s! : new qb.Token(Syntax.ColonToken);
    this.whenFalse = parenthesize.subexpressionOfConditionalExpression(f ? f : t);
  }
  update(c: qt.Expression, q: qt.QuestionToken, t: qt.Expression, s: qt.ColonToken, f: qt.Expression): ConditionalExpression {
    return this.condition !== c || this.questionToken !== q || this.whenTrue !== t || this.colonToken !== s || this.whenFalse !== f ? new ConditionalExpression(c, q, t, s, f).updateFrom(this) : this;
  }
}
ConditionalExpression.prototype.kind = ConditionalExpression.kind;
export class ConditionalTyping extends qb.Tobj implements qt.ConditionalTyping {
  static readonly kind = Syntax.ConditionalTyping;
  checkType: qt.Typing;
  extendsType: qt.Typing;
  trueType: qt.Typing;
  falseType: qt.Typing;
  constructor(c: qt.Typing, e: qt.Typing, t: qt.Typing, f: qt.Typing) {
    super(true);
    this.checkType = parenthesize.conditionalTypeMember(c);
    this.extendsType = parenthesize.conditionalTypeMember(e);
    this.trueType = t;
    this.falseType = f;
  }
  update(c: qt.Typing, e: qt.Typing, t: qt.Typing, f: qt.Typing) {
    return this.checkType !== c || this.extendsType !== e || this.trueType !== t || this.falseType !== f ? new ConditionalTyping(c, e, t, f).updateFrom(this) : this;
  }
}
ConditionalTyping.prototype.kind = ConditionalTyping.kind;
export class ConstructorDeclaration extends qb.FunctionLikeDecl implements qt.ConstructorDeclaration {
  static readonly kind = Syntax.Constructor;
  parent?: qt.ClassLikeDeclaration;
  body?: qt.FunctionBody;
  constructor(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly qt.ParameterDeclaration[], b?: qt.Block) {
    super(true, Syntax.Constructor, undefined, ps);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.body = b;
  }
  update(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly qt.ParameterDeclaration[], b?: qt.Block) {
    return this.decorators !== ds || this.modifiers !== ms || this.parameters !== ps || this.body !== b ? new ConstructorDeclaration(ds, ms, ps, b).updateFrom(this) : this;
  }
  _classElemBrand: any;
}
ConstructorDeclaration.prototype.kind = ConstructorDeclaration.kind;
qu.addMixins(ConstructorDeclaration, [qb.ClassElem, qb.DocContainer]);
export class ConstructorTyping extends qb.FunctionOrConstructorTobj implements qt.ConstructorTyping {
  static readonly kind = Syntax.ConstructorTyping;
  docCache?: readonly qt.DocTag[];
  constructor(ts: readonly qt.TypeParameterDeclaration[] | undefined, ps: readonly qt.ParameterDeclaration[], t?: qt.Typing) {
    super(true, Syntax.ConstructorTyping, ts, ps, t);
  }
  update(ts: qt.Nodes<qt.TypeParameterDeclaration> | undefined, ps: qt.Nodes<qt.ParameterDeclaration>, t?: qt.Typing) {
    return super.update(ts, ps, t);
  }
  _typingBrand: any;
}
ConstructorTyping.prototype.kind = ConstructorTyping.kind;
export class ConstructSignatureDeclaration extends qb.SignatureDecl implements qt.ConstructSignatureDeclaration {
  static readonly kind = Syntax.ConstructSignature;
  questionToken?: qt.QuestionToken;
  docCache?: readonly qt.DocTag[];
  constructor(ts: readonly qt.TypeParameterDeclaration[] | undefined, ps: readonly qt.ParameterDeclaration[], t?: qt.Typing) {
    super(true, Syntax.ConstructSignature, ts, ps, t);
  }
  update(ts: qt.Nodes<qt.TypeParameterDeclaration> | undefined, ps: qt.Nodes<qt.ParameterDeclaration>, t?: qt.Typing) {
    return super.update(ts, ps, t);
  }
  _typeElemBrand: any;
}
ConstructSignatureDeclaration.prototype.kind = ConstructSignatureDeclaration.kind;
qu.addMixins(ConstructSignatureDeclaration, [qb.TypeElem]);
export class ContinueStatement extends qb.Stmt implements qt.ContinueStatement {
  static readonly kind = Syntax.ContinueStatement;
  label?: qt.Identifier;
  constructor(l?: string | qt.Identifier) {
    super(true);
    this.label = asName(l);
  }
  update(l: qt.Identifier) {
    return this.label !== l ? new ContinueStatement(l).updateFrom(this) : this;
  }
}
ContinueStatement.prototype.kind = ContinueStatement.kind;
export class DebuggerStatement extends qb.Stmt implements qt.DebuggerStatement {
  static readonly kind = Syntax.DebuggerStatement;
  constructor() {
    super(true);
  }
}
DebuggerStatement.prototype.kind = DebuggerStatement.kind;
export class Decorator extends Nobj implements qt.Decorator {
  static readonly kind = Syntax.Decorator;
  parent?: qt.NamedDecl;
  expression: qt.LeftExpression;
  constructor(e: qt.Expression) {
    super();
    this.expression = parenthesize.forAccess(e);
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new Decorator(e).updateFrom(this) : this;
  }
}
Decorator.prototype.kind = Decorator.kind;
export class DefaultClause extends Nobj implements qt.DefaultClause {
  static readonly kind = Syntax.DefaultClause;
  parent?: qt.CaseBlock;
  statements: qt.Nodes<qt.Statement>;
  fallthroughFlowNode?: qt.FlowNode;
  constructor(ss: readonly qt.Statement[]) {
    super();
    this.statements = new Nodes(ss);
  }
  update(ss: readonly qt.Statement[]) {
    return this.statements !== ss ? new DefaultClause(ss).updateFrom(this) : this;
  }
}
DefaultClause.prototype.kind = DefaultClause.kind;
export class DeleteExpression extends qb.UnaryExpr implements qt.DeleteExpression {
  static readonly kind = Syntax.DeleteExpression;
  expression: qt.UnaryExpression;
  constructor(e: qt.Expression) {
    super(true);
    this.expression = parenthesize.prefixOperand(e);
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new DeleteExpression(e).updateFrom(this) : this;
  }
}
DeleteExpression.prototype.kind = DeleteExpression.kind;
export class Doc extends Nobj implements qt.Doc {
  static readonly kind = Syntax.DocComment;
  parent?: qt.HasDoc;
  tags?: qt.Nodes<qt.DocTag>;
  comment?: string;
  constructor(c?: string, ts?: qt.Nodes<qt.DocTag>) {
    super(true);
    this.comment = c;
    this.tags = ts;
  }
}
Doc.prototype.kind = Doc.kind;
export class DocAllTyping extends qb.DocTobj implements qt.DocAllTyping {
  static readonly kind = Syntax.DocAllTyping;
}
DocAllTyping.prototype.kind = DocAllTyping.kind;
export class DocAugmentsTag extends qb.DocTag implements qt.DocAugmentsTag {
  static readonly kind = Syntax.DocAugmentsTag;
  class: qt.ExpressionWithTypings & { expression: qt.Identifier | qt.PropertyAccessEntityNameExpression };
  constructor(c: qt.DocAugmentsTag['class'], s?: string) {
    super(Syntax.DocAugmentsTag, 'augments', s);
    this.class = c;
  }
}
DocAugmentsTag.prototype.kind = DocAugmentsTag.kind;
export class DocAuthorTag extends qb.DocTag implements qt.DocAuthorTag {
  static readonly kind = Syntax.DocAuthorTag;
  constructor(c?: string) {
    super(Syntax.DocAuthorTag, 'author', c);
  }
}
DocAuthorTag.prototype.kind = DocAuthorTag.kind;
export class DocCallbackTag extends qb.DocTag implements qt.DocCallbackTag {
  static readonly kind = Syntax.DocCallbackTag;
  parent?: qt.Doc;
  fullName?: qt.DocNamespaceDeclaration | qt.Identifier;
  name?: qt.Identifier;
  typeExpression: qt.DocSignature;
  constructor(f: qt.DocNamespaceDeclaration | qt.Identifier | undefined, n: qt.Identifier | undefined, c: string | undefined, s: qt.DocSignature) {
    super(Syntax.DocCallbackTag, 'callback', c);
    this.fullName = f;
    this.name = n;
    this.typeExpression = s;
  }
  _declarationBrand: any;
}
DocCallbackTag.prototype.kind = DocCallbackTag.kind;
qu.addMixins(DocCallbackTag, [qb.NamedDecl]);
export class DocClassTag extends qb.DocTag implements qt.DocClassTag {
  static readonly kind = Syntax.DocClassTag;
  constructor(c?: string) {
    super(Syntax.DocClassTag, 'class', c);
  }
}
DocClassTag.prototype.kind = DocClassTag.kind;
export class DocEnumTag extends qb.DocTag implements qt.DocEnumTag {
  static readonly kind = Syntax.DocEnumTag;
  parent?: qt.Doc;
  typeExpression?: qt.DocTypingExpression;
  constructor(e?: qt.DocTypingExpression, c?: string) {
    super(Syntax.DocEnumTag, 'enum', c);
    this.typeExpression = e;
  }
  _declarationBrand: any;
}
DocEnumTag.prototype.kind = DocEnumTag.kind;
qu.addMixins(DocEnumTag, [qb.Decl]);
export class DocFunctionTyping extends qb.SignatureDecl implements qt.DocFunctionTyping {
  docCache?: readonly qt.DocTag[];
  static readonly kind = Syntax.DocFunctionTyping;
  _docTypeBrand: any;
  _typingBrand: any;
}
DocFunctionTyping.prototype.kind = DocFunctionTyping.kind;
qu.addMixins(DocFunctionTyping, [qb.DocTobj]);
export class DocImplementsTag extends qb.DocTag implements qt.DocImplementsTag {
  static readonly kind = Syntax.DocImplementsTag;
  class: qt.ExpressionWithTypings & { expression: qt.Identifier | qt.PropertyAccessEntityNameExpression };
  constructor(c: qt.DocImplementsTag['class'], s?: string) {
    super(Syntax.DocImplementsTag, 'implements', s);
    this.class = c;
  }
}
DocImplementsTag.prototype.kind = DocImplementsTag.kind;
export class DocNonNullableTyping extends qb.DocTobj implements qt.DocNonNullableTyping {
  static readonly kind = Syntax.DocNonNullableTyping;
  type!: qt.Typing;
}
DocNonNullableTyping.prototype.kind = DocNonNullableTyping.kind;
export class DocNullableTyping extends qb.DocTobj implements qt.DocNullableTyping {
  static readonly kind = Syntax.DocNullableTyping;
  type!: qt.Typing;
}
DocNullableTyping.prototype.kind = DocNullableTyping.kind;
export class DocOptionalTyping extends qb.DocTobj implements qt.DocOptionalTyping {
  static readonly kind = Syntax.DocOptionalTyping;
  type!: qt.Typing;
}
DocOptionalTyping.prototype.kind = DocOptionalTyping.kind;
export class DocPropertyLikeTag extends qb.DocTag implements qt.DocPropertyLikeTag {
  parent?: qt.Doc;
  name: qt.EntityName;
  typeExpression?: qt.DocTypingExpression;
  isNameFirst: boolean;
  isBracketed: boolean;
  constructor(kind: Syntax, tagName: 'arg' | 'argument' | 'param', e: qt.DocTypingExpression | undefined, n: qt.EntityName, isNameFirst: boolean, isBracketed: boolean, c?: string) {
    super(kind, tagName, c);
    this.typeExpression = e;
    this.name = n;
    this.isNameFirst = isNameFirst;
    this.isBracketed = isBracketed;
  }
  _declarationBrand: any;
}
qu.addMixins(DocPropertyLikeTag, [qb.Decl]);
export class DocParameterTag extends DocPropertyLikeTag implements qt.DocParameterTag {
  static readonly kind = Syntax.DocParameterTag;
  constructor(e: qt.DocTypingExpression | undefined, n: qt.EntityName, isNameFirst: boolean, isBracketed: boolean, c?: string) {
    super(Syntax.DocParameterTag, 'param', e, n, isNameFirst, isBracketed, c);
  }
}
DocParameterTag.prototype.kind = DocParameterTag.kind;
export class DocPrivateTag extends qb.DocTag implements qt.DocPrivateTag {
  static readonly kind = Syntax.DocPrivateTag;
  constructor() {
    super(Syntax.DocPrivateTag, 'private');
  }
}
DocPrivateTag.prototype.kind = DocPrivateTag.kind;
export class DocPropertyTag extends DocPropertyLikeTag implements qt.DocPropertyTag {
  static readonly kind = Syntax.DocPropertyTag;
  constructor(e: qt.DocTypingExpression | undefined, n: qt.EntityName, isNameFirst: boolean, isBracketed: boolean, c?: string) {
    super(Syntax.DocPropertyTag, 'param', e, n, isNameFirst, isBracketed, c);
  }
}
DocPropertyTag.prototype.kind = DocPropertyTag.kind;
export class DocProtectedTag extends qb.DocTag implements qt.DocProtectedTag {
  static readonly kind = Syntax.DocProtectedTag;
  constructor() {
    super(Syntax.DocProtectedTag, 'protected');
  }
}
DocProtectedTag.prototype.kind = DocProtectedTag.kind;
export class DocPublicTag extends qb.DocTag implements qt.DocPublicTag {
  static readonly kind = Syntax.DocPublicTag;
  constructor() {
    super(Syntax.DocPublicTag, 'public');
  }
}
DocPublicTag.prototype.kind = DocPublicTag.kind;
export class DocReadonlyTag extends qb.DocTag implements qt.DocReadonlyTag {
  static readonly kind = Syntax.DocReadonlyTag;
  constructor() {
    super(Syntax.DocReadonlyTag, 'readonly');
  }
}
DocReadonlyTag.prototype.kind = DocReadonlyTag.kind;
export class DocReturnTag extends qb.DocTag implements qt.DocReturnTag {
  static readonly kind = Syntax.DocReturnTag;
  typeExpression?: qt.DocTypingExpression;
  constructor(e?: qt.DocTypingExpression, c?: string) {
    super(Syntax.DocReturnTag, 'returns', c);
    this.typeExpression = e;
  }
}
DocReturnTag.prototype.kind = DocReturnTag.kind;
export class DocSignature extends qb.DocTobj implements qt.DocSignature {
  static readonly kind = Syntax.DocSignature;
  typeParameters?: readonly qt.DocTemplateTag[];
  parameters: readonly qt.DocParameterTag[];
  type?: qt.DocReturnTag;
  constructor(ts: readonly qt.DocTemplateTag[] | undefined, ps: readonly qt.DocParameterTag[], t?: qt.DocReturnTag) {
    super(true);
    this.typeParameters = ts;
    this.parameters = ps;
    this.type = t;
  }
  _declarationBrand: any;
}
DocSignature.prototype.kind = DocSignature.kind;
qu.addMixins(DocSignature, [qb.Decl]);
export class DocTemplateTag extends qb.DocTag implements qt.DocTemplateTag {
  static readonly kind = Syntax.DocTemplateTag;
  constraint?: qt.DocTypingExpression;
  typeParameters: qt.Nodes<qt.TypeParameterDeclaration>;
  constructor(c: qt.DocTypingExpression | undefined, ts: readonly qt.TypeParameterDeclaration[], s?: string) {
    super(Syntax.DocTemplateTag, 'template', s);
    this.constraint = c;
    this.typeParameters = Nodes.from(ts);
  }
}
DocTemplateTag.prototype.kind = DocTemplateTag.kind;
export class DocThisTag extends qb.DocTag implements qt.DocThisTag {
  static readonly kind = Syntax.DocThisTag;
  typeExpression?: qt.DocTypingExpression;
  constructor(e?: qt.DocTypingExpression) {
    super(Syntax.DocThisTag, 'this');
    this.typeExpression = e;
  }
}
DocThisTag.prototype.kind = DocThisTag.kind;
export class DocTypedefTag extends qb.DocTag implements qt.DocTypedefTag {
  static readonly kind = Syntax.DocTypedefTag;
  parent?: qt.Doc;
  fullName?: qt.DocNamespaceDeclaration | qt.Identifier;
  name?: qt.Identifier;
  typeExpression?: qt.DocTypingExpression | qt.DocTypingLiteral;
  constructor(f?: qt.DocNamespaceDeclaration | qt.Identifier, n?: qt.Identifier, c?: string, t?: qt.DocTypingExpression | qt.DocTypingLiteral) {
    super(Syntax.DocTypedefTag, 'typedef', c);
    this.fullName = f;
    this.name = n;
    this.typeExpression = t;
  }
  _declarationBrand: any;
}
DocTypedefTag.prototype.kind = DocTypedefTag.kind;
qu.addMixins(DocTypedefTag, [qb.NamedDecl]);
export class DocTypingExpression extends qb.Tobj implements qt.DocTypingExpression {
  static readonly kind = Syntax.DocTypingExpression;
  type: qt.Typing;
  constructor(t: qt.Typing) {
    super(true);
    this.type = t;
  }
}
DocTypingExpression.prototype.kind = DocTypingExpression.kind;
export class DocTypingLiteral extends qb.DocTobj implements qt.DocTypingLiteral {
  static readonly kind = Syntax.DocTypingLiteral;
  docPropertyTags?: readonly qt.DocPropertyLikeTag[];
  isArrayType?: boolean;
  constructor(ts?: readonly qt.DocPropertyLikeTag[], isArray?: boolean) {
    super(true);
    this.docPropertyTags = ts;
    this.isArrayType = isArray;
  }
}
DocTypingLiteral.prototype.kind = DocTypingLiteral.kind;
export class DocTypeTag extends qb.DocTag implements qt.DocTypeTag {
  static readonly kind = Syntax.DocTypeTag;
  typeExpression: qt.DocTypingExpression;
  constructor(e: qt.DocTypingExpression, c?: string) {
    super(Syntax.DocTypeTag, 'type', c);
    this.typeExpression = e;
  }
}
DocTypeTag.prototype.kind = DocTypeTag.kind;
export class DocUnknownTyping extends qb.DocTobj implements qt.DocUnknownTyping {
  static readonly kind = Syntax.DocUnknownTyping;
}
DocUnknownTyping.prototype.kind = DocUnknownTyping.kind;
export class DocVariadicTyping extends qb.DocTobj implements qt.DocVariadicTyping {
  static readonly kind = Syntax.DocVariadicTyping;
  type: qt.Typing;
  constructor(t: qt.Typing) {
    super(true);
    this.type = t;
  }
  update(t: qt.Typing): DocVariadicTyping {
    return this.type !== t ? new DocVariadicTyping(t).updateFrom(this) : this;
  }
}
DocVariadicTyping.prototype.kind = DocVariadicTyping.kind;
export class JsxAttribute extends qb.ObjectLiteralElem implements qt.JsxAttribute {
  static readonly kind = Syntax.JsxAttribute;
  parent?: qt.JsxAttributes;
  name: qt.Identifier;
  initer?: qt.StringLiteral | qt.JsxExpression;
  constructor(n: qt.Identifier, i: qt.StringLiteral | qt.JsxExpression) {
    super(true);
    this.name = n;
    this.initer = i;
  }
  update(n: qt.Identifier, i: qt.StringLiteral | qt.JsxExpression) {
    return this.name !== n || this.initer !== i ? new JsxAttribute(n, i).updateFrom(this) : this;
  }
}
export class DoStatement extends qb.IterationStmt implements qt.DoStatement {
  static readonly kind = Syntax.DoStatement;
  expression: qt.Expression;
  constructor(s: qt.Statement, e: qt.Expression) {
    super();
    this.statement = asEmbeddedStatement(s);
    this.expression = e;
  }
  updateDo(s: qt.Statement, e: qt.Expression) {
    return this.statement !== s || this.expression !== e ? new DoStatement(s, e).updateFrom(this) : this;
  }
}
DoStatement.prototype.kind = DoStatement.kind;
export class ElemAccessExpression extends qb.MemberExpr implements qt.ElemAccessExpression {
  static readonly kind = Syntax.ElemAccessExpression;
  expression: qt.LeftExpression;
  questionDotToken?: qt.QuestionDotToken;
  argumentExpression: qt.Expression;
  constructor(e: qt.Expression, i: number | qt.Expression) {
    super(true);
    this.expression = parenthesize.forAccess(e);
    this.argumentExpression = asExpression(i);
  }
  update(e: qt.Expression, a: qt.Expression): ElemAccessExpression {
    if (qf.is.optionalChain(this)) return super.update(e, a, this.questionDotToken);
    return this.expression !== e || this.argumentExpression !== a ? new ElemAccessExpression(e, a).updateFrom(this) : this;
  }
}
ElemAccessExpression.prototype.kind = ElemAccessExpression.kind;
export class ElemAccessChain extends ElemAccessExpression implements qt.ElemAccessChain {
  _optionalChainBrand: any;
  constructor(e: qt.Expression, q: qt.QuestionDotToken | undefined, i: number | qt.Expression) {
    super(e, i);
    this.flags |= NodeFlags.OptionalChain;
    this.questionDotToken = q;
  }
  update(e: qt.Expression, a: qt.Expression, q?: qt.QuestionDotToken) {
    qu.assert(!!(this.flags & NodeFlags.OptionalChain));
    return this.expression !== e || this.questionDotToken !== q || this.argumentExpression !== a ? new ElemAccessChain(e, q, a).updateFrom(this) : this;
  }
}
ElemAccessChain.prototype.kind = ElemAccessChain.kind;
export class EmptyStatement extends qb.Stmt implements qt.EmptyStatement {
  static readonly kind = Syntax.EmptyStatement;
}
EmptyStatement.prototype.kind = EmptyStatement.kind;
export class EndOfDeclarationMarker extends qb.Stmt implements qt.EndOfDeclarationMarker {
  static readonly kind = Syntax.EndOfDeclarationMarker;
  constructor(o: Node) {
    super();
    this.emitNode = {} as qt.EmitNode;
    this.original = o;
  }
}
EndOfDeclarationMarker.prototype.kind = EndOfDeclarationMarker.kind;
export class EnumDeclaration extends qb.DeclarationStmt implements qt.EnumDeclaration {
  static readonly kind = Syntax.EnumDeclaration;
  name: qt.Identifier;
  members: qt.Nodes<qt.EnumMember>;
  constructor(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, n: string | qt.Identifier, es: readonly qt.EnumMember[]) {
    super();
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(n);
    this.members = new Nodes(es);
  }
  docCache?: readonly qt.DocTag[] | undefined;
  update(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, n: qt.Identifier, es: readonly qt.EnumMember[]) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== n || this.members !== es ? new EnumDeclaration(ds, ms, n, es).updateFrom(this) : this;
  }
  _statementBrand: any;
}
EnumDeclaration.prototype.kind = EnumDeclaration.kind;
qu.addMixins(EnumDeclaration, [qb.DocContainer]);
export class EnumMember extends qb.NamedDecl implements qt.EnumMember {
  static readonly kind = Syntax.EnumMember;
  parent?: EnumDeclaration;
  name: qt.PropertyName;
  initer?: qt.Expression;
  constructor(n: string | qt.PropertyName, i?: qt.Expression) {
    super();
    this.name = asName(n);
    this.initer = i && parenthesize.expressionForList(i);
  }
  updateEnumMember(n: qt.PropertyName, i?: qt.Expression) {
    return this.name !== n || this.initer !== i ? new EnumMember(n, i).updateFrom(this) : this;
  }
}
EnumMember.prototype.kind = EnumMember.kind;
qu.addMixins(EnumMember, [qb.DocContainer]);
export class ExportAssignment extends qb.DeclarationStmt implements qt.ExportAssignment {
  static readonly kind = Syntax.ExportAssignment;
  parent?: qt.SourceFile;
  isExportEquals?: boolean;
  expression: qt.Expression;
  constructor(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, eq: boolean | undefined, e: qt.Expression) {
    super();
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.isExportEquals = eq;
    this.expression = eq ? parenthesize.binaryOperand(Syntax.EqualsToken, e, false, undefined) : parenthesize.defaultExpression(e);
  }
  update(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, e: qt.Expression) {
    return this.decorators !== ds || this.modifiers !== ms || this.expression !== e ? new ExportAssignment(ds, ms, this.isExportEquals, e).updateFrom(this) : this;
  }
}
ExportAssignment.prototype.kind = ExportAssignment.kind;
export class ExportDeclaration extends qb.DeclarationStmt implements qt.ExportDeclaration {
  static readonly kind = Syntax.ExportDeclaration;
  parent?: qt.SourceFile | qt.ModuleBlock;
  isTypeOnly: boolean;
  exportClause?: qt.NamedExportBindings;
  moduleSpecifier?: qt.Expression;
  docCache?: readonly qt.DocTag[];
  constructor(ds?: readonly qt.Decorator[], ms?: readonly Modifier[], e?: qt.NamedExportBindings, m?: qt.Expression, t = false) {
    super();
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.isTypeOnly = t;
    this.exportClause = e;
    this.moduleSpecifier = m;
  }
  update(ds?: readonly qt.Decorator[], ms?: readonly Modifier[], e?: qt.NamedExportBindings, m?: qt.Expression, t = false) {
    return this.decorators !== ds || this.modifiers !== ms || this.isTypeOnly !== t || this.exportClause !== e || this.moduleSpecifier !== m
      ? new ExportDeclaration(ds, ms, e, m, t).updateFrom(this)
      : this;
  }
  _statementBrand: any;
}
ExportDeclaration.prototype.kind = ExportDeclaration.kind;
qu.addMixins(ExportDeclaration, [qb.DocContainer]);
export class ExportSpecifier extends qb.NamedDecl implements qt.ExportSpecifier {
  static readonly kind = Syntax.ExportSpecifier;
  parent?: qt.NamedExports;
  propertyName?: qt.Identifier;
  name: qt.Identifier;
  constructor(p: string | qt.Identifier | undefined, n: string | qt.Identifier) {
    super();
    this.propertyName = asName(p);
    this.name = asName(n);
  }
  update(p: qt.Identifier | undefined, n: qt.Identifier) {
    return this.propertyName !== p || this.name !== n ? new ExportSpecifier(p, n).updateFrom(this) : this;
  }
}
ExportSpecifier.prototype.kind = ExportSpecifier.kind;
export class ExpressionStatement extends qb.Stmt implements qt.ExpressionStatement {
  static readonly kind = Syntax.ExpressionStatement;
  expression: qt.Expression;
  constructor(e: qt.Expression) {
    super(true);
    this.expression = parenthesize.expressionForExpressionStatement(e);
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new ExpressionStatement(e).updateFrom(this) : this;
  }
}
ExpressionStatement.prototype.kind = ExpressionStatement.kind;
qu.addMixins(ExpressionStatement, [qb.DocContainer]);
export class ExpressionWithTypings extends qb.WithArgumentsTobj implements qt.ExpressionWithTypings {
  static readonly kind = Syntax.ExpressionWithTypings;
  parent?: qt.HeritageClause | qt.DocAugmentsTag | qt.DocImplementsTag;
  expression: qt.LeftExpression;
  constructor(ts: readonly qt.Typing[] | undefined, e: qt.Expression) {
    super(true);
    this.expression = parenthesize.forAccess(e);
    this.typeArguments = Nodes.from(ts);
  }
  update(ts: readonly qt.Typing[] | undefined, e: qt.Expression) {
    return this.typeArguments !== ts || this.expression !== e ? new ExpressionWithTypings(ts, e).updateFrom(this) : this;
  }
}
ExpressionWithTypings.prototype.kind = ExpressionWithTypings.kind;
export class ExternalModuleReference extends Nobj implements qt.ExternalModuleReference {
  static readonly kind = Syntax.ExternalModuleReference;
  parent?: ImportEqualsDeclaration;
  expression: qt.Expression;
  constructor(e: qt.Expression) {
    super(true);
    this.expression = e;
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new ExternalModuleReference(e).updateFrom(this) : this;
  }
}
ExternalModuleReference.prototype.kind = ExternalModuleReference.kind;
export class ForInStatement extends qb.IterationStmt implements qt.ForInStatement {
  static readonly kind = Syntax.ForInStatement;
  initer: qt.ForIniter;
  expression: qt.Expression;
  constructor(i: qt.ForIniter, e: qt.Expression, s: qt.Statement) {
    super(true);
    this.initer = i;
    this.expression = e;
    this.statement = asEmbeddedStatement(s);
  }
  update(i: qt.ForIniter, e: qt.Expression, s: qt.Statement) {
    return this.initer !== i || this.expression !== e || this.statement !== s ? new ForInStatement(i, e, s).updateFrom(this) : this;
  }
}
ForInStatement.prototype.kind = ForInStatement.kind;
export class ForOfStatement extends qb.IterationStmt implements qt.ForOfStatement {
  static readonly kind = Syntax.ForOfStatement;
  awaitModifier?: qt.AwaitKeywordToken;
  initer: qt.ForIniter;
  expression: qt.Expression;
  constructor(a: qt.AwaitKeywordToken | undefined, i: qt.ForIniter, e: qt.Expression, s: qt.Statement) {
    super(true);
    this.awaitModifier = a;
    this.initer = i;
    this.expression = qf.is.commaSequence(e) ? new ParenthesizedExpression(e) : e;
    this.statement = asEmbeddedStatement(s);
  }
  update(a: qt.AwaitKeywordToken | undefined, i: qt.ForIniter, e: qt.Expression, s: qt.Statement) {
    return this.awaitModifier !== a || this.initer !== i || this.expression !== e || this.statement !== s ? new ForOfStatement(a, i, e, s).updateFrom(this) : this;
  }
}
ForOfStatement.prototype.kind = ForOfStatement.kind;
export class ForStatement extends qb.IterationStmt implements qt.ForStatement {
  static readonly kind = Syntax.ForStatement;
  initer?: qt.ForIniter;
  condition?: qt.Expression;
  incrementor?: qt.Expression;
  constructor(i: qt.ForIniter | undefined, c: qt.Expression | undefined, inc: qt.Expression | undefined, s: qt.Statement) {
    super(true);
    this.initer = i;
    this.condition = c;
    this.incrementor = inc;
    this.statement = asEmbeddedStatement(s);
  }
  update(i: qt.ForIniter | undefined, c: qt.Expression | undefined, inc: qt.Expression | undefined, s: qt.Statement) {
    return this.initer !== i || this.condition !== c || this.incrementor !== inc || this.statement !== s ? new ForStatement(i, c, inc, s).updateFrom(this) : this;
  }
}
ForStatement.prototype.kind = ForStatement.kind;
export class FunctionDeclaration extends qb.FunctionLikeDecl implements qt.FunctionDeclaration {
  static readonly kind = Syntax.FunctionDeclaration;
  name?: qt.Identifier;
  body?: qt.FunctionBody;
  constructor(
    ds: readonly qt.Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    a: qt.AsteriskToken | undefined,
    name: string | qt.Identifier | undefined,
    ts: readonly qt.TypeParameterDeclaration[] | undefined,
    ps: readonly qt.ParameterDeclaration[],
    t?: qt.Typing,
    b?: qt.Block
  ) {
    super(true, Syntax.FunctionDeclaration, ts, ps, t);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.asteriskToken = a;
    this.name = asName(name);
    this.body = b;
  }
  update(
    ds: readonly qt.Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    a: qt.AsteriskToken | undefined,
    name: qt.Identifier | undefined,
    ts: readonly qt.TypeParameterDeclaration[] | undefined,
    ps: readonly qt.ParameterDeclaration[],
    t?: qt.Typing,
    b?: qt.Block
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
  _statementBrand: any;
}
FunctionDeclaration.prototype.kind = FunctionDeclaration.kind;
qu.addMixins(FunctionDeclaration, [qb.DeclarationStmt]);
export class FunctionExpression extends qb.FunctionLikeDecl implements qt.FunctionExpression {
  static readonly kind = Syntax.FunctionExpression;
  name?: qt.Identifier;
  body: qt.FunctionBody;
  constructor(
    ms: readonly Modifier[] | undefined,
    a: qt.AsteriskToken | undefined,
    name: string | qt.Identifier | undefined,
    ts: readonly qt.TypeParameterDeclaration[] | undefined,
    ps: readonly qt.ParameterDeclaration[] | undefined,
    t: qt.Typing | undefined,
    b: qt.Block
  ) {
    super(true, Syntax.FunctionExpression, ts, ps, t);
    this.modifiers = Nodes.from(ms);
    this.asteriskToken = a;
    this.name = asName(name);
    this.body = b;
  }
  update(
    ms: readonly Modifier[] | undefined,
    a: qt.AsteriskToken | undefined,
    name: qt.Identifier | undefined,
    ts: readonly qt.TypeParameterDeclaration[] | undefined,
    ps: readonly qt.ParameterDeclaration[],
    t: qt.Typing | undefined,
    b: qt.Block
  ) {
    return this.name !== name || this.modifiers !== ms || this.asteriskToken !== a || this.typeParameters !== ts || this.parameters !== ps || this.type !== t || this.body !== b
      ? new FunctionExpression(ms, a, name, ts, ps, t, b).updateFrom(this)
      : this;
  }
  _primaryExpressionBrand: any;
  _memberExpressionBrand: any;
  _leftHandSideExpressionBrand: any;
  _updateExpressionBrand: any;
  _unaryExpressionBrand: any;
  _expressionBrand: any;
}
FunctionExpression.prototype.kind = FunctionExpression.kind;
qu.addMixins(FunctionExpression, [qb.PrimaryExpr, qb.DocContainer]);
export class FunctionTyping extends qb.FunctionOrConstructorTobj implements qt.FunctionTyping {
  static readonly kind = Syntax.FunctionTyping;
  docCache?: readonly qt.DocTag[];
  constructor(ts: readonly qt.TypeParameterDeclaration[] | undefined, ps: readonly qt.ParameterDeclaration[], t?: qt.Typing) {
    super(true, Syntax.FunctionTyping, ts, ps, t);
  }
  update(ts: qt.Nodes<qt.TypeParameterDeclaration> | undefined, ps: qt.Nodes<qt.ParameterDeclaration>, t?: qt.Typing) {
    return super.update(ts, ps, t);
  }
  _typingBrand: any;
}
FunctionTyping.prototype.kind = FunctionTyping.kind;
export class GetAccessorDeclaration extends qb.FunctionLikeDecl implements qt.GetAccessorDeclaration {
  static readonly kind = Syntax.GetAccessor;
  parent?: qt.ClassLikeDeclaration | ObjectLiteralExpression;
  name: qt.PropertyName;
  body?: qt.FunctionBody;
  asteriskToken?: qt.AsteriskToken;
  questionToken?: qt.QuestionToken;
  exclamationToken?: qt.ExclamationToken;
  endFlowNode?: qt.FlowStart | qt.FlowLabel | qt.FlowAssignment | qt.FlowCall | qt.FlowCondition | qt.FlowSwitchClause | qt.FlowArrayMutation | qt.FlowReduceLabel;
  returnFlowNode?: qt.FlowStart | qt.FlowLabel | qt.FlowAssignment | qt.FlowCall | qt.FlowCondition | qt.FlowSwitchClause | qt.FlowArrayMutation | qt.FlowReduceLabel;
  docCache?: readonly qt.DocTag[];
  constructor(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | qt.PropertyName, ps: readonly qt.ParameterDeclaration[], t?: qt.Typing, b?: qt.Block) {
    super(true, Syntax.GetAccessor, undefined, ps, t);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(p);
    this.body = b;
  }
  update(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: qt.PropertyName, ps: readonly qt.ParameterDeclaration[], t?: qt.Typing, b?: qt.Block) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== p || this.parameters !== ps || this.type !== t || this.body !== b
      ? new GetAccessorDeclaration(ds, ms, p, ps, t, b).updateFrom(this)
      : this;
  }
  _functionLikeDeclarationBrand: any;
  _classElemBrand: any;
  _objectLiteralBrand: any;
}
GetAccessorDeclaration.prototype.kind = GetAccessorDeclaration.kind;
qu.addMixins(GetAccessorDeclaration, [qb.ClassElem, qb.ObjectLiteralElem, qb.DocContainer]);
export class HeritageClause extends Nobj implements qt.HeritageClause {
  static readonly kind = Syntax.HeritageClause;
  parent?: qt.InterfaceDeclaration | qt.ClassLikeDeclaration;
  token: Syntax.ExtendsKeyword | Syntax.ImplementsKeyword;
  types: qt.Nodes<qt.ExpressionWithTypings>;
  constructor(t: qt.HeritageClause['token'], ts: readonly qt.ExpressionWithTypings[]) {
    super(true);
    this.token = t;
    this.types = new Nodes(ts);
  }
  update(ts: readonly qt.ExpressionWithTypings[]) {
    return this.types !== ts ? new HeritageClause(this.token, ts).updateFrom(this) : this;
  }
}
HeritageClause.prototype.kind = HeritageClause.kind;
export class Identifier extends qb.TokenOrIdentifier implements qt.Identifier {
  static readonly kind = Syntax.Identifier;
  escapedText!: qu.__String;
  autoGenerateFlags = qt.GeneratedIdentifierFlags.None;
  typeArguments?: qt.Nodes<qt.Typing | qt.TypeParameterDeclaration>;
  flowNode = undefined;
  originalKeywordKind?: Syntax;
  autoGenerateId = 0;
  isInDocNamespace?: boolean;
  jsdocDotPos?: number;
  constructor(t: string);
  constructor(t: string, typeArgs: readonly (qt.Typing | qt.TypeParameterDeclaration)[] | undefined);
  constructor(t: string, typeArgs?: readonly (qt.Typing | qt.TypeParameterDeclaration)[]) {
    super();
    this.escapedText = qy.get.escUnderscores(t);
    this.originalKeywordKind = t ? qy.fromString(t) : Syntax.Unknown;
    if (typeArgs) {
      this.typeArguments = new Nodes(typeArgs as readonly qt.Typing[]);
    }
  }
  get text(): string {
    return qb.idText(this);
  }
  update(ts?: qt.Nodes<qt.Typing | qt.TypeParameterDeclaration>) {
    return this.typeArguments !== ts ? new Identifier(this.text, ts).updateFrom(this) : this;
  }
  _primaryExpressionBrand: any;
  _memberExpressionBrand: any;
  _leftHandSideExpressionBrand: any;
  _updateExpressionBrand: any;
  _unaryExpressionBrand: any;
  _expressionBrand: any;
  _declarationBrand: any;
}
Identifier.prototype.kind = Identifier.kind;
qu.addMixins(Identifier, [qb.Decl, qb.PrimaryExpr]);
export class GeneratedIdentifier extends Identifier implements qt.GeneratedIdentifier {}
export class IfStatement extends qb.Stmt implements qt.IfStatement {
  static readonly kind = Syntax.IfStatement;
  expression: qt.Expression;
  thenStatement: qt.Statement;
  elseStatement?: qt.Statement;
  constructor(e: qt.Expression, t: qt.Statement, f?: qt.Statement) {
    super(true);
    this.expression = e;
    this.thenStatement = asEmbeddedStatement(t);
    this.elseStatement = asEmbeddedStatement(f);
  }
  update(e: qt.Expression, t: qt.Statement, f?: qt.Statement) {
    return this.expression !== e || this.thenStatement !== t || this.elseStatement !== f ? new IfStatement(e, t, f).updateFrom(this) : this;
  }
}
IfStatement.prototype.kind = IfStatement.kind;
export class ImportClause extends qb.NamedDecl implements qt.ImportClause {
  static readonly kind = Syntax.ImportClause;
  parent?: qt.ImportDeclaration;
  isTypeOnly: boolean;
  name?: qt.Identifier;
  namedBindings?: qt.NamedImportBindings;
  constructor(n?: qt.Identifier, b?: qt.NamedImportBindings, isTypeOnly = false) {
    super(true);
    this.name = n;
    this.namedBindings = b;
    this.isTypeOnly = isTypeOnly;
  }
  update(n?: qt.Identifier, b?: qt.NamedImportBindings, isTypeOnly?: boolean) {
    return this.name !== n || this.namedBindings !== b || this.isTypeOnly !== isTypeOnly ? new ImportClause(n, b, isTypeOnly).updateFrom(this) : this;
  }
}
ImportClause.prototype.kind = ImportClause.kind;
export class ImportDeclaration extends qb.Stmt implements qt.ImportDeclaration {
  static readonly kind = Syntax.ImportDeclaration;
  parent?: qt.SourceFile | qt.ModuleBlock;
  importClause?: qt.ImportClause;
  moduleSpecifier: qt.Expression;
  constructor(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, c: qt.ImportClause | undefined, s: qt.Expression) {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.importClause = c;
    this.moduleSpecifier = s;
  }
  update(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, c: qt.ImportClause | undefined, s: qt.Expression) {
    return this.decorators !== ds || this.modifiers !== ms || this.importClause !== c || this.moduleSpecifier !== s ? new ImportDeclaration(ds, ms, c, s).updateFrom(this) : this;
  }
}
ImportDeclaration.prototype.kind = ImportDeclaration.kind;
export class ImportEqualsDeclaration extends qb.DeclarationStmt implements qt.ImportEqualsDeclaration {
  static readonly kind = Syntax.ImportEqualsDeclaration;
  parent?: qt.SourceFile | qt.ModuleBlock;
  name: qt.Identifier;
  moduleReference: qt.ModuleReference;
  docCache?: readonly qt.DocTag[] | undefined;
  constructor(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, name: string | qt.Identifier, r: qt.ModuleReference) {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(name);
    this.moduleReference = r;
  }
  update(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, name: qt.Identifier, r: qt.ModuleReference) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== name || this.moduleReference !== r ? new ImportEqualsDeclaration(ds, ms, name, r).updateFrom(this) : this;
  }
  _statementBrand: any;
}
ImportEqualsDeclaration.prototype.kind = ImportEqualsDeclaration.kind;
export class ImportSpecifier extends qb.NamedDecl implements qt.ImportSpecifier {
  static readonly kind = Syntax.ImportSpecifier;
  parent?: qt.NamedImports;
  propertyName?: qt.Identifier;
  name: qt.Identifier;
  constructor(p: qt.Identifier | undefined, name: qt.Identifier) {
    super(true);
    this.propertyName = p;
    this.name = name;
  }
  update(p: qt.Identifier | undefined, name: qt.Identifier) {
    return this.propertyName !== p || this.name !== name ? new ImportSpecifier(p, name).updateFrom(this) : this;
  }
}
ImportSpecifier.prototype.kind = ImportSpecifier.kind;
export class ImportTyping extends qb.WithArgumentsTobj implements qt.ImportTyping {
  static readonly kind = Syntax.ImportTyping;
  isTypeOf?: boolean;
  argument: qt.Typing;
  qualifier?: qt.EntityName;
  constructor(a: qt.Typing, q?: qt.EntityName, ts?: readonly qt.Typing[], tof?: boolean) {
    super(true);
    this.argument = a;
    this.qualifier = q;
    this.typeArguments = parenthesize.typeParameters(ts);
    this.isTypeOf = tof;
  }
  update(a: qt.Typing, q?: qt.EntityName, ts?: readonly qt.Typing[], tof?: boolean) {
    return this.argument !== a || this.qualifier !== q || this.typeArguments !== ts || this.isTypeOf !== tof ? new ImportTyping(a, q, ts, tof).updateFrom(this) : this;
  }
}
ImportTyping.prototype.kind = ImportTyping.kind;
export class IndexedAccessTyping extends qb.Tobj implements qt.IndexedAccessTyping {
  static readonly kind = Syntax.IndexedAccessTyping;
  objectType: qt.Typing;
  indexType: qt.Typing;
  constructor(o: qt.Typing, i: qt.Typing) {
    super(true);
    this.objectType = parenthesize.elemTypeMember(o);
    this.indexType = i;
  }
  update(o: qt.Typing, i: qt.Typing) {
    return this.objectType !== o || this.indexType !== i ? new IndexedAccessTyping(o, i).updateFrom(this) : this;
  }
}
IndexedAccessTyping.prototype.kind = IndexedAccessTyping.kind;
export class IndexSignatureDeclaration extends qb.SignatureDecl implements qt.IndexSignatureDeclaration {
  static readonly kind = Syntax.IndexSignature;
  parent?: qt.ObjectTypeDeclaration;
  questionToken?: qt.QuestionToken;
  docCache?: readonly qt.DocTag[];
  constructor(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly qt.ParameterDeclaration[], t: qt.Typing) {
    super(true, Syntax.IndexSignature, undefined, ps, t);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
  }
  update(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly qt.ParameterDeclaration[], t: qt.Typing) {
    return this.parameters !== ps || this.type !== t || this.decorators !== ds || this.modifiers !== ms ? new IndexSignatureDeclaration(ds, ms, ps, t).updateFrom(this) : this;
  }
  _classElemBrand: any;
  _typeElemBrand: any;
}
IndexSignatureDeclaration.prototype.kind = IndexSignatureDeclaration.kind;
qu.addMixins(IndexSignatureDeclaration, [qb.ClassElem, qb.TypeElem]);
export class InferTyping extends qb.Tobj implements qt.InferTyping {
  static readonly kind = Syntax.InferTyping;
  typeParameter: qt.TypeParameterDeclaration;
  constructor(p: qt.TypeParameterDeclaration) {
    super(true);
    this.typeParameter = p;
  }
  update(p: qt.TypeParameterDeclaration) {
    return this.typeParameter !== p ? new InferTyping(p).updateFrom(this) : this;
  }
}
InferTyping.prototype.kind = InferTyping.kind;
export class InputFiles extends Nobj implements qt.InputFiles {
  static readonly kind = Syntax.InputFiles;
  javascriptPath?: string;
  javascriptText!: string;
  javascriptMapPath?: string;
  javascriptMapText?: string;
  declarationPath?: string;
  declarationText!: string;
  declarationMapPath?: string;
  declarationMapText?: string;
  buildInfoPath?: string;
  buildInfo?: qb.BuildInfo;
  oldFileOfCurrentEmit?: boolean;
  constructor(javascriptText: string, declarationText: string);
  constructor(
    readFileText: (path: string) => string | undefined,
    javascriptPath: string,
    javascriptMapPath: string | undefined,
    declarationPath: string,
    declarationMapPath?: string,
    buildInfoPath?: string
  );
  constructor(
    javascriptText: string,
    declarationText: string,
    javascriptMapPath: string | undefined,
    javascriptMapText: string | undefined,
    declarationMapPath: string | undefined,
    declarationMapText: string | undefined
  );
  constructor(
    javascriptText: string,
    declarationText: string,
    javascriptMapPath: string | undefined,
    javascriptMapText: string | undefined,
    declarationMapPath: string | undefined,
    declarationMapText: string | undefined,
    javascriptPath: string | undefined,
    declarationPath: string | undefined,
    buildInfoPath?: string | undefined,
    buildInfo?: qb.BuildInfo,
    oldFileOfCurrentEmit?: boolean
  );
  constructor(
    javascriptTextOrReadFileText: string | ((path: string) => string | undefined),
    declarationTextOrJavascriptPath: string,
    javascriptMapPath?: string,
    javascriptMapTextOrDeclarationPath?: string,
    declarationMapPath?: string,
    declarationMapTextOrBuildInfoPath?: string,
    javascriptPath?: string | undefined,
    declarationPath?: string | undefined,
    buildInfoPath?: string | undefined,
    buildInfo?: qb.BuildInfo,
    oldFileOfCurrentEmit?: boolean
  ) {
    super();
    if (!qu.isString(javascriptTextOrReadFileText)) {
      const cache = new qu.QMap<string | false>();
      const textGetter = (path: string | undefined) => {
        if (path === undefined) return;
        let v = cache.get(path);
        if (v === undefined) {
          v = javascriptTextOrReadFileText(path);
          cache.set(path, v !== undefined ? v : false);
        }
        return v !== false ? (v as string) : undefined;
      };
      const definedTextGetter = (path: string) => {
        const result = textGetter(path);
        return result !== undefined ? result : `Input file ${path} was missing \r\n`;
      };
      let buildInfo: qb.BuildInfo | false;
      const getAndCacheBuildInfo = (getText: () => string | undefined) => {
        if (buildInfo === undefined) {
          const r = getText();
          buildInfo = r !== undefined ? getBuildInfo(r) : false;
        }
        return buildInfo || undefined;
      };
      this.javascriptPath = declarationTextOrJavascriptPath;
      this.javascriptMapPath = javascriptMapPath;
      this.declarationPath = qu.checkDefined(javascriptMapTextOrDeclarationPath);
      this.declarationMapPath = declarationMapPath;
      this.buildInfoPath = declarationMapTextOrBuildInfoPath;
      Object.defineProperties(this, {
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
            return definedTextGetter(qu.checkDefined(javascriptMapTextOrDeclarationPath));
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
      this.javascriptText = javascriptTextOrReadFileText;
      this.javascriptMapPath = javascriptMapPath;
      this.javascriptMapText = javascriptMapTextOrDeclarationPath;
      this.declarationText = declarationTextOrJavascriptPath;
      this.declarationMapPath = declarationMapPath;
      this.declarationMapText = declarationMapTextOrBuildInfoPath;
      this.javascriptPath = javascriptPath;
      this.declarationPath = declarationPath;
      this.buildInfoPath = buildInfoPath;
      this.buildInfo = buildInfo;
      this.oldFileOfCurrentEmit = oldFileOfCurrentEmit;
    }
  }
}
InputFiles.prototype.kind = InputFiles.kind;
export class InterfaceDeclaration extends qb.DeclarationStmt implements qt.InterfaceDeclaration {
  static readonly kind = Syntax.InterfaceDeclaration;
  name: qt.Identifier;
  typeParameters?: qt.Nodes<qt.TypeParameterDeclaration>;
  heritageClauses?: qt.Nodes<qt.HeritageClause>;
  members: qt.Nodes<qt.TypeElem>;
  docCache?: readonly qt.DocTag[] | undefined;
  constructor(
    ds: readonly qt.Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    name: string | qt.Identifier,
    ts: readonly qt.TypeParameterDeclaration[] | undefined,
    hs: readonly qt.HeritageClause[] | undefined,
    members: readonly qt.TypeElem[]
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
    ds: readonly qt.Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    name: qt.Identifier,
    ts: readonly qt.TypeParameterDeclaration[] | undefined,
    hs: readonly qt.HeritageClause[] | undefined,
    members: readonly qt.TypeElem[]
  ) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== name || this.typeParameters !== ts || this.heritageClauses !== hs || this.members !== members
      ? new InterfaceDeclaration(ds, ms, name, ts, hs, members).updateFrom(this)
      : this;
  }
  _statementBrand: any;
}
InterfaceDeclaration.prototype.kind = InterfaceDeclaration.kind;
qu.addMixins(InterfaceDeclaration, [qb.DocContainer]);
export class IntersectionTyping extends UnionOrIntersectionTyping implements qt.IntersectionTyping {
  static readonly kind = Syntax.IntersectionTyping;
  constructor(ts: readonly qt.Typing[]) {
    super(Syntax.IntersectionTyping, ts);
  }
  update(ts: qt.Nodes<qt.Typing>) {
    return super.update(ts);
  }
}
IntersectionTyping.prototype.kind = IntersectionTyping.kind;
JsxAttribute.prototype.kind = JsxAttribute.kind;
export class JsxAttributes extends qb.ObjectLiteralExpr<qt.JsxAttributeLike> implements qt.JsxAttributes {
  static readonly kind = Syntax.JsxAttributes;
  parent?: qt.JsxOpeningLikeElem;
  constructor(ps: readonly qt.JsxAttributeLike[]) {
    super(true);
    this.properties = new Nodes(ps);
  }
  update(ps: readonly qt.JsxAttributeLike[]) {
    return this.properties !== ps ? new JsxAttributes(ps).updateFrom(this) : this;
  }
  _declarationBrand: any;
}
JsxAttributes.prototype.kind = JsxAttributes.kind;
export class JsxClosingElem extends Nobj implements qt.JsxClosingElem {
  static readonly kind = Syntax.JsxClosingElem;
  parent?: qt.JsxElem;
  tagName: qt.JsxTagNameExpression;
  constructor(e: qt.JsxTagNameExpression) {
    super(true);
    this.tagName = e;
  }
  update(e: qt.JsxTagNameExpression) {
    return this.tagName !== e ? new JsxClosingElem(e).updateFrom(this) : this;
  }
}
JsxClosingElem.prototype.kind = JsxClosingElem.kind;
export class JsxClosingFragment extends qb.Expr implements qt.JsxClosingFragment {
  static readonly kind = Syntax.JsxClosingFragment;
  parent?: qt.JsxFragment;
  constructor() {
    super(true);
  }
}
JsxClosingFragment.prototype.kind = JsxClosingFragment.kind;
export class JsxElem extends qb.PrimaryExpr implements qt.JsxElem {
  static readonly kind = Syntax.JsxElem;
  openingElem: qt.JsxOpeningElem;
  children: qt.Nodes<qt.JsxChild>;
  closingElem: qt.JsxClosingElem;
  constructor(o: qt.JsxOpeningElem, cs: readonly qt.JsxChild[], c: qt.JsxClosingElem) {
    super(true);
    this.openingElem = o;
    this.children = new Nodes(cs);
    this.closingElem = c;
  }
  update(o: qt.JsxOpeningElem, cs: readonly qt.JsxChild[], c: qt.JsxClosingElem) {
    return this.openingElem !== o || this.children !== cs || this.closingElem !== c ? new JsxElem(o, cs, c).updateFrom(this) : this;
  }
}
JsxElem.prototype.kind = JsxElem.kind;
export class JsxExpression extends qb.Expr implements qt.JsxExpression {
  static readonly kind = Syntax.JsxExpression;
  parent?: qt.JsxElem | qt.JsxAttributeLike;
  dot3Token?: qt.Dot3Token;
  expression?: qt.Expression;
  constructor(d3?: qt.Dot3Token, e?: qt.Expression) {
    super(true);
    this.dot3Token = d3;
    this.expression = e;
  }
  update(e?: qt.Expression) {
    return this.expression !== e ? new JsxExpression(this.dot3Token, e).updateFrom(this) : this;
  }
}
JsxExpression.prototype.kind = JsxExpression.kind;
export class JsxFragment extends qb.PrimaryExpr implements qt.JsxFragment {
  static readonly kind = Syntax.JsxFragment;
  openingFragment: qt.JsxOpeningFragment;
  children: qt.Nodes<qt.JsxChild>;
  closingFragment: qt.JsxClosingFragment;
  constructor(o: qt.JsxOpeningFragment, cs: readonly qt.JsxChild[], c: qt.JsxClosingFragment) {
    super(true);
    this.openingFragment = o;
    this.children = new Nodes(cs);
    this.closingFragment = c;
  }
  update(o: qt.JsxOpeningFragment, cs: readonly qt.JsxChild[], c: qt.JsxClosingFragment) {
    return this.openingFragment !== o || this.children !== cs || this.closingFragment !== c ? new JsxFragment(o, cs, c).updateFrom(this) : this;
  }
}
JsxFragment.prototype.kind = JsxFragment.kind;
export class JsxOpeningElem extends qb.Expr implements qt.JsxOpeningElem {
  static readonly kind = Syntax.JsxOpeningElem;
  parent?: qt.JsxElem;
  tagName: qt.JsxTagNameExpression;
  typeArguments?: qt.Nodes<qt.Typing>;
  attributes: qt.JsxAttributes;
  constructor(e: qt.JsxTagNameExpression, ts: readonly qt.Typing[] | undefined, a: qt.JsxAttributes) {
    super(true);
    this.tagName = e;
    this.typeArguments = Nodes.from(ts);
    this.attributes = a;
  }
  update(e: qt.JsxTagNameExpression, ts: readonly qt.Typing[] | undefined, s: qt.JsxAttributes) {
    return this.tagName !== e || this.typeArguments !== ts || this.attributes !== s ? new JsxOpeningElem(e, ts, s).updateFrom(this) : this;
  }
}
JsxOpeningElem.prototype.kind = JsxOpeningElem.kind;
export class JsxOpeningFragment extends qb.Expr implements qt.JsxOpeningFragment {
  static readonly kind = Syntax.JsxOpeningFragment;
  parent?: qt.JsxFragment;
  constructor() {
    super(true);
  }
}
JsxOpeningFragment.prototype.kind = JsxOpeningFragment.kind;
export class JsxSelfClosingElem extends qb.PrimaryExpr implements qt.JsxSelfClosingElem {
  static readonly kind = Syntax.JsxSelfClosingElem;
  tagName: qt.JsxTagNameExpression;
  typeArguments?: qt.Nodes<qt.Typing>;
  attributes: qt.JsxAttributes;
  constructor(e: qt.JsxTagNameExpression, ts: readonly qt.Typing[] | undefined, a: qt.JsxAttributes) {
    super(true);
    this.tagName = e;
    this.typeArguments = Nodes.from(ts);
    this.attributes = a;
  }
  update(e: qt.JsxTagNameExpression, ts: readonly qt.Typing[] | undefined, a: qt.JsxAttributes) {
    return this.tagName !== e || this.typeArguments !== ts || this.attributes !== a ? new JsxSelfClosingElem(e, ts, a).updateFrom(this) : this;
  }
}
JsxSelfClosingElem.prototype.kind = JsxSelfClosingElem.kind;
export class JsxSpreadAttribute extends qb.ObjectLiteralElem implements qt.JsxSpreadAttribute {
  static readonly kind = Syntax.JsxSpreadAttribute;
  parent?: qt.JsxAttributes;
  expression: qt.Expression;
  constructor(e: qt.Expression) {
    super(true);
    this.expression = e;
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new JsxSpreadAttribute(e).updateFrom(this) : this;
  }
}
JsxSpreadAttribute.prototype.kind = JsxSpreadAttribute.kind;
export class JsxText extends qb.LiteralLikeNode implements qt.JsxText {
  static readonly kind = Syntax.JsxText;
  onlyTriviaWhiteSpaces: boolean;
  parent?: qt.JsxElem;
  constructor(t: string, whitespaces?: boolean) {
    super(true);
    this.text = t;
    this.onlyTriviaWhiteSpaces = !!whitespaces;
  }
  update(t: string, whitespaces?: boolean) {
    return this.text !== t || this.onlyTriviaWhiteSpaces !== whitespaces ? new JsxText(t, whitespaces).updateFrom(this) : this;
  }
}
JsxText.prototype.kind = JsxText.kind;
export class KeywordTyping extends qb.Tobj implements qt.KeywordTyping {
  // prettier-ignore
  kind!: | Syntax.AnyKeyword | Syntax.UnknownKeyword | Syntax.NumberKeyword | Syntax.BigIntKeyword | Syntax.ObjectKeyword | Syntax.BooleanKeyword | Syntax.StringKeyword | Syntax.SymbolKeyword | Syntax.ThisKeyword | Syntax.VoidKeyword | Syntax.UndefinedKeyword | Syntax.NullKeyword | Syntax.NeverKeyword;
  constructor(k: KeywordTyping['kind']) {
    super(true, k);
  }
}
export class LabeledStatement extends qb.Stmt implements qt.LabeledStatement {
  static readonly kind = Syntax.LabeledStatement;
  label: qt.Identifier;
  statement: qt.Statement;
  constructor(l: string | qt.Identifier, s: qt.Statement) {
    super(true);
    this.label = asName(l);
    this.statement = asEmbeddedStatement(s);
  }
  update(l: qt.Identifier, s: qt.Statement) {
    return this.label !== l || this.statement !== s ? new LabeledStatement(l, s).updateFrom(this) : this;
  }
}
LabeledStatement.prototype.kind = LabeledStatement.kind;
qu.addMixins(LabeledStatement, [qb.DocContainer]);
export class LiteralTyping extends qb.Tobj implements qt.LiteralTyping {
  static readonly kind = Syntax.LiteralTyping;
  literal: qt.BooleanLiteral | qt.LiteralExpression | qt.PrefixUnaryExpression;
  constructor(l: qt.LiteralTyping['literal']) {
    super(true);
    this.literal = l;
  }
  update(l: qt.LiteralTyping['literal']) {
    return this.literal !== l ? new LiteralTyping(l).updateFrom(this) : this;
  }
}
LiteralTyping.prototype.kind = LiteralTyping.kind;
export class MappedTyping extends qb.Tobj implements qt.MappedTyping {
  static readonly kind = Syntax.MappedTyping;
  readonlyToken?: qt.ReadonlyToken | qt.PlusToken | qt.MinusToken;
  typeParameter: qt.TypeParameterDeclaration;
  questionToken?: qt.QuestionToken | qt.PlusToken | qt.MinusToken;
  type?: qt.Typing;
  constructor(r: qt.ReadonlyToken | qt.PlusToken | qt.MinusToken | undefined, p: qt.TypeParameterDeclaration, q?: qt.QuestionToken | qt.PlusToken | qt.MinusToken, t?: qt.Typing) {
    super(true);
    this.readonlyToken = r;
    this.typeParameter = p;
    this.questionToken = q;
    this.type = t;
  }
  update(r: qt.ReadonlyToken | qt.PlusToken | qt.MinusToken | undefined, p: qt.TypeParameterDeclaration, q?: qt.QuestionToken | qt.PlusToken | qt.MinusToken, t?: qt.Typing) {
    return this.readonlyToken !== r || this.typeParameter !== p || this.questionToken !== q || this.type !== t ? new MappedTyping(r, p, q, t).updateFrom(this) : this;
  }
  _declarationBrand: any;
}
MappedTyping.prototype.kind = MappedTyping.kind;
qu.addMixins(MappedTyping, [qb.Decl]);
export class MergeDeclarationMarker extends qb.Stmt implements qt.MergeDeclarationMarker {
  static readonly kind: Syntax.MergeDeclarationMarker;
  constructor(o: Node) {
    super(true);
    this.emitNode = {} as qt.EmitNode;
    this.original = o;
  }
}
MergeDeclarationMarker.prototype.kind = MergeDeclarationMarker.kind;
export class MetaProperty extends qb.PrimaryExpr implements qt.MetaProperty {
  static readonly kind = Syntax.MetaProperty;
  keywordToken: Syntax.NewKeyword | Syntax.ImportKeyword;
  name: qt.Identifier;
  constructor(k: qt.MetaProperty['keywordToken'], n: qt.Identifier) {
    super(true);
    this.keywordToken = k;
    this.name = n;
  }
  update(n: qt.Identifier) {
    return this.name !== n ? new MetaProperty(this.keywordToken, n).updateFrom(this) : this;
  }
}
MetaProperty.prototype.kind = MetaProperty.kind;
export class MethodDeclaration extends qb.FunctionLikeDecl implements qt.MethodDeclaration {
  static readonly kind = Syntax.MethodDeclaration;
  parent?: qt.ClassLikeDeclaration | qt.ObjectLiteralExpression;
  name: qt.PropertyName;
  body?: qt.FunctionBody;
  constructor(
    ds: readonly qt.Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    a: qt.AsteriskToken | undefined,
    p: string | qt.PropertyName,
    q: qt.QuestionToken | undefined,
    ts: readonly qt.TypeParameterDeclaration[] | undefined,
    ps: readonly qt.ParameterDeclaration[],
    t?: qt.Typing,
    b?: qt.Block
  ) {
    super(true, Syntax.MethodDeclaration, ts, ps, t);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.asteriskToken = a;
    this.name = asName(p);
    this.questionToken = q;
    this.body = b;
  }
  update(
    ds: readonly qt.Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    a: qt.AsteriskToken | undefined,
    p: qt.PropertyName,
    q: qt.QuestionToken | undefined,
    ts: readonly qt.TypeParameterDeclaration[] | undefined,
    ps: readonly qt.ParameterDeclaration[],
    t?: qt.Typing,
    b?: qt.Block
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
      ? new MethodDeclaration(ds, ms, a, p, q, ts, ps, t, b).updateFrom(this)
      : this;
  }
  _classElemBrand: any;
  _objectLiteralBrand: any;
}
MethodDeclaration.prototype.kind = MethodDeclaration.kind;
qu.addMixins(MethodDeclaration, [qb.ClassElem, qb.ObjectLiteralElem, qb.DocContainer]);
export class MethodSignature extends qb.SignatureDecl implements qt.MethodSignature {
  static readonly kind = Syntax.MethodSignature;
  parent?: qt.ObjectTypeDeclaration;
  name: qt.PropertyName;
  questionToken?: qt.QuestionToken;
  docCache?: readonly qt.DocTag[];
  constructor(ts: readonly qt.TypeParameterDeclaration[] | undefined, ps: readonly qt.ParameterDeclaration[], t: qt.Typing | undefined, p: string | qt.PropertyName, q?: qt.QuestionToken) {
    super(false, Syntax.MethodSignature, ts, ps, t);
    this.name = asName(p);
    this.questionToken = q;
  }
  update(ts: qt.Nodes<qt.TypeParameterDeclaration> | undefined, ps: qt.Nodes<qt.ParameterDeclaration>, t: qt.Typing | undefined, p: qt.PropertyName, q?: qt.QuestionToken) {
    return this.typeParameters !== ts || this.parameters !== ps || this.type !== t || this.name !== p || this.questionToken !== q ? new MethodSignature(ts, ps, t, p, q).updateFrom(this) : this;
  }
  _typeElemBrand: any;
}
MethodSignature.prototype.kind = MethodSignature.kind;
qu.addMixins(MethodSignature, [qb.TypeElem]);
export class MissingDeclaration extends qb.DeclarationStmt implements qt.MissingDeclaration {
  static readonly kind = Syntax.MissingDeclaration;
  name?: qt.Identifier;
  _statementBrand: any;
}
MissingDeclaration.prototype.kind = MissingDeclaration.kind;
export class ModuleBlock extends qb.Stmt implements qt.ModuleBlock {
  static readonly kind = Syntax.ModuleBlock;
  parent?: qt.ModuleDeclaration;
  statements: qt.Nodes<qt.Statement>;
  constructor(ss: readonly qt.Statement[]) {
    super(true);
    this.statements = new Nodes(ss);
  }
  update(ss: readonly qt.Statement[]) {
    return this.statements !== ss ? new ModuleBlock(ss).updateFrom(this) : this;
  }
}
ModuleBlock.prototype.kind = ModuleBlock.kind;
export class ModuleDeclaration extends qb.DeclarationStmt implements qt.ModuleDeclaration {
  static readonly kind = Syntax.ModuleDeclaration;
  parent?: qt.ModuleBody | qt.SourceFile;
  name: qt.ModuleName;
  body?: qt.ModuleBody | qt.DocNamespaceDeclaration;
  docCache?: readonly qt.DocTag[] | undefined;
  constructor(decorators: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, name: qt.ModuleName, b?: qt.ModuleBody, flags = NodeFlags.None) {
    super(true);
    this.flags |= flags & (NodeFlags.Namespace | NodeFlags.NestedNamespace | NodeFlags.GlobalAugmentation);
    this.decorators = Nodes.from(decorators);
    this.modifiers = Nodes.from(ms);
    this.name = name;
    this.body = b;
  }
  update(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, name: qt.ModuleName, b?: qt.ModuleBody) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== name || this.body !== b ? new ModuleDeclaration(ds, ms, name, b, this.flags).updateFrom(this) : this;
  }
  _statementBrand: any;
}
ModuleDeclaration.prototype.kind = ModuleDeclaration.kind;
qu.addMixins(ModuleDeclaration, [qb.DocContainer]);
export class DocNamespaceDeclaration extends ModuleDeclaration {
  name!: qt.Identifier;
  body?: qt.DocNamespaceBody;
}
export class NamedExports extends Nobj implements qt.NamedExports {
  static readonly kind = Syntax.NamedExports;
  parent?: qt.ExportDeclaration;
  elems: qt.Nodes<qt.ExportSpecifier>;
  constructor(es: readonly qt.ExportSpecifier[]) {
    super(true);
    this.elems = new Nodes(es);
  }
  update(es: readonly qt.ExportSpecifier[]) {
    return this.elems !== es ? new NamedExports(es).updateFrom(this) : this;
  }
}
NamedExports.prototype.kind = NamedExports.kind;
export class NamedImports extends Nobj implements qt.NamedImports {
  static readonly kind = Syntax.NamedImports;
  parent?: qt.ImportClause;
  elems: qt.Nodes<qt.ImportSpecifier>;
  constructor(es: readonly qt.ImportSpecifier[]) {
    super(true);
    this.elems = new Nodes(es);
  }
  update(es: readonly qt.ImportSpecifier[]) {
    return this.elems !== es ? new NamedImports(es).updateFrom(this) : this;
  }
}
NamedImports.prototype.kind = NamedImports.kind;
export class NamedTupleMember extends qb.Tobj implements qt.NamedTupleMember {
  static readonly kind = Syntax.NamedTupleMember;
  dot3Token?: qt.Dot3Token;
  name: qt.Identifier;
  questionToken?: qt.QuestionToken;
  type: qt.Typing;
  docCache?: readonly qt.DocTag[];
  constructor(d3: qt.Dot3Token | undefined, i: qt.Identifier, q: qt.QuestionToken | undefined, t: qt.Typing) {
    super(true);
    this.dot3Token = d3;
    this.name = i;
    this.questionToken = q;
    this.type = t;
  }
  update(d3: qt.Dot3Token | undefined, i: qt.Identifier, q: qt.QuestionToken | undefined, t: qt.Typing) {
    return this.dot3Token !== d3 || this.name !== i || this.questionToken !== q || this.type !== t ? new NamedTupleMember(d3, i, q, t).updateFrom(this) : this;
  }
  _declarationBrand: any;
}
NamedTupleMember.prototype.kind = NamedTupleMember.kind;
qu.addMixins(NamedTupleMember, [qb.Decl, qb.DocContainer]);
export class NamespaceExport extends qb.NamedDecl implements qt.NamespaceExport {
  static readonly kind = Syntax.NamespaceExport;
  parent?: qt.ExportDeclaration;
  name: qt.Identifier;
  constructor(n: qt.Identifier) {
    super(true);
    this.name = n;
  }
  update(n: qt.Identifier) {
    return this.name !== n ? new NamespaceExport(n).updateFrom(this) : this;
  }
}
NamespaceExport.prototype.kind = NamespaceExport.kind;
export class NamespaceExportDeclaration extends qb.DeclarationStmt implements qt.NamespaceExportDeclaration {
  static readonly kind = Syntax.NamespaceExportDeclaration;
  name: qt.Identifier;
  constructor(n: string | qt.Identifier) {
    super(true);
    this.name = asName(n);
  }
  update(n: qt.Identifier) {
    return this.name !== n ? new NamespaceExportDeclaration(n).updateFrom(this) : this;
  }
  _statementBrand: any;
}
NamespaceExportDeclaration.prototype.kind = NamespaceExportDeclaration.kind;
export class NamespaceImport extends qb.NamedDecl implements qt.NamespaceImport {
  static readonly kind = Syntax.NamespaceImport;
  parent?: qt.ImportClause;
  name: qt.Identifier;
  constructor(n: qt.Identifier) {
    super(true);
    this.name = n;
  }
  update(n: qt.Identifier) {
    return this.name !== n ? new NamespaceImport(n).updateFrom(this) : this;
  }
}
NamespaceImport.prototype.kind = NamespaceImport.kind;
export class NewExpression extends qb.PrimaryExpr implements qt.NewExpression {
  static readonly kind = Syntax.NewExpression;
  expression: qt.LeftExpression;
  typeArguments?: qt.Nodes<qt.Typing>;
  arguments?: qt.Nodes<qt.Expression>;
  constructor(e: qt.Expression, ts?: readonly qt.Typing[], a?: readonly qt.Expression[]) {
    super(true);
    this.expression = parenthesize.forNew(e);
    this.typeArguments = Nodes.from(ts);
    this.arguments = a ? parenthesize.listElems(new Nodes(a)) : undefined;
  }
  update(e: qt.Expression, ts?: readonly qt.Typing[], a?: readonly qt.Expression[]) {
    return this.expression !== e || this.typeArguments !== ts || this.arguments !== a ? new NewExpression(e, ts, a).updateFrom(this) : this;
  }
  _declarationBrand: any;
}
NewExpression.prototype.kind = NewExpression.kind;
qu.addMixins(NewExpression, [qb.Decl]);
export class NonNullExpression extends qb.LeftExpr implements qt.NonNullExpression {
  static readonly kind = Syntax.NonNullExpression;
  expression: qt.Expression;
  constructor(e: qt.Expression) {
    super(true);
    this.expression = parenthesize.forAccess(e);
  }
  update(e: qt.Expression) {
    if (qf.is.nonNullChain(this)) return this.update(e);
    return this.expression !== e ? new NonNullExpression(e).updateFrom(this) : this;
  }
}
NonNullExpression.prototype.kind = NonNullExpression.kind;
export class NonNullChain extends NonNullExpression implements qt.NonNullChain {
  constructor(e: qt.Expression) {
    super(e);
    this.flags |= NodeFlags.OptionalChain;
  }
  update(e: qt.Expression) {
    qu.assert(!!(this.flags & NodeFlags.OptionalChain));
    return this.expression !== e ? new NonNullChain(e).updateFrom(this) : this;
  }
  _optionalChainBrand: any;
}
NonNullChain.prototype.kind = NonNullChain.kind;
export class NoSubstitutionLiteral extends qb.TemplateLiteralLikeNode implements qt.NoSubstitutionLiteral {
  static readonly kind = Syntax.NoSubstitutionLiteral;
  templateFlags?: qt.TokenFlags;
  constructor(t: string, raw?: string) {
    super(Syntax.NoSubstitutionLiteral, t, raw);
  }
  _literalExpressionBrand: any;
  _primaryExpressionBrand: any;
  _memberExpressionBrand: any;
  _leftHandSideExpressionBrand: any;
  _updateExpressionBrand: any;
  _unaryExpressionBrand: any;
  _expressionBrand: any;
  _declarationBrand: any;
}
NoSubstitutionLiteral.prototype.kind = NoSubstitutionLiteral.kind;
qu.addMixins(NoSubstitutionLiteral, [qb.LiteralExpr, qb.Decl]);
export class NotEmittedStatement extends qb.Stmt implements qt.NotEmittedStatement {
  static readonly kind = Syntax.NotEmittedStatement;
  constructor(o: Node) {
    super(true);
    this.original = o;
    this.setRange(o);
  }
}
NotEmittedStatement.prototype.kind = NotEmittedStatement.kind;
export class NumericLiteral extends qb.LiteralExpr implements qt.NumericLiteral {
  static readonly kind = Syntax.NumericLiteral;
  numericLiteralFlags: qt.TokenFlags;
  constructor(t: string, fs: qt.TokenFlags = qt.TokenFlags.None) {
    super(true);
    this.text = t;
    this.numericLiteralFlags = fs;
  }
  name(n: string | qu.__String) {
    return (+n).toString() === n;
  }
  _declarationBrand: any;
}
export class NullLiteral extends qb.PrimaryExpr implements qt.NullLiteral {
  static readonly kind = Syntax.NullKeyword;
  constructor() {
    super(true);
  }
  _typingBrand: any;
}
NullLiteral.prototype.kind = NullLiteral.kind;
NumericLiteral.prototype.kind = NumericLiteral.kind;
qu.addMixins(NumericLiteral, [qb.Decl]);
export class ObjectBindingPattern extends Nobj implements qt.ObjectBindingPattern {
  static readonly kind = Syntax.ObjectBindingPattern;
  parent?: qt.VariableDeclaration | qt.ParameterDeclaration | qt.BindingElem;
  elems: qt.Nodes<qt.BindingElem>;
  constructor(es: readonly qt.BindingElem[]) {
    super(true);
    this.elems = new Nodes(es);
  }
  update(es: readonly qt.BindingElem[]) {
    return this.elems !== es ? new ObjectBindingPattern(es).updateFrom(this) : this;
  }
}
ObjectBindingPattern.prototype.kind = ObjectBindingPattern.kind;
export class ObjectLiteralExpression extends qb.ObjectLiteralExpr<qt.ObjectLiteralElemLike> implements qt.ObjectLiteralExpression {
  static readonly kind = Syntax.ObjectLiteralExpression;
  multiLine?: boolean;
  constructor(ps?: readonly qt.ObjectLiteralElemLike[], multiLine?: boolean) {
    super(true);
    this.properties = new Nodes(ps);
    if (multiLine) this.multiLine = true;
  }
  update(ps?: readonly qt.ObjectLiteralElemLike[]) {
    return this.properties !== ps ? new ObjectLiteralExpression(ps, this.multiLine).updateFrom(this) : this;
  }
}
ObjectLiteralExpression.prototype.kind = ObjectLiteralExpression.kind;
export class OmittedExpression extends qb.Expr implements qt.OmittedExpression {
  static readonly kind = Syntax.OmittedExpression;
  constructor() {
    super(true);
  }
}
OmittedExpression.prototype.kind = OmittedExpression.kind;
export class OptionalTyping extends qb.Tobj implements qt.OptionalTyping {
  static readonly kind = Syntax.OptionalTyping;
  type: qt.Typing;
  constructor(t: qt.Typing) {
    super(true);
    this.type = parenthesize.arrayTypeMember(t);
  }
  update(t: qt.Typing): OptionalTyping {
    return this.type !== t ? new OptionalTyping(t).updateFrom(this) : this;
  }
}
OptionalTyping.prototype.kind = OptionalTyping.kind;
export namespace OuterExpression {}
export class ParameterDeclaration extends qb.NamedDecl implements qt.ParameterDeclaration {
  static readonly kind = Syntax.Parameter;
  parent?: qt.SignatureDeclaration;
  dot3Token?: qt.Dot3Token;
  name: qt.BindingName;
  questionToken?: qt.QuestionToken;
  type?: qt.Typing;
  initer?: qt.Expression;
  constructor(
    ds: readonly qt.Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    d3: qt.Dot3Token | undefined,
    name: string | qt.BindingName,
    q?: qt.QuestionToken,
    t?: qt.Typing,
    i?: qt.Expression
  ) {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.dot3Token = d3;
    this.name = asName(name);
    this.questionToken = q;
    this.type = t;
    this.initer = i ? parenthesize.expressionForList(i) : undefined;
  }
  updateParameter(
    ds: readonly qt.Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    d3: qt.Dot3Token | undefined,
    name: string | qt.BindingName,
    q?: qt.QuestionToken,
    t?: qt.Typing,
    i?: qt.Expression
  ) {
    return this.decorators !== ds || this.modifiers !== ms || this.dot3Token !== d3 || this.name !== name || this.questionToken !== q || this.type !== t || this.initer !== i
      ? new ParameterDeclaration(ds, ms, d3, name, q, t, i).updateFrom(this)
      : this;
  }
}
ParameterDeclaration.prototype.kind = ParameterDeclaration.kind;
qu.addMixins(ParameterDeclaration, [qb.DocContainer]);
export class ParenthesizedExpression extends qb.PrimaryExpr implements qt.ParenthesizedExpression {
  static readonly kind = Syntax.ParenthesizedExpression;
  expression: qt.Expression;
  constructor(e: qt.Expression) {
    super(true);
    this.expression = e;
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new ParenthesizedExpression(e).updateFrom(this) : this;
  }
}
qu.addMixins(ParenthesizedExpression, [qb.DocContainer]);
ParenthesizedExpression.prototype.kind = ParenthesizedExpression.kind;
export class ParenthesizedTyping extends qb.Tobj implements qt.ParenthesizedTyping {
  static readonly kind = Syntax.ParenthesizedTyping;
  type: qt.Typing;
  constructor(t: qt.Typing) {
    super(true);
    this.type = t;
  }
  update(t: qt.Typing) {
    return this.type !== t ? new ParenthesizedTyping(t).updateFrom(this) : this;
  }
}
ParenthesizedTyping.prototype.kind = ParenthesizedTyping.kind;
export class PartiallyEmittedExpression extends qb.LeftExpr implements qt.PartiallyEmittedExpression {
  static readonly kind = Syntax.PartiallyEmittedExpression;
  expression: qt.Expression;
  constructor(e: qt.Expression, o?: Node) {
    super(true);
    this.expression = e;
    this.original = o;
    this.setRange(o);
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new PartiallyEmittedExpression(e, this.original as Node).updateFrom(this) : this;
  }
}
PartiallyEmittedExpression.prototype.kind = PartiallyEmittedExpression.kind;
export class PostfixUnaryExpression extends qb.UpdateExpr implements qt.PostfixUnaryExpression {
  static readonly kind = Syntax.PostfixUnaryExpression;
  operand: qt.LeftExpression;
  operator: qt.PostfixUnaryOperator;
  constructor(e: qt.Expression, o: qt.PostfixUnaryOperator) {
    super(true);
    this.operand = parenthesize.postfixOperand(e);
    this.operator = o;
  }
  update(e: qt.Expression) {
    return this.operand !== e ? new PostfixUnaryExpression(e, this.operator).updateFrom(this) : this;
  }
}
PostfixUnaryExpression.prototype.kind = PostfixUnaryExpression.kind;
export class PrefixUnaryExpression extends qb.UpdateExpr implements qt.PrefixUnaryExpression {
  static readonly kind = Syntax.PrefixUnaryExpression;
  operator: qt.PrefixUnaryOperator;
  operand: qt.UnaryExpression;
  constructor(o: qt.PrefixUnaryOperator, e: qt.Expression) {
    super(true);
    this.operator = o;
    this.operand = parenthesize.prefixOperand(e);
  }
  update(e: qt.Expression) {
    return this.operand !== e ? new PrefixUnaryExpression(this.operator, e).updateFrom(this) : this;
  }
}
PrefixUnaryExpression.prototype.kind = PrefixUnaryExpression.kind;
export class PrivateIdentifier extends qb.TokenOrIdentifier implements qt.PrivateIdentifier {
  static readonly kind = Syntax.PrivateIdentifier;
  escapedText!: qu.__String;
  constructor(t: string) {
    super(true, PrivateIdentifier.kind);
    if (t[0] !== '#') qu.fail('First character of private identifier must be #: ' + t);
    this.escapedText = qy.get.escUnderscores(t);
  }
  get text(): string {
    return qb.idText(this);
  }
}
PrivateIdentifier.prototype.kind = PrivateIdentifier.kind;
export class PropertyAccessExpression extends qb.MemberExpr implements qt.PropertyAccessExpression {
  static readonly kind = Syntax.PropertyAccessExpression;
  expression: qt.LeftExpression;
  questionDotToken?: qt.QuestionDotToken;
  name: qt.Identifier | qt.PrivateIdentifier;
  constructor(e: qt.Expression, n: string | qt.Identifier | qt.PrivateIdentifier) {
    super(true);
    this.expression = parenthesize.forAccess(e);
    this.name = asName(n);
    this.setEmitFlags(qt.EmitFlags.NoIndentation);
  }
  update(e: qt.Expression, n: qt.Identifier | qt.PrivateIdentifier): PropertyAccessExpression {
    if (qf.is.propertyAccessChain(this)) return this.update(e, this.questionDotToken, cast(n, isIdentifier));
    return this.expression !== e || this.name !== n ? new PropertyAccessExpression(e, n).setEmitFlags(qf.get.emitFlags(this)).updateFrom(this) : this;
  }
  _declarationBrand: any;
}
PropertyAccessExpression.prototype.kind = PropertyAccessExpression.kind;
qu.addMixins(PropertyAccessExpression, [qb.NamedDecl]);
export class PropertyAccessChain extends PropertyAccessExpression implements qt.PropertyAccessChain {
  name!: qt.Identifier;
  constructor(e: qt.Expression, q: qt.QuestionDotToken | undefined, n: string | qt.Identifier) {
    super(e, n);
    this.flags |= NodeFlags.OptionalChain;
    this.questionDotToken = q;
  }
  update(e: qt.Expression, n: qt.Identifier, q?: qt.QuestionDotToken) {
    qu.assert(!!(this.flags & NodeFlags.OptionalChain));
    return this.expression !== e || this.questionDotToken !== q || this.name !== n ? new PropertyAccessChain(e, q, n).setEmitFlags(qf.get.emitFlags(this)).updateFrom(this) : this;
  }
  _optionalChainBrand: any;
}
export class PropertyAssignment extends qb.ObjectLiteralElem implements qt.PropertyAssignment {
  static readonly kind = Syntax.PropertyAssignment;
  parent?: qt.ObjectLiteralExpression;
  name: qt.PropertyName;
  questionToken?: qt.QuestionToken;
  initer: qt.Expression;
  constructor(n: string | qt.PropertyName, i: qt.Expression) {
    super(true);
    this.name = asName(n);
    this.initer = parenthesize.expressionForList(i);
  }
  update(n: qt.PropertyName, i: qt.Expression) {
    return this.name !== n || this.initer !== i ? new PropertyAssignment(n, i).updateFrom(this) : this;
  }
}
PropertyAssignment.prototype.kind = PropertyAssignment.kind;
qu.addMixins(PropertyAssignment, [qb.DocContainer]);
export class PropertyDeclaration extends qb.ClassElem implements qt.PropertyDeclaration {
  static readonly kind = Syntax.PropertyDeclaration;
  parent?: qt.ClassLikeDeclaration;
  name: qt.PropertyName;
  questionToken?: qt.QuestionToken;
  exclamationToken?: qt.ExclamationToken;
  type?: qt.Typing;
  initer?: qt.Expression;
  constructor(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | qt.PropertyName, q?: qt.QuestionToken | qt.ExclamationToken, t?: qt.Typing, i?: qt.Expression) {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(p);
    this.questionToken = q !== undefined && q.kind === Syntax.QuestionToken ? q : undefined;
    this.exclamationToken = q !== undefined && q.kind === Syntax.ExclamationToken ? q : undefined;
    this.type = t;
    this.initer = i;
  }
  update(
    n: PropertyDeclaration,
    ds: readonly qt.Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    p: string | qt.PropertyName,
    q?: qt.QuestionToken | qt.ExclamationToken,
    t?: qt.Typing,
    i?: qt.Expression
  ) {
    return this.decorators !== ds ||
      this.modifiers !== ms ||
      this.name !== p ||
      this.questionToken !== (q !== undefined && q.kind === Syntax.QuestionToken ? q : undefined) ||
      this.exclamationToken !== (q !== undefined && q.kind === Syntax.ExclamationToken ? q : undefined) ||
      this.type !== t ||
      this.initer !== i
      ? new PropertyDeclaration(ds, ms, p, q, t, i).updateFrom(n)
      : n;
  }
}
PropertyDeclaration.prototype.kind = PropertyDeclaration.kind;
qu.addMixins(PropertyDeclaration, [qb.DocContainer]);
export class PropertySignature extends qb.TypeElem implements qt.PropertySignature {
  static readonly kind = Syntax.PropertySignature;
  name: qt.PropertyName;
  questionToken?: qt.QuestionToken;
  type?: qt.Typing;
  initer?: qt.Expression;
  constructor(ms: readonly Modifier[] | undefined, p: qt.PropertyName | string, q?: qt.QuestionToken, t?: qt.Typing, i?: qt.Expression) {
    super(true);
    this.modifiers = Nodes.from(ms);
    this.name = asName(p);
    this.questionToken = q;
    this.type = t;
    this.initer = i;
  }
  update(ms: readonly Modifier[] | undefined, p: qt.PropertyName, q?: qt.QuestionToken, t?: qt.Typing, i?: qt.Expression) {
    return this.modifiers !== ms || this.name !== p || this.questionToken !== q || this.type !== t || this.initer !== i ? new PropertySignature(ms, p, q, t, i).updateFrom(this) : this;
  }
}
PropertySignature.prototype.kind = PropertySignature.kind;
qu.addMixins(PropertySignature, [qb.DocContainer]);
export class QualifiedName extends Nobj implements qt.QualifiedName {
  static readonly kind = Syntax.QualifiedName;
  left: qt.EntityName;
  right: qt.Identifier;
  jsdocDotPos?: number;
  constructor(left: qt.EntityName, right: string | qt.Identifier) {
    super(true);
    this.left = left;
    this.right = asName(right);
  }
  update(left: qt.EntityName, right: qt.Identifier) {
    return this.left !== left || this.right !== right ? new QualifiedName(left, right).updateFrom(this) : this;
  }
}
QualifiedName.prototype.kind = QualifiedName.kind;
export class RegexLiteral extends qb.LiteralExpr implements qt.RegexLiteral {
  static readonly kind = Syntax.RegexLiteral;
  constructor(t: string) {
    super(true);
    this.text = t;
  }
}
RegexLiteral.prototype.kind = RegexLiteral.kind;
export class RestTyping extends qb.Tobj implements qt.RestTyping {
  static readonly kind = Syntax.RestTyping;
  type: qt.Typing;
  constructor(t: qt.Typing) {
    super(true);
    this.type = t;
  }
  update(t: qt.Typing) {
    return this.type !== t ? new RestTyping(t).updateFrom(this) : this;
  }
}
RestTyping.prototype.kind = RestTyping.kind;
export class ReturnStatement extends qb.Stmt implements qt.ReturnStatement {
  static readonly kind = Syntax.ReturnStatement;
  expression?: qt.Expression;
  constructor(e?: qt.Expression) {
    super(true);
    this.expression = e;
  }
  update(e?: qt.Expression) {
    return this.expression !== e ? new ReturnStatement(e).updateFrom(this) : this;
  }
}
ReturnStatement.prototype.kind = ReturnStatement.kind;
export class SemicolonClassElem extends qb.ClassElem implements qt.SemicolonClassElem {
  static readonly kind = Syntax.SemicolonClassElem;
  parent?: qt.ClassLikeDeclaration;
  constructor() {
    super(true);
  }
}
SemicolonClassElem.prototype.kind = SemicolonClassElem.kind;
export class SetAccessorDeclaration extends qb.FunctionLikeDecl implements qt.SetAccessorDeclaration {
  static readonly kind = Syntax.SetAccessor;
  parent?: qt.ClassLikeDeclaration | qt.ObjectLiteralExpression;
  name: qt.PropertyName;
  body?: qt.FunctionBody;
  constructor(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | qt.PropertyName, ps: readonly qt.ParameterDeclaration[], b?: qt.Block) {
    super(true, Syntax.SetAccessor, undefined, ps);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(p);
    this.parameters = new Nodes(ps);
    this.body = b;
  }
  update(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: qt.PropertyName, ps: readonly qt.ParameterDeclaration[], b?: qt.Block) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== p || this.parameters !== ps || this.body !== b ? new SetAccessorDeclaration(ds, ms, p, ps, b).updateFrom(this) : this;
  }
  _classElemBrand: any;
  _objectLiteralBrand: any;
}
SetAccessorDeclaration.prototype.kind = SetAccessorDeclaration.kind;
qu.addMixins(SetAccessorDeclaration, [qb.ClassElem, qb.ObjectLiteralElem, qb.DocContainer]);
export class ShorthandPropertyAssignment extends qb.ObjectLiteralElem implements qt.ShorthandPropertyAssignment {
  static readonly kind = Syntax.ShorthandPropertyAssignment;
  parent?: qt.ObjectLiteralExpression;
  name: qt.Identifier;
  questionToken?: qt.QuestionToken;
  exclamationToken?: qt.ExclamationToken;
  equalsToken?: qt.EqualsToken;
  objectAssignmentIniter?: qt.Expression;
  constructor(n: string | qt.Identifier, i?: qt.Expression) {
    super(true);
    this.name = asName(n);
    this.objectAssignmentIniter = i ? parenthesize.expressionForList(i) : undefined;
  }
  update(n: qt.Identifier, i: qt.Expression | undefined) {
    return this.name !== n || this.objectAssignmentIniter !== i ? new ShorthandPropertyAssignment(n, i).updateFrom(this) : this;
  }
}
ShorthandPropertyAssignment.prototype.kind = ShorthandPropertyAssignment.kind;
qu.addMixins(ShorthandPropertyAssignment, [qb.DocContainer]);
export class SpreadElem extends qb.Expr implements qt.SpreadElem {
  static readonly kind = Syntax.SpreadElem;
  parent?: qt.ArrayLiteralExpression | qt.CallExpression | qt.NewExpression;
  expression: qt.Expression;
  constructor(e: qt.Expression) {
    super(true);
    this.expression = parenthesize.expressionForList(e);
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new SpreadElem(e).updateFrom(this) : this;
  }
}
SpreadElem.prototype.kind = SpreadElem.kind;
export class SpreadAssignment extends qb.ObjectLiteralElem implements qt.SpreadAssignment {
  static readonly kind = Syntax.SpreadAssignment;
  parent?: qt.ObjectLiteralExpression;
  expression: qt.Expression;
  constructor(e: qt.Expression) {
    super(true);
    this.expression = parenthesize.expressionForList(e);
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new SpreadAssignment(e).updateFrom(this) : this;
  }
}
SpreadAssignment.prototype.kind = SpreadAssignment.kind;
qu.addMixins(SpreadAssignment, [qb.DocContainer]);
export class StringLiteral extends qb.LiteralExpr implements qt.StringLiteral {
  static readonly kind = Syntax.StringLiteral;
  textSourceNode?: qt.Identifier | qt.StringLiteralLike | qt.NumericLiteral;
  singleQuote?: boolean;
  constructor(t: string) {
    super(true);
    this.text = t;
  }
  _declarationBrand: any;
}
StringLiteral.prototype.kind = StringLiteral.kind;
qu.addMixins(StringLiteral, [qb.Decl]);
export class SuperExpression extends qb.PrimaryExpr implements qt.SuperExpression {
  static readonly kind = Syntax.SuperKeyword;
  constructor() {
    super(true);
  }
}
SuperExpression.prototype.kind = SuperExpression.kind;
export class SwitchStatement extends qb.Stmt implements qt.SwitchStatement {
  static readonly kind = Syntax.SwitchStatement;
  expression: qt.Expression;
  caseBlock: qt.CaseBlock;
  possiblyExhaustive?: boolean;
  constructor(e: qt.Expression, c: qt.CaseBlock) {
    super(true);
    this.expression = parenthesize.expressionForList(e);
    this.caseBlock = c;
  }
  update(e: qt.Expression, c: qt.CaseBlock) {
    return this.expression !== e || this.caseBlock !== c ? new SwitchStatement(e, c).updateFrom(this) : this;
  }
}
SwitchStatement.prototype.kind = SwitchStatement.kind;
export class SyntheticReferenceExpression extends qb.LeftExpr implements qt.SyntheticReferenceExpression {
  static readonly kind = Syntax.SyntheticReferenceExpression;
  expression: qt.Expression;
  thisArg: qt.Expression;
  constructor(e: qt.Expression, thisArg: qt.Expression) {
    super(true);
    this.expression = e;
    this.thisArg = thisArg;
  }
  update(e: qt.Expression, thisArg: qt.Expression) {
    return this.expression !== e || this.thisArg !== thisArg ? new SyntheticReferenceExpression(e, thisArg).updateFrom(this) : this;
  }
}
SyntheticReferenceExpression.prototype.kind = SyntheticReferenceExpression.kind;
export class TaggedTemplateExpression extends qb.MemberExpr implements qt.TaggedTemplateExpression {
  static readonly kind = Syntax.TaggedTemplateExpression;
  tag: qt.LeftExpression;
  typeArguments?: qt.Nodes<qt.Typing>;
  template: qt.TemplateLiteral;
  questionDotToken?: qt.QuestionDotToken;
  constructor(tag: qt.Expression, ts: readonly qt.Typing[] | undefined, template: qt.TemplateLiteral);
  constructor(tag: qt.Expression, ts?: readonly qt.Typing[] | qt.TemplateLiteral, template?: qt.TemplateLiteral);
  constructor(tag: qt.Expression, ts?: readonly qt.Typing[] | qt.TemplateLiteral, template?: qt.TemplateLiteral) {
    super(true);
    this.tag = parenthesize.forAccess(tag);
    if (template) {
      this.typeArguments = Nodes.from(ts as readonly qt.Typing[]);
      this.template = template;
    } else {
      this.typeArguments = undefined;
      this.template = ts as qt.TemplateLiteral;
    }
  }
  update(tag: qt.Expression, ts: readonly qt.Typing[] | undefined, template: qt.TemplateLiteral): TaggedTemplateExpression;
  update(tag: qt.Expression, ts?: readonly qt.Typing[] | qt.TemplateLiteral, template?: qt.TemplateLiteral) {
    return this.tag !== tag || (template ? this.typeArguments !== ts || this.template !== template : this.typeArguments || this.template !== ts)
      ? new TaggedTemplateExpression(tag, ts, template).updateFrom(this)
      : this;
  }
}
TaggedTemplateExpression.prototype.kind = TaggedTemplateExpression.kind;
export class TemplateExpression extends qb.PrimaryExpr implements qt.TemplateExpression {
  static readonly kind = Syntax.TemplateExpression;
  head: qt.TemplateHead;
  templateSpans: qt.Nodes<qt.TemplateSpan>;
  constructor(h: qt.TemplateHead, ss: readonly qt.TemplateSpan[]) {
    super(true);
    this.head = h;
    this.templateSpans = new Nodes(ss);
  }
  update(h: qt.TemplateHead, ss: readonly qt.TemplateSpan[]) {
    return this.head !== h || this.templateSpans !== ss ? new TemplateExpression(h, ss).updateFrom(this) : this;
  }
}
TemplateExpression.prototype.kind = TemplateExpression.kind;
export class TemplateHead extends qb.TemplateLiteralLikeNode implements qt.TemplateHead {
  static readonly kind = Syntax.TemplateHead;
  parent?: qt.TemplateExpression;
  templateFlags?: qt.TokenFlags;
  constructor(t: string, raw?: string) {
    super(Syntax.TemplateHead, t, raw);
  }
}
TemplateHead.prototype.kind = TemplateHead.kind;
export class TemplateMiddle extends qb.TemplateLiteralLikeNode implements qt.TemplateMiddle {
  static readonly kind = Syntax.TemplateMiddle;
  parent?: qt.TemplateSpan;
  templateFlags?: qt.TokenFlags;
  constructor(t: string, raw?: string) {
    super(Syntax.TemplateMiddle, t, raw);
  }
}
TemplateMiddle.prototype.kind = TemplateMiddle.kind;
export class TemplateSpan extends Nobj implements qt.TemplateSpan {
  static readonly kind = Syntax.TemplateSpan;
  parent?: qt.TemplateExpression;
  expression: qt.Expression;
  literal: qt.TemplateMiddle | qt.TemplateTail;
  constructor(e: qt.Expression, l: qt.TemplateMiddle | qt.TemplateTail) {
    super(true);
    this.expression = e;
    this.literal = l;
  }
  update(e: qt.Expression, l: qt.TemplateMiddle | qt.TemplateTail) {
    return this.expression !== e || this.literal !== l ? new TemplateSpan(e, l).updateFrom(this) : this;
  }
}
TemplateSpan.prototype.kind = TemplateSpan.kind;
export class TemplateTail extends qb.TemplateLiteralLikeNode implements qt.TemplateTail {
  static readonly kind = Syntax.TemplateTail;
  parent?: qt.TemplateSpan;
  templateFlags?: qt.TokenFlags;
  constructor(t: string, raw?: string) {
    super(Syntax.TemplateTail, t, raw);
  }
}
TemplateTail.prototype.kind = TemplateTail.kind;
export class ThisExpression extends qb.PrimaryExpr implements qt.ThisExpression {
  static readonly kind = Syntax.ThisKeyword;
  constructor() {
    super(true);
  }
  _typingBrand: any;
}
ThisExpression.prototype.kind = ThisExpression.kind;
qu.addMixins(ThisExpression, [KeywordTyping]);
export class ThisTyping extends qb.Tobj implements qt.ThisTyping {
  static readonly kind = Syntax.ThisTyping;
  constructor() {
    super(true);
  }
}
ThisTyping.prototype.kind = ThisTyping.kind;
export class ThrowStatement extends qb.Stmt implements qt.ThrowStatement {
  static readonly kind = Syntax.ThrowStatement;
  expression?: qt.Expression;
  constructor(e: qt.Expression) {
    super(true);
    this.expression = e;
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new ThrowStatement(e).updateFrom(this) : this;
  }
}
ThrowStatement.prototype.kind = ThrowStatement.kind;
export class TryStatement extends qb.Stmt implements qt.TryStatement {
  static readonly kind = Syntax.TryStatement;
  tryBlock: qt.Block;
  catchClause?: qt.CatchClause;
  finallyBlock?: qt.Block;
  constructor(b: qt.Block, c?: qt.CatchClause, f?: qt.Block) {
    super(true);
    this.tryBlock = b;
    this.catchClause = c;
    this.finallyBlock = f;
  }
  update(b: qt.Block, c?: qt.CatchClause, f?: qt.Block) {
    return this.tryBlock !== b || this.catchClause !== c || this.finallyBlock !== f ? new TryStatement(b, c, f).updateFrom(this) : this;
  }
}
TryStatement.prototype.kind = TryStatement.kind;
export class TupleTyping extends qb.Tobj implements qt.TupleTyping {
  static readonly kind = Syntax.TupleTyping;
  elems: qt.Nodes<qt.Typing | qt.NamedTupleMember>;
  constructor(es: readonly (qt.Typing | qt.NamedTupleMember)[]) {
    super(true);
    this.elems = new Nodes(es);
  }
  update(es: readonly (qt.Typing | qt.NamedTupleMember)[]) {
    return this.elems !== es ? new TupleTyping(es).updateFrom(this) : this;
  }
}
TupleTyping.prototype.kind = TupleTyping.kind;
export class TypeAliasDeclaration extends qb.DeclarationStmt implements qt.TypeAliasDeclaration {
  static readonly kind = Syntax.TypeAliasDeclaration;
  name: qt.Identifier;
  typeParameters?: qt.Nodes<qt.TypeParameterDeclaration>;
  type: qt.Typing;
  docCache?: readonly qt.DocTag[] | undefined;
  constructor(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, n: string | qt.Identifier, ts: readonly qt.TypeParameterDeclaration[] | undefined, t: qt.Typing) {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(n);
    this.typeParameters = Nodes.from(ts);
    this.type = t;
  }
  update(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, n: qt.Identifier, ts: readonly qt.TypeParameterDeclaration[] | undefined, t: qt.Typing) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== n || this.typeParameters !== ts || this.type !== t ? new TypeAliasDeclaration(ds, ms, n, ts, t).updateFrom(this) : this;
  }
  _statementBrand: any;
}
TypeAliasDeclaration.prototype.kind = TypeAliasDeclaration.kind;
qu.addMixins(TypeAliasDeclaration, [qb.DocContainer]);
export class TypeAssertion extends qb.UnaryExpr implements qt.TypeAssertion {
  static readonly kind = Syntax.TypeAssertionExpression;
  type: qt.Typing;
  expression: qt.UnaryExpression;
  constructor(t: qt.Typing, e: qt.Expression) {
    super(true);
    this.type = t;
    this.expression = parenthesize.prefixOperand(e);
  }
  update(t: qt.Typing, e: qt.Expression) {
    return this.type !== t || this.expression !== e ? new TypeAssertion(t, e).updateFrom(this) : this;
  }
}
TypeAssertion.prototype.kind = TypeAssertion.kind;
export class TypingLiteral extends qb.Tobj implements qt.TypingLiteral {
  static readonly kind = Syntax.TypingLiteral;
  members: qt.Nodes<qt.TypeElem>;
  constructor(ms?: readonly qt.TypeElem[]) {
    super(true);
    this.members = new Nodes(ms);
  }
  update(ms: qt.Nodes<qt.TypeElem>) {
    return this.members !== ms ? new TypingLiteral(ms).updateFrom(this) : this;
  }
  _declarationBrand: any;
}
TypingLiteral.prototype.kind = TypingLiteral.kind;
qu.addMixins(TypingLiteral, [qb.Decl]);
export class TypeOfExpression extends qb.UnaryExpr implements qt.TypeOfExpression {
  static readonly kind = Syntax.TypeOfExpression;
  expression: qt.UnaryExpression;
  constructor(e: qt.Expression) {
    super(true);
    this.expression = parenthesize.prefixOperand(e);
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new TypeOfExpression(e).updateFrom(this) : this;
  }
}
TypeOfExpression.prototype.kind = TypeOfExpression.kind;
export class TypingOperator extends qb.Tobj implements qt.TypingOperator {
  static readonly kind = Syntax.TypingOperator;
  operator: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword;
  type: qt.Typing;
  constructor(t: qt.Typing);
  constructor(o: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword, t: qt.Typing);
  constructor(o: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword | qt.Typing, t?: qt.Typing) {
    super(true);
    this.operator = typeof o === 'number' ? o : Syntax.KeyOfKeyword;
    this.type = parenthesize.elemTypeMember(typeof o === 'number' ? t! : o);
  }
  update(t: qt.Typing) {
    return this.type !== t ? new TypingOperator(this.operator, t).updateFrom(this) : this;
  }
}
TypingOperator.prototype.kind = TypingOperator.kind;
export class TypeParameterDeclaration extends qb.NamedDecl implements qt.TypeParameterDeclaration {
  static readonly kind = Syntax.TypeParameter;
  parent?: qt.DeclarationWithTypeParameterChildren | qt.InferTyping;
  name: qt.Identifier;
  constraint?: qt.Typing;
  default?: qt.Typing;
  expression?: qt.Expression;
  constructor(n: string | qt.Identifier, c?: qt.Typing, d?: qt.Typing) {
    super(true);
    this.name = asName(n);
    this.constraint = c;
    this.default = d;
  }
  update(n: qt.Identifier, c?: qt.Typing, d?: qt.Typing) {
    return this.name !== n || this.constraint !== c || this.default !== d ? new TypeParameterDeclaration(n, c, d).updateFrom(this) : this;
  }
}
TypeParameterDeclaration.prototype.kind = TypeParameterDeclaration.kind;
export class TypingPredicate extends qb.Tobj implements qt.TypingPredicate {
  static readonly kind = Syntax.TypingPredicate;
  parent?: qt.SignatureDeclaration | qt.DocTypingExpression;
  assertsModifier?: qt.AssertsToken;
  parameterName: qt.Identifier | qt.ThisTyping;
  type?: qt.Typing;
  constructor(a: qt.AssertsToken | undefined, p: qt.Identifier | qt.ThisTyping | string, t?: qt.Typing) {
    super(true);
    this.assertsModifier = a;
    this.parameterName = asName(p);
    this.type = t;
  }
  update(p: qt.Identifier | qt.ThisTyping, t: qt.Typing) {
    return this.updateWithModifier(this.assertsModifier, p, t);
  }
  updateWithModifier(a: qt.AssertsToken | undefined, p: qt.Identifier | qt.ThisTyping, t?: qt.Typing) {
    return this.assertsModifier !== a || this.parameterName !== p || this.type !== t ? new TypingPredicate(a, p, t).updateFrom(this) : this;
  }
}
TypingPredicate.prototype.kind = TypingPredicate.kind;
export class TypingQuery extends qb.Tobj implements qt.TypingQuery {
  static readonly kind = Syntax.TypingQuery;
  exprName: qt.EntityName;
  constructor(e: qt.EntityName) {
    super(true);
    this.exprName = e;
  }
  update(e: qt.EntityName) {
    return this.exprName !== e ? new TypingQuery(e).updateFrom(this) : this;
  }
}
TypingQuery.prototype.kind = TypingQuery.kind;
export class TypingReference extends qb.WithArgumentsTobj implements qt.TypingReference {
  static readonly kind = Syntax.TypingReference;
  typeName: qt.EntityName;
  constructor(t: string | qt.EntityName, ts?: readonly qt.Typing[]) {
    super(true);
    this.typeName = asName(t);
    this.typeArguments = ts && parenthesize.typeParameters(ts);
  }
  update(t: qt.EntityName, ts?: qt.Nodes<qt.Typing>) {
    return this.typeName !== t || this.typeArguments !== ts ? new TypingReference(t, ts).updateFrom(this) : this;
  }
}
TypingReference.prototype.kind = TypingReference.kind;
export class UnionTyping extends UnionOrIntersectionTyping implements qt.UnionTyping {
  static readonly kind = Syntax.UnionTyping;
  constructor(ts: readonly qt.Typing[]) {
    super(Syntax.UnionTyping, ts);
  }
  update(ts: qt.Nodes<qt.Typing>) {
    return super.update(ts);
  }
}
UnionTyping.prototype.kind = UnionTyping.kind;
export namespace UnparsedNode {}
export class UnparsedPrepend extends Nobj implements qt.UnparsedPrepend {
  static readonly kind = Syntax.UnparsedPrepend;
  data!: string;
  parent?: qt.UnparsedSource;
  texts!: readonly qt.UnparsedTextLike[];
}
UnparsedPrepend.prototype.kind = UnparsedPrepend.kind;
export class UnparsedSyntheticReference extends Nobj implements qt.UnparsedSyntheticReference {
  static readonly kind = Syntax.UnparsedSyntheticReference;
  parent?: qt.UnparsedSource;
  section: qt.BundleFileHasNoDefaultLib | qt.BundleFileReference;
  data?: string;
  constructor(s: qt.BundleFileHasNoDefaultLib | qt.BundleFileReference, parent: qt.UnparsedSource) {
    super(undefined, Syntax.UnparsedSyntheticReference, s.pos, s.end);
    this.parent = parent;
    this.data = s.data;
    this.section = s;
  }
}
UnparsedSyntheticReference.prototype.kind = UnparsedSyntheticReference.kind;
export class VariableDeclaration extends qb.NamedDecl implements qt.VariableDeclaration {
  static readonly kind = Syntax.VariableDeclaration;
  parent?: qt.VariableDeclarationList | qt.CatchClause;
  name: qt.BindingName;
  exclamationToken?: qt.ExclamationToken;
  type?: qt.Typing;
  initer?: qt.Expression;
  constructor(n: string | qt.BindingName, t?: qt.Typing, i?: qt.Expression, e?: qt.ExclamationToken) {
    super(true);
    this.name = asName(n);
    this.type = t;
    this.initer = i !== undefined ? parenthesize.expressionForList(i) : undefined;
    this.exclamationToken = e;
  }
  update(n: qt.BindingName, t?: qt.Typing, i?: qt.Expression, e?: qt.ExclamationToken) {
    return this.name !== n || this.type !== t || this.initer !== i || this.exclamationToken !== e ? new VariableDeclaration(n, t, i, e).updateFrom(this) : this;
  }
}
VariableDeclaration.prototype.kind = VariableDeclaration.kind;
export class VariableDeclarationList extends Nobj implements qt.VariableDeclarationList {
  static readonly kind = Syntax.VariableDeclarationList;
  parent?: qt.VariableStatement | qt.ForStatement | qt.ForOfStatement | qt.ForInStatement;
  declarations: qt.Nodes<qt.VariableDeclaration>;
  constructor(ds: readonly qt.VariableDeclaration[], f = NodeFlags.None) {
    super(true);
    this.flags |= f & NodeFlags.BlockScoped;
    this.declarations = new Nodes(ds);
  }
  update(ds: readonly qt.VariableDeclaration[]) {
    return this.declarations !== ds ? new VariableDeclarationList(ds, this.flags).updateFrom(this) : this;
  }
}
VariableDeclarationList.prototype.kind = VariableDeclarationList.kind;
export class VariableStatement extends qb.Stmt implements qt.VariableStatement {
  static readonly kind = Syntax.VariableStatement;
  declarationList: qt.VariableDeclarationList;
  constructor(ms: readonly Modifier[] | undefined, ds: qt.VariableDeclarationList | readonly qt.VariableDeclaration[]) {
    super(true);
    this.decorators = undefined;
    this.modifiers = Nodes.from(ms);
    this.declarationList = qu.isArray(ds) ? new VariableDeclarationList(ds) : ds;
  }
  update(ms: readonly Modifier[] | undefined, ds: qt.VariableDeclarationList) {
    return this.modifiers !== ms || this.declarationList !== ds ? new VariableStatement(ms, ds).updateFrom(this) : this;
  }
}
VariableStatement.prototype.kind = VariableStatement.kind;
qu.addMixins(VariableStatement, [qb.DocContainer]);
export class VoidExpression extends qb.UnaryExpr implements qt.VoidExpression {
  static readonly kind = Syntax.VoidExpression;
  expression: qt.UnaryExpression;
  constructor(e: qt.Expression) {
    super(true);
    this.expression = parenthesize.prefixOperand(e);
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new VoidExpression(e).updateFrom(this) : this;
  }
  static zero() {
    return new VoidExpression(asLiteral(0));
  }
}
VoidExpression.prototype.kind = VoidExpression.kind;
export class WhileStatement extends qb.IterationStmt implements qt.WhileStatement {
  static readonly kind = Syntax.WhileStatement;
  expression: qt.Expression;
  constructor(e: qt.Expression, s: qt.Statement) {
    super(true);
    this.expression = e;
    this.statement = asEmbeddedStatement(s);
  }
  update(e: qt.Expression, s: qt.Statement) {
    return this.expression !== e || this.statement !== s ? new WhileStatement(e, s).updateFrom(this) : this;
  }
}
WhileStatement.prototype.kind = WhileStatement.kind;
export class WithStatement extends qb.Stmt implements qt.WithStatement {
  static readonly kind = Syntax.WithStatement;
  expression: qt.Expression;
  statement: qt.Statement;
  constructor(e: qt.Expression, s: qt.Statement) {
    super(true);
    this.expression = e;
    this.statement = asEmbeddedStatement(s);
  }
  update(e: qt.Expression, s: qt.Statement) {
    return this.expression !== e || this.statement !== s ? new WithStatement(e, s).updateFrom(this) : this;
  }
}
WithStatement.prototype.kind = WithStatement.kind;
export class YieldExpression extends qb.Expr implements qt.YieldExpression {
  static readonly kind = Syntax.YieldExpression;
  asteriskToken?: qt.AsteriskToken;
  expression?: qt.Expression;
  constructor(e?: qt.Expression);
  constructor(a: qt.AsteriskToken | undefined, e: qt.Expression);
  constructor(a?: qt.AsteriskToken | undefined | qt.Expression, e?: qt.Expression) {
    super(true);
    const a2 = a && a.kind === Syntax.AsteriskToken ? (a as qt.AsteriskToken) : undefined;
    this.asteriskToken = a2;
    e = a && a.kind !== Syntax.AsteriskToken ? (a as qt.Expression) : e;
    this.expression = e && parenthesize.expressionForList(e);
  }
  update(a: qt.AsteriskToken | undefined, e: qt.Expression) {
    return this.expression !== e || this.asteriskToken !== a ? new YieldExpression(a, e).updateFrom(this) : this;
  }
}
YieldExpression.prototype.kind = YieldExpression.kind;
// prettier-ignore
export type NodeTypes =
  | ArrayBindingPattern
  | ArrayLiteralExpression
  | ArrayTyping
  | AsExpression
  | AwaitExpression
  | BinaryExpression
  | BindingElem
  | Block
  | CallExpression
  | CaseBlock
  | CaseClause
  | CatchClause
  | CommaListExpression
  | ComputedPropertyName
  | ConditionalExpression
  | ConditionalTyping
  | Decorator
  | DefaultClause
  | DeleteExpression
  | DeleteExpression
  | DoStatement
  | ElemAccessExpression
  | EnumDeclaration
  | EnumMember
  | ExportAssignment
  | ExportDeclaration
  | ExpressionStatement
  | ExpressionWithTypings
  | ExternalModuleReference
  | ForInStatement
  | ForOfStatement
  | ForStatement
  | HeritageClause
  | Identifier
  | IfStatement
  | ImportClause
  | ImportDeclaration
  | ImportEqualsDeclaration
  | ImportTyping
  | IndexedAccessTyping
  | InferTyping
  | InterfaceDeclaration
  | Doc
  | DocAugmentsTag
  | DocAuthorTag
  | DocFunctionTyping
  | DocImplementsTag
  | DocSignature
  | DocTemplateTag
  | DocTypedefTag
  | DocTypingExpression
  | DocTypingLiteral
  | JsxAttribute
  | JsxAttributes
  | JsxClosingElem
  | JsxElem
  | JsxExpression
  | JsxFragment
  | JsxSpreadAttribute
  | LabeledStatement
  | LiteralTyping
  | MappedTyping
  | MetaProperty
  | MissingDeclaration
  | ModuleDeclaration
  | NamedTupleMember
  | NamespaceExport
  | NamespaceExportDeclaration
  | NamespaceImport
  | NonNullExpression
  | ObjectLiteralExpression
  | OptionalTyping
  | ParameterDeclaration
  | ParenthesizedExpression
  | ParenthesizedTyping
  | PartiallyEmittedExpression
  | PostfixUnaryExpression
  | PrefixUnaryExpression
  | PropertyAccessExpression
  | PropertyAssignment
  | PropertyDeclaration
  | PropertySignature
  | QualifiedName
  | RestTyping
  | ReturnStatement
  | ShorthandPropertyAssignment
  | SpreadAssignment
  | SpreadElem
  | SwitchStatement
  | TaggedTemplateExpression
  | qt.TemplateExpression
  | qt.TemplateSpan
  | ThrowStatement
  | TryStatement
  | TupleTyping
  | TypeAliasDeclaration
  | TypeAssertion
  | TypingLiteral
  | TypeOfExpression
  | TypingOperator
  | qt.TypeParameterDeclaration
  | TypingPredicate
  | TypingQuery
  | TypingReference
  | VariableDeclaration
  | VariableDeclarationList
  | VariableStatement
  | VoidExpression
  | WhileStatement
  | WithStatement
  | YieldExpression;
export namespace parenthesize {
  interface BinaryPlusExpression extends BinaryExpression {
    cachedLiteralKind: Syntax;
  }
  function getLiteralKindOfBinaryPlusOperand(e: qt.Expression): Syntax {
    e = qb.skip.partiallyEmittedExpressions(e);
    if (qy.is.literal(e.kind)) return e.kind;
    const n = e as Node;
    if (n.kind === Syntax.BinaryExpression && n.operatorToken.kind === Syntax.PlusToken) {
      const p = e as BinaryPlusExpression;
      if (p.cachedLiteralKind) return p.cachedLiteralKind;
      const l = getLiteralKindOfBinaryPlusOperand(n.left);
      const k = qy.is.literal(l) && l === getLiteralKindOfBinaryPlusOperand(n.right) ? l : Syntax.Unknown;
      p.cachedLiteralKind = k;
      return k;
    }
    return Syntax.Unknown;
  }
  export function binaryOperand(binaryOperator: Syntax, operand: qt.Expression, isLeft: boolean, leftOperand?: qt.Expression) {
    const skipped = qb.skip.partiallyEmittedExpressions(operand);
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
    function binaryOperandNeedsParentheses(binaryOperator: Syntax, operand: qt.Expression, isLeft: boolean, leftOperand: qt.Expression | undefined) {
      const binaryOperatorPrecedence = qy.get.operatorPrecedence(Syntax.BinaryExpression, binaryOperator);
      const binaryOperatorAssociativity = qy.get.operatorAssociativity(Syntax.BinaryExpression, binaryOperator);
      const emittedOperand = qb.skip.partiallyEmittedExpressions(operand);
      if (!isLeft && operand.kind === Syntax.ArrowFunction && binaryOperatorPrecedence > 3) return true;
      const operandPrecedence = qf.get.expressionPrecedence(emittedOperand);
      switch (qu.compareNumbers(operandPrecedence, binaryOperatorPrecedence)) {
        case qu.Comparison.LessThan:
          if (!isLeft && binaryOperatorAssociativity === qt.Associativity.Right && operand.kind === Syntax.YieldExpression) return false;
          return true;
        case qu.Comparison.GreaterThan:
          return false;
        case qu.Comparison.EqualTo:
          if (isLeft) {
            // No need to parenthesize the left operand when the binary operator is
            // left associative:
            //  (a*b)/x    -> a*b/x
            //  (a**b)/x   -> a**b/x
            //
            // Parentheses are needed for the left operand when the binary operator is
            // right associative:
            //  (a/b)**x   -> (a/b)**x
            //  (a**b)**x  -> (a**b)**x
            return binaryOperatorAssociativity === qt.Associativity.Right;
          } else {
            if (qf.is.kind(emittedOperand, BinaryExpression) && emittedOperand.operatorToken.kind === binaryOperator) {
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
            const operandAssociativity = qf.get.expressionAssociativity(emittedOperand);
            return operandAssociativity === qt.Associativity.Left;
          }
      }
    }
    return binaryOperandNeedsParentheses(binaryOperator, operand, isLeft, leftOperand) ? new ParenthesizedExpression(operand) : operand;
  }
  export function forConditionalHead(c: qt.Expression) {
    const conditionalPrecedence = qy.get.operatorPrecedence(Syntax.ConditionalExpression, qt.QuestionToken);
    const emittedCondition = qb.skip.partiallyEmittedExpressions(c);
    const conditionPrecedence = qf.get.expressionPrecedence(emittedCondition);
    if (qu.compareNumbers(conditionPrecedence, conditionalPrecedence) !== qu.Comparison.GreaterThan) return new ParenthesizedExpression(c);
    return c;
  }
  export function subexpressionOfConditionalExpression(e: qt.Expression): qt.Expression {
    const e2 = qb.skip.partiallyEmittedExpressions(e);
    return qf.is.commaSequence(e2) ? new ParenthesizedExpression(e) : e;
  }
  export function forAccess(e: qt.Expression): qt.LeftExpression {
    const e2 = qb.skip.partiallyEmittedExpressions(e);
    const n = e2 as Node;
    if (qf.is.leftHandSideExpression(n) && (n.kind !== Syntax.NewExpression || n.arguments)) return e as qt.LeftExpression;
    return new ParenthesizedExpression(e).setRange(e);
  }
  export function postfixOperand(e: qt.Expression) {
    return qf.is.leftHandSideExpression(e as Node) ? e : new ParenthesizedExpression(e).setRange(e);
  }
  export function prefixOperand(e: qt.Expression) {
    return qf.is.unaryExpression(e as Node) ? e : new ParenthesizedExpression(e).setRange(e);
  }
  export function listElems(es: qt.Nodes<qt.Expression>) {
    let r: qt.Expression[] | undefined;
    for (let i = 0; i < es.length; i++) {
      const e = parenthesize.expressionForList(es[i]);
      if (r || e !== es[i]) {
        if (!r) r = es.slice(0, i);
        r.push(e);
      }
    }
    return r ? new Nodes(r, es.trailingComma).setRange(es) : es;
  }
  export function expressionForList(e: qt.Expression) {
    const e2 = qb.skip.partiallyEmittedExpressions(e);
    const expressionPrecedence = qf.get.expressionPrecedence(e2);
    const commaPrecedence = qy.get.operatorPrecedence(Syntax.BinaryExpression, Syntax.CommaToken);
    return expressionPrecedence > commaPrecedence ? e : new ParenthesizedExpression(e).setRange(e);
  }
  export function expressionForExpressionStatement(e: qt.Expression) {
    const e2 = qb.skip.partiallyEmittedExpressions(e);
    const n = e2 as Node;
    if (n.kind === Syntax.CallExpression) {
      const callee = n.expression;
      const k = qb.skip.partiallyEmittedExpressions(callee).kind;
      if (k === Syntax.FunctionExpression || k === Syntax.ArrowFunction) {
        const c = getMutableClone(e2);
        c.expression = new ParenthesizedExpression(callee).setRange(callee);
        return recreateOuterExpressions(e, c, qt.OuterExpressionKinds.PartiallyEmittedExpressions);
      }
    }
    const k = qf.get.leftmostExpression(e2, false).kind;
    if (k === Syntax.ObjectLiteralExpression || k === Syntax.FunctionExpression) return new ParenthesizedExpression(e).setRange(e);
    return e;
  }
  export function conditionalTypeMember(n: qt.Typing) {
    return n.kind === Syntax.ConditionalTyping ? new ParenthesizedTyping(n) : n;
  }
  export function elemTypeMember(n: qt.Typing) {
    switch (n.kind) {
      case Syntax.UnionTyping:
      case Syntax.IntersectionTyping:
      case Syntax.FunctionTyping:
      case Syntax.ConstructorTyping:
        return new ParenthesizedTyping(n);
    }
    return conditionalTypeMember(n);
  }
  export function arrayTypeMember(n: qt.Typing) {
    switch (n.kind) {
      case Syntax.TypingQuery:
      case Syntax.TypingOperator:
      case Syntax.InferTyping:
        return new ParenthesizedTyping(n);
    }
    return elemTypeMember(n);
  }
  export function elemTypeMembers(ns: readonly qt.Typing[]) {
    return new Nodes(qu.sameMap(ns, elemTypeMember));
  }
  export function typeParameters(ns?: readonly qt.Typing[]) {
    if (qu.some(ns)) {
      const ps = [] as qt.Typing[];
      for (let i = 0; i < ns.length; ++i) {
        const p = ns[i] as Node;
        ps.push(i === 0 && qf.is.functionOrConstructorTyping(p) && p.typeParameters ? new ParenthesizedTyping(p) : (p as qt.Typing));
      }
      return new Nodes(ps);
    }
    return;
  }
  export function defaultExpression(e: qt.Expression) {
    const check = qb.skip.partiallyEmittedExpressions(e);
    let needsParens = qf.is.commaSequence(check);
    if (!needsParens) {
      switch (qf.get.leftmostExpression(check, false).kind) {
        case Syntax.ClassExpression:
        case Syntax.FunctionExpression:
          needsParens = true;
      }
    }
    return needsParens ? new ParenthesizedExpression(e) : e;
  }
  export function forNew(e: qt.Expression): qt.LeftExpression {
    const n = qf.get.leftmostExpression(e, true) as Node;
    switch (n.kind) {
      case Syntax.CallExpression:
        return new ParenthesizedExpression(e);
      case Syntax.NewExpression:
        return !n.arguments ? new ParenthesizedExpression(e) : (e as qt.LeftExpression);
    }
    return forAccess(e);
  }
  export function conciseBody(b: qt.ConciseBody): qt.ConciseBody {
    if (b.kind !== Syntax.Block && (qf.is.commaSequence(b) || qf.get.leftmostExpression(b, false).kind === Syntax.ObjectLiteralExpression)) return new ParenthesizedExpression(b).setRange(b);
    return b;
  }
}
export namespace emit {
  export function disposeEmitNodes(sourceFile: qt.SourceFile) {
    sourceFile = qf.get.parseTreeOf(sourceFile).sourceFile;
    const emitNode = sourceFile && sourceFile.emitNode;
    const annotatedNodes = emitNode && emitNode.annotatedNodes;
    if (annotatedNodes) {
      for (const n of annotatedNodes) {
        n.emitNode = undefined;
      }
    }
  }
  export function getOrCreateEmitNode(n: Node): qt.EmitNode {
    if (!n.emitNode) {
      if (qf.is.parseTreeNode(n)) {
        if (n.kind === Syntax.SourceFile) return (n.emitNode = { annotatedNodes: [n] } as qt.EmitNode);
        const sourceFile = qf.get.parseTreeOf(n.sourceFile).sourceFile;
        getOrCreateEmitNode(sourceFile).annotatedNodes!.push(n);
      }
      n.emitNode = {} as qt.EmitNode;
    }
    return n.emitNode;
  }
  export function removeAllComments<T extends Nobj>(n: T): T {
    const emitNode = getOrCreateEmitNode(n);
    emitNode.flags |= qt.EmitFlags.NoComments;
    emitNode.leadingComments = undefined;
    emitNode.trailingComments = undefined;
    return n;
  }
  export function setEmitFlags<T extends Nobj>(n: T, emitFlags: qt.EmitFlags) {
    getOrCreateEmitNode(n).flags = emitFlags;
    return n;
  }
  export function addEmitFlags<T extends Nobj>(n: T, emitFlags: qt.EmitFlags) {
    const emitNode = getOrCreateEmitNode(n);
    emitNode.flags = emitNode.flags | emitFlags;
    return n;
  }
  export function getSourceMapRange(n: Node): qt.SourceMapRange {
    const emitNode = n.emitNode;
    return (emitNode && emitNode.sourceMapRange) || n;
  }
  export function setSourceMapRange<T extends Nobj>(n: T, range: qt.SourceMapRange | undefined) {
    getOrCreateEmitNode(n).sourceMapRange = range;
    return n;
  }
  export function getTokenSourceMapRange(n: Node, token: Syntax): qt.SourceMapRange | undefined {
    const emitNode = n.emitNode;
    const tokenSourceMapRanges = emitNode && emitNode.tokenSourceMapRanges;
    return tokenSourceMapRanges && tokenSourceMapRanges[token];
  }
  export function setTokenSourceMapRange<T extends Nobj>(n: T, token: Syntax, range: qt.SourceMapRange | undefined) {
    const emitNode = getOrCreateEmitNode(n);
    const tokenSourceMapRanges = emitNode.tokenSourceMapRanges || (emitNode.tokenSourceMapRanges = []);
    tokenSourceMapRanges[token] = range;
    return n;
  }
  export function getStartsOnNewLine(n: Node) {
    const emitNode = n.emitNode;
    return emitNode && emitNode.startsOnNewLine;
  }
  export function setStartsOnNewLine<T extends Nobj>(n: T, newLine: boolean) {
    getOrCreateEmitNode(n).startsOnNewLine = newLine;
    return n;
  }
  export function getCommentRange(n: Node) {
    const emitNode = n.emitNode;
    return (emitNode && emitNode.commentRange) || n;
  }
  export function setCommentRange<T extends Nobj>(n: T, range: qu.TextRange) {
    getOrCreateEmitNode(n).commentRange = range;
    return n;
  }
  export function getSyntheticLeadingComments(n: Node): qt.SynthesizedComment[] | undefined {
    const emitNode = n.emitNode;
    return emitNode && emitNode.leadingComments;
  }
  export function setSyntheticLeadingComments<T extends Nobj>(n: T, comments: qt.SynthesizedComment[] | undefined) {
    getOrCreateEmitNode(n).leadingComments = comments;
    return n;
  }
  export function addSyntheticLeadingComment<T extends Nobj>(n: T, kind: Syntax.SingleLineCommentTrivia | Syntax.MultiLineCommentTrivia, text: string, hasTrailingNewLine?: boolean) {
    return setSyntheticLeadingComments(
      n,
      qu.append<qt.SynthesizedComment>(getSyntheticLeadingComments(n), { kind, pos: -1, end: -1, hasTrailingNewLine, text })
    );
  }
  export function getSyntheticTrailingComments(n: Node): qt.SynthesizedComment[] | undefined {
    const emitNode = n.emitNode;
    return emitNode && emitNode.trailingComments;
  }
  export function setSyntheticTrailingComments<T extends Nobj>(n: T, comments: qt.SynthesizedComment[] | undefined) {
    getOrCreateEmitNode(n).trailingComments = comments;
    return n;
  }
  export function addSyntheticTrailingComment<T extends Nobj>(n: T, kind: Syntax.SingleLineCommentTrivia | Syntax.MultiLineCommentTrivia, text: string, hasTrailingNewLine?: boolean) {
    return setSyntheticTrailingComments(
      n,
      qu.append<qt.SynthesizedComment>(getSyntheticTrailingComments(n), { kind, pos: -1, end: -1, hasTrailingNewLine, text })
    );
  }
  export function moveSyntheticComments<T extends Nobj>(n: T, original: Node): T {
    setSyntheticLeadingComments(n, getSyntheticLeadingComments(original));
    setSyntheticTrailingComments(n, getSyntheticTrailingComments(original));
    const emit = getOrCreateEmitNode(original);
    emit.leadingComments = undefined;
    emit.trailingComments = undefined;
    return n;
  }
  export function ignoreSourceNewlines<T extends Nobj>(n: T): T {
    getOrCreateEmitNode(n).flags |= qt.EmitFlags.IgnoreSourceNewlines;
    return n;
  }
  export function getConstantValue(n: PropertyAccessExpression | ElemAccessExpression): string | number | undefined {
    const emitNode = n.emitNode;
    return emitNode && emitNode.constantValue;
  }
  export function setConstantValue(n: PropertyAccessExpression | ElemAccessExpression, value: string | number): PropertyAccessExpression | ElemAccessExpression {
    const emitNode = getOrCreateEmitNode(n);
    emitNode.constantValue = value;
    return n;
  }
  export function addEmitHelper<T extends Nobj>(n: T, helper: qt.EmitHelper): T {
    const emitNode = getOrCreateEmitNode(n);
    emitNode.helpers = qu.append(emitNode.helpers, helper);
    return n;
  }
  export function addEmitHelpers<T extends Nobj>(n: T, helpers: qt.EmitHelper[] | undefined): T {
    if (qu.some(helpers)) {
      const emitNode = getOrCreateEmitNode(n);
      for (const helper of helpers) {
        emitNode.helpers = qu.appendIfUnique(emitNode.helpers, helper);
      }
    }
    return n;
  }
  export function removeEmitHelper(n: Node, helper: qt.EmitHelper): boolean {
    const emitNode = n.emitNode;
    if (emitNode) {
      const helpers = emitNode.helpers;
      if (helpers) return orderedRemoveItem(helpers, helper);
    }
    return false;
  }
  export function getEmitHelpers(n: Node): qt.EmitHelper[] | undefined {
    const emitNode = n.emitNode;
    return emitNode && emitNode.helpers;
  }
  export function moveEmitHelpers(source: Node, target: Node, predicate: (helper: qt.EmitHelper) => boolean) {
    const sourceEmitNode = source.emitNode;
    const sourceEmitHelpers = sourceEmitNode && sourceEmitNode.helpers;
    if (!qu.some(sourceEmitHelpers)) return;
    const targetEmitNode = getOrCreateEmitNode(target);
    let helpersRemoved = 0;
    for (let i = 0; i < sourceEmitHelpers.length; i++) {
      const helper = sourceEmitHelpers[i];
      if (predicate(helper)) {
        helpersRemoved++;
        targetEmitNode.helpers = qu.appendIfUnique(targetEmitNode.helpers, helper);
      } else if (helpersRemoved > 0) sourceEmitHelpers[i - helpersRemoved] = helper;
    }
    if (helpersRemoved > 0) sourceEmitHelpers.length -= helpersRemoved;
  }
  export function compareEmitHelpers(x: qt.EmitHelper, y: qt.EmitHelper) {
    if (x === y) return qu.Comparison.EqualTo;
    if (x.priority === y.priority) return qu.Comparison.EqualTo;
    if (x.priority === undefined) return qu.Comparison.GreaterThan;
    if (y.priority === undefined) return qu.Comparison.LessThan;
    return qu.compareNumbers(x.priority, y.priority);
  }
  export function mergeEmitNode(sourceEmitNode: qt.EmitNode, destEmitNode: qt.EmitNode | undefined) {
    const { flags, leadingComments, trailingComments, commentRange, sourceMapRange, tokenSourceMapRanges, constantValue, helpers, startsOnNewLine } = sourceEmitNode;
    if (!destEmitNode) destEmitNode = {} as qt.EmitNode;
    if (leadingComments) destEmitNode.leadingComments = addRange(leadingComments.slice(), destEmitNode.leadingComments);
    if (trailingComments) destEmitNode.trailingComments = addRange(trailingComments.slice(), destEmitNode.trailingComments);
    if (flags) destEmitNode.flags = flags;
    if (commentRange) destEmitNode.commentRange = commentRange;
    if (sourceMapRange) destEmitNode.sourceMapRange = sourceMapRange;
    if (tokenSourceMapRanges) destEmitNode.tokenSourceMapRanges = qu.TextRange.merge(tokenSourceMapRanges, destEmitNode.tokenSourceMapRanges!);
    if (constantValue !== undefined) destEmitNode.constantValue = constantValue;
    if (helpers) destEmitNode.helpers = addRange(destEmitNode.helpers, helpers);
    if (startsOnNewLine !== undefined) destEmitNode.startsOnNewLine = startsOnNewLine;
    return destEmitNode;
  }
  export function getExternalHelpersModuleName(n: qt.SourceFile) {
    const parseNode = qf.get.originalOf(n, isSourceFile);
    const emitNode = parseNode && parseNode.emitNode;
    return emitNode && emitNode.externalHelpersModuleName;
  }
  export function hasRecordedExternalHelpers(sourceFile: qt.SourceFile) {
    const parseNode = qf.get.originalOf(sourceFile, isSourceFile);
    const emitNode = parseNode && parseNode.emitNode;
    return !!emitNode && (!!emitNode.externalHelpersModuleName || !!emitNode.externalHelpers);
  }
}
export namespace fixme {
  let SourceMapSource: new (fileName: string, text: string, skipTrivia?: (pos: number) => number) => SourceMapSource;
  export function createSourceMapSource(fileName: string, text: string, skipTrivia?: (pos: number) => number): SourceMapSource {
    return new (SourceMapSource || (SourceMapSource = Node.SourceMapSourceObj))(fileName, text, qy.skipTrivia);
  }
  export function getUnscopedHelperName(name: string) {
    return setEmitFlags(new Identifier(name), qt.EmitFlags.HelperName | qt.EmitFlags.AdviseOnEmitNode);
  }
  export function inlineExpressions(expressions: readonly qt.Expression[]) {
    return expressions.length > 10 ? new CommaListExpression(expressions) : reduceLeft(expressions, qf.create.comma)!;
  }
  export function convertToFunctionBody(node: qt.ConciseBody, multiLine?: boolean): qt.Block {
    return qf.is.kind(Block, node) ? node : new Block([new ReturnStatement(node).setRange(node)], multiLine).setRange(node);
  }
  export function ensureUseStrict(statements: qt.Nodes<qt.Statement>): qt.Nodes<qt.Statement> {
    const foundUseStrict = findUseStrictPrologue(statements);
    if (!foundUseStrict) {
      return new Nodes<qt.Statement>([startOnNewLine(new ExpressionStatement(asLiteral('use strict'))), ...statements]).setRange(statements);
    }
    return statements;
  }
  export function startOnNewLine<T extends Nobj>(node: T): T {
    return setStartsOnNewLine(node, true);
  }
  export function createExternalHelpersImportDeclarationIfNeeded(
    sourceFile: SourceFile,
    compilerOptions: qt.CompilerOptions,
    hasExportStarsToExportValues?: boolean,
    hasImportStar?: boolean,
    hasImportDefault?: boolean
  ) {
    if (compilerOptions.importHelpers && isEffectiveExternalModule(sourceFile, compilerOptions)) {
      let namedBindings: qt.NamedImportBindings | undefined;
      const moduleKind = getEmitModuleKind(compilerOptions);
      if (moduleKind >= ModuleKind.ES2015 && moduleKind <= ModuleKind.ESNext) {
        const helpers = getEmitHelpers(sourceFile);
        if (helpers) {
          const helperNames: string[] = [];
          for (const helper of helpers) {
            if (!helper.scoped) {
              const importName = (helper as UnscopedEmitHelper).importName;
              if (importName) {
                qu.pushIfUnique(helperNames, importName);
              }
            }
          }
          if (qu.some(helperNames)) {
            helperNames.sort(compareCaseSensitive);
            namedBindings = new NamedImports(
              qu.map(helperNames, (name) =>
                isFileLevelUniqueName(sourceFile, name) ? new ImportSpecifier(undefined, new Identifier(name)) : new qb.ImportSpecifier(new Identifier(name), getUnscopedHelperName(name))
              )
            );
            const parseNode = qf.get.originalOf(sourceFile, isSourceFile);
            const emitNode = getOrCreateEmitNode(parseNode);
            emitNode.externalHelpers = true;
          }
        }
      } else {
        const externalHelpersModuleName = getOrCreateExternalHelpersModuleNameIfNeeded(sourceFile, compilerOptions, hasExportStarsToExportValues, hasImportStar || hasImportDefault);
        if (externalHelpersModuleName) {
          namedBindings = new NamespaceImport(externalHelpersModuleName);
        }
      }
      if (namedBindings) {
        const externalHelpersImportDeclaration = new ImportDeclaration(undefined, undefined, new ImportClause(undefined, namedBindings), asLiteral(externalHelpersModuleNameText));
        addEmitFlags(externalHelpersImportDeclaration, qt.EmitFlags.NeverApplyImportHelper);
        return externalHelpersImportDeclaration;
      }
    }
    return;
  }
  export function getOrCreateExternalHelpersModuleNameIfNeeded(node: SourceFile, compilerOptions: qt.CompilerOptions, hasExportStarsToExportValues?: boolean, hasImportStarOrImportDefault?: boolean) {
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
        const parseNode = qf.get.originalOf(node, isSourceFile);
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
    compilerOptions: qt.CompilerOptions
  ) {
    const moduleName = qf.get.externalModuleName(importNode)!;
    if (moduleName.kind === Syntax.StringLiteral) {
      function tryRenameExternalModule(moduleName: LiteralExpression, sourceFile: SourceFile) {
        const rename = sourceFile.renamedDependencies && sourceFile.renamedDependencies.get(moduleName.text);
        return rename && asLiteral(rename);
      }
      function tryGetModuleNameFromDeclaration(
        declaration: ImportEqualsDeclaration | ImportDeclaration | ExportDeclaration,
        host: EmitHost,
        resolver: EmitResolver,
        compilerOptions: qt.CompilerOptions
      ) {
        return tryGetModuleNameFromFile(resolver.getExternalModuleFileFromDeclaration(declaration), host, compilerOptions);
      }
      return (
        tryGetModuleNameFromDeclaration(importNode, host, resolver, compilerOptions) || tryRenameExternalModule(<StringLiteral>moduleName, sourceFile) || getSynthesizedClone(<StringLiteral>moduleName)
      );
    }
    return;
  }
  export function tryGetModuleNameFromFile(file: SourceFile | undefined, host: EmitHost, options: qt.CompilerOptions): StringLiteral | undefined {
    if (!file) {
      return;
    }
    if (file.moduleName) return asLiteral(file.moduleName);
    if (!file.isDeclarationFile && (options.out || options.outFile)) return asLiteral(qf.get.externalModuleNameFromPath(host, file.fileName));
    return;
  }
}
export function asToken<T extends Syntax>(t: T | qt.Token<T>): qb.Token<T> {
  return typeof t === 'number' ? new qb.Token(t) : t;
}
export function asName<T extends qt.Identifier | qt.BindingName | qt.PropertyName | qt.EntityName | qt.ThisTyping | undefined>(n: string | T): T | Identifier {
  return qu.isString(n) ? new Identifier(n) : n;
}
export function asLiteral(v: string | StringLiteral | NoSubstitutionLiteral | NumericLiteral | Identifier, singleQuote: boolean): StringLiteral;
export function asLiteral(v: string | number, singleQuote: boolean): StringLiteral | NumericLiteral;
export function asLiteral(v: string | StringLiteral | NoSubstitutionLiteral | NumericLiteral | Identifier): StringLiteral;
export function asLiteral(v: number | qt.PseudoBigInt): NumericLiteral;
export function asLiteral(v: boolean): BooleanLiteral;
export function asLiteral(v: string | number | qt.PseudoBigInt | boolean): qb.PrimaryExpr;
export function asLiteral(v: string | number | qt.PseudoBigInt | boolean | StringLiteral | NoSubstitutionLiteral | NumericLiteral | Identifier, singleQuote?: boolean): qb.PrimaryExpr {
  if (typeof v === 'number') return new NumericLiteral(v + '');
  if (typeof v === 'object' && 'base10Value' in v) return new BigIntLiteral(pseudoBigIntToString(v) + 'n');
  if (typeof v === 'boolean') return v ? new BooleanLiteral(true) : new BooleanLiteral(false);
  if (qu.isString(v)) {
    const r = new StringLiteral(v);
    if (singleQuote) r.singleQuote = true;
    return r;
  }
  return qf.create.fromNode(v);
}
export function asExpression<T extends qt.Expression | undefined>(e: string | number | boolean | T): T | StringLiteral | NumericLiteral | BooleanLiteral {
  return typeof e === 'string' ? new StringLiteral(e) : typeof e === 'number' ? new NumericLiteral('' + e) : typeof e === 'boolean' ? (e ? new BooleanLiteral(true) : new BooleanLiteral(false)) : e;
}
export function asEmbeddedStatement<T extends qt.Nobj>(s: T): T | EmptyStatement;
export function asEmbeddedStatement<T extends qt.Nobj>(s?: T): T | EmptyStatement | undefined;
export function asEmbeddedStatement<T extends qt.Nobj>(s?: T): T | EmptyStatement | undefined {
  return s?.kind === Syntax.NotEmittedStatement ? new EmptyStatement().setOriginal(s).setRange(s) : s;
}
export function pseudoBigIntToString({ negative, base10Value }: qt.PseudoBigInt) {
  return (negative && base10Value !== '0' ? '-' : '') + base10Value;
}
export function updateFunctionLikeBody(d: qt.FunctionLikeDeclaration, b: qt.Block): qt.FunctionLikeDeclaration {
  switch (d.kind) {
    case Syntax.FunctionDeclaration:
      return new FunctionDeclaration(d.decorators, d.modifiers, d.asteriskToken, d.name, d.typeParameters, d.parameters, d.type, b);
    case Syntax.MethodDeclaration:
      return new MethodDeclaration(d.decorators, d.modifiers, d.asteriskToken, d.name, d.questionToken, d.typeParameters, d.parameters, d.type, b);
    case Syntax.GetAccessor:
      return new GetAccessorDeclaration(d.decorators, d.modifiers, d.name, d.parameters, d.type, b);
    case Syntax.SetAccessor:
      return new SetAccessorDeclaration(d.decorators, d.modifiers, d.name, d.parameters, b);
    case Syntax.Constructor:
      return new ConstructorDeclaration(d.decorators, d.modifiers, d.parameters, b);
    case Syntax.FunctionExpression:
      return new FunctionExpression(d.modifiers, d.asteriskToken, d.name, d.typeParameters, d.parameters, d.type, b);
    case Syntax.ArrowFunction:
      return new ArrowFunction(d.modifiers, d.typeParameters, d.parameters, d.type, d.equalsGreaterThanToken, b);
  }
}
export function updateOuterExpression(o: Node, e: qt.Expression) {
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

export interface SynMap {
  [Syntax.ArrayBindingPattern]: ArrayBindingPattern;
  [Syntax.ArrayLiteralExpression]: ArrayLiteralExpression;
  [Syntax.ArrayTyping]: ArrayTyping;
  [Syntax.ArrowFunction]: ArrowFunction;
  [Syntax.AsExpression]: AsExpression;
  [Syntax.AsteriskToken]: qt.AsteriskToken;
  [Syntax.AwaitExpression]: AwaitExpression;
  [Syntax.BigIntLiteral]: BigIntLiteral;
  [Syntax.BinaryExpression]: BinaryExpression;
  [Syntax.BindingElem]: BindingElem;
  [Syntax.Block]: qt.Block;
  [Syntax.BreakStatement]: BreakStatement;
  [Syntax.Bundle]: Bundle;
  [Syntax.CallExpression]: CallExpression;
  [Syntax.CallSignature]: CallSignatureDeclaration;
  [Syntax.CaseBlock]: CaseBlock;
  [Syntax.CaseClause]: CaseClause;
  [Syntax.CatchClause]: CatchClause;
  [Syntax.ClassDeclaration]: ClassDeclaration;
  [Syntax.ClassExpression]: ClassExpression;
  [Syntax.ColonToken]: qt.ColonToken;
  [Syntax.CommaListExpression]: CommaListExpression;
  [Syntax.ComputedPropertyName]: ComputedPropertyName;
  [Syntax.ConditionalExpression]: ConditionalExpression;
  [Syntax.ConditionalTyping]: ConditionalTyping;
  [Syntax.Constructor]: ConstructorDeclaration;
  [Syntax.ConstructorTyping]: ConstructorTyping;
  [Syntax.ConstructSignature]: ConstructSignatureDeclaration;
  [Syntax.ContinueStatement]: ContinueStatement;
  [Syntax.DebuggerStatement]: DebuggerStatement;
  [Syntax.Decorator]: Decorator;
  [Syntax.DefaultClause]: DefaultClause;
  [Syntax.DeleteExpression]: DeleteExpression;
  [Syntax.DoStatement]: DoStatement;
  [Syntax.Dot3Token]: qt.Dot3Token;
  [Syntax.DotToken]: qt.DotToken;
  [Syntax.ElemAccessExpression]: ElemAccessExpression;
  [Syntax.EmptyStatement]: EmptyStatement;
  [Syntax.EndOfDeclarationMarker]: EndOfDeclarationMarker;
  [Syntax.EndOfFileToken]: qt.EndOfFileToken;
  [Syntax.EnumDeclaration]: EnumDeclaration;
  [Syntax.EnumMember]: EnumMember;
  [Syntax.EqualsGreaterThanToken]: qt.EqualsGreaterThanToken;
  [Syntax.EqualsToken]: qt.EqualsToken;
  [Syntax.ExclamationToken]: qt.ExclamationToken;
  [Syntax.ExportAssignment]: ExportAssignment;
  [Syntax.ExportDeclaration]: ExportDeclaration;
  [Syntax.ExportSpecifier]: ExportSpecifier;
  [Syntax.ExpressionStatement]: ExpressionStatement;
  [Syntax.ExpressionWithTypings]: ExpressionWithTypings;
  [Syntax.ExternalModuleReference]: ExternalModuleReference;
  [Syntax.ForInStatement]: ForInStatement;
  [Syntax.ForOfStatement]: ForOfStatement;
  [Syntax.ForStatement]: ForStatement;
  [Syntax.FunctionDeclaration]: FunctionDeclaration;
  [Syntax.FunctionExpression]: FunctionExpression;
  [Syntax.FunctionTyping]: FunctionTyping;
  [Syntax.GetAccessor]: GetAccessorDeclaration;
  [Syntax.HeritageClause]: HeritageClause;
  [Syntax.Identifier]: qt.Identifier;
  [Syntax.IfStatement]: IfStatement;
  [Syntax.ImportClause]: ImportClause;
  [Syntax.ImportDeclaration]: ImportDeclaration;
  [Syntax.ImportEqualsDeclaration]: ImportEqualsDeclaration;
  [Syntax.ImportSpecifier]: ImportSpecifier;
  [Syntax.ImportTyping]: ImportTyping;
  [Syntax.IndexedAccessTyping]: IndexedAccessTyping;
  [Syntax.IndexSignature]: IndexSignatureDeclaration;
  [Syntax.InferTyping]: InferTyping;
  [Syntax.InputFiles]: InputFiles;
  [Syntax.InterfaceDeclaration]: InterfaceDeclaration;
  [Syntax.IntersectionTyping]: IntersectionTyping;
  [Syntax.DocAllTyping]: DocAllTyping;
  [Syntax.DocAugmentsTag]: DocAugmentsTag;
  [Syntax.DocAuthorTag]: DocAuthorTag;
  [Syntax.DocCallbackTag]: DocCallbackTag;
  [Syntax.DocClassTag]: DocClassTag;
  [Syntax.DocComment]: Doc;
  [Syntax.DocEnumTag]: DocEnumTag;
  [Syntax.DocFunctionTyping]: DocFunctionTyping;
  [Syntax.DocImplementsTag]: DocImplementsTag;
  [Syntax.DocNamepathTyping]: DocNamepathTyping;
  [Syntax.DocNonNullableTyping]: DocNonNullableTyping;
  [Syntax.DocNullableTyping]: DocNullableTyping;
  [Syntax.DocOptionalTyping]: DocOptionalTyping;
  [Syntax.DocParameterTag]: DocParameterTag;
  [Syntax.DocPrivateTag]: DocPrivateTag;
  [Syntax.DocPropertyTag]: DocPropertyTag;
  [Syntax.DocProtectedTag]: DocProtectedTag;
  [Syntax.DocPublicTag]: DocPublicTag;
  [Syntax.DocReadonlyTag]: DocReadonlyTag;
  [Syntax.DocReturnTag]: DocReturnTag;
  [Syntax.DocSignature]: DocSignature;
  [Syntax.DocUnknownTag]: DocTag;
  [Syntax.DocTemplateTag]: DocTemplateTag;
  [Syntax.DocThisTag]: DocThisTag;
  [Syntax.DocTypedefTag]: DocTypedefTag;
  [Syntax.DocTypingExpression]: DocTypingExpression;
  [Syntax.DocTypingLiteral]: DocTypingLiteral;
  [Syntax.DocTypeTag]: DocTypeTag;
  [Syntax.DocUnknownTyping]: DocUnknownTyping;
  [Syntax.DocVariadicTyping]: DocVariadicTyping;
  [Syntax.JsxAttribute]: JsxAttribute;
  [Syntax.JsxAttributes]: qt.JsxAttributes;
  [Syntax.JsxClosingElem]: JsxClosingElem;
  [Syntax.JsxClosingFragment]: JsxClosingFragment;
  [Syntax.JsxElem]: JsxElem;
  [Syntax.JsxExpression]: JsxExpression;
  [Syntax.JsxFragment]: JsxFragment;
  [Syntax.JsxOpeningElem]: JsxOpeningElem;
  [Syntax.JsxOpeningFragment]: JsxOpeningFragment;
  [Syntax.JsxSelfClosingElem]: JsxSelfClosingElem;
  [Syntax.JsxSpreadAttribute]: JsxSpreadAttribute;
  [Syntax.JsxText]: JsxText;
  [Syntax.LabeledStatement]: LabeledStatement;
  [Syntax.LiteralTyping]: LiteralTyping;
  [Syntax.MappedTyping]: MappedTyping;
  [Syntax.MergeDeclarationMarker]: MergeDeclarationMarker;
  [Syntax.MetaProperty]: MetaProperty;
  [Syntax.MethodDeclaration]: MethodDeclaration;
  [Syntax.MethodSignature]: MethodSignature;
  [Syntax.MinusToken]: qt.MinusToken;
  [Syntax.MissingDeclaration]: MissingDeclaration;
  [Syntax.ModuleBlock]: ModuleBlock;
  [Syntax.ModuleDeclaration]: ModuleDeclaration;
  [Syntax.NamedExports]: NamedExports;
  [Syntax.NamedImports]: NamedImports;
  [Syntax.NamedTupleMember]: NamedTupleMember;
  [Syntax.NamespaceExport]: NamespaceExport;
  [Syntax.NamespaceExportDeclaration]: NamespaceExportDeclaration;
  [Syntax.NamespaceImport]: NamespaceImport;
  [Syntax.NewExpression]: NewExpression;
  [Syntax.NonNullExpression]: NonNullExpression;
  [Syntax.NoSubstitutionLiteral]: NoSubstitutionLiteral;
  [Syntax.NotEmittedStatement]: NotEmittedStatement;
  [Syntax.NumericLiteral]: NumericLiteral;
  [Syntax.ObjectBindingPattern]: ObjectBindingPattern;
  [Syntax.ObjectLiteralExpression]: ObjectLiteralExpression;
  [Syntax.OmittedExpression]: OmittedExpression;
  [Syntax.OptionalTyping]: OptionalTyping;
  [Syntax.Parameter]: ParameterDeclaration;
  [Syntax.ParenthesizedExpression]: ParenthesizedExpression;
  [Syntax.ParenthesizedTyping]: ParenthesizedTyping;
  [Syntax.PartiallyEmittedExpression]: PartiallyEmittedExpression;
  [Syntax.PlusToken]: qt.PlusToken;
  [Syntax.PostfixUnaryExpression]: PostfixUnaryExpression;
  [Syntax.PrefixUnaryExpression]: PrefixUnaryExpression;
  [Syntax.PrivateIdentifier]: PrivateIdentifier;
  [Syntax.PropertyAccessExpression]: PropertyAccessExpression;
  [Syntax.PropertyAssignment]: PropertyAssignment;
  [Syntax.PropertyDeclaration]: PropertyDeclaration;
  [Syntax.PropertySignature]: PropertySignature;
  [Syntax.QualifiedName]: QualifiedName;
  [Syntax.QuestionDotToken]: qt.QuestionDotToken;
  [Syntax.QuestionToken]: qt.QuestionToken;
  [Syntax.RegexLiteral]: RegexLiteral;
  [Syntax.RestTyping]: RestTyping;
  [Syntax.ReturnStatement]: ReturnStatement;
  [Syntax.SemicolonClassElem]: SemicolonClassElem;
  [Syntax.SetAccessor]: SetAccessorDeclaration;
  [Syntax.ShorthandPropertyAssignment]: ShorthandPropertyAssignment;
  [Syntax.SourceFile]: qb.SourceFile;
  [Syntax.SpreadAssignment]: SpreadAssignment;
  [Syntax.SpreadElem]: SpreadElem;
  [Syntax.StringLiteral]: StringLiteral;
  [Syntax.SwitchStatement]: SwitchStatement;
  [Syntax.SyntaxList]: qb.SyntaxList;
  [Syntax.SyntheticExpression]: qt.SyntheticExpression;
  [Syntax.SyntheticReferenceExpression]: SyntheticReferenceExpression;
  [Syntax.TaggedTemplateExpression]: TaggedTemplateExpression;
  [Syntax.TemplateExpression]: qt.TemplateExpression;
  [Syntax.TemplateHead]: qt.TemplateHead;
  [Syntax.TemplateMiddle]: qt.TemplateMiddle;
  [Syntax.TemplateSpan]: qt.TemplateSpan;
  [Syntax.TemplateTail]: qt.TemplateTail;
  [Syntax.ThisTyping]: ThisTyping;
  [Syntax.ThrowStatement]: ThrowStatement;
  [Syntax.TryStatement]: TryStatement;
  [Syntax.TupleTyping]: TupleTyping;
  [Syntax.TypeAliasDeclaration]: TypeAliasDeclaration;
  [Syntax.TypeAssertionExpression]: TypeAssertion;
  [Syntax.TypingLiteral]: TypingLiteral;
  [Syntax.TypeOfExpression]: TypeOfExpression;
  [Syntax.TypingOperator]: TypingOperator;
  [Syntax.TypeParameter]: TypeParameterDeclaration;
  [Syntax.TypingPredicate]: TypingPredicate;
  [Syntax.TypingQuery]: TypingQuery;
  [Syntax.TypingReference]: TypingReference;
  [Syntax.UnionTyping]: UnionTyping;
  [Syntax.UnparsedInternalText]: UnparsedTextLike;
  [Syntax.UnparsedPrepend]: UnparsedPrepend;
  [Syntax.UnparsedPrologue]: UnparsedPrologue;
  [Syntax.UnparsedSource]: qb.UnparsedSource;
  [Syntax.UnparsedSyntheticReference]: UnparsedSyntheticReference;
  [Syntax.UnparsedText]: UnparsedTextLike;
  [Syntax.VariableDeclaration]: VariableDeclaration;
  [Syntax.VariableDeclarationList]: VariableDeclarationList;
  [Syntax.VariableStatement]: VariableStatement;
  [Syntax.VoidExpression]: VoidExpression;
  [Syntax.WhileStatement]: WhileStatement;
  [Syntax.WithStatement]: WithStatement;
  [Syntax.YieldExpression]: YieldExpression;
  //[Syntax.Count]: Count;
}
