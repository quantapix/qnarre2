namespace core {
  export function transformSystemModule(context: TransformationContext) {
    interface DependencyGroup {
      name: StringLiteral;
      externalImports: (ImportDeclaration | ImportEqualsDeclaration | ExportDeclaration)[];
    }

    const { startLexicalEnvironment, endLexicalEnvironment, hoistVariableDeclaration } = context;

    const compilerOptions = context.getCompilerOptions();
    const resolver = context.getEmitResolver();
    const host = context.getEmitHost();
    const previousOnSubstituteNode = context.onSubstituteNode;
    const previousOnEmitNode = context.onEmitNode;
    context.onSubstituteNode = onSubstituteNode;
    context.onEmitNode = onEmitNode;
    context.enableSubstitution(Syntax.Identifier); 
    context.enableSubstitution(Syntax.ShorthandPropertyAssignment); 
    context.enableSubstitution(Syntax.BinaryExpression); 
    context.enableSubstitution(Syntax.PrefixUnaryExpression); 
    context.enableSubstitution(Syntax.PostfixUnaryExpression); 
    context.enableSubstitution(Syntax.MetaProperty); 
    context.enableEmitNotification(Syntax.SourceFile); 

    const moduleInfoMap: ExternalModuleInfo[] = []; 
    const deferredExports: (Statement[] | undefined)[] = []; 
    const exportFunctionsMap: Identifier[] = []; 
    const noSubstitutionMap: boolean[][] = []; 
    const contextObjectMap: Identifier[] = []; 

    let currentSourceFile: SourceFile; 
    let moduleInfo: ExternalModuleInfo; 
    let exportFunction: Identifier; 
    let contextObject: Identifier; 
    let hoistedStatements: Statement[] | undefined;
    let enclosingBlockScopedContainer: Node;
    let noSubstitution: boolean[] | undefined; 

    return chainBundle(transformSourceFile);

    function transformSourceFile(node: SourceFile) {
      if (node.isDeclarationFile || !(isEffectiveExternalModule(node, compilerOptions) || node.transformFlags & TransformFlags.ContainsDynamicImport)) {
        return node;
      }

      const id = getOriginalNodeId(node);
      currentSourceFile = node;
      enclosingBlockScopedContainer = node;

      
      
      
      
      
      
      
      
      
      
      
      

      
      moduleInfo = moduleInfoMap[id] = collectExternalModuleInfo(node, resolver, compilerOptions);

      
      
      exportFunction = createUniqueName('exports');
      exportFunctionsMap[id] = exportFunction;
      contextObject = contextObjectMap[id] = createUniqueName('context');

      
      const dependencyGroups = collectDependencyGroups(moduleInfo.externalImports);
      const moduleBodyBlock = createSystemModuleBody(node, dependencyGroups);
      const moduleBodyFunction = new qs.FunctionExpression(
         undefined,
         undefined,
         undefined,
         undefined,
        [createParameter(undefined,  undefined, contextObject)],
        undefined,
        moduleBodyBlock
      );

      
      
      
      const moduleName = tryGetModuleNameFromFile(node, host, compilerOptions);
      const dependencies = new ArrayLiteralExpression(map(dependencyGroups, (dependencyGroup) => dependencyGroup.name));
      const updated = setEmitFlags(
        qp_updateSourceNode(
          node,
          setRange(
            new Nodes([
              createExpressionStatement(
                new qs.CallExpression(
                  createPropertyAccess(new Identifier('System'), 'register'),
                   undefined,
                  moduleName ? [moduleName, dependencies, moduleBodyFunction] : [dependencies, moduleBodyFunction]
                )
              ),
            ]),
            node.statements
          )
        ),
        EmitFlags.NoTrailingComments
      );

      if (!(compilerOptions.outFile || compilerOptions.out)) {
        moveEmitHelpers(updated, moduleBodyBlock, (helper) => !helper.scoped);
      }

      if (noSubstitution) {
        noSubstitutionMap[id] = noSubstitution;
        noSubstitution = undefined;
      }

      currentSourceFile = undefined!;
      moduleInfo = undefined!;
      exportFunction = undefined!;
      contextObject = undefined!;
      hoistedStatements = undefined!;
      enclosingBlockScopedContainer = undefined!;
      return aggregateTransformFlags(updated);
    }

    function collectDependencyGroups(externalImports: (ImportDeclaration | ImportEqualsDeclaration | ExportDeclaration)[]) {
      const groupIndices = createMap<number>();
      const dependencyGroups: DependencyGroup[] = [];
      for (const externalImport of externalImports) {
        const externalModuleName = getExternalModuleNameLiteral(externalImport, currentSourceFile, host, resolver, compilerOptions);
        if (externalModuleName) {
          const text = externalModuleName.text;
          const groupIndex = groupIndices.get(text);
          if (groupIndex !== undefined) {
            
            dependencyGroups[groupIndex].externalImports.push(externalImport);
          } else {
            groupIndices.set(text, dependencyGroups.length);
            dependencyGroups.push({
              name: externalModuleName,
              externalImports: [externalImport],
            });
          }
        }
      }

      return dependencyGroups;
    }

    function createSystemModuleBody(node: SourceFile, dependencyGroups: DependencyGroup[]) {
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      

      const statements: Statement[] = [];

      
      
      
      startLexicalEnvironment();

      
      const ensureUseStrict = getStrictOptionValue(compilerOptions, 'alwaysStrict') || (!compilerOptions.noImplicitUseStrict && qp_isExternalModule(currentSourceFile));
      const statementOffset = addPrologue(statements, node.statements, ensureUseStrict, sourceElementVisitor);

      
      statements.push(
        createVariableStatement(
           undefined,
          createVariableDeclarationList([createVariableDeclaration('__moduleName', undefined, createLogicalAnd(contextObject, createPropertyAccess(contextObject, 'id')))])
        )
      );

      
      visitNode(moduleInfo.externalHelpersImportDeclaration, sourceElementVisitor, isStatement);

      
      
      
      
      
      const executeStatements = Nodes.visit(node.statements, sourceElementVisitor, isStatement, statementOffset);

      
      addRange(statements, hoistedStatements);

      
      
      
      insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());

      const exportStarFunction = addExportStarIfNeeded(statements)!; 
      const modifiers = node.transformFlags & TransformFlags.ContainsAwait ? createModifiersFromModifierFlags(ModifierFlags.Async) : undefined;
      const moduleObject = createObjectLiteral([
        createPropertyAssignment('setters', createSettersArray(exportStarFunction, dependencyGroups)),
        createPropertyAssignment(
          'execute',
          new qs.FunctionExpression(
            modifiers,
             undefined,
             undefined,
             undefined,
             [],
            undefined,
            new Block(executeStatements,  true)
          )
        ),
      ]);

      moduleObject.multiLine = true;
      statements.push(createReturn(moduleObject));
      return new Block(statements,  true);
    }

    function addExportStarIfNeeded(statements: Statement[]) {
      if (!moduleInfo.hasExportStarsToExportValues) {
        return;
      }

      
      
      
      

      
      if (!moduleInfo.exportedNames && moduleInfo.exportSpecifiers.size === 0) {
        
        
        let hasExportDeclarationWithExportClause = false;
        for (const externalImport of moduleInfo.externalImports) {
          if (externalImport.kind === Syntax.ExportDeclaration && externalImport.exportClause) {
            hasExportDeclarationWithExportClause = true;
            break;
          }
        }

        if (!hasExportDeclarationWithExportClause) {
          
          const exportStarFunction = createExportStarFunction( undefined);
          statements.push(exportStarFunction);
          return exportStarFunction.name;
        }
      }

      const exportedNames: ObjectLiteralElementLike[] = [];
      if (moduleInfo.exportedNames) {
        for (const exportedLocalName of moduleInfo.exportedNames) {
          if (exportedLocalName.escapedText === 'default') {
            continue;
          }

          
          exportedNames.push(createPropertyAssignment(createLiteral(exportedLocalName), createTrue()));
        }
      }

      for (const externalImport of moduleInfo.externalImports) {
        if (externalImport.kind !== Syntax.ExportDeclaration) {
          continue;
        }

        if (!externalImport.exportClause) {
          
          continue;
        }

        if (Node.is.kind(NamedExports, externalImport.exportClause)) {
          for (const element of externalImport.exportClause.elements) {
            
            exportedNames.push(createPropertyAssignment(createLiteral(idText(element.name || element.propertyName)), createTrue()));
          }
        } else {
          exportedNames.push(createPropertyAssignment(createLiteral(idText(externalImport.exportClause.name)), createTrue()));
        }
      }

      const exportedNamesStorageRef = createUniqueName('exportedNames');
      statements.push(
        createVariableStatement(
           undefined,
          createVariableDeclarationList([createVariableDeclaration(exportedNamesStorageRef, undefined, createObjectLiteral(exportedNames,  true))])
        )
      );

      const exportStarFunction = createExportStarFunction(exportedNamesStorageRef);
      statements.push(exportStarFunction);
      return exportStarFunction.name;
    }

    function createExportStarFunction(localNames: Identifier | undefined) {
      const exportStarFunction = createUniqueName('exportStar');
      const m = new Identifier('m');
      const n = new Identifier('n');
      const exports = new Identifier('exports');
      let condition: Expression = createStrictInequality(n, createLiteral('default'));
      if (localNames) {
        condition = createLogicalAnd(condition, qs.PrefixUnaryExpression.logicalNot(new qs.CallExpression(createPropertyAccess(localNames, 'hasOwnProperty'),  undefined, [n])));
      }

      return createFunctionDeclaration(
        undefined,
         undefined,
         undefined,
        exportStarFunction,
         undefined,
        [createParameter(undefined,  undefined, m)],
        undefined,
        new Block(
          [
            createVariableStatement( undefined, createVariableDeclarationList([createVariableDeclaration(exports, undefined, createObjectLiteral([]))])),
            createForIn(
              createVariableDeclarationList([createVariableDeclaration(n, undefined)]),
              m,
              new Block([
                setEmitFlags(createIf(condition, createExpressionStatement(createAssignment(new qs.ElementAccessExpression(exports, n), new qs.ElementAccessExpression(m, n)))), EmitFlags.SingleLine),
              ])
            ),
            createExpressionStatement(new qs.CallExpression(exportFunction,  undefined, [exports])),
          ],
           true
        )
      );
    }

    function createSettersArray(exportStarFunction: Identifier, dependencyGroups: DependencyGroup[]) {
      const setters: Expression[] = [];
      for (const group of dependencyGroups) {
        
        const localName = forEach(group.externalImports, (i) => getLocalNameForExternalImport(i, currentSourceFile));
        const parameterName = localName ? getGeneratedNameForNode(localName) : createUniqueName('');
        const statements: Statement[] = [];
        for (const entry of group.externalImports) {
          const importVariableName = getLocalNameForExternalImport(entry, currentSourceFile)!; 
          switch (entry.kind) {
            case Syntax.ImportDeclaration:
              if (!entry.importClause) {
                
                
                break;
              }
            

            case Syntax.ImportEqualsDeclaration:
              assert(importVariableName !== undefined);
              
              statements.push(createExpressionStatement(createAssignment(importVariableName, parameterName)));
              break;

            case Syntax.ExportDeclaration:
              assert(importVariableName !== undefined);
              if (entry.exportClause) {
                if (Node.is.kind(NamedExports, entry.exportClause)) {
                  
                  
                  
                  
                  
                  
                  
                  
                  const properties: PropertyAssignment[] = [];
                  for (const e of entry.exportClause.elements) {
                    properties.push(createPropertyAssignment(createLiteral(idText(e.name)), new qs.ElementAccessExpression(parameterName, createLiteral(idText(e.propertyName || e.name)))));
                  }

                  statements.push(createExpressionStatement(new qs.CallExpression(exportFunction,  true)])));
                } else {
                  statements.push(createExpressionStatement(new qs.CallExpression(exportFunction,  undefined, [createLiteral(idText(entry.exportClause.name)), parameterName])));
                }
              } else {
                
                
                
                
                
                statements.push(createExpressionStatement(new qs.CallExpression(exportStarFunction,  undefined, [parameterName])));
              }
              break;
          }
        }

        setters.push(
          new qs.FunctionExpression(
             undefined,
             undefined,
             undefined,
             undefined,
            [createParameter(undefined,  undefined, parameterName)],
            undefined,
            new Block(statements,  true)
          )
        );
      }

      return new ArrayLiteralExpression(setters,  true);
    }

    
    
    

    function sourceElementVisitor(node: Node): VisitResult<Node> {
      switch (node.kind) {
        case Syntax.ImportDeclaration:
          return visitImportDeclaration(<ImportDeclaration>node);

        case Syntax.ImportEqualsDeclaration:
          return visitImportEqualsDeclaration(<ImportEqualsDeclaration>node);

        case Syntax.ExportDeclaration:
          return visitExportDeclaration(<ExportDeclaration>node);

        case Syntax.ExportAssignment:
          return visitExportAssignment(<ExportAssignment>node);

        default:
          return nestedElementVisitor(node);
      }
    }

    function visitImportDeclaration(node: ImportDeclaration): VisitResult<Statement> {
      let statements: Statement[] | undefined;
      if (node.importClause) {
        hoistVariableDeclaration(getLocalNameForExternalImport(node, currentSourceFile)!); 
      }

      if (hasAssociatedEndOfDeclarationMarker(node)) {
        
        const id = getOriginalNodeId(node);
        deferredExports[id] = appendExportsOfImportDeclaration(deferredExports[id], node);
      } else {
        statements = appendExportsOfImportDeclaration(statements, node);
      }

      return singleOrMany(statements);
    }

    function visitExportDeclaration(node: ExportDeclaration): VisitResult<Statement> {
      Debug.assertIsDefined(node);
      return;
    }

    function visitImportEqualsDeclaration(node: ImportEqualsDeclaration): VisitResult<Statement> {
      assert(Node.is.externalModuleImportEqualsDeclaration(node), 'import= for internal module references should be handled in an earlier transformer.');

      let statements: Statement[] | undefined;
      hoistVariableDeclaration(getLocalNameForExternalImport(node, currentSourceFile)!); 

      if (hasAssociatedEndOfDeclarationMarker(node)) {
        
        const id = getOriginalNodeId(node);
        deferredExports[id] = appendExportsOfImportEqualsDeclaration(deferredExports[id], node);
      } else {
        statements = appendExportsOfImportEqualsDeclaration(statements, node);
      }

      return singleOrMany(statements);
    }

    function visitExportAssignment(node: ExportAssignment): VisitResult<Statement> {
      if (node.isExportEquals) {
        
        return;
      }

      const expression = visitNode(node.expression, destructuringAndImportCallVisitor, isExpression);
      const original = node.original;
      if (original && hasAssociatedEndOfDeclarationMarker(original)) {
        
        const id = getOriginalNodeId(node);
        deferredExports[id] = appendExportStatement(deferredExports[id], new Identifier('default'), expression,  true);
      } else {
        return createExportStatement(new Identifier('default'), expression,  true);
      }
    }

    function visitFunctionDeclaration(node: FunctionDeclaration): VisitResult<Statement> {
      if (hasSyntacticModifier(node, ModifierFlags.Export)) {
        hoistedStatements = append(
          hoistedStatements,
          updateFunctionDeclaration(
            node,
            node.decorators,
            Nodes.visit(node.modifiers, modifierVisitor, isModifier),
            node.asteriskToken,
            getDeclarationName(node,  true),
             undefined,
            Nodes.visit(node.parameters, destructuringAndImportCallVisitor, isParameterDeclaration),
            undefined,
            visitNode(node.body, destructuringAndImportCallVisitor, isBlock)
          )
        );
      } else {
        hoistedStatements = append(hoistedStatements, visitEachChild(node, destructuringAndImportCallVisitor, context));
      }

      if (hasAssociatedEndOfDeclarationMarker(node)) {
        
        const id = getOriginalNodeId(node);
        deferredExports[id] = appendExportsOfHoistedDeclaration(deferredExports[id], node);
      } else {
        hoistedStatements = appendExportsOfHoistedDeclaration(hoistedStatements, node);
      }

      return;
    }

    function visitClassDeclaration(node: ClassDeclaration): VisitResult<Statement> {
      let statements: Statement[] | undefined;

      
      const name = getLocalName(node);
      hoistVariableDeclaration(name);

      
      statements = append(
        statements,
        setRange(
          createExpressionStatement(
            createAssignment(
              name,
              setRange(
                createClassExpression(
                   undefined,
                  node.name,
                   undefined,
                  Nodes.visit(node.heritageClauses, destructuringAndImportCallVisitor, isHeritageClause),
                  Nodes.visit(node.members, destructuringAndImportCallVisitor, isClassElement)
                ),
                node
              )
            )
          ),
          node
        )
      );

      if (hasAssociatedEndOfDeclarationMarker(node)) {
        
        const id = getOriginalNodeId(node);
        deferredExports[id] = appendExportsOfHoistedDeclaration(deferredExports[id], node);
      } else {
        statements = appendExportsOfHoistedDeclaration(statements, node);
      }

      return singleOrMany(statements);
    }

    function visitVariableStatement(node: VariableStatement): VisitResult<Statement> {
      if (!shouldHoistVariableDeclarationList(node.declarationList)) {
        return visitNode(node, destructuringAndImportCallVisitor, isStatement);
      }

      let expressions: Expression[] | undefined;
      const isExportedDeclaration = hasSyntacticModifier(node, ModifierFlags.Export);
      const isMarkedDeclaration = hasAssociatedEndOfDeclarationMarker(node);
      for (const variable of node.declarationList.declarations) {
        if (variable.initializer) {
          expressions = append(expressions, transformInitializedVariable(variable, isExportedDeclaration && !isMarkedDeclaration));
        } else {
          hoistBindingElement(variable);
        }
      }

      let statements: Statement[] | undefined;
      if (expressions) {
        statements = append(statements, setRange(createExpressionStatement(inlineExpressions(expressions)), node));
      }

      if (isMarkedDeclaration) {
        
        const id = getOriginalNodeId(node);
        deferredExports[id] = appendExportsOfVariableStatement(deferredExports[id], node, isExportedDeclaration);
      } else {
        statements = appendExportsOfVariableStatement(statements, node,  false);
      }

      return singleOrMany(statements);
    }

    function hoistBindingElement(node: VariableDeclaration | BindingElement): void {
      if (Node.is.kind(BindingPattern, node.name)) {
        for (const element of node.name.elements) {
          if (!Node.is.kind(OmittedExpression, element)) {
            hoistBindingElement(element);
          }
        }
      } else {
        hoistVariableDeclaration(getSynthesizedClone(node.name));
      }
    }

    function shouldHoistVariableDeclarationList(node: VariableDeclarationList) {
      
      return (Node.get.emitFlags(node) & EmitFlags.NoHoisting) === 0 && (enclosingBlockScopedContainer.kind === Syntax.SourceFile || (Node.get.originalOf(node).flags & NodeFlags.BlockScoped) === 0);
    }

    function transformInitializedVariable(node: VariableDeclaration, isExportedDeclaration: boolean): Expression {
      const createAssignment = isExportedDeclaration ? createExportedVariableAssignment : createNonExportedVariableAssignment;
      return Node.is.kind(BindingPattern, node.name)
        ? flattenDestructuringAssignment(node, destructuringAndImportCallVisitor, context, FlattenLevel.All,  false, createAssignment)
        : node.initializer
        ? createAssignment(node.name, visitNode(node.initializer, destructuringAndImportCallVisitor, isExpression))
        : node.name;
    }

    function createExportedVariableAssignment(name: Identifier, value: Expression, location?: TextRange) {
      return createVariableAssignment(name, value, location,  true);
    }

    function createNonExportedVariableAssignment(name: Identifier, value: Expression, location?: TextRange) {
      return createVariableAssignment(name, value, location,  false);
    }

    function createVariableAssignment(name: Identifier, value: Expression, location: TextRange | undefined, isExportedDeclaration: boolean) {
      hoistVariableDeclaration(getSynthesizedClone(name));
      return isExportedDeclaration
        ? createExportExpression(name, preventSubstitution(setRange(createAssignment(name, value), location)))
        : preventSubstitution(setRange(createAssignment(name, value), location));
    }

    function visitMergeDeclarationMarker(node: MergeDeclarationMarker): VisitResult<Statement> {
      
      
      
      
      
      
      
      if (hasAssociatedEndOfDeclarationMarker(node) && node.original!.kind === Syntax.VariableStatement) {
        const id = getOriginalNodeId(node);
        const isExportedDeclaration = hasSyntacticModifier(node.original!, ModifierFlags.Export);
        deferredExports[id] = appendExportsOfVariableStatement(deferredExports[id], <VariableStatement>node.original, isExportedDeclaration);
      }

      return node;
    }

    function hasAssociatedEndOfDeclarationMarker(node: Node) {
      return (Node.get.emitFlags(node) & EmitFlags.HasEndOfDeclarationMarker) !== 0;
    }

    function visitEndOfDeclarationMarker(node: EndOfDeclarationMarker): VisitResult<Statement> {
      
      
      
      const id = getOriginalNodeId(node);
      const statements = deferredExports[id];
      if (statements) {
        delete deferredExports[id];
        return append(statements, node);
      } else {
        const original = Node.get.originalOf(node);
        if (Node.is.moduleOrEnumDeclaration(original)) {
          return append(appendExportsOfDeclaration(statements, original), node);
        }
      }

      return node;
    }

    function appendExportsOfImportDeclaration(statements: Statement[] | undefined, decl: ImportDeclaration) {
      if (moduleInfo.exportEquals) {
        return statements;
      }

      const importClause = decl.importClause;
      if (!importClause) {
        return statements;
      }

      if (importClause.name) {
        statements = appendExportsOfDeclaration(statements, importClause);
      }

      const namedBindings = importClause.namedBindings;
      if (namedBindings) {
        switch (namedBindings.kind) {
          case Syntax.NamespaceImport:
            statements = appendExportsOfDeclaration(statements, namedBindings);
            break;

          case Syntax.NamedImports:
            for (const importBinding of namedBindings.elements) {
              statements = appendExportsOfDeclaration(statements, importBinding);
            }

            break;
        }
      }

      return statements;
    }

    function appendExportsOfImportEqualsDeclaration(statements: Statement[] | undefined, decl: ImportEqualsDeclaration): Statement[] | undefined {
      if (moduleInfo.exportEquals) {
        return statements;
      }

      return appendExportsOfDeclaration(statements, decl);
    }

    function appendExportsOfVariableStatement(statements: Statement[] | undefined, node: VariableStatement, exportSelf: boolean): Statement[] | undefined {
      if (moduleInfo.exportEquals) {
        return statements;
      }

      for (const decl of node.declarationList.declarations) {
        if (decl.initializer || exportSelf) {
          statements = appendExportsOfBindingElement(statements, decl, exportSelf);
        }
      }

      return statements;
    }

    function appendExportsOfBindingElement(statements: Statement[] | undefined, decl: VariableDeclaration | BindingElement, exportSelf: boolean): Statement[] | undefined {
      if (moduleInfo.exportEquals) {
        return statements;
      }

      if (Node.is.kind(BindingPattern, decl.name)) {
        for (const element of decl.name.elements) {
          if (!Node.is.kind(OmittedExpression, element)) {
            statements = appendExportsOfBindingElement(statements, element, exportSelf);
          }
        }
      } else if (!Node.is.generatedIdentifier(decl.name)) {
        let excludeName: string | undefined;
        if (exportSelf) {
          statements = appendExportStatement(statements, decl.name, getLocalName(decl));
          excludeName = idText(decl.name);
        }

        statements = appendExportsOfDeclaration(statements, decl, excludeName);
      }

      return statements;
    }

    function appendExportsOfHoistedDeclaration(statements: Statement[] | undefined, decl: ClassDeclaration | FunctionDeclaration): Statement[] | undefined {
      if (moduleInfo.exportEquals) {
        return statements;
      }

      let excludeName: string | undefined;
      if (hasSyntacticModifier(decl, ModifierFlags.Export)) {
        const exportName = hasSyntacticModifier(decl, ModifierFlags.Default) ? createLiteral('default') : decl.name!;
        statements = appendExportStatement(statements, exportName, getLocalName(decl));
        excludeName = getTextOfIdentifierOrLiteral(exportName);
      }

      if (decl.name) {
        statements = appendExportsOfDeclaration(statements, decl, excludeName);
      }

      return statements;
    }

    function appendExportsOfDeclaration(statements: Statement[] | undefined, decl: Declaration, excludeName?: string): Statement[] | undefined {
      if (moduleInfo.exportEquals) {
        return statements;
      }

      const name = getDeclarationName(decl);
      const exportSpecifiers = moduleInfo.exportSpecifiers.get(idText(name));
      if (exportSpecifiers) {
        for (const exportSpecifier of exportSpecifiers) {
          if (exportSpecifier.name.escapedText !== excludeName) {
            statements = appendExportStatement(statements, exportSpecifier.name, name);
          }
        }
      }
      return statements;
    }

    function appendExportStatement(statements: Statement[] | undefined, exportName: Identifier | StringLiteral, expression: Expression, allowComments?: boolean): Statement[] | undefined {
      statements = append(statements, createExportStatement(exportName, expression, allowComments));
      return statements;
    }

    function createExportStatement(name: Identifier | StringLiteral, value: Expression, allowComments?: boolean) {
      const statement = createExpressionStatement(createExportExpression(name, value));
      startOnNewLine(statement);
      if (!allowComments) {
        setEmitFlags(statement, EmitFlags.NoComments);
      }

      return statement;
    }

    function createExportExpression(name: Identifier | StringLiteral, value: Expression) {
      const exportName = Node.is.kind(Identifier, name) ? createLiteral(name) : name;
      setEmitFlags(value, Node.get.emitFlags(value) | EmitFlags.NoComments);
      return setCommentRange(new qs.CallExpression(exportFunction,  undefined, [exportName, value]), value);
    }

    
    
    

    function nestedElementVisitor(node: Node): VisitResult<Node> {
      switch (node.kind) {
        case Syntax.VariableStatement:
          return visitVariableStatement(<VariableStatement>node);

        case Syntax.FunctionDeclaration:
          return visitFunctionDeclaration(<FunctionDeclaration>node);

        case Syntax.ClassDeclaration:
          return visitClassDeclaration(<ClassDeclaration>node);

        case Syntax.ForStatement:
          return visitForStatement(<ForStatement>node);

        case Syntax.ForInStatement:
          return visitForInStatement(<ForInStatement>node);

        case Syntax.ForOfStatement:
          return visitForOfStatement(<ForOfStatement>node);

        case Syntax.DoStatement:
          return visitDoStatement(<DoStatement>node);

        case Syntax.WhileStatement:
          return visitWhileStatement(<WhileStatement>node);

        case Syntax.LabeledStatement:
          return visitLabeledStatement(<LabeledStatement>node);

        case Syntax.WithStatement:
          return visitWithStatement(<WithStatement>node);

        case Syntax.SwitchStatement:
          return visitSwitchStatement(<SwitchStatement>node);

        case Syntax.CaseBlock:
          return visitCaseBlock(<CaseBlock>node);

        case Syntax.CaseClause:
          return visitCaseClause(<CaseClause>node);

        case Syntax.DefaultClause:
          return visitDefaultClause(<DefaultClause>node);

        case Syntax.TryStatement:
          return visitTryStatement(<TryStatement>node);

        case Syntax.CatchClause:
          return visitCatchClause(<CatchClause>node);

        case Syntax.Block:
          return visitBlock(<Block>node);

        case Syntax.MergeDeclarationMarker:
          return visitMergeDeclarationMarker(<MergeDeclarationMarker>node);

        case Syntax.EndOfDeclarationMarker:
          return visitEndOfDeclarationMarker(<EndOfDeclarationMarker>node);

        default:
          return destructuringAndImportCallVisitor(node);
      }
    }

    function visitForStatement(node: ForStatement): VisitResult<Statement> {
      const savedEnclosingBlockScopedContainer = enclosingBlockScopedContainer;
      enclosingBlockScopedContainer = node;

      node = updateFor(
        node,
        node.initializer && visitForInitializer(node.initializer),
        visitNode(node.condition, destructuringAndImportCallVisitor, isExpression),
        visitNode(node.incrementor, destructuringAndImportCallVisitor, isExpression),
        visitNode(node.statement, nestedElementVisitor, isStatement)
      );

      enclosingBlockScopedContainer = savedEnclosingBlockScopedContainer;
      return node;
    }

    function visitForInStatement(node: ForInStatement): VisitResult<Statement> {
      const savedEnclosingBlockScopedContainer = enclosingBlockScopedContainer;
      enclosingBlockScopedContainer = node;

      node = updateForIn(
        node,
        visitForInitializer(node.initializer),
        visitNode(node.expression, destructuringAndImportCallVisitor, isExpression),
        visitNode(node.statement, nestedElementVisitor, isStatement, liftToBlock)
      );

      enclosingBlockScopedContainer = savedEnclosingBlockScopedContainer;
      return node;
    }

    function visitForOfStatement(node: ForOfStatement): VisitResult<Statement> {
      const savedEnclosingBlockScopedContainer = enclosingBlockScopedContainer;
      enclosingBlockScopedContainer = node;

      node = updateForOf(
        node,
        node.awaitModifier,
        visitForInitializer(node.initializer),
        visitNode(node.expression, destructuringAndImportCallVisitor, isExpression),
        visitNode(node.statement, nestedElementVisitor, isStatement, liftToBlock)
      );

      enclosingBlockScopedContainer = savedEnclosingBlockScopedContainer;
      return node;
    }

    function shouldHoistForInitializer(node: ForInitializer): node is VariableDeclarationList {
      return Node.is.kind(VariableDeclarationList, node) && shouldHoistVariableDeclarationList(node);
    }

    function visitForInitializer(node: ForInitializer): ForInitializer {
      if (shouldHoistForInitializer(node)) {
        let expressions: Expression[] | undefined;
        for (const variable of node.declarations) {
          expressions = append(expressions, transformInitializedVariable(variable,  false));
          if (!variable.initializer) {
            hoistBindingElement(variable);
          }
        }

        return expressions ? inlineExpressions(expressions) : createOmittedExpression();
      } else {
        return visitEachChild(node, nestedElementVisitor, context);
      }
    }

    function visitDoStatement(node: DoStatement): VisitResult<Statement> {
      return updateDo(node, visitNode(node.statement, nestedElementVisitor, isStatement, liftToBlock), visitNode(node.expression, destructuringAndImportCallVisitor, isExpression));
    }

    function visitWhileStatement(node: WhileStatement): VisitResult<Statement> {
      return updateWhile(node, visitNode(node.expression, destructuringAndImportCallVisitor, isExpression), visitNode(node.statement, nestedElementVisitor, isStatement, liftToBlock));
    }

    function visitLabeledStatement(node: LabeledStatement): VisitResult<Statement> {
      return updateLabel(node, node.label, visitNode(node.statement, nestedElementVisitor, isStatement, liftToBlock));
    }

    function visitWithStatement(node: WithStatement): VisitResult<Statement> {
      return updateWith(node, visitNode(node.expression, destructuringAndImportCallVisitor, isExpression), visitNode(node.statement, nestedElementVisitor, isStatement, liftToBlock));
    }

    function visitSwitchStatement(node: SwitchStatement): VisitResult<Statement> {
      return updateSwitch(node, visitNode(node.expression, destructuringAndImportCallVisitor, isExpression), visitNode(node.caseBlock, nestedElementVisitor, isCaseBlock));
    }

    function visitCaseBlock(node: CaseBlock): CaseBlock {
      const savedEnclosingBlockScopedContainer = enclosingBlockScopedContainer;
      enclosingBlockScopedContainer = node;

      node = updateCaseBlock(node, Nodes.visit(node.clauses, nestedElementVisitor, isCaseOrDefaultClause));

      enclosingBlockScopedContainer = savedEnclosingBlockScopedContainer;
      return node;
    }

    function visitCaseClause(node: CaseClause): VisitResult<CaseOrDefaultClause> {
      return updateCaseClause(node, visitNode(node.expression, destructuringAndImportCallVisitor, isExpression), Nodes.visit(node.statements, nestedElementVisitor, isStatement));
    }

    function visitDefaultClause(node: DefaultClause): VisitResult<CaseOrDefaultClause> {
      return visitEachChild(node, nestedElementVisitor, context);
    }

    function visitTryStatement(node: TryStatement): VisitResult<Statement> {
      return visitEachChild(node, nestedElementVisitor, context);
    }

    function visitCatchClause(node: CatchClause): CatchClause {
      const savedEnclosingBlockScopedContainer = enclosingBlockScopedContainer;
      enclosingBlockScopedContainer = node;

      node = updateCatchClause(node, node.variableDeclaration, visitNode(node.block, nestedElementVisitor, isBlock));

      enclosingBlockScopedContainer = savedEnclosingBlockScopedContainer;
      return node;
    }

    function visitBlock(node: Block): Block {
      const savedEnclosingBlockScopedContainer = enclosingBlockScopedContainer;
      enclosingBlockScopedContainer = node;

      node = visitEachChild(node, nestedElementVisitor, context);

      enclosingBlockScopedContainer = savedEnclosingBlockScopedContainer;
      return node;
    }

    
    
    

    function destructuringAndImportCallVisitor(node: Node): VisitResult<Node> {
      if (isDestructuringAssignment(node)) {
        return visitDestructuringAssignment(node);
      } else if (Node.is.importCall(node)) {
        return visitImportCallExpression(node);
      } else if (node.transformFlags & TransformFlags.ContainsDestructuringAssignment || node.transformFlags & TransformFlags.ContainsDynamicImport) {
        return visitEachChild(node, destructuringAndImportCallVisitor, context);
      } else {
        return node;
      }
    }

    function visitImportCallExpression(node: ImportCall): Expression {
      
      
      
      
      
      
      
      
      
      
      return new qs.CallExpression(
        createPropertyAccess(contextObject, new Identifier('import')),
         undefined,
        some(node.arguments) ? [visitNode(node.arguments[0], destructuringAndImportCallVisitor)] : []
      );
    }

    function visitDestructuringAssignment(node: DestructuringAssignment): VisitResult<Expression> {
      if (hasExportedReferenceInDestructuringTarget(node.left)) {
        return flattenDestructuringAssignment(node, destructuringAndImportCallVisitor, context, FlattenLevel.All,  true);
      }

      return visitEachChild(node, destructuringAndImportCallVisitor, context);
    }

    function hasExportedReferenceInDestructuringTarget(node: Expression | ObjectLiteralElementLike): boolean {
      if (isAssignmentExpression(node,  true)) {
        return hasExportedReferenceInDestructuringTarget(node.left);
      } else if (Node.is.kind(SpreadElement, node)) {
        return hasExportedReferenceInDestructuringTarget(node.expression);
      } else if (Node.is.kind(ObjectLiteralExpression, node)) {
        return some(node.properties, hasExportedReferenceInDestructuringTarget);
      } else if (isArrayLiteralExpression(node)) {
        return some(node.elements, hasExportedReferenceInDestructuringTarget);
      } else if (Node.is.kind(ShorthandPropertyAssignment, node)) {
        return hasExportedReferenceInDestructuringTarget(node.name);
      } else if (Node.is.kind(PropertyAssignment, node)) {
        return hasExportedReferenceInDestructuringTarget(node.initializer);
      } else if (Node.is.kind(Identifier, node)) {
        const container = resolver.getReferencedExportContainer(node);
        return container !== undefined && container.kind === Syntax.SourceFile;
      } else {
        return false;
      }
    }

    
    
    

    function modifierVisitor(node: Node): VisitResult<Node> {
      switch (node.kind) {
        case Syntax.ExportKeyword:
        case Syntax.DefaultKeyword:
          return;
      }
      return node;
    }

    
    
    

    function onEmitNode(hint: EmitHint, node: Node, emitCallback: (hint: EmitHint, node: Node) => void): void {
      if (node.kind === Syntax.SourceFile) {
        const id = getOriginalNodeId(node);
        currentSourceFile = <SourceFile>node;
        moduleInfo = moduleInfoMap[id];
        exportFunction = exportFunctionsMap[id];
        noSubstitution = noSubstitutionMap[id];
        contextObject = contextObjectMap[id];

        if (noSubstitution) {
          delete noSubstitutionMap[id];
        }

        previousOnEmitNode(hint, node, emitCallback);

        currentSourceFile = undefined!;
        moduleInfo = undefined!;
        exportFunction = undefined!;
        contextObject = undefined!;
        noSubstitution = undefined;
      } else {
        previousOnEmitNode(hint, node, emitCallback);
      }
    }

    
    
    

    function onSubstituteNode(hint: EmitHint, node: Node) {
      node = previousOnSubstituteNode(hint, node);
      if (isSubstitutionPrevented(node)) {
        return node;
      }

      if (hint === EmitHint.Expression) {
        return substituteExpression(<Expression>node);
      } else if (hint === EmitHint.Unspecified) {
        return substituteUnspecified(node);
      }

      return node;
    }

    function substituteUnspecified(node: Node) {
      switch (node.kind) {
        case Syntax.ShorthandPropertyAssignment:
          return substituteShorthandPropertyAssignment(<ShorthandPropertyAssignment>node);
      }
      return node;
    }

    function substituteShorthandPropertyAssignment(node: ShorthandPropertyAssignment) {
      const name = node.name;
      if (!Node.is.generatedIdentifier(name) && !isLocalName(name)) {
        const importDeclaration = resolver.getReferencedImportDeclaration(name);
        if (importDeclaration) {
          if (Node.is.kind(ImportClause, importDeclaration)) {
            return setRange(createPropertyAssignment(getSynthesizedClone(name), createPropertyAccess(getGeneratedNameForNode(importDeclaration.parent), new Identifier('default'))),  node);
          } else if (Node.is.kind(ImportSpecifier, importDeclaration)) {
            return setRange(
              createPropertyAssignment(
                getSynthesizedClone(name),
                createPropertyAccess(getGeneratedNameForNode(importDeclaration.parent.parent.parent), getSynthesizedClone(importDeclaration.propertyName || importDeclaration.name))
              ),
               node
            );
          }
        }
      }
      return node;
    }

    function substituteExpression(node: Expression) {
      switch (node.kind) {
        case Syntax.Identifier:
          return substituteExpressionIdentifier(<Identifier>node);
        case Syntax.BinaryExpression:
          return substituteBinaryExpression(<BinaryExpression>node);
        case Syntax.PrefixUnaryExpression:
        case Syntax.PostfixUnaryExpression:
          return substituteUnaryExpression(<PrefixUnaryExpression | PostfixUnaryExpression>node);
        case Syntax.MetaProperty:
          return substituteMetaProperty(<MetaProperty>node);
      }

      return node;
    }

    function substituteExpressionIdentifier(node: Identifier): Expression {
      if (Node.get.emitFlags(node) & EmitFlags.HelperName) {
        const externalHelpersModuleName = getExternalHelpersModuleName(currentSourceFile);
        if (externalHelpersModuleName) {
          return createPropertyAccess(externalHelpersModuleName, node);
        }

        return node;
      }

      
      
      
      
      
      
      if (!Node.is.generatedIdentifier(node) && !isLocalName(node)) {
        const importDeclaration = resolver.getReferencedImportDeclaration(node);
        if (importDeclaration) {
          if (Node.is.kind(ImportClause, importDeclaration)) {
            return setRange(createPropertyAccess(getGeneratedNameForNode(importDeclaration.parent), new Identifier('default')),  node);
          } else if (Node.is.kind(ImportSpecifier, importDeclaration)) {
            return setRange(
              createPropertyAccess(getGeneratedNameForNode(importDeclaration.parent.parent.parent), getSynthesizedClone(importDeclaration.propertyName || importDeclaration.name)),
               node
            );
          }
        }
      }

      return node;
    }

    function substituteBinaryExpression(node: BinaryExpression): Expression {
      
      
      
      
      
      
      
      
      if (
        syntax.is.assignmentOperator(node.operatorToken.kind) &&
        Node.is.kind(Identifier, node.left) &&
        !Node.is.generatedIdentifier(node.left) &&
        !isLocalName(node.left) &&
        !isDeclarationNameOfEnumOrNamespace(node.left)
      ) {
        const exportedNames = getExports(node.left);
        if (exportedNames) {
          
          let expression: Expression = node;
          for (const exportName of exportedNames) {
            expression = createExportExpression(exportName, preventSubstitution(expression));
          }

          return expression;
        }
      }

      return node;
    }

    function substituteUnaryExpression(node: PrefixUnaryExpression | PostfixUnaryExpression): Expression {
      
      
      
      
      
      
      
      
      
      if (
        (node.operator === Syntax.Plus2Token || node.operator === Syntax.Minus2Token) &&
        Node.is.kind(Identifier, node.operand) &&
        !Node.is.generatedIdentifier(node.operand) &&
        !isLocalName(node.operand) &&
        !isDeclarationNameOfEnumOrNamespace(node.operand)
      ) {
        const exportedNames = getExports(node.operand);
        if (exportedNames) {
          let expression: Expression = node.kind === Syntax.PostfixUnaryExpression ? setRange(new qs.PrefixUnaryExpression(node.operator, node.operand), node) : node;

          for (const exportName of exportedNames) {
            expression = createExportExpression(exportName, preventSubstitution(expression));
          }

          if (node.kind === Syntax.PostfixUnaryExpression) {
            expression = node.operator === Syntax.Plus2Token ? createSubtract(preventSubstitution(expression), createLiteral(1)) : createAdd(preventSubstitution(expression), createLiteral(1));
          }

          return expression;
        }
      }

      return node;
    }

    function substituteMetaProperty(node: MetaProperty) {
      if (Node.is.importMeta(node)) {
        return createPropertyAccess(contextObject, new Identifier('meta'));
      }
      return node;
    }

    function getExports(name: Identifier) {
      let exportedNames: Identifier[] | undefined;
      if (!Node.is.generatedIdentifier(name)) {
        const valueDeclaration = resolver.getReferencedImportDeclaration(name) || resolver.getReferencedValueDeclaration(name);

        if (valueDeclaration) {
          const exportContainer = resolver.getReferencedExportContainer(name,  false);
          if (exportContainer && exportContainer.kind === Syntax.SourceFile) {
            exportedNames = append(exportedNames, getDeclarationName(valueDeclaration));
          }

          exportedNames = addRange(exportedNames, moduleInfo && moduleInfo.exportedBindings[getOriginalNodeId(valueDeclaration)]);
        }
      }

      return exportedNames;
    }

    function preventSubstitution<T extends Node>(node: T): T {
      if (noSubstitution === undefined) noSubstitution = [];
      noSubstitution[getNodeId(node)] = true;
      return node;
    }

    function isSubstitutionPrevented(node: Node) {
      return noSubstitution && node.id && noSubstitution[node.id];
    }
  }
}
