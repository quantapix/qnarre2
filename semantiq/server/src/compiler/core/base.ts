import * as qc from './index';
import * as qd from '../diagnostic';
import { qf } from './frame';
import { Node } from '../type';
import { CheckFlags, EmitFlags, ModifierFlags, NodeFlags, ObjectFlags, SignatureFlags, SymbolFlags, TrafoFlags, TypeFlags } from '../type';
import * as qt from '../type';
import * as qu from '../util';
import { SourceFileLike, Syntax } from '../syntax';
import * as qy from '../syntax';
export interface ReadonlyNodeSet<T extends Node> {
  has(n: T): boolean;
  each(cb: (n: T) => void): void;
  some(cb: (n: T) => boolean): boolean;
}
export class NodeSet<T extends Node> implements ReadonlyNodeSet<T> {
  private map = new qu.QMap<T>();
  has(n: T) {
    return this.map.has(String(qf.get.nodeId(n)));
  }
  add(n: T) {
    this.map.set(String(qf.get.nodeId(n)), n);
  }
  tryAdd(n: T) {
    if (this.has(n)) return false;
    this.add(n);
    return true;
  }
  each(cb: (n: T) => void) {
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
  has(n: N) {
    return this.map.has(String(qf.get.nodeId(n)));
  }
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
  each(cb: (v: V, n: N) => void) {
    this.map.forEach(({ n, v }) => cb(v, n));
  }
}
export class Nodes<T extends qt.Nobj = qt.Nobj> extends Array<T> implements qt.Nodes<T> {
  pos = -1;
  end = -1;
  trailingComma?: boolean;
  trafoFlags = TrafoFlags.None;
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
  get range() {
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
  children?: Nobj[];
  contextualType?: qt.Type;
  decorators?: Nodes<qt.Decorator>;
  doc?: qt.Doc[];
  emitNode?: qt.EmitNode;
  flags = NodeFlags.None;
  flowNode?: qt.FlowNode;
  id?: number;
  inferenceContext?: qt.InferenceContext;
  kind!: Syntax;
  locals?: qt.SymbolTable;
  localSymbol?: qt.Symbol;
  modifierFlagsCache = ModifierFlags.None;
  modifiers?: qt.Modifiers;
  nextContainer?: Node;
  original?: Node;
  symbol!: qt.Symbol;
  trafoFlags = TrafoFlags.None;
  constructor(synth?: boolean, k?: Syntax, pos?: number, end?: number, public parent?: qt.Node) {
    super(pos, end);
    if (k && this.kind !== k) this.kind = k;
    if (synth) this.flags |= NodeFlags.Synthesized;
    if (parent) this.flags = parent.flags & NodeFlags.ContextFlags;
  }
  get range() {
    return new qu.TextRange(this.tokenPos(), this.end);
  }
  get sourceFile(): qt.SourceFile {
    let n = this as Node | undefined;
    while (n) {
      if (n.kind === Syntax.SourceFile) return n as qt.SourceFile;
      n = n.parent;
    }
    qu.fail();
  }
  tokenPos(s?: SourceFileLike, doc?: boolean): number {
    const n = this as Node;
    if (qf.is.missing(n)) return this.pos;
    if (qf.is.doc.node(n)) return qy.skipTrivia((s || this.sourceFile)!.text, this.pos, false, true);
    if (doc && qf.is.withDocNodes(n)) return (this.doc![0] as Nobj).tokenPos(s);
    if (qf.is.kind(SyntaxList, n) && this.children?.length) return this.children![0].tokenPos(s, doc);
    return qy.skipTrivia((s || this.sourceFile).text, this.pos);
  }
  start(s?: SourceFileLike, doc?: boolean) {
    return this.tokenPos(s, doc);
  }
  fullStart() {
    return this.pos;
  }
  width(s?: SourceFileLike) {
    qu.assert(!qu.isSynthesized(this.pos) && !qu.isSynthesized(this.end));
    return this.end - this.start(s);
  }
  fullWidth() {
    qu.assert(!qu.isSynthesized(this.pos) && !qu.isSynthesized(this.end));
    return this.end - this.pos;
  }
  leadingTriviaWidth(s?: SourceFileLike) {
    qu.assert(!qu.isSynthesized(this.pos) && !qu.isSynthesized(this.end));
    return this.start(s) - this.pos;
  }
  fullText(s?: SourceFileLike) {
    qu.assert(!qu.isSynthesized(this.pos) && !qu.isSynthesized(this.end));
    return (s || this.sourceFile).text.substring(this.pos, this.end);
  }
  getText(s?: SourceFileLike) {
    qu.assert(!qu.isSynthesized(this.pos) && !qu.isSynthesized(this.end));
    return (s || this.sourceFile).text.substring(this.start(s), this.end);
  }
  childCount(s?: SourceFileLike) {
    return this.getChildren(s).length;
  }
  childAt(i: number, s?: SourceFileLike) {
    return this.getChildren(s)[i];
  }
  getChildren(s?: SourceFileLike) {
    qu.assert(!qu.isSynthesized(this.pos) && !qu.isSynthesized(this.end));
    const scanner = qs_getRaw();
    const addSynthetics = (ns: qu.Push<Nobj>, pos: number, end: number) => {
      scanner.setTextPos(pos);
      while (pos < end) {
        const t = scanner.scan();
        const e = scanner.getTextPos();
        if (e <= end) {
          qu.assert(t !== Syntax.Identifier);
          ns.push(qf.create.node(t, pos, e, this));
        }
        pos = e;
        if (t === Syntax.EndOfFileToken) break;
      }
    };
    const createList = (ns: qt.Nodes) => {
      const r = qf.create.node(Syntax.SyntaxList, ns.pos, ns.end, this);
      r.children = [];
      let p = ns.pos;
      for (const n of ns) {
        addSynthetics(r.children, p, n.pos);
        r.children.push(n);
        p = n.end;
      }
      addSynthetics(r.children, p, ns.end);
      return r;
    };
    const createChildren = () => {
      const cs = [] as Nobj[];
      if (qy.is.node(this.kind)) {
        const n = this as Node;
        if (qf.is.doc.commentContainingNode(n)) {
          qf.each.child(n, (c) => {
            if (c) cs.push(c as Nobj);
          });
          return cs;
        }
        scanner.setText((s || this.sourceFile).text);
        let p = this.pos;
        const one = (n?: Node) => {
          if (n) {
            addSynthetics(cs, p, n.pos);
            cs.push(n as Nobj);
            p = n.end;
          }
        };
        const all = (ns: qt.Nodes) => {
          addSynthetics(cs, p, ns.pos);
          cs.push(createList(ns));
          p = ns.end;
        };
        qu.each(this.doc as Node[], one);
        p = this.pos;
        qf.each.child(this as Node, one, all);
        addSynthetics(cs, p, this.end);
        scanner.setText(undefined);
      }
      return cs;
    };
    return this.children || (this.children = createChildren());
  }
  firstToken(s?: SourceFileLike): Nobj | undefined {
    qu.assert(!qu.isSynthesized(this.pos) && !qu.isSynthesized(this.end));
    const cs = this.getChildren(s);
    if (!cs.length) return;
    const c = qu.find(cs, (c) => c.kind < Syntax.FirstDocNode || c.kind > Syntax.LastDocNode)!;
    return c.kind < Syntax.FirstNode ? c : c.firstToken(s);
  }
  lastToken(s?: SourceFileLike): Nobj | undefined {
    qu.assert(!qu.isSynthesized(this.pos) && !qu.isSynthesized(this.end));
    const cs = this.getChildren(s);
    const c = qu.lastOrUndefined(cs);
    if (!c) return;
    return c.kind < Syntax.FirstNode ? c : c.lastToken(s);
  }
  indexIn(ns: readonly Node[]) {
    return qu.binarySearch(ns, this as Node, (n) => n.pos, qu.compareNumbers);
  }
  visit<T>(cb: (n?: Node) => T | undefined): T | undefined {
    return cb(this as Node);
  }
  updateFrom(n: Node): this {
    if (this === n) return this;
    const r = this.setOriginal(n).setRange(n);
    compute.aggregate(r as Node);
    return r;
  }
  setOriginal(n?: Node): this {
    this.original = n;
    if (n) {
      const e = n.emitNode;
      if (e) this.emitNode = mergeEmitNode(e, this.emitNode);
    }
    return this;
  }
  movePastDecorators(): qu.TextRange {
    return this.decorators && this.decorators.length > 0 ? this.movePos(this.decorators.end) : this;
  }
  movePastModifiers(): qu.TextRange {
    return this.modifiers && this.modifiers.length > 0 ? this.movePos(this.modifiers.end) : this.movePastDecorators();
  }
}
export class SyntaxList extends Nobj implements qt.SyntaxList {
  static readonly kind = Syntax.SyntaxList;
  children!: Nobj[];
}
SyntaxList.prototype.kind = SyntaxList.kind;
export abstract class Tobj extends Nobj implements qt.Tobj {
  _typingBrand: any;
}
export abstract class WithArgsTobj extends Tobj implements qt.WithArgsTobj {
  typeArgs?: qt.Nodes<qt.Typing>;
}
export abstract class Decl extends Nobj implements qt.Decl {
  _declarationBrand: any;
}
export abstract class NamedDecl extends Decl implements qt.NamedDecl {
  name?: qt.DeclarationName;
}
export abstract class DeclarationStmt extends NamedDecl implements qt.DeclarationStmt {
  name?: qt.Identifier | qt.StringLiteral | qt.NumericLiteral;
  _statementBrand: any;
}
export abstract class ClassElem extends NamedDecl implements qt.ClassElem {
  name?: qt.PropertyName;
  _classElemBrand: any;
}
export abstract class ClassLikeDecl extends NamedDecl implements qt.ClassLikeDecl {
  kind!: Syntax.ClassDeclaration | Syntax.ClassExpression;
  name?: qt.Identifier;
  typeParams?: qt.Nodes<qt.TypeParamDeclaration>;
  heritageClauses?: qt.Nodes<qt.HeritageClause>;
  members: qt.Nodes<qt.ClassElem>;
  constructor(
    s: boolean,
    k: Syntax.ClassDeclaration | Syntax.ClassExpression,
    ts: readonly qt.TypeParamDeclaration[] | undefined,
    hs: readonly qt.HeritageClause[] | undefined,
    es: readonly qt.ClassElem[]
  ) {
    super(s, k);
    this.typeParams = Nodes.from(ts);
    this.heritageClauses = Nodes.from(hs);
    this.members = new Nodes(es);
  }
}
export abstract class ObjectLiteralElem extends NamedDecl implements qt.ObjectLiteralElem {
  name?: qt.PropertyName;
  _objectLiteralBrand: any;
}
export abstract class PropertyLikeDecl extends NamedDecl implements qt.PropertyLikeDecl {
  name!: qt.PropertyName;
}
export abstract class TypeElem extends NamedDecl implements qt.TypeElem {
  name?: qt.PropertyName;
  questionToken?: qt.QuestionToken;
  _typeElemBrand: any;
}
export abstract class SignatureDecl extends NamedDecl implements qt.SignatureDecl {
  kind!: qt.SignatureDeclaration['kind'];
  name?: qt.PropertyName;
  typeParams?: qt.Nodes<qt.TypeParamDeclaration>;
  params!: qt.Nodes<qt.ParamDeclaration>;
  type?: qt.Typing;
  typeArgs?: qt.Nodes<qt.Typing>;
  constructor(s: boolean, k: qt.SignatureDeclaration['kind'], ts: readonly qt.TypeParamDeclaration[] | undefined, ps?: readonly qt.ParamDeclaration[], t?: qt.Typing, ta?: readonly qt.Typing[]) {
    super(s, k);
    this.typeParams = Nodes.from(ts);
    this.params = new Nodes(ps);
    this.type = t;
    this.typeArgs = Nodes.from(ta);
  }

  /*
  update<T extends qt.SignatureDeclaration>(n: T, ts: Nodes<TypeParamDeclaration> | undefined, ps: Nodes<ParamDeclaration>, t?: qc.Typing): T {
    return this.typeParams !== ts || this.params !== ps || this.type !== t ? (new create(this.kind, ts, ps, t) as T).updateFrom(this) : this;
  }
  */
}
export abstract class FunctionLikeDecl extends SignatureDecl implements qt.FunctionLikeDecl {
  cache?: readonly qt.DocTag[];
  asteriskToken?: qt.AsteriskToken;
  questionToken?: qt.QuestionToken;
  exclamationToken?: qt.ExclamationToken;
  body?: qt.Block | qt.Expression;
  endFlowNode?: qt.FlowNode;
  returnFlowNode?: qt.FlowNode;
  _functionLikeDeclarationBrand: any;
}
export abstract class FunctionOrConstructorTobj extends SignatureDecl implements qt.FunctionOrConstructorTobj {
  kind!: Syntax.FunctionTyping | Syntax.ConstructorTyping;
  type!: qt.Typing;
  cache?: readonly qt.DocTag[];
  constructor(s: boolean, k: Syntax.FunctionTyping | Syntax.ConstructorTyping, ts: readonly qt.TypeParamDeclaration[] | undefined, ps: readonly qt.ParamDeclaration[], t?: qt.Typing) {
    super(s, k, ts, ps, t);
  }
  _typingBrand: any;
}
export abstract class Expr extends Nobj implements qt.Expr {
  _expressionBrand: any;
}
export abstract class UnaryExpr extends Expr implements qt.UnaryExpr {
  _unaryExpressionBrand: any;
}
export abstract class UpdateExpr extends UnaryExpr implements qt.UpdateExpr {
  _updateExpressionBrand: any;
}
export abstract class LeftExpr extends UpdateExpr implements qt.LeftExpr {
  _leftHandSideExpressionBrand: any;
}
export abstract class MemberExpr extends LeftExpr implements qt.MemberExpr {
  _memberExpressionBrand: any;
}
export abstract class PrimaryExpr extends MemberExpr implements qt.PrimaryExpr {
  _primaryExpressionBrand: any;
}
export abstract class ObjectLiteralExpr<T extends qt.ObjectLiteralElem> extends PrimaryExpr implements qt.ObjectLiteralExpr<T> {
  properties!: Nodes<T>;
  _declarationBrand: any;
}
export abstract class TokenOrIdentifier extends Nobj {
  getChildren(): Nobj[] {
    return this.kind === Syntax.EndOfFileToken ? (this.doc as Nobj[]) || qu.empty : qu.empty;
  }
}
export class Token<T extends Syntax> extends TokenOrIdentifier implements qt.Token<T> {
  kind!: T;
  constructor(k: T, pos?: number, end?: number) {
    super(undefined, k, pos, end);
  }
}
export abstract class Stmt extends Nobj implements qt.Stmt {
  _statementBrand: any;
  static insertStatementsAfterPrologue<T extends Stmt>(to: T[], from: readonly T[] | undefined, isPrologue: (n: Node) => boolean): T[] {
    if (from === undefined || from.length === 0) return to;
    let i = 0;
    for (; i < to.length; ++i) {
      if (!isPrologue(to[i] as Node)) break;
    }
    to.splice(i, 0, ...from);
    return to;
  }
  static insertStatementAfterPrologue<T extends Stmt>(to: T[], s: T | undefined, isPrologue: (n: Node) => boolean): T[] {
    if (s === undefined) return to;
    let i = 0;
    for (; i < to.length; ++i) {
      if (!isPrologue(to[i] as Node)) break;
    }
    to.splice(i, 0, s);
    return to;
  }
  static insertStatementsAfterStandardPrologue<T extends Stmt>(to: T[], from: readonly T[] | undefined): T[] {
    return this.insertStatementsAfterPrologue(to, from, isPrologueDirective);
  }
  static insertStatementsAfterCustomPrologue<T extends Stmt>(to: T[], from: readonly T[] | undefined): T[] {
    return this.insertStatementsAfterPrologue(to, from, isAnyPrologueDirective);
  }
  static insertStatementAfterStandardPrologue<T extends Stmt>(to: T[], statement: T | undefined): T[] {
    return this.insertStatementAfterPrologue(to, statement, isPrologueDirective);
  }
  static insertStatementAfterCustomPrologue<T extends Stmt>(to: T[], statement: T | undefined): T[] {
    return this.insertStatementAfterPrologue(to, statement, isAnyPrologueDirective);
  }
  addPrologue(to: qt.Statement[], from: readonly qt.Statement[], strict?: boolean, cb?: (n: Nobj) => VisitResult<Nobj>): number {
    const i = addStandardPrologue(to, from, strict);
    return addCustomPrologue(to, from, i, cb);
  }
  addStandardPrologue(to: qt.Statement[], from: readonly qt.Statement[], strict?: boolean): number {
    qu.assert(to.length === 0);
    let useStrict = false;
    let i = 0;
    const l = from.length;
    while (i < l) {
      const s = from[i];
      if (qf.is.prologueDirective(s)) {
        if (qf.is.useStrictPrologue(s)) useStrict = true;
        to.push(s);
      } else break;
      i++;
    }
    if (strict && !useStrict) to.push(startOnNewLine(new qc.ExpressionStatement(qc.asLiteral('use strict'))));
    return i;
  }
  addCustomPrologue(target: qt.Statement[], source: readonly qt.Statement[], i: number, visitor?: (n: Nobj) => VisitResult<Nobj>, filter?: (n: Nobj) => boolean): number;
  addCustomPrologue(target: qt.Statement[], source: readonly qt.Statement[], i: number | undefined, visitor?: (n: Nobj) => VisitResult<Nobj>, filter?: (n: Nobj) => boolean): number | undefined;
  addCustomPrologue(
    target: qt.Statement[],
    source: readonly qt.Statement[],
    i: number | undefined,
    visitor?: (n: Nobj) => VisitResult<Nobj>,
    filter: (n: Nobj) => boolean = () => true
  ): number | undefined {
    const numStatements = source.length;
    while (i !== undefined && i < numStatements) {
      const s = source[i];
      if (qf.get.emitFlags(s) & EmitFlags.CustomPrologue && filter(s)) qu.append(target, visitor ? visitNode(s, visitor, isStatement) : s);
      else break;
      i++;
    }
    return i;
  }
  findUseStrictPrologue(ss: readonly qt.Statement[]): qt.Statement | undefined {
    for (const s of ss) {
      if (qf.is.prologueDirective(s)) {
        if (qf.is.useStrictPrologue(s)) return s;
      } else break;
    }
    return;
  }
  startsWithUseStrict(ss: readonly qt.Statement[]) {
    const firstStatement = qu.firstOrUndefined(ss);
    return firstStatement !== undefined && qf.is.prologueDirective(firstStatement) && qf.is.useStrictPrologue(firstStatement);
  }
  createForOfBindingStatement(n: qt.ForIniter, boundValue: Expression): qt.Statement {
    if (qf.is.kind(qc.VariableDeclarationList, n)) {
      const firstDeclaration = first(n.declarations);
      const updatedDeclaration = firstDeclaration.update(firstDeclaration.name, undefined, boundValue);
      return setRange(new qc.VariableStatement(undefined, n.update([updatedDeclaration])), n);
    } else {
      const updatedExpression = setRange(qf.create.assignment(n, boundValue), n);
      return setRange(new qc.ExpressionStatement(updatedExpression), n);
    }
  }
  insertLeadingStatement(dest: qt.Statement, source: qt.Statement) {
    if (qf.is.kind(qc.Block, dest)) return dest.update(setRange(new qc.Nodes([source, ...dest.statements]), dest.statements));
    return new qc.Block(new qc.Nodes([dest, source]), true);
  }
  restoreEnclosingLabel(n: qt.Statement, outermostLabeledStatement: qt.LabeledStatement | undefined, afterRestoreLabelCallback?: (n: LabeledStatement) => void): qt.Statement {
    if (!outermostLabeledStatement) return n;
    const updated = updateLabel(
      outermostLabeledStatement,
      outermostLabeledStatement.label,
      outermostLabeledStatement.statement.kind === Syntax.LabeledStatement ? restoreEnclosingLabel(n, <LabeledStatement>outermostLabeledStatement.statement) : n
    );
    if (afterRestoreLabelCallback) afterRestoreLabelCallback(outermostLabeledStatement);
    return updated;
  }
  canHaveExportModifier() {
    return (
      qf.is.kind(qc.EnumDeclaration, this) ||
      qf.is.kind(qc.VariableStatement, this) ||
      qf.is.kind(qc.FunctionDeclaration, this) ||
      qf.is.kind(qc.ClassDeclaration, this) ||
      (qf.is.kind(qc.ModuleDeclaration, this) && !qf.is.externalModuleAugmentation(this) && !n.qf.is.globalScopeAugmentation()) ||
      qf.is.kind(qc.InterfaceDeclaration, this) ||
      qf.is.typeDeclaration(this)
    );
  }
}
export abstract class IterationStmt extends Stmt implements qt.IterationStmt {
  statement!: qt.Statement;
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
      qu.assert(typeof r !== 'object');
      qu.assert(t === r);
      this.rawText = raw;
    }
  }
}
export abstract class LiteralExpr extends PrimaryExpr implements qt.LiteralExpr {
  text!: string;
  isUnterminated?: boolean;
  hasExtendedEscape?: boolean;
  _literalExpressionBrand: any;
}
export abstract class DocTobj extends Tobj implements qt.DocTobj {
  _docTypeBrand: any;
}
export abstract class DocTag extends Nobj implements qt.DocTag {
  parent?: qt.Doc | qt.DocTypingLiteral;
  tagName: qt.Identifier;
  comment?: string;
  constructor(k: Syntax, n: string, c?: string) {
    super(true, k);
    this.tagName = new qc.Identifier(n);
    this.comment = c;
  }
}
export abstract class DocContainer implements qt.DocContainer {
  doc?: qt.Doc[];
  cache?: readonly DocTag[];
  append(d: qt.Doc) {
    this.doc = qu.append(this.doc, d);
    return this;
  }
}
export function idText(n: qt.Identifier | qt.PrivateIdentifier): string {
  return qy.get.unescUnderscores(n.escapedText);
}
export function getExcludedSymbolFlags(f: SymbolFlags): SymbolFlags {
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
export function cloneMap(m: SymbolTable): SymbolTable;
export function cloneMap<T>(m: qu.QReadonlyMap<T>): qu.QMap<T>;
export function cloneMap<T>(m: qu.ReadonlyEscapedMap<T>): qu.EscapedMap<T>;
export function cloneMap<T>(m: qu.QReadonlyMap<T> | qu.ReadonlyEscapedMap<T> | SymbolTable): qu.QMap<T> | qu.EscapedMap<T> | SymbolTable {
  const c = new qu.QMap<T>();
  qu.copyEntries(m as qu.QMap<T>, c);
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
  getConstraintOfTypeParam: (typeParam: TypeParam) => Type | undefined,
  getFirstIdentifier: (node: EntityNameOrEntityNameExpression) => Identifier,
  getTypeArgs: (t: TypeReference) => readonly Type[]
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
      if (t.flags & TypeFlags.TypeParam) visitTypeParam(t as TypeParam);
      if (t.flags & TypeFlags.UnionOrIntersection) visitUnionOrIntersectionType(t as UnionOrIntersectionType);
      if (t.flags & TypeFlags.Index) visitIndexType(t as IndexType);
      if (t.flags & TypeFlags.IndexedAccess) visitIndexedAccessType(t as IndexedAccessType);
    }
    function visitTypeReference(t: TypeReference) {
      visitType(t.target);
      qu.each(getTypeArgs(t), visitType);
    }
    function visitTypeParam(t: TypeParam) {
      visitType(qf.get.constraintOfTypeParam(t));
    }
    function visitUnionOrIntersectionType(t: UnionOrIntersectionType) {
      qu.each(t.types, visitType);
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
      visitType(t.typeParam);
      visitType(t.constraintType);
      visitType(t.templateType);
      visitType(t.modifiersType);
    }
    function visitSignature(signature: Signature) {
      const typePredicate = getTypePredicateOfSignature(signature);
      if (typePredicate) visitType(typePredicate.type);
      qu.each(signature.typeParams, visitType);
      for (const param of signature.params) {
        visitSymbol(param);
      }
      visitType(getRestTypeOfSignature(signature));
      visitType(qf.get.returnTypeOfSignature(signature));
    }
    function visitInterfaceType(interfaceT: InterfaceType) {
      visitObjectType(interfaceT);
      qu.each(interfaceT.typeParams, visitType);
      qu.each(getBaseTypes(interfaceT), visitType);
      visitType(interfaceT.thisType);
    }
    function visitObjectType(t: ObjectType) {
      const stringIndexType = qf.get.indexTypeOfStructuredType(t, qt.IndexKind.String);
      visitType(stringIndexType);
      const numberIndexType = qf.get.indexTypeOfStructuredType(t, qt.IndexKind.Number);
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
      const t = qf.get.typeOfSymbol(s);
      visitType(t);
      if (s.exports) s.exports.forEach(visitSymbol);
      qu.each(s.declarations, (d) => {
        if ((d as any).type && (d as any).type.kind === Syntax.TypingQuery) {
          const query = (d as any).type as TypingQuery;
          const entity = getResolvedSymbol(qf.get.firstIdentifier(query.exprName));
          visitSymbol(entity);
        }
      });
      return false;
    }
  }
}
function getDocComment(ds?: readonly qt.Declaration[], c?: qt.TypeChecker): qt.SymbolDisplayPart[] {
  if (!ds) return qu.empty;
  const findInherited = (d: qt.Declaration, pName: string): readonly qt.SymbolDisplayPart[] | undefined => {
    return qu.firstDefined(d.parent ? qf.get.allSuperTypeNodes(d.parent) : qu.empty, (n) => {
      const superType = c?.get.typeAtLocation(n);
      const baseProperty = superType && c?.get.propertyOfType(superType, pName);
      const inheritedDocs = baseProperty && baseProperty.getDocComment(c);
      return inheritedDocs && inheritedDocs.length ? inheritedDocs : undefined;
    });
  };
  let cs = Doc.getDocCommentsFromDeclarations(ds);
  if (cs.length === 0 || ds.some(qf.has.docInheritDocTag)) {
    forEachUnique(ds, (d) => {
      const inheritedDocs = findInherited(d, d.symbol.name);
      if (inheritedDocs) cs = cs.length === 0 ? inheritedDocs.slice() : inheritedDocs.concat(lineBreakPart(), cs);
    });
  }
  return cs;
}
export function getLineOfLocalPositionFromLineMap(lineMap: readonly number[], pos: number) {
  return Scanner.lineOf(lineMap, pos);
}
qu.addMixins(ClassLikeDecl, [DocContainer]);
qu.addMixins(FunctionOrConstructorTobj, [Tobj]);
qu.addMixins(ObjectLiteralExpr, [Decl]);
qu.addMixins(LiteralExpr, [LiteralLikeNode]);
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
export function tryGetClassImplementingOrExtendingExpressionWithTypings(n: Node): qt.ClassImplementingOrExtendingExpressionWithTypings | undefined {
  return n.kind === Syntax.ExpressionWithTypings && n.parent?.kind === Syntax.HeritageClause && qf.is.classLike(n.parent.parent)
    ? { class: n.parent.parent, isImplements: n.parent.token === Syntax.ImplementsKeyword }
    : undefined;
}
function walkUp(n: Node | undefined, k: Syntax) {
  while (n?.kind === k) {
    n = n.parent;
  }
  return n;
}
export function walkUpParenthesizedTypes(n?: Node) {
  return walkUp(n, Syntax.ParenthesizedTyping);
}
export function walkUpParenthesizedExpressions(n?: Node) {
  return walkUp(n, Syntax.ParenthesizedExpression);
}
export function walkUpBindingElemsAndPatterns(e: qt.BindingElem) {
  let n = e.parent as Node | undefined;
  while (n?.parent?.kind === Syntax.BindingElem) {
    n = n?.parent?.parent;
  }
  return n?.parent as qt.ParamDeclaration | qt.VariableDeclaration | undefined;
}
