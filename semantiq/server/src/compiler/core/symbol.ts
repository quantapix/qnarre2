namespace core {
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
}
