import * as qc from './index';
import * as qd from '../diagnostic';
import { Node } from '../type';
import { CheckFlags, ModifierFlags, NodeFlags, ObjectFlags, SignatureFlags, SymbolFlags, TransformFlags, TypeFlags } from '../type';
import * as qt from '../type';
import * as qu from '../util';
import { Syntax } from '../syntax';
import * as qy from '../syntax';
import { qf } from './index';
export * from '../type';
export interface ReadonlyNodeSet<T extends Node> {
  has(n: T): boolean;
  forEach(cb: (n: T) => void): void;
  some(cb: (n: T) => boolean): boolean;
}
export class NodeSet<T extends Node> implements ReadonlyNodeSet<T> {
  private map = new qu.QMap<T>();
  add(n: T) {
    this.map.set(String(qf.get.nodeId(n)), n);
  }
  tryAdd(n: T) {
    if (this.has(n)) return false;
    this.add(n);
    return true;
  }
  has(n: T) {
    return this.map.has(String(qf.get.nodeId(n)));
  }
  forEach(cb: (n: T) => void) {
    this.map.forEach(cb);
  }
  some(cb: (n: T) => boolean) {
    return qu.eachEntry(this.map, cb) || false;
  }
}
export interface ReadonlyNodeMap<N extends Node, V> {
  get(n: N): V | undefined;
  has(n: N): boolean;
}
export class NodeMap<N extends Node, V> implements ReadonlyNodeMap<N, V> {
  private map = new qu.QMap<{ n: N; v: V }>();
  get(n: N): V | undefined {
    const r = this.map.get(String(qf.get.nodeId(n)));
    return r?.v;
  }
  getOrUpdate(n: N, setValue: () => V): V {
    const r = this.get(n);
    if (r) return r;
    const v = setValue();
    this.set(n, v);
    return v;
  }
  set(n: N, v: V) {
    this.map.set(String(qf.get.nodeId(n)), { n, v });
  }
  has(n: N) {
    return this.map.has(String(qf.get.nodeId(n)));
  }
  forEach(cb: (v: V, n: N) => void) {
    this.map.forEach(({ n, v }) => cb(v, n));
  }
}
export class Nodes<T extends qt.Nobj = qt.Nobj> extends Array<T> implements qt.Nodes<T> {
  pos = -1;
  end = -1;
  trailingComma?: boolean;
  transformFlags = TransformFlags.None;
  static isNodes<T extends qt.Nobj>(ns: readonly T[]): ns is Nodes<T> {
    return ns.hasOwnProperty('pos') && ns.hasOwnProperty('end');
  }
  static from<T extends qt.Nobj>(ts: readonly T[]): Nodes<T>;
  static from<T extends qt.Nobj>(ts?: readonly T[]): Nodes<T> | undefined;
  static from<T extends qt.Nobj>(ts?: readonly T[]) {
    return ts ? new Nodes(ts) : undefined;
  }
  constructor(ts?: readonly T[], trailingComma?: boolean) {
    super(...(!ts || ts === qu.empty ? [] : ts));
    if (trailingComma) this.trailingComma = trailingComma;
  }
  getRange() {
    return new qu.TextRange(this.pos - 1, this.end + 1);
  }
  visit<V>(cb: (n?: Node) => V | undefined, cbs?: (ns: qt.Nodes) => V | undefined): V | undefined {
    if (cbs) return cbs(this);
    for (const n of this) {
      const r = cb(n as Node);
      if (r) return r;
    }
    return;
  }
}
export type MutableNodes<T extends qt.Nobj> = Nodes<T> & T[];
export abstract class Nobj extends qu.TextRange implements qt.Nobj {
  id?: number;
  kind!: any;
  flags = NodeFlags.None;
  transformFlags = TransformFlags.None;
  modifierFlagsCache = ModifierFlags.None;
  decorators?: Nodes<qt.Decorator>;
  modifiers?: qt.Modifiers;
  original?: Nobj;
  symbol!: qt.Symbol;
  localSymbol?: qt.Symbol;
  locals?: qt.SymbolTable;
  nextContainer?: Nobj;
  flowNode?: qt.FlowNode;
  emitNode?: qt.EmitNode;
  contextualType?: qt.Type;
  inferenceContext?: qt.InferenceContext;
  doc?: qt.Doc[];
  private _children?: Nobj[];
  constructor(synth?: boolean, k?: Syntax, pos?: number, end?: number, public parent?: qt.Node) {
    super(pos, end);
    if (k) this.kind = k;
    if (synth) this.flags |= NodeFlags.Synthesized;
    if (parent) this.flags = parent.flags & NodeFlags.ContextFlags;
  }
  get sourceFile(): qc.SourceFile {
    let n = this as Node | undefined;
    while (n) {
      if (qf.is.kind(qc.SourceFile, n)) return n as SourceFile;
      n = n.parent;
    }
    qu.fail();
  }
  getTokenPos(s?: qy.SourceFileLike, doc?: boolean): number {
    if (qf.is.missing(this)) return this.pos;
    if (qf.is.doc.node(this)) return qy.skipTrivia((s || this.sourceFile)!.text, this.pos, false, true);
    if (doc && qf.is.withDocNodes(this)) return this.doc![0].getTokenPos(s);
    if (qf.is.kind(SyntaxList, this) && this._children?.length) return this._children![0].getTokenPos(s, doc);
    return qy.skipTrivia((s || this.sourceFile).text, this.pos);
  }
  getStart(s?: qy.SourceFileLike, doc?: boolean) {
    qu.assert(!qu.isSynthesized(this.pos) && !qu.isSynthesized(this.end));
    return this.getTokenPos(s, doc);
  }
  getFullStart() {
    qu.assert(!qu.isSynthesized(this.pos) && !qu.isSynthesized(this.end));
    return this.pos;
  }
  getEnd() {
    qu.assert(!qu.isSynthesized(this.pos) && !qu.isSynthesized(this.end));
    return this.end;
  }
  getWidth(s?: SourceFile) {
    qu.assert(!qu.isSynthesized(this.pos) && !qu.isSynthesized(this.end));
    return this.getEnd() - this.getStart(s);
  }
  fullWidth() {
    qu.assert(!qu.isSynthesized(this.pos) && !qu.isSynthesized(this.end));
    return this.end - this.pos;
  }
  getLeadingTriviaWidth(s?: SourceFile) {
    qu.assert(!qu.isSynthesized(this.pos) && !qu.isSynthesized(this.end));
    return this.getStart(s) - this.pos;
  }
  getFullText(s?: SourceFile) {
    qu.assert(!qu.isSynthesized(this.pos) && !qu.isSynthesized(this.end));
    return (s || this.getSourceFile()).text.substring(this.pos, this.end);
  }
  getText(s?: SourceFile) {
    qu.assert(!qu.isSynthesized(this.pos) && !qu.isSynthesized(this.end));
    if (!s) s = this.getSourceFile();
    return s.text.substring(this.getStart(s), this.getEnd());
  }
  getChildCount(s?: SourceFile) {
    return this.getChildren(s).length;
  }
  getChildAt(i: number, s?: SourceFile) {
    return this.getChildren(s)[i];
  }
  getChildren(s?: qy.SourceFileLike) {
    qu.assert(!qu.isSynthesized(this.pos) && !qu.isSynthesized(this.end));
    const scanner = qs_getRaw();
    const addSynthetics = (ns: qu.Push<Nobj>, pos: number, end: number) => {
      scanner.setTextPos(pos);
      while (pos < end) {
        const t = scanner.scan();
        const p = scanner.getTextPos();
        if (p <= end) {
          if (t === Syntax.Identifier) qu.fail(`Did not expect ${qu.format.syntax(this.kind)} to have an Identifier in its trivia`);
          ns.push(Node.create(t, pos, p, this));
        }
        pos = p;
        if (t === Syntax.EndOfFileToken) break;
      }
    };
    const createSyntaxList = (ns: Nodes<Nobj>) => {
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
      const cs = [] as Nobj[];
      if (qy.is.node(this.kind)) {
        if (qf.is.doc.commentContainingNode(this)) {
          qf.each.child(this, (c) => {
            cs.push(c);
          });
          return cs;
        }
        scanner.setText((s || this.getSourceFile()).text);
        let p = this.pos;
        const processNode = (c: Nobj) => {
          addSynthetics(cs, p, c.pos);
          cs.push(c);
          p = c.end;
        };
        const processNodes = (ns: Nodes<Nobj>) => {
          addSynthetics(cs, p, ns.pos);
          cs.push(createSyntaxList(ns));
          p = ns.end;
        };
        qu.ach((this as qt.DocContainer).doc, processNode);
        p = this.pos;
        qf.each.child(this, processNode, processNodes);
        addSynthetics(cs, p, this.end);
        scanner.setText(undefined);
      }
      return cs;
    };
    return this._children || (this._children = createChildren());
  }
  getFirstToken(s?: qy.SourceFileLike): Nobj | undefined {
    qu.assert(!qu.isSynthesized(this.pos) && !qu.isSynthesized(this.end));
    const cs = this.getChildren(s);
    if (!cs.length) return;
    const c = qu.find(cs, (c) => c.kind < Syntax.FirstDocNode || c.kind > Syntax.LastDocNode)!;
    return c.kind < Syntax.FirstNode ? c : c.getFirstToken(s);
  }
  getLastToken(s?: qy.SourceFileLike): Nobj | undefined {
    qu.assert(!qu.isSynthesized(this.pos) && !qu.isSynthesized(this.end));
    const cs = this.getChildren(s);
    const c = qu.lastOrUndefined(cs);
    if (!c) return;
    return c.kind < Syntax.FirstNode ? c : c.getLastToken(s);
  }
  indexOfNode(ns: readonly Node[]) {
    return qu.binarySearch(ns, this, (n) => n.pos, qu.compareNumbers);
  }
  visit<T>(cb: (n?: Node) => T | undefined): T | undefined {
    return cb(this);
  }
  updateFrom(n: Nobj): this {
    if (this !== n) return this.setOriginal(n).setRange(n).aggregateTransformFlags();
    return this;
  }
  setOriginal(n?: Nobj): this {
    this.original = n;
    if (n) {
      const e = n.emitNode;
      if (e) this.emitNode = mergeEmitNode(e, this.emitNode);
    }
    return this;
  }
  aggregateTransformFlags(): this {
    const aggregate = (n: Nobj): TransformFlags => {
      if (n === undefined) return TransformFlags.None;
      if (n.transformFlags & TransformFlags.HasComputedFlags) return n.transformFlags & ~getTransformFlagsSubtreeExclusions(n.kind);
      return computeTransformFlagsForNode(n, subtree(n));
    };
    const nodes = (ns: Nodes<Nobj>): TransformFlags => {
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
    const subtree = (n: Nobj): TransformFlags => {
      if (has.syntacticModifier(n, ModifierFlags.Ambient) || (qf.is.typeNode(n) && n.kind !== Syntax.ExpressionWithTypeArguments)) return TransformFlags.None;
      return reduceEachChild(n, TransformFlags.None, child, children);
    };
    const child = (f: TransformFlags, n: Nobj): TransformFlags => f | aggregate(n);
    const children = (f: TransformFlags, ns: Nodes<Nobj>): TransformFlags => f | nodes(ns);
    aggregate(this);
    return this;
  }
  movePastDecorators(): qu.TextRange {
    return this.decorators && this.decorators.length > 0 ? this.movePos(this.decorators.end) : this;
  }
  movePastModifiers(): qu.TextRange {
    return this.modifiers && this.modifiers.length > 0 ? this.movePos(this.modifiers.end) : this.movePastDecorators();
  }
  getRange() {
    return new qu.TextRange(this.getTokenPos(), this.end);
  }
}
export class SyntaxList extends Nobj implements qt.SyntaxList {
  static readonly kind = Syntax.SyntaxList;
  children!: Nobj[];
}
SyntaxList.prototype.kind = SyntaxList.kind;
export abstract class TypeNode extends Nobj implements qt.TypeNode {
  _typeNodeBrand: any;
}
export abstract class NodeWithTypeArguments extends TypeNode implements qt.NodeWithTypeArguments {
  typeArguments?: Nodes<TypeNode>;
}
export abstract class Declaration extends Nobj implements qt.Declaration {
  _declarationBrand: any;
}
export abstract class NamedDeclaration extends Declaration implements qt.NamedDeclaration {
  name?: qt.DeclarationName;
}
export abstract class DeclarationStatement extends NamedDeclaration implements qt.DeclarationStatement {
  name?: qt.Identifier | qt.StringLiteral | qt.NumericLiteral;
  _statementBrand: any;
}
export abstract class ClassElement extends NamedDeclaration implements qt.ClassElement {
  name?: qt.PropertyName;
  _classElementBrand: any;
}
export abstract class ClassLikeDeclarationBase extends NamedDeclaration implements qt.ClassLikeDeclarationBase {
  name?: qt.Identifier;
  typeParameters?: Nodes<qt.TypeParameterDeclaration>;
  heritageClauses?: Nodes<qt.HeritageClause>;
  members: Nodes<ClassElement>;
  constructor(
    s: boolean,
    k: Syntax.ClassDeclaration | Syntax.ClassExpression,
    ts: readonly qt.TypeParameterDeclaration[] | undefined,
    hs: readonly qt.HeritageClause[] | undefined,
    es: readonly ClassElement[]
  ) {
    super(s, k);
    this.typeParameters = Nodes.from(ts);
    this.heritageClauses = Nodes.from(hs);
    this.members = new Nodes(es);
  }
}
export abstract class ObjectLiteralElement extends NamedDeclaration implements qt.ObjectLiteralElement {
  name?: qt.PropertyName;
  _objectLiteralBrand: any;
}
export abstract class PropertyLikeDeclaration extends NamedDeclaration implements qt.PropertyLikeDeclaration {
  name!: qt.PropertyName;
}
export abstract class TypeElement extends NamedDeclaration implements qt.TypeElement {
  name?: qt.PropertyName;
  questionToken?: qt.QuestionToken;
  _typeElementBrand: any;
}
export const enum FunctionFlags {
  Normal = 0,
  Generator = 1 << 0,
  Async = 1 << 1,
  Invalid = 1 << 2,
  AsyncGenerator = Async | Generator,
}
export abstract class SignatureDeclarationBase extends NamedDeclaration implements qt.SignatureDeclarationBase {
  name?: qt.PropertyName;
  typeParameters?: Nodes<qt.TypeParameterDeclaration>;
  parameters!: Nodes<qt.ParameterDeclaration>;
  type?: TypeNode;
  typeArguments?: Nodes<qt.TypeNode>;
  constructor(s: boolean, k: qt.SignatureDeclaration['kind'], ts: readonly qt.TypeParameterDeclaration[] | undefined, ps: readonly qt.ParameterDeclaration[], t?: TypeNode, ta?: readonly TypeNode[]) {
    super(s, k);
    this.typeParameters = Nodes.from(ts);
    this.parameters = new Nodes(ps);
    this.type = t;
    this.typeArguments = Nodes.from(ta);
  }
  getFunctionFlags(node: SignatureDeclaration | undefined) {
    if (!node) return FunctionFlags.Invalid;
    let flags = FunctionFlags.Normal;
    switch (node.kind) {
      case Syntax.FunctionDeclaration:
      case Syntax.FunctionExpression:
      case Syntax.MethodDeclaration:
        if (node.asteriskToken) {
          flags |= FunctionFlags.Generator;
        }
      case Syntax.ArrowFunction:
        if (qf.has.syntacticModifier(node, ModifierFlags.Async)) {
          flags |= FunctionFlags.Async;
        }
        break;
    }
    if (!(node as FunctionLikeDeclaration).body) {
      flags |= FunctionFlags.Invalid;
    }
    return flags;
  }

  /*
  update<T extends qt.SignatureDeclaration>(n: T, ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: qc.TypeNode): T {
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
  type!: TypeNode;
  docCache?: readonly qt.DocTag[];
  constructor(s: boolean, k: Syntax.FunctionType | Syntax.ConstructorType, ts: readonly qt.TypeParameterDeclaration[] | undefined, ps: readonly qt.ParameterDeclaration[], t?: TypeNode) {
    super(s, k, ts, ps, t);
  }
  _typeNodeBrand: any;
}
export abstract class Expression extends Nobj implements qt.Expression {
  _expressionBrand: any;
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
  properties!: Nodes<T>;
  _declarationBrand: any;
}
export abstract class TokenOrIdentifier extends Nobj {
  getChildren(): Nobj[] {
    return this.kind === Syntax.EndOfFileToken ? this.doc || qu.empty : qu.empty;
  }
}
export class Token<T extends Syntax> extends TokenOrIdentifier implements qt.Token<T> {
  constructor(k: T, pos?: number, end?: number) {
    super(undefined, k, pos, end);
  }
}
export abstract class Statement extends Nobj implements qt.Statement {
  _statementBrand: any;
  static insertStatementsAfterPrologue<T extends Statement>(to: T[], from: readonly T[] | undefined, isPrologueDirective: (node: Node) => boolean): T[] {
    if (from === undefined || from.length === 0) return to;
    let statementIndex = 0;
    for (; statementIndex < to.length; ++statementIndex) {
      if (!qf.is.prologueDirective(to[statementIndex])) break;
    }
    to.splice(statementIndex, 0, ...from);
    return to;
  }
  static insertStatementAfterPrologue<T extends Statement>(to: T[], statement: T | undefined, isPrologueDirective: (node: Node) => boolean): T[] {
    if (statement === undefined) return to;
    let statementIndex = 0;
    for (; statementIndex < to.length; ++statementIndex) {
      if (!qf.is.prologueDirective(to[statementIndex])) break;
    }
    to.splice(statementIndex, 0, statement);
    return to;
  }
  static insertStatementsAfterStandardPrologue<T extends Statement>(to: T[], from: readonly T[] | undefined): T[] {
    return this.insertStatementsAfterPrologue(to, from, isPrologueDirective);
  }
  static insertStatementsAfterCustomPrologue<T extends Statement>(to: T[], from: readonly T[] | undefined): T[] {
    return this.insertStatementsAfterPrologue(to, from, isAnyPrologueDirective);
  }
  static insertStatementAfterStandardPrologue<T extends Statement>(to: T[], statement: T | undefined): T[] {
    return this.insertStatementAfterPrologue(to, statement, isPrologueDirective);
  }
  static insertStatementAfterCustomPrologue<T extends Statement>(to: T[], statement: T | undefined): T[] {
    return this.insertStatementAfterPrologue(to, statement, isAnyPrologueDirective);
  }
}
export abstract class IterationStatement extends Statement implements qt.IterationStatement {
  statement!: Statement;
}
export abstract class LiteralLikeNode extends Nobj implements qt.LiteralLikeNode {
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
      if (typeof r === 'object') return qu.fail('Invalid raw text');
      qu.assert(t === r, "Expected 'text' to be the normalized version of 'rawText'");
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
export abstract class DocTag extends Nobj implements qt.DocTag {
  parent?: qt.Doc | qt.DocTypeLiteral;
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
    this.doc = qu.append(this.doc, d);
    return this;
  }
}
export abstract class Symbol implements qt.Symbol {
  assignmentDeclarationMembers?: qu.QMap<Declaration>;
  constEnumOnlyModule?: boolean;
  declarations?: Declaration[];
  docComment?: qt.SymbolDisplayPart[];
  exports?: SymbolTable;
  exportSymbol?: Symbol;
  getComment?: qt.SymbolDisplayPart[];
  globalExports?: SymbolTable;
  id?: number;
  isAssigned?: boolean;
  isReferenced?: SymbolFlags;
  isReplaceableByMethod?: boolean;
  members?: SymbolTable;
  mergeId?: number;
  parent?: Symbol;
  setComment?: qt.SymbolDisplayPart[];
  tags?: qt.DocTagInfo[];
  valueDeclaration?: Declaration;
  constructor(public flags: SymbolFlags, public escName: qu.__String) {}
  get name() {
    const n = this.valueDeclaration;
    if (qf.is.privateIdentifierPropertyDeclaration(n)) return idText(n.name);
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
  getDocComment(tc?: qt.TypeChecker): qt.SymbolDisplayPart[] {
    if (!this.docComment) {
      this.docComment = qu.empty;
      if (!this.declarations && (this as qt.TransientSymbol).target && ((this as qt.TransientSymbol).target as qt.TransientSymbol).tupleLabelDeclaration) {
        const labelDecl = ((this as qt.TransientSymbol).target as qt.TransientSymbol).tupleLabelDeclaration!;
        this.docComment = getDocComment([labelDecl], tc);
      } else this.docComment = getDocComment(this.declarations, tc);
    }
    return this.docComment!;
  }
  getCtxComment(ctx?: Node, tc?: qt.TypeChecker): qt.SymbolDisplayPart[] {
    switch (ctx?.kind) {
      case Syntax.GetAccessor:
        if (!this.getComment) {
          this.getComment = qu.empty;
          this.getComment = getDocComment(qu.filter(this.declarations, qf.is.getAccessor), tc);
        }
        return this.getComment!;
      case Syntax.SetAccessor:
        if (!this.setComment) {
          this.setComment = qu.empty;
          this.setComment = getDocComment(qu.filter(this.declarations, isSetAccessor), tc);
        }
        return this.setComment!;
      default:
        return this.getDocComment(tc);
    }
  }
  getDocTags(): qt.DocTagInfo[] {
    if (!this.tags) this.tags = Doc.getDocTagsFromDeclarations(this.declarations);
    return this.tags!;
  }
  getPropertyNameForUniqueESSymbol(): qu.__String {
    return `__@${this.getId()}@${this.escName}` as qu.__String;
  }
  getSymbolNameForPrivateIdentifier(description: qu.__String): qu.__String {
    return `__#${this.getId()}@${description}` as qu.__String;
  }
  isKnownSymbol() {
    return qu.startsWith(this.escName as string, '__@');
  }
  getLocalSymbolForExportDefault() {
    return this.isExportDefaultSymbol() ? this.declarations![0].localSymbol : undefined;
  }
  isExportDefaultSymbol() {
    return qu.length(this.declarations) > 0 && qf.has.syntacticModifier(this.declarations![0], ModifierFlags.Default);
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
  isTransientSymbol(): this is qt.TransientSymbol {
    return (this.flags & SymbolFlags.Transient) !== 0;
  }
  getNonAugmentationDeclaration() {
    const ds = this.declarations;
    return ds && qu.find(ds, (d) => !qf.is.externalModuleAugmentation(d) && !(qf.is.kind(qc.ModuleDeclaration, d) && isGlobalScopeAugmentation(d)));
  }
  setValueDeclaration(d: Declaration) {
    const v = this.valueDeclaration;
    if (
      !v ||
      (!(d.flags & NodeFlags.Ambient && !(v.flags & NodeFlags.Ambient)) && isAssignmentDeclaration(v) && !isAssignmentDeclaration(d)) ||
      (v.kind !== d.kind && qf.is.effectiveModuleDeclaration(v))
    ) {
      this.valueDeclaration = d;
    }
  }
  isFunctionSymbol() {
    if (!this.valueDeclaration) return false;
    const v = this.valueDeclaration;
    return v.kind === Syntax.FunctionDeclaration || (qf.is.kind(qc.VariableDeclaration, v) && v.initer && qf.is.functionLike(v.initer));
  }
  getCheckFlags(): CheckFlags {
    return this.isTransientSymbol() ? this.checkFlags : 0;
  }
  getDeclarationModifierFlagsFromSymbol(): ModifierFlags {
    if (this.valueDeclaration) {
      const f = qf.get.combinedModifierFlags(this.valueDeclaration);
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
  skipAlias(c: qt.TypeChecker) {
    return this.flags & SymbolFlags.Alias ? c.getAliasedSymbol(this) : this;
  }
  getCombinedLocalAndExportSymbolFlags(): SymbolFlags {
    return this.exportSymbol ? this.exportSymbol.flags | this.flags : this.flags;
  }
  isAbstractConstructorSymbol() {
    if (this.flags & SymbolFlags.Class) {
      const d = this.getClassLikeDeclarationOfSymbol();
      return !!d && qf.has.syntacticModifier(d, ModifierFlags.Abstract);
    }
    return false;
  }
  getClassLikeDeclarationOfSymbol(): qt.ClassLikeDeclaration | undefined {
    const ds = this.declarations;
    return ds && qu.find(ds, qf.is.classLike);
  }
  isUMDExportSymbol() {
    return this.declarations?.[0] && qf.is.kind(qc.NamespaceExportDeclaration, this.declarations[0]);
  }
  isShorthandAmbientModuleSymbol() {
    return qf.is.shorthandAmbientModule(this.valueDeclaration);
  }
  abstract merge(t: Symbol, unidirectional?: boolean): Symbol;
}
export class SymbolTable<S extends qt.Symbol = Symbol> extends Map<qu.__String, S> implements qu.EscapedMap<S>, qt.SymbolTable<S> {
  constructor(ss?: readonly S[]) {
    super();
    if (ss) {
      for (const s of ss) {
        this.set(s.escName, s);
      }
    }
  }
  add(ss: SymbolTable<S>, m: qd.Message) {
    ss.forEach((s, id) => {
      const t = this.get(id);
      if (t) qu.ach(t.declarations, addDeclarationDiagnostic(qy.get.unescUnderscores(id), m));
      else this.set(id, s);
    });
    function addDeclarationDiagnostic(id: string, m: qd.Message) {
      return (d: Declaration) => diagnostics.add(qf.create.diagnosticForNode(d, m, id));
    }
  }
  merge(ss: SymbolTable<S>, unidirectional = false) {
    ss.forEach((s, i) => {
      const t = this.get(i);
      this.set(i, t ? s.merge(t, unidirectional) : s);
    });
  }
  combine(ss?: SymbolTable<S>): SymbolTable<S> | undefined {
    if (!qu.hasEntries(this)) return ss;
    if (!qu.hasEntries(ss)) return this;
    const t = new SymbolTable<S>();
    t.merge(this);
    t.merge(ss!);
    return t;
  }
  copy(to: SymbolTable<S>, f: SymbolFlags) {
    if (f) {
      this.forEach((s) => {
        copySymbol(s, to, f);
      });
    }
  }
}
export class Type implements qt.Type {
  aliasSymbol?: Symbol;
  aliasTypeArguments?: readonly Type[];
  aliasTypeArgumentsContainsMarker?: boolean;
  id!: number;
  immediateBaseConstraint?: Type;
  objectFlags?: ObjectFlags;
  pattern?: qt.DestructuringPattern;
  permissiveInstantiation?: Type;
  restrictiveInstantiation?: Type;
  symbol?: Symbol;
  widened?: Type;
  constructor(public checker: qt.TypeChecker, public flags: TypeFlags) {}
  get typeArguments() {
    if (this.getObjectFlags() & ObjectFlags.Reference) return this.checker.getTypeArguments((this as qt.Type) as qt.TypeReference);
    return;
  }
  isUnion(): this is qt.UnionType {
    return !!(this.flags & TypeFlags.Union);
  }
  isIntersection(): this is qt.IntersectionType {
    return !!(this.flags & TypeFlags.Intersection);
  }
  isUnionOrIntersection(): this is qt.UnionOrIntersectionType {
    return !!(this.flags & TypeFlags.UnionOrIntersection);
  }
  isLiteral(): this is qt.LiteralType {
    return !!(this.flags & TypeFlags.StringOrNumberLiteral);
  }
  isStringLiteral(): this is qt.StringLiteralType {
    return !!(this.flags & TypeFlags.StringLiteral);
  }
  isNumberLiteral(): this is qt.NumberLiteralType {
    return !!(this.flags & TypeFlags.NumberLiteral);
  }
  isTypeParameter(): this is qt.TypeParameter {
    return !!(this.flags & TypeFlags.TypeParameter);
  }
  isClassOrInterface(): this is qt.InterfaceType {
    return !!(this.getObjectFlags() & ObjectFlags.ClassOrInterface);
  }
  isClass(): this is qt.InterfaceType {
    return !!(this.getObjectFlags() & ObjectFlags.Class);
  }
  isNullableType() {
    return this.checker.isNullableType(this);
  }
  isAbstractConstructorType() {
    return !!(this.getObjectFlags() & ObjectFlags.Anonymous) && !!this.symbol?.isAbstractConstructorSymbol();
  }
  getFlags() {
    return this.flags;
  }
  getSymbol() {
    return this.symbol;
  }
  getProperties(): qt.Symbol[] {
    return this.checker.getPropertiesOfType(this);
  }
  getProperty(n: string): qt.Symbol | undefined {
    return this.checker.getPropertyOfType(this, n);
  }
  getApparentProperties(): qt.Symbol[] {
    return this.checker.getAugmentedPropertiesOfType(this);
  }
  getCallSignatures(): readonly qt.Signature[] {
    return this.checker.getSignaturesOfType(this, qt.SignatureKind.Call);
  }
  getConstructSignatures(): readonly qt.Signature[] {
    return this.checker.getSignaturesOfType(this, qt.SignatureKind.Construct);
  }
  getStringIndexType(): qt.Type | undefined {
    return this.checker.getIndexTypeOfType(this, qt.IndexKind.String);
  }
  getNumberIndexType(): qt.Type | undefined {
    return this.checker.getIndexTypeOfType(this, qt.IndexKind.Number);
  }
  getBaseTypes(): qt.BaseType[] | undefined {
    return this.isClassOrInterface() ? this.checker.getBaseTypes(this) : undefined;
  }
  getNonNullableType(): qt.Type {
    return this.checker.getNonNullableType(this);
  }
  getNonOptionalType(): qt.Type {
    return this.checker.getNonOptionalType(this);
  }
  getConstraint(): qt.Type | undefined {
    return this.checker.getBaseConstraintOfType(this);
  }
  getDefault(): qt.Type | undefined {
    return this.checker.getDefaultFromTypeParameter(this);
  }
  getObjectFlags(): ObjectFlags {
    return this.flags & TypeFlags.ObjectFlagsType ? (this as qt.ObjectType).objectFlags : 0;
  }
  hasCallOrConstructSignatures(checker: qt.TypeChecker) {
    return checker.getSignaturesOfType(this, qt.SignatureKind.Call).length !== 0 || checker.getSignaturesOfType(this, qt.SignatureKind.Construct).length !== 0;
  }
}
export class Signature implements qt.Signature {
  declaration?: qt.SignatureDeclaration | qt.DocSignature;
  typeParameters?: readonly qt.TypeParameter[];
  parameters!: readonly Symbol[];
  thisParameter?: Symbol;
  resolvedReturnType?: Type;
  resolvedTypePredicate?: qt.TypePredicate;
  minArgumentCount!: number;
  target?: Signature;
  mapper?: qt.TypeMapper;
  unionSignatures?: Signature[];
  erasedSignatureCache?: Signature;
  canonicalSignatureCache?: Signature;
  optionalCallSignatureCache?: { inner?: Signature; outer?: Signature };
  isolatedSignatureType?: qt.ObjectType;
  instantiations?: qu.QMap<Signature>;
  minTypeArgumentCount!: number;
  docComment?: qt.SymbolDisplayPart[];
  docTags?: qt.DocTagInfo[];
  constructor(public checker: qt.TypeChecker, public flags: SignatureFlags) {}
  getReturnType(): Type {
    return this.checker.getReturnTypeOfSignature(this);
  }
  getDocComment(): qt.SymbolDisplayPart[] {
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
export class SourceFile extends Declaration implements qy.SourceFile, qt.SourceFile {
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
  renamedDependencies?: qu.QReadonlyMap<string>;
  hasNoDefaultLib: boolean;
  languageVersion: ScriptTarget;
  externalModuleIndicator?: Nobj;
  scriptKind: ScriptKind;
  commonJsModuleIndicator?: Nobj;
  jsGlobalAugmentations?: SymbolTable;
  identifiers: qu.QMap<string>;
  nodeCount: number;
  identifierCount: number;
  symbolCount: number;
  parseDiagnostics: qd.DiagnosticWithLocation[];
  bindDiagnostics: qd.DiagnosticWithLocation[];
  bindSuggestionDiagnostics?: qd.DiagnosticWithLocation[];
  docDiagnostics?: qd.DiagnosticWithLocation[];
  additionalSyntacticDiagnostics?: readonly qd.DiagnosticWithLocation[];
  lineMap: readonly number[];
  classifiableNames?: qu.ReadonlyEscapedMap<true>;
  commentDirectives?: qt.CommentDirective[];
  resolvedModules?: qu.QMap<ResolvedModuleFull | undefined>;
  resolvedTypeReferenceDirectiveNames: qu.QMap<ResolvedTypeReferenceDirective | undefined>;
  imports: readonly StringLiteralLike[];
  moduleAugmentations: readonly (StringLiteral | Identifier)[];
  patternAmbientModules?: PatternAmbientModule[];
  ambientModuleNames: readonly string[];
  checkJsDirective?: CheckJsDirective;
  version: string;
  pragmas: ReadonlyPragmaMap;
  localJsxNamespace?: qu.__String;
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
  syntacticDiagnostics!: qd.DiagnosticWithLocation[];
  parseDiagnostics!: qd.DiagnosticWithLocation[];
  bindDiagnostics!: qd.DiagnosticWithLocation[];
  bindSuggestionDiagnostics?: qd.DiagnosticWithLocation[];
  isDeclarationFile!: boolean;
  isDefaultLib!: boolean;
  hasNoDefaultLib!: boolean;
  externalModuleIndicator!: Nobj;
  commonJsModuleIndicator!: Nobj;
  nodeCount!: number;
  identifierCount!: number;
  symbolCount!: number;
  version!: string;
  scriptKind!: ScriptKind;
  languageVersion!: ScriptTarget;
  languageVariant!: LanguageVariant;
  identifiers!: qu.QMap<string>;
  nameTable: qu.EscapedMap<number> | undefined;
  resolvedModules: qu.QMap<ResolvedModuleFull> | undefined;
  resolvedTypeReferenceDirectiveNames!: qu.QMap<ResolvedTypeReferenceDirective>;
  imports!: readonly StringLiteralLike[];
  moduleAugmentations!: StringLiteral[];
  private namedDeclarations: qu.QMap<Declaration[]> | undefined;
  ambientModuleNames!: string[];
  checkJsDirective: CheckJsDirective | undefined;
  errorExpectations: qu.TextRange[] | undefined;
  possiblyContainDynamicImport?: boolean;
  pragmas!: PragmaMap;
  localJsxFactory: EntityName | undefined;
  localJsxNamespace: qu.__String | undefined;
  constructor(kind: Syntax, pos: number, end: number) {
    super(kind, pos, end);
  }
  redirectInfo?: RedirectInfo | undefined;
  renamedDependencies?: qu.QReadonlyMap<string> | undefined;
  jsGlobalAugmentations?: SymbolTable<Symbol> | undefined;
  docDiagnostics?: qd.DiagnosticWithLocation[] | undefined;
  additionalSyntacticDiagnostics?: readonly qd.DiagnosticWithLocation[] | undefined;
  classifiableNames?: qu.ReadonlyEscapedMap<true> | undefined;
  commentDirectives?: qt.CommentDirective[] | undefined;
  patternAmbientModules?: PatternAmbientModule[] | undefined;
  exportedModulesFromDeclarationEmit?: ExportedModulesFromDeclarationEmit | undefined;
  id: number;
  flags: NodeFlags;
  modifierFlagsCache: ModifierFlags;
  transformFlags: TransformFlags;
  decorators?: Nodes<Decorator> | undefined;
  modifiers?: qt.Modifiers | undefined;
  original?: Nobj | undefined;
  symbol: Symbol;
  localSymbol?: Symbol | undefined;
  locals?: SymbolTable<Symbol> | undefined;
  nextContainer?: Nobj | undefined;
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
  getStart(s?: qy.SourceFileLike | undefined, includeDocComment?: boolean | undefined) {
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
  getChildAt(i: number, s?: SourceFile | undefined): Nobj {
    throw new Error('Method not implemented.');
  }
  getChildren(s?: qy.SourceFileLike | undefined): Nobj[] {
    throw new Error('Method not implemented.');
  }
  getFirstToken(s?: qy.SourceFileLike | undefined): Nobj | undefined {
    throw new Error('Method not implemented.');
  }
  getLastToken(s?: qy.SourceFileLike | undefined): Nobj | undefined {
    throw new Error('Method not implemented.');
  }
  getLeadingCommentRangesOfNode(n: Node) {
    return n.kind !== Syntax.JsxText ? qy.get.leadingCommentRanges(this.text, n.pos) : undefined;
  }
  isStringDoubleQuoted(s: qt.StringLiteralLike) {
    return this.qf.get.sourceTextOfNodeFromSourceFile(s).charCodeAt(0) === qy.Codes.doubleQuote;
  }
  getResolvedExternalModuleName(host: ResolveModuleNameResolutionHost, file: SourceFile, referenceFile?: SourceFile): string {
    return file.moduleName || qf.get.externalModuleNameFromPath(host, file.fileName, referenceFile && referenceFile.fileName);
  }
  getSourceFilesToEmit(host: EmitHost, targetSourceFile?: SourceFile, forceDtsEmit?: boolean): readonly SourceFile[] {
    const options = host.getCompilerOptions();
    if (options.outFile || options.out) {
      const moduleKind = getEmitModuleKind(options);
      const moduleEmitEnabled = options.emitDeclarationOnly || moduleKind === ModuleKind.AMD || moduleKind === ModuleKind.System;
      return qu.filter(host.getSourceFiles(), (sourceFile) => (moduleEmitEnabled || !qf.is.externalModule(sourceFile)) && sourceFileMayBeEmitted(sourceFile, host, forceDtsEmit));
    } else {
      const sourceFiles = targetSourceFile === undefined ? host.getSourceFiles() : [targetSourceFile];
      return qu.filter(sourceFiles, (sourceFile) => sourceFileMayBeEmitted(sourceFile, host, forceDtsEmit));
    }
  }
  sourceFileMayBeEmitted(sourceFile: SourceFile, host: SourceFileMayBeEmittedHost, forceDtsEmit?: boolean) {
    const options = host.getCompilerOptions();
    return (
      !(options.noEmitForJsFiles && isSourceFileJS(sourceFile)) &&
      !sourceFile.isDeclarationFile &&
      !host.isSourceFileFromExternalLibrary(sourceFile) &&
      !(qf.is.jsonSourceFile(sourceFile) && host.getResolvedProjectReferenceToRedirect(sourceFile.fileName)) &&
      (forceDtsEmit || !host.isSourceOfProjectReferenceRedirect(sourceFile.fileName))
    );
  }
  getLineOfLocalPosition(sourceFile: SourceFile, pos: number) {
    const s = qy.get.lineStarts(sourceFile);
    return Scanner.lineOf(s, pos);
  }
  visit<T>(cb: (n: Nobj) => T | undefined): T | undefined {
    throw new Error('Method not implemented.');
  }
  updateFrom(n: Nobj): this {
    throw new Error('Method not implemented.');
  }
  setOriginal(n?: Nobj | undefined): this {
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
  setRange(r?: qu.Range | undefined): this {
    throw new Error('Method not implemented.');
  }
  movePos(p: number): qu.TextRange {
    throw new Error('Method not implemented.');
  }
  moveEnd(e: number): qu.TextRange {
    throw new Error('Method not implemented.');
  }
  update(t: string, c: qu.TextChange): SourceFile {
    return qp_updateSource(this, t, c);
  }
  getLineAndCharacterOfPosition(pos: number): qy.LineAndChar {
    return getLineAndCharacterOfPosition(this, pos);
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
  getNamedDeclarations(): qu.QMap<Declaration[]> {
    if (!this.namedDeclarations) {
      this.namedDeclarations = this.computeNamedDeclarations();
    }
    return this.namedDeclarations;
  }
  getResolvedModule(sourceFile: SourceFile | undefined, moduleNameText: string): ResolvedModuleFull | undefined {
    return sourceFile && sourceFile.resolvedModules && sourceFile.resolvedModules.get(moduleNameText);
  }
  setResolvedModule(sourceFile: SourceFile, moduleNameText: string, resolvedModule: ResolvedModuleFull): void {
    if (!sourceFile.resolvedModules) {
      sourceFile.resolvedModules = new qu.QMap<ResolvedModuleFull>();
    }
    sourceFile.resolvedModules.set(moduleNameText, resolvedModule);
  }
  setResolvedTypeReferenceDirective(sourceFile: SourceFile, typeReferenceDirectiveName: string, resolvedTypeReferenceDirective?: ResolvedTypeReferenceDirective): void {
    if (!sourceFile.resolvedTypeReferenceDirectiveNames) {
      sourceFile.resolvedTypeReferenceDirectiveNames = new qu.QMap<ResolvedTypeReferenceDirective | undefined>();
    }
    sourceFile.resolvedTypeReferenceDirectiveNames.set(typeReferenceDirectiveName, resolvedTypeReferenceDirective);
  }
  isFileLevelUniqueName(sourceFile: SourceFile, name: string, hasGlobalName?: PrintHandlers['hasGlobalName']): boolean {
    return !(hasGlobalName && hasGlobalName(name)) && !sourceFile.identifiers.has(name);
  }
  isEffectiveExternalModule(node: SourceFile, compilerOptions: qt.CompilerOptions) {
    return qf.is.externalModule(node) || compilerOptions.isolatedModules || (getEmitModuleKind(compilerOptions) === ModuleKind.CommonJS && !!node.commonJsModuleIndicator);
  }
  isEffectiveStrictModeSourceFile(node: SourceFile, compilerOptions: qt.CompilerOptions) {
    switch (node.scriptKind) {
      case ScriptKind.JS:
      case ScriptKind.TS:
      case ScriptKind.JSX:
      case ScriptKind.TSX:
        break;
      default:
        return false;
    }
    if (node.isDeclarationFile) return false;
    if (getStrictOptionValue(compilerOptions, 'alwaysStrict')) return true;
    if (startsWithUseStrict(node.statements)) return true;
    if (qf.is.externalModule(node) || compilerOptions.isolatedModules) {
      if (getEmitModuleKind(compilerOptions) >= ModuleKind.ES2015) return true;
      return !compilerOptions.noImplicitUseStrict;
    }
    return false;
  }
  getSpanOfTokenAtPosition(s: SourceFile, pos: number): qu.TextSpan {
    const scanner = qs_create(true, s.languageVariant);
    scanner.setText(s.text, pos);
    scanner.scan();
    const start = scanner.getTokenPos();
    return qu.TextSpan.from(start, scanner.getTextPos());
  }
  isSourceFileJS(file: SourceFile) {
    return qf.is.inJSFile(file);
  }
  isSourceFileNotJS(file: SourceFile) {
    return !qf.is.inJSFile(file);
  }
  isSourceFileNotJson(file: SourceFile) {
    return !qf.is.jsonSourceFile(file);
  }
  getOriginalSourceFile(sourceFile: SourceFile) {
    return qf.get.parseTreeOf(sourceFile, isSourceFile) || sourceFile;
  }
  isCheckJsEnabledForFile(sourceFile: SourceFile, compilerOptions: qt.CompilerOptions) {
    return sourceFile.checkJsDirective ? sourceFile.checkJsDirective.enabled : compilerOptions.checkJs;
  }
  skipTypeChecking(sourceFile: SourceFile, options: qt.CompilerOptions, host: HostWithIsSourceOfProjectReferenceRedirect) {
    return (options.skipLibCheck && sourceFile.isDeclarationFile) || (options.skipDefaultLibCheck && sourceFile.hasNoDefaultLib) || host.isSourceOfProjectReferenceRedirect(sourceFile.fileName);
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
  private computeNamedDeclarations(): qu.QMap<Declaration[]> {
    const r = new qu.MultiMap<Declaration>();
    this.qf.each.child(visit);
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
      const name = qf.get.nonAssignedNameOfDeclaration(declaration);
      return (
        name &&
        (isComputedPropertyName(name) && qf.is.kind(qc.PropertyAccessExpression, name.expression) ? name.expression.name.text : qf.is.propertyName(name) ? getNameFromPropertyName(name) : undefined)
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
            const lastDeclaration = qu.lastOrUndefined(declarations);
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
          if (!qf.has.syntacticModifier(node, ModifierFlags.ParameterPropertyModifier)) break;
        case Syntax.VariableDeclaration:
        case Syntax.BindingElement: {
          const decl = <VariableDeclaration>node;
          if (qf.is.kind(qc.BindingPattern, decl.name)) {
            qf.each.child(decl.name, visit);
            break;
          }
          if (decl.initer) visit(decl.initer);
        }
        case Syntax.EnumMember:
        case Syntax.PropertyDeclaration:
        case Syntax.PropertySignature:
          addDeclaration(<Declaration>node);
          break;
        case Syntax.ExportDeclaration:
          const exportDeclaration = <ExportDeclaration>node;
          if (exportDeclaration.exportClause) {
            if (qf.is.kind(qc.NamedExports, exportDeclaration.exportClause)) forEach(exportDeclaration.exportClause.elements, visit);
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
          if (qf.get.assignmentDeclarationKind(node as BinaryExpression) !== AssignmentDeclarationKind.None) addDeclaration(node as BinaryExpression);
        default:
          qf.each.child(node, visit);
      }
    }
  }
  static discoverProbableSymlinks(files: readonly SourceFile[], getCanonicalFileName: GetCanonicalFileName, cwd: string): QReadonlyMap<string> {
    const result = new qu.QMap<string>();
    const symlinks = qu.flatten<readonly [string, string]>(
      mapDefined(
        files,
        (sf) =>
          sf.resolvedModules &&
          compact(
            arrayFrom(
              mapIterator(sf.resolvedModules.values(), (res) =>
                res && res.originalPath && res.resolvedFileName !== res.originalPath ? ([res.resolvedFileName, res.originalPath] as const) : undefined
              )
            )
          )
      )
    );
    for (const [resolvedPath, originalPath] of symlinks) {
      const [commonResolved, commonOriginal] = guessDirectorySymlink(resolvedPath, originalPath, cwd, getCanonicalFileName);
      result.set(commonOriginal, commonResolved);
    }
    return result;
  }
}
export class SourceMapSource implements qt.SourceMapSource {
  lineMap!: number[];
  constructor(public fileName: string, public text: string, public skipTrivia = (pos: number) => pos) {}
  getLineAndCharacterOfPosition(pos: number): qy.LineAndChar {
    return getLineAndCharacterOfPosition(this, pos);
  }
}
export function idText(n: qt.Identifier | qt.PrivateIdentifier): string {
  return qy.get.unescUnderscores(n.escapedText);
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
export function cloneMap(m: SymbolTable): SymbolTable;
export function cloneMap<T>(m: qu.QReadonlyMap<T>): qu.QMap<T>;
export function cloneMap<T>(m: qu.ReadonlyEscapedMap<T>): qu.EscapedMap<T>;
export function cloneMap<T>(m: qu.QReadonlyMap<T> | qu.ReadonlyEscapedMap<T> | SymbolTable): qu.QMap<T> | qu.EscapedMap<T> | SymbolTable {
  const c = new qu.QMap<T>();
  copyEntries(m as qu.QMap<T>, c);
  return c;
}
export function createGetSymbolWalker(
  getRestTypeOfSignature: (sig: Signature) => Type,
  getTypePredicateOfSignature: (sig: Signature) => TypePredicate | undefined,
  getReturnTypeOfSignature: (sig: Signature) => Type,
  getBaseTypes: (t: Type) => Type[],
  resolveStructuredTypeMembers: (t: ObjectType) => ResolvedType,
  getTypeOfSymbol: (sym: Symbol) => Type,
  getResolvedSymbol: (node: Node) => Symbol,
  getIndexTypeOfStructuredType: (t: Type, kind: qt.IndexKind) => Type | undefined,
  getConstraintOfTypeParameter: (typeParameter: TypeParameter) => Type | undefined,
  getFirstIdentifier: (node: EntityNameOrEntityNameExpression) => Identifier,
  getTypeArguments: (t: TypeReference) => readonly Type[]
) {
  return getSymbolWalker;
  function getSymbolWalker(accept: (symbol: Symbol) => boolean = () => true): SymbolWalker {
    const visitedTypes: Type[] = [];
    const visitedSymbols: Symbol[] = [];
    return {
      walkType: (t) => {
        try {
          visitType(t);
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
    function visitType(t: Type | undefined) {
      if (!t) return;
      if (visitedTypes[t.id]) return;
      visitedTypes[t.id] = t;
      const shouldBail = visitSymbol(t.symbol);
      if (shouldBail) return;
      if (t.flags & TypeFlags.Object) {
        const objectType = t as ObjectType;
        const objectFlags = objectType.objectFlags;
        if (objectFlags & ObjectFlags.Reference) visitTypeReference(t as TypeReference);
        if (objectFlags & ObjectFlags.Mapped) visitMappedType(t as MappedType);
        if (objectFlags & (ObjectFlags.Class | ObjectFlags.Interface)) visitInterfaceType(t as InterfaceType);
        if (objectFlags & (ObjectFlags.Tuple | ObjectFlags.Anonymous)) visitObjectType(objectType);
      }
      if (t.flags & TypeFlags.TypeParameter) visitTypeParameter(t as TypeParameter);
      if (t.flags & TypeFlags.UnionOrIntersection) visitUnionOrIntersectionType(t as UnionOrIntersectionType);
      if (t.flags & TypeFlags.Index) visitIndexType(t as IndexType);
      if (t.flags & TypeFlags.IndexedAccess) visitIndexedAccessType(t as IndexedAccessType);
    }
    function visitTypeReference(t: TypeReference) {
      visitType(t.target);
      forEach(getTypeArguments(t), visitType);
    }
    function visitTypeParameter(t: TypeParameter) {
      visitType(getConstraintOfTypeParameter(t));
    }
    function visitUnionOrIntersectionType(t: UnionOrIntersectionType) {
      forEach(t.types, visitType);
    }
    function visitIndexType(t: IndexType) {
      visitType(t.type);
    }
    function visitIndexedAccessType(t: IndexedAccessType) {
      visitType(t.objectType);
      visitType(t.indexType);
      visitType(t.constraint);
    }
    function visitMappedType(t: MappedType) {
      visitType(t.typeParameter);
      visitType(t.constraintType);
      visitType(t.templateType);
      visitType(t.modifiersType);
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
    function visitObjectType(t: ObjectType) {
      const stringIndexType = getIndexTypeOfStructuredType(t, qt.IndexKind.String);
      visitType(stringIndexType);
      const numberIndexType = getIndexTypeOfStructuredType(t, qt.IndexKind.Number);
      visitType(numberIndexType);
      const resolved = resolveStructuredTypeMembers(t);
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
          const entity = getResolvedSymbol(qf.get.firstIdentifier(query.exprName));
          visitSymbol(entity);
        }
      });
      return false;
    }
  }
}
function getDocComment(ds?: readonly Declaration[], tc?: qt.TypeChecker): qt.SymbolDisplayPart[] {
  if (!ds) return qu.empty;
  let c = Doc.getDocCommentsFromDeclarations(ds);
  const findInherited = (d: Declaration, pName: string): readonly qt.SymbolDisplayPart[] | undefined => {
    return qu.firstDefined(d.parent ? qf.get.allSuperTypeNodes(d.parent) : qu.empty, (n) => {
      const superType = tc?.getTypeAtLocation(n);
      const baseProperty = superType && tc?.getPropertyOfType(superType, pName);
      const inheritedDocs = baseProperty && baseProperty.getDocComment(tc);
      return inheritedDocs && inheritedDocs.length ? inheritedDocs : undefined;
    });
  };
  if (c.length === 0 || ds.some(qf.has.docInheritDocTag)) {
    forEachUnique(ds, (d) => {
      const inheritedDocs = findInherited(d, d.symbol.name);
      if (inheritedDocs) c = c.length === 0 ? inheritedDocs.slice() : inheritedDocs.concat(lineBreakPart(), c);
    });
  }
  return c;
}
export function getLineOfLocalPositionFromLineMap(lineMap: readonly number[], pos: number) {
  return Scanner.lineOf(lineMap, pos);
}
qu.addMixins(ClassLikeDeclarationBase, [DocContainer]);
qu.addMixins(FunctionOrConstructorTypeNodeBase, [TypeNode]);
qu.addMixins(ObjectLiteralExpressionBase, [Declaration]);
qu.addMixins(LiteralExpression, [LiteralLikeNode]);
let currentAssertionLevel = qu.AssertionLevel.None;
type AssertionKeys = qt.MatchingKeys<typeof Debug, qu.AnyFunction>;
const assertionCache: Partial<Record<AssertionKeys, { level: qu.AssertionLevel; assertion: qu.AnyFunction }>> = {};
export function getAssertionLevel() {
  return currentAssertionLevel;
}
export function setAssertionLevel(l: qu.AssertionLevel) {
  const prevAssertionLevel = currentAssertionLevel;
  currentAssertionLevel = l;
  if (l > prevAssertionLevel) {
    for (const k of qu.getOwnKeys(assertionCache) as AssertionKeys[]) {
      const f = assertionCache[k];
      if (f !== undefined && Debug[k] !== f.assertion && l >= f.level) {
        (Debug as any)[k] = f;
        assertionCache[k] = undefined;
      }
    }
  }
}
export function shouldAssert(l: qu.AssertionLevel): boolean {
  return currentAssertionLevel >= l;
}
function shouldAssertFunction<K extends AssertionKeys>(l: qu.AssertionLevel, name: K): boolean {
  if (!shouldAssert(l)) {
    assertionCache[name] = { level: l, assertion: Debug[name] };
    (Debug as any)[name] = qu.noop;
    return false;
  }
  return true;
}
export const format = new (class {
  emitFlags(f?: qt.EmitFlags): string {
    return qu.formatEnum(f, (qt as any).EmitFlags, true);
  }
  modifierFlags(f?: ModifierFlags): string {
    return qu.formatEnum(f, (qt as any).ModifierFlags, true);
  }
  nodeFlags(f?: NodeFlags): string {
    return qu.formatEnum(f, (qt as any).NodeFlags, true);
  }
  objectFlags(f?: ObjectFlags): string {
    return qu.formatEnum(f, (qt as any).ObjectFlags, true);
  }
  symbol(s: Symbol): string {
    return `{ name: ${qy.get.unescUnderscores(s.escName)}; flags: ${this.symbolFlags(s.flags)}; declarations: ${qu.map(s.declarations, (n) => this.syntax(n.kind))} }`;
  }
  symbolFlags(f?: SymbolFlags): string {
    return qu.formatEnum(f, (qt as any).SymbolFlags, true);
  }
  syntax(k?: Syntax): string {
    return qu.formatEnum(k, (qt as any).SyntaxKind, false);
  }
  transformFlags(f?: TransformFlags): string {
    return qu.formatEnum(f, (qt as any).TransformFlags, true);
  }
  typeFlags(f?: TypeFlags): string {
    return qu.formatEnum(f, (qt as any).TypeFlags, true);
  }
})();
export function failBadSyntax(n: Node, msg?: string, mark?: qu.AnyFunction): never {
  return qu.fail(`${msg || 'Unexpected node.'}\r\nNode ${format.syntax(n.kind)} was unexpected.`, mark || failBadSyntaxKind);
}
export function assertNever(x: never, msg = 'Illegal value:', mark?: qu.AnyFunction): never {
  const v = typeof x === 'object' && qu.hasProperty(x, 'kind') && qu.hasProperty(x, 'pos') && format.syntaxKind ? 'SyntaxKind: ' + format.syntax((x as Node).kind) : JSON.stringify(x);
  return qu.fail(`${msg} ${v}`, mark || assertNever);
}
export function assertEachNode<T extends Node, U extends T>(ns: Nodes<T>, test: (n: T) => n is U, msg?: string, mark?: qu.AnyFunction): asserts ns is Nodes<U>;
export function assertEachNode<T extends Node, U extends T>(ns: readonly T[], test: (n: T) => n is U, msg?: string, mark?: qu.AnyFunction): asserts ns is readonly U[];
export function assertEachNode(ns: readonly Node[], test: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction): void;
export function assertEachNode(ns: readonly Node[], test: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction) {
  if (shouldAssertFunction(qu.AssertionLevel.Normal, 'assertEachNode')) {
    qu.assert(test === undefined || qu.every(ns, test), msg || 'Unexpected node.', () => `Node array did not pass test '${qu.getFunctionName(test)}'.`, mark || assertEachNode);
  }
}
export function assertNode<T extends Node, U extends T>(n: T | undefined, test: (n: T) => n is U, msg?: string, mark?: qu.AnyFunction): asserts n is U;
export function assertNode(n?: Node, test?: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction): void;
export function assertNode(n?: Node, test?: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction) {
  if (shouldAssertFunction(qu.AssertionLevel.Normal, 'assertNode')) {
    qu.assert(
      n !== undefined && (test === undefined || test(n)),
      msg || 'Unexpected node.',
      () => `Node ${format.syntax(n!.kind)} did not pass test '${qu.getFunctionName(test!)}'.`,
      mark || assertNode
    );
  }
}
export function assertNotNode<T extends Node, U extends T>(n: T | undefined, test: (n: Node) => n is U, msg?: string, mark?: qu.AnyFunction): asserts n is Exclude<T, U>;
export function assertNotNode(n?: Node, test?: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction): void;
export function assertNotNode(n?: Node, test?: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction) {
  if (shouldAssertFunction(qu.AssertionLevel.Normal, 'assertNotNode')) {
    qu.assert(
      n === undefined || test === undefined || !test(n),
      msg || 'Unexpected node.',
      () => `Node ${format.syntax(n!.kind)} should not have passed test '${qu.getFunctionName(test!)}'.`,
      mark || assertNotNode
    );
  }
}
export function assertOptionalNode<T extends Node, U extends T>(n: T, test: (n: T) => n is U, msg?: string, mark?: qu.AnyFunction): asserts n is U;
export function assertOptionalNode<T extends Node, U extends T>(n: T | undefined, test: (n: T) => n is U, msg?: string, mark?: qu.AnyFunction): asserts n is U | undefined;
export function assertOptionalNode(n?: Node, test?: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction): void;
export function assertOptionalNode(n?: Node, test?: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction) {
  if (shouldAssertFunction(qu.AssertionLevel.Normal, 'assertOptionalNode')) {
    qu.assert(
      test === undefined || n === undefined || test(n),
      msg || 'Unexpected node.',
      () => `Node ${format.syntax(n!.kind)} did not pass test '${qu.getFunctionName(test!)}'.`,
      mark || assertOptionalNode
    );
  }
}
export function assertOptionalToken<T extends Node, K extends Syntax>(n: T, k: K, msg?: string, mark?: qu.AnyFunction): asserts n is Extract<T, { readonly kind: K }>;
export function assertOptionalToken<T extends Node, K extends Syntax>(n: T | undefined, k: K, msg?: string, mark?: qu.AnyFunction): asserts n is Extract<T, { readonly kind: K }> | undefined;
export function assertOptionalToken(n?: Node, k?: Syntax, msg?: string, mark?: qu.AnyFunction): void;
export function assertOptionalToken(n?: Node, k?: Syntax, msg?: string, mark?: qu.AnyFunction) {
  if (shouldAssertFunction(qu.AssertionLevel.Normal, 'assertOptionalToken')) {
    qu.assert(
      k === undefined || n === undefined || n.kind === k,
      msg || 'Unexpected node.',
      () => `Node ${format.syntax(n!.kind)} was not a '${format.syntax(k)}' token.`,
      mark || assertOptionalToken
    );
  }
}
export function assertMissingNode(n?: Node, msg?: string, mark?: qu.AnyFunction): asserts n is undefined;
export function assertMissingNode(n?: Node, msg?: string, mark?: qu.AnyFunction) {
  if (shouldAssertFunction(qu.AssertionLevel.Normal, 'assertMissingNode')) {
    qu.assert(n === undefined, msg || 'Unexpected node.', () => `Node ${format.syntax(n!.kind)} was unexpected'.`, mark || assertMissingNode);
  }
}
export const resolvingEmptyArray: never[] = [] as never[];
export const externalHelpersModuleNameText = 'tslib';
export const defaultMaximumTruncationLength = 160;
export const noTruncationMaximumTruncationLength = 1_000_000;
export function declarationNameToString(name: DeclarationName | QualifiedName | undefined) {
  return !name || qf.get.fullWidth(name) === 0 ? '(Missing)' : qf.get.textOf(name);
}
export function entityNameToString(name: EntityNameOrEntityNameExpression | JsxTagNameExpression | PrivateIdentifier): string {
  switch (name.kind) {
    case Syntax.ThisKeyword:
      return 'this';
    case Syntax.PrivateIdentifier:
    case Syntax.Identifier:
      return qf.get.fullWidth(name) === 0 ? idText(name) : qf.get.textOf(name);
    case Syntax.QualifiedName:
      return entityNameToString(name.left) + '.' + entityNameToString(name.right);
    case Syntax.PropertyAccessExpression:
      if (qf.is.kind(qc.Identifier, name.name) || qf.is.kind(qc.PrivateIdentifier, name.name)) return entityNameToString(name.expression) + '.' + entityNameToString(name.name);
      return qu.assertNever(name.name);
    default:
      return qu.assertNever(name);
  }
}
export function isBindableObjectDefinePropertyCall(expr: CallExpression): expr is BindableObjectDefinePropertyCall {
  return (
    length(expr.arguments) === 3 &&
    qf.is.kind(qc.PropertyAccessExpression, expr.expression) &&
    qf.is.kind(qc.Identifier, expr.expression.expression) &&
    idText(expr.expression.expression) === 'Object' &&
    idText(expr.expression.name) === 'defineProperty' &&
    StringLiteral.orNumericLiteralLike(expr.arguments[1]) &&
    qf.is.bindableStaticNameExpression(expr.arguments[0], true)
  );
}
export function isSpecialPropertyDeclaration(expr: PropertyAccessExpression | ElementAccessExpression): expr is PropertyAccessExpression | LiteralLikeElementAccessExpression {
  return (
    qf.is.inJSFile(expr) &&
    expr.parent &&
    expr.parent.kind === Syntax.ExpressionStatement &&
    (!qf.is.kind(qc.ElementAccessExpression, expr) || qf.is.literalLikeElementAccess(expr)) &&
    !!qc.getDoc.typeTag(expr.parent)
  );
}
export function importFromModuleSpecifier(node: StringLiteralLike): AnyValidImportOrReExport {
  return tryGetImportFromModuleSpecifier(node) || qu.failBadSyntax(node.parent);
}
export function tryGetImportFromModuleSpecifier(node: StringLiteralLike): AnyValidImportOrReExport | undefined {
  switch (node.parent.kind) {
    case Syntax.ImportDeclaration:
    case Syntax.ExportDeclaration:
      return node.parent as AnyValidImportOrReExport;
    case Syntax.ExternalModuleReference:
      return (node.parent as ExternalModuleReference).parent as AnyValidImportOrReExport;
    case Syntax.CallExpression:
      return qf.is.importCall(node.parent) || qf.is.requireCall(node.parent, false) ? (node.parent as RequireOrImportCall) : undefined;
    case Syntax.LiteralType:
      assert(qf.is.kind(qc.StringLiteral, node));
      return tryCast(node.parent.parent, ImportTypeNode.kind) as ValidImportTypeNode | undefined;
    default:
      return;
  }
}
export function isDefaultImport(node: ImportDeclaration | ImportEqualsDeclaration | ExportDeclaration): boolean {
  return node.kind === Syntax.ImportDeclaration && !!node.importClause && !!node.importClause.name;
}
export function isDynamicName(name: DeclarationName): boolean {
  if (!(name.kind === Syntax.ComputedPropertyName || name.kind === Syntax.ElementAccessExpression)) return false;
  const expr = qf.is.kind(qc.ElementAccessExpression, name) ? name.argumentExpression : name.expression;
  return !StringLiteral.orNumericLiteralLike(expr) && !qf.is.signedNumericLiteral(expr) && !qf.is.wellKnownSymbolSyntactically(expr);
}
export function isParameterDeclaration(node: VariableLikeDeclaration) {
  const root = qf.get.rootDeclaration(node);
  return root.kind === Syntax.Parameter;
}
export function hostUsesCaseSensitiveFileNames(host: { useCaseSensitiveFileNames?(): boolean }): boolean {
  return host.useCaseSensitiveFileNames ? host.useCaseSensitiveFileNames() : false;
}
export function hostGetCanonicalFileName(host: { useCaseSensitiveFileNames?(): boolean }): GetCanonicalFileName {
  return createGetCanonicalFileName(hostUsesCaseSensitiveFileNames(host));
}
export function getExternalModuleNameFromDeclaration(
  host: ResolveModuleNameResolutionHost,
  resolver: EmitResolver,
  declaration: ImportEqualsDeclaration | ImportDeclaration | ExportDeclaration | ModuleDeclaration | ImportTypeNode
): string | undefined {
  const file = resolver.getExternalModuleFileFromDeclaration(declaration);
  if (!file || file.isDeclarationFile) {
    return;
  }
  return getResolvedExternalModuleName(host, file);
}
export function getOwnEmitOutputFilePath(fileName: string, host: EmitHost, extension: string) {
  const compilerOptions = host.getCompilerOptions();
  let emitOutputFilePathWithoutExtension: string;
  if (compilerOptions.outDir) {
    emitOutputFilePathWithoutExtension = removeFileExtension(getSourceFilePathInNewDir(fileName, host, compilerOptions.outDir));
  } else {
    emitOutputFilePathWithoutExtension = removeFileExtension(fileName);
  }
  return emitOutputFilePathWithoutExtension + extension;
}
export function getDeclarationEmitOutputFilePath(fileName: string, host: EmitHost) {
  return getDeclarationEmitOutputFilePathWorker(fileName, host.getCompilerOptions(), host.getCurrentDirectory(), host.getCommonSourceDirectory(), (f) => host.getCanonicalFileName(f));
}
export function getDeclarationEmitOutputFilePathWorker(
  fileName: string,
  options: CompilerOptions,
  currentDirectory: string,
  commonSourceDirectory: string,
  getCanonicalFileName: GetCanonicalFileName
): string {
  const outputDir = options.declarationDir || options.outDir;
  const path = outputDir ? getSourceFilePathInNewDirWorker(fileName, outputDir, currentDirectory, commonSourceDirectory, getCanonicalFileName) : fileName;
  return removeFileExtension(path) + Extension.Dts;
}
export interface EmitFileNames {
  jsFilePath?: string | undefined;
  sourceMapFilePath?: string | undefined;
  declarationFilePath?: string | undefined;
  declarationMapPath?: string | undefined;
  buildInfoPath?: string | undefined;
}
export function getSourceFilePathInNewDir(fileName: string, host: EmitHost, newDirPath: string): string {
  return getSourceFilePathInNewDirWorker(fileName, newDirPath, host.getCurrentDirectory(), host.getCommonSourceDirectory(), (f) => host.getCanonicalFileName(f));
}
export function emitNewLineBeforeLeadingComments(lineMap: readonly number[], writer: EmitTextWriter, node: TextRange, leadingComments: readonly CommentRange[] | undefined) {
  emitNewLineBeforeLeadingCommentsOfPosition(lineMap, writer, node.pos, leadingComments);
}
export function emitNewLineBeforeLeadingCommentsOfPosition(lineMap: readonly number[], writer: EmitTextWriter, pos: number, leadingComments: readonly CommentRange[] | undefined) {
  if (
    leadingComments &&
    leadingComments.length &&
    pos !== leadingComments[0].pos &&
    getLineOfLocalPositionFromLineMap(lineMap, pos) !== getLineOfLocalPositionFromLineMap(lineMap, leadingComments[0].pos)
  ) {
    writer.writeLine();
  }
}
export function emitNewLineBeforeLeadingCommentOfPosition(lineMap: readonly number[], writer: EmitTextWriter, pos: number, commentPos: number) {
  if (pos !== commentPos && getLineOfLocalPositionFromLineMap(lineMap, pos) !== getLineOfLocalPositionFromLineMap(lineMap, commentPos)) {
    writer.writeLine();
  }
}
export function tryExtractTSExtension(fileName: string): string | undefined {
  return find(supportedTSExtensionsForExtractExtension, (extension) => fileExtensionIs(fileName, extension));
}
export function readJson(path: string, host: { readFile(fileName: string): string | undefined }): object {
  try {
    const jsonText = host.readFile(path);
    if (!jsonText) return {};
    const result = parseConfigFileTextToJson(path, jsonText);
    if (result.error) return {};
    return result.config;
  } catch (e) {
    return {};
  }
}
export function directoryProbablyExists(directoryName: string, host: { directoryExists?: (directoryName: string) => boolean }): boolean {
  return !host.directoryExists || host.directoryExists(directoryName);
}
const carriageReturnLineFeed = '\r\n';
const lineFeed = '\n';
export function getNewLineCharacter(options: CompilerOptions | PrinterOptions, getNewLine?: () => string): string {
  switch (options.newLine) {
    case NewLineKind.CarriageReturnLineFeed:
      return carriageReturnLineFeed;
    case NewLineKind.LineFeed:
      return lineFeed;
  }
  return getNewLine ? getNewLine() : sys ? sys.newLine : carriageReturnLineFeed;
}
export function getInitializedVariables(node: VariableDeclarationList) {
  return filter(node.declarations, isInitializedVariable);
}
function isInitializedVariable(node: VariableDeclaration) {
  return node.initer !== undefined;
}
export function isWatchSet(options: CompilerOptions) {
  return options.watch && options.hasOwnProperty('watch');
}
export function closeFileWatcher(watcher: FileWatcher) {
  watcher.close();
}
export function forSomeAncestorDirectory(directory: string, cb: (directory: string) => boolean): boolean {
  return !!forEachAncestorDirectory(directory, (d) => (cb(d) ? true : undefined));
}
export function showModuleSpecifier({ moduleSpecifier }: ImportDeclaration): string {
  return qf.is.kind(qc.StringLiteral, moduleSpecifier) ? moduleSpecifier.text : qf.get.textOf(moduleSpecifier);
}
export function getNameOfAccessExpression(node: AccessExpression) {
  if (node.kind === Syntax.PropertyAccessExpression) return node.name;
  assert(node.kind === Syntax.ElementAccessExpression);
  return node.argumentExpression;
}
export function isBundleFileTextLike(section: BundleFileSection): section is BundleFileTextLike {
  switch (section.kind) {
    case BundleFileSectionKind.Text:
    case BundleFileSectionKind.Internal:
      return true;
    default:
      return false;
  }
}