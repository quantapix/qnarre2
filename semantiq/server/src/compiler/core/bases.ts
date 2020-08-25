import { ModifierFlags, NodeFlags, ObjectFlags, SignatureFlags, SymbolFlags, TrafoFlags, TypeFlags, TypeFormatFlags } from '../types';
import { Node } from '../types';
import { qf } from './frame';
import { SourceFileLike, Syntax } from '../syntax';
import * as qc from './classes';
import * as qd from '../diags';
import * as qt from '../types';
import * as qu from '../utils';
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
    return qf.each.entry(this.map, cb) || false;
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
export class Nodes<T extends qt.Nobj = Nobj> extends Array<T> implements qt.Nodes<T> {
  pos = -1;
  end = -1;
  trailingComma?: boolean;
  trafoFlags = TrafoFlags.None;
  static is<T extends qt.Nobj>(ns: readonly T[]): ns is qt.Nodes<T> {
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
  setRange(r?: qu.Range): this {
    if (r) {
      this.pos = r.pos;
      this.end = r.end;
    }
    return this;
  }
  visit<T>(cb?: (n?: Node) => T | undefined, cbs?: (ns?: qt.Nodes) => T | undefined): T | undefined {
    if (cbs) return cbs(this);
    for (const n of this) {
      const r = cb?.(n as Node);
      if (r) return r;
    }
    return;
  }
}
export type MutableNodes<T extends qt.Nobj> = Nodes<T> & T[];
export abstract class Nobj extends qu.TextRange implements qt.Nobj {
  children?: Nobj[];
  contextualType?: qt.Type;
  decorators?: qt.Nodes<qt.Decorator>;
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
  modifiers?: qt.Nodes<qt.Modifier>;
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
  visit<T>(cb?: (n?: Node) => T | undefined): T | undefined {
    return cb?.(this as Node);
  }
  posToString(): string {
    const s = this.sourceFile as SourceFile;
    const r = qy.get.lineAndCharOf(s.lineStarts(), this.pos);
    return `${s.fileName}(${r.line + 1},${r.char + 1})`;
  }
  tokenPos(s?: SourceFileLike, doc?: boolean): number {
    const n = this as Node;
    if (qf.is.missing(n)) return this.pos;
    if (qf.is.doc.node(n)) return qy.skipTrivia((s || this.sourceFile)!.text, this.pos, false, true);
    if (doc && qf.is.withDocNodes(n)) return (this.doc![0] as Nobj).tokenPos(s);
    if (n.kind === Syntax.SyntaxList && this.children?.length) return this.children![0].tokenPos(s, doc);
    return qy.skipTrivia((s || this.sourceFile).text, this.pos);
  }
  start(s?: SourceFileLike, doc?: boolean) {
    return this.tokenPos(s, doc);
  }
  fullStart() {
    return this.pos;
  }
  width(s?: SourceFileLike) {
    qf.assert.true(!qf.is.synthesized(this.pos) && !qf.is.synthesized(this.end));
    return this.end - this.start(s);
  }
  fullWidth() {
    qf.assert.true(!qf.is.synthesized(this.pos) && !qf.is.synthesized(this.end));
    return this.end - this.pos;
  }
  leadingTriviaWidth(s?: SourceFileLike) {
    qf.assert.true(!qf.is.synthesized(this.pos) && !qf.is.synthesized(this.end));
    return this.start(s) - this.pos;
  }
  fullText(s?: SourceFileLike) {
    qf.assert.true(!qf.is.synthesized(this.pos) && !qf.is.synthesized(this.end));
    return (s || this.sourceFile).text.substring(this.pos, this.end);
  }
  getText(s?: SourceFileLike) {
    qf.assert.true(!qf.is.synthesized(this.pos) && !qf.is.synthesized(this.end));
    return (s || this.sourceFile).text.substring(this.start(s), this.end);
  }
  childCount(s?: SourceFileLike) {
    return this.getChildren(s).length;
  }
  childAt(i: number, s?: SourceFileLike) {
    return this.getChildren(s)[i];
  }
  getChildren(s?: SourceFileLike) {
    qf.assert.true(!qf.is.synthesized(this.pos) && !qf.is.synthesized(this.end));
    const scanner = qs_getRaw();
    const addSynthetics = (ns: qu.Push<Nobj>, pos: number, end: number) => {
      scanner.setTextPos(pos);
      while (pos < end) {
        const t = scanner.scan();
        const e = scanner.getTextPos();
        if (e <= end) {
          qf.assert.true(t !== Syntax.Identifier);
          ns.push(qf.make.node(t, pos, e, this as Node));
        }
        pos = e;
        if (t === Syntax.EndOfFileToken) break;
      }
    };
    const createList = (ns: qt.Nodes) => {
      const r = qf.make.node(Syntax.SyntaxList, ns.pos, ns.end, this as Node);
      r.children = [];
      let p = ns.pos;
      for (const n of ns) {
        addSynthetics(r.children, p, n.pos);
        r.children.push(n as Nobj);
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
        qf.each.up(this.doc as Node[], one);
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
    qf.assert.true(!qf.is.synthesized(this.pos) && !qf.is.synthesized(this.end));
    const cs = this.getChildren(s);
    if (!cs.length) return;
    const c = qf.find.up(cs, (c) => c.kind < Syntax.FirstDocNode || c.kind > Syntax.LastDocNode)!;
    return c.kind < Syntax.FirstNode ? c : c.firstToken(s);
  }
  lastToken(s?: SourceFileLike): Nobj | undefined {
    qf.assert.true(!qf.is.synthesized(this.pos) && !qf.is.synthesized(this.end));
    const cs = this.getChildren(s);
    const c = qu.lastOrUndefined(cs);
    if (!c) return;
    return c.kind < Syntax.FirstNode ? c : c.lastToken(s);
  }
  indexIn(ns: readonly Node[]) {
    return qu.binarySearch(ns, this as Node, (n) => n.pos, qu.compareNumbers);
  }
  updateFrom(n: Node): this {
    if (this === n) return this;
    const r = this.setOriginal(n).setRange(n);
    qf.calc.aggregate(r as Node);
    return r;
  }
  setOriginal(n?: Node): this {
    this.original = n;
    if (n) {
      const e = n.emitNode;
      if (e) this.emitNode = qf.emit.merge(e, this.emitNode);
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
  kind!: Syntax.SyntaxList;
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
  update<T extends qt.SignatureDeclaration>(n: T, ts: Nodes<qt.TypeParamDeclaration> | undefined, ps: Nodes<qt.ParamDeclaration>, t?: qc.Typing): T {
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
  _typingBrand: any;
  constructor(s: boolean, k: Syntax.FunctionTyping | Syntax.ConstructorTyping, ts: readonly qt.TypeParamDeclaration[] | undefined, ps: readonly qt.ParamDeclaration[], t?: qt.Typing) {
    super(s, k, ts, ps, t);
  }
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
  properties!: qt.Nodes<T>;
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
      qf.assert.true(typeof r !== 'object');
      qf.assert.true(t === r);
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
  cache?: readonly qt.DocTag[];
  append(d: qt.Doc) {
    this.doc = qu.append(this.doc, d);
    return this;
  }
}
export abstract class Symbol implements qt.Symbol {
  assigned?: boolean;
  assignmentDeclarations?: qu.QMap<qt.Declaration>;
  constEnumOnlyModule?: boolean;
  declarations?: qt.Declaration[];
  docComment?: qt.SymbolDisplayPart[];
  exports?: qt.SymbolTable;
  exportSymbol?: qt.Symbol;
  getComment?: qt.SymbolDisplayPart[];
  globalExports?: qt.SymbolTable;
  members?: qt.SymbolTable;
  mergeId?: number;
  parent?: qt.Symbol;
  referenced?: SymbolFlags;
  replaceable?: boolean;
  setComment?: qt.SymbolDisplayPart[];
  tags?: qt.DocTagInfo[];
  valueDeclaration?: qt.Declaration;
  constructor(public flags: SymbolFlags, public escName: qu.__String) {}
  get name() {
    const n = this.valueDeclaration;
    if (qf.is.privateIdentifierPropertyDeclaration(n)) return idText(n.name);
    return qy.get.unescUnderscores(this.escName);
  }
  abstract get id(): number;
  abstract get links(): qt.SymbolLinks;
  skipAlias(c: qt.TypeChecker) {
    return this.flags & SymbolFlags.Alias ? c.get.aliasedSymbol(this) : this;
  }
  setValueDeclaration(d: qt.Declaration) {
    const v = this.valueDeclaration;
    if (
      !v ||
      (!(d.flags & NodeFlags.Ambient && !(v.flags & NodeFlags.Ambient)) && qf.decl.is.assignmentDeclaration(v) && !qf.decl.is.assignmentDeclaration(d)) ||
      (v.kind !== d.kind && qf.is.effectiveModuleDeclaration(v))
    ) {
      this.valueDeclaration = d;
    }
  }
  comment(c?: qt.TypeChecker): qt.SymbolDisplayPart[] {
    if (!this.docComment) {
      this.docComment = qu.empty;
      if (!this.declarations && this.isTransient()) {
        const t = this.target as Symbol | undefined;
        if (t?.isTransient() && t.tupleLabelDeclaration) return (this.docComment = getDocComment([t.tupleLabelDeclaration], c));
      }
      this.docComment = getDocComment(this.declarations, c);
    }
    return this.docComment;
  }
  commentFor(n?: Node, c?: qt.TypeChecker): qt.SymbolDisplayPart[] {
    switch (n?.kind) {
      case Syntax.GetAccessor:
        if (!this.getComment) {
          this.getComment = qu.empty;
          this.getComment = getDocComment(qu.filter(this.declarations, qf.is.getAccessor), c);
        }
        return this.getComment!;
      case Syntax.SetAccessor:
        if (!this.setComment) {
          this.setComment = qu.empty;
          this.setComment = getDocComment(qu.filter(this.declarations, qf.is.setAccessor), c);
        }
        return this.setComment!;
    }
    return this.comment(c);
  }
  docTags(): qt.DocTagInfo[] {
    if (!this.tags) this.tags = qt.Doc.getDocTagsFromDeclarations(this.declarations);
    return this.tags!;
  }
  abstract merge(t: Symbol, unidir?: boolean): this;
  copy(to: SymbolTable, f: SymbolFlags) {
    if (this.combinedLocalAndExportSymbolFlags() & f) {
      const n = this.escName;
      if (!to.has(n)) to.set(n, this);
    }
  }
}
export class SymbolTable<S extends Symbol = Symbol> extends Map<qu.__String, S> implements qu.EscapedMap<S>, qt.SymbolTable<S> {
  constructor(ss?: readonly S[]) {
    super();
    if (ss) {
      for (const s of ss) {
        this.set(s.escName, s);
      }
    }
  }
  add(ss: SymbolTable<S>, m: qd.Message) {
    const addDiagnostic = (n: string, m: qd.Message) => {
      return (d: qt.Declaration) => diagnostics.add(qf.make.diagForNode(d, m, n));
    };
    ss.forEach((s, n) => {
      const t = this.get(n);
      if (t) qf.each.up(t.declarations, addDiagnostic(qy.get.unescUnderscores(n), m));
      else this.set(n, s);
    });
  }
  merge(ss: SymbolTable<S>, unidir = false) {
    ss.forEach((s, n) => {
      const t = this.get(n);
      this.set(n, t ? s.merge(t, unidir) : s);
    });
  }
  combine(ss?: SymbolTable<S>): SymbolTable<S> | undefined {
    if (!qu.hasEntries(this)) return ss;
    if (!qu.hasEntries(ss)) return this;
    const r = new SymbolTable<S>();
    r.merge(this);
    r.merge(ss!);
    return r;
  }
  copy(to: SymbolTable<S>, f: SymbolFlags) {
    if (f) this.forEach((s) => s.copy(to, f));
  }
}
export class Type implements qt.Type {
  _objectFlags!: ObjectFlags;
  aliasSymbol?: Symbol;
  aliasTypeArgs?: readonly Type[];
  aliasTypeArgsContainsMarker?: boolean;
  id!: number;
  immediateBaseConstraint?: Type;
  pattern?: qt.DestructuringPattern;
  permissive?: Type;
  restrictive?: Type;
  symbol?: Symbol;
  widened?: Type;
  constructor(public checker: qt.TypeChecker, public flags: TypeFlags) {}
  get typeArgs(): readonly Type[] | undefined {
    if (qf.type.is.reference(this)) return this.checker.get.typeArgs((this as qt.Type) as qt.TypeReference);
    return;
  }
  get objectFlags(): ObjectFlags {
    return this.isa(TypeFlags.ObjectFlagsType) ? this._objectFlags : 0;
  }
  isa(f: TypeFlags) {
    return !!(this.flags & f);
  }
  isobj(k: ObjectFlags) {
    return !!(this.objectFlags & k);
  }
}
export class Ftype {
  includeMixinType(t: qt.Type, ts: readonly Type[], flags: readonly boolean[], index: number): qt.Type {
    const r: qt.Type[] = [];
    for (let i = 0; i < ts.length; i++) {
      if (i === index) r.push(t);
      else if (flags[i]) {
        r.push(qf.get.returnTypeOfSignature(getSignaturesOfType(ts[i], qt.SignatureKind.Construct)[0]));
      }
    }
    return qf.get.intersectionType(r);
  }
  prependTypeMapping(t: qt.Type, to: qt.Type, m?: qt.TypeMapper) {
    return !m ? makeUnaryTypeMapper(t, to) : makeCompositeTypeMapper(qt.TypeMapKind.Merged, makeUnaryTypeMapper(t, to), m);
  }
  typeCouldHaveTopLevelSingletonTypes(t: qt.Type): boolean {
    if (t.isa(qt.TypeFlags.UnionOrIntersection)) return !!forEach((t as qt.IntersectionType).types, this.typeCouldHaveTopLevelSingletonTypes);
    if (t.isa(qt.TypeFlags.Instantiable)) {
      const c = qf.type.get.constraint(t);
      if (c) return typeCouldHaveTopLevelSingletonTypes(c);
    }
    return t.isa(TypeFlags.Unit);
  }
  findMatchingDiscriminantType(t: qt.Type, from: qt.Type, cb: (t: qt.Type, to: qt.Type) => qt.Ternary, skipPartial?: boolean) {
    if (from.isa(qt.TypeFlags.Union) && t.flags & (TypeFlags.Intersection | qt.TypeFlags.Object)) {
      const ps = qf.type.get.properties(t);
      if (ps) {
        const ps2 = findDiscriminantProperties(ps, from);
        if (ps2) {
          return discriminateTypeByDiscriminableItems(
            <qt.UnionType>from,
            qu.map(ps2, (p) => [() => p.typeOfSymbol(), p.escName] as [() => Type, qu.__String]),
            cb,
            undefined,
            skipPartial
          );
        }
      }
    }
    return;
  }
  findMatchingTypeReferenceOrTypeAliasReference(t: qt.Type, from: qt.UnionOrIntersectionType) {
    const f = t.objectFlags;
    if (f & (ObjectFlags.Reference | ObjectFlags.Anonymous) && from.isa(qt.TypeFlags.Union)) {
      return qf.find.up(from.types, (x) => {
        if (x.isa(qt.TypeFlags.Object)) {
          const overlapObjFlags = f & x.objectFlags;
          if (overlapObjFlags & ObjectFlags.Reference) return (t as qt.TypeReference).target === (x as qt.TypeReference).target;
          if (overlapObjFlags & ObjectFlags.Anonymous) return !!(t as qt.AnonymousType).aliasSymbol && (t as qt.AnonymousType).aliasSymbol === (x as qt.AnonymousType).aliasSymbol;
        }
        return false;
      });
    }
    return;
  }
  findBestTypeForObjectLiteral(t: qt.Type, from: qt.UnionOrIntersectionType) {
    if (t.isobj(ObjectFlags.ObjectLiteral) && forEachType(from, qf.type.is.arrayLike)) return qf.find.up(from.types, (t) => !qf.type.is.arrayLike(t));
    return;
  }
  findBestTypeForInvokable(t: qt.Type, from: qt.UnionOrIntersectionType) {
    let k = qt.SignatureKind.Call;
    const has = getSignaturesOfType(t, k).length > 0 || ((k = qt.SignatureKind.Construct), getSignaturesOfType(t, k).length > 0);
    if (has) return qf.find.up(from.types, (t) => getSignaturesOfType(t, k).length > 0);
    return;
  }
  findMostOverlappyType(t: qt.Type, from: qt.UnionOrIntersectionType) {
    let r: qt.Type | undefined;
    let c = 0;
    for (const x of from.types) {
      const overlap = qf.get.intersectionType([qf.get.indexType(t), qf.get.indexType(x)]);
      if (overlap.isa(qt.TypeFlags.Index)) {
        r = x;
        c = Infinity;
      } else if (overlap.isa(qt.TypeFlags.Union)) {
        const l = length(filter((overlap as qt.UnionType).types, isUnitType));
        if (l >= c) {
          r = x;
          c = l;
        }
      } else if (overlap.isa(TypeFlags.Unit) && 1 >= c) {
        r = x;
        c = 1;
      }
    }
    return r;
  }
  setCachedIterationTypes(t: qt.Type, k: qt.MatchingKeys<qt.IterableOrIteratorType, qt.IterationTypes | undefined>, v: qt.IterationTypes) {
    return ((t as qt.IterableOrIteratorType)[k] = v);
  }
  convertAutoToAny(t: qt.Type) {
    return t === autoType ? anyType : t === autoArrayType ? anyArrayType : t;
  }
  maybeTypeOfKind(t: qt.Type, k: qt.TypeFlags): boolean {
    if (t.flags & k) return true;
    if (t.isa(qt.TypeFlags.UnionOrIntersection)) {
      const ts = (<qt.UnionOrIntersectionType>t).types;
      for (const x of ts) {
        if (this.maybeTypeOfKind(x, k)) return true;
      }
    }
    return false;
  }
  allTypesAssignableToKind(t: qt.Type, k: qt.TypeFlags, strict?: boolean): boolean {
    return t.isa(qt.TypeFlags.Union) ? every((t as qt.UnionType).types, (x) => allTypesAssignableToKind(x, k, strict)) : qf.type.is.assignableToKind(t, k, strict);
  }
  typeMaybeAssignableTo(t: qt.Type, to: qt.Type) {
    if (!t.isa(qt.TypeFlags.Union)) return qf.type.is.assignableTo(t, to);
    for (const x of (<qt.UnionType>t).types) {
      if (qf.type.is.assignableTo(x, to)) return true;
    }
    return false;
  }
  eachTypeContainedIn(t: qt.Type, ts: qt.Type[]) {
    return t.isa(qt.TypeFlags.Union) ? !forEach((<qt.UnionType>t).types, (x) => !contains(ts, x)) : contains(ts, t);
  }
  forEachType<T>(t: qt.Type, f: (t: qt.Type) => T | undefined): T | undefined {
    return t.isa(qt.TypeFlags.Union) ? forEach((<qt.UnionType>t).types, f) : f(t);
  }
  everyType(t: qt.Type, f: (t: qt.Type) => boolean): boolean {
    return t.isa(qt.TypeFlags.Union) ? every((<qt.UnionType>t).types, f) : f(t);
  }
  filterType(t: qt.Type, f: (t: qt.Type) => boolean): qt.Type {
    if (t.isa(qt.TypeFlags.Union)) {
      const ts = (<qt.UnionType>t).types;
      const r = filter(ts, f);
      return r === ts ? t : qf.get.unionTypeFromSortedList(r, (<qt.UnionType>t).objectFlags);
    }
    return t.isa(qt.TypeFlags.Never) || f(t) ? t : neverType;
  }
  countTypes(t: qt.Type) {
    return t.isa(qt.TypeFlags.Union) ? (t as qt.UnionType).types.length : 1;
  }
  mapType(t: qt.Type, cb: (t: qt.Type) => Type, noReductions?: boolean): qt.Type;
  mapType(t: qt.Type, cb: (t: qt.Type) => Type | undefined, noReductions?: boolean): qt.Type | undefined;
  mapType(t: qt.Type, cb: (t: qt.Type) => Type | undefined, noReductions?: boolean): qt.Type | undefined {
    if (t.isa(qt.TypeFlags.Never)) return t;
    if (!t.isa(qt.TypeFlags.Union)) return cb(t);
    let ts: qt.Type[] | undefined;
    for (const x of (<qt.UnionType>t).types) {
      const y = cb(x);
      if (y) {
        if (!ts) ts = [y];
        else ts.push(y);
      }
    }
    return ts && qf.get.unionType(ts, noReductions ? qt.UnionReduction.None : qt.UnionReduction.Literal);
  }
  acceptsVoid(t: qt.Type) {
    return !!t.isa(qt.TypeFlags.Void);
  }
  typeHasNullableConstraint(t: qt.Type) {
    return t.isa(qt.TypeFlags.InstantiableNonPrimitive) && maybeTypeOfKind(qf.get.qf.type.get.baseConstraint(t) || unknownType, qt.TypeFlags.Nullable);
  }
  extractTypesOfKind(t: qt.Type, k: qt.TypeFlags) {
    return this.filterType(t, (x) => (x.flags & k) !== 0);
  }
  replacePrimitivesWithLiterals(p: qt.Type, l: qt.Type) {
    if (
      (qf.type.is.subsetOf(stringType, p) && maybeTypeOfKind(l, qt.TypeFlags.StringLiteral)) ||
      (qf.type.is.subsetOf(numberType, p) && maybeTypeOfKind(l, qt.TypeFlags.NumberLiteral)) ||
      (qf.type.is.subsetOf(bigintType, p) && maybeTypeOfKind(l, qt.TypeFlags.BigIntLiteral))
    ) {
      return mapType(p, (t) =>
        t.isa(qt.TypeFlags.String)
          ? extractTypesOfKind(l, qt.TypeFlags.String | qt.TypeFlags.StringLiteral)
          : t.isa(qt.TypeFlags.Number)
          ? extractTypesOfKind(l, qt.TypeFlags.Number | qt.TypeFlags.NumberLiteral)
          : t.isa(qt.TypeFlags.BigInt)
          ? extractTypesOfKind(l, qt.TypeFlags.BigInt | qt.TypeFlags.BigIntLiteral)
          : t
      );
    }
    return p;
  }
  typesDefinitelyUnrelated(t: qt.Type, from: qt.Type) {
    return (qf.type.is.tuple(t) && qf.type.is.tuple(from) && tupleTypesDefinitelyUnrelated(t, from)) || (!!getUnmatchedProperty(t, from, true) && !!getUnmatchedProperty(from, t, true));
  }
  couldContainTypeVariables(t: qt.Type): boolean {
    const f = t.objectFlags;
    if (f & ObjectFlags.CouldContainTypeVariablesComputed) return !!(f & ObjectFlags.CouldContainTypeVariables);
    const r = !!(
      t.isa(qt.TypeFlags.Instantiable) ||
      (t.isa(qt.TypeFlags.Object) &&
        !qf.type.is.nonGenericTopLevel(t) &&
        ((f & ObjectFlags.Reference && ((<qt.TypeReference>t).node || forEach(getTypeArgs(<qt.TypeReference>t), couldContainTypeVariables))) ||
          (f & ObjectFlags.Anonymous &&
            t.symbol &&
            t.symbol.flags & (SymbolFlags.Function | qt.SymbolFlags.Method | qt.SymbolFlags.Class | qt.SymbolFlags.TypeLiteral | qt.SymbolFlags.ObjectLiteral) &&
            t.symbol.declarations) ||
          f & (ObjectFlags.Mapped | ObjectFlags.ObjectRestType))) ||
      (t.isa(qt.TypeFlags.UnionOrIntersection) && !t.isa(qt.TypeFlags.EnumLiteral) && !qf.type.is.nonGenericTopLevel(t) && some((<qt.UnionOrIntersectionType>t).types, couldContainTypeVariables))
    );
    if (t.isa(qt.TypeFlags.ObjectFlagsType)) (<qt.ObjectFlagsType>t).objectFlags |= ObjectFlags.CouldContainTypeVariablesComputed | (r ? ObjectFlags.CouldContainTypeVariables : 0);
    return r;
  }
  inferTypeForHomomorphicMappedType(t: qt.Type, m: qt.MappedType, constraint: qt.IndexType): qt.Type | undefined {
    if (inInferTypeForHomomorphicMappedType) return;
    const k = t.id + ',' + m.id + ',' + constraint.id;
    if (reverseMappedCache.has(k)) return reverseMappedCache.get(k);
    inInferTypeForHomomorphicMappedType = true;
    const r = createReverseMappedType(t, m, constraint);
    inInferTypeForHomomorphicMappedType = false;
    reverseMappedCache.set(k, r);
    return r;
  }
  inferReverseMappedType(t: qt.Type, m: qt.MappedType, constraint: qt.IndexType): qt.Type {
    const p = <qt.TypeParam>qf.get.indexedAccessType(constraint.type, getTypeParamFromMappedType(m));
    const templ = getTemplateTypeFromMappedType(m);
    const i = createInferenceInfo(p);
    inferTypes([i], t, templ);
    return getTypeFromInference(i) || unknownType;
  }
  removeDefinitelyFalsyTypes(t: qt.Type): qt.Type {
    return getFalsyFlags(t) & qt.TypeFlags.DefinitelyFalsy ? filterType(t, (x) => !(getFalsyFlags(x) & qt.TypeFlags.DefinitelyFalsy)) : t;
  }
  extractDefinitelyFalsyTypes(t: qt.Type): qt.Type {
    return mapType(t, getDefinitelyFalsyPartOfType);
  }
  addOptionalTypeMarker(t: qt.Type) {
    return strictNullChecks ? qf.get.unionType([t, optionalType]) : t;
  }
  propagateOptionalTypeMarker(t: qt.Type, c: qt.OptionalChain, optional: boolean) {
    return optional ? (qf.is.outermostOptionalChain(c) ? qf.get.optionalType(t) : addOptionalTypeMarker(t)) : t;
  }
  transformTypeOfMembers(t: qt.Type, f: (t: qt.Type) => Type) {
    const ss = new SymbolTable();
    for (const p of qf.type.get.propertiesOfObject(t)) {
      const o = p.typeOfSymbol();
      const r = f(o);
      ss.set(p.escName, r === o ? p : createSymbolWithType(p, r));
    }
    return ss;
  }
  reportWideningErrorsInType(t: qt.Type): boolean {
    let e = false;
    if (t.isobj(ObjectFlags.ContainsWideningType)) {
      if (t.isa(qt.TypeFlags.Union)) {
        if (some((<qt.UnionType>t).types, qf.type.is.emptyObject)) e = true;
        else {
          for (const x of (<qt.UnionType>t).types) {
            if (reportWideningErrorsInType(x)) e = true;
          }
        }
      }
      if (qf.type.is.array(t) || qf.type.is.tuple(t)) {
        for (const x of getTypeArgs(<qt.TypeReference>t)) {
          if (reportWideningErrorsInType(x)) e = true;
        }
      }
      if (t.isobj(ObjectFlags.ObjectLiteral)) {
        for (const p of qf.type.get.propertiesOfObject(t)) {
          const x = p.typeOfSymbol();
          if (x.isobj(ObjectFlags.ContainsWideningType)) {
            if (!reportWideningErrorsInType(x)) error(p.valueDeclaration, qd.msgs.Object_literal_s_property_0_implicitly_has_an_1_type, p.symbolToString(), typeToString(qf.get.widenedType(x)));
            e = true;
          }
        }
      }
    }
    return e;
  }
  compareTypesIdentical(trce: qt.Type, to: qt.Type): qt.Ternary {
    return qf.type.is.relatedTo(trce, to, identityRelation) ? qt.Ternary.True : qt.Ternary.False;
  }
  compareTypesAssignable(t: qt.Type, to: qt.Type): qt.Ternary {
    return qf.type.is.relatedTo(t, to, assignableRelation) ? qt.Ternary.True : qt.Ternary.False;
  }
  compareTypesSubtypeOf(t: qt.Type, to: qt.Type): qt.Ternary {
    return qf.type.is.relatedTo(t, to, subtypeRelation) ? qt.Ternary.True : qt.Ternary.False;
  }
  areTypesComparable(t: qt.Type, to: qt.Type): boolean {
    return qf.type.is.comparableTo(t, to) || qf.type.is.comparableTo(to, t);
  }

  distributeIndexOverObjectType(t: qt.Type, i: qt.Type, writing: boolean) {
    if (t.isa(qt.TypeFlags.UnionOrIntersection)) {
      const ts = qu.map((t as qt.UnionOrIntersectionType).types, (x) => getSimplifiedType(qf.get.indexedAccessType(x, i), writing));
      return t.isa(qt.TypeFlags.Intersection) || writing ? qf.get.intersectionType(ts) : qf.get.unionType(ts);
    }
    return;
  }
  distributeObjectOverIndexType(t: qt.Type, i: qt.Type, writing: boolean) {
    if (i.isa(qt.TypeFlags.Union)) {
      const ts = qu.map((i as qt.UnionType).types, (x) => getSimplifiedType(qf.get.indexedAccessType(t, x), writing));
      return writing ? qf.get.intersectionType(ts) : qf.get.unionType(ts);
    }
    return;
  }
  unwrapSubstitution(t: qt.Type): qt.Type {
    if (t.isa(qt.TypeFlags.Substitution)) return (t as qt.SubstitutionType).substitute;
    return t;
  }
  eachUnionContains(ts: qt.UnionType[], t: qt.Type) {
    for (const x of ts) {
      if (!containsType(x.types, t)) {
        const r = t.isa(qt.TypeFlags.StringLiteral)
          ? stringType
          : t.isa(qt.TypeFlags.NumberLiteral)
          ? numberType
          : t.isa(qt.TypeFlags.BigIntLiteral)
          ? bigintType
          : t.isa(qt.TypeFlags.UniqueESSymbol)
          ? esSymbolType
          : undefined;
        if (!r || !containsType(x.types, r)) return false;
      }
    }
    return true;
  }
  insertType(ts: qt.Type[], t: qt.Type): boolean {
    const i = binarySearch(ts, t, getTypeId, compareNumbers);
    if (i < 0) {
      ts.splice(~i, 0, t);
      return true;
    }
    return false;
  }
  addTypeToUnion(ts: qt.Type[], includes: qt.TypeFlags, t: qt.Type) {
    const f = t.flags;
    if (f & qt.TypeFlags.Union) return addTypesToUnion(ts, includes, (<qt.UnionType>t).types);
    if (!(f & qt.TypeFlags.Never)) {
      includes |= f & qt.TypeFlags.IncludesMask;
      if (f & qt.TypeFlags.StructuredOrInstantiable) includes |= qt.TypeFlags.IncludesStructuredOrInstantiable;
      if (t === wildcardType) includes |= qt.TypeFlags.IncludesWildcard;
      if (!strictNullChecks && f & qt.TypeFlags.Nullable)
        if (!t.isobj(ObjectFlags.ContainsWideningType)) includes |= qt.TypeFlags.IncludesNonWideningType;
        else {
          const l = ts.length;
          const i = l && t.id > ts[l - 1].id ? ~l : binarySearch(ts, t, getTypeId, compareNumbers);
          if (i < 0) ts.splice(~i, 0, t);
        }
    }
    return includes;
  }
  intersectTypes(t: qt.Type, to: qt.Type): qt.Type;
  intersectTypes(t: qt.Type | undefined, to: qt.Type | undefined): qt.Type | undefined;
  intersectTypes(t: qt.Type | undefined, to: qt.Type | undefined): qt.Type | undefined {
    return !t ? to : !to ? t : qf.get.intersectionType([t, to]);
  }
  addOptionality(t: qt.Type, optional = true): qt.Type {
    return strictNullChecks && optional ? qf.get.optionalType(t) : t;
  }
  areAllOuterTypeParamsApplied(t: qt.Type): boolean {
    const ps = (<qt.InterfaceType>t).outerTypeParams;
    if (ps) {
      const last = ps.length - 1;
      const args = getTypeArgs(<qt.TypeReference>t);
      return ps[last].symbol !== args[last].symbol;
    }
    return true;
  }
  widenTypeForVariableLikeDeclaration(t: qt.Type | undefined, d: any, err?: boolean) {
    if (t) {
      if (err) reportErrorsFromWidening(d, t);
      if (t.isa(qt.TypeFlags.UniqueESSymbol) && (d.kind === Syntax.BindingElem || !d.type) && t.symbol !== qf.get.symbolOfNode(d)) t = esSymbolType;
      return qf.get.widenedType(t);
    }
    t = d.kind === Syntax.Param && d.dot3Token ? anyArrayType : anyType;
    if (err) {
      if (!declarationBelongsToPrivateAmbientMember(d)) reportImplicitAny(d, t);
    }
    return t;
  }
  typeToString(
    t: qt.Type,
    d?: Node,
    f: TypeFormatFlags = TypeFormatFlags.AllowUniqueESSymbolType | TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
    writer: qt.EmitTextWriter = createTextWriter('')
  ): string {
    const noTruncation = compilerOpts.noErrorTruncation || f & TypeFormatFlags.NoTruncation;
    const n = nodeBuilder.typeToTypeNode(t, d, toNodeBuilderFlags(f) | qt.NodeBuilderFlags.IgnoreErrors | (noTruncation ? NodeBuilderFlags.NoTruncation : 0), writer);
    if (n === undefined) return qu.fail('should always get typenode');
    const opts = { removeComments: true };
    const printer = createPrinter(opts);
    const s = d && d.sourceFile;
    printer.writeNode(qt.EmitHint.Unspecified, n, s, writer);
    const r = writer.getText();
    const l = noTruncation ? qt.noTruncationMaximumTruncationLength * 2 : qt.defaultMaximumTruncationLength * 2;
    if (l && r && r.length >= l) return r.substr(0, l - '...'.length) + '...';
    return r;
  }
}
export class Signature implements qt.Signature {
  canonicalCache?: Signature;
  declaration?: qt.SignatureDeclaration | qt.DocSignature;
  docComment?: qt.SymbolDisplayPart[];
  docTags?: qt.DocTagInfo[];
  erasedCache?: Signature;
  instantiations?: qu.QMap<Signature>;
  isolatedSignatureType?: qt.ObjectType;
  mapper?: qt.TypeMapper;
  minArgCount!: number;
  minTypeArgCount!: number;
  optionalCallCache?: { inner?: Signature; outer?: Signature };
  params!: readonly Symbol[];
  resolvedPredicate?: qt.TypePredicate;
  resolvedReturn?: Type;
  target?: Signature;
  thisParam?: Symbol;
  typeParams?: readonly qt.TypeParam[];
  unions?: Signature[];
  constructor(public checker: qt.TypeChecker, public flags: SignatureFlags) {}
  getReturnType(): qt.Type {
    return this.checker.get.returnTypeOfSignature(this);
  }
  getDocComment(): qt.SymbolDisplayPart[] {
    return this.docComment || (this.docComment = getDocComment(qu.singleElemArray(this.declaration), this.checker));
  }
  getDocTags(): qt.DocTagInfo[] | undefined {
    if (this.docTags === undefined) {
      this.docTags = this.declaration ? qt.Doc.getDocTagsFromDeclarations([this.declaration]) : [];
    }
    return this.docTags;
  }
  erased(): this {
    return this.typeParams ? this.erasedCache || (this.erasedCache = qf.make.erasedSignature(this)) : this;
  }
  canonicalSignature(): this {
    return this.typeParams ? this.canonicalCache || (this.canonicalCache = qf.make.canonicalSignature(this)) : this;
  }
  baseSignature(): this {
    const ps = this.typeParams;
    if (ps) {
      const typeEraser = qf.make.typeEraser(ps);
      const baseConstraints = qu.map(ps, (p) => instantiateType(this.qf.type.get.baseConstraint(p), typeEraser) || unknownType);
      return instantiateSignature(this, qf.make.typeMapper(ps, baseConstraints), true);
    }
    return this;
  }
  numNonRestParams() {
    const l = this.params.length;
    return this.hasRestParam() ? l - 1 : l;
  }
  thisTypeOfSignature(): qt.Type | undefined {
    if (this.thisParam) return this.thisParam.typeOfSymbol();
    return;
  }
  typePredicateOfSignature(): qt.TypePredicate | undefined {
    if (!this.resolvedPredicate) {
      if (this.target) {
        const targetTypePredicate = this.typePredicateOfSignature(this.target);
        this.resolvedPredicate = targetTypePredicate ? instantiateTypePredicate(targetTypePredicate, this.mapper!) : noTypePredicate;
      } else if (this.unions) {
        this.resolvedPredicate = qf.get.unionTypePredicate(this.unions) || noTypePredicate;
      } else {
        const type = this.declaration && this.effectiveReturnTypeNode(this.declaration);
        let jsdocPredicate: qt.TypePredicate | undefined;
        if (!type && qf.is.inJSFile(this.declaration)) {
          const jsdocSignature = this.thisOfTypeTag(this.declaration!);
          if (jsdocSignature && this !== jsdocSignature) jsdocPredicate = this.typePredicateOfSignature(jsdocSignature);
        }
        this.resolvedPredicate = type && t.kind === Syntax.TypingPredicate ? qf.make.typePredicateFromTypingPredicate(t, this) : jsdocPredicate || noTypePredicate;
      }
      qf.assert.true(!!this.resolvedPredicate);
    }
    return this.resolvedPredicate === noTypePredicate ? undefined : this.resolvedPredicate;
  }
  returnTypeOfSignature(): qt.Type {
    if (!this.resolvedReturn) {
      if (!pushTypeResolution(this, TypeSystemPropertyName.ResolvedReturnType)) return errorType;
      let type = this.target
        ? instantiateType(this.returnTypeOfSignature(this.target), this.mapper)
        : this.unions
        ? this.unionType(map(this.unions, this.returnTypeOfSignature), qt.UnionReduction.Subtype)
        : this.returnTypeFromAnnotation(this.declaration!) ||
          (qf.is.missing((<qt.FunctionLikeDeclaration>this.declaration).body) ? anyType : this.returnTypeFromBody(<qt.FunctionLikeDeclaration>this.declaration));
      if (this.flags & qt.SignatureFlags.IsInnerCallChain) type = addOptionalTypeMarker(t);
      else if (this.flags & qt.SignatureFlags.IsOuterCallChain) {
        type = this.optionalType(t);
      }
      if (!popTypeResolution()) {
        if (this.declaration) {
          const typeNode = this.effectiveReturnTypeNode(this.declaration);
          if (typeNode) error(typeNode, qd.msgs.Return_type_annotation_circularly_references_itself);
          else if (noImplicitAny) {
            const declaration = <qt.Declaration>this.declaration;
            const name = this.declaration.nameOf(declaration);
            if (name) {
              error(
                name,
                qd.msgs._0_implicitly_has_return_type_any_because_it_does_not_have_a_return_type_annotation_and_is_referenced_directly_or_indirectly_in_one_of_its_return_expressions,
                declarationNameToString(name)
              );
            } else {
              error(
                declaration,
                qd.msgs.Function_implicitly_has_return_type_any_because_it_does_not_have_a_return_type_annotation_and_is_referenced_directly_or_indirectly_in_one_of_its_return_expressions
              );
            }
          }
        }
        type = anyType;
      }
      this.resolvedReturn = type;
    }
    return this.resolvedReturn;
  }
  optionalCallSignature(f: qt.SignatureFlags): qt.Signature {
    if ((this.flags & qt.SignatureFlags.CallChainFlags) === f) return this;
    if (!this.optionalCallCache) this.optionalCallCache = {};
    const key = f === qt.SignatureFlags.IsInnerCallChain ? 'inner' : 'outer';
    return this.optionalCallCache[key] || (this.optionalCallCache[key] = qf.make.optionalCallSignature(this, f));
  }
  expandedParams(skipUnionExpanding?: boolean): readonly (readonly Symbol[])[] {
    if (this.hasRestParam()) {
      const restIndex = this.params.length - 1;
      const restType = this.typeOfSymbol(this.params[restIndex]);
      const expandSignatureParamsWithTupleMembers = (restType: qt.TupleTypeReference, restIndex: number) => {
        const elemTypes = this.typeArgs(restType);
        const minLength = restType.target.minLength;
        const tupleRestIndex = restType.target.hasRestElem ? elemTypes.length - 1 : -1;
        const associatedNames = restType.target.labeledElemDeclarations;
        const restParams = qu.map(elemTypes, (t, i) => {
          const tupleLabelName = !!associatedNames && this.tupleElemLabel(associatedNames[i]);
          const name = tupleLabelName || this.paramNameAtPosition(sig, restIndex + i);
          const f = i === tupleRestIndex ? qt.CheckFlags.RestParam : i >= minLength ? qt.CheckFlags.OptionalParam : 0;
          const symbol = new Symbol(SymbolFlags.FunctionScopedVariable, name, f);
          symbol.type = i === tupleRestIndex ? qf.make.arrayType(t) : t;
          return symbol;
        });
        return concatenate(this.params.slice(0, restIndex), restParams);
      };
      if (qf.type.is.tuple(restType)) return [expandSignatureParamsWithTupleMembers(restType, restIndex)];
      else if (!skipUnionExpanding && restType.isa(qt.TypeFlags.Union) && qu.every((restType as qt.UnionType).types, qf.is.tupleType))
        return qu.map((restType as qt.UnionType).types, (t) => expandSignatureParamsWithTupleMembers(t as qt.TupleTypeReference, restIndex));
    }
    return [this.params];
  }
  paramNameAtPosition(pos: number) {
    const l = s.params.length - (this.hasRestParam() ? 1 : 0);
    if (pos < l) return this.params[pos].escName;
    const rest = this.params[l] || unknownSymbol;
    const t = rest.typeOfSymbol();
    if (qf.type.is.tuple(t)) {
      const ds = (<qt.TupleType>(<qt.TypeReference>t).target).labeledElemDeclarations;
      const i = pos - l;
      return (ds && this.tupleElemLabel(ds[i])) || ((rest.escName + '_' + i) as qu.__String);
    }
    return rest.escName;
  }
  nameableDeclarationAtPosition(pos: number) {
    const l = this.params.length - (this.hasRestParam() ? 1 : 0);
    if (pos < l) {
      const d = this.params[pos].valueDeclaration;
      return d && qf.is.validDeclarationForTupleLabel(d) ? d : undefined;
    }
    const rest = this.params[l] || unknownSymbol;
    const t = this.typeOfSymbol(restParam);
    if (qf.type.is.tuple(t)) {
      const ds = (<qt.TupleType>(<qt.TypeReference>t).target).labeledElemDeclarations;
      const i = pos - l;
      return ds && ds[index];
    }
    return rest.valueDeclaration && qf.is.validDeclarationForTupleLabel(rest.valueDeclaration) ? rest.valueDeclaration : undefined;
  }
  typeAtPosition(pos: number): qt.Type {
    return this.tryGetTypeAtPosition(pos) || anyType;
  }
  restTypeAtPosition(source: qt.Signature, pos: number): qt.Type {
    const paramCount = this.paramCount(source);
    const restType = this.effectiveRestType(source);
    const nonRestCount = paramCount - (restType ? 1 : 0);
    if (restType && pos === nonRestCount) return restType;
    const types = [];
    let names: (NamedTupleMember | qt.ParamDeclaration)[] | undefined = [];
    for (let i = pos; i < nonRestCount; i++) {
      types.push(this.typeAtPosition(source, i));
      const name = this.nameableDeclarationAtPosition(source, i);
      if (name && names) names.push(name);
      else names = undefined;
    }
    if (restType) {
      types.push(this.indexedAccessType(restType, numberType));
      const name = this.nameableDeclarationAtPosition(source, nonRestCount);
      if (name && names) names.push(name);
      else names = undefined;
    }
    const minArgCount = this.minArgCount(source);
    const minLength = minArgCount < pos ? 0 : minArgCount - pos;
    return qf.make.tupleType(types, minLength, !!restType, false, names);
  }
  paramCount() {
    const length = s.params.length;
    if (this.hasRestParam()) {
      const t = this.typeOfSymbol(s.params[length - 1]);
      if (qf.type.is.tuple(t)) return length + this.typeArgs(t).length - 1;
    }
    return length;
  }
  minArgCount(strongArityForUntypedJS?: boolean) {
    if (this.hasRestParam()) {
      const t = this.typeOfSymbol(s.params[s.params.length - 1]);
      if (qf.type.is.tuple(t)) {
        const l = t.target.minLength;
        if (l > 0) return s.params.length - 1 + l;
      }
    }
    if (!strongArityForUntypedJS && s.flags & qt.SignatureFlags.IsUntypedSignatureInJSFile) return 0;
    return s.minArgCount;
  }
  effectiveRestType() {
    if (this.hasRestParam()) {
      const t = this.typeOfSymbol(this.params[this.params.length - 1]);
      return qf.type.is.tuple(t) ? this.restArrayTypeOfTupleType(t) : t;
    }
    return;
  }
  nonArrayRestType() {
    const t = this.effectiveRestType(this);
    return t && !qf.type.is.array(t) && !qf.type.is.any(t) && !qf.get.reducedType(t).isa(qt.TypeFlags.Never) ? t : undefined;
  }
  typeOfFirstParamOfSignature() {
    return this.typeOfFirstParamOfSignatureWithFallback(neverType);
  }
  typeOfFirstParamOfSignatureWithFallback(fallback: qt.Type) {
    return this.params.length > 0 ? qf.get.typeAtPosition(this, 0) : fallback;
  }
}
export interface SourceFile extends qy.SourceFile {}
export class SourceFile extends Decl implements qt.SourceFile {
  static readonly kind = Syntax.SourceFile;
  _declarationBrand: any;
  additionalSyntacticDiagnostics?: readonly qd.DiagnosticWithLocation[];
  ambientModuleNames!: string[];
  amdDependencies!: { name: string; path: string }[];
  bindDiagnostics!: qd.DiagnosticWithLocation[];
  bindSuggestionDiagnostics?: qd.DiagnosticWithLocation[];
  checkJsDirective?: qt.CheckJsDirective;
  classifiableNames?: qu.ReadonlyEscapedMap<true>;
  commentDirectives?: qt.CommentDirective[];
  commonJsModuleIndicator?: Node;
  docDiagnostics?: qd.DiagnosticWithLocation[];
  endOfFileToken!: qt.Token<Syntax.EndOfFileToken>;
  errorExpectations?: qu.TextRange[];
  exportedModulesFromDeclarationEmit?: qt.ExportedModulesFromDeclarationEmit;
  externalModuleIndicator?: Node;
  fileName!: string;
  hasNoDefaultLib!: boolean;
  identifierCount!: number;
  identifiers!: qu.QMap<string>;
  imports!: readonly qt.StringLiteralLike[];
  isDeclarationFile!: boolean;
  isDefaultLib!: boolean;
  jsGlobalAugmentations?: SymbolTable;
  kind!: Syntax.SourceFile;
  languageVariant!: qy.LanguageVariant;
  languageVersion!: qt.ScriptTarget;
  libReferenceDirectives!: qt.FileReference[];
  lineMap?: number[];
  localJsxFactory?: qt.EntityName;
  localJsxNamespace?: qu.__String;
  moduleAugmentations!: qt.StringLiteral[];
  moduleName?: string;
  nameTable?: qu.EscapedMap<number>;
  nodeCount!: number;
  originalFileName!: string;
  parseDiagnostics!: qd.DiagnosticWithLocation[];
  path!: qt.Path;
  patternAmbientModules?: qt.PatternAmbientModule[];
  possiblyContainDynamicImport?: boolean;
  pragmas!: qt.ReadonlyPragmaMap;
  private namedDeclarations?: qu.QMap<qt.Declaration[]>;
  redirectInfo?: qt.RedirectInfo;
  referencedFiles!: qt.FileReference[];
  renamedDependencies?: qu.QReadonlyMap<string>;
  resolvedModules?: qu.QMap<qt.ResolvedModuleFull | undefined>;
  resolvedPath!: qt.Path;
  resolvedTypeReferenceDirectiveNames!: qu.QMap<qt.ResolvedTypeReferenceDirective>;
  scriptKind!: qt.ScriptKind;
  //scriptSnapshot!: IScriptSnapshot;
  statements!: qt.Nodes<qt.Statement>;
  symbolCount!: number;
  syntacticDiagnostics!: qd.DiagnosticWithLocation[];
  text!: string;
  typeReferenceDirectives!: qt.FileReference[];
  version!: string;
  constructor(k: Syntax, pos: number, end: number) {
    super(false, k, pos, end);
  }
  getLeadingCommentRangesOfNode(n: Node) {
    return n.kind !== Syntax.JsxText ? qy.get.leadingCommentRanges(this.text, n.pos) : undefined;
  }
  isStringDoubleQuoted(s: qt.StringLiteralLike) {
    return this.qf.get.sourceTextOfNodeFromSourceFile(s).charCodeAt(0) === qy.Codes.doubleQuote;
  }
  getResolvedExternalModuleName(host: qt.ResolveModuleNameResolutionHost, file: SourceFile, referenceFile?: SourceFile): string {
    return file.moduleName || qf.get.externalModuleNameFromPath(host, file.fileName, referenceFile && referenceFile.fileName);
  }
  getSourceFilesToEmit(host: qt.EmitHost, targetSourceFile?: SourceFile, forceDtsEmit?: boolean): readonly SourceFile[] {
    const opts = host.getCompilerOpts();
    if (opts.outFile || opts.out) {
      const moduleKind = getEmitModuleKind(opts);
      const moduleEmitEnabled = opts.emitDeclarationOnly || moduleKind === qt.ModuleKind.AMD || moduleKind === qt.ModuleKind.System;
      return qu.filter(host.getSourceFiles(), (sourceFile) => (moduleEmitEnabled || !qf.is.externalModule(sourceFile)) && sourceFileMayBeEmitted(sourceFile, host, forceDtsEmit));
    } else {
      const sourceFiles = targetSourceFile === undefined ? host.getSourceFiles() : [targetSourceFile];
      return qu.filter(sourceFiles, (sourceFile) => sourceFileMayBeEmitted(sourceFile, host, forceDtsEmit));
    }
  }
  sourceFileMayBeEmitted(sourceFile: SourceFile, host: qt.SourceFileMayBeEmittedHost, forceDtsEmit?: boolean) {
    const opts = host.getCompilerOpts();
    return (
      !(opts.noEmitForJsFiles && sourceFile.isJS()) &&
      !sourceFile.isDeclarationFile &&
      !host.isSourceFileFromExternalLibrary(sourceFile) &&
      !(qf.is.jsonSourceFile(sourceFile) && host.getResolvedProjectReferenceToRedirect(sourceFile.fileName)) &&
      (forceDtsEmit || !host.isSourceOfProjectReferenceRedirect(sourceFile.fileName))
    );
  }
  lineOfLocalPos(pos: number) {
    const s = qy.get.lineStarts(this);
    return Scanner.lineOf(s, pos);
  }
  update(t: string, c: qu.TextChange): SourceFile {
    return qp_updateSource(this, t, c);
  }
  lineEndOfPos(pos: number) {
    const { line } = this.lineAndCharOf(pos);
    const ss = this.lineStarts();
    let i: number | undefined;
    if (line + 1 >= ss.length) i = this.end;
    if (!i) i = ss[line + 1] - 1;
    const t = this.fullText();
    return t[i] === '\n' && t[i - 1] === '\r' ? i - 1 : i;
  }
  namedDecls(): qu.QMap<qt.Declaration[]> {
    const worker = (): qu.QMap<qt.Declaration[]> => {
      const r = new qu.MultiMap<qt.Declaration>();
      const addDeclaration = (d: qt.Declaration) => {
        const n = qf.decl.name(d);
        if (n) r.add(n, d);
      };
      const getDeclarations = (name: string) => {
        let ds = r.get(name);
        if (!ds) r.set(name, (ds = []));
        return ds;
      };
      const getName = (d: qt.Declaration) => {
        const n = qf.get.nonAssignedNameOfDeclaration(d);
        return n && (isComputedPropertyName(n) && n.expression.kind === Syntax.PropertyAccessExpression ? n.expression.name.text : qf.is.propertyName(n) ? getNameFromPropertyName(n) : undefined);
      };
      const visit = (n?: Node) => {
        switch (n?.kind) {
          case Syntax.FunctionDeclaration:
          case Syntax.FunctionExpression:
          case Syntax.MethodDeclaration:
          case Syntax.MethodSignature:
            const d = qf.decl.name(n);
            if (d) {
              const ds = getDeclarations(d);
              const last = qu.lastOrUndefined(ds);
              if (last && n.parent === last.parent && n.symbol === last.symbol) {
                if (n.body && !last.body) ds[ds.length - 1] = n;
              } else ds.push(n);
            }
            qf.each.child(n, visit);
            break;
          case Syntax.ClassDeclaration:
          case Syntax.ClassExpression:
          case Syntax.EnumDeclaration:
          case Syntax.ExportSpecifier:
          case Syntax.GetAccessor:
          case Syntax.ImportClause:
          case Syntax.ImportEqualsDeclaration:
          case Syntax.ImportSpecifier:
          case Syntax.InterfaceDeclaration:
          case Syntax.ModuleDeclaration:
          case Syntax.NamespaceImport:
          case Syntax.SetAccessor:
          case Syntax.TypeAliasDeclaration:
          case Syntax.TypingLiteral:
            addDeclaration(n);
            qf.each.child(n, visit);
            break;
          case Syntax.Param:
            if (!qf.has.syntacticModifier(n, ModifierFlags.ParamPropertyModifier)) break;
          case Syntax.VariableDeclaration:
          case Syntax.BindingElem: {
            if (n.name.kind === Syntax.BindingPattern) {
              qf.each.child(n.name, visit);
              break;
            }
            if (n.initer) visit(n.initer);
          }
          case Syntax.EnumMember:
          case Syntax.PropertyDeclaration:
          case Syntax.PropertySignature:
            addDeclaration(n);
            break;
          case Syntax.ExportDeclaration:
            if (n.exportClause) {
              if (n.exportClause.kind === Syntax.NamedExports) qf.each.up(n.exportClause.elems, visit);
              else visit(n.exportClause.name);
            }
            break;
          case Syntax.ImportDeclaration:
            const i = n.importClause;
            if (i) {
              if (i.name) addDeclaration(i.name);
              if (i.namedBindings) {
                if (i.namedBindings.kind === Syntax.NamespaceImport) addDeclaration(i.namedBindings);
                else qf.each.up(i.namedBindings.elems, visit);
              }
            }
            break;
          case Syntax.BinaryExpression:
            if (qf.get.assignmentDeclarationKind(n) !== qt.AssignmentDeclarationKind.None) addDeclaration(n);
          default:
            if (n) qf.each.child(n, visit);
        }
      };
      qf.each.child(this, visit);
      return r;
    };
    if (!this.namedDeclarations) this.namedDeclarations = worker();
    return this.namedDeclarations;
  }
  resolvedModule(n: string): qt.ResolvedModuleFull | undefined {
    return this.resolvedModules?.get(n);
  }
  setResolvedModule(n: string, m: qt.ResolvedModuleFull) {
    if (!this.resolvedModules) this.resolvedModules = new qu.QMap<qt.ResolvedModuleFull>();
    this.resolvedModules.set(n, m);
  }
  setResolvedTypeReferenceDirective(n: string, d: qt.ResolvedTypeReferenceDirective) {
    if (!this.resolvedTypeReferenceDirectiveNames) this.resolvedTypeReferenceDirectiveNames = new qu.QMap<qt.ResolvedTypeReferenceDirective>();
    this.resolvedTypeReferenceDirectiveNames.set(n, d);
  }
  isFileLevelUniqueName(n: string, hasGlobal?: qt.PrintHandlers['hasGlobalName']) {
    return !(hasGlobal && hasGlobal(n)) && !this.identifiers.has(n);
  }
  isEffectiveExternalModule(o: qt.CompilerOpts) {
    return qf.is.externalModule(this) || o.isolatedModules || (getEmitModuleKind(o) === qt.ModuleKind.CommonJS && !!this.commonJsModuleIndicator);
  }
  isEffectiveStrictMode(o: qt.CompilerOpts) {
    switch (this.scriptKind) {
      case qt.ScriptKind.JS:
      case qt.ScriptKind.TS:
      case qt.ScriptKind.JSX:
      case qt.ScriptKind.TSX:
        break;
      default:
        return false;
    }
    if (this.isDeclarationFile) return false;
    if (getStrictOptionValue(o, 'alwaysStrict')) return true;
    if (startsWithUseStrict(this.statements)) return true;
    if (qf.is.externalModule(this) || o.isolatedModules) {
      if (getEmitModuleKind(o) >= qt.ModuleKind.ES2015) return true;
      return !o.noImplicitUseStrict;
    }
    return false;
  }
  spanOfTokenAtPos(pos: number) {
    const scanner = qs_create(true, this.languageVariant);
    scanner.setText(this.text, pos);
    scanner.scan();
    const s = scanner.getTokenPos();
    return qu.TextSpan.from(s, scanner.getTextPos());
  }
  isJS() {
    return qf.is.inJSFile(this as Node);
  }
  isNotJS() {
    return !qf.is.inJSFile(this as Node);
  }
  isNotJson() {
    return !qf.is.jsonSourceFile(this);
  }
  originalSource() {
    return qf.get.parseTreeOf(this as Node, isSourceFile) || this;
  }
  isCheckJsEnabled(o: qt.CompilerOpts) {
    return this.checkJsDirective ? this.checkJsDirective.enabled : o.checkJs;
  }
  skipTypeChecking(o: qt.CompilerOpts, host: HostWithIsSourceOfProjectReferenceRedirect) {
    return (o.skipLibCheck && this.isDeclarationFile) || (o.skipDefaultLibCheck && this.hasNoDefaultLib) || host.isSourceOfProjectReferenceRedirect(this.fileName);
  }
  qp_updateSourceNode(
    n: SourceFile,
    statements: readonly qt.Statement[],
    isDeclarationFile?: boolean,
    referencedFiles?: SourceFile['referencedFiles'],
    typeReferences?: SourceFile['typeReferenceDirectives'],
    hasNoDefaultLib?: boolean,
    libReferences?: SourceFile['libReferenceDirectives']
  ) {
    if (
      n.statements !== statements ||
      (isDeclarationFile !== undefined && n.isDeclarationFile !== isDeclarationFile) ||
      (referencedFiles !== undefined && n.referencedFiles !== referencedFiles) ||
      (typeReferences !== undefined && n.typeReferenceDirectives !== typeReferences) ||
      (libReferences !== undefined && n.libReferenceDirectives !== libReferences) ||
      (hasNoDefaultLib !== undefined && n.hasNoDefaultLib !== hasNoDefaultLib)
    ) {
      const updated = qf.make.synthesized(Syntax.SourceFile);
      updated.flags |= n.flags;
      updated.statements = new Nodes(statements);
      updated.endOfFileToken = n.endOfFileToken;
      updated.fileName = n.fileName;
      updated.path = n.path;
      updated.text = n.text;
      updated.isDeclarationFile = isDeclarationFile === undefined ? n.isDeclarationFile : isDeclarationFile;
      updated.referencedFiles = referencedFiles === undefined ? n.referencedFiles : referencedFiles;
      updated.typeReferenceDirectives = typeReferences === undefined ? n.typeReferenceDirectives : typeReferences;
      updated.hasNoDefaultLib = hasNoDefaultLib === undefined ? n.hasNoDefaultLib : hasNoDefaultLib;
      updated.libReferenceDirectives = libReferences === undefined ? n.libReferenceDirectives : libReferences;
      if (n.amdDependencies !== undefined) updated.amdDependencies = n.amdDependencies;
      if (n.moduleName !== undefined) updated.moduleName = n.moduleName;
      if (n.languageVariant !== undefined) updated.languageVariant = n.languageVariant;
      if (n.renamedDependencies !== undefined) updated.renamedDependencies = n.renamedDependencies;
      if (n.languageVersion !== undefined) updated.languageVersion = n.languageVersion;
      if (n.scriptKind !== undefined) updated.scriptKind = n.scriptKind;
      if (n.externalModuleIndicator !== undefined) updated.externalModuleIndicator = n.externalModuleIndicator;
      if (n.commonJsModuleIndicator !== undefined) updated.commonJsModuleIndicator = n.commonJsModuleIndicator;
      if (n.identifiers !== undefined) updated.identifiers = n.identifiers;
      if (n.nodeCount !== undefined) updated.nodeCount = n.nodeCount;
      if (n.identifierCount !== undefined) updated.identifierCount = n.identifierCount;
      if (n.symbolCount !== undefined) updated.symbolCount = n.symbolCount;
      if (n.parseDiagnostics !== undefined) updated.parseDiagnostics = n.parseDiagnostics;
      if (n.bindDiagnostics !== undefined) updated.bindDiagnostics = n.bindDiagnostics;
      if (n.bindSuggestionDiagnostics !== undefined) updated.bindSuggestionDiagnostics = n.bindSuggestionDiagnostics;
      if (n.lineMap !== undefined) updated.lineMap = n.lineMap;
      if (n.classifiableNames !== undefined) updated.classifiableNames = n.classifiableNames;
      if (n.resolvedModules !== undefined) updated.resolvedModules = n.resolvedModules;
      if (n.resolvedTypeReferenceDirectiveNames !== undefined) updated.resolvedTypeReferenceDirectiveNames = n.resolvedTypeReferenceDirectiveNames;
      if (n.imports !== undefined) updated.imports = n.imports;
      if (n.moduleAugmentations !== undefined) updated.moduleAugmentations = n.moduleAugmentations;
      if (n.pragmas !== undefined) updated.pragmas = n.pragmas;
      if (n.localJsxFactory !== undefined) updated.localJsxFactory = n.localJsxFactory;
      if (n.localJsxNamespace !== undefined) updated.localJsxNamespace = n.localJsxNamespace;
      return updated.updateFrom(n);
    }
    return n;
  }
}
export class SourceMapSource implements qt.SourceMapSource {
  lineMap!: number[];
  constructor(public fileName: string, public text: string, public skipTrivia = (pos: number) => pos) {}
  lineAndCharOf(pos: number): qy.LineAndChar {
    return lineAndCharOf(this, pos);
  }
}
let allUnscopedEmitHelpers: qu.QReadonlyMap<qt.UnscopedEmitHelper> | undefined;
export class UnparsedSource extends Nobj implements qt.UnparsedSource {
  static readonly kind = Syntax.UnparsedSource;
  fileName: string;
  text: string;
  prologues: readonly qt.UnparsedPrologue[];
  helpers: readonly qt.UnscopedEmitHelper[] | undefined;
  referencedFiles: readonly qt.FileReference[];
  typeReferenceDirectives: readonly string[] | undefined;
  libReferenceDirectives: readonly qt.FileReference[];
  hasNoDefaultLib?: boolean;
  sourceMapPath?: string;
  sourceMapText?: string;
  syntheticReferences?: readonly qt.UnparsedSyntheticReference[];
  texts: readonly qt.UnparsedSourceText[];
  oldFileOfCurrentEmit?: boolean;
  parsedSourceMap?: qt.RawSourceMap | false | undefined;
  lineAndCharOf(pos: number): LineAndChar;
  createUnparsedSource() {
    super();
    this.prologues = qu.empty;
    this.referencedFiles = qu.empty;
    this.libReferenceDirectives = qu.empty;
    this.lineAndCharOf = (pos) => qy.get.lineAndCharOf(this, pos);
  }
  createUnparsedSourceFile(text: string): UnparsedSource;
  createUnparsedSourceFile(inputFile: qt.InputFiles, type: 'js' | 'dts', stripInternal?: boolean): UnparsedSource;
  createUnparsedSourceFile(text: string, mapPath: string | undefined, map: string | undefined): UnparsedSource;
  createUnparsedSourceFile(textOrInputFiles: string | qt.InputFiles, mapPathOrType?: string, mapTextOrStripInternal?: string | boolean): UnparsedSource {
    const r = createUnparsedSource();
    let stripInternal: boolean | undefined;
    let bundleFileInfo: qt.BundleFileInfo | undefined;
    if (!qf.is.string(textOrInputFiles)) {
      qf.assert.true(mapPathOrType === 'js' || mapPathOrType === 'dts');
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
        qf.assert.true(mapTextOrStripInternal === undefined || typeof mapTextOrStripInternal === 'boolean');
        stripInternal = mapTextOrStripInternal;
        bundleFileInfo = mapPathOrType === 'js' ? textOrInputFiles.buildInfo.bundle.js : textOrInputFiles.buildInfo.bundle.dts;
        if (r.oldFileOfCurrentEmit) {
          parseOldFileOfCurrentEmit(r, qf.check.defined(bundleFileInfo));
          return r;
        }
      }
    } else {
      r.fileName = '';
      r.text = textOrInputFiles;
      r.sourceMapPath = mapPathOrType;
      r.sourceMapText = mapTextOrStripInternal as string;
    }
    qf.assert.true(!r.oldFileOfCurrentEmit);
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
  parseUnparsedSourceFile(this: UnparsedSource, bundleFileInfo: qt.BundleFileInfo | undefined, stripInternal: boolean | undefined) {
    let prologues: qt.UnparsedPrologue[] | undefined;
    let helpers: qt.UnscopedEmitHelper[] | undefined;
    let referencedFiles: qt.FileReference[] | undefined;
    let typeReferenceDirectives: string[] | undefined;
    let libReferenceDirectives: qt.FileReference[] | undefined;
    let texts: qt.UnparsedSourceText[] | undefined;
    for (const section of bundleFileInfo ? bundleFileInfo.sections : qu.empty) {
      switch (section.kind) {
        case qt.BundleFileSectionKind.Prologue:
          (prologues || (prologues = [])).push(qf.make.unparsedNode(section, this) as qt.UnparsedPrologue);
          break;
        case qt.BundleFileSectionKind.EmitHelpers:
          (helpers || (helpers = [])).push(getAllUnscopedEmitHelpers().get(section.data)!);
          break;
        case qt.BundleFileSectionKind.NoDefaultLib:
          this.hasNoDefaultLib = true;
          break;
        case qt.BundleFileSectionKind.Reference:
          (referencedFiles || (referencedFiles = [])).push({ pos: -1, end: -1, fileName: section.data });
          break;
        case qt.BundleFileSectionKind.Type:
          (typeReferenceDirectives || (typeReferenceDirectives = [])).push(section.data);
          break;
        case qt.BundleFileSectionKind.Lib:
          (libReferenceDirectives || (libReferenceDirectives = [])).push({ pos: -1, end: -1, fileName: section.data });
          break;
        case qt.BundleFileSectionKind.Prepend:
          const prependNode = qf.make.unparsedNode(section, this) as qt.UnparsedPrepend;
          let prependTexts: qt.UnparsedTextLike[] | undefined;
          for (const text of section.texts) {
            if (!stripInternal || text.kind !== qt.BundleFileSectionKind.Internal) {
              (prependTexts || (prependTexts = [])).push(qf.make.unparsedNode(text, this) as qt.UnparsedTextLike);
            }
          }
          prependNode.texts = prependTexts || qu.empty;
          (texts || (texts = [])).push(prependNode);
          break;
        case qt.BundleFileSectionKind.Internal:
          if (stripInternal) {
            if (!texts) texts = [];
            break;
          }
        case qt.BundleFileSectionKind.Text:
          (texts || (texts = [])).push(qf.make.unparsedNode(section, this) as qt.UnparsedTextLike);
          break;
        default:
          qc.assert.never(section);
      }
    }
    this.prologues = prologues || qu.empty;
    this.helpers = helpers;
    this.referencedFiles = referencedFiles || qu.empty;
    this.typeReferenceDirectives = typeReferenceDirectives;
    this.libReferenceDirectives = libReferenceDirectives || qu.empty;
    this.texts = texts || [<qt.UnparsedTextLike>qf.make.unparsedNode({ kind: qt.BundleFileSectionKind.Text, pos: 0, end: this.text.length }, this)];
  }
  parseOldFileOfCurrentEmit(this: UnparsedSource, bundleFileInfo: qt.BundleFileInfo) {
    qf.assert.true(!!this.oldFileOfCurrentEmit);
    let texts: qt.UnparsedTextLike[] | undefined;
    let syntheticReferences: qt.UnparsedSyntheticReference[] | undefined;
    for (const section of bundleFileInfo.sections) {
      switch (section.kind) {
        case qt.BundleFileSectionKind.Internal:
        case qt.BundleFileSectionKind.Text:
          (texts || (texts = [])).push(qf.make.unparsedNode(section, this) as qt.UnparsedTextLike);
          break;
        case qt.BundleFileSectionKind.NoDefaultLib:
        case qt.BundleFileSectionKind.Reference:
        case qt.BundleFileSectionKind.Type:
        case qt.BundleFileSectionKind.Lib:
          (syntheticReferences || (syntheticReferences = [])).push(new qc.UnparsedSyntheticReference(section, this));
          break;
        // Ignore
        case qt.BundleFileSectionKind.Prologue:
        case qt.BundleFileSectionKind.EmitHelpers:
        case qt.BundleFileSectionKind.Prepend:
          break;
        default:
          qc.assert.never(section);
      }
    }
    this.texts = texts || qu.empty;
    this.helpers = qu.map(bundleFileInfo.sources && bundleFileInfo.sources.helpers, (name) => getAllUnscopedEmitHelpers().get(name)!);
    this.syntheticReferences = syntheticReferences;
    return this;
  }
}
UnparsedSource.prototype.kind = UnparsedSource.kind;
export function failBadSyntax(n: Node, m?: string, mark?: qu.AnyFunction): never {
  return qu.fail(`${m || 'Unexpected node.'}\r\nNode ${format.syntax(n.kind)} was unexpected.`, mark || failBadSyntaxKind);
}
export function idText(n: qt.Identifier | qt.PrivateIdentifier): string {
  return qy.get.unescUnderscores(n.escapedText);
}
function getDocComment(ds?: readonly qt.Declaration[], c?: qt.TypeChecker): qt.SymbolDisplayPart[] {
  if (!ds) return qu.empty;
  const findInherited = (d: qt.Declaration, pName: string): readonly qt.SymbolDisplayPart[] | undefined => {
    return qf.find.defined(d.parent ? qf.get.allSuperTypeNodes(d.parent) : qu.empty, (n) => {
      const superType = c?.get.typeAtLocation(n);
      const baseProperty = superType && qf.type.get.property(superType, pName);
      const inheritedDocs = baseProperty && baseProperty.getDocComment(c);
      return inheritedDocs && inheritedDocs.length ? inheritedDocs : undefined;
    });
  };
  let cs = qt.Doc.getDocCommentsFromDeclarations(ds);
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
export function cloneMap(m: SymbolTable): SymbolTable;
export function cloneMap<T>(m: qu.QReadonlyMap<T>): qu.QMap<T>;
export function cloneMap<T>(m: qu.ReadonlyEscapedMap<T>): qu.EscapedMap<T>;
export function cloneMap<T>(m: qu.QReadonlyMap<T> | qu.ReadonlyEscapedMap<T> | SymbolTable): qu.QMap<T> | qu.EscapedMap<T> | SymbolTable {
  const c = new qu.QMap<T>();
  qu.copyEntries(m as qu.QMap<T>, c);
  return c;
}
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
function walkUp(k: Syntax, n?: Node) {
  while (n?.kind === k) {
    n = n.parent;
  }
  return n;
}
export function walkUpParenthesizedTypes(n?: Node) {
  return walkUp(Syntax.ParenthesizedTyping, n);
}
export function walkUpParenthesizedExpressions(n?: Node) {
  return walkUp(Syntax.ParenthesizedExpression, n);
}
export function walkUpBindingElemsAndPatterns(e: qt.BindingElem) {
  let n = e.parent as Node | undefined;
  while (n?.parent?.kind === Syntax.BindingElem) {
    n = n?.parent?.parent;
  }
  return n?.parent as qt.ParamDeclaration | qt.VariableDeclaration | undefined;
}
