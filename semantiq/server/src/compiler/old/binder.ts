namespace core {
  export const enum ModuleInstanceState {
    NonInstantiated = 0,
    Instantiated = 1,
    ConstEnumOnly = 2,
  }

  interface ActiveLabel {
    next: ActiveLabel | undefined;
    name: __String;
    breakTarget: FlowLabel;
    continueTarget: FlowLabel | undefined;
    referenced: boolean;
  }

  export function getModuleInstanceState(node: ModuleDeclaration, visited?: Map<ModuleInstanceState | undefined>): ModuleInstanceState {
    if (node.body && !node.body.parent) {
      // getModuleInstanceStateForAliasTarget needs to walk up the parent chain, so parent pointers must be set on this tree already
      setParentPointers(node, node.body);
    }
    return node.body ? getModuleInstanceStateCached(node.body, visited) : ModuleInstanceState.Instantiated;
  }

  function getModuleInstanceStateCached(node: Node, visited = createMap<ModuleInstanceState | undefined>()) {
    const nodeId = '' + getNodeId(node);
    if (visited.has(nodeId)) {
      return visited.get(nodeId) || ModuleInstanceState.NonInstantiated;
    }
    visited.set(nodeId, undefined);
    const result = getModuleInstanceStateWorker(node, visited);
    visited.set(nodeId, result);
    return result;
  }

  function getModuleInstanceStateWorker(node: Node, visited: Map<ModuleInstanceState | undefined>): ModuleInstanceState {
    // A module is uninstantiated if it contains only
    switch (node.kind) {
      // 1. interface declarations, type alias declarations
      case Syntax.InterfaceDeclaration:
      case Syntax.TypeAliasDeclaration:
        return ModuleInstanceState.NonInstantiated;
      // 2. const enum declarations
      case Syntax.EnumDeclaration:
        if (isEnumConst(node as EnumDeclaration)) {
          return ModuleInstanceState.ConstEnumOnly;
        }
        break;
      // 3. non-exported import declarations
      case Syntax.ImportDeclaration:
      case Syntax.ImportEqualsDeclaration:
        if (!hasSyntacticModifier(node, ModifierFlags.Export)) {
          return ModuleInstanceState.NonInstantiated;
        }
        break;
      // 4. Export alias declarations pointing at only uninstantiated modules or things uninstantiated modules contain
      case Syntax.ExportDeclaration:
        const exportDeclaration = node as ExportDeclaration;
        if (!exportDeclaration.moduleSpecifier && exportDeclaration.exportClause && exportDeclaration.exportClause.kind === Syntax.NamedExports) {
          let state = ModuleInstanceState.NonInstantiated;
          for (const specifier of exportDeclaration.exportClause.elements) {
            const specifierState = getModuleInstanceStateForAliasTarget(specifier, visited);
            if (specifierState > state) {
              state = specifierState;
            }
            if (state === ModuleInstanceState.Instantiated) {
              return state;
            }
          }
          return state;
        }
        break;
      // 5. other uninstantiated module declarations.
      case Syntax.ModuleBlock: {
        let state = ModuleInstanceState.NonInstantiated;
        Node.forEach.child(node, (n) => {
          const childState = getModuleInstanceStateCached(n, visited);
          switch (childState) {
            case ModuleInstanceState.NonInstantiated:
              // child is non-instantiated - continue searching
              return;
            case ModuleInstanceState.ConstEnumOnly:
              // child is const enum only - record state and continue searching
              state = ModuleInstanceState.ConstEnumOnly;
              return;
            case ModuleInstanceState.Instantiated:
              // child is instantiated - record state and stop
              state = ModuleInstanceState.Instantiated;
              return true;
            default:
              Debug.assertNever(childState);
          }
        });
        return state;
      }
      case Syntax.ModuleDeclaration:
        return getModuleInstanceState(node as ModuleDeclaration, visited);
      case Syntax.Identifier:
        // Only jsdoc typedef definition can exist in jsdoc namespace, and it should
        // be considered the same as type alias
        if ((<Identifier>node).isInJSDocNamespace) {
          return ModuleInstanceState.NonInstantiated;
        }
    }
    return ModuleInstanceState.Instantiated;
  }

  function getModuleInstanceStateForAliasTarget(specifier: ExportSpecifier, visited: Map<ModuleInstanceState | undefined>) {
    const name = specifier.propertyName || specifier.name;
    let p: Node | undefined = specifier.parent;
    while (p) {
      if (Node.is.kind(Block, p) || Node.is.kind(ModuleBlock, p) || Node.is.kind(SourceFile, p)) {
        const statements = p.statements;
        let found: ModuleInstanceState | undefined;
        for (const statement of statements) {
          if (Node.is.withName(statement, name)) {
            if (!statement.parent) {
              setParentPointers(p, statement);
            }
            const state = getModuleInstanceStateCached(statement, visited);
            if (found === undefined || state > found) {
              found = state;
            }
            if (found === ModuleInstanceState.Instantiated) {
              return found;
            }
          }
        }
        if (found !== undefined) {
          return found;
        }
      }
      p = p.parent;
    }
    return ModuleInstanceState.Instantiated; // Couldn't locate, assume could refer to a value
  }

  const enum ContainerFlags {
    // The current node is not a container, and no container manipulation should happen before
    // recursing into it.
    None = 0,

    // The current node is a container.  It should be set as the current container (and block-
    // container) before recursing into it.  The current node does not have locals.  Examples:
    //
    //      Classes, ObjectLiterals, TypeLiterals, Interfaces...
    IsContainer = 1 << 0,

    // The current node is a block-scoped-container.  It should be set as the current block-
    // container before recursing into it.  Examples:
    //
    //      Blocks (when not parented by functions), Catch clauses, For/For-in/For-of statements...
    IsBlockScopedContainer = 1 << 1,

    // The current node is the container of a control flow path. The current control flow should
    // be saved and restored, and a new control flow initialized within the container.
    IsControlFlowContainer = 1 << 2,

    IsFunctionLike = 1 << 3,
    IsFunctionExpression = 1 << 4,
    HasLocals = 1 << 5,
    IsInterface = 1 << 6,
    IsObjectLiteralOrClassExpressionMethod = 1 << 7,
  }

  function initFlowNode<T extends FlowNode>(node: T) {
    Debug.attachFlowNodeDebugInfo(node);
    return node;
  }

  const binder = createBinder();

  export function bindSourceFile(file: SourceFile, options: CompilerOptions) {
    performance.mark('beforeBind');
    perfLogger.logStartBindFile('' + file.fileName);
    binder(file, options);
    perfLogger.logStopBindFile();
    performance.mark('afterBind');
    performance.measure('Bind', 'beforeBind', 'afterBind');
  }

  function createBinder(): (file: SourceFile, options: CompilerOptions) => void {
    let file: SourceFile;
    let options: CompilerOptions;
    let languageVersion: ScriptTarget;
    let parent: Node;
    let container: Node;
    let thisParentContainer: Node; // Container one level up
    let blockScopeContainer: Node;
    let lastContainer: Node;
    let delayedTypeAliases: (JSDocTypedefTag | JSDocCallbackTag | JSDocEnumTag)[];
    let seenThisKeyword: boolean;

    // state used by control flow analysis
    let currentFlow: FlowNode;
    let currentBreakTarget: FlowLabel | undefined;
    let currentContinueTarget: FlowLabel | undefined;
    let currentReturnTarget: FlowLabel | undefined;
    let currentTrueTarget: FlowLabel | undefined;
    let currentFalseTarget: FlowLabel | undefined;
    let currentExceptionTarget: FlowLabel | undefined;
    let preSwitchCaseFlow: FlowNode | undefined;
    let activeLabelList: ActiveLabel | undefined;
    let hasExplicitReturn: boolean;

    // state used for emit helpers
    let emitFlags: NodeFlags;

    // If this file is an external module, then it is automatically in strict-mode according to
    // ES6.  If it is not an external module, then we'll determine if it is in strict mode or
    // not depending on if we see "use strict" in certain places or if we hit a class/namespace
    // or if compiler options contain alwaysStrict.
    let inStrictMode: boolean;

    let symbolCount = 0;

    let Symbol: new (flags: SymbolFlags, name: __String) => Symbol;
    let classifiableNames: UnderscoreEscapedMap<true>;

    const unreachableFlow: FlowNode = { flags: FlowFlags.Unreachable };
    const reportedUnreachableFlow: FlowNode = { flags: FlowFlags.Unreachable };

    // state used to aggregate transform flags during bind.
    let subtreeTransformFlags: TransformFlags = TransformFlags.None;
    let skipTransformFlagAggregation: boolean;

    /**
     * Inside the binder, we may create a diagnostic for an as-yet unbound node (with potentially no parent pointers, implying no accessible source file)
     * If so, the node _must_ be in the current file (as that's the only way anything could have traversed to it to yield it as the error node)
     * This version of `createDiagnosticForNode` uses the binder's context to account for this, and always yields correct diagnostics even in these situations.
     */
    function createDiagnosticForNode(node: Node, message: DiagnosticMessage, arg0?: string | number, arg1?: string | number, arg2?: string | number): DiagnosticWithLocation {
      return createDiagnosticForNodeInSourceFile(Node.get.sourceFileOf(node) || file, node, message, arg0, arg1, arg2);
    }

    function bindSourceFile(f: SourceFile, opts: CompilerOptions) {
      file = f;
      options = opts;
      languageVersion = getEmitScriptTarget(options);
      inStrictMode = bindInStrictMode(file, opts);
      classifiableNames = createUnderscoreEscapedMap<true>();
      symbolCount = 0;
      skipTransformFlagAggregation = file.isDeclarationFile;

      Symbol = Node.Symbol;

      // Attach debugging information if necessary
      Debug.attachFlowNodeDebugInfo(unreachableFlow);
      Debug.attachFlowNodeDebugInfo(reportedUnreachableFlow);

      if (!file.locals) {
        bind(file);
        file.symbolCount = symbolCount;
        file.classifiableNames = classifiableNames;
        delayedBindJSDocTypedefTag();
      }

      file = undefined!;
      options = undefined!;
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
      subtreeTransformFlags = TransformFlags.None;
    }

    return bindSourceFile;

    function bindInStrictMode(file: SourceFile, opts: CompilerOptions): boolean {
      if (getStrictOptionValue(opts, 'alwaysStrict') && !file.isDeclarationFile) {
        // bind in strict mode source files with alwaysStrict option
        return true;
      } else {
        return !!file.externalModuleIndicator;
      }
    }

    function new QSymbol(flags: SymbolFlags, name: __String): Symbol {
      symbolCount++;
      return new Symbol(flags, name);
    }

    function addDeclarationToSymbol(symbol: Symbol, node: Declaration, symbolFlags: SymbolFlags) {
      symbol.flags |= symbolFlags;

      node.symbol = symbol;
      symbol.declarations = appendIfUnique(symbol.declarations, node);

      if (symbolFlags & (SymbolFlags.Class | SymbolFlags.Enum | SymbolFlags.Module | SymbolFlags.Variable) && !symbol.exports) {
        symbol.exports = new SymbolTable();
      }

      if (symbolFlags & (SymbolFlags.Class | SymbolFlags.Interface | SymbolFlags.TypeLiteral | SymbolFlags.ObjectLiteral) && !symbol.members) {
        symbol.members = new SymbolTable();
      }

      // On merge of const enum module with class or function, reset const enum only flag (namespaces will already recalculate)
      if (symbol.constEnumOnlyModule && symbol.flags & (SymbolFlags.Function | SymbolFlags.Class | SymbolFlags.RegularEnum)) {
        symbol.constEnumOnlyModule = false;
      }

      if (symbolFlags & SymbolFlags.Value) {
        setValueDeclaration(symbol, node);
      }
    }

    // Should not be called on a declaration with a computed property name,
    // unless it is a well known Symbol.
    function getDeclarationName(node: Declaration): __String | undefined {
      if (node.kind === Syntax.ExportAssignment) {
        return (<ExportAssignment>node).isExportEquals ? InternalSymbolName.ExportEquals : InternalSymbolName.Default;
      }

      const name = getNameOfDeclaration(node);
      if (name) {
        if (Node.is.ambientModule(node)) {
          const moduleName = getTextOfIdentifierOrLiteral(name as Identifier | StringLiteral);
          return (isGlobalScopeAugmentation(<ModuleDeclaration>node) ? '__global' : `"${moduleName}"`) as __String;
        }
        if (name.kind === Syntax.ComputedPropertyName) {
          const nameExpression = name.expression;
          // treat computed property names where expression is string/numeric literal as just string/numeric literal
          if (StringLiteral.orNumericLiteralLike(nameExpression)) {
            return syntax.get.escUnderscores(nameExpression.text);
          }
          if (Node.is.signedNumericLiteral(nameExpression)) {
            return (Token.toString(nameExpression.operator) + nameExpression.operand.text) as __String;
          }

          assert(isWellKnownSymbolSyntactically(nameExpression));
          return getPropertyNameForKnownSymbolName(idText((<PropertyAccessExpression>nameExpression).name));
        }
        if (isWellKnownSymbolSyntactically(name)) {
          return getPropertyNameForKnownSymbolName(idText(name.name));
        }
        if (Node.is.kind(PrivateIdentifier, name)) {
          // containingClass exists because private names only allowed inside classes
          const containingClass = Node.get.containingClass(node);
          if (!containingClass) {
            // we can get here in cases where there is already a parse error.
            return;
          }
          const containingClassSymbol = containingClass.symbol;
          return getSymbolNameForPrivateIdentifier(containingClassSymbol, name.escapedText);
        }
        return isPropertyNameLiteral(name) ? getEscapedTextOfIdentifierOrLiteral(name) : undefined;
      }
      switch (node.kind) {
        case Syntax.Constructor:
          return InternalSymbolName.Constructor;
        case Syntax.FunctionType:
        case Syntax.CallSignature:
        case Syntax.JSDocSignature:
          return InternalSymbolName.Call;
        case Syntax.ConstructorType:
        case Syntax.ConstructSignature:
          return InternalSymbolName.New;
        case Syntax.IndexSignature:
          return InternalSymbolName.Index;
        case Syntax.ExportDeclaration:
          return InternalSymbolName.ExportStar;
        case Syntax.SourceFile:
          // json file should behave as
          // module.exports = ...
          return InternalSymbolName.ExportEquals;
        case Syntax.BinaryExpression:
          if (getAssignmentDeclarationKind(node as BinaryExpression) === AssignmentDeclarationKind.ModuleExports) {
            // module.exports = ...
            return InternalSymbolName.ExportEquals;
          }
          fail('Unknown binary declaration kind');
          break;
        case Syntax.JSDocFunctionType:
          return Node.isJSDoc.constructSignature(node) ? InternalSymbolName.New : InternalSymbolName.Call;
        case Syntax.Parameter:
          // Parameters with names are handled at the top of this function.  Parameters
          // without names can only come from JSDocFunctionTypes.
          assert(
            node.parent.kind === Syntax.JSDocFunctionType,
            'Impossible parameter parent kind',
            () => `parent is: ${(ts as any).SyntaxKind ? (ts as any).SyntaxKind[node.parent.kind] : node.parent.kind}, expected JSDocFunctionType`
          );
          const functionType = <JSDocFunctionType>node.parent;
          const index = functionType.parameters.indexOf(node as ParameterDeclaration);
          return ('arg' + index) as __String;
      }
    }

    function getDisplayName(node: Declaration): string {
      return Node.is.namedDeclaration(node) ? declarationNameToString(node.name) : syntax.get.unescUnderscores(Debug.checkDefined(getDeclarationName(node)));
    }

    /**
     * Declares a Symbol for the node and adds it to symbols. Reports errors for conflicting identifier names.
     * @param symbolTable - The symbol table which node will be added to.
     * @param parent - node's parent declaration.
     * @param node - The declaration to be added to the symbol table
     * @param includes - The SymbolFlags that node has in addition to its declaration type (eg: export, ambient, etc.)
     * @param excludes - The flags which node cannot be declared alongside in a symbol table. Used to report forbidden declarations.
     */
    function declareSymbol(symbolTable: SymbolTable, parent: Symbol | undefined, node: Declaration, includes: SymbolFlags, excludes: SymbolFlags, isReplaceableByMethod?: boolean): Symbol {
      assert(!hasDynamicName(node));

      const isDefaultExport = hasSyntacticModifier(node, ModifierFlags.Default) || (Node.is.kind(ExportSpecifier, node) && node.name.escapedText === 'default');

      // The exported symbol for an export default function/class node is always named "default"
      const name = isDefaultExport && parent ? InternalSymbolName.Default : getDeclarationName(node);

      let symbol: Symbol | undefined;
      if (name === undefined) {
        symbol = new QSymbol(SymbolFlags.None, InternalSymbolName.Missing);
      } else {
        // Check and see if the symbol table already has a symbol with this name.  If not,
        // create a new symbol with this name and add it to the table.  Note that we don't
        // give the new symbol any flags *yet*.  This ensures that it will not conflict
        // with the 'excludes' flags we pass in.
        //
        // If we do get an existing symbol, see if it conflicts with the new symbol we're
        // creating.  For example, a 'var' symbol and a 'class' symbol will conflict within
        // the same symbol table.  If we have a conflict, report the issue on each
        // declaration we have for this symbol, and then create a new symbol for this
        // declaration.
        //
        // Note that when properties declared in Javascript constructors
        // (marked by isReplaceableByMethod) conflict with another symbol, the property loses.
        // Always. This allows the common Javascript pattern of overwriting a prototype method
        // with an bound instance method of the same type: `this.method = this.method.bind(this)`
        //
        // If we created a new symbol, either because we didn't have a symbol with this name
        // in the symbol table, or we conflicted with an existing symbol, then just add this
        // node as the sole declaration of the new symbol.
        //
        // Otherwise, we'll be merging into a compatible existing symbol (for example when
        // you have multiple 'vars' with the same name in the same container).  In this case
        // just add this node into the declarations list of the symbol.
        symbol = symbolTable.get(name);

        if (includes & SymbolFlags.Classifiable) {
          classifiableNames.set(name, true);
        }

        if (!symbol) {
          symbolTable.set(name, (symbol = new QSymbol(SymbolFlags.None, name)));
          if (isReplaceableByMethod) symbol.isReplaceableByMethod = true;
        } else if (isReplaceableByMethod && !symbol.isReplaceableByMethod) {
          // A symbol already exists, so don't add this as a declaration.
          return symbol;
        } else if (symbol.flags & excludes) {
          if (symbol.isReplaceableByMethod) {
            // Javascript constructor-declared symbols can be discarded in favor of
            // prototype symbols like methods.
            symbolTable.set(name, (symbol = new QSymbol(SymbolFlags.None, name)));
          } else if (!(includes & SymbolFlags.Variable && symbol.flags & SymbolFlags.Assignment)) {
            // Assignment declarations are allowed to merge with variables, no matter what other flags they have.
            if (Node.is.namedDeclaration(node)) {
              node.name.parent = node;
            }
            // Report errors every position with duplicate declaration
            // Report errors on previous encountered declarations
            let message = symbol.flags & SymbolFlags.BlockScopedVariable ? Diagnostics.Cannot_redeclare_block_scoped_variable_0 : Diagnostics.Duplicate_identifier_0;
            let messageNeedsName = true;

            if (symbol.flags & SymbolFlags.Enum || includes & SymbolFlags.Enum) {
              message = Diagnostics.Enum_declarations_can_only_merge_with_namespace_or_other_enum_declarations;
              messageNeedsName = false;
            }

            let multipleDefaultExports = false;
            if (length(symbol.declarations)) {
              // If the current node is a default export of some sort, then check if
              // there are any other default exports that we need to error on.
              // We'll know whether we have other default exports depending on if `symbol` already has a declaration list set.
              if (isDefaultExport) {
                message = Diagnostics.A_module_cannot_have_multiple_default_exports;
                messageNeedsName = false;
                multipleDefaultExports = true;
              } else {
                // This is to properly report an error in the case "export default { }" is after export default of class declaration or function declaration.
                // Error on multiple export default in the following case:
                // 1. multiple export default of class declaration or function declaration by checking NodeFlags.Default
                // 2. multiple export default of export assignment. This one doesn't have NodeFlags.Default on (as export default doesn't considered as modifiers)
                if (symbol.declarations && symbol.declarations.length && node.kind === Syntax.ExportAssignment && !(<ExportAssignment>node).isExportEquals) {
                  message = Diagnostics.A_module_cannot_have_multiple_default_exports;
                  messageNeedsName = false;
                  multipleDefaultExports = true;
                }
              }
            }

            const relatedInformation: DiagnosticRelatedInformation[] = [];
            if (
              Node.is.kind(TypeAliasDeclaration, node) &&
              Node.is.missing(node.type) &&
              hasSyntacticModifier(node, ModifierFlags.Export) &&
              symbol.flags & (SymbolFlags.Alias | SymbolFlags.Type | SymbolFlags.Namespace)
            ) {
              // export type T; - may have meant export type { T }?
              relatedInformation.push(createDiagnosticForNode(node, Diagnostics.Did_you_mean_0, `export type { ${syntax.get.unescUnderscores(node.name.escapedText)} }`));
            }

            const declarationName = getNameOfDeclaration(node) || node;
            forEach(symbol.declarations, (declaration, index) => {
              const decl = getNameOfDeclaration(declaration) || declaration;
              const diag = createDiagnosticForNode(decl, message, messageNeedsName ? getDisplayName(declaration) : undefined);
              file.bindDiagnostics.push(
                multipleDefaultExports ? addRelatedInfo(diag, createDiagnosticForNode(declarationName, index === 0 ? Diagnostics.Another_export_default_is_here : Diagnostics.and_here)) : diag
              );
              if (multipleDefaultExports) {
                relatedInformation.push(createDiagnosticForNode(decl, Diagnostics.The_first_export_default_is_here));
              }
            });

            const diag = createDiagnosticForNode(declarationName, message, messageNeedsName ? getDisplayName(node) : undefined);
            file.bindDiagnostics.push(addRelatedInfo(diag, ...relatedInformation));

            symbol = new QSymbol(SymbolFlags.None, name);
          }
        }
      }

      addDeclarationToSymbol(symbol, node, includes);
      if (symbol.parent) {
        assert(symbol.parent === parent, 'Existing symbol parent should match new one');
      } else {
        symbol.parent = parent;
      }

      return symbol;
    }

    function declareModuleMember(node: Declaration, symbolFlags: SymbolFlags, symbolExcludes: SymbolFlags): Symbol {
      const hasExportModifier = getCombinedModifierFlags(node) & ModifierFlags.Export;
      if (symbolFlags & SymbolFlags.Alias) {
        if (node.kind === Syntax.ExportSpecifier || (node.kind === Syntax.ImportEqualsDeclaration && hasExportModifier)) {
          return declareSymbol(container.symbol.exports!, container.symbol, node, symbolFlags, symbolExcludes);
        } else {
          return declareSymbol(container.locals!, /*parent*/ undefined, node, symbolFlags, symbolExcludes);
        }
      } else {
        // Exported module members are given 2 symbols: A local symbol that is classified with an ExportValue flag,
        // and an associated export symbol with all the correct flags set on it. There are 2 main reasons:
        //
        //   1. We treat locals and exports of the same name as mutually exclusive within a container.
        //      That means the binder will issue a Duplicate Identifier error if you mix locals and exports
        //      with the same name in the same container.
        //      TODO: Make this a more specific error and decouple it from the exclusion logic.
        //   2. When we checkIdentifier in the checker, we set its resolved symbol to the local symbol,
        //      but return the export symbol (by calling getExportSymbolOfValueSymbolIfExported). That way
        //      when the emitter comes back to it, it knows not to qualify the name if it was found in a containing scope.

        // NOTE: Nested ambient modules always should go to to 'locals' table to prevent their automatic merge
        //       during global merging in the checker. Why? The only case when ambient module is permitted inside another module is module augmentation
        //       and this case is specially handled. Module augmentations should only be merged with original module definition
        //       and should never be merged directly with other augmentation, and the latter case would be possible if automatic merge is allowed.
        if (Node.isJSDoc.typeAlias(node)) assert(isInJSFile(node)); // We shouldn't add symbols for JSDoc nodes if not in a JS file.
        if ((!Node.is.ambientModule(node) && (hasExportModifier || container.flags & NodeFlags.ExportContext)) || Node.isJSDoc.typeAlias(node)) {
          if (!container.locals || (hasSyntacticModifier(node, ModifierFlags.Default) && !getDeclarationName(node))) {
            return declareSymbol(container.symbol.exports!, container.symbol, node, symbolFlags, symbolExcludes); // No local symbol for an unnamed default!
          }
          const exportKind = symbolFlags & SymbolFlags.Value ? SymbolFlags.ExportValue : 0;
          const local = declareSymbol(container.locals, /*parent*/ undefined, node, exportKind, symbolExcludes);
          local.exportSymbol = declareSymbol(container.symbol.exports!, container.symbol, node, symbolFlags, symbolExcludes);
          node.localSymbol = local;
          return local;
        } else {
          return declareSymbol(container.locals!, /*parent*/ undefined, node, symbolFlags, symbolExcludes);
        }
      }
    }

    // All container nodes are kept on a linked list in declaration order. This list is used by
    // the getLocalNameOfContainer function in the type checker to validate that the local name
    // used for a container is unique.
    function bindContainer(node: Node, containerFlags: ContainerFlags) {
      // Before we recurse into a node's children, we first save the existing parent, container
      // and block-container.  Then after we pop out of processing the children, we restore
      // these saved values.
      const saveContainer = container;
      const saveThisParentContainer = thisParentContainer;
      const savedBlockScopeContainer = blockScopeContainer;

      // Depending on what kind of node this is, we may have to adjust the current container
      // and block-container.   If the current node is a container, then it is automatically
      // considered the current block-container as well.  Also, for containers that we know
      // may contain locals, we eagerly initialize the .locals field. We do this because
      // it's highly likely that the .locals will be needed to place some child in (for example,
      // a parameter, or variable declaration).
      //
      // However, we do not proactively create the .locals for block-containers because it's
      // totally normal and common for block-containers to never actually have a block-scoped
      // variable in them.  We don't want to end up allocating an object for every 'block' we
      // run into when most of them won't be necessary.
      //
      // Finally, if this is a block-container, then we clear out any existing .locals object
      // it may contain within it.  This happens in incremental scenarios.  Because we can be
      // reusing a node from a previous compilation, that node may have had 'locals' created
      // for it.  We must clear this so we don't accidentally move any stale data forward from
      // a previous compilation.
      if (containerFlags & ContainerFlags.IsContainer) {
        if (node.kind !== Syntax.ArrowFunction) {
          thisParentContainer = container;
        }
        container = blockScopeContainer = node;
        if (containerFlags & ContainerFlags.HasLocals) {
          container.locals = new SymbolTable();
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
          !hasSyntacticModifier(node, ModifierFlags.Async) &&
          !(<FunctionLikeDeclaration>node).asteriskToken &&
          !!Node.get.immediatelyInvokedFunctionExpression(node);
        // A non-async, non-generator IIFE is considered part of the containing control flow. Return statements behave
        // similarly to break statements that exit to a label just past the statement body.
        if (!isIIFE) {
          currentFlow = initFlowNode({ flags: FlowFlags.Start });
          if (containerFlags & (ContainerFlags.IsFunctionExpression | ContainerFlags.IsObjectLiteralOrClassExpressionMethod)) {
            currentFlow.node = <FunctionExpression | ArrowFunction | MethodDeclaration>node;
          }
        }
        // We create a return control flow graph for IIFEs and constructors. For constructors
        // we use the return control flow graph in strict property initialization checks.
        currentReturnTarget =
          isIIFE || node.kind === Syntax.Constructor || (isInJSFile && (node.kind === Syntax.FunctionDeclaration || node.kind === Syntax.FunctionExpression)) ? createBranchLabel() : undefined;
        currentExceptionTarget = undefined;
        currentBreakTarget = undefined;
        currentContinueTarget = undefined;
        activeLabelList = undefined;
        hasExplicitReturn = false;
        bindChildren(node);
        // Reset all reachability check related flags on node (for incremental scenarios)
        node.flags &= ~NodeFlags.ReachabilityAndEmitFlags;
        if (!(currentFlow.flags & FlowFlags.Unreachable) && containerFlags & ContainerFlags.IsFunctionLike && Node.is.present((<FunctionLikeDeclaration>node).body)) {
          node.flags |= NodeFlags.HasImplicitReturn;
          if (hasExplicitReturn) node.flags |= NodeFlags.HasExplicitReturn;
          (<FunctionLikeDeclaration>node).endFlowNode = currentFlow;
        }
        if (node.kind === Syntax.SourceFile) {
          node.flags |= emitFlags;
        }

        if (currentReturnTarget) {
          addAntecedent(currentReturnTarget, currentFlow);
          currentFlow = finishFlowLabel(currentReturnTarget);
          if (node.kind === Syntax.Constructor || (isInJSFile && (node.kind === Syntax.FunctionDeclaration || node.kind === Syntax.FunctionExpression))) {
            (<FunctionLikeDeclaration>node).returnFlowNode = currentFlow;
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
      } else if (node.transformFlags & TransformFlags.HasComputedFlags) {
        skipTransformFlagAggregation = true;
        bindChildrenWorker(node);
        skipTransformFlagAggregation = false;
        subtreeTransformFlags |= node.transformFlags & ~getTransformFlagsSubtreeExclusions(node.kind);
      } else {
        const savedSubtreeTransformFlags = subtreeTransformFlags;
        subtreeTransformFlags = 0;
        bindChildrenWorker(node);
        subtreeTransformFlags = savedSubtreeTransformFlags | computeTransformFlagsForNode(node, subtreeTransformFlags);
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
        const savedSubtreeTransformFlags = subtreeTransformFlags;
        subtreeTransformFlags = TransformFlags.None;
        let nodeArrayFlags = TransformFlags.None;
        for (const node of nodes) {
          bindFunction(node);
          nodeArrayFlags |= node.transformFlags & ~TransformFlags.HasComputedFlags;
        }
        nodes.transformFlags = nodeArrayFlags | TransformFlags.HasComputedFlags;
        subtreeTransformFlags |= savedSubtreeTransformFlags;
      }
    }

    function bindEachChild(node: Node) {
      Node.forEach.child(node, bind, bindEach);
    }

    function bindChildrenWorker(node: Node): void {
      if (checkUnreachable(node)) {
        bindEachChild(node);
        bindJSDoc(node);
        return;
      }
      if (node.kind >= Syntax.FirstStatement && node.kind <= Syntax.LastStatement && !options.allowUnreachableCode) {
        node.flowNode = currentFlow;
      }
      switch (node.kind) {
        case Syntax.WhileStatement:
          bindWhileStatement(<WhileStatement>node);
          break;
        case Syntax.DoStatement:
          bindDoStatement(<DoStatement>node);
          break;
        case Syntax.ForStatement:
          bindForStatement(<ForStatement>node);
          break;
        case Syntax.ForInStatement:
        case Syntax.ForOfStatement:
          bindForInOrForOfStatement(<ForInOrOfStatement>node);
          break;
        case Syntax.IfStatement:
          bindIfStatement(<IfStatement>node);
          break;
        case Syntax.ReturnStatement:
        case Syntax.ThrowStatement:
          bindReturnOrThrow(<ReturnStatement | ThrowStatement>node);
          break;
        case Syntax.BreakStatement:
        case Syntax.ContinueStatement:
          bindBreakOrContinueStatement(<BreakOrContinueStatement>node);
          break;
        case Syntax.TryStatement:
          bindTryStatement(<TryStatement>node);
          break;
        case Syntax.SwitchStatement:
          bindSwitchStatement(<SwitchStatement>node);
          break;
        case Syntax.CaseBlock:
          bindCaseBlock(<CaseBlock>node);
          break;
        case Syntax.CaseClause:
          bindCaseClause(<CaseClause>node);
          break;
        case Syntax.ExpressionStatement:
          bindExpressionStatement(<ExpressionStatement>node);
          break;
        case Syntax.LabeledStatement:
          bindLabeledStatement(<LabeledStatement>node);
          break;
        case Syntax.PrefixUnaryExpression:
          bindPrefixUnaryExpressionFlow(<PrefixUnaryExpression>node);
          break;
        case Syntax.PostfixUnaryExpression:
          bindPostfixUnaryExpressionFlow(<PostfixUnaryExpression>node);
          break;
        case Syntax.BinaryExpression:
          bindBinaryExpressionFlow(<BinaryExpression>node);
          break;
        case Syntax.DeleteExpression:
          bindDeleteExpressionFlow(<DeleteExpression>node);
          break;
        case Syntax.ConditionalExpression:
          bindConditionalExpressionFlow(<ConditionalExpression>node);
          break;
        case Syntax.VariableDeclaration:
          bindVariableDeclarationFlow(<VariableDeclaration>node);
          break;
        case Syntax.PropertyAccessExpression:
        case Syntax.ElementAccessExpression:
          bindAccessExpressionFlow(<AccessExpression>node);
          break;
        case Syntax.CallExpression:
          bindCallExpressionFlow(<CallExpression>node);
          break;
        case Syntax.NonNullExpression:
          bindNonNullExpressionFlow(<NonNullExpression>node);
          break;
        case Syntax.JSDocTypedefTag:
        case Syntax.JSDocCallbackTag:
        case Syntax.JSDocEnumTag:
          bindJSDocTypeAlias(node as JSDocTypedefTag | JSDocCallbackTag | JSDocEnumTag);
          break;
        // In source files and blocks, bind functions first to match hoisting that occurs at runtime
        case Syntax.SourceFile: {
          bindEachFunctionsFirst((node as SourceFile).statements);
          bind((node as SourceFile).endOfFileToken);
          break;
        }
        case Syntax.Block:
        case Syntax.ModuleBlock:
          bindEachFunctionsFirst((node as Block).statements);
          break;
        default:
          bindEachChild(node);
          break;
      }
      bindJSDoc(node);
    }

    function isNarrowingExpression(expr: Expression): boolean {
      switch (expr.kind) {
        case Syntax.Identifier:
        case Syntax.ThisKeyword:
        case Syntax.PropertyAccessExpression:
        case Syntax.ElementAccessExpression:
          return containsNarrowableReference(expr);
        case Syntax.CallExpression:
          return hasNarrowableArgument(<CallExpression>expr);
        case Syntax.ParenthesizedExpression:
          return isNarrowingExpression((<ParenthesizedExpression>expr).expression);
        case Syntax.BinaryExpression:
          return isNarrowingBinaryExpression(<BinaryExpression>expr);
        case Syntax.PrefixUnaryExpression:
          return (<PrefixUnaryExpression>expr).operator === Syntax.ExclamationToken && isNarrowingExpression((<PrefixUnaryExpression>expr).operand);
        case Syntax.TypeOfExpression:
          return isNarrowingExpression((<TypeOfExpression>expr).expression);
      }
      return false;
    }

    function isNarrowableReference(expr: Expression): boolean {
      return (
        expr.kind === Syntax.Identifier ||
        expr.kind === Syntax.ThisKeyword ||
        expr.kind === Syntax.SuperKeyword ||
        ((Node.is.kind(PropertyAccessExpression, expr) || Node.is.kind(NonNullExpression, expr) || Node.is.kind(ParenthesizedExpression, expr)) && isNarrowableReference(expr.expression)) ||
        (Node.is.kind(ElementAccessExpression, expr) && StringLiteral.orNumericLiteralLike(expr.argumentExpression) && isNarrowableReference(expr.expression))
      );
    }

    function containsNarrowableReference(expr: Expression): boolean {
      return isNarrowableReference(expr) || (Node.is.optionalChain(expr) && containsNarrowableReference(expr.expression));
    }

    function hasNarrowableArgument(expr: CallExpression) {
      if (expr.arguments) {
        for (const argument of expr.arguments) {
          if (containsNarrowableReference(argument)) {
            return true;
          }
        }
      }
      if (expr.expression.kind === Syntax.PropertyAccessExpression && containsNarrowableReference((<PropertyAccessExpression>expr.expression).expression)) {
        return true;
      }
      return false;
    }

    function isNarrowingTypeofOperands(expr1: Expression, expr2: Expression) {
      return Node.is.kind(TypeOfExpression, expr1) && isNarrowableOperand(expr1.expression) && StringLiteral.like(expr2);
    }

    function isNarrowableInOperands(left: Expression, right: Expression) {
      return StringLiteral.like(left) && isNarrowingExpression(right);
    }

    function isNarrowingBinaryExpression(expr: BinaryExpression) {
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

    function isNarrowableOperand(expr: Expression): boolean {
      switch (expr.kind) {
        case Syntax.ParenthesizedExpression:
          return isNarrowableOperand((<ParenthesizedExpression>expr).expression);
        case Syntax.BinaryExpression:
          switch ((<BinaryExpression>expr).operatorToken.kind) {
            case Syntax.EqualsToken:
              return isNarrowableOperand((<BinaryExpression>expr).left);
            case Syntax.CommaToken:
              return isNarrowableOperand((<BinaryExpression>expr).right);
          }
      }
      return containsNarrowableReference(expr);
    }

    function createBranchLabel(): FlowLabel {
      return initFlowNode({ flags: FlowFlags.BranchLabel, antecedents: undefined });
    }

    function createLoopLabel(): FlowLabel {
      return initFlowNode({ flags: FlowFlags.LoopLabel, antecedents: undefined });
    }

    function createReduceLabel(target: FlowLabel, antecedents: FlowNode[], antecedent: FlowNode): FlowReduceLabel {
      return initFlowNode({ flags: FlowFlags.ReduceLabel, target, antecedents, antecedent });
    }

    function setFlowNodeReferenced(flow: FlowNode) {
      // On first reference we set the Referenced flag, thereafter we set the Shared flag
      flow.flags |= flow.flags & FlowFlags.Referenced ? FlowFlags.Shared : FlowFlags.Referenced;
    }

    function addAntecedent(label: FlowLabel, antecedent: FlowNode): void {
      if (!(antecedent.flags & FlowFlags.Unreachable) && !contains(label.antecedents, antecedent)) {
        (label.antecedents || (label.antecedents = [])).push(antecedent);
        setFlowNodeReferenced(antecedent);
      }
    }

    function createFlowCondition(flags: FlowFlags, antecedent: FlowNode, expression: Expression | undefined): FlowNode {
      if (antecedent.flags & FlowFlags.Unreachable) {
        return antecedent;
      }
      if (!expression) {
        return flags & FlowFlags.TrueCondition ? antecedent : unreachableFlow;
      }
      if (
        ((expression.kind === Syntax.TrueKeyword && flags & FlowFlags.FalseCondition) || (expression.kind === Syntax.FalseKeyword && flags & FlowFlags.TrueCondition)) &&
        !Node.is.expressionOfOptionalChainRoot(expression) &&
        !Node.is.nullishCoalesce(expression.parent)
      ) {
        return unreachableFlow;
      }
      if (!isNarrowingExpression(expression)) {
        return antecedent;
      }
      setFlowNodeReferenced(antecedent);
      return initFlowNode({ flags, antecedent, node: expression });
    }

    function createFlowSwitchClause(antecedent: FlowNode, switchStatement: SwitchStatement, clauseStart: number, clauseEnd: number): FlowNode {
      setFlowNodeReferenced(antecedent);
      return initFlowNode({ flags: FlowFlags.SwitchClause, antecedent, switchStatement, clauseStart, clauseEnd });
    }

    function createFlowMutation(flags: FlowFlags, antecedent: FlowNode, node: Expression | VariableDeclaration | ArrayBindingElement): FlowNode {
      setFlowNodeReferenced(antecedent);
      const result = initFlowNode({ flags, antecedent, node });
      if (currentExceptionTarget) {
        addAntecedent(currentExceptionTarget, result);
      }
      return result;
    }

    function createFlowCall(antecedent: FlowNode, node: CallExpression): FlowNode {
      setFlowNodeReferenced(antecedent);
      return initFlowNode({ flags: FlowFlags.Call, antecedent, node });
    }

    function finishFlowLabel(flow: FlowLabel): FlowNode {
      const antecedents = flow.antecedents;
      if (!antecedents) {
        return unreachableFlow;
      }
      if (antecedents.length === 1) {
        return antecedents[0];
      }
      return flow;
    }

    function isStatementCondition(node: Node) {
      const parent = node.parent;
      switch (parent.kind) {
        case Syntax.IfStatement:
        case Syntax.WhileStatement:
        case Syntax.DoStatement:
          return (<IfStatement | WhileStatement | DoStatement>parent).expression === node;
        case Syntax.ForStatement:
        case Syntax.ConditionalExpression:
          return (<ForStatement | ConditionalExpression>parent).condition === node;
      }
      return false;
    }

    function isLogicalExpression(node: Node) {
      while (true) {
        if (node.kind === Syntax.ParenthesizedExpression) {
          node = (<ParenthesizedExpression>node).expression;
        } else if (node.kind === Syntax.PrefixUnaryExpression && (<PrefixUnaryExpression>node).operator === Syntax.ExclamationToken) {
          node = (<PrefixUnaryExpression>node).operand;
        } else {
          return (
            node.kind === Syntax.BinaryExpression &&
            ((<BinaryExpression>node).operatorToken.kind === Syntax.Ampersand2Token ||
              (<BinaryExpression>node).operatorToken.kind === Syntax.Bar2Token ||
              (<BinaryExpression>node).operatorToken.kind === Syntax.Question2Token)
          );
        }
      }
    }

    function isTopLevelLogicalExpression(node: Node): boolean {
      while (Node.is.kind(ParenthesizedExpression, node.parent) || (Node.is.kind(PrefixUnaryExpression, node.parent) && node.parent.operator === Syntax.ExclamationToken)) {
        node = node.parent;
      }
      return !isStatementCondition(node) && !isLogicalExpression(node.parent) && !(Node.is.optionalChain(node.parent) && node.parent.expression === node);
    }

    function doWithConditionalBranches<T>(action: (value: T) => void, value: T, trueTarget: FlowLabel, falseTarget: FlowLabel) {
      const savedTrueTarget = currentTrueTarget;
      const savedFalseTarget = currentFalseTarget;
      currentTrueTarget = trueTarget;
      currentFalseTarget = falseTarget;
      action(value);
      currentTrueTarget = savedTrueTarget;
      currentFalseTarget = savedFalseTarget;
    }

    function bindCondition(node: Expression | undefined, trueTarget: FlowLabel, falseTarget: FlowLabel) {
      doWithConditionalBranches(bind, node, trueTarget, falseTarget);
      if (!node || (!isLogicalExpression(node) && !(Node.is.optionalChain(node) && isOutermostOptionalChain(node)))) {
        addAntecedent(trueTarget, createFlowCondition(FlowFlags.TrueCondition, currentFlow, node));
        addAntecedent(falseTarget, createFlowCondition(FlowFlags.FalseCondition, currentFlow, node));
      }
    }

    function bindIterativeStatement(node: Statement, breakTarget: FlowLabel, continueTarget: FlowLabel): void {
      const saveBreakTarget = currentBreakTarget;
      const saveContinueTarget = currentContinueTarget;
      currentBreakTarget = breakTarget;
      currentContinueTarget = continueTarget;
      bind(node);
      currentBreakTarget = saveBreakTarget;
      currentContinueTarget = saveContinueTarget;
    }

    function setContinueTarget(node: Node, target: FlowLabel) {
      let label = activeLabelList;
      while (label && node.parent.kind === Syntax.LabeledStatement) {
        label.continueTarget = target;
        label = label.next;
        node = node.parent;
      }
      return target;
    }

    function bindWhileStatement(node: WhileStatement): void {
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

    function bindDoStatement(node: DoStatement): void {
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

    function bindForStatement(node: ForStatement): void {
      const preLoopLabel = setContinueTarget(node, createLoopLabel());
      const preBodyLabel = createBranchLabel();
      const postLoopLabel = createBranchLabel();
      bind(node.initializer);
      addAntecedent(preLoopLabel, currentFlow);
      currentFlow = preLoopLabel;
      bindCondition(node.condition, preBodyLabel, postLoopLabel);
      currentFlow = finishFlowLabel(preBodyLabel);
      bindIterativeStatement(node.statement, postLoopLabel, preLoopLabel);
      bind(node.incrementor);
      addAntecedent(preLoopLabel, currentFlow);
      currentFlow = finishFlowLabel(postLoopLabel);
    }

    function bindForInOrForOfStatement(node: ForInOrOfStatement): void {
      const preLoopLabel = setContinueTarget(node, createLoopLabel());
      const postLoopLabel = createBranchLabel();
      bind(node.expression);
      addAntecedent(preLoopLabel, currentFlow);
      currentFlow = preLoopLabel;
      if (node.kind === Syntax.ForOfStatement) {
        bind(node.awaitModifier);
      }
      addAntecedent(postLoopLabel, currentFlow);
      bind(node.initializer);
      if (node.initializer.kind !== Syntax.VariableDeclarationList) {
        bindAssignmentTargetFlow(node.initializer);
      }
      bindIterativeStatement(node.statement, postLoopLabel, preLoopLabel);
      addAntecedent(preLoopLabel, currentFlow);
      currentFlow = finishFlowLabel(postLoopLabel);
    }

    function bindIfStatement(node: IfStatement): void {
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

    function bindReturnOrThrow(node: ReturnStatement | ThrowStatement): void {
      bind(node.expression);
      if (node.kind === Syntax.ReturnStatement) {
        hasExplicitReturn = true;
        if (currentReturnTarget) {
          addAntecedent(currentReturnTarget, currentFlow);
        }
      }
      currentFlow = unreachableFlow;
    }

    function findActiveLabel(name: __String) {
      for (let label = activeLabelList; label; label = label.next) {
        if (label.name === name) {
          return label;
        }
      }
      return;
    }

    function bindBreakOrContinueFlow(node: BreakOrContinueStatement, breakTarget: FlowLabel | undefined, continueTarget: FlowLabel | undefined) {
      const flowLabel = node.kind === Syntax.BreakStatement ? breakTarget : continueTarget;
      if (flowLabel) {
        addAntecedent(flowLabel, currentFlow);
        currentFlow = unreachableFlow;
      }
    }

    function bindBreakOrContinueStatement(node: BreakOrContinueStatement): void {
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

    function bindTryStatement(node: TryStatement): void {
      // We conservatively assume that *any* code in the try block can cause an exception, but we only need
      // to track code that causes mutations (because only mutations widen the possible control flow type of
      // a variable). The exceptionLabel is the target label for control flows that result from exceptions.
      // We add all mutation flow nodes as antecedents of this label such that we can analyze them as possible
      // antecedents of the start of catch or finally blocks. Furthermore, we add the current control flow to
      // represent exceptions that occur before any mutations.
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
        // Start of catch clause is the target of exceptions from try block.
        currentFlow = finishFlowLabel(exceptionLabel);
        // The currentExceptionTarget now represents control flows from exceptions in the catch clause.
        // Effectively, in a try-catch-finally, if an exception occurs in the try block, the catch block
        // acts like a second try block.
        exceptionLabel = createBranchLabel();
        addAntecedent(exceptionLabel, currentFlow);
        currentExceptionTarget = exceptionLabel;
        bind(node.catchClause);
        addAntecedent(normalExitLabel, currentFlow);
      }
      currentReturnTarget = saveReturnTarget;
      currentExceptionTarget = saveExceptionTarget;
      if (node.finallyBlock) {
        // Possible ways control can reach the finally block:
        // 1) Normal completion of try block of a try-finally or try-catch-finally
        // 2) Normal completion of catch block (following exception in try block) of a try-catch-finally
        // 3) Return in try or catch block of a try-finally or try-catch-finally
        // 4) Exception in try block of a try-finally
        // 5) Exception in catch block of a try-catch-finally
        // When analyzing a control flow graph that starts inside a finally block we want to consider all
        // five possibilities above. However, when analyzing a control flow graph that starts outside (past)
        // the finally block, we only want to consider the first two (if we're past a finally block then it
        // must have completed normally). Likewise, when analyzing a control flow graph from return statements
        // in try or catch blocks in an IIFE, we only want to consider the third. To make this possible, we
        // inject a ReduceLabel node into the control flow graph. This node contains an alternate reduced
        // set of antecedents for the pre-finally label. As control flow analysis passes by a ReduceLabel
        // node, the pre-finally label is temporarily switched to the reduced antecedent set.
        const finallyLabel = createBranchLabel();
        finallyLabel.antecedents = concatenate(concatenate(normalExitLabel.antecedents, exceptionLabel.antecedents), returnLabel.antecedents);
        currentFlow = finallyLabel;
        bind(node.finallyBlock);
        if (currentFlow.flags & FlowFlags.Unreachable) {
          // If the end of the finally block is unreachable, the end of the entire try statement is unreachable.
          currentFlow = unreachableFlow;
        } else {
          // If we have an IIFE return target and return statements in the try or catch blocks, add a control
          // flow that goes back through the finally block and back through only the return statements.
          if (currentReturnTarget && returnLabel.antecedents) {
            addAntecedent(currentReturnTarget, createReduceLabel(finallyLabel, returnLabel.antecedents, currentFlow));
          }
          // If the end of the finally block is reachable, but the end of the try and catch blocks are not,
          // convert the current flow to unreachable. For example, 'try { return 1; } finally { ... }' should
          // result in an unreachable current control flow.
          currentFlow = normalExitLabel.antecedents ? createReduceLabel(finallyLabel, normalExitLabel.antecedents, currentFlow) : unreachableFlow;
        }
      } else {
        currentFlow = finishFlowLabel(normalExitLabel);
      }
    }

    function bindSwitchStatement(node: SwitchStatement): void {
      const postSwitchLabel = createBranchLabel();
      bind(node.expression);
      const saveBreakTarget = currentBreakTarget;
      const savePreSwitchCaseFlow = preSwitchCaseFlow;
      currentBreakTarget = postSwitchLabel;
      preSwitchCaseFlow = currentFlow;
      bind(node.caseBlock);
      addAntecedent(postSwitchLabel, currentFlow);
      const hasDefault = forEach(node.caseBlock.clauses, (c) => c.kind === Syntax.DefaultClause);
      // We mark a switch statement as possibly exhaustive if it has no default clause and if all
      // case clauses have unreachable end points (e.g. they all return). Note, we no longer need
      // this property in control flow analysis, it's there only for backwards compatibility.
      node.possiblyExhaustive = !hasDefault && !postSwitchLabel.antecedents;
      if (!hasDefault) {
        addAntecedent(postSwitchLabel, createFlowSwitchClause(preSwitchCaseFlow, node, 0, 0));
      }
      currentBreakTarget = saveBreakTarget;
      preSwitchCaseFlow = savePreSwitchCaseFlow;
      currentFlow = finishFlowLabel(postSwitchLabel);
    }

    function bindCaseBlock(node: CaseBlock): void {
      const savedSubtreeTransformFlags = subtreeTransformFlags;
      subtreeTransformFlags = 0;
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
        if (!(currentFlow.flags & FlowFlags.Unreachable) && i !== clauses.length - 1 && options.noFallthroughCasesInSwitch) {
          clause.fallthroughFlowNode = currentFlow;
        }
      }
      clauses.transformFlags = subtreeTransformFlags | TransformFlags.HasComputedFlags;
      subtreeTransformFlags |= savedSubtreeTransformFlags;
    }

    function bindCaseClause(node: CaseClause): void {
      const saveCurrentFlow = currentFlow;
      currentFlow = preSwitchCaseFlow!;
      bind(node.expression);
      currentFlow = saveCurrentFlow;
      bindEach(node.statements);
    }

    function bindExpressionStatement(node: ExpressionStatement): void {
      bind(node.expression);
      // A top level call expression with a dotted function name and at least one argument
      // is potentially an assertion and is therefore included in the control flow.
      if (node.expression.kind === Syntax.CallExpression) {
        const call = <CallExpression>node.expression;
        if (isDottedName(call.expression) && call.expression.kind !== Syntax.SuperKeyword) {
          currentFlow = createFlowCall(currentFlow, call);
        }
      }
    }

    function bindLabeledStatement(node: LabeledStatement): void {
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
      if (!activeLabelList.referenced && !options.allowUnusedLabels) {
        errorOrSuggestionOnNode(unusedLabelIsError(options), node.label, Diagnostics.Unused_label);
      }
      activeLabelList = activeLabelList.next;
      addAntecedent(postStatementLabel, currentFlow);
      currentFlow = finishFlowLabel(postStatementLabel);
    }

    function bindDestructuringTargetFlow(node: Expression) {
      if (node.kind === Syntax.BinaryExpression && (<BinaryExpression>node).operatorToken.kind === Syntax.EqualsToken) {
        bindAssignmentTargetFlow((<BinaryExpression>node).left);
      } else {
        bindAssignmentTargetFlow(node);
      }
    }

    function bindAssignmentTargetFlow(node: Expression) {
      if (isNarrowableReference(node)) {
        currentFlow = createFlowMutation(FlowFlags.Assignment, currentFlow, node);
      } else if (node.kind === Syntax.ArrayLiteralExpression) {
        for (const e of (<ArrayLiteralExpression>node).elements) {
          if (e.kind === Syntax.SpreadElement) {
            bindAssignmentTargetFlow((<SpreadElement>e).expression);
          } else {
            bindDestructuringTargetFlow(e);
          }
        }
      } else if (node.kind === Syntax.ObjectLiteralExpression) {
        for (const p of (<ObjectLiteralExpression>node).properties) {
          if (p.kind === Syntax.PropertyAssignment) {
            bindDestructuringTargetFlow(p.initializer);
          } else if (p.kind === Syntax.ShorthandPropertyAssignment) {
            bindAssignmentTargetFlow(p.name);
          } else if (p.kind === Syntax.SpreadAssignment) {
            bindAssignmentTargetFlow(p.expression);
          }
        }
      }
    }

    function bindLogicalExpression(node: BinaryExpression, trueTarget: FlowLabel, falseTarget: FlowLabel) {
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

    function bindPrefixUnaryExpressionFlow(node: PrefixUnaryExpression) {
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

    function bindPostfixUnaryExpressionFlow(node: PostfixUnaryExpression) {
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

    function bindBinaryExpressionFlow(node: BinaryExpression) {
      const workStacks: {
        expr: BinaryExpression[];
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
            // This state is used only when recuring, to emulate the work that `bind` does before
            // reaching `bindChildren`. A normal call to `bindBinaryExpressionFlow` will already have done this work.
            node.parent = parent;
            const saveInStrictMode = inStrictMode;
            bindWorker(node);
            const saveParent = parent;
            parent = node;

            let subtreeFlagsState: number | undefined;
            // While this next part does the work of `bindChildren` before it descends into `bindChildrenWorker`
            // and uses `subtreeFlagsState` to queue up the work that needs to be done once the node is bound.
            if (skipTransformFlagAggregation) {
              // do nothing extra
            } else if (node.transformFlags & TransformFlags.HasComputedFlags) {
              skipTransformFlagAggregation = true;
              subtreeFlagsState = -1;
            } else {
              const savedSubtreeTransformFlags = subtreeTransformFlags;
              subtreeTransformFlags = 0;
              subtreeFlagsState = savedSubtreeTransformFlags;
            }

            advanceState(BindBinaryExpressionFlowState.MaybeBindLeft, saveInStrictMode, saveParent, subtreeFlagsState);
            break;
          }
          case BindBinaryExpressionFlowState.MaybeBindLeft: {
            const operator = node.operatorToken.kind;
            // TODO: bindLogicalExpression is recursive - if we want to handle deeply nested `&&` expressions
            // we'll need to handle the `bindLogicalExpression` scenarios in this state machine, too
            // For now, though, since the common cases are chained `+`, leaving it recursive is fine
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
            if (syntax.is.assignmentOperator(operator) && !isAssignmentTarget(node)) {
              bindAssignmentTargetFlow(node.left);
              if (operator === Syntax.EqualsToken && node.left.kind === Syntax.ElementAccessExpression) {
                const elementAccess = <ElementAccessExpression>node.left;
                if (isNarrowableOperand(elementAccess.expression)) {
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

      /**
       * Note that `advanceState` sets the _current_ head state, and that `maybeBind` potentially pushes on a new
       * head state; so `advanceState` must be called before any `maybeBind` during a state's execution.
       */
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
            subtreeTransformFlags |= node.transformFlags & ~getTransformFlagsSubtreeExclusions(node.kind);
          } else if (workStacks.subtreeFlags[stackIndex] !== undefined) {
            subtreeTransformFlags = workStacks.subtreeFlags[stackIndex]! | computeTransformFlagsForNode(node, subtreeTransformFlags);
          }
          inStrictMode = workStacks.inStrictMode[stackIndex]!;
          parent = workStacks.parent[stackIndex]!;
        }
        stackIndex--;
      }

      /**
       * If `node` is a BinaryExpression, adds it to the local work stack, otherwise recursively binds it
       */
      function maybeBind(node: Node) {
        if (node && Node.is.kind(BinaryExpression, node)) {
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

    function bindDeleteExpressionFlow(node: DeleteExpression) {
      bindEachChild(node);
      if (node.expression.kind === Syntax.PropertyAccessExpression) {
        bindAssignmentTargetFlow(node.expression);
      }
    }

    function bindConditionalExpressionFlow(node: ConditionalExpression) {
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

    function bindInitializedVariableFlow(node: VariableDeclaration | ArrayBindingElement) {
      const name = !Node.is.kind(OmittedExpression, node) ? node.name : undefined;
      if (Node.is.kind(BindingPattern, name)) {
        for (const child of name.elements) {
          bindInitializedVariableFlow(child);
        }
      } else {
        currentFlow = createFlowMutation(FlowFlags.Assignment, currentFlow, node);
      }
    }

    function bindVariableDeclarationFlow(node: VariableDeclaration) {
      bindEachChild(node);
      if (node.initializer || Node.is.forInOrOfStatement(node.parent.parent)) {
        bindInitializedVariableFlow(node);
      }
    }

    function bindJSDocTypeAlias(node: JSDocTypedefTag | JSDocCallbackTag | JSDocEnumTag) {
      node.tagName.parent = node;
      if (node.kind !== Syntax.JSDocEnumTag && node.fullName) {
        setParentPointers(node, node.fullName);
      }
    }

    function bindJSDocClassTag(node: JSDocClassTag) {
      bindEachChild(node);
      const host = getHostSignatureFromJSDoc(node);
      if (host && host.kind !== Syntax.MethodDeclaration) {
        addDeclarationToSymbol(host.symbol, host, SymbolFlags.Class);
      }
    }

    function bindOptionalExpression(node: Expression, trueTarget: FlowLabel, falseTarget: FlowLabel) {
      doWithConditionalBranches(bind, node, trueTarget, falseTarget);
      if (!Node.is.optionalChain(node) || isOutermostOptionalChain(node)) {
        addAntecedent(trueTarget, createFlowCondition(FlowFlags.TrueCondition, currentFlow, node));
        addAntecedent(falseTarget, createFlowCondition(FlowFlags.FalseCondition, currentFlow, node));
      }
    }

    function bindOptionalChainRest(node: OptionalChain) {
      switch (node.kind) {
        case Syntax.PropertyAccessExpression:
          bind(node.questionDotToken);
          bind(node.name);
          break;
        case Syntax.ElementAccessExpression:
          bind(node.questionDotToken);
          bind(node.argumentExpression);
          break;
        case Syntax.CallExpression:
          bind(node.questionDotToken);
          bindEach(node.typeArguments);
          bindEach(node.arguments);
          break;
      }
    }

    function bindOptionalChain(node: OptionalChain, trueTarget: FlowLabel, falseTarget: FlowLabel) {
      // For an optional chain, we emulate the behavior of a logical expression:
      //
      // a?.b         -> a && a.b
      // a?.b.c       -> a && a.b.c
      // a?.b?.c      -> a && a.b && a.b.c
      // a?.[x = 1]   -> a && a[x = 1]
      //
      // To do this we descend through the chain until we reach the root of a chain (the expression with a `?.`)
      // and build it's CFA graph as if it were the first condition (`a && ...`). Then we bind the rest
      // of the node as part of the "true" branch, and continue to do so as we ascend back up to the outermost
      // chain node. We then treat the entire node as the right side of the expression.
      const preChainLabel = Node.is.optionalChainRoot(node) ? createBranchLabel() : undefined;
      bindOptionalExpression(node.expression, preChainLabel || trueTarget, falseTarget);
      if (preChainLabel) {
        currentFlow = finishFlowLabel(preChainLabel);
      }
      doWithConditionalBranches(bindOptionalChainRest, node, trueTarget, falseTarget);
      if (isOutermostOptionalChain(node)) {
        addAntecedent(trueTarget, createFlowCondition(FlowFlags.TrueCondition, currentFlow, node));
        addAntecedent(falseTarget, createFlowCondition(FlowFlags.FalseCondition, currentFlow, node));
      }
    }

    function bindOptionalChainFlow(node: OptionalChain) {
      if (isTopLevelLogicalExpression(node)) {
        const postExpressionLabel = createBranchLabel();
        bindOptionalChain(node, postExpressionLabel, postExpressionLabel);
        currentFlow = finishFlowLabel(postExpressionLabel);
      } else {
        bindOptionalChain(node, currentTrueTarget!, currentFalseTarget!);
      }
    }

    function bindNonNullExpressionFlow(node: NonNullExpression | NonNullChain) {
      if (Node.is.optionalChain(node)) {
        bindOptionalChainFlow(node);
      } else {
        bindEachChild(node);
      }
    }

    function bindAccessExpressionFlow(node: AccessExpression | PropertyAccessChain | ElementAccessChain) {
      if (Node.is.optionalChain(node)) {
        bindOptionalChainFlow(node);
      } else {
        bindEachChild(node);
      }
    }

    function bindCallExpressionFlow(node: CallExpression | CallChain) {
      if (Node.is.optionalChain(node)) {
        bindOptionalChainFlow(node);
      } else {
        // If the target of the call expression is a function expression or arrow function we have
        // an immediately invoked function expression (IIFE). Initialize the flowNode property to
        // the current control flow (which includes evaluation of the IIFE arguments).
        const expr = skipParentheses(node.expression);
        if (expr.kind === Syntax.FunctionExpression || expr.kind === Syntax.ArrowFunction) {
          bindEach(node.typeArguments);
          bindEach(node.arguments);
          bind(node.expression);
        } else {
          bindEachChild(node);
          if (node.expression.kind === Syntax.SuperKeyword) {
            currentFlow = createFlowCall(currentFlow, node);
          }
        }
      }
      if (node.expression.kind === Syntax.PropertyAccessExpression) {
        const propertyAccess = <PropertyAccessExpression>node.expression;
        if (Node.is.kind(Identifier, propertyAccess.name) && isNarrowableOperand(propertyAccess.expression) && isPushOrUnshiftIdentifier(propertyAccess.name)) {
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
        case Syntax.TypeLiteral:
        case Syntax.JSDocTypeLiteral:
        case Syntax.JsxAttributes:
          return ContainerFlags.IsContainer;

        case Syntax.InterfaceDeclaration:
          return ContainerFlags.IsContainer | ContainerFlags.IsInterface;

        case Syntax.ModuleDeclaration:
        case Syntax.TypeAliasDeclaration:
        case Syntax.MappedType:
          return ContainerFlags.IsContainer | ContainerFlags.HasLocals;

        case Syntax.SourceFile:
          return ContainerFlags.IsContainer | ContainerFlags.IsControlFlowContainer | ContainerFlags.HasLocals;

        case Syntax.MethodDeclaration:
          if (Node.is.objectLiteralOrClassExpressionMethod(node)) {
            return (
              ContainerFlags.IsContainer | ContainerFlags.IsControlFlowContainer | ContainerFlags.HasLocals | ContainerFlags.IsFunctionLike | ContainerFlags.IsObjectLiteralOrClassExpressionMethod
            );
          }
        // falls through
        case Syntax.Constructor:
        case Syntax.FunctionDeclaration:
        case Syntax.MethodSignature:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
        case Syntax.CallSignature:
        case Syntax.JSDocSignature:
        case Syntax.JSDocFunctionType:
        case Syntax.FunctionType:
        case Syntax.ConstructSignature:
        case Syntax.IndexSignature:
        case Syntax.ConstructorType:
          return ContainerFlags.IsContainer | ContainerFlags.IsControlFlowContainer | ContainerFlags.HasLocals | ContainerFlags.IsFunctionLike;

        case Syntax.FunctionExpression:
        case Syntax.ArrowFunction:
          return ContainerFlags.IsContainer | ContainerFlags.IsControlFlowContainer | ContainerFlags.HasLocals | ContainerFlags.IsFunctionLike | ContainerFlags.IsFunctionExpression;

        case Syntax.ModuleBlock:
          return ContainerFlags.IsControlFlowContainer;
        case Syntax.PropertyDeclaration:
          return (<PropertyDeclaration>node).initializer ? ContainerFlags.IsControlFlowContainer : 0;

        case Syntax.CatchClause:
        case Syntax.ForStatement:
        case Syntax.ForInStatement:
        case Syntax.ForOfStatement:
        case Syntax.CaseBlock:
          return ContainerFlags.IsBlockScopedContainer;

        case Syntax.Block:
          // do not treat blocks directly inside a function as a block-scoped-container.
          // Locals that reside in this block should go to the function locals. Otherwise 'x'
          // would not appear to be a redeclaration of a block scoped local in the following
          // example:
          //
          //      function foo() {
          //          var x;
          //          let x;
          //      }
          //
          // If we placed 'var x' into the function locals and 'let x' into the locals of
          // the block, then there would be no collision.
          //
          // By not creating a new block-scoped-container here, we ensure that both 'var x'
          // and 'let x' go into the Function-container's locals, and we do get a collision
          // conflict.
          return Node.is.functionLike(node.parent) ? ContainerFlags.None : ContainerFlags.IsBlockScopedContainer;
      }

      return ContainerFlags.None;
    }

    function addToContainerChain(next: Node) {
      if (lastContainer) {
        lastContainer.nextContainer = next;
      }

      lastContainer = next;
    }

    function declareSymbolAndAddToSymbolTable(node: Declaration, symbolFlags: SymbolFlags, symbolExcludes: SymbolFlags): Symbol | undefined {
      switch (container.kind) {
        // Modules, source files, and classes need specialized handling for how their
        // members are declared (for example, a member of a class will go into a specific
        // symbol table depending on if it is static or not). We defer to specialized
        // handlers to take care of declaring these child members.
        case Syntax.ModuleDeclaration:
          return declareModuleMember(node, symbolFlags, symbolExcludes);

        case Syntax.SourceFile:
          return declareSourceFileMember(node, symbolFlags, symbolExcludes);

        case Syntax.ClassExpression:
        case Syntax.ClassDeclaration:
          return declareClassMember(node, symbolFlags, symbolExcludes);

        case Syntax.EnumDeclaration:
          return declareSymbol(container.symbol.exports!, container.symbol, node, symbolFlags, symbolExcludes);

        case Syntax.TypeLiteral:
        case Syntax.JSDocTypeLiteral:
        case Syntax.ObjectLiteralExpression:
        case Syntax.InterfaceDeclaration:
        case Syntax.JsxAttributes:
          // Interface/Object-types always have their children added to the 'members' of
          // their container. They are only accessible through an instance of their
          // container, and are never in scope otherwise (even inside the body of the
          // object / type / interface declaring them). An exception is type parameters,
          // which are in scope without qualification (similar to 'locals').
          return declareSymbol(container.symbol.members!, container.symbol, node, symbolFlags, symbolExcludes);

        case Syntax.FunctionType:
        case Syntax.ConstructorType:
        case Syntax.CallSignature:
        case Syntax.ConstructSignature:
        case Syntax.JSDocSignature:
        case Syntax.IndexSignature:
        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
        case Syntax.Constructor:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
        case Syntax.FunctionDeclaration:
        case Syntax.FunctionExpression:
        case Syntax.ArrowFunction:
        case Syntax.JSDocFunctionType:
        case Syntax.JSDocTypedefTag:
        case Syntax.JSDocCallbackTag:
        case Syntax.TypeAliasDeclaration:
        case Syntax.MappedType:
          // All the children of these container types are never visible through another
          // symbol (i.e. through another symbol's 'exports' or 'members').  Instead,
          // they're only accessed 'lexically' (i.e. from code that exists underneath
          // their container in the tree). To accomplish this, we simply add their declared
          // symbol to the 'locals' of the container.  These symbols can then be found as
          // the type checker walks up the containers, checking them for matching names.
          return declareSymbol(container.locals!, /*parent*/ undefined, node, symbolFlags, symbolExcludes);
      }
    }

    function declareClassMember(node: Declaration, symbolFlags: SymbolFlags, symbolExcludes: SymbolFlags) {
      return hasSyntacticModifier(node, ModifierFlags.Static)
        ? declareSymbol(container.symbol.exports!, container.symbol, node, symbolFlags, symbolExcludes)
        : declareSymbol(container.symbol.members!, container.symbol, node, symbolFlags, symbolExcludes);
    }

    function declareSourceFileMember(node: Declaration, symbolFlags: SymbolFlags, symbolExcludes: SymbolFlags) {
      return qp_isExternalModule(file) ? declareModuleMember(node, symbolFlags, symbolExcludes) : declareSymbol(file.locals!, /*parent*/ undefined, node, symbolFlags, symbolExcludes);
    }

    function hasExportDeclarations(node: ModuleDeclaration | SourceFile): boolean {
      const body = Node.is.kind(SourceFile, node) ? node : tryCast(node.body, isModuleBlock);
      return !!body && body.statements.some((s) => Node.is.kind(ExportDeclaration, s) || Node.is.kind(ExportAssignment, s));
    }

    function setExportContextFlag(node: ModuleDeclaration | SourceFile) {
      // A declaration source file or ambient module declaration that contains no export declarations (but possibly regular
      // declarations with export modifiers) is an export context in which declarations are implicitly exported.
      if (node.flags & NodeFlags.Ambient && !hasExportDeclarations(node)) {
        node.flags |= NodeFlags.ExportContext;
      } else {
        node.flags &= ~NodeFlags.ExportContext;
      }
    }

    function bindModuleDeclaration(node: ModuleDeclaration) {
      setExportContextFlag(node);
      if (Node.is.ambientModule(node)) {
        if (hasSyntacticModifier(node, ModifierFlags.Export)) {
          errorOnFirstToken(node, Diagnostics.export_modifier_cannot_be_applied_to_ambient_modules_and_module_augmentations_since_they_are_always_visible);
        }
        if (Node.is.moduleAugmentationExternal(node)) {
          declareModuleSymbol(node);
        } else {
          let pattern: Pattern | undefined;
          if (node.name.kind === Syntax.StringLiteral) {
            const { text } = node.name;
            if (hasZeroOrOneAsteriskCharacter(text)) {
              pattern = tryParsePattern(text);
            } else {
              errorOnFirstToken(node.name, Diagnostics.Pattern_0_can_have_at_most_one_Asterisk_character, text);
            }
          }

          const symbol = declareSymbolAndAddToSymbolTable(node, SymbolFlags.ValueModule, SymbolFlags.ValueModuleExcludes)!;
          file.patternAmbientModules = append<PatternAmbientModule>(file.patternAmbientModules, pattern && { pattern, symbol });
        }
      } else {
        const state = declareModuleSymbol(node);
        if (state !== ModuleInstanceState.NonInstantiated) {
          const { symbol } = node;
          // if module was already merged with some function, class or non-const enum, treat it as non-const-enum-only
          symbol.constEnumOnlyModule =
            !(symbol.flags & (SymbolFlags.Function | SymbolFlags.Class | SymbolFlags.RegularEnum)) &&
            // Current must be `const enum` only
            state === ModuleInstanceState.ConstEnumOnly &&
            // Can't have been set to 'false' in a previous merged symbol. ('undefined' OK)
            symbol.constEnumOnlyModule !== false;
        }
      }
    }

    function declareModuleSymbol(node: ModuleDeclaration): ModuleInstanceState {
      const state = getModuleInstanceState(node);
      const instantiated = state !== ModuleInstanceState.NonInstantiated;
      declareSymbolAndAddToSymbolTable(
        node,
        instantiated ? SymbolFlags.ValueModule : SymbolFlags.NamespaceModule,
        instantiated ? SymbolFlags.ValueModuleExcludes : SymbolFlags.NamespaceModuleExcludes
      );
      return state;
    }

    function bindFunctionOrConstructorType(node: SignatureDeclaration | JSDocSignature): void {
      // For a given function symbol "<...>(...) => T" we want to generate a symbol identical
      // to the one we would get for: { <...>(...): T }
      //
      // We do that by making an anonymous type literal symbol, and then setting the function
      // symbol as its sole member. To the rest of the system, this symbol will be indistinguishable
      // from an actual type literal symbol you would have gotten had you used the long form.
      const symbol = new QSymbol(SymbolFlags.Signature, getDeclarationName(node)!); // TODO: GH#18217
      addDeclarationToSymbol(symbol, node, SymbolFlags.Signature);

      const typeLiteralSymbol = new QSymbol(SymbolFlags.TypeLiteral, InternalSymbolName.Type);
      addDeclarationToSymbol(typeLiteralSymbol, node, SymbolFlags.TypeLiteral);
      typeLiteralSymbol.members = new SymbolTable();
      typeLiteralSymbol.members.set(symbol.escName, symbol);
    }

    function bindObjectLiteralExpression(node: ObjectLiteralExpression) {
      const enum ElementKind {
        Property = 1,
        Accessor = 2,
      }

      if (inStrictMode && !isAssignmentTarget(node)) {
        const seen = createUnderscoreEscapedMap<ElementKind>();

        for (const prop of node.properties) {
          if (prop.kind === Syntax.SpreadAssignment || prop.name.kind !== Syntax.Identifier) {
            continue;
          }

          const identifier = prop.name;

          // ECMA-262 11.1.5 Object Initializer
          // If previous is not undefined then throw a SyntaxError exception if any of the following conditions are true
          // a.This production is contained in strict code and IsDataDescriptor(previous) is true and
          // IsDataDescriptor(propId.descriptor) is true.
          //    b.IsDataDescriptor(previous) is true and IsAccessorDescriptor(propId.descriptor) is true.
          //    c.IsAccessorDescriptor(previous) is true and IsDataDescriptor(propId.descriptor) is true.
          //    d.IsAccessorDescriptor(previous) is true and IsAccessorDescriptor(propId.descriptor) is true
          // and either both previous and propId.descriptor have[[Get]] fields or both previous and propId.descriptor have[[Set]] fields
          const currentKind =
            prop.kind === Syntax.PropertyAssignment || prop.kind === Syntax.ShorthandPropertyAssignment || prop.kind === Syntax.MethodDeclaration ? ElementKind.Property : ElementKind.Accessor;

          const existingKind = seen.get(identifier.escapedText);
          if (!existingKind) {
            seen.set(identifier.escapedText, currentKind);
            continue;
          }

          if (currentKind === ElementKind.Property && existingKind === ElementKind.Property) {
            const span = getErrorSpanForNode(file, identifier);
            file.bindDiagnostics.push(createFileDiagnostic(file, span.start, span.length, Diagnostics.An_object_literal_cannot_have_multiple_properties_with_the_same_name_in_strict_mode));
          }
        }
      }

      return bindAnonymousDeclaration(node, SymbolFlags.ObjectLiteral, InternalSymbolName.Object);
    }

    function bindJsxAttributes(node: JsxAttributes) {
      return bindAnonymousDeclaration(node, SymbolFlags.ObjectLiteral, InternalSymbolName.JSXAttributes);
    }

    function bindJsxAttribute(node: JsxAttribute, symbolFlags: SymbolFlags, symbolExcludes: SymbolFlags) {
      return declareSymbolAndAddToSymbolTable(node, symbolFlags, symbolExcludes);
    }

    function bindAnonymousDeclaration(node: Declaration, symbolFlags: SymbolFlags, name: __String) {
      const symbol = new QSymbol(symbolFlags, name);
      if (symbolFlags & (SymbolFlags.EnumMember | SymbolFlags.ClassMember)) {
        symbol.parent = container.symbol;
      }
      addDeclarationToSymbol(symbol, node, symbolFlags);
      return symbol;
    }

    function bindBlockScopedDeclaration(node: Declaration, symbolFlags: SymbolFlags, symbolExcludes: SymbolFlags) {
      switch (blockScopeContainer.kind) {
        case Syntax.ModuleDeclaration:
          declareModuleMember(node, symbolFlags, symbolExcludes);
          break;
        case Syntax.SourceFile:
          if (isExternalOrCommonJsModule(<SourceFile>container)) {
            declareModuleMember(node, symbolFlags, symbolExcludes);
            break;
          }
        // falls through
        default:
          if (!blockScopeContainer.locals) {
            blockScopeContainer.locals = new SymbolTable();
            addToContainerChain(blockScopeContainer);
          }
          declareSymbol(blockScopeContainer.locals, /*parent*/ undefined, node, symbolFlags, symbolExcludes);
      }
    }

    function delayedBindJSDocTypedefTag() {
      if (!delayedTypeAliases) {
        return;
      }
      const saveContainer = container;
      const saveLastContainer = lastContainer;
      const saveBlockScopeContainer = blockScopeContainer;
      const saveParent = parent;
      const saveCurrentFlow = currentFlow;
      for (const typeAlias of delayedTypeAliases) {
        const host = Node.getJSDoc.host(typeAlias);
        container = Node.findAncestor(host.parent, (n) => !!(getContainerFlags(n) & ContainerFlags.IsContainer)) || file;
        blockScopeContainer = Node.get.enclosingBlockScopeContainer(host) || file;
        currentFlow = initFlowNode({ flags: FlowFlags.Start });
        parent = typeAlias;
        bind(typeAlias.typeExpression);
        const declName = getNameOfDeclaration(typeAlias);
        if ((Node.is.kind(JSDocEnumTag, typeAlias) || !typeAlias.fullName) && declName && isPropertyAccessEntityNameExpression(declName.parent)) {
          // typedef anchored to an A.B.C assignment - we need to bind into B's namespace under name C
          const isTopLevel = isTopLevelNamespaceAssignment(declName.parent);
          if (isTopLevel) {
            bindPotentiallyMissingNamespaces(
              file.symbol,
              declName.parent,
              isTopLevel,
              !!Node.findAncestor(declName, (d) => Node.is.kind(PropertyAccessExpression, d) && d.name.escapedText === 'prototype'),
              /*containerIsClass*/ false
            );
            const oldContainer = container;
            switch (getAssignmentDeclarationPropertyAccessKind(declName.parent)) {
              case AssignmentDeclarationKind.ExportsProperty:
              case AssignmentDeclarationKind.ModuleExports:
                if (!isExternalOrCommonJsModule(file)) {
                  container = undefined!;
                } else {
                  container = file;
                }
                break;
              case AssignmentDeclarationKind.ThisProperty:
                container = declName.parent.expression;
                break;
              case AssignmentDeclarationKind.PrototypeProperty:
                container = (declName.parent.expression as PropertyAccessExpression).name;
                break;
              case AssignmentDeclarationKind.Property:
                container = isExportsOrModuleExportsOrAlias(file, declName.parent.expression)
                  ? file
                  : Node.is.kind(PropertyAccessExpression, declName.parent.expression)
                  ? declName.parent.expression.name
                  : declName.parent.expression;
                break;
              case AssignmentDeclarationKind.None:
                return fail("Shouldn't have detected typedef or enum on non-assignment declaration");
            }
            if (container) {
              declareModuleMember(typeAlias, SymbolFlags.TypeAlias, SymbolFlags.TypeAliasExcludes);
            }
            container = oldContainer;
          }
        } else if (Node.is.kind(JSDocEnumTag, typeAlias) || !typeAlias.fullName || typeAlias.fullName.kind === Syntax.Identifier) {
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

    // The binder visits every node in the syntax tree so it is a convenient place to perform a single localized
    // check for reserved words used as identifiers in strict mode code.
    function checkStrictModeIdentifier(node: Identifier) {
      if (
        inStrictMode &&
        node.originalKeywordKind! >= Syntax.FirstFutureReservedWord &&
        node.originalKeywordKind! <= Syntax.LastFutureReservedWord &&
        !isIdentifierName(node) &&
        !(node.flags & NodeFlags.Ambient) &&
        !(node.flags & NodeFlags.JSDoc)
      ) {
        // Report error only if there are no parse errors in file
        if (!file.parseDiagnostics.length) {
          file.bindDiagnostics.push(createDiagnosticForNode(node, getStrictModeIdentifierMessage(node), declarationNameToString(node)));
        }
      }
    }

    function getStrictModeIdentifierMessage(node: Node) {
      // Provide specialized messages to help the user understand why we think they're in
      // strict mode.
      if (Node.get.containingClass(node)) {
        return Diagnostics.Identifier_expected_0_is_a_reserved_word_in_strict_mode_Class_definitions_are_automatically_in_strict_mode;
      }

      if (file.externalModuleIndicator) {
        return Diagnostics.Identifier_expected_0_is_a_reserved_word_in_strict_mode_Modules_are_automatically_in_strict_mode;
      }

      return Diagnostics.Identifier_expected_0_is_a_reserved_word_in_strict_mode;
    }

    // The binder visits every node, so this is a good place to check for
    // the reserved private name (there is only one)
    function checkPrivateIdentifier(node: PrivateIdentifier) {
      if (node.escapedText === '#constructor') {
        // Report error only if there are no parse errors in file
        if (!file.parseDiagnostics.length) {
          file.bindDiagnostics.push(createDiagnosticForNode(node, Diagnostics.constructor_is_a_reserved_word, declarationNameToString(node)));
        }
      }
    }

    function checkStrictModeBinaryExpression(node: BinaryExpression) {
      if (inStrictMode && Node.is.leftHandSideExpression(node.left) && syntax.is.assignmentOperator(node.operatorToken.kind)) {
        // ECMA 262 (Annex C) The identifier eval or arguments may not appear as the LeftHandSideExpression of an
        // Assignment operator(11.13) or of a PostfixExpression(11.3)
        checkStrictModeEvalOrArguments(node, <Identifier>node.left);
      }
    }

    function checkStrictModeCatchClause(node: CatchClause) {
      // It is a SyntaxError if a TryStatement with a Catch occurs within strict code and the Identifier of the
      // Catch production is eval or arguments
      if (inStrictMode && node.variableDeclaration) {
        checkStrictModeEvalOrArguments(node, node.variableDeclaration.name);
      }
    }

    function checkStrictModeDeleteExpression(node: DeleteExpression) {
      // Grammar checking
      if (inStrictMode && node.expression.kind === Syntax.Identifier) {
        // When a delete operator occurs within strict mode code, a SyntaxError is thrown if its
        // UnaryExpression is a direct reference to a variable, function argument, or function name
        const span = getErrorSpanForNode(file, node.expression);
        file.bindDiagnostics.push(createFileDiagnostic(file, span.start, span.length, Diagnostics.delete_cannot_be_called_on_an_identifier_in_strict_mode));
      }
    }

    function isEvalOrArgumentsIdentifier(node: Node): boolean {
      return Node.is.kind(Identifier, node) && (node.escapedText === 'eval' || node.escapedText === 'arguments');
    }

    function checkStrictModeEvalOrArguments(contextNode: Node, name: Node | undefined) {
      if (name && name.kind === Syntax.Identifier) {
        const identifier = <Identifier>name;
        if (isEvalOrArgumentsIdentifier(identifier)) {
          // We check first if the name is inside class declaration or class expression; if so give explicit message
          // otherwise report generic error message.
          const span = getErrorSpanForNode(file, name);
          file.bindDiagnostics.push(createFileDiagnostic(file, span.start, span.length, getStrictModeEvalOrArgumentsMessage(contextNode), idText(identifier)));
        }
      }
    }

    function getStrictModeEvalOrArgumentsMessage(node: Node) {
      // Provide specialized messages to help the user understand why we think they're in
      // strict mode.
      if (Node.get.containingClass(node)) {
        return Diagnostics.Invalid_use_of_0_Class_definitions_are_automatically_in_strict_mode;
      }

      if (file.externalModuleIndicator) {
        return Diagnostics.Invalid_use_of_0_Modules_are_automatically_in_strict_mode;
      }

      return Diagnostics.Invalid_use_of_0_in_strict_mode;
    }

    function checkStrictModeFunctionName(node: FunctionLikeDeclaration) {
      if (inStrictMode) {
        // It is a SyntaxError if the identifier eval or arguments appears within a FormalParameterList of a strict mode FunctionDeclaration or FunctionExpression (13.1))
        checkStrictModeEvalOrArguments(node, node.name);
      }
    }

    function getStrictModeBlockScopeFunctionDeclarationMessage(node: Node) {
      // Provide specialized messages to help the user understand why we think they're in
      // strict mode.
      if (Node.get.containingClass(node)) {
        return Diagnostics.Function_declarations_are_not_allowed_inside_blocks_in_strict_mode_when_targeting_ES3_or_ES5_Class_definitions_are_automatically_in_strict_mode;
      }

      if (file.externalModuleIndicator) {
        return Diagnostics.Function_declarations_are_not_allowed_inside_blocks_in_strict_mode_when_targeting_ES3_or_ES5_Modules_are_automatically_in_strict_mode;
      }

      return Diagnostics.Function_declarations_are_not_allowed_inside_blocks_in_strict_mode_when_targeting_ES3_or_ES5;
    }

    function checkStrictModeFunctionDeclaration(node: FunctionDeclaration) {
      if (languageVersion < ScriptTarget.ES2015) {
        // Report error if function is not top level function declaration
        if (blockScopeContainer.kind !== Syntax.SourceFile && blockScopeContainer.kind !== Syntax.ModuleDeclaration && !Node.is.functionLike(blockScopeContainer)) {
          // We check first if the name is inside class declaration or class expression; if so give explicit message
          // otherwise report generic error message.
          const errorSpan = getErrorSpanForNode(file, node);
          file.bindDiagnostics.push(createFileDiagnostic(file, errorSpan.start, errorSpan.length, getStrictModeBlockScopeFunctionDeclarationMessage(node)));
        }
      }
    }

    function checkStrictModeNumericLiteral(node: NumericLiteral) {
      if (inStrictMode && node.numericLiteralFlags & TokenFlags.Octal) {
        file.bindDiagnostics.push(createDiagnosticForNode(node, Diagnostics.Octal_literals_are_not_allowed_in_strict_mode));
      }
    }

    function checkStrictModePostfixUnaryExpression(node: PostfixUnaryExpression) {
      // Grammar checking
      // The identifier eval or arguments may not appear as the LeftHandSideExpression of an
      // Assignment operator(11.13) or of a PostfixExpression(11.3) or as the UnaryExpression
      // operated upon by a Prefix Increment(11.4.4) or a Prefix Decrement(11.4.5) operator.
      if (inStrictMode) {
        checkStrictModeEvalOrArguments(node, <Identifier>node.operand);
      }
    }

    function checkStrictModePrefixUnaryExpression(node: PrefixUnaryExpression) {
      // Grammar checking
      if (inStrictMode) {
        if (node.operator === Syntax.Plus2Token || node.operator === Syntax.Minus2Token) {
          checkStrictModeEvalOrArguments(node, <Identifier>node.operand);
        }
      }
    }

    function checkStrictModeWithStatement(node: WithStatement) {
      // Grammar checking for withStatement
      if (inStrictMode) {
        errorOnFirstToken(node, Diagnostics.with_statements_are_not_allowed_in_strict_mode);
      }
    }

    function checkStrictModeLabeledStatement(node: LabeledStatement) {
      // Grammar checking for labeledStatement
      if (inStrictMode && options.target! >= ScriptTarget.ES2015) {
        if (Node.is.declarationStatement(node.statement) || Node.is.kind(VariableStatement, node.statement)) {
          errorOnFirstToken(node.label, Diagnostics.A_label_is_not_allowed_here);
        }
      }
    }

    function errorOnFirstToken(node: Node, message: DiagnosticMessage, arg0?: any, arg1?: any, arg2?: any) {
      const span = getSpanOfTokenAtPosition(file, node.pos);
      file.bindDiagnostics.push(createFileDiagnostic(file, span.start, span.length, message, arg0, arg1, arg2));
    }

    function errorOrSuggestionOnNode(isError: boolean, node: Node, message: DiagnosticMessage): void {
      errorOrSuggestionOnRange(isError, node, node, message);
    }

    function errorOrSuggestionOnRange(isError: boolean, startNode: Node, endNode: Node, message: DiagnosticMessage): void {
      addErrorOrSuggestionDiagnostic(isError, { pos: getTokenPosOfNode(startNode, file), end: endNode.end }, message);
    }

    function addErrorOrSuggestionDiagnostic(isError: boolean, range: TextRange, message: DiagnosticMessage): void {
      const diag = createFileDiagnostic(file, range.pos, range.end - range.pos, message);
      if (isError) {
        file.bindDiagnostics.push(diag);
      } else {
        file.bindSuggestionDiagnostics = append(file.bindSuggestionDiagnostics, { ...diag, category: DiagnosticCategory.Suggestion });
      }
    }

    function bind(node: Node | undefined): void {
      if (!node) {
        return;
      }
      node.parent = parent;
      const saveInStrictMode = inStrictMode;

      // Even though in the AST the jsdoc @typedef node belongs to the current node,
      // its symbol might be in the same scope with the current node's symbol. Consider:
      //
      //     /** @typedef {string | number} MyType */
      //     function foo();
      //
      // Here the current node is "foo", which is a container, but the scope of "MyType" should
      // not be inside "foo". Therefore we always bind @typedef before bind the parent node,
      // and skip binding this tag later when binding all the other jsdoc tags.

      // First we bind declaration nodes to a symbol if possible. We'll both create a symbol
      // and then potentially add the symbol to an appropriate symbol table. Possible
      // destination symbol tables are:
      //
      //  1) The 'exports' table of the current container's symbol.
      //  2) The 'members' table of the current container's symbol.
      //  3) The 'locals' table of the current container.
      //
      // However, not all symbols will end up in any of these tables. 'Anonymous' symbols
      // (like TypeLiterals for example) will not be put in any table.
      bindWorker(node);
      // Then we recurse into the children of the node to bind them as well. For certain
      // symbols we do specialized work when we recurse. For example, we'll keep track of
      // the current 'container' node when it changes. This helps us know which symbol table
      // a local should go into for example. Since terminal nodes are known not to have
      // children, as an optimization we don't process those.
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
      } else if (!skipTransformFlagAggregation && (node.transformFlags & TransformFlags.HasComputedFlags) === 0) {
        subtreeTransformFlags |= computeTransformFlagsForNode(node, 0);
        const saveParent = parent;
        if (node.kind === Syntax.EndOfFileToken) parent = node;
        bindJSDoc(node);
        parent = saveParent;
      }
      inStrictMode = saveInStrictMode;
    }

    function bindJSDoc(node: Node) {
      if (Node.is.withJSDocNodes(node)) {
        if (isInJSFile(node)) {
          for (const j of node.jsDoc!) {
            bind(j);
          }
        } else {
          for (const j of node.jsDoc!) {
            setParentPointers(node, j);
          }
        }
      }
    }

    function updateStrictModeStatementList(statements: Nodes<Statement>) {
      if (!inStrictMode) {
        for (const statement of statements) {
          if (!Node.is.prologueDirective(statement)) {
            return;
          }

          if (isUseStrictPrologueDirective(<ExpressionStatement>statement)) {
            inStrictMode = true;
            return;
          }
        }
      }
    }

    /// Should be called only on prologue directives (Node.is.prologueDirective(node) should be true)
    function isUseStrictPrologueDirective(node: ExpressionStatement): boolean {
      const nodeText = getSourceTextOfNodeFromSourceFile(file, node.expression);

      // Note: the node text must be exactly "use strict" or 'use strict'.  It is not ok for the
      // string to contain unicode escapes (as per ES5).
      return nodeText === '"use strict"' || nodeText === "'use strict'";
    }

    function bindWorker(node: Node) {
      switch (node.kind) {
        /* Strict mode checks */
        case Syntax.Identifier:
          // for typedef type names with namespaces, bind the new jsdoc type symbol here
          // because it requires all containing namespaces to be in effect, namely the
          // current "blockScopeContainer" needs to be set to its immediate namespace parent.
          if ((<Identifier>node).isInJSDocNamespace) {
            let parentNode = node.parent;
            while (parentNode && !Node.isJSDoc.typeAlias(parentNode)) {
              parentNode = parentNode.parent;
            }
            bindBlockScopedDeclaration(parentNode as Declaration, SymbolFlags.TypeAlias, SymbolFlags.TypeAliasExcludes);
            break;
          }
        // falls through
        case Syntax.ThisKeyword:
          if (currentFlow && (Node.is.expression(node) || parent.kind === Syntax.ShorthandPropertyAssignment)) {
            node.flowNode = currentFlow;
          }
          return checkStrictModeIdentifier(<Identifier>node);
        case Syntax.SuperKeyword:
          node.flowNode = currentFlow;
          break;
        case Syntax.PrivateIdentifier:
          return checkPrivateIdentifier(node as PrivateIdentifier);
        case Syntax.PropertyAccessExpression:
        case Syntax.ElementAccessExpression:
          const expr = node as PropertyAccessExpression | ElementAccessExpression;
          if (currentFlow && isNarrowableReference(expr)) {
            expr.flowNode = currentFlow;
          }
          if (isSpecialPropertyDeclaration(expr)) {
            bindSpecialPropertyDeclaration(expr);
          }
          if (isInJSFile(expr) && file.commonJsModuleIndicator && Node.is.moduleExportsAccessExpression(expr) && !lookupSymbolForNameWorker(blockScopeContainer, 'module' as __String)) {
            declareSymbol(file.locals!, /*parent*/ undefined, expr.expression, SymbolFlags.FunctionScopedVariable | SymbolFlags.ModuleExports, SymbolFlags.FunctionScopedVariableExcludes);
          }
          break;
        case Syntax.BinaryExpression:
          const specialKind = getAssignmentDeclarationKind(node as BinaryExpression);
          switch (specialKind) {
            case AssignmentDeclarationKind.ExportsProperty:
              bindExportsPropertyAssignment(node as BindableStaticPropertyAssignmentExpression);
              break;
            case AssignmentDeclarationKind.ModuleExports:
              bindModuleExportsAssignment(node as BindablePropertyAssignmentExpression);
              break;
            case AssignmentDeclarationKind.PrototypeProperty:
              bindPrototypePropertyAssignment((node as BindableStaticPropertyAssignmentExpression).left, node);
              break;
            case AssignmentDeclarationKind.Prototype:
              bindPrototypeAssignment(node as BindableStaticPropertyAssignmentExpression);
              break;
            case AssignmentDeclarationKind.ThisProperty:
              bindThNode.is.kind(PropertyAssignment, node as BindablePropertyAssignmentExpression);
              break;
            case AssignmentDeclarationKind.Property:
              bindSpecialPropertyAssignment(node as BindablePropertyAssignmentExpression);
              break;
            case AssignmentDeclarationKind.None:
              // Nothing to do
              break;
            default:
              fail('Unknown binary expression special property assignment kind');
          }
          return checkStrictModeBinaryExpression(<BinaryExpression>node);
        case Syntax.CatchClause:
          return checkStrictModeCatchClause(<CatchClause>node);
        case Syntax.DeleteExpression:
          return checkStrictModeDeleteExpression(<DeleteExpression>node);
        case Syntax.NumericLiteral:
          return checkStrictModeNumericLiteral(<NumericLiteral>node);
        case Syntax.PostfixUnaryExpression:
          return checkStrictModePostfixUnaryExpression(<PostfixUnaryExpression>node);
        case Syntax.PrefixUnaryExpression:
          return checkStrictModePrefixUnaryExpression(<PrefixUnaryExpression>node);
        case Syntax.WithStatement:
          return checkStrictModeWithStatement(<WithStatement>node);
        case Syntax.LabeledStatement:
          return checkStrictModeLabeledStatement(<LabeledStatement>node);
        case Syntax.ThisType:
          seenThisKeyword = true;
          return;
        case Syntax.TypePredicate:
          break; // Binding the children will handle everything
        case Syntax.TypeParameter:
          return bindTypeParameter(node as TypeParameterDeclaration);
        case Syntax.Parameter:
          return bindParameter(<ParameterDeclaration>node);
        case Syntax.VariableDeclaration:
          return bindVariableDeclarationOrBindingElement(<VariableDeclaration>node);
        case Syntax.BindingElement:
          node.flowNode = currentFlow;
          return bindVariableDeclarationOrBindingElement(<BindingElement>node);
        case Syntax.PropertyDeclaration:
        case Syntax.PropertySignature:
          return bindPropertyWorker(node as PropertyDeclaration | PropertySignature);
        case Syntax.PropertyAssignment:
        case Syntax.ShorthandPropertyAssignment:
          return bindPropertyOrMethodOrAccessor(<Declaration>node, SymbolFlags.Property, SymbolFlags.PropertyExcludes);
        case Syntax.EnumMember:
          return bindPropertyOrMethodOrAccessor(<Declaration>node, SymbolFlags.EnumMember, SymbolFlags.EnumMemberExcludes);

        case Syntax.CallSignature:
        case Syntax.ConstructSignature:
        case Syntax.IndexSignature:
          return declareSymbolAndAddToSymbolTable(<Declaration>node, SymbolFlags.Signature, SymbolFlags.None);
        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
          // If this is an ObjectLiteralExpression method, then it sits in the same space
          // as other properties in the object literal.  So we use SymbolFlags.PropertyExcludes
          // so that it will conflict with any other object literal members with the same
          // name.
          return bindPropertyOrMethodOrAccessor(
            <Declaration>node,
            SymbolFlags.Method | ((<MethodDeclaration>node).questionToken ? SymbolFlags.Optional : SymbolFlags.None),
            Node.is.objectLiteralMethod(node) ? SymbolFlags.PropertyExcludes : SymbolFlags.MethodExcludes
          );
        case Syntax.FunctionDeclaration:
          return bindFunctionDeclaration(<FunctionDeclaration>node);
        case Syntax.Constructor:
          return declareSymbolAndAddToSymbolTable(<Declaration>node, SymbolFlags.Constructor, /*symbolExcludes:*/ SymbolFlags.None);
        case Syntax.GetAccessor:
          return bindPropertyOrMethodOrAccessor(<Declaration>node, SymbolFlags.GetAccessor, SymbolFlags.GetAccessorExcludes);
        case Syntax.SetAccessor:
          return bindPropertyOrMethodOrAccessor(<Declaration>node, SymbolFlags.SetAccessor, SymbolFlags.SetAccessorExcludes);
        case Syntax.FunctionType:
        case Syntax.JSDocFunctionType:
        case Syntax.JSDocSignature:
        case Syntax.ConstructorType:
          return bindFunctionOrConstructorType(<SignatureDeclaration | JSDocSignature>node);
        case Syntax.TypeLiteral:
        case Syntax.JSDocTypeLiteral:
        case Syntax.MappedType:
          return bindAnonymousTypeWorker(node as TypeLiteralNode | MappedTypeNode | JSDocTypeLiteral);
        case Syntax.JSDocClassTag:
          return bindJSDocClassTag(node as JSDocClassTag);
        case Syntax.ObjectLiteralExpression:
          return bindObjectLiteralExpression(<ObjectLiteralExpression>node);
        case Syntax.FunctionExpression:
        case Syntax.ArrowFunction:
          return bindFunctionExpression(<FunctionExpression>node);

        case Syntax.CallExpression:
          const assignmentKind = getAssignmentDeclarationKind(node as CallExpression);
          switch (assignmentKind) {
            case AssignmentDeclarationKind.ObjectDefinePropertyValue:
              return bindObjectDefinePropertyAssignment(node as BindableObjectDefinePropertyCall);
            case AssignmentDeclarationKind.ObjectDefinePropertyExports:
              return bindObjectDefinePropertyExport(node as BindableObjectDefinePropertyCall);
            case AssignmentDeclarationKind.ObjectDefinePrototypeProperty:
              return bindObjectDefinePrototypeProperty(node as BindableObjectDefinePropertyCall);
            case AssignmentDeclarationKind.None:
              break; // Nothing to do
            default:
              return fail('Unknown call expression assignment declaration kind');
          }
          if (isInJSFile(node)) {
            bindCallExpression(<CallExpression>node);
          }
          break;

        // Members of classes, interfaces, and modules
        case Syntax.ClassExpression:
        case Syntax.ClassDeclaration:
          // All classes are automatically in strict mode in ES6.
          inStrictMode = true;
          return bindClassLikeDeclaration(<ClassLikeDeclaration>node);
        case Syntax.InterfaceDeclaration:
          return bindBlockScopedDeclaration(<Declaration>node, SymbolFlags.Interface, SymbolFlags.InterfaceExcludes);
        case Syntax.TypeAliasDeclaration:
          return bindBlockScopedDeclaration(<Declaration>node, SymbolFlags.TypeAlias, SymbolFlags.TypeAliasExcludes);
        case Syntax.EnumDeclaration:
          return bindEnumDeclaration(<EnumDeclaration>node);
        case Syntax.ModuleDeclaration:
          return bindModuleDeclaration(<ModuleDeclaration>node);
        // Jsx-attributes
        case Syntax.JsxAttributes:
          return bindJsxAttributes(<JsxAttributes>node);
        case Syntax.JsxAttribute:
          return bindJsxAttribute(<JsxAttribute>node, SymbolFlags.Property, SymbolFlags.PropertyExcludes);

        // Imports and exports
        case Syntax.ImportEqualsDeclaration:
        case Syntax.NamespaceImport:
        case Syntax.ImportSpecifier:
        case Syntax.ExportSpecifier:
          return declareSymbolAndAddToSymbolTable(<Declaration>node, SymbolFlags.Alias, SymbolFlags.AliasExcludes);
        case Syntax.NamespaceExportDeclaration:
          return bindNamespaceExportDeclaration(<NamespaceExportDeclaration>node);
        case Syntax.ImportClause:
          return bindImportClause(<ImportClause>node);
        case Syntax.ExportDeclaration:
          return bindExportDeclaration(<ExportDeclaration>node);
        case Syntax.ExportAssignment:
          return bindExportAssignment(<ExportAssignment>node);
        case Syntax.SourceFile:
          updateStrictModeStatementList((<SourceFile>node).statements);
          return bindSourceFileIfExternalModule();
        case Syntax.Block:
          if (!Node.is.functionLike(node.parent)) {
            return;
          }
        // falls through
        case Syntax.ModuleBlock:
          return updateStrictModeStatementList((<Block | ModuleBlock>node).statements);

        case Syntax.JSDocParameterTag:
          if (node.parent.kind === Syntax.JSDocSignature) {
            return bindParameter(node as JSDocParameterTag);
          }
          if (node.parent.kind !== Syntax.JSDocTypeLiteral) {
            break;
          }
        // falls through
        case Syntax.JSDocPropertyTag:
          const propTag = node as JSDocPropertyLikeTag;
          const flags =
            propTag.isBracketed || (propTag.typeExpression && propTag.typeExpression.type.kind === Syntax.JSDocOptionalType) ? SymbolFlags.Property | SymbolFlags.Optional : SymbolFlags.Property;
          return declareSymbolAndAddToSymbolTable(propTag, flags, SymbolFlags.PropertyExcludes);
        case Syntax.JSDocTypedefTag:
        case Syntax.JSDocCallbackTag:
        case Syntax.JSDocEnumTag:
          return (delayedTypeAliases || (delayedTypeAliases = [])).push(node as JSDocTypedefTag | JSDocCallbackTag | JSDocEnumTag);
      }
    }

    function bindPropertyWorker(node: PropertyDeclaration | PropertySignature) {
      return bindPropertyOrMethodOrAccessor(node, SymbolFlags.Property | (node.questionToken ? SymbolFlags.Optional : SymbolFlags.None), SymbolFlags.PropertyExcludes);
    }

    function bindAnonymousTypeWorker(node: TypeLiteralNode | MappedTypeNode | JSDocTypeLiteral) {
      return bindAnonymousDeclaration(<Declaration>node, SymbolFlags.TypeLiteral, InternalSymbolName.Type);
    }

    function bindSourceFileIfExternalModule() {
      setExportContextFlag(file);
      if (qp_isExternalModule(file)) {
        bindSourceFileAsExternalModule();
      } else if (isJsonSourceFile(file)) {
        bindSourceFileAsExternalModule();
        // Create symbol equivalent for the module.exports = {}
        const originalSymbol = file.symbol;
        declareSymbol(file.symbol.exports!, file.symbol, file, SymbolFlags.Property, SymbolFlags.All);
        file.symbol = originalSymbol;
      }
    }

    function bindSourceFileAsExternalModule() {
      bindAnonymousDeclaration(file, SymbolFlags.ValueModule, `"${removeFileExtension(file.fileName)}"` as __String);
    }

    function bindExportAssignment(node: ExportAssignment) {
      if (!container.symbol || !container.symbol.exports) {
        // Export assignment in some sort of block construct
        bindAnonymousDeclaration(node, SymbolFlags.Alias, getDeclarationName(node)!);
      } else {
        const flags = exportAssignmentIsAlias(node)
          ? // An export default clause with an EntityNameExpression or a class expression exports all meanings of that identifier or expression;
            SymbolFlags.Alias
          : // An export default clause with any other expression exports a value
            SymbolFlags.Property;
        // If there is an `export default x;` alias declaration, can't `export default` anything else.
        // (In contrast, you can still have `export default function f() {}` and `export default interface I {}`.)
        const symbol = declareSymbol(container.symbol.exports, container.symbol, node, flags, SymbolFlags.All);

        if (node.isExportEquals) {
          // Will be an error later, since the module already has other exports. Just make sure this has a valueDeclaration set.
          setValueDeclaration(symbol, node);
        }
      }
    }

    function bindNamespaceExportDeclaration(node: NamespaceExportDeclaration) {
      if (node.modifiers && node.modifiers.length) {
        file.bindDiagnostics.push(createDiagnosticForNode(node, Diagnostics.Modifiers_cannot_appear_here));
      }
      const diag = !Node.is.kind(SourceFile, node.parent)
        ? Diagnostics.Global_module_exports_may_only_appear_at_top_level
        : !qp_isExternalModule(node.parent)
        ? Diagnostics.Global_module_exports_may_only_appear_in_module_files
        : !node.parent.isDeclarationFile
        ? Diagnostics.Global_module_exports_may_only_appear_in_declaration_files
        : undefined;
      if (diag) {
        file.bindDiagnostics.push(createDiagnosticForNode(node, diag));
      } else {
        file.symbol.globalExports = file.symbol.globalExports || new SymbolTable();
        declareSymbol(file.symbol.globalExports, file.symbol, node, SymbolFlags.Alias, SymbolFlags.AliasExcludes);
      }
    }

    function bindExportDeclaration(node: ExportDeclaration) {
      if (!container.symbol || !container.symbol.exports) {
        // Export * in some sort of block construct
        bindAnonymousDeclaration(node, SymbolFlags.ExportStar, getDeclarationName(node)!);
      } else if (!node.exportClause) {
        // All export * declarations are collected in an __export symbol
        declareSymbol(container.symbol.exports, container.symbol, node, SymbolFlags.ExportStar, SymbolFlags.None);
      } else if (Node.is.kind(NamespaceExport, node.exportClause)) {
        // declareSymbol walks up parents to find name text, parent _must_ be set
        // but won't be set by the normal binder walk until `bindChildren` later on.
        node.exportClause.parent = node;
        declareSymbol(container.symbol.exports, container.symbol, node.exportClause, SymbolFlags.Alias, SymbolFlags.AliasExcludes);
      }
    }

    function bindImportClause(node: ImportClause) {
      if (node.name) {
        declareSymbolAndAddToSymbolTable(node, SymbolFlags.Alias, SymbolFlags.AliasExcludes);
      }
    }

    function setCommonJsModuleIndicator(node: Node) {
      if (file.externalModuleIndicator) {
        return false;
      }
      if (!file.commonJsModuleIndicator) {
        file.commonJsModuleIndicator = node;
        bindSourceFileAsExternalModule();
      }
      return true;
    }

    function bindObjectDefinePropertyExport(node: BindableObjectDefinePropertyCall) {
      if (!setCommonJsModuleIndicator(node)) {
        return;
      }
      const symbol = forEachIdentifierInEntityName(node.arguments[0], /*parent*/ undefined, (id, symbol) => {
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

    function bindExportsPropertyAssignment(node: BindableStaticPropertyAssignmentExpression) {
      // When we create a property via 'exports.foo = bar', the 'exports.foo' property access
      // expression is the declaration
      if (!setCommonJsModuleIndicator(node)) {
        return;
      }
      const symbol = forEachIdentifierInEntityName(node.left.expression, /*parent*/ undefined, (id, symbol) => {
        if (symbol) {
          addDeclarationToSymbol(symbol, id, SymbolFlags.Module | SymbolFlags.Assignment);
        }
        return symbol;
      });
      if (symbol) {
        const flags = Node.is.kind(ClassExpression, node.right) ? SymbolFlags.Property | SymbolFlags.ExportValue | SymbolFlags.Class : SymbolFlags.Property | SymbolFlags.ExportValue;
        declareSymbol(symbol.exports!, symbol, node.left, flags, SymbolFlags.None);
      }
    }

    function bindModuleExportsAssignment(node: BindablePropertyAssignmentExpression) {
      // A common practice in node modules is to set 'export = module.exports = {}', this ensures that 'exports'
      // is still pointing to 'module.exports'.
      // We do not want to consider this as 'export=' since a module can have only one of these.
      // Similarly we do not want to treat 'module.exports = exports' as an 'export='.
      if (!setCommonJsModuleIndicator(node)) {
        return;
      }
      const assignedExpression = getRightMostAssignedExpression(node.right);
      if (isEmptyObjectLiteral(assignedExpression) || (container === file && isExportsOrModuleExportsOrAlias(file, assignedExpression))) {
        return;
      }

      // 'module.exports = expr' assignment
      const flags = exportAssignmentIsAlias(node)
        ? SymbolFlags.Alias // An export= with an EntityNameExpression or a ClassExpression exports all meanings of that identifier or class
        : SymbolFlags.Property | SymbolFlags.ExportValue | SymbolFlags.ValueModule;
      const symbol = declareSymbol(file.symbol.exports!, file.symbol, node, flags | SymbolFlags.Assignment, SymbolFlags.None);
      setValueDeclaration(symbol, node);
    }

    function bindThNode.is.kind(PropertyAssignment, node: BindablePropertyAssignmentExpression | PropertyAccessExpression | LiteralLikeElementAccessExpression) {
      assert(isInJSFile(node));
      // private identifiers *must* be declared (even in JS files)
      const hasPrivateIdentifier =
        (Node.is.kind(node, BinaryExpression) && Node.is.kind(PropertyAccessExpression, node.left) && Node.is.kind(PrivateIdentifier, node.left.name)) ||
        (Node.is.kind(PropertyAccessExpression, node) && Node.is.kind(PrivateIdentifier, node.name));
      if (hasPrivateIdentifier) {
        return;
      }
      const thisContainer = Node.get.thisContainer(node, /*includeArrowFunctions*/ false);
      switch (thisContainer.kind) {
        case Syntax.FunctionDeclaration:
        case Syntax.FunctionExpression:
          let constructorSymbol: Symbol | undefined = thisContainer.symbol;
          // For `f.prototype.m = function() { this.x = 0; }`, `this.x = 0` should modify `f`'s members, not the function expression.
          if (Node.is.kind(thisContainer.parent, BinaryExpression) && thisContainer.parent.operatorToken.kind === Syntax.EqualsToken) {
            const l = thisContainer.parent.left;
            if (isBindableStaticAccessExpression(l) && isPrototypeAccess(l.expression)) {
              constructorSymbol = lookupSymbolForPropertyAccess(l.expression.expression, thisParentContainer);
            }
          }

          if (constructorSymbol && constructorSymbol.valueDeclaration) {
            // Declare a 'member' if the container is an ES5 class or ES6 constructor
            constructorSymbol.members = constructorSymbol.members || new SymbolTable();
            // It's acceptable for multiple 'this' assignments of the same identifier to occur
            if (hasDynamicName(node)) {
              bindDynamicallyNamedThNode.is.kind(PropertyAssignment, node, constructorSymbol);
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
          // this.foo assignment in a JavaScript class
          // Bind this property to the containing class
          const containingClass = thisContainer.parent;
          const symbolTable = hasSyntacticModifier(thisContainer, ModifierFlags.Static) ? containingClass.symbol.exports! : containingClass.symbol.members!;
          if (hasDynamicName(node)) {
            bindDynamicallyNamedThNode.is.kind(PropertyAssignment, node, containingClass.symbol);
          } else {
            declareSymbol(symbolTable, containingClass.symbol, node, SymbolFlags.Property | SymbolFlags.Assignment, SymbolFlags.None, /*isReplaceableByMethod*/ true);
          }
          break;
        case Syntax.SourceFile:
          // this.property = assignment in a source file -- declare symbol in exports for a module, in locals for a script
          if (hasDynamicName(node)) {
            break;
          } else if ((thisContainer as SourceFile).commonJsModuleIndicator) {
            declareSymbol(thisContainer.symbol.exports!, thisContainer.symbol, node, SymbolFlags.Property | SymbolFlags.ExportValue, SymbolFlags.None);
          } else {
            declareSymbolAndAddToSymbolTable(node, SymbolFlags.FunctionScopedVariable, SymbolFlags.FunctionScopedVariableExcludes);
          }
          break;

        default:
          Debug.failBadSyntax(thisContainer);
      }
    }

    function bindDynamicallyNamedThNode.is.kind(PropertyAssignment, node: BinaryExpression | DynamicNamedDeclaration, symbol: Symbol) {
      bindAnonymousDeclaration(node, SymbolFlags.Property, InternalSymbolName.Computed);
      addLateBoundAssignmentDeclarationToSymbol(node, symbol);
    }

    function addLateBoundAssignmentDeclarationToSymbol(node: BinaryExpression | DynamicNamedDeclaration, symbol: Symbol | undefined) {
      if (symbol) {
        const members = symbol.assignmentDeclarationMembers || (symbol.assignmentDeclarationMembers = createMap());
        members.set('' + getNodeId(node), node);
      }
    }

    function bindSpecialPropertyDeclaration(node: PropertyAccessExpression | LiteralLikeElementAccessExpression) {
      if (node.expression.kind === Syntax.ThisKeyword) {
        bindThNode.is.kind(PropertyAssignment, node);
      } else if (isBindableStaticAccessExpression(node) && node.parent.parent.kind === Syntax.SourceFile) {
        if (isPrototypeAccess(node.expression)) {
          bindPrototypePropertyAssignment(node, node.parent);
        } else {
          bindStaticPropertyAssignment(node);
        }
      }
    }

    /** For `x.prototype = { p, ... }`, declare members p,... if `x` is function/class/{}, or not declared. */
    function bindPrototypeAssignment(node: BindableStaticPropertyAssignmentExpression) {
      node.left.parent = node;
      node.right.parent = node;
      bindPropertyAssignment(node.left.expression, node.left, /*isPrototypeProperty*/ false, /*containerIsClass*/ true);
    }

    function bindObjectDefinePrototypeProperty(node: BindableObjectDefinePropertyCall) {
      const namespaceSymbol = lookupSymbolForPropertyAccess((node.arguments[0] as PropertyAccessExpression).expression as EntityNameExpression);
      if (namespaceSymbol && namespaceSymbol.valueDeclaration) {
        // Ensure the namespace symbol becomes class-like
        addDeclarationToSymbol(namespaceSymbol, namespaceSymbol.valueDeclaration, SymbolFlags.Class);
      }
      bindPotentiallyNewExpandoMemberToNamespace(node, namespaceSymbol, /*isPrototypeProperty*/ true);
    }

    /**
     * For `x.prototype.y = z`, declare a member `y` on `x` if `x` is a function or class, or not declared.
     * Note that jsdoc preceding an ExpressionStatement like `x.prototype.y;` is also treated as a declaration.
     */
    function bindPrototypePropertyAssignment(lhs: BindableStaticAccessExpression, parent: Node) {
      // Look up the function in the local scope, since prototype assignments should
      // follow the function declaration
      const classPrototype = lhs.expression as BindableStaticAccessExpression;
      const constructorFunction = classPrototype.expression;

      // Fix up parent pointers since we're going to use these nodes before we bind into them
      lhs.parent = parent;
      constructorFunction.parent = classPrototype;
      classPrototype.parent = lhs;

      bindPropertyAssignment(constructorFunction, lhs, /*isPrototypeProperty*/ true, /*containerIsClass*/ true);
    }

    function bindObjectDefinePropertyAssignment(node: BindableObjectDefinePropertyCall) {
      let namespaceSymbol = lookupSymbolForPropertyAccess(node.arguments[0]);
      const isToplevel = node.parent.parent.kind === Syntax.SourceFile;
      namespaceSymbol = bindPotentiallyMissingNamespaces(namespaceSymbol, node.arguments[0], isToplevel, /*isPrototypeProperty*/ false, /*containerIsClass*/ false);
      bindPotentiallyNewExpandoMemberToNamespace(node, namespaceSymbol, /*isPrototypeProperty*/ false);
    }

    function bindSpecialPropertyAssignment(node: BindablePropertyAssignmentExpression) {
      // Class declarations in Typescript do not allow property declarations
      const parentSymbol = lookupSymbolForPropertyAccess(node.left.expression, container) || lookupSymbolForPropertyAccess(node.left.expression, blockScopeContainer);
      if (!isInJSFile(node) && !isFunctionSymbol(parentSymbol)) {
        return;
      }
      // Fix up parent pointers since we're going to use these nodes before we bind into them
      node.left.parent = node;
      node.right.parent = node;
      if (Node.is.kind(Identifier, node.left.expression) && container === file && isExportsOrModuleExportsOrAlias(file, node.left.expression)) {
        // This can be an alias for the 'exports' or 'module.exports' names, e.g.
        //    var util = module.exports;
        //    util.property = function ...
        bindExportsPropertyAssignment(node as BindableStaticPropertyAssignmentExpression);
      } else if (hasDynamicName(node)) {
        bindAnonymousDeclaration(node, SymbolFlags.Property | SymbolFlags.Assignment, InternalSymbolName.Computed);
        const sym = bindPotentiallyMissingNamespaces(parentSymbol, node.left.expression, isTopLevelNamespaceAssignment(node.left), /*isPrototype*/ false, /*containerIsClass*/ false);
        addLateBoundAssignmentDeclarationToSymbol(node, sym);
      } else {
        bindStaticPropertyAssignment(cast(node.left, isBindableStaticNameExpression));
      }
    }

    /**
     * For nodes like `x.y = z`, declare a member 'y' on 'x' if x is a function (or IIFE) or class or {}, or not declared.
     * Also works for expression statements preceded by JSDoc, like / ** @type number * / x.y;
     */
    function bindStaticPropertyAssignment(node: BindableStaticNameExpression) {
      assert(!Node.is.kind(Identifier, node));
      node.expression.parent = node;
      bindPropertyAssignment(node.expression, node, /*isPrototypeProperty*/ false, /*containerIsClass*/ false);
    }

    function bindPotentiallyMissingNamespaces(
      namespaceSymbol: Symbol | undefined,
      entityName: BindableStaticNameExpression,
      isToplevel: boolean,
      isPrototypeProperty: boolean,
      containerIsClass: boolean
    ) {
      if (isToplevel && !isPrototypeProperty) {
        // make symbols or add declarations for intermediate containers
        const flags = SymbolFlags.Module | SymbolFlags.Assignment;
        const excludeFlags = SymbolFlags.ValueModuleExcludes & ~SymbolFlags.Assignment;
        namespaceSymbol = forEachIdentifierInEntityName(entityName, namespaceSymbol, (id, symbol, parent) => {
          if (symbol) {
            addDeclarationToSymbol(symbol, id, flags);
            return symbol;
          } else {
            const table = parent ? parent.exports! : file.jsGlobalAugmentations || (file.jsGlobalAugmentations = new SymbolTable());
            return declareSymbol(table, parent, id, flags, excludeFlags);
          }
        });
      }
      if (containerIsClass && namespaceSymbol && namespaceSymbol.valueDeclaration) {
        addDeclarationToSymbol(namespaceSymbol, namespaceSymbol.valueDeclaration, SymbolFlags.Class);
      }
      return namespaceSymbol;
    }

    function bindPotentiallyNewExpandoMemberToNamespace(declaration: BindableStaticAccessExpression | CallExpression, namespaceSymbol: Symbol | undefined, isPrototypeProperty: boolean) {
      if (!namespaceSymbol || !isExpandoSymbol(namespaceSymbol)) {
        return;
      }

      // Set up the members collection if it doesn't exist already
      const symbolTable = isPrototypeProperty ? namespaceSymbol.members || (namespaceSymbol.members = new SymbolTable()) : namespaceSymbol.exports || (namespaceSymbol.exports = new SymbolTable());

      let includes = SymbolFlags.None;
      let excludes = SymbolFlags.None;
      // Method-like
      if (Node.is.functionLikeDeclaration(getAssignedExpandoInitializer(declaration)!)) {
        includes = SymbolFlags.Method;
        excludes = SymbolFlags.MethodExcludes;
      }
      // Maybe accessor-like
      else if (Node.is.kind(CallExpression, declaration) && isBindableObjectDefinePropertyCall(declaration)) {
        if (
          some(declaration.arguments[2].properties, (p) => {
            const id = getNameOfDeclaration(p);
            return !!id && Node.is.kind(Identifier, id) && idText(id) === 'set';
          })
        ) {
          // We mix in `SymbolFLags.Property` so in the checker `getTypeOfVariableParameterOrProperty` is used for this
          // symbol, instead of `getTypeOfAccessor` (which will assert as there is no real accessor declaration)
          includes |= SymbolFlags.SetAccessor | SymbolFlags.Property;
          excludes |= SymbolFlags.SetAccessorExcludes;
        }
        if (
          some(declaration.arguments[2].properties, (p) => {
            const id = getNameOfDeclaration(p);
            return !!id && Node.is.kind(Identifier, id) && idText(id) === 'get';
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

    function isTopLevelNamespaceAssignment(propertyAccess: BindableAccessExpression) {
      return Node.is.kind(BinaryExpression, propertyAccess.parent)
        ? getParentOfBinaryExpression(propertyAccess.parent).parent.kind === Syntax.SourceFile
        : propertyAccess.parent.parent.kind === Syntax.SourceFile;
    }

    function bindPropertyAssignment(name: BindableStaticNameExpression, propertyAccess: BindableStaticAccessExpression, isPrototypeProperty: boolean, containerIsClass: boolean) {
      let namespaceSymbol = lookupSymbolForPropertyAccess(name, container) || lookupSymbolForPropertyAccess(name, blockScopeContainer);
      const isToplevel = isTopLevelNamespaceAssignment(propertyAccess);
      namespaceSymbol = bindPotentiallyMissingNamespaces(namespaceSymbol, propertyAccess.expression, isToplevel, isPrototypeProperty, containerIsClass);
      bindPotentiallyNewExpandoMemberToNamespace(propertyAccess, namespaceSymbol, isPrototypeProperty);
    }

    /**
     * Javascript expando values are:
     * - Functions
     * - classes
     * - namespaces
     * - variables initialized with function expressions
     * -                       with class expressions
     * -                       with empty object literals
     * -                       with non-empty object literals if assigned to the prototype property
     */
    function isExpandoSymbol(symbol: Symbol): boolean {
      if (symbol.flags & (SymbolFlags.Function | SymbolFlags.Class | SymbolFlags.NamespaceModule)) {
        return true;
      }
      const node = symbol.valueDeclaration;
      if (node && Node.is.kind(CallExpression, node)) {
        return !!getAssignedExpandoInitializer(node);
      }
      let init = !node
        ? undefined
        : Node.is.kind(VariableDeclaration, node)
        ? node.initializer
        : Node.is.kind(BinaryExpression, node)
        ? node.right
        : Node.is.kind(PropertyAccessExpression, node) && Node.is.kind(BinaryExpression, node.parent)
        ? node.parent.right
        : undefined;
      init = init && getRightMostAssignedExpression(init);
      if (init) {
        const isPrototypeAssignment = isPrototypeAccess(Node.is.kind(VariableDeclaration, node) ? node.name : Node.is.kind(BinaryExpression, node) ? node.left : node);
        return !!getExpandoInitializer(
          Node.is.kind(BinaryExpression, init) && (init.operatorToken.kind === Syntax.Bar2Token || init.operatorToken.kind === Syntax.Question2Token) ? init.right : init,
          isPrototypeAssignment
        );
      }
      return false;
    }

    function getParentOfBinaryExpression(expr: Node) {
      while (Node.is.kind(BinaryExpression, expr.parent)) {
        expr = expr.parent;
      }
      return expr.parent;
    }

    function lookupSymbolForPropertyAccess(node: BindableStaticNameExpression, lookupContainer: Node = container): Symbol | undefined {
      if (Node.is.kind(Identifier, node)) {
        return lookupSymbolForNameWorker(lookupContainer, node.escapedText);
      } else {
        const symbol = lookupSymbolForPropertyAccess(node.expression);
        return symbol && symbol.exports && symbol.exports.get(getElementOrPropertyAccessName(node));
      }
    }

    function forEachIdentifierInEntityName(
      e: BindableStaticNameExpression,
      parent: Symbol | undefined,
      action: (e: Declaration, symbol: Symbol | undefined, parent: Symbol | undefined) => Symbol | undefined
    ): Symbol | undefined {
      if (isExportsOrModuleExportsOrAlias(file, e)) {
        return file.symbol;
      } else if (Node.is.kind(Identifier, e)) {
        return action(e, lookupSymbolForPropertyAccess(e), parent);
      } else {
        const s = forEachIdentifierInEntityName(e.expression, parent, action);
        const name = getNameOrArgument(e);
        // unreachable
        if (Node.is.kind(PrivateIdentifier, name)) {
          fail('unexpected PrivateIdentifier');
        }
        return action(name, s && s.exports && s.exports.get(getElementOrPropertyAccessName(e)), s);
      }
    }

    function bindCallExpression(node: CallExpression) {
      // We're only inspecting call expressions to detect CommonJS modules, so we can skip
      // this check if we've already seen the module indicator
      if (!file.commonJsModuleIndicator && isRequireCall(node, /*checkArgumentIsStringLiteralLike*/ false)) {
        setCommonJsModuleIndicator(node);
      }
    }

    function bindClassLikeDeclaration(node: ClassLikeDeclaration) {
      if (node.kind === Syntax.ClassDeclaration) {
        bindBlockScopedDeclaration(node, SymbolFlags.Class, SymbolFlags.ClassExcludes);
      } else {
        const bindingName = node.name ? node.name.escapedText : InternalSymbolName.Class;
        bindAnonymousDeclaration(node, SymbolFlags.Class, bindingName);
        // Add name of class expression into the map for semantic classifier
        if (node.name) {
          classifiableNames.set(node.name.escapedText, true);
        }
      }

      const { symbol } = node;
      const prototypeSymbol = new QSymbol(SymbolFlags.Property | SymbolFlags.Prototype, 'prototype' as __String);
      const symbolExport = symbol.exports!.get(prototypeSymbol.escName);
      if (symbolExport) {
        if (node.name) {
          node.name.parent = node;
        }
        file.bindDiagnostics.push(createDiagnosticForNode(symbolExport.declarations[0], Diagnostics.Duplicate_identifier_0, prototypeSymbol.name));
      }
      symbol.exports!.set(prototypeSymbol.escName, prototypeSymbol);
      prototypeSymbol.parent = symbol;
    }

    function bindEnumDeclaration(node: EnumDeclaration) {
      return isEnumConst(node)
        ? bindBlockScopedDeclaration(node, SymbolFlags.ConstEnum, SymbolFlags.ConstEnumExcludes)
        : bindBlockScopedDeclaration(node, SymbolFlags.RegularEnum, SymbolFlags.RegularEnumExcludes);
    }

    function bindVariableDeclarationOrBindingElement(node: VariableDeclaration | BindingElement) {
      if (inStrictMode) {
        checkStrictModeEvalOrArguments(node, node.name);
      }

      if (!Node.is.kind(BindingPattern, node.name)) {
        if (isBlockOrCatchScoped(node)) {
          bindBlockScopedDeclaration(node, SymbolFlags.BlockScopedVariable, SymbolFlags.BlockScopedVariableExcludes);
        } else if (isParameterDeclaration(node)) {
          // It is safe to walk up parent chain to find whether the node is a destructuring parameter declaration
          // because its parent chain has already been set up, since parents are set before descending into children.
          //
          // If node is a binding element in parameter declaration, we need to use ParameterExcludes.
          // Using ParameterExcludes flag allows the compiler to report an error on duplicate identifiers in Parameter Declaration
          // For example:
          //      function foo([a,a]) {} // Duplicate Identifier error
          //      function bar(a,a) {}   // Duplicate Identifier error, parameter declaration in this case is handled in bindParameter
          //                             // which correctly set excluded symbols
          declareSymbolAndAddToSymbolTable(node, SymbolFlags.FunctionScopedVariable, SymbolFlags.ParameterExcludes);
        } else {
          declareSymbolAndAddToSymbolTable(node, SymbolFlags.FunctionScopedVariable, SymbolFlags.FunctionScopedVariableExcludes);
        }
      }
    }

    function bindParameter(node: ParameterDeclaration | JSDocParameterTag) {
      if (node.kind === Syntax.JSDocParameterTag && container.kind !== Syntax.JSDocSignature) {
        return;
      }
      if (inStrictMode && !(node.flags & NodeFlags.Ambient)) {
        // It is a SyntaxError if the identifier eval or arguments appears within a FormalParameterList of a
        // strict mode FunctionLikeDeclaration or FunctionExpression(13.1)
        checkStrictModeEvalOrArguments(node, node.name);
      }

      if (Node.is.kind(BindingPattern, node.name)) {
        bindAnonymousDeclaration(node, SymbolFlags.FunctionScopedVariable, ('__' + (node as ParameterDeclaration).parent.parameters.indexOf(node as ParameterDeclaration)) as __String);
      } else {
        declareSymbolAndAddToSymbolTable(node, SymbolFlags.FunctionScopedVariable, SymbolFlags.ParameterExcludes);
      }

      // If this is a property-parameter, then also declare the property symbol into the
      // containing class.
      if (Node.is.parameterPropertyDeclaration(node, node.parent)) {
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

    function bindFunctionDeclaration(node: FunctionDeclaration) {
      if (!file.isDeclarationFile && !(node.flags & NodeFlags.Ambient)) {
        if (Node.is.asyncFunction(node)) {
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

    function bindFunctionExpression(node: FunctionExpression) {
      if (!file.isDeclarationFile && !(node.flags & NodeFlags.Ambient)) {
        if (Node.is.asyncFunction(node)) {
          emitFlags |= NodeFlags.HasAsyncFunctions;
        }
      }
      if (currentFlow) {
        node.flowNode = currentFlow;
      }
      checkStrictModeFunctionName(node);
      const bindingName = node.name ? node.name.escapedText : InternalSymbolName.Function;
      return bindAnonymousDeclaration(node, SymbolFlags.Function, bindingName);
    }

    function bindPropertyOrMethodOrAccessor(node: Declaration, symbolFlags: SymbolFlags, symbolExcludes: SymbolFlags) {
      if (!file.isDeclarationFile && !(node.flags & NodeFlags.Ambient) && Node.is.asyncFunction(node)) {
        emitFlags |= NodeFlags.HasAsyncFunctions;
      }

      if (currentFlow && Node.is.objectLiteralOrClassExpressionMethod(node)) {
        node.flowNode = currentFlow;
      }

      return hasDynamicName(node) ? bindAnonymousDeclaration(node, symbolFlags, InternalSymbolName.Computed) : declareSymbolAndAddToSymbolTable(node, symbolFlags, symbolExcludes);
    }

    function getInferTypeContainer(node: Node): ConditionalTypeNode | undefined {
      const extendsType = Node.findAncestor(node, (n) => n.parent && Node.is.kind(ConditionalTypeNode, n.parent) && n.parent.extendsType === n);
      return extendsType && (extendsType.parent as ConditionalTypeNode);
    }

    function bindTypeParameter(node: TypeParameterDeclaration) {
      if (Node.is.kind(JSDocTemplateTag, node.parent)) {
        const container = find((node.parent.parent as JSDoc).tags!, isJSDocTypeAlias) || getHostSignatureFromJSDoc(node.parent); // TODO: GH#18217
        if (container) {
          if (!container.locals) {
            container.locals = new SymbolTable();
          }
          declareSymbol(container.locals, /*parent*/ undefined, node, SymbolFlags.TypeParameter, SymbolFlags.TypeParameterExcludes);
        } else {
          declareSymbolAndAddToSymbolTable(node, SymbolFlags.TypeParameter, SymbolFlags.TypeParameterExcludes);
        }
      } else if (node.parent.kind === Syntax.InferType) {
        const container = getInferTypeContainer(node.parent);
        if (container) {
          if (!container.locals) {
            container.locals = new SymbolTable();
          }
          declareSymbol(container.locals, /*parent*/ undefined, node, SymbolFlags.TypeParameter, SymbolFlags.TypeParameterExcludes);
        } else {
          bindAnonymousDeclaration(node, SymbolFlags.TypeParameter, getDeclarationName(node)!); // TODO: GH#18217
        }
      } else {
        declareSymbolAndAddToSymbolTable(node, SymbolFlags.TypeParameter, SymbolFlags.TypeParameterExcludes);
      }
    }

    // reachability checks

    function shouldReportErrorOnModuleDeclaration(node: ModuleDeclaration): boolean {
      const instanceState = getModuleInstanceState(node);
      return instanceState === ModuleInstanceState.Instantiated || (instanceState === ModuleInstanceState.ConstEnumOnly && !!options.preserveConstEnums);
    }

    function checkUnreachable(node: Node): boolean {
      if (!(currentFlow.flags & FlowFlags.Unreachable)) {
        return false;
      }
      if (currentFlow === unreachableFlow) {
        const reportError =
          // report error on all statements except empty ones
          (Node.is.statementButNotDeclaration(node) && node.kind !== Syntax.EmptyStatement) ||
          // report error on class declarations
          node.kind === Syntax.ClassDeclaration ||
          // report error on instantiated modules or const-enums only modules if preserveConstEnums is set
          (node.kind === Syntax.ModuleDeclaration && shouldReportErrorOnModuleDeclaration(<ModuleDeclaration>node));

        if (reportError) {
          currentFlow = reportedUnreachableFlow;

          if (!options.allowUnreachableCode) {
            // unreachable code is reported if
            // - user has explicitly asked about it AND
            // - statement is in not ambient context (statements in ambient context is already an error
            //   so we should not report extras) AND
            //   - node is not variable statement OR
            //   - node is block scoped variable statement OR
            //   - node is not block scoped variable statement and at least one variable declaration has initializer
            //   Rationale: we don't want to report errors on non-initialized var's since they are hoisted
            //   On the other side we do want to report errors on non-initialized 'lets' because of TDZ
            const isError =
              unreachableCodeIsError(options) &&
              !(node.flags & NodeFlags.Ambient) &&
              (!Node.is.kind(VariableStatement, node) || !!(Node.get.combinedFlagsOf(node.declarationList) & NodeFlags.BlockScoped) || node.declarationList.declarations.some((d) => !!d.initializer));

            eachUnreachableRange(node, (start, end) => errorOrSuggestionOnRange(isError, start, end, Diagnostics.Unreachable_code_detected));
          }
        }
      }
      return true;
    }
  }

  function eachUnreachableRange(node: Node, cb: (start: Node, last: Node) => void): void {
    if (Node.is.statement(node) && isExecutableStatement(node) && Node.is.kind(Block, node.parent)) {
      const { statements } = node.parent;
      const slice = sliceAfter(statements, node);
      getRangesWhere(slice, isExecutableStatement, (start, afterEnd) => cb(slice[start], slice[afterEnd - 1]));
    } else {
      cb(node, node);
    }
  }
  // As opposed to a pure declaration like an `interface`
  function isExecutableStatement(s: Statement): boolean {
    // Don't remove statements that can validly be used before they appear.
    return (
      !Node.is.kind(FunctionDeclaration, s) &&
      !isPurelyTypeDeclaration(s) &&
      !Node.is.kind(EnumDeclaration, s) &&
      // `var x;` may declare a variable used above
      !(Node.is.kind(VariableStatement, s) && !(Node.get.combinedFlagsOf(s) & (NodeFlags.Let | NodeFlags.Const)) && s.declarationList.declarations.some((d) => !d.initializer))
    );
  }

  function isPurelyTypeDeclaration(s: Statement): boolean {
    switch (s.kind) {
      case Syntax.InterfaceDeclaration:
      case Syntax.TypeAliasDeclaration:
        return true;
      case Syntax.ModuleDeclaration:
        return getModuleInstanceState(s as ModuleDeclaration) !== ModuleInstanceState.Instantiated;
      case Syntax.EnumDeclaration:
        return hasSyntacticModifier(s, ModifierFlags.Const);
      default:
        return false;
    }
  }

  export function isExportsOrModuleExportsOrAlias(sourceFile: SourceFile, node: Expression): boolean {
    let i = 0;
    const q = [node];
    while (q.length && i < 100) {
      i++;
      node = q.shift()!;
      if (Node.is.exportsIdentifier(node) || Node.is.moduleExportsAccessExpression(node)) {
        return true;
      } else if (Node.is.kind(Identifier, node)) {
        const symbol = lookupSymbolForNameWorker(sourceFile, node.escapedText);
        if (!!symbol && !!symbol.valueDeclaration && Node.is.kind(VariableDeclaration, symbol.valueDeclaration) && !!symbol.valueDeclaration.initializer) {
          const init = symbol.valueDeclaration.initializer;
          q.push(init);
          if (isAssignmentExpression(init, /*excludeCompoundAssignment*/ true)) {
            q.push(init.left);
            q.push(init.right);
          }
        }
      }
    }
    return false;
  }

  function lookupSymbolForNameWorker(container: Node, name: __String): Symbol | undefined {
    const local = container.locals && container.locals.get(name);
    if (local) {
      return local.exportSymbol || local;
    }
    if (Node.is.kind(SourceFile, container) && container.jsGlobalAugmentations && container.jsGlobalAugmentations.has(name)) {
      return container.jsGlobalAugmentations.get(name);
    }
    return container.symbol && container.symbol.exports && container.symbol.exports.get(name);
  }

  export function computeTransformFlagsForNode(node: Node, subtreeFlags: TransformFlags): TransformFlags {
    const kind = node.kind;
    switch (kind) {
      case Syntax.CallExpression:
        return computeCallExpression(<CallExpression>node, subtreeFlags);

      case Syntax.NewExpression:
        return computeNewExpression(<NewExpression>node, subtreeFlags);

      case Syntax.ModuleDeclaration:
        return computeModuleDeclaration(<ModuleDeclaration>node, subtreeFlags);

      case Syntax.ParenthesizedExpression:
        return computeParenthesizedExpression(<ParenthesizedExpression>node, subtreeFlags);

      case Syntax.BinaryExpression:
        return computeBinaryExpression(<BinaryExpression>node, subtreeFlags);

      case Syntax.ExpressionStatement:
        return computeExpressionStatement(<ExpressionStatement>node, subtreeFlags);

      case Syntax.Parameter:
        return computeParameter(<ParameterDeclaration>node, subtreeFlags);

      case Syntax.ArrowFunction:
        return computeArrowFunction(<ArrowFunction>node, subtreeFlags);

      case Syntax.FunctionExpression:
        return computeFunctionExpression(<FunctionExpression>node, subtreeFlags);

      case Syntax.FunctionDeclaration:
        return computeFunctionDeclaration(<FunctionDeclaration>node, subtreeFlags);

      case Syntax.VariableDeclaration:
        return computeVariableDeclaration(<VariableDeclaration>node, subtreeFlags);

      case Syntax.VariableDeclarationList:
        return computeVariableDeclarationList(<VariableDeclarationList>node, subtreeFlags);

      case Syntax.VariableStatement:
        return computeVariableStatement(<VariableStatement>node, subtreeFlags);

      case Syntax.LabeledStatement:
        return computeLabeledStatement(<LabeledStatement>node, subtreeFlags);

      case Syntax.ClassDeclaration:
        return computeClassDeclaration(<ClassDeclaration>node, subtreeFlags);

      case Syntax.ClassExpression:
        return computeClassExpression(<ClassExpression>node, subtreeFlags);

      case Syntax.HeritageClause:
        return computeHeritageClause(<HeritageClause>node, subtreeFlags);

      case Syntax.CatchClause:
        return computeCatchClause(<CatchClause>node, subtreeFlags);

      case Syntax.ExpressionWithTypeArguments:
        return computeExpressionWithTypeArguments(<ExpressionWithTypeArguments>node, subtreeFlags);

      case Syntax.Constructor:
        return computeConstructor(<ConstructorDeclaration>node, subtreeFlags);

      case Syntax.PropertyDeclaration:
        return computePropertyDeclaration(<PropertyDeclaration>node, subtreeFlags);

      case Syntax.MethodDeclaration:
        return computeMethod(<MethodDeclaration>node, subtreeFlags);

      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        return computeAccessor(<AccessorDeclaration>node, subtreeFlags);

      case Syntax.ImportEqualsDeclaration:
        return computeImportEquals(<ImportEqualsDeclaration>node, subtreeFlags);

      case Syntax.PropertyAccessExpression:
        return computePropertyAccess(<PropertyAccessExpression>node, subtreeFlags);

      case Syntax.ElementAccessExpression:
        return computeElementAccess(<ElementAccessExpression>node, subtreeFlags);

      case Syntax.JsxSelfClosingElement:
      case Syntax.JsxOpeningElement:
        return computeJsxOpeningLikeElement(<JsxOpeningLikeElement>node, subtreeFlags);

      default:
        return computeOther(node, kind, subtreeFlags);
    }
  }

  function computeCallExpression(node: CallExpression, subtreeFlags: TransformFlags) {
    let transformFlags = subtreeFlags;
    const callee = skipOuterExpressions(node.expression);
    const expression = node.expression;

    if (node.flags & NodeFlags.OptionalChain) {
      transformFlags |= TransformFlags.ContainsES2020;
    }

    if (node.typeArguments) {
      transformFlags |= TransformFlags.AssertTypeScript;
    }

    if (subtreeFlags & TransformFlags.ContainsRestOrSpread || Node.is.superOrSuperProperty(callee)) {
      // If the this node contains a SpreadExpression, or is a super call, then it is an ES6
      // node.
      transformFlags |= TransformFlags.AssertES2015;
      if (Node.is.superProperty(callee)) {
        transformFlags |= TransformFlags.ContainsLexicalThis;
      }
    }

    if (expression.kind === Syntax.ImportKeyword) {
      transformFlags |= TransformFlags.ContainsDynamicImport;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.ArrayLiteralOrCallOrNewExcludes;
  }

  function computeNewExpression(node: NewExpression, subtreeFlags: TransformFlags) {
    let transformFlags = subtreeFlags;
    if (node.typeArguments) {
      transformFlags |= TransformFlags.AssertTypeScript;
    }
    if (subtreeFlags & TransformFlags.ContainsRestOrSpread) {
      // If the this node contains a SpreadElementExpression then it is an ES6
      // node.
      transformFlags |= TransformFlags.AssertES2015;
    }
    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.ArrayLiteralOrCallOrNewExcludes;
  }

  function computeJsxOpeningLikeElement(node: JsxOpeningLikeElement, subtreeFlags: TransformFlags) {
    let transformFlags = subtreeFlags | TransformFlags.AssertJsx;
    if (node.typeArguments) {
      transformFlags |= TransformFlags.AssertTypeScript;
    }
    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.NodeExcludes;
  }

  function computeBinaryExpression(node: BinaryExpression, subtreeFlags: TransformFlags) {
    let transformFlags = subtreeFlags;
    const operatorTokenKind = node.operatorToken.kind;
    const leftKind = node.left.kind;

    if (operatorTokenKind === Syntax.Question2Token) {
      transformFlags |= TransformFlags.AssertES2020;
    } else if (operatorTokenKind === Syntax.EqualsToken && leftKind === Syntax.ObjectLiteralExpression) {
      // Destructuring object assignments with are ES2015 syntax
      // and possibly ES2018 if they contain rest
      transformFlags |= TransformFlags.AssertES2018 | TransformFlags.AssertES2015 | TransformFlags.AssertDestructuringAssignment;
    } else if (operatorTokenKind === Syntax.EqualsToken && leftKind === Syntax.ArrayLiteralExpression) {
      // Destructuring assignments are ES2015 syntax.
      transformFlags |= TransformFlags.AssertES2015 | TransformFlags.AssertDestructuringAssignment;
    } else if (operatorTokenKind === Syntax.Asterisk2Token || operatorTokenKind === Syntax.Asterisk2EqualsToken) {
      // Exponentiation is ES2016 syntax.
      transformFlags |= TransformFlags.AssertES2016;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.NodeExcludes;
  }

  function computeParameter(node: ParameterDeclaration, subtreeFlags: TransformFlags) {
    let transformFlags = subtreeFlags;
    const name = node.name;
    const initializer = node.initializer;
    const dot3Token = node.dot3Token;

    // The '?' token, type annotations, decorators, and 'this' parameters are TypeSCript
    // syntax.
    if (node.questionToken || node.type || (subtreeFlags & TransformFlags.ContainsTypeScriptClassSyntax && some(node.decorators)) || isThNode.is.kind(Identifier, name)) {
      transformFlags |= TransformFlags.AssertTypeScript;
    }

    // If a parameter has an accessibility modifier, then it is TypeScript syntax.
    if (hasSyntacticModifier(node, ModifierFlags.ParameterPropertyModifier)) {
      transformFlags |= TransformFlags.AssertTypeScript | TransformFlags.ContainsTypeScriptClassSyntax;
    }

    // parameters with object rest destructuring are ES2018 syntax
    if (subtreeFlags & TransformFlags.ContainsObjectRestOrSpread) {
      transformFlags |= TransformFlags.AssertES2018;
    }

    // If a parameter has an initializer, a binding pattern or a dotDotDot token, then
    // it is ES6 syntax and its container must emit default value assignments or parameter destructuring downlevel.
    if (subtreeFlags & TransformFlags.ContainsBindingPattern || initializer || dot3Token) {
      transformFlags |= TransformFlags.AssertES2015;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.ParameterExcludes;
  }

  function computeParenthesizedExpression(node: ParenthesizedExpression, subtreeFlags: TransformFlags) {
    let transformFlags = subtreeFlags;
    const expression = node.expression;
    const expressionKind = expression.kind;

    // If the node is synthesized, it means the emitter put the parentheses there,
    // not the user. If we didn't want them, the emitter would not have put them
    // there.
    if (expressionKind === Syntax.AsExpression || expressionKind === Syntax.TypeAssertionExpression) {
      transformFlags |= TransformFlags.AssertTypeScript;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.OuterExpressionExcludes;
  }

  function computeClassDeclaration(node: ClassDeclaration, subtreeFlags: TransformFlags) {
    let transformFlags: TransformFlags;

    if (hasSyntacticModifier(node, ModifierFlags.Ambient)) {
      // An ambient declaration is TypeScript syntax.
      transformFlags = TransformFlags.AssertTypeScript;
    } else {
      // A ClassDeclaration is ES6 syntax.
      transformFlags = subtreeFlags | TransformFlags.AssertES2015;

      // A class with a parameter property assignment or decorator is TypeScript syntax.
      // An exported declaration may be TypeScript syntax, but is handled by the visitor
      // for a namespace declaration.
      if (subtreeFlags & TransformFlags.ContainsTypeScriptClassSyntax || node.typeParameters) {
        transformFlags |= TransformFlags.AssertTypeScript;
      }
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.ClassExcludes;
  }

  function computeClassExpression(node: ClassExpression, subtreeFlags: TransformFlags) {
    // A ClassExpression is ES6 syntax.
    let transformFlags = subtreeFlags | TransformFlags.AssertES2015;

    // A class with a parameter property assignment or decorator is TypeScript syntax.
    if (subtreeFlags & TransformFlags.ContainsTypeScriptClassSyntax || node.typeParameters) {
      transformFlags |= TransformFlags.AssertTypeScript;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.ClassExcludes;
  }

  function computeHeritageClause(node: HeritageClause, subtreeFlags: TransformFlags) {
    let transformFlags = subtreeFlags;

    switch (node.token) {
      case Syntax.ExtendsKeyword:
        // An `extends` HeritageClause is ES6 syntax.
        transformFlags |= TransformFlags.AssertES2015;
        break;

      case Syntax.ImplementsKeyword:
        // An `implements` HeritageClause is TypeScript syntax.
        transformFlags |= TransformFlags.AssertTypeScript;
        break;

      default:
        fail('Unexpected token for heritage clause');
        break;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.NodeExcludes;
  }

  function computeCatchClause(node: CatchClause, subtreeFlags: TransformFlags) {
    let transformFlags = subtreeFlags;

    if (!node.variableDeclaration) {
      transformFlags |= TransformFlags.AssertES2019;
    } else if (Node.is.kind(BindingPattern, node.variableDeclaration.name)) {
      transformFlags |= TransformFlags.AssertES2015;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.CatchClauseExcludes;
  }

  function computeExpressionWithTypeArguments(node: ExpressionWithTypeArguments, subtreeFlags: TransformFlags) {
    // An ExpressionWithTypeArguments is ES6 syntax, as it is used in the
    // extends clause of a class.
    let transformFlags = subtreeFlags | TransformFlags.AssertES2015;

    // If an ExpressionWithTypeArguments contains type arguments, then it
    // is TypeScript syntax.
    if (node.typeArguments) {
      transformFlags |= TransformFlags.AssertTypeScript;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.NodeExcludes;
  }

  function computeConstructor(node: ConstructorDeclaration, subtreeFlags: TransformFlags) {
    let transformFlags = subtreeFlags;

    // TypeScript-specific modifiers and overloads are TypeScript syntax
    if (hasSyntacticModifier(node, ModifierFlags.TypeScriptModifier) || !node.body) {
      transformFlags |= TransformFlags.AssertTypeScript;
    }

    // function declarations with object rest destructuring are ES2018 syntax
    if (subtreeFlags & TransformFlags.ContainsObjectRestOrSpread) {
      transformFlags |= TransformFlags.AssertES2018;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.ConstructorExcludes;
  }

  function computeMethod(node: MethodDeclaration, subtreeFlags: TransformFlags) {
    // A MethodDeclaration is ES6 syntax.
    let transformFlags = subtreeFlags | TransformFlags.AssertES2015;

    // Decorators, TypeScript-specific modifiers, type parameters, type annotations, and
    // overloads are TypeScript syntax.
    if (node.decorators || hasSyntacticModifier(node, ModifierFlags.TypeScriptModifier) || node.typeParameters || node.type || !node.body || node.questionToken) {
      transformFlags |= TransformFlags.AssertTypeScript;
    }

    // function declarations with object rest destructuring are ES2018 syntax
    if (subtreeFlags & TransformFlags.ContainsObjectRestOrSpread) {
      transformFlags |= TransformFlags.AssertES2018;
    }

    // An async method declaration is ES2017 syntax.
    if (hasSyntacticModifier(node, ModifierFlags.Async)) {
      transformFlags |= node.asteriskToken ? TransformFlags.AssertES2018 : TransformFlags.AssertES2017;
    }

    if (node.asteriskToken) {
      transformFlags |= TransformFlags.AssertGenerator;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return propagatePropertyNameFlags(node.name, transformFlags & ~TransformFlags.MethodOrAccessorExcludes);
  }

  function computeAccessor(node: AccessorDeclaration, subtreeFlags: TransformFlags) {
    let transformFlags = subtreeFlags;

    // Decorators, TypeScript-specific modifiers, type annotations, and overloads are
    // TypeScript syntax.
    if (node.decorators || hasSyntacticModifier(node, ModifierFlags.TypeScriptModifier) || node.type || !node.body) {
      transformFlags |= TransformFlags.AssertTypeScript;
    }

    // function declarations with object rest destructuring are ES2018 syntax
    if (subtreeFlags & TransformFlags.ContainsObjectRestOrSpread) {
      transformFlags |= TransformFlags.AssertES2018;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return propagatePropertyNameFlags(node.name, transformFlags & ~TransformFlags.MethodOrAccessorExcludes);
  }

  function computePropertyDeclaration(node: PropertyDeclaration, subtreeFlags: TransformFlags) {
    let transformFlags = subtreeFlags | TransformFlags.ContainsClassFields;

    // Decorators, TypeScript-specific modifiers, and type annotations are TypeScript syntax.
    if (some(node.decorators) || hasSyntacticModifier(node, ModifierFlags.TypeScriptModifier) || node.type || node.questionToken || node.exclamationToken) {
      transformFlags |= TransformFlags.AssertTypeScript;
    }

    // Hoisted variables related to class properties should live within the TypeScript class wrapper.
    if (Node.is.kind(ComputedPropertyName, node.name) || (hasStaticModifier(node) && node.initializer)) {
      transformFlags |= TransformFlags.ContainsTypeScriptClassSyntax;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return propagatePropertyNameFlags(node.name, transformFlags & ~TransformFlags.PropertyExcludes);
  }

  function computeFunctionDeclaration(node: FunctionDeclaration, subtreeFlags: TransformFlags) {
    let transformFlags: TransformFlags;
    const modifierFlags = getSyntacticModifierFlags(node);
    const body = node.body;

    if (!body || modifierFlags & ModifierFlags.Ambient) {
      // An ambient declaration is TypeScript syntax.
      // A FunctionDeclaration without a body is an overload and is TypeScript syntax.
      transformFlags = TransformFlags.AssertTypeScript;
    } else {
      transformFlags = subtreeFlags | TransformFlags.ContainsHoistedDeclarationOrCompletion;

      // TypeScript-specific modifiers, type parameters, and type annotations are TypeScript
      // syntax.
      if (modifierFlags & ModifierFlags.TypeScriptModifier || node.typeParameters || node.type) {
        transformFlags |= TransformFlags.AssertTypeScript;
      }

      // An async function declaration is ES2017 syntax.
      if (modifierFlags & ModifierFlags.Async) {
        transformFlags |= node.asteriskToken ? TransformFlags.AssertES2018 : TransformFlags.AssertES2017;
      }

      // function declarations with object rest destructuring are ES2018 syntax
      if (subtreeFlags & TransformFlags.ContainsObjectRestOrSpread) {
        transformFlags |= TransformFlags.AssertES2018;
      }

      // If a FunctionDeclaration is generator function and is the body of a
      // transformed async function, then this node can be transformed to a
      // down-level generator.
      // Currently we do not support transforming any other generator functions
      // down level.
      if (node.asteriskToken) {
        transformFlags |= TransformFlags.AssertGenerator;
      }
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.FunctionExcludes;
  }

  function computeFunctionExpression(node: FunctionExpression, subtreeFlags: TransformFlags) {
    let transformFlags = subtreeFlags;

    // TypeScript-specific modifiers, type parameters, and type annotations are TypeScript
    // syntax.
    if (hasSyntacticModifier(node, ModifierFlags.TypeScriptModifier) || node.typeParameters || node.type) {
      transformFlags |= TransformFlags.AssertTypeScript;
    }

    // An async function expression is ES2017 syntax.
    if (hasSyntacticModifier(node, ModifierFlags.Async)) {
      transformFlags |= node.asteriskToken ? TransformFlags.AssertES2018 : TransformFlags.AssertES2017;
    }

    // function expressions with object rest destructuring are ES2018 syntax
    if (subtreeFlags & TransformFlags.ContainsObjectRestOrSpread) {
      transformFlags |= TransformFlags.AssertES2018;
    }

    // If a FunctionExpression is generator function and is the body of a
    // transformed async function, then this node can be transformed to a
    // down-level generator.
    if (node.asteriskToken) {
      transformFlags |= TransformFlags.AssertGenerator;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.FunctionExcludes;
  }

  function computeArrowFunction(node: ArrowFunction, subtreeFlags: TransformFlags) {
    // An ArrowFunction is ES6 syntax, and excludes markers that should not escape the scope of an ArrowFunction.
    let transformFlags = subtreeFlags | TransformFlags.AssertES2015;

    // TypeScript-specific modifiers, type parameters, and type annotations are TypeScript
    // syntax.
    if (hasSyntacticModifier(node, ModifierFlags.TypeScriptModifier) || node.typeParameters || node.type) {
      transformFlags |= TransformFlags.AssertTypeScript;
    }

    // An async arrow function is ES2017 syntax.
    if (hasSyntacticModifier(node, ModifierFlags.Async)) {
      transformFlags |= TransformFlags.AssertES2017;
    }

    // arrow functions with object rest destructuring are ES2018 syntax
    if (subtreeFlags & TransformFlags.ContainsObjectRestOrSpread) {
      transformFlags |= TransformFlags.AssertES2018;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.ArrowFunctionExcludes;
  }

  function computePropertyAccess(node: PropertyAccessExpression, subtreeFlags: TransformFlags) {
    let transformFlags = subtreeFlags;

    if (node.flags & NodeFlags.OptionalChain) {
      transformFlags |= TransformFlags.ContainsES2020;
    }

    // If a PropertyAccessExpression starts with a super keyword, then it is
    // ES6 syntax, and requires a lexical `this` binding.
    if (node.expression.kind === Syntax.SuperKeyword) {
      // super inside of an async function requires hoisting the super access (ES2017).
      // same for super inside of an async generator, which is ES2018.
      transformFlags |= TransformFlags.ContainsES2017 | TransformFlags.ContainsES2018;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.PropertyAccessExcludes;
  }

  function computeElementAccess(node: ElementAccessExpression, subtreeFlags: TransformFlags) {
    let transformFlags = subtreeFlags;

    if (node.flags & NodeFlags.OptionalChain) {
      transformFlags |= TransformFlags.ContainsES2020;
    }

    // If an ElementAccessExpression starts with a super keyword, then it is
    // ES6 syntax, and requires a lexical `this` binding.
    if (node.expression.kind === Syntax.SuperKeyword) {
      // super inside of an async function requires hoisting the super access (ES2017).
      // same for super inside of an async generator, which is ES2018.
      transformFlags |= TransformFlags.ContainsES2017 | TransformFlags.ContainsES2018;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.PropertyAccessExcludes;
  }

  function computeVariableDeclaration(node: VariableDeclaration, subtreeFlags: TransformFlags) {
    let transformFlags = subtreeFlags;
    transformFlags |= TransformFlags.AssertES2015 | TransformFlags.ContainsBindingPattern; // TODO(rbuckton): Why are these set unconditionally?

    // A VariableDeclaration containing ObjectRest is ES2018 syntax
    if (subtreeFlags & TransformFlags.ContainsObjectRestOrSpread) {
      transformFlags |= TransformFlags.AssertES2018;
    }

    // Type annotations are TypeScript syntax.
    if (node.type || node.exclamationToken) {
      transformFlags |= TransformFlags.AssertTypeScript;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.NodeExcludes;
  }

  function computeVariableStatement(node: VariableStatement, subtreeFlags: TransformFlags) {
    let transformFlags: TransformFlags;
    const declarationListTransformFlags = node.declarationList.transformFlags;

    // An ambient declaration is TypeScript syntax.
    if (hasSyntacticModifier(node, ModifierFlags.Ambient)) {
      transformFlags = TransformFlags.AssertTypeScript;
    } else {
      transformFlags = subtreeFlags;

      if (declarationListTransformFlags & TransformFlags.ContainsBindingPattern) {
        transformFlags |= TransformFlags.AssertES2015;
      }
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.NodeExcludes;
  }

  function computeLabeledStatement(node: LabeledStatement, subtreeFlags: TransformFlags) {
    let transformFlags = subtreeFlags;

    // A labeled statement containing a block scoped binding *may* need to be transformed from ES6.
    if (subtreeFlags & TransformFlags.ContainsBlockScopedBinding && Node.is.iterationStatement(node, /*lookInLabeledStatements*/ true)) {
      transformFlags |= TransformFlags.AssertES2015;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.NodeExcludes;
  }

  function computeImportEquals(node: ImportEqualsDeclaration, subtreeFlags: TransformFlags) {
    let transformFlags = subtreeFlags;

    // An ImportEqualsDeclaration with a namespace reference is TypeScript.
    if (!Node.is.externalModuleImportEqualsDeclaration(node)) {
      transformFlags |= TransformFlags.AssertTypeScript;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.NodeExcludes;
  }

  function computeExpressionStatement(node: ExpressionStatement, subtreeFlags: TransformFlags) {
    const transformFlags = subtreeFlags;
    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.NodeExcludes;
  }

  function computeModuleDeclaration(node: ModuleDeclaration, subtreeFlags: TransformFlags) {
    let transformFlags = TransformFlags.AssertTypeScript;
    const modifierFlags = getSyntacticModifierFlags(node);

    if ((modifierFlags & ModifierFlags.Ambient) === 0) {
      transformFlags |= subtreeFlags;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.ModuleExcludes;
  }

  function computeVariableDeclarationList(node: VariableDeclarationList, subtreeFlags: TransformFlags) {
    let transformFlags = subtreeFlags | TransformFlags.ContainsHoistedDeclarationOrCompletion;

    if (subtreeFlags & TransformFlags.ContainsBindingPattern) {
      transformFlags |= TransformFlags.AssertES2015;
    }

    // If a VariableDeclarationList is `let` or `const`, then it is ES6 syntax.
    if (node.flags & NodeFlags.BlockScoped) {
      transformFlags |= TransformFlags.AssertES2015 | TransformFlags.ContainsBlockScopedBinding;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~TransformFlags.VariableDeclarationListExcludes;
  }

  function computeOther(node: Node, kind: Syntax, subtreeFlags: TransformFlags) {
    // Mark transformations needed for each node
    let transformFlags = subtreeFlags;
    let excludeFlags = TransformFlags.NodeExcludes;

    switch (kind) {
      case Syntax.AsyncKeyword:
        // async is ES2017 syntax, but may be ES2018 syntax (for async generators)
        transformFlags |= TransformFlags.AssertES2018 | TransformFlags.AssertES2017;
        break;
      case Syntax.AwaitExpression:
        // await is ES2017 syntax, but may be ES2018 syntax (for async generators)
        transformFlags |= TransformFlags.AssertES2018 | TransformFlags.AssertES2017 | TransformFlags.ContainsAwait;
        break;

      case Syntax.TypeAssertionExpression:
      case Syntax.AsExpression:
      case Syntax.PartiallyEmittedExpression:
        // These nodes are TypeScript syntax.
        transformFlags |= TransformFlags.AssertTypeScript;
        excludeFlags = TransformFlags.OuterExpressionExcludes;
        break;
      case Syntax.PublicKeyword:
      case Syntax.PrivateKeyword:
      case Syntax.ProtectedKeyword:
      case Syntax.AbstractKeyword:
      case Syntax.DeclareKeyword:
      case Syntax.ConstKeyword:
      case Syntax.EnumDeclaration:
      case Syntax.EnumMember:
      case Syntax.NonNullExpression:
      case Syntax.ReadonlyKeyword:
        // These nodes are TypeScript syntax.
        transformFlags |= TransformFlags.AssertTypeScript;
        break;

      case Syntax.JsxElement:
      case Syntax.JsxText:
      case Syntax.JsxClosingElement:
      case Syntax.JsxFragment:
      case Syntax.JsxOpeningFragment:
      case Syntax.JsxClosingFragment:
      case Syntax.JsxAttribute:
      case Syntax.JsxAttributes:
      case Syntax.JsxSpreadAttribute:
      case Syntax.JsxExpression:
        // These nodes are Jsx syntax.
        transformFlags |= TransformFlags.AssertJsx;
        break;

      case Syntax.NoSubstitutionLiteral:
      case Syntax.TemplateHead:
      case Syntax.TemplateMiddle:
      case Syntax.TemplateTail:
        if ((<NoSubstitutionLiteral | TemplateHead | TemplateMiddle | TemplateTail>node).templateFlags) {
          transformFlags |= TransformFlags.AssertES2018;
          break;
        }
      // falls through
      case Syntax.TaggedTemplateExpression:
        if (hasInvalidEscape((<TaggedTemplateExpression>node).template)) {
          transformFlags |= TransformFlags.AssertES2018;
          break;
        }
      // falls through
      case Syntax.TemplateExpression:
      case Syntax.ShorthandPropertyAssignment:
      case Syntax.StaticKeyword:
      case Syntax.MetaProperty:
        // These nodes are ES6 syntax.
        transformFlags |= TransformFlags.AssertES2015;
        break;

      case Syntax.StringLiteral:
        if ((<StringLiteral>node).hasExtendedEscape) {
          transformFlags |= TransformFlags.AssertES2015;
        }
        break;

      case Syntax.NumericLiteral:
        if ((<NumericLiteral>node).numericLiteralFlags & TokenFlags.BinaryOrOctalSpecifier) {
          transformFlags |= TransformFlags.AssertES2015;
        }
        break;

      case Syntax.BigIntLiteral:
        transformFlags |= TransformFlags.AssertESNext;
        break;

      case Syntax.ForOfStatement:
        // This node is either ES2015 syntax or ES2017 syntax (if it is a for-await-of).
        if ((<ForOfStatement>node).awaitModifier) {
          transformFlags |= TransformFlags.AssertES2018;
        }
        transformFlags |= TransformFlags.AssertES2015;
        break;

      case Syntax.YieldExpression:
        // This node is either ES2015 syntax (in a generator) or ES2017 syntax (in an async
        // generator).
        transformFlags |= TransformFlags.AssertES2018 | TransformFlags.AssertES2015 | TransformFlags.ContainsYield;
        break;

      case Syntax.AnyKeyword:
      case Syntax.NumberKeyword:
      case Syntax.BigIntKeyword:
      case Syntax.NeverKeyword:
      case Syntax.ObjectKeyword:
      case Syntax.StringKeyword:
      case Syntax.BooleanKeyword:
      case Syntax.SymbolKeyword:
      case Syntax.VoidKeyword:
      case Syntax.TypeParameter:
      case Syntax.PropertySignature:
      case Syntax.MethodSignature:
      case Syntax.CallSignature:
      case Syntax.ConstructSignature:
      case Syntax.IndexSignature:
      case Syntax.TypePredicate:
      case Syntax.TypeReference:
      case Syntax.FunctionType:
      case Syntax.ConstructorType:
      case Syntax.TypeQuery:
      case Syntax.TypeLiteral:
      case Syntax.ArrayType:
      case Syntax.TupleType:
      case Syntax.OptionalType:
      case Syntax.RestType:
      case Syntax.UnionType:
      case Syntax.IntersectionType:
      case Syntax.ConditionalType:
      case Syntax.InferType:
      case Syntax.ParenthesizedType:
      case Syntax.InterfaceDeclaration:
      case Syntax.TypeAliasDeclaration:
      case Syntax.ThisType:
      case Syntax.TypeOperator:
      case Syntax.IndexedAccessType:
      case Syntax.MappedType:
      case Syntax.LiteralType:
      case Syntax.NamespaceExportDeclaration:
        // Types and signatures are TypeScript syntax, and exclude all other facts.
        transformFlags = TransformFlags.AssertTypeScript;
        excludeFlags = TransformFlags.TypeExcludes;
        break;

      case Syntax.ComputedPropertyName:
        // Even though computed property names are ES6, we don't treat them as such.
        // This is so that they can flow through PropertyName transforms unaffected.
        // Instead, we mark the container as ES6, so that it can properly handle the transform.
        transformFlags |= TransformFlags.ContainsComputedPropertyName;
        break;

      case Syntax.SpreadElement:
        transformFlags |= TransformFlags.AssertES2015 | TransformFlags.ContainsRestOrSpread;
        break;

      case Syntax.SpreadAssignment:
        transformFlags |= TransformFlags.AssertES2018 | TransformFlags.ContainsObjectRestOrSpread;
        break;

      case Syntax.SuperKeyword:
        // This node is ES6 syntax.
        transformFlags |= TransformFlags.AssertES2015;
        excludeFlags = TransformFlags.OuterExpressionExcludes; // must be set to persist `Super`
        break;

      case Syntax.ThisKeyword:
        // Mark this node and its ancestors as containing a lexical `this` keyword.
        transformFlags |= TransformFlags.ContainsLexicalThis;
        break;

      case Syntax.ObjectBindingPattern:
        transformFlags |= TransformFlags.AssertES2015 | TransformFlags.ContainsBindingPattern;
        if (subtreeFlags & TransformFlags.ContainsRestOrSpread) {
          transformFlags |= TransformFlags.AssertES2018 | TransformFlags.ContainsObjectRestOrSpread;
        }
        excludeFlags = TransformFlags.BindingPatternExcludes;
        break;

      case Syntax.ArrayBindingPattern:
        transformFlags |= TransformFlags.AssertES2015 | TransformFlags.ContainsBindingPattern;
        excludeFlags = TransformFlags.BindingPatternExcludes;
        break;

      case Syntax.BindingElement:
        transformFlags |= TransformFlags.AssertES2015;
        if ((<BindingElement>node).dot3Token) {
          transformFlags |= TransformFlags.ContainsRestOrSpread;
        }
        break;

      case Syntax.Decorator:
        // This node is TypeScript syntax, and marks its container as also being TypeScript syntax.
        transformFlags |= TransformFlags.AssertTypeScript | TransformFlags.ContainsTypeScriptClassSyntax;
        break;

      case Syntax.ObjectLiteralExpression:
        excludeFlags = TransformFlags.ObjectLiteralExcludes;
        if (subtreeFlags & TransformFlags.ContainsComputedPropertyName) {
          // If an ObjectLiteralExpression contains a ComputedPropertyName, then it
          // is an ES6 node.
          transformFlags |= TransformFlags.AssertES2015;
        }

        if (subtreeFlags & TransformFlags.ContainsObjectRestOrSpread) {
          // If an ObjectLiteralExpression contains a spread element, then it
          // is an ES2018 node.
          transformFlags |= TransformFlags.AssertES2018;
        }

        break;

      case Syntax.ArrayLiteralExpression:
        excludeFlags = TransformFlags.ArrayLiteralOrCallOrNewExcludes;
        break;

      case Syntax.DoStatement:
      case Syntax.WhileStatement:
      case Syntax.ForStatement:
      case Syntax.ForInStatement:
        // A loop containing a block scoped binding *may* need to be transformed from ES6.
        if (subtreeFlags & TransformFlags.ContainsBlockScopedBinding) {
          transformFlags |= TransformFlags.AssertES2015;
        }

        break;

      case Syntax.SourceFile:
        break;

      case Syntax.NamespaceExport:
        transformFlags |= TransformFlags.AssertESNext;
        break;

      case Syntax.ReturnStatement:
        // Return statements may require an `await` in ES2018.
        transformFlags |= TransformFlags.ContainsHoistedDeclarationOrCompletion | TransformFlags.AssertES2018;
        break;

      case Syntax.ContinueStatement:
      case Syntax.BreakStatement:
        transformFlags |= TransformFlags.ContainsHoistedDeclarationOrCompletion;
        break;

      case Syntax.PrivateIdentifier:
        transformFlags |= TransformFlags.ContainsClassFields;
        break;
    }

    node.transformFlags = transformFlags | TransformFlags.HasComputedFlags;
    return transformFlags & ~excludeFlags;
  }

  function propagatePropertyNameFlags(node: PropertyName, transformFlags: TransformFlags) {
    return transformFlags | (node.transformFlags & TransformFlags.PropertyNamePropagatingFlags);
  }

  /**
   * Gets the transform flags to exclude when unioning the transform flags of a subtree.
   *
   * NOTE: This needs to be kept up-to-date with the exclusions used in `computeTransformFlagsForNode`.
   *       For performance reasons, `computeTransformFlagsForNode` uses local constant values rather
   *       than calling this function.
   */
  export function getTransformFlagsSubtreeExclusions(kind: Syntax) {
    if (kind >= Syntax.FirstTypeNode && kind <= Syntax.LastTypeNode) {
      return TransformFlags.TypeExcludes;
    }

    switch (kind) {
      case Syntax.CallExpression:
      case Syntax.NewExpression:
      case Syntax.ArrayLiteralExpression:
        return TransformFlags.ArrayLiteralOrCallOrNewExcludes;
      case Syntax.ModuleDeclaration:
        return TransformFlags.ModuleExcludes;
      case Syntax.Parameter:
        return TransformFlags.ParameterExcludes;
      case Syntax.ArrowFunction:
        return TransformFlags.ArrowFunctionExcludes;
      case Syntax.FunctionExpression:
      case Syntax.FunctionDeclaration:
        return TransformFlags.FunctionExcludes;
      case Syntax.VariableDeclarationList:
        return TransformFlags.VariableDeclarationListExcludes;
      case Syntax.ClassDeclaration:
      case Syntax.ClassExpression:
        return TransformFlags.ClassExcludes;
      case Syntax.Constructor:
        return TransformFlags.ConstructorExcludes;
      case Syntax.MethodDeclaration:
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        return TransformFlags.MethodOrAccessorExcludes;
      case Syntax.AnyKeyword:
      case Syntax.NumberKeyword:
      case Syntax.BigIntKeyword:
      case Syntax.NeverKeyword:
      case Syntax.StringKeyword:
      case Syntax.ObjectKeyword:
      case Syntax.BooleanKeyword:
      case Syntax.SymbolKeyword:
      case Syntax.VoidKeyword:
      case Syntax.TypeParameter:
      case Syntax.PropertySignature:
      case Syntax.MethodSignature:
      case Syntax.CallSignature:
      case Syntax.ConstructSignature:
      case Syntax.IndexSignature:
      case Syntax.InterfaceDeclaration:
      case Syntax.TypeAliasDeclaration:
        return TransformFlags.TypeExcludes;
      case Syntax.ObjectLiteralExpression:
        return TransformFlags.ObjectLiteralExcludes;
      case Syntax.CatchClause:
        return TransformFlags.CatchClauseExcludes;
      case Syntax.ObjectBindingPattern:
      case Syntax.ArrayBindingPattern:
        return TransformFlags.BindingPatternExcludes;
      case Syntax.TypeAssertionExpression:
      case Syntax.AsExpression:
      case Syntax.PartiallyEmittedExpression:
      case Syntax.ParenthesizedExpression:
      case Syntax.SuperKeyword:
        return TransformFlags.OuterExpressionExcludes;
      case Syntax.PropertyAccessExpression:
      case Syntax.ElementAccessExpression:
        return TransformFlags.PropertyAccessExcludes;
      default:
        return TransformFlags.NodeExcludes;
    }
  }

  /**
   * "Binds" JSDoc nodes in TypeScript code.
   * Since we will never create symbols for JSDoc, we just set parent pointers instead.
   */
  function setParentPointers(parent: Node, child: Node): void {
    child.parent = parent;
    Node.forEach.child(child, (grandchild) => setParentPointers(child, grandchild));
  }
}