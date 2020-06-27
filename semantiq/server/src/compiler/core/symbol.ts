namespace core {
  export const enum SymbolFlags {
    None = 0,
    FunctionScopedVariable = 1 << 0, // Variable (var) or parameter
    BlockScopedVariable = 1 << 1, // A block-scoped variable (let or const)
    Property = 1 << 2, // Property or enum member
    EnumMember = 1 << 3, // Enum member
    Function = 1 << 4, // Function
    Class = 1 << 5, // Class
    Interface = 1 << 6, // Interface
    ConstEnum = 1 << 7, // Const enum
    RegularEnum = 1 << 8, // Enum
    ValueModule = 1 << 9, // Instantiated module
    NamespaceModule = 1 << 10, // Uninstantiated module
    TypeLiteral = 1 << 11, // Type Literal or mapped type
    ObjectLiteral = 1 << 12, // Object Literal
    Method = 1 << 13, // Method
    Constructor = 1 << 14, // Constructor
    GetAccessor = 1 << 15, // Get accessor
    SetAccessor = 1 << 16, // Set accessor
    Signature = 1 << 17, // Call, construct, or index signature
    TypeParameter = 1 << 18, // Type parameter
    TypeAlias = 1 << 19, // Type alias
    ExportValue = 1 << 20, // Exported value marker (see comment in declareModuleMember in binder)
    Alias = 1 << 21, // An alias for another symbol (see comment in isAliasSymbolDeclaration in checker)
    Prototype = 1 << 22, // Prototype property (no source representation)
    ExportStar = 1 << 23, // Export * declaration
    Optional = 1 << 24, // Optional property
    Transient = 1 << 25, // Transient symbol (created during type check)
    Assignment = 1 << 26, // Assignment treated as declaration (eg `this.prop = 1`)
    ModuleExports = 1 << 27, // Symbol for CommonJS `module` of `module.exports`
    All = FunctionScopedVariable |
      BlockScopedVariable |
      Property |
      EnumMember |
      Function |
      Class |
      Interface |
      ConstEnum |
      RegularEnum |
      ValueModule |
      NamespaceModule |
      TypeLiteral |
      ObjectLiteral |
      Method |
      Constructor |
      GetAccessor |
      SetAccessor |
      Signature |
      TypeParameter |
      TypeAlias |
      ExportValue |
      Alias |
      Prototype |
      ExportStar |
      Optional |
      Transient,
    Enum = RegularEnum | ConstEnum,
    Variable = FunctionScopedVariable | BlockScopedVariable,
    Value = Variable | Property | EnumMember | ObjectLiteral | Function | Class | Enum | ValueModule | Method | GetAccessor | SetAccessor,
    Type = Class | Interface | Enum | EnumMember | TypeLiteral | TypeParameter | TypeAlias,
    Namespace = ValueModule | NamespaceModule | Enum,
    Module = ValueModule | NamespaceModule,
    Accessor = GetAccessor | SetAccessor,
    // Variables can be redeclared, but can not redeclare a block-scoped declaration with the
    // same name, or any other value that is not a variable, e.g. ValueModule or Class
    FunctionScopedVariableExcludes = Value & ~FunctionScopedVariable,
    // Block-scoped declarations are not allowed to be re-declared
    // they can not merge with anything in the value space
    BlockScopedVariableExcludes = Value,
    ParameterExcludes = Value,
    PropertyExcludes = None,
    EnumMemberExcludes = Value | Type,
    FunctionExcludes = Value & ~(Function | ValueModule | Class),
    ClassExcludes = (Value | Type) & ~(ValueModule | Interface | Function), // class-interface mergability done in checker.ts
    InterfaceExcludes = Type & ~(Interface | Class),
    RegularEnumExcludes = (Value | Type) & ~(RegularEnum | ValueModule), // regular enums merge only with regular enums and modules
    ConstEnumExcludes = (Value | Type) & ~ConstEnum, // const enums merge only with const enums
    ValueModuleExcludes = Value & ~(Function | Class | RegularEnum | ValueModule),
    NamespaceModuleExcludes = 0,
    MethodExcludes = Value & ~Method,
    GetAccessorExcludes = Value & ~SetAccessor,
    SetAccessorExcludes = Value & ~GetAccessor,
    TypeParameterExcludes = Type & ~TypeParameter,
    TypeAliasExcludes = Type,
    AliasExcludes = Alias,
    ModuleMember = Variable | Function | Class | Interface | Enum | Module | TypeAlias | Alias,
    ExportHasLocal = Function | Class | Enum | ValueModule,
    BlockScoped = BlockScopedVariable | Class | Enum,
    PropertyOrAccessor = Property | Accessor,
    ClassMember = Method | Accessor | Property,
    ExportSupportsDefaultModifier = Class | Function | Interface,
    ExportDoesNotSupportDefaultModifier = ~ExportSupportsDefaultModifier,
    // The set of things we consider semantically classifiable.  Used to speed up the LS during
    // classification.
    Classifiable = Class | Enum | TypeAlias | Interface | TypeParameter | Module | Alias,
    LateBindingContainer = Class | Interface | TypeLiteral | ObjectLiteral | Function,
  }
  export function getExcludedSymbolFlags(flags: SymbolFlags): SymbolFlags {
    let result: SymbolFlags = 0;
    if (flags & SymbolFlags.BlockScopedVariable) result |= SymbolFlags.BlockScopedVariableExcludes;
    if (flags & SymbolFlags.FunctionScopedVariable) result |= SymbolFlags.FunctionScopedVariableExcludes;
    if (flags & SymbolFlags.Property) result |= SymbolFlags.PropertyExcludes;
    if (flags & SymbolFlags.EnumMember) result |= SymbolFlags.EnumMemberExcludes;
    if (flags & SymbolFlags.Function) result |= SymbolFlags.FunctionExcludes;
    if (flags & SymbolFlags.Class) result |= SymbolFlags.ClassExcludes;
    if (flags & SymbolFlags.Interface) result |= SymbolFlags.InterfaceExcludes;
    if (flags & SymbolFlags.RegularEnum) result |= SymbolFlags.RegularEnumExcludes;
    if (flags & SymbolFlags.ConstEnum) result |= SymbolFlags.ConstEnumExcludes;
    if (flags & SymbolFlags.ValueModule) result |= SymbolFlags.ValueModuleExcludes;
    if (flags & SymbolFlags.Method) result |= SymbolFlags.MethodExcludes;
    if (flags & SymbolFlags.GetAccessor) result |= SymbolFlags.GetAccessorExcludes;
    if (flags & SymbolFlags.SetAccessor) result |= SymbolFlags.SetAccessorExcludes;
    if (flags & SymbolFlags.TypeParameter) result |= SymbolFlags.TypeParameterExcludes;
    if (flags & SymbolFlags.TypeAlias) result |= SymbolFlags.TypeAliasExcludes;
    if (flags & SymbolFlags.Alias) result |= SymbolFlags.AliasExcludes;
    return result;
  }

  export interface SymbolLinks {
    immediateTarget?: Symbol; // Immediate target of an alias. May be another alias. Do not access directly, use `checker.getImmediateAliasedSymbol` instead.
    target?: Symbol; // Resolved (non-alias) target of an alias
    type?: Type; // Type of value symbol
    nameType?: Type; // Type associated with a late-bound symbol
    uniqueESSymbolType?: Type; // UniqueESSymbol type for a symbol
    declaredType?: Type; // Type of class, interface, enum, type alias, or type parameter
    typeParameters?: TypeParameter[]; // Type parameters of type alias (undefined if non-generic)
    outerTypeParameters?: TypeParameter[]; // Outer type parameters of anonymous object type
    instantiations?: QMap<Type>; // Instantiations of generic type alias (undefined if non-generic)
    inferredClassSymbol?: QMap<TransientSymbol>; // Symbol of an inferred ES5 constructor function
    mapper?: TypeMapper; // Type mapper for instantiation alias
    referenced?: boolean; // True if alias symbol has been referenced as a value that can be emitted
    constEnumReferenced?: boolean; // True if alias symbol resolves to a const enum and is referenced as a value ('referenced' will be false)
    containingType?: UnionOrIntersectionType; // Containing union or intersection type for synthetic property
    leftSpread?: Symbol; // Left source for synthetic spread property
    rightSpread?: Symbol; // Right source for synthetic spread property
    syntheticOrigin?: Symbol; // For a property on a mapped or spread type, points back to the original property
    isDiscriminantProperty?: boolean; // True if discriminant synthetic property
    resolvedExports?: SymbolTable; // Resolved exports of module or combined early- and late-bound static members of a class.
    resolvedMembers?: SymbolTable; // Combined early- and late-bound members of a symbol
    exportsChecked?: boolean; // True if exports of external module have been checked
    typeParametersChecked?: boolean; // True if type parameters of merged class and interface declarations have been checked.
    isDeclarationWithCollidingName?: boolean; // True if symbol is block scoped redeclaration
    bindingElement?: BindingElement; // Binding element associated with property symbol
    exportsSomeValue?: boolean; // True if module exports some value (not just types)
    enumKind?: EnumKind; // Enum declaration classification
    originatingImport?: ImportDeclaration | ImportCall; // Import declaration which produced the symbol, present if the symbol is marked as uncallable but had call signatures in `resolveESModuleSymbol`
    lateSymbol?: Symbol; // Late-bound symbol for a computed property
    specifierCache?: QMap<string>; // For symbols corresponding to external modules, a cache of incoming path -> module specifier name mappings
    extendedContainers?: Symbol[]; // Containers (other than the parent) which this symbol is aliased in
    extendedContainersByFile?: QMap<Symbol[]>; // Containers (other than the parent) which this symbol is aliased in
    variances?: VarianceFlags[]; // Alias symbol type argument variance cache
    deferralConstituents?: Type[]; // Calculated list of constituents for a deferred type
    deferralParent?: Type; // Source union/intersection of a deferred type
    cjsExportMerged?: Symbol; // Version of the symbol with all non export= exports merged with the export= target
    typeOnlyDeclaration?: TypeOnlyCompatibleAliasDeclaration | false; // First resolved alias declaration that makes the symbol only usable in type constructs
    isConstructorDeclaredProperty?: boolean; // Property declared through 'this.x = ...' assignment in constructor
    tupleLabelDeclaration?: NamedTupleMember | ParameterDeclaration; // Declaration associated with the tuple's label
  }

  interface SymbolDisplayPart {}
  interface JSDocTagInfo {}

  let nextSymbolId = 1;

  export class Symbol {
    declarations!: Declaration[]; // Declarations associated with this symbol
    valueDeclaration!: Declaration; // First value declaration of the symbol
    members?: SymbolTable; // Class, interface or object literal instance members
    exports?: SymbolTable; // Module exports
    globalExports?: SymbolTable; // Conditional global UMD exports
    id?: number; // Unique id (used to look up SymbolLinks)
    mergeId?: number; // Merge id (used to look up merged symbol)
    parent?: Symbol; // Parent symbol
    exportSymbol?: Symbol; // Exported symbol associated with this symbol
    constEnumOnlyModule?: boolean; // True if module contains only const enums or other modules with only const enums
    isReferenced?: SymbolFlags; // True if the symbol is referenced elsewhere. Keeps track of the meaning of a reference in case a symbol is both a type parameter and parameter.
    isReplaceableByMethod?: boolean; // Can this Javascript class property be replaced by a method symbol?
    isAssigned?: boolean; // True if the symbol is a parameter with assignments
    assignmentDeclarationMembers?: QMap<Declaration>; // detected late-bound assignment declarations associated with the symbol
    docComment?: SymbolDisplayPart[];
    getComment?: SymbolDisplayPart[];
    setComment?: SymbolDisplayPart[];
    tags?: JSDocTagInfo[];

    constructor(public flags: SymbolFlags, public escName: __String) {}

    get name(): string {
      return symbolName(this);
    }
    getSymbolId(symbol: Symbol): number {
      if (!symbol.id) {
        symbol.id = nextSymbolId;
        nextSymbolId++;
      }
      return symbol.id;
    }

    getName(): string {
      return this.name;
    }
    getEscName(): __String {
      return this.escName;
    }
    getFlags(): SymbolFlags {
      return this.flags;
    }
    getDeclarations(): Declaration[] | undefined {
      return this.declarations;
    }
    getDocComment(checker: TypeChecker | undefined): SymbolDisplayPart[] {
      if (!this.docComment) {
        this.docComment = empty;
        if (!this.declarations && ((this as Symbol) as TransientSymbol).target && (((this as Symbol) as TransientSymbol).target as TransientSymbol).tupleLabelDeclaration) {
          const labelDecl = (((this as Symbol) as TransientSymbol).target as TransientSymbol).tupleLabelDeclaration!;
          this.docComment = getDocComment([labelDecl], checker);
        } else {
          this.docComment = getDocComment(this.declarations, checker);
        }
      }
      return this.docComment!;
    }
    getCtxComment(context: Node | undefined, checker: TypeChecker | undefined): SymbolDisplayPart[] {
      switch (context?.kind) {
        case Syntax.GetAccessor:
          if (!this.getComment) {
            this.getComment = empty;
            this.getComment = getDocComment(filter(this.declarations, isGetAccessor), checker);
          }
          return this.getComment!;
        case Syntax.SetAccessor:
          if (!this.setComment) {
            this.setComment = empty;
            this.setComment = getDocComment(filter(this.declarations, isSetAccessor), checker);
          }
          return this.setComment!;
        default:
          return this.getDocComment(checker);
      }
    }
    getJsDocTags(): JSDocTagInfo[] {
      if (!this.tags) this.tags = JsDoc.getJsDocTagsFromDeclarations(this.declarations);
      return this.tags!;
    }
  }

  export interface TransientSymbol extends Symbol, SymbolLinks {
    checkFlags: CheckFlags;
  }
  export interface MappedSymbol extends TransientSymbol {
    mappedType: MappedType;
    mapper: TypeMapper;
  }
  export interface ReverseMappedSymbol extends TransientSymbol {
    propertyType: Type;
    mappedType: MappedType;
    constraintType: IndexType;
  }
  export const enum InternalSymbolName {
    Call = '__call', // Call signatures
    Constructor = '__constructor', // Constructor implementations
    New = '__new', // Constructor signatures
    Index = '__index', // Index signatures
    ExportStar = '__export', // Module export * declarations
    Global = '__global', // Global self-reference
    Missing = '__missing', // Indicates missing symbol
    Type = '__type', // Anonymous type literal symbol
    Object = '__object', // Anonymous object literal declaration
    JSXAttributes = '__jsxAttributes', // Anonymous JSX attributes object literal declaration
    Class = '__class', // Unnamed class expression
    Function = '__function', // Unnamed function expression
    Computed = '__computed', // Computed property name declaration with dynamic name
    Resolving = '__resolving__', // Indicator symbol used to mark partially resolved type aliases
    Default = 'default', // Default export symbol (technically not wholly internal, but included here for usability)
    ExportEquals = 'export=', // Export assignment symbol
    This = 'this',
  }
  export class SymbolTable<S extends Symbol = Symbol> extends Map<__String, S> implements UnderscoreEscapedMap<S> {
    constructor(ss?: readonly S[]) {
      super();
      if (ss) {
        for (const s of ss) {
          this.set(s.escName, s);
        }
      }
    }
    add(ss: SymbolTable<S>, m: DiagnosticMessage) {
      ss.forEach((s, id) => {
        const t = this.get(id);
        if (t) forEach(t.declarations, addDeclarationDiagnostic(syntax.get.unescUnderscores(id), m));
        else this.set(id, s);
      });
      function addDeclarationDiagnostic(id: string, m: DiagnosticMessage) {
        return (d: Declaration) => diagnostics.add(createDiagnosticForNode(d, m, id));
      }
    }
    merge(ss: SymbolTable<S>, unidirectional = false) {
      ss.forEach((s, id) => {
        const t = this.get(id);
        this.set(id, t ? mergeSymbol(t, s, unidirectional) : s);
      });
    }
    combine(ss: SymbolTable<S> | undefined): SymbolTable<S> | undefined {
      if (!hasEntries(this)) return ss;
      if (!hasEntries(ss)) return this;
      const t = new SymbolTable<S>();
      t.merge(this);
      t.merge(ss);
      return t;
    }
    copy(to: SymbolTable<S>, meaning: SymbolFlags) {
      if (meaning) {
        this.forEach((s) => {
          copySymbol(s, to, meaning);
        });
      }
    }
  }

  export function createGetSymbolWalker(
    getRestTypeOfSignature: (sig: Signature) => Type,
    getTypePredicateOfSignature: (sig: Signature) => TypePredicate | undefined,
    getReturnTypeOfSignature: (sig: Signature) => Type,
    getBaseTypes: (type: Type) => Type[],
    resolveStructuredTypeMembers: (type: ObjectType) => ResolvedType,
    getTypeOfSymbol: (sym: Symbol) => Type,
    getResolvedSymbol: (node: Node) => Symbol,
    getIndexTypeOfStructuredType: (type: Type, kind: IndexKind) => Type | undefined,
    getConstraintOfTypeParameter: (typeParameter: TypeParameter) => Type | undefined,
    getFirstIdentifier: (node: EntityNameOrEntityNameExpression) => Identifier,
    getTypeArguments: (type: TypeReference) => readonly Type[]
  ) {
    return getSymbolWalker;
    function getSymbolWalker(accept: (symbol: Symbol) => boolean = () => true): SymbolWalker {
      const visitedTypes: Type[] = [];
      const visitedSymbols: Symbol[] = [];
      return {
        walkType: (type) => {
          try {
            visitType(type);
            return { visitedTypes: getOwnValues(visitedTypes), visitedSymbols: getOwnValues(visitedSymbols) };
          } finally {
            clear(visitedTypes);
            clear(visitedSymbols);
          }
        },
        walkSymbol: (symbol) => {
          try {
            visitSymbol(symbol);
            return { visitedTypes: getOwnValues(visitedTypes), visitedSymbols: getOwnValues(visitedSymbols) };
          } finally {
            clear(visitedTypes);
            clear(visitedSymbols);
          }
        },
      };
      function visitType(type: Type | undefined) {
        if (!type) return;
        if (visitedTypes[type.id]) return;
        visitedTypes[type.id] = type;
        const shouldBail = visitSymbol(type.symbol);
        if (shouldBail) return;
        if (type.flags & TypeFlags.Object) {
          const objectType = type as ObjectType;
          const objectFlags = objectType.objectFlags;
          if (objectFlags & ObjectFlags.Reference) visitTypeReference(type as TypeReference);
          if (objectFlags & ObjectFlags.Mapped) visitMappedType(type as MappedType);
          if (objectFlags & (ObjectFlags.Class | ObjectFlags.Interface)) visitInterfaceType(type as InterfaceType);
          if (objectFlags & (ObjectFlags.Tuple | ObjectFlags.Anonymous)) visitObjectType(objectType);
        }
        if (type.flags & TypeFlags.TypeParameter) visitTypeParameter(type as TypeParameter);
        if (type.flags & TypeFlags.UnionOrIntersection) visitUnionOrIntersectionType(type as UnionOrIntersectionType);
        if (type.flags & TypeFlags.Index) visitIndexType(type as IndexType);
        if (type.flags & TypeFlags.IndexedAccess) visitIndexedAccessType(type as IndexedAccessType);
      }
      function visitTypeReference(type: TypeReference) {
        visitType(type.target);
        forEach(getTypeArguments(type), visitType);
      }
      function visitTypeParameter(type: TypeParameter) {
        visitType(getConstraintOfTypeParameter(type));
      }
      function visitUnionOrIntersectionType(type: UnionOrIntersectionType) {
        forEach(type.types, visitType);
      }
      function visitIndexType(type: IndexType) {
        visitType(type.type);
      }
      function visitIndexedAccessType(type: IndexedAccessType) {
        visitType(type.objectType);
        visitType(type.indexType);
        visitType(type.constraint);
      }
      function visitMappedType(type: MappedType) {
        visitType(type.typeParameter);
        visitType(type.constraintType);
        visitType(type.templateType);
        visitType(type.modifiersType);
      }
      function visitSignature(signature: Signature) {
        const typePredicate = getTypePredicateOfSignature(signature);
        if (typePredicate) visitType(typePredicate.type);

        forEach(signature.typeParameters, visitType);
        for (const parameter of signature.parameters) {
          visitSymbol(parameter);
        }
        visitType(getRestTypeOfSignature(signature));
        visitType(getReturnTypeOfSignature(signature));
      }
      function visitInterfaceType(interfaceT: InterfaceType) {
        visitObjectType(interfaceT);
        forEach(interfaceT.typeParameters, visitType);
        forEach(getBaseTypes(interfaceT), visitType);
        visitType(interfaceT.thisType);
      }
      function visitObjectType(type: ObjectType) {
        const stringIndexType = getIndexTypeOfStructuredType(type, IndexKind.String);
        visitType(stringIndexType);
        const numberIndexType = getIndexTypeOfStructuredType(type, IndexKind.Number);
        visitType(numberIndexType);
        const resolved = resolveStructuredTypeMembers(type);
        for (const signature of resolved.callSignatures) {
          visitSignature(signature);
        }
        for (const signature of resolved.constructSignatures) {
          visitSignature(signature);
        }
        for (const p of resolved.properties) {
          visitSymbol(p);
        }
      }
      function visitSymbol(symbol: Symbol | undefined): boolean {
        if (!symbol) return false;
        const symbolId = getSymbolId(symbol);
        if (visitedSymbols[symbolId]) return false;
        visitedSymbols[symbolId] = symbol;
        if (!accept(symbol)) return true;
        const t = getTypeOfSymbol(symbol);
        visitType(t);
        if (symbol.exports) symbol.exports.forEach(visitSymbol);
        forEach(symbol.declarations, (d) => {
          if ((d as any).type && (d as any).type.kind === Syntax.TypeQuery) {
            const query = (d as any).type as TypeQueryNode;
            const entity = getResolvedSymbol(getFirstIdentifier(query.exprName));
            visitSymbol(entity);
          }
        });
        return false;
      }
    }
  }

  const qsymbol = class extends Symbol {
    createSymbol(flags: SymbolFlags, name: __String, checkFlags?: CheckFlags) {
      symbolCount++;
      const symbol = <TransientSymbol>new Symbol(flags | SymbolFlags.Transient, name);
      symbol.checkFlags = checkFlags || 0;
      return symbol;
    }
    recordMergedSymbol(target: Symbol, source: Symbol) {
      if (!source.mergeId) {
        source.mergeId = nextMergeId;
        nextMergeId++;
      }
      mergedSymbols[source.mergeId] = target;
    }
    cloneSymbol(s: Symbol): Symbol {
      const result = createSymbol(symbol.flags, symbol.escName);
      result.declarations = symbol.declarations ? symbol.declarations.slice() : [];
      result.parent = symbol.parent;
      if (symbol.valueDeclaration) result.valueDeclaration = symbol.valueDeclaration;
      if (symbol.constEnumOnlyModule) result.constEnumOnlyModule = true;
      if (symbol.members) result.members = cloneMap(symbol.members);
      if (symbol.exports) result.exports = cloneMap(symbol.exports);
      recordMergedSymbol(result, symbol);
      return result;
    }
    mergeSymbol(target: Symbol, source: Symbol, unidirectional = false): Symbol {
      if (!(target.flags & getExcludedSymbolFlags(source.flags)) || (source.flags | target.flags) & SymbolFlags.Assignment) {
        if (source === target) {
          // This can happen when an export assigned namespace exports something also erroneously exported at the top level
          // See `declarationFileNoCrashOnExtraExportModifier` for an example
          return target;
        }
        if (!(target.flags & SymbolFlags.Transient)) {
          const resolvedTarget = resolveSymbol(target);
          if (resolvedTarget === unknownSymbol) return source;

          target = cloneSymbol(resolvedTarget);
        }
        // Javascript static-property-assignment declarations always merge, even though they are also values
        if (source.flags & SymbolFlags.ValueModule && target.flags & SymbolFlags.ValueModule && target.constEnumOnlyModule && !source.constEnumOnlyModule) {
          // reset flag when merging instantiated module into value module that has only const enums
          target.constEnumOnlyModule = false;
        }
        target.flags |= source.flags;
        if (source.valueDeclaration) setValueDeclaration(target, source.valueDeclaration);

        addRange(target.declarations, source.declarations);
        if (source.members) {
          if (!target.members) target.members = new SymbolTable();
          target.members.merge(source.members, unidirectional);
        }
        if (source.exports) {
          if (!target.exports) target.exports = new SymbolTable();
          target.exports.merge(source.exports, unidirectional);
        }
        if (!unidirectional) recordMergedSymbol(target, source);
      } else if (target.flags & SymbolFlags.NamespaceModule) {
        // Do not report an error when merging `var globalThis` with the built-in `globalThis`,
        // as we will already report a "Declaration name conflicts..." error, and this error
        // won't make much sense.
        if (target !== globalThisSymbol)
          error(getNameOfDeclaration(source.declarations[0]), Diagnostics.Cannot_augment_module_0_with_value_exports_because_it_resolves_to_a_non_module_entity, symbolToString(target));
      } else {
        // error
        const isEitherEnum = !!(target.flags & SymbolFlags.Enum || source.flags & SymbolFlags.Enum);
        const isEitherBlockScoped = !!(target.flags & SymbolFlags.BlockScopedVariable || source.flags & SymbolFlags.BlockScopedVariable);
        const message = isEitherEnum
          ? Diagnostics.Enum_declarations_can_only_merge_with_namespace_or_other_enum_declarations
          : isEitherBlockScoped
          ? Diagnostics.Cannot_redeclare_block_scoped_variable_0
          : Diagnostics.Duplicate_identifier_0;
        const sourceSymbolFile = source.declarations && Node.get.sourceFileOf(source.declarations[0]);
        const targetSymbolFile = target.declarations && Node.get.sourceFileOf(target.declarations[0]);
        const symbolName = symbolToString(source);

        // Collect top-level duplicate identifier errors into one mapping, so we can then merge their diagnostics if there are a bunch
        if (sourceSymbolFile && targetSymbolFile && amalgamatedDuplicates && !isEitherEnum && sourceSymbolFile !== targetSymbolFile) {
          const firstFile = comparePaths(sourceSymbolFile.path, targetSymbolFile.path) === Comparison.LessThan ? sourceSymbolFile : targetSymbolFile;
          const secondFile = firstFile === sourceSymbolFile ? targetSymbolFile : sourceSymbolFile;
          const filesDuplicates = getOrUpdate<DuplicateInfoForFiles>(amalgamatedDuplicates, `${firstFile.path}|${secondFile.path}`, () => ({
            firstFile,
            secondFile,
            conflictingSymbols: new QMap(),
          }));
          const conflictingSymbolInfo = getOrUpdate<DuplicateInfoForSymbol>(filesDuplicates.conflictingSymbols, symbolName, () => ({
            isBlockScoped: isEitherBlockScoped,
            firstFileLocations: [],
            secondFileLocations: [],
          }));
          addDuplicateLocations(conflictingSymbolInfo.firstFileLocations, source);
          addDuplicateLocations(conflictingSymbolInfo.secondFileLocations, target);
        } else {
          addDuplicateDeclarationErrorsForSymbols(source, message, symbolName, target);
          addDuplicateDeclarationErrorsForSymbols(target, message, symbolName, source);
        }
      }
      return target;

      function addDuplicateLocations(locs: Declaration[], s: Symbol): void {
        for (const decl of symbol.declarations) {
          pushIfUnique(locs, decl);
        }
      }
    }
    addDuplicateDeclarationErrorsForSymbols(target: Symbol, message: DiagnosticMessage, symbolName: string, source: Symbol) {
      forEach(target.declarations, (node) => {
        addDuplicateDeclarationError(node, message, symbolName, source.declarations);
      });
    }
    getSymbolLinks(s: Symbol): SymbolLinks {
      if (symbol.flags & SymbolFlags.Transient) return <TransientSymbol>symbol;
      const id = getSymbolId(symbol);
      return symbolLinks[id] || (symbolLinks[id] = new (<any>SymbolLinks)());
    }
    isNonLocalAlias(s: Symbol | undefined, excludes = SymbolFlags.Value | SymbolFlags.Type | SymbolFlags.Namespace): symbol is Symbol {
      if (!symbol) return false;
      return (symbol.flags & (SymbolFlags.Alias | excludes)) === SymbolFlags.Alias || !!(symbol.flags & SymbolFlags.Alias && symbol.flags & SymbolFlags.Assignment);
    }
    resolveSymbol(s: Symbol, dontResolveAlias?: boolean): Symbol;
    resolveSymbol(s: Symbol | undefined, dontResolveAlias?: boolean): Symbol | undefined;
    resolveSymbol(s: Symbol | undefined, dontResolveAlias?: boolean): Symbol | undefined {
      return !dontResolveAlias && isNonLocalAlias(symbol) ? resolveAlias(symbol) : symbol;
    }
    resolveAlias(s: Symbol): Symbol {
      assert((symbol.flags & SymbolFlags.Alias) !== 0, 'Should only get Alias here.');
      const links = getSymbolLinks(symbol);
      if (!links.target) {
        links.target = resolvingSymbol;
        const node = getDeclarationOfAliasSymbol(symbol);
        if (!node) return fail();
        const target = getTargetOfAliasDeclaration(node);
        if (links.target === resolvingSymbol) links.target = target || unknownSymbol;
        else error(node, Diagnostics.Circular_definition_of_import_alias_0, symbolToString(symbol));
      } else if (links.target === resolvingSymbol) links.target = unknownSymbol;
      return links.target;
    }
    tryResolveAlias(s: Symbol): Symbol | undefined {
      const links = getSymbolLinks(symbol);
      if (links.target !== resolvingSymbol) return resolveAlias(symbol);
      return;
    }
    getDeclarationOfAliasSymbol(s: Symbol): Declaration | undefined {
      return find<Declaration>(symbol.declarations, isAliasSymbolDeclaration);
    }
    getTypeOnlyAliasDeclaration(s: Symbol): TypeOnlyCompatibleAliasDeclaration | undefined {
      if (!(symbol.flags & SymbolFlags.Alias)) return;
      const links = getSymbolLinks(symbol);
      return links.typeOnlyDeclaration || undefined;
    }
    markAliasSymbolAsReferenced(s: Symbol) {
      const links = getSymbolLinks(symbol);
      if (!links.referenced) {
        links.referenced = true;
        const node = getDeclarationOfAliasSymbol(symbol);
        if (!node) return fail();
        // We defer checking of the reference of an `import =` until the import itself is referenced,
        // This way a chain of imports can be elided if ultimately the final input is only used in a type
        // position.
        if (isInternalModuleImportEqualsDeclaration(node)) {
          const target = resolveSymbol(symbol);
          if (target === unknownSymbol || target.flags & SymbolFlags.Value) {
            // import foo = <symbol>
            checkExpressionCached(<Expression>node.moduleReference);
          }
        }
      }
    }
    markConstEnumAliasAsReferenced(s: Symbol) {
      const links = getSymbolLinks(symbol);
      if (!links.constEnumReferenced) {
        links.constEnumReferenced = true;
      }
    }
    getDeclarationOfJSPrototypeContainer(s: Symbol) {
      const decl = symbol.parent!.valueDeclaration;
      if (!decl) return;

      const initializer = isAssignmentDeclaration(decl) ? getAssignedExpandoInitializer(decl) : Node.is.withOnlyExpressionInitializer(decl) ? getDeclaredExpandoInitializer(decl) : undefined;
      return initializer || decl;
    }
    getExpandoSymbol(s: Symbol): Symbol | undefined {
      const decl = symbol.valueDeclaration;
      if (!decl || !isInJSFile(decl) || symbol.flags & SymbolFlags.TypeAlias || getExpandoInitializer(decl, false)) {
        return;
      }
      const init = Node.is.kind(VariableDeclaration, decl) ? getDeclaredExpandoInitializer(decl) : getAssignedExpandoInitializer(decl);
      if (init) {
        const initSymbol = getSymbolOfNode(init);
        if (initSymbol) return mergeJSSymbols(initSymbol, symbol);
      }
    }
    getExportsOfSymbol(s: Symbol): SymbolTable {
      return symbol.flags & SymbolFlags.LateBindingContainer
        ? getResolvedMembersOrExportsOfSymbol(symbol, MembersOrExportsResolutionKind.resolvedExports)
        : symbol.flags & SymbolFlags.Module
        ? getExportsOfModule(symbol)
        : symbol.exports || emptySymbols;
    }
    getExportsOfModule(ms: Symbol): SymbolTable {
      const links = getSymbolLinks(moduleSymbol);
      return links.resolvedExports || (links.resolvedExports = getExportsOfModuleWorker(moduleSymbol));
    }
    getExportsOfModuleWorker(moduleSymbol: Symbol): SymbolTable {
      const visitedSymbols: Symbol[] = [];

      // A module defined by an 'export=' consists of one export that needs to be resolved
      moduleSymbol = resolveExternalModuleSymbol(moduleSymbol);

      return visit(moduleSymbol) || emptySymbols;

      // The ES6 spec permits export * declarations in a module to circularly reference the module itself. For example,
      // module 'a' can 'export * from "b"' and 'b' can 'export * from "a"' without error.
      function visit(s: Symbol | undefined): SymbolTable | undefined {
        if (!(symbol && symbol.exports && pushIfUnique(visitedSymbols, symbol))) {
          return;
        }
        const symbols = cloneMap(symbol.exports);
        // All export * declarations are collected in an __export symbol by the binder
        const exportStars = symbol.exports.get(InternalSymbolName.ExportStar);
        if (exportStars) {
          const nestedSymbols = new SymbolTable();
          const lookupTable = new QMap<ExportCollisionTracker>() as ExportCollisionTrackerTable;
          for (const node of exportStars.declarations) {
            const resolvedModule = resolveExternalModuleName(node, (node as ExportDeclaration).moduleSpecifier!);
            const exportedSymbols = visit(resolvedModule);
            extendExportSymbols(nestedSymbols, exportedSymbols, lookupTable, node as ExportDeclaration);
          }
          lookupTable.forEach(({ exportsWithDuplicate }, id) => {
            // It's not an error if the file with multiple `export *`s with duplicate names exports a member with that name itself
            if (id === 'export=' || !(exportsWithDuplicate && exportsWithDuplicate.length) || symbols.has(id)) {
              return;
            }
            for (const node of exportsWithDuplicate) {
              diagnostics.add(
                createDiagnosticForNode(
                  node,
                  Diagnostics.Module_0_has_already_exported_a_member_named_1_Consider_explicitly_re_exporting_to_resolve_the_ambiguity,
                  lookupTable.get(id)!.specifierText,
                  syntax.get.unescUnderscores(id)
                )
              );
            }
          });
          extendExportSymbols(symbols, nestedSymbols);
        }
        return symbols;
      }
    }
    getMergedSymbol(s: Symbol): Symbol;
    getMergedSymbol(s: Symbol | undefined): Symbol | undefined;
    getMergedSymbol(s: Symbol | undefined): Symbol | undefined {
      let merged: Symbol;
      return symbol && symbol.mergeId && (merged = mergedSymbols[symbol.mergeId]) ? merged : symbol;
    }
    getParentOfSymbol(s: Symbol): Symbol | undefined {
      return getMergedSymbol(symbol.parent && getLateBoundSymbol(symbol.parent));
    }
    getAlternativeContainingModules(s: Symbol, enclosingDeclaration: Node): Symbol[] {
      const containingFile = Node.get.sourceFileOf(enclosingDeclaration);
      const id = '' + getNodeId(containingFile);
      const links = getSymbolLinks(symbol);
      let results: Symbol[] | undefined;
      if (links.extendedContainersByFile && (results = links.extendedContainersByFile.get(id))) {
        return results;
      }
      if (containingFile && containingFile.imports) {
        // Try to make an import using an import already in the enclosing file, if possible
        for (const importRef of containingFile.imports) {
          if (isSynthesized(importRef)) continue; // Synthetic names can't be resolved by `resolveExternalModuleName` - they'll cause a debug assert if they error
          const resolvedModule = resolveExternalModuleName(enclosingDeclaration, importRef, /*ignoreErrors*/ true);
          if (!resolvedModule) continue;
          const ref = getAliasForSymbolInContainer(resolvedModule, symbol);
          if (!ref) continue;
          results = append(results, resolvedModule);
        }
        if (length(results)) {
          (links.extendedContainersByFile || (links.extendedContainersByFile = new QMap())).set(id, results!);
          return results!;
        }
      }
      if (links.extendedContainers) {
        return links.extendedContainers;
      }
      // No results from files already being imported by this file - expand search (expensive, but not location-specific, so cached)
      const otherFiles = host.getSourceFiles();
      for (const file of otherFiles) {
        if (!qp_isExternalModule(file)) continue;
        const sym = getSymbolOfNode(file);
        const ref = getAliasForSymbolInContainer(sym, symbol);
        if (!ref) continue;
        results = append(results, sym);
      }
      return (links.extendedContainers = results || empty);
    }
    getContainersOfSymbol(s: Symbol, enclosingDeclaration: Node | undefined): Symbol[] | undefined {
      const container = getParentOfSymbol(symbol);
      // Type parameters end up in the `members` lists but are not externally visible
      if (container && !(symbol.flags & SymbolFlags.TypeParameter)) {
        const additionalContainers = mapDefined(container.declarations, fileSymbolIfFileSymbolExportEqualsContainer);
        const reexportContainers = enclosingDeclaration && getAlternativeContainingModules(symbol, enclosingDeclaration);
        if (enclosingDeclaration && getAccessibleSymbolChain(container, enclosingDeclaration, SymbolFlags.Namespace, /*externalOnly*/ false)) {
          return concatenate(concatenate([container], additionalContainers), reexportContainers); // This order expresses a preference for the real container if it is in scope
        }
        const res = append(additionalContainers, container);
        return concatenate(res, reexportContainers);
      }
      const candidates = mapDefined(symbol.declarations, (d) => {
        if (!Node.is.ambientModule(d) && d.parent && hasNonGlobalAugmentationExternalModuleSymbol(d.parent)) {
          return getSymbolOfNode(d.parent);
        }
        if (
          Node.is.kind(ClassExpression, d) &&
          Node.is.kind(BinaryExpression, d.parent) &&
          d.parent.operatorToken.kind === Syntax.EqualsToken &&
          isAccessExpression(d.parent.left) &&
          isEntityNameExpression(d.parent.left.expression)
        ) {
          if (Node.is.moduleExportsAccessExpression(d.parent.left) || Node.is.exportsIdentifier(d.parent.left.expression)) {
            return getSymbolOfNode(Node.get.sourceFileOf(d));
          }
          checkExpressionCached(d.parent.left.expression);
          return getNodeLinks(d.parent.left.expression).resolvedSymbol;
        }
      });
      if (!length(candidates)) {
        return;
      }
      return mapDefined(candidates, (candidate) => (getAliasForSymbolInContainer(candidate, symbol) ? candidate : undefined));

      function fileSymbolIfFileSymbolExportEqualsContainer(d: Declaration) {
        return container && getFileSymbolIfFileSymbolExportEqualsContainer(d, container);
      }
    }
    getExportSymbolOfValueSymbolIfExported(s: Symbol): Symbol;
    getExportSymbolOfValueSymbolIfExported(s: Symbol | undefined): Symbol | undefined;
    getExportSymbolOfValueSymbolIfExported(s: Symbol | undefined): Symbol | undefined {
      return getMergedSymbol(symbol && (symbol.flags & SymbolFlags.ExportValue) !== 0 ? symbol.exportSymbol : symbol);
    }
    symbolIsValue(s: Symbol): boolean {
      return !!(symbol.flags & SymbolFlags.Value || (symbol.flags & SymbolFlags.Alias && resolveAlias(symbol).flags & SymbolFlags.Value && !getTypeOnlyAliasDeclaration(symbol)));
    }
    isPropertyOrMethodDeclarationSymbol(s: Symbol) {
      if (symbol.declarations && symbol.declarations.length) {
        for (const declaration of symbol.declarations) {
          switch (declaration.kind) {
            case Syntax.PropertyDeclaration:
            case Syntax.MethodDeclaration:
            case Syntax.GetAccessor:
            case Syntax.SetAccessor:
              continue;
            default:
              return false;
          }
        }
        return true;
      }
      return false;
    }
    needsQualification(s: Symbol, enclosingDeclaration: Node | undefined, meaning: SymbolFlags) {
      let qualify = false;
      forEachSymbolTableInScope(enclosingDeclaration, (symbolTable) => {
        // If symbol of this name is not available in the symbol table we are ok
        let symbolFromSymbolTable = getMergedSymbol(symbolTable.get(symbol.escName));
        if (!symbolFromSymbolTable) {
          // Continue to the next symbol table
          return false;
        }
        // If the symbol with this name is present it should refer to the symbol
        if (symbolFromSymbolTable === symbol) {
          // No need to qualify
          return true;
        }

        // Qualify if the symbol from symbol table has same meaning as expected
        symbolFromSymbolTable =
          symbolFromSymbolTable.flags & SymbolFlags.Alias && !getDeclarationOfKind(symbolFromSymbolTable, Syntax.ExportSpecifier) ? resolveAlias(symbolFromSymbolTable) : symbolFromSymbolTable;
        if (symbolFromSymbolTable.flags & meaning) {
          qualify = true;
          return true;
        }

        // Continue to the next symbol table
        return false;
      });

      return qualify;
    }
    isTypeSymbolAccessible(typeSymbol: Symbol, enclosingDeclaration: Node | undefined): boolean {
      const access = isSymbolAccessible(typeSymbol, enclosingDeclaration, SymbolFlags.Type, /*shouldComputeAliasesToMakeVisible*/ false);
      return access.accessibility === SymbolAccessibility.Accessible;
    }
    isValueSymbolAccessible(typeSymbol: Symbol, enclosingDeclaration: Node | undefined): boolean {
      const access = isSymbolAccessible(typeSymbol, enclosingDeclaration, SymbolFlags.Value, /*shouldComputeAliasesToMakeVisible*/ false);
      return access.accessibility === SymbolAccessibility.Accessible;
    }
    symbolValueDeclarationIsContextSensitive(s: Symbol): boolean {
      return symbol && symbol.valueDeclaration && Node.is.expression(symbol.valueDeclaration) && !isContextSensitive(symbol.valueDeclaration);
    }
    serializeSymbol(s: Symbol, isPrivate: boolean, propertyAsAlias: boolean) {
      // cache visited list based on merged symbol, since we want to use the unmerged top-level symbol, but
      // still skip reserializing it if we encounter the merged product later on
      const visitedSym = getMergedSymbol(symbol);
      if (visitedSymbols.has('' + getSymbolId(visitedSym))) {
        return; // Already printed
      }
      visitedSymbols.set('' + getSymbolId(visitedSym), true);
      // Only actually serialize symbols within the correct enclosing declaration, otherwise do nothing with the out-of-context symbol
      const skipMembershipCheck = !isPrivate; // We only call this on exported symbols when we know they're in the correct scope
      if (skipMembershipCheck || (!!length(symbol.declarations) && some(symbol.declarations, (d) => !!Node.findAncestor(d, (n) => n === enclosingDeclaration)))) {
        const oldContext = context;
        context = cloneNodeBuilderContext(context);
        const result = serializeSymbolWorker(symbol, isPrivate, propertyAsAlias);
        context = oldContext;
        return result;
      }
    }
    serializeSymbolWorker(s: Symbol, isPrivate: boolean, propertyAsAlias: boolean) {
      const symbolName = syntax.get.unescUnderscores(symbol.escName);
      const isDefault = symbol.escName === InternalSymbolName.Default;
      if (!(context.flags & NodeBuilderFlags.AllowAnonymousIdentifier) && syntax.is.stringANonContextualKeyword(symbolName) && !isDefault) {
        // Oh no. We cannot use this symbol's name as it's name... It's likely some jsdoc had an invalid name like `export` or `default` :(
        context.encounteredError = true;
        // TODO: Issue error via symbol tracker?
        return; // If we need to emit a private with a keyword name, we're done for, since something else will try to refer to it by that name
      }
      const needsPostExportDefault =
        isDefault &&
        !!(symbol.flags & SymbolFlags.ExportDoesNotSupportDefaultModifier || (symbol.flags & SymbolFlags.Function && length(getPropertiesOfType(getTypeOfSymbol(symbol))))) &&
        !(symbol.flags & SymbolFlags.Alias); // An alias symbol should preclude needing to make an alias ourselves
      if (needsPostExportDefault) {
        isPrivate = true;
      }
      const modifierFlags = (!isPrivate ? ModifierFlags.Export : 0) | (isDefault && !needsPostExportDefault ? ModifierFlags.Default : 0);
      const isConstMergedWithNS =
        symbol.flags & SymbolFlags.Module &&
        symbol.flags & (SymbolFlags.BlockScopedVariable | SymbolFlags.FunctionScopedVariable | SymbolFlags.Property) &&
        symbol.escName !== InternalSymbolName.ExportEquals;
      const isConstMergedWithNSPrintableAsSignatureMerge = isConstMergedWithNS && isTypeRepresentableAsFunctionNamespaceMerge(getTypeOfSymbol(symbol), symbol);
      if (symbol.flags & (SymbolFlags.Function | SymbolFlags.Method) || isConstMergedWithNSPrintableAsSignatureMerge) {
        serializeAsFunctionNamespaceMerge(getTypeOfSymbol(symbol), symbol, getInternalSymbolName(symbol, symbolName), modifierFlags);
      }
      if (symbol.flags & SymbolFlags.TypeAlias) {
        serializeTypeAlias(symbol, symbolName, modifierFlags);
      }
      // Need to skip over export= symbols below - json source files get a single `Property` flagged
      // symbol of name `export=` which needs to be handled like an alias. It's not great, but it is what it is.
      if (
        symbol.flags & (SymbolFlags.BlockScopedVariable | SymbolFlags.FunctionScopedVariable | SymbolFlags.Property) &&
        symbol.escName !== InternalSymbolName.ExportEquals &&
        !(symbol.flags & SymbolFlags.Prototype) &&
        !(symbol.flags & SymbolFlags.Class) &&
        !isConstMergedWithNSPrintableAsSignatureMerge
      ) {
        serializeVariableOrProperty(symbol, symbolName, isPrivate, needsPostExportDefault, propertyAsAlias, modifierFlags);
      }
      if (symbol.flags & SymbolFlags.Enum) {
        serializeEnum(symbol, symbolName, modifierFlags);
      }
      if (symbol.flags & SymbolFlags.Class) {
        if (symbol.flags & SymbolFlags.Property && Node.is.kind(BinaryExpression, symbol.valueDeclaration.parent) && Node.is.kind(ClassExpression, symbol.valueDeclaration.parent.right)) {
          // Looks like a `module.exports.Sub = class {}` - if we serialize `symbol` as a class, the result will have no members,
          // since the classiness is actually from the target of the effective alias the symbol is. yes. A BlockScopedVariable|Class|Property
          // _really_ acts like an Alias, and none of a BlockScopedVariable, Class, or Property. This is the travesty of JS binding today.
          serializeAsAlias(symbol, getInternalSymbolName(symbol, symbolName), modifierFlags);
        } else {
          serializeAsClass(symbol, getInternalSymbolName(symbol, symbolName), modifierFlags);
        }
      }
      if ((symbol.flags & (SymbolFlags.ValueModule | SymbolFlags.NamespaceModule) && (!isConstMergedWithNS || isTypeOnlyNamespace(symbol))) || isConstMergedWithNSPrintableAsSignatureMerge) {
        serializeModule(symbol, symbolName, modifierFlags);
      }
      if (symbol.flags & SymbolFlags.Interface) {
        serializeInterface(symbol, symbolName, modifierFlags);
      }
      if (symbol.flags & SymbolFlags.Alias) {
        serializeAsAlias(symbol, getInternalSymbolName(symbol, symbolName), modifierFlags);
      }
      if (symbol.flags & SymbolFlags.Property && symbol.escName === InternalSymbolName.ExportEquals) {
        serializeMaybeAliasAssignment(symbol);
      }
      if (symbol.flags & SymbolFlags.ExportStar) {
        // synthesize export * from "moduleReference"
        // Straightforward - only one thing to do - make an export declaration
        for (const node of symbol.declarations) {
          const resolvedModule = resolveExternalModuleName(node, (node as ExportDeclaration).moduleSpecifier!);
          if (!resolvedModule) continue;
          addResult(createExportDeclaration(undefined, /*modifiers*/ undefined, /*exportClause*/ undefined, createLiteral(getSpecifierForModuleSymbol(resolvedModule, context))), ModifierFlags.None);
        }
      }
      if (needsPostExportDefault) {
        addResult(createExportAssignment(undefined, /*modifiers*/ undefined, /*isExportAssignment*/ false, new Identifier(getInternalSymbolName(symbol, symbolName))), ModifierFlags.None);
      }
    }
    includePrivateSymbol(s: Symbol) {
      if (some(symbol.declarations, isParameterDeclaration)) return;
      Debug.assertIsDefined(deferredPrivates);
      getUnusedName(syntax.get.unescUnderscores(symbol.escName), symbol); // Call to cache unique name for symbol
      deferredPrivates.set('' + getSymbolId(symbol), symbol);
    }
    serializeTypeAlias(s: Symbol, symbolName: string, modifierFlags: ModifierFlags) {
      const aliasType = getDeclaredTypeOfTypeAlias(symbol);
      const typeParams = getSymbolLinks(symbol).typeParameters;
      const typeParamDecls = map(typeParams, (p) => typeParameterToDeclaration(p, context));
      const jsdocAliasDecl = find(symbol.declarations, isJSDocTypeAlias);
      const commentText = jsdocAliasDecl ? jsdocAliasDecl.comment || jsdocAliasDecl.parent.comment : undefined;
      const oldFlags = context.flags;
      context.flags |= NodeBuilderFlags.InTypeAlias;
      addResult(
        setSyntheticLeadingComments(
          createTypeAliasDeclaration(undefined, /*modifiers*/ undefined, getInternalSymbolName(symbol, symbolName), typeParamDecls, typeToTypeNodeHelper(aliasType, context)),
          !commentText
            ? []
            : [
                {
                  kind: Syntax.MultiLineCommentTrivia,
                  text: '*\n * ' + commentText.replace(/\n/g, '\n * ') + '\n ',
                  pos: -1,
                  end: -1,
                  hasTrailingNewLine: true,
                },
              ]
        ),
        modifierFlags
      );
      context.flags = oldFlags;
    }
    serializeInterface(s: Symbol, symbolName: string, modifierFlags: ModifierFlags) {
      const interfaceType = getDeclaredTypeOfClassOrInterface(symbol);
      const localParams = getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(symbol);
      const typeParamDecls = map(localParams, (p) => typeParameterToDeclaration(p, context));
      const baseTypes = getBaseTypes(interfaceType);
      const baseType = length(baseTypes) ? getIntersectionType(baseTypes) : undefined;
      const members = flatMap<Symbol, TypeElement>(getPropertiesOfType(interfaceType), (p) => serializePropertySymbolForInterface(p, baseType));
      const callSignatures = serializeSignatures(SignatureKind.Call, interfaceType, baseType, Syntax.CallSignature) as CallSignatureDeclaration[];
      const constructSignatures = serializeSignatures(SignatureKind.Construct, interfaceType, baseType, Syntax.ConstructSignature) as ConstructSignatureDeclaration[];
      const indexSignatures = serializeIndexSignatures(interfaceType, baseType);

      const heritageClauses = !length(baseTypes)
        ? undefined
        : [
            createHeritageClause(
              Syntax.ExtendsKeyword,
              mapDefined(baseTypes, (b) => trySerializeAsTypeReference(b))
            ),
          ];
      addResult(
        createInterfaceDeclaration(undefined, /*modifiers*/ undefined, getInternalSymbolName(symbol, symbolName), typeParamDecls, heritageClauses, [
          ...indexSignatures,
          ...constructSignatures,
          ...callSignatures,
          ...members,
        ]),
        modifierFlags
      );
    }
    getNamespaceMembersForSerialization(s: Symbol) {
      return !symbol.exports ? [] : filter(arrayFrom(symbol.exports.values()), isNamespaceMember);
    }
    isTypeOnlyNamespace(s: Symbol) {
      return every(getNamespaceMembersForSerialization(symbol), (m) => !(resolveSymbol(m).flags & SymbolFlags.Value));
    }
    serializeModule(s: Symbol, symbolName: string, modifierFlags: ModifierFlags) {
      const members = getNamespaceMembersForSerialization(symbol);
      // Split NS members up by declaration - members whose parent symbol is the ns symbol vs those whose is not (but were added in later via merging)
      const locationMap = arrayToMultiMap(members, (m) => (m.parent && m.parent === symbol ? 'real' : 'merged'));
      const realMembers = locationMap.get('real') || empty;
      const mergedMembers = locationMap.get('merged') || empty;
      // TODO: `suppressNewPrivateContext` is questionable -we need to simply be emitting privates in whatever scope they were declared in, rather
      // than whatever scope we traverse to them in. That's a bit of a complex rewrite, since we're not _actually_ tracking privates at all in advance,
      // so we don't even have placeholders to fill in.
      if (length(realMembers)) {
        const localName = getInternalSymbolName(symbol, symbolName);
        serializeAsNamespaceDeclaration(realMembers, localName, modifierFlags, !!(symbol.flags & (SymbolFlags.Function | SymbolFlags.Assignment)));
      }
      if (length(mergedMembers)) {
        const containingFile = Node.get.sourceFileOf(context.enclosingDeclaration);
        const localName = getInternalSymbolName(symbol, symbolName);
        const nsBody = createModuleBlock([
          createExportDeclaration(
            undefined,
            /*modifiers*/ undefined,
            createNamedExports(
              mapDefined(
                filter(mergedMembers, (n) => n.escName !== InternalSymbolName.ExportEquals),
                (s) => {
                  const name = syntax.get.unescUnderscores(s.escName);
                  const localName = getInternalSymbolName(s, name);
                  const aliasDecl = s.declarations && getDeclarationOfAliasSymbol(s);
                  if (containingFile && (aliasDecl ? containingFile !== Node.get.sourceFileOf(aliasDecl) : !some(s.declarations, (d) => Node.get.sourceFileOf(d) === containingFile))) {
                    context.tracker?.reportNonlocalAugmentation?.(containingFile, symbol, s);
                    return;
                  }
                  const target = aliasDecl && getTargetOfAliasDeclaration(aliasDecl, /*dontRecursivelyResolve*/ true);
                  includePrivateSymbol(target || s);
                  const targetName = target ? getInternalSymbolName(target, syntax.get.unescUnderscores(target.escName)) : localName;
                  return createExportSpecifier(name === targetName ? undefined : targetName, name);
                }
              )
            )
          ),
        ]);
        addResult(createModuleDeclaration(undefined, /*modifiers*/ undefined, new Identifier(localName), nsBody, NodeFlags.Namespace), ModifierFlags.None);
      }
    }
    serializeEnum(s: Symbol, symbolName: string, modifierFlags: ModifierFlags) {
      addResult(
        createEnumDeclaration(
          undefined,
          createModifiersFromModifierFlags(isConstEnumSymbol(symbol) ? ModifierFlags.Const : 0),
          getInternalSymbolName(symbol, symbolName),
          map(
            filter(getPropertiesOfType(getTypeOfSymbol(symbol)), (p) => !!(p.flags & SymbolFlags.EnumMember)),
            (p) => {
              // TODO: Handle computed names
              // I hate that to get the initialized value we need to walk back to the declarations here; but there's no
              // other way to get the possible const value of an enum member that I'm aware of, as the value is cached
              // _on the declaration_, not on the declaration's symbol...
              const initializedValue = p.declarations && p.declarations[0] && Node.is.kind(EnumMember, p.declarations[0]) && getConstantValue(p.declarations[0] as EnumMember);
              return createEnumMember(syntax.get.unescUnderscores(p.escName), initializedValue === undefined ? undefined : createLiteral(initializedValue));
            }
          )
        ),
        modifierFlags
      );
    }
    serializeVariableOrProperty(s: Symbol, symbolName: string, isPrivate: boolean, needsPostExportDefault: boolean, propertyAsAlias: boolean | undefined, modifierFlags: ModifierFlags) {
      if (propertyAsAlias) {
        serializeMaybeAliasAssignment(symbol);
      } else {
        const type = getTypeOfSymbol(symbol);
        const localName = getInternalSymbolName(symbol, symbolName);
        if (!(symbol.flags & SymbolFlags.Function) && isTypeRepresentableAsFunctionNamespaceMerge(type, symbol)) {
          // If the type looks like a function declaration + ns could represent it, and it's type is sourced locally, rewrite it into a function declaration + ns
          serializeAsFunctionNamespaceMerge(type, symbol, localName, modifierFlags);
        } else {
          // A Class + Property merge is made for a `module.exports.Member = class {}`, and it doesn't serialize well as either a class _or_ a property symbol - in fact, _it behaves like an alias!_
          // `var` is `FunctionScopedVariable`, `const` and `let` are `BlockScopedVariable`, and `module.exports.thing =` is `Property`
          const flags = !(symbol.flags & SymbolFlags.BlockScopedVariable) ? undefined : isConstVariable(symbol) ? NodeFlags.Const : NodeFlags.Let;
          const name = needsPostExportDefault || !(symbol.flags & SymbolFlags.Property) ? localName : getUnusedName(localName, symbol);
          let textRange: Node | undefined = symbol.declarations && find(symbol.declarations, (d) => Node.is.kind(VariableDeclaration, d));
          if (textRange && Node.is.kind(VariableDeclarationList, textRange.parent) && textRange.parent.declarations.length === 1) {
            textRange = textRange.parent.parent;
          }
          const statement = setRange(
            createVariableStatement(
              /*modifiers*/ undefined,
              createVariableDeclarationList([createVariableDeclaration(name, serializeTypeForDeclaration(context, type, symbol, enclosingDeclaration, includePrivateSymbol, bundled))], flags)
            ),
            textRange
          );
          addResult(statement, name !== localName ? modifierFlags & ~ModifierFlags.Export : modifierFlags);
          if (name !== localName && !isPrivate) {
            // We rename the variable declaration we generate for Property symbols since they may have a name which
            // conflicts with a local declaration. For example, given input:
            // ```
            // function g() {}
            // module.exports.g = g
            // ```
            // In such a situation, we have a local variable named `g`, and a separate exported variable named `g`.
            // Naively, we would emit
            // ```
            // function g() {}
            // export const g: typeof g;
            // ```
            // That's obviously incorrect - the `g` in the type annotation needs to refer to the local `g`, but
            // the export declaration shadows it.
            // To work around that, we instead write
            // ```
            // function g() {}
            // const g_1: typeof g;
            // export { g_1 as g };
            // ```
            // To create an export named `g` that does _not_ shadow the local `g`
            addResult(createExportDeclaration(undefined, /*modifiers*/ undefined, createNamedExports([createExportSpecifier(name, localName)])), ModifierFlags.None);
          }
        }
      }
    }
    serializeAsAlias(s: Symbol, localName: string, modifierFlags: ModifierFlags) {
      // synthesize an alias, eg `export { symbolName as Name }`
      // need to mark the alias `symbol` points at
      // as something we need to serialize as a private declaration as well
      const node = getDeclarationOfAliasSymbol(symbol);
      if (!node) return fail();
      const target = getMergedSymbol(getTargetOfAliasDeclaration(node, /*dontRecursivelyResolve*/ true));
      if (!target) {
        return;
      }
      let verbatimTargetName = syntax.get.unescUnderscores(target.escName);
      if (verbatimTargetName === InternalSymbolName.ExportEquals && (compilerOptions.esModuleInterop || compilerOptions.allowSyntheticDefaultImports)) {
        // target refers to an `export=` symbol that was hoisted into a synthetic default - rename here to match
        verbatimTargetName = InternalSymbolName.Default;
      }
      const targetName = getInternalSymbolName(target, verbatimTargetName);
      includePrivateSymbol(target); // the target may be within the same scope - attempt to serialize it first
      switch (node.kind) {
        case Syntax.ImportEqualsDeclaration:
          // Could be a local `import localName = ns.member` or
          // an external `import localName = require("whatever")`
          const isLocalImport = !(target.flags & SymbolFlags.ValueModule);
          addResult(
            createImportEqualsDeclaration(
              undefined,
              /*modifiers*/ undefined,
              new Identifier(localName),
              isLocalImport ? symbolToName(target, context, SymbolFlags.All, /*expectsIdentifier*/ false) : createExternalModuleReference(createLiteral(getSpecifierForModuleSymbol(symbol, context)))
            ),
            isLocalImport ? modifierFlags : ModifierFlags.None
          );
          break;
        case Syntax.NamespaceExportDeclaration:
          // export as namespace foo
          // TODO: Not part of a file's local or export symbol tables
          // Is bound into file.symbol.globalExports instead, which we don't currently traverse
          addResult(createNamespaceExportDeclaration(idText((node as NamespaceExportDeclaration).name)), ModifierFlags.None);
          break;
        case Syntax.ImportClause:
          addResult(
            createImportDeclaration(
              undefined,
              /*modifiers*/ undefined,
              createImportClause(new Identifier(localName), /*namedBindings*/ undefined),
              // We use `target.parent || target` below as `target.parent` is unset when the target is a module which has been export assigned
              // And then made into a default by the `esModuleInterop` or `allowSyntheticDefaultImports` flag
              // In such cases, the `target` refers to the module itself already
              createLiteral(getSpecifierForModuleSymbol(target.parent || target, context))
            ),
            ModifierFlags.None
          );
          break;
        case Syntax.NamespaceImport:
          addResult(
            createImportDeclaration(
              undefined,
              /*modifiers*/ undefined,
              createImportClause(/*importClause*/ undefined, createNamespaceImport(new Identifier(localName))),
              createLiteral(getSpecifierForModuleSymbol(target, context))
            ),
            ModifierFlags.None
          );
          break;
        case Syntax.NamespaceExport:
          addResult(
            createExportDeclaration(undefined, /*modifiers*/ undefined, createNamespaceExport(new Identifier(localName)), createLiteral(getSpecifierForModuleSymbol(target, context))),
            ModifierFlags.None
          );
          break;
        case Syntax.ImportSpecifier:
          addResult(
            createImportDeclaration(
              undefined,
              /*modifiers*/ undefined,
              createImportClause(
                /*importClause*/ undefined,
                createNamedImports([createImportSpecifier(localName !== verbatimTargetName ? new Identifier(verbatimTargetName) : undefined, new Identifier(localName))])
              ),
              createLiteral(getSpecifierForModuleSymbol(target.parent || target, context))
            ),
            ModifierFlags.None
          );
          break;
        case Syntax.ExportSpecifier:
          // does not use localName because the symbol name in this case refers to the name in the exports table,
          // which we must exactly preserve
          const specifier = (node.parent.parent as ExportDeclaration).moduleSpecifier;
          // targetName is only used when the target is local, as otherwise the target is an alias that points at
          // another file
          serializeExportSpecifier(
            syntax.get.unescUnderscores(symbol.escName),
            specifier ? verbatimTargetName : targetName,
            specifier && StringLiteral.like(specifier) ? createLiteral(specifier.text) : undefined
          );
          break;
        case Syntax.ExportAssignment:
          serializeMaybeAliasAssignment(symbol);
          break;
        case Syntax.BinaryExpression:
        case Syntax.PropertyAccessExpression:
          // Could be best encoded as though an export specifier or as though an export assignment
          // If name is default or export=, do an export assignment
          // Otherwise do an export specifier
          if (symbol.escName === InternalSymbolName.Default || symbol.escName === InternalSymbolName.ExportEquals) {
            serializeMaybeAliasAssignment(symbol);
          } else {
            serializeExportSpecifier(localName, targetName);
          }
          break;
        default:
          return Debug.failBadSyntax(node, 'Unhandled alias declaration kind in symbol serializer!');
      }
    }
    serializeMaybeAliasAssignment(s: Symbol) {
      if (symbol.flags & SymbolFlags.Prototype) {
        return;
      }
      const name = syntax.get.unescUnderscores(symbol.escName);
      const isExportEquals = name === InternalSymbolName.ExportEquals;
      const isDefault = name === InternalSymbolName.Default;
      const isExportAssignment = isExportEquals || isDefault;
      // synthesize export = ref
      // ref should refer to either be a locally scoped symbol which we need to emit, or
      // a reference to another namespace/module which we may need to emit an `import` statement for
      const aliasDecl = symbol.declarations && getDeclarationOfAliasSymbol(symbol);
      // serialize what the alias points to, preserve the declaration's initializer
      const target = aliasDecl && getTargetOfAliasDeclaration(aliasDecl, /*dontRecursivelyResolve*/ true);
      // If the target resolves and resolves to a thing defined in this file, emit as an alias, otherwise emit as a const
      if (target && length(target.declarations) && some(target.declarations, (d) => Node.get.sourceFileOf(d) === Node.get.sourceFileOf(enclosingDeclaration))) {
        // In case `target` refers to a namespace member, look at the declaration and serialize the leftmost symbol in it
        // eg, `namespace A { export class B {} }; exports = A.B;`
        // Technically, this is all that's required in the case where the assignment is an entity name expression
        const expr = isExportAssignment
          ? getExportAssignmentExpression(aliasDecl as ExportAssignment | BinaryExpression)
          : getPropertyAssignmentAliasLikeExpression(aliasDecl as ShorthandPropertyAssignment | PropertyAssignment | PropertyAccessExpression);
        const first = isEntityNameExpression(expr) ? getFirstNonModuleExportsIdentifier(expr) : undefined;
        const referenced = first && resolveEntityName(first, SymbolFlags.All, /*ignoreErrors*/ true, /*dontResolveAlias*/ true, enclosingDeclaration);
        if (referenced || target) {
          includePrivateSymbol(referenced || target);
        }

        // We disable the context's symbol tracker for the duration of this name serialization
        // as, by virtue of being here, the name is required to print something, and we don't want to
        // issue a visibility error on it. Only anonymous classes that an alias points at _would_ issue
        // a visibility error here (as they're not visible within any scope), but we want to hoist them
        // into the containing scope anyway, so we want to skip the visibility checks.
        const oldTrack = context.tracker.trackSymbol;
        context.tracker.trackSymbol = noop;
        if (isExportAssignment) {
          results.push(createExportAssignment(undefined, /*modifiers*/ undefined, isExportEquals, symbolToExpression(target, context, SymbolFlags.All)));
        } else {
          if (first === expr) {
            // serialize as `export {target as name}`
            serializeExportSpecifier(name, idText(first));
          } else if (Node.is.kind(ClassExpression, expr)) {
            serializeExportSpecifier(name, getInternalSymbolName(target, symbolName(target)));
          } else {
            // serialize as `import _Ref = t.arg.et; export { _Ref as name }`
            const varName = getUnusedName(name, symbol);
            addResult(
              createImportEqualsDeclaration(undefined, /*modifiers*/ undefined, new Identifier(varName), symbolToName(target, context, SymbolFlags.All, /*expectsIdentifier*/ false)),
              ModifierFlags.None
            );
            serializeExportSpecifier(name, varName);
          }
        }
        context.tracker.trackSymbol = oldTrack;
      } else {
        // serialize as an anonymous property declaration
        const varName = getUnusedName(name, symbol);
        // We have to use `getWidenedType` here since the object within a json file is unwidened within the file
        // (Unwidened types can only exist in expression contexts and should never be serialized)
        const typeToSerialize = getWidenedType(getTypeOfSymbol(getMergedSymbol(symbol)));
        if (isTypeRepresentableAsFunctionNamespaceMerge(typeToSerialize, symbol)) {
          // If there are no index signatures and `typeToSerialize` is an object type, emit as a namespace instead of a const
          serializeAsFunctionNamespaceMerge(typeToSerialize, symbol, varName, isExportAssignment ? ModifierFlags.None : ModifierFlags.Export);
        } else {
          const statement = createVariableStatement(
            /*modifiers*/ undefined,
            createVariableDeclarationList(
              [createVariableDeclaration(varName, serializeTypeForDeclaration(context, typeToSerialize, symbol, enclosingDeclaration, includePrivateSymbol, bundled))],
              NodeFlags.Const
            )
          );
          addResult(statement, name === varName ? ModifierFlags.Export : ModifierFlags.None);
        }
        if (isExportAssignment) {
          results.push(createExportAssignment(undefined, /*modifiers*/ undefined, isExportEquals, new Identifier(varName)));
        } else if (name !== varName) {
          serializeExportSpecifier(name, varName);
        }
      }
    }
    isConstructorDeclaredProperty(s: Symbol) {
      if (symbol.valueDeclaration && Node.is.kind(BinaryExpression, symbol.valueDeclaration)) {
        const links = getSymbolLinks(symbol);
        if (links.isConstructorDeclaredProperty === undefined) {
          links.isConstructorDeclaredProperty =
            !!getDeclaringConstructor(symbol) &&
            every(
              symbol.declarations,
              (declaration) =>
                Node.is.kind(BinaryExpression, declaration) &&
                getAssignmentDeclarationKind(declaration) === AssignmentDeclarationKind.ThisProperty &&
                (declaration.left.kind !== Syntax.ElementAccessExpression || StringLiteral.orNumericLiteralLike((<ElementAccessExpression>declaration.left).argumentExpression)) &&
                !getAnnotatedTypeForAssignmentDeclaration(/*declaredType*/ undefined, declaration, symbol, declaration)
            );
        }
        return links.isConstructorDeclaredProperty;
      }
      return false;
    }
    isAutoTypedProperty(s: Symbol) {
      const declaration = symbol.valueDeclaration;
      return declaration && Node.is.kind(PropertyDeclaration, declaration) && !getEffectiveTypeAnnotationNode(declaration) && !declaration.initializer && (noImplicitAny || isInJSFile(declaration));
    }
    getDeclaringConstructor(s: Symbol) {
      for (const declaration of symbol.declarations) {
        const container = Node.get.thisContainer(declaration, /*includeArrowFunctions*/ false);
        if (container && (container.kind === Syntax.Constructor || isJSConstructor(container))) {
          return <ConstructorDeclaration>container;
        }
      }
    }
    getTypeOfVariableOrParameterOrProperty(s: Symbol): Type {
      const links = getSymbolLinks(symbol);
      if (!links.type) {
        const type = getTypeOfVariableOrParameterOrPropertyWorker(symbol);
        // For a contextually typed parameter it is possible that a type has already
        // been assigned (in assignTypeToParameterAndFixTypeParameters), and we want
        // to preserve this type.
        if (!links.type) {
          links.type = type;
        }
      }
      return links.type;
    }
    getTypeOfVariableOrParameterOrPropertyWorker(s: Symbol) {
      // Handle prototype property
      if (symbol.flags & SymbolFlags.Prototype) {
        return getTypeOfPrototypeProperty(symbol);
      }
      // CommonsJS require and module both have type any.
      if (symbol === requireSymbol) {
        return anyType;
      }
      if (symbol.flags & SymbolFlags.ModuleExports) {
        const fileSymbol = getSymbolOfNode(Node.get.sourceFileOf(symbol.valueDeclaration));
        const members = new SymbolTable();
        members.set('exports' as __String, fileSymbol);
        return createAnonymousType(symbol, members, empty, empty, undefined, undefined);
      }
      // Handle catch clause variables
      const declaration = symbol.valueDeclaration;
      if (isCatchClauseVariableDeclarationOrBindingElement(declaration)) {
        return anyType;
      }
      // Handle export default expressions
      if (Node.is.kind(SourceFile, declaration) && isJsonSourceFile(declaration)) {
        if (!declaration.statements.length) {
          return emptyObjectType;
        }
        return getWidenedType(getWidenedLiteralType(checkExpression(declaration.statements[0].expression)));
      }

      // Handle variable, parameter or property
      if (!pushTypeResolution(symbol, TypeSystemPropertyName.Type)) {
        // Symbol is property of some kind that is merged with something - should use `getTypeOfFuncClassEnumModule` and not `getTypeOfVariableOrParameterOrProperty`
        if (symbol.flags & SymbolFlags.ValueModule && !(symbol.flags & SymbolFlags.Assignment)) {
          return getTypeOfFuncClassEnumModule(symbol);
        }
        return reportCircularityError(symbol);
      }
      let type: Type | undefined;
      if (declaration.kind === Syntax.ExportAssignment) {
        type = widenTypeForVariableLikeDeclaration(checkExpressionCached((<ExportAssignment>declaration).expression), declaration);
      } else if (
        Node.is.kind(BinaryExpression, declaration) ||
        (isInJSFile(declaration) &&
          (Node.is.kind(CallExpression, declaration) ||
            ((Node.is.kind(PropertyAccessExpression, declaration) || isBindableStaticElementAccessExpression(declaration)) && Node.is.kind(BinaryExpression, declaration.parent))))
      ) {
        type = getWidenedTypeForAssignmentDeclaration(symbol);
      } else if (
        Node.isJSDoc.propertyLikeTag(declaration) ||
        Node.is.kind(PropertyAccessExpression, declaration) ||
        Node.is.kind(ElementAccessExpression, declaration) ||
        Node.is.kind(Identifier, declaration) ||
        StringLiteral.like(declaration) ||
        Node.is.kind(NumericLiteral, declaration) ||
        Node.is.kind(ClassDeclaration, declaration) ||
        Node.is.kind(FunctionDeclaration, declaration) ||
        (Node.is.kind(MethodDeclaration, declaration) && !Node.is.objectLiteralMethod(declaration)) ||
        Node.is.kind(MethodSignature, declaration) ||
        Node.is.kind(SourceFile, declaration)
      ) {
        // Symbol is property of some kind that is merged with something - should use `getTypeOfFuncClassEnumModule` and not `getTypeOfVariableOrParameterOrProperty`
        if (symbol.flags & (SymbolFlags.Function | SymbolFlags.Method | SymbolFlags.Class | SymbolFlags.Enum | SymbolFlags.ValueModule)) {
          return getTypeOfFuncClassEnumModule(symbol);
        }
        type = Node.is.kind(BinaryExpression, declaration.parent) ? getWidenedTypeForAssignmentDeclaration(symbol) : tryGetTypeFromEffectiveTypeNode(declaration) || anyType;
      } else if (Node.is.kind(PropertyAssignment, declaration)) {
        type = tryGetTypeFromEffectiveTypeNode(declaration) || checkPropertyAssignment(declaration);
      } else if (Node.is.kind(JsxAttribute, declaration)) {
        type = tryGetTypeFromEffectiveTypeNode(declaration) || checkJsxAttribute(declaration);
      } else if (Node.is.kind(ShorthandPropertyAssignment, declaration)) {
        type = tryGetTypeFromEffectiveTypeNode(declaration) || checkExpressionForMutableLocation(declaration.name, CheckMode.Normal);
      } else if (Node.is.objectLiteralMethod(declaration)) {
        type = tryGetTypeFromEffectiveTypeNode(declaration) || checkObjectLiteralMethod(declaration, CheckMode.Normal);
      } else if (
        Node.is.kind(ParameterDeclaration, declaration) ||
        Node.is.kind(PropertyDeclaration, declaration) ||
        Node.is.kind(PropertySignature, declaration) ||
        Node.is.kind(VariableDeclaration, declaration) ||
        Node.is.kind(BindingElement, declaration)
      ) {
        type = getWidenedTypeForVariableLikeDeclaration(declaration, /*includeOptionality*/ true);
      }
      // getTypeOfSymbol dispatches some JS merges incorrectly because their symbol flags are not mutually exclusive.
      // Re-dispatch based on valueDeclaration.kind instead.
      else if (Node.is.kind(EnumDeclaration, declaration)) {
        type = getTypeOfFuncClassEnumModule(symbol);
      } else if (Node.is.kind(EnumMember, declaration)) {
        type = getTypeOfEnumMember(symbol);
      } else if (Node.is.accessor(declaration)) {
        type = resolveTypeOfAccessors(symbol);
      } else {
        return fail('Unhandled declaration kind! ' + Debug.formatSyntax(declaration.kind) + ' for ' + Debug.formatSymbol(symbol));
      }

      if (!popTypeResolution()) {
        // Symbol is property of some kind that is merged with something - should use `getTypeOfFuncClassEnumModule` and not `getTypeOfVariableOrParameterOrProperty`
        if (symbol.flags & SymbolFlags.ValueModule && !(symbol.flags & SymbolFlags.Assignment)) {
          return getTypeOfFuncClassEnumModule(symbol);
        }
        return reportCircularityError(symbol);
      }
      return type;
    }
    getTypeOfAccessors(s: Symbol): Type {
      const links = getSymbolLinks(symbol);
      return links.type || (links.type = getTypeOfAccessorsWorker(symbol));
    }
    getTypeOfAccessorsWorker(s: Symbol): Type {
      if (!pushTypeResolution(symbol, TypeSystemPropertyName.Type)) {
        return errorType;
      }

      let type = resolveTypeOfAccessors(symbol);

      if (!popTypeResolution()) {
        type = anyType;
        if (noImplicitAny) {
          const getter = getDeclarationOfKind<AccessorDeclaration>(symbol, Syntax.GetAccessor);
          error(
            getter,
            Diagnostics._0_implicitly_has_return_type_any_because_it_does_not_have_a_return_type_annotation_and_is_referenced_directly_or_indirectly_in_one_of_its_return_expressions,
            symbolToString(symbol)
          );
        }
      }
      return type;
    }
    resolveTypeOfAccessors(s: Symbol) {
      const getter = getDeclarationOfKind<AccessorDeclaration>(symbol, Syntax.GetAccessor);
      const setter = getDeclarationOfKind<AccessorDeclaration>(symbol, Syntax.SetAccessor);

      if (getter && isInJSFile(getter)) {
        const jsDocType = getTypeForDeclarationFromJSDocComment(getter);
        if (jsDocType) {
          return jsDocType;
        }
      }
      // First try to see if the user specified a return type on the get-accessor.
      const getterReturnType = getAnnotatedAccessorType(getter);
      if (getterReturnType) {
        return getterReturnType;
      } else {
        // If the user didn't specify a return type, try to use the set-accessor's parameter type.
        const setterParameterType = getAnnotatedAccessorType(setter);
        if (setterParameterType) {
          return setterParameterType;
        } else {
          // If there are no specified types, try to infer it from the body of the get accessor if it exists.
          if (getter && getter.body) {
            return getReturnTypeFromBody(getter);
          }
          // Otherwise, fall back to 'any'.
          else {
            if (setter) {
              if (!isPrivateWithinAmbient(setter)) {
                errorOrSuggestion(noImplicitAny, setter, Diagnostics.Property_0_implicitly_has_type_any_because_its_set_accessor_lacks_a_parameter_type_annotation, symbolToString(symbol));
              }
            } else {
              assert(!!getter, 'there must exist a getter as we are current checking either setter or getter in this function');
              if (!isPrivateWithinAmbient(getter)) {
                errorOrSuggestion(noImplicitAny, getter, Diagnostics.Property_0_implicitly_has_type_any_because_its_get_accessor_lacks_a_return_type_annotation, symbolToString(symbol));
              }
            }
            return anyType;
          }
        }
      }
    }
    getBaseTypeVariableOfClass(s: Symbol) {
      const baseConstructorType = getBaseConstructorTypeOfClass(getDeclaredTypeOfClassOrInterface(symbol));
      return baseConstructorType.flags & TypeFlags.TypeVariable
        ? baseConstructorType
        : baseConstructorType.flags & TypeFlags.Intersection
        ? find((baseConstructorType as IntersectionType).types, (t) => !!(t.flags & TypeFlags.TypeVariable))
        : undefined;
    }
    getTypeOfFuncClassEnumModule(s: Symbol): Type {
      let links = getSymbolLinks(symbol);
      const originalLinks = links;
      if (!links.type) {
        const jsDeclaration = symbol.valueDeclaration && getDeclarationOfExpando(symbol.valueDeclaration);
        if (jsDeclaration) {
          const merged = mergeJSSymbols(symbol, getSymbolOfNode(jsDeclaration));
          if (merged) {
            // note:we overwrite links because we just cloned the symbol
            symbol = links = merged;
          }
        }
        originalLinks.type = links.type = getTypeOfFuncClassEnumModuleWorker(symbol);
      }
      return links.type;
    }
    getTypeOfFuncClassEnumModuleWorker(s: Symbol): Type {
      const declaration = symbol.valueDeclaration;
      if (symbol.flags & SymbolFlags.Module && isShorthandAmbientModuleSymbol(symbol)) {
        return anyType;
      } else if (declaration && (declaration.kind === Syntax.BinaryExpression || (isAccessExpression(declaration) && declaration.parent.kind === Syntax.BinaryExpression))) {
        return getWidenedTypeForAssignmentDeclaration(symbol);
      } else if (symbol.flags & SymbolFlags.ValueModule && declaration && Node.is.kind(SourceFile, declaration) && declaration.commonJsModuleIndicator) {
        const resolvedModule = resolveExternalModuleSymbol(symbol);
        if (resolvedModule !== symbol) {
          if (!pushTypeResolution(symbol, TypeSystemPropertyName.Type)) {
            return errorType;
          }
          const exportEquals = getMergedSymbol(symbol.exports!.get(InternalSymbolName.ExportEquals)!);
          const type = getWidenedTypeForAssignmentDeclaration(exportEquals, exportEquals === resolvedModule ? undefined : resolvedModule);
          if (!popTypeResolution()) {
            return reportCircularityError(symbol);
          }
          return type;
        }
      }
      const type = createObjectType(ObjectFlags.Anonymous, symbol);
      if (symbol.flags & SymbolFlags.Class) {
        const baseTypeVariable = getBaseTypeVariableOfClass(symbol);
        return baseTypeVariable ? getIntersectionType([type, baseTypeVariable]) : type;
      } else {
        return strictNullChecks && symbol.flags & SymbolFlags.Optional ? getOptionalType(type) : type;
      }
    }
    getTypeOfEnumMember(s: Symbol): Type {
      const links = getSymbolLinks(symbol);
      return links.type || (links.type = getDeclaredTypeOfEnumMember(symbol));
    }
    getTypeOfAlias(s: Symbol): Type {
      const links = getSymbolLinks(symbol);
      if (!links.type) {
        const targetSymbol = resolveAlias(symbol);

        // It only makes sense to get the type of a value symbol. If the result of resolving
        // the alias is not a value, then it has no type. To get the type associated with a
        // type symbol, call getDeclaredTypeOfSymbol.
        // This check is important because without it, a call to getTypeOfSymbol could end
        // up recursively calling getTypeOfAlias, causing a stack overflow.
        links.type = targetSymbol.flags & SymbolFlags.Value ? getTypeOfSymbol(targetSymbol) : errorType;
      }
      return links.type;
    }
    getTypeOfInstantiatedSymbol(s: Symbol): Type {
      const links = getSymbolLinks(symbol);
      if (!links.type) {
        if (!pushTypeResolution(symbol, TypeSystemPropertyName.Type)) {
          return (links.type = errorType);
        }
        let type = instantiateType(getTypeOfSymbol(links.target!), links.mapper);
        if (!popTypeResolution()) {
          type = reportCircularityError(symbol);
        }
        links.type = type;
      }
      return links.type;
    }
    reportCircularityError(s: Symbol) {
      const declaration = <VariableLikeDeclaration>symbol.valueDeclaration;
      // Check if variable has type annotation that circularly references the variable itself
      if (getEffectiveTypeAnnotationNode(declaration)) {
        error(symbol.valueDeclaration, Diagnostics._0_is_referenced_directly_or_indirectly_in_its_own_type_annotation, symbolToString(symbol));
        return errorType;
      }
      // Check if variable has initializer that circularly references the variable itself
      if (noImplicitAny && (declaration.kind !== Syntax.Parameter || (<HasInitializer>declaration).initializer)) {
        error(
          symbol.valueDeclaration,
          Diagnostics._0_implicitly_has_type_any_because_it_does_not_have_a_type_annotation_and_is_referenced_directly_or_indirectly_in_its_own_initializer,
          symbolToString(symbol)
        );
      }
      // Circularities could also result from parameters in function expressions that end up
      // having themselves as contextual types following type argument inference. In those cases
      // we have already reported an implicit any error so we don't report anything here.
      return anyType;
    }
    getTypeOfSymbolWithDeferredType(s: Symbol) {
      const links = getSymbolLinks(symbol);
      if (!links.type) {
        Debug.assertIsDefined(links.deferralParent);
        Debug.assertIsDefined(links.deferralConstituents);
        links.type = links.deferralParent.flags & TypeFlags.Union ? getUnionType(links.deferralConstituents) : getIntersectionType(links.deferralConstituents);
      }
      return links.type;
    }
    getTypeOfSymbol(s: Symbol): Type {
      const checkFlags = getCheckFlags(symbol);
      if (checkFlags & CheckFlags.DeferredType) {
        return getTypeOfSymbolWithDeferredType(symbol);
      }
      if (checkFlags & CheckFlags.Instantiated) {
        return getTypeOfInstantiatedSymbol(symbol);
      }
      if (checkFlags & CheckFlags.Mapped) {
        return getTypeOfMappedSymbol(symbol as MappedSymbol);
      }
      if (checkFlags & CheckFlags.ReverseMapped) {
        return getTypeOfReverseMappedSymbol(symbol as ReverseMappedSymbol);
      }
      if (symbol.flags & (SymbolFlags.Variable | SymbolFlags.Property)) {
        return getTypeOfVariableOrParameterOrProperty(symbol);
      }
      if (symbol.flags & (SymbolFlags.Function | SymbolFlags.Method | SymbolFlags.Class | SymbolFlags.Enum | SymbolFlags.ValueModule)) {
        return getTypeOfFuncClassEnumModule(symbol);
      }
      if (symbol.flags & SymbolFlags.EnumMember) {
        return getTypeOfEnumMember(symbol);
      }
      if (symbol.flags & SymbolFlags.Accessor) {
        return getTypeOfAccessors(symbol);
      }
      if (symbol.flags & SymbolFlags.Alias) {
        return getTypeOfAlias(symbol);
      }
      return errorType;
    }
    getOuterTypeParametersOfClassOrInterface(s: Symbol): TypeParameter[] | undefined {
      const declaration = symbol.flags & SymbolFlags.Class ? symbol.valueDeclaration : getDeclarationOfKind(symbol, Syntax.InterfaceDeclaration)!;
      assert(!!declaration, 'Class was missing valueDeclaration -OR- non-class had no interface declarations');
      return getOuterTypeParameters(declaration);
    }
    getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(s: Symbol): TypeParameter[] | undefined {
      let result: TypeParameter[] | undefined;
      for (const node of symbol.declarations) {
        if (node.kind === Syntax.InterfaceDeclaration || node.kind === Syntax.ClassDeclaration || node.kind === Syntax.ClassExpression || isJSConstructor(node) || Node.is.typeAlias(node)) {
          const declaration = <InterfaceDeclaration | TypeAliasDeclaration | JSDocTypedefTag | JSDocCallbackTag>node;
          result = appendTypeParameters(result, getEffectiveTypeParameterDeclarations(declaration));
        }
      }
      return result;
    }
    getTypeParametersOfClassOrInterface(s: Symbol): TypeParameter[] | undefined {
      return concatenate(getOuterTypeParametersOfClassOrInterface(symbol), getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(symbol));
    }
    isThislessInterface(s: Symbol): boolean {
      for (const declaration of symbol.declarations) {
        if (declaration.kind === Syntax.InterfaceDeclaration) {
          if (declaration.flags & NodeFlags.ContainsThis) {
            return false;
          }
          const baseTypeNodes = getInterfaceBaseTypeNodes(<InterfaceDeclaration>declaration);
          if (baseTypeNodes) {
            for (const node of baseTypeNodes) {
              if (isEntityNameExpression(node.expression)) {
                const baseSymbol = resolveEntityName(node.expression, SymbolFlags.Type, /*ignoreErrors*/ true);
                if (!baseSymbol || !(baseSymbol.flags & SymbolFlags.Interface) || getDeclaredTypeOfClassOrInterface(baseSymbol).thisType) {
                  return false;
                }
              }
            }
          }
        }
      }
      return true;
    }
    getDeclaredTypeOfClassOrInterface(s: Symbol): InterfaceType {
      let links = getSymbolLinks(symbol);
      const originalLinks = links;
      if (!links.declaredType) {
        const kind = symbol.flags & SymbolFlags.Class ? ObjectFlags.Class : ObjectFlags.Interface;
        const merged = mergeJSSymbols(symbol, getAssignedClassSymbol(symbol.valueDeclaration));
        if (merged) {
          // note:we overwrite links because we just cloned the symbol
          symbol = links = merged;
        }

        const type = (originalLinks.declaredType = links.declaredType = <InterfaceType>createObjectType(kind, symbol));
        const outerTypeParameters = getOuterTypeParametersOfClassOrInterface(symbol);
        const localTypeParameters = getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(symbol);
        // A class or interface is generic if it has type parameters or a "this" type. We always give classes a "this" type
        // because it is not feasible to analyze all members to determine if the "this" type escapes the class (in particular,
        // property types inferred from initializers and method return types inferred from return statements are very hard
        // to exhaustively analyze). We give interfaces a "this" type if we can't definitely determine that they are free of
        // "this" references.
        if (outerTypeParameters || localTypeParameters || kind === ObjectFlags.Class || !isThislessInterface(symbol)) {
          type.objectFlags |= ObjectFlags.Reference;
          type.typeParameters = concatenate(outerTypeParameters, localTypeParameters);
          type.outerTypeParameters = outerTypeParameters;
          type.localTypeParameters = localTypeParameters;
          (<GenericType>type).instantiations = new QMap<TypeReference>();
          (<GenericType>type).instantiations.set(getTypeListId(type.typeParameters), <GenericType>type);
          (<GenericType>type).target = <GenericType>type;
          (<GenericType>type).resolvedTypeArguments = type.typeParameters;
          type.thisType = createTypeParameter(symbol);
          type.thisType.isThisType = true;
          type.thisType.constraint = type;
        }
      }
      return <InterfaceType>links.declaredType;
    }
    getDeclaredTypeOfTypeAlias(s: Symbol): Type {
      const links = getSymbolLinks(symbol);
      if (!links.declaredType) {
        // Note that we use the links object as the target here because the symbol object is used as the unique
        // identity for resolution of the 'type' property in SymbolLinks.
        if (!pushTypeResolution(symbol, TypeSystemPropertyName.DeclaredType)) {
          return errorType;
        }

        const declaration = Debug.checkDefined(find(symbol.declarations, isTypeAlias), 'Type alias symbol with no valid declaration found');
        const typeNode = Node.isJSDoc.typeAlias(declaration) ? declaration.typeExpression : declaration.type;
        // If typeNode is missing, we will error in checkJSDocTypedefTag.
        let type = typeNode ? getTypeFromTypeNode(typeNode) : errorType;

        if (popTypeResolution()) {
          const typeParameters = getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(symbol);
          if (typeParameters) {
            // Initialize the instantiation cache for generic type aliases. The declared type corresponds to
            // an instantiation of the type alias with the type parameters supplied as type arguments.
            links.typeParameters = typeParameters;
            links.instantiations = new QMap<Type>();
            links.instantiations.set(getTypeListId(typeParameters), type);
          }
        } else {
          type = errorType;
          error(Node.is.namedDeclaration(declaration) ? declaration.name : declaration || declaration, Diagnostics.Type_alias_0_circularly_references_itself, symbolToString(symbol));
        }
        links.declaredType = type;
      }
      return links.declaredType;
    }
    getEnumKind(s: Symbol): EnumKind {
      const links = getSymbolLinks(symbol);
      if (links.enumKind !== undefined) {
        return links.enumKind;
      }
      let hasNonLiteralMember = false;
      for (const declaration of symbol.declarations) {
        if (declaration.kind === Syntax.EnumDeclaration) {
          for (const member of (<EnumDeclaration>declaration).members) {
            if (member.initializer && StringLiteral.like(member.initializer)) {
              return (links.enumKind = EnumKind.Literal);
            }
            if (!isLiteralEnumMember(member)) {
              hasNonLiteralMember = true;
            }
          }
        }
      }
      return (links.enumKind = hasNonLiteralMember ? EnumKind.Numeric : EnumKind.Literal);
    }
    getDeclaredTypeOfEnum(s: Symbol): Type {
      const links = getSymbolLinks(symbol);
      if (links.declaredType) {
        return links.declaredType;
      }
      if (getEnumKind(symbol) === EnumKind.Literal) {
        enumCount++;
        const memberTypeList: Type[] = [];
        for (const declaration of symbol.declarations) {
          if (declaration.kind === Syntax.EnumDeclaration) {
            for (const member of (<EnumDeclaration>declaration).members) {
              const value = getEnumMemberValue(member);
              const memberType = getFreshTypeOfLiteralType(getLiteralType(value !== undefined ? value : 0, enumCount, getSymbolOfNode(member)));
              getSymbolLinks(getSymbolOfNode(member)).declaredType = memberType;
              memberTypeList.push(getRegularTypeOfLiteralType(memberType));
            }
          }
        }
        if (memberTypeList.length) {
          const enumType = getUnionType(memberTypeList, UnionReduction.Literal, symbol, /*aliasTypeArguments*/ undefined);
          if (enumType.flags & TypeFlags.Union) {
            enumType.flags |= TypeFlags.EnumLiteral;
            enumType.symbol = symbol;
          }
          return (links.declaredType = enumType);
        }
      }
      const enumType = createType(TypeFlags.Enum);
      enumType.symbol = symbol;
      return (links.declaredType = enumType);
    }
    getDeclaredTypeOfEnumMember(s: Symbol): Type {
      const links = getSymbolLinks(symbol);
      if (!links.declaredType) {
        const enumType = getDeclaredTypeOfEnum(getParentOfSymbol(symbol)!);
        if (!links.declaredType) {
          links.declaredType = enumType;
        }
      }
      return links.declaredType;
    }
    getDeclaredTypeOfTypeParameter(s: Symbol): TypeParameter {
      const links = getSymbolLinks(symbol);
      return links.declaredType || (links.declaredType = createTypeParameter(symbol));
    }
    getDeclaredTypeOfAlias(s: Symbol): Type {
      const links = getSymbolLinks(symbol);
      return links.declaredType || (links.declaredType = getDeclaredTypeOfSymbol(resolveAlias(symbol)));
    }
    getDeclaredTypeOfSymbol(s: Symbol): Type {
      return tryGetDeclaredTypeOfSymbol(symbol) || errorType;
    }
    tryGetDeclaredTypeOfSymbol(s: Symbol): Type | undefined {
      if (symbol.flags & (SymbolFlags.Class | SymbolFlags.Interface)) {
        return getDeclaredTypeOfClassOrInterface(symbol);
      }
      if (symbol.flags & SymbolFlags.TypeAlias) {
        return getDeclaredTypeOfTypeAlias(symbol);
      }
      if (symbol.flags & SymbolFlags.TypeParameter) {
        return getDeclaredTypeOfTypeParameter(symbol);
      }
      if (symbol.flags & SymbolFlags.Enum) {
        return getDeclaredTypeOfEnum(symbol);
      }
      if (symbol.flags & SymbolFlags.EnumMember) {
        return getDeclaredTypeOfEnumMember(symbol);
      }
      if (symbol.flags & SymbolFlags.Alias) {
        return getDeclaredTypeOfAlias(symbol);
      }
      return;
    }
    isThisless(s: Symbol): boolean {
      if (symbol.declarations && symbol.declarations.length === 1) {
        const declaration = symbol.declarations[0];
        if (declaration) {
          switch (declaration.kind) {
            case Syntax.PropertyDeclaration:
            case Syntax.PropertySignature:
              return isThislessVariableLikeDeclaration(<VariableLikeDeclaration>declaration);
            case Syntax.MethodDeclaration:
            case Syntax.MethodSignature:
            case Syntax.Constructor:
            case Syntax.GetAccessor:
            case Syntax.SetAccessor:
              return isThislessFunctionLikeDeclaration(<FunctionLikeDeclaration | AccessorDeclaration>declaration);
          }
        }
      }
      return false;
    }
    getMembersOfSymbol(s: Symbol) {
      return symbol.flags & SymbolFlags.LateBindingContainer ? getResolvedMembersOrExportsOfSymbol(symbol, MembersOrExportsResolutionKind.resolvedMembers) : symbol.members || emptySymbols;
    }
    getLateBoundSymbol(s: Symbol): Symbol {
      if (symbol.flags & SymbolFlags.ClassMember && symbol.escName === InternalSymbolName.Computed) {
        const links = getSymbolLinks(symbol);
        if (!links.lateSymbol && some(symbol.declarations, hasLateBindableName)) {
          // force late binding of members/exports. This will set the late-bound symbol
          const parent = getMergedSymbol(symbol.parent)!;
          if (some(symbol.declarations, hasStaticModifier)) {
            getExportsOfSymbol(parent);
          } else {
            getMembersOfSymbol(parent);
          }
        }
        return links.lateSymbol || (links.lateSymbol = symbol);
      }
      return symbol;
    }
    getIndexSymbol(s: Symbol): Symbol | undefined {
      return symbol.members!.get(InternalSymbolName.Index);
    }
    getIndexDeclarationOfSymbol(s: Symbol, kind: IndexKind): IndexSignatureDeclaration | undefined {
      const syntaxKind = kind === IndexKind.Number ? Syntax.NumberKeyword : Syntax.StringKeyword;
      const indexSymbol = getIndexSymbol(symbol);
      if (indexSymbol) {
        for (const decl of indexSymbol.declarations) {
          const node = cast(decl, IndexSignatureDeclaration.kind);
          if (node.parameters.length === 1) {
            const parameter = node.parameters[0];
            if (parameter.type && parameter.type.kind === syntaxKind) {
              return node;
            }
          }
        }
      }
      return;
    }
    getIndexInfoOfSymbol(s: Symbol, kind: IndexKind): IndexInfo | undefined {
      const declaration = getIndexDeclarationOfSymbol(symbol, kind);
      if (declaration) {
        return createIndexInfo(declaration.type ? getTypeFromTypeNode(declaration.type) : anyType, hasEffectiveModifier(declaration, ModifierFlags.Readonly), declaration);
      }
      return;
    }
    createUniqueESSymbolType(s: Symbol) {
      const type = <UniqueESSymbolType>createType(TypeFlags.UniqueESSymbol);
      type.symbol = symbol;
      type.escName = `__@${type.symbol.escName}@${getSymbolId(type.symbol)}` as __String;
      return type;
    }
    getAliasVariances(s: Symbol) {
      const links = getSymbolLinks(symbol);
      return getVariancesWorker(links.typeParameters, links, (_links, param, marker) => {
        const type = getTypeAliasInstantiation(symbol, instantiateTypes(links.typeParameters!, makeUnaryTypeMapper(param, marker)));
        type.aliasTypeArgumentsContainsMarker = true;
        return type;
      });
    }
    isParameterAssigned(s: Symbol) {
      const func = <FunctionLikeDeclaration>getRootDeclaration(symbol.valueDeclaration).parent;
      const links = getNodeLinks(func);
      if (!(links.flags & NodeCheckFlags.AssignmentsMarked)) {
        links.flags |= NodeCheckFlags.AssignmentsMarked;
        if (!hasParentWithAssignmentsMarked(func)) {
          markParameterAssignments(func);
        }
      }
      return symbol.isAssigned || false;
    }
    isConstVariable(s: Symbol) {
      return symbol.flags & SymbolFlags.Variable && (getDeclarationNodeFlagsFromSymbol(symbol) & NodeFlags.Const) !== 0 && getTypeOfSymbol(symbol) !== autoArrayType;
    }
    isCircularMappedProperty(s: Symbol) {
      return !!(getCheckFlags(symbol) & CheckFlags.Mapped && !(<MappedSymbol>symbol).type && findResolutionCycleStartIndex(symbol, TypeSystemPropertyName.Type) >= 0);
    }
    getImmediateAliasedSymbol(s: Symbol): Symbol | undefined {
      assert((symbol.flags & SymbolFlags.Alias) !== 0, 'Should only get Alias here.');
      const links = getSymbolLinks(symbol);
      if (!links.immediateTarget) {
        const node = getDeclarationOfAliasSymbol(symbol);
        if (!node) return fail();
        links.immediateTarget = getTargetOfAliasDeclaration(node, /*dontRecursivelyResolve*/ true);
      }

      return links.immediateTarget;
    }
    isPrototypeProperty(s: Symbol) {
      if (symbol.flags & SymbolFlags.Method || getCheckFlags(symbol) & CheckFlags.SyntheticMethod) {
        return true;
      }
      if (isInJSFile(symbol.valueDeclaration)) {
        const parent = symbol.valueDeclaration.parent;
        return parent && Node.is.kind(BinaryExpression, parent) && getAssignmentDeclarationKind(parent) === AssignmentDeclarationKind.PrototypeProperty;
      }
    }
    symbolHasNonMethodDeclaration(s: Symbol) {
      return !!forEachProperty(symbol, (prop) => !(prop.flags & SymbolFlags.Method));
    }
    getTypeOfParameter(s: Symbol) {
      const type = getTypeOfSymbol(symbol);
      if (strictNullChecks) {
        const declaration = symbol.valueDeclaration;
        if (declaration && Node.is.withInitializer(declaration)) {
          return getOptionalType(type);
        }
      }
      return type;
    }
    isReadonlySymbol(s: Symbol): boolean {
      return !!(
        getCheckFlags(symbol) & CheckFlags.Readonly ||
        (symbol.flags & SymbolFlags.Property && getDeclarationModifierFlagsFromSymbol(symbol) & ModifierFlags.Readonly) ||
        (symbol.flags & SymbolFlags.Variable && getDeclarationNodeFlagsFromSymbol(symbol) & NodeFlags.Const) ||
        (symbol.flags & SymbolFlags.Accessor && !(symbol.flags & SymbolFlags.SetAccessor)) ||
        symbol.flags & SymbolFlags.EnumMember ||
        some(symbol.declarations, isReadonlyAssignmentDeclaration)
      );
    }
    isConstEnumSymbol(s: Symbol): boolean {
      return (symbol.flags & SymbolFlags.ConstEnum) !== 0;
    }
    checkFunctionOrConstructorSymbol(s: Symbol): void {
      if (!produceDiagnostics) {
        return;
      }

      function getCanonicalOverload(overloads: Declaration[], implementation: FunctionLikeDeclaration | undefined): Declaration {
        // Consider the canonical set of flags to be the flags of the bodyDeclaration or the first declaration
        // Error on all deviations from this canonical set of flags
        // The caveat is that if some overloads are defined in lib.d.ts, we don't want to
        // report the errors on those. To achieve this, we will say that the implementation is
        // the canonical signature only if it is in the same container as the first overload
        const implementationSharesContainerWithFirstOverload = implementation !== undefined && implementation.parent === overloads[0].parent;
        return implementationSharesContainerWithFirstOverload ? implementation! : overloads[0];
      }

      function checkFlagAgreementBetweenOverloads(
        overloads: Declaration[],
        implementation: FunctionLikeDeclaration | undefined,
        flagsToCheck: ModifierFlags,
        someOverloadFlags: ModifierFlags,
        allOverloadFlags: ModifierFlags
      ): void {
        // Error if some overloads have a flag that is not shared by all overloads. To find the
        // deviations, we XOR someOverloadFlags with allOverloadFlags
        const someButNotAllOverloadFlags = someOverloadFlags ^ allOverloadFlags;
        if (someButNotAllOverloadFlags !== 0) {
          const canonicalFlags = getEffectiveDeclarationFlags(getCanonicalOverload(overloads, implementation), flagsToCheck);

          forEach(overloads, (o) => {
            const deviation = getEffectiveDeclarationFlags(o, flagsToCheck) ^ canonicalFlags;
            if (deviation & ModifierFlags.Export) {
              error(getNameOfDeclaration(o), Diagnostics.Overload_signatures_must_all_be_exported_or_non_exported);
            } else if (deviation & ModifierFlags.Ambient) {
              error(getNameOfDeclaration(o), Diagnostics.Overload_signatures_must_all_be_ambient_or_non_ambient);
            } else if (deviation & (ModifierFlags.Private | ModifierFlags.Protected)) {
              error(getNameOfDeclaration(o) || o, Diagnostics.Overload_signatures_must_all_be_public_private_or_protected);
            } else if (deviation & ModifierFlags.Abstract) {
              error(getNameOfDeclaration(o), Diagnostics.Overload_signatures_must_all_be_abstract_or_non_abstract);
            }
          });
        }
      }

      function checkQuestionTokenAgreementBetweenOverloads(
        overloads: Declaration[],
        implementation: FunctionLikeDeclaration | undefined,
        someHaveQuestionToken: boolean,
        allHaveQuestionToken: boolean
      ): void {
        if (someHaveQuestionToken !== allHaveQuestionToken) {
          const canonicalHasQuestionToken = hasQuestionToken(getCanonicalOverload(overloads, implementation));
          forEach(overloads, (o) => {
            const deviation = hasQuestionToken(o) !== canonicalHasQuestionToken;
            if (deviation) {
              error(getNameOfDeclaration(o), Diagnostics.Overload_signatures_must_all_be_optional_or_required);
            }
          });
        }
      }

      const flagsToCheck: ModifierFlags = ModifierFlags.Export | ModifierFlags.Ambient | ModifierFlags.Private | ModifierFlags.Protected | ModifierFlags.Abstract;
      let someNodeFlags: ModifierFlags = ModifierFlags.None;
      let allNodeFlags = flagsToCheck;
      let someHaveQuestionToken = false;
      let allHaveQuestionToken = true;
      let hasOverloads = false;
      let bodyDeclaration: FunctionLikeDeclaration | undefined;
      let lastSeenNonAmbientDeclaration: FunctionLikeDeclaration | undefined;
      let previousDeclaration: SignatureDeclaration | undefined;

      const declarations = symbol.declarations;
      const isConstructor = (symbol.flags & SymbolFlags.Constructor) !== 0;

      function reportImplementationExpectedError(node: SignatureDeclaration): void {
        if (node.name && Node.is.missing(node.name)) {
          return;
        }

        let seen = false;
        const subsequentNode = Node.forEach.child(node.parent, (c) => {
          if (seen) {
            return c;
          } else {
            seen = c === node;
          }
        });
        // We may be here because of some extra nodes between overloads that could not be parsed into a valid node.
        // In this case the subsequent node is not really consecutive (.pos !== node.end), and we must ignore it here.
        if (subsequentNode && subsequentNode.pos === node.end) {
          if (subsequentNode.kind === node.kind) {
            const errorNode: Node = (<FunctionLikeDeclaration>subsequentNode).name || subsequentNode;
            const subsequentName = (<FunctionLikeDeclaration>subsequentNode).name;
            if (
              node.name &&
              subsequentName &&
              // both are private identifiers
              ((Node.is.kind(PrivateIdentifier, node.name) && Node.is.kind(PrivateIdentifier, subsequentName) && node.name.escapedText === subsequentName.escapedText) ||
                // Both are computed property names
                // TODO: GH#17345: These are methods, so handle computed name case. (`Always allowing computed property names is *not* the correct behavior!)
                (Node.is.kind(ComputedPropertyName, node.name) && Node.is.kind(ComputedPropertyName, subsequentName)) ||
                // Both are literal property names that are the same.
                (isPropertyNameLiteral(node.name) && isPropertyNameLiteral(subsequentName) && getEscapedTextOfIdentifierOrLiteral(node.name) === getEscapedTextOfIdentifierOrLiteral(subsequentName)))
            ) {
              const reportError =
                (node.kind === Syntax.MethodDeclaration || node.kind === Syntax.MethodSignature) &&
                hasSyntacticModifier(node, ModifierFlags.Static) !== hasSyntacticModifier(subsequentNode, ModifierFlags.Static);
              // we can get here in two cases
              // 1. mixed static and instance class members
              // 2. something with the same name was defined before the set of overloads that prevents them from merging
              // here we'll report error only for the first case since for second we should already report error in binder
              if (reportError) {
                const diagnostic = hasSyntacticModifier(node, ModifierFlags.Static) ? Diagnostics.Function_overload_must_be_static : Diagnostics.Function_overload_must_not_be_static;
                error(errorNode, diagnostic);
              }
              return;
            }
            if (Node.is.present((<FunctionLikeDeclaration>subsequentNode).body)) {
              error(errorNode, Diagnostics.Function_implementation_name_must_be_0, declarationNameToString(node.name));
              return;
            }
          }
        }
        const errorNode: Node = node.name || node;
        if (isConstructor) {
          error(errorNode, Diagnostics.Constructor_implementation_is_missing);
        } else {
          // Report different errors regarding non-consecutive blocks of declarations depending on whether
          // the node in question is abstract.
          if (hasSyntacticModifier(node, ModifierFlags.Abstract)) {
            error(errorNode, Diagnostics.All_declarations_of_an_abstract_method_must_be_consecutive);
          } else {
            error(errorNode, Diagnostics.Function_implementation_is_missing_or_not_immediately_following_the_declaration);
          }
        }
      }

      let duplicateFunctionDeclaration = false;
      let multipleConstructorImplementation = false;
      let hasNonAmbientClass = false;
      for (const current of declarations) {
        const node = <SignatureDeclaration | ClassDeclaration | ClassExpression>current;
        const inAmbientContext = node.flags & NodeFlags.Ambient;
        const inAmbientContextOrInterface = node.parent.kind === Syntax.InterfaceDeclaration || node.parent.kind === Syntax.TypeLiteral || inAmbientContext;
        if (inAmbientContextOrInterface) {
          // check if declarations are consecutive only if they are non-ambient
          // 1. ambient declarations can be interleaved
          // i.e. this is legal
          //     declare function foo();
          //     declare function bar();
          //     declare function foo();
          // 2. mixing ambient and non-ambient declarations is a separate error that will be reported - do not want to report an extra one
          previousDeclaration = undefined;
        }

        if ((node.kind === Syntax.ClassDeclaration || node.kind === Syntax.ClassExpression) && !inAmbientContext) {
          hasNonAmbientClass = true;
        }

        if (node.kind === Syntax.FunctionDeclaration || node.kind === Syntax.MethodDeclaration || node.kind === Syntax.MethodSignature || node.kind === Syntax.Constructor) {
          const currentNodeFlags = getEffectiveDeclarationFlags(node, flagsToCheck);
          someNodeFlags |= currentNodeFlags;
          allNodeFlags &= currentNodeFlags;
          someHaveQuestionToken = someHaveQuestionToken || hasQuestionToken(node);
          allHaveQuestionToken = allHaveQuestionToken && hasQuestionToken(node);

          if (Node.is.present((node as FunctionLikeDeclaration).body) && bodyDeclaration) {
            if (isConstructor) {
              multipleConstructorImplementation = true;
            } else {
              duplicateFunctionDeclaration = true;
            }
          } else if (previousDeclaration && previousDeclaration.parent === node.parent && previousDeclaration.end !== node.pos) {
            reportImplementationExpectedError(previousDeclaration);
          }

          if (Node.is.present((node as FunctionLikeDeclaration).body)) {
            if (!bodyDeclaration) {
              bodyDeclaration = node as FunctionLikeDeclaration;
            }
          } else {
            hasOverloads = true;
          }

          previousDeclaration = node;

          if (!inAmbientContextOrInterface) {
            lastSeenNonAmbientDeclaration = node as FunctionLikeDeclaration;
          }
        }
      }

      if (multipleConstructorImplementation) {
        forEach(declarations, (declaration) => {
          error(declaration, Diagnostics.Multiple_constructor_implementations_are_not_allowed);
        });
      }

      if (duplicateFunctionDeclaration) {
        forEach(declarations, (declaration) => {
          error(getNameOfDeclaration(declaration), Diagnostics.Duplicate_function_implementation);
        });
      }

      if (hasNonAmbientClass && !isConstructor && symbol.flags & SymbolFlags.Function) {
        // A non-ambient class cannot be an implementation for a non-constructor function/class merge
        // TODO: The below just replicates our older error from when classes and functions were
        // entirely unable to merge - a more helpful message like "Class declaration cannot implement overload list"
        // might be warranted. :shrug:
        forEach(declarations, (declaration) => {
          addDuplicateDeclarationError(declaration, Diagnostics.Duplicate_identifier_0, symbolName(symbol), declarations);
        });
      }

      // Abstract methods can't have an implementation -- in particular, they don't need one.
      if (
        lastSeenNonAmbientDeclaration &&
        !lastSeenNonAmbientDeclaration.body &&
        !hasSyntacticModifier(lastSeenNonAmbientDeclaration, ModifierFlags.Abstract) &&
        !lastSeenNonAmbientDeclaration.questionToken
      ) {
        reportImplementationExpectedError(lastSeenNonAmbientDeclaration);
      }

      if (hasOverloads) {
        checkFlagAgreementBetweenOverloads(declarations, bodyDeclaration, flagsToCheck, someNodeFlags, allNodeFlags);
        checkQuestionTokenAgreementBetweenOverloads(declarations, bodyDeclaration, someHaveQuestionToken, allHaveQuestionToken);

        if (bodyDeclaration) {
          const signatures = getSignaturesOfSymbol(symbol);
          const bodySignature = getSignatureFromDeclaration(bodyDeclaration);
          for (const signature of signatures) {
            if (!isImplementationCompatibleWithOverload(bodySignature, signature)) {
              addRelatedInfo(
                error(signature.declaration, Diagnostics.This_overload_signature_is_not_compatible_with_its_implementation_signature),
                createDiagnosticForNode(bodyDeclaration, Diagnostics.The_implementation_signature_is_declared_here)
              );
              break;
            }
          }
        }
      }
    }
    checkTypeParameterListsIdentical(s: Symbol) {
      if (symbol.declarations.length === 1) {
        return;
      }

      const links = getSymbolLinks(symbol);
      if (!links.typeParametersChecked) {
        links.typeParametersChecked = true;
        const declarations = getClassOrInterfaceDeclarationsOfSymbol(symbol);
        if (declarations.length <= 1) {
          return;
        }

        const type = <InterfaceType>getDeclaredTypeOfSymbol(symbol);
        if (!areTypeParametersIdentical(declarations, type.localTypeParameters!)) {
          // Report an error on every conflicting declaration.
          const name = symbolToString(symbol);
          for (const declaration of declarations) {
            error(declaration.name, Diagnostics.All_declarations_of_0_must_have_identical_type_parameters, name);
          }
        }
      }
    }
    getTargetSymbol(s: Symbol) {
      return getCheckFlags(s) & CheckFlags.Instantiated ? (<TransientSymbol>s).target! : s;
    }
    getClassOrInterfaceDeclarationsOfSymbol(s: Symbol) {
      return filter(symbol.declarations, (d: Declaration): d is ClassDeclaration | InterfaceDeclaration => d.kind === Syntax.ClassDeclaration || d.kind === Syntax.InterfaceDeclaration);
    }
    getFirstNonAmbientClassOrFunctionDeclaration(s: Symbol): Declaration | undefined {
      const declarations = symbol.declarations;
      for (const declaration of declarations) {
        if (
          (declaration.kind === Syntax.ClassDeclaration || (declaration.kind === Syntax.FunctionDeclaration && Node.is.present((<FunctionLikeDeclaration>declaration).body))) &&
          !(declaration.flags & NodeFlags.Ambient)
        ) {
          return declaration;
        }
      }
      return;
    }
    getRootSymbols(s: Symbol): readonly Symbol[] {
      const roots = getImmediateRootSymbols(symbol);
      return roots ? flatMap(roots, getRootSymbols) : [symbol];
    }
    getImmediateRootSymbols(s: Symbol): readonly Symbol[] | undefined {
      if (getCheckFlags(symbol) & CheckFlags.Synthetic) {
        return mapDefined(getSymbolLinks(symbol).containingType!.types, (type) => getPropertyOfType(type, symbol.escName));
      } else if (symbol.flags & SymbolFlags.Transient) {
        const { leftSpread, rightSpread, syntheticOrigin } = symbol as TransientSymbol;
        return leftSpread ? [leftSpread, rightSpread!] : syntheticOrigin ? [syntheticOrigin] : singleElementArray(tryGetAliasTarget(symbol));
      }
      return;
    }
    tryGetAliasTarget(s: Symbol): Symbol | undefined {
      let target: Symbol | undefined;
      let next: Symbol | undefined = symbol;
      while ((next = getSymbolLinks(next).target)) {
        target = next;
      }
      return target;
    }
    isSymbolOfDestructuredElementOfCatchBinding(s: Symbol) {
      return Node.is.kind(BindingElement, symbol.valueDeclaration) && walkUpBindingElementsAndPatterns(symbol.valueDeclaration).parent.kind === Syntax.CatchClause;
    }
    isSymbolOfDeclarationWithCollidingName(s: Symbol): boolean {
      if (symbol.flags & SymbolFlags.BlockScoped && !Node.is.kind(SourceFile, symbol.valueDeclaration)) {
        const links = getSymbolLinks(symbol);
        if (links.isDeclarationWithCollidingName === undefined) {
          const container = Node.get.enclosingBlockScopeContainer(symbol.valueDeclaration);
          if (Node.is.statementWithLocals(container) || isSymbolOfDestructuredElementOfCatchBinding(symbol)) {
            const nodeLinks = getNodeLinks(symbol.valueDeclaration);
            if (resolveName(container.parent, symbol.escName, SymbolFlags.Value, /*nameNotFoundMessage*/ undefined, /*nameArg*/ undefined, /*isUse*/ false)) {
              // redeclaration - always should be renamed
              links.isDeclarationWithCollidingName = true;
            } else if (nodeLinks.flags & NodeCheckFlags.CapturedBlockScopedBinding) {
              // binding is captured in the function
              // should be renamed if:
              // - binding is not top level - top level bindings never collide with anything
              // AND
              //   - binding is not declared in loop, should be renamed to avoid name reuse across siblings
              //     let a, b
              //     { let x = 1; a = () => x; }
              //     { let x = 100; b = () => x; }
              //     console.log(a()); // should print '1'
              //     console.log(b()); // should print '100'
              //     OR
              //   - binding is declared inside loop but not in inside initializer of iteration statement or directly inside loop body
              //     * variables from initializer are passed to rewritten loop body as parameters so they are not captured directly
              //     * variables that are declared immediately in loop body will become top level variable after loop is rewritten and thus
              //       they will not collide with anything
              const isDeclaredInLoop = nodeLinks.flags & NodeCheckFlags.BlockScopedBindingInLoop;
              const inLoopInitializer = Node.is.iterationStatement(container, /*lookInLabeledStatements*/ false);
              const inLoopBodyBlock = container.kind === Syntax.Block && Node.is.iterationStatement(container.parent, /*lookInLabeledStatements*/ false);

              links.isDeclarationWithCollidingName = !Node.is.blockScopedContainerTopLevel(container) && (!isDeclaredInLoop || (!inLoopInitializer && !inLoopBodyBlock));
            } else {
              links.isDeclarationWithCollidingName = false;
            }
          }
        }
        return links.isDeclarationWithCollidingName!;
      }
      return false;
    }
    isAliasResolvedToValue(s: Symbol): boolean {
      const target = resolveAlias(symbol);
      if (target === unknownSymbol) {
        return true;
      }
      // const enums and modules that contain only const enums are not considered values from the emit perspective
      // unless 'preserveConstEnums' option is set to true
      return !!(target.flags & SymbolFlags.Value) && (compilerOptions.preserveConstEnums || !isConstEnumOrConstEnumOnlyModule(target));
    }
    isConstEnumOrConstEnumOnlyModule(s: Symbol): boolean {
      return isConstEnumSymbol(s) || !!s.constEnumOnlyModule;
    }
    getTypeReferenceDirectivesForSymbol(s: Symbol, meaning?: SymbolFlags): string[] | undefined {
      // program does not have any files with type reference directives - bail out
      if (!fileToDirective) {
        return;
      }
      if (!isSymbolFromTypeDeclarationFile(symbol)) {
        return;
      }
      // check what declarations in the symbol can contribute to the target meaning
      let typeReferenceDirectives: string[] | undefined;
      for (const decl of symbol.declarations) {
        // check meaning of the local symbol to see if declaration needs to be analyzed further
        if (decl.symbol && decl.symbol.flags & meaning!) {
          const file = Node.get.sourceFileOf(decl);
          const typeReferenceDirective = fileToDirective.get(file.path);
          if (typeReferenceDirective) {
            (typeReferenceDirectives || (typeReferenceDirectives = [])).push(typeReferenceDirective);
          } else {
            // found at least one entry that does not originate from type reference directive
            return;
          }
        }
      }
      return typeReferenceDirectives;
    }
    isSymbolFromTypeDeclarationFile(s: Symbol): boolean {
      // bail out if symbol does not have associated declarations (i.e. this is transient symbol created for property in binding pattern)
      if (!symbol.declarations) {
        return false;
      }

      // walk the parent chain for symbols to make sure that top level parent symbol is in the global scope
      // external modules cannot define or contribute to type declaration files
      let current = symbol;
      while (true) {
        const parent = getParentOfSymbol(current);
        if (parent) {
          current = parent;
        } else {
          break;
        }
      }

      if (current.valueDeclaration && current.valueDeclaration.kind === Syntax.SourceFile && current.flags & SymbolFlags.ValueModule) {
        return false;
      }

      // check that at least one declaration of top level symbol originates from type declaration file
      for (const decl of symbol.declarations) {
        const file = Node.get.sourceFileOf(decl);
        if (fileToDirective.has(file.path)) {
          return true;
        }
      }
      return false;
    }
    checkSymbolUsageInExpressionContext(s: Symbol, name: __String, useSite: Node) {
      if (!isValidTypeOnlyAliasUseSite(useSite)) {
        const typeOnlyDeclaration = getTypeOnlyAliasDeclaration(symbol);
        if (typeOnlyDeclaration) {
          const isExport = typeOnlyDeclarationIsExport(typeOnlyDeclaration);
          const message = isExport
            ? Diagnostics._0_cannot_be_used_as_a_value_because_it_was_exported_using_export_type
            : Diagnostics._0_cannot_be_used_as_a_value_because_it_was_imported_using_import_type;
          const relatedMessage = isExport ? Diagnostics._0_was_exported_here : Diagnostics._0_was_imported_here;
          const unescName = syntax.get.unescUnderscores(name);
          addRelatedInfo(error(useSite, message, unescName), createDiagnosticForNode(typeOnlyDeclaration, relatedMessage, unescName));
        }
      }
    }
    isTypeParameterSymbolDeclaredInContainer(s: Symbol, container: Node) {
      for (const decl of symbol.declarations) {
        if (decl.kind === Syntax.TypeParameter) {
          const parent = Node.is.kind(JSDocTemplateTag, decl.parent) ? Node.getJSDoc.host(decl.parent) : decl.parent;
          if (parent === container) {
            return !(Node.is.kind(JSDocTemplateTag, decl.parent) && find((decl.parent.parent as JSDoc).tags!, isJSDocTypeAlias)); // TODO: GH#18217
          }
        }
      }
      return false;
    }
    getExportOfModule(s: Symbol, specifier: ImportOrExportSpecifier, dontResolveAlias: boolean): Symbol | undefined {
      if (symbol.flags & SymbolFlags.Module) {
        const name = (specifier.propertyName ?? specifier.name).escapedText;
        const exportSymbol = getExportsOfSymbol(symbol).get(name);
        const resolved = resolveSymbol(exportSymbol, dontResolveAlias);
        markSymbolOfAliasDeclarationIfTypeOnly(specifier, exportSymbol, resolved, /*overwriteEmpty*/ false);
        return resolved;
      }
      return;
    }
    getPropertyOfVariable(s: Symbol, name: __String): Symbol | undefined {
      if (symbol.flags & SymbolFlags.Variable) {
        const typeAnnotation = (<VariableDeclaration>symbol.valueDeclaration).type;
        if (typeAnnotation) {
          return resolveSymbol(getPropertyOfType(getTypeFromTypeNode(typeAnnotation), name));
        }
      }
      return;
    }
    getFullyQualifiedName(s: Symbol, containingLocation?: Node): string {
      return symbol.parent
        ? getFullyQualifiedName(symbol.parent, containingLocation) + '.' + symbolToString(symbol)
        : symbolToString(symbol, containingLocation, /*meaning*/ undefined, SymbolFormatFlags.DoNotIncludeSymbolChain | SymbolFormatFlags.AllowAnyNodeKind);
    }
    getAliasForSymbolInContainer(container: Symbol, s: Symbol) {
      if (container === getParentOfSymbol(symbol)) {
        // fast path, `symbol` is either already the alias or isn't aliased
        return symbol;
      }
      // Check if container is a thing with an `export=` which points directly at `symbol`, and if so, return
      // the container itself as the alias for the symbol
      const exportEquals = container.exports && container.exports.get(InternalSymbolName.ExportEquals);
      if (exportEquals && getSymbolIfSameReference(exportEquals, symbol)) {
        return container;
      }
      const exports = getExportsOfSymbol(container);
      const quick = exports.get(symbol.escName);
      if (quick && getSymbolIfSameReference(quick, symbol)) {
        return quick;
      }
      return qu.forEachEntry(exports, (exported) => {
        if (getSymbolIfSameReference(exported, symbol)) {
          return exported;
        }
      });
    }
    hasVisibleDeclarations(s: Symbol, shouldComputeAliasToMakeVisible: boolean): SymbolVisibilityResult | undefined {
      let aliasesToMakeVisible: LateVisibilityPaintedStatement[] | undefined;
      if (
        !every(
          filter(symbol.declarations, (d) => d.kind !== Syntax.Identifier),
          getIsDeclarationVisible
        )
      ) {
        return;
      }
      return { accessibility: SymbolAccessibility.Accessible, aliasesToMakeVisible };

      function getIsDeclarationVisible(declaration: Declaration) {
        if (!isDeclarationVisible(declaration)) {
          // Mark the unexported alias as visible if its parent is visible
          // because these kind of aliases can be used to name types in declaration file

          const anyImportSyntax = getAnyImportSyntax(declaration);
          if (
            anyImportSyntax &&
            !hasSyntacticModifier(anyImportSyntax, ModifierFlags.Export) && // import clause without export
            isDeclarationVisible(anyImportSyntax.parent)
          ) {
            return addVisibleAlias(declaration, anyImportSyntax);
          } else if (
            Node.is.kind(VariableDeclaration, declaration) &&
            Node.is.kind(VariableStatement, declaration.parent.parent) &&
            !hasSyntacticModifier(declaration.parent.parent, ModifierFlags.Export) && // unexported variable statement
            isDeclarationVisible(declaration.parent.parent.parent)
          ) {
            return addVisibleAlias(declaration, declaration.parent.parent);
          } else if (
            Node.is.lateVisibilityPaintedStatement(declaration) && // unexported top-level statement
            !hasSyntacticModifier(declaration, ModifierFlags.Export) &&
            isDeclarationVisible(declaration.parent)
          ) {
            return addVisibleAlias(declaration, declaration);
          }

          // Declaration is not visible
          return false;
        }

        return true;
      }

      function addVisibleAlias(declaration: Declaration, aliasingStatement: LateVisibilityPaintedStatement) {
        // In function "buildTypeDisplay" where we decide whether to write type-alias or serialize types,
        // we want to just check if type- alias is accessible or not but we don't care about emitting those alias at that time
        // since we will do the emitting later in trackSymbol.
        if (shouldComputeAliasToMakeVisible) {
          getNodeLinks(declaration).isVisible = true;
          aliasesToMakeVisible = appendIfUnique(aliasesToMakeVisible, aliasingStatement);
        }
        return true;
      }
    }
    symbolToString(s: Symbol, enclosingDeclaration?: Node, meaning?: SymbolFlags, flags: SymbolFormatFlags = SymbolFormatFlags.AllowAnyNodeKind, writer?: EmitTextWriter): string {
      let nodeFlags = NodeBuilderFlags.IgnoreErrors;
      if (flags & SymbolFormatFlags.UseOnlyExternalAliasing) {
        nodeFlags |= NodeBuilderFlags.UseOnlyExternalAliasing;
      }
      if (flags & SymbolFormatFlags.WriteTypeParametersOrArguments) {
        nodeFlags |= NodeBuilderFlags.WriteTypeParametersInQualifiedName;
      }
      if (flags & SymbolFormatFlags.UseAliasDefinedOutsideCurrentScope) {
        nodeFlags |= NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope;
      }
      if (flags & SymbolFormatFlags.DoNotIncludeSymbolChain) {
        nodeFlags |= NodeBuilderFlags.DoNotIncludeSymbolChain;
      }
      const builder = flags & SymbolFormatFlags.AllowAnyNodeKind ? nodeBuilder.symbolToExpression : nodeBuilder.symbolToEntityName;
      return writer ? symbolToStringWorker(writer).getText() : usingSingleLineStringWriter(symbolToStringWorker);

      function symbolToStringWorker(writer: EmitTextWriter) {
        const entity = builder(symbol, meaning!, enclosingDeclaration, nodeFlags)!; // TODO: GH#18217
        const printer = createPrinter({ removeComments: true });
        const sourceFile = enclosingDeclaration && Node.get.sourceFileOf(enclosingDeclaration);
        printer.writeNode(EmitHint.Unspecified, entity, /*sourceFile*/ sourceFile, writer);
        return writer;
      }
    }
    getDeclarationWithTypeAnnotation(s: Symbol, enclosingDeclaration: Node | undefined) {
      return symbol.declarations && find(symbol.declarations, (s) => !!getEffectiveTypeAnnotationNode(s) && (!enclosingDeclaration || !!Node.findAncestor(s, (n) => n === enclosingDeclaration)));
    }
    getNameOfSymbolFromNameType(s: Symbol, context?: NodeBuilderContext) {
      const nameType = getSymbolLinks(symbol).nameType;
      if (nameType) {
        if (nameType.flags & TypeFlags.StringOrNumberLiteral) {
          const name = '' + (<StringLiteralType | NumberLiteralType>nameType).value;
          if (!syntax.is.identifierText(name) && !NumericLiteral.name(name)) {
            return `"${escapeString(name, Codes.doubleQuote)}"`;
          }
          if (NumericLiteral.name(name) && startsWith(name, '-')) {
            return `[${name}]`;
          }
          return name;
        }
        if (nameType.flags & TypeFlags.UniqueESSymbol) {
          return `[${getNameOfSymbolAsWritten((<UniqueESSymbolType>nameType).symbol, context)}]`;
        }
      }
    }
    getNameOfSymbolAsWritten(s: Symbol, context?: NodeBuilderContext): string {
      if (
        context &&
        symbol.escName === InternalSymbolName.Default &&
        !(context.flags & NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope) &&
        // If it's not the first part of an entity name, it must print as `default`
        (!(context.flags & NodeBuilderFlags.InInitialEntityName) ||
          // if the symbol is synthesized, it will only be referenced externally it must print as `default`
          !symbol.declarations ||
          // if not in the same binding context (source file, module declaration), it must print as `default`
          (context.enclosingDeclaration && Node.findAncestor(symbol.declarations[0], isDefaultBindingContext) !== Node.findAncestor(context.enclosingDeclaration, isDefaultBindingContext)))
      ) {
        return 'default';
      }
      if (symbol.declarations && symbol.declarations.length) {
        let declaration = firstDefined(symbol.declarations, (d) => (getNameOfDeclaration(d) ? d : undefined)); // Try using a declaration with a name, first
        const name = declaration && getNameOfDeclaration(declaration);
        if (declaration && name) {
          if (Node.is.kind(CallExpression, declaration) && isBindableObjectDefinePropertyCall(declaration)) {
            return symbolName(symbol);
          }
          if (Node.is.kind(ComputedPropertyName, name) && !(getCheckFlags(symbol) & CheckFlags.Late)) {
            const nameType = getSymbolLinks(symbol).nameType;
            if (nameType && nameType.flags & TypeFlags.StringOrNumberLiteral) {
              // Computed property name isn't late bound, but has a well-known name type - use name type to generate a symbol name
              const result = getNameOfSymbolFromNameType(symbol, context);
              if (result !== undefined) {
                return result;
              }
            }
          }
          return declarationNameToString(name);
        }
        if (!declaration) {
          declaration = symbol.declarations[0]; // Declaration may be nameless, but we'll try anyway
        }
        if (declaration.parent && declaration.parent.kind === Syntax.VariableDeclaration) {
          return declarationNameToString((<VariableDeclaration>declaration.parent).name);
        }
        switch (declaration.kind) {
          case Syntax.ClassExpression:
          case Syntax.FunctionExpression:
          case Syntax.ArrowFunction:
            if (context && !context.encounteredError && !(context.flags & NodeBuilderFlags.AllowAnonymousIdentifier)) {
              context.encounteredError = true;
            }
            return declaration.kind === Syntax.ClassExpression ? '(Anonymous class)' : '(Anonymous function)';
        }
      }
      const name = getNameOfSymbolFromNameType(symbol, context);
      return name !== undefined ? name : symbolName(symbol);
    }
  };
}
