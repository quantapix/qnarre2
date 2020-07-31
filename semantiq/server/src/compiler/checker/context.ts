import * as qc from '../core';
import { Node, NodeBuilderFlags, ObjectFlags, TypeFlags } from '../type';
import * as qt from '../type';
import * as qu from '../util';
import { ModifierFlags, Syntax } from '../syntax';
import * as qy from '../syntax';
import { qf } from './index';
function existingTypeNodeIsNotReferenceOrIsReferenceWithCompatibleTypeArgumentCount(existing: Typing, type: Type) {
  return (
    !(getObjectFlags(type) & ObjectFlags.Reference) ||
    !qf.is.kind(qc.TypingReference, existing) ||
    length(existing.typeArguments) >= getMinTypeArgumentCount((type as TypeReference).target.typeParameters)
  );
}
export class QContext {
  enclosingDeclaration?: Node;
  flags: NodeBuilderFlags;
  tracker: SymbolTracker;
  encounteredError: boolean;
  visitedTypes?: qu.QMap<true>;
  symbolDepth?: qu.QMap<number>;
  inferTypeParameters?: TypeParameter[];
  approximateLength: number;
  truncating?: boolean;
  typeParameterSymbolList?: qu.QMap<true>;
  typeParameterNames?: qu.QMap<Identifier>;
  typeParameterNamesByText?: qu.QMap<true>;
  usedSymbolNames?: qu.QMap<true>;
  remappedSymbolNames?: qu.QMap<string>;
  checkTruncationLength(): boolean {
    if (this.truncating) return this.truncating;
    return (this.truncating = this.approximateLength > (this.flags & NodeBuilderFlags.NoTruncation ? noTruncationMaximumTruncationLength : defaultMaximumTruncationLength));
  }
  createElidedInformationPlaceholder() {
    this.approximateLength += 3;
    if (!(this.flags & NodeBuilderFlags.NoTruncation)) return new qc.TypingReference(new qc.Identifier('...'), undefined);
    return new qc.KeywordTyping(Syntax.AnyKeyword);
  }
  typeToTypeNodeHelper(type: Type): Typing {
    if (cancellationToken && cancellationToken.throwIfCancellationRequested) {
      cancellationToken.throwIfCancellationRequested();
    }
    const inTypeAlias = this.flags & NodeBuilderFlags.InTypeAlias;
    this.flags &= ~NodeBuilderFlags.InTypeAlias;
    if (!type) {
      if (!(this.flags & NodeBuilderFlags.AllowEmptyUnionOrIntersection)) {
        this.encounteredError = true;
        return undefined!;
      }
      this.approximateLength += 3;
      return new qc.KeywordTyping(Syntax.AnyKeyword);
    }
    if (!(this.flags & NodeBuilderFlags.NoTypeReduction)) {
      type = getReducedType(type);
    }
    if (type.flags & TypeFlags.Any) {
      this.approximateLength += 3;
      return new qc.KeywordTyping(Syntax.AnyKeyword);
    }
    if (type.flags & TypeFlags.Unknown) return new qc.KeywordTyping(Syntax.UnknownKeyword);
    if (type.flags & TypeFlags.String) {
      this.approximateLength += 6;
      return new qc.KeywordTyping(Syntax.StringKeyword);
    }
    if (type.flags & TypeFlags.Number) {
      this.approximateLength += 6;
      return new qc.KeywordTyping(Syntax.NumberKeyword);
    }
    if (type.flags & TypeFlags.BigInt) {
      this.approximateLength += 6;
      return new qc.KeywordTyping(Syntax.BigIntKeyword);
    }
    if (type.flags & TypeFlags.Boolean) {
      this.approximateLength += 7;
      return new qc.KeywordTyping(Syntax.BooleanKeyword);
    }
    if (type.flags & TypeFlags.EnumLiteral && !(type.flags & TypeFlags.Union)) {
      const parentSymbol = getParentOfSymbol(type.symbol)!;
      const parentName = this.symbolToTypeNode(parentSymbol, SymbolFlags.Type);
      const enumLiteralName =
        getDeclaredTypeOfSymbol(parentSymbol) === type ? parentName : appendReferenceToType(parentName as TypingReference | ImportTyping, new qc.TypingReference(type.symbol.name, undefined));
      return enumLiteralName;
    }
    if (type.flags & TypeFlags.EnumLike) return this.symbolToTypeNode(type.symbol, SymbolFlags.Type);
    if (type.flags & TypeFlags.StringLiteral) {
      this.approximateLength += (<StringLiteralType>type).value.length + 2;
      return new qc.LiteralTyping(setEmitFlags(qc.asLiteral((<StringLiteralType>type).value, !!(this.flags & NodeBuilderFlags.UseSingleQuotesForStringLiteralType)), EmitFlags.NoAsciiEscaping));
    }
    if (type.flags & TypeFlags.NumberLiteral) {
      const value = (<NumberLiteralType>type).value;
      this.approximateLength += ('' + value).length;
      return new qc.LiteralTyping(value < 0 ? new qs.PrefixUnaryExpression(Syntax.MinusToken, qc.asLiteral(-value)) : qc.asLiteral(value));
    }
    if (type.flags & TypeFlags.BigIntLiteral) {
      this.approximateLength += pseudoBigIntToString((<BigIntLiteralType>type).value).length + 1;
      return new qc.LiteralTyping(qc.asLiteral((<BigIntLiteralType>type).value));
    }
    if (type.flags & TypeFlags.BooleanLiteral) {
      this.approximateLength += (<IntrinsicType>type).intrinsicName.length;
      return (<IntrinsicType>type).intrinsicName === 'true' ? new qc.BooleanLiteral(true) : new qc.BooleanLiteral(false);
    }
    if (type.flags & TypeFlags.UniqueESSymbol) {
      if (!(this.flags & NodeBuilderFlags.AllowUniqueESSymbolType)) {
        if (isValueSymbolAccessible(type.symbol, this.enclosingDeclaration)) {
          this.approximateLength += 6;
          return this.symbolToTypeNode(type.symbol, SymbolFlags.Value);
        }
        if (this.tracker.reportInaccessibleUniqueSymbolError) {
          this.tracker.reportInaccessibleUniqueSymbolError();
        }
      }
      this.approximateLength += 13;
      return new qc.TypingOperator(Syntax.UniqueKeyword, new qc.KeywordTyping(Syntax.SymbolKeyword));
    }
    if (type.flags & TypeFlags.Void) {
      this.approximateLength += 4;
      return new qc.KeywordTyping(Syntax.VoidKeyword);
    }
    if (type.flags & TypeFlags.Undefined) {
      this.approximateLength += 9;
      return new qc.KeywordTyping(Syntax.UndefinedKeyword);
    }
    if (type.flags & TypeFlags.Null) {
      this.approximateLength += 4;
      return new qc.KeywordTyping(Syntax.NullKeyword);
    }
    if (type.flags & TypeFlags.Never) {
      this.approximateLength += 5;
      return new qc.KeywordTyping(Syntax.NeverKeyword);
    }
    if (type.flags & TypeFlags.ESSymbol) {
      this.approximateLength += 6;
      return new qc.KeywordTyping(Syntax.SymbolKeyword);
    }
    if (type.flags & TypeFlags.NonPrimitive) {
      this.approximateLength += 6;
      return new qc.KeywordTyping(Syntax.ObjectKeyword);
    }
    if (isThisTypeParameter(type)) {
      if (this.flags & NodeBuilderFlags.InObjectTypeLiteral) {
        if (!this.encounteredError && !(this.flags & NodeBuilderFlags.AllowThisInObjectLiteral)) {
          this.encounteredError = true;
        }
        if (this.tracker.reportInaccessibleThisError) {
          this.tracker.reportInaccessibleThisError();
        }
      }
      this.approximateLength += 4;
      return new qc.ThisExpression();
    }
    if (!inTypeAlias && type.aliasSymbol && (this.flags & NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope || isTypeSymbolAccessible(type.aliasSymbol, this.enclosingDeclaration))) {
      const typeArgumentNodes = this.mapToTypeNodes(type.aliasTypeArguments);
      if (qy.is.reservedName(type.aliasSymbol.escName) && !(type.aliasSymbol.flags & SymbolFlags.Class)) return new qc.TypingReference(new Identifier(''), typeArgumentNodes);
      return this.symbolToTypeNode(type.aliasSymbol, SymbolFlags.Type, typeArgumentNodes);
    }
    const objectFlags = getObjectFlags(type);
    if (objectFlags & ObjectFlags.Reference) {
      assert(!!(type.flags & TypeFlags.Object));
      return (<TypeReference>type).node ? this.visitAndTransformType(type, this.typeReferenceToTypeNode) : this.typeReferenceToTypeNode(<TypeReference>type);
    }
    if (type.flags & TypeFlags.TypeParameter || objectFlags & ObjectFlags.ClassOrInterface) {
      if (type.flags & TypeFlags.TypeParameter && contains(this.inferTypeParameters, type)) {
        this.approximateLength += type.symbol.name.length + 6;
        return new qc.InferTyping(this.typeParameterToDeclarationWithConstraint(type as TypeParameter, undefined));
      }
      if (this.flags & NodeBuilderFlags.GenerateNamesForShadowedTypeParams && type.flags & TypeFlags.TypeParameter && !isTypeSymbolAccessible(type.symbol, this.enclosingDeclaration)) {
        const name = this.typeParameterToName(type);
        this.approximateLength += idText(name).length;
        return new qc.TypingReference(new Identifier(idText(name)), undefined);
      }
      return type.symbol ? this.symbolToTypeNode(type.symbol, SymbolFlags.Type) : new qc.TypingReference(new Identifier('?'), undefined);
    }
    if (type.flags & (TypeFlags.Union | TypeFlags.Intersection)) {
      const types = type.flags & TypeFlags.Union ? formatUnionTypes((<UnionType>type).types) : (<IntersectionType>type).types;
      if (length(types) === 1) return this.typeToTypeNodeHelper(types[0]);
      const typeNodes = this.mapToTypeNodes(types, true);
      if (typeNodes && typeNodes.length > 0) {
        const unionOrIntersectionTyping = new qc.UnionOrIntersectionType(type.flags & TypeFlags.Union ? Syntax.UnionTyping : Syntax.IntersectionTyping, typeNodes);
        return unionOrIntersectionTyping;
      } else {
        if (!this.encounteredError && !(this.flags & NodeBuilderFlags.AllowEmptyUnionOrIntersection)) this.encounteredError = true;
        return undefined!;
      }
    }
    if (objectFlags & (ObjectFlags.Anonymous | ObjectFlags.Mapped)) {
      assert(!!(type.flags & TypeFlags.Object));
      return this.createAnonymousTypeNode(<ObjectType>type);
    }
    if (type.flags & TypeFlags.Index) {
      const indexedType = (<IndexType>type).type;
      this.approximateLength += 6;
      const indexTypeNode = this.typeToTypeNodeHelper(indexedType);
      return new qc.TypingOperator(indexTypeNode);
    }
    if (type.flags & TypeFlags.IndexedAccess) {
      const objectTypeNode = this.typeToTypeNodeHelper((<IndexedAccessType>type).objectType);
      const indexTypeNode = this.typeToTypeNodeHelper((<IndexedAccessType>type).indexType);
      this.approximateLength += 2;
      return new qc.IndexedAccessTyping(objectTypeNode, indexTypeNode);
    }
    if (type.flags & TypeFlags.Conditional) {
      const checkTypeNode = this.typeToTypeNodeHelper((<ConditionalType>type).checkType);
      const saveInferTypeParameters = this.inferTypeParameters;
      this.inferTypeParameters = (<ConditionalType>type).root.inferTypeParameters;
      const extendsTypeNode = this.typeToTypeNodeHelper((<ConditionalType>type).extendsType);
      this.inferTypeParameters = saveInferTypeParameters;
      const trueTypeNode = this.typeToTypeNodeHelper(getTrueTypeFromConditionalType(<ConditionalType>type));
      const falseTypeNode = this.typeToTypeNodeHelper(getFalseTypeFromConditionalType(<ConditionalType>type));
      this.approximateLength += 15;
      return new qc.ConditionalTyping(checkTypeNode, extendsTypeNode, trueTypeNode, falseTypeNode);
    }
    if (type.flags & TypeFlags.Substitution) return this.typeToTypeNodeHelper((<SubstitutionType>type).baseType);
    return fail('Should be unreachable.');
    function appendReferenceToType(root: TypingReference | ImportTyping, ref: TypingReference): TypingReference | ImportTyping {
      if (qf.is.kind(qc.ImportTyping, root)) {
        const innerParams = root.typeArguments;
        if (root.qualifier) {
          (qf.is.kind(qc.Identifier, root.qualifier) ? root.qualifier : root.qualifier.right).typeArguments = innerParams;
        }
        root.typeArguments = ref.typeArguments;
        const ids = getAccessStack(ref);
        for (const id of ids) {
          root.qualifier = root.qualifier ? new qc.QualifiedName(root.qualifier, id) : id;
        }
        return root;
      } else {
        const innerParams = root.typeArguments;
        (qf.is.kind(qc.Identifier, root.typeName) ? root.typeName : root.typeName.right).typeArguments = innerParams;
        root.typeArguments = ref.typeArguments;
        const ids = getAccessStack(ref);
        for (const id of ids) {
          root.typeName = new qc.QualifiedName(root.typeName, id);
        }
        return root;
      }
    }
    function getAccessStack(ref: TypingReference): Identifier[] {
      let state = ref.typeName;
      const ids = [];
      while (!qf.is.kind(qc.Identifier, state)) {
        ids.unshift(state.right);
        state = state.left;
      }
      ids.unshift(state);
      return ids;
    }
  }
  typeParametersToTypeParameterDeclarations(s: Symbol) {
    let typeParameterNodes: Nodes<TypeParameterDeclaration> | undefined;
    const targetSymbol = getTargetSymbol(symbol);
    if (targetSymbol.flags & (SymbolFlags.Class | SymbolFlags.Interface | SymbolFlags.TypeAlias)) {
      typeParameterNodes = new Nodes(map(this.getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(), (tp) => typeParameterToDeclaration(tp, this)));
    }
    return typeParameterNodes;
  }
  lookupTypeParameterNodes(chain: Symbol[], index: number) {
    assert(chain && 0 <= index && index < chain.length);
    const symbol = chain[index];
    const symbolId = '' + symbol.getId();
    if (this.typeParameterSymbolList && this.typeParameterSymbolList.get(symbolId)) return;
    (this.typeParameterSymbolList || (this.typeParameterSymbolList = new QMap())).set(symbolId, true);
    let typeParameterNodes: readonly Typing[] | readonly TypeParameterDeclaration[] | undefined;
    if (this.flags & NodeBuilderFlags.WriteTypeParametersInQualifiedName && index < chain.length - 1) {
      const parentSymbol = symbol;
      const nextSymbol = chain[index + 1];
      if (nextSymbol.getCheckFlags() & CheckFlags.Instantiated) {
        const params = getTypeParametersOfClassOrInterface(parentSymbol.flags & SymbolFlags.Alias ? parentSymbol.resolveAlias() : parentSymbol);
        typeParameterNodes = mapToTypeNodes(
          map(params, (t) => getMappedType(t, (nextSymbol as TransientSymbol).mapper!)),
          this
        );
      } else typeParameterNodes = symbol.typeParametersToTypeParameterDeclarations(this);
    }
    return typeParameterNodes;
  }
  getSpecifierForModuleSymbol(s: Symbol) {
    let file = getDeclarationOfKind<SourceFile>(s, Syntax.SourceFile);
    if (!file) {
      const equivalentFileSymbol = firstDefined(s.declarations, (d) => getFileSymbolIfFileSymbolExportEqualsContainer(d, s));
      if (equivalentFileSymbol) file = getDeclarationOfKind<SourceFile>(equivalentFileSymbol, Syntax.SourceFile);
    }
    if (file && file.moduleName !== undefined) return file.moduleName;
    if (!file) {
      if (this.tracker.trackReferencedAmbientModule) {
        const ds = filter(s.declarations, isAmbientModule);
        if (ds) {
          for (const d of ds) {
            this.tracker.trackReferencedAmbientModule(d, s);
          }
        }
      }
      if (ambientModuleSymbolRegex.test(s.escName as string)) return (s.escName as string).substring(1, (s.escName as string).length - 1);
    }
    if (!this.enclosingDeclaration || !this.tracker.moduleResolverHost) {
      if (ambientModuleSymbolRegex.test(s.escName as string)) return (s.escName as string).substring(1, (s.escName as string).length - 1);
      return getNonAugmentationDeclaration(s)!.sourceFile.fileName;
    }
    const contextFile = qf.get.originalOf(this.enclosingDeclaration).sourceFile;
    const ls = s.getLinks();
    let specifier = ls.specifierCache && ls.specifierCache.get(contextFile.path);
    if (!specifier) {
      const isBundle = compilerOptions.out || compilerOptions.outFile;
      const { moduleResolverHost } = this.tracker;
      const specifierCompilerOptions = isBundle ? { ...compilerOptions, baseUrl: moduleResolverHost.getCommonSourceDirectory() } : compilerOptions;
      specifier = first(
        moduleSpecifiers.getModuleSpecifiers(s, specifierCompilerOptions, contextFile, moduleResolverHost, {
          importModuleSpecifierPreference: isBundle ? 'non-relative' : 'relative',
        })
      );
      ls.specifierCache = ls.specifierCache || new QMap();
      ls.specifierCache.set(contextFile.path, specifier);
    }
    return specifier;
  }
  lookupSymbolChain(s: Symbol, meaning: SymbolFlags, yieldModuleSymbol?: boolean) {
    this.tracker.trackSymbol!(s, this.enclosingDeclaration, meaning);
    return this.lookupSymbolChainWorker(s, meaning, yieldModuleSymbol);
  }
  lookupSymbolChainWorker(s: Symbol, meaning: SymbolFlags, yieldModuleSymbol?: boolean) {
    let chain: Symbol[];
    const isTypeParameter = s.flags & SymbolFlags.TypeParameter;
    if (!isTypeParameter && (this.enclosingDeclaration || this.flags & NodeBuilderFlags.UseFullyQualifiedType) && !(this.flags & NodeBuilderFlags.DoNotIncludeSymbolChain)) {
      const getSymbolChain = (s: Symbol, meaning: SymbolFlags, endOfChain: boolean): Symbol[] | undefined => {
        let accessibleSymbolChain = getAccessibleSymbolChain(s, this.enclosingDeclaration, meaning, !!(this.flags & NodeBuilderFlags.UseOnlyExternalAliasing));
        let parentSpecifiers: (string | undefined)[];
        if (!accessibleSymbolChain || needsQualification(accessibleSymbolChain[0], this.enclosingDeclaration, accessibleSymbolChain.length === 1 ? meaning : getQualifiedLeftMeaning(meaning))) {
          const parents = getContainersOfSymbol(accessibleSymbolChain ? accessibleSymbolChain[0] : s, this.enclosingDeclaration);
          if (length(parents)) {
            parentSpecifiers = parents!.map((s) => (some(s.declarations, hasNonGlobalAugmentationExternalModuleSymbol) ? this.getSpecifierForModuleSymbol(s) : undefined));
            const indices = parents!.map((_, i) => i);
            indices.sort(sortByBestName);
            const sortedParents = indices.map((i) => parents![i]);
            for (const parent of sortedParents) {
              const parentChain = getSymbolChain(parent, getQualifiedLeftMeaning(meaning), false);
              if (parentChain) {
                if (parent.exports && parent.exports.get(InternalSymbol.ExportEquals) && getSymbolIfSameReference(parent.exports.get(InternalSymbol.ExportEquals)!, s)) {
                  accessibleSymbolChain = parentChain;
                  break;
                }
                accessibleSymbolChain = parentChain.concat(accessibleSymbolChain || [s.getAliasForSymbolInContainer(parent) || s]);
                break;
              }
            }
          }
        }
        if (accessibleSymbolChain) return accessibleSymbolChain;
        if (endOfChain || !(s.flags & (SymbolFlags.TypeLiteral | SymbolFlags.ObjectLiteral))) {
          if (!endOfChain && !yieldModuleSymbol && !!forEach(s.declarations, hasNonGlobalAugmentationExternalModuleSymbol)) return;
          return [s];
        }
        function sortByBestName(a: number, b: number) {
          const specifierA = parentSpecifiers[a];
          const specifierB = parentSpecifiers[b];
          if (specifierA && specifierB) {
            const isBRelative = pathIsRelative(specifierB);
            if (pathIsRelative(specifierA) === isBRelative) return moduleSpecifiers.countPathComponents(specifierA) - moduleSpecifiers.countPathComponents(specifierB);
            if (isBRelative) return -1;
            return 1;
          }
          return 0;
        }
      };
      chain = Debug.checkDefined(getSymbolChain(s, meaning, true));
      assert(chain && chain.length > 0);
    } else chain = [s];
    return chain;
  }
  symbolToTypeNode(s: Symbol, meaning: SymbolFlags, overrideTypeArguments?: readonly Typing[]): Typing {
    const chain = this.lookupSymbolChain(s, meaning, !(this.flags & NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope));
    const isTypeOf = meaning === SymbolFlags.Value;
    const createAccessFromSymbolChain = (chain: Symbol[], index: number, stopper: number): EntityName | IndexedAccessTyping => {
      const typeParameterNodes = index === chain.length - 1 ? overrideTypeArguments : this.lookupTypeParameterNodes(chain, index);
      const symbol = chain[index];
      const parent = chain[index - 1];
      let symbolName: string | undefined;
      if (index === 0) {
        this.flags |= NodeBuilderFlags.InInitialEntityName;
        symbolName = symbol.getNameOfSymbolAsWritten(this);
        this.approximateLength += (symbolName ? symbolName.length : 0) + 1;
        this.flags ^= NodeBuilderFlags.InInitialEntityName;
      } else {
        if (parent && parent.getExportsOfSymbol()) {
          const exports = parent.getExportsOfSymbol();
          forEachEntry(exports, (ex, name) => {
            if (getSymbolIfSameReference(ex, symbol) && !isLateBoundName(name) && name !== InternalSymbol.ExportEquals) {
              symbolName = qy.get.unescUnderscores(name);
              return true;
            }
          });
        }
      }
      if (!symbolName) symbolName = symbol.getNameOfSymbolAsWritten(this);
      this.approximateLength += symbolName.length + 1;
      if (
        !(this.flags & NodeBuilderFlags.ForbidIndexedAccessSymbolReferences) &&
        parent &&
        getMembersOfSymbol(parent) &&
        getMembersOfSymbol(parent).get(symbol.escName) &&
        getSymbolIfSameReference(getMembersOfSymbol(parent).get(symbol.escName)!, symbol)
      ) {
        const LHS = createAccessFromSymbolChain(chain, index - 1, stopper);
        if (qf.is.kind(qc.IndexedAccessTyping, LHS)) return new qc.IndexedAccessTyping(LHS, new qc.LiteralTyping(qc.asLiteral(symbolName)));
        return new qc.IndexedAccessTyping(new qc.TypingReference(LHS, typeParameterNodes as readonly Typing[]), new qc.LiteralTyping(qc.asLiteral(symbolName)));
      }
      const identifier = setEmitFlags(new Identifier(symbolName, typeParameterNodes), EmitFlags.NoAsciiEscaping);
      identifier.symbol = symbol;
      if (index > stopper) {
        const LHS = createAccessFromSymbolChain(chain, index - 1, stopper);
        if (!qf.is.entityName(LHS)) return fail('Impossible construct - an export of an indexed access cannot be reachable');
        return new qc.QualifiedName(LHS, identifier);
      }
      return identifier;
    };
    if (some(chain[0].declarations, hasNonGlobalAugmentationExternalModuleSymbol)) {
      const nonRootParts = chain.length > 1 ? createAccessFromSymbolChain(chain, chain.length - 1, 1) : undefined;
      const typeParameterNodes = overrideTypeArguments || this.lookupTypeParameterNodes(chain, 0);
      const specifier = this.getSpecifierForModuleSymbol(chain[0]);
      if (!(this.flags & NodeBuilderFlags.AllowNodeModulesRelativePaths) && getEmitModuleResolutionKind(compilerOptions) === ModuleResolutionKind.NodeJs && specifier.indexOf('/node_modules/') >= 0) {
        this.encounteredError = true;
        if (this.tracker.reportLikelyUnsafeImportRequiredError) {
          this.tracker.reportLikelyUnsafeImportRequiredError(specifier);
        }
      }
      const lit = new qc.LiteralTyping(qc.asLiteral(specifier));
      if (this.tracker.trackExternalModuleSymbolOfImportTyping) this.tracker.trackExternalModuleSymbolOfImportTyping(chain[0]);
      this.approximateLength += specifier.length + 10;
      if (!nonRootParts || qf.is.entityName(nonRootParts)) {
        if (nonRootParts) {
          const lastId = qf.is.kind(qc.Identifier, nonRootParts) ? nonRootParts : nonRootParts.right;
          lastId.typeArguments = undefined;
        }
        return new qc.ImportTyping(lit, nonRootParts as EntityName, typeParameterNodes as readonly Typing[], isTypeOf);
      } else {
        const splitNode = getTopmostIndexedAccessType(nonRootParts);
        const qualifier = (splitNode.objectType as TypingReference).typeName;
        return qc.IndexedAccessTyping(new qc.ImportTyping(lit, qualifier, typeParameterNodes as readonly Typing[], isTypeOf), splitNode.indexType);
      }
    }
    const entityName = createAccessFromSymbolChain(chain, chain.length - 1, 0);
    if (qf.is.kind(qc.IndexedAccessTyping, entityName)) return entityName;
    if (isTypeOf) return new qc.TypingQuery(entityName);
    const lastId = qf.is.kind(qc.Identifier, entityName) ? entityName : entityName.right;
    const lastTypeArgs = lastId.typeArguments;
    lastId.typeArguments = undefined;
    return new qc.TypingReference(entityName, lastTypeArgs as Nodes<Typing>);
  }
  typeParameterShadowsNameInScope(escName: __String, type: TypeParameter) {
    const result = resolveName(this.enclosingDeclaration, escName, SymbolFlags.Type, undefined, escName, false);
    if (result) {
      if (result.flags & SymbolFlags.TypeParameter && result === type.symbol) return false;
      return true;
    }
    return false;
  }
  typeParameterToName(type: TypeParameter) {
    if (this.flags & NodeBuilderFlags.GenerateNamesForShadowedTypeParams && this.typeParameterNames) {
      const cached = this.typeParameterNames.get('' + getTypeId(type));
      if (cached) return cached;
    }
    let result = this.symbolToName(type.symbol, SymbolFlags.Type, true);
    if (!(result.kind & Syntax.Identifier)) return new Identifier('(Missing type parameter)');
    if (this.flags & NodeBuilderFlags.GenerateNamesForShadowedTypeParams) {
      const rawtext = result.escapedText as string;
      let i = 0;
      let text = rawtext;
      while ((this.typeParameterNamesByText && this.typeParameterNamesByText.get(text)) || this.typeParameterShadowsNameInScope(text as __String, type)) {
        i++;
        text = `${rawtext}_${i}`;
      }
      if (text !== rawtext) result = new Identifier(text, result.typeArguments);
      (this.typeParameterNames || (this.typeParameterNames = new QMap())).set('' + getTypeId(type), result);
      (this.typeParameterNamesByText || (this.typeParameterNamesByText = new QMap())).set(result.escapedText as string, true);
    }
    return result;
  }
  symbolToName(s: Symbol, meaning: SymbolFlags, expectsIdentifier: true): Identifier;
  symbolToName(s: Symbol, meaning: SymbolFlags, expectsIdentifier: false): EntityName;
  symbolToName(s: Symbol, meaning: SymbolFlags, expectsIdentifier: boolean): EntityName {
    const chain = this.lookupSymbolChain(s, meaning);
    if (expectsIdentifier && chain.length !== 1 && !this.encounteredError && !(this.flags & NodeBuilderFlags.AllowQualifedNameInPlaceOfIdentifier)) {
      this.encounteredError = true;
    }
    return createEntityNameFromSymbolChain(chain, chain.length - 1);
    function createEntityNameFromSymbolChain(chain: Symbol[], index: number): EntityName {
      const typeParameterNodes = this.lookupTypeParameterNodes(chain, index);
      const symbol = chain[index];
      if (index === 0) {
        this.flags |= NodeBuilderFlags.InInitialEntityName;
      }
      const symbolName = symbol.getNameOfSymbolAsWritten(this);
      if (index === 0) {
        this.flags ^= NodeBuilderFlags.InInitialEntityName;
      }
      const identifier = setEmitFlags(new Identifier(symbolName, typeParameterNodes), EmitFlags.NoAsciiEscaping);
      identifier.symbol = symbol;
      return index > 0 ? new qc.QualifiedName(createEntityNameFromSymbolChain(chain, index - 1), identifier) : identifier;
    }
  }
  symbolToExpression(s: Symbol, meaning: SymbolFlags) {
    const chain = this.lookupSymbolChain(s, meaning);
    return createExpressionFromSymbolChain(chain, chain.length - 1);
    function createExpressionFromSymbolChain(chain: Symbol[], index: number): Expression {
      const typeParameterNodes = this.lookupTypeParameterNodes(chain, index);
      const symbol = chain[index];
      if (index === 0) {
        this.flags |= NodeBuilderFlags.InInitialEntityName;
      }
      let symbolName = symbol.getNameOfSymbolAsWritten(this);
      if (index === 0) {
        this.flags ^= NodeBuilderFlags.InInitialEntityName;
      }
      let firstChar = symbolName.charCodeAt(0);
      if (qy.is.singleOrDoubleQuote(firstChar) && some(symbol.declarations, hasNonGlobalAugmentationExternalModuleSymbol)) return qc.asLiteral(this.getSpecifierForModuleSymbol(symbol));
      const canUsePropertyAccess = firstChar === Codes.hash ? symbolName.length > 1 && qy.is.identifierStart(symbolName.charCodeAt(1)) : qy.is.identifierStart(firstChar);
      if (index === 0 || canUsePropertyAccess) {
        const identifier = setEmitFlags(new Identifier(symbolName, typeParameterNodes), EmitFlags.NoAsciiEscaping);
        identifier.symbol = symbol;
        return index > 0 ? new qc.PropertyAccessExpression(createExpressionFromSymbolChain(chain, index - 1), identifier) : identifier;
      } else {
        if (firstChar === Codes.openBracket) {
          symbolName = symbolName.substring(1, symbolName.length - 1);
          firstChar = symbolName.charCodeAt(0);
        }
        let expression: Expression | undefined;
        if (qy.is.singleOrDoubleQuote(firstChar)) {
          expression = qc.asLiteral(symbolName.substring(1, symbolName.length - 1).replace(/\\./g, (s) => s.substring(1)));
          (expression as StringLiteral).singleQuote = firstChar === Codes.singleQuote;
        } else if ('' + +symbolName === symbolName) {
          expression = qc.asLiteral(+symbolName);
        }
        if (!expression) {
          expression = setEmitFlags(new Identifier(symbolName, typeParameterNodes), EmitFlags.NoAsciiEscaping);
          expression.symbol = symbol;
        }
        return new qs.ElemAccessExpression(createExpressionFromSymbolChain(chain, index - 1), expression);
      }
    }
  }
  getPropertyNameNodeForSymbol(s: Symbol) {
    const singleQuote = !!length(s.declarations) && every(s.declarations, isSingleQuotedStringNamed);
    const fromNameType = this.getPropertyNameNodeForSymbolFromNameType(s, singleQuote);
    if (fromNameType) return fromNameType;
    if (isKnownSymbol(s)) return new qc.ComputedPropertyName(new qc.PropertyAccessExpression(new Identifier('Symbol'), (s.escName as string).substr(3)));
    const rawName = qy.get.unescUnderscores(s.escName);
    return createPropertyNameNodeForIdentifierOrLiteral(rawName, singleQuote);
  }
  getPropertyNameNodeForSymbolFromNameType(s: Symbol, singleQuote?: boolean) {
    const nameType = s.getLinks(symbol).nameType;
    if (nameType) {
      if (nameType.flags & TypeFlags.StringOrNumberLiteral) {
        const name = '' + (<StringLiteralType | NumberLiteralType>nameType).value;
        if (!qy.is.identifierText(name) && !NumericLiteral.name(name)) return qc.asLiteral(name, !!singleQuote);
        if (NumericLiteral.name(name) && startsWith(name, '-')) return new qc.ComputedPropertyName(qc.asLiteral(+name));
        return createPropertyNameNodeForIdentifierOrLiteral(name);
      }
      if (nameType.flags & TypeFlags.UniqueESSymbol) return new qc.ComputedPropertyName(this.symbolToExpression((<UniqueESSymbolType>nameType).symbol, SymbolFlags.Value));
    }
  }
  addPropertyToElemList(propertySymbol: Symbol, typeElems: TypeElem[]) {
    const propertyIsReverseMapped = !!(getCheckFlags(propertySymbol) & CheckFlags.ReverseMapped);
    const propertyType = propertyIsReverseMapped && this.flags & NodeBuilderFlags.InReverseMappedType ? anyType : getTypeOfSymbol(propertySymbol);
    const saveEnclosingDeclaration = this.enclosingDeclaration;
    this.enclosingDeclaration = undefined;
    if (this.tracker.trackSymbol && getCheckFlags(propertySymbol) & CheckFlags.Late) {
      const decl = first(propertySymbol.declarations);
      if (hasLateBindableName(decl)) {
        if (qf.is.kind(qc.BinaryExpression, decl)) {
          const name = qf.get.declaration.nameOf(decl);
          if (name && qf.is.kind(qc.ElemAccessExpression, name) && qf.is.propertyAccessEntityNameExpression(name.argumentExpression)) {
            this.trackComputedName(name.argumentExpression, saveEnclosingDeclaration);
          }
        } else {
          trackComputedName(decl.name.expression, saveEnclosingDeclaration, this);
        }
      }
    }
    this.enclosingDeclaration = saveEnclosingDeclaration;
    const propertyName = this.getPropertyNameNodeForSymbol(propertySymbol);
    this.approximateLength += propertySymbol.name.length + 1;
    const optionalToken = propertySymbol.flags & SymbolFlags.Optional ? new Token(Syntax.QuestionToken) : undefined;
    if (propertySymbol.flags & (SymbolFlags.Function | SymbolFlags.Method) && !getPropertiesOfObjectType(propertyType).length && !isReadonlySymbol(propertySymbol)) {
      const signatures = getSignaturesOfType(
        filterType(propertyType, (t) => !(t.flags & TypeFlags.Undefined)),
        SignatureKind.Call
      );
      for (const signature of signatures) {
        const methodDeclaration = <MethodSignature>this.signatureToSignatureDeclarationHelper(signature, Syntax.MethodSignature);
        methodDeclaration.name = propertyName;
        methodDeclaration.questionToken = optionalToken;
        typeElems.push(preserveCommentsOn(methodDeclaration));
      }
    } else {
      const savedFlags = this.flags;
      this.flags |= propertyIsReverseMapped ? NodeBuilderFlags.InReverseMappedType : 0;
      let propertyTypeNode: Typing;
      if (propertyIsReverseMapped && !!(savedFlags & NodeBuilderFlags.InReverseMappedType)) {
        propertyTypeNode = createElidedInformationPlaceholder(this);
      } else {
        propertyTypeNode = propertyType ? serializeTypeForDeclaration(this, propertyType, propertySymbol, saveEnclosingDeclaration) : new qc.KeywordTyping(Syntax.AnyKeyword);
      }
      this.flags = savedFlags;
      const modifiers = isReadonlySymbol(propertySymbol) ? [new Token(Syntax.ReadonlyKeyword)] : undefined;
      if (modifiers) this.approximateLength += 9;
      const propertySignature = new qc.PropertySignature(modifiers, propertyName, optionalToken, propertyTypeNode, undefined);
      typeElems.push(preserveCommentsOn(propertySignature));
    }
    function preserveCommentsOn<T extends Node>(node: T) {
      if (some(propertySymbol.declarations, (d) => d.kind === Syntax.DocPropertyTag)) {
        const d = find(propertySymbol.declarations, (d) => d.kind === Syntax.DocPropertyTag)! as DocPropertyTag;
        const commentText = d.comment;
        if (commentText) {
          setSyntheticLeadingComments(node, [
            {
              kind: Syntax.MultiLineCommentTrivia,
              text: '*\n * ' + commentText.replace(/\n/g, '\n * ') + '\n ',
              pos: -1,
              end: -1,
              hasTrailingNewLine: true,
            },
          ]);
        }
      } else if (propertySymbol.valueDeclaration) {
        setCommentRange(node, propertySymbol.valueDeclaration);
      }
      return node;
    }
  }
  mapToTypeNodes(types: readonly Type[] | undefined, isBareList?: boolean): Typing[] | undefined {
    if (some(types)) {
      if (this.checkTruncationLength()) {
        if (!isBareList) return [new qc.TypingReference('...', undefined)];
        if (types.length > 2) return [this.typeToTypeNodeHelper(types[0]), new qc.TypingReference(`... ${types.length - 2} more ...`, undefined), this.typeToTypeNodeHelper(types[types.length - 1])];
      }
      const mayHaveNameCollisions = !(this.flags & NodeBuilderFlags.UseFullyQualifiedType);
      const seenNames = mayHaveNameCollisions ? createEscapedMultiMap<[Type, number]>() : undefined;
      const result: Typing[] = [];
      let i = 0;
      for (const type of types) {
        i++;
        if (this.checkTruncationLength() && i + 2 < types.length - 1) {
          result.push(new qc.TypingReference(`... ${types.length - i} more ...`, undefined));
          const typeNode = this.typeToTypeNodeHelper(types[types.length - 1]);
          if (typeNode) result.push(typeNode);
          break;
        }
        this.approximateLength += 2;
        const typeNode = this.typeToTypeNodeHelper(type);
        if (typeNode) {
          result.push(typeNode);
          if (seenNames && qf.is.identifierTypeReference(typeNode)) seenNames.add(typeNode.typeName.escapedText, [type, result.length - 1]);
        }
      }
      if (seenNames) {
        const saveContextFlags = this.flags;
        this.flags |= NodeBuilderFlags.UseFullyQualifiedType;
        const typesAreSameReference = (a: Type, b: Type): boolean => {
          return a === b || (!!a.symbol && a.symbol === b.symbol) || (!!a.aliasSymbol && a.aliasSymbol === b.aliasSymbol);
        };
        seenNames.forEach((types) => {
          if (!arrayIsHomogeneous(types, ([a], [b]) => typesAreSameReference(a, b))) {
            for (const [type, resultIndex] of types) {
              result[resultIndex] = this.typeToTypeNodeHelper(type);
            }
          }
        });
        this.flags = saveContextFlags;
      }
      return result;
    }
  }
  indexInfoToIndexSignatureDeclarationHelper(indexInfo: IndexInfo, kind: IndexKind): IndexSignatureDeclaration {
    const name = qf.get.nameFromIndexInfo(indexInfo) || 'x';
    const indexerTypeNode = new qc.KeywordTyping(kind === IndexKind.String ? Syntax.StringKeyword : Syntax.NumberKeyword);
    const indexingParameter = new qc.ParameterDeclaration(undefined, undefined, undefined, name, undefined, indexerTypeNode, undefined);
    const typeNode = this.typeToTypeNodeHelper(indexInfo.type || anyType);
    if (!indexInfo.type && !(this.flags & NodeBuilderFlags.AllowEmptyIndexInfoType)) this.encounteredError = true;
    this.approximateLength += name.length + 4;
    return new qc.IndexSignatureDeclaration(undefined, indexInfo.isReadonly ? [new Token(Syntax.ReadonlyKeyword)] : undefined, [indexingParameter], typeNode);
  }
  signatureToSignatureDeclarationHelper(signature: Signature, kind: Syntax, privateSymbolVisitor?: (s: Symbol) => void, bundledImports?: boolean): SignatureDeclaration {
    const suppressAny = this.flags & NodeBuilderFlags.SuppressAnyReturnType;
    if (suppressAny) this.flags &= ~NodeBuilderFlags.SuppressAnyReturnType;
    let typeParameters: TypeParameterDeclaration[] | undefined;
    let typeArguments: Typing[] | undefined;
    if (this.flags & NodeBuilderFlags.WriteTypeArgumentsOfSignature && signature.target && signature.mapper && signature.target.typeParameters) {
      typeArguments = signature.target.typeParameters.map((parameter) => this.typeToTypeNodeHelper(instantiateType(parameter, signature.mapper)));
    } else {
      typeParameters = signature.typeParameters && signature.typeParameters.map((parameter) => this.typeParameterToDeclaration(parameter));
    }
    const parameters = getExpandedParameters(signature, true)[0].map((parameter) => this.symbolToParameterDeclaration(parameter, kind === Syntax.Constructor, privateSymbolVisitor, bundledImports));
    if (signature.thisParameter) {
      const thisParameter = this.symbolToParameterDeclaration(signature.thisParameter);
      parameters.unshift(thisParameter);
    }
    let returnTypeNode: Typing | undefined;
    const typePredicate = getTypePredicateOfSignature(signature);
    if (typePredicate) {
      const assertsModifier = typePredicate.kind === TypePredicateKind.AssertsThis || typePredicate.kind === TypePredicateKind.AssertsIdentifier ? new Token(Syntax.AssertsKeyword) : undefined;
      const parameterName =
        typePredicate.kind === TypePredicateKind.Identifier || typePredicate.kind === TypePredicateKind.AssertsIdentifier
          ? setEmitFlags(new Identifier(typePredicate.parameterName), EmitFlags.NoAsciiEscaping)
          : new qc.ThisTyping();
      const typeNode = typePredicate.type && this.typeToTypeNodeHelper(typePredicate.type);
      returnTypeNode = new qc.TypingPredicate(assertsModifier, parameterName, typeNode);
    } else {
      const returnType = getReturnTypeOfSignature(signature);
      if (returnType && !(suppressAny && isTypeAny(returnType))) {
        returnTypeNode = this.serializeReturnTypeForSignature(returnType, signature, privateSymbolVisitor, bundledImports);
      } else if (!suppressAny) {
        returnTypeNode = new qc.KeywordTyping(Syntax.AnyKeyword);
      }
    }
    this.approximateLength += 3;
    return new qc.SignatureDeclaration(kind, typeParameters, parameters, returnTypeNode, typeArguments);
  }
  typeParameterToDeclarationWithConstraint(type: TypeParameter, constraintNode: Typing | undefined): TypeParameterDeclaration {
    const savedContextFlags = this.flags;
    this.flags &= ~NodeBuilderFlags.WriteTypeParametersInQualifiedName;
    const name = this.typeParameterToName(type);
    const defaultParameter = getDefaultFromTypeParameter(type);
    const defaultParameterNode = defaultParameter && this.typeToTypeNodeHelper(defaultParameter);
    this.flags = savedContextFlags;
    return new qc.TypeParameterDeclaration(name, constraintNode, defaultParameterNode);
  }
  typeParameterToDeclaration(type: TypeParameter, constraint = getConstraintOfTypeParameter(type)): TypeParameterDeclaration {
    const constraintNode = constraint && this.typeToTypeNodeHelper(constraint);
    return this.typeParameterToDeclarationWithConstraint(type, constraintNode);
  }
  symbolToParameterDeclaration(parameterSymbol: Symbol, preserveModifierFlags?: boolean, privateSymbolVisitor?: (s: Symbol) => void, bundledImports?: boolean): ParameterDeclaration {
    let parameterDeclaration: ParameterDeclaration | DocParameterTag | undefined = getDeclarationOfKind<ParameterDeclaration>(parameterSymbol, Syntax.Parameter);
    if (!parameterDeclaration && !isTransientSymbol(parameterSymbol)) {
      parameterDeclaration = getDeclarationOfKind<DocParameterTag>(parameterSymbol, Syntax.DocParameterTag);
    }
    let parameterType = getTypeOfSymbol(parameterSymbol);
    if (parameterDeclaration && isRequiredInitializedParameter(parameterDeclaration)) parameterType = getOptionalType(parameterType);
    const parameterTypeNode = this.serializeTypeForDeclaration(parameterType, parameterSymbol, this.enclosingDeclaration, privateSymbolVisitor, bundledImports);
    const modifiers =
      !(this.flags & NodeBuilderFlags.OmitParameterModifiers) && preserveModifierFlags && parameterDeclaration && parameterDeclaration.modifiers
        ? parameterDeclaration.modifiers.map(getSynthesizedClone)
        : undefined;
    const isRest = (parameterDeclaration && qf.is.restParameter(parameterDeclaration)) || getCheckFlags(parameterSymbol) & CheckFlags.RestParameter;
    const dot3Token = isRest ? new Token(Syntax.Dot3Token) : undefined;
    const cloneBindingName = (node: BindingName): BindingName => {
      const elideIniterAndSetEmitFlags = (node: Node): Node => {
        if (this.tracker.trackSymbol && qf.is.kind(qc.ComputedPropertyName, node) && isLateBindableName(node)) {
          this.trackComputedName(node.expression, this.enclosingDeclaration);
        }
        const visited = visitEachChild(node, elideIniterAndSetEmitFlags, nullTransformationContext, undefined, elideIniterAndSetEmitFlags)!;
        const clone = isSynthesized(visited) ? visited : getSynthesizedClone(visited);
        if (clone.kind === Syntax.BindingElem) (<BindingElem>clone).initer = undefined;
        return setEmitFlags(clone, EmitFlags.SingleLine | EmitFlags.NoAsciiEscaping);
      };
      return <BindingName>elideIniterAndSetEmitFlags(node as Node);
    };
    const name = parameterDeclaration
      ? parameterDeclaration.name
        ? parameterDeclaration.name.kind === Syntax.Identifier
          ? setEmitFlags(getSynthesizedClone(parameterDeclaration.name), EmitFlags.NoAsciiEscaping)
          : parameterDeclaration.name.kind === Syntax.QualifiedName
          ? setEmitFlags(getSynthesizedClone(parameterDeclaration.name.right), EmitFlags.NoAsciiEscaping)
          : cloneBindingName(parameterDeclaration.name)
        : parameterSymbol.name
      : parameterSymbol.name;
    const isOptional = (parameterDeclaration && isOptionalParameter(parameterDeclaration)) || getCheckFlags(parameterSymbol) & CheckFlags.OptionalParameter;
    const questionToken = isOptional ? new Token(Syntax.QuestionToken) : undefined;
    const parameterNode = new qc.ParameterDeclaration(undefined, modifiers, dot3Token, name, questionToken, parameterTypeNode, undefined);
    this.approximateLength += parameterSymbol.name.length + 3;
    return parameterNode;
  }
  trackComputedName(accessExpression: EntityNameOrEntityNameExpression, enclosingDeclaration: Node | undefined) {
    if (!this.tracker.trackSymbol) return;
    const firstIdentifier = qf.get.firstIdentifier(accessExpression);
    const name = resolveName(firstIdentifier, firstIdentifier.escapedText, SymbolFlags.Value | SymbolFlags.ExportValue, undefined, undefined, true);
    if (name) this.tracker.trackSymbol(name, enclosingDeclaration, SymbolFlags.Value);
  }
  getTopmostIndexedAccessType(top: IndexedAccessTyping): IndexedAccessTyping {
    if (qf.is.kind(qc.IndexedAccessTyping, top.objectType)) return getTopmostIndexedAccessType(top.objectType);
    return top;
  }
  isSingleQuotedStringNamed(d: Declaration) {
    const name = qf.get.declaration.nameOf(d);
    if (name && qf.is.kind(qc.StringLiteral, name) && (name.singleQuote || (!isSynthesized(name) && startsWith(qf.get.textOf(name, false), "'")))) return true;
    return false;
  }
  createPropertyNameNodeForIdentifierOrLiteral(name: string, singleQuote?: boolean) {
    return qy.is.identifierText(name) ? new Identifier(name) : qc.asLiteral(NumericLiteral.name(name) && +name >= 0 ? +name : name, !!singleQuote);
  }
  cloneQContext(): QContext {
    const initial: QContext = { ...this };
    if (initial.typeParameterNames) initial.typeParameterNames = cloneMap(initial.typeParameterNames);
    if (initial.typeParameterNamesByText) initial.typeParameterNamesByText = cloneMap(initial.typeParameterNamesByText);
    if (initial.typeParameterSymbolList) initial.typeParameterSymbolList = cloneMap(initial.typeParameterSymbolList);
    return initial;
  }
  serializeTypeForDeclaration(type: Type, symbol: Symbol, enclosingDeclaration: Node | undefined, includePrivateSymbol?: (s: Symbol) => void, bundled?: boolean) {
    if (type !== errorType && enclosingDeclaration) {
      const declWithExistingAnnotation = getDeclarationWithTypeAnnotation(symbol, enclosingDeclaration);
      if (declWithExistingAnnotation && !qf.is.functionLikeDeclaration(declWithExistingAnnotation)) {
        const existing = qf.get.effectiveTypeAnnotationNode(declWithExistingAnnotation)!;
        if (getTypeFromTypeNode(existing) === type && existingTypeNodeIsNotReferenceOrIsReferenceWithCompatibleTypeArgumentCount(existing, type)) {
          const result = this.serializeExistingTypeNode(existing, includePrivateSymbol, bundled);
          if (result) return result;
        }
      }
    }
    const oldFlags = this.flags;
    if (type.flags & TypeFlags.UniqueESSymbol && type.symbol === symbol) this.flags |= NodeBuilderFlags.AllowUniqueESSymbolType;
    const result = this.typeToTypeNodeHelper(type);
    this.flags = oldFlags;
    return result;
  }
  serializeReturnTypeForSignature(type: Type, signature: Signature, includePrivateSymbol?: (s: Symbol) => void, bundled?: boolean) {
    if (type !== errorType && this.enclosingDeclaration) {
      const annotation = signature.declaration && qf.get.effectiveReturnTypeNode(signature.declaration);
      if (
        !!qc.findAncestor(annotation, (n) => n === this.enclosingDeclaration) &&
        annotation &&
        instantiateType(getTypeFromTypeNode(annotation), signature.mapper) === type &&
        existingTypeNodeIsNotReferenceOrIsReferenceWithCompatibleTypeArgumentCount(annotation, type)
      ) {
        const result = this.serializeExistingTypeNode(annotation, includePrivateSymbol, bundled);
        if (result) return result;
      }
    }
    return this.typeToTypeNodeHelper(type);
  }
  serializeExistingTypeNode(existing: Typing, includePrivateSymbol?: (s: Symbol) => void, bundled?: boolean) {
    if (cancellationToken && cancellationToken.throwIfCancellationRequested) cancellationToken.throwIfCancellationRequested();
    let hadError = false;
    const file = existing.sourceFile;
    const transformed = visitNode(existing, this.visitExistingNodeTreeSymbols);
    if (hadError) return;
    return transformed === existing ? getMutableClone(existing) : transformed;
  }
  visitExistingNodeTreeSymbols<T extends Node>(node: T): Node {
    if (qf.is.kind(qc.DocAllTyping, node) || node.kind === Syntax.DocNamepathTyping) return new qc.KeywordTyping(Syntax.AnyKeyword);
    if (qf.is.kind(qc.DocUnknownTyping, node)) return new qc.KeywordTyping(Syntax.UnknownKeyword);
    if (qf.is.kind(qc.DocNullableTyping, node)) return new qc.UnionTyping([visitNode(node.type, this.visitExistingNodeTreeSymbols), new qc.KeywordTyping(Syntax.NullKeyword)]);
    if (qf.is.kind(qc.DocOptionalTyping, node)) return new qc.UnionTyping([visitNode(node.type, this.visitExistingNodeTreeSymbols), new qc.KeywordTyping(Syntax.UndefinedKeyword)]);
    if (qf.is.kind(qc.DocNonNullableTyping, node)) return visitNode(node.type, this.visitExistingNodeTreeSymbols);
    if (qf.is.kind(qc.DocVariadicTyping, node)) return new ArrayTyping(visitNode((node as DocVariadicTyping).type, this.visitExistingNodeTreeSymbols));
    if (qf.is.kind(qc.DocTypingLiteral, node)) {
      return new qc.TypingLiteral(
        map(node.docPropertyTags, (t) => {
          const name = qf.is.kind(qc.Identifier, t.name) ? t.name : t.name.right;
          const typeViaParent = getTypeOfPropertyOfType(getTypeFromTypeNode(node), name.escapedText);
          const overrideTypeNode = typeViaParent && t.typeExpression && getTypeFromTypeNode(t.typeExpression.type) !== typeViaParent ? this.typeToTypeNodeHelper(typeViaParent) : undefined;
          return new qc.PropertySignature(
            undefined,
            name,
            t.typeExpression && qf.is.kind(qc.DocOptionalTyping, t.typeExpression.type) ? new Token(Syntax.QuestionToken) : undefined,
            overrideTypeNode || (t.typeExpression && visitNode(t.typeExpression.type, this.visitExistingNodeTreeSymbols)) || new qc.KeywordTyping(Syntax.AnyKeyword),
            undefined
          );
        })
      );
    }
    if (qf.is.kind(qc.TypingReference, node) && qf.is.kind(qc.Identifier, node.typeName) && node.typeName.escapedText === '') return new qc.KeywordTyping(Syntax.AnyKeyword).setOriginal(node);
    if ((qf.is.kind(qc.ExpressionWithTypings, node) || qf.is.kind(qc.TypingReference, node)) && isDocIndexSignature(node)) {
      return new qc.TypingLiteral([
        new qc.IndexSignatureDeclaration(
          undefined,
          undefined,
          [new qc.ParameterDeclaration(undefined, undefined, undefined, 'x', undefined, visitNode(node.typeArguments![0], visitExistingNodeTreeSymbols))],
          visitNode(node.typeArguments![1], this.visitExistingNodeTreeSymbols)
        ),
      ]);
    }
    if (qf.is.kind(qc.DocFunctionTyping, node)) {
      const getEffectiveDotDotDotForParameter = (p: ParameterDeclaration) => {
        return p.dot3Token || (p.type && qf.is.kind(qc.DocVariadicTyping, p.type) ? new Token(Syntax.Dot3Token) : undefined);
      };
      if (qc.isDoc.constructSignature(node)) {
        let newTypeNode: Typing | undefined;
        return ConstructorDeclaration.createTypeNode(
          Nodes.visit(node.typeParameters, this.visitExistingNodeTreeSymbols),
          mapDefined(node.parameters, (p, i) =>
            p.name && qf.is.kind(qc.Identifier, p.name) && p.name.escapedText === 'new'
              ? ((newTypeNode = p.type), undefined)
              : new qc.ParameterDeclaration(
                  undefined,
                  undefined,
                  getEffectiveDotDotDotForParameter(p),
                  p.name || getEffectiveDotDotDotForParameter(p) ? `args` : `arg${i}`,
                  p.questionToken,
                  visitNode(p.type, this.visitExistingNodeTreeSymbols),
                  undefined
                )
          ),
          visitNode(newTypeNode || node.type, this.visitExistingNodeTreeSymbols)
        );
      } else {
        return new qc.FunctionTyping(
          Nodes.visit(node.typeParameters, this.visitExistingNodeTreeSymbols),
          map(
            node.parameters,
            (p, i) =>
              new qc.ParameterDeclaration(
                undefined,
                undefined,
                getEffectiveDotDotDotForParameter(p),
                p.name || getEffectiveDotDotDotForParameter(p) ? `args` : `arg${i}`,
                p.questionToken,
                visitNode(p.type, this.visitExistingNodeTreeSymbols),
                undefined
              )
          ),
          visitNode(node.type, this.visitExistingNodeTreeSymbols)
        );
      }
    }
    if (
      qf.is.kind(qc.TypingReference, node) &&
      qf.is.inDoc(node) &&
      (getIntendedTypeFromDocTypeReference(node) || unknownSymbol === resolveTypeReferenceName(getTypeReferenceName(node), SymbolFlags.Type, true))
    ) {
      return this.typeToTypeNodeHelper(getTypeFromTypeNode(node)).setOriginal(node);
    }
    if (qf.is.literalImportTyping(node)) {
      const rewriteModuleSpecifier = (parent: ImportTyping, lit: StringLiteral) => {
        if (bundled) {
          if (this.tracker && this.tracker.moduleResolverHost) {
            const targetFile = getExternalModuleFileFromDeclaration(parent);
            if (targetFile) {
              const getCanonicalFileName = createGetCanonicalFileName(!!host.useCaseSensitiveFileNames);
              const resolverHost = {
                getCanonicalFileName,
                getCurrentDirectory: () => this.tracker.moduleResolverHost!.getCurrentDirectory(),
                getCommonSourceDirectory: () => this.tracker.moduleResolverHost!.getCommonSourceDirectory(),
              };
              const newName = getResolvedExternalModuleName(resolverHost, targetFile);
              return qc.asLiteral(newName);
            }
          }
        } else {
          if (this.tracker && this.tracker.trackExternalModuleSymbolOfImportTyping) {
            const moduleSym = resolveExternalModuleNameWorker(lit, lit, undefined);
            if (moduleSym) {
              this.tracker.trackExternalModuleSymbolOfImportTyping(moduleSym);
            }
          }
        }
        return lit;
      };
      return node.update(
        node.argument.update(rewriteModuleSpecifier(node, node.argument.literal)),
        node.qualifier,
        Nodes.visit(node.typeArguments, this.visitExistingNodeTreeSymbols, isTypeNode),
        node.isTypeOf
      );
    }
    if (qf.is.entityName(node) || qf.is.entityNameExpression(node)) {
      const leftmost = qf.get.firstIdentifier(node);
      if (
        qf.is.inJSFile(node) &&
        (qf.is.exportsIdentifier(leftmost) ||
          qf.is.moduleExportsAccessExpression(leftmost.parent) ||
          (qf.is.kind(qc.QualifiedName, leftmost.parent) && qf.is.moduleIdentifier(leftmost.parent.left) && qf.is.exportsIdentifier(leftmost.parent.right)))
      ) {
        hadError = true;
        return node;
      }
      const sym = resolveEntityName(leftmost, SymbolFlags.All, true, true);
      if (sym) {
        if (isSymbolAccessible(sym, this.enclosingDeclaration, SymbolFlags.All, false).accessibility !== SymbolAccessibility.Accessible) {
          hadError = true;
        } else {
          this.tracker?.trackSymbol?.(sym, this.enclosingDeclaration, SymbolFlags.All);
          includePrivateSymbol?.(sym);
        }
        if (qf.is.kind(qc.Identifier, node)) {
          const name = sym.flags & SymbolFlags.TypeParameter ? this.typeParameterToName(getDeclaredTypeOfSymbol(sym)) : getMutableClone(node);
          name.symbol = sym;
          return setEmitFlags(name.node).setOriginal(EmitFlags.NoAsciiEscaping);
        }
      }
    }
    if (file && qf.is.kind(qc.TupleTyping, node) && qy.get.lineAndCharOf(file, node.pos).line === qy.get.lineAndCharOf(file, node.end).line) {
      setEmitFlags(node, EmitFlags.SingleLine);
    }
    return visitEachChild(node, this.visitExistingNodeTreeSymbols, nullTransformationContext);
  }
  serializeSignatures(kind: SignatureKind, input: Type, baseType: Type | undefined, outputKind: Syntax) {
    const signatures = getSignaturesOfType(input, kind);
    if (kind === SignatureKind.Construct) {
      if (!baseType && every(signatures, (s) => length(s.parameters) === 0)) return [];
      if (baseType) {
        const baseSigs = getSignaturesOfType(baseType, SignatureKind.Construct);
        if (!length(baseSigs) && every(signatures, (s) => length(s.parameters) === 0)) return [];
        if (baseSigs.length === signatures.length) {
          let failed = false;
          for (let i = 0; i < baseSigs.length; i++) {
            if (!compareSignaturesIdentical(signatures[i], baseSigs[i], false, false, true, compareTypesIdentical)) {
              failed = true;
              break;
            }
          }
          if (!failed) return [];
        }
      }
      let privateProtected: ModifierFlags = 0;
      for (const s of signatures) {
        if (s.declaration) privateProtected |= qf.get.selectedEffectiveModifierFlags(s.declaration, ModifierFlags.Private | ModifierFlags.Protected);
      }
      if (privateProtected) return [setRange(new qc.ConstructorDeclaration(undefined, qf.create.modifiersFromFlags(privateProtected), [], undefined), signatures[0].declaration)];
    }
    const results = [];
    for (const sig of signatures) {
      const decl = this.signatureToSignatureDeclarationHelper(sig, outputKind);
      results.push(setRange(decl, sig.declaration));
    }
    return results;
  }
  serializeIndexSignatures(input: Type, baseType: Type | undefined) {
    const results: IndexSignatureDeclaration[] = [];
    for (const type of [IndexKind.String, IndexKind.Number]) {
      const info = getIndexInfoOfType(input, type);
      if (info) {
        if (baseType) {
          const baseInfo = getIndexInfoOfType(baseType, type);
          if (baseInfo) {
            if (isTypeIdenticalTo(info.type, baseInfo.type)) continue;
          }
        }
        results.push(this.indexInfoToIndexSignatureDeclarationHelper(info, type));
      }
    }
    return results;
  }
  trySerializeAsTypeReference(t: Type) {
    let typeArgs: Typing[] | undefined;
    let reference: Expression | undefined;
    if ((t as TypeReference).target && getAccessibleSymbolChain((t as TypeReference).target.symbol, enclosingDeclaration, SymbolFlags.Value, false)) {
      typeArgs = map(getTypeArguments(t as TypeReference), (t) => this.typeToTypeNodeHelper(t));
      reference = this.symbolToExpression((t as TypeReference).target.symbol, SymbolFlags.Type);
    } else if (t.symbol && getAccessibleSymbolChain(t.symbol, enclosingDeclaration, SymbolFlags.Value, false)) {
      reference = this.symbolToExpression(t.symbol, SymbolFlags.Type);
    }
    if (reference) return new qc.ExpressionWithTypings(typeArgs, reference);
  }
  serializeAsFunctionNamespaceMerge(type: Type, symbol: Symbol, localName: string, modifierFlags: ModifierFlags) {
    const signatures = getSignaturesOfType(type, SignatureKind.Call);
    for (const sig of signatures) {
      const decl = this.signatureToSignatureDeclarationHelper(sig, Syntax.FunctionDeclaration, includePrivateSymbol, bundled) as FunctionDeclaration;
      decl.name = new Identifier(localName);
      addResult(setRange(decl, (sig.declaration && qf.is.kind(qc.VariableDeclaration, sig.declaration.parent) && sig.declaration.parent.parent) || sig.declaration), modifierFlags);
    }
    if (!(symbol.flags & (SymbolFlags.ValueModule | SymbolFlags.NamespaceModule) && !!symbol.exports && !!symbol.exports.size)) {
      const props = filter(getPropertiesOfType(type), isNamespaceMember);
      serializeAsNamespaceDeclaration(props, localName, modifierFlags, true);
    }
  }
  serializeAsClass(symbol: Symbol, localName: string, modifierFlags: ModifierFlags) {
    const localParams = this.getLocalTypeParametersOfClassOrInterfaceOrTypeAlias();
    const typeParamDecls = map(localParams, (p) => this.typeParameterToDeclaration(p));
    const classType = this.getDeclaredTypeOfClassOrInterface();
    const baseTypes = getBaseTypes(classType);
    const implementsTypes = getImplementsTypes(classType);
    const staticType = this.getTypeOfSymbol();
    const isClass = !!staticType.symbol?.valueDeclaration && qf.is.classLike(staticType.symbol.valueDeclaration);
    const staticBaseType = isClass ? getBaseConstructorTypeOfClass(staticType as InterfaceType) : anyType;
    const heritageClauses = [
      ...(!length(baseTypes)
        ? []
        : [
            new qc.HeritageClause(
              Syntax.ExtendsKeyword,
              map(baseTypes, (b) => serializeBaseType(b, staticBaseType, localName))
            ),
          ]),
      ...(!length(implementsTypes)
        ? []
        : [
            new qc.HeritageClause(
              Syntax.ImplementsKeyword,
              map(implementsTypes, (b) => serializeBaseType(b, staticBaseType, localName))
            ),
          ]),
    ];
    const symbolProps = getNonInterhitedProperties(classType, baseTypes, getPropertiesOfType(classType));
    const publicSymbolProps = filter(symbolProps, (s) => {
      const valueDecl = s.valueDeclaration;
      return valueDecl && !(qf.is.namedDeclaration(valueDecl) && qf.is.kind(qc.PrivateIdentifier, valueDecl.name));
    });
    const hasPrivateIdentifier = some(symbolProps, (s) => {
      const valueDecl = s.valueDeclaration;
      return valueDecl && qf.is.namedDeclaration(valueDecl) && qf.is.kind(qc.PrivateIdentifier, valueDecl.name);
    });
    const privateProperties = hasPrivateIdentifier ? [new qc.PropertyDeclaration(undefined, undefined, new PrivateIdentifier('#private'), undefined, undefined, undefined)] : empty;
    const publicProperties = flatMap<Symbol, ClassElem>(publicSymbolProps, (p) => serializePropertySymbolForClass(p, false, baseTypes[0]));
    const staticMembers = flatMap(
      filter(getPropertiesOfType(staticType), (p) => !(p.flags & SymbolFlags.Prototype) && p.escName !== 'prototype' && !isNamespaceMember(p)),
      (p) => serializePropertySymbolForClass(p, true, staticBaseType)
    );
    const isNonConstructableClassLikeInJsFile = !isClass && !!symbol.valueDeclaration && qf.is.inJSFile(symbol.valueDeclaration) && !some(getSignaturesOfType(staticType, SignatureKind.Construct));
    const constructors = isNonConstructableClassLikeInJsFile
      ? [new qc.ConstructorDeclaration(undefined, qf.create.modifiersFromFlags(ModifierFlags.Private), [], undefined)]
      : (serializeSignatures(SignatureKind.Construct, staticType, baseTypes[0], Syntax.Constructor) as ConstructorDeclaration[]);
    for (const c of constructors) {
      c.type = undefined;
      c.typeParameters = undefined;
    }
    const indexSignatures = serializeIndexSignatures(classType, baseTypes[0]);
    addResult(
      setRange(
        new qc.ClassDeclaration(undefined, undefined, localName, typeParamDecls, heritageClauses, [...indexSignatures, ...staticMembers, ...constructors, ...publicProperties, ...privateProperties]),
        symbol.declarations && filter(symbol.declarations, (d) => qf.is.kind(qc.ClassDeclaration, d) || qf.is.kind(qc.ClassExpression, d))[0]
      ),
      modifierFlags
    );
  }
  serializeBaseType(t: Type, staticType: Type, rootName: string) {
    const ref = trySerializeAsTypeReference(t);
    if (ref) return ref;
    const tempName = getUnusedName(`${rootName}_base`);
    const statement = new qc.VariableStatement(undefined, new qc.VariableDeclarationList([new qc.VariableDeclaration(tempName, this.typeToTypeNodeHelper(staticType))], NodeFlags.Const));
    addResult(statement, ModifierFlags.None);
    return new qc.ExpressionWithTypings(undefined, new Identifier(tempName));
  }
  getInternalSymbol(symbol: Symbol, localName: string) {
    if (this.remappedSymbolNames!.has('' + symbol.getId())) return this.remappedSymbolNames!.get('' + symbol.getId())!;
    localName = getNameCandidateWorker(symbol, localName);
    this.remappedSymbolNames!.set('' + symbol.getId(), localName);
    return localName;
  }
  getNameCandidateWorker(symbol: Symbol, localName: string) {
    if (localName === InternalSymbol.Default || localName === InternalSymbol.Class || localName === InternalSymbol.Function) {
      const flags = this.flags;
      this.flags |= NodeBuilderFlags.InInitialEntityName;
      const nameCandidate = symbol.getNameOfSymbolAsWritten(this);
      this.flags = flags;
      localName = nameCandidate.length > 0 && qy.is.singleOrDoubleQuote(nameCandidate.charCodeAt(0)) ? stripQuotes(nameCandidate) : nameCandidate;
    }
    if (localName === InternalSymbol.Default) localName = '_default';
    else if (localName === InternalSymbol.ExportEquals) localName = '_exports';
    localName = qy.is.identifierText(localName) && !qy.is.stringANonContextualKeyword(localName) ? localName : '_' + localName.replace(/[^a-zA-Z0-9]/g, '_');
    return localName;
  }
  getUnusedName(input: string, symbol?: Symbol): string {
    if (symbol) {
      if (this.remappedSymbolNames!.has('' + symbol.getId())) return this.remappedSymbolNames!.get('' + symbol.getId())!;
    }
    if (symbol) input = getNameCandidateWorker(symbol, input);
    let i = 0;
    const original = input;
    while (this.usedSymbolNames!.has(input)) {
      i++;
      input = `${original}_${i}`;
    }
    this.usedSymbolNames!.set(input, true);
    if (symbol) this.remappedSymbolNames!.set('' + symbol.getId(), input);
    return input;
  }
  createAnonymousTypeNode(type: ObjectType): Typing {
    const typeId = '' + type.id;
    const symbol = type.symbol;
    const createTypeNodeFromObjectType = (type: ObjectType): Typing => {
      const createMappedTypingFromType = (type: MappedType) => {
        assert(!!(type.flags & TypeFlags.Object));
        const readonlyToken = type.declaration.readonlyToken ? <ReadonlyToken | PlusToken | MinusToken>new Token(type.declaration.readonlyToken.kind) : undefined;
        const questionToken = type.declaration.questionToken ? <QuestionToken | PlusToken | MinusToken>new Token(type.declaration.questionToken.kind) : undefined;
        let appropriateConstraintTypeNode: Typing;
        if (isMappedTypeWithKeyofConstraintDeclaration(type)) {
          appropriateConstraintTypeNode = new qc.TypingOperator(this.typeToTypeNodeHelper(getModifiersTypeFromMappedType(type)));
        } else {
          appropriateConstraintTypeNode = this.typeToTypeNodeHelper(getConstraintTypeFromMappedType(type));
        }
        const typeParameterNode = this.typeParameterToDeclarationWithConstraint(getTypeParameterFromMappedType(type), appropriateConstraintTypeNode);
        const templateTypeNode = this.typeToTypeNodeHelper(getTemplateTypeFromMappedType(type));
        const mappedTypeNode = new qc.MappedTyping(readonlyToken, typeParameterNode, questionToken, templateTypeNode);
        this.approximateLength += 10;
        return setEmitFlags(mappedTypeNode, EmitFlags.SingleLine);
      };
      if (isGenericMappedType(type)) return createMappedTypingFromType(type);
      const resolved = resolveStructuredTypeMembers(type);
      if (!resolved.properties.length && !resolved.stringIndexInfo && !resolved.numberIndexInfo) {
        if (!resolved.callSignatures.length && !resolved.constructSignatures.length) {
          this.approximateLength += 2;
          return setEmitFlags(new qc.TypingLiteral(undefined), EmitFlags.SingleLine);
        }
        if (resolved.callSignatures.length === 1 && !resolved.constructSignatures.length) {
          const signature = resolved.callSignatures[0];
          const signatureNode = <FunctionTyping>this.signatureToSignatureDeclarationHelper(signature, Syntax.FunctionTyping);
          return signatureNode;
        }
        if (resolved.constructSignatures.length === 1 && !resolved.callSignatures.length) {
          const signature = resolved.constructSignatures[0];
          const signatureNode = <ConstructorTyping>this.signatureToSignatureDeclarationHelper(signature, Syntax.ConstructorTyping);
          return signatureNode;
        }
      }
      const savedFlags = this.flags;
      this.flags |= NodeBuilderFlags.InObjectTypeLiteral;
      const createTypeNodesFromResolvedType = (resolvedType: ResolvedType): TypeElem[] | undefined => {
        if (this.checkTruncationLength()) return [new qc.PropertySignature(undefined, '...', undefined, undefined, undefined)];
        const typeElems: TypeElem[] = [];
        for (const signature of resolvedType.callSignatures) {
          typeElems.push(<CallSignatureDeclaration>this.signatureToSignatureDeclarationHelper(signature, Syntax.CallSignature));
        }
        for (const signature of resolvedType.constructSignatures) {
          typeElems.push(<ConstructSignatureDeclaration>this.signatureToSignatureDeclarationHelper(signature, Syntax.ConstructSignature));
        }
        if (resolvedType.stringIndexInfo) {
          let indexSignature: IndexSignatureDeclaration;
          if (resolvedType.objectFlags & ObjectFlags.ReverseMapped) {
            indexSignature = indexInfoToIndexSignatureDeclarationHelper(
              createIndexInfo(anyType, resolvedType.stringIndexInfo.isReadonly, resolvedType.stringIndexInfo.declaration),
              IndexKind.String,
              this
            );
            indexSignature.type = createElidedInformationPlaceholder(this);
          } else {
            indexSignature = this.indexInfoToIndexSignatureDeclarationHelper(resolvedType.stringIndexInfo, IndexKind.String);
          }
          typeElems.push(indexSignature);
        }
        if (resolvedType.numberIndexInfo) {
          typeElems.push(this.indexInfoToIndexSignatureDeclarationHelper(resolvedType.numberIndexInfo, IndexKind.Number));
        }
        const properties = resolvedType.properties;
        if (!properties) return typeElems;
        let i = 0;
        for (const propertySymbol of properties) {
          i++;
          if (this.flags & NodeBuilderFlags.WriteClassExpressionAsTypeLiteral) {
            if (propertySymbol.flags & SymbolFlags.Prototype) continue;
            if (getDeclarationModifierFlagsFromSymbol(propertySymbol) & (ModifierFlags.Private | ModifierFlags.Protected) && this.tracker.reportPrivateInBaseOfClassExpression) {
              this.tracker.reportPrivateInBaseOfClassExpression(qy.get.unescUnderscores(propertySymbol.escName));
            }
          }
          if (this.checkTruncationLength() && i + 2 < properties.length - 1) {
            typeElems.push(new qc.PropertySignature(undefined, `... ${properties.length - i} more ...`, undefined, undefined, undefined));
            this.addPropertyToElemList(properties[properties.length - 1], typeElems);
            break;
          }
          this.addPropertyToElemList(propertySymbol, typeElems);
        }
        return typeElems.length ? typeElems : undefined;
      };
      const members = createTypeNodesFromResolvedType(resolved);
      this.flags = savedFlags;
      const typeLiteralNode = new qc.TypingLiteral(members);
      this.approximateLength += 2;
      return setEmitFlags(typeLiteralNode, this.flags & NodeBuilderFlags.MultilineObjectLiterals ? 0 : EmitFlags.SingleLine);
    };
    if (symbol) {
      if (isJSConstructor(symbol.valueDeclaration)) {
        const isInstanceType = type === this.getDeclaredTypeOfClassOrInterface() ? SymbolFlags.Type : SymbolFlags.Value;
        return this.symbolToTypeNode(symbol, isInstanceType);
      }
      const shouldWriteTypeOfFunctionSymbol = () => {
        const isStaticMethodSymbol = !!(symbol.flags & SymbolFlags.Method) && some(symbol.declarations, (declaration) => qf.has.syntacticModifier(declaration, ModifierFlags.Static));
        const isNonLocalFunctionSymbol =
          !!(symbol.flags & SymbolFlags.Function) && (symbol.parent || forEach(symbol.declarations, (d) => d.parent?.kind === Syntax.SourceFile || d.parent?.kind === Syntax.ModuleBlock));
        if (isStaticMethodSymbol || isNonLocalFunctionSymbol) {
          return (
            (!!(this.flags & NodeBuilderFlags.UseTypeOfFunction) || (this.visitedTypes && this.visitedTypes.has(typeId))) &&
            (!(this.flags & NodeBuilderFlags.UseStructuralFallback) || isValueSymbolAccessible(symbol, this.enclosingDeclaration))
          );
        }
      };
      if (
        (symbol.flags & SymbolFlags.Class &&
          !getBaseTypeVariableOfClass(symbol) &&
          !(symbol.valueDeclaration.kind === Syntax.ClassExpression && this.flags & NodeBuilderFlags.WriteClassExpressionAsTypeLiteral)) ||
        symbol.flags & (SymbolFlags.Enum | SymbolFlags.ValueModule) ||
        shouldWriteTypeOfFunctionSymbol()
      )
        return this.symbolToTypeNode(symbol, SymbolFlags.Value);
      if (this.visitedTypes && this.visitedTypes.has(typeId)) {
        const typeAlias = getTypeAliasForTypeLiteral(type);
        if (typeAlias) return this.symbolToTypeNode(typeAlias, SymbolFlags.Type);
        return createElidedInformationPlaceholder(this);
      }
      return this.visitAndTransformType(type, createTypeNodeFromObjectType);
    }
    return createTypeNodeFromObjectType(type);
  }
  typeReferenceToTypeNode(type: TypeReference) {
    const typeArguments: readonly Type[] = getTypeArguments(type);
    if (type.target === globalArrayType || type.target === globalReadonlyArrayType) {
      if (this.flags & NodeBuilderFlags.WriteArrayAsGenericType) {
        const typeArgumentNode = this.typeToTypeNodeHelper(typeArguments[0]);
        return new qc.TypingReference(type.target === globalArrayType ? 'Array' : 'ReadonlyArray', [typeArgumentNode]);
      }
      const elemType = this.typeToTypeNodeHelper(typeArguments[0]);
      const arrayType = new ArrayTyping(elemType);
      return type.target === globalArrayType ? arrayType : new qc.TypingOperator(Syntax.ReadonlyKeyword, arrayType);
    } else if (type.target.objectFlags & ObjectFlags.Tuple) {
      if (typeArguments.length > 0) {
        const arity = getTypeReferenceArity(type);
        const tupleConstituentNodes = this.mapToTypeNodes(typeArguments.slice(0, arity));
        const hasRestElem = (<TupleType>type.target).hasRestElem;
        if (tupleConstituentNodes) {
          if ((type.target as TupleType).labeledElemDeclarations) {
            for (let i = 0; i < tupleConstituentNodes.length; i++) {
              const isOptionalOrRest = i >= (<TupleType>type.target).minLength;
              const isRest = isOptionalOrRest && hasRestElem && i === arity - 1;
              const isOptional = isOptionalOrRest && !isRest;
              tupleConstituentNodes[i] = new qc.NamedTupleMember(
                isRest ? new Token(Syntax.Dot3Token) : undefined,
                new Identifier(qy.get.unescUnderscores(getTupleElemLabel((type.target as TupleType).labeledElemDeclarations![i]))),
                isOptional ? new Token(Syntax.QuestionToken) : undefined,
                isRest ? new ArrayTyping(tupleConstituentNodes[i]) : tupleConstituentNodes[i]
              );
            }
          } else {
            for (let i = (<TupleType>type.target).minLength; i < Math.min(arity, tupleConstituentNodes.length); i++) {
              tupleConstituentNodes[i] = hasRestElem && i === arity - 1 ? new qc.RestTyping(new ArrayTyping(tupleConstituentNodes[i])) : new qc.OptionalTyping(tupleConstituentNodes[i]);
            }
          }
          const tupleTypeNode = setEmitFlags(new qc.TupleTyping(tupleConstituentNodes), EmitFlags.SingleLine);
          return (<TupleType>type.target).readonly ? new qc.TypingOperator(Syntax.ReadonlyKeyword, tupleTypeNode) : tupleTypeNode;
        }
      }
      if (this.encounteredError || this.flags & NodeBuilderFlags.AllowEmptyTuple) {
        const tupleTypeNode = setEmitFlags(new qc.TupleTyping([]), EmitFlags.SingleLine);
        return (<TupleType>type.target).readonly ? new qc.TypingOperator(Syntax.ReadonlyKeyword, tupleTypeNode) : tupleTypeNode;
      }
      this.encounteredError = true;
      return undefined!;
    } else if (
      this.flags & NodeBuilderFlags.WriteClassExpressionAsTypeLiteral &&
      type.symbol.valueDeclaration &&
      qf.is.classLike(type.symbol.valueDeclaration) &&
      !isValueSymbolAccessible(type.symbol, this.enclosingDeclaration)
    ) {
      return this.createAnonymousTypeNode(type);
    } else {
      const outerTypeParameters = type.target.outerTypeParameters;
      let i = 0;
      let resultType: TypingReference | ImportTyping | undefined;
      if (outerTypeParameters) {
        const length = outerTypeParameters.length;
        while (i < length) {
          const start = i;
          const parent = getParentSymbolOfTypeParameter(outerTypeParameters[i])!;
          do {
            i++;
          } while (i < length && getParentSymbolOfTypeParameter(outerTypeParameters[i]) === parent);
          if (!rangeEquals(outerTypeParameters, typeArguments, start, i)) {
            const typeArgumentSlice = this.mapToTypeNodes(typeArguments.slice(start, i));
            const flags = this.flags;
            this.flags |= NodeBuilderFlags.ForbidIndexedAccessSymbolReferences;
            const ref = this.symbolToTypeNode(parent, SymbolFlags.Type, typeArgumentSlice) as TypingReference | ImportTyping;
            this.flags = flags;
            resultType = !resultType ? ref : appendReferenceToType(resultType, ref as TypingReference);
          }
        }
      }
      let typeArgumentNodes: readonly Typing[] | undefined;
      if (typeArguments.length > 0) {
        const typeParameterCount = (type.target.typeParameters || empty).length;
        typeArgumentNodes = this.mapToTypeNodes(typeArguments.slice(i, typeParameterCount));
      }
      const flags = this.flags;
      this.flags |= NodeBuilderFlags.ForbidIndexedAccessSymbolReferences;
      const finalRef = this.symbolToTypeNode(type.symbol, SymbolFlags.Type, typeArgumentNodes);
      this.flags = flags;
      return !resultType ? finalRef : appendReferenceToType(resultType, finalRef as TypingReference);
    }
  }
  visitAndTransformType<T>(type: Type, transform: (type: Type) => T) {
    const typeId = '' + type.id;
    const isConstructorObject = getObjectFlags(type) & ObjectFlags.Anonymous && type.symbol && type.symbol.flags & SymbolFlags.Class;
    const id =
      getObjectFlags(type) & ObjectFlags.Reference && (<TypeReference>type).node
        ? 'N' + qf.get.nodeId((<TypeReference>type).node!)
        : type.symbol
        ? (isConstructorObject ? '+' : '') + type.symbol.getId()
        : undefined;
    if (!this.visitedTypes) this.visitedTypes = new qu.QMap<true>();
    if (id && !this.symbolDepth) this.symbolDepth = new qu.QMap<number>();
    let depth: number | undefined;
    if (id) {
      depth = this.symbolDepth!.get(id) || 0;
      if (depth > 10) return createElidedInformationPlaceholder(this);
      this.symbolDepth!.set(id, depth + 1);
    }
    this.visitedTypes.set(typeId, true);
    const result = transform(type);
    this.visitedTypes.delete(typeId);
    if (id) this.symbolDepth!.set(id, depth!);
    return result;
  }
  makeSerializePropertySymbol<T extends Node>(
    createProperty: (
      decorators: readonly Decorator[] | undefined,
      modifiers: readonly Modifier[] | undefined,
      name: string | PropertyName,
      questionOrExclamationToken: QuestionToken | undefined,
      type: Typing | undefined,
      initer: Expression | undefined
    ) => T,
    methodKind: Syntax,
    useAccessors: true
  ): (p: Symbol, isStatic: boolean, baseType: Type | undefined) => T | AccessorDeclaration | (T | AccessorDeclaration)[];
  makeSerializePropertySymbol<T extends Node>(
    createProperty: (
      decorators: readonly Decorator[] | undefined,
      modifiers: readonly Modifier[] | undefined,
      name: string | PropertyName,
      questionOrExclamationToken: QuestionToken | undefined,
      type: Typing | undefined,
      initer: Expression | undefined
    ) => T,
    methodKind: Syntax,
    useAccessors: false
  ): (p: Symbol, isStatic: boolean, baseType: Type | undefined) => T | T[];
  makeSerializePropertySymbol<T extends Node>(
    createProperty: (
      decorators: readonly Decorator[] | undefined,
      modifiers: readonly Modifier[] | undefined,
      name: string | PropertyName,
      questionOrExclamationToken: QuestionToken | undefined,
      type: Typing | undefined,
      initer: Expression | undefined
    ) => T,
    methodKind: Syntax,
    useAccessors: boolean
  ): (p: Symbol, isStatic: boolean, baseType: Type | undefined) => T | AccessorDeclaration | (T | AccessorDeclaration)[] {
    return (p: Symbol, isStatic: boolean, baseType: Type | undefined) => {
      const modifierFlags = getDeclarationModifierFlagsFromSymbol(p);
      const isPrivate = !!(modifierFlags & ModifierFlags.Private);
      if (isStatic && p.flags & (SymbolFlags.Type | SymbolFlags.Namespace | SymbolFlags.Alias)) return [];
      if (
        p.flags & SymbolFlags.Prototype ||
        (baseType &&
          getPropertyOfType(baseType, p.escName) &&
          isReadonlySymbol(getPropertyOfType(baseType, p.escName)!) === isReadonlySymbol(p) &&
          (p.flags & SymbolFlags.Optional) === (getPropertyOfType(baseType, p.escName)!.flags & SymbolFlags.Optional) &&
          isTypeIdenticalTo(getTypeOfSymbol(p), getTypeOfPropertyOfType(baseType, p.escName)!))
      ) {
        return [];
      }
      const flag = (modifierFlags & ~ModifierFlags.Async) | (isStatic ? ModifierFlags.Static : 0);
      const name = this.getPropertyNameNodeForSymbol(p);
      const firstPropertyLikeDecl = find(p.declarations, or(PropertyDeclaration.kind, isAccessor, isVariableDeclaration, PropertySignature.kind, isBinaryExpression, isPropertyAccessExpression));
      if (p.flags & SymbolFlags.Accessor && useAccessors) {
        const result: AccessorDeclaration[] = [];
        if (p.flags & SymbolFlags.SetAccessor) {
          result.push(
            setRange(
              new qc.SetAccessorDeclaration(
                undefined,
                qf.create.modifiersFromFlags(flag),
                name,
                [
                  new qc.ParameterDeclaration(
                    undefined,
                    undefined,
                    undefined,
                    'arg',
                    undefined,
                    isPrivate ? undefined : this.serializeTypeForDeclaration(getTypeOfSymbol(p), p, enclosingDeclaration, includePrivateSymbol, bundled)
                  ),
                ],
                undefined
              ),
              find(p.declarations, isSetAccessor) || firstPropertyLikeDecl
            )
          );
        }
        if (p.flags & SymbolFlags.GetAccessor) {
          const isPrivate = modifierFlags & ModifierFlags.Private;
          result.push(
            setRange(
              new qc.GetAccessorDeclaration(
                undefined,
                qf.create.modifiersFromFlags(flag),
                name,
                [],
                isPrivate ? undefined : this.serializeTypeForDeclaration(getTypeOfSymbol(p), p, enclosingDeclaration, includePrivateSymbol, bundled),
                undefined
              ),
              find(p.declarations, isGetAccessor) || firstPropertyLikeDecl
            )
          );
        }
        return result;
      } else if (p.flags & (SymbolFlags.Property | SymbolFlags.Variable)) {
        return setRange(
          createProperty(
            undefined,
            qf.create.modifiersFromFlags((isReadonlySymbol(p) ? ModifierFlags.Readonly : 0) | flag),
            name,
            p.flags & SymbolFlags.Optional ? new Token(Syntax.QuestionToken) : undefined,
            isPrivate ? undefined : this.serializeTypeForDeclaration(getTypeOfSymbol(p), p, enclosingDeclaration, includePrivateSymbol, bundled),
            undefined
          ),
          find(p.declarations, or(PropertyDeclaration.kind, isVariableDeclaration)) || firstPropertyLikeDecl
        );
      }
      if (p.flags & (SymbolFlags.Method | SymbolFlags.Function)) {
        const type = getTypeOfSymbol(p);
        const signatures = getSignaturesOfType(type, SignatureKind.Call);
        if (flag & ModifierFlags.Private) {
          return setRange(
            createProperty(
              undefined,
              qf.create.modifiersFromFlags((isReadonlySymbol(p) ? ModifierFlags.Readonly : 0) | flag),
              name,
              p.flags & SymbolFlags.Optional ? new Token(Syntax.QuestionToken) : undefined,
              undefined,
              undefined
            ),
            find(p.declarations, isFunctionLikeDeclaration) || (signatures[0] && signatures[0].declaration) || p.declarations[0]
          );
        }
        const results = [];
        for (const sig of signatures) {
          const decl = this.signatureToSignatureDeclarationHelper(sig, methodKind) as MethodDeclaration;
          decl.name = name;
          if (flag) decl.modifiers = new Nodes(qf.create.modifiersFromFlags(flag));
          if (p.flags & SymbolFlags.Optional) decl.questionToken = new Token(Syntax.QuestionToken);
          results.push(setRange(decl, sig.declaration));
        }
        return (results as unknown) as T[];
      }
      return fail(`Unhandled class member kind! ${(p as any).__debugFlags || p.flags}`);
    };
  }
  symbolTableToDeclarationStmts(symbolTable: SymbolTable, bundled?: boolean): Statement[] {
    const serializePropertySymbolForClass = this.makeSerializePropertySymbol<ClassElem>(createProperty, Syntax.MethodDeclaration, true);
    const serializePropertySymbolForInterfaceWorker = this.makeSerializePropertySymbol<TypeElem>(
      (_decorators, mods, name, question, type, initer) => new qc.PropertySignature(mods, name, question, type, initer),
      Syntax.MethodSignature,
      false
    );
    const enclosingDeclaration = this.enclosingDeclaration!;
    let results: Statement[] = [];
    const visitedSymbols: qu.QMap<true> = new QMap();
    let deferredPrivates: qu.QMap<Symbol> | undefined;
    const oldcontext = context;
    context = {
      ...oldcontext,
      usedSymbolNames: new QMap(),
      remappedSymbolNames: new QMap(),
      tracker: {
        ...oldthis.tracker,
        trackSymbol: (sym, decl, meaning) => {
          const accessibleResult = isSymbolAccessible(sym, decl, meaning, false);
          if (accessibleResult.accessibility === SymbolAccessibility.Accessible) {
            const chain = context.lookupSymbolChainWorker(sym, meaning);
            if (!(sym.flags & SymbolFlags.Property)) includePrivateSymbol(chain[0]);
          } else if (oldthis.tracker && oldthis.tracker.trackSymbol) {
            oldthis.tracker.trackSymbol(sym, decl, meaning);
          }
        },
      },
    };
    if (oldthis.usedSymbolNames) {
      oldthis.usedSymbolNames.forEach((_, name) => {
        this.usedSymbolNames!.set(name, true);
      });
    }
    forEachEntry(symbolTable, (symbol, name) => {
      const baseName = qy.get.unescUnderscores(name);
      void this.getInternalSymbol(baseName);
    });
    let addingDeclare = !bundled;
    const exportEquals = symbolTable.get(InternalSymbol.ExportEquals);
    if (exportEquals && symbolTable.size > 1 && exportEquals.flags & SymbolFlags.Alias) {
      symbolTable = new SymbolTable();
      symbolTable.set(InternalSymbol.ExportEquals, exportEquals);
    }
    visitSymbolTable(symbolTable);
    const flattenExportAssignedNamespace = (ss: Statement[]) => {
      const exportAssignment = find(ss, isExportAssignment);
      const ns = find(ss, isModuleDeclaration);
      if (
        ns &&
        exportAssignment &&
        exportAssignment.isExportEquals &&
        qf.is.kind(qc.Identifier, exportAssignment.expression) &&
        qf.is.kind(qc.Identifier, ns.name) &&
        idText(ns.name) === idText(exportAssignment.expression) &&
        ns.body &&
        qf.is.kind(qc.ModuleBlock, ns.body)
      ) {
        const excessExports = filter(ss, (s) => !!(qf.get.effectiveModifierFlags(s) & ModifierFlags.Export));
        if (length(excessExports)) {
          const getNamesOfDeclaration = (s: Statement): Identifier[] => {
            const isIdentifierAndNotUndefined = (n?: Node): n is Identifier => n?.kind === Syntax.Identifier;
            if (qf.is.kind(qc.VariableStatement, s)) return filter(map(s.declarationList.declarations, getNameOfDeclaration), isIdentifierAndNotUndefined);
            return filter([qf.get.declaration.nameOf(s as DeclarationStmt)], isIdentifierAndNotUndefined);
          };
          ns.body.statements = new Nodes([
            ...ns.body.statements,
            new qc.ExportDeclaration(
              undefined,
              undefined,
              new qc.NamedExports(
                map(
                  flatMap(excessExports, (e) => getNamesOfDeclaration(e)),
                  (id) => new qc.ExportSpecifier(undefined, id)
                )
              ),
              undefined
            ),
          ]);
        }
        if (!find(ss, (s) => s !== ns && qf.is.withName(s, ns.name as Identifier))) {
          results = [];
          forEach(ns.body.statements, (s) => {
            addResult(s, ModifierFlags.None);
          });
          ss = [...filter(ss, (s) => s !== ns && s !== exportAssignment), ...results];
        }
      }
      return ss;
    };
    const mergeExportDeclarations = (ss: Statement[]) => {
      const exports = filter(ss, (d) => qf.is.kind(qc.ExportDeclaration, d) && !d.moduleSpecifier && !!d.exportClause && qf.is.kind(qc.NamedExports, d.exportClause)) as ExportDeclaration[];
      if (length(exports) > 1) {
        const nonExports = filter(ss, (d) => !qf.is.kind(qc.ExportDeclaration, d) || !!d.moduleSpecifier || !d.exportClause);
        ss = [...nonExports, new qc.ExportDeclaration(undefined, undefined, new qc.NamedExports(flatMap(exports, (e) => cast(e.exportClause, isNamedExports).elems)), undefined)];
      }
      const reexports = filter(ss, (d) => qf.is.kind(qc.ExportDeclaration, d) && !!d.moduleSpecifier && !!d.exportClause && qf.is.kind(qc.NamedExports, d.exportClause)) as ExportDeclaration[];
      if (length(reexports) > 1) {
        const gs = group(reexports, (decl) => (qf.is.kind(qc.StringLiteral, decl.moduleSpecifier!) ? '>' + decl.moduleSpecifier.text : '>'));
        if (gs.length !== reexports.length) {
          for (const g of gs) {
            if (g.length > 1) {
              ss = [
                ...filter(ss, (s) => g.indexOf(s as ExportDeclaration) === -1),
                new qc.ExportDeclaration(undefined, undefined, new qc.NamedExports(flatMap(g, (e) => cast(e.exportClause, isNamedExports).elems)), g[0].moduleSpecifier),
              ];
            }
          }
        }
      }
      return ss;
    };
    const inlineExportModifiers = (ss: Statement[]) => {
      const exportDecl = find(ss, (d) => qf.is.kind(qc.ExportDeclaration, d) && !d.moduleSpecifier && !!d.exportClause) as ExportDeclaration | undefined;
      if (exportDecl && exportDecl.exportClause && qf.is.kind(qc.NamedExports, exportDecl.exportClause)) {
        const replacements = mapDefined(exportDecl.exportClause.elems, (e) => {
          if (!e.propertyName) {
            const associated = filter(ss, (s) => qf.is.withName(s, e.name));
            if (length(associated) && every(associated, canHaveExportModifier)) {
              const addExportModifier = (s: Statement) => {
                const f = (qf.get.effectiveModifierFlags(s) | ModifierFlags.Export) & ~ModifierFlags.Ambient;
                s.modifiers = new Nodes(qf.create.modifiersFromFlags(f));
                s.modifierFlagsCache = 0;
              };
              forEach(associated, addExportModifier);
              return;
            }
          }
          return e;
        });
        if (!length(replacements)) ss = filter(ss, (s) => s !== exportDecl);
        else exportDecl.exportClause.elems = new Nodes(replacements);
      }
      return ss;
    };
    const mergeRedundantStatements = (ss: Statement[]) => {
      ss = flattenExportAssignedNamespace(ss);
      ss = mergeExportDeclarations(ss);
      ss = inlineExportModifiers(ss);
      if (
        enclosingDeclaration &&
        ((qf.is.kind(qc.SourceFile, enclosingDeclaration) && qf.is.externalOrCommonJsModule(enclosingDeclaration)) || qf.is.kind(qc.ModuleDeclaration, enclosingDeclaration)) &&
        (!some(ss, isExternalModuleIndicator) || (!qf.has.scopeMarker(ss) && some(ss, qf.is.scopeMarkerNeeded)))
      ) {
        ss.push(qf.create.emptyExports());
      }
      return ss;
    };
    return mergeRedundantStatements(results);
    function addResult(n: Statement, flags: ModifierFlags) {
      let f: ModifierFlags = ModifierFlags.None;
      const isExportingScope = (n: Node) => {
        return (qf.is.kind(qc.SourceFile, n) && (qf.is.externalOrCommonJsModule(n) || qf.is.jsonSourceFile(n))) || (qf.is.ambientModule(n) && !qf.is.globalScopeAugmentation(n));
      };
      if (flags & ModifierFlags.Export && enclosingDeclaration && isExportingScope(enclosingDeclaration) && canHaveExportModifier(n)) {
        f |= ModifierFlags.Export;
      }
      if (
        addingDeclare &&
        !(f & ModifierFlags.Export) &&
        (!enclosingDeclaration || !(enclosingDeclaration.flags & NodeFlags.Ambient)) &&
        (qf.is.kind(qc.EnumDeclaration, n) || qf.is.kind(qc.VariableStatement, n) || qf.is.kind(qc.FunctionDeclaration, n) || qf.is.kind(qc.ClassDeclaration, n) || qf.is.kind(qc.ModuleDeclaration, n))
      ) {
        f |= ModifierFlags.Ambient;
      }
      if (flags & ModifierFlags.Default && (qf.is.kind(qc.ClassDeclaration, n) || qf.is.kind(qc.InterfaceDeclaration, n) || qf.is.kind(qc.FunctionDeclaration, n))) {
        f |= ModifierFlags.Default;
      }
      if (f) {
        n.modifiers = new Nodes(qf.create.modifiersFromFlags(f | qf.get.effectiveModifierFlags(n)));
        n.modifierFlagsCache = 0;
      }
      results.push(n);
    }
    function serializeAsNamespaceDeclaration(props: readonly Symbol[], localName: string, modifierFlags: ModifierFlags, suppressNewPrivateContext: boolean) {
      if (length(props)) {
        const localVsRemoteMap = arrayToMultiMap(props, (p) => (!length(p.declarations) || some(p.declarations, (d) => d.sourceFile === this.enclosingDeclaration!.sourceFile) ? 'local' : 'remote'));
        const localProps = localVsRemoteMap.get('local') || empty;
        const fakespace = new qc.ModuleDeclaration(undefined, undefined, new Identifier(localName), new qc.ModuleBlock([]), NodeFlags.Namespace);
        fakespace.flags ^= NodeFlags.Synthesized;
        fakespace.parent = enclosingDeclaration as SourceFile | NamespaceDeclaration;
        fakespace.locals = new SymbolTable(props);
        fakespace.symbol = props[0].parent!;
        const oldResults = results;
        results = [];
        const oldAddingDeclare = addingDeclare;
        addingDeclare = false;
        const subcontext = { ...context, enclosingDeclaration: fakespace };
        const oldContext = context;
        context = subcontext;
        visitSymbolTable(new SymbolTable(localProps), suppressNewPrivateContext, true);
        context = oldContext;
        addingDeclare = oldAddingDeclare;
        const declarations = results;
        results = oldResults;
        fakespace.flags ^= NodeFlags.Synthesized;
        fakespace.parent = undefined!;
        fakespace.locals = undefined!;
        fakespace.symbol = undefined!;
        fakespace.body = new qc.ModuleBlock(declarations);
        addResult(fakespace, modifierFlags);
      }
    }
    function serializeExportSpecifier(localName: string, targetName: string, specifier?: Expression) {
      addResult(
        new qc.ExportDeclaration(undefined, undefined, new qc.NamedExports([new qc.ExportSpecifier(localName !== targetName ? targetName : undefined, localName)]), specifier),
        ModifierFlags.None
      );
    }
    function isTypeRepresentableAsFunctionNamespaceMerge(typeToSerialize: Type, hostSymbol: Symbol) {
      const ctxSrc = this.enclosingDeclaration.sourceFile;
      return (
        getObjectFlags(typeToSerialize) & (ObjectFlags.Anonymous | ObjectFlags.Mapped) &&
        !getIndexInfoOfType(typeToSerialize, IndexKind.String) &&
        !getIndexInfoOfType(typeToSerialize, IndexKind.Number) &&
        !!(length(getPropertiesOfType(typeToSerialize)) || length(getSignaturesOfType(typeToSerialize, SignatureKind.Call))) &&
        !length(getSignaturesOfType(typeToSerialize, SignatureKind.Construct)) &&
        !getDeclarationWithTypeAnnotation(hostSymbol, enclosingDeclaration) &&
        !(typeToSerialize.symbol && some(typeToSerialize.symbol.declarations, (d) => d.sourceFile !== ctxSrc)) &&
        !some(getPropertiesOfType(typeToSerialize), (p) => isLateBoundName(p.escName)) &&
        !some(getPropertiesOfType(typeToSerialize), (p) => some(p.declarations, (d) => d.sourceFile !== ctxSrc)) &&
        every(getPropertiesOfType(typeToSerialize), (p) => qy.is.identifierText(p.name) && !qy.is.stringAndKeyword(p.name))
      );
    }
    function serializePropertySymbolForInterface(p: Symbol, baseType: Type | undefined) {
      return serializePropertySymbolForInterfaceWorker(p, false, baseType);
    }
  }
  createNodeBuilder() {
    return {
      typeToTypeNode: (type: Type, enclosingDeclaration?: Node, flags?: NodeBuilderFlags, tracker?: SymbolTracker) =>
        withContext(enclosingDeclaration, flags, tracker, (c) => c.typeToTypeNodeHelper(type)),
      indexInfoToIndexSignatureDeclaration: (indexInfo: IndexInfo, kind: IndexKind, enclosingDeclaration?: Node, flags?: NodeBuilderFlags, tracker?: SymbolTracker) =>
        withContext(enclosingDeclaration, flags, tracker, (c) => c.indexInfoToIndexSignatureDeclarationHelper(indexInfo, kind)),
      signatureToSignatureDeclaration: (signature: Signature, kind: Syntax, enclosingDeclaration?: Node, flags?: NodeBuilderFlags, tracker?: SymbolTracker) =>
        withContext(enclosingDeclaration, flags, tracker, (c) => c.signatureToSignatureDeclarationHelper(signature, kind)),
      symbolToEntityName: (symbol: Symbol, meaning: SymbolFlags, enclosingDeclaration?: Node, flags?: NodeBuilderFlags, tracker?: SymbolTracker) =>
        withContext(enclosingDeclaration, flags, tracker, (c) => c.symbolToName(symbol, meaning, false)),
      symbolToExpression: (symbol: Symbol, meaning: SymbolFlags, enclosingDeclaration?: Node, flags?: NodeBuilderFlags, tracker?: SymbolTracker) =>
        withContext(enclosingDeclaration, flags, tracker, (c) => c.symbolToExpression(symbol, meaning)),
      symbolToTypeParameterDeclarations: (symbol: Symbol, enclosingDeclaration?: Node, flags?: NodeBuilderFlags, tracker?: SymbolTracker) =>
        withContext(enclosingDeclaration, flags, tracker, (c) => c.typeParametersToTypeParameterDeclarations(symbol)),
      symbolToParameterDeclaration: (symbol: Symbol, enclosingDeclaration?: Node, flags?: NodeBuilderFlags, tracker?: SymbolTracker) =>
        withContext(enclosingDeclaration, flags, tracker, (c) => c.symbolToParameterDeclaration(symbol)),
      typeParameterToDeclaration: (parameter: TypeParameter, enclosingDeclaration?: Node, flags?: NodeBuilderFlags, tracker?: SymbolTracker) =>
        withContext(enclosingDeclaration, flags, tracker, (c) => c.typeParameterToDeclaration(parameter)),
      symbolTableToDeclarationStmts: (symbolTable: SymbolTable, enclosingDeclaration?: Node, flags?: NodeBuilderFlags, tracker?: SymbolTracker, bundled?: boolean) =>
        withContext(enclosingDeclaration, flags, tracker, (c) => c.symbolTableToDeclarationStmts(symbolTable, bundled)),
    };
    function withContext<T>(enclosingDeclaration: Node | undefined, flags: NodeBuilderFlags | undefined, tracker: SymbolTracker | undefined, cb: (context: QContext) => T): T | undefined {
      assert(enclosingDeclaration === undefined || (enclosingDeclaration.flags & NodeFlags.Synthesized) === 0);
      const context: QContext = {
        enclosingDeclaration,
        flags: flags || NodeBuilderFlags.None,
        tracker:
          tracker && tracker.trackSymbol
            ? tracker
            : {
                trackSymbol: noop,
                moduleResolverHost:
                  flags! & NodeBuilderFlags.DoNotIncludeSymbolChain
                    ? {
                        getCommonSourceDirectory: !!(host as Program).getCommonSourceDirectory ? () => (host as Program).getCommonSourceDirectory() : () => '',
                        getSourceFiles: () => host.getSourceFiles(),
                        getCurrentDirectory: () => host.getCurrentDirectory(),
                        getProbableSymlinks: maybeBind(host, host.getProbableSymlinks),
                        useCaseSensitiveFileNames: maybeBind(host, host.useCaseSensitiveFileNames),
                        redirectTargetsMap: host.redirectTargetsMap,
                        getProjectReferenceRedirect: (fileName) => host.getProjectReferenceRedirect(fileName),
                        isSourceOfProjectReferenceRedirect: (fileName) => host.isSourceOfProjectReferenceRedirect(fileName),
                        fileExists: (fileName) => host.fileExists(fileName),
                      }
                    : undefined,
              },
        encounteredError: false,
        visitedTypes: undefined,
        symbolDepth: undefined,
        inferTypeParameters: undefined,
        approximateLength: 0,
      };
      const resultingNode = cb(context);
      return this.encounteredError ? undefined : resultingNode;
    }
  }
}
