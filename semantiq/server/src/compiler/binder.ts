import { ModifierFlags, Node, SymbolFlags } from './types';
import { qf } from './core';
import { Syntax } from './syntax';
import * as qc from './core';
import * as qd from './diags';
import * as qt from './types';
import * as qu from './utils';
import * as qy from './syntax';
export const enum ModuleInstanceState {
  NonInstantiated = 0,
  Instantiated = 1,
  ConstEnumOnly = 2,
}
interface ActiveLabel {
  next: ActiveLabel | undefined;
  name: qu.__String;
  breakTarget: qt.FlowLabel;
  continueTarget: qt.FlowLabel | undefined;
  referenced: boolean;
}
export function getModuleInstanceState(node: qt.ModuleDeclaration, visited?: qu.QMap<ModuleInstanceState | undefined>): ModuleInstanceState {
  if (node.body && !node.body.parent) {
    setParentPointers(node, node.body);
  }
  return node.body ? getModuleInstanceStateCached(node.body, visited) : ModuleInstanceState.Instantiated;
}
function getModuleInstanceStateCached(node: Node, visited = qu.createMap<ModuleInstanceState | undefined>()) {
  const nodeId = '' + qf.get.nodeId(node);
  if (visited.has(nodeId)) return visited.get(nodeId) || ModuleInstanceState.NonInstantiated;
  visited.set(nodeId, undefined);
  const result = getModuleInstanceStateWorker(node, visited);
  visited.set(nodeId, result);
  return result;
}
function getModuleInstanceStateWorker(node: Node, visited: qu.QMap<ModuleInstanceState | undefined>): ModuleInstanceState {
  switch (node.kind) {
    case Syntax.InterfaceDeclaration:
    case Syntax.TypeAliasDeclaration:
      return ModuleInstanceState.NonInstantiated;
    case Syntax.EnumDeclaration:
      if (qf.is.enumConst(node as qt.EnumDeclaration)) return ModuleInstanceState.ConstEnumOnly;
      break;
    case Syntax.ImportDeclaration:
    case Syntax.ImportEqualsDeclaration:
      if (!qf.has.syntacticModifier(node, ModifierFlags.Export)) return ModuleInstanceState.NonInstantiated;
      break;
    case Syntax.ExportDeclaration:
      const exportDeclaration = node as qt.ExportDeclaration;
      if (!exportDeclaration.moduleSpecifier && exportDeclaration.exportClause && exportDeclaration.exportClause.kind === Syntax.NamedExports) {
        let state = ModuleInstanceState.NonInstantiated;
        for (const spec of exportDeclaration.exportClause.elems) {
          const specState = getModuleInstanceStateForAliasTarget(spec, visited);
          if (specState > state) {
            state = specState;
          }
          if (state === ModuleInstanceState.Instantiated) return state;
        }
        return state;
      }
      break;
    case Syntax.ModuleBlock: {
      let state = ModuleInstanceState.NonInstantiated;
      qf.each.child(node, (n) => {
        const childState = getModuleInstanceStateCached(n, visited);
        switch (childState) {
          case ModuleInstanceState.NonInstantiated:
            return;
          case ModuleInstanceState.ConstEnumOnly:
            state = ModuleInstanceState.ConstEnumOnly;
            return;
          case ModuleInstanceState.Instantiated:
            state = ModuleInstanceState.Instantiated;
            return true;
          default:
            qc.assert.never(childState);
        }
      });
      return state;
    }
    case Syntax.ModuleDeclaration:
      return getModuleInstanceState(node as qt.ModuleDeclaration, visited);
    case Syntax.Identifier:
      if ((<qt.Identifier>node).isInDocNamespace) return ModuleInstanceState.NonInstantiated;
  }
  return ModuleInstanceState.Instantiated;
}
function getModuleInstanceStateForAliasTarget(spec: qt.ExportSpecifier, visited: qu.QMap<ModuleInstanceState | undefined>) {
  const name = spec.propertyName || spec.name;
  let p: Node | undefined = spec.parent;
  while (p) {
    if (p.kind === Syntax.Block || p.kind === Syntax.ModuleBlock || p.kind === Syntax.SourceFile) {
      const statements = p.statements;
      let found: ModuleInstanceState | undefined;
      for (const statement of statements) {
        if (qf.is.withName(statement, name)) {
          if (!statement.parent) {
            setParentPointers(p, statement);
          }
          const state = getModuleInstanceStateCached(statement, visited);
          if (found === undefined || state > found) {
            found = state;
          }
          if (found === ModuleInstanceState.Instantiated) return found;
        }
      }
      if (found !== undefined) return found;
    }
    p = p.parent;
  }
  return ModuleInstanceState.Instantiated;
}
const enum ContainerFlags {
  None = 0,
  IsContainer = 1 << 0,
  IsBlockScopedContainer = 1 << 1,
  IsControlFlowContainer = 1 << 2,
  IsFunctionLike = 1 << 3,
  IsFunctionExpression = 1 << 4,
  HasLocals = 1 << 5,
  IsInterface = 1 << 6,
  IsObjectLiteralOrClassExpressionMethod = 1 << 7,
}
function initFlowNode<T extends qt.FlowNode>(node: T) {
  Debug.attachFlowNodeDebugInfo(node);
  return node;
}
const binder = createBinder();
export function bindSourceFile(file: qt.SourceFile, opts: qt.CompilerOpts) {
  performance.mark('beforeBind');
  perfLogger.logStartBindFile('' + file.fileName);
  binder(file, opts);
  perfLogger.logStopBindFile();
  performance.mark('afterBind');
  performance.measure('Bind', 'beforeBind', 'afterBind');
}
function createBinder(): (file: qt.SourceFile, opts: qt.CompilerOpts) => void {
  let file: qt.SourceFile;
  let opts: qt.CompilerOpts;
  let languageVersion: ScriptTarget;
  let parent: Node;
  let container: Node;
  let thisParentContainer: Node;
  let blockScopeContainer: Node;
  let lastContainer: Node;
  let delayedTypeAliases: (DocTypedefTag | qt.DocCallbackTag | qt.DocEnumTag)[];
  let seenThisKeyword: boolean;
  let currentFlow: qt.FlowNode;
  let currentBreakTarget: qt.FlowLabel | undefined;
  let currentContinueTarget: qt.FlowLabel | undefined;
  let currentReturnTarget: qt.FlowLabel | undefined;
  let currentTrueTarget: qt.FlowLabel | undefined;
  let currentFalseTarget: qt.FlowLabel | undefined;
  let currentExceptionTarget: qt.FlowLabel | undefined;
  let preSwitchCaseFlow: qt.FlowNode | undefined;
  let activeLabelList: ActiveLabel | undefined;
  let hasExplicitReturn: boolean;
  let emitFlags: NodeFlags;
  let inStrictMode: boolean;
  let symbolCount = 0;
  let qt.Symbol: new (flags: SymbolFlags, name: qu.__String) => qt.Symbol;
  let classifiableNames: EscapedMap<true>;
  const unreachableFlow: qt.FlowNode = { flags: FlowFlags.Unreachable };
  const reportedUnreachableFlow: qt.FlowNode = { flags: FlowFlags.Unreachable };
  let subtreeTrafoFlags: TrafoFlags = TrafoFlags.None;
  let skipTransformFlagAggregation: boolean;
  function createDiagnosticForNode(node: Node, message: qd.Message, arg0?: string | number, arg1?: string | number, arg2?: string | number): DiagnosticWithLocation {
    return qf.create.diagnosticForNodeInSourceFile(node.sourceFile || file, node, message, arg0, arg1, arg2);
  }
  function bindSourceFile(f: qt.SourceFile, opts: qt.CompilerOpts) {
    file = f;
    opts = opts;
    languageVersion = getEmitScriptTarget(opts);
    inStrictMode = bindInStrictMode(file, opts);
    classifiableNames = qu.createEscapedMap<true>();
    symbolCount = 0;
    skipTransformFlagAggregation = file.isDeclarationFile;
    qt.Symbol = Node.Symbol;
    Debug.attachFlowNodeDebugInfo(unreachableFlow);
    Debug.attachFlowNodeDebugInfo(reportedUnreachableFlow);
    if (!file.locals) {
      bind(file);
      file.symbolCount = symbolCount;
      file.classifiableNames = classifiableNames;
      delayedBindDocTypedefTag();
    }
    file = undefined!;
    opts = undefined!;
    languageVersion = undefined!;
    parent = undefined!;
    container = undefined!;
    thisParentContainer = undefined!;
    blockScopeContainer = undefined!;
    lastContainer = undefined!;
    delayedTypeAliases = undefined!;
    seenThisKeyword = false;
    currentFlow = undefined!;
    currentBreakTarget = undefined;
    currentContinueTarget = undefined;
    currentReturnTarget = undefined;
    currentTrueTarget = undefined;
    currentFalseTarget = undefined;
    currentExceptionTarget = undefined;
    activeLabelList = undefined;
    hasExplicitReturn = false;
    emitFlags = NodeFlags.None;
    subtreeTrafoFlags = TrafoFlags.None;
  }
  return bindSourceFile;
  function bindInStrictMode(file: qt.SourceFile, opts: qt.CompilerOpts): boolean {
    if (getStrictOptionValue(opts, 'alwaysStrict') && !file.isDeclarationFile) return true;
    else return !!file.externalModuleIndicator;
  }
  function newSymbol(flags: SymbolFlags, name: qu.__String): qt.Symbol {
    symbolCount++;
    return new qc.Symbol(flags, name);
  }
  function addDeclarationToSymbol(s: qt.Symbol, node: qt.Declaration, f: SymbolFlags) {
    s.flags |= f;
    node.symbol = s;
    s.declarations = appendIfUnique(s.declarations, node);
    if (f & (SymbolFlags.Class | SymbolFlags.Enum | SymbolFlags.Module | SymbolFlags.Variable) && !s.exports) s.exports = new qc.SymbolTable();
    if (f & (SymbolFlags.Class | SymbolFlags.Interface | SymbolFlags.TypeLiteral | SymbolFlags.ObjectLiteral) && !s.members) s.members = new qc.SymbolTable();
    if (s.constEnumOnlyModule && s.flags & (SymbolFlags.Function | SymbolFlags.Class | SymbolFlags.RegularEnum)) s.constEnumOnlyModule = false;
    if (f & SymbolFlags.Value) s.setValueDeclaration(node);
  }
  function getDeclarationName(node: qt.Declaration): qu.__String | undefined {
    if (node.kind === Syntax.ExportAssignment) return (<qt.ExportAssignment>node).isExportEquals ? InternalSymbol.ExportEquals : InternalSymbol.Default;
    const name = qf.decl.nameOf(node);
    if (name) {
      if (qf.is.ambientModule(node)) {
        const moduleName = qf.get.textOfIdentifierOrLiteral(name as qt.Identifier | qt.StringLiteral);
        return (qf.is.globalScopeAugmentation(<qt.ModuleDeclaration>node) ? '__global' : `"${moduleName}"`) as qu.__String;
      }
      if (name.kind === Syntax.ComputedPropertyName) {
        const nameExpression = name.expression;
        if (qf.is.stringOrNumericLiteralLike(nameExpression)) return qy.get.escUnderscores(nameExpression.text);
        if (qf.is.signedNumericLiteral(nameExpression)) return (Token.toString(nameExpression.operator) + nameExpression.operand.text) as qu.__String;
        qu.assert(qf.is.wellKnownSymbolSyntactically(nameExpression));
        return qu.getPropertyNameForKnownSymbolName(idText((<qt.PropertyAccessExpression>nameExpression).name));
      }
      if (qf.is.wellKnownSymbolSyntactically(name)) return qu.getPropertyNameForKnownSymbolName(idText(name.name));
      if (name.kind === Syntax.PrivateIdentifier) {
        const containingClass = qf.get.containingClass(node);
        if (!containingClass) {
          return;
        }
        const containingClassSymbol = containingClass.symbol;
        return containingClassSymbol.nameForPrivateIdentifier(name.escapedText);
      }
      return qf.is.propertyNameLiteral(name) ? qf.get.escapedTextOfIdentifierOrLiteral(name) : undefined;
    }
    switch (node.kind) {
      case Syntax.Constructor:
        return InternalSymbol.Constructor;
      case Syntax.FunctionTyping:
      case Syntax.CallSignature:
      case Syntax.DocSignature:
        return InternalSymbol.Call;
      case Syntax.ConstructorTyping:
      case Syntax.ConstructSignature:
        return InternalSymbol.New;
      case Syntax.IndexSignature:
        return InternalSymbol.Index;
      case Syntax.ExportDeclaration:
        return InternalSymbol.ExportStar;
      case Syntax.SourceFile:
        return InternalSymbol.ExportEquals;
      case Syntax.BinaryExpression:
        if (qf.get.assignmentDeclarationKind(node as qt.BinaryExpression) === qt.AssignmentDeclarationKind.ModuleExports) return InternalSymbol.ExportEquals;
        fail('Unknown binary declaration kind');
        break;
      case Syntax.DocFunctionTyping:
        return qf.is.doc.constructSignature(node) ? InternalSymbol.New : InternalSymbol.Call;
      case Syntax.Param:
        qu.assert(
          node.parent.kind === Syntax.DocFunctionTyping,
          'Impossible param parent kind',
          () => `parent is: ${(ts as any).SyntaxKind ? (ts as any).SyntaxKind[node.parent.kind] : node.parent.kind}, expected qt.DocFunctionTyping`
        );
        const functionType = <qt.DocFunctionTyping>node.parent;
        const index = functionType.params.indexOf(node as qt.ParamDeclaration);
        return ('arg' + index) as qu.__String;
    }
  }
  function getDisplayName(node: qt.Declaration): string {
    return qf.is.namedDeclaration(node) ? declarationNameToString(node.name) : qy.get.unescUnderscores(Debug.checkDefined(getDeclarationName(node)));
  }
  function declareSymbol(symbolTable: qt.SymbolTable, parent: qt.Symbol | undefined, node: qt.Declaration, includes: SymbolFlags, excludes: SymbolFlags, replaceable?: boolean): qt.Symbol {
    qu.assert(!qf.has.dynamicName(node));
    const isDefaultExport = qf.has.syntacticModifier(node, ModifierFlags.Default) || (node.kind === Syntax.ExportSpecifier && node.name.escapedText === 'default');
    const name = isDefaultExport && parent ? InternalSymbol.Default : getDeclarationName(node);
    let symbol: qt.Symbol | undefined;
    if (name === undefined) {
      symbol = newSymbol(SymbolFlags.None, InternalSymbol.Missing);
    } else {
      symbol = symbolTable.get(name);
      if (includes & SymbolFlags.Classifiable) {
        classifiableNames.set(name, true);
      }
      if (!symbol) {
        symbolTable.set(name, (symbol = newSymbol(SymbolFlags.None, name)));
        if (replaceable) symbol.replaceable = true;
      } else if (replaceable && !symbol.replaceable) {
        return symbol;
      } else if (symbol.flags & excludes) {
        if (symbol.replaceable) {
          symbolTable.set(name, (symbol = newSymbol(SymbolFlags.None, name)));
        } else if (!(includes & SymbolFlags.Variable && symbol.flags & SymbolFlags.Assignment)) {
          if (qf.is.namedDeclaration(node)) {
            node.name.parent = node;
          }
          let message = symbol.flags & SymbolFlags.BlockScopedVariable ? qd.Cannot_redeclare_block_scoped_variable_0 : qd.Duplicate_identifier_0;
          let messageNeedsName = true;
          if (symbol.flags & SymbolFlags.Enum || includes & SymbolFlags.Enum) {
            message = qd.Enum_declarations_can_only_merge_with_namespace_or_other_enum_declarations;
            messageNeedsName = false;
          }
          let multipleDefaultExports = false;
          if (length(symbol.declarations)) {
            if (isDefaultExport) {
              message = qd.A_module_cannot_have_multiple_default_exports;
              messageNeedsName = false;
              multipleDefaultExports = true;
            } else {
              if (symbol.declarations && symbol.declarations.length && node.kind === Syntax.ExportAssignment && !(<qt.ExportAssignment>node).isExportEquals) {
                message = qd.A_module_cannot_have_multiple_default_exports;
                messageNeedsName = false;
                multipleDefaultExports = true;
              }
            }
          }
          const relatedInformation: qd.DiagnosticRelatedInformation[] = [];
          if (
            node.kind === Syntax.TypeAliasDeclaration &&
            qf.is.missing(node.type) &&
            qf.has.syntacticModifier(node, ModifierFlags.Export) &&
            symbol.flags & (SymbolFlags.Alias | SymbolFlags.Type | SymbolFlags.Namespace)
          ) {
            relatedInformation.push(createDiagnosticForNode(node, qd.Did_you_mean_0, `export type { ${qy.get.unescUnderscores(node.name.escapedText)} }`));
          }
          const declarationName = qf.decl.nameOf(node) || node;
          forEach(symbol.declarations, (declaration, index) => {
            const decl = qf.decl.nameOf(declaration) || declaration;
            const diag = createDiagnosticForNode(decl, message, messageNeedsName ? getDisplayName(declaration) : undefined);
            file.bindqd.push(multipleDefaultExports ? addRelatedInfo(diag, createDiagnosticForNode(declarationName, index === 0 ? qd.Another_export_default_is_here : qd.and_here)) : diag);
            if (multipleDefaultExports) {
              relatedInformation.push(createDiagnosticForNode(decl, qd.The_first_export_default_is_here));
            }
          });
          const diag = createDiagnosticForNode(declarationName, message, messageNeedsName ? getDisplayName(node) : undefined);
          file.bindqd.push(addRelatedInfo(diag, ...relatedInformation));
          symbol = newSymbol(SymbolFlags.None, name);
        }
      }
    }
    addDeclarationToSymbol(symbol, node, includes);
    if (symbol.parent) {
      qu.assert(symbol.parent === parent, 'Existing symbol parent should match new one');
    } else symbol.parent = parent;
    return symbol;
  }
  function declareModuleMember(node: qt.Declaration, symbolFlags: SymbolFlags, symbolExcludes: SymbolFlags): qt.Symbol {
    const hasExportModifier = qf.get.combinedModifierFlags(node) & ModifierFlags.Export;
    if (symbolFlags & SymbolFlags.Alias) {
      if (node.kind === Syntax.ExportSpecifier || (node.kind === Syntax.ImportEqualsDeclaration && hasExportModifier))
        return declareSymbol(container.symbol.exports!, container.symbol, node, symbolFlags, symbolExcludes);
      return declareSymbol(container.locals!, undefined, node, symbolFlags, symbolExcludes);
    } else {
      if (qf.is.doc.typeAlias(node)) qu.assert(qf.is.inJSFile(node));
      if ((!qf.is.ambientModule(node) && (hasExportModifier || container.flags & NodeFlags.ExportContext)) || qf.is.doc.typeAlias(node)) {
        if (!container.locals || (qf.has.syntacticModifier(node, ModifierFlags.Default) && !getDeclarationName(node)))
          return declareSymbol(container.symbol.exports!, container.symbol, node, symbolFlags, symbolExcludes);
        const exportKind = symbolFlags & SymbolFlags.Value ? SymbolFlags.ExportValue : 0;
        const local = declareSymbol(container.locals, undefined, node, exportKind, symbolExcludes);
        local.exportSymbol = declareSymbol(container.symbol.exports!, container.symbol, node, symbolFlags, symbolExcludes);
        node.localSymbol = local;
        return local;
      }
      return declareSymbol(container.locals!, undefined, node, symbolFlags, symbolExcludes);
    }
  }
  function bindContainer(node: Node, containerFlags: ContainerFlags) {
    const saveContainer = container;
    const saveThisParentContainer = thisParentContainer;
    const savedBlockScopeContainer = blockScopeContainer;
    if (containerFlags & ContainerFlags.IsContainer) {
      if (node.kind !== Syntax.ArrowFunction) {
        thisParentContainer = container;
      }
      container = blockScopeContainer = node;
      if (containerFlags & ContainerFlags.HasLocals) {
        container.locals = new qc.SymbolTable();
      }
      addToContainerChain(container);
    } else if (containerFlags & ContainerFlags.IsBlockScopedContainer) {
      blockScopeContainer = node;
      blockScopeContainer.locals = undefined;
    }
    if (containerFlags & ContainerFlags.IsControlFlowContainer) {
      const saveCurrentFlow = currentFlow;
      const saveBreakTarget = currentBreakTarget;
      const saveContinueTarget = currentContinueTarget;
      const saveReturnTarget = currentReturnTarget;
      const saveExceptionTarget = currentExceptionTarget;
      const saveActiveLabelList = activeLabelList;
      const saveHasExplicitReturn = hasExplicitReturn;
      const isIIFE =
        containerFlags & ContainerFlags.IsFunctionExpression &&
        !qf.has.syntacticModifier(node, ModifierFlags.Async) &&
        !(<qt.FunctionLikeDeclaration>node).asteriskToken &&
        !!qf.get.immediatelyInvokedFunctionExpression(node);
      if (!isIIFE) {
        currentFlow = initFlowNode({ flags: FlowFlags.Start });
        if (containerFlags & (ContainerFlags.IsFunctionExpression | ContainerFlags.IsObjectLiteralOrClassExpressionMethod)) {
          currentFlow.node = <qt.FunctionExpression | qt.ArrowFunction | qt.MethodDeclaration>node;
        }
      }
      currentReturnTarget =
        isIIFE || node.kind === Syntax.Constructor || (isInJSFile && (node.kind === Syntax.FunctionDeclaration || node.kind === Syntax.FunctionExpression)) ? createBranchLabel() : undefined;
      currentExceptionTarget = undefined;
      currentBreakTarget = undefined;
      currentContinueTarget = undefined;
      activeLabelList = undefined;
      hasExplicitReturn = false;
      bindChildren(node);
      node.flags &= ~NodeFlags.ReachabilityAndEmitFlags;
      if (!(currentFlow.flags & FlowFlags.Unreachable) && containerFlags & ContainerFlags.IsFunctionLike && qf.is.present((<qt.FunctionLikeDeclaration>node).body)) {
        node.flags |= NodeFlags.HasImplicitReturn;
        if (hasExplicitReturn) node.flags |= NodeFlags.HasExplicitReturn;
        (<qt.FunctionLikeDeclaration>node).endFlowNode = currentFlow;
      }
      if (node.kind === Syntax.SourceFile) {
        node.flags |= emitFlags;
      }
      if (currentReturnTarget) {
        addAntecedent(currentReturnTarget, currentFlow);
        currentFlow = finishFlowLabel(currentReturnTarget);
        if (node.kind === Syntax.Constructor || (isInJSFile && (node.kind === Syntax.FunctionDeclaration || node.kind === Syntax.FunctionExpression))) {
          (<qt.FunctionLikeDeclaration>node).returnFlowNode = currentFlow;
        }
      }
      if (!isIIFE) {
        currentFlow = saveCurrentFlow;
      }
      currentBreakTarget = saveBreakTarget;
      currentContinueTarget = saveContinueTarget;
      currentReturnTarget = saveReturnTarget;
      currentExceptionTarget = saveExceptionTarget;
      activeLabelList = saveActiveLabelList;
      hasExplicitReturn = saveHasExplicitReturn;
    } else if (containerFlags & ContainerFlags.IsInterface) {
      seenThisKeyword = false;
      bindChildren(node);
      node.flags = seenThisKeyword ? node.flags | NodeFlags.ContainsThis : node.flags & ~NodeFlags.ContainsThis;
    } else {
      bindChildren(node);
    }
    container = saveContainer;
    thisParentContainer = saveThisParentContainer;
    blockScopeContainer = savedBlockScopeContainer;
  }
  function bindChildren(node: Node): void {
    if (skipTransformFlagAggregation) {
      bindChildrenWorker(node);
    } else if (node.trafoFlags & TrafoFlags.HasComputedFlags) {
      skipTransformFlagAggregation = true;
      bindChildrenWorker(node);
      skipTransformFlagAggregation = false;
      subtreeTrafoFlags |= node.trafoFlags & ~qy.get.trafoFlagsSubtreeExclusions(node.kind);
    } else {
      const savedSubtreeTrafoFlags = subtreeTrafoFlags;
      subtreeTrafoFlags = 0;
      bindChildrenWorker(node);
      subtreeTrafoFlags = savedSubtreeTrafoFlags | qf.calc.trafoFlags(node, subtreeTrafoFlags);
    }
  }
  function bindEachFunctionsFirst(nodes: Nodes<Node> | undefined): void {
    bindEach(nodes, (n) => (n.kind === Syntax.FunctionDeclaration ? bind(n) : undefined));
    bindEach(nodes, (n) => (n.kind !== Syntax.FunctionDeclaration ? bind(n) : undefined));
  }
  function bindEach(nodes: Nodes<Node> | undefined, bindFunction: (node: Node) => void = bind): void {
    if (nodes === undefined) {
      return;
    }
    if (skipTransformFlagAggregation) {
      forEach(nodes, bindFunction);
    } else {
      const savedSubtreeTrafoFlags = subtreeTrafoFlags;
      subtreeTrafoFlags = TrafoFlags.None;
      let nodeArrayFlags = TrafoFlags.None;
      for (const node of nodes) {
        bindFunction(node);
        nodeArrayFlags |= node.trafoFlags & ~TrafoFlags.HasComputedFlags;
      }
      nodes.trafoFlags = nodeArrayFlags | TrafoFlags.HasComputedFlags;
      subtreeTrafoFlags |= savedSubtreeTrafoFlags;
    }
  }
  function bindEachChild(node: Node) {
    qf.each.child(node, bind, bindEach);
  }
  function bindChildrenWorker(node: Node): void {
    if (checkUnreachable(node)) {
      bindEachChild(node);
      bindDoc(node);
      return;
    }
    if (node.kind >= Syntax.FirstStatement && node.kind <= Syntax.LastStatement && !opts.allowUnreachableCode) {
      node.flowNode = currentFlow;
    }
    switch (node.kind) {
      case Syntax.WhileStatement:
        bindWhileStatement(<qt.WhileStatement>node);
        break;
      case Syntax.DoStatement:
        bindDoStatement(<qt.DoStatement>node);
        break;
      case Syntax.ForStatement:
        bindForStatement(<qt.ForStatement>node);
        break;
      case Syntax.ForInStatement:
      case Syntax.ForOfStatement:
        bindForInOrForOfStatement(<qt.ForInOrOfStatement>node);
        break;
      case Syntax.IfStatement:
        bindIfStatement(<qt.IfStatement>node);
        break;
      case Syntax.ReturnStatement:
      case Syntax.ThrowStatement:
        bindReturnOrThrow(<qt.ReturnStatement | qt.ThrowStatement>node);
        break;
      case Syntax.BreakStatement:
      case Syntax.ContinueStatement:
        bindBreakOrContinueStatement(<qt.BreakOrContinueStatement>node);
        break;
      case Syntax.TryStatement:
        bindTryStatement(<qt.TryStatement>node);
        break;
      case Syntax.SwitchStatement:
        bindSwitchStatement(<qt.SwitchStatement>node);
        break;
      case Syntax.CaseBlock:
        bindCaseBlock(<qt.CaseBlock>node);
        break;
      case Syntax.CaseClause:
        bindCaseClause(<qt.CaseClause>node);
        break;
      case Syntax.ExpressionStatement:
        bindExpressionStatement(<qt.ExpressionStatement>node);
        break;
      case Syntax.LabeledStatement:
        bindLabeledStatement(<qt.LabeledStatement>node);
        break;
      case Syntax.PrefixUnaryExpression:
        bindPrefixUnaryExpressionFlow(<qt.PrefixUnaryExpression>node);
        break;
      case Syntax.PostfixUnaryExpression:
        bindPostfixUnaryExpressionFlow(<qt.PostfixUnaryExpression>node);
        break;
      case Syntax.BinaryExpression:
        bindBinaryExpressionFlow(<qt.BinaryExpression>node);
        break;
      case Syntax.DeleteExpression:
        bindDeleteExpressionFlow(<qt.DeleteExpression>node);
        break;
      case Syntax.ConditionalExpression:
        bindConditionalExpressionFlow(<qt.ConditionalExpression>node);
        break;
      case Syntax.VariableDeclaration:
        bindVariableDeclarationFlow(<qt.VariableDeclaration>node);
        break;
      case Syntax.PropertyAccessExpression:
      case Syntax.ElemAccessExpression:
        bindAccessExpressionFlow(<qt.AccessExpression>node);
        break;
      case Syntax.CallExpression:
        bindCallExpressionFlow(<qt.CallExpression>node);
        break;
      case Syntax.NonNullExpression:
        bindNonNullExpressionFlow(<qt.NonNullExpression>node);
        break;
      case Syntax.DocTypedefTag:
      case Syntax.DocCallbackTag:
      case Syntax.DocEnumTag:
        bindDocTypeAlias(node as qt.DocTypedefTag | qt.DocCallbackTag | qt.DocEnumTag);
        break;
      case Syntax.SourceFile: {
        bindEachFunctionsFirst((node as qt.SourceFile).statements);
        bind((node as qt.SourceFile).endOfFileToken);
        break;
      }
      case Syntax.Block:
      case Syntax.ModuleBlock:
        bindEachFunctionsFirst((node as qt.Block).statements);
        break;
      default:
        bindEachChild(node);
        break;
    }
    bindDoc(node);
  }
  function isNarrowingExpression(expr: qt.Expression): boolean {
    switch (expr.kind) {
      case Syntax.Identifier:
      case Syntax.ThisKeyword:
      case Syntax.PropertyAccessExpression:
      case Syntax.ElemAccessExpression:
        return containsNarrowableReference(expr);
      case Syntax.CallExpression:
        return hasNarrowableArg(<qt.CallExpression>expr);
      case Syntax.ParenthesizedExpression:
        return isNarrowingExpression((<qt.ParenthesizedExpression>expr).expression);
      case Syntax.BinaryExpression:
        return isNarrowingBinaryExpression(<qt.BinaryExpression>expr);
      case Syntax.PrefixUnaryExpression:
        return (<qt.PrefixUnaryExpression>expr).operator === Syntax.ExclamationToken && isNarrowingExpression((<qt.PrefixUnaryExpression>expr).operand);
      case Syntax.TypeOfExpression:
        return isNarrowingExpression((<qt.TypeOfExpression>expr).expression);
    }
    return false;
  }
  function isNarrowableReference(expr: qt.Expression): boolean {
    return (
      expr.kind === Syntax.Identifier ||
      expr.kind === Syntax.ThisKeyword ||
      expr.kind === Syntax.SuperKeyword ||
      ((expr.kind === Syntax.PropertyAccessExpression || expr.kind === Syntax.NonNullExpression || expr.kind === Syntax.ParenthesizedExpression) && isNarrowableReference(expr.expression)) ||
      (expr.kind === Syntax.ElemAccessExpression && qf.is.stringOrNumericLiteralLike(expr.argExpression) && isNarrowableReference(expr.expression))
    );
  }
  function containsNarrowableReference(expr: qt.Expression): boolean {
    return isNarrowableReference(expr) || (qf.is.optionalChain(expr) && containsNarrowableReference(expr.expression));
  }
  function hasNarrowableArg(expr: qt.CallExpression) {
    if (expr.args) {
      for (const arg of expr.args) {
        if (containsNarrowableReference(arg)) return true;
      }
    }
    if (expr.expression.kind === Syntax.PropertyAccessExpression && containsNarrowableReference((<qt.PropertyAccessExpression>expr.expression).expression)) return true;
    return false;
  }
  function isNarrowingTypeofOperands(expr1: qt.Expression, expr2: qt.Expression) {
    return expr1.kind === Syntax.TypeOfExpression && isNarrowableOperand(expr1.expression) && qf.is.stringLiteralLike(expr2);
  }
  function isNarrowableInOperands(left: qt.Expression, right: qt.Expression) {
    return qf.is.stringLiteralLike(left) && isNarrowingExpression(right);
  }
  function isNarrowingBinaryExpression(expr: qt.BinaryExpression) {
    switch (expr.operatorToken.kind) {
      case Syntax.EqualsToken:
        return containsNarrowableReference(expr.left);
      case Syntax.Equals2Token:
      case Syntax.ExclamationEqualsToken:
      case Syntax.Equals3Token:
      case Syntax.ExclamationEquals2Token:
        return isNarrowableOperand(expr.left) || isNarrowableOperand(expr.right) || isNarrowingTypeofOperands(expr.right, expr.left) || isNarrowingTypeofOperands(expr.left, expr.right);
      case Syntax.InstanceOfKeyword:
        return isNarrowableOperand(expr.left);
      case Syntax.InKeyword:
        return isNarrowableInOperands(expr.left, expr.right);
      case Syntax.CommaToken:
        return isNarrowingExpression(expr.right);
    }
    return false;
  }
  function isNarrowableOperand(expr: qt.Expression): boolean {
    switch (expr.kind) {
      case Syntax.ParenthesizedExpression:
        return isNarrowableOperand((<qt.ParenthesizedExpression>expr).expression);
      case Syntax.BinaryExpression:
        switch ((<qt.BinaryExpression>expr).operatorToken.kind) {
          case Syntax.EqualsToken:
            return isNarrowableOperand((<qt.BinaryExpression>expr).left);
          case Syntax.CommaToken:
            return isNarrowableOperand((<qt.BinaryExpression>expr).right);
        }
    }
    return containsNarrowableReference(expr);
  }
  function createBranchLabel(): qt.FlowLabel {
    return initFlowNode({ flags: FlowFlags.BranchLabel, antecedents: undefined });
  }
  function createLoopLabel(): qt.FlowLabel {
    return initFlowNode({ flags: FlowFlags.LoopLabel, antecedents: undefined });
  }
  function createReduceLabel(target: qt.FlowLabel, antecedents: qt.FlowNode[], antecedent: qt.FlowNode): qt.FlowReduceLabel {
    return initFlowNode({ flags: FlowFlags.ReduceLabel, target, antecedents, antecedent });
  }
  function setFlowNodeReferenced(flow: qt.FlowNode) {
    flow.flags |= flow.flags & FlowFlags.Referenced ? FlowFlags.Shared : FlowFlags.Referenced;
  }
  function addAntecedent(label: qt.FlowLabel, antecedent: qt.FlowNode): void {
    if (!(antecedent.flags & FlowFlags.Unreachable) && !contains(label.antecedents, antecedent)) {
      (label.antecedents || (label.antecedents = [])).push(antecedent);
      setFlowNodeReferenced(antecedent);
    }
  }
  function createFlowCondition(flags: FlowFlags, antecedent: qt.FlowNode, expression: qt.Expression | undefined): qt.FlowNode {
    if (antecedent.flags & FlowFlags.Unreachable) return antecedent;
    if (!expression) return flags & FlowFlags.TrueCondition ? antecedent : unreachableFlow;
    if (
      ((expression.kind === Syntax.TrueKeyword && flags & FlowFlags.FalseCondition) || (expression.kind === Syntax.FalseKeyword && flags & FlowFlags.TrueCondition)) &&
      !qf.is.expressionOfOptionalChainRoot(expression) &&
      !qf.is.nullishCoalesce(expression.parent)
    ) {
      return unreachableFlow;
    }
    if (!isNarrowingExpression(expression)) return antecedent;
    setFlowNodeReferenced(antecedent);
    return initFlowNode({ flags, antecedent, node: expression });
  }
  function createFlowSwitchClause(antecedent: qt.FlowNode, switchStatement: qt.SwitchStatement, clauseStart: number, clauseEnd: number): qt.FlowNode {
    setFlowNodeReferenced(antecedent);
    return initFlowNode({ flags: FlowFlags.SwitchClause, antecedent, switchStatement, clauseStart, clauseEnd });
  }
  function createFlowMutation(flags: FlowFlags, antecedent: qt.FlowNode, node: qt.Expression | qt.VariableDeclaration | qt.ArrayBindingElem): qt.FlowNode {
    setFlowNodeReferenced(antecedent);
    const result = initFlowNode({ flags, antecedent, node });
    if (currentExceptionTarget) {
      addAntecedent(currentExceptionTarget, result);
    }
    return result;
  }
  function createFlowCall(antecedent: qt.FlowNode, node: qt.CallExpression): qt.FlowNode {
    setFlowNodeReferenced(antecedent);
    return initFlowNode({ flags: FlowFlags.Call, antecedent, node });
  }
  function finishFlowLabel(flow: qt.FlowLabel): qt.FlowNode {
    const antecedents = flow.antecedents;
    if (!antecedents) return unreachableFlow;
    if (antecedents.length === 1) return antecedents[0];
    return flow;
  }
  function isStatementCondition(node: Node) {
    const parent = node.parent;
    switch (parent.kind) {
      case Syntax.IfStatement:
      case Syntax.WhileStatement:
      case Syntax.DoStatement:
        return (<qt.IfStatement | qt.WhileStatement | qt.DoStatement>parent).expression === node;
      case Syntax.ForStatement:
      case Syntax.ConditionalExpression:
        return (<qt.ForStatement | qt.ConditionalExpression>parent).condition === node;
    }
    return false;
  }
  function isLogicalExpression(node: Node) {
    while (true) {
      if (node.kind === Syntax.ParenthesizedExpression) {
        node = (<qt.ParenthesizedExpression>node).expression;
      } else if (node.kind === Syntax.PrefixUnaryExpression && (<qt.PrefixUnaryExpression>node).operator === Syntax.ExclamationToken) {
        node = (<qt.PrefixUnaryExpression>node).operand;
      } else {
        return (
          node.kind === Syntax.BinaryExpression &&
          ((<qt.BinaryExpression>node).operatorToken.kind === Syntax.Ampersand2Token ||
            (<qt.BinaryExpression>node).operatorToken.kind === Syntax.Bar2Token ||
            (<qt.BinaryExpression>node).operatorToken.kind === Syntax.Question2Token)
        );
      }
    }
  }
  function isTopLevelLogicalExpression(node: Node): boolean {
    while (node.parent.kind === Syntax.ParenthesizedExpression || (node.parent.kind === Syntax.PrefixUnaryExpression && node.parent.operator === Syntax.ExclamationToken)) {
      node = node.parent;
    }
    return !isStatementCondition(node) && !isLogicalExpression(node.parent) && !(qf.is.optionalChain(node.parent) && node.parent.expression === node);
  }
  function doWithConditionalBranches<T>(action: (value: T) => void, value: T, trueTarget: qt.FlowLabel, falseTarget: qt.FlowLabel) {
    const savedTrueTarget = currentTrueTarget;
    const savedFalseTarget = currentFalseTarget;
    currentTrueTarget = trueTarget;
    currentFalseTarget = falseTarget;
    action(value);
    currentTrueTarget = savedTrueTarget;
    currentFalseTarget = savedFalseTarget;
  }
  function bindCondition(node: qt.Expression | undefined, trueTarget: qt.FlowLabel, falseTarget: qt.FlowLabel) {
    doWithConditionalBranches(bind, node, trueTarget, falseTarget);
    if (!node || (!isLogicalExpression(node) && !(qf.is.optionalChain(node) && qf.is.outermostOptionalChain(node)))) {
      addAntecedent(trueTarget, createFlowCondition(FlowFlags.TrueCondition, currentFlow, node));
      addAntecedent(falseTarget, createFlowCondition(FlowFlags.FalseCondition, currentFlow, node));
    }
  }
  function bindIterativeStatement(node: qt.Statement, breakTarget: qt.FlowLabel, continueTarget: qt.FlowLabel): void {
    const saveBreakTarget = currentBreakTarget;
    const saveContinueTarget = currentContinueTarget;
    currentBreakTarget = breakTarget;
    currentContinueTarget = continueTarget;
    bind(node);
    currentBreakTarget = saveBreakTarget;
    currentContinueTarget = saveContinueTarget;
  }
  function setContinueTarget(node: Node, target: qt.FlowLabel) {
    let label = activeLabelList;
    while (label && node.parent.kind === Syntax.LabeledStatement) {
      label.continueTarget = target;
      label = label.next;
      node = node.parent;
    }
    return target;
  }
  function bindWhileStatement(node: qt.WhileStatement): void {
    const preWhileLabel = setContinueTarget(node, createLoopLabel());
    const preBodyLabel = createBranchLabel();
    const postWhileLabel = createBranchLabel();
    addAntecedent(preWhileLabel, currentFlow);
    currentFlow = preWhileLabel;
    bindCondition(node.expression, preBodyLabel, postWhileLabel);
    currentFlow = finishFlowLabel(preBodyLabel);
    bindIterativeStatement(node.statement, postWhileLabel, preWhileLabel);
    addAntecedent(preWhileLabel, currentFlow);
    currentFlow = finishFlowLabel(postWhileLabel);
  }
  function bindDoStatement(node: qt.DoStatement): void {
    const preDoLabel = createLoopLabel();
    const preConditionLabel = setContinueTarget(node, createBranchLabel());
    const postDoLabel = createBranchLabel();
    addAntecedent(preDoLabel, currentFlow);
    currentFlow = preDoLabel;
    bindIterativeStatement(node.statement, postDoLabel, preConditionLabel);
    addAntecedent(preConditionLabel, currentFlow);
    currentFlow = finishFlowLabel(preConditionLabel);
    bindCondition(node.expression, preDoLabel, postDoLabel);
    currentFlow = finishFlowLabel(postDoLabel);
  }
  function bindForStatement(node: qt.ForStatement): void {
    const preLoopLabel = setContinueTarget(node, createLoopLabel());
    const preBodyLabel = createBranchLabel();
    const postLoopLabel = createBranchLabel();
    bind(node.initer);
    addAntecedent(preLoopLabel, currentFlow);
    currentFlow = preLoopLabel;
    bindCondition(node.condition, preBodyLabel, postLoopLabel);
    currentFlow = finishFlowLabel(preBodyLabel);
    bindIterativeStatement(node.statement, postLoopLabel, preLoopLabel);
    bind(node.incrementor);
    addAntecedent(preLoopLabel, currentFlow);
    currentFlow = finishFlowLabel(postLoopLabel);
  }
  function bindForInOrForOfStatement(node: qt.ForInOrOfStatement): void {
    const preLoopLabel = setContinueTarget(node, createLoopLabel());
    const postLoopLabel = createBranchLabel();
    bind(node.expression);
    addAntecedent(preLoopLabel, currentFlow);
    currentFlow = preLoopLabel;
    if (node.kind === Syntax.ForOfStatement) {
      bind(node.awaitModifier);
    }
    addAntecedent(postLoopLabel, currentFlow);
    bind(node.initer);
    if (node.initer.kind !== Syntax.VariableDeclarationList) {
      bindAssignmentTargetFlow(node.initer);
    }
    bindIterativeStatement(node.statement, postLoopLabel, preLoopLabel);
    addAntecedent(preLoopLabel, currentFlow);
    currentFlow = finishFlowLabel(postLoopLabel);
  }
  function bindIfStatement(node: qt.IfStatement): void {
    const thenLabel = createBranchLabel();
    const elseLabel = createBranchLabel();
    const postIfLabel = createBranchLabel();
    bindCondition(node.expression, thenLabel, elseLabel);
    currentFlow = finishFlowLabel(thenLabel);
    bind(node.thenStatement);
    addAntecedent(postIfLabel, currentFlow);
    currentFlow = finishFlowLabel(elseLabel);
    bind(node.elseStatement);
    addAntecedent(postIfLabel, currentFlow);
    currentFlow = finishFlowLabel(postIfLabel);
  }
  function bindReturnOrThrow(node: qt.ReturnStatement | qt.ThrowStatement): void {
    bind(node.expression);
    if (node.kind === Syntax.ReturnStatement) {
      hasExplicitReturn = true;
      if (currentReturnTarget) {
        addAntecedent(currentReturnTarget, currentFlow);
      }
    }
    currentFlow = unreachableFlow;
  }
  function findActiveLabel(name: qu.__String) {
    for (let label = activeLabelList; label; label = label.next) {
      if (label.name === name) return label;
    }
    return;
  }
  function bindBreakOrContinueFlow(node: qt.BreakOrContinueStatement, breakTarget: qt.FlowLabel | undefined, continueTarget: qt.FlowLabel | undefined) {
    const flowLabel = node.kind === Syntax.BreakStatement ? breakTarget : continueTarget;
    if (flowLabel) {
      addAntecedent(flowLabel, currentFlow);
      currentFlow = unreachableFlow;
    }
  }
  function bindBreakOrContinueStatement(node: qt.BreakOrContinueStatement): void {
    bind(node.label);
    if (node.label) {
      const activeLabel = findActiveLabel(node.label.escapedText);
      if (activeLabel) {
        activeLabel.referenced = true;
        bindBreakOrContinueFlow(node, activeLabel.breakTarget, activeLabel.continueTarget);
      }
    } else {
      bindBreakOrContinueFlow(node, currentBreakTarget, currentContinueTarget);
    }
  }
  function bindTryStatement(node: qt.TryStatement): void {
    const saveReturnTarget = currentReturnTarget;
    const saveExceptionTarget = currentExceptionTarget;
    const normalExitLabel = createBranchLabel();
    const returnLabel = createBranchLabel();
    let exceptionLabel = createBranchLabel();
    if (node.finallyBlock) {
      currentReturnTarget = returnLabel;
    }
    addAntecedent(exceptionLabel, currentFlow);
    currentExceptionTarget = exceptionLabel;
    bind(node.tryBlock);
    addAntecedent(normalExitLabel, currentFlow);
    if (node.catchClause) {
      currentFlow = finishFlowLabel(exceptionLabel);
      exceptionLabel = createBranchLabel();
      addAntecedent(exceptionLabel, currentFlow);
      currentExceptionTarget = exceptionLabel;
      bind(node.catchClause);
      addAntecedent(normalExitLabel, currentFlow);
    }
    currentReturnTarget = saveReturnTarget;
    currentExceptionTarget = saveExceptionTarget;
    if (node.finallyBlock) {
      const finallyLabel = createBranchLabel();
      finallyLabel.antecedents = concatenate(concatenate(normalExitLabel.antecedents, exceptionLabel.antecedents), returnLabel.antecedents);
      currentFlow = finallyLabel;
      bind(node.finallyBlock);
      if (currentFlow.flags & FlowFlags.Unreachable) {
        currentFlow = unreachableFlow;
      } else {
        if (currentReturnTarget && returnLabel.antecedents) {
          addAntecedent(currentReturnTarget, createReduceLabel(finallyLabel, returnLabel.antecedents, currentFlow));
        }
        currentFlow = normalExitLabel.antecedents ? createReduceLabel(finallyLabel, normalExitLabel.antecedents, currentFlow) : unreachableFlow;
      }
    } else {
      currentFlow = finishFlowLabel(normalExitLabel);
    }
  }
  function bindSwitchStatement(node: qt.SwitchStatement): void {
    const postSwitchLabel = createBranchLabel();
    bind(node.expression);
    const saveBreakTarget = currentBreakTarget;
    const savePreSwitchCaseFlow = preSwitchCaseFlow;
    currentBreakTarget = postSwitchLabel;
    preSwitchCaseFlow = currentFlow;
    bind(node.caseBlock);
    addAntecedent(postSwitchLabel, currentFlow);
    const hasDefault = forEach(node.caseBlock.clauses, (c) => c.kind === Syntax.DefaultClause);
    node.possiblyExhaustive = !hasDefault && !postSwitchLabel.antecedents;
    if (!hasDefault) {
      addAntecedent(postSwitchLabel, createFlowSwitchClause(preSwitchCaseFlow, node, 0, 0));
    }
    currentBreakTarget = saveBreakTarget;
    preSwitchCaseFlow = savePreSwitchCaseFlow;
    currentFlow = finishFlowLabel(postSwitchLabel);
  }
  function bindCaseBlock(node: qt.CaseBlock): void {
    const savedSubtreeTrafoFlags = subtreeTrafoFlags;
    subtreeTrafoFlags = 0;
    const clauses = node.clauses;
    const isNarrowingSwitch = isNarrowingExpression(node.parent.expression);
    let fallthroughFlow = unreachableFlow;
    for (let i = 0; i < clauses.length; i++) {
      const clauseStart = i;
      while (!clauses[i].statements.length && i + 1 < clauses.length) {
        bind(clauses[i]);
        i++;
      }
      const preCaseLabel = createBranchLabel();
      addAntecedent(preCaseLabel, isNarrowingSwitch ? createFlowSwitchClause(preSwitchCaseFlow!, node.parent, clauseStart, i + 1) : preSwitchCaseFlow!);
      addAntecedent(preCaseLabel, fallthroughFlow);
      currentFlow = finishFlowLabel(preCaseLabel);
      const clause = clauses[i];
      bind(clause);
      fallthroughFlow = currentFlow;
      if (!(currentFlow.flags & FlowFlags.Unreachable) && i !== clauses.length - 1 && opts.noFallthroughCasesInSwitch) {
        clause.fallthroughFlowNode = currentFlow;
      }
    }
    clauses.trafoFlags = subtreeTrafoFlags | TrafoFlags.HasComputedFlags;
    subtreeTrafoFlags |= savedSubtreeTrafoFlags;
  }
  function bindCaseClause(node: qt.CaseClause): void {
    const saveCurrentFlow = currentFlow;
    currentFlow = preSwitchCaseFlow!;
    bind(node.expression);
    currentFlow = saveCurrentFlow;
    bindEach(node.statements);
  }
  function bindExpressionStatement(node: qt.ExpressionStatement): void {
    bind(node.expression);
    if (node.expression.kind === Syntax.CallExpression) {
      const call = <qt.CallExpression>node.expression;
      if (qf.is.dottedName(call.expression) && call.expression.kind !== Syntax.SuperKeyword) {
        currentFlow = createFlowCall(currentFlow, call);
      }
    }
  }
  function bindLabeledStatement(node: qt.LabeledStatement): void {
    const postStatementLabel = createBranchLabel();
    activeLabelList = {
      next: activeLabelList,
      name: node.label.escapedText,
      breakTarget: postStatementLabel,
      continueTarget: undefined,
      referenced: false,
    };
    bind(node.label);
    bind(node.statement);
    if (!activeLabelList.referenced && !opts.allowUnusedLabels) {
      errorOrSuggestionOnNode(unusedLabelIsError(opts), node.label, qd.Unused_label);
    }
    activeLabelList = activeLabelList.next;
    addAntecedent(postStatementLabel, currentFlow);
    currentFlow = finishFlowLabel(postStatementLabel);
  }
  function bindDestructuringTargetFlow(node: qt.Expression) {
    if (node.kind === Syntax.BinaryExpression && (<qt.BinaryExpression>node).operatorToken.kind === Syntax.EqualsToken) {
      bindAssignmentTargetFlow((<qt.BinaryExpression>node).left);
    } else {
      bindAssignmentTargetFlow(node);
    }
  }
  function bindAssignmentTargetFlow(node: qt.Expression) {
    if (isNarrowableReference(node)) {
      currentFlow = createFlowMutation(FlowFlags.Assignment, currentFlow, node);
    } else if (node.kind === Syntax.ArrayLiteralExpression) {
      for (const e of (<qt.ArrayLiteralExpression>node).elems) {
        if (e.kind === Syntax.SpreadElem) {
          bindAssignmentTargetFlow((<qt.SpreadElem>e).expression);
        } else {
          bindDestructuringTargetFlow(e);
        }
      }
    } else if (node.kind === Syntax.ObjectLiteralExpression) {
      for (const p of (<qt.ObjectLiteralExpression>node).properties) {
        if (p.kind === Syntax.PropertyAssignment) {
          bindDestructuringTargetFlow(p.initer);
        } else if (p.kind === Syntax.ShorthandPropertyAssignment) {
          bindAssignmentTargetFlow(p.name);
        } else if (p.kind === Syntax.SpreadAssignment) {
          bindAssignmentTargetFlow(p.expression);
        }
      }
    }
  }
  function bindLogicalExpression(node: qt.BinaryExpression, trueTarget: qt.FlowLabel, falseTarget: qt.FlowLabel) {
    const preRightLabel = createBranchLabel();
    if (node.operatorToken.kind === Syntax.Ampersand2Token) {
      bindCondition(node.left, preRightLabel, falseTarget);
    } else {
      bindCondition(node.left, trueTarget, preRightLabel);
    }
    currentFlow = finishFlowLabel(preRightLabel);
    bind(node.operatorToken);
    bindCondition(node.right, trueTarget, falseTarget);
  }
  function bindPrefixUnaryExpressionFlow(node: qt.PrefixUnaryExpression) {
    if (node.operator === Syntax.ExclamationToken) {
      const saveTrueTarget = currentTrueTarget;
      currentTrueTarget = currentFalseTarget;
      currentFalseTarget = saveTrueTarget;
      bindEachChild(node);
      currentFalseTarget = currentTrueTarget;
      currentTrueTarget = saveTrueTarget;
    } else {
      bindEachChild(node);
      if (node.operator === Syntax.Plus2Token || node.operator === Syntax.Minus2Token) {
        bindAssignmentTargetFlow(node.operand);
      }
    }
  }
  function bindPostfixUnaryExpressionFlow(node: qt.PostfixUnaryExpression) {
    bindEachChild(node);
    if (node.operator === Syntax.Plus2Token || node.operator === Syntax.Minus2Token) {
      bindAssignmentTargetFlow(node.operand);
    }
  }
  const enum BindBinaryExpressionFlowState {
    BindThenBindChildren,
    MaybeBindLeft,
    BindToken,
    BindRight,
    FinishBind,
  }
  function bindBinaryExpressionFlow(node: qt.BinaryExpression) {
    const workStacks: {
      expr: qt.BinaryExpression[];
      state: BindBinaryExpressionFlowState[];
      inStrictMode: (boolean | undefined)[];
      parent: (Node | undefined)[];
      subtreeFlags: (number | undefined)[];
    } = {
      expr: [node],
      state: [BindBinaryExpressionFlowState.MaybeBindLeft],
      inStrictMode: [undefined],
      parent: [undefined],
      subtreeFlags: [undefined],
    };
    let stackIndex = 0;
    while (stackIndex >= 0) {
      node = workStacks.expr[stackIndex];
      switch (workStacks.state[stackIndex]) {
        case BindBinaryExpressionFlowState.BindThenBindChildren: {
          node.parent = parent;
          const saveInStrictMode = inStrictMode;
          bindWorker(node);
          const saveParent = parent;
          parent = node;
          let subtreeFlagsState: number | undefined;
          if (skipTransformFlagAggregation) {
          } else if (node.trafoFlags & TrafoFlags.HasComputedFlags) {
            skipTransformFlagAggregation = true;
            subtreeFlagsState = -1;
          } else {
            const savedSubtreeTrafoFlags = subtreeTrafoFlags;
            subtreeTrafoFlags = 0;
            subtreeFlagsState = savedSubtreeTrafoFlags;
          }
          advanceState(BindBinaryExpressionFlowState.MaybeBindLeft, saveInStrictMode, saveParent, subtreeFlagsState);
          break;
        }
        case BindBinaryExpressionFlowState.MaybeBindLeft: {
          const operator = node.operatorToken.kind;
          if (operator === Syntax.Ampersand2Token || operator === Syntax.Bar2Token || operator === Syntax.Question2Token) {
            if (isTopLevelLogicalExpression(node)) {
              const postExpressionLabel = createBranchLabel();
              bindLogicalExpression(node, postExpressionLabel, postExpressionLabel);
              currentFlow = finishFlowLabel(postExpressionLabel);
            } else {
              bindLogicalExpression(node, currentTrueTarget!, currentFalseTarget!);
            }
            completeNode();
          } else {
            advanceState(BindBinaryExpressionFlowState.BindToken);
            maybeBind(node.left);
          }
          break;
        }
        case BindBinaryExpressionFlowState.BindToken: {
          advanceState(BindBinaryExpressionFlowState.BindRight);
          maybeBind(node.operatorToken);
          break;
        }
        case BindBinaryExpressionFlowState.BindRight: {
          advanceState(BindBinaryExpressionFlowState.FinishBind);
          maybeBind(node.right);
          break;
        }
        case BindBinaryExpressionFlowState.FinishBind: {
          const operator = node.operatorToken.kind;
          if (qy.is.assignmentOperator(operator) && !qf.is.assignmentTarget(node)) {
            bindAssignmentTargetFlow(node.left);
            if (operator === Syntax.EqualsToken && node.left.kind === Syntax.ElemAccessExpression) {
              const elemAccess = <qt.ElemAccessExpression>node.left;
              if (isNarrowableOperand(elemAccess.expression)) {
                currentFlow = createFlowMutation(FlowFlags.ArrayMutation, currentFlow, node);
              }
            }
          }
          completeNode();
          break;
        }
        default:
          return fail(`Invalid state ${workStacks.state[stackIndex]} for bindBinaryExpressionFlow`);
      }
    }
    function advanceState(state: BindBinaryExpressionFlowState, isInStrictMode?: boolean, parent?: Node, subtreeFlags?: number) {
      workStacks.state[stackIndex] = state;
      if (isInStrictMode !== undefined) {
        workStacks.inStrictMode[stackIndex] = isInStrictMode;
      }
      if (parent !== undefined) {
        workStacks.parent[stackIndex] = parent;
      }
      if (subtreeFlags !== undefined) {
        workStacks.subtreeFlags[stackIndex] = subtreeFlags;
      }
    }
    function completeNode() {
      if (workStacks.inStrictMode[stackIndex] !== undefined) {
        if (workStacks.subtreeFlags[stackIndex] === -1) {
          skipTransformFlagAggregation = false;
          subtreeTrafoFlags |= node.trafoFlags & ~qy.get.trafoFlagsSubtreeExclusions(node.kind);
        } else if (workStacks.subtreeFlags[stackIndex] !== undefined) {
          subtreeTrafoFlags = workStacks.subtreeFlags[stackIndex]! | qf.calc.trafoFlags(node, subtreeTrafoFlags);
        }
        inStrictMode = workStacks.inStrictMode[stackIndex]!;
        parent = workStacks.parent[stackIndex]!;
      }
      stackIndex--;
    }
    function maybeBind(node: Node) {
      if (node && node.kind === Syntax.BinaryExpression) {
        stackIndex++;
        workStacks.expr[stackIndex] = node;
        workStacks.state[stackIndex] = BindBinaryExpressionFlowState.BindThenBindChildren;
        workStacks.inStrictMode[stackIndex] = undefined;
        workStacks.parent[stackIndex] = undefined;
        workStacks.subtreeFlags[stackIndex] = undefined;
      } else {
        bind(node);
      }
    }
  }
  function bindDeleteExpressionFlow(node: qt.DeleteExpression) {
    bindEachChild(node);
    if (node.expression.kind === Syntax.PropertyAccessExpression) {
      bindAssignmentTargetFlow(node.expression);
    }
  }
  function bindConditionalExpressionFlow(node: qt.ConditionalExpression) {
    const trueLabel = createBranchLabel();
    const falseLabel = createBranchLabel();
    const postExpressionLabel = createBranchLabel();
    bindCondition(node.condition, trueLabel, falseLabel);
    currentFlow = finishFlowLabel(trueLabel);
    bind(node.questionToken);
    bind(node.whenTrue);
    addAntecedent(postExpressionLabel, currentFlow);
    currentFlow = finishFlowLabel(falseLabel);
    bind(node.colonToken);
    bind(node.whenFalse);
    addAntecedent(postExpressionLabel, currentFlow);
    currentFlow = finishFlowLabel(postExpressionLabel);
  }
  function bindInitializedVariableFlow(node: qt.VariableDeclaration | qt.ArrayBindingElem) {
    const name = node.kind !== Syntax.OmittedExpression ? node.name : undefined;
    if (name.kind === Syntax.BindingPattern) {
      for (const child of name.elems) {
        bindInitializedVariableFlow(child);
      }
    } else {
      currentFlow = createFlowMutation(FlowFlags.Assignment, currentFlow, node);
    }
  }
  function bindVariableDeclarationFlow(node: qt.VariableDeclaration) {
    bindEachChild(node);
    if (node.initer || qf.check.forInOrOfStatement(node.parent.parent)) {
      bindInitializedVariableFlow(node);
    }
  }
  function bindDocTypeAlias(node: qt.DocTypedefTag | qt.DocCallbackTag | qt.DocEnumTag) {
    node.tagName.parent = node;
    if (node.kind !== Syntax.DocEnumTag && node.fullName) {
      setParentPointers(node, node.fullName);
    }
  }
  function bindDocClassTag(node: qt.DocClassTag) {
    bindEachChild(node);
    const host = qf.get.hostSignatureFromDoc(node);
    if (host && host.kind !== Syntax.MethodDeclaration) {
      addDeclarationToSymbol(host.symbol, host, SymbolFlags.Class);
    }
  }
  function bindOptionalExpression(node: qt.Expression, trueTarget: qt.FlowLabel, falseTarget: qt.FlowLabel) {
    doWithConditionalBranches(bind, node, trueTarget, falseTarget);
    if (!qf.is.optionalChain(node) || qf.is.outermostOptionalChain(node)) {
      addAntecedent(trueTarget, createFlowCondition(FlowFlags.TrueCondition, currentFlow, node));
      addAntecedent(falseTarget, createFlowCondition(FlowFlags.FalseCondition, currentFlow, node));
    }
  }
  function bindOptionalChainRest(node: qt.OptionalChain) {
    switch (node.kind) {
      case Syntax.PropertyAccessExpression:
        bind(node.questionDotToken);
        bind(node.name);
        break;
      case Syntax.ElemAccessExpression:
        bind(node.questionDotToken);
        bind(node.argExpression);
        break;
      case Syntax.CallExpression:
        bind(node.questionDotToken);
        bindEach(node.typeArgs);
        bindEach(node.args);
        break;
    }
  }
  function bindOptionalChain(node: qt.OptionalChain, trueTarget: qt.FlowLabel, falseTarget: qt.FlowLabel) {
    const preChainLabel = qf.is.optionalChainRoot(node) ? createBranchLabel() : undefined;
    bindOptionalExpression(node.expression, preChainLabel || trueTarget, falseTarget);
    if (preChainLabel) {
      currentFlow = finishFlowLabel(preChainLabel);
    }
    doWithConditionalBranches(bindOptionalChainRest, node, trueTarget, falseTarget);
    if (qf.is.outermostOptionalChain(node)) {
      addAntecedent(trueTarget, createFlowCondition(FlowFlags.TrueCondition, currentFlow, node));
      addAntecedent(falseTarget, createFlowCondition(FlowFlags.FalseCondition, currentFlow, node));
    }
  }
  function bindOptionalChainFlow(node: qt.OptionalChain) {
    if (isTopLevelLogicalExpression(node)) {
      const postExpressionLabel = createBranchLabel();
      bindOptionalChain(node, postExpressionLabel, postExpressionLabel);
      currentFlow = finishFlowLabel(postExpressionLabel);
    } else {
      bindOptionalChain(node, currentTrueTarget!, currentFalseTarget!);
    }
  }
  function bindNonNullExpressionFlow(node: qt.NonNullExpression | qt.NonNullChain) {
    if (qf.is.optionalChain(node)) {
      bindOptionalChainFlow(node);
    } else {
      bindEachChild(node);
    }
  }
  function bindAccessExpressionFlow(node: qt.AccessExpression | qt.PropertyAccessChain | qt.ElemAccessChain) {
    if (qf.is.optionalChain(node)) {
      bindOptionalChainFlow(node);
    } else {
      bindEachChild(node);
    }
  }
  function bindCallExpressionFlow(node: qt.CallExpression | qt.CallChain) {
    if (qf.is.optionalChain(node)) {
      bindOptionalChainFlow(node);
    } else {
      const expr = qf.skip.parentheses(node.expression);
      if (expr.kind === Syntax.FunctionExpression || expr.kind === Syntax.ArrowFunction) {
        bindEach(node.typeArgs);
        bindEach(node.args);
        bind(node.expression);
      } else {
        bindEachChild(node);
        if (node.expression.kind === Syntax.SuperKeyword) {
          currentFlow = createFlowCall(currentFlow, node);
        }
      }
    }
    if (node.expression.kind === Syntax.PropertyAccessExpression) {
      const propertyAccess = <qt.PropertyAccessExpression>node.expression;
      if (propertyAccess.name.kind === Syntax.Identifier && isNarrowableOperand(propertyAccess.expression) && qf.is.pushOrUnshiftIdentifier(propertyAccess.name)) {
        currentFlow = createFlowMutation(FlowFlags.ArrayMutation, currentFlow, node);
      }
    }
  }
  function getContainerFlags(node: Node): ContainerFlags {
    switch (node.kind) {
      case Syntax.ClassExpression:
      case Syntax.ClassDeclaration:
      case Syntax.EnumDeclaration:
      case Syntax.ObjectLiteralExpression:
      case Syntax.TypingLiteral:
      case Syntax.DocTypingLiteral:
      case Syntax.JsxAttributes:
        return ContainerFlags.IsContainer;
      case Syntax.InterfaceDeclaration:
        return ContainerFlags.IsContainer | ContainerFlags.IsInterface;
      case Syntax.ModuleDeclaration:
      case Syntax.TypeAliasDeclaration:
      case Syntax.MappedTyping:
        return ContainerFlags.IsContainer | ContainerFlags.HasLocals;
      case Syntax.SourceFile:
        return ContainerFlags.IsContainer | ContainerFlags.IsControlFlowContainer | ContainerFlags.HasLocals;
      case Syntax.MethodDeclaration:
        if (qf.is.objectLiteralOrClassExpressionMethod(node))
          return ContainerFlags.IsContainer | ContainerFlags.IsControlFlowContainer | ContainerFlags.HasLocals | ContainerFlags.IsFunctionLike | ContainerFlags.IsObjectLiteralOrClassExpressionMethod;
      case Syntax.Constructor:
      case Syntax.FunctionDeclaration:
      case Syntax.MethodSignature:
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
      case Syntax.CallSignature:
      case Syntax.DocSignature:
      case Syntax.DocFunctionTyping:
      case Syntax.FunctionTyping:
      case Syntax.ConstructSignature:
      case Syntax.IndexSignature:
      case Syntax.ConstructorTyping:
        return ContainerFlags.IsContainer | ContainerFlags.IsControlFlowContainer | ContainerFlags.HasLocals | ContainerFlags.IsFunctionLike;
      case Syntax.FunctionExpression:
      case Syntax.ArrowFunction:
        return ContainerFlags.IsContainer | ContainerFlags.IsControlFlowContainer | ContainerFlags.HasLocals | ContainerFlags.IsFunctionLike | ContainerFlags.IsFunctionExpression;
      case Syntax.ModuleBlock:
        return ContainerFlags.IsControlFlowContainer;
      case Syntax.PropertyDeclaration:
        return (<qt.PropertyDeclaration>node).initer ? ContainerFlags.IsControlFlowContainer : 0;
      case Syntax.CatchClause:
      case Syntax.ForStatement:
      case Syntax.ForInStatement:
      case Syntax.ForOfStatement:
      case Syntax.CaseBlock:
        return ContainerFlags.IsBlockScopedContainer;
      case Syntax.Block:
        return qf.is.functionLike(node.parent) ? ContainerFlags.None : ContainerFlags.IsBlockScopedContainer;
    }
    return ContainerFlags.None;
  }
  function addToContainerChain(next: Node) {
    if (lastContainer) {
      lastContainer.nextContainer = next;
    }
    lastContainer = next;
  }
  function declareSymbolAndAddToSymbolTable(node: qt.Declaration, symbolFlags: SymbolFlags, symbolExcludes: SymbolFlags): qt.Symbol | undefined {
    switch (container.kind) {
      case Syntax.ModuleDeclaration:
        return declareModuleMember(node, symbolFlags, symbolExcludes);
      case Syntax.SourceFile:
        return declareSourceFileMember(node, symbolFlags, symbolExcludes);
      case Syntax.ClassExpression:
      case Syntax.ClassDeclaration:
        return declareClassMember(node, symbolFlags, symbolExcludes);
      case Syntax.EnumDeclaration:
        return declareSymbol(container.symbol.exports!, container.symbol, node, symbolFlags, symbolExcludes);
      case Syntax.TypingLiteral:
      case Syntax.DocTypingLiteral:
      case Syntax.ObjectLiteralExpression:
      case Syntax.InterfaceDeclaration:
      case Syntax.JsxAttributes:
        return declareSymbol(container.symbol.members!, container.symbol, node, symbolFlags, symbolExcludes);
      case Syntax.FunctionTyping:
      case Syntax.ConstructorTyping:
      case Syntax.CallSignature:
      case Syntax.ConstructSignature:
      case Syntax.DocSignature:
      case Syntax.IndexSignature:
      case Syntax.MethodDeclaration:
      case Syntax.MethodSignature:
      case Syntax.Constructor:
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
      case Syntax.FunctionDeclaration:
      case Syntax.FunctionExpression:
      case Syntax.ArrowFunction:
      case Syntax.DocFunctionTyping:
      case Syntax.DocTypedefTag:
      case Syntax.DocCallbackTag:
      case Syntax.TypeAliasDeclaration:
      case Syntax.MappedTyping:
        return declareSymbol(container.locals!, undefined, node, symbolFlags, symbolExcludes);
    }
  }
  function declareClassMember(node: qt.Declaration, symbolFlags: SymbolFlags, symbolExcludes: SymbolFlags) {
    return qf.has.syntacticModifier(node, ModifierFlags.Static)
      ? declareSymbol(container.symbol.exports!, container.symbol, node, symbolFlags, symbolExcludes)
      : declareSymbol(container.symbol.members!, container.symbol, node, symbolFlags, symbolExcludes);
  }
  function declareSourceFileMember(node: qt.Declaration, symbolFlags: SymbolFlags, symbolExcludes: SymbolFlags) {
    return qf.is.externalModule(file) ? declareModuleMember(node, symbolFlags, symbolExcludes) : declareSymbol(file.locals!, undefined, node, symbolFlags, symbolExcludes);
  }
  function hasExportDeclarations(node: qt.ModuleDeclaration | qt.SourceFile): boolean {
    const body = node.kind === Syntax.SourceFile ? node : qu.tryCast(node.body, isModuleBlock);
    return !!body && body.statements.some((s) => s.kind === Syntax.ExportDeclaration || s.kind === Syntax.ExportAssignment);
  }
  function setExportContextFlag(node: qt.ModuleDeclaration | qt.SourceFile) {
    if (node.flags & NodeFlags.Ambient && !hasExportDeclarations(node)) {
      node.flags |= NodeFlags.ExportContext;
    } else {
      node.flags &= ~NodeFlags.ExportContext;
    }
  }
  function bindModuleDeclaration(node: qt.ModuleDeclaration) {
    setExportContextFlag(node);
    if (qf.is.ambientModule(node)) {
      if (qf.has.syntacticModifier(node, ModifierFlags.Export)) {
        errorOnFirstToken(node, qd.export_modifier_cannot_be_applied_to_ambient_modules_and_module_augmentations_since_they_are_always_visible);
      }
      if (qf.is.moduleAugmentationExternal(node)) {
        declareModuleSymbol(node);
      } else {
        let pattern: Pattern | undefined;
        if (node.name.kind === Syntax.StringLiteral) {
          const { text } = node.name;
          if (qy.hasAsterisks(text)) {
            pattern = tryParsePattern(text);
          } else {
            errorOnFirstToken(node.name, qd.Pattern_0_can_have_at_most_one_Asterisk_character, text);
          }
        }
        const symbol = declareSymbolAndAddToSymbolTable(node, SymbolFlags.ValueModule, SymbolFlags.ValueModuleExcludes)!;
        file.patternAmbientModules = append<qt.PatternAmbientModule>(file.patternAmbientModules, pattern && { pattern, symbol });
      }
    } else {
      const state = declareModuleSymbol(node);
      if (state !== ModuleInstanceState.NonInstantiated) {
        const { symbol } = node;
        symbol.constEnumOnlyModule =
          !(symbol.flags & (SymbolFlags.Function | SymbolFlags.Class | SymbolFlags.RegularEnum)) && state === ModuleInstanceState.ConstEnumOnly && symbol.constEnumOnlyModule !== false;
      }
    }
  }
  function declareModuleSymbol(node: qt.ModuleDeclaration): ModuleInstanceState {
    const state = getModuleInstanceState(node);
    const instantiated = state !== ModuleInstanceState.NonInstantiated;
    declareSymbolAndAddToSymbolTable(node, instantiated ? SymbolFlags.ValueModule : SymbolFlags.NamespaceModule, instantiated ? SymbolFlags.ValueModuleExcludes : SymbolFlags.NamespaceModuleExcludes);
    return state;
  }
  function bindFunctionOrConstructorType(node: qt.SignatureDeclaration | qt.DocSignature): void {
    const symbol = newSymbol(SymbolFlags.Signature, getDeclarationName(node)!);
    addDeclarationToSymbol(symbol, node, SymbolFlags.Signature);
    const typeLiteralSymbol = newSymbol(SymbolFlags.TypeLiteral, InternalSymbol.Type);
    addDeclarationToSymbol(typeLiteralSymbol, node, SymbolFlags.TypeLiteral);
    typeLiteralSymbol.members = new qc.SymbolTable();
    typeLiteralSymbol.members.set(symbol.escName, symbol);
  }
  function bindObjectLiteralExpression(node: qt.ObjectLiteralExpression) {
    const enum ElemKind {
      Property = 1,
      Accessor = 2,
    }
    if (inStrictMode && !qf.is.assignmentTarget(node)) {
      const seen = qu.createEscapedMap<ElemKind>();
      for (const prop of node.properties) {
        if (prop.kind === Syntax.SpreadAssignment || prop.name.kind !== Syntax.Identifier) {
          continue;
        }
        const identifier = prop.name;
        const currentKind =
          prop.kind === Syntax.PropertyAssignment || prop.kind === Syntax.ShorthandPropertyAssignment || prop.kind === Syntax.MethodDeclaration ? ElemKind.Property : ElemKind.Accessor;
        const existingKind = seen.get(identifier.escapedText);
        if (!existingKind) {
          seen.set(identifier.escapedText, currentKind);
          continue;
        }
        if (currentKind === ElemKind.Property && existingKind === ElemKind.Property) {
          const span = qf.get.errorSpanForNode(file, identifier);
          file.bindqd.push(qf.create.fileDiagnostic(file, span.start, span.length, qd.An_object_literal_cannot_have_multiple_properties_with_the_same_name_in_strict_mode));
        }
      }
    }
    return bindAnonymousDeclaration(node, SymbolFlags.ObjectLiteral, InternalSymbol.Object);
  }
  function bindJsxAttributes(node: qt.JsxAttributes) {
    return bindAnonymousDeclaration(node, SymbolFlags.ObjectLiteral, InternalSymbol.JSXAttributes);
  }
  function bindJsxAttribute(node: qt.JsxAttribute, symbolFlags: SymbolFlags, symbolExcludes: SymbolFlags) {
    return declareSymbolAndAddToSymbolTable(node, symbolFlags, symbolExcludes);
  }
  function bindAnonymousDeclaration(node: qt.Declaration, symbolFlags: SymbolFlags, name: qu.__String) {
    const symbol = newSymbol(symbolFlags, name);
    if (symbolFlags & (SymbolFlags.EnumMember | SymbolFlags.ClassMember)) {
      symbol.parent = container.symbol;
    }
    addDeclarationToSymbol(symbol, node, symbolFlags);
    return symbol;
  }
  function bindBlockScopedDeclaration(node: qt.Declaration, symbolFlags: SymbolFlags, symbolExcludes: SymbolFlags) {
    switch (blockScopeContainer.kind) {
      case Syntax.ModuleDeclaration:
        declareModuleMember(node, symbolFlags, symbolExcludes);
        break;
      case Syntax.SourceFile:
        if (qf.is.externalOrCommonJsModule(<qt.SourceFile>container)) {
          declareModuleMember(node, symbolFlags, symbolExcludes);
          break;
        }
      default:
        if (!blockScopeContainer.locals) {
          blockScopeContainer.locals = new qc.SymbolTable();
          addToContainerChain(blockScopeContainer);
        }
        declareSymbol(blockScopeContainer.locals, undefined, node, symbolFlags, symbolExcludes);
    }
  }
  function delayedBindDocTypedefTag() {
    if (!delayedTypeAliases) {
      return;
    }
    const saveContainer = container;
    const saveLastContainer = lastContainer;
    const saveBlockScopeContainer = blockScopeContainer;
    const saveParent = parent;
    const saveCurrentFlow = currentFlow;
    for (const typeAlias of delayedTypeAliases) {
      const host = qc.getDoc.host(typeAlias);
      container = qc.findAncestor(host.parent, (n) => !!(getContainerFlags(n) & ContainerFlags.IsContainer)) || file;
      blockScopeContainer = qf.get.enclosingBlockScopeContainer(host) || file;
      currentFlow = initFlowNode({ flags: FlowFlags.Start });
      parent = typeAlias;
      bind(typeAlias.typeExpression);
      const declName = qf.decl.nameOf(typeAlias);
      if ((typeAlias.kind === Syntax.DocEnumTag || !typeAlias.fullName) && declName && qf.is.propertyAccessEntityNameExpression(declName.parent)) {
        const isTopLevel = isTopLevelNamespaceAssignment(declName.parent);
        if (isTopLevel) {
          bindPotentiallyMissingNamespaces(
            file.symbol,
            declName.parent,
            isTopLevel,
            !!qc.findAncestor(declName, (d) => d.kind === Syntax.PropertyAccessExpression && d.name.escapedText === 'prototype'),
            false
          );
          const oldContainer = container;
          switch (qf.get.assignmentDeclarationPropertyAccessKind(declName.parent)) {
            case qt.AssignmentDeclarationKind.ExportsProperty:
            case qt.AssignmentDeclarationKind.ModuleExports:
              if (!qf.is.externalOrCommonJsModule(file)) {
                container = undefined!;
              } else {
                container = file;
              }
              break;
            case qt.AssignmentDeclarationKind.ThisProperty:
              container = declName.parent.expression;
              break;
            case qt.AssignmentDeclarationKind.PrototypeProperty:
              container = (declName.parent.expression as qt.PropertyAccessExpression).name;
              break;
            case qt.AssignmentDeclarationKind.Property:
              container = isExportsOrModuleExportsOrAlias(file, declName.parent.expression)
                ? file
                : declName.parent.expression.kind === Syntax.PropertyAccessExpression
                ? declName.parent.expression.name
                : declName.parent.expression;
              break;
            case qt.AssignmentDeclarationKind.None:
              return fail("Shouldn't have detected typedef or enum on non-assignment declaration");
          }
          if (container) {
            declareModuleMember(typeAlias, SymbolFlags.TypeAlias, SymbolFlags.TypeAliasExcludes);
          }
          container = oldContainer;
        }
      } else if (typeAlias.kind === Syntax.DocEnumTag || !typeAlias.fullName || typeAlias.fullName.kind === Syntax.Identifier) {
        parent = typeAlias.parent;
        bindBlockScopedDeclaration(typeAlias, SymbolFlags.TypeAlias, SymbolFlags.TypeAliasExcludes);
      } else {
        bind(typeAlias.fullName);
      }
    }
    container = saveContainer;
    lastContainer = saveLastContainer;
    blockScopeContainer = saveBlockScopeContainer;
    parent = saveParent;
    currentFlow = saveCurrentFlow;
  }
  function checkStrictModeIdentifier(node: qt.Identifier) {
    if (
      inStrictMode &&
      node.originalKeywordKind! >= Syntax.FirstFutureReservedWord &&
      node.originalKeywordKind! <= Syntax.LastFutureReservedWord &&
      !qf.is.identifierName(node) &&
      !(node.flags & NodeFlags.Ambient) &&
      !(node.flags & NodeFlags.Doc)
    ) {
      if (!file.parseqd.length) {
        file.bindqd.push(createDiagnosticForNode(node, getStrictModeIdentifierMessage(node), declarationNameToString(node)));
      }
    }
  }
  function getStrictModeIdentifierMessage(node: Node) {
    if (qf.get.containingClass(node)) return qd.Identifier_expected_0_is_a_reserved_word_in_strict_mode_Class_definitions_are_automatically_in_strict_mode;
    if (file.externalModuleIndicator) return qd.Identifier_expected_0_is_a_reserved_word_in_strict_mode_Modules_are_automatically_in_strict_mode;
    return qd.Identifier_expected_0_is_a_reserved_word_in_strict_mode;
  }
  function checkPrivateIdentifier(node: qt.PrivateIdentifier) {
    if (node.escapedText === '#constructor') {
      if (!file.parseqd.length) {
        file.bindqd.push(createDiagnosticForNode(node, qd.constructor_is_a_reserved_word, declarationNameToString(node)));
      }
    }
  }
  function checkStrictModeBinaryExpression(node: qt.BinaryExpression) {
    if (inStrictMode && qf.is.leftHandSideExpression(node.left) && qy.is.assignmentOperator(node.operatorToken.kind)) {
      checkStrictModeEvalOrArgs(node, <qt.Identifier>node.left);
    }
  }
  function checkStrictModeCatchClause(node: qt.CatchClause) {
    if (inStrictMode && node.variableDeclaration) {
      checkStrictModeEvalOrArgs(node, node.variableDeclaration.name);
    }
  }
  function checkStrictModeDeleteExpression(node: qt.DeleteExpression) {
    if (inStrictMode && node.expression.kind === Syntax.Identifier) {
      const span = qf.get.errorSpanForNode(file, node.expression);
      file.bindqd.push(qf.create.fileDiagnostic(file, span.start, span.length, qd.delete_cannot_be_called_on_an_identifier_in_strict_mode));
    }
  }
  function isEvalOrArgsIdentifier(node: Node): boolean {
    return node.kind === Syntax.Identifier && (node.escapedText === 'eval' || node.escapedText === 'args');
  }
  function checkStrictModeEvalOrArgs(contextNode: Node, name: Node | undefined) {
    if (name && name.kind === Syntax.Identifier) {
      const identifier = <qt.Identifier>name;
      if (isEvalOrArgsIdentifier(identifier)) {
        const span = qf.get.errorSpanForNode(file, name);
        file.bindqd.push(qf.create.fileDiagnostic(file, span.start, span.length, getStrictModeEvalOrArgsMessage(contextNode), idText(identifier)));
      }
    }
  }
  function getStrictModeEvalOrArgsMessage(node: Node) {
    if (qf.get.containingClass(node)) return qd.Invalid_use_of_0_Class_definitions_are_automatically_in_strict_mode;
    if (file.externalModuleIndicator) return qd.Invalid_use_of_0_Modules_are_automatically_in_strict_mode;
    return qd.Invalid_use_of_0_in_strict_mode;
  }
  function checkStrictModeFunctionName(node: qt.FunctionLikeDeclaration) {
    if (inStrictMode) {
      checkStrictModeEvalOrArgs(node, node.name);
    }
  }
  function getStrictModeBlockScopeFunctionDeclarationMessage(node: Node) {
    if (qf.get.containingClass(node)) return qd.Function_declarations_are_not_allowed_inside_blocks_in_strict_mode_when_targeting_ES3_or_ES5_Class_definitions_are_automatically_in_strict_mode;
    if (file.externalModuleIndicator) return qd.Function_declarations_are_not_allowed_inside_blocks_in_strict_mode_when_targeting_ES3_or_ES5_Modules_are_automatically_in_strict_mode;
    return qd.Function_declarations_are_not_allowed_inside_blocks_in_strict_mode_when_targeting_ES3_or_ES5;
  }
  function checkStrictModeFunctionDeclaration(node: qt.FunctionDeclaration) {
    if (languageVersion < ScriptTarget.ES2015) {
      if (blockScopeContainer.kind !== Syntax.SourceFile && blockScopeContainer.kind !== Syntax.ModuleDeclaration && !qf.is.functionLike(blockScopeContainer)) {
        const errorSpan = qf.get.errorSpanForNode(file, node);
        file.bindqd.push(qf.create.fileDiagnostic(file, errorSpan.start, errorSpan.length, getStrictModeBlockScopeFunctionDeclarationMessage(node)));
      }
    }
  }
  function checkStrictModeNumericLiteral(node: qt.NumericLiteral) {
    if (inStrictMode && node.numericLiteralFlags & TokenFlags.Octal) {
      file.bindqd.push(createDiagnosticForNode(node, qd.Octal_literals_are_not_allowed_in_strict_mode));
    }
  }
  function checkStrictModePostfixUnaryExpression(node: qt.PostfixUnaryExpression) {
    if (inStrictMode) {
      checkStrictModeEvalOrArgs(node, <qt.Identifier>node.operand);
    }
  }
  function checkStrictModePrefixUnaryExpression(node: qt.PrefixUnaryExpression) {
    if (inStrictMode) {
      if (node.operator === Syntax.Plus2Token || node.operator === Syntax.Minus2Token) {
        checkStrictModeEvalOrArgs(node, <qt.Identifier>node.operand);
      }
    }
  }
  function checkStrictModeWithStatement(node: qt.WithStatement) {
    if (inStrictMode) {
      errorOnFirstToken(node, qd.with_statements_are_not_allowed_in_strict_mode);
    }
  }
  function checkStrictModeLabeledStatement(node: qt.LabeledStatement) {
    if (inStrictMode && opts.target! >= ScriptTarget.ES2015) {
      if (qf.is.declarationStatement(node.statement) || node.statement.kind === Syntax.VariableStatement) {
        errorOnFirstToken(node.label, qd.A_label_is_not_allowed_here);
      }
    }
  }
  function errorOnFirstToken(node: Node, message: qd.Message, arg0?: any, arg1?: any, arg2?: any) {
    const span = file.spanOfTokenAtPos(node.pos);
    file.bindqd.push(qf.create.fileDiagnostic(file, span.start, span.length, message, arg0, arg1, arg2));
  }
  function errorOrSuggestionOnNode(isError: boolean, node: Node, message: qd.Message): void {
    errorOrSuggestionOnRange(isError, node, node, message);
  }
  function errorOrSuggestionOnRange(isError: boolean, startNode: Node, endNode: Node, message: qd.Message): void {
    addErrorOrSuggestionDiagnostic(isError, { pos: startNode.tokenPos(file), end: endNode.end }, message);
  }
  function addErrorOrSuggestionDiagnostic(isError: boolean, range: TextRange, message: qd.Message): void {
    const diag = qf.create.fileDiagnostic(file, range.pos, range.end - range.pos, message);
    if (isError) {
      file.bindqd.push(diag);
    } else {
      file.bindSuggestionDiagnostics = append(file.bindSuggestionDiagnostics, { ...diag, category: qd.Category.Suggestion });
    }
  }
  function bind(node: Node | undefined): void {
    if (!node) {
      return;
    }
    node.parent = parent;
    const saveInStrictMode = inStrictMode;
    bindWorker(node);
    if (node.kind > Syntax.LastToken) {
      const saveParent = parent;
      parent = node;
      const containerFlags = getContainerFlags(node);
      if (containerFlags === ContainerFlags.None) {
        bindChildren(node);
      } else {
        bindContainer(node, containerFlags);
      }
      parent = saveParent;
    } else if (!skipTransformFlagAggregation && (node.trafoFlags & TrafoFlags.HasComputedFlags) === 0) {
      subtreeTrafoFlags |= qf.calc.trafoFlags(node, 0);
      const saveParent = parent;
      if (node.kind === Syntax.EndOfFileToken) parent = node;
      bindDoc(node);
      parent = saveParent;
    }
    inStrictMode = saveInStrictMode;
  }
  function bindDoc(node: Node) {
    if (qf.is.withDocNodes(node)) {
      if (qf.is.inJSFile(node)) {
        for (const j of node.doc!) {
          bind(j);
        }
      } else {
        for (const j of node.doc!) {
          setParentPointers(node, j);
        }
      }
    }
  }
  function updateStrictModeStatementList(statements: Nodes<qt.Statement>) {
    if (!inStrictMode) {
      for (const statement of statements) {
        if (!qf.is.prologueDirective(statement)) {
          return;
        }
        if (qf.is.useStrictPrologueDirective(<qt.ExpressionStatement>statement)) {
          inStrictMode = true;
          return;
        }
      }
    }
  }
  function isUseStrictPrologueDirective(node: qt.ExpressionStatement): boolean {
    const nodeText = qf.get.sourceTextOfNodeFromSourceFile(file, node.expression);
    return nodeText === '"use strict"' || nodeText === "'use strict'";
  }
  function bindWorker(node: Node) {
    switch (node.kind) {
      case Syntax.Identifier:
        if ((<qt.Identifier>node).isInDocNamespace) {
          let parentNode = node.parent;
          while (parentNode && !qf.is.doc.typeAlias(parentNode)) {
            parentNode = parentNode.parent;
          }
          bindBlockScopedDeclaration(parentNode as qt.Declaration, SymbolFlags.TypeAlias, SymbolFlags.TypeAliasExcludes);
          break;
        }
      case Syntax.ThisKeyword:
        if (currentFlow && (qf.is.expression(node) || parent.kind === Syntax.ShorthandPropertyAssignment)) {
          node.flowNode = currentFlow;
        }
        return checkStrictModeIdentifier(<qt.Identifier>node);
      case Syntax.SuperKeyword:
        node.flowNode = currentFlow;
        break;
      case Syntax.PrivateIdentifier:
        return checkPrivateIdentifier(node as qt.PrivateIdentifier);
      case Syntax.PropertyAccessExpression:
      case Syntax.ElemAccessExpression:
        const expr = node as qt.PropertyAccessExpression | qt.ElemAccessExpression;
        if (currentFlow && isNarrowableReference(expr)) {
          expr.flowNode = currentFlow;
        }
        if (isSpecialPropertyDeclaration(expr)) {
          bindSpecialPropertyDeclaration(expr);
        }
        if (qf.is.inJSFile(expr) && file.commonJsModuleIndicator && qf.is.moduleExportsAccessExpression(expr) && !lookupSymbolForNameWorker(blockScopeContainer, 'module' as qu.__String)) {
          declareSymbol(file.locals!, undefined, expr.expression, SymbolFlags.FunctionScopedVariable | SymbolFlags.ModuleExports, SymbolFlags.FunctionScopedVariableExcludes);
        }
        break;
      case Syntax.BinaryExpression:
        const specialKind = qf.get.assignmentDeclarationKind(node as qt.BinaryExpression);
        switch (specialKind) {
          case qt.AssignmentDeclarationKind.ExportsProperty:
            bindExportsPropertyAssignment(node as qt.BindableStaticPropertyAssignmentExpression);
            break;
          case qt.AssignmentDeclarationKind.ModuleExports:
            bindModuleExportsAssignment(node as qt.BindablePropertyAssignmentExpression);
            break;
          case qt.AssignmentDeclarationKind.PrototypeProperty:
            bindPrototypePropertyAssignment((node as qt.BindableStaticPropertyAssignmentExpression).left, node);
            break;
          case qt.AssignmentDeclarationKind.Prototype:
            bindPrototypeAssignment(node as qt.BindableStaticPropertyAssignmentExpression);
            break;
          case qt.AssignmentDeclarationKind.ThisProperty:
            bindThisNode(PropertyAssignment, node as qt.BindablePropertyAssignmentExpression);
            break;
          case qt.AssignmentDeclarationKind.Property:
            bindSpecialPropertyAssignment(node as qt.BindablePropertyAssignmentExpression);
            break;
          case qt.AssignmentDeclarationKind.None:
            break;
          default:
            fail('Unknown binary expression special property assignment kind');
        }
        return checkStrictModeBinaryExpression(<qt.BinaryExpression>node);
      case Syntax.CatchClause:
        return checkStrictModeCatchClause(<qt.CatchClause>node);
      case Syntax.DeleteExpression:
        return checkStrictModeDeleteExpression(<qt.DeleteExpression>node);
      case Syntax.NumericLiteral:
        return checkStrictModeNumericLiteral(<qt.NumericLiteral>node);
      case Syntax.PostfixUnaryExpression:
        return checkStrictModePostfixUnaryExpression(<qt.PostfixUnaryExpression>node);
      case Syntax.PrefixUnaryExpression:
        return checkStrictModePrefixUnaryExpression(<qt.PrefixUnaryExpression>node);
      case Syntax.WithStatement:
        return checkStrictModeWithStatement(<qt.WithStatement>node);
      case Syntax.LabeledStatement:
        return checkStrictModeLabeledStatement(<qt.LabeledStatement>node);
      case Syntax.ThisTyping:
        seenThisKeyword = true;
        return;
      case Syntax.TypingPredicate:
        break;
      case Syntax.TypeParam:
        return bindTypeParam(node as qt.TypeParamDeclaration);
      case Syntax.Param:
        return bindParam(<qt.ParamDeclaration>node);
      case Syntax.VariableDeclaration:
        return bindVariableDeclarationOrBindingElem(<qt.VariableDeclaration>node);
      case Syntax.BindingElem:
        node.flowNode = currentFlow;
        return bindVariableDeclarationOrBindingElem(<qt.BindingElem>node);
      case Syntax.PropertyDeclaration:
      case Syntax.PropertySignature:
        return bindPropertyWorker(node as qt.PropertyDeclaration | qt.PropertySignature);
      case Syntax.PropertyAssignment:
      case Syntax.ShorthandPropertyAssignment:
        return bindPropertyOrMethodOrAccessor(<qt.Declaration>node, SymbolFlags.Property, SymbolFlags.PropertyExcludes);
      case Syntax.EnumMember:
        return bindPropertyOrMethodOrAccessor(<qt.Declaration>node, SymbolFlags.EnumMember, SymbolFlags.EnumMemberExcludes);
      case Syntax.CallSignature:
      case Syntax.ConstructSignature:
      case Syntax.IndexSignature:
        return declareSymbolAndAddToSymbolTable(<qt.Declaration>node, SymbolFlags.Signature, SymbolFlags.None);
      case Syntax.MethodDeclaration:
      case Syntax.MethodSignature:
        return bindPropertyOrMethodOrAccessor(
          <qt.Declaration>node,
          SymbolFlags.Method | ((<qt.MethodDeclaration>node).questionToken ? SymbolFlags.Optional : SymbolFlags.None),
          qf.is.objectLiteralMethod(node) ? SymbolFlags.PropertyExcludes : SymbolFlags.MethodExcludes
        );
      case Syntax.FunctionDeclaration:
        return bindFunctionDeclaration(<qt.FunctionDeclaration>node);
      case Syntax.Constructor:
        return declareSymbolAndAddToSymbolTable(<qt.Declaration>node, SymbolFlags.Constructor, SymbolFlags.None);
      case Syntax.GetAccessor:
        return bindPropertyOrMethodOrAccessor(<qt.Declaration>node, SymbolFlags.GetAccessor, SymbolFlags.GetAccessorExcludes);
      case Syntax.SetAccessor:
        return bindPropertyOrMethodOrAccessor(<qt.Declaration>node, SymbolFlags.SetAccessor, SymbolFlags.SetAccessorExcludes);
      case Syntax.FunctionTyping:
      case Syntax.DocFunctionTyping:
      case Syntax.DocSignature:
      case Syntax.ConstructorTyping:
        return bindFunctionOrConstructorType(<qt.SignatureDeclaration | qt.DocSignature>node);
      case Syntax.TypingLiteral:
      case Syntax.DocTypingLiteral:
      case Syntax.MappedTyping:
        return bindAnonymousTypeWorker(node as qt.TypingLiteral | qt.MappedTyping | qt.DocTypingLiteral);
      case Syntax.DocClassTag:
        return bindDocClassTag(node as qt.DocClassTag);
      case Syntax.ObjectLiteralExpression:
        return bindObjectLiteralExpression(<qt.ObjectLiteralExpression>node);
      case Syntax.FunctionExpression:
      case Syntax.ArrowFunction:
        return bindFunctionExpression(<qt.FunctionExpression>node);
      case Syntax.CallExpression:
        const assignmentKind = qf.get.assignmentDeclarationKind(node as qt.CallExpression);
        switch (assignmentKind) {
          case qt.AssignmentDeclarationKind.ObjectDefinePropertyValue:
            return bindObjectDefinePropertyAssignment(node as qt.BindableObjectDefinePropertyCall);
          case qt.AssignmentDeclarationKind.ObjectDefinePropertyExports:
            return bindObjectDefinePropertyExport(node as qt.BindableObjectDefinePropertyCall);
          case qt.AssignmentDeclarationKind.ObjectDefinePrototypeProperty:
            return bindObjectDefinePrototypeProperty(node as qt.BindableObjectDefinePropertyCall);
          case qt.AssignmentDeclarationKind.None:
            break;
          default:
            return fail('Unknown call expression assignment declaration kind');
        }
        if (qf.is.inJSFile(node)) {
          bindCallExpression(<qt.CallExpression>node);
        }
        break;
      case Syntax.ClassExpression:
      case Syntax.ClassDeclaration:
        inStrictMode = true;
        return bindClassLikeDeclaration(<qt.ClassLikeDeclaration>node);
      case Syntax.InterfaceDeclaration:
        return bindBlockScopedDeclaration(<qt.Declaration>node, SymbolFlags.Interface, SymbolFlags.InterfaceExcludes);
      case Syntax.TypeAliasDeclaration:
        return bindBlockScopedDeclaration(<qt.Declaration>node, SymbolFlags.TypeAlias, SymbolFlags.TypeAliasExcludes);
      case Syntax.EnumDeclaration:
        return bindEnumDeclaration(<qt.EnumDeclaration>node);
      case Syntax.ModuleDeclaration:
        return bindModuleDeclaration(<qt.ModuleDeclaration>node);
      case Syntax.JsxAttributes:
        return bindJsxAttributes(<qt.JsxAttributes>node);
      case Syntax.JsxAttribute:
        return bindJsxAttribute(<qt.JsxAttribute>node, SymbolFlags.Property, SymbolFlags.PropertyExcludes);
      case Syntax.ImportEqualsDeclaration:
      case Syntax.NamespaceImport:
      case Syntax.ImportSpecifier:
      case Syntax.ExportSpecifier:
        return declareSymbolAndAddToSymbolTable(<qt.Declaration>node, SymbolFlags.Alias, SymbolFlags.AliasExcludes);
      case Syntax.NamespaceExportDeclaration:
        return bindNamespaceExportDeclaration(<qt.NamespaceExportDeclaration>node);
      case Syntax.ImportClause:
        return bindImportClause(<qt.ImportClause>node);
      case Syntax.ExportDeclaration:
        return bindExportDeclaration(<qt.ExportDeclaration>node);
      case Syntax.ExportAssignment:
        return bindExportAssignment(<qt.ExportAssignment>node);
      case Syntax.SourceFile:
        updateStrictModeStatementList((<qt.SourceFile>node).statements);
        return bindSourceFileIfExternalModule();
      case Syntax.Block:
        if (!qf.is.functionLike(node.parent)) {
          return;
        }
      case Syntax.ModuleBlock:
        return updateStrictModeStatementList((<qt.Block | qt.ModuleBlock>node).statements);
      case Syntax.DocParamTag:
        if (node.parent.kind === Syntax.DocSignature) return bindParam(node as qt.DocParamTag);
        if (node.parent.kind !== Syntax.DocTypingLiteral) {
          break;
        }
      case Syntax.DocPropertyTag:
        const propTag = node as qt.DocPropertyLikeTag;
        const flags =
          propTag.isBracketed || (propTag.typeExpression && propTag.typeExpression.type.kind === Syntax.DocOptionalTyping) ? SymbolFlags.Property | SymbolFlags.Optional : SymbolFlags.Property;
        return declareSymbolAndAddToSymbolTable(propTag, flags, SymbolFlags.PropertyExcludes);
      case Syntax.DocTypedefTag:
      case Syntax.DocCallbackTag:
      case Syntax.DocEnumTag:
        return (delayedTypeAliases || (delayedTypeAliases = [])).push(node as qt.DocTypedefTag | qt.DocCallbackTag | qt.DocEnumTag);
    }
  }
  function bindPropertyWorker(node: qt.PropertyDeclaration | qt.PropertySignature) {
    return bindPropertyOrMethodOrAccessor(node, SymbolFlags.Property | (node.questionToken ? SymbolFlags.Optional : SymbolFlags.None), SymbolFlags.PropertyExcludes);
  }
  function bindAnonymousTypeWorker(node: qt.TypingLiteral | qt.MappedTyping | qt.DocTypingLiteral) {
    return bindAnonymousDeclaration(<qt.Declaration>node, SymbolFlags.TypeLiteral, InternalSymbol.Type);
  }
  function bindSourceFileIfExternalModule() {
    setExportContextFlag(file);
    if (qf.is.externalModule(file)) {
      bindSourceFileAsExternalModule();
    } else if (qf.is.jsonSourceFile(file)) {
      bindSourceFileAsExternalModule();
      const originalSymbol = file.symbol;
      declareSymbol(file.symbol.exports!, file.symbol, file, SymbolFlags.Property, SymbolFlags.All);
      file.symbol = originalSymbol;
    }
  }
  function bindSourceFileAsExternalModule() {
    bindAnonymousDeclaration(file, SymbolFlags.ValueModule, `"${removeFileExtension(file.fileName)}"` as qu.__String);
  }
  function bindExportAssignment(node: qt.ExportAssignment) {
    if (!container.symbol || !container.symbol.exports) {
      bindAnonymousDeclaration(node, SymbolFlags.Alias, getDeclarationName(node)!);
    } else {
      const flags = qf.is.exportAssignmentAlias(node) ? SymbolFlags.Alias : SymbolFlags.Property;
      const symbol = declareSymbol(container.symbol.exports, container.symbol, node, flags, SymbolFlags.All);
      if (node.isExportEquals) {
        symbol.setValueDeclaration(node);
      }
    }
  }
  function bindNamespaceExportDeclaration(node: qt.NamespaceExportDeclaration) {
    if (node.modifiers && node.modifiers.length) {
      file.bindqd.push(createDiagnosticForNode(node, qd.Modifiers_cannot_appear_here));
    }
    const diag =
      !node.parent.kind === Syntax.SourceFile
        ? qd.Global_module_exports_may_only_appear_at_top_level
        : !qf.is.externalModule(node.parent)
        ? qd.Global_module_exports_may_only_appear_in_module_files
        : !node.parent.isDeclarationFile
        ? qd.Global_module_exports_may_only_appear_in_declaration_files
        : undefined;
    if (diag) {
      file.bindqd.push(createDiagnosticForNode(node, diag));
    } else {
      file.symbol.globalExports = file.symbol.globalExports || new qc.SymbolTable();
      declareSymbol(file.symbol.globalExports, file.symbol, node, SymbolFlags.Alias, SymbolFlags.AliasExcludes);
    }
  }
  function bindExportDeclaration(node: qt.ExportDeclaration) {
    if (!container.symbol || !container.symbol.exports) {
      bindAnonymousDeclaration(node, SymbolFlags.ExportStar, getDeclarationName(node)!);
    } else if (!node.exportClause) {
      declareSymbol(container.symbol.exports, container.symbol, node, SymbolFlags.ExportStar, SymbolFlags.None);
    } else if (node.exportClause.kind === Syntax.NamespaceExport) {
      node.exportClause.parent = node;
      declareSymbol(container.symbol.exports, container.symbol, node.exportClause, SymbolFlags.Alias, SymbolFlags.AliasExcludes);
    }
  }
  function bindImportClause(node: qt.ImportClause) {
    if (node.name) {
      declareSymbolAndAddToSymbolTable(node, SymbolFlags.Alias, SymbolFlags.AliasExcludes);
    }
  }
  function setCommonJsModuleIndicator(node: Node) {
    if (file.externalModuleIndicator) return false;
    if (!file.commonJsModuleIndicator) {
      file.commonJsModuleIndicator = node;
      bindSourceFileAsExternalModule();
    }
    return true;
  }
  function bindObjectDefinePropertyExport(node: qt.BindableObjectDefinePropertyCall) {
    if (!setCommonJsModuleIndicator(node)) {
      return;
    }
    const symbol = forEachIdentifierInEntityName(node.args[0], undefined, (id, symbol) => {
      if (symbol) {
        addDeclarationToSymbol(symbol, id, SymbolFlags.Module | SymbolFlags.Assignment);
      }
      return symbol;
    });
    if (symbol) {
      const flags = SymbolFlags.Property | SymbolFlags.ExportValue;
      declareSymbol(symbol.exports!, symbol, node, flags, SymbolFlags.None);
    }
  }
  function bindExportsPropertyAssignment(node: qt.BindableStaticPropertyAssignmentExpression) {
    if (!setCommonJsModuleIndicator(node)) {
      return;
    }
    const symbol = forEachIdentifierInEntityName(node.left.expression, undefined, (id, symbol) => {
      if (symbol) {
        addDeclarationToSymbol(symbol, id, SymbolFlags.Module | SymbolFlags.Assignment);
      }
      return symbol;
    });
    if (symbol) {
      const flags = node.right.kind === Syntax.ClassExpression ? SymbolFlags.Property | SymbolFlags.ExportValue | SymbolFlags.Class : SymbolFlags.Property | SymbolFlags.ExportValue;
      declareSymbol(symbol.exports!, symbol, node.left, flags, SymbolFlags.None);
    }
  }
  function bindModuleExportsAssignment(node: qt.BindablePropertyAssignmentExpression) {
    if (!setCommonJsModuleIndicator(node)) {
      return;
    }
    const assignedExpression = qf.get.rightMostAssignedExpression(node.right);
    if (qf.is.emptyObjectLiteral(assignedExpression) || (container === file && isExportsOrModuleExportsOrAlias(file, assignedExpression))) {
      return;
    }
    const flags = qf.is.exportAssignmentAlias(node) ? SymbolFlags.Alias : SymbolFlags.Property | SymbolFlags.ExportValue | SymbolFlags.ValueModule;
    const symbol = declareSymbol(file.symbol.exports!, file.symbol, node, flags | SymbolFlags.Assignment, SymbolFlags.None);
    symbol.setValueDeclaration(node);
  }
  function bindThisNode(PropertyAssignment, node: qt.BindablePropertyAssignmentExpression | qt.PropertyAccessExpression | qt.LiteralLikeElemAccessExpression) {
    qu.assert(qf.is.inJSFile(node));
    const hasPrivateIdentifier =
      (BinaryExpression.kind === Syntax.node && node.left.kind === Syntax.PropertyAccessExpression && node.left.name.kind === Syntax.PrivateIdentifier) ||
      (node.kind === Syntax.PropertyAccessExpression && node.name.kind === Syntax.PrivateIdentifier);
    if (hasPrivateIdentifier) {
      return;
    }
    const thisContainer = qf.get.thisContainer(node, false);
    switch (thisContainer.kind) {
      case Syntax.FunctionDeclaration:
      case Syntax.FunctionExpression:
        let constructorSymbol: qt.Symbol | undefined = thisContainer.symbol;
        if (thisContainer.parent?.kind === Syntax.BinaryExpression && thisContainer.parent.operatorToken.kind === Syntax.EqualsToken) {
          const l = thisContainer.parent.left;
          if (qf.is.bindableStaticAccessExpression(l) && qf.is.prototypeAccess(l.expression)) {
            constructorSymbol = lookupSymbolForPropertyAccess(l.expression.expression, thisParentContainer);
          }
        }
        if (constructorSymbol && constructorSymbol.valueDeclaration) {
          constructorSymbol.members = constructorSymbol.members || new qc.SymbolTable();
          if (qf.has.dynamicName(node)) {
            bindDynamicallyNamedThisNode(PropertyAssignment, node, constructorSymbol);
          } else {
            declareSymbol(constructorSymbol.members, constructorSymbol, node, SymbolFlags.Property | SymbolFlags.Assignment, SymbolFlags.PropertyExcludes & ~SymbolFlags.Property);
          }
          addDeclarationToSymbol(constructorSymbol, constructorSymbol.valueDeclaration, SymbolFlags.Class);
        }
        break;
      case Syntax.Constructor:
      case Syntax.PropertyDeclaration:
      case Syntax.MethodDeclaration:
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        const containingClass = thisContainer.parent;
        const symbolTable = qf.has.syntacticModifier(thisContainer, ModifierFlags.Static) ? containingClass.symbol.exports! : containingClass.symbol.members!;
        if (qf.has.dynamicName(node)) {
          bindDynamicallyNamedThisNode(PropertyAssignment, node, containingClass.symbol);
        } else {
          declareSymbol(symbolTable, containingClass.symbol, node, SymbolFlags.Property | SymbolFlags.Assignment, SymbolFlags.None, true);
        }
        break;
      case Syntax.SourceFile:
        if (qf.has.dynamicName(node)) {
          break;
        } else if ((thisContainer as qt.SourceFile).commonJsModuleIndicator) {
          declareSymbol(thisContainer.symbol.exports!, thisContainer.symbol, node, SymbolFlags.Property | SymbolFlags.ExportValue, SymbolFlags.None);
        } else {
          declareSymbolAndAddToSymbolTable(node, SymbolFlags.FunctionScopedVariable, SymbolFlags.FunctionScopedVariableExcludes);
        }
        break;
      default:
        Debug.failBadSyntax(thisContainer);
    }
  }
  function bindDynamicallyNamedThisNode(PropertyAssignment, node: qt.BinaryExpression | qt.DynamicNamedDecl, symbol: qt.Symbol) {
    bindAnonymousDeclaration(node, SymbolFlags.Property, InternalSymbol.Computed);
    addLateBoundAssignmentDeclarationToSymbol(node, symbol);
  }
  function addLateBoundAssignmentDeclarationToSymbol(node: qt.BinaryExpression | qt.DynamicNamedDecl, symbol: qt.Symbol | undefined) {
    if (symbol) {
      const members = symbol.assignmentDeclarations || (symbol.assignmentDeclarations = qu.createMap());
      members.set('' + qf.get.nodeId(node), node);
    }
  }
  function bindSpecialPropertyDeclaration(node: qt.PropertyAccessExpression | qt.LiteralLikeElemAccessExpression) {
    if (node.expression.kind === Syntax.ThisKeyword) {
      bindThisNode(PropertyAssignment, node);
    } else if (qf.is.bindableStaticAccessExpression(node) && node.parent.parent.kind === Syntax.SourceFile) {
      if (qf.is.prototypeAccess(node.expression)) {
        bindPrototypePropertyAssignment(node, node.parent);
      } else {
        bindStaticPropertyAssignment(node);
      }
    }
  }
  function bindPrototypeAssignment(node: qt.BindableStaticPropertyAssignmentExpression) {
    node.left.parent = node;
    node.right.parent = node;
    bindPropertyAssignment(node.left.expression, node.left, true);
  }
  function bindObjectDefinePrototypeProperty(node: qt.BindableObjectDefinePropertyCall) {
    const namespaceSymbol = lookupSymbolForPropertyAccess((node.args[0] as qt.PropertyAccessExpression).expression as qt.EntityNameExpression);
    if (namespaceSymbol && namespaceSymbol.valueDeclaration) {
      addDeclarationToSymbol(namespaceSymbol, namespaceSymbol.valueDeclaration, SymbolFlags.Class);
    }
    bindPotentiallyNewExpandoMemberToNamespace(node, namespaceSymbol, true);
  }
  function bindPrototypePropertyAssignment(lhs: qt.BindableStaticAccessExpression, parent: Node) {
    const classPrototype = lhs.expression as qt.BindableStaticAccessExpression;
    const constructorFunction = classPrototype.expression;
    lhs.parent = parent;
    constructorFunction.parent = classPrototype;
    classPrototype.parent = lhs;
    bindPropertyAssignment(constructorFunction, lhs, true);
  }
  function bindObjectDefinePropertyAssignment(node: qt.BindableObjectDefinePropertyCall) {
    let namespaceSymbol = lookupSymbolForPropertyAccess(node.args[0]);
    const isToplevel = node.parent.parent.kind === Syntax.SourceFile;
    namespaceSymbol = bindPotentiallyMissingNamespaces(namespaceSymbol, node.args[0], isToplevel, false);
    bindPotentiallyNewExpandoMemberToNamespace(node, namespaceSymbol, false);
  }
  function bindSpecialPropertyAssignment(node: qt.BindablePropertyAssignmentExpression) {
    const parentSymbol = lookupSymbolForPropertyAccess(node.left.expression, container) || lookupSymbolForPropertyAccess(node.left.expression, blockScopeContainer);
    if (!qf.is.inJSFile(node) && !parentSymbol.isFunction()) return;

    node.left.parent = node;
    node.right.parent = node;
    if (node.left.expression.kind === Syntax.Identifier && container === file && isExportsOrModuleExportsOrAlias(file, node.left.expression)) {
      bindExportsPropertyAssignment(node as qt.BindableStaticPropertyAssignmentExpression);
    } else if (qf.has.dynamicName(node)) {
      bindAnonymousDeclaration(node, SymbolFlags.Property | SymbolFlags.Assignment, InternalSymbol.Computed);
      const sym = bindPotentiallyMissingNamespaces(parentSymbol, node.left.expression, isTopLevelNamespaceAssignment(node.left), false);
      addLateBoundAssignmentDeclarationToSymbol(node, sym);
    } else {
      bindStaticPropertyAssignment(cast(node.left, isBindableStaticNameExpression));
    }
  }
  function bindStaticPropertyAssignment(node: qt.BindableStaticNameExpression) {
    qu.assert(!node.kind === Syntax.Identifier);
    node.expression.parent = node;
    bindPropertyAssignment(node.expression, node, false);
  }
  function bindPotentiallyMissingNamespaces(
    namespaceSymbol: qt.Symbol | undefined,
    entityName: qt.BindableStaticNameExpression,
    isToplevel: boolean,
    isPrototypeProperty: boolean,
    containerIsClass: boolean
  ) {
    if (isToplevel && !isPrototypeProperty) {
      const flags = SymbolFlags.Module | SymbolFlags.Assignment;
      const excludeFlags = SymbolFlags.ValueModuleExcludes & ~SymbolFlags.Assignment;
      namespaceSymbol = forEachIdentifierInEntityName(entityName, namespaceSymbol, (id, symbol, parent) => {
        if (symbol) {
          addDeclarationToSymbol(symbol, id, flags);
          return symbol;
        } else {
          const table = parent ? parent.exports! : file.jsGlobalAugmentations || (file.jsGlobalAugmentations = new qc.SymbolTable());
          return declareSymbol(table, parent, id, flags, excludeFlags);
        }
      });
    }
    if (containerIsClass && namespaceSymbol && namespaceSymbol.valueDeclaration) {
      addDeclarationToSymbol(namespaceSymbol, namespaceSymbol.valueDeclaration, SymbolFlags.Class);
    }
    return namespaceSymbol;
  }
  function bindPotentiallyNewExpandoMemberToNamespace(declaration: qt.BindableStaticAccessExpression | qt.CallExpression, namespaceSymbol: qt.Symbol | undefined, isPrototypeProperty: boolean) {
    if (!namespaceSymbol || !isExpandoSymbol(namespaceSymbol)) {
      return;
    }
    const symbolTable = isPrototypeProperty ? namespaceSymbol.members || (namespaceSymbol.members = new qc.SymbolTable()) : namespaceSymbol.exports || (namespaceSymbol.exports = new qc.SymbolTable());
    let includes = SymbolFlags.None;
    let excludes = SymbolFlags.None;
    if (qf.is.functionLikeDeclaration(qf.get.assignedExpandoIniter(declaration)!)) {
      includes = SymbolFlags.Method;
      excludes = SymbolFlags.MethodExcludes;
    } else if (declaration.kind === Syntax.CallExpression && qf.is.bindableObjectDefinePropertyCall(declaration)) {
      if (
        some(declaration.args[2].properties, (p) => {
          const id = qf.decl.nameOf(p);
          return !!id && id.kind === Syntax.Identifier && idText(id) === 'set';
        })
      ) {
        includes |= SymbolFlags.SetAccessor | SymbolFlags.Property;
        excludes |= SymbolFlags.SetAccessorExcludes;
      }
      if (
        some(declaration.args[2].properties, (p) => {
          const id = qf.decl.nameOf(p);
          return !!id && id.kind === Syntax.Identifier && idText(id) === 'get';
        })
      ) {
        includes |= SymbolFlags.GetAccessor | SymbolFlags.Property;
        excludes |= SymbolFlags.GetAccessorExcludes;
      }
    }
    if (includes === SymbolFlags.None) {
      includes = SymbolFlags.Property;
      excludes = SymbolFlags.PropertyExcludes;
    }
    declareSymbol(symbolTable, namespaceSymbol, declaration, includes | SymbolFlags.Assignment, excludes & ~SymbolFlags.Assignment);
  }
  function isTopLevelNamespaceAssignment(propertyAccess: qt.BindableAccessExpression) {
    return propertyAccess.parent.kind === Syntax.BinaryExpression
      ? getParentOfBinaryExpression(propertyAccess.parent).parent.kind === Syntax.SourceFile
      : propertyAccess.parent.parent.kind === Syntax.SourceFile;
  }
  function bindPropertyAssignment(name: qt.BindableStaticNameExpression, propertyAccess: qt.BindableStaticAccessExpression, isPrototypeProperty: boolean, containerIsClass: boolean) {
    let namespaceSymbol = lookupSymbolForPropertyAccess(name, container) || lookupSymbolForPropertyAccess(name, blockScopeContainer);
    const isToplevel = isTopLevelNamespaceAssignment(propertyAccess);
    namespaceSymbol = bindPotentiallyMissingNamespaces(namespaceSymbol, propertyAccess.expression, isToplevel, isPrototypeProperty, containerIsClass);
    bindPotentiallyNewExpandoMemberToNamespace(propertyAccess, namespaceSymbol, isPrototypeProperty);
  }
  function isExpandoSymbol(symbol: qt.Symbol): boolean {
    if (symbol.flags & (SymbolFlags.Function | SymbolFlags.Class | SymbolFlags.NamespaceModule)) return true;
    const node = symbol.valueDeclaration;
    if (node && node.kind === Syntax.CallExpression) return !!qf.get.assignedExpandoIniter(node);
    let init = !node
      ? undefined
      : node.kind === Syntax.VariableDeclaration
      ? node.initer
      : node.kind === Syntax.BinaryExpression
      ? node.right
      : node.kind === Syntax.PropertyAccessExpression && node.parent.kind === Syntax.BinaryExpression
      ? node.parent.right
      : undefined;
    init = init && qf.get.rightMostAssignedExpression(init);
    if (init) {
      const isPrototypeAssignment = qf.is.prototypeAccess(node.kind === Syntax.VariableDeclaration ? node.name : node.kind === Syntax.BinaryExpression ? node.left : node);
      return !!qf.get.expandoIniter(
        init.kind === Syntax.BinaryExpression && (init.operatorToken.kind === Syntax.Bar2Token || init.operatorToken.kind === Syntax.Question2Token) ? init.right : init,
        isPrototypeAssignment
      );
    }
    return false;
  }
  function getParentOfBinaryExpression(expr: Node) {
    while (expr.parent.kind === Syntax.BinaryExpression) {
      expr = expr.parent;
    }
    return expr.parent;
  }
  function lookupSymbolForPropertyAccess(node: qt.BindableStaticNameExpression, lookupContainer: Node = container): qt.Symbol | undefined {
    if (node.kind === Syntax.Identifier) return lookupSymbolForNameWorker(lookupContainer, node.escapedText);
    else {
      const symbol = lookupSymbolForPropertyAccess(node.expression);
      return symbol && symbol.exports && symbol.exports.get(qf.get.elemOrPropertyAccessName(node));
    }
  }
  function forEachIdentifierInEntityName(
    e: qt.BindableStaticNameExpression,
    parent: qt.Symbol | undefined,
    action: (e: qt.Declaration, symbol: qt.Symbol | undefined, parent: qt.Symbol | undefined) => qt.Symbol | undefined
  ): qt.Symbol | undefined {
    if (isExportsOrModuleExportsOrAlias(file, e)) return file.symbol;
    if (e.kind === Syntax.Identifier) return action(e, lookupSymbolForPropertyAccess(e), parent);
    else {
      const s = forEachIdentifierInEntityName(e.expression, parent, action);
      const name = qf.get.nameOrArg(e);
      if (name.kind === Syntax.PrivateIdentifier) {
        fail('unexpected qt.PrivateIdentifier');
      }
      return action(name, s && s.exports && s.exports.get(qf.get.elemOrPropertyAccessName(e)), s);
    }
  }
  function bindCallExpression(node: qt.CallExpression) {
    if (!file.commonJsModuleIndicator && qf.is.requireCall(node, false)) {
      setCommonJsModuleIndicator(node);
    }
  }
  function bindClassLikeDeclaration(node: qt.ClassLikeDeclaration) {
    if (node.kind === Syntax.ClassDeclaration) {
      bindBlockScopedDeclaration(node, SymbolFlags.Class, SymbolFlags.ClassExcludes);
    } else {
      const bindingName = node.name ? node.name.escapedText : InternalSymbol.Class;
      bindAnonymousDeclaration(node, SymbolFlags.Class, bindingName);
      if (node.name) {
        classifiableNames.set(node.name.escapedText, true);
      }
    }
    const { symbol } = node;
    const prototypeSymbol = new QSymbol(SymbolFlags.Property | SymbolFlags.Prototype, 'prototype' as qu.__String);
    const symbolExport = symbol.exports!.get(prototypeSymbol.escName);
    if (symbolExport) {
      if (node.name) {
        node.name.parent = node;
      }
      file.bindqd.push(createDiagnosticForNode(symbolExport.declarations[0], qd.Duplicate_identifier_0, prototypeSymbol.name));
    }
    symbol.exports!.set(prototypeSymbol.escName, prototypeSymbol);
    prototypeSymbol.parent = symbol;
  }
  function bindEnumDeclaration(node: qt.EnumDeclaration) {
    return qf.is.enumConst(node)
      ? bindBlockScopedDeclaration(node, SymbolFlags.ConstEnum, SymbolFlags.ConstEnumExcludes)
      : bindBlockScopedDeclaration(node, SymbolFlags.RegularEnum, SymbolFlags.RegularEnumExcludes);
  }
  function bindVariableDeclarationOrBindingElem(node: qt.VariableDeclaration | qt.BindingElem) {
    if (inStrictMode) {
      checkStrictModeEvalOrArgs(node, node.name);
    }
    if (!node.name.kind === Syntax.BindingPattern) {
      if (qf.is.blockOrCatchScoped(node)) {
        bindBlockScopedDeclaration(node, SymbolFlags.BlockScopedVariable, SymbolFlags.BlockScopedVariableExcludes);
      } else if (qf.is.paramDeclaration(node)) {
        declareSymbolAndAddToSymbolTable(node, SymbolFlags.FunctionScopedVariable, SymbolFlags.ParamExcludes);
      } else {
        declareSymbolAndAddToSymbolTable(node, SymbolFlags.FunctionScopedVariable, SymbolFlags.FunctionScopedVariableExcludes);
      }
    }
  }
  function bindParam(node: qt.ParamDeclaration | qt.DocParamTag) {
    if (node.kind === Syntax.DocParamTag && container.kind !== Syntax.DocSignature) {
      return;
    }
    if (inStrictMode && !(node.flags & NodeFlags.Ambient)) {
      checkStrictModeEvalOrArgs(node, node.name);
    }
    if (node.name.kind === Syntax.BindingPattern) {
      bindAnonymousDeclaration(node, SymbolFlags.FunctionScopedVariable, ('__' + (node as qt.ParamDeclaration).parent.params.indexOf(node as qt.ParamDeclaration)) as qu.__String);
    } else {
      declareSymbolAndAddToSymbolTable(node, SymbolFlags.FunctionScopedVariable, SymbolFlags.ParamExcludes);
    }
    if (qf.is.paramPropertyDeclaration(node, node.parent)) {
      const classDeclaration = node.parent.parent;
      declareSymbol(
        classDeclaration.symbol.members!,
        classDeclaration.symbol,
        node,
        SymbolFlags.Property | (node.questionToken ? SymbolFlags.Optional : SymbolFlags.None),
        SymbolFlags.PropertyExcludes
      );
    }
  }
  function bindFunctionDeclaration(node: qt.FunctionDeclaration) {
    if (!file.isDeclarationFile && !(node.flags & NodeFlags.Ambient)) {
      if (qf.is.asyncFunction(node)) {
        emitFlags |= NodeFlags.HasAsyncFunctions;
      }
    }
    checkStrictModeFunctionName(node);
    if (inStrictMode) {
      checkStrictModeFunctionDeclaration(node);
      bindBlockScopedDeclaration(node, SymbolFlags.Function, SymbolFlags.FunctionExcludes);
    } else {
      declareSymbolAndAddToSymbolTable(node, SymbolFlags.Function, SymbolFlags.FunctionExcludes);
    }
  }
  function bindFunctionExpression(node: qt.FunctionExpression) {
    if (!file.isDeclarationFile && !(node.flags & NodeFlags.Ambient)) {
      if (qf.is.asyncFunction(node)) {
        emitFlags |= NodeFlags.HasAsyncFunctions;
      }
    }
    if (currentFlow) {
      node.flowNode = currentFlow;
    }
    checkStrictModeFunctionName(node);
    const bindingName = node.name ? node.name.escapedText : InternalSymbol.Function;
    return bindAnonymousDeclaration(node, SymbolFlags.Function, bindingName);
  }
  function bindPropertyOrMethodOrAccessor(node: qt.Declaration, symbolFlags: SymbolFlags, symbolExcludes: SymbolFlags) {
    if (!file.isDeclarationFile && !(node.flags & NodeFlags.Ambient) && qf.is.asyncFunction(node)) {
      emitFlags |= NodeFlags.HasAsyncFunctions;
    }
    if (currentFlow && qf.is.objectLiteralOrClassExpressionMethod(node)) {
      node.flowNode = currentFlow;
    }
    return qf.has.dynamicName(node) ? bindAnonymousDeclaration(node, symbolFlags, InternalSymbol.Computed) : declareSymbolAndAddToSymbolTable(node, symbolFlags, symbolExcludes);
  }
  function getInferTypeContainer(node: Node): qt.ConditionalTyping | undefined {
    const extendsType = qc.findAncestor(node, (n) => n.parent && n.parent.kind === Syntax.ConditionalTyping && n.parent.extendsType === n);
    return extendsType && (extendsType.parent as qt.ConditionalTyping);
  }
  function bindTypeParam(node: qt.TypeParamDeclaration) {
    if (node.parent.kind === Syntax.DocTemplateTag) {
      const container = find((node.parent.parent as qt.Doc).tags!, isDocTypeAlias) || qf.get.hostSignatureFromDoc(node.parent);
      if (container) {
        if (!container.locals) {
          container.locals = new qc.SymbolTable();
        }
        declareSymbol(container.locals, undefined, node, SymbolFlags.TypeParam, SymbolFlags.TypeParamExcludes);
      } else {
        declareSymbolAndAddToSymbolTable(node, SymbolFlags.TypeParam, SymbolFlags.TypeParamExcludes);
      }
    } else if (node.parent.kind === Syntax.InferTyping) {
      const container = getInferTypeContainer(node.parent);
      if (container) {
        if (!container.locals) {
          container.locals = new qc.SymbolTable();
        }
        declareSymbol(container.locals, undefined, node, SymbolFlags.TypeParam, SymbolFlags.TypeParamExcludes);
      } else {
        bindAnonymousDeclaration(node, SymbolFlags.TypeParam, getDeclarationName(node)!);
      }
    } else {
      declareSymbolAndAddToSymbolTable(node, SymbolFlags.TypeParam, SymbolFlags.TypeParamExcludes);
    }
  }
  function shouldReportErrorOnModuleDeclaration(node: qt.ModuleDeclaration): boolean {
    const instanceState = getModuleInstanceState(node);
    return instanceState === ModuleInstanceState.Instantiated || (instanceState === ModuleInstanceState.ConstEnumOnly && !!opts.preserveConstEnums);
  }
  function checkUnreachable(node: Node): boolean {
    if (!(currentFlow.flags & FlowFlags.Unreachable)) return false;
    if (currentFlow === unreachableFlow) {
      const reportError =
        (qf.is.statementButNotDeclaration(node) && node.kind !== Syntax.EmptyStatement) ||
        node.kind === Syntax.ClassDeclaration ||
        (node.kind === Syntax.ModuleDeclaration && shouldReportErrorOnModuleDeclaration(<qt.ModuleDeclaration>node));
      if (reportError) {
        currentFlow = reportedUnreachableFlow;
        if (!opts.allowUnreachableCode) {
          const isError =
            unreachableCodeIsError(opts) &&
            !(node.flags & NodeFlags.Ambient) &&
            (!node.kind === Syntax.VariableStatement || !!(qf.get.combinedFlagsOf(node.declarationList) & NodeFlags.BlockScoped) || node.declarationList.declarations.some((d) => !!d.initer));
          eachUnreachableRange(node, (start, end) => errorOrSuggestionOnRange(isError, start, end, qd.Unreachable_code_detected));
        }
      }
    }
    return true;
  }
}
function eachUnreachableRange(node: Node, cb: (start: Node, last: Node) => void): void {
  if (qf.is.statement(node) && isExecutableStatement(node) && node.parent.kind === Syntax.Block) {
    const { statements } = node.parent;
    const slice = sliceAfter(statements, node);
    getRangesWhere(slice, isExecutableStatement, (start, afterEnd) => cb(slice[start], slice[afterEnd - 1]));
  } else {
    cb(node, node);
  }
}
function isExecutableStatement(s: qt.Statement): boolean {
  return (
    !s.kind === Syntax.FunctionDeclaration &&
    !isPurelyTypeDeclaration(s) &&
    !s.kind === Syntax.EnumDeclaration &&
    !(s.kind === Syntax.VariableStatement && !(qf.get.combinedFlagsOf(s) & (NodeFlags.Let | NodeFlags.Const)) && s.declarationList.declarations.some((d) => !d.initer))
  );
}
function isPurelyTypeDeclaration(s: qt.Statement): boolean {
  switch (s.kind) {
    case Syntax.InterfaceDeclaration:
    case Syntax.TypeAliasDeclaration:
      return true;
    case Syntax.ModuleDeclaration:
      return getModuleInstanceState(s as qt.ModuleDeclaration) !== ModuleInstanceState.Instantiated;
    case Syntax.EnumDeclaration:
      return qf.has.syntacticModifier(s, ModifierFlags.Const);
    default:
      return false;
  }
}
export function isExportsOrModuleExportsOrAlias(sourceFile: qt.SourceFile, node: qt.Expression): boolean {
  let i = 0;
  const q = [node];
  while (q.length && i < 100) {
    i++;
    node = q.shift()!;
    if (qf.is.exportsIdentifier(node) || qf.is.moduleExportsAccessExpression(node)) return true;
    else if (node.kind === Syntax.Identifier) {
      const symbol = lookupSymbolForNameWorker(sourceFile, node.escapedText);
      if (!!symbol && !!symbol.valueDeclaration && symbol.valueDeclaration.kind === Syntax.VariableDeclaration && !!symbol.valueDeclaration.initer) {
        const init = symbol.valueDeclaration.initer;
        q.push(init);
        if (qf.is.assignmentExpression(init, true)) {
          q.push(init.left);
          q.push(init.right);
        }
      }
    }
  }
  return false;
}
function lookupSymbolForNameWorker(container: Node, name: qu.__String): qt.Symbol | undefined {
  const local = container.locals && container.locals.get(name);
  if (local) return local.exportSymbol || local;
  if (container.kind === Syntax.SourceFile && container.jsGlobalAugmentations && container.jsGlobalAugmentations.has(name)) return container.jsGlobalAugmentations.get(name);
  return container.symbol && container.symbol.exports && container.symbol.exports.get(name);
}
function setParentPointers(parent: Node, child: Node): void {
  child.parent = parent;
  qf.each.child(child, (grandchild) => setParentPointers(child, grandchild));
}
function isSpecialPropertyDeclaration(expr: qt.PropertyAccessExpression | qt.ElemAccessExpression): expr is qt.PropertyAccessExpression | qt.LiteralLikeElemAccessExpression {
  return (
    qf.is.inJSFile(expr) &&
    expr.parent &&
    expr.parent.kind === Syntax.ExpressionStatement &&
    (!expr.kind === Syntax.ElemAccessExpression || qf.is.literalLikeElemAccess(expr)) &&
    !!qc.getDoc.typeTag(expr.parent)
  );
}
