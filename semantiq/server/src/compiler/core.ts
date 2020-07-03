import * as qb from './base';
import * as qt from './types';
import * as syntax from './syntax';
import { NodeFlags, TransformFlags } from './types';
import { Modifier, ModifierFlags, Syntax } from './syntax';
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
export abstract class Node extends qb.TextRange implements qt.Node {
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
  jsDoc?: qt.JSDoc[];
  private _children?: Node[];
  constructor(synth?: boolean, k?: Syntax, pos?: number, end?: number, public parent?: qt.Node) {
    super(pos, end);
    if (k) this.kind = k;
    if (synth) this.flags |= NodeFlags.Synthesized;
    if (parent) this.flags = parent.flags & NodeFlags.ContextFlags;
  }
  is<S extends Syntax, T extends { kind: S; also?: Syntax[] }>(t: T): this is qt.NodeType<T['kind']> {
    return this.kind === t.kind || !!t.also?.includes(this.kind);
  }
  isPrivateIdentifierPropertyDeclaration(): this is PrivateIdentifierPropertyDeclaration {
    return this.is(PropertyDeclaration) && this.name.is(PrivateIdentifier);
  }
  getSourceFile(): SourceFile {
    return Node.get.sourceFileOf(this);
  }
  getStart(s?: qt.SourceFileLike, includeJsDocComment?: boolean) {
    qb.assert(!qb.isSynthesized(this.pos) && !qb.isSynthesized(this.end));
    return getTokenPosOfNode(this, s, includeJsDocComment);
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
      if (Node.is.node(this.kind)) {
        if (Node.isJSDoc.commentContainingNode(this)) {
          Node.forEach.child(this, (c) => {
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
        qb.forEach((this as qt.JSDocContainer).jsDoc, processNode);
        p = this.pos;
        Node.forEach.child(this, processNode, processNodes);
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
    const c = find(cs, (c) => c.kind < Syntax.FirstJSDocNode || c.kind > Syntax.LastJSDocNode)!;
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
      if (hasSyntacticModifier(n, ModifierFlags.Ambient) || (Node.is.typeNode(n) && n.kind !== Syntax.ExpressionWithTypeArguments)) return TransformFlags.None;
      return reduceEachChild(n, TransformFlags.None, child, children);
    };
    const child = (f: TransformFlags, n: Node): TransformFlags => f | aggregate(n);
    const children = (f: TransformFlags, ns: Nodes<Node>): TransformFlags => f | nodes(ns);
    aggregate(this);
    return this;
  }
  static create<T extends Syntax>(k: T, pos: number, end: number, parent?: Node): qt.NodeType<T> {
    const n =
      Node.is.node(k) || k === Syntax.Unknown
        ? new Node(k, pos, end)
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
    return (n as unknown) as qt.NodeType<T>;
  }
  static createSynthesized<T extends Syntax>(k: T): qt.NodeType<T> {
    const n = this.create<T>(k, -1, -1);
    n.flags |= NodeFlags.Synthesized;
    return n;
  }
  static createTemplateLiteralLike(k: TemplateLiteralToken['kind'], t: string, raw?: string) {
    const n = this.createSynthesized(k);
    n.text = t;
    if (raw === undefined || t === raw) n.rawText = raw;
    else {
      const r = qs_process(k, raw);
      if (typeof r === 'object') return qb.fail('Invalid raw text');
      qb.assert(t === r, "Expected 'text' to be the normalized version of 'rawText'");
      n.rawText = raw;
    }
    return n;
  }
  /// new
  static createModifier<T extends Modifier['kind']>(kind: T): Token<T> {
    return new Token(kind);
  }
  static createModifiersFromModifierFlags(flags: ModifierFlags) {
    const result: Modifier[] = [];
    if (flags & ModifierFlags.Export) {
      result.push(createModifier(Syntax.ExportKeyword));
    }
    if (flags & ModifierFlags.Ambient) {
      result.push(createModifier(Syntax.DeclareKeyword));
    }
    if (flags & ModifierFlags.Default) {
      result.push(createModifier(Syntax.DefaultKeyword));
    }
    if (flags & ModifierFlags.Const) {
      result.push(createModifier(Syntax.ConstKeyword));
    }
    if (flags & ModifierFlags.Public) {
      result.push(createModifier(Syntax.PublicKeyword));
    }
    if (flags & ModifierFlags.Private) {
      result.push(createModifier(Syntax.PrivateKeyword));
    }
    if (flags & ModifierFlags.Protected) {
      result.push(createModifier(Syntax.ProtectedKeyword));
    }
    if (flags & ModifierFlags.Abstract) {
      result.push(createModifier(Syntax.AbstractKeyword));
    }
    if (flags & ModifierFlags.Static) {
      result.push(createModifier(Syntax.StaticKeyword));
    }
    if (flags & ModifierFlags.Readonly) {
      result.push(createModifier(Syntax.ReadonlyKeyword));
    }
    if (flags & ModifierFlags.Async) {
      result.push(createModifier(Syntax.AsyncKeyword));
    }
    return result;
  }
  static getMutableClone<T extends Node>(node: T): T {
    const clone = getSynthesizedClone(node);
    clone.pos = node.pos;
    clone.end = node.end;
    clone.parent = node.parent;
    return clone;
  }
  static getSynthesizedClone<T extends Node>(node: T): T {
    if (node === undefined) return node;
    const clone = Node.createSynthesized(node.kind) as T;
    clone.flags |= node.flags;
    setOriginalNode(clone, node);
    for (const key in node) {
      if (clone.hasOwnProperty(key) || !node.hasOwnProperty(key)) continue;
      (<any>clone)[key] = (<any>node)[key];
    }
    return clone;
  }
  static updateNode<T extends Node>(updated: T, original: T): T {
    if (updated !== original) {
      setOriginalNode(updated, original);
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
    return new qb.TextRange(pos, pos + syntax.toString(token)!.length);
  }
  static ofNode(n: Node): qb.TextRange {
    return new qb.TextRange(getTokenPosOfNode(n), n.end);
  }
  static ofTypeParams(a: Nodes<TypeParameterDeclaration>): qb.TextRange {
    return new qb.TextRange(a.pos - 1, a.end + 1);
  }
  static mergeTokenSourceMapRanges(sourceRanges: (TextRange | undefined)[], destRanges: (TextRange | undefined)[]) {
    if (!destRanges) destRanges = [];
    for (const key in sourceRanges) {
      destRanges[key] = sourceRanges[key];
    }
    return destRanges;
  }
  static readonly is = new (class {
    node(k: Syntax) {
      return k >= Syntax.FirstNode;
    }
    token(n: Node) {
      return n.kind >= Syntax.FirstToken && n.kind <= Syntax.LastToken;
    }
    kind<S extends Syntax, T extends { kind: S; also?: Syntax[] }>(t: T, n: qt.NodeType<S>): n is qt.NodeType<T['kind']> {
      return n.kind === t.kind || !!t.also?.includes(n.kind);
    }
    asyncFunction(n: Node) {
      switch (n.kind) {
        case Syntax.FunctionDeclaration:
        case Syntax.FunctionExpression:
        case Syntax.ArrowFunction:
        case Syntax.MethodDeclaration:
          return (<FunctionLikeDeclaration>n).body !== undefined && (<FunctionLikeDeclaration>n).asteriskToken === undefined && hasSyntacticModifier(n, ModifierFlags.Async);
      }
      return false;
    }
    signedNumericLiteral(n: Node): n is PrefixUnaryExpression & { operand: NumericLiteral } {
      return this.kind(PrefixUnaryExpression, n) && (n.operator === Syntax.PlusToken || n.operator === Syntax.MinusToken) && this.kind(NumericLiteral, n.operand);
    }
    expressionNode(n: Node) {
      switch (n.kind) {
        case Syntax.SuperKeyword:
        case Syntax.NullKeyword:
        case Syntax.TrueKeyword:
        case Syntax.FalseKeyword:
        case Syntax.RegexLiteral:
        case Syntax.ArrayLiteralExpression:
        case Syntax.ObjectLiteralExpression:
        case Syntax.PropertyAccessExpression:
        case Syntax.ElementAccessExpression:
        case Syntax.CallExpression:
        case Syntax.NewExpression:
        case Syntax.TaggedTemplateExpression:
        case Syntax.AsExpression:
        case Syntax.TypeAssertionExpression:
        case Syntax.NonNullExpression:
        case Syntax.ParenthesizedExpression:
        case Syntax.FunctionExpression:
        case Syntax.ClassExpression:
        case Syntax.ArrowFunction:
        case Syntax.VoidExpression:
        case Syntax.DeleteExpression:
        case Syntax.TypeOfExpression:
        case Syntax.PrefixUnaryExpression:
        case Syntax.PostfixUnaryExpression:
        case Syntax.BinaryExpression:
        case Syntax.ConditionalExpression:
        case Syntax.SpreadElement:
        case Syntax.TemplateExpression:
        case Syntax.OmittedExpression:
        case Syntax.JsxElement:
        case Syntax.JsxSelfClosingElement:
        case Syntax.JsxFragment:
        case Syntax.YieldExpression:
        case Syntax.AwaitExpression:
        case Syntax.MetaProperty:
          return true;
        case Syntax.QualifiedName:
          while (n.parent.kind === Syntax.QualifiedName) {
            n = n.parent;
          }
          return n.parent.kind === Syntax.TypeQuery || isJsx.tagName(n);
        case Syntax.Identifier:
          if (n.parent.kind === Syntax.TypeQuery || isJsx.tagName(n)) return true;
        case Syntax.NumericLiteral:
        case Syntax.BigIntLiteral:
        case Syntax.StringLiteral:
        case Syntax.NoSubstitutionLiteral:
        case Syntax.ThisKeyword:
          return this.inExpressionContext(n);
        default:
          return false;
      }
    }
    inExpressionContext(n: Node): boolean {
      const { parent } = n;
      switch (parent.kind) {
        case Syntax.VariableDeclaration:
        case Syntax.Parameter:
        case Syntax.PropertyDeclaration:
        case Syntax.PropertySignature:
        case Syntax.EnumMember:
        case Syntax.PropertyAssignment:
        case Syntax.BindingElement:
          return (parent as HasInitializer).initializer === n;
        case Syntax.ExpressionStatement:
        case Syntax.IfStatement:
        case Syntax.DoStatement:
        case Syntax.WhileStatement:
        case Syntax.ReturnStatement:
        case Syntax.WithStatement:
        case Syntax.SwitchStatement:
        case Syntax.CaseClause:
        case Syntax.ThrowStatement:
          return (<ExpressionStatement>parent).expression === n;
        case Syntax.ForStatement:
          const s = <ForStatement>parent;
          return (s.initializer === n && s.initializer.kind !== Syntax.VariableDeclarationList) || s.condition === n || s.incrementor === n;
        case Syntax.ForInStatement:
        case Syntax.ForOfStatement:
          const s2 = <ForInStatement | ForOfStatement>parent;
          return (s2.initializer === n && s2.initializer.kind !== Syntax.VariableDeclarationList) || s2.expression === n;
        case Syntax.TypeAssertionExpression:
        case Syntax.AsExpression:
          return n === (<AssertionExpression>parent).expression;
        case Syntax.TemplateSpan:
          return n === (<TemplateSpan>parent).expression;
        case Syntax.ComputedPropertyName:
          return n === (<ComputedPropertyName>parent).expression;
        case Syntax.Decorator:
        case Syntax.JsxExpression:
        case Syntax.JsxSpreadAttribute:
        case Syntax.SpreadAssignment:
          return true;
        case Syntax.ExpressionWithTypeArguments:
          return (<ExpressionWithTypeArguments>parent).expression === n && isExpressionWithTypeArgumentsInClassExtendsClause(parent);
        case Syntax.ShorthandPropertyAssignment:
          return (<ShorthandPropertyAssignment>parent).objectAssignmentInitializer === n;
        default:
          return this.expressionNode(parent);
      }
    }
    deleteTarget(n: Node) {
      if (n.kind !== Syntax.PropertyAccessExpression && n.kind !== Syntax.ElementAccessExpression) return false;
      n = walkUpParenthesizedExpressions(n.parent);
      return n.kind === Syntax.DeleteExpression;
    }
    descendantOf(n: Node, ancestor?: Node) {
      while (n) {
        if (n === ancestor) return true;
        n = n.parent;
      }
      return false;
    }
    declarationName(n: Node) {
      return !this.kind(SourceFile, n) && !this.kind(BindingPattern, n) && this.declaration(n.parent) && n.parent.name === n;
    }
    typeAlias(n: Node): n is qt.JSDocTypedefTag | qt.JSDocCallbackTag | qt.JSDocEnumTag | TypeAliasDeclaration {
      return isJSDoc.typeAlias(n) || this.kind(TypeAliasDeclaration, n);
    }
    literalLikeAccess(n: Node): n is LiteralLikeElementAccessExpression | PropertyAccessExpression {
      return this.kind(PropertyAccessExpression, n) || this.literalLikeElementAccess(n);
    }
    literalLikeElementAccess(n: Node): n is LiteralLikeElementAccessExpression {
      return this.kind(ElementAccessExpression, n) && (StringLiteral.orNumericLiteralLike(n.argumentExpression) || isWellKnownSymbolSyntactically(n.argumentExpression));
    }
    exportsIdentifier(n: Node) {
      return this.kind(Identifier, n) && n.escapedText === 'exports';
    }
    moduleIdentifier(n: Node) {
      return this.kind(Identifier, n) && n.escapedText === 'module';
    }
    moduleExportsAccessExpression(n: Node): n is LiteralLikeElementAccessExpression & { expression: Identifier } {
      return (this.kind(PropertyAccessExpression, n) || this.literalLikeElementAccess(n)) && this.moduleIdentifier(n.expression) && getElementOrPropertyAccessName(n) === 'exports';
    }
    partOfTypeQuery(n: Node) {
      while (n.kind === Syntax.QualifiedName || n.kind === Syntax.Identifier) {
        n = n.parent;
      }
      return n.kind === Syntax.TypeQuery;
    }
    externalModuleImportEqualsDeclaration(n: Node): n is ImportEqualsDeclaration & { moduleReference: ExternalModuleReference } {
      return n.kind === Syntax.ImportEqualsDeclaration && (<ImportEqualsDeclaration>n).moduleReference.kind === Syntax.ExternalModuleReference;
    }
    partOfTypeNode(n: Node) {
      if (Syntax.FirstTypeNode <= n.kind && n.kind <= Syntax.LastTypeNode) return true;
      switch (n.kind) {
        case Syntax.AnyKeyword:
        case Syntax.UnknownKeyword:
        case Syntax.NumberKeyword:
        case Syntax.BigIntKeyword:
        case Syntax.StringKeyword:
        case Syntax.BooleanKeyword:
        case Syntax.SymbolKeyword:
        case Syntax.ObjectKeyword:
        case Syntax.UndefinedKeyword:
        case Syntax.NeverKeyword:
          return true;
        case Syntax.VoidKeyword:
          return n.parent.kind !== Syntax.VoidExpression;
        case Syntax.ExpressionWithTypeArguments:
          return !isExpressionWithTypeArgumentsInClassExtendsClause(n);
        case Syntax.TypeParameter:
          return n.parent.kind === Syntax.MappedType || n.parent.kind === Syntax.InferType;
        case Syntax.Identifier:
          if (n.parent.kind === Syntax.QualifiedName && (<QualifiedName>n.parent).right === n) n = n.parent;
          else if (n.parent.kind === Syntax.PropertyAccessExpression && (<PropertyAccessExpression>n.parent).name === n) n = n.parent;
          qb.assert(
            n.kind === Syntax.Identifier || n.kind === Syntax.QualifiedName || n.kind === Syntax.PropertyAccessExpression,
            "'n' was expected to be a qualified name, identifier or property access in 'isPartOfTypeNode'."
          );
        case Syntax.QualifiedName:
        case Syntax.PropertyAccessExpression:
        case Syntax.ThisKeyword: {
          const { parent } = n;
          if (parent.kind === Syntax.TypeQuery) return false;
          if (parent.kind === Syntax.ImportType) return !(parent as ImportTypeNode).isTypeOf;
          if (Syntax.FirstTypeNode <= parent.kind && parent.kind <= Syntax.LastTypeNode) return true;
          switch (parent.kind) {
            case Syntax.ExpressionWithTypeArguments:
              return !isExpressionWithTypeArgumentsInClassExtendsClause(parent);
            case Syntax.TypeParameter:
              return n === (<TypeParameterDeclaration>parent).constraint;
            case Syntax.JSDocTemplateTag:
              return n === (<JSDocTemplateTag>parent).constraint;
            case Syntax.PropertyDeclaration:
            case Syntax.PropertySignature:
            case Syntax.Parameter:
            case Syntax.VariableDeclaration:
              return n === (parent as HasType).type;
            case Syntax.FunctionDeclaration:
            case Syntax.FunctionExpression:
            case Syntax.ArrowFunction:
            case Syntax.Constructor:
            case Syntax.MethodDeclaration:
            case Syntax.MethodSignature:
            case Syntax.GetAccessor:
            case Syntax.SetAccessor:
              return n === (<FunctionLikeDeclaration>parent).type;
            case Syntax.CallSignature:
            case Syntax.ConstructSignature:
            case Syntax.IndexSignature:
              return n === (<SignatureDeclaration>parent).type;
            case Syntax.TypeAssertionExpression:
              return n === (<TypeAssertion>parent).type;
            case Syntax.CallExpression:
            case Syntax.NewExpression:
              return contains((<CallExpression>parent).typeArguments, n);
            case Syntax.TaggedTemplateExpression:
              return false;
          }
        }
      }
      return false;
    }
    superOrSuperProperty(n: Node): n is SuperExpression | SuperProperty {
      return n.kind === Syntax.SuperKeyword || this.superProperty(n);
    }
    superProperty(n: Node): n is SuperProperty {
      const k = n.kind;
      return (k === Syntax.PropertyAccessExpression || k === Syntax.ElementAccessExpression) && (<PropertyAccessExpression | ElementAccessExpression>n).expression.kind === Syntax.SuperKeyword;
    }
    thisProperty(n: Node) {
      const k = n.kind;
      return (k === Syntax.PropertyAccessExpression || k === Syntax.ElementAccessExpression) && (<PropertyAccessExpression | ElementAccessExpression>n).expression.kind === Syntax.ThisKeyword;
    }
    validESSymbolDeclaration(n: Node): n is VariableDeclaration | PropertyDeclaration | SignatureDeclaration {
      return this.kind(VariableDeclaration, n)
        ? isVarConst(n) && this.kind(Identifier, n.name) && isVariableDeclarationInVariableStatement(n)
        : this.kind(PropertyDeclaration, n)
        ? hasEffectiveReadonlyModifier(n) && hasStaticModifier(n)
        : this.kind(PropertySignature, n) && hasEffectiveReadonlyModifier(n);
    }
    functionBlock(n: Node) {
      return n.kind === Syntax.Block && this.functionLike(n.parent);
    }
    objectLiteralMethod(n: Node): n is MethodDeclaration {
      return n.kind === Syntax.MethodDeclaration && n.parent.kind === Syntax.ObjectLiteralExpression;
    }
    objectLiteralOrClassExpressionMethod(n: Node): n is MethodDeclaration {
      return n.kind === Syntax.MethodDeclaration && (n.parent.kind === Syntax.ObjectLiteralExpression || n.parent.kind === Syntax.ClassExpression);
    }
    variableLike(n: Node): n is VariableLikeDeclaration {
      if (n) {
        switch (n.kind) {
          case Syntax.BindingElement:
          case Syntax.EnumMember:
          case Syntax.Parameter:
          case Syntax.PropertyAssignment:
          case Syntax.PropertyDeclaration:
          case Syntax.PropertySignature:
          case Syntax.ShorthandPropertyAssignment:
          case Syntax.VariableDeclaration:
            return true;
        }
      }
      return false;
    }
    variableLikeOrAccessor(n: Node): n is AccessorDeclaration | VariableLikeDeclaration {
      return this.variableLike(n) || this.accessor(n);
    }
    childOfNodeWithKind(n: Node, k: Syntax) {
      while (n) {
        if (n.kind === k) return true;
        n = n.parent;
      }
      return false;
    }
    aLet(n: Node) {
      return !!(get.combinedFlagsOf(n) & NodeFlags.Let);
    }
    superCall(n: Node): n is SuperCall {
      return n.kind === Syntax.CallExpression && (<CallExpression>n).expression.kind === Syntax.SuperKeyword;
    }
    importCall(n: Node): n is ImportCall {
      return n.kind === Syntax.CallExpression && (<CallExpression>n).expression.kind === Syntax.ImportKeyword;
    }
    importMeta(n: Node): n is ImportMetaProperty {
      return this.kind(MetaProperty, n) && n.keywordToken === Syntax.ImportKeyword && n.name.escapedText === 'meta';
    }
    literalImportTypeNode(n: Node): n is LiteralImportTypeNode {
      return this.kind(ImportTypeNode, n) && this.kind(LiteralTypeNode, n.argument) && this.kind(StringLiteral, n.argument.literal);
    }
    prologueDirective(n: Node): n is PrologueDirective {
      return n.kind === Syntax.ExpressionStatement && (<ExpressionStatement>n).expression.kind === Syntax.StringLiteral;
    }
    blockScope(n: Node, parent: Node) {
      switch (n.kind) {
        case Syntax.SourceFile:
        case Syntax.CaseBlock:
        case Syntax.CatchClause:
        case Syntax.ModuleDeclaration:
        case Syntax.ForStatement:
        case Syntax.ForInStatement:
        case Syntax.ForOfStatement:
        case Syntax.Constructor:
        case Syntax.MethodDeclaration:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
        case Syntax.FunctionDeclaration:
        case Syntax.FunctionExpression:
        case Syntax.ArrowFunction:
          return true;
        case Syntax.Block:
          return !this.functionLike(parent);
      }
      return false;
    }
    declarationWithTypeParameters(n: Node): n is DeclarationWithTypeParameters;
    declarationWithTypeParameters(n: DeclarationWithTypeParameters): n is DeclarationWithTypeParameters {
      switch (n.kind) {
        case Syntax.JSDocCallbackTag:
        case Syntax.JSDocTypedefTag:
        case Syntax.JSDocSignature:
          return true;
        default:
          assertType<DeclarationWithTypeParameterChildren>(n);
          return this.declarationWithTypeParameterChildren(n);
      }
    }
    declarationWithTypeParameterChildren(n: Node): n is DeclarationWithTypeParameterChildren;
    declarationWithTypeParameterChildren(n: DeclarationWithTypeParameterChildren): n is DeclarationWithTypeParameterChildren {
      switch (n.kind) {
        case Syntax.CallSignature:
        case Syntax.ConstructSignature:
        case Syntax.MethodSignature:
        case Syntax.IndexSignature:
        case Syntax.FunctionType:
        case Syntax.ConstructorType:
        case Syntax.JSDocFunctionType:
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
        case Syntax.InterfaceDeclaration:
        case Syntax.TypeAliasDeclaration:
        case Syntax.JSDocTemplateTag:
        case Syntax.FunctionDeclaration:
        case Syntax.MethodDeclaration:
        case Syntax.Constructor:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
        case Syntax.FunctionExpression:
        case Syntax.ArrowFunction:
          return true;
        default:
          assertType<never>(n);
          return false;
      }
    }
    anyImportSyntax(n: Node): n is AnyImportSyntax {
      switch (n.kind) {
        case Syntax.ImportDeclaration:
        case Syntax.ImportEqualsDeclaration:
          return true;
        default:
          return false;
      }
    }
    lateVisibilityPaintedStatement(n: Node): n is LateVisibilityPaintedStatement {
      switch (n.kind) {
        case Syntax.ImportDeclaration:
        case Syntax.ImportEqualsDeclaration:
        case Syntax.VariableStatement:
        case Syntax.ClassDeclaration:
        case Syntax.FunctionDeclaration:
        case Syntax.ModuleDeclaration:
        case Syntax.TypeAliasDeclaration:
        case Syntax.InterfaceDeclaration:
        case Syntax.EnumDeclaration:
          return true;
        default:
          return false;
      }
    }
    anyImportOrReExport(n: Node): n is AnyImportOrReExport {
      return this.anyImportSyntax(n) || this.kind(ExportDeclaration, n);
    }
    ambientModule(n: Node): n is AmbientModuleDeclaration {
      return this.kind(ModuleDeclaration, n) && (n.name.kind === Syntax.StringLiteral || isGlobalScopeAugmentation(n));
    }
    moduleWithStringLiteralName(n: Node): n is ModuleDeclaration {
      return this.kind(ModuleDeclaration, n) && n.name.kind === Syntax.StringLiteral;
    }
    nonGlobalAmbientModule(n: Node): n is ModuleDeclaration & { name: StringLiteral } {
      return this.kind(ModuleDeclaration, n) && this.kind(StringLiteral, n.name);
    }
    effectiveModuleDeclaration(n: Node) {
      return this.kind(ModuleDeclaration, n) || this.kind(Identifier, n);
    }
    shorthandAmbientModule(n: Node) {
      return n.kind === Syntax.ModuleDeclaration && !(<ModuleDeclaration>n).body;
    }
    blockScopedContainerTopLevel(n: Node) {
      return n.kind === Syntax.SourceFile || n.kind === Syntax.ModuleDeclaration || this.functionLike(n);
    }
    externalModuleAugmentation(n: Node): n is AmbientModuleDeclaration {
      return this.ambientModule(n) && this.moduleAugmentationExternal(n);
    }
    moduleAugmentationExternal(n: AmbientModuleDeclaration) {
      switch (n.parent.kind) {
        case Syntax.SourceFile:
          return qp_isExternalModule(n.parent);
        case Syntax.ModuleBlock:
          return this.ambientModule(n.parent.parent) && this.kind(SourceFile, n.parent.parent.parent) && !qp_isExternalModule(n.parent.parent.parent);
      }
      return false;
    }
    missing(n?: Node) {
      if (!n) return true;
      return n.pos === n.end && n.pos >= 0 && n.kind !== Syntax.EndOfFileToken;
    }
    present(n?: Node) {
      return !this.missing(n);
    }
    statementWithLocals(n: Node) {
      switch (n.kind) {
        case Syntax.Block:
        case Syntax.CaseBlock:
        case Syntax.ForStatement:
        case Syntax.ForInStatement:
        case Syntax.ForOfStatement:
          return true;
      }
      return false;
    }
    parameterPropertyDeclaration(n: Node, parent: Node): n is ParameterPropertyDeclaration {
      return hasSyntacticModifier(n, ModifierFlags.ParameterPropertyModifier) && parent.kind === Syntax.Constructor;
    }
    parseTreeNode(n: Node) {
      return (n.flags & NodeFlags.Synthesized) === 0;
    }
    withName(n: Node, name: Identifier) {
      if (this.namedDeclaration(n) && this.kind(Identifier, n.name) && idText(n.name as Identifier) === idText(name)) return true;
      if (this.kind(VariableStatement, n) && some(n.declarationList.declarations, (d) => this.withName(d, name))) return true;
      return false;
    }
    withJSDocNodes(n: Node): n is HasJSDoc {
      const { jsDoc } = n as qt.JSDocContainer;
      return !!jsDoc && jsDoc.length > 0;
    }
    withType(n: Node): n is HasType {
      return !!(n as HasType).type;
    }
    withInitializer(n: Node): n is HasInitializer {
      return !!(n as HasInitializer).initializer;
    }
    withOnlyExpressionInitializer(n: Node): n is HasExpressionInitializer {
      switch (n.kind) {
        case Syntax.VariableDeclaration:
        case Syntax.Parameter:
        case Syntax.BindingElement:
        case Syntax.PropertySignature:
        case Syntax.PropertyDeclaration:
        case Syntax.PropertyAssignment:
        case Syntax.EnumMember:
          return true;
        default:
          return false;
      }
    }
    namedDeclaration(n: Node): n is NamedDeclaration & { name: DeclarationName } {
      return !!(n as NamedDeclaration).name;
    }
    propertyAccessChain(n: Node): n is PropertyAccessChain {
      return this.kind(PropertyAccessExpression, n) && !!(n.flags & NodeFlags.OptionalChain);
    }
    elementAccessChain(n: Node): n is ElementAccessChain {
      return this.kind(ElementAccessExpression, n) && !!(n.flags & NodeFlags.OptionalChain);
    }
    callChain(n: Node): n is CallChain {
      return this.kind(CallExpression, n) && !!(n.flags & NodeFlags.OptionalChain);
    }
    optionalChainRoot(n: Node): n is OptionalChainRoot {
      return this.optionalChain(n) && !this.kind(NonNullExpression, n) && !!n.questionDotToken;
    }
    expressionOfOptionalChainRoot(n: Node): n is Expression & { parent: OptionalChainRoot } {
      return this.optionalChainRoot(n.parent) && n.parent.expression === n;
    }
    nullishCoalesce(n: Node) {
      return n.kind === Syntax.BinaryExpression && (<BinaryExpression>n).operatorToken.kind === Syntax.Question2Token;
    }
    constTypeReference(n: Node) {
      return this.kind(TypeReferenceNode, n) && this.kind(Identifier, n.typeName) && n.typeName.escapedText === 'const' && !n.typeArguments;
    }
    nonNullChain(n: Node): n is NonNullChain {
      return this.kind(NonNullExpression, n) && !!(n.flags & NodeFlags.OptionalChain);
    }
    unparsedNode(n: Node): n is UnparsedNode {
      return this.unparsedTextLike(n) || n.kind === Syntax.UnparsedPrologue || n.kind === Syntax.UnparsedSyntheticReference;
    }
    literalExpression(n: Node): n is LiteralExpression {
      return syntax.is.literal(n.kind);
    }
    templateLiteralToken(n: Node): n is TemplateLiteralToken {
      return syntax.is.templateLiteral(n.kind);
    }
    importOrExportSpecifier(n: Node): n is ImportSpecifier | ExportSpecifier {
      return this.kind(ImportSpecifier, n) || this.kind(ExportSpecifier, n);
    }
    typeOnlyImportOrExportDeclaration(n: Node): n is TypeOnlyCompatibleAliasDeclaration {
      switch (n.kind) {
        case Syntax.ImportSpecifier:
        case Syntax.ExportSpecifier:
          return (n as ImportOrExportSpecifier).parent.parent.isTypeOnly;
        case Syntax.NamespaceImport:
          return (n as NamespaceImport).parent.isTypeOnly;
        case Syntax.ImportClause:
          return (n as ImportClause).isTypeOnly;
        default:
          return false;
      }
    }
    stringTextContainingNode(n: Node): n is StringLiteral | TemplateLiteralToken {
      return n.kind === Syntax.StringLiteral || syntax.is.templateLiteral(n.kind);
    }
    generatedIdentifier(n: Node): n is GeneratedIdentifier {
      return this.kind(Identifier, n) && (n.autoGenerateFlags! & GeneratedIdentifierFlags.KindMask) > GeneratedIdentifierFlags.None;
    }
    privateIdentifierPropertyAccessExpression(n: Node): n is PrivateIdentifierPropertyAccessExpression {
      return this.kind(PropertyAccessExpression, n) && this.kind(PrivateIdentifier, n.name);
    }
    modifier(n: Node): n is Modifier {
      return syntax.is.modifier(n.kind);
    }
    functionLike(n: Node): n is SignatureDeclaration {
      return syntax.is.functionLike(n.kind);
    }
    functionLikeDeclaration(n: Node): n is FunctionLikeDeclaration {
      return syntax.is.functionLikeDeclaration(n.kind);
    }
    functionOrModuleBlock(n: Node) {
      return this.kind(SourceFile, n) || this.kind(ModuleBlock, n) || (this.kind(Block, n) && this.functionLike(n.parent));
    }
    classElement(n: Node): n is ClassElement {
      const k = n.kind;
      return (
        k === Syntax.Constructor ||
        k === Syntax.PropertyDeclaration ||
        k === Syntax.MethodDeclaration ||
        k === Syntax.GetAccessor ||
        k === Syntax.SetAccessor ||
        k === Syntax.IndexSignature ||
        k === Syntax.SemicolonClassElement
      );
    }
    classLike(n: Node): n is ClassLikeDeclaration {
      return n.kind === Syntax.ClassDeclaration || n.kind === Syntax.ClassExpression;
    }
    accessor(n: Node): n is AccessorDeclaration {
      return n.kind === Syntax.GetAccessor || n.kind === Syntax.SetAccessor;
    }
    methodOrAccessor(n: Node): n is MethodDeclaration | AccessorDeclaration {
      switch (n.kind) {
        case Syntax.MethodDeclaration:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          return true;
        default:
          return false;
      }
    }
    classOrTypeElement(n: Node): n is ClassElement | TypeElement {
      return this.typeElement(n) || this.classElement(n);
    }
    objectLiteralElementLike(n: Node): n is ObjectLiteralElementLike {
      const k = n.kind;
      return (
        k === Syntax.PropertyAssignment ||
        k === Syntax.ShorthandPropertyAssignment ||
        k === Syntax.SpreadAssignment ||
        k === Syntax.MethodDeclaration ||
        k === Syntax.GetAccessor ||
        k === Syntax.SetAccessor
      );
    }
    typeNode(n: Node): n is TypeNode {
      return syntax.is.typeNode(n.kind);
    }
    functionOrConstructorTypeNode(n: Node): n is FunctionTypeNode | ConstructorTypeNode {
      switch (n.kind) {
        case Syntax.FunctionType:
        case Syntax.ConstructorType:
          return true;
      }
      return false;
    }
    callLikeExpression(n: Node): n is CallLikeExpression {
      switch (n.kind) {
        case Syntax.JsxOpeningElement:
        case Syntax.JsxSelfClosingElement:
        case Syntax.CallExpression:
        case Syntax.NewExpression:
        case Syntax.TaggedTemplateExpression:
        case Syntax.Decorator:
          return true;
        default:
          return false;
      }
    }
    leftHandSideExpression(n: Node): n is LeftHandSideExpression {
      return syntax.is.leftHandSideExpression(skipPartiallyEmittedExpressions(n).kind);
    }
    unaryExpression(n: Node): n is UnaryExpression {
      return syntax.is.unaryExpression(skipPartiallyEmittedExpressions(n).kind);
    }
    unaryExpressionWithWrite(n: Node): n is PrefixUnaryExpression | PostfixUnaryExpression {
      switch (n.kind) {
        case Syntax.PostfixUnaryExpression:
          return true;
        case Syntax.PrefixUnaryExpression:
          return (<PrefixUnaryExpression>n).operator === Syntax.Plus2Token || (<PrefixUnaryExpression>n).operator === Syntax.Minus2Token;
        default:
          return false;
      }
    }
    expression(n: Node): n is Expression {
      return syntax.is.expression(skipPartiallyEmittedExpressions(n).kind);
    }
    notEmittedOrPartiallyEmittedNode(n: Node): n is NotEmittedStatement | PartiallyEmittedExpression {
      return this.kind(NotEmittedStatement, n) || this.kind(PartiallyEmittedExpression, n);
    }
    iterationStatement(n: Node, look: false): n is IterationStatement;
    iterationStatement(n: Node, look: boolean): n is IterationStatement | LabeledStatement;
    iterationStatement(n: Node, look: boolean): n is IterationStatement {
      switch (n.kind) {
        case Syntax.ForStatement:
        case Syntax.ForInStatement:
        case Syntax.ForOfStatement:
        case Syntax.DoStatement:
        case Syntax.WhileStatement:
          return true;
        case Syntax.LabeledStatement:
          return look && this.iterationStatement((<LabeledStatement>n).statement, look);
      }
      return false;
    }
    scopeMarker(n: Node) {
      return this.kind(ExportAssignment, n) || this.kind(ExportDeclaration, n);
    }
    conciseBody(n: Node): n is ConciseBody {
      return this.kind(Block, n) || this.expression(n);
    }
    functionBody(n: Node): n is FunctionBody {
      return this.kind(Block, n);
    }
    forInitializer(n: Node): n is ForInitializer {
      return this.kind(VariableDeclarationList, n) || this.expression(n);
    }
    declaration(n: Node): n is NamedDeclaration {
      if (n.kind === Syntax.TypeParameter) return (n.parent && n.parent.kind !== Syntax.JSDocTemplateTag) || isInJSFile(n);
      return syntax.is.declaration(n.kind);
    }
    declarationStatement(n: Node): n is DeclarationStatement {
      return syntax.is.declarationStatement(n.kind);
    }
    statementButNotDeclaration(n: Node): n is Statement {
      return syntax.is.statementKindButNotDeclaration(n.kind);
    }
    statement(n: Node): n is Statement {
      const k = n.kind;
      return syntax.is.statementKindButNotDeclaration(k) || syntax.is.declarationStatement(k) || this.blockStatement(n);
    }
    blockStatement(n: Node): n is Block {
      if (n.kind !== Syntax.Block) return false;
      if (n.parent !== undefined) {
        if (n.parent.kind === Syntax.TryStatement || n.parent.kind === Syntax.CatchClause) return false;
      }
      return !this.functionBlock(n);
    }
    identifierOrPrivateIdentifier(n: Node): n is Identifier | PrivateIdentifier {
      return n.kind === Syntax.Identifier || n.kind === Syntax.PrivateIdentifier;
    }
    optionalChain(n: Node): n is PropertyAccessChain | ElementAccessChain | CallChain | NonNullChain {
      const k = n.kind;
      return !!(n.flags & NodeFlags.OptionalChain) && (k === Syntax.PropertyAccessExpression || k === Syntax.ElementAccessExpression || k === Syntax.CallExpression || k === Syntax.NonNullExpression);
    }
    breakOrContinueStatement(n: Node): n is BreakOrContinueStatement {
      return n.kind === Syntax.BreakStatement || n.kind === Syntax.ContinueStatement;
    }
    namedExportBindings(n: Node): n is NamedExportBindings {
      return n.kind === Syntax.NamespaceExport || n.kind === Syntax.NamedExports;
    }
    unparsedTextLike(n: Node): n is UnparsedTextLike {
      switch (n.kind) {
        case Syntax.UnparsedText:
        case Syntax.UnparsedInternalText:
          return true;
        default:
          return false;
      }
    }
    entityName(n: Node): n is EntityName {
      const k = n.kind;
      return k === Syntax.QualifiedName || k === Syntax.Identifier;
    }
    propertyName(n: Node): n is PropertyName {
      const k = n.kind;
      return k === Syntax.Identifier || k === Syntax.PrivateIdentifier || k === Syntax.StringLiteral || k === Syntax.NumericLiteral || k === Syntax.ComputedPropertyName;
    }
    bindingName(n: Node): n is BindingName {
      const k = n.kind;
      return k === Syntax.Identifier || k === Syntax.ObjectBindingPattern || k === Syntax.ArrayBindingPattern;
    }
    typeElement(n: Node): n is TypeElement {
      const k = n.kind;
      return k === Syntax.ConstructSignature || k === Syntax.CallSignature || k === Syntax.PropertySignature || k === Syntax.MethodSignature || k === Syntax.IndexSignature;
    }
    arrayBindingElement(n: Node): n is ArrayBindingElement {
      const k = n.kind;
      return k === Syntax.BindingElement || k === Syntax.OmittedExpression;
    }
    propertyAccessOrQualifiedNameOrImportTypeNode(n: Node): n is PropertyAccessExpression | QualifiedName | ImportTypeNode {
      const k = n.kind;
      return k === Syntax.PropertyAccessExpression || k === Syntax.QualifiedName || k === Syntax.ImportType;
    }
    propertyAccessOrQualifiedName(n: Node): n is PropertyAccessExpression | QualifiedName {
      const k = n.kind;
      return k === Syntax.PropertyAccessExpression || k === Syntax.QualifiedName;
    }
    callOrNewExpression(n: Node): n is CallExpression | NewExpression {
      return n.kind === Syntax.CallExpression || n.kind === Syntax.NewExpression;
    }
    templateLiteral(n: Node): n is TemplateLiteral {
      const k = n.kind;
      return k === Syntax.TemplateExpression || k === Syntax.NoSubstitutionLiteral;
    }
    assertionExpression(n: Node): n is AssertionExpression {
      const k = n.kind;
      return k === Syntax.TypeAssertionExpression || k === Syntax.AsExpression;
    }
    forInOrOfStatement(n: Node): n is ForInOrOfStatement {
      return n.kind === Syntax.ForInStatement || n.kind === Syntax.ForOfStatement;
    }
    moduleBody(n: Node): n is ModuleBody {
      const k = n.kind;
      return k === Syntax.ModuleBlock || k === Syntax.ModuleDeclaration || k === Syntax.Identifier;
    }
    namespaceBody(n: Node): n is NamespaceBody {
      const k = n.kind;
      return k === Syntax.ModuleBlock || k === Syntax.ModuleDeclaration;
    }
    namedImportBindings(n: Node): n is NamedImportBindings {
      const k = n.kind;
      return k === Syntax.NamedImports || k === Syntax.NamespaceImport;
    }
    moduleOrEnumDeclaration(n: Node): n is ModuleDeclaration | EnumDeclaration {
      return n.kind === Syntax.ModuleDeclaration || n.kind === Syntax.EnumDeclaration;
    }
    moduleReference(n: Node): n is ModuleReference {
      const k = n.kind;
      return k === Syntax.ExternalModuleReference || k === Syntax.QualifiedName || k === Syntax.Identifier;
    }
    caseOrDefaultClause(n: Node): n is CaseOrDefaultClause {
      const k = n.kind;
      return k === Syntax.CaseClause || k === Syntax.DefaultClause;
    }
    objectLiteralElement(n: Node): n is ObjectLiteralElement {
      return n.kind === Syntax.JsxAttribute || n.kind === Syntax.JsxSpreadAttribute || this.objectLiteralElementLike(n);
    }
    typeReferenceType(n: Node): n is TypeReferenceType {
      return n.kind === Syntax.TypeReference || n.kind === Syntax.ExpressionWithTypeArguments;
    }
    isStringOrNumericLiteral(node: Node): node is StringLiteral | NumericLiteral {
      const kind = node.kind;
      return kind === Syntax.StringLiteral || kind === Syntax.NumericLiteral;
    }
    isSelfReferenceLocation(n: Node) {
      switch (n.kind) {
        case Syntax.FunctionDeclaration:
        case Syntax.ClassDeclaration:
        case Syntax.InterfaceDeclaration:
        case Syntax.EnumDeclaration:
        case Syntax.TypeAliasDeclaration:
        case Syntax.ModuleDeclaration:
          return true;
        default:
          return false;
      }
    }
    isSomeImportDeclaration(decl: Node) {
      switch (decl.kind) {
        case Syntax.ImportClause:
        case Syntax.ImportEqualsDeclaration:
        case Syntax.NamespaceImport:
        case Syntax.ImportSpecifier:
          return true;
        case Syntax.Identifier:
          return decl.parent.kind === Syntax.ImportSpecifier;
        default:
          return false;
      }
    }
    isDeclarationNameOrImportPropertyName(n: Node) {
      switch (n.parent.kind) {
        case Syntax.ImportSpecifier:
        case Syntax.ExportSpecifier:
          return Node.is.kind(Identifier, n);
        default:
          return Node.is.declarationName(n);
      }
    }
  })();
  static readonly isJsx = new (class {
    tagName(n: Node) {
      const { parent } = n;
      if (parent.kind === Syntax.JsxOpeningElement || parent.kind === Syntax.JsxSelfClosingElement || parent.kind === Syntax.JsxClosingElement) return (<JsxOpeningLikeElement>parent).tagName === n;
      return false;
    }
    tagNameExpression(n: Node): n is JsxTagNameExpression {
      const k = n.kind;
      return k === Syntax.ThisKeyword || k === Syntax.Identifier || k === Syntax.PropertyAccessExpression;
    }
    child(n: Node): n is JsxChild {
      const k = n.kind;
      return k === Syntax.JsxElement || k === Syntax.JsxExpression || k === Syntax.JsxSelfClosingElement || k === Syntax.JsxText || k === Syntax.JsxFragment;
    }
    attributeLike(n: Node): n is JsxAttributeLike {
      const k = n.kind;
      return k === Syntax.JsxAttribute || k === Syntax.JsxSpreadAttribute;
    }
    openingLikeElement(n: Node): n is JsxOpeningLikeElement {
      const k = n.kind;
      return k === Syntax.JsxOpeningElement || k === Syntax.JsxSelfClosingElement;
    }
  })();
  static readonly isJSDoc = new (class {
    constructSignature(n: Node) {
      const p = is.kind(JSDocFunctionType, n) ? firstOrUndefined(n.parameters) : undefined;
      const i = tryCast(p && p.name, isIdentifier);
      return !!i && i.escapedText === 'new';
    }
    typeAlias(n: Node): n is qt.JSDocTypedefTag | qt.JSDocCallbackTag | qt.JSDocEnumTag {
      return n.kind === Syntax.JSDocTypedefTag || n.kind === Syntax.JSDocCallbackTag || n.kind === Syntax.JSDocEnumTag;
    }
    namespaceBody(n: Node): n is qt.JSDocNamespaceBody {
      const k = n.kind;
      return k === Syntax.Identifier || k === Syntax.ModuleDeclaration;
    }
    propertyLikeTag(n: Node): n is qt.JSDocPropertyLikeTag {
      return n.kind === Syntax.JSDocPropertyTag || n.kind === Syntax.JSDocParameterTag;
    }
    node(n: Node) {
      return n.kind >= Syntax.FirstJSDocNode && n.kind <= Syntax.LastJSDocNode;
    }
    commentContainingNode(n: Node) {
      return n.kind === Syntax.JSDocComment || n.kind === Syntax.JSDocNamepathType || this.tag(n) || is.kind(JSDocTypeLiteral, n) || is.kind(JSDocSignature, n);
    }
    tag(n: Node): n is qt.JSDocTag {
      return n.kind >= Syntax.FirstJSDocTagNode && n.kind <= Syntax.LastJSDocTagNode;
    }
  })();
  static readonly get = new (class {
    containingFunction(n: Node): SignatureDeclaration | undefined {
      return findAncestor(n.parent, isFunctionLike);
    }
    containingFunctionDeclaration(n: Node): FunctionLikeDeclaration | undefined {
      return findAncestor(n.parent, isFunctionLikeDeclaration);
    }
    containingClass(n: Node): ClassLikeDeclaration | undefined {
      return findAncestor(n.parent, isClassLike);
    }
    thisContainer(n: Node, arrowFunctions: boolean): Node {
      qb.assert(n.kind !== Syntax.SourceFile);
      while (true) {
        n = n.parent;
        if (!n) return qb.fail();
        switch (n.kind) {
          case Syntax.ComputedPropertyName:
            if (Node.is.classLike(n.parent.parent)) return n;
            n = n.parent;
            break;
          case Syntax.Decorator:
            if (n.parent.kind === Syntax.Parameter && Node.is.classElement(n.parent.parent)) n = n.parent.parent;
            else if (Node.is.classElement(n.parent)) n = n.parent;
            break;
          case Syntax.ArrowFunction:
            if (!arrowFunctions) continue;
          case Syntax.FunctionDeclaration:
          case Syntax.FunctionExpression:
          case Syntax.ModuleDeclaration:
          case Syntax.PropertyDeclaration:
          case Syntax.PropertySignature:
          case Syntax.MethodDeclaration:
          case Syntax.MethodSignature:
          case Syntax.Constructor:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
          case Syntax.CallSignature:
          case Syntax.ConstructSignature:
          case Syntax.IndexSignature:
          case Syntax.EnumDeclaration:
          case Syntax.SourceFile:
            return n;
        }
      }
    }
    newTargetContainer(n: Node) {
      const c = this.thisContainer(n, false);
      if (c) {
        switch (c.kind) {
          case Syntax.Constructor:
          case Syntax.FunctionDeclaration:
          case Syntax.FunctionExpression:
            return c;
        }
      }
      return;
    }
    superContainer(n: Node, stopOnFunctions: boolean): Node {
      while (true) {
        n = n.parent;
        if (!n) return n;
        switch (n.kind) {
          case Syntax.ComputedPropertyName:
            n = n.parent;
            break;
          case Syntax.FunctionDeclaration:
          case Syntax.FunctionExpression:
          case Syntax.ArrowFunction:
            if (!stopOnFunctions) continue;
          case Syntax.PropertyDeclaration:
          case Syntax.PropertySignature:
          case Syntax.MethodDeclaration:
          case Syntax.MethodSignature:
          case Syntax.Constructor:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
            return n;
          case Syntax.Decorator:
            if (n.parent.kind === Syntax.Parameter && Node.is.classElement(n.parent.parent)) n = n.parent.parent;
            else if (Node.is.classElement(n.parent)) n = n.parent;
            break;
        }
      }
    }
    immediatelyInvokedFunctionExpression(n: Node): CallExpression | undefined {
      if (n.kind === Syntax.FunctionExpression || n.kind === Syntax.ArrowFunction) {
        let prev = n;
        let parent = n.parent;
        while (parent.kind === Syntax.ParenthesizedExpression) {
          prev = parent;
          parent = parent.parent;
        }
        if (parent.kind === Syntax.CallExpression && (parent as CallExpression).expression === prev) return parent as CallExpression;
      }
      return;
    }
    enclosingBlockScopeContainer(n: Node): Node {
      return Node.findAncestor(n.parent, (x) => Node.is.blockScope(x, x.parent))!;
    }
    textOf(n: Node, trivia = false): string {
      return getSourceTextOfNodeFromSourceFile(this.sourceFileOf(n), n, trivia);
    }
    getPos(n: Node) {
      return n.pos;
    }
    emitFlags(n: Node): EmitFlags {
      const e = n.emitNode;
      return (e && e.flags) || 0;
    }
    literalText(n: LiteralLikeNode, sourceFile: SourceFile, neverAsciiEscape: boolean | undefined, jsxAttributeEscape: boolean) {
      if (!qb.isSynthesized(n) && n.parent && !((Node.is.kind(NumericLiteral, n) && n.numericLiteralFlags & TokenFlags.ContainsSeparator) || Node.is.kind(BigIntLiteral, n))) {
        return getSourceTextOfNodeFromSourceFile(sourceFile, n);
      }
      switch (n.kind) {
        case Syntax.StringLiteral: {
          const esc = jsxAttributeEscape ? escapeJsxAttributeString : neverAsciiEscape || this.emitFlags(n) & EmitFlags.NoAsciiEscaping ? escapeString : escapeNonAsciiString;
          if ((<StringLiteral>n).singleQuote) return "'" + esc(n.text, Codes.singleQuote) + "'";
          return '"' + esc(n.text, Codes.doubleQuote) + '"';
        }
        case Syntax.NoSubstitutionLiteral:
        case Syntax.TemplateHead:
        case Syntax.TemplateMiddle:
        case Syntax.TemplateTail: {
          const esc = neverAsciiEscape || this.emitFlags(n) & EmitFlags.NoAsciiEscaping ? escapeString : escapeNonAsciiString;
          const raw = (<TemplateLiteralLikeNode>n).rawText || escapeTemplateSubstitution(esc(n.text, Codes.backtick));
          switch (n.kind) {
            case Syntax.NoSubstitutionLiteral:
              return '`' + raw + '`';
            case Syntax.TemplateHead:
              return '`' + raw + '${';
            case Syntax.TemplateMiddle:
              return '}' + raw + '${';
            case Syntax.TemplateTail:
              return '}' + raw + '`';
          }
          break;
        }
        case Syntax.NumericLiteral:
        case Syntax.BigIntLiteral:
        case Syntax.RegexLiteral:
          return n.text;
      }
      return qb.fail(`Literal kind '${n.kind}' not accounted for.`);
    }
    fullWidth(n: Node) {
      return n.end - n.pos;
    }
    sourceFileOf(n: Node): SourceFile;
    sourceFileOf(n: Node | undefined): SourceFile | undefined;
    sourceFileOf(n: Node): SourceFile {
      while (n && n.kind !== Syntax.SourceFile) {
        n = n.parent;
      }
      return n as SourceFile;
    }
    combinedFlags(n: Node, getFlags: (n: Node) => number): number {
      if (Node.is.kind(BindingElement, n)) n = walkUpBindingElementsAndPatterns(n);
      let flags = getFlags(n);
      if (n.kind === Syntax.VariableDeclaration) n = n.parent;
      if (n && n.kind === Syntax.VariableDeclarationList) {
        flags |= getFlags(n);
        n = n.parent;
      }
      if (n && n.kind === Syntax.VariableStatement) flags |= getFlags(n);
      return flags;
    }
    combinedFlagsOf(n: Node): NodeFlags {
      return this.combinedFlags(n, (n) => n.flags);
    }
    originalOf(n: Node): Node;
    originalOf<T extends Node>(n: Node, cb: (n: Node) => n is T): T;
    originalOf(n: Node | undefined): Node | undefined;
    originalOf<T extends Node>(n: Node | undefined, cb: (n: Node | undefined) => n is T): T | undefined;
    originalOf(n: Node | undefined, cb?: (n: Node | undefined) => boolean): Node | undefined {
      if (n) {
        while (n.original !== undefined) {
          n = n.original;
        }
      }
      return !cb || cb(n) ? n : undefined;
    }
    parseTreeOf(n: Node): Node;
    parseTreeOf<T extends Node>(n: Node | undefined, cb?: (n: Node) => n is T): T | undefined;
    parseTreeOf(n: Node | undefined, cb?: (n: Node) => boolean): Node | undefined {
      if (n === undefined || is.parseTreeNode(n)) return n;
      n = this.originalOf(n);
      if (is.parseTreeNode(n) && (!cb || cb(n))) return n;
      return;
    }
    assignedName(n: Node): DeclarationName | undefined {
      if (!n.parent) return;
      if (Node.is.kind(PropertyAssignment, n.parent) || Node.is.kind(BindingElement, n.parent)) return n.parent.name;
      if (is.kind(BinaryExpression, n.parent) && n === n.parent.right) {
        if (Node.is.kind(Identifier, n.parent.left)) return n.parent.left;
        if (isAccessExpression(n.parent.left)) return getElementOrPropertyAccessArgumentExpressionOrName(n.parent.left);
      } else if (Node.is.kind(VariableDeclaration, n.parent) && Node.is.kind(Identifier, n.parent.name)) return n.parent.name;
      return;
    }
  })();
  static readonly getJSDoc = new (class {
    augmentsTag(n: Node): qt.JSDocAugmentsTag | undefined {
      return this.firstTag(n, isJSDocAugmentsTag);
    }
    implementsTags(n: Node): readonly qt.JSDocImplementsTag[] {
      return this.allTags(n, isJSDocImplementsTag);
    }
    classTag(n: Node): qt.JSDocClassTag | undefined {
      return this.firstTag(n, isJSDocClassTag);
    }
    publicTag(n: Node): qt.JSDocPublicTag | undefined {
      return this.firstTag(n, isJSDocPublicTag);
    }
    publicTagNoCache(n: Node): qt.JSDocPublicTag | undefined {
      return this.firstTag(n, isJSDocPublicTag, true);
    }
    privateTag(n: Node): qt.JSDocPrivateTag | undefined {
      return this.firstTag(n, isJSDocPrivateTag);
    }
    privateTagNoCache(n: Node): qt.JSDocPrivateTag | undefined {
      return this.firstTag(n, isJSDocPrivateTag, true);
    }
    protectedTag(n: Node): qt.JSDocProtectedTag | undefined {
      return this.firstTag(n, isJSDocProtectedTag);
    }
    protectedTagNoCache(n: Node): qt.JSDocProtectedTag | undefined {
      return this.firstTag(n, isJSDocProtectedTag, true);
    }
    readonlyTag(n: Node): qt.JSDocReadonlyTag | undefined {
      return this.firstTag(n, isJSDocReadonlyTag);
    }
    readonlyTagNoCache(n: Node): qt.JSDocReadonlyTag | undefined {
      return this.firstTag(n, isJSDocReadonlyTag, true);
    }
    enumTag(n: Node): qt.JSDocEnumTag | undefined {
      return this.firstTag(n, isJSDocEnumTag);
    }
    thisTag(n: Node): qt.JSDocThisTag | undefined {
      return this.firstTag(n, isJSDocThisTag);
    }
    returnTag(n: Node): qt.JSDocReturnTag | undefined {
      return this.firstTag(n, isJSDocReturnTag);
    }
    templateTag(n: Node): qt.JSDocTemplateTag | undefined {
      return this.firstTag(n, isJSDocTemplateTag);
    }
    typeTag(n: Node): qt.JSDocTypeTag | undefined {
      const tag = this.firstTag(n, isJSDocTypeTag);
      if (tag && tag.typeExpression && tag.typeExpression.type) return tag;
      return;
    }
    type(n: Node): TypeNode | undefined {
      let tag: qt.JSDocTypeTag | qt.JSDocParameterTag | undefined = this.firstTag(n, isJSDocTypeTag);
      if (!tag && Node.is.kind(ParameterDeclaration, n)) tag = find(this.parameterTags(n), (tag) => !!tag.typeExpression);
      return tag && tag.typeExpression && tag.typeExpression.type;
    }
    returnType(n: Node): TypeNode | undefined {
      const returnTag = this.returnTag(n);
      if (returnTag && returnTag.typeExpression) return returnTag.typeExpression.type;
      const typeTag = this.typeTag(n);
      if (typeTag && typeTag.typeExpression) {
        const type = typeTag.typeExpression.type;
        if (Node.is.kind(TypeLiteralNode, type)) {
          const sig = find(type.members, CallSignatureDeclaration.kind);
          return sig && sig.type;
        }
        if (Node.is.kind(FunctionTypeNode, type) || Node.is.kind(JSDocFunctionType, type)) return type.type;
      }
      return;
    }
    tagsWorker(n: Node, noCache?: boolean): readonly qt.JSDocTag[] {
      let tags = (n as qt.JSDocContainer).jsDocCache;
      if (tags === undefined || noCache) {
        const comments = this.commentsAndTags(n, noCache);
        qb.assert(comments.length < 2 || comments[0] !== comments[1]);
        tags = flatMap(comments, (j) => (Node.is.kind(JSDoc, j) ? j.tags : j));
        if (!noCache) (n as qt.JSDocContainer).jsDocCache = tags;
      }
      return tags;
    }
    tags(n: Node): readonly qt.JSDocTag[] {
      return this.tagsWorker(n, false);
    }
    tagsNoCache(n: Node): readonly qt.JSDocTag[] {
      return this.tagsWorker(n, true);
    }
    firstTag<T extends qt.JSDocTag>(n: Node, cb: (t: qt.JSDocTag) => t is T, noCache?: boolean): T | undefined {
      return find(this.tagsWorker(n, noCache), cb);
    }
    allTags<T extends qt.JSDocTag>(n: Node, cb: (t: qt.JSDocTag) => t is T): readonly T[] {
      return this.tags(n).filter(cb);
    }
    allTagsOfKind(n: Node, k: Syntax): readonly qt.JSDocTag[] {
      return this.tags(n).filter((t) => t.kind === k);
    }
    parameterTagsWorker(param: ParameterDeclaration, noCache?: boolean): readonly qt.JSDocParameterTag[] {
      if (param.name) {
        if (Node.is.kind(Identifier, param.name)) {
          const name = param.name.escapedText;
          return Node.getJSDoc
            .tagsWorker(param.parent, noCache)
            .filter((tag): tag is qt.JSDocParameterTag => Node.is.kind(JSDocParameterTag, tag) && Node.is.kind(Identifier, tag.name) && tag.name.escapedText === name);
        } else {
          const i = param.parent.parameters.indexOf(param);
          qb.assert(i > -1, "Parameters should always be in their parents' parameter list");
          const paramTags = this.tagsWorker(param.parent, noCache).filter(isJSDocParameterTag);
          if (i < paramTags.length) return [paramTags[i]];
        }
      }
      return empty;
    }
    parameterTags(param: ParameterDeclaration): readonly qt.JSDocParameterTag[] {
      return this.parameterTagsWorker(param, false);
    }
    parameterTagsNoCache(param: ParameterDeclaration): readonly qt.JSDocParameterTag[] {
      return this.parameterTagsWorker(param, true);
    }
    typeParameterTagsWorker(param: TypeParameterDeclaration, noCache?: boolean): readonly qt.JSDocTemplateTag[] {
      const name = param.name.escapedText;
      return Node.getJSDoc
        .tagsWorker(param.parent, noCache)
        .filter((tag): tag is qt.JSDocTemplateTag => Node.is.kind(JSDocTemplateTag, tag) && tag.typeParameters.some((tp) => tp.name.escapedText === name));
    }
    typeParameterTags(param: TypeParameterDeclaration): readonly qt.JSDocTemplateTag[] {
      return this.typeParameterTagsWorker(param, false);
    }
    typeParameterTagsNoCache(param: TypeParameterDeclaration): readonly qt.JSDocTemplateTag[] {
      return this.typeParameterTagsWorker(param, true);
    }
    withParameterTags(n: FunctionLikeDeclaration | SignatureDeclaration) {
      return !!this.firstTag(n, isJSDocParameterTag);
    }
    nameOfTypedef(declaration: qt.JSDocTypedefTag): Identifier | PrivateIdentifier | undefined {
      return declaration.name || nameForNamelessJSDocTypedef(declaration);
    }
    commentRanges(n: Node, text: string) {
      const commentRanges =
        n.kind === Syntax.Parameter || n.kind === Syntax.TypeParameter || n.kind === Syntax.FunctionExpression || n.kind === Syntax.ArrowFunction || n.kind === Syntax.ParenthesizedExpression
          ? concatenate(syntax.get.trailingCommentRanges(text, n.pos), syntax.get.leadingCommentRanges(text, n.pos))
          : syntax.get.leadingCommentRanges(text, n.pos);
      return filter(commentRanges, (c) => text.charCodeAt(c.pos + 1) === Codes.asterisk && text.charCodeAt(c.pos + 2) === Codes.asterisk && text.charCodeAt(c.pos + 3) !== Codes.slash);
    }
    commentsAndTags(host: Node, noCache?: boolean): readonly (JSDoc | qt.JSDocTag)[] {
      let r: (JSDoc | qt.JSDocTag)[] | undefined;
      if (Node.is.variableLike(host) && Node.is.withInitializer(host) && Node.is.withJSDocNodes(host.initializer!)) {
        r = append(r, last((host.initializer as HasJSDoc).jsDoc!));
      }
      let n: Node | undefined = host;
      while (n && n.parent) {
        if (Node.is.withJSDocNodes(n)) r = append(r, last(n.jsDoc!));
        if (n.kind === Syntax.Parameter) {
          r = addRange(r, (noCache ? this.parameterTagsNoCache : this.parameterTags)(n as ParameterDeclaration));
          break;
        }
        if (n.kind === Syntax.TypeParameter) {
          r = addRange(r, (noCache ? this.typeParameterTagsNoCache : this.typeParameterTags)(n as TypeParameterDeclaration));
          break;
        }
        n = this.nextCommentLocation(n);
      }
      return r || empty;
    }
    nextCommentLocation(n: Node) {
      const parent = n.parent;
      if (
        parent.kind === Syntax.PropertyAssignment ||
        parent.kind === Syntax.ExportAssignment ||
        parent.kind === Syntax.PropertyDeclaration ||
        (parent.kind === Syntax.ExpressionStatement && n.kind === Syntax.PropertyAccessExpression) ||
        getNestedModuleDeclaration(parent) ||
        (Node.is.kind(BinaryExpression, n) && n.operatorToken.kind === Syntax.EqualsToken)
      ) {
        return parent;
      } else if (parent.parent && (getSingleVariableOfVariableStatement(parent.parent) === n || (Node.is.kind(BinaryExpression, parent) && parent.operatorToken.kind === Syntax.EqualsToken))) {
        return parent.parent;
      } else if (
        parent.parent &&
        parent.parent.parent &&
        (getSingleVariableOfVariableStatement(parent.parent.parent) ||
          getSingleInitializerOfVariableStatementOrPropertyDeclaration(parent.parent.parent) === n ||
          getSourceOfDefaultedAssignment(parent.parent.parent))
      ) {
        return parent.parent.parent;
      }
      return;
    }
    host(n: Node): HasJSDoc {
      return Debug.checkDefined(Node.findAncestor(n.parent, isJSDoc)).parent;
    }
    typeParameterDeclarations(n: DeclarationWithTypeParameters): readonly TypeParameterDeclaration[] {
      return flatMap(this.tags(n), (tag) => (isNonTypeAliasTemplate(tag) ? tag.typeParameters : undefined));
    }
    modifierFlagsNoCache(n: Node): ModifierFlags {
      let flags = ModifierFlags.None;
      if (isInJSFile(n) && !!n.parent && !Node.is.kind(ParameterDeclaration, n)) {
        if (this.publicTagNoCache(n)) flags |= ModifierFlags.Public;
        if (this.privateTagNoCache(n)) flags |= ModifierFlags.Private;
        if (this.protectedTagNoCache(n)) flags |= ModifierFlags.Protected;
        if (this.readonlyTagNoCache(n)) flags |= ModifierFlags.Readonly;
      }
      return flags;
    }
  })();
  static readonly other = new (class {
    containsParseError(n: Node) {
      aggregateChildData(n);
      return (n.flags & NodeFlags.ThisNodeOrAnySubNodesHasError) !== 0;
    }
    aggregateChildData(n: Node): void {
      if (!(n.flags & NodeFlags.HasAggregatedChildData)) {
        const thisNodeOrAnySubNodesHasError = (n.flags & NodeFlags.ThisNodeHasError) !== 0 || Node.forEach.child(n, containsParseError);
        if (thisNodeOrAnySubNodesHasError) n.flags |= NodeFlags.ThisNodeOrAnySubNodesHasError;
        n.flags |= NodeFlags.HasAggregatedChildData;
      }
    }
    nPosToString(n: Node): string {
      const file = get.sourceFileOf(n);
      const loc = syntax.get.lineAndCharOf(file, n.pos);
      return `${file.fileName}(${loc.line + 1},${loc.character + 1})`;
    }
    findAncestor<T extends Node>(n: Node | undefined, cb: (n: Node) => n is T): T | undefined;
    findAncestor(n: Node | undefined, cb: (n: Node) => boolean | 'quit'): Node | undefined;
    findAncestor(n: Node | undefined, cb: (n: Node) => boolean | 'quit'): Node | undefined {
      while (n) {
        const r = cb(n);
        if (r === 'quit') return;
        if (r) return n;
        n = n.parent;
      }
      return;
    }
    guessIndentation(lines: string[]) {
      let indentation = MAX_SMI_X86;
      for (const line of lines) {
        if (!line.length) continue;
        let i = 0;
        for (; i < line.length && i < indentation; i++) {
          if (!syntax.is.whiteSpaceLike(line.charCodeAt(i))) break;
        }
        if (i < indentation) indentation = i;
        if (indentation === 0) return 0;
      }
      return indentation === MAX_SMI_X86 ? undefined : indentation;
    }
    hasScopeMarker(ss: readonly Statement[]) {
      return some(ss, isScopeMarker);
    }
    needsScopeMarker(s: Statement) {
      return !Node.is.anyImportOrReExport(s) && !Node.is.kind(ExportAssignment, s) && !hasSyntacticModifier(s, ModifierFlags.Export) && !Node.is.ambientModule(s);
    }
    isExternalModuleIndicator(s: Statement) {
      return Node.is.anyImportOrReExport(s) || Node.is.kind(ExportAssignment, s) || hasSyntacticModifier(s, ModifierFlags.Export);
    }
    isDeclarationBindingElement(e: BindingOrAssignmentElement): e is VariableDeclaration | ParameterDeclaration | BindingElement {
      switch (e.kind) {
        case Syntax.VariableDeclaration:
        case Syntax.Parameter:
        case Syntax.BindingElement:
          return true;
      }
      return false;
    }
    isBindingOrAssignmentPattern(n: BindingOrAssignmentElementTarget): n is BindingOrAssignmentPattern {
      return isObjectBindingOrAssignmentPattern(n) || isArrayBindingOrAssignmentPattern(n);
    }
    isObjectBindingOrAssignmentPattern(n: BindingOrAssignmentElementTarget): n is ObjectBindingOrAssignmentPattern {
      switch (n.kind) {
        case Syntax.ObjectBindingPattern:
        case Syntax.ObjectLiteralExpression:
          return true;
      }
      return false;
    }
    isArrayBindingOrAssignmentPattern(n: BindingOrAssignmentElementTarget): n is ArrayBindingOrAssignmentPattern {
      switch (n.kind) {
        case Syntax.ArrayBindingPattern:
        case Syntax.ArrayLiteralExpression:
          return true;
      }
      return false;
    }
    isOutermostOptionalChain(n: OptionalChain) {
      return !Node.is.optionalChain(n.parent) || Node.is.optionalChainRoot(n.parent) || n !== n.parent.expression;
    }
    isEmptyBindingElement(n: BindingElement) {
      if (Node.is.kind(OmittedExpression, n)) return true;
      return this.isEmptyBindingPattern(n.name);
    }
    isEmptyBindingPattern(n: BindingName): n is BindingPattern {
      if (Node.is.kind(BindingPattern, n)) return every(n.elements, this.isEmptyBindingElement);
      return false;
    }
    isExternalModuleNameRelative(moduleName: string) {
      return pathIsRelative(moduleName) || isRootedDiskPath(moduleName);
    }
    sortAndDeduplicateDiagnostics<T extends Diagnostic>(diagnostics: readonly T[]): SortedReadonlyArray<T> {
      return sortAndDeduplicate<T>(diagnostics, compareDiagnostics);
    }
    getDefaultLibFileName(options: CompilerOptions): string {
      switch (options.target) {
        case ScriptTarget.ESNext:
          return 'lib.esnext.full.d.ts';
        case ScriptTarget.ES2020:
          return 'lib.es2020.full.d.ts';
        default:
          return 'lib.d.ts';
      }
    }
    getTypeParameterOwner(d: Declaration): Declaration | undefined {
      if (d && d.kind === Syntax.TypeParameter) {
        for (let current: Node = d; current; current = current.parent) {
          if (Node.is.functionLike(current) || Node.is.classLike(current) || current.kind === Syntax.InterfaceDeclaration) {
            return <Declaration>current;
          }
        }
      }
      return;
    }
    walkUpBindingElementsAndPatterns(binding: BindingElement): VariableDeclaration | ParameterDeclaration {
      let n = binding.parent;
      while (Node.is.kind(BindingElement, n.parent)) {
        n = n.parent.parent;
      }
      return n.parent;
    }
    getCombinedModifierFlags(n: Declaration): ModifierFlags {
      return get.combinedFlags(n, getEffectiveModifierFlags);
    }
    validateLocaleAndSetLanguage(
      locale: string,
      sys: {
        getExecutingFilePath(): string;
        resolvePath(path: string): string;
        fileExists(fileName: string): boolean;
        readFile(fileName: string): string | undefined;
      },
      errors?: qb.Push<Diagnostic>
    ) {
      const matchResult = /^([a-z]+)([_\-]([a-z]+))?$/.exec(locale.toLowerCase());
      if (!matchResult) {
        if (errors) {
          errors.push(createCompilerDiagnostic(Diagnostics.Locale_must_be_of_the_form_language_or_language_territory_For_example_0_or_1, 'en', 'ja-jp'));
        }
        return;
      }
      const language = matchResult[1];
      const territory = matchResult[3];
      if (!trySetLanguageAndTerritory(language, territory, errors)) {
        trySetLanguageAndTerritory(language, undefined, errors);
      }
      setUILocale(locale);
      function trySetLanguageAndTerritory(language: string, territory: string | undefined, errors?: qb.Push<Diagnostic>) {
        const compilerFilePath = normalizePath(sys.getExecutingFilePath());
        const containingDirectoryPath = getDirectoryPath(compilerFilePath);
        let filePath = combinePaths(containingDirectoryPath, language);
        if (territory) filePath = filePath + '-' + territory;
        filePath = sys.resolvePath(combinePaths(filePath, 'diagnosticMessages.generated.json'));
        if (!sys.fileExists(filePath)) return false;
        let fileContents: string | undefined = '';
        try {
          fileContents = sys.readFile(filePath);
        } catch (e) {
          if (errors) errors.push(createCompilerDiagnostic(Diagnostics.Unable_to_open_file_0, filePath));
          return false;
        }
        try {
          setLocalizedDiagnosticMessages(JSON.parse(fileContents!));
        } catch {
          if (errors) errors.push(createCompilerDiagnostic(Diagnostics.Corrupted_locale_file_0, filePath));
          return false;
        }
        return true;
      }
    }
    idText(identifierOrPrivateName: Identifier | PrivateIdentifier): string {
      return syntax.get.unescUnderscores(identifierOrPrivateName.escapedText);
    }
    nameForNamelessJSDocTypedef(declaration: qt.JSDocTypedefTag | qt.JSDocEnumTag): Identifier | PrivateIdentifier | undefined {
      const n = declaration.parent.parent;
      if (!n) return;
      if (Node.is.declaration(n)) return getDeclarationIdentifier(n);
      switch (n.kind) {
        case Syntax.VariableStatement:
          if (n.declarationList && n.declarationList.declarations[0]) {
            return getDeclarationIdentifier(n.declarationList.declarations[0]);
          }
          break;
        case Syntax.ExpressionStatement:
          let expr = n.expression;
          if (expr.kind === Syntax.BinaryExpression && (expr as BinaryExpression).operatorToken.kind === Syntax.EqualsToken) {
            expr = (expr as BinaryExpression).left;
          }
          switch (expr.kind) {
            case Syntax.PropertyAccessExpression:
              return (expr as PropertyAccessExpression).name;
            case Syntax.ElementAccessExpression:
              const arg = (expr as ElementAccessExpression).argumentExpression;
              if (Node.is.kind(Identifier, arg)) return arg;
          }
          break;
        case Syntax.ParenthesizedExpression: {
          return getDeclarationIdentifier(n.expression);
        }
        case Syntax.LabeledStatement: {
          if (Node.is.declaration(n.statement) || Node.is.expression(n.statement)) return getDeclarationIdentifier(n.statement);
          break;
        }
      }
      return;
    }
    getDeclarationIdentifier(n: Declaration | Expression): Identifier | undefined {
      const name = getNameOfDeclaration(n);
      return name && Node.is.kind(Identifier, name) ? name : undefined;
    }
    getNonAssignedNameOfDeclaration(declaration: Declaration | Expression): DeclarationName | undefined {
      switch (declaration.kind) {
        case Syntax.Identifier:
          return declaration as Identifier;
        case Syntax.JSDocPropertyTag:
        case Syntax.JSDocParameterTag: {
          const { name } = declaration as qt.JSDocPropertyLikeTag;
          if (name.kind === Syntax.QualifiedName) {
            return name.right;
          }
          break;
        }
        case Syntax.CallExpression:
        case Syntax.BinaryExpression: {
          const expr = declaration as BinaryExpression | CallExpression;
          switch (getAssignmentDeclarationKind(expr)) {
            case AssignmentDeclarationKind.ExportsProperty:
            case AssignmentDeclarationKind.ThisProperty:
            case AssignmentDeclarationKind.Property:
            case AssignmentDeclarationKind.PrototypeProperty:
              return getElementOrPropertyAccessArgumentExpressionOrName((expr as BinaryExpression).left as AccessExpression);
            case AssignmentDeclarationKind.ObjectDefinePropertyValue:
            case AssignmentDeclarationKind.ObjectDefinePropertyExports:
            case AssignmentDeclarationKind.ObjectDefinePrototypeProperty:
              return (expr as BindableObjectDefinePropertyCall).arguments[1];
            default:
              return;
          }
        }
        case Syntax.JSDocTypedefTag:
          return getJSDoc.nameOfTypedef(declaration as qt.JSDocTypedefTag);
        case Syntax.JSDocEnumTag:
          return nameForNamelessJSDocTypedef(declaration as qt.JSDocEnumTag);
        case Syntax.ExportAssignment: {
          const { expression } = declaration as ExportAssignment;
          return Node.is.kind(Identifier, expression) ? expression : undefined;
        }
        case Syntax.ElementAccessExpression:
          const expr = declaration as ElementAccessExpression;
          if (isBindableStaticElementAccessExpression(expr)) return expr.argumentExpression;
      }
      return (declaration as NamedDeclaration).name;
    }
    getNameOfDeclaration(declaration: Declaration | Expression): DeclarationName | undefined {
      if (declaration === undefined) return;
      return getNonAssignedNameOfDeclaration(declaration) || (Node.is.kind(FunctionExpression, declaration) || Node.is.kind(ClassExpression, declaration) ? get.assignedName(declaration) : undefined);
    }
    getEffectiveTypeParameterDeclarations(n: DeclarationWithTypeParameters): readonly TypeParameterDeclaration[] {
      if (Node.is.kind(JSDocSignature, n)) return empty;
      if (Node.isJSDoc.typeAlias(n)) {
        qb.assert(n.parent.kind === Syntax.JSDocComment);
        return flatMap(n.parent.tags, (tag) => (Node.is.kind(JSDocTemplateTag, tag) ? tag.typeParameters : undefined));
      }
      if (n.typeParameters) return n.typeParameters;
      if (isInJSFile(n)) {
        const decls = this.typeParameterDeclarations(n);
        if (decls.length) return decls;
        const typeTag = getJSDoc.type(n);
        if (typeTag && Node.is.kind(FunctionTypeNode, typeTag) && typeTag.typeParameters) return typeTag.typeParameters;
      }
      return empty;
    }
    getEffectiveConstraintOfTypeParameter(n: TypeParameterDeclaration): TypeNode | undefined {
      return n.constraint ? n.constraint : Node.is.kind(JSDocTemplateTag, n.parent) && n === n.parent.typeParameters[0] ? n.parent.constraint : undefined;
    }
    skipPartiallyEmittedExpressions(n: Expression): Expression;
    skipPartiallyEmittedExpressions(n: Node): Node;
    skipPartiallyEmittedExpressions(n: Node) {
      return skipOuterExpressions(n, OuterExpressionKinds.PartiallyEmittedExpressions);
    }
  })();
  static readonly forEach = new (class {
    forEachAncestor<T>(n: Node, cb: (n: Node) => T | undefined | 'quit'): T | undefined {
      while (n) {
        const r = cb(n);
        if (r === 'quit') return;
        if (r) return r;
        if (Node.is.kind(SourceFile, n)) return;
        n = n.parent;
      }
      return;
    }
    child<T extends Node>(node: Node, cb: (n: Node) => T, cbs?: (ns: Nodes<Node>) => T): T | undefined {
      if (node.kind <= Syntax.LastToken) return;
      const n = node as qt.NodeTypes;
      switch (n.kind) {
        case Syntax.QualifiedName:
          return n.left.visit(cb) || n.right.visit(cb);
        case Syntax.TypeParameter:
          return n.name.visit(cb) || n.constraint?.visit(cb) || n.default?.visit(cb) || n.expression?.visit(cb);
        case Syntax.ShorthandPropertyAssignment:
          return (
            n.decorators?.visit(cb, cbs) ||
            n.modifiers?.visit(cb, cbs) ||
            n.name.visit(cb) ||
            n.questionToken?.visit(cb) ||
            n.exclamationToken?.visit(cb) ||
            n.equalsToken?.visit(cb) ||
            n.objectAssignmentInitializer?.visit(cb)
          );
        case Syntax.SpreadAssignment:
          return n.expression.visit(cb);
        case Syntax.Parameter:
          return (
            n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.dot3Token?.visit(cb) || n.name.visit(cb) || n.questionToken?.visit(cb) || n.type?.visit(cb) || n.initializer?.visit(cb)
          );
        case Syntax.PropertyDeclaration:
          return (
            n.decorators?.visit(cb, cbs) ||
            n.modifiers?.visit(cb, cbs) ||
            n.name.visit(cb) ||
            n.questionToken?.visit(cb) ||
            n.exclamationToken?.visit(cb) ||
            n.type?.visit(cb) ||
            n.initializer?.visit(cb)
          );
        case Syntax.PropertySignature:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.name.visit(cb) || n.questionToken?.visit(cb) || n.type?.visit(cb) || n.initializer?.visit(cb);
        case Syntax.PropertyAssignment:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.name.visit(cb) || n.questionToken?.visit(cb) || n.initializer.visit(cb);
        case Syntax.VariableDeclaration:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.name.visit(cb) || n.exclamationToken?.visit(cb) || n.type?.visit(cb) || n.initializer?.visit(cb);
        case Syntax.BindingElement:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.dot3Token?.visit(cb) || n.propertyName?.visit(cb) || n.name.visit(cb) || n.initializer?.visit(cb);
        case Syntax.FunctionType:
        case Syntax.ConstructorType:
        case Syntax.CallSignature:
        case Syntax.ConstructSignature:
        case Syntax.IndexSignature:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.typeParameters?.visit(cb, cbs) || n.parameters.visit(cb, cbs) || n.type?.visit(cb);
        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
        case Syntax.Constructor:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
        case Syntax.FunctionExpression:
        case Syntax.FunctionDeclaration:
        case Syntax.ArrowFunction:
          return (
            n.decorators?.visit(cb, cbs) ||
            n.modifiers?.visit(cb, cbs) ||
            n.asteriskToken?.visit(cb) ||
            n.name?.visit(cb) ||
            n.questionToken?.visit(cb) ||
            n.exclamationToken.visit(cb) ||
            n.typeParameters?.visit(cb, cbs) ||
            n.parameters.visit(cb, cbs) ||
            n.type?.visit(cb) ||
            (n as ArrowFunction).equalsGreaterThanToken.visit(cb) ||
            n.body.visit(cb)
          );
        case Syntax.TypeReference:
          return n.typeName.visit(cb) || n.typeArguments?.visit(cb, cbs);
        case Syntax.TypePredicate:
          return n.assertsModifier?.visit(cb) || n.parameterName.visit(cb) || n.type?.visit(cb);
        case Syntax.TypeQuery:
          return n.exprName.visit(cb);
        case Syntax.TypeLiteral:
          return n.members.visit(cb, cbs);
        case Syntax.ArrayType:
          return n.elementType.visit(cb);
        case Syntax.TupleType:
          return n.elements.visit(cb, cbs);
        case Syntax.UnionType:
        case Syntax.IntersectionType:
          return n.types.visit(cb, cbs);
        case Syntax.ConditionalType:
          return n.checkType.visit(cb) || n.extendsType.visit(cb) || n.trueType.visit(cb) || n.falseType.visit(cb);
        case Syntax.InferType:
          return n.typeParameter.visit(cb);
        case Syntax.ImportType:
          return n.argument.visit(cb) || n.qualifier?.visit(cb) || n.typeArguments?.visit(cb, cbs);
        case Syntax.ParenthesizedType:
        case Syntax.TypeOperator:
          return n.type.visit(cb);
        case Syntax.IndexedAccessType:
          return n.objectType.visit(cb) || n.indexType.visit(cb);
        case Syntax.MappedType:
          return n.readonlyToken?.visit(cb) || n.typeParameter.visit(cb) || n.questionToken?.visit(cb) || n.type?.visit(cb);
        case Syntax.LiteralType:
          return n.literal.visit(cb);
        case Syntax.NamedTupleMember:
          return n.dot3Token?.visit(cb) || n.name.visit(cb) || n.questionToken?.visit(cb) || n.type.visit(cb);
        case Syntax.ObjectBindingPattern:
        case Syntax.ArrayBindingPattern:
          return n.elements.visit(cb, cbs);
        case Syntax.ArrayLiteralExpression:
          return n.elements.visit(cb, cbs);
        case Syntax.ObjectLiteralExpression:
          return n.properties.visit(cb, cbs);
        case Syntax.PropertyAccessExpression:
          return n.expression.visit(cb) || n.questionDotToken?.visit(cb) || n.name.visit(cb);
        case Syntax.ElementAccessExpression:
          return n.expression.visit(cb) || n.questionDotToken?.visit(cb) || n.argumentExpression.visit(cb);
        case Syntax.CallExpression:
        case Syntax.NewExpression:
          return n.expression.visit(cb) || n.questionDotToken?.visit(cb) || n.typeArguments?.visit(cb, cbs) || n.arguments.visit(cb, cbs);
        case Syntax.TaggedTemplateExpression:
          return n.tag.visit(cb) || n.questionDotToken?.visit(cb) || n.typeArguments?.visit(cb, cbs) || n.template.visit(cb);
        case Syntax.TypeAssertionExpression:
          return n.type.visit(cb) || n.expression.visit(cb);
        case Syntax.ParenthesizedExpression:
          return n.expression.visit(cb);
        case Syntax.DeleteExpression:
          return n.expression.visit(cb);
        case Syntax.TypeOfExpression:
          return n.expression.visit(cb);
        case Syntax.VoidExpression:
          return n.expression.visit(cb);
        case Syntax.PrefixUnaryExpression:
          return n.operand.visit(cb);
        case Syntax.YieldExpression:
          return n.asteriskToken?.visit(cb) || n.expression?.visit(cb);
        case Syntax.AwaitExpression:
          return n.expression.visit(cb);
        case Syntax.PostfixUnaryExpression:
          return n.operand.visit(cb);
        case Syntax.BinaryExpression:
          return n.left.visit(cb) || n.operatorToken.visit(cb) || n.right.visit(cb);
        case Syntax.AsExpression:
          return n.expression.visit(cb) || n.type.visit(cb);
        case Syntax.NonNullExpression:
          return n.expression.visit(cb);
        case Syntax.MetaProperty:
          return n.name.visit(cb);
        case Syntax.ConditionalExpression:
          return n.condition.visit(cb) || n.questionToken.visit(cb) || n.whenTrue.visit(cb) || n.colonToken.visit(cb) || n.whenFalse.visit(cb);
        case Syntax.SpreadElement:
          return n.expression.visit(cb);
        case Syntax.Block:
        case Syntax.ModuleBlock:
          return n.statements.visit(cb, cbs);
        case Syntax.SourceFile:
          return n.statements.visit(cb, cbs) || n.endOfFileToken.visit(cb);
        case Syntax.VariableStatement:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.declarationList.visit(cb);
        case Syntax.VariableDeclarationList:
          return n.declarations.visit(cb, cbs);
        case Syntax.ExpressionStatement:
          return n.expression.visit(cb);
        case Syntax.IfStatement:
          return n.expression.visit(cb) || n.thenStatement.visit(cb) || n.elseStatement?.visit(cb);
        case Syntax.DoStatement:
          return n.statement.visit(cb) || n.expression.visit(cb);
        case Syntax.WhileStatement:
          return n.expression.visit(cb) || n.statement.visit(cb);
        case Syntax.ForStatement:
          return n.initializer?.visit(cb) || n.condition?.visit(cb) || n.incrementor?.visit(cb) || n.statement.visit(cb);
        case Syntax.ForInStatement:
          return n.initializer.visit(cb) || n.expression.visit(cb) || n.statement.visit(cb);
        case Syntax.ForOfStatement:
          return n.awaitModifier?.visit(cb) || n.initializer.visit(cb) || n.expression.visit(cb) || n.statement.visit(cb);
        case Syntax.ContinueStatement:
        case Syntax.BreakStatement:
          return n.label?.visit(cb);
        case Syntax.ReturnStatement:
          return n.expression?.visit(cb);
        case Syntax.WithStatement:
          return n.expression.visit(cb) || n.statement.visit(cb);
        case Syntax.SwitchStatement:
          return n.expression.visit(cb) || n.caseBlock.visit(cb);
        case Syntax.CaseBlock:
          return n.clauses.visit(cb, cbs);
        case Syntax.CaseClause:
          return n.expression.visit(cb) || n.statements.visit(cb, cbs);
        case Syntax.DefaultClause:
          return n.statements.visit(cb, cbs);
        case Syntax.LabeledStatement:
          return n.label.visit(cb) || n.statement.visit(cb);
        case Syntax.ThrowStatement:
          return n.expression?.visit(cb);
        case Syntax.TryStatement:
          return n.tryBlock.visit(cb) || n.catchClause?.visit(cb) || n.finallyBlock?.visit(cb);
        case Syntax.CatchClause:
          return n.variableDeclaration?.visit(cb) || n.block.visit(cb);
        case Syntax.Decorator:
          return n.expression.visit(cb);
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.name?.visit(cb) || n.typeParameters?.visit(cb, cbs) || n.heritageClauses?.visit(cb, cbs) || n.members.visit(cb, cbs);
        case Syntax.InterfaceDeclaration:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.name.visit(cb) || n.typeParameters?.visit(cb, cbs) || n.heritageClauses?.visit(cb, cbs) || n.members.visit(cb, cbs);
        case Syntax.TypeAliasDeclaration:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.name.visit(cb) || n.typeParameters?.visit(cb, cbs) || n.type.visit(cb);
        case Syntax.EnumDeclaration:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.name.visit(cb) || n.members.visit(cb, cbs);
        case Syntax.EnumMember:
          return n.name.visit(cb) || n.initializer?.visit(cb);
        case Syntax.ModuleDeclaration:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.name.visit(cb) || n.body?.visit(cb);
        case Syntax.ImportEqualsDeclaration:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.name.visit(cb) || n.moduleReference.visit(cb);
        case Syntax.ImportDeclaration:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.importClause?.visit(cb) || n.moduleSpecifier.visit(cb);
        case Syntax.ImportClause:
          return n.name?.visit(cb) || n.namedBindings?.visit(cb);
        case Syntax.NamespaceExportDeclaration:
          return n.name.visit(cb);
        case Syntax.NamespaceImport:
          return n.name.visit(cb);
        case Syntax.NamespaceExport:
          return n.name.visit(cb);
        case Syntax.NamedImports:
        case Syntax.NamedExports:
          return n.elements.visit(cb, cbs);
        case Syntax.ExportDeclaration:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.exportClause?.visit(cb) || n.moduleSpecifier?.visit(cb);
        case Syntax.ImportSpecifier:
        case Syntax.ExportSpecifier:
          return n.propertyName?.visit(cb) || n.name.visit(cb);
        case Syntax.ExportAssignment:
          return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.expression.visit(cb);
        case Syntax.TemplateExpression:
          return n.head.visit(cb) || n.templateSpans.visit(cb, cbs);
        case Syntax.TemplateSpan:
          return n.expression.visit(cb) || n.literal.visit(cb);
        case Syntax.ComputedPropertyName:
          return n.expression.visit(cb);
        case Syntax.HeritageClause:
          return n.types.visit(cb, cbs);
        case Syntax.ExpressionWithTypeArguments:
          return n.expression.visit(cb) || n.typeArguments?.visit(cb, cbs);
        case Syntax.ExternalModuleReference:
          return n.expression.visit(cb);
        case Syntax.MissingDeclaration:
          return n.decorators?.visit(cb, cbs);
        case Syntax.CommaListExpression:
          return n.elements.visit(cb, cbs);
        case Syntax.JsxElement:
          return n.openingElement.visit(cb) || n.children.visit(cb, cbs) || n.closingElement.visit(cb);
        case Syntax.JsxFragment:
          return n.openingFragment.visit(cb) || n.children.visit(cb, cbs) || n.closingFragment.visit(cb);
        case Syntax.JsxSelfClosingElement:
        case Syntax.JsxOpeningElement:
          return n.tagName.visit(cb) || n.typeArguments?.visit(cb, cbs) || n.attributes.visit(cb);
        case Syntax.JsxAttributes:
          return n.properties.visit(cb, cbs);
        case Syntax.JsxAttribute:
          return n.name.visit(cb) || n.initializer?.visit(cb);
        case Syntax.JsxSpreadAttribute:
          return n.expression.visit(cb);
        case Syntax.JsxExpression:
          return n.dot3Token?.visit(cb) || n.expression?.visit(cb);
        case Syntax.JsxClosingElement:
          return n.tagName.visit(cb);
        case Syntax.OptionalType:
        case Syntax.RestType:
        case Syntax.JSDocTypeExpression:
        case Syntax.JSDocNonNullableType:
        case Syntax.JSDocNullableType:
        case Syntax.JSDocOptionalType:
        case Syntax.JSDocVariadicType:
          return n.type.visit(cb);
        case Syntax.JSDocFunctionType:
          return n.parameters.visit(cb, cbs) || n.type?.visit(cb);
        case Syntax.JSDocComment:
          return n.tags?.visit(cb, cbs);
        case Syntax.JSDocParameterTag:
        case Syntax.JSDocPropertyTag:
          return n.tagName.visit(cb) || (n.isNameFirst ? n.name.visit(cb) || n.typeExpression?.visit(cb) : n.typeExpression?.visit(cb) || n.name.visit(cb));
        case Syntax.JSDocAuthorTag:
          return n.tagName.visit(cb);
        case Syntax.JSDocImplementsTag:
          return n.tagName.visit(cb) || n.class.visit(cb);
        case Syntax.JSDocAugmentsTag:
          return n.tagName.visit(cb) || n.class.visit(cb);
        case Syntax.JSDocTemplateTag:
          return n.tagName.visit(cb) || n.constraint?.visit(cb) || n.typeParameters?.visit(cb, cbs);
        case Syntax.JSDocTypedefTag:
          return (
            n.tagName.visit(cb) ||
            (n.typeExpression && n.typeExpression!.kind === Syntax.JSDocTypeExpression ? n.typeExpression.visit(cb) || n.fullName?.visit(cb) : n.fullName?.visit(cb) || n.typeExpression?.visit(cb))
          );
        case Syntax.JSDocCallbackTag:
          const n2 = n as qt.JSDocCallbackTag;
          return n2.tagName.visit(cb) || n2.fullName?.visit(cb) || n2.typeExpression?.visit(cb);
        case Syntax.JSDocReturnTag:
        case Syntax.JSDocTypeTag:
        case Syntax.JSDocThisTag:
        case Syntax.JSDocEnumTag:
          const n3 = n as qt.JSDocReturnTag | qt.JSDocTypeTag | qt.JSDocThisTag | qt.JSDocEnumTag;
          return n3.tagName.visit(cb) || n3.typeExpression?.visit(cb);
        case Syntax.JSDocSignature:
          return forEach(n.typeParameters, cb) || forEach(n.parameters, cb) || n.type?.visit(cb);
        case Syntax.JSDocTypeLiteral:
          return forEach(n.jsDocPropertyTags, cb);
        case Syntax.JSDocTag:
        case Syntax.JSDocClassTag:
        case Syntax.JSDocPublicTag:
        case Syntax.JSDocPrivateTag:
        case Syntax.JSDocProtectedTag:
        case Syntax.JSDocReadonlyTag:
          return n.tagName.visit(cb);
        case Syntax.PartiallyEmittedExpression:
          return n.expression.visit(cb);
      }
    }
    childRecursively<T>(root: Node, cb: (n: Node, parent: Node) => T | 'skip' | undefined, cbs?: (ns: Nodes<Node>, parent: Node) => T | 'skip' | undefined): T | undefined {
      const ns: Node[] = [root];
      const children = (n: Node) => {
        const cs: (Node | Nodes<Node>)[] = [];
        const add = (n: Node | Nodes<Node>) => {
          cs.unshift(n);
        };
        this.child(n, add, add);
        return cs;
      };
      const visitAll = (parent: Node, cs: readonly (Node | Nodes<Node>)[]) => {
        for (const c of cs) {
          if (isArray(c)) {
            if (cbs) {
              const r = cbs(c, parent);
              if (r) {
                if (r === 'skip') continue;
                return r;
              }
            }
            for (let i = c.length - 1; i >= 0; i--) {
              const real = c[i];
              const r = cb(real, parent);
              if (r) {
                if (r === 'skip') continue;
                return r;
              }
              ns.push(real);
            }
          } else {
            ns.push(c);
            const r = cb(c, parent);
            if (r) {
              if (r === 'skip') continue;
              return r;
            }
          }
        }
        return;
      };
      while (ns.length) {
        const parent = ns.pop()!;
        const res = visitAll(parent, children(parent));
        if (res) return res;
      }
      return;
    }
  })();
}
export namespace Node {
  function hasJSDocInheritDocTag(node: Node) {
    return getJSDoc.tags(node).some((tag) => tag.tagName.text === 'inheritDoc');
  }
  function getDocComment(declarations: readonly Declaration[] | undefined, checker: TypeChecker | undefined): SymbolDisplayPart[] {
    if (!declarations) return empty;
    let doc = JsDoc.getJsDocCommentsFromDeclarations(declarations);
    if (doc.length === 0 || declarations.some(hasJSDocInheritDocTag)) {
      forEachUnique(declarations, (declaration) => {
        const inheritedDocs = findInheritedJSDocComments(declaration, declaration.symbol.name, checker!);
        if (inheritedDocs) doc = doc.length === 0 ? inheritedDocs.slice() : inheritedDocs.concat(lineBreakPart(), doc);
      });
    }
    return doc;
  }
  function findInheritedJSDocComments(declaration: Declaration, propertyName: string, typeChecker: TypeChecker): readonly SymbolDisplayPart[] | undefined {
    return firstDefined(declaration.parent ? getAllSuperTypeNodes(declaration.parent) : empty, (superTypeNode) => {
      const superType = typeChecker.getTypeAtLocation(superTypeNode);
      const baseProperty = superType && typeChecker.getPropertyOfType(superType, propertyName);
      const inheritedDocs = baseProperty && baseProperty.getDocComment(typeChecker);
      return inheritedDocs && inheritedDocs.length ? inheritedDocs : undefined;
    });
  }
}
//Node.prototype.kind = Node.kind;
let nextAutoGenerateId = 0;
export function idText(n: Identifier | PrivateIdentifier): string {
  return syntax.get.unescUnderscores(n.escapedText);
}
export class Type {
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
export class Signature {
  flags: SignatureFlags;
  checker?: TypeChecker;
  declaration?: SignatureDeclaration | qt.JSDocSignature;
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
  jsDocTags?: qt.JSDocTagInfo[];
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
  getJsDocTags(): qt.JSDocTagInfo[] {
    if (this.jsDocTags === undefined) {
      this.jsDocTags = this.declaration ? JsDoc.getJsDocTagsFromDeclarations([this.declaration]) : [];
    }
    return this.jsDocTags;
  }
  signatureHasRestParameter(s: Signature) {
    return !!(s.flags & SignatureFlags.HasRestParameter);
  }
  signatureHasLiteralTypes(s: Signature) {
    return !!(s.flags & SignatureFlags.HasLiteralTypes);
  }
}
export class SourceFile extends Declaration {
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
  jsDocDiagnostics?: DiagnosticWithLocation[];
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
  jsDocDiagnostics?: DiagnosticWithLocation[] | undefined;
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
  jsDoc?: qt.JSDoc[] | undefined;
  is<S extends Syntax, T extends { kind: S; also?: Syntax[] | undefined }>(t: T): this is qt.NodeType<T['kind']> {
    throw new Error('Method not implemented.');
  }
  getSourceFile(): SourceFile {
    throw new Error('Method not implemented.');
  }
  getStart(s?: qt.SourceFileLike | undefined, includeJsDocComment?: boolean | undefined) {
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
      return updateNode(updated, node);
    }
    return node;
  }
  private computeNamedDeclarations(): QMap<Declaration[]> {
    const r = new MultiMap<Declaration>();
    this.Node.forEach.child(visit);
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
        (isComputedPropertyName(name) && Node.is.kind(PropertyAccessExpression, name.expression) ? name.expression.name.text : Node.is.propertyName(name) ? getNameFromPropertyName(name) : undefined)
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
          if (Node.is.kind(BindingPattern, decl.name)) {
            Node.forEach.child(decl.name, visit);
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
            if (Node.is.kind(NamedExports, exportDeclaration.exportClause)) forEach(exportDeclaration.exportClause.elements, visit);
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
          Node.forEach.child(node, visit);
      }
    }
  }
}
export class SourceMapSourceObj implements SourceMapSource {
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
    return this.lineMap ?? (this.lineMap = syntax.get.lineStarts(this.text));
  }
  lineAndCharOf(pos: number) {
    return syntax.get.lineAndCharOf(this.lineStarts(), pos);
  }
  posOf(line: number, char: number): number;
  posOf(line: number, char: number, edits?: true): number;
  posOf(line: number, char: number, edits?: true): number {
    return syntax.get.posOf(this.lineStarts(), line, char, this.text, edits);
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
      const lower = syntax.get.lineOf(ss, min);
      const upper = syntax.get.lineOf(ss, max, lower);
      return isNegative ? lower - upper : upper - lower;
    }
    const s = this.startPos(x2 as Range, comments);
    return this.linesBetween(x1.end, s);
  }
  linesBetweenEnds(r1: Range, r2: Range) {
    return this.linesBetween(r1.end, r2.end);
  }
  linesToPrevNonWhitespace(pos: number, stop: number, comments = false) {
    const s = syntax.skipTrivia(this.text, pos, false, comments);
    const p = this.prevNonWhitespacePos(s, stop);
    return this.linesBetween(p ?? stop, s);
  }
  linesToNextNonWhitespace(pos: number, stop: number, comments = false) {
    const s = syntax.skipTrivia(this.text, pos, false, comments);
    return this.linesBetween(pos, Math.min(stop, s));
  }
  startPos(r: Range, comments = false) {
    return qb.isSynthesized(r.pos) ? -1 : syntax.skipTrivia(this.text, r.pos, false, comments);
  }
  prevNonWhitespacePos(pos: number, stop = 0) {
    while (pos-- > stop) {
      if (!syntax.is.whiteSpaceLike(this.text.charCodeAt(pos))) return pos;
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
  tags?: qt.JSDocTagInfo[];
  constructor(public flags: SymbolFlags, public escName: __String) {}
  get name() {
    const d = this.valueDeclaration;
    if (d?.isPrivateIdentifierPropertyDeclaration()) return idText(d.name);
    return syntax.get.unescUnderscores(this.escName);
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
  getJsDocTags(): qt.JSDocTagInfo[] {
    if (!this.tags) this.tags = JsDoc.getJsDocTagsFromDeclarations(this.declarations);
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
    return ds && find(ds, (d) => !Node.is.externalModuleAugmentation(d) && !(Node.is.kind(ModuleDeclaration, d) && isGlobalScopeAugmentation(d)));
  }
  setValueDeclaration(d: Declaration) {
    const v = this.valueDeclaration;
    if (
      !v ||
      (!(d.flags & NodeFlags.Ambient && !(v.flags & NodeFlags.Ambient)) && isAssignmentDeclaration(v) && !isAssignmentDeclaration(d)) ||
      (v.kind !== d.kind && Node.is.effectiveModuleDeclaration(v))
    ) {
      this.valueDeclaration = d;
    }
  }
  isFunctionSymbol() {
    if (!this.valueDeclaration) return false;
    const v = this.valueDeclaration;
    return v.kind === Syntax.FunctionDeclaration || (Node.is.kind(VariableDeclaration, v) && v.initializer && Node.is.functionLike(v.initializer));
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
    return this.declarations?.[0] && Node.is.kind(NamespaceExportDeclaration, this.declarations[0]);
  }
  isShorthandAmbientModuleSymbol() {
    return Node.is.shorthandAmbientModule(this.valueDeclaration);
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
      if (t) forEach(t.declarations, addDeclarationDiagnostic(syntax.get.unescUnderscores(id), m));
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
