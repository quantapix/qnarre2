namespace core {
  export function transformModule(context: TransformationContext) {
    interface AsynchronousDependencies {
      aliasedModuleNames: Expression[];
      unaliasedModuleNames: Expression[];
      importAliasNames: ParameterDeclaration[];
    }

    function getTransformModuleDelegate(moduleKind: ModuleKind): (node: SourceFile) => SourceFile {
      switch (moduleKind) {
        case ModuleKind.AMD:
          return transformAMDModule;
        case ModuleKind.UMD:
          return transformUMDModule;
        default:
          return transformCommonJSModule;
      }
    }

    const { startLexicalEnvironment, endLexicalEnvironment, hoistVariableDeclaration } = context;

    const compilerOptions = context.getCompilerOptions();
    const resolver = context.getEmitResolver();
    const host = context.getEmitHost();
    const languageVersion = getEmitScriptTarget(compilerOptions);
    const moduleKind = getEmitModuleKind(compilerOptions);
    const previousOnSubstituteNode = context.onSubstituteNode;
    const previousOnEmitNode = context.onEmitNode;
    context.onSubstituteNode = onSubstituteNode;
    context.onEmitNode = onEmitNode;
    context.enableSubstitution(Syntax.Identifier); 
    context.enableSubstitution(Syntax.BinaryExpression); 
    context.enableSubstitution(Syntax.PrefixUnaryExpression); 
    context.enableSubstitution(Syntax.PostfixUnaryExpression); 
    context.enableSubstitution(Syntax.ShorthandPropertyAssignment); 
    context.enableEmitNotification(Syntax.SourceFile); 

    const moduleInfoMap: ExternalModuleInfo[] = []; 
    const deferredExports: (Statement[] | undefined)[] = []; 

    let currentSourceFile: SourceFile; 
    let currentModuleInfo: ExternalModuleInfo; 
    let noSubstitution: boolean[]; 
    let needUMDDynamicImportHelper: boolean;

    return chainBundle(transformSourceFile);

    function transformSourceFile(node: SourceFile) {
      if (
        node.isDeclarationFile ||
        !(
          isEffectiveExternalModule(node, compilerOptions) ||
          node.transformFlags & TransformFlags.ContainsDynamicImport ||
          (isJsonSourceFile(node) && hasJsonModuleEmitEnabled(compilerOptions) && (compilerOptions.out || compilerOptions.outFile))
        )
      ) {
        return node;
      }

      currentSourceFile = node;
      currentModuleInfo = collectExternalModuleInfo(node, resolver, compilerOptions);
      moduleInfoMap[getOriginalNodeId(node)] = currentModuleInfo;

      
      const transformModule = getTransformModuleDelegate(moduleKind);
      const updated = transformModule(node);
      currentSourceFile = undefined!;
      currentModuleInfo = undefined!;
      needUMDDynamicImportHelper = false;
      return aggregateTransformFlags(updated);
    }

    function shouldEmitUnderscoreUnderscoreESModule() {
      if (!currentModuleInfo.exportEquals && qp_isExternalModule(currentSourceFile)) {
        return true;
      }
      return false;
    }

    function transformCommonJSModule(node: SourceFile) {
      startLexicalEnvironment();

      const statements: Statement[] = [];
      const ensureUseStrict = getStrictOptionValue(compilerOptions, 'alwaysStrict') || (!compilerOptions.noImplicitUseStrict && qp_isExternalModule(currentSourceFile));
      const statementOffset = addPrologue(statements, node.statements, ensureUseStrict && !isJsonSourceFile(node), sourceElementVisitor);

      if (shouldEmitUnderscoreUnderscoreESModule()) {
        append(statements, createUnderscoreUnderscoreESModule());
      }
      if (length(currentModuleInfo.exportedNames)) {
        append(
          statements,
          createExpressionStatement(
            reduceLeft(
              currentModuleInfo.exportedNames,
              (prev, nextId) => createAssignment(createPropertyAccess(new Identifier('exports'), new Identifier(idText(nextId))), prev),
              qs.VoidExpression.zero() as Expression
            )
          )
        );
      }

      append(statements, visitNode(currentModuleInfo.externalHelpersImportDeclaration, sourceElementVisitor, isStatement));
      addRange(statements, Nodes.visit(node.statements, sourceElementVisitor, isStatement, statementOffset));
      addExportEqualsIfNeeded(statements,  false);
      insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());

      const updated = qp_updateSourceNode(node, setRange(new Nodes(statements), node.statements));
      addEmitHelpers(updated, context.readEmitHelpers());
      return updated;
    }

    function transformAMDModule(node: SourceFile) {
      const define = new Identifier('define');
      const moduleName = tryGetModuleNameFromFile(node, host, compilerOptions);
      const jsonSourceFile = isJsonSourceFile(node) && node;

      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      

      const { aliasedModuleNames, unaliasedModuleNames, importAliasNames } = collectAsynchronousDependencies(node,  true);

      
      
      
      const updated = qp_updateSourceNode(
        node,
        setRange(
          new Nodes([
            createExpressionStatement(
              new qs.CallExpression(define,  undefined, [
                
                ...(moduleName ? [moduleName] : []),

                
                
                
                new ArrayLiteralExpression(jsonSourceFile ? emptyArray : [createLiteral('require'), createLiteral('exports'), ...aliasedModuleNames, ...unaliasedModuleNames]),

                
                
                
                jsonSourceFile
                  ? jsonSourceFile.statements.length
                    ? jsonSourceFile.statements[0].expression
                    : createObjectLiteral()
                  : createFunctionExpression(
                       undefined,
                       undefined,
                       undefined,
                       undefined,
                      [
                        createParameter(undefined,  undefined, 'require'),
                        createParameter(undefined,  undefined, 'exports'),
                        ...importAliasNames,
                      ],
                      undefined,
                      transformAsynchronousModuleBody(node)
                    ),
              ])
            ),
          ]),
           node.statements
        )
      );

      addEmitHelpers(updated, context.readEmitHelpers());
      return updated;
    }

    function transformUMDModule(node: SourceFile) {
      const { aliasedModuleNames, unaliasedModuleNames, importAliasNames } = collectAsynchronousDependencies(node,  false);
      const moduleName = tryGetModuleNameFromFile(node, host, compilerOptions);
      const umdHeader = createFunctionExpression(
         undefined,
         undefined,
         undefined,
         undefined,
        [createParameter(undefined,  undefined, 'factory')],
        undefined,
        setRange(
          new Block(
            [
              createIf(
                createLogicalAnd(createTypeCheck(new Identifier('module'), 'object'), createTypeCheck(createPropertyAccess(new Identifier('module'), 'exports'), 'object')),
                new Block([
                  createVariableStatement( undefined, [
                    createVariableDeclaration('v', undefined, new qs.CallExpression(new Identifier('factory'),  undefined, [new Identifier('require'), new Identifier('exports')])),
                  ]),
                  setEmitFlags(
                    createIf(
                      createStrictInequality(new Identifier('v'), new Identifier('undefined')),
                      createExpressionStatement(createAssignment(createPropertyAccess(new Identifier('module'), 'exports'), new Identifier('v')))
                    ),
                    EmitFlags.SingleLine
                  ),
                ]),
                createIf(
                  createLogicalAnd(createTypeCheck(new Identifier('define'), 'function'), createPropertyAccess(new Identifier('define'), 'amd')),
                  new Block([
                    createExpressionStatement(
                      new qs.CallExpression(new Identifier('define'),  undefined, [
                        
                        ...(moduleName ? [moduleName] : []),
                        new ArrayLiteralExpression([createLiteral('require'), createLiteral('exports'), ...aliasedModuleNames, ...unaliasedModuleNames]),
                        new Identifier('factory'),
                      ])
                    ),
                  ])
                )
              ),
            ],
             true
          ),
           undefined
        )
      );

      
      
      
      
      
      
      
      
      
      
      

      const updated = qp_updateSourceNode(
        node,
        setRange(
          new Nodes([
            createExpressionStatement(
              new qs.CallExpression(umdHeader,  undefined, [
                
                
                
                createFunctionExpression(
                   undefined,
                   undefined,
                   undefined,
                   undefined,
                  [
                    createParameter(undefined,  undefined, 'require'),
                    createParameter(undefined,  undefined, 'exports'),
                    ...importAliasNames,
                  ],
                  undefined,
                  transformAsynchronousModuleBody(node)
                ),
              ])
            ),
          ]),
           node.statements
        )
      );

      addEmitHelpers(updated, context.readEmitHelpers());
      return updated;
    }

    function collectAsynchronousDependencies(node: SourceFile, includeNonAmdDependencies: boolean): AsynchronousDependencies {
      
      const aliasedModuleNames: Expression[] = [];

      
      const unaliasedModuleNames: Expression[] = [];

      
      
      
      const importAliasNames: ParameterDeclaration[] = [];

      
      for (const amdDependency of node.amdDependencies) {
        if (amdDependency.name) {
          aliasedModuleNames.push(createLiteral(amdDependency.path));
          importAliasNames.push(createParameter(undefined,  undefined, amdDependency.name));
        } else {
          unaliasedModuleNames.push(createLiteral(amdDependency.path));
        }
      }

      for (const importNode of currentModuleInfo.externalImports) {
        
        const externalModuleName = getExternalModuleNameLiteral(importNode, currentSourceFile, host, resolver, compilerOptions);

        
        const importAliasName = getLocalNameForExternalImport(importNode, currentSourceFile);
        
        
        
        if (externalModuleName) {
          if (includeNonAmdDependencies && importAliasName) {
            
            
            setEmitFlags(importAliasName, EmitFlags.NoSubstitution);
            aliasedModuleNames.push(externalModuleName);
            importAliasNames.push(createParameter(undefined,  undefined, importAliasName));
          } else {
            unaliasedModuleNames.push(externalModuleName);
          }
        }
      }

      return { aliasedModuleNames, unaliasedModuleNames, importAliasNames };
    }

    function getAMDImportExpressionForImport(node: ImportDeclaration | ExportDeclaration | ImportEqualsDeclaration) {
      if (Node.is.kind(ImportEqualsDeclaration, node) || Node.is.kind(ExportDeclaration, node) || !getExternalModuleNameLiteral(node, currentSourceFile, host, resolver, compilerOptions)) {
        return;
      }
      const name = getLocalNameForExternalImport(node, currentSourceFile)!; 
      const expr = getHelperExpressionForImport(node, name);
      if (expr === name) {
        return;
      }
      return createExpressionStatement(createAssignment(name, expr));
    }

    function transformAsynchronousModuleBody(node: SourceFile) {
      startLexicalEnvironment();

      const statements: Statement[] = [];
      const statementOffset = addPrologue(statements, node.statements,  !compilerOptions.noImplicitUseStrict, sourceElementVisitor);

      if (shouldEmitUnderscoreUnderscoreESModule()) {
        append(statements, createUnderscoreUnderscoreESModule());
      }
      if (length(currentModuleInfo.exportedNames)) {
        append(
          statements,
          createExpressionStatement(
            reduceLeft(
              currentModuleInfo.exportedNames,
              (prev, nextId) => createAssignment(createPropertyAccess(new Identifier('exports'), new Identifier(idText(nextId))), prev),
              qs.VoidExpression.zero() as Expression
            )
          )
        );
      }

      
      append(statements, visitNode(currentModuleInfo.externalHelpersImportDeclaration, sourceElementVisitor, isStatement));
      if (moduleKind === ModuleKind.AMD) {
        addRange(statements, mapDefined(currentModuleInfo.externalImports, getAMDImportExpressionForImport));
      }
      addRange(statements, Nodes.visit(node.statements, sourceElementVisitor, isStatement, statementOffset));

      
      addExportEqualsIfNeeded(statements,  true);

      
      
      insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());

      const body = new Block(statements,  true);
      if (needUMDDynamicImportHelper) {
        addEmitHelper(body, dynamicImportUMDHelper);
      }

      return body;
    }

    function addExportEqualsIfNeeded(statements: Statement[], emitAsReturn: boolean) {
      if (currentModuleInfo.exportEquals) {
        const expressionResult = visitNode(currentModuleInfo.exportEquals.expression, moduleExpressionElementVisitor);
        if (expressionResult) {
          if (emitAsReturn) {
            const statement = createReturn(expressionResult);
            setRange(statement, currentModuleInfo.exportEquals);
            setEmitFlags(statement, EmitFlags.NoTokenSourceMaps | EmitFlags.NoComments);
            statements.push(statement);
          } else {
            const statement = createExpressionStatement(createAssignment(createPropertyAccess(new Identifier('module'), 'exports'), expressionResult));

            setRange(statement, currentModuleInfo.exportEquals);
            setEmitFlags(statement, EmitFlags.NoComments);
            statements.push(statement);
          }
        }
      }
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

        case Syntax.VariableStatement:
          return visitVariableStatement(<VariableStatement>node);

        case Syntax.FunctionDeclaration:
          return visitFunctionDeclaration(<FunctionDeclaration>node);

        case Syntax.ClassDeclaration:
          return visitClassDeclaration(<ClassDeclaration>node);

        case Syntax.MergeDeclarationMarker:
          return visitMergeDeclarationMarker(<MergeDeclarationMarker>node);

        case Syntax.EndOfDeclarationMarker:
          return visitEndOfDeclarationMarker(<EndOfDeclarationMarker>node);

        default:
          return visitEachChild(node, moduleExpressionElementVisitor, context);
      }
    }

    function moduleExpressionElementVisitor(node: Expression): VisitResult<Expression> {
      
      
      if (!(node.transformFlags & TransformFlags.ContainsDynamicImport) && !(node.transformFlags & TransformFlags.ContainsDestructuringAssignment)) {
        return node;
      }

      if (Node.is.importCall(node)) {
        return visitImportCallExpression(node);
      } else if (isDestructuringAssignment(node)) {
        return visitDestructuringAssignment(node);
      } else {
        return visitEachChild(node, moduleExpressionElementVisitor, context);
      }
    }

    function destructuringNeedsFlattening(node: Expression): boolean {
      if (Node.is.kind(ObjectLiteralExpression, node)) {
        for (const elem of node.properties) {
          switch (elem.kind) {
            case Syntax.PropertyAssignment:
              if (destructuringNeedsFlattening(elem.initializer)) {
                return true;
              }
              break;
            case Syntax.ShorthandPropertyAssignment:
              if (destructuringNeedsFlattening(elem.name)) {
                return true;
              }
              break;
            case Syntax.SpreadAssignment:
              if (destructuringNeedsFlattening(elem.expression)) {
                return true;
              }
              break;
            case Syntax.MethodDeclaration:
            case Syntax.GetAccessor:
            case Syntax.SetAccessor:
              return false;
            default:
              Debug.assertNever(elem, 'Unhandled object member kind');
          }
        }
      } else if (isArrayLiteralExpression(node)) {
        for (const elem of node.elements) {
          if (Node.is.kind(SpreadElement, elem)) {
            if (destructuringNeedsFlattening(elem.expression)) {
              return true;
            }
          } else if (destructuringNeedsFlattening(elem)) {
            return true;
          }
        }
      } else if (Node.is.kind(Identifier, node)) {
        return length(getExports(node)) > (isExportName(node) ? 1 : 0);
      }
      return false;
    }

    function visitDestructuringAssignment(node: DestructuringAssignment): Expression {
      if (destructuringNeedsFlattening(node.left)) {
        return flattenDestructuringAssignment(node, moduleExpressionElementVisitor, context, FlattenLevel.All,  false, createAllExportExpressions);
      }
      return visitEachChild(node, moduleExpressionElementVisitor, context);
    }

    function visitImportCallExpression(node: ImportCall): Expression {
      const argument = visitNode(firstOrUndefined(node.arguments), moduleExpressionElementVisitor);
      const containsLexicalThis = !!(node.transformFlags & TransformFlags.ContainsLexicalThis);
      switch (compilerOptions.module) {
        case ModuleKind.AMD:
          return createImportCallExpressionAMD(argument, containsLexicalThis);
        case ModuleKind.UMD:
          return createImportCallExpressionUMD(argument, containsLexicalThis);
        case ModuleKind.CommonJS:
        default:
          return createImportCallExpressionCommonJS(argument, containsLexicalThis);
      }
    }

    function createImportCallExpressionUMD(arg: Expression, containsLexicalThis: boolean): Expression {
      
      
      
      
      
      
      
      
      
      
      
      
      
      needUMDDynamicImportHelper = true;
      if (isSimpleCopiableExpression(arg)) {
        const argClone = Node.is.generatedIdentifier(arg) ? arg : Node.is.kind(StringLiteral, arg) ? createLiteral(arg) : setEmitFlags(setRange(getSynthesizedClone(arg), arg), EmitFlags.NoComments);
        return createConditional(
           new Identifier('__syncRequire'),
           createImportCallExpressionCommonJS(arg, containsLexicalThis),
           createImportCallExpressionAMD(argClone, containsLexicalThis)
        );
      } else {
        const temp = createTempVariable(hoistVariableDeclaration);
        return createComma(
          createAssignment(temp, arg),
          createConditional(
             new Identifier('__syncRequire'),
             createImportCallExpressionCommonJS(temp, containsLexicalThis),
             createImportCallExpressionAMD(temp, containsLexicalThis)
          )
        );
      }
    }

    function createImportCallExpressionAMD(arg: Expression | undefined, containsLexicalThis: boolean): Expression {
      
      
      
      
      
      
      const resolve = createUniqueName('resolve');
      const reject = createUniqueName('reject');
      const parameters = [
        createParameter( resolve),
        createParameter( reject),
      ];
      const body = new Block([
        createExpressionStatement(new qs.CallExpression(new Identifier('require'),  undefined, [new ArrayLiteralExpression([arg || createOmittedExpression()]), resolve, reject])),
      ]);

      let func: FunctionExpression | ArrowFunction;
      if (languageVersion >= ScriptTarget.ES2015) {
        func = new ArrowFunction( undefined, body);
      } else {
        func = createFunctionExpression( undefined, parameters, undefined, body);

        
        
        
        if (containsLexicalThis) {
          setEmitFlags(func, EmitFlags.CapturesThis);
        }
      }

      const promise = createNew(new Identifier('Promise'),  undefined, [func]);
      if (compilerOptions.esModuleInterop) {
        context.requestEmitHelper(importStarHelper);
        return new qs.CallExpression(createPropertyAccess(promise, new Identifier('then')),  undefined, [getUnscopedHelperName('__importStar')]);
      }
      return promise;
    }

    function createImportCallExpressionCommonJS(arg: Expression | undefined, containsLexicalThis: boolean): Expression {
      
      
      
      
      
      const promiseResolveCall = new qs.CallExpression(createPropertyAccess(new Identifier('Promise'), 'resolve'),  []);
      let requireCall = new qs.CallExpression(new Identifier('require'),  undefined, arg ? [arg] : []);
      if (compilerOptions.esModuleInterop) {
        context.requestEmitHelper(importStarHelper);
        requireCall = new qs.CallExpression(getUnscopedHelperName('__importStar'),  undefined, [requireCall]);
      }

      let func: FunctionExpression | ArrowFunction;
      if (languageVersion >= ScriptTarget.ES2015) {
        func = new ArrowFunction( undefined, requireCall);
      } else {
        func = createFunctionExpression(
           undefined,
           undefined,
           undefined,
           undefined,
           [],
          undefined,
          new Block([createReturn(requireCall)])
        );

        
        
        
        if (containsLexicalThis) {
          setEmitFlags(func, EmitFlags.CapturesThis);
        }
      }

      return new qs.CallExpression(createPropertyAccess(promiseResolveCall, 'then'),  undefined, [func]);
    }

    function getHelperExpressionForExport(node: ExportDeclaration, innerExpr: Expression) {
      if (!compilerOptions.esModuleInterop || Node.get.emitFlags(node) & EmitFlags.NeverApplyImportHelper) {
        return innerExpr;
      }
      if (getExportNeedsImportStarHelper(node)) {
        context.requestEmitHelper(importStarHelper);
        return new qs.CallExpression(getUnscopedHelperName('__importStar'),  undefined, [innerExpr]);
      }
      return innerExpr;
    }

    function getHelperExpressionForImport(node: ImportDeclaration, innerExpr: Expression) {
      if (!compilerOptions.esModuleInterop || Node.get.emitFlags(node) & EmitFlags.NeverApplyImportHelper) {
        return innerExpr;
      }
      if (getImportNeedsImportStarHelper(node)) {
        context.requestEmitHelper(importStarHelper);
        return new qs.CallExpression(getUnscopedHelperName('__importStar'),  undefined, [innerExpr]);
      }
      if (getImportNeedsImportDefaultHelper(node)) {
        context.requestEmitHelper(importDefaultHelper);
        return new qs.CallExpression(getUnscopedHelperName('__importDefault'),  undefined, [innerExpr]);
      }
      return innerExpr;
    }

    function visitImportDeclaration(node: ImportDeclaration): VisitResult<Statement> {
      let statements: Statement[] | undefined;
      const namespaceDeclaration = getNamespaceDeclarationNode(node);
      if (moduleKind !== ModuleKind.AMD) {
        if (!node.importClause) {
          
          return setOriginalNode(setRange(createExpressionStatement(createRequireCall(node)), node), node);
        } else {
          const variables: VariableDeclaration[] = [];
          if (namespaceDeclaration && !isDefaultImport(node)) {
            
            variables.push(createVariableDeclaration(getSynthesizedClone(namespaceDeclaration.name), undefined, getHelperExpressionForImport(node, createRequireCall(node))));
          } else {
            
            
            
            
            variables.push(createVariableDeclaration(getGeneratedNameForNode(node), undefined, getHelperExpressionForImport(node, createRequireCall(node))));

            if (namespaceDeclaration && isDefaultImport(node)) {
              variables.push(createVariableDeclaration(getSynthesizedClone(namespaceDeclaration.name), undefined, getGeneratedNameForNode(node)));
            }
          }

          statements = append(
            statements,
            setOriginalNode(
              setRange(
                createVariableStatement( undefined, createVariableDeclarationList(variables, languageVersion >= ScriptTarget.ES2015 ? NodeFlags.Const : NodeFlags.None)),
                 node
              ),
               node
            )
          );
        }
      } else if (namespaceDeclaration && isDefaultImport(node)) {
        
        statements = append(
          statements,
          createVariableStatement(
             undefined,
            createVariableDeclarationList(
              [setOriginalNode(setRange(createVariableDeclaration(getSynthesizedClone(namespaceDeclaration.name), undefined, getGeneratedNameForNode(node)),  node)],
              languageVersion >= ScriptTarget.ES2015 ? NodeFlags.Const : NodeFlags.None
            )
          )
        );
      }

      if (hasAssociatedEndOfDeclarationMarker(node)) {
        
        const id = getOriginalNodeId(node);
        deferredExports[id] = appendExportsOfImportDeclaration(deferredExports[id], node);
      } else {
        statements = appendExportsOfImportDeclaration(statements, node);
      }

      return singleOrMany(statements);
    }

    function createRequireCall(importNode: ImportDeclaration | ImportEqualsDeclaration | ExportDeclaration) {
      const moduleName = getExternalModuleNameLiteral(importNode, currentSourceFile, host, resolver, compilerOptions);
      const args: Expression[] = [];
      if (moduleName) {
        args.push(moduleName);
      }

      return new qs.CallExpression(new Identifier('require'),  undefined, args);
    }

    function visitImportEqualsDeclaration(node: ImportEqualsDeclaration): VisitResult<Statement> {
      assert(Node.is.externalModuleImportEqualsDeclaration(node), 'import= for internal module references should be handled in an earlier transformer.');

      let statements: Statement[] | undefined;
      if (moduleKind !== ModuleKind.AMD) {
        if (hasSyntacticModifier(node, ModifierFlags.Export)) {
          statements = append(statements, setOriginalNode(setRange(createExpressionStatement(createExportExpression(node.name, createRequireCall(node))), node), node));
        } else {
          statements = append(
            statements,
            setOriginalNode(
              setRange(
                createVariableStatement(
                   undefined,
                  createVariableDeclarationList(
                    [createVariableDeclaration(getSynthesizedClone(node.name), undefined, createRequireCall(node))],
                     languageVersion >= ScriptTarget.ES2015 ? NodeFlags.Const : NodeFlags.None
                  )
                ),
                node
              ),
              node
            )
          );
        }
      } else {
        if (hasSyntacticModifier(node, ModifierFlags.Export)) {
          statements = append(statements, setOriginalNode(setRange(createExpressionStatement(createExportExpression(getExportName(node), getLocalName(node))), node), node));
        }
      }

      if (hasAssociatedEndOfDeclarationMarker(node)) {
        
        const id = getOriginalNodeId(node);
        deferredExports[id] = appendExportsOfImportEqualsDeclaration(deferredExports[id], node);
      } else {
        statements = appendExportsOfImportEqualsDeclaration(statements, node);
      }

      return singleOrMany(statements);
    }

    function visitExportDeclaration(node: ExportDeclaration): VisitResult<Statement> {
      if (!node.moduleSpecifier) {
        
        
        return;
      }

      const generatedName = getGeneratedNameForNode(node);

      if (node.exportClause && Node.is.kind(NamedExports, node.exportClause)) {
        const statements: Statement[] = [];
        
        if (moduleKind !== ModuleKind.AMD) {
          statements.push(
            setOriginalNode(
              setRange(
                createVariableStatement( undefined, createVariableDeclarationList([createVariableDeclaration(generatedName, undefined, createRequireCall(node))])),
                 node
              ),
               node
            )
          );
        }
        for (const specifier of node.exportClause.elements) {
          if (languageVersion === ScriptTarget.ES3) {
            statements.push(
              setOriginalNode(
                setRange(
                  createExpressionStatement(
                    createCreateBindingHelper(context, generatedName, createLiteral(specifier.propertyName || specifier.name), specifier.propertyName ? createLiteral(specifier.name) : undefined)
                  ),
                  specifier
                ),
                specifier
              )
            );
          } else {
            const exportedValue = createPropertyAccess(generatedName, specifier.propertyName || specifier.name);
            statements.push(
              setOriginalNode(
                setRange(createExpressionStatement(createExportExpression(getExportName(specifier), exportedValue,  true)), specifier),
                specifier
              )
            );
          }
        }

        return singleOrMany(statements);
      } else if (node.exportClause) {
        const statements: Statement[] = [];
        
        statements.push(
          setOriginalNode(
            setRange(
              createExpressionStatement(
                createExportExpression(
                  getSynthesizedClone(node.exportClause.name),
                  moduleKind !== ModuleKind.AMD ? getHelperExpressionForExport(node, createRequireCall(node)) : new Identifier(idText(node.exportClause.name))
                )
              ),
              node
            ),
            node
          )
        );

        return singleOrMany(statements);
      } else {
        
        return setOriginalNode(setRange(createExpressionStatement(createExportStarHelper(context, moduleKind !== ModuleKind.AMD ? createRequireCall(node) : generatedName)), node), node);
      }
    }

    function visitExportAssignment(node: ExportAssignment): VisitResult<Statement> {
      if (node.isExportEquals) {
        return;
      }

      let statements: Statement[] | undefined;
      const original = node.original;
      if (original && hasAssociatedEndOfDeclarationMarker(original)) {
        
        const id = getOriginalNodeId(node);
        deferredExports[id] = appendExportStatement(
          deferredExports[id],
          new Identifier('default'),
          visitNode(node.expression, moduleExpressionElementVisitor),
           node,
           true
        );
      } else {
        statements = appendExportStatement(statements, new Identifier('default'), visitNode(node.expression, moduleExpressionElementVisitor),  true);
      }

      return singleOrMany(statements);
    }

    function visitFunctionDeclaration(node: FunctionDeclaration): VisitResult<Statement> {
      let statements: Statement[] | undefined;
      if (hasSyntacticModifier(node, ModifierFlags.Export)) {
        statements = append(
          statements,
          setOriginalNode(
            setRange(
              createFunctionDeclaration(
                undefined,
                Nodes.visit(node.modifiers, modifierVisitor, isModifier),
                node.asteriskToken,
                getDeclarationName(node,  true),
                 undefined,
                Nodes.visit(node.parameters, moduleExpressionElementVisitor),
                undefined,
                visitEachChild(node.body, moduleExpressionElementVisitor, context)
              ),
               node
            ),
             node
          )
        );
      } else {
        statements = append(statements, visitEachChild(node, moduleExpressionElementVisitor, context));
      }

      if (hasAssociatedEndOfDeclarationMarker(node)) {
        
        const id = getOriginalNodeId(node);
        deferredExports[id] = appendExportsOfHoistedDeclaration(deferredExports[id], node);
      } else {
        statements = appendExportsOfHoistedDeclaration(statements, node);
      }

      return singleOrMany(statements);
    }

    function visitClassDeclaration(node: ClassDeclaration): VisitResult<Statement> {
      let statements: Statement[] | undefined;
      if (hasSyntacticModifier(node, ModifierFlags.Export)) {
        statements = append(
          statements,
          setOriginalNode(
            setRange(
              createClassDeclaration(
                undefined,
                Nodes.visit(node.modifiers, modifierVisitor, isModifier),
                getDeclarationName(node,  true),
                 undefined,
                Nodes.visit(node.heritageClauses, moduleExpressionElementVisitor),
                Nodes.visit(node.members, moduleExpressionElementVisitor)
              ),
              node
            ),
            node
          )
        );
      } else {
        statements = append(statements, visitEachChild(node, moduleExpressionElementVisitor, context));
      }

      if (hasAssociatedEndOfDeclarationMarker(node)) {
        
        const id = getOriginalNodeId(node);
        deferredExports[id] = appendExportsOfHoistedDeclaration(deferredExports[id], node);
      } else {
        statements = appendExportsOfHoistedDeclaration(statements, node);
      }

      return singleOrMany(statements);
    }

    function visitVariableStatement(node: VariableStatement): VisitResult<Statement> {
      let statements: Statement[] | undefined;
      let variables: VariableDeclaration[] | undefined;
      let expressions: Expression[] | undefined;

      if (hasSyntacticModifier(node, ModifierFlags.Export)) {
        let modifiers: Nodes<Modifier> | undefined;

        
        for (const variable of node.declarationList.declarations) {
          if (Node.is.kind(Identifier, variable.name) && isLocalName(variable.name)) {
            if (!modifiers) {
              modifiers = Nodes.visit(node.modifiers, modifierVisitor, isModifier);
            }

            variables = append(variables, variable);
          } else if (variable.initializer) {
            expressions = append(expressions, transformInitializedVariable(variable));
          }
        }

        if (variables) {
          statements = append(statements, updateVariableStatement(node, modifiers, updateVariableDeclarationList(node.declarationList, variables)));
        }

        if (expressions) {
          statements = append(statements, setOriginalNode(setRange(createExpressionStatement(inlineExpressions(expressions)), node), node));
        }
      } else {
        statements = append(statements, visitEachChild(node, moduleExpressionElementVisitor, context));
      }

      if (hasAssociatedEndOfDeclarationMarker(node)) {
        
        const id = getOriginalNodeId(node);
        deferredExports[id] = appendExportsOfVariableStatement(deferredExports[id], node);
      } else {
        statements = appendExportsOfVariableStatement(statements, node);
      }

      return singleOrMany(statements);
    }

    function createAllExportExpressions(name: Identifier, value: Expression, location?: TextRange) {
      const exportedNames = getExports(name);
      if (exportedNames) {
        
        let expression: Expression = isExportName(name) ? value : createAssignment(name, value);
        for (const exportName of exportedNames) {
          
          setEmitFlags(expression, EmitFlags.NoSubstitution);
          expression = createExportExpression(exportName, expression,  location);
        }

        return expression;
      }
      return createAssignment(name, value);
    }

    function transformInitializedVariable(node: VariableDeclaration): Expression {
      if (Node.is.kind(BindingPattern, node.name)) {
        return flattenDestructuringAssignment(visitNode(node, moduleExpressionElementVisitor),  false, createAllExportExpressions);
      } else {
        return createAssignment(
          setRange(createPropertyAccess(new Identifier('exports'), node.name),  node.name),
          node.initializer ? visitNode(node.initializer, moduleExpressionElementVisitor) : qs.VoidExpression.zero()
        );
      }
    }

    function visitMergeDeclarationMarker(node: MergeDeclarationMarker): VisitResult<Statement> {
      
      
      
      
      
      
      
      if (hasAssociatedEndOfDeclarationMarker(node) && node.original!.kind === Syntax.VariableStatement) {
        const id = getOriginalNodeId(node);
        deferredExports[id] = appendExportsOfVariableStatement(deferredExports[id], <VariableStatement>node.original);
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
      }

      return node;
    }

    function appendExportsOfImportDeclaration(statements: Statement[] | undefined, decl: ImportDeclaration): Statement[] | undefined {
      if (currentModuleInfo.exportEquals) {
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
              statements = appendExportsOfDeclaration(statements, importBinding,  true);
            }

            break;
        }
      }

      return statements;
    }

    function appendExportsOfImportEqualsDeclaration(statements: Statement[] | undefined, decl: ImportEqualsDeclaration): Statement[] | undefined {
      if (currentModuleInfo.exportEquals) {
        return statements;
      }

      return appendExportsOfDeclaration(statements, decl);
    }

    function appendExportsOfVariableStatement(statements: Statement[] | undefined, node: VariableStatement): Statement[] | undefined {
      if (currentModuleInfo.exportEquals) {
        return statements;
      }

      for (const decl of node.declarationList.declarations) {
        statements = appendExportsOfBindingElement(statements, decl);
      }

      return statements;
    }

    function appendExportsOfBindingElement(statements: Statement[] | undefined, decl: VariableDeclaration | BindingElement): Statement[] | undefined {
      if (currentModuleInfo.exportEquals) {
        return statements;
      }

      if (Node.is.kind(BindingPattern, decl.name)) {
        for (const element of decl.name.elements) {
          if (!Node.is.kind(OmittedExpression, element)) {
            statements = appendExportsOfBindingElement(statements, element);
          }
        }
      } else if (!Node.is.generatedIdentifier(decl.name)) {
        statements = appendExportsOfDeclaration(statements, decl);
      }

      return statements;
    }

    function appendExportsOfHoistedDeclaration(statements: Statement[] | undefined, decl: ClassDeclaration | FunctionDeclaration): Statement[] | undefined {
      if (currentModuleInfo.exportEquals) {
        return statements;
      }

      if (hasSyntacticModifier(decl, ModifierFlags.Export)) {
        const exportName = hasSyntacticModifier(decl, ModifierFlags.Default) ? new Identifier('default') : getDeclarationName(decl);
        statements = appendExportStatement(statements, exportName, getLocalName(decl),  decl);
      }

      if (decl.name) {
        statements = appendExportsOfDeclaration(statements, decl);
      }

      return statements;
    }

    function appendExportsOfDeclaration(statements: Statement[] | undefined, decl: Declaration, liveBinding?: boolean): Statement[] | undefined {
      const name = getDeclarationName(decl);
      const exportSpecifiers = currentModuleInfo.exportSpecifiers.get(idText(name));
      if (exportSpecifiers) {
        for (const exportSpecifier of exportSpecifiers) {
          statements = appendExportStatement(statements, exportSpecifier.name, name,  undefined, liveBinding);
        }
      }
      return statements;
    }

    function appendExportStatement(
      statements: Statement[] | undefined,
      exportName: Identifier,
      expression: Expression,
      location?: TextRange,
      allowComments?: boolean,
      liveBinding?: boolean
    ): Statement[] | undefined {
      statements = append(statements, createExportStatement(exportName, expression, location, allowComments, liveBinding));
      return statements;
    }

    function createUnderscoreUnderscoreESModule() {
      let statement: Statement;
      if (languageVersion === ScriptTarget.ES3) {
        statement = createExpressionStatement(createExportExpression(new Identifier('__esModule'), createLiteral( true)));
      } else {
        statement = createExpressionStatement(
          new qs.CallExpression(createPropertyAccess(new Identifier('Object'), 'defineProperty'),  undefined, [
            new Identifier('exports'),
            createLiteral('__esModule'),
            createObjectLiteral([createPropertyAssignment('value', createLiteral( true))]),
          ])
        );
      }
      setEmitFlags(statement, EmitFlags.CustomPrologue);
      return statement;
    }

    function createExportStatement(name: Identifier, value: Expression, location?: TextRange, allowComments?: boolean, liveBinding?: boolean) {
      const statement = setRange(createExpressionStatement(createExportExpression(name, value,  undefined, liveBinding)), location);
      startOnNewLine(statement);
      if (!allowComments) {
        setEmitFlags(statement, EmitFlags.NoComments);
      }

      return statement;
    }

    function createExportExpression(name: Identifier, value: Expression, location?: TextRange, liveBinding?: boolean) {
      return setRange(
        liveBinding && languageVersion !== ScriptTarget.ES3
          ? new qs.CallExpression(createPropertyAccess(new Identifier('Object'), 'defineProperty'),  undefined, [
              new Identifier('exports'),
              createLiteral(name),
              createObjectLiteral([
                createPropertyAssignment('enumerable', createLiteral( true)),
                createPropertyAssignment(
                  'get',
                  createFunctionExpression(
                     undefined,
                     undefined,
                     undefined,
                     undefined,
                     [],
                    undefined,
                    new Block([createReturn(value)])
                  )
                ),
              ]),
            ])
          : createAssignment(createPropertyAccess(new Identifier('exports'), getSynthesizedClone(name)), value),
        location
      );
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
        currentSourceFile = <SourceFile>node;
        currentModuleInfo = moduleInfoMap[getOriginalNodeId(currentSourceFile)];
        noSubstitution = [];

        previousOnEmitNode(hint, node, emitCallback);

        currentSourceFile = undefined!;
        currentModuleInfo = undefined!;
        noSubstitution = undefined!;
      } else {
        previousOnEmitNode(hint, node, emitCallback);
      }
    }

    
    
    

    function onSubstituteNode(hint: EmitHint, node: Node) {
      node = previousOnSubstituteNode(hint, node);
      if (node.id && noSubstitution[node.id]) {
        return node;
      }

      if (hint === EmitHint.Expression) {
        return substituteExpression(<Expression>node);
      } else if (Node.is.kind(ShorthandPropertyAssignment, node)) {
        return substituteShorthandPropertyAssignment(node);
      }

      return node;
    }

    function substituteShorthandPropertyAssignment(node: ShorthandPropertyAssignment): ObjectLiteralElementLike {
      const name = node.name;
      const exportedOrImportedName = substituteExpressionIdentifier(name);
      if (exportedOrImportedName !== name) {
        
        
        if (node.objectAssignmentInitializer) {
          const initializer = createAssignment(exportedOrImportedName, node.objectAssignmentInitializer);
          return setRange(createPropertyAssignment(name, initializer), node);
        }
        return setRange(createPropertyAssignment(name, exportedOrImportedName), node);
      }
      return node;
    }

    function substituteExpression(node: Expression) {
      switch (node.kind) {
        case Syntax.Identifier:
          return substituteExpressionIdentifier(<Identifier>node);
        case Syntax.BinaryExpression:
          return substituteBinaryExpression(<BinaryExpression>node);
        case Syntax.PostfixUnaryExpression:
        case Syntax.PrefixUnaryExpression:
          return substituteUnaryExpression(<PrefixUnaryExpression | PostfixUnaryExpression>node);
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
        const exportContainer = resolver.getReferencedExportContainer(node, isExportName(node));
        if (exportContainer && exportContainer.kind === Syntax.SourceFile) {
          return setRange(createPropertyAccess(new Identifier('exports'), getSynthesizedClone(node)),  node);
        }

        const importDeclaration = resolver.getReferencedImportDeclaration(node);
        if (importDeclaration) {
          if (Node.is.kind(ImportClause, importDeclaration)) {
            return setRange(createPropertyAccess(getGeneratedNameForNode(importDeclaration.parent), new Identifier('default')),  node);
          } else if (Node.is.kind(ImportSpecifier, importDeclaration)) {
            const name = importDeclaration.propertyName || importDeclaration.name;
            return setRange(createPropertyAccess(getGeneratedNameForNode(importDeclaration.parent.parent.parent), getSynthesizedClone(name)),  node);
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
            
            noSubstitution[getNodeId(expression)] = true;
            expression = createExportExpression(exportName, expression,  node);
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
          let expression: Expression =
            node.kind === Syntax.PostfixUnaryExpression
              ? setRange(new BinaryExpression(node.operand, new Token(node.operator === Syntax.Plus2Token ? Syntax.PlusEqualsToken : Syntax.MinusEqualsToken), createLiteral(1)),  node)
              : node;
          for (const exportName of exportedNames) {
            
            noSubstitution[getNodeId(expression)] = true;
            expression = createExportExpression(exportName, expression);
          }

          return expression;
        }
      }

      return node;
    }

    function getExports(name: Identifier): Identifier[] | undefined {
      if (!Node.is.generatedIdentifier(name)) {
        const valueDeclaration = resolver.getReferencedImportDeclaration(name) || resolver.getReferencedValueDeclaration(name);
        if (valueDeclaration) {
          return currentModuleInfo && currentModuleInfo.exportedBindings[getOriginalNodeId(valueDeclaration)];
        }
      }
    }
  }

  export const createBindingHelper: UnscopedEmitHelper = {
    name: 'typescript:commonjscreatebinding',
    importName: '__createBinding',
    scoped: false,
    priority: 1,
    text: `
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));`,
  };

  function createCreateBindingHelper(context: TransformationContext, module: Expression, inputName: Expression, outputName: Expression | undefined) {
    context.requestEmitHelper(createBindingHelper);
    return new qs.CallExpression(getUnscopedHelperName('__createBinding'),  undefined, [new Identifier('exports'), module, inputName, ...(outputName ? [outputName] : [])]);
  }

  export const setModuleDefaultHelper: UnscopedEmitHelper = {
    name: 'typescript:commonjscreatevalue',
    importName: '__setModuleDefault',
    scoped: false,
    priority: 1,
    text: `
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});`,
  };

  
  const exportStarHelper: UnscopedEmitHelper = {
    name: 'typescript:export-star',
    importName: '__exportStar',
    scoped: false,
    dependencies: [createBindingHelper],
    priority: 2,
    text: `
            var __exportStar = (this && this.__exportStar) || function(m, exports) {
                for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
            };`,
  };

  function createExportStarHelper(context: TransformationContext, module: Expression) {
    context.requestEmitHelper(exportStarHelper);
    return new qs.CallExpression(getUnscopedHelperName('__exportStar'),  undefined, [module, new Identifier('exports')]);
  }

  
  const dynamicImportUMDHelper: EmitHelper = {
    name: 'typescript:dynamicimport-sync-require',
    scoped: true,
    text: `
            var __syncRequire = typeof module === "object" && typeof module.exports === "object";`,
  };

  
  export const importStarHelper: UnscopedEmitHelper = {
    name: 'typescript:commonjsimportstar',
    importName: '__importStar',
    scoped: false,
    dependencies: [createBindingHelper, setModuleDefaultHelper],
    priority: 2,
    text: `
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};`,
  };

  
  export const importDefaultHelper: UnscopedEmitHelper = {
    name: 'typescript:commonjsimportdefault',
    importName: '__importDefault',
    scoped: false,
    text: `
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};`,
  };
}
