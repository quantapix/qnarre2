namespace core {
  const USE_NEW_TYPE_METADATA_FORMAT = false;

  const enum TypeScriptSubstitutionFlags {
    ClassAliases = 1 << 0,

    NamespaceExports = 1 << 1,
    /* Enables substitutions for unqualified enum members */
    NonQualifiedEnumMembers = 1 << 3,
  }

  const enum ClassFacts {
    None = 0,
    HasStaticInitializedProperties = 1 << 0,
    HasConstructorDecorators = 1 << 1,
    HasMemberDecorators = 1 << 2,
    IsExportOfNamespace = 1 << 3,
    IsNamedExternalExport = 1 << 4,
    IsDefaultExternalExport = 1 << 5,
    IsDerivedClass = 1 << 6,
    UseImmediatelyInvokedFunctionExpression = 1 << 7,

    HasAnyDecorators = HasConstructorDecorators | HasMemberDecorators,
    NeedsName = HasStaticInitializedProperties | HasMemberDecorators,
    MayNeedImmediatelyInvokedFunctionExpression = HasAnyDecorators | HasStaticInitializedProperties,
    IsExported = IsExportOfNamespace | IsDefaultExternalExport | IsNamedExternalExport,
  }

  export function transformTypeScript(context: TransformationContext) {
    const { startLexicalEnvironment, resumeLexicalEnvironment, endLexicalEnvironment, hoistVariableDeclaration } = context;

    const resolver = context.getEmitResolver();
    const compilerOptions = context.getCompilerOptions();
    const strictNullChecks = getStrictOptionValue(compilerOptions, 'strictNullChecks');
    const languageVersion = getEmitScriptTarget(compilerOptions);
    const moduleKind = getEmitModuleKind(compilerOptions);

    // Save the previous transformation hooks.
    const previousOnEmitNode = context.onEmitNode;
    const previousOnSubstituteNode = context.onSubstituteNode;

    // Set new transformation hooks.
    context.onEmitNode = onEmitNode;
    context.onSubstituteNode = onSubstituteNode;

    // Enable substitution for property/element access to emit const enum values.
    context.enableSubstitution(Syntax.PropertyAccessExpression);
    context.enableSubstitution(Syntax.ElementAccessExpression);

    // These variables contain state that changes as we descend into the tree.
    let currentSourceFile: SourceFile;
    let currentNamespace: ModuleDeclaration;
    let currentNamespaceContainerName: Identifier;
    let currentLexicalScope: SourceFile | Block | ModuleBlock | CaseBlock;
    let currentNameScope: ClassDeclaration | undefined;
    let currentScopeFirstDeclarationsOfName: UnderscoreEscapedMap<Node> | undefined;
    let currentClassHasParameterProperties: boolean | undefined;

    let enabledSubstitutions: TypeScriptSubstitutionFlags;

    let classAliases: Identifier[];

    let applicableSubstitutions: TypeScriptSubstitutionFlags;

    return transformSourceFileOrBundle;

    function transformSourceFileOrBundle(node: SourceFile | Bundle) {
      if (node.kind === Syntax.Bundle) {
        return transformBundle(node);
      }
      return transformSourceFile(node);
    }

    function transformBundle(node: Bundle) {
      return createBundle(
        node.sourceFiles.map(transformSourceFile),
        mapDefined(node.prepends, (prepend) => {
          if (prepend.kind === Syntax.InputFiles) {
            return createUnparsedSourceFile(prepend, 'js');
          }
          return prepend;
        })
      );
    }

    function transformSourceFile(node: SourceFile) {
      if (node.isDeclarationFile) {
        return node;
      }

      currentSourceFile = node;

      const visited = saveStateAndInvoke(node, visitSourceFile);
      addEmitHelpers(visited, context.readEmitHelpers());

      currentSourceFile = undefined!;
      return visited;
    }

    function saveStateAndInvoke<T>(node: Node, f: (node: Node) => T): T {
      // Save state
      const savedCurrentScope = currentLexicalScope;
      const savedCurrentNameScope = currentNameScope;
      const savedCurrentScopeFirstDeclarationsOfName = currentScopeFirstDeclarationsOfName;
      const savedCurrentClassHasParameterProperties = currentClassHasParameterProperties;

      // Handle state changes before visiting a node.
      onBeforeVisitNode(node);

      const visited = f(node);

      // Restore state
      if (currentLexicalScope !== savedCurrentScope) {
        currentScopeFirstDeclarationsOfName = savedCurrentScopeFirstDeclarationsOfName;
      }

      currentLexicalScope = savedCurrentScope;
      currentNameScope = savedCurrentNameScope;
      currentClassHasParameterProperties = savedCurrentClassHasParameterProperties;
      return visited;
    }

    function onBeforeVisitNode(node: Node) {
      switch (node.kind) {
        case Syntax.SourceFile:
        case Syntax.CaseBlock:
        case Syntax.ModuleBlock:
        case Syntax.Block:
          currentLexicalScope = <SourceFile | CaseBlock | ModuleBlock | Block>node;
          currentNameScope = undefined;
          currentScopeFirstDeclarationsOfName = undefined;
          break;

        case Syntax.ClassDeclaration:
        case Syntax.FunctionDeclaration:
          if (hasSyntacticModifier(node, ModifierFlags.Ambient)) {
            break;
          }

          // Record these declarations provided that they have a name.
          if ((node as ClassDeclaration | FunctionDeclaration).name) {
            recordEmittedDeclarationInScope(node as ClassDeclaration | FunctionDeclaration);
          } else {
            // These nodes should always have names unless they are default-exports;
            // however, class declaration parsing allows for undefined names, so syntactically invalid
            // programs may also have an undefined name.
            assert(node.kind === Syntax.ClassDeclaration || hasSyntacticModifier(node, ModifierFlags.Default));
          }
          if (Node.is.kind(ClassDeclaration, node)) {
            // XXX: should probably also cover interfaces and type aliases that can have type variables?
            currentNameScope = node;
          }

          break;
      }
    }

    function visitor(node: Node): VisitResult<Node> {
      return saveStateAndInvoke(node, visitorWorker);
    }

    function visitorWorker(node: Node): VisitResult<Node> {
      if (node.transformFlags & TransformFlags.ContainsTypeScript) {
        return visitTypeScript(node);
      }
      return node;
    }

    function sourceElementVisitor(node: Node): VisitResult<Node> {
      return saveStateAndInvoke(node, sourceElementVisitorWorker);
    }

    function sourceElementVisitorWorker(node: Node): VisitResult<Node> {
      switch (node.kind) {
        case Syntax.ImportDeclaration:
        case Syntax.ImportEqualsDeclaration:
        case Syntax.ExportAssignment:
        case Syntax.ExportDeclaration:
          return visitEllidableStatement(<ImportDeclaration | ImportEqualsDeclaration | ExportAssignment | ExportDeclaration>node);
        default:
          return visitorWorker(node);
      }
    }

    function visitEllidableStatement(node: ImportDeclaration | ImportEqualsDeclaration | ExportAssignment | ExportDeclaration): VisitResult<Node> {
      const parsed = Node.get.parseTreeOf(node);
      if (parsed !== node) {
        if (node.transformFlags & TransformFlags.ContainsTypeScript) {
          // This node contains TypeScript, so we should visit its children.
          return visitEachChild(node, visitor, context);
        }
        // Otherwise, we can just return the node
        return node;
      }
      switch (node.kind) {
        case Syntax.ImportDeclaration:
          return visitImportDeclaration(node);
        case Syntax.ImportEqualsDeclaration:
          return visitImportEqualsDeclaration(node);
        case Syntax.ExportAssignment:
          return visitExportAssignment(node);
        case Syntax.ExportDeclaration:
          return visitExportDeclaration(node);
        default:
          fail('Unhandled ellided statement');
      }
    }

    function namespaceElementVisitor(node: Node): VisitResult<Node> {
      return saveStateAndInvoke(node, namespaceElementVisitorWorker);
    }

    function namespaceElementVisitorWorker(node: Node): VisitResult<Node> {
      if (
        node.kind === Syntax.ExportDeclaration ||
        node.kind === Syntax.ImportDeclaration ||
        node.kind === Syntax.ImportClause ||
        (node.kind === Syntax.ImportEqualsDeclaration && (<ImportEqualsDeclaration>node).moduleReference.kind === Syntax.ExternalModuleReference)
      ) {
        // do not emit ES6 imports and exports since they are illegal inside a namespace
        return;
      } else if (node.transformFlags & TransformFlags.ContainsTypeScript || hasSyntacticModifier(node, ModifierFlags.Export)) {
        return visitTypeScript(node);
      }

      return node;
    }

    function classElementVisitor(node: Node): VisitResult<Node> {
      return saveStateAndInvoke(node, classElementVisitorWorker);
    }

    function classElementVisitorWorker(node: Node): VisitResult<Node> {
      switch (node.kind) {
        case Syntax.Constructor:
          return visitConstructor(node as ConstructorDeclaration);

        case Syntax.PropertyDeclaration:
          // Property declarations are not TypeScript syntax, but they must be visited
          // for the decorator transformation.
          return visitPropertyDeclaration(node as PropertyDeclaration);
        case Syntax.IndexSignature:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
        case Syntax.MethodDeclaration:
          // Fallback to the default visit behavior.
          return visitorWorker(node);

        case Syntax.SemicolonClassElement:
          return node;

        default:
          return Debug.failBadSyntax(node);
      }
    }

    function modifierVisitor(node: Node): VisitResult<Node> {
      if (syntax.get.modifierFlag(node.kind) & ModifierFlags.TypeScriptModifier) {
        return;
      } else if (currentNamespace && node.kind === Syntax.ExportKeyword) {
        return;
      }

      return node;
    }

    function visitTypeScript(node: Node): VisitResult<Node> {
      if (Node.is.statement(node) && hasSyntacticModifier(node, ModifierFlags.Ambient)) {
        // TypeScript ambient declarations are elided, but some comments may be preserved.
        // See the implementation of `getLeadingComments` in comments.ts for more details.
        return createNotEmittedStatement(node);
      }

      switch (node.kind) {
        case Syntax.ExportKeyword:
        case Syntax.DefaultKeyword:
          // ES6 export and default modifiers are elided when inside a namespace.
          return currentNamespace ? undefined : node;

        case Syntax.PublicKeyword:
        case Syntax.PrivateKeyword:
        case Syntax.ProtectedKeyword:
        case Syntax.AbstractKeyword:
        case Syntax.ConstKeyword:
        case Syntax.DeclareKeyword:
        case Syntax.ReadonlyKeyword:
        // TypeScript accessibility and readonly modifiers are elided
        // falls through
        case Syntax.ArrayType:
        case Syntax.TupleType:
        case Syntax.OptionalType:
        case Syntax.RestType:
        case Syntax.TypeLiteral:
        case Syntax.TypePredicate:
        case Syntax.TypeParameter:
        case Syntax.AnyKeyword:
        case Syntax.UnknownKeyword:
        case Syntax.BooleanKeyword:
        case Syntax.StringKeyword:
        case Syntax.NumberKeyword:
        case Syntax.NeverKeyword:
        case Syntax.VoidKeyword:
        case Syntax.SymbolKeyword:
        case Syntax.ConstructorType:
        case Syntax.FunctionType:
        case Syntax.TypeQuery:
        case Syntax.TypeReference:
        case Syntax.UnionType:
        case Syntax.IntersectionType:
        case Syntax.ConditionalType:
        case Syntax.ParenthesizedType:
        case Syntax.ThisType:
        case Syntax.TypeOperator:
        case Syntax.IndexedAccessType:
        case Syntax.MappedType:
        case Syntax.LiteralType:
        // TypeScript type nodes are elided.
        // falls through

        case Syntax.IndexSignature:
        // TypeScript index signatures are elided.
        // falls through

        case Syntax.Decorator:
        // TypeScript decorators are elided. They will be emitted as part of visitClassDeclaration.
        // falls through

        case Syntax.TypeAliasDeclaration:
          // TypeScript type-only declarations are elided.
          return;

        case Syntax.PropertyDeclaration:
          // TypeScript property declarations are elided. However their names are still visited, and can potentially be retained if they could have sideeffects
          return visitPropertyDeclaration(node as PropertyDeclaration);

        case Syntax.NamespaceExportDeclaration:
          // TypeScript namespace export declarations are elided.
          return;

        case Syntax.Constructor:
          return visitConstructor(<ConstructorDeclaration>node);

        case Syntax.InterfaceDeclaration:
          // TypeScript interfaces are elided, but some comments may be preserved.
          // See the implementation of `getLeadingComments` in comments.ts for more details.
          return createNotEmittedStatement(node);

        case Syntax.ClassDeclaration:
          // This may be a class declaration with TypeScript syntax extensions.
          //
          // TypeScript class syntax extensions include:
          // - decorators
          // - optional `implements` heritage clause
          // - parameter property assignments in the constructor
          // - index signatures
          // - method overload signatures
          return visitClassDeclaration(<ClassDeclaration>node);

        case Syntax.ClassExpression:
          // This may be a class expression with TypeScript syntax extensions.
          //
          // TypeScript class syntax extensions include:
          // - decorators
          // - optional `implements` heritage clause
          // - parameter property assignments in the constructor
          // - index signatures
          // - method overload signatures
          return visitClassExpression(<ClassExpression>node);

        case Syntax.HeritageClause:
          // This may be a heritage clause with TypeScript syntax extensions.
          //
          // TypeScript heritage clause extensions include:
          // - `implements` clause
          return visitHeritageClause(<HeritageClause>node);

        case Syntax.ExpressionWithTypeArguments:
          // TypeScript supports type arguments on an expression in an `extends` heritage clause.
          return visitExpressionWithTypeArguments(<ExpressionWithTypeArguments>node);

        case Syntax.MethodDeclaration:
          // TypeScript method declarations may have decorators, modifiers
          // or type annotations.
          return visitMethodDeclaration(<MethodDeclaration>node);

        case Syntax.GetAccessor:
          // Get Accessors can have TypeScript modifiers, decorators, and type annotations.
          return visitGetAccessor(<GetAccessorDeclaration>node);

        case Syntax.SetAccessor:
          // Set Accessors can have TypeScript modifiers and type annotations.
          return visitSetAccessor(<SetAccessorDeclaration>node);

        case Syntax.FunctionDeclaration:
          // Typescript function declarations can have modifiers, decorators, and type annotations.
          return visitFunctionDeclaration(<FunctionDeclaration>node);

        case Syntax.FunctionExpression:
          // TypeScript function expressions can have modifiers and type annotations.
          return visitFunctionExpression(<FunctionExpression>node);

        case Syntax.ArrowFunction:
          // TypeScript arrow functions can have modifiers and type annotations.
          return visitArrowFunction(<ArrowFunction>node);

        case Syntax.Parameter:
          // This may be a parameter declaration with TypeScript syntax extensions.
          //
          // TypeScript parameter declaration syntax extensions include:
          // - decorators
          // - accessibility modifiers
          // - the question mark (?) token for optional parameters
          // - type annotations
          // - this parameters
          return visitParameter(<ParameterDeclaration>node);

        case Syntax.ParenthesizedExpression:
          // ParenthesizedExpressions are TypeScript if their expression is a
          // TypeAssertion or AsExpression
          return visitParenthesizedExpression(<ParenthesizedExpression>node);

        case Syntax.TypeAssertionExpression:
        case Syntax.AsExpression:
          // TypeScript type assertions are removed, but their subtrees are preserved.
          return visitAssertionExpression(<AssertionExpression>node);

        case Syntax.CallExpression:
          return visitCallExpression(<CallExpression>node);

        case Syntax.NewExpression:
          return visitNewExpression(<NewExpression>node);

        case Syntax.TaggedTemplateExpression:
          return visitTaggedTemplateExpression(<TaggedTemplateExpression>node);

        case Syntax.NonNullExpression:
          // TypeScript non-null expressions are removed, but their subtrees are preserved.
          return visitNonNullExpression(<NonNullExpression>node);

        case Syntax.EnumDeclaration:
          // TypeScript enum declarations do not exist in ES6 and must be rewritten.
          return visitEnumDeclaration(<EnumDeclaration>node);

        case Syntax.VariableStatement:
          // TypeScript namespace exports for variable statements must be transformed.
          return visitVariableStatement(<VariableStatement>node);

        case Syntax.VariableDeclaration:
          return visitVariableDeclaration(<VariableDeclaration>node);

        case Syntax.ModuleDeclaration:
          // TypeScript namespace declarations must be transformed.
          return visitModuleDeclaration(<ModuleDeclaration>node);

        case Syntax.ImportEqualsDeclaration:
          // TypeScript namespace or external module import.
          return visitImportEqualsDeclaration(<ImportEqualsDeclaration>node);

        case Syntax.JsxSelfClosingElement:
          return visitJsxSelfClosingElement(<JsxSelfClosingElement>node);

        case Syntax.JsxOpeningElement:
          return visitJsxJsxOpeningElement(<JsxOpeningElement>node);

        default:
          // node contains some other TypeScript syntax
          return visitEachChild(node, visitor, context);
      }
    }

    function visitSourceFile(node: SourceFile) {
      const alwaysStrict = getStrictOptionValue(compilerOptions, 'alwaysStrict') && !(qp_isExternalModule(node) && moduleKind >= ModuleKind.ES2015) && !isJsonSourceFile(node);

      return qp_updateSourceNode(node, visitLexicalEnvironment(node.statements, sourceElementVisitor, context, /*start*/ 0, alwaysStrict));
    }

    function shouldEmitDecorateCallForClass(node: ClassDeclaration) {
      if (node.decorators && node.decorators.length > 0) {
        return true;
      }

      const constructor = getFirstConstructorWithBody(node);
      if (constructor) {
        return forEach(constructor.parameters, shouldEmitDecorateCallForParameter);
      }

      return false;
    }

    function shouldEmitDecorateCallForParameter(parameter: ParameterDeclaration) {
      return parameter.decorators !== undefined && parameter.decorators.length > 0;
    }

    function getClassFacts(node: ClassDeclaration, staticProperties: readonly PropertyDeclaration[]) {
      let facts = ClassFacts.None;
      if (some(staticProperties)) facts |= ClassFacts.HasStaticInitializedProperties;
      const extendsClauseElement = getEffectiveBaseTypeNode(node);
      if (extendsClauseElement && skipOuterExpressions(extendsClauseElement.expression).kind !== Syntax.NullKeyword) facts |= ClassFacts.IsDerivedClass;
      if (shouldEmitDecorateCallForClass(node)) facts |= ClassFacts.HasConstructorDecorators;
      if (childIsDecorated(node)) facts |= ClassFacts.HasMemberDecorators;
      if (isExportOfNamespace(node)) facts |= ClassFacts.IsExportOfNamespace;
      else if (isDefaultExternalModuleExport(node)) facts |= ClassFacts.IsDefaultExternalExport;
      else if (isNamedExternalModuleExport(node)) facts |= ClassFacts.IsNamedExternalExport;
      if (languageVersion <= ScriptTarget.ES5 && facts & ClassFacts.MayNeedImmediatelyInvokedFunctionExpression) facts |= ClassFacts.UseImmediatelyInvokedFunctionExpression;
      return facts;
    }

    function hasTypeScriptClassSyntax(node: Node) {
      return !!(node.transformFlags & TransformFlags.ContainsTypeScriptClassSyntax);
    }

    function isClassLikeDeclarationWithTypeScriptSyntax(node: ClassLikeDeclaration) {
      return some(node.decorators) || some(node.typeParameters) || some(node.heritageClauses, hasTypeScriptClassSyntax) || some(node.members, hasTypeScriptClassSyntax);
    }

    function visitClassDeclaration(node: ClassDeclaration): VisitResult<Statement> {
      if (!isClassLikeDeclarationWithTypeScriptSyntax(node) && !(currentNamespace && hasSyntacticModifier(node, ModifierFlags.Export))) {
        return visitEachChild(node, visitor, context);
      }

      const staticProperties = getProperties(node, /*requireInitializer*/ true, /*isStatic*/ true);
      const facts = getClassFacts(node, staticProperties);

      if (facts & ClassFacts.UseImmediatelyInvokedFunctionExpression) {
        context.startLexicalEnvironment();
      }

      const name = node.name || (facts & ClassFacts.NeedsName ? getGeneratedNameForNode(node) : undefined);
      const classStatement = facts & ClassFacts.HasConstructorDecorators ? createClassDeclarationHeadWithDecorators(node, name) : createClassDeclarationHeadWithoutDecorators(node, name, facts);

      let statements: Statement[] = [classStatement];

      // Write any decorators of the node.
      addClassElementDecorationStatements(statements, node, /*isStatic*/ false);
      addClassElementDecorationStatements(statements, node, /*isStatic*/ true);
      addConstructorDecorationStatement(statements, node);

      if (facts & ClassFacts.UseImmediatelyInvokedFunctionExpression) {
        // When we emit a TypeScript class down to ES5, we must wrap it in an IIFE so that the
        // 'es2015' transformer can properly nest static initializers and decorators. The result
        // looks something like:
        //
        //  var C = function () {
        //      class C {
        //      }
        //      C.static_prop = 1;
        //      return C;
        //  }();
        //
        const closingBraceLocation = createTokenRange(syntax.skipTrivia(currentSourceFile.text, node.members.end), Syntax.CloseBraceToken);
        const localName = getInternalName(node);

        // The following partially-emitted expression exists purely to align our sourcemap
        // emit with the original emitter.
        const outer = new qs.PartiallyEmittedExpression(localName);
        outer.end = closingBraceLocation.end;
        setEmitFlags(outer, EmitFlags.NoComments);

        const statement = createReturn(outer);
        statement.pos = closingBraceLocation.pos;
        setEmitFlags(statement, EmitFlags.NoComments | EmitFlags.NoTokenSourceMaps);
        statements.push(statement);

        insertStatementsAfterStandardPrologue(statements, context.endLexicalEnvironment());

        const iife = qs.CallExpression.immediateArrowFunction(statements);
        setEmitFlags(iife, EmitFlags.TypeScriptClassWrapper);

        const varStatement = createVariableStatement(undefined, createVariableDeclarationList([createVariableDeclaration(getLocalName(node, false, false), undefined, iife)]));

        setOriginalNode(varStatement, node);
        setCommentRange(varStatement, node);
        setSourceMapRange(varStatement, moveRangePastDecorators(node));
        startOnNewLine(varStatement);
        statements = [varStatement];
      }

      // If the class is exported as part of a TypeScript namespace, emit the namespace export.
      // Otherwise, if the class was exported at the top level and was decorated, emit an export
      // declaration or export default for the class.
      if (facts & ClassFacts.IsExportOfNamespace) {
        addExportMemberAssignment(statements, node);
      } else if (facts & ClassFacts.UseImmediatelyInvokedFunctionExpression || facts & ClassFacts.HasConstructorDecorators) {
        if (facts & ClassFacts.IsDefaultExternalExport) {
          statements.push(createExportDefault(getLocalName(node, false, true)));
        } else if (facts & ClassFacts.IsNamedExternalExport) {
          statements.push(createExternalModuleExport(getLocalName(node, false, true)));
        }
      }

      if (statements.length > 1) {
        // Add a DeclarationMarker as a marker for the end of the declaration
        statements.push(createEndOfDeclarationMarker(node));
        setEmitFlags(classStatement, Node.get.emitFlags(classStatement) | EmitFlags.HasEndOfDeclarationMarker);
      }

      return singleOrMany(statements);
    }

    function createClassDeclarationHeadWithoutDecorators(node: ClassDeclaration, name: Identifier | undefined, facts: ClassFacts) {
      //  ${modifiers} class ${name} ${heritageClauses} {
      //      ${members}
      //  }

      // we do not emit modifiers on the declaration if we are emitting an IIFE
      const modifiers = !(facts & ClassFacts.UseImmediatelyInvokedFunctionExpression) ? Nodes.visit(node.modifiers, modifierVisitor, isModifier) : undefined;

      const classDeclaration = createClassDeclaration(undefined, modifiers, name, undefined, Nodes.visit(node.heritageClauses, visitor, isHeritageClause), transformClassMembers(node));

      // To better align with the old emitter, we should not emit a trailing source map
      // entry if the class has static properties.
      let emitFlags = Node.get.emitFlags(node);
      if (facts & ClassFacts.HasStaticInitializedProperties) {
        emitFlags |= EmitFlags.NoTrailingSourceMap;
      }

      aggregateTransformFlags(classDeclaration);
      setRange(classDeclaration, node);
      setOriginalNode(classDeclaration, node);
      setEmitFlags(classDeclaration, emitFlags);
      return classDeclaration;
    }

    function createClassDeclarationHeadWithDecorators(node: ClassDeclaration, name: Identifier | undefined) {
      const location = moveRangePastDecorators(node);
      const classAlias = getClassAliasIfNeeded(node);
      const declName = getLocalName(node, false, true);

      const heritageClauses = Nodes.visit(node.heritageClauses, visitor, isHeritageClause);
      const members = transformClassMembers(node);
      const classExpression = createClassExpression(undefined, name, undefined, heritageClauses, members);
      aggregateTransformFlags(classExpression);
      setOriginalNode(classExpression, node);
      setRange(classExpression, location);

      const statement = createVariableStatement(
        undefined,
        createVariableDeclarationList([createVariableDeclaration(declName, undefined, classAlias ? createAssignment(classAlias, classExpression) : classExpression)], NodeFlags.Let)
      );
      setOriginalNode(statement, node);
      setRange(statement, location);
      setCommentRange(statement, node);
      return statement;
    }

    function visitClassExpression(node: ClassExpression): Expression {
      if (!isClassLikeDeclarationWithTypeScriptSyntax(node)) {
        return visitEachChild(node, visitor, context);
      }

      const classExpression = createClassExpression(undefined, node.name, undefined, Nodes.visit(node.heritageClauses, visitor, isHeritageClause), transformClassMembers(node));

      aggregateTransformFlags(classExpression);
      setOriginalNode(classExpression, node);
      setRange(classExpression, node);

      return classExpression;
    }

    function transformClassMembers(node: ClassDeclaration | ClassExpression) {
      const members: ClassElement[] = [];
      const constructor = getFirstConstructorWithBody(node);
      const parametersWithPropertyAssignments = constructor && filter(constructor.parameters, (p) => Node.is.parameterPropertyDeclaration(p, constructor));

      if (parametersWithPropertyAssignments) {
        for (const parameter of parametersWithPropertyAssignments) {
          if (Node.is.kind(Identifier, parameter.name)) {
            members.push(
              setOriginalNode(aggregateTransformFlags(PropertyDeclaration.create(undefined, undefined, parameter.name, /*questionOrExclamationToken*/ undefined, undefined, undefined)), parameter)
            );
          }
        }
      }

      addRange(members, Nodes.visit(node.members, classElementVisitor, isClassElement));
      return setRange(new Nodes(members), /*location*/ node.members);
    }

    function getDecoratedClassElements(node: ClassExpression | ClassDeclaration, isStatic: boolean): readonly ClassElement[] {
      return filter(node.members, isStatic ? (m) => isStaticDecoratedClassElement(m, node) : (m) => isInstanceDecoratedClassElement(m, node));
    }

    function isStaticDecoratedClassElement(member: ClassElement, parent: ClassLikeDeclaration) {
      return isDecoratedClassElement(member, /*isStatic*/ true, parent);
    }

    function isInstanceDecoratedClassElement(member: ClassElement, parent: ClassLikeDeclaration) {
      return isDecoratedClassElement(member, /*isStatic*/ false, parent);
    }

    function isDecoratedClassElement(member: ClassElement, isStatic: boolean, parent: ClassLikeDeclaration) {
      return nodeOrChildIsDecorated(member, parent) && isStatic === hasSyntacticModifier(member, ModifierFlags.Static);
    }

    interface AllDecorators {
      decorators: readonly Decorator[] | undefined;
      parameters?: readonly (readonly Decorator[] | undefined)[];
    }

    /**
     * Gets an array of arrays of decorators for the parameters of a function-like node.
     * The offset into the result array should correspond to the offset of the parameter.
     *
     * @param node The function-like node.
     */
    function getDecoratorsOfParameters(node: FunctionLikeDeclaration | undefined) {
      let decorators: (readonly Decorator[] | undefined)[] | undefined;
      if (node) {
        const parameters = node.parameters;
        const firstParameterIsThis = parameters.length > 0 && parameterIsThsyntax.is.keyword(parameters[0]);
        const firstParameterOffset = firstParameterIsThis ? 1 : 0;
        const numParameters = firstParameterIsThis ? parameters.length - 1 : parameters.length;
        for (let i = 0; i < numParameters; i++) {
          const parameter = parameters[i + firstParameterOffset];
          if (decorators || parameter.decorators) {
            if (!decorators) {
              decorators = new Array(numParameters);
            }

            decorators[i] = parameter.decorators;
          }
        }
      }

      return decorators;
    }

    /** * Gets an AllDecorators object containing the decorators for the class and the decorators for the
     * parameters of the constructor of the class.
     *
     * @param node The class node.
     */
    function getAllDecoratorsOfConstructor(node: ClassExpression | ClassDeclaration): AllDecorators | undefined {
      const decorators = node.decorators;
      const parameters = getDecoratorsOfParameters(getFirstConstructorWithBody(node));
      if (!decorators && !parameters) {
        return;
      }

      return {
        decorators,
        parameters,
      };
    }

    /**
     * Gets an AllDecorators object containing the decorators for the member and its parameters.
     *
     * @param node The class node that contains the member.
     * @param member The class member.
     */
    function getAllDecoratorsOfClassElement(node: ClassExpression | ClassDeclaration, member: ClassElement): AllDecorators | undefined {
      switch (member.kind) {
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          return getAllDecoratorsOfAccessors(node, <AccessorDeclaration>member);

        case Syntax.MethodDeclaration:
          return getAllDecoratorsOfMethod(<MethodDeclaration>member);

        case Syntax.PropertyDeclaration:
          return getAllDecoratorsOfProperty(<PropertyDeclaration>member);

        default:
          return;
      }
    }

    /**
     * Gets an AllDecorators object containing the decorators for the accessor and its parameters.
     *
     * @param node The class node that contains the accessor.
     * @param accessor The class accessor member.
     */
    function getAllDecoratorsOfAccessors(node: ClassExpression | ClassDeclaration, accessor: AccessorDeclaration): AllDecorators | undefined {
      if (!accessor.body) {
        return;
      }

      const { firstAccessor, secondAccessor, setAccessor } = getAllAccessorDeclarations(node.members, accessor);
      const firstAccessorWithDecorators = firstAccessor.decorators ? firstAccessor : secondAccessor && secondAccessor.decorators ? secondAccessor : undefined;
      if (!firstAccessorWithDecorators || accessor !== firstAccessorWithDecorators) {
        return;
      }

      const decorators = firstAccessorWithDecorators.decorators;
      const parameters = getDecoratorsOfParameters(setAccessor);
      if (!decorators && !parameters) {
        return;
      }

      return { decorators, parameters };
    }

    /**
     * Gets an AllDecorators object containing the decorators for the method and its parameters.
     *
     * @param method The class method member.
     */
    function getAllDecoratorsOfMethod(method: MethodDeclaration): AllDecorators | undefined {
      if (!method.body) {
        return;
      }

      const decorators = method.decorators;
      const parameters = getDecoratorsOfParameters(method);
      if (!decorators && !parameters) {
        return;
      }

      return { decorators, parameters };
    }

    /**
     * Gets an AllDecorators object containing the decorators for the property.
     *
     * @param property The class property member.
     */
    function getAllDecoratorsOfProperty(property: PropertyDeclaration): AllDecorators | undefined {
      const decorators = property.decorators;
      if (!decorators) {
        return;
      }

      return { decorators };
    }

    /**
     * Transforms all of the decorators for a declaration into an array of expressions.
     *
     * @param node The declaration node.
     * @param allDecorators An object containing all of the decorators for the declaration.
     */
    function transformAllDecoratorsOfDeclaration(node: Declaration, container: ClassLikeDeclaration, allDecorators: AllDecorators | undefined) {
      if (!allDecorators) {
        return;
      }

      const decoratorExpressions: Expression[] = [];
      addRange(decoratorExpressions, map(allDecorators.decorators, transformDecorator));
      addRange(decoratorExpressions, flatMap(allDecorators.parameters, transformDecoratorsOfParameter));
      addTypeMetadata(node, container, decoratorExpressions);
      return decoratorExpressions;
    }

    /**
     * Generates statements used to apply decorators to either the static or instance members
     * of a class.
     *
     * @param node The class node.
     * @param isStatic A value indicating whether to generate statements for static or
     *                 instance members.
     */
    function addClassElementDecorationStatements(statements: Statement[], node: ClassDeclaration, isStatic: boolean) {
      addRange(statements, map(generateClassElementDecorationExpressions(node, isStatic), expressionToStatement));
    }

    /**
     * Generates expressions used to apply decorators to either the static or instance members
     * of a class.
     *
     * @param node The class node.
     * @param isStatic A value indicating whether to generate expressions for static or
     *                 instance members.
     */
    function generateClassElementDecorationExpressions(node: ClassExpression | ClassDeclaration, isStatic: boolean) {
      const members = getDecoratedClassElements(node, isStatic);
      let expressions: Expression[] | undefined;
      for (const member of members) {
        const expression = generateClassElementDecorationExpression(node, member);
        if (expression) {
          if (!expressions) {
            expressions = [expression];
          } else {
            expressions.push(expression);
          }
        }
      }
      return expressions;
    }

    /**
     * Generates an expression used to evaluate class element decorators at runtime.
     *
     * @param node The class node that contains the member.
     * @param member The class member.
     */
    function generateClassElementDecorationExpression(node: ClassExpression | ClassDeclaration, member: ClassElement) {
      const allDecorators = getAllDecoratorsOfClassElement(node, member);
      const decoratorExpressions = transformAllDecoratorsOfDeclaration(member, node, allDecorators);
      if (!decoratorExpressions) {
        return;
      }

      // Emit the call to __decorate. Given the following:
      //
      //   class C {
      //     @dec method(@dec2 x) {}
      //     @dec get accessor() {}
      //     @dec prop;
      //   }
      //
      // The emit for a method is:
      //
      //   __decorate([
      //       dec,
      //       __param(0, dec2),
      //       __metadata("design:type", Function),
      //       __metadata("design:paramtypes", [Object]),
      //       __metadata("design:returntype", void 0)
      //   ], C.prototype, "method", null);
      //
      // The emit for an accessor is:
      //
      //   __decorate([
      //       dec
      //   ], C.prototype, "accessor", null);
      //
      // The emit for a property is:
      //
      //   __decorate([
      //       dec
      //   ], C.prototype, "prop");
      //

      const prefix = getClassMemberPrefix(node, member);
      const memberName = getExpressionForPropertyName(member, /*generateNameForComputedPropertyName*/ true);
      const descriptor =
        languageVersion > ScriptTarget.ES3
          ? member.kind === Syntax.PropertyDeclaration
            ? // We emit `void 0` here to indicate to `__decorate` that it can invoke `Object.defineProperty` directly, but that it
              // should not invoke `Object.getOwnPropertyDescriptor`.
              qs.VoidExpression.zero()
            : // We emit `null` here to indicate to `__decorate` that it can invoke `Object.getOwnPropertyDescriptor` directly.
              // We have this extra argument here so that we can inject an explicit property descriptor at a later date.
              createNull()
          : undefined;

      const helper = createDecorateHelper(context, decoratorExpressions, prefix, memberName, descriptor, moveRangePastDecorators(member));

      setEmitFlags(helper, EmitFlags.NoComments);
      return helper;
    }

    /**
     * Generates a __decorate helper call for a class constructor.
     *
     * @param node The class node.
     */
    function addConstructorDecorationStatement(statements: Statement[], node: ClassDeclaration) {
      const expression = generateConstructorDecorationExpression(node);
      if (expression) {
        statements.push(setOriginalNode(createExpressionStatement(expression), node));
      }
    }

    /**
     * Generates a __decorate helper call for a class constructor.
     *
     * @param node The class node.
     */
    function generateConstructorDecorationExpression(node: ClassExpression | ClassDeclaration) {
      const allDecorators = getAllDecoratorsOfConstructor(node);
      const decoratorExpressions = transformAllDecoratorsOfDeclaration(node, node, allDecorators);
      if (!decoratorExpressions) {
        return;
      }

      const classAlias = classAliases && classAliases[getOriginalNodeId(node)];
      const localName = getLocalName(node, false, true);
      const decorate = createDecorateHelper(context, decoratorExpressions, localName);
      const expression = createAssignment(localName, classAlias ? createAssignment(classAlias, decorate) : decorate);
      setEmitFlags(expression, EmitFlags.NoComments);
      setSourceMapRange(expression, moveRangePastDecorators(node));
      return expression;
    }

    /**
     * Transforms a decorator into an expression.
     *
     * @param decorator The decorator node.
     */
    function transformDecorator(decorator: Decorator) {
      return visitNode(decorator.expression, visitor, isExpression);
    }

    /**
     * Transforms the decorators of a parameter.
     *
     * @param decorators The decorators for the parameter at the provided offset.
     * @param parameterOffset The offset of the parameter.
     */
    function transformDecoratorsOfParameter(decorators: Decorator[], parameterOffset: number) {
      let expressions: Expression[] | undefined;
      if (decorators) {
        expressions = [];
        for (const decorator of decorators) {
          const helper = createParamHelper(context, transformDecorator(decorator), parameterOffset, /*location*/ decorator.expression);
          setEmitFlags(helper, EmitFlags.NoComments);
          expressions.push(helper);
        }
      }

      return expressions;
    }

    /**
     * Adds optional type metadata for a declaration.
     *
     * @param node The declaration node.
     * @param decoratorExpressions The destination array to which to add new decorator expressions.
     */
    function addTypeMetadata(node: Declaration, container: ClassLikeDeclaration, decoratorExpressions: Expression[]) {
      if (USE_NEW_TYPE_METADATA_FORMAT) {
        addNewTypeMetadata(node, container, decoratorExpressions);
      } else {
        addOldTypeMetadata(node, container, decoratorExpressions);
      }
    }

    function addOldTypeMetadata(node: Declaration, container: ClassLikeDeclaration, decoratorExpressions: Expression[]) {
      if (compilerOptions.emitDecoratorMetadata) {
        if (shouldAddTypeMetadata(node)) {
          decoratorExpressions.push(createMetadataHelper(context, 'design:type', serializeTypeOfNode(node)));
        }
        if (shouldAddParamTypesMetadata(node)) {
          decoratorExpressions.push(createMetadataHelper(context, 'design:paramtypes', serializeParameterTypesOfNode(node, container)));
        }
        if (shouldAddReturnTypeMetadata(node)) {
          decoratorExpressions.push(createMetadataHelper(context, 'design:returntype', serializeReturnTypeOfNode(node)));
        }
      }
    }

    function addNewTypeMetadata(node: Declaration, container: ClassLikeDeclaration, decoratorExpressions: Expression[]) {
      if (compilerOptions.emitDecoratorMetadata) {
        let properties: ObjectLiteralElementLike[] | undefined;
        if (shouldAddTypeMetadata(node)) {
          (properties || (properties = [])).push(
            createPropertyAssignment('type', new ArrowFunction(undefined, undefined, [], undefined, new Token(Syntax.EqualsGreaterThanToken), serializeTypeOfNode(node)))
          );
        }
        if (shouldAddParamTypesMetadata(node)) {
          (properties || (properties = [])).push(
            createPropertyAssignment('paramTypes', new ArrowFunction(undefined, undefined, [], undefined, new Token(Syntax.EqualsGreaterThanToken), serializeParameterTypesOfNode(node, container)))
          );
        }
        if (shouldAddReturnTypeMetadata(node)) {
          (properties || (properties = [])).push(
            createPropertyAssignment('returnType', new ArrowFunction(undefined, undefined, [], undefined, new Token(Syntax.EqualsGreaterThanToken), serializeReturnTypeOfNode(node)))
          );
        }
        if (properties) {
          decoratorExpressions.push(createMetadataHelper(context, 'design:typeinfo', createObjectLiteral(properties, /*multiLine*/ true)));
        }
      }
    }

    /**
     * Determines whether to emit the "design:type" metadata based on the node's kind.
     * The caller should have already tested whether the node has decorators and whether the
     * emitDecoratorMetadata compiler option is set.
     *
     * @param node The node to test.
     */
    function shouldAddTypeMetadata(node: Declaration): boolean {
      const kind = node.kind;
      return kind === Syntax.MethodDeclaration || kind === Syntax.GetAccessor || kind === Syntax.SetAccessor || kind === Syntax.PropertyDeclaration;
    }

    /**
     * Determines whether to emit the "design:returntype" metadata based on the node's kind.
     * The caller should have already tested whether the node has decorators and whether the
     * emitDecoratorMetadata compiler option is set.
     *
     * @param node The node to test.
     */
    function shouldAddReturnTypeMetadata(node: Declaration): boolean {
      return node.kind === Syntax.MethodDeclaration;
    }

    /**
     * Determines whether to emit the "design:paramtypes" metadata based on the node's kind.
     * The caller should have already tested whether the node has decorators and whether the
     * emitDecoratorMetadata compiler option is set.
     *
     * @param node The node to test.
     */
    function shouldAddParamTypesMetadata(node: Declaration): boolean {
      switch (node.kind) {
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
          return getFirstConstructorWithBody(<ClassLikeDeclaration>node) !== undefined;
        case Syntax.MethodDeclaration:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          return true;
      }
      return false;
    }

    type SerializedEntityNameAsExpression = Identifier | BinaryExpression | PropertyAccessExpression;
    type SerializedTypeNode = SerializedEntityNameAsExpression | VoidExpression | ConditionalExpression;

    function getAccessorTypeNode(node: AccessorDeclaration) {
      const accessors = resolver.getAllAccessorDeclarations(node);
      return (accessors.setAccessor && getSetAccessorTypeAnnotationNode(accessors.setAccessor)) || (accessors.getAccessor && getEffectiveReturnTypeNode(accessors.getAccessor));
    }

    /**
     * Serializes the type of a node for use with decorator type metadata.
     *
     * @param node The node that should have its type serialized.
     */
    function serializeTypeOfNode(node: Node): SerializedTypeNode {
      switch (node.kind) {
        case Syntax.PropertyDeclaration:
        case Syntax.Parameter:
          return serializeTypeNode((<PropertyDeclaration | ParameterDeclaration | GetAccessorDeclaration>node).type);
        case Syntax.SetAccessor:
        case Syntax.GetAccessor:
          return serializeTypeNode(getAccessorTypeNode(node as AccessorDeclaration));
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
        case Syntax.MethodDeclaration:
          return new Identifier('Function');
        default:
          return qs.VoidExpression.zero();
      }
    }

    /**
     * Serializes the types of the parameters of a node for use with decorator type metadata.
     *
     * @param node The node that should have its parameter types serialized.
     */
    function serializeParameterTypesOfNode(node: Node, container: ClassLikeDeclaration): ArrayLiteralExpression {
      const valueDeclaration = Node.is.classLike(node) ? getFirstConstructorWithBody(node) : Node.is.functionLike(node) && Node.is.present((node as FunctionLikeDeclaration).body) ? node : undefined;

      const expressions: SerializedTypeNode[] = [];
      if (valueDeclaration) {
        const parameters = getParametersOfDecoratedDeclaration(valueDeclaration, container);
        const numParameters = parameters.length;
        for (let i = 0; i < numParameters; i++) {
          const parameter = parameters[i];
          if (i === 0 && Node.is.kind(Identifier, parameter.name) && parameter.name.escapedText === 'this') {
            continue;
          }
          if (parameter.dot3Token) {
            expressions.push(serializeTypeNode(getRestParameterElementType(parameter.type)));
          } else {
            expressions.push(serializeTypeOfNode(parameter));
          }
        }
      }

      return new ArrayLiteralExpression(expressions);
    }

    function getParametersOfDecoratedDeclaration(node: SignatureDeclaration, container: ClassLikeDeclaration) {
      if (container && node.kind === Syntax.GetAccessor) {
        const { setAccessor } = getAllAccessorDeclarations(container.members, <AccessorDeclaration>node);
        if (setAccessor) {
          return setAccessor.parameters;
        }
      }
      return node.parameters;
    }

    /**
     * Serializes the return type of a node for use with decorator type metadata.
     *
     * @param node The node that should have its return type serialized.
     */
    function serializeReturnTypeOfNode(node: Node): SerializedTypeNode {
      if (Node.is.functionLike(node) && node.type) {
        return serializeTypeNode(node.type);
      } else if (Node.is.asyncFunction(node)) {
        return new Identifier('Promise');
      }

      return qs.VoidExpression.zero();
    }

    /**
     * Serializes a type node for use with decorator type metadata.
     *
     * Types are serialized in the following fashion:
     * - Void types point to "undefined" (e.g. "void 0")
     * - Function and Constructor types point to the global "Function" constructor.
     * - Interface types with a call or construct signature types point to the global
     *   "Function" constructor.
     * - Array and Tuple types point to the global "Array" constructor.
     * - Type predicates and booleans point to the global "Boolean" constructor.
     * - String literal types and strings point to the global "String" constructor.
     * - Enum and number types point to the global "Number" constructor.
     * - Symbol types point to the global "Symbol" constructor.
     * - Type references to classes (or class-like variables) point to the constructor for the class.
     * - Anything else points to the global "Object" constructor.
     *
     * @param node The type node to serialize.
     */
    function serializeTypeNode(node: TypeNode | undefined): SerializedTypeNode {
      if (node === undefined) {
        return new Identifier('Object');
      }

      switch (node.kind) {
        case Syntax.VoidKeyword:
        case Syntax.UndefinedKeyword:
        case Syntax.NullKeyword:
        case Syntax.NeverKeyword:
          return qs.VoidExpression.zero();

        case Syntax.ParenthesizedType:
          return serializeTypeNode((<ParenthesizedTypeNode>node).type);

        case Syntax.FunctionType:
        case Syntax.ConstructorType:
          return new Identifier('Function');

        case Syntax.ArrayType:
        case Syntax.TupleType:
          return new Identifier('Array');

        case Syntax.TypePredicate:
        case Syntax.BooleanKeyword:
          return new Identifier('Boolean');

        case Syntax.StringKeyword:
          return new Identifier('String');

        case Syntax.ObjectKeyword:
          return new Identifier('Object');

        case Syntax.LiteralType:
          switch ((<LiteralTypeNode>node).literal.kind) {
            case Syntax.StringLiteral:
              return new Identifier('String');

            case Syntax.PrefixUnaryExpression:
            case Syntax.NumericLiteral:
              return new Identifier('Number');

            case Syntax.BigIntLiteral:
              return getGlobalBigIntNameWithFallback();

            case Syntax.TrueKeyword:
            case Syntax.FalseKeyword:
              return new Identifier('Boolean');

            default:
              return Debug.failBadSyntax((<LiteralTypeNode>node).literal);
          }

        case Syntax.NumberKeyword:
          return new Identifier('Number');

        case Syntax.BigIntKeyword:
          return getGlobalBigIntNameWithFallback();

        case Syntax.SymbolKeyword:
          return languageVersion < ScriptTarget.ES2015 ? getGlobalSymbolNameWithFallback() : new Identifier('Symbol');

        case Syntax.TypeReference:
          return serializeTypeReferenceNode(<TypeReferenceNode>node);

        case Syntax.IntersectionType:
        case Syntax.UnionType:
          return serializeTypeList((<UnionOrIntersectionTypeNode>node).types);

        case Syntax.ConditionalType:
          return serializeTypeList([(<ConditionalTypeNode>node).trueType, (<ConditionalTypeNode>node).falseType]);

        case Syntax.TypeOperator:
          if ((<TypeOperatorNode>node).operator === Syntax.ReadonlyKeyword) {
            return serializeTypeNode((<TypeOperatorNode>node).type);
          }
          break;

        case Syntax.TypeQuery:
        case Syntax.IndexedAccessType:
        case Syntax.MappedType:
        case Syntax.TypeLiteral:
        case Syntax.AnyKeyword:
        case Syntax.UnknownKeyword:
        case Syntax.ThisType:
        case Syntax.ImportType:
          break;

        // handle JSDoc types from an invalid parse
        case Syntax.JSDocAllType:
        case Syntax.JSDocUnknownType:
        case Syntax.JSDocFunctionType:
        case Syntax.JSDocVariadicType:
        case Syntax.JSDocNamepathType:
          break;

        case Syntax.JSDocNullableType:
        case Syntax.JSDocNonNullableType:
        case Syntax.JSDocOptionalType:
          return serializeTypeNode((<JSDocNullableType | JSDocNonNullableType | JSDocOptionalType>node).type);

        default:
          return Debug.failBadSyntax(node);
      }

      return new Identifier('Object');
    }

    function serializeTypeList(types: readonly TypeNode[]): SerializedTypeNode {
      // Note when updating logic here also update getEntityNameForDecoratorMetadata
      // so that aliases can be marked as referenced
      let serializedUnion: SerializedTypeNode | undefined;
      for (let typeNode of types) {
        while (typeNode.kind === Syntax.ParenthesizedType) {
          typeNode = (typeNode as ParenthesizedTypeNode).type; // Skip parens if need be
        }
        if (typeNode.kind === Syntax.NeverKeyword) {
          continue; // Always elide `never` from the union/intersection if possible
        }
        if (!strictNullChecks && (typeNode.kind === Syntax.NullKeyword || typeNode.kind === Syntax.UndefinedKeyword)) {
          continue; // Elide null and undefined from unions for metadata, just like what we did prior to the implementation of strict null checks
        }
        const serializedIndividual = serializeTypeNode(typeNode);

        if (Node.is.kind(Identifier, serializedIndividual) && serializedIndividual.escapedText === 'Object') {
          // One of the individual is global object, return immediately
          return serializedIndividual;
        }
        // If there exists union that is not void 0 expression, check if the the common type is identifier.
        // anything more complex and we will just default to Object
        else if (serializedUnion) {
          // Different types
          if (!Node.is.kind(Identifier, serializedUnion) || !Node.is.kind(Identifier, serializedIndividual) || serializedUnion.escapedText !== serializedIndividual.escapedText) {
            return new Identifier('Object');
          }
        } else {
          // Initialize the union type
          serializedUnion = serializedIndividual;
        }
      }

      // If we were able to find common type, use it
      return serializedUnion || qs.VoidExpression.zero(); // Fallback is only hit if all union constituients are null/undefined/never
    }

    /**
     * Serializes a TypeReferenceNode to an appropriate JS constructor value for use with
     * decorator type metadata.
     *
     * @param node The type reference node.
     */
    function serializeTypeReferenceNode(node: TypeReferenceNode): SerializedTypeNode {
      const kind = resolver.getTypeReferenceSerializationKind(node.typeName, currentNameScope || currentLexicalScope);
      switch (kind) {
        case TypeReferenceSerializationKind.Unknown:
          // From conditional type type reference that cannot be resolved is Similar to any or unknown
          if (Node.findAncestor(node, (n) => n.parent && Node.is.kind(ConditionalTypeNode, n.parent) && (n.parent.trueType === n || n.parent.falseType === n))) {
            return new Identifier('Object');
          }

          const serialized = serializeEntityNameAsExpressionFallback(node.typeName);
          const temp = createTempVariable(hoistVariableDeclaration);
          return createConditional(createTypeCheck(createAssignment(temp, serialized), 'function'), temp, new Identifier('Object'));

        case TypeReferenceSerializationKind.TypeWithConstructSignatureAndValue:
          return serializeEntityNameAsExpression(node.typeName);

        case TypeReferenceSerializationKind.VoidNullableOrNeverType:
          return qs.VoidExpression.zero();

        case TypeReferenceSerializationKind.BigIntLikeType:
          return getGlobalBigIntNameWithFallback();

        case TypeReferenceSerializationKind.BooleanType:
          return new Identifier('Boolean');

        case TypeReferenceSerializationKind.NumberLikeType:
          return new Identifier('Number');

        case TypeReferenceSerializationKind.StringLikeType:
          return new Identifier('String');

        case TypeReferenceSerializationKind.ArrayLikeType:
          return new Identifier('Array');

        case TypeReferenceSerializationKind.ESSymbolType:
          return languageVersion < ScriptTarget.ES2015 ? getGlobalSymbolNameWithFallback() : new Identifier('Symbol');

        case TypeReferenceSerializationKind.TypeWithCallSignature:
          return new Identifier('Function');

        case TypeReferenceSerializationKind.Promise:
          return new Identifier('Promise');

        case TypeReferenceSerializationKind.ObjectType:
          return new Identifier('Object');
        default:
          return Debug.assertNever(kind);
      }
    }

    function createCheckedValue(left: Expression, right: Expression) {
      return createLogicalAnd(createStrictInequality(new TypeOfExpression(left), createLiteral('undefined')), right);
    }

    /**
     * Serializes an entity name which may not exist at runtime, but whose access shouldn't throw
     *
     * @param node The entity name to serialize.
     */
    function serializeEntityNameAsExpressionFallback(node: EntityName): BinaryExpression {
      if (node.kind === Syntax.Identifier) {
        // A -> typeof A !== undefined && A
        const copied = serializeEntityNameAsExpression(node);
        return createCheckedValue(copied, copied);
      }
      if (node.left.kind === Syntax.Identifier) {
        // A.B -> typeof A !== undefined && A.B
        return createCheckedValue(serializeEntityNameAsExpression(node.left), serializeEntityNameAsExpression(node));
      }
      // A.B.C -> typeof A !== undefined && (_a = A.B) !== void 0 && _a.C
      const left = serializeEntityNameAsExpressionFallback(node.left);
      const temp = createTempVariable(hoistVariableDeclaration);
      return createLogicalAnd(createLogicalAnd(left.left, createStrictInequality(createAssignment(temp, left.right), qs.VoidExpression.zero())), createPropertyAccess(temp, node.right));
    }

    /**
     * Serializes an entity name as an expression for decorator type metadata.
     *
     * @param node The entity name to serialize.
     */
    function serializeEntityNameAsExpression(node: EntityName): SerializedEntityNameAsExpression {
      switch (node.kind) {
        case Syntax.Identifier:
          // Create a clone of the name with a new parent, and treat it as if it were
          // a source tree node for the purposes of the checker.
          const name = getMutableClone(node);
          name.flags &= ~NodeFlags.Synthesized;
          name.original = undefined;
          name.parent = Node.get.parseTreeOf(currentLexicalScope); // ensure the parent is set to a parse tree node.

          return name;

        case Syntax.QualifiedName:
          return serializeQualifiedNameAsExpression(node);
      }
    }

    /**
     * Serializes an qualified name as an expression for decorator type metadata.
     *
     * @param node The qualified name to serialize.
     * @param useFallback A value indicating whether to use logical operators to test for the
     *                    qualified name at runtime.
     */
    function serializeQualifiedNameAsExpression(node: QualifiedName): SerializedEntityNameAsExpression {
      return createPropertyAccess(serializeEntityNameAsExpression(node.left), node.right);
    }

    /**
     * Gets an expression that points to the global "Symbol" constructor at runtime if it is
     * available.
     */
    function getGlobalSymbolNameWithFallback(): ConditionalExpression {
      return createConditional(createTypeCheck(new Identifier('Symbol'), 'function'), new Identifier('Symbol'), new Identifier('Object'));
    }

    /**
     * Gets an expression that points to the global "BigInt" constructor at runtime if it is
     * available.
     */
    function getGlobalBigIntNameWithFallback(): SerializedTypeNode {
      return languageVersion < ScriptTarget.ESNext
        ? createConditional(createTypeCheck(new Identifier('BigInt'), 'function'), new Identifier('BigInt'), new Identifier('Object'))
        : new Identifier('BigInt');
    }

    /**
     * Gets an expression that represents a property name (for decorated properties or enums).
     * For a computed property, a name is generated for the node.
     *
     * @param member The member whose name should be converted into an expression.
     */
    function getExpressionForPropertyName(member: ClassElement | EnumMember, generateNameForComputedPropertyName: boolean): Expression {
      const name = member.name!;
      if (Node.is.kind(PrivateIdentifier, name)) {
        return new Identifier('');
      } else if (Node.is.kind(ComputedPropertyName, name)) {
        return generateNameForComputedPropertyName && !isSimpleInlineableExpression(name.expression) ? getGeneratedNameForNode(name) : name.expression;
      } else if (Node.is.kind(Identifier, name)) {
        return createLiteral(idText(name));
      } else {
        return getSynthesizedClone(name);
      }
    }

    /**
     * Visits the property name of a class element, for use when emitting property
     * initializers. For a computed property on a node with decorators, a temporary
     * value is stored for later use.
     *
     * @param member The member whose name should be visited.
     */
    function visitPropertyNameOfClassElement(member: ClassElement): PropertyName {
      const name = member.name!;
      // Computed property names need to be transformed into a hoisted variable when they are used more than once.
      // The names are used more than once when:
      //   - the property is non-static and its initializer is moved to the constructor (when there are parameter property assignments).
      //   - the property has a decorator.
      if (Node.is.kind(ComputedPropertyName, name) && ((!hasStaticModifier(member) && currentClassHasParameterProperties) || some(member.decorators))) {
        const expression = visitNode(name.expression, visitor, isExpression);
        const innerExpression = skipPartiallyEmittedExpressions(expression);
        if (!isSimpleInlineableExpression(innerExpression)) {
          const generatedName = getGeneratedNameForNode(name);
          hoistVariableDeclaration(generatedName);
          return ComputedPropertyName.update(name, createAssignment(generatedName, expression));
        }
      }
      return visitNode(name, visitor, isPropertyName);
    }

    /**
     * Transforms a HeritageClause with TypeScript syntax.
     *
     * This function will only be called when one of the following conditions are met:
     * - The node is a non-`extends` heritage clause that should be elided.
     * - The node is an `extends` heritage clause that should be visited, but only allow a single type.
     *
     * @param node The HeritageClause to transform.
     */
    function visitHeritageClause(node: HeritageClause): HeritageClause | undefined {
      if (node.token === Syntax.ImplementsKeyword) {
        // implements clauses are elided
        return;
      }
      return visitEachChild(node, visitor, context);
    }

    /**
     * Transforms an ExpressionWithTypeArguments with TypeScript syntax.
     *
     * This function will only be called when one of the following conditions are met:
     * - The node contains type arguments that should be elided.
     *
     * @param node The ExpressionWithTypeArguments to transform.
     */
    function visitExpressionWithTypeArguments(node: ExpressionWithTypeArguments): ExpressionWithTypeArguments {
      return updateExpressionWithTypeArguments(node, /*typeArguments*/ undefined, visitNode(node.expression, visitor, isLeftHandSideExpression));
    }

    /**
     * Determines whether to emit a function-like declaration. We should not emit the
     * declaration if it does not have a body.
     *
     * @param node The declaration node.
     */
    function shouldEmitFunctionLikeDeclaration<T extends FunctionLikeDeclaration>(node: T): node is T & { body: NonNullable<T['body']> } {
      return !Node.is.missing(node.body);
    }

    function visitPropertyDeclaration(node: PropertyDeclaration) {
      if (node.flags & NodeFlags.Ambient) {
        return;
      }
      const updated = PropertyDeclaration.update(
        node,
        undefined,
        Nodes.visit(node.modifiers, visitor, isModifier),
        visitPropertyNameOfClassElement(node),
        /*questionOrExclamationToken*/ undefined,
        undefined,
        visitNode(node.initializer, visitor)
      );
      if (updated !== node) {
        // While we emit the source map for the node after skipping decorators and modifiers,
        // we need to emit the comments for the original range.
        setCommentRange(updated, node);
        setSourceMapRange(updated, moveRangePastDecorators(node));
      }
      return updated;
    }

    function visitConstructor(node: ConstructorDeclaration) {
      if (!shouldEmitFunctionLikeDeclaration(node)) {
        return;
      }

      return ConstructorDeclaration.update(node, undefined, undefined, visitParameterList(node.parameters, visitor, context), transformConstructorBody(node.body, node));
    }

    function transformConstructorBody(body: Block, constructor: ConstructorDeclaration) {
      const parametersWithPropertyAssignments = constructor && filter(constructor.parameters, (p) => Node.is.parameterPropertyDeclaration(p, constructor));
      if (!some(parametersWithPropertyAssignments)) {
        return visitFunctionBody(body, visitor, context);
      }

      let statements: Statement[] = [];
      let indexOfFirstStatement = 0;

      resumeLexicalEnvironment();

      indexOfFirstStatement = addPrologueDirectivesAndInitialSuperCall(constructor, statements, visitor);

      // Add parameters with property assignments. Transforms this:
      //
      //  constructor (public x, public y) {
      //  }
      //
      // Into this:
      //
      //  constructor (x, y) {
      //      this.x = x;
      //      this.y = y;
      //  }
      //
      addRange(statements, map(parametersWithPropertyAssignments, transformParameterWithPropertyAssignment));

      // Add the existing statements, skipping the initial super call.
      addRange(statements, Nodes.visit(body.statements, visitor, isStatement, indexOfFirstStatement));

      // End the lexical environment.
      statements = mergeLexicalEnvironment(statements, endLexicalEnvironment());
      const block = new Block(setRange(new Nodes(statements), body.statements), /*multiLine*/ true);
      setRange(block, /*location*/ body);
      setOriginalNode(block, body);
      return block;
    }

    /**
     * Transforms a parameter into a property assignment statement.
     *
     * @param node The parameter declaration.
     */
    function transformParameterWithPropertyAssignment(node: ParameterPropertyDeclaration) {
      const name = node.name;
      if (!Node.is.kind(Identifier, name)) {
        return;
      }

      const propertyName = getMutableClone(name);
      setEmitFlags(propertyName, EmitFlags.NoComments | EmitFlags.NoSourceMap);

      const localName = getMutableClone(name);
      setEmitFlags(localName, EmitFlags.NoComments);

      return startOnNewLine(
        removeAllComments(
          setRange(setOriginalNode(createExpressionStatement(createAssignment(setRange(createPropertyAccess(createThis(), propertyName), node.name), localName)), node), moveRangePos(node, -1))
        )
      );
    }

    function visitMethodDeclaration(node: MethodDeclaration) {
      if (!shouldEmitFunctionLikeDeclaration(node)) {
        return;
      }
      const updated = MethodDeclaration.update(
        node,
        undefined,
        Nodes.visit(node.modifiers, modifierVisitor, isModifier),
        node.asteriskToken,
        visitPropertyNameOfClassElement(node),
        /*questionToken*/ undefined,
        undefined,
        visitParameterList(node.parameters, visitor, context),
        undefined,
        visitFunctionBody(node.body, visitor, context)
      );
      if (updated !== node) {
        // While we emit the source map for the node after skipping decorators and modifiers,
        // we need to emit the comments for the original range.
        setCommentRange(updated, node);
        setSourceMapRange(updated, moveRangePastDecorators(node));
      }
      return updated;
    }

    function shouldEmitAccessorDeclaration(node: AccessorDeclaration) {
      return !(Node.is.missing(node.body) && hasSyntacticModifier(node, ModifierFlags.Abstract));
    }

    function visitGetAccessor(node: GetAccessorDeclaration) {
      if (!shouldEmitAccessorDeclaration(node)) {
        return;
      }
      const updated = GetAccessorDeclaration.update(
        node,
        undefined,
        Nodes.visit(node.modifiers, modifierVisitor, isModifier),
        visitPropertyNameOfClassElement(node),
        visitParameterList(node.parameters, visitor, context),
        undefined,
        visitFunctionBody(node.body, visitor, context) || new Block([])
      );
      if (updated !== node) {
        // While we emit the source map for the node after skipping decorators and modifiers,
        // we need to emit the comments for the original range.
        setCommentRange(updated, node);
        setSourceMapRange(updated, moveRangePastDecorators(node));
      }
      return updated;
    }

    function visitSetAccessor(node: SetAccessorDeclaration) {
      if (!shouldEmitAccessorDeclaration(node)) {
        return;
      }
      const updated = SetAccessorDeclaration.update(
        node,
        undefined,
        Nodes.visit(node.modifiers, modifierVisitor, isModifier),
        visitPropertyNameOfClassElement(node),
        visitParameterList(node.parameters, visitor, context),
        visitFunctionBody(node.body, visitor, context) || new Block([])
      );
      if (updated !== node) {
        // While we emit the source map for the node after skipping decorators and modifiers,
        // we need to emit the comments for the original range.
        setCommentRange(updated, node);
        setSourceMapRange(updated, moveRangePastDecorators(node));
      }
      return updated;
    }

    function visitFunctionDeclaration(node: FunctionDeclaration): VisitResult<Statement> {
      if (!shouldEmitFunctionLikeDeclaration(node)) {
        return createNotEmittedStatement(node);
      }
      const updated = updateFunctionDeclaration(
        node,
        undefined,
        Nodes.visit(node.modifiers, modifierVisitor, isModifier),
        node.asteriskToken,
        node.name,
        undefined,
        visitParameterList(node.parameters, visitor, context),
        undefined,
        visitFunctionBody(node.body, visitor, context) || new Block([])
      );
      if (isExportOfNamespace(node)) {
        const statements: Statement[] = [updated];
        addExportMemberAssignment(statements, node);
        return statements;
      }
      return updated;
    }

    function visitFunctionExpression(node: FunctionExpression): Expression {
      if (!shouldEmitFunctionLikeDeclaration(node)) {
        return createOmittedExpression();
      }
      const updated = updateFunctionExpression(
        node,
        Nodes.visit(node.modifiers, modifierVisitor, isModifier),
        node.asteriskToken,
        node.name,
        undefined,
        visitParameterList(node.parameters, visitor, context),
        undefined,
        visitFunctionBody(node.body, visitor, context) || new Block([])
      );
      return updated;
    }

    function visitArrowFunction(node: ArrowFunction) {
      const updated = node.update(
        Nodes.visit(node.modifiers, modifierVisitor, isModifier),
        undefined,
        visitParameterList(node.parameters, visitor, context),
        undefined,
        node.equalsGreaterThanToken,
        visitFunctionBody(node.body, visitor, context)
      );
      return updated;
    }

    function visitParameter(node: ParameterDeclaration) {
      if (parameterIsThsyntax.is.keyword(node)) {
        return;
      }

      const updated = updateParameter(
        node,
        undefined,
        undefined,
        node.dot3Token,
        visitNode(node.name, visitor, isBindingName),
        /*questionToken*/ undefined,
        undefined,
        visitNode(node.initializer, visitor, isExpression)
      );
      if (updated !== node) {
        // While we emit the source map for the node after skipping decorators and modifiers,
        // we need to emit the comments for the original range.
        setCommentRange(updated, node);
        setRange(updated, moveRangePastModifiers(node));
        setSourceMapRange(updated, moveRangePastModifiers(node));
        setEmitFlags(updated.name, EmitFlags.NoTrailingSourceMap);
      }
      return updated;
    }

    function visitVariableStatement(node: VariableStatement): Statement | undefined {
      if (isExportOfNamespace(node)) {
        const variables = getInitializedVariables(node.declarationList);
        if (variables.length === 0) {
          // elide statement if there are no initialized variables.
          return;
        }

        return setRange(createExpressionStatement(inlineExpressions(map(variables, transformInitializedVariable))), node);
      } else {
        return visitEachChild(node, visitor, context);
      }
    }

    function transformInitializedVariable(node: VariableDeclaration): Expression {
      const name = node.name;
      if (Node.is.kind(BindingPattern, name)) {
        return flattenDestructuringAssignment(node, visitor, context, FlattenLevel.All, /*needsValue*/ false, createNamespaceExportExpression);
      } else {
        return setRange(createAssignment(getNamespaceMemberNameWithSourceMapsAndWithoutComments(name), visitNode(node.initializer, visitor, isExpression)), /*location*/ node);
      }
    }

    function visitVariableDeclaration(node: VariableDeclaration) {
      return updateTypeScriptVariableDeclaration(node, visitNode(node.name, visitor, isBindingName), /*exclaimationToken*/ undefined, undefined, visitNode(node.initializer, visitor, isExpression));
    }

    function visitParenthesizedExpression(node: ParenthesizedExpression): Expression {
      const innerExpression = skipOuterExpressions(node.expression, ~OuterExpressionKinds.Assertions);
      if (Node.is.assertionExpression(innerExpression)) {
        // Make sure we consider all nested cast expressions, e.g.:
        // (<any><number><any>-A).x;
        const expression = visitNode(node.expression, visitor, isExpression);

        // We have an expression of the form: (<Type>SubExpr). Emitting this as (SubExpr)
        // is really not desirable. We would like to emit the subexpression as-is. Omitting
        // the parentheses, however, could cause change in the semantics of the generated
        // code if the casted expression has a lower precedence than the rest of the
        // expression.
        //
        // To preserve comments, we return a "PartiallyEmittedExpression" here which will
        // preserve the position information of the original expression.
        //
        // Due to the auto-parenthesization rules used by the visitor and factory functions
        // we can safely elide the parentheses here, as a new synthetic
        // ParenthesizedExpression will be inserted if we remove parentheses too
        // aggressively.
        // HOWEVER - if there are leading comments on the expression itself, to handle ASI
        // correctly for return and throw, we must keep the parenthesis
        if (length(syntax.get.leadingCommentRangesOfNode(expression, currentSourceFile))) {
          return updateParen(node, expression);
        }
        return new qs.PartiallyEmittedExpression(expression, node);
      }

      return visitEachChild(node, visitor, context);
    }

    function visitAssertionExpression(node: AssertionExpression): Expression {
      const expression = visitNode(node.expression, visitor, isExpression);
      return new qs.PartiallyEmittedExpression(expression, node);
    }

    function visitNonNullExpression(node: NonNullExpression): Expression {
      const expression = visitNode(node.expression, visitor, isLeftHandSideExpression);
      return new qs.PartiallyEmittedExpression(expression, node);
    }

    function visitCallExpression(node: CallExpression) {
      return updateCall(node, visitNode(node.expression, visitor, isExpression), undefined, Nodes.visit(node.arguments, visitor, isExpression));
    }

    function visitNewExpression(node: NewExpression) {
      return updateNew(node, visitNode(node.expression, visitor, isExpression), undefined, Nodes.visit(node.arguments, visitor, isExpression));
    }

    function visitTaggedTemplateExpression(node: TaggedTemplateExpression) {
      return node.update(visitNode(node.tag, visitor, isExpression), undefined, visitNode(node.template, visitor, isExpression));
    }

    function visitJsxSelfClosingElement(node: JsxSelfClosingElement) {
      return updateJsxSelfClosingElement(node, visitNode(node.tagName, visitor, isJsxTagNameExpression), /*typeArguments*/ undefined, visitNode(node.attributes, visitor, isJsxAttributes));
    }

    function visitJsxJsxOpeningElement(node: JsxOpeningElement) {
      return updateJsxOpeningElement(node, visitNode(node.tagName, visitor, isJsxTagNameExpression), /*typeArguments*/ undefined, visitNode(node.attributes, visitor, isJsxAttributes));
    }

    function shouldEmitEnumDeclaration(node: EnumDeclaration) {
      return !isEnumConst(node) || compilerOptions.preserveConstEnums || compilerOptions.isolatedModules;
    }

    function visitEnumDeclaration(node: EnumDeclaration): VisitResult<Statement> {
      if (!shouldEmitEnumDeclaration(node)) return createNotEmittedStatement(node);

      const statements: Statement[] = [];
      let emitFlags = EmitFlags.AdviseOnEmitNode;
      const varAdded = addVarForEnumOrModuleDeclaration(statements, node);
      if (varAdded) {
        if (moduleKind !== ModuleKind.System || currentLexicalScope !== currentSourceFile) {
          emitFlags |= EmitFlags.NoLeadingComments;
        }
      }
      const parameterName = getNamespaceParameterName(node);
      const containerName = getNamespaceContainerName(node);
      const exportName = hasSyntacticModifier(node, ModifierFlags.Export) ? getExternalModuleOrNamespaceExportName(currentNamespaceContainerName, node, false, true) : getLocalName(node, false, true);

      //  x || (x = {})
      //  exports.x || (exports.x = {})
      let moduleArg = createLogicalOr(exportName, createAssignment(exportName, createObjectLiteral()));

      if (hasNamespaceQualifiedExportName(node)) {
        // `localName` is the expression used within this node's containing scope for any local references.
        const localName = getLocalName(node, false, true);

        //  x = (exports.x || (exports.x = {}))
        moduleArg = createAssignment(localName, moduleArg);
      }

      //  (function (x) {
      //      x[x["y"] = 0] = "y";
      //      ...
      //  })(x || (x = {}));
      const enumStatement = createExpressionStatement(
        new qs.CallExpression(
          createFunctionExpression(
            undefined,
            /*asteriskToken*/ undefined,
            /*name*/ undefined,
            undefined,
            [createParameter(undefined, undefined, /*dot3Token*/ undefined, parameterName)],
            undefined,
            transformEnumBody(node, containerName)
          ),
          /*typeArguments*/ undefined,
          [moduleArg]
        )
      );

      setOriginalNode(enumStatement, node);
      if (varAdded) {
        // If a variable was added, synthetic comments are emitted on it, not on the moduleStatement.
        setSyntheticLeadingComments(enumStatement, undefined);
        setSyntheticTrailingComments(enumStatement, undefined);
      }
      setRange(enumStatement, node);
      addEmitFlags(enumStatement, emitFlags);
      statements.push(enumStatement);

      // Add a DeclarationMarker for the enum to preserve trailing comments and mark
      // the end of the declaration.
      statements.push(createEndOfDeclarationMarker(node));
      return statements;
    }

    function transformEnumBody(node: EnumDeclaration, localName: Identifier): Block {
      const savedCurrentNamespaceLocalName = currentNamespaceContainerName;
      currentNamespaceContainerName = localName;

      const statements: Statement[] = [];
      startLexicalEnvironment();
      const members = map(node.members, transformEnumMember);
      insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());
      addRange(statements, members);

      currentNamespaceContainerName = savedCurrentNamespaceLocalName;
      return new Block(setRange(new Nodes(statements), /*location*/ node.members), /*multiLine*/ true);
    }

    function transformEnumMember(member: EnumMember): Statement {
      // enums don't support computed properties
      // we pass false as 'generateNameForComputedPropertyName' for a backward compatibility purposes
      // old emitter always generate 'expression' part of the name as-is.
      const name = getExpressionForPropertyName(member, /*generateNameForComputedPropertyName*/ false);
      const valueExpression = transformEnumMemberDeclarationValue(member);
      const innerAssignment = createAssignment(new qs.ElementAccessExpression(currentNamespaceContainerName, name), valueExpression);
      const outerAssignment = valueExpression.kind === Syntax.StringLiteral ? innerAssignment : createAssignment(new qs.ElementAccessExpression(currentNamespaceContainerName, innerAssignment), name);
      return setRange(createExpressionStatement(setRange(outerAssignment, member)), member);
    }

    function transformEnumMemberDeclarationValue(member: EnumMember): Expression {
      const value = resolver.getConstantValue(member);
      if (value !== undefined) {
        return createLiteral(value);
      } else {
        enableSubstitutionForNonQualifiedEnumMembers();
        if (member.initializer) {
          return visitNode(member.initializer, visitor, isExpression);
        } else {
          return qs.VoidExpression.zero();
        }
      }
    }

    function shouldEmitModuleDeclaration(nodeIn: ModuleDeclaration) {
      const node = Node.get.parseTreeOf(nodeIn, isModuleDeclaration);
      if (!node) {
        // If we can't find a parse tree node, assume the node is instantiated.
        return true;
      }
      return isInstantiatedModule(node, !!compilerOptions.preserveConstEnums || !!compilerOptions.isolatedModules);
    }

    function hasNamespaceQualifiedExportName(node: Node) {
      return (
        isExportOfNamespace(node) ||
        (qp_isExternalModuleExport(node) && moduleKind !== ModuleKind.ES2015 && moduleKind !== ModuleKind.ES2020 && moduleKind !== ModuleKind.ESNext && moduleKind !== ModuleKind.System)
      );
    }

    function recordEmittedDeclarationInScope(node: FunctionDeclaration | ClassDeclaration | ModuleDeclaration | EnumDeclaration) {
      if (!currentScopeFirstDeclarationsOfName) {
        currentScopeFirstDeclarationsOfName = createUnderscoreEscapedMap<Node>();
      }

      const name = declaredNameInScope(node);
      if (!currentScopeFirstDeclarationsOfName.has(name)) {
        currentScopeFirstDeclarationsOfName.set(name, node);
      }
    }

    function isFirstEmittedDeclarationInScope(node: ModuleDeclaration | EnumDeclaration) {
      if (currentScopeFirstDeclarationsOfName) {
        const name = declaredNameInScope(node);
        return currentScopeFirstDeclarationsOfName.get(name) === node;
      }
      return true;
    }

    function declaredNameInScope(node: FunctionDeclaration | ClassDeclaration | ModuleDeclaration | EnumDeclaration): __String {
      Debug.assertNode(node.name, isIdentifier);
      return node.name.escapedText;
    }

    function addVarForEnumOrModuleDeclaration(statements: Statement[], node: ModuleDeclaration | EnumDeclaration) {
      const statement = createVariableStatement(
        Nodes.visit(node.modifiers, modifierVisitor, isModifier),
        createVariableDeclarationList([createVariableDeclaration(getLocalName(node, false, true))], currentLexicalScope.kind === Syntax.SourceFile ? NodeFlags.None : NodeFlags.Let)
      );

      setOriginalNode(statement, node);

      recordEmittedDeclarationInScope(node);
      if (isFirstEmittedDeclarationInScope(node)) {
        // Adjust the source map emit to match the old emitter.
        if (node.kind === Syntax.EnumDeclaration) {
          setSourceMapRange(statement.declarationList, node);
        } else {
          setSourceMapRange(statement, node);
        }
        setCommentRange(statement, node);
        addEmitFlags(statement, EmitFlags.NoTrailingComments | EmitFlags.HasEndOfDeclarationMarker);
        statements.push(statement);
        return true;
      } else {
        const mergeMarker = createMergeDeclarationMarker(statement);
        setEmitFlags(mergeMarker, EmitFlags.NoComments | EmitFlags.HasEndOfDeclarationMarker);
        statements.push(mergeMarker);
        return false;
      }
    }

    function visitModuleDeclaration(node: ModuleDeclaration): VisitResult<Statement> {
      if (!shouldEmitModuleDeclaration(node)) {
        return createNotEmittedStatement(node);
      }

      Debug.assertNode(node.name, isIdentifier, 'A TypeScript namespace should have an Identifier name.');
      enableSubstitutionForNamespaceExports();

      const statements: Statement[] = [];

      // We request to be advised when the printer is about to print this node. This allows
      // us to set up the correct state for later substitutions.
      let emitFlags = EmitFlags.AdviseOnEmitNode;

      // If needed, we should emit a variable declaration for the module. If we emit
      // a leading variable declaration, we should not emit leading comments for the
      // module body.
      const varAdded = addVarForEnumOrModuleDeclaration(statements, node);
      if (varAdded) {
        // We should still emit the comments if we are emitting a system module.
        if (moduleKind !== ModuleKind.System || currentLexicalScope !== currentSourceFile) {
          emitFlags |= EmitFlags.NoLeadingComments;
        }
      }

      // `parameterName` is the declaration name used inside of the namespace.
      const parameterName = getNamespaceParameterName(node);

      // `containerName` is the expression used inside of the namespace for exports.
      const containerName = getNamespaceContainerName(node);

      // `exportName` is the expression used within this node's container for any exported references.
      const exportName = hasSyntacticModifier(node, ModifierFlags.Export) ? getExternalModuleOrNamespaceExportName(currentNamespaceContainerName, node, false, true) : getLocalName(node, false, true);

      //  x || (x = {})
      //  exports.x || (exports.x = {})
      let moduleArg = createLogicalOr(exportName, createAssignment(exportName, createObjectLiteral()));

      if (hasNamespaceQualifiedExportName(node)) {
        // `localName` is the expression used within this node's containing scope for any local references.
        const localName = getLocalName(node, false, true);

        //  x = (exports.x || (exports.x = {}))
        moduleArg = createAssignment(localName, moduleArg);
      }

      //  (function (x_1) {
      //      x_1.y = ...;
      //  })(x || (x = {}));
      const moduleStatement = createExpressionStatement(
        new qs.CallExpression(
          createFunctionExpression(
            undefined,
            /*asteriskToken*/ undefined,
            /*name*/ undefined,
            undefined,
            [createParameter(undefined, undefined, /*dot3Token*/ undefined, parameterName)],
            undefined,
            transformModuleBody(node, containerName)
          ),
          /*typeArguments*/ undefined,
          [moduleArg]
        )
      );

      setOriginalNode(moduleStatement, node);
      if (varAdded) {
        // If a variable was added, synthetic comments are emitted on it, not on the moduleStatement.
        setSyntheticLeadingComments(moduleStatement, undefined);
        setSyntheticTrailingComments(moduleStatement, undefined);
      }
      setRange(moduleStatement, node);
      addEmitFlags(moduleStatement, emitFlags);
      statements.push(moduleStatement);

      // Add a DeclarationMarker for the namespace to preserve trailing comments and mark
      // the end of the declaration.
      statements.push(createEndOfDeclarationMarker(node));
      return statements;
    }

    function transformModuleBody(node: ModuleDeclaration, namespaceLocalName: Identifier): Block {
      const savedCurrentNamespaceContainerName = currentNamespaceContainerName;
      const savedCurrentNamespace = currentNamespace;
      const savedCurrentScopeFirstDeclarationsOfName = currentScopeFirstDeclarationsOfName;
      currentNamespaceContainerName = namespaceLocalName;
      currentNamespace = node;
      currentScopeFirstDeclarationsOfName = undefined;

      const statements: Statement[] = [];
      startLexicalEnvironment();

      let statementsLocation: TextRange | undefined;
      let blockLocation: TextRange | undefined;
      if (node.body) {
        if (node.body.kind === Syntax.ModuleBlock) {
          saveStateAndInvoke(node.body, (body) => addRange(statements, Nodes.visit((<ModuleBlock>body).statements, namespaceElementVisitor, isStatement)));
          statementsLocation = node.body.statements;
          blockLocation = node.body;
        } else {
          const result = visitModuleDeclaration(<ModuleDeclaration>node.body);
          if (result) {
            if (isArray(result)) {
              addRange(statements, result);
            } else {
              statements.push(result);
            }
          }

          const moduleBlock = <ModuleBlock>getInnerMostModuleDeclarationFromDottedModule(node)!.body;
          statementsLocation = moveRangePos(moduleBlock.statements, -1);
        }
      }

      insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());
      currentNamespaceContainerName = savedCurrentNamespaceContainerName;
      currentNamespace = savedCurrentNamespace;
      currentScopeFirstDeclarationsOfName = savedCurrentScopeFirstDeclarationsOfName;

      const block = new Block(setRange(new Nodes(statements), /*location*/ statementsLocation), /*multiLine*/ true);
      setRange(block, blockLocation);

      if (!node.body || node.body.kind !== Syntax.ModuleBlock) {
        setEmitFlags(block, Node.get.emitFlags(block) | EmitFlags.NoComments);
      }
      return block;
    }

    function getInnerMostModuleDeclarationFromDottedModule(moduleDeclaration: ModuleDeclaration): ModuleDeclaration | undefined {
      if (moduleDeclaration.body!.kind === Syntax.ModuleDeclaration) {
        const recursiveInnerModule = getInnerMostModuleDeclarationFromDottedModule(<ModuleDeclaration>moduleDeclaration.body);
        return recursiveInnerModule || <ModuleDeclaration>moduleDeclaration.body;
      }
    }

    function visitImportDeclaration(node: ImportDeclaration): VisitResult<Statement> {
      if (!node.importClause) {
        // Do not elide a side-effect only import declaration.
        //  import "foo";
        return node;
      }
      if (node.importClause.isTypeOnly) {
        // Always elide type-only imports
        return;
      }

      // Elide the declaration if the import clause was elided.
      const importClause = visitNode(node.importClause, visitImportClause, isImportClause);
      return importClause || compilerOptions.importsNotUsedAsValues === ImportsNotUsedAsValues.Preserve || compilerOptions.importsNotUsedAsValues === ImportsNotUsedAsValues.Error
        ? updateImportDeclaration(node, undefined, undefined, importClause, node.moduleSpecifier)
        : undefined;
    }

    function visitImportClause(node: ImportClause): VisitResult<ImportClause> {
      if (node.isTypeOnly) {
        return;
      }
      // Elide the import clause if we elide both its name and its named bindings.
      const name = resolver.isReferencedAliasDeclaration(node) ? node.name : undefined;
      const namedBindings = visitNode(node.namedBindings, visitNamedImportBindings, isNamedImportBindings);
      return name || namedBindings ? updateImportClause(node, name, namedBindings, /*isTypeOnly*/ false) : undefined;
    }

    function visitNamedImportBindings(node: NamedImportBindings): VisitResult<NamedImportBindings> {
      if (node.kind === Syntax.NamespaceImport) {
        // Elide a namespace import if it is not referenced.
        return resolver.isReferencedAliasDeclaration(node) ? node : undefined;
      } else {
        // Elide named imports if all of its import specifiers are elided.
        const elements = Nodes.visit(node.elements, visitImportSpecifier, isImportSpecifier);
        return some(elements) ? updateNamedImports(node, elements) : undefined;
      }
    }

    function visitImportSpecifier(node: ImportSpecifier): VisitResult<ImportSpecifier> {
      // Elide an import specifier if it is not referenced.
      return resolver.isReferencedAliasDeclaration(node) ? node : undefined;
    }

    function visitExportAssignment(node: ExportAssignment): VisitResult<Statement> {
      // Elide the export assignment if it does not reference a value.
      return resolver.isValueAliasDeclaration(node) ? visitEachChild(node, visitor, context) : undefined;
    }

    function visitExportDeclaration(node: ExportDeclaration): VisitResult<Statement> {
      if (node.isTypeOnly) {
        return;
      }

      if (!node.exportClause || Node.is.kind(NamespaceExport, node.exportClause)) {
        // never elide `export <whatever> from <whereever>` declarations -
        // they should be kept for sideffects/untyped exports, even when the
        // type checker doesn't know about any exports
        return node;
      }

      if (!resolver.isValueAliasDeclaration(node)) {
        // Elide the export declaration if it does not export a value.
        return;
      }

      // Elide the export declaration if all of its named exports are elided.
      const exportClause = visitNode(node.exportClause, visitNamedExportBindings, isNamedExportBindings);
      return exportClause ? updateExportDeclaration(node, undefined, undefined, exportClause, node.moduleSpecifier, node.isTypeOnly) : undefined;
    }

    function visitNamedExports(node: NamedExports): VisitResult<NamedExports> {
      // Elide the named exports if all of its export specifiers were elided.
      const elements = Nodes.visit(node.elements, visitExportSpecifier, isExportSpecifier);
      return some(elements) ? updateNamedExports(node, elements) : undefined;
    }

    function visitNamespaceExports(node: NamespaceExport): VisitResult<NamespaceExport> {
      return updateNamespaceExport(node, visitNode(node.name, visitor, isIdentifier));
    }

    function visitNamedExportBindings(node: NamedExportBindings): VisitResult<NamedExportBindings> {
      return Node.is.kind(NamespaceExport, node) ? visitNamespaceExports(node) : visitNamedExports(node);
    }

    function visitExportSpecifier(node: ExportSpecifier): VisitResult<ExportSpecifier> {
      // Elide an export specifier if it does not reference a value.
      return resolver.isValueAliasDeclaration(node) ? node : undefined;
    }

    function shouldEmitImportEqualsDeclaration(node: ImportEqualsDeclaration) {
      // preserve old compiler's behavior: emit 'var' for import declaration (even if we do not consider them referenced) when
      // - current file is not external module
      // - import declaration is top level and target is value imported by entity name
      return resolver.isReferencedAliasDeclaration(node) || (!qp_isExternalModule(currentSourceFile) && resolver.isTopLevelValueImportEqualsWithEntityName(node));
    }

    function visitImportEqualsDeclaration(node: ImportEqualsDeclaration): VisitResult<Statement> {
      if (Node.is.externalModuleImportEqualsDeclaration(node)) {
        const isReferenced = resolver.isReferencedAliasDeclaration(node);
        // If the alias is unreferenced but we want to keep the import, replace with 'import "mod"'.
        if (!isReferenced && compilerOptions.importsNotUsedAsValues === ImportsNotUsedAsValues.Preserve) {
          return setOriginalNode(setRange(createImportDeclaration(undefined, undefined, /*importClause*/ undefined, node.moduleReference.expression), node), node);
        }

        return isReferenced ? visitEachChild(node, visitor, context) : undefined;
      }

      if (!shouldEmitImportEqualsDeclaration(node)) {
        return;
      }

      const moduleReference = createExpressionFromEntityName(<EntityName>node.moduleReference);
      setEmitFlags(moduleReference, EmitFlags.NoComments | EmitFlags.NoNestedComments);

      if (isNamedExternalModuleExport(node) || !isExportOfNamespace(node)) {
        //  export var ${name} = ${moduleReference};
        //  var ${name} = ${moduleReference};
        return setOriginalNode(
          setRange(
            createVariableStatement(
              Nodes.visit(node.modifiers, modifierVisitor, isModifier),
              createVariableDeclarationList([setOriginalNode(createVariableDeclaration(node.name, undefined, moduleReference), node)])
            ),
            node
          ),
          node
        );
      } else {
        // exports.${name} = ${moduleReference};
        return setOriginalNode(createNamespaceExport(node.name, moduleReference, node), node);
      }
    }

    function isExportOfNamespace(node: Node) {
      return currentNamespace !== undefined && hasSyntacticModifier(node, ModifierFlags.Export);
    }

    function qp_isExternalModuleExport(node: Node) {
      return currentNamespace === undefined && hasSyntacticModifier(node, ModifierFlags.Export);
    }

    function isNamedExternalModuleExport(node: Node) {
      return qp_isExternalModuleExport(node) && !hasSyntacticModifier(node, ModifierFlags.Default);
    }

    function isDefaultExternalModuleExport(node: Node) {
      return qp_isExternalModuleExport(node) && hasSyntacticModifier(node, ModifierFlags.Default);
    }

    function expressionToStatement(expression: Expression) {
      return createExpressionStatement(expression);
    }

    function addExportMemberAssignment(statements: Statement[], node: ClassDeclaration | FunctionDeclaration) {
      const expression = createAssignment(getExternalModuleOrNamespaceExportName(currentNamespaceContainerName, node, false, true), getLocalName(node));
      setSourceMapRange(expression, createRange(node.name ? node.name.pos : node.pos, node.end));

      const statement = createExpressionStatement(expression);
      setSourceMapRange(statement, createRange(-1, node.end));
      statements.push(statement);
    }

    function createNamespaceExport(exportName: Identifier, exportValue: Expression, location?: TextRange) {
      return setRange(createExpressionStatement(createAssignment(getNamespaceMemberName(currentNamespaceContainerName, exportName, false, true), exportValue)), location);
    }

    function createNamespaceExportExpression(exportName: Identifier, exportValue: Expression, location?: TextRange) {
      return setRange(createAssignment(getNamespaceMemberNameWithSourceMapsAndWithoutComments(exportName), exportValue), location);
    }

    function getNamespaceMemberNameWithSourceMapsAndWithoutComments(name: Identifier) {
      return getNamespaceMemberName(currentNamespaceContainerName, name, false, true);
    }

    function getNamespaceParameterName(node: ModuleDeclaration | EnumDeclaration) {
      const name = getGeneratedNameForNode(node);
      setSourceMapRange(name, node.name);
      return name;
    }

    function getNamespaceContainerName(node: ModuleDeclaration | EnumDeclaration) {
      return getGeneratedNameForNode(node);
    }

    function getClassAliasIfNeeded(node: ClassDeclaration) {
      if (resolver.getNodeCheckFlags(node) & NodeCheckFlags.ClassWithConstructorReference) {
        enableSubstitutionForClassAliases();
        const classAlias = createUniqueName(node.name && !Node.is.generatedIdentifier(node.name) ? idText(node.name) : 'default');
        classAliases[getOriginalNodeId(node)] = classAlias;
        hoistVariableDeclaration(classAlias);
        return classAlias;
      }
    }

    function getClassPrototype(node: ClassExpression | ClassDeclaration) {
      return createPropertyAccess(getDeclarationName(node), 'prototype');
    }

    function getClassMemberPrefix(node: ClassExpression | ClassDeclaration, member: ClassElement) {
      return hasSyntacticModifier(member, ModifierFlags.Static) ? getDeclarationName(node) : getClassPrototype(node);
    }

    function enableSubstitutionForNonQualifiedEnumMembers() {
      if ((enabledSubstitutions & TypeScriptSubstitutionFlags.NonQualifiedEnumMembers) === 0) {
        enabledSubstitutions |= TypeScriptSubstitutionFlags.NonQualifiedEnumMembers;
        context.enableSubstitution(Syntax.Identifier);
      }
    }

    function enableSubstitutionForClassAliases() {
      if ((enabledSubstitutions & TypeScriptSubstitutionFlags.ClassAliases) === 0) {
        enabledSubstitutions |= TypeScriptSubstitutionFlags.ClassAliases;

        // We need to enable substitutions for identifiers. This allows us to
        // substitute class names inside of a class declaration.
        context.enableSubstitution(Syntax.Identifier);

        // Keep track of class aliases.
        classAliases = [];
      }
    }

    function enableSubstitutionForNamespaceExports() {
      if ((enabledSubstitutions & TypeScriptSubstitutionFlags.NamespaceExports) === 0) {
        enabledSubstitutions |= TypeScriptSubstitutionFlags.NamespaceExports;

        // We need to enable substitutions for identifiers and shorthand property assignments. This allows us to
        // substitute the names of exported members of a namespace.
        context.enableSubstitution(Syntax.Identifier);
        context.enableSubstitution(Syntax.ShorthandPropertyAssignment);

        // We need to be notified when entering and exiting namespaces.
        context.enableEmitNotification(Syntax.ModuleDeclaration);
      }
    }

    function isTransformedModuleDeclaration(node: Node): boolean {
      return Node.get.originalOf(node).kind === Syntax.ModuleDeclaration;
    }

    function isTransformedEnumDeclaration(node: Node): boolean {
      return Node.get.originalOf(node).kind === Syntax.EnumDeclaration;
    }

    function onEmitNode(hint: EmitHint, node: Node, emitCallback: (hint: EmitHint, node: Node) => void): void {
      const savedApplicableSubstitutions = applicableSubstitutions;
      const savedCurrentSourceFile = currentSourceFile;

      if (Node.is.kind(SourceFile, node)) {
        currentSourceFile = node;
      }

      if (enabledSubstitutions & TypeScriptSubstitutionFlags.NamespaceExports && isTransformedModuleDeclaration(node)) {
        applicableSubstitutions |= TypeScriptSubstitutionFlags.NamespaceExports;
      }

      if (enabledSubstitutions & TypeScriptSubstitutionFlags.NonQualifiedEnumMembers && isTransformedEnumDeclaration(node)) {
        applicableSubstitutions |= TypeScriptSubstitutionFlags.NonQualifiedEnumMembers;
      }

      previousOnEmitNode(hint, node, emitCallback);

      applicableSubstitutions = savedApplicableSubstitutions;
      currentSourceFile = savedCurrentSourceFile;
    }

    function onSubstituteNode(hint: EmitHint, node: Node) {
      node = previousOnSubstituteNode(hint, node);
      if (hint === EmitHint.Expression) {
        return substituteExpression(<Expression>node);
      } else if (Node.is.kind(ShorthandPropertyAssignment, node)) {
        return substituteShorthandPropertyAssignment(node);
      }

      return node;
    }

    function substituteShorthandPropertyAssignment(node: ShorthandPropertyAssignment): ObjectLiteralElementLike {
      if (enabledSubstitutions & TypeScriptSubstitutionFlags.NamespaceExports) {
        const name = node.name;
        const exportedName = trySubstituteNamespaceExportedName(name);
        if (exportedName) {
          // A shorthand property with an assignment initializer is probably part of a
          // destructuring assignment
          if (node.objectAssignmentInitializer) {
            const initializer = createAssignment(exportedName, node.objectAssignmentInitializer);
            return setRange(createPropertyAssignment(name, initializer), node);
          }
          return setRange(createPropertyAssignment(name, exportedName), node);
        }
      }
      return node;
    }

    function substituteExpression(node: Expression) {
      switch (node.kind) {
        case Syntax.Identifier:
          return substituteExpressionIdentifier(<Identifier>node);
        case Syntax.PropertyAccessExpression:
          return substitutePropertyAccessExpression(<PropertyAccessExpression>node);
        case Syntax.ElementAccessExpression:
          return substituteElementAccessExpression(<ElementAccessExpression>node);
      }

      return node;
    }

    function substituteExpressionIdentifier(node: Identifier): Expression {
      return trySubstituteClassAlias(node) || trySubstituteNamespaceExportedName(node) || node;
    }

    function trySubstituteClassAlias(node: Identifier): Expression | undefined {
      if (enabledSubstitutions & TypeScriptSubstitutionFlags.ClassAliases) {
        if (resolver.getNodeCheckFlags(node) & NodeCheckFlags.ConstructorReferenceInClass) {
          // Due to the emit for class decorators, any reference to the class from inside of the class body
          // must instead be rewritten to point to a temporary variable to avoid issues with the double-bind
          // behavior of class names in ES6.
          // Also, when emitting statics for class expressions, we must substitute a class alias for
          // constructor references in static property initializers.
          const declaration = resolver.getReferencedValueDeclaration(node);
          if (declaration) {
            const classAlias = classAliases[declaration.id!]; // TODO: GH#18217
            if (classAlias) {
              const clone = getSynthesizedClone(classAlias);
              setSourceMapRange(clone, node);
              setCommentRange(clone, node);
              return clone;
            }
          }
        }
      }

      return;
    }

    function trySubstituteNamespaceExportedName(node: Identifier): Expression | undefined {
      // If this is explicitly a local name, do not substitute.
      if (enabledSubstitutions & applicableSubstitutions && !Node.is.generatedIdentifier(node) && !isLocalName(node)) {
        // If we are nested within a namespace declaration, we may need to qualifiy
        // an identifier that is exported from a merged namespace.
        const container = resolver.getReferencedExportContainer(node, /*prefixLocals*/ false);
        if (container && container.kind !== Syntax.SourceFile) {
          const substitute =
            (applicableSubstitutions & TypeScriptSubstitutionFlags.NamespaceExports && container.kind === Syntax.ModuleDeclaration) ||
            (applicableSubstitutions & TypeScriptSubstitutionFlags.NonQualifiedEnumMembers && container.kind === Syntax.EnumDeclaration);
          if (substitute) {
            return setRange(createPropertyAccess(getGeneratedNameForNode(container), node), /*location*/ node);
          }
        }
      }

      return;
    }

    function substitutePropertyAccessExpression(node: PropertyAccessExpression) {
      return substituteConstantValue(node);
    }

    function substituteElementAccessExpression(node: ElementAccessExpression) {
      return substituteConstantValue(node);
    }

    function substituteConstantValue(node: PropertyAccessExpression | ElementAccessExpression): LeftHandSideExpression {
      const constantValue = tryGetConstEnumValue(node);
      if (constantValue !== undefined) {
        // track the constant value on the node for the printer in needsDotDotForPropertyAccess
        setConstantValue(node, constantValue);

        const substitute = createLiteral(constantValue);
        if (!compilerOptions.removeComments) {
          const originalNode = Node.get.originalOf(node, isAccessExpression);
          const propertyName = Node.is.kind(PropertyAccessExpression, originalNode) ? declarationNameToString(originalNode.name) : Node.get.textOf(originalNode.argumentExpression);

          addSyntheticTrailingComment(substitute, Syntax.MultiLineCommentTrivia, ` ${propertyName} `);
        }

        return substitute;
      }

      return node;
    }

    function tryGetConstEnumValue(node: Node): string | number | undefined {
      if (compilerOptions.isolatedModules) {
        return;
      }

      return Node.is.kind(PropertyAccessExpression, node) || Node.is.kind(ElementAccessExpression, node) ? resolver.getConstantValue(node) : undefined;
    }
  }

  function createDecorateHelper(context: TransformationContext, decoratorExpressions: Expression[], target: Expression, memberName?: Expression, descriptor?: Expression, location?: TextRange) {
    const argumentsArray: Expression[] = [];
    argumentsArray.push(new ArrayLiteralExpression(decoratorExpressions, /*multiLine*/ true));
    argumentsArray.push(target);
    if (memberName) {
      argumentsArray.push(memberName);
      if (descriptor) {
        argumentsArray.push(descriptor);
      }
    }

    context.requestEmitHelper(decorateHelper);
    return setRange(new qs.CallExpression(getUnscopedHelperName('__decorate'), /*typeArguments*/ undefined, argumentsArray), location);
  }

  export const decorateHelper: UnscopedEmitHelper = {
    name: 'typescript:decorate',
    importName: '__decorate',
    scoped: false,
    priority: 2,
    text: `
            var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
                var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
                if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
                else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
                return c > 3 && r && Object.defineProperty(target, key, r), r;
            };`,
  };

  function createMetadataHelper(context: TransformationContext, metadataKey: string, metadataValue: Expression) {
    context.requestEmitHelper(metadataHelper);
    return new qs.CallExpression(getUnscopedHelperName('__metadata'), /*typeArguments*/ undefined, [createLiteral(metadataKey), metadataValue]);
  }

  export const metadataHelper: UnscopedEmitHelper = {
    name: 'typescript:metadata',
    importName: '__metadata',
    scoped: false,
    priority: 3,
    text: `
            var __metadata = (this && this.__metadata) || function (k, v) {
                if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
            };`,
  };

  function createParamHelper(context: TransformationContext, expression: Expression, parameterOffset: number, location?: TextRange) {
    context.requestEmitHelper(paramHelper);
    return setRange(new qs.CallExpression(getUnscopedHelperName('__param'), /*typeArguments*/ undefined, [createLiteral(parameterOffset), expression]), location);
  }

  export const paramHelper: UnscopedEmitHelper = {
    name: 'typescript:param',
    importName: '__param',
    scoped: false,
    priority: 4,
    text: `
            var __param = (this && this.__param) || function (paramIndex, decorator) {
                return function (target, key) { decorator(target, key, paramIndex); }
            };`,
  };
}
