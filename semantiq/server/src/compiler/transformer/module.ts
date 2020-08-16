import { Node, Modifier, ModifierFlags } from '../types';
import { qf, Nodes } from '../core';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from '../types';
import * as qu from '../utils';
import * as qy from '../syntax';
export function transformModule(context: qt.TrafoContext) {
  interface AsynchronousDependencies {
    aliasedModuleNames: qt.Expression[];
    unaliasedModuleNames: qt.Expression[];
    importAliasNames: qt.ParamDeclaration[];
  }
  function getTransformModuleDelegate(moduleKind: ModuleKind): (node: qt.SourceFile) => qt.SourceFile {
    switch (moduleKind) {
      case ModuleKind.AMD:
        return transformAMDModule;
      case ModuleKind.UMD:
        return transformUMDModule;
      default:
        return transformCommonJSModule;
    }
  }
  const { startLexicalEnv, endLexicalEnv, hoistVariableDeclaration } = context;
  const compilerOpts = context.getCompilerOpts();
  const resolver = context.getEmitResolver();
  const host = context.getEmitHost();
  const languageVersion = getEmitScriptTarget(compilerOpts);
  const moduleKind = getEmitModuleKind(compilerOpts);
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
  let currentSourceFile: qt.SourceFile;
  let currentModuleInfo: ExternalModuleInfo;
  let noSubstitution: boolean[];
  let needUMDDynamicImportHelper: boolean;
  return chainBundle(transformSourceFile);
  function transformSourceFile(node: qt.SourceFile) {
    if (
      node.isDeclarationFile ||
      !(
        node.isEffectiveExternalModule(compilerOpts) ||
        node.trafoFlags & TrafoFlags.ContainsDynamicImport ||
        (qf.is.jsonSourceFile(node) && hasJsonModuleEmitEnabled(compilerOpts) && (compilerOpts.out || compilerOpts.outFile))
      )
    ) {
      return node;
    }
    currentSourceFile = node;
    currentModuleInfo = collectExternalModuleInfo(node, resolver, compilerOpts);
    moduleInfoMap[getOriginalNodeId(node)] = currentModuleInfo;
    const transformModule = getTransformModuleDelegate(moduleKind);
    const updated = transformModule(node);
    currentSourceFile = undefined!;
    currentModuleInfo = undefined!;
    needUMDDynamicImportHelper = false;
    return qf.calc.aggregate(updated);
  }
  function shouldEmitUnderscoreUnderscoreESModule() {
    if (!currentModuleInfo.exportEquals && qf.is.externalModule(currentSourceFile)) return true;
    return false;
  }
  function transformCommonJSModule(node: qt.SourceFile) {
    startLexicalEnv();
    const statements: qt.Statement[] = [];
    const ensureUseStrict = getStrictOptionValue(compilerOpts, 'alwaysStrict') || (!compilerOpts.noImplicitUseStrict && qf.is.externalModule(currentSourceFile));
    const statementOffset = addPrologue(statements, node.statements, ensureUseStrict && !qf.is.jsonSourceFile(node), sourceElemVisitor);
    if (shouldEmitUnderscoreUnderscoreESModule()) {
      append(statements, createUnderscoreUnderscoreESModule());
    }
    if (length(currentModuleInfo.exportedNames)) {
      append(
        statements,
        new qc.ExpressionStatement(
          reduceLeft(
            currentModuleInfo.exportedNames,
            (prev, nextId) => qf.create.assignment(new qc.PropertyAccessExpression(new qc.Identifier('exports'), new qc.Identifier(idText(nextId))), prev),
            qc.VoidExpression.zero() as qt.Expression
          )
        )
      );
    }
    append(statements, qf.visit.node(currentModuleInfo.externalHelpersImportDeclaration, sourceElemVisitor, qf.is.statement));
    qu.addRange(statements, Nodes.visit(node.statements, sourceElemVisitor, qf.is.statement, statementOffset));
    addExportEqualsIfNeeded(statements, false);
    insertStatementsAfterStandardPrologue(statements, endLexicalEnv());
    const updated = qp_updateSourceNode(node, setRange(new Nodes(statements), node.statements));
    qf.emit.addHelpers(updated, context.readEmitHelpers());
    return updated;
  }
  function transformAMDModule(node: qt.SourceFile) {
    const define = new qc.Identifier('define');
    const moduleName = tryGetModuleNameFromFile(node, host, compilerOpts);
    const jsonSourceFile = qf.is.jsonSourceFile(node) && node;
    const { aliasedModuleNames, unaliasedModuleNames, importAliasNames } = collectAsynchronousDependencies(node, true);
    const updated = qp_updateSourceNode(
      node,
      new Nodes([
        new qc.ExpressionStatement(
          new qc.CallExpression(define, undefined, [
            ...(moduleName ? [moduleName] : []),
            new qc.ArrayLiteralExpression(jsonSourceFile ? emptyArray : [qc.asLiteral('require'), qc.asLiteral('exports'), ...aliasedModuleNames, ...unaliasedModuleNames]),
            jsonSourceFile
              ? jsonSourceFile.statements.length
                ? jsonSourceFile.statements[0].expression
                : new qc.ObjectLiteralExpression()
              : new qc.FunctionExpression(
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                  [new qc.ParamDeclaration(undefined, undefined, 'require'), new qc.ParamDeclaration(undefined, undefined, 'exports'), ...importAliasNames],
                  undefined,
                  transformAsynchronousModuleBody(node)
                ),
          ])
        ),
      ]).setRange(node.statements)
    );
    qf.emit.addHelpers(updated, context.readEmitHelpers());
    return updated;
  }
  function transformUMDModule(node: qt.SourceFile) {
    const { aliasedModuleNames, unaliasedModuleNames, importAliasNames } = collectAsynchronousDependencies(node, false);
    const moduleName = tryGetModuleNameFromFile(node, host, compilerOpts);
    const umdHeader = new qc.FunctionExpression(
      undefined,
      undefined,
      undefined,
      undefined,
      [new qc.ParamDeclaration(undefined, undefined, 'factory')],
      undefined,
      new qc.Block(
        [
          new qc.IfStatement(
            qf.create.logicalAnd(qf.create.typeCheck(new qc.Identifier('module'), 'object'), qf.create.typeCheck(new qc.PropertyAccessExpression(new qc.Identifier('module'), 'exports'), 'object')),
            new qc.Block([
              new qc.VariableStatement(undefined, [
                new qc.VariableDeclaration('v', undefined, new qc.CallExpression(new qc.Identifier('factory'), undefined, [new qc.Identifier('require'), new qc.Identifier('exports')])),
              ]),
              qf.emit.setFlags(
                new qc.IfStatement(
                  qf.create.strictInequality(new qc.Identifier('v'), new qc.Identifier('undefined')),
                  new qc.ExpressionStatement(qf.create.assignment(new qc.PropertyAccessExpression(new qc.Identifier('module'), 'exports'), new qc.Identifier('v')))
                ),
                EmitFlags.SingleLine
              ),
            ]),
            new qc.IfStatement(
              qf.create.logicalAnd(qf.create.typeCheck(new qc.Identifier('define'), 'function'), new qc.PropertyAccessExpression(new qc.Identifier('define'), 'amd')),
              new qc.Block([
                new qc.ExpressionStatement(
                  new qc.CallExpression(new qc.Identifier('define'), undefined, [
                    ...(moduleName ? [moduleName] : []),
                    new qc.ArrayLiteralExpression([qc.asLiteral('require'), qc.asLiteral('exports'), ...aliasedModuleNames, ...unaliasedModuleNames]),
                    new qc.Identifier('factory'),
                  ])
                ),
              ])
            )
          ),
        ],
        true
      ).setRange(undefined)
    );
    const updated = qp_updateSourceNode(
      node,
      new Nodes([
        new qc.ExpressionStatement(
          new qc.CallExpression(umdHeader, undefined, [
            new qc.FunctionExpression(
              undefined,
              undefined,
              undefined,
              undefined,
              [new qc.ParamDeclaration(undefined, undefined, 'require'), new qc.ParamDeclaration(undefined, undefined, 'exports'), ...importAliasNames],
              undefined,
              transformAsynchronousModuleBody(node)
            ),
          ])
        ),
      ]).setRange(node.statements)
    );
    qf.emit.addHelpers(updated, context.readEmitHelpers());
    return updated;
  }
  function collectAsynchronousDependencies(node: qt.SourceFile, includeNonAmdDependencies: boolean): AsynchronousDependencies {
    const aliasedModuleNames: qt.Expression[] = [];
    const unaliasedModuleNames: qt.Expression[] = [];
    const importAliasNames: qt.ParamDeclaration[] = [];
    for (const amdDependency of node.amdDependencies) {
      if (amdDependency.name) {
        aliasedModuleNames.push(qc.asLiteral(amdDependency.path));
        importAliasNames.push(new qc.ParamDeclaration(undefined, undefined, amdDependency.name));
      } else {
        unaliasedModuleNames.push(qc.asLiteral(amdDependency.path));
      }
    }
    for (const importNode of currentModuleInfo.externalImports) {
      const externalModuleName = qf.get.externalModuleNameLiteral(importNode, currentSourceFile, host, resolver, compilerOpts);
      const importAliasName = qf.decl.localNameForExternalImport(importNode, currentSourceFile);
      if (externalModuleName) {
        if (includeNonAmdDependencies && importAliasName) {
          qf.emit.setFlags(importAliasName, EmitFlags.NoSubstitution);
          aliasedModuleNames.push(externalModuleName);
          importAliasNames.push(new qc.ParamDeclaration(undefined, undefined, importAliasName));
        } else {
          unaliasedModuleNames.push(externalModuleName);
        }
      }
    }
    return { aliasedModuleNames, unaliasedModuleNames, importAliasNames };
  }
  function getAMDImportExpressionForImport(node: qt.ImportDeclaration | qt.ExportDeclaration | qt.ImportEqualsDeclaration) {
    if (node.kind === Syntax.ImportEqualsDeclaration || node.kind === Syntax.ExportDeclaration || !qf.get.externalModuleNameLiteral(node, currentSourceFile, host, resolver, compilerOpts)) {
      return;
    }
    const name = qf.decl.localNameForExternalImport(node, currentSourceFile)!;
    const expr = getHelperExpressionForImport(node, name);
    if (expr === name) {
      return;
    }
    return new qc.ExpressionStatement(qf.create.assignment(name, expr));
  }
  function transformAsynchronousModuleBody(node: qt.SourceFile) {
    startLexicalEnv();
    const statements: qt.Statement[] = [];
    const statementOffset = addPrologue(statements, node.statements, !compilerOpts.noImplicitUseStrict, sourceElemVisitor);
    if (shouldEmitUnderscoreUnderscoreESModule()) {
      append(statements, createUnderscoreUnderscoreESModule());
    }
    if (length(currentModuleInfo.exportedNames)) {
      append(
        statements,
        new qc.ExpressionStatement(
          reduceLeft(
            currentModuleInfo.exportedNames,
            (prev, nextId) => qf.create.assignment(new qc.PropertyAccessExpression(new qc.Identifier('exports'), new qc.Identifier(idText(nextId))), prev),
            qc.VoidExpression.zero() as qt.Expression
          )
        )
      );
    }
    append(statements, qf.visit.node(currentModuleInfo.externalHelpersImportDeclaration, sourceElemVisitor, qf.is.statement));
    if (moduleKind === ModuleKind.AMD) {
      qu.addRange(statements, mapDefined(currentModuleInfo.externalImports, getAMDImportExpressionForImport));
    }
    qu.addRange(statements, Nodes.visit(node.statements, sourceElemVisitor, qf.is.statement, statementOffset));
    addExportEqualsIfNeeded(statements, true);
    insertStatementsAfterStandardPrologue(statements, endLexicalEnv());
    const body = new qc.Block(statements, true);
    if (needUMDDynamicImportHelper) {
      qf.emit.addHelper(body, dynamicImportUMDHelper);
    }
    return body;
  }
  function addExportEqualsIfNeeded(statements: qt.Statement[], emitAsReturn: boolean) {
    if (currentModuleInfo.exportEquals) {
      const expressionResult = qf.visit.node(currentModuleInfo.exportEquals.expression, moduleExpressionElemVisitor);
      if (expressionResult) {
        if (emitAsReturn) {
          const statement = new qc.ReturnStatement(expressionResult);
          statement.setRange(currentModuleInfo.exportEquals);
          qf.emit.setFlags(statement, EmitFlags.NoTokenSourceMaps | EmitFlags.NoComments);
          statements.push(statement);
        } else {
          const statement = new qc.ExpressionStatement(qf.create.assignment(new qc.PropertyAccessExpression(new qc.Identifier('module'), 'exports'), expressionResult));
          statement.setRange(currentModuleInfo.exportEquals);
          qf.emit.setFlags(statement, EmitFlags.NoComments);
          statements.push(statement);
        }
      }
    }
  }
  function sourceElemVisitor(node: Node): VisitResult<Node> {
    switch (node.kind) {
      case Syntax.ImportDeclaration:
        return visitImportDeclaration(<qt.ImportDeclaration>node);
      case Syntax.ImportEqualsDeclaration:
        return visitImportEqualsDeclaration(<qt.ImportEqualsDeclaration>node);
      case Syntax.ExportDeclaration:
        return visitExportDeclaration(<qt.ExportDeclaration>node);
      case Syntax.ExportAssignment:
        return visitExportAssignment(<qt.ExportAssignment>node);
      case Syntax.VariableStatement:
        return visitVariableStatement(<qt.VariableStatement>node);
      case Syntax.FunctionDeclaration:
        return visitFunctionDeclaration(<qt.FunctionDeclaration>node);
      case Syntax.ClassDeclaration:
        return visitClassDeclaration(<qt.ClassDeclaration>node);
      case Syntax.MergeDeclarationMarker:
        return visitMergeDeclarationMarker(<qt.MergeDeclarationMarker>node);
      case Syntax.EndOfDeclarationMarker:
        return visitEndOfDeclarationMarker(<qt.EndOfDeclarationMarker>node);
      default:
        return qf.visit.children(node, moduleExpressionElemVisitor, context);
    }
  }
  function moduleExpressionElemVisitor(node: qt.Expression): VisitResult<qt.Expression> {
    if (!(node.trafoFlags & TrafoFlags.ContainsDynamicImport) && !(node.trafoFlags & TrafoFlags.ContainsDestructuringAssignment)) return node;
    if (qf.is.importCall(node)) return visitImportCallExpression(node);
    if (qf.is.destructuringAssignment(node)) return visitDestructuringAssignment(node);
    return qf.visit.children(node, moduleExpressionElemVisitor, context);
  }
  function destructuringNeedsFlattening(node: qt.Expression): boolean {
    if (node.kind === Syntax.ObjectLiteralExpression) {
      for (const elem of node.properties) {
        switch (elem.kind) {
          case Syntax.PropertyAssignment:
            if (destructuringNeedsFlattening(elem.initer)) return true;
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
            qc.assert.never(elem, 'Unhandled object member kind');
        }
      }
    } else if (qf.is.arrayLiteralExpression(node)) {
      for (const elem of node.elems) {
        if (elem.kind === Syntax.SpreadElem) {
          if (destructuringNeedsFlattening(elem.expression)) return true;
        } else if (destructuringNeedsFlattening(elem)) return true;
      }
    } else if (node.kind === Syntax.Identifier) {
      return length(getExports(node)) > (qf.is.exportName(node) ? 1 : 0);
    }
    return false;
  }
  function visitDestructuringAssignment(node: qt.DestructuringAssignment): qt.Expression {
    if (destructuringNeedsFlattening(node.left)) return flattenDestructuringAssignment(node, moduleExpressionElemVisitor, context, FlattenLevel.All, false, createAllExportExpressions);
    return qf.visit.children(node, moduleExpressionElemVisitor, context);
  }
  function visitImportCallExpression(node: qt.ImportCall): qt.Expression {
    const arg = qf.visit.node(firstOrUndefined(node.args), moduleExpressionElemVisitor);
    const containsLexicalThis = !!(node.trafoFlags & TrafoFlags.ContainsLexicalThis);
    switch (compilerOpts.module) {
      case ModuleKind.AMD:
        return createImportCallExpressionAMD(arg, containsLexicalThis);
      case ModuleKind.UMD:
        return createImportCallExpressionUMD(arg, containsLexicalThis);
      case ModuleKind.CommonJS:
      default:
        return createImportCallExpressionCommonJS(arg, containsLexicalThis);
    }
  }
  function createImportCallExpressionUMD(arg: qt.Expression, containsLexicalThis: boolean): qt.Expression {
    needUMDDynamicImportHelper = true;
    if (isSimpleCopiableExpression(arg)) {
      const argClone = qf.is.generatedIdentifier(arg)
        ? arg
        : arg.kind === Syntax.StringLiteral
        ? qc.asLiteral(arg)
        : qf.emit.setFlags(setRange(qf.create.synthesizedClone(arg), arg), EmitFlags.NoComments);
      return new qc.ConditionalExpression(
        new qc.Identifier('__syncRequire'),
        createImportCallExpressionCommonJS(arg, containsLexicalThis),
        createImportCallExpressionAMD(argClone, containsLexicalThis)
      );
    } else {
      const temp = qf.create.tempVariable(hoistVariableDeclaration);
      return qf.create.comma(
        qf.create.assignment(temp, arg),
        new qc.ConditionalExpression(new qc.Identifier('__syncRequire'), createImportCallExpressionCommonJS(temp, containsLexicalThis), createImportCallExpressionAMD(temp, containsLexicalThis))
      );
    }
  }
  function createImportCallExpressionAMD(arg: qt.Expression | undefined, containsLexicalThis: boolean): qt.Expression {
    const resolve = qf.create.uniqueName('resolve');
    const reject = qf.create.uniqueName('reject');
    const params = [new qc.ParamDeclaration(resolve), new qc.ParamDeclaration(reject)];
    const body = new qc.Block([
      new qc.ExpressionStatement(new qc.CallExpression(new qc.Identifier('require'), undefined, [new qc.ArrayLiteralExpression([arg || new qc.OmittedExpression()]), resolve, reject])),
    ]);
    let func: qt.FunctionExpression | qt.ArrowFunction;
    if (languageVersion >= qt.ScriptTarget.ES2015) {
      func = new qc.ArrowFunction(undefined, body);
    } else {
      func = new qc.FunctionExpression(undefined, params, undefined, body);
      if (containsLexicalThis) {
        qf.emit.setFlags(func, EmitFlags.CapturesThis);
      }
    }
    const promise = new qc.NewExpression(new qc.Identifier('Promise'), undefined, [func]);
    if (compilerOpts.esModuleInterop) {
      context.requestEmitHelper(importStarHelper);
      return new qc.CallExpression(new qc.PropertyAccessExpression(promise, new qc.Identifier('then')), undefined, [getUnscopedHelperName('__importStar')]);
    }
    return promise;
  }
  function createImportCallExpressionCommonJS(arg: qt.Expression | undefined, containsLexicalThis: boolean): qt.Expression {
    const promiseResolveCall = new qc.CallExpression(new qc.PropertyAccessExpression(new qc.Identifier('Promise'), 'resolve'), []);
    let requireCall = new qc.CallExpression(new qc.Identifier('require'), undefined, arg ? [arg] : []);
    if (compilerOpts.esModuleInterop) {
      context.requestEmitHelper(importStarHelper);
      requireCall = new qc.CallExpression(getUnscopedHelperName('__importStar'), undefined, [requireCall]);
    }
    let func: qt.FunctionExpression | qt.ArrowFunction;
    if (languageVersion >= qt.ScriptTarget.ES2015) {
      func = new qc.ArrowFunction(undefined, requireCall);
    } else {
      func = new qc.FunctionExpression(undefined, undefined, undefined, undefined, [], undefined, new qc.Block([new qc.ReturnStatement(requireCall)]));
      if (containsLexicalThis) {
        qf.emit.setFlags(func, EmitFlags.CapturesThis);
      }
    }
    return new qc.CallExpression(new qc.PropertyAccessExpression(promiseResolveCall, 'then'), undefined, [func]);
  }
  function getHelperExpressionForExport(node: qt.ExportDeclaration, innerExpr: qt.Expression) {
    if (!compilerOpts.esModuleInterop || qf.get.emitFlags(node) & EmitFlags.NeverApplyImportHelper) return innerExpr;
    if (getExportNeedsImportStarHelper(node)) {
      context.requestEmitHelper(importStarHelper);
      return new qc.CallExpression(getUnscopedHelperName('__importStar'), undefined, [innerExpr]);
    }
    return innerExpr;
  }
  function getHelperExpressionForImport(node: qt.ImportDeclaration, innerExpr: qt.Expression) {
    if (!compilerOpts.esModuleInterop || qf.get.emitFlags(node) & EmitFlags.NeverApplyImportHelper) return innerExpr;
    if (getImportNeedsImportStarHelper(node)) {
      context.requestEmitHelper(importStarHelper);
      return new qc.CallExpression(getUnscopedHelperName('__importStar'), undefined, [innerExpr]);
    }
    if (getImportNeedsImportDefaultHelper(node)) {
      context.requestEmitHelper(importDefaultHelper);
      return new qc.CallExpression(getUnscopedHelperName('__importDefault'), undefined, [innerExpr]);
    }
    return innerExpr;
  }
  function visitImportDeclaration(node: qt.ImportDeclaration): VisitResult<qt.Statement> {
    let statements: qt.Statement[] | undefined;
    const namespaceDeclaration = qf.get.namespaceDeclarationNode(node);
    if (moduleKind !== ModuleKind.AMD) {
      if (!node.importClause) return setRange(new qc.ExpressionStatement(createRequireCall(node)), node).setOriginal(node);
      else {
        const variables: qt.VariableDeclaration[] = [];
        if (namespaceDeclaration && !qf.is.defaultImport(node)) {
          variables.push(new qc.VariableDeclaration(qf.create.synthesizedClone(namespaceDeclaration.name), undefined, getHelperExpressionForImport(node, createRequireCall(node))));
        } else {
          variables.push(new qc.VariableDeclaration(qf.get.generatedNameForNode(node), undefined, getHelperExpressionForImport(node, createRequireCall(node))));
          if (namespaceDeclaration && qf.is.defaultImport(node)) {
            variables.push(new qc.VariableDeclaration(qf.create.synthesizedClone(namespaceDeclaration.name), undefined, qf.get.generatedNameForNode(node)));
          }
        }
        statements = append(
          statements,
          setOriginalNode(
            setRange(new qc.VariableStatement(undefined, new qc.VariableDeclarationList(variables, languageVersion >= qt.ScriptTarget.ES2015 ? NodeFlags.Const : NodeFlags.None)), node),
            node
          )
        );
      }
    } else if (namespaceDeclaration && qf.is.defaultImport(node)) {
      statements = append(
        statements,
        new qc.VariableStatement(
          undefined,
          new qc.VariableDeclarationList(
            [setRange(new qc.VariableDeclaration(qf.create.synthesizedClone(namespaceDeclaration.name), undefined, qf.get.generatedNameForNode(node)).setOriginal(node))],
            languageVersion >= qt.ScriptTarget.ES2015 ? NodeFlags.Const : NodeFlags.None
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
  function createRequireCall(importNode: qt.ImportDeclaration | qt.ImportEqualsDeclaration | qt.ExportDeclaration) {
    const moduleName = qf.get.externalModuleNameLiteral(importNode, currentSourceFile, host, resolver, compilerOpts);
    const args: qt.Expression[] = [];
    if (moduleName) {
      args.push(moduleName);
    }
    return new qc.CallExpression(new qc.Identifier('require'), undefined, args);
  }
  function visitImportEqualsDeclaration(node: qt.ImportEqualsDeclaration): VisitResult<qt.Statement> {
    qf.assert.true(qf.is.externalModuleImportEqualsDeclaration(node), 'import= for internal module references should be handled in an earlier transformer.');
    let statements: qt.Statement[] | undefined;
    if (moduleKind !== ModuleKind.AMD) {
      if (qf.has.syntacticModifier(node, ModifierFlags.Export)) {
        statements = append(statements, setRange(new qc.ExpressionStatement(createExportExpression(node.name, createRequireCall(node))), node).setOriginal(node));
      } else {
        statements = append(
          statements,
          setOriginalNode(
            new qc.VariableStatement(
              undefined,
              new qc.VariableDeclarationList(
                [new qc.VariableDeclaration(qf.create.synthesizedClone(node.name), undefined, createRequireCall(node))],
                languageVersion >= qt.ScriptTarget.ES2015 ? NodeFlags.Const : NodeFlags.None
              )
            ).setRange(node),
            node
          )
        );
      }
    } else {
      if (qf.has.syntacticModifier(node, ModifierFlags.Export)) {
        statements = append(statements, setRange(new qc.ExpressionStatement(createExportExpression(qf.decl.exportName(node), qf.decl.localName(node))), node).setOriginal(node));
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
  function visitExportDeclaration(node: qt.ExportDeclaration): VisitResult<qt.Statement> {
    if (!node.moduleSpecifier) {
      return;
    }
    const generatedName = qf.get.generatedNameForNode(node);
    if (node.exportClause && node.exportClause.kind === Syntax.NamedExports) {
      const statements: qt.Statement[] = [];
      if (moduleKind !== ModuleKind.AMD) {
        statements.push(
          setRange(new qc.VariableStatement(undefined, new qc.VariableDeclarationList([new qc.VariableDeclaration(generatedName, undefined, createRequireCall(node))])), node).setOriginal(node)
        );
      }
      for (const spec of node.exportClause.elems) {
        if (languageVersion === qt.ScriptTarget.ES3) {
          statements.push(
            setOriginalNode(
              new qc.ExpressionStatement(
                createCreateBindingHelper(context, generatedName, qc.asLiteral(spec.propertyName || spec.name), spec.propertyName ? qc.asLiteral(spec.name) : undefined)
              ).setRange(spec),
              spec
            )
          );
        } else {
          const exportedValue = new qc.PropertyAccessExpression(generatedName, spec.propertyName || spec.name);
          statements.push(setRange(new qc.ExpressionStatement(createExportExpression(qf.decl.exportName(spec), exportedValue, true)), spec).setOriginal(spec));
        }
      }
      return singleOrMany(statements);
    } else if (node.exportClause) {
      const statements: qt.Statement[] = [];
      statements.push(
        setOriginalNode(
          new qc.ExpressionStatement(
            createExportExpression(
              qf.create.synthesizedClone(node.exportClause.name),
              moduleKind !== ModuleKind.AMD ? getHelperExpressionForExport(node, createRequireCall(node)) : new qc.Identifier(idText(node.exportClause.name))
            )
          ).setRange(node),
          node
        )
      );
      return singleOrMany(statements);
    }
    return setRange(new qc.ExpressionStatement(createExportStarHelper(context, moduleKind !== ModuleKind.AMD ? createRequireCall(node) : generatedName)), node).setOriginal(node);
  }
  function visitExportAssignment(node: qt.ExportAssignment): VisitResult<qt.Statement> {
    if (node.isExportEquals) {
      return;
    }
    let statements: qt.Statement[] | undefined;
    const original = node.original;
    if (original && hasAssociatedEndOfDeclarationMarker(original)) {
      const id = getOriginalNodeId(node);
      deferredExports[id] = appendExportStatement(deferredExports[id], new qc.Identifier('default'), qf.visit.node(node.expression, moduleExpressionElemVisitor), node, true);
    } else {
      statements = appendExportStatement(statements, new qc.Identifier('default'), qf.visit.node(node.expression, moduleExpressionElemVisitor), true);
    }
    return singleOrMany(statements);
  }
  function visitFunctionDeclaration(node: qt.FunctionDeclaration): VisitResult<qt.Statement> {
    let statements: qt.Statement[] | undefined;
    if (qf.has.syntacticModifier(node, ModifierFlags.Export)) {
      statements = append(
        statements,
        setOriginalNode(
          new qc.FunctionDeclaration(
            undefined,
            Nodes.visit(node.modifiers, modifierVisitor, isModifier),
            node.asteriskToken,
            qf.decl.name(node, true),
            undefined,
            Nodes.visit(node.params, moduleExpressionElemVisitor),
            undefined,
            qf.visit.children(node.body, moduleExpressionElemVisitor, context)
          ).setRange(node),
          node
        )
      );
    } else {
      statements = append(statements, qf.visit.children(node, moduleExpressionElemVisitor, context));
    }
    if (hasAssociatedEndOfDeclarationMarker(node)) {
      const id = getOriginalNodeId(node);
      deferredExports[id] = appendExportsOfHoistedDeclaration(deferredExports[id], node);
    } else {
      statements = appendExportsOfHoistedDeclaration(statements, node);
    }
    return singleOrMany(statements);
  }
  function visitClassDeclaration(node: qt.ClassDeclaration): VisitResult<qt.Statement> {
    let statements: qt.Statement[] | undefined;
    if (qf.has.syntacticModifier(node, ModifierFlags.Export)) {
      statements = append(
        statements,
        setOriginalNode(
          new qc.ClassDeclaration(
            undefined,
            Nodes.visit(node.modifiers, modifierVisitor, isModifier),
            qf.decl.name(node, true),
            undefined,
            Nodes.visit(node.heritageClauses, moduleExpressionElemVisitor),
            Nodes.visit(node.members, moduleExpressionElemVisitor)
          ).setRange(node),
          node
        )
      );
    } else {
      statements = append(statements, qf.visit.children(node, moduleExpressionElemVisitor, context));
    }
    if (hasAssociatedEndOfDeclarationMarker(node)) {
      const id = getOriginalNodeId(node);
      deferredExports[id] = appendExportsOfHoistedDeclaration(deferredExports[id], node);
    } else {
      statements = appendExportsOfHoistedDeclaration(statements, node);
    }
    return singleOrMany(statements);
  }
  function visitVariableStatement(node: qt.VariableStatement): VisitResult<qt.Statement> {
    let statements: qt.Statement[] | undefined;
    let variables: qt.VariableDeclaration[] | undefined;
    let expressions: qt.Expression[] | undefined;
    if (qf.has.syntacticModifier(node, ModifierFlags.Export)) {
      let modifiers: Nodes<Modifier> | undefined;
      for (const variable of node.declarationList.declarations) {
        if (variable.name.kind === Syntax.Identifier && qf.is.localName(variable.name)) {
          if (!modifiers) {
            modifiers = Nodes.visit(node.modifiers, modifierVisitor, isModifier);
          }
          variables = append(variables, variable);
        } else if (variable.initer) {
          expressions = append(expressions, transformInitializedVariable(variable));
        }
      }
      if (variables) {
        statements = append(statements, node.update(modifiers, updateVariableDeclarationList(node.declarationList, variables)));
      }
      if (expressions) {
        statements = append(statements, setRange(new qc.ExpressionStatement(inlineExpressions(expressions)), node).setOriginal(node));
      }
    } else {
      statements = append(statements, qf.visit.children(node, moduleExpressionElemVisitor, context));
    }
    if (hasAssociatedEndOfDeclarationMarker(node)) {
      const id = getOriginalNodeId(node);
      deferredExports[id] = appendExportsOfVariableStatement(deferredExports[id], node);
    } else {
      statements = appendExportsOfVariableStatement(statements, node);
    }
    return singleOrMany(statements);
  }
  function createAllExportExpressions(name: qt.Identifier, value: qt.Expression, location?: TextRange) {
    const exportedNames = getExports(name);
    if (exportedNames) {
      let expression: qt.Expression = qf.is.exportName(name) ? value : qf.create.assignment(name, value);
      for (const exportName of exportedNames) {
        qf.emit.setFlags(expression, EmitFlags.NoSubstitution);
        expression = createExportExpression(exportName, expression, location);
      }
      return expression;
    }
    return qf.create.assignment(name, value);
  }
  function transformInitializedVariable(node: qt.VariableDeclaration): qt.Expression {
    if (node.name.kind === Syntax.BindingPattern) return flattenDestructuringAssignment(qf.visit.node(node, moduleExpressionElemVisitor), false, createAllExportExpressions);
    else {
      return qf.create.assignment(
        setRange(new qc.PropertyAccessExpression(new qc.Identifier('exports'), node.name), node.name),
        node.initer ? qf.visit.node(node.initer, moduleExpressionElemVisitor) : qc.VoidExpression.zero()
      );
    }
  }
  function visitMergeDeclarationMarker(node: qt.MergeDeclarationMarker): VisitResult<qt.Statement> {
    if (hasAssociatedEndOfDeclarationMarker(node) && node.original!.kind === Syntax.VariableStatement) {
      const id = getOriginalNodeId(node);
      deferredExports[id] = appendExportsOfVariableStatement(deferredExports[id], <qt.VariableStatement>node.original);
    }
    return node;
  }
  function hasAssociatedEndOfDeclarationMarker(node: Node) {
    return (qf.get.emitFlags(node) & EmitFlags.HasEndOfDeclarationMarker) !== 0;
  }
  function visitEndOfDeclarationMarker(node: qt.EndOfDeclarationMarker): VisitResult<qt.Statement> {
    const id = getOriginalNodeId(node);
    const statements = deferredExports[id];
    if (statements) {
      delete deferredExports[id];
      return append(statements, node);
    }
    return node;
  }
  function appendExportsOfImportDeclaration(statements: qt.Statement[] | undefined, decl: qt.ImportDeclaration): qt.Statement[] | undefined {
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
          for (const importBinding of namedBindings.elems) {
            statements = appendExportsOfDeclaration(statements, importBinding, true);
          }
          break;
      }
    }
    return statements;
  }
  function appendExportsOfImportEqualsDeclaration(statements: qt.Statement[] | undefined, decl: qt.ImportEqualsDeclaration): qt.Statement[] | undefined {
    if (currentModuleInfo.exportEquals) return statements;
    return appendExportsOfDeclaration(statements, decl);
  }
  function appendExportsOfVariableStatement(statements: qt.Statement[] | undefined, node: qt.VariableStatement): qt.Statement[] | undefined {
    if (currentModuleInfo.exportEquals) return statements;
    for (const decl of node.declarationList.declarations) {
      statements = appendExportsOfBindingElem(statements, decl);
    }
    return statements;
  }
  function appendExportsOfBindingElem(statements: qt.Statement[] | undefined, decl: qt.VariableDeclaration | qt.BindingElem): qt.Statement[] | undefined {
    if (currentModuleInfo.exportEquals) return statements;
    if (decl.name.kind === Syntax.BindingPattern) {
      for (const elem of decl.name.elems) {
        if (!elem.kind === Syntax.OmittedExpression) {
          statements = appendExportsOfBindingElem(statements, elem);
        }
      }
    } else if (!qf.is.generatedIdentifier(decl.name)) {
      statements = appendExportsOfDeclaration(statements, decl);
    }
    return statements;
  }
  function appendExportsOfHoistedDeclaration(statements: qt.Statement[] | undefined, decl: qt.ClassDeclaration | qt.FunctionDeclaration): qt.Statement[] | undefined {
    if (currentModuleInfo.exportEquals) return statements;
    if (qf.has.syntacticModifier(decl, ModifierFlags.Export)) {
      const exportName = qf.has.syntacticModifier(decl, ModifierFlags.Default) ? new qc.Identifier('default') : qf.decl.name(decl);
      statements = appendExportStatement(statements, exportName, qf.decl.localName(decl), decl);
    }
    if (decl.name) {
      statements = appendExportsOfDeclaration(statements, decl);
    }
    return statements;
  }
  function appendExportsOfDeclaration(statements: qt.Statement[] | undefined, decl: qt.Declaration, liveBinding?: boolean): qt.Statement[] | undefined {
    const name = qf.decl.name(decl);
    const exportSpecifiers = currentModuleInfo.exportSpecifiers.get(idText(name));
    if (exportSpecifiers) {
      for (const exportSpecifier of exportSpecifiers) {
        statements = appendExportStatement(statements, exportSpecifier.name, name, undefined, liveBinding);
      }
    }
    return statements;
  }
  function appendExportStatement(
    statements: qt.Statement[] | undefined,
    exportName: qt.Identifier,
    expression: qt.Expression,
    location?: TextRange,
    allowComments?: boolean,
    liveBinding?: boolean
  ): qt.Statement[] | undefined {
    statements = append(statements, createExportStatement(exportName, expression, location, allowComments, liveBinding));
    return statements;
  }
  function createUnderscoreUnderscoreESModule() {
    let statement: qt.Statement;
    if (languageVersion === qt.ScriptTarget.ES3) {
      statement = new qc.ExpressionStatement(createExportExpression(new qc.Identifier('__esModule'), qc.asLiteral(true)));
    } else {
      statement = new qc.ExpressionStatement(
        new qc.CallExpression(new qc.PropertyAccessExpression(new qc.Identifier('Object'), 'defineProperty'), undefined, [
          new qc.Identifier('exports'),
          qc.asLiteral('__esModule'),
          new qc.ObjectLiteralExpression([new qc.PropertyAssignment('value', qc.asLiteral(true))]),
        ])
      );
    }
    qf.emit.setFlags(statement, EmitFlags.CustomPrologue);
    return statement;
  }
  function createExportStatement(name: qt.Identifier, value: qt.Expression, location?: TextRange, allowComments?: boolean, liveBinding?: boolean) {
    const statement = setRange(new qc.ExpressionStatement(createExportExpression(name, value, undefined, liveBinding)), location);
    qf.emit.setStartsOnNewLine(statement);
    if (!allowComments) {
      qf.emit.setFlags(statement, EmitFlags.NoComments);
    }
    return statement;
  }
  function createExportExpression(name: qt.Identifier, value: qt.Expression, location?: TextRange, liveBinding?: boolean) {
    return setRange(
      liveBinding && languageVersion !== qt.ScriptTarget.ES3
        ? new qc.CallExpression(new qc.PropertyAccessExpression(new qc.Identifier('Object'), 'defineProperty'), undefined, [
            new qc.Identifier('exports'),
            qc.asLiteral(name),
            new qc.ObjectLiteralExpression([
              new qc.PropertyAssignment('enumerable', qc.asLiteral(true)),
              new qc.PropertyAssignment('get', new qc.FunctionExpression(undefined, undefined, undefined, undefined, [], undefined, new qc.Block([new qc.ReturnStatement(value)]))),
            ]),
          ])
        : qf.create.assignment(new qc.PropertyAccessExpression(new qc.Identifier('exports'), qf.create.synthesizedClone(name)), value),
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
  function onEmitNode(hint: qt.EmitHint, node: Node, emitCallback: (hint: qt.EmitHint, node: Node) => void): void {
    if (node.kind === Syntax.SourceFile) {
      currentSourceFile = <qt.SourceFile>node;
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
  function onSubstituteNode(hint: qt.EmitHint, node: Node) {
    node = previousOnSubstituteNode(hint, node);
    if (node.id && noSubstitution[node.id]) return node;
    if (hint === qt.EmitHint.Expression) return substituteExpression(<qt.Expression>node);
    else if (node.kind === Syntax.ShorthandPropertyAssignment) return substituteShorthandPropertyAssignment(node);
    return node;
  }
  function substituteShorthandPropertyAssignment(node: qt.ShorthandPropertyAssignment): qt.ObjectLiteralElemLike {
    const name = node.name;
    const exportedOrImportedName = substituteExpressionIdentifier(name);
    if (exportedOrImportedName !== name) {
      if (node.objectAssignmentIniter) {
        const initer = qf.create.assignment(exportedOrImportedName, node.objectAssignmentIniter);
        return setRange(new qc.PropertyAssignment(name, initer), node);
      }
      return setRange(new qc.PropertyAssignment(name, exportedOrImportedName), node);
    }
    return node;
  }
  function substituteExpression(node: qt.Expression) {
    switch (node.kind) {
      case Syntax.Identifier:
        return substituteExpressionIdentifier(<qt.Identifier>node);
      case Syntax.BinaryExpression:
        return substituteBinaryExpression(<qt.BinaryExpression>node);
      case Syntax.PostfixUnaryExpression:
      case Syntax.PrefixUnaryExpression:
        return substituteUnaryExpression(<qt.PrefixUnaryExpression | qt.PostfixUnaryExpression>node);
    }
    return node;
  }
  function substituteExpressionIdentifier(node: qt.Identifier): qt.Expression {
    if (qf.get.emitFlags(node) & EmitFlags.HelperName) {
      const externalHelpersModuleName = qf.emit.externalHelpersModuleName(currentSourceFile);
      if (externalHelpersModuleName) return new qc.PropertyAccessExpression(externalHelpersModuleName, node);
      return node;
    }
    if (!qf.is.generatedIdentifier(node) && !qf.is.localName(node)) {
      const exportContainer = resolver.getReferencedExportContainer(node, qf.is.exportName(node));
      if (exportContainer && exportContainer.kind === Syntax.SourceFile) return setRange(new qc.PropertyAccessExpression(new qc.Identifier('exports'), qf.create.synthesizedClone(node)), node);
      const importDeclaration = resolver.getReferencedImportDeclaration(node);
      if (importDeclaration) {
        if (importDeclaration.kind === Syntax.ImportClause) return setRange(new qc.PropertyAccessExpression(qf.get.generatedNameForNode(importDeclaration.parent), new qc.Identifier('default')), node);
        else if (importDeclaration.kind === Syntax.ImportSpecifier) {
          const name = importDeclaration.propertyName || importDeclaration.name;
          return setRange(new qc.PropertyAccessExpression(qf.get.generatedNameForNode(importDeclaration.parent.parent.parent), qf.create.synthesizedClone(name)), node);
        }
      }
    }
    return node;
  }
  function substituteBinaryExpression(node: qt.BinaryExpression): qt.Expression {
    if (
      syntax.is.assignmentOperator(node.operatorToken.kind) &&
      node.left.kind === Syntax.Identifier &&
      !qf.is.generatedIdentifier(node.left) &&
      !qf.is.localName(node.left) &&
      !qf.is.declarationNameOfEnumOrNamespace(node.left)
    ) {
      const exportedNames = getExports(node.left);
      if (exportedNames) {
        let expression: qt.Expression = node;
        for (const exportName of exportedNames) {
          noSubstitution[qf.get.nodeId(expression)] = true;
          expression = createExportExpression(exportName, expression, node);
        }
        return expression;
      }
    }
    return node;
  }
  function substituteUnaryExpression(node: qt.PrefixUnaryExpression | qt.PostfixUnaryExpression): qt.Expression {
    if (
      (node.operator === Syntax.Plus2Token || node.operator === Syntax.Minus2Token) &&
      node.operand.kind === Syntax.Identifier &&
      !qf.is.generatedIdentifier(node.operand) &&
      !qf.is.localName(node.operand) &&
      !qf.is.declarationNameOfEnumOrNamespace(node.operand)
    ) {
      const exportedNames = getExports(node.operand);
      if (exportedNames) {
        let expression: qt.Expression =
          node.kind === Syntax.PostfixUnaryExpression
            ? setRange(new qc.BinaryExpression(node.operand, new qc.Token(node.operator === Syntax.Plus2Token ? Syntax.PlusEqualsToken : Syntax.MinusEqualsToken), qc.asLiteral(1)), node)
            : node;
        for (const exportName of exportedNames) {
          noSubstitution[qf.get.nodeId(expression)] = true;
          expression = createExportExpression(exportName, expression);
        }
        return expression;
      }
    }
    return node;
  }
  function getExports(name: qt.Identifier): qt.Identifier[] | undefined {
    if (!qf.is.generatedIdentifier(name)) {
      const valueDeclaration = resolver.getReferencedImportDeclaration(name) || resolver.getReferencedValueDeclaration(name);
      if (valueDeclaration) return currentModuleInfo && currentModuleInfo.exportedBindings[getOriginalNodeId(valueDeclaration)];
    }
  }
}
export const createBindingHelper: qt.UnscopedEmitHelper = {
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
function createCreateBindingHelper(context: qt.TrafoContext, module: qt.Expression, inputName: qt.Expression, outputName: qt.Expression | undefined) {
  context.requestEmitHelper(createBindingHelper);
  return new qc.CallExpression(getUnscopedHelperName('__createBinding'), undefined, [new qc.Identifier('exports'), module, inputName, ...(outputName ? [outputName] : [])]);
}
export const setModuleDefaultHelper: qt.UnscopedEmitHelper = {
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
const exportStarHelper: qt.UnscopedEmitHelper = {
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
function createExportStarHelper(context: qt.TrafoContext, module: qt.Expression) {
  context.requestEmitHelper(exportStarHelper);
  return new qc.CallExpression(getUnscopedHelperName('__exportStar'), undefined, [module, new qc.Identifier('exports')]);
}
const dynamicImportUMDHelper: qt.EmitHelper = {
  name: 'typescript:dynamicimport-sync-require',
  scoped: true,
  text: `
            var __syncRequire = typeof module === "object" && typeof module.exports === "object";`,
};
export const importStarHelper: qt.UnscopedEmitHelper = {
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
export const importDefaultHelper: qt.UnscopedEmitHelper = {
  name: 'typescript:commonjsimportdefault',
  importName: '__importDefault',
  scoped: false,
  text: `
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};`,
};
export function transformECMAScriptModule(context: qt.TrafoContext) {
  const compilerOpts = context.getCompilerOpts();
  const previousOnEmitNode = context.onEmitNode;
  const previousOnSubstituteNode = context.onSubstituteNode;
  context.onEmitNode = onEmitNode;
  context.onSubstituteNode = onSubstituteNode;
  context.enableEmitNotification(Syntax.SourceFile);
  context.enableSubstitution(Syntax.Identifier);
  let helperNameSubstitutions: Map<qt.Identifier> | undefined;
  return chainBundle(transformSourceFile);
  function transformSourceFile(node: qt.SourceFile) {
    if (node.isDeclarationFile) return node;
    if (qf.is.externalModule(node) || compilerOpts.isolatedModules) {
      const result = updateExternalModule(node);
      if (!qf.is.externalModule(node) || some(result.statements, isExternalModuleIndicator)) return result;
      return qp_updateSourceNode(result, setRange(new Nodes([...result.statements, qf.create.emptyExports()]), result.statements));
    }
    return node;
  }
  function updateExternalModule(node: qt.SourceFile) {
    const externalHelpersImportDeclaration = createExternalHelpersImportDeclarationIfNeeded(node, compilerOpts);
    if (externalHelpersImportDeclaration) {
      const statements: qt.Statement[] = [];
      const statementOffset = addPrologue(statements, node.statements);
      append(statements, externalHelpersImportDeclaration);
      qu.addRange(statements, Nodes.visit(node.statements, visitor, qf.is.statement, statementOffset));
      return qp_updateSourceNode(node, setRange(new Nodes(statements), node.statements));
    }
    return qf.visit.children(node, visitor, context);
  }
  function visitor(node: Node): VisitResult<Node> {
    switch (node.kind) {
      case Syntax.ImportEqualsDeclaration:
        return;
      case Syntax.ExportAssignment:
        return visitExportAssignment(<qt.ExportAssignment>node);
      case Syntax.ExportDeclaration:
        const exportDecl = node as qt.ExportDeclaration;
        return visitExportDeclaration(exportDecl);
    }
    return node;
  }
  function visitExportAssignment(node: qt.ExportAssignment): VisitResult<qt.ExportAssignment> {
    return node.isExportEquals ? undefined : node;
  }
  function visitExportDeclaration(node: qt.ExportDeclaration) {
    if (compilerOpts.module !== undefined && compilerOpts.module > ModuleKind.ES2015) return node;
    if (!node.exportClause || !node.exportClause.kind === Syntax.NamespaceExport || !node.moduleSpecifier) return node;
    const oldIdentifier = node.exportClause.name;
    const synthName = qf.get.generatedNameForNode(oldIdentifier);
    const importDecl = new qc.ImportDeclaration(undefined, undefined, new qc.NamespaceImport(synthName), node.moduleSpecifier);
    importDecl.setOriginal(node.exportClause);
    const exportDecl = new qc.ExportDeclaration(undefined, undefined, new qc.NamedExports([new qc.ExportSpecifier(synthName, oldIdentifier)]));
    exportDecl.setOriginal(node);
    return [importDecl, exportDecl];
  }
  function onEmitNode(hint: qt.EmitHint, node: Node, emitCallback: (hint: qt.EmitHint, node: Node) => void): void {
    if (node.kind === Syntax.SourceFile) {
      if ((qf.is.externalModule(node) || compilerOpts.isolatedModules) && compilerOpts.importHelpers) {
        helperNameSubstitutions = qu.createMap<qt.Identifier>();
      }
      previousOnEmitNode(hint, node, emitCallback);
      helperNameSubstitutions = undefined;
    } else {
      previousOnEmitNode(hint, node, emitCallback);
    }
  }
  function onSubstituteNode(hint: qt.EmitHint, node: Node) {
    node = previousOnSubstituteNode(hint, node);
    if (helperNameSubstitutions && node.kind === Syntax.Identifier && qf.get.emitFlags(node) & EmitFlags.HelperName) return substituteHelperName(node);
    return node;
  }
  function substituteHelperName(node: qt.Identifier): qt.Expression {
    const name = idText(node);
    let substitution = helperNameSubstitutions!.get(name);
    if (!substitution) {
      helperNameSubstitutions!.set(name, (substitution = qf.create.fileLevelUniqueName(name)));
    }
    return substitution;
  }
}
export function transformSystemModule(context: qt.TrafoContext) {
  interface DependencyGroup {
    name: qt.StringLiteral;
    externalImports: (ImportDeclaration | qt.ImportEqualsDeclaration | qt.ExportDeclaration)[];
  }
  const { startLexicalEnv, endLexicalEnv, hoistVariableDeclaration } = context;
  const compilerOpts = context.getCompilerOpts();
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
  const exportFunctionsMap: qt.Identifier[] = [];
  const noSubstitutionMap: boolean[][] = [];
  const contextObjectMap: qt.Identifier[] = [];
  let currentSourceFile: qt.SourceFile;
  let moduleInfo: ExternalModuleInfo;
  let exportFunction: qt.Identifier;
  let contextObject: qt.Identifier;
  let hoistedStatements: qt.Statement[] | undefined;
  let enclosingBlockScopedContainer: Node;
  let noSubstitution: boolean[] | undefined;
  return chainBundle(transformSourceFile);
  function transformSourceFile(node: qt.SourceFile) {
    if (node.isDeclarationFile || !(node.isEffectiveExternalModule(compilerOpts) || node.trafoFlags & TrafoFlags.ContainsDynamicImport)) return node;
    const id = getOriginalNodeId(node);
    currentSourceFile = node;
    enclosingBlockScopedContainer = node;
    moduleInfo = moduleInfoMap[id] = collectExternalModuleInfo(node, resolver, compilerOpts);
    exportFunction = qf.create.uniqueName('exports');
    exportFunctionsMap[id] = exportFunction;
    contextObject = contextObjectMap[id] = qf.create.uniqueName('context');
    const dependencyGroups = collectDependencyGroups(moduleInfo.externalImports);
    const moduleBodyBlock = createSystemModuleBody(node, dependencyGroups);
    const moduleBodyFunction = new qc.FunctionExpression(undefined, undefined, undefined, undefined, [new qc.ParamDeclaration(undefined, undefined, contextObject)], undefined, moduleBodyBlock);
    const moduleName = tryGetModuleNameFromFile(node, host, compilerOpts);
    const dependencies = new qc.ArrayLiteralExpression(map(dependencyGroups, (dependencyGroup) => dependencyGroup.name));
    const updated = qf.emit.setFlags(
      qp_updateSourceNode(
        node,
        new Nodes([
          new qc.ExpressionStatement(
            new qc.CallExpression(
              new qc.PropertyAccessExpression(new qc.Identifier('System'), 'register'),
              undefined,
              moduleName ? [moduleName, dependencies, moduleBodyFunction] : [dependencies, moduleBodyFunction]
            )
          ),
        ]).setRange(node.statements)
      ),
      EmitFlags.NoTrailingComments
    );
    if (!(compilerOpts.outFile || compilerOpts.out)) {
      qf.emit.moveHelpers(updated, moduleBodyBlock, (helper) => !helper.scoped);
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
    return qf.calc.aggregate(updated);
  }
  function collectDependencyGroups(externalImports: (ImportDeclaration | qt.ImportEqualsDeclaration | qt.ExportDeclaration)[]) {
    const groupIndices = qu.createMap<number>();
    const dependencyGroups: DependencyGroup[] = [];
    for (const externalImport of externalImports) {
      const externalModuleName = qf.get.externalModuleNameLiteral(externalImport, currentSourceFile, host, resolver, compilerOpts);
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
  function createSystemModuleBody(node: qt.SourceFile, dependencyGroups: DependencyGroup[]) {
    const statements: qt.Statement[] = [];
    startLexicalEnv();
    const ensureUseStrict = getStrictOptionValue(compilerOpts, 'alwaysStrict') || (!compilerOpts.noImplicitUseStrict && qf.is.externalModule(currentSourceFile));
    const statementOffset = addPrologue(statements, node.statements, ensureUseStrict, sourceElemVisitor);
    statements.push(
      new qc.VariableStatement(
        undefined,
        new qc.VariableDeclarationList([new qc.VariableDeclaration('__moduleName', undefined, qf.create.logicalAnd(contextObject, new qc.PropertyAccessExpression(contextObject, 'id')))])
      )
    );
    qf.visit.node(moduleInfo.externalHelpersImportDeclaration, sourceElemVisitor, qf.is.statement);
    const executeStatements = Nodes.visit(node.statements, sourceElemVisitor, qf.is.statement, statementOffset);
    qu.addRange(statements, hoistedStatements);
    insertStatementsAfterStandardPrologue(statements, endLexicalEnv());
    const exportStarFunction = addExportStarIfNeeded(statements)!;
    const modifiers = node.trafoFlags & TrafoFlags.ContainsAwait ? qf.create.modifiersFromFlags(ModifierFlags.Async) : undefined;
    const moduleObject = new qc.ObjectLiteralExpression([
      new qc.PropertyAssignment('setters', createSettersArray(exportStarFunction, dependencyGroups)),
      new qc.PropertyAssignment('execute', new qc.FunctionExpression(modifiers, undefined, undefined, undefined, [], undefined, new qc.Block(executeStatements, true))),
    ]);
    moduleObject.multiLine = true;
    statements.push(new qc.ReturnStatement(moduleObject));
    return new qc.Block(statements, true);
  }
  function addExportStarIfNeeded(statements: qt.Statement[]) {
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
    const exportedNames: qt.ObjectLiteralElemLike[] = [];
    if (moduleInfo.exportedNames) {
      for (const exportedLocalName of moduleInfo.exportedNames) {
        if (exportedLocalName.escapedText === 'default') {
          continue;
        }
        exportedNames.push(new qc.PropertyAssignment(qc.asLiteral(exportedLocalName), new qc.BooleanLiteral(true)));
      }
    }
    for (const externalImport of moduleInfo.externalImports) {
      if (externalImport.kind !== Syntax.ExportDeclaration) {
        continue;
      }
      if (!externalImport.exportClause) {
        continue;
      }
      if (externalImport.exportClause.kind === Syntax.NamedExports) {
        for (const elem of externalImport.exportClause.elems) {
          exportedNames.push(new qc.PropertyAssignment(qc.asLiteral(idText(elem.name || elem.propertyName)), new qc.BooleanLiteral(true)));
        }
      } else {
        exportedNames.push(new qc.PropertyAssignment(qc.asLiteral(idText(externalImport.exportClause.name)), new qc.BooleanLiteral(true)));
      }
    }
    const exportedNamesStorageRef = qf.create.uniqueName('exportedNames');
    statements.push(
      new qc.VariableStatement(undefined, new qc.VariableDeclarationList([new qc.VariableDeclaration(exportedNamesStorageRef, undefined, new qc.ObjectLiteralExpression(exportedNames, true))]))
    );
    const exportStarFunction = createExportStarFunction(exportedNamesStorageRef);
    statements.push(exportStarFunction);
    return exportStarFunction.name;
  }
  function createExportStarFunction(localNames: qt.Identifier | undefined) {
    const exportStarFunction = qf.create.uniqueName('exportStar');
    const m = new qc.Identifier('m');
    const n = new qc.Identifier('n');
    const exports = new qc.Identifier('exports');
    let condition: qt.Expression = qf.create.strictInequality(n, qc.asLiteral('default'));
    if (localNames) {
      condition = qf.create.logicalAnd(condition, qf.create.logicalNot(new qc.CallExpression(new qc.PropertyAccessExpression(localNames, 'hasOwnProperty'), undefined, [n])));
    }
    return new qc.FunctionDeclaration(
      undefined,
      undefined,
      undefined,
      exportStarFunction,
      undefined,
      [new qc.ParamDeclaration(undefined, undefined, m)],
      undefined,
      new qc.Block(
        [
          new qc.VariableStatement(undefined, new qc.VariableDeclarationList([new qc.VariableDeclaration(exports, undefined, new qc.ObjectLiteralExpression([]))])),
          new qc.ForInStatement(
            new qc.VariableDeclarationList([new qc.VariableDeclaration(n, undefined)]),
            m,
            new qc.Block([
              qf.emit.setFlags(
                new qc.IfStatement(condition, new qc.ExpressionStatement(qf.create.assignment(new qc.ElemAccessExpression(exports, n), new qc.ElemAccessExpression(m, n)))),
                EmitFlags.SingleLine
              ),
            ])
          ),
          new qc.ExpressionStatement(new qc.CallExpression(exportFunction, undefined, [exports])),
        ],
        true
      )
    );
  }
  function createSettersArray(exportStarFunction: qt.Identifier, dependencyGroups: DependencyGroup[]) {
    const setters: qt.Expression[] = [];
    for (const group of dependencyGroups) {
      const localName = forEach(group.externalImports, (i) => qf.decl.localNameForExternalImport(i, currentSourceFile));
      const paramName = localName ? qf.get.generatedNameForNode(localName) : qf.create.uniqueName('');
      const statements: qt.Statement[] = [];
      for (const entry of group.externalImports) {
        const importVariableName = qf.decl.localNameForExternalImport(entry, currentSourceFile)!;
        switch (entry.kind) {
          case Syntax.ImportDeclaration:
            if (!entry.importClause) {
              break;
            }
          case Syntax.ImportEqualsDeclaration:
            qf.assert.true(importVariableName !== undefined);
            statements.push(new qc.ExpressionStatement(qf.create.assignment(importVariableName, paramName)));
            break;
          case Syntax.ExportDeclaration:
            qf.assert.true(importVariableName !== undefined);
            if (entry.exportClause) {
              if (entry.exportClause.kind === Syntax.NamedExports) {
                const properties: qt.PropertyAssignment[] = [];
                for (const e of entry.exportClause.elems) {
                  properties.push(new qc.PropertyAssignment(qc.asLiteral(idText(e.name)), new qc.ElemAccessExpression(paramName, qc.asLiteral(idText(e.propertyName || e.name)))));
                }
                statements.push(new qc.ExpressionStatement(new qc.CallExpression(exportFunction, true)));
              } else {
                statements.push(new qc.ExpressionStatement(new qc.CallExpression(exportFunction, undefined, [qc.asLiteral(idText(entry.exportClause.name)), paramName])));
              }
            } else {
              statements.push(new qc.ExpressionStatement(new qc.CallExpression(exportStarFunction, undefined, [paramName])));
            }
            break;
        }
      }
      setters.push(new qc.FunctionExpression(undefined, undefined, undefined, undefined, [new qc.ParamDeclaration(undefined, undefined, paramName)], undefined, new qc.Block(statements, true)));
    }
    return new qc.ArrayLiteralExpression(setters, true);
  }
  function sourceElemVisitor(node: Node): VisitResult<Node> {
    switch (node.kind) {
      case Syntax.ImportDeclaration:
        return visitImportDeclaration(<qt.ImportDeclaration>node);
      case Syntax.ImportEqualsDeclaration:
        return visitImportEqualsDeclaration(<qt.ImportEqualsDeclaration>node);
      case Syntax.ExportDeclaration:
        return visitExportDeclaration(<qt.ExportDeclaration>node);
      case Syntax.ExportAssignment:
        return visitExportAssignment(<qt.ExportAssignment>node);
      default:
        return nestedElemVisitor(node);
    }
  }
  function visitImportDeclaration(node: qt.ImportDeclaration): VisitResult<qt.Statement> {
    let statements: qt.Statement[] | undefined;
    if (node.importClause) {
      hoistVariableDeclaration(qf.decl.localNameForExternalImport(node, currentSourceFile)!);
    }
    if (hasAssociatedEndOfDeclarationMarker(node)) {
      const id = getOriginalNodeId(node);
      deferredExports[id] = appendExportsOfImportDeclaration(deferredExports[id], node);
    } else {
      statements = appendExportsOfImportDeclaration(statements, node);
    }
    return singleOrMany(statements);
  }
  function visitExportDeclaration(node: qt.ExportDeclaration): VisitResult<qt.Statement> {
    qf.assert.defined(node);
    return;
  }
  function visitImportEqualsDeclaration(node: qt.ImportEqualsDeclaration): VisitResult<qt.Statement> {
    qf.assert.true(qf.is.externalModuleImportEqualsDeclaration(node), 'import= for internal module references should be handled in an earlier transformer.');
    let statements: qt.Statement[] | undefined;
    hoistVariableDeclaration(qf.decl.localNameForExternalImport(node, currentSourceFile)!);
    if (hasAssociatedEndOfDeclarationMarker(node)) {
      const id = getOriginalNodeId(node);
      deferredExports[id] = appendExportsOfImportEqualsDeclaration(deferredExports[id], node);
    } else {
      statements = appendExportsOfImportEqualsDeclaration(statements, node);
    }
    return singleOrMany(statements);
  }
  function visitExportAssignment(node: qt.ExportAssignment): VisitResult<qt.Statement> {
    if (node.isExportEquals) {
      return;
    }
    const expression = qf.visit.node(node.expression, destructuringAndImportCallVisitor, isExpression);
    const original = node.original;
    if (original && hasAssociatedEndOfDeclarationMarker(original)) {
      const id = getOriginalNodeId(node);
      deferredExports[id] = appendExportStatement(deferredExports[id], new qc.Identifier('default'), expression, true);
    }
    return createExportStatement(new qc.Identifier('default'), expression, true);
  }
  function visitFunctionDeclaration(node: qt.FunctionDeclaration): VisitResult<qt.Statement> {
    if (qf.has.syntacticModifier(node, ModifierFlags.Export)) {
      hoistedStatements = append(
        hoistedStatements,
        node.update(
          node.decorators,
          Nodes.visit(node.modifiers, modifierVisitor, isModifier),
          node.asteriskToken,
          qf.decl.name(node, true),
          undefined,
          Nodes.visit(node.params, destructuringAndImportCallVisitor, qf.is.paramDeclaration),
          undefined,
          qf.visit.node(node.body, destructuringAndImportCallVisitor, isBlock)
        )
      );
    } else {
      hoistedStatements = append(hoistedStatements, qf.visit.children(node, destructuringAndImportCallVisitor, context));
    }
    if (hasAssociatedEndOfDeclarationMarker(node)) {
      const id = getOriginalNodeId(node);
      deferredExports[id] = appendExportsOfHoistedDeclaration(deferredExports[id], node);
    } else {
      hoistedStatements = appendExportsOfHoistedDeclaration(hoistedStatements, node);
    }
    return;
  }
  function visitClassDeclaration(node: qt.ClassDeclaration): VisitResult<qt.Statement> {
    let statements: qt.Statement[] | undefined;
    const name = qf.decl.localName(node);
    hoistVariableDeclaration(name);
    statements = append(
      statements,
      new qc.ExpressionStatement(
        qf.create.assignment(
          name,
          new qc.ClassExpression(
            undefined,
            node.name,
            undefined,
            Nodes.visit(node.heritageClauses, destructuringAndImportCallVisitor, isHeritageClause),
            Nodes.visit(node.members, destructuringAndImportCallVisitor, isClassElem)
          ).setRange(node)
        )
      ).setRange(node)
    );
    if (hasAssociatedEndOfDeclarationMarker(node)) {
      const id = getOriginalNodeId(node);
      deferredExports[id] = appendExportsOfHoistedDeclaration(deferredExports[id], node);
    } else {
      statements = appendExportsOfHoistedDeclaration(statements, node);
    }
    return singleOrMany(statements);
  }
  function visitVariableStatement(node: qt.VariableStatement): VisitResult<qt.Statement> {
    if (!shouldHoistVariableDeclarationList(node.declarationList)) return qf.visit.node(node, destructuringAndImportCallVisitor, qf.is.statement);
    let expressions: qt.Expression[] | undefined;
    const isExportedDeclaration = qf.has.syntacticModifier(node, ModifierFlags.Export);
    const isMarkedDeclaration = hasAssociatedEndOfDeclarationMarker(node);
    for (const variable of node.declarationList.declarations) {
      if (variable.initer) {
        expressions = append(expressions, transformInitializedVariable(variable, isExportedDeclaration && !isMarkedDeclaration));
      } else {
        hoistBindingElem(variable);
      }
    }
    let statements: qt.Statement[] | undefined;
    if (expressions) {
      statements = append(statements, setRange(new qc.ExpressionStatement(inlineExpressions(expressions)), node));
    }
    if (isMarkedDeclaration) {
      const id = getOriginalNodeId(node);
      deferredExports[id] = appendExportsOfVariableStatement(deferredExports[id], node, isExportedDeclaration);
    } else {
      statements = appendExportsOfVariableStatement(statements, node, false);
    }
    return singleOrMany(statements);
  }
  function hoistBindingElem(node: qt.VariableDeclaration | qt.BindingElem): void {
    if (node.name.kind === Syntax.BindingPattern) {
      for (const elem of node.name.elems) {
        if (!elem.kind === Syntax.OmittedExpression) {
          hoistBindingElem(elem);
        }
      }
    } else {
      hoistVariableDeclaration(qf.create.synthesizedClone(node.name));
    }
  }
  function shouldHoistVariableDeclarationList(node: qt.VariableDeclarationList) {
    return (qf.get.emitFlags(node) & EmitFlags.NoHoisting) === 0 && (enclosingBlockScopedContainer.kind === Syntax.SourceFile || (qf.get.originalOf(node).flags & NodeFlags.BlockScoped) === 0);
  }
  function transformInitializedVariable(node: qt.VariableDeclaration, isExportedDeclaration: boolean): qt.Expression {
    const createAssignment = isExportedDeclaration ? createExportedVariableAssignment : createNonExportedVariableAssignment;
    return node.name.kind === Syntax.BindingPattern
      ? flattenDestructuringAssignment(node, destructuringAndImportCallVisitor, context, FlattenLevel.All, false, qf.create.assignment)
      : node.initer
      ? qf.create.assignment(node.name, qf.visit.node(node.initer, destructuringAndImportCallVisitor, isExpression))
      : node.name;
  }
  function createExportedVariableAssignment(name: qt.Identifier, value: qt.Expression, location?: TextRange) {
    return createVariableAssignment(name, value, location, true);
  }
  function createNonExportedVariableAssignment(name: qt.Identifier, value: qt.Expression, location?: TextRange) {
    return createVariableAssignment(name, value, location, false);
  }
  function createVariableAssignment(name: qt.Identifier, value: qt.Expression, location: TextRange | undefined, isExportedDeclaration: boolean) {
    hoistVariableDeclaration(qf.create.synthesizedClone(name));
    return isExportedDeclaration
      ? createExportExpression(name, preventSubstitution(setRange(qf.create.assignment(name, value), location)))
      : preventSubstitution(setRange(qf.create.assignment(name, value), location));
  }
  function visitMergeDeclarationMarker(node: qt.MergeDeclarationMarker): VisitResult<qt.Statement> {
    if (hasAssociatedEndOfDeclarationMarker(node) && node.original!.kind === Syntax.VariableStatement) {
      const id = getOriginalNodeId(node);
      const isExportedDeclaration = qf.has.syntacticModifier(node.original!, ModifierFlags.Export);
      deferredExports[id] = appendExportsOfVariableStatement(deferredExports[id], <qt.VariableStatement>node.original, isExportedDeclaration);
    }
    return node;
  }
  function hasAssociatedEndOfDeclarationMarker(node: Node) {
    return (qf.get.emitFlags(node) & EmitFlags.HasEndOfDeclarationMarker) !== 0;
  }
  function visitEndOfDeclarationMarker(node: qt.EndOfDeclarationMarker): VisitResult<qt.Statement> {
    const id = getOriginalNodeId(node);
    const statements = deferredExports[id];
    if (statements) {
      delete deferredExports[id];
      return append(statements, node);
    } else {
      const original = qf.get.originalOf(node);
      if (qf.is.moduleOrEnumDeclaration(original)) return append(appendExportsOfDeclaration(statements, original), node);
    }
    return node;
  }
  function appendExportsOfImportDeclaration(statements: qt.Statement[] | undefined, decl: qt.ImportDeclaration) {
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
          for (const importBinding of namedBindings.elems) {
            statements = appendExportsOfDeclaration(statements, importBinding);
          }
          break;
      }
    }
    return statements;
  }
  function appendExportsOfImportEqualsDeclaration(statements: qt.Statement[] | undefined, decl: qt.ImportEqualsDeclaration): qt.Statement[] | undefined {
    if (moduleInfo.exportEquals) return statements;
    return appendExportsOfDeclaration(statements, decl);
  }
  function appendExportsOfVariableStatement(statements: qt.Statement[] | undefined, node: qt.VariableStatement, exportSelf: boolean): qt.Statement[] | undefined {
    if (moduleInfo.exportEquals) return statements;
    for (const decl of node.declarationList.declarations) {
      if (decl.initer || exportSelf) {
        statements = appendExportsOfBindingElem(statements, decl, exportSelf);
      }
    }
    return statements;
  }
  function appendExportsOfBindingElem(statements: qt.Statement[] | undefined, decl: qt.VariableDeclaration | qt.BindingElem, exportSelf: boolean): qt.Statement[] | undefined {
    if (moduleInfo.exportEquals) return statements;
    if (decl.name.kind === Syntax.BindingPattern) {
      for (const elem of decl.name.elems) {
        if (!elem.kind === Syntax.OmittedExpression) {
          statements = appendExportsOfBindingElem(statements, elem, exportSelf);
        }
      }
    } else if (!qf.is.generatedIdentifier(decl.name)) {
      let excludeName: string | undefined;
      if (exportSelf) {
        statements = appendExportStatement(statements, decl.name, qf.decl.localName(decl));
        excludeName = idText(decl.name);
      }
      statements = appendExportsOfDeclaration(statements, decl, excludeName);
    }
    return statements;
  }
  function appendExportsOfHoistedDeclaration(statements: qt.Statement[] | undefined, decl: qt.ClassDeclaration | qt.FunctionDeclaration): qt.Statement[] | undefined {
    if (moduleInfo.exportEquals) return statements;
    let excludeName: string | undefined;
    if (qf.has.syntacticModifier(decl, ModifierFlags.Export)) {
      const exportName = qf.has.syntacticModifier(decl, ModifierFlags.Default) ? qc.asLiteral('default') : decl.name!;
      statements = appendExportStatement(statements, exportName, qf.decl.localName(decl));
      excludeName = qf.get.textOfIdentifierOrLiteral(exportName);
    }
    if (decl.name) {
      statements = appendExportsOfDeclaration(statements, decl, excludeName);
    }
    return statements;
  }
  function appendExportsOfDeclaration(statements: qt.Statement[] | undefined, decl: qt.Declaration, excludeName?: string): qt.Statement[] | undefined {
    if (moduleInfo.exportEquals) return statements;
    const name = qf.decl.name(decl);
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
  function appendExportStatement(statements: qt.Statement[] | undefined, exportName: qt.Identifier | qt.StringLiteral, expression: qt.Expression, allowComments?: boolean): qt.Statement[] | undefined {
    statements = append(statements, createExportStatement(exportName, expression, allowComments));
    return statements;
  }
  function createExportStatement(name: qt.Identifier | qt.StringLiteral, value: qt.Expression, allowComments?: boolean) {
    const statement = new qc.ExpressionStatement(createExportExpression(name, value));
    qf.emit.setStartsOnNewLine(statement);
    if (!allowComments) {
      qf.emit.setFlags(statement, EmitFlags.NoComments);
    }
    return statement;
  }
  function createExportExpression(name: qt.Identifier | qt.StringLiteral, value: qt.Expression) {
    const exportName = name.kind === Syntax.Identifier ? qc.asLiteral(name) : name;
    qf.emit.setFlags(value, qf.get.emitFlags(value) | EmitFlags.NoComments);
    return qf.emit.setCommentRange(new qc.CallExpression(exportFunction, undefined, [exportName, value]), value);
  }
  function nestedElemVisitor(node: Node): VisitResult<Node> {
    switch (node.kind) {
      case Syntax.VariableStatement:
        return visitVariableStatement(<qt.VariableStatement>node);
      case Syntax.FunctionDeclaration:
        return visitFunctionDeclaration(<qt.FunctionDeclaration>node);
      case Syntax.ClassDeclaration:
        return visitClassDeclaration(<qt.ClassDeclaration>node);
      case Syntax.ForStatement:
        return visitForStatement(<qt.ForStatement>node);
      case Syntax.ForInStatement:
        return visitForInStatement(<qt.ForInStatement>node);
      case Syntax.ForOfStatement:
        return visitForOfStatement(<qt.ForOfStatement>node);
      case Syntax.DoStatement:
        return visitDoStatement(<qt.DoStatement>node);
      case Syntax.WhileStatement:
        return visitWhileStatement(<qt.WhileStatement>node);
      case Syntax.LabeledStatement:
        return visitLabeledStatement(<qt.LabeledStatement>node);
      case Syntax.WithStatement:
        return visitWithStatement(<qt.WithStatement>node);
      case Syntax.SwitchStatement:
        return visitSwitchStatement(<qt.SwitchStatement>node);
      case Syntax.CaseBlock:
        return visitCaseBlock(<qt.CaseBlock>node);
      case Syntax.CaseClause:
        return visitCaseClause(<qt.CaseClause>node);
      case Syntax.DefaultClause:
        return visitDefaultClause(<qt.DefaultClause>node);
      case Syntax.TryStatement:
        return visitTryStatement(<qt.TryStatement>node);
      case Syntax.CatchClause:
        return visitCatchClause(<qt.CatchClause>node);
      case Syntax.Block:
        return visitBlock(<qt.Block>node);
      case Syntax.MergeDeclarationMarker:
        return visitMergeDeclarationMarker(<qt.MergeDeclarationMarker>node);
      case Syntax.EndOfDeclarationMarker:
        return visitEndOfDeclarationMarker(<qt.EndOfDeclarationMarker>node);
      default:
        return destructuringAndImportCallVisitor(node);
    }
  }
  function visitForStatement(node: qt.ForStatement): VisitResult<qt.Statement> {
    const savedEnclosingBlockScopedContainer = enclosingBlockScopedContainer;
    enclosingBlockScopedContainer = node;
    node = updateFor(
      node,
      node.initer && visitForIniter(node.initer),
      qf.visit.node(node.condition, destructuringAndImportCallVisitor, isExpression),
      qf.visit.node(node.incrementor, destructuringAndImportCallVisitor, isExpression),
      qf.visit.node(node.statement, nestedElemVisitor, qf.is.statement)
    );
    enclosingBlockScopedContainer = savedEnclosingBlockScopedContainer;
    return node;
  }
  function visitForInStatement(node: qt.ForInStatement): VisitResult<qt.Statement> {
    const savedEnclosingBlockScopedContainer = enclosingBlockScopedContainer;
    enclosingBlockScopedContainer = node;
    node = updateForIn(
      node,
      visitForIniter(node.initer),
      qf.visit.node(node.expression, destructuringAndImportCallVisitor, isExpression),
      qf.visit.node(node.statement, nestedElemVisitor, qf.is.statement, qc.liftToBlock)
    );
    enclosingBlockScopedContainer = savedEnclosingBlockScopedContainer;
    return node;
  }
  function visitForOfStatement(node: qt.ForOfStatement): VisitResult<qt.Statement> {
    const savedEnclosingBlockScopedContainer = enclosingBlockScopedContainer;
    enclosingBlockScopedContainer = node;
    node = updateForOf(
      node,
      node.awaitModifier,
      visitForIniter(node.initer),
      qf.visit.node(node.expression, destructuringAndImportCallVisitor, isExpression),
      qf.visit.node(node.statement, nestedElemVisitor, qf.is.statement, qc.liftToBlock)
    );
    enclosingBlockScopedContainer = savedEnclosingBlockScopedContainer;
    return node;
  }
  function shouldHoistForIniter(node: qt.ForIniter): node is qt.VariableDeclarationList {
    return node.kind === Syntax.VariableDeclarationList && shouldHoistVariableDeclarationList(node);
  }
  function visitForIniter(node: qt.ForIniter): qt.ForIniter {
    if (shouldHoistForIniter(node)) {
      let expressions: qt.Expression[] | undefined;
      for (const variable of node.declarations) {
        expressions = append(expressions, transformInitializedVariable(variable, false));
        if (!variable.initer) {
          hoistBindingElem(variable);
        }
      }
      return expressions ? inlineExpressions(expressions) : new qc.OmittedExpression();
    }
    return qf.visit.children(node, nestedElemVisitor, context);
  }
  function visitDoStatement(node: qt.DoStatement): VisitResult<qt.Statement> {
    return node.update(qf.visit.node(node.statement, nestedElemVisitor, qf.is.statement, qc.liftToBlock), qf.visit.node(node.expression, destructuringAndImportCallVisitor, isExpression));
  }
  function visitWhileStatement(node: qt.WhileStatement): VisitResult<qt.Statement> {
    return node.update(qf.visit.node(node.expression, destructuringAndImportCallVisitor, isExpression), qf.visit.node(node.statement, nestedElemVisitor, qf.is.statement, qc.liftToBlock));
  }
  function visitLabeledStatement(node: qt.LabeledStatement): VisitResult<qt.Statement> {
    return node.update(node.label, qf.visit.node(node.statement, nestedElemVisitor, qf.is.statement, qc.liftToBlock));
  }
  function visitWithStatement(node: qt.WithStatement): VisitResult<qt.Statement> {
    return node.update(qf.visit.node(node.expression, destructuringAndImportCallVisitor, isExpression), qf.visit.node(node.statement, nestedElemVisitor, qf.is.statement, qc.liftToBlock));
  }
  function visitSwitchStatement(node: qt.SwitchStatement): VisitResult<qt.Statement> {
    return node.update(qf.visit.node(node.expression, destructuringAndImportCallVisitor, isExpression), qf.visit.node(node.caseBlock, nestedElemVisitor, isCaseBlock));
  }
  function visitCaseBlock(node: qt.CaseBlock): qt.CaseBlock {
    const savedEnclosingBlockScopedContainer = enclosingBlockScopedContainer;
    enclosingBlockScopedContainer = node;
    node = node.update(Nodes.visit(node.clauses, nestedElemVisitor, isCaseOrDefaultClause));
    enclosingBlockScopedContainer = savedEnclosingBlockScopedContainer;
    return node;
  }
  function visitCaseClause(node: qt.CaseClause): VisitResult<qt.CaseOrDefaultClause> {
    return node.update(qf.visit.node(node.expression, destructuringAndImportCallVisitor, isExpression), Nodes.visit(node.statements, nestedElemVisitor, qf.is.statement));
  }
  function visitDefaultClause(node: qt.DefaultClause): VisitResult<qt.CaseOrDefaultClause> {
    return qf.visit.children(node, nestedElemVisitor, context);
  }
  function visitTryStatement(node: qt.TryStatement): VisitResult<qt.Statement> {
    return qf.visit.children(node, nestedElemVisitor, context);
  }
  function visitCatchClause(node: qt.CatchClause): qt.CatchClause {
    const savedEnclosingBlockScopedContainer = enclosingBlockScopedContainer;
    enclosingBlockScopedContainer = node;
    node = node.update(node.variableDeclaration, qf.visit.node(node.block, nestedElemVisitor, isBlock));
    enclosingBlockScopedContainer = savedEnclosingBlockScopedContainer;
    return node;
  }
  function visitBlock(node: qt.Block): qt.Block {
    const savedEnclosingBlockScopedContainer = enclosingBlockScopedContainer;
    enclosingBlockScopedContainer = node;
    node = qf.visit.children(node, nestedElemVisitor, context);
    enclosingBlockScopedContainer = savedEnclosingBlockScopedContainer;
    return node;
  }
  function destructuringAndImportCallVisitor(node: Node): VisitResult<Node> {
    if (qf.is.destructuringAssignment(node)) return visitDestructuringAssignment(node);
    else if (qf.is.importCall(node)) return visitImportCallExpression(node);
    else if (node.trafoFlags & TrafoFlags.ContainsDestructuringAssignment || node.trafoFlags & TrafoFlags.ContainsDynamicImport)
      return qf.visit.children(node, destructuringAndImportCallVisitor, context);
    return node;
  }
  function visitImportCallExpression(node: qt.ImportCall): qt.Expression {
    return new qc.CallExpression(
      new qc.PropertyAccessExpression(contextObject, new qc.Identifier('import')),
      undefined,
      some(node.args) ? [qf.visit.node(node.args[0], destructuringAndImportCallVisitor)] : []
    );
  }
  function visitDestructuringAssignment(node: qt.DestructuringAssignment): VisitResult<qt.Expression> {
    if (hasExportedReferenceInDestructuringTarget(node.left)) return flattenDestructuringAssignment(node, destructuringAndImportCallVisitor, context, FlattenLevel.All, true);
    return qf.visit.children(node, destructuringAndImportCallVisitor, context);
  }
  function hasExportedReferenceInDestructuringTarget(node: qt.Expression | qt.ObjectLiteralElemLike): boolean {
    if (qf.is.assignmentExpression(node, true)) return hasExportedReferenceInDestructuringTarget(node.left);
    if (node.kind === Syntax.SpreadElem) return hasExportedReferenceInDestructuringTarget(node.expression);
    if (node.kind === Syntax.ObjectLiteralExpression) return some(node.properties, hasExportedReferenceInDestructuringTarget);
    if (qf.is.arrayLiteralExpression(node)) return some(node.elems, hasExportedReferenceInDestructuringTarget);
    if (node.kind === Syntax.ShorthandPropertyAssignment) return hasExportedReferenceInDestructuringTarget(node.name);
    if (node.kind === Syntax.PropertyAssignment) return hasExportedReferenceInDestructuringTarget(node.initer);
    if (node.kind === Syntax.Identifier) {
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
  function onEmitNode(hint: qt.EmitHint, node: Node, emitCallback: (hint: qt.EmitHint, node: Node) => void): void {
    if (node.kind === Syntax.SourceFile) {
      const id = getOriginalNodeId(node);
      currentSourceFile = <qt.SourceFile>node;
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
  function onSubstituteNode(hint: qt.EmitHint, node: Node) {
    node = previousOnSubstituteNode(hint, node);
    if (isSubstitutionPrevented(node)) return node;
    if (hint === qt.EmitHint.Expression) return substituteExpression(<qt.Expression>node);
    else if (hint === qt.EmitHint.Unspecified) return substituteUnspecified(node);
    return node;
  }
  function substituteUnspecified(node: Node) {
    switch (node.kind) {
      case Syntax.ShorthandPropertyAssignment:
        return substituteShorthandPropertyAssignment(<qt.ShorthandPropertyAssignment>node);
    }
    return node;
  }
  function substituteShorthandPropertyAssignment(node: qt.ShorthandPropertyAssignment) {
    const name = node.name;
    if (!qf.is.generatedIdentifier(name) && !qf.is.localName(name)) {
      const importDeclaration = resolver.getReferencedImportDeclaration(name);
      if (importDeclaration) {
        if (importDeclaration.kind === Syntax.ImportClause)
          return setRange(
            new qc.PropertyAssignment(qf.create.synthesizedClone(name), new qc.PropertyAccessExpression(qf.get.generatedNameForNode(importDeclaration.parent), new qc.Identifier('default'))),
            node
          );
        else if (importDeclaration.kind === Syntax.ImportSpecifier) {
          return setRange(
            new qc.PropertyAssignment(
              qf.create.synthesizedClone(name),
              new qc.PropertyAccessExpression(qf.get.generatedNameForNode(importDeclaration.parent.parent.parent), qf.create.synthesizedClone(importDeclaration.propertyName || importDeclaration.name))
            ),
            node
          );
        }
      }
    }
    return node;
  }
  function substituteExpression(node: qt.Expression) {
    switch (node.kind) {
      case Syntax.Identifier:
        return substituteExpressionIdentifier(<qt.Identifier>node);
      case Syntax.BinaryExpression:
        return substituteBinaryExpression(<qt.BinaryExpression>node);
      case Syntax.PrefixUnaryExpression:
      case Syntax.PostfixUnaryExpression:
        return substituteUnaryExpression(<qt.PrefixUnaryExpression | qt.PostfixUnaryExpression>node);
      case Syntax.MetaProperty:
        return substituteMetaProperty(<qt.MetaProperty>node);
    }
    return node;
  }
  function substituteExpressionIdentifier(node: qt.Identifier): qt.Expression {
    if (qf.get.emitFlags(node) & EmitFlags.HelperName) {
      const externalHelpersModuleName = qf.emit.externalHelpersModuleName(currentSourceFile);
      if (externalHelpersModuleName) return new qc.PropertyAccessExpression(externalHelpersModuleName, node);
      return node;
    }
    if (!qf.is.generatedIdentifier(node) && !qf.is.localName(node)) {
      const importDeclaration = resolver.getReferencedImportDeclaration(node);
      if (importDeclaration) {
        if (importDeclaration.kind === Syntax.ImportClause) return setRange(new qc.PropertyAccessExpression(qf.get.generatedNameForNode(importDeclaration.parent), new qc.Identifier('default')), node);
        else if (importDeclaration.kind === Syntax.ImportSpecifier)
          return setRange(
            new qc.PropertyAccessExpression(qf.get.generatedNameForNode(importDeclaration.parent.parent.parent), qf.create.synthesizedClone(importDeclaration.propertyName || importDeclaration.name)),
            node
          );
      }
    }
    return node;
  }
  function substituteBinaryExpression(node: qt.BinaryExpression): qt.Expression {
    if (
      syntax.is.assignmentOperator(node.operatorToken.kind) &&
      node.left.kind === Syntax.Identifier &&
      !qf.is.generatedIdentifier(node.left) &&
      !qf.is.localName(node.left) &&
      !qf.is.declarationNameOfEnumOrNamespace(node.left)
    ) {
      const exportedNames = getExports(node.left);
      if (exportedNames) {
        let expression: qt.Expression = node;
        for (const exportName of exportedNames) {
          expression = createExportExpression(exportName, preventSubstitution(expression));
        }
        return expression;
      }
    }
    return node;
  }
  function substituteUnaryExpression(node: qt.PrefixUnaryExpression | qt.PostfixUnaryExpression): qt.Expression {
    if (
      (node.operator === Syntax.Plus2Token || node.operator === Syntax.Minus2Token) &&
      node.operand.kind === Syntax.Identifier &&
      !qf.is.generatedIdentifier(node.operand) &&
      !qf.is.localName(node.operand) &&
      !qf.is.declarationNameOfEnumOrNamespace(node.operand)
    ) {
      const exportedNames = getExports(node.operand);
      if (exportedNames) {
        let expression: qt.Expression = node.kind === Syntax.PostfixUnaryExpression ? setRange(new qc.PrefixUnaryExpression(node.operator, node.operand), node) : node;
        for (const exportName of exportedNames) {
          expression = createExportExpression(exportName, preventSubstitution(expression));
        }
        if (node.kind === Syntax.PostfixUnaryExpression) {
          expression = node.operator === Syntax.Plus2Token ? qf.create.subtract(preventSubstitution(expression), qc.asLiteral(1)) : qf.create.add(preventSubstitution(expression), qc.asLiteral(1));
        }
        return expression;
      }
    }
    return node;
  }
  function substituteMetaProperty(node: qt.MetaProperty) {
    if (qf.is.importMeta(node)) return new qc.PropertyAccessExpression(contextObject, new qc.Identifier('meta'));
    return node;
  }
  function getExports(name: qt.Identifier) {
    let exportedNames: qt.Identifier[] | undefined;
    if (!qf.is.generatedIdentifier(name)) {
      const valueDeclaration = resolver.getReferencedImportDeclaration(name) || resolver.getReferencedValueDeclaration(name);
      if (valueDeclaration) {
        const exportContainer = resolver.getReferencedExportContainer(name, false);
        if (exportContainer && exportContainer.kind === Syntax.SourceFile) {
          exportedNames = append(exportedNames, qf.decl.name(valueDeclaration));
        }
        exportedNames = qu.addRange(exportedNames, moduleInfo && moduleInfo.exportedBindings[getOriginalNodeId(valueDeclaration)]);
      }
    }
    return exportedNames;
  }
  function preventSubstitution<T extends Node>(node: T): T {
    if (noSubstitution === undefined) noSubstitution = [];
    noSubstitution[qf.get.nodeId(node)] = true;
    return node;
  }
  function isSubstitutionPrevented(node: Node) {
    return noSubstitution && node.id && noSubstitution[node.id];
  }
}
