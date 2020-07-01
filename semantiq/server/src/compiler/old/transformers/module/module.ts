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
    context.enableSubstitution(Syntax.Identifier); // Substitutes expression identifiers with imported/exported symbols.
    context.enableSubstitution(Syntax.BinaryExpression); // Substitutes assignments to exported symbols.
    context.enableSubstitution(Syntax.PrefixUnaryExpression); // Substitutes updates to exported symbols.
    context.enableSubstitution(Syntax.PostfixUnaryExpression); // Substitutes updates to exported symbols.
    context.enableSubstitution(Syntax.ShorthandPropertyAssignment); // Substitutes shorthand property assignments for imported/exported symbols.
    context.enableEmitNotification(Syntax.SourceFile); // Restore state when substituting nodes in a file.

    const moduleInfoMap: ExternalModuleInfo[] = []; // The ExternalModuleInfo for each file.
    const deferredExports: (Statement[] | undefined)[] = []; // Exports to defer until an EndOfDeclarationMarker is found.

    let currentSourceFile: SourceFile; // The current file.
    let currentModuleInfo: ExternalModuleInfo; // The ExternalModuleInfo for the current file.
    let noSubstitution: boolean[]; // Set of nodes for which substitution rules should be ignored.
    let needUMDDynamicImportHelper: boolean;

    return chainBundle(transformSourceFile);

    /**
     * Transforms the module aspects of a SourceFile.
     *
     * @param node The SourceFile node.
     */
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

      // Perform the transformation.
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

    /**
     * Transforms a SourceFile into a CommonJS module.
     *
     * @param node The SourceFile node.
     */
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
              createVoidZero() as Expression
            )
          )
        );
      }

      append(statements, visitNode(currentModuleInfo.externalHelpersImportDeclaration, sourceElementVisitor, isStatement));
      addRange(statements, Nodes.visit(node.statements, sourceElementVisitor, isStatement, statementOffset));
      addExportEqualsIfNeeded(statements, /*emitAsReturn*/ false);
      insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());

      const updated = qp_updateSourceNode(node, setRange(Nodes.create(statements), node.statements));
      addEmitHelpers(updated, context.readEmitHelpers());
      return updated;
    }

    /**
     * Transforms a SourceFile into an AMD module.
     *
     * @param node The SourceFile node.
     */
    function transformAMDModule(node: SourceFile) {
      const define = new Identifier('define');
      const moduleName = tryGetModuleNameFromFile(node, host, compilerOptions);
      const jsonSourceFile = isJsonSourceFile(node) && node;

      // An AMD define function has the following shape:
      //
      //     define(id?, dependencies?, factory);
      //
      // This has the shape of the following:
      //
      //     define(name, ["module1", "module2"], function (module1Alias) { ... }
      //
      // The location of the alias in the parameter list in the factory function needs to
      // match the position of the module name in the dependency list.
      //
      // To ensure this is true in cases of modules with no aliases, e.g.:
      //
      //     import "module"
      //
      // or
      //
      //     /// <amd-dependency path= "a.css" />
      //
      // we need to add modules without alias names to the end of the dependencies list

      const { aliasedModuleNames, unaliasedModuleNames, importAliasNames } = collectAsynchronousDependencies(node, /*includeNonAmdDependencies*/ true);

      // Create an updated SourceFile:
      //
      //     define(moduleName?, ["module1", "module2"], function ...
      const updated = qp_updateSourceNode(
        node,
        setRange(
          Nodes.create([
            createExpressionStatement(
              createCall(define, /*typeArguments*/ undefined, [
                // Add the module name (if provided).
                ...(moduleName ? [moduleName] : []),

                // Add the dependency array argument:
                //
                //     ["require", "exports", module1", "module2", ...]
                new ArrayLiteralExpression(jsonSourceFile ? emptyArray : [createLiteral('require'), createLiteral('exports'), ...aliasedModuleNames, ...unaliasedModuleNames]),

                // Add the module body function argument:
                //
                //     function (require, exports, module1, module2) ...
                jsonSourceFile
                  ? jsonSourceFile.statements.length
                    ? jsonSourceFile.statements[0].expression
                    : createObjectLiteral()
                  : createFunctionExpression(
                      /*modifiers*/ undefined,
                      /*asteriskToken*/ undefined,
                      /*name*/ undefined,
                      /*typeParameters*/ undefined,
                      [
                        createParameter(undefined, /*modifiers*/ undefined, /*dot3Token*/ undefined, 'require'),
                        createParameter(undefined, /*modifiers*/ undefined, /*dot3Token*/ undefined, 'exports'),
                        ...importAliasNames,
                      ],
                      undefined,
                      transformAsynchronousModuleBody(node)
                    ),
              ])
            ),
          ]),
          /*location*/ node.statements
        )
      );

      addEmitHelpers(updated, context.readEmitHelpers());
      return updated;
    }

    /**
     * Transforms a SourceFile into a UMD module.
     *
     * @param node The SourceFile node.
     */
    function transformUMDModule(node: SourceFile) {
      const { aliasedModuleNames, unaliasedModuleNames, importAliasNames } = collectAsynchronousDependencies(node, /*includeNonAmdDependencies*/ false);
      const moduleName = tryGetModuleNameFromFile(node, host, compilerOptions);
      const umdHeader = createFunctionExpression(
        /*modifiers*/ undefined,
        /*asteriskToken*/ undefined,
        /*name*/ undefined,
        /*typeParameters*/ undefined,
        [createParameter(undefined, /*modifiers*/ undefined, /*dot3Token*/ undefined, 'factory')],
        undefined,
        setRange(
          new Block(
            [
              createIf(
                createLogicalAnd(createTypeCheck(new Identifier('module'), 'object'), createTypeCheck(createPropertyAccess(new Identifier('module'), 'exports'), 'object')),
                new Block([
                  createVariableStatement(/*modifiers*/ undefined, [
                    createVariableDeclaration('v', undefined, createCall(new Identifier('factory'), /*typeArguments*/ undefined, [new Identifier('require'), new Identifier('exports')])),
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
                      createCall(new Identifier('define'), /*typeArguments*/ undefined, [
                        // Add the module name (if provided).
                        ...(moduleName ? [moduleName] : []),
                        new ArrayLiteralExpression([createLiteral('require'), createLiteral('exports'), ...aliasedModuleNames, ...unaliasedModuleNames]),
                        new Identifier('factory'),
                      ])
                    ),
                  ])
                )
              ),
            ],
            /*multiLine*/ true
          ),
          /*location*/ undefined
        )
      );

      // Create an updated SourceFile:
      //
      //  (function (factory) {
      //      if (typeof module === "object" && typeof module.exports === "object") {
      //          var v = factory(require, exports);
      //          if (v !== undefined) module.exports = v;
      //      }
      //      else if (typeof define === 'function' && define.amd) {
      //          define(["require", "exports"], factory);
      //      }
      //  })(function ...)

      const updated = qp_updateSourceNode(
        node,
        setRange(
          Nodes.create([
            createExpressionStatement(
              createCall(umdHeader, /*typeArguments*/ undefined, [
                // Add the module body function argument:
                //
                //     function (require, exports) ...
                createFunctionExpression(
                  /*modifiers*/ undefined,
                  /*asteriskToken*/ undefined,
                  /*name*/ undefined,
                  /*typeParameters*/ undefined,
                  [
                    createParameter(undefined, /*modifiers*/ undefined, /*dot3Token*/ undefined, 'require'),
                    createParameter(undefined, /*modifiers*/ undefined, /*dot3Token*/ undefined, 'exports'),
                    ...importAliasNames,
                  ],
                  undefined,
                  transformAsynchronousModuleBody(node)
                ),
              ])
            ),
          ]),
          /*location*/ node.statements
        )
      );

      addEmitHelpers(updated, context.readEmitHelpers());
      return updated;
    }

    /**
     * Collect the additional asynchronous dependencies for the module.
     *
     * @param node The source file.
     * @param includeNonAmdDependencies A value indicating whether to include non-AMD dependencies.
     */
    function collectAsynchronousDependencies(node: SourceFile, includeNonAmdDependencies: boolean): AsynchronousDependencies {
      // names of modules with corresponding parameter in the factory function
      const aliasedModuleNames: Expression[] = [];

      // names of modules with no corresponding parameters in factory function
      const unaliasedModuleNames: Expression[] = [];

      // names of the parameters in the factory function; these
      // parameters need to match the indexes of the corresponding
      // module names in aliasedModuleNames.
      const importAliasNames: ParameterDeclaration[] = [];

      // Fill in amd-dependency tags
      for (const amdDependency of node.amdDependencies) {
        if (amdDependency.name) {
          aliasedModuleNames.push(createLiteral(amdDependency.path));
          importAliasNames.push(createParameter(undefined, /*modifiers*/ undefined, /*dot3Token*/ undefined, amdDependency.name));
        } else {
          unaliasedModuleNames.push(createLiteral(amdDependency.path));
        }
      }

      for (const importNode of currentModuleInfo.externalImports) {
        // Find the name of the external module
        const externalModuleName = getExternalModuleNameLiteral(importNode, currentSourceFile, host, resolver, compilerOptions);

        // Find the name of the module alias, if there is one
        const importAliasName = getLocalNameForExternalImport(importNode, currentSourceFile);
        // It is possible that externalModuleName is undefined if it is not string literal.
        // This can happen in the invalid import syntax.
        // E.g : "import * from alias from 'someLib';"
        if (externalModuleName) {
          if (includeNonAmdDependencies && importAliasName) {
            // Set emitFlags on the name of the classDeclaration
            // This is so that when printer will not substitute the identifier
            setEmitFlags(importAliasName, EmitFlags.NoSubstitution);
            aliasedModuleNames.push(externalModuleName);
            importAliasNames.push(createParameter(undefined, /*modifiers*/ undefined, /*dot3Token*/ undefined, importAliasName));
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
      const name = getLocalNameForExternalImport(node, currentSourceFile)!; // TODO: GH#18217
      const expr = getHelperExpressionForImport(node, name);
      if (expr === name) {
        return;
      }
      return createExpressionStatement(createAssignment(name, expr));
    }

    /**
     * Transforms a SourceFile into an AMD or UMD module body.
     *
     * @param node The SourceFile node.
     */
    function transformAsynchronousModuleBody(node: SourceFile) {
      startLexicalEnvironment();

      const statements: Statement[] = [];
      const statementOffset = addPrologue(statements, node.statements, /*ensureUseStrict*/ !compilerOptions.noImplicitUseStrict, sourceElementVisitor);

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
              createVoidZero() as Expression
            )
          )
        );
      }

      // Visit each statement of the module body.
      append(statements, visitNode(currentModuleInfo.externalHelpersImportDeclaration, sourceElementVisitor, isStatement));
      if (moduleKind === ModuleKind.AMD) {
        addRange(statements, mapDefined(currentModuleInfo.externalImports, getAMDImportExpressionForImport));
      }
      addRange(statements, Nodes.visit(node.statements, sourceElementVisitor, isStatement, statementOffset));

      // Append the 'export =' statement if provided.
      addExportEqualsIfNeeded(statements, /*emitAsReturn*/ true);

      // End the lexical environment for the module body
      // and merge any new lexical declarations.
      insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());

      const body = new Block(statements, /*multiLine*/ true);
      if (needUMDDynamicImportHelper) {
        addEmitHelper(body, dynamicImportUMDHelper);
      }

      return body;
    }

    /**
     * Adds the down-level representation of `export=` to the statement list if one exists
     * in the source file.
     *
     * @param statements The Statement list to modify.
     * @param emitAsReturn A value indicating whether to emit the `export=` statement as a
     * return statement.
     */
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

    //
    // Top-Level Source Element Visitors
    //

    /**
     * Visits a node at the top level of the source file.
     *
     * @param node The node to visit.
     */
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
      // This visitor does not need to descend into the tree if there is no dynamic import or destructuring assignment,
      // as export/import statements are only transformed at the top level of a file.
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
        return flattenDestructuringAssignment(node, moduleExpressionElementVisitor, context, FlattenLevel.All, /*needsValue*/ false, createAllExportExpressions);
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
      // (function (factory) {
      //      ... (regular UMD)
      // }
      // })(function (require, exports, useSyncRequire) {
      //      "use strict";
      //      Object.defineProperty(exports, "__esModule", { value: true });
      //      var __syncRequire = typeof module === "object" && typeof module.exports === "object";
      //      var __resolved = new Promise(function (resolve) { resolve(); });
      //      .....
      //      __syncRequire
      //          ? __resolved.then(function () { return require(x); }) /*CommonJs Require*/
      //          : new Promise(function (_a, _b) { require([x], _a, _b); }); /*Amd Require*/
      // });
      needUMDDynamicImportHelper = true;
      if (isSimpleCopiableExpression(arg)) {
        const argClone = Node.is.generatedIdentifier(arg) ? arg : Node.is.kind(StringLiteral, arg) ? createLiteral(arg) : setEmitFlags(setRange(getSynthesizedClone(arg), arg), EmitFlags.NoComments);
        return createConditional(
          /*condition*/ new Identifier('__syncRequire'),
          /*whenTrue*/ createImportCallExpressionCommonJS(arg, containsLexicalThis),
          /*whenFalse*/ createImportCallExpressionAMD(argClone, containsLexicalThis)
        );
      } else {
        const temp = createTempVariable(hoistVariableDeclaration);
        return createComma(
          createAssignment(temp, arg),
          createConditional(
            /*condition*/ new Identifier('__syncRequire'),
            /*whenTrue*/ createImportCallExpressionCommonJS(temp, containsLexicalThis),
            /*whenFalse*/ createImportCallExpressionAMD(temp, containsLexicalThis)
          )
        );
      }
    }

    function createImportCallExpressionAMD(arg: Expression | undefined, containsLexicalThis: boolean): Expression {
      // improt("./blah")
      // emit as
      // define(["require", "exports", "blah"], function (require, exports) {
      //     ...
      //     new Promise(function (_a, _b) { require([x], _a, _b); }); /*Amd Require*/
      // });
      const resolve = createUniqueName('resolve');
      const reject = createUniqueName('reject');
      const parameters = [
        createParameter(/*decorator*/ undefined, /*modifiers*/ undefined, /*dot3Token*/ undefined, /*name*/ resolve),
        createParameter(/*decorator*/ undefined, /*modifiers*/ undefined, /*dot3Token*/ undefined, /*name*/ reject),
      ];
      const body = new Block([
        createExpressionStatement(createCall(new Identifier('require'), /*typeArguments*/ undefined, [new ArrayLiteralExpression([arg || createOmittedExpression()]), resolve, reject])),
      ]);

      let func: FunctionExpression | ArrowFunction;
      if (languageVersion >= ScriptTarget.ES2015) {
        func = new ArrowFunction(/*modifiers*/ undefined, /*typeParameters*/ undefined, parameters, undefined, /*equalsGreaterThanToken*/ undefined, body);
      } else {
        func = createFunctionExpression(/*modifiers*/ undefined, /*asteriskToken*/ undefined, /*name*/ undefined, /*typeParameters*/ undefined, parameters, undefined, body);

        // if there is a lexical 'this' in the import call arguments, ensure we indicate
        // that this new function expression indicates it captures 'this' so that the
        // es2015 transformer will properly substitute 'this' with '_this'.
        if (containsLexicalThis) {
          setEmitFlags(func, EmitFlags.CapturesThis);
        }
      }

      const promise = createNew(new Identifier('Promise'), /*typeArguments*/ undefined, [func]);
      if (compilerOptions.esModuleInterop) {
        context.requestEmitHelper(importStarHelper);
        return createCall(createPropertyAccess(promise, new Identifier('then')), /*typeArguments*/ undefined, [getUnscopedHelperName('__importStar')]);
      }
      return promise;
    }

    function createImportCallExpressionCommonJS(arg: Expression | undefined, containsLexicalThis: boolean): Expression {
      // import("./blah")
      // emit as
      // Promise.resolve().then(function () { return require(x); }) /*CommonJs Require*/
      // We have to wrap require in then callback so that require is done in asynchronously
      // if we simply do require in resolve callback in Promise constructor. We will execute the loading immediately
      const promiseResolveCall = createCall(createPropertyAccess(new Identifier('Promise'), 'resolve'), /*typeArguments*/ undefined, /*argumentsArray*/ []);
      let requireCall = createCall(new Identifier('require'), /*typeArguments*/ undefined, arg ? [arg] : []);
      if (compilerOptions.esModuleInterop) {
        context.requestEmitHelper(importStarHelper);
        requireCall = createCall(getUnscopedHelperName('__importStar'), /*typeArguments*/ undefined, [requireCall]);
      }

      let func: FunctionExpression | ArrowFunction;
      if (languageVersion >= ScriptTarget.ES2015) {
        func = new ArrowFunction(/*modifiers*/ undefined, /*typeParameters*/ undefined, /*parameters*/ [], undefined, /*equalsGreaterThanToken*/ undefined, requireCall);
      } else {
        func = createFunctionExpression(
          /*modifiers*/ undefined,
          /*asteriskToken*/ undefined,
          /*name*/ undefined,
          /*typeParameters*/ undefined,
          /*parameters*/ [],
          undefined,
          new Block([createReturn(requireCall)])
        );

        // if there is a lexical 'this' in the import call arguments, ensure we indicate
        // that this new function expression indicates it captures 'this' so that the
        // es2015 transformer will properly substitute 'this' with '_this'.
        if (containsLexicalThis) {
          setEmitFlags(func, EmitFlags.CapturesThis);
        }
      }

      return createCall(createPropertyAccess(promiseResolveCall, 'then'), /*typeArguments*/ undefined, [func]);
    }

    function getHelperExpressionForExport(node: ExportDeclaration, innerExpr: Expression) {
      if (!compilerOptions.esModuleInterop || Node.get.emitFlags(node) & EmitFlags.NeverApplyImportHelper) {
        return innerExpr;
      }
      if (getExportNeedsImportStarHelper(node)) {
        context.requestEmitHelper(importStarHelper);
        return createCall(getUnscopedHelperName('__importStar'), /*typeArguments*/ undefined, [innerExpr]);
      }
      return innerExpr;
    }

    function getHelperExpressionForImport(node: ImportDeclaration, innerExpr: Expression) {
      if (!compilerOptions.esModuleInterop || Node.get.emitFlags(node) & EmitFlags.NeverApplyImportHelper) {
        return innerExpr;
      }
      if (getImportNeedsImportStarHelper(node)) {
        context.requestEmitHelper(importStarHelper);
        return createCall(getUnscopedHelperName('__importStar'), /*typeArguments*/ undefined, [innerExpr]);
      }
      if (getImportNeedsImportDefaultHelper(node)) {
        context.requestEmitHelper(importDefaultHelper);
        return createCall(getUnscopedHelperName('__importDefault'), /*typeArguments*/ undefined, [innerExpr]);
      }
      return innerExpr;
    }

    /**
     * Visits an ImportDeclaration node.
     *
     * @param node The node to visit.
     */
    function visitImportDeclaration(node: ImportDeclaration): VisitResult<Statement> {
      let statements: Statement[] | undefined;
      const namespaceDeclaration = getNamespaceDeclarationNode(node);
      if (moduleKind !== ModuleKind.AMD) {
        if (!node.importClause) {
          // import "mod";
          return setOriginalNode(setRange(createExpressionStatement(createRequireCall(node)), node), node);
        } else {
          const variables: VariableDeclaration[] = [];
          if (namespaceDeclaration && !isDefaultImport(node)) {
            // import * as n from "mod";
            variables.push(createVariableDeclaration(getSynthesizedClone(namespaceDeclaration.name), undefined, getHelperExpressionForImport(node, createRequireCall(node))));
          } else {
            // import d from "mod";
            // import { x, y } from "mod";
            // import d, { x, y } from "mod";
            // import d, * as n from "mod";
            variables.push(createVariableDeclaration(getGeneratedNameForNode(node), undefined, getHelperExpressionForImport(node, createRequireCall(node))));

            if (namespaceDeclaration && isDefaultImport(node)) {
              variables.push(createVariableDeclaration(getSynthesizedClone(namespaceDeclaration.name), undefined, getGeneratedNameForNode(node)));
            }
          }

          statements = append(
            statements,
            setOriginalNode(
              setRange(
                createVariableStatement(/*modifiers*/ undefined, createVariableDeclarationList(variables, languageVersion >= ScriptTarget.ES2015 ? NodeFlags.Const : NodeFlags.None)),
                /*location*/ node
              ),
              /*original*/ node
            )
          );
        }
      } else if (namespaceDeclaration && isDefaultImport(node)) {
        // import d, * as n from "mod";
        statements = append(
          statements,
          createVariableStatement(
            /*modifiers*/ undefined,
            createVariableDeclarationList(
              [setOriginalNode(setRange(createVariableDeclaration(getSynthesizedClone(namespaceDeclaration.name), undefined, getGeneratedNameForNode(node)), /*location*/ node), /*original*/ node)],
              languageVersion >= ScriptTarget.ES2015 ? NodeFlags.Const : NodeFlags.None
            )
          )
        );
      }

      if (hasAssociatedEndOfDeclarationMarker(node)) {
        // Defer exports until we encounter an EndOfDeclarationMarker node
        const id = getOriginalNodeId(node);
        deferredExports[id] = appendExportsOfImportDeclaration(deferredExports[id], node);
      } else {
        statements = appendExportsOfImportDeclaration(statements, node);
      }

      return singleOrMany(statements);
    }

    /**
     * Creates a `require()` call to import an external module.
     *
     * @param importNode The declararation to import.
     */
    function createRequireCall(importNode: ImportDeclaration | ImportEqualsDeclaration | ExportDeclaration) {
      const moduleName = getExternalModuleNameLiteral(importNode, currentSourceFile, host, resolver, compilerOptions);
      const args: Expression[] = [];
      if (moduleName) {
        args.push(moduleName);
      }

      return createCall(new Identifier('require'), /*typeArguments*/ undefined, args);
    }

    /**
     * Visits an ImportEqualsDeclaration node.
     *
     * @param node The node to visit.
     */
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
                  /*modifiers*/ undefined,
                  createVariableDeclarationList(
                    [createVariableDeclaration(getSynthesizedClone(node.name), undefined, createRequireCall(node))],
                    /*flags*/ languageVersion >= ScriptTarget.ES2015 ? NodeFlags.Const : NodeFlags.None
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
        // Defer exports until we encounter an EndOfDeclarationMarker node
        const id = getOriginalNodeId(node);
        deferredExports[id] = appendExportsOfImportEqualsDeclaration(deferredExports[id], node);
      } else {
        statements = appendExportsOfImportEqualsDeclaration(statements, node);
      }

      return singleOrMany(statements);
    }

    /**
     * Visits an ExportDeclaration node.
     *
     * @param The node to visit.
     */
    function visitExportDeclaration(node: ExportDeclaration): VisitResult<Statement> {
      if (!node.moduleSpecifier) {
        // Elide export declarations with no module specifier as they are handled
        // elsewhere.
        return;
      }

      const generatedName = getGeneratedNameForNode(node);

      if (node.exportClause && Node.is.kind(NamedExports, node.exportClause)) {
        const statements: Statement[] = [];
        // export { x, y } from "mod";
        if (moduleKind !== ModuleKind.AMD) {
          statements.push(
            setOriginalNode(
              setRange(
                createVariableStatement(/*modifiers*/ undefined, createVariableDeclarationList([createVariableDeclaration(generatedName, undefined, createRequireCall(node))])),
                /*location*/ node
              ),
              /* original */ node
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
                setRange(createExpressionStatement(createExportExpression(getExportName(specifier), exportedValue, /* location */ undefined, /* liveBinding */ true)), specifier),
                specifier
              )
            );
          }
        }

        return singleOrMany(statements);
      } else if (node.exportClause) {
        const statements: Statement[] = [];
        // export * as ns from "mod";
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
        // export * from "mod";
        return setOriginalNode(setRange(createExpressionStatement(createExportStarHelper(context, moduleKind !== ModuleKind.AMD ? createRequireCall(node) : generatedName)), node), node);
      }
    }

    /**
     * Visits an ExportAssignment node.
     *
     * @param node The node to visit.
     */
    function visitExportAssignment(node: ExportAssignment): VisitResult<Statement> {
      if (node.isExportEquals) {
        return;
      }

      let statements: Statement[] | undefined;
      const original = node.original;
      if (original && hasAssociatedEndOfDeclarationMarker(original)) {
        // Defer exports until we encounter an EndOfDeclarationMarker node
        const id = getOriginalNodeId(node);
        deferredExports[id] = appendExportStatement(
          deferredExports[id],
          new Identifier('default'),
          visitNode(node.expression, moduleExpressionElementVisitor),
          /*location*/ node,
          /*allowComments*/ true
        );
      } else {
        statements = appendExportStatement(statements, new Identifier('default'), visitNode(node.expression, moduleExpressionElementVisitor), /*location*/ node, /*allowComments*/ true);
      }

      return singleOrMany(statements);
    }

    /**
     * Visits a FunctionDeclaration node.
     *
     * @param node The node to visit.
     */
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
                getDeclarationName(node, /*allowComments*/ true, /*allowSourceMaps*/ true),
                /*typeParameters*/ undefined,
                Nodes.visit(node.parameters, moduleExpressionElementVisitor),
                undefined,
                visitEachChild(node.body, moduleExpressionElementVisitor, context)
              ),
              /*location*/ node
            ),
            /*original*/ node
          )
        );
      } else {
        statements = append(statements, visitEachChild(node, moduleExpressionElementVisitor, context));
      }

      if (hasAssociatedEndOfDeclarationMarker(node)) {
        // Defer exports until we encounter an EndOfDeclarationMarker node
        const id = getOriginalNodeId(node);
        deferredExports[id] = appendExportsOfHoistedDeclaration(deferredExports[id], node);
      } else {
        statements = appendExportsOfHoistedDeclaration(statements, node);
      }

      return singleOrMany(statements);
    }

    /**
     * Visits a ClassDeclaration node.
     *
     * @param node The node to visit.
     */
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
                getDeclarationName(node, /*allowComments*/ true, /*allowSourceMaps*/ true),
                /*typeParameters*/ undefined,
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
        // Defer exports until we encounter an EndOfDeclarationMarker node
        const id = getOriginalNodeId(node);
        deferredExports[id] = appendExportsOfHoistedDeclaration(deferredExports[id], node);
      } else {
        statements = appendExportsOfHoistedDeclaration(statements, node);
      }

      return singleOrMany(statements);
    }

    /**
     * Visits a VariableStatement node.
     *
     * @param node The node to visit.
     */
    function visitVariableStatement(node: VariableStatement): VisitResult<Statement> {
      let statements: Statement[] | undefined;
      let variables: VariableDeclaration[] | undefined;
      let expressions: Expression[] | undefined;

      if (hasSyntacticModifier(node, ModifierFlags.Export)) {
        let modifiers: Nodes<Modifier> | undefined;

        // If we're exporting these variables, then these just become assignments to 'exports.x'.
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
        // Defer exports until we encounter an EndOfDeclarationMarker node
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
        // For each additional export of the declaration, apply an export assignment.
        let expression: Expression = isExportName(name) ? value : createAssignment(name, value);
        for (const exportName of exportedNames) {
          // Mark the node to prevent triggering substitution.
          setEmitFlags(expression, EmitFlags.NoSubstitution);
          expression = createExportExpression(exportName, expression, /*location*/ location);
        }

        return expression;
      }
      return createAssignment(name, value);
    }

    /**
     * Transforms an exported variable with an initializer into an expression.
     *
     * @param node The node to transform.
     */
    function transformInitializedVariable(node: VariableDeclaration): Expression {
      if (Node.is.kind(BindingPattern, node.name)) {
        return flattenDestructuringAssignment(visitNode(node, moduleExpressionElementVisitor), /*visitor*/ undefined, context, FlattenLevel.All, /*needsValue*/ false, createAllExportExpressions);
      } else {
        return createAssignment(
          setRange(createPropertyAccess(new Identifier('exports'), node.name), /*location*/ node.name),
          node.initializer ? visitNode(node.initializer, moduleExpressionElementVisitor) : createVoidZero()
        );
      }
    }

    /**
     * Visits a MergeDeclarationMarker used as a placeholder for the beginning of a merged
     * and transformed declaration.
     *
     * @param node The node to visit.
     */
    function visitMergeDeclarationMarker(node: MergeDeclarationMarker): VisitResult<Statement> {
      // For an EnumDeclaration or ModuleDeclaration that merges with a preceeding
      // declaration we do not emit a leading variable declaration. To preserve the
      // begin/end semantics of the declararation and to properly handle exports
      // we wrapped the leading variable declaration in a `MergeDeclarationMarker`.
      //
      // To balance the declaration, add the exports of the elided variable
      // statement.
      if (hasAssociatedEndOfDeclarationMarker(node) && node.original!.kind === Syntax.VariableStatement) {
        const id = getOriginalNodeId(node);
        deferredExports[id] = appendExportsOfVariableStatement(deferredExports[id], <VariableStatement>node.original);
      }

      return node;
    }

    /**
     * Determines whether a node has an associated EndOfDeclarationMarker.
     *
     * @param node The node to test.
     */
    function hasAssociatedEndOfDeclarationMarker(node: Node) {
      return (Node.get.emitFlags(node) & EmitFlags.HasEndOfDeclarationMarker) !== 0;
    }

    /**
     * Visits a DeclarationMarker used as a placeholder for the end of a transformed
     * declaration.
     *
     * @param node The node to visit.
     */
    function visitEndOfDeclarationMarker(node: EndOfDeclarationMarker): VisitResult<Statement> {
      // For some transformations we emit an `EndOfDeclarationMarker` to mark the actual
      // end of the transformed declaration. We use this marker to emit any deferred exports
      // of the declaration.
      const id = getOriginalNodeId(node);
      const statements = deferredExports[id];
      if (statements) {
        delete deferredExports[id];
        return append(statements, node);
      }

      return node;
    }

    /**
     * Appends the exports of an ImportDeclaration to a statement list, returning the
     * statement list.
     *
     * @param statements A statement list to which the down-level export statements are to be
     * appended. If `statements` is `undefined`, a new array is allocated if statements are
     * appended.
     * @param decl The declaration whose exports are to be recorded.
     */
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
              statements = appendExportsOfDeclaration(statements, importBinding, /* liveBinding */ true);
            }

            break;
        }
      }

      return statements;
    }

    /**
     * Appends the exports of an ImportEqualsDeclaration to a statement list, returning the
     * statement list.
     *
     * @param statements A statement list to which the down-level export statements are to be
     * appended. If `statements` is `undefined`, a new array is allocated if statements are
     * appended.
     * @param decl The declaration whose exports are to be recorded.
     */
    function appendExportsOfImportEqualsDeclaration(statements: Statement[] | undefined, decl: ImportEqualsDeclaration): Statement[] | undefined {
      if (currentModuleInfo.exportEquals) {
        return statements;
      }

      return appendExportsOfDeclaration(statements, decl);
    }

    /**
     * Appends the exports of a VariableStatement to a statement list, returning the statement
     * list.
     *
     * @param statements A statement list to which the down-level export statements are to be
     * appended. If `statements` is `undefined`, a new array is allocated if statements are
     * appended.
     * @param node The VariableStatement whose exports are to be recorded.
     */
    function appendExportsOfVariableStatement(statements: Statement[] | undefined, node: VariableStatement): Statement[] | undefined {
      if (currentModuleInfo.exportEquals) {
        return statements;
      }

      for (const decl of node.declarationList.declarations) {
        statements = appendExportsOfBindingElement(statements, decl);
      }

      return statements;
    }

    /**
     * Appends the exports of a VariableDeclaration or BindingElement to a statement list,
     * returning the statement list.
     *
     * @param statements A statement list to which the down-level export statements are to be
     * appended. If `statements` is `undefined`, a new array is allocated if statements are
     * appended.
     * @param decl The declaration whose exports are to be recorded.
     */
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

    /**
     * Appends the exports of a ClassDeclaration or FunctionDeclaration to a statement list,
     * returning the statement list.
     *
     * @param statements A statement list to which the down-level export statements are to be
     * appended. If `statements` is `undefined`, a new array is allocated if statements are
     * appended.
     * @param decl The declaration whose exports are to be recorded.
     */
    function appendExportsOfHoistedDeclaration(statements: Statement[] | undefined, decl: ClassDeclaration | FunctionDeclaration): Statement[] | undefined {
      if (currentModuleInfo.exportEquals) {
        return statements;
      }

      if (hasSyntacticModifier(decl, ModifierFlags.Export)) {
        const exportName = hasSyntacticModifier(decl, ModifierFlags.Default) ? new Identifier('default') : getDeclarationName(decl);
        statements = appendExportStatement(statements, exportName, getLocalName(decl), /*location*/ decl);
      }

      if (decl.name) {
        statements = appendExportsOfDeclaration(statements, decl);
      }

      return statements;
    }

    /**
     * Appends the exports of a declaration to a statement list, returning the statement list.
     *
     * @param statements A statement list to which the down-level export statements are to be
     * appended. If `statements` is `undefined`, a new array is allocated if statements are
     * appended.
     * @param decl The declaration to export.
     */
    function appendExportsOfDeclaration(statements: Statement[] | undefined, decl: Declaration, liveBinding?: boolean): Statement[] | undefined {
      const name = getDeclarationName(decl);
      const exportSpecifiers = currentModuleInfo.exportSpecifiers.get(idText(name));
      if (exportSpecifiers) {
        for (const exportSpecifier of exportSpecifiers) {
          statements = appendExportStatement(statements, exportSpecifier.name, name, /*location*/ exportSpecifier.name, /* allowComments */ undefined, liveBinding);
        }
      }
      return statements;
    }

    /**
     * Appends the down-level representation of an export to a statement list, returning the
     * statement list.
     *
     * @param statements A statement list to which the down-level export statements are to be
     * appended. If `statements` is `undefined`, a new array is allocated if statements are
     * appended.
     * @param exportName The name of the export.
     * @param expression The expression to export.
     * @param location The location to use for source maps and comments for the export.
     * @param allowComments Whether to allow comments on the export.
     */
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
        statement = createExpressionStatement(createExportExpression(new Identifier('__esModule'), createLiteral(/*value*/ true)));
      } else {
        statement = createExpressionStatement(
          createCall(createPropertyAccess(new Identifier('Object'), 'defineProperty'), /*typeArguments*/ undefined, [
            new Identifier('exports'),
            createLiteral('__esModule'),
            createObjectLiteral([createPropertyAssignment('value', createLiteral(/*value*/ true))]),
          ])
        );
      }
      setEmitFlags(statement, EmitFlags.CustomPrologue);
      return statement;
    }

    /**
     * Creates a call to the current file's export function to export a value.
     *
     * @param name The bound name of the export.
     * @param value The exported value.
     * @param location The location to use for source maps and comments for the export.
     * @param allowComments An optional value indicating whether to emit comments for the statement.
     */
    function createExportStatement(name: Identifier, value: Expression, location?: TextRange, allowComments?: boolean, liveBinding?: boolean) {
      const statement = setRange(createExpressionStatement(createExportExpression(name, value, /* location */ undefined, liveBinding)), location);
      startOnNewLine(statement);
      if (!allowComments) {
        setEmitFlags(statement, EmitFlags.NoComments);
      }

      return statement;
    }

    /**
     * Creates a call to the current file's export function to export a value.
     *
     * @param name The bound name of the export.
     * @param value The exported value.
     * @param location The location to use for source maps and comments for the export.
     */
    function createExportExpression(name: Identifier, value: Expression, location?: TextRange, liveBinding?: boolean) {
      return setRange(
        liveBinding && languageVersion !== ScriptTarget.ES3
          ? createCall(createPropertyAccess(new Identifier('Object'), 'defineProperty'), /*typeArguments*/ undefined, [
              new Identifier('exports'),
              createLiteral(name),
              createObjectLiteral([
                createPropertyAssignment('enumerable', createLiteral(/*value*/ true)),
                createPropertyAssignment(
                  'get',
                  createFunctionExpression(
                    /*modifiers*/ undefined,
                    /*asteriskToken*/ undefined,
                    /*name*/ undefined,
                    /*typeParameters*/ undefined,
                    /*parameters*/ [],
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

    //
    // Modifier Visitors
    //

    /**
     * Visit nodes to elide module-specific modifiers.
     *
     * @param node The node to visit.
     */
    function modifierVisitor(node: Node): VisitResult<Node> {
      // Elide module-specific modifiers.
      switch (node.kind) {
        case Syntax.ExportKeyword:
        case Syntax.DefaultKeyword:
          return;
      }

      return node;
    }

    //
    // Emit Notification
    //

    /**
     * Hook for node emit notifications.
     *
     * @param hint A hint as to the intended usage of the node.
     * @param node The node to emit.
     * @param emit A callback used to emit the node in the printer.
     */
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

    //
    // Substitutions
    //

    /**
     * Hooks node substitutions.
     *
     * @param hint A hint as to the intended usage of the node.
     * @param node The node to substitute.
     */
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

    /**
     * Substitution for a ShorthandPropertyAssignment whose declaration name is an imported
     * or exported symbol.
     *
     * @param node The node to substitute.
     */
    function substituteShorthandPropertyAssignment(node: ShorthandPropertyAssignment): ObjectLiteralElementLike {
      const name = node.name;
      const exportedOrImportedName = substituteExpressionIdentifier(name);
      if (exportedOrImportedName !== name) {
        // A shorthand property with an assignment initializer is probably part of a
        // destructuring assignment
        if (node.objectAssignmentInitializer) {
          const initializer = createAssignment(exportedOrImportedName, node.objectAssignmentInitializer);
          return setRange(createPropertyAssignment(name, initializer), node);
        }
        return setRange(createPropertyAssignment(name, exportedOrImportedName), node);
      }
      return node;
    }

    /**
     * Substitution for an Expression that may contain an imported or exported symbol.
     *
     * @param node The node to substitute.
     */
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

    /**
     * Substitution for an Identifier expression that may contain an imported or exported
     * symbol.
     *
     * @param node The node to substitute.
     */
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
          return setRange(createPropertyAccess(new Identifier('exports'), getSynthesizedClone(node)), /*location*/ node);
        }

        const importDeclaration = resolver.getReferencedImportDeclaration(node);
        if (importDeclaration) {
          if (Node.is.kind(ImportClause, importDeclaration)) {
            return setRange(createPropertyAccess(getGeneratedNameForNode(importDeclaration.parent), new Identifier('default')), /*location*/ node);
          } else if (Node.is.kind(ImportSpecifier, importDeclaration)) {
            const name = importDeclaration.propertyName || importDeclaration.name;
            return setRange(createPropertyAccess(getGeneratedNameForNode(importDeclaration.parent.parent.parent), getSynthesizedClone(name)), /*location*/ node);
          }
        }
      }
      return node;
    }

    /**
     * Substitution for a BinaryExpression that may contain an imported or exported symbol.
     *
     * @param node The node to substitute.
     */
    function substituteBinaryExpression(node: BinaryExpression): Expression {
      // When we see an assignment expression whose left-hand side is an exported symbol,
      // we should ensure all exports of that symbol are updated with the correct value.
      //
      // - We do not substitute generated identifiers for any reason.
      // - We do not substitute identifiers tagged with the LocalName flag.
      // - We do not substitute identifiers that were originally the name of an enum or
      //   namespace due to how they are transformed in TypeScript.
      // - We only substitute identifiers that are exported at the top level.
      if (
        syntax.is.assignmentOperator(node.operatorToken.kind) &&
        Node.is.kind(Identifier, node.left) &&
        !Node.is.generatedIdentifier(node.left) &&
        !isLocalName(node.left) &&
        !isDeclarationNameOfEnumOrNamespace(node.left)
      ) {
        const exportedNames = getExports(node.left);
        if (exportedNames) {
          // For each additional export of the declaration, apply an export assignment.
          let expression: Expression = node;
          for (const exportName of exportedNames) {
            // Mark the node to prevent triggering this rule again.
            noSubstitution[getNodeId(expression)] = true;
            expression = createExportExpression(exportName, expression, /*location*/ node);
          }

          return expression;
        }
      }

      return node;
    }

    /**
     * Substitution for a UnaryExpression that may contain an imported or exported symbol.
     *
     * @param node The node to substitute.
     */
    function substituteUnaryExpression(node: PrefixUnaryExpression | PostfixUnaryExpression): Expression {
      // When we see a prefix or postfix increment expression whose operand is an exported
      // symbol, we should ensure all exports of that symbol are updated with the correct
      // value.
      //
      // - We do not substitute generated identifiers for any reason.
      // - We do not substitute identifiers tagged with the LocalName flag.
      // - We do not substitute identifiers that were originally the name of an enum or
      //   namespace due to how they are transformed in TypeScript.
      // - We only substitute identifiers that are exported at the top level.
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
              ? setRange(new BinaryExpression(node.operand, new Token(node.operator === Syntax.Plus2Token ? Syntax.PlusEqualsToken : Syntax.MinusEqualsToken), createLiteral(1)), /*location*/ node)
              : node;
          for (const exportName of exportedNames) {
            // Mark the node to prevent triggering this rule again.
            noSubstitution[getNodeId(expression)] = true;
            expression = createExportExpression(exportName, expression);
          }

          return expression;
        }
      }

      return node;
    }

    /**
     * Gets the additional exports of a name.
     *
     * @param name The name.
     */
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
    return createCall(getUnscopedHelperName('__createBinding'), /*typeArguments*/ undefined, [new Identifier('exports'), module, inputName, ...(outputName ? [outputName] : [])]);
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

  // emit output for the __export helper function
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
    return createCall(getUnscopedHelperName('__exportStar'), /*typeArguments*/ undefined, [module, new Identifier('exports')]);
  }

  // emit helper for dynamic import
  const dynamicImportUMDHelper: EmitHelper = {
    name: 'typescript:dynamicimport-sync-require',
    scoped: true,
    text: `
            var __syncRequire = typeof module === "object" && typeof module.exports === "object";`,
  };

  // emit helper for `import * as Name from "foo"`
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

  // emit helper for `import Name from "foo"`
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