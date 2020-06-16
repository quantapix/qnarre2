namespace qnr {
  const MAX_SMI_X86 = 0x3fff_ffff;

  export type NodeType<S extends Syntax> = S extends keyof SynMap ? SynMap[S] : never;

  export function asName<T extends Identifier | BindingName | PropertyName | EntityName | ThisTypeNode | undefined>(n: string | T): T | Identifier {
    return isString(n) ? createIdentifier(n) : n;
  }

  export function asExpression<T extends Expression | undefined>(e: string | number | boolean | T): T | StringLiteral | NumericLiteral | BooleanLiteral {
    return typeof e === 'string' ? StringLiteral.create(e) : typeof e === 'number' ? NumericLiteral.create('' + e) : typeof e === 'boolean' ? (e ? createTrue() : createFalse()) : e;
  }

  export function asToken<TKind extends Syntax>(t: TKind | Token<TKind>): Token<TKind> {
    return typeof t === 'number' ? createToken(t) : t;
  }

  export function asEmbeddedStatement<T extends Node>(statement: T): T | EmptyStatement;
  export function asEmbeddedStatement<T extends Node>(statement: T | undefined): T | EmptyStatement | undefined;
  export function asEmbeddedStatement<T extends Node>(statement: T | undefined): T | EmptyStatement | undefined {
    return statement && qn.is.kind(NotEmittedStatement, statement) ? setTextRange(setOriginalNode(createEmptyStatement(), statement), statement) : statement;
  }

  function createMethodCall(object: Expression, methodName: string | Identifier, argumentsList: readonly Expression[]) {
    return createCall(createPropertyAccess(object, asName(methodName)), /*typeArguments*/ undefined, argumentsList);
  }

  function createGlobalMethodCall(globalObjectName: string, methodName: string, argumentsList: readonly Expression[]) {
    return createMethodCall(createIdentifier(globalObjectName), methodName, argumentsList);
  }

  export function createObjectDefinePropertyCall(target: Expression, propertyName: string | Expression, attributes: Expression) {
    return createGlobalMethodCall('Object', 'defineProperty', [target, asExpression(propertyName), attributes]);
  }

  function tryAddPropertyAssignment(ps: Push<PropertyAssignment>, p: string, e?: Expression) {
    if (e) {
      ps.push(createPropertyAssignment(p, e));
      return true;
    }
    return false;
  }

  export function createPropertyDescriptor(attributes: PropertyDescriptorAttributes, singleLine?: boolean) {
    const ps: PropertyAssignment[] = [];
    tryAddPropertyAssignment(ps, 'enumerable', asExpression(attributes.enumerable));
    tryAddPropertyAssignment(ps, 'configurable', asExpression(attributes.configurable));
    let isData = tryAddPropertyAssignment(ps, 'writable', asExpression(attributes.writable));
    isData = tryAddPropertyAssignment(ps, 'value', attributes.value) || isData;
    let isAccessor = tryAddPropertyAssignment(ps, 'get', attributes.get);
    isAccessor = tryAddPropertyAssignment(ps, 'set', attributes.set) || isAccessor;
    assert(!(isData && isAccessor), 'A PropertyDescriptor may not be both an accessor descriptor and a data descriptor.');
    return createObjectLiteral(ps, !singleLine);
  }

  export namespace NodeArray {
    export function create<T extends Node>(es?: T[], hasTrailingComma?: boolean): MutableNodeArray<T>;
    export function create<T extends Node>(es?: readonly T[], hasTrailingComma?: boolean): NodeArray<T>;
    export function create<T extends Node>(es?: readonly T[], hasTrailingComma?: boolean): NodeArray<T> {
      if (!es || es === emptyArray) es = [];
      else if (isNodeArray(es)) return es;
      const a = es as NodeArray<T>;
      a.pos = -1;
      a.end = -1;
      a.hasTrailingComma = hasTrailingComma;
      return a;
    }
    export function from<T extends Node>(a: readonly T[]): NodeArray<T>;
    export function from<T extends Node>(a: readonly T[] | undefined): NodeArray<T> | undefined;
    export function from<T extends Node>(a: readonly T[] | undefined): NodeArray<T> | undefined {
      return a ? create(a) : undefined;
    }
    export function visit<T>(cb: (n: Node) => T, cbs?: (ns: NodeArray<Node>) => T | undefined, ns?: NodeArray<Node>): T | undefined {
      if (ns) {
        if (cbs) return cbs(ns);
        for (const n of ns) {
          const r = cb(n);
          if (r) return r;
        }
      }
      return;
    }
  }

  export namespace qn {
    export function create<T extends Syntax>(k: T, pos: number, end: number, parent?: Node): NodeType<T> {
      const n =
        is.node(k) || k === Syntax.Unknown
          ? new NodeObj(k, pos, end)
          : k === Syntax.SourceFile
          ? new SourceFileObj(Syntax.SourceFile, pos, end)
          : k === Syntax.Identifier
          ? new IdentifierObj(Syntax.Identifier, pos, end)
          : k === Syntax.PrivateIdentifier
          ? new PrivateIdentifierObj(Syntax.PrivateIdentifier, pos, end)
          : new TokenObj<T>(k, pos, end);
      if (parent) {
        n.parent = parent;
        n.flags = parent.flags & NodeFlags.ContextFlags;
      }
      return n as NodeType<T>;
    }

    export function createSynthesized<T extends Syntax>(k: T): NodeType<T> {
      const n = create<T>(k, -1, -1);
      n.flags |= NodeFlags.Synthesized;
      return n;
    }
    export function createTemplateLiteralLike(k: TemplateLiteralToken['kind'], t: string, raw?: string) {
      const n = createSynthesized(k);
      n.text = t;
      if (raw === undefined || t === raw) n.rawText = raw;
      else {
        const r = qs_process(k, raw);
        if (typeof r === 'object') return fail('Invalid raw text');
        assert(t === r, "Expected 'text' to be the normalized version of 'rawText'");
        n.rawText = raw;
      }
      return n;
    }

    export const is = new (class {
      node(k: Syntax) {
        return k >= Syntax.FirstNode;
      }
      isToken(n: Node) {
        return n.kind >= Syntax.FirstToken && n.kind <= Syntax.LastToken;
      }

      kind<S extends Syntax, T extends { kind: S; also?: S[] }>(t: T, n: NodeType<S>): n is NodeType<T['kind']> {
        return n.kind === t.kind || !!t.also?.includes(n.kind);
      }

      isParameterPropertyDeclaration(n: Node, parent: Node): n is ParameterPropertyDeclaration {
        return hasSyntacticModifier(n, ModifierFlags.ParameterPropertyModifier) && parent.kind === Syntax.Constructor;
      }
      isParseTreeNode(n: Node) {
        return (n.flags & NodeFlags.Synthesized) === 0;
      }
      isNodeArray<T extends Node>(array: readonly T[]): array is NodeArray<T> {
        return array.hasOwnProperty('pos') && array.hasOwnProperty('end');
      }

      nodeHasName(n: Node, name: Identifier) {
        if (isNamedDeclaration(n) && qn.is.kind(Identifier, n.name) && idText(n.name as Identifier) === idText(name)) return true;
        if (qn.is.kind(VariableStatement, n) && some(n.declarationList.declarations, (d) => nodeHasName(d, name))) return true;
        return false;
      }
      hasJSDocNodes(n: Node): n is HasJSDoc {
        const { jsDoc } = n as JSDocContainer;
        return !!jsDoc && jsDoc.length > 0;
      }
      hasType(n: Node): n is HasType {
        return !!(n as HasType).type;
      }
      hasInitializer(n: Node): n is HasInitializer {
        return !!(n as HasInitializer).initializer;
      }
      hasOnlyExpressionInitializer(n: Node): n is HasExpressionInitializer {
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
      isNamedDeclaration(n: Node): n is NamedDeclaration & { name: DeclarationName } {
        return !!(n as NamedDeclaration).name;
      }
      isPropertyAccessChain(n: Node): n is PropertyAccessChain {
        return qn.is.kind(PropertyAccessExpression, n) && !!(n.flags & NodeFlags.OptionalChain);
      }
      isElementAccessChain(n: Node): n is ElementAccessChain {
        return qn.is.kind(ElementAccessExpression, n) && !!(n.flags & NodeFlags.OptionalChain);
      }
      isCallChain(n: Node): n is CallChain {
        return qn.is.kind(CallExpression, n) && !!(n.flags & NodeFlags.OptionalChain);
      }
      isOptionalChainRoot(n: Node): n is OptionalChainRoot {
        return isOptionalChain(n) && !qn.is.kind(NonNullExpression, n) && !!n.questionDotToken;
      }
      isExpressionOfOptionalChainRoot(n: Node): n is Expression & { parent: OptionalChainRoot } {
        return isOptionalChainRoot(n.parent) && n.parent.expression === n;
      }
      isNullishCoalesce(n: Node) {
        return n.kind === Syntax.BinaryExpression && (<BinaryExpression>n).operatorToken.kind === Syntax.Question2Token;
      }
      isConstTypeReference(n: Node) {
        return qn.is.kind(TypeReferenceNode, n) && qn.is.kind(Identifier, n.typeName) && n.typeName.escapedText === 'const' && !n.typeArguments;
      }
      isNonNullChain(n: Node): n is NonNullChain {
        return qn.is.kind(NonNullExpression, n) && !!(n.flags & NodeFlags.OptionalChain);
      }
      isUnparsedNode(n: Node): n is UnparsedNode {
        return isUnparsedTextLike(n) || n.kind === Syntax.UnparsedPrologue || n.kind === Syntax.UnparsedSyntheticReference;
      }
      isLiteralExpression(n: Node): n is LiteralExpression {
        return isLiteralKind(n.kind);
      }
      isTemplateLiteralToken(n: Node): n is TemplateLiteralToken {
        return isTemplateLiteralKind(n.kind);
      }
      isImportOrExportSpecifier(n: Node): n is ImportSpecifier | ExportSpecifier {
        return qn.is.kind(ImportSpecifier, n) || qn.is.kind(ExportSpecifier, n);
      }
      isTypeOnlyImportOrExportDeclaration(n: Node): n is TypeOnlyCompatibleAliasDeclaration {
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
      isStringTextContainingNode(n: Node): n is StringLiteral | TemplateLiteralToken {
        return n.kind === Syntax.StringLiteral || isTemplateLiteralKind(n.kind);
      }
      isGeneratedIdentifier(n: Node): n is GeneratedIdentifier {
        return qn.is.kind(Identifier, n) && (n.autoGenerateFlags! & GeneratedIdentifierFlags.KindMask) > GeneratedIdentifierFlags.None;
      }
      isPrivateIdentifierPropertyDeclaration(n: Node): n is PrivateIdentifierPropertyDeclaration {
        return qn.is.kind(PropertyDeclaration, n) && qn.is.kind(PrivateIdentifier, n.name);
      }
      isPrivateIdentifierPropertyAccessExpression(n: Node): n is PrivateIdentifierPropertyAccessExpression {
        return qn.is.kind(PropertyAccessExpression, n) && qn.is.kind(PrivateIdentifier, n.name);
      }
      isModifier(n: Node): n is Modifier {
        return isModifierKind(n.kind);
      }
      isFunctionLike(n: Node): n is SignatureDeclaration {
        return n && isFunctionLikeKind(n.kind);
      }
      isFunctionLikeDeclaration(n: Node): n is FunctionLikeDeclaration {
        return n && isFunctionLikeDeclarationKind(n.kind);
      }
      isFunctionOrModuleBlock(n: Node) {
        return qn.is.kind(SourceFile, n) || qn.is.kind(ModuleBlock, n) || (qn.is.kind(Block, n) && isFunctionLike(n.parent));
      }
      isClassElement(n: Node): n is ClassElement {
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
      isClassLike(n: Node): n is ClassLikeDeclaration {
        return n && (n.kind === Syntax.ClassDeclaration || n.kind === Syntax.ClassExpression);
      }
      isAccessor(n: Node): n is AccessorDeclaration {
        return n && (n.kind === Syntax.GetAccessor || n.kind === Syntax.SetAccessor);
      }
      isMethodOrAccessor(n: Node): n is MethodDeclaration | AccessorDeclaration {
        switch (n.kind) {
          case Syntax.MethodDeclaration:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
            return true;
          default:
            return false;
        }
      }
      isClassOrTypeElement(n: Node): n is ClassElement | TypeElement {
        return isTypeElement(n) || isClassElement(n);
      }
      isObjectLiteralElementLike(n: Node): n is ObjectLiteralElementLike {
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
      isTypeNode(n: Node): n is TypeNode {
        return isTypeNodeKind(n.kind);
      }
      isFunctionOrConstructorTypeNode(n: Node): n is FunctionTypeNode | ConstructorTypeNode {
        switch (n.kind) {
          case Syntax.FunctionType:
          case Syntax.ConstructorType:
            return true;
        }
        return false;
      }
      isCallLikeExpression(n: Node): n is CallLikeExpression {
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
      isLeftHandSideExpression(n: Node): n is LeftHandSideExpression {
        return isLeftHandSideExpressionKind(skipPartiallyEmittedExpressions(n).kind);
      }
      isUnaryExpression(n: Node): n is UnaryExpression {
        return isUnaryExpressionKind(skipPartiallyEmittedExpressions(n).kind);
      }
      isUnaryExpressionWithWrite(n: Node): n is PrefixUnaryExpression | PostfixUnaryExpression {
        switch (n.kind) {
          case Syntax.PostfixUnaryExpression:
            return true;
          case Syntax.PrefixUnaryExpression:
            return (<PrefixUnaryExpression>expr).operator === Syntax.Plus2Token || (<PrefixUnaryExpression>expr).operator === Syntax.Minus2Token;
          default:
            return false;
        }
      }
      isExpression(n: Node): n is Expression {
        return isExpressionKind(skipPartiallyEmittedExpressions(n).kind);
      }
      isNotEmittedOrPartiallyEmittedNode(n: Node): n is NotEmittedStatement | PartiallyEmittedExpression {
        return qn.is.kind(NotEmittedStatement, n) || qn.is.kind(PartiallyEmittedExpression, n);
      }
      isIterationStatement(n: Node, look: false): n is IterationStatement;
      isIterationStatement(n: Node, look: boolean): n is IterationStatement | LabeledStatement;
      isIterationStatement(n: Node, look: boolean): n is IterationStatement {
        switch (n.kind) {
          case Syntax.ForStatement:
          case Syntax.ForInStatement:
          case Syntax.ForOfStatement:
          case Syntax.DoStatement:
          case Syntax.WhileStatement:
            return true;
          case Syntax.LabeledStatement:
            return look && isIterationStatement((<LabeledStatement>n).statement, look);
        }
        return false;
      }
      isScopeMarker(n: Node) {
        return qn.is.kind(ExportAssignment, n) || qn.is.kind(ExportDeclaration, n);
      }
      isConciseBody(n: Node): n is ConciseBody {
        return qn.is.kind(Block, n) || isExpression(n);
      }
      isFunctionBody(n: Node): n is FunctionBody {
        return qn.is.kind(Block, n);
      }
      isForInitializer(n: Node): n is ForInitializer {
        return qn.is.kind(VariableDeclarationList, n) || isExpression(n);
      }
      isDeclaration(n: Node): n is NamedDeclaration {
        if (n.kind === Syntax.TypeParameter) {
          return (n.parent && n.parent.kind !== Syntax.JSDocTemplateTag) || isInJSFile(n);
        }
        return isDeclarationKind(n.kind);
      }
      isDeclarationStatement(n: Node): n is DeclarationStatement {
        return isDeclarationStatementKind(n.kind);
      }
      isStatementButNotDeclaration(n: Node): n is Statement {
        return isStatementKindButNotDeclarationKind(n.kind);
      }
      isStatement(n: Node): n is Statement {
        const k = n.kind;
        return isStatementKindButNotDeclarationKind(k) || isDeclarationStatementKind(k) || isBlockStatement(n);
      }
      isBlockStatement(n: Node): n is Block {
        if (n.kind !== Syntax.Block) return false;
        if (n.parent !== undefined) {
          if (n.parent.kind === Syntax.TryStatement || n.parent.kind === Syntax.CatchClause) return false;
        }
        return !isFunctionBlock(n);
      }
      isJSDocNode(n: Node) {
        return n.kind >= Syntax.FirstJSDocNode && n.kind <= Syntax.LastJSDocNode;
      }
      isJSDocCommentContainingNode(n: Node) {
        return n.kind === Syntax.JSDocComment || n.kind === Syntax.JSDocNamepathType || isJSDocTag(n) || qn.is.kind(JSDocTypeLiteral, n) || qn.is.kind(JSDocSignature, n);
      }
      isJSDocTag(n: Node): n is JSDocTag {
        return n.kind >= Syntax.FirstJSDocTagNode && n.kind <= Syntax.LastJSDocTagNode;
      }

      isIdentifierOrPrivateIdentifier(n: Node): n is Identifier | PrivateIdentifier {
        return n.kind === Syntax.Identifier || n.kind === Syntax.PrivateIdentifier;
      }
      isOptionalChain(n: Node): n is PropertyAccessChain | ElementAccessChain | CallChain | NonNullChain {
        const k = n.kind;
        return (
          !!(n.flags & NodeFlags.OptionalChain) && (k === Syntax.PropertyAccessExpression || k === Syntax.ElementAccessExpression || k === Syntax.CallExpression || k === Syntax.NonNullExpression)
        );
      }
      isBreakOrContinueStatement(n: Node): n is BreakOrContinueStatement {
        return n.kind === Syntax.BreakStatement || n.kind === Syntax.ContinueStatement;
      }
      isNamedExportBindings(n: Node): n is NamedExportBindings {
        return n.kind === Syntax.NamespaceExport || n.kind === Syntax.NamedExports;
      }
      isUnparsedTextLike(n: Node): n is UnparsedTextLike {
        switch (n.kind) {
          case Syntax.UnparsedText:
          case Syntax.UnparsedInternalText:
            return true;
          default:
            return false;
        }
      }
      isJSDocPropertyLikeTag(n: Node): n is JSDocPropertyLikeTag {
        return n.kind === Syntax.JSDocPropertyTag || n.kind === Syntax.JSDocParameterTag;
      }
      isEntityName(n: Node): n is EntityName {
        const k = n.kind;
        return k === Syntax.QualifiedName || k === Syntax.Identifier;
      }
      isPropertyName(n: Node): n is PropertyName {
        const k = n.kind;
        return k === Syntax.Identifier || k === Syntax.PrivateIdentifier || k === Syntax.StringLiteral || k === Syntax.NumericLiteral || k === Syntax.ComputedPropertyName;
      }
      isBindingName(n: Node): n is BindingName {
        const k = n.kind;
        return k === Syntax.Identifier || k === Syntax.ObjectBindingPattern || k === Syntax.ArrayBindingPattern;
      }
      isTypeElement(n: Node): n is TypeElement {
        const k = n.kind;
        return k === Syntax.ConstructSignature || k === Syntax.CallSignature || k === Syntax.PropertySignature || k === Syntax.MethodSignature || k === Syntax.IndexSignature;
      }
      isArrayBindingElement(n: Node): n is ArrayBindingElement {
        const k = n.kind;
        return k === Syntax.BindingElement || k === Syntax.OmittedExpression;
      }
      isPropertyAccessOrQualifiedNameOrImportTypeNode(n: Node): n is PropertyAccessExpression | QualifiedName | ImportTypeNode {
        const k = n.kind;
        return k === Syntax.PropertyAccessExpression || k === Syntax.QualifiedName || k === Syntax.ImportType;
      }
      isPropertyAccessOrQualifiedName(n: Node): n is PropertyAccessExpression | QualifiedName {
        const k = n.kind;
        return k === Syntax.PropertyAccessExpression || k === Syntax.QualifiedName;
      }
      isCallOrNewExpression(n: Node): n is CallExpression | NewExpression {
        return n.kind === Syntax.CallExpression || n.kind === Syntax.NewExpression;
      }
      isTemplateLiteral(n: Node): n is TemplateLiteral {
        const k = n.kind;
        return k === Syntax.TemplateExpression || k === Syntax.NoSubstitutionLiteral;
      }
      isAssertionExpression(n: Node): n is AssertionExpression {
        const k = n.kind;
        return k === Syntax.TypeAssertionExpression || k === Syntax.AsExpression;
      }
      isForInOrOfStatement(n: Node): n is ForInOrOfStatement {
        return n.kind === Syntax.ForInStatement || n.kind === Syntax.ForOfStatement;
      }
      isModuleBody(n: Node): n is ModuleBody {
        const k = n.kind;
        return k === Syntax.ModuleBlock || k === Syntax.ModuleDeclaration || k === Syntax.Identifier;
      }
      isNamespaceBody(n: Node): n is NamespaceBody {
        const k = n.kind;
        return k === Syntax.ModuleBlock || k === Syntax.ModuleDeclaration;
      }
      isJSDocNamespaceBody(n: Node): n is JSDocNamespaceBody {
        const k = n.kind;
        return k === Syntax.Identifier || k === Syntax.ModuleDeclaration;
      }
      isNamedImportBindings(n: Node): n is NamedImportBindings {
        const k = n.kind;
        return k === Syntax.NamedImports || k === Syntax.NamespaceImport;
      }
      isModuleOrEnumDeclaration(n: Node): n is ModuleDeclaration | EnumDeclaration {
        return n.kind === Syntax.ModuleDeclaration || n.kind === Syntax.EnumDeclaration;
      }
      isModuleReference(n: Node): n is ModuleReference {
        const k = n.kind;
        return k === Syntax.ExternalModuleReference || k === Syntax.QualifiedName || k === Syntax.Identifier;
      }
      isJsxTagNameExpression(n: Node): n is JsxTagNameExpression {
        const k = n.kind;
        return k === Syntax.ThisKeyword || k === Syntax.Identifier || k === Syntax.PropertyAccessExpression;
      }
      isJsxChild(n: Node): n is JsxChild {
        const k = n.kind;
        return k === Syntax.JsxElement || k === Syntax.JsxExpression || k === Syntax.JsxSelfClosingElement || k === Syntax.JsxText || k === Syntax.JsxFragment;
      }
      isJsxAttributeLike(n: Node): n is JsxAttributeLike {
        const k = n.kind;
        return k === Syntax.JsxAttribute || k === Syntax.JsxSpreadAttribute;
      }
      isJsxOpeningLikeElement(n: Node): n is JsxOpeningLikeElement {
        const k = n.kind;
        return k === Syntax.JsxOpeningElement || k === Syntax.JsxSelfClosingElement;
      }
      isCaseOrDefaultClause(n: Node): n is CaseOrDefaultClause {
        const k = n.kind;
        return k === Syntax.CaseClause || k === Syntax.DefaultClause;
      }
      isObjectLiteralElement(n: Node): n is ObjectLiteralElement {
        return n.kind === Syntax.JsxAttribute || n.kind === Syntax.JsxSpreadAttribute || isObjectLiteralElementLike(n);
      }
      isTypeReferenceType(n: Node): n is TypeReferenceType {
        return n.kind === Syntax.TypeReference || n.kind === Syntax.ExpressionWithTypeArguments;
      }
    })();

    export const qy = new (class {
      isLiteralKind(k: Syntax) {
        return Syntax.FirstLiteralToken <= k && k <= Syntax.LastLiteralToken;
      }
      isTemplateLiteralKind(k: Syntax) {
        return Syntax.FirstTemplateToken <= k && k <= Syntax.LastTemplateToken;
      }
      isModifierKind(token: Syntax): token is Modifier['kind'] {
        switch (token) {
          case Syntax.AbstractKeyword:
          case Syntax.AsyncKeyword:
          case Syntax.ConstKeyword:
          case Syntax.DeclareKeyword:
          case Syntax.DefaultKeyword:
          case Syntax.ExportKeyword:
          case Syntax.PublicKeyword:
          case Syntax.PrivateKeyword:
          case Syntax.ProtectedKeyword:
          case Syntax.ReadonlyKeyword:
          case Syntax.StaticKeyword:
            return true;
        }
        return false;
      }
      isParameterPropertyModifier(k: Syntax) {
        return !!(modifierToFlag(k) & ModifierFlags.ParameterPropertyModifier);
      }
      isClassMemberModifier(idToken: Syntax) {
        return isParameterPropertyModifier(idToken) || idToken === Syntax.StaticKeyword;
      }
      isFunctionLikeDeclarationKind(k: Syntax) {
        switch (k) {
          case Syntax.FunctionDeclaration:
          case Syntax.MethodDeclaration:
          case Syntax.Constructor:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
          case Syntax.FunctionExpression:
          case Syntax.ArrowFunction:
            return true;
          default:
            return false;
        }
      }
      isFunctionLikeKind(k: Syntax) {
        switch (k) {
          case Syntax.MethodSignature:
          case Syntax.CallSignature:
          case Syntax.JSDocSignature:
          case Syntax.ConstructSignature:
          case Syntax.IndexSignature:
          case Syntax.FunctionType:
          case Syntax.JSDocFunctionType:
          case Syntax.ConstructorType:
            return true;
          default:
            return isFunctionLikeDeclarationKind(k);
        }
      }
      isLeftHandSideExpressionKind(k: Syntax) {
        switch (k) {
          case Syntax.PropertyAccessExpression:
          case Syntax.ElementAccessExpression:
          case Syntax.NewExpression:
          case Syntax.CallExpression:
          case Syntax.JsxElement:
          case Syntax.JsxSelfClosingElement:
          case Syntax.JsxFragment:
          case Syntax.TaggedTemplateExpression:
          case Syntax.ArrayLiteralExpression:
          case Syntax.ParenthesizedExpression:
          case Syntax.ObjectLiteralExpression:
          case Syntax.ClassExpression:
          case Syntax.FunctionExpression:
          case Syntax.Identifier:
          case Syntax.RegexLiteral:
          case Syntax.NumericLiteral:
          case Syntax.BigIntLiteral:
          case Syntax.StringLiteral:
          case Syntax.NoSubstitutionLiteral:
          case Syntax.TemplateExpression:
          case Syntax.FalseKeyword:
          case Syntax.NullKeyword:
          case Syntax.ThisKeyword:
          case Syntax.TrueKeyword:
          case Syntax.SuperKeyword:
          case Syntax.NonNullExpression:
          case Syntax.MetaProperty:
          case Syntax.ImportKeyword:
            return true;
          default:
            return false;
        }
      }
      isUnaryExpressionKind(k: Syntax) {
        switch (k) {
          case Syntax.PrefixUnaryExpression:
          case Syntax.PostfixUnaryExpression:
          case Syntax.DeleteExpression:
          case Syntax.TypeOfExpression:
          case Syntax.VoidExpression:
          case Syntax.AwaitExpression:
          case Syntax.TypeAssertionExpression:
            return true;
          default:
            return isLeftHandSideExpressionKind(k);
        }
      }
      isExpressionKind(k: Syntax) {
        switch (k) {
          case Syntax.ConditionalExpression:
          case Syntax.YieldExpression:
          case Syntax.ArrowFunction:
          case Syntax.BinaryExpression:
          case Syntax.SpreadElement:
          case Syntax.AsExpression:
          case Syntax.OmittedExpression:
          case Syntax.CommaListExpression:
          case Syntax.PartiallyEmittedExpression:
            return true;
          default:
            return isUnaryExpressionKind(k);
        }
      }
      isDeclarationKind(k: Syntax) {
        return (
          k === Syntax.ArrowFunction ||
          k === Syntax.BindingElement ||
          k === Syntax.ClassDeclaration ||
          k === Syntax.ClassExpression ||
          k === Syntax.Constructor ||
          k === Syntax.EnumDeclaration ||
          k === Syntax.EnumMember ||
          k === Syntax.ExportSpecifier ||
          k === Syntax.FunctionDeclaration ||
          k === Syntax.FunctionExpression ||
          k === Syntax.GetAccessor ||
          k === Syntax.ImportClause ||
          k === Syntax.ImportEqualsDeclaration ||
          k === Syntax.ImportSpecifier ||
          k === Syntax.InterfaceDeclaration ||
          k === Syntax.JsxAttribute ||
          k === Syntax.MethodDeclaration ||
          k === Syntax.MethodSignature ||
          k === Syntax.ModuleDeclaration ||
          k === Syntax.NamespaceExportDeclaration ||
          k === Syntax.NamespaceImport ||
          k === Syntax.NamespaceExport ||
          k === Syntax.Parameter ||
          k === Syntax.PropertyAssignment ||
          k === Syntax.PropertyDeclaration ||
          k === Syntax.PropertySignature ||
          k === Syntax.SetAccessor ||
          k === Syntax.ShorthandPropertyAssignment ||
          k === Syntax.TypeAliasDeclaration ||
          k === Syntax.TypeParameter ||
          k === Syntax.VariableDeclaration ||
          k === Syntax.JSDocTypedefTag ||
          k === Syntax.JSDocCallbackTag ||
          k === Syntax.JSDocPropertyTag
        );
      }
      isDeclarationStatementKind(k: Syntax) {
        return (
          k === Syntax.FunctionDeclaration ||
          k === Syntax.MissingDeclaration ||
          k === Syntax.ClassDeclaration ||
          k === Syntax.InterfaceDeclaration ||
          k === Syntax.TypeAliasDeclaration ||
          k === Syntax.EnumDeclaration ||
          k === Syntax.ModuleDeclaration ||
          k === Syntax.ImportDeclaration ||
          k === Syntax.ImportEqualsDeclaration ||
          k === Syntax.ExportDeclaration ||
          k === Syntax.ExportAssignment ||
          k === Syntax.NamespaceExportDeclaration
        );
      }
      isStatementKindButNotDeclarationKind(k: Syntax) {
        return (
          k === Syntax.BreakStatement ||
          k === Syntax.ContinueStatement ||
          k === Syntax.DebuggerStatement ||
          k === Syntax.DoStatement ||
          k === Syntax.ExpressionStatement ||
          k === Syntax.EmptyStatement ||
          k === Syntax.ForInStatement ||
          k === Syntax.ForOfStatement ||
          k === Syntax.ForStatement ||
          k === Syntax.IfStatement ||
          k === Syntax.LabeledStatement ||
          k === Syntax.ReturnStatement ||
          k === Syntax.SwitchStatement ||
          k === Syntax.ThrowStatement ||
          k === Syntax.TryStatement ||
          k === Syntax.VariableStatement ||
          k === Syntax.WhileStatement ||
          k === Syntax.WithStatement ||
          k === Syntax.NotEmittedStatement ||
          k === Syntax.EndOfDeclarationMarker ||
          k === Syntax.MergeDeclarationMarker
        );
      }
    })();

    export const get = new (class {
      getCombinedFlags(n: Node, getFlags: (n: Node) => number): number {
        if (qn.is.kind(BindingElement, n)) n = walkUpBindingElementsAndPatterns(n);
        let flags = getFlags(n);
        if (n.kind === Syntax.VariableDeclaration) n = n.parent;
        if (n && n.kind === Syntax.VariableDeclarationList) {
          flags |= getFlags(n);
          n = n.parent;
        }
        if (n && n.kind === Syntax.VariableStatement) flags |= getFlags(n);
        return flags;
      }
      getCombinedNodeFlags(n: Node): NodeFlags {
        return this.getCombinedFlags(n, (n) => n.flags);
      }
      getOriginalNode(n: Node): Node;
      getOriginalNode<T extends Node>(n: Node, nTest: (n: Node) => n is T): T;
      getOriginalNode(n: Node | undefined): Node | undefined;
      getOriginalNode<T extends Node>(n: Node | undefined, nTest: (n: Node | undefined) => n is T): T | undefined;
      getOriginalNode(n: Node | undefined, nTest?: (n: Node | undefined) => boolean): Node | undefined {
        if (n) {
          while (n.original !== undefined) {
            n = n.original;
          }
        }
        return !nTest || nTest(n) ? n : undefined;
      }
      getParseTreeNode(n: Node): Node;
      getParseTreeNode<T extends Node>(n: Node | undefined, nTest?: (n: Node) => n is T): T | undefined;
      getParseTreeNode(n: Node | undefined, nTest?: (n: Node) => boolean): Node | undefined {
        if (n === undefined || is.isParseTreeNode(n)) return n;
        n = this.getOriginalNode(n);
        if (is.isParseTreeNode(n) && (!nTest || nTest(n))) return n;
        return;
      }
      getAssignedName(n: Node): DeclarationName | undefined {
        if (!n.parent) {
          return;
        } else if (qn.is.kind(PropertyAssignment, n.parent) || qn.is.kind(BindingElement, n.parent)) {
          return n.parent.name;
        } else if (isBinaryExpression(n.parent) && n === n.parent.right) {
          if (qn.is.kind(Identifier, n.parent.left)) {
            return n.parent.left;
          } else if (isAccessExpression(n.parent.left)) {
            return getElementOrPropertyAccessArgumentExpressionOrName(n.parent.left);
          }
        } else if (qn.is.kind(VariableDeclaration, n.parent) && qn.is.kind(Identifier, n.parent.name)) {
          return n.parent.name;
        }
        return;
      }
    })();

    export const getJSDoc = new (class {
      getJSDocAugmentsTag(n: Node): JSDocAugmentsTag | undefined {
        return getFirstJSDocTag(n, isJSDocAugmentsTag);
      }
      getJSDocImplementsTags(n: Node): readonly JSDocImplementsTag[] {
        return getAllJSDocTags(n, isJSDocImplementsTag);
      }
      getJSDocClassTag(n: Node): JSDocClassTag | undefined {
        return getFirstJSDocTag(n, isJSDocClassTag);
      }
      getJSDocPublicTag(n: Node): JSDocPublicTag | undefined {
        return getFirstJSDocTag(n, isJSDocPublicTag);
      }
      getJSDocPublicTagNoCache(n: Node): JSDocPublicTag | undefined {
        return getFirstJSDocTag(n, isJSDocPublicTag, true);
      }
      getJSDocPrivateTag(n: Node): JSDocPrivateTag | undefined {
        return getFirstJSDocTag(n, isJSDocPrivateTag);
      }
      getJSDocPrivateTagNoCache(n: Node): JSDocPrivateTag | undefined {
        return getFirstJSDocTag(n, isJSDocPrivateTag, true);
      }
      getJSDocProtectedTag(n: Node): JSDocProtectedTag | undefined {
        return getFirstJSDocTag(n, isJSDocProtectedTag);
      }
      getJSDocProtectedTagNoCache(n: Node): JSDocProtectedTag | undefined {
        return getFirstJSDocTag(n, isJSDocProtectedTag, true);
      }
      getJSDocReadonlyTag(n: Node): JSDocReadonlyTag | undefined {
        return getFirstJSDocTag(n, isJSDocReadonlyTag);
      }
      getJSDocReadonlyTagNoCache(n: Node): JSDocReadonlyTag | undefined {
        return getFirstJSDocTag(n, isJSDocReadonlyTag, true);
      }
      getJSDocEnumTag(n: Node): JSDocEnumTag | undefined {
        return getFirstJSDocTag(n, isJSDocEnumTag);
      }
      getJSDocThisTag(n: Node): JSDocThisTag | undefined {
        return getFirstJSDocTag(n, isJSDocThisTag);
      }
      getJSDocReturnTag(n: Node): JSDocReturnTag | undefined {
        return getFirstJSDocTag(n, isJSDocReturnTag);
      }
      getJSDocTemplateTag(n: Node): JSDocTemplateTag | undefined {
        return getFirstJSDocTag(n, isJSDocTemplateTag);
      }
      getJSDocTypeTag(n: Node): JSDocTypeTag | undefined {
        const tag = getFirstJSDocTag(n, isJSDocTypeTag);
        if (tag && tag.typeExpression && tag.typeExpression.type) return tag;
        return;
      }
      getJSDocType(n: Node): TypeNode | undefined {
        let tag: JSDocTypeTag | JSDocParameterTag | undefined = getFirstJSDocTag(n, isJSDocTypeTag);
        if (!tag && qn.is.kind(ParameterDeclaration, n)) tag = find(getJSDocParameterTags(n), (tag) => !!tag.typeExpression);
        return tag && tag.typeExpression && tag.typeExpression.type;
      }
      getJSDocReturnType(n: Node): TypeNode | undefined {
        const returnTag = getJSDocReturnTag(n);
        if (returnTag && returnTag.typeExpression) return returnTag.typeExpression.type;
        const typeTag = getJSDocTypeTag(n);
        if (typeTag && typeTag.typeExpression) {
          const type = typeTag.typeExpression.type;
          if (qn.is.kind(TypeLiteralNode, type)) {
            const sig = find(type.members, CallSignatureDeclaration.kind);
            return sig && sig.type;
          }
          if (qn.is.kind(FunctionTypeNode, type) || qn.is.kind(JSDocFunctionType, type)) return type.type;
        }
        return;
      }
      getJSDocTagsWorker(n: Node, noCache?: boolean): readonly JSDocTag[] {
        let tags = (n as JSDocContainer).jsDocCache;
        if (tags === undefined || noCache) {
          const comments = getJSDocCommentsAndTags(n, noCache);
          assert(comments.length < 2 || comments[0] !== comments[1]);
          tags = flatMap(comments, (j) => (qn.is.kind(JSDoc, j) ? j.tags : j));
          if (!noCache) (n as JSDocContainer).jsDocCache = tags;
        }
        return tags;
      }
      getJSDocTags(n: Node): readonly JSDocTag[] {
        return getJSDocTagsWorker(n, false);
      }
      getJSDocTagsNoCache(n: Node): readonly JSDocTag[] {
        return getJSDocTagsWorker(n, true);
      }
      getFirstJSDocTag<T extends JSDocTag>(n: Node, predicate: (tag: JSDocTag) => tag is T, noCache?: boolean): T | undefined {
        return find(getJSDocTagsWorker(n, noCache), predicate);
      }
      getAllJSDocTags<T extends JSDocTag>(n: Node, predicate: (tag: JSDocTag) => tag is T): readonly T[] {
        return getJSDocTags(n).filter(predicate);
      }
      getAllJSDocTagsOfKind(n: Node, kind: Syntax): readonly JSDocTag[] {
        return getJSDocTags(n).filter((doc) => doc.kind === kind);
      }
      getJSDocParameterTagsWorker(param: ParameterDeclaration, noCache?: boolean): readonly JSDocParameterTag[] {
        if (param.name) {
          if (qn.is.kind(Identifier, param.name)) {
            const name = param.name.escapedText;
            return getJSDocTagsWorker(param.parent, noCache).filter(
              (tag): tag is JSDocParameterTag => qn.is.kind(JSDocParameterTag, tag) && qn.is.kind(Identifier, tag.name) && tag.name.escapedText === name
            );
          } else {
            const i = param.parent.parameters.indexOf(param);
            assert(i > -1, "Parameters should always be in their parents' parameter list");
            const paramTags = getJSDocTagsWorker(param.parent, noCache).filter(isJSDocParameterTag);
            if (i < paramTags.length) return [paramTags[i]];
          }
        }
        return emptyArray;
      }
      getJSDocParameterTags(param: ParameterDeclaration): readonly JSDocParameterTag[] {
        return getJSDocParameterTagsWorker(param, false);
      }
      getJSDocParameterTagsNoCache(param: ParameterDeclaration): readonly JSDocParameterTag[] {
        return getJSDocParameterTagsWorker(param, true);
      }
      getJSDocTypeParameterTagsWorker(param: TypeParameterDeclaration, noCache?: boolean): readonly JSDocTemplateTag[] {
        const name = param.name.escapedText;
        return getJSDocTagsWorker(param.parent, noCache).filter((tag): tag is JSDocTemplateTag => qn.is.kind(JSDocTemplateTag, tag) && tag.typeParameters.some((tp) => tp.name.escapedText === name));
      }
      getJSDocTypeParameterTags(param: TypeParameterDeclaration): readonly JSDocTemplateTag[] {
        return getJSDocTypeParameterTagsWorker(param, false);
      }
      getJSDocTypeParameterTagsNoCache(param: TypeParameterDeclaration): readonly JSDocTemplateTag[] {
        return getJSDocTypeParameterTagsWorker(param, true);
      }
      hasJSDocParameterTags(n: FunctionLikeDeclaration | SignatureDeclaration) {
        return !!getFirstJSDocTag(n, isJSDocParameterTag);
      }
      getNameOfJSDocTypedef(declaration: JSDocTypedefTag): Identifier | PrivateIdentifier | undefined {
        return declaration.name || nameForNamelessJSDocTypedef(declaration);
      }
    })();

    export const other = new (class {
      guessIndentation(lines: string[]) {
        let indentation = MAX_SMI_X86;
        for (const line of lines) {
          if (!line.length) continue;
          let i = 0;
          for (; i < line.length && i < indentation; i++) {
            if (!qy_is.whiteSpaceLike(line.charCodeAt(i))) break;
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
        return !isAnyImportOrReExport(s) && !qn.is.kind(ExportAssignment, s) && !hasSyntacticModifier(s, ModifierFlags.Export) && !isAmbientModule(s);
      }
      isExternalModuleIndicator(s: Statement) {
        return isAnyImportOrReExport(s) || qn.is.kind(ExportAssignment, s) || hasSyntacticModifier(s, ModifierFlags.Export);
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
        return (
          !isOptionalChain(n.parent) || // cases 1, 2, and 3
          isOptionalChainRoot(n.parent) || // case 4
          n !== n.parent.expression
        ); // case 5
      }
      isEmptyBindingElement(n: BindingElement) {
        if (qn.is.kind(OmittedExpression, n)) return true;
        return this.isEmptyBindingPattern(n.name);
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
            if (isFunctionLike(current) || isClassLike(current) || current.kind === Syntax.InterfaceDeclaration) {
              return <Declaration>current;
            }
          }
        }
        return;
      }
      walkUpBindingElementsAndPatterns(binding: BindingElement): VariableDeclaration | ParameterDeclaration {
        let n = binding.parent;
        while (qn.is.kind(BindingElement, n.parent)) {
          n = n.parent.parent;
        }
        return n.parent;
      }
      getCombinedModifierFlags(n: Declaration): ModifierFlags {
        return getCombinedFlags(n, getEffectiveModifierFlags);
      }
      validateLocaleAndSetLanguage(
        locale: string,
        sys: {
          getExecutingFilePath(): string;
          resolvePath(path: string): string;
          fileExists(fileName: string): boolean;
          readFile(fileName: string): string | undefined;
        },
        errors?: Push<Diagnostic>
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
          trySetLanguageAndTerritory(language, /*territory*/ undefined, errors);
        }
        setUILocale(locale);
        function trySetLanguageAndTerritory(language: string, territory: string | undefined, errors?: Push<Diagnostic>) {
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
        return qy_get.unescUnderscores(identifierOrPrivateName.escapedText);
      }
      symbolName(s: Symbol): string {
        if (s.valueDeclaration && isPrivateIdentifierPropertyDeclaration(s.valueDeclaration)) return idText(s.valueDeclaration.name);
        return qy_get.unescUnderscores(s.escName);
      }
      nameForNamelessJSDocTypedef(declaration: JSDocTypedefTag | JSDocEnumTag): Identifier | PrivateIdentifier | undefined {
        const n = declaration.parent.parent;
        if (!n) return;
        if (isDeclaration(n)) return getDeclarationIdentifier(n);
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
                if (qn.is.kind(Identifier, arg)) return arg;
            }
            break;
          case Syntax.ParenthesizedExpression: {
            return getDeclarationIdentifier(n.expression);
          }
          case Syntax.LabeledStatement: {
            if (isDeclaration(n.statement) || isExpression(n.statement)) return getDeclarationIdentifier(n.statement);
            break;
          }
        }
        return;
      }
      getDeclarationIdentifier(n: Declaration | Expression): Identifier | undefined {
        const name = getNameOfDeclaration(n);
        return name && qn.is.kind(Identifier, name) ? name : undefined;
      }
      getNonAssignedNameOfDeclaration(declaration: Declaration | Expression): DeclarationName | undefined {
        switch (declaration.kind) {
          case Syntax.Identifier:
            return declaration as Identifier;
          case Syntax.JSDocPropertyTag:
          case Syntax.JSDocParameterTag: {
            const { name } = declaration as JSDocPropertyLikeTag;
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
            return getNameOfJSDocTypedef(declaration as JSDocTypedefTag);
          case Syntax.JSDocEnumTag:
            return nameForNamelessJSDocTypedef(declaration as JSDocEnumTag);
          case Syntax.ExportAssignment: {
            const { expression } = declaration as ExportAssignment;
            return qn.is.kind(Identifier, expression) ? expression : undefined;
          }
          case Syntax.ElementAccessExpression:
            const expr = declaration as ElementAccessExpression;
            if (isBindableStaticElementAccessExpression(expr)) return expr.argumentExpression;
        }
        return (declaration as NamedDeclaration).name;
      }
      getNameOfDeclaration(declaration: Declaration | Expression): DeclarationName | undefined {
        if (declaration === undefined) return;
        return getNonAssignedNameOfDeclaration(declaration) || (qn.is.kind(FunctionExpression, declaration) || qn.is.kind(ClassExpression, declaration) ? getAssignedName(declaration) : undefined);
      }
      getEffectiveTypeParameterDeclarations(n: DeclarationWithTypeParameters): readonly TypeParameterDeclaration[] {
        if (qn.is.kind(JSDocSignature, n)) return emptyArray;
        if (isJSDocTypeAlias(n)) {
          assert(n.parent.kind === Syntax.JSDocComment);
          return flatMap(n.parent.tags, (tag) => (qn.is.kind(JSDocTemplateTag, tag) ? tag.typeParameters : undefined));
        }
        if (n.typeParameters) return n.typeParameters;
        if (isInJSFile(n)) {
          const decls = getJSDocTypeParameterDeclarations(n);
          if (decls.length) return decls;
          const typeTag = getJSDocType(n);
          if (typeTag && qn.is.kind(FunctionTypeNode, typeTag) && typeTag.typeParameters) return typeTag.typeParameters;
        }
        return emptyArray;
      }
      getEffectiveConstraintOfTypeParameter(n: TypeParameterDeclaration): TypeNode | undefined {
        return n.constraint ? n.constraint : qn.is.kind(JSDocTemplateTag, n.parent) && n === n.parent.typeParameters[0] ? n.parent.constraint : undefined;
      }
      skipPartiallyEmittedExpressions(n: Expression): Expression;
      skipPartiallyEmittedExpressions(n: Node): Node;
      skipPartiallyEmittedExpressions(n: Node) {
        return skipOuterExpressions(n, OuterExpressionKinds.PartiallyEmittedExpressions);
      }
    })();

    export const forEach = new (class {
      child<T extends Node>(node: Node, cb: (n: Node) => T, cbs?: (ns: NodeArray<Node>) => T): T | undefined {
        if (node.kind <= Syntax.LastToken) return;
        const n = node as NodeTypes;
        switch (n.kind) {
          case Syntax.QualifiedName:
            return n.left.visit(cb) || n.right.visit(cb);
          case Syntax.TypeParameter:
            return n.name.visit(cb) || n.constraint?.visit(cb) || n.default?.visit(cb) || n.expression?.visit(cb);
          case Syntax.ShorthandPropertyAssignment:
            return (
              NodeArray.visit(cb, cbs, n.decorators) ||
              NodeArray.visit(cb, cbs, n.modifiers) ||
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
              NodeArray.visit(cb, cbs, n.decorators) ||
              NodeArray.visit(cb, cbs, n.modifiers) ||
              n.dot3Token?.visit(cb) ||
              n.name.visit(cb) ||
              n.questionToken?.visit(cb) ||
              n.type?.visit(cb) ||
              n.initializer?.visit(cb)
            );
          case Syntax.PropertyDeclaration:
            return (
              NodeArray.visit(cb, cbs, n.decorators) ||
              NodeArray.visit(cb, cbs, n.modifiers) ||
              n.name.visit(cb) ||
              n.questionToken?.visit(cb) ||
              n.exclamationToken?.visit(cb) ||
              n.type?.visit(cb) ||
              n.initializer?.visit(cb)
            );
          case Syntax.PropertySignature:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.name.visit(cb) || n.questionToken?.visit(cb) || n.type?.visit(cb) || n.initializer?.visit(cb);
          case Syntax.PropertyAssignment:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.name.visit(cb) || n.questionToken?.visit(cb) || n.initializer.visit(cb);
          case Syntax.VariableDeclaration:
            return (
              NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.name.visit(cb) || n.exclamationToken?.visit(cb) || n.type?.visit(cb) || n.initializer?.visit(cb)
            );
          case Syntax.BindingElement:
            return (
              NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.dot3Token?.visit(cb) || n.propertyName?.visit(cb) || n.name.visit(cb) || n.initializer?.visit(cb)
            );
          case Syntax.FunctionType:
          case Syntax.ConstructorType:
          case Syntax.CallSignature:
          case Syntax.ConstructSignature:
          case Syntax.IndexSignature:
            return (
              NodeArray.visit(cb, cbs, n.decorators) ||
              NodeArray.visit(cb, cbs, n.modifiers) ||
              NodeArray.visit(cb, cbs, n.typeParameters) ||
              NodeArray.visit(cb, cbs, n.parameters) ||
              n.type?.visit(cb)
            );
          case Syntax.MethodDeclaration:
          case Syntax.MethodSignature:
          case Syntax.Constructor:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
          case Syntax.FunctionExpression:
          case Syntax.FunctionDeclaration:
          case Syntax.ArrowFunction:
            return (
              NodeArray.visit(cb, cbs, n.decorators) ||
              NodeArray.visit(cb, cbs, n.modifiers) ||
              n.asteriskToken?.visit(cb) ||
              n.name?.visit(cb) ||
              n.questionToken?.visit(cb) ||
              n.exclamationToken.visit(cb) ||
              NodeArray.visit(cb, cbs, n.typeParameters) ||
              NodeArray.visit(cb, cbs, n.parameters) ||
              n.type?.visit(cb) ||
              (n as ArrowFunction).equalsGreaterThanToken.visit(cb) ||
              n.body.visit(cb)
            );
          case Syntax.TypeReference:
            return n.typeName.visit(cb) || NodeArray.visit(cb, cbs, n.typeArguments);
          case Syntax.TypePredicate:
            return n.assertsModifier?.visit(cb) || n.parameterName.visit(cb) || n.type?.visit(cb);
          case Syntax.TypeQuery:
            return n.exprName.visit(cb);
          case Syntax.TypeLiteral:
            return NodeArray.visit(cb, cbs, n.members);
          case Syntax.ArrayType:
            return n.elementType.visit(cb);
          case Syntax.TupleType:
            return NodeArray.visit(cb, cbs, n.elements);
          case Syntax.UnionType:
          case Syntax.IntersectionType:
            return NodeArray.visit(cb, cbs, n.types);
          case Syntax.ConditionalType:
            return n.checkType.visit(cb) || n.extendsType.visit(cb) || n.trueType.visit(cb) || n.falseType.visit(cb);
          case Syntax.InferType:
            return n.typeParameter.visit(cb);
          case Syntax.ImportType:
            return n.argument.visit(cb) || n.qualifier?.visit(cb) || NodeArray.visit(cb, cbs, n.typeArguments);
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
            return NodeArray.visit(cb, cbs, n.elements);
          case Syntax.ArrayLiteralExpression:
            return NodeArray.visit(cb, cbs, n.elements);
          case Syntax.ObjectLiteralExpression:
            return NodeArray.visit(cb, cbs, n.properties);
          case Syntax.PropertyAccessExpression:
            return n.expression.visit(cb) || n.questionDotToken?.visit(cb) || n.name.visit(cb);
          case Syntax.ElementAccessExpression:
            return n.expression.visit(cb) || n.questionDotToken?.visit(cb) || n.argumentExpression.visit(cb);
          case Syntax.CallExpression:
          case Syntax.NewExpression:
            return n.expression.visit(cb) || n.questionDotToken?.visit(cb) || NodeArray.visit(cb, cbs, n.typeArguments) || NodeArray.visit(cb, cbs, n.arguments);
          case Syntax.TaggedTemplateExpression:
            return n.tag.visit(cb) || n.questionDotToken?.visit(cb) || NodeArray.visit(cb, cbs, n.typeArguments) || n.template.visit(cb);
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
            return NodeArray.visit(cb, cbs, n.statements);
          case Syntax.SourceFile:
            return NodeArray.visit(cb, cbs, n.statements) || n.endOfFileToken.visit(cb);
          case Syntax.VariableStatement:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.declarationList.visit(cb);
          case Syntax.VariableDeclarationList:
            return NodeArray.visit(cb, cbs, n.declarations);
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
            return NodeArray.visit(cb, cbs, n.clauses);
          case Syntax.CaseClause:
            return n.expression.visit(cb) || NodeArray.visit(cb, cbs, n.statements);
          case Syntax.DefaultClause:
            return NodeArray.visit(cb, cbs, n.statements);
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
            return (
              NodeArray.visit(cb, cbs, n.decorators) ||
              NodeArray.visit(cb, cbs, n.modifiers) ||
              n.name?.visit(cb) ||
              NodeArray.visit(cb, cbs, n.typeParameters) ||
              NodeArray.visit(cb, cbs, n.heritageClauses) ||
              NodeArray.visit(cb, cbs, n.members)
            );
          case Syntax.InterfaceDeclaration:
            return (
              NodeArray.visit(cb, cbs, n.decorators) ||
              NodeArray.visit(cb, cbs, n.modifiers) ||
              n.name.visit(cb) ||
              NodeArray.visit(cb, cbs, n.typeParameters) ||
              NodeArray.visit(cb, cbs, (n as ClassDeclaration).heritageClauses) ||
              NodeArray.visit(cb, cbs, n.members)
            );
          case Syntax.TypeAliasDeclaration:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.name.visit(cb) || NodeArray.visit(cb, cbs, n.typeParameters) || n.type.visit(cb);
          case Syntax.EnumDeclaration:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.name.visit(cb) || NodeArray.visit(cb, cbs, n.members);
          case Syntax.EnumMember:
            return n.name.visit(cb) || n.initializer?.visit(cb);
          case Syntax.ModuleDeclaration:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.name.visit(cb) || n.body?.visit(cb);
          case Syntax.ImportEqualsDeclaration:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.name.visit(cb) || n.moduleReference.visit(cb);
          case Syntax.ImportDeclaration:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.importClause?.visit(cb) || n.moduleSpecifier.visit(cb);
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
            return NodeArray.visit(cb, cbs, n.elements);
          case Syntax.ExportDeclaration:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.exportClause?.visit(cb) || n.moduleSpecifier?.visit(cb);
          case Syntax.ImportSpecifier:
          case Syntax.ExportSpecifier:
            return n.propertyName?.visit(cb) || n.name.visit(cb);
          case Syntax.ExportAssignment:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.expression.visit(cb);
          case Syntax.TemplateExpression:
            return n.head.visit(cb) || NodeArray.visit(cb, cbs, n.templateSpans);
          case Syntax.TemplateSpan:
            return n.expression.visit(cb) || n.literal.visit(cb);
          case Syntax.ComputedPropertyName:
            return n.expression.visit(cb);
          case Syntax.HeritageClause:
            return NodeArray.visit(cb, cbs, n.types);
          case Syntax.ExpressionWithTypeArguments:
            return n.expression.visit(cb) || NodeArray.visit(cb, cbs, n.typeArguments);
          case Syntax.ExternalModuleReference:
            return n.expression.visit(cb);
          case Syntax.MissingDeclaration:
            return NodeArray.visit(cb, cbs, n.decorators);
          case Syntax.CommaListExpression:
            return NodeArray.visit(cb, cbs, n.elements);
          case Syntax.JsxElement:
            return n.openingElement.visit(cb) || NodeArray.visit(cb, cbs, n.children) || n.closingElement.visit(cb);
          case Syntax.JsxFragment:
            return n.openingFragment.visit(cb) || NodeArray.visit(cb, cbs, n.children) || n.closingFragment.visit(cb);
          case Syntax.JsxSelfClosingElement:
          case Syntax.JsxOpeningElement:
            return n.tagName.visit(cb) || NodeArray.visit(cb, cbs, n.typeArguments) || n.attributes.visit(cb);
          case Syntax.JsxAttributes:
            return NodeArray.visit(cb, cbs, n.properties);
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
            return NodeArray.visit(cb, cbs, n.parameters) || n.type?.visit(cb);
          case Syntax.JSDocComment:
            return NodeArray.visit(cb, cbs, n.tags);
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
            return n.tagName.visit(cb) || n.constraint?.visit(cb) || NodeArray.visit(cb, cbs, n.typeParameters);
          case Syntax.JSDocTypedefTag:
            return (
              n.tagName.visit(cb) ||
              (n.typeExpression && n.typeExpression!.kind === Syntax.JSDocTypeExpression ? n.typeExpression.visit(cb) || n.fullName?.visit(cb) : n.fullName?.visit(cb) || n.typeExpression?.visit(cb))
            );
          case Syntax.JSDocCallbackTag:
            const n2 = n as JSDocCallbackTag;
            return n2.tagName.visit(cb) || n2.fullName?.visit(cb) || n2.typeExpression?.visit(cb);
          case Syntax.JSDocReturnTag:
          case Syntax.JSDocTypeTag:
          case Syntax.JSDocThisTag:
          case Syntax.JSDocEnumTag:
            const n3 = n as JSDocReturnTag | JSDocTypeTag | JSDocThisTag | JSDocEnumTag;
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
      childRecursively<T>(root: Node, cb: (n: Node, parent: Node) => T | 'skip' | undefined, cbs?: (ns: NodeArray<Node>, parent: Node) => T | 'skip' | undefined): T | undefined {
        const ns: Node[] = [root];
        const children = (n: Node) => {
          const cs: (Node | NodeArray<Node>)[] = [];
          const add = (n: Node | NodeArray<Node>) => {
            cs.unshift(n);
          };
          this.child(n, add, add);
          return cs;
        };
        const visitAll = (parent: Node, cs: readonly (Node | NodeArray<Node>)[]) => {
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

    class NodeObj extends TextRange implements Node {
      id = 0;
      flags = NodeFlags.None;
      modifierFlagsCache = ModifierFlags.None;
      transformFlags = TransformFlags.None;
      parent!: Node;
      symbol!: Symbol;
      jsDoc?: JSDoc[];
      original?: Node;
      private _children?: Node[];

      constructor(public kind: Syntax, pos: number, end: number) {
        super(pos, end);
      }
      getSourceFile(): SourceFile {
        return getSourceFileOfNode(this);
      }
      getStart(s?: SourceFileLike, includeJsDocComment?: boolean) {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        return getTokenPosOfNode(this, s, includeJsDocComment);
      }
      getFullStart() {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        return this.pos;
      }
      getEnd() {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        return this.end;
      }
      getWidth(s?: SourceFile) {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        return this.getEnd() - this.getStart(s);
      }
      getFullWidth() {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        return this.end - this.pos;
      }
      getLeadingTriviaWidth(s?: SourceFile) {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        return this.getStart(s) - this.pos;
      }
      getFullText(s?: SourceFile) {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        return (s || this.getSourceFile()).text.substring(this.pos, this.end);
      }
      getText(s?: SourceFile) {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        if (!s) s = this.getSourceFile();
        return s.text.substring(this.getStart(s), this.getEnd());
      }
      getChildCount(s?: SourceFile) {
        return this.getChildren(s).length;
      }
      getChildAt(i: number, s?: SourceFile) {
        return this.getChildren(s)[i];
      }
      getChildren(s?: SourceFileLike) {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        const scanner = qs_getRaw();
        const addSynthetics = (ns: Push<Node>, pos: number, end: number) => {
          scanner.setTextPos(pos);
          while (pos < end) {
            const t = scanner.scan();
            const p = scanner.getTextPos();
            if (p <= end) {
              if (t === Syntax.Identifier) fail(`Did not expect ${Debug.formatSyntax(this.kind)} to have an Identifier in its trivia`);
              ns.push(create(t, pos, p, this));
            }
            pos = p;
            if (t === Syntax.EndOfFileToken) break;
          }
        };
        const createSyntaxList = (ns: NodeArray<Node>) => {
          const list = create(Syntax.SyntaxList, ns.pos, ns.end, this);
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
          if (is.node(this.kind)) {
            if (isJSDocCommentContainingNode(this)) {
              forEach.child(this, (c) => {
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
            const processNodes = (ns: NodeArray<Node>) => {
              addSynthetics(cs, p, ns.pos);
              cs.push(createSyntaxList(ns));
              p = ns.end;
            };
            forEach((this as JSDocContainer).jsDoc, processNode);
            p = this.pos;
            forEach.child(this, processNode, processNodes);
            addSynthetics(cs, p, this.end);
            scanner.setText(undefined);
          }
          return cs;
        };
        return this._children || (this._children = createChildren());
      }
      getFirstToken(s?: SourceFileLike): Node | undefined {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        const cs = this.getChildren(s);
        if (!cs.length) return;
        const c = find(cs, (c) => c.kind < Syntax.FirstJSDocNode || c.kind > Syntax.LastJSDocNode)!;
        return c.kind < Syntax.FirstNode ? c : c.getFirstToken(s);
      }
      getLastToken(s?: SourceFileLike): Node | undefined {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        const cs = this.getChildren(s);
        const c = lastOrUndefined(cs);
        if (!c) return;
        return c.kind < Syntax.FirstNode ? c : c.getLastToken(s);
      }
      visit<T>(cb: (n: Node) => T): T | undefined {
        return cb(this);
      }
    }

    class TokenOrIdentifierObj extends NodeObj {
      getChildren(): Node[] {
        return this.kind === Syntax.EndOfFileToken ? (this as EndOfFileToken).jsDoc || emptyArray : emptyArray;
      }
    }

    export class TokenObj<T extends Syntax> extends TokenOrIdentifierObj implements Token<T> {
      constructor(public kind: T, pos: number, end: number) {
        super(kind, pos, end);
      }
    }

    export class IdentifierObj extends TokenOrIdentifierObj implements Identifier {
      escapedText!: __String;
      autoGenerateFlags!: GeneratedIdentifierFlags;
      _primaryExpressionBrand: any;
      _memberExpressionBrand: any;
      _leftHandSideExpressionBrand: any;
      _updateExpressionBrand: any;
      _unaryExpressionBrand: any;
      _expressionBrand: any;
      _declarationBrand: any;
      typeArguments!: NodeArray<TypeNode>;
      flowNode = undefined;
      constructor(public kind: Syntax.Identifier, pos: number, end: number) {
        super(kind, pos, end);
      }
      get text(): string {
        return idText(this);
      }
    }
    IdentifierObj.prototype.kind = Syntax.Identifier;

    export class PrivateIdentifierObj extends TokenOrIdentifierObj implements PrivateIdentifier {
      escapedText!: __String;
      constructor(public kind: Syntax.PrivateIdentifier, pos: number, end: number) {
        super(kind, pos, end);
      }
      get text(): string {
        return idText(this);
      }
    }
    PrivateIdentifierObj.prototype.kind = Syntax.PrivateIdentifier;

    interface SymbolDisplayPart {}
    interface JSDocTagInfo {}

    export class SymbolObj implements Symbol {
      declarations!: Declaration[];
      valueDeclaration!: Declaration;
      docComment?: SymbolDisplayPart[];
      getComment?: SymbolDisplayPart[];
      setComment?: SymbolDisplayPart[];
      tags?: JSDocTagInfo[];

      constructor(public flags: SymbolFlags, public escName: __String) {}

      get name(): string {
        return symbolName(this);
      }
      getName(): string {
        return this.name;
      }
      getEscName(): __String {
        return this.escName;
      }
      getFlags(): SymbolFlags {
        return this.flags;
      }
      getDeclarations(): Declaration[] | undefined {
        return this.declarations;
      }
      getDocComment(checker: TypeChecker | undefined): SymbolDisplayPart[] {
        if (!this.docComment) {
          this.docComment = emptyArray;
          if (!this.declarations && ((this as Symbol) as TransientSymbol).target && (((this as Symbol) as TransientSymbol).target as TransientSymbol).tupleLabelDeclaration) {
            const labelDecl = (((this as Symbol) as TransientSymbol).target as TransientSymbol).tupleLabelDeclaration!;
            this.docComment = getDocComment([labelDecl], checker);
          } else {
            this.docComment = getDocComment(this.declarations, checker);
          }
        }
        return this.docComment;
      }
      getCtxComment(context: Node | undefined, checker: TypeChecker | undefined): SymbolDisplayPart[] {
        switch (context?.kind) {
          case Syntax.GetAccessor:
            if (!this.getComment) {
              this.getComment = emptyArray;
              this.getComment = getDocComment(filter(this.declarations, isGetAccessor), checker);
            }
            return this.getComment;
          case Syntax.SetAccessor:
            if (!this.setComment) {
              this.setComment = emptyArray;
              this.setComment = getDocComment(filter(this.declarations, isSetAccessor), checker);
            }
            return this.setComment;
          default:
            return this.getDocComment(checker);
        }
      }
      getJsDocTags(): JSDocTagInfo[] {
        if (this.tags === undefined) this.tags = JsDoc.getJsDocTagsFromDeclarations(this.declarations);
        return this.tags;
      }
    }

    export class TypeObj implements Type {
      id!: number;
      symbol!: Symbol;
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
      isNullableType(): boolean {
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

    export class SignatureObj implements Signature {
      declaration!: SignatureDeclaration;
      typeParameters?: TypeParameter[];
      parameters!: Symbol[];
      thisParameter!: Symbol;
      resolvedReturnType!: Type;
      resolvedTypePredicate: TypePredicate | undefined;
      minTypeArgumentCount!: number;
      minArgumentCount!: number;
      docComment?: SymbolDisplayPart[];
      jsDocTags?: JSDocTagInfo[];

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
      getJsDocTags(): JSDocTagInfo[] {
        if (this.jsDocTags === undefined) {
          this.jsDocTags = this.declaration ? JsDoc.getJsDocTagsFromDeclarations([this.declaration]) : [];
        }
        return this.jsDocTags;
      }
    }

    export class SourceFileObj extends NodeObj implements SourceFile {
      kind: Syntax.SourceFile = Syntax.SourceFile;
      _declarationBrand: any;
      fileName!: string;
      path!: Path;
      resolvedPath!: Path;
      originalFileName!: string;
      text!: string;
      scriptSnapshot!: IScriptSnapshot;
      lineMap!: readonly number[];

      statements!: NodeArray<Statement>;
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
      externalModuleIndicator!: Node; // The first node that causes this file to be an external module
      commonJsModuleIndicator!: Node; // The first node that causes this file to be a CommonJS module
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
      errorExpectations: TextRange[] | undefined;
      possiblyContainDynamicImport?: boolean;
      pragmas!: PragmaMap;
      localJsxFactory: EntityName | undefined;
      localJsxNamespace: __String | undefined;

      constructor(kind: Syntax, pos: number, end: number) {
        super(kind, pos, end);
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
        // if the new line is "\r\n", we should return the last non-new-line-character position
        return fullText[lastCharPos] === '\n' && fullText[lastCharPos - 1] === '\r' ? lastCharPos - 1 : lastCharPos;
      }

      getNamedDeclarations(): QMap<Declaration[]> {
        if (!this.namedDeclarations) {
          this.namedDeclarations = this.computeNamedDeclarations();
        }
        return this.namedDeclarations;
      }

      private computeNamedDeclarations(): QMap<Declaration[]> {
        const result = createMultiMap<Declaration>();
        this.qn.forEach.child(visit);
        return result;

        function addDeclaration(declaration: Declaration) {
          const name = getDeclarationName(declaration);
          if (name) {
            result.add(name, declaration);
          }
        }

        function getDeclarations(name: string) {
          let declarations = result.get(name);
          if (!declarations) {
            result.set(name, (declarations = []));
          }
          return declarations;
        }

        function getDeclarationName(declaration: Declaration) {
          const name = getNonAssignedNameOfDeclaration(declaration);
          return (
            name &&
            (isComputedPropertyName(name) && qn.is.kind(PropertyAccessExpression, name.expression) ? name.expression.name.text : isPropertyName(name) ? getNameFromPropertyName(name) : undefined)
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
                const lastDeclaration = lastOrUndefined(declarations);
                if (lastDeclaration && functionDeclaration.parent === lastDeclaration.parent && functionDeclaration.symbol === lastDeclaration.symbol) {
                  if (functionDeclaration.body && !(<FunctionLikeDeclaration>lastDeclaration).body) {
                    declarations[declarations.length - 1] = functionDeclaration;
                  }
                } else {
                  declarations.push(functionDeclaration);
                }
              }
              qn.forEach.child(node, visit);
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
              qn.forEach.child(node, visit);
              break;
            case Syntax.Parameter:
              // Only consider parameter properties
              if (!hasSyntacticModifier(node, ModifierFlags.ParameterPropertyModifier)) {
                break;
              }
            // falls through
            case Syntax.VariableDeclaration:
            case Syntax.BindingElement: {
              const decl = <VariableDeclaration>node;
              if (qn.is.kind(BindingPattern, decl.name)) {
                qn.forEach.child(decl.name, visit);
                break;
              }
              if (decl.initializer) visit(decl.initializer);
            }
            // falls through
            case Syntax.EnumMember:
            case Syntax.PropertyDeclaration:
            case Syntax.PropertySignature:
              addDeclaration(<Declaration>node);
              break;
            case Syntax.ExportDeclaration:
              const exportDeclaration = <ExportDeclaration>node;
              if (exportDeclaration.exportClause) {
                if (qn.is.kind(NamedExports, exportDeclaration.exportClause)) {
                  forEach(exportDeclaration.exportClause.elements, visit);
                } else {
                  visit(exportDeclaration.exportClause.name);
                }
              }
              break;
            case Syntax.ImportDeclaration:
              const importClause = (<ImportDeclaration>node).importClause;
              if (importClause) {
                if (importClause.name) {
                  addDeclaration(importClause.name);
                }
                if (importClause.namedBindings) {
                  if (importClause.namedBindings.kind === Syntax.NamespaceImport) {
                    addDeclaration(importClause.namedBindings);
                  } else {
                    forEach(importClause.namedBindings.elements, visit);
                  }
                }
              }
              break;
            case Syntax.BinaryExpression:
              if (getAssignmentDeclarationKind(node as BinaryExpression) !== AssignmentDeclarationKind.None) {
                addDeclaration(node as BinaryExpression);
              }
            // falls through
            default:
              qn.forEach.child(node, visit);
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

    function hasJSDocInheritDocTag(node: Node) {
      return getJSDocTags(node).some((tag) => tag.tagName.text === 'inheritDoc');
    }

    function getDocComment(declarations: readonly Declaration[] | undefined, checker: TypeChecker | undefined): SymbolDisplayPart[] {
      if (!declarations) return emptyArray;
      let doc = JsDoc.getJsDocCommentsFromDeclarations(declarations);
      if (doc.length === 0 || declarations.some(hasJSDocInheritDocTag)) {
        forEachUnique(declarations, (declaration) => {
          const inheritedDocs = findInheritedJSDocComments(declaration, declaration.symbol.name, checker!); // TODO: GH#18217
          if (inheritedDocs) doc = doc.length === 0 ? inheritedDocs.slice() : inheritedDocs.concat(lineBreakPart(), doc);
        });
      }
      return doc;
    }

    function findInheritedJSDocComments(declaration: Declaration, propertyName: string, typeChecker: TypeChecker): readonly SymbolDisplayPart[] | undefined {
      return firstDefined(declaration.parent ? getAllSuperTypeNodes(declaration.parent) : emptyArray, (superTypeNode) => {
        const superType = typeChecker.getTypeAtLocation(superTypeNode);
        const baseProperty = superType && typeChecker.getPropertyOfType(superType, propertyName);
        const inheritedDocs = baseProperty && baseProperty.getDocComment(typeChecker);
        return inheritedDocs && inheritedDocs.length ? inheritedDocs : undefined;
      });
    }
  }

  type NodeTypes =
    | ArrayLiteralExpression
    | ArrayTypeNode
    | AsExpression
    | AwaitExpression
    | BinaryExpression
    | BindingElement
    | BindingPattern
    | Block
    | BreakOrContinueStatement
    | CallExpression
    | CaseBlock
    | CaseClause
    | CatchClause
    | ClassLikeDeclaration
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
    | FunctionLikeDeclaration
    | HeritageClause
    | IfStatement
    | ImportClause
    | ImportDeclaration
    | ImportEqualsDeclaration
    | ImportOrExportSpecifier
    | ImportTypeNode
    | IndexedAccessTypeNode
    | InferTypeNode
    | InterfaceDeclaration
    | JSDoc
    | JSDocAugmentsTag
    | JSDocAuthorTag
    | JSDocFunctionType
    | JSDocImplementsTag
    | JSDocSignature
    | JSDocTemplateTag
    | JSDocTypedefTag
    | JSDocTypeExpression
    | JSDocTypeLiteral
    | JSDocTypeReferencingNode
    | JsxAttribute
    | JsxAttributes
    | JsxClosingElement
    | JsxElement
    | JsxExpression
    | JsxFragment
    | JsxOpeningLikeElement
    | JsxSpreadAttribute
    | LabeledStatement
    | LiteralTypeNode
    | MappedTypeNode
    | MetaProperty
    | MissingDeclaration
    | ModuleDeclaration
    | NamedImportsOrExports
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
    | SignatureDeclaration
    | SourceFile
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
    | UnionOrIntersectionTypeNode
    | VariableDeclaration
    | VariableDeclarationList
    | VariableStatement
    | VoidExpression
    | WhileStatement
    | WithStatement
    | YieldExpression;

  export namespace ArrayBindingElement {
    export const also = [Syntax.BindingElement, Syntax.OmittedExpression];
  }
  export namespace ArrayLiteralExpression {
    export const kind = Syntax.ArrayLiteralExpression;
  }

  export interface ArrayBindingPattern extends Node {
    kind: Syntax.ArrayBindingPattern;
    parent: VariableDeclaration | ParameterDeclaration | BindingElement;
    elements: NodeArray<ArrayBindingElement>;
  }
  export namespace ArrayBindingPattern {
    export const kind = Syntax.ArrayBindingPattern;
    export function create(es: readonly ArrayBindingElement[]) {
      const n = qn.createSynthesized(Syntax.ArrayBindingPattern);
      n.elements = NodeArray.create(es);
      return n;
    }
    export function update(n: ArrayBindingPattern, es: readonly ArrayBindingElement[]) {
      return n.elements !== es ? updateNode(create(es), n) : n;
    }
  }

  export interface ArrayTypeNode extends TypeNode {
    kind: Syntax.ArrayType;
    elementType: TypeNode;
  }
  export namespace ArrayTypeNode {
    export const kind = Syntax.ArrayType;
    export function create(t: TypeNode) {
      const n = qn.createSynthesized(Syntax.ArrayType);
      n.elementType = parenthesizeArrayTypeMember(t);
      return n;
    }
    export function update(n: ArrayTypeNode, t: TypeNode) {
      return n.elementType !== t ? updateNode(create(t), n) : n;
    }
  }

  export namespace AsExpression {
    export const kind = Syntax.AsExpression;
  }
  export namespace AssignmentPattern {
    export const kind = Syntax.ArrayLiteralExpression;
    export const also = [Syntax.ObjectLiteralExpression];
  }
  export namespace AwaitExpression {
    export const kind = Syntax.AwaitExpression;
  }

  export interface BigIntLiteral extends LiteralExpression {
    kind: Syntax.BigIntLiteral;
  }
  export namespace BigIntLiteral {
    export const kind = Syntax.BigIntLiteral;
    export function create(t: string) {
      const n = qn.createSynthesized(Syntax.BigIntLiteral);
      n.text = t;
      return n;
    }
    export function expression(e: Expression) {
      return (
        e.kind === Syntax.BigIntLiteral ||
        (e.kind === Syntax.PrefixUnaryExpression && (e as PrefixUnaryExpression).operator === Syntax.MinusToken && (e as PrefixUnaryExpression).operand.kind === Syntax.BigIntLiteral)
      );
    }
  }

  export namespace BinaryExpression {
    export const kind = Syntax.BinaryExpression;
  }
  export namespace BindingPattern {
    export const kind = Syntax.ArrayBindingPattern;
    export const also = [Syntax.ObjectBindingPattern];
  }

  export interface BindingElement extends NamedDeclaration {
    kind: Syntax.BindingElement;
    parent: BindingPattern;
    propertyName?: PropertyName;
    dot3Token?: Dot3Token;
    name: BindingName;
    initializer?: Expression;
  }
  export namespace BindingElement {
    export const kind = Syntax.BindingElement;
    export function create(d: Dot3Token | undefined, p: string | PropertyName | undefined, b: string | BindingName, i?: Expression) {
      const n = qn.createSynthesized(Syntax.BindingElement);
      n.dot3Token = d;
      n.propertyName = asName(p);
      n.name = asName(b);
      n.initializer = i;
      return n;
    }
    export function update(n: BindingElement, d: Dot3Token | undefined, p: PropertyName | undefined, b: BindingName, i?: Expression) {
      return n.propertyName !== p || n.dot3Token !== d || n.name !== b || n.initializer !== i ? updateNode(create(d, p, b, i), n) : n;
    }
  }

  export namespace BindingPattern {
    export function isEmptyBindingPattern(n: BindingName): n is BindingPattern {
      if (qn.is.kind(BindingPattern, n)) return every(n.elements, isEmptyBindingElement);
      return false;
    }
  }

  export interface CallSignatureDeclaration extends SignatureDeclarationBase, TypeElement {
    kind: Syntax.CallSignature;
  }
  export namespace CallSignatureDeclaration {
    export const kind = Syntax.CallSignature;
    export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
      return SignatureDeclaration.create(Syntax.CallSignature, ts, ps, t) as CallSignatureDeclaration;
    }
    export function update(n: CallSignatureDeclaration, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t?: TypeNode) {
      return SignatureDeclaration.update(n, ts, ps, t);
    }
  }

  export interface ComputedPropertyName extends Node {
    kind: Syntax.ComputedPropertyName;
    parent: Declaration;
    expression: Expression;
  }
  export namespace ComputedPropertyName {
    export const kind = Syntax.ComputedPropertyName;
    export function create(e: Expression) {
      const n = qn.createSynthesized(Syntax.ComputedPropertyName);
      n.expression = isCommaSequence(e) ? createParen(e) : e;
      return n;
    }
    export function update(n: ComputedPropertyName, e: Expression) {
      return n.expression !== e ? updateNode(create(e), n) : n;
    }
  }

  export interface ConditionalTypeNode extends TypeNode {
    kind: Syntax.ConditionalType;
    checkType: TypeNode;
    extendsType: TypeNode;
    trueType: TypeNode;
    falseType: TypeNode;
  }
  export namespace ConditionalTypeNode {
    export const kind = Syntax.ConditionalType;
    export function create(c: TypeNode, e: TypeNode, t: TypeNode, f: TypeNode) {
      const n = qn.createSynthesized(Syntax.ConditionalType);
      n.checkType = parenthesizeConditionalTypeMember(c);
      n.extendsType = parenthesizeConditionalTypeMember(e);
      n.trueType = t;
      n.falseType = f;
      return n;
    }
    export function update(n: ConditionalTypeNode, c: TypeNode, e: TypeNode, t: TypeNode, f: TypeNode) {
      return n.checkType !== c || n.extendsType !== e || n.trueType !== t || n.falseType !== f ? updateNode(create(c, e, t, f), n) : n;
    }
  }

  export interface ConstructorDeclaration extends FunctionLikeDeclarationBase, ClassElement, JSDocContainer {
    kind: Syntax.Constructor;
    parent: ClassLikeDeclaration;
    body?: FunctionBody;
  }
  export namespace ConstructorDeclaration {
    export const kind = Syntax.Constructor;
    export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], b?: Block) {
      const n = qn.createSynthesized(Syntax.Constructor);
      n.decorators = NodeArray.from(ds);
      n.modifiers = NodeArray.from(ms);
      n.typeParameters = undefined;
      n.parameters = NodeArray.create(ps);
      n.type = undefined;
      n.body = b;
      return n;
    }
    export function update(n: ConstructorDeclaration, ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], b?: Block) {
      return n.decorators !== ds || n.modifiers !== ms || n.parameters !== ps || n.body !== b ? updateNode(create(ds, ms, ps, b), n) : n;
    }
  }

  export interface ConstructorTypeNode extends FunctionOrConstructorTypeNodeBase {
    kind: Syntax.ConstructorType;
  }
  export namespace ConstructorTypeNode {
    export const kind = Syntax.ConstructorType;
    export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
      return SignatureDeclaration.create(Syntax.ConstructorType, ts, ps, t) as ConstructorTypeNode;
    }
    export function update(n: ConstructorTypeNode, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t?: TypeNode) {
      return SignatureDeclaration.update(n, ts, ps, t);
    }
  }

  export interface ConstructSignatureDeclaration extends SignatureDeclarationBase, TypeElement {
    kind: Syntax.ConstructSignature;
  }
  export namespace ConstructSignatureDeclaration {
    export const kind = Syntax.ConstructSignature;
    export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
      return SignatureDeclaration.create(Syntax.ConstructSignature, ts, ps, t) as ConstructSignatureDeclaration;
    }
    export function update(n: ConstructSignatureDeclaration, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t?: TypeNode) {
      return SignatureDeclaration.update(n, ts, ps, t);
    }
  }

  export interface FunctionTypeNode extends FunctionOrConstructorTypeNodeBase {
    kind: Syntax.FunctionType;
  }
  export namespace FunctionTypeNode {
    export const kind = Syntax.FunctionType;
    export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
      return SignatureDeclaration.create(Syntax.FunctionType, ts, ps, t) as FunctionTypeNode;
    }
    export function update(n: FunctionTypeNode, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t?: TypeNode) {
      return SignatureDeclaration.update(n, ts, ps, t);
    }
  }

  export interface GetAccessorDeclaration extends FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
    kind: Syntax.GetAccessor;
    parent: ClassLikeDeclaration | ObjectLiteralExpression;
    name: PropertyName;
    body?: FunctionBody;
  }
  export namespace GetAccessorDeclaration {
    export const kind = Syntax.GetAccessor;
    export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | PropertyName, ps: readonly ParameterDeclaration[], t?: TypeNode, b?: Block) {
      const n = qn.createSynthesized(Syntax.GetAccessor);
      n.decorators = NodeArray.from(ds);
      n.modifiers = NodeArray.from(ms);
      n.name = asName(p);
      n.typeParameters = undefined;
      n.parameters = NodeArray.create(ps);
      n.type = t;
      n.body = b;
      return n;
    }
    export function update(
      n: GetAccessorDeclaration,
      ds: readonly Decorator[] | undefined,
      ms: readonly Modifier[] | undefined,
      p: PropertyName,
      ps: readonly ParameterDeclaration[],
      t?: TypeNode,
      b?: Block
    ) {
      return n.decorators !== ds || n.modifiers !== ms || n.name !== p || n.parameters !== ps || n.type !== t || n.body !== b ? updateNode(create(ds, ms, p, ps, t, b), n) : n;
    }
    export function orSetKind(n: Node): n is AccessorDeclaration {
      return n.kind === Syntax.SetAccessor || n.kind === Syntax.GetAccessor;
    }
  }

  export interface ImportTypeNode extends NodeWithTypeArguments {
    kind: Syntax.ImportType;
    isTypeOf?: boolean;
    argument: TypeNode;
    qualifier?: EntityName;
  }
  export namespace ImportTypeNode {
    export const kind = Syntax.ImportType;
    export function create(a: TypeNode, q?: EntityName, ts?: readonly TypeNode[], tof?: boolean) {
      const n = qn.createSynthesized(Syntax.ImportType);
      n.argument = a;
      n.qualifier = q;
      n.typeArguments = parenthesizeTypeParameters(ts);
      n.isTypeOf = tof;
      return n;
    }
    export function update(n: ImportTypeNode, a: TypeNode, q?: EntityName, ts?: readonly TypeNode[], tof?: boolean) {
      return n.argument !== a || n.qualifier !== q || n.typeArguments !== ts || n.isTypeOf !== tof ? updateNode(create(a, q, ts, tof), n) : n;
    }
  }

  export interface IndexedAccessTypeNode extends TypeNode {
    kind: Syntax.IndexedAccessType;
    objectType: TypeNode;
    indexType: TypeNode;
  }
  export namespace IndexedAccessTypeNode {
    export const kind = Syntax.IndexedAccessType;
    export function create(o: TypeNode, i: TypeNode) {
      const n = qn.createSynthesized(Syntax.IndexedAccessType);
      n.objectType = parenthesizeElementTypeMember(o);
      n.indexType = i;
      return n;
    }
    export function update(n: IndexedAccessTypeNode, o: TypeNode, i: TypeNode) {
      return n.objectType !== o || n.indexType !== i ? updateNode(create(o, i), n) : n;
    }
  }

  export interface IndexSignatureDeclaration extends SignatureDeclarationBase, ClassElement, TypeElement {
    kind: Syntax.IndexSignature;
    parent: ObjectTypeDeclaration;
  }
  export namespace IndexSignatureDeclaration {
    export const kind = Syntax.IndexSignature;
    export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], t: TypeNode): IndexSignatureDeclaration {
      const n = qn.createSynthesized(Syntax.IndexSignature);
      n.decorators = NodeArray.from(ds);
      n.modifiers = NodeArray.from(ms);
      n.parameters = NodeArray.create(ps);
      n.type = t;
      return n;
    }
    export function update(n: IndexSignatureDeclaration, ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], t: TypeNode) {
      return n.parameters !== ps || n.type !== t || n.decorators !== ds || n.modifiers !== ms ? updateNode(create(ds, ms, ps, t), n) : n;
    }
  }

  export interface InferTypeNode extends TypeNode {
    kind: Syntax.InferType;
    typeParameter: TypeParameterDeclaration;
  }
  export namespace InferTypeNode {
    export const kind = Syntax.InferType;
    export function create(p: TypeParameterDeclaration) {
      const n = qn.createSynthesized(Syntax.InferType);
      n.typeParameter = p;
      return n;
    }
    export function update(n: InferTypeNode, p: TypeParameterDeclaration) {
      return n.typeParameter !== p ? updateNode(create(p), n) : n;
    }
  }

  export interface IntersectionTypeNode extends TypeNode {
    kind: Syntax.IntersectionType;
    types: NodeArray<TypeNode>;
  }
  export namespace IntersectionTypeNode {
    export const kind = Syntax.IntersectionType;
    export function create(ts: readonly TypeNode[]) {
      return UnionTypeNode.orIntersectionCreate(Syntax.IntersectionType, ts) as IntersectionTypeNode;
    }
    export function update(n: IntersectionTypeNode, ts: NodeArray<TypeNode>) {
      return UnionTypeNode.orIntersectionUpdate(n, ts);
    }
  }

  export interface JsxText extends LiteralLikeNode {
    kind: Syntax.JsxText;
    onlyTriviaWhitespaces: boolean;
    parent: JsxElement;
  }
  export namespace JsxText {
    export const kind = Syntax.JsxText;
    export function create(t: string, onlyTriviaWhitespaces?: boolean) {
      const n = qn.createSynthesized(Syntax.JsxText);
      n.text = t;
      n.onlyTriviaWhitespaces = !!onlyTriviaWhitespaces;
      return n;
    }
  }

  export interface KeywordTypeNode extends TypeNode {
    kind:
      | Syntax.AnyKeyword
      | Syntax.UnknownKeyword
      | Syntax.NumberKeyword
      | Syntax.BigIntKeyword
      | Syntax.ObjectKeyword
      | Syntax.BooleanKeyword
      | Syntax.StringKeyword
      | Syntax.SymbolKeyword
      | Syntax.ThisKeyword
      | Syntax.VoidKeyword
      | Syntax.UndefinedKeyword
      | Syntax.NullKeyword
      | Syntax.NeverKeyword;
  }
  export namespace KeywordTypeNode {
    export function create(k: KeywordTypeNode['kind']) {
      return qn.createSynthesized(k) as KeywordTypeNode;
    }
  }

  export interface LiteralTypeNode extends TypeNode {
    kind: Syntax.LiteralType;
    literal: BooleanLiteral | LiteralExpression | PrefixUnaryExpression;
  }
  export namespace LiteralTypeNode {
    export const kind = Syntax.LiteralType;
    export function create(l: LiteralTypeNode['literal']) {
      const n = qn.createSynthesized(Syntax.LiteralType);
      n.literal = l;
      return n;
    }
    export function update(n: LiteralTypeNode, l: LiteralTypeNode['literal']) {
      return n.literal !== l ? updateNode(create(l), n) : n;
    }
  }

  export interface MappedTypeNode extends TypeNode, Declaration {
    kind: Syntax.MappedType;
    readonlyToken?: ReadonlyToken | PlusToken | MinusToken;
    typeParameter: TypeParameterDeclaration;
    questionToken?: QuestionToken | PlusToken | MinusToken;
    type?: TypeNode;
  }
  export namespace MappedTypeNode {
    export const kind = Syntax.MappedType;
    export function create(r: ReadonlyToken | PlusToken | MinusToken | undefined, p: TypeParameterDeclaration, q?: QuestionToken | PlusToken | MinusToken, t?: TypeNode) {
      const n = qn.createSynthesized(Syntax.MappedType);
      n.readonlyToken = r;
      n.typeParameter = p;
      n.questionToken = q;
      n.type = t;
      return n;
    }
    export function update(n: MappedTypeNode, r: ReadonlyToken | PlusToken | MinusToken | undefined, p: TypeParameterDeclaration, q?: QuestionToken | PlusToken | MinusToken, t?: TypeNode) {
      return n.readonlyToken !== r || n.typeParameter !== p || n.questionToken !== q || n.type !== t ? updateNode(create(r, p, q, t), n) : n;
    }
  }

  export interface MethodDeclaration extends FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
    kind: Syntax.MethodDeclaration;
    parent: ClassLikeDeclaration | ObjectLiteralExpression;
    name: PropertyName;
    body?: FunctionBody;
  }
  export namespace MethodDeclaration {
    export const kind = Syntax.MethodDeclaration;
    export function create(
      ds: readonly Decorator[] | undefined,
      ms: readonly Modifier[] | undefined,
      a: AsteriskToken | undefined,
      p: string | PropertyName,
      q: QuestionToken | undefined,
      ts: readonly TypeParameterDeclaration[] | undefined,
      ps: readonly ParameterDeclaration[],
      t?: TypeNode,
      b?: Block
    ) {
      const n = qn.createSynthesized(Syntax.MethodDeclaration);
      n.decorators = NodeArray.from(ds);
      n.modifiers = NodeArray.from(ms);
      n.asteriskToken = a;
      n.name = asName(p);
      n.questionToken = q;
      n.typeParameters = NodeArray.from(ts);
      n.parameters = NodeArray.create(ps);
      n.type = t;
      n.body = b;
      return n;
    }
    export function update(
      n: MethodDeclaration,
      ds: readonly Decorator[] | undefined,
      ms: readonly Modifier[] | undefined,
      a: AsteriskToken | undefined,
      p: PropertyName,
      q: QuestionToken | undefined,
      ts: readonly TypeParameterDeclaration[] | undefined,
      ps: readonly ParameterDeclaration[],
      t?: TypeNode,
      b?: Block
    ) {
      return n.decorators !== ds ||
        n.modifiers !== ms ||
        n.asteriskToken !== a ||
        n.name !== p ||
        n.questionToken !== q ||
        n.typeParameters !== ts ||
        n.parameters !== ps ||
        n.type !== t ||
        n.body !== b
        ? updateNode(create(ds, ms, a, p, q, ts, ps, t, b), n)
        : n;
    }
  }

  export interface MethodSignature extends SignatureDeclarationBase, TypeElement {
    kind: Syntax.MethodSignature;
    parent: ObjectTypeDeclaration;
    name: PropertyName;
  }
  export namespace MethodSignature {
    export const kind = Syntax.MethodSignature;
    export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t: TypeNode | undefined, p: string | PropertyName, q?: QuestionToken) {
      const n = SignatureDeclaration.create(Syntax.MethodSignature, ts, ps, t) as MethodSignature;
      n.name = asName(p);
      n.questionToken = q;
      return n;
    }
    export function update(n: MethodSignature, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t: TypeNode | undefined, p: PropertyName, q?: QuestionToken) {
      return n.typeParameters !== ts || n.parameters !== ps || n.type !== t || n.name !== p || n.questionToken !== q ? updateNode(create(ts, ps, t, p, q), n) : n;
    }
  }

  export interface NamedTupleMember extends TypeNode, JSDocContainer, Declaration {
    kind: Syntax.NamedTupleMember;
    dot3Token?: Token<Syntax.Dot3Token>;
    name: Identifier;
    questionToken?: Token<Syntax.QuestionToken>;
    type: TypeNode;
  }
  export namespace NamedTupleMember {
    export const kind = Syntax.NamedTupleMember;
    export function create(d: Token<Syntax.Dot3Token> | undefined, i: Identifier, q: Token<Syntax.QuestionToken> | undefined, t: TypeNode) {
      const n = qn.createSynthesized(Syntax.NamedTupleMember);
      n.dot3Token = d;
      n.name = i;
      n.questionToken = q;
      n.type = t;
      return n;
    }
    export function update(n: NamedTupleMember, d: Token<Syntax.Dot3Token> | undefined, i: Identifier, q: Token<Syntax.QuestionToken> | undefined, t: TypeNode) {
      return n.dot3Token !== d || n.name !== i || n.questionToken !== q || n.type !== t ? updateNode(create(d, i, q, t), n) : n;
    }
  }

  export interface NoSubstitutionLiteral extends LiteralExpression, TemplateLiteralLikeNode, Declaration {
    kind: Syntax.NoSubstitutionLiteral;
    templateFlags?: TokenFlags;
  }
  export namespace NoSubstitutionLiteral {
    export const kind = Syntax.NoSubstitutionLiteral;
    export function create(t: string, raw?: string) {
      return qn.createTemplateLiteralLike(Syntax.NoSubstitutionLiteral, t, raw) as NoSubstitutionLiteral;
    }
  }

  export interface NumericLiteral extends LiteralExpression, Declaration {
    kind: Syntax.NumericLiteral;
    numericLiteralFlags: TokenFlags;
  }
  export namespace NumericLiteral {
    export const kind = Syntax.NumericLiteral;
    export function create(t: string, fs: TokenFlags = TokenFlags.None) {
      const n = qn.createSynthesized(Syntax.NumericLiteral);
      n.text = t;
      n.numericLiteralFlags = fs;
      return n;
    }
    export function name(name: string | __String) {
      return (+name).toString() === name;
    }
  }

  export interface ObjectBindingPattern extends Node {
    kind: Syntax.ObjectBindingPattern;
    parent: VariableDeclaration | ParameterDeclaration | BindingElement;
    elements: NodeArray<BindingElement>;
  }
  export namespace ObjectBindingPattern {
    export const kind = Syntax.ObjectBindingPattern;
    export function create(es: readonly BindingElement[]) {
      const n = qn.createSynthesized(Syntax.ObjectBindingPattern);
      n.elements = NodeArray.create(es);
      return n;
    }
    export function update(n: ObjectBindingPattern, es: readonly BindingElement[]) {
      return n.elements !== es ? updateNode(create(es), n) : n;
    }
  }

  export interface OptionalTypeNode extends TypeNode {
    kind: Syntax.OptionalType;
    type: TypeNode;
  }
  export namespace OptionalTypeNode {
    export const kind = Syntax.OptionalType;
    export function create(t: TypeNode) {
      const n = qn.createSynthesized(Syntax.OptionalType);
      n.type = parenthesizeArrayTypeMember(t);
      return n;
    }
    export function update(n: OptionalTypeNode, t: TypeNode): OptionalTypeNode {
      return n.type !== t ? updateNode(create(t), n) : n;
    }
  }

  export type ParameterPropertyDeclaration = ParameterDeclaration & { parent: ConstructorDeclaration; name: Identifier };

  export interface ParenthesizedTypeNode extends TypeNode {
    kind: Syntax.ParenthesizedType;
    type: TypeNode;
  }
  export namespace ParenthesizedTypeNode {
    export const kind = Syntax.ParenthesizedType;
    export function create(t: TypeNode) {
      const n = qn.createSynthesized(Syntax.ParenthesizedType);
      n.type = t;
      return n;
    }
    export function update(n: ParenthesizedTypeNode, t: TypeNode) {
      return n.type !== t ? updateNode(create(t), n) : n;
    }
  }

  export interface PropertyDeclaration extends ClassElement, JSDocContainer {
    kind: Syntax.PropertyDeclaration;
    parent: ClassLikeDeclaration;
    name: PropertyName;
    questionToken?: QuestionToken;
    exclamationToken?: ExclamationToken;
    type?: TypeNode;
    initializer?: Expression;
  }
  export namespace PropertyDeclaration {
    export const kind = Syntax.PropertyDeclaration;
    export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | PropertyName, q?: QuestionToken | ExclamationToken, t?: TypeNode, i?: Expression) {
      const n = qn.createSynthesized(Syntax.PropertyDeclaration);
      n.decorators = NodeArray.from(ds);
      n.modifiers = NodeArray.from(ms);
      n.name = asName(p);
      n.questionToken = q !== undefined && q.kind === Syntax.QuestionToken ? q : undefined;
      n.exclamationToken = q !== undefined && q.kind === Syntax.ExclamationToken ? q : undefined;
      n.type = t;
      n.initializer = i;
      return n;
    }
    export function update(
      n: PropertyDeclaration,
      ds: readonly Decorator[] | undefined,
      ms: readonly Modifier[] | undefined,
      p: string | PropertyName,
      q?: QuestionToken | ExclamationToken,
      t?: TypeNode,
      i?: Expression
    ) {
      return n.decorators !== ds ||
        n.modifiers !== ms ||
        n.name !== p ||
        n.questionToken !== (q !== undefined && q.kind === Syntax.QuestionToken ? q : undefined) ||
        n.exclamationToken !== (q !== undefined && q.kind === Syntax.ExclamationToken ? q : undefined) ||
        n.type !== t ||
        n.initializer !== i
        ? updateNode(create(ds, ms, p, q, t, i), n)
        : n;
    }
  }

  export interface PropertySignature extends TypeElement, JSDocContainer {
    kind: Syntax.PropertySignature;
    name: PropertyName;
    questionToken?: QuestionToken;
    type?: TypeNode;
    initializer?: Expression;
  }
  export namespace PropertySignature {
    export const kind = Syntax.PropertySignature;
    export function create(ms: readonly Modifier[] | undefined, p: PropertyName | string, q?: QuestionToken, t?: TypeNode, i?: Expression) {
      const n = qn.createSynthesized(Syntax.PropertySignature);
      n.modifiers = NodeArray.from(ms);
      n.name = asName(p);
      n.questionToken = q;
      n.type = t;
      n.initializer = i;
      return n;
    }
    export function update(n: PropertySignature, ms: readonly Modifier[] | undefined, p: PropertyName, q?: QuestionToken, t?: TypeNode, i?: Expression) {
      return n.modifiers !== ms || n.name !== p || n.questionToken !== q || n.type !== t || n.initializer !== i ? updateNode(create(ms, p, q, t, i), n) : n;
    }
  }

  export interface QualifiedName extends Node {
    kind: Syntax.QualifiedName;
    left: EntityName;
    right: Identifier;
    jsdocDotPos?: number;
  }
  export namespace QualifiedName {
    export const kind = Syntax.QualifiedName;
    export function create(left: EntityName, right: string | Identifier) {
      const n = qn.createSynthesized(Syntax.QualifiedName);
      n.left = left;
      n.right = asName(right);
      return n;
    }
    export function update(n: QualifiedName, left: EntityName, right: Identifier) {
      return n.left !== left || n.right !== right ? updateNode(create(left, right), n) : n;
    }
  }

  export interface RegexLiteral extends LiteralExpression {
    kind: Syntax.RegexLiteral;
  }
  export namespace RegexLiteral {
    export const kind = Syntax.RegexLiteral;
    export function create(t: string) {
      const n = qn.createSynthesized(Syntax.RegexLiteral);
      n.text = t;
      return n;
    }
  }

  export interface RestTypeNode extends TypeNode {
    kind: Syntax.RestType;
    type: TypeNode;
  }
  export namespace RestTypeNode {
    export const kind = Syntax.RestType;
    export function create(t: TypeNode) {
      const n = qn.createSynthesized(Syntax.RestType);
      n.type = t;
      return n;
    }
    export function update(n: RestTypeNode, t: TypeNode): RestTypeNode {
      return n.type !== t ? updateNode(create(t), n) : n;
    }
  }

  export interface SetAccessorDeclaration extends FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
    kind: Syntax.SetAccessor;
    parent: ClassLikeDeclaration | ObjectLiteralExpression;
    name: PropertyName;
    body?: FunctionBody;
  }
  export namespace SetAccessorDeclaration {
    export const kind = Syntax.SetAccessor;
    export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | PropertyName, ps: readonly ParameterDeclaration[], b?: Block) {
      const n = qn.createSynthesized(Syntax.SetAccessor);
      n.decorators = NodeArray.from(ds);
      n.modifiers = NodeArray.from(ms);
      n.name = asName(p);
      n.typeParameters = undefined;
      n.parameters = NodeArray.create(ps);
      n.body = b;
      return n;
    }
    export function update(n: SetAccessorDeclaration, ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: PropertyName, ps: readonly ParameterDeclaration[], b?: Block) {
      return n.decorators !== ds || n.modifiers !== ms || n.name !== p || n.parameters !== ps || n.body !== b ? updateNode(create(ds, ms, p, ps, b), n) : n;
    }
  }

  export interface StringLiteral extends LiteralExpression, Declaration {
    kind: Syntax.StringLiteral;
    textSourceNode?: Identifier | StringLiteralLike | NumericLiteral;
    singleQuote?: boolean;
  }
  export namespace StringLiteral {
    export const kind = Syntax.StringLiteral;
    export function create(t: string) {
      const n = qn.createSynthesized(Syntax.StringLiteral);
      n.text = t;
      return n;
    }
    export function like(n: Node): n is StringLiteralLike {
      return n.kind === Syntax.StringLiteral || n.kind === Syntax.NoSubstitutionLiteral;
    }
    export function orNumericLiteralLike(n: Node): n is StringLiteralLike | NumericLiteral {
      return like(n) || qn.is.kind(NumericLiteral, n);
    }
    export function orJsxExpressionKind(n: Node): n is StringLiteral | JsxExpression {
      const k = n.kind;
      return k === Syntax.StringLiteral || k === Syntax.JsxExpression;
    }
    export function orNumberLiteralExpression(e: Expression) {
      return (
        orNumericLiteralLike(e) ||
        (e.kind === Syntax.PrefixUnaryExpression && (e as PrefixUnaryExpression).operator === Syntax.MinusToken && (e as PrefixUnaryExpression).operand.kind === Syntax.NumericLiteral)
      );
    }
  }

  export interface TemplateHead extends TemplateLiteralLikeNode {
    kind: Syntax.TemplateHead;
    parent: TemplateExpression;
    templateFlags?: TokenFlags;
  }
  export namespace TemplateHead {
    export const kind = Syntax.TemplateHead;
    export function create(t: string, raw?: string) {
      return qn.createTemplateLiteralLike(Syntax.TemplateHead, t, raw) as TemplateHead;
    }
  }

  export type TemplateLiteralToken = NoSubstitutionLiteral | TemplateHead | TemplateMiddle | TemplateTail;

  export interface TemplateMiddle extends TemplateLiteralLikeNode {
    kind: Syntax.TemplateMiddle;
    parent: TemplateSpan;
    templateFlags?: TokenFlags;
  }
  export namespace TemplateMiddle {
    export const kind = Syntax.TemplateMiddle;
    export function create(t: string, raw?: string) {
      return qn.createTemplateLiteralLike(Syntax.TemplateMiddle, t, raw) as TemplateMiddle;
    }
    export function orTemplateTailKind(n: Node): n is TemplateMiddle | TemplateTail {
      const k = n.kind;
      return k === Syntax.TemplateMiddle || k === Syntax.TemplateTail;
    }
  }

  export interface TemplateTail extends TemplateLiteralLikeNode {
    kind: Syntax.TemplateTail;
    parent: TemplateSpan;
    templateFlags?: TokenFlags;
  }
  export namespace TemplateTail {
    export const kind = Syntax.TemplateTail;
    export function create(t: string, raw?: string) {
      return qn.createTemplateLiteralLike(Syntax.TemplateTail, t, raw) as TemplateTail;
    }
  }

  export interface ThisTypeNode extends TypeNode {
    kind: Syntax.ThisType;
  }
  export namespace ThisTypeNode {
    export const kind = Syntax.ThisType;
    export function create() {
      return qn.createSynthesized(Syntax.ThisType);
    }
  }

  export interface TupleTypeNode extends TypeNode {
    kind: Syntax.TupleType;
    elements: NodeArray<TypeNode | NamedTupleMember>;
  }
  export namespace TupleTypeNode {
    export const kind = Syntax.TupleType;
    export function create(es: readonly (TypeNode | NamedTupleMember)[]) {
      const n = qn.createSynthesized(Syntax.TupleType);
      n.elements = NodeArray.create(es);
      return n;
    }
    export function update(n: TupleTypeNode, es: readonly (TypeNode | NamedTupleMember)[]) {
      return n.elements !== es ? updateNode(create(es), n) : n;
    }
  }

  export interface TypeLiteralNode extends TypeNode, Declaration {
    kind: Syntax.TypeLiteral;
    members: NodeArray<TypeElement>;
  }
  export namespace TypeLiteralNode {
    export const kind = Syntax.TypeLiteral;
    export function create(ms: readonly TypeElement[] | undefined) {
      const n = qn.createSynthesized(Syntax.TypeLiteral);
      n.members = NodeArray.create(ms);
      return n;
    }
    export function update(n: TypeLiteralNode, ms: NodeArray<TypeElement>) {
      return n.members !== ms ? updateNode(create(ms), n) : n;
    }
  }

  export interface TypeNode extends Node {
    _typeNodeBrand: any;
  }

  export interface TypeOperatorNode extends TypeNode {
    kind: Syntax.TypeOperator;
    operator: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword;
    type: TypeNode;
  }
  export namespace TypeOperatorNode {
    export const kind = Syntax.TypeOperator;
    export function create(t: TypeNode): TypeOperatorNode;
    export function create(o: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword, t: TypeNode): TypeOperatorNode;
    export function create(o: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword | TypeNode, t?: TypeNode) {
      const n = qn.createSynthesized(Syntax.TypeOperator);
      n.operator = typeof o === 'number' ? o : Syntax.KeyOfKeyword;
      n.type = parenthesizeElementTypeMember(typeof o === 'number' ? t! : o);
      return n;
    }
    export function update(n: TypeOperatorNode, t: TypeNode) {
      return n.type !== t ? updateNode(create(n.operator, t), n) : n;
    }
  }

  export interface TypePredicateNode extends TypeNode {
    kind: Syntax.TypePredicate;
    parent: SignatureDeclaration | JSDocTypeExpression;
    assertsModifier?: AssertsToken;
    parameterName: Identifier | ThisTypeNode;
    type?: TypeNode;
  }
  export namespace TypePredicateNode {
    export const kind = Syntax.TypePredicate;
    export function create(p: Identifier | ThisTypeNode | string, t: TypeNode) {
      return createWithModifier(undefined, p, t);
    }
    export function createWithModifier(a: AssertsToken | undefined, p: Identifier | ThisTypeNode | string, t?: TypeNode) {
      const n = qn.createSynthesized(Syntax.TypePredicate);
      n.assertsModifier = a;
      n.parameterName = asName(p);
      n.type = t;
      return n;
    }
    export function update(n: TypePredicateNode, p: Identifier | ThisTypeNode, t: TypeNode) {
      return updateWithModifier(n, n.assertsModifier, p, t);
    }
    export function updateWithModifier(n: TypePredicateNode, a: AssertsToken | undefined, p: Identifier | ThisTypeNode, t?: TypeNode) {
      return n.assertsModifier !== a || n.parameterName !== p || n.type !== t ? updateNode(createWithModifier(a, p, t), n) : n;
    }
  }

  export interface TypeQueryNode extends TypeNode {
    kind: Syntax.TypeQuery;
    exprName: EntityName;
  }
  export namespace TypeQueryNode {
    export const kind = Syntax.TypeQuery;
    export function create(e: EntityName) {
      const n = qn.createSynthesized(Syntax.TypeQuery);
      n.exprName = e;
      return n;
    }
    export function update(n: TypeQueryNode, e: EntityName) {
      return n.exprName !== e ? updateNode(create(e), n) : n;
    }
  }

  export interface TypeReferenceNode extends NodeWithTypeArguments {
    kind: Syntax.TypeReference;
    typeName: EntityName;
  }
  export namespace TypeReferenceNode {
    export const kind = Syntax.TypeReference;
    export function create(t: string | EntityName, ts?: readonly TypeNode[]) {
      const n = qn.createSynthesized(Syntax.TypeReference);
      n.typeName = asName(t);
      n.typeArguments = ts && parenthesizeTypeParameters(ts);
      return n;
    }
    export function update(n: TypeReferenceNode, t: EntityName, ts?: NodeArray<TypeNode>) {
      return n.typeName !== t || n.typeArguments !== ts ? updateNode(create(t, ts), n) : n;
    }
  }

  export interface UnionTypeNode extends TypeNode {
    kind: Syntax.UnionType;
    types: NodeArray<TypeNode>;
  }
  export namespace UnionTypeNode {
    export const kind = Syntax.UnionType;
    export function create(ts: readonly TypeNode[]) {
      return orIntersectionCreate(Syntax.UnionType, ts) as UnionTypeNode;
    }
    export function orIntersectionCreate(k: Syntax.UnionType | Syntax.IntersectionType, ts: readonly TypeNode[]) {
      const n = qn.createSynthesized(k);
      n.types = parenthesizeElementTypeMembers(ts);
      return n;
    }
    export function update(n: UnionTypeNode, ts: NodeArray<TypeNode>) {
      return orIntersectionUpdate(n, ts);
    }
    export function orIntersectionUpdate<T extends UnionOrIntersectionTypeNode>(n: T, ts: NodeArray<TypeNode>): T {
      return n.types !== ts ? updateNode(orIntersectionCreate(n.kind, ts) as T, n) : n;
    }
  }

  export namespace SignatureDeclaration {
    export function create(k: Syntax, ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode, ta?: readonly TypeNode[]) {
      const n = qn.createSynthesized(k);
      n.typeParameters = NodeArray.from(ts);
      n.parameters = NodeArray.from(ps);
      n.type = t;
      n.typeArguments = NodeArray.from(ta);
      return n;
    }
    export function update<T extends SignatureDeclaration>(n: T, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t?: TypeNode): T {
      return n.typeParameters !== ts || n.parameters !== ps || n.type !== t ? updateNode(create(n.kind, ts, ps, t) as T, n) : n;
    }
  }

  export namespace Identifier {
    export const kind = Syntax.Identifier;
  }
  export namespace PrivateIdentifier {
    export const kind = Syntax.PrivateIdentifier;
  }
  export namespace TypeParameterDeclaration {
    export const kind = Syntax.TypeParameter;
  }
  export namespace ParameterDeclaration {
    export const kind = Syntax.Parameter;
  }
  export namespace Decorator {
    export const kind = Syntax.Decorator;
  }
  export namespace ObjectLiteralExpression {
    export const kind = Syntax.ObjectLiteralExpression;
  }
  export namespace PropertyAccessExpression {
    export const kind = Syntax.PropertyAccessExpression;
  }
  export namespace ElementAccessExpression {
    export const kind = Syntax.ElementAccessExpression;
  }
  export namespace CallExpression {
    export const kind = Syntax.CallExpression;
  }
  export namespace NewExpression {
    export const kind = Syntax.NewExpression;
  }
  export namespace TaggedTemplateExpression {
    export const kind = Syntax.TaggedTemplateExpression;
  }
  export namespace TypeAssertion {
    export const kind = Syntax.TypeAssertionExpression;
  }
  export namespace ParenthesizedExpression {
    export const kind = Syntax.ParenthesizedExpression;
  }
  export namespace FunctionExpression {
    export const kind = Syntax.FunctionExpression;
  }
  export namespace ArrowFunction {
    export const kind = Syntax.ArrowFunction;
  }
  export namespace DeleteExpression {
    export const kind = Syntax.DeleteExpression;
  }
  export namespace TypeOfExpression {
    export const kind = Syntax.TypeOfExpression;
  }
  export namespace VoidExpression {
    export const kind = Syntax.VoidExpression;
  }
  export namespace PrefixUnaryExpression {
    export const kind = Syntax.PrefixUnaryExpression;
  }
  export namespace PostfixUnaryExpression {
    export const kind = Syntax.PostfixUnaryExpression;
  }
  export namespace ConditionalExpression {
    export const kind = Syntax.ConditionalExpression;
  }
  export namespace TemplateExpression {
    export const kind = Syntax.TemplateExpression;
  }
  export namespace YieldExpression {
    export const kind = Syntax.YieldExpression;
  }
  export namespace SpreadElement {
    export const kind = Syntax.SpreadElement;
  }
  export namespace ClassExpression {
    export const kind = Syntax.ClassExpression;
  }
  export namespace OmittedExpression {
    export const kind = Syntax.OmittedExpression;
  }
  export namespace ExpressionWithTypeArguments {
    export const kind = Syntax.ExpressionWithTypeArguments;
  }
  export namespace NonNullExpression {
    export const kind = Syntax.NonNullExpression;
  }
  export namespace MetaProperty {
    export const kind = Syntax.MetaProperty;
  }
  export namespace TemplateSpan {
    export const kind = Syntax.TemplateSpan;
  }
  export namespace SemicolonClassElement {
    export const kind = Syntax.SemicolonClassElement;
  }
  export namespace Block {
    export const kind = Syntax.Block;
  }
  export namespace VariableStatement {
    export const kind = Syntax.VariableStatement;
  }
  export namespace EmptyStatement {
    export const kind = Syntax.EmptyStatement;
  }
  export namespace ExpressionStatement {
    export const kind = Syntax.ExpressionStatement;
  }
  export namespace IfStatement {
    export const kind = Syntax.IfStatement;
  }
  export namespace DoStatement {
    export const kind = Syntax.DoStatement;
  }
  export namespace WhileStatement {
    export const kind = Syntax.WhileStatement;
  }
  export namespace ForStatement {
    export const kind = Syntax.ForStatement;
  }
  export namespace ForInStatement {
    export const kind = Syntax.ForInStatement;
  }
  export namespace ForOfStatement {
    export const kind = Syntax.ForOfStatement;
  }
  export namespace ContinueStatement {
    export const kind = Syntax.ContinueStatement;
  }
  export namespace BreakStatement {
    export const kind = Syntax.BreakStatement;
  }
  export namespace ReturnStatement {
    export const kind = Syntax.ReturnStatement;
  }
  export namespace WithStatement {
    export const kind = Syntax.WithStatement;
  }
  export namespace SwitchStatement {
    export const kind = Syntax.SwitchStatement;
  }
  export namespace LabeledStatement {
    export const kind = Syntax.LabeledStatement;
  }
  export namespace ThrowStatement {
    export const kind = Syntax.ThrowStatement;
  }
  export namespace TryStatement {
    export const kind = Syntax.TryStatement;
  }
  export namespace DebuggerStatement {
    export const kind = Syntax.DebuggerStatement;
  }
  export namespace VariableDeclaration {
    export const kind = Syntax.VariableDeclaration;
  }
  export namespace VariableDeclarationList {
    export const kind = Syntax.VariableDeclarationList;
  }
  export namespace FunctionDeclaration {
    export const kind = Syntax.FunctionDeclaration;
  }
  export namespace ClassDeclaration {
    export const kind = Syntax.ClassDeclaration;
  }
  export namespace InterfaceDeclaration {
    export const kind = Syntax.InterfaceDeclaration;
  }
  export namespace TypeAliasDeclaration {
    export const kind = Syntax.TypeAliasDeclaration;
  }
  export namespace EnumDeclaration {
    export const kind = Syntax.EnumDeclaration;
  }
  export namespace ModuleDeclaration {
    export const kind = Syntax.ModuleDeclaration;
  }
  export namespace ModuleBlock {
    export const kind = Syntax.ModuleBlock;
  }
  export namespace CaseBlock {
    export const kind = Syntax.CaseBlock;
  }
  export namespace NamespaceExportDeclaration {
    export const kind = Syntax.NamespaceExportDeclaration;
  }
  export namespace ImportEqualsDeclaration {
    export const kind = Syntax.ImportEqualsDeclaration;
  }
  export namespace ImportDeclaration {
    export const kind = Syntax.ImportDeclaration;
  }
  export namespace ImportClause {
    export const kind = Syntax.ImportClause;
  }
  export namespace NamespaceImport {
    export const kind = Syntax.NamespaceImport;
  }
  export namespace NamespaceExport {
    export const kind = Syntax.NamespaceExport;
  }
  export namespace NamedImports {
    export const kind = Syntax.NamedImports;
  }
  export namespace ImportSpecifier {
    export const kind = Syntax.ImportSpecifier;
  }
  export namespace ExportAssignment {
    export const kind = Syntax.ExportAssignment;
  }
  export namespace ExportDeclaration {
    export const kind = Syntax.ExportDeclaration;
  }
  export namespace NamedExports {
    export const kind = Syntax.NamedExports;
  }
  export namespace ExportSpecifier {
    export const kind = Syntax.ExportSpecifier;
  }
  export namespace MissingDeclaration {
    export const kind = Syntax.MissingDeclaration;
  }
  export namespace ExternalModuleReference {
    export const kind = Syntax.ExternalModuleReference;
  }
  export namespace JsxElement {
    export const kind = Syntax.JsxElement;
  }
  export namespace JsxSelfClosingElement {
    export const kind = Syntax.JsxSelfClosingElement;
  }
  export namespace JsxOpeningElement {
    export const kind = Syntax.JsxOpeningElement;
  }
  export namespace JsxClosingElement {
    export const kind = Syntax.JsxClosingElement;
  }
  export namespace JsxFragment {
    export const kind = Syntax.JsxFragment;
  }
  export namespace JsxOpeningFragment {
    export const kind = Syntax.JsxOpeningFragment;
  }
  export namespace JsxClosingFragment {
    export const kind = Syntax.JsxClosingFragment;
  }
  export namespace JsxAttribute {
    export const kind = Syntax.JsxAttribute;
  }
  export namespace JsxAttributes {
    export const kind = Syntax.JsxAttributes;
  }
  export namespace JsxSpreadAttribute {
    export const kind = Syntax.JsxSpreadAttribute;
  }
  export namespace JsxExpression {
    export const kind = Syntax.JsxExpression;
  }
  export namespace CaseClause {
    export const kind = Syntax.CaseClause;
  }
  export namespace DefaultClause {
    export const kind = Syntax.DefaultClause;
  }
  export namespace HeritageClause {
    export const kind = Syntax.HeritageClause;
  }
  export namespace CatchClause {
    export const kind = Syntax.CatchClause;
  }
  export namespace PropertyAssignment {
    export const kind = Syntax.PropertyAssignment;
  }
  export namespace ShorthandPropertyAssignment {
    export const kind = Syntax.ShorthandPropertyAssignment;
  }
  export namespace SpreadAssignment {
    export const kind = Syntax.SpreadAssignment;
  }
  export namespace EnumMember {
    export const kind = Syntax.EnumMember;
  }
  export namespace SourceFile {
    export const kind = Syntax.SourceFile;
  }
  export namespace Bundle {
    export const kind = Syntax.Bundle;
  }
  export namespace UnparsedSource {
    export const kind = Syntax.UnparsedSource;
  }
  export namespace UnparsedPrepend {
    export const kind = Syntax.UnparsedPrepend;
  }
  export namespace JSDocTypeExpression {
    export const kind = Syntax.JSDocTypeExpression;
  }
  export namespace JSDocAllType {
    export const kind = Syntax.JSDocAllType;
  }
  export namespace JSDocUnknownType {
    export const kind = Syntax.JSDocUnknownType;
  }
  export namespace JSDocNullableType {
    export const kind = Syntax.JSDocNullableType;
  }
  export namespace JSDocNonNullableType {
    export const kind = Syntax.JSDocNonNullableType;
  }
  export namespace JSDocOptionalType {
    export const kind = Syntax.JSDocOptionalType;
  }
  export namespace JSDocFunctionType {
    export const kind = Syntax.JSDocFunctionType;
  }
  export namespace JSDocVariadicType {
    export const kind = Syntax.JSDocVariadicType;
  }
  export namespace JSDoc {
    export const kind = Syntax.JSDocComment;
  }
  export namespace JSDocAuthorTag {
    export const kind = Syntax.JSDocAuthorTag;
  }
  export namespace JSDocAugmentsTag {
    export const kind = Syntax.JSDocAugmentsTag;
  }
  export namespace JSDocImplementsTag {
    export const kind = Syntax.JSDocImplementsTag;
  }
  export namespace JSDocClassTag {
    export const kind = Syntax.JSDocClassTag;
  }
  export namespace JSDocPublicTag {
    export const kind = Syntax.JSDocPublicTag;
  }
  export namespace JSDocPrivateTag {
    export const kind = Syntax.JSDocPrivateTag;
  }
  export namespace JSDocProtectedTag {
    export const kind = Syntax.JSDocProtectedTag;
  }
  export namespace JSDocReadonlyTag {
    export const kind = Syntax.JSDocReadonlyTag;
  }
  export namespace JSDocEnumTag {
    export const kind = Syntax.JSDocEnumTag;
  }
  export namespace JSDocThisTag {
    export const kind = Syntax.JSDocThisTag;
  }
  export namespace JSDocParameterTag {
    export const kind = Syntax.JSDocParameterTag;
  }
  export namespace JSDocReturnTag {
    export const kind = Syntax.JSDocReturnTag;
  }
  export namespace JSDocTypeTag {
    export const kind = Syntax.JSDocTypeTag;
  }
  export namespace JSDocTemplateTag {
    export const kind = Syntax.JSDocTemplateTag;
  }
  export namespace JSDocTypedefTag {
    export const kind = Syntax.JSDocTypedefTag;
  }
  export namespace JSDocPropertyTag {
    export const kind = Syntax.JSDocPropertyTag;
  }
  export namespace JSDocTypeLiteral {
    export const kind = Syntax.JSDocTypeLiteral;
  }
  export namespace JSDocCallbackTag {
    export const kind = Syntax.JSDocCallbackTag;
  }
  export namespace JSDocSignature {
    export const kind = Syntax.JSDocSignature;
  }
  export namespace SyntaxList {
    export const kind = Syntax.SyntaxList;
  }
  export namespace PartiallyEmittedExpression {
    export const kind = Syntax.PartiallyEmittedExpression;
  }
  export namespace NotEmittedStatement {
    export const kind = Syntax.NotEmittedStatement;
  }
  export namespace SyntheticReferenceExpression {
    export const kind = Syntax.SyntheticReferenceExpression;
  }
}
