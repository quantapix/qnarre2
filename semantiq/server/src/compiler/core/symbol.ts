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

  interface SymbolDisplayPart {}
  interface JSDocTagInfo {}

  export abstract class Symbol {
    id?: number;
    mergeId?: number;
    parent?: Symbol;
    declarations?: Declaration[];
    valueDeclaration?: Declaration;
    members?: SymbolTable;
    exports?: SymbolTable;
    exportSymbol?: Symbol;
    globalExports?: SymbolTable;
    isAssigned?: boolean;
    assignmentDeclarationMembers?: QMap<Declaration>;
    isReferenced?: SymbolFlags;
    isReplaceableByMethod?: boolean;
    constEnumOnlyModule?: boolean;
    docComment?: SymbolDisplayPart[];
    getComment?: SymbolDisplayPart[];
    setComment?: SymbolDisplayPart[];
    tags?: JSDocTagInfo[];

    constructor(public flags: SymbolFlags, public escName: __String) {}

    get name() {
      const d = this.valueDeclaration;
      if (d?.isPrivateIdentifierPropertyDeclaration()) return idText(d.name);
      return syntax.get.unescUnderscores(this.escName);
    }
    getId() {
      return this.id!;
    }
    getName() {
      return this.name;
    }
    getEscName() {
      return this.escName;
    }
    getFlags() {
      return this.flags;
    }
    getDeclarations() {
      return this.declarations;
    }
    getDocComment(checker?: TypeChecker): SymbolDisplayPart[] {
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
    getCtxComment(context?: Node, checker?: TypeChecker): SymbolDisplayPart[] {
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
    getPropertyNameForUniqueESSymbol(): __String {
      return `__@${this.getId()}@${this.escName}` as __String;
    }
    getSymbolNameForPrivateIdentifier(description: __String): __String {
      return `__#${this.getId()}@${description}` as __String;
    }
    isKnownSymbol() {
      return startsWith(this.escName as string, '__@');
    }
    getLocalSymbolForExportDefault() {
      return this.isExportDefaultSymbol() ? this.declarations![0].localSymbol : undefined;
    }
    isExportDefaultSymbol() {
      return length(this.declarations) > 0 && hasSyntacticModifier(this.declarations![0], ModifierFlags.Default);
    }
    getDeclarationOfKind<T extends Declaration>(k: T['kind']): T | undefined {
      const ds = this.declarations;
      if (ds) {
        for (const d of ds) {
          if (d.kind === k) return d as T;
        }
      }
      return;
    }
    isTransientSymbol(): this is TransientSymbol {
      return (this.flags & SymbolFlags.Transient) !== 0;
    }
    getNonAugmentationDeclaration() {
      return find(this.declarations!, (d) => !Node.is.externalModuleAugmentation(d) && !(Node.is.kind(ModuleDeclaration, d) && isGlobalScopeAugmentation(d)));
    }
    setValueDeclaration(d: Declaration) {
      const v = this.valueDeclaration;
      if (
        !v ||
        (!(d.flags & NodeFlags.Ambient && !(v.flags & NodeFlags.Ambient)) && isAssignmentDeclaration(v) && !isAssignmentDeclaration(d)) ||
        (v.kind !== d.kind && Node.is.effectiveModuleDeclaration(v))
      ) {
        this.valueDeclaration = d;
      }
    }
    isFunctionSymbol() {
      if (!this.valueDeclaration) return false;
      const v = this.valueDeclaration;
      return v.kind === Syntax.FunctionDeclaration || (Node.is.kind(VariableDeclaration, v) && v.initializer && Node.is.functionLike(v.initializer));
    }
    getCheckFlags(): CheckFlags {
      return this.isTransientSymbol() ? this.checkFlags : 0;
    }
    getDeclarationModifierFlagsFromSymbol(): ModifierFlags {
      if (this.valueDeclaration) {
        const f = getCombinedModifierFlags(this.valueDeclaration);
        return this.parent && this.parent.flags & SymbolFlags.Class ? f : f & ~ModifierFlags.AccessibilityModifier;
      }
      if (this.isTransientSymbol() && this.getCheckFlags() & CheckFlags.Synthetic) {
        const f = this.checkFlags;
        const a = f & CheckFlags.ContainsPrivate ? ModifierFlags.Private : f & CheckFlags.ContainsPublic ? ModifierFlags.Public : ModifierFlags.Protected;
        const s = f & CheckFlags.ContainsStatic ? ModifierFlags.Static : 0;
        return a | s;
      }
      if (this.flags & SymbolFlags.Prototype) return ModifierFlags.Public | ModifierFlags.Static;
      return 0;
    }
    skipAlias(c: TypeChecker) {
      return this.flags & SymbolFlags.Alias ? c.getAliasedSymbol(this) : this;
    }
    getCombinedLocalAndExportSymbolFlags(): SymbolFlags {
      return this.exportSymbol ? this.exportSymbol.flags | this.flags : this.flags;
    }
    isAbstractConstructorSymbol() {
      if (this.flags & SymbolFlags.Class) {
        const d = this.getClassLikeDeclarationOfSymbol();
        return !!d && hasSyntacticModifier(d, ModifierFlags.Abstract);
      }
      return false;
    }
    getClassLikeDeclarationOfSymbol(): ClassLikeDeclaration | undefined {
      return find(this.declarations!, isClassLike);
    }
    isUMDExportSymbol() {
      return this.declarations?.[0] && Node.is.kind(NamespaceExportDeclaration, this.declarations[0]);
    }
    isShorthandAmbientModuleSymbol() {
      return Node.is.shorthandAmbientModule(this.valueDeclaration);
    }
    abstract merge(t: Symbol, unidirectional?: boolean): Symbol;
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
      ss.forEach((s, i) => {
        const t = this.get(i);
        this.set(i, t ? s.merge(t, unidirectional) : s);
      });
    }
    combine(ss?: SymbolTable<S>): SymbolTable<S> | undefined {
      if (!hasEntries(this)) return ss;
      if (!hasEntries(ss)) return this;
      const t = new SymbolTable<S>();
      t.merge(this);
      t.merge(ss!);
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

  export function cloneMap(m: SymbolTable): SymbolTable;
  export function cloneMap<T>(m: QReadonlyMap<T>): QMap<T>;
  export function cloneMap<T>(m: ReadonlyUnderscoreEscapedMap<T>): UnderscoreEscapedMap<T>;
  export function cloneMap<T>(m: QReadonlyMap<T> | ReadonlyUnderscoreEscapedMap<T> | SymbolTable): QMap<T> | UnderscoreEscapedMap<T> | SymbolTable {
    const c = new QMap<T>();
    copyEntries(m as QMap<T>, c);
    return c;
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
      function visitSymbol(s?: Symbol): boolean {
        if (!s) return false;
        const i = s.getId();
        if (visitedSymbols[i]) return false;
        visitedSymbols[i] = s;
        if (!accept(s)) return true;
        const t = getTypeOfSymbol(s);
        visitType(t);
        if (s.exports) s.exports.forEach(visitSymbol);
        forEach(s.declarations, (d) => {
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
}
