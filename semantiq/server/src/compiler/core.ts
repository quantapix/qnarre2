import * as qb from './base';
import * as qd from './diags';
import { is, isDoc, get } from './core3';
import { NodeFlags, ObjectFlags, SignatureFlags, SymbolFlags, TransformFlags, TypeFlags } from './types';
import * as qt from './types';
import { Modifier, ModifierFlags, Syntax } from './syntax';
import * as qy from './syntax';
export * from './types';
export class Nodes<T extends qt.Nobj> extends Array<T> implements qt.Nodes<T> {
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
    super(...(!ts || ts === qb.empty ? [] : ts));
    if (trailingComma) this.trailingComma = trailingComma;
  }
  visit<T>(cb: (n: qt.Nobj) => T | undefined, cbs?: (ns: Nodes<qt.Nobj>) => T | undefined): T | undefined {
    if (cbs) return cbs(this);
    for (const n of this) {
      const r = cb(n);
      if (r) return r;
    }
    return;
  }
}
export type MutableNodes<T extends qt.Nobj> = Nodes<T> & T[];
export abstract class Nobj extends qb.TextRange implements qt.Nobj {
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
  getSourceFile(): SourceFile {
    return get.sourceFileOf(this);
  }
  getTokenPos(s?: qy.SourceFileLike, doc?: boolean): number {
    if (is.missing(this)) return this.pos;
    if (isDoc.node(this)) return qy.skipTrivia((s || get.sourceFileOf(this)).text, this.pos, false, true);
    if (doc && is.withDocNodes(this)) return this.doc![0].getTokenPos(s);
    if (is.kind(SyntaxList, this) && this._children?.length) return this._children![0].getTokenPos(s, doc);
    return qy.skipTrivia((s || get.sourceFileOf(this)).text, this.pos);
  }
  getStart(s?: qy.SourceFileLike, doc?: boolean) {
    qb.assert(!qb.isSynthesized(this.pos) && !qb.isSynthesized(this.end));
    return this.getTokenPos(s, doc);
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
  getChildren(s?: qy.SourceFileLike) {
    qb.assert(!qb.isSynthesized(this.pos) && !qb.isSynthesized(this.end));
    const scanner = qs_getRaw();
    const addSynthetics = (ns: qb.Push<Nobj>, pos: number, end: number) => {
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
        if (qc.isDoc.commentContainingNode(this)) {
          qc.forEach.child(this, (c) => {
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
  getFirstToken(s?: qy.SourceFileLike): Nobj | undefined {
    qb.assert(!qb.isSynthesized(this.pos) && !qb.isSynthesized(this.end));
    const cs = this.getChildren(s);
    if (!cs.length) return;
    const c = qb.find(cs, (c) => c.kind < Syntax.FirstDocNode || c.kind > Syntax.LastDocNode)!;
    return c.kind < Syntax.FirstNode ? c : c.getFirstToken(s);
  }
  getLastToken(s?: qy.SourceFileLike): Nobj | undefined {
    qb.assert(!qb.isSynthesized(this.pos) && !qb.isSynthesized(this.end));
    const cs = this.getChildren(s);
    const c = qb.lastOrUndefined(cs);
    if (!c) return;
    return c.kind < Syntax.FirstNode ? c : c.getLastToken(s);
  }
  visit<T>(cb: (n: Nobj) => T | undefined) {
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
      if (qc.has.syntacticModifier(n, ModifierFlags.Ambient) || (is.typeNode(n) && n.kind !== Syntax.ExpressionWithTypeArguments)) return TransformFlags.None;
      return reduceEachChild(n, TransformFlags.None, child, children);
    };
    const child = (f: TransformFlags, n: Nobj): TransformFlags => f | aggregate(n);
    const children = (f: TransformFlags, ns: Nodes<Nobj>): TransformFlags => f | nodes(ns);
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
  static updateNode<T extends Nobj>(updated: T, original: T): T {
    if (updated !== original) {
      updated.setOriginal(original);
      setRange(updated, original);
      aggregateTransformFlags(updated);
    }
    return updated;
  }
  static movePastDecorators(n: Nobj): qb.TextRange {
    return n.decorators && n.decorators.length > 0 ? n.movePos(n.decorators.end) : n;
  }
  static movePastModifiers(n: Nobj): qb.TextRange {
    return n.modifiers && n.modifiers.length > 0 ? n.movePos(n.modifiers.end) : movePastDecorators(n);
  }
  static createTokenRange(pos: number, token: Syntax): qb.TextRange {
    return new qb.TextRange(pos, pos + qy.toString(token)!.length);
  }
  static ofNode(n: Nobj): qb.TextRange {
    return new qb.TextRange(n.getTokenPos(), n.end);
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
    return this.kind === Syntax.EndOfFileToken ? this.doc || qb.empty : qb.empty;
  }
}
export class Token<T extends Syntax> extends TokenOrIdentifier implements qt.Token<T> {
  constructor(k: T, pos?: number, end?: number) {
    super(undefined, k, pos, end);
  }
}
export abstract class Statement extends Nobj implements qt.Statement {
  _statementBrand: any;
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
    this.doc = qb.append(this.doc, d);
    return this;
  }
}
export function idText(n: qt.Identifier | qt.PrivateIdentifier): string {
  return qy.get.unescUnderscores(n.escapedText);
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
  assignmentDeclarationMembers?: qb.QMap<Declaration>;
  isReferenced?: SymbolFlags;
  isReplaceableByMethod?: boolean;
  constEnumOnlyModule?: boolean;
  docComment?: qt.SymbolDisplayPart[];
  getComment?: qt.SymbolDisplayPart[];
  setComment?: qt.SymbolDisplayPart[];
  tags?: qt.DocTagInfo[];
  constructor(public flags: SymbolFlags, public escName: qb.__String) {}
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
      this.docComment = qb.empty;
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
          this.getComment = qb.empty;
          this.getComment = getDocComment(filter(this.declarations, isGetAccessor), checker);
        }
        return this.getComment!;
      case Syntax.SetAccessor:
        if (!this.setComment) {
          this.setComment = qb.empty;
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
  getPropertyNameForUniqueESSymbol(): qb.__String {
    return `__@${this.getId()}@${this.escName}` as qb.__String;
  }
  getSymbolNameForPrivateIdentifier(description: qb.__String): qb.__String {
    return `__#${this.getId()}@${description}` as qb.__String;
  }
  isKnownSymbol() {
    return startsWith(this.escName as string, '__@');
  }
  getLocalSymbolForExportDefault() {
    return this.isExportDefaultSymbol() ? this.declarations![0].localSymbol : undefined;
  }
  isExportDefaultSymbol() {
    return length(this.declarations) > 0 && qc.has.syntacticModifier(this.declarations![0], ModifierFlags.Default);
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
    return ds && find(ds, (d) => !is.externalModuleAugmentation(d) && !(is.kind(ModuleDeclaration, d) && isGlobalScopeAugmentation(d)));
  }
  setValueDeclaration(d: Declaration) {
    const v = this.valueDeclaration;
    if (
      !v ||
      (!(d.flags & NodeFlags.Ambient && !(v.flags & NodeFlags.Ambient)) && isAssignmentDeclaration(v) && !isAssignmentDeclaration(d)) ||
      (v.kind !== d.kind && is.effectiveModuleDeclaration(v))
    ) {
      this.valueDeclaration = d;
    }
  }
  isFunctionSymbol() {
    if (!this.valueDeclaration) return false;
    const v = this.valueDeclaration;
    return v.kind === Syntax.FunctionDeclaration || (is.kind(VariableDeclaration, v) && v.initializer && is.functionLike(v.initializer));
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
      return !!d && qc.has.syntacticModifier(d, ModifierFlags.Abstract);
    }
    return false;
  }
  getClassLikeDeclarationOfSymbol(): ClassLikeDeclaration | undefined {
    const ds = this.declarations;
    return ds && find(ds, isClassLike);
  }
  isUMDExportSymbol() {
    return this.declarations?.[0] && is.kind(NamespaceExportDeclaration, this.declarations[0]);
  }
  isShorthandAmbientModuleSymbol() {
    return is.shorthandAmbientModule(this.valueDeclaration);
  }
  abstract merge(t: Symbol, unidirectional?: boolean): Symbol;
}
export class SymbolTable<S extends qt.Symbol = Symbol> extends Map<qb.__String, S> implements qb.EscapedMap<S>, qt.SymbolTable<S> {
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
      if (t) qb.forEach(t.declarations, addDeclarationDiagnostic(qy.get.unescUnderscores(id), m));
      else this.set(id, s);
    });
    function addDeclarationDiagnostic(id: string, m: qd.Message) {
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
  copy(to: SymbolTable<S>, f: SymbolFlags) {
    if (f) {
      this.forEach((s) => {
        copySymbol(s, to, f);
      });
    }
  }
}
export class Type implements qt.Type {
  id!: number;
  symbol!: Symbol;
  aliasSymbol?: Symbol;
  pattern?: qt.DestructuringPattern;
  aliasTypeArguments?: readonly Type[];
  aliasTypeArgumentsContainsMarker?: boolean;
  permissiveInstantiation?: Type;
  restrictiveInstantiation?: Type;
  immediateBaseConstraint?: Type;
  widened?: Type;
  objectFlags?: ObjectFlags;
  constructor(public checker: qt.TypeChecker, public flags: TypeFlags) {}
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
    return this.checker.getSignaturesOfType(this, qt.SignatureKind.Call);
  }
  getConstructSignatures(): readonly Signature[] {
    return this.checker.getSignaturesOfType(this, qt.SignatureKind.Construct);
  }
  getStringIndexType(): Type | undefined {
    return this.checker.getIndexTypeOfType(this, qt.IndexKind.String);
  }
  getNumberIndexType(): Type | undefined {
    return this.checker.getIndexTypeOfType(this, qt.IndexKind.Number);
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
    return !!(getObjectFlags(this) & ObjectFlags.ClassOrInterface);
  }
  isClass(): this is qt.InterfaceType {
    return !!(getObjectFlags(this) & ObjectFlags.Class);
  }
  get typeArguments() {
    if (getObjectFlags(this) & ObjectFlags.Reference) return this.checker.getTypeArguments((this as Type) as qt.TypeReference);
    return;
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
  instantiations?: qb.QMap<Signature>;
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
  renamedDependencies?: qb.QReadonlyMap<string>;
  hasNoDefaultLib: boolean;
  languageVersion: ScriptTarget;
  scriptKind: ScriptKind;
  externalModuleIndicator?: Nobj;
  commonJsModuleIndicator?: Nobj;
  jsGlobalAugmentations?: SymbolTable;
  identifiers: qb.QMap<string>;
  nodeCount: number;
  identifierCount: number;
  symbolCount: number;
  parseDiagnostics: DiagnosticWithLocation[];
  bindDiagnostics: DiagnosticWithLocation[];
  bindSuggestionDiagnostics?: DiagnosticWithLocation[];
  docDiagnostics?: DiagnosticWithLocation[];
  additionalSyntacticDiagnostics?: readonly DiagnosticWithLocation[];
  lineMap: readonly number[];
  classifiableNames?: qb.ReadonlyEscapedMap<true>;
  commentDirectives?: CommentDirective[];
  resolvedModules?: qb.QMap<ResolvedModuleFull | undefined>;
  resolvedTypeReferenceDirectiveNames: qb.QMap<ResolvedTypeReferenceDirective | undefined>;
  imports: readonly StringLiteralLike[];
  moduleAugmentations: readonly (StringLiteral | Identifier)[];
  patternAmbientModules?: PatternAmbientModule[];
  ambientModuleNames: readonly string[];
  checkJsDirective?: CheckJsDirective;
  version: string;
  pragmas: ReadonlyPragmaMap;
  localJsxNamespace?: qb.__String;
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
  externalModuleIndicator!: Nobj;
  commonJsModuleIndicator!: Nobj;
  nodeCount!: number;
  identifierCount!: number;
  symbolCount!: number;
  version!: string;
  scriptKind!: ScriptKind;
  languageVersion!: ScriptTarget;
  languageVariant!: LanguageVariant;
  identifiers!: qb.QMap<string>;
  nameTable: qb.EscapedMap<number> | undefined;
  resolvedModules: qb.QMap<ResolvedModuleFull> | undefined;
  resolvedTypeReferenceDirectiveNames!: qb.QMap<ResolvedTypeReferenceDirective>;
  imports!: readonly StringLiteralLike[];
  moduleAugmentations!: StringLiteral[];
  private namedDeclarations: qb.QMap<Declaration[]> | undefined;
  ambientModuleNames!: string[];
  checkJsDirective: CheckJsDirective | undefined;
  errorExpectations: qb.TextRange[] | undefined;
  possiblyContainDynamicImport?: boolean;
  pragmas!: PragmaMap;
  localJsxFactory: EntityName | undefined;
  localJsxNamespace: qb.__String | undefined;
  constructor(kind: Syntax, pos: number, end: number) {
    super(kind, pos, end);
  }
  redirectInfo?: RedirectInfo | undefined;
  renamedDependencies?: qb.QReadonlyMap<string> | undefined;
  jsGlobalAugmentations?: SymbolTable<Symbol> | undefined;
  docDiagnostics?: DiagnosticWithLocation[] | undefined;
  additionalSyntacticDiagnostics?: readonly DiagnosticWithLocation[] | undefined;
  classifiableNames?: qb.ReadonlyEscapedMap<true> | undefined;
  commentDirectives?: CommentDirective[] | undefined;
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
  setRange(r?: qb.Range | undefined): this {
    throw new Error('Method not implemented.');
  }
  movePos(p: number): qb.TextRange {
    throw new Error('Method not implemented.');
  }
  moveEnd(e: number): qb.TextRange {
    throw new Error('Method not implemented.');
  }
  update(t: string, c: qb.TextChange): SourceFile {
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
  getNamedDeclarations(): qb.QMap<Declaration[]> {
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
  private computeNamedDeclarations(): qb.QMap<Declaration[]> {
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
        name && (isComputedPropertyName(name) && is.kind(PropertyAccessExpression, name.expression) ? name.expression.name.text : is.propertyName(name) ? getNameFromPropertyName(name) : undefined)
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
          if (!qc.has.syntacticModifier(node, ModifierFlags.ParameterPropertyModifier)) break;
        case Syntax.VariableDeclaration:
        case Syntax.BindingElement: {
          const decl = <VariableDeclaration>node;
          if (is.kind(BindingPattern, decl.name)) {
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
            if (is.kind(NamedExports, exportDeclaration.exportClause)) forEach(exportDeclaration.exportClause.elements, visit);
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
  getLineAndCharacterOfPosition(pos: number): qy.LineAndChar {
    return getLineAndCharacterOfPosition(this, pos);
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
export function cloneMap(m: SymbolTable): SymbolTable;
export function cloneMap<T>(m: qb.QReadonlyMap<T>): qb.QMap<T>;
export function cloneMap<T>(m: qb.ReadonlyEscapedMap<T>): qb.EscapedMap<T>;
export function cloneMap<T>(m: qb.QReadonlyMap<T> | qb.ReadonlyEscapedMap<T> | SymbolTable): qb.QMap<T> | qb.EscapedMap<T> | SymbolTable {
  const c = new qb.QMap<T>();
  copyEntries(m as qb.QMap<T>, c);
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
          const entity = getResolvedSymbol(getFirstIdentifier(query.exprName));
          visitSymbol(entity);
        }
      });
      return false;
    }
  }
}
qb.addMixins(ClassLikeDeclarationBase, [DocContainer]);
qb.addMixins(FunctionOrConstructorTypeNodeBase, [TypeNode]);
qb.addMixins(ObjectLiteralExpressionBase, [Declaration]);
qb.addMixins(LiteralExpression, [LiteralLikeNode]);
