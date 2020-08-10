import * as qc from '../core';
import { ModifierFlags, Node, NodeBuilderFlags, ObjectFlags, TypeFlags } from '../type';
import * as qt from '../type';
import * as qu from '../util';
import { Syntax } from '../syntax';
import * as qy from '../syntax';
import { qf } from './index';
function existingTypeNodeIsNotReferenceOrIsReferenceWithCompatibleTypeArgCount(existing: Typing, type: Type) {
  return !(getObjectFlags(type) & ObjectFlags.Reference) || !existing.kind === Syntax.TypingReference || length(existing.typeArgs) >= getMinTypeArgCount((type as TypeReference).target.typeParams);
}
export class QContext {
  enclosingDeclaration?: Node;
  flags: NodeBuilderFlags;
  tracker: SymbolTracker;
  encounteredError: boolean;
  visitedTypes?: qu.QMap<true>;
  symbolDepth?: qu.QMap<number>;
  inferTypeParams?: TypeParam[];
  approximateLength: number;
  truncating?: boolean;
  typeParamSymbolList?: qu.QMap<true>;
  typeParamNames?: qu.QMap<Identifier>;
  typeParamNamesByText?: qu.QMap<true>;
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
    if (isThisTypeParam(type)) {
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
      const typeArgNodes = this.mapToTypeNodes(type.aliasTypeArgs);
      if (qy.is.reservedName(type.aliasSymbol.escName) && !(type.aliasSymbol.flags & SymbolFlags.Class)) return new qc.TypingReference(new Identifier(''), typeArgNodes);
      return this.symbolToTypeNode(type.aliasSymbol, SymbolFlags.Type, typeArgNodes);
    }
    const objectFlags = getObjectFlags(type);
    if (objectFlags & ObjectFlags.Reference) {
      assert(!!(type.flags & TypeFlags.Object));
      return (<TypeReference>type).node ? this.visitAndTransformType(type, this.typeReferenceToTypeNode) : this.typeReferenceToTypeNode(<TypeReference>type);
    }
    if (type.flags & TypeFlags.TypeParam || objectFlags & ObjectFlags.ClassOrInterface) {
      if (type.flags & TypeFlags.TypeParam && contains(this.inferTypeParams, type)) {
        this.approximateLength += type.symbol.name.length + 6;
        return new qc.InferTyping(this.typeParamToDeclarationWithConstraint(type as TypeParam, undefined));
      }
      if (this.flags & NodeBuilderFlags.GenerateNamesForShadowedTypeParams && type.flags & TypeFlags.TypeParam && !isTypeSymbolAccessible(type.symbol, this.enclosingDeclaration)) {
        const name = this.typeParamToName(type);
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
      const saveInferTypeParams = this.inferTypeParams;
      this.inferTypeParams = (<ConditionalType>type).root.inferTypeParams;
      const extendsTypeNode = this.typeToTypeNodeHelper((<ConditionalType>type).extendsType);
      this.inferTypeParams = saveInferTypeParams;
      const trueTypeNode = this.typeToTypeNodeHelper(getTrueTypeFromConditionalType(<ConditionalType>type));
      const falseTypeNode = this.typeToTypeNodeHelper(getFalseTypeFromConditionalType(<ConditionalType>type));
      this.approximateLength += 15;
      return new qc.ConditionalTyping(checkTypeNode, extendsTypeNode, trueTypeNode, falseTypeNode);
    }
    if (type.flags & TypeFlags.Substitution) return this.typeToTypeNodeHelper((<SubstitutionType>type).baseType);
    return fail('Should be unreachable.');
    function appendReferenceToType(root: TypingReference | ImportTyping, ref: TypingReference): TypingReference | ImportTyping {
      if (root.kind === Syntax.ImportTyping) {
        const innerParams = root.typeArgs;
        if (root.qualifier) {
          (root.qualifier.kind === Syntax.Identifier ? root.qualifier : root.qualifier.right).typeArgs = innerParams;
        }
        root.typeArgs = ref.typeArgs;
        const ids = getAccessStack(ref);
        for (const id of ids) {
          root.qualifier = root.qualifier ? new qc.QualifiedName(root.qualifier, id) : id;
        }
        return root;
      } else {
        const innerParams = root.typeArgs;
        (root.typeName.kind === Syntax.Identifier ? root.typeName : root.typeName.right).typeArgs = innerParams;
        root.typeArgs = ref.typeArgs;
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
      while (!state.kind === Syntax.Identifier) {
        ids.unshift(state.right);
        state = state.left;
      }
      ids.unshift(state);
      return ids;
    }
  }
  typeParamsToTypeParamDeclarations(s: Symbol) {
    let typeParamNodes: Nodes<TypeParamDeclaration> | undefined;
    const targetSymbol = getTargetSymbol(symbol);
    if (targetSymbol.flags & (SymbolFlags.Class | SymbolFlags.Interface | SymbolFlags.TypeAlias)) {
      typeParamNodes = new Nodes(map(this.getLocalTypeParamsOfClassOrInterfaceOrTypeAlias(), (tp) => typeParamToDeclaration(tp, this)));
    }
    return typeParamNodes;
  }
  lookupTypeParamNodes(chain: Symbol[], index: number) {
    assert(chain && 0 <= index && index < chain.length);
    const symbol = chain[index];
    const symbolId = '' + symbol.getId();
    if (this.typeParamSymbolList && this.typeParamSymbolList.get(symbolId)) return;
    (this.typeParamSymbolList || (this.typeParamSymbolList = new QMap())).set(symbolId, true);
    let typeParamNodes: readonly Typing[] | readonly TypeParamDeclaration[] | undefined;
    if (this.flags & NodeBuilderFlags.WriteTypeParamsInQualifiedName && index < chain.length - 1) {
      const parentSymbol = symbol;
      const nextSymbol = chain[index + 1];
      if (nextSymbol.checkFlags() & CheckFlags.Instantiated) {
        const params = getTypeParamsOfClassOrInterface(parentSymbol.flags & SymbolFlags.Alias ? parentSymbol.resolveAlias() : parentSymbol);
        typeParamNodes = mapToTypeNodes(
          map(params, (t) => getMappedType(t, (nextSymbol as TransientSymbol).mapper!)),
          this
        );
      } else typeParamNodes = symbol.typeParamsToTypeParamDeclarations(this);
    }
    return typeParamNodes;
  }
  getSpecifierForModuleSymbol(s: Symbol) {
    let file = s.declarationOfKind<SourceFile>(Syntax.SourceFile);
    if (!file) {
      const equivalentFileSymbol = firstDefined(s.declarations, (d) => getFileSymbolIfFileSymbolExportEqualsContainer(d, s));
      if (equivalentFileSymbol) file = equivalentFileSymbol.declarationOfKind<SourceFile>(Syntax.SourceFile);
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
      return s.nonAugmentationDeclaration()!.sourceFile.fileName;
    }
    const contextFile = qf.get.originalOf(this.enclosingDeclaration).sourceFile;
    const ls = s.getLinks();
    let spec = ls.specCache && ls.specCache.get(contextFile.path);
    if (!spec) {
      const isBundle = compilerOpts.out || compilerOpts.outFile;
      const { moduleResolverHost } = this.tracker;
      const specCompilerOpts = isBundle ? { ...compilerOpts, baseUrl: moduleResolverHost.getCommonSourceDirectory() } : compilerOpts;
      spec = first(
        moduleSpecifiers.getModuleSpecifiers(s, specCompilerOpts, contextFile, moduleResolverHost, {
          importModuleSpecifierPreference: isBundle ? 'non-relative' : 'relative',
        })
      );
      ls.specCache = ls.specCache || new QMap();
      ls.specCache.set(contextFile.path, spec);
    }
    return spec;
  }
  lookupSymbolChain(s: Symbol, meaning: SymbolFlags, yieldModuleSymbol?: boolean) {
    this.tracker.trackSymbol!(s, this.enclosingDeclaration, meaning);
    return this.lookupSymbolChainWorker(s, meaning, yieldModuleSymbol);
  }
  lookupSymbolChainWorker(s: Symbol, meaning: SymbolFlags, yieldModuleSymbol?: boolean) {
    let chain: Symbol[];
    const isTypeParam = s.flags & SymbolFlags.TypeParam;
    if (!isTypeParam && (this.enclosingDeclaration || this.flags & NodeBuilderFlags.UseFullyQualifiedType) && !(this.flags & NodeBuilderFlags.DoNotIncludeSymbolChain)) {
      const getSymbolChain = (s: Symbol, meaning: SymbolFlags, endOfChain: boolean): Symbol[] | undefined => {
        let accessibleSymbolChain = qf.get.accessibleSymbolChain(s, this.enclosingDeclaration, meaning, !!(this.flags & NodeBuilderFlags.UseOnlyExternalAliasing));
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
                if (parent.exports && parent.exports.get(InternalSymbol.ExportEquals) && qf.get.symbolIfSameReference(parent.exports.get(InternalSymbol.ExportEquals)!, s)) {
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
          const specA = parentSpecifiers[a];
          const specB = parentSpecifiers[b];
          if (specA && specB) {
            const isBRelative = pathIsRelative(specB);
            if (pathIsRelative(specA) === isBRelative) return moduleSpecifiers.countPathComponents(specA) - moduleSpecifiers.countPathComponents(specB);
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
  symbolToTypeNode(s: Symbol, meaning: SymbolFlags, overrideTypeArgs?: readonly Typing[]): Typing {
    const chain = this.lookupSymbolChain(s, meaning, !(this.flags & NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope));
    const isTypeOf = meaning === SymbolFlags.Value;
    const createAccessFromSymbolChain = (chain: Symbol[], index: number, stopper: number): EntityName | IndexedAccessTyping => {
      const typeParamNodes = index === chain.length - 1 ? overrideTypeArgs : this.lookupTypeParamNodes(chain, index);
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
            if (qf.get.symbolIfSameReference(ex, symbol) && !isLateBoundName(name) && name !== InternalSymbol.ExportEquals) {
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
        qf.get.membersOfSymbol(parent) &&
        qf.get.membersOfSymbol(parent).get(symbol.escName) &&
        qf.get.symbolIfSameReference(qf.get.membersOfSymbol(parent).get(symbol.escName)!, symbol)
      ) {
        const LHS = createAccessFromSymbolChain(chain, index - 1, stopper);
        if (LHS.kind === Syntax.IndexedAccessTyping) return new qc.IndexedAccessTyping(LHS, new qc.LiteralTyping(qc.asLiteral(symbolName)));
        return new qc.IndexedAccessTyping(new qc.TypingReference(LHS, typeParamNodes as readonly Typing[]), new qc.LiteralTyping(qc.asLiteral(symbolName)));
      }
      const identifier = setEmitFlags(new Identifier(symbolName, typeParamNodes), EmitFlags.NoAsciiEscaping);
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
      const typeParamNodes = overrideTypeArgs || this.lookupTypeParamNodes(chain, 0);
      const spec = this.getSpecifierForModuleSymbol(chain[0]);
      if (!(this.flags & NodeBuilderFlags.AllowNodeModulesRelativePaths) && getEmitModuleResolutionKind(compilerOpts) === ModuleResolutionKind.NodeJs && spec.indexOf('/node_modules/') >= 0) {
        this.encounteredError = true;
        if (this.tracker.reportLikelyUnsafeImportRequiredError) {
          this.tracker.reportLikelyUnsafeImportRequiredError(spec);
        }
      }
      const lit = new qc.LiteralTyping(qc.asLiteral(spec));
      if (this.tracker.trackExternalModuleSymbolOfImportTyping) this.tracker.trackExternalModuleSymbolOfImportTyping(chain[0]);
      this.approximateLength += spec.length + 10;
      if (!nonRootParts || qf.is.entityName(nonRootParts)) {
        if (nonRootParts) {
          const lastId = nonRootParts.kind === Syntax.Identifier ? nonRootParts : nonRootParts.right;
          lastId.typeArgs = undefined;
        }
        return new qc.ImportTyping(lit, nonRootParts as EntityName, typeParamNodes as readonly Typing[], isTypeOf);
      } else {
        const splitNode = getTopmostIndexedAccessType(nonRootParts);
        const qualifier = (splitNode.objectType as TypingReference).typeName;
        return qc.IndexedAccessTyping(new qc.ImportTyping(lit, qualifier, typeParamNodes as readonly Typing[], isTypeOf), splitNode.indexType);
      }
    }
    const entityName = createAccessFromSymbolChain(chain, chain.length - 1, 0);
    if (entityName.kind === Syntax.IndexedAccessTyping) return entityName;
    if (isTypeOf) return new qc.TypingQuery(entityName);
    const lastId = entityName.kind === Syntax.Identifier ? entityName : entityName.right;
    const lastTypeArgs = lastId.typeArgs;
    lastId.typeArgs = undefined;
    return new qc.TypingReference(entityName, lastTypeArgs as Nodes<Typing>);
  }
  typeParamShadowsNameInScope(escName: __String, type: TypeParam) {
    const result = resolveName(this.enclosingDeclaration, escName, SymbolFlags.Type, undefined, escName, false);
    if (result) {
      if (result.flags & SymbolFlags.TypeParam && result === type.symbol) return false;
      return true;
    }
    return false;
  }
  typeParamToName(type: TypeParam) {
    if (this.flags & NodeBuilderFlags.GenerateNamesForShadowedTypeParams && this.typeParamNames) {
      const cached = this.typeParamNames.get('' + getTypeId(type));
      if (cached) return cached;
    }
    let result = this.symbolToName(type.symbol, SymbolFlags.Type, true);
    if (!(result.kind & Syntax.Identifier)) return new Identifier('(Missing type param)');
    if (this.flags & NodeBuilderFlags.GenerateNamesForShadowedTypeParams) {
      const rawtext = result.escapedText as string;
      let i = 0;
      let text = rawtext;
      while ((this.typeParamNamesByText && this.typeParamNamesByText.get(text)) || this.typeParamShadowsNameInScope(text as __String, type)) {
        i++;
        text = `${rawtext}_${i}`;
      }
      if (text !== rawtext) result = new Identifier(text, result.typeArgs);
      (this.typeParamNames || (this.typeParamNames = new QMap())).set('' + getTypeId(type), result);
      (this.typeParamNamesByText || (this.typeParamNamesByText = new QMap())).set(result.escapedText as string, true);
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
      const typeParamNodes = this.lookupTypeParamNodes(chain, index);
      const symbol = chain[index];
      if (index === 0) {
        this.flags |= NodeBuilderFlags.InInitialEntityName;
      }
      const symbolName = symbol.getNameOfSymbolAsWritten(this);
      if (index === 0) {
        this.flags ^= NodeBuilderFlags.InInitialEntityName;
      }
      const identifier = setEmitFlags(new Identifier(symbolName, typeParamNodes), EmitFlags.NoAsciiEscaping);
      identifier.symbol = symbol;
      return index > 0 ? new qc.QualifiedName(createEntityNameFromSymbolChain(chain, index - 1), identifier) : identifier;
    }
  }
  symbolToExpression(s: Symbol, meaning: SymbolFlags) {
    const chain = this.lookupSymbolChain(s, meaning);
    return createExpressionFromSymbolChain(chain, chain.length - 1);
    function createExpressionFromSymbolChain(chain: Symbol[], index: number): Expression {
      const typeParamNodes = this.lookupTypeParamNodes(chain, index);
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
        const identifier = setEmitFlags(new Identifier(symbolName, typeParamNodes), EmitFlags.NoAsciiEscaping);
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
          expression = setEmitFlags(new Identifier(symbolName, typeParamNodes), EmitFlags.NoAsciiEscaping);
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
    if (s.isKnown()) return new qc.ComputedPropertyName(new qc.PropertyAccessExpression(new Identifier('Symbol'), (s.escName as string).substr(3)));
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
    const propertyIsReverseMapped = !!(propertySymbol.checkFlags() & CheckFlags.ReverseMapped);
    const propertyType = propertyIsReverseMapped && this.flags & NodeBuilderFlags.InReverseMappedType ? anyType : qf.get.typeOfSymbol(propertySymbol);
    const saveEnclosingDeclaration = this.enclosingDeclaration;
    this.enclosingDeclaration = undefined;
    if (this.tracker.trackSymbol && propertySymbol.checkFlags() & CheckFlags.Late) {
      const decl = first(propertySymbol.declarations);
      if (hasLateBindableName(decl)) {
        if (decl.kind === Syntax.BinaryExpression) {
          const name = qf.get.declaration.nameOf(decl);
          if (name && name.kind === Syntax.ElemAccessExpression && qf.is.propertyAccessEntityNameExpression(name.argExpression)) {
            this.trackComputedName(name.argExpression, saveEnclosingDeclaration);
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
    const indexingParam = new qc.ParamDeclaration(undefined, undefined, undefined, name, undefined, indexerTypeNode, undefined);
    const typeNode = this.typeToTypeNodeHelper(indexInfo.type || anyType);
    if (!indexInfo.type && !(this.flags & NodeBuilderFlags.AllowEmptyIndexInfoType)) this.encounteredError = true;
    this.approximateLength += name.length + 4;
    return new qc.IndexSignatureDeclaration(undefined, indexInfo.isReadonly ? [new Token(Syntax.ReadonlyKeyword)] : undefined, [indexingParam], typeNode);
  }
  signatureToSignatureDeclarationHelper(signature: Signature, kind: Syntax, privateSymbolVisitor?: (s: Symbol) => void, bundledImports?: boolean): SignatureDeclaration {
    const suppressAny = this.flags & NodeBuilderFlags.SuppressAnyReturnType;
    if (suppressAny) this.flags &= ~NodeBuilderFlags.SuppressAnyReturnType;
    let typeParams: TypeParamDeclaration[] | undefined;
    let typeArgs: Typing[] | undefined;
    if (this.flags & NodeBuilderFlags.WriteTypeArgsOfSignature && signature.target && signature.mapper && signature.target.typeParams) {
      typeArgs = signature.target.typeParams.map((param) => this.typeToTypeNodeHelper(instantiateType(param, signature.mapper)));
    } else {
      typeParams = signature.typeParams && signature.typeParams.map((param) => this.typeParamToDeclaration(param));
    }
    const params = getExpandedParams(signature, true)[0].map((param) => this.symbolToParamDeclaration(param, kind === Syntax.Constructor, privateSymbolVisitor, bundledImports));
    if (signature.thisParam) {
      const thisParam = this.symbolToParamDeclaration(signature.thisParam);
      params.unshift(thisParam);
    }
    let returnTypeNode: Typing | undefined;
    const typePredicate = getTypePredicateOfSignature(signature);
    if (typePredicate) {
      const assertsModifier = typePredicate.kind === TypePredicateKind.AssertsThis || typePredicate.kind === TypePredicateKind.AssertsIdentifier ? new Token(Syntax.AssertsKeyword) : undefined;
      const paramName =
        typePredicate.kind === TypePredicateKind.Identifier || typePredicate.kind === TypePredicateKind.AssertsIdentifier
          ? setEmitFlags(new Identifier(typePredicate.paramName), EmitFlags.NoAsciiEscaping)
          : new qc.ThisTyping();
      const typeNode = typePredicate.type && this.typeToTypeNodeHelper(typePredicate.type);
      returnTypeNode = new qc.TypingPredicate(assertsModifier, paramName, typeNode);
    } else {
      const returnType = qf.get.returnTypeOfSignature(signature);
      if (returnType && !(suppressAny && qf.is.typeAny(returnType))) {
        returnTypeNode = this.serializeReturnTypeForSignature(returnType, signature, privateSymbolVisitor, bundledImports);
      } else if (!suppressAny) {
        returnTypeNode = new qc.KeywordTyping(Syntax.AnyKeyword);
      }
    }
    this.approximateLength += 3;
    return new qc.SignatureDeclaration(kind, typeParams, params, returnTypeNode, typeArgs);
  }
  typeParamToDeclarationWithConstraint(type: TypeParam, constraintNode: Typing | undefined): TypeParamDeclaration {
    const savedContextFlags = this.flags;
    this.flags &= ~NodeBuilderFlags.WriteTypeParamsInQualifiedName;
    const name = this.typeParamToName(type);
    const defaultParam = getDefaultFromTypeParam(type);
    const defaultParamNode = defaultParam && this.typeToTypeNodeHelper(defaultParam);
    this.flags = savedContextFlags;
    return new qc.TypeParamDeclaration(name, constraintNode, defaultParamNode);
  }
  typeParamToDeclaration(type: TypeParam, constraint = qf.get.constraintOfTypeParam(type)): TypeParamDeclaration {
    const constraintNode = constraint && this.typeToTypeNodeHelper(constraint);
    return this.typeParamToDeclarationWithConstraint(type, constraintNode);
  }
  symbolToParamDeclaration(s: Symbol, preserveModifierFlags?: boolean, privateSymbolVisitor?: (s: Symbol) => void, bundledImports?: boolean): ParamDeclaration {
    let paramDeclaration: ParamDeclaration | DocParamTag | undefined = s.declarationOfKind<ParamDeclaration>(Syntax.Param);
    if (!paramDeclaration && !s.isTransient()) {
      paramDeclaration = s.declarationOfKind<DocParamTag>(Syntax.DocParamTag);
    }
    let paramType = qf.get.typeOfSymbol(s);
    if (paramDeclaration && isRequiredInitializedParam(paramDeclaration)) paramType = getOptionalType(paramType);
    const paramTypeNode = this.serializeTypeForDeclaration(paramType, s, this.enclosingDeclaration, privateSymbolVisitor, bundledImports);
    const modifiers =
      !(this.flags & NodeBuilderFlags.OmitParamModifiers) && preserveModifierFlags && paramDeclaration && paramDeclaration.modifiers ? paramDeclaration.modifiers.map(getSynthesizedClone) : undefined;
    const isRest = (paramDeclaration && qf.is.restParam(paramDeclaration)) || s.checkFlags() & CheckFlags.RestParam;
    const dot3Token = isRest ? new Token(Syntax.Dot3Token) : undefined;
    const cloneBindingName = (node: BindingName): BindingName => {
      const elideIniterAndSetEmitFlags = (node: Node): Node => {
        if (this.tracker.trackSymbol && node.kind === Syntax.ComputedPropertyName && qf.is.lateBindableName(node)) {
          this.trackComputedName(node.expression, this.enclosingDeclaration);
        }
        const visited = visitEachChild(node, elideIniterAndSetEmitFlags, nullTrafoContext, undefined, elideIniterAndSetEmitFlags)!;
        const clone = isSynthesized(visited) ? visited : getSynthesizedClone(visited);
        if (clone.kind === Syntax.BindingElem) (<BindingElem>clone).initer = undefined;
        return setEmitFlags(clone, EmitFlags.SingleLine | EmitFlags.NoAsciiEscaping);
      };
      return <BindingName>elideIniterAndSetEmitFlags(node as Node);
    };
    const name = paramDeclaration
      ? paramDeclaration.name
        ? paramDeclaration.name.kind === Syntax.Identifier
          ? setEmitFlags(getSynthesizedClone(paramDeclaration.name), EmitFlags.NoAsciiEscaping)
          : paramDeclaration.name.kind === Syntax.QualifiedName
          ? setEmitFlags(getSynthesizedClone(paramDeclaration.name.right), EmitFlags.NoAsciiEscaping)
          : cloneBindingName(paramDeclaration.name)
        : s.name
      : s.name;
    const isOptional = (paramDeclaration && isOptionalParam(paramDeclaration)) || s.checkFlags() & CheckFlags.OptionalParam;
    const questionToken = isOptional ? new Token(Syntax.QuestionToken) : undefined;
    const paramNode = new qc.ParamDeclaration(undefined, modifiers, dot3Token, name, questionToken, paramTypeNode, undefined);
    this.approximateLength += s.name.length + 3;
    return paramNode;
  }
  trackComputedName(accessExpression: EntityNameOrEntityNameExpression, enclosingDeclaration: Node | undefined) {
    if (!this.tracker.trackSymbol) return;
    const firstIdentifier = qf.get.firstIdentifier(accessExpression);
    const name = resolveName(firstIdentifier, firstIdentifier.escapedText, SymbolFlags.Value | SymbolFlags.ExportValue, undefined, undefined, true);
    if (name) this.tracker.trackSymbol(name, enclosingDeclaration, SymbolFlags.Value);
  }
  getTopmostIndexedAccessType(top: IndexedAccessTyping): IndexedAccessTyping {
    if (top.objectType.kind === Syntax.IndexedAccessTyping) return getTopmostIndexedAccessType(top.objectType);
    return top;
  }
  isSingleQuotedStringNamed(d: Declaration) {
    const name = qf.get.declaration.nameOf(d);
    if (name && name.kind === Syntax.StringLiteral && (name.singleQuote || (!isSynthesized(name) && startsWith(qf.get.textOf(name, false), "'")))) return true;
    return false;
  }
  createPropertyNameNodeForIdentifierOrLiteral(name: string, singleQuote?: boolean) {
    return qy.is.identifierText(name) ? new Identifier(name) : qc.asLiteral(NumericLiteral.name(name) && +name >= 0 ? +name : name, !!singleQuote);
  }
  cloneQContext(): QContext {
    const initial: QContext = { ...this };
    if (initial.typeParamNames) initial.typeParamNames = cloneMap(initial.typeParamNames);
    if (initial.typeParamNamesByText) initial.typeParamNamesByText = cloneMap(initial.typeParamNamesByText);
    if (initial.typeParamSymbolList) initial.typeParamSymbolList = cloneMap(initial.typeParamSymbolList);
    return initial;
  }
  serializeTypeForDeclaration(type: Type, symbol: Symbol, enclosingDeclaration: Node | undefined, includePrivateSymbol?: (s: Symbol) => void, bundled?: boolean) {
    if (type !== errorType && enclosingDeclaration) {
      const declWithExistingAnnotation = getDeclarationWithTypeAnnotation(symbol, enclosingDeclaration);
      if (declWithExistingAnnotation && !qf.is.functionLikeDeclaration(declWithExistingAnnotation)) {
        const existing = qf.get.effectiveTypeAnnotationNode(declWithExistingAnnotation)!;
        if (qf.get.typeFromTypeNode(existing) === type && existingTypeNodeIsNotReferenceOrIsReferenceWithCompatibleTypeArgCount(existing, type)) {
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
        instantiateType(qf.get.typeFromTypeNode(annotation), signature.mapper) === type &&
        existingTypeNodeIsNotReferenceOrIsReferenceWithCompatibleTypeArgCount(annotation, type)
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
    if (node.kind === Syntax.DocAllTyping || node.kind === Syntax.DocNamepathTyping) return new qc.KeywordTyping(Syntax.AnyKeyword);
    if (node.kind === Syntax.DocUnknownTyping) return new qc.KeywordTyping(Syntax.UnknownKeyword);
    if (node.kind === Syntax.DocNullableTyping) return new qc.UnionTyping([visitNode(node.type, this.visitExistingNodeTreeSymbols), new qc.KeywordTyping(Syntax.NullKeyword)]);
    if (node.kind === Syntax.DocOptionalTyping) return new qc.UnionTyping([visitNode(node.type, this.visitExistingNodeTreeSymbols), new qc.KeywordTyping(Syntax.UndefinedKeyword)]);
    if (node.kind === Syntax.DocNonNullableTyping) return visitNode(node.type, this.visitExistingNodeTreeSymbols);
    if (node.kind === Syntax.DocVariadicTyping) return new ArrayTyping(visitNode((node as DocVariadicTyping).type, this.visitExistingNodeTreeSymbols));
    if (node.kind === Syntax.DocTypingLiteral) {
      return new qc.TypingLiteral(
        map(node.docPropertyTags, (t) => {
          const name = t.name.kind === Syntax.Identifier ? t.name : t.name.right;
          const typeViaParent = qf.get.typeOfPropertyOfType(qf.get.typeFromTypeNode(node), name.escapedText);
          const overrideTypeNode = typeViaParent && t.typeExpression && qf.get.typeFromTypeNode(t.typeExpression.type) !== typeViaParent ? this.typeToTypeNodeHelper(typeViaParent) : undefined;
          return new qc.PropertySignature(
            undefined,
            name,
            t.typeExpression && t.typeExpression.type.kind === Syntax.DocOptionalTyping ? new Token(Syntax.QuestionToken) : undefined,
            overrideTypeNode || (t.typeExpression && visitNode(t.typeExpression.type, this.visitExistingNodeTreeSymbols)) || new qc.KeywordTyping(Syntax.AnyKeyword),
            undefined
          );
        })
      );
    }
    if (node.kind === Syntax.TypingReference && node.typeName.kind === Syntax.Identifier && node.typeName.escapedText === '') return new qc.KeywordTyping(Syntax.AnyKeyword).setOriginal(node);
    if ((node.kind === Syntax.ExpressionWithTypings || node.kind === Syntax.TypingReference) && qf.is.docIndexSignature(node)) {
      return new qc.TypingLiteral([
        new qc.IndexSignatureDeclaration(
          undefined,
          undefined,
          [new qc.ParamDeclaration(undefined, undefined, undefined, 'x', undefined, visitNode(node.typeArgs![0], visitExistingNodeTreeSymbols))],
          visitNode(node.typeArgs![1], this.visitExistingNodeTreeSymbols)
        ),
      ]);
    }
    if (node.kind === Syntax.DocFunctionTyping) {
      const getEffectiveDotDotDotForParam = (p: ParamDeclaration) => {
        return p.dot3Token || (p.type && p.type.kind === Syntax.DocVariadicTyping ? new Token(Syntax.Dot3Token) : undefined);
      };
      if (qc.isDoc.constructSignature(node)) {
        let newTypeNode: Typing | undefined;
        return ConstructorDeclaration.createTypeNode(
          Nodes.visit(node.typeParams, this.visitExistingNodeTreeSymbols),
          mapDefined(node.params, (p, i) =>
            p.name && p.name.kind === Syntax.Identifier && p.name.escapedText === 'new'
              ? ((newTypeNode = p.type), undefined)
              : new qc.ParamDeclaration(
                  undefined,
                  undefined,
                  getEffectiveDotDotDotForParam(p),
                  p.name || getEffectiveDotDotDotForParam(p) ? `args` : `arg${i}`,
                  p.questionToken,
                  visitNode(p.type, this.visitExistingNodeTreeSymbols),
                  undefined
                )
          ),
          visitNode(newTypeNode || node.type, this.visitExistingNodeTreeSymbols)
        );
      } else {
        return new qc.FunctionTyping(
          Nodes.visit(node.typeParams, this.visitExistingNodeTreeSymbols),
          map(
            node.params,
            (p, i) =>
              new qc.ParamDeclaration(
                undefined,
                undefined,
                getEffectiveDotDotDotForParam(p),
                p.name || getEffectiveDotDotDotForParam(p) ? `args` : `arg${i}`,
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
      node.kind === Syntax.TypingReference &&
      qf.is.inDoc(node) &&
      (getIntendedTypeFromDocTypeReference(node) || unknownSymbol === resolveTypeReferenceName(getTypeReferenceName(node), SymbolFlags.Type, true))
    ) {
      return this.typeToTypeNodeHelper(qf.get.typeFromTypeNode(node)).setOriginal(node);
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
      return node.update(node.arg.update(rewriteModuleSpecifier(node, node.arg.literal)), node.qualifier, Nodes.visit(node.typeArgs, this.visitExistingNodeTreeSymbols, isTypeNode), node.isTypeOf);
    }
    if (qf.is.entityName(node) || qf.is.entityNameExpression(node)) {
      const leftmost = qf.get.firstIdentifier(node);
      if (
        qf.is.inJSFile(node) &&
        (qf.is.exportsIdentifier(leftmost) ||
          qf.is.moduleExportsAccessExpression(leftmost.parent) ||
          (leftmost.parent.kind === Syntax.QualifiedName && qf.is.moduleIdentifier(leftmost.parent.left) && qf.is.exportsIdentifier(leftmost.parent.right)))
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
        if (node.kind === Syntax.Identifier) {
          const name = sym.flags & SymbolFlags.TypeParam ? this.typeParamToName(getDeclaredTypeOfSymbol(sym)) : getMutableClone(node);
          name.symbol = sym;
          return setEmitFlags(name.node).setOriginal(EmitFlags.NoAsciiEscaping);
        }
      }
    }
    if (file && node.kind === Syntax.TupleTyping && qy.get.lineAndCharOf(file, node.pos).line === qy.get.lineAndCharOf(file, node.end).line) {
      setEmitFlags(node, EmitFlags.SingleLine);
    }
    return visitEachChild(node, this.visitExistingNodeTreeSymbols, nullTrafoContext);
  }
  serializeSignatures(kind: SignatureKind, input: Type, baseType: Type | undefined, outputKind: Syntax) {
    const signatures = getSignaturesOfType(input, kind);
    if (kind === SignatureKind.Construct) {
      if (!baseType && every(signatures, (s) => length(s.params) === 0)) return [];
      if (baseType) {
        const baseSigs = getSignaturesOfType(baseType, SignatureKind.Construct);
        if (!length(baseSigs) && every(signatures, (s) => length(s.params) === 0)) return [];
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
      const info = qf.get.indexInfoOfType(input, type);
      if (info) {
        if (baseType) {
          const baseInfo = qf.get.indexInfoOfType(baseType, type);
          if (baseInfo) {
            if (qf.is.typeIdenticalTo(info.type, baseInfo.type)) continue;
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
    if ((t as TypeReference).target && qf.get.accessibleSymbolChain((t as TypeReference).target.symbol, enclosingDeclaration, SymbolFlags.Value, false)) {
      typeArgs = map(getTypeArgs(t as TypeReference), (t) => this.typeToTypeNodeHelper(t));
      reference = this.symbolToExpression((t as TypeReference).target.symbol, SymbolFlags.Type);
    } else if (t.symbol && qf.get.accessibleSymbolChain(t.symbol, enclosingDeclaration, SymbolFlags.Value, false)) {
      reference = this.symbolToExpression(t.symbol, SymbolFlags.Type);
    }
    if (reference) return new qc.ExpressionWithTypings(typeArgs, reference);
  }
  serializeAsFunctionNamespaceMerge(type: Type, symbol: Symbol, localName: string, modifierFlags: ModifierFlags) {
    const signatures = getSignaturesOfType(type, SignatureKind.Call);
    for (const sig of signatures) {
      const decl = this.signatureToSignatureDeclarationHelper(sig, Syntax.FunctionDeclaration, includePrivateSymbol, bundled) as FunctionDeclaration;
      decl.name = new Identifier(localName);
      addResult(setRange(decl, (sig.declaration && sig.declaration.parent.kind === Syntax.VariableDeclaration && sig.declaration.parent.parent) || sig.declaration), modifierFlags);
    }
    if (!(symbol.flags & (SymbolFlags.ValueModule | SymbolFlags.NamespaceModule) && !!symbol.exports && !!symbol.exports.size)) {
      const props = filter(qf.get.propertiesOfType(type), isNamespaceMember);
      serializeAsNamespaceDeclaration(props, localName, modifierFlags, true);
    }
  }
  serializeAsClass(symbol: Symbol, localName: string, modifierFlags: ModifierFlags) {
    const localParams = this.getLocalTypeParamsOfClassOrInterfaceOrTypeAlias();
    const typeParamDecls = map(localParams, (p) => this.typeParamToDeclaration(p));
    const classType = this.getDeclaredTypeOfClassOrInterface();
    const baseTypes = getBaseTypes(classType);
    const implementsTypes = getImplementsTypes(classType);
    const staticType = this.qf.get.typeOfSymbol();
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
    const symbolProps = getNonInterhitedProperties(classType, baseTypes, qf.get.propertiesOfType(classType));
    const publicSymbolProps = filter(symbolProps, (s) => {
      const valueDecl = s.valueDeclaration;
      return valueDecl && !(qf.is.namedDeclaration(valueDecl) && valueDecl.name.kind === Syntax.PrivateIdentifier);
    });
    const hasPrivateIdentifier = some(symbolProps, (s) => {
      const valueDecl = s.valueDeclaration;
      return valueDecl && qf.is.namedDeclaration(valueDecl) && valueDecl.name.kind === Syntax.PrivateIdentifier;
    });
    const privateProperties = hasPrivateIdentifier ? [new qc.PropertyDeclaration(undefined, undefined, new PrivateIdentifier('#private'), undefined, undefined, undefined)] : empty;
    const publicProperties = flatMap<Symbol, ClassElem>(publicSymbolProps, (p) => serializePropertySymbolForClass(p, false, baseTypes[0]));
    const staticMembers = flatMap(
      filter(qf.get.propertiesOfType(staticType), (p) => !(p.flags & SymbolFlags.Prototype) && p.escName !== 'prototype' && !isNamespaceMember(p)),
      (p) => serializePropertySymbolForClass(p, true, staticBaseType)
    );
    const isNonConstructableClassLikeInJsFile = !isClass && !!symbol.valueDeclaration && qf.is.inJSFile(symbol.valueDeclaration) && !some(getSignaturesOfType(staticType, SignatureKind.Construct));
    const constructors = isNonConstructableClassLikeInJsFile
      ? [new qc.ConstructorDeclaration(undefined, qf.create.modifiersFromFlags(ModifierFlags.Private), [], undefined)]
      : (serializeSignatures(SignatureKind.Construct, staticType, baseTypes[0], Syntax.Constructor) as ConstructorDeclaration[]);
    for (const c of constructors) {
      c.type = undefined;
      c.typeParams = undefined;
    }
    const indexSignatures = serializeIndexSignatures(classType, baseTypes[0]);
    addResult(
      setRange(
        new qc.ClassDeclaration(undefined, undefined, localName, typeParamDecls, heritageClauses, [...indexSignatures, ...staticMembers, ...constructors, ...publicProperties, ...privateProperties]),
        symbol.declarations && filter(symbol.declarations, (d) => d.kind === Syntax.ClassDeclaration || d.kind === Syntax.ClassExpression)[0]
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
        const typeParamNode = this.typeParamToDeclarationWithConstraint(getTypeParamFromMappedType(type), appropriateConstraintTypeNode);
        const templateTypeNode = this.typeToTypeNodeHelper(getTemplateTypeFromMappedType(type));
        const mappedTypeNode = new qc.MappedTyping(readonlyToken, typeParamNode, questionToken, templateTypeNode);
        this.approximateLength += 10;
        return setEmitFlags(mappedTypeNode, EmitFlags.SingleLine);
      };
      if (qf.is.genericMappedType(type)) return createMappedTypingFromType(type);
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
            if (propertySymbol.declarationModifierFlags() & (ModifierFlags.Private | ModifierFlags.Protected) && this.tracker.reportPrivateInBaseOfClassExpression) {
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
      if (qf.is.jsConstructor(symbol.valueDeclaration)) {
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
    const typeArgs: readonly Type[] = getTypeArgs(type);
    if (type.target === globalArrayType || type.target === globalReadonlyArrayType) {
      if (this.flags & NodeBuilderFlags.WriteArrayAsGenericType) {
        const typeArgNode = this.typeToTypeNodeHelper(typeArgs[0]);
        return new qc.TypingReference(type.target === globalArrayType ? 'Array' : 'ReadonlyArray', [typeArgNode]);
      }
      const elemType = this.typeToTypeNodeHelper(typeArgs[0]);
      const arrayType = new ArrayTyping(elemType);
      return type.target === globalArrayType ? arrayType : new qc.TypingOperator(Syntax.ReadonlyKeyword, arrayType);
    } else if (type.target.objectFlags & ObjectFlags.Tuple) {
      if (typeArgs.length > 0) {
        const arity = getTypeReferenceArity(type);
        const tupleConstituentNodes = this.mapToTypeNodes(typeArgs.slice(0, arity));
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
      const outerTypeParams = type.target.outerTypeParams;
      let i = 0;
      let resultType: TypingReference | ImportTyping | undefined;
      if (outerTypeParams) {
        const length = outerTypeParams.length;
        while (i < length) {
          const start = i;
          const parent = getParentSymbolOfTypeParam(outerTypeParams[i])!;
          do {
            i++;
          } while (i < length && getParentSymbolOfTypeParam(outerTypeParams[i]) === parent);
          if (!rangeEquals(outerTypeParams, typeArgs, start, i)) {
            const typeArgSlice = this.mapToTypeNodes(typeArgs.slice(start, i));
            const flags = this.flags;
            this.flags |= NodeBuilderFlags.ForbidIndexedAccessSymbolReferences;
            const ref = this.symbolToTypeNode(parent, SymbolFlags.Type, typeArgSlice) as TypingReference | ImportTyping;
            this.flags = flags;
            resultType = !resultType ? ref : appendReferenceToType(resultType, ref as TypingReference);
          }
        }
      }
      let typeArgNodes: readonly Typing[] | undefined;
      if (typeArgs.length > 0) {
        const typeParamCount = (type.target.typeParams || empty).length;
        typeArgNodes = this.mapToTypeNodes(typeArgs.slice(i, typeParamCount));
      }
      const flags = this.flags;
      this.flags |= NodeBuilderFlags.ForbidIndexedAccessSymbolReferences;
      const finalRef = this.symbolToTypeNode(type.symbol, SymbolFlags.Type, typeArgNodes);
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
      const modifierFlags = p.declarationModifierFlags();
      const isPrivate = !!(modifierFlags & ModifierFlags.Private);
      if (isStatic && p.flags & (SymbolFlags.Type | SymbolFlags.Namespace | SymbolFlags.Alias)) return [];
      if (
        p.flags & SymbolFlags.Prototype ||
        (baseType &&
          qf.get.propertyOfType(baseType, p.escName) &&
          isReadonlySymbol(qf.get.propertyOfType(baseType, p.escName)!) === isReadonlySymbol(p) &&
          (p.flags & SymbolFlags.Optional) === (qf.get.propertyOfType(baseType, p.escName)!.flags & SymbolFlags.Optional) &&
          qf.is.typeIdenticalTo(qf.get.typeOfSymbol(p), qf.get.typeOfPropertyOfType(baseType, p.escName)!))
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
                  new qc.ParamDeclaration(
                    undefined,
                    undefined,
                    undefined,
                    'arg',
                    undefined,
                    isPrivate ? undefined : this.serializeTypeForDeclaration(qf.get.typeOfSymbol(p), p, enclosingDeclaration, includePrivateSymbol, bundled)
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
                isPrivate ? undefined : this.serializeTypeForDeclaration(qf.get.typeOfSymbol(p), p, enclosingDeclaration, includePrivateSymbol, bundled),
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
            isPrivate ? undefined : this.serializeTypeForDeclaration(qf.get.typeOfSymbol(p), p, enclosingDeclaration, includePrivateSymbol, bundled),
            undefined
          ),
          find(p.declarations, or(PropertyDeclaration.kind, isVariableDeclaration)) || firstPropertyLikeDecl
        );
      }
      if (p.flags & (SymbolFlags.Method | SymbolFlags.Function)) {
        const type = qf.get.typeOfSymbol(p);
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
        exportAssignment.expression.kind === Syntax.Identifier &&
        ns.name.kind === Syntax.Identifier &&
        idText(ns.name) === idText(exportAssignment.expression) &&
        ns.body &&
        ns.body.kind === Syntax.ModuleBlock
      ) {
        const excessExports = filter(ss, (s) => !!(qf.get.effectiveModifierFlags(s) & ModifierFlags.Export));
        if (length(excessExports)) {
          const getNamesOfDeclaration = (s: Statement): Identifier[] => {
            const isIdentifierAndNotUndefined = (n?: Node): n is Identifier => n?.kind === Syntax.Identifier;
            if (s.kind === Syntax.VariableStatement) return filter(map(s.declarationList.declarations, getNameOfDeclaration), isIdentifierAndNotUndefined);
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
      const exports = filter(ss, (d) => d.kind === Syntax.ExportDeclaration && !d.moduleSpecifier && !!d.exportClause && d.exportClause.kind === Syntax.NamedExports) as ExportDeclaration[];
      if (length(exports) > 1) {
        const nonExports = filter(ss, (d) => !d.kind === Syntax.ExportDeclaration || !!d.moduleSpecifier || !d.exportClause);
        ss = [...nonExports, new qc.ExportDeclaration(undefined, undefined, new qc.NamedExports(flatMap(exports, (e) => cast(e.exportClause, isNamedExports).elems)), undefined)];
      }
      const reexports = filter(ss, (d) => d.kind === Syntax.ExportDeclaration && !!d.moduleSpecifier && !!d.exportClause && d.exportClause.kind === Syntax.NamedExports) as ExportDeclaration[];
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
      const exportDecl = find(ss, (d) => d.kind === Syntax.ExportDeclaration && !d.moduleSpecifier && !!d.exportClause) as ExportDeclaration | undefined;
      if (exportDecl && exportDecl.exportClause && exportDecl.exportClause.kind === Syntax.NamedExports) {
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
        ((enclosingDeclaration.kind === Syntax.SourceFile && qf.is.externalOrCommonJsModule(enclosingDeclaration)) || enclosingDeclaration.kind === Syntax.ModuleDeclaration) &&
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
        return (n.kind === Syntax.SourceFile && (qf.is.externalOrCommonJsModule(n) || qf.is.jsonSourceFile(n))) || (qf.is.ambientModule(n) && !qf.is.globalScopeAugmentation(n));
      };
      if (flags & ModifierFlags.Export && enclosingDeclaration && isExportingScope(enclosingDeclaration) && canHaveExportModifier(n)) {
        f |= ModifierFlags.Export;
      }
      if (
        addingDeclare &&
        !(f & ModifierFlags.Export) &&
        (!enclosingDeclaration || !(enclosingDeclaration.flags & NodeFlags.Ambient)) &&
        (n.kind === Syntax.EnumDeclaration || n.kind === Syntax.VariableStatement || n.kind === Syntax.FunctionDeclaration || n.kind === Syntax.ClassDeclaration || n.kind === Syntax.ModuleDeclaration)
      ) {
        f |= ModifierFlags.Ambient;
      }
      if (flags & ModifierFlags.Default && (n.kind === Syntax.ClassDeclaration || n.kind === Syntax.InterfaceDeclaration || n.kind === Syntax.FunctionDeclaration)) {
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
    function serializeExportSpecifier(localName: string, targetName: string, spec?: Expression) {
      addResult(new qc.ExportDeclaration(undefined, undefined, new qc.NamedExports([new qc.ExportSpecifier(localName !== targetName ? targetName : undefined, localName)]), spec), ModifierFlags.None);
    }
    function isTypeRepresentableAsFunctionNamespaceMerge(typeToSerialize: Type, hostSymbol: Symbol) {
      const ctxSrc = this.enclosingDeclaration.sourceFile;
      return (
        getObjectFlags(typeToSerialize) & (ObjectFlags.Anonymous | ObjectFlags.Mapped) &&
        !qf.get.indexInfoOfType(typeToSerialize, IndexKind.String) &&
        !qf.get.indexInfoOfType(typeToSerialize, IndexKind.Number) &&
        !!(length(qf.get.propertiesOfType(typeToSerialize)) || length(getSignaturesOfType(typeToSerialize, SignatureKind.Call))) &&
        !length(getSignaturesOfType(typeToSerialize, SignatureKind.Construct)) &&
        !getDeclarationWithTypeAnnotation(hostSymbol, enclosingDeclaration) &&
        !(typeToSerialize.symbol && some(typeToSerialize.symbol.declarations, (d) => d.sourceFile !== ctxSrc)) &&
        !some(qf.get.propertiesOfType(typeToSerialize), (p) => isLateBoundName(p.escName)) &&
        !some(qf.get.propertiesOfType(typeToSerialize), (p) => some(p.declarations, (d) => d.sourceFile !== ctxSrc)) &&
        every(qf.get.propertiesOfType(typeToSerialize), (p) => qy.is.identifierText(p.name) && !qy.is.stringAndKeyword(p.name))
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
      symbolToTypeParamDeclarations: (symbol: Symbol, enclosingDeclaration?: Node, flags?: NodeBuilderFlags, tracker?: SymbolTracker) =>
        withContext(enclosingDeclaration, flags, tracker, (c) => c.typeParamsToTypeParamDeclarations(symbol)),
      symbolToParamDeclaration: (symbol: Symbol, enclosingDeclaration?: Node, flags?: NodeBuilderFlags, tracker?: SymbolTracker) =>
        withContext(enclosingDeclaration, flags, tracker, (c) => c.symbolToParamDeclaration(symbol)),
      typeParamToDeclaration: (param: TypeParam, enclosingDeclaration?: Node, flags?: NodeBuilderFlags, tracker?: SymbolTracker) =>
        withContext(enclosingDeclaration, flags, tracker, (c) => c.typeParamToDeclaration(param)),
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
        inferTypeParams: undefined,
        approximateLength: 0,
      };
      const resultingNode = cb(context);
      return this.encounteredError ? undefined : resultingNode;
    }
  }
}
