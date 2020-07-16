import * as qb from './base';
import { QContext } from './context';
import { NodeFlags, NodeType, TransformFlags } from './core2';
import * as qc from './core2';
import { Modifier, ModifierFlags, Syntax } from './syntax';
import * as qy from './syntax';
import { Node } from './types';
import * as qt from './types';
export * from './core2';

const MAX_SMI_X86 = 0x3fff_ffff;

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
          n2 = n2.parent;
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
        return p.expression === n && isExpressionWithTypeArgumentsInClassExtendsClause(p);
      case Syntax.ShorthandPropertyAssignment:
        return p.objectAssignmentInitializer === n;
      default:
        return this.expressionNode(p);
    }
  }
  descendantOf(n: Node, ancestor?: Node) {
    let n2 = n as Node | undefined;
    while (n2) {
      if (n2 === ancestor) return true;
      n2 = n2.parent;
    }
    return false;
  }
  signedNumericLiteral(n: Node): n is qc.PrefixUnaryExpression & { operand: qc.NumericLiteral } {
    return this.kind(qc.PrefixUnaryExpression, n) && (n.operator === Syntax.PlusToken || n.operator === Syntax.MinusToken) && this.kind(qc.NumericLiteral, n.operand);
  }
  deleteTarget(n: Node) {
    if (this.kind(qc.PropertyAccessExpression, n) || this.kind(qc.ElementAccessExpression, n)) {
      n = walkUpParenthesizedExpressions(n.parent);
      return this.kind(qc.DeleteExpression, n);
    }
    return false;
  }
  declarationName(n: Node) {
    return !this.kind(qc.SourceFile, n) && !this.kind(qc.BindingPattern, n) && this.declaration(n.parent) && n.parent.name === n;
  }
  typeAlias(n: Node): n is qc.DocTypedefTag | qc.DocCallbackTag | qc.DocEnumTag | qc.TypeAliasDeclaration {
    return isDoc.typeAlias(n) || this.kind(qc.TypeAliasDeclaration, n);
  }
  literalLikeAccess(n: Node): n is qc.LiteralLikeElementAccessExpression | qc.PropertyAccessExpression {
    return this.kind(qc.PropertyAccessExpression, n) || this.literalLikeElementAccess(n);
  }
  literalLikeElementAccess(n: Node): n is qc.LiteralLikeElementAccessExpression {
    return this.kind(qc.ElementAccessExpression, n) && (qc.StringLiteral.orNumericLiteralLike(n.argumentExpression) || isWellKnownSymbolSyntactically(n.argumentExpression));
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
      n = n?.parent;
    }
    return n?.kind === Syntax.TypeQuery;
  }
  externalModuleImportEqualsDeclaration(n: Node): n is qc.ImportEqualsDeclaration & { moduleReference: qc.ExternalModuleReference } {
    return this.kind(qc.ImportEqualsDeclaration, n) && this.kind(qc.ExternalModuleReference, n.moduleReference.kind);
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
        return n?.parent.kind !== Syntax.VoidExpression;
      case Syntax.ExpressionWithTypeArguments:
        return !isExpressionWithTypeArgumentsInClassExtendsClause(n);
      case Syntax.TypeParameter:
        return this.kind(qc.MappedType, n.parent) || this.kind(qc.InferType, n.parent);
      case Syntax.Identifier:
        if (this.kind(qc.QualifiedName, n.parent) && n.parent.right === n) n = n.parent;
        else if (this.kind(qc.PropertyAccessExpression, n.parent) && n.parent.name === n) n = n.parent;
        qb.assert(
          this.kind(qc.Identifier, n) || this.kind(qc.QualifiedName, n) || this.kind(qc.PropertyAccessExpression, n),
          "'n' was expected to be a qualified name, identifier or property access in 'isPartOfTypeNode'."
        );
      case Syntax.QualifiedName:
      case Syntax.PropertyAccessExpression:
      case Syntax.ThisKeyword: {
        const { parent } = n;
        if (this.kind(qc.TypeQueryNode, parent)) return false;
        if (this.kind(qc.ImportTypeNode, parent)) return !parent.isTypeOf;
        if (Syntax.FirstTypeNode <= parent.kind && parent.kind <= Syntax.LastTypeNode) return true;
        switch (parent?.kind) {
          case Syntax.ExpressionWithTypeArguments:
            return !isExpressionWithTypeArgumentsInClassExtendsClause(parent);
          case Syntax.TypeParameter:
            return n === (<TypeParameterDeclaration>parent).constraint;
          case Syntax.DocTemplateTag:
            return n === (<DocTemplateTag>parent).constraint;
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
            return qb.contains(parent.typeArguments, n);
          case Syntax.TaggedTemplateExpression:
            return false;
        }
      }
    }
    return false;
  }
  superOrSuperProperty(n: Node): n is qc.SuperExpression | qc.SuperProperty {
    return this.kind(qc.SuperKeyword, n) || this.superProperty(n);
  }
  superProperty(n: Node): n is qc.SuperProperty {
    return (this.kind(qc.PropertyAccessExpression, n) || this.kind(qc.ElementAccessExpression, n)) && n.expression.kind === Syntax.SuperKeyword;
  }
  thisProperty(n: Node) {
    return (this.kind(qc.PropertyAccessExpression, n) || this.kind(qc.ElementAccessExpression, n)) && n.expression.kind === Syntax.ThisKeyword;
  }
  validESSymbolDeclaration(n: Node): n is qc.VariableDeclaration | qc.PropertyDeclaration | qc.SignatureDeclaration {
    return this.kind(qc.VariableDeclaration, n)
      ? isVarConst(n) && this.kind(qc.Identifier, n.name) && isVariableDeclarationInVariableStatement(n)
      : this.kind(qc.PropertyDeclaration, n)
      ? hasEffectiveReadonlyModifier(n) && hasStaticModifier(n)
      : this.kind(qc.PropertySignature, n) && hasEffectiveReadonlyModifier(n);
  }
  functionBlock(n: Node) {
    return this.kind(qc.Block, n) && this.functionLike(n.parent);
  }
  objectLiteralMethod(n: Node): n is qc.MethodDeclaration {
    return this.kind(qc.MethodDeclaration, n) && this.kind(qc.ObjectLiteralExpression, n.parent);
  }
  objectLiteralOrClassExpressionMethod(n: Node): n is qc.MethodDeclaration {
    return this.kind(qc.MethodDeclaration, n) && (this.kind(qc.ObjectLiteralExpression, n.parent) || this.kind(qc.ClassExpression, n.parent));
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
      default:
        return false;
    }
  }
  variableLikeOrAccessor(n: Node): n is qc.AccessorDeclaration | qc.VariableLikeDeclaration {
    return this.variableLike(n) || this.accessor(n);
  }
  childOfNodeWithKind(n: Node | undefined, k: Syntax) {
    while (n) {
      if (n.kind === k) return true;
      n = n.parent;
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
  declarationWithTypeParameters(n: Node): n is qc.DeclarationWithTypeParameters {
    switch (n.kind) {
      case Syntax.DocCallbackTag:
      case Syntax.DocTypedefTag:
      case Syntax.DocSignature:
        return true;
      default:
        assertType<DeclarationWithTypeParameterChildren>(n);
        return this.declarationWithTypeParameterChildren(n);
    }
  }
  declarationWithTypeParameterChildren(n: Node): n is qc.DeclarationWithTypeParameterChildren {
    switch (n.kind) {
      case Syntax.CallSignature:
      case Syntax.ConstructSignature:
      case Syntax.MethodSignature:
      case Syntax.IndexSignature:
      case Syntax.FunctionType:
      case Syntax.ConstructorType:
      case Syntax.DocFunctionType:
      case Syntax.ClassDeclaration:
      case Syntax.ClassExpression:
      case Syntax.InterfaceDeclaration:
      case Syntax.TypeAliasDeclaration:
      case Syntax.DocTemplateTag:
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
  anyImportSyntax(n: Node): n is qc.AnyImportSyntax {
    switch (n.kind) {
      case Syntax.ImportDeclaration:
      case Syntax.ImportEqualsDeclaration:
        return true;
      default:
        return false;
    }
  }
  lateVisibilityPaintedStatement(n: Node): n is qc.LateVisibilityPaintedStatement {
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
  anyImportOrReExport(n: Node): n is qc.AnyImportOrReExport {
    return this.anyImportSyntax(n) || this.kind(qc.ExportDeclaration, n);
  }
  ambientModule(n: Node): n is qc.AmbientModuleDeclaration {
    return this.kind(qc.ModuleDeclaration, n) && (n.name.kind === Syntax.StringLiteral || isGlobalScopeAugmentation(n));
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
  namedDeclaration(n: Node): n is qc.NamedDeclaration & { name: qc.DeclarationName } {
    return !!(n as qc.NamedDeclaration).name;
  }
  propertyAccessChain(n: Node): n is qc.PropertyAccessChain {
    return this.kind(qc.PropertyAccessExpression, n) && !!(n.flags & NodeFlags.OptionalChain);
  }
  elementAccessChain(n: Node): n is qc.ElementAccessChain {
    return this.kind(qc.ElementAccessExpression, n) && !!(n.flags & NodeFlags.OptionalChain);
  }
  callChain(n: Node): n is qc.CallChain {
    return this.kind(qc.CallExpression, n) && !!(n.flags & NodeFlags.OptionalChain);
  }
  optionalChainRoot(n: Node): n is qc.OptionalChainRoot {
    return this.optionalChain(n) && !this.kind(qc.NonNullExpression, n) && !!n.questionDotToken;
  }
  expressionOfOptionalChainRoot(n: Node): n is qc.Expression & { parent: qc.OptionalChainRoot } {
    return this.optionalChainRoot(n.parent) && n.parent.expression === n;
  }
  nullishCoalesce(n: Node) {
    return this.kind(qc.BinaryExpression, n) && n.operatorToken.kind === Syntax.Question2Token;
  }
  constTypeReference(n: Node) {
    return this.kind(qc.TypeReferenceNode, n) && this.kind(qc.Identifier, n.typeName) && n.typeName.escapedText === 'const' && !n.typeArguments;
  }
  nonNullChain(n: Node): n is qc.NonNullChain {
    return this.kind(qc.NonNullExpression, n) && !!(n.flags & NodeFlags.OptionalChain);
  }
  unparsedNode(n: Node): n is qc.UnparsedNode {
    return this.unparsedTextLike(n) || this.kind(qc.UnparsedPrologue, n) || this.kind(qc.UnparsedSyntheticReference, n);
  }
  literalExpression(n: Node): n is qc.LiteralExpression {
    return qy.is.literal(n.kind);
  }
  templateLiteralToken(n: Node): n is qc.TemplateLiteralToken {
    return qy.is.templateLiteral(n.kind);
  }
  importOrExportSpecifier(n: Node): n is qc.ImportSpecifier | qc.ExportSpecifier {
    return this.kind(qc.ImportSpecifier, n) || this.kind(qc.ExportSpecifier, n);
  }
  typeOnlyImportOrExportDeclaration(n: Node): n is qc.TypeOnlyCompatibleAliasDeclaration {
    switch (n.kind) {
      case Syntax.ImportSpecifier:
      case Syntax.ExportSpecifier:
        return n.parent.parent.isTypeOnly;
      case Syntax.NamespaceImport:
        return n.parent.isTypeOnly;
      case Syntax.ImportClause:
        return n.isTypeOnly;
      default:
        return false;
    }
  }
  stringTextContainingNode(n: Node): n is qc.StringLiteral | qc.TemplateLiteralToken {
    return this.kind(qc.StringLiteral, n) || qy.is.templateLiteral(n.kind);
  }
  generatedIdentifier(n: Node): n is qc.GeneratedIdentifier {
    return this.kind(qc.Identifier, n) && (n.autoGenerateFlags! & qc.GeneratedIdentifierFlags.KindMask) > qc.GeneratedIdentifierFlags.None;
  }
  privateIdentifierPropertyAccessExpression(n: Node): n is qc.PrivateIdentifierPropertyAccessExpression {
    return this.kind(qc.PropertyAccessExpression, n) && this.kind(qc.PrivateIdentifier, n.name);
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
    return this.kind(qc.SourceFile, n) || this.kind(qc.ModuleBlock, n) || (this.kind(qc.Block, n) && this.functionLike(n.parent));
  }
  classElement(n: Node): n is qc.ClassElement {
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
  classLike(n: Node): n is qc.ClassLikeDeclaration {
    return this.kind(qc.ClassDeclaration, n) || this.kind(qc.ClassExpression, n);
  }
  accessor(n: Node): n is qc.AccessorDeclaration {
    return this.kind(qc.GetAccessor, n) || this.kind(qc.SetAccessor, n);
  }
  methodOrAccessor(n: Node): n is qc.MethodDeclaration | qc.AccessorDeclaration {
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
  typeNode(n: Node): n is qc.TypeNode {
    return qy.is.typeNode(n.kind);
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
    return qy.is.leftHandSideExpression(skipPartiallyEmittedExpressions(n).kind);
  }
  unaryExpression(n: Node): n is UnaryExpression {
    return qy.is.unaryExpression(skipPartiallyEmittedExpressions(n).kind);
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
    return qy.is.expression(skipPartiallyEmittedExpressions(n).kind);
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
    return this.kind(qc.ExportAssignment, n) || this.kind(qc.ExportDeclaration, n);
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
    if (this.kind(qc.TypeParameter, n)) return (n.parent && n.parent.kind !== Syntax.DocTemplateTag) || isInJSFile(n);
    return qy.is.declaration(n.kind);
  }
  declarationStatement(n: Node): n is DeclarationStatement {
    return qy.is.declarationStatement(n.kind);
  }
  statementButNotDeclaration(n: Node): n is Statement {
    return qy.is.statementKindButNotDeclaration(n.kind);
  }
  statement(n: Node): n is Statement {
    const k = n.kind;
    return qy.is.statementKindButNotDeclaration(k) || qy.is.declarationStatement(k) || this.blockStatement(n);
  }
  blockStatement(n: Node): n is qc.Block {
    if (n.kind !== Syntax.Block) return false;
    if (n.parent !== undefined) {
      if (this.kind(qc.TryStatement, n.parent) || this.kind(qc.CatchClause, n.parent)) return false;
    }
    return !this.functionBlock(n);
  }
  identifierOrPrivateIdentifier(n: Node): n is qc.Identifier | qc.PrivateIdentifier {
    return this.kind(qc.Identifier, n) || this.kind(qc.PrivateIdentifier, n);
  }
  optionalChain(n: Node): n is PropertyAccessChain | ElementAccessChain | CallChain | NonNullChain {
    const k = n.kind;
    return !!(n.flags & NodeFlags.OptionalChain) && (k === Syntax.PropertyAccessExpression || k === Syntax.ElementAccessExpression || k === Syntax.CallExpression || k === Syntax.NonNullExpression);
  }
  breakOrContinueStatement(n: Node): n is BreakOrContinueStatement {
    return this.kind(qc.BreakStatement, n) || this.kind(qc.ContinueStatement, n);
  }
  namedExportBindings(n: Node): n is NamedExportBindings {
    return this.kind(qc.NamespaceExport, n) || this.kind(qc.NamedExports, n);
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
  entityName(n: Node): n is qc.EntityName {
    const k = n.kind;
    return k === Syntax.QualifiedName || k === Syntax.Identifier;
  }
  propertyName(n: Node): n is qc.PropertyName {
    const k = n.kind;
    return k === Syntax.Identifier || k === Syntax.PrivateIdentifier || k === Syntax.StringLiteral || k === Syntax.NumericLiteral || k === Syntax.ComputedPropertyName;
  }
  bindingName(n: Node): n is qc.BindingName {
    const k = n.kind;
    return k === Syntax.Identifier || k === Syntax.ObjectBindingPattern || k === Syntax.ArrayBindingPattern;
  }
  typeElement(n: Node): n is qc.TypeElement {
    const k = n.kind;
    return k === Syntax.ConstructSignature || k === Syntax.CallSignature || k === Syntax.PropertySignature || k === Syntax.MethodSignature || k === Syntax.IndexSignature;
  }
  arrayBindingElement(n: Node): n is qc.ArrayBindingElement {
    const k = n.kind;
    return k === Syntax.BindingElement || k === Syntax.OmittedExpression;
  }
  propertyAccessOrQualifiedNameOrImportTypeNode(n: Node): n is qc.PropertyAccessExpression | QualifiedName | ImportTypeNode {
    const k = n.kind;
    return k === Syntax.PropertyAccessExpression || k === Syntax.QualifiedName || k === Syntax.ImportType;
  }
  propertyAccessOrQualifiedName(n: Node): n is qc.PropertyAccessExpression | QualifiedName {
    const k = n.kind;
    return k === Syntax.PropertyAccessExpression || k === Syntax.QualifiedName;
  }
  callOrNewExpression(n: Node): n is qc.CallExpression | NewExpression {
    return this.kind(qc.CallExpression, n) || this.kind(qc.NewExpression, n);
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
    return this.kind(qc.ForInStatement, n) || this.kind(qc.ForOfStatement, n);
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
    return this.kind(qc.ModuleDeclaration, n) || this.kind(qc.EnumDeclaration, n);
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
    return this.kind(qc.JsxAttribute, n) || this.kind(qc.JsxSpreadAttribute, n) || this.objectLiteralElementLike(n);
  }
  typeReferenceType(n: Node): n is TypeReferenceType {
    return this.kind(qc.TypeReference, n) || this.kind(qc.ExpressionWithTypeArguments, n);
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
        return is.kind(qc.Identifier, n);
      default:
        return is.declarationName(n);
    }
  }
})();
export const isJsx = new (class {
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
export const isDoc = new (class {
  constructSignature(n: Node) {
    const p = is.kind(DocFunctionType, n) ? firstOrUndefined(n.parameters) : undefined;
    const i = tryCast(p && p.name, isIdentifier);
    return !!i && i.escapedText === 'new';
  }
  typeAlias(n: Node): n is qt.DocTypedefTag | qt.DocCallbackTag | qt.DocEnumTag {
    return is.kind(qc.DocTypedefTag, n) || is.kind(qc.DocCallbackTag, n) || is.kind(qc.DocEnumTag, n);
  }
  namespaceBody(n: Node): n is qt.DocNamespaceBody {
    const k = n.kind;
    return k === Syntax.Identifier || k === Syntax.ModuleDeclaration;
  }
  propertyLikeTag(n: Node): n is qt.DocPropertyLikeTag {
    return is.kind(qc.DocPropertyTag, n) || is.kind(qc.DocParameterTag, n);
  }
  node(n: Node) {
    return n.kind >= Syntax.FirstDocNode && n.kind <= Syntax.LastDocNode;
  }
  commentContainingNode(n: Node) {
    return is.kind(qc.DocComment, n) || is.kind(qc.DocNamepathType, n) || this.tag(n) || is.kind(DocTypeLiteral, n) || is.kind(DocSignature, n);
  }
  tag(n: Node): n is qt.DocTag {
    return n.kind >= Syntax.FirstDocTagNode && n.kind <= Syntax.LastDocTagNode;
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
          if (this.kind(qc.Parameter, n.parent) && is.classElement(n.parent.parent)) n = n.parent.parent;
          else if (is.classElement(n.parent)) n = n.parent;
          break;
      }
    }
  }
  immediatelyInvokedFunctionExpression(n: Node): qc.CallExpression | undefined {
    if (is.kind(qc.FunctionExpression, n) || is.kind(qc.ArrowFunction, n)) {
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
