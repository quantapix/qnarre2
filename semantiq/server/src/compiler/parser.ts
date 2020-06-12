namespace qnr {
  const enum SignatureFlags {
    None = 0,
    Yield = 1 << 0,
    Await = 1 << 1,
    Type = 1 << 2,
    IgnoreMissingOpenBrace = 1 << 4,
    JSDoc = 1 << 5,
  }

  export function forEachChild<T>(node: Node, cbNode: (node: Node) => T | undefined, cbNodes?: (nodes: NodeArray<Node>) => T | undefined): T | undefined {
    if (!node || node.kind <= Syntax.LastToken) {
      return;
    }
    switch (node.kind) {
      case Syntax.QualifiedName:
        return visitNode(cbNode, (<QualifiedName>node).left) || visitNode(cbNode, (<QualifiedName>node).right);
      case Syntax.TypeParameter:
        return (
          visitNode(cbNode, (<TypeParameterDeclaration>node).name) ||
          visitNode(cbNode, (<TypeParameterDeclaration>node).constraint) ||
          visitNode(cbNode, (<TypeParameterDeclaration>node).default) ||
          visitNode(cbNode, (<TypeParameterDeclaration>node).expression)
        );
      case Syntax.ShorthandPropertyAssignment:
        return (
          NodeArray.visit(cbNode, cbNodes, node.decorators) ||
          NodeArray.visit(cbNode, cbNodes, node.modifiers) ||
          visitNode(cbNode, (<ShorthandPropertyAssignment>node).name) ||
          visitNode(cbNode, (<ShorthandPropertyAssignment>node).questionToken) ||
          visitNode(cbNode, (<ShorthandPropertyAssignment>node).exclamationToken) ||
          visitNode(cbNode, (<ShorthandPropertyAssignment>node).equalsToken) ||
          visitNode(cbNode, (<ShorthandPropertyAssignment>node).objectAssignmentInitializer)
        );
      case Syntax.SpreadAssignment:
        return visitNode(cbNode, (<SpreadAssignment>node).expression);
      case Syntax.Parameter:
        return (
          NodeArray.visit(cbNode, cbNodes, node.decorators) ||
          NodeArray.visit(cbNode, cbNodes, node.modifiers) ||
          visitNode(cbNode, (<ParameterDeclaration>node).dot3Token) ||
          visitNode(cbNode, (<ParameterDeclaration>node).name) ||
          visitNode(cbNode, (<ParameterDeclaration>node).questionToken) ||
          visitNode(cbNode, (<ParameterDeclaration>node).type) ||
          visitNode(cbNode, (<ParameterDeclaration>node).initializer)
        );
      case Syntax.PropertyDeclaration:
        return (
          NodeArray.visit(cbNode, cbNodes, node.decorators) ||
          NodeArray.visit(cbNode, cbNodes, node.modifiers) ||
          visitNode(cbNode, (<PropertyDeclaration>node).name) ||
          visitNode(cbNode, (<PropertyDeclaration>node).questionToken) ||
          visitNode(cbNode, (<PropertyDeclaration>node).exclamationToken) ||
          visitNode(cbNode, (<PropertyDeclaration>node).type) ||
          visitNode(cbNode, (<PropertyDeclaration>node).initializer)
        );
      case Syntax.PropertySignature:
        return (
          NodeArray.visit(cbNode, cbNodes, node.decorators) ||
          NodeArray.visit(cbNode, cbNodes, node.modifiers) ||
          visitNode(cbNode, (<PropertySignature>node).name) ||
          visitNode(cbNode, (<PropertySignature>node).questionToken) ||
          visitNode(cbNode, (<PropertySignature>node).type) ||
          visitNode(cbNode, (<PropertySignature>node).initializer)
        );
      case Syntax.PropertyAssignment:
        return (
          NodeArray.visit(cbNode, cbNodes, node.decorators) ||
          NodeArray.visit(cbNode, cbNodes, node.modifiers) ||
          visitNode(cbNode, (<PropertyAssignment>node).name) ||
          visitNode(cbNode, (<PropertyAssignment>node).questionToken) ||
          visitNode(cbNode, (<PropertyAssignment>node).initializer)
        );
      case Syntax.VariableDeclaration:
        return (
          NodeArray.visit(cbNode, cbNodes, node.decorators) ||
          NodeArray.visit(cbNode, cbNodes, node.modifiers) ||
          visitNode(cbNode, (<VariableDeclaration>node).name) ||
          visitNode(cbNode, (<VariableDeclaration>node).exclamationToken) ||
          visitNode(cbNode, (<VariableDeclaration>node).type) ||
          visitNode(cbNode, (<VariableDeclaration>node).initializer)
        );
      case Syntax.BindingElement:
        return (
          NodeArray.visit(cbNode, cbNodes, node.decorators) ||
          NodeArray.visit(cbNode, cbNodes, node.modifiers) ||
          visitNode(cbNode, (<BindingElement>node).dot3Token) ||
          visitNode(cbNode, (<BindingElement>node).propertyName) ||
          visitNode(cbNode, (<BindingElement>node).name) ||
          visitNode(cbNode, (<BindingElement>node).initializer)
        );
      case Syntax.FunctionType:
      case Syntax.ConstructorType:
      case Syntax.CallSignature:
      case Syntax.ConstructSignature:
      case Syntax.IndexSignature:
        return (
          NodeArray.visit(cbNode, cbNodes, node.decorators) ||
          NodeArray.visit(cbNode, cbNodes, node.modifiers) ||
          NodeArray.visit(cbNode, cbNodes, (<SignatureDeclaration>node).typeParameters) ||
          NodeArray.visit(cbNode, cbNodes, (<SignatureDeclaration>node).parameters) ||
          visitNode(cbNode, (<SignatureDeclaration>node).type)
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
          NodeArray.visit(cbNode, cbNodes, node.decorators) ||
          NodeArray.visit(cbNode, cbNodes, node.modifiers) ||
          visitNode(cbNode, (<FunctionLikeDeclaration>node).asteriskToken) ||
          visitNode(cbNode, (<FunctionLikeDeclaration>node).name) ||
          visitNode(cbNode, (<FunctionLikeDeclaration>node).questionToken) ||
          visitNode(cbNode, (<FunctionLikeDeclaration>node).exclamationToken) ||
          NodeArray.visit(cbNode, cbNodes, (<FunctionLikeDeclaration>node).typeParameters) ||
          NodeArray.visit(cbNode, cbNodes, (<FunctionLikeDeclaration>node).parameters) ||
          visitNode(cbNode, (<FunctionLikeDeclaration>node).type) ||
          visitNode(cbNode, (<ArrowFunction>node).equalsGreaterThanToken) ||
          visitNode(cbNode, (<FunctionLikeDeclaration>node).body)
        );
      case Syntax.TypeReference:
        return visitNode(cbNode, (<TypeReferenceNode>node).typeName) || NodeArray.visit(cbNode, cbNodes, (<TypeReferenceNode>node).typeArguments);
      case Syntax.TypePredicate:
        return visitNode(cbNode, (<TypePredicateNode>node).assertsModifier) || visitNode(cbNode, (<TypePredicateNode>node).parameterName) || visitNode(cbNode, (<TypePredicateNode>node).type);
      case Syntax.TypeQuery:
        return visitNode(cbNode, (<TypeQueryNode>node).exprName);
      case Syntax.TypeLiteral:
        return NodeArray.visit(cbNode, cbNodes, (<TypeLiteralNode>node).members);
      case Syntax.ArrayType:
        return visitNode(cbNode, (<ArrayTypeNode>node).elementType);
      case Syntax.TupleType:
        return NodeArray.visit(cbNode, cbNodes, (<TupleTypeNode>node).elements);
      case Syntax.UnionType:
      case Syntax.IntersectionType:
        return NodeArray.visit(cbNode, cbNodes, (<UnionOrIntersectionTypeNode>node).types);
      case Syntax.ConditionalType:
        return (
          visitNode(cbNode, (<ConditionalTypeNode>node).checkType) ||
          visitNode(cbNode, (<ConditionalTypeNode>node).extendsType) ||
          visitNode(cbNode, (<ConditionalTypeNode>node).trueType) ||
          visitNode(cbNode, (<ConditionalTypeNode>node).falseType)
        );
      case Syntax.InferType:
        return visitNode(cbNode, (<InferTypeNode>node).typeParameter);
      case Syntax.ImportType:
        return visitNode(cbNode, (<ImportTypeNode>node).argument) || visitNode(cbNode, (<ImportTypeNode>node).qualifier) || NodeArray.visit(cbNode, cbNodes, (<ImportTypeNode>node).typeArguments);
      case Syntax.ParenthesizedType:
      case Syntax.TypeOperator:
        return visitNode(cbNode, (<ParenthesizedTypeNode | TypeOperatorNode>node).type);
      case Syntax.IndexedAccessType:
        return visitNode(cbNode, (<IndexedAccessTypeNode>node).objectType) || visitNode(cbNode, (<IndexedAccessTypeNode>node).indexType);
      case Syntax.MappedType:
        return (
          visitNode(cbNode, (<MappedTypeNode>node).readonlyToken) ||
          visitNode(cbNode, (<MappedTypeNode>node).typeParameter) ||
          visitNode(cbNode, (<MappedTypeNode>node).questionToken) ||
          visitNode(cbNode, (<MappedTypeNode>node).type)
        );
      case Syntax.LiteralType:
        return visitNode(cbNode, (<LiteralTypeNode>node).literal);
      case Syntax.NamedTupleMember:
        return (
          visitNode(cbNode, (<NamedTupleMember>node).dot3Token) ||
          visitNode(cbNode, (<NamedTupleMember>node).name) ||
          visitNode(cbNode, (<NamedTupleMember>node).questionToken) ||
          visitNode(cbNode, (<NamedTupleMember>node).type)
        );
      case Syntax.ObjectBindingPattern:
      case Syntax.ArrayBindingPattern:
        return NodeArray.visit(cbNode, cbNodes, (<BindingPattern>node).elements);
      case Syntax.ArrayLiteralExpression:
        return NodeArray.visit(cbNode, cbNodes, (<ArrayLiteralExpression>node).elements);
      case Syntax.ObjectLiteralExpression:
        return NodeArray.visit(cbNode, cbNodes, (<ObjectLiteralExpression>node).properties);
      case Syntax.PropertyAccessExpression:
        return (
          visitNode(cbNode, (<PropertyAccessExpression>node).expression) ||
          visitNode(cbNode, (<PropertyAccessExpression>node).questionDotToken) ||
          visitNode(cbNode, (<PropertyAccessExpression>node).name)
        );
      case Syntax.ElementAccessExpression:
        return (
          visitNode(cbNode, (<ElementAccessExpression>node).expression) ||
          visitNode(cbNode, (<ElementAccessExpression>node).questionDotToken) ||
          visitNode(cbNode, (<ElementAccessExpression>node).argumentExpression)
        );
      case Syntax.CallExpression:
      case Syntax.NewExpression:
        return (
          visitNode(cbNode, (<CallExpression>node).expression) ||
          visitNode(cbNode, (<CallExpression>node).questionDotToken) ||
          NodeArray.visit(cbNode, cbNodes, (<CallExpression>node).typeArguments) ||
          NodeArray.visit(cbNode, cbNodes, (<CallExpression>node).arguments)
        );
      case Syntax.TaggedTemplateExpression:
        return (
          visitNode(cbNode, (<TaggedTemplateExpression>node).tag) ||
          visitNode(cbNode, (<TaggedTemplateExpression>node).questionDotToken) ||
          NodeArray.visit(cbNode, cbNodes, (<TaggedTemplateExpression>node).typeArguments) ||
          visitNode(cbNode, (<TaggedTemplateExpression>node).template)
        );
      case Syntax.TypeAssertionExpression:
        return visitNode(cbNode, (<TypeAssertion>node).type) || visitNode(cbNode, (<TypeAssertion>node).expression);
      case Syntax.ParenthesizedExpression:
        return visitNode(cbNode, (<ParenthesizedExpression>node).expression);
      case Syntax.DeleteExpression:
        return visitNode(cbNode, (<DeleteExpression>node).expression);
      case Syntax.TypeOfExpression:
        return visitNode(cbNode, (<TypeOfExpression>node).expression);
      case Syntax.VoidExpression:
        return visitNode(cbNode, (<VoidExpression>node).expression);
      case Syntax.PrefixUnaryExpression:
        return visitNode(cbNode, (<PrefixUnaryExpression>node).operand);
      case Syntax.YieldExpression:
        return visitNode(cbNode, (<YieldExpression>node).asteriskToken) || visitNode(cbNode, (<YieldExpression>node).expression);
      case Syntax.AwaitExpression:
        return visitNode(cbNode, (<AwaitExpression>node).expression);
      case Syntax.PostfixUnaryExpression:
        return visitNode(cbNode, (<PostfixUnaryExpression>node).operand);
      case Syntax.BinaryExpression:
        return visitNode(cbNode, (<BinaryExpression>node).left) || visitNode(cbNode, (<BinaryExpression>node).operatorToken) || visitNode(cbNode, (<BinaryExpression>node).right);
      case Syntax.AsExpression:
        return visitNode(cbNode, (<AsExpression>node).expression) || visitNode(cbNode, (<AsExpression>node).type);
      case Syntax.NonNullExpression:
        return visitNode(cbNode, (<NonNullExpression>node).expression);
      case Syntax.MetaProperty:
        return visitNode(cbNode, (<MetaProperty>node).name);
      case Syntax.ConditionalExpression:
        return (
          visitNode(cbNode, (<ConditionalExpression>node).condition) ||
          visitNode(cbNode, (<ConditionalExpression>node).questionToken) ||
          visitNode(cbNode, (<ConditionalExpression>node).whenTrue) ||
          visitNode(cbNode, (<ConditionalExpression>node).colonToken) ||
          visitNode(cbNode, (<ConditionalExpression>node).whenFalse)
        );
      case Syntax.SpreadElement:
        return visitNode(cbNode, (<SpreadElement>node).expression);
      case Syntax.Block:
      case Syntax.ModuleBlock:
        return NodeArray.visit(cbNode, cbNodes, (<Block>node).statements);
      case Syntax.SourceFile:
        return NodeArray.visit(cbNode, cbNodes, (<SourceFile>node).statements) || visitNode(cbNode, (<SourceFile>node).endOfFileToken);
      case Syntax.VariableStatement:
        return NodeArray.visit(cbNode, cbNodes, node.decorators) || NodeArray.visit(cbNode, cbNodes, node.modifiers) || visitNode(cbNode, (<VariableStatement>node).declarationList);
      case Syntax.VariableDeclarationList:
        return NodeArray.visit(cbNode, cbNodes, (<VariableDeclarationList>node).declarations);
      case Syntax.ExpressionStatement:
        return visitNode(cbNode, (<ExpressionStatement>node).expression);
      case Syntax.IfStatement:
        return visitNode(cbNode, (<IfStatement>node).expression) || visitNode(cbNode, (<IfStatement>node).thenStatement) || visitNode(cbNode, (<IfStatement>node).elseStatement);
      case Syntax.DoStatement:
        return visitNode(cbNode, (<DoStatement>node).statement) || visitNode(cbNode, (<DoStatement>node).expression);
      case Syntax.WhileStatement:
        return visitNode(cbNode, (<WhileStatement>node).expression) || visitNode(cbNode, (<WhileStatement>node).statement);
      case Syntax.ForStatement:
        return (
          visitNode(cbNode, (<ForStatement>node).initializer) ||
          visitNode(cbNode, (<ForStatement>node).condition) ||
          visitNode(cbNode, (<ForStatement>node).incrementor) ||
          visitNode(cbNode, (<ForStatement>node).statement)
        );
      case Syntax.ForInStatement:
        return visitNode(cbNode, (<ForInStatement>node).initializer) || visitNode(cbNode, (<ForInStatement>node).expression) || visitNode(cbNode, (<ForInStatement>node).statement);
      case Syntax.ForOfStatement:
        return (
          visitNode(cbNode, (<ForOfStatement>node).awaitModifier) ||
          visitNode(cbNode, (<ForOfStatement>node).initializer) ||
          visitNode(cbNode, (<ForOfStatement>node).expression) ||
          visitNode(cbNode, (<ForOfStatement>node).statement)
        );
      case Syntax.ContinueStatement:
      case Syntax.BreakStatement:
        return visitNode(cbNode, (<BreakOrContinueStatement>node).label);
      case Syntax.ReturnStatement:
        return visitNode(cbNode, (<ReturnStatement>node).expression);
      case Syntax.WithStatement:
        return visitNode(cbNode, (<WithStatement>node).expression) || visitNode(cbNode, (<WithStatement>node).statement);
      case Syntax.SwitchStatement:
        return visitNode(cbNode, (<SwitchStatement>node).expression) || visitNode(cbNode, (<SwitchStatement>node).caseBlock);
      case Syntax.CaseBlock:
        return NodeArray.visit(cbNode, cbNodes, (<CaseBlock>node).clauses);
      case Syntax.CaseClause:
        return visitNode(cbNode, (<CaseClause>node).expression) || NodeArray.visit(cbNode, cbNodes, (<CaseClause>node).statements);
      case Syntax.DefaultClause:
        return NodeArray.visit(cbNode, cbNodes, (<DefaultClause>node).statements);
      case Syntax.LabeledStatement:
        return visitNode(cbNode, (<LabeledStatement>node).label) || visitNode(cbNode, (<LabeledStatement>node).statement);
      case Syntax.ThrowStatement:
        return visitNode(cbNode, (<ThrowStatement>node).expression);
      case Syntax.TryStatement:
        return visitNode(cbNode, (<TryStatement>node).tryBlock) || visitNode(cbNode, (<TryStatement>node).catchClause) || visitNode(cbNode, (<TryStatement>node).finallyBlock);
      case Syntax.CatchClause:
        return visitNode(cbNode, (<CatchClause>node).variableDeclaration) || visitNode(cbNode, (<CatchClause>node).block);
      case Syntax.Decorator:
        return visitNode(cbNode, (<Decorator>node).expression);
      case Syntax.ClassDeclaration:
      case Syntax.ClassExpression:
        return (
          NodeArray.visit(cbNode, cbNodes, node.decorators) ||
          NodeArray.visit(cbNode, cbNodes, node.modifiers) ||
          visitNode(cbNode, (<ClassLikeDeclaration>node).name) ||
          NodeArray.visit(cbNode, cbNodes, (<ClassLikeDeclaration>node).typeParameters) ||
          NodeArray.visit(cbNode, cbNodes, (<ClassLikeDeclaration>node).heritageClauses) ||
          NodeArray.visit(cbNode, cbNodes, (<ClassLikeDeclaration>node).members)
        );
      case Syntax.InterfaceDeclaration:
        return (
          NodeArray.visit(cbNode, cbNodes, node.decorators) ||
          NodeArray.visit(cbNode, cbNodes, node.modifiers) ||
          visitNode(cbNode, (<InterfaceDeclaration>node).name) ||
          NodeArray.visit(cbNode, cbNodes, (<InterfaceDeclaration>node).typeParameters) ||
          NodeArray.visit(cbNode, cbNodes, (<ClassDeclaration>node).heritageClauses) ||
          NodeArray.visit(cbNode, cbNodes, (<InterfaceDeclaration>node).members)
        );
      case Syntax.TypeAliasDeclaration:
        return (
          NodeArray.visit(cbNode, cbNodes, node.decorators) ||
          NodeArray.visit(cbNode, cbNodes, node.modifiers) ||
          visitNode(cbNode, (<TypeAliasDeclaration>node).name) ||
          NodeArray.visit(cbNode, cbNodes, (<TypeAliasDeclaration>node).typeParameters) ||
          visitNode(cbNode, (<TypeAliasDeclaration>node).type)
        );
      case Syntax.EnumDeclaration:
        return (
          NodeArray.visit(cbNode, cbNodes, node.decorators) ||
          NodeArray.visit(cbNode, cbNodes, node.modifiers) ||
          visitNode(cbNode, (<EnumDeclaration>node).name) ||
          NodeArray.visit(cbNode, cbNodes, (<EnumDeclaration>node).members)
        );
      case Syntax.EnumMember:
        return visitNode(cbNode, (<EnumMember>node).name) || visitNode(cbNode, (<EnumMember>node).initializer);
      case Syntax.ModuleDeclaration:
        return (
          NodeArray.visit(cbNode, cbNodes, node.decorators) ||
          NodeArray.visit(cbNode, cbNodes, node.modifiers) ||
          visitNode(cbNode, (<ModuleDeclaration>node).name) ||
          visitNode(cbNode, (<ModuleDeclaration>node).body)
        );
      case Syntax.ImportEqualsDeclaration:
        return (
          NodeArray.visit(cbNode, cbNodes, node.decorators) ||
          NodeArray.visit(cbNode, cbNodes, node.modifiers) ||
          visitNode(cbNode, (<ImportEqualsDeclaration>node).name) ||
          visitNode(cbNode, (<ImportEqualsDeclaration>node).moduleReference)
        );
      case Syntax.ImportDeclaration:
        return (
          NodeArray.visit(cbNode, cbNodes, node.decorators) ||
          NodeArray.visit(cbNode, cbNodes, node.modifiers) ||
          visitNode(cbNode, (<ImportDeclaration>node).importClause) ||
          visitNode(cbNode, (<ImportDeclaration>node).moduleSpecifier)
        );
      case Syntax.ImportClause:
        return visitNode(cbNode, (<ImportClause>node).name) || visitNode(cbNode, (<ImportClause>node).namedBindings);
      case Syntax.NamespaceExportDeclaration:
        return visitNode(cbNode, (<NamespaceExportDeclaration>node).name);

      case Syntax.NamespaceImport:
        return visitNode(cbNode, (<NamespaceImport>node).name);
      case Syntax.NamespaceExport:
        return visitNode(cbNode, (<NamespaceExport>node).name);
      case Syntax.NamedImports:
      case Syntax.NamedExports:
        return NodeArray.visit(cbNode, cbNodes, (<NamedImportsOrExports>node).elements);
      case Syntax.ExportDeclaration:
        return (
          NodeArray.visit(cbNode, cbNodes, node.decorators) ||
          NodeArray.visit(cbNode, cbNodes, node.modifiers) ||
          visitNode(cbNode, (<ExportDeclaration>node).exportClause) ||
          visitNode(cbNode, (<ExportDeclaration>node).moduleSpecifier)
        );
      case Syntax.ImportSpecifier:
      case Syntax.ExportSpecifier:
        return visitNode(cbNode, (<ImportOrExportSpecifier>node).propertyName) || visitNode(cbNode, (<ImportOrExportSpecifier>node).name);
      case Syntax.ExportAssignment:
        return NodeArray.visit(cbNode, cbNodes, node.decorators) || NodeArray.visit(cbNode, cbNodes, node.modifiers) || visitNode(cbNode, (<ExportAssignment>node).expression);
      case Syntax.TemplateExpression:
        return visitNode(cbNode, (<TemplateExpression>node).head) || NodeArray.visit(cbNode, cbNodes, (<TemplateExpression>node).templateSpans);
      case Syntax.TemplateSpan:
        return visitNode(cbNode, (<TemplateSpan>node).expression) || visitNode(cbNode, (<TemplateSpan>node).literal);
      case Syntax.ComputedPropertyName:
        return visitNode(cbNode, (<ComputedPropertyName>node).expression);
      case Syntax.HeritageClause:
        return NodeArray.visit(cbNode, cbNodes, (<HeritageClause>node).types);
      case Syntax.ExpressionWithTypeArguments:
        return visitNode(cbNode, (<ExpressionWithTypeArguments>node).expression) || NodeArray.visit(cbNode, cbNodes, (<ExpressionWithTypeArguments>node).typeArguments);
      case Syntax.ExternalModuleReference:
        return visitNode(cbNode, (<ExternalModuleReference>node).expression);
      case Syntax.MissingDeclaration:
        return NodeArray.visit(cbNode, cbNodes, node.decorators);
      case Syntax.CommaListExpression:
        return NodeArray.visit(cbNode, cbNodes, (<CommaListExpression>node).elements);

      case Syntax.JsxElement:
        return visitNode(cbNode, (<JsxElement>node).openingElement) || NodeArray.visit(cbNode, cbNodes, (<JsxElement>node).children) || visitNode(cbNode, (<JsxElement>node).closingElement);
      case Syntax.JsxFragment:
        return visitNode(cbNode, (<JsxFragment>node).openingFragment) || NodeArray.visit(cbNode, cbNodes, (<JsxFragment>node).children) || visitNode(cbNode, (<JsxFragment>node).closingFragment);
      case Syntax.JsxSelfClosingElement:
      case Syntax.JsxOpeningElement:
        return (
          visitNode(cbNode, (<JsxOpeningLikeElement>node).tagName) ||
          NodeArray.visit(cbNode, cbNodes, (<JsxOpeningLikeElement>node).typeArguments) ||
          visitNode(cbNode, (<JsxOpeningLikeElement>node).attributes)
        );
      case Syntax.JsxAttributes:
        return NodeArray.visit(cbNode, cbNodes, (<JsxAttributes>node).properties);
      case Syntax.JsxAttribute:
        return visitNode(cbNode, (<JsxAttribute>node).name) || visitNode(cbNode, (<JsxAttribute>node).initializer);
      case Syntax.JsxSpreadAttribute:
        return visitNode(cbNode, (<JsxSpreadAttribute>node).expression);
      case Syntax.JsxExpression:
        return visitNode(cbNode, (node as JsxExpression).dot3Token) || visitNode(cbNode, (node as JsxExpression).expression);
      case Syntax.JsxClosingElement:
        return visitNode(cbNode, (<JsxClosingElement>node).tagName);

      case Syntax.OptionalType:
      case Syntax.RestType:
      case Syntax.JSDocTypeExpression:
      case Syntax.JSDocNonNullableType:
      case Syntax.JSDocNullableType:
      case Syntax.JSDocOptionalType:
      case Syntax.JSDocVariadicType:
        return visitNode(cbNode, (<OptionalTypeNode | RestTypeNode | JSDocTypeExpression | JSDocTypeReferencingNode>node).type);
      case Syntax.JSDocFunctionType:
        return NodeArray.visit(cbNode, cbNodes, (<JSDocFunctionType>node).parameters) || visitNode(cbNode, (<JSDocFunctionType>node).type);
      case Syntax.JSDocComment:
        return NodeArray.visit(cbNode, cbNodes, (<JSDoc>node).tags);
      case Syntax.JSDocParameterTag:
      case Syntax.JSDocPropertyTag:
        return (
          visitNode(cbNode, (node as JSDocTag).tagName) ||
          ((node as JSDocPropertyLikeTag).isNameFirst
            ? visitNode(cbNode, (<JSDocPropertyLikeTag>node).name) || visitNode(cbNode, (<JSDocPropertyLikeTag>node).typeExpression)
            : visitNode(cbNode, (<JSDocPropertyLikeTag>node).typeExpression) || visitNode(cbNode, (<JSDocPropertyLikeTag>node).name))
        );
      case Syntax.JSDocAuthorTag:
        return visitNode(cbNode, (node as JSDocTag).tagName);
      case Syntax.JSDocImplementsTag:
        return visitNode(cbNode, (node as JSDocTag).tagName) || visitNode(cbNode, (<JSDocImplementsTag>node).class);
      case Syntax.JSDocAugmentsTag:
        return visitNode(cbNode, (node as JSDocTag).tagName) || visitNode(cbNode, (<JSDocAugmentsTag>node).class);
      case Syntax.JSDocTemplateTag:
        return visitNode(cbNode, (node as JSDocTag).tagName) || visitNode(cbNode, (<JSDocTemplateTag>node).constraint) || NodeArray.visit(cbNode, cbNodes, (<JSDocTemplateTag>node).typeParameters);
      case Syntax.JSDocTypedefTag:
        return (
          visitNode(cbNode, (node as JSDocTag).tagName) ||
          ((node as JSDocTypedefTag).typeExpression && (node as JSDocTypedefTag).typeExpression!.kind === Syntax.JSDocTypeExpression
            ? visitNode(cbNode, (<JSDocTypedefTag>node).typeExpression) || visitNode(cbNode, (<JSDocTypedefTag>node).fullName)
            : visitNode(cbNode, (<JSDocTypedefTag>node).fullName) || visitNode(cbNode, (<JSDocTypedefTag>node).typeExpression))
        );
      case Syntax.JSDocCallbackTag:
        return visitNode(cbNode, (node as JSDocTag).tagName) || visitNode(cbNode, (node as JSDocCallbackTag).fullName) || visitNode(cbNode, (node as JSDocCallbackTag).typeExpression);
      case Syntax.JSDocReturnTag:
      case Syntax.JSDocTypeTag:
      case Syntax.JSDocThisTag:
      case Syntax.JSDocEnumTag:
        return visitNode(cbNode, (node as JSDocTag).tagName) || visitNode(cbNode, (node as JSDocReturnTag | JSDocTypeTag | JSDocThisTag | JSDocEnumTag).typeExpression);
      case Syntax.JSDocSignature:
        return forEach((<JSDocSignature>node).typeParameters, cbNode) || forEach((<JSDocSignature>node).parameters, cbNode) || visitNode(cbNode, (<JSDocSignature>node).type);
      case Syntax.JSDocTypeLiteral:
        return forEach((node as JSDocTypeLiteral).jsDocPropertyTags, cbNode);
      case Syntax.JSDocTag:
      case Syntax.JSDocClassTag:
      case Syntax.JSDocPublicTag:
      case Syntax.JSDocPrivateTag:
      case Syntax.JSDocProtectedTag:
      case Syntax.JSDocReadonlyTag:
        return visitNode(cbNode, (node as JSDocTag).tagName);
      case Syntax.PartiallyEmittedExpression:
        return visitNode(cbNode, (<PartiallyEmittedExpression>node).expression);
    }
    return;
  }

  export function forEachChildRecursively<T>(
    rootNode: Node,
    cbNode: (node: Node, parent: Node) => T | 'skip' | undefined,
    cbNodes?: (nodes: NodeArray<Node>, parent: Node) => T | 'skip' | undefined
  ): T | undefined {
    const stack: Node[] = [rootNode];
    while (stack.length) {
      const parent = stack.pop()!;
      const res = visitAllPossibleChildren(parent, gatherPossibleChildren(parent));
      if (res) {
        return res;
      }
    }

    return;

    function gatherPossibleChildren(node: Node) {
      const children: (Node | NodeArray<Node>)[] = [];
      forEachChild(node, addWorkItem, addWorkItem); // By using a stack above and `unshift` here, we emulate a depth-first preorder traversal
      return children;

      function addWorkItem(n: Node | NodeArray<Node>) {
        children.unshift(n);
      }
    }

    function visitAllPossibleChildren(parent: Node, children: readonly (Node | NodeArray<Node>)[]) {
      for (const child of children) {
        if (isArray(child)) {
          if (cbNodes) {
            const res = cbNodes(child, parent);
            if (res) {
              if (res === 'skip') continue;
              return res;
            }
          }

          for (let i = child.length - 1; i >= 0; i--) {
            const realChild = child[i];
            const res = cbNode(realChild, parent);
            if (res) {
              if (res === 'skip') continue;
              return res;
            }
            stack.push(realChild);
          }
        } else {
          stack.push(child);
          const res = cbNode(child, parent);
          if (res) {
            if (res === 'skip') continue;
            return res;
          }
        }
      }
      return;
    }
  }

  export function createSourceFile(fileName: string, sourceText: string, languageVersion: ScriptTarget, setParentNodes = false, scriptKind?: ScriptKind): SourceFile {
    performance.mark('beforeParse');
    let result: SourceFile;
    perfLogger.logStartParseSourceFile(fileName);
    if (languageVersion === ScriptTarget.JSON) {
      result = Parser.parseSourceFile(fileName, sourceText, languageVersion, /*syntaxCursor*/ undefined, setParentNodes, ScriptKind.JSON);
    } else {
      result = Parser.parseSourceFile(fileName, sourceText, languageVersion, /*syntaxCursor*/ undefined, setParentNodes, scriptKind);
    }
    perfLogger.logStopParseSourceFile();
    performance.mark('afterParse');
    performance.measure('Parse', 'beforeParse', 'afterParse');
    return result;
  }

  export function parseIsolatedEntityName(text: string, languageVersion: ScriptTarget): EntityName | undefined {
    return Parser.parseIsolatedEntityName(text, languageVersion);
  }

  export function parseJsonText(fileName: string, sourceText: string): JsonSourceFile {
    return Parser.parseJsonText(fileName, sourceText);
  }

  export function isExternalModule(file: SourceFile): boolean {
    return file.externalModuleIndicator !== undefined;
  }

  export function updateSourceFile(sourceFile: SourceFile, newText: string, textChangeRange: TextChangeRange, aggressiveChecks = false): SourceFile {
    const newSourceFile = IncrementalParser.updateSourceFile(sourceFile, newText, textChangeRange, aggressiveChecks);
    // Because new source file node is created, it may not have the flag PossiblyContainDynamicImport. This is the case if there is no new edit to add dynamic import.
    // We will manually port the flag to the new source file.
    newSourceFile.flags |= sourceFile.flags & NodeFlags.PermanentlySetIncrementalFlags;
    return newSourceFile;
  }

  export function parseIsolatedJSDocComment(content: string, start?: number, length?: number) {
    const result = Parser.JSDocParser.parseIsolatedJSDocComment(content, start, length);
    if (result && result.jsDoc) {
      // because the jsDocComment was parsed out of the source file, it might
      // not be covered by the fixupParentReferences.
      Parser.fixupParentReferences(result.jsDoc);
    }

    return result;
  }

  export function parseJSDocTypeExpressionForTests(content: string, start?: number, length?: number) {
    return Parser.JSDocParser.parseJSDocTypeExpressionForTests(content, start, length);
  }

  namespace Parser {
    const scanner = Scanner.create(true);
    const disallowInAndDecoratorContext = NodeFlags.DisallowInContext | NodeFlags.DecoratorContext;

    let sourceFile: SourceFile;
    let parseDiagnostics: DiagnosticWithLocation[];
    let syntaxCursor: IncrementalParser.SyntaxCursor | undefined;

    let currentToken: Syntax;
    let sourceText: string;
    let nodeCount: number;
    let identifiers: QMap<string>;
    let privateIdentifiers: QMap<string>;
    let identifierCount: number;

    let parsingContext: ParsingContext;

    let notParenthesizedArrow: QMap<true> | undefined;

    let contextFlags: NodeFlags;

    let parseErrorBeforeNextFinishedNode = false;

    export function parseSourceFile(
      fileName: string,
      sourceText: string,
      languageVersion: ScriptTarget,
      syntaxCursor: IncrementalParser.SyntaxCursor | undefined,
      setParentNodes = false,
      scriptKind?: ScriptKind
    ): SourceFile {
      scriptKind = ensureScriptKind(fileName, scriptKind);
      if (scriptKind === ScriptKind.JSON) {
        const result = parseJsonText(fileName, sourceText, languageVersion, syntaxCursor, setParentNodes);
        convertToObjectWorker(result, result.parseDiagnostics, /*returnValue*/ false, /*knownRootOptions*/ undefined, /*jsonConversionNotifier*/ undefined);
        result.referencedFiles = emptyArray;
        result.typeReferenceDirectives = emptyArray;
        result.libReferenceDirectives = emptyArray;
        result.amdDependencies = emptyArray;
        result.hasNoDefaultLib = false;
        result.pragmas = emptyMap;
        return result;
      }

      initializeState(sourceText, languageVersion, syntaxCursor, scriptKind);

      const result = parseSourceFileWorker(fileName, languageVersion, setParentNodes, scriptKind);

      clearState();

      return result;
    }

    export function parseIsolatedEntityName(content: string, languageVersion: ScriptTarget): EntityName | undefined {
      // Choice of `isDeclarationFile` should be arbitrary
      initializeState(content, languageVersion, /*syntaxCursor*/ undefined, ScriptKind.JS);
      // Prime the scanner.
      nextToken();
      const entityName = parseEntityName(/*allowReservedWords*/ true);
      const isInvalid = token() === Syntax.EndOfFileToken && !parseDiagnostics.length;
      clearState();
      return isInvalid ? entityName : undefined;
    }

    export function parseJsonText(
      fileName: string,
      sourceText: string,
      languageVersion: ScriptTarget = ScriptTarget.ES2020,
      syntaxCursor?: IncrementalParser.SyntaxCursor,
      setParentNodes?: boolean
    ): JsonSourceFile {
      initializeState(sourceText, languageVersion, syntaxCursor, ScriptKind.JSON);
      // Set source file so that errors will be reported with this file name
      sourceFile = createSourceFile(fileName, ScriptTarget.ES2020, ScriptKind.JSON, /*isDeclaration*/ false);
      sourceFile.flags = contextFlags;

      // Prime the scanner.
      nextToken();
      const pos = getNodePos();
      if (token() === Syntax.EndOfFileToken) {
        sourceFile.statements = NodeArray.create([], pos, pos);
        sourceFile.endOfFileToken = parseTokenNode<EndOfFileToken>();
      } else {
        const statement = createNode(Syntax.ExpressionStatement) as JsonObjectExpressionStatement;
        switch (token()) {
          case Syntax.OpenBracketToken:
            statement.expression = parseArrayLiteralExpression();
            break;
          case Syntax.TrueKeyword:
          case Syntax.FalseKeyword:
          case Syntax.NullKeyword:
            statement.expression = parseTokenNode<BooleanLiteral | NullLiteral>();
            break;
          case Syntax.MinusToken:
            if (lookAhead(() => nextToken() === Syntax.NumericLiteral && nextToken() !== Syntax.ColonToken)) {
              statement.expression = parsePrefixUnaryExpression() as JsonMinusNumericLiteral;
            } else {
              statement.expression = parseObjectLiteralExpression();
            }
            break;
          case Syntax.NumericLiteral:
          case Syntax.StringLiteral:
            if (lookAhead(() => nextToken() !== Syntax.ColonToken)) {
              statement.expression = parseLiteralNode() as StringLiteral | NumericLiteral;
              break;
            }
          // falls through
          default:
            statement.expression = parseObjectLiteralExpression();
            break;
        }
        finishNode(statement);
        sourceFile.statements = NodeArray.create([statement], pos);
        sourceFile.endOfFileToken = parseExpectedToken(Syntax.EndOfFileToken, Diagnostics.Unexpected_token);
      }

      if (setParentNodes) {
        fixupParentReferences(sourceFile);
      }

      sourceFile.nodeCount = nodeCount;
      sourceFile.identifierCount = identifierCount;
      sourceFile.identifiers = identifiers;
      sourceFile.parseDiagnostics = parseDiagnostics;

      const result = sourceFile as JsonSourceFile;
      clearState();
      return result;
    }

    function getLanguageVariant(scriptKind: ScriptKind) {
      // .tsx and .jsx files are treated as jsx language variant.
      return scriptKind === ScriptKind.TSX || scriptKind === ScriptKind.JSX || scriptKind === ScriptKind.JS || scriptKind === ScriptKind.JSON ? LanguageVariant.TX : LanguageVariant.TS;
    }

    function initializeState(_sourceText: string, languageVersion: ScriptTarget, _syntaxCursor: IncrementalParser.SyntaxCursor | undefined, scriptKind: ScriptKind) {
      sourceText = _sourceText;
      syntaxCursor = _syntaxCursor;

      parseDiagnostics = [];
      parsingContext = 0;
      identifiers = QMap.create<string>();
      privateIdentifiers = QMap.create<string>();
      identifierCount = 0;
      nodeCount = 0;

      switch (scriptKind) {
        case ScriptKind.JS:
        case ScriptKind.JSX:
          contextFlags = NodeFlags.JavaScriptFile;
          break;
        case ScriptKind.JSON:
          contextFlags = NodeFlags.JavaScriptFile | NodeFlags.JsonFile;
          break;
        default:
          contextFlags = NodeFlags.None;
          break;
      }
      parseErrorBeforeNextFinishedNode = false;

      // Initialize and prime the scanner before parsing the source elements.
      scanner.setText(sourceText);
      scanner.setOnError(scanError);
      scanner.setScriptTarget(languageVersion);
      scanner.setLanguageVariant(getLanguageVariant(scriptKind));
    }

    function clearState() {
      scanner.clearDirectives();
      scanner.setText('');
      scanner.setOnError(undefined);
      parseDiagnostics = undefined!;
      sourceFile = undefined!;
      identifiers = undefined!;
      syntaxCursor = undefined;
      sourceText = undefined!;
      notParenthesizedArrow = undefined!;
    }

    function parseSourceFileWorker(fileName: string, languageVersion: ScriptTarget, setParentNodes: boolean, scriptKind: ScriptKind): SourceFile {
      const isDeclarationFile = isDeclarationFileName(fileName);
      if (isDeclarationFile) {
        contextFlags |= NodeFlags.Ambient;
      }

      sourceFile = createSourceFile(fileName, languageVersion, scriptKind, isDeclarationFile);
      sourceFile.flags = contextFlags;

      // Prime the scanner.
      nextToken();
      // A member of ReadonlyArray<T> isn't assignable to a member of T[] (and prevents a direct cast) - but this is where we set up those members so they can be readonly in the future
      processCommentPragmas((sourceFile as {}) as PragmaContext, sourceText);
      processPragmasIntoFields((sourceFile as {}) as PragmaContext, reportPragmaDiagnostic);

      sourceFile.statements = parseList(ParsingContext.SourceElements, parseStatement);
      assert(token() === Syntax.EndOfFileToken);
      sourceFile.endOfFileToken = addJSDocComment(parseTokenNode());

      setExternalModuleIndicator(sourceFile);

      sourceFile.commentDirectives = scanner.getDirectives();
      sourceFile.nodeCount = nodeCount;
      sourceFile.identifierCount = identifierCount;
      sourceFile.identifiers = identifiers;
      sourceFile.parseDiagnostics = parseDiagnostics;

      if (setParentNodes) {
        fixupParentReferences(sourceFile);
      }

      return sourceFile;

      function reportPragmaDiagnostic(pos: number, end: number, diagnostic: DiagnosticMessage) {
        parseDiagnostics.push(createFileDiagnostic(sourceFile, pos, end, diagnostic));
      }
    }

    function addJSDocComment<T extends HasJSDoc>(node: T): T {
      assert(!node.jsDoc); // Should only be called once per node
      const jsDoc = mapDefined(getJSDocCommentRanges(node, sourceFile.text), (comment) => JSDocParser.parseJSDocComment(node, comment.pos, comment.end - comment.pos));
      if (jsDoc.length) node.jsDoc = jsDoc;
      return node;
    }

    export function fixupParentReferences(rootNode: Node) {
      // normally parent references are set during binding. However, for clients that only need
      // a syntax tree, and no semantic features, then the binding process is an unnecessary
      // overhead.  This functions allows us to set all the parents, without all the expense of
      // binding.
      forEachChildRecursively(rootNode, bindParentToChild);

      function bindParentToChild(child: Node, parent: Node) {
        child.parent = parent;
        if (hasJSDocNodes(child)) {
          for (const doc of child.jsDoc!) {
            bindParentToChild(doc, child);
            forEachChildRecursively(doc, bindParentToChild);
          }
        }
      }
    }

    function createSourceFile(fileName: string, languageVersion: ScriptTarget, scriptKind: ScriptKind, isDeclarationFile: boolean): SourceFile {
      const sourceFile = <SourceFile>new SourceFileC(Syntax.SourceFile, /*pos*/ 0, /* end */ sourceText.length);
      nodeCount++;

      sourceFile.text = sourceText;
      sourceFile.bindDiagnostics = [];
      sourceFile.bindSuggestionDiagnostics = undefined;
      sourceFile.languageVersion = languageVersion;
      sourceFile.fileName = normalizePath(fileName);
      sourceFile.languageVariant = getLanguageVariant(scriptKind);
      sourceFile.isDeclarationFile = isDeclarationFile;
      sourceFile.scriptKind = scriptKind;

      return sourceFile;
    }

    function setContextFlag(v: boolean, fs: NodeFlags) {
      if (v) contextFlags |= fs;
      else contextFlags &= ~fs;
    }
    function setDisallowInContext(v: boolean) {
      setContextFlag(v, NodeFlags.DisallowInContext);
    }
    function setYieldContext(v: boolean) {
      setContextFlag(v, NodeFlags.YieldContext);
    }
    function setDecoratorContext(v: boolean) {
      setContextFlag(v, NodeFlags.DecoratorContext);
    }
    function setAwaitContext(v: boolean) {
      setContextFlag(v, NodeFlags.AwaitContext);
    }
    function doOutsideOfContext<T>(fs: NodeFlags, f: () => T): T {
      const clear = fs & contextFlags;
      if (clear) {
        setContextFlag(false, clear);
        const r = f();
        setContextFlag(true, clear);
        return r;
      }
      return f();
    }
    function doInsideOfContext<T>(fs: NodeFlags, f: () => T): T {
      const set = fs & ~contextFlags;
      if (set) {
        setContextFlag(true, set);
        const r = f();
        setContextFlag(false, set);
        return r;
      }
      return f();
    }
    function allowInAnd<T>(f: () => T): T {
      return doOutsideOfContext(NodeFlags.DisallowInContext, f);
    }
    function disallowInAnd<T>(f: () => T): T {
      return doInsideOfContext(NodeFlags.DisallowInContext, f);
    }
    function doInYieldContext<T>(f: () => T): T {
      return doInsideOfContext(NodeFlags.YieldContext, f);
    }
    function doInDecoratorContext<T>(f: () => T): T {
      return doInsideOfContext(NodeFlags.DecoratorContext, f);
    }
    function doInAwaitContext<T>(f: () => T): T {
      return doInsideOfContext(NodeFlags.AwaitContext, f);
    }
    function doOutsideOfAwaitContext<T>(f: () => T): T {
      return doOutsideOfContext(NodeFlags.AwaitContext, f);
    }
    function doInYieldAndAwaitContext<T>(f: () => T): T {
      return doInsideOfContext(NodeFlags.YieldContext | NodeFlags.AwaitContext, f);
    }
    function doOutsideOfYieldAndAwaitContext<T>(f: () => T): T {
      return doOutsideOfContext(NodeFlags.YieldContext | NodeFlags.AwaitContext, f);
    }
    function inContext(flags: NodeFlags) {
      return (contextFlags & flags) !== 0;
    }
    function inYieldContext() {
      return inContext(NodeFlags.YieldContext);
    }
    function inDisallowInContext() {
      return inContext(NodeFlags.DisallowInContext);
    }
    function inDecoratorContext() {
      return inContext(NodeFlags.DecoratorContext);
    }
    function inAwaitContext() {
      return inContext(NodeFlags.AwaitContext);
    }
    function parseErrorAtCurrentToken(m: DiagnosticMessage, arg0?: any) {
      parseErrorAt(scanner.getTokenPos(), scanner.getTextPos(), m, arg0);
    }
    function parseErrorAtPosition(start: number, length: number, m: DiagnosticMessage, arg0?: any) {
      const l = lastOrUndefined(parseDiagnostics);
      if (!l || start !== l.start) parseDiagnostics.push(createFileDiagnostic(sourceFile, start, length, m, arg0));
      parseErrorBeforeNextFinishedNode = true;
    }
    function parseErrorAt(start: number, end: number, m: DiagnosticMessage, arg0?: any) {
      parseErrorAtPosition(start, end - start, m, arg0);
    }
    function parseErrorAtRange(r: TextRange, m: DiagnosticMessage, arg0?: any) {
      parseErrorAt(r.pos, r.end, m, arg0);
    }
    function scanError(m: DiagnosticMessage, length: number) {
      parseErrorAtPosition(scanner.getTextPos(), length, m);
    }
    function getNodePos(): number {
      return scanner.getStartPos();
    }
    function token(): Syntax {
      return currentToken;
    }
    function nextToken(): Syntax {
      if (isKeyword(currentToken) && (scanner.hasUnicodeEscape() || scanner.hasExtendedEscape())) {
        parseErrorAt(scanner.getTokenPos(), scanner.getTextPos(), Diagnostics.Keywords_cannot_contain_escape_characters);
      }
      return nextTokenWithoutCheck();
    }
    function nextTokenWithoutCheck(): Syntax {
      return (currentToken = scanner.scan());
    }
    function nextTokenJSDoc(): JSDocSyntax {
      return (currentToken = scanner.scanJsDocToken());
    }
    function scanJsxText(): Syntax {
      return (currentToken = scanner.scanJsxToken());
    }
    function scanJsxIdentifier(): Syntax {
      return (currentToken = scanner.scanJsxIdentifier());
    }
    function scanJsxAttributeValue(): Syntax {
      return (currentToken = scanner.scanJsxAttributeValue());
    }
    function reScanGreaterToken(): Syntax {
      return (currentToken = scanner.reScanGreaterToken());
    }
    function reScanLessToken(): Syntax {
      return (currentToken = scanner.reScanLessToken());
    }
    function reScanSlashToken(): Syntax {
      return (currentToken = scanner.reScanSlashToken());
    }
    function reScanTemplateToken(tagged: boolean): Syntax {
      return (currentToken = scanner.reScanTemplateToken(tagged));
    }
    function reScanHeadOrNoSubstTemplate(): Syntax {
      return (currentToken = scanner.reScanHeadOrNoSubstTemplate());
    }
    function speculate<T>(cb: () => T, isLookAhead: boolean): T {
      const saveToken = currentToken;
      const saveParseDiagnosticsLength = parseDiagnostics.length;
      const saveParseErrorBeforeNextFinishedNode = parseErrorBeforeNextFinishedNode;
      const saveContextFlags = contextFlags;
      const r = isLookAhead ? scanner.lookAhead(cb) : scanner.tryScan(cb);
      assert(saveContextFlags === contextFlags);
      if (!r || isLookAhead) {
        currentToken = saveToken;
        parseDiagnostics.length = saveParseDiagnosticsLength;
        parseErrorBeforeNextFinishedNode = saveParseErrorBeforeNextFinishedNode;
      }
      return r;
    }
    function lookAhead<T>(cb: () => T): T {
      return speculate(cb, true);
    }
    function tryParse<T>(cb: () => T): T {
      return speculate(cb, false);
    }
    function createNode<T extends Node>(k: Syntax, pos?: number): T {
      nodeCount++;
      const p = pos! >= 0 ? pos! : scanner.getStartPos();
      return Node.create(k, p, p);
    }
    function createMissingNode<T extends Node>(k: T['kind'], report: false, m?: DiagnosticMessage, arg0?: any): T;
    function createMissingNode<T extends Node>(k: T['kind'], report: true, m: DiagnosticMessage, arg0?: any): T;
    function createMissingNode<T extends Node>(k: T['kind'], report: boolean, m?: DiagnosticMessage, arg0?: any): T {
      if (report) parseErrorAtPosition(scanner.getStartPos(), 0, m!, arg0);
      else if (m) parseErrorAtCurrentToken(m, arg0);
      const r = createNode<T>(k);
      if (k === Syntax.Identifier) (r as Identifier).escapedText = '' as __String;
      else if (isLiteralKind(k) || isTemplateLiteralKind(k)) (r as LiteralLikeNode).text = '';
      return finishNode(r);
    }
    function createNodeArray<T extends Node>(es: T[], pos: number, end?: number): NodeArray<T> {
      const l = es.length;
      const r = (l >= 1 && l <= 4 ? es.slice() : es) as MutableNodeArray<T>;
      r.pos = pos;
      r.end = end === undefined ? scanner.getStartPos() : end;
      return r;
    }
    function finishNode<T extends Node>(n: T, end?: number): T {
      n.end = end === undefined ? scanner.getStartPos() : end;
      if (contextFlags) n.flags |= contextFlags;
      if (parseErrorBeforeNextFinishedNode) {
        parseErrorBeforeNextFinishedNode = false;
        n.flags |= NodeFlags.ThisNodeHasError;
      }
      return n;
    }
    function createNodeWithJSDoc<T extends Node>(k: Syntax, pos?: number): T {
      const n = createNode<HasJSDoc>(k, pos);
      if (scanner.getTokenFlags() & TokenFlags.PrecedingJSDocComment && (k !== Syntax.ExpressionStatement || token() !== Syntax.OpenParenToken)) {
        addJSDocComment(n);
      }
      return n as T;
    }
    function isIdentifier() {
      if (token() === Syntax.Identifier) return true;
      if (token() === Syntax.YieldKeyword && inYieldContext()) return false;
      if (token() === Syntax.AwaitKeyword && inAwaitContext()) return false;
      return token() > Syntax.LastReservedWord;
    }
    function parseExpected(t: Syntax, m?: DiagnosticMessage, advance = true): boolean {
      if (token() === t) {
        if (advance) nextToken();
        return true;
      }
      if (m) parseErrorAtCurrentToken(m);
      else parseErrorAtCurrentToken(Diagnostics._0_expected, Token.toString(t));
      return false;
    }
    function parseExpectedJSDoc(t: JSDocSyntax): boolean {
      if (token() === t) {
        nextTokenJSDoc();
        return true;
      }
      parseErrorAtCurrentToken(Diagnostics._0_expected, Token.toString(t));
      return false;
    }
    function parseOptional(t: Syntax): boolean {
      if (token() === t) {
        nextToken();
        return true;
      }
      return false;
    }
    function parseOptionalToken<T extends Syntax>(t: T): Token<T>;
    function parseOptionalToken(t: Syntax): Node | undefined {
      if (token() === t) return parseTokenNode();
      return;
    }
    function parseOptionalTokenJSDoc<T extends JSDocSyntax>(t: T): Token<T>;
    function parseOptionalTokenJSDoc(t: JSDocSyntax): Node | undefined {
      if (token() === t) return parseTokenNodeJSDoc();

      return;
    }
    function parseExpectedToken<T extends Syntax>(t: T, m?: DiagnosticMessage, arg0?: any): Token<T>;
    function parseExpectedToken(t: Syntax, m?: DiagnosticMessage, arg0?: any): Node {
      return parseOptionalToken(t) || createMissingNode(t, false, m || Diagnostics._0_expected, arg0 || Token.toString(t));
    }
    function parseExpectedTokenJSDoc<T extends JSDocSyntax>(t: T): Token<T>;
    function parseExpectedTokenJSDoc(t: JSDocSyntax): Node {
      return parseOptionalTokenJSDoc(t) || createMissingNode(t, false, Diagnostics._0_expected, Token.toString(t));
    }
    function parseTokenNode<T extends Node>(): T {
      const n = createNode<T>(token());
      nextToken();
      return finishNode(n);
    }
    function parseTokenNodeJSDoc<T extends Node>(): T {
      const n = createNode<T>(token());
      nextTokenJSDoc();
      return finishNode(n);
    }
    function canParseSemicolon() {
      if (token() === Syntax.SemicolonToken) return true;
      return token() === Syntax.CloseBraceToken || token() === Syntax.EndOfFileToken || scanner.hasPrecedingLineBreak();
    }
    function parseSemicolon(): boolean {
      if (canParseSemicolon()) {
        if (token() === Syntax.SemicolonToken) nextToken();
        return true;
      }
      return parseExpected(Syntax.SemicolonToken);
    }
    function internIdentifier(s: string): string {
      let i = identifiers.get(s);
      if (i === undefined) identifiers.set(s, (i = s));
      return i;
    }
    function createIdentifier(isIdentifier: boolean, m?: DiagnosticMessage, pm?: DiagnosticMessage): Identifier {
      identifierCount++;
      if (isIdentifier) {
        const n = createNode<Identifier>(Syntax.Identifier);
        if (token() !== Syntax.Identifier) n.originalKeywordKind = token();
        n.escapedText = Scanner.escUnderscores(internIdentifier(scanner.getTokenValue()));
        nextTokenWithoutCheck();
        return finishNode(n);
      }
      if (token() === Syntax.PrivateIdentifier) {
        parseErrorAtCurrentToken(pm || Diagnostics.Private_identifiers_are_not_allowed_outside_class_bodies);
        return createIdentifier(true);
      }
      const report = token() === Syntax.EndOfFileToken;
      const r = scanner.isReservedWord();
      const t = scanner.getTokenText();
      const dm = r ? Diagnostics.Identifier_expected_0_is_a_reserved_word_that_cannot_be_used_here : Diagnostics.Identifier_expected;
      return createMissingNode<Identifier>(Syntax.Identifier, report, m || dm, t);
    }
    function parseIdentifier(m?: DiagnosticMessage, pm?: DiagnosticMessage): Identifier {
      return createIdentifier(isIdentifier(), m, pm);
    }
    function parseIdentifierName(m?: DiagnosticMessage): Identifier {
      return createIdentifier(Token.identifierOrKeyword(token()), m);
    }
    function isLiteralPropertyName(): boolean {
      return Token.identifierOrKeyword(token()) || token() === Syntax.StringLiteral || token() === Syntax.NumericLiteral;
    }
    function parsePropertyNameWorker(computed: boolean): PropertyName {
      if (token() === Syntax.StringLiteral || token() === Syntax.NumericLiteral) {
        const n = parseLiteralNode() as StringLiteral | NumericLiteral;
        n.text = internIdentifier(n.text);
        return n;
      }
      if (computed && token() === Syntax.OpenBracketToken) return parseComputedPropertyName();
      if (token() === Syntax.PrivateIdentifier) return parsePrivateIdentifier();
      return parseIdentifierName();
    }
    function parsePropertyName(): PropertyName {
      return parsePropertyNameWorker(true);
    }
    function parseComputedPropertyName(): ComputedPropertyName {
      // PropertyName [Yield]:
      //      LiteralPropertyName
      //      ComputedPropertyName[?Yield]
      const n = createNode<ComputedPropertyName>(Syntax.ComputedPropertyName);
      parseExpected(Syntax.OpenBracketToken);
      n.expression = allowInAnd(parseExpression);
      parseExpected(Syntax.CloseBracketToken);
      return finishNode(n);
    }
    function internPrivateIdentifier(s: string): string {
      let i = privateIdentifiers.get(s);
      if (i === undefined) privateIdentifiers.set(s, (i = s));
      return i;
    }
    function parsePrivateIdentifier(): PrivateIdentifier {
      const n = createNode<PrivateIdentifier>(Syntax.PrivateIdentifier);
      n.escapedText = Scanner.escUnderscores(internPrivateIdentifier(scanner.getTokenText()));
      nextToken();
      return finishNode(n);
    }
    function parseContextualModifier(t: Syntax): boolean {
      return token() === t && tryParse(nextTokenCanFollowModifier);
    }
    function nextTokenIsOnSameLineAndCanFollowModifier() {
      nextToken();
      if (scanner.hasPrecedingLineBreak()) return false;
      return canFollowModifier();
    }
    function nextTokenCanFollowModifier() {
      switch (token()) {
        case Syntax.ConstKeyword:
          return nextToken() === Syntax.EnumKeyword;
        case Syntax.ExportKeyword:
          nextToken();
          if (token() === Syntax.DefaultKeyword) return lookAhead(nextTokenCanFollowDefaultKeyword);
          if (token() === Syntax.TypeKeyword) return lookAhead(nextTokenCanFollowExportModifier);
          return canFollowExportModifier();
        case Syntax.DefaultKeyword:
          return nextTokenCanFollowDefaultKeyword();
        case Syntax.StaticKeyword:
        case Syntax.GetKeyword:
        case Syntax.SetKeyword:
          nextToken();
          return canFollowModifier();
        default:
          return nextTokenIsOnSameLineAndCanFollowModifier();
      }
    }
    function canFollowExportModifier() {
      return token() !== Syntax.AsteriskToken && token() !== Syntax.AsKeyword && token() !== Syntax.OpenBraceToken && canFollowModifier();
    }
    function nextTokenCanFollowExportModifier() {
      nextToken();
      return canFollowExportModifier();
    }
    function parseAnyContextualModifier() {
      return isModifierKind(token()) && tryParse(nextTokenCanFollowModifier);
    }
    function canFollowModifier() {
      return token() === Syntax.OpenBracketToken || token() === Syntax.OpenBraceToken || token() === Syntax.AsteriskToken || token() === Syntax.Dot3Token || isLiteralPropertyName();
    }
    function nextTokenCanFollowDefaultKeyword() {
      nextToken();
      return (
        token() === Syntax.ClassKeyword ||
        token() === Syntax.FunctionKeyword ||
        token() === Syntax.InterfaceKeyword ||
        (token() === Syntax.AbstractKeyword && lookAhead(nextTokenIsClassKeywordOnSameLine)) ||
        (token() === Syntax.AsyncKeyword && lookAhead(nextTokenIsFunctionKeywordOnSameLine))
      );
    }
    function isListElement(c: ParsingContext, inErrorRecovery: boolean): boolean {
      if (currentNode(c)) return true;
      switch (c) {
        case ParsingContext.SourceElements:
        case ParsingContext.BlockStatements:
        case ParsingContext.SwitchClauseStatements:
          return !(token() === Syntax.SemicolonToken && inErrorRecovery) && isStartOfStatement();
        case ParsingContext.SwitchClauses:
          return token() === Syntax.CaseKeyword || token() === Syntax.DefaultKeyword;
        case ParsingContext.TypeMembers:
          return lookAhead(isTypeMemberStart);
        case ParsingContext.ClassMembers:
          return lookAhead(isClassMemberStart) || (token() === Syntax.SemicolonToken && !inErrorRecovery);
        case ParsingContext.EnumMembers:
          return token() === Syntax.OpenBracketToken || isLiteralPropertyName();
        case ParsingContext.ObjectLiteralMembers:
          switch (token()) {
            case Syntax.OpenBracketToken:
            case Syntax.AsteriskToken:
            case Syntax.Dot3Token:
            case Syntax.DotToken:
              return true;
            default:
              return isLiteralPropertyName();
          }
        case ParsingContext.RestProperties:
          return isLiteralPropertyName();
        case ParsingContext.ObjectBindingElements:
          return token() === Syntax.OpenBracketToken || token() === Syntax.Dot3Token || isLiteralPropertyName();
        case ParsingContext.HeritageClauseElement:
          if (token() === Syntax.OpenBraceToken) return lookAhead(isValidHeritageClauseObjectLiteral);
          if (!inErrorRecovery) return isStartOfLeftHandSideExpression() && !isHeritageClauseExtendsOrImplementsKeyword();
          return isIdentifier() && !isHeritageClauseExtendsOrImplementsKeyword();
        case ParsingContext.VariableDeclarations:
          return isIdentifierOrPrivateIdentifierOrPattern();
        case ParsingContext.ArrayBindingElements:
          return token() === Syntax.CommaToken || token() === Syntax.Dot3Token || isIdentifierOrPrivateIdentifierOrPattern();
        case ParsingContext.TypeParameters:
          return isIdentifier();
        case ParsingContext.ArrayLiteralMembers:
          switch (token()) {
            case Syntax.CommaToken:
            case Syntax.DotToken:
              return true;
          }
        case ParsingContext.ArgumentExpressions:
          return token() === Syntax.Dot3Token || isStartOfExpression();
        case ParsingContext.Parameters:
          return isStartOfParameter(/*isJSDocParameter*/ false);
        case ParsingContext.JSDocParameters:
          return isStartOfParameter(/*isJSDocParameter*/ true);
        case ParsingContext.TypeArguments:
        case ParsingContext.TupleElementTypes:
          return token() === Syntax.CommaToken || isStartOfType();
        case ParsingContext.HeritageClauses:
          return isHeritageClause();
        case ParsingContext.ImportOrExportSpecifiers:
          return Token.identifierOrKeyword(token());
        case ParsingContext.JsxAttributes:
          return Token.identifierOrKeyword(token()) || token() === Syntax.OpenBraceToken;
        case ParsingContext.JsxChildren:
          return true;
      }
      return fail("Non-exhaustive case in 'isListElement'.");
    }
    function isValidHeritageClauseObjectLiteral() {
      assert(token() === Syntax.OpenBraceToken);
      if (nextToken() === Syntax.CloseBraceToken) {
        const t = nextToken();
        return t === Syntax.CommaToken || t === Syntax.OpenBraceToken || t === Syntax.ExtendsKeyword || t === Syntax.ImplementsKeyword;
      }
      return true;
    }
    function nextTokenIsIdentifier() {
      nextToken();
      return isIdentifier();
    }
    function nextTokenIsIdentifierOrKeyword() {
      nextToken();
      return Token.identifierOrKeyword(token());
    }
    function nextTokenIsIdentifierOrKeywordOrGreaterThan() {
      nextToken();
      return Token.identifierOrKeywordOrGreaterThan(token());
    }
    function isHeritageClauseExtendsOrImplementsKeyword(): boolean {
      if (token() === Syntax.ImplementsKeyword || token() === Syntax.ExtendsKeyword) return lookAhead(nextTokenIsStartOfExpression);
      return false;
    }
    function nextTokenIsStartOfExpression() {
      nextToken();
      return isStartOfExpression();
    }
    function nextTokenIsStartOfType() {
      nextToken();
      return isStartOfType();
    }
    function isListTerminator(c: ParsingContext): boolean {
      if (token() === Syntax.EndOfFileToken) return true;
      switch (c) {
        case ParsingContext.BlockStatements:
        case ParsingContext.SwitchClauses:
        case ParsingContext.TypeMembers:
        case ParsingContext.ClassMembers:
        case ParsingContext.EnumMembers:
        case ParsingContext.ObjectLiteralMembers:
        case ParsingContext.ObjectBindingElements:
        case ParsingContext.ImportOrExportSpecifiers:
          return token() === Syntax.CloseBraceToken;
        case ParsingContext.SwitchClauseStatements:
          return token() === Syntax.CloseBraceToken || token() === Syntax.CaseKeyword || token() === Syntax.DefaultKeyword;
        case ParsingContext.HeritageClauseElement:
          return token() === Syntax.OpenBraceToken || token() === Syntax.ExtendsKeyword || token() === Syntax.ImplementsKeyword;
        case ParsingContext.VariableDeclarations:
          return isVariableDeclaratorListTerminator();
        case ParsingContext.TypeParameters:
          return (
            token() === Syntax.GreaterThanToken || token() === Syntax.OpenParenToken || token() === Syntax.OpenBraceToken || token() === Syntax.ExtendsKeyword || token() === Syntax.ImplementsKeyword
          );
        case ParsingContext.ArgumentExpressions:
          return token() === Syntax.CloseParenToken || token() === Syntax.SemicolonToken;
        case ParsingContext.ArrayLiteralMembers:
        case ParsingContext.TupleElementTypes:
        case ParsingContext.ArrayBindingElements:
          return token() === Syntax.CloseBracketToken;
        case ParsingContext.JSDocParameters:
        case ParsingContext.Parameters:
        case ParsingContext.RestProperties:
          return token() === Syntax.CloseParenToken || token() === Syntax.CloseBracketToken /*|| token === Syntax.OpenBraceToken*/;
        case ParsingContext.TypeArguments:
          return token() !== Syntax.CommaToken;
        case ParsingContext.HeritageClauses:
          return token() === Syntax.OpenBraceToken || token() === Syntax.CloseBraceToken;
        case ParsingContext.JsxAttributes:
          return token() === Syntax.GreaterThanToken || token() === Syntax.SlashToken;
        case ParsingContext.JsxChildren:
          return token() === Syntax.LessThanToken && lookAhead(nextTokenIsSlash);
        default:
          return false;
      }
    }
    function isVariableDeclaratorListTerminator(): boolean {
      if (canParseSemicolon()) return true;
      if (isInOrOfKeyword(token())) return true;
      if (token() === Syntax.EqualsGreaterThanToken) return true;
      return false;
    }
    function isInSomeParsingContext(): boolean {
      for (let c = 0; c < ParsingContext.Count; c++) {
        if (parsingContext & (1 << c)) {
          if (isListElement(c, true) || isListTerminator(c)) return true;
        }
      }
      return false;
    }
    function parseList<T extends Node>(c: ParsingContext, cb: () => T): NodeArray<T> {
      const o = parsingContext;
      parsingContext |= 1 << c;
      const es = [] as T[];
      const p = getNodePos();
      while (!isListTerminator(c)) {
        if (isListElement(c, false)) {
          const e = parseListElement(c, cb);
          es.push(e);
          continue;
        }
        if (abortParsingListOrMoveToNextToken(c)) break;
      }
      parsingContext = o;
      return NodeArray.create(es, p);
    }
    function parseListElement<T extends Node>(c: ParsingContext, cb: () => T): T {
      const n = currentNode(c);
      if (n) return <T>consumeNode(n);
      return cb();
    }
    function currentNode(c: ParsingContext): Node | undefined {
      if (!syntaxCursor || !isReusableParsingContext(c) || parseErrorBeforeNextFinishedNode) return;
      const n = syntaxCursor.currentNode(scanner.getStartPos());
      if (nodeIsMissing(n) || n.intersectsChange || containsParseError(n)) return;
      const fs = n.flags & NodeFlags.ContextFlags;
      if (fs !== contextFlags) return;
      if (!canReuseNode(n, c)) return;
      if ((n as JSDocContainer).jsDocCache) (n as JSDocContainer).jsDocCache = undefined;
      return n;
    }
    function consumeNode(n: Node) {
      scanner.setTextPos(n.end);
      nextToken();
      return n;
    }
    function isReusableParsingContext(c: ParsingContext): boolean {
      switch (c) {
        case ParsingContext.ClassMembers:
        case ParsingContext.SwitchClauses:
        case ParsingContext.SourceElements:
        case ParsingContext.BlockStatements:
        case ParsingContext.SwitchClauseStatements:
        case ParsingContext.EnumMembers:
        case ParsingContext.TypeMembers:
        case ParsingContext.VariableDeclarations:
        case ParsingContext.JSDocParameters:
        case ParsingContext.Parameters:
          return true;
      }
      return false;
    }
    function canReuseNode(n: Node, c: ParsingContext): boolean {
      switch (c) {
        case ParsingContext.ClassMembers:
          return isReusableClassMember(n);
        case ParsingContext.SwitchClauses:
          return isReusableSwitchClause(n);
        case ParsingContext.SourceElements:
        case ParsingContext.BlockStatements:
        case ParsingContext.SwitchClauseStatements:
          return isReusableStatement(n);
        case ParsingContext.EnumMembers:
          return isReusableEnumMember(n);
        case ParsingContext.TypeMembers:
          return isReusableTypeMember(n);
        case ParsingContext.VariableDeclarations:
          return isReusableVariableDeclaration(n);
        case ParsingContext.JSDocParameters:
        case ParsingContext.Parameters:
          return isReusableParameter(n);
      }
      return false;
    }
    function isReusableClassMember(n: Node) {
      if (n) {
        switch (n.kind) {
          case Syntax.Constructor:
          case Syntax.IndexSignature:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
          case Syntax.PropertyDeclaration:
          case Syntax.SemicolonClassElement:
            return true;
          case Syntax.MethodDeclaration:
            const d = n as MethodDeclaration;
            const isConstructor = d.name.kind === Syntax.Identifier && d.name.originalKeywordKind === Syntax.ConstructorKeyword;
            return !isConstructor;
        }
      }
      return false;
    }
    function isReusableSwitchClause(n: Node) {
      if (n) {
        switch (n.kind) {
          case Syntax.CaseClause:
          case Syntax.DefaultClause:
            return true;
        }
      }
      return false;
    }
    function isReusableStatement(n: Node) {
      if (n) {
        switch (n.kind) {
          case Syntax.FunctionDeclaration:
          case Syntax.VariableStatement:
          case Syntax.Block:
          case Syntax.IfStatement:
          case Syntax.ExpressionStatement:
          case Syntax.ThrowStatement:
          case Syntax.ReturnStatement:
          case Syntax.SwitchStatement:
          case Syntax.BreakStatement:
          case Syntax.ContinueStatement:
          case Syntax.ForInStatement:
          case Syntax.ForOfStatement:
          case Syntax.ForStatement:
          case Syntax.WhileStatement:
          case Syntax.WithStatement:
          case Syntax.EmptyStatement:
          case Syntax.TryStatement:
          case Syntax.LabeledStatement:
          case Syntax.DoStatement:
          case Syntax.DebuggerStatement:
          case Syntax.ImportDeclaration:
          case Syntax.ImportEqualsDeclaration:
          case Syntax.ExportDeclaration:
          case Syntax.ExportAssignment:
          case Syntax.ModuleDeclaration:
          case Syntax.ClassDeclaration:
          case Syntax.InterfaceDeclaration:
          case Syntax.EnumDeclaration:
          case Syntax.TypeAliasDeclaration:
            return true;
        }
      }
      return false;
    }
    function isReusableEnumMember(n: Node) {
      return n.kind === Syntax.EnumMember;
    }
    function isReusableTypeMember(n: Node) {
      if (n) {
        switch (n.kind) {
          case Syntax.ConstructSignature:
          case Syntax.MethodSignature:
          case Syntax.IndexSignature:
          case Syntax.PropertySignature:
          case Syntax.CallSignature:
            return true;
        }
      }
      return false;
    }
    function isReusableVariableDeclaration(n: Node) {
      if (n.kind !== Syntax.VariableDeclaration) return false;
      const d = n as VariableDeclaration;
      return d.initializer === undefined;
    }
    function isReusableParameter(n: Node) {
      if (n.kind !== Syntax.Parameter) return false;
      const d = n as ParameterDeclaration;
      return d.initializer === undefined;
    }
    function abortParsingListOrMoveToNextToken(c: ParsingContext) {
      parseErrorAtCurrentToken(parsingContextErrors(c));
      if (isInSomeParsingContext()) return true;
      nextToken();
      return false;
    }
    function parsingContextErrors(c: ParsingContext): DiagnosticMessage {
      switch (c) {
        case ParsingContext.SourceElements:
          return Diagnostics.Declaration_or_statement_expected;
        case ParsingContext.BlockStatements:
          return Diagnostics.Declaration_or_statement_expected;
        case ParsingContext.SwitchClauses:
          return Diagnostics.case_or_default_expected;
        case ParsingContext.SwitchClauseStatements:
          return Diagnostics.Statement_expected;
        case ParsingContext.RestProperties:
        case ParsingContext.TypeMembers:
          return Diagnostics.Property_or_signature_expected;
        case ParsingContext.ClassMembers:
          return Diagnostics.Unexpected_token_A_constructor_method_accessor_or_property_was_expected;
        case ParsingContext.EnumMembers:
          return Diagnostics.Enum_member_expected;
        case ParsingContext.HeritageClauseElement:
          return Diagnostics.Expression_expected;
        case ParsingContext.VariableDeclarations:
          return Diagnostics.Variable_declaration_expected;
        case ParsingContext.ObjectBindingElements:
          return Diagnostics.Property_destructuring_pattern_expected;
        case ParsingContext.ArrayBindingElements:
          return Diagnostics.Array_element_destructuring_pattern_expected;
        case ParsingContext.ArgumentExpressions:
          return Diagnostics.Argument_expression_expected;
        case ParsingContext.ObjectLiteralMembers:
          return Diagnostics.Property_assignment_expected;
        case ParsingContext.ArrayLiteralMembers:
          return Diagnostics.Expression_or_comma_expected;
        case ParsingContext.JSDocParameters:
          return Diagnostics.Parameter_declaration_expected;
        case ParsingContext.Parameters:
          return Diagnostics.Parameter_declaration_expected;
        case ParsingContext.TypeParameters:
          return Diagnostics.Type_parameter_declaration_expected;
        case ParsingContext.TypeArguments:
          return Diagnostics.Type_argument_expected;
        case ParsingContext.TupleElementTypes:
          return Diagnostics.Type_expected;
        case ParsingContext.HeritageClauses:
          return Diagnostics.Unexpected_token_expected;
        case ParsingContext.ImportOrExportSpecifiers:
          return Diagnostics.Identifier_expected;
        case ParsingContext.JsxAttributes:
          return Diagnostics.Identifier_expected;
        case ParsingContext.JsxChildren:
          return Diagnostics.Identifier_expected;
        default:
          return undefined!;
      }
    }
    function parseDelimitedList<T extends Node>(c: ParsingContext, cb: () => T, considerSemicolonAsDelimiter?: boolean): NodeArray<T> {
      const o = parsingContext;
      parsingContext |= 1 << c;
      const es = [] as T[];
      const p = getNodePos();
      let s = -1;
      while (true) {
        if (isListElement(c, false)) {
          const sp = scanner.getStartPos();
          es.push(parseListElement(c, cb));
          s = scanner.getTokenPos();
          if (parseOptional(Syntax.CommaToken)) continue;
          s = -1;
          if (isListTerminator(c)) break;
          parseExpected(Syntax.CommaToken, getExpectedCommaDiagnostic(c));
          if (considerSemicolonAsDelimiter && token() === Syntax.SemicolonToken && !scanner.hasPrecedingLineBreak()) nextToken();
          if (sp === scanner.getStartPos()) nextToken();
          continue;
        }
        if (isListTerminator(c)) break;
        if (abortParsingListOrMoveToNextToken(c)) break;
      }
      parsingContext = o;
      const r = NodeArray.create(es, p);
      if (s >= 0) r.hasTrailingComma = true;
      return r;
    }
    function getExpectedCommaDiagnostic(c: ParsingContext) {
      return c === ParsingContext.EnumMembers ? Diagnostics.An_enum_member_name_must_be_followed_by_a_or : undefined;
    }
    interface MissingList<T extends Node> extends NodeArray<T> {
      isMissingList: true;
    }
    function createMissingList<T extends Node>(): MissingList<T> {
      const l = NodeArray.create<T>([], getNodePos()) as MissingList<T>;
      l.isMissingList = true;
      return l;
    }
    function isMissingList(ns: NodeArray<Node>): boolean {
      return !!(ns as MissingList<Node>).isMissingList;
    }
    function parseBracketedList<T extends Node>(c: ParsingContext, cb: () => T, open: Syntax, close: Syntax): NodeArray<T> {
      if (parseExpected(open)) {
        const r = parseDelimitedList(c, cb);
        parseExpected(close);
        return r;
      }
      return createMissingList<T>();
    }
    function parseEntityName(reserved: boolean, m?: DiagnosticMessage): EntityName {
      let e: EntityName = reserved ? parseIdentifierName(m) : parseIdentifier(m);
      let p = scanner.getStartPos();
      while (parseOptional(Syntax.DotToken)) {
        if (token() === Syntax.LessThanToken) {
          e.jsdocDotPos = p;
          break;
        }
        p = scanner.getStartPos();
        e = createQualifiedName(e, parseRightSideOfDot(reserved, false) as Identifier);
      }
      return e;
    }
    function createQualifiedName(e: EntityName, name: Identifier): QualifiedName {
      const n = createNode<QualifiedName>(Syntax.QualifiedName, e.pos);
      n.left = e;
      n.right = name;
      return finishNode(n);
    }
    function parseRightSideOfDot(allow: boolean, privates: boolean): Identifier | PrivateIdentifier {
      if (scanner.hasPrecedingLineBreak() && Token.identifierOrKeyword(token())) {
        const m = lookAhead(nextTokenIsIdentifierOrKeywordOnSameLine);
        if (m) return createMissingNode<Identifier>(Syntax.Identifier, true, Diagnostics.Identifier_expected);
      }
      if (token() === Syntax.PrivateIdentifier) {
        const n = parsePrivateIdentifier();
        return privates ? n : createMissingNode<Identifier>(Syntax.Identifier, true, Diagnostics.Identifier_expected);
      }
      return allow ? parseIdentifierName() : parseIdentifier();
    }

    function parseTemplateExpression(tagged: boolean): TemplateExpression {
      const n = createNode<TemplateExpression>(Syntax.TemplateExpression);
      n.head = parseTemplateHead(tagged);
      assert(n.head.kind === Syntax.TemplateHead, 'Template head has wrong token kind');
      const ss = [];
      const p = getNodePos();
      do {
        ss.push(parseTemplateSpan(tagged));
      } while (last(ss).literal.kind === Syntax.TemplateMiddle);
      n.templateSpans = NodeArray.create(ss, p);
      return finishNode(n);
    }

    function parseTemplateSpan(tagged: boolean): TemplateSpan {
      const n = createNode<TemplateSpan>(Syntax.TemplateSpan);
      n.expression = allowInAnd(parseExpression);
      let l: TemplateMiddle | TemplateTail;
      if (token() === Syntax.CloseBraceToken) {
        reScanTemplateToken(tagged);
        l = parseTemplateMiddleOrTemplateTail();
      } else {
        l = <TemplateTail>parseExpectedToken(Syntax.TemplateTail, Diagnostics._0_expected, Token.toString(Syntax.CloseBraceToken));
      }
      n.literal = l;
      return finishNode(n);
    }

    function parseLiteralNode(): LiteralExpression {
      return <LiteralExpression>parseLiteralLikeNode(token());
    }

    function parseTemplateHead(tagged: boolean): TemplateHead {
      if (tagged) reScanHeadOrNoSubstTemplate();
      const fragment = parseLiteralLikeNode(token());
      assert(fragment.kind === Syntax.TemplateHead, 'Template head has wrong token kind');
      return <TemplateHead>fragment;
    }

    function parseTemplateMiddleOrTemplateTail(): TemplateMiddle | TemplateTail {
      const fragment = parseLiteralLikeNode(token());
      assert(fragment.kind === Syntax.TemplateMiddle || fragment.kind === Syntax.TemplateTail, 'Template fragment has wrong token kind');
      return <TemplateMiddle | TemplateTail>fragment;
    }

    function parseLiteralLikeNode(k: Syntax): LiteralLikeNode {
      const n = createNode<LiteralLikeNode>(k);
      n.text = scanner.getTokenValue();
      switch (k) {
        case Syntax.NoSubstitutionLiteral:
        case Syntax.TemplateHead:
        case Syntax.TemplateMiddle:
        case Syntax.TemplateTail:
          const last = k === Syntax.NoSubstitutionLiteral || k === Syntax.TemplateTail;
          const t = scanner.getTokenText();
          (<TemplateLiteralLikeNode>n).rawText = t.substring(1, t.length - (scanner.isUnterminated() ? 0 : last ? 1 : 2));
          break;
      }
      if (scanner.hasExtendedEscape()) n.hasExtendedEscape = true;
      if (scanner.isUnterminated()) n.isUnterminated = true;
      if (n.kind === Syntax.NumericLiteral) (<NumericLiteral>n).numericLiteralFlags = scanner.getTokenFlags() & TokenFlags.NumericLiteralFlags;
      if (isTemplateLiteralKind(n.kind)) (<TemplateHead | TemplateMiddle | TemplateTail | NoSubstitutionLiteral>n).templateFlags = scanner.getTokenFlags() & TokenFlags.ContainsInvalidEscape;
      nextToken();
      finishNode(n);
      return n;
    }

    function parseTypeReference(): TypeReferenceNode {
      const n = createNode<TypeReferenceNode>(Syntax.TypeReference);
      n.typeName = parseEntityName(true, Diagnostics.Type_expected);
      if (!scanner.hasPrecedingLineBreak() && reScanLessToken() === Syntax.LessThanToken) {
        n.typeArguments = parseBracketedList(ParsingContext.TypeArguments, parseType, Syntax.LessThanToken, Syntax.GreaterThanToken);
      }
      return finishNode(n);
    }

    function typeHasArrowFunctionBlockingParseError(n: TypeNode): boolean {
      switch (n.kind) {
        case Syntax.TypeReference:
          return nodeIsMissing((n as TypeReferenceNode).typeName);
        case Syntax.FunctionType:
        case Syntax.ConstructorType: {
          const { parameters, type } = n as FunctionOrConstructorTypeNode;
          return isMissingList(parameters) || typeHasArrowFunctionBlockingParseError(type);
        }
        case Syntax.ParenthesizedType:
          return typeHasArrowFunctionBlockingParseError((n as ParenthesizedTypeNode).type);
        default:
          return false;
      }
    }

    function parseThisTypePredicate(lhs: ThisTypeNode): TypePredicateNode {
      nextToken();
      const n = createNode<TypePredicateNode>(Syntax.TypePredicate, lhs.pos);
      n.parameterName = lhs;
      n.type = parseType();
      return finishNode(n);
    }

    function parseThisTypeNode(): ThisTypeNode {
      const n = createNode<ThisTypeNode>(Syntax.ThisType);
      nextToken();
      return finishNode(n);
    }

    function parseJSDocAllType(postFixEquals: boolean): JSDocAllType | JSDocOptionalType {
      const n = createNode<JSDocAllType>(Syntax.JSDocAllType);
      if (postFixEquals) return createPostfixType(Syntax.JSDocOptionalType, n) as JSDocOptionalType;
      nextToken();
      return finishNode(n);
    }

    function parseJSDocNonNullableType(): TypeNode {
      const n = createNode<JSDocNonNullableType>(Syntax.JSDocNonNullableType);
      nextToken();
      n.type = parseNonArrayType();
      return finishNode(n);
    }

    function parseJSDocUnknownOrNullableType(): JSDocUnknownType | JSDocNullableType {
      const p = scanner.getStartPos();
      nextToken();
      if (
        token() === Syntax.CommaToken ||
        token() === Syntax.CloseBraceToken ||
        token() === Syntax.CloseParenToken ||
        token() === Syntax.GreaterThanToken ||
        token() === Syntax.EqualsToken ||
        token() === Syntax.BarToken
      ) {
        const n = createNode<JSDocUnknownType>(Syntax.JSDocUnknownType, p);
        return finishNode(n);
      }
      const n = createNode<JSDocNullableType>(Syntax.JSDocNullableType, p);
      n.type = parseType();
      return finishNode(n);
    }

    function parseJSDocFunctionType(): JSDocFunctionType | TypeReferenceNode {
      if (lookAhead(nextTokenIsOpenParen)) {
        const n = createNodeWithJSDoc<JSDocFunctionType>(Syntax.JSDocFunctionType);
        nextToken();
        fillSignature(Syntax.ColonToken, SignatureFlags.Type | SignatureFlags.JSDoc, n);
        return finishNode(n);
      }
      const n = createNode<TypeReferenceNode>(Syntax.TypeReference);
      n.typeName = parseIdentifierName();
      return finishNode(n);
    }

    function parseJSDocParameter(): ParameterDeclaration {
      const n = createNode<ParameterDeclaration>(Syntax.Parameter);
      if (token() === Syntax.ThisKeyword || token() === Syntax.NewKeyword) {
        n.name = parseIdentifierName();
        parseExpected(Syntax.ColonToken);
      }
      n.type = parseJSDocType();
      return finishNode(n);
    }

    function parseJSDocType(): TypeNode {
      scanner.setInJSDocType(true);
      const m = parseOptionalToken(Syntax.ModuleKeyword);
      if (m) {
        const n = createNode<JSDocNamepathType>(Syntax.JSDocNamepathType, m.pos);
        terminate: while (true) {
          switch (token()) {
            case Syntax.CloseBraceToken:
            case Syntax.EndOfFileToken:
            case Syntax.CommaToken:
            case Syntax.WhitespaceTrivia:
              break terminate;
            default:
              nextTokenJSDoc();
          }
        }
        scanner.setInJSDocType(false);
        return finishNode(n);
      }
      const d3 = parseOptionalToken(Syntax.Dot3Token);
      let type = parseTypeOrTypePredicate();
      scanner.setInJSDocType(false);
      if (d3) {
        const n = createNode<JSDocVariadicType>(Syntax.JSDocVariadicType, d3.pos);
        n.type = type;
        type = finishNode(n);
      }
      if (token() === Syntax.EqualsToken) return createPostfixType(Syntax.JSDocOptionalType, type);
      return type;
    }

    function parseTypeQuery(): TypeQueryNode {
      const n = createNode<TypeQueryNode>(Syntax.TypeQuery);
      parseExpected(Syntax.TypeOfKeyword);
      n.exprName = parseEntityName(true);
      return finishNode(n);
    }

    function parseTypeParameter(): TypeParameterDeclaration {
      const n = createNode<TypeParameterDeclaration>(Syntax.TypeParameter);
      n.name = parseIdentifier();
      if (parseOptional(Syntax.ExtendsKeyword)) {
        if (isStartOfType() || !isStartOfExpression()) n.constraint = parseType();
        else n.expression = parseUnaryExpressionOrHigher();
      }
      if (parseOptional(Syntax.EqualsToken)) n.default = parseType();
      return finishNode(n);
    }

    function parseTypeParameters(): NodeArray<TypeParameterDeclaration> | undefined {
      if (token() === Syntax.LessThanToken) {
        return parseBracketedList(ParsingContext.TypeParameters, parseTypeParameter, Syntax.LessThanToken, Syntax.GreaterThanToken);
      }
      return;
    }

    function parseParameterType(): TypeNode | undefined {
      if (parseOptional(Syntax.ColonToken)) return parseType();
      return;
    }

    function isStartOfParameter(isJSDocParameter: boolean): boolean {
      return (
        token() === Syntax.Dot3Token || isIdentifierOrPrivateIdentifierOrPattern() || isModifierKind(token()) || token() === Syntax.AtToken || isStartOfType(/*inStartOfParameter*/ !isJSDocParameter)
      );
    }

    function parseParameter(): ParameterDeclaration {
      const n = createNodeWithJSDoc<ParameterDeclaration>(Syntax.Parameter);
      if (token() === Syntax.ThisKeyword) {
        n.name = createIdentifier(true);
        n.type = parseParameterType();
        return finishNode(n);
      }
      n.decorators = parseDecorators();
      n.modifiers = parseModifiers();
      n.dot3Token = parseOptionalToken(Syntax.Dot3Token);
      // FormalParameter [Yield,Await]:
      //      BindingElement[?Yield,?Await]
      n.name = parseIdentifierOrPattern(Diagnostics.Private_identifiers_cannot_be_used_as_parameters);
      if (getFullWidth(n.name) === 0 && !n.modifiers && isModifierKind(token())) nextToken();
      n.questionToken = parseOptionalToken(Syntax.QuestionToken);
      n.type = parseParameterType();
      n.initializer = parseInitializer();
      return finishNode(n);
    }

    function fillSignature(returnToken: Syntax.ColonToken | Syntax.EqualsGreaterThanToken, flags: SignatureFlags, signature: SignatureDeclaration): boolean {
      if (!(flags & SignatureFlags.JSDoc)) signature.typeParameters = parseTypeParameters();
      const parametersParsedSuccessfully = parseParameterList(signature, flags);
      if (shouldParseReturnType(returnToken, !!(flags & SignatureFlags.Type))) {
        signature.type = parseTypeOrTypePredicate();
        if (typeHasArrowFunctionBlockingParseError(signature.type)) return false;
      }
      return parametersParsedSuccessfully;
    }

    function shouldParseReturnType(returnToken: Syntax.ColonToken | Syntax.EqualsGreaterThanToken, isType: boolean): boolean {
      if (returnToken === Syntax.EqualsGreaterThanToken) {
        parseExpected(returnToken);
        return true;
      } else if (parseOptional(Syntax.ColonToken)) {
        return true;
      } else if (isType && token() === Syntax.EqualsGreaterThanToken) {
        parseErrorAtCurrentToken(Diagnostics._0_expected, Token.toString(Syntax.ColonToken));
        nextToken();
        return true;
      }
      return false;
    }

    function parseParameterList(signature: SignatureDeclaration, flags: SignatureFlags): boolean {
      // FormalParameters [Yield,Await]: (modified)
      //      [empty]
      //      FormalParameterList[?Yield,Await]
      //
      // FormalParameter[Yield,Await]: (modified)
      //      BindingElement[?Yield,Await]
      //
      // BindingElement [Yield,Await]: (modified)
      //      SingleNameBinding[?Yield,?Await]
      //      BindingPattern[?Yield,?Await]Initializer [In, ?Yield,?Await] opt
      //
      // SingleNameBinding [Yield,Await]:
      //      BindingIdentifier[?Yield,?Await]Initializer [In, ?Yield,?Await] opt
      if (!parseExpected(Syntax.OpenParenToken)) {
        signature.parameters = createMissingList<ParameterDeclaration>();
        return false;
      }
      const savedYieldContext = inYieldContext();
      const savedAwaitContext = inAwaitContext();
      setYieldContext(!!(flags & SignatureFlags.Yield));
      setAwaitContext(!!(flags & SignatureFlags.Await));
      signature.parameters = flags & SignatureFlags.JSDoc ? parseDelimitedList(ParsingContext.JSDocParameters, parseJSDocParameter) : parseDelimitedList(ParsingContext.Parameters, parseParameter);
      setYieldContext(savedYieldContext);
      setAwaitContext(savedAwaitContext);
      return parseExpected(Syntax.CloseParenToken);
    }

    function parseTypeMemberSemicolon() {
      if (parseOptional(Syntax.CommaToken)) return;
      parseSemicolon();
    }

    function parseSignatureMember(k: Syntax.CallSignature | Syntax.ConstructSignature): CallSignatureDeclaration | ConstructSignatureDeclaration {
      const n = createNodeWithJSDoc<CallSignatureDeclaration | ConstructSignatureDeclaration>(k);
      if (k === Syntax.ConstructSignature) parseExpected(Syntax.NewKeyword);
      fillSignature(Syntax.ColonToken, SignatureFlags.Type, n);
      parseTypeMemberSemicolon();
      return finishNode(n);
    }

    function isIndexSignature(): boolean {
      return token() === Syntax.OpenBracketToken && lookAhead(isUnambiguouslyIndexSignature);
    }

    function isUnambiguouslyIndexSignature() {
      nextToken();
      if (token() === Syntax.Dot3Token || token() === Syntax.CloseBracketToken) return true;
      if (isModifierKind(token())) {
        nextToken();
        if (isIdentifier()) return true;
      } else if (!isIdentifier()) return false;
      else nextToken();
      if (token() === Syntax.ColonToken || token() === Syntax.CommaToken) return true;
      if (token() !== Syntax.QuestionToken) return false;
      nextToken();
      return token() === Syntax.ColonToken || token() === Syntax.CommaToken || token() === Syntax.CloseBracketToken;
    }

    function parseIndexSignatureDeclaration(n: IndexSignatureDeclaration): IndexSignatureDeclaration {
      n.kind = Syntax.IndexSignature;
      n.parameters = parseBracketedList(ParsingContext.Parameters, parseParameter, Syntax.OpenBracketToken, Syntax.CloseBracketToken);
      n.type = parseTypeAnnotation();
      parseTypeMemberSemicolon();
      return finishNode(n);
    }

    function parsePropertyOrMethodSignature(n: PropertySignature | MethodSignature): PropertySignature | MethodSignature {
      n.name = parsePropertyName();
      n.questionToken = parseOptionalToken(Syntax.QuestionToken);
      if (token() === Syntax.OpenParenToken || token() === Syntax.LessThanToken) {
        n.kind = Syntax.MethodSignature;
        fillSignature(Syntax.ColonToken, SignatureFlags.Type, <MethodSignature>n);
      } else {
        n.kind = Syntax.PropertySignature;
        n.type = parseTypeAnnotation();
        if (token() === Syntax.EqualsToken) (<PropertySignature>n).initializer = parseInitializer();
      }
      parseTypeMemberSemicolon();
      return finishNode(n);
    }

    function isTypeMemberStart(): boolean {
      if (token() === Syntax.OpenParenToken || token() === Syntax.LessThanToken) return true;
      let idToken = false;
      while (isModifierKind(token())) {
        idToken = true;
        nextToken();
      }
      if (token() === Syntax.OpenBracketToken) return true;
      if (isLiteralPropertyName()) {
        idToken = true;
        nextToken();
      }
      if (idToken) {
        return (
          token() === Syntax.OpenParenToken ||
          token() === Syntax.LessThanToken ||
          token() === Syntax.QuestionToken ||
          token() === Syntax.ColonToken ||
          token() === Syntax.CommaToken ||
          canParseSemicolon()
        );
      }
      return false;
    }

    function parseTypeMember(): TypeElement {
      if (token() === Syntax.OpenParenToken || token() === Syntax.LessThanToken) return parseSignatureMember(Syntax.CallSignature);
      if (token() === Syntax.NewKeyword && lookAhead(nextTokenIsOpenParenOrLessThan)) return parseSignatureMember(Syntax.ConstructSignature);
      const n = createNodeWithJSDoc<TypeElement>(Syntax.Unknown);
      n.modifiers = parseModifiers();
      if (isIndexSignature()) return parseIndexSignatureDeclaration(<IndexSignatureDeclaration>n);
      return parsePropertyOrMethodSignature(<PropertySignature | MethodSignature>n);
    }

    function nextTokenIsOpenParenOrLessThan() {
      nextToken();
      return token() === Syntax.OpenParenToken || token() === Syntax.LessThanToken;
    }

    function nextTokenIsDot() {
      return nextToken() === Syntax.DotToken;
    }

    function nextTokenIsOpenParenOrLessThanOrDot() {
      switch (nextToken()) {
        case Syntax.OpenParenToken:
        case Syntax.LessThanToken:
        case Syntax.DotToken:
          return true;
      }
      return false;
    }

    function parseTypeLiteral(): TypeLiteralNode {
      const n = createNode<TypeLiteralNode>(Syntax.TypeLiteral);
      n.members = parseObjectTypeMembers();
      return finishNode(n);
    }

    function parseObjectTypeMembers(): NodeArray<TypeElement> {
      let members: NodeArray<TypeElement>;
      if (parseExpected(Syntax.OpenBraceToken)) {
        members = parseList(ParsingContext.TypeMembers, parseTypeMember);
        parseExpected(Syntax.CloseBraceToken);
      } else {
        members = createMissingList<TypeElement>();
      }
      return members;
    }

    function isStartOfMappedType() {
      nextToken();
      if (token() === Syntax.PlusToken || token() === Syntax.MinusToken) return nextToken() === Syntax.ReadonlyKeyword;
      if (token() === Syntax.ReadonlyKeyword) nextToken();
      return token() === Syntax.OpenBracketToken && nextTokenIsIdentifier() && nextToken() === Syntax.InKeyword;
    }

    function parseMappedTypeParameter() {
      const n = createNode<TypeParameterDeclaration>(Syntax.TypeParameter);
      n.name = parseIdentifier();
      parseExpected(Syntax.InKeyword);
      n.constraint = parseType();
      return finishNode(n);
    }

    function parseMappedType() {
      const n = createNode<MappedTypeNode>(Syntax.MappedType);
      parseExpected(Syntax.OpenBraceToken);
      if (token() === Syntax.ReadonlyKeyword || token() === Syntax.PlusToken || token() === Syntax.MinusToken) {
        n.readonlyToken = parseTokenNode<ReadonlyToken | PlusToken | MinusToken>();
        if (n.readonlyToken.kind !== Syntax.ReadonlyKeyword) parseExpectedToken(Syntax.ReadonlyKeyword);
      }
      parseExpected(Syntax.OpenBracketToken);
      n.typeParameter = parseMappedTypeParameter();
      parseExpected(Syntax.CloseBracketToken);
      if (token() === Syntax.QuestionToken || token() === Syntax.PlusToken || token() === Syntax.MinusToken) {
        n.questionToken = parseTokenNode<QuestionToken | PlusToken | MinusToken>();
        if (n.questionToken.kind !== Syntax.QuestionToken) parseExpectedToken(Syntax.QuestionToken);
      }
      n.type = parseTypeAnnotation();
      parseSemicolon();
      parseExpected(Syntax.CloseBraceToken);
      return finishNode(n);
    }

    function parseTupleElementType() {
      const p = getNodePos();
      if (parseOptional(Syntax.Dot3Token)) {
        const n = createNode<RestTypeNode>(Syntax.RestType, p);
        n.type = parseType();
        return finishNode(n);
      }
      const t = parseType();
      if (!(contextFlags & NodeFlags.JSDoc) && t.kind === Syntax.JSDocNullableType && t.pos === (<JSDocNullableType>t).type.pos) t.kind = Syntax.OptionalType;
      return t;
    }

    function isNextTokenColonOrQuestionColon() {
      return nextToken() === Syntax.ColonToken || (token() === Syntax.QuestionToken && nextToken() === Syntax.ColonToken);
    }

    function isTupleElementName() {
      if (token() === Syntax.Dot3Token) return Token.identifierOrKeyword(nextToken()) && isNextTokenColonOrQuestionColon();
      return Token.identifierOrKeyword(token()) && isNextTokenColonOrQuestionColon();
    }

    function parseTupleElementNameOrTupleElementType() {
      if (lookAhead(isTupleElementName)) {
        const n = createNode<NamedTupleMember>(Syntax.NamedTupleMember);
        n.dot3Token = parseOptionalToken(Syntax.Dot3Token);
        n.name = parseIdentifierName();
        n.questionToken = parseOptionalToken(Syntax.QuestionToken);
        parseExpected(Syntax.ColonToken);
        n.type = parseTupleElementType();
        return addJSDocComment(finishNode(n));
      }
      return parseTupleElementType();
    }

    function parseTupleType(): TupleTypeNode {
      const n = createNode<TupleTypeNode>(Syntax.TupleType);
      n.elements = parseBracketedList(ParsingContext.TupleElementTypes, parseTupleElementNameOrTupleElementType, Syntax.OpenBracketToken, Syntax.CloseBracketToken);
      return finishNode(n);
    }

    function parseParenthesizedType(): TypeNode {
      const n = createNode<ParenthesizedTypeNode>(Syntax.ParenthesizedType);
      parseExpected(Syntax.OpenParenToken);
      n.type = parseType();
      parseExpected(Syntax.CloseParenToken);
      return finishNode(n);
    }

    function parseFunctionOrConstructorType(): TypeNode {
      const p = getNodePos();
      const k = parseOptional(Syntax.NewKeyword) ? Syntax.ConstructorType : Syntax.FunctionType;
      const n = createNodeWithJSDoc<FunctionOrConstructorTypeNode>(k, p);
      fillSignature(Syntax.EqualsGreaterThanToken, SignatureFlags.Type, n);
      return finishNode(n);
    }

    function parseKeywordAndNoDot(): TypeNode | undefined {
      const n = parseTokenNode<TypeNode>();
      return token() === Syntax.DotToken ? undefined : n;
    }

    function parseLiteralTypeNode(negative?: boolean): LiteralTypeNode {
      const n = createNode<LiteralTypeNode>(Syntax.LiteralType);
      let m!: PrefixUnaryExpression;
      if (negative) {
        m = createNode<PrefixUnaryExpression>(Syntax.PrefixUnaryExpression);
        m.operator = Syntax.MinusToken;
        nextToken();
      }
      let e: BooleanLiteral | LiteralExpression | PrefixUnaryExpression =
        token() === Syntax.TrueKeyword || token() === Syntax.FalseKeyword ? parseTokenNode<BooleanLiteral>() : (parseLiteralLikeNode(token()) as LiteralExpression);
      if (negative) {
        m.operand = e;
        finishNode(m);
        e = m;
      }
      n.literal = e;
      return finishNode(n);
    }

    function isStartOfTypeOfImportType() {
      nextToken();
      return token() === Syntax.ImportKeyword;
    }

    function parseImportType(): ImportTypeNode {
      sourceFile.flags |= NodeFlags.PossiblyContainsDynamicImport;
      const n = createNode<ImportTypeNode>(Syntax.ImportType);
      if (parseOptional(Syntax.TypeOfKeyword)) n.isTypeOf = true;
      parseExpected(Syntax.ImportKeyword);
      parseExpected(Syntax.OpenParenToken);
      n.argument = parseType();
      parseExpected(Syntax.CloseParenToken);
      if (parseOptional(Syntax.DotToken)) n.qualifier = parseEntityName(true, Diagnostics.Type_expected);
      if (!scanner.hasPrecedingLineBreak() && reScanLessToken() === Syntax.LessThanToken) {
        n.typeArguments = parseBracketedList(ParsingContext.TypeArguments, parseType, Syntax.LessThanToken, Syntax.GreaterThanToken);
      }
      return finishNode(n);
    }

    function nextTokenIsNumericOrBigIntLiteral() {
      nextToken();
      return token() === Syntax.NumericLiteral || token() === Syntax.BigIntLiteral;
    }

    function parseNonArrayType(): TypeNode {
      switch (token()) {
        case Syntax.AnyKeyword:
        case Syntax.UnknownKeyword:
        case Syntax.StringKeyword:
        case Syntax.NumberKeyword:
        case Syntax.BigIntKeyword:
        case Syntax.SymbolKeyword:
        case Syntax.BooleanKeyword:
        case Syntax.UndefinedKeyword:
        case Syntax.NeverKeyword:
        case Syntax.ObjectKeyword:
          return tryParse(parseKeywordAndNoDot) || parseTypeReference();
        case Syntax.AsteriskToken:
          return parseJSDocAllType(/*postfixEquals*/ false);
        case Syntax.AsteriskEqualsToken:
          return parseJSDocAllType(/*postfixEquals*/ true);
        case Syntax.Question2Token:
          // If there is '??', consider that is prefix '?' in JSDoc type.
          scanner.reScanQuestionToken();
        // falls through
        case Syntax.QuestionToken:
          return parseJSDocUnknownOrNullableType();
        case Syntax.FunctionKeyword:
          return parseJSDocFunctionType();
        case Syntax.ExclamationToken:
          return parseJSDocNonNullableType();
        case Syntax.NoSubstitutionLiteral:
        case Syntax.StringLiteral:
        case Syntax.NumericLiteral:
        case Syntax.BigIntLiteral:
        case Syntax.TrueKeyword:
        case Syntax.FalseKeyword:
          return parseLiteralTypeNode();
        case Syntax.MinusToken:
          return lookAhead(nextTokenIsNumericOrBigIntLiteral) ? parseLiteralTypeNode(/*negative*/ true) : parseTypeReference();
        case Syntax.VoidKeyword:
        case Syntax.NullKeyword:
          return parseTokenNode<TypeNode>();
        case Syntax.ThisKeyword: {
          const thisKeyword = parseThisTypeNode();
          if (token() === Syntax.IsKeyword && !scanner.hasPrecedingLineBreak()) {
            return parseThisTypePredicate(thisKeyword);
          } else {
            return thisKeyword;
          }
        }
        case Syntax.TypeOfKeyword:
          return lookAhead(isStartOfTypeOfImportType) ? parseImportType() : parseTypeQuery();
        case Syntax.OpenBraceToken:
          return lookAhead(isStartOfMappedType) ? parseMappedType() : parseTypeLiteral();
        case Syntax.OpenBracketToken:
          return parseTupleType();
        case Syntax.OpenParenToken:
          return parseParenthesizedType();
        case Syntax.ImportKeyword:
          return parseImportType();
        case Syntax.AssertsKeyword:
          return lookAhead(nextTokenIsIdentifierOrKeywordOnSameLine) ? parseAssertsTypePredicate() : parseTypeReference();
        default:
          return parseTypeReference();
      }
    }

    function isStartOfType(inStartOfParameter?: boolean): boolean {
      switch (token()) {
        case Syntax.AnyKeyword:
        case Syntax.UnknownKeyword:
        case Syntax.StringKeyword:
        case Syntax.NumberKeyword:
        case Syntax.BigIntKeyword:
        case Syntax.BooleanKeyword:
        case Syntax.ReadonlyKeyword:
        case Syntax.SymbolKeyword:
        case Syntax.UniqueKeyword:
        case Syntax.VoidKeyword:
        case Syntax.UndefinedKeyword:
        case Syntax.NullKeyword:
        case Syntax.ThisKeyword:
        case Syntax.TypeOfKeyword:
        case Syntax.NeverKeyword:
        case Syntax.OpenBraceToken:
        case Syntax.OpenBracketToken:
        case Syntax.LessThanToken:
        case Syntax.BarToken:
        case Syntax.AmpersandToken:
        case Syntax.NewKeyword:
        case Syntax.StringLiteral:
        case Syntax.NumericLiteral:
        case Syntax.BigIntLiteral:
        case Syntax.TrueKeyword:
        case Syntax.FalseKeyword:
        case Syntax.ObjectKeyword:
        case Syntax.AsteriskToken:
        case Syntax.QuestionToken:
        case Syntax.ExclamationToken:
        case Syntax.Dot3Token:
        case Syntax.InferKeyword:
        case Syntax.ImportKeyword:
        case Syntax.AssertsKeyword:
          return true;
        case Syntax.FunctionKeyword:
          return !inStartOfParameter;
        case Syntax.MinusToken:
          return !inStartOfParameter && lookAhead(nextTokenIsNumericOrBigIntLiteral);
        case Syntax.OpenParenToken:
          // Only consider '(' the start of a type if followed by ')', '...', an identifier, a modifier,
          // or something that starts a type. We don't want to consider things like '(1)' a type.
          return !inStartOfParameter && lookAhead(isStartOfParenthesizedOrFunctionType);
        default:
          return isIdentifier();
      }
    }

    function isStartOfParenthesizedOrFunctionType() {
      nextToken();
      return token() === Syntax.CloseParenToken || isStartOfParameter(/*isJSDocParameter*/ false) || isStartOfType();
    }

    function parsePostfixTypeOrHigher(): TypeNode {
      let type = parseNonArrayType();
      while (!scanner.hasPrecedingLineBreak()) {
        switch (token()) {
          case Syntax.ExclamationToken:
            type = createPostfixType(Syntax.JSDocNonNullableType, type);
            break;
          case Syntax.QuestionToken:
            // If not in JSDoc and next token is start of a type we have a conditional type
            if (!(contextFlags & NodeFlags.JSDoc) && lookAhead(nextTokenIsStartOfType)) {
              return type;
            }
            type = createPostfixType(Syntax.JSDocNullableType, type);
            break;
          case Syntax.OpenBracketToken:
            parseExpected(Syntax.OpenBracketToken);
            if (isStartOfType()) {
              const n = createNode<IndexedAccessTypeNode>(Syntax.IndexedAccessType, type.pos);
              n.objectType = type;
              n.indexType = parseType();
              parseExpected(Syntax.CloseBracketToken);
              type = finishNode(n);
            } else {
              const n = createNode<ArrayTypeNode>(Syntax.ArrayType, type.pos);
              n.elementType = type;
              parseExpected(Syntax.CloseBracketToken);
              type = finishNode(n);
            }
            break;
          default:
            return type;
        }
      }
      return type;
    }

    function createPostfixType(k: Syntax, type: TypeNode) {
      nextToken();
      const n = createNode<OptionalTypeNode | JSDocOptionalType | JSDocNonNullableType | JSDocNullableType>(k, type.pos);
      n.type = type;
      return finishNode(n);
    }

    function parseTypeOperator(operator: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword) {
      const n = createNode<TypeOperatorNode>(Syntax.TypeOperator);
      parseExpected(operator);
      n.operator = operator;
      n.type = parseTypeOperatorOrHigher();
      return finishNode(n);
    }

    function parseInferType(): InferTypeNode {
      const n = <InferTypeNode>createNode(Syntax.InferType);
      parseExpected(Syntax.InferKeyword);
      const typeParameter = <TypeParameterDeclaration>createNode(Syntax.TypeParameter);
      typeParameter.name = parseIdentifier();
      n.typeParameter = finishNode(typeParameter);
      return finishNode(n);
    }

    function parseTypeOperatorOrHigher(): TypeNode {
      const operator = token();
      switch (operator) {
        case Syntax.KeyOfKeyword:
        case Syntax.UniqueKeyword:
        case Syntax.ReadonlyKeyword:
          return parseTypeOperator(operator);
        case Syntax.InferKeyword:
          return parseInferType();
      }
      return parsePostfixTypeOrHigher();
    }

    function parseUnionOrIntersectionType(k: Syntax.UnionType | Syntax.IntersectionType, cb: () => TypeNode, o: Syntax.BarToken | Syntax.AmpersandToken): TypeNode {
      const start = scanner.getStartPos();
      const hasLeadingOperator = parseOptional(o);
      let type = cb();
      if (token() === o || hasLeadingOperator) {
        const types = [type];
        while (parseOptional(o)) {
          types.push(cb());
        }
        const n = <UnionOrIntersectionTypeNode>createNode(k, start);
        n.types = NodeArray.create(types, start);
        type = finishNode(n);
      }
      return type;
    }

    function parseIntersectionTypeOrHigher(): TypeNode {
      return parseUnionOrIntersectionType(Syntax.IntersectionType, parseTypeOperatorOrHigher, Syntax.AmpersandToken);
    }

    function parseUnionTypeOrHigher(): TypeNode {
      return parseUnionOrIntersectionType(Syntax.UnionType, parseIntersectionTypeOrHigher, Syntax.BarToken);
    }

    function isStartOfFunctionType(): boolean {
      if (token() === Syntax.LessThanToken) return true;
      return token() === Syntax.OpenParenToken && lookAhead(isUnambiguouslyStartOfFunctionType);
    }

    function skipParameterStart(): boolean {
      if (isModifierKind(token())) parseModifiers();
      if (isIdentifier() || token() === Syntax.ThisKeyword) {
        nextToken();
        return true;
      }
      if (token() === Syntax.OpenBracketToken || token() === Syntax.OpenBraceToken) {
        const previousErrorCount = parseDiagnostics.length;
        parseIdentifierOrPattern();
        return previousErrorCount === parseDiagnostics.length;
      }
      return false;
    }

    function isUnambiguouslyStartOfFunctionType() {
      nextToken();
      if (token() === Syntax.CloseParenToken || token() === Syntax.Dot3Token) return true;
      if (skipParameterStart()) {
        if (token() === Syntax.ColonToken || token() === Syntax.CommaToken || token() === Syntax.QuestionToken || token() === Syntax.EqualsToken) return true;
        if (token() === Syntax.CloseParenToken) {
          nextToken();
          if (token() === Syntax.EqualsGreaterThanToken) return true;
        }
      }
      return false;
    }

    function parseTypeOrTypePredicate(): TypeNode {
      const typePredicateVariable = isIdentifier() && tryParse(parseTypePredicatePrefix);
      const type = parseType();
      if (typePredicateVariable) {
        const n = <TypePredicateNode>createNode(Syntax.TypePredicate, typePredicateVariable.pos);
        n.assertsModifier = undefined;
        n.parameterName = typePredicateVariable;
        n.type = type;
        return finishNode(n);
      }
      return type;
    }

    function parseTypePredicatePrefix() {
      const id = parseIdentifier();
      if (token() === Syntax.IsKeyword && !scanner.hasPrecedingLineBreak()) {
        nextToken();
        return id;
      }
      return;
    }

    function parseAssertsTypePredicate(): TypeNode {
      const n = <TypePredicateNode>createNode(Syntax.TypePredicate);
      n.assertsModifier = parseExpectedToken(Syntax.AssertsKeyword);
      n.parameterName = token() === Syntax.ThisKeyword ? parseThisTypeNode() : parseIdentifier();
      n.type = parseOptional(Syntax.IsKeyword) ? parseType() : undefined;
      return finishNode(n);
    }

    function parseType(): TypeNode {
      return doOutsideOfContext(NodeFlags.TypeExcludesFlags, parseTypeWorker);
    }

    function parseTypeWorker(noConditionalTypes?: boolean): TypeNode {
      if (isStartOfFunctionType() || token() === Syntax.NewKeyword) return parseFunctionOrConstructorType();

      const type = parseUnionTypeOrHigher();
      if (!noConditionalTypes && !scanner.hasPrecedingLineBreak() && parseOptional(Syntax.ExtendsKeyword)) {
        const n = <ConditionalTypeNode>createNode(Syntax.ConditionalType, type.pos);
        n.checkType = type;
        n.extendsType = parseTypeWorker(/*noConditionalTypes*/ true);
        parseExpected(Syntax.QuestionToken);
        n.trueType = parseTypeWorker();
        parseExpected(Syntax.ColonToken);
        n.falseType = parseTypeWorker();
        return finishNode(n);
      }
      return type;
    }

    function parseTypeAnnotation(): TypeNode | undefined {
      return parseOptional(Syntax.ColonToken) ? parseType() : undefined;
    }

    function isStartOfLeftHandSideExpression(): boolean {
      switch (token()) {
        case Syntax.ThisKeyword:
        case Syntax.SuperKeyword:
        case Syntax.NullKeyword:
        case Syntax.TrueKeyword:
        case Syntax.FalseKeyword:
        case Syntax.NumericLiteral:
        case Syntax.BigIntLiteral:
        case Syntax.StringLiteral:
        case Syntax.NoSubstitutionLiteral:
        case Syntax.TemplateHead:
        case Syntax.OpenParenToken:
        case Syntax.OpenBracketToken:
        case Syntax.OpenBraceToken:
        case Syntax.FunctionKeyword:
        case Syntax.ClassKeyword:
        case Syntax.NewKeyword:
        case Syntax.SlashToken:
        case Syntax.SlashEqualsToken:
        case Syntax.Identifier:
          return true;
        case Syntax.ImportKeyword:
          return lookAhead(nextTokenIsOpenParenOrLessThanOrDot);
        default:
          return isIdentifier();
      }
    }

    function isStartOfExpression(): boolean {
      if (isStartOfLeftHandSideExpression()) {
        return true;
      }

      switch (token()) {
        case Syntax.PlusToken:
        case Syntax.MinusToken:
        case Syntax.TildeToken:
        case Syntax.ExclamationToken:
        case Syntax.DeleteKeyword:
        case Syntax.TypeOfKeyword:
        case Syntax.VoidKeyword:
        case Syntax.Plus2Token:
        case Syntax.Minus2Token:
        case Syntax.LessThanToken:
        case Syntax.AwaitKeyword:
        case Syntax.YieldKeyword:
        case Syntax.PrivateIdentifier:
          return true;
        default:
          if (isBinaryOperator()) return true;
          return isIdentifier();
      }
    }

    function isStartOfExpressionStatement(): boolean {
      return token() !== Syntax.OpenBraceToken && token() !== Syntax.FunctionKeyword && token() !== Syntax.ClassKeyword && token() !== Syntax.AtToken && isStartOfExpression();
    }

    function parseExpression(): Expression {
      // Expression[in]:
      //      AssignmentExpression[in]
      //      Expression[in] , AssignmentExpression[in]
      const saveDecoratorContext = inDecoratorContext();
      if (saveDecoratorContext) setDecoratorContext(false);
      let expr = parseAssignmentExpressionOrHigher();
      let operatorToken: BinaryOperatorToken;
      while ((operatorToken = parseOptionalToken(Syntax.CommaToken))) {
        expr = makeBinaryExpression(expr, operatorToken, parseAssignmentExpressionOrHigher());
      }
      if (saveDecoratorContext) setDecoratorContext(/*val*/ true);
      return expr;
    }

    function parseInitializer(): Expression | undefined {
      return parseOptional(Syntax.EqualsToken) ? parseAssignmentExpressionOrHigher() : undefined;
    }

    function parseAssignmentExpressionOrHigher(): Expression {
      //  AssignmentExpression[in,yield]:
      //      1) ConditionalExpression[?in,?yield]
      //      2) LeftHandSideExpression = AssignmentExpression[?in,?yield]
      //      3) LeftHandSideExpression AssignmentOperator AssignmentExpression[?in,?yield]
      //      4) ArrowFunctionExpression[?in,?yield]
      //      5) AsyncArrowFunctionExpression[in,yield,await]
      //      6) [+Yield] YieldExpression[?In]
      //
      // Note: for ease of implementation we treat productions '2' and '3' as the same thing.
      // (i.e. they're both BinaryExpressions with an assignment operator in it).

      // First, do the simple check if we have a YieldExpression (production '6').
      if (isYieldExpression()) return parseYieldExpression();
      const arrowExpression = tryParseParenthesizedArrowFunctionExpression() || tryParseAsyncSimpleArrowFunctionExpression();
      if (arrowExpression) return arrowExpression;
      const expr = parseBinaryExpressionOrHigher(/*precedence*/ 0);
      if (expr.kind === Syntax.Identifier && token() === Syntax.EqualsGreaterThanToken) return parseSimpleArrowFunctionExpression(<Identifier>expr);
      if (isLeftHandSideExpression(expr) && isAssignmentOperator(reScanGreaterToken())) return makeBinaryExpression(expr, parseTokenNode(), parseAssignmentExpressionOrHigher());
      return parseConditionalExpressionRest(expr);
    }

    function isYieldExpression(): boolean {
      if (token() === Syntax.YieldKeyword) {
        if (inYieldContext()) return true;
        return lookAhead(nextTokenIsIdentifierOrKeywordOrLiteralOnSameLine);
      }
      return false;
    }

    function nextTokenIsIdentifierOnSameLine() {
      nextToken();
      return !scanner.hasPrecedingLineBreak() && isIdentifier();
    }

    function parseYieldExpression(): YieldExpression {
      const n = <YieldExpression>createNode(Syntax.YieldExpression);
      // YieldExpression[In] :
      //      yield
      //      yield [no LineTerminator here] [Lexical goal InputElementRegExp]AssignmentExpression[?In, Yield]
      //      yield [no LineTerminator here] * [Lexical goal InputElementRegExp]AssignmentExpression[?In, Yield]
      nextToken();
      if (!scanner.hasPrecedingLineBreak() && (token() === Syntax.AsteriskToken || isStartOfExpression())) {
        n.asteriskToken = parseOptionalToken(Syntax.AsteriskToken);
        n.expression = parseAssignmentExpressionOrHigher();
        return finishNode(n);
      }
      return finishNode(n);
    }

    function parseSimpleArrowFunctionExpression(identifier: Identifier, asyncModifier?: NodeArray<Modifier> | undefined): ArrowFunction {
      assert(token() === Syntax.EqualsGreaterThanToken, 'parseSimpleArrowFunctionExpression should only have been called if we had a =>');
      let n: ArrowFunction;
      if (asyncModifier) {
        n = <ArrowFunction>createNode(Syntax.ArrowFunction, asyncModifier.pos);
        n.modifiers = asyncModifier;
      } else {
        n = <ArrowFunction>createNode(Syntax.ArrowFunction, identifier.pos);
      }
      const parameter = <ParameterDeclaration>createNode(Syntax.Parameter, identifier.pos);
      parameter.name = identifier;
      finishNode(parameter);
      n.parameters = NodeArray.create<ParameterDeclaration>([parameter], parameter.pos, parameter.end);
      n.equalsGreaterThanToken = parseExpectedToken(Syntax.EqualsGreaterThanToken);
      n.body = parseArrowFunctionExpressionBody(/*isAsync*/ !!asyncModifier);
      return addJSDocComment(finishNode(n));
    }

    function tryParseParenthesizedArrowFunctionExpression(): Expression | undefined {
      const triState = isParenthesizedArrowFunctionExpression();
      if (triState === Tristate.False) return;
      const arrowFunction = triState === Tristate.True ? parseParenthesizedArrowFunctionExpressionHead(/*allowAmbiguity*/ true) : tryParse(parsePossibleParenthesizedArrowFunctionExpressionHead);
      if (!arrowFunction) return;
      const isAsync = hasModifierOfKind(arrowFunction, Syntax.AsyncKeyword);
      const lastToken = token();
      arrowFunction.equalsGreaterThanToken = parseExpectedToken(Syntax.EqualsGreaterThanToken);
      arrowFunction.body = lastToken === Syntax.EqualsGreaterThanToken || lastToken === Syntax.OpenBraceToken ? parseArrowFunctionExpressionBody(isAsync) : parseIdentifier();
      return finishNode(arrowFunction);
    }

    function isParenthesizedArrowFunctionExpression(): Tristate {
      if (token() === Syntax.OpenParenToken || token() === Syntax.LessThanToken || token() === Syntax.AsyncKeyword) {
        return lookAhead(isParenthesizedArrowFunctionExpressionWorker);
      }

      if (token() === Syntax.EqualsGreaterThanToken) {
        // ERROR RECOVERY TWEAK:
        // If we see a standalone => try to parse it as an arrow function expression as that's
        // likely what the user intended to write.
        return Tristate.True;
      }
      // Definitely not a parenthesized arrow function.
      return Tristate.False;
    }

    function isParenthesizedArrowFunctionExpressionWorker() {
      if (token() === Syntax.AsyncKeyword) {
        nextToken();
        if (scanner.hasPrecedingLineBreak()) {
          return Tristate.False;
        }
        if (token() !== Syntax.OpenParenToken && token() !== Syntax.LessThanToken) {
          return Tristate.False;
        }
      }

      const first = token();
      const second = nextToken();

      if (first === Syntax.OpenParenToken) {
        if (second === Syntax.CloseParenToken) {
          // Simple cases: "() =>", "(): ", and "() {".
          // This is an arrow function with no parameters.
          // The last one is not actually an arrow function,
          // but this is probably what the user intended.
          const third = nextToken();
          switch (third) {
            case Syntax.EqualsGreaterThanToken:
            case Syntax.ColonToken:
            case Syntax.OpenBraceToken:
              return Tristate.True;
            default:
              return Tristate.False;
          }
        }

        // If encounter "([" or "({", this could be the start of a binding pattern.
        // Examples:
        //      ([ x ]) => { }
        //      ({ x }) => { }
        //      ([ x ])
        //      ({ x })
        if (second === Syntax.OpenBracketToken || second === Syntax.OpenBraceToken) {
          return Tristate.Unknown;
        }

        // Simple case: "(..."
        // This is an arrow function with a rest parameter.
        if (second === Syntax.Dot3Token) {
          return Tristate.True;
        }

        // Check for "(xxx yyy", where xxx is a modifier and yyy is an identifier. This
        // isn't actually allowed, but we want to treat it as a lambda so we can provide
        // a good error m.
        if (isModifierKind(second) && second !== Syntax.AsyncKeyword && lookAhead(nextTokenIsIdentifier)) {
          return Tristate.True;
        }

        // If we had "(" followed by something that's not an identifier,
        // then this definitely doesn't look like a lambda.  "this" is not
        // valid, but we want to parse it and then give a semantic error.
        if (!isIdentifier() && second !== Syntax.ThisKeyword) {
          return Tristate.False;
        }

        switch (nextToken()) {
          case Syntax.ColonToken:
            // If we have something like "(a:", then we must have a
            // type-annotated parameter in an arrow function expression.
            return Tristate.True;
          case Syntax.QuestionToken:
            nextToken();
            // If we have "(a?:" or "(a?," or "(a?=" or "(a?)" then it is definitely a lambda.
            if (token() === Syntax.ColonToken || token() === Syntax.CommaToken || token() === Syntax.EqualsToken || token() === Syntax.CloseParenToken) {
              return Tristate.True;
            }
            // Otherwise it is definitely not a lambda.
            return Tristate.False;
          case Syntax.CommaToken:
          case Syntax.EqualsToken:
          case Syntax.CloseParenToken:
            // If we have "(a," or "(a=" or "(a)" this *could* be an arrow function
            return Tristate.Unknown;
        }
        // It is definitely not an arrow function
        return Tristate.False;
      } else {
        assert(first === Syntax.LessThanToken);

        // If we have "<" not followed by an identifier,
        // then this definitely is not an arrow function.
        if (!isIdentifier()) {
          return Tristate.False;
        }

        // JSX overrides
        if (sourceFile.languageVariant === LanguageVariant.JSX) {
          const isArrowFunctionInJsx = lookAhead(() => {
            const third = nextToken();
            if (third === Syntax.ExtendsKeyword) {
              const fourth = nextToken();
              switch (fourth) {
                case Syntax.EqualsToken:
                case Syntax.GreaterThanToken:
                  return false;
                default:
                  return true;
              }
            } else if (third === Syntax.CommaToken) {
              return true;
            }
            return false;
          });

          if (isArrowFunctionInJsx) {
            return Tristate.True;
          }

          return Tristate.False;
        }

        // This *could* be a parenthesized arrow function.
        return Tristate.Unknown;
      }
    }

    function parsePossibleParenthesizedArrowFunctionExpressionHead(): ArrowFunction | undefined {
      const tokenPos = scanner.getTokenPos();
      if (notParenthesizedArrow && notParenthesizedArrow.has(tokenPos.toString())) return;
      const result = parseParenthesizedArrowFunctionExpressionHead(/*allowAmbiguity*/ false);
      if (!result) (notParenthesizedArrow || (notParenthesizedArrow = createMap())).set(tokenPos.toString(), true);
      return result;
    }

    function tryParseAsyncSimpleArrowFunctionExpression(): ArrowFunction | undefined {
      if (token() === Syntax.AsyncKeyword) {
        if (lookAhead(isUnParenthesizedAsyncArrowFunctionWorker) === Tristate.True) {
          const asyncModifier = parseModifiersForArrowFunction();
          const expr = parseBinaryExpressionOrHigher(/*precedence*/ 0);
          return parseSimpleArrowFunctionExpression(<Identifier>expr, asyncModifier);
        }
      }
      return;
    }

    function isUnParenthesizedAsyncArrowFunctionWorker(): Tristate {
      // AsyncArrowFunctionExpression:
      //      1) async[no LineTerminator here]AsyncArrowBindingIdentifier[?Yield][no LineTerminator here]=>AsyncConciseBody[?In]
      //      2) CoverCallExpressionAndAsyncArrowHead[?Yield, ?Await][no LineTerminator here]=>AsyncConciseBody[?In]
      if (token() === Syntax.AsyncKeyword) {
        nextToken();
        // If the "async" is followed by "=>" token then it is not a beginning of an async arrow-function
        // but instead a simple arrow-function which will be parsed inside "parseAssignmentExpressionOrHigher"
        if (scanner.hasPrecedingLineBreak() || token() === Syntax.EqualsGreaterThanToken) {
          return Tristate.False;
        }
        // Check for un-parenthesized AsyncArrowFunction
        const expr = parseBinaryExpressionOrHigher(/*precedence*/ 0);
        if (!scanner.hasPrecedingLineBreak() && expr.kind === Syntax.Identifier && token() === Syntax.EqualsGreaterThanToken) {
          return Tristate.True;
        }
      }

      return Tristate.False;
    }

    function parseParenthesizedArrowFunctionExpressionHead(allowAmbiguity: boolean): ArrowFunction | undefined {
      const n = <ArrowFunction>createNodeWithJSDoc(Syntax.ArrowFunction);
      n.modifiers = parseModifiersForArrowFunction();
      const isAsync = hasModifierOfKind(n, Syntax.AsyncKeyword) ? SignatureFlags.Await : SignatureFlags.None;
      // Arrow functions are never generators.
      //
      // If we're speculatively parsing a signature for a parenthesized arrow function, then
      // we have to have a complete parameter list.  Otherwise we might see something like
      // a => (b => c)
      // And think that "(b =>" was actually a parenthesized arrow function with a missing
      // close paren.
      if (!fillSignature(Syntax.ColonToken, isAsync, n) && !allowAmbiguity) {
        return;
      }

      // Parsing a signature isn't enough.
      // Parenthesized arrow signatures often look like other valid expressions.
      // For instance:
      //  - "(x = 10)" is an assignment expression parsed as a signature with a default parameter value.
      //  - "(x,y)" is a comma expression parsed as a signature with two parameters.
      //  - "a ? (b): c" will have "(b):" parsed as a signature with a return type annotation.
      //  - "a ? (b): function() {}" will too, since function() is a valid JSDoc function type.
      //
      // So we need just a bit of lookahead to ensure that it can only be a signature.
      const hasJSDocFunctionType = n.type && isJSDocFunctionType(n.type);
      if (!allowAmbiguity && token() !== Syntax.EqualsGreaterThanToken && (hasJSDocFunctionType || token() !== Syntax.OpenBraceToken)) {
        // Returning undefined here will cause our caller to rewind to where we started from.
        return;
      }

      return n;
    }

    function parseArrowFunctionExpressionBody(isAsync: boolean): Block | Expression {
      if (token() === Syntax.OpenBraceToken) {
        return parseFunctionBlock(isAsync ? SignatureFlags.Await : SignatureFlags.None);
      }

      if (token() !== Syntax.SemicolonToken && token() !== Syntax.FunctionKeyword && token() !== Syntax.ClassKeyword && isStartOfStatement() && !isStartOfExpressionStatement()) {
        // Check if we got a plain statement (i.e. no expression-statements, no function/class expressions/declarations)
        //
        // Here we try to recover from a potential error situation in the case where the
        // user meant to supply a block. For example, if the user wrote:
        //
        //  a =>
        //      let v = 0;
        //  }
        //
        // they may be missing an open brace.  Check to see if that's the case so we can
        // try to recover better.  If we don't do this, then the next close curly we see may end
        // up preemptively closing the containing construct.
        //
        // Note: even when 'IgnoreMissingOpenBrace' is passed, parseBody will still error.
        return parseFunctionBlock(SignatureFlags.IgnoreMissingOpenBrace | (isAsync ? SignatureFlags.Await : SignatureFlags.None));
      }

      return isAsync ? doInAwaitContext(parseAssignmentExpressionOrHigher) : doOutsideOfAwaitContext(parseAssignmentExpressionOrHigher);
    }

    function parseConditionalExpressionRest(leftOperand: Expression): Expression {
      // Note: we are passed in an expression which was produced from parseBinaryExpressionOrHigher.
      const questionToken = parseOptionalToken(Syntax.QuestionToken);
      if (!questionToken) {
        return leftOperand;
      }

      // Note: we explicitly 'allowIn' in the whenTrue part of the condition expression, and
      // we do not that for the 'whenFalse' part.
      const n = <ConditionalExpression>createNode(Syntax.ConditionalExpression, leftOperand.pos);
      n.condition = leftOperand;
      n.questionToken = questionToken;
      n.whenTrue = doOutsideOfContext(disallowInAndDecoratorContext, parseAssignmentExpressionOrHigher);
      n.colonToken = parseExpectedToken(Syntax.ColonToken);
      n.whenFalse = nodeIsPresent(n.colonToken) ? parseAssignmentExpressionOrHigher() : createMissingNode(Syntax.Identifier, false, Diagnostics._0_expected, Token.toString(Syntax.ColonToken));
      return finishNode(n);
    }

    function parseBinaryExpressionOrHigher(precedence: number): Expression {
      const leftOperand = parseUnaryExpressionOrHigher();
      return parseBinaryExpressionRest(precedence, leftOperand);
    }

    function isInOrOfKeyword(t: Syntax) {
      return t === Syntax.InKeyword || t === Syntax.OfKeyword;
    }

    function parseBinaryExpressionRest(precedence: number, leftOperand: Expression): Expression {
      while (true) {
        // We either have a binary operator here, or we're finished.  We call
        // reScanGreaterToken so that we merge token sequences like > and = into >=

        reScanGreaterToken();
        const newPrecedence = getBinaryOperatorPrecedence(token());

        // Check the precedence to see if we should "take" this operator
        // - For left associative operator (all operator but **), consume the operator,
        //   recursively call the function below, and parse binaryExpression as a rightOperand
        //   of the caller if the new precedence of the operator is greater then or equal to the current precedence.
        //   For example:
        //      a - b - c;
        //            ^token; leftOperand = b. Return b to the caller as a rightOperand
        //      a * b - c
        //            ^token; leftOperand = b. Return b to the caller as a rightOperand
        //      a - b * c;
        //            ^token; leftOperand = b. Return b * c to the caller as a rightOperand
        // - For right associative operator (**), consume the operator, recursively call the function
        //   and parse binaryExpression as a rightOperand of the caller if the new precedence of
        //   the operator is strictly grater than the current precedence
        //   For example:
        //      a ** b ** c;
        //             ^^token; leftOperand = b. Return b ** c to the caller as a rightOperand
        //      a - b ** c;
        //            ^^token; leftOperand = b. Return b ** c to the caller as a rightOperand
        //      a ** b - c
        //             ^token; leftOperand = b. Return b to the caller as a rightOperand
        const consumeCurrentOperator = token() === Syntax.Asterisk2Token ? newPrecedence >= precedence : newPrecedence > precedence;

        if (!consumeCurrentOperator) {
          break;
        }

        if (token() === Syntax.InKeyword && inDisallowInContext()) {
          break;
        }

        if (token() === Syntax.AsKeyword) {
          // Make sure we *do* perform ASI for constructs like this:
          //    var x = foo
          //    as (Bar)
          // This should be parsed as an initialized variable, followed
          // by a function call to 'as' with the argument 'Bar'
          if (scanner.hasPrecedingLineBreak()) {
            break;
          } else {
            nextToken();
            leftOperand = makeAsExpression(leftOperand, parseType());
          }
        } else {
          leftOperand = makeBinaryExpression(leftOperand, parseTokenNode(), parseBinaryExpressionOrHigher(newPrecedence));
        }
      }

      return leftOperand;
    }

    function isBinaryOperator() {
      if (inDisallowInContext() && token() === Syntax.InKeyword) {
        return false;
      }

      return getBinaryOperatorPrecedence(token()) > 0;
    }

    function makeBinaryExpression(left: Expression, operatorToken: BinaryOperatorToken, right: Expression): BinaryExpression {
      const n = <BinaryExpression>createNode(Syntax.BinaryExpression, left.pos);
      n.left = left;
      n.operatorToken = operatorToken;
      n.right = right;
      return finishNode(n);
    }

    function makeAsExpression(left: Expression, right: TypeNode): AsExpression {
      const n = <AsExpression>createNode(Syntax.AsExpression, left.pos);
      n.expression = left;
      n.type = right;
      return finishNode(n);
    }

    function parsePrefixUnaryExpression() {
      const n = <PrefixUnaryExpression>createNode(Syntax.PrefixUnaryExpression);
      n.operator = <PrefixUnaryOperator>token();
      nextToken();
      n.operand = parseSimpleUnaryExpression();

      return finishNode(n);
    }

    function parseDeleteExpression() {
      const n = <DeleteExpression>createNode(Syntax.DeleteExpression);
      nextToken();
      n.expression = parseSimpleUnaryExpression();
      return finishNode(n);
    }

    function parseTypeOfExpression() {
      const n = <TypeOfExpression>createNode(Syntax.TypeOfExpression);
      nextToken();
      n.expression = parseSimpleUnaryExpression();
      return finishNode(n);
    }

    function parseVoidExpression() {
      const n = <VoidExpression>createNode(Syntax.VoidExpression);
      nextToken();
      n.expression = parseSimpleUnaryExpression();
      return finishNode(n);
    }

    function isAwaitExpression(): boolean {
      if (token() === Syntax.AwaitKeyword) {
        if (inAwaitContext()) {
          return true;
        }

        // here we are using similar heuristics as 'isYieldExpression'
        return lookAhead(nextTokenIsIdentifierOrKeywordOrLiteralOnSameLine);
      }

      return false;
    }

    function parseAwaitExpression() {
      const n = <AwaitExpression>createNode(Syntax.AwaitExpression);
      nextToken();
      n.expression = parseSimpleUnaryExpression();
      return finishNode(n);
    }

    function parseUnaryExpressionOrHigher(): UnaryExpression | BinaryExpression {
      /**
       * ES7 UpdateExpression:
       *      1) LeftHandSideExpression[?Yield]
       *      2) LeftHandSideExpression[?Yield][no LineTerminator here]++
       *      3) LeftHandSideExpression[?Yield][no LineTerminator here]--
       *      4) ++UnaryExpression[?Yield]
       *      5) --UnaryExpression[?Yield]
       */
      if (isUpdateExpression()) {
        const updateExpression = parseUpdateExpression();
        return token() === Syntax.Asterisk2Token ? <BinaryExpression>parseBinaryExpressionRest(getBinaryOperatorPrecedence(token()), updateExpression) : updateExpression;
      }

      /**
       * ES7 UnaryExpression:
       *      1) UpdateExpression[?yield]
       *      2) delete UpdateExpression[?yield]
       *      3) void UpdateExpression[?yield]
       *      4) typeof UpdateExpression[?yield]
       *      5) + UpdateExpression[?yield]
       *      6) - UpdateExpression[?yield]
       *      7) ~ UpdateExpression[?yield]
       *      8) ! UpdateExpression[?yield]
       */
      const unaryOperator = token();
      const simpleUnaryExpression = parseSimpleUnaryExpression();
      if (token() === Syntax.Asterisk2Token) {
        const pos = Scanner.skipTrivia(sourceText, simpleUnaryExpression.pos);
        const { end } = simpleUnaryExpression;
        if (simpleUnaryExpression.kind === Syntax.TypeAssertionExpression) {
          parseErrorAt(pos, end, Diagnostics.A_type_assertion_expression_is_not_allowed_in_the_left_hand_side_of_an_exponentiation_expression_Consider_enclosing_the_expression_in_parentheses);
        } else {
          parseErrorAt(
            pos,
            end,
            Diagnostics.An_unary_expression_with_the_0_operator_is_not_allowed_in_the_left_hand_side_of_an_exponentiation_expression_Consider_enclosing_the_expression_in_parentheses,
            Token.toString(unaryOperator)
          );
        }
      }
      return simpleUnaryExpression;
    }

    function parseSimpleUnaryExpression(): UnaryExpression {
      switch (token()) {
        case Syntax.PlusToken:
        case Syntax.MinusToken:
        case Syntax.TildeToken:
        case Syntax.ExclamationToken:
          return parsePrefixUnaryExpression();
        case Syntax.DeleteKeyword:
          return parseDeleteExpression();
        case Syntax.TypeOfKeyword:
          return parseTypeOfExpression();
        case Syntax.VoidKeyword:
          return parseVoidExpression();
        case Syntax.LessThanToken:
          // This is modified UnaryExpression grammar in TypeScript
          //  UnaryExpression (modified):
          //      < type > UnaryExpression
          return parseTypeAssertion();
        case Syntax.AwaitKeyword:
          if (isAwaitExpression()) {
            return parseAwaitExpression();
          }
        // falls through
        default:
          return parseUpdateExpression();
      }
    }

    function isUpdateExpression(): boolean {
      // This function is called inside parseUnaryExpression to decide
      // whether to call parseSimpleUnaryExpression or call parseUpdateExpression directly
      switch (token()) {
        case Syntax.PlusToken:
        case Syntax.MinusToken:
        case Syntax.TildeToken:
        case Syntax.ExclamationToken:
        case Syntax.DeleteKeyword:
        case Syntax.TypeOfKeyword:
        case Syntax.VoidKeyword:
        case Syntax.AwaitKeyword:
          return false;
        case Syntax.LessThanToken:
          // If we are not in JSX context, we are parsing TypeAssertion which is an UnaryExpression
          if (sourceFile.languageVariant !== LanguageVariant.JSX) {
            return false;
          }
        // We are in JSX context and the token is part of JSXElement.
        // falls through
        default:
          return true;
      }
    }

    function parseUpdateExpression(): UpdateExpression {
      if (token() === Syntax.Plus2Token || token() === Syntax.Minus2Token) {
        const n = <PrefixUnaryExpression>createNode(Syntax.PrefixUnaryExpression);
        n.operator = <PrefixUnaryOperator>token();
        nextToken();
        n.operand = parseLeftHandSideExpressionOrHigher();
        return finishNode(n);
      } else if (sourceFile.languageVariant === LanguageVariant.JSX && token() === Syntax.LessThanToken && lookAhead(nextTokenIsIdentifierOrKeywordOrGreaterThan)) {
        // JSXElement is part of primaryExpression
        return parseJsxElementOrSelfClosingElementOrFragment(/*inExpressionContext*/ true);
      }

      const expression = parseLeftHandSideExpressionOrHigher();

      assert(isLeftHandSideExpression(expression));
      if ((token() === Syntax.Plus2Token || token() === Syntax.Minus2Token) && !scanner.hasPrecedingLineBreak()) {
        const n = <PostfixUnaryExpression>createNode(Syntax.PostfixUnaryExpression, expression.pos);
        n.operand = expression;
        n.operator = <PostfixUnaryOperator>token();
        nextToken();
        return finishNode(n);
      }

      return expression;
    }

    function parseLeftHandSideExpressionOrHigher(): LeftHandSideExpression {
      // Original Ecma:
      // LeftHandSideExpression: See 11.2
      //      NewExpression
      //      CallExpression
      //
      // Our simplification:
      //
      // LeftHandSideExpression: See 11.2
      //      MemberExpression
      //      CallExpression
      //
      // See comment in parseMemberExpressionOrHigher on how we replaced NewExpression with
      // MemberExpression to make our lives easier.
      //
      // to best understand the below code, it's important to see how CallExpression expands
      // out into its own productions:
      //
      // CallExpression:
      //      MemberExpression Arguments
      //      CallExpression Arguments
      //      CallExpression[Expression]
      //      CallExpression.IdentifierName
      //      import (AssignmentExpression)
      //      super Arguments
      //      super.IdentifierName
      //
      // Because of the recursion in these calls, we need to bottom out first. There are three
      // bottom out states we can run into: 1) We see 'super' which must start either of
      // the last two CallExpression productions. 2) We see 'import' which must start import call.
      // 3)we have a MemberExpression which either completes the LeftHandSideExpression,
      // or starts the beginning of the first four CallExpression productions.
      let expression: MemberExpression;
      if (token() === Syntax.ImportKeyword) {
        if (lookAhead(nextTokenIsOpenParenOrLessThan)) {
          // We don't want to eagerly consume all import keyword as import call expression so we look ahead to find "("
          // For example:
          //      var foo3 = require("subfolder
          //      import * as foo1 from "module-from-node
          // We want this import to be a statement rather than import call expression
          sourceFile.flags |= NodeFlags.PossiblyContainsDynamicImport;
          expression = parseTokenNode<PrimaryExpression>();
        } else if (lookAhead(nextTokenIsDot)) {
          // This is an 'import.*' metaproperty (i.e. 'import.meta')
          const fullStart = scanner.getStartPos();
          nextToken(); // advance past the 'import'
          nextToken(); // advance past the dot
          const node = createNode(Syntax.MetaProperty, fullStart) as MetaProperty;
          node.keywordToken = Syntax.ImportKeyword;
          node.name = parseIdentifierName();
          expression = finishNode(node);

          sourceFile.flags |= NodeFlags.PossiblyContainsImportMeta;
        } else {
          expression = parseMemberExpressionOrHigher();
        }
      } else {
        expression = token() === Syntax.SuperKeyword ? parseSuperExpression() : parseMemberExpressionOrHigher();
      }

      // Now, we *may* be complete.  However, we might have consumed the start of a
      // CallExpression or OptionalExpression.  As such, we need to consume the rest
      // of it here to be complete.
      return parseCallExpressionRest(expression);
    }

    function parseMemberExpressionOrHigher(): MemberExpression {
      // Note: to make our lives simpler, we decompose the NewExpression productions and
      // place ObjectCreationExpression and FunctionExpression into PrimaryExpression.
      // like so:
      //
      //   PrimaryExpression : See 11.1
      //      this
      //      Identifier
      //      Literal
      //      ArrayLiteral
      //      ObjectLiteral
      //      (Expression)
      //      FunctionExpression
      //      new MemberExpression Arguments?
      //
      //   MemberExpression : See 11.2
      //      PrimaryExpression
      //      MemberExpression[Expression]
      //      MemberExpression.IdentifierName
      //
      //   CallExpression : See 11.2
      //      MemberExpression
      //      CallExpression Arguments
      //      CallExpression[Expression]
      //      CallExpression.IdentifierName
      //
      // Technically this is ambiguous.  i.e. CallExpression defines:
      //
      //   CallExpression:
      //      CallExpression Arguments
      //
      // If you see: "new Foo()"
      //
      // Then that could be treated as a single ObjectCreationExpression, or it could be
      // treated as the invocation of "new Foo".  We disambiguate that in code (to match
      // the original grammar) by making sure that if we see an ObjectCreationExpression
      // we always consume arguments if they are there. So we treat "new Foo()" as an
      // object creation only, and not at all as an invocation.  Another way to think
      // about this is that for every "new" that we see, we will consume an argument list if
      // it is there as part of the *associated* object creation node.  Any additional
      // argument lists we see, will become invocation expressions.
      //
      // Because there are no other places in the grammar now that refer to FunctionExpression
      // or ObjectCreationExpression, it is safe to push down into the PrimaryExpression
      // production.
      //
      // Because CallExpression and MemberExpression are left recursive, we need to bottom out
      // of the recursion immediately.  So we parse out a primary expression to start with.
      const expression = parsePrimaryExpression();
      return parseMemberExpressionRest(expression, /*allowOptionalChain*/ true);
    }

    function parseSuperExpression(): MemberExpression {
      const expression = parseTokenNode<PrimaryExpression>();
      if (token() === Syntax.LessThanToken) {
        const startPos = getNodePos();
        const typeArguments = tryParse(parseTypeArgumentsInExpression);
        if (typeArguments !== undefined) {
          parseErrorAt(startPos, getNodePos(), Diagnostics.super_may_not_use_type_arguments);
        }
      }

      if (token() === Syntax.OpenParenToken || token() === Syntax.DotToken || token() === Syntax.OpenBracketToken) {
        return expression;
      }

      // If we have seen "super" it must be followed by '(' or '.'.
      // If it wasn't then just try to parse out a '.' and report an error.
      const node = <PropertyAccessExpression>createNode(Syntax.PropertyAccessExpression, expression.pos);
      node.expression = expression;
      parseExpectedToken(Syntax.DotToken, Diagnostics.super_must_be_followed_by_an_argument_list_or_member_access);
      // private names will never work with `super` (`super.#foo`), but that's a semantic error, not syntactic
      node.name = parseRightSideOfDot(/*allowIdentifierNames*/ true, /*allowPrivateIdentifiers*/ true);
      return finishNode(node);
    }

    function parseJsxElementOrSelfClosingElementOrFragment(inExpressionContext: boolean): JsxElement | JsxSelfClosingElement | JsxFragment {
      const opening = parseJsxOpeningOrSelfClosingElementOrOpeningFragment(inExpressionContext);
      let result: JsxElement | JsxSelfClosingElement | JsxFragment;
      if (opening.kind === Syntax.JsxOpeningElement) {
        const node = <JsxElement>createNode(Syntax.JsxElement, opening.pos);
        node.openingElement = opening;

        node.children = parseJsxChildren(node.openingElement);
        node.closingElement = parseJsxClosingElement(inExpressionContext);

        if (!tagNamesAreEquivalent(node.openingElement.tagName, node.closingElement.tagName)) {
          parseErrorAtRange(node.closingElement, Diagnostics.Expected_corresponding_JSX_closing_tag_for_0, getTextOfNodeFromSourceText(sourceText, node.openingElement.tagName));
        }

        result = finishNode(node);
      } else if (opening.kind === Syntax.JsxOpeningFragment) {
        const node = <JsxFragment>createNode(Syntax.JsxFragment, opening.pos);
        node.openingFragment = opening;
        node.children = parseJsxChildren(node.openingFragment);
        node.closingFragment = parseJsxClosingFragment(inExpressionContext);

        result = finishNode(node);
      } else {
        assert(opening.kind === Syntax.JsxSelfClosingElement);
        // Nothing else to do for self-closing elements
        result = opening;
      }

      // If the user writes the invalid code '<div></div><div></div>' in an expression context (i.e. not wrapped in
      // an enclosing tag), we'll naively try to parse   ^ this as a 'less than' operator and the remainder of the tag
      // as garbage, which will cause the formatter to badly mangle the JSX. Perform a speculative parse of a JSX
      // element if we see a < token so that we can wrap it in a synthetic binary expression so the formatter
      // does less damage and we can report a better error.
      // Since JSX elements are invalid < operands anyway, this lookahead parse will only occur in error scenarios
      // of one sort or another.
      if (inExpressionContext && token() === Syntax.LessThanToken) {
        const invalidElement = tryParse(() => parseJsxElementOrSelfClosingElementOrFragment(/*inExpressionContext*/ true));
        if (invalidElement) {
          parseErrorAtCurrentToken(Diagnostics.JSX_expressions_must_have_one_parent_element);
          const badNode = <BinaryExpression>createNode(Syntax.BinaryExpression, result.pos);
          badNode.end = invalidElement.end;
          badNode.left = result;
          badNode.right = invalidElement;
          badNode.operatorToken = createMissingNode(Syntax.CommaToken, false);
          badNode.operatorToken.pos = badNode.operatorToken.end = badNode.right.pos;
          return <JsxElement>(<Node>badNode);
        }
      }

      return result;
    }

    function parseJsxText(): JsxText {
      const node = <JsxText>createNode(Syntax.JsxText);
      node.text = scanner.getTokenValue();
      node.onlyTriviaWhitespaces = currentToken === Syntax.JsxTextAllWhiteSpaces;
      currentToken = scanner.scanJsxToken();
      return finishNode(node);
    }

    function parseJsxChild(openingTag: JsxOpeningElement | JsxOpeningFragment, token: JsxTokenSyntax): JsxChild | undefined {
      switch (token) {
        case Syntax.EndOfFileToken:
          // If we hit EOF, issue the error at the tag that lacks the closing element
          // rather than at the end of the file (which is useless)
          if (isJsxOpeningFragment(openingTag)) {
            parseErrorAtRange(openingTag, Diagnostics.JSX_fragment_has_no_corresponding_closing_tag);
          } else {
            // We want the error span to cover only 'Foo.Bar' in < Foo.Bar >
            // or to cover only 'Foo' in < Foo >
            const tag = openingTag.tagName;
            const start = Scanner.skipTrivia(sourceText, tag.pos);
            parseErrorAt(start, tag.end, Diagnostics.JSX_element_0_has_no_corresponding_closing_tag, getTextOfNodeFromSourceText(sourceText, openingTag.tagName));
          }
          return;
        case Syntax.LessThanSlashToken:
        case Syntax.ConflictMarkerTrivia:
          return;
        case Syntax.JsxText:
        case Syntax.JsxTextAllWhiteSpaces:
          return parseJsxText();
        case Syntax.OpenBraceToken:
          return parseJsxExpression(/*inExpressionContext*/ false);
        case Syntax.LessThanToken:
          return parseJsxElementOrSelfClosingElementOrFragment(/*inExpressionContext*/ false);
        default:
          return Debug.assertNever(token);
      }
    }

    function parseJsxChildren(openingTag: JsxOpeningElement | JsxOpeningFragment): NodeArray<JsxChild> {
      const list = [];
      const listPos = getNodePos();
      const saveParsingContext = parsingContext;
      parsingContext |= 1 << ParsingContext.JsxChildren;

      while (true) {
        const child = parseJsxChild(openingTag, (currentToken = scanner.reScanJsxToken()));
        if (!child) break;
        list.push(child);
      }

      parsingContext = saveParsingContext;
      return NodeArray.create(list, listPos);
    }

    function parseJsxAttributes(): JsxAttributes {
      const jsxAttributes = <JsxAttributes>createNode(Syntax.JsxAttributes);
      jsxAttributes.properties = parseList(ParsingContext.JsxAttributes, parseJsxAttribute);
      return finishNode(jsxAttributes);
    }

    function parseJsxOpeningOrSelfClosingElementOrOpeningFragment(inExpressionContext: boolean): JsxOpeningElement | JsxSelfClosingElement | JsxOpeningFragment {
      const fullStart = scanner.getStartPos();

      parseExpected(Syntax.LessThanToken);

      if (token() === Syntax.GreaterThanToken) {
        // See below for explanation of scanJsxText
        const node: JsxOpeningFragment = <JsxOpeningFragment>createNode(Syntax.JsxOpeningFragment, fullStart);
        scanJsxText();
        return finishNode(node);
      }

      const tagName = parseJsxElementName();
      const typeArguments = tryParseTypeArguments();
      const attributes = parseJsxAttributes();

      let node: JsxOpeningLikeElement;

      if (token() === Syntax.GreaterThanToken) {
        // Closing tag, so scan the immediately-following text with the JSX scanning instead
        // of regular scanning to avoid treating illegal characters (e.g. '#') as immediate
        // scanning errors
        node = <JsxOpeningElement>createNode(Syntax.JsxOpeningElement, fullStart);
        scanJsxText();
      } else {
        parseExpected(Syntax.SlashToken);
        if (inExpressionContext) {
          parseExpected(Syntax.GreaterThanToken);
        } else {
          parseExpected(Syntax.GreaterThanToken, /*diagnostic*/ undefined, /*advance*/ false);
          scanJsxText();
        }
        node = <JsxSelfClosingElement>createNode(Syntax.JsxSelfClosingElement, fullStart);
      }

      node.tagName = tagName;
      node.typeArguments = typeArguments;
      node.attributes = attributes;

      return finishNode(node);
    }

    function parseJsxElementName(): JsxTagNameExpression {
      scanJsxIdentifier();
      // JsxElement can have name in the form of
      //      propertyAccessExpression
      //      primaryExpression in the form of an identifier and "this" keyword
      // We can't just simply use parseLeftHandSideExpressionOrHigher because then we will start consider class,function etc as a keyword
      // We only want to consider "this" as a primaryExpression
      let expression: JsxTagNameExpression = token() === Syntax.ThisKeyword ? parseTokenNode<ThisExpression>() : parseIdentifierName();
      while (parseOptional(Syntax.DotToken)) {
        const propertyAccess: JsxTagNamePropertyAccess = <JsxTagNamePropertyAccess>createNode(Syntax.PropertyAccessExpression, expression.pos);
        propertyAccess.expression = expression;
        propertyAccess.name = parseRightSideOfDot(/*allowIdentifierNames*/ true, /*allowPrivateIdentifiers*/ false);
        expression = finishNode(propertyAccess);
      }
      return expression;
    }

    function parseJsxExpression(inExpressionContext: boolean): JsxExpression | undefined {
      const node = <JsxExpression>createNode(Syntax.JsxExpression);

      if (!parseExpected(Syntax.OpenBraceToken)) {
        return;
      }

      if (token() !== Syntax.CloseBraceToken) {
        node.dot3Token = parseOptionalToken(Syntax.Dot3Token);
        // Only an AssignmentExpression is valid here per the JSX spec,
        // but we can unambiguously parse a comma sequence and provide
        // a better error m in grammar checking.
        node.expression = parseExpression();
      }
      if (inExpressionContext) {
        parseExpected(Syntax.CloseBraceToken);
      } else {
        if (parseExpected(Syntax.CloseBraceToken, /*m*/ undefined, /*advance*/ false)) {
          scanJsxText();
        }
      }

      return finishNode(node);
    }

    function parseJsxAttribute(): JsxAttribute | JsxSpreadAttribute {
      if (token() === Syntax.OpenBraceToken) {
        return parseJsxSpreadAttribute();
      }

      scanJsxIdentifier();
      const node = <JsxAttribute>createNode(Syntax.JsxAttribute);
      node.name = parseIdentifierName();
      if (token() === Syntax.EqualsToken) {
        switch (scanJsxAttributeValue()) {
          case Syntax.StringLiteral:
            node.initializer = <StringLiteral>parseLiteralNode();
            break;
          default:
            node.initializer = parseJsxExpression(/*inExpressionContext*/ true);
            break;
        }
      }
      return finishNode(node);
    }

    function parseJsxSpreadAttribute(): JsxSpreadAttribute {
      const node = <JsxSpreadAttribute>createNode(Syntax.JsxSpreadAttribute);
      parseExpected(Syntax.OpenBraceToken);
      parseExpected(Syntax.Dot3Token);
      node.expression = parseExpression();
      parseExpected(Syntax.CloseBraceToken);
      return finishNode(node);
    }

    function parseJsxClosingElement(inExpressionContext: boolean): JsxClosingElement {
      const node = <JsxClosingElement>createNode(Syntax.JsxClosingElement);
      parseExpected(Syntax.LessThanSlashToken);
      node.tagName = parseJsxElementName();
      if (inExpressionContext) {
        parseExpected(Syntax.GreaterThanToken);
      } else {
        parseExpected(Syntax.GreaterThanToken, /*diagnostic*/ undefined, /*advance*/ false);
        scanJsxText();
      }
      return finishNode(node);
    }

    function parseJsxClosingFragment(inExpressionContext: boolean): JsxClosingFragment {
      const node = <JsxClosingFragment>createNode(Syntax.JsxClosingFragment);
      parseExpected(Syntax.LessThanSlashToken);
      if (Token.identifierOrKeyword(token())) {
        parseErrorAtRange(parseJsxElementName(), Diagnostics.Expected_corresponding_closing_tag_for_JSX_fragment);
      }
      if (inExpressionContext) {
        parseExpected(Syntax.GreaterThanToken);
      } else {
        parseExpected(Syntax.GreaterThanToken, /*diagnostic*/ undefined, /*advance*/ false);
        scanJsxText();
      }
      return finishNode(node);
    }

    function parseTypeAssertion(): TypeAssertion {
      const node = <TypeAssertion>createNode(Syntax.TypeAssertionExpression);
      parseExpected(Syntax.LessThanToken);
      node.type = parseType();
      parseExpected(Syntax.GreaterThanToken);
      node.expression = parseSimpleUnaryExpression();
      return finishNode(node);
    }

    function nextTokenIsIdentifierOrKeywordOrOpenBracketOrTemplate() {
      nextToken();
      return Token.identifierOrKeyword(token()) || token() === Syntax.OpenBracketToken || isTemplateStartOfTaggedTemplate();
    }

    function isStartOfOptionalPropertyOrElementAccessChain() {
      return token() === Syntax.QuestionDotToken && lookAhead(nextTokenIsIdentifierOrKeywordOrOpenBracketOrTemplate);
    }

    function tryReparseOptionalChain(node: Expression) {
      if (node.flags & NodeFlags.OptionalChain) {
        return true;
      }
      // check for an optional chain in a non-null expression
      if (isNonNullExpression(node)) {
        let expr = node.expression;
        while (isNonNullExpression(expr) && !(expr.flags & NodeFlags.OptionalChain)) {
          expr = expr.expression;
        }
        if (expr.flags & NodeFlags.OptionalChain) {
          // this is part of an optional chain. Walk down from `node` to `expression` and set the flag.
          while (isNonNullExpression(node)) {
            node.flags |= NodeFlags.OptionalChain;
            node = node.expression;
          }
          return true;
        }
      }
      return false;
    }

    function parsePropertyAccessExpressionRest(expression: LeftHandSideExpression, questionDotToken: QuestionDotToken | undefined) {
      const propertyAccess = <PropertyAccessExpression>createNode(Syntax.PropertyAccessExpression, expression.pos);
      propertyAccess.expression = expression;
      propertyAccess.questionDotToken = questionDotToken;
      propertyAccess.name = parseRightSideOfDot(/*allowIdentifierNames*/ true, /*allowPrivateIdentifiers*/ true);
      if (questionDotToken || tryReparseOptionalChain(expression)) {
        propertyAccess.flags |= NodeFlags.OptionalChain;
        if (isPrivateIdentifier(propertyAccess.name)) {
          parseErrorAtRange(propertyAccess.name, Diagnostics.An_optional_chain_cannot_contain_private_identifiers);
        }
      }
      return finishNode(propertyAccess);
    }

    function parseElementAccessExpressionRest(expression: LeftHandSideExpression, questionDotToken: QuestionDotToken | undefined) {
      const indexedAccess = <ElementAccessExpression>createNode(Syntax.ElementAccessExpression, expression.pos);
      indexedAccess.expression = expression;
      indexedAccess.questionDotToken = questionDotToken;

      if (token() === Syntax.CloseBracketToken) {
        indexedAccess.argumentExpression = createMissingNode(Syntax.Identifier, true, Diagnostics.An_element_access_expression_should_take_an_argument);
      } else {
        const argument = allowInAnd(parseExpression);
        if (StringLiteral.orNumericLiteralLike(argument)) {
          argument.text = internIdentifier(argument.text);
        }
        indexedAccess.argumentExpression = argument;
      }

      parseExpected(Syntax.CloseBracketToken);
      if (questionDotToken || tryReparseOptionalChain(expression)) {
        indexedAccess.flags |= NodeFlags.OptionalChain;
      }
      return finishNode(indexedAccess);
    }

    function parseMemberExpressionRest(expression: LeftHandSideExpression, allowOptionalChain: boolean): MemberExpression {
      while (true) {
        let questionDotToken: QuestionDotToken | undefined;
        let isPropertyAccess = false;
        if (allowOptionalChain && isStartOfOptionalPropertyOrElementAccessChain()) {
          questionDotToken = parseExpectedToken(Syntax.QuestionDotToken);
          isPropertyAccess = Token.identifierOrKeyword(token());
        } else {
          isPropertyAccess = parseOptional(Syntax.DotToken);
        }

        if (isPropertyAccess) {
          expression = parsePropertyAccessExpressionRest(expression, questionDotToken);
          continue;
        }

        if (!questionDotToken && token() === Syntax.ExclamationToken && !scanner.hasPrecedingLineBreak()) {
          nextToken();
          const nonNullExpression = <NonNullExpression>createNode(Syntax.NonNullExpression, expression.pos);
          nonNullExpression.expression = expression;
          expression = finishNode(nonNullExpression);
          continue;
        }

        // when in the [Decorator] context, we do not parse ElementAccess as it could be part of a ComputedPropertyName
        if ((questionDotToken || !inDecoratorContext()) && parseOptional(Syntax.OpenBracketToken)) {
          expression = parseElementAccessExpressionRest(expression, questionDotToken);
          continue;
        }

        if (isTemplateStartOfTaggedTemplate()) {
          expression = parseTaggedTemplateRest(expression, questionDotToken, /*typeArguments*/ undefined);
          continue;
        }

        return <MemberExpression>expression;
      }
    }

    function isTemplateStartOfTaggedTemplate() {
      return token() === Syntax.NoSubstitutionLiteral || token() === Syntax.TemplateHead;
    }

    function parseTaggedTemplateRest(tag: LeftHandSideExpression, questionDotToken: QuestionDotToken | undefined, typeArguments: NodeArray<TypeNode> | undefined) {
      const tagExpression = <TaggedTemplateExpression>createNode(Syntax.TaggedTemplateExpression, tag.pos);
      tagExpression.tag = tag;
      tagExpression.questionDotToken = questionDotToken;
      tagExpression.typeArguments = typeArguments;
      tagExpression.template = token() === Syntax.NoSubstitutionLiteral ? (reScanHeadOrNoSubstTemplate(), <NoSubstitutionLiteral>parseLiteralNode()) : parseTemplateExpression(/*tagged*/ true);
      if (questionDotToken || tag.flags & NodeFlags.OptionalChain) {
        tagExpression.flags |= NodeFlags.OptionalChain;
      }
      return finishNode(tagExpression);
    }

    function parseCallExpressionRest(expression: LeftHandSideExpression): LeftHandSideExpression {
      while (true) {
        expression = parseMemberExpressionRest(expression, /*allowOptionalChain*/ true);
        const questionDotToken = parseOptionalToken(Syntax.QuestionDotToken);

        // handle 'foo<<T>()'
        if (token() === Syntax.LessThanToken || token() === Syntax.LessThan2Token) {
          // See if this is the start of a generic invocation.  If so, consume it and
          // keep checking for postfix expressions.  Otherwise, it's just a '<' that's
          // part of an arithmetic expression.  Break out so we consume it higher in the
          // stack.
          const typeArguments = tryParse(parseTypeArgumentsInExpression);
          if (typeArguments) {
            if (isTemplateStartOfTaggedTemplate()) {
              expression = parseTaggedTemplateRest(expression, questionDotToken, typeArguments);
              continue;
            }

            const callExpr = <CallExpression>createNode(Syntax.CallExpression, expression.pos);
            callExpr.expression = expression;
            callExpr.questionDotToken = questionDotToken;
            callExpr.typeArguments = typeArguments;
            callExpr.arguments = parseArgumentList();
            if (questionDotToken || tryReparseOptionalChain(expression)) {
              callExpr.flags |= NodeFlags.OptionalChain;
            }
            expression = finishNode(callExpr);
            continue;
          }
        } else if (token() === Syntax.OpenParenToken) {
          const callExpr = <CallExpression>createNode(Syntax.CallExpression, expression.pos);
          callExpr.expression = expression;
          callExpr.questionDotToken = questionDotToken;
          callExpr.arguments = parseArgumentList();
          if (questionDotToken || tryReparseOptionalChain(expression)) {
            callExpr.flags |= NodeFlags.OptionalChain;
          }
          expression = finishNode(callExpr);
          continue;
        }
        if (questionDotToken) {
          // We failed to parse anything, so report a missing identifier here.
          const propertyAccess = createNode(Syntax.PropertyAccessExpression, expression.pos) as PropertyAccessExpression;
          propertyAccess.expression = expression;
          propertyAccess.questionDotToken = questionDotToken;
          propertyAccess.name = createMissingNode(Syntax.Identifier, false, Diagnostics.Identifier_expected);
          propertyAccess.flags |= NodeFlags.OptionalChain;
          expression = finishNode(propertyAccess);
        }
        break;
      }
      return expression;
    }

    function parseArgumentList() {
      parseExpected(Syntax.OpenParenToken);
      const result = parseDelimitedList(ParsingContext.ArgumentExpressions, parseArgumentExpression);
      parseExpected(Syntax.CloseParenToken);
      return result;
    }

    function parseTypeArgumentsInExpression() {
      if (reScanLessToken() !== Syntax.LessThanToken) {
        return;
      }
      nextToken();

      const typeArguments = parseDelimitedList(ParsingContext.TypeArguments, parseType);
      if (!parseExpected(Syntax.GreaterThanToken)) {
        // If it doesn't have the closing `>` then it's definitely not an type argument list.
        return;
      }

      // If we have a '<', then only parse this as a argument list if the type arguments
      // are complete and we have an open paren.  if we don't, rewind and return nothing.
      return typeArguments && canFollowTypeArgumentsInExpression() ? typeArguments : undefined;
    }

    function canFollowTypeArgumentsInExpression(): boolean {
      switch (token()) {
        case Syntax.OpenParenToken: // foo<x>(
        case Syntax.NoSubstitutionLiteral: // foo<T> `...`
        case Syntax.TemplateHead: // foo<T> `...${100}...`
        // these are the only tokens can legally follow a type argument
        // list. So we definitely want to treat them as type arg lists.
        // falls through
        case Syntax.DotToken: // foo<x>.
        case Syntax.CloseParenToken: // foo<x>)
        case Syntax.CloseBracketToken: // foo<x>]
        case Syntax.ColonToken: // foo<x>:
        case Syntax.SemicolonToken: // foo<x>;
        case Syntax.QuestionToken: // foo<x>?
        case Syntax.Equals2Token: // foo<x> ==
        case Syntax.Equals3Token: // foo<x> ===
        case Syntax.ExclamationEqualsToken: // foo<x> !=
        case Syntax.ExclamationEquals2Token: // foo<x> !==
        case Syntax.Ampersand2Token: // foo<x> &&
        case Syntax.Bar2Token: // foo<x> ||
        case Syntax.Question2Token: // foo<x> ??
        case Syntax.CaretToken: // foo<x> ^
        case Syntax.AmpersandToken: // foo<x> &
        case Syntax.BarToken: // foo<x> |
        case Syntax.CloseBraceToken: // foo<x> }
        case Syntax.EndOfFileToken: // foo<x>
          // these cases can't legally follow a type arg list.  However, they're not legal
          // expressions either.  The user is probably in the middle of a generic type. So
          // treat it as such.
          return true;

        case Syntax.CommaToken: // foo<x>,
        case Syntax.OpenBraceToken: // foo<x> {
        // We don't want to treat these as type arguments.  Otherwise we'll parse this
        // as an invocation expression.  Instead, we want to parse out the expression
        // in isolation from the type arguments.
        // falls through
        default:
          // Anything else treat as an expression.
          return false;
      }
    }

    function parsePrimaryExpression(): PrimaryExpression {
      switch (token()) {
        case Syntax.NumericLiteral:
        case Syntax.BigIntLiteral:
        case Syntax.StringLiteral:
        case Syntax.NoSubstitutionLiteral:
          return parseLiteralNode();
        case Syntax.ThisKeyword:
        case Syntax.SuperKeyword:
        case Syntax.NullKeyword:
        case Syntax.TrueKeyword:
        case Syntax.FalseKeyword:
          return parseTokenNode<PrimaryExpression>();
        case Syntax.OpenParenToken:
          return parseParenthesizedExpression();
        case Syntax.OpenBracketToken:
          return parseArrayLiteralExpression();
        case Syntax.OpenBraceToken:
          return parseObjectLiteralExpression();
        case Syntax.AsyncKeyword:
          // Async arrow functions are parsed earlier in parseAssignmentExpressionOrHigher.
          // If we encounter `async [no LineTerminator here] function` then this is an async
          // function; otherwise, its an identifier.
          if (!lookAhead(nextTokenIsFunctionKeywordOnSameLine)) {
            break;
          }

          return parseFunctionExpression();
        case Syntax.ClassKeyword:
          return parseClassExpression();
        case Syntax.FunctionKeyword:
          return parseFunctionExpression();
        case Syntax.NewKeyword:
          return parseNewExpressionOrNewDotTarget();
        case Syntax.SlashToken:
        case Syntax.SlashEqualsToken:
          if (reScanSlashToken() === Syntax.RegexLiteral) {
            return parseLiteralNode();
          }
          break;
        case Syntax.TemplateHead:
          return parseTemplateExpression(/* taggedTemplate */ false);
      }

      return parseIdentifier(Diagnostics.Expression_expected);
    }

    function parseParenthesizedExpression(): ParenthesizedExpression {
      const node = <ParenthesizedExpression>createNodeWithJSDoc(Syntax.ParenthesizedExpression);
      parseExpected(Syntax.OpenParenToken);
      node.expression = allowInAnd(parseExpression);
      parseExpected(Syntax.CloseParenToken);
      return finishNode(node);
    }

    function parseSpreadElement(): Expression {
      const node = <SpreadElement>createNode(Syntax.SpreadElement);
      parseExpected(Syntax.Dot3Token);
      node.expression = parseAssignmentExpressionOrHigher();
      return finishNode(node);
    }

    function parseArgumentOrArrayLiteralElement(): Expression {
      return token() === Syntax.Dot3Token ? parseSpreadElement() : token() === Syntax.CommaToken ? <Expression>createNode(Syntax.OmittedExpression) : parseAssignmentExpressionOrHigher();
    }

    function parseArgumentExpression(): Expression {
      return doOutsideOfContext(disallowInAndDecoratorContext, parseArgumentOrArrayLiteralElement);
    }

    function parseArrayLiteralExpression(): ArrayLiteralExpression {
      const node = <ArrayLiteralExpression>createNode(Syntax.ArrayLiteralExpression);
      parseExpected(Syntax.OpenBracketToken);
      if (scanner.hasPrecedingLineBreak()) {
        node.multiLine = true;
      }
      node.elements = parseDelimitedList(ParsingContext.ArrayLiteralMembers, parseArgumentOrArrayLiteralElement);
      parseExpected(Syntax.CloseBracketToken);
      return finishNode(node);
    }

    function parseObjectLiteralElement(): ObjectLiteralElementLike {
      const node = <ObjectLiteralElementLike>createNodeWithJSDoc(Syntax.Unknown);

      if (parseOptionalToken(Syntax.Dot3Token)) {
        node.kind = Syntax.SpreadAssignment;
        (<SpreadAssignment>node).expression = parseAssignmentExpressionOrHigher();
        return finishNode(node);
      }

      node.decorators = parseDecorators();
      node.modifiers = parseModifiers();

      if (parseContextualModifier(Syntax.GetKeyword)) {
        return parseAccessorDeclaration(<AccessorDeclaration>node, Syntax.GetAccessor);
      }
      if (parseContextualModifier(Syntax.SetKeyword)) {
        return parseAccessorDeclaration(<AccessorDeclaration>node, Syntax.SetAccessor);
      }

      const asteriskToken = parseOptionalToken(Syntax.AsteriskToken);
      const tokenIsIdentifier = isIdentifier();
      node.name = parsePropertyName();
      // Disallowing of optional property assignments and definite assignment assertion happens in the grammar checker.
      (<MethodDeclaration>node).questionToken = parseOptionalToken(Syntax.QuestionToken);
      (<MethodDeclaration>node).exclamationToken = parseOptionalToken(Syntax.ExclamationToken);

      if (asteriskToken || token() === Syntax.OpenParenToken || token() === Syntax.LessThanToken) {
        return parseMethodDeclaration(<MethodDeclaration>node, asteriskToken);
      }

      // check if it is short-hand property assignment or normal property assignment
      // NOTE: if token is EqualsToken it is interpreted as CoverInitializedName production
      // CoverInitializedName[Yield] :
      //     IdentifierReference[?Yield] Initializer[In, ?Yield]
      // this is necessary because ObjectLiteral productions are also used to cover grammar for ObjectAssignmentPattern
      const isShorthandPropertyAssignment = tokenIsIdentifier && token() !== Syntax.ColonToken;
      if (isShorthandPropertyAssignment) {
        node.kind = Syntax.ShorthandPropertyAssignment;
        const equalsToken = parseOptionalToken(Syntax.EqualsToken);
        if (equalsToken) {
          (<ShorthandPropertyAssignment>node).equalsToken = equalsToken;
          (<ShorthandPropertyAssignment>node).objectAssignmentInitializer = allowInAnd(parseAssignmentExpressionOrHigher);
        }
      } else {
        node.kind = Syntax.PropertyAssignment;
        parseExpected(Syntax.ColonToken);
        (<PropertyAssignment>node).initializer = allowInAnd(parseAssignmentExpressionOrHigher);
      }
      return finishNode(node);
    }

    function parseObjectLiteralExpression(): ObjectLiteralExpression {
      const node = <ObjectLiteralExpression>createNode(Syntax.ObjectLiteralExpression);
      const openBracePosition = scanner.getTokenPos();
      parseExpected(Syntax.OpenBraceToken);
      if (scanner.hasPrecedingLineBreak()) {
        node.multiLine = true;
      }

      node.properties = parseDelimitedList(ParsingContext.ObjectLiteralMembers, parseObjectLiteralElement, /*considerSemicolonAsDelimiter*/ true);
      if (!parseExpected(Syntax.CloseBraceToken)) {
        const lastError = lastOrUndefined(parseDiagnostics);
        if (lastError && lastError.code === Diagnostics._0_expected.code) {
          addRelatedInfo(lastError, createFileDiagnostic(sourceFile, openBracePosition, 1, Diagnostics.The_parser_expected_to_find_a_to_match_the_token_here));
        }
      }
      return finishNode(node);
    }

    function parseFunctionExpression(): FunctionExpression {
      // GeneratorExpression:
      //      function* BindingIdentifier [Yield][opt](FormalParameters[Yield]){ GeneratorBody }
      //
      // FunctionExpression:
      //      function BindingIdentifier[opt](FormalParameters){ FunctionBody }
      const saveDecoratorContext = inDecoratorContext();
      if (saveDecoratorContext) {
        setDecoratorContext(/*val*/ false);
      }

      const node = <FunctionExpression>createNodeWithJSDoc(Syntax.FunctionExpression);
      node.modifiers = parseModifiers();
      parseExpected(Syntax.FunctionKeyword);
      node.asteriskToken = parseOptionalToken(Syntax.AsteriskToken);

      const isGenerator = node.asteriskToken ? SignatureFlags.Yield : SignatureFlags.None;
      const isAsync = hasModifierOfKind(node, Syntax.AsyncKeyword) ? SignatureFlags.Await : SignatureFlags.None;
      node.name =
        isGenerator && isAsync
          ? doInYieldAndAwaitContext(parseOptionalIdentifier)
          : isGenerator
          ? doInYieldContext(parseOptionalIdentifier)
          : isAsync
          ? doInAwaitContext(parseOptionalIdentifier)
          : parseOptionalIdentifier();

      fillSignature(Syntax.ColonToken, isGenerator | isAsync, node);
      node.body = parseFunctionBlock(isGenerator | isAsync);

      if (saveDecoratorContext) {
        setDecoratorContext(/*val*/ true);
      }

      return finishNode(node);
    }

    function parseOptionalIdentifier(): Identifier | undefined {
      return isIdentifier() ? parseIdentifier() : undefined;
    }

    function parseNewExpressionOrNewDotTarget(): NewExpression | MetaProperty {
      const fullStart = scanner.getStartPos();
      parseExpected(Syntax.NewKeyword);
      if (parseOptional(Syntax.DotToken)) {
        const node = <MetaProperty>createNode(Syntax.MetaProperty, fullStart);
        node.keywordToken = Syntax.NewKeyword;
        node.name = parseIdentifierName();
        return finishNode(node);
      }

      let expression: MemberExpression = parsePrimaryExpression();
      let typeArguments;
      while (true) {
        expression = parseMemberExpressionRest(expression, /*allowOptionalChain*/ false);
        typeArguments = tryParse(parseTypeArgumentsInExpression);
        if (isTemplateStartOfTaggedTemplate()) {
          assert(!!typeArguments, "Expected a type argument list; all plain tagged template starts should be consumed in 'parseMemberExpressionRest'");
          expression = parseTaggedTemplateRest(expression, /*optionalChain*/ undefined, typeArguments);
          typeArguments = undefined;
        }
        break;
      }

      const node = <NewExpression>createNode(Syntax.NewExpression, fullStart);
      node.expression = expression;
      node.typeArguments = typeArguments;
      if (token() === Syntax.OpenParenToken) {
        node.arguments = parseArgumentList();
      } else if (node.typeArguments) {
        parseErrorAt(fullStart, scanner.getStartPos(), Diagnostics.A_new_expression_with_type_arguments_must_always_be_followed_by_a_parenthesized_argument_list);
      }
      return finishNode(node);
    }

    function parseBlock(ignoreMissingOpenBrace: boolean, m?: DiagnosticMessage): Block {
      const node = <Block>createNode(Syntax.Block);
      const openBracePosition = scanner.getTokenPos();
      if (parseExpected(Syntax.OpenBraceToken, m) || ignoreMissingOpenBrace) {
        if (scanner.hasPrecedingLineBreak()) {
          node.multiLine = true;
        }

        node.statements = parseList(ParsingContext.BlockStatements, parseStatement);
        if (!parseExpected(Syntax.CloseBraceToken)) {
          const lastError = lastOrUndefined(parseDiagnostics);
          if (lastError && lastError.code === Diagnostics._0_expected.code) {
            addRelatedInfo(lastError, createFileDiagnostic(sourceFile, openBracePosition, 1, Diagnostics.The_parser_expected_to_find_a_to_match_the_token_here));
          }
        }
      } else {
        node.statements = createMissingList<Statement>();
      }
      return finishNode(node);
    }

    function parseFunctionBlock(flags: SignatureFlags, m?: DiagnosticMessage): Block {
      const savedYieldContext = inYieldContext();
      setYieldContext(!!(flags & SignatureFlags.Yield));

      const savedAwaitContext = inAwaitContext();
      setAwaitContext(!!(flags & SignatureFlags.Await));

      // We may be in a [Decorator] context when parsing a function expression or
      // arrow function. The body of the function is not in [Decorator] context.
      const saveDecoratorContext = inDecoratorContext();
      if (saveDecoratorContext) {
        setDecoratorContext(/*val*/ false);
      }

      const block = parseBlock(!!(flags & SignatureFlags.IgnoreMissingOpenBrace), m);

      if (saveDecoratorContext) {
        setDecoratorContext(/*val*/ true);
      }

      setYieldContext(savedYieldContext);
      setAwaitContext(savedAwaitContext);

      return block;
    }

    function parseEmptyStatement(): Statement {
      const node = <Statement>createNode(Syntax.EmptyStatement);
      parseExpected(Syntax.SemicolonToken);
      return finishNode(node);
    }

    function parseIfStatement(): IfStatement {
      const node = <IfStatement>createNode(Syntax.IfStatement);
      parseExpected(Syntax.IfKeyword);
      parseExpected(Syntax.OpenParenToken);
      node.expression = allowInAnd(parseExpression);
      parseExpected(Syntax.CloseParenToken);
      node.thenStatement = parseStatement();
      node.elseStatement = parseOptional(Syntax.ElseKeyword) ? parseStatement() : undefined;
      return finishNode(node);
    }

    function parseDoStatement(): DoStatement {
      const node = <DoStatement>createNode(Syntax.DoStatement);
      parseExpected(Syntax.DoKeyword);
      node.statement = parseStatement();
      parseExpected(Syntax.WhileKeyword);
      parseExpected(Syntax.OpenParenToken);
      node.expression = allowInAnd(parseExpression);
      parseExpected(Syntax.CloseParenToken);

      // From: https://mail.mozilla.org/pipermail/es-discuss/2011-August/016188.html
      // 157 min --- All allen at wirfs-brock.com CONF --- "do{;}while(false)false" prohibited in
      // spec but allowed in consensus reality. Approved -- this is the de-facto standard whereby
      //  do;while(0)x will have a semicolon inserted before x.
      parseOptional(Syntax.SemicolonToken);
      return finishNode(node);
    }

    function parseWhileStatement(): WhileStatement {
      const node = <WhileStatement>createNode(Syntax.WhileStatement);
      parseExpected(Syntax.WhileKeyword);
      parseExpected(Syntax.OpenParenToken);
      node.expression = allowInAnd(parseExpression);
      parseExpected(Syntax.CloseParenToken);
      node.statement = parseStatement();
      return finishNode(node);
    }

    function parseForOrForInOrForOfStatement(): Statement {
      const pos = getNodePos();
      parseExpected(Syntax.ForKeyword);
      const awaitToken = parseOptionalToken(Syntax.AwaitKeyword);
      parseExpected(Syntax.OpenParenToken);

      let initializer!: VariableDeclarationList | Expression;
      if (token() !== Syntax.SemicolonToken) {
        if (token() === Syntax.VarKeyword || token() === Syntax.LetKeyword || token() === Syntax.ConstKeyword) {
          initializer = parseVariableDeclarationList(/*inForStatementInitializer*/ true);
        } else {
          initializer = disallowInAnd(parseExpression);
        }
      }
      let forOrForInOrForOfStatement: IterationStatement;
      if (awaitToken ? parseExpected(Syntax.OfKeyword) : parseOptional(Syntax.OfKeyword)) {
        const forOfStatement = <ForOfStatement>createNode(Syntax.ForOfStatement, pos);
        forOfStatement.awaitModifier = awaitToken;
        forOfStatement.initializer = initializer;
        forOfStatement.expression = allowInAnd(parseAssignmentExpressionOrHigher);
        parseExpected(Syntax.CloseParenToken);
        forOrForInOrForOfStatement = forOfStatement;
      } else if (parseOptional(Syntax.InKeyword)) {
        const forInStatement = <ForInStatement>createNode(Syntax.ForInStatement, pos);
        forInStatement.initializer = initializer;
        forInStatement.expression = allowInAnd(parseExpression);
        parseExpected(Syntax.CloseParenToken);
        forOrForInOrForOfStatement = forInStatement;
      } else {
        const forStatement = <ForStatement>createNode(Syntax.ForStatement, pos);
        forStatement.initializer = initializer;
        parseExpected(Syntax.SemicolonToken);
        if (token() !== Syntax.SemicolonToken && token() !== Syntax.CloseParenToken) {
          forStatement.condition = allowInAnd(parseExpression);
        }
        parseExpected(Syntax.SemicolonToken);
        if (token() !== Syntax.CloseParenToken) {
          forStatement.incrementor = allowInAnd(parseExpression);
        }
        parseExpected(Syntax.CloseParenToken);
        forOrForInOrForOfStatement = forStatement;
      }

      forOrForInOrForOfStatement.statement = parseStatement();

      return finishNode(forOrForInOrForOfStatement);
    }

    function parseBreakOrContinueStatement(kind: Syntax): BreakOrContinueStatement {
      const node = <BreakOrContinueStatement>createNode(kind);

      parseExpected(kind === Syntax.BreakStatement ? Syntax.BreakKeyword : Syntax.ContinueKeyword);
      if (!canParseSemicolon()) {
        node.label = parseIdentifier();
      }

      parseSemicolon();
      return finishNode(node);
    }

    function parseReturnStatement(): ReturnStatement {
      const node = <ReturnStatement>createNode(Syntax.ReturnStatement);

      parseExpected(Syntax.ReturnKeyword);
      if (!canParseSemicolon()) {
        node.expression = allowInAnd(parseExpression);
      }

      parseSemicolon();
      return finishNode(node);
    }

    function parseWithStatement(): WithStatement {
      const node = <WithStatement>createNode(Syntax.WithStatement);
      parseExpected(Syntax.WithKeyword);
      parseExpected(Syntax.OpenParenToken);
      node.expression = allowInAnd(parseExpression);
      parseExpected(Syntax.CloseParenToken);
      node.statement = doInsideOfContext(NodeFlags.InWithStatement, parseStatement);
      return finishNode(node);
    }

    function parseCaseClause(): CaseClause {
      const node = <CaseClause>createNode(Syntax.CaseClause);
      parseExpected(Syntax.CaseKeyword);
      node.expression = allowInAnd(parseExpression);
      parseExpected(Syntax.ColonToken);
      node.statements = parseList(ParsingContext.SwitchClauseStatements, parseStatement);
      return finishNode(node);
    }

    function parseDefaultClause(): DefaultClause {
      const node = <DefaultClause>createNode(Syntax.DefaultClause);
      parseExpected(Syntax.DefaultKeyword);
      parseExpected(Syntax.ColonToken);
      node.statements = parseList(ParsingContext.SwitchClauseStatements, parseStatement);
      return finishNode(node);
    }

    function parseCaseOrDefaultClause(): CaseOrDefaultClause {
      return token() === Syntax.CaseKeyword ? parseCaseClause() : parseDefaultClause();
    }

    function parseSwitchStatement(): SwitchStatement {
      const node = <SwitchStatement>createNode(Syntax.SwitchStatement);
      parseExpected(Syntax.SwitchKeyword);
      parseExpected(Syntax.OpenParenToken);
      node.expression = allowInAnd(parseExpression);
      parseExpected(Syntax.CloseParenToken);
      const caseBlock = <CaseBlock>createNode(Syntax.CaseBlock);
      parseExpected(Syntax.OpenBraceToken);
      caseBlock.clauses = parseList(ParsingContext.SwitchClauses, parseCaseOrDefaultClause);
      parseExpected(Syntax.CloseBraceToken);
      node.caseBlock = finishNode(caseBlock);
      return finishNode(node);
    }

    function parseThrowStatement(): ThrowStatement {
      // ThrowStatement[Yield] :
      //      throw [no LineTerminator here]Expression[In, ?Yield];

      // Because of automatic semicolon insertion, we need to report error if this
      // throw could be terminated with a semicolon.  Note: we can't call 'parseExpression'
      // directly as that might consume an expression on the following line.
      // We just return 'undefined' in that case.  The actual error will be reported in the
      // grammar walker.
      const node = <ThrowStatement>createNode(Syntax.ThrowStatement);
      parseExpected(Syntax.ThrowKeyword);
      node.expression = scanner.hasPrecedingLineBreak() ? undefined : allowInAnd(parseExpression);
      parseSemicolon();
      return finishNode(node);
    }

    function parseTryStatement(): TryStatement {
      const node = <TryStatement>createNode(Syntax.TryStatement);

      parseExpected(Syntax.TryKeyword);
      node.tryBlock = parseBlock(/*ignoreMissingOpenBrace*/ false);
      node.catchClause = token() === Syntax.CatchKeyword ? parseCatchClause() : undefined;

      // If we don't have a catch clause, then we must have a finally clause.  Try to parse
      // one out no matter what.
      if (!node.catchClause || token() === Syntax.FinallyKeyword) {
        parseExpected(Syntax.FinallyKeyword);
        node.finallyBlock = parseBlock(/*ignoreMissingOpenBrace*/ false);
      }

      return finishNode(node);
    }

    function parseCatchClause(): CatchClause {
      const result = <CatchClause>createNode(Syntax.CatchClause);
      parseExpected(Syntax.CatchKeyword);

      if (parseOptional(Syntax.OpenParenToken)) {
        result.variableDeclaration = parseVariableDeclaration();
        parseExpected(Syntax.CloseParenToken);
      } else {
        // Keep shape of node to avoid degrading performance.
        result.variableDeclaration = undefined;
      }

      result.block = parseBlock(/*ignoreMissingOpenBrace*/ false);
      return finishNode(result);
    }

    function parseDebuggerStatement(): Statement {
      const node = <Statement>createNode(Syntax.DebuggerStatement);
      parseExpected(Syntax.DebuggerKeyword);
      parseSemicolon();
      return finishNode(node);
    }

    function parseExpressionOrLabeledStatement(): ExpressionStatement | LabeledStatement {
      // Avoiding having to do the lookahead for a labeled statement by just trying to parse
      // out an expression, seeing if it is identifier and then seeing if it is followed by
      // a colon.
      const node = <ExpressionStatement | LabeledStatement>createNodeWithJSDoc(token() === Syntax.Identifier ? Syntax.Unknown : Syntax.ExpressionStatement);
      const expression = allowInAnd(parseExpression);
      if (expression.kind === Syntax.Identifier && parseOptional(Syntax.ColonToken)) {
        node.kind = Syntax.LabeledStatement;
        (<LabeledStatement>node).label = <Identifier>expression;
        (<LabeledStatement>node).statement = parseStatement();
      } else {
        node.kind = Syntax.ExpressionStatement;
        (<ExpressionStatement>node).expression = expression;
        parseSemicolon();
      }
      return finishNode(node);
    }

    function nextTokenIsIdentifierOrKeywordOnSameLine() {
      nextToken();
      return Token.identifierOrKeyword(token()) && !scanner.hasPrecedingLineBreak();
    }

    function nextTokenIsClassKeywordOnSameLine() {
      nextToken();
      return token() === Syntax.ClassKeyword && !scanner.hasPrecedingLineBreak();
    }

    function nextTokenIsFunctionKeywordOnSameLine() {
      nextToken();
      return token() === Syntax.FunctionKeyword && !scanner.hasPrecedingLineBreak();
    }

    function nextTokenIsIdentifierOrKeywordOrLiteralOnSameLine() {
      nextToken();
      return (Token.identifierOrKeyword(token()) || token() === Syntax.NumericLiteral || token() === Syntax.BigIntLiteral || token() === Syntax.StringLiteral) && !scanner.hasPrecedingLineBreak();
    }

    function isDeclaration(): boolean {
      while (true) {
        switch (token()) {
          case Syntax.VarKeyword:
          case Syntax.LetKeyword:
          case Syntax.ConstKeyword:
          case Syntax.FunctionKeyword:
          case Syntax.ClassKeyword:
          case Syntax.EnumKeyword:
            return true;

          // 'declare', 'module', 'namespace', 'interface'* and 'type' are all legal JavaScript identifiers;
          // however, an identifier cannot be followed by another identifier on the same line. This is what we
          // count on to parse out the respective declarations. For instance, we exploit this to say that
          //
          //    namespace n
          //
          // can be none other than the beginning of a namespace declaration, but need to respect that JavaScript sees
          //
          //    namespace
          //    n
          //
          // as the identifier 'namespace' on one line followed by the identifier 'n' on another.
          // We need to look one token ahead to see if it permissible to try parsing a declaration.
          //
          // *Note*: 'interface' is actually a strict mode reserved word. So while
          //
          //   "use strict"
          //   interface
          //   I {}
          //
          // could be legal, it would add complexity for very little gain.
          case Syntax.InterfaceKeyword:
          case Syntax.TypeKeyword:
            return nextTokenIsIdentifierOnSameLine();
          case Syntax.ModuleKeyword:
          case Syntax.NamespaceKeyword:
            return nextTokenIsIdentifierOrStringLiteralOnSameLine();
          case Syntax.AbstractKeyword:
          case Syntax.AsyncKeyword:
          case Syntax.DeclareKeyword:
          case Syntax.PrivateKeyword:
          case Syntax.ProtectedKeyword:
          case Syntax.PublicKeyword:
          case Syntax.ReadonlyKeyword:
            nextToken();
            // ASI takes effect for this modifier.
            if (scanner.hasPrecedingLineBreak()) {
              return false;
            }
            continue;

          case Syntax.GlobalKeyword:
            nextToken();
            return token() === Syntax.OpenBraceToken || token() === Syntax.Identifier || token() === Syntax.ExportKeyword;

          case Syntax.ImportKeyword:
            nextToken();
            return token() === Syntax.StringLiteral || token() === Syntax.AsteriskToken || token() === Syntax.OpenBraceToken || Token.identifierOrKeyword(token());
          case Syntax.ExportKeyword:
            let currentToken = nextToken();
            if (currentToken === Syntax.TypeKeyword) {
              currentToken = lookAhead(nextToken);
            }
            if (
              currentToken === Syntax.EqualsToken ||
              currentToken === Syntax.AsteriskToken ||
              currentToken === Syntax.OpenBraceToken ||
              currentToken === Syntax.DefaultKeyword ||
              currentToken === Syntax.AsKeyword
            ) {
              return true;
            }
            continue;

          case Syntax.StaticKeyword:
            nextToken();
            continue;
          default:
            return false;
        }
      }
    }

    function isStartOfDeclaration(): boolean {
      return lookAhead(isDeclaration);
    }

    function isStartOfStatement(): boolean {
      switch (token()) {
        case Syntax.AtToken:
        case Syntax.SemicolonToken:
        case Syntax.OpenBraceToken:
        case Syntax.VarKeyword:
        case Syntax.LetKeyword:
        case Syntax.FunctionKeyword:
        case Syntax.ClassKeyword:
        case Syntax.EnumKeyword:
        case Syntax.IfKeyword:
        case Syntax.DoKeyword:
        case Syntax.WhileKeyword:
        case Syntax.ForKeyword:
        case Syntax.ContinueKeyword:
        case Syntax.BreakKeyword:
        case Syntax.ReturnKeyword:
        case Syntax.WithKeyword:
        case Syntax.SwitchKeyword:
        case Syntax.ThrowKeyword:
        case Syntax.TryKeyword:
        case Syntax.DebuggerKeyword:
        // 'catch' and 'finally' do not actually indicate that the code is part of a statement,
        // however, we say they are here so that we may gracefully parse them and error later.
        // falls through
        case Syntax.CatchKeyword:
        case Syntax.FinallyKeyword:
          return true;

        case Syntax.ImportKeyword:
          return isStartOfDeclaration() || lookAhead(nextTokenIsOpenParenOrLessThanOrDot);

        case Syntax.ConstKeyword:
        case Syntax.ExportKeyword:
          return isStartOfDeclaration();

        case Syntax.AsyncKeyword:
        case Syntax.DeclareKeyword:
        case Syntax.InterfaceKeyword:
        case Syntax.ModuleKeyword:
        case Syntax.NamespaceKeyword:
        case Syntax.TypeKeyword:
        case Syntax.GlobalKeyword:
          // When these don't start a declaration, they're an identifier in an expression statement
          return true;

        case Syntax.PublicKeyword:
        case Syntax.PrivateKeyword:
        case Syntax.ProtectedKeyword:
        case Syntax.StaticKeyword:
        case Syntax.ReadonlyKeyword:
          // When these don't start a declaration, they may be the start of a class member if an identifier
          // immediately follows. Otherwise they're an identifier in an expression statement.
          return isStartOfDeclaration() || !lookAhead(nextTokenIsIdentifierOrKeywordOnSameLine);

        default:
          return isStartOfExpression();
      }
    }

    function nextTokenIsIdentifierOrStartOfDestructuring() {
      nextToken();
      return isIdentifier() || token() === Syntax.OpenBraceToken || token() === Syntax.OpenBracketToken;
    }

    function isLetDeclaration() {
      // In ES6 'let' always starts a lexical declaration if followed by an identifier or {
      // or [.
      return lookAhead(nextTokenIsIdentifierOrStartOfDestructuring);
    }

    function parseStatement(): Statement {
      switch (token()) {
        case Syntax.SemicolonToken:
          return parseEmptyStatement();
        case Syntax.OpenBraceToken:
          return parseBlock(/*ignoreMissingOpenBrace*/ false);
        case Syntax.VarKeyword:
          return parseVariableStatement(<VariableStatement>createNodeWithJSDoc(Syntax.VariableDeclaration));
        case Syntax.LetKeyword:
          if (isLetDeclaration()) {
            return parseVariableStatement(<VariableStatement>createNodeWithJSDoc(Syntax.VariableDeclaration));
          }
          break;
        case Syntax.FunctionKeyword:
          return parseFunctionDeclaration(<FunctionDeclaration>createNodeWithJSDoc(Syntax.FunctionDeclaration));
        case Syntax.ClassKeyword:
          return parseClassDeclaration(<ClassDeclaration>createNodeWithJSDoc(Syntax.ClassDeclaration));
        case Syntax.IfKeyword:
          return parseIfStatement();
        case Syntax.DoKeyword:
          return parseDoStatement();
        case Syntax.WhileKeyword:
          return parseWhileStatement();
        case Syntax.ForKeyword:
          return parseForOrForInOrForOfStatement();
        case Syntax.ContinueKeyword:
          return parseBreakOrContinueStatement(Syntax.ContinueStatement);
        case Syntax.BreakKeyword:
          return parseBreakOrContinueStatement(Syntax.BreakStatement);
        case Syntax.ReturnKeyword:
          return parseReturnStatement();
        case Syntax.WithKeyword:
          return parseWithStatement();
        case Syntax.SwitchKeyword:
          return parseSwitchStatement();
        case Syntax.ThrowKeyword:
          return parseThrowStatement();
        case Syntax.TryKeyword:
        // Include 'catch' and 'finally' for error recovery.
        // falls through
        case Syntax.CatchKeyword:
        case Syntax.FinallyKeyword:
          return parseTryStatement();
        case Syntax.DebuggerKeyword:
          return parseDebuggerStatement();
        case Syntax.AtToken:
          return parseDeclaration();
        case Syntax.AsyncKeyword:
        case Syntax.InterfaceKeyword:
        case Syntax.TypeKeyword:
        case Syntax.ModuleKeyword:
        case Syntax.NamespaceKeyword:
        case Syntax.DeclareKeyword:
        case Syntax.ConstKeyword:
        case Syntax.EnumKeyword:
        case Syntax.ExportKeyword:
        case Syntax.ImportKeyword:
        case Syntax.PrivateKeyword:
        case Syntax.ProtectedKeyword:
        case Syntax.PublicKeyword:
        case Syntax.AbstractKeyword:
        case Syntax.StaticKeyword:
        case Syntax.ReadonlyKeyword:
        case Syntax.GlobalKeyword:
          if (isStartOfDeclaration()) {
            return parseDeclaration();
          }
          break;
      }
      return parseExpressionOrLabeledStatement();
    }

    function isDeclareModifier(modifier: Modifier) {
      return modifier.kind === Syntax.DeclareKeyword;
    }

    function parseDeclaration(): Statement {
      const modifiers = lookAhead(() => (parseDecorators(), parseModifiers()));
      // `parseListElement` attempted to get the reused node at this position,
      // but the ambient context flag was not yet set, so the node appeared
      // not reusable in that context.
      const isAmbient = some(modifiers, isDeclareModifier);
      if (isAmbient) {
        const node = tryReuseAmbientDeclaration();
        if (node) {
          return node;
        }
      }

      const node = <Statement>createNodeWithJSDoc(Syntax.Unknown);
      node.decorators = parseDecorators();
      node.modifiers = parseModifiers();
      if (isAmbient) {
        for (const m of node.modifiers!) {
          m.flags |= NodeFlags.Ambient;
        }
        return doInsideOfContext(NodeFlags.Ambient, () => parseDeclarationWorker(node));
      } else {
        return parseDeclarationWorker(node);
      }
    }

    function tryReuseAmbientDeclaration(): Statement | undefined {
      return doInsideOfContext(NodeFlags.Ambient, () => {
        const node = currentNode(parsingContext);
        if (node) {
          return consumeNode(node) as Statement;
        }
        return;
      });
    }

    function parseDeclarationWorker(node: Statement): Statement {
      switch (token()) {
        case Syntax.VarKeyword:
        case Syntax.LetKeyword:
        case Syntax.ConstKeyword:
          return parseVariableStatement(<VariableStatement>node);
        case Syntax.FunctionKeyword:
          return parseFunctionDeclaration(<FunctionDeclaration>node);
        case Syntax.ClassKeyword:
          return parseClassDeclaration(<ClassDeclaration>node);
        case Syntax.InterfaceKeyword:
          return parseInterfaceDeclaration(<InterfaceDeclaration>node);
        case Syntax.TypeKeyword:
          return parseTypeAliasDeclaration(<TypeAliasDeclaration>node);
        case Syntax.EnumKeyword:
          return parseEnumDeclaration(<EnumDeclaration>node);
        case Syntax.GlobalKeyword:
        case Syntax.ModuleKeyword:
        case Syntax.NamespaceKeyword:
          return parseModuleDeclaration(<ModuleDeclaration>node);
        case Syntax.ImportKeyword:
          return parseImportDeclarationOrImportEqualsDeclaration(<ImportDeclaration | ImportEqualsDeclaration>node);
        case Syntax.ExportKeyword:
          nextToken();
          switch (token()) {
            case Syntax.DefaultKeyword:
            case Syntax.EqualsToken:
              return parseExportAssignment(<ExportAssignment>node);
            case Syntax.AsKeyword:
              return parseNamespaceExportDeclaration(<NamespaceExportDeclaration>node);
            default:
              return parseExportDeclaration(<ExportDeclaration>node);
          }
        default:
          if (node.decorators || node.modifiers) {
            // We reached this point because we encountered decorators and/or modifiers and assumed a declaration
            // would follow. For recovery and error reporting purposes, return an incomplete declaration.
            const missing = createMissingNode<Statement>(Syntax.MissingDeclaration, true, Diagnostics.Declaration_expected);
            missing.pos = node.pos;
            missing.decorators = node.decorators;
            missing.modifiers = node.modifiers;
            return finishNode(missing);
          }
          return undefined!; // TODO: GH#18217
      }
    }

    function nextTokenIsIdentifierOrStringLiteralOnSameLine() {
      nextToken();
      return !scanner.hasPrecedingLineBreak() && (isIdentifier() || token() === Syntax.StringLiteral);
    }

    function parseFunctionBlockOrSemicolon(flags: SignatureFlags, m?: DiagnosticMessage): Block | undefined {
      if (token() !== Syntax.OpenBraceToken && canParseSemicolon()) {
        parseSemicolon();
        return;
      }

      return parseFunctionBlock(flags, m);
    }

    function parseArrayBindingElement(): ArrayBindingElement {
      if (token() === Syntax.CommaToken) {
        return <OmittedExpression>createNode(Syntax.OmittedExpression);
      }
      const node = <BindingElement>createNode(Syntax.BindingElement);
      node.dot3Token = parseOptionalToken(Syntax.Dot3Token);
      node.name = parseIdentifierOrPattern();
      node.initializer = parseInitializer();
      return finishNode(node);
    }

    function parseObjectBindingElement(): BindingElement {
      const node = <BindingElement>createNode(Syntax.BindingElement);
      node.dot3Token = parseOptionalToken(Syntax.Dot3Token);
      const tokenIsIdentifier = isIdentifier();
      const propertyName = parsePropertyName();
      if (tokenIsIdentifier && token() !== Syntax.ColonToken) {
        node.name = <Identifier>propertyName;
      } else {
        parseExpected(Syntax.ColonToken);
        node.propertyName = propertyName;
        node.name = parseIdentifierOrPattern();
      }
      node.initializer = parseInitializer();
      return finishNode(node);
    }

    function parseObjectBindingPattern(): ObjectBindingPattern {
      const node = <ObjectBindingPattern>createNode(Syntax.ObjectBindingPattern);
      parseExpected(Syntax.OpenBraceToken);
      node.elements = parseDelimitedList(ParsingContext.ObjectBindingElements, parseObjectBindingElement);
      parseExpected(Syntax.CloseBraceToken);
      return finishNode(node);
    }

    function parseArrayBindingPattern(): ArrayBindingPattern {
      const node = <ArrayBindingPattern>createNode(Syntax.ArrayBindingPattern);
      parseExpected(Syntax.OpenBracketToken);
      node.elements = parseDelimitedList(ParsingContext.ArrayBindingElements, parseArrayBindingElement);
      parseExpected(Syntax.CloseBracketToken);
      return finishNode(node);
    }

    function isIdentifierOrPrivateIdentifierOrPattern() {
      return token() === Syntax.OpenBraceToken || token() === Syntax.OpenBracketToken || token() === Syntax.PrivateIdentifier || isIdentifier();
    }

    function parseIdentifierOrPattern(privateIdentifierDiagnosticMessage?: DiagnosticMessage): Identifier | BindingPattern {
      if (token() === Syntax.OpenBracketToken) {
        return parseArrayBindingPattern();
      }
      if (token() === Syntax.OpenBraceToken) {
        return parseObjectBindingPattern();
      }
      return parseIdentifier(/*m*/ undefined, privateIdentifierDiagnosticMessage);
    }

    function parseVariableDeclarationAllowExclamation() {
      return parseVariableDeclaration(/*allowExclamation*/ true);
    }

    function parseVariableDeclaration(allowExclamation?: boolean): VariableDeclaration {
      const node = <VariableDeclaration>createNode(Syntax.VariableDeclaration);
      node.name = parseIdentifierOrPattern(Diagnostics.Private_identifiers_are_not_allowed_in_variable_declarations);
      if (allowExclamation && node.name.kind === Syntax.Identifier && token() === Syntax.ExclamationToken && !scanner.hasPrecedingLineBreak()) {
        node.exclamationToken = parseTokenNode<Token<Syntax.ExclamationToken>>();
      }
      node.type = parseTypeAnnotation();
      if (!isInOrOfKeyword(token())) {
        node.initializer = parseInitializer();
      }
      return finishNode(node);
    }

    function parseVariableDeclarationList(inForStatementInitializer: boolean): VariableDeclarationList {
      const node = <VariableDeclarationList>createNode(Syntax.VariableDeclarationList);

      switch (token()) {
        case Syntax.VarKeyword:
          break;
        case Syntax.LetKeyword:
          node.flags |= NodeFlags.Let;
          break;
        case Syntax.ConstKeyword:
          node.flags |= NodeFlags.Const;
          break;
        default:
          fail();
      }

      nextToken();

      // The user may have written the following:
      //
      //    for (let of X) { }
      //
      // In this case, we want to parse an empty declaration list, and then parse 'of'
      // as a keyword. The reason this is not automatic is that 'of' is a valid identifier.
      // So we need to look ahead to determine if 'of' should be treated as a keyword in
      // this context.
      // The checker will then give an error that there is an empty declaration list.
      if (token() === Syntax.OfKeyword && lookAhead(canFollowContextualOfKeyword)) {
        node.declarations = createMissingList<VariableDeclaration>();
      } else {
        const savedDisallowIn = inDisallowInContext();
        setDisallowInContext(inForStatementInitializer);

        node.declarations = parseDelimitedList(ParsingContext.VariableDeclarations, inForStatementInitializer ? parseVariableDeclaration : parseVariableDeclarationAllowExclamation);

        setDisallowInContext(savedDisallowIn);
      }

      return finishNode(node);
    }

    function canFollowContextualOfKeyword(): boolean {
      return nextTokenIsIdentifier() && nextToken() === Syntax.CloseParenToken;
    }

    function parseVariableStatement(node: VariableStatement): VariableStatement {
      node.kind = Syntax.VariableStatement;
      node.declarationList = parseVariableDeclarationList(/*inForStatementInitializer*/ false);
      parseSemicolon();
      return finishNode(node);
    }

    function parseFunctionDeclaration(node: FunctionDeclaration): FunctionDeclaration {
      node.kind = Syntax.FunctionDeclaration;
      parseExpected(Syntax.FunctionKeyword);
      node.asteriskToken = parseOptionalToken(Syntax.AsteriskToken);
      node.name = hasModifierOfKind(node, Syntax.DefaultKeyword) ? parseOptionalIdentifier() : parseIdentifier();
      const isGenerator = node.asteriskToken ? SignatureFlags.Yield : SignatureFlags.None;
      const isAsync = hasModifierOfKind(node, Syntax.AsyncKeyword) ? SignatureFlags.Await : SignatureFlags.None;
      fillSignature(Syntax.ColonToken, isGenerator | isAsync, node);
      node.body = parseFunctionBlockOrSemicolon(isGenerator | isAsync, Diagnostics.or_expected);
      return finishNode(node);
    }

    function parseConstructorName() {
      if (token() === Syntax.ConstructorKeyword) {
        return parseExpected(Syntax.ConstructorKeyword);
      }
      if (token() === Syntax.StringLiteral && lookAhead(nextToken) === Syntax.OpenParenToken) {
        return tryParse(() => {
          const literalNode = parseLiteralNode();
          return literalNode.text === 'constructor' ? literalNode : undefined;
        });
      }
      return;
    }

    function tryParseConstructorDeclaration(node: ConstructorDeclaration): ConstructorDeclaration | undefined {
      return tryParse(() => {
        if (parseConstructorName()) {
          node.kind = Syntax.Constructor;
          fillSignature(Syntax.ColonToken, SignatureFlags.None, node);
          node.body = parseFunctionBlockOrSemicolon(SignatureFlags.None, Diagnostics.or_expected);
          return finishNode(node);
        }
        return;
      });
    }

    function parseMethodDeclaration(node: MethodDeclaration, asteriskToken: AsteriskToken, m?: DiagnosticMessage): MethodDeclaration {
      node.kind = Syntax.MethodDeclaration;
      node.asteriskToken = asteriskToken;
      const isGenerator = asteriskToken ? SignatureFlags.Yield : SignatureFlags.None;
      const isAsync = hasModifierOfKind(node, Syntax.AsyncKeyword) ? SignatureFlags.Await : SignatureFlags.None;
      fillSignature(Syntax.ColonToken, isGenerator | isAsync, node);
      node.body = parseFunctionBlockOrSemicolon(isGenerator | isAsync, m);
      return finishNode(node);
    }

    function parsePropertyDeclaration(node: PropertyDeclaration): PropertyDeclaration {
      node.kind = Syntax.PropertyDeclaration;
      if (!node.questionToken && token() === Syntax.ExclamationToken && !scanner.hasPrecedingLineBreak()) {
        node.exclamationToken = parseTokenNode<Token<Syntax.ExclamationToken>>();
      }
      node.type = parseTypeAnnotation();
      node.initializer = doOutsideOfContext(NodeFlags.YieldContext | NodeFlags.AwaitContext | NodeFlags.DisallowInContext, parseInitializer);

      parseSemicolon();
      return finishNode(node);
    }

    function parsePropertyOrMethodDeclaration(node: PropertyDeclaration | MethodDeclaration): PropertyDeclaration | MethodDeclaration {
      const asteriskToken = parseOptionalToken(Syntax.AsteriskToken);
      node.name = parsePropertyName();
      // Note: this is not legal as per the grammar.  But we allow it in the parser and
      // report an error in the grammar checker.
      node.questionToken = parseOptionalToken(Syntax.QuestionToken);
      if (asteriskToken || token() === Syntax.OpenParenToken || token() === Syntax.LessThanToken) {
        return parseMethodDeclaration(<MethodDeclaration>node, asteriskToken, Diagnostics.or_expected);
      }
      return parsePropertyDeclaration(<PropertyDeclaration>node);
    }

    function parseAccessorDeclaration(node: AccessorDeclaration, kind: AccessorDeclaration['kind']): AccessorDeclaration {
      node.kind = kind;
      node.name = parsePropertyName();
      fillSignature(Syntax.ColonToken, SignatureFlags.None, node);
      node.body = parseFunctionBlockOrSemicolon(SignatureFlags.None);
      return finishNode(node);
    }

    function isClassMemberStart(): boolean {
      let idToken: Syntax | undefined;

      if (token() === Syntax.AtToken) {
        return true;
      }

      // Eat up all modifiers, but hold on to the last one in case it is actually an identifier.
      while (isModifierKind(token())) {
        idToken = token();
        // If the idToken is a class modifier (protected, private, public, and static), it is
        // certain that we are starting to parse class member. This allows better error recovery
        // Example:
        //      public foo() ...     // true
        //      public @dec blah ... // true; we will then report an error later
        //      export public ...    // true; we will then report an error later
        if (isClassMemberModifier(idToken)) {
          return true;
        }

        nextToken();
      }

      if (token() === Syntax.AsteriskToken) {
        return true;
      }

      // Try to get the first property-like token following all modifiers.
      // This can either be an identifier or the 'get' or 'set' keywords.
      if (isLiteralPropertyName()) {
        idToken = token();
        nextToken();
      }

      // Index signatures and computed properties are class members; we can parse.
      if (token() === Syntax.OpenBracketToken) {
        return true;
      }

      // If we were able to get any potential identifier...
      if (idToken !== undefined) {
        // If we have a non-keyword identifier, or if we have an accessor, then it's safe to parse.
        if (!isKeyword(idToken) || idToken === Syntax.SetKeyword || idToken === Syntax.GetKeyword) {
          return true;
        }

        // If it *is* a keyword, but not an accessor, check a little farther along
        // to see if it should actually be parsed as a class member.
        switch (token()) {
          case Syntax.OpenParenToken: // Method declaration
          case Syntax.LessThanToken: // Generic Method declaration
          case Syntax.ExclamationToken: // Non-null assertion on property name
          case Syntax.ColonToken: // Type Annotation for declaration
          case Syntax.EqualsToken: // Initializer for declaration
          case Syntax.QuestionToken: // Not valid, but permitted so that it gets caught later on.
            return true;
          default:
            // Covers
            //  - Semicolons     (declaration termination)
            //  - Closing braces (end-of-class, must be declaration)
            //  - End-of-files   (not valid, but permitted so that it gets caught later on)
            //  - Line-breaks    (enabling *automatic semicolon insertion*)
            return canParseSemicolon();
        }
      }

      return false;
    }

    function parseDecorators(): NodeArray<Decorator> | undefined {
      let list: Decorator[] | undefined;
      const listPos = getNodePos();
      while (true) {
        const decoratorStart = getNodePos();
        if (!parseOptional(Syntax.AtToken)) {
          break;
        }
        const decorator = <Decorator>createNode(Syntax.Decorator, decoratorStart);
        decorator.expression = doInDecoratorContext(parseLeftHandSideExpressionOrHigher);
        finishNode(decorator);
        (list || (list = [])).push(decorator);
      }
      return list && NodeArray.create(list, listPos);
    }

    function parseModifiers(permitInvalidConstAsModifier?: boolean): NodeArray<Modifier> | undefined {
      let list: Modifier[] | undefined;
      const listPos = getNodePos();
      while (true) {
        const modifierStart = scanner.getStartPos();
        const modifierKind = token();

        if (token() === Syntax.ConstKeyword && permitInvalidConstAsModifier) {
          // We need to ensure that any subsequent modifiers appear on the same line
          // so that when 'const' is a standalone declaration, we don't issue an error.
          if (!tryParse(nextTokenIsOnSameLineAndCanFollowModifier)) {
            break;
          }
        } else {
          if (!parseAnyContextualModifier()) {
            break;
          }
        }

        const modifier = finishNode(<Modifier>createNode(modifierKind, modifierStart));
        (list || (list = [])).push(modifier);
      }
      return list && NodeArray.create(list, listPos);
    }

    function parseModifiersForArrowFunction(): NodeArray<Modifier> | undefined {
      let modifiers: NodeArray<Modifier> | undefined;
      if (token() === Syntax.AsyncKeyword) {
        const modifierStart = scanner.getStartPos();
        const modifierKind = token();
        nextToken();
        const modifier = finishNode(<Modifier>createNode(modifierKind, modifierStart));
        modifiers = NodeArray.create<Modifier>([modifier], modifierStart);
      }
      return modifiers;
    }

    function parseClassElement(): ClassElement {
      if (token() === Syntax.SemicolonToken) {
        const n = <SemicolonClassElement>createNode(Syntax.SemicolonClassElement);
        nextToken();
        return finishNode(n);
      }
      const n = <ClassElement>createNodeWithJSDoc(Syntax.Unknown);
      n.decorators = parseDecorators();
      n.modifiers = parseModifiers(true);
      if (parseContextualModifier(Syntax.GetKeyword)) return parseAccessorDeclaration(<AccessorDeclaration>n, Syntax.GetAccessor);
      if (parseContextualModifier(Syntax.SetKeyword)) return parseAccessorDeclaration(<AccessorDeclaration>n, Syntax.SetAccessor);
      if (token() === Syntax.ConstructorKeyword || token() === Syntax.StringLiteral) {
        const d = tryParseConstructorDeclaration(<ConstructorDeclaration>n);
        if (d) return d;
      }
      if (isIndexSignature()) return parseIndexSignatureDeclaration(<IndexSignatureDeclaration>n);
      if (Token.identifierOrKeyword(token()) || token() === Syntax.StringLiteral || token() === Syntax.NumericLiteral || token() === Syntax.AsteriskToken || token() === Syntax.OpenBracketToken) {
        const isAmbient = n.modifiers && some(n.modifiers, isDeclareModifier);
        if (isAmbient) {
          for (const m of n.modifiers!) {
            m.flags |= NodeFlags.Ambient;
          }
          return doInsideOfContext(NodeFlags.Ambient, () => parsePropertyOrMethodDeclaration(n as PropertyDeclaration | MethodDeclaration));
        }
        return parsePropertyOrMethodDeclaration(n as PropertyDeclaration | MethodDeclaration);
      }
      if (n.decorators || n.modifiers) {
        n.name = createMissingNode<Identifier>(Syntax.Identifier, true, Diagnostics.Declaration_expected);
        return parsePropertyDeclaration(<PropertyDeclaration>n);
      }
      return fail('Should not have attempted to parse class member declaration.');
    }

    function parseClassExpression(): ClassExpression {
      return <ClassExpression>parseClassDeclarationOrExpression(<ClassLikeDeclaration>createNodeWithJSDoc(Syntax.Unknown), Syntax.ClassExpression);
    }

    function parseClassDeclaration(node: ClassLikeDeclaration): ClassDeclaration {
      return <ClassDeclaration>parseClassDeclarationOrExpression(node, Syntax.ClassDeclaration);
    }

    function parseClassDeclarationOrExpression(node: ClassLikeDeclaration, kind: ClassLikeDeclaration['kind']): ClassLikeDeclaration {
      node.kind = kind;
      parseExpected(Syntax.ClassKeyword);
      node.name = parseNameOfClassDeclarationOrExpression();
      node.typeParameters = parseTypeParameters();
      node.heritageClauses = parseHeritageClauses();

      if (parseExpected(Syntax.OpenBraceToken)) {
        // ClassTail[Yield,Await] : (Modified) See 14.5
        //      ClassHeritage[?Yield,?Await]opt { ClassBody[?Yield,?Await]opt }
        node.members = parseClassMembers();
        parseExpected(Syntax.CloseBraceToken);
      } else {
        node.members = createMissingList<ClassElement>();
      }

      return finishNode(node);
    }

    function parseNameOfClassDeclarationOrExpression(): Identifier | undefined {
      // implements is a future reserved word so
      // 'class implements' might mean either
      // - class expression with omitted name, 'implements' starts heritage clause
      // - class with name 'implements'
      // 'isImplementsClause' helps to disambiguate between these two cases
      return isIdentifier() && !isImplementsClause() ? parseIdentifier() : undefined;
    }

    function isImplementsClause() {
      return token() === Syntax.ImplementsKeyword && lookAhead(nextTokenIsIdentifierOrKeyword);
    }

    function parseHeritageClauses(): NodeArray<HeritageClause> | undefined {
      // ClassTail[Yield,Await] : (Modified) See 14.5
      //      ClassHeritage[?Yield,?Await]opt { ClassBody[?Yield,?Await]opt }

      if (isHeritageClause()) {
        return parseList(ParsingContext.HeritageClauses, parseHeritageClause);
      }

      return;
    }

    function parseHeritageClause(): HeritageClause {
      const tok = token();
      assert(tok === Syntax.ExtendsKeyword || tok === Syntax.ImplementsKeyword); // isListElement() should ensure this.
      const node = <HeritageClause>createNode(Syntax.HeritageClause);
      node.token = tok;
      nextToken();
      node.types = parseDelimitedList(ParsingContext.HeritageClauseElement, parseExpressionWithTypeArguments);
      return finishNode(node);
    }

    function parseExpressionWithTypeArguments(): ExpressionWithTypeArguments {
      const node = <ExpressionWithTypeArguments>createNode(Syntax.ExpressionWithTypeArguments);
      node.expression = parseLeftHandSideExpressionOrHigher();
      node.typeArguments = tryParseTypeArguments();
      return finishNode(node);
    }

    function tryParseTypeArguments(): NodeArray<TypeNode> | undefined {
      return token() === Syntax.LessThanToken ? parseBracketedList(ParsingContext.TypeArguments, parseType, Syntax.LessThanToken, Syntax.GreaterThanToken) : undefined;
    }

    function isHeritageClause(): boolean {
      return token() === Syntax.ExtendsKeyword || token() === Syntax.ImplementsKeyword;
    }

    function parseClassMembers(): NodeArray<ClassElement> {
      return parseList(ParsingContext.ClassMembers, parseClassElement);
    }

    function parseInterfaceDeclaration(node: InterfaceDeclaration): InterfaceDeclaration {
      node.kind = Syntax.InterfaceDeclaration;
      parseExpected(Syntax.InterfaceKeyword);
      node.name = parseIdentifier();
      node.typeParameters = parseTypeParameters();
      node.heritageClauses = parseHeritageClauses();
      node.members = parseObjectTypeMembers();
      return finishNode(node);
    }

    function parseTypeAliasDeclaration(node: TypeAliasDeclaration): TypeAliasDeclaration {
      node.kind = Syntax.TypeAliasDeclaration;
      parseExpected(Syntax.TypeKeyword);
      node.name = parseIdentifier();
      node.typeParameters = parseTypeParameters();
      parseExpected(Syntax.EqualsToken);
      node.type = parseType();
      parseSemicolon();
      return finishNode(node);
    }

    function parseEnumMember(): EnumMember {
      const node = <EnumMember>createNodeWithJSDoc(Syntax.EnumMember);
      node.name = parsePropertyName();
      node.initializer = allowInAnd(parseInitializer);
      return finishNode(node);
    }

    function parseEnumDeclaration(node: EnumDeclaration): EnumDeclaration {
      node.kind = Syntax.EnumDeclaration;
      parseExpected(Syntax.EnumKeyword);
      node.name = parseIdentifier();
      if (parseExpected(Syntax.OpenBraceToken)) {
        node.members = doOutsideOfYieldAndAwaitContext(() => parseDelimitedList(ParsingContext.EnumMembers, parseEnumMember));
        parseExpected(Syntax.CloseBraceToken);
      } else {
        node.members = createMissingList<EnumMember>();
      }
      return finishNode(node);
    }

    function parseModuleBlock(): ModuleBlock {
      const node = <ModuleBlock>createNode(Syntax.ModuleBlock);
      if (parseExpected(Syntax.OpenBraceToken)) {
        node.statements = parseList(ParsingContext.BlockStatements, parseStatement);
        parseExpected(Syntax.CloseBraceToken);
      } else {
        node.statements = createMissingList<Statement>();
      }
      return finishNode(node);
    }

    function parseModuleOrNamespaceDeclaration(node: ModuleDeclaration, flags: NodeFlags): ModuleDeclaration {
      node.kind = Syntax.ModuleDeclaration;
      // If we are parsing a dotted namespace name, we want to
      // propagate the 'Namespace' flag across the names if set.
      const namespaceFlag = flags & NodeFlags.Namespace;
      node.flags |= flags;
      node.name = parseIdentifier();
      node.body = parseOptional(Syntax.DotToken)
        ? <NamespaceDeclaration>parseModuleOrNamespaceDeclaration(<ModuleDeclaration>createNode(Syntax.Unknown), NodeFlags.NestedNamespace | namespaceFlag)
        : parseModuleBlock();
      return finishNode(node);
    }

    function parseAmbientExternalModuleDeclaration(node: ModuleDeclaration): ModuleDeclaration {
      node.kind = Syntax.ModuleDeclaration;
      if (token() === Syntax.GlobalKeyword) {
        // parse 'global' as name of global scope augmentation
        node.name = parseIdentifier();
        node.flags |= NodeFlags.GlobalAugmentation;
      } else {
        node.name = <StringLiteral>parseLiteralNode();
        node.name.text = internIdentifier(node.name.text);
      }
      if (token() === Syntax.OpenBraceToken) {
        node.body = parseModuleBlock();
      } else {
        parseSemicolon();
      }
      return finishNode(node);
    }

    function parseModuleDeclaration(node: ModuleDeclaration): ModuleDeclaration {
      let flags: NodeFlags = 0;
      if (token() === Syntax.GlobalKeyword) {
        // global augmentation
        return parseAmbientExternalModuleDeclaration(node);
      } else if (parseOptional(Syntax.NamespaceKeyword)) {
        flags |= NodeFlags.Namespace;
      } else {
        parseExpected(Syntax.ModuleKeyword);
        if (token() === Syntax.StringLiteral) {
          return parseAmbientExternalModuleDeclaration(node);
        }
      }
      return parseModuleOrNamespaceDeclaration(node, flags);
    }

    function isExternalModuleReference() {
      return token() === Syntax.RequireKeyword && lookAhead(nextTokenIsOpenParen);
    }

    function nextTokenIsOpenParen() {
      return nextToken() === Syntax.OpenParenToken;
    }

    function nextTokenIsSlash() {
      return nextToken() === Syntax.SlashToken;
    }

    function parseNamespaceExportDeclaration(node: NamespaceExportDeclaration): NamespaceExportDeclaration {
      node.kind = Syntax.NamespaceExportDeclaration;
      parseExpected(Syntax.AsKeyword);
      parseExpected(Syntax.NamespaceKeyword);
      node.name = parseIdentifier();
      parseSemicolon();
      return finishNode(node);
    }

    function parseImportDeclarationOrImportEqualsDeclaration(node: ImportEqualsDeclaration | ImportDeclaration): ImportEqualsDeclaration | ImportDeclaration {
      parseExpected(Syntax.ImportKeyword);
      const afterImportPos = scanner.getStartPos();

      let identifier: Identifier | undefined;
      if (isIdentifier()) {
        identifier = parseIdentifier();
      }

      let isTypeOnly = false;
      if (token() !== Syntax.FromKeyword && identifier?.escapedText === 'type' && (isIdentifier() || tokenAfterImportDefinitelyProducesImportDeclaration())) {
        isTypeOnly = true;
        identifier = isIdentifier() ? parseIdentifier() : undefined;
      }

      if (identifier && !tokenAfterImportedIdentifierDefinitelyProducesImportDeclaration()) {
        return parseImportEqualsDeclaration(<ImportEqualsDeclaration>node, identifier, isTypeOnly);
      }

      // Import statement
      node.kind = Syntax.ImportDeclaration;
      // ImportDeclaration:
      //  import ImportClause from ModuleSpecifier ;
      //  import ModuleSpecifier;
      if (
        identifier || // import id
        token() === Syntax.AsteriskToken || // import *
        token() === Syntax.OpenBraceToken // import {
      ) {
        (<ImportDeclaration>node).importClause = parseImportClause(identifier, afterImportPos, isTypeOnly);
        parseExpected(Syntax.FromKeyword);
      }

      (<ImportDeclaration>node).moduleSpecifier = parseModuleSpecifier();
      parseSemicolon();
      return finishNode(node);
    }

    function tokenAfterImportDefinitelyProducesImportDeclaration() {
      return token() === Syntax.AsteriskToken || token() === Syntax.OpenBraceToken;
    }

    function tokenAfterImportedIdentifierDefinitelyProducesImportDeclaration() {
      // In `import id ___`, the current token decides whether to produce
      // an ImportDeclaration or ImportEqualsDeclaration.
      return token() === Syntax.CommaToken || token() === Syntax.FromKeyword;
    }

    function parseImportEqualsDeclaration(node: ImportEqualsDeclaration, identifier: Identifier, isTypeOnly: boolean): ImportEqualsDeclaration {
      node.kind = Syntax.ImportEqualsDeclaration;
      node.name = identifier;
      parseExpected(Syntax.EqualsToken);
      node.moduleReference = parseModuleReference();
      parseSemicolon();
      const finished = finishNode(node);
      if (isTypeOnly) {
        parseErrorAtRange(finished, Diagnostics.Only_ECMAScript_imports_may_use_import_type);
      }
      return finished;
    }

    function parseImportClause(identifier: Identifier | undefined, fullStart: number, isTypeOnly: boolean) {
      // ImportClause:
      //  ImportedDefaultBinding
      //  NameSpaceImport
      //  NamedImports
      //  ImportedDefaultBinding, NameSpaceImport
      //  ImportedDefaultBinding, NamedImports

      const importClause = <ImportClause>createNode(Syntax.ImportClause, fullStart);
      importClause.isTypeOnly = isTypeOnly;

      if (identifier) {
        // ImportedDefaultBinding:
        //  ImportedBinding
        importClause.name = identifier;
      }

      // If there was no default import or if there is comma token after default import
      // parse namespace or named imports
      if (!importClause.name || parseOptional(Syntax.CommaToken)) {
        importClause.namedBindings = token() === Syntax.AsteriskToken ? parseNamespaceImport() : parseNamedImportsOrExports(Syntax.NamedImports);
      }

      return finishNode(importClause);
    }

    function parseModuleReference() {
      return isExternalModuleReference() ? parseExternalModuleReference() : parseEntityName(/*allowReservedWords*/ false);
    }

    function parseExternalModuleReference() {
      const node = <ExternalModuleReference>createNode(Syntax.ExternalModuleReference);
      parseExpected(Syntax.RequireKeyword);
      parseExpected(Syntax.OpenParenToken);
      node.expression = parseModuleSpecifier();
      parseExpected(Syntax.CloseParenToken);
      return finishNode(node);
    }

    function parseModuleSpecifier(): Expression {
      if (token() === Syntax.StringLiteral) {
        const result = parseLiteralNode();
        result.text = internIdentifier(result.text);
        return result;
      } else {
        // We allow arbitrary expressions here, even though the grammar only allows string
        // literals.  We check to ensure that it is only a string literal later in the grammar
        // check pass.
        return parseExpression();
      }
    }

    function parseNamespaceImport(): NamespaceImport {
      // NameSpaceImport:
      //  * as ImportedBinding
      const namespaceImport = <NamespaceImport>createNode(Syntax.NamespaceImport);
      parseExpected(Syntax.AsteriskToken);
      parseExpected(Syntax.AsKeyword);
      namespaceImport.name = parseIdentifier();
      return finishNode(namespaceImport);
    }

    function parseNamedImportsOrExports(kind: Syntax.NamedImports): NamedImports;
    function parseNamedImportsOrExports(kind: Syntax.NamedExports): NamedExports;
    function parseNamedImportsOrExports(kind: Syntax): NamedImportsOrExports {
      const node = <NamedImports | NamedExports>createNode(kind);

      // NamedImports:
      //  { }
      //  { ImportsList }
      //  { ImportsList, }

      // ImportsList:
      //  ImportSpecifier
      //  ImportsList, ImportSpecifier
      node.elements = <NodeArray<ImportSpecifier> | NodeArray<ExportSpecifier>>(
        parseBracketedList(ParsingContext.ImportOrExportSpecifiers, kind === Syntax.NamedImports ? parseImportSpecifier : parseExportSpecifier, Syntax.OpenBraceToken, Syntax.CloseBraceToken)
      );
      return finishNode(node);
    }

    function parseExportSpecifier() {
      return parseImportOrExportSpecifier(Syntax.ExportSpecifier);
    }

    function parseImportSpecifier() {
      return parseImportOrExportSpecifier(Syntax.ImportSpecifier);
    }

    function parseImportOrExportSpecifier(kind: Syntax): ImportOrExportSpecifier {
      const node = <ImportSpecifier>createNode(kind);
      // ImportSpecifier:
      //   BindingIdentifier
      //   IdentifierName as BindingIdentifier
      // ExportSpecifier:
      //   IdentifierName
      //   IdentifierName as IdentifierName
      let checkIdentifierIsKeyword = isKeyword(token()) && !isIdentifier();
      let checkIdentifierStart = scanner.getTokenPos();
      let checkIdentifierEnd = scanner.getTextPos();
      const identifierName = parseIdentifierName();
      if (token() === Syntax.AsKeyword) {
        node.propertyName = identifierName;
        parseExpected(Syntax.AsKeyword);
        checkIdentifierIsKeyword = isKeyword(token()) && !isIdentifier();
        checkIdentifierStart = scanner.getTokenPos();
        checkIdentifierEnd = scanner.getTextPos();
        node.name = parseIdentifierName();
      } else {
        node.name = identifierName;
      }
      if (kind === Syntax.ImportSpecifier && checkIdentifierIsKeyword) {
        parseErrorAt(checkIdentifierStart, checkIdentifierEnd, Diagnostics.Identifier_expected);
      }
      return finishNode(node);
    }

    function parseNamespaceExport(pos: number): NamespaceExport {
      const node = <NamespaceExport>createNode(Syntax.NamespaceExport, pos);
      node.name = parseIdentifier();
      return finishNode(node);
    }

    function parseExportDeclaration(node: ExportDeclaration): ExportDeclaration {
      node.kind = Syntax.ExportDeclaration;
      node.isTypeOnly = parseOptional(Syntax.TypeKeyword);
      const namespaceExportPos = scanner.getStartPos();
      if (parseOptional(Syntax.AsteriskToken)) {
        if (parseOptional(Syntax.AsKeyword)) {
          node.exportClause = parseNamespaceExport(namespaceExportPos);
        }
        parseExpected(Syntax.FromKeyword);
        node.moduleSpecifier = parseModuleSpecifier();
      } else {
        node.exportClause = parseNamedImportsOrExports(Syntax.NamedExports);
        // It is not uncommon to accidentally omit the 'from' keyword. Additionally, in editing scenarios,
        // the 'from' keyword can be parsed as a named export when the export clause is unterminated (i.e. `export { from "moduleName";`)
        // If we don't have a 'from' keyword, see if we have a string literal such that ASI won't take effect.
        if (token() === Syntax.FromKeyword || (token() === Syntax.StringLiteral && !scanner.hasPrecedingLineBreak())) {
          parseExpected(Syntax.FromKeyword);
          node.moduleSpecifier = parseModuleSpecifier();
        }
      }
      parseSemicolon();
      return finishNode(node);
    }

    function parseExportAssignment(node: ExportAssignment): ExportAssignment {
      node.kind = Syntax.ExportAssignment;
      if (parseOptional(Syntax.EqualsToken)) {
        node.isExportEquals = true;
      } else {
        parseExpected(Syntax.DefaultKeyword);
      }
      node.expression = parseAssignmentExpressionOrHigher();
      parseSemicolon();
      return finishNode(node);
    }

    function setExternalModuleIndicator(sourceFile: SourceFile) {
      // Try to use the first top-level import/export when available, then
      // fall back to looking for an 'import.meta' somewhere in the tree if necessary.
      sourceFile.externalModuleIndicator = forEach(sourceFile.statements, isAnExternalModuleIndicatorNode) || getImportMetaIfNecessary(sourceFile);
    }

    function isAnExternalModuleIndicatorNode(node: Node) {
      return hasModifierOfKind(node, Syntax.ExportKeyword) ||
        (node.kind === Syntax.ImportEqualsDeclaration && (<ImportEqualsDeclaration>node).moduleReference.kind === Syntax.ExternalModuleReference) ||
        node.kind === Syntax.ImportDeclaration ||
        node.kind === Syntax.ExportAssignment ||
        node.kind === Syntax.ExportDeclaration
        ? node
        : undefined;
    }

    function getImportMetaIfNecessary(sourceFile: SourceFile) {
      return sourceFile.flags & NodeFlags.PossiblyContainsImportMeta ? walkTreeForExternalModuleIndicators(sourceFile) : undefined;
    }

    function walkTreeForExternalModuleIndicators(node: Node): Node | undefined {
      return isImportMeta(node) ? node : forEachChild(node, walkTreeForExternalModuleIndicators);
    }

    function hasModifierOfKind(node: Node, kind: Syntax) {
      return some(node.modifiers, (m) => m.kind === kind);
    }

    function isImportMeta(node: Node): boolean {
      return isMetaProperty(node) && node.keywordToken === Syntax.ImportKeyword && node.name.escapedText === 'meta';
    }

    const enum ParsingContext {
      SourceElements, // Elements in source file
      BlockStatements, // Statements in block
      SwitchClauses, // Clauses in switch statement
      SwitchClauseStatements, // Statements in switch clause
      TypeMembers, // Members in interface or type literal
      ClassMembers, // Members in class declaration
      EnumMembers, // Members in enum declaration
      HeritageClauseElement, // Elements in a heritage clause
      VariableDeclarations, // Variable declarations in variable statement
      ObjectBindingElements, // Binding elements in object binding list
      ArrayBindingElements, // Binding elements in array binding list
      ArgumentExpressions, // Expressions in argument list
      ObjectLiteralMembers, // Members in object literal
      JsxAttributes, // Attributes in jsx element
      JsxChildren, // Things between opening and closing JSX tags
      ArrayLiteralMembers, // Members in array literal
      Parameters, // Parameters in parameter list
      JSDocParameters, // JSDoc parameters in parameter list of JSDoc function type
      RestProperties, // Property names in a rest type list
      TypeParameters, // Type parameters in type parameter list
      TypeArguments, // Type arguments in type argument list
      TupleElementTypes, // Element types in tuple element type list
      HeritageClauses, // Heritage clauses for a class or interface declaration.
      ImportOrExportSpecifiers, // Named import clause's import specifier list
      Count, // Number of parsing contexts
    }

    const enum Tristate {
      False,
      True,
      Unknown,
    }

    export namespace JSDocParser {
      export function parseJSDocTypeExpressionForTests(
        content: string,
        start: number | undefined,
        length: number | undefined
      ): { jsDocTypeExpression: JSDocTypeExpression; diagnostics: Diagnostic[] } | undefined {
        initializeState(content, ScriptTarget.ESNext, undefined, ScriptKind.JS);
        sourceFile = createSourceFile('file.js', ScriptTarget.ESNext, ScriptKind.JS, false);
        scanner.setText(content, start, length);
        currentToken = scanner.scan();
        const jsDocTypeExpression = parseJSDocTypeExpression();
        const diagnostics = parseDiagnostics;
        clearState();

        return jsDocTypeExpression ? { jsDocTypeExpression, diagnostics } : undefined;
      }

      export function parseJSDocTypeExpression(mayOmitBraces?: boolean): JSDocTypeExpression {
        const result = <JSDocTypeExpression>createNode(Syntax.JSDocTypeExpression);
        const hasBrace = (mayOmitBraces ? parseOptional : parseExpected)(Syntax.OpenBraceToken);
        result.type = doInsideOfContext(NodeFlags.JSDoc, parseJSDocType);
        if (!mayOmitBraces || hasBrace) {
          parseExpectedJSDoc(Syntax.CloseBraceToken);
        }
        fixupParentReferences(result);
        return finishNode(result);
      }

      export function parseIsolatedJSDocComment(content: string, start: number | undefined, length: number | undefined): { jsDoc: JSDoc; diagnostics: Diagnostic[] } | undefined {
        initializeState(content, ScriptTarget.ESNext, undefined, ScriptKind.JS);
        sourceFile = <SourceFile>{ languageVariant: LanguageVariant.TS, text: content };
        const jsDoc = doInsideOfContext(NodeFlags.JSDoc, () => parseJSDocCommentWorker(start, length));
        const diagnostics = parseDiagnostics;
        clearState();
        return jsDoc ? { jsDoc, diagnostics } : undefined;
      }

      export function parseJSDocComment(parent: HasJSDoc, start: number, length: number): JSDoc | undefined {
        const saveToken = currentToken;
        const saveParseDiagnosticsLength = parseDiagnostics.length;
        const saveParseErrorBeforeNextFinishedNode = parseErrorBeforeNextFinishedNode;
        const comment = doInsideOfContext(NodeFlags.JSDoc, () => parseJSDocCommentWorker(start, length));
        if (comment) {
          comment.parent = parent;
        }
        if (contextFlags & NodeFlags.JavaScriptFile) {
          if (!sourceFile.jsDocDiagnostics) {
            sourceFile.jsDocDiagnostics = [];
          }
          sourceFile.jsDocDiagnostics.push(...parseDiagnostics);
        }
        currentToken = saveToken;
        parseDiagnostics.length = saveParseDiagnosticsLength;
        parseErrorBeforeNextFinishedNode = saveParseErrorBeforeNextFinishedNode;
        return comment;
      }

      const enum JSDocState {
        BeginningOfLine,
        SawAsterisk,
        SavingComments,
        SavingBackticks,
      }

      const enum PropertyLikeParse {
        Property = 1 << 0,
        Parameter = 1 << 1,
        CallbackParameter = 1 << 2,
      }

      function parseJSDocCommentWorker(start = 0, length: number | undefined): JSDoc | undefined {
        const content = sourceText;
        const end = length === undefined ? content.length : start + length;
        length = end - start;

        assert(start >= 0);
        assert(start <= end);
        assert(end <= content.length);

        if (!Scanner.isJSDocLike(content, start)) {
          return;
        }

        let tags: JSDocTag[];
        let tagsPos: number;
        let tagsEnd: number;
        const comments: string[] = [];

        return scanner.scanRange(start + 3, length - 5, () => {
          let state = JSDocState.SawAsterisk;
          let margin: number | undefined;
          let indent = start - Math.max(content.lastIndexOf('\n', start), 0) + 4;
          function pushComment(text: string) {
            if (!margin) {
              margin = indent;
            }
            comments.push(text);
            indent += text.length;
          }

          nextTokenJSDoc();
          while (parseOptionalJsdoc(Syntax.WhitespaceTrivia));
          if (parseOptionalJsdoc(Syntax.NewLineTrivia)) {
            state = JSDocState.BeginningOfLine;
            indent = 0;
          }
          loop: while (true) {
            switch (token()) {
              case Syntax.AtToken:
                if (state === JSDocState.BeginningOfLine || state === JSDocState.SawAsterisk) {
                  removeTrailingWhitespace(comments);
                  addTag(parseTag(indent));
                  state = JSDocState.BeginningOfLine;
                  margin = undefined;
                } else {
                  pushComment(scanner.getTokenText());
                }
                break;
              case Syntax.NewLineTrivia:
                comments.push(scanner.getTokenText());
                state = JSDocState.BeginningOfLine;
                indent = 0;
                break;
              case Syntax.AsteriskToken:
                const asterisk = scanner.getTokenText();
                if (state === JSDocState.SawAsterisk || state === JSDocState.SavingComments) {
                  state = JSDocState.SavingComments;
                  pushComment(asterisk);
                } else {
                  // Ignore the first asterisk on a line
                  state = JSDocState.SawAsterisk;
                  indent += asterisk.length;
                }
                break;
              case Syntax.WhitespaceTrivia:
                // only collect whitespace if we're already saving comments or have just crossed the comment indent margin
                const whitespace = scanner.getTokenText();
                if (state === JSDocState.SavingComments) {
                  comments.push(whitespace);
                } else if (margin !== undefined && indent + whitespace.length > margin) {
                  comments.push(whitespace.slice(margin - indent - 1));
                }
                indent += whitespace.length;
                break;
              case Syntax.EndOfFileToken:
                break loop;
              default:
                // Anything else is doc comment text. We just save it. Because it
                // wasn't a tag, we can no longer parse a tag on this line until we hit the next
                // line break.
                state = JSDocState.SavingComments;
                pushComment(scanner.getTokenText());
                break;
            }
            nextTokenJSDoc();
          }
          removeLeadingNewlines(comments);
          removeTrailingWhitespace(comments);
          return createJSDocComment();
        });

        function removeLeadingNewlines(comments: string[]) {
          while (comments.length && (comments[0] === '\n' || comments[0] === '\r')) {
            comments.shift();
          }
        }

        function removeTrailingWhitespace(comments: string[]) {
          while (comments.length && comments[comments.length - 1].trim() === '') {
            comments.pop();
          }
        }

        function createJSDocComment(): JSDoc {
          const result = <JSDoc>createNode(Syntax.JSDocComment, start);
          result.tags = tags && NodeArray.create(tags, tagsPos, tagsEnd);
          result.comment = comments.length ? comments.join('') : undefined;
          return finishNode(result, end);
        }

        function isNextNonwhitespaceTokenEndOfFile(): boolean {
          // We must use infinite lookahead, as there could be any number of newlines :(
          while (true) {
            nextTokenJSDoc();
            if (token() === Syntax.EndOfFileToken) {
              return true;
            }
            if (!(token() === Syntax.WhitespaceTrivia || token() === Syntax.NewLineTrivia)) {
              return false;
            }
          }
        }

        function skipWhitespace(): void {
          if (token() === Syntax.WhitespaceTrivia || token() === Syntax.NewLineTrivia) {
            if (lookAhead(isNextNonwhitespaceTokenEndOfFile)) {
              return; // Don't skip whitespace prior to EoF (or end of comment) - that shouldn't be included in any node's range
            }
          }
          while (token() === Syntax.WhitespaceTrivia || token() === Syntax.NewLineTrivia) {
            nextTokenJSDoc();
          }
        }

        function skipWhitespaceOrAsterisk(): string {
          if (token() === Syntax.WhitespaceTrivia || token() === Syntax.NewLineTrivia) {
            if (lookAhead(isNextNonwhitespaceTokenEndOfFile)) {
              return ''; // Don't skip whitespace prior to EoF (or end of comment) - that shouldn't be included in any node's range
            }
          }

          let precedingLineBreak = scanner.hasPrecedingLineBreak();
          let seenLineBreak = false;
          let indentText = '';
          while ((precedingLineBreak && token() === Syntax.AsteriskToken) || token() === Syntax.WhitespaceTrivia || token() === Syntax.NewLineTrivia) {
            indentText += scanner.getTokenText();
            if (token() === Syntax.NewLineTrivia) {
              precedingLineBreak = true;
              seenLineBreak = true;
              indentText = '';
            } else if (token() === Syntax.AsteriskToken) {
              precedingLineBreak = false;
            }
            nextTokenJSDoc();
          }
          return seenLineBreak ? indentText : '';
        }

        function parseTag(margin: number) {
          assert(token() === Syntax.AtToken);
          const start = scanner.getTokenPos();
          nextTokenJSDoc();

          const tagName = parseJSDocIdentifierName(/*m*/ undefined);
          const indentText = skipWhitespaceOrAsterisk();

          let tag: JSDocTag | undefined;
          switch (tagName.escapedText) {
            case 'author':
              tag = parseAuthorTag(start, tagName, margin);
              break;
            case 'implements':
              tag = parseImplementsTag(start, tagName);
              break;
            case 'augments':
            case 'extends':
              tag = parseAugmentsTag(start, tagName);
              break;
            case 'class':
            case 'constructor':
              tag = parseSimpleTag(start, Syntax.JSDocClassTag, tagName);
              break;
            case 'public':
              tag = parseSimpleTag(start, Syntax.JSDocPublicTag, tagName);
              break;
            case 'private':
              tag = parseSimpleTag(start, Syntax.JSDocPrivateTag, tagName);
              break;
            case 'protected':
              tag = parseSimpleTag(start, Syntax.JSDocProtectedTag, tagName);
              break;
            case 'readonly':
              tag = parseSimpleTag(start, Syntax.JSDocReadonlyTag, tagName);
              break;
            case 'this':
              tag = parseThisTag(start, tagName);
              break;
            case 'enum':
              tag = parseEnumTag(start, tagName);
              break;
            case 'arg':
            case 'argument':
            case 'param':
              return parseParameterOrPropertyTag(start, tagName, PropertyLikeParse.Parameter, margin);
            case 'return':
            case 'returns':
              tag = parseReturnTag(start, tagName);
              break;
            case 'template':
              tag = parseTemplateTag(start, tagName);
              break;
            case 'type':
              tag = parseTypeTag(start, tagName);
              break;
            case 'typedef':
              tag = parseTypedefTag(start, tagName, margin);
              break;
            case 'callback':
              tag = parseCallbackTag(start, tagName, margin);
              break;
            default:
              tag = parseUnknownTag(start, tagName);
              break;
          }

          if (!tag.comment) {
            if (!indentText) {
              margin += tag.end - tag.pos;
            }
            tag.comment = parseTagComments(margin, indentText.slice(margin));
          }
          return tag;
        }

        function parseTagComments(indent: number, initialMargin?: string): string | undefined {
          const comments: string[] = [];
          let state = JSDocState.BeginningOfLine;
          let margin: number | undefined;
          function pushComment(text: string) {
            if (!margin) {
              margin = indent;
            }
            comments.push(text);
            indent += text.length;
          }
          if (initialMargin !== undefined) {
            // jump straight to saving comments if there is some initial indentation
            if (initialMargin !== '') {
              pushComment(initialMargin);
            }
            state = JSDocState.SawAsterisk;
          }
          let tok = token() as JSDocSyntax;
          loop: while (true) {
            switch (tok) {
              case Syntax.NewLineTrivia:
                if (state >= JSDocState.SawAsterisk) {
                  state = JSDocState.BeginningOfLine;
                  // don't use pushComment here because we want to keep the margin unchanged
                  comments.push(scanner.getTokenText());
                }
                indent = 0;
                break;
              case Syntax.AtToken:
                if (state === JSDocState.SavingBackticks) {
                  comments.push(scanner.getTokenText());
                  break;
                }
                scanner.setTextPos(scanner.getTextPos() - 1);
              // falls through
              case Syntax.EndOfFileToken:
                // Done
                break loop;
              case Syntax.WhitespaceTrivia:
                if (state === JSDocState.SavingComments || state === JSDocState.SavingBackticks) {
                  pushComment(scanner.getTokenText());
                } else {
                  const whitespace = scanner.getTokenText();
                  // if the whitespace crosses the margin, take only the whitespace that passes the margin
                  if (margin !== undefined && indent + whitespace.length > margin) {
                    comments.push(whitespace.slice(margin - indent));
                  }
                  indent += whitespace.length;
                }
                break;
              case Syntax.OpenBraceToken:
                state = JSDocState.SavingComments;
                if (lookAhead(() => nextTokenJSDoc() === Syntax.AtToken && Token.identifierOrKeyword(nextTokenJSDoc()) && scanner.getTokenText() === 'link')) {
                  pushComment(scanner.getTokenText());
                  nextTokenJSDoc();
                  pushComment(scanner.getTokenText());
                  nextTokenJSDoc();
                }
                pushComment(scanner.getTokenText());
                break;
              case Syntax.BacktickToken:
                if (state === JSDocState.SavingBackticks) {
                  state = JSDocState.SavingComments;
                } else {
                  state = JSDocState.SavingBackticks;
                }
                pushComment(scanner.getTokenText());
                break;
              case Syntax.AsteriskToken:
                if (state === JSDocState.BeginningOfLine) {
                  // leading asterisks start recording on the *next* (non-whitespace) token
                  state = JSDocState.SawAsterisk;
                  indent += 1;
                  break;
                }
              // record the * as a comment
              // falls through
              default:
                if (state !== JSDocState.SavingBackticks) {
                  state = JSDocState.SavingComments; // leading identifiers start recording as well
                }
                pushComment(scanner.getTokenText());
                break;
            }
            tok = nextTokenJSDoc();
          }

          removeLeadingNewlines(comments);
          removeTrailingWhitespace(comments);
          return comments.length === 0 ? undefined : comments.join('');
        }

        function parseUnknownTag(start: number, tagName: Identifier) {
          const result = <JSDocTag>createNode(Syntax.JSDocTag, start);
          result.tagName = tagName;
          return finishNode(result);
        }

        function addTag(tag: JSDocTag | undefined): void {
          if (!tag) {
            return;
          }
          if (!tags) {
            tags = [tag];
            tagsPos = tag.pos;
          } else {
            tags.push(tag);
          }
          tagsEnd = tag.end;
        }

        function tryParseTypeExpression(): JSDocTypeExpression | undefined {
          skipWhitespaceOrAsterisk();
          return token() === Syntax.OpenBraceToken ? parseJSDocTypeExpression() : undefined;
        }

        function parseBracketNameInPropertyAndParamTag(): { name: EntityName; isBracketed: boolean } {
          // Looking for something like '[foo]', 'foo', '[foo.bar]' or 'foo.bar'
          const isBracketed = parseOptionalJsdoc(Syntax.OpenBracketToken);
          if (isBracketed) {
            skipWhitespace();
          }
          // a markdown-quoted name: `arg` is not legal jsdoc, but occurs in the wild
          const isBackquoted = parseOptionalJsdoc(Syntax.BacktickToken);
          const name = parseJSDocEntityName();
          if (isBackquoted) {
            parseExpectedTokenJSDoc(Syntax.BacktickToken);
          }
          if (isBracketed) {
            skipWhitespace();
            // May have an optional default, e.g. '[foo = 42]'
            if (parseOptionalToken(Syntax.EqualsToken)) {
              parseExpression();
            }

            parseExpected(Syntax.CloseBracketToken);
          }

          return { name, isBracketed };
        }

        function isObjectOrObjectArrayTypeReference(node: TypeNode): boolean {
          switch (node.kind) {
            case Syntax.ObjectKeyword:
              return true;
            case Syntax.ArrayType:
              return isObjectOrObjectArrayTypeReference((node as ArrayTypeNode).elementType);
            default:
              return TypeReferenceNode.kind(node) && qnr.isIdentifier(node.typeName) && node.typeName.escapedText === 'Object' && !node.typeArguments;
          }
        }

        function parseParameterOrPropertyTag(start: number, tagName: Identifier, target: PropertyLikeParse, indent: number): JSDocParameterTag | JSDocPropertyTag {
          let typeExpression = tryParseTypeExpression();
          let isNameFirst = !typeExpression;
          skipWhitespaceOrAsterisk();

          const { name, isBracketed } = parseBracketNameInPropertyAndParamTag();
          skipWhitespace();

          if (isNameFirst) {
            typeExpression = tryParseTypeExpression();
          }

          const result = target === PropertyLikeParse.Property ? <JSDocPropertyTag>createNode(Syntax.JSDocPropertyTag, start) : <JSDocParameterTag>createNode(Syntax.JSDocParameterTag, start);
          const comment = parseTagComments(indent + scanner.getStartPos() - start);
          const nestedTypeLiteral = target !== PropertyLikeParse.CallbackParameter && parseNestedTypeLiteral(typeExpression, name, target, indent);
          if (nestedTypeLiteral) {
            typeExpression = nestedTypeLiteral;
            isNameFirst = true;
          }
          result.tagName = tagName;
          result.typeExpression = typeExpression;
          result.name = name;
          result.isNameFirst = isNameFirst;
          result.isBracketed = isBracketed;
          result.comment = comment;
          return finishNode(result);
        }

        function parseNestedTypeLiteral(typeExpression: JSDocTypeExpression | undefined, name: EntityName, target: PropertyLikeParse, indent: number) {
          if (typeExpression && isObjectOrObjectArrayTypeReference(typeExpression.type)) {
            const typeLiteralExpression = <JSDocTypeExpression>createNode(Syntax.JSDocTypeExpression, scanner.getTokenPos());
            let child: JSDocPropertyLikeTag | JSDocTypeTag | false;
            let jsdocTypeLiteral: JSDocTypeLiteral;
            const start = scanner.getStartPos();
            let children: JSDocPropertyLikeTag[] | undefined;
            while ((child = tryParse(() => parseChildParameterOrPropertyTag(target, indent, name)))) {
              if (child.kind === Syntax.JSDocParameterTag || child.kind === Syntax.JSDocPropertyTag) {
                children = append(children, child);
              }
            }
            if (children) {
              jsdocTypeLiteral = <JSDocTypeLiteral>createNode(Syntax.JSDocTypeLiteral, start);
              jsdocTypeLiteral.jsDocPropertyTags = children;
              if (typeExpression.type.kind === Syntax.ArrayType) {
                jsdocTypeLiteral.isArrayType = true;
              }
              typeLiteralExpression.type = finishNode(jsdocTypeLiteral);
              return finishNode(typeLiteralExpression);
            }
          }
          return;
        }

        function parseReturnTag(start: number, tagName: Identifier): JSDocReturnTag {
          if (some(tags, isJSDocReturnTag)) {
            parseErrorAt(tagName.pos, scanner.getTokenPos(), Diagnostics._0_tag_already_specified, tagName.escapedText);
          }

          const result = <JSDocReturnTag>createNode(Syntax.JSDocReturnTag, start);
          result.tagName = tagName;
          result.typeExpression = tryParseTypeExpression();
          return finishNode(result);
        }

        function parseTypeTag(start: number, tagName: Identifier): JSDocTypeTag {
          if (some(tags, isJSDocTypeTag)) {
            parseErrorAt(tagName.pos, scanner.getTokenPos(), Diagnostics._0_tag_already_specified, tagName.escapedText);
          }

          const result = <JSDocTypeTag>createNode(Syntax.JSDocTypeTag, start);
          result.tagName = tagName;
          result.typeExpression = parseJSDocTypeExpression(/*mayOmitBraces*/ true);
          return finishNode(result);
        }

        function parseAuthorTag(start: number, tagName: Identifier, indent: number): JSDocAuthorTag {
          const result = <JSDocAuthorTag>createNode(Syntax.JSDocAuthorTag, start);
          result.tagName = tagName;

          const authorInfoWithEmail = tryParse(() => tryParseAuthorNameAndEmail());
          if (!authorInfoWithEmail) {
            return finishNode(result);
          }

          result.comment = authorInfoWithEmail;

          if (lookAhead(() => nextToken() !== Syntax.NewLineTrivia)) {
            const comment = parseTagComments(indent);
            if (comment) {
              result.comment += comment;
            }
          }

          return finishNode(result);
        }

        function tryParseAuthorNameAndEmail(): string | undefined {
          const comments: string[] = [];
          let seenLessThan = false;
          let seenGreaterThan = false;
          let token = scanner.getToken();

          loop: while (true) {
            switch (token) {
              case Syntax.Identifier:
              case Syntax.WhitespaceTrivia:
              case Syntax.DotToken:
              case Syntax.AtToken:
                comments.push(scanner.getTokenText());
                break;
              case Syntax.LessThanToken:
                if (seenLessThan || seenGreaterThan) {
                  return;
                }
                seenLessThan = true;
                comments.push(scanner.getTokenText());
                break;
              case Syntax.GreaterThanToken:
                if (!seenLessThan || seenGreaterThan) {
                  return;
                }
                seenGreaterThan = true;
                comments.push(scanner.getTokenText());
                scanner.setTextPos(scanner.getTokenPos() + 1);
                break loop;
              case Syntax.NewLineTrivia:
              case Syntax.EndOfFileToken:
                break loop;
            }

            token = nextTokenJSDoc();
          }

          if (seenLessThan && seenGreaterThan) {
            return comments.length === 0 ? undefined : comments.join('');
          }
          return;
        }

        function parseImplementsTag(start: number, tagName: Identifier): JSDocImplementsTag {
          const result = <JSDocImplementsTag>createNode(Syntax.JSDocImplementsTag, start);
          result.tagName = tagName;
          result.class = parseExpressionWithTypeArgumentsForAugments();
          return finishNode(result);
        }

        function parseAugmentsTag(start: number, tagName: Identifier): JSDocAugmentsTag {
          const result = <JSDocAugmentsTag>createNode(Syntax.JSDocAugmentsTag, start);
          result.tagName = tagName;
          result.class = parseExpressionWithTypeArgumentsForAugments();
          return finishNode(result);
        }

        function parseExpressionWithTypeArgumentsForAugments(): ExpressionWithTypeArguments & {
          expression: Identifier | PropertyAccessEntityNameExpression;
        } {
          const usedBrace = parseOptional(Syntax.OpenBraceToken);
          const node = createNode(Syntax.ExpressionWithTypeArguments) as ExpressionWithTypeArguments & {
            expression: Identifier | PropertyAccessEntityNameExpression;
          };
          node.expression = parsePropertyAccessEntityNameExpression();
          node.typeArguments = tryParseTypeArguments();
          const res = finishNode(node);
          if (usedBrace) {
            parseExpected(Syntax.CloseBraceToken);
          }
          return res;
        }

        function parsePropertyAccessEntityNameExpression() {
          let node: Identifier | PropertyAccessEntityNameExpression = parseJSDocIdentifierName();
          while (parseOptional(Syntax.DotToken)) {
            const prop: PropertyAccessEntityNameExpression = createNode(Syntax.PropertyAccessExpression, node.pos) as PropertyAccessEntityNameExpression;
            prop.expression = node;
            prop.name = parseJSDocIdentifierName();
            node = finishNode(prop);
          }
          return node;
        }

        function parseSimpleTag(start: number, kind: Syntax, tagName: Identifier): JSDocTag {
          const tag = <JSDocTag>createNode(kind, start);
          tag.tagName = tagName;
          return finishNode(tag);
        }

        function parseThisTag(start: number, tagName: Identifier): JSDocThisTag {
          const tag = <JSDocThisTag>createNode(Syntax.JSDocThisTag, start);
          tag.tagName = tagName;
          tag.typeExpression = parseJSDocTypeExpression(/*mayOmitBraces*/ true);
          skipWhitespace();
          return finishNode(tag);
        }

        function parseEnumTag(start: number, tagName: Identifier): JSDocEnumTag {
          const tag = <JSDocEnumTag>createNode(Syntax.JSDocEnumTag, start);
          tag.tagName = tagName;
          tag.typeExpression = parseJSDocTypeExpression(/*mayOmitBraces*/ true);
          skipWhitespace();
          return finishNode(tag);
        }

        function parseTypedefTag(start: number, tagName: Identifier, indent: number): JSDocTypedefTag {
          const typeExpression = tryParseTypeExpression();
          skipWhitespaceOrAsterisk();

          const typedefTag = <JSDocTypedefTag>createNode(Syntax.JSDocTypedefTag, start);
          typedefTag.tagName = tagName;
          typedefTag.fullName = parseJSDocTypeNameWithNamespace();
          typedefTag.name = getJSDocTypeAliasName(typedefTag.fullName);
          skipWhitespace();
          typedefTag.comment = parseTagComments(indent);

          typedefTag.typeExpression = typeExpression;
          let end: number | undefined;
          if (!typeExpression || isObjectOrObjectArrayTypeReference(typeExpression.type)) {
            let child: JSDocTypeTag | JSDocPropertyTag | false;
            let jsdocTypeLiteral: JSDocTypeLiteral | undefined;
            let childTypeTag: JSDocTypeTag | undefined;
            while ((child = tryParse(() => parseChildPropertyTag(indent)))) {
              if (!jsdocTypeLiteral) {
                jsdocTypeLiteral = <JSDocTypeLiteral>createNode(Syntax.JSDocTypeLiteral, start);
              }
              if (child.kind === Syntax.JSDocTypeTag) {
                if (childTypeTag) {
                  parseErrorAtCurrentToken(Diagnostics.A_JSDoc_typedef_comment_may_not_contain_multiple_type_tags);
                  const lastError = lastOrUndefined(parseDiagnostics);
                  if (lastError) {
                    addRelatedInfo(lastError, createDiagnosticForNode(sourceFile, Diagnostics.The_tag_was_first_specified_here));
                  }
                  break;
                } else {
                  childTypeTag = child;
                }
              } else {
                jsdocTypeLiteral.jsDocPropertyTags = append(jsdocTypeLiteral.jsDocPropertyTags as MutableNodeArray<JSDocPropertyTag>, child);
              }
            }
            if (jsdocTypeLiteral) {
              if (typeExpression && typeExpression.type.kind === Syntax.ArrayType) {
                jsdocTypeLiteral.isArrayType = true;
              }
              typedefTag.typeExpression =
                childTypeTag && childTypeTag.typeExpression && !isObjectOrObjectArrayTypeReference(childTypeTag.typeExpression.type) ? childTypeTag.typeExpression : finishNode(jsdocTypeLiteral);
              end = typedefTag.typeExpression.end;
            }
          }

          // Only include the characters between the name end and the next token if a comment was actually parsed out - otherwise it's just whitespace
          return finishNode(typedefTag, end || typedefTag.comment !== undefined ? scanner.getStartPos() : (typedefTag.fullName || typedefTag.typeExpression || typedefTag.tagName).end);
        }

        function parseJSDocTypeNameWithNamespace(nested?: boolean) {
          const pos = scanner.getTokenPos();
          if (!Token.identifierOrKeyword(token())) {
            return;
          }
          const typeNameOrNamespaceName = parseJSDocIdentifierName();
          if (parseOptional(Syntax.DotToken)) {
            const jsDocNamespaceNode = <JSDocNamespaceDeclaration>createNode(Syntax.ModuleDeclaration, pos);
            if (nested) {
              jsDocNamespaceNode.flags |= NodeFlags.NestedNamespace;
            }
            jsDocNamespaceNode.name = typeNameOrNamespaceName;
            jsDocNamespaceNode.body = parseJSDocTypeNameWithNamespace(/*nested*/ true);
            return finishNode(jsDocNamespaceNode);
          }

          if (nested) {
            typeNameOrNamespaceName.isInJSDocNamespace = true;
          }
          return typeNameOrNamespaceName;
        }

        function parseCallbackTag(start: number, tagName: Identifier, indent: number): JSDocCallbackTag {
          const cbTag = createNode(Syntax.JSDocCallbackTag, start) as JSDocCallbackTag;
          cbTag.tagName = tagName;
          cbTag.fullName = parseJSDocTypeNameWithNamespace();
          cbTag.name = getJSDocTypeAliasName(cbTag.fullName);
          skipWhitespace();
          cbTag.comment = parseTagComments(indent);

          let child: JSDocParameterTag | false;
          const jsdocSignature = createNode(Syntax.JSDocSignature, start) as JSDocSignature;
          jsdocSignature.parameters = [];
          while ((child = tryParse(() => parseChildParameterOrPropertyTag(PropertyLikeParse.CallbackParameter, indent) as JSDocParameterTag))) {
            jsdocSignature.parameters = append(jsdocSignature.parameters as MutableNodeArray<JSDocParameterTag>, child);
          }
          const returnTag = tryParse(() => {
            if (parseOptionalJsdoc(Syntax.AtToken)) {
              const tag = parseTag(indent);
              if (tag && tag.kind === Syntax.JSDocReturnTag) {
                return tag as JSDocReturnTag;
              }
            }
            return;
          });
          if (returnTag) {
            jsdocSignature.type = returnTag;
          }
          cbTag.typeExpression = finishNode(jsdocSignature);
          return finishNode(cbTag);
        }

        function getJSDocTypeAliasName(fullName: JSDocNamespaceBody | undefined) {
          if (fullName) {
            let rightNode = fullName;
            while (true) {
              if (qnr.isIdentifier(rightNode) || !rightNode.body) {
                return qnr.isIdentifier(rightNode) ? rightNode : rightNode.name;
              }
              rightNode = rightNode.body;
            }
          }
          return;
        }

        function escapedTextsEqual(a: EntityName, b: EntityName): boolean {
          while (!qnr.isIdentifier(a) || !qnr.isIdentifier(b)) {
            if (!qnr.isIdentifier(a) && !qnr.isIdentifier(b) && a.right.escapedText === b.right.escapedText) {
              a = a.left;
              b = b.left;
            } else {
              return false;
            }
          }
          return a.escapedText === b.escapedText;
        }

        function parseChildPropertyTag(indent: number) {
          return parseChildParameterOrPropertyTag(PropertyLikeParse.Property, indent) as JSDocTypeTag | JSDocPropertyTag | false;
        }

        function parseChildParameterOrPropertyTag(target: PropertyLikeParse, indent: number, name?: EntityName): JSDocTypeTag | JSDocPropertyTag | JSDocParameterTag | false {
          let canParseTag = true;
          let seenAsterisk = false;
          while (true) {
            switch (nextTokenJSDoc()) {
              case Syntax.AtToken:
                if (canParseTag) {
                  const child = tryParseChildTag(target, indent);
                  if (
                    child &&
                    (child.kind === Syntax.JSDocParameterTag || child.kind === Syntax.JSDocPropertyTag) &&
                    target !== PropertyLikeParse.CallbackParameter &&
                    name &&
                    (qnr.isIdentifier(child.name) || !escapedTextsEqual(name, child.name.left))
                  ) {
                    return false;
                  }
                  return child;
                }
                seenAsterisk = false;
                break;
              case Syntax.NewLineTrivia:
                canParseTag = true;
                seenAsterisk = false;
                break;
              case Syntax.AsteriskToken:
                if (seenAsterisk) {
                  canParseTag = false;
                }
                seenAsterisk = true;
                break;
              case Syntax.Identifier:
                canParseTag = false;
                break;
              case Syntax.EndOfFileToken:
                return false;
            }
          }
        }

        function tryParseChildTag(target: PropertyLikeParse, indent: number): JSDocTypeTag | JSDocPropertyTag | JSDocParameterTag | false {
          assert(token() === Syntax.AtToken);
          const start = scanner.getStartPos();
          nextTokenJSDoc();

          const tagName = parseJSDocIdentifierName();
          skipWhitespace();
          let t: PropertyLikeParse;
          switch (tagName.escapedText) {
            case 'type':
              return target === PropertyLikeParse.Property && parseTypeTag(start, tagName);
            case 'prop':
            case 'property':
              t = PropertyLikeParse.Property;
              break;
            case 'arg':
            case 'argument':
            case 'param':
              t = PropertyLikeParse.Parameter | PropertyLikeParse.CallbackParameter;
              break;
            default:
              return false;
          }
          if (!(target & t)) {
            return false;
          }
          return parseParameterOrPropertyTag(start, tagName, target, indent);
        }

        function parseTemplateTag(start: number, tagName: Identifier): JSDocTemplateTag {
          // the template tag looks like '@template {Constraint} T,U,V'
          let constraint: JSDocTypeExpression | undefined;
          if (token() === Syntax.OpenBraceToken) {
            constraint = parseJSDocTypeExpression();
          }

          const typeParameters = [];
          const typeParametersPos = getNodePos();
          do {
            skipWhitespace();
            const typeParameter = <TypeParameterDeclaration>createNode(Syntax.TypeParameter);
            typeParameter.name = parseJSDocIdentifierName(Diagnostics.Unexpected_token_A_type_parameter_name_was_expected_without_curly_braces);
            finishNode(typeParameter);
            skipWhitespaceOrAsterisk();
            typeParameters.push(typeParameter);
          } while (parseOptionalJsdoc(Syntax.CommaToken));

          const result = <JSDocTemplateTag>createNode(Syntax.JSDocTemplateTag, start);
          result.tagName = tagName;
          result.constraint = constraint;
          result.typeParameters = NodeArray.create(typeParameters, typeParametersPos);
          finishNode(result);
          return result;
        }

        function parseOptionalJsdoc(t: JSDocSyntax): boolean {
          if (token() === t) {
            nextTokenJSDoc();
            return true;
          }
          return false;
        }

        function parseJSDocEntityName(): EntityName {
          let entity: EntityName = parseJSDocIdentifierName();
          if (parseOptional(Syntax.OpenBracketToken)) {
            parseExpected(Syntax.CloseBracketToken);
            // Note that y[] is accepted as an entity name, but the postfix brackets are not saved for checking.
            // Technically usejsdoc.org requires them for specifying a property of a type equivalent to Array<{ x: ...}>
            // but it's not worth it to enforce that restriction.
          }
          while (parseOptional(Syntax.DotToken)) {
            const name = parseJSDocIdentifierName();
            if (parseOptional(Syntax.OpenBracketToken)) {
              parseExpected(Syntax.CloseBracketToken);
            }
            entity = createQualifiedName(entity, name);
          }
          return entity;
        }

        function parseJSDocIdentifierName(m?: DiagnosticMessage): Identifier {
          if (!Token.identifierOrKeyword(token())) {
            return createMissingNode<Identifier>(Syntax.Identifier, !m, m || Diagnostics.Identifier_expected);
          }
          identifierCount++;
          const pos = scanner.getTokenPos();
          const end = scanner.getTextPos();
          const result = <Identifier>createNode(Syntax.Identifier, pos);
          if (token() !== Syntax.Identifier) {
            result.originalKeywordKind = token();
          }
          result.escapedText = Scanner.escUnderscores(internIdentifier(scanner.getTokenValue()));
          finishNode(result, end);
          nextTokenJSDoc();
          return result;
        }
      }
    }
  }

  namespace IncrementalParser {
    export function updateSourceFile(sourceFile: SourceFile, newText: string, textChangeRange: TextChangeRange, aggressiveChecks: boolean): SourceFile {
      aggressiveChecks = aggressiveChecks || Debug.shouldAssert(AssertionLevel.Aggressive);

      checkChangeRange(sourceFile, newText, textChangeRange, aggressiveChecks);
      if (textChangeRangeIsUnchanged(textChangeRange)) {
        // if the text didn't change, then we can just return our current source file as-is.
        return sourceFile;
      }

      if (sourceFile.statements.length === 0) {
        // If we don't have any statements in the current source file, then there's no real
        // way to incrementally parse.  So just do a full parse instead.
        return Parser.parseSourceFile(sourceFile.fileName, newText, sourceFile.languageVersion, /*syntaxCursor*/ undefined, /*setParentNodes*/ true, sourceFile.scriptKind);
      }

      // Make sure we're not trying to incrementally update a source file more than once.  Once
      // we do an update the original source file is considered unusable from that point onwards.
      //
      // This is because we do incremental parsing in-place.  i.e. we take nodes from the old
      // tree and give them new positions and parents.  From that point on, trusting the old
      // tree at all is not possible as far too much of it may violate invariants.
      const incrementalSourceFile = <IncrementalNode>(<Node>sourceFile);
      assert(!incrementalSourceFile.hasBeenIncrementallyParsed);
      incrementalSourceFile.hasBeenIncrementallyParsed = true;
      const oldText = sourceFile.text;
      const syntaxCursor = createSyntaxCursor(sourceFile);

      // Make the actual change larger so that we know to reparse anything whose lookahead
      // might have intersected the change.
      const changeRange = extendToAffectedRange(sourceFile, textChangeRange);
      checkChangeRange(sourceFile, newText, changeRange, aggressiveChecks);

      // Ensure that extending the affected range only moved the start of the change range
      // earlier in the file.
      assert(changeRange.span.start <= textChangeRange.span.start);
      assert(textSpanEnd(changeRange.span) === textSpanEnd(textChangeRange.span));
      assert(textSpanEnd(textChangeRangeNewSpan(changeRange)) === textSpanEnd(textChangeRangeNewSpan(textChangeRange)));

      // The is the amount the nodes after the edit range need to be adjusted.  It can be
      // positive (if the edit added characters), negative (if the edit deleted characters)
      // or zero (if this was a pure overwrite with nothing added/removed).
      const delta = textChangeRangeNewSpan(changeRange).length - changeRange.span.length;

      // If we added or removed characters during the edit, then we need to go and adjust all
      // the nodes after the edit.  Those nodes may move forward (if we inserted chars) or they
      // may move backward (if we deleted chars).
      //
      // Doing this helps us out in two ways.  First, it means that any nodes/tokens we want
      // to reuse are already at the appropriate position in the new text.  That way when we
      // reuse them, we don't have to figure out if they need to be adjusted.  Second, it makes
      // it very easy to determine if we can reuse a node.  If the node's position is at where
      // we are in the text, then we can reuse it.  Otherwise we can't.  If the node's position
      // is ahead of us, then we'll need to rescan tokens.  If the node's position is behind
      // us, then we'll need to skip it or crumble it as appropriate
      //
      // We will also adjust the positions of nodes that intersect the change range as well.
      // By doing this, we ensure that all the positions in the old tree are consistent, not
      // just the positions of nodes entirely before/after the change range.  By being
      // consistent, we can then easily map from positions to nodes in the old tree easily.
      //
      // Also, mark any syntax elements that intersect the changed span.  We know, up front,
      // that we cannot reuse these elements.
      updateTokenPositionsAndMarkElements(
        incrementalSourceFile,
        changeRange.span.start,
        textSpanEnd(changeRange.span),
        textSpanEnd(textChangeRangeNewSpan(changeRange)),
        delta,
        oldText,
        newText,
        aggressiveChecks
      );

      // Now that we've set up our internal incremental state just proceed and parse the
      // source file in the normal fashion.  When possible the parser will retrieve and
      // reuse nodes from the old tree.
      //
      // Note: passing in 'true' for setNodeParents is very important.  When incrementally
      // parsing, we will be reusing nodes from the old tree, and placing it into new
      // parents.  If we don't set the parents now, we'll end up with an observably
      // inconsistent tree.  Setting the parents on the new tree should be very fast.  We
      // will immediately bail out of walking any subtrees when we can see that their parents
      // are already correct.
      const result = Parser.parseSourceFile(sourceFile.fileName, newText, sourceFile.languageVersion, syntaxCursor, /*setParentNodes*/ true, sourceFile.scriptKind);
      result.commentDirectives = getNewCommentDirectives(
        sourceFile.commentDirectives,
        result.commentDirectives,
        changeRange.span.start,
        textSpanEnd(changeRange.span),
        delta,
        oldText,
        newText,
        aggressiveChecks
      );
      return result;
    }

    function getNewCommentDirectives(
      oldDirectives: CommentDirective[] | undefined,
      newDirectives: CommentDirective[] | undefined,
      changeStart: number,
      changeRangeOldEnd: number,
      delta: number,
      oldText: string,
      newText: string,
      aggressiveChecks: boolean
    ): CommentDirective[] | undefined {
      if (!oldDirectives) return newDirectives;
      let commentDirectives: CommentDirective[] | undefined;
      let addedNewlyScannedDirectives = false;
      for (const directive of oldDirectives) {
        const { range, type } = directive;
        // Range before the change
        if (range.end < changeStart) {
          commentDirectives = append(commentDirectives, directive);
        } else if (range.pos > changeRangeOldEnd) {
          addNewlyScannedDirectives();
          // Node is entirely past the change range.  We need to move both its pos and
          // end, forward or backward appropriately.
          const updatedDirective: CommentDirective = {
            range: { pos: range.pos + delta, end: range.end + delta },
            type,
          };
          commentDirectives = append(commentDirectives, updatedDirective);
          if (aggressiveChecks) {
            assert(oldText.substring(range.pos, range.end) === newText.substring(updatedDirective.range.pos, updatedDirective.range.end));
          }
        }
        // Ignore ranges that fall in change range
      }
      addNewlyScannedDirectives();
      return commentDirectives;

      function addNewlyScannedDirectives() {
        if (addedNewlyScannedDirectives) return;
        addedNewlyScannedDirectives = true;
        if (!commentDirectives) {
          commentDirectives = newDirectives;
        } else if (newDirectives) {
          commentDirectives.push(...newDirectives);
        }
      }
    }

    function moveElementEntirelyPastChangeRange(element: IncrementalElement, isArray: boolean, delta: number, oldText: string, newText: string, aggressiveChecks: boolean) {
      if (isArray) {
        visitArray(<IncrementalNodeArray>element);
      } else {
        visitNode(<IncrementalNode>element);
      }
      return;

      function visitNode(node: IncrementalNode) {
        let text = '';
        if (aggressiveChecks && shouldCheckNode(node)) {
          text = oldText.substring(node.pos, node.end);
        }

        // Ditch any existing LS children we may have created.  This way we can avoid
        // moving them forward.
        if (node._children) {
          node._children = undefined;
        }

        node.pos += delta;
        node.end += delta;

        if (aggressiveChecks && shouldCheckNode(node)) {
          assert(text === newText.substring(node.pos, node.end));
        }

        forEachChild(node, visitNode, visitArray);
        if (hasJSDocNodes(node)) {
          for (const jsDocComment of node.jsDoc!) {
            visitNode(<IncrementalNode>(<Node>jsDocComment));
          }
        }
        checkNodePositions(node, aggressiveChecks);
      }

      function visitArray(array: IncrementalNodeArray) {
        array._children = undefined;
        array.pos += delta;
        array.end += delta;

        for (const node of array) {
          visitNode(node);
        }
      }
    }

    function shouldCheckNode(node: Node) {
      switch (node.kind) {
        case Syntax.StringLiteral:
        case Syntax.NumericLiteral:
        case Syntax.Identifier:
          return true;
      }

      return false;
    }

    function adjustIntersectingElement(element: IncrementalElement, changeStart: number, changeRangeOldEnd: number, changeRangeNewEnd: number, delta: number) {
      assert(element.end >= changeStart, 'Adjusting an element that was entirely before the change range');
      assert(element.pos <= changeRangeOldEnd, 'Adjusting an element that was entirely after the change range');
      assert(element.pos <= element.end);

      // We have an element that intersects the change range in some way.  It may have its
      // start, or its end (or both) in the changed range.  We want to adjust any part
      // that intersects such that the final tree is in a consistent state.  i.e. all
      // children have spans within the span of their parent, and all siblings are ordered
      // properly.

      // We may need to update both the 'pos' and the 'end' of the element.

      // If the 'pos' is before the start of the change, then we don't need to touch it.
      // If it isn't, then the 'pos' must be inside the change.  How we update it will
      // depend if delta is positive or negative. If delta is positive then we have
      // something like:
      //
      //  -------------------AAA-----------------
      //  -------------------BBBCCCCCCC-----------------
      //
      // In this case, we consider any node that started in the change range to still be
      // starting at the same position.
      //
      // however, if the delta is negative, then we instead have something like this:
      //
      //  -------------------XXXYYYYYYY-----------------
      //  -------------------ZZZ-----------------
      //
      // In this case, any element that started in the 'X' range will keep its position.
      // However any element that started after that will have their pos adjusted to be
      // at the end of the new range.  i.e. any node that started in the 'Y' range will
      // be adjusted to have their start at the end of the 'Z' range.
      //
      // The element will keep its position if possible.  Or Move backward to the new-end
      // if it's in the 'Y' range.
      element.pos = Math.min(element.pos, changeRangeNewEnd);

      // If the 'end' is after the change range, then we always adjust it by the delta
      // amount.  However, if the end is in the change range, then how we adjust it
      // will depend on if delta is positive or negative.  If delta is positive then we
      // have something like:
      //
      //  -------------------AAA-----------------
      //  -------------------BBBCCCCCCC-----------------
      //
      // In this case, we consider any node that ended inside the change range to keep its
      // end position.
      //
      // however, if the delta is negative, then we instead have something like this:
      //
      //  -------------------XXXYYYYYYY-----------------
      //  -------------------ZZZ-----------------
      //
      // In this case, any element that ended in the 'X' range will keep its position.
      // However any element that ended after that will have their pos adjusted to be
      // at the end of the new range.  i.e. any node that ended in the 'Y' range will
      // be adjusted to have their end at the end of the 'Z' range.
      if (element.end >= changeRangeOldEnd) {
        // Element ends after the change range.  Always adjust the end pos.
        element.end += delta;
      } else {
        // Element ends in the change range.  The element will keep its position if
        // possible. Or Move backward to the new-end if it's in the 'Y' range.
        element.end = Math.min(element.end, changeRangeNewEnd);
      }

      assert(element.pos <= element.end);
      if (element.parent) {
        assert(element.pos >= element.parent.pos);
        assert(element.end <= element.parent.end);
      }
    }

    function checkNodePositions(node: Node, aggressiveChecks: boolean) {
      if (aggressiveChecks) {
        let pos = node.pos;
        const visitNode = (child: Node) => {
          assert(child.pos >= pos);
          pos = child.end;
        };
        if (hasJSDocNodes(node)) {
          for (const jsDocComment of node.jsDoc!) {
            visitNode(jsDocComment);
          }
        }
        forEachChild(node, visitNode);
        assert(pos <= node.end);
      }
    }

    function updateTokenPositionsAndMarkElements(
      sourceFile: IncrementalNode,
      changeStart: number,
      changeRangeOldEnd: number,
      changeRangeNewEnd: number,
      delta: number,
      oldText: string,
      newText: string,
      aggressiveChecks: boolean
    ): void {
      visitNode(sourceFile);
      return;

      function visitNode(child: IncrementalNode) {
        assert(child.pos <= child.end);
        if (child.pos > changeRangeOldEnd) {
          // Node is entirely past the change range.  We need to move both its pos and
          // end, forward or backward appropriately.
          moveElementEntirelyPastChangeRange(child, /*isArray*/ false, delta, oldText, newText, aggressiveChecks);
          return;
        }

        // Check if the element intersects the change range.  If it does, then it is not
        // reusable.  Also, we'll need to recurse to see what constituent portions we may
        // be able to use.
        const fullEnd = child.end;
        if (fullEnd >= changeStart) {
          child.intersectsChange = true;
          child._children = undefined;

          // Adjust the pos or end (or both) of the intersecting element accordingly.
          adjustIntersectingElement(child, changeStart, changeRangeOldEnd, changeRangeNewEnd, delta);
          forEachChild(child, visitNode, visitArray);
          if (hasJSDocNodes(child)) {
            for (const jsDocComment of child.jsDoc!) {
              visitNode(<IncrementalNode>(<Node>jsDocComment));
            }
          }
          checkNodePositions(child, aggressiveChecks);
          return;
        }

        // Otherwise, the node is entirely before the change range.  No need to do anything with it.
        assert(fullEnd < changeStart);
      }

      function visitArray(array: IncrementalNodeArray) {
        assert(array.pos <= array.end);
        if (array.pos > changeRangeOldEnd) {
          // Array is entirely after the change range.  We need to move it, and move any of
          // its children.
          moveElementEntirelyPastChangeRange(array, /*isArray*/ true, delta, oldText, newText, aggressiveChecks);
          return;
        }

        // Check if the element intersects the change range.  If it does, then it is not
        // reusable.  Also, we'll need to recurse to see what constituent portions we may
        // be able to use.
        const fullEnd = array.end;
        if (fullEnd >= changeStart) {
          array.intersectsChange = true;
          array._children = undefined;

          // Adjust the pos or end (or both) of the intersecting array accordingly.
          adjustIntersectingElement(array, changeStart, changeRangeOldEnd, changeRangeNewEnd, delta);
          for (const node of array) {
            visitNode(node);
          }
          return;
        }

        // Otherwise, the array is entirely before the change range.  No need to do anything with it.
        assert(fullEnd < changeStart);
      }
    }

    function extendToAffectedRange(sourceFile: SourceFile, changeRange: TextChangeRange): TextChangeRange {
      // Consider the following code:
      //      void foo() { /; }
      //
      // If the text changes with an insertion of / just before the semicolon then we end up with:
      //      void foo() { //; }
      //
      // If we were to just use the changeRange a is, then we would not rescan the { token
      // (as it does not intersect the actual original change range).  Because an edit may
      // change the token touching it, we actually need to look back *at least* one token so
      // that the prior token sees that change.
      const maxLookahead = 1;

      let start = changeRange.span.start;

      // the first iteration aligns us with the change start. subsequent iteration move us to
      // the left by maxLookahead tokens.  We only need to do this as long as we're not at the
      // start of the tree.
      for (let i = 0; start > 0 && i <= maxLookahead; i++) {
        const nearestNode = findNearestNodeStartingBeforeOrAtPosition(sourceFile, start);
        assert(nearestNode.pos <= start);
        const position = nearestNode.pos;

        start = Math.max(0, position - 1);
      }

      const finalSpan = TextSpan.from(start, textSpanEnd(changeRange.span));
      const finalLength = changeRange.newLength + (changeRange.span.start - start);

      return createTextChangeRange(finalSpan, finalLength);
    }

    function findNearestNodeStartingBeforeOrAtPosition(sourceFile: SourceFile, position: number): Node {
      let bestResult: Node = sourceFile;
      let lastNodeEntirelyBeforePosition: Node | undefined;

      forEachChild(sourceFile, visit);

      if (lastNodeEntirelyBeforePosition) {
        const lastChildOfLastEntireNodeBeforePosition = getLastDescendant(lastNodeEntirelyBeforePosition);
        if (lastChildOfLastEntireNodeBeforePosition.pos > bestResult.pos) {
          bestResult = lastChildOfLastEntireNodeBeforePosition;
        }
      }

      return bestResult;

      function getLastDescendant(node: Node): Node {
        while (true) {
          const lastChild = getLastChild(node);
          if (lastChild) {
            node = lastChild;
          } else {
            return node;
          }
        }
      }

      function visit(child: Node) {
        if (nodeIsMissing(child)) {
          // Missing nodes are effectively invisible to us.  We never even consider them
          // When trying to find the nearest node before us.
          return;
        }

        // If the child intersects this position, then this node is currently the nearest
        // node that starts before the position.
        if (child.pos <= position) {
          if (child.pos >= bestResult.pos) {
            // This node starts before the position, and is closer to the position than
            // the previous best node we found.  It is now the new best node.
            bestResult = child;
          }

          // Now, the node may overlap the position, or it may end entirely before the
          // position.  If it overlaps with the position, then either it, or one of its
          // children must be the nearest node before the position.  So we can just
          // recurse into this child to see if we can find something better.
          if (position < child.end) {
            // The nearest node is either this child, or one of the children inside
            // of it.  We've already marked this child as the best so far.  Recurse
            // in case one of the children is better.
            forEachChild(child, visit);

            // Once we look at the children of this node, then there's no need to
            // continue any further.
            return true;
          } else {
            assert(child.end <= position);
            // The child ends entirely before this position.  Say you have the following
            // (where $ is the position)
            //
            //      <complex expr 1> ? <complex expr 2> $ : <...> <...>
            //
            // We would want to find the nearest preceding node in "complex expr 2".
            // To support that, we keep track of this node, and once we're done searching
            // for a best node, we recurse down this node to see if we can find a good
            // result in it.
            //
            // This approach allows us to quickly skip over nodes that are entirely
            // before the position, while still allowing us to find any nodes in the
            // last one that might be what we want.
            lastNodeEntirelyBeforePosition = child;
          }
        } else {
          assert(child.pos > position);
          // We're now at a node that is entirely past the position we're searching for.
          // This node (and all following nodes) could never contribute to the result,
          // so just skip them by returning 'true' here.
          return true;
        }
        return;
      }
    }

    function checkChangeRange(sourceFile: SourceFile, newText: string, textChangeRange: TextChangeRange, aggressiveChecks: boolean) {
      const oldText = sourceFile.text;
      if (textChangeRange) {
        assert(oldText.length - textChangeRange.span.length + textChangeRange.newLength === newText.length);

        if (aggressiveChecks || Debug.shouldAssert(AssertionLevel.VeryAggressive)) {
          const oldTextPrefix = oldText.substr(0, textChangeRange.span.start);
          const newTextPrefix = newText.substr(0, textChangeRange.span.start);
          assert(oldTextPrefix === newTextPrefix);

          const oldTextSuffix = oldText.substring(textSpanEnd(textChangeRange.span), oldText.length);
          const newTextSuffix = newText.substring(textSpanEnd(textChangeRangeNewSpan(textChangeRange)), newText.length);
          assert(oldTextSuffix === newTextSuffix);
        }
      }
    }

    interface IncrementalElement extends TextRange {
      parent: Node;
      intersectsChange: boolean;
      length?: number;
      _children: Node[] | undefined;
    }

    export interface IncrementalNode extends Node, IncrementalElement {
      hasBeenIncrementallyParsed: boolean;
    }

    interface IncrementalNodeArray extends NodeArray<IncrementalNode>, IncrementalElement {
      length: number;
    }

    export interface SyntaxCursor {
      currentNode(position: number): IncrementalNode;
    }

    function createSyntaxCursor(sourceFile: SourceFile): SyntaxCursor {
      let currentArray: NodeArray<Node> = sourceFile.statements;
      let currentArrayIndex = 0;

      assert(currentArrayIndex < currentArray.length);
      let current = currentArray[currentArrayIndex];
      let lastQueriedPosition = InvalidPosition.Value;

      return {
        currentNode(position: number) {
          // Only compute the current node if the position is different than the last time
          // we were asked.  The parser commonly asks for the node at the same position
          // twice.  Once to know if can read an appropriate list element at a certain point,
          // and then to actually read and consume the node.
          if (position !== lastQueriedPosition) {
            // Much of the time the parser will need the very next node in the array that
            // we just returned a node from.So just simply check for that case and move
            // forward in the array instead of searching for the node again.
            if (current && current.end === position && currentArrayIndex < currentArray.length - 1) {
              currentArrayIndex++;
              current = currentArray[currentArrayIndex];
            }

            // If we don't have a node, or the node we have isn't in the right position,
            // then try to find a viable node at the position requested.
            if (!current || current.pos !== position) {
              findHighestListElementThatStartsAtPosition(position);
            }
          }

          // Cache this query so that we don't do any extra work if the parser calls back
          // into us.  Note: this is very common as the parser will make pairs of calls like
          // 'isListElement -> parseListElement'.  If we were unable to find a node when
          // called with 'isListElement', we don't want to redo the work when parseListElement
          // is called immediately after.
          lastQueriedPosition = position;

          // Either we don'd have a node, or we have a node at the position being asked for.
          assert(!current || current.pos === position);
          return <IncrementalNode>current;
        },
      };

      // Finds the highest element in the tree we can find that starts at the provided position.
      // The element must be a direct child of some node list in the tree.  This way after we
      // return it, we can easily return its next sibling in the list.
      function findHighestListElementThatStartsAtPosition(position: number) {
        // Clear out any cached state about the last node we found.
        currentArray = undefined!;
        currentArrayIndex = InvalidPosition.Value;
        current = undefined!;

        // Recurse into the source file to find the highest node at this position.
        forEachChild(sourceFile, visitNode, visitArray);
        return;

        function visitNode(node: Node) {
          if (position >= node.pos && position < node.end) {
            // Position was within this node.  Keep searching deeper to find the node.
            forEachChild(node, visitNode, visitArray);

            // don't proceed any further in the search.
            return true;
          }

          // position wasn't in this node, have to keep searching.
          return false;
        }

        function visitArray(array: NodeArray<Node>) {
          if (position >= array.pos && position < array.end) {
            // position was in this array.  Search through this array to see if we find a
            // viable element.
            for (let i = 0; i < array.length; i++) {
              const child = array[i];
              if (child) {
                if (child.pos === position) {
                  // Found the right node.  We're done.
                  currentArray = array;
                  currentArrayIndex = i;
                  current = child;
                  return true;
                } else {
                  if (child.pos < position && position < child.end) {
                    // Position in somewhere within this child.  Search in it and
                    // stop searching in this array.
                    forEachChild(child, visitNode, visitArray);
                    return true;
                  }
                }
              }
            }
          }

          // position wasn't in this array, have to keep searching.
          return false;
        }
      }
    }

    const enum InvalidPosition {
      Value = -1,
    }
  }

  export function isDeclarationFileName(fileName: string): boolean {
    return fileExtensionIs(fileName, Extension.Dts);
  }

  export interface PragmaContext {
    languageVersion: ScriptTarget;
    pragmas?: PragmaMap;
    checkJsDirective?: CheckJsDirective;
    referencedFiles: FileReference[];
    typeReferenceDirectives: FileReference[];
    libReferenceDirectives: FileReference[];
    amdDependencies: AmdDependency[];
    hasNoDefaultLib?: boolean;
    moduleName?: string;
  }

  export function processCommentPragmas(context: PragmaContext, sourceText: string): void {
    const pragmas: PragmaPseudoMapEntry[] = [];

    for (const range of getLeadingCommentRanges(sourceText, 0) || emptyArray) {
      const comment = sourceText.substring(range.pos, range.end);
      extractPragmas(pragmas, range, comment);
    }

    context.pragmas = createMap() as PragmaMap;
    for (const pragma of pragmas) {
      if (context.pragmas.has(pragma.name)) {
        const currentValue = context.pragmas.get(pragma.name);
        if (currentValue instanceof Array) {
          currentValue.push(pragma.args);
        } else {
          context.pragmas.set(pragma.name, [currentValue, pragma.args]);
        }
        continue;
      }
      context.pragmas.set(pragma.name, pragma.args);
    }
  }

  type PragmaDiagnosticReporter = (pos: number, length: number, m: DiagnosticMessage) => void;

  export function processPragmasIntoFields(context: PragmaContext, reportDiagnostic: PragmaDiagnosticReporter): void {
    context.checkJsDirective = undefined;
    context.referencedFiles = [];
    context.typeReferenceDirectives = [];
    context.libReferenceDirectives = [];
    context.amdDependencies = [];
    context.hasNoDefaultLib = false;
    context.pragmas!.forEach((entryOrList, key) => {
      // TODO: GH#18217
      // TODO: The below should be strongly type-guarded and not need casts/explicit annotations, since entryOrList is related to
      // key and key is constrained to a union; but it's not (see GH#21483 for at least partial fix) :(
      switch (key) {
        case 'reference': {
          const referencedFiles = context.referencedFiles;
          const typeReferenceDirectives = context.typeReferenceDirectives;
          const libReferenceDirectives = context.libReferenceDirectives;
          forEach(toArray(entryOrList) as PragmaPseudoMap['reference'][], (arg) => {
            const { types, lib, path } = arg.arguments;
            if (arg.arguments['no-default-lib']) {
              context.hasNoDefaultLib = true;
            } else if (types) {
              typeReferenceDirectives.push({ pos: types.pos, end: types.end, fileName: types.value });
            } else if (lib) {
              libReferenceDirectives.push({ pos: lib.pos, end: lib.end, fileName: lib.value });
            } else if (path) {
              referencedFiles.push({ pos: path.pos, end: path.end, fileName: path.value });
            } else {
              reportDiagnostic(arg.range.pos, arg.range.end - arg.range.pos, Diagnostics.Invalid_reference_directive_syntax);
            }
          });
          break;
        }
        case 'amd-dependency': {
          context.amdDependencies = map(toArray(entryOrList) as PragmaPseudoMap['amd-dependency'][], (x) => ({
            name: x.arguments.name,
            path: x.arguments.path,
          }));
          break;
        }
        case 'amd-module': {
          if (entryOrList instanceof Array) {
            for (const entry of entryOrList) {
              if (context.moduleName) {
                // TODO: It's probably fine to issue this diagnostic on all instances of the pragma
                reportDiagnostic(entry.range.pos, entry.range.end - entry.range.pos, Diagnostics.An_AMD_module_cannot_have_multiple_name_assignments);
              }
              context.moduleName = (entry as PragmaPseudoMap['amd-module']).arguments.name;
            }
          } else {
            context.moduleName = (entryOrList as PragmaPseudoMap['amd-module']).arguments.name;
          }
          break;
        }
        case 'ts-nocheck':
        case 'ts-check': {
          // _last_ of either nocheck or check in a file is the "winner"
          forEach(toArray(entryOrList), (entry) => {
            if (!context.checkJsDirective || entry.range.pos > context.checkJsDirective.pos) {
              context.checkJsDirective = {
                enabled: key === 'ts-check',
                end: entry.range.end,
                pos: entry.range.pos,
              };
            }
          });
          break;
        }
        case 'jsx':
          return; // Accessed directly
        default:
          fail('Unhandled pragma kind'); // Can this be made into an assertNever in the future?
      }
    });
  }

  const namedArgRegExCache = QMap.create<RegExp>();
  function getNamedArgRegEx(name: string): RegExp {
    if (namedArgRegExCache.has(name)) {
      return namedArgRegExCache.get(name)!;
    }
    const result = new RegExp(`(\\s${name}\\s*=\\s*)('|")(.+?)\\2`, 'im');
    namedArgRegExCache.set(name, result);
    return result;
  }

  const tripleSlashXMLCommentStartRegEx = /^\/\/\/\s*<(\S+)\s.*?\/>/im;
  const singleLinePragmaRegEx = /^\/\/\/?\s*@(\S+)\s*(.*)\s*$/im;
  function extractPragmas(pragmas: PragmaPseudoMapEntry[], range: CommentRange, text: string) {
    const tripleSlash = range.kind === Syntax.SingleLineCommentTrivia && tripleSlashXMLCommentStartRegEx.exec(text);
    if (tripleSlash) {
      const name = tripleSlash[1].toLowerCase() as keyof PragmaPseudoMap; // Technically unsafe cast, but we do it so the below check to make it safe typechecks
      const pragma = commentPragmas[name] as PragmaDefinition;
      if (!pragma || !(pragma.kind! & PragmaKindFlags.TripleSlashXML)) {
        return;
      }
      if (pragma.args) {
        const argument: { [index: string]: string | { value: string; pos: number; end: number } } = {};
        for (const arg of pragma.args) {
          const matcher = getNamedArgRegEx(arg.name);
          const matchResult = matcher.exec(text);
          if (!matchResult && !arg.optional) {
            return; // Missing required argument, don't parse
          } else if (matchResult) {
            if (arg.captureSpan) {
              const startPos = range.pos + matchResult.index + matchResult[1].length + matchResult[2].length;
              argument[arg.name] = {
                value: matchResult[3],
                pos: startPos,
                end: startPos + matchResult[3].length,
              };
            } else {
              argument[arg.name] = matchResult[3];
            }
          }
        }
        pragmas.push({ name, args: { arguments: argument, range } } as PragmaPseudoMapEntry);
      } else {
        pragmas.push({ name, args: { arguments: {}, range } } as PragmaPseudoMapEntry);
      }
      return;
    }

    const singleLine = range.kind === Syntax.SingleLineCommentTrivia && singleLinePragmaRegEx.exec(text);
    if (singleLine) {
      return addPragmaForMatch(pragmas, range, PragmaKindFlags.SingleLine, singleLine);
    }

    if (range.kind === Syntax.MultiLineCommentTrivia) {
      const multiLinePragmaRegEx = /\s*@(\S+)\s*(.*)\s*$/gim; // Defined inline since it uses the "g" flag, which keeps a persistent index (for iterating)
      let multiLineMatch: RegExpExecArray | null;
      while ((multiLineMatch = multiLinePragmaRegEx.exec(text))) {
        addPragmaForMatch(pragmas, range, PragmaKindFlags.MultiLine, multiLineMatch);
      }
    }
  }

  function addPragmaForMatch(pragmas: PragmaPseudoMapEntry[], range: CommentRange, kind: PragmaKindFlags, match: RegExpExecArray) {
    if (!match) return;
    const name = match[1].toLowerCase() as keyof PragmaPseudoMap; // Technically unsafe cast, but we do it so they below check to make it safe typechecks
    const pragma = commentPragmas[name] as PragmaDefinition;
    if (!pragma || !(pragma.kind! & kind)) {
      return;
    }
    const args = match[2]; // Split on spaces and match up positionally with definition
    const argument = getNamedPragmaArguments(pragma, args);
    if (argument === 'fail') return; // Missing required argument, fail to parse it
    pragmas.push({ name, args: { arguments: argument, range } } as PragmaPseudoMapEntry);
    return;
  }

  function getNamedPragmaArguments(pragma: PragmaDefinition, text: string | undefined): { [index: string]: string } | 'fail' {
    if (!text) return {};
    if (!pragma.args) return {};
    const args = text.split(/\s+/);
    const argMap: { [index: string]: string } = {};
    for (let i = 0; i < pragma.args.length; i++) {
      const argument = pragma.args[i];
      if (!args[i] && !argument.optional) {
        return 'fail';
      }
      if (argument.captureSpan) {
        return fail('Capture spans not yet implemented for non-xml pragmas');
      }
      argMap[argument.name] = args[i];
    }
    return argMap;
  }

  export function tagNamesAreEquivalent(lhs: JsxTagNameExpression, rhs: JsxTagNameExpression): boolean {
    if (lhs.kind !== rhs.kind) {
      return false;
    }

    if (lhs.kind === Syntax.Identifier) {
      return lhs.escapedText === (<Identifier>rhs).escapedText;
    }

    if (lhs.kind === Syntax.ThisKeyword) {
      return true;
    }

    // If we are at this statement then we must have PropertyAccessExpression and because tag name in Jsx element can only
    // take forms of JsxTagNameExpression which includes an identifier, "this" expression, or another propertyAccessExpression
    // it is safe to case the expression property as such. See parseJsxElementName for how we parse tag name in Jsx element
    return (
      (<PropertyAccessExpression>lhs).name.escapedText === (<PropertyAccessExpression>rhs).name.escapedText &&
      tagNamesAreEquivalent((<PropertyAccessExpression>lhs).expression as JsxTagNameExpression, (<PropertyAccessExpression>rhs).expression as JsxTagNameExpression)
    );
  }
}
