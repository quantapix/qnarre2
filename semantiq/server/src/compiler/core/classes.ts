import { DocTag, EmitFlags, Modifier, NodeFlags } from '../types';
import { Nodes } from './bases';
import { qf } from './frame';
import { Syntax } from '../syntax';
import * as qb from './bases';
import * as qt from '../types';
import * as qu from '../utils';
import * as qy from '../syntax';
export namespace ArrayBindingElem {
  export const also = [Syntax.BindingElem, Syntax.OmittedExpression];
}
export class ArrayBindingPattern extends qb.Nobj implements qt.ArrayBindingPattern {
  static readonly kind = Syntax.ArrayBindingPattern;
  kind!: Syntax.ArrayBindingPattern;
  parent?: qt.VariableDeclaration | qt.ParamDeclaration | qt.BindingElem;
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
  kind!: Syntax.ArrayLiteralExpression;
  elems: qt.Nodes<qt.Expression>;
  multiLine?: boolean;
  constructor(es?: readonly qt.Expression[], multiLine?: boolean) {
    super(true);
    this.elems = qf.nest.listElems(new Nodes(es));
    if (multiLine) this.multiLine = true;
  }
  update(es: readonly qt.Expression[]) {
    return this.elems !== es ? new ArrayLiteralExpression(es, this.multiLine).updateFrom(this) : this;
  }
}
ArrayLiteralExpression.prototype.kind = ArrayLiteralExpression.kind;
export class ArrayTyping extends qb.Tobj implements qt.ArrayTyping {
  static readonly kind = Syntax.ArrayTyping;
  kind!: Syntax.ArrayTyping;
  elemType: qt.Typing;
  constructor(t: qt.Typing) {
    super(true);
    this.elemType = qf.nest.arrayTypeMember(t);
  }
  update(t: qt.Typing) {
    return this.elemType !== t ? new ArrayTyping(t).updateFrom(this) : this;
  }
}
ArrayTyping.prototype.kind = ArrayTyping.kind;
export class ArrowFunction extends qb.FunctionLikeDecl implements qt.ArrowFunction {
  static readonly kind = Syntax.ArrowFunction;
  kind!: Syntax.ArrowFunction;
  equalsGreaterThanToken: qt.EqualsGreaterThanToken;
  body: qt.ConciseBody;
  name: never;
  constructor(
    ms: readonly Modifier[] | undefined,
    ts: readonly qt.TypeParamDeclaration[] | undefined,
    ps: readonly qt.ParamDeclaration[],
    t: qt.Typing | undefined,
    a: qt.EqualsGreaterThanToken | undefined,
    b: qt.ConciseBody
  ) {
    super(true, Syntax.ArrowFunction, ts, ps, t);
    this.modifiers = Nodes.from(ms);
    this.equalsGreaterThanToken = a || new qb.Token(Syntax.EqualsGreaterThanToken);
    this.body = qf.nest.conciseBody(b);
  }
  update(
    ms: readonly Modifier[] | undefined,
    ts: readonly qt.TypeParamDeclaration[] | undefined,
    ps: readonly qt.ParamDeclaration[],
    t: qt.Typing | undefined,
    a: qt.EqualsGreaterThanToken,
    b: qt.ConciseBody
  ) {
    return this.modifiers !== ms || this.typeParams !== ts || this.params !== ps || this.type !== t || this.equalsGreaterThanToken !== a || this.body !== b
      ? new ArrowFunction(ms, ts, ps, t, a, b).updateFrom(this)
      : this;
  }
  _expressionBrand: any;
}
ArrowFunction.prototype.kind = ArrowFunction.kind;
qu.addMixins(ArrowFunction, [qb.Expr, qb.DocContainer]);
export class AsExpression extends qb.Expr implements qt.AsExpression {
  static readonly kind = Syntax.AsExpression;
  kind!: Syntax.AsExpression;
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
  kind!: Syntax.AwaitExpression;
  expression: qt.UnaryExpression;
  constructor(e: qt.Expression) {
    super(true);
    this.expression = qf.nest.prefixOperand(e);
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new AwaitExpression(e).updateFrom(this) : this;
  }
}
AwaitExpression.prototype.kind = AwaitExpression.kind;
export class BigIntLiteral extends qb.LiteralExpr implements qt.BigIntLiteral {
  static readonly kind = Syntax.BigIntLiteral;
  kind!: Syntax.BigIntLiteral;
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
  kind!: Syntax.BinaryExpression;
  left: qt.Expression;
  operatorToken: qt.BinaryOperatorToken;
  right: qt.Expression;
  constructor(l: qt.Expression, o: qt.BinaryOperator | qt.BinaryOperatorToken, r: qt.Expression) {
    super();
    const t = asToken(o);
    const k = t.kind;
    this.left = qf.nest.binaryOperand(k, l, true, undefined);
    this.operatorToken = t;
    this.right = qf.nest.binaryOperand(k, r, false, this.left);
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
  kind!: Syntax.BindingElem;
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
  kind!: Syntax.Block;
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
  static readonly kind = Syntax.FalseKeyword;
  static readonly also = [Syntax.TrueKeyword];
  kind!: Syntax.FalseKeyword | Syntax.TrueKeyword;
  constructor(k: boolean) {
    super(true, k ? Syntax.TrueKeyword : Syntax.FalseKeyword);
  }
  _typingBrand: any;
}
export class BreakStatement extends qb.Stmt implements qt.BreakStatement {
  static readonly kind = Syntax.BreakStatement;
  kind!: Syntax.BreakStatement;
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
export class Bundle extends qb.Nobj implements qt.Bundle {
  static readonly kind = Syntax.Bundle;
  kind!: Syntax.Bundle;
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
export class CallBinding extends qb.Nobj {
  target!: qt.LeftExpression;
  thisArg!: qt.Expression;
}
export class CallExpression extends qb.LeftExpr implements qt.CallExpression {
  static readonly kind = Syntax.CallExpression;
  kind!: Syntax.CallExpression;
  expression: qt.LeftExpression;
  questionDotToken?: qt.QuestionDotToken;
  typeArgs?: qt.Nodes<qt.Typing>;
  args: qt.Nodes<qt.Expression>;
  constructor(e: qt.Expression, ts?: readonly qt.Typing[], es?: readonly qt.Expression[]) {
    super(true);
    this.expression = qf.nest.forAccess(e);
    this.typeArgs = Nodes.from(ts);
    this.args = qf.nest.listElems(new Nodes(es));
  }
  update(e: qt.Expression, ts: readonly qt.Typing[] | undefined, es: readonly qt.Expression[]): CallExpression {
    if (qf.is.optionalChain(this)) return super.update(e, this.questionDotToken, ts, es);
    return this.expression !== e || this.typeArgs !== ts || this.args !== es ? new CallExpression(e, ts, es).updateFrom(this) : this;
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
    return this.expression !== e || this.questionDotToken !== q || this.typeArgs !== ts || this.args !== es ? new CallChain(e, q, ts, es).updateFrom(this) : this;
  }
}
CallChain.prototype.kind = CallChain.kind;
export class CallSignatureDeclaration extends qb.SignatureDecl implements qt.CallSignatureDeclaration {
  static readonly kind = Syntax.CallSignature;
  kind!: Syntax.CallSignature;
  cache?: readonly qt.DocTag[];
  questionToken?: qt.QuestionToken;
  constructor(ts: readonly qt.TypeParamDeclaration[] | undefined, ps: readonly qt.ParamDeclaration[], t?: qt.Typing) {
    super(true, Syntax.CallSignature, ts, ps, t);
  }
  update(ts: qt.Nodes<qt.TypeParamDeclaration> | undefined, ps: qt.Nodes<qt.ParamDeclaration>, t?: qt.Typing) {
    return super.update(ts, ps, t);
  }
  _typeElemBrand: any;
}
CallSignatureDeclaration.prototype.kind = CallSignatureDeclaration.kind;
export class CaseBlock extends qb.Nobj implements qt.CaseBlock {
  static readonly kind = Syntax.CaseBlock;
  kind!: Syntax.CaseBlock;
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
export class CaseClause extends qb.Nobj implements qt.CaseClause {
  static readonly kind = Syntax.CaseClause;
  kind!: Syntax.CaseClause;
  parent?: qt.CaseBlock;
  expression: qt.Expression;
  statements: qt.Nodes<qt.Statement>;
  fallthroughFlowNode?: qt.FlowNode;
  constructor(e: qt.Expression, ss: readonly qt.Statement[]) {
    super(true);
    this.expression = qf.nest.expressionForList(e);
    this.statements = new Nodes(ss);
  }
  update(e: qt.Expression, ss: readonly qt.Statement[]) {
    return this.expression !== e || this.statements !== ss ? new CaseClause(e, ss).updateFrom(this) : this;
  }
}
CaseClause.prototype.kind = CaseClause.kind;
export class CatchClause extends qb.Nobj implements qt.CatchClause {
  static readonly kind = Syntax.CatchClause;
  kind!: Syntax.CatchClause;
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
  kind!: Syntax.ClassDeclaration;
  name?: qt.Identifier;
  cache?: readonly qt.DocTag[];
  constructor(
    ds: readonly qt.Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    name: string | qt.Identifier | undefined,
    ts: readonly qt.TypeParamDeclaration[] | undefined,
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
    ts: readonly qt.TypeParamDeclaration[] | undefined,
    hs: readonly qt.HeritageClause[] | undefined,
    es: readonly qt.ClassElem[]
  ) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== name || this.typeParams !== ts || this.heritageClauses !== hs || this.members !== es
      ? new ClassDeclaration(ds, ms, name, ts, hs, es).updateFrom(this)
      : this;
  }
  _statementBrand: any;
}
ClassDeclaration.prototype.kind = ClassDeclaration.kind;
qu.addMixins(ClassDeclaration, [qb.DeclarationStmt]);
export class ClassExpression extends qb.ClassLikeDecl implements qt.ClassExpression {
  static readonly kind = Syntax.ClassExpression;
  kind!: Syntax.ClassExpression;
  cache?: readonly qt.DocTag[];
  constructor(
    ms: readonly Modifier[] | undefined,
    name: string | qt.Identifier | undefined,
    ts: readonly qt.TypeParamDeclaration[] | undefined,
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
    ts: readonly qt.TypeParamDeclaration[] | undefined,
    hs: readonly qt.HeritageClause[] | undefined,
    es: readonly qt.ClassElem[]
  ) {
    return this.modifiers !== ms || this.name !== name || this.typeParams !== ts || this.heritageClauses !== hs || this.members !== es
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
  static readonly kind = Syntax.CommaListExpression;
  kind!: Syntax.CommaListExpression;
  elems: qt.Nodes<qt.Expression>;
  constructor(es: readonly qt.Expression[]) {
    super(true);
    const flatten = (e: qt.Expression): qt.Expression | readonly qt.Expression[] => {
      const n = e as qt.Node;
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
export class ComputedPropertyName extends qb.Nobj implements qt.ComputedPropertyName {
  static readonly kind = Syntax.ComputedPropertyName;
  kind!: Syntax.ComputedPropertyName;
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
  kind!: Syntax.ConditionalExpression;
  condition: qt.Expression;
  questionToken: qt.QuestionToken;
  whenTrue: qt.Expression;
  colonToken: qt.ColonToken;
  whenFalse: qt.Expression;
  constructor(c: qt.Expression, t: qt.Expression);
  constructor(c: qt.Expression, q: qt.QuestionToken, t: qt.Expression, s: qt.ColonToken, f: qt.Expression);
  constructor(c: qt.Expression, q: qt.QuestionToken | qt.Expression, t?: qt.Expression, s?: qt.ColonToken, f?: qt.Expression) {
    super(true);
    this.condition = qf.nest.forConditionalHead(c);
    this.questionToken = f ? q : new qb.Token(Syntax.QuestionToken);
    this.whenTrue = qf.nest.subexpressionOfConditionalExpression(f ? t : q);
    this.colonToken = f ? s! : new qb.Token(Syntax.ColonToken);
    this.whenFalse = qf.nest.subexpressionOfConditionalExpression(f ? f : q);
  }
  update(c: qt.Expression, q: qt.QuestionToken, t: qt.Expression, s: qt.ColonToken, f: qt.Expression): ConditionalExpression {
    return this.condition !== c || this.questionToken !== q || this.whenTrue !== t || this.colonToken !== s || this.whenFalse !== f ? new ConditionalExpression(c, q, t, s, f).updateFrom(this) : this;
  }
}
ConditionalExpression.prototype.kind = ConditionalExpression.kind;
export class ConditionalTyping extends qb.Tobj implements qt.ConditionalTyping {
  static readonly kind = Syntax.ConditionalTyping;
  kind!: Syntax.ConditionalTyping;
  checkType: qt.Typing;
  extendsType: qt.Typing;
  trueType: qt.Typing;
  falseType: qt.Typing;
  constructor(c: qt.Typing, e: qt.Typing, t: qt.Typing, f: qt.Typing) {
    super(true);
    this.checkType = qf.nest.conditionalTypeMember(c);
    this.extendsType = qf.nest.conditionalTypeMember(e);
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
  kind!: Syntax.Constructor;
  parent?: qt.ClassLikeDeclaration;
  body?: qt.FunctionBody;
  constructor(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly qt.ParamDeclaration[], b?: qt.Block) {
    super(true, Syntax.Constructor, undefined, ps);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.body = b;
  }
  update(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly qt.ParamDeclaration[], b?: qt.Block) {
    return this.decorators !== ds || this.modifiers !== ms || this.params !== ps || this.body !== b ? new ConstructorDeclaration(ds, ms, ps, b).updateFrom(this) : this;
  }
  _classElemBrand: any;
}
ConstructorDeclaration.prototype.kind = ConstructorDeclaration.kind;
qu.addMixins(ConstructorDeclaration, [qb.ClassElem, qb.DocContainer]);
export class ConstructorTyping extends qb.FunctionOrConstructorTobj implements qt.ConstructorTyping {
  static readonly kind = Syntax.ConstructorTyping;
  kind!: Syntax.ConstructorTyping;
  cache?: readonly qt.DocTag[];
  constructor(ts: readonly qt.TypeParamDeclaration[] | undefined, ps: readonly qt.ParamDeclaration[], t?: qt.Typing) {
    super(true, Syntax.ConstructorTyping, ts, ps, t);
  }
  update(ts: qt.Nodes<qt.TypeParamDeclaration> | undefined, ps: qt.Nodes<qt.ParamDeclaration>, t?: qt.Typing) {
    return super.update(ts, ps, t);
  }
  _typingBrand: any;
}
ConstructorTyping.prototype.kind = ConstructorTyping.kind;
export class ConstructSignatureDeclaration extends qb.SignatureDecl implements qt.ConstructSignatureDeclaration {
  static readonly kind = Syntax.ConstructSignature;
  kind!: Syntax.ConstructSignature;
  questionToken?: qt.QuestionToken;
  cache?: readonly qt.DocTag[];
  constructor(ts: readonly qt.TypeParamDeclaration[] | undefined, ps: readonly qt.ParamDeclaration[], t?: qt.Typing) {
    super(true, Syntax.ConstructSignature, ts, ps, t);
  }
  update(ts: qt.Nodes<qt.TypeParamDeclaration> | undefined, ps: qt.Nodes<qt.ParamDeclaration>, t?: qt.Typing) {
    return super.update(ts, ps, t);
  }
  _typeElemBrand: any;
}
ConstructSignatureDeclaration.prototype.kind = ConstructSignatureDeclaration.kind;
qu.addMixins(ConstructSignatureDeclaration, [qb.TypeElem]);
export class ContinueStatement extends qb.Stmt implements qt.ContinueStatement {
  static readonly kind = Syntax.ContinueStatement;
  kind!: Syntax.ContinueStatement;
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
  kind!: Syntax.DebuggerStatement;
  constructor() {
    super(true);
  }
}
DebuggerStatement.prototype.kind = DebuggerStatement.kind;
export class Decorator extends qb.Nobj implements qt.Decorator {
  static readonly kind = Syntax.Decorator;
  kind!: Syntax.Decorator;
  parent?: qt.NamedDecl;
  expression: qt.LeftExpression;
  constructor(e: qt.Expression) {
    super();
    this.expression = qf.nest.forAccess(e);
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new Decorator(e).updateFrom(this) : this;
  }
}
Decorator.prototype.kind = Decorator.kind;
export class DefaultClause extends qb.Nobj implements qt.DefaultClause {
  static readonly kind = Syntax.DefaultClause;
  kind!: Syntax.DefaultClause;
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
  kind!: Syntax.DeleteExpression;
  expression: qt.UnaryExpression;
  constructor(e: qt.Expression) {
    super(true);
    this.expression = qf.nest.prefixOperand(e);
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new DeleteExpression(e).updateFrom(this) : this;
  }
}
DeleteExpression.prototype.kind = DeleteExpression.kind;
export class Doc extends qb.Nobj implements qt.Doc {
  static readonly kind = Syntax.DocComment;
  kind!: Syntax.DocComment;
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
  kind!: Syntax.DocAllTyping;
}
DocAllTyping.prototype.kind = DocAllTyping.kind;
export class DocAugmentsTag extends qb.DocTag implements qt.DocAugmentsTag {
  static readonly kind = Syntax.DocAugmentsTag;
  kind!: Syntax.DocAugmentsTag;
  class: qt.ExpressionWithTypings & { expression: qt.Identifier | qt.PropertyAccessEntityNameExpression };
  constructor(c: qt.DocAugmentsTag['class'], s?: string) {
    super(Syntax.DocAugmentsTag, 'augments', s);
    this.class = c;
  }
}
DocAugmentsTag.prototype.kind = DocAugmentsTag.kind;
export class DocAuthorTag extends qb.DocTag implements qt.DocAuthorTag {
  static readonly kind = Syntax.DocAuthorTag;
  kind!: Syntax.DocAuthorTag;
  constructor(c?: string) {
    super(Syntax.DocAuthorTag, 'author', c);
  }
}
DocAuthorTag.prototype.kind = DocAuthorTag.kind;
export class DocCallbackTag extends qb.DocTag implements qt.DocCallbackTag {
  static readonly kind = Syntax.DocCallbackTag;
  kind!: Syntax.DocCallbackTag;
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
  kind!: Syntax.DocClassTag;
  constructor(c?: string) {
    super(Syntax.DocClassTag, 'class', c);
  }
}
DocClassTag.prototype.kind = DocClassTag.kind;
export class DocEnumTag extends qb.DocTag implements qt.DocEnumTag {
  static readonly kind = Syntax.DocEnumTag;
  kind!: Syntax.DocEnumTag;
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
  cache?: readonly qt.DocTag[];
  static readonly kind = Syntax.DocFunctionTyping;
  kind!: Syntax.DocFunctionTyping;
  _docTypeBrand: any;
  _typingBrand: any;
}
DocFunctionTyping.prototype.kind = DocFunctionTyping.kind;
qu.addMixins(DocFunctionTyping, [qb.DocTobj]);
export class DocImplementsTag extends qb.DocTag implements qt.DocImplementsTag {
  static readonly kind = Syntax.DocImplementsTag;
  kind!: Syntax.DocImplementsTag;
  class: qt.ExpressionWithTypings & { expression: qt.Identifier | qt.PropertyAccessEntityNameExpression };
  constructor(c: qt.DocImplementsTag['class'], s?: string) {
    super(Syntax.DocImplementsTag, 'implements', s);
    this.class = c;
  }
}
DocImplementsTag.prototype.kind = DocImplementsTag.kind;
export class DocNonNullableTyping extends qb.DocTobj implements qt.DocNonNullableTyping {
  static readonly kind = Syntax.DocNonNullableTyping;
  kind!: Syntax.DocNonNullableTyping;
  type!: qt.Typing;
}
DocNonNullableTyping.prototype.kind = DocNonNullableTyping.kind;
export class DocNullableTyping extends qb.DocTobj implements qt.DocNullableTyping {
  static readonly kind = Syntax.DocNullableTyping;
  kind!: Syntax.DocNullableTyping;
  type!: qt.Typing;
}
DocNullableTyping.prototype.kind = DocNullableTyping.kind;
export class DocOptionalTyping extends qb.DocTobj implements qt.DocOptionalTyping {
  static readonly kind = Syntax.DocOptionalTyping;
  kind!: Syntax.DocOptionalTyping;
  type!: qt.Typing;
}
DocOptionalTyping.prototype.kind = DocOptionalTyping.kind;
export class DocPropertyLikeTag extends qb.DocTag implements qt.DocPropertyLikeTag {
  parent?: qt.Doc;
  name: qt.EntityName;
  typeExpression?: qt.DocTypingExpression;
  isNameFirst: boolean;
  isBracketed: boolean;
  constructor(kind: Syntax, tagName: 'arg' | 'arg' | 'param', e: qt.DocTypingExpression | undefined, n: qt.EntityName, isNameFirst: boolean, isBracketed: boolean, c?: string) {
    super(kind, tagName, c);
    this.typeExpression = e;
    this.name = n;
    this.isNameFirst = isNameFirst;
    this.isBracketed = isBracketed;
  }
  _declarationBrand: any;
}
qu.addMixins(DocPropertyLikeTag, [qb.Decl]);
export class DocParamTag extends DocPropertyLikeTag implements qt.DocParamTag {
  static readonly kind = Syntax.DocParamTag;
  kind!: Syntax.DocParamTag;
  constructor(e: qt.DocTypingExpression | undefined, n: qt.EntityName, isNameFirst: boolean, isBracketed: boolean, c?: string) {
    super(Syntax.DocParamTag, 'param', e, n, isNameFirst, isBracketed, c);
  }
}
DocParamTag.prototype.kind = DocParamTag.kind;
export class DocPrivateTag extends qb.DocTag implements qt.DocPrivateTag {
  static readonly kind = Syntax.DocPrivateTag;
  kind!: Syntax.DocPrivateTag;
  constructor() {
    super(Syntax.DocPrivateTag, 'private');
  }
}
DocPrivateTag.prototype.kind = DocPrivateTag.kind;
export class DocPropertyTag extends DocPropertyLikeTag implements qt.DocPropertyTag {
  static readonly kind = Syntax.DocPropertyTag;
  kind!: Syntax.DocPropertyTag;
  constructor(e: qt.DocTypingExpression | undefined, n: qt.EntityName, isNameFirst: boolean, isBracketed: boolean, c?: string) {
    super(Syntax.DocPropertyTag, 'param', e, n, isNameFirst, isBracketed, c);
  }
}
DocPropertyTag.prototype.kind = DocPropertyTag.kind;
export class DocProtectedTag extends qb.DocTag implements qt.DocProtectedTag {
  static readonly kind = Syntax.DocProtectedTag;
  kind!: Syntax.DocProtectedTag;
  constructor() {
    super(Syntax.DocProtectedTag, 'protected');
  }
}
DocProtectedTag.prototype.kind = DocProtectedTag.kind;
export class DocPublicTag extends qb.DocTag implements qt.DocPublicTag {
  static readonly kind = Syntax.DocPublicTag;
  kind!: Syntax.DocPublicTag;
  constructor() {
    super(Syntax.DocPublicTag, 'public');
  }
}
DocPublicTag.prototype.kind = DocPublicTag.kind;
export class DocReadonlyTag extends qb.DocTag implements qt.DocReadonlyTag {
  static readonly kind = Syntax.DocReadonlyTag;
  kind!: Syntax.DocReadonlyTag;
  constructor() {
    super(Syntax.DocReadonlyTag, 'readonly');
  }
}
DocReadonlyTag.prototype.kind = DocReadonlyTag.kind;
export class DocReturnTag extends qb.DocTag implements qt.DocReturnTag {
  static readonly kind = Syntax.DocReturnTag;
  kind!: Syntax.DocReturnTag;
  typeExpression?: qt.DocTypingExpression;
  constructor(e?: qt.DocTypingExpression, c?: string) {
    super(Syntax.DocReturnTag, 'returns', c);
    this.typeExpression = e;
  }
}
DocReturnTag.prototype.kind = DocReturnTag.kind;
export class DocSignature extends qb.DocTobj implements qt.DocSignature {
  static readonly kind = Syntax.DocSignature;
  kind!: Syntax.DocSignature;
  typeParams?: readonly qt.DocTemplateTag[];
  params: readonly qt.DocParamTag[];
  type?: qt.DocReturnTag;
  constructor(ts: readonly qt.DocTemplateTag[] | undefined, ps: readonly qt.DocParamTag[], t?: qt.DocReturnTag) {
    super(true);
    this.typeParams = ts;
    this.params = ps;
    this.type = t;
  }
  _declarationBrand: any;
}
DocSignature.prototype.kind = DocSignature.kind;
qu.addMixins(DocSignature, [qb.Decl]);
export class DocTemplateTag extends qb.DocTag implements qt.DocTemplateTag {
  static readonly kind = Syntax.DocTemplateTag;
  kind!: Syntax.DocTemplateTag;
  constraint?: qt.DocTypingExpression;
  typeParams: qt.Nodes<qt.TypeParamDeclaration>;
  constructor(c: qt.DocTypingExpression | undefined, ts: readonly qt.TypeParamDeclaration[], s?: string) {
    super(Syntax.DocTemplateTag, 'template', s);
    this.constraint = c;
    this.typeParams = Nodes.from(ts);
  }
}
DocTemplateTag.prototype.kind = DocTemplateTag.kind;
export class DocThisTag extends qb.DocTag implements qt.DocThisTag {
  static readonly kind = Syntax.DocThisTag;
  kind!: Syntax.DocThisTag;
  typeExpression?: qt.DocTypingExpression;
  constructor(e?: qt.DocTypingExpression) {
    super(Syntax.DocThisTag, 'this');
    this.typeExpression = e;
  }
}
DocThisTag.prototype.kind = DocThisTag.kind;
export class DocTypedefTag extends qb.DocTag implements qt.DocTypedefTag {
  static readonly kind = Syntax.DocTypedefTag;
  kind!: Syntax.DocTypedefTag;
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
  kind!: Syntax.DocTypingExpression;
  type: qt.Typing;
  constructor(t: qt.Typing) {
    super(true);
    this.type = t;
  }
}
DocTypingExpression.prototype.kind = DocTypingExpression.kind;
export class DocTypingLiteral extends qb.DocTobj implements qt.DocTypingLiteral {
  static readonly kind = Syntax.DocTypingLiteral;
  kind!: Syntax.DocTypingLiteral;
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
  kind!: Syntax.DocTypeTag;
  typeExpression: qt.DocTypingExpression;
  constructor(e: qt.DocTypingExpression, c?: string) {
    super(Syntax.DocTypeTag, 'type', c);
    this.typeExpression = e;
  }
}
DocTypeTag.prototype.kind = DocTypeTag.kind;
export class DocUnknownTyping extends qb.DocTobj implements qt.DocUnknownTyping {
  static readonly kind = Syntax.DocUnknownTyping;
  kind!: Syntax.DocUnknownTyping;
}
DocUnknownTyping.prototype.kind = DocUnknownTyping.kind;
export class DocVariadicTyping extends qb.DocTobj implements qt.DocVariadicTyping {
  static readonly kind = Syntax.DocVariadicTyping;
  kind!: Syntax.DocVariadicTyping;
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
  kind!: Syntax.JsxAttribute;
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
  kind!: Syntax.DoStatement;
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
  kind!: Syntax.ElemAccessExpression;
  expression: qt.LeftExpression;
  questionDotToken?: qt.QuestionDotToken;
  argExpression: qt.Expression;
  constructor(e: qt.Expression, i: number | qt.Expression) {
    super(true);
    this.expression = qf.nest.forAccess(e);
    this.argExpression = asExpression(i);
  }
  update(e: qt.Expression, a: qt.Expression): ElemAccessExpression {
    if (qf.is.optionalChain(this)) return super.update(e, a, this.questionDotToken);
    return this.expression !== e || this.argExpression !== a ? new ElemAccessExpression(e, a).updateFrom(this) : this;
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
    return this.expression !== e || this.questionDotToken !== q || this.argExpression !== a ? new ElemAccessChain(e, q, a).updateFrom(this) : this;
  }
}
ElemAccessChain.prototype.kind = ElemAccessChain.kind;
export class EmptyStatement extends qb.Stmt implements qt.EmptyStatement {
  static readonly kind = Syntax.EmptyStatement;
  kind!: Syntax.EmptyStatement;
}
EmptyStatement.prototype.kind = EmptyStatement.kind;
export class EndOfDeclarationMarker extends qb.Stmt implements qt.EndOfDeclarationMarker {
  static readonly kind = Syntax.EndOfDeclarationMarker;
  kind!: Syntax.EndOfDeclarationMarker;
  constructor(o: qt.Node) {
    super();
    this.emitNode = {} as qt.EmitNode;
    this.original = o;
  }
}
EndOfDeclarationMarker.prototype.kind = EndOfDeclarationMarker.kind;
export class EnumDeclaration extends qb.DeclarationStmt implements qt.EnumDeclaration {
  static readonly kind = Syntax.EnumDeclaration;
  kind!: Syntax.EnumDeclaration;
  name: qt.Identifier;
  members: qt.Nodes<qt.EnumMember>;
  constructor(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, n: string | qt.Identifier, es: readonly qt.EnumMember[]) {
    super();
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(n);
    this.members = new Nodes(es);
  }
  cache?: readonly qt.DocTag[] | undefined;
  update(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, n: qt.Identifier, es: readonly qt.EnumMember[]) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== n || this.members !== es ? new EnumDeclaration(ds, ms, n, es).updateFrom(this) : this;
  }
  _statementBrand: any;
}
EnumDeclaration.prototype.kind = EnumDeclaration.kind;
qu.addMixins(EnumDeclaration, [qb.DocContainer]);
export class EnumMember extends qb.NamedDecl implements qt.EnumMember {
  static readonly kind = Syntax.EnumMember;
  kind!: Syntax.EnumMember;
  parent?: EnumDeclaration;
  name: qt.PropertyName;
  initer?: qt.Expression;
  constructor(n: string | qt.PropertyName, i?: qt.Expression) {
    super();
    this.name = asName(n);
    this.initer = i && qf.nest.expressionForList(i);
  }
  updateEnumMember(n: qt.PropertyName, i?: qt.Expression) {
    return this.name !== n || this.initer !== i ? new EnumMember(n, i).updateFrom(this) : this;
  }
}
EnumMember.prototype.kind = EnumMember.kind;
qu.addMixins(EnumMember, [qb.DocContainer]);
export class ExportAssignment extends qb.DeclarationStmt implements qt.ExportAssignment {
  static readonly kind = Syntax.ExportAssignment;
  kind!: Syntax.ExportAssignment;
  parent?: qt.SourceFile;
  isExportEquals?: boolean;
  expression: qt.Expression;
  constructor(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, eq: boolean | undefined, e: qt.Expression) {
    super();
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.isExportEquals = eq;
    this.expression = eq ? qf.nest.binaryOperand(Syntax.EqualsToken, e, false, undefined) : qf.nest.defaultExpression(e);
  }
  update(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, e: qt.Expression) {
    return this.decorators !== ds || this.modifiers !== ms || this.expression !== e ? new ExportAssignment(ds, ms, this.isExportEquals, e).updateFrom(this) : this;
  }
}
ExportAssignment.prototype.kind = ExportAssignment.kind;
export class ExportDeclaration extends qb.DeclarationStmt implements qt.ExportDeclaration {
  static readonly kind = Syntax.ExportDeclaration;
  kind!: Syntax.ExportDeclaration;
  parent?: qt.SourceFile | qt.ModuleBlock;
  isTypeOnly: boolean;
  exportClause?: qt.NamedExportBindings;
  moduleSpecifier?: qt.Expression;
  cache?: readonly qt.DocTag[];
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
  kind!: Syntax.ExportSpecifier;
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
  kind!: Syntax.ExpressionStatement;
  expression: qt.Expression;
  constructor(e: qt.Expression) {
    super(true);
    this.expression = qf.nest.expressionForExpressionStatement(e);
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new ExpressionStatement(e).updateFrom(this) : this;
  }
}
ExpressionStatement.prototype.kind = ExpressionStatement.kind;
qu.addMixins(ExpressionStatement, [qb.DocContainer]);
export class ExpressionWithTypings extends qb.WithArgsTobj implements qt.ExpressionWithTypings {
  static readonly kind = Syntax.ExpressionWithTypings;
  kind!: Syntax.ExpressionWithTypings;
  parent?: qt.HeritageClause | qt.DocAugmentsTag | qt.DocImplementsTag;
  expression: qt.LeftExpression;
  constructor(ts: readonly qt.Typing[] | undefined, e: qt.Expression) {
    super(true);
    this.expression = qf.nest.forAccess(e);
    this.typeArgs = Nodes.from(ts);
  }
  update(ts: readonly qt.Typing[] | undefined, e: qt.Expression) {
    return this.typeArgs !== ts || this.expression !== e ? new ExpressionWithTypings(ts, e).updateFrom(this) : this;
  }
}
ExpressionWithTypings.prototype.kind = ExpressionWithTypings.kind;
export class ExternalModuleReference extends qb.Nobj implements qt.ExternalModuleReference {
  static readonly kind = Syntax.ExternalModuleReference;
  kind!: Syntax.ExternalModuleReference;
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
  kind!: Syntax.ForInStatement;
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
  kind!: Syntax.ForOfStatement;
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
  kind!: Syntax.ForStatement;
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
  kind!: Syntax.FunctionDeclaration;
  name?: qt.Identifier;
  body?: qt.FunctionBody;
  constructor(
    ds: readonly qt.Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    a: qt.AsteriskToken | undefined,
    name: string | qt.Identifier | undefined,
    ts: readonly qt.TypeParamDeclaration[] | undefined,
    ps: readonly qt.ParamDeclaration[],
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
    ts: readonly qt.TypeParamDeclaration[] | undefined,
    ps: readonly qt.ParamDeclaration[],
    t?: qt.Typing,
    b?: qt.Block
  ) {
    return this.decorators !== ds || this.modifiers !== ms || this.asteriskToken !== a || this.name !== name || this.typeParams !== ts || this.params !== ps || this.type !== t || this.body !== b
      ? new FunctionDeclaration(ds, ms, a, name, ts, ps, t, b).updateFrom(this)
      : this;
  }
  _statementBrand: any;
}
FunctionDeclaration.prototype.kind = FunctionDeclaration.kind;
qu.addMixins(FunctionDeclaration, [qb.DeclarationStmt]);
export class FunctionExpression extends qb.FunctionLikeDecl implements qt.FunctionExpression {
  static readonly kind = Syntax.FunctionExpression;
  kind!: Syntax.FunctionExpression;
  name?: qt.Identifier;
  body: qt.FunctionBody;
  constructor(
    ms: readonly Modifier[] | undefined,
    a: qt.AsteriskToken | undefined,
    name: string | qt.Identifier | undefined,
    ts: readonly qt.TypeParamDeclaration[] | undefined,
    ps: readonly qt.ParamDeclaration[] | undefined,
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
    ts: readonly qt.TypeParamDeclaration[] | undefined,
    ps: readonly qt.ParamDeclaration[],
    t: qt.Typing | undefined,
    b: qt.Block
  ) {
    return this.name !== name || this.modifiers !== ms || this.asteriskToken !== a || this.typeParams !== ts || this.params !== ps || this.type !== t || this.body !== b
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
  kind!: Syntax.FunctionTyping;
  cache?: readonly qt.DocTag[];
  constructor(ts: readonly qt.TypeParamDeclaration[] | undefined, ps: readonly qt.ParamDeclaration[], t?: qt.Typing) {
    super(true, Syntax.FunctionTyping, ts, ps, t);
  }
  update(ts: qt.Nodes<qt.TypeParamDeclaration> | undefined, ps: qt.Nodes<qt.ParamDeclaration>, t?: qt.Typing) {
    return super.update(ts, ps, t);
  }
  _typingBrand: any;
}
FunctionTyping.prototype.kind = FunctionTyping.kind;
export class GetAccessorDeclaration extends qb.FunctionLikeDecl implements qt.GetAccessorDeclaration {
  static readonly kind = Syntax.GetAccessor;
  kind!: Syntax.GetAccessor;
  parent?: qt.ClassLikeDeclaration | ObjectLiteralExpression;
  name: qt.PropertyName;
  body?: qt.FunctionBody;
  asteriskToken?: qt.AsteriskToken;
  questionToken?: qt.QuestionToken;
  exclamationToken?: qt.ExclamationToken;
  endFlowNode?: qt.FlowStart | qt.FlowLabel | qt.FlowAssignment | qt.FlowCall | qt.FlowCondition | qt.FlowSwitchClause | qt.FlowArrayMutation | qt.FlowReduceLabel;
  returnFlowNode?: qt.FlowStart | qt.FlowLabel | qt.FlowAssignment | qt.FlowCall | qt.FlowCondition | qt.FlowSwitchClause | qt.FlowArrayMutation | qt.FlowReduceLabel;
  cache?: readonly qt.DocTag[];
  constructor(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | qt.PropertyName, ps: readonly qt.ParamDeclaration[], t?: qt.Typing, b?: qt.Block) {
    super(true, Syntax.GetAccessor, undefined, ps, t);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(p);
    this.body = b;
  }
  update(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: qt.PropertyName, ps: readonly qt.ParamDeclaration[], t?: qt.Typing, b?: qt.Block) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== p || this.params !== ps || this.type !== t || this.body !== b
      ? new GetAccessorDeclaration(ds, ms, p, ps, t, b).updateFrom(this)
      : this;
  }
  _functionLikeDeclarationBrand: any;
  _classElemBrand: any;
  _objectLiteralBrand: any;
}
GetAccessorDeclaration.prototype.kind = GetAccessorDeclaration.kind;
qu.addMixins(GetAccessorDeclaration, [qb.ClassElem, qb.ObjectLiteralElem, qb.DocContainer]);
export class HeritageClause extends qb.Nobj implements qt.HeritageClause {
  static readonly kind = Syntax.HeritageClause;
  kind!: Syntax.HeritageClause;
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
  kind!: Syntax.Identifier;
  escapedText!: qu.__String;
  autoGenerateFlags = qt.GeneratedIdentifierFlags.None;
  typeArgs?: qt.Nodes<qt.Typing | qt.TypeParamDeclaration>;
  flowNode = undefined;
  originalKeywordKind?: Syntax;
  autoGenerateId = 0;
  isInDocNamespace?: boolean;
  jsdocDotPos?: number;
  constructor(t: string);
  constructor(t: string, typeArgs: readonly (qt.Typing | qt.TypeParamDeclaration)[] | undefined);
  constructor(t: string, typeArgs?: readonly (qt.Typing | qt.TypeParamDeclaration)[]) {
    super();
    this.escapedText = qy.get.escUnderscores(t);
    this.originalKeywordKind = t ? qy.fromString(t) : Syntax.Unknown;
    if (typeArgs) {
      this.typeArgs = new Nodes(typeArgs as readonly qt.Typing[]);
    }
  }
  get text(): string {
    return qb.idText(this);
  }
  update(ts?: qt.Nodes<qt.Typing | qt.TypeParamDeclaration>) {
    return this.typeArgs !== ts ? new Identifier(this.text, ts).updateFrom(this) : this;
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
  kind!: Syntax.IfStatement;
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
  kind!: Syntax.ImportClause;
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
  kind!: Syntax.ImportDeclaration;
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
  kind!: Syntax.ImportEqualsDeclaration;
  parent?: qt.SourceFile | qt.ModuleBlock;
  name: qt.Identifier;
  moduleReference: qt.ModuleReference;
  cache?: readonly qt.DocTag[] | undefined;
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
  kind!: Syntax.ImportSpecifier;
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
export class ImportTyping extends qb.WithArgsTobj implements qt.ImportTyping {
  static readonly kind = Syntax.ImportTyping;
  kind!: Syntax.ImportTyping;
  isTypeOf?: boolean;
  arg: qt.Typing;
  qualifier?: qt.EntityName;
  constructor(a: qt.Typing, q?: qt.EntityName, ts?: readonly qt.Typing[], tof?: boolean) {
    super(true);
    this.arg = a;
    this.qualifier = q;
    this.typeArgs = qf.nest.typeParams(ts);
    this.isTypeOf = tof;
  }
  update(a: qt.Typing, q?: qt.EntityName, ts?: readonly qt.Typing[], tof?: boolean) {
    return this.arg !== a || this.qualifier !== q || this.typeArgs !== ts || this.isTypeOf !== tof ? new ImportTyping(a, q, ts, tof).updateFrom(this) : this;
  }
}
ImportTyping.prototype.kind = ImportTyping.kind;
export class IndexedAccessTyping extends qb.Tobj implements qt.IndexedAccessTyping {
  static readonly kind = Syntax.IndexedAccessTyping;
  kind!: Syntax.IndexedAccessTyping;
  objectType: qt.Typing;
  indexType: qt.Typing;
  constructor(o: qt.Typing, i: qt.Typing) {
    super(true);
    this.objectType = qf.nest.elemTypeMember(o);
    this.indexType = i;
  }
  update(o: qt.Typing, i: qt.Typing) {
    return this.objectType !== o || this.indexType !== i ? new IndexedAccessTyping(o, i).updateFrom(this) : this;
  }
}
IndexedAccessTyping.prototype.kind = IndexedAccessTyping.kind;
export class IndexSignatureDeclaration extends qb.SignatureDecl implements qt.IndexSignatureDeclaration {
  static readonly kind = Syntax.IndexSignature;
  kind!: Syntax.IndexSignature;
  parent?: qt.ObjectTypeDeclaration;
  questionToken?: qt.QuestionToken;
  cache?: readonly qt.DocTag[];
  constructor(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly qt.ParamDeclaration[], t: qt.Typing) {
    super(true, Syntax.IndexSignature, undefined, ps, t);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
  }
  update(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly qt.ParamDeclaration[], t: qt.Typing) {
    return this.params !== ps || this.type !== t || this.decorators !== ds || this.modifiers !== ms ? new IndexSignatureDeclaration(ds, ms, ps, t).updateFrom(this) : this;
  }
  _classElemBrand: any;
  _typeElemBrand: any;
}
IndexSignatureDeclaration.prototype.kind = IndexSignatureDeclaration.kind;
qu.addMixins(IndexSignatureDeclaration, [qb.ClassElem, qb.TypeElem]);
export class InferTyping extends qb.Tobj implements qt.InferTyping {
  static readonly kind = Syntax.InferTyping;
  kind!: Syntax.InferTyping;
  typeParam: qt.TypeParamDeclaration;
  constructor(p: qt.TypeParamDeclaration) {
    super(true);
    this.typeParam = p;
  }
  update(p: qt.TypeParamDeclaration) {
    return this.typeParam !== p ? new InferTyping(p).updateFrom(this) : this;
  }
}
InferTyping.prototype.kind = InferTyping.kind;
export class InputFiles extends qb.Nobj implements qt.InputFiles {
  static readonly kind = Syntax.InputFiles;
  kind!: Syntax.InputFiles;
  javascriptPath?: string;
  javascriptText!: string;
  javascriptMapPath?: string;
  javascriptMapText?: string;
  declarationPath?: string;
  declarationText!: string;
  declarationMapPath?: string;
  declarationMapText?: string;
  buildInfoPath?: string;
  buildInfo?: qt.BuildInfo;
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
    buildInfo?: qt.BuildInfo,
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
    buildInfo?: qt.BuildInfo,
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
      let buildInfo: qt.BuildInfo | false;
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
  kind!: Syntax.InterfaceDeclaration;
  name: qt.Identifier;
  typeParams?: qt.Nodes<qt.TypeParamDeclaration>;
  heritageClauses?: qt.Nodes<qt.HeritageClause>;
  members: qt.Nodes<qt.TypeElem>;
  cache?: readonly qt.DocTag[] | undefined;
  constructor(
    ds: readonly qt.Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    name: string | qt.Identifier,
    ts: readonly qt.TypeParamDeclaration[] | undefined,
    hs: readonly qt.HeritageClause[] | undefined,
    members: readonly qt.TypeElem[]
  ) {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(name);
    this.typeParams = Nodes.from(ts);
    this.heritageClauses = Nodes.from(hs);
    this.members = new Nodes(members);
  }
  update(
    ds: readonly qt.Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    name: qt.Identifier,
    ts: readonly qt.TypeParamDeclaration[] | undefined,
    hs: readonly qt.HeritageClause[] | undefined,
    members: readonly qt.TypeElem[]
  ) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== name || this.typeParams !== ts || this.heritageClauses !== hs || this.members !== members
      ? new InterfaceDeclaration(ds, ms, name, ts, hs, members).updateFrom(this)
      : this;
  }
  _statementBrand: any;
}
InterfaceDeclaration.prototype.kind = InterfaceDeclaration.kind;
qu.addMixins(InterfaceDeclaration, [qb.DocContainer]);
export abstract class UnionOrIntersectionTyping extends qb.Tobj implements qt.UnionOrIntersectionType {
  types: qt.Nodes<qt.Typing>;
  objectFlags: qt.ObjectFlags;
  propertyCache: qb.SymbolTable;
  resolvedProperties: qb.Symbol[];
  resolvedIndexType: qt.IndexType;
  resolvedStringIndexType: qt.IndexType;
  resolvedBaseConstraint: qb.Type;
  constructor(k: Syntax.UnionTyping | Syntax.IntersectionTyping, ts: readonly qt.Typing[]) {
    super(true, k);
    this.types = qf.nest.elemTypeMembers(ts);
  }
  update(ts: qt.Nodes<qt.Typing>) {
    return this.types !== ts ? new UnionOrIntersectionTyping(this.kind, ts).updateFrom(this) : this;
  }
}
export class IntersectionTyping extends UnionOrIntersectionTyping implements qt.IntersectionTyping {
  static readonly kind = Syntax.IntersectionTyping;
  kind!: Syntax.IntersectionTyping;
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
  kind!: Syntax.JsxAttributes;
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
export class JsxClosingElem extends qb.Nobj implements qt.JsxClosingElem {
  static readonly kind = Syntax.JsxClosingElem;
  kind!: Syntax.JsxClosingElem;
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
  kind!: Syntax.JsxClosingFragment;
  parent?: qt.JsxFragment;
  constructor() {
    super(true);
  }
}
JsxClosingFragment.prototype.kind = JsxClosingFragment.kind;
export class JsxElem extends qb.PrimaryExpr implements qt.JsxElem {
  static readonly kind = Syntax.JsxElem;
  kind!: Syntax.JsxElem;
  opening: qt.JsxOpeningElem;
  children: qt.Nodes<qt.JsxChild>;
  closing: qt.JsxClosingElem;
  constructor(o: qt.JsxOpeningElem, cs: readonly qt.JsxChild[], c: qt.JsxClosingElem) {
    super(true);
    this.opening = o;
    this.children = new Nodes(cs);
    this.closing = c;
  }
  update(o: qt.JsxOpeningElem, cs: readonly qt.JsxChild[], c: qt.JsxClosingElem) {
    return this.opening !== o || this.children !== cs || this.closing !== c ? new JsxElem(o, cs, c).updateFrom(this) : this;
  }
}
JsxElem.prototype.kind = JsxElem.kind;
export class JsxExpression extends qb.Expr implements qt.JsxExpression {
  static readonly kind = Syntax.JsxExpression;
  kind!: Syntax.JsxExpression;
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
  kind!: Syntax.JsxFragment;
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
  kind!: Syntax.JsxOpeningElem;
  parent?: qt.JsxElem;
  tagName: qt.JsxTagNameExpression;
  typeArgs?: qt.Nodes<qt.Typing>;
  attributes: qt.JsxAttributes;
  constructor(e: qt.JsxTagNameExpression, ts: readonly qt.Typing[] | undefined, a: qt.JsxAttributes) {
    super(true);
    this.tagName = e;
    this.typeArgs = Nodes.from(ts);
    this.attributes = a;
  }
  update(e: qt.JsxTagNameExpression, ts: readonly qt.Typing[] | undefined, s: qt.JsxAttributes) {
    return this.tagName !== e || this.typeArgs !== ts || this.attributes !== s ? new JsxOpeningElem(e, ts, s).updateFrom(this) : this;
  }
}
JsxOpeningElem.prototype.kind = JsxOpeningElem.kind;
export class JsxOpeningFragment extends qb.Expr implements qt.JsxOpeningFragment {
  static readonly kind = Syntax.JsxOpeningFragment;
  kind!: Syntax.JsxOpeningFragment;
  parent?: qt.JsxFragment;
  constructor() {
    super(true);
  }
}
JsxOpeningFragment.prototype.kind = JsxOpeningFragment.kind;
export class JsxSelfClosingElem extends qb.PrimaryExpr implements qt.JsxSelfClosingElem {
  static readonly kind = Syntax.JsxSelfClosingElem;
  kind!: Syntax.JsxSelfClosingElem;
  tagName: qt.JsxTagNameExpression;
  typeArgs?: qt.Nodes<qt.Typing>;
  attributes: qt.JsxAttributes;
  constructor(e: qt.JsxTagNameExpression, ts: readonly qt.Typing[] | undefined, a: qt.JsxAttributes) {
    super(true);
    this.tagName = e;
    this.typeArgs = Nodes.from(ts);
    this.attributes = a;
  }
  update(e: qt.JsxTagNameExpression, ts: readonly qt.Typing[] | undefined, a: qt.JsxAttributes) {
    return this.tagName !== e || this.typeArgs !== ts || this.attributes !== a ? new JsxSelfClosingElem(e, ts, a).updateFrom(this) : this;
  }
}
JsxSelfClosingElem.prototype.kind = JsxSelfClosingElem.kind;
export class JsxSpreadAttribute extends qb.ObjectLiteralElem implements qt.JsxSpreadAttribute {
  static readonly kind = Syntax.JsxSpreadAttribute;
  kind!: Syntax.JsxSpreadAttribute;
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
  kind!: Syntax.JsxText;
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
  kind!: Syntax.LabeledStatement;
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
  kind!: Syntax.LiteralTyping;
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
  kind!: Syntax.MappedTyping;
  readonlyToken?: qt.ReadonlyToken | qt.PlusToken | qt.MinusToken;
  typeParam: qt.TypeParamDeclaration;
  questionToken?: qt.QuestionToken | qt.PlusToken | qt.MinusToken;
  type?: qt.Typing;
  constructor(r: qt.ReadonlyToken | qt.PlusToken | qt.MinusToken | undefined, p: qt.TypeParamDeclaration, q?: qt.QuestionToken | qt.PlusToken | qt.MinusToken, t?: qt.Typing) {
    super(true);
    this.readonlyToken = r;
    this.typeParam = p;
    this.questionToken = q;
    this.type = t;
  }
  update(r: qt.ReadonlyToken | qt.PlusToken | qt.MinusToken | undefined, p: qt.TypeParamDeclaration, q?: qt.QuestionToken | qt.PlusToken | qt.MinusToken, t?: qt.Typing) {
    return this.readonlyToken !== r || this.typeParam !== p || this.questionToken !== q || this.type !== t ? new MappedTyping(r, p, q, t).updateFrom(this) : this;
  }
  _declarationBrand: any;
}
MappedTyping.prototype.kind = MappedTyping.kind;
qu.addMixins(MappedTyping, [qb.Decl]);
export class MergeDeclarationMarker extends qb.Stmt implements qt.MergeDeclarationMarker {
  static readonly kind = Syntax.MergeDeclarationMarker;
  kind!: Syntax.MergeDeclarationMarker;
  constructor(o: qt.Node) {
    super(true);
    this.emitNode = {} as qt.EmitNode;
    this.original = o;
  }
}
MergeDeclarationMarker.prototype.kind = MergeDeclarationMarker.kind;
export class MetaProperty extends qb.PrimaryExpr implements qt.MetaProperty {
  static readonly kind = Syntax.MetaProperty;
  kind!: Syntax.MetaProperty;
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
  kind!: Syntax.MethodDeclaration;
  parent?: qt.ClassLikeDeclaration | qt.ObjectLiteralExpression;
  name: qt.PropertyName;
  body?: qt.FunctionBody;
  constructor(
    ds: readonly qt.Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    a: qt.AsteriskToken | undefined,
    p: string | qt.PropertyName,
    q: qt.QuestionToken | undefined,
    ts: readonly qt.TypeParamDeclaration[] | undefined,
    ps: readonly qt.ParamDeclaration[],
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
    ts: readonly qt.TypeParamDeclaration[] | undefined,
    ps: readonly qt.ParamDeclaration[],
    t?: qt.Typing,
    b?: qt.Block
  ) {
    return this.decorators !== ds ||
      this.modifiers !== ms ||
      this.asteriskToken !== a ||
      this.name !== p ||
      this.questionToken !== q ||
      this.typeParams !== ts ||
      this.params !== ps ||
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
  kind!: Syntax.MethodSignature;
  parent?: qt.ObjectTypeDeclaration;
  name: qt.PropertyName;
  questionToken?: qt.QuestionToken;
  cache?: readonly qt.DocTag[];
  constructor(ts: readonly qt.TypeParamDeclaration[] | undefined, ps: readonly qt.ParamDeclaration[], t: qt.Typing | undefined, p: string | qt.PropertyName, q?: qt.QuestionToken) {
    super(false, Syntax.MethodSignature, ts, ps, t);
    this.name = asName(p);
    this.questionToken = q;
  }
  update(ts: qt.Nodes<qt.TypeParamDeclaration> | undefined, ps: qt.Nodes<qt.ParamDeclaration>, t: qt.Typing | undefined, p: qt.PropertyName, q?: qt.QuestionToken) {
    return this.typeParams !== ts || this.params !== ps || this.type !== t || this.name !== p || this.questionToken !== q ? new MethodSignature(ts, ps, t, p, q).updateFrom(this) : this;
  }
  _typeElemBrand: any;
}
MethodSignature.prototype.kind = MethodSignature.kind;
qu.addMixins(MethodSignature, [qb.TypeElem]);
export class MissingDeclaration extends qb.DeclarationStmt implements qt.MissingDeclaration {
  static readonly kind = Syntax.MissingDeclaration;
  kind!: Syntax.MissingDeclaration;
  name?: qt.Identifier;
  _statementBrand: any;
}
MissingDeclaration.prototype.kind = MissingDeclaration.kind;
export class ModuleBlock extends qb.Stmt implements qt.ModuleBlock {
  static readonly kind = Syntax.ModuleBlock;
  kind!: Syntax.ModuleBlock;
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
  kind!: Syntax.ModuleDeclaration;
  parent?: qt.ModuleBody | qt.SourceFile;
  name: qt.ModuleName;
  body?: qt.ModuleBody | qt.DocNamespaceDeclaration;
  cache?: readonly qt.DocTag[] | undefined;
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
export class NamedExports extends qb.Nobj implements qt.NamedExports {
  static readonly kind = Syntax.NamedExports;
  kind!: Syntax.NamedExports;
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
export class NamedImports extends qb.Nobj implements qt.NamedImports {
  static readonly kind = Syntax.NamedImports;
  kind!: Syntax.NamedImports;
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
  kind!: Syntax.NamedTupleMember;
  dot3Token?: qt.Dot3Token;
  name: qt.Identifier;
  questionToken?: qt.QuestionToken;
  type: qt.Typing;
  cache?: readonly qt.DocTag[];
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
  kind!: Syntax.NamespaceExport;
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
  kind!: Syntax.NamespaceExportDeclaration;
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
  kind!: Syntax.NamespaceImport;
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
  kind!: Syntax.NewExpression;
  expression: qt.LeftExpression;
  typeArgs?: qt.Nodes<qt.Typing>;
  args?: qt.Nodes<qt.Expression>;
  constructor(e: qt.Expression, ts?: readonly qt.Typing[], a?: readonly qt.Expression[]) {
    super(true);
    this.expression = qf.nest.forNew(e);
    this.typeArgs = Nodes.from(ts);
    this.args = a ? qf.nest.listElems(new Nodes(a)) : undefined;
  }
  update(e: qt.Expression, ts?: readonly qt.Typing[], a?: readonly qt.Expression[]) {
    return this.expression !== e || this.typeArgs !== ts || this.args !== a ? new NewExpression(e, ts, a).updateFrom(this) : this;
  }
  _declarationBrand: any;
}
NewExpression.prototype.kind = NewExpression.kind;
qu.addMixins(NewExpression, [qb.Decl]);
export class NonNullExpression extends qb.LeftExpr implements qt.NonNullExpression {
  static readonly kind = Syntax.NonNullExpression;
  kind!: Syntax.NonNullExpression;
  expression: qt.Expression;
  constructor(e: qt.Expression) {
    super(true);
    this.expression = qf.nest.forAccess(e);
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
export class NoSubstitutionLiteral extends qb.TemplateLiteralLikeNode implements qt.NoSubstitutionLiteral {
  static readonly kind = Syntax.NoSubstitutionLiteral;
  kind!: Syntax.NoSubstitutionLiteral;
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
  kind!: Syntax.NotEmittedStatement;
  constructor(o: qt.Node) {
    super(true);
    this.original = o;
    this.setRange(o);
  }
}
NotEmittedStatement.prototype.kind = NotEmittedStatement.kind;
export class NumericLiteral extends qb.LiteralExpr implements qt.NumericLiteral {
  static readonly kind = Syntax.NumericLiteral;
  kind!: Syntax.NumericLiteral;
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
  kind!: Syntax.NullKeyword;
  constructor() {
    super(true);
  }
  _typingBrand: any;
}
NullLiteral.prototype.kind = NullLiteral.kind;
NumericLiteral.prototype.kind = NumericLiteral.kind;
qu.addMixins(NumericLiteral, [qb.Decl]);
export class ObjectBindingPattern extends qb.Nobj implements qt.ObjectBindingPattern {
  static readonly kind = Syntax.ObjectBindingPattern;
  kind!: Syntax.ObjectBindingPattern;
  parent?: qt.VariableDeclaration | qt.ParamDeclaration | qt.BindingElem;
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
  kind!: Syntax.ObjectLiteralExpression;
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
  kind!: Syntax.OmittedExpression;
  constructor() {
    super(true);
  }
}
OmittedExpression.prototype.kind = OmittedExpression.kind;
export class OptionalTyping extends qb.Tobj implements qt.OptionalTyping {
  static readonly kind = Syntax.OptionalTyping;
  kind!: Syntax.OptionalTyping;
  type: qt.Typing;
  constructor(t: qt.Typing) {
    super(true);
    this.type = qf.nest.arrayTypeMember(t);
  }
  update(t: qt.Typing): OptionalTyping {
    return this.type !== t ? new OptionalTyping(t).updateFrom(this) : this;
  }
}
OptionalTyping.prototype.kind = OptionalTyping.kind;
export namespace OuterExpression {}
export class ParamDeclaration extends qb.NamedDecl implements qt.ParamDeclaration {
  static readonly kind = Syntax.Param;
  kind!: Syntax.Param;
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
    this.initer = i ? qf.nest.expressionForList(i) : undefined;
  }
  updateParam(
    ds: readonly qt.Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    d3: qt.Dot3Token | undefined,
    name: string | qt.BindingName,
    q?: qt.QuestionToken,
    t?: qt.Typing,
    i?: qt.Expression
  ) {
    return this.decorators !== ds || this.modifiers !== ms || this.dot3Token !== d3 || this.name !== name || this.questionToken !== q || this.type !== t || this.initer !== i
      ? new ParamDeclaration(ds, ms, d3, name, q, t, i).updateFrom(this)
      : this;
  }
}
ParamDeclaration.prototype.kind = ParamDeclaration.kind;
qu.addMixins(ParamDeclaration, [qb.DocContainer]);
export class ParenthesizedExpression extends qb.PrimaryExpr implements qt.ParenthesizedExpression {
  static readonly kind = Syntax.ParenthesizedExpression;
  kind!: Syntax.ParenthesizedExpression;
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
  kind!: Syntax.ParenthesizedTyping;
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
  kind!: Syntax.PartiallyEmittedExpression;
  expression: qt.Expression;
  constructor(e: qt.Expression, o?: qt.Node) {
    super(true);
    this.expression = e;
    this.original = o;
    this.setRange(o);
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new PartiallyEmittedExpression(e, this.original as qt.Node).updateFrom(this) : this;
  }
}
PartiallyEmittedExpression.prototype.kind = PartiallyEmittedExpression.kind;
export class PostfixUnaryExpression extends qb.UpdateExpr implements qt.PostfixUnaryExpression {
  static readonly kind = Syntax.PostfixUnaryExpression;
  kind!: Syntax.PostfixUnaryExpression;
  operand: qt.LeftExpression;
  operator: qt.PostfixUnaryOperator;
  constructor(e: qt.Expression, o: qt.PostfixUnaryOperator) {
    super(true);
    this.operand = qf.nest.postfixOperand(e);
    this.operator = o;
  }
  update(e: qt.Expression) {
    return this.operand !== e ? new PostfixUnaryExpression(e, this.operator).updateFrom(this) : this;
  }
}
PostfixUnaryExpression.prototype.kind = PostfixUnaryExpression.kind;
export class PrefixUnaryExpression extends qb.UpdateExpr implements qt.PrefixUnaryExpression {
  static readonly kind = Syntax.PrefixUnaryExpression;
  kind!: Syntax.PrefixUnaryExpression;
  operator: qt.PrefixUnaryOperator;
  operand: qt.UnaryExpression;
  constructor(o: qt.PrefixUnaryOperator, e: qt.Expression) {
    super(true);
    this.operator = o;
    this.operand = qf.nest.prefixOperand(e);
  }
  update(e: qt.Expression) {
    return this.operand !== e ? new PrefixUnaryExpression(this.operator, e).updateFrom(this) : this;
  }
}
PrefixUnaryExpression.prototype.kind = PrefixUnaryExpression.kind;
export class PrivateIdentifier extends qb.TokenOrIdentifier implements qt.PrivateIdentifier {
  static readonly kind = Syntax.PrivateIdentifier;
  kind!: Syntax.PrivateIdentifier;
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
  kind!: Syntax.PropertyAccessExpression;
  expression: qt.LeftExpression;
  questionDotToken?: qt.QuestionDotToken;
  name: qt.Identifier | qt.PrivateIdentifier;
  constructor(e: qt.Expression, n: string | qt.Identifier | qt.PrivateIdentifier) {
    super(true);
    this.expression = qf.nest.forAccess(e);
    this.name = asName(n);
    this.qf.emit.setFlags(EmitFlags.NoIndentation);
  }
  update(e: qt.Expression, n: qt.Identifier | qt.PrivateIdentifier): PropertyAccessExpression {
    if (qf.is.propertyAccessChain(this)) return this.update(e, this.questionDotToken, cast(n, isIdentifier));
    return this.expression !== e || this.name !== n ? new PropertyAccessExpression(e, n).qf.emit.setFlags(qf.get.emitFlags(this)).updateFrom(this) : this;
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
    return this.expression !== e || this.questionDotToken !== q || this.name !== n ? new PropertyAccessChain(e, q, n).qf.emit.setFlags(qf.get.emitFlags(this)).updateFrom(this) : this;
  }
  _optionalChainBrand: any;
}
export class PropertyAssignment extends qb.ObjectLiteralElem implements qt.PropertyAssignment {
  static readonly kind = Syntax.PropertyAssignment;
  kind!: Syntax.PropertyAssignment;
  parent?: qt.ObjectLiteralExpression;
  name: qt.PropertyName;
  questionToken?: qt.QuestionToken;
  initer: qt.Expression;
  constructor(n: string | qt.PropertyName, i: qt.Expression) {
    super(true);
    this.name = asName(n);
    this.initer = qf.nest.expressionForList(i);
  }
  update(n: qt.PropertyName, i: qt.Expression) {
    return this.name !== n || this.initer !== i ? new PropertyAssignment(n, i).updateFrom(this) : this;
  }
}
PropertyAssignment.prototype.kind = PropertyAssignment.kind;
qu.addMixins(PropertyAssignment, [qb.DocContainer]);
export class PropertyDeclaration extends qb.ClassElem implements qt.PropertyDeclaration {
  static readonly kind = Syntax.PropertyDeclaration;
  kind!: Syntax.PropertyDeclaration;
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
  kind!: Syntax.PropertySignature;
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
export class QualifiedName extends qb.Nobj implements qt.QualifiedName {
  static readonly kind = Syntax.QualifiedName;
  kind!: Syntax.QualifiedName;
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
  kind!: Syntax.RegexLiteral;
  constructor(t: string) {
    super(true);
    this.text = t;
  }
}
RegexLiteral.prototype.kind = RegexLiteral.kind;
export class RestTyping extends qb.Tobj implements qt.RestTyping {
  static readonly kind = Syntax.RestTyping;
  kind!: Syntax.RestTyping;
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
  kind!: Syntax.ReturnStatement;
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
  kind!: Syntax.SemicolonClassElem;
  parent?: qt.ClassLikeDeclaration;
  constructor() {
    super(true);
  }
}
SemicolonClassElem.prototype.kind = SemicolonClassElem.kind;
export class SetAccessorDeclaration extends qb.FunctionLikeDecl implements qt.SetAccessorDeclaration {
  static readonly kind = Syntax.SetAccessor;
  kind!: Syntax.SetAccessor;
  parent?: qt.ClassLikeDeclaration | qt.ObjectLiteralExpression;
  name: qt.PropertyName;
  body?: qt.FunctionBody;
  constructor(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | qt.PropertyName, ps: readonly qt.ParamDeclaration[], b?: qt.Block) {
    super(true, Syntax.SetAccessor, undefined, ps);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(p);
    this.params = new Nodes(ps);
    this.body = b;
  }
  update(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: qt.PropertyName, ps: readonly qt.ParamDeclaration[], b?: qt.Block) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== p || this.params !== ps || this.body !== b ? new SetAccessorDeclaration(ds, ms, p, ps, b).updateFrom(this) : this;
  }
  _classElemBrand: any;
  _objectLiteralBrand: any;
}
SetAccessorDeclaration.prototype.kind = SetAccessorDeclaration.kind;
qu.addMixins(SetAccessorDeclaration, [qb.ClassElem, qb.ObjectLiteralElem, qb.DocContainer]);
export class ShorthandPropertyAssignment extends qb.ObjectLiteralElem implements qt.ShorthandPropertyAssignment {
  static readonly kind = Syntax.ShorthandPropertyAssignment;
  kind!: Syntax.ShorthandPropertyAssignment;
  parent?: qt.ObjectLiteralExpression;
  name: qt.Identifier;
  questionToken?: qt.QuestionToken;
  exclamationToken?: qt.ExclamationToken;
  equalsToken?: qt.EqualsToken;
  objectAssignmentIniter?: qt.Expression;
  constructor(n: string | qt.Identifier, i?: qt.Expression) {
    super(true);
    this.name = asName(n);
    this.objectAssignmentIniter = i ? qf.nest.expressionForList(i) : undefined;
  }
  update(n: qt.Identifier, i: qt.Expression | undefined) {
    return this.name !== n || this.objectAssignmentIniter !== i ? new ShorthandPropertyAssignment(n, i).updateFrom(this) : this;
  }
}
ShorthandPropertyAssignment.prototype.kind = ShorthandPropertyAssignment.kind;
qu.addMixins(ShorthandPropertyAssignment, [qb.DocContainer]);
export class SpreadElem extends qb.Expr implements qt.SpreadElem {
  static readonly kind = Syntax.SpreadElem;
  kind!: Syntax.SpreadElem;
  parent?: qt.ArrayLiteralExpression | qt.CallExpression | qt.NewExpression;
  expression: qt.Expression;
  constructor(e: qt.Expression) {
    super(true);
    this.expression = qf.nest.expressionForList(e);
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new SpreadElem(e).updateFrom(this) : this;
  }
}
SpreadElem.prototype.kind = SpreadElem.kind;
export class SpreadAssignment extends qb.ObjectLiteralElem implements qt.SpreadAssignment {
  static readonly kind = Syntax.SpreadAssignment;
  kind!: Syntax.SpreadAssignment;
  parent?: qt.ObjectLiteralExpression;
  expression: qt.Expression;
  constructor(e: qt.Expression) {
    super(true);
    this.expression = qf.nest.expressionForList(e);
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new SpreadAssignment(e).updateFrom(this) : this;
  }
}
SpreadAssignment.prototype.kind = SpreadAssignment.kind;
qu.addMixins(SpreadAssignment, [qb.DocContainer]);
export class StringLiteral extends qb.LiteralExpr implements qt.StringLiteral {
  static readonly kind = Syntax.StringLiteral;
  kind!: Syntax.StringLiteral;
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
  kind!: Syntax.SuperKeyword;
  constructor() {
    super(true);
  }
}
SuperExpression.prototype.kind = SuperExpression.kind;
export class SwitchStatement extends qb.Stmt implements qt.SwitchStatement {
  static readonly kind = Syntax.SwitchStatement;
  kind!: Syntax.SwitchStatement;
  expression: qt.Expression;
  caseBlock: qt.CaseBlock;
  possiblyExhaustive?: boolean;
  constructor(e: qt.Expression, c: qt.CaseBlock) {
    super(true);
    this.expression = qf.nest.expressionForList(e);
    this.caseBlock = c;
  }
  update(e: qt.Expression, c: qt.CaseBlock) {
    return this.expression !== e || this.caseBlock !== c ? new SwitchStatement(e, c).updateFrom(this) : this;
  }
}
SwitchStatement.prototype.kind = SwitchStatement.kind;
export class SyntheticReferenceExpression extends qb.LeftExpr implements qt.SyntheticReferenceExpression {
  static readonly kind = Syntax.SyntheticReferenceExpression;
  kind!: Syntax.SyntheticReferenceExpression;
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
  kind!: Syntax.TaggedTemplateExpression;
  tag: qt.LeftExpression;
  typeArgs?: qt.Nodes<qt.Typing>;
  template: qt.TemplateLiteral;
  questionDotToken?: qt.QuestionDotToken;
  constructor(tag: qt.Expression, ts: readonly qt.Typing[] | undefined, template: qt.TemplateLiteral);
  constructor(tag: qt.Expression, ts?: readonly qt.Typing[] | qt.TemplateLiteral, template?: qt.TemplateLiteral);
  constructor(tag: qt.Expression, ts?: readonly qt.Typing[] | qt.TemplateLiteral, template?: qt.TemplateLiteral) {
    super(true);
    this.tag = qf.nest.forAccess(tag);
    if (template) {
      this.typeArgs = Nodes.from(ts as readonly qt.Typing[]);
      this.template = template;
    } else {
      this.typeArgs = undefined;
      this.template = ts as qt.TemplateLiteral;
    }
  }
  update(tag: qt.Expression, ts: readonly qt.Typing[] | undefined, template: qt.TemplateLiteral): TaggedTemplateExpression;
  update(tag: qt.Expression, ts?: readonly qt.Typing[] | qt.TemplateLiteral, template?: qt.TemplateLiteral) {
    return this.tag !== tag || (template ? this.typeArgs !== ts || this.template !== template : this.typeArgs || this.template !== ts)
      ? new TaggedTemplateExpression(tag, ts, template).updateFrom(this)
      : this;
  }
}
TaggedTemplateExpression.prototype.kind = TaggedTemplateExpression.kind;
export class TemplateExpression extends qb.PrimaryExpr implements qt.TemplateExpression {
  static readonly kind = Syntax.TemplateExpression;
  kind!: Syntax.TemplateExpression;
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
  kind!: Syntax.TemplateHead;
  parent?: qt.TemplateExpression;
  templateFlags?: qt.TokenFlags;
  constructor(t: string, raw?: string) {
    super(Syntax.TemplateHead, t, raw);
  }
}
TemplateHead.prototype.kind = TemplateHead.kind;
export class TemplateMiddle extends qb.TemplateLiteralLikeNode implements qt.TemplateMiddle {
  static readonly kind = Syntax.TemplateMiddle;
  kind!: Syntax.TemplateMiddle;
  parent?: qt.TemplateSpan;
  templateFlags?: qt.TokenFlags;
  constructor(t: string, raw?: string) {
    super(Syntax.TemplateMiddle, t, raw);
  }
}
TemplateMiddle.prototype.kind = TemplateMiddle.kind;
export class TemplateSpan extends qb.Nobj implements qt.TemplateSpan {
  static readonly kind = Syntax.TemplateSpan;
  kind!: Syntax.TemplateSpan;
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
  kind!: Syntax.TemplateTail;
  parent?: qt.TemplateSpan;
  templateFlags?: qt.TokenFlags;
  constructor(t: string, raw?: string) {
    super(Syntax.TemplateTail, t, raw);
  }
}
TemplateTail.prototype.kind = TemplateTail.kind;
export class ThisExpression extends qb.PrimaryExpr implements qt.ThisExpression {
  static readonly kind = Syntax.ThisKeyword;
  kind!: Syntax.ThisKeyword;
  constructor() {
    super(true);
  }
  _typingBrand: any;
}
ThisExpression.prototype.kind = ThisExpression.kind;
qu.addMixins(ThisExpression, [KeywordTyping]);
export class ThisTyping extends qb.Tobj implements qt.ThisTyping {
  static readonly kind = Syntax.ThisTyping;
  kind!: Syntax.ThisTyping;
  constructor() {
    super(true);
  }
}
ThisTyping.prototype.kind = ThisTyping.kind;
export class ThrowStatement extends qb.Stmt implements qt.ThrowStatement {
  static readonly kind = Syntax.ThrowStatement;
  kind!: Syntax.ThrowStatement;
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
  kind!: Syntax.TryStatement;
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
  kind!: Syntax.TupleTyping;
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
  kind!: Syntax.TypeAliasDeclaration;
  name: qt.Identifier;
  typeParams?: qt.Nodes<qt.TypeParamDeclaration>;
  type: qt.Typing;
  cache?: readonly qt.DocTag[] | undefined;
  constructor(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, n: string | qt.Identifier, ts: readonly qt.TypeParamDeclaration[] | undefined, t: qt.Typing) {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(n);
    this.typeParams = Nodes.from(ts);
    this.type = t;
  }
  update(ds: readonly qt.Decorator[] | undefined, ms: readonly Modifier[] | undefined, n: qt.Identifier, ts: readonly qt.TypeParamDeclaration[] | undefined, t: qt.Typing) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== n || this.typeParams !== ts || this.type !== t ? new TypeAliasDeclaration(ds, ms, n, ts, t).updateFrom(this) : this;
  }
  _statementBrand: any;
}
TypeAliasDeclaration.prototype.kind = TypeAliasDeclaration.kind;
qu.addMixins(TypeAliasDeclaration, [qb.DocContainer]);
export class TypeAssertion extends qb.UnaryExpr implements qt.TypeAssertion {
  static readonly kind = Syntax.TypeAssertionExpression;
  kind!: Syntax.TypeAssertionExpression;
  type: qt.Typing;
  expression: qt.UnaryExpression;
  constructor(t: qt.Typing, e: qt.Expression) {
    super(true);
    this.type = t;
    this.expression = qf.nest.prefixOperand(e);
  }
  update(t: qt.Typing, e: qt.Expression) {
    return this.type !== t || this.expression !== e ? new TypeAssertion(t, e).updateFrom(this) : this;
  }
}
TypeAssertion.prototype.kind = TypeAssertion.kind;
export class TypingLiteral extends qb.Tobj implements qt.TypingLiteral {
  static readonly kind = Syntax.TypingLiteral;
  kind!: Syntax.TypingLiteral;
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
  kind!: Syntax.TypeOfExpression;
  expression: qt.UnaryExpression;
  constructor(e: qt.Expression) {
    super(true);
    this.expression = qf.nest.prefixOperand(e);
  }
  update(e: qt.Expression) {
    return this.expression !== e ? new TypeOfExpression(e).updateFrom(this) : this;
  }
}
TypeOfExpression.prototype.kind = TypeOfExpression.kind;
export class TypingOperator extends qb.Tobj implements qt.TypingOperator {
  static readonly kind = Syntax.TypingOperator;
  kind!: Syntax.TypingOperator;
  operator: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword;
  type: qt.Typing;
  constructor(t: qt.Typing);
  constructor(o: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword, t: qt.Typing);
  constructor(o: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword | qt.Typing, t?: qt.Typing) {
    super(true);
    this.operator = typeof o === 'number' ? o : Syntax.KeyOfKeyword;
    this.type = qf.nest.elemTypeMember(typeof o === 'number' ? t! : o);
  }
  update(t: qt.Typing) {
    return this.type !== t ? new TypingOperator(this.operator, t).updateFrom(this) : this;
  }
}
TypingOperator.prototype.kind = TypingOperator.kind;
export class TypeParamDeclaration extends qb.NamedDecl implements qt.TypeParamDeclaration {
  static readonly kind = Syntax.TypeParam;
  kind!: Syntax.TypeParam;
  parent?: qt.DeclarationWithTypeParamChildren | qt.InferTyping;
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
    return this.name !== n || this.constraint !== c || this.default !== d ? new TypeParamDeclaration(n, c, d).updateFrom(this) : this;
  }
}
TypeParamDeclaration.prototype.kind = TypeParamDeclaration.kind;
export class TypingPredicate extends qb.Tobj implements qt.TypingPredicate {
  static readonly kind = Syntax.TypingPredicate;
  kind!: Syntax.TypingPredicate;
  parent?: qt.SignatureDeclaration | qt.DocTypingExpression;
  assertsModifier?: qt.AssertsToken;
  paramName: qt.Identifier | qt.ThisTyping;
  type?: qt.Typing;
  constructor(a: qt.AssertsToken | undefined, p: qt.Identifier | qt.ThisTyping | string, t?: qt.Typing) {
    super(true);
    this.assertsModifier = a;
    this.paramName = asName(p);
    this.type = t;
  }
  update(p: qt.Identifier | qt.ThisTyping, t: qt.Typing) {
    return this.updateWithModifier(this.assertsModifier, p, t);
  }
  updateWithModifier(a: qt.AssertsToken | undefined, p: qt.Identifier | qt.ThisTyping, t?: qt.Typing) {
    return this.assertsModifier !== a || this.paramName !== p || this.type !== t ? new TypingPredicate(a, p, t).updateFrom(this) : this;
  }
}
TypingPredicate.prototype.kind = TypingPredicate.kind;
export class TypingQuery extends qb.Tobj implements qt.TypingQuery {
  static readonly kind = Syntax.TypingQuery;
  kind!: Syntax.TypingQuery;
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
export class TypingReference extends qb.WithArgsTobj implements qt.TypingReference {
  static readonly kind = Syntax.TypingReference;
  kind!: Syntax.TypingReference;
  typeName: qt.EntityName;
  constructor(t: string | qt.EntityName, ts?: readonly qt.Typing[]) {
    super(true);
    this.typeName = asName(t);
    this.typeArgs = ts && qf.nest.typeParams(ts);
  }
  update(t: qt.EntityName, ts?: qt.Nodes<qt.Typing>) {
    return this.typeName !== t || this.typeArgs !== ts ? new TypingReference(t, ts).updateFrom(this) : this;
  }
}
TypingReference.prototype.kind = TypingReference.kind;
export class UnionTyping extends UnionOrIntersectionTyping implements qt.UnionTyping {
  static readonly kind = Syntax.UnionTyping;
  kind!: Syntax.UnionTyping;
  constructor(ts: readonly qt.Typing[]) {
    super(Syntax.UnionTyping, ts);
  }
  update(ts: qt.Nodes<qt.Typing>) {
    return super.update(ts);
  }
}
UnionTyping.prototype.kind = UnionTyping.kind;
export namespace UnparsedNode {}
export class UnparsedPrepend extends qb.Nobj implements qt.UnparsedPrepend {
  static readonly kind = Syntax.UnparsedPrepend;
  kind!: Syntax.UnparsedPrepend;
  data!: string;
  parent?: qt.UnparsedSource;
  texts!: readonly qt.UnparsedTextLike[];
}
UnparsedPrepend.prototype.kind = UnparsedPrepend.kind;
export class UnparsedSyntheticReference extends qb.Nobj implements qt.UnparsedSyntheticReference {
  static readonly kind = Syntax.UnparsedSyntheticReference;
  kind!: Syntax.UnparsedSyntheticReference;
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
  kind!: Syntax.VariableDeclaration;
  parent?: qt.VariableDeclarationList | qt.CatchClause;
  name: qt.BindingName;
  exclamationToken?: qt.ExclamationToken;
  type?: qt.Typing;
  initer?: qt.Expression;
  constructor(n: string | qt.BindingName, t?: qt.Typing, i?: qt.Expression, e?: qt.ExclamationToken) {
    super(true);
    this.name = asName(n);
    this.type = t;
    this.initer = i !== undefined ? qf.nest.expressionForList(i) : undefined;
    this.exclamationToken = e;
  }
  update(n: qt.BindingName, t?: qt.Typing, i?: qt.Expression, e?: qt.ExclamationToken) {
    return this.name !== n || this.type !== t || this.initer !== i || this.exclamationToken !== e ? new VariableDeclaration(n, t, i, e).updateFrom(this) : this;
  }
}
VariableDeclaration.prototype.kind = VariableDeclaration.kind;
export class VariableDeclarationList extends qb.Nobj implements qt.VariableDeclarationList {
  static readonly kind = Syntax.VariableDeclarationList;
  kind!: Syntax.VariableDeclarationList;
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
  kind!: Syntax.VariableStatement;
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
  kind!: Syntax.VoidExpression;
  expression: qt.UnaryExpression;
  constructor(e: qt.Expression) {
    super(true);
    this.expression = qf.nest.prefixOperand(e);
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
  kind!: Syntax.WhileStatement;
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
  kind!: Syntax.WithStatement;
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
  kind!: Syntax.YieldExpression;
  asteriskToken?: qt.AsteriskToken;
  expression?: qt.Expression;
  constructor(e?: qt.Expression);
  constructor(a: qt.AsteriskToken | undefined, e: qt.Expression);
  constructor(a?: qt.AsteriskToken | undefined | qt.Expression, e?: qt.Expression) {
    super(true);
    const a2 = a && a.kind === Syntax.AsteriskToken ? (a as qt.AsteriskToken) : undefined;
    this.asteriskToken = a2;
    e = a && a.kind !== Syntax.AsteriskToken ? (a as qt.Expression) : e;
    this.expression = e && qf.nest.expressionForList(e);
  }
  update(a: qt.AsteriskToken | undefined, e: qt.Expression) {
    return this.expression !== e || this.asteriskToken !== a ? new YieldExpression(a, e).updateFrom(this) : this;
  }
}
YieldExpression.prototype.kind = YieldExpression.kind;
export function asToken<T extends Syntax>(t: T | qt.Token<T>): qt.Token<T> {
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
      return new FunctionDeclaration(d.decorators, d.modifiers, d.asteriskToken, d.name, d.typeParams, d.params, d.type, b);
    case Syntax.MethodDeclaration:
      return new MethodDeclaration(d.decorators, d.modifiers, d.asteriskToken, d.name, d.questionToken, d.typeParams, d.params, d.type, b);
    case Syntax.GetAccessor:
      return new GetAccessorDeclaration(d.decorators, d.modifiers, d.name, d.params, d.type, b);
    case Syntax.SetAccessor:
      return new SetAccessorDeclaration(d.decorators, d.modifiers, d.name, d.params, b);
    case Syntax.Constructor:
      return new ConstructorDeclaration(d.decorators, d.modifiers, d.params, b);
    case Syntax.FunctionExpression:
      return new FunctionExpression(d.modifiers, d.asteriskToken, d.name, d.typeParams, d.params, d.type, b);
    case Syntax.ArrowFunction:
      return new ArrowFunction(d.modifiers, d.typeParams, d.params, d.type, d.equalsGreaterThanToken, b);
  }
}
export function updateOuterExpression(n: Node, e: qt.Expression) {
  switch (n.kind) {
    case Syntax.ParenthesizedExpression:
      return n.update(e);
    case Syntax.TypeAssertionExpression:
      return n.update(n.type, e);
    case Syntax.AsExpression:
      return n.update(e, n.type);
    case Syntax.NonNullExpression:
      return n.update(e);
    case Syntax.PartiallyEmittedExpression:
      return n.update(e);
  }
}
export type Node =
  //| Declaration
  //| DocNamepathTyping
  //| DocUnknownTag
  //| Expression
  //| FunctionLikeDeclaration
  //| ImportExpression
  //| SourceFile
  //| Statement
  //| SyntheticExpression
  //| UniqueTypingOperator
  //| UnparsedPrologue
  //| UnparsedSource
  //| UnparsedTextLike
  | ArrayBindingPattern
  | ArrayLiteralExpression
  | ArrayTyping
  | ArrowFunction
  | AsExpression
  | AwaitExpression
  | BigIntLiteral
  | BinaryExpression
  | BindingElem
  | Block
  | BooleanLiteral
  | BreakStatement
  | Bundle
  | CallExpression
  | CallSignatureDeclaration
  | CaseBlock
  | CaseClause
  | CatchClause
  | ClassDeclaration
  | ClassExpression
  | CommaListExpression
  | ComputedPropertyName
  | ConditionalExpression
  | ConditionalTyping
  | ConstructorDeclaration
  | ConstructorTyping
  | ConstructSignatureDeclaration
  | ContinueStatement
  | DebuggerStatement
  | Decorator
  | DefaultClause
  | DeleteExpression
  | Doc
  | DocAllTyping
  | DocAugmentsTag
  | DocAuthorTag
  | DocCallbackTag
  | DocClassTag
  | DocEnumTag
  | DocFunctionTyping
  | DocImplementsTag
  | DocNonNullableTyping
  | DocNullableTyping
  | DocOptionalTyping
  | DocParamTag
  | DocPrivateTag
  | DocPropertyTag
  | DocProtectedTag
  | DocPublicTag
  | DocReadonlyTag
  | DocReturnTag
  | DocSignature
  | DocTemplateTag
  | DocThisTag
  | DocTypedefTag
  | DocTypeTag
  | DocTypingExpression
  | DocTypingLiteral
  | DocUnknownTyping
  | DocVariadicTyping
  | DoStatement
  | ElemAccessExpression
  | EmptyStatement
  | EndOfDeclarationMarker
  | EnumDeclaration
  | EnumMember
  | ExportAssignment
  | ExportDeclaration
  | ExportSpecifier
  | ExpressionStatement
  | ExpressionWithTypings
  | ExternalModuleReference
  | ForInStatement
  | ForOfStatement
  | ForStatement
  | FunctionDeclaration
  | FunctionExpression
  | FunctionTyping
  | GetAccessorDeclaration
  | HeritageClause
  | Identifier
  | IfStatement
  | ImportClause
  | ImportDeclaration
  | ImportEqualsDeclaration
  | ImportSpecifier
  | ImportTyping
  | IndexedAccessTyping
  | IndexSignatureDeclaration
  | InferTyping
  | InputFiles
  | InterfaceDeclaration
  | IntersectionTyping
  | JsxAttribute
  | JsxAttributes
  | JsxClosingElem
  | JsxClosingFragment
  | JsxElem
  | JsxExpression
  | JsxFragment
  | JsxOpeningElem
  | JsxOpeningFragment
  | JsxSelfClosingElem
  | JsxSpreadAttribute
  | JsxText
  | KeywordTyping
  | LabeledStatement
  | LiteralTyping
  | MappedTyping
  | MergeDeclarationMarker
  | MetaProperty
  | MethodDeclaration
  | MethodSignature
  | MissingDeclaration
  | ModuleBlock
  | ModuleDeclaration
  | NamedExports
  | NamedImports
  | NamedTupleMember
  | NamespaceExport
  | NamespaceExportDeclaration
  | NamespaceImport
  | NewExpression
  | NonNullExpression
  | NoSubstitutionLiteral
  | NotEmittedStatement
  | NumericLiteral
  | ObjectBindingPattern
  | ObjectLiteralExpression
  | OmittedExpression
  | OptionalTyping
  | ParamDeclaration
  | ParenthesizedExpression
  | ParenthesizedTyping
  | PartiallyEmittedExpression
  | PostfixUnaryExpression
  | PrefixUnaryExpression
  | PrivateIdentifier
  | PropertyAccessExpression
  | PropertyAssignment
  | PropertyDeclaration
  | PropertySignature
  | QualifiedName
  | RegexLiteral
  | RestTyping
  | ReturnStatement
  | SemicolonClassElem
  | SetAccessorDeclaration
  | ShorthandPropertyAssignment
  | SpreadAssignment
  | SpreadElem
  | StringLiteral
  | SuperExpression
  | SwitchStatement
  | SyntheticReferenceExpression
  | TaggedTemplateExpression
  | TemplateExpression
  | TemplateHead
  | TemplateMiddle
  | TemplateSpan
  | TemplateTail
  | ThisTyping
  | ThrowStatement
  | TryStatement
  | TupleTyping
  | TypeAliasDeclaration
  | TypeAssertion
  | TypeOfExpression
  | TypeParamDeclaration
  | TypingLiteral
  | TypingOperator
  | TypingPredicate
  | TypingQuery
  | TypingReference
  | UnionTyping
  | UnparsedPrepend
  | UnparsedSyntheticReference
  | VariableDeclaration
  | VariableDeclarationList
  | VariableStatement
  | VoidExpression
  | WhileStatement
  | WithStatement
  | YieldExpression;
export type NodeType<S extends Syntax> = S extends keyof SynMap ? SynMap[S] : never;
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
  [Syntax.DocParamTag]: DocParamTag;
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
  [Syntax.Param]: ParamDeclaration;
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
  [Syntax.TypeParam]: TypeParamDeclaration;
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
