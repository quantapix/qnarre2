import * as qb from '../base';
import * as qc from '../core3';
import * as qd from '../diags';
import * as qg from '../debug';
import { ExpandingFlags, Node, NodeFlags, ObjectFlags, SymbolFlags, TypeFlags, VarianceFlags } from './types';
import * as qt from './types';
import { ModifierFlags, Syntax } from '../syntax';
import * as qy from '../syntax';
import { Symbol } from './symbol';
export function newIs(qx: qt.Tctx) {
  const r = (qx.is = new (class {
    blockScopedNameDeclaredBeforeUse(declaration: Declaration, usage: Node): boolean {
      const declarationFile = qx.get.sourceFileOf(declaration);
      const useFile = qx.get.sourceFileOf(usage);
      const declContainer = qx.get.enclosingBlockScopeContainer(declaration);
      if (declarationFile !== useFile) {
        if (
          (moduleKind && (declarationFile.externalModuleIndicator || useFile.externalModuleIndicator)) ||
          (!compilerOptions.outFile && !compilerOptions.out) ||
          isInTypeQuery(usage) ||
          declaration.flags & NodeFlags.Ambient
        ) {
          return true;
        }
        if (isUsedInFunctionOrInstanceProperty(usage, declaration)) return true;
        const sourceFiles = host.getSourceFiles();
        return sourceFiles.indexOf(declarationFile) <= sourceFiles.indexOf(useFile);
      }
      if (declaration.pos <= usage.pos && !(this.kind(qc.PropertyDeclaration, declaration) && this.thisProperty(usage.parent) && !declaration.initer && !declaration.exclamationToken)) {
        if (declaration.kind === Syntax.BindingElement) {
          const errorBindingElement = qx.get.ancestor(usage, Syntax.BindingElement) as BindingElement;
          if (errorBindingElement) return qc.findAncestor(errorBindingElement, BindingElement.kind) !== qc.findAncestor(declaration, BindingElement.kind) || declaration.pos < errorBindingElement.pos;
          return isBlockScopedNameDeclaredBeforeUse(qx.get.ancestor(declaration, Syntax.VariableDeclaration) as Declaration, usage);
        } else if (declaration.kind === Syntax.VariableDeclaration) {
          return !isImmediatelyUsedInIniterOfBlockScopedVariable(declaration as VariableDeclaration, usage);
        } else if (this.kind(qc.ClassDeclaration, declaration)) {
          return !qc.findAncestor(usage, (n) => this.kind(qc.ComputedPropertyName, n) && n.parent.parent === declaration);
        } else if (this.kind(qc.PropertyDeclaration, declaration)) {
          return !isPropertyImmediatelyReferencedWithinDeclaration(declaration, usage, false);
        } else if (this.parameterPropertyDeclaration(declaration, declaration.parent)) {
          return !(
            compilerOptions.target === ScriptTarget.ESNext &&
            !!compilerOptions.useDefineForClassFields &&
            qx.get.containingClass(declaration) === qx.get.containingClass(usage) &&
            isUsedInFunctionOrInstanceProperty(usage, declaration)
          );
        }
        return true;
      }
      if (usage.parent.kind === Syntax.ExportSpecifier || (usage.parent.kind === Syntax.ExportAssignment && (usage.parent as ExportAssignment).isExportEquals)) return true;
      if (usage.kind === Syntax.ExportAssignment && (usage as ExportAssignment).isExportEquals) return true;
      if (!!(usage.flags & NodeFlags.Doc) || isInTypeQuery(usage) || usageInTypeDeclaration()) return true;
      if (isUsedInFunctionOrInstanceProperty(usage, declaration)) {
        if (
          compilerOptions.target === ScriptTarget.ESNext &&
          !!compilerOptions.useDefineForClassFields &&
          qx.get.containingClass(declaration) &&
          (this.kind(qc.PropertyDeclaration, declaration) || this.parameterPropertyDeclaration(declaration, declaration.parent))
        ) {
          return !isPropertyImmediatelyReferencedWithinDeclaration(declaration, usage, true);
        }
        return true;
      }
      return false;
      function usageInTypeDeclaration() {
        return !!qc.findAncestor(usage, (node) => this.kind(qc.InterfaceDeclaration, node) || this.kind(qc.TypeAliasDeclaration, node));
      }
      function isImmediatelyUsedInIniterOfBlockScopedVariable(declaration: VariableDeclaration, usage: Node): boolean {
        switch (declaration.parent.parent.kind) {
          case Syntax.VariableStatement:
          case Syntax.ForStatement:
          case Syntax.ForOfStatement:
            if (isSameScopeDescendentOf(usage, declaration, declContainer)) return true;
            break;
        }
        const grandparent = declaration.parent.parent;
        return this.forInOrOfStatement(grandparent) && isSameScopeDescendentOf(usage, grandparent.expression, declContainer);
      }
      function isUsedInFunctionOrInstanceProperty(usage: Node, declaration: Node): boolean {
        return !!qc.findAncestor(usage, (current) => {
          if (current === declContainer) return 'quit';
          if (this.functionLike(current)) return true;
          const initerOfProperty = current.parent && current.parent.kind === Syntax.PropertyDeclaration && (<PropertyDeclaration>current.parent).initer === current;
          if (initerOfProperty) {
            if (qx.has.syntacticModifier(current.parent, ModifierFlags.Static)) {
              if (declaration.kind === Syntax.MethodDeclaration) return true;
            } else {
              const isDeclarationInstanceProperty = declaration.kind === Syntax.PropertyDeclaration && !qx.has.syntacticModifier(declaration, ModifierFlags.Static);
              if (!isDeclarationInstanceProperty || qx.get.containingClass(usage) !== qx.get.containingClass(declaration)) return true;
            }
          }
          return false;
        });
      }
      function isPropertyImmediatelyReferencedWithinDeclaration(declaration: PropertyDeclaration | ParameterPropertyDeclaration, usage: Node, stopAtAnyPropertyDeclaration: boolean) {
        if (usage.end > declaration.end) return false;
        const ancestorChangingReferenceScope = qc.findAncestor(usage, (node: Node) => {
          if (node === declaration) return 'quit';
          switch (node.kind) {
            case Syntax.ArrowFunction:
              return true;
            case Syntax.PropertyDeclaration:
              return stopAtAnyPropertyDeclaration &&
                ((this.kind(qc.PropertyDeclaration, declaration) && node.parent === declaration.parent) ||
                  (this.parameterPropertyDeclaration(declaration, declaration.parent) && node.parent === declaration.parent.parent))
                ? 'quit'
                : true;
            case Syntax.Block:
              switch (node.parent.kind) {
                case Syntax.GetAccessor:
                case Syntax.MethodDeclaration:
                case Syntax.SetAccessor:
                  return true;
                default:
                  return false;
              }
            default:
              return false;
          }
        });
        return ancestorChangingReferenceScope === undefined;
      }
    }
    primitiveTypeName(name: qb.__String) {
      return name === 'any' || name === 'string' || name === 'number' || name === 'boolean' || name === 'never' || name === 'unknown';
    }
    es2015OrLaterConstructorName(n: qb.__String) {
      switch (n) {
        case 'Promise':
        case 'Symbol':
        case 'Map':
        case 'WeakMap':
        case 'Set':
        case 'WeakSet':
          return true;
      }
      return false;
    }
    sameScopeDescendentOf(initial: Node, parent: Node | undefined, stopAt: Node): boolean {
      return !!parent && !!qc.findAncestor(initial, (n) => (n === stopAt || this.functionLike(n) ? 'quit' : n === parent));
    }
    aliasSymbolDeclaration(node: Node): boolean {
      return (
        node.kind === Syntax.ImportEqualsDeclaration ||
        node.kind === Syntax.NamespaceExportDeclaration ||
        (node.kind === Syntax.ImportClause && !!(<ImportClause>node).name) ||
        node.kind === Syntax.NamespaceImport ||
        node.kind === Syntax.NamespaceExport ||
        node.kind === Syntax.ImportSpecifier ||
        node.kind === Syntax.ExportSpecifier ||
        (node.kind === Syntax.ExportAssignment && this.exportAssignmentAlias(<ExportAssignment>node)) ||
        (this.kind(qc.BinaryExpression, node) && getAssignmentDeclarationKind(node) === AssignmentDeclarationKind.ModuleExports && this.exportAssignmentAlias(node)) ||
        (this.kind(qc.PropertyAccessExpression, node) &&
          this.kind(qc.BinaryExpression, node.parent) &&
          node.parent.left === node &&
          node.parent.operatorToken.kind === Syntax.EqualsToken &&
          isAliasableOrJsExpression(node.parent.right)) ||
        node.kind === Syntax.ShorthandPropertyAssignment ||
        (node.kind === Syntax.PropertyAssignment && isAliasableOrJsExpression((node as PropertyAssignment).initer))
      );
    }
    aliasableOrJsExpression(e: Expression) {
      return this.aliasableExpression(e) || (this.kind(qc.FunctionExpression, e) && isJSConstructor(e));
    }
    syntacticDefault(node: Node) {
      return (this.kind(qc.ExportAssignment, node) && !node.isExportEquals) || qx.has.syntacticModifier(node, ModifierFlags.Default) || this.kind(qc.ExportSpecifier, node);
    }
    anySymbolAccessible(
      symbols: Symbol[] | undefined,
      enclosingDeclaration: Node | undefined,
      initialSymbol: Symbol,
      meaning: qt.SymbolFlags,
      shouldComputeAliasesToMakeVisible: boolean
    ): SymbolAccessibilityResult | undefined {
      if (!length(symbols)) return;
      let hadAccessibleChain: Symbol | undefined;
      let earlyModuleBail = false;
      for (const symbol of symbols!) {
        const accessibleSymbolChain = getAccessibleSymbolChain(symbol, enclosingDeclaration, meaning, false);
        if (accessibleSymbolChain) {
          hadAccessibleChain = symbol;
          const hasAccessibleDeclarations = hasVisibleDeclarations(accessibleSymbolChain[0], shouldComputeAliasesToMakeVisible);
          if (hasAccessibleDeclarations) return hasAccessibleDeclarations;
        } else {
          if (some(symbol.declarations, hasNonGlobalAugmentationExternalModuleSymbol)) {
            if (shouldComputeAliasesToMakeVisible) {
              earlyModuleBail = true;
              continue;
            }
            return {
              accessibility: SymbolAccessibility.Accessible,
            };
          }
        }
        let containers = getContainersOfSymbol(symbol, enclosingDeclaration);
        const firstDecl: Node | false = !!length(symbol.declarations) && first(symbol.declarations);
        if (!length(containers) && meaning & qt.SymbolFlags.Value && firstDecl && this.kind(qc.ObjectLiteralExpression, firstDecl)) {
          if (firstDecl.parent && this.kind(qc.VariableDeclaration, firstDecl.parent) && firstDecl === firstDecl.parent.initer) containers = [getSymbolOfNode(firstDecl.parent)];
        }
        const parentResult = isAnySymbolAccessible(
          containers,
          enclosingDeclaration,
          initialSymbol,
          initialSymbol === symbol ? getQualifiedLeftMeaning(meaning) : meaning,
          shouldComputeAliasesToMakeVisible
        );
        if (parentResult) return parentResult;
      }
      if (earlyModuleBail) {
        return {
          accessibility: SymbolAccessibility.Accessible,
        };
      }
      if (hadAccessibleChain) {
        return {
          accessibility: SymbolAccessibility.NotAccessible,
          errorSymbolName: initialSymbol.symbolToString(enclosingDeclaration, meaning),
          errorModuleName: hadAccessibleChain !== initialSymbol ? hadAccessibleChain.symbolToString(enclosingDeclaration, qt.SymbolFlags.Namespace) : undefined,
        };
      }
    }
    symbolAccessible(symbol: Symbol | undefined, enclosingDeclaration: Node | undefined, meaning: qt.SymbolFlags, shouldComputeAliasesToMakeVisible: boolean): SymbolAccessibilityResult {
      if (symbol && enclosingDeclaration) {
        const result = isAnySymbolAccessible([symbol], enclosingDeclaration, symbol, meaning, shouldComputeAliasesToMakeVisible);
        if (result) return result;
        const symbolExternalModule = forEach(symbol.declarations, getExternalModuleContainer);
        if (symbolExternalModule) {
          const enclosingExternalModule = getExternalModuleContainer(enclosingDeclaration);
          if (symbolExternalModule !== enclosingExternalModule) {
            return {
              accessibility: SymbolAccessibility.CannotBeNamed,
              errorSymbolName: symbol.symbolToString(enclosingDeclaration, meaning),
              errorModuleName: symbolExternalModule.symbolToString(),
            };
          }
        }
        return {
          accessibility: SymbolAccessibility.NotAccessible,
          errorSymbolName: symbol.symbolToString(enclosingDeclaration, meaning),
        };
      }
      return { accessibility: SymbolAccessibility.Accessible };
    }
    entityNameVisible(entityName: EntityNameOrEntityNameExpression, enclosingDeclaration: Node): SymbolVisibilityResult {
      let meaning: qt.SymbolFlags;
      if (entityName.parent.kind === Syntax.TypeQuery || this.expressionWithTypeArgumentsInClassExtendsClause(entityName.parent) || entityName.parent.kind === Syntax.ComputedPropertyName)
        meaning = qt.SymbolFlags.Value | qt.SymbolFlags.ExportValue;
      else if (entityName.kind === Syntax.QualifiedName || entityName.kind === Syntax.PropertyAccessExpression || entityName.parent.kind === Syntax.ImportEqualsDeclaration) {
        meaning = qt.SymbolFlags.Namespace;
      } else {
        meaning = qt.SymbolFlags.Type;
      }
      const firstIdentifier = getFirstIdentifier(entityName);
      const symbol = resolveName(enclosingDeclaration, firstIdentifier.escapedText, meaning, undefined, undefined, false);
      return (
        (symbol && hasVisibleDeclarations(symbol, true)) || {
          accessibility: SymbolAccessibility.NotAccessible,
          errorSymbolName: qx.get.textOf(firstIdentifier),
          errorNode: firstIdentifier,
        }
      );
    }
    topLevelInExternalModuleAugmentation(node: Node): boolean {
      return node && node.parent && node.parent.kind === Syntax.ModuleBlock && this.externalModuleAugmentation(node.parent.parent);
    }
    defaultBindingContext(location: Node) {
      return location.kind === Syntax.SourceFile || this.ambientModule(location);
    }
    declarationVisible(node: Node): boolean {
      if (node) {
        const ls = getNodeLinks(node);
        if (ls.isVisible === undefined) ls.isVisible = !!determineIfDeclarationIsVisible();
        return ls.isVisible;
      }
      return false;
      function determineIfDeclarationIsVisible() {
        switch (node.kind) {
          case Syntax.DocCallbackTag:
          case Syntax.DocTypedefTag:
          case Syntax.DocEnumTag:
            return !!(node.parent && node.parent.parent && node.parent.parent.parent && this.kind(qc.SourceFile, node.parent.parent.parent));
          case Syntax.BindingElement:
            return isDeclarationVisible(node.parent.parent);
          case Syntax.VariableDeclaration:
            if (this.kind(qc.BindingPattern, (node as VariableDeclaration).name) && !((node as VariableDeclaration).name as BindingPattern).elements.length) return false;
          case Syntax.ModuleDeclaration:
          case Syntax.ClassDeclaration:
          case Syntax.InterfaceDeclaration:
          case Syntax.TypeAliasDeclaration:
          case Syntax.FunctionDeclaration:
          case Syntax.EnumDeclaration:
          case Syntax.ImportEqualsDeclaration:
            if (this.externalModuleAugmentation(node)) return true;
            const parent = getDeclarationContainer(node);
            if (
              !(qx.get.combinedModifierFlags(node as Declaration) & ModifierFlags.Export) &&
              !(node.kind !== Syntax.ImportEqualsDeclaration && parent.kind !== Syntax.SourceFile && parent.flags & NodeFlags.Ambient)
            ) {
              return isGlobalSourceFile(parent);
            }
            return isDeclarationVisible(parent);
          case Syntax.PropertyDeclaration:
          case Syntax.PropertySignature:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
          case Syntax.MethodDeclaration:
          case Syntax.MethodSignature:
            if (qx.has.effectiveModifier(node, ModifierFlags.Private | ModifierFlags.Protected)) return false;
          case Syntax.Constructor:
          case Syntax.ConstructSignature:
          case Syntax.CallSignature:
          case Syntax.IndexSignature:
          case Syntax.Parameter:
          case Syntax.ModuleBlock:
          case Syntax.FunctionType:
          case Syntax.ConstructorType:
          case Syntax.TypeLiteral:
          case Syntax.TypeReference:
          case Syntax.ArrayType:
          case Syntax.TupleType:
          case Syntax.UnionType:
          case Syntax.IntersectionType:
          case Syntax.ParenthesizedType:
          case Syntax.NamedTupleMember:
            return isDeclarationVisible(node.parent);
          case Syntax.ImportClause:
          case Syntax.NamespaceImport:
          case Syntax.ImportSpecifier:
            return false;
          case Syntax.TypeParameter:
          case Syntax.SourceFile:
          case Syntax.NamespaceExportDeclaration:
            return true;
          case Syntax.ExportAssignment:
            return false;
          default:
            return false;
        }
      }
    }
    nodewithType(target: TypeSystemEntity, propertyName: TypeSystemPropertyName): boolean {
      switch (propertyName) {
        case TypeSystemPropertyName.Type:
          return !!s.getLinks(<Symbol>target).type;
        case TypeSystemPropertyName.EnumTagType:
          return !!getNodeLinks(target as DocEnumTag).resolvedEnumType;
        case TypeSystemPropertyName.DeclaredType:
          return !!s.getLinks(<Symbol>target).declaredType;
        case TypeSystemPropertyName.ResolvedBaseConstructorType:
          return !!(<InterfaceType>target).resolvedBaseConstructorType;
        case TypeSystemPropertyName.ResolvedReturnType:
          return !!(<Signature>target).resolvedReturnType;
        case TypeSystemPropertyName.ImmediateBaseConstraint:
          return !!(<Type>target).immediateBaseConstraint;
        case TypeSystemPropertyName.ResolvedTypeArguments:
          return !!(target as TypeReference).resolvedTypeArguments;
      }
      return Debug.assertNever(propertyName);
    }
    typeAny(type: Type | undefined) {
      return type && (type.flags & qt.TypeFlags.Any) !== 0;
    }
    nullOrUndefined(node: Expression) {
      const expr = skipParentheses(node);
      return expr.kind === Syntax.NullKeyword || (expr.kind === Syntax.Identifier && getResolvedSymbol(<Identifier>expr) === undefinedSymbol);
    }
    emptyArrayLiteral(node: Expression) {
      const expr = skipParentheses(node);
      return expr.kind === Syntax.ArrayLiteralExpression && (<ArrayLiteralExpression>expr).elements.length === 0;
    }
    declarationInConstructor(expression: Expression) {
      const thisContainer = qx.get.thisContainer(expression, false);
      return (
        thisContainer.kind === Syntax.Constructor ||
        thisContainer.kind === Syntax.FunctionDeclaration ||
        (thisContainer.kind === Syntax.FunctionExpression && !this.prototypePropertyAssignment(thisContainer.parent))
      );
    }
    referenceToType(type: Type, target: Type) {
      return type !== undefined && target !== undefined && (getObjectFlags(type) & ObjectFlags.Reference) !== 0 && (<TypeReference>type).target === target;
    }
    mixinConstructorType(type: Type) {
      const signatures = getSignaturesOfType(type, SignatureKind.Construct);
      if (signatures.length === 1) {
        const s = signatures[0];
        return !s.typeParameters && s.parameters.length === 1 && signatureHasRestParameter(s) && getElementTypeOfArrayType(getTypeOfParameter(s.parameters[0])) === anyType;
      }
      return false;
    }
    constructorType(type: Type): boolean {
      if (getSignaturesOfType(type, SignatureKind.Construct).length > 0) return true;
      if (type.flags & qt.TypeFlags.TypeVariable) {
        const constraint = getBaseConstraintOfType(type);
        return !!constraint && isMixinConstructorType(constraint);
      }
      return false;
    }
    validBaseType(type: Type): type is BaseType {
      if (type.flags & qt.TypeFlags.TypeParameter) {
        const constraint = getBaseConstraintOfType(type);
        if (constraint) return isValidBaseType(constraint);
      }
      return !!(
        (type.flags & (TypeFlags.Object | qt.TypeFlags.NonPrimitive | qt.TypeFlags.Any) && !isGenericMappedType(type)) ||
        (type.flags & qt.TypeFlags.Intersection && every((<IntersectionType>type).types, isValidBaseType))
      );
    }
    stringConcatExpression(expr: Node): boolean {
      if (StringLiteral.like(expr)) return true;
      else if (expr.kind === Syntax.BinaryExpression) return isStringConcatExpression((<BinaryExpression>expr).left) && isStringConcatExpression((<BinaryExpression>expr).right);
      return false;
    }
    literalEnumMember(member: EnumMember) {
      const expr = member.initer;
      if (!expr) return !(member.flags & NodeFlags.Ambient);
      switch (expr.kind) {
        case Syntax.StringLiteral:
        case Syntax.NumericLiteral:
        case Syntax.NoSubstitutionLiteral:
          return true;
        case Syntax.PrefixUnaryExpression:
          return (<PrefixUnaryExpression>expr).operator === Syntax.MinusToken && (<PrefixUnaryExpression>expr).operand.kind === Syntax.NumericLiteral;
        case Syntax.Identifier:
          return this.missing(expr) || !!getSymbolOfNode(member.parent).exports!.get((<Identifier>expr).escapedText);
        case Syntax.BinaryExpression:
          return isStringConcatExpression(expr);
        default:
          return false;
      }
    }
    thislessType(node: TypeNode): boolean {
      switch (node.kind) {
        case Syntax.AnyKeyword:
        case Syntax.UnknownKeyword:
        case Syntax.StringKeyword:
        case Syntax.NumberKeyword:
        case Syntax.BigIntKeyword:
        case Syntax.BooleanKeyword:
        case Syntax.SymbolKeyword:
        case Syntax.ObjectKeyword:
        case Syntax.VoidKeyword:
        case Syntax.UndefinedKeyword:
        case Syntax.NullKeyword:
        case Syntax.NeverKeyword:
        case Syntax.LiteralType:
          return true;
        case Syntax.ArrayType:
          return isThislessType((<ArrayTypeNode>node).elementType);
        case Syntax.TypeReference:
          return !(node as TypeReferenceNode).typeArguments || (node as TypeReferenceNode).typeArguments!.every(isThislessType);
      }
      return false;
    }
    thislessTypeParameter(node: TypeParameterDeclaration) {
      const constraint = qx.get.effectiveConstraintOfTypeParameter(node);
      return !constraint || isThislessType(constraint);
    }
    thislessVariableLikeDeclaration(node: VariableLikeDeclaration): boolean {
      const typeNode = qx.get.effectiveTypeAnnotationNode(node);
      return typeNode ? isThislessType(typeNode) : !this.withIniter(node);
    }
    thislessFunctionLikeDeclaration(node: FunctionLikeDeclaration): boolean {
      const returnType = getEffectiveReturnTypeNode(node);
      const typeParameters = qx.get.effectiveTypeParameterDeclarations(node);
      return (
        (node.kind === Syntax.Constructor || (!!returnType && isThislessType(returnType))) && node.parameters.every(isThislessVariableLikeDeclaration) && typeParameters.every(isThislessTypeParameter)
      );
    }
    staticPrivateIdentifierProperty(s: Symbol): boolean {
      return s.valueDeclaration?.isPrivateIdentifierPropertyDeclaration() && qx.has.syntacticModifier(s.valueDeclaration, ModifierFlags.Static);
    }
    typeUsableAsPropertyName(type: Type): type is StringLiteralType | NumberLiteralType | UniqueESSymbolType {
      return !!(type.flags & qt.TypeFlags.StringOrNumberLiteralOrUnique);
    }
    lateBindableName(node: DeclarationName): node is LateBoundName {
      if (!this.kind(qc.ComputedPropertyName, node) && !this.kind(qc.ElementAccessExpression, node)) return false;
      const expr = this.kind(qc.ComputedPropertyName, node) ? node.expression : node.argumentExpression;
      return this.entityNameExpression(expr) && isTypeUsableAsPropertyName(this.kind(qc.ComputedPropertyName, node) ? check.computedPropertyName(node) : check.expressionCached(expr));
    }
    lateBoundName(name: qb.__String): boolean {
      return (name as string).charCodeAt(0) === Codes._ && (name as string).charCodeAt(1) === Codes._ && (name as string).charCodeAt(2) === Codes.at;
    }
    nonBindableDynamicName(node: DeclarationName) {
      return isDynamicName(node) && !isLateBindableName(node);
    }
    mappedTypeWithKeyofConstraintDeclaration(type: MappedType) {
      const constraintDeclaration = getConstraintDeclarationForMappedType(type)!;
      return constraintDeclaration.kind === Syntax.TypeOperator && (<TypeOperatorNode>constraintDeclaration).operator === Syntax.KeyOfKeyword;
    }
    partialMappedType(type: Type) {
      return !!(getObjectFlags(type) & ObjectFlags.Mapped && getMappedTypeModifiers(<MappedType>type) & MappedTypeModifiers.IncludeOptional);
    }
    genericMappedType(type: Type): type is MappedType {
      return !!(getObjectFlags(type) & ObjectFlags.Mapped) && isGenericIndexType(getConstraintTypeFromMappedType(<MappedType>type));
    }
    typeInvalidDueToUnionDiscriminant(contextualType: Type, obj: ObjectLiteralExpression | JsxAttributes): boolean {
      const list = obj.properties as Nodes<ObjectLiteralElementLike | JsxAttributeLike>;
      return list.some((property) => {
        const nameType = property.name && getLiteralTypeFromPropertyName(property.name);
        const name = nameType && isTypeUsableAsPropertyName(nameType) ? getPropertyNameFromType(nameType) : undefined;
        const expected = name === undefined ? undefined : getTypeOfPropertyOfType(contextualType, name);
        return !!expected && isLiteralType(expected) && !isTypeAssignableTo(getTypeOfNode(property), expected);
      });
    }
    neverReducedProperty(prop: Symbol) {
      return isDiscriminantWithNeverType(prop) || isConflictingPrivateProperty(prop);
    }
    discriminantWithNeverType(prop: Symbol) {
      return (
        !(prop.flags & qt.SymbolFlags.Optional) &&
        (getCheckFlags(prop) & (CheckFlags.Discriminant | qt.CheckFlags.HasNeverType)) === qt.CheckFlags.Discriminant &&
        !!(getTypeOfSymbol(prop).flags & qt.TypeFlags.Never)
      );
    }
    conflictingPrivateProperty(prop: Symbol) {
      return !prop.valueDeclaration && !!(getCheckFlags(prop) & qt.CheckFlags.ContainsPrivate);
    }
    docOptionalParameter(node: ParameterDeclaration) {
      return (
        this.inJSFile(node) &&
        ((node.type && node.type.kind === Syntax.DocOptionalType) ||
          qc.getDoc.parameterTags(node).some(({ isBracketed, typeExpression }) => isBracketed || (!!typeExpression && typeExpression.type.kind === Syntax.DocOptionalType)))
      );
    }
    optionalParameter(node: ParameterDeclaration | DocParameterTag) {
      if (qx.has.questionToken(node) || isOptionalDocParameterTag(node) || isDocOptionalParameter(node)) return true;
      if (node.initer) {
        const signature = getSignatureFromDeclaration(node.parent);
        const parameterIndex = node.parent.parameters.indexOf(node);
        assert(parameterIndex >= 0);
        return parameterIndex >= getMinArgumentCount(signature, true);
      }
      const iife = qx.get.immediatelyInvokedFunctionExpression(node.parent);
      if (iife) return !node.type && !node.dot3Token && node.parent.parameters.indexOf(node) >= iife.arguments.length;
      return false;
    }
    optionalDocParameterTag(node: Node): node is DocParameterTag {
      if (!this.kind(qc.DocParameterTag, node)) return false;
      const { isBracketed, typeExpression } = node;
      return isBracketed || (!!typeExpression && typeExpression.type.kind === Syntax.DocOptionalType);
    }
    resolvingReturnTypeOfSignature(signature: Signature) {
      return !signature.resolvedReturnType && findResolutionCycleStartIndex(signature, TypeSystemPropertyName.ResolvedReturnType) >= 0;
    }
    unaryTupleTypeNode(node: TypeNode) {
      return node.kind === Syntax.TupleType && (<TupleTypeNode>node).elements.length === 1;
    }
    docTypeReference(node: Node): node is TypeReferenceNode {
      return !!(node.flags & NodeFlags.Doc) && (node.kind === Syntax.TypeReference || node.kind === Syntax.ImportType);
    }
    tupleRestElement(node: TypeNode) {
      return node.kind === Syntax.RestType || (node.kind === Syntax.NamedTupleMember && !!(node as NamedTupleMember).dot3Token);
    }
    tupleOptionalElement(node: TypeNode) {
      return node.kind === Syntax.OptionalType || (node.kind === Syntax.NamedTupleMember && !!(node as NamedTupleMember).questionToken);
    }
    deferredTypeReferenceNode(node: TypeReferenceNode | ArrayTypeNode | TupleTypeNode, hasDefaultTypeArguments?: boolean) {
      return (
        !!getAliasSymbolForTypeNode(node) ||
        (isResolvedByTypeAlias(node) &&
          (node.kind === Syntax.ArrayType
            ? mayResolveTypeAlias(node.elementType)
            : node.kind === Syntax.TupleType
            ? some(node.elements, mayResolveTypeAlias)
            : hasDefaultTypeArguments || some(node.typeArguments, mayResolveTypeAlias)))
      );
    }
    resolvedByTypeAlias(node: Node): boolean {
      const parent = node.parent;
      switch (parent.kind) {
        case Syntax.ParenthesizedType:
        case Syntax.NamedTupleMember:
        case Syntax.TypeReference:
        case Syntax.UnionType:
        case Syntax.IntersectionType:
        case Syntax.IndexedAccessType:
        case Syntax.ConditionalType:
        case Syntax.TypeOperator:
        case Syntax.ArrayType:
        case Syntax.TupleType:
          return isResolvedByTypeAlias(parent);
        case Syntax.TypeAliasDeclaration:
          return true;
      }
      return false;
    }
    readonlyTypeOperator(node: Node) {
      return this.kind(qc.TypeOperatorNode, node) && node.operator === Syntax.ReadonlyKeyword;
    }
    setOfLiteralsFromSameEnum(types: readonly Type[]): boolean {
      const first = types[0];
      if (first.flags & qt.TypeFlags.EnumLiteral) {
        const firstEnum = getParentOfSymbol(first.symbol);
        for (let i = 1; i < types.length; i++) {
          const other = types[i];
          if (!(other.flags & qt.TypeFlags.EnumLiteral) || firstEnum !== getParentOfSymbol(other.symbol)) return false;
        }
        return true;
      }
      return false;
    }
    jSLiteralType(type: Type): boolean {
      if (noImplicitAny) return false;
      if (getObjectFlags(type) & ObjectFlags.JSLiteral) return true;
      if (type.flags & qt.TypeFlags.Union) return every((type as UnionType).types, isJSLiteralType);
      if (type.flags & qt.TypeFlags.Intersection) return some((type as IntersectionType).types, isJSLiteralType);
      if (type.flags & qt.TypeFlags.Instantiable) return isJSLiteralType(getResolvedBaseConstraint(type));
      return false;
    }
    genericObjectType(type: Type): boolean {
      if (type.flags & qt.TypeFlags.UnionOrIntersection) {
        if (!((<UnionOrIntersectionType>type).objectFlags & ObjectFlags.IsGenericObjectTypeComputed)) {
          (<UnionOrIntersectionType>type).objectFlags |=
            ObjectFlags.IsGenericObjectTypeComputed | (some((<UnionOrIntersectionType>type).types, isGenericObjectType) ? ObjectFlags.IsGenericObjectType : 0);
        }
        return !!((<UnionOrIntersectionType>type).objectFlags & ObjectFlags.IsGenericObjectType);
      }
      return !!(type.flags & qt.TypeFlags.InstantiableNonPrimitive) || isGenericMappedType(type);
    }
    genericIndexType(type: Type): boolean {
      if (type.flags & qt.TypeFlags.UnionOrIntersection) {
        if (!((<UnionOrIntersectionType>type).objectFlags & ObjectFlags.IsGenericIndexTypeComputed))
          (<UnionOrIntersectionType>type).objectFlags |=
            ObjectFlags.IsGenericIndexTypeComputed | (some((<UnionOrIntersectionType>type).types, isGenericIndexType) ? ObjectFlags.IsGenericIndexType : 0);
        return !!((<UnionOrIntersectionType>type).objectFlags & ObjectFlags.IsGenericIndexType);
      }
      return !!(type.flags & (TypeFlags.InstantiableNonPrimitive | qt.TypeFlags.Index));
    }
    thisTypeParameter(type: Type): boolean {
      return !!(type.flags & qt.TypeFlags.TypeParameter && (<TypeParameter>type).isThisType);
    }
    intersectionEmpty(type1: Type, type2: Type) {
      return !!(getUnionType([intersectTypes(type1, type2), neverType]).flags & qt.TypeFlags.Never);
    }
    nonGenericObjectType(type: Type) {
      return !!(type.flags & qt.TypeFlags.Object) && !isGenericMappedType(type);
    }
    emptyObjectTypeOrSpreadsIntoEmptyObject(type: Type) {
      return (
        isEmptyObjectType(type) ||
        !!(
          type.flags &
          (TypeFlags.Null |
            qt.TypeFlags.Undefined |
            qt.TypeFlags.BooleanLike |
            qt.TypeFlags.NumberLike |
            qt.TypeFlags.BigIntLike |
            qt.TypeFlags.StringLike |
            qt.TypeFlags.EnumLike |
            qt.TypeFlags.NonPrimitive |
            qt.TypeFlags.Index)
        )
      );
    }
    singlePropertyAnonymousObjectType(type: Type) {
      return (
        !!(type.flags & qt.TypeFlags.Object) &&
        !!(getObjectFlags(type) & ObjectFlags.Anonymous) &&
        (length(getPropertiesOfType(type)) === 1 || every(getPropertiesOfType(type), (p) => !!(p.flags & qt.SymbolFlags.Optional)))
      );
    }
    spreadableProperty(prop: Symbol): boolean {
      return (
        !some(prop.declarations, isPrivateIdentifierPropertyDeclaration) &&
        (!(prop.flags & (SymbolFlags.Method | qt.SymbolFlags.GetAccessor | qt.SymbolFlags.SetAccessor)) || !prop.declarations.some((decl) => this.classLike(decl.parent)))
      );
    }
    freshLiteralType(type: Type) {
      return !!(type.flags & qt.TypeFlags.Literal) && (<LiteralType>type).freshType === type;
    }
    typeParameterPossiblyReferenced(tp: TypeParameter, node: Node) {
      if (tp.symbol && tp.symbol.declarations && tp.symbol.declarations.length === 1) {
        const container = tp.symbol.declarations[0].parent;
        for (let n = node; n !== container; n = n.parent) {
          if (!n || n.kind === Syntax.Block || (n.kind === Syntax.ConditionalType && qc.forEach.child((<ConditionalTypeNode>n).extendsType, containsReference))) return true;
        }
        return !!qc.forEach.child(node, containsReference);
      }
      return true;
      function containsReference(node: Node): boolean {
        switch (node.kind) {
          case Syntax.ThisType:
            return !!tp.isThisType;
          case Syntax.Identifier:
            return !tp.isThisType && this.partOfTypeNode(node) && maybeTypeParameterReference(node) && getTypeFromTypeNodeWorker(<TypeNode>node) === tp;
          case Syntax.TypeQuery:
            return true;
        }
        return !!qc.forEach.child(node, containsReference);
      }
    }
    contextSensitive(node: Expression | MethodDeclaration | ObjectLiteralElementLike | JsxAttributeLike | JsxChild): boolean {
      assert(node.kind !== Syntax.MethodDeclaration || this.objectLiteralMethod(node));
      switch (node.kind) {
        case Syntax.FunctionExpression:
        case Syntax.ArrowFunction:
        case Syntax.MethodDeclaration:
        case Syntax.FunctionDeclaration:
          return isContextSensitiveFunctionLikeDeclaration(<FunctionExpression | ArrowFunction | MethodDeclaration>node);
        case Syntax.ObjectLiteralExpression:
          return some((<ObjectLiteralExpression>node).properties, isContextSensitive);
        case Syntax.ArrayLiteralExpression:
          return some((<ArrayLiteralExpression>node).elements, isContextSensitive);
        case Syntax.ConditionalExpression:
          return isContextSensitive((<ConditionalExpression>node).whenTrue) || isContextSensitive((<ConditionalExpression>node).whenFalse);
        case Syntax.BinaryExpression:
          return (
            ((<BinaryExpression>node).operatorToken.kind === Syntax.Bar2Token || (<BinaryExpression>node).operatorToken.kind === Syntax.Question2Token) &&
            (isContextSensitive((<BinaryExpression>node).left) || isContextSensitive((<BinaryExpression>node).right))
          );
        case Syntax.PropertyAssignment:
          return isContextSensitive((<PropertyAssignment>node).initer);
        case Syntax.ParenthesizedExpression:
          return isContextSensitive((<ParenthesizedExpression>node).expression);
        case Syntax.JsxAttributes:
          return some((<JsxAttributes>node).properties, isContextSensitive) || (this.kind(qc.JsxOpeningElement, node.parent) && some(node.parent.parent.children, isContextSensitive));
        case Syntax.JsxAttribute: {
          const { initer } = node as JsxAttribute;
          return !!initer && isContextSensitive(initer);
        }
        case Syntax.JsxExpression: {
          const { expression } = node as JsxExpression;
          return !!expression && isContextSensitive(expression);
        }
      }
      return false;
    }
    contextSensitiveFunctionLikeDeclaration(node: FunctionLikeDeclaration): boolean {
      return (
        (!this.kind(qc.FunctionDeclaration, node) || (this.inJSFile(node) && !!getTypeForDeclarationFromDocComment(node))) &&
        (hasContextSensitiveParameters(node) || hasContextSensitiveReturnExpression(node))
      );
    }
    contextSensitiveFunctionOrObjectLiteralMethod(func: Node): func is FunctionExpression | ArrowFunction | MethodDeclaration {
      return (
        ((this.inJSFile(func) && this.kind(qc.FunctionDeclaration, func)) || isFunctionExpressionOrArrowFunction(func) || this.objectLiteralMethod(func)) &&
        isContextSensitiveFunctionLikeDeclaration(func)
      );
    }
    typeIdenticalTo(source: Type, target: Type): boolean {
      return isTypeRelatedTo(source, target, identityRelation);
    }
    typeSubtypeOf(source: Type, target: Type): boolean {
      return isTypeRelatedTo(source, target, subtypeRelation);
    }
    typeAssignableTo(source: Type, target: Type): boolean {
      return isTypeRelatedTo(source, target, assignableRelation);
    }
    typeDerivedFrom(source: Type, target: Type): boolean {
      return source.flags & qt.TypeFlags.Union
        ? every((<UnionType>source).types, (t) => isTypeDerivedFrom(t, target))
        : target.flags & qt.TypeFlags.Union
        ? some((<UnionType>target).types, (t) => isTypeDerivedFrom(source, t))
        : source.flags & qt.TypeFlags.InstantiableNonPrimitive
        ? isTypeDerivedFrom(getBaseConstraintOfType(source) || unknownType, target)
        : target === globalObjectType
        ? !!(source.flags & (TypeFlags.Object | qt.TypeFlags.NonPrimitive))
        : target === globalFunctionType
        ? !!(source.flags & qt.TypeFlags.Object) && isFunctionObjectType(source as ObjectType)
        : hasBaseType(source, getTargetType(target));
    }
    typeComparableTo(source: Type, target: Type): boolean {
      return isTypeRelatedTo(source, target, comparableRelation);
    }
    orHasGenericConditional(type: Type): boolean {
      return !!(type.flags & qt.TypeFlags.Conditional || (type.flags & qt.TypeFlags.Intersection && some((type as IntersectionType).types, isOrHasGenericConditional)));
    }
    signatureAssignableTo(source: Signature, target: Signature, ignoreReturnTypes: boolean): boolean {
      return compareSignaturesRelated(source, target, ignoreReturnTypes ? SignatureCheckMode.IgnoreReturnTypes : 0, false, undefined, undefined, compareTypesAssignable, undefined) !== Ternary.False;
    }
    anySignature(s: Signature) {
      return (
        !s.typeParameters &&
        (!s.thisParameter || isTypeAny(getTypeOfParameter(s.thisParameter))) &&
        s.parameters.length === 1 &&
        signatureHasRestParameter(s) &&
        (getTypeOfParameter(s.parameters[0]) === anyArrayType || isTypeAny(getTypeOfParameter(s.parameters[0]))) &&
        isTypeAny(getReturnTypeOfSignature(s))
      );
    }
    implementationCompatibleWithOverload(implementation: Signature, overload: Signature): boolean {
      const erasedSource = getErasedSignature(implementation);
      const erasedTarget = getErasedSignature(overload);
      const sourceReturnType = getReturnTypeOfSignature(erasedSource);
      const targetReturnType = getReturnTypeOfSignature(erasedTarget);
      if (targetReturnType === voidType || isTypeRelatedTo(targetReturnType, sourceReturnType, assignableRelation) || isTypeRelatedTo(sourceReturnType, targetReturnType, assignableRelation))
        return isSignatureAssignableTo(erasedSource, erasedTarget, true);
      return false;
    }
    emptyResolvedType(t: ResolvedType) {
      return t !== anyFunctionType && t.properties.length === 0 && t.callSignatures.length === 0 && t.constructSignatures.length === 0 && !t.stringIndexInfo && !t.numberIndexInfo;
    }
    emptyObjectType(type: Type): boolean {
      return type.flags & qt.TypeFlags.Object
        ? !isGenericMappedType(type) && isEmptyResolvedType(resolveStructuredTypeMembers(<ObjectType>type))
        : type.flags & qt.TypeFlags.NonPrimitive
        ? true
        : type.flags & qt.TypeFlags.Union
        ? some((<UnionType>type).types, isEmptyObjectType)
        : type.flags & qt.TypeFlags.Intersection
        ? every((<UnionType>type).types, isEmptyObjectType)
        : false;
    }
    emptyAnonymousObjectType(type: Type) {
      return !!(
        getObjectFlags(type) & ObjectFlags.Anonymous &&
        (((<ResolvedType>type).members && isEmptyResolvedType(<ResolvedType>type)) || (type.symbol && type.symbol.flags & qt.SymbolFlags.TypeLiteral && getMembersOfSymbol(type.symbol).size === 0))
      );
    }
    stringIndexSignatureOnlyType(type: Type): boolean {
      return (
        (type.flags & qt.TypeFlags.Object &&
          !isGenericMappedType(type) &&
          getPropertiesOfType(type).length === 0 &&
          getIndexInfoOfType(type, IndexKind.String) &&
          !getIndexInfoOfType(type, IndexKind.Number)) ||
        (type.flags & qt.TypeFlags.UnionOrIntersection && every((<UnionOrIntersectionType>type).types, isStringIndexSignatureOnlyType)) ||
        false
      );
    }
    enumTypeRelatedTo(sourceSymbol: Symbol, targetSymbol: Symbol, errorReporter?: ErrorReporter) {
      if (sourceSymbol === targetSymbol) return true;
      const id = sourceSymbol.getId() + ',' + targetSymbol.getId();
      const entry = enumRelation.get(id);
      if (entry !== undefined && !(!(entry & RelationComparisonResult.Reported) && entry & RelationComparisonResult.Failed && errorReporter)) return !!(entry & RelationComparisonResult.Succeeded);
      if (sourceSymbol.escName !== targetSymbol.escName || !(sourceSymbol.flags & qt.SymbolFlags.RegularEnum) || !(targetSymbol.flags & qt.SymbolFlags.RegularEnum)) {
        enumRelation.set(id, RelationComparisonResult.Failed | RelationComparisonResult.Reported);
        return false;
      }
      const targetEnumType = getTypeOfSymbol(targetSymbol);
      for (const property of getPropertiesOfType(getTypeOfSymbol(sourceSymbol))) {
        if (property.flags & qt.SymbolFlags.EnumMember) {
          const targetProperty = getPropertyOfType(targetEnumType, property.escName);
          if (!targetProperty || !(targetProperty.flags & qt.SymbolFlags.EnumMember)) {
            if (errorReporter) {
              errorReporter(qd.msgs.Property_0_is_missing_in_type_1, property.name, typeToString(getDeclaredTypeOfSymbol(targetSymbol), undefined, TypeFormatFlags.UseFullyQualifiedType));
              enumRelation.set(id, RelationComparisonResult.Failed | RelationComparisonResult.Reported);
            } else enumRelation.set(id, RelationComparisonResult.Failed);
            return false;
          }
        }
      }
      enumRelation.set(id, RelationComparisonResult.Succeeded);
      return true;
    }
    simpleTypeRelatedTo(source: Type, target: Type, relation: qb.QMap<RelationComparisonResult>, errorReporter?: ErrorReporter) {
      const s = source.flags;
      const t = target.flags;
      if (t & qt.TypeFlags.AnyOrUnknown || s & qt.TypeFlags.Never || source === wildcardType) return true;
      if (t & qt.TypeFlags.Never) return false;
      if (s & qt.TypeFlags.StringLike && t & qt.TypeFlags.String) return true;
      if (
        s & qt.TypeFlags.StringLiteral &&
        s & qt.TypeFlags.EnumLiteral &&
        t & qt.TypeFlags.StringLiteral &&
        !(t & qt.TypeFlags.EnumLiteral) &&
        (<StringLiteralType>source).value === (<StringLiteralType>target).value
      )
        return true;
      if (s & qt.TypeFlags.NumberLike && t & qt.TypeFlags.Number) return true;
      if (
        s & qt.TypeFlags.NumberLiteral &&
        s & qt.TypeFlags.EnumLiteral &&
        t & qt.TypeFlags.NumberLiteral &&
        !(t & qt.TypeFlags.EnumLiteral) &&
        (<NumberLiteralType>source).value === (<NumberLiteralType>target).value
      )
        return true;
      if (s & qt.TypeFlags.BigIntLike && t & qt.TypeFlags.BigInt) return true;
      if (s & qt.TypeFlags.BooleanLike && t & qt.TypeFlags.Boolean) return true;
      if (s & qt.TypeFlags.ESSymbolLike && t & qt.TypeFlags.ESSymbol) return true;
      if (s & qt.TypeFlags.Enum && t & qt.TypeFlags.Enum && isEnumTypeRelatedTo(source.symbol, target.symbol, errorReporter)) return true;
      if (s & qt.TypeFlags.EnumLiteral && t & qt.TypeFlags.EnumLiteral) {
        if (s & qt.TypeFlags.Union && t & qt.TypeFlags.Union && isEnumTypeRelatedTo(source.symbol, target.symbol, errorReporter)) return true;
        if (
          s & qt.TypeFlags.Literal &&
          t & qt.TypeFlags.Literal &&
          (<LiteralType>source).value === (<LiteralType>target).value &&
          isEnumTypeRelatedTo(getParentOfSymbol(source.symbol)!, getParentOfSymbol(target.symbol)!, errorReporter)
        )
          return true;
      }
      if (s & qt.TypeFlags.Undefined && (!strictNullChecks || t & (TypeFlags.Undefined | qt.TypeFlags.Void))) return true;
      if (s & qt.TypeFlags.Null && (!strictNullChecks || t & qt.TypeFlags.Null)) return true;
      if (s & qt.TypeFlags.Object && t & qt.TypeFlags.NonPrimitive) return true;
      if (relation === assignableRelation || relation === comparableRelation) {
        if (s & qt.TypeFlags.Any) return true;
        if (s & (TypeFlags.Number | qt.TypeFlags.NumberLiteral) && !(s & qt.TypeFlags.EnumLiteral) && (t & qt.TypeFlags.Enum || (t & qt.TypeFlags.NumberLiteral && t & qt.TypeFlags.EnumLiteral)))
          return true;
      }
      return false;
    }
    typeRelatedTo(source: Type, target: Type, relation: qb.QMap<RelationComparisonResult>) {
      if (isFreshLiteralType(source)) source = (<FreshableType>source).regularType;
      if (isFreshLiteralType(target)) target = (<FreshableType>target).regularType;
      if (source === target) return true;
      if (relation !== identityRelation) {
        if ((relation === comparableRelation && !(target.flags & qt.TypeFlags.Never) && isSimpleTypeRelatedTo(target, source, relation)) || isSimpleTypeRelatedTo(source, target, relation))
          return true;
      } else {
        if (!(source.flags & qt.TypeFlags.UnionOrIntersection) && !(target.flags & qt.TypeFlags.UnionOrIntersection) && source.flags !== target.flags && !(source.flags & qt.TypeFlags.Substructure))
          return false;
      }
      if (source.flags & qt.TypeFlags.Object && target.flags & qt.TypeFlags.Object) {
        const related = relation.get(getRelationKey(source, target, IntersectionState.None, relation));
        if (related !== undefined) return !!(related & RelationComparisonResult.Succeeded);
      }
      if (source.flags & qt.TypeFlags.StructuredOrInstantiable || target.flags & qt.TypeFlags.StructuredOrInstantiable) return check.typeRelatedTo(source, target, relation, undefined);
      return false;
    }
    ignoredJsxProperty(source: Type, sourceProp: Symbol) {
      return getObjectFlags(source) & ObjectFlags.JsxAttributes && !isUnhyphenatedJsxName(sourceProp.escName);
    }
    weakType(type: Type): boolean {
      if (type.flags & qt.TypeFlags.Object) {
        const resolved = resolveStructuredTypeMembers(<ObjectType>type);
        return (
          resolved.callSignatures.length === 0 &&
          resolved.constructSignatures.length === 0 &&
          !resolved.stringIndexInfo &&
          !resolved.numberIndexInfo &&
          resolved.properties.length > 0 &&
          every(resolved.properties, (p) => !!(p.flags & qt.SymbolFlags.Optional))
        );
      }
      if (type.flags & qt.TypeFlags.Intersection) return every((<IntersectionType>type).types, isWeakType);
      return false;
    }
    unconstrainedTypeParameter(type: Type) {
      return type.flags & qt.TypeFlags.TypeParameter && !getConstraintOfTypeParameter(<TypeParameter>type);
    }
    nonDeferredTypeReference(type: Type): type is TypeReference {
      return !!(getObjectFlags(type) & ObjectFlags.Reference) && !(<TypeReference>type).node;
    }
    typeReferenceWithGenericArguments(type: Type): boolean {
      return isNonDeferredTypeReference(type) && some(getTypeArguments(type), (t) => isUnconstrainedTypeParameter(t) || isTypeReferenceWithGenericArguments(t));
    }
    propertyInClassDerivedFrom(prop: Symbol, baseClass: Type | undefined) {
      return forEachProperty(prop, (sp) => {
        const sourceClass = getDeclaringClass(sp);
        return sourceClass ? hasBaseType(sourceClass, baseClass) : false;
      });
    }
    validOverrideOf(sourceProp: Symbol, targetProp: Symbol) {
      return !forEachProperty(targetProp, (tp) => (getDeclarationModifierFlagsFromSymbol(tp) & ModifierFlags.Protected ? !isPropertyInClassDerivedFrom(sourceProp, getDeclaringClass(tp)) : false));
    }
    classDerivedFromDeclaringClasses(checkClass: Type, prop: Symbol) {
      return forEachProperty(prop, (p) => (getDeclarationModifierFlagsFromSymbol(p) & ModifierFlags.Protected ? !hasBaseType(checkClass, getDeclaringClass(p)) : false)) ? undefined : checkClass;
    }
    deeplyNestedType(type: Type, stack: Type[], depth: number): boolean {
      if (depth >= 5 && type.flags & qt.TypeFlags.Object && !isObjectOrArrayLiteralType(type)) {
        const symbol = type.symbol;
        if (symbol) {
          let count = 0;
          for (let i = 0; i < depth; i++) {
            const t = stack[i];
            if (t.flags & qt.TypeFlags.Object && t.symbol === symbol) {
              count++;
              if (count >= 5) return true;
            }
          }
        }
      }
      if (depth >= 5 && type.flags & qt.TypeFlags.IndexedAccess) {
        const root = getRootObjectTypeFromIndexedAccessChain(type);
        let count = 0;
        for (let i = 0; i < depth; i++) {
          const t = stack[i];
          if (getRootObjectTypeFromIndexedAccessChain(t) === root) {
            count++;
            if (count >= 5) return true;
          }
        }
      }
      return false;
    }
    propertyIdenticalTo(sourceProp: Symbol, targetProp: Symbol): boolean {
      return compareProperties(sourceProp, targetProp, compareTypesIdentical) !== Ternary.False;
    }
    matchingSignature(source: Signature, target: Signature, partialMatch: boolean) {
      const sourceParameterCount = getParameterCount(source);
      const targetParameterCount = getParameterCount(target);
      const sourceMinArgumentCount = getMinArgumentCount(source);
      const targetMinArgumentCount = getMinArgumentCount(target);
      const sourceHasRestParameter = hasEffectiveRestParameter(source);
      const targetHasRestParameter = hasEffectiveRestParameter(target);
      if (sourceParameterCount === targetParameterCount && sourceMinArgumentCount === targetMinArgumentCount && sourceHasRestParameter === targetHasRestParameter) return true;
      if (partialMatch && sourceMinArgumentCount <= targetMinArgumentCount) return true;
      return false;
    }
    arrayType(type: Type): boolean {
      return !!(getObjectFlags(type) & ObjectFlags.Reference) && ((<TypeReference>type).target === globalArrayType || (<TypeReference>type).target === globalReadonlyArrayType);
    }
    readonlyArrayType(type: Type): boolean {
      return !!(getObjectFlags(type) & ObjectFlags.Reference) && (<TypeReference>type).target === globalReadonlyArrayType;
    }
    mutableArrayOrTuple(type: Type): boolean {
      return (isArrayType(type) && !isReadonlyArrayType(type)) || (isTupleType(type) && !type.target.readonly);
    }
    arrayLikeType(type: Type): boolean {
      return isArrayType(type) || (!(type.flags & qt.TypeFlags.Nullable) && isTypeAssignableTo(type, anyReadonlyArrayType));
    }
    emptyArrayLiteralType(type: Type): boolean {
      const elementType = isArrayType(type) ? getTypeArguments(<TypeReference>type)[0] : undefined;
      return elementType === undefinedWideningType || elementType === implicitNeverType;
    }
    tupleLikeType(type: Type): boolean {
      return isTupleType(type) || !!getPropertyOfType(type, '0' as qb.__String);
    }
    arrayOrTupleLikeType(type: Type): boolean {
      return isArrayLikeType(type) || isTupleLikeType(type);
    }
    neitherUnitTypeNorNever(type: Type): boolean {
      return !(type.flags & (TypeFlags.Unit | qt.TypeFlags.Never));
    }
    unitType(type: Type): boolean {
      return !!(type.flags & qt.TypeFlags.Unit);
    }
    literalType(type: Type): boolean {
      return type.flags & qt.TypeFlags.Boolean
        ? true
        : type.flags & qt.TypeFlags.Union
        ? type.flags & qt.TypeFlags.EnumLiteral
          ? true
          : every((<UnionType>type).types, isUnitType)
        : isUnitType(type);
    }
    tupleType(type: Type): type is TupleTypeReference {
      return !!(getObjectFlags(type) & ObjectFlags.Reference && (<TypeReference>type).target.objectFlags & ObjectFlags.Tuple);
    }
    zeroBigInt({ value }: BigIntLiteralType) {
      return value.base10Value === '0';
    }
    notOptionalTypeMarker(type: Type) {
      return type !== optionalType;
    }
    coercibleUnderDoubleEquals(source: Type, target: Type): boolean {
      return (source.flags & (TypeFlags.Number | qt.TypeFlags.String | qt.TypeFlags.BooleanLiteral)) !== 0 && (target.flags & (TypeFlags.Number | qt.TypeFlags.String | qt.TypeFlags.Boolean)) !== 0;
    }
    objectTypeWithInferableIndex(type: Type): boolean {
      return type.flags & qt.TypeFlags.Intersection
        ? every((<IntersectionType>type).types, isObjectTypeWithInferableIndex)
        : !!(
            type.symbol &&
            (type.symbol.flags & (SymbolFlags.ObjectLiteral | qt.SymbolFlags.TypeLiteral | qt.SymbolFlags.Enum | qt.SymbolFlags.ValueModule)) !== 0 &&
            !typeHasCallOrConstructSignatures(type)
          ) || !!(getObjectFlags(type) & ObjectFlags.ReverseMapped && isObjectTypeWithInferableIndex((type as ReverseMappedType).source));
    }
    nonGenericTopLevelType(type: Type) {
      if (type.aliasSymbol && !type.aliasTypeArguments) {
        const declaration = getDeclarationOfKind(type.aliasSymbol, Syntax.TypeAliasDeclaration);
        return !!(declaration && qc.findAncestor(declaration.parent, (n) => (n.kind === Syntax.SourceFile ? true : n.kind === Syntax.ModuleDeclaration ? false : 'quit')));
      }
      return false;
    }
    typeParameterAtTopLevel(type: Type, typeParameter: TypeParameter): boolean {
      return !!(
        type === typeParameter ||
        (type.flags & qt.TypeFlags.UnionOrIntersection && some((<UnionOrIntersectionType>type).types, (t) => isTypeParameterAtTopLevel(t, typeParameter))) ||
        (type.flags & qt.TypeFlags.Conditional &&
          (isTypeParameterAtTopLevel(getTrueTypeFromConditionalType(<ConditionalType>type), typeParameter) ||
            isTypeParameterAtTopLevel(getFalseTypeFromConditionalType(<ConditionalType>type), typeParameter)))
      );
    }
    partiallyInferableType(type: Type): boolean {
      return !(getObjectFlags(type) & ObjectFlags.NonInferrableType) || (isObjectLiteralType(type) && some(getPropertiesOfType(type), (prop) => isPartiallyInferableType(getTypeOfSymbol(prop))));
    }
    fromInferenceBlockedSource(type: Type) {
      return !!(type.symbol && some(type.symbol.declarations, hasSkipDirectInferenceFlag));
    }
    typeOrBaseIdenticalTo(s: Type, t: Type) {
      return isTypeIdenticalTo(s, t) || !!((t.flags & qt.TypeFlags.String && s.flags & qt.TypeFlags.StringLiteral) || (t.flags & qt.TypeFlags.Number && s.flags & qt.TypeFlags.NumberLiteral));
    }
    typeCloselyMatchedBy(s: Type, t: Type) {
      return !!((s.flags & qt.TypeFlags.Object && t.flags & qt.TypeFlags.Object && s.symbol && s.symbol === t.symbol) || (s.aliasSymbol && s.aliasTypeArguments && s.aliasSymbol === t.aliasSymbol));
    }
    objectLiteralType(type: Type) {
      return !!(getObjectFlags(type) & ObjectFlags.ObjectLiteral);
    }
    objectOrArrayLiteralType(type: Type) {
      return !!(getObjectFlags(type) & (ObjectFlags.ObjectLiteral | ObjectFlags.ArrayLiteral));
    }
    inTypeQuery(node: Node): boolean {
      return !!qc.findAncestor(node, (n) => (n.kind === Syntax.TypeQuery ? true : n.kind === Syntax.Identifier || n.kind === Syntax.QualifiedName ? false : 'quit'));
    }
    matchingReference(source: Node, target: Node): boolean {
      switch (target.kind) {
        case Syntax.ParenthesizedExpression:
        case Syntax.NonNullExpression:
          return isMatchingReference(source, (target as NonNullExpression | ParenthesizedExpression).expression);
      }
      switch (source.kind) {
        case Syntax.Identifier:
          return (
            (target.kind === Syntax.Identifier && getResolvedSymbol(<Identifier>source) === getResolvedSymbol(<Identifier>target)) ||
            ((target.kind === Syntax.VariableDeclaration || target.kind === Syntax.BindingElement) &&
              getExportSymbolOfValueSymbolIfExported(getResolvedSymbol(<Identifier>source)) === getSymbolOfNode(target))
          );
        case Syntax.ThisKeyword:
          return target.kind === Syntax.ThisKeyword;
        case Syntax.SuperKeyword:
          return target.kind === Syntax.SuperKeyword;
        case Syntax.NonNullExpression:
        case Syntax.ParenthesizedExpression:
          return isMatchingReference((source as NonNullExpression | ParenthesizedExpression).expression, target);
        case Syntax.PropertyAccessExpression:
        case Syntax.ElementAccessExpression:
          return (
            this.accessExpression(target) &&
            getAccessedPropertyName(<AccessExpression>source) === getAccessedPropertyName(target) &&
            isMatchingReference((<AccessExpression>source).expression, target.expression)
          );
      }
      return false;
    }
    discriminantProperty(type: Type | undefined, name: qb.__String) {
      if (type && type.flags & qt.TypeFlags.Union) {
        const prop = getUnionOrIntersectionProperty(<UnionType>type, name);
        if (prop && getCheckFlags(prop) & qt.CheckFlags.SyntheticProperty) {
          if ((<TransientSymbol>prop).isDiscriminantProperty === undefined) {
            (<TransientSymbol>prop).isDiscriminantProperty =
              ((<TransientSymbol>prop).checkFlags & qt.CheckFlags.Discriminant) === qt.CheckFlags.Discriminant && !maybeTypeOfKind(getTypeOfSymbol(prop), qt.TypeFlags.Instantiable);
          }
          return !!(<TransientSymbol>prop).isDiscriminantProperty;
        }
      }
      return false;
    }
    orContainsMatchingReference(source: Node, target: Node) {
      return isMatchingReference(source, target) || containsMatchingReference(source, target);
    }
    functionObjectType(type: ObjectType): boolean {
      const resolved = resolveStructuredTypeMembers(type);
      return !!(resolved.callSignatures.length || resolved.constructSignatures.length || (resolved.members.get('bind' as qb.__String) && isTypeSubtypeOf(type, globalFunctionType)));
    }
    destructuringAssignmentTarget(parent: Node) {
      return (
        (parent.parent.kind === Syntax.BinaryExpression && (parent.parent as BinaryExpression).left === parent) ||
        (parent.parent.kind === Syntax.ForOfStatement && (parent.parent as ForOfStatement).initer === parent)
      );
    }
    emptyArrayAssignment(node: VariableDeclaration | BindingElement | Expression) {
      return (
        (node.kind === Syntax.VariableDeclaration && (<VariableDeclaration>node).initer && isEmptyArrayLiteral((<VariableDeclaration>node).initer!)) ||
        (node.kind !== Syntax.BindingElement && node.parent.kind === Syntax.BinaryExpression && isEmptyArrayLiteral((<BinaryExpression>node.parent).right))
      );
    }
    typeSubsetOf(source: Type, target: Type) {
      return source === target || (target.flags & qt.TypeFlags.Union && isTypeSubsetOfUnion(source, <UnionType>target));
    }
    typeSubsetOfUnion(source: Type, target: UnionType) {
      if (source.flags & qt.TypeFlags.Union) {
        for (const t of (<UnionType>source).types) {
          if (!containsType(target.types, t)) return false;
        }
        return true;
      }
      if (source.flags & qt.TypeFlags.EnumLiteral && getBaseTypeOfEnumLiteralType(<LiteralType>source) === target) return true;
      return containsType(target.types, source);
    }
    incomplete(flowType: FlowType) {
      return flowType.flags === 0;
    }
    evolvingArrayTypeList(types: Type[]) {
      let hasEvolvingArrayType = false;
      for (const t of types) {
        if (!(t.flags & qt.TypeFlags.Never)) {
          if (!(getObjectFlags(t) & ObjectFlags.EvolvingArray)) return false;
          hasEvolvingArrayType = true;
        }
      }
      return hasEvolvingArrayType;
    }
    evolvingArrayOperationTarget(node: Node) {
      const root = getReferenceRoot(node);
      const parent = root.parent;
      const isLengthPushOrUnshift =
        this.kind(qc.PropertyAccessExpression, parent) &&
        (parent.name.escapedText === 'length' || (parent.parent.kind === Syntax.CallExpression && this.kind(qc.Identifier, parent.name) && isPushOrUnshiftIdentifier(parent.name)));
      const isElementAssignment =
        parent.kind === Syntax.ElementAccessExpression &&
        (<ElementAccessExpression>parent).expression === root &&
        parent.parent.kind === Syntax.BinaryExpression &&
        (<BinaryExpression>parent.parent).operatorToken.kind === Syntax.EqualsToken &&
        (<BinaryExpression>parent.parent).left === parent &&
        !this.assignmentTarget(parent.parent) &&
        isTypeAssignableToKind(getTypeOfExpression((<ElementAccessExpression>parent).argumentExpression), qt.TypeFlags.NumberLike);
      return isLengthPushOrUnshift || isElementAssignment;
    }
    declarationWithExplicitTypeAnnotation(declaration: Declaration) {
      return (
        (declaration.kind === Syntax.VariableDeclaration ||
          declaration.kind === Syntax.Parameter ||
          declaration.kind === Syntax.PropertyDeclaration ||
          declaration.kind === Syntax.PropertySignature) &&
        !!qx.get.effectiveTypeAnnotationNode(declaration as VariableDeclaration | ParameterDeclaration | PropertyDeclaration | PropertySignature)
      );
    }
    reachableFlowNode(flow: FlowNode) {
      const result = isReachableFlowNodeWorker(flow, false);
      lastFlowNode = flow;
      lastFlowNodeReachable = result;
      return result;
    }
    falseExpression(expr: Expression): boolean {
      const node = skipParentheses(expr);
      return (
        node.kind === Syntax.FalseKeyword ||
        (node.kind === Syntax.BinaryExpression &&
          (((<BinaryExpression>node).operatorToken.kind === Syntax.Ampersand2Token && (isFalseExpression((<BinaryExpression>node).left) || isFalseExpression((<BinaryExpression>node).right))) ||
            ((<BinaryExpression>node).operatorToken.kind === Syntax.Bar2Token && isFalseExpression((<BinaryExpression>node).left) && isFalseExpression((<BinaryExpression>node).right))))
      );
    }
    reachableFlowNodeWorker(flow: FlowNode, noCacheCheck: boolean): boolean {
      while (true) {
        if (flow === lastFlowNode) return lastFlowNodeReachable;
        const flags = flow.flags;
        if (flags & FlowFlags.Shared) {
          if (!noCacheCheck) {
            const id = getFlowNodeId(flow);
            const reachable = flowNodeReachable[id];
            return reachable !== undefined ? reachable : (flowNodeReachable[id] = isReachableFlowNodeWorker(flow, true));
          }
          noCacheCheck = false;
        }
        if (flags & (FlowFlags.Assignment | FlowFlags.Condition | FlowFlags.ArrayMutation)) flow = (<FlowAssignment | FlowCondition | FlowArrayMutation>flow).antecedent;
        else if (flags & FlowFlags.Call) {
          const signature = getEffectsSignature((<FlowCall>flow).node);
          if (signature) {
            const predicate = getTypePredicateOfSignature(signature);
            if (predicate && predicate.kind === TypePredicateKind.AssertsIdentifier) {
              const predicateArgument = (<FlowCall>flow).node.arguments[predicate.parameterIndex];
              if (predicateArgument && isFalseExpression(predicateArgument)) return false;
            }
            if (getReturnTypeOfSignature(signature).flags & qt.TypeFlags.Never) return false;
          }
          flow = (<FlowCall>flow).antecedent;
        } else if (flags & FlowFlags.BranchLabel) {
          return some((<FlowLabel>flow).antecedents, (f) => isReachableFlowNodeWorker(f, false));
        } else if (flags & FlowFlags.LoopLabel) {
          flow = (<FlowLabel>flow).antecedents![0];
        } else if (flags & FlowFlags.SwitchClause) {
          if ((<FlowSwitchClause>flow).clauseStart === (<FlowSwitchClause>flow).clauseEnd && isExhaustiveSwitchStatement((<FlowSwitchClause>flow).switchStatement)) return false;
          flow = (<FlowSwitchClause>flow).antecedent;
        } else if (flags & FlowFlags.ReduceLabel) {
          lastFlowNode = undefined;
          const target = (<FlowReduceLabel>flow).target;
          const saveAntecedents = target.antecedents;
          target.antecedents = (<FlowReduceLabel>flow).antecedents;
          const result = isReachableFlowNodeWorker((<FlowReduceLabel>flow).antecedent, false);
          target.antecedents = saveAntecedents;
          return result;
        }
        return !(flags & FlowFlags.Unreachable);
      }
    }
    postSuperFlowNode(flow: FlowNode, noCacheCheck: boolean): boolean {
      while (true) {
        const flags = flow.flags;
        if (flags & FlowFlags.Shared) {
          if (!noCacheCheck) {
            const id = getFlowNodeId(flow);
            const postSuper = flowNodePostSuper[id];
            return postSuper !== undefined ? postSuper : (flowNodePostSuper[id] = isPostSuperFlowNode(flow, true));
          }
          noCacheCheck = false;
        }
        if (flags & (FlowFlags.Assignment | FlowFlags.Condition | FlowFlags.ArrayMutation | FlowFlags.SwitchClause))
          flow = (<FlowAssignment | FlowCondition | FlowArrayMutation | FlowSwitchClause>flow).antecedent;
        else if (flags & FlowFlags.Call) {
          if ((<FlowCall>flow).node.expression.kind === Syntax.SuperKeyword) return true;
          flow = (<FlowCall>flow).antecedent;
        } else if (flags & FlowFlags.BranchLabel) {
          return every((<FlowLabel>flow).antecedents, (f) => isPostSuperFlowNode(f, false));
        } else if (flags & FlowFlags.LoopLabel) {
          flow = (<FlowLabel>flow).antecedents![0];
        } else if (flags & FlowFlags.ReduceLabel) {
          const target = (<FlowReduceLabel>flow).target;
          const saveAntecedents = target.antecedents;
          target.antecedents = (<FlowReduceLabel>flow).antecedents;
          const result = isPostSuperFlowNode((<FlowReduceLabel>flow).antecedent, false);
          target.antecedents = saveAntecedents;
          return result;
        }
        return !!(flags & FlowFlags.Unreachable);
      }
    }
    constraintPosition(node: Node) {
      const parent = node.parent;
      return (
        parent.kind === Syntax.PropertyAccessExpression ||
        (parent.kind === Syntax.CallExpression && (<CallExpression>parent).expression === node) ||
        (parent.kind === Syntax.ElementAccessExpression && (<ElementAccessExpression>parent).expression === node) ||
        (parent.kind === Syntax.BindingElement && (<BindingElement>parent).name === node && !!(<BindingElement>parent).initer)
      );
    }
    exportOrExportExpression(location: Node) {
      return !!qc.findAncestor(location, (e) => e.parent && this.kind(qc.ExportAssignment, e.parent) && e.parent.expression === e && this.entityNameExpression(e));
    }
    insideFunction(node: Node, threshold: Node): boolean {
      return !!qc.findAncestor(node, (n) => (n === threshold ? 'quit' : this.functionLike(n)));
    }
    bindingCapturedByNode(node: Node, decl: VariableDeclaration | BindingElement) {
      const links = getNodeLinks(node);
      return !!links && contains(links.capturedBlockScopeBindings, getSymbolOfNode(decl));
    }
    assignedInBodyOfForStatement(node: Identifier, container: ForStatement): boolean {
      let current: Node = node;
      while (current.parent.kind === Syntax.ParenthesizedExpression) {
        current = current.parent;
      }
      let isAssigned = false;
      if (this.assignmentTarget(current)) isAssigned = true;
      else if (current.parent.kind === Syntax.PrefixUnaryExpression || current.parent.kind === Syntax.PostfixUnaryExpression) {
        const expr = <PrefixUnaryExpression | PostfixUnaryExpression>current.parent;
        isAssigned = expr.operator === Syntax.Plus2Token || expr.operator === Syntax.Minus2Token;
      }
      if (!isAssigned) return false;
      return !!qc.findAncestor(current, (n) => (n === container ? 'quit' : n === container.statement));
    }
    inConstructorArgumentIniter(node: Node, constructorDecl: Node): boolean {
      return !!qc.findAncestor(node, (n) => (this.functionLikeDeclaration(n) ? 'quit' : n.kind === Syntax.Parameter && n.parent === constructorDecl));
    }
    inParameterIniterBeforeContainingFunction(node: Node) {
      let inBindingIniter = false;
      while (node.parent && !this.functionLike(node.parent)) {
        if (this.kind(qc.ParameterDeclaration, node.parent) && (inBindingIniter || node.parent.initer === node)) return true;
        if (this.kind(qc.BindingElement, node.parent) && node.parent.initer === node) inBindingIniter = true;
        node = node.parent;
      }
      return false;
    }
    possiblyDiscriminantValue(node: Expression): boolean {
      switch (node.kind) {
        case Syntax.StringLiteral:
        case Syntax.NumericLiteral:
        case Syntax.BigIntLiteral:
        case Syntax.NoSubstitutionLiteral:
        case Syntax.TrueKeyword:
        case Syntax.FalseKeyword:
        case Syntax.NullKeyword:
        case Syntax.Identifier:
        case Syntax.UndefinedKeyword:
          return true;
        case Syntax.PropertyAccessExpression:
        case Syntax.ParenthesizedExpression:
          return isPossiblyDiscriminantValue((<PropertyAccessExpression | ParenthesizedExpression>node).expression);
        case Syntax.JsxExpression:
          return !(node as JsxExpression).expression || isPossiblyDiscriminantValue((node as JsxExpression).expression!);
      }
      return false;
    }
    aritySmaller(signature: Signature, target: SignatureDeclaration) {
      let targetParameterCount = 0;
      for (; targetParameterCount < target.parameters.length; targetParameterCount++) {
        const param = target.parameters[targetParameterCount];
        if (param.initer || param.questionToken || param.dot3Token || isDocOptionalParameter(param)) break;
      }
      if (target.parameters.length && parameterIsThqy.this.keyword(target.parameters[0])) targetParameterCount--;
      return !hasEffectiveRestParameter(signature) && getParameterCount(signature) < targetParameterCount;
    }
    functionExpressionOrArrowFunction(node: Node): node is FunctionExpression | ArrowFunction {
      return node.kind === Syntax.FunctionExpression || node.kind === Syntax.ArrowFunction;
    }
    numericName(name: DeclarationName): boolean {
      switch (name.kind) {
        case Syntax.ComputedPropertyName:
          return isNumericComputedName(name);
        case Syntax.Identifier:
          return NumericLiteral.name(name.escapedText);
        case Syntax.NumericLiteral:
        case Syntax.StringLiteral:
          return NumericLiteral.name(name.text);
        default:
          return false;
      }
    }
    numericComputedName(name: ComputedPropertyName): boolean {
      return isTypeAssignableToKind(check.computedPropertyName(name), qt.TypeFlags.NumberLike);
    }
    infinityOrNaNString(name: string | qb.__String): boolean {
      return name === 'Infinity' || name === '-Infinity' || name === 'NaN';
    }
    validSpreadType(type: Type): boolean {
      if (type.flags & qt.TypeFlags.Instantiable) {
        const constraint = getBaseConstraintOfType(type);
        if (constraint !== undefined) return isValidSpreadType(constraint);
      }
      return !!(
        type.flags & (TypeFlags.Any | qt.TypeFlags.NonPrimitive | qt.TypeFlags.Object | qt.TypeFlags.InstantiableNonPrimitive) ||
        (getFalsyFlags(type) & qt.TypeFlags.DefinitelyFalsy && isValidSpreadType(removeDefinitelyFalsyTypes(type))) ||
        (type.flags & qt.TypeFlags.UnionOrIntersection && every((<UnionOrIntersectionType>type).types, isValidSpreadType))
      );
    }
    unhyphenatedJsxName(name: string | qb.__String) {
      return !stringContains(name as string, '-');
    }
    jsxIntrinsicIdentifier(tagName: JsxTagNameExpression): boolean {
      return tagName.kind === Syntax.Identifier && qy.this.intrinsicJsxName(tagName.escapedText);
    }
    knownProperty(targetType: Type, name: qb.__String, isComparingJsxAttributes: boolean): boolean {
      if (targetType.flags & qt.TypeFlags.Object) {
        const resolved = resolveStructuredTypeMembers(targetType as ObjectType);
        if (
          resolved.stringIndexInfo ||
          (resolved.numberIndexInfo && NumericLiteral.name(name)) ||
          getPropertyOfObjectType(targetType, name) ||
          (isComparingJsxAttributes && !isUnhyphenatedJsxName(name))
        ) {
          return true;
        }
      } else if (targetType.flags & qt.TypeFlags.UnionOrIntersection && isExcessPropertyCheckTarget(targetType)) {
        for (const t of (targetType as UnionOrIntersectionType).types) {
          if (isKnownProperty(t, name, isComparingJsxAttributes)) return true;
        }
      }
      return false;
    }
    excessPropertyCheckTarget(type: Type): boolean {
      return !!(
        (type.flags & qt.TypeFlags.Object && !(getObjectFlags(type) & ObjectFlags.ObjectLiteralPatternWithComputedProperties)) ||
        type.flags & qt.TypeFlags.NonPrimitive ||
        (type.flags & qt.TypeFlags.Union && some((<UnionType>type).types, isExcessPropertyCheckTarget)) ||
        (type.flags & qt.TypeFlags.Intersection && every((<IntersectionType>type).types, isExcessPropertyCheckTarget))
      );
    }
    nullableType(type: Type) {
      return !!((strictNullChecks ? getFalsyFlags(type) : type.flags) & qt.TypeFlags.Nullable);
    }
    methodAccessForCall(node: Node) {
      while (node.parent.kind === Syntax.ParenthesizedExpression) {
        node = node.parent;
      }
      return this.callOrNewExpression(node.parent) && node.parent.expression === node;
    }
    thisPropertyAccessInConstructor(node: ElementAccessExpression | PropertyAccessExpression | QualifiedName, prop: Symbol) {
      return this.thisProperty(node) && (isAutoTypedProperty(prop) || isConstructorDeclaredProperty(prop)) && qx.get.thisContainer(node, true) === getDeclaringConstructor(prop);
    }
    inPropertyIniter(node: Node): boolean {
      return !!qc.findAncestor(node, (node) => {
        switch (node.kind) {
          case Syntax.PropertyDeclaration:
            return true;
          case Syntax.PropertyAssignment:
          case Syntax.MethodDeclaration:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
          case Syntax.SpreadAssignment:
          case Syntax.ComputedPropertyName:
          case Syntax.TemplateSpan:
          case Syntax.JsxExpression:
          case Syntax.JsxAttribute:
          case Syntax.JsxAttributes:
          case Syntax.JsxSpreadAttribute:
          case Syntax.JsxOpeningElement:
          case Syntax.ExpressionWithTypeArguments:
          case Syntax.HeritageClause:
            return false;
          default:
            return this.expressionNode(node) ? false : 'quit';
        }
      });
    }
    propertyDeclaredInAncestorClass(prop: Symbol): boolean {
      if (!(prop.parent!.flags & qt.SymbolFlags.Class)) return false;
      let classType: InterfaceType | undefined = getTypeOfSymbol(prop.parent!) as InterfaceType;
      while (true) {
        classType = classType.symbol && (getSuperClass(classType) as InterfaceType | undefined);
        if (!classType) return false;
        const superProperty = getPropertyOfType(classType, prop.escName);
        if (superProperty && superProperty.valueDeclaration) return true;
      }
    }
    validPropertyAccess(node: PropertyAccessExpression | QualifiedName | ImportTypeNode, propertyName: qb.__String): boolean {
      switch (node.kind) {
        case Syntax.PropertyAccessExpression:
          return isValidPropertyAccessWithType(node, node.expression.kind === Syntax.SuperKeyword, propertyName, getWidenedType(check.expression(node.expression)));
        case Syntax.QualifiedName:
          return isValidPropertyAccessWithType(node, false, propertyName, getWidenedType(check.expression(node.left)));
        case Syntax.ImportType:
          return isValidPropertyAccessWithType(node, false, propertyName, getTypeFromTypeNode(node));
      }
    }
    validPropertyAccessForCompletions(node: PropertyAccessExpression | ImportTypeNode | QualifiedName, type: Type, property: Symbol): boolean {
      return isValidPropertyAccessWithType(node, node.kind === Syntax.PropertyAccessExpression && node.expression.kind === Syntax.SuperKeyword, property.escName, type);
    }
    validPropertyAccessWithType(node: PropertyAccessExpression | QualifiedName | ImportTypeNode, isSuper: boolean, propertyName: qb.__String, type: Type): boolean {
      if (type === errorType || isTypeAny(type)) return true;
      const prop = getPropertyOfType(type, propertyName);
      if (prop) {
        if (this.kind(qc.PropertyAccessExpression, node) && prop.valueDeclaration?.this.privateIdentifierPropertyDeclaration()) {
          const declClass = qx.get.containingClass(prop.valueDeclaration);
          return !this.optionalChain(node) && !!qc.findAncestor(node, (parent) => parent === declClass);
        }
        return check.propertyAccessibility(node, isSuper, type, prop);
      }
      return this.inJSFile(node) && (type.flags & qt.TypeFlags.Union) !== 0 && (<UnionType>type).types.some((elementType) => isValidPropertyAccessWithType(node, isSuper, propertyName, elementType));
    }
    forInVariableForNumericPropertyNames(expr: Expression) {
      const e = skipParentheses(expr);
      if (e.kind === Syntax.Identifier) {
        const symbol = getResolvedSymbol(<Identifier>e);
        if (symbol.flags & qt.SymbolFlags.Variable) {
          let child: Node = expr;
          let node = expr.parent;
          while (node) {
            if (
              node.kind === Syntax.ForInStatement &&
              child === (<ForInStatement>node).statement &&
              getForInVariableSymbol(<ForInStatement>node) === symbol &&
              hasNumericPropertyNames(getTypeOfExpression((<ForInStatement>node).expression))
            ) {
              return true;
            }
            child = node;
            node = node.parent;
          }
        }
      }
      return false;
    }
    spreadArgument(arg: Expression | undefined): arg is Expression {
      return !!arg && (arg.kind === Syntax.SpreadElement || (arg.kind === Syntax.SyntheticExpression && (<SyntheticExpression>arg).isSpread));
    }
    genericFunctionReturningFunction(signature: Signature) {
      return !!(signature.typeParameters && isFunctionType(getReturnTypeOfSignature(signature)));
    }
    untypedFunctionCall(funcType: Type, apparentFuncType: Type, numCallSignatures: number, numConstructSignatures: number): boolean {
      return (
        isTypeAny(funcType) ||
        (isTypeAny(apparentFuncType) && !!(funcType.flags & qt.TypeFlags.TypeParameter)) ||
        (!numCallSignatures && !numConstructSignatures && !(apparentFuncType.flags & (TypeFlags.Union | qt.TypeFlags.Never)) && isTypeAssignableTo(funcType, globalFunctionType))
      );
    }
    constructorAccessible(node: NewExpression, signature: Signature) {
      if (!signature || !signature.declaration) return true;
      const declaration = signature.declaration;
      const modifiers = qx.get.selectedEffectiveModifierFlags(declaration, ModifierFlags.NonPublicAccessibilityModifier);
      if (!modifiers || declaration.kind !== Syntax.Constructor) return true;
      const declaringClassDeclaration = getClassLikeDeclarationOfSymbol(declaration.parent.symbol)!;
      const declaringClass = <InterfaceType>getDeclaredTypeOfSymbol(declaration.parent.symbol);
      if (!isNodeWithinClass(node, declaringClassDeclaration)) {
        const containingClass = qx.get.containingClass(node);
        if (containingClass && modifiers & ModifierFlags.Protected) {
          const containingType = getTypeOfNode(containingClass);
          if (typeHasProtectedAccessibleBase(declaration.parent.symbol, containingType as InterfaceType)) return true;
        }
        if (modifiers & ModifierFlags.Private) error(node, qd.msgs.Constructor_of_class_0_is_private_and_only_accessible_within_the_class_declaration, typeToString(declaringClass));
        if (modifiers & ModifierFlags.Protected) error(node, qd.msgs.Constructor_of_class_0_is_protected_and_only_accessible_within_the_class_declaration, typeToString(declaringClass));
        return false;
      }
      return true;
    }
    potentiallyUncalledDecorator(decorator: Decorator, signatures: readonly Signature[]) {
      return (
        signatures.length &&
        every(signatures, (signature) => signature.minArgumentCount === 0 && !signatureHasRestParameter(signature) && signature.parameters.length < getDecoratorArgumentCount(decorator, signature))
      );
    }
    jSConstructor(node: Node | undefined): node is FunctionDeclaration | FunctionExpression {
      if (!node || !this.inJSFile(node)) return false;
      const func =
        this.kind(qc.FunctionDeclaration, node) || this.kind(qc.FunctionExpression, node)
          ? node
          : this.kind(qc.VariableDeclaration, node) && node.initer && this.kind(qc.FunctionExpression, node.initer)
          ? node.initer
          : undefined;
      if (func) {
        if (qc.getDoc.classTag(node)) return true;
        const symbol = getSymbolOfNode(func);
        return !!symbol && qb.hasEntries(symbol.members);
      }
      return false;
    }
    symbolOrSymbolForCall(node: Node) {
      if (!this.kind(qc.CallExpression, node)) return false;
      let left = node.expression;
      if (this.kind(qc.PropertyAccessExpression, left) && left.name.escapedText === 'for') left = left.expression;
      if (!this.kind(qc.Identifier, left) || left.escapedText !== 'Symbol') return false;
      const globalESSymbol = getGlobalESSymbolConstructorSymbol(false);
      if (!globalESSymbol) return false;
      return globalESSymbol === resolveName(left, 'Symbol' as qb.__String, qt.SymbolFlags.Value, undefined, undefined, false);
    }
    commonJsRequire(node: Node): boolean {
      if (!isRequireCall(node, true)) return false;
      if (!this.kind(qc.Identifier, node.expression)) return qb.fail();
      const resolvedRequire = resolveName(node.expression, node.expression.escapedText, qt.SymbolFlags.Value, undefined, undefined, true)!;
      if (resolvedRequire === requireSymbol) return true;
      if (resolvedRequire.flags & qt.SymbolFlags.Alias) return false;
      const targetDeclarationKind =
        resolvedRequire.flags & qt.SymbolFlags.Function ? Syntax.FunctionDeclaration : resolvedRequire.flags & qt.SymbolFlags.Variable ? Syntax.VariableDeclaration : Syntax.Unknown;
      if (targetDeclarationKind !== Syntax.Unknown) {
        const decl = getDeclarationOfKind(resolvedRequire, targetDeclarationKind)!;
        return !!decl && !!(decl.flags & NodeFlags.Ambient);
      }
      return false;
    }
    validConstAssertionArgument(node: Node): boolean {
      switch (node.kind) {
        case Syntax.StringLiteral:
        case Syntax.NoSubstitutionLiteral:
        case Syntax.NumericLiteral:
        case Syntax.BigIntLiteral:
        case Syntax.TrueKeyword:
        case Syntax.FalseKeyword:
        case Syntax.ArrayLiteralExpression:
        case Syntax.ObjectLiteralExpression:
          return true;
        case Syntax.ParenthesizedExpression:
          return isValidConstAssertionArgument((<ParenthesizedExpression>node).expression);
        case Syntax.PrefixUnaryExpression:
          const op = (<PrefixUnaryExpression>node).operator;
          const arg = (<PrefixUnaryExpression>node).operand;
          return (op === Syntax.MinusToken && (arg.kind === Syntax.NumericLiteral || arg.kind === Syntax.BigIntLiteral)) || (op === Syntax.PlusToken && arg.kind === Syntax.NumericLiteral);
        case Syntax.PropertyAccessExpression:
        case Syntax.ElementAccessExpression:
          const expr = (<PropertyAccessExpression | ElementAccessExpression>node).expression;
          if (this.kind(qc.Identifier, expr)) {
            let symbol = getSymbolAtLocation(expr);
            if (symbol && symbol.flags & qt.SymbolFlags.Alias) symbol = this.resolveAlias();
            return !!(symbol && symbol.flags & qt.SymbolFlags.Enum && getEnumKind(symbol) === EnumKind.Literal);
          }
      }
      return false;
    }
    validDeclarationForTupleLabel(d: Declaration): d is NamedTupleMember | (ParameterDeclaration & { name: qc.Identifier }) {
      return d.kind === Syntax.NamedTupleMember || (this.kind(qc.ParameterDeclaration, d) && d.name && this.kind(qc.Identifier, d.name));
    }
    exhaustiveSwitchStatement(node: SwitchStatement): boolean {
      const links = getNodeLinks(node);
      return links.isExhaustive !== undefined ? links.isExhaustive : (links.isExhaustive = computeExhaustiveSwitchStatement(node));
    }
    readonlyAssignmentDeclaration(d: Declaration) {
      if (!this.kind(qc.CallExpression, d)) return false;
      if (!isBindableObjectDefinePropertyCall(d)) return false;
      const objectLitType = check.expressionCached(d.arguments[2]);
      const valueType = getTypeOfPropertyOfType(objectLitType, 'value' as qb.__String);
      if (valueType) {
        const writableProp = getPropertyOfType(objectLitType, 'writable' as qb.__String);
        const writableType = writableProp && getTypeOfSymbol(writableProp);
        if (!writableType || writableType === falseType || writableType === regularFalseType) return true;
        if (writableProp && writableProp.valueDeclaration && this.kind(qc.PropertyAssignment, writableProp.valueDeclaration)) {
          const initer = writableProp.valueDeclaration.initer;
          const rawOriginalType = check.expression(initer);
          if (rawOriginalType === falseType || rawOriginalType === regularFalseType) return true;
        }
        return false;
      }
      const setProp = getPropertyOfType(objectLitType, 'set' as qb.__String);
      return !setProp;
    }
    assignmentToReadonlyEntity(expr: Expression, symbol: Symbol, assignmentKind: AssignmentKind) {
      if (assignmentKind === AssignmentKind.None) return false;
      if (isReadonlySymbol(symbol)) {
        if (symbol.flags & qt.SymbolFlags.Property && this.accessExpression(expr) && expr.expression.kind === Syntax.ThisKeyword) {
          const ctor = qx.get.containingFunction(expr);
          if (!(ctor && ctor.kind === Syntax.Constructor)) return true;
          if (symbol.valueDeclaration) {
            const isAssignmentDeclaration = this.kind(qc.BinaryExpression, symbol.valueDeclaration);
            const isLocalPropertyDeclaration = ctor.parent === symbol.valueDeclaration.parent;
            const isLocalParameterProperty = ctor === symbol.valueDeclaration.parent;
            const isLocalThisPropertyAssignment = isAssignmentDeclaration && symbol.parent?.valueDeclaration === ctor.parent;
            const isLocalThisPropertyAssignmentConstructorFunction = isAssignmentDeclaration && symbol.parent?.valueDeclaration === ctor;
            const isWriteableSymbol = isLocalPropertyDeclaration || isLocalParameterProperty || isLocalThisPropertyAssignment || isLocalThisPropertyAssignmentConstructorFunction;
            return !isWriteableSymbol;
          }
        }
        return true;
      }
      if (this.accessExpression(expr)) {
        const node = skipParentheses(expr.expression);
        if (node.kind === Syntax.Identifier) {
          const symbol = getNodeLinks(node).resolvedSymbol!;
          if (symbol.flags & qt.SymbolFlags.Alias) {
            const declaration = symbol.getDeclarationOfAliasSymbol();
            return !!declaration && declaration.kind === Syntax.NamespaceImport;
          }
        }
      }
      return false;
    }
    topLevelAwait(node: AwaitExpression) {
      const container = qx.get.thisContainer(node, true);
      return this.kind(qc.SourceFile, container);
    }
    typeAssignableToKind(source: Type, kind: qt.TypeFlags, strict?: boolean): boolean {
      if (source.flags & kind) return true;
      if (strict && source.flags & (TypeFlags.AnyOrUnknown | qt.TypeFlags.Void | qt.TypeFlags.Undefined | qt.TypeFlags.Null)) return false;
      return (
        (!!(kind & qt.TypeFlags.NumberLike) && isTypeAssignableTo(source, numberType)) ||
        (!!(kind & qt.TypeFlags.BigIntLike) && isTypeAssignableTo(source, bigintType)) ||
        (!!(kind & qt.TypeFlags.StringLike) && isTypeAssignableTo(source, stringType)) ||
        (!!(kind & qt.TypeFlags.BooleanLike) && isTypeAssignableTo(source, booleanType)) ||
        (!!(kind & qt.TypeFlags.Void) && isTypeAssignableTo(source, voidType)) ||
        (!!(kind & qt.TypeFlags.Never) && isTypeAssignableTo(source, neverType)) ||
        (!!(kind & qt.TypeFlags.Null) && isTypeAssignableTo(source, nullType)) ||
        (!!(kind & qt.TypeFlags.Undefined) && isTypeAssignableTo(source, undefinedType)) ||
        (!!(kind & qt.TypeFlags.ESSymbol) && isTypeAssignableTo(source, esSymbolType)) ||
        (!!(kind & qt.TypeFlags.NonPrimitive) && isTypeAssignableTo(source, nonPrimitiveType))
      );
    }
    constEnumObjectType(type: Type): boolean {
      return !!(getObjectFlags(type) & ObjectFlags.Anonymous) && !!type.symbol && isConstEnumSymbol(type.symbol);
    }
    sideEffectFree(node: Node): boolean {
      node = skipParentheses(node);
      switch (node.kind) {
        case Syntax.Identifier:
        case Syntax.StringLiteral:
        case Syntax.RegexLiteral:
        case Syntax.TaggedTemplateExpression:
        case Syntax.TemplateExpression:
        case Syntax.NoSubstitutionLiteral:
        case Syntax.NumericLiteral:
        case Syntax.BigIntLiteral:
        case Syntax.TrueKeyword:
        case Syntax.FalseKeyword:
        case Syntax.NullKeyword:
        case Syntax.UndefinedKeyword:
        case Syntax.FunctionExpression:
        case Syntax.ClassExpression:
        case Syntax.ArrowFunction:
        case Syntax.ArrayLiteralExpression:
        case Syntax.ObjectLiteralExpression:
        case Syntax.TypeOfExpression:
        case Syntax.NonNullExpression:
        case Syntax.JsxSelfClosingElement:
        case Syntax.JsxElement:
          return true;
        case Syntax.ConditionalExpression:
          return isSideEffectFree((node as ConditionalExpression).whenTrue) && isSideEffectFree((node as ConditionalExpression).whenFalse);
        case Syntax.BinaryExpression:
          if (qy.this.assignmentOperator((node as BinaryExpression).operatorToken.kind)) return false;
          return isSideEffectFree((node as BinaryExpression).left) && isSideEffectFree((node as BinaryExpression).right);
        case Syntax.PrefixUnaryExpression:
        case Syntax.PostfixUnaryExpression:
          switch ((node as PrefixUnaryExpression).operator) {
            case Syntax.ExclamationToken:
            case Syntax.PlusToken:
            case Syntax.MinusToken:
            case Syntax.TildeToken:
              return true;
          }
          return false;
        case Syntax.VoidExpression:
        case Syntax.TypeAssertionExpression:
        case Syntax.AsExpression:
        default:
          return false;
      }
    }
    typeEqualityComparableTo(source: Type, target: Type) {
      return (target.flags & qt.TypeFlags.Nullable) !== 0 || isTypeComparableTo(source, target);
    }
    nodekind(TypeAssertion, node: Expression) {
      node = skipParentheses(node);
      return node.kind === Syntax.TypeAssertionExpression || node.kind === Syntax.AsExpression;
    }
    literalOfContextualType(candidateType: Type, contextualType: Type | undefined): boolean {
      if (contextualType) {
        if (contextualType.flags & qt.TypeFlags.UnionOrIntersection) {
          const types = (<UnionType>contextualType).types;
          return some(types, (t) => isLiteralOfContextualType(candidateType, t));
        }
        if (contextualType.flags & qt.TypeFlags.InstantiableNonPrimitive) {
          const constraint = getBaseConstraintOfType(contextualType) || unknownType;
          return (
            (maybeTypeOfKind(constraint, qt.TypeFlags.String) && maybeTypeOfKind(candidateType, qt.TypeFlags.StringLiteral)) ||
            (maybeTypeOfKind(constraint, qt.TypeFlags.Number) && maybeTypeOfKind(candidateType, qt.TypeFlags.NumberLiteral)) ||
            (maybeTypeOfKind(constraint, qt.TypeFlags.BigInt) && maybeTypeOfKind(candidateType, qt.TypeFlags.BigIntLiteral)) ||
            (maybeTypeOfKind(constraint, qt.TypeFlags.ESSymbol) && maybeTypeOfKind(candidateType, qt.TypeFlags.UniqueESSymbol)) ||
            isLiteralOfContextualType(candidateType, constraint)
          );
        }
        return !!(
          (contextualType.flags & (TypeFlags.StringLiteral | qt.TypeFlags.Index) && maybeTypeOfKind(candidateType, qt.TypeFlags.StringLiteral)) ||
          (contextualType.flags & qt.TypeFlags.NumberLiteral && maybeTypeOfKind(candidateType, qt.TypeFlags.NumberLiteral)) ||
          (contextualType.flags & qt.TypeFlags.BigIntLiteral && maybeTypeOfKind(candidateType, qt.TypeFlags.BigIntLiteral)) ||
          (contextualType.flags & qt.TypeFlags.BooleanLiteral && maybeTypeOfKind(candidateType, qt.TypeFlags.BooleanLiteral)) ||
          (contextualType.flags & qt.TypeFlags.UniqueESSymbol && maybeTypeOfKind(candidateType, qt.TypeFlags.UniqueESSymbol))
        );
      }
      return false;
    }
    constContext(node: Expression): boolean {
      const parent = node.parent;
      return (
        (this.assertionExpression(parent) && this.constTypeReference(parent.type)) ||
        ((this.kind(qc.ParenthesizedExpression, parent) || isArrayLiteralExpression(parent) || this.kind(qc.SpreadElement, parent)) && isConstContext(parent)) ||
        ((this.kind(qc.PropertyAssignment, parent) || this.kind(qc.ShorthandPropertyAssignment, parent)) && isConstContext(parent.parent))
      );
    }
    privateWithinAmbient(node: Node): boolean {
      return (qx.has.effectiveModifier(node, ModifierFlags.Private) || node.this.privateIdentifierPropertyDeclaration()) && !!(node.flags & NodeFlags.Ambient);
    }
    thenableType(type: Type): boolean {
      const thenFunction = getTypeOfPropertyOfType(type, 'then' as qb.__String);
      return !!thenFunction && getSignaturesOfType(getTypeWithFacts(thenFunction, TypeFacts.NEUndefinedOrNull), SignatureKind.Call).length > 0;
    }
    identifierThatStartsWithUnderscore(node: Node) {
      return this.kind(qc.Identifier, node) && idText(node).charCodeAt(0) === Codes._;
    }
    typeParameterUnused(typeParameter: TypeParameterDeclaration): boolean {
      return !(getMergedSymbol(typeParameter.symbol).isReferenced! & qt.SymbolFlags.TypeParameter) && !isIdentifierThatStartsWithUnderscore(typeParameter.name);
    }
    validUnusedLocalDeclaration(declaration: Declaration): boolean {
      if (this.kind(qc.BindingElement, declaration) && isIdentifierThatStartsWithUnderscore(declaration.name)) {
        return !!qc.findAncestor(declaration.parent, (ancestor) =>
          this.kind(qc.ArrayBindingPattern, ancestor) || this.kind(qc.VariableDeclaration, ancestor) || this.kind(qc.VariableDeclarationList, ancestor)
            ? false
            : this.kind(qc.ForOfStatement, ancestor)
            ? true
            : 'quit'
        );
      }
      return (
        this.ambientModule(declaration) ||
        (((this.kind(qc.VariableDeclaration, declaration) && this.forInOrOfStatement(declaration.parent.parent)) || isImportedDeclaration(declaration)) &&
          isIdentifierThatStartsWithUnderscore(declaration.name!))
      );
    }
    importedDeclaration(node: Node): node is ImportedDeclaration {
      return node.kind === Syntax.ImportClause || node.kind === Syntax.ImportSpecifier || node.kind === Syntax.NamespaceImport;
    }
    iteratorResult(type: Type, kind: IterationTypeKind.Yield | IterationTypeKind.Return) {
      const doneType = getTypeOfPropertyOfType(type, 'done' as qb.__String) || falseType;
      return isTypeAssignableTo(kind === IterationTypeKind.Yield ? falseType : trueType, doneType);
    }
    yieldIteratorResult(type: Type) {
      return isIteratorResult(type, IterationTypeKind.Yield);
    }
    returnIteratorResult(type: Type) {
      return isIteratorResult(type, IterationTypeKind.Return);
    }
    unwrappedReturnTypeVoidOrAny(func: SignatureDeclaration, returnType: Type): boolean {
      const unwrappedReturnType = unwrapReturnType(returnType, getFunctionFlags(func));
      return !!unwrappedReturnType && maybeTypeOfKind(unwrappedReturnType, qt.TypeFlags.Void | qt.TypeFlags.AnyOrUnknown);
    }
    instancePropertyWithoutIniter(node: Node) {
      return (
        node.kind === Syntax.PropertyDeclaration &&
        !qx.has.syntacticModifier(node, ModifierFlags.Static | ModifierFlags.Abstract) &&
        !(<PropertyDeclaration>node).exclamationToken &&
        !(<PropertyDeclaration>node).initer
      );
    }
    propertyInitializedInConstructor(propName: qc.Identifier | qc.PrivateIdentifier, propType: Type, constructor: ConstructorDeclaration) {
      const reference = new qc.PropertyAccessExpression(new qc.ThisExpression(), propName);
      reference.expression.parent = reference;
      reference.parent = constructor;
      reference.flowNode = constructor.returnFlowNode;
      const flowType = getFlowTypeOfReference(reference, propType, getOptionalType(propType));
      return !(getFalsyFlags(flowType) & qt.TypeFlags.Undefined);
    }
    constantMemberAccess(node: Expression): boolean {
      return (
        node.kind === Syntax.Identifier ||
        (node.kind === Syntax.PropertyAccessExpression && isConstantMemberAccess((<PropertyAccessExpression>node).expression)) ||
        (node.kind === Syntax.ElementAccessExpression && isConstantMemberAccess((<ElementAccessExpression>node).expression) && StringLiteral.like((<ElementAccessExpression>node).argumentExpression))
      );
    }
    typeReferenceIdentifier(node: EntityName): boolean {
      while (node.parent.kind === Syntax.QualifiedName) {
        node = node.parent as QualifiedName;
      }
      return node.parent.kind === Syntax.TypeReference;
    }
    heritageClauseElementIdentifier(node: Node): boolean {
      while (node.parent.kind === Syntax.PropertyAccessExpression) {
        node = node.parent;
      }
      return node.parent.kind === Syntax.ExpressionWithTypeArguments;
    }
    nodeUsedDuringClassInitialization(node: Node) {
      return !!qc.findAncestor(node, (element) => {
        if ((this.kind(qc.ConstructorDeclaration, element) && this.present(element.body)) || this.kind(qc.PropertyDeclaration, element)) return true;
        else if (this.classLike(element) || this.functionLikeDeclaration(element)) return 'quit';
        return false;
      });
    }
    nodeWithinClass(node: Node, classDeclaration: ClassLikeDeclaration) {
      return !!forEachEnclosingClass(node, (n) => n === classDeclaration);
    }
    inRightSideOfImportOrExportAssignment(node: EntityName) {
      return getLeftSideOfImportEqualsOrExportAssignment(node) !== undefined;
    }
    importTypeQualifierPart(node: EntityName): ImportTypeNode | undefined {
      let parent = node.parent;
      while (this.kind(qc.QualifiedName, parent)) {
        node = parent;
        parent = parent.parent;
      }
      if (parent && parent.kind === Syntax.ImportType && (parent as ImportTypeNode).qualifier === node) return parent as ImportTypeNode;
      return;
    }
    argumentsLocalBinding(nodeIn: Identifier): boolean {
      if (!this.generatedIdentifier(nodeIn)) {
        const node = qx.get.parseTreeOf(nodeIn, isIdentifier);
        if (node) {
          const isPropertyName = node.parent.kind === Syntax.PropertyAccessExpression && (<PropertyAccessExpression>node.parent).name === node;
          return !isPropertyName && getReferencedValueSymbol(node) === argumentsSymbol;
        }
      }
      return false;
    }
    nameOfModuleOrEnumDeclaration(node: Identifier) {
      return this.moduleOrEnumDeclaration(node.parent) && node === node.parent.name;
    }
    declarationWithCollidingName(nodeIn: Declaration): boolean {
      const node = qx.get.parseTreeOf(nodeIn, isDeclaration);
      if (node) {
        const symbol = getSymbolOfNode(node);
        if (symbol) return isSymbolOfDeclarationWithCollidingName(symbol);
      }
      return false;
    }
    valueAliasDeclaration(node: Node): boolean {
      switch (node.kind) {
        case Syntax.ImportEqualsDeclaration:
          return isAliasResolvedToValue(getSymbolOfNode(node) || unknownSymbol);
        case Syntax.ImportClause:
        case Syntax.NamespaceImport:
        case Syntax.ImportSpecifier:
        case Syntax.ExportSpecifier:
          const symbol = getSymbolOfNode(node) || unknownSymbol;
          return isAliasResolvedToValue(symbol) && !this.getTypeOnlyAliasDeclaration();
        case Syntax.ExportDeclaration:
          const exportClause = (<ExportDeclaration>node).exportClause;
          return !!exportClause && (this.kind(qc.NamespaceExport, exportClause) || some(exportClause.elements, isValueAliasDeclaration));
        case Syntax.ExportAssignment:
          return (<ExportAssignment>node).expression && (<ExportAssignment>node).expression.kind === Syntax.Identifier ? isAliasResolvedToValue(getSymbolOfNode(node) || unknownSymbol) : true;
      }
      return false;
    }
    topLevelValueImportEqualsWithEntityName(nodeIn: ImportEqualsDeclaration): boolean {
      const node = qx.get.parseTreeOf(nodeIn, isImportEqualsDeclaration);
      if (node === undefined || node.parent.kind !== Syntax.SourceFile || !this.internalModuleImportEqualsDeclaration(node)) return false;
      const isValue = isAliasResolvedToValue(getSymbolOfNode(node));
      return isValue && node.moduleReference && !this.missing(node.moduleReference);
    }
    referencedAliasDeclaration(node: Node, checkChildren?: boolean): boolean {
      if (isAliasSymbolDeclaration(node)) {
        const symbol = getSymbolOfNode(node);
        if (symbol && s.getLinks(symbol).referenced) return true;
        const target = s.getLinks(symbol!).target;
        if (
          target &&
          qx.get.effectiveModifierFlags(node) & ModifierFlags.Export &&
          target.flags & qt.SymbolFlags.Value &&
          (compilerOptions.preserveConstEnums || !isConstEnumOrConstEnumOnlyModule(target))
        )
          return true;
      }
      if (checkChildren) return !!qc.forEach.child(node, (node) => isReferencedAliasDeclaration(node, checkChildren));
      return false;
    }
    implementationOfOverload(node: SignatureDeclaration) {
      if (this.present((node as FunctionLikeDeclaration).body)) {
        if (this.kind(qc.GetAccessorDeclaration, node) || this.kind(qc.SetAccessorDeclaration, node)) return false;
        const symbol = getSymbolOfNode(node);
        const signaturesOfSymbol = getSignaturesOfSymbol(symbol);
        return signaturesOfSymbol.length > 1 || (signaturesOfSymbol.length === 1 && signaturesOfSymbol[0].declaration !== node);
      }
      return false;
    }
    requiredInitializedParameter(parameter: ParameterDeclaration | DocParameterTag): boolean {
      return (
        !!strictNullChecks &&
        !isOptionalParameter(parameter) &&
        !this.kind(qc.DocParameterTag, parameter) &&
        !!parameter.initer &&
        !qx.has.syntacticModifier(parameter, ModifierFlags.ParameterPropertyModifier)
      );
    }
    optionalUninitializedParameterProperty(parameter: ParameterDeclaration) {
      return strictNullChecks && isOptionalParameter(parameter) && !parameter.initer && qx.has.syntacticModifier(parameter, ModifierFlags.ParameterPropertyModifier);
    }
    expandoFunctionDeclaration(node: Declaration): boolean {
      const declaration = qx.get.parseTreeOf(node, isFunctionDeclaration);
      if (!declaration) return false;
      const symbol = getSymbolOfNode(declaration);
      if (!symbol || !(symbol.flags & qt.SymbolFlags.Function)) return false;
      return !!forEachEntry(this.getExportsOfSymbol(), (p) => p.flags & qt.SymbolFlags.Value && p.valueDeclaration && this.kind(qc.PropertyAccessExpression, p.valueDeclaration));
    }
    functionType(type: Type): boolean {
      return !!(type.flags & qt.TypeFlags.Object) && getSignaturesOfType(type, SignatureKind.Call).length > 0;
    }
    literalConstDeclaration(node: VariableDeclaration | PropertyDeclaration | PropertySignature | ParameterDeclaration): boolean {
      if (isDeclarationReadonly(node) || (this.kind(qc.VariableDeclaration, node) && this.varConst(node))) return isFreshLiteralType(getTypeOfSymbol(getSymbolOfNode(node)));
      return false;
    }
    simpleLiteralEnumReference(expr: Expression) {
      if (
        (this.kind(qc.PropertyAccessExpression, expr) || (this.kind(qc.ElementAccessExpression, expr) && StringLiteral.orNumberLiteralExpression(expr.argumentExpression))) &&
        this.entityNameExpression(expr.expression)
      ) {
        return !!(check.expressionCached(expr).flags & qt.TypeFlags.EnumLiteral);
      }
      return;
    }
  })());
  return r;
}
export interface Is extends ReturnType<typeof newIs> {}
export function newHas(qx: qt.Tctx) {
  const r = (qx.has = new (class {
    exportAssignmentSymbol(moduleSymbol: Symbol): boolean {
      return moduleSymbol.exports!.get(InternalSymbol.ExportEquals) !== undefined;
    }
    externalModuleSymbol(declaration: Node) {
      return qx.this.ambientModule(declaration) || (declaration.kind === Syntax.SourceFile && qx.this.externalOrCommonJsModule(<SourceFile>declaration));
    }
    nonGlobalAugmentationExternalModuleSymbol(declaration: Node) {
      return qx.this.moduleWithStringLiteralName(declaration) || (declaration.kind === Syntax.SourceFile && qx.this.externalOrCommonJsModule(<SourceFile>declaration));
    }
    baseType(type: Type, checkBase: Type | undefined) {
      return check(type);
      function check(type: Type): boolean {
        if (getObjectFlags(type) & (ObjectFlags.ClassOrInterface | ObjectFlags.Reference)) {
          const target = <InterfaceType>getTargetType(type);
          return target === checkBase || some(getBaseTypes(target), check);
        } else if (type.flags & qt.TypeFlags.Intersection) {
          return some((<IntersectionType>type).types, check);
        }
        return false;
      }
    }
    lateBindableName(node: Declaration): node is LateBoundDeclaration | LateBoundBinaryExpressionDeclaration {
      const name = qx.get.nameOfDeclaration(node);
      return !!name && isLateBindableName(name);
    }
    nonBindableDynamicName(node: Declaration) {
      return hasDynamicName(node) && !hasLateBindableName(node);
    }
    nonCircularBaseConstraint(type: InstantiableType): boolean {
      return getResolvedBaseConstraint(type) !== circularConstraintType;
    }
    nonCircularTypeParameterDefault(typeParameter: TypeParameter) {
      return getResolvedTypeParameterDefault(typeParameter) !== circularConstraintType;
    }
    typeParameterDefault(typeParameter: TypeParameter): boolean {
      return !!(typeParameter.symbol && forEach(typeParameter.symbol.declarations, (decl) => qx.this.kind(qc.TypeParameterDeclaration, decl) && decl.default));
    }
    contextSensitiveParameters(node: FunctionLikeDeclaration) {
      if (!node.typeParameters) {
        if (some(node.parameters, (p) => !qx.get.effectiveTypeAnnotationNode(p))) return true;
        if (node.kind !== Syntax.ArrowFunction) {
          const parameter = firstOrUndefined(node.parameters);
          if (!(parameter && parameterIsThqy.qx.this.keyword(parameter))) return true;
        }
      }
      return false;
    }
    contextSensitiveReturnExpression(node: FunctionLikeDeclaration) {
      return !node.typeParameters && !getEffectiveReturnTypeNode(node) && !!node.body && node.body.kind !== Syntax.Block && isContextSensitive(node.body);
    }
    commonProperties(source: Type, target: Type, isComparingJsxAttributes: boolean) {
      for (const prop of getPropertiesOfType(source)) {
        if (isKnownProperty(target, prop.escName, isComparingJsxAttributes)) return true;
      }
      return false;
    }
    covariantVoidArgument(typeArguments: readonly Type[], variances: VarianceFlags[]): boolean {
      for (let i = 0; i < variances.length; i++) {
        if ((variances[i] & VarianceFlags.VarianceMask) === VarianceFlags.Covariant && typeArguments[i].flags & qt.TypeFlags.Void) return true;
      }
      return false;
    }
    skipDirectInferenceFlag(node: Node) {
      return !!getNodeLinks(node).skipDirectInference;
    }
    primitiveConstraint(type: TypeParameter): boolean {
      const constraint = getConstraintOfTypeParameter(type);
      return (
        !!constraint &&
        maybeTypeOfKind(constraint.flags & qt.TypeFlags.Conditional ? getDefaultConstraintOfConditionalType(constraint as ConditionalType) : constraint, qt.TypeFlags.Primitive | qt.TypeFlags.Index)
      );
    }
    matchingArgument(callExpression: CallExpression, reference: Node) {
      if (callExpression.arguments) {
        for (const argument of callExpression.arguments) {
          if (isOrContainsMatchingReference(reference, argument)) return true;
        }
      }
      if (callExpression.expression.kind === Syntax.PropertyAccessExpression && isOrContainsMatchingReference(reference, (<PropertyAccessExpression>callExpression.expression).expression)) return true;
      return false;
    }
    typePredicateOrNeverReturnType(signature: Signature) {
      return !!(getTypePredicateOfSignature(signature) || (signature.declaration && (getReturnTypeFromAnnotation(signature.declaration) || unknownType).flags & qt.TypeFlags.Never));
    }
    parentWithAssignmentsMarked(node: Node) {
      return !!qc.findAncestor(node.parent, (node) => qx.this.functionLike(node) && !!(getNodeLinks(node).flags & NodeCheckFlags.AssignmentsMarked));
    }
    defaultValue(node: BindingElement | Expression): boolean {
      return (node.kind === Syntax.BindingElement && !!(<BindingElement>node).initer) || (node.kind === Syntax.BinaryExpression && (<BinaryExpression>node).operatorToken.kind === Syntax.EqualsToken);
    }
    numericPropertyNames(type: Type) {
      return getIndexTypeOfType(type, IndexKind.Number) && !getIndexTypeOfType(type, IndexKind.String);
    }
    correctArity(node: CallLikeExpression, args: readonly Expression[], signature: Signature, signatureHelpTrailingComma = false) {
      let argCount: number;
      let callIsIncomplete = false;
      let effectiveParameterCount = getParameterCount(signature);
      let effectiveMinimumArguments = getMinArgumentCount(signature);
      if (node.kind === Syntax.TaggedTemplateExpression) {
        argCount = args.length;
        if (node.template.kind === Syntax.TemplateExpression) {
          const lastSpan = last(node.template.templateSpans);
          callIsIncomplete = qx.this.missing(lastSpan.literal) || !!lastSpan.literal.isUnterminated;
        } else {
          const templateLiteral = <LiteralExpression>node.template;
          assert(templateLiteral.kind === Syntax.NoSubstitutionLiteral);
          callIsIncomplete = !!templateLiteral.isUnterminated;
        }
      } else if (node.kind === Syntax.Decorator) {
        argCount = getDecoratorArgumentCount(node, signature);
      } else if (qc.isJsx.openingLikeElement(node)) {
        callIsIncomplete = node.attributes.end === node.end;
        if (callIsIncomplete) return true;
        argCount = effectiveMinimumArguments === 0 ? args.length : 1;
        effectiveParameterCount = args.length === 0 ? effectiveParameterCount : 1;
        effectiveMinimumArguments = Math.min(effectiveMinimumArguments, 1);
      } else {
        if (!node.arguments) {
          assert(node.kind === Syntax.NewExpression);
          return getMinArgumentCount(signature) === 0;
        }
        argCount = signatureHelpTrailingComma ? args.length + 1 : args.length;
        callIsIncomplete = node.arguments.end === node.end;
        const spreadArgIndex = getSpreadArgumentIndex(args);
        if (spreadArgIndex >= 0) return spreadArgIndex >= getMinArgumentCount(signature) && (hasEffectiveRestParameter(signature) || spreadArgIndex < getParameterCount(signature));
      }
      if (!hasEffectiveRestParameter(signature) && argCount > effectiveParameterCount) return false;
      if (callIsIncomplete || argCount >= effectiveMinimumArguments) return true;
      for (let i = argCount; i < effectiveMinimumArguments; i++) {
        const type = getTypeAtPosition(signature, i);
        if (filterType(type, acceptsVoid).flags & qt.TypeFlags.Never) return false;
      }
      return true;
    }
    correctTypeArgumentArity(signature: Signature, typeArguments: Nodes<TypeNode> | undefined) {
      const numTypeParameters = length(signature.typeParameters);
      const minTypeArgumentCount = getMinTypeArgumentCount(signature.typeParameters);
      return !some(typeArguments) || (typeArguments.length >= minTypeArgumentCount && typeArguments.length <= numTypeParameters);
    }
    effectiveRestParameter(signature: Signature) {
      if (signatureHasRestParameter(signature)) {
        const restType = getTypeOfSymbol(signature.parameters[signature.parameters.length - 1]);
        return !isTupleType(restType) || restType.target.hasRestElement;
      }
      return false;
    }
    inferenceCandidates(info: InferenceInfo) {
      return !!(info.candidates || info.contraCandidates);
    }
    overlappingInferences(a: InferenceInfo[], b: InferenceInfo[]) {
      for (let i = 0; i < a.length; i++) {
        if (hasInferenceCandidates(a[i]) && hasInferenceCandidates(b[i])) return true;
      }
      return false;
    }
    typeParameterByName(typeParameters: readonly TypeParameter[] | undefined, name: qb.__String) {
      return some(typeParameters, (tp) => tp.symbol.escName === name);
    }
    exportedMembers(moduleSymbol: Symbol) {
      return forEachEntry(moduleSymbol.exports!, (_, id) => id !== 'export=');
    }
    globalName(name: string): boolean {
      return globals.has(qy.qx.get.escUnderscores(name));
    }
    parseDiagnostics(sourceFile: SourceFile): boolean {
      return sourceFile.parseqd.msgs.length > 0;
    }
    sameNamedThisProperty(thisProperty: Expression, expression: Expression) {
      return (
        qx.this.kind(qc.PropertyAccessExpression, thisProperty) &&
        thisProperty.expression.kind === Syntax.ThisKeyword &&
        qc.forEach.childRecursively(expression, (n) => isMatchingReference(thisProperty, n))
      );
    }
    argumentsReference(declaration: SignatureDeclaration): boolean {
      const links = getNodeLinks(declaration);
      if (links.containsArgumentsReference === undefined) {
        if (links.flags & NodeCheckFlags.CaptureArguments) links.containsArgumentsReference = true;
        else {
          links.containsArgumentsReference = traverse((declaration as FunctionLikeDeclaration).body!);
        }
      }
      return links.containsArgumentsReference;
      function traverse(node: Node): boolean {
        if (!node) return false;
        switch (node.kind) {
          case Syntax.Identifier:
            return (<Identifier>node).escapedText === 'arguments' && qx.this.expressionNode(node);
          case Syntax.PropertyDeclaration:
          case Syntax.MethodDeclaration:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
            return (<NamedDeclaration>node).name!.kind === Syntax.ComputedPropertyName && traverse((<NamedDeclaration>node).name!);
          default:
            return !nodeStartsNewLexicalEnvironment(node) && !qx.this.partOfTypeNode(node) && !!qc.forEach.child(node, traverse);
        }
      }
    }
    type(types: readonly Type[], type: Type): boolean {
      return binarySearch(types, type, getTypeId, compareNumbers) >= 0;
    }
    truthyCheck(source: Node, target: Node): boolean {
      return (
        isMatchingReference(source, target) ||
        (target.kind === Syntax.BinaryExpression &&
          (<BinaryExpression>target).operatorToken.kind === Syntax.Ampersand2Token &&
          (containsTruthyCheck(source, (<BinaryExpression>target).left) || containsTruthyCheck(source, (<BinaryExpression>target).right)))
      );
    }
    matchingReference(source: Node, target: Node) {
      while (qx.this.accessExpression(source)) {
        source = source.expression;
        if (isMatchingReference(source, target)) return true;
      }
      return false;
    }
  })());
  return r;
}
export interface Has extends ReturnType<typeof newHas> {}
