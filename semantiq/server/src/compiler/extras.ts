import * as qb from './base';
import { QContext } from './context';
import { NodeFlags, TransformFlags } from './classes';
import * as qc from './classes';
import { Modifier, ModifierFlags, Syntax } from './syntax';
import * as qy from './syntax';
export * from './classes';

export abstract class NodeIs extends qb.TextRange implements qc.Node {
  kind!: any;
  node(k: Syntax) {
    return k >= Syntax.FirstNode;
  }
  token() {
    return this.kind >= Syntax.FirstToken && this.kind <= Syntax.LastToken;
  }
  asyncFunction() {
    switch (this.kind) {
      case Syntax.FunctionDeclaration:
      case Syntax.FunctionExpression:
      case Syntax.ArrowFunction:
      case Syntax.MethodDeclaration:
        return (<FunctionLikeDeclaration>n).body !== undefined && (<FunctionLikeDeclaration>n).asteriskToken === undefined && hasSyntacticModifier(n, ModifierFlags.Async);
    }
    return false;
  }
  signedNumericLiteral(): this is PrefixUnaryExpression & { operand: NumericLiteral } {
    return this.kind(PrefixUnaryExpression, n) && (this.operator === Syntax.PlusToken || this.operator === Syntax.MinusToken) && this.kind(NumericLiteral, this.operand);
  }
  expressionNode() {
    switch (this.kind) {
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
        let n = this as Node | undefined;
        while (n.parent.kind === Syntax.QualifiedName) {
          n = n.parent;
        }
        return n.kind === Syntax.TypeQuery || isJsx.tagName(n);
      case Syntax.Identifier:
        if (this.parent.kind === Syntax.TypeQuery || isJsx.tagName(n)) return true;
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
  inExpressionContext(): boolean {
    const { parent } = this;
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
  deleteTarget() {
    if (this.kind !== Syntax.PropertyAccessExpression && this.kind !== Syntax.ElementAccessExpression) return false;
    n = walkUpParenthesizedExpressions(this.parent);
    return this.kind === Syntax.DeleteExpression;
  }
  descendantOf(ancestor?: Node) {
    let n = this as Node;
    while (n) {
      if (n === ancestor) return true;
      n = n.parent;
    }
    return false;
  }
  declarationName(n: Node) {
    return !this.kind(SourceFile, n) && !this.kind(BindingPattern, n) && this.declaration(n.parent) && n.parent.name === n;
  }
  typeAlias(n: Node): this is qc.JSDocTypedefTag | qc.JSDocCallbackTag | qc.JSDocEnumTag | TypeAliasDeclaration {
    return isJSDoc.typeAlias(n) || this.kind(TypeAliasDeclaration, n);
  }
  literalLikeAccess(n: Node): this is LiteralLikeElementAccessExpression | PropertyAccessExpression {
    return this.kind(PropertyAccessExpression, n) || this.literalLikeElementAccess(n);
  }
  literalLikeElementAccess(n: Node): this is LiteralLikeElementAccessExpression {
    return this.kind(ElementAccessExpression, n) && (StringLiteral.orNumericLiteralLike(n.argumentExpression) || isWellKnownSymbolSyntactically(n.argumentExpression));
  }
  exportsIdentifier(n: Node) {
    return this.kind(Identifier, n) && n.escapedText === 'exports';
  }
  moduleIdentifier(n: Node) {
    return this.kind(Identifier, n) && n.escapedText === 'module';
  }
  moduleExportsAccessExpression(n: Node): this is LiteralLikeElementAccessExpression & { expression: Identifier } {
    return (this.kind(PropertyAccessExpression, n) || this.literalLikeElementAccess(n)) && this.moduleIdentifier(n.expression) && getElementOrPropertyAccessName(n) === 'exports';
  }
  partOfTypeQuery(n: Node) {
    while (n.kind === Syntax.QualifiedName || n.kind === Syntax.Identifier) {
      n = n.parent;
    }
    return n.kind === Syntax.TypeQuery;
  }
  externalModuleImportEqualsDeclaration(n: Node): this is ImportEqualsDeclaration & { moduleReference: ExternalModuleReference } {
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
  superOrSuperProperty(n: Node): this is SuperExpression | SuperProperty {
    return n.kind === Syntax.SuperKeyword || this.superProperty(n);
  }
  superProperty(n: Node): this is SuperProperty {
    const k = n.kind;
    return (k === Syntax.PropertyAccessExpression || k === Syntax.ElementAccessExpression) && (<PropertyAccessExpression | ElementAccessExpression>n).expression.kind === Syntax.SuperKeyword;
  }
  thisProperty(n: Node) {
    const k = n.kind;
    return (k === Syntax.PropertyAccessExpression || k === Syntax.ElementAccessExpression) && (<PropertyAccessExpression | ElementAccessExpression>n).expression.kind === Syntax.ThisKeyword;
  }
  validESSymbolDeclaration(n: Node): this is VariableDeclaration | PropertyDeclaration | SignatureDeclaration {
    return this.kind(VariableDeclaration, n)
      ? isVarConst(n) && this.kind(Identifier, n.name) && isVariableDeclarationInVariableStatement(n)
      : this.kind(PropertyDeclaration, n)
      ? hasEffectiveReadonlyModifier(n) && hasStaticModifier(n)
      : this.kind(PropertySignature, n) && hasEffectiveReadonlyModifier(n);
  }
  functionBlock(n: Node) {
    return n.kind === Syntax.Block && this.functionLike(n.parent);
  }
  objectLiteralMethod(n: Node): this is MethodDeclaration {
    return n.kind === Syntax.MethodDeclaration && n.parent.kind === Syntax.ObjectLiteralExpression;
  }
  objectLiteralOrClassExpressionMethod(n: Node): this is MethodDeclaration {
    return n.kind === Syntax.MethodDeclaration && (n.parent.kind === Syntax.ObjectLiteralExpression || n.parent.kind === Syntax.ClassExpression);
  }
  variableLike(n: Node): this is VariableLikeDeclaration {
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
    const { jsDoc } = n as qc.JSDocContainer;
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
  unparsedNode(n: qc.Node): n is qc.UnparsedNode {
    return this.unparsedTextLike(n) || n.kind === Syntax.UnparsedPrologue || n.kind === Syntax.UnparsedSyntheticReference;
  }
  literalExpression(n: qc.Node): n is qc.LiteralExpression {
    return qy.is.literal(n.kind);
  }
  templateLiteralToken(n: qc.Node): n is qc.TemplateLiteralToken {
    return qy.is.templateLiteral(n.kind);
  }
  importOrExportSpecifier(n: qc.Node): n is qc.ImportSpecifier | qc.ExportSpecifier {
    return this.kind(ImportSpecifier, n) || this.kind(ExportSpecifier, n);
  }
  typeOnlyImportOrExportDeclaration(n: qc.Node): n is qc.TypeOnlyCompatibleAliasDeclaration {
    switch (n.kind) {
      case Syntax.ImportSpecifier:
      case Syntax.ExportSpecifier:
        return (n as qc.ImportOrExportSpecifier).parent.parent.isTypeOnly;
      case Syntax.NamespaceImport:
        return (n as qc.NamespaceImport).parent.isTypeOnly;
      case Syntax.ImportClause:
        return (n as qc.ImportClause).isTypeOnly;
      default:
        return false;
    }
  }
  stringTextContainingNode(n: Node): n is StringLiteral | TemplateLiteralToken {
    return n.kind === Syntax.StringLiteral || qy.is.templateLiteral(n.kind);
  }
  generatedIdentifier(n: Node): n is GeneratedIdentifier {
    return this.kind(Identifier, n) && (n.autoGenerateFlags! & GeneratedIdentifierFlags.KindMask) > GeneratedIdentifierFlags.None;
  }
  privateIdentifierPropertyAccessExpression(n: Node): n is PrivateIdentifierPropertyAccessExpression {
    return this.kind(PropertyAccessExpression, n) && this.kind(PrivateIdentifier, n.name);
  }
  modifier(n: Node): n is Modifier {
    return qy.is.modifier(n.kind);
  }
  functionLike(n: Node): n is SignatureDeclaration {
    return qy.is.functionLike(n.kind);
  }
  functionLikeDeclaration(n: Node): n is FunctionLikeDeclaration {
    return qy.is.functionLikeDeclaration(n.kind);
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
}

export abstract class NodeIsJsx extends qb.TextRange implements qc.Node {
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
}
export abstract class NodeIsJSDoc extends qb.TextRange implements qc.Node {
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
}
export abstract class NodeGet extends qb.TextRange implements qc.Node {
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
    if (!qb.isSynthesized(n) && n.parent && !((Node.is.kind(NumericLiteral, n) && n.numericLiteralFlags & TokenFlags.ContainsSeparator) || Node.is.kind(BigIntLiteral, n)))
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
}
export abstract class NodeGetJSDoc extends qb.TextRange implements qc.Node {
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
        ? concatenate(qy.get.trailingCommentRanges(text, n.pos), qy.get.leadingCommentRanges(text, n.pos))
        : qy.get.leadingCommentRanges(text, n.pos);
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
}
export abstract class NodeOther extends qb.TextRange implements qc.Node {
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
    const loc = qy.get.lineAndCharOf(file, n.pos);
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
        if (!qy.is.whiteSpaceLike(line.charCodeAt(i))) break;
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
        if (Node.is.functionLike(current) || Node.is.classLike(current) || current.kind === Syntax.InterfaceDeclaration) return <Declaration>current;
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
  idText(identifierOrPrivateName: Identifier | PrivateIdentifier): string {
    return qy.get.unescUnderscores(identifierOrPrivateName.escapedText);
  }
  nameForNamelessJSDocTypedef(declaration: qt.JSDocTypedefTag | qt.JSDocEnumTag): Identifier | PrivateIdentifier | undefined {
    const n = declaration.parent.parent;
    if (!n) return;
    if (Node.is.declaration(n)) return getDeclarationIdentifier(n);
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
}
export abstract class NodeForEach extends qb.TextRange implements qc.Node {
  ancestor<T>(n: Node, cb: (n: Node) => T | undefined | 'quit'): T | undefined {
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
}
