import { Nodes, Token } from './base';
import * as qc from './base';
import { is, get } from './context';
import * as qg from '../debug';
import { DocTag, Node, NodeFlags } from '../type';
import * as qu from '../base';
import { Modifier, Syntax } from '../syntax';
import * as qy from '../syntax';
export * from './base';
export type NodeType<S extends Syntax> = S extends keyof SynMap ? SynMap[S] : never;
export class Nobj extends qc.Nobj {
  is<S extends Syntax, T extends { kind: S; also?: Syntax[] }>(t: T): this is NodeType<T['kind']> {
    return this.kind === t.kind || !!t.also?.includes(this.kind);
  }
  static create<T extends Syntax>(k: T, pos: number, end: number, parent?: Nobj): NodeType<T> {
    const n =
      qy.is.node(k) || k === Syntax.Unknown
        ? new Nobj(k, pos, end)
        : k === Syntax.SourceFile
        ? new SourceFileObj(Syntax.SourceFile, pos, end)
        : k === Syntax.Identifier
        ? new Identifier(Syntax.Identifier, pos, end)
        : k === Syntax.PrivateIdentifier
        ? new PrivateIdentifier(Syntax.PrivateIdentifier, pos, end)
        : new Token<T>(k, pos, end);
    if (parent) {
      n.parent = parent;
      n.flags = parent.flags & NodeFlags.ContextFlags;
    }
    return (n as unknown) as NodeType<T>;
  }
  static createSynthesized<T extends Syntax>(k: T): NodeType<T> {
    const n = this.create<T>(k, -1, -1);
    n.flags |= NodeFlags.Synthesized;
    return n;
  }
  static getMutableClone<T extends Nobj>(node: T): T {
    const clone = getSynthesizedClone(node);
    clone.pos = node.pos;
    clone.end = node.end;
    clone.parent = node.parent;
    return clone;
  }
  static getSynthesizedClone<T extends Nobj>(node: T): T {
    if (node === undefined) return node;
    const clone = this.createSynthesized(node.kind) as T;
    clone.flags |= node.flags;
    clone.setOriginal(node);
    for (const key in node) {
      if (clone.hasOwnProperty(key) || !node.hasOwnProperty(key)) continue;
      (<any>clone)[key] = (<any>node)[key];
    }
    return clone;
  }
}
//export namespace ArrayBindingElement {
//  export const also = [Syntax.BindingElement, Syntax.OmittedExpression];
//}
export abstract class UnionOrIntersectionTypeNode extends qc.TypeNode implements qc.UnionOrIntersectionType {
  types: Nodes<qc.TypeNode>;
  objectFlags: qc.ObjectFlags;
  propertyCache: qc.SymbolTable;
  resolvedProperties: qc.Symbol[];
  resolvedIndexType: qc.IndexType;
  resolvedStringIndexType: qc.IndexType;
  resolvedBaseConstraint: qc.Type;
  constructor(k: Syntax.UnionType | Syntax.IntersectionType, ts: readonly qc.TypeNode[]) {
    super(true, k);
    this.types = parenthesize.elementTypeMembers(ts);
  }
  update(ts: Nodes<qc.TypeNode>) {
    return this.types !== ts ? new UnionOrIntersectionTypeNode(this.kind, ts).updateFrom(this) : this;
  }
}

export class ArrayBindingPattern extends Nobj implements qc.ArrayBindingPattern {
  static readonly kind = Syntax.ArrayBindingPattern;
  parent?: VariableDeclaration | ParameterDeclaration | BindingElement;
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
    super(true, Syntax.ArrowFunction, ts, ps, t);
    this.modifiers = Nodes.from(ms);
    this.equalsGreaterThanToken = a || new qc.Token(Syntax.EqualsGreaterThanToken);
    this.body = parenthesize.conciseBody(b);
  }
  update(
    ms: readonly Modifier[] | undefined,
    ts: readonly TypeParameterDeclaration[] | undefined,
    ps: readonly ParameterDeclaration[],
    t: qc.TypeNode | undefined,
    a: qc.EqualsGreaterThanToken,
    b: qc.ConciseBody
  ) {
    return this.modifiers !== ms || this.typeParameters !== ts || this.parameters !== ps || this.type !== t || this.equalsGreaterThanToken !== a || this.body !== b
      ? new ArrowFunction(ms, ts, ps, t, a, b).updateFrom(this)
      : this;
  }
  _expressionBrand: any;
}
ArrowFunction.prototype.kind = ArrowFunction.kind;
qu.addMixins(ArrowFunction, [qc.Expression, qc.DocContainer]);
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
  static createStrictEquality(l: qc.Expression, r: qc.Expression) {
    return new BinaryExpression(l, Syntax.Equals3Token, r);
  }
  static createStrictInequality(l: qc.Expression, r: qc.Expression) {
    return new BinaryExpression(l, Syntax.ExclamationEquals2Token, r);
  }
  static createAdd(l: qc.Expression, r: qc.Expression) {
    return new BinaryExpression(l, Syntax.PlusToken, r);
  }
  static createSubtract(l: qc.Expression, r: qc.Expression) {
    return new BinaryExpression(l, Syntax.MinusToken, r);
  }
  static createLogicalAnd(l: qc.Expression, r: qc.Expression) {
    return new BinaryExpression(l, Syntax.Ampersand2Token, r);
  }
  static createLogicalOr(l: qc.Expression, r: qc.Expression) {
    return new BinaryExpression(l, Syntax.Bar2Token, r);
  }
  static createNullishCoalesce(l: qc.Expression, r: qc.Expression) {
    return new BinaryExpression(l, Syntax.Question2Token, r);
  }
  static createComma(l: qc.Expression, r: qc.Expression) {
    return new BinaryExpression(l, Syntax.CommaToken, r);
  }
  static createLessThan(l: qc.Expression, r: qc.Expression) {
    return new BinaryExpression(l, Syntax.LessThanToken, r);
  }
  //static createAssignment(l: ObjectLiteralExpression | ArrayLiteralExpression, r: qc.Expression): qc.DestructuringAssignment;
  static createAssignment(l: qc.Expression, r: qc.Expression): BinaryExpression;
  static createAssignment(l: qc.Expression, r: qc.Expression) {
    return new BinaryExpression(l, Syntax.EqualsToken, r);
  }
  _declarationBrand: any;
}
BinaryExpression.prototype.kind = BinaryExpression.kind;
qu.addMixins(BinaryExpression, [qc.Declaration]);
export class BindingElement extends qc.NamedDeclaration implements qc.BindingElement {
  static readonly kind = Syntax.BindingElement;
  parent?: qc.BindingPattern;
  propertyName?: qc.PropertyName;
  dot3Token?: qc.Dot3Token;
  name: qc.BindingName;
  initer?: qc.Expression;
  constructor(d: qc.Dot3Token | undefined, p: string | qc.PropertyName | undefined, b: string | qc.BindingName, i?: qc.Expression) {
    super();
    this.dot3Token = d;
    this.propertyName = asName(p);
    this.name = asName(b);
    this.initer = i;
  }
  update(d: qc.Dot3Token | undefined, p: qc.PropertyName | undefined, b: qc.BindingName, i?: qc.Expression) {
    return this.propertyName !== p || this.dot3Token !== d || this.name !== b || this.initer !== i ? new BindingElement(d, p, b, i).updateFrom(this) : this;
  }
}
BindingElement.prototype.kind = BindingElement.kind;
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
  forEachReturnStatement<T>(visitor: (stmt: ReturnStatement) => T): T | undefined {
    function traverse(n: Node): T | undefined {
      switch (n.kind) {
        case Syntax.ReturnStatement:
          return visitor(<ReturnStatement>n);
        case Syntax.CaseBlock:
        case Syntax.Block:
        case Syntax.IfStatement:
        case Syntax.DoStatement:
        case Syntax.WhileStatement:
        case Syntax.ForStatement:
        case Syntax.ForInStatement:
        case Syntax.ForOfStatement:
        case Syntax.WithStatement:
        case Syntax.SwitchStatement:
        case Syntax.CaseClause:
        case Syntax.DefaultClause:
        case Syntax.LabeledStatement:
        case Syntax.TryStatement:
        case Syntax.CatchClause:
          return qc.forEach.child(n, traverse);
      }
      return;
    }
    return traverse(this);
  }
  forEachYieldExpression(visitor: (expr: YieldExpression) => void): void {
    function traverse(n: Node) {
      switch (n.kind) {
        case Syntax.YieldExpression:
          visitor(<YieldExpression>n);
          const operand = (<YieldExpression>n).expression;
          if (operand) {
            traverse(operand);
          }
          return;
        case Syntax.EnumDeclaration:
        case Syntax.InterfaceDeclaration:
        case Syntax.ModuleDeclaration:
        case Syntax.TypeAliasDeclaration:
          return;
        default:
          if (is.functionLike(n)) {
            if (n.name && n.name.kind === Syntax.ComputedPropertyName) {
              traverse(n.name.expression);
              return;
            }
          } else if (!is.partOfTypeNode(n)) qc.forEach.child(n, traverse);
      }
    }
    return traverse(this);
  }
  update(ss: readonly qc.Statement[]) {
    return this.statements !== ss ? new Block(ss, this.multiLine).updateFrom(this) : this;
  }
}
Block.prototype.kind = Block.kind;
export class BooleanLiteral extends qc.PrimaryExpression implements qc.BooleanLiteral {
  static readonly kind = Syntax.NullKeyword;
  constructor(k: boolean) {
    super(true, k ? Syntax.TrueKeyword : Syntax.FalseKeyword);
  }
  _typeNodeBrand: any;
}
BooleanLiteral.prototype.kind = BooleanLiteral.kind;
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
export class Bundle extends Nobj implements qc.Bundle {
  static readonly kind = Syntax.Bundle;
  prepends: readonly (InputFiles | UnparsedSource)[];
  sourceFiles: readonly qc.SourceFile[];
  syntheticFileReferences?: readonly qc.FileReference[];
  syntheticTypeReferences?: readonly qc.FileReference[];
  syntheticLibReferences?: readonly qc.FileReference[];
  hasNoDefaultLib?: boolean;
  constructor(ss: readonly qc.SourceFile[], ps: readonly (UnparsedSource | InputFiles)[] = qu.empty) {
    super();
    this.prepends = ps;
    this.sourceFiles = ss;
  }
  update(ss: readonly qc.SourceFile[], ps: readonly (UnparsedSource | InputFiles)[] = qu.empty) {
    if (this.sourceFiles !== ss || this.prepends !== ps) return new Bundle(ss, ps);
    return this;
  }
}
Bundle.prototype.kind = Bundle.kind;
export class CallBinding extends Nobj {
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
  createCallBinding(e: qc.Expression, recordTempVariable: (temp: Identifier) => void, _?: qc.ScriptTarget, cacheIdentifiers = false): CallBinding {
    const callee = skipOuterExpressions(e, qc.OuterExpressionKinds.All);
    let thisArg: qc.Expression;
    let target: qc.LeftHandSideExpression;
    if (is.superProperty(callee)) {
      thisArg = new ThisExpression();
      target = callee;
    } else if (callee.kind === Syntax.SuperKeyword) {
      thisArg = new ThisExpression();
      target = <PrimaryExpression>callee;
    } else if (get.emitFlags(callee) & qc.EmitFlags.HelperName) {
      thisArg = VoidExpression.zero();
      target = parenthesize.forAccess(callee);
    } else {
      switch (callee.kind) {
        case Syntax.PropertyAccessExpression: {
          if (shouldBeCapturedInTempVariable((<PropertyAccessExpression>callee).expression, cacheIdentifiers)) {
            // for `a.b()` target is `(_a = a).b` and thisArg is `_a`
            thisArg = createTempVariable(recordTempVariable);
            target = new PropertyAccessExpression(
              createAssignment(thisArg, (<PropertyAccessExpression>callee).expression).setRange((<PropertyAccessExpression>callee).expression),
              (<PropertyAccessExpression>callee).name
            );
            target.setRange(callee);
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
              createAssignment(thisArg, (<ElementAccessExpression>callee).expression).setRange((<ElementAccessExpression>callee).expression),
              (<ElementAccessExpression>callee).argumentExpression
            );
            target.setRange(callee);
          } else {
            thisArg = (<ElementAccessExpression>callee).expression;
            target = <ElementAccessExpression>callee;
          }
          break;
        }
        default: {
          // for `a()` target is `a` and thisArg is `void 0`
          thisArg = VoidExpression.zero();
          target = parenthesize.forAccess(e);
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
    if (is.optionalChain(this)) return this.update(e, this.questionDotToken, ts, es);
    return this.expression !== e || this.typeArguments !== ts || this.arguments !== es ? new CallExpression(e, ts, es).updateFrom(this) : this;
  }
  static immediateFunctionExpression(ss: readonly qc.Statement[]): CallExpression;
  static immediateFunctionExpression(ss: readonly qc.Statement[], p: ParameterDeclaration, v: qc.Expression): CallExpression;
  static immediateFunctionExpression(ss: readonly qc.Statement[], p?: ParameterDeclaration, v?: qc.Expression) {
    return new CallExpression(new FunctionExpression(undefined, undefined, undefined, undefined, p ? [p] : [], undefined, new Block(ss, true)), undefined, v ? [v] : []);
  }
  static immediateArrowFunction(ss: readonly qc.Statement[]): CallExpression;
  static immediateArrowFunction(ss: readonly qc.Statement[], p: ParameterDeclaration, v: qc.Expression): CallExpression;
  static immediateArrowFunction(ss: readonly qc.Statement[], p?: ParameterDeclaration, v?: qc.Expression) {
    return new CallExpression(new ArrowFunction(undefined, undefined, p ? [p] : [], undefined, undefined, new Block(ss, true)), undefined, v ? [v] : []);
  }
  _declarationBrand: any;
}
CallExpression.prototype.kind = CallExpression.kind;
qu.addMixins(CallExpression, [qc.Declaration]);
export class CallChain extends CallExpression implements qc.CallChain {
  _optionalChainBrand: any;
  constructor(e: qc.Expression, q?: qc.QuestionDotToken, ts?: readonly qc.TypeNode[], es?: readonly qc.Expression[]) {
    super(e, ts, es);
    this.flags |= NodeFlags.OptionalChain;
    this.questionDotToken = q;
  }
  update(e: qc.Expression, ts: readonly qc.TypeNode[] | undefined, es: readonly qc.Expression[], q?: qc.QuestionDotToken) {
    qu.assert(!!(this.flags & NodeFlags.OptionalChain));
    return this.expression !== e || this.questionDotToken !== q || this.typeArguments !== ts || this.arguments !== es ? new CallChain(e, q, ts, es).updateFrom(this) : this;
  }
}
CallChain.prototype.kind = CallChain.kind;
export class CallSignatureDeclaration extends qc.SignatureDeclarationBase implements qc.CallSignatureDeclaration {
  static readonly kind = Syntax.CallSignature;
  docCache?: readonly qc.DocTag[];
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
export class CaseBlock extends Nobj implements qc.CaseBlock {
  static readonly kind = Syntax.CaseBlock;
  parent?: SwitchStatement;
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
export class CaseClause extends Nobj implements qc.CaseClause {
  static readonly kind = Syntax.CaseClause;
  parent?: CaseBlock;
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
export class CatchClause extends Nobj implements qc.CatchClause {
  static readonly kind = Syntax.CatchClause;
  parent?: TryStatement;
  variableDeclaration?: VariableDeclaration;
  block: Block;
  constructor(v: string | VariableDeclaration | undefined, b: Block) {
    super(true);
    this.variableDeclaration = qu.isString(v) ? new VariableDeclaration(v) : v;
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
  docCache?: readonly DocTag[];
  constructor(
    ds: readonly Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    name: string | Identifier | undefined,
    ts: readonly TypeParameterDeclaration[] | undefined,
    hs: readonly HeritageClause[] | undefined,
    es: readonly qc.ClassElement[]
  ) {
    super(true, Syntax.ClassDeclaration, ts, hs, es);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(name);
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
  _statementBrand: any;
}
ClassDeclaration.prototype.kind = ClassDeclaration.kind;
qu.addMixins(ClassDeclaration, [qc.DeclarationStatement]);
export class ClassExpression extends qc.ClassLikeDeclarationBase implements qc.ClassExpression {
  static readonly kind = Syntax.ClassExpression;
  docCache?: readonly qc.DocTag[];
  constructor(
    ms: readonly Modifier[] | undefined,
    name: string | Identifier | undefined,
    ts: readonly TypeParameterDeclaration[] | undefined,
    hs: readonly HeritageClause[] | undefined,
    es: readonly qc.ClassElement[]
  ) {
    super(true, Syntax.ClassExpression, ts, hs, es);
    this.decorators = undefined;
    this.modifiers = Nodes.from(ms);
    this.name = asName(name);
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
qu.addMixins(ClassExpression, [qc.PrimaryExpression]);
export class CommaListExpression extends qc.Expression implements qc.CommaListExpression {
  static readonly kind: Syntax.CommaListExpression;
  elements: Nodes<qc.Expression>;
  constructor(es: readonly qc.Expression[]) {
    super(true);
    const flatten = (e: qc.Expression): qc.Expression | readonly qc.Expression[] => {
      if (qu.isSynthesized(e) && !is.parseTreeNode(e) && !e.original && !e.emitNode && !e.id) {
        if (e.kind === Syntax.CommaListExpression) return (<CommaListExpression>e).elements;
        if (e.is(BinaryExpression) && e.operatorToken.kind === Syntax.CommaToken) return [e.left, e.right];
      }
      return e;
    };
    this.elements = new Nodes(qu.sameFlatMap(es, flatten));
  }
  update(es: readonly qc.Expression[]) {
    return this.elements !== es ? new CommaListExpression(es).updateFrom(this) : this;
  }
}
CommaListExpression.prototype.kind = CommaListExpression.kind;
export class ComputedPropertyName extends Nobj implements qc.ComputedPropertyName {
  static readonly kind = Syntax.ComputedPropertyName;
  parent?: qc.Declaration;
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
  update(c: qc.Expression, q: qc.QuestionToken, t: qc.Expression, s: qc.ColonToken, f: qc.Expression): ConditionalExpression {
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
  parent?: qc.ClassLikeDeclaration;
  body?: qc.FunctionBody;
  constructor(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], b?: Block) {
    super(true, Syntax.Constructor, undefined, ps);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.body = b;
  }
  update(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], b?: Block) {
    return this.decorators !== ds || this.modifiers !== ms || this.parameters !== ps || this.body !== b ? new ConstructorDeclaration(ds, ms, ps, b).updateFrom(this) : this;
  }
  _classElementBrand: any;
}
ConstructorDeclaration.prototype.kind = ConstructorDeclaration.kind;
qu.addMixins(ConstructorDeclaration, [qc.ClassElement, qc.DocContainer]);
export class ConstructorTypeNode extends qc.FunctionOrConstructorTypeNodeBase implements qc.ConstructorTypeNode {
  static readonly kind = Syntax.ConstructorType;
  docCache?: readonly qc.DocTag[];
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
  docCache?: readonly qc.DocTag[];
  constructor(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: qc.TypeNode) {
    super(true, Syntax.ConstructSignature, ts, ps, t);
  }
  update(ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: qc.TypeNode) {
    return super.update(ts, ps, t);
  }
  _typeElementBrand: any;
}
ConstructSignatureDeclaration.prototype.kind = ConstructSignatureDeclaration.kind;
qu.addMixins(ConstructSignatureDeclaration, [qc.TypeElement]);
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
export class Decorator extends Nobj implements qc.Decorator {
  static readonly kind = Syntax.Decorator;
  parent?: qc.NamedDeclaration;
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
export class DefaultClause extends Nobj implements qc.DefaultClause {
  static readonly kind = Syntax.DefaultClause;
  parent?: CaseBlock;
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
export class Doc extends Nobj implements qc.Doc {
  static readonly kind = Syntax.DocComment;
  parent?: qc.HasDoc;
  tags?: Nodes<qc.DocTag>;
  comment?: string;
  constructor(c?: string, ts?: Nodes<qc.DocTag>) {
    super(true);
    this.comment = c;
    this.tags = ts;
  }
}
Doc.prototype.kind = Doc.kind;
export class DocAllType extends qc.DocType implements qc.DocAllType {
  static readonly kind = Syntax.DocAllType;
}
DocAllType.prototype.kind = DocAllType.kind;
export class DocAugmentsTag extends qc.DocTag implements qc.DocAugmentsTag {
  static readonly kind = Syntax.DocAugmentsTag;
  class: ExpressionWithTypeArguments & { expression: Identifier | qc.PropertyAccessEntityNameExpression };
  constructor(c: DocAugmentsTag['class'], s?: string) {
    super(Syntax.DocAugmentsTag, 'augments', s);
    this.class = c;
  }
}
DocAugmentsTag.prototype.kind = DocAugmentsTag.kind;
export class DocAuthorTag extends qc.DocTag implements qc.DocAuthorTag {
  static readonly kind = Syntax.DocAuthorTag;
  constructor(c?: string) {
    super(Syntax.DocAuthorTag, 'author', c);
  }
}
DocAuthorTag.prototype.kind = DocAuthorTag.kind;
export class DocCallbackTag extends qc.DocTag implements qc.DocCallbackTag {
  static readonly kind = Syntax.DocCallbackTag;
  parent?: Doc;
  fullName?: DocNamespaceDeclaration | Identifier;
  name?: Identifier;
  typeExpression: DocSignature;
  constructor(f: DocNamespaceDeclaration | Identifier | undefined, n: Identifier | undefined, c: string | undefined, s: DocSignature) {
    super(Syntax.DocCallbackTag, 'callback', c);
    this.fullName = f;
    this.name = n;
    this.typeExpression = s;
  }
  _declarationBrand: any;
}
DocCallbackTag.prototype.kind = DocCallbackTag.kind;
qu.addMixins(DocCallbackTag, [qc.NamedDeclaration]);
export class DocClassTag extends qc.DocTag implements qc.DocClassTag {
  static readonly kind = Syntax.DocClassTag;
  constructor(c?: string) {
    super(Syntax.DocClassTag, 'class', c);
  }
}
DocClassTag.prototype.kind = DocClassTag.kind;
export class DocEnumTag extends qc.DocTag implements qc.DocEnumTag {
  static readonly kind = Syntax.DocEnumTag;
  parent?: Doc;
  typeExpression?: DocTypeExpression;
  constructor(e?: DocTypeExpression, c?: string) {
    super(Syntax.DocEnumTag, 'enum', c);
    this.typeExpression = e;
  }
  _declarationBrand: any;
}
DocEnumTag.prototype.kind = DocEnumTag.kind;
qu.addMixins(DocEnumTag, [qc.Declaration]);
export class DocFunctionType extends qc.SignatureDeclarationBase implements qc.DocFunctionType {
  docCache?: readonly qc.DocTag[];
  static readonly kind = Syntax.DocFunctionType;
  _docTypeBrand: any;
  _typeNodeBrand: any;
}
DocFunctionType.prototype.kind = DocFunctionType.kind;
qu.addMixins(DocFunctionType, [qc.DocType]);
export class DocImplementsTag extends qc.DocTag implements qc.DocImplementsTag {
  static readonly kind = Syntax.DocImplementsTag;
  class: ExpressionWithTypeArguments & { expression: Identifier | qc.PropertyAccessEntityNameExpression };
  constructor(e: DocImplementsTag['class'], c?: string) {
    super(Syntax.DocImplementsTag, 'implements', c);
    this.class = e;
  }
}
DocImplementsTag.prototype.kind = DocImplementsTag.kind;
export class DocNonNullableType extends qc.DocType implements qc.DocNonNullableType {
  static readonly kind = Syntax.DocNonNullableType;
  type!: qc.TypeNode;
}
DocNonNullableType.prototype.kind = DocNonNullableType.kind;
export class DocNullableType extends qc.DocType implements qc.DocNullableType {
  static readonly kind = Syntax.DocNullableType;
  type!: qc.TypeNode;
}
DocNullableType.prototype.kind = DocNullableType.kind;
export class DocOptionalType extends qc.DocType implements qc.DocOptionalType {
  static readonly kind = Syntax.DocOptionalType;
  type!: qc.TypeNode;
}
DocOptionalType.prototype.kind = DocOptionalType.kind;
export class DocPropertyLikeTag extends qc.DocTag implements qc.DocPropertyLikeTag {
  parent?: Doc;
  name: qc.EntityName;
  typeExpression?: DocTypeExpression;
  isNameFirst: boolean;
  isBracketed: boolean;
  constructor(kind: Syntax, tagName: 'arg' | 'argument' | 'param', e: DocTypeExpression | undefined, n: qc.EntityName, isNameFirst: boolean, isBracketed: boolean, c?: string) {
    super(kind, tagName, c);
    this.typeExpression = e;
    this.name = n;
    this.isNameFirst = isNameFirst;
    this.isBracketed = isBracketed;
  }
  _declarationBrand: any;
}
qu.addMixins(DocPropertyLikeTag, [qc.Declaration]);
export class DocParameterTag extends DocPropertyLikeTag implements qc.DocParameterTag {
  static readonly kind = Syntax.DocParameterTag;
  constructor(e: DocTypeExpression | undefined, n: qc.EntityName, isNameFirst: boolean, isBracketed: boolean, c?: string) {
    super(Syntax.DocParameterTag, 'param', e, n, isNameFirst, isBracketed, c);
  }
}
DocParameterTag.prototype.kind = DocParameterTag.kind;
export class DocPrivateTag extends qc.DocTag implements qc.DocPrivateTag {
  static readonly kind = Syntax.DocPrivateTag;
  constructor() {
    super(Syntax.DocPrivateTag, 'private');
  }
}
DocPrivateTag.prototype.kind = DocPrivateTag.kind;
export class DocPropertyTag extends DocPropertyLikeTag implements qc.DocPropertyTag {
  static readonly kind = Syntax.DocPropertyTag;
  constructor(e: DocTypeExpression | undefined, n: qc.EntityName, isNameFirst: boolean, isBracketed: boolean, c?: string) {
    super(Syntax.DocPropertyTag, 'param', e, n, isNameFirst, isBracketed, c);
  }
}
DocPropertyTag.prototype.kind = DocPropertyTag.kind;
export class DocProtectedTag extends qc.DocTag implements qc.DocProtectedTag {
  static readonly kind = Syntax.DocProtectedTag;
  constructor() {
    super(Syntax.DocProtectedTag, 'protected');
  }
}
DocProtectedTag.prototype.kind = DocProtectedTag.kind;
export class DocPublicTag extends qc.DocTag implements qc.DocPublicTag {
  static readonly kind = Syntax.DocPublicTag;
  constructor() {
    super(Syntax.DocPublicTag, 'public');
  }
}
DocPublicTag.prototype.kind = DocPublicTag.kind;
export class DocReadonlyTag extends qc.DocTag implements qc.DocReadonlyTag {
  static readonly kind = Syntax.DocReadonlyTag;
  constructor() {
    super(Syntax.DocReadonlyTag, 'readonly');
  }
}
DocReadonlyTag.prototype.kind = DocReadonlyTag.kind;
export class DocReturnTag extends qc.DocTag implements qc.DocReturnTag {
  static readonly kind = Syntax.DocReturnTag;
  typeExpression?: DocTypeExpression;
  constructor(e?: DocTypeExpression, c?: string) {
    super(Syntax.DocReturnTag, 'returns', c);
    this.typeExpression = e;
  }
}
DocReturnTag.prototype.kind = DocReturnTag.kind;
export class DocSignature extends qc.DocType implements qc.DocSignature {
  static readonly kind = Syntax.DocSignature;
  typeParameters?: readonly DocTemplateTag[];
  parameters: readonly DocParameterTag[];
  type?: DocReturnTag;
  constructor(ts: readonly DocTemplateTag[] | undefined, ps: readonly DocParameterTag[], t?: DocReturnTag) {
    super(true);
    this.typeParameters = ts;
    this.parameters = ps;
    this.type = t;
  }
  _declarationBrand: any;
}
DocSignature.prototype.kind = DocSignature.kind;
qu.addMixins(DocSignature, [qc.Declaration]);
export class DocTemplateTag extends qc.DocTag implements qc.DocTemplateTag {
  static readonly kind = Syntax.DocTemplateTag;
  constraint?: DocTypeExpression;
  typeParameters: Nodes<TypeParameterDeclaration>;
  constructor(c: DocTypeExpression | undefined, ts: readonly TypeParameterDeclaration[], s?: string) {
    super(Syntax.DocTemplateTag, 'template', s);
    this.constraint = c;
    this.typeParameters = Nodes.from(ts);
  }
}
DocTemplateTag.prototype.kind = DocTemplateTag.kind;
export class DocThisTag extends qc.DocTag implements qc.DocThisTag {
  static readonly kind = Syntax.DocThisTag;
  typeExpression?: DocTypeExpression;
  constructor(e?: DocTypeExpression) {
    super(Syntax.DocThisTag, 'this');
    this.typeExpression = e;
  }
}
DocThisTag.prototype.kind = DocThisTag.kind;
export class DocTypedefTag extends qc.DocTag implements qc.DocTypedefTag {
  static readonly kind = Syntax.DocTypedefTag;
  parent?: Doc;
  fullName?: DocNamespaceDeclaration | Identifier;
  name?: Identifier;
  typeExpression?: DocTypeExpression | DocTypeLiteral;
  constructor(f?: DocNamespaceDeclaration | Identifier, n?: Identifier, c?: string, t?: DocTypeExpression | DocTypeLiteral) {
    super(Syntax.DocTypedefTag, 'typedef', c);
    this.fullName = f;
    this.name = n;
    this.typeExpression = t;
  }
  _declarationBrand: any;
}
DocTypedefTag.prototype.kind = DocTypedefTag.kind;
qu.addMixins(DocTypedefTag, [qc.NamedDeclaration]);
export class DocTypeExpression extends qc.TypeNode implements qc.DocTypeExpression {
  static readonly kind = Syntax.DocTypeExpression;
  type: qc.TypeNode;
  constructor(t: qc.TypeNode) {
    super(true);
    this.type = t;
  }
}
DocTypeExpression.prototype.kind = DocTypeExpression.kind;
export class DocTypeLiteral extends qc.DocType implements qc.DocTypeLiteral {
  static readonly kind = Syntax.DocTypeLiteral;
  docPropertyTags?: readonly DocPropertyLikeTag[];
  isArrayType?: boolean;
  constructor(ts?: readonly DocPropertyLikeTag[], isArray?: boolean) {
    super(true);
    this.docPropertyTags = ts;
    this.isArrayType = isArray;
  }
}
DocTypeLiteral.prototype.kind = DocTypeLiteral.kind;
export class DocTypeTag extends qc.DocTag implements qc.DocTypeTag {
  static readonly kind = Syntax.DocTypeTag;
  typeExpression: DocTypeExpression;
  constructor(e: DocTypeExpression, c?: string) {
    super(Syntax.DocTypeTag, 'type', c);
    this.typeExpression = e;
  }
}
DocTypeTag.prototype.kind = DocTypeTag.kind;
export class DocUnknownType extends qc.DocType implements qc.DocUnknownType {
  static readonly kind = Syntax.DocUnknownType;
}
DocUnknownType.prototype.kind = DocUnknownType.kind;
export class DocVariadicType extends qc.DocType implements qc.DocVariadicType {
  static readonly kind = Syntax.DocVariadicType;
  type: qc.TypeNode;
  constructor(t: qc.TypeNode) {
    super(true);
    this.type = t;
  }
  update(t: qc.TypeNode): DocVariadicType {
    return this.type !== t ? new DocVariadicType(t).updateFrom(this) : this;
  }
}
DocVariadicType.prototype.kind = DocVariadicType.kind;
export class JsxAttribute extends qc.ObjectLiteralElement implements qc.JsxAttribute {
  static readonly kind = Syntax.JsxAttribute;
  parent?: JsxAttributes;
  name: Identifier;
  initer?: StringLiteral | JsxExpression;
  constructor(n: Identifier, i: StringLiteral | JsxExpression) {
    super(true);
    this.name = n;
    this.initer = i;
  }
  update(n: Identifier, i: StringLiteral | JsxExpression) {
    return this.name !== n || this.initer !== i ? new JsxAttribute(n, i).updateFrom(this) : this;
  }
}
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
  update(e: qc.Expression, a: qc.Expression): ElementAccessExpression {
    if (is.optionalChain(this)) return this.update(e, a, this.questionDotToken);
    return this.expression !== e || this.argumentExpression !== a ? new ElementAccessExpression(e, a).updateFrom(this) : this;
  }
}
ElementAccessExpression.prototype.kind = ElementAccessExpression.kind;
export class ElementAccessChain extends ElementAccessExpression implements qc.ElementAccessChain {
  _optionalChainBrand: any;
  constructor(e: qc.Expression, q: qc.QuestionDotToken | undefined, i: number | qc.Expression) {
    super(e, i);
    this.flags |= NodeFlags.OptionalChain;
    this.questionDotToken = q;
  }
  update(e: qc.Expression, a: qc.Expression, q?: qc.QuestionDotToken) {
    qu.assert(!!(this.flags & NodeFlags.OptionalChain));
    return this.expression !== e || this.questionDotToken !== q || this.argumentExpression !== a ? new ElementAccessChain(e, q, a).updateFrom(this) : this;
  }
}
ElementAccessChain.prototype.kind = ElementAccessChain.kind;
export class EmptyStatement extends qc.Statement implements qc.EmptyStatement {
  static readonly kind = Syntax.EmptyStatement;
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
  constructor(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, n: string | Identifier, es: readonly qc.EnumMember[]) {
    super();
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(n);
    this.members = new Nodes(es);
  }
  docCache?: readonly DocTag[] | undefined;
  update(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, n: Identifier, es: readonly qc.EnumMember[]) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== n || this.members !== es ? new EnumDeclaration(ds, ms, n, es).updateFrom(this) : this;
  }
  _statementBrand: any;
}
EnumDeclaration.prototype.kind = EnumDeclaration.kind;
qu.addMixins(EnumDeclaration, [qc.DocContainer]);
export class EnumMember extends qc.NamedDeclaration implements qc.EnumMember {
  static readonly kind = Syntax.EnumMember;
  parent?: EnumDeclaration;
  name: qc.PropertyName;
  initer?: qc.Expression;
  constructor(n: string | qc.PropertyName, i?: qc.Expression) {
    super();
    this.name = asName(n);
    this.initer = i && parenthesize.expressionForList(i);
  }
  updateEnumMember(n: qc.PropertyName, i?: qc.Expression) {
    return this.name !== n || this.initer !== i ? new EnumMember(n, i).updateFrom(this) : this;
  }
}
EnumMember.prototype.kind = EnumMember.kind;
qu.addMixins(EnumMember, [qc.DocContainer]);
export class ExportAssignment extends qc.DeclarationStatement implements qc.ExportAssignment {
  static readonly kind = Syntax.ExportAssignment;
  parent?: qc.SourceFile;
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
  parent?: SourceFile | ModuleBlock;
  isTypeOnly: boolean;
  exportClause?: qc.NamedExportBindings;
  moduleSpecifier?: qc.Expression;
  docCache?: readonly qc.DocTag[];
  constructor(ds?: readonly Decorator[], ms?: readonly Modifier[], e?: qc.NamedExportBindings, m?: qc.Expression, t = false) {
    super();
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.isTypeOnly = t;
    this.exportClause = e;
    this.moduleSpecifier = m;
  }
  createExternalModuleExport(exportName: Identifier) {
    return new ExportDeclaration(undefined, undefined, new NamedExports([new ExportSpecifier(undefined, exportName)]));
  }
  createEmptyExports() {
    return new ExportDeclaration(undefined, undefined, new NamedExports([]), undefined);
  }
  update(ds?: readonly Decorator[], ms?: readonly Modifier[], e?: qc.NamedExportBindings, m?: qc.Expression, t = false) {
    return this.decorators !== ds || this.modifiers !== ms || this.isTypeOnly !== t || this.exportClause !== e || this.moduleSpecifier !== m
      ? new ExportDeclaration(ds, ms, e, m, t).updateFrom(this)
      : this;
  }
  _statementBrand: any;
}
ExportDeclaration.prototype.kind = ExportDeclaration.kind;
qu.addMixins(ExportDeclaration, [qc.DocContainer]);
export class ExportSpecifier extends qc.NamedDeclaration implements qc.ExportSpecifier {
  static readonly kind = Syntax.ExportSpecifier;
  parent?: NamedExports;
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
qu.addMixins(ExpressionStatement, [qc.DocContainer]);
export class ExpressionWithTypeArguments extends qc.NodeWithTypeArguments implements qc.ExpressionWithTypeArguments {
  static readonly kind = Syntax.ExpressionWithTypeArguments;
  parent?: HeritageClause | DocAugmentsTag | DocImplementsTag;
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
export class ExternalModuleReference extends Nobj implements qc.ExternalModuleReference {
  static readonly kind = Syntax.ExternalModuleReference;
  parent?: ImportEqualsDeclaration;
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
  initer: qc.ForIniter;
  expression: qc.Expression;
  constructor(i: qc.ForIniter, e: qc.Expression, s: qc.Statement) {
    super(true);
    this.initer = i;
    this.expression = e;
    this.statement = asEmbeddedStatement(s);
  }
  update(i: qc.ForIniter, e: qc.Expression, s: qc.Statement) {
    return this.initer !== i || this.expression !== e || this.statement !== s ? new ForInStatement(i, e, s).updateFrom(this) : this;
  }
}
ForInStatement.prototype.kind = ForInStatement.kind;
export class ForOfStatement extends qc.IterationStatement implements qc.ForOfStatement {
  static readonly kind = Syntax.ForOfStatement;
  awaitModifier?: qc.AwaitKeywordToken;
  initer: qc.ForIniter;
  expression: qc.Expression;
  constructor(a: qc.AwaitKeywordToken | undefined, i: qc.ForIniter, e: qc.Expression, s: qc.Statement) {
    super(true);
    this.awaitModifier = a;
    this.initer = i;
    this.expression = e.isCommaSequence() ? new ParenthesizedExpression(e) : e;
    this.statement = asEmbeddedStatement(s);
  }
  update(a: qc.AwaitKeywordToken | undefined, i: qc.ForIniter, e: qc.Expression, s: qc.Statement) {
    return this.awaitModifier !== a || this.initer !== i || this.expression !== e || this.statement !== s ? new ForOfStatement(a, i, e, s).updateFrom(this) : this;
  }
}
ForOfStatement.prototype.kind = ForOfStatement.kind;
export class ForStatement extends qc.IterationStatement implements qc.ForStatement {
  static readonly kind = Syntax.ForStatement;
  initer?: qc.ForIniter;
  condition?: qc.Expression;
  incrementor?: qc.Expression;
  constructor(i: qc.ForIniter | undefined, c: qc.Expression | undefined, inc: qc.Expression | undefined, s: qc.Statement) {
    super(true);
    this.initer = i;
    this.condition = c;
    this.incrementor = inc;
    this.statement = asEmbeddedStatement(s);
  }
  update(i: qc.ForIniter | undefined, c: qc.Expression | undefined, inc: qc.Expression | undefined, s: qc.Statement) {
    return this.initer !== i || this.condition !== c || this.incrementor !== inc || this.statement !== s ? new ForStatement(i, c, inc, s).updateFrom(this) : this;
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
    super(true, Syntax.FunctionDeclaration, ts, ps, t);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.asteriskToken = a;
    this.name = asName(name);
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
  toExpression() {
    if (!this.body) return qu.fail();
    const e = new FunctionExpression(this.modifiers, this.asteriskToken, this.name, this.typeParameters, this.parameters, this.type, this.body);
    e.setOriginal(this);
    e.setRange(this);
    if (getStartsOnNewLine(this)) setStartsOnNewLine(e, true);
    aggregateTransformFlags(e);
    return e;
  }
  _statementBrand: any;
}
FunctionDeclaration.prototype.kind = FunctionDeclaration.kind;
qu.addMixins(FunctionDeclaration, [qc.DeclarationStatement]);
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
    super(true, Syntax.FunctionExpression, ts, ps, t);
    this.modifiers = Nodes.from(ms);
    this.asteriskToken = a;
    this.name = asName(name);
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
  _primaryExpressionBrand: any;
  _memberExpressionBrand: any;
  _leftHandSideExpressionBrand: any;
  _updateExpressionBrand: any;
  _unaryExpressionBrand: any;
  _expressionBrand: any;
}
FunctionExpression.prototype.kind = FunctionExpression.kind;
qu.addMixins(FunctionExpression, [qc.PrimaryExpression, qc.DocContainer]);
export class FunctionTypeNode extends qc.FunctionOrConstructorTypeNodeBase implements qc.FunctionTypeNode {
  static readonly kind = Syntax.FunctionType;
  docCache?: readonly qc.DocTag[];
  constructor(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: qc.TypeNode) {
    super(true, Syntax.FunctionType, ts, ps, t);
  }
  update(ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: qc.TypeNode) {
    return super.update(ts, ps, t);
  }
  _typeNodeBrand: any;
}
FunctionTypeNode.prototype.kind = FunctionTypeNode.kind;
export class GetAccessorDeclaration extends qc.FunctionLikeDeclarationBase implements qc.GetAccessorDeclaration {
  static readonly kind = Syntax.GetAccessor;
  parent?: qc.ClassLikeDeclaration | ObjectLiteralExpression;
  name: qc.PropertyName;
  body?: qc.FunctionBody;
  asteriskToken?: qc.AsteriskToken;
  questionToken?: qc.QuestionToken;
  exclamationToken?: qc.ExclamationToken;
  endFlowNode?: qc.FlowStart | qc.FlowLabel | qc.FlowAssignment | qc.FlowCall | qc.FlowCondition | qc.FlowSwitchClause | qc.FlowArrayMutation | qc.FlowReduceLabel;
  returnFlowNode?: qc.FlowStart | qc.FlowLabel | qc.FlowAssignment | qc.FlowCall | qc.FlowCondition | qc.FlowSwitchClause | qc.FlowArrayMutation | qc.FlowReduceLabel;
  docCache?: readonly DocTag[];
  constructor(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | qc.PropertyName, ps: readonly ParameterDeclaration[], t?: qc.TypeNode, b?: Block) {
    super(true, Syntax.GetAccessor, undefined, ps, t);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(p);
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
  _functionLikeDeclarationBrand: any;
  _classElementBrand: any;
  _objectLiteralBrand: any;
}
GetAccessorDeclaration.prototype.kind = GetAccessorDeclaration.kind;
qu.addMixins(GetAccessorDeclaration, [qc.ClassElement, qc.ObjectLiteralElement, qc.DocContainer]);
export class HeritageClause extends Nobj implements qc.HeritageClause {
  static readonly kind = Syntax.HeritageClause;
  parent?: InterfaceDeclaration | qc.ClassLikeDeclaration;
  token: Syntax.ExtendsKeyword | Syntax.ImplementsKeyword;
  types: Nodes<ExpressionWithTypeArguments>;
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
  escapedText!: qu.__String;
  autoGenerateFlags = qc.GeneratedIdentifierFlags.None;
  typeArguments?: Nodes<qc.TypeNode | qc.TypeParameterDeclaration>;
  flowNode = undefined;
  originalKeywordKind?: Syntax;
  autoGenerateId = 0;
  isInDocNamespace?: boolean;
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
    return (get.emitFlags(this) & qc.EmitFlags.InternalName) !== 0;
  }
  isLocalName() {
    return (get.emitFlags(this) & qc.EmitFlags.LocalName) !== 0;
  }
  isExportName() {
    return (get.emitFlags(this) & qc.EmitFlags.ExportName) !== 0;
  }
  update(ts?: Nodes<qc.TypeNode | TypeParameterDeclaration>) {
    return this.typeArguments !== ts ? new Identifier(this.text, ts).updateFrom(this) : this;
  }
  isIdentifierName(node: Identifier): boolean {
    let parent = node.parent;
    switch (parent.kind) {
      case Syntax.PropertyDeclaration:
      case Syntax.PropertySignature:
      case Syntax.MethodDeclaration:
      case Syntax.MethodSignature:
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
      case Syntax.EnumMember:
      case Syntax.PropertyAssignment:
      case Syntax.PropertyAccessExpression:
        return (<NamedDeclaration | PropertyAccessExpression>parent).name === node;
      case Syntax.QualifiedName:
        if ((<QualifiedName>parent).right === node) {
          while (parent.kind === Syntax.QualifiedName) {
            parent = parent.parent;
          }
          return parent.kind === Syntax.TypeQuery || parent.kind === Syntax.TypeReference;
        }
        return false;
      case Syntax.BindingElement:
      case Syntax.ImportSpecifier:
        return (<BindingElement | ImportSpecifier>parent).propertyName === node;
      case Syntax.ExportSpecifier:
      case Syntax.JsxAttribute:
        return true;
    }
    return false;
  }
  isIdentifierANonContextualKeyword({ originalKeywordKind }: Identifier): boolean {
    return !!originalKeywordKind && !syntax.is.contextualKeyword(originalKeywordKind);
  }
  isPushOrUnshiftIdentifier(node: Identifier) {
    return node.escapedText === 'push' || node.escapedText === 'unshift';
  }
  isThisNodeKind(Identifier, node: Node | undefined): boolean {
    return !!node && node.kind === Syntax.Identifier && identifierIsThisKeyword(node as Identifier);
  }
  identifierIsThisKeyword(id: Identifier): boolean {
    return id.originalKeywordKind === Syntax.ThisKeyword;
  }
  isDeclarationNameOfEnumOrNamespace(node: Identifier) {
    const parseNode = get.parseTreeOf(node);
    if (parseNode) {
      switch (parseNode.parent.kind) {
        case Syntax.EnumDeclaration:
        case Syntax.ModuleDeclaration:
          return parseNode === (<EnumDeclaration | ModuleDeclaration>parseNode.parent).name;
      }
    }
    return false;
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
    const n = new Identifier(o && is.kind(Identifier, o) ? qc.idText(o) : '');
    n.autoGenerateFlags = qc.GeneratedIdentifierFlags.Node | f!;
    n.autoGenerateId = nextAutoGenerateId;
    n.original = o;
    nextAutoGenerateId++;
    return n;
  }
  static getNamespaceMemberName(ns: Identifier, i: Identifier, comments?: boolean, sourceMaps?: boolean): PropertyAccessExpression {
    const n = new PropertyAccessExpression(ns, qu.isSynthesized(i) ? i : getSynthesizedClone(i));
    n.setRange(i);
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
      return is.generatedIdentifier(n) ? n : new Identifier(getSourceTextOfNodeFromSourceFile(sourceFile, n) || qc.idText(n));
    }
    if (d.kind === Syntax.ImportDeclaration && d.importClause) return getGeneratedNameForNode(d);
    if (d.kind === Syntax.ExportDeclaration && d.moduleSpecifier) return getGeneratedNameForNode(d);
    return;
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
qu.addMixins(Identifier, [qc.Declaration, qc.PrimaryExpression]);
export class GeneratedIdentifier extends Identifier implements qc.GeneratedIdentifier {}
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
  parent?: ImportDeclaration;
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
  parent?: SourceFile | ModuleBlock;
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
  parent?: SourceFile | ModuleBlock;
  name: Identifier;
  moduleReference: qc.ModuleReference;
  docCache?: readonly DocTag[] | undefined;
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
  _statementBrand: any;
}
ImportEqualsDeclaration.prototype.kind = ImportEqualsDeclaration.kind;
export class ImportSpecifier extends qc.NamedDeclaration implements qc.ImportSpecifier {
  static readonly kind = Syntax.ImportSpecifier;
  parent?: NamedImports;
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
  parent?: qc.ObjectTypeDeclaration;
  docCache?: readonly qc.DocTag[];
  constructor(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], t: qc.TypeNode) {
    super(true, Syntax.IndexSignature, undefined, ps, t);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
  }
  questionToken?: qc.QuestionToken | undefined;
  update(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], t: qc.TypeNode) {
    return this.parameters !== ps || this.type !== t || this.decorators !== ds || this.modifiers !== ms ? new IndexSignatureDeclaration(ds, ms, ps, t).updateFrom(this) : this;
  }
  _classElementBrand: any;
  _typeElementBrand: any;
}
IndexSignatureDeclaration.prototype.kind = IndexSignatureDeclaration.kind;
qu.addMixins(IndexSignatureDeclaration, [qc.ClassElement, qc.TypeElement]);
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
export class InputFiles extends Nobj implements qc.InputFiles {
  static readonly kind = Syntax.InputFiles;
  javascriptPath?: string;
  javascriptText: string;
  javascriptMapPath?: string;
  javascriptMapText?: string;
  declarationPath?: string;
  declarationText: string;
  declarationMapPath?: string;
  declarationMapText?: string;
  buildInfoPath?: string;
  buildInfo?: qc.BuildInfo;
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
    buildInfo?: qc.BuildInfo,
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
    buildInfo?: qc.BuildInfo,
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
      let buildInfo: qc.BuildInfo | false;
      const getAndCacheBuildInfo = (getText: () => string | undefined) => {
        if (buildInfo === undefined) {
          const r = getText();
          buildInfo = r !== undefined ? getBuildInfo(r) : false;
        }
        return buildInfo || undefined;
      };
      this.javascriptPath = declarationTextOrJavascriptPath;
      this.javascriptMapPath = javascriptMapPath;
      this.declarationPath = qg.checkDefined(javascriptMapTextOrDeclarationPath);
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
export class InterfaceDeclaration extends qc.DeclarationStatement implements qc.InterfaceDeclaration {
  static readonly kind = Syntax.InterfaceDeclaration;
  name: Identifier;
  typeParameters?: Nodes<TypeParameterDeclaration>;
  heritageClauses?: Nodes<qc.HeritageClause>;
  members: Nodes<qc.TypeElement>;
  docCache?: readonly DocTag[] | undefined;
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
  _statementBrand: any;
}
InterfaceDeclaration.prototype.kind = InterfaceDeclaration.kind;
qu.addMixins(InterfaceDeclaration, [qc.DocContainer]);
export class IntersectionTypeNode extends UnionOrIntersectionTypeNode implements qc.IntersectionTypeNode {
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
JsxAttribute.prototype.kind = JsxAttribute.kind;
export class JsxAttributes extends qc.ObjectLiteralExpressionBase<qc.JsxAttributeLike> implements qc.JsxAttributes {
  static readonly kind = Syntax.JsxAttributes;
  parent?: qc.JsxOpeningLikeElement;
  constructor(ps: readonly qc.JsxAttributeLike[]) {
    super(true);
    this.properties = new Nodes(ps);
  }
  update(ps: readonly qc.JsxAttributeLike[]) {
    return this.properties !== ps ? new JsxAttributes(ps).updateFrom(this) : this;
  }
  _declarationBrand: any;
}
JsxAttributes.prototype.kind = JsxAttributes.kind;
export class JsxClosingElement extends Nobj implements qc.JsxClosingElement {
  static readonly kind = Syntax.JsxClosingElement;
  parent?: JsxElement;
  tagName: qc.JsxTagNameExpression;
  constructor(e: qc.JsxTagNameExpression) {
    super(true);
    this.tagName = e;
  }
  update(e: qc.JsxTagNameExpression) {
    return this.tagName !== e ? new JsxClosingElement(e).updateFrom(this) : this;
  }
}
JsxClosingElement.prototype.kind = JsxClosingElement.kind;
export class JsxClosingFragment extends qc.Expression implements qc.JsxClosingFragment {
  static readonly kind = Syntax.JsxClosingFragment;
  parent?: JsxFragment;
  constructor() {
    super(true);
  }
}
JsxClosingFragment.prototype.kind = JsxClosingFragment.kind;
export class JsxElement extends qc.PrimaryExpression implements qc.JsxElement {
  static readonly kind = Syntax.JsxElement;
  openingElement: JsxOpeningElement;
  children: Nodes<qc.JsxChild>;
  closingElement: JsxClosingElement;
  constructor(o: JsxOpeningElement, cs: readonly qc.JsxChild[], c: JsxClosingElement) {
    super(true);
    this.openingElement = o;
    this.children = new Nodes(cs);
    this.closingElement = c;
  }
  update(o: JsxOpeningElement, cs: readonly qc.JsxChild[], c: JsxClosingElement) {
    return this.openingElement !== o || this.children !== cs || this.closingElement !== c ? new JsxElement(o, cs, c).updateFrom(this) : this;
  }
  static createExpression(
    jsxFactoryEntity: qc.EntityName | undefined,
    reactNamespace: string,
    tagName: qc.Expression,
    props: qc.Expression,
    children: readonly qc.Expression[],
    parentElement: qc.JsxOpeningLikeElement,
    location: qu.TextRange
  ): qc.LeftHandSideExpression {
    const argumentsList = [tagName];
    if (props) argumentsList.push(props);
    if (children && children.length > 0) {
      if (!props) argumentsList.push(new NullLiteral());
      if (children.length > 1) {
        for (const c of children) {
          startOnNewLine(c);
          argumentsList.push(c);
        }
      } else argumentsList.push(children[0]);
    }
    return new CallExpression(createJsxFactoryExpression(jsxFactoryEntity, reactNamespace, parentElement), undefined, argumentsList).setRange(location);
  }
}
JsxElement.prototype.kind = JsxElement.kind;
export class JsxExpression extends qc.Expression implements qc.JsxExpression {
  static readonly kind = Syntax.JsxExpression;
  parent?: JsxElement | qc.JsxAttributeLike;
  dot3Token?: qc.Dot3Token;
  expression?: qc.Expression;
  constructor(d3?: qc.Dot3Token, e?: qc.Expression) {
    super(true);
    this.dot3Token = d3;
    this.expression = e;
  }
  update(e?: qc.Expression) {
    return this.expression !== e ? new JsxExpression(this.dot3Token, e).updateFrom(this) : this;
  }
}
JsxExpression.prototype.kind = JsxExpression.kind;
export class JsxFragment extends qc.PrimaryExpression implements qc.JsxFragment {
  static readonly kind = Syntax.JsxFragment;
  openingFragment: JsxOpeningFragment;
  children: Nodes<qc.JsxChild>;
  closingFragment: JsxClosingFragment;
  constructor(o: JsxOpeningFragment, cs: readonly qc.JsxChild[], c: JsxClosingFragment) {
    super(true);
    this.openingFragment = o;
    this.children = new Nodes(cs);
    this.closingFragment = c;
  }
  update(o: JsxOpeningFragment, cs: readonly qc.JsxChild[], c: JsxClosingFragment) {
    return this.openingFragment !== o || this.children !== cs || this.closingFragment !== c ? new JsxFragment(o, cs, c).updateFrom(this) : this;
  }
  createExpressionForJsxFragment(
    jsxFactoryEntity: qc.EntityName | undefined,
    reactNamespace: string,
    children: readonly qc.Expression[],
    parentElement: JsxOpeningFragment,
    location: qu.TextRange
  ): qc.LeftHandSideExpression {
    const tagName = new qc.PropertyAccessExpression(createReactNamespace(reactNamespace, parentElement), 'Fragment');
    const argumentsList = [<qc.Expression>tagName];
    argumentsList.push(new qc.NullLiteral());
    if (children && children.length > 0) {
      if (children.length > 1) {
        for (const c of children) {
          startOnNewLine(c);
          argumentsList.push(c);
        }
      } else argumentsList.push(children[0]);
    }
    return new CallExpression(createJsxFactoryExpression(jsxFactoryEntity, reactNamespace, parentElement), undefined, argumentsList).setRange(location);
  }
}
JsxFragment.prototype.kind = JsxFragment.kind;
export class JsxOpeningElement extends qc.Expression implements qc.JsxOpeningElement {
  static readonly kind = Syntax.JsxOpeningElement;
  parent?: JsxElement;
  tagName: qc.JsxTagNameExpression;
  typeArguments?: Nodes<qc.TypeNode>;
  attributes: JsxAttributes;
  constructor(e: qc.JsxTagNameExpression, ts: readonly qc.TypeNode[] | undefined, a: JsxAttributes) {
    super(true);
    this.tagName = e;
    this.typeArguments = Nodes.from(ts);
    this.attributes = a;
  }
  update(e: qc.JsxTagNameExpression, ts: readonly qc.TypeNode[] | undefined, s: JsxAttributes) {
    return this.tagName !== e || this.typeArguments !== ts || this.attributes !== s ? new JsxOpeningElement(e, ts, s).updateFrom(this) : this;
  }
}
JsxOpeningElement.prototype.kind = JsxOpeningElement.kind;
export class JsxOpeningFragment extends qc.Expression implements qc.JsxOpeningFragment {
  static readonly kind = Syntax.JsxOpeningFragment;
  parent?: JsxFragment;
  constructor() {
    super(true);
  }
  createReactNamespace(reactNamespace: string, parent: qc.JsxOpeningLikeElement | JsxOpeningFragment) {
    const r = new Identifier(reactNamespace || 'React');
    r.flags &= ~NodeFlags.Synthesized;
    r.parent = get.parseTreeOf(parent);
    return r;
  }
  createJsxFactoryExpressionFromEntityName(jsxFactory: qc.EntityName, parent: qc.JsxOpeningLikeElement | JsxOpeningFragment): qc.Expression {
    if (is.kind(QualifiedName, jsxFactory)) {
      const left = createJsxFactoryExpressionFromEntityName(jsxFactory.left, parent);
      const right = new Identifier(qc.idText(jsxFactory.right));
      right.escapedText = jsxFactory.right.escapedText;
      return new qc.PropertyAccessExpression(left, right);
    }
    return createReactNamespace(qc.idText(jsxFactory), parent);
  }
  createJsxFactoryExpression(jsxFactoryEntity: qc.EntityName | undefined, reactNamespace: string, parent: qc.JsxOpeningLikeElement | JsxOpeningFragment): qc.Expression {
    return jsxFactoryEntity ? createJsxFactoryExpressionFromEntityName(jsxFactoryEntity, parent) : new qc.PropertyAccessExpression(createReactNamespace(reactNamespace, parent), 'createElement');
  }
}
JsxOpeningFragment.prototype.kind = JsxOpeningFragment.kind;
export class JsxSelfClosingElement extends qc.PrimaryExpression implements qc.JsxSelfClosingElement {
  static readonly kind = Syntax.JsxSelfClosingElement;
  tagName: qc.JsxTagNameExpression;
  typeArguments?: Nodes<qc.TypeNode>;
  attributes: JsxAttributes;
  constructor(e: qc.JsxTagNameExpression, ts: readonly qc.TypeNode[] | undefined, a: JsxAttributes) {
    super(true);
    this.tagName = e;
    this.typeArguments = Nodes.from(ts);
    this.attributes = a;
  }
  update(e: qc.JsxTagNameExpression, ts: readonly qc.TypeNode[] | undefined, a: JsxAttributes) {
    return this.tagName !== e || this.typeArguments !== ts || this.attributes !== a ? new JsxSelfClosingElement(e, ts, a).updateFrom(this) : this;
  }
}
JsxSelfClosingElement.prototype.kind = JsxSelfClosingElement.kind;
export class JsxSpreadAttribute extends qc.ObjectLiteralElement implements qc.JsxSpreadAttribute {
  static readonly kind = Syntax.JsxSpreadAttribute;
  parent?: JsxAttributes;
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
export class JsxText extends qc.LiteralLikeNode implements qc.JsxText {
  static readonly kind = Syntax.JsxText;
  onlyTriviaWhiteSpaces: boolean;
  parent?: JsxElement;
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
export class KeywordTypeNode extends qc.TypeNode implements qc.KeywordTypeNode {
  // prettier-ignore
  kind!: | Syntax.AnyKeyword | Syntax.UnknownKeyword | Syntax.NumberKeyword | Syntax.BigIntKeyword | Syntax.ObjectKeyword | Syntax.BooleanKeyword | Syntax.StringKeyword | Syntax.SymbolKeyword | Syntax.ThisKeyword | Syntax.VoidKeyword | Syntax.UndefinedKeyword | Syntax.NullKeyword | Syntax.NeverKeyword;
  constructor(k: KeywordTypeNode['kind']) {
    super(true, k);
  }
}
export class LabeledStatement extends qc.Statement implements qc.LabeledStatement {
  static readonly kind = Syntax.LabeledStatement;
  label: Identifier;
  statement: qc.Statement;
  constructor(l: string | Identifier, s: qc.Statement) {
    super(true);
    this.label = asName(l);
    this.statement = asEmbeddedStatement(s);
  }
  static unwrapInnermostStatementOfLabel(node: LabeledStatement, beforeUnwrapLabelCallback?: (node: LabeledStatement) => void): Statement {
    while (true) {
      if (beforeUnwrapLabelCallback) {
        beforeUnwrapLabelCallback(node);
      }
      if (node.statement.kind !== Syntax.LabeledStatement) return node.statement;
      node = <LabeledStatement>node.statement;
    }
  }
  update(l: Identifier, s: qc.Statement) {
    return this.label !== l || this.statement !== s ? new LabeledStatement(l, s).updateFrom(this) : this;
  }
}
LabeledStatement.prototype.kind = LabeledStatement.kind;
qu.addMixins(LabeledStatement, [qc.DocContainer]);
export class LiteralTypeNode extends qc.TypeNode implements qc.LiteralTypeNode {
  static readonly kind = Syntax.LiteralType;
  literal: qc.BooleanLiteral | qc.LiteralExpression | PrefixUnaryExpression;
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
  readonlyToken?: qc.ReadonlyToken | qc.PlusToken | qc.MinusToken;
  typeParameter: TypeParameterDeclaration;
  questionToken?: qc.QuestionToken | qc.PlusToken | qc.MinusToken;
  type?: qc.TypeNode;
  constructor(r: qc.ReadonlyToken | qc.PlusToken | qc.MinusToken | undefined, p: TypeParameterDeclaration, q?: qc.QuestionToken | qc.PlusToken | qc.MinusToken, t?: qc.TypeNode) {
    super(true);
    this.readonlyToken = r;
    this.typeParameter = p;
    this.questionToken = q;
    this.type = t;
  }
  update(r: qc.ReadonlyToken | qc.PlusToken | qc.MinusToken | undefined, p: TypeParameterDeclaration, q?: qc.QuestionToken | qc.PlusToken | qc.MinusToken, t?: qc.TypeNode) {
    return this.readonlyToken !== r || this.typeParameter !== p || this.questionToken !== q || this.type !== t ? new MappedTypeNode(r, p, q, t).updateFrom(this) : this;
  }
  _declarationBrand: any;
}
MappedTypeNode.prototype.kind = MappedTypeNode.kind;
qu.addMixins(MappedTypeNode, [qc.Declaration]);
export class MergeDeclarationMarker extends qc.Statement implements qc.MergeDeclarationMarker {
  static readonly kind: Syntax.MergeDeclarationMarker;
  constructor(o: Node) {
    super(true);
    this.emitNode = {} as qc.EmitNode;
    this.original = o;
  }
}
MergeDeclarationMarker.prototype.kind = MergeDeclarationMarker.kind;
export class MetaProperty extends qc.PrimaryExpression implements qc.MetaProperty {
  static readonly kind = Syntax.MetaProperty;
  keywordToken: Syntax.NewKeyword | Syntax.ImportKeyword;
  name: qc.Identifier;
  constructor(k: MetaProperty['keywordToken'], n: Identifier) {
    super(true);
    this.keywordToken = k;
    this.name = n;
  }
  update(n: Identifier) {
    return this.name !== n ? new MetaProperty(this.keywordToken, n).updateFrom(this) : this;
  }
}
MetaProperty.prototype.kind = MetaProperty.kind;
export class MethodDeclaration extends qc.FunctionLikeDeclarationBase implements qc.MethodDeclaration {
  static readonly kind = Syntax.MethodDeclaration;
  parent?: qc.ClassLikeDeclaration | ObjectLiteralExpression;
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
    super(true, Syntax.MethodDeclaration, ts, ps, t);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.asteriskToken = a;
    this.name = asName(p);
    this.questionToken = q;
    this.body = b;
  }
  update(
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
      ? new MethodDeclaration(ds, ms, a, p, q, ts, ps, t, b).updateFrom(this)
      : this;
  }
  _classElementBrand: any;
  _objectLiteralBrand: any;
}
MethodDeclaration.prototype.kind = MethodDeclaration.kind;
qu.addMixins(MethodDeclaration, [qc.ClassElement, qc.ObjectLiteralElement, qc.DocContainer]);
export class MethodSignature extends qc.SignatureDeclarationBase implements qc.MethodSignature {
  static readonly kind = Syntax.MethodSignature;
  parent?: qc.ObjectTypeDeclaration;
  name: qc.PropertyName;
  questionToken?: qc.QuestionToken;
  docCache?: readonly DocTag[];
  constructor(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t: qc.TypeNode | undefined, p: string | qc.PropertyName, q?: qc.QuestionToken) {
    super(false, Syntax.MethodSignature, ts, ps, t);
    this.name = asName(p);
    this.questionToken = q;
  }
  update(ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t: qc.TypeNode | undefined, p: qc.PropertyName, q?: qc.QuestionToken) {
    return this.typeParameters !== ts || this.parameters !== ps || this.type !== t || this.name !== p || this.questionToken !== q ? new MethodSignature(ts, ps, t, p, q).updateFrom(this) : this;
  }
  _typeElementBrand: any;
}
MethodSignature.prototype.kind = MethodSignature.kind;
qu.addMixins(MethodSignature, [qc.TypeElement]);
export class MissingDeclaration extends qc.DeclarationStatement implements qc.MissingDeclaration {
  static readonly kind = Syntax.MissingDeclaration;
  name?: Identifier;
  _statementBrand: any;
}
MissingDeclaration.prototype.kind = MissingDeclaration.kind;
export class ModuleBlock extends qc.Statement implements qc.ModuleBlock {
  static readonly kind = Syntax.ModuleBlock;
  parent?: ModuleDeclaration;
  statements: Nodes<qc.Statement>;
  constructor(ss: readonly qc.Statement[]) {
    super(true);
    this.statements = new Nodes(ss);
  }
  update(ss: readonly qc.Statement[]) {
    return this.statements !== ss ? new ModuleBlock(ss).updateFrom(this) : this;
  }
}
ModuleBlock.prototype.kind = ModuleBlock.kind;
export class ModuleDeclaration extends qc.DeclarationStatement implements qc.ModuleDeclaration {
  static readonly kind = Syntax.ModuleDeclaration;
  parent?: qc.ModuleBody | SourceFile;
  name: qc.ModuleName;
  body?: qc.ModuleBody | qc.DocNamespaceDeclaration;
  docCache?: readonly DocTag[] | undefined;
  constructor(decorators: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, name: qc.ModuleName, b?: qc.ModuleBody, flags = NodeFlags.None) {
    super(true);
    this.flags |= flags & (NodeFlags.Namespace | NodeFlags.NestedNamespace | NodeFlags.GlobalAugmentation);
    this.decorators = Nodes.from(decorators);
    this.modifiers = Nodes.from(ms);
    this.name = name;
    this.body = b;
  }
  isGlobalScopeAugmentation() {
    return !!(this.flags & NodeFlags.GlobalAugmentation);
  }
  update(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, name: qc.ModuleName, b?: qc.ModuleBody) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== name || this.body !== b ? new ModuleDeclaration(ds, ms, name, b, this.flags).updateFrom(this) : this;
  }
  _statementBrand: any;
}
ModuleDeclaration.prototype.kind = ModuleDeclaration.kind;
qu.addMixins(ModuleDeclaration, [qc.DocContainer]);
export class DocNamespaceDeclaration extends ModuleDeclaration {
  name!: Identifier;
  body?: qc.DocNamespaceBody;
}
export class NamedExports extends Nobj implements qc.NamedExports {
  static readonly kind = Syntax.NamedExports;
  parent?: ExportDeclaration;
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
export class NamedImports extends Nobj implements qc.NamedImports {
  static readonly kind = Syntax.NamedImports;
  parent?: ImportClause;
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
  dot3Token?: qc.Dot3Token;
  name: Identifier;
  questionToken?: qc.QuestionToken;
  type: qc.TypeNode;
  docCache?: readonly DocTag[] | undefined;
  constructor(d3: qc.Dot3Token | undefined, i: Identifier, q: qc.QuestionToken | undefined, t: qc.TypeNode) {
    super(true);
    this.dot3Token = d3;
    this.name = i;
    this.questionToken = q;
    this.type = t;
  }
  update(d3: qc.Dot3Token | undefined, i: Identifier, q: qc.QuestionToken | undefined, t: qc.TypeNode) {
    return this.dot3Token !== d3 || this.name !== i || this.questionToken !== q || this.type !== t ? new NamedTupleMember(d3, i, q, t).updateFrom(this) : this;
  }
  _declarationBrand: any;
}
NamedTupleMember.prototype.kind = NamedTupleMember.kind;
qu.addMixins(NamedTupleMember, [qc.Declaration, qc.DocContainer]);
export class NamespaceExport extends qc.NamedDeclaration implements qc.NamespaceExport {
  static readonly kind = Syntax.NamespaceExport;
  parent?: ExportDeclaration;
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
  _statementBrand: any;
}
NamespaceExportDeclaration.prototype.kind = NamespaceExportDeclaration.kind;
export class NamespaceImport extends qc.NamedDeclaration implements qc.NamespaceImport {
  static readonly kind = Syntax.NamespaceImport;
  parent?: ImportClause;
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
qu.addMixins(NewExpression, [qc.Declaration]);
export class NonNullExpression extends qc.LeftHandSideExpression implements qc.NonNullExpression {
  static readonly kind = Syntax.NonNullExpression;
  expression: qc.Expression;
  constructor(e: qc.Expression) {
    super(true);
    this.expression = parenthesize.forAccess(e);
  }
  update(e: qc.Expression) {
    if (is.nonNullChain(this)) return this.update(e);
    return this.expression !== e ? new NonNullExpression(e).updateFrom(this) : this;
  }
}
NonNullExpression.prototype.kind = NonNullExpression.kind;
export class NonNullChain extends NonNullExpression implements qc.NonNullChain {
  constructor(e: qc.Expression) {
    super(e);
    this.flags |= NodeFlags.OptionalChain;
  }
  update(e: qc.Expression) {
    qu.assert(!!(this.flags & NodeFlags.OptionalChain));
    return this.expression !== e ? new NonNullChain(e).updateFrom(this) : this;
  }
  _optionalChainBrand: any;
}
NonNullChain.prototype.kind = NonNullChain.kind;
export class NoSubstitutionLiteral extends qc.TemplateLiteralLikeNode implements qc.NoSubstitutionLiteral {
  static readonly kind = Syntax.NoSubstitutionLiteral;
  templateFlags?: qc.TokenFlags;
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
qu.addMixins(NoSubstitutionLiteral, [qc.LiteralExpression, qc.Declaration]);
export class NotEmittedStatement extends qc.Statement implements qc.NotEmittedStatement {
  static readonly kind = Syntax.NotEmittedStatement;
  constructor(o: Node) {
    super(true);
    this.original = o;
    this.setRange(o);
  }
}
NotEmittedStatement.prototype.kind = NotEmittedStatement.kind;
export class NumericLiteral extends qc.LiteralExpression implements qc.NumericLiteral {
  static readonly kind = Syntax.NumericLiteral;
  numericLiteralFlags: qc.TokenFlags;
  constructor(t: string, fs: qc.TokenFlags = qc.TokenFlags.None) {
    super(true);
    this.text = t;
    this.numericLiteralFlags = fs;
  }
  name(n: string | qu.__String) {
    return (+n).toString() === n;
  }
  _declarationBrand: any;
}
export class NullLiteral extends qc.PrimaryExpression implements qc.NullLiteral {
  static readonly kind = Syntax.NullKeyword;
  constructor() {
    super(true);
  }
  _typeNodeBrand: any;
}
NullLiteral.prototype.kind = NullLiteral.kind;
NumericLiteral.prototype.kind = NumericLiteral.kind;
qu.addMixins(NumericLiteral, [qc.Declaration]);
export class ObjectBindingPattern extends Nobj implements qc.ObjectBindingPattern {
  static readonly kind = Syntax.ObjectBindingPattern;
  parent?: VariableDeclaration | ParameterDeclaration | BindingElement;
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
export class ObjectLiteralExpression extends qc.ObjectLiteralExpressionBase<qc.ObjectLiteralElementLike> implements qc.ObjectLiteralExpression {
  static readonly kind = Syntax.ObjectLiteralExpression;
  multiLine?: boolean;
  constructor(ps?: readonly qc.ObjectLiteralElementLike[], multiLine?: boolean) {
    super(true);
    this.properties = new Nodes(ps);
    if (multiLine) this.multiLine = true;
  }
  update(ps?: readonly qc.ObjectLiteralElementLike[]) {
    return this.properties !== ps ? new ObjectLiteralExpression(ps, this.multiLine).updateFrom(this) : this;
  }
}
ObjectLiteralExpression.prototype.kind = ObjectLiteralExpression.kind;
export class OmittedExpression extends qc.Expression implements qc.OmittedExpression {
  static readonly kind = Syntax.OmittedExpression;
  constructor() {
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
  export function isOuterExpression(n: Node, ks = qc.OuterExpressionKinds.All): n is qc.OuterExpression {
    switch (n.kind) {
      case Syntax.ParenthesizedExpression:
        return (ks & qc.OuterExpressionKinds.Parentheses) !== 0;
      case Syntax.TypeAssertionExpression:
      case Syntax.AsExpression:
        return (ks & qc.OuterExpressionKinds.TypeAssertions) !== 0;
      case Syntax.NonNullExpression:
        return (ks & qc.OuterExpressionKinds.NonNullAssertions) !== 0;
      case Syntax.PartiallyEmittedExpression:
        return (ks & qc.OuterExpressionKinds.PartiallyEmittedExpressions) !== 0;
    }
    return false;
  }
  export function skipOuterExpressions(n: qc.Expression, ks?: qc.OuterExpressionKinds): qc.Expression;
  export function skipOuterExpressions(n: Node, ks?: qc.OuterExpressionKinds): Node;
  export function skipOuterExpressions(n: Node, ks = qc.OuterExpressionKinds.All) {
    while (isOuterExpression(n, ks)) {
      n = n.expression;
    }
    return n;
  }
  export function skipAssertions(n: qc.Expression): qc.Expression;
  export function skipAssertions(n: Node): Node;
  export function skipAssertions(n: Node): Node {
    return skipOuterExpressions(n, qc.OuterExpressionKinds.Assertions);
  }
  export function updateOuterExpression(o: qc.OuterExpression, e: qc.Expression) {
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
  export function isIgnorableParen(n: qc.Expression) {
    return (
      n.kind === Syntax.ParenthesizedExpression &&
      qu.isSynthesized(n) &&
      qu.isSynthesized(getSourceMapRange(n)) &&
      qu.isSynthesized(getCommentRange(n)) &&
      !qu.some(getSyntheticLeadingComments(n)) &&
      !qu.some(getSyntheticTrailingComments(n))
    );
  }
  export function recreateOuterExpressions(o: qc.Expression | undefined, i: qc.Expression, ks = qc.OuterExpressionKinds.All): qc.Expression {
    if (o && isOuterExpression(o, ks) && !isIgnorableParen(o)) return o.update(recreateOuterExpressions(o.expression, i));
    return i;
  }
}
export class ParameterDeclaration extends qc.NamedDeclaration implements qc.ParameterDeclaration {
  static readonly kind = Syntax.Parameter;
  parent?: qc.SignatureDeclaration;
  dot3Token?: qc.Dot3Token;
  name: qc.BindingName;
  questionToken?: qc.QuestionToken;
  type?: qc.TypeNode;
  initer?: qc.Expression;
  constructor(
    ds: readonly Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    d3: qc.Dot3Token | undefined,
    name: string | qc.BindingName,
    q?: qc.QuestionToken,
    t?: qc.TypeNode,
    i?: qc.Expression
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
    ds: readonly Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    d3: qc.Dot3Token | undefined,
    name: string | qc.BindingName,
    q?: qc.QuestionToken,
    t?: qc.TypeNode,
    i?: qc.Expression
  ) {
    return this.decorators !== ds || this.modifiers !== ms || this.dot3Token !== d3 || this.name !== name || this.questionToken !== q || this.type !== t || this.initer !== i
      ? new ParameterDeclaration(ds, ms, d3, name, q, t, i).updateFrom(this)
      : this;
  }
}
ParameterDeclaration.prototype.kind = ParameterDeclaration.kind;
qu.addMixins(ParameterDeclaration, [qc.DocContainer]);
export class ParenthesizedExpression extends qc.PrimaryExpression implements qc.ParenthesizedExpression {
  static readonly kind = Syntax.ParenthesizedExpression;
  expression: qc.Expression;
  constructor(e: qc.Expression) {
    super(true);
    this.expression = e;
  }
  update(e: qc.Expression) {
    return this.expression !== e ? new ParenthesizedExpression(e).updateFrom(this) : this;
  }
}
qu.addMixins(ParenthesizedExpression, [qc.DocContainer]);
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
  constructor(e: qc.Expression, o?: Node) {
    super(true);
    this.expression = e;
    this.original = o;
    this.setRange(o);
  }
  update(e: qc.Expression) {
    return this.expression !== e ? new PartiallyEmittedExpression(e, this.original as Node).updateFrom(this) : this;
  }
}
PartiallyEmittedExpression.prototype.kind = PartiallyEmittedExpression.kind;
export class PostfixUnaryExpression extends qc.UpdateExpression implements qc.PostfixUnaryExpression {
  static readonly kind = Syntax.PostfixUnaryExpression;
  operand: qc.LeftHandSideExpression;
  operator: qc.PostfixUnaryOperator;
  static increment(e: qc.Expression) {
    return new PostfixUnaryExpression(e, Syntax.Plus2Token);
  }
  constructor(e: qc.Expression, o: qc.PostfixUnaryOperator) {
    super(true);
    this.operand = parenthesize.postfixOperand(e);
    this.operator = o;
  }
  update(e: qc.Expression) {
    return this.operand !== e ? new PostfixUnaryExpression(e, this.operator).updateFrom(this) : this;
  }
}
PostfixUnaryExpression.prototype.kind = PostfixUnaryExpression.kind;
export class PrefixUnaryExpression extends qc.UpdateExpression implements qc.PrefixUnaryExpression {
  static readonly kind = Syntax.PrefixUnaryExpression;
  operator: qc.PrefixUnaryOperator;
  operand: qc.UnaryExpression;
  static logicalNot(e: qc.Expression) {
    return new PrefixUnaryExpression(Syntax.ExclamationToken, e);
  }
  constructor(o: qc.PrefixUnaryOperator, e: qc.Expression) {
    super(true);
    this.operator = o;
    this.operand = parenthesize.prefixOperand(e);
  }
  update(e: qc.Expression) {
    return this.operand !== e ? new PrefixUnaryExpression(this.operator, e).updateFrom(this) : this;
  }
}
PrefixUnaryExpression.prototype.kind = PrefixUnaryExpression.kind;
export class PrivateIdentifier extends qc.TokenOrIdentifier implements qc.PrivateIdentifier {
  static readonly kind = Syntax.PrivateIdentifier;
  escapedText!: qu.__String;
  constructor(t: string) {
    super(true, PrivateIdentifier.kind);
    if (t[0] !== '#') qu.fail('First character of private identifier must be #: ' + t);
    this.escapedText = qy.get.escUnderscores(t);
  }
  get text(): string {
    return qc.idText(this);
  }
}
PrivateIdentifier.prototype.kind = PrivateIdentifier.kind;
export class PropertyAccessExpression extends qc.MemberExpression implements qc.PropertyAccessExpression {
  static readonly kind = Syntax.PropertyAccessExpression;
  expression: qc.LeftHandSideExpression;
  questionDotToken?: qc.QuestionDotToken;
  name: Identifier | PrivateIdentifier;
  constructor(e: qc.Expression, n: string | Identifier | PrivateIdentifier) {
    super(true);
    this.expression = parenthesize.forAccess(e);
    this.name = asName(n);
    this.setEmitFlags(qc.EmitFlags.NoIndentation);
  }
  update(e: qc.Expression, n: Identifier | PrivateIdentifier): PropertyAccessExpression {
    if (is.propertyAccessChain(this)) return this.update(e, this.questionDotToken, cast(n, isIdentifier));
    return this.expression !== e || this.name !== n ? new PropertyAccessExpression(e, n).setEmitFlags(get.emitFlags(this)).updateFrom(this) : this;
  }
  _declarationBrand: any;
}
PropertyAccessExpression.prototype.kind = PropertyAccessExpression.kind;
qu.addMixins(PropertyAccessExpression, [qc.NamedDeclaration]);
export class PropertyAccessChain extends PropertyAccessExpression implements qc.PropertyAccessChain {
  name!: Identifier;
  constructor(e: qc.Expression, q: qc.QuestionDotToken | undefined, n: string | Identifier) {
    super(e, n);
    this.flags |= NodeFlags.OptionalChain;
    this.questionDotToken = q;
  }
  update(e: qc.Expression, n: Identifier, q?: qc.QuestionDotToken) {
    qu.assert(!!(this.flags & NodeFlags.OptionalChain));
    return this.expression !== e || this.questionDotToken !== q || this.name !== n ? new PropertyAccessChain(e, q, n).setEmitFlags(get.emitFlags(this)).updateFrom(this) : this;
  }
  _optionalChainBrand: any;
}
export class PropertyAssignment extends qc.ObjectLiteralElement implements qc.PropertyAssignment {
  static readonly kind = Syntax.PropertyAssignment;
  parent?: ObjectLiteralExpression;
  name: qc.PropertyName;
  questionToken?: qc.QuestionToken;
  initer: qc.Expression;
  constructor(n: string | qc.PropertyName, i: qc.Expression) {
    super(true);
    this.name = asName(n);
    this.initer = parenthesize.expressionForList(i);
  }
  update(n: qc.PropertyName, i: qc.Expression) {
    return this.name !== n || this.initer !== i ? new PropertyAssignment(n, i).updateFrom(this) : this;
  }
}
PropertyAssignment.prototype.kind = PropertyAssignment.kind;
qu.addMixins(PropertyAssignment, [qc.DocContainer]);
export class PropertyDeclaration extends qc.ClassElement implements qc.PropertyDeclaration {
  static readonly kind = Syntax.PropertyDeclaration;
  parent?: qc.ClassLikeDeclaration;
  name: qc.PropertyName;
  questionToken?: qc.QuestionToken;
  exclamationToken?: qc.ExclamationToken;
  type?: qc.TypeNode;
  initer?: qc.Expression;
  constructor(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | qc.PropertyName, q?: qc.QuestionToken | qc.ExclamationToken, t?: qc.TypeNode, i?: qc.Expression) {
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
    ds: readonly Decorator[] | undefined,
    ms: readonly Modifier[] | undefined,
    p: string | qc.PropertyName,
    q?: qc.QuestionToken | qc.ExclamationToken,
    t?: qc.TypeNode,
    i?: qc.Expression
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
qu.addMixins(PropertyDeclaration, [qc.DocContainer]);
export class PropertySignature extends qc.TypeElement implements qc.PropertySignature {
  static readonly kind = Syntax.PropertySignature;
  name: qc.PropertyName;
  questionToken?: qc.QuestionToken;
  type?: qc.TypeNode;
  initer?: qc.Expression;
  constructor(ms: readonly Modifier[] | undefined, p: qc.PropertyName | string, q?: qc.QuestionToken, t?: qc.TypeNode, i?: qc.Expression) {
    super(true);
    this.modifiers = Nodes.from(ms);
    this.name = asName(p);
    this.questionToken = q;
    this.type = t;
    this.initer = i;
  }
  update(ms: readonly Modifier[] | undefined, p: qc.PropertyName, q?: qc.QuestionToken, t?: qc.TypeNode, i?: qc.Expression) {
    return this.modifiers !== ms || this.name !== p || this.questionToken !== q || this.type !== t || this.initer !== i ? new PropertySignature(ms, p, q, t, i).updateFrom(this) : this;
  }
}
PropertySignature.prototype.kind = PropertySignature.kind;
qu.addMixins(PropertySignature, [qc.DocContainer]);
export class QualifiedName extends Nobj implements qc.QualifiedName {
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
  constructor(e?: qc.Expression) {
    super(true);
    this.expression = e;
  }
  update(e?: qc.Expression) {
    return this.expression !== e ? new ReturnStatement(e).updateFrom(this) : this;
  }
}
ReturnStatement.prototype.kind = ReturnStatement.kind;
export class SemicolonClassElement extends qc.ClassElement implements qc.SemicolonClassElement {
  static readonly kind = Syntax.SemicolonClassElement;
  parent?: qc.ClassLikeDeclaration;
  constructor() {
    super(true);
  }
}
SemicolonClassElement.prototype.kind = SemicolonClassElement.kind;
export class SetAccessorDeclaration extends qc.FunctionLikeDeclarationBase implements qc.SetAccessorDeclaration {
  static readonly kind = Syntax.SetAccessor;
  parent?: qc.ClassLikeDeclaration | ObjectLiteralExpression;
  name: qc.PropertyName;
  body?: qc.FunctionBody;
  constructor(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | qc.PropertyName, ps: readonly ParameterDeclaration[], b?: Block) {
    super(true, Syntax.SetAccessor, undefined, ps);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(p);
    this.parameters = new Nodes(ps);
    this.body = b;
  }
  update(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: qc.PropertyName, ps: readonly ParameterDeclaration[], b?: Block) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== p || this.parameters !== ps || this.body !== b ? new SetAccessorDeclaration(ds, ms, p, ps, b).updateFrom(this) : this;
  }
  _classElementBrand: any;
  _objectLiteralBrand: any;
}
SetAccessorDeclaration.prototype.kind = SetAccessorDeclaration.kind;
qu.addMixins(SetAccessorDeclaration, [qc.ClassElement, qc.ObjectLiteralElement, qc.DocContainer]);
export class ShorthandPropertyAssignment extends qc.ObjectLiteralElement implements qc.ShorthandPropertyAssignment {
  static readonly kind = Syntax.ShorthandPropertyAssignment;
  parent?: ObjectLiteralExpression;
  name: Identifier;
  questionToken?: qc.QuestionToken;
  exclamationToken?: qc.ExclamationToken;
  equalsToken?: qc.EqualsToken;
  objectAssignmentIniter?: qc.Expression;
  constructor(n: string | Identifier, i?: qc.Expression) {
    super(true);
    this.name = asName(n);
    this.objectAssignmentIniter = i ? parenthesize.expressionForList(i) : undefined;
  }
  update(n: Identifier, i: qc.Expression | undefined) {
    return this.name !== n || this.objectAssignmentIniter !== i ? new ShorthandPropertyAssignment(n, i).updateFrom(this) : this;
  }
}
ShorthandPropertyAssignment.prototype.kind = ShorthandPropertyAssignment.kind;
qu.addMixins(ShorthandPropertyAssignment, [qc.DocContainer]);
export class SpreadElement extends qc.Expression implements qc.SpreadElement {
  static readonly kind = Syntax.SpreadElement;
  parent?: ArrayLiteralExpression | CallExpression | NewExpression;
  expression: qc.Expression;
  constructor(e: qc.Expression) {
    super(true);
    this.expression = parenthesize.expressionForList(e);
  }
  update(e: qc.Expression) {
    return this.expression !== e ? new SpreadElement(e).updateFrom(this) : this;
  }
}
SpreadElement.prototype.kind = SpreadElement.kind;
export class SpreadAssignment extends qc.ObjectLiteralElement implements qc.SpreadAssignment {
  static readonly kind = Syntax.SpreadAssignment;
  parent?: ObjectLiteralExpression;
  expression: qc.Expression;
  constructor(e: qc.Expression) {
    super(true);
    this.expression = parenthesize.expressionForList(e);
  }
  update(e: qc.Expression) {
    return this.expression !== e ? new SpreadAssignment(e).updateFrom(this) : this;
  }
}
SpreadAssignment.prototype.kind = SpreadAssignment.kind;
qu.addMixins(SpreadAssignment, [qc.DocContainer]);
export class StringLiteral extends qc.LiteralExpression implements qc.StringLiteral {
  static readonly kind = Syntax.StringLiteral;
  textSourceNode?: qc.Identifier | qc.StringLiteralLike | qc.NumericLiteral;
  singleQuote?: boolean;
  constructor(t: string) {
    super(true);
    this.text = t;
  }
  static like(n: Node): n is qc.StringLiteralLike {
    return n.kind === Syntax.StringLiteral || n.kind === Syntax.NoSubstitutionLiteral;
  }
  static orNumericLiteralLike(n: Node): n is qc.StringLiteralLike | NumericLiteral {
    return this.like(n) || n.kind === Syntax.NumericLiteral;
  }
  static orJsxExpressionKind(n: Node): n is StringLiteral | JsxExpression {
    const k = n.kind;
    return k === Syntax.StringLiteral || k === Syntax.JsxExpression;
  }
  static orNumberLiteralExpression(e: qc.Expression) {
    return this.orNumericLiteralLike(e) || (is.kind(PrefixUnaryExpression, e) && e.operator === Syntax.MinusToken && e.operand.kind === Syntax.NumericLiteral);
  }
  static fromNode(n: Exclude<qc.PropertyNameLiteral, PrivateIdentifier>): StringLiteral {
    const r = new StringLiteral(getTextOfIdentifierOrLiteral(n));
    r.textSourceNode = n;
    return r;
  }
  _declarationBrand: any;
}
StringLiteral.prototype.kind = StringLiteral.kind;
qu.addMixins(StringLiteral, [qc.Declaration]);
export class SuperExpression extends qc.PrimaryExpression implements qc.SuperExpression {
  static readonly kind = Syntax.SuperKeyword;
  constructor() {
    super(true);
  }
}
SuperExpression.prototype.kind = SuperExpression.kind;
export class SwitchStatement extends qc.Statement implements qc.SwitchStatement {
  static readonly kind = Syntax.SwitchStatement;
  expression: qc.Expression;
  caseBlock: CaseBlock;
  possiblyExhaustive?: boolean;
  constructor(e: qc.Expression, c: CaseBlock) {
    super(true);
    this.expression = parenthesize.expressionForList(e);
    this.caseBlock = c;
  }
  update(e: qc.Expression, c: CaseBlock) {
    return this.expression !== e || this.caseBlock !== c ? new SwitchStatement(e, c).updateFrom(this) : this;
  }
}
SwitchStatement.prototype.kind = SwitchStatement.kind;
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
  template: qc.TemplateLiteral;
  questionDotToken?: qc.QuestionDotToken;
  constructor(tag: qc.Expression, ts: readonly qc.TypeNode[] | undefined, template: qc.TemplateLiteral);
  constructor(tag: qc.Expression, ts?: readonly qc.TypeNode[] | qc.TemplateLiteral, template?: qc.TemplateLiteral);
  constructor(tag: qc.Expression, ts?: readonly qc.TypeNode[] | qc.TemplateLiteral, template?: qc.TemplateLiteral) {
    super(true);
    this.tag = parenthesize.forAccess(tag);
    if (template) {
      this.typeArguments = Nodes.from(ts as readonly qc.TypeNode[]);
      this.template = template;
    } else {
      this.typeArguments = undefined;
      this.template = ts as qc.TemplateLiteral;
    }
  }
  update(tag: qc.Expression, ts: readonly qc.TypeNode[] | undefined, template: qc.TemplateLiteral): TaggedTemplateExpression;
  update(tag: qc.Expression, ts?: readonly qc.TypeNode[] | qc.TemplateLiteral, template?: qc.TemplateLiteral) {
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
  constructor(h: TemplateHead, ss: readonly TemplateSpan[]) {
    super(true);
    this.head = h;
    this.templateSpans = new Nodes(ss);
  }
  update(h: TemplateHead, ss: readonly TemplateSpan[]) {
    return this.head !== h || this.templateSpans !== ss ? new TemplateExpression(h, ss).updateFrom(this) : this;
  }
}
TemplateExpression.prototype.kind = TemplateExpression.kind;
export class TemplateHead extends qc.TemplateLiteralLikeNode implements qc.TemplateHead {
  static readonly kind = Syntax.TemplateHead;
  parent?: TemplateExpression;
  templateFlags?: qc.TokenFlags;
  constructor(t: string, raw?: string) {
    super(Syntax.TemplateHead, t, raw);
  }
}
TemplateHead.prototype.kind = TemplateHead.kind;
export class TemplateMiddle extends qc.TemplateLiteralLikeNode implements qc.TemplateMiddle {
  static readonly kind = Syntax.TemplateMiddle;
  parent?: TemplateSpan;
  templateFlags?: qc.TokenFlags;
  constructor(t: string, raw?: string) {
    super(Syntax.TemplateMiddle, t, raw);
  }
  orTemplateTailKind(n: Node): n is TemplateMiddle | TemplateTail {
    const k = this.kind;
    return k === Syntax.TemplateMiddle || k === Syntax.TemplateTail;
  }
}
TemplateMiddle.prototype.kind = TemplateMiddle.kind;
export class TemplateSpan extends Nobj implements qc.TemplateSpan {
  static readonly kind = Syntax.TemplateSpan;
  parent?: TemplateExpression;
  expression: qc.Expression;
  literal: TemplateMiddle | TemplateTail;
  constructor(e: qc.Expression, l: TemplateMiddle | TemplateTail) {
    super(true);
    this.expression = e;
    this.literal = l;
  }
  update(e: qc.Expression, l: TemplateMiddle | TemplateTail) {
    return this.expression !== e || this.literal !== l ? new TemplateSpan(e, l).updateFrom(this) : this;
  }
}
TemplateSpan.prototype.kind = TemplateSpan.kind;
export class TemplateTail extends qc.TemplateLiteralLikeNode implements qc.TemplateTail {
  static readonly kind = Syntax.TemplateTail;
  parent?: TemplateSpan;
  templateFlags?: qc.TokenFlags;
  constructor(t: string, raw?: string) {
    super(Syntax.TemplateTail, t, raw);
  }
}
TemplateTail.prototype.kind = TemplateTail.kind;
export class ThisExpression extends qc.PrimaryExpression implements qc.ThisExpression {
  static readonly kind = Syntax.ThisKeyword;
  constructor() {
    super(true);
  }
  _typeNodeBrand: any;
}
ThisExpression.prototype.kind = ThisExpression.kind;
qu.addMixins(ThisExpression, [KeywordTypeNode]);
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
  constructor(e: qc.Expression) {
    super(true);
    this.expression = e;
  }
  update(e: qc.Expression) {
    return this.expression !== e ? new ThrowStatement(e).updateFrom(this) : this;
  }
}
ThrowStatement.prototype.kind = ThrowStatement.kind;
export class TryStatement extends qc.Statement implements qc.TryStatement {
  static readonly kind = Syntax.TryStatement;
  tryBlock: Block;
  catchClause?: CatchClause;
  finallyBlock?: Block;
  constructor(b: Block, c?: CatchClause, f?: Block) {
    super(true);
    this.tryBlock = b;
    this.catchClause = c;
    this.finallyBlock = f;
  }
  update(b: Block, c?: CatchClause, f?: Block) {
    return this.tryBlock !== b || this.catchClause !== c || this.finallyBlock !== f ? new TryStatement(b, c, f).updateFrom(this) : this;
  }
}
TryStatement.prototype.kind = TryStatement.kind;
export class TupleTypeNode extends qc.TypeNode implements qc.TupleTypeNode {
  static readonly kind = Syntax.TupleType;
  elements: Nodes<qc.TypeNode | NamedTupleMember>;
  constructor(es: readonly (qc.TypeNode | NamedTupleMember)[]) {
    super(true);
    this.elements = new Nodes(es);
  }
  update(es: readonly (qc.TypeNode | NamedTupleMember)[]) {
    return this.elements !== es ? new TupleTypeNode(es).updateFrom(this) : this;
  }
}
TupleTypeNode.prototype.kind = TupleTypeNode.kind;
export class TypeAliasDeclaration extends qc.DeclarationStatement implements qc.TypeAliasDeclaration {
  static readonly kind = Syntax.TypeAliasDeclaration;
  name: Identifier;
  typeParameters?: Nodes<TypeParameterDeclaration>;
  type: qc.TypeNode;
  docCache?: readonly DocTag[] | undefined;
  constructor(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, n: string | Identifier, ts: readonly TypeParameterDeclaration[] | undefined, t: qc.TypeNode) {
    super(true);
    this.decorators = Nodes.from(ds);
    this.modifiers = Nodes.from(ms);
    this.name = asName(n);
    this.typeParameters = Nodes.from(ts);
    this.type = t;
  }
  update(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, n: Identifier, ts: readonly TypeParameterDeclaration[] | undefined, t: qc.TypeNode) {
    return this.decorators !== ds || this.modifiers !== ms || this.name !== n || this.typeParameters !== ts || this.type !== t ? new TypeAliasDeclaration(ds, ms, n, ts, t).updateFrom(this) : this;
  }
  _statementBrand: any;
}
TypeAliasDeclaration.prototype.kind = TypeAliasDeclaration.kind;
qu.addMixins(TypeAliasDeclaration, [qc.DocContainer]);
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
  _declarationBrand: any;
}
TypeLiteralNode.prototype.kind = TypeLiteralNode.kind;
qu.addMixins(TypeLiteralNode, [qc.Declaration]);
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
    this.type = parenthesize.elementTypeMember(typeof o === 'number' ? t! : o);
  }
  update(t: qc.TypeNode) {
    return this.type !== t ? new TypeOperatorNode(this.operator, t).updateFrom(this) : this;
  }
}
TypeOperatorNode.prototype.kind = TypeOperatorNode.kind;
export class TypeParameterDeclaration extends qc.NamedDeclaration implements qc.TypeParameterDeclaration {
  static readonly kind = Syntax.TypeParameter;
  parent?: qc.DeclarationWithTypeParameterChildren | qc.InferTypeNode;
  name: Identifier;
  constraint?: qc.TypeNode;
  default?: qc.TypeNode;
  expression?: qc.Expression;
  constructor(n: string | Identifier, c?: qc.TypeNode, d?: qc.TypeNode) {
    super(true);
    this.name = asName(n);
    this.constraint = c;
    this.default = d;
  }
  update(n: Identifier, c?: qc.TypeNode, d?: qc.TypeNode) {
    return this.name !== n || this.constraint !== c || this.default !== d ? new TypeParameterDeclaration(n, c, d).updateFrom(this) : this;
  }
}
TypeParameterDeclaration.prototype.kind = TypeParameterDeclaration.kind;
export class TypePredicateNode extends qc.TypeNode implements qc.TypePredicateNode {
  static readonly kind = Syntax.TypePredicate;
  parent?: qc.SignatureDeclaration | DocTypeExpression;
  assertsModifier?: qc.AssertsToken;
  parameterName: Identifier | ThisTypeNode;
  type?: qc.TypeNode;
  constructor(a: qc.AssertsToken | undefined, p: Identifier | ThisTypeNode | string, t?: qc.TypeNode) {
    super(true);
    this.assertsModifier = a;
    this.parameterName = asName(p);
    this.type = t;
  }
  isIdentifierTypePredicate(): this is qc.IdentifierTypePredicate {
    return this.kind === qc.TypePredicateKind.Identifier;
  }
  isThisTypePredicate(): this is qc.ThisTypePredicate {
    return this.kind === qc.TypePredicateKind.This;
  }
  update(p: Identifier | ThisTypeNode, t: qc.TypeNode) {
    return this.updateWithModifier(this.assertsModifier, p, t);
  }
  updateWithModifier(a: qc.AssertsToken | undefined, p: Identifier | ThisTypeNode, t?: qc.TypeNode) {
    return this.assertsModifier !== a || this.parameterName !== p || this.type !== t ? new TypePredicateNode(a, p, t).updateFrom(this) : this;
  }
}
TypePredicateNode.prototype.kind = TypePredicateNode.kind;
export class TypeQueryNode extends qc.TypeNode implements qc.TypeQueryNode {
  static readonly kind = Syntax.TypeQuery;
  exprName: qc.EntityName;
  constructor(e: qc.EntityName) {
    super(true);
    this.exprName = e;
  }
  update(e: qc.EntityName) {
    return this.exprName !== e ? new TypeQueryNode(e).updateFrom(this) : this;
  }
}
TypeQueryNode.prototype.kind = TypeQueryNode.kind;
export class TypeReferenceNode extends qc.NodeWithTypeArguments implements qc.TypeReferenceNode {
  static readonly kind = Syntax.TypeReference;
  typeName: qc.EntityName;
  constructor(t: string | qc.EntityName, ts?: readonly qc.TypeNode[]) {
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
        return qu.fail(`BundleFileSectionKind: ${kind} not yet mapped to SyntaxKind`);
      default:
        return qg.assertNever(kind);
    }
  }
}
export class UnparsedPrepend extends UnparsedSection implements qc.UnparsedPrepend {
  static readonly kind = Syntax.UnparsedPrepend;
  data: string;
  parent?: UnparsedSource;
  texts: readonly UnparsedTextLike[];
}
UnparsedPrepend.prototype.kind = UnparsedPrepend.kind;
let allUnscopedEmitHelpers: QReadonlyMap<UnscopedEmitHelper> | undefined;
export class UnparsedSource extends Nobj implements qc.UnparsedSource {
  static readonly kind = Syntax.UnparsedSource;
  fileName: string;
  text: string;
  prologues: readonly UnparsedPrologue[];
  helpers: readonly UnscopedEmitHelper[] | undefined;
  referencedFiles: readonly qc.FileReference[];
  typeReferenceDirectives: readonly string[] | undefined;
  libReferenceDirectives: readonly qc.FileReference[];
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
      qu.assert(mapPathOrType === 'js' || mapPathOrType === 'dts');
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
        qu.assert(mapTextOrStripInternal === undefined || typeof mapTextOrStripInternal === 'boolean');
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
    qu.assert(!r.oldFileOfCurrentEmit);
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
    let referencedFiles: qc.FileReference[] | undefined;
    let typeReferenceDirectives: string[] | undefined;
    let libReferenceDirectives: qc.FileReference[] | undefined;
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
    qu.assert(!!this.oldFileOfCurrentEmit);
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
  parent?: UnparsedSource;
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
  parent?: VariableDeclarationList | CatchClause;
  name: qc.BindingName;
  exclamationToken?: qc.ExclamationToken;
  type?: qc.TypeNode;
  initer?: qc.Expression;
  constructor(n: string | qc.BindingName, t?: qc.TypeNode, i?: qc.Expression, e?: qc.ExclamationToken) {
    super(true);
    this.name = asName(n);
    this.type = t;
    this.initer = i !== undefined ? parenthesize.expressionForList(i) : undefined;
    this.exclamationToken = e;
  }
  update(n: qc.BindingName, t?: qc.TypeNode, i?: qc.Expression, e?: qc.ExclamationToken) {
    return this.name !== n || this.type !== t || this.initer !== i || this.exclamationToken !== e ? new VariableDeclaration(n, t, i, e).updateFrom(this) : this;
  }
}
VariableDeclaration.prototype.kind = VariableDeclaration.kind;
export class VariableDeclarationList extends Nobj implements qc.VariableDeclarationList {
  static readonly kind = Syntax.VariableDeclarationList;
  parent?: VariableStatement | ForStatement | ForOfStatement | ForInStatement;
  declarations: Nodes<VariableDeclaration>;
  constructor(ds: readonly VariableDeclaration[], f = NodeFlags.None) {
    super(true);
    this.flags |= f & NodeFlags.BlockScoped;
    this.declarations = new Nodes(ds);
  }
  update(ds: readonly VariableDeclaration[]) {
    return this.declarations !== ds ? new VariableDeclarationList(ds, this.flags).updateFrom(this) : this;
  }
}
VariableDeclarationList.prototype.kind = VariableDeclarationList.kind;
export class VariableStatement extends qc.Statement implements qc.VariableStatement {
  static readonly kind = Syntax.VariableStatement;
  declarationList: VariableDeclarationList;
  constructor(ms: readonly Modifier[] | undefined, ds: VariableDeclarationList | readonly VariableDeclaration[]) {
    super(true);
    this.decorators = undefined;
    this.modifiers = Nodes.from(ms);
    this.declarationList = qu.isArray(ds) ? new VariableDeclarationList(ds) : ds;
  }
  update(ms: readonly Modifier[] | undefined, ds: VariableDeclarationList) {
    return this.modifiers !== ms || this.declarationList !== ds ? new VariableStatement(ms, ds).updateFrom(this) : this;
  }
}
VariableStatement.prototype.kind = VariableStatement.kind;
qu.addMixins(VariableStatement, [qc.DocContainer]);
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
    return new VoidExpression(asLiteral(0));
  }
}
VoidExpression.prototype.kind = VoidExpression.kind;
export class WhileStatement extends qc.IterationStatement implements qc.WhileStatement {
  static readonly kind = Syntax.WhileStatement;
  expression: qc.Expression;
  constructor(e: qc.Expression, s: qc.Statement) {
    super(true);
    this.expression = e;
    this.statement = asEmbeddedStatement(s);
  }
  update(e: qc.Expression, s: qc.Statement) {
    return this.expression !== e || this.statement !== s ? new WhileStatement(e, s).updateFrom(this) : this;
  }
}
WhileStatement.prototype.kind = WhileStatement.kind;
export class WithStatement extends qc.Statement implements qc.WithStatement {
  static readonly kind = Syntax.WithStatement;
  expression: qc.Expression;
  statement: qc.Statement;
  constructor(e: qc.Expression, s: qc.Statement) {
    super(true);
    this.expression = e;
    this.statement = asEmbeddedStatement(s);
  }
  update(e: qc.Expression, s: qc.Statement) {
    return this.expression !== e || this.statement !== s ? new WithStatement(e, s).updateFrom(this) : this;
  }
}
WithStatement.prototype.kind = WithStatement.kind;
export class YieldExpression extends qc.Expression implements qc.YieldExpression {
  static readonly kind = Syntax.YieldExpression;
  asteriskToken?: qc.AsteriskToken;
  expression?: qc.Expression;
  constructor(e?: qc.Expression);
  constructor(a: qc.AsteriskToken | undefined, e: qc.Expression);
  constructor(a?: qc.AsteriskToken | undefined | qc.Expression, e?: qc.Expression) {
    super(true);
    const a2 = a && a.kind === Syntax.AsteriskToken ? (a as qc.AsteriskToken) : undefined;
    this.asteriskToken = a2;
    e = a && a.kind !== Syntax.AsteriskToken ? (a as qc.Expression) : e;
    this.expression = e && parenthesize.expressionForList(e);
  }
  update(a: qc.AsteriskToken | undefined, e: qc.Expression) {
    return this.expression !== e || this.asteriskToken !== a ? new YieldExpression(a, e).updateFrom(this) : this;
  }
}
YieldExpression.prototype.kind = YieldExpression.kind;
// prettier-ignore
export type NodeTypes =
  | ArrayBindingPattern
  | ArrayLiteralExpression
  | ArrayTypeNode
  | AsExpression
  | AwaitExpression
  | BinaryExpression
  | BindingElement
  | Block
  | CallExpression
  | CaseBlock
  | CaseClause
  | CatchClause
  | CommaListExpression
  | ComputedPropertyName
  | ConditionalExpression
  | ConditionalTypeNode
  | Decorator
  | DefaultClause
  | DeleteExpression
  | DeleteExpression
  | DoStatement
  | ElementAccessExpression
  | EnumDeclaration
  | EnumMember
  | ExportAssignment
  | ExportDeclaration
  | ExpressionStatement
  | ExpressionWithTypeArguments
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
  | ImportTypeNode
  | IndexedAccessTypeNode
  | InferTypeNode
  | InterfaceDeclaration
  | Doc
  | DocAugmentsTag
  | DocAuthorTag
  | DocFunctionType
  | DocImplementsTag
  | DocSignature
  | DocTemplateTag
  | DocTypedefTag
  | DocTypeExpression
  | DocTypeLiteral
  | JsxAttribute
  | JsxAttributes
  | JsxClosingElement
  | JsxElement
  | JsxExpression
  | JsxFragment
  | JsxSpreadAttribute
  | LabeledStatement
  | LiteralTypeNode
  | MappedTypeNode
  | MetaProperty
  | MissingDeclaration
  | ModuleDeclaration
  | NamedTupleMember
  | NamespaceExport
  | NamespaceExportDeclaration
  | NamespaceImport
  | NonNullExpression
  | ObjectLiteralExpression
  | OptionalTypeNode
  | ParameterDeclaration
  | ParenthesizedExpression
  | ParenthesizedTypeNode
  | PartiallyEmittedExpression
  | PostfixUnaryExpression
  | PrefixUnaryExpression
  | PropertyAccessExpression
  | PropertyAssignment
  | PropertyDeclaration
  | PropertySignature
  | QualifiedName
  | RestTypeNode
  | ReturnStatement
  | ShorthandPropertyAssignment
  | SpreadAssignment
  | SpreadElement
  | SwitchStatement
  | TaggedTemplateExpression
  | TemplateExpression
  | TemplateSpan
  | ThrowStatement
  | TryStatement
  | TupleTypeNode
  | TypeAliasDeclaration
  | TypeAssertion
  | TypeLiteralNode
  | TypeOfExpression
  | TypeOperatorNode
  | TypeParameterDeclaration
  | TypePredicateNode
  | TypeQueryNode
  | TypeReferenceNode
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
  function getLiteralKindOfBinaryPlusOperand(e: qc.Expression): Syntax {
    e = skipPartiallyEmittedExpressions(e);
    if (qy.is.literal(e.kind)) return e.kind;
    if (is.kind(BinaryExpression, e) && e.operatorToken.kind === Syntax.PlusToken) {
      const e2 = e as BinaryPlusExpression;
      if (e2.cachedLiteralKind) return e2.cachedLiteralKind;
      const leftKind = getLiteralKindOfBinaryPlusOperand(e.left);
      const literalKind = qy.is.literal(leftKind) && leftKind === getLiteralKindOfBinaryPlusOperand((<BinaryExpression>e).right) ? leftKind : Syntax.Unknown;
      (<BinaryPlusExpression>e).cachedLiteralKind = literalKind;
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
      switch (compareNumbers(operandPrecedence, binaryOperatorPrecedence)) {
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
            if (is.kind(emittedOperand, BinaryExpression) && emittedOperand.operatorToken.kind === binaryOperator) {
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
    if (compareNumbers(conditionPrecedence, conditionalPrecedence) !== Comparison.GreaterThan) return new ParenthesizedExpression(c);
    return c;
  }
  export function subexpressionOfConditionalExpression(e: qc.Expression): qc.Expression {
    const emittedExpression = skipPartiallyEmittedExpressions(e);
    return isCommaSequence(emittedExpression) ? new ParenthesizedExpression(e) : e;
  }
  export function forAccess(e: qc.Expression): qc.LeftHandSideExpression {
    const e2 = skipPartiallyEmittedExpressions(e);
    if (is.leftHandSideExpression(e2) && (e2.kind !== Syntax.NewExpression || (<NewExpression>e2).arguments)) return <qc.LeftHandSideExpression>e;
    return new ParenthesizedExpression(e).setRange(e);
  }
  export function postfixOperand(e: qc.Expression) {
    return is.leftHandSideExpression(e) ? e : new ParenthesizedExpression(e).setRange(e);
  }
  export function prefixOperand(e: qc.Expression) {
    return is.unaryExpression(e) ? e : new ParenthesizedExpression(e).setRange(e);
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
    return r ? new Nodes(r, es.trailingComma).setRange(es) : es;
  }
  export function expressionForList(e: qc.Expression) {
    const emittedExpression = skipPartiallyEmittedExpressions(e);
    const expressionPrecedence = getExpressionPrecedence(emittedExpression);
    const commaPrecedence = qy.get.operatorPrecedence(Syntax.BinaryExpression, Syntax.CommaToken);
    return expressionPrecedence > commaPrecedence ? e : new ParenthesizedExpression(e).setRange(e);
  }
  export function expressionForExpressionStatement(expression: qc.Expression) {
    const emittedExpression = skipPartiallyEmittedExpressions(expression);
    if (is.kind(CallExpression, emittedExpression)) {
      const callee = emittedExpression.expression;
      const kind = skipPartiallyEmittedExpressions(callee).kind;
      if (kind === Syntax.FunctionExpression || kind === Syntax.ArrowFunction) {
        const mutableCall = getMutableClone(emittedExpression);
        mutableCall.expression = new ParenthesizedExpression(callee).setRange(callee);
        return recreateOuterExpressions(expression, mutableCall, qc.OuterExpressionKinds.PartiallyEmittedExpressions);
      }
    }
    const leftmostExpressionKind = getLeftmostExpression(emittedExpression, false).kind;
    if (leftmostExpressionKind === Syntax.ObjectLiteralExpression || leftmostExpressionKind === Syntax.FunctionExpression) return new ParenthesizedExpression(expression).setRange(expression);
    return expression;
  }
  export function conditionalTypeMember(n: qc.TypeNode) {
    return n.kind === Syntax.ConditionalType ? new ParenthesizedTypeNode(n) : n;
  }
  export function elementTypeMember(n: qc.TypeNode) {
    switch (n.kind) {
      case Syntax.UnionType:
      case Syntax.IntersectionType:
      case Syntax.FunctionType:
      case Syntax.ConstructorType:
        return new ParenthesizedTypeNode(n);
    }
    return conditionalTypeMember(n);
  }
  export function arrayTypeMember(n: qc.TypeNode) {
    switch (n.kind) {
      case Syntax.TypeQuery:
      case Syntax.TypeOperator:
      case Syntax.InferType:
        return new ParenthesizedTypeNode(n);
    }
    return elementTypeMember(n);
  }
  export function elementTypeMembers(ns: readonly qc.TypeNode[]) {
    return new Nodes(sameMap(ns, elementTypeMember));
  }
  export function typeParameters(ns?: readonly qc.TypeNode[]) {
    if (qu.some(ns)) {
      const ps: qc.TypeNode[] = [];
      for (let i = 0; i < ns.length; ++i) {
        const p = ns[i];
        ps.push(i === 0 && is.functionOrConstructorTypeNode(p) && p.typeParameters ? new ParenthesizedTypeNode(p) : p);
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
    if (!is.kind(Block, b) && (isCommaSequence(b) || getLeftmostExpression(b, false).kind === Syntax.ObjectLiteralExpression)) return new ParenthesizedExpression(b).setRange(b);
    return b;
  }
}
export namespace emit {
  export function disposeEmitNodes(sourceFile: SourceFile) {
    sourceFile = get.sourceFileOf(get.parseTreeOf(sourceFile));
    const emitNode = sourceFile && sourceFile.emitNode;
    const annotatedNodes = emitNode && emitNode.annotatedNodes;
    if (annotatedNodes) {
      for (const n of annotatedNodes) {
        n.emitNode = undefined;
      }
    }
  }
  export function getOrCreateEmitNode(n: Node): qc.EmitNode {
    if (!n.emitNode) {
      if (is.parseTreeNode(n)) {
        if (n.kind === Syntax.SourceFile) return (n.emitNode = { annotatedNodes: [n] } as qc.EmitNode);
        const sourceFile = get.sourceFileOf(get.parseTreeOf(get.sourceFileOf(n)));
        getOrCreateEmitNode(sourceFile).annotatedNodes!.push(n);
      }
      n.emitNode = {} as qc.EmitNode;
    }
    return n.emitNode;
  }
  export function removeAllComments<T extends Nobj>(n: T): T {
    const emitNode = getOrCreateEmitNode(n);
    emitNode.flags |= qc.EmitFlags.NoComments;
    emitNode.leadingComments = undefined;
    emitNode.trailingComments = undefined;
    return n;
  }
  export function setEmitFlags<T extends Nobj>(n: T, emitFlags: qc.EmitFlags) {
    getOrCreateEmitNode(n).flags = emitFlags;
    return n;
  }
  export function addEmitFlags<T extends Nobj>(n: T, emitFlags: EmitFlags) {
    const emitNode = getOrCreateEmitNode(n);
    emitNode.flags = emitNode.flags | emitFlags;
    return n;
  }
  export function getSourceMapRange(n: Node): SourceMapRange {
    const emitNode = n.emitNode;
    return (emitNode && emitNode.sourceMapRange) || n;
  }
  export function setSourceMapRange<T extends Nobj>(n: T, range: SourceMapRange | undefined) {
    getOrCreateEmitNode(n).sourceMapRange = range;
    return n;
  }
  export function getTokenSourceMapRange(n: Node, token: Syntax): SourceMapRange | undefined {
    const emitNode = n.emitNode;
    const tokenSourceMapRanges = emitNode && emitNode.tokenSourceMapRanges;
    return tokenSourceMapRanges && tokenSourceMapRanges[token];
  }
  export function setTokenSourceMapRange<T extends Nobj>(n: T, token: Syntax, range: SourceMapRange | undefined) {
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
  export function getSyntheticLeadingComments(n: Node): SynthesizedComment[] | undefined {
    const emitNode = n.emitNode;
    return emitNode && emitNode.leadingComments;
  }
  export function setSyntheticLeadingComments<T extends Nobj>(n: T, comments: SynthesizedComment[] | undefined) {
    getOrCreateEmitNode(n).leadingComments = comments;
    return n;
  }
  export function addSyntheticLeadingComment<T extends Nobj>(n: T, kind: Syntax.SingleLineCommentTrivia | Syntax.MultiLineCommentTrivia, text: string, hasTrailingNewLine?: boolean) {
    return setSyntheticLeadingComments(
      n,
      append<SynthesizedComment>(getSyntheticLeadingComments(n), { kind, pos: -1, end: -1, hasTrailingNewLine, text })
    );
  }
  export function getSyntheticTrailingComments(n: Node): SynthesizedComment[] | undefined {
    const emitNode = n.emitNode;
    return emitNode && emitNode.trailingComments;
  }
  export function setSyntheticTrailingComments<T extends Nobj>(n: T, comments: SynthesizedComment[] | undefined) {
    getOrCreateEmitNode(n).trailingComments = comments;
    return n;
  }
  export function addSyntheticTrailingComment<T extends Nobj>(n: T, kind: Syntax.SingleLineCommentTrivia | Syntax.MultiLineCommentTrivia, text: string, hasTrailingNewLine?: boolean) {
    return setSyntheticTrailingComments(
      n,
      append<SynthesizedComment>(getSyntheticTrailingComments(n), { kind, pos: -1, end: -1, hasTrailingNewLine, text })
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
  export function addEmitHelper<T extends Nobj>(n: T, helper: EmitHelper): T {
    const emitNode = getOrCreateEmitNode(n);
    emitNode.helpers = append(emitNode.helpers, helper);
    return n;
  }
  export function addEmitHelpers<T extends Nobj>(n: T, helpers: EmitHelper[] | undefined): T {
    if (qu.some(helpers)) {
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
    return compareNumbers(x.priority, y.priority);
  }
  export function mergeEmitNode(sourceEmitNode: qc.EmitNode, destEmitNode: qc.EmitNode | undefined) {
    const { flags, leadingComments, trailingComments, commentRange, sourceMapRange, tokenSourceMapRanges, constantValue, helpers, startsOnNewLine } = sourceEmitNode;
    if (!destEmitNode) destEmitNode = {} as qc.EmitNode;
    // We are using `.slice()` here in case `destEmitNode.leadingComments` is pushed to later.
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
  export function getExternalHelpersModuleName(n: SourceFile) {
    const parseNode = get.originalOf(n, isSourceFile);
    const emitNode = parseNode && parseNode.emitNode;
    return emitNode && emitNode.externalHelpersModuleName;
  }
  export function hasRecordedExternalHelpers(sourceFile: SourceFile) {
    const parseNode = get.originalOf(sourceFile, isSourceFile);
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
    return setEmitFlags(new Identifier(name), qc.EmitFlags.HelperName | qc.EmitFlags.AdviseOnEmitNode);
  }
  export function inlineExpressions(expressions: readonly qc.Expression[]) {
    return expressions.length > 10 ? new CommaListExpression(expressions) : reduceLeft(expressions, createComma)!;
  }
  export function convertToFunctionBody(node: qc.ConciseBody, multiLine?: boolean): Block {
    return is.kind(Block, node) ? node : new Block([new qc.ReturnStatement(node).setRange(node)], multiLine).setRange(node);
  }
  export function ensureUseStrict(statements: Nodes<qc.Statement>): Nodes<qc.Statement> {
    const foundUseStrict = findUseStrictPrologue(statements);
    if (!foundUseStrict) {
      return new Nodes<qc.Statement>([startOnNewLine(new qc.ExpressionStatement(asLiteral('use strict'))), ...statements]).setRange(statements);
    }
    return statements;
  }
  export function startOnNewLine<T extends Nobj>(node: T): T {
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
                qu.pushIfUnique(helperNames, importName);
              }
            }
          }
          if (qu.some(helperNames)) {
            helperNames.sort(compareCaseSensitive);
            namedBindings = new NamedImports(
              qu.map(helperNames, (name) =>
                isFileLevelUniqueName(sourceFile, name) ? new ImportSpecifier(undefined, new Identifier(name)) : new qc.ImportSpecifier(new Identifier(name), getUnscopedHelperName(name))
              )
            );
            const parseNode = get.originalOf(sourceFile, isSourceFile);
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
        const parseNode = get.originalOf(node, isSourceFile);
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
        return rename && asLiteral(rename);
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
    if (file.moduleName) return asLiteral(file.moduleName);
    if (!file.isDeclarationFile && (options.out || options.outFile)) return asLiteral(getExternalModuleNameFromPath(host, file.fileName));
    return;
  }
}
export function asToken<T extends Syntax>(t: T | qc.Token<T>): qc.Token<T> {
  return typeof t === 'number' ? new qc.Token(t) : t;
}
export function asName<T extends Identifier | qc.BindingName | qc.PropertyName | qc.EntityName | ThisTypeNode | undefined>(n: string | T): T | Identifier {
  return qu.isString(n) ? new Identifier(n) : n;
}
export function asLiteral(v: string | StringLiteral | NoSubstitutionLiteral | NumericLiteral | Identifier, singleQuote: boolean): StringLiteral;
export function asLiteral(v: string | number, singleQuote: boolean): StringLiteral | NumericLiteral;
export function asLiteral(v: string | StringLiteral | NoSubstitutionLiteral | NumericLiteral | Identifier): StringLiteral;
export function asLiteral(v: number | qc.PseudoBigInt): NumericLiteral;
export function asLiteral(v: boolean): BooleanLiteral;
export function asLiteral(v: string | number | qc.PseudoBigInt | boolean): qc.PrimaryExpression;
export function asLiteral(v: string | number | qc.PseudoBigInt | boolean | StringLiteral | NoSubstitutionLiteral | NumericLiteral | Identifier, singleQuote?: boolean): qc.PrimaryExpression {
  if (typeof v === 'number') return new NumericLiteral(v + '');
  if (typeof v === 'object' && 'base10Value' in v) return new BigIntLiteral(pseudoBigIntToString(v) + 'n');
  if (typeof v === 'boolean') return v ? new BooleanLiteral(true) : new BooleanLiteral(false);
  if (qu.isString(v)) {
    const r = new StringLiteral(v);
    if (singleQuote) r.singleQuote = true;
    return r;
  }
  return StringLiteral.fromNode(v);
}
export function asExpression<T extends qc.Expression | undefined>(e: string | number | boolean | T): T | StringLiteral | NumericLiteral | BooleanLiteral {
  return typeof e === 'string' ? new StringLiteral(e) : typeof e === 'number' ? new NumericLiteral('' + e) : typeof e === 'boolean' ? (e ? new BooleanLiteral(true) : new BooleanLiteral(false)) : e;
}
export function asEmbeddedStatement<T extends Nobj>(s: T): T | EmptyStatement;
export function asEmbeddedStatement<T extends Nobj>(s?: T): T | EmptyStatement | undefined;
export function asEmbeddedStatement<T extends Nobj>(s?: T): T | EmptyStatement | undefined {
  return s && is.kind(NotEmittedStatement, s) ? new EmptyStatement().setOriginal(s).setRange(s) : s;
}
export function pseudoBigIntToString({ negative, base10Value }: PseudoBigInt) {
  return (negative && base10Value !== '0' ? '-' : '') + base10Value;
}
export function skipParentheses(n: qc.Expression): qc.Expression;
export function skipParentheses(n: Node): Node;
export function skipParentheses(n: Node): Node {
  return skipOuterExpressions(n, qc.OuterExpressionKinds.Parentheses);
}
export function skipPartiallyEmittedExpressions(n: qc.Expression): qc.Expression;
export function skipPartiallyEmittedExpressions(n: Node): Node;
export function skipPartiallyEmittedExpressions(n: Node) {
  return skipOuterExpressions(n, qc.OuterExpressionKinds.PartiallyEmittedExpressions);
}
export function updateFunctionLikeBody(d: qc.FunctionLikeDeclaration, b: Block): qc.FunctionLikeDeclaration {
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
export interface SynMap {
  [Syntax.ArrayBindingPattern]: ArrayBindingPattern;
  [Syntax.ArrayLiteralExpression]: ArrayLiteralExpression;
  [Syntax.ArrayType]: ArrayTypeNode;
  [Syntax.ArrowFunction]: ArrowFunction;
  [Syntax.AsExpression]: AsExpression;
  [Syntax.AsteriskToken]: qc.AsteriskToken;
  [Syntax.AwaitExpression]: AwaitExpression;
  [Syntax.BigIntLiteral]: BigIntLiteral;
  [Syntax.BinaryExpression]: BinaryExpression;
  [Syntax.BindingElement]: BindingElement;
  [Syntax.Block]: Block;
  [Syntax.BreakStatement]: BreakStatement;
  [Syntax.Bundle]: Bundle;
  [Syntax.CallExpression]: CallExpression;
  [Syntax.CallSignature]: CallSignatureDeclaration;
  [Syntax.CaseBlock]: CaseBlock;
  [Syntax.CaseClause]: CaseClause;
  [Syntax.CatchClause]: CatchClause;
  [Syntax.ClassDeclaration]: ClassDeclaration;
  [Syntax.ClassExpression]: ClassExpression;
  [Syntax.ColonToken]: qc.ColonToken;
  [Syntax.CommaListExpression]: CommaListExpression;
  [Syntax.ComputedPropertyName]: ComputedPropertyName;
  [Syntax.ConditionalExpression]: ConditionalExpression;
  [Syntax.ConditionalType]: ConditionalTypeNode;
  [Syntax.Constructor]: ConstructorDeclaration;
  [Syntax.ConstructorType]: ConstructorTypeNode;
  [Syntax.ConstructSignature]: ConstructSignatureDeclaration;
  [Syntax.ContinueStatement]: ContinueStatement;
  [Syntax.DebuggerStatement]: DebuggerStatement;
  [Syntax.Decorator]: Decorator;
  [Syntax.DefaultClause]: DefaultClause;
  [Syntax.DeleteExpression]: DeleteExpression;
  [Syntax.DoStatement]: DoStatement;
  [Syntax.Dot3Token]: qc.Dot3Token;
  [Syntax.DotToken]: qc.DotToken;
  [Syntax.ElementAccessExpression]: ElementAccessExpression;
  [Syntax.EmptyStatement]: EmptyStatement;
  [Syntax.EndOfDeclarationMarker]: EndOfDeclarationMarker;
  [Syntax.EndOfFileToken]: qc.EndOfFileToken;
  [Syntax.EnumDeclaration]: EnumDeclaration;
  [Syntax.EnumMember]: EnumMember;
  [Syntax.EqualsGreaterThanToken]: qc.EqualsGreaterThanToken;
  [Syntax.EqualsToken]: qc.EqualsToken;
  [Syntax.ExclamationToken]: qc.ExclamationToken;
  [Syntax.ExportAssignment]: ExportAssignment;
  [Syntax.ExportDeclaration]: ExportDeclaration;
  [Syntax.ExportSpecifier]: ExportSpecifier;
  [Syntax.ExpressionStatement]: ExpressionStatement;
  [Syntax.ExpressionWithTypeArguments]: ExpressionWithTypeArguments;
  [Syntax.ExternalModuleReference]: ExternalModuleReference;
  [Syntax.ForInStatement]: ForInStatement;
  [Syntax.ForOfStatement]: ForOfStatement;
  [Syntax.ForStatement]: ForStatement;
  [Syntax.FunctionDeclaration]: FunctionDeclaration;
  [Syntax.FunctionExpression]: FunctionExpression;
  [Syntax.FunctionType]: FunctionTypeNode;
  [Syntax.GetAccessor]: GetAccessorDeclaration;
  [Syntax.HeritageClause]: HeritageClause;
  [Syntax.Identifier]: Identifier;
  [Syntax.IfStatement]: IfStatement;
  [Syntax.ImportClause]: ImportClause;
  [Syntax.ImportDeclaration]: ImportDeclaration;
  [Syntax.ImportEqualsDeclaration]: ImportEqualsDeclaration;
  [Syntax.ImportSpecifier]: ImportSpecifier;
  [Syntax.ImportType]: ImportTypeNode;
  [Syntax.IndexedAccessType]: IndexedAccessTypeNode;
  [Syntax.IndexSignature]: IndexSignatureDeclaration;
  [Syntax.InferType]: InferTypeNode;
  [Syntax.InputFiles]: InputFiles;
  [Syntax.InterfaceDeclaration]: InterfaceDeclaration;
  [Syntax.IntersectionType]: IntersectionTypeNode;
  [Syntax.DocAllType]: DocAllType;
  [Syntax.DocAugmentsTag]: DocAugmentsTag;
  [Syntax.DocAuthorTag]: DocAuthorTag;
  [Syntax.DocCallbackTag]: DocCallbackTag;
  [Syntax.DocClassTag]: DocClassTag;
  [Syntax.DocComment]: Doc;
  [Syntax.DocEnumTag]: DocEnumTag;
  [Syntax.DocFunctionType]: DocFunctionType;
  [Syntax.DocImplementsTag]: DocImplementsTag;
  [Syntax.DocNamepathType]: DocNamepathType;
  [Syntax.DocNonNullableType]: DocNonNullableType;
  [Syntax.DocNullableType]: DocNullableType;
  [Syntax.DocOptionalType]: DocOptionalType;
  [Syntax.DocParameterTag]: DocParameterTag;
  [Syntax.DocPrivateTag]: DocPrivateTag;
  [Syntax.DocPropertyTag]: DocPropertyTag;
  [Syntax.DocProtectedTag]: DocProtectedTag;
  [Syntax.DocPublicTag]: DocPublicTag;
  [Syntax.DocReadonlyTag]: DocReadonlyTag;
  [Syntax.DocReturnTag]: DocReturnTag;
  [Syntax.DocSignature]: DocSignature;
  [Syntax.DocTag]: DocTag;
  [Syntax.DocTemplateTag]: DocTemplateTag;
  [Syntax.DocThisTag]: DocThisTag;
  [Syntax.DocTypedefTag]: DocTypedefTag;
  [Syntax.DocTypeExpression]: DocTypeExpression;
  [Syntax.DocTypeLiteral]: DocTypeLiteral;
  [Syntax.DocTypeTag]: DocTypeTag;
  [Syntax.DocUnknownType]: DocUnknownType;
  [Syntax.DocVariadicType]: DocVariadicType;
  [Syntax.JsxAttribute]: JsxAttribute;
  [Syntax.JsxAttributes]: JsxAttributes;
  [Syntax.JsxClosingElement]: JsxClosingElement;
  [Syntax.JsxClosingFragment]: JsxClosingFragment;
  [Syntax.JsxElement]: JsxElement;
  [Syntax.JsxExpression]: JsxExpression;
  [Syntax.JsxFragment]: JsxFragment;
  [Syntax.JsxOpeningElement]: JsxOpeningElement;
  [Syntax.JsxOpeningFragment]: JsxOpeningFragment;
  [Syntax.JsxSelfClosingElement]: JsxSelfClosingElement;
  [Syntax.JsxSpreadAttribute]: JsxSpreadAttribute;
  [Syntax.JsxText]: JsxText;
  [Syntax.LabeledStatement]: LabeledStatement;
  [Syntax.LiteralType]: LiteralTypeNode;
  [Syntax.MappedType]: MappedTypeNode;
  [Syntax.MergeDeclarationMarker]: MergeDeclarationMarker;
  [Syntax.MetaProperty]: MetaProperty;
  [Syntax.MethodDeclaration]: MethodDeclaration;
  [Syntax.MethodSignature]: MethodSignature;
  [Syntax.MinusToken]: qc.MinusToken;
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
  [Syntax.OptionalType]: OptionalTypeNode;
  [Syntax.Parameter]: ParameterDeclaration;
  [Syntax.ParenthesizedExpression]: ParenthesizedExpression;
  [Syntax.ParenthesizedType]: ParenthesizedTypeNode;
  [Syntax.PartiallyEmittedExpression]: PartiallyEmittedExpression;
  [Syntax.PlusToken]: qc.PlusToken;
  [Syntax.PostfixUnaryExpression]: PostfixUnaryExpression;
  [Syntax.PrefixUnaryExpression]: PrefixUnaryExpression;
  [Syntax.PrivateIdentifier]: PrivateIdentifier;
  [Syntax.PropertyAccessExpression]: PropertyAccessExpression;
  [Syntax.PropertyAssignment]: PropertyAssignment;
  [Syntax.PropertyDeclaration]: PropertyDeclaration;
  [Syntax.PropertySignature]: PropertySignature;
  [Syntax.QualifiedName]: QualifiedName;
  [Syntax.QuestionDotToken]: qc.QuestionDotToken;
  [Syntax.QuestionToken]: qc.QuestionToken;
  [Syntax.RegexLiteral]: RegexLiteral;
  [Syntax.RestType]: RestTypeNode;
  [Syntax.ReturnStatement]: ReturnStatement;
  [Syntax.SemicolonClassElement]: SemicolonClassElement;
  [Syntax.SetAccessor]: SetAccessorDeclaration;
  [Syntax.ShorthandPropertyAssignment]: ShorthandPropertyAssignment;
  [Syntax.SourceFile]: SourceFile;
  [Syntax.SpreadAssignment]: SpreadAssignment;
  [Syntax.SpreadElement]: SpreadElement;
  [Syntax.StringLiteral]: StringLiteral;
  [Syntax.SwitchStatement]: SwitchStatement;
  [Syntax.SyntaxList]: SyntaxList;
  [Syntax.SyntheticExpression]: SyntheticExpression;
  [Syntax.SyntheticReferenceExpression]: SyntheticReferenceExpression;
  [Syntax.TaggedTemplateExpression]: TaggedTemplateExpression;
  [Syntax.TemplateExpression]: TemplateExpression;
  [Syntax.TemplateHead]: TemplateHead;
  [Syntax.TemplateMiddle]: TemplateMiddle;
  [Syntax.TemplateSpan]: TemplateSpan;
  [Syntax.TemplateTail]: TemplateTail;
  [Syntax.ThisType]: ThisTypeNode;
  [Syntax.ThrowStatement]: ThrowStatement;
  [Syntax.TryStatement]: TryStatement;
  [Syntax.TupleType]: TupleTypeNode;
  [Syntax.TypeAliasDeclaration]: TypeAliasDeclaration;
  [Syntax.TypeAssertionExpression]: TypeAssertion;
  [Syntax.TypeLiteral]: TypeLiteralNode;
  [Syntax.TypeOfExpression]: TypeOfExpression;
  [Syntax.TypeOperator]: TypeOperatorNode;
  [Syntax.TypeParameter]: TypeParameterDeclaration;
  [Syntax.TypePredicate]: TypePredicateNode;
  [Syntax.TypeQuery]: TypeQueryNode;
  [Syntax.TypeReference]: TypeReferenceNode;
  [Syntax.UnionType]: UnionTypeNode;
  [Syntax.UnparsedInternalText]: UnparsedTextLike;
  [Syntax.UnparsedPrepend]: UnparsedPrepend;
  [Syntax.UnparsedPrologue]: UnparsedPrologue;
  [Syntax.UnparsedSource]: UnparsedSource;
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
