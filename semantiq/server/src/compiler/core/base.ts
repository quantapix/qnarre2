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
  setRange(r?: qu.Range): this {
    if (r) {
      this.pos = r.pos;
      this.end = r.end;
    }
    return this;
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
type AssertionKeys = qt.MatchingKeys<typeof Debug, qu.AnyFunction>;
export const assert = new (class {
  level = qu.AssertionLevel.None;
  cache: Partial<Record<AssertionKeys, { level: qu.AssertionLevel; assertion: qu.AnyFunction }>> = {};
  setLevel(l: qu.AssertionLevel) {
    const old = this.level;
    this.level = l;
    if (l > old) {
      for (const k of qu.getOwnKeys(this.cache) as AssertionKeys[]) {
        const f = this.cache[k];
        if (f !== undefined && Debug[k] !== f.assertion && l >= f.level) {
          (Debug as any)[k] = f;
          this.cache[k] = undefined;
        }
      }
    }
  }
  shouldAssert(l: qu.AssertionLevel): boolean {
    return this.level >= l;
  }
  shouldAssertFunction<K extends AssertionKeys>(l: qu.AssertionLevel, name: K): boolean {
    if (!this.shouldAssert(l)) {
      this.cache[name] = { level: l, assertion: Debug[name] };
      (Debug as any)[name] = qu.noop;
      return false;
    }
    return true;
  }
  never(x: never, msg = 'Illegal value:', mark?: qu.AnyFunction): never {
    const v = typeof x === 'object' && qu.hasProperty(x, 'kind') && qu.hasProperty(x, 'pos') && format.syntaxKind ? 'SyntaxKind: ' + format.syntax((x as Node).kind) : JSON.stringify(x);
    return qu.fail(`${msg} ${v}`, mark || this.never);
  }
  eachNode<T extends Node, U extends T>(ns: Nodes<T>, test: (n: T) => n is U, msg?: string, mark?: qu.AnyFunction): asserts ns is Nodes<U>;
  eachNode<T extends Node, U extends T>(ns: readonly T[], test: (n: T) => n is U, msg?: string, mark?: qu.AnyFunction): asserts ns is readonly U[];
  eachNode(ns: readonly Node[], test: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction): void;
  eachNode(ns: readonly Node[], test: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction) {
    if (this.shouldAssertFunction(qu.AssertionLevel.Normal, 'assert.eachNode')) {
      qu.assert(test === undefined || qu.every(ns, test), msg || 'Unexpected node.', () => `Node array did not pass test '${qu.getFunctionName(test)}'.`, mark || this.eachNode);
    }
  }
  node<T extends Node, U extends T>(n: T | undefined, test: (n: T) => n is U, msg?: string, mark?: qu.AnyFunction): asserts n is U;
  node(n?: Node, test?: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction): void;
  node(n?: Node, test?: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction) {
    if (this.shouldAssertFunction(qu.AssertionLevel.Normal, 'assert.node')) {
      qu.assert(
        n !== undefined && (test === undefined || test(n)),
        msg || 'Unexpected node.',
        () => `Node ${format.syntax(n!.kind)} did not pass test '${qu.getFunctionName(test!)}'.`,
        mark || this.node
      );
    }
  }
  notNode<T extends Node, U extends T>(n: T | undefined, test: (n: Node) => n is U, msg?: string, mark?: qu.AnyFunction): asserts n is Exclude<T, U>;
  notNode(n?: Node, test?: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction): void;
  notNode(n?: Node, test?: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction) {
    if (this.shouldAssertFunction(qu.AssertionLevel.Normal, 'assert.notNode')) {
      qu.assert(
        n === undefined || test === undefined || !test(n),
        msg || 'Unexpected node.',
        () => `Node ${format.syntax(n!.kind)} should not have passed test '${qu.getFunctionName(test!)}'.`,
        mark || this.notNode
      );
    }
  }
  optionalNode<T extends Node, U extends T>(n: T, test: (n: T) => n is U, msg?: string, mark?: qu.AnyFunction): asserts n is U;
  optionalNode<T extends Node, U extends T>(n: T | undefined, test: (n: T) => n is U, msg?: string, mark?: qu.AnyFunction): asserts n is U | undefined;
  optionalNode(n?: Node, test?: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction): void;
  optionalNode(n?: Node, test?: (n: Node) => boolean, msg?: string, mark?: qu.AnyFunction) {
    if (this.shouldAssertFunction(qu.AssertionLevel.Normal, 'assert.optionalNode')) {
      qu.assert(
        test === undefined || n === undefined || test(n),
        msg || 'Unexpected node.',
        () => `Node ${format.syntax(n!.kind)} did not pass test '${qu.getFunctionName(test!)}'.`,
        mark || this.optionalNode
      );
    }
  }
  optionalToken<T extends Node, K extends Syntax>(n: T, k: K, msg?: string, mark?: qu.AnyFunction): asserts n is Extract<T, { readonly kind: K }>;
  optionalToken<T extends Node, K extends Syntax>(n: T | undefined, k: K, msg?: string, mark?: qu.AnyFunction): asserts n is Extract<T, { readonly kind: K }> | undefined;
  optionalToken(n?: Node, k?: Syntax, msg?: string, mark?: qu.AnyFunction): void;
  optionalToken(n?: Node, k?: Syntax, msg?: string, mark?: qu.AnyFunction) {
    if (this.shouldAssertFunction(qu.AssertionLevel.Normal, 'assert.optionalToken')) {
      qu.assert(
        k === undefined || n === undefined || n.kind === k,
        msg || 'Unexpected node.',
        () => `Node ${format.syntax(n!.kind)} was not a '${format.syntax(k)}' token.`,
        mark || this.optionalToken
      );
    }
  }
  missingNode(n?: Node, msg?: string, mark?: qu.AnyFunction): asserts n is undefined;
  missingNode(n?: Node, msg?: string, mark?: qu.AnyFunction) {
    if (this.shouldAssertFunction(qu.AssertionLevel.Normal, 'assert.missingNode')) {
      qu.assert(n === undefined, msg || 'Unexpected node.', () => `Node ${format.syntax(n!.kind)} was unexpected'.`, mark || this.missingNode);
    }
  }
})();
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
  symbol(s: qt.Symbol): string {
    return `{ name: ${qy.get.unescUnderscores(s.escName)}; flags: ${this.symbolFlags(s.flags)}; declarations: ${qu.map(s.declarations, (n) => this.syntax(n.kind))} }`;
  }
  symbolFlags(f?: SymbolFlags): string {
    return qu.formatEnum(f, (qt as any).SymbolFlags, true);
  }
  syntax(k?: Syntax): string {
    return qu.formatEnum(k, (qt as any).SyntaxKind, false);
  }
  trafoFlags(f?: TrafoFlags): string {
    return qu.formatEnum(f, (qt as any).TrafoFlags, true);
  }
  typeFlags(f?: TypeFlags): string {
    return qu.formatEnum(f, (qt as any).TypeFlags, true);
  }
})();
export const skip = new (class {
  outerExpressions(n: qt.Expression, ks?: qt.OuterExpressionKinds): qt.Expression;
  outerExpressions(n: Node, ks?: qt.OuterExpressionKinds): Node;
  outerExpressions(n: Node | qt.Expression, ks = qt.OuterExpressionKinds.All): Node | qt.Expression {
    while (qf.is.outerExpression(n, ks)) {
      n = n.expression;
    }
    return n;
  }
  assertions(n: qt.Expression): qt.Expression;
  assertions(n: Node): Node;
  assertions(n: Node | qt.Expression) {
    return this.outerExpressions(n, qt.OuterExpressionKinds.Assertions);
  }
  parentheses(n: qt.Expression): qt.Expression;
  parentheses(n: Node): Node;
  parentheses(n: Node | qt.Expression) {
    return this.outerExpressions(n, qt.OuterExpressionKinds.Parentheses);
  }
  partiallyEmittedExpressions(n: qt.Expression): qt.Expression;
  partiallyEmittedExpressions(n: Node): Node;
  partiallyEmittedExpressions(n: Node | qt.Expression) {
    return this.outerExpressions(n, qt.OuterExpressionKinds.PartiallyEmittedExpressions);
  }
})();
export const compute = new (class {
  aggregate(n: Node): Node {
    const aggregate = (n?: Node): TrafoFlags => {
      if (!n) return TrafoFlags.None;
      if (n.trafoFlags & TrafoFlags.HasComputedFlags) return n.trafoFlags & ~qy.get.trafoFlagsSubtreeExclusions(n.kind);
      return this.trafoFlags(n, subtree(n));
    };
    const nodes = (ns?: Nodes<Node>): TrafoFlags => {
      if (!ns) return TrafoFlags.None;
      let sub = TrafoFlags.None;
      let f = TrafoFlags.None;
      for (const n of ns) {
        sub |= aggregate(n);
        f |= n.trafoFlags & ~TrafoFlags.HasComputedFlags;
      }
      ns.trafoFlags = f | TrafoFlags.HasComputedFlags;
      return sub;
    };
    const subtree = (n: Node): TrafoFlags => {
      if (qf.has.syntacticModifier(n, ModifierFlags.Ambient) || (qf.is.typeNode(n) && n.kind !== Syntax.ExpressionWithTypings)) return TrafoFlags.None;
      return reduceEachChild(n, TrafoFlags.None, child, children);
    };
    const child = (f: TrafoFlags, n: Node): TrafoFlags => f | aggregate(n);
    const children = (f: TrafoFlags, ns: Nodes<Node>): TrafoFlags => f | nodes(ns);
    aggregate(n);
    return n;
  }
  trafoFlags(n: Node, f: TrafoFlags): TrafoFlags {
    switch (n.kind) {
      case Syntax.CallExpression:
        return this.callExpression(n, f);
      case Syntax.NewExpression:
        return this.newExpression(n, f);
      case Syntax.ModuleDeclaration:
        return this.moduleDeclaration(n, f);
      case Syntax.ParenthesizedExpression:
        return this.parenthesizedExpression(n, f);
      case Syntax.BinaryExpression:
        return this.binaryExpression(n, f);
      case Syntax.ExpressionStatement:
        return this.expressionStatement(n, f);
      case Syntax.Param:
        return this.param(n, f);
      case Syntax.ArrowFunction:
        return this.arrowFunction(n, f);
      case Syntax.FunctionExpression:
        return this.functionExpression(n, f);
      case Syntax.FunctionDeclaration:
        return this.functionDeclaration(n, f);
      case Syntax.VariableDeclaration:
        return this.variableDeclaration(n, f);
      case Syntax.VariableDeclarationList:
        return this.variableDeclarationList(n, f);
      case Syntax.VariableStatement:
        return this.variableStatement(n, f);
      case Syntax.LabeledStatement:
        return this.labeledStatement(n, f);
      case Syntax.ClassDeclaration:
        return this.classDeclaration(n, f);
      case Syntax.ClassExpression:
        return this.classExpression(n, f);
      case Syntax.HeritageClause:
        return this.heritageClause(n, f);
      case Syntax.CatchClause:
        return this.catchClause(n, f);
      case Syntax.ExpressionWithTypings:
        return this.expressionWithTypings(n, f);
      case Syntax.Constructor:
        return this.constructorr(n, f);
      case Syntax.PropertyDeclaration:
        return this.propertyDeclaration(n, f);
      case Syntax.MethodDeclaration:
        return this.method(n, f);
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        return this.accessor(n, f);
      case Syntax.ImportEqualsDeclaration:
        return this.importEquals(n, f);
      case Syntax.PropertyAccessExpression:
        return this.propertyAccess(n, f);
      case Syntax.ElemAccessExpression:
        return this.elemAccess(n, f);
      case Syntax.JsxSelfClosingElem:
      case Syntax.JsxOpeningElem:
        return this.jsxOpeningLikeElem(n, f);
    }
    return this.other(n, f);
  }
  callExpression(n: qt.CallExpression, f: TrafoFlags) {
    let r = f;
    const callee = qc.skip.outerExpressions(n.expression);
    const e = n.expression;
    if (n.flags & NodeFlags.OptionalChain) r |= TrafoFlags.ContainsES2020;
    if (n.typeArgs) r |= TrafoFlags.AssertTypeScript;
    if (f & TrafoFlags.ContainsRestOrSpread || qf.is.superOrSuperProperty(callee)) {
      r |= TrafoFlags.AssertES2015;
      if (qf.is.superProperty(callee)) r |= TrafoFlags.ContainsLexicalThis;
    }
    if (e.kind === Syntax.ImportKeyword) r |= TrafoFlags.ContainsDynamicImport;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.ArrayLiteralOrCallOrNewExcludes;
  }
  newExpression(n: qt.NewExpression, f: TrafoFlags) {
    let r = f;
    if (n.typeArgs) r |= TrafoFlags.AssertTypeScript;
    if (f & TrafoFlags.ContainsRestOrSpread) r |= TrafoFlags.AssertES2015;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.ArrayLiteralOrCallOrNewExcludes;
  }
  jsxOpeningLikeElem(n: qt.JsxOpeningLikeElem, f: TrafoFlags) {
    let r = f | TrafoFlags.AssertJsx;
    if (n.typeArgs) r |= TrafoFlags.AssertTypeScript;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.NodeExcludes;
  }
  binaryExpression(n: qt.BinaryExpression, f: TrafoFlags) {
    let r = f;
    const k = n.operatorToken.kind;
    const l = n.left.kind;
    if (k === Syntax.Question2Token) r |= TrafoFlags.AssertES2020;
    else if (k === Syntax.EqualsToken && l === Syntax.ObjectLiteralExpression) r |= TrafoFlags.AssertES2018 | TrafoFlags.AssertES2015 | TrafoFlags.AssertDestructuringAssignment;
    else if (k === Syntax.EqualsToken && l === Syntax.ArrayLiteralExpression) r |= TrafoFlags.AssertES2015 | TrafoFlags.AssertDestructuringAssignment;
    else if (k === Syntax.Asterisk2Token || k === Syntax.Asterisk2EqualsToken) r |= TrafoFlags.AssertES2016;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.NodeExcludes;
  }
  param(n: qt.ParamDeclaration, f: TrafoFlags) {
    let r = f;
    const name = n.name;
    const initer = n.initer;
    const dot3Token = n.dot3Token;
    if (n.questionToken || n.type || (f & TrafoFlags.ContainsTypeScriptClassSyntax && qu.some(n.decorators)) || isThisNode(Identifier, name)) r |= TrafoFlags.AssertTypeScript;
    if (qf.has.syntacticModifier(n, ModifierFlags.ParamPropertyModifier)) r |= TrafoFlags.AssertTypeScript | TrafoFlags.ContainsTypeScriptClassSyntax;
    if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
    if (f & TrafoFlags.ContainsBindingPattern || initer || dot3Token) r |= TrafoFlags.AssertES2015;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.ParamExcludes;
  }
  parenthesizedExpression(n: qt.ParenthesizedExpression, f: TrafoFlags) {
    let r = f;
    const k = n.expression.kind;
    if (k === Syntax.AsExpression || k === Syntax.TypeAssertionExpression) r |= TrafoFlags.AssertTypeScript;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.OuterExpressionExcludes;
  }
  classDeclaration(n: qt.ClassDeclaration, f: TrafoFlags) {
    let r: TrafoFlags;
    if (qf.has.syntacticModifier(n, ModifierFlags.Ambient)) r = TrafoFlags.AssertTypeScript;
    else {
      r = f | TrafoFlags.AssertES2015;
      if (f & TrafoFlags.ContainsTypeScriptClassSyntax || n.typeParams) r |= TrafoFlags.AssertTypeScript;
    }
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.ClassExcludes;
  }
  classExpression(n: qt.ClassExpression, f: TrafoFlags) {
    let r = f | TrafoFlags.AssertES2015;
    if (f & TrafoFlags.ContainsTypeScriptClassSyntax || n.typeParams) r |= TrafoFlags.AssertTypeScript;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.ClassExcludes;
  }
  heritageClause(n: qt.HeritageClause, f: TrafoFlags) {
    let r = f;
    switch (n.token) {
      case Syntax.ExtendsKeyword:
        r |= TrafoFlags.AssertES2015;
        break;
      case Syntax.ImplementsKeyword:
        r |= TrafoFlags.AssertTypeScript;
        break;
      default:
        qu.fail('Unexpected token for heritage clause');
        break;
    }
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.NodeExcludes;
  }
  catchClause(n: qt.CatchClause, f: TrafoFlags) {
    let r = f;
    if (!n.variableDeclaration) r |= TrafoFlags.AssertES2019;
    else if (qf.is.kind(qc.BindingPattern, n.variableDeclaration.name)) r |= TrafoFlags.AssertES2015;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.CatchClauseExcludes;
  }
  expressionWithTypings(n: qt.ExpressionWithTypings, f: TrafoFlags) {
    let r = f | TrafoFlags.AssertES2015;
    if (n.typeArgs) r |= TrafoFlags.AssertTypeScript;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.NodeExcludes;
  }
  constructorr(n: qt.ConstructorDeclaration, f: TrafoFlags) {
    let r = f;
    if (qf.has.syntacticModifier(n, ModifierFlags.TypeScriptModifier) || !n.body) r |= TrafoFlags.AssertTypeScript;
    if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.ConstructorExcludes;
  }
  method(n: qt.MethodDeclaration, f: TrafoFlags) {
    let r = f | TrafoFlags.AssertES2015;
    if (n.decorators || qf.has.syntacticModifier(n, ModifierFlags.TypeScriptModifier) || n.typeParams || n.type || !n.body || n.questionToken) r |= TrafoFlags.AssertTypeScript;
    if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
    if (qf.has.syntacticModifier(n, ModifierFlags.Async)) r |= n.asteriskToken ? TrafoFlags.AssertES2018 : TrafoFlags.AssertES2017;
    if (n.asteriskToken) r |= TrafoFlags.AssertGenerator;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return this.propagatePropertyNameFlags(n.name, r & ~TrafoFlags.MethodOrAccessorExcludes);
  }
  accessor(n: qt.AccessorDeclaration, f: TrafoFlags) {
    let r = f;
    if (n.decorators || qf.has.syntacticModifier(n, ModifierFlags.TypeScriptModifier) || n.type || !n.body) r |= TrafoFlags.AssertTypeScript;
    if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return this.propagatePropertyNameFlags(n.name, r & ~TrafoFlags.MethodOrAccessorExcludes);
  }
  propertyDeclaration(n: qt.PropertyDeclaration, f: TrafoFlags) {
    let r = f | TrafoFlags.ContainsClassFields;
    if (qu.some(n.decorators) || qf.has.syntacticModifier(n, ModifierFlags.TypeScriptModifier) || n.type || n.questionToken || n.exclamationToken) r |= TrafoFlags.AssertTypeScript;
    if (qf.is.kind(qc.ComputedPropertyName, n.name) || (qf.has.staticModifier(n) && n.initer)) r |= TrafoFlags.ContainsTypeScriptClassSyntax;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return this.propagatePropertyNameFlags(n.name, r & ~TrafoFlags.PropertyExcludes);
  }
  functionDeclaration(n: qt.FunctionDeclaration, f: TrafoFlags) {
    let r: TrafoFlags;
    const m = qf.get.syntacticModifierFlags(n);
    if (!n.body || m & ModifierFlags.Ambient) r = TrafoFlags.AssertTypeScript;
    else {
      r = f | TrafoFlags.ContainsHoistedDeclarationOrCompletion;
      if (m & ModifierFlags.TypeScriptModifier || n.typeParams || n.type) r |= TrafoFlags.AssertTypeScript;
      if (m & ModifierFlags.Async) r |= n.asteriskToken ? TrafoFlags.AssertES2018 : TrafoFlags.AssertES2017;
      if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
      if (n.asteriskToken) r |= TrafoFlags.AssertGenerator;
    }
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.FunctionExcludes;
  }
  functionExpression(n: qt.FunctionExpression, f: TrafoFlags) {
    let r = f;
    if (qf.has.syntacticModifier(n, ModifierFlags.TypeScriptModifier) || n.typeParams || n.type) r |= TrafoFlags.AssertTypeScript;
    if (qf.has.syntacticModifier(n, ModifierFlags.Async)) r |= n.asteriskToken ? TrafoFlags.AssertES2018 : TrafoFlags.AssertES2017;
    if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
    if (n.asteriskToken) r |= TrafoFlags.AssertGenerator;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.FunctionExcludes;
  }
  arrowFunction(n: qt.ArrowFunction, f: TrafoFlags) {
    let r = f | TrafoFlags.AssertES2015;
    if (qf.has.syntacticModifier(n, ModifierFlags.TypeScriptModifier) || n.typeParams || n.type) r |= TrafoFlags.AssertTypeScript;
    if (qf.has.syntacticModifier(n, ModifierFlags.Async)) r |= TrafoFlags.AssertES2017;
    if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.ArrowFunctionExcludes;
  }
  propertyAccess(n: qt.PropertyAccessExpression, f: TrafoFlags) {
    let r = f;
    if (n.flags & NodeFlags.OptionalChain) r |= TrafoFlags.ContainsES2020;
    if (n.expression.kind === Syntax.SuperKeyword) r |= TrafoFlags.ContainsES2017 | TrafoFlags.ContainsES2018;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.PropertyAccessExcludes;
  }
  elemAccess(n: qt.ElemAccessExpression, f: TrafoFlags) {
    let r = f;
    if (n.flags & NodeFlags.OptionalChain) r |= TrafoFlags.ContainsES2020;
    if (n.expression.kind === Syntax.SuperKeyword) r |= TrafoFlags.ContainsES2017 | TrafoFlags.ContainsES2018;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.PropertyAccessExcludes;
  }
  variableDeclaration(n: qt.VariableDeclaration, f: TrafoFlags) {
    let r = f;
    r |= TrafoFlags.AssertES2015 | TrafoFlags.ContainsBindingPattern;
    if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
    if (n.type || n.exclamationToken) r |= TrafoFlags.AssertTypeScript;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.NodeExcludes;
  }
  variableStatement(n: qt.VariableStatement, f: TrafoFlags) {
    let r: TrafoFlags;
    const d = n.declarationList.trafoFlags;
    if (qf.has.syntacticModifier(n, ModifierFlags.Ambient)) r = TrafoFlags.AssertTypeScript;
    else {
      r = f;
      if (d & TrafoFlags.ContainsBindingPattern) r |= TrafoFlags.AssertES2015;
    }
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.NodeExcludes;
  }
  labeledStatement(n: qt.LabeledStatement, f: TrafoFlags) {
    let r = f;
    if (f & TrafoFlags.ContainsBlockScopedBinding && qf.is.iterationStatement(n, true)) r |= TrafoFlags.AssertES2015;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.NodeExcludes;
  }
  importEquals(n: qt.ImportEqualsDeclaration, f: TrafoFlags) {
    let r = f;
    if (!qf.is.externalModuleImportEqualsDeclaration(n)) r |= TrafoFlags.AssertTypeScript;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.NodeExcludes;
  }
  expressionStatement(n: qt.ExpressionStatement, f: TrafoFlags) {
    const r = f;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.NodeExcludes;
  }
  moduleDeclaration(n: qt.ModuleDeclaration, f: TrafoFlags) {
    let r = TrafoFlags.AssertTypeScript;
    const m = qf.get.syntacticModifierFlags(n);
    if ((m & ModifierFlags.Ambient) === 0) r |= f;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.ModuleExcludes;
  }
  variableDeclarationList(n: qt.VariableDeclarationList, f: TrafoFlags) {
    let r = f | TrafoFlags.ContainsHoistedDeclarationOrCompletion;
    if (f & TrafoFlags.ContainsBindingPattern) r |= TrafoFlags.AssertES2015;
    if (n.flags & NodeFlags.BlockScoped) r |= TrafoFlags.AssertES2015 | TrafoFlags.ContainsBlockScopedBinding;
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~TrafoFlags.VariableDeclarationListExcludes;
  }
  other(n: Node, f: TrafoFlags) {
    let r = f;
    let excludeFlags = TrafoFlags.NodeExcludes;
    switch (n.kind) {
      case Syntax.AsyncKeyword:
        r |= TrafoFlags.AssertES2018 | TrafoFlags.AssertES2017;
        break;
      case Syntax.AwaitExpression:
        r |= TrafoFlags.AssertES2018 | TrafoFlags.AssertES2017 | TrafoFlags.ContainsAwait;
        break;
      case Syntax.AsExpression:
      case Syntax.PartiallyEmittedExpression:
      case Syntax.TypeAssertionExpression:
        r |= TrafoFlags.AssertTypeScript;
        excludeFlags = TrafoFlags.OuterExpressionExcludes;
        break;
      case Syntax.AbstractKeyword:
      case Syntax.ConstKeyword:
      case Syntax.DeclareKeyword:
      case Syntax.EnumDeclaration:
      case Syntax.EnumMember:
      case Syntax.NonNullExpression:
      case Syntax.PrivateKeyword:
      case Syntax.ProtectedKeyword:
      case Syntax.PublicKeyword:
      case Syntax.ReadonlyKeyword:
        r |= TrafoFlags.AssertTypeScript;
        break;
      case Syntax.JsxAttribute:
      case Syntax.JsxAttributes:
      case Syntax.JsxClosingElem:
      case Syntax.JsxClosingFragment:
      case Syntax.JsxElem:
      case Syntax.JsxExpression:
      case Syntax.JsxFragment:
      case Syntax.JsxOpeningFragment:
      case Syntax.JsxSpreadAttribute:
      case Syntax.JsxText:
        r |= TrafoFlags.AssertJsx;
        break;
      case Syntax.NoSubstitutionLiteral:
      case Syntax.TemplateHead:
      case Syntax.TemplateMiddle:
      case Syntax.TemplateTail:
        if (n.templateFlags) r |= TrafoFlags.AssertES2018;
        break;
      case Syntax.TaggedTemplateExpression:
        if (qf.has.invalidEscape(n.template)) {
          r |= TrafoFlags.AssertES2018;
          break;
        }
      case Syntax.MetaProperty:
      case Syntax.ShorthandPropertyAssignment:
      case Syntax.StaticKeyword:
      case Syntax.TemplateExpression:
        r |= TrafoFlags.AssertES2015;
        break;
      case Syntax.StringLiteral:
        if (n.hasExtendedEscape) r |= TrafoFlags.AssertES2015;
        break;
      case Syntax.NumericLiteral:
        if (n.numericLiteralFlags & qt.TokenFlags.BinaryOrOctalSpecifier) r |= TrafoFlags.AssertES2015;
        break;
      case Syntax.BigIntLiteral:
        r |= TrafoFlags.AssertESNext;
        break;
      case Syntax.ForOfStatement:
        if (n.awaitModifier) r |= TrafoFlags.AssertES2018;
        r |= TrafoFlags.AssertES2015;
        break;
      case Syntax.YieldExpression:
        r |= TrafoFlags.AssertES2018 | TrafoFlags.AssertES2015 | TrafoFlags.ContainsYield;
        break;
      case Syntax.AnyKeyword:
      case Syntax.ArrayTyping:
      case Syntax.BigIntKeyword:
      case Syntax.BooleanKeyword:
      case Syntax.CallSignature:
      case Syntax.ConditionalTyping:
      case Syntax.ConstructorTyping:
      case Syntax.ConstructSignature:
      case Syntax.FunctionTyping:
      case Syntax.IndexedAccessTyping:
      case Syntax.IndexSignature:
      case Syntax.InferTyping:
      case Syntax.InterfaceDeclaration:
      case Syntax.IntersectionTyping:
      case Syntax.LiteralTyping:
      case Syntax.MappedTyping:
      case Syntax.MethodSignature:
      case Syntax.NamespaceExportDeclaration:
      case Syntax.NeverKeyword:
      case Syntax.NumberKeyword:
      case Syntax.ObjectKeyword:
      case Syntax.OptionalTyping:
      case Syntax.ParenthesizedTyping:
      case Syntax.PropertySignature:
      case Syntax.RestTyping:
      case Syntax.StringKeyword:
      case Syntax.SymbolKeyword:
      case Syntax.ThisTyping:
      case Syntax.TupleTyping:
      case Syntax.TypeAliasDeclaration:
      case Syntax.TypeParam:
      case Syntax.TypingLiteral:
      case Syntax.TypingOperator:
      case Syntax.TypingPredicate:
      case Syntax.TypingQuery:
      case Syntax.TypingReference:
      case Syntax.UnionTyping:
      case Syntax.VoidKeyword:
        r = TrafoFlags.AssertTypeScript;
        excludeFlags = TrafoFlags.TypeExcludes;
        break;
      case Syntax.ComputedPropertyName:
        r |= TrafoFlags.ContainsComputedPropertyName;
        break;
      case Syntax.SpreadElem:
        r |= TrafoFlags.AssertES2015 | TrafoFlags.ContainsRestOrSpread;
        break;
      case Syntax.SpreadAssignment:
        r |= TrafoFlags.AssertES2018 | TrafoFlags.ContainsObjectRestOrSpread;
        break;
      case Syntax.SuperKeyword:
        r |= TrafoFlags.AssertES2015;
        excludeFlags = TrafoFlags.OuterExpressionExcludes;
        break;
      case Syntax.ThisKeyword:
        r |= TrafoFlags.ContainsLexicalThis;
        break;
      case Syntax.ObjectBindingPattern:
        r |= TrafoFlags.AssertES2015 | TrafoFlags.ContainsBindingPattern;
        if (f & TrafoFlags.ContainsRestOrSpread) r |= TrafoFlags.AssertES2018 | TrafoFlags.ContainsObjectRestOrSpread;
        excludeFlags = TrafoFlags.BindingPatternExcludes;
        break;
      case Syntax.ArrayBindingPattern:
        r |= TrafoFlags.AssertES2015 | TrafoFlags.ContainsBindingPattern;
        excludeFlags = TrafoFlags.BindingPatternExcludes;
        break;
      case Syntax.BindingElem:
        r |= TrafoFlags.AssertES2015;
        if (n.dot3Token) r |= TrafoFlags.ContainsRestOrSpread;
        break;
      case Syntax.Decorator:
        r |= TrafoFlags.AssertTypeScript | TrafoFlags.ContainsTypeScriptClassSyntax;
        break;
      case Syntax.ObjectLiteralExpression:
        excludeFlags = TrafoFlags.ObjectLiteralExcludes;
        if (f & TrafoFlags.ContainsComputedPropertyName) r |= TrafoFlags.AssertES2015;
        if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
        break;
      case Syntax.ArrayLiteralExpression:
        excludeFlags = TrafoFlags.ArrayLiteralOrCallOrNewExcludes;
        break;
      case Syntax.DoStatement:
      case Syntax.ForInStatement:
      case Syntax.ForStatement:
      case Syntax.WhileStatement:
        if (f & TrafoFlags.ContainsBlockScopedBinding) r |= TrafoFlags.AssertES2015;
        break;
      case Syntax.SourceFile:
        break;
      case Syntax.NamespaceExport:
        r |= TrafoFlags.AssertESNext;
        break;
      case Syntax.ReturnStatement:
        r |= TrafoFlags.ContainsHoistedDeclarationOrCompletion | TrafoFlags.AssertES2018;
        break;
      case Syntax.BreakStatement:
      case Syntax.ContinueStatement:
        r |= TrafoFlags.ContainsHoistedDeclarationOrCompletion;
        break;
      case Syntax.PrivateIdentifier:
        r |= TrafoFlags.ContainsClassFields;
        break;
    }
    n.trafoFlags = r | TrafoFlags.HasComputedFlags;
    return r & ~excludeFlags;
  }
  propagatePropertyNameFlags(n: qt.PropertyName, f: TrafoFlags) {
    return f | (n.trafoFlags & TrafoFlags.PropertyNamePropagatingFlags);
  }
})();
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
