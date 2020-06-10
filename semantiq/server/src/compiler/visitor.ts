namespace qnr {
  function reduceNode<T>(node: Node | undefined, f: (memo: T, node: Node) => T, initial: T) {
    return node ? f(initial, node) : initial;
  }

  function reduceNodeArray<T>(nodes: NodeArray<Node> | undefined, f: (memo: T, nodes: NodeArray<Node>) => T, initial: T) {
    return nodes ? f(initial, nodes) : initial;
  }

  /**
   * Similar to `reduceLeft`, performs a reduction against each child of a node.
   * NOTE: Unlike `forEachChild`, this does *not* visit every node.
   *
   * @param node The node containing the children to reduce.
   * @param initial The initial value to supply to the reduction.
   * @param f The callback function
   */
  export function reduceEachChild<T>(node: Node | undefined, initial: T, cbNode: (memo: T, node: Node) => T, cbNodeArray?: (memo: T, nodes: NodeArray<Node>) => T): T {
    if (node === undefined) {
      return initial;
    }

    const reduceNodes: (nodes: NodeArray<Node> | undefined, f: ((memo: T, node: Node) => T) | ((memo: T, node: NodeArray<Node>) => T), initial: T) => T = cbNodeArray ? reduceNodeArray : reduceLeft;
    const cbNodes = cbNodeArray || cbNode;
    const kind = node.kind;

    // No need to visit nodes with no children.
    if (kind > Syntax.FirstToken && kind <= Syntax.LastToken) {
      return initial;
    }

    // We do not yet support types.
    if (kind >= Syntax.TypePredicate && kind <= Syntax.LiteralType) {
      return initial;
    }

    let result = initial;
    switch (node.kind) {
      // Leaf nodes
      case Syntax.SemicolonClassElement:
      case Syntax.EmptyStatement:
      case Syntax.OmittedExpression:
      case Syntax.DebuggerStatement:
      case Syntax.NotEmittedStatement:
        // No need to visit nodes with no children.
        break;

      // Names
      case Syntax.QualifiedName:
        result = reduceNode((<QualifiedName>node).left, cbNode, result);
        result = reduceNode((<QualifiedName>node).right, cbNode, result);
        break;

      case Syntax.ComputedPropertyName:
        result = reduceNode((<ComputedPropertyName>node).expression, cbNode, result);
        break;

      // Signature elements
      case Syntax.Parameter:
        result = reduceNodes((<ParameterDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<ParameterDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<ParameterDeclaration>node).name, cbNode, result);
        result = reduceNode((<ParameterDeclaration>node).type, cbNode, result);
        result = reduceNode((<ParameterDeclaration>node).initializer, cbNode, result);
        break;

      case Syntax.Decorator:
        result = reduceNode((<Decorator>node).expression, cbNode, result);
        break;

      // Type member
      case Syntax.PropertySignature:
        result = reduceNodes((<PropertySignature>node).modifiers, cbNodes, result);
        result = reduceNode((<PropertySignature>node).name, cbNode, result);
        result = reduceNode((<PropertySignature>node).questionToken, cbNode, result);
        result = reduceNode((<PropertySignature>node).type, cbNode, result);
        result = reduceNode((<PropertySignature>node).initializer, cbNode, result);
        break;

      case Syntax.PropertyDeclaration:
        result = reduceNodes((<PropertyDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<PropertyDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<PropertyDeclaration>node).name, cbNode, result);
        result = reduceNode((<PropertyDeclaration>node).type, cbNode, result);
        result = reduceNode((<PropertyDeclaration>node).initializer, cbNode, result);
        break;

      case Syntax.MethodDeclaration:
        result = reduceNodes((<MethodDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<MethodDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<MethodDeclaration>node).name, cbNode, result);
        result = reduceNodes((<MethodDeclaration>node).typeParameters, cbNodes, result);
        result = reduceNodes((<MethodDeclaration>node).parameters, cbNodes, result);
        result = reduceNode((<MethodDeclaration>node).type, cbNode, result);
        result = reduceNode((<MethodDeclaration>node).body, cbNode, result);
        break;

      case Syntax.Constructor:
        result = reduceNodes((<ConstructorDeclaration>node).modifiers, cbNodes, result);
        result = reduceNodes((<ConstructorDeclaration>node).parameters, cbNodes, result);
        result = reduceNode((<ConstructorDeclaration>node).body, cbNode, result);
        break;

      case Syntax.GetAccessor:
        result = reduceNodes((<GetAccessorDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<GetAccessorDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<GetAccessorDeclaration>node).name, cbNode, result);
        result = reduceNodes((<GetAccessorDeclaration>node).parameters, cbNodes, result);
        result = reduceNode((<GetAccessorDeclaration>node).type, cbNode, result);
        result = reduceNode((<GetAccessorDeclaration>node).body, cbNode, result);
        break;

      case Syntax.SetAccessor:
        result = reduceNodes((<GetAccessorDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<GetAccessorDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<GetAccessorDeclaration>node).name, cbNode, result);
        result = reduceNodes((<GetAccessorDeclaration>node).parameters, cbNodes, result);
        result = reduceNode((<GetAccessorDeclaration>node).body, cbNode, result);
        break;

      // Binding patterns
      case Syntax.ObjectBindingPattern:
      case Syntax.ArrayBindingPattern:
        result = reduceNodes((<BindingPattern>node).elements, cbNodes, result);
        break;

      case Syntax.BindingElement:
        result = reduceNode((<BindingElement>node).propertyName, cbNode, result);
        result = reduceNode((<BindingElement>node).name, cbNode, result);
        result = reduceNode((<BindingElement>node).initializer, cbNode, result);
        break;

      // Expression
      case Syntax.ArrayLiteralExpression:
        result = reduceNodes((<ArrayLiteralExpression>node).elements, cbNodes, result);
        break;

      case Syntax.ObjectLiteralExpression:
        result = reduceNodes((<ObjectLiteralExpression>node).properties, cbNodes, result);
        break;

      case Syntax.PropertyAccessExpression:
        result = reduceNode((<PropertyAccessExpression>node).expression, cbNode, result);
        result = reduceNode((<PropertyAccessExpression>node).name, cbNode, result);
        break;

      case Syntax.ElementAccessExpression:
        result = reduceNode((<ElementAccessExpression>node).expression, cbNode, result);
        result = reduceNode((<ElementAccessExpression>node).argumentExpression, cbNode, result);
        break;

      case Syntax.CallExpression:
        result = reduceNode((<CallExpression>node).expression, cbNode, result);
        result = reduceNodes((<CallExpression>node).typeArguments, cbNodes, result);
        result = reduceNodes((<CallExpression>node).arguments, cbNodes, result);
        break;

      case Syntax.NewExpression:
        result = reduceNode((<NewExpression>node).expression, cbNode, result);
        result = reduceNodes((<NewExpression>node).typeArguments, cbNodes, result);
        result = reduceNodes((<NewExpression>node).arguments, cbNodes, result);
        break;

      case Syntax.TaggedTemplateExpression:
        result = reduceNode((<TaggedTemplateExpression>node).tag, cbNode, result);
        result = reduceNodes((<TaggedTemplateExpression>node).typeArguments, cbNodes, result);
        result = reduceNode((<TaggedTemplateExpression>node).template, cbNode, result);
        break;

      case Syntax.TypeAssertionExpression:
        result = reduceNode((<TypeAssertion>node).type, cbNode, result);
        result = reduceNode((<TypeAssertion>node).expression, cbNode, result);
        break;

      case Syntax.FunctionExpression:
        result = reduceNodes((<FunctionExpression>node).modifiers, cbNodes, result);
        result = reduceNode((<FunctionExpression>node).name, cbNode, result);
        result = reduceNodes((<FunctionExpression>node).typeParameters, cbNodes, result);
        result = reduceNodes((<FunctionExpression>node).parameters, cbNodes, result);
        result = reduceNode((<FunctionExpression>node).type, cbNode, result);
        result = reduceNode((<FunctionExpression>node).body, cbNode, result);
        break;

      case Syntax.ArrowFunction:
        result = reduceNodes((<ArrowFunction>node).modifiers, cbNodes, result);
        result = reduceNodes((<ArrowFunction>node).typeParameters, cbNodes, result);
        result = reduceNodes((<ArrowFunction>node).parameters, cbNodes, result);
        result = reduceNode((<ArrowFunction>node).type, cbNode, result);
        result = reduceNode((<ArrowFunction>node).body, cbNode, result);
        break;

      case Syntax.ParenthesizedExpression:
      case Syntax.DeleteExpression:
      case Syntax.TypeOfExpression:
      case Syntax.VoidExpression:
      case Syntax.AwaitExpression:
      case Syntax.YieldExpression:
      case Syntax.SpreadElement:
      case Syntax.NonNullExpression:
        result = reduceNode(
          (<ParenthesizedExpression | DeleteExpression | TypeOfExpression | VoidExpression | AwaitExpression | YieldExpression | SpreadElement | NonNullExpression>node).expression,
          cbNode,
          result
        );
        break;

      case Syntax.PrefixUnaryExpression:
      case Syntax.PostfixUnaryExpression:
        result = reduceNode((<PrefixUnaryExpression | PostfixUnaryExpression>node).operand, cbNode, result);
        break;

      case Syntax.BinaryExpression:
        result = reduceNode((<BinaryExpression>node).left, cbNode, result);
        result = reduceNode((<BinaryExpression>node).right, cbNode, result);
        break;

      case Syntax.ConditionalExpression:
        result = reduceNode((<ConditionalExpression>node).condition, cbNode, result);
        result = reduceNode((<ConditionalExpression>node).whenTrue, cbNode, result);
        result = reduceNode((<ConditionalExpression>node).whenFalse, cbNode, result);
        break;

      case Syntax.TemplateExpression:
        result = reduceNode((<TemplateExpression>node).head, cbNode, result);
        result = reduceNodes((<TemplateExpression>node).templateSpans, cbNodes, result);
        break;

      case Syntax.ClassExpression:
        result = reduceNodes((<ClassExpression>node).modifiers, cbNodes, result);
        result = reduceNode((<ClassExpression>node).name, cbNode, result);
        result = reduceNodes((<ClassExpression>node).typeParameters, cbNodes, result);
        result = reduceNodes((<ClassExpression>node).heritageClauses, cbNodes, result);
        result = reduceNodes((<ClassExpression>node).members, cbNodes, result);
        break;

      case Syntax.ExpressionWithTypeArguments:
        result = reduceNode((<ExpressionWithTypeArguments>node).expression, cbNode, result);
        result = reduceNodes((<ExpressionWithTypeArguments>node).typeArguments, cbNodes, result);
        break;

      case Syntax.AsExpression:
        result = reduceNode((<AsExpression>node).expression, cbNode, result);
        result = reduceNode((<AsExpression>node).type, cbNode, result);
        break;

      // Misc
      case Syntax.TemplateSpan:
        result = reduceNode((<TemplateSpan>node).expression, cbNode, result);
        result = reduceNode((<TemplateSpan>node).literal, cbNode, result);
        break;

      // Element
      case Syntax.Block:
        result = reduceNodes((<Block>node).statements, cbNodes, result);
        break;

      case Syntax.VariableStatement:
        result = reduceNodes((<VariableStatement>node).modifiers, cbNodes, result);
        result = reduceNode((<VariableStatement>node).declarationList, cbNode, result);
        break;

      case Syntax.ExpressionStatement:
        result = reduceNode((<ExpressionStatement>node).expression, cbNode, result);
        break;

      case Syntax.IfStatement:
        result = reduceNode((<IfStatement>node).expression, cbNode, result);
        result = reduceNode((<IfStatement>node).thenStatement, cbNode, result);
        result = reduceNode((<IfStatement>node).elseStatement, cbNode, result);
        break;

      case Syntax.DoStatement:
        result = reduceNode((<DoStatement>node).statement, cbNode, result);
        result = reduceNode((<DoStatement>node).expression, cbNode, result);
        break;

      case Syntax.WhileStatement:
      case Syntax.WithStatement:
        result = reduceNode((<WhileStatement | WithStatement>node).expression, cbNode, result);
        result = reduceNode((<WhileStatement | WithStatement>node).statement, cbNode, result);
        break;

      case Syntax.ForStatement:
        result = reduceNode((<ForStatement>node).initializer, cbNode, result);
        result = reduceNode((<ForStatement>node).condition, cbNode, result);
        result = reduceNode((<ForStatement>node).incrementor, cbNode, result);
        result = reduceNode((<ForStatement>node).statement, cbNode, result);
        break;

      case Syntax.ForInStatement:
      case Syntax.ForOfStatement:
        result = reduceNode((<ForInOrOfStatement>node).initializer, cbNode, result);
        result = reduceNode((<ForInOrOfStatement>node).expression, cbNode, result);
        result = reduceNode((<ForInOrOfStatement>node).statement, cbNode, result);
        break;

      case Syntax.ReturnStatement:
      case Syntax.ThrowStatement:
        result = reduceNode((<ReturnStatement>node).expression, cbNode, result);
        break;

      case Syntax.SwitchStatement:
        result = reduceNode((<SwitchStatement>node).expression, cbNode, result);
        result = reduceNode((<SwitchStatement>node).caseBlock, cbNode, result);
        break;

      case Syntax.LabeledStatement:
        result = reduceNode((<LabeledStatement>node).label, cbNode, result);
        result = reduceNode((<LabeledStatement>node).statement, cbNode, result);
        break;

      case Syntax.TryStatement:
        result = reduceNode((<TryStatement>node).tryBlock, cbNode, result);
        result = reduceNode((<TryStatement>node).catchClause, cbNode, result);
        result = reduceNode((<TryStatement>node).finallyBlock, cbNode, result);
        break;

      case Syntax.VariableDeclaration:
        result = reduceNode((<VariableDeclaration>node).name, cbNode, result);
        result = reduceNode((<VariableDeclaration>node).type, cbNode, result);
        result = reduceNode((<VariableDeclaration>node).initializer, cbNode, result);
        break;

      case Syntax.VariableDeclarationList:
        result = reduceNodes((<VariableDeclarationList>node).declarations, cbNodes, result);
        break;

      case Syntax.FunctionDeclaration:
        result = reduceNodes((<FunctionDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<FunctionDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<FunctionDeclaration>node).name, cbNode, result);
        result = reduceNodes((<FunctionDeclaration>node).typeParameters, cbNodes, result);
        result = reduceNodes((<FunctionDeclaration>node).parameters, cbNodes, result);
        result = reduceNode((<FunctionDeclaration>node).type, cbNode, result);
        result = reduceNode((<FunctionDeclaration>node).body, cbNode, result);
        break;

      case Syntax.ClassDeclaration:
        result = reduceNodes((<ClassDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<ClassDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<ClassDeclaration>node).name, cbNode, result);
        result = reduceNodes((<ClassDeclaration>node).typeParameters, cbNodes, result);
        result = reduceNodes((<ClassDeclaration>node).heritageClauses, cbNodes, result);
        result = reduceNodes((<ClassDeclaration>node).members, cbNodes, result);
        break;

      case Syntax.EnumDeclaration:
        result = reduceNodes((<EnumDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<EnumDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<EnumDeclaration>node).name, cbNode, result);
        result = reduceNodes((<EnumDeclaration>node).members, cbNodes, result);
        break;

      case Syntax.ModuleDeclaration:
        result = reduceNodes((<ModuleDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<ModuleDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<ModuleDeclaration>node).name, cbNode, result);
        result = reduceNode((<ModuleDeclaration>node).body, cbNode, result);
        break;

      case Syntax.ModuleBlock:
        result = reduceNodes((<ModuleBlock>node).statements, cbNodes, result);
        break;

      case Syntax.CaseBlock:
        result = reduceNodes((<CaseBlock>node).clauses, cbNodes, result);
        break;

      case Syntax.ImportEqualsDeclaration:
        result = reduceNodes((<ImportEqualsDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<ImportEqualsDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<ImportEqualsDeclaration>node).name, cbNode, result);
        result = reduceNode((<ImportEqualsDeclaration>node).moduleReference, cbNode, result);
        break;

      case Syntax.ImportDeclaration:
        result = reduceNodes((<ImportDeclaration>node).decorators, cbNodes, result);
        result = reduceNodes((<ImportDeclaration>node).modifiers, cbNodes, result);
        result = reduceNode((<ImportDeclaration>node).importClause, cbNode, result);
        result = reduceNode((<ImportDeclaration>node).moduleSpecifier, cbNode, result);
        break;

      case Syntax.ImportClause:
        result = reduceNode((<ImportClause>node).name, cbNode, result);
        result = reduceNode((<ImportClause>node).namedBindings, cbNode, result);
        break;

      case Syntax.NamespaceImport:
        result = reduceNode((<NamespaceImport>node).name, cbNode, result);
        break;

      case Syntax.NamespaceExport:
        result = reduceNode((<NamespaceExport>node).name, cbNode, result);
        break;

      case Syntax.NamedImports:
      case Syntax.NamedExports:
        result = reduceNodes((<NamedImports | NamedExports>node).elements, cbNodes, result);
        break;

      case Syntax.ImportSpecifier:
      case Syntax.ExportSpecifier:
        result = reduceNode((<ImportSpecifier | ExportSpecifier>node).propertyName, cbNode, result);
        result = reduceNode((<ImportSpecifier | ExportSpecifier>node).name, cbNode, result);
        break;

      case Syntax.ExportAssignment:
        result = reduceLeft((<ExportAssignment>node).decorators, cbNode, result);
        result = reduceLeft((<ExportAssignment>node).modifiers, cbNode, result);
        result = reduceNode((<ExportAssignment>node).expression, cbNode, result);
        break;

      case Syntax.ExportDeclaration:
        result = reduceLeft((<ExportDeclaration>node).decorators, cbNode, result);
        result = reduceLeft((<ExportDeclaration>node).modifiers, cbNode, result);
        result = reduceNode((<ExportDeclaration>node).exportClause, cbNode, result);
        result = reduceNode((<ExportDeclaration>node).moduleSpecifier, cbNode, result);
        break;

      // Module references
      case Syntax.ExternalModuleReference:
        result = reduceNode((<ExternalModuleReference>node).expression, cbNode, result);
        break;

      // JSX
      case Syntax.JsxElement:
        result = reduceNode((<JsxElement>node).openingElement, cbNode, result);
        result = reduceLeft((<JsxElement>node).children, cbNode, result);
        result = reduceNode((<JsxElement>node).closingElement, cbNode, result);
        break;

      case Syntax.JsxFragment:
        result = reduceNode((<JsxFragment>node).openingFragment, cbNode, result);
        result = reduceLeft((<JsxFragment>node).children, cbNode, result);
        result = reduceNode((<JsxFragment>node).closingFragment, cbNode, result);
        break;

      case Syntax.JsxSelfClosingElement:
      case Syntax.JsxOpeningElement:
        result = reduceNode((<JsxSelfClosingElement | JsxOpeningElement>node).tagName, cbNode, result);
        result = reduceNodes((<JsxSelfClosingElement | JsxOpeningElement>node).typeArguments, cbNode, result);
        result = reduceNode((<JsxSelfClosingElement | JsxOpeningElement>node).attributes, cbNode, result);
        break;

      case Syntax.JsxAttributes:
        result = reduceNodes((<JsxAttributes>node).properties, cbNodes, result);
        break;

      case Syntax.JsxClosingElement:
        result = reduceNode((<JsxClosingElement>node).tagName, cbNode, result);
        break;

      case Syntax.JsxAttribute:
        result = reduceNode((<JsxAttribute>node).name, cbNode, result);
        result = reduceNode((<JsxAttribute>node).initializer, cbNode, result);
        break;

      case Syntax.JsxSpreadAttribute:
        result = reduceNode((<JsxSpreadAttribute>node).expression, cbNode, result);
        break;

      case Syntax.JsxExpression:
        result = reduceNode((<JsxExpression>node).expression, cbNode, result);
        break;

      // Clauses
      case Syntax.CaseClause:
        result = reduceNode((<CaseClause>node).expression, cbNode, result);
      // falls through

      case Syntax.DefaultClause:
        result = reduceNodes((<CaseClause | DefaultClause>node).statements, cbNodes, result);
        break;

      case Syntax.HeritageClause:
        result = reduceNodes((<HeritageClause>node).types, cbNodes, result);
        break;

      case Syntax.CatchClause:
        result = reduceNode((<CatchClause>node).variableDeclaration, cbNode, result);
        result = reduceNode((<CatchClause>node).block, cbNode, result);
        break;

      // Property assignments
      case Syntax.PropertyAssignment:
        result = reduceNode((<PropertyAssignment>node).name, cbNode, result);
        result = reduceNode((<PropertyAssignment>node).initializer, cbNode, result);
        break;

      case Syntax.ShorthandPropertyAssignment:
        result = reduceNode((<ShorthandPropertyAssignment>node).name, cbNode, result);
        result = reduceNode((<ShorthandPropertyAssignment>node).objectAssignmentInitializer, cbNode, result);
        break;

      case Syntax.SpreadAssignment:
        result = reduceNode((<SpreadAssignment>node).expression, cbNode, result);
        break;

      // Enum
      case Syntax.EnumMember:
        result = reduceNode((<EnumMember>node).name, cbNode, result);
        result = reduceNode((<EnumMember>node).initializer, cbNode, result);
        break;

      // Top-level nodes
      case Syntax.SourceFile:
        result = reduceNodes((<SourceFile>node).statements, cbNodes, result);
        break;

      // Transformation nodes
      case Syntax.PartiallyEmittedExpression:
        result = reduceNode((<PartiallyEmittedExpression>node).expression, cbNode, result);
        break;

      case Syntax.CommaListExpression:
        result = reduceNodes((<CommaListExpression>node).elements, cbNodes, result);
        break;

      default:
        break;
    }

    return result;
  }

  function findSpanEnd<T>(array: readonly T[], test: (value: T) => boolean, start: number) {
    let i = start;
    while (i < array.length && test(array[i])) {
      i++;
    }
    return i;
  }

  /**
   * Merges generated lexical declarations into a new statement list.
   */
  export function mergeLexicalEnvironment(statements: NodeArray<Statement>, declarations: readonly Statement[] | undefined): NodeArray<Statement>;
  /**
   * Appends generated lexical declarations to an array of statements.
   */
  export function mergeLexicalEnvironment(statements: Statement[], declarations: readonly Statement[] | undefined): Statement[];
  export function mergeLexicalEnvironment(statements: Statement[] | NodeArray<Statement>, declarations: readonly Statement[] | undefined) {
    if (!some(declarations)) {
      return statements;
    }

    // When we merge new lexical statements into an existing statement list, we merge them in the following manner:
    //
    // Given:
    //
    // | Left                               | Right                               |
    // |------------------------------------|-------------------------------------|
    // | [standard prologues (left)]        | [standard prologues (right)]        |
    // | [hoisted functions (left)]         | [hoisted functions (right)]         |
    // | [hoisted variables (left)]         | [hoisted variables (right)]         |
    // | [lexical init statements (left)]   | [lexical init statements (right)]   |
    // | [other statements (left)]          |                                     |
    //
    // The resulting statement list will be:
    //
    // | Result                              |
    // |-------------------------------------|
    // | [standard prologues (right)]        |
    // | [standard prologues (left)]         |
    // | [hoisted functions (right)]         |
    // | [hoisted functions (left)]          |
    // | [hoisted variables (right)]         |
    // | [hoisted variables (left)]          |
    // | [lexical init statements (right)]   |
    // | [lexical init statements (left)]    |
    // | [other statements (left)]           |
    //
    // NOTE: It is expected that new lexical init statements must be evaluated before existing lexical init statements,
    // as the prior transformation may depend on the evaluation of the lexical init statements to be in the correct state.

    // find standard prologues on left in the following order: standard directives, hoisted functions, hoisted variables, other custom
    const leftStandardPrologueEnd = findSpanEnd(statements, isPrologueDirective, 0);
    const leftHoistedFunctionsEnd = findSpanEnd(statements, isHoistedFunction, leftStandardPrologueEnd);
    const leftHoistedVariablesEnd = findSpanEnd(statements, isHoistedVariableStatement, leftHoistedFunctionsEnd);

    // find standard prologues on right in the following order: standard directives, hoisted functions, hoisted variables, other custom
    const rightStandardPrologueEnd = findSpanEnd(declarations, isPrologueDirective, 0);
    const rightHoistedFunctionsEnd = findSpanEnd(declarations, isHoistedFunction, rightStandardPrologueEnd);
    const rightHoistedVariablesEnd = findSpanEnd(declarations, isHoistedVariableStatement, rightHoistedFunctionsEnd);
    const rightCustomPrologueEnd = findSpanEnd(declarations, isCustomPrologue, rightHoistedVariablesEnd);
    assert(rightCustomPrologueEnd === declarations.length, 'Expected declarations to be valid standard or custom prologues');

    // splice prologues from the right into the left. We do this in reverse order
    // so that we don't need to recompute the index on the left when we insert items.
    const left = isNodeArray(statements) ? statements.slice() : statements;

    // splice other custom prologues from right into left
    if (rightCustomPrologueEnd > rightHoistedVariablesEnd) {
      left.splice(leftHoistedVariablesEnd, 0, ...declarations.slice(rightHoistedVariablesEnd, rightCustomPrologueEnd));
    }

    // splice hoisted variables from right into left
    if (rightHoistedVariablesEnd > rightHoistedFunctionsEnd) {
      left.splice(leftHoistedFunctionsEnd, 0, ...declarations.slice(rightHoistedFunctionsEnd, rightHoistedVariablesEnd));
    }

    // splice hoisted functions from right into left
    if (rightHoistedFunctionsEnd > rightStandardPrologueEnd) {
      left.splice(leftStandardPrologueEnd, 0, ...declarations.slice(rightStandardPrologueEnd, rightHoistedFunctionsEnd));
    }

    // splice standard prologues from right into left (that are not already in left)
    if (rightStandardPrologueEnd > 0) {
      if (leftStandardPrologueEnd === 0) {
        left.splice(0, 0, ...declarations.slice(0, rightStandardPrologueEnd));
      } else {
        const leftPrologues = createMap<boolean>();
        for (let i = 0; i < leftStandardPrologueEnd; i++) {
          const leftPrologue = statements[i] as PrologueDirective;
          leftPrologues.set(leftPrologue.expression.text, true);
        }
        for (let i = rightStandardPrologueEnd - 1; i >= 0; i--) {
          const rightPrologue = declarations[i] as PrologueDirective;
          if (!leftPrologues.has(rightPrologue.expression.text)) {
            left.unshift(rightPrologue);
          }
        }
      }
    }

    if (isNodeArray(statements)) {
      return setTextRange(createNodeArray(left, statements.hasTrailingComma), statements);
    }

    return statements;
  }

  /**
   * Lifts a NodeArray containing only Statement nodes to a block.
   *
   * @param nodes The NodeArray.
   */
  export function liftToBlock(nodes: readonly Node[]): Statement {
    assert(every(nodes, isStatement), 'Cannot lift nodes to a Block.');
    return <Statement>singleOrUndefined(nodes) || createBlock(<NodeArray<Statement>>nodes);
  }

  /**
   * Aggregates the TransformFlags for a Node and its subtree.
   */
  export function aggregateTransformFlags<T extends Node>(node: T): T {
    aggregateTransformFlagsForNode(node);
    return node;
  }

  /**
   * Aggregates the TransformFlags for a Node and its subtree. The flags for the subtree are
   * computed first, then the transform flags for the current node are computed from the subtree
   * flags and the state of the current node. Finally, the transform flags of the node are
   * returned, excluding any flags that should not be included in its parent node's subtree
   * flags.
   */
  function aggregateTransformFlagsForNode(node: Node): TransformFlags {
    if (node === undefined) {
      return TransformFlags.None;
    }
    if (node.transformFlags & TransformFlags.HasComputedFlags) {
      return node.transformFlags & ~getTransformFlagsSubtreeExclusions(node.kind);
    }
    const subtreeFlags = aggregateTransformFlagsForSubtree(node);
    return computeTransformFlagsForNode(node, subtreeFlags);
  }

  function aggregateTransformFlagsForNodeArray(nodes: NodeArray<Node>): TransformFlags {
    if (nodes === undefined) {
      return TransformFlags.None;
    }
    let subtreeFlags = TransformFlags.None;
    let nodeArrayFlags = TransformFlags.None;
    for (const node of nodes) {
      subtreeFlags |= aggregateTransformFlagsForNode(node);
      nodeArrayFlags |= node.transformFlags & ~TransformFlags.HasComputedFlags;
    }
    nodes.transformFlags = nodeArrayFlags | TransformFlags.HasComputedFlags;
    return subtreeFlags;
  }

  /**
   * Aggregates the transform flags for the subtree of a node.
   */
  function aggregateTransformFlagsForSubtree(node: Node): TransformFlags {
    // We do not transform ambient declarations or types, so there is no need to
    // recursively aggregate transform flags.
    if (hasSyntacticModifier(node, ModifierFlags.Ambient) || (isTypeNode(node) && node.kind !== Syntax.ExpressionWithTypeArguments)) {
      return TransformFlags.None;
    }

    // Aggregate the transform flags of each child.
    return reduceEachChild(node, TransformFlags.None, aggregateTransformFlagsForChildNode, aggregateTransformFlagsForChildNodes);
  }

  /**
   * Aggregates the TransformFlags of a child node with the TransformFlags of its
   * siblings.
   */
  function aggregateTransformFlagsForChildNode(transformFlags: TransformFlags, node: Node): TransformFlags {
    return transformFlags | aggregateTransformFlagsForNode(node);
  }

  function aggregateTransformFlagsForChildNodes(transformFlags: TransformFlags, nodes: NodeArray<Node>): TransformFlags {
    return transformFlags | aggregateTransformFlagsForNodeArray(nodes);
  }
}
