import * as qb from '../base';
import * as qc from '../core';
import { Node, Nodes } from '../core';
import * as qs from '../classes';
import * as qt from '../types';
import * as qy from '../syntax';
import { Modifier, Syntax } from '../syntax';
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
    if (!currentModuleInfo.exportEquals && qp_isExternalModule(currentSourceFile)) return true;
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
    addExportEqualsIfNeeded(statements, false);
    insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());
    const updated = qp_updateSourceNode(node, setRange(new Nodes(statements), node.statements));
    addEmitHelpers(updated, context.readEmitHelpers());
    return updated;
  }
  function transformAMDModule(node: SourceFile) {
    const define = new Identifier('define');
    const moduleName = tryGetModuleNameFromFile(node, host, compilerOptions);
    const jsonSourceFile = isJsonSourceFile(node) && node;
    const { aliasedModuleNames, unaliasedModuleNames, importAliasNames } = collectAsynchronousDependencies(node, true);
    const updated = qp_updateSourceNode(
      node,
      setRange(
        new Nodes([
          createExpressionStatement(
            new qs.CallExpression(define, undefined, [
              ...(moduleName ? [moduleName] : []),
              new ArrayLiteralExpression(jsonSourceFile ? emptyArray : [createLiteral('require'), createLiteral('exports'), ...aliasedModuleNames, ...unaliasedModuleNames]),
              jsonSourceFile
                ? jsonSourceFile.statements.length
                  ? jsonSourceFile.statements[0].expression
                  : createObjectLiteral()
                : new qs.FunctionExpression(
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    [createParameter(undefined, undefined, 'require'), createParameter(undefined, undefined, 'exports'), ...importAliasNames],
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
    const { aliasedModuleNames, unaliasedModuleNames, importAliasNames } = collectAsynchronousDependencies(node, false);
    const moduleName = tryGetModuleNameFromFile(node, host, compilerOptions);
    const umdHeader = new qs.FunctionExpression(
      undefined,
      undefined,
      undefined,
      undefined,
      [createParameter(undefined, undefined, 'factory')],
      undefined,
      setRange(
        new Block(
          [
            createIf(
              createLogicalAnd(createTypeCheck(new Identifier('module'), 'object'), createTypeCheck(createPropertyAccess(new Identifier('module'), 'exports'), 'object')),
              new Block([
                createVariableStatement(undefined, [
                  createVariableDeclaration('v', undefined, new qs.CallExpression(new Identifier('factory'), undefined, [new Identifier('require'), new Identifier('exports')])),
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
                    new qs.CallExpression(new Identifier('define'), undefined, [
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
            new qs.CallExpression(umdHeader, undefined, [
              new qs.FunctionExpression(
                undefined,
                undefined,
                undefined,
                undefined,
                [createParameter(undefined, undefined, 'require'), createParameter(undefined, undefined, 'exports'), ...importAliasNames],
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
        importAliasNames.push(createParameter(undefined, undefined, amdDependency.name));
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
          importAliasNames.push(createParameter(undefined, undefined, importAliasName));
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
    const statementOffset = addPrologue(statements, node.statements, !compilerOptions.noImplicitUseStrict, sourceElementVisitor);
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
    addExportEqualsIfNeeded(statements, true);
    insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());
    const body = new Block(statements, true);
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
    if (!(node.transformFlags & TransformFlags.ContainsDynamicImport) && !(node.transformFlags & TransformFlags.ContainsDestructuringAssignment)) return node;
    if (Node.is.importCall(node)) return visitImportCallExpression(node);
    if (isDestructuringAssignment(node)) return visitDestructuringAssignment(node);
    return visitEachChild(node, moduleExpressionElementVisitor, context);
  }
  function destructuringNeedsFlattening(node: Expression): boolean {
    if (Node.is.kind(ObjectLiteralExpression, node)) {
      for (const elem of node.properties) {
        switch (elem.kind) {
          case Syntax.PropertyAssignment:
            if (destructuringNeedsFlattening(elem.initializer)) return true;
            break;
          case Syntax.ShorthandPropertyAssignment:
            if (destructuringNeedsFlattening(elem.name)) return true;
            break;
          case Syntax.SpreadAssignment:
            if (destructuringNeedsFlattening(elem.expression)) return true;
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
          if (destructuringNeedsFlattening(elem.expression)) return true;
        } else if (destructuringNeedsFlattening(elem)) return true;
      }
    } else if (Node.is.kind(Identifier, node)) {
      return length(getExports(node)) > (isExportName(node) ? 1 : 0);
    }
    return false;
  }
  function visitDestructuringAssignment(node: DestructuringAssignment): Expression {
    if (destructuringNeedsFlattening(node.left)) return flattenDestructuringAssignment(node, moduleExpressionElementVisitor, context, FlattenLevel.All, false, createAllExportExpressions);
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
      return new qc.ConditionalExpression(new Identifier('__syncRequire'), createImportCallExpressionCommonJS(arg, containsLexicalThis), createImportCallExpressionAMD(argClone, containsLexicalThis));
    } else {
      const temp = createTempVariable(hoistVariableDeclaration);
      return createComma(
        createAssignment(temp, arg),
        new qc.ConditionalExpression(new Identifier('__syncRequire'), createImportCallExpressionCommonJS(temp, containsLexicalThis), createImportCallExpressionAMD(temp, containsLexicalThis))
      );
    }
  }
  function createImportCallExpressionAMD(arg: Expression | undefined, containsLexicalThis: boolean): Expression {
    const resolve = createUniqueName('resolve');
    const reject = createUniqueName('reject');
    const parameters = [createParameter(resolve), createParameter(reject)];
    const body = new Block([createExpressionStatement(new qs.CallExpression(new Identifier('require'), undefined, [new ArrayLiteralExpression([arg || createOmittedExpression()]), resolve, reject]))]);
    let func: FunctionExpression | ArrowFunction;
    if (languageVersion >= ScriptTarget.ES2015) {
      func = new ArrowFunction(undefined, body);
    } else {
      func = new qs.FunctionExpression(undefined, parameters, undefined, body);
      if (containsLexicalThis) {
        setEmitFlags(func, EmitFlags.CapturesThis);
      }
    }
    const promise = createNew(new Identifier('Promise'), undefined, [func]);
    if (compilerOptions.esModuleInterop) {
      context.requestEmitHelper(importStarHelper);
      return new qs.CallExpression(createPropertyAccess(promise, new Identifier('then')), undefined, [getUnscopedHelperName('__importStar')]);
    }
    return promise;
  }
  function createImportCallExpressionCommonJS(arg: Expression | undefined, containsLexicalThis: boolean): Expression {
    const promiseResolveCall = new qs.CallExpression(createPropertyAccess(new Identifier('Promise'), 'resolve'), []);
    let requireCall = new qs.CallExpression(new Identifier('require'), undefined, arg ? [arg] : []);
    if (compilerOptions.esModuleInterop) {
      context.requestEmitHelper(importStarHelper);
      requireCall = new qs.CallExpression(getUnscopedHelperName('__importStar'), undefined, [requireCall]);
    }
    let func: FunctionExpression | ArrowFunction;
    if (languageVersion >= ScriptTarget.ES2015) {
      func = new ArrowFunction(undefined, requireCall);
    } else {
      func = new qs.FunctionExpression(undefined, undefined, undefined, undefined, [], undefined, new Block([createReturn(requireCall)]));
      if (containsLexicalThis) {
        setEmitFlags(func, EmitFlags.CapturesThis);
      }
    }
    return new qs.CallExpression(createPropertyAccess(promiseResolveCall, 'then'), undefined, [func]);
  }
  function getHelperExpressionForExport(node: ExportDeclaration, innerExpr: Expression) {
    if (!compilerOptions.esModuleInterop || Node.get.emitFlags(node) & EmitFlags.NeverApplyImportHelper) return innerExpr;
    if (getExportNeedsImportStarHelper(node)) {
      context.requestEmitHelper(importStarHelper);
      return new qs.CallExpression(getUnscopedHelperName('__importStar'), undefined, [innerExpr]);
    }
    return innerExpr;
  }
  function getHelperExpressionForImport(node: ImportDeclaration, innerExpr: Expression) {
    if (!compilerOptions.esModuleInterop || Node.get.emitFlags(node) & EmitFlags.NeverApplyImportHelper) return innerExpr;
    if (getImportNeedsImportStarHelper(node)) {
      context.requestEmitHelper(importStarHelper);
      return new qs.CallExpression(getUnscopedHelperName('__importStar'), undefined, [innerExpr]);
    }
    if (getImportNeedsImportDefaultHelper(node)) {
      context.requestEmitHelper(importDefaultHelper);
      return new qs.CallExpression(getUnscopedHelperName('__importDefault'), undefined, [innerExpr]);
    }
    return innerExpr;
  }
  function visitImportDeclaration(node: ImportDeclaration): VisitResult<Statement> {
    let statements: Statement[] | undefined;
    const namespaceDeclaration = getNamespaceDeclarationNode(node);
    if (moduleKind !== ModuleKind.AMD) {
      if (!node.importClause) return setOriginalNode(setRange(createExpressionStatement(createRequireCall(node)), node), node);
      else {
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
          setOriginalNode(setRange(createVariableStatement(undefined, createVariableDeclarationList(variables, languageVersion >= ScriptTarget.ES2015 ? NodeFlags.Const : NodeFlags.None)), node), node)
        );
      }
    } else if (namespaceDeclaration && isDefaultImport(node)) {
      statements = append(
        statements,
        createVariableStatement(
          undefined,
          createVariableDeclarationList(
            [setOriginalNode(setRange(createVariableDeclaration(getSynthesizedClone(namespaceDeclaration.name), undefined, getGeneratedNameForNode(node)), node))],
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
    return new qs.CallExpression(new Identifier('require'), undefined, args);
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
          setOriginalNode(setRange(createVariableStatement(undefined, createVariableDeclarationList([createVariableDeclaration(generatedName, undefined, createRequireCall(node))])), node), node)
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
          statements.push(setOriginalNode(setRange(createExpressionStatement(createExportExpression(getExportName(specifier), exportedValue, true)), specifier), specifier));
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
    }
    return setOriginalNode(setRange(createExpressionStatement(createExportStarHelper(context, moduleKind !== ModuleKind.AMD ? createRequireCall(node) : generatedName)), node), node);
  }
  function visitExportAssignment(node: ExportAssignment): VisitResult<Statement> {
    if (node.isExportEquals) {
      return;
    }
    let statements: Statement[] | undefined;
    const original = node.original;
    if (original && hasAssociatedEndOfDeclarationMarker(original)) {
      const id = getOriginalNodeId(node);
      deferredExports[id] = appendExportStatement(deferredExports[id], new Identifier('default'), visitNode(node.expression, moduleExpressionElementVisitor), node, true);
    } else {
      statements = appendExportStatement(statements, new Identifier('default'), visitNode(node.expression, moduleExpressionElementVisitor), true);
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
              getDeclarationName(node, true),
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
            new qc.ClassDeclaration(
              undefined,
              Nodes.visit(node.modifiers, modifierVisitor, isModifier),
              getDeclarationName(node, true),
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
        statements = append(statements, node.update(modifiers, updateVariableDeclarationList(node.declarationList, variables)));
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
        expression = createExportExpression(exportName, expression, location);
      }
      return expression;
    }
    return createAssignment(name, value);
  }
  function transformInitializedVariable(node: VariableDeclaration): Expression {
    if (Node.is.kind(BindingPattern, node.name)) return flattenDestructuringAssignment(visitNode(node, moduleExpressionElementVisitor), false, createAllExportExpressions);
    else {
      return createAssignment(
        setRange(createPropertyAccess(new Identifier('exports'), node.name), node.name),
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
    if (currentModuleInfo.exportEquals) return statements;
    const importClause = decl.importClause;
    if (!importClause) return statements;
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
            statements = appendExportsOfDeclaration(statements, importBinding, true);
          }
          break;
      }
    }
    return statements;
  }
  function appendExportsOfImportEqualsDeclaration(statements: Statement[] | undefined, decl: ImportEqualsDeclaration): Statement[] | undefined {
    if (currentModuleInfo.exportEquals) return statements;
    return appendExportsOfDeclaration(statements, decl);
  }
  function appendExportsOfVariableStatement(statements: Statement[] | undefined, node: VariableStatement): Statement[] | undefined {
    if (currentModuleInfo.exportEquals) return statements;
    for (const decl of node.declarationList.declarations) {
      statements = appendExportsOfBindingElement(statements, decl);
    }
    return statements;
  }
  function appendExportsOfBindingElement(statements: Statement[] | undefined, decl: VariableDeclaration | BindingElement): Statement[] | undefined {
    if (currentModuleInfo.exportEquals) return statements;
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
    if (currentModuleInfo.exportEquals) return statements;
    if (hasSyntacticModifier(decl, ModifierFlags.Export)) {
      const exportName = hasSyntacticModifier(decl, ModifierFlags.Default) ? new Identifier('default') : getDeclarationName(decl);
      statements = appendExportStatement(statements, exportName, getLocalName(decl), decl);
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
        statements = appendExportStatement(statements, exportSpecifier.name, name, undefined, liveBinding);
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
      statement = createExpressionStatement(createExportExpression(new Identifier('__esModule'), createLiteral(true)));
    } else {
      statement = createExpressionStatement(
        new qs.CallExpression(createPropertyAccess(new Identifier('Object'), 'defineProperty'), undefined, [
          new Identifier('exports'),
          createLiteral('__esModule'),
          createObjectLiteral([createPropertyAssignment('value', createLiteral(true))]),
        ])
      );
    }
    setEmitFlags(statement, EmitFlags.CustomPrologue);
    return statement;
  }
  function createExportStatement(name: Identifier, value: Expression, location?: TextRange, allowComments?: boolean, liveBinding?: boolean) {
    const statement = setRange(createExpressionStatement(createExportExpression(name, value, undefined, liveBinding)), location);
    startOnNewLine(statement);
    if (!allowComments) {
      setEmitFlags(statement, EmitFlags.NoComments);
    }
    return statement;
  }
  function createExportExpression(name: Identifier, value: Expression, location?: TextRange, liveBinding?: boolean) {
    return setRange(
      liveBinding && languageVersion !== ScriptTarget.ES3
        ? new qs.CallExpression(createPropertyAccess(new Identifier('Object'), 'defineProperty'), undefined, [
            new Identifier('exports'),
            createLiteral(name),
            createObjectLiteral([
              createPropertyAssignment('enumerable', createLiteral(true)),
              createPropertyAssignment('get', new qs.FunctionExpression(undefined, undefined, undefined, undefined, [], undefined, new Block([createReturn(value)]))),
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
    if (node.id && noSubstitution[node.id]) return node;
    if (hint === EmitHint.Expression) return substituteExpression(<Expression>node);
    else if (Node.is.kind(ShorthandPropertyAssignment, node)) return substituteShorthandPropertyAssignment(node);
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
      if (externalHelpersModuleName) return createPropertyAccess(externalHelpersModuleName, node);
      return node;
    }
    if (!Node.is.generatedIdentifier(node) && !isLocalName(node)) {
      const exportContainer = resolver.getReferencedExportContainer(node, isExportName(node));
      if (exportContainer && exportContainer.kind === Syntax.SourceFile) return setRange(createPropertyAccess(new Identifier('exports'), getSynthesizedClone(node)), node);
      const importDeclaration = resolver.getReferencedImportDeclaration(node);
      if (importDeclaration) {
        if (Node.is.kind(ImportClause, importDeclaration)) return setRange(createPropertyAccess(getGeneratedNameForNode(importDeclaration.parent), new Identifier('default')), node);
        else if (Node.is.kind(ImportSpecifier, importDeclaration)) {
          const name = importDeclaration.propertyName || importDeclaration.name;
          return setRange(createPropertyAccess(getGeneratedNameForNode(importDeclaration.parent.parent.parent), getSynthesizedClone(name)), node);
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
          expression = createExportExpression(exportName, expression, node);
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
            ? setRange(new BinaryExpression(node.operand, new Token(node.operator === Syntax.Plus2Token ? Syntax.PlusEqualsToken : Syntax.MinusEqualsToken), createLiteral(1)), node)
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
      if (valueDeclaration) return currentModuleInfo && currentModuleInfo.exportedBindings[getOriginalNodeId(valueDeclaration)];
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
  return new qs.CallExpression(getUnscopedHelperName('__createBinding'), undefined, [new Identifier('exports'), module, inputName, ...(outputName ? [outputName] : [])]);
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
  return new qs.CallExpression(getUnscopedHelperName('__exportStar'), undefined, [module, new Identifier('exports')]);
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
export function transformECMAScriptModule(context: TransformationContext) {
  const compilerOptions = context.getCompilerOptions();
  const previousOnEmitNode = context.onEmitNode;
  const previousOnSubstituteNode = context.onSubstituteNode;
  context.onEmitNode = onEmitNode;
  context.onSubstituteNode = onSubstituteNode;
  context.enableEmitNotification(Syntax.SourceFile);
  context.enableSubstitution(Syntax.Identifier);
  let helperNameSubstitutions: Map<Identifier> | undefined;
  return chainBundle(transformSourceFile);
  function transformSourceFile(node: SourceFile) {
    if (node.isDeclarationFile) return node;
    if (qp_isExternalModule(node) || compilerOptions.isolatedModules) {
      const result = updateExternalModule(node);
      if (!qp_isExternalModule(node) || some(result.statements, qp_isExternalModuleIndicator)) return result;
      return qp_updateSourceNode(result, setRange(new Nodes([...result.statements, createEmptyExports()]), result.statements));
    }
    return node;
  }
  function updateExternalModule(node: SourceFile) {
    const externalHelpersImportDeclaration = createExternalHelpersImportDeclarationIfNeeded(node, compilerOptions);
    if (externalHelpersImportDeclaration) {
      const statements: Statement[] = [];
      const statementOffset = addPrologue(statements, node.statements);
      append(statements, externalHelpersImportDeclaration);
      addRange(statements, Nodes.visit(node.statements, visitor, isStatement, statementOffset));
      return qp_updateSourceNode(node, setRange(new Nodes(statements), node.statements));
    }
    return visitEachChild(node, visitor, context);
  }
  function visitor(node: Node): VisitResult<Node> {
    switch (node.kind) {
      case Syntax.ImportEqualsDeclaration:
        return;
      case Syntax.ExportAssignment:
        return visitExportAssignment(<ExportAssignment>node);
      case Syntax.ExportDeclaration:
        const exportDecl = node as ExportDeclaration;
        return visitExportDeclaration(exportDecl);
    }
    return node;
  }
  function visitExportAssignment(node: ExportAssignment): VisitResult<ExportAssignment> {
    return node.isExportEquals ? undefined : node;
  }
  function visitExportDeclaration(node: ExportDeclaration) {
    if (compilerOptions.module !== undefined && compilerOptions.module > ModuleKind.ES2015) return node;
    if (!node.exportClause || !Node.is.kind(NamespaceExport, node.exportClause) || !node.moduleSpecifier) return node;
    const oldIdentifier = node.exportClause.name;
    const synthName = getGeneratedNameForNode(oldIdentifier);
    const importDecl = createImportDeclaration(undefined, undefined, createNamespaceImport(synthName), node.moduleSpecifier);
    setOriginalNode(importDecl, node.exportClause);
    const exportDecl = createExportDeclaration(undefined, undefined, createNamedExports([createExportSpecifier(synthName, oldIdentifier)]));
    setOriginalNode(exportDecl, node);
    return [importDecl, exportDecl];
  }
  function onEmitNode(hint: EmitHint, node: Node, emitCallback: (hint: EmitHint, node: Node) => void): void {
    if (Node.is.kind(SourceFile, node)) {
      if ((qp_isExternalModule(node) || compilerOptions.isolatedModules) && compilerOptions.importHelpers) {
        helperNameSubstitutions = createMap<Identifier>();
      }
      previousOnEmitNode(hint, node, emitCallback);
      helperNameSubstitutions = undefined;
    } else {
      previousOnEmitNode(hint, node, emitCallback);
    }
  }
  function onSubstituteNode(hint: EmitHint, node: Node) {
    node = previousOnSubstituteNode(hint, node);
    if (helperNameSubstitutions && Node.is.kind(Identifier, node) && Node.get.emitFlags(node) & EmitFlags.HelperName) return substituteHelperName(node);
    return node;
  }
  function substituteHelperName(node: Identifier): Expression {
    const name = idText(node);
    let substitution = helperNameSubstitutions!.get(name);
    if (!substitution) {
      helperNameSubstitutions!.set(name, (substitution = createFileLevelUniqueName(name)));
    }
    return substitution;
  }
}
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
    if (node.isDeclarationFile || !(isEffectiveExternalModule(node, compilerOptions) || node.transformFlags & TransformFlags.ContainsDynamicImport)) return node;
    const id = getOriginalNodeId(node);
    currentSourceFile = node;
    enclosingBlockScopedContainer = node;
    moduleInfo = moduleInfoMap[id] = collectExternalModuleInfo(node, resolver, compilerOptions);
    exportFunction = createUniqueName('exports');
    exportFunctionsMap[id] = exportFunction;
    contextObject = contextObjectMap[id] = createUniqueName('context');
    const dependencyGroups = collectDependencyGroups(moduleInfo.externalImports);
    const moduleBodyBlock = createSystemModuleBody(node, dependencyGroups);
    const moduleBodyFunction = new qs.FunctionExpression(undefined, undefined, undefined, undefined, [createParameter(undefined, undefined, contextObject)], undefined, moduleBodyBlock);
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
      createPropertyAssignment('execute', new qs.FunctionExpression(modifiers, undefined, undefined, undefined, [], undefined, new Block(executeStatements, true))),
    ]);
    moduleObject.multiLine = true;
    statements.push(createReturn(moduleObject));
    return new Block(statements, true);
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
        const exportStarFunction = createExportStarFunction(undefined);
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
    statements.push(createVariableStatement(undefined, createVariableDeclarationList([createVariableDeclaration(exportedNamesStorageRef, undefined, createObjectLiteral(exportedNames, true))])));
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
      condition = createLogicalAnd(condition, qs.PrefixUnaryExpression.logicalNot(new qs.CallExpression(createPropertyAccess(localNames, 'hasOwnProperty'), undefined, [n])));
    }
    return createFunctionDeclaration(
      undefined,
      undefined,
      undefined,
      exportStarFunction,
      undefined,
      [createParameter(undefined, undefined, m)],
      undefined,
      new Block(
        [
          createVariableStatement(undefined, createVariableDeclarationList([createVariableDeclaration(exports, undefined, createObjectLiteral([]))])),
          createForIn(
            createVariableDeclarationList([createVariableDeclaration(n, undefined)]),
            m,
            new Block([
              setEmitFlags(createIf(condition, createExpressionStatement(createAssignment(new qs.ElementAccessExpression(exports, n), new qs.ElementAccessExpression(m, n)))), EmitFlags.SingleLine),
            ])
          ),
          createExpressionStatement(new qs.CallExpression(exportFunction, undefined, [exports])),
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
                statements.push(createExpressionStatement(new qs.CallExpression(exportFunction, true)));
              } else {
                statements.push(createExpressionStatement(new qs.CallExpression(exportFunction, undefined, [createLiteral(idText(entry.exportClause.name)), parameterName])));
              }
            } else {
              statements.push(createExpressionStatement(new qs.CallExpression(exportStarFunction, undefined, [parameterName])));
            }
            break;
        }
      }
      setters.push(new qs.FunctionExpression(undefined, undefined, undefined, undefined, [createParameter(undefined, undefined, parameterName)], undefined, new Block(statements, true)));
    }
    return new ArrayLiteralExpression(setters, true);
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
      deferredExports[id] = appendExportStatement(deferredExports[id], new Identifier('default'), expression, true);
    }
    return createExportStatement(new Identifier('default'), expression, true);
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
          getDeclarationName(node, true),
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
              new qc.ClassExpression(
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
    if (!shouldHoistVariableDeclarationList(node.declarationList)) return visitNode(node, destructuringAndImportCallVisitor, isStatement);
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
      statements = appendExportsOfVariableStatement(statements, node, false);
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
      ? flattenDestructuringAssignment(node, destructuringAndImportCallVisitor, context, FlattenLevel.All, false, createAssignment)
      : node.initializer
      ? createAssignment(node.name, visitNode(node.initializer, destructuringAndImportCallVisitor, isExpression))
      : node.name;
  }
  function createExportedVariableAssignment(name: Identifier, value: Expression, location?: TextRange) {
    return createVariableAssignment(name, value, location, true);
  }
  function createNonExportedVariableAssignment(name: Identifier, value: Expression, location?: TextRange) {
    return createVariableAssignment(name, value, location, false);
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
      if (Node.is.moduleOrEnumDeclaration(original)) return append(appendExportsOfDeclaration(statements, original), node);
    }
    return node;
  }
  function appendExportsOfImportDeclaration(statements: Statement[] | undefined, decl: ImportDeclaration) {
    if (moduleInfo.exportEquals) return statements;
    const importClause = decl.importClause;
    if (!importClause) return statements;
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
    if (moduleInfo.exportEquals) return statements;
    return appendExportsOfDeclaration(statements, decl);
  }
  function appendExportsOfVariableStatement(statements: Statement[] | undefined, node: VariableStatement, exportSelf: boolean): Statement[] | undefined {
    if (moduleInfo.exportEquals) return statements;
    for (const decl of node.declarationList.declarations) {
      if (decl.initializer || exportSelf) {
        statements = appendExportsOfBindingElement(statements, decl, exportSelf);
      }
    }
    return statements;
  }
  function appendExportsOfBindingElement(statements: Statement[] | undefined, decl: VariableDeclaration | BindingElement, exportSelf: boolean): Statement[] | undefined {
    if (moduleInfo.exportEquals) return statements;
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
    if (moduleInfo.exportEquals) return statements;
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
    if (moduleInfo.exportEquals) return statements;
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
    return setCommentRange(new qs.CallExpression(exportFunction, undefined, [exportName, value]), value);
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
        expressions = append(expressions, transformInitializedVariable(variable, false));
        if (!variable.initializer) {
          hoistBindingElement(variable);
        }
      }
      return expressions ? inlineExpressions(expressions) : createOmittedExpression();
    }
    return visitEachChild(node, nestedElementVisitor, context);
  }
  function visitDoStatement(node: DoStatement): VisitResult<Statement> {
    return node.update(visitNode(node.statement, nestedElementVisitor, isStatement, liftToBlock), visitNode(node.expression, destructuringAndImportCallVisitor, isExpression));
  }
  function visitWhileStatement(node: WhileStatement): VisitResult<Statement> {
    return node.update(visitNode(node.expression, destructuringAndImportCallVisitor, isExpression), visitNode(node.statement, nestedElementVisitor, isStatement, liftToBlock));
  }
  function visitLabeledStatement(node: LabeledStatement): VisitResult<Statement> {
    return node.update(node.label, visitNode(node.statement, nestedElementVisitor, isStatement, liftToBlock));
  }
  function visitWithStatement(node: WithStatement): VisitResult<Statement> {
    return node.update(visitNode(node.expression, destructuringAndImportCallVisitor, isExpression), visitNode(node.statement, nestedElementVisitor, isStatement, liftToBlock));
  }
  function visitSwitchStatement(node: SwitchStatement): VisitResult<Statement> {
    return node.update(visitNode(node.expression, destructuringAndImportCallVisitor, isExpression), visitNode(node.caseBlock, nestedElementVisitor, isCaseBlock));
  }
  function visitCaseBlock(node: CaseBlock): CaseBlock {
    const savedEnclosingBlockScopedContainer = enclosingBlockScopedContainer;
    enclosingBlockScopedContainer = node;
    node = node.update(Nodes.visit(node.clauses, nestedElementVisitor, isCaseOrDefaultClause));
    enclosingBlockScopedContainer = savedEnclosingBlockScopedContainer;
    return node;
  }
  function visitCaseClause(node: CaseClause): VisitResult<CaseOrDefaultClause> {
    return node.update(visitNode(node.expression, destructuringAndImportCallVisitor, isExpression), Nodes.visit(node.statements, nestedElementVisitor, isStatement));
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
    node = node.update(node.variableDeclaration, visitNode(node.block, nestedElementVisitor, isBlock));
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
    if (isDestructuringAssignment(node)) return visitDestructuringAssignment(node);
    else if (Node.is.importCall(node)) return visitImportCallExpression(node);
    else if (node.transformFlags & TransformFlags.ContainsDestructuringAssignment || node.transformFlags & TransformFlags.ContainsDynamicImport)
      return visitEachChild(node, destructuringAndImportCallVisitor, context);
    return node;
  }
  function visitImportCallExpression(node: ImportCall): Expression {
    return new qs.CallExpression(
      createPropertyAccess(contextObject, new Identifier('import')),
      undefined,
      some(node.arguments) ? [visitNode(node.arguments[0], destructuringAndImportCallVisitor)] : []
    );
  }
  function visitDestructuringAssignment(node: DestructuringAssignment): VisitResult<Expression> {
    if (hasExportedReferenceInDestructuringTarget(node.left)) return flattenDestructuringAssignment(node, destructuringAndImportCallVisitor, context, FlattenLevel.All, true);
    return visitEachChild(node, destructuringAndImportCallVisitor, context);
  }
  function hasExportedReferenceInDestructuringTarget(node: Expression | ObjectLiteralElementLike): boolean {
    if (isAssignmentExpression(node, true)) return hasExportedReferenceInDestructuringTarget(node.left);
    if (Node.is.kind(SpreadElement, node)) return hasExportedReferenceInDestructuringTarget(node.expression);
    if (Node.is.kind(ObjectLiteralExpression, node)) return some(node.properties, hasExportedReferenceInDestructuringTarget);
    if (isArrayLiteralExpression(node)) return some(node.elements, hasExportedReferenceInDestructuringTarget);
    if (Node.is.kind(ShorthandPropertyAssignment, node)) return hasExportedReferenceInDestructuringTarget(node.name);
    if (Node.is.kind(PropertyAssignment, node)) return hasExportedReferenceInDestructuringTarget(node.initializer);
    if (Node.is.kind(Identifier, node)) {
      const container = resolver.getReferencedExportContainer(node);
      return container !== undefined && container.kind === Syntax.SourceFile;
    }
    return false;
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
    if (isSubstitutionPrevented(node)) return node;
    if (hint === EmitHint.Expression) return substituteExpression(<Expression>node);
    else if (hint === EmitHint.Unspecified) return substituteUnspecified(node);
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
        if (Node.is.kind(ImportClause, importDeclaration))
          return setRange(createPropertyAssignment(getSynthesizedClone(name), createPropertyAccess(getGeneratedNameForNode(importDeclaration.parent), new Identifier('default'))), node);
        else if (Node.is.kind(ImportSpecifier, importDeclaration)) {
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
      if (externalHelpersModuleName) return createPropertyAccess(externalHelpersModuleName, node);
      return node;
    }
    if (!Node.is.generatedIdentifier(node) && !isLocalName(node)) {
      const importDeclaration = resolver.getReferencedImportDeclaration(node);
      if (importDeclaration) {
        if (Node.is.kind(ImportClause, importDeclaration)) return setRange(createPropertyAccess(getGeneratedNameForNode(importDeclaration.parent), new Identifier('default')), node);
        else if (Node.is.kind(ImportSpecifier, importDeclaration))
          return setRange(createPropertyAccess(getGeneratedNameForNode(importDeclaration.parent.parent.parent), getSynthesizedClone(importDeclaration.propertyName || importDeclaration.name)), node);
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
    if (Node.is.importMeta(node)) return createPropertyAccess(contextObject, new Identifier('meta'));
    return node;
  }
  function getExports(name: Identifier) {
    let exportedNames: Identifier[] | undefined;
    if (!Node.is.generatedIdentifier(name)) {
      const valueDeclaration = resolver.getReferencedImportDeclaration(name) || resolver.getReferencedValueDeclaration(name);
      if (valueDeclaration) {
        const exportContainer = resolver.getReferencedExportContainer(name, false);
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