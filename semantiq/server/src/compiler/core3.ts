import * as qb from './base';
import { Nodes, NodeFlags, NodeType, TransformFlags } from './core2';
import * as qc from './core2';
import { Modifier, ModifierFlags, Syntax } from './syntax';
import * as qy from './syntax';
import { Node } from './types';
import * as qt from './types';
export * from './core2';
const MAX_SMI_X86 = 0x3fff_ffff;
export const enum AssignmentKind {
  None,
  Definite,
  Compound,
}
export namespace access {
  export const enum Kind {
    Read,
    Write,
    ReadWrite,
  }
  export function get(n: Node): Kind {
    const p = n.parent as Node | undefined;
    if (!p) return Kind.Read;
    const writeOrReadWrite = (): Kind => {
      const skipParens = (n?: Node) => {
        while (n?.kind === Syntax.ParenthesizedExpression) {
          n = n.parent as Node | undefined;
        }
        return n;
      };
      const pp = p?.parent as Node | undefined;
      return pp && skipParens(pp)?.kind === Syntax.ExpressionStatement ? Kind.Write : Kind.ReadWrite;
    };
    switch (p?.kind) {
      case Syntax.ParenthesizedExpression:
        return get(p);
      case Syntax.PostfixUnaryExpression:
      case Syntax.PrefixUnaryExpression:
        const o = p.operator;
        return o === Syntax.Plus2Token || o === Syntax.Minus2Token ? writeOrReadWrite() : Kind.Read;
      case Syntax.BinaryExpression:
        const o2 = p.operatorToken;
        return p.left === n && qy.is.assignmentOperator(o2.kind) ? (o2.kind === Syntax.EqualsToken ? Kind.Write : writeOrReadWrite()) : Kind.Read;
      case Syntax.PropertyAccessExpression:
        return p.name !== n ? Kind.Read : get(p);
      case Syntax.PropertyAssignment: {
        const a = get(p.parent);
        return n === p.name ? reverse(a) : a;
      }
      case Syntax.ShorthandPropertyAssignment:
        return n === p.objectAssignmentInitializer ? Kind.Read : get(p.parent);
      case Syntax.ArrayLiteralExpression:
        return get(p);
      default:
        return Kind.Read;
    }
  }
  export function reverse(k: Kind): Kind {
    switch (k) {
      case Kind.Read:
        return Kind.Write;
      case Kind.Write:
        return Kind.Read;
      case Kind.ReadWrite:
        return Kind.ReadWrite;
      default:
        return qb.fail();
    }
  }
}

export const is = new (class {
  kind<S extends Syntax, T extends { kind: S; also?: Syntax[] }>(t: T, n?: Node): n is NodeType<T['kind']> {
    if (n) return n.kind === t.kind || !!t.also?.includes(n.kind);
    return false;
  }
  asyncFunction(n: Node) {
    switch (n.kind) {
      case Syntax.FunctionDeclaration:
      case Syntax.FunctionExpression:
      case Syntax.ArrowFunction:
      case Syntax.MethodDeclaration:
        return n.body !== undefined && n.asteriskToken === undefined && hasSyntacticModifier(n, ModifierFlags.Async);
    }
    return false;
  }
  expressionNode(n?: Node) {
    switch (n?.kind) {
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
        let n2 = n as Node | undefined;
        while (n2?.parent?.kind === Syntax.QualifiedName) {
          n2 = n2.parent as Node | undefined;
        }
        return n2?.kind === Syntax.TypeQuery || isJsx.tagName(n);
      case Syntax.Identifier:
        if (n.parent?.kind === Syntax.TypeQuery || isJsx.tagName(n)) return true;
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
    const p = n.parent as Node | undefined;
    switch (p?.kind) {
      case Syntax.VariableDeclaration:
      case Syntax.Parameter:
      case Syntax.PropertyDeclaration:
      case Syntax.PropertySignature:
      case Syntax.EnumMember:
      case Syntax.PropertyAssignment:
      case Syntax.BindingElement:
        return p.initializer === n;
      case Syntax.ExpressionStatement:
      case Syntax.IfStatement:
      case Syntax.DoStatement:
      case Syntax.WhileStatement:
      case Syntax.ReturnStatement:
      case Syntax.WithStatement:
      case Syntax.SwitchStatement:
      case Syntax.CaseClause:
      case Syntax.ThrowStatement:
        return p.expression === n;
      case Syntax.ForStatement:
        return (p.initializer === n && p.initializer.kind !== Syntax.VariableDeclarationList) || p.condition === n || p.incrementor === n;
      case Syntax.ForInStatement:
      case Syntax.ForOfStatement:
        return (p.initializer === n && p.initializer.kind !== Syntax.VariableDeclarationList) || p.expression === n;
      case Syntax.TypeAssertionExpression:
      case Syntax.AsExpression:
        return p.expression === n;
      case Syntax.TemplateSpan:
        return p.expression === n;
      case Syntax.ComputedPropertyName:
        return p.expression === n;
      case Syntax.Decorator:
      case Syntax.JsxExpression:
      case Syntax.JsxSpreadAttribute:
      case Syntax.SpreadAssignment:
        return true;
      case Syntax.ExpressionWithTypeArguments:
        return p.expression === n && this.expressionWithTypeArgumentsInClassExtendsClause(p);
      case Syntax.ShorthandPropertyAssignment:
        return p.objectAssignmentInitializer === n;
      default:
        return this.expressionNode(p);
    }
  }
  expressionWithTypeArgumentsInClassExtendsClause(n: Node): n is qc.ExpressionWithTypeArguments {
    return tryGetClassExtendingExpressionWithTypeArguments(n) !== undefined;
  }
  entityNameExpression(n: Node): n is qc.EntityNameExpression {
    return n.kind === Syntax.Identifier || this.propertyAccessEntityNameExpression(n);
  }
  propertyAccessEntityNameExpression(n: Node): n is qc.PropertyAccessEntityNameExpression {
    return this.kind(qc.PropertyAccessExpression, n) && this.kind(qc.Identifier, n.name) && this.entityNameExpression(n.expression);
  }
  descendantOf(n: Node, ancestor?: Node) {
    let n2 = n as Node | undefined;
    while (n2) {
      if (n2 === ancestor) return true;
      n2 = n2.parent as Node | undefined;
    }
    return false;
  }
  signedNumericLiteral(n: Node): n is qc.PrefixUnaryExpression & { operand: qc.NumericLiteral } {
    return this.kind(qc.PrefixUnaryExpression, n) && (n.operator === Syntax.PlusToken || n.operator === Syntax.MinusToken) && n.operand.kind === Syntax.NumericLiteral;
  }
  deleteTarget(n: Node) {
    if (this.kind(qc.PropertyAccessExpression, n) || this.kind(qc.ElementAccessExpression, n)) {
      n = walkUpParenthesizedExpressions(n.parent);
      return n.kind === Syntax.DeleteExpression;
    }
    return false;
  }
  declarationName(n: Node) {
    const k = n.kind;
    const p = n.parent as Node | undefined;
    return k !== Syntax.SourceFile && !this.kind(qc.BindingPattern, n) && !!p && this.declaration(p) && p.name === n;
  }
  typeAlias(n: Node): n is qc.DocTypedefTag | qc.DocCallbackTag | qc.DocEnumTag | qc.TypeAliasDeclaration {
    return isDoc.typeAlias(n) || n.kind === Syntax.TypeAliasDeclaration;
  }
  literalLikeAccess(n: Node): n is qc.LiteralLikeElementAccessExpression | qc.PropertyAccessExpression {
    return n.kind === Syntax.PropertyAccessExpression || this.literalLikeElementAccess(n);
  }
  literalLikeElementAccess(n: Node): n is qc.LiteralLikeElementAccessExpression {
    return this.kind(qc.ElementAccessExpression, n) && (qc.StringLiteral.orNumericLiteralLike(n.argumentExpression) || this.wellKnownSymbolSyntactically(n.argumentExpression));
  }
  wellKnownSymbolSyntactically(n: Node): n is qc.WellKnownSymbolExpression {
    return this.kind(qc.PropertyAccessExpression, n) && this.esSymbolIdentifier(n.expression);
  }
  esSymbolIdentifier(n: Node) {
    return this.kind(qc.Identifier, n) && n.escapedText === 'Symbol';
  }
  exportsIdentifier(n: Node) {
    return this.kind(qc.Identifier, n) && n.escapedText === 'exports';
  }
  moduleIdentifier(n: Node) {
    return this.kind(qc.Identifier, n) && n.escapedText === 'module';
  }
  moduleExportsAccessExpression(n: Node): n is qc.LiteralLikeElementAccessExpression & { expression: qc.Identifier } {
    return (this.kind(qc.PropertyAccessExpression, n) || this.literalLikeElementAccess(n)) && this.moduleIdentifier(n.expression) && getElementOrPropertyAccessName(n) === 'exports';
  }
  partOfTypeQuery(n?: Node) {
    while (n?.kind === Syntax.QualifiedName || n?.kind === Syntax.Identifier) {
      n = n?.parent as Node | undefined;
    }
    return n?.kind === Syntax.TypeQuery;
  }
  externalModuleImportEqualsDeclaration(n: Node): n is qc.ImportEqualsDeclaration & { moduleReference: qc.ExternalModuleReference } {
    return this.kind(qc.ImportEqualsDeclaration, n) && n.moduleReference.kind === Syntax.ExternalModuleReference;
  }
  partOfTypeNode(n: Node) {
    const k = n.kind;
    if (Syntax.FirstTypeNode <= k && k <= Syntax.LastTypeNode) return true;
    const p = n.parent as Node | undefined;
    switch (k) {
      case Syntax.AnyKeyword:
      case Syntax.BigIntKeyword:
      case Syntax.BooleanKeyword:
      case Syntax.NeverKeyword:
      case Syntax.NumberKeyword:
      case Syntax.ObjectKeyword:
      case Syntax.StringKeyword:
      case Syntax.SymbolKeyword:
      case Syntax.UndefinedKeyword:
      case Syntax.UnknownKeyword:
        return true;
      case Syntax.VoidKeyword:
        return p?.kind !== Syntax.VoidExpression;
      case Syntax.ExpressionWithTypeArguments:
        return !this.expressionWithTypeArgumentsInClassExtendsClause(n);
      case Syntax.TypeParameter:
        return p?.kind === Syntax.MappedType || p?.kind === Syntax.InferType;
      case Syntax.Identifier:
        if (this.kind(qc.QualifiedName, p) && p.right === n) n = p;
        else if (this.kind(qc.PropertyAccessExpression, p) && p.name === n) n = p;
        qb.assert(k === Syntax.Identifier || k === Syntax.QualifiedName || k === Syntax.PropertyAccessExpression);
      case Syntax.PropertyAccessExpression:
      case Syntax.QualifiedName:
      case Syntax.ThisKeyword: {
        if (p?.kind === Syntax.TypeQuery) return false;
        if (this.kind(qc.ImportTypeNode, p)) return !p.isTypeOf;
        if (p && Syntax.FirstTypeNode <= p.kind && p.kind <= Syntax.LastTypeNode) return true;
        switch (p?.kind) {
          case Syntax.ExpressionWithTypeArguments:
            return !this.expressionWithTypeArgumentsInClassExtendsClause(p);
          case Syntax.TypeParameter:
            return n === p.constraint;
          case Syntax.DocTemplateTag:
            return n === p.constraint;
          case Syntax.Parameter:
          case Syntax.PropertyDeclaration:
          case Syntax.PropertySignature:
          case Syntax.VariableDeclaration:
            return n === p.type;
          case Syntax.ArrowFunction:
          case Syntax.Constructor:
          case Syntax.FunctionDeclaration:
          case Syntax.FunctionExpression:
          case Syntax.GetAccessor:
          case Syntax.MethodDeclaration:
          case Syntax.MethodSignature:
          case Syntax.SetAccessor:
            return n === p.type;
          case Syntax.CallSignature:
          case Syntax.ConstructSignature:
          case Syntax.IndexSignature:
            return n === p.type;
          case Syntax.TypeAssertionExpression:
            return n === p.type;
          case Syntax.CallExpression:
          case Syntax.NewExpression:
            return qb.contains(p.typeArguments, n);
          case Syntax.TaggedTemplateExpression:
            return false;
        }
      }
    }
    return false;
  }
  superOrSuperProperty(n: Node): n is qc.SuperExpression | qc.SuperProperty {
    return n.kind === Syntax.SuperKeyword || this.superProperty(n);
  }
  superProperty(n: Node): n is qc.SuperProperty {
    return (this.kind(qc.PropertyAccessExpression, n) || this.kind(qc.ElementAccessExpression, n)) && n.expression.kind === Syntax.SuperKeyword;
  }
  thisProperty(n: Node) {
    return (this.kind(qc.PropertyAccessExpression, n) || this.kind(qc.ElementAccessExpression, n)) && n.expression.kind === Syntax.ThisKeyword;
  }
  validESSymbolDeclaration(n: Node): n is qc.VariableDeclaration | qc.PropertyDeclaration | qc.SignatureDeclaration {
    return this.kind(qc.VariableDeclaration, n)
      ? this.isVarConst(n) && this.kind(qc.Identifier, n.name) && this.isVariableDeclarationInVariableStatement(n)
      : this.kind(qc.PropertyDeclaration, n)
      ? has.effectiveReadonlyModifier(n) && has.staticModifier(n)
      : this.kind(qc.PropertySignature, n) && has.effectiveReadonlyModifier(n);
  }
  functionBlock(n: Node) {
    const p = n.parent as Node | undefined;
    return n.kind === Syntax.Block && p && this.functionLike(p);
  }
  objectLiteralMethod(n: Node): n is qc.MethodDeclaration {
    return n.kind === Syntax.MethodDeclaration && n.parent?.kind === Syntax.ObjectLiteralExpression;
  }
  objectLiteralOrClassExpressionMethod(n: Node): n is qc.MethodDeclaration {
    const p = n.parent as Node | undefined;
    return n.kind === Syntax.MethodDeclaration && (p?.kind === Syntax.ObjectLiteralExpression || p?.kind === Syntax.ClassExpression);
  }
  variableLike(n?: Node): n is qc.VariableLikeDeclaration {
    switch (n?.kind) {
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
    return false;
  }
  variableLikeOrAccessor(n: Node): n is qc.AccessorDeclaration | qc.VariableLikeDeclaration {
    return this.variableLike(n) || this.accessor(n);
  }
  childOfNodeWithKind(n: Node | undefined, k: Syntax) {
    while (n) {
      if (n.kind === k) return true;
      n = n.parent as Node | undefined;
    }
    return false;
  }
  aLet(n: Node) {
    return !!(get.combinedFlagsOf(n) & NodeFlags.Let);
  }
  superCall(n: Node): n is qc.SuperCall {
    return this.kind(qc.CallExpression, n) && n.expression.kind === Syntax.SuperKeyword;
  }
  importCall(n: Node): n is qc.ImportCall {
    return this.kind(qc.CallExpression, n) && n.expression.kind === Syntax.ImportKeyword;
  }
  importMeta(n: Node): n is qc.ImportMetaProperty {
    return this.kind(qc.MetaProperty, n) && n.keywordToken === Syntax.ImportKeyword && n.name.escapedText === 'meta';
  }
  literalImportTypeNode(n: Node): n is qc.LiteralImportTypeNode {
    return this.kind(qc.ImportTypeNode, n) && this.kind(qc.LiteralTypeNode, n.argument) && this.kind(qc.StringLiteral, n.argument.literal);
  }
  prologueDirective(n: Node): n is qc.PrologueDirective {
    return this.kind(qc.ExpressionStatement, n) && n.expression.kind === Syntax.StringLiteral;
  }
  blockScope(n: Node, parent: Node) {
    switch (n.kind) {
      case Syntax.ArrowFunction:
      case Syntax.CaseBlock:
      case Syntax.CatchClause:
      case Syntax.Constructor:
      case Syntax.ForInStatement:
      case Syntax.ForOfStatement:
      case Syntax.ForStatement:
      case Syntax.FunctionDeclaration:
      case Syntax.FunctionExpression:
      case Syntax.GetAccessor:
      case Syntax.MethodDeclaration:
      case Syntax.ModuleDeclaration:
      case Syntax.SetAccessor:
      case Syntax.SourceFile:
        return true;
      case Syntax.Block:
        return !this.functionLike(parent);
    }
    return false;
  }
  declarationWithTypeParameters(n: Node): n is qc.DeclarationWithTypeParameters {
    switch (n.kind) {
      case Syntax.DocCallbackTag:
      case Syntax.DocSignature:
      case Syntax.DocTypedefTag:
        return true;
    }
    return this.declarationWithTypeParameterChildren(n);
  }
  declarationWithTypeParameterChildren(n: Node): n is qc.DeclarationWithTypeParameterChildren {
    switch (n.kind) {
      case Syntax.ArrowFunction:
      case Syntax.CallSignature:
      case Syntax.ClassDeclaration:
      case Syntax.ClassExpression:
      case Syntax.Constructor:
      case Syntax.ConstructorType:
      case Syntax.ConstructSignature:
      case Syntax.DocFunctionType:
      case Syntax.DocTemplateTag:
      case Syntax.FunctionDeclaration:
      case Syntax.FunctionExpression:
      case Syntax.FunctionType:
      case Syntax.GetAccessor:
      case Syntax.IndexSignature:
      case Syntax.InterfaceDeclaration:
      case Syntax.MethodDeclaration:
      case Syntax.MethodSignature:
      case Syntax.SetAccessor:
      case Syntax.TypeAliasDeclaration:
        return true;
    }
    return false;
  }
  anyImportSyntax(n: Node): n is qc.AnyImportSyntax {
    const k = n.kind;
    return k === Syntax.ImportDeclaration || k === Syntax.ImportEqualsDeclaration;
  }
  lateVisibilityPaintedStatement(n: Node): n is qc.LateVisibilityPaintedStatement {
    switch (n.kind) {
      case Syntax.ClassDeclaration:
      case Syntax.EnumDeclaration:
      case Syntax.FunctionDeclaration:
      case Syntax.ImportDeclaration:
      case Syntax.ImportEqualsDeclaration:
      case Syntax.InterfaceDeclaration:
      case Syntax.ModuleDeclaration:
      case Syntax.TypeAliasDeclaration:
      case Syntax.VariableStatement:
        return true;
    }
    return false;
  }
  anyImportOrReExport(n: Node): n is qc.AnyImportOrReExport {
    return this.anyImportSyntax(n) || this.kind(qc.ExportDeclaration, n);
  }
  ambientModule(n: Node): n is qc.AmbientModuleDeclaration {
    return this.kind(qc.ModuleDeclaration, n) && (n.name.kind === Syntax.StringLiteral || n.isGlobalScopeAugmentation());
  }
  moduleWithStringLiteralName(n: Node): n is qc.ModuleDeclaration {
    return this.kind(qc.ModuleDeclaration, n) && n.name.kind === Syntax.StringLiteral;
  }
  nonGlobalAmbientModule(n: Node): n is qc.ModuleDeclaration & { name: qc.StringLiteral } {
    return this.kind(qc.ModuleDeclaration, n) && this.kind(qc.StringLiteral, n.name);
  }
  effectiveModuleDeclaration(n: Node) {
    return this.kind(qc.ModuleDeclaration, n) || this.kind(qc.Identifier, n);
  }
  shorthandAmbientModule(n: Node) {
    return this.kind(qc.ModuleDeclaration, n) && !n.body;
  }
  blockScopedContainerTopLevel(n: Node) {
    return this.kind(qc.SourceFile, n) || this.kind(qc.ModuleDeclaration, n) || this.functionLike(n);
  }
  externalModuleAugmentation(n: Node): n is qc.AmbientModuleDeclaration {
    return this.ambientModule(n) && this.moduleAugmentationExternal(n);
  }
  moduleAugmentationExternal(n: qc.AmbientModuleDeclaration) {
    switch (n.parent.kind) {
      case Syntax.SourceFile:
        return qp_isExternalModule(n.parent);
      case Syntax.ModuleBlock:
        return this.ambientModule(n.parent.parent) && this.kind(qc.SourceFile, n.parent.parent.parent) && !qp_isExternalModule(n.parent.parent.parent);
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
  parameterPropertyDeclaration(n: Node, parent: Node): n is qc.ParameterPropertyDeclaration {
    return hasSyntacticModifier(n, ModifierFlags.ParameterPropertyModifier) && parent.kind === Syntax.Constructor;
  }
  parseTreeNode(n: Node) {
    return (n.flags & NodeFlags.Synthesized) === 0;
  }
  withName(n: Node, name: qc.Identifier) {
    if (this.namedDeclaration(n) && this.kind(qc.Identifier, n.name) && idText(n.name as qc.Identifier) === idText(name)) return true;
    if (this.kind(qc.VariableStatement, n) && qb.some(n.declarationList.declarations, (d) => this.withName(d, name))) return true;
    return false;
  }
  withDocNodes(n: Node): n is qc.HasDoc {
    const { doc } = n as qc.DocContainer;
    return !!doc && doc.length > 0;
  }
  withType(n: Node): n is qc.HasType {
    return !!(n as HasType).type;
  }
  withInitializer(n: Node): n is qc.HasInitializer {
    return !!(n as HasInitializer).initializer;
  }
  withOnlyExpressionInitializer(n: Node): n is qc.HasExpressionInitializer {
    switch (n.kind) {
      case Syntax.BindingElement:
      case Syntax.EnumMember:
      case Syntax.Parameter:
      case Syntax.PropertyAssignment:
      case Syntax.PropertyDeclaration:
      case Syntax.PropertySignature:
      case Syntax.VariableDeclaration:
        return true;
    }
    return false;
  }
  namedDeclaration(n: Node): n is qc.NamedDeclaration & { name: qc.DeclarationName } {
    return !!(n as qc.NamedDeclaration).name;
  }
  propertyAccessChain(n: Node): n is qc.PropertyAccessChain {
    return n.kind === Syntax.PropertyAccessExpression && !!(n.flags & NodeFlags.OptionalChain);
  }
  elementAccessChain(n: Node): n is qc.ElementAccessChain {
    return n.kind === Syntax.ElementAccessExpression && !!(n.flags & NodeFlags.OptionalChain);
  }
  callChain(n: Node): n is qc.CallChain {
    return n.kind === Syntax.CallExpression && !!(n.flags & NodeFlags.OptionalChain);
  }
  optionalChainRoot(n: Node): n is qc.OptionalChainRoot {
    return this.optionalChain(n) && !this.kind(qc.NonNullExpression, n) && !!n.questionDotToken;
  }
  expressionOfOptionalChainRoot(n: Node): n is qc.Expression & { parent: qc.OptionalChainRoot } {
    const p = n.parent as Node | undefined;
    return !!p && this.optionalChainRoot(p) && p.expression === n;
  }
  nullishCoalesce(n: Node) {
    return this.kind(qc.BinaryExpression, n) && n.operatorToken.kind === Syntax.Question2Token;
  }
  constTypeReference(n: Node) {
    return this.kind(qc.TypeReferenceNode, n) && this.kind(qc.Identifier, n.typeName) && n.typeName.escapedText === 'const' && !n.typeArguments;
  }
  nonNullChain(n: Node): n is qc.NonNullChain {
    return n.kind === Syntax.NonNullExpression && !!(n.flags & NodeFlags.OptionalChain);
  }
  unparsedNode(n: Node): n is qt.UnparsedNode {
    const k = n.kind;
    return this.unparsedTextLike(n) || k === Syntax.UnparsedPrologue || k === Syntax.UnparsedSyntheticReference;
  }
  literalExpression(n: Node): n is qc.LiteralExpression {
    return qy.is.literal(n.kind);
  }
  templateLiteralToken(n: Node): n is qc.TemplateLiteralToken {
    return qy.is.templateLiteral(n.kind);
  }
  importOrExportSpecifier(n: Node): n is qc.ImportSpecifier | qc.ExportSpecifier {
    const k = n.kind;
    return k === Syntax.ImportSpecifier || k === Syntax.ExportSpecifier;
  }
  typeOnlyImportOrExportDeclaration(n: Node): n is qc.TypeOnlyCompatibleAliasDeclaration {
    switch (n.kind) {
      case Syntax.ImportSpecifier:
      case Syntax.ExportSpecifier:
        return n.parent?.parent?.isTypeOnly;
      case Syntax.NamespaceImport:
        return n.parent?.isTypeOnly;
      case Syntax.ImportClause:
        return n.isTypeOnly;
      default:
        return false;
    }
  }
  stringTextContainingNode(n: Node): n is qc.StringLiteral | qc.TemplateLiteralToken {
    const k = n.kind;
    return k === Syntax.StringLiteral || qy.is.templateLiteral(k);
  }
  generatedIdentifier(n: Node): n is qc.GeneratedIdentifier {
    return this.kind(qc.Identifier, n) && (n.autoGenerateFlags! & qc.GeneratedIdentifierFlags.KindMask) > qc.GeneratedIdentifierFlags.None;
  }
  privateIdentifierPropertyAccessExpression(n: Node): n is qc.PrivateIdentifierPropertyAccessExpression {
    return this.kind(qc.PropertyAccessExpression, n) && n.name.kind === Syntax.PrivateIdentifier;
  }
  modifier(n: Node): n is Modifier {
    return qy.is.modifier(n.kind);
  }
  functionLike(n: Node): n is qc.SignatureDeclaration {
    return qy.is.functionLike(n.kind);
  }
  functionLikeDeclaration(n: Node): n is qc.FunctionLikeDeclaration {
    return qy.is.functionLikeDeclaration(n.kind);
  }
  functionOrModuleBlock(n: Node) {
    const k = n.kind;
    const p = n.parent as Node | undefined;
    return k === Syntax.SourceFile || k === Syntax.ModuleBlock || (k === Syntax.Block && p && this.functionLike(p));
  }
  classElement(n: Node): n is qc.ClassElement {
    switch (n.kind) {
      case Syntax.Constructor:
      case Syntax.GetAccessor:
      case Syntax.IndexSignature:
      case Syntax.MethodDeclaration:
      case Syntax.PropertyDeclaration:
      case Syntax.SemicolonClassElement:
      case Syntax.SetAccessor:
        return true;
    }
    return false;
  }
  classLike(n: Node): n is qc.ClassLikeDeclaration {
    const k = n.kind;
    return k === Syntax.ClassDeclaration || k === Syntax.ClassExpression;
  }
  accessor(n: Node): n is qc.AccessorDeclaration {
    const k = n.kind;
    return k === Syntax.GetAccessor || k === Syntax.SetAccessor;
  }
  methodOrAccessor(n: Node): n is qc.MethodDeclaration | qc.AccessorDeclaration {
    const k = n.kind;
    return k === Syntax.MethodDeclaration || k === Syntax.GetAccessor || k === Syntax.SetAccessor;
  }
  classOrTypeElement(n: Node): n is qc.ClassElement | qc.TypeElement {
    return this.typeElement(n) || this.classElement(n);
  }
  objectLiteralElementLike(n: Node): n is qc.ObjectLiteralElementLike {
    switch (n.kind) {
      case Syntax.GetAccessor:
      case Syntax.MethodDeclaration:
      case Syntax.PropertyAssignment:
      case Syntax.SetAccessor:
      case Syntax.ShorthandPropertyAssignment:
      case Syntax.SpreadAssignment:
        return true;
    }
    return false;
  }
  typeNode(n: Node): n is qc.TypeNode {
    return qy.is.typeNode(n.kind);
  }
  functionOrConstructorTypeNode(n: Node): n is qc.FunctionTypeNode | qc.ConstructorTypeNode {
    const k = n.kind;
    return k === Syntax.FunctionType || k === Syntax.ConstructorType;
  }
  callLikeExpression(n: Node): n is qc.CallLikeExpression {
    switch (n.kind) {
      case Syntax.CallExpression:
      case Syntax.Decorator:
      case Syntax.JsxOpeningElement:
      case Syntax.JsxSelfClosingElement:
      case Syntax.NewExpression:
      case Syntax.TaggedTemplateExpression:
        return true;
    }
    return false;
  }
  leftHandSideExpression(n: Node): n is qc.LeftHandSideExpression {
    return qy.is.leftHandSideExpression(qc.skipPartiallyEmittedExpressions(n).kind);
  }
  unaryExpression(n: Node): n is qc.UnaryExpression {
    return qy.is.unaryExpression(qc.skipPartiallyEmittedExpressions(n).kind);
  }
  unaryExpressionWithWrite(n: Node): n is qc.PrefixUnaryExpression | qc.PostfixUnaryExpression {
    switch (n.kind) {
      case Syntax.PostfixUnaryExpression:
        return true;
      case Syntax.PrefixUnaryExpression:
        const o = n.operator;
        return o === Syntax.Plus2Token || o === Syntax.Minus2Token;
      default:
        return false;
    }
  }
  expression(n: Node): n is qc.Expression {
    return qy.is.expression(qc.skipPartiallyEmittedExpressions(n).kind);
  }
  notEmittedOrPartiallyEmittedNode(n: Node): n is qc.NotEmittedStatement | qc.PartiallyEmittedExpression {
    const k = n.kind;
    return k === Syntax.NotEmittedStatement || k === Syntax.PartiallyEmittedExpression;
  }
  iterationStatement(n: Node, look: false): n is qc.IterationStatement;
  iterationStatement(n: Node, look: boolean): n is qc.IterationStatement | qc.LabeledStatement;
  iterationStatement(n: Node, look: boolean): n is qc.IterationStatement {
    switch (n.kind) {
      case Syntax.DoStatement:
      case Syntax.ForInStatement:
      case Syntax.ForOfStatement:
      case Syntax.ForStatement:
      case Syntax.WhileStatement:
        return true;
      case Syntax.LabeledStatement:
        const s = n.statement as Node;
        return look && this.iterationStatement(s, look);
    }
    return false;
  }
  scopeMarker(n: Node) {
    return this.kind(qc.ExportAssignment, n) || this.kind(qc.ExportDeclaration, n);
  }
  conciseBody(n: qt.Nobj): n is qc.ConciseBody {
    return n.kind === Syntax.Block || this.expression(n as Node);
  }
  functionBody(n: Node): n is qc.FunctionBody {
    return n.kind === Syntax.Block;
  }
  forInitializer(n: qt.Nobj): n is qc.ForInitializer {
    return n.kind === Syntax.VariableDeclarationList || this.expression(n as Node);
  }
  declaration(n: Node): n is qc.NamedDeclaration {
    if (n.kind === Syntax.TypeParameter) return (n.parent && n.parent.kind !== Syntax.DocTemplateTag) || isInJSFile(n);
    return qy.is.declaration(n.kind);
  }
  declarationStatement(n: Node): n is qc.DeclarationStatement {
    return qy.is.declarationStatement(n.kind);
  }
  statementButNotDeclaration(n: Node): n is qc.Statement {
    return qy.is.statementKindButNotDeclaration(n.kind);
  }
  statement(n: Node): n is qc.Statement {
    const k = n.kind;
    return qy.is.statementKindButNotDeclaration(k) || qy.is.declarationStatement(k) || this.blockStatement(n);
  }
  blockStatement(n: Node): n is qc.Block {
    if (n.kind !== Syntax.Block) return false;
    const p = n.parent;
    if (p && (p.kind === Syntax.TryStatement || p.kind === Syntax.CatchClause)) return false;
    return !this.functionBlock(n);
  }
  identifierOrPrivateIdentifier(n: Node): n is qc.Identifier | qc.PrivateIdentifier {
    const k = n.kind;
    return k === Syntax.Identifier || k === Syntax.PrivateIdentifier;
  }
  optionalChain(n: Node): n is qc.PropertyAccessChain | qc.ElementAccessChain | qc.CallChain | qc.NonNullChain {
    if (!!(n.flags & NodeFlags.OptionalChain)) {
      switch (n.kind) {
        case Syntax.PropertyAccessExpression:
        case Syntax.ElementAccessExpression:
        case Syntax.CallExpression:
        case Syntax.NonNullExpression:
          return true;
      }
    }
    return false;
  }
  breakOrContinueStatement(n: Node): n is qc.BreakOrContinueStatement {
    const k = n.kind;
    return k === Syntax.BreakStatement || k === Syntax.ContinueStatement;
  }
  namedExportBindings(n: Node): n is qc.NamedExportBindings {
    const k = n.kind;
    return k === Syntax.NamespaceExport || k === Syntax.NamedExports;
  }
  unparsedTextLike(n: Node): n is qc.UnparsedTextLike {
    const k = n.kind;
    return k === Syntax.UnparsedText || k === Syntax.UnparsedInternalText;
  }
  entityName(n: Node): n is qc.EntityName {
    const k = n.kind;
    return k === Syntax.QualifiedName || k === Syntax.Identifier;
  }
  propertyName(n: Node): n is qc.PropertyName {
    switch (n.kind) {
      case Syntax.ComputedPropertyName:
      case Syntax.Identifier:
      case Syntax.NumericLiteral:
      case Syntax.PrivateIdentifier:
      case Syntax.StringLiteral:
        return true;
    }
    return false;
  }
  bindingName(n: Node): n is qc.BindingName {
    const k = n.kind;
    return k === Syntax.Identifier || k === Syntax.ObjectBindingPattern || k === Syntax.ArrayBindingPattern;
  }
  typeElement(n: Node): n is qc.TypeElement {
    switch (n.kind) {
      case Syntax.CallSignature:
      case Syntax.ConstructSignature:
      case Syntax.IndexSignature:
      case Syntax.MethodSignature:
      case Syntax.PropertySignature:
        return true;
    }
    return false;
  }
  arrayBindingElement(n: Node): n is qc.ArrayBindingElement {
    const k = n.kind;
    return k === Syntax.BindingElement || k === Syntax.OmittedExpression;
  }
  propertyAccessOrQualifiedNameOrImportTypeNode(n: Node): n is qc.PropertyAccessExpression | qc.QualifiedName | qc.ImportTypeNode {
    const k = n.kind;
    return k === Syntax.PropertyAccessExpression || k === Syntax.QualifiedName || k === Syntax.ImportType;
  }
  propertyAccessOrQualifiedName(n: Node): n is qc.PropertyAccessExpression | qc.QualifiedName {
    const k = n.kind;
    return k === Syntax.PropertyAccessExpression || k === Syntax.QualifiedName;
  }
  callOrNewExpression(n: Node): n is qc.CallExpression | qc.NewExpression {
    const k = n.kind;
    return k === Syntax.CallExpression || k === Syntax.NewExpression;
  }
  templateLiteral(n: Node): n is qc.TemplateLiteral {
    const k = n.kind;
    return k === Syntax.TemplateExpression || k === Syntax.NoSubstitutionLiteral;
  }
  assertionExpression(n: Node): n is qc.AssertionExpression {
    const k = n.kind;
    return k === Syntax.TypeAssertionExpression || k === Syntax.AsExpression;
  }
  forInOrOfStatement(n: Node): n is qc.ForInOrOfStatement {
    const k = n.kind;
    return k === Syntax.ForInStatement || k === Syntax.ForOfStatement;
  }
  moduleBody(n: Node): n is qc.ModuleBody {
    const k = n.kind;
    return k === Syntax.ModuleBlock || k === Syntax.ModuleDeclaration || k === Syntax.Identifier;
  }
  namespaceBody(n: Node): n is qc.NamespaceBody {
    const k = n.kind;
    return k === Syntax.ModuleBlock || k === Syntax.ModuleDeclaration;
  }
  namedImportBindings(n: Node): n is qc.NamedImportBindings {
    const k = n.kind;
    return k === Syntax.NamedImports || k === Syntax.NamespaceImport;
  }
  moduleOrEnumDeclaration(n: Node): n is qc.ModuleDeclaration | qc.EnumDeclaration {
    const k = n.kind;
    return k === Syntax.ModuleDeclaration || k === Syntax.EnumDeclaration;
  }
  moduleReference(n: Node): n is qc.ModuleReference {
    const k = n.kind;
    return k === Syntax.ExternalModuleReference || k === Syntax.QualifiedName || k === Syntax.Identifier;
  }
  caseOrDefaultClause(n: Node): n is qc.CaseOrDefaultClause {
    const k = n.kind;
    return k === Syntax.CaseClause || k === Syntax.DefaultClause;
  }
  objectLiteralElement(n: Node): n is qc.ObjectLiteralElement {
    const k = n.kind;
    return k === Syntax.JsxAttribute || k === Syntax.JsxSpreadAttribute || this.objectLiteralElementLike(n);
  }
  typeReferenceType(n: Node): n is qc.TypeReferenceType {
    const k = n.kind;
    return k === Syntax.TypeReference || k === Syntax.ExpressionWithTypeArguments;
  }
  isStringOrNumericLiteral(n: Node): n is qc.StringLiteral | qc.NumericLiteral {
    const k = n.kind;
    return k === Syntax.StringLiteral || k === Syntax.NumericLiteral;
  }
  isSelfReferenceLocation(n: Node) {
    switch (n.kind) {
      case Syntax.ClassDeclaration:
      case Syntax.EnumDeclaration:
      case Syntax.FunctionDeclaration:
      case Syntax.InterfaceDeclaration:
      case Syntax.ModuleDeclaration:
      case Syntax.TypeAliasDeclaration:
        return true;
    }
    return false;
  }
  isSomeImportDeclaration(n: Node) {
    switch (n.kind) {
      case Syntax.ImportClause:
      case Syntax.ImportEqualsDeclaration:
      case Syntax.ImportSpecifier:
      case Syntax.NamespaceImport:
        return true;
      case Syntax.Identifier:
        return n.parent?.kind === Syntax.ImportSpecifier;
    }
    return false;
  }
  isDeclarationNameOrImportPropertyName(n: Node) {
    switch (n.parent?.kind) {
      case Syntax.ExportSpecifier:
      case Syntax.ImportSpecifier:
        return n.kind === Syntax.Identifier;
    }
    return this.declarationName(n);
  }
  isAliasSymbolDeclaration(n: Node) {
    const k = n.kind;
    const p = n.parent as Node | undefined;
    return (
      k === Syntax.ImportEqualsDeclaration ||
      k === Syntax.NamespaceExportDeclaration ||
      (this.kind(qc.ImportClause, n) && !!n.name) ||
      k === Syntax.NamespaceImport ||
      k === Syntax.NamespaceExport ||
      k === Syntax.ImportSpecifier ||
      k === Syntax.ExportSpecifier ||
      (this.kind(qc.ExportAssignment, n) && exportAssignmentIsAlias(n)) ||
      (this.kind(qc.BinaryExpression, n) && getAssignmentDeclarationKind(n) === qc.AssignmentDeclarationKind.ModuleExports && exportAssignmentIsAlias(n)) ||
      (this.kind(qc.PropertyAccessExpression, n) && this.kind(qc.BinaryExpression, p) && p.left === n && p.operatorToken.kind === Syntax.EqualsToken && this.isAliasableExpression(p.right)) ||
      k === Syntax.ShorthandPropertyAssignment ||
      (this.kind(qc.PropertyAssignment, n) && this.isAliasableExpression(n.initializer))
    );
  }
  isValueSignatureDeclaration(n: Node): n is qc.ValueSignatureDeclaration {
    const k = n.kind;
    return k === Syntax.FunctionExpression || k === Syntax.ArrowFunction || this.methodOrAccessor(n) || k === Syntax.FunctionDeclaration || k === Syntax.Constructor;
  }
  isObjectTypeDeclaration(n: Node): n is qc.ObjectTypeDeclaration {
    const k = n.kind;
    return this.classLike(n) || k === Syntax.InterfaceDeclaration || k === Syntax.TypeLiteral;
  }
  isAccessExpression(n: Node): n is qc.AccessExpression {
    const k = n.kind;
    return k === Syntax.PropertyAccessExpression || k === Syntax.ElementAccessExpression;
  }
  isNamedImportsOrExports(n: Node): n is qc.NamedImportsOrExports {
    return n.kind === Syntax.NamedImports || n.kind === Syntax.NamedExports;
  }
  isWriteOnlyAccess(n: Node) {
    return access.get(n) === access.Kind.Write;
  }
  isWriteAccess(n: Node) {
    return access.get(n) !== access.Kind.Read;
  }
  isValidTypeOnlyAliasUseSite(n: Node) {
    return (
      !!(n.flags & NodeFlags.Ambient) ||
      this.partOfTypeQuery(n) ||
      this.isIdentifierInNonEmittingHeritageClause(n) ||
      this.isPartOfPossiblyValidTypeOrAbstractComputedPropertyName(n) ||
      !this.expressionNode(n)
    );
  }
  isPartOfPossiblyValidTypeOrAbstractComputedPropertyName(n?: Node) {
    while (n?.kind === Syntax.Identifier || n?.kind === Syntax.PropertyAccessExpression) {
      n = n.parent as Node | undefined;
    }
    if (n?.kind !== Syntax.ComputedPropertyName) return false;
    const p = n?.parent as Node | undefined;
    if (p && has.hasSyntacticModifier(p, ModifierFlags.Abstract)) return true;
    const k = p?.parent?.kind;
    return k === Syntax.InterfaceDeclaration || k === Syntax.TypeLiteral;
  }
  isIdentifierInNonEmittingHeritageClause(n: Node) {
    if (n.kind !== Syntax.Identifier) return false;
    const h = Node.findAncestor(n.parent, (p) => {
      switch (p.kind) {
        case Syntax.HeritageClause:
          return true;
        case Syntax.PropertyAccessExpression:
        case Syntax.ExpressionWithTypeArguments:
          return false;
        default:
          return 'quit';
      }
    }) as qc.HeritageClause | undefined;
    return h?.token === Syntax.ImplementsKeyword || h?.parent.kind === Syntax.InterfaceDeclaration;
  }
  isIdentifierTypeReference(n: Node): n is qc.TypeReferenceNode & { typeName: qc.Identifier } {
    return is.kind(qc.TypeReferenceNode, n) && n.typeName.kind === Syntax.Identifier;
  }
  isPrototypeAccess(n: Node): n is qc.BindableStaticAccessExpression {
    return this.isBindableStaticAccessExpression(n) && getElementOrPropertyAccessName(n) === 'prototype';
  }
  isRightSideOfQualifiedNameOrPropertyAccess(n: Node) {
    const p = n.parent as Node | undefined;
    return (this.kind(qc.QualifiedName, p) && p.right === n) || (this.kind(qc.PropertyAccessExpression, p) && p.name === n);
  }
  isEmptyObjectLiteral(n: Node) {
    return this.kind(qc.ObjectLiteralExpression, n) && n.properties.length === 0;
  }
  isEmptyArrayLiteral(n: Node) {
    return this.kind(qc.ArrayLiteralExpression, n) && n.elements.length === 0;
  }
  isPropertyNameLiteral(n: Node): n is qc.PropertyNameLiteral {
    switch (n.kind) {
      case Syntax.Identifier:
      case Syntax.NoSubstitutionLiteral:
      case Syntax.NumericLiteral:
      case Syntax.StringLiteral:
        return true;
    }
    return false;
  }
  isAssignmentTarget(n: Node) {
    return getAssignmentTargetKind(n) !== AssignmentKind.None;
  }
  isLiteralComputedPropertyDeclarationName(n: Node) {
    return qc.StringLiteral.orNumericLiteralLike(n) && n.parent?.kind === Syntax.ComputedPropertyName && this.declaration(n.parent.parent);
  }
  isPrototypePropertyAssignment(n: Node) {
    return this.kind(qc.BinaryExpression, n) && getAssignmentDeclarationKind(n) === qc.AssignmentDeclarationKind.PrototypeProperty;
  }
  isDocTypeExpressionOrChild(n: Node) {
    return !!Node.findAncestor(n, isDocTypeExpression);
  }
  isInternalModuleImportEqualsDeclaration(n: Node): n is qc.ImportEqualsDeclaration {
    return this.kind(qc.ImportEqualsDeclaration, n) && n.moduleReference.kind !== Syntax.ExternalModuleReference;
  }
  isInJSFile(n?: Node) {
    return !!n && !!(n.flags & NodeFlags.JavaScriptFile);
  }
  isInJsonFile(n: Node | undefined) {
    return !!n && !!(n.flags & NodeFlags.JsonFile);
  }
  isInDoc(n: Node | undefined) {
    return !!n && !!(n.flags & NodeFlags.Doc);
  }
  isBindableStaticAccessExpression(n: Node, noThis?: boolean): n is qc.BindableStaticAccessExpression {
    return (
      (is.kind(qc.PropertyAccessExpression, n) &&
        ((!noThis && n.expression.kind === Syntax.ThisKeyword) || (is.kind(qc.Identifier, n.name) && this.isBindableStaticNameExpression(n.expression, true)))) ||
      this.isBindableStaticElementAccessExpression(n, noThis)
    );
  }
  isBindableStaticElementAccessExpression(n: Node, noThis?: boolean): n is qc.BindableStaticElementAccessExpression {
    return (
      is.literalLikeElementAccess(n) && ((!noThis && n.expression.kind === Syntax.ThisKeyword) || is.entityNameExpression(n.expression) || this.isBindableStaticAccessExpression(n.expression, true))
    );
  }
  isBindableStaticNameExpression(n: Node, noThis?: boolean): n is qc.BindableStaticNameExpression {
    return is.entityNameExpression(n) || this.isBindableStaticAccessExpression(n, noThis);
  }
  isAssignmentExpression(n: Node, noCompound: true): n is qc.AssignmentExpression<qc.EqualsToken>;
  isAssignmentExpression(n: Node, noCompound?: false): n is qc.AssignmentExpression<qc.AssignmentOperatorToken>;
  isAssignmentExpression(n: Node, noCompound?: boolean): n is qc.AssignmentExpression<qc.AssignmentOperatorToken> {
    return is.kind(qc.BinaryExpression, n) && (noCompound ? n.operatorToken.kind === Syntax.EqualsToken : qy.is.assignmentOperator(n.operatorToken.kind)) && is.leftHandSideExpression(n.left);
  }
  isDestructuringAssignment(n: Node): n is qc.DestructuringAssignment {
    if (this.isAssignmentExpression(n, true)) {
      const k = n.left.kind;
      return k === Syntax.ObjectLiteralExpression || k === Syntax.ArrayLiteralExpression;
    }
    return false;
  }
  isNodeWithPossibleHoistedDeclaration(n: Node): n is qc.NodeWithPossibleHoistedDeclaration {
    switch (n.kind) {
      case Syntax.Block:
      case Syntax.CaseBlock:
      case Syntax.CaseClause:
      case Syntax.CatchClause:
      case Syntax.DefaultClause:
      case Syntax.DoStatement:
      case Syntax.ForInStatement:
      case Syntax.ForOfStatement:
      case Syntax.ForStatement:
      case Syntax.IfStatement:
      case Syntax.LabeledStatement:
      case Syntax.SwitchStatement:
      case Syntax.TryStatement:
      case Syntax.VariableStatement:
      case Syntax.WhileStatement:
      case Syntax.WithStatement:
        return true;
    }
    return false;
  }
  typeOnlyDeclarationIsExport(n: Node) {
    return n.kind === Syntax.ExportSpecifier;
  }
  nodeStartsNewLexicalEnvironment(n: Node) {
    switch (n.kind) {
      case Syntax.ArrowFunction:
      case Syntax.Constructor:
      case Syntax.FunctionDeclaration:
      case Syntax.FunctionExpression:
      case Syntax.GetAccessor:
      case Syntax.MethodDeclaration:
      case Syntax.ModuleDeclaration:
      case Syntax.SetAccessor:
      case Syntax.SourceFile:
        return true;
    }
    return false;
  }
  introducesArgumentsExoticObject(n: Node) {
    switch (n.kind) {
      case Syntax.Constructor:
      case Syntax.FunctionDeclaration:
      case Syntax.FunctionExpression:
      case Syntax.GetAccessor:
      case Syntax.MethodDeclaration:
      case Syntax.MethodSignature:
      case Syntax.SetAccessor:
        return true;
    }
    return false;
  }
})();
export const has = new (class {
  hasTypeArguments(n: Node): n is qc.HasTypeArguments {
    return !!(n as qc.HasTypeArguments).typeArguments;
  }
  hasQuestionToken(n: Node) {
    switch (n.kind) {
      case Syntax.MethodDeclaration:
      case Syntax.MethodSignature:
      case Syntax.Parameter:
      case Syntax.PropertyAssignment:
      case Syntax.PropertyDeclaration:
      case Syntax.PropertySignature:
      case Syntax.ShorthandPropertyAssignment:
        return n.questionToken !== undefined;
    }
    return false;
  }
  hasEffectiveModifiers(n: Node) {
    return getEffectiveModifierFlags(n) !== ModifierFlags.None;
  }
  hasSyntacticModifiers(n: Node) {
    return getSyntacticModifierFlags(n) !== ModifierFlags.None;
  }
  hasEffectiveModifier(n: Node, f: ModifierFlags) {
    return !!getSelectedEffectiveModifierFlags(n, f);
  }
  hasSyntacticModifier(n: Node, f: ModifierFlags) {
    return !!getSelectedSyntacticModifierFlags(n, f);
  }
  hasStaticModifier(n: Node) {
    return this.hasSyntacticModifier(n, ModifierFlags.Static);
  }
  hasEffectiveReadonlyModifier(n: Node) {
    return this.hasEffectiveModifier(n, ModifierFlags.Readonly);
  }
})();
export const isJsx = new (class {
  tagName(n: Node) {
    const p = n.parent as Node | undefined;
    if (is.kind(qc.JsxOpeningElement, p) || is.kind(qc.JsxSelfClosingElement, p) || is.kind(qc.JsxClosingElement, p)) return p?.tagName === n;
    return false;
  }
  tagNameExpression(n: Node): n is qc.JsxTagNameExpression {
    const k = n.kind;
    return k === Syntax.ThisKeyword || k === Syntax.Identifier || k === Syntax.PropertyAccessExpression;
  }
  child(n: Node): n is qc.JsxChild {
    switch (n.kind) {
      case Syntax.JsxElement:
      case Syntax.JsxExpression:
      case Syntax.JsxSelfClosingElement:
      case Syntax.JsxText:
      case Syntax.JsxFragment:
        return true;
    }
    return false;
  }
  attributeLike(n: Node): n is qc.JsxAttributeLike {
    const k = n.kind;
    return k === Syntax.JsxAttribute || k === Syntax.JsxSpreadAttribute;
  }
  openingLikeElement(n: Node): n is qc.JsxOpeningLikeElement {
    const k = n.kind;
    return k === Syntax.JsxOpeningElement || k === Syntax.JsxSelfClosingElement;
  }
})();
export const isDoc = new (class {
  constructSignature(n: Node) {
    const p = is.kind(qc.DocFunctionType, n) ? firstOrUndefined(n.parameters) : undefined;
    const i = tryCast(p && p.name, isIdentifier);
    return !!i && i.escapedText === 'new';
  }
  typeAlias(n: Node): n is qc.DocTypedefTag | qc.DocCallbackTag | qc.DocEnumTag {
    const k = n.kind;
    return k === Syntax.DocTypedefTag || k === Syntax.DocCallbackTag || k === Syntax.DocEnumTag;
  }
  namespaceBody(n: Node): n is qc.DocNamespaceBody {
    const k = n.kind;
    return k === Syntax.Identifier || k === Syntax.ModuleDeclaration;
  }
  propertyLikeTag(n: Node): n is qc.DocPropertyLikeTag {
    const k = n.kind;
    return k === Syntax.DocPropertyTag || k === Syntax.DocParameterTag;
  }
  node(n: Node) {
    return n.kind >= Syntax.FirstDocNode && n.kind <= Syntax.LastDocNode;
  }
  commentContainingNode(n: Node) {
    switch (n.kind) {
      case Syntax.DocComment:
      case Syntax.DocNamepathType:
      case Syntax.DocSignature:
      case Syntax.DocTypeLiteral:
        return true;
    }
    return this.tag(n);
  }
  tag(n: Node): n is qc.DocTag {
    const k = n.kind;
    return k >= Syntax.FirstDocTagNode && k <= Syntax.LastDocTagNode;
  }
})();
export const get = new (class {
  containingFunction(n: Node): qc.SignatureDeclaration | undefined {
    return findAncestor(n.parent, isFunctionLike);
  }
  containingFunctionDeclaration(n: Node): qc.FunctionLikeDeclaration | undefined {
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
          if (is.classLike(n.parent.parent)) return n;
          n = n.parent;
          break;
        case Syntax.Decorator:
          if (this.kind(qc.Parameter, n.parent) && is.classElement(n.parent.parent)) n = n.parent.parent;
          else if (is.classElement(n.parent)) n = n.parent;
          break;
        case Syntax.ArrowFunction:
          if (!arrowFunctions) continue;
        case Syntax.CallSignature:
        case Syntax.Constructor:
        case Syntax.ConstructSignature:
        case Syntax.EnumDeclaration:
        case Syntax.FunctionDeclaration:
        case Syntax.FunctionExpression:
        case Syntax.GetAccessor:
        case Syntax.IndexSignature:
        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
        case Syntax.ModuleDeclaration:
        case Syntax.PropertyDeclaration:
        case Syntax.PropertySignature:
        case Syntax.SetAccessor:
        case Syntax.SourceFile:
          return n;
      }
    }
  }
  newTargetContainer(n: Node) {
    const c = this.thisContainer(n, false);
    switch (c?.kind) {
      case Syntax.Constructor:
      case Syntax.FunctionDeclaration:
      case Syntax.FunctionExpression:
        return c;
    }
    return;
  }
  superContainer(n: Node | undefined, stopOnFunctions: boolean): Node | undefined {
    while (true) {
      n = n?.parent as Node | undefined;
      if (!n) return n;
      switch (n.kind) {
        case Syntax.ComputedPropertyName:
          n = n.parent as Node | undefined;
          break;
        case Syntax.ArrowFunction:
        case Syntax.FunctionDeclaration:
        case Syntax.FunctionExpression:
          if (!stopOnFunctions) continue;
        case Syntax.Constructor:
        case Syntax.GetAccessor:
        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
        case Syntax.PropertyDeclaration:
        case Syntax.PropertySignature:
        case Syntax.SetAccessor:
          return n;
        case Syntax.Decorator:
          const p = n.parent as Node | undefined;
          if (is.kind(qc.ParameterDeclaration, p) && is.classElement(p.parent)) n = p.parent;
          else if (p && is.classElement(p)) n = p;
          break;
      }
    }
  }
  immediatelyInvokedFunctionExpression(n: Node): qc.CallExpression | undefined {
    if (is.kind(qc.FunctionExpression, n) || is.kind(qc.ArrowFunction, n)) {
      let prev = n as Node;
      let p = n.parent as Node | undefined;
      while (p?.kind === Syntax.ParenthesizedExpression) {
        prev = p as Node;
        p = p.parent as Node | undefined;
      }
      if (is.kind(qc.CallExpression, p) && p.expression === prev) return p;
    }
    return;
  }
  enclosingBlockScopeContainer(n: Node): Node {
    return Node.findAncestor(n.parent, (x) => is.blockScope(x, x.parent))!;
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
    if (!qb.isSynthesized(n) && n.parent && !((is.kind(NumericLiteral, n) && n.numericLiteralFlags & TokenFlags.ContainsSeparator) || is.kind(BigIntLiteral, n)))
      return getSourceTextOfNodeFromSourceFile(sourceFile, n);
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
      case Syntax.BigIntLiteral:
      case Syntax.NumericLiteral:
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
    if (is.kind(BindingElement, n)) n = walkUpBindingElementsAndPatterns(n);
    let flags = getFlags(n);
    if (is.kind(qc.VariableDeclaration, n)) n = n.parent;
    if (n && is.kind(qc.VariableDeclarationList, n)) {
      flags |= getFlags(n);
      n = n.parent;
    }
    if (n && is.kind(qc.VariableStatement, n)) flags |= getFlags(n);
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
    if (is.kind(PropertyAssignment, n.parent) || is.kind(BindingElement, n.parent)) return n.parent.name;
    if (is.kind(BinaryExpression, n.parent) && n === n.parent.right) {
      if (is.kind(qc.Identifier, n.parent.left)) return n.parent.left;
      if (isAccessExpression(n.parent.left)) return getElementOrPropertyAccessArgumentExpressionOrName(n.parent.left);
    } else if (is.kind(VariableDeclaration, n.parent) && is.kind(qc.Identifier, n.parent.name)) return n.parent.name;
    return;
  }
  getLastChild(n: Node): Node | undefined {
    let last: Node | undefined;
    forEach.child(
      n,
      (c) => {
        if (is.present(c)) last = c;
      },
      (cs) => {
        for (let i = cs.length - 1; i >= 0; i--) {
          if (is.present(cs[i])) {
            last = cs[i];
            break;
          }
        }
      }
    );
    return last;
  }
  getRootDeclaration(n?: Node): Node | undefined {
    while (n?.kind === Syntax.BindingElement) {
      n = n.parent?.parent;
    }
    return n;
  }
  getSelectedEffectiveModifierFlags(n: Node, f: ModifierFlags): ModifierFlags {
    return getEffectiveModifierFlags(n) & f;
  }
  getSelectedSyntacticModifierFlags(n: Node, f: ModifierFlags): ModifierFlags {
    return getSyntacticModifierFlags(n) & f;
  }
  getModifierFlagsWorker(n: Node, includeDoc: boolean): ModifierFlags {
    if (n.kind >= Syntax.FirstToken && n.kind <= Syntax.LastToken) return ModifierFlags.None;
    if (!(n.modifierFlagsCache & ModifierFlags.HasComputedFlags)) {
      n.modifierFlagsCache = getSyntacticModifierFlagsNoCache(n) | ModifierFlags.HasComputedFlags;
    }
    if (includeDoc && !(n.modifierFlagsCache & ModifierFlags.HasComputedDocModifiers) && isInJSFile(n) && n.parent) {
      n.modifierFlagsCache |= qc.getDoc.modifierFlagsNoCache(n) | ModifierFlags.HasComputedDocModifiers;
    }
    return n.modifierFlagsCache & ~(ModifierFlags.HasComputedFlags | ModifierFlags.HasComputedDocModifiers);
  }
  getEffectiveModifierFlags(n: Node): ModifierFlags {
    return getModifierFlagsWorker(n, true);
  }
  getSyntacticModifierFlags(n: Node): ModifierFlags {
    return getModifierFlagsWorker(n, false);
  }
  getEffectiveModifierFlagsNoCache(n: Node): ModifierFlags {
    return getSyntacticModifierFlagsNoCache(n) | qc.getDoc.modifierFlagsNoCache(n);
  }
  getSyntacticModifierFlagsNoCache(n: Node): ModifierFlags {
    let flags = modifiersToFlags(n.modifiers);
    if (n.flags & NodeFlags.NestedNamespace || (n.kind === Syntax.Identifier && (<Identifier>n).isInDocNamespace)) {
      flags |= ModifierFlags.Export;
    }
    return flags;
  }
  getEffectiveTypeAnnotationNode(n: Node): TypeNode | undefined {
    if (!isInJSFile(node) && is.kind(FunctionDeclaration, node)) return;
    const type = (node as HasType).type;
    if (type || !isInJSFile(node)) return type;
    return qc.isDoc.propertyLikeTag(node) ? node.typeExpression && node.typeExpression.type : qc.getDoc.type(node);
  }
  getTypeAnnotationNode(n: Node): TypeNode | undefined {
    return (node as HasType).type;
  }
  getDeclarationFromName(name: Node): Declaration | undefined {
    const parent = name.parent;
    switch (name.kind) {
      case Syntax.StringLiteral:
      case Syntax.NoSubstitutionLiteral:
      case Syntax.NumericLiteral:
        if (is.kind(ComputedPropertyName, parent)) return parent.parent;
      case Syntax.Identifier:
        if (is.declaration(parent)) return parent.name === name ? parent : undefined;
        else if (is.kind(QualifiedName, parent)) {
          const tag = parent.parent;
          return is.kind(DocParameterTag, tag) && tag.name === parent ? tag : undefined;
        } else {
          const binExp = parent.parent;
          return is.kind(BinaryExpression, binExp) &&
            getAssignmentDeclarationKind(binExp) !== AssignmentDeclarationKind.None &&
            (binExp.left.symbol || binExp.symbol) &&
            getNameOfDeclaration(binExp) === name
            ? binExp
            : undefined;
        }
      case Syntax.PrivateIdentifier:
        return is.declaration(parent) && parent.name === name ? parent : undefined;
      default:
        return;
    }
  }
  getAssignmentTargetKind(n: Node): AssignmentKind {
    let parent = node.parent;
    while (true) {
      switch (parent.kind) {
        case Syntax.BinaryExpression:
          const binaryOperator = (<BinaryExpression>parent).operatorToken.kind;
          return syntax.is.assignmentOperator(binaryOperator) && (<BinaryExpression>parent).left === node
            ? binaryOperator === Syntax.EqualsToken
              ? AssignmentKind.Definite
              : AssignmentKind.Compound
            : AssignmentKind.None;
        case Syntax.PrefixUnaryExpression:
        case Syntax.PostfixUnaryExpression:
          const unaryOperator = (<PrefixUnaryExpression | PostfixUnaryExpression>parent).operator;
          return unaryOperator === Syntax.Plus2Token || unaryOperator === Syntax.Minus2Token ? AssignmentKind.Compound : AssignmentKind.None;
        case Syntax.ForInStatement:
        case Syntax.ForOfStatement:
          return (<ForInOrOfStatement>parent).initializer === node ? AssignmentKind.Definite : AssignmentKind.None;
        case Syntax.ParenthesizedExpression:
        case Syntax.ArrayLiteralExpression:
        case Syntax.SpreadElement:
        case Syntax.NonNullExpression:
          node = parent;
          break;
        case Syntax.ShorthandPropertyAssignment:
          if ((parent as ShorthandPropertyAssignment).name !== node) return AssignmentKind.None;
          node = parent.parent;
          break;
        case Syntax.PropertyAssignment:
          if ((parent as ShorthandPropertyAssignment).name === node) return AssignmentKind.None;
          node = parent.parent;
          break;
        default:
          return AssignmentKind.None;
      }
      parent = node.parent;
    }
  }
  getHostSignatureFromDoc(n: Node): SignatureDeclaration | undefined {
    const host = getEffectiveDocHost(node);
    return host && is.functionLike(host) ? host : undefined;
  }
  getEffectiveDocHost(n: Node): Node | undefined {
    const host = qc.getDoc.host(node);
    const decl =
      getSourceOfDefaultedAssignment(host) ||
      getSourceOfAssignment(host) ||
      getSingleInitializerOfVariableStatementOrPropertyDeclaration(host) ||
      getSingleVariableOfVariableStatement(host) ||
      getNestedModuleDeclaration(host) ||
      host;
    return decl;
  }
  getSourceOfAssignment(n: Node): Node | undefined {
    return is.kind(ExpressionStatement, node) && is.kind(BinaryExpression, node.expression) && node.expression.operatorToken.kind === Syntax.EqualsToken
      ? getRightMostAssignedExpression(node.expression)
      : undefined;
  }
  getSourceOfDefaultedAssignment(n: Node): Node | undefined {
    return is.kind(ExpressionStatement, node) &&
      is.kind(BinaryExpression, node.expression) &&
      getAssignmentDeclarationKind(node.expression) !== AssignmentDeclarationKind.None &&
      is.kind(BinaryExpression, node.expression.right) &&
      (node.expression.right.operatorToken.kind === Syntax.Bar2Token || node.expression.right.operatorToken.kind === Syntax.Question2Token)
      ? node.expression.right.right
      : undefined;
  }
  getSingleInitializerOfVariableStatementOrPropertyDeclaration(n: Node): Expression | undefined {
    switch (n.kind) {
      case Syntax.VariableStatement:
        const v = getSingleVariableOfVariableStatement(node);
        return v && v.initializer;
      case Syntax.PropertyDeclaration:
        return (node as PropertyDeclaration).initializer;
      case Syntax.PropertyAssignment:
        return (node as PropertyAssignment).initializer;
    }
  }
  getSingleVariableOfVariableStatement(n: Node): VariableDeclaration | undefined {
    return is.kind(VariableStatement, node) ? firstOrUndefined(node.declarationList.declarations) : undefined;
  }
  getNestedModuleDeclaration(n: Node): Node | undefined {
    return is.kind(ModuleDeclaration, node) && node.body && node.body.kind === Syntax.ModuleDeclaration ? node.body : undefined;
  }
  getAncestor(n: Node | undefined, kind: Syntax): Node | undefined {
    while (node) {
      if (n.kind === kind) return node;
      node = node.parent;
    }
    return;
  }
  getAllSuperTypeNodes(n: Node): readonly TypeNode[] {
    return is.kind(InterfaceDeclaration, node)
      ? getInterfaceBaseTypeNodes(node) || emptyArray
      : is.classLike(node)
      ? concatenate(singleElementArray(getEffectiveBaseTypeNode(node)), getEffectiveImplementsTypeNodes(node)) || emptyArray
      : emptyArray;
  }
  getExternalModuleImportEqualsDeclarationExpression(n: Node) {
    assert(is.externalModuleImportEqualsDeclaration(node));
    return (<ExternalModuleReference>(<ImportEqualsDeclaration>node).moduleReference).expression;
  }
  getDeclarationOfExpando(n: Node): Node | undefined {
    if (!node.parent) {
      return;
    }
    let name: Expression | BindingName | undefined;
    let decl: Node | undefined;
    if (is.kind(VariableDeclaration, node.parent) && node.parent.initializer === node) {
      if (!isInJSFile(node) && !isVarConst(node.parent)) {
        return;
      }
      name = node.parent.name;
      decl = node.parent;
    } else if (is.kind(node.parent, BinaryExpression)) {
      const parentNode = node.parent;
      const parentNodeOperator = node.parent.operatorToken.kind;
      if (parentNodeOperator === Syntax.EqualsToken && parentNode.right === node) {
        name = parentNode.left;
        decl = name;
      } else if (parentNodeOperator === Syntax.Bar2Token || parentNodeOperator === Syntax.Question2Token) {
        if (is.kind(VariableDeclaration, parentNode.parent) && parentNode.parent.initializer === parentNode) {
          name = parentNode.parent.name;
          decl = parentNode.parent;
        } else if (is.kind(parentNode.parent, BinaryExpression) && parentNode.parent.operatorToken.kind === Syntax.EqualsToken && parentNode.parent.right === parentNode) {
          name = parentNode.parent.left;
          decl = name;
        }
        if (!name || !isBindableStaticNameExpression(name) || !isSameEntityName(name, parentNode.left)) {
          return;
        }
      }
    }
    if (!name || !getExpandoInitializer(node, isPrototypeAccess(name))) {
      return;
    }
    return decl;
  }
})();
export const getDoc = new (class {
  augmentsTag(n: Node): qt.DocAugmentsTag | undefined {
    return this.firstTag(n, (n) => is.kind(DocAugmentsTag, n));
  }
  implementsTags(n: Node): readonly qt.DocImplementsTag[] {
    return this.allTags(n, isDocImplementsTag);
  }
  classTag(n: Node): qt.DocClassTag | undefined {
    return this.firstTag(n, isDocClassTag);
  }
  publicTag(n: Node): qt.DocPublicTag | undefined {
    return this.firstTag(n, isDocPublicTag);
  }
  publicTagNoCache(n: Node): qt.DocPublicTag | undefined {
    return this.firstTag(n, isDocPublicTag, true);
  }
  privateTag(n: Node): qt.DocPrivateTag | undefined {
    return this.firstTag(n, isDocPrivateTag);
  }
  privateTagNoCache(n: Node): qt.DocPrivateTag | undefined {
    return this.firstTag(n, isDocPrivateTag, true);
  }
  protectedTag(n: Node): qt.DocProtectedTag | undefined {
    return this.firstTag(n, isDocProtectedTag);
  }
  protectedTagNoCache(n: Node): qt.DocProtectedTag | undefined {
    return this.firstTag(n, isDocProtectedTag, true);
  }
  readonlyTag(n: Node): qt.DocReadonlyTag | undefined {
    return this.firstTag(n, isDocReadonlyTag);
  }
  readonlyTagNoCache(n: Node): qt.DocReadonlyTag | undefined {
    return this.firstTag(n, isDocReadonlyTag, true);
  }
  enumTag(n: Node): qt.DocEnumTag | undefined {
    return this.firstTag(n, isDocEnumTag);
  }
  thisTag(n: Node): qt.DocThisTag | undefined {
    return this.firstTag(n, isDocThisTag);
  }
  returnTag(n: Node): qt.DocReturnTag | undefined {
    return this.firstTag(n, isDocReturnTag);
  }
  templateTag(n: Node): qt.DocTemplateTag | undefined {
    return this.firstTag(n, isDocTemplateTag);
  }
  typeTag(n: Node): qt.DocTypeTag | undefined {
    const tag = this.firstTag(n, isDocTypeTag);
    if (tag && tag.typeExpression && tag.typeExpression.type) return tag;
    return;
  }
  type(n: Node): qc.TypeNode | undefined {
    let tag: qt.DocTypeTag | qt.DocParameterTag | undefined = this.firstTag(n, isDocTypeTag);
    if (!tag && is.kind(ParameterDeclaration, n)) tag = qb.find(this.parameterTags(n), (tag) => !!tag.typeExpression);
    return tag && tag.typeExpression && tag.typeExpression.type;
  }
  returnType(n: Node): qc.TypeNode | undefined {
    const returnTag = this.returnTag(n);
    if (returnTag && returnTag.typeExpression) return returnTag.typeExpression.type;
    const typeTag = this.typeTag(n);
    if (typeTag && typeTag.typeExpression) {
      const type = typeTag.typeExpression.type;
      if (is.kind(TypeLiteralNode, type)) {
        const sig = qb.find(type.members, CallSignatureDeclaration.kind);
        return sig && sig.type;
      }
      if (is.kind(FunctionTypeNode, type) || is.kind(DocFunctionType, type)) return type.type;
    }
    return;
  }
  tagsWorker(n: Node, noCache?: boolean): readonly qt.DocTag[] {
    let tags = (n as qt.DocContainer).docCache;
    if (tags === undefined || noCache) {
      const comments = this.commentsAndTags(n, noCache);
      qb.assert(comments.length < 2 || comments[0] !== comments[1]);
      tags = qb.flatMap(comments, (j) => (is.kind(Doc, j) ? j.tags : j));
      if (!noCache) (n as qt.DocContainer).docCache = tags;
    }
    return tags;
  }
  tags(n: Node): readonly qt.DocTag[] {
    return this.tagsWorker(n, false);
  }
  tagsNoCache(n: Node): readonly qt.DocTag[] {
    return this.tagsWorker(n, true);
  }
  firstTag<T extends qt.DocTag>(n: Node, cb: (t: qt.DocTag) => t is T, noCache?: boolean): T | undefined {
    return qb.find(this.tagsWorker(n, noCache), cb);
  }
  allTags<T extends qt.DocTag>(n: Node, cb: (t: qt.DocTag) => t is T): readonly T[] {
    return this.tags(n).filter(cb);
  }
  allTagsOfKind(n: Node, k: Syntax): readonly qt.DocTag[] {
    return this.tags(n).filter((t) => t.kind === k);
  }
  parameterTagsWorker(param: qc.ParameterDeclaration, noCache?: boolean): readonly qt.DocParameterTag[] {
    if (param.name) {
      if (is.kind(qc.Identifier, param.name)) {
        const name = param.name.escapedText;
        return Node.getDoc
          .tagsWorker(param.parent, noCache)
          .filter((tag): tag is qt.DocParameterTag => is.kind(DocParameterTag, tag) && is.kind(qc.Identifier, tag.name) && tag.name.escapedText === name);
      } else {
        const i = param.parent.parameters.indexOf(param);
        qb.assert(i > -1, "Parameters should always be in their parents' parameter list");
        const paramTags = this.tagsWorker(param.parent, noCache).filter(isDocParameterTag);
        if (i < paramTags.length) return [paramTags[i]];
      }
    }
    return qb.empty;
  }
  parameterTags(param: qc.ParameterDeclaration): readonly qt.DocParameterTag[] {
    return this.parameterTagsWorker(param, false);
  }
  parameterTagsNoCache(param: qc.ParameterDeclaration): readonly qt.DocParameterTag[] {
    return this.parameterTagsWorker(param, true);
  }
  typeParameterTagsWorker(param: qc.TypeParameterDeclaration, noCache?: boolean): readonly qt.DocTemplateTag[] {
    const name = param.name.escapedText;
    return Node.getDoc.tagsWorker(param.parent, noCache).filter((tag): tag is qt.DocTemplateTag => is.kind(DocTemplateTag, tag) && tag.typeParameters.some((tp) => tp.name.escapedText === name));
  }
  typeParameterTags(param: qc.TypeParameterDeclaration): readonly qt.DocTemplateTag[] {
    return this.typeParameterTagsWorker(param, false);
  }
  typeParameterTagsNoCache(param: qc.TypeParameterDeclaration): readonly qt.DocTemplateTag[] {
    return this.typeParameterTagsWorker(param, true);
  }
  withParameterTags(n: qc.FunctionLikeDeclaration | qc.SignatureDeclaration) {
    return !!this.firstTag(n, isDocParameterTag);
  }
  nameOfTypedef(declaration: qt.DocTypedefTag): qc.Identifier | qc.PrivateIdentifier | undefined {
    return declaration.name || nameForNamelessDocTypedef(declaration);
  }
  commentRanges(n: Node, text: string) {
    const commentRanges =
      is.kind(qc.Parameter, n) || is.kind(qc.TypeParameter, n) || is.kind(qc.FunctionExpression, n) || is.kind(qc.ArrowFunction, n) || is.kind(qc.ParenthesizedExpression, n)
        ? concatenate(qy.get.trailingCommentRanges(text, n.pos), qy.get.leadingCommentRanges(text, n.pos))
        : qy.get.leadingCommentRanges(text, n.pos);
    return filter(commentRanges, (c) => text.charCodeAt(c.pos + 1) === Codes.asterisk && text.charCodeAt(c.pos + 2) === Codes.asterisk && text.charCodeAt(c.pos + 3) !== Codes.slash);
  }
  commentsAndTags(host: Node, noCache?: boolean): readonly (Doc | qt.DocTag)[] {
    let r: (Doc | qt.DocTag)[] | undefined;
    if (is.variableLike(host) && is.withInitializer(host) && is.withDocNodes(host.initializer!)) {
      r = append(r, last((host.initializer as HasDoc).doc!));
    }
    let n: Node | undefined = host;
    while (n && n.parent) {
      if (is.withDocNodes(n)) r = append(r, last(n.doc!));
      if (is.kind(qc.Parameter, n)) {
        r = addRange(r, (noCache ? this.parameterTagsNoCache : this.parameterTags)(n as ParameterDeclaration));
        break;
      }
      if (is.kind(qc.TypeParameter, n)) {
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
      (parent.kind === Syntax.ExpressionStatement && is.kind(qc.PropertyAccessExpression, n)) ||
      getNestedModuleDeclaration(parent) ||
      (is.kind(BinaryExpression, n) && n.operatorToken.kind === Syntax.EqualsToken)
    ) {
      return parent;
    } else if (parent.parent && (getSingleVariableOfVariableStatement(parent.parent) === n || (is.kind(BinaryExpression, parent) && parent.operatorToken.kind === Syntax.EqualsToken))) {
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
  host(n: Node): HasDoc {
    return Debug.checkDefined(Node.findAncestor(n.parent, isDoc)).parent;
  }
  typeParameterDeclarations(n: DeclarationWithTypeParameters): readonly TypeParameterDeclaration[] {
    return qb.flatMap(this.tags(n), (tag) => (isNonTypeAliasTemplate(tag) ? tag.typeParameters : undefined));
  }
  modifierFlagsNoCache(n: Node): ModifierFlags {
    let flags = ModifierFlags.None;
    if (isInJSFile(n) && !!n.parent && !is.kind(ParameterDeclaration, n)) {
      if (this.publicTagNoCache(n)) flags |= ModifierFlags.Public;
      if (this.privateTagNoCache(n)) flags |= ModifierFlags.Private;
      if (this.protectedTagNoCache(n)) flags |= ModifierFlags.Protected;
      if (this.readonlyTagNoCache(n)) flags |= ModifierFlags.Readonly;
    }
    return flags;
  }
})();
export const fixme = new (class {
  containsParseError(n: Node) {
    this.aggregateChildData(n);
    return (n.flags & NodeFlags.ThisNodeOrAnySubNodesHasError) !== 0;
  }
  aggregateChildData(n: Node) {
    if (!(n.flags & NodeFlags.HasAggregatedChildData)) {
      const thisNodeOrAnySubNodesHasError = (n.flags & NodeFlags.ThisNodeHasError) !== 0 || forEach.child(n, containsParseError);
      if (thisNodeOrAnySubNodesHasError) n.flags |= NodeFlags.ThisNodeOrAnySubNodesHasError;
      n.flags |= NodeFlags.HasAggregatedChildData;
    }
  }
  nPosToString(n: Node): string {
    const file = get.sourceFileOf(n);
    const loc = qy.get.lineAndCharOf(file, n.pos);
    return `${file.fileName}(${loc.line + 1},${loc.char + 1})`;
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
        if (!qy.is.whiteSpaceLike(line.charCodeAt(i))) break;
      }
      if (i < indentation) indentation = i;
      if (indentation === 0) return 0;
    }
    return indentation === MAX_SMI_X86 ? undefined : indentation;
  }
  hasScopeMarker(ss: readonly qc.Statement[]) {
    return qb.some(ss, isScopeMarker);
  }
  needsScopeMarker(s: qc.Statement) {
    return !is.anyImportOrReExport(s) && !is.kind(qc.ExportAssignment, s) && !hasSyntacticModifier(s, ModifierFlags.Export) && !is.ambientModule(s);
  }
  isExternalModuleIndicator(s: qc.Statement) {
    return is.anyImportOrReExport(s) || is.kind(qc.ExportAssignment, s) || hasSyntacticModifier(s, ModifierFlags.Export);
  }
  isDeclarationBindingElement(e: qc.BindingOrAssignmentElement): e is qc.VariableDeclaration | qc.ParameterDeclaration | qc.BindingElement {
    switch (e.kind) {
      case Syntax.VariableDeclaration:
      case Syntax.Parameter:
      case Syntax.BindingElement:
        return true;
    }
    return false;
  }
  isBindingOrAssignmentPattern(n: qc.BindingOrAssignmentElementTarget): n is qc.BindingOrAssignmentPattern {
    return isObjectBindingOrAssignmentPattern(n) || isArrayBindingOrAssignmentPattern(n);
  }
  isObjectBindingOrAssignmentPattern(n: qc.BindingOrAssignmentElementTarget): n is qc.ObjectBindingOrAssignmentPattern {
    switch (n.kind) {
      case Syntax.ObjectBindingPattern:
      case Syntax.ObjectLiteralExpression:
        return true;
    }
    return false;
  }
  isArrayBindingOrAssignmentPattern(n: qc.BindingOrAssignmentElementTarget): n is qc.ArrayBindingOrAssignmentPattern {
    switch (n.kind) {
      case Syntax.ArrayBindingPattern:
      case Syntax.ArrayLiteralExpression:
        return true;
    }
    return false;
  }
  isOutermostOptionalChain(n: qc.OptionalChain) {
    return !is.optionalChain(n.parent) || is.optionalChainRoot(n.parent) || n !== n.parent.expression;
  }
  isEmptyBindingElement(n: qc.BindingElement) {
    if (is.kind(qc.OmittedExpression, n)) return true;
    return this.isEmptyBindingPattern(n.name);
  }
  isEmptyBindingPattern(n: qc.BindingName): n is qc.BindingPattern {
    if (is.kind(qc.BindingPattern, n)) return qb.every(n.elements, this.isEmptyBindingElement);
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
        if (is.functionLike(current) || is.classLike(current) || current.kind === Syntax.InterfaceDeclaration) return <Declaration>current;
      }
    }
    return;
  }
  walkUpBindingElementsAndPatterns(binding: qc.BindingElement): VariableDeclaration | ParameterDeclaration {
    let n = binding.parent;
    while (is.kind(BindingElement, n.parent)) {
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
        errors.push(createCompilerDiagnostic(qd.Locale_must_be_of_the_form_language_or_language_territory_For_example_0_or_1, 'en', 'ja-jp'));
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
        if (errors) errors.push(createCompilerDiagnostic(qd.Unable_to_open_file_0, filePath));
        return false;
      }
      try {
        setLocalizedDiagnosticMessages(JSON.parse(fileContents!));
      } catch {
        if (errors) errors.push(createCompilerDiagnostic(qd.Corrupted_locale_file_0, filePath));
        return false;
      }
      return true;
    }
  }
  idText(identifierOrPrivateName: qc.Identifier | PrivateIdentifier): string {
    return qy.get.unescUnderscores(identifierOrPrivateName.escapedText);
  }
  nameForNamelessDocTypedef(declaration: qt.DocTypedefTag | qt.DocEnumTag): qc.Identifier | qc.PrivateIdentifier | undefined {
    const n = declaration.parent.parent;
    if (!n) return;
    if (is.declaration(n)) return getDeclarationIdentifier(n);
    switch (n.kind) {
      case Syntax.VariableStatement:
        if (n.declarationList && n.declarationList.declarations[0]) return getDeclarationIdentifier(n.declarationList.declarations[0]);
        break;
      case Syntax.ExpressionStatement:
        let expr = n.expression;
        if (expr.kind === Syntax.BinaryExpression && (expr as BinaryExpression).operatorToken.kind === Syntax.EqualsToken) {
          expr = (expr as BinaryExpression).left;
        }
        switch (expr.kind) {
          case Syntax.PropertyAccessExpression:
            return (expr as qc.PropertyAccessExpression).name;
          case Syntax.ElementAccessExpression:
            const arg = (expr as ElementAccessExpression).argumentExpression;
            if (is.kind(qc.Identifier, arg)) return arg;
        }
        break;
      case Syntax.ParenthesizedExpression: {
        return getDeclarationIdentifier(n.expression);
      }
      case Syntax.LabeledStatement: {
        if (is.declaration(n.statement) || is.expression(n.statement)) return getDeclarationIdentifier(n.statement);
        break;
      }
    }
    return;
  }
  getDeclarationIdentifier(n: Declaration | Expression): qc.Identifier | undefined {
    const name = getNameOfDeclaration(n);
    return name && is.kind(qc.Identifier, name) ? name : undefined;
  }
  getNonAssignedNameOfDeclaration(declaration: Declaration | Expression): DeclarationName | undefined {
    switch (declaration.kind) {
      case Syntax.Identifier:
        return declaration as qc.Identifier;
      case Syntax.DocPropertyTag:
      case Syntax.DocParameterTag: {
        const { name } = declaration as qt.DocPropertyLikeTag;
        if (name.kind === Syntax.QualifiedName) return name.right;
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
      case Syntax.DocTypedefTag:
        return getDoc.nameOfTypedef(declaration as qt.DocTypedefTag);
      case Syntax.DocEnumTag:
        return nameForNamelessDocTypedef(declaration as qt.DocEnumTag);
      case Syntax.ExportAssignment: {
        const { expression } = declaration as ExportAssignment;
        return is.kind(qc.Identifier, expression) ? expression : undefined;
      }
      case Syntax.ElementAccessExpression:
        const expr = declaration as ElementAccessExpression;
        if (isBindableStaticElementAccessExpression(expr)) return expr.argumentExpression;
    }
    return (declaration as NamedDeclaration).name;
  }
  getNameOfDeclaration(declaration: Declaration | Expression): DeclarationName | undefined {
    if (declaration === undefined) return;
    return getNonAssignedNameOfDeclaration(declaration) || (is.kind(FunctionExpression, declaration) || is.kind(ClassExpression, declaration) ? get.assignedName(declaration) : undefined);
  }
  getEffectiveTypeParameterDeclarations(n: DeclarationWithTypeParameters): readonly TypeParameterDeclaration[] {
    if (is.kind(DocSignature, n)) return empty;
    if (isDoc.typeAlias(n)) {
      qb.assert(is.kind(qc.DocComment, n.parent));
      return qb.flatMap(n.parent.tags, (tag) => (is.kind(DocTemplateTag, tag) ? tag.typeParameters : undefined));
    }
    if (n.typeParameters) return n.typeParameters;
    if (isInJSFile(n)) {
      const decls = this.typeParameterDeclarations(n);
      if (decls.length) return decls;
      const typeTag = getDoc.type(n);
      if (typeTag && is.kind(FunctionTypeNode, typeTag) && typeTag.typeParameters) return typeTag.typeParameters;
    }
    return empty;
  }
  getEffectiveConstraintOfTypeParameter(n: qc.TypeParameterDeclaration): qc.TypeNode | undefined {
    return n.constraint ? n.constraint : is.kind(DocTemplateTag, n.parent) && n === n.parent.typeParameters[0] ? n.parent.constraint : undefined;
  }
  skipPartiallyEmittedExpressions(n: Expression): Expression;
  skipPartiallyEmittedExpressions(n: Node): Node;
  skipPartiallyEmittedExpressions(n: Node) {
    return skipOuterExpressions(n, OuterExpressionKinds.PartiallyEmittedExpressions);
  }
})();
export const forEach = new (class {
  ancestor<T>(n: Node, cb: (n: Node) => T | undefined | 'quit'): T | undefined {
    while (n) {
      const r = cb(n);
      if (r === 'quit') return;
      if (r) return r;
      if (is.kind(SourceFile, n)) return;
      n = n.parent;
    }
    return;
  }
  child<T extends Node>(node: Node, cb: (n: Node) => T, cbs?: (ns: Nodes<Node>) => T): T | undefined {
    if (n.kind <= Syntax.LastToken) return;
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
        return n.decorators?.visit(cb, cbs) || n.modifiers?.visit(cb, cbs) || n.dot3Token?.visit(cb) || n.name.visit(cb) || n.questionToken?.visit(cb) || n.type?.visit(cb) || n.initializer?.visit(cb);
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
      case Syntax.DocTypeExpression:
      case Syntax.DocNonNullableType:
      case Syntax.DocNullableType:
      case Syntax.DocOptionalType:
      case Syntax.DocVariadicType:
        return n.type.visit(cb);
      case Syntax.DocFunctionType:
        return n.parameters.visit(cb, cbs) || n.type?.visit(cb);
      case Syntax.DocComment:
        return n.tags?.visit(cb, cbs);
      case Syntax.DocParameterTag:
      case Syntax.DocPropertyTag:
        return n.tagName.visit(cb) || (n.isNameFirst ? n.name.visit(cb) || n.typeExpression?.visit(cb) : n.typeExpression?.visit(cb) || n.name.visit(cb));
      case Syntax.DocAuthorTag:
        return n.tagName.visit(cb);
      case Syntax.DocImplementsTag:
        return n.tagName.visit(cb) || n.class.visit(cb);
      case Syntax.DocAugmentsTag:
        return n.tagName.visit(cb) || n.class.visit(cb);
      case Syntax.DocTemplateTag:
        return n.tagName.visit(cb) || n.constraint?.visit(cb) || n.typeParameters?.visit(cb, cbs);
      case Syntax.DocTypedefTag:
        return (
          n.tagName.visit(cb) ||
          (n.typeExpression && n.typeExpression!.kind === Syntax.DocTypeExpression ? n.typeExpression.visit(cb) || n.fullName?.visit(cb) : n.fullName?.visit(cb) || n.typeExpression?.visit(cb))
        );
      case Syntax.DocCallbackTag:
        const n2 = n as qt.DocCallbackTag;
        return n2.tagName.visit(cb) || n2.fullName?.visit(cb) || n2.typeExpression?.visit(cb);
      case Syntax.DocReturnTag:
      case Syntax.DocTypeTag:
      case Syntax.DocThisTag:
      case Syntax.DocEnumTag:
        const n3 = n as qt.DocReturnTag | qt.DocTypeTag | qt.DocThisTag | qt.DocEnumTag;
        return n3.tagName.visit(cb) || n3.typeExpression?.visit(cb);
      case Syntax.DocSignature:
        return forEach(n.typeParameters, cb) || forEach(n.parameters, cb) || n.type?.visit(cb);
      case Syntax.DocTypeLiteral:
        return forEach(n.docPropertyTags, cb);
      case Syntax.DocTag:
      case Syntax.DocClassTag:
      case Syntax.DocPublicTag:
      case Syntax.DocPrivateTag:
      case Syntax.DocProtectedTag:
      case Syntax.DocReadonlyTag:
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
export abstract class Declaration extends qc.Declaration {
  isBlockOrCatchScoped() {
    return (get.combinedFlagsOf(this) & NodeFlags.BlockScoped) !== 0 || isCatchClauseVariableDeclarationOrBindingElement(this);
  }
  isDeclarationReadonly() {
    return !!(getCombinedModifierFlags(this) & ModifierFlags.Readonly && !is.parameterPropertyDeclaration(this, this.parent));
  }
  getMembersOfDeclaration(): Nodes<qc.ClassElement> | Nodes<qc.TypeElement> | Nodes<qc.ObjectLiteralElement> | undefined {
    const n = this as Node;
    switch (n.kind) {
      case Syntax.InterfaceDeclaration:
      case Syntax.ClassDeclaration:
      case Syntax.ClassExpression:
      case Syntax.TypeLiteral:
        return n.members;
      case Syntax.ObjectLiteralExpression:
        return n.properties;
    }
    return;
  }
  isAssignmentDeclaration() {
    return is.kind(BinaryExpression, this) || isAccessExpression(this) || is.kind(Identifier, this) || is.kind(CallExpression, this);
  }
  getNameOfExpando(): DeclarationName | undefined {
    if (is.kind(BinaryExpression, this.parent)) {
      const parent =
        (this.parent.operatorToken.kind === Syntax.Bar2Token || node.parent.operatorToken.kind === Syntax.Question2Token) && is.kind(BinaryExpression, node.parent.parent)
          ? node.parent.parent
          : node.parent;
      if (parent.operatorToken.kind === Syntax.EqualsToken && is.kind(Identifier, parent.left)) return parent.left;
    } else if (is.kind(VariableDeclaration, node.parent)) {
      return node.parent.name;
    }
  }
  hasDynamicName(): this is DynamicNamedDeclaration | DynamicNamedBinaryExpression {
    const name = getNameOfDeclaration(this);
    return !!name && isDynamicName(name);
  }
  isCatchClauseVariableDeclarationOrBindingElement(this: Declaration) {
    const node = getRootDeclaration(this);
    return n.kind === Syntax.VariableDeclaration && node.parent.kind === Syntax.CatchClause;
  }
  isNotAccessor(this: Declaration) {
    return !is.accessor(this);
  }
  isNotOverload(this: Declaration): boolean {
    return (this.kind !== Syntax.FunctionDeclaration && this.kind !== Syntax.MethodDeclaration) || !!(this as FunctionDeclaration).body;
  }
  getInternalName(allowComments?: boolean, allowSourceMaps?: boolean) {
    return this.getName(allowComments, allowSourceMaps, EmitFlags.LocalName | EmitFlags.InternalName);
  }
  getLocalName(allowComments?: boolean, allowSourceMaps?: boolean) {
    return this.getName(allowComments, allowSourceMaps, EmitFlags.LocalName);
  }
  getExportName(allowComments?: boolean, allowSourceMaps?: boolean): qt.Identifier {
    return this.getName(allowComments, allowSourceMaps, EmitFlags.ExportName);
  }
  getDeclarationName(allowComments?: boolean, allowSourceMaps?: boolean) {
    return this.getName(allowComments, allowSourceMaps);
  }
  getName(allowComments?: boolean, allowSourceMaps?: boolean, emitFlags: EmitFlags = 0) {
    const nodeName = getNameOfDeclaration(this);
    if (nodeName && is.kind(Identifier, nodeName) && !is.generatedIdentifier(nodeName)) {
      const name = getMutableClone(nodeName);
      emitFlags |= qc.get.emitFlags(nodeName);
      if (!allowSourceMaps) emitFlags |= EmitFlags.NoSourceMap;
      if (!allowComments) emitFlags |= EmitFlags.NoComments;
      if (emitFlags) setEmitFlags(name, emitFlags);
      return name;
    }
    return getGeneratedNameForNode(this);
  }
  getExternalModuleOrNamespaceExportName(s: qt.Identifier | undefined, allowComments?: boolean, allowSourceMaps?: boolean): qt.Identifier | qt.PropertyAccessExpression {
    if (s && hasSyntacticModifier(this, ModifierFlags.Export)) return getNamespaceMemberName(s, getName(this), allowComments, allowSourceMaps);
    return this.getExportName(allowComments, allowSourceMaps);
  }
}
export abstract class Expression extends qc.Expression {
  createExpressionFromEntityName(node: EntityName | Expression): Expression {
    if (is.kind(QualifiedName, node)) {
      const left = createExpressionFromEntityName(node.left);
      const right = getMutableClone(node.right);
      return setRange(new qt.PropertyAccessExpression(left, right), node);
    }
    return getMutableClone(node);
  }
  createExpressionForPropertyName(memberName: Exclude<qt.PropertyName, qt.PrivateIdentifier>): Expression {
    if (is.kind(Identifier, memberName)) return qc.asLiteral(memberName);
    else if (is.kind(ComputedPropertyName, memberName)) return getMutableClone(memberName.expression);
    return getMutableClone(memberName);
  }
  createExpressionForObjectLiteralElementLike(node: qt.ObjectLiteralExpression, property: qt.ObjectLiteralElementLike, receiver: Expression): Expression | undefined {
    if (property.name && is.kind(PrivateIdentifier, property.name)) qg.failBadSyntax(property.name, 'Private identifiers are not allowed in object literals.');
    function createExpressionForAccessorDeclaration(
      properties: Nodes<Declaration>,
      property: AccessorDeclaration & { name: Exclude<PropertyName, qt.PrivateIdentifier> },
      receiver: Expression,
      multiLine: boolean
    ) {
      const { firstAccessor, getAccessor, setAccessor } = getAllAccessorDeclarations(properties, property);
      if (property === firstAccessor) {
        const properties: ObjectLiteralElementLike[] = [];
        if (getAccessor) {
          const getterFunction = new FunctionExpression(getAccessor.modifiers, undefined, undefined, undefined, getAccessor.parameters, undefined, getAccessor.body!);
          setRange(getterFunction, getAccessor);
          getterFunction.setOriginal(getAccessor);
          const getter = new qc.PropertyAssignment('get', getterFunction);
          properties.push(getter);
        }
        if (setAccessor) {
          const setterFunction = new FunctionExpression(setAccessor.modifiers, undefined, undefined, undefined, setAccessor.parameters, undefined, setAccessor.body!);
          setRange(setterFunction, setAccessor);
          setterFunction.setOriginal(setAccessor);
          const setter = new qc.PropertyAssignment('set', setterFunction);
          properties.push(setter);
        }
        properties.push(new qc.PropertyAssignment('enumerable', getAccessor || setAccessor ? new qc.BooleanLiteral(false) : new qc.BooleanLiteral(true)));
        properties.push(new qc.PropertyAssignment('configurable', new qc.BooleanLiteral(true)));
        const expression = setRange(
          new CallExpression(new qt.PropertyAccessExpression(new Identifier('Object'), 'defineProperty'), undefined, [
            receiver,
            createExpressionForPropertyName(property.name),
            new qc.ObjectLiteralExpression(properties, multiLine),
          ]),
          firstAccessor
        );
        return aggregateTransformFlags(expression);
      }
      return;
    }
    function createExpressionForPropertyAssignment(property: PropertyAssignment, receiver: Expression) {
      return aggregateTransformFlags(setRange(createAssignment(createMemberAccessForPropertyName(receiver, property.name, property.name), property.initializer), property).setOriginal(property));
    }
    function createExpressionForShorthandPropertyAssignment(property: ShorthandPropertyAssignment, receiver: Expression) {
      return aggregateTransformFlags(
        setRange(createAssignment(createMemberAccessForPropertyName(receiver, property.name, property.name), getSynthesizedClone(property.name)), property).setOriginal(property)
      );
    }
    function createExpressionForMethodDeclaration(method: MethodDeclaration, receiver: Expression) {
      return aggregateTransformFlags(
        setOriginalNode(
          setRange(
            createAssignment(
              createMemberAccessForPropertyName(receiver, method.name, method.name),
              setRange(new FunctionExpression(method.modifiers, method.asteriskToken, undefined, undefined, method.parameters, undefined, method.body!), method).setOriginal(method)
            ),
            method
          ),
          method
        )
      );
    }
    switch (property.kind) {
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        return createExpressionForAccessorDeclaration(node.properties, property as typeof property & { name: Exclude<PropertyName, qt.PrivateIdentifier> }, receiver, !!node.multiLine);
      case Syntax.PropertyAssignment:
        return createExpressionForPropertyAssignment(property, receiver);
      case Syntax.ShorthandPropertyAssignment:
        return createExpressionForShorthandPropertyAssignment(property, receiver);
      case Syntax.MethodDeclaration:
        return createExpressionForMethodDeclaration(property, receiver);
    }
    return;
  }
  createTypeCheck(value: Expression, tag: TypeOfTag) {
    return tag === 'undefined' ? createStrictEquality(value, VoidExpression.zero()) : createStrictEquality(new TypeOfExpression(value), qc.asLiteral(tag));
  }
  createMemberAccessForPropertyName(target: Expression, memberName: qt.PropertyName, location?: TextRange): MemberExpression {
    if (is.kind(ComputedPropertyName, memberName)) return setRange(new ElementAccessExpression(target, memberName.expression), location);
    else {
      const expression = setRange(
        is.kind(Identifier, memberName) || is.kind(PrivateIdentifier, memberName) ? new qt.PropertyAccessExpression(target, memberName) : new ElementAccessExpression(target, memberName),
        memberName
      );
      getOrCreateEmitNode(expression).flags |= EmitFlags.NoNestedSourceMaps;
      return expression;
    }
  }
  createFunctionCall(func: Expression, thisArg: Expression, argumentsList: readonly Expression[], location?: TextRange) {
    return setRange(new CallExpression(new qt.PropertyAccessExpression(func, 'call'), undefined, [thisArg, ...argumentsList]), location);
  }
  createFunctionApply(func: Expression, thisArg: Expression, argumentsExpression: Expression, location?: TextRange) {
    return setRange(new CallExpression(new qt.PropertyAccessExpression(func, 'apply'), undefined, [thisArg, argumentsExpression]), location);
  }
  createArraySlice(array: Expression, start?: number | Expression) {
    const argumentsList: Expression[] = [];
    if (start !== undefined) argumentsList.push(typeof start === 'number' ? qc.asLiteral(start) : start);
    return new CallExpression(new qt.PropertyAccessExpression(array, 'slice'), undefined, argumentsList);
  }
  createArrayConcat(array: Expression, values: readonly Expression[]) {
    return new CallExpression(new qt.PropertyAccessExpression(array, 'concat'), undefined, values);
  }
  createMathPow(left: Expression, right: Expression, location?: TextRange) {
    return setRange(new CallExpression(new qt.PropertyAccessExpression(new Identifier('Math'), 'pow'), undefined, [left, right]), location);
  }
  getLeftmostExpression(node: Expression, stopAtCallExpressions: boolean) {
    while (true) {
      switch (n.kind) {
        case Syntax.PostfixUnaryExpression:
          node = (<PostfixUnaryExpression>node).operand;
          continue;
        case Syntax.BinaryExpression:
          node = (<BinaryExpression>node).left;
          continue;
        case Syntax.ConditionalExpression:
          node = (<ConditionalExpression>node).condition;
          continue;
        case Syntax.TaggedTemplateExpression:
          node = (<TaggedTemplateExpression>node).tag;
          continue;
        case Syntax.CallExpression:
          if (stopAtCallExpressions) return node;
        case Syntax.AsExpression:
        case Syntax.ElementAccessExpression:
        case Syntax.PropertyAccessExpression:
        case Syntax.NonNullExpression:
        case Syntax.PartiallyEmittedExpression:
          node = (<CallExpression | PropertyAccessExpression | ElementAccessExpression | AsExpression | NonNullExpression | PartiallyEmittedExpression>node).expression;
          continue;
      }
      return node;
    }
  }
  isCommaSequence(): this is (BinaryExpression & { operatorToken: Token<Syntax.CommaToken> }) | CommaListExpression {
    return (this.kind === Syntax.BinaryExpression && (<BinaryExpression>this).operatorToken.kind === Syntax.CommaToken) || this.kind === Syntax.CommaListExpression;
  }
}
export abstract class Statement extends qc.Statement {
  isUseStrictPrologue(node: qt.ExpressionStatement): boolean {
    return is.kind(StringLiteral, node.expression) && node.expression.text === 'use strict';
  }
  addPrologue(target: Statement[], source: readonly Statement[], ensureUseStrict?: boolean, visitor?: (node: Nobj) => VisitResult<Nobj>): number {
    const offset = addStandardPrologue(target, source, ensureUseStrict);
    return addCustomPrologue(target, source, offset, visitor);
  }
  addStandardPrologue(target: Statement[], source: readonly Statement[], ensureUseStrict?: boolean): number {
    qb.assert(target.length === 0, 'Prologue directives should be at the first statement in the target statements array');
    let foundUseStrict = false;
    let statementOffset = 0;
    const numStatements = source.length;
    while (statementOffset < numStatements) {
      const statement = source[statementOffset];
      if (is.prologueDirective(statement)) {
        if (isUseStrictPrologue(statement)) foundUseStrict = true;
        target.push(statement);
      } else {
        break;
      }
      statementOffset++;
    }
    if (ensureUseStrict && !foundUseStrict) target.push(startOnNewLine(new qt.ExpressionStatement(qc.asLiteral('use strict'))));
    return statementOffset;
  }
  addCustomPrologue(target: Statement[], source: readonly Statement[], statementOffset: number, visitor?: (node: Nobj) => VisitResult<Nobj>, filter?: (node: Nobj) => boolean): number;
  addCustomPrologue(
    target: Statement[],
    source: readonly Statement[],
    statementOffset: number | undefined,
    visitor?: (node: Nobj) => VisitResult<Nobj>,
    filter?: (node: Nobj) => boolean
  ): number | undefined;
  addCustomPrologue(
    target: Statement[],
    source: readonly Statement[],
    statementOffset: number | undefined,
    visitor?: (node: Nobj) => VisitResult<Nobj>,
    filter: (node: Nobj) => boolean = () => true
  ): number | undefined {
    const numStatements = source.length;
    while (statementOffset !== undefined && statementOffset < numStatements) {
      const statement = source[statementOffset];
      if (qc.get.emitFlags(statement) & EmitFlags.CustomPrologue && filter(statement)) append(target, visitor ? visitNode(statement, visitor, isStatement) : statement);
      else break;
      statementOffset++;
    }
    return statementOffset;
  }
  findUseStrictPrologue(statements: readonly Statement[]): Statement | undefined {
    for (const statement of statements) {
      if (is.prologueDirective(statement)) {
        if (isUseStrictPrologue(statement)) return statement;
      } else break;
    }
    return;
  }
  startsWithUseStrict(statements: readonly Statement[]) {
    const firstStatement = firstOrUndefined(statements);
    return firstStatement !== undefined && is.prologueDirective(firstStatement) && isUseStrictPrologue(firstStatement);
  }
  createForOfBindingStatement(node: ForInitializer, boundValue: Expression): Statement {
    if (is.kind(VariableDeclarationList, node)) {
      const firstDeclaration = first(node.declarations);
      const updatedDeclaration = firstDeclaration.update(firstDeclaration.name, undefined, boundValue);
      return setRange(new qc.VariableStatement(undefined, node.update([updatedDeclaration])), node);
    } else {
      const updatedExpression = setRange(createAssignment(node, boundValue), node);
      return setRange(new qt.ExpressionStatement(updatedExpression), node);
    }
  }
  insertLeadingStatement(dest: Statement, source: Statement) {
    if (is.kind(Block, dest)) return dest.update(setRange(new Nodes([source, ...dest.statements]), dest.statements));
    return new Block(new Nodes([dest, source]), true);
  }
  restoreEnclosingLabel(node: Statement, outermostLabeledStatement: LabeledStatement | undefined, afterRestoreLabelCallback?: (node: LabeledStatement) => void): Statement {
    if (!outermostLabeledStatement) return node;
    const updated = updateLabel(
      outermostLabeledStatement,
      outermostLabeledStatement.label,
      outermostLabeledStatement.statement.kind === Syntax.LabeledStatement ? restoreEnclosingLabel(node, <LabeledStatement>outermostLabeledStatement.statement) : node
    );
    if (afterRestoreLabelCallback) afterRestoreLabelCallback(outermostLabeledStatement);
    return updated;
  }
}
export namespace BindingOrAssignmentElement {
  export function getInitializerOfBindingOrAssignmentElement(e: qc.BindingOrAssignmentElement): qc.Expression | undefined {
    if (isDeclarationBindingElement(e)) {
      // `1` in `let { a = 1 } = ...`
      // `1` in `let { a: b = 1 } = ...`
      // `1` in `let { a: {b} = 1 } = ...`
      // `1` in `let { a: [b] = 1 } = ...`
      // `1` in `let [a = 1] = ...`
      // `1` in `let [{a} = 1] = ...`
      // `1` in `let [[a] = 1] = ...`
      return e.initializer;
    }
    if (qc.is.kind(PropertyAssignment, e)) {
      // `1` in `({ a: b = 1 } = ...)`
      // `1` in `({ a: {b} = 1 } = ...)`
      // `1` in `({ a: [b] = 1 } = ...)`
      const i = e.initializer;
      return isAssignmentExpression(i, true) ? i.right : undefined;
    }
    if (qc.is.kind(ShorthandPropertyAssignment, e)) {
      // `1` in `({ a = 1 } = ...)`
      return e.objectAssignmentInitializer;
    }
    if (isAssignmentExpression(e, true)) {
      // `1` in `[a = 1] = ...`
      // `1` in `[{a} = 1] = ...`
      // `1` in `[[a] = 1] = ...`
      return e.right;
    }
    if (qc.is.kind(SpreadElement, e)) return getInitializerOfBindingOrAssignmentElement(<qc.BindingOrAssignmentElement>e.expression);
    return;
  }
  export function getTargetOfBindingOrAssignmentElement(e: qc.BindingOrAssignmentElement): qc.BindingOrAssignmentElementTarget | undefined {
    if (isDeclarationBindingElement(e)) {
      // `a` in `let { a } = ...`
      // `a` in `let { a = 1 } = ...`
      // `b` in `let { a: b } = ...`
      // `b` in `let { a: b = 1 } = ...`
      // `a` in `let { ...a } = ...`
      // `{b}` in `let { a: {b} } = ...`
      // `{b}` in `let { a: {b} = 1 } = ...`
      // `[b]` in `let { a: [b] } = ...`
      // `[b]` in `let { a: [b] = 1 } = ...`
      // `a` in `let [a] = ...`
      // `a` in `let [a = 1] = ...`
      // `a` in `let [...a] = ...`
      // `{a}` in `let [{a}] = ...`
      // `{a}` in `let [{a} = 1] = ...`
      // `[a]` in `let [[a]] = ...`
      // `[a]` in `let [[a] = 1] = ...`
      return e.name;
    }
    if (qc.is.objectLiteralElementLike(e)) {
      switch (e.kind) {
        case Syntax.PropertyAssignment:
          // `b` in `({ a: b } = ...)`
          // `b` in `({ a: b = 1 } = ...)`
          // `{b}` in `({ a: {b} } = ...)`
          // `{b}` in `({ a: {b} = 1 } = ...)`
          // `[b]` in `({ a: [b] } = ...)`
          // `[b]` in `({ a: [b] = 1 } = ...)`
          // `b.c` in `({ a: b.c } = ...)`
          // `b.c` in `({ a: b.c = 1 } = ...)`
          // `b[0]` in `({ a: b[0] } = ...)`
          // `b[0]` in `({ a: b[0] = 1 } = ...)`
          return getTargetOfBindingOrAssignmentElement(<qc.BindingOrAssignmentElement>e.initializer);
        case Syntax.ShorthandPropertyAssignment:
          // `a` in `({ a } = ...)`
          // `a` in `({ a = 1 } = ...)`
          return e.name;
        case Syntax.SpreadAssignment:
          // `a` in `({ ...a } = ...)`
          return getTargetOfBindingOrAssignmentElement(<qc.BindingOrAssignmentElement>e.expression);
      }
      // no target
      return;
    }
    if (isAssignmentExpression(e, true)) {
      // `a` in `[a = 1] = ...`
      // `{a}` in `[{a} = 1] = ...`
      // `[a]` in `[[a] = 1] = ...`
      // `a.b` in `[a.b = 1] = ...`
      // `a[0]` in `[a[0] = 1] = ...`
      return getTargetOfBindingOrAssignmentElement(<qc.BindingOrAssignmentElement>e.left);
    }
    if (qc.is.kind(SpreadElement, e)) {
      // `a` in `[...a] = ...`
      return getTargetOfBindingOrAssignmentElement(<qc.BindingOrAssignmentElement>e.expression);
    }
    // `a` in `[a] = ...`
    // `{a}` in `[{a}] = ...`
    // `[a]` in `[[a]] = ...`
    // `a.b` in `[a.b] = ...`
    // `a[0]` in `[a[0]] = ...`
    return e;
  }
  export function getRestIndicatorOfBindingOrAssignmentElement(e: qc.BindingOrAssignmentElement): qc.BindingOrAssignmentElementRestIndicator | undefined {
    switch (e.kind) {
      case Syntax.Parameter:
      case Syntax.BindingElement:
        // `...` in `let [...a] = ...`
        return e.dot3Token;
      case Syntax.SpreadElement:
      case Syntax.SpreadAssignment:
        // `...` in `[...a] = ...`
        return e;
    }
    return;
  }
  export function getPropertyNameOfBindingOrAssignmentElement(e: qc.BindingOrAssignmentElement): Exclude<qc.PropertyName, PrivateIdentifier> | undefined {
    const propertyName = tryGetPropertyNameOfBindingOrAssignmentElement(e);
    qb.assert(!!propertyName || qc.is.kind(SpreadAssignment, e));
    return propertyName;
  }
  export function tryGetPropertyNameOfBindingOrAssignmentElement(e: qc.BindingOrAssignmentElement): Exclude<qc.PropertyName, PrivateIdentifier> | undefined {
    switch (e.kind) {
      case Syntax.BindingElement:
        // `a` in `let { a: b } = ...`
        // `[a]` in `let { [a]: b } = ...`
        // `"a"` in `let { "a": b } = ...`
        // `1` in `let { 1: b } = ...`
        if (e.propertyName) {
          const propertyName = e.propertyName;
          if (qc.is.kind(PrivateIdentifier, propertyName)) return qg.failBadSyntax(propertyName);
          return qc.is.kind(ComputedPropertyName, propertyName) && isStringOrNumericLiteral(propertyName.expression) ? propertyName.expression : propertyName;
        }
        break;
      case Syntax.PropertyAssignment:
        // `a` in `({ a: b } = ...)`
        // `[a]` in `({ [a]: b } = ...)`
        // `"a"` in `({ "a": b } = ...)`
        // `1` in `({ 1: b } = ...)`
        if (e.name) {
          const propertyName = e.name;
          if (qc.is.kind(PrivateIdentifier, propertyName)) return qg.failBadSyntax(propertyName);
          return qc.is.kind(ComputedPropertyName, propertyName) && isStringOrNumericLiteral(propertyName.expression) ? propertyName.expression : propertyName;
        }
        break;
      case Syntax.SpreadAssignment:
        // `a` in `({ ...a } = ...)`
        if (e.name && qc.is.kind(PrivateIdentifier, e.name)) return qg.failBadSyntax(e.name);
        return e.name;
    }
    const target = getTargetOfBindingOrAssignmentElement(e);
    if (target && qc.is.propertyName(target)) return target;
    return;
  }
  export function convertToArrayAssignmentElement(e: qc.BindingOrAssignmentElement) {
    if (qc.is.kind(BindingElement, e)) {
      if (e.dot3Token) {
        qg.assertNode(e.name, isIdentifier);
        return new SpreadElement(e.name).setRange(e).setOriginal(e);
      }
      const e2 = convertToAssignmentElementTarget(e.name);
      return e.initializer ? createAssignment(e2, e.initializer).setRange(e).setOriginal(e) : e2;
    }
    qg.assertNode(e, isExpression);
    return <qc.Expression>e;
  }
  export function convertToObjectAssignmentElement(e: qc.BindingOrAssignmentElement) {
    if (qc.is.kind(BindingElement, e)) {
      if (e.dot3Token) {
        qg.assertNode(e.name, isIdentifier);
        return new SpreadAssignment(e.name).setRange(e).setOriginal(e);
      }
      if (e.propertyName) {
        const e2 = convertToAssignmentElementTarget(e.name);
        return new PropertyAssignment(e.propertyName, e.initializer ? createAssignment(e2, e.initializer) : e2).setRange(e).setOriginal(e);
      }
      qg.assertNode(e.name, isIdentifier);
      return new ShorthandPropertyAssignment(e.name, e.initializer).setRange(e).setOriginal(e);
    }
    qg.assertNode(e, isObjectLiteralElementLike);
    return <qc.ObjectLiteralElementLike>e;
  }
}
export namespace BindingOrAssignmentPattern {
  export function getElementsOfBindingOrAssignmentPattern(name: qc.BindingOrAssignmentPattern): readonly qc.BindingOrAssignmentElement[] {
    switch (name.kind) {
      case Syntax.ObjectBindingPattern:
      case Syntax.ArrayBindingPattern:
      case Syntax.ArrayLiteralExpression:
        // `a` in `{a}`
        // `a` in `[a]`
        return <readonly qc.BindingOrAssignmentElement[]>name.elements;
      case Syntax.ObjectLiteralExpression:
        // `a` in `{a}`
        return <readonly qc.BindingOrAssignmentElement[]>name.properties;
    }
  }
  export function convertToAssignmentPattern(n: qc.BindingOrAssignmentPattern): qc.AssignmentPattern {
    switch (n.kind) {
      case Syntax.ArrayBindingPattern:
      case Syntax.ArrayLiteralExpression:
        return convertToArrayAssignmentPattern(n);
      case Syntax.ObjectBindingPattern:
      case Syntax.ObjectLiteralExpression:
        return convertToObjectAssignmentPattern(n);
    }
  }
  export function convertToObjectAssignmentPattern(n: qc.ObjectBindingOrAssignmentPattern) {
    if (qc.is.kind(ObjectBindingPattern, n)) return new ObjectLiteralExpression(qb.map(n.elements, convertToObjectAssignmentElement)).setOriginal(n).setRange(n);
    qg.assertNode(n, isObjectLiteralExpression);
    return n;
  }
  export function convertToArrayAssignmentPattern(n: qc.ArrayBindingOrAssignmentPattern) {
    if (qc.is.kind(ArrayBindingPattern, n)) return new ArrayLiteralExpression(qb.map(n.elements, convertToArrayAssignmentElement)).setOriginal(n).setRange(n);
    qg.assertNode(n, isArrayLiteralExpression);
    return n;
  }
  export function convertToAssignmentElementTarget(n: qc.BindingOrAssignmentElementTarget): qc.Expression {
    if (qc.is.kind(BindingPattern, n)) return convertToAssignmentPattern(n);
    qg.assertNode(n, isExpression);
    return n;
  }
}
export function tryGetClassImplementingOrExtendingExpressionWithTypeArguments(n: Node): ClassImplementingOrExtendingExpressionWithTypeArguments | undefined {
  return is.kind(qc.ExpressionWithTypeArguments, n) && is.kind(qc.HeritageClause, n.parent) && is.classLike(n.parent.parent)
    ? { class: n.parent.parent, isImplements: n.parent.token === Syntax.ImplementsKeyword }
    : undefined;
}
export function tryGetClassExtendingExpressionWithTypeArguments(n: Node): ClassLikeDeclaration | undefined {
  const c = tryGetClassImplementingOrExtendingExpressionWithTypeArguments(n);
  return c && !c.isImplements ? c.class : undefined;
}
export function walkUpParenthesizedTypes(n: Node) {
  return walkUp(n, Syntax.ParenthesizedType);
}
export function walkUpParenthesizedExpressions(n: Node) {
  return walkUp(n, Syntax.ParenthesizedExpression);
}
function walkUp(n: Node, k: Syntax) {
  while (n && n.kind === k) {
    n = n.parent;
  }
  return n;
}
