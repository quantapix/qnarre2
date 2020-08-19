import * as qc from '../core';
import * as qd from '../diags';
import * as qg from '../debug';
import { CheckMode, ExpandingFlags, ModifierFlags, Node, ObjectFlags, SymbolFlags, TypeFlags, VarianceFlags } from './types';
import * as qt from './types';
import * as qu from '../utils';
import { Syntax } from '../syntax';
import * as qy from '../syntax';
import { Symbol } from './bases';
import { Fget } from './get';
import { Fhas, Fis } from './groups';
export function newCheck(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.check = new (class Fcheck extends qu.Fcheck {
    andReportError = new (class extends Fcheck {
      andReportErrorForMissingPrefix(n: Node, name: qu.__String, nameArg: qu.__String | qc.Identifier): boolean {
        if (!n.kind === Syntax.Identifier || n.escapedText !== name || isTypeReferenceIdentifier(n) || qf.is.inTypeQuery(n)) return false;
        const container = qf.get.thisContainer(n, false);
        let location = container;
        while (location) {
          if (qf.is.classLike(location.parent)) {
            const classSymbol = qf.get.symbolOfNode(location.parent);
            if (!classSymbol) break;
            const constructorType = classSymbol.typeOfSymbol();
            if (qf.get.propertyOfType(constructorType, name)) {
              qf.error(n, qd.msgs.Cannot_find_name_0_Did_you_mean_the_static_member_1_0, diagnosticName(nameArg), classSymbol.symbolToString());
              return true;
            }
            if (location === container && !qf.has.syntacticModifier(location, ModifierFlags.Static)) {
              const instanceType = (<qt.InterfaceType>getDeclaredTypeOfSymbol(classSymbol)).thisType!;
              if (qf.get.propertyOfType(instanceType, name)) {
                qf.error(n, qd.msgs.Cannot_find_name_0_Did_you_mean_the_instance_member_this_0, diagnosticName(nameArg));
                return true;
              }
            }
          }
          location = location.parent;
        }
        return false;
      }
      andReportErrorForExtendingInterface(n: Node): boolean {
        const expression = qf.get.entityNameForExtendingInterface(n);
        if (expression && resolveEntityName(expression, qt.SymbolFlags.Interface, true)) {
          error(n, qd.msgs.Cannot_extend_an_interface_0_Did_you_mean_implements, qf.get.textOf(expression));
          return true;
        }
        return false;
      }
      andReportErrorForExportingPrimitiveType(n: Node, name: qu.__String): boolean {
        if (isPrimitiveTypeName(name) && n.parent.kind === Syntax.ExportSpecifier) {
          error(n, qd.msgs.Cannot_export_0_Only_local_declarations_can_be_exported_from_a_module, name as string);
          return true;
        }
        return false;
      }
      andReportErrorForResolvingImportAliasToTypeOnlySymbol(n: qt.ImportEqualsDeclaration, resolved: qt.Symbol | undefined) {
        if (markSymbolOfAliasDeclarationIfTypeOnly(n, undefined, resolved, false)) {
          const typeOnlyDeclaration = qf.get.symbolOfNode(n).getTypeOnlyAliasDeclaration()!;
          const isExport = typeOnlyDeclarationIsExport(typeOnlyDeclaration);
          const message = isExport
            ? qd.msgs.An_import_alias_cannot_reference_a_declaration_that_was_exported_using_export_type
            : qd.msgs.An_import_alias_cannot_reference_a_declaration_that_was_imported_using_import_type;
          const relatedMessage = isExport ? qd.msgs._0_was_exported_here : qd.msgs._0_was_imported_here;
          const name = qy.get.unescUnderscores(typeOnlyDeclaration.name!.escapedText);
          addRelatedInfo(error(n.moduleReference, message), qf.make.diagForNode(typeOnlyDeclaration, relatedMessage, name));
        }
      }
      andReportErrorForUsingTypeAsNamespace(n: Node, name: qu.__String, meaning: qt.SymbolFlags): boolean {
        const namespaceMeaning = qt.SymbolFlags.Namespace | (qf.is.inJSFile(n) ? qt.SymbolFlags.Value : 0);
        if (meaning === namespaceMeaning) {
          const symbol = resolveSymbol(resolveName(n, name, qt.SymbolFlags.Type & ~namespaceMeaning, undefined, undefined, false));
          const parent = n.parent;
          if (symbol) {
            if (parent.kind === Syntax.QualifiedName) {
              qf.assert.true(parent.left === n, 'Should only be resolving left side of qualified name as a namespace');
              const propName = parent.right.escapedText;
              const propType = qf.get.propertyOfType(getDeclaredTypeOfSymbol(symbol), propName);
              if (propType) {
                error(
                  parent,
                  qd.msgs.Cannot_access_0_1_because_0_is_a_type_but_not_a_namespace_Did_you_mean_to_retrieve_the_type_of_the_property_1_in_0_with_0_1,
                  qy.get.unescUnderscores(name),
                  qy.get.unescUnderscores(propName)
                );
                return true;
              }
            }
            error(n, qd.msgs._0_only_refers_to_a_type_but_is_being_used_as_a_namespace_here, qy.get.unescUnderscores(name));
            return true;
          }
        }
        return false;
      }
      andReportErrorForUsingValueAsType(n: Node, name: qu.__String, meaning: qt.SymbolFlags): boolean {
        if (meaning & (SymbolFlags.Type & ~SymbolFlags.Namespace)) {
          const x = resolveName(n, name, ~SymbolFlags.Type & qt.SymbolFlags.Value, undefined, undefined, false);
          const symbol = resolveSymbol(x);
          if (symbol && !(symbol.flags & qt.SymbolFlags.Namespace)) {
            error(n, qd.msgs._0_refers_to_a_value_but_is_being_used_as_a_type_here_Did_you_mean_typeof_0, qy.get.unescUnderscores(name));
            return true;
          }
        }
        return false;
      }
      andReportErrorForUsingTypeAsValue(n: Node, name: qu.__String, meaning: qt.SymbolFlags): boolean {
        if (meaning & (SymbolFlags.Value & ~SymbolFlags.NamespaceModule)) {
          if (isPrimitiveTypeName(name)) {
            error(n, qd.msgs._0_only_refers_to_a_type_but_is_being_used_as_a_value_here, qy.get.unescUnderscores(name));
            return true;
          }
          const x = resolveName(n, name, qt.SymbolFlags.Type & ~SymbolFlags.Value, undefined, undefined, false);
          const symbol = resolveSymbol(x);
          if (symbol && !(symbol.flags & qt.SymbolFlags.NamespaceModule)) {
            const message = isES2015OrLaterConstructorName(name)
              ? qd.msgs._0_only_refers_to_a_type_but_is_being_used_as_a_value_here_Do_you_need_to_change_your_target_library_Try_changing_the_lib_compiler_option_to_es2015_or_later
              : qd.msgs._0_only_refers_to_a_type_but_is_being_used_as_a_value_here;
            error(n, message, qy.get.unescUnderscores(name));
            return true;
          }
        }
        return false;
      }
      andReportErrorForUsingNamespaceModuleAsValue(n: Node, name: qu.__String, meaning: qt.SymbolFlags): boolean {
        if (meaning & (SymbolFlags.Value & ~SymbolFlags.NamespaceModule & ~SymbolFlags.Type)) {
          const x = resolveName(n, name, qt.SymbolFlags.NamespaceModule & ~SymbolFlags.Value, undefined, undefined, false);
          const symbol = resolveSymbol(x);
          if (symbol) {
            error(n, qd.msgs.Cannot_use_namespace_0_as_a_value, qy.get.unescUnderscores(name));
            return true;
          }
        } else if (meaning & (SymbolFlags.Type & ~SymbolFlags.NamespaceModule & ~SymbolFlags.Value)) {
          const x = resolveName(n, name, (SymbolFlags.ValueModule | qt.SymbolFlags.NamespaceModule) & ~SymbolFlags.Type, undefined, undefined, false);
          const symbol = resolveSymbol(x);
          if (symbol) {
            error(n, qd.msgs.Cannot_use_namespace_0_as_a_type, qy.get.unescUnderscores(name));
            return true;
          }
        }
        return false;
      }
    })();
    noTypeArgs(n: qt.WithArgsTobj, symbol?: qt.Symbol) {
      if (n.typeArgs) {
        error(n, qd.msgs.Type_0_is_not_generic, symbol ? symbol.symbolToString() : (<qt.TypingReference>n).typeName ? declarationNameToString((<qt.TypingReference>n).typeName) : anon);
        return false;
      }
      return true;
    }
    expressionForMutableLocationWithContextualType(next: qt.Expression, sourcePropType: qt.Type) {
      next.contextualType = sourcePropType;
      try {
        return this.expressionForMutableLocation(next, CheckMode.Contextual, sourcePropType);
      } finally {
        next.contextualType = undefined;
      }
    }
    identifier(n: qt.Identifier): qt.Type {
      const symbol = getResolvedSymbol(n);
      if (symbol === unknownSymbol) return errorType;
      if (symbol === argsSymbol) {
        const container = qf.get.containingFunction(n)!;
        qf.get.nodeLinks(container).flags |= NodeCheckFlags.CaptureArgs;
        return this.typeOfSymbol();
      }
      if (!(n.parent && n.parent.kind === Syntax.PropertyAccessExpression && n.parent.expression === n)) markAliasReferenced(symbol, n);
      const localOrExportSymbol = getExportSymbolOfValueSymbolIfExported(symbol);
      let declaration: qt.Declaration | undefined = localOrExportSymbol.valueDeclaration;
      if (localOrExportSymbol.flags & qt.SymbolFlags.Class) {
        if (declaration.kind === Syntax.ClassDeclaration && qf.is.decorated(declaration as qt.ClassDeclaration)) {
          let container = qf.get.containingClass(n);
          while (container !== undefined) {
            if (container === declaration && container.name !== n) {
              qf.get.nodeLinks(declaration).flags |= NodeCheckFlags.ClassWithConstructorReference;
              qf.get.nodeLinks(n).flags |= NodeCheckFlags.ConstructorReferenceInClass;
              break;
            }
            container = qf.get.containingClass(container);
          }
        } else if (declaration.kind === Syntax.ClassExpression) {
          let container = qf.get.thisContainer(n, false);
          while (container.kind !== Syntax.SourceFile) {
            if (container.parent === declaration) {
              if (container.kind === Syntax.PropertyDeclaration && qf.has.syntacticModifier(container, ModifierFlags.Static)) {
                qf.get.nodeLinks(declaration).flags |= NodeCheckFlags.ClassWithConstructorReference;
                qf.get.nodeLinks(n).flags |= NodeCheckFlags.ConstructorReferenceInClass;
              }
              break;
            }
            container = qf.get.thisContainer(container, false);
          }
        }
      }
      nestedBlockScopedBinding(n, symbol);
      const type = qf.get.constraintForLocation(localOrExportSymbol.typeOfSymbol(), n);
      const assignmentKind = qf.get.assignmentTargetKind(n);
      if (assignmentKind) {
        if (!(localOrExportSymbol.flags & qt.SymbolFlags.Variable) && !(qf.is.inJSFile(n) && localOrExportSymbol.flags & qt.SymbolFlags.ValueModule)) {
          error(n, qd.msgs.Cannot_assign_to_0_because_it_is_not_a_variable, symbol.symbolToString());
          return errorType;
        }
        if (isReadonlySymbol(localOrExportSymbol)) {
          if (localOrExportSymbol.flags & qt.SymbolFlags.Variable) error(n, qd.msgs.Cannot_assign_to_0_because_it_is_a_constant, symbol.symbolToString());
          else {
            error(n, qd.msgs.Cannot_assign_to_0_because_it_is_a_read_only_property, symbol.symbolToString());
          }
          return errorType;
        }
      }
      const isAlias = localOrExportSymbol.flags & qt.SymbolFlags.Alias;
      if (localOrExportSymbol.flags & qt.SymbolFlags.Variable) {
        if (assignmentKind === qt.AssignmentKind.Definite) return type;
      } else if (isAlias) {
        declaration = find<qt.Declaration>(symbol.declarations, isSomeImportDeclaration);
      }
      return type;
      if (!declaration) return type;
      const isParam = qf.get.rootDeclaration(declaration).kind === Syntax.Param;
      const declarationContainer = getControlFlowContainer(declaration);
      let flowContainer = getControlFlowContainer(n);
      const isOuterVariable = flowContainer !== declarationContainer;
      const isSpreadDestructuringAssignmentTarget = n.parent && n.parent.parent && n.parent.kind === Syntax.SpreadAssignment && isDestructuringAssignmentTarget(n.parent.parent);
      const isModuleExports = symbol.flags & qt.SymbolFlags.ModuleExports;
      while (
        flowContainer !== declarationContainer &&
        (flowContainer.kind === Syntax.FunctionExpression || flowContainer.kind === Syntax.ArrowFunction || qf.is.objectLiteralOrClassExpressionMethod(flowContainer)) &&
        (isConstVariable(localOrExportSymbol) || (isParam && !isParamAssigned(localOrExportSymbol)))
      ) {
        flowContainer = getControlFlowContainer(flowContainer);
      }
      const assumeInitialized =
        isParam ||
        isAlias ||
        isOuterVariable ||
        isSpreadDestructuringAssignmentTarget ||
        isModuleExports ||
        declaration.kind === Syntax.BindingElem ||
        (type !== autoType &&
          type !== autoArrayType &&
          (!strictNullChecks || (type.flags & (TypeFlags.AnyOrUnknown | TypeFlags.Void)) !== 0 || qf.is.inTypeQuery(n) || n.parent.kind === Syntax.ExportSpecifier)) ||
        n.parent.kind === Syntax.NonNullExpression ||
        (declaration.kind === Syntax.VariableDeclaration && (<qt.VariableDeclaration>declaration).exclamationToken) ||
        declaration.flags & NodeFlags.Ambient;
      const initialType = assumeInitialized
        ? isParam
          ? removeOptionalityFromDeclaredType(type, declaration as qt.VariableLikeDeclaration)
          : type
        : type === autoType || type === autoArrayType
        ? undefinedType
        : qf.get.optionalType(type);
      const flowType = qf.get.flow.typeOfReference(n, type, initialType, flowContainer, !assumeInitialized);
      if (!isEvolvingArrayOperationTarget(n) && (type === autoType || type === autoArrayType)) {
        if (flowType === autoType || flowType === autoArrayType) {
          if (noImplicitAny) {
            error(qf.decl.nameOf(declaration), qd.msgs.Variable_0_implicitly_has_type_1_in_some_locations_where_its_type_cannot_be_determined, symbol.symbolToString(), typeToString(flowType));
            error(n, qd.msgs.Variable_0_implicitly_has_an_1_type, symbol.symbolToString(), typeToString(flowType));
          }
          return convertAutoToAny(flowType);
        }
      } else if (!assumeInitialized && !(getFalsyFlags(type) & TypeFlags.Undefined) && getFalsyFlags(flowType) & TypeFlags.Undefined) {
        error(n, qd.msgs.Variable_0_is_used_before_being_assigned, symbol.symbolToString());
        return type;
      }
      return assignmentKind ? getBaseTypeOfLiteralType(flowType) : flowType;
    }
    nestedBlockScopedBinding(n: qt.Identifier, symbol: qt.Symbol): void {
      return;
    }
    thisBeforeSuper(n: Node, container: Node, diagnosticMessage: qd.Message) {
      const containingClassDecl = <qt.ClassDeclaration>container.parent;
      const baseTypeNode = qf.get.classExtendsHeritageElem(containingClassDecl);
      if (baseTypeNode && !classDeclarationExtendsNull(containingClassDecl)) {
        if (n.flowNode && !isPostSuperFlowNode(n.flowNode, false)) error(n, diagnosticMessage);
      }
    }
    thisNodeIsExpression(n: Node): qt.Type {
      let container = qf.get.thisContainer(n, true);
      let capturedByArrowFunction = false;
      if (container.kind === Syntax.Constructor) this.thisBeforeSuper(n, container, qd.super_must_be_called_before_accessing_this_in_the_constructor_of_a_derived_class);
      if (container.kind === Syntax.ArrowFunction) {
        container = qf.get.thisContainer(container, false);
        capturedByArrowFunction = true;
      }
      switch (container.kind) {
        case Syntax.ModuleDeclaration:
          error(n, qd.this_cannot_be_referenced_in_a_module_or_namespace_body);
          break;
        case Syntax.EnumDeclaration:
          error(n, qd.this_cannot_be_referenced_in_current_location);
          break;
        case Syntax.Constructor:
          if (isInConstructorArgIniter(n, container)) error(n, qd.this_cannot_be_referenced_in_constructor_args);
          break;
        case Syntax.PropertyDeclaration:
        case Syntax.PropertySignature:
          if (qf.has.syntacticModifier(container, ModifierFlags.Static) && !(compilerOpts.target === qt.ScriptTarget.ESNext && compilerOpts.useDefineForClassFields))
            error(n, qd.this_cannot_be_referenced_in_a_static_property_initer);
          break;
        case Syntax.ComputedPropertyName:
          error(n, qd.this_cannot_be_referenced_in_a_computed_property_name);
          break;
      }
      const type = tryGetThisTypeAt(n, true, container);
      if (noImplicitThis) {
        const globalThisType = globalThisSymbol.typeOfSymbol();
        if (type === globalThisType && capturedByArrowFunction) error(n, qd.msgs.The_containing_arrow_function_captures_the_global_value_of_this);
        else if (!type) {
          const diag = error(n, qd.this_implicitly_has_type_any_because_it_does_not_have_a_type_annotation);
          if (!container.kind === Syntax.SourceFile) {
            const outsideThis = tryGetThisTypeAt(container);
            if (outsideThis && outsideThis !== globalThisType) addRelatedInfo(diag, qf.make.diagForNode(container, qd.msgs.An_outer_value_of_this_is_shadowed_by_this_container));
          }
        }
      }
      return type || anyType;
    }
    superExpression(n: Node): qt.Type {
      const isCallExpression = n.parent.kind === Syntax.CallExpression && (<qt.CallExpression>n.parent).expression === n;
      const immediateContainer = qf.get.superContainer(n, true);
      let container = immediateContainer;
      let needToCaptureLexicalThis = false;
      if (!isCallExpression) {
        while (container && container.kind === Syntax.ArrowFunction) {
          container = qf.get.superContainer(container, true);
          needToCaptureLexicalThis = false;
        }
      }
      const canUseSuperExpression = isLegalUsageOfSuperExpression(container);
      let nodeCheckFlag: NodeCheckFlags = 0;
      if (!canUseSuperExpression) {
        const current = qc.findAncestor(n, (x) => (x === container ? 'quit' : x.kind === Syntax.ComputedPropertyName));
        if (current && current.kind === Syntax.ComputedPropertyName) error(n, qd.super_cannot_be_referenced_in_a_computed_property_name);
        else if (isCallExpression) {
          error(n, qd.msgs.Super_calls_are_not_permitted_outside_constructors_or_in_nested_functions_inside_constructors);
        } else if (!container || !container.parent || !(qf.is.classLike(container.parent) || container.parent.kind === Syntax.ObjectLiteralExpression)) {
          error(n, qd.super_can_only_be_referenced_in_members_of_derived_classes_or_object_literal_expressions);
        } else {
          error(n, qd.super_property_access_is_permitted_only_in_a_constructor_member_function_or_member_accessor_of_a_derived_class);
        }
        return errorType;
      }
      if (!isCallExpression && immediateContainer.kind === Syntax.Constructor)
        this.thisBeforeSuper(n, container, qd.super_must_be_called_before_accessing_a_property_of_super_in_the_constructor_of_a_derived_class);
      if (qf.has.syntacticModifier(container, ModifierFlags.Static) || isCallExpression) nodeCheckFlag = NodeCheckFlags.SuperStatic;
      else {
        nodeCheckFlag = NodeCheckFlags.SuperInstance;
      }
      qf.get.nodeLinks(n).flags |= nodeCheckFlag;
      if (container.kind === Syntax.MethodDeclaration && qf.has.syntacticModifier(container, ModifierFlags.Async)) {
        if (qf.is.superProperty(n.parent) && qf.is.assignmentTarget(n.parent)) qf.get.nodeLinks(container).flags |= NodeCheckFlags.AsyncMethodWithSuperBinding;
        else {
          qf.get.nodeLinks(container).flags |= NodeCheckFlags.AsyncMethodWithSuper;
        }
      }
      if (needToCaptureLexicalThis) captureLexicalThis(n.parent, container);
      if (container.parent.kind === Syntax.ObjectLiteralExpression) return anyType;
      const classLikeDeclaration = <qt.ClassLikeDeclaration>container.parent;
      if (!qf.get.classExtendsHeritageElem(classLikeDeclaration)) {
        error(n, qd.super_can_only_be_referenced_in_a_derived_class);
        return errorType;
      }
      const classType = <qt.InterfaceType>getDeclaredTypeOfSymbol(qf.get.symbolOfNode(classLikeDeclaration));
      const baseClassType = classType && getBaseTypes(classType)[0];
      if (!baseClassType) return errorType;
      if (container.kind === Syntax.Constructor && isInConstructorArgIniter(n, container)) {
        error(n, qd.super_cannot_be_referenced_in_constructor_args);
        return errorType;
      }
      return nodeCheckFlag === NodeCheckFlags.SuperStatic ? getBaseConstructorTypeOfClass(classType) : qf.get.typeWithThisArg(baseClassType, classType.thisType);
      function isLegalUsageOfSuperExpression(container: Node): boolean {
        if (!container) return false;
        if (isCallExpression) return container.kind === Syntax.Constructor;
        else {
          if (qf.is.classLike(container.parent) || container.parent.kind === Syntax.ObjectLiteralExpression) {
            if (qf.has.syntacticModifier(container, ModifierFlags.Static))
              return container.kind === Syntax.MethodDeclaration || container.kind === Syntax.MethodSignature || container.kind === Syntax.GetAccessor || container.kind === Syntax.SetAccessor;
            else {
              return (
                container.kind === Syntax.MethodDeclaration ||
                container.kind === Syntax.MethodSignature ||
                container.kind === Syntax.GetAccessor ||
                container.kind === Syntax.SetAccessor ||
                container.kind === Syntax.PropertyDeclaration ||
                container.kind === Syntax.PropertySignature ||
                container.kind === Syntax.Constructor
              );
            }
          }
        }
        return false;
      }
    }
    spreadExpression(n: qt.SpreadElem, checkMode?: CheckMode): qt.Type {
      const arrayOrIterableType = this.expression(n.expression, checkMode);
      return this.iteratedTypeOrElemType(IterationUse.Spread, arrayOrIterableType, undefinedType, n.expression);
    }
    arrayLiteral(n: qt.ArrayLiteralExpression, checkMode: CheckMode | undefined, forceTuple: boolean | undefined): qt.Type {
      const elems = n.elems;
      const elemCount = elems.length;
      const elemTypes: qt.Type[] = [];
      let hasEndingSpreadElem = false;
      let hasNonEndingSpreadElem = false;
      const contextualType = getApparentTypeOfContextualType(n);
      const inDestructuringPattern = qf.is.assignmentTarget(n);
      const inConstContext = isConstContext(n);
      for (let i = 0; i < elemCount; i++) {
        const e = elems[i];
        const spread = e.kind === Syntax.SpreadElem && (<qt.SpreadElem>e).expression;
        const spreadType = spread && this.expression(spread, checkMode, forceTuple);
        if (spreadType && qf.type.is.tuple(spreadType)) {
          elemTypes.push(...getTypeArgs(spreadType));
          if (spreadType.target.hasRestElem) {
            if (i === elemCount - 1) hasEndingSpreadElem = true;
            else hasNonEndingSpreadElem = true;
          }
        } else {
          if (inDestructuringPattern && spreadType) {
            const restElemType = qf.get.indexTypeOfType(spreadType, IndexKind.Number) || getIteratedTypeOrElemType(IterationUse.Destructuring, spreadType, undefinedType, undefined, false);
            if (restElemType) elemTypes.push(restElemType);
          } else {
            const elemContextualType = getContextualTypeForElemExpression(contextualType, elemTypes.length);
            const type = this.expressionForMutableLocation(e, checkMode, elemContextualType, forceTuple);
            elemTypes.push(type);
          }
          if (spread) {
            if (i === elemCount - 1) hasEndingSpreadElem = true;
            else hasNonEndingSpreadElem = true;
          }
        }
      }
      if (!hasNonEndingSpreadElem) {
        const minLength = elemTypes.length - (hasEndingSpreadElem ? 1 : 0);
        let tupleResult;
        if (inDestructuringPattern && minLength > 0) {
          const type = cloneTypeReference(<qt.TypeReference>createTupleType(elemTypes, minLength, hasEndingSpreadElem));
          type.pattern = n;
          return type;
        } else if ((tupleResult = getArrayLiteralTupleTypeIfApplicable(elemTypes, contextualType, hasEndingSpreadElem, elemTypes.length, inConstContext))) {
          return createArrayLiteralType(tupleResult);
        } else if (forceTuple) {
          return createArrayLiteralType(createTupleType(elemTypes, minLength, hasEndingSpreadElem));
        }
      }
      return createArrayLiteralType(
        createArrayType(elemTypes.length ? qf.get.unionType(elemTypes, qt.UnionReduction.Subtype) : strictNullChecks ? implicitNeverType : undefinedWideningType, inConstContext)
      );
    }
    computedPropertyName(n: qt.ComputedPropertyName): qt.Type {
      const links = qf.get.nodeLinks(n.expression);
      if (!links.resolvedType) {
        links.resolvedType = this.expression(n.expression);
        if (
          links.resolvedType.flags & TypeFlags.Nullable ||
          (!qf.type.is.assignableToKind(links.resolvedType, TypeFlags.StringLike | TypeFlags.NumberLike | TypeFlags.ESSymbolLike) &&
            !qf.type.is.assignableTo(links.resolvedType, stringNumberSymbolType))
        ) {
          error(n, qd.msgs.A_computed_property_name_must_be_of_type_string_number_symbol_or_any);
        } else {
          this.thatExpressionIsProperSymbolReference(n.expression, links.resolvedType, true);
        }
      }
      return links.resolvedType;
    }
    objectLiteral(n: qt.ObjectLiteralExpression, checkMode?: CheckMode): qt.Type {
      const inDestructuringPattern = qf.is.assignmentTarget(n);
      checkGrammar.objectLiteralExpression(n, inDestructuringPattern);
      const allPropertiesTable = strictNullChecks ? new qc.SymbolTable() : undefined;
      let propertiesTable = new qc.SymbolTable();
      let propertiesArray: qt.Symbol[] = [];
      let spread: qt.Type = emptyObjectType;
      const contextualType = getApparentTypeOfContextualType(n);
      const contextualTypeHasPattern =
        contextualType && contextualType.pattern && (contextualType.pattern.kind === Syntax.ObjectBindingPattern || contextualType.pattern.kind === Syntax.ObjectLiteralExpression);
      const inConstContext = isConstContext(n);
      const checkFlags = inConstContext ? qt.CheckFlags.Readonly : 0;
      const isInJavascript = qf.is.inJSFile(n) && !qf.is.inJsonFile(n);
      const enumTag = qf.get.doc.enumTag(n);
      const isJSObjectLiteral = !contextualType && isInJavascript && !enumTag;
      let objectFlags: ObjectFlags = freshObjectLiteralFlag;
      let patternWithComputedProperties = false;
      let hasComputedStringProperty = false;
      let hasComputedNumberProperty = false;
      for (const elem of n.properties) {
        if (elem.name && elem.name.kind === Syntax.ComputedPropertyName && !qf.is.wellKnownSymbolSyntactically(elem.name)) this.computedPropertyName(elem.name);
      }
      let offset = 0;
      for (let i = 0; i < n.properties.length; i++) {
        const memberDecl = n.properties[i];
        let member = qf.get.symbolOfNode(memberDecl);
        const computedNameType =
          memberDecl.name && memberDecl.name.kind === Syntax.ComputedPropertyName && !qf.is.wellKnownSymbolSyntactically(memberDecl.name.expression)
            ? this.computedPropertyName(memberDecl.name)
            : undefined;
        if (memberDecl.kind === Syntax.PropertyAssignment || memberDecl.kind === Syntax.ShorthandPropertyAssignment || qf.is.objectLiteralMethod(memberDecl)) {
          let type =
            memberDecl.kind === Syntax.PropertyAssignment
              ? this.propertyAssignment(memberDecl, checkMode)
              : memberDecl.kind === Syntax.ShorthandPropertyAssignment
              ? this.expressionForMutableLocation(memberDecl.name, checkMode)
              : this.objectLiteralMethod(memberDecl, checkMode);
          if (isInJavascript) {
            const docType = getTypeForDeclarationFromDocComment(memberDecl);
            if (docType) {
              qf.type.check.assignableTo(type, docType, memberDecl);
              type = docType;
            } else if (enumTag && enumTag.typeExpression) {
              qf.type.check.assignableTo(type, qf.get.typeFromTypeNode(enumTag.typeExpression), memberDecl);
            }
          }
          objectFlags |= getObjectFlags(type) & ObjectFlags.PropagatingFlags;
          const nameType = computedNameType && qf.type.is.usableAsPropertyName(computedNameType) ? computedNameType : undefined;
          const prop = nameType
            ? new qc.Symbol(SymbolFlags.Property | member.flags, getPropertyNameFromType(nameType), checkFlags | qt.CheckFlags.Late)
            : new qc.Symbol(SymbolFlags.Property | member.flags, member.escName, checkFlags);
          if (nameType) prop.nameType = nameType;
          if (inDestructuringPattern) {
            const isOptional =
              (memberDecl.kind === Syntax.PropertyAssignment && hasDefaultValue(memberDecl.initer)) || (memberDecl.kind === Syntax.ShorthandPropertyAssignment && memberDecl.objectAssignmentIniter);
            if (isOptional) prop.flags |= qt.SymbolFlags.Optional;
          } else if (contextualTypeHasPattern && !(getObjectFlags(contextualType!) & ObjectFlags.ObjectLiteralPatternWithComputedProperties)) {
            const impliedProp = qf.get.propertyOfType(contextualType!, member.escName);
            if (impliedProp) prop.flags |= impliedProp.flags & qt.SymbolFlags.Optional;
            else if (!compilerOpts.suppressExcessPropertyErrors && !qf.get.indexInfoOfType(contextualType!, IndexKind.String)) {
              error(memberDecl.name, qd.msgs.Object_literal_may_only_specify_known_properties_and_0_does_not_exist_in_type_1, member.symbolToString(), typeToString(contextualType!));
            }
          }
          prop.declarations = member.declarations;
          prop.parent = member.parent;
          if (member.valueDeclaration) prop.valueDeclaration = member.valueDeclaration;
          prop.type = type;
          prop.target = member;
          member = prop;
          allPropertiesTable?.set(prop.escName, prop);
        } else if (memberDecl.kind === Syntax.SpreadAssignment) {
          if (propertiesArray.length > 0) {
            spread = getSpreadType(spread, createObjectLiteralType(), n.symbol, objectFlags, inConstContext);
            propertiesArray = [];
            propertiesTable = new qc.SymbolTable();
            hasComputedStringProperty = false;
            hasComputedNumberProperty = false;
          }
          const type = getReducedType(this.expression(memberDecl.expression));
          if (!qf.is.validSpreadType(type)) {
            error(memberDecl, qd.msgs.Spread_types_may_only_be_created_from_object_types);
            return errorType;
          }
          if (allPropertiesTable) qf.type.check.spreadPropOverrides(type, allPropertiesTable, memberDecl);
          spread = getSpreadType(spread, type, n.symbol, objectFlags, inConstContext);
          offset = i + 1;
          continue;
        } else {
          qf.assert.true(memberDecl.kind === Syntax.GetAccessor || memberDecl.kind === Syntax.SetAccessor);
          this.nodeDeferred(memberDecl);
        }
        if (computedNameType && !(computedNameType.flags & TypeFlags.StringOrNumberLiteralOrUnique)) {
          if (qf.type.is.assignableTo(computedNameType, stringNumberSymbolType)) {
            if (qf.type.is.assignableTo(computedNameType, numberType)) hasComputedNumberProperty = true;
            else {
              hasComputedStringProperty = true;
            }
            if (inDestructuringPattern) patternWithComputedProperties = true;
          }
        } else {
          propertiesTable.set(member.escName, member);
        }
        propertiesArray.push(member);
      }
      if (contextualTypeHasPattern && n.parent.kind !== Syntax.SpreadAssignment) {
        for (const prop of qf.get.propertiesOfType(contextualType!)) {
          if (!propertiesTable.get(prop.escName) && !qf.get.propertyOfType(spread, prop.escName)) {
            if (!(prop.flags & qt.SymbolFlags.Optional))
              error(prop.valueDeclaration || (<qt.TransientSymbol>prop).bindingElem, qd.msgs.Initer_provides_no_value_for_this_binding_elem_and_the_binding_elem_has_no_default_value);
            propertiesTable.set(prop.escName, prop);
            propertiesArray.push(prop);
          }
        }
      }
      if (spread !== emptyObjectType) {
        if (propertiesArray.length > 0) {
          spread = getSpreadType(spread, createObjectLiteralType(), n.symbol, objectFlags, inConstContext);
          propertiesArray = [];
          propertiesTable = new qc.SymbolTable();
          hasComputedStringProperty = false;
          hasComputedNumberProperty = false;
        }
        return mapType(spread, (t) => (t === emptyObjectType ? createObjectLiteralType() : t));
      }
      return createObjectLiteralType();
      function createObjectLiteralType() {
        const stringIndexInfo = hasComputedStringProperty ? getObjectLiteralIndexInfo(n, offset, propertiesArray, IndexKind.String) : undefined;
        const numberIndexInfo = hasComputedNumberProperty ? getObjectLiteralIndexInfo(n, offset, propertiesArray, IndexKind.Number) : undefined;
        const result = createAnonymousType(n.symbol, propertiesTable, empty, empty, stringIndexInfo, numberIndexInfo);
        result.objectFlags |= objectFlags | ObjectFlags.ObjectLiteral | ObjectFlags.ContainsObjectOrArrayLiteral;
        if (isJSObjectLiteral) result.objectFlags |= ObjectFlags.JSLiteral;
        if (patternWithComputedProperties) result.objectFlags |= ObjectFlags.ObjectLiteralPatternWithComputedProperties;
        if (inDestructuringPattern) result.pattern = n;
        return result;
      }
    }
    jsx = new (class {
      jsxSelfClosingElemDeferred(n: qt.JsxSelfClosingElem) {
        this.jsxOpeningLikeElemOrOpeningFragment(n);
        resolveUntypedCall(n);
      }
      jsxSelfClosingElem(n: qt.JsxSelfClosingElem, _checkMode: CheckMode | undefined): qt.Type {
        this.nodeDeferred(n);
        return getJsxElemTypeAt(n) || anyType;
      }
      jsxElemDeferred(n: qt.JsxElem) {
        this.jsxOpeningLikeElemOrOpeningFragment(n.opening);
        if (isJsxIntrinsicIdentifier(n.closing.tagName)) getIntrinsicTagSymbol(n.closing);
        else {
          this.expression(n.closing.tagName);
        }
        this.jsxChildren(n);
      }
      jsxElem(n: qt.JsxElem, _checkMode: CheckMode | undefined): qt.Type {
        this.nodeDeferred(n);
        return getJsxElemTypeAt(n) || anyType;
      }
      jsxFragment(n: qt.JsxFragment): qt.Type {
        this.jsxOpeningLikeElemOrOpeningFragment(n.openingFragment);
        if (compilerOpts.jsx === qt.JsxEmit.React && (compilerOpts.jsxFactory || n.sourceFile.pragmas.has('jsx')))
          error(n, compilerOpts.jsxFactory ? qd.msgs.JSX_fragment_is_not_supported_when_using_jsxFactory : qd.msgs.JSX_fragment_is_not_supported_when_using_an_inline_JSX_factory_pragma);
        this.jsxChildren(n);
        return getJsxElemTypeAt(n) || anyType;
      }
      jsxAttribute(n: qt.JsxAttribute, checkMode?: CheckMode) {
        return n.initer ? this.expressionForMutableLocation(n.initer, checkMode) : trueType;
      }
      jsxChildren(n: qt.JsxElem | qt.JsxFragment, checkMode?: CheckMode) {
        const childrenTypes: qt.Type[] = [];
        for (const child of n.children) {
          if (child.kind === Syntax.JsxText) {
            if (!child.onlyTriviaWhitespaces) childrenTypes.push(stringType);
          } else {
            childrenTypes.push(this.expressionForMutableLocation(child, checkMode));
          }
        }
        return childrenTypes;
      }
      jsxAttributes(n: qt.JsxAttributes, checkMode: CheckMode | undefined) {
        return createJsxAttributesTypeFromAttributesProperty(n.parent, checkMode);
      }
      jsxReturnAssignableToAppropriateBound(refKind: qt.JsxReferenceKind, elemInstanceType: qt.Type, openingLikeElem: qt.JsxOpeningLikeElem) {
        if (refKind === qt.JsxReferenceKind.Function) {
          const sfcReturnConstraint = getJsxStatelessElemTypeAt(openingLikeElem);
          if (sfcReturnConstraint)
            qf.type.check.relatedTo(elemInstanceType, sfcReturnConstraint, assignableRelation, openingLikeElem.tagName, qd.msgs.Its_return_type_0_is_not_a_valid_JSX_elem, generateInitialErrorChain);
        } else if (refKind === qt.JsxReferenceKind.Component) {
          const classConstraint = getJsxElemClassTypeAt(openingLikeElem);
          if (classConstraint)
            qf.type.check.relatedTo(elemInstanceType, classConstraint, assignableRelation, openingLikeElem.tagName, qd.msgs.Its_instance_type_0_is_not_a_valid_JSX_elem, generateInitialErrorChain);
        } else {
          const sfcReturnConstraint = getJsxStatelessElemTypeAt(openingLikeElem);
          const classConstraint = getJsxElemClassTypeAt(openingLikeElem);
          if (!sfcReturnConstraint || !classConstraint) return;
          const combined = qf.get.unionType([sfcReturnConstraint, classConstraint]);
          qf.type.check.relatedTo(elemInstanceType, combined, assignableRelation, openingLikeElem.tagName, qd.msgs.Its_elem_type_0_is_not_a_valid_JSX_elem, generateInitialErrorChain);
        }
        function generateInitialErrorChain(): qd.MessageChain {
          const componentName = qf.get.textOf(openingLikeElem.tagName);
          return chainqd.Messages(undefined, qd.msgs._0_cannot_be_used_as_a_JSX_component, componentName);
        }
      }
      jsxPreconditions(errorNode: Node) {
        if ((compilerOpts.jsx || qt.JsxEmit.None) === qt.JsxEmit.None) error(errorNode, qd.msgs.Cannot_use_JSX_unless_the_jsx_flag_is_provided);
        if (getJsxElemTypeAt(errorNode) === undefined) {
          if (noImplicitAny) error(errorNode, qd.msgs.JSX_elem_implicitly_has_type_any_because_the_global_type_JSX_Elem_does_not_exist);
        }
      }
      jsxOpeningLikeElemOrOpeningFragment(n: qt.JsxOpeningLikeElem | qt.JsxOpeningFragment) {
        const isNodeOpeningLikeElem = qf.is.jsx.openingLikeElem(n);
        if (isNodeOpeningLikeElem) checkGrammar.jsxElem(<qt.JsxOpeningLikeElem>n);
        this.jsxPreconditions(n);
        const reactRefErr = diagnostics && compilerOpts.jsx === qt.JsxEmit.React ? qd.msgs.Cannot_find_name_0 : undefined;
        const reactNamespace = getJsxNamespace(n);
        const reactLocation = isNodeOpeningLikeElem ? (<qt.JsxOpeningLikeElem>n).tagName : n;
        const reactSym = resolveName(reactLocation, reactNamespace, qt.SymbolFlags.Value, reactRefErr, reactNamespace, true);
        if (reactSym) {
          reactSym.referenced = qt.SymbolFlags.All;
          if (reactSym.flags & qt.SymbolFlags.Alias && !reactSym.getTypeOnlyAliasDeclaration()) reactSym.markAliasSymbolAsReferenced();
        }
        if (isNodeOpeningLikeElem) {
          const jsxOpeningLikeNode = n as qt.JsxOpeningLikeElem;
          const sig = getResolvedSignature(jsxOpeningLikeNode);
          this.jsxReturnAssignableToAppropriateBound(getJsxReferenceKind(jsxOpeningLikeNode), qf.get.returnTypeOfSignature(sig), jsxOpeningLikeNode);
        }
      }
      jsxExpression(n: qt.JsxExpression, checkMode?: CheckMode) {
        checkGrammar.jsxExpression(n);
        if (n.expression) {
          const type = this.expression(n.expression, checkMode);
          if (n.dot3Token && type !== anyType && !qf.type.is.array(type)) error(n, qd.msgs.JSX_spread_child_must_be_an_array_type);
          return type;
        }
        return errorType;
      }
    })();
    propertyAccessibility(
      n:
        | qt.PropertyAccessExpression
        | qt.QualifiedName
        | qt.PropertyAccessExpression
        | qt.VariableDeclaration
        | qt.ParamDeclaration
        | qt.ImportTyping
        | qt.PropertyAssignment
        | qt.ShorthandPropertyAssignment
        | qt.BindingElem,
      isSuper: boolean,
      type: qt.Type,
      prop: qt.Symbol
    ): boolean {
      const flags = prop.declarationModifierFlags();
      const errorNode = n.kind === Syntax.QualifiedName ? n.right : n.kind === Syntax.ImportTyping ? n : n.name;
      if (isSuper) {
        if (flags & ModifierFlags.Abstract) {
          error(errorNode, qd.msgs.Abstract_method_0_in_class_1_cannot_be_accessed_via_super_expression, prop.symbolToString(), typeToString(getDeclaringClass(prop)!));
          return false;
        }
      }
      if (flags & ModifierFlags.Abstract && qf.is.thisProperty(n) && symbolHasNonMethodDeclaration(prop)) {
        const declaringClassDeclaration = getParentOfSymbol(prop)!.classLikeDeclaration();
        if (declaringClassDeclaration && isNodeUsedDuringClassInitialization(n)) {
          error(errorNode, qd.msgs.Abstract_property_0_in_class_1_cannot_be_accessed_in_the_constructor, prop.symbolToString(), qf.get.textOfIdentifierOrLiteral(declaringClassDeclaration.name!));
          return false;
        }
      }
      if (n.kind === Syntax.PropertyAccessExpression && n.name.kind === Syntax.PrivateIdentifier) {
        if (!qf.get.containingClass(n)) {
          error(errorNode, qd.msgs.Private_identifiers_are_not_allowed_outside_class_bodies);
          return false;
        }
        return true;
      }
      if (!(flags & ModifierFlags.NonPublicAccessibilityModifier)) return true;
      if (flags & ModifierFlags.Private) {
        const declaringClassDeclaration = getParentOfSymbol(prop)!.classLikeDeclaration()!;
        if (!isNodeWithinClass(n, declaringClassDeclaration)) {
          error(errorNode, qd.msgs.Property_0_is_private_and_only_accessible_within_class_1, prop.symbolToString(), typeToString(getDeclaringClass(prop)!));
          return false;
        }
        return true;
      }
      if (isSuper) return true;
      let enclosingClass = forEachEnclosingClass(n, (enclosingDeclaration) => {
        const enclosingClass = <qt.InterfaceType>getDeclaredTypeOfSymbol(qf.get.symbolOfNode(enclosingDeclaration)!);
        return isClassDerivedFromDeclaringClasses(enclosingClass, prop) ? enclosingClass : undefined;
      });
      if (!enclosingClass) {
        let thisParam: qt.ParamDeclaration | undefined;
        if (flags & ModifierFlags.Static || !(thisParam = getThisParamFromNodeContext(n)) || !thisParam.type) {
          error(errorNode, qd.msgs.Property_0_is_protected_and_only_accessible_within_class_1_and_its_subclasses, prop.symbolToString(), typeToString(getDeclaringClass(prop) || type));
          return false;
        }
        const thisType = qf.get.typeFromTypeNode(thisParam.type);
        enclosingClass = ((thisType.flags & TypeFlags.TypeParam ? qf.get.constraintOfTypeParam(<qt.TypeParam>thisType) : thisType) as qt.TypeReference).target;
      }
      if (flags & ModifierFlags.Static) return true;
      if (type.flags & TypeFlags.TypeParam) type = (type as qt.TypeParam).isThisType ? qf.get.constraintOfTypeParam(<qt.TypeParam>type)! : qf.get.baseConstraintOfType(<qt.TypeParam>type)!;
      if (!type || !hasBaseType(type, enclosingClass)) {
        error(errorNode, qd.msgs.Property_0_is_protected_and_only_accessible_through_an_instance_of_class_1, prop.symbolToString(), typeToString(enclosingClass));
        return false;
      }
      return true;
    }
    nonNullExpression(n: qt.Expression | qt.QualifiedName) {
      return qf.type.check.nonNull(this.expression(n), n);
    }
    propertyAccessExpression(n: qt.PropertyAccessExpression) {
      return n.flags & NodeFlags.OptionalChain
        ? this.propertyAccessChain(n as qt.PropertyAccessChain)
        : this.propertyAccessExpressionOrQualifiedName(n, n.expression, this.nonNullExpression(n.expression), n.name);
    }
    propertyAccessChain(n: qt.PropertyAccessChain) {
      const leftType = this.expression(n.expression);
      const nonOptionalType = getOptionalExpressionType(leftType, n.expression);
      return propagateOptionalTypeMarker(this.propertyAccessExpressionOrQualifiedName(n, n.expression, qf.type.check.nonNull(nonOptionalType, n.expression), n.name), n, nonOptionalType !== leftType);
    }
    qualifiedName(n: qt.QualifiedName) {
      return this.propertyAccessExpressionOrQualifiedName(n, n.left, this.nonNullExpression(n.left), n.right);
    }
    propertyAccessExpressionOrQualifiedName(n: qt.PropertyAccessExpression | qt.QualifiedName, left: qt.Expression | qt.QualifiedName, leftType: qt.Type, right: qt.Identifier | qt.PrivateIdentifier) {
      const parentSymbol = qf.get.nodeLinks(left).resolvedSymbol;
      const assignmentKind = qf.get.assignmentTargetKind(n);
      const apparentType = getApparentType(assignmentKind !== qt.AssignmentKind.None || isMethodAccessForCall(n) ? qf.get.widenedType(leftType) : leftType);
      if (right.kind === Syntax.PrivateIdentifier) this.externalEmitHelpers(n, ExternalEmitHelpers.ClassPrivateFieldGet);
      const isAnyLike = qf.type.is.any(apparentType) || apparentType === silentNeverType;
      let prop: qt.Symbol | undefined;
      if (right.kind === Syntax.PrivateIdentifier) {
        const lexicallyScopedSymbol = lookupSymbolForPrivateIdentifierDeclaration(right.escapedText, right);
        if (isAnyLike) {
          if (lexicallyScopedSymbol) return apparentType;
          if (!qf.get.containingClass(right)) {
            grammarErrorOnNode(right, qd.msgs.Private_identifiers_are_not_allowed_outside_class_bodies);
            return anyType;
          }
        }
        prop = lexicallyScopedSymbol ? getPrivateIdentifierPropertyOfType(leftType, lexicallyScopedSymbol) : undefined;
        if (!prop && qf.type.check.privateIdentifierPropAccess(leftType, right, lexicallyScopedSymbol)) return errorType;
      } else {
        if (isAnyLike) {
          if (left.kind === Syntax.Identifier && parentSymbol) markAliasReferenced(parentSymbol, n);
          return apparentType;
        }
        prop = qf.get.propertyOfType(apparentType, right.escapedText);
      }
      if (left.kind === Syntax.Identifier && parentSymbol && !(prop && isConstEnumOrConstEnumOnlyModule(prop))) markAliasReferenced(parentSymbol, n);
      let propType: qt.Type;
      if (!prop) {
        const indexInfo =
          !right.kind === Syntax.PrivateIdentifier && (assignmentKind === qt.AssignmentKind.None || !qf.type.is.genericObject(leftType) || qf.type.is.thisParam(leftType))
            ? qf.get.indexInfoOfType(apparentType, IndexKind.String)
            : undefined;
        if (!(indexInfo && indexInfo.type)) {
          if (qf.type.is.jsLiteral(leftType)) return anyType;
          if (leftType.symbol === globalThisSymbol) {
            if (globalThisSymbol.exports!.has(right.escapedText) && globalThisSymbol.exports!.get(right.escapedText)!.flags & qt.SymbolFlags.BlockScoped)
              error(right, qd.msgs.Property_0_does_not_exist_on_type_1, qy.get.unescUnderscores(right.escapedText), typeToString(leftType));
            else if (noImplicitAny) {
              error(right, qd.msgs.Elem_implicitly_has_an_any_type_because_type_0_has_no_index_signature, typeToString(leftType));
            }
            return anyType;
          }
          if (right.escapedText && !this.andReportErrorForExtendingInterface(n)) reportNonexistentProperty(right, qf.type.is.thisParam(leftType) ? apparentType : leftType);
          return errorType;
        }
        if (indexInfo.isReadonly && (qf.is.assignmentTarget(n) || qf.is.deleteTarget(n))) error(n, qd.msgs.Index_signature_in_type_0_only_permits_reading, typeToString(apparentType));
        propType = indexInfo.type;
      } else {
        this.propertyNotUsedBeforeDeclaration(prop, n, right);
        markPropertyAsReferenced(prop, n, left.kind === Syntax.ThisKeyword);
        qf.get.nodeLinks(n).resolvedSymbol = prop;
        this.propertyAccessibility(n, left.kind === Syntax.SuperKeyword, apparentType, prop);
        if (isAssignmentToReadonlyEntity(n as qt.Expression, prop, assignmentKind)) {
          error(right, qd.msgs.Cannot_assign_to_0_because_it_is_a_read_only_property, idText(right));
          return errorType;
        }
        propType = isThisPropertyAccessInConstructor(n, prop) ? autoType : qf.get.constraintForLocation(prop.typeOfSymbol(), n);
      }
      return getFlowTypeOfAccessExpression(n, prop, propType, right);
    }
    indexedAccess(n: qt.ElemAccessExpression): qt.Type {
      return n.flags & NodeFlags.OptionalChain ? this.elemAccessChain(n as qt.ElemAccessChain) : this.elemAccessExpression(n, this.nonNullExpression(n.expression));
    }
    elemAccessChain(n: qt.ElemAccessChain) {
      const exprType = this.expression(n.expression);
      const nonOptionalType = getOptionalExpressionType(exprType, n.expression);
      return propagateOptionalTypeMarker(this.elemAccessExpression(n, qf.type.check.nonNull(nonOptionalType, n.expression)), n, nonOptionalType !== exprType);
    }
    elemAccessExpression(n: qt.ElemAccessExpression, exprType: qt.Type): qt.Type {
      const objectType = qf.get.assignmentTargetKind(n) !== qt.AssignmentKind.None || isMethodAccessForCall(n) ? qf.get.widenedType(exprType) : exprType;
      const indexExpression = n.argExpression;
      const indexType = this.expression(indexExpression);
      if (objectType === errorType || objectType === silentNeverType) return objectType;
      if (isConstEnumObjectType(objectType) && !qf.is.stringLiteralLike(indexExpression)) {
        error(indexExpression, qd.msgs.A_const_enum_member_can_only_be_accessed_using_a_string_literal);
        return errorType;
      }
      const effectiveIndexType = isForInVariableForNumericPropertyNames(indexExpression) ? numberType : indexType;
      const accessFlags = qf.is.assignmentTarget(n)
        ? AccessFlags.Writing | (qf.type.is.genericObject(objectType) && !qf.type.is.thisParam(objectType) ? AccessFlags.NoIndexSignatures : 0)
        : AccessFlags.None;
      const indexedAccessType = qf.get.indexedAccessTypeOrUndefined(objectType, effectiveIndexType, n, accessFlags) || errorType;
      return qf.type.check.indexedAccessIndex(getFlowTypeOfAccessExpression(n, indexedAccessType.symbol, indexedAccessType, indexExpression), n);
    }
    thatExpressionIsProperSymbolReference(expression: qt.Expression, expressionType: qt.Type, reportError: boolean): boolean {
      if (expressionType === errorType) return false;
      if (!qf.is.wellKnownSymbolSyntactically(expression)) return false;
      if ((expressionType.flags & TypeFlags.ESSymbolLike) === 0) {
        if (reportError) error(expression, qd.msgs.A_computed_property_name_of_the_form_0_must_be_of_type_symbol, qf.get.textOf(expression));
        return false;
      }
      const leftHandSide = <qc.Identifier>(<qt.PropertyAccessExpression>expression).expression;
      const leftHandSideSymbol = getResolvedSymbol(leftHandSide);
      if (!leftHandSideSymbol) return false;
      const globalESSymbol = getGlobalESSymbolConstructorSymbol(true);
      if (!globalESSymbol) return false;
      if (leftHandSideSymbol !== globalESSymbol) {
        if (reportError) error(leftHandSide, qd.msgs.Symbol_reference_does_not_refer_to_the_global_Symbol_constructor_object);
        return false;
      }
      return true;
    }
    applicableSignatureForJsxOpeningLikeElem(
      n: qt.JsxOpeningLikeElem,
      signature: qt.Signature,
      relation: qu.QMap<qt.RelationComparisonResult>,
      checkMode: CheckMode,
      reportErrors: boolean,
      containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
      errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean }
    ) {
      const paramType = getEffectiveFirstArgForJsxSignature(signature, n);
      const attributesType = this.expressionWithContextualType(n.attributes, paramType, undefined, checkMode);
      return (
        this.tagNameDoesNotExpectTooManyArgs() &&
        qf.type.check.relatedToAndOptionallyElaborate(attributesType, paramType, relation, reportErrors ? n.tagName : undefined, n.attributes, undefined, containingMessageChain, errorOutputContainer)
      );
      function checkTagNameDoesNotExpectTooManyArgs(): boolean {
        const tagType = n.kind === Syntax.JsxOpeningElem || (n.kind === Syntax.JsxSelfClosingElem && !isJsxIntrinsicIdentifier(n.tagName)) ? this.expression(n.tagName) : undefined;
        if (!tagType) return true;
        const tagCallSignatures = getSignaturesOfType(tagType, SignatureKind.Call);
        if (!length(tagCallSignatures)) return true;
        const factory = getJsxFactoryEntity(n);
        if (!factory) return true;
        const factorySymbol = resolveEntityName(factory, qt.SymbolFlags.Value, true, false, n);
        if (!factorySymbol) return true;
        const factoryType = factorySymbol.typeOfSymbol();
        const callSignatures = getSignaturesOfType(factoryType, SignatureKind.Call);
        if (!length(callSignatures)) return true;
        let hasFirstParamSignatures = false;
        let maxParamCount = 0;
        for (const sig of callSignatures) {
          const firstparam = getTypeAtPosition(sig, 0);
          const signaturesOfParam = getSignaturesOfType(firstparam, SignatureKind.Call);
          if (!length(signaturesOfParam)) continue;
          for (const paramSig of signaturesOfParam) {
            hasFirstParamSignatures = true;
            if (hasEffectiveRestParam(paramSig)) return true;
            const paramCount = getParamCount(paramSig);
            if (paramCount > maxParamCount) maxParamCount = paramCount;
          }
        }
        if (!hasFirstParamSignatures) return true;
        let absoluteMinArgCount = Infinity;
        for (const tagSig of tagCallSignatures) {
          const tagRequiredArgCount = getMinArgCount(tagSig);
          if (tagRequiredArgCount < absoluteMinArgCount) absoluteMinArgCount = tagRequiredArgCount;
        }
        if (absoluteMinArgCount <= maxParamCount) return true;
        if (reportErrors) {
          const diag = qf.make.diagForNode(
            n.tagName,
            qd.msgs.Tag_0_expects_at_least_1_args_but_the_JSX_factory_2_provides_at_most_3,
            entityNameToString(n.tagName),
            absoluteMinArgCount,
            entityNameToString(factory),
            maxParamCount
          );
          const tagNameDeclaration = getSymbolAtLocation(n.tagName)?.valueDeclaration;
          if (tagNameDeclaration) addRelatedInfo(diag, qf.make.diagForNode(tagNameDeclaration, qd.msgs._0_is_declared_here, entityNameToString(n.tagName)));
          if (errorOutputContainer && errorOutputContainer.skipLogging) (errorOutputContainer.errors || (errorOutputContainer.errors = [])).push(diag);
          if (!errorOutputContainer.skipLogging) diagnostics.add(diag);
        }
        return false;
      }
    }
    callExpression(n: qt.CallExpression | qt.NewExpression, checkMode?: CheckMode): qt.Type {
      if (!checkGrammar.typeArgs(n, n.typeArgs)) checkGrammar.args(n.args);
      const signature = getResolvedSignature(n, undefined, checkMode);
      if (signature === resolvingSignature) return nonInferrableType;
      if (n.expression.kind === Syntax.SuperKeyword) return voidType;
      if (n.kind === Syntax.NewExpression) {
        const declaration = signature.declaration;
        if (
          declaration &&
          declaration.kind !== Syntax.Constructor &&
          declaration.kind !== Syntax.ConstructSignature &&
          declaration.kind !== Syntax.ConstructorTyping &&
          !qf.is.doc.constructSignature(declaration) &&
          !qf.is.jsConstructor(declaration)
        ) {
          if (noImplicitAny) error(n, qd.new_expression_whose_target_lacks_a_construct_signature_implicitly_has_an_any_type);
          return anyType;
        }
      }
      if (qf.is.inJSFile(n) && isCommonJsRequire(n)) return resolveExternalModuleTypeByLiteral(n.args![0] as qt.StringLiteral);
      const returnType = qf.get.returnTypeOfSignature(signature);
      if (returnType.flags & TypeFlags.ESSymbolLike && isSymbolOrSymbolForCall(n)) return getESSymbolLikeTypeForNode(walkUpParenthesizedExpressions(n.parent));
      if (n.kind === Syntax.CallExpression && n.parent.kind === Syntax.ExpressionStatement && returnType.flags & TypeFlags.Void && getTypePredicateOfSignature(signature)) {
        if (!qf.is.dottedName(n.expression)) error(n.expression, qd.msgs.Assertions_require_the_call_target_to_be_an_identifier_or_qualified_name);
        else if (!getEffectsSignature(n)) {
          const diagnostic = error(n.expression, qd.msgs.Assertions_require_every_name_in_the_call_target_to_be_declared_with_an_explicit_type_annotation);
          getTypeOfDottedName(n.expression, diagnostic);
        }
      }
      if (qf.is.inJSFile(n)) {
        const decl = qf.get.declarationOfExpando(n);
        if (decl) {
          const jsSymbol = qf.get.symbolOfNode(decl);
          if (jsSymbol && qu.hasEntries(jsSymbol.exports)) {
            const jsAssignmentType = createAnonymousType(jsSymbol, jsSymbol.exports, empty, empty, undefined, undefined);
            jsAssignmentType.objectFlags |= ObjectFlags.JSLiteral;
            return qf.get.intersectionType([returnType, jsAssignmentType]);
          }
        }
      }
      return returnType;
    }
    importCallExpression(n: qt.ImportCall): qt.Type {
      if (!checkGrammar.args(n.args)) checkGrammar.importCallExpression(n);
      if (n.args.length === 0) return createPromiseReturnType(n, anyType);
      const spec = n.args[0];
      const specType = this.expressionCached(spec);
      for (let i = 1; i < n.args.length; ++i) {
        this.expressionCached(n.args[i]);
      }
      if (specType.flags & TypeFlags.Undefined || specType.flags & TypeFlags.Null || !qf.type.is.assignableTo(specType, stringType))
        error(spec, qd.msgs.Dynamic_import_s_spec_must_be_of_type_string_but_here_has_type_0, typeToString(specType));
      const moduleSymbol = resolveExternalModuleName(n, spec);
      if (moduleSymbol) {
        const esModuleSymbol = resolveESModuleSymbol(moduleSymbol, spec, true, false);
        if (esModuleSymbol) return createPromiseReturnType(n, getTypeWithSyntheticDefaultImportType(esModuleSymbol.typeOfSymbol(), esModuleSymbol, moduleSymbol));
      }
      return createPromiseReturnType(n, anyType);
    }
    taggedTemplateExpression(n: qt.TaggedTemplateExpression): qt.Type {
      if (!checkGrammar.taggedTemplateChain(n)) checkGrammar.typeArgs(n, n.typeArgs);
      return qf.get.returnTypeOfSignature(getResolvedSignature(n));
    }
    assertion(n: qt.AssertionExpression) {
      return this.assertionWorker(n, n.type, n.expression);
    }
    assertionWorker(errNode: Node, type: qt.Typing, expression: qt.UnaryExpression | qt.Expression, checkMode?: CheckMode) {
      let exprType = this.expression(expression, checkMode);
      if (qf.is.constTypeReference(type)) {
        if (!isValidConstAssertionArg(expression)) error(expression, qd.msgs.A_const_assertions_can_only_be_applied_to_references_to_enum_members_or_string_number_boolean_array_or_object_literals);
        return getRegularTypeOfLiteralType(exprType);
      }
      this.sourceElem(type);
      exprType = getRegularTypeOfObjectLiteral(getBaseTypeOfLiteralType(exprType));
      const targetType = qf.get.typeFromTypeNode(type);
      if (produceDiagnostics && targetType !== errorType) {
        const widenedType = qf.get.widenedType(exprType);
        if (!qf.type.is.comparableTo(targetType, widenedType)) {
          qf.type.check.comparableTo(
            exprType,
            targetType,
            errNode,
            qd.msgs.Conversion_of_type_0_to_type_1_may_be_a_mistake_because_neither_type_sufficiently_overlaps_with_the_other_If_this_was_intentional_convert_the_expression_to_unknown_first
          );
        }
      }
      return targetType;
    }
    nonNullChain(n: qt.NonNullChain) {
      const leftType = this.expression(n.expression);
      const nonOptionalType = getOptionalExpressionType(leftType, n.expression);
      return propagateOptionalTypeMarker(getNonNullableType(nonOptionalType), n, nonOptionalType !== leftType);
    }
    nonNullAssertion(n: qt.NonNullExpression) {
      return n.flags & NodeFlags.OptionalChain ? this.nonNullChain(n as qt.NonNullChain) : getNonNullableType(this.expression(n.expression));
    }
    metaProperty(n: qt.MetaProperty): qt.Type {
      checkGrammar.metaProperty(n);
      if (n.keywordToken === Syntax.NewKeyword) return this.newTargetMetaProperty(n);
      if (n.keywordToken === Syntax.ImportKeyword) return this.importMetaProperty(n);
      return qc.assert.never(n.keywordToken);
    }
    newTargetMetaProperty(n: qt.MetaProperty) {
      const container = qf.get.newTargetContainer(n);
      if (!container) {
        error(n, qd.msgs.Meta_property_0_is_only_allowed_in_the_body_of_a_function_declaration_function_expression_or_constructor, 'new.target');
        return errorType;
      } else if (container.kind === Syntax.Constructor) {
        const symbol = qf.get.symbolOfNode(container.parent as qt.ClassLikeDeclaration);
        return this.typeOfSymbol();
      } else {
        const symbol = qf.get.symbolOfNode(container)!;
        return this.typeOfSymbol();
      }
    }
    importMetaProperty(n: qt.MetaProperty) {
      if (moduleKind !== ModuleKind.ESNext && moduleKind !== ModuleKind.System) error(n, qd.msgs.The_import_meta_meta_property_is_only_allowed_when_the_module_option_is_esnext_or_system);
      const file = n.sourceFile;
      qf.assert.true(!!(file.flags & NodeFlags.PossiblyContainsImportMeta), 'Containing file is missing import meta n flag.');
      qf.assert.true(!!file.externalModuleIndicator, 'Containing file should be a module.');
      return n.name.escapedText === 'meta' ? getGlobalImportMetaType() : errorType;
    }
    andAggregateYieldOperandTypes(func: qt.FunctionLikeDeclaration, checkMode: CheckMode | undefined) {
      const yieldTypes: qt.Type[] = [];
      const nextTypes: qt.Type[] = [];
      const isAsync = (qf.get.functionFlags(func) & FunctionFlags.Async) !== 0;
      qf.each.yieldExpression(<qt.Block>func.body, (yieldExpression) => {
        const yieldExpressionType = yieldExpression.expression ? this.expression(yieldExpression.expression, checkMode) : undefinedWideningType;
        qu.pushIfUnique(yieldTypes, getYieldedTypeOfYieldExpression(yieldExpression, yieldExpressionType, anyType, isAsync));
        let nextType: qt.Type | undefined;
        if (yieldExpression.asteriskToken) {
          const iterationTypes = getIterationTypesOfIterable(yieldExpressionType, isAsync ? IterationUse.AsyncYieldStar : IterationUse.YieldStar, yieldExpression.expression);
          nextType = iterationTypes && iterationTypes.nextType;
        } else nextType = getContextualType(yieldExpression);
        if (nextType) qu.pushIfUnique(nextTypes, nextType);
      });
      return { yieldTypes, nextTypes };
    }
    andAggregateReturnExpressionTypes(func: qt.FunctionLikeDeclaration, checkMode: CheckMode | undefined): qt.Type[] | undefined {
      const functionFlags = qf.get.functionFlags(func);
      const aggregatedTypes: qt.Type[] = [];
      let hasReturnWithNoExpression = functionHasImplicitReturn(func);
      let hasReturnOfTypeNever = false;
      qf.each.returnStatement(<qt.Block>func.body, (returnStatement) => {
        const expr = returnStatement.expression;
        if (expr) {
          let type = this.expressionCached(expr, checkMode && checkMode & ~CheckMode.SkipGenericFunctions);
          if (functionFlags & FunctionFlags.Async)
            type = qf.type.check.awaited(type, func, qd.msgs.The_return_type_of_an_async_function_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member);
          if (type.flags & TypeFlags.Never) hasReturnOfTypeNever = true;
          qu.pushIfUnique(aggregatedTypes, type);
        } else {
          hasReturnWithNoExpression = true;
        }
      });
      if (aggregatedTypes.length === 0 && !hasReturnWithNoExpression && (hasReturnOfTypeNever || mayReturnNever(func))) return;
      if (strictNullChecks && aggregatedTypes.length && hasReturnWithNoExpression && !(qf.is.jsConstructor(func) && aggregatedTypes.some((t) => t.symbol === func.symbol)))
        qu.pushIfUnique(aggregatedTypes, undefinedType);
      return aggregatedTypes;
    }
    allCodePathsInNonVoidFunctionReturnOrThrow(func: qt.FunctionLikeDeclaration | qt.MethodSignature, returnType: qt.Type | undefined): void {
      if (!produceDiagnostics) return;
      const functionFlags = qf.get.functionFlags(func);
      const type = returnType && unwrapReturnType(returnType, functionFlags);
      if (type && maybeTypeOfKind(type, TypeFlags.Any | TypeFlags.Void)) return;
      if (func.kind === Syntax.MethodSignature || qf.is.missing(func.body) || func.body!.kind !== Syntax.Block || !functionHasImplicitReturn(func)) return;
      const hasExplicitReturn = func.flags & NodeFlags.HasExplicitReturn;
      if (type && type.flags & TypeFlags.Never) error(qf.get.effectiveReturnTypeNode(func), qd.msgs.A_function_returning_never_cannot_have_a_reachable_end_point);
      else if (type && !hasExplicitReturn) {
        error(qf.get.effectiveReturnTypeNode(func), qd.msgs.A_function_whose_declared_type_is_neither_void_nor_any_must_return_a_value);
      } else if (type && strictNullChecks && !qf.type.is.assignableTo(undefinedType, type)) {
        error(qf.get.effectiveReturnTypeNode(func) || func, qd.msgs.Function_lacks_ending_return_statement_and_return_type_does_not_include_undefined);
      } else if (compilerOpts.noImplicitReturns) {
        if (!type) {
          if (!hasExplicitReturn) return;
          const inferredReturnType = qf.get.returnTypeOfSignature(qf.get.signatureFromDeclaration(func));
          if (isUnwrappedReturnTypeVoidOrAny(func, inferredReturnType)) return;
        }
        error(qf.get.effectiveReturnTypeNode(func) || func, qd.msgs.Not_all_code_paths_return_a_value);
      }
    }
    functionExpressionOrObjectLiteralMethod(n: qt.FunctionExpression | qt.ArrowFunction | qt.MethodDeclaration, checkMode?: CheckMode): qt.Type {
      qf.assert.true(n.kind !== Syntax.MethodDeclaration || qf.is.objectLiteralMethod(n));
      this.nodeDeferred(n);
      if (checkMode && checkMode & CheckMode.SkipContextSensitive && qf.is.contextSensitive(n)) {
        if (!qf.get.effectiveReturnTypeNode(n) && !hasContextSensitiveParams(n)) {
          const contextualSignature = getContextualSignature(n);
          if (contextualSignature && couldContainTypeVariables(qf.get.returnTypeOfSignature(contextualSignature))) {
            const links = qf.get.nodeLinks(n);
            if (links.contextFreeType) return links.contextFreeType;
            const returnType = getReturnTypeFromBody(n, checkMode);
            const returnOnlySignature = createSignature(undefined, undefined, undefined, empty, returnType, undefined, 0, SignatureFlags.None);
            const returnOnlyType = createAnonymousType(n.symbol, emptySymbols, [returnOnlySignature], empty, undefined, undefined);
            returnOnlyType.objectFlags |= ObjectFlags.NonInferrableType;
            return (links.contextFreeType = returnOnlyType);
          }
        }
        return anyFunctionType;
      }
      const hasGrammarError = checkGrammar.functionLikeDeclaration(n);
      if (!hasGrammarError && n.kind === Syntax.FunctionExpression) checkGrammar.forGenerator(n);
      contextuallyCheckFunctionExpressionOrObjectLiteralMethod(n, checkMode);
      return qf.get.symbolOfNode(n).typeOfSymbol();
    }
    functionExpressionOrObjectLiteralMethodDeferred(n: qt.ArrowFunction | qt.FunctionExpression | qt.MethodDeclaration) {
      qf.assert.true(n.kind !== Syntax.MethodDeclaration || qf.is.objectLiteralMethod(n));
      const functionFlags = qf.get.functionFlags(n);
      const returnType = getReturnTypeFromAnnotation(n);
      this.allCodePathsInNonVoidFunctionReturnOrThrow(n, returnType);
      if (n.body) {
        if (!qf.get.effectiveReturnTypeNode(n)) qf.get.returnTypeOfSignature(qf.get.signatureFromDeclaration(n));
        if (n.body.kind === Syntax.Block) this.sourceElem(n.body);
        else {
          const exprType = this.expression(n.body);
          const returnOrPromisedType = returnType && unwrapReturnType(returnType, functionFlags);
          if (returnOrPromisedType) {
            if ((functionFlags & FunctionFlags.AsyncGenerator) === FunctionFlags.Async) {
              const awaitedType = qf.type.check.awaited(exprType, n.body, qd.msgs.The_return_type_of_an_async_function_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member);
              qf.type.check.assignableToAndOptionallyElaborate(awaitedType, returnOrPromisedType, n.body, n.body);
            } else {
              qf.type.check.assignableToAndOptionallyElaborate(exprType, returnOrPromisedType, n.body, n.body);
            }
          }
        }
      }
    }
    arithmeticOperandType(operand: Node, type: qt.Type, diagnostic: qd.Message, isAwaitValid = false): boolean {
      if (!qf.type.is.assignableTo(type, numberOrBigIntType)) {
        const awaitedType = isAwaitValid && getAwaitedTypeOfPromise(type);
        errorAndMaybeSuggestAwait(operand, !!awaitedType && qf.type.is.assignableTo(awaitedType, numberOrBigIntType), diagnostic);
        return false;
      }
      return true;
    }
    referenceExpression(expr: qt.Expression, invalidReferenceMessage: qd.Message, invalidOptionalChainMessage: qd.Message): boolean {
      const n = qf.skip.outerExpressions(expr, qt.OuterExpressionKinds.Assertions | qt.OuterExpressionKinds.Parentheses);
      if (n.kind !== Syntax.qc.Identifier && !qf.is.accessExpression(n)) {
        error(expr, invalidReferenceMessage);
        return false;
      }
      if (n.flags & NodeFlags.OptionalChain) {
        error(expr, invalidOptionalChainMessage);
        return false;
      }
      return true;
    }
    deleteExpression(n: qt.DeleteExpression): qt.Type {
      this.expression(n.expression);
      const expr = qf.skip.parentheses(n.expression);
      if (!qf.is.accessExpression(expr)) {
        error(expr, qd.msgs.The_operand_of_a_delete_operator_must_be_a_property_reference);
        return booleanType;
      }
      if (expr.kind === Syntax.PropertyAccessExpression && expr.name.kind === Syntax.PrivateIdentifier) error(expr, qd.msgs.The_operand_of_a_delete_operator_cannot_be_a_private_identifier);
      const links = qf.get.nodeLinks(expr);
      const symbol = getExportSymbolOfValueSymbolIfExported(links.resolvedSymbol);
      if (symbol) {
        if (isReadonlySymbol(symbol)) error(expr, qd.msgs.The_operand_of_a_delete_operator_cannot_be_a_read_only_property);
        this.deleteExpressionMustBeOptional(expr, this.typeOfSymbol());
      }
      return booleanType;
    }
    deleteExpressionMustBeOptional(expr: qt.AccessExpression, type: qt.Type) {
      const AnyOrUnknownOrNeverFlags = TypeFlags.AnyOrUnknown | TypeFlags.Never;
      if (strictNullChecks && !(type.flags & AnyOrUnknownOrNeverFlags) && !(getFalsyFlags(type) & TypeFlags.Undefined)) error(expr, qd.msgs.The_operand_of_a_delete_operator_must_be_optional);
    }
    typeOfExpression(n: qt.TypeOfExpression): qt.Type {
      this.expression(n.expression);
      return typeofType;
    }
    voidExpression(n: qt.VoidExpression): qt.Type {
      this.expression(n.expression);
      return undefinedWideningType;
    }
    awaitExpression(n: qt.AwaitExpression): qt.Type {
      if (produceDiagnostics) {
        if (!(n.flags & NodeFlags.AwaitContext)) {
          if (isTopLevelAwait(n)) {
            const sourceFile = n.sourceFile;
            if (!hasParseDiagnostics(sourceFile)) {
              let span: TextSpan | undefined;
              if (!sourceFile.isEffectiveExternalModule(compilerOpts)) {
                if (!span) span = sourceFile.spanOfTokenAtPos(n.pos);
                const diagnostic = qf.make.fileDiag(
                  sourceFile,
                  span.start,
                  span.length,
                  qd.await_expressions_are_only_allowed_at_the_top_level_of_a_file_when_that_file_is_a_module_but_this_file_has_no_imports_or_exports_Consider_adding_an_empty_export_to_make_this_file_a_module
                );
                diagnostics.add(diagnostic);
              }
              if (moduleKind !== ModuleKind.ESNext && moduleKind !== ModuleKind.System) {
                span = sourceFile.spanOfTokenAtPos(n.pos);
                const diagnostic = qf.make.fileDiag(
                  sourceFile,
                  span.start,
                  span.length,
                  qd.msgs.Top_level_await_expressions_are_only_allowed_when_the_module_option_is_set_to_esnext_or_system_and_the_target_option_is_set_to_es2017_or_higher
                );
                diagnostics.add(diagnostic);
              }
            }
          } else {
            const sourceFile = n.sourceFile;
            if (!hasParseDiagnostics(sourceFile)) {
              const span = sourceFile.spanOfTokenAtPos(n.pos);
              const diagnostic = qf.make.fileDiag(sourceFile, span.start, span.length, qd.await_expressions_are_only_allowed_within_async_functions_and_at_the_top_levels_of_modules);
              const func = qf.get.containingFunction(n);
              if (func && func.kind !== Syntax.Constructor && (qf.get.functionFlags(func) & FunctionFlags.Async) === 0) {
                const relatedInfo = qf.make.diagForNode(func, qd.msgs.Did_you_mean_to_mark_this_function_as_async);
                addRelatedInfo(diagnostic, relatedInfo);
              }
              diagnostics.add(diagnostic);
            }
          }
        }
        if (isInParamIniterBeforeContainingFunction(n)) error(n, qd.await_expressions_cannot_be_used_in_a_param_initer);
      }
      const operandType = this.expression(n.expression);
      const awaitedType = qf.type.check.awaited(operandType, n, qd.msgs.Type_of_await_operand_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member);
      if (awaitedType === operandType && awaitedType !== errorType && !(operandType.flags & TypeFlags.AnyOrUnknown))
        addErrorOrSuggestion(false, qf.make.diagForNode(n, qd.await_has_no_effect_on_the_type_of_this_expression));
      return awaitedType;
    }
    prefixUnaryExpression(n: qt.PrefixUnaryExpression): qt.Type {
      const operandType = this.expression(n.operand);
      if (operandType === silentNeverType) return silentNeverType;
      switch (n.operand.kind) {
        case Syntax.NumericLiteral:
          switch (n.operator) {
            case Syntax.MinusToken:
              return getFreshTypeOfLiteralType(qf.get.literalType(-(n.operand as qt.NumericLiteral).text));
            case Syntax.PlusToken:
              return getFreshTypeOfLiteralType(qf.get.literalType(+(n.operand as qt.NumericLiteral).text));
          }
          break;
        case Syntax.BigIntLiteral:
          if (n.operator === Syntax.MinusToken) {
            return getFreshTypeOfLiteralType(
              qf.get.literalType({
                negative: true,
                base10Value: parsePseudoBigInt((n.operand as qt.BigIntLiteral).text),
              })
            );
          }
      }
      switch (n.operator) {
        case Syntax.PlusToken:
        case Syntax.MinusToken:
        case Syntax.TildeToken:
          qf.type.check.nonNull(operandType, n.operand);
          if (maybeTypeOfKind(operandType, TypeFlags.ESSymbolLike)) error(n.operand, qd.msgs.The_0_operator_cannot_be_applied_to_type_symbol, qt.Token.toString(n.operator));
          if (n.operator === Syntax.PlusToken) {
            if (maybeTypeOfKind(operandType, TypeFlags.BigIntLike))
              error(n.operand, qd.msgs.Operator_0_cannot_be_applied_to_type_1, qt.Token.toString(n.operator), typeToString(getBaseTypeOfLiteralType(operandType)));
            return numberType;
          }
          return getUnaryResultType(operandType);
        case Syntax.ExclamationToken:
          this.truthinessExpression(n.operand);
          const facts = getTypeFacts(operandType) & (TypeFacts.Truthy | TypeFacts.Falsy);
          return facts === TypeFacts.Truthy ? falseType : facts === TypeFacts.Falsy ? trueType : booleanType;
        case Syntax.Plus2Token:
        case Syntax.Minus2Token:
          const ok = this.arithmeticOperandType(n.operand, qf.type.check.nonNull(operandType, n.operand), qd.msgs.An_arithmetic_operand_must_be_of_type_any_number_bigint_or_an_enum_type);
          if (ok) {
            this.referenceExpression(
              n.operand,
              qd.msgs.The_operand_of_an_increment_or_decrement_operator_must_be_a_variable_or_a_property_access,
              qd.msgs.The_operand_of_an_increment_or_decrement_operator_may_not_be_an_optional_property_access
            );
          }
          return getUnaryResultType(operandType);
      }
      return errorType;
    }
    postfixUnaryExpression(n: qt.PostfixUnaryExpression): qt.Type {
      const operandType = this.expression(n.operand);
      if (operandType === silentNeverType) return silentNeverType;
      const ok = this.arithmeticOperandType(n.operand, qf.type.check.nonNull(operandType, n.operand), qd.msgs.An_arithmetic_operand_must_be_of_type_any_number_bigint_or_an_enum_type);
      if (ok) {
        this.referenceExpression(
          n.operand,
          qd.msgs.The_operand_of_an_increment_or_decrement_operator_must_be_a_variable_or_a_property_access,
          qd.msgs.The_operand_of_an_increment_or_decrement_operator_may_not_be_an_optional_property_access
        );
      }
      return getUnaryResultType(operandType);
    }
    instanceOfExpression(left: qt.Expression, right: qt.Expression, leftType: qt.Type, rightType: qt.Type): qt.Type {
      if (leftType === silentNeverType || rightType === silentNeverType) return silentNeverType;
      if (!qf.type.is.any(leftType) && allTypesAssignableToKind(leftType, TypeFlags.Primitive))
        error(left, qd.msgs.The_left_hand_side_of_an_instanceof_expression_must_be_of_type_any_an_object_type_or_a_type_param);
      if (!(qf.type.is.any(rightType) || qf.type.is.withCallOrConstructSignatures(rightType) || qf.type.is.subtypeOf(rightType, globalFunctionType)))
        error(right, qd.msgs.The_right_hand_side_of_an_instanceof_expression_must_be_of_type_any_or_of_a_type_assignable_to_the_Function_interface_type);
      return booleanType;
    }
    inExpression(left: qt.Expression, right: qt.Expression, leftType: qt.Type, rightType: qt.Type): qt.Type {
      if (leftType === silentNeverType || rightType === silentNeverType) return silentNeverType;
      leftType = qf.type.check.nonNull(leftType, left);
      rightType = qf.type.check.nonNull(rightType, right);
      if (!(allTypesAssignableToKind(leftType, TypeFlags.StringLike | TypeFlags.NumberLike | TypeFlags.ESSymbolLike) || qf.type.is.assignableToKind(leftType, TypeFlags.Index | TypeFlags.TypeParam)))
        error(left, qd.msgs.The_left_hand_side_of_an_in_expression_must_be_of_type_any_string_number_or_symbol);
      if (!allTypesAssignableToKind(rightType, TypeFlags.NonPrimitive | TypeFlags.InstantiableNonPrimitive))
        error(right, qd.msgs.The_right_hand_side_of_an_in_expression_must_be_of_type_any_an_object_type_or_a_type_param);
      return booleanType;
    }
    objectLiteralAssignment(n: qt.ObjectLiteralExpression, sourceType: qt.Type, rightIsThis?: boolean): qt.Type {
      const properties = n.properties;
      if (strictNullChecks && properties.length === 0) return qf.type.check.nonNull(sourceType, n);
      for (let i = 0; i < properties.length; i++) {
        this.objectLiteralDestructuringPropertyAssignment(n, sourceType, i, properties, rightIsThis);
      }
      return sourceType;
    }
    objectLiteralDestructuringPropertyAssignment(n: qt.ObjectLiteralExpression, t: qt.Type, propertyIndex: number, allProperties?: Nodes<qt.ObjectLiteralElemLike>, rightIsThis = false) {
      const properties = n.properties;
      const property = properties[propertyIndex];
      if (property.kind === Syntax.PropertyAssignment || property.kind === Syntax.ShorthandPropertyAssignment) {
        const name = property.name;
        const exprType = qf.get.literalTypeFromPropertyName(name);
        if (qf.type.is.usableAsPropertyName(exprType)) {
          const text = getPropertyNameFromType(exprType);
          const prop = qf.get.propertyOfType(t, text);
          if (prop) {
            markPropertyAsReferenced(prop, property, rightIsThis);
            this.propertyAccessibility(property, false, t, prop);
          }
        }
        const elemType = qf.get.indexedAccessType(t, exprType, name);
        const type = qf.get.flowTypeOfDestructuring(property, elemType);
        return this.destructuringAssignment(property.kind === Syntax.ShorthandPropertyAssignment ? property : property.initer, type);
      } else if (property.kind === Syntax.SpreadAssignment) {
        if (propertyIndex < properties.length - 1) error(property, qd.msgs.A_rest_elem_must_be_last_in_a_destructuring_pattern);
        else {
          if (languageVersion < qt.ScriptTarget.ESNext) this.externalEmitHelpers(property, ExternalEmitHelpers.Rest);
          const nonRestNames: qt.PropertyName[] = [];
          if (allProperties) {
            for (const otherProperty of allProperties) {
              if (!otherProperty.kind === Syntax.SpreadAssignment) nonRestNames.push(otherProperty.name);
            }
          }
          const type = getRestType(t, nonRestNames, t.symbol);
          checkGrammar.forDisallowedTrailingComma(allProperties, qd.msgs.A_rest_param_or_binding_pattern_may_not_have_a_trailing_comma);
          return this.destructuringAssignment(property.expression, type);
        }
      } else {
        error(property, qd.msgs.Property_assignment_expected);
      }
    }
    arrayLiteralAssignment(n: qt.ArrayLiteralExpression, sourceType: qt.Type, checkMode?: CheckMode): qt.Type {
      const elems = n.elems;
      const elemType = this.iteratedTypeOrElemType(IterationUse.Destructuring, sourceType, undefinedType, n) || errorType;
      for (let i = 0; i < elems.length; i++) {
        this.arrayLiteralDestructuringElemAssignment(n, sourceType, i, elemType, checkMode);
      }
      return sourceType;
    }
    arrayLiteralDestructuringElemAssignment(n: qt.ArrayLiteralExpression, sourceType: qt.Type, elemIndex: number, elemType: qt.Type, checkMode?: CheckMode) {
      const elems = n.elems;
      const elem = elems[elemIndex];
      if (elem.kind !== Syntax.OmittedExpression) {
        if (elem.kind !== Syntax.SpreadElem) {
          const indexType = qf.get.literalType(elemIndex);
          if (qf.type.is.arrayLike(sourceType)) {
            const accessFlags = hasDefaultValue(elem) ? AccessFlags.NoTupleBoundsCheck : 0;
            const elemType = qf.get.indexedAccessTypeOrUndefined(sourceType, indexType, createSyntheticExpression(elem, indexType), accessFlags) || errorType;
            const assignedType = hasDefaultValue(elem) ? getTypeWithFacts(elemType, TypeFacts.NEUndefined) : elemType;
            const type = qf.get.flowTypeOfDestructuring(elem, assignedType);
            return this.destructuringAssignment(elem, type, checkMode);
          }
          return this.destructuringAssignment(elem, elemType, checkMode);
        }
        if (elemIndex < elems.length - 1) error(elem, qd.msgs.A_rest_elem_must_be_last_in_a_destructuring_pattern);
        else {
          const restExpression = (<qt.SpreadElem>elem).expression;
          if (restExpression.kind === Syntax.BinaryExpression && (<qt.BinaryExpression>restExpression).operatorToken.kind === Syntax.EqualsToken)
            error((<qt.BinaryExpression>restExpression).operatorToken, qd.msgs.A_rest_elem_cannot_have_an_initer);
          else {
            checkGrammar.forDisallowedTrailingComma(n.elems, qd.msgs.A_rest_param_or_binding_pattern_may_not_have_a_trailing_comma);
            const type = everyType(sourceType, qf.is.tupleType) ? mapType(sourceType, (t) => sliceTupleType(<qt.TupleTypeReference>t, elemIndex)) : createArrayType(elemType);
            return this.destructuringAssignment(restExpression, type, checkMode);
          }
        }
      }
      return;
    }
    destructuringAssignment(exprOrAssignment: qt.Expression | qt.ShorthandPropertyAssignment, sourceType: qt.Type, checkMode?: CheckMode, rightIsThis?: boolean): qt.Type {
      let target: qt.Expression;
      if (exprOrAssignment.kind === Syntax.ShorthandPropertyAssignment) {
        const prop = <qt.ShorthandPropertyAssignment>exprOrAssignment;
        if (prop.objectAssignmentIniter) {
          if (strictNullChecks && !(getFalsyFlags(this.expression(prop.objectAssignmentIniter)) & TypeFlags.Undefined)) sourceType = getTypeWithFacts(sourceType, TypeFacts.NEUndefined);
          this.binaryLikeExpression(prop.name, prop.equalsToken!, prop.objectAssignmentIniter, checkMode);
        }
        target = (<qt.ShorthandPropertyAssignment>exprOrAssignment).name;
      } else {
        target = exprOrAssignment;
      }
      if (target.kind === Syntax.BinaryExpression && (<qt.BinaryExpression>target).operatorToken.kind === Syntax.EqualsToken) {
        this.binaryExpression(<qt.BinaryExpression>target, checkMode);
        target = (<qt.BinaryExpression>target).left;
      }
      if (target.kind === Syntax.ObjectLiteralExpression) return this.objectLiteralAssignment(<qt.ObjectLiteralExpression>target, sourceType, rightIsThis);
      if (target.kind === Syntax.ArrayLiteralExpression) return this.arrayLiteralAssignment(<qt.ArrayLiteralExpression>target, sourceType, checkMode);
      return this.referenceAssignment(target, sourceType, checkMode);
    }
    referenceAssignment(target: qt.Expression, sourceType: qt.Type, checkMode?: CheckMode): qt.Type {
      const targetType = this.expression(target, checkMode);
      const error =
        target.parent.kind === Syntax.SpreadAssignment
          ? qd.msgs.The_target_of_an_object_rest_assignment_must_be_a_variable_or_a_property_access
          : qd.msgs.The_left_hand_side_of_an_assignment_expression_must_be_a_variable_or_a_property_access;
      const optionalError =
        target.parent.kind === Syntax.SpreadAssignment
          ? qd.msgs.The_target_of_an_object_rest_assignment_may_not_be_an_optional_property_access
          : qd.msgs.The_left_hand_side_of_an_assignment_expression_may_not_be_an_optional_property_access;
      if (this.referenceExpression(target, error, optionalError)) qf.type.check.assignableToAndOptionallyElaborate(sourceType, targetType, target, target);
      if (qf.is.privateIdentifierPropertyAccessExpression(target)) this.externalEmitHelpers(target.parent, ExternalEmitHelpers.ClassPrivateFieldSet);
      return sourceType;
    }
    binaryExpression(n: qt.BinaryExpression, checkMode?: CheckMode) {
      const workStacks: {
        expr: qt.BinaryExpression[];
        state: CheckBinaryExpressionState[];
        leftType: (qt.Type | undefined)[];
      } = {
        expr: [n],
        state: [CheckBinaryExpressionState.MaybeCheckLeft],
        leftType: [undefined],
      };
      let stackIndex = 0;
      let lastResult: qt.Type | undefined;
      while (stackIndex >= 0) {
        n = workStacks.expr[stackIndex];
        switch (workStacks.state[stackIndex]) {
          case CheckBinaryExpressionState.MaybeCheckLeft: {
            if (qf.is.inJSFile(n) && qf.get.assignedExpandoIniter(n)) {
              finishInvocation(this.expression(n.right, checkMode));
              break;
            }
            checkGrammar.nullishCoalesceWithLogicalExpression(n);
            const operator = n.operatorToken.kind;
            if (operator === Syntax.EqualsToken && (n.left.kind === Syntax.ObjectLiteralExpression || n.left.kind === Syntax.ArrayLiteralExpression)) {
              finishInvocation(this.destructuringAssignment(n.left, this.expression(n.right, checkMode), checkMode, n.right.kind === Syntax.ThisKeyword));
              break;
            }
            advanceState(CheckBinaryExpressionState.CheckRight);
            maybeCheckExpression(n.left);
            break;
          }
          case CheckBinaryExpressionState.CheckRight: {
            const leftType = lastResult!;
            workStacks.leftType[stackIndex] = leftType;
            const operator = n.operatorToken.kind;
            if (operator === Syntax.Ampersand2Token || operator === Syntax.Bar2Token || operator === Syntax.Question2Token) qf.type.check.truthinessOf(leftType, n.left);
            advanceState(CheckBinaryExpressionState.FinishCheck);
            maybeCheckExpression(n.right);
            break;
          }
          case CheckBinaryExpressionState.FinishCheck: {
            const leftType = workStacks.leftType[stackIndex]!;
            const rightType = lastResult!;
            finishInvocation(this.binaryLikeExpressionWorker(n.left, n.operatorToken, n.right, leftType, rightType, n));
            break;
          }
          default:
            return qu.fail(`Invalid state ${workStacks.state[stackIndex]} for checkBinaryExpression`);
        }
      }
      return lastResult!;
      function finishInvocation(result: qt.Type) {
        lastResult = result;
        stackIndex--;
      }
      function advanceState(nextState: CheckBinaryExpressionState) {
        workStacks.state[stackIndex] = nextState;
      }
      function maybeCheckExpression(n: qt.Expression) {
        if (BinaryExpression.kind === Syntax.n) {
          stackIndex++;
          workStacks.expr[stackIndex] = n;
          workStacks.state[stackIndex] = CheckBinaryExpressionState.MaybeCheckLeft;
          workStacks.leftType[stackIndex] = undefined;
        } else {
          lastResult = this.expression(n, checkMode);
        }
      }
    }
    binaryLikeExpression(left: qt.Expression, operatorToken: Node, right: qt.Expression, checkMode?: CheckMode, errorNode?: Node): qt.Type {
      const operator = operatorToken.kind;
      if (operator === Syntax.EqualsToken && (left.kind === Syntax.ObjectLiteralExpression || left.kind === Syntax.ArrayLiteralExpression))
        return this.destructuringAssignment(left, this.expression(right, checkMode), checkMode, right.kind === Syntax.ThisKeyword);
      let leftType: qt.Type;
      if (operator === Syntax.Ampersand2Token || operator === Syntax.Bar2Token || operator === Syntax.Question2Token) leftType = this.truthinessExpression(left, checkMode);
      else {
        leftType = this.expression(left, checkMode);
      }
      const rightType = this.expression(right, checkMode);
      return this.binaryLikeExpressionWorker(left, operatorToken, right, leftType, rightType, errorNode);
    }
    binaryLikeExpressionWorker(left: qt.Expression, operatorToken: Node, right: qt.Expression, leftType: qt.Type, rightType: qt.Type, errorNode?: Node): qt.Type {
      const operator = operatorToken.kind;
      switch (operator) {
        case Syntax.AsteriskToken:
        case Syntax.Asterisk2Token:
        case Syntax.AsteriskEqualsToken:
        case Syntax.Asterisk2EqualsToken:
        case Syntax.SlashToken:
        case Syntax.SlashEqualsToken:
        case Syntax.PercentToken:
        case Syntax.PercentEqualsToken:
        case Syntax.MinusToken:
        case Syntax.MinusEqualsToken:
        case Syntax.LessThan2Token:
        case Syntax.LessThan2EqualsToken:
        case Syntax.GreaterThan2Token:
        case Syntax.GreaterThan2EqualsToken:
        case Syntax.GreaterThan3Token:
        case Syntax.GreaterThan3EqualsToken:
        case Syntax.BarToken:
        case Syntax.BarEqualsToken:
        case Syntax.CaretToken:
        case Syntax.CaretEqualsToken:
        case Syntax.AmpersandToken:
        case Syntax.AmpersandEqualsToken:
          if (leftType === silentNeverType || rightType === silentNeverType) return silentNeverType;
          leftType = qf.type.check.nonNull(leftType, left);
          rightType = qf.type.check.nonNull(rightType, right);
          let suggestedOperator: Syntax | undefined;
          if (leftType.flags & TypeFlags.BooleanLike && rightType.flags & TypeFlags.BooleanLike && (suggestedOperator = getSuggestedBooleanOperator(operatorToken.kind)) !== undefined) {
            error(
              errorNode || operatorToken,
              qd.msgs.The_0_operator_is_not_allowed_for_boolean_types_Consider_using_1_instead,
              qt.Token.toString(operatorToken.kind),
              qt.Token.toString(suggestedOperator)
            );
            return numberType;
          } else {
            const leftOk = this.arithmeticOperandType(left, leftType, qd.msgs.The_left_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_bigint_or_an_enum_type, true);
            const rightOk = this.arithmeticOperandType(right, rightType, qd.msgs.The_right_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_bigint_or_an_enum_type, true);
            let resultType: qt.Type;
            if (
              (qf.type.is.assignableToKind(leftType, TypeFlags.AnyOrUnknown) && qf.type.is.assignableToKind(rightType, TypeFlags.AnyOrUnknown)) ||
              !(maybeTypeOfKind(leftType, TypeFlags.BigIntLike) || maybeTypeOfKind(rightType, TypeFlags.BigIntLike))
            ) {
              resultType = numberType;
            } else if (bothAreBigIntLike(leftType, rightType)) {
              switch (operator) {
                case Syntax.GreaterThan3Token:
                case Syntax.GreaterThan3EqualsToken:
                  reportOperatorError();
                  break;
                case Syntax.Asterisk2Token:
                case Syntax.Asterisk2EqualsToken:
              }
              resultType = bigintType;
            } else {
              reportOperatorError(bothAreBigIntLike);
              resultType = errorType;
            }
            if (leftOk && rightOk) this.assignmentOperator(resultType);
            return resultType;
          }
        case Syntax.PlusToken:
        case Syntax.PlusEqualsToken:
          if (leftType === silentNeverType || rightType === silentNeverType) return silentNeverType;
          if (!qf.type.is.assignableToKind(leftType, TypeFlags.StringLike) && !qf.type.is.assignableToKind(rightType, TypeFlags.StringLike)) {
            leftType = qf.type.check.nonNull(leftType, left);
            rightType = qf.type.check.nonNull(rightType, right);
          }
          let resultType: qt.Type | undefined;
          if (qf.type.is.assignableToKind(leftType, TypeFlags.NumberLike, true)) resultType = numberType;
          else if (qf.type.is.assignableToKind(leftType, TypeFlags.BigIntLike, true)) {
            resultType = bigintType;
          } else if (qf.type.is.assignableToKind(leftType, TypeFlags.StringLike, true)) {
            resultType = stringType;
          } else if (qf.type.is.any(leftType) || qf.type.is.any(rightType)) {
            resultType = leftType === errorType || rightType === errorType ? errorType : anyType;
          }
          if (resultType && !this.forDisallowedESSymbolOperand(operator)) return resultType;
          if (!resultType) {
            const closeEnoughKind = TypeFlags.NumberLike | TypeFlags.BigIntLike | TypeFlags.StringLike | TypeFlags.AnyOrUnknown;
            reportOperatorError((left, right) => qf.type.is.assignableToKind(left, closeEnoughKind) && qf.type.is.assignableToKind(right, closeEnoughKind));
            return anyType;
          }
          if (operator === Syntax.PlusEqualsToken) this.assignmentOperator(resultType);
          return resultType;
        case Syntax.LessThanToken:
        case Syntax.GreaterThanToken:
        case Syntax.LessThanEqualsToken:
        case Syntax.GreaterThanEqualsToken:
          if (this.forDisallowedESSymbolOperand(operator)) {
            leftType = getBaseTypeOfLiteralType(qf.type.check.nonNull(leftType, left));
            rightType = getBaseTypeOfLiteralType(qf.type.check.nonNull(rightType, right));
            reportOperatorErrorUnless(
              (left, right) =>
                qf.type.is.comparableTo(left, right) ||
                qf.type.is.comparableTo(right, left) ||
                (qf.type.is.assignableTo(left, numberOrBigIntType) && qf.type.is.assignableTo(right, numberOrBigIntType))
            );
          }
          return booleanType;
        case Syntax.Equals2Token:
        case Syntax.ExclamationEqualsToken:
        case Syntax.Equals3Token:
        case Syntax.ExclamationEquals2Token:
          reportOperatorErrorUnless((left, right) => isTypeEqualityComparableTo(left, right) || isTypeEqualityComparableTo(right, left));
          return booleanType;
        case Syntax.InstanceOfKeyword:
          return this.instanceOfExpression(left, right, leftType, rightType);
        case Syntax.InKeyword:
          return this.inExpression(left, right, leftType, rightType);
        case Syntax.Ampersand2Token:
          return getTypeFacts(leftType) & TypeFacts.Truthy ? qf.get.unionType([extractDefinitelyFalsyTypes(strictNullChecks ? leftType : getBaseTypeOfLiteralType(rightType)), rightType]) : leftType;
        case Syntax.Bar2Token:
          return getTypeFacts(leftType) & TypeFacts.Falsy ? qf.get.unionType([removeDefinitelyFalsyTypes(leftType), rightType], qt.UnionReduction.Subtype) : leftType;
        case Syntax.Question2Token:
          return getTypeFacts(leftType) & TypeFacts.EQUndefinedOrNull ? qf.get.unionType([getNonNullableType(leftType), rightType], qt.UnionReduction.Subtype) : leftType;
        case Syntax.EqualsToken:
          const declKind = left.parent.kind === Syntax.BinaryExpression ? qf.get.assignmentDeclarationKind(left.parent) : qt.AssignmentDeclarationKind.None;
          this.assignmentDeclaration(declKind, rightType);
          if (qf.is.assignmentDeclaration(declKind)) {
            if (
              !(rightType.flags & TypeFlags.Object) ||
              (declKind !== qt.AssignmentDeclarationKind.ModuleExports &&
                declKind !== qt.AssignmentDeclarationKind.Prototype &&
                !qf.type.is.emptyObject(rightType) &&
                !qf.is.functionObjectType(rightType as qt.ObjectType) &&
                !(getObjectFlags(rightType) & ObjectFlags.Class))
            ) {
              this.assignmentOperator(rightType);
            }
            return leftType;
          } else {
            this.assignmentOperator(rightType);
            return getRegularTypeOfObjectLiteral(rightType);
          }
        case Syntax.CommaToken:
          if (!compilerOpts.allowUnreachableCode && isSideEffectFree(left) && !isEvalNode(right)) error(left, qd.msgs.Left_side_of_comma_operator_is_unused_and_has_no_side_effects);
          return rightType;
        default:
          return qu.fail();
      }
      function bothAreBigIntLike(left: qt.Type, right: qt.Type): boolean {
        return qf.type.is.assignableToKind(left, TypeFlags.BigIntLike) && qf.type.is.assignableToKind(right, TypeFlags.BigIntLike);
      }
      function checkAssignmentDeclaration(kind: qt.AssignmentDeclarationKind, rightType: qt.Type) {
        if (kind === qt.AssignmentDeclarationKind.ModuleExports) {
          for (const prop of getPropertiesOfObjectType(rightType)) {
            const propType = prop.typeOfSymbol();
            if (propType.symbol && propType.symbol.flags & qt.SymbolFlags.Class) {
              const name = prop.escName;
              const symbol = resolveName(prop.valueDeclaration, name, qt.SymbolFlags.Type, undefined, name, false);
              if (symbol && symbol.declarations.some(isDocTypedefTag)) {
                addDuplicateDeclarationErrorsForSymbols(symbol, qd.msgs.Duplicate_identifier_0, qy.get.unescUnderscores(name), prop);
                addDuplicateDeclarationErrorsForSymbols(prop, qd.msgs.Duplicate_identifier_0, qy.get.unescUnderscores(name), symbol);
              }
            }
          }
        }
      }
      function isEvalNode(n: qt.Expression) {
        return n.kind === Syntax.qc.Identifier && (n as qc.Identifier).escapedText === 'eval';
      }
      function checkForDisallowedESSymbolOperand(operator: Syntax): boolean {
        const offendingSymbolOperand = maybeTypeOfKind(leftType, TypeFlags.ESSymbolLike) ? left : maybeTypeOfKind(rightType, TypeFlags.ESSymbolLike) ? right : undefined;
        if (offendingSymbolOperand) {
          error(offendingSymbolOperand, qd.msgs.The_0_operator_cannot_be_applied_to_type_symbol, qt.Token.toString(operator));
          return false;
        }
        return true;
      }
      function getSuggestedBooleanOperator(operator: Syntax): Syntax | undefined {
        switch (operator) {
          case Syntax.BarToken:
          case Syntax.BarEqualsToken:
            return Syntax.Bar2Token;
          case Syntax.CaretToken:
          case Syntax.CaretEqualsToken:
            return Syntax.ExclamationEquals2Token;
          case Syntax.AmpersandToken:
          case Syntax.AmpersandEqualsToken:
            return Syntax.Ampersand2Token;
          default:
            return;
        }
      }
      function checkAssignmentOperator(valueType: qt.Type): void {
        if (produceDiagnostics && qy.is.assignmentOperator(operator)) {
          if (
            this.referenceExpression(
              left,
              qd.msgs.The_left_hand_side_of_an_assignment_expression_must_be_a_variable_or_a_property_access,
              qd.msgs.The_left_hand_side_of_an_assignment_expression_may_not_be_an_optional_property_access
            ) &&
            (!left.kind === Syntax.Identifier || qy.get.unescUnderscores(left.escapedText) !== 'exports')
          ) {
            qf.type.check.assignableToAndOptionallyElaborate(valueType, leftType, left, right);
          }
        }
      }
      function isAssignmentDeclaration(kind: qt.AssignmentDeclarationKind) {
        switch (kind) {
          case qt.AssignmentDeclarationKind.ModuleExports:
            return true;
          case qt.AssignmentDeclarationKind.ExportsProperty:
          case qt.AssignmentDeclarationKind.Property:
          case qt.AssignmentDeclarationKind.Prototype:
          case qt.AssignmentDeclarationKind.PrototypeProperty:
          case qt.AssignmentDeclarationKind.ThisProperty:
            const symbol = qf.get.symbolOfNode(left);
            const init = qf.get.assignedExpandoIniter(right);
            return init && init.kind === Syntax.ObjectLiteralExpression && symbol && qu.hasEntries(symbol.exports);
          default:
            return false;
        }
      }
      function reportOperatorErrorUnless(typesAreCompatible: (left: qt.Type, right: qt.Type) => boolean): boolean {
        if (!typesAreCompatible(leftType, rightType)) {
          reportOperatorError(typesAreCompatible);
          return true;
        }
        return false;
      }
      function reportOperatorError(isRelated?: (left: qt.Type, right: qt.Type) => boolean) {
        let wouldWorkWithAwait = false;
        const errNode = errorNode || operatorToken;
        if (isRelated) {
          const awaitedLeftType = getAwaitedType(leftType);
          const awaitedRightType = getAwaitedType(rightType);
          wouldWorkWithAwait = !(awaitedLeftType === leftType && awaitedRightType === rightType) && !!(awaitedLeftType && awaitedRightType) && isRelated(awaitedLeftType, awaitedRightType);
        }
        let effectiveLeft = leftType;
        let effectiveRight = rightType;
        if (!wouldWorkWithAwait && isRelated) [effectiveLeft, effectiveRight] = getBaseTypesIfUnrelated(leftType, rightType, isRelated);
        const [leftStr, rightStr] = getTypeNamesForErrorDisplay(effectiveLeft, effectiveRight);
        if (!tryGiveBetterPrimaryError(errNode, wouldWorkWithAwait, leftStr, rightStr))
          errorAndMaybeSuggestAwait(errNode, wouldWorkWithAwait, qd.msgs.Operator_0_cannot_be_applied_to_types_1_and_2, qt.Token.toString(operatorToken.kind), leftStr, rightStr);
      }
      function tryGiveBetterPrimaryError(errNode: Node, maybeMissingAwait: boolean, leftStr: string, rightStr: string) {
        let typeName: string | undefined;
        switch (operatorToken.kind) {
          case Syntax.Equals3Token:
          case Syntax.Equals2Token:
            typeName = 'false';
            break;
          case Syntax.ExclamationEquals2Token:
          case Syntax.ExclamationEqualsToken:
            typeName = 'true';
        }
        if (typeName) return errorAndMaybeSuggestAwait(errNode, maybeMissingAwait, qd.msgs.This_condition_will_always_return_0_since_the_types_1_and_2_have_no_overlap, typeName, leftStr, rightStr);
        return;
      }
    }
    yieldExpression(n: qt.YieldExpression): qt.Type {
      if (produceDiagnostics) {
        if (!(n.flags & NodeFlags.YieldContext)) grammarErrorOnFirstToken(n, qd.msgs.A_yield_expression_is_only_allowed_in_a_generator_body);
        if (isInParamIniterBeforeContainingFunction(n)) error(n, qd.yield_expressions_cannot_be_used_in_a_param_initer);
      }
      const func = qf.get.containingFunction(n);
      if (!func) return anyType;
      const functionFlags = qf.get.functionFlags(func);
      if (!(functionFlags & FunctionFlags.Generator)) return anyType;
      const isAsync = (functionFlags & FunctionFlags.Async) !== 0;
      if (n.asteriskToken) {
        if (isAsync && languageVersion < qt.ScriptTarget.ESNext) this.externalEmitHelpers(n, ExternalEmitHelpers.AsyncDelegatorIncludes);
      }
      const returnType = getReturnTypeFromAnnotation(func);
      const iterationTypes = returnType && getIterationTypesOfGeneratorFunctionReturnType(returnType, isAsync);
      const signatureYieldType = (iterationTypes && iterationTypes.yieldType) || anyType;
      const signatureNextType = (iterationTypes && iterationTypes.nextType) || anyType;
      const resolvedSignatureNextType = isAsync ? getAwaitedType(signatureNextType) || anyType : signatureNextType;
      const yieldExpressionType = n.expression ? this.expression(n.expression) : undefinedWideningType;
      const yieldedType = getYieldedTypeOfYieldExpression(n, yieldExpressionType, resolvedSignatureNextType, isAsync);
      if (returnType && yieldedType) qf.type.check.assignableToAndOptionallyElaborate(yieldedType, signatureYieldType, n.expression || n, n.expression);
      if (n.asteriskToken) {
        const use = isAsync ? IterationUse.AsyncYieldStar : IterationUse.YieldStar;
        return getIterationTypeOfIterable(use, IterationTypeKind.Return, yieldExpressionType, n.expression) || anyType;
      } else if (returnType) {
        return getIterationTypeOfGeneratorFunctionReturnType(IterationTypeKind.Next, returnType, isAsync) || anyType;
      }
      return getContextualIterationType(IterationTypeKind.Next, func) || anyType;
    }
    conditionalExpression(n: qt.ConditionalExpression, checkMode?: CheckMode): qt.Type {
      const type = this.truthinessExpression(n.condition);
      this.testingKnownTruthyCallableType(n.condition, n.whenTrue, type);
      const type1 = this.expression(n.whenTrue, checkMode);
      const type2 = this.expression(n.whenFalse, checkMode);
      return qf.get.unionType([type1, type2], qt.UnionReduction.Subtype);
    }
    templateExpression(n: qt.TemplateExpression): qt.Type {
      forEach(n.templateSpans, (templateSpan) => {
        if (maybeTypeOfKind(this.expression(templateSpan.expression), TypeFlags.ESSymbolLike))
          error(templateSpan.expression, qd.msgs.Implicit_conversion_of_a_symbol_to_a_string_will_fail_at_runtime_Consider_wrapping_this_expression_in_String);
      });
      return stringType;
    }
    expressionWithContextualType(n: qt.Expression, contextualType: qt.Type, inferenceContext: qt.InferenceContext | undefined, checkMode: CheckMode): qt.Type {
      const context = getContextNode(n);
      const saveContextualType = context.contextualType;
      const saveInferenceContext = context.inferenceContext;
      try {
        context.contextualType = contextualType;
        context.inferenceContext = inferenceContext;
        const type = this.expression(n, checkMode | CheckMode.Contextual | (inferenceContext ? CheckMode.Inferential : 0));
        const result = maybeTypeOfKind(type, TypeFlags.Literal) && isLiteralOfContextualType(type, instantiateContextualType(contextualType, n)) ? getRegularTypeOfLiteralType(type) : type;
        return result;
      } finally {
        context.contextualType = saveContextualType;
        context.inferenceContext = saveInferenceContext;
      }
    }
    expressionCached(n: qt.Expression | qt.QualifiedName, checkMode?: CheckMode): qt.Type {
      const links = qf.get.nodeLinks(n);
      if (!links.resolvedType) {
        if (checkMode && checkMode !== CheckMode.Normal) return this.expression(n, checkMode);
        const saveFlowLoopStart = flowLoopStart;
        const saveFlowTypeCache = flowTypeCache;
        flowLoopStart = flowLoopCount;
        flowTypeCache = undefined;
        links.resolvedType = this.expression(n, checkMode);
        flowTypeCache = saveFlowTypeCache;
        flowLoopStart = saveFlowLoopStart;
      }
      return links.resolvedType;
    }
    declarationIniter(declaration: qt.HasExpressionIniter, contextualType?: qt.Type | undefined) {
      const initer = qf.get.effectiveIniter(declaration)!;
      const type = getQuickTypeOfExpression(initer) || (contextualType ? this.expressionWithContextualType(initer, contextualType, undefined, CheckMode.Normal) : this.expressionCached(initer));
      return declaration.kind === Syntax.ParamDeclaration &&
        declaration.name.kind === Syntax.ArrayBindingPattern &&
        qf.type.is.tuple(type) &&
        !type.target.hasRestElem &&
        getTypeReferenceArity(type) < declaration.name.elems.length
        ? padTupleType(type, declaration.name)
        : type;
    }
    expressionForMutableLocation(n: qt.Expression, checkMode: CheckMode | undefined, contextualType?: qt.Type, forceTuple?: boolean): qt.Type {
      const type = this.expression(n, checkMode, forceTuple);
      return isConstContext(n)
        ? getRegularTypeOfLiteralType(type)
        : n.kind === Syntax.TypeAssertion
        ? type
        : getWidenedLiteralLikeTypeForContextualType(type, instantiateContextualType(args.length === 2 ? getContextualType(n) : contextualType, n));
    }
    propertyAssignment(n: qt.PropertyAssignment, checkMode?: CheckMode): qt.Type {
      if (n.name.kind === Syntax.ComputedPropertyName) this.computedPropertyName(n.name);
      return this.expressionForMutableLocation(n.initer, checkMode);
    }
    objectLiteralMethod(n: qt.MethodDeclaration, checkMode?: CheckMode): qt.Type {
      checkGrammar.method(n);
      if (n.name.kind === Syntax.ComputedPropertyName) this.computedPropertyName(n.name);
      const uninstantiatedType = this.functionExpressionOrObjectLiteralMethod(n, checkMode);
      return instantiateTypeWithSingleGenericCallSignature(n, uninstantiatedType, checkMode);
    }
    expression(n: qt.Expression | qt.QualifiedName, checkMode?: CheckMode, forceTuple?: boolean): qt.Type {
      const saveCurrentNode = currentNode;
      currentNode = n;
      instantiationCount = 0;
      const uninstantiatedType = this.expressionWorker(n, checkMode, forceTuple);
      const type = instantiateTypeWithSingleGenericCallSignature(n, uninstantiatedType, checkMode);
      if (isConstEnumObjectType(type)) this.constEnumAccess(n, type);
      currentNode = saveCurrentNode;
      return type;
    }
    constEnumAccess(n: qt.Expression | qt.QualifiedName, type: qt.Type) {
      const ok =
        (n.parent.kind === Syntax.PropertyAccessExpression && (<qt.PropertyAccessExpression>n.parent).expression === n) ||
        (n.parent.kind === Syntax.ElemAccessExpression && (<qt.ElemAccessExpression>n.parent).expression === n) ||
        ((n.kind === Syntax.qc.Identifier || n.kind === Syntax.QualifiedName) && isInRightSideOfImportOrExportAssignment(<qc.Identifier>n)) ||
        (n.parent.kind === Syntax.TypingQuery && (<qt.TypingQuery>n.parent).exprName === n) ||
        n.parent.kind === Syntax.ExportSpecifier;
      if (!ok) error(n, qd.const_enums_can_only_be_used_in_property_or_index_access_expressions_or_the_right_hand_side_of_an_import_declaration_or_export_assignment_or_type_query);
      if (compilerOpts.isolatedModules) {
        qf.assert.true(!!(type.symbol.flags & qt.SymbolFlags.ConstEnum));
        const constEnumDeclaration = type.symbol.valueDeclaration as qt.EnumDeclaration;
        if (constEnumDeclaration.flags & NodeFlags.Ambient) error(n, qd.msgs.Cannot_access_ambient_const_enums_when_the_isolatedModules_flag_is_provided);
      }
    }
    parenthesizedExpression(n: qt.ParenthesizedExpression, checkMode?: CheckMode): qt.Type {
      const tag = qf.is.inJSFile(n) ? qf.get.doc.typeTag(n) : undefined;
      if (tag) return this.assertionWorker(tag, tag.typeExpression.type, n.expression, checkMode);
      return this.expression(n.expression, checkMode);
    }
    expressionWorker(n: qt.Expression | qt.QualifiedName, checkMode: CheckMode | undefined, forceTuple?: boolean): qt.Type {
      const kind = n.kind;
      if (cancellationToken) {
        switch (kind) {
          case Syntax.ClassExpression:
          case Syntax.FunctionExpression:
          case Syntax.ArrowFunction:
            cancellationToken.throwIfCancellationRequested();
        }
      }
      switch (kind) {
        case Syntax.qc.Identifier:
          return this.identifier(<qc.Identifier>n);
        case Syntax.ThisKeyword:
          return this.thisNodeExpression(n);
        case Syntax.SuperKeyword:
          return this.superExpression(n);
        case Syntax.NullKeyword:
          return nullWideningType;
        case Syntax.NoSubstitutionLiteral:
        case Syntax.StringLiteral:
          return getFreshTypeOfLiteralType(qf.get.literalType((n as qt.StringLiteralLike).text));
        case Syntax.NumericLiteral:
          checkGrammar.numericLiteral(n as qt.NumericLiteral);
          return getFreshTypeOfLiteralType(qf.get.literalType(+(n as qt.NumericLiteral).text));
        case Syntax.BigIntLiteral:
          checkGrammar.bigIntLiteral(n as qt.BigIntLiteral);
          return getFreshTypeOfLiteralType(getBigIntLiteralType(n as qt.BigIntLiteral));
        case Syntax.TrueKeyword:
          return trueType;
        case Syntax.FalseKeyword:
          return falseType;
        case Syntax.TemplateExpression:
          return this.templateExpression(<qt.TemplateExpression>n);
        case Syntax.RegexLiteral:
          return globalRegExpType;
        case Syntax.ArrayLiteralExpression:
          return this.arrayLiteral(<qt.ArrayLiteralExpression>n, checkMode, forceTuple);
        case Syntax.ObjectLiteralExpression:
          return this.objectLiteral(<qt.ObjectLiteralExpression>n, checkMode);
        case Syntax.PropertyAccessExpression:
          return this.propertyAccessExpression(<qt.PropertyAccessExpression>n);
        case Syntax.QualifiedName:
          return this.qualifiedName(<qt.QualifiedName>n);
        case Syntax.ElemAccessExpression:
          return this.indexedAccess(<qt.ElemAccessExpression>n);
        case Syntax.CallExpression:
          if ((<qt.CallExpression>n).expression.kind === Syntax.ImportKeyword) return this.importCallExpression(<qt.ImportCall>n);
        case Syntax.NewExpression:
          return this.callExpression(<qt.CallExpression>n, checkMode);
        case Syntax.TaggedTemplateExpression:
          return this.taggedTemplateExpression(<qt.TaggedTemplateExpression>n);
        case Syntax.ParenthesizedExpression:
          return this.parenthesizedExpression(<qt.ParenthesizedExpression>n, checkMode);
        case Syntax.ClassExpression:
          return this.classExpression(<qt.ClassExpression>n);
        case Syntax.FunctionExpression:
        case Syntax.ArrowFunction:
          return this.functionExpressionOrObjectLiteralMethod(<qt.FunctionExpression | qt.ArrowFunction>n, checkMode);
        case Syntax.TypeOfExpression:
          return this.typeOfExpression(<qt.TypeOfExpression>n);
        case Syntax.TypeAssertionExpression:
        case Syntax.AsExpression:
          return this.assertion(<qt.AssertionExpression>n);
        case Syntax.NonNullExpression:
          return this.nonNullAssertion(<qt.NonNullExpression>n);
        case Syntax.MetaProperty:
          return this.metaProperty(<qt.MetaProperty>n);
        case Syntax.DeleteExpression:
          return this.deleteExpression(<qt.DeleteExpression>n);
        case Syntax.VoidExpression:
          return this.voidExpression(<qt.VoidExpression>n);
        case Syntax.AwaitExpression:
          return this.awaitExpression(<qt.AwaitExpression>n);
        case Syntax.PrefixUnaryExpression:
          return this.prefixUnaryExpression(<qt.PrefixUnaryExpression>n);
        case Syntax.PostfixUnaryExpression:
          return this.postfixUnaryExpression(<qt.PostfixUnaryExpression>n);
        case Syntax.BinaryExpression:
          return this.binaryExpression(<qt.BinaryExpression>n, checkMode);
        case Syntax.ConditionalExpression:
          return this.conditionalExpression(<qt.ConditionalExpression>n, checkMode);
        case Syntax.SpreadElem:
          return this.spreadExpression(<qt.SpreadElem>n, checkMode);
        case Syntax.OmittedExpression:
          return undefinedWideningType;
        case Syntax.YieldExpression:
          return this.yieldExpression(<qt.YieldExpression>n);
        case Syntax.SyntheticExpression:
          return (<qt.SyntheticExpression>n).type;
        case Syntax.JsxExpression:
          return this.jsxExpression(<qt.JsxExpression>n, checkMode);
        case Syntax.JsxElem:
          return this.jsxElem(<qt.JsxElem>n, checkMode);
        case Syntax.JsxSelfClosingElem:
          return this.jsxSelfClosingElem(<qt.JsxSelfClosingElem>n, checkMode);
        case Syntax.JsxFragment:
          return this.jsxFragment(<qt.JsxFragment>n);
        case Syntax.JsxAttributes:
          return this.jsxAttributes(<qt.JsxAttributes>n, checkMode);
        case Syntax.JsxOpeningElem:
          qu.fail("Shouldn't ever directly check a qt.JsxOpeningElem");
      }
      return errorType;
    }
    typeParam(n: qt.TypeParamDeclaration) {
      if (n.expression) grammarErrorOnFirstToken(n.expression, qd.msgs.Type_expected);
      this.sourceElem(n.constraint);
      this.sourceElem(n.default);
      const typeParam = getDeclaredTypeOfTypeParam(qf.get.symbolOfNode(n));
      qf.get.baseConstraintOfType(typeParam);
      if (!hasNonCircularTypeParamDefault(typeParam)) error(n.default, qd.msgs.Type_param_0_has_a_circular_default, typeToString(typeParam));
      const constraintType = qf.get.constraintOfTypeParam(typeParam);
      const defaultType = getDefaultFromTypeParam(typeParam);
      if (constraintType && defaultType) {
        qf.type.check.assignableTo(
          defaultType,
          qf.get.typeWithThisArg(instantiateType(constraintType, makeUnaryTypeMapper(typeParam, defaultType)), defaultType),
          n.default,
          qd.msgs.Type_0_does_not_satisfy_the_constraint_1
        );
      }
      if (produceDiagnostics) this.typeNameIsReserved(n.name, qd.msgs.Type_param_name_cannot_be_0);
    }
    param(n: qt.ParamDeclaration) {
      checkGrammar.decoratorsAndModifiers(n);
      this.variableLikeDeclaration(n);
      const func = qf.get.containingFunction(n)!;
      if (qf.has.syntacticModifier(n, ModifierFlags.ParamPropertyModifier)) {
        if (!(func.kind === Syntax.Constructor && qf.is.present(func.body))) error(n, qd.msgs.A_param_property_is_only_allowed_in_a_constructor_implementation);
        if (func.kind === Syntax.Constructor && n.name.kind === Syntax.Identifier && n.name.escapedText === 'constructor') error(n.name, qd.constructor_cannot_be_used_as_a_param_property_name);
      }
      if (n.questionToken && n.name.kind === Syntax.BindingPattern && (func as qt.FunctionLikeDeclaration).body)
        error(n, qd.msgs.A_binding_pattern_param_cannot_be_optional_in_an_implementation_signature);
      if (n.name && n.name.kind === Syntax.Identifier && (n.name.escapedText === 'this' || n.name.escapedText === 'new')) {
        if (func.params.indexOf(n) !== 0) error(n, qd.msgs.A_0_param_must_be_the_first_param, n.name.escapedText as string);
        if (func.kind === Syntax.Constructor || func.kind === Syntax.ConstructSignature || func.kind === Syntax.ConstructorTyping) error(n, qd.msgs.A_constructor_cannot_have_a_this_param);
        if (func.kind === Syntax.ArrowFunction) error(n, qd.msgs.An_arrow_function_cannot_have_a_this_param);
        if (func.kind === Syntax.GetAccessor || func.kind === Syntax.SetAccessor) error(n, qd.get_and_set_accessors_cannot_declare_this_params);
      }
      if (n.dot3Token && !n.name.kind === Syntax.BindingPattern && !qf.type.is.assignableTo(getReducedType(n.symbol.typeOfSymbol()), anyReadonlyArrayType))
        error(n, qd.msgs.A_rest_param_must_be_of_an_array_type);
    }
    typePredicate(n: qt.TypingPredicate): void {
      const parent = getTypePredicateParent(n);
      if (!parent) {
        error(n, qd.msgs.A_type_predicate_is_only_allowed_in_return_type_position_for_functions_and_methods);
        return;
      }
      const signature = qf.get.signatureFromDeclaration(parent);
      const typePredicate = getTypePredicateOfSignature(signature);
      if (!typePredicate) return;
      this.sourceElem(n.type);
      const { paramName } = n;
      if (typePredicate.kind === qt.TypePredicateKind.This || typePredicate.kind === qt.TypePredicateKind.AssertsThis) getTypeFromThisNodeTypeNode(paramName as qt.ThisTyping);
      else {
        if (typePredicate.paramIndex >= 0) {
          if (signature.hasRestParam() && typePredicate.paramIndex === signature.params.length - 1) error(paramName, qd.msgs.A_type_predicate_cannot_reference_a_rest_param);
          else {
            if (typePredicate.type) {
              const leadingError = () => chainqd.Messages(undefined, qd.msgs.A_type_predicate_s_type_must_be_assignable_to_its_param_s_type);
              qf.type.check.assignableTo(typePredicate.type, signature.params[typePredicate.paramIndex].typeOfSymbol(), n.type, undefined, leadingError);
            }
          }
        } else if (paramName) {
          let hasReportedError = false;
          for (const { name } of parent.params) {
            if (name.kind === Syntax.BindingPattern && this.ifTypePredicateVariableIsDeclaredInBindingPattern(name, paramName, typePredicate.paramName)) {
              hasReportedError = true;
              break;
            }
          }
          if (!hasReportedError) error(n.paramName, qd.msgs.Cannot_find_param_0, typePredicate.paramName);
        }
      }
    }
    ifTypePredicateVariableIsDeclaredInBindingPattern(pattern: qt.BindingPattern, predicateVariableNode: Node, predicateVariableName: string) {
      for (const elem of pattern.elems) {
        if (elem.kind === Syntax.OmittedExpression) continue;
        const name = elem.name;
        if (name.kind === Syntax.qc.Identifier && name.escapedText === predicateVariableName) {
          error(predicateVariableNode, qd.msgs.A_type_predicate_cannot_reference_elem_0_in_a_binding_pattern, predicateVariableName);
          return true;
        } else if (name.kind === Syntax.ArrayBindingPattern || name.kind === Syntax.ObjectBindingPattern) {
          if (this.ifTypePredicateVariableIsDeclaredInBindingPattern(name, predicateVariableNode, predicateVariableName)) return true;
        }
      }
    }
    signatureDeclaration(n: qt.SignatureDeclaration) {
      if (n.kind === Syntax.IndexSignature) checkGrammar.indexSignature(<qt.SignatureDeclaration>n);
      else if (
        n.kind === Syntax.FunctionTyping ||
        n.kind === Syntax.FunctionDeclaration ||
        n.kind === Syntax.ConstructorTyping ||
        n.kind === Syntax.CallSignature ||
        n.kind === Syntax.Constructor ||
        n.kind === Syntax.ConstructSignature
      ) {
        checkGrammar.functionLikeDeclaration(<qt.FunctionLikeDeclaration>n);
      }
      const functionFlags = qf.get.functionFlags(<qt.FunctionLikeDeclaration>n);
      if (!(functionFlags & FunctionFlags.Invalid)) {
        if ((functionFlags & FunctionFlags.AsyncGenerator) === FunctionFlags.AsyncGenerator && languageVersion < qt.ScriptTarget.ESNext)
          this.externalEmitHelpers(n, ExternalEmitHelpers.AsyncGeneratorIncludes);
      }
      this.typeParams(n.typeParams);
      forEach(n.params, checkParam);
      if (n.type) this.sourceElem(n.type);
      if (produceDiagnostics) {
        this.collisionWithArgsInGeneratedCode(n);
        const returnTypeNode = qf.get.effectiveReturnTypeNode(n);
        if (noImplicitAny && !returnTypeNode) {
          switch (n.kind) {
            case Syntax.ConstructSignature:
              error(n, qd.msgs.Construct_signature_which_lacks_return_type_annotation_implicitly_has_an_any_return_type);
              break;
            case Syntax.CallSignature:
              error(n, qd.msgs.Call_signature_which_lacks_return_type_annotation_implicitly_has_an_any_return_type);
              break;
          }
        }
        if (returnTypeNode) {
          const functionFlags = qf.get.functionFlags(<qt.FunctionDeclaration>n);
          if ((functionFlags & (FunctionFlags.Invalid | FunctionFlags.Generator)) === FunctionFlags.Generator) {
            const returnType = qf.get.typeFromTypeNode(returnTypeNode);
            if (returnType === voidType) error(returnTypeNode, qd.msgs.A_generator_cannot_have_a_void_type_annotation);
            else {
              const generatorYieldType = getIterationTypeOfGeneratorFunctionReturnType(IterationTypeKind.Yield, returnType, (functionFlags & FunctionFlags.Async) !== 0) || anyType;
              const generatorReturnType = getIterationTypeOfGeneratorFunctionReturnType(IterationTypeKind.Return, returnType, (functionFlags & FunctionFlags.Async) !== 0) || generatorYieldType;
              const generatorNextType = getIterationTypeOfGeneratorFunctionReturnType(IterationTypeKind.Next, returnType, (functionFlags & FunctionFlags.Async) !== 0) || unknownType;
              const generatorInstantiation = createGeneratorReturnType(generatorYieldType, generatorReturnType, generatorNextType, !!(functionFlags & FunctionFlags.Async));
              qf.type.check.assignableTo(generatorInstantiation, returnType, returnTypeNode);
            }
          } else if ((functionFlags & FunctionFlags.AsyncGenerator) === FunctionFlags.Async) {
            this.asyncFunctionReturnType(<qt.FunctionLikeDeclaration>n, returnTypeNode);
          }
        }
        if (n.kind !== Syntax.IndexSignature && n.kind !== Syntax.DocFunctionTyping) registerForUnusedIdentifiersCheck(n);
      }
    }
    classForDuplicateDeclarations(n: qt.ClassLikeDeclaration) {
      const instanceNames = qu.createEscapedMap<DeclarationMeaning>();
      const staticNames = qu.createEscapedMap<DeclarationMeaning>();
      const privateIdentifiers = qu.createEscapedMap<DeclarationMeaning>();
      for (const member of n.members) {
        if (member.kind === Syntax.Constructor) {
          for (const param of (member as qt.ConstructorDeclaration).params) {
            if (qf.is.paramPropertyDeclaration(param, member) && !param.name.kind === Syntax.BindingPattern)
              addName(instanceNames, param.name, param.name.escapedText, DeclarationMeaning.GetOrSetAccessor);
          }
        } else {
          const isStatic = qf.has.syntacticModifier(member, ModifierFlags.Static);
          const name = member.name;
          if (!name) return;
          const names = name.kind === Syntax.PrivateIdentifier ? privateIdentifiers : isStatic ? staticNames : instanceNames;
          const memberName = name && qf.get.propertyNameForPropertyNameNode(name);
          if (memberName) {
            switch (member.kind) {
              case Syntax.GetAccessor:
                addName(names, name, memberName, DeclarationMeaning.GetAccessor);
                break;
              case Syntax.SetAccessor:
                addName(names, name, memberName, DeclarationMeaning.SetAccessor);
                break;
              case Syntax.PropertyDeclaration:
                addName(names, name, memberName, DeclarationMeaning.GetOrSetAccessor);
                break;
              case Syntax.MethodDeclaration:
                addName(names, name, memberName, DeclarationMeaning.Method);
                break;
            }
          }
        }
      }
      function addName(names: EscapedMap<DeclarationMeaning>, location: Node, name: qu.__String, meaning: DeclarationMeaning) {
        const prev = names.get(name);
        if (prev) {
          if (prev & DeclarationMeaning.Method) {
            if (meaning !== DeclarationMeaning.Method) error(location, qd.msgs.Duplicate_identifier_0, qf.get.textOf(location));
          } else if (prev & meaning) {
            error(location, qd.msgs.Duplicate_identifier_0, qf.get.textOf(location));
          } else {
            names.set(name, prev | meaning);
          }
        } else {
          names.set(name, meaning);
        }
      }
    }
    classForStaticPropertyNameConflicts(n: qt.ClassLikeDeclaration) {
      for (const member of n.members) {
        const memberNameNode = member.name;
        const isStatic = qf.has.syntacticModifier(member, ModifierFlags.Static);
        if (isStatic && memberNameNode) {
          const memberName = qf.get.propertyNameForPropertyNameNode(memberNameNode);
          switch (memberName) {
            case 'name':
            case 'length':
            case 'caller':
            case 'args':
            case 'prototype':
              const message = qd.msgs.Static_property_0_conflicts_with_built_in_property_Function_0_of_constructor_function_1;
              const className = getNameOfSymbolAsWritten(qf.get.symbolOfNode(n));
              error(memberNameNode, message, memberName, className);
              break;
          }
        }
      }
    }
    objectTypeForDuplicateDeclarations(n: qt.TypingLiteral | qt.InterfaceDeclaration) {
      const names = new qu.QMap<boolean>();
      for (const member of n.members) {
        if (member.kind === Syntax.PropertySignature) {
          let memberName: string;
          const name = member.name!;
          switch (name.kind) {
            case Syntax.StringLiteral:
            case Syntax.NumericLiteral:
              memberName = name.text;
              break;
            case Syntax.qc.Identifier:
              memberName = idText(name);
              break;
            default:
              continue;
          }
          if (names.get(memberName)) {
            error(qf.decl.nameOf(member.symbol.valueDeclaration), qd.msgs.Duplicate_identifier_0, memberName);
            error(member.name, qd.msgs.Duplicate_identifier_0, memberName);
          } else {
            names.set(memberName, true);
          }
        }
      }
    }
    typeForDuplicateIndexSignatures(n: Node) {
      if (n.kind === Syntax.InterfaceDeclaration) {
        const nodeSymbol = qf.get.symbolOfNode(n as qt.InterfaceDeclaration);
        if (nodeSymbol.declarations.length > 0 && nodeSymbol.declarations[0] !== n) return;
      }
      const indexSymbol = getIndexSymbol(qf.get.symbolOfNode(n)!);
      if (indexSymbol) {
        let seenNumericIndexer = false;
        let seenStringIndexer = false;
        for (const decl of indexSymbol.declarations) {
          const declaration = <qt.SignatureDeclaration>decl;
          if (declaration.params.length === 1 && declaration.params[0].type) {
            switch (declaration.params[0].type.kind) {
              case Syntax.StringKeyword:
                if (!seenStringIndexer) seenStringIndexer = true;
                else {
                  error(declaration, qd.msgs.Duplicate_string_index_signature);
                }
                break;
              case Syntax.NumberKeyword:
                if (!seenNumericIndexer) seenNumericIndexer = true;
                else {
                  error(declaration, qd.msgs.Duplicate_number_index_signature);
                }
                break;
            }
          }
        }
      }
    }
    propertyDeclaration(n: qt.PropertyDeclaration | qt.PropertySignature) {
      if (!checkGrammar.decoratorsAndModifiers(n) && !checkGrammar.property(n)) checkGrammar.computedPropertyName(n.name);
      this.variableLikeDeclaration(n);
      if (n.name.kind === Syntax.PrivateIdentifier && languageVersion < qt.ScriptTarget.ESNext) {
        for (let lexicalScope = qf.get.enclosingBlockScopeContainer(n); !!lexicalScope; lexicalScope = qf.get.enclosingBlockScopeContainer(lexicalScope)) {
          qf.get.nodeLinks(lexicalScope).flags |= NodeCheckFlags.ContainsClassWithPrivateIdentifiers;
        }
      }
    }
    propertySignature(n: qt.PropertySignature) {
      if (n.name.kind === Syntax.PrivateIdentifier) error(n, qd.msgs.Private_identifiers_are_not_allowed_outside_class_bodies);
      return this.propertyDeclaration(n);
    }
    methodDeclaration(n: qt.MethodDeclaration | qt.MethodSignature) {
      if (!checkGrammar.method(n)) checkGrammar.computedPropertyName(n.name);
      if (n.name.kind === Syntax.PrivateIdentifier) error(n, qd.msgs.A_method_cannot_be_named_with_a_private_identifier);
      this.functionOrMethodDeclaration(n);
      if (qf.has.syntacticModifier(n, ModifierFlags.Abstract) && n.kind === Syntax.MethodDeclaration && n.body)
        error(n, qd.msgs.Method_0_cannot_have_an_implementation_because_it_is_marked_abstract, declarationNameToString(n.name));
    }
    constructorDeclaration(n: qt.ConstructorDeclaration) {
      this.signatureDeclaration(n);
      if (!checkGrammar.constructorTypeParams(n)) checkGrammar.constructorTypeAnnotation(n);
      this.sourceElem(n.body);
      const symbol = qf.get.symbolOfNode(n);
      const firstDeclaration = symbol.declarationOfKind(n.kind);
      if (n === firstDeclaration) this.functionOrConstructorSymbol(symbol);
      if (qf.is.missing(n.body)) return;
      if (!produceDiagnostics) return;
      function isInstancePropertyWithIniterOrPrivateIdentifierProperty(x: Node) {
        if (qf.is.privateIdentifierPropertyDeclaration(x)) return true;
        return x.kind === Syntax.PropertyDeclaration && !qf.has.syntacticModifier(x, ModifierFlags.Static) && !!(<qt.PropertyDeclaration>x).initer;
      }
      const containingClassDecl = <qt.ClassDeclaration>n.parent;
      if (qf.get.classExtendsHeritageElem(containingClassDecl)) {
        captureLexicalThis(n.parent, containingClassDecl);
        const classExtendsNull = classDeclarationExtendsNull(containingClassDecl);
        const superCall = findFirstSuperCall(n.body!);
        if (superCall) {
          if (classExtendsNull) error(superCall, qd.msgs.A_constructor_cannot_contain_a_super_call_when_its_class_extends_null);
          const superCallShouldBeFirst =
            (compilerOpts.target !== qt.ScriptTarget.ESNext || !compilerOpts.useDefineForClassFields) &&
            (qu.some((<qt.ClassDeclaration>n.parent).members, isInstancePropertyWithIniterOrPrivateIdentifierProperty) ||
              some(n.params, (p) => qf.has.syntacticModifier(p, ModifierFlags.ParamPropertyModifier)));
          if (superCallShouldBeFirst) {
            const statements = n.body!.statements;
            let superCallStatement: qt.ExpressionStatement | undefined;
            for (const statement of statements) {
              if (statement.kind === Syntax.ExpressionStatement && qf.is.superCall((<qt.ExpressionStatement>statement).expression)) {
                superCallStatement = <qt.ExpressionStatement>statement;
                break;
              }
              if (!qf.is.prologueDirective(statement)) break;
            }
            if (!superCallStatement) error(n, qd.msgs.A_super_call_must_be_the_first_statement_in_the_constructor_when_a_class_contains_initialized_properties_param_properties_or_private_identifiers);
          }
        } else if (!classExtendsNull) {
          error(n, qd.msgs.Constructors_for_derived_classes_must_contain_a_super_call);
        }
      }
    }
    accessorDeclaration(n: qt.AccessorDeclaration) {
      if (produceDiagnostics) {
        if (!checkGrammar.functionLikeDeclaration(n) && !checkGrammar.accessor(n)) checkGrammar.computedPropertyName(n.name);
        this.decorators(n);
        this.signatureDeclaration(n);
        if (n.kind === Syntax.GetAccessor) {
          if (!(n.flags & NodeFlags.Ambient) && qf.is.present(n.body) && n.flags & NodeFlags.HasImplicitReturn) {
            if (!(n.flags & NodeFlags.HasExplicitReturn)) error(n.name, qd.msgs.A_get_accessor_must_return_a_value);
          }
        }
        if (n.name.kind === Syntax.ComputedPropertyName) this.computedPropertyName(n.name);
        if (n.name.kind === Syntax.PrivateIdentifier) error(n.name, qd.msgs.An_accessor_cannot_be_named_with_a_private_identifier);
        if (!hasNonBindableDynamicName(n)) {
          const otherKind = n.kind === Syntax.GetAccessor ? Syntax.SetAccessor : Syntax.GetAccessor;
          const otherAccessor = qf.get.symbolOfNode(n).declarationOfKind<qt.AccessorDeclaration>(otherKind);
          if (otherAccessor) {
            const nodeFlags = qf.get.effectiveModifierFlags(n);
            const otherFlags = qf.get.effectiveModifierFlags(otherAccessor);
            if ((nodeFlags & ModifierFlags.AccessibilityModifier) !== (otherFlags & ModifierFlags.AccessibilityModifier)) error(n.name, qd.msgs.Getter_and_setter_accessors_do_not_agree_in_visibility);
            if ((nodeFlags & ModifierFlags.Abstract) !== (otherFlags & ModifierFlags.Abstract)) error(n.name, qd.msgs.Accessors_must_both_be_abstract_or_non_abstract);
            this.accessorDeclarationTypesIdentical(n, otherAccessor, getAnnotatedAccessorType, qd.get_and_set_accessor_must_have_the_same_type);
            this.accessorDeclarationTypesIdentical(n, otherAccessor, getThisTypeOfDeclaration, qd.get_and_set_accessor_must_have_the_same_this_type);
          }
        }
        const returnType = getTypeOfAccessors(qf.get.symbolOfNode(n));
        if (n.kind === Syntax.GetAccessor) this.allCodePathsInNonVoidFunctionReturnOrThrow(n, returnType);
      }
      this.sourceElem(n.body);
    }
    accessorDeclarationTypesIdentical(first: qt.AccessorDeclaration, second: qt.AccessorDeclaration, getAnnotatedType: (a: qt.AccessorDeclaration) => qt.Type | undefined, message: qd.Message) {
      const firstType = getAnnotatedType(first);
      const secondType = getAnnotatedType(second);
      if (firstType && secondType && !qf.type.is.identicalTo(firstType, secondType)) error(first, message);
    }
    missingDeclaration(n: Node) {
      this.decorators(n);
    }
    typeArgConstraints(n: qt.TypingReference | qt.ExpressionWithTypings, typeParams: readonly qt.TypeParam[]): boolean {
      let typeArgs: qt.Type[] | undefined;
      let mapper: qt.TypeMapper | undefined;
      let result = true;
      for (let i = 0; i < typeParams.length; i++) {
        const constraint = qf.get.constraintOfTypeParam(typeParams[i]);
        if (constraint) {
          if (!typeArgs) {
            typeArgs = getEffectiveTypeArgs(n, typeParams);
            mapper = createTypeMapper(typeParams, typeArgs);
          }
          result = result && qf.type.check.assignableTo(typeArgs[i], instantiateType(constraint, mapper), n.typeArgs![i], qd.msgs.Type_0_does_not_satisfy_the_constraint_1);
        }
      }
      return result;
    }
    typeReferenceNode(n: qt.TypingReference | qt.ExpressionWithTypings) {
      checkGrammar.typeArgs(n, n.typeArgs);
      if (n.kind === Syntax.TypingReference && n.typeName.jsdocDotPos !== undefined && !qf.is.inJSFile(n) && !qf.is.inDoc(n))
        grammarErrorAtPos(n, n.typeName.jsdocDotPos, 1, qd.msgs.Doc_types_can_only_be_used_inside_documentation_comments);
      forEach(n.typeArgs, checkSourceElem);
      const type = getTypeFromTypeReference(n);
      if (type !== errorType) {
        if (n.typeArgs && produceDiagnostics) {
          const typeParams = getTypeParamsForTypeReference(n);
          if (typeParams) this.typeArgConstraints(n, typeParams);
        }
        if (type.flags & TypeFlags.Enum && qf.get.nodeLinks(n).resolvedSymbol!.flags & qt.SymbolFlags.EnumMember)
          error(n, qd.msgs.Enum_type_0_has_members_with_initers_that_are_not_literals, typeToString(type));
      }
    }
    typeQuery(n: qt.TypingQuery) {
      getTypeFromTypingQuery(n);
    }
    typeLiteral(n: qt.TypingLiteral) {
      forEach(n.members, checkSourceElem);
      if (produceDiagnostics) {
        const type = getTypeFromTypeLiteralOrFunctionOrConstructorTyping(n);
        qf.type.check.qf.type.check.indexConstraints(type);
        this.typeForDuplicateIndexSignatures(n);
        this.objectTypeForDuplicateDeclarations(n);
      }
    }
    arrayType(n: qt.ArrayTyping) {
      this.sourceElem(n.elemType);
    }
    tupleType(n: qt.TupleTyping) {
      const elemTypes = n.elems;
      let seenOptionalElem = false;
      let seenNamedElem = false;
      for (let i = 0; i < elemTypes.length; i++) {
        const e = elemTypes[i];
        if (e.kind === Syntax.NamedTupleMember) seenNamedElem = true;
        else if (seenNamedElem) {
          grammarErrorOnNode(e, qd.msgs.Tuple_members_must_all_have_names_or_all_not_have_names);
          break;
        }
        if (isTupleRestElem(e)) {
          if (i !== elemTypes.length - 1) {
            grammarErrorOnNode(e, qd.msgs.A_rest_elem_must_be_last_in_a_tuple_type);
            break;
          }
          if (!qf.type.is.array(qf.get.typeFromTypeNode((<qt.RestTyping>e).type))) error(e, qd.msgs.A_rest_elem_type_must_be_an_array_type);
        } else if (isTupleOptionalElem(e)) {
          seenOptionalElem = true;
        } else if (seenOptionalElem) {
          grammarErrorOnNode(e, qd.msgs.A_required_elem_cannot_follow_an_optional_elem);
          break;
        }
      }
      forEach(n.elems, checkSourceElem);
    }
    unionOrIntersectionType(n: qt.UnionOrIntersectionTyping) {
      forEach(n.types, checkSourceElem);
    }
    indexedAccessType(n: qt.IndexedAccessTyping) {
      this.sourceElem(n.objectType);
      this.sourceElem(n.indexType);
      qf.type.check.indexedAccessIndex(getTypeFromIndexedAccessTyping(n), n);
    }
    mappedType(n: qt.MappedTyping) {
      this.sourceElem(n.typeParam);
      this.sourceElem(n.type);
      if (!n.type) reportImplicitAny(n, anyType);
      const type = <qt.MappedType>getTypeFromMappedTyping(n);
      const constraintType = getConstraintTypeFromMappedType(type);
      qf.type.check.assignableTo(constraintType, keyofConstraintType, qf.get.effectiveConstraintOfTypeParam(n.typeParam));
    }
    thisType(n: qt.ThisTyping) {
      getTypeFromThisNodeTypeNode(n);
    }
    typeOperator(n: qt.TypingOperator) {
      checkGrammar.typeOperatorNode(n);
      this.sourceElem(n.type);
    }
    conditionalType(n: qt.ConditionalTyping) {
      qf.each.child(n, checkSourceElem);
    }
    inferType(n: qt.InferTyping) {
      if (!qc.findAncestor(n, (x) => x.parent && x.parent.kind === Syntax.ConditionalTyping && (<qt.ConditionalTyping>x.parent).extendsType === x))
        grammarErrorOnNode(n, qd.infer_declarations_are_only_permitted_in_the_extends_clause_of_a_conditional_type);
      this.sourceElem(n.typeParam);
      registerForUnusedIdentifiersCheck(n);
    }
    importType(n: qt.ImportTyping) {
      this.sourceElem(n.arg);
      qf.get.typeFromTypeNode(n);
    }
    namedTupleMember(n: qt.NamedTupleMember) {
      if (n.dot3Token && n.questionToken) grammarErrorOnNode(n, qd.msgs.A_tuple_member_cannot_be_both_optional_and_rest);
      if (n.type.kind === Syntax.OptionalTyping)
        grammarErrorOnNode(n.type, qd.msgs.A_labeled_tuple_elem_is_declared_as_optional_with_a_question_mark_after_the_name_and_before_the_colon_rather_than_after_the_type);
      if (n.type.kind === Syntax.RestTyping) grammarErrorOnNode(n.type, qd.msgs.A_labeled_tuple_elem_is_declared_as_rest_with_a_before_the_name_rather_than_before_the_type);
      this.sourceElem(n.type);
      qf.get.typeFromTypeNode(n);
    }
    exportsOnMergedDeclarations(n: qt.Declaration): void {
      if (!produceDiagnostics) return;
      let symbol = n.localSymbol;
      if (!symbol) {
        symbol = qf.get.symbolOfNode(n)!;
        if (!symbol.exportSymbol) return;
      }
      if (symbol.declarationOfKind(n.kind) !== n) return;
      let exportedDeclarationSpaces = DeclarationSpaces.None;
      let nonExportedDeclarationSpaces = DeclarationSpaces.None;
      let defaultExportedDeclarationSpaces = DeclarationSpaces.None;
      for (const d of symbol.declarations) {
        const declarationSpaces = getDeclarationSpaces(d);
        const effectiveDeclarationFlags = getEffectiveDeclarationFlags(d, ModifierFlags.Export | ModifierFlags.Default);
        if (effectiveDeclarationFlags & ModifierFlags.Export) {
          if (effectiveDeclarationFlags & ModifierFlags.Default) defaultExportedDeclarationSpaces |= declarationSpaces;
          else {
            exportedDeclarationSpaces |= declarationSpaces;
          }
        } else {
          nonExportedDeclarationSpaces |= declarationSpaces;
        }
      }
      const nonDefaultExportedDeclarationSpaces = exportedDeclarationSpaces | nonExportedDeclarationSpaces;
      const commonDeclarationSpacesForExportsAndLocals = exportedDeclarationSpaces & nonExportedDeclarationSpaces;
      const commonDeclarationSpacesForDefaultAndNonDefault = defaultExportedDeclarationSpaces & nonDefaultExportedDeclarationSpaces;
      if (commonDeclarationSpacesForExportsAndLocals || commonDeclarationSpacesForDefaultAndNonDefault) {
        for (const d of symbol.declarations) {
          const declarationSpaces = getDeclarationSpaces(d);
          const name = qf.decl.nameOf(d);
          if (declarationSpaces & commonDeclarationSpacesForDefaultAndNonDefault)
            error(name, qd.msgs.Merged_declaration_0_cannot_include_a_default_export_declaration_Consider_adding_a_separate_export_default_0_declaration_instead, declarationNameToString(name));
          else if (declarationSpaces & commonDeclarationSpacesForExportsAndLocals) {
            error(name, qd.msgs.Individual_declarations_in_merged_declaration_0_must_be_all_exported_or_all_local, declarationNameToString(name));
          }
        }
      }
      function getDeclarationSpaces(decl: qt.Declaration): DeclarationSpaces {
        let d = decl as Node;
        switch (d.kind) {
          case Syntax.InterfaceDeclaration:
          case Syntax.TypeAliasDeclaration:
          case Syntax.DocTypedefTag:
          case Syntax.DocCallbackTag:
          case Syntax.DocEnumTag:
            return DeclarationSpaces.ExportType;
          case Syntax.ModuleDeclaration:
            return qf.is.ambientModule(d as qt.ModuleDeclaration) || getModuleInstanceState(d as qt.ModuleDeclaration) !== ModuleInstanceState.NonInstantiated
              ? DeclarationSpaces.ExportNamespace | DeclarationSpaces.ExportValue
              : DeclarationSpaces.ExportNamespace;
          case Syntax.ClassDeclaration:
          case Syntax.EnumDeclaration:
          case Syntax.EnumMember:
            return DeclarationSpaces.ExportType | DeclarationSpaces.ExportValue;
          case Syntax.SourceFile:
            return DeclarationSpaces.ExportType | DeclarationSpaces.ExportValue | DeclarationSpaces.ExportNamespace;
          case Syntax.ExportAssignment:
            if (!qf.is.entityNameExpression((d as qt.ExportAssignment).expression)) return DeclarationSpaces.ExportValue;
            d = (d as qt.ExportAssignment).expression;
          case Syntax.ImportEqualsDeclaration:
          case Syntax.NamespaceImport:
          case Syntax.ImportClause:
            let result = DeclarationSpaces.None;
            const target = resolveAlias(qf.get.symbolOfNode(d)!);
            forEach(target.declarations, (d) => {
              result |= getDeclarationSpaces(d);
            });
            return result;
          case Syntax.VariableDeclaration:
          case Syntax.BindingElem:
          case Syntax.FunctionDeclaration:
          case Syntax.ImportSpecifier:
          case Syntax.qc.Identifier:
            return DeclarationSpaces.ExportValue;
          default:
            return qg.failBadSyntax(d);
        }
      }
    }
    asyncFunctionReturnType(n: qt.FunctionLikeDeclaration | qt.MethodSignature, returnTypeNode: qt.Typing) {
      const returnType = qf.get.typeFromTypeNode(returnTypeNode);
      if (returnType === errorType) return;
      const globalPromiseType = getGlobalPromiseType(true);
      if (globalPromiseType !== emptyGenericType && !qf.type.is.referenceTo(returnType, globalPromiseType)) {
        error(
          returnTypeNode,
          qd.msgs.The_return_type_of_an_async_function_or_method_must_be_the_global_Promise_T_type_Did_you_mean_to_write_Promise_0,
          typeToString(getAwaitedType(returnType) || voidType)
        );
        return;
      }
      qf.type.check.awaited(returnType, n, qd.msgs.The_return_type_of_an_async_function_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member);
    }
    decorator(n: qt.Decorator): void {
      const signature = getResolvedSignature(n);
      const returnType = qf.get.returnTypeOfSignature(signature);
      if (returnType.flags & TypeFlags.Any) return;
      let expectedReturnType: qt.Type;
      const headMessage = getDiagnosticHeadMessageForDecoratorResolution(n);
      let errorInfo: qd.MessageChain | undefined;
      switch (n.parent.kind) {
        case Syntax.ClassDeclaration:
          const classSymbol = qf.get.symbolOfNode(n.parent);
          const classConstructorType = classSymbol.typeOfSymbol();
          expectedReturnType = qf.get.unionType([classConstructorType, voidType]);
          break;
        case Syntax.Param:
          expectedReturnType = voidType;
          errorInfo = chainqd.Messages(undefined, qd.msgs.The_return_type_of_a_param_decorator_function_must_be_either_void_or_any);
          break;
        case Syntax.PropertyDeclaration:
          expectedReturnType = voidType;
          errorInfo = chainqd.Messages(undefined, qd.msgs.The_return_type_of_a_property_decorator_function_must_be_either_void_or_any);
          break;
        case Syntax.MethodDeclaration:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          const methodType = getTypeOfNode(n.parent);
          const descriptorType = createTypedPropertyDescriptorType(methodType);
          expectedReturnType = qf.get.unionType([descriptorType, voidType]);
          break;
        default:
          return qu.fail();
      }
      qf.type.check.assignableTo(returnType, expectedReturnType, n, headMessage, () => errorInfo);
    }
    decorators(n: Node): void {
      if (!n.decorators) return;
      if (!qf.is.decoratable(n, n.parent, n.parent.parent)) return;
      if (!compilerOpts.experimentalDecorators) {
        error(
          n,
          qd.msgs
            .Experimental_support_for_decorators_is_a_feature_that_is_subject_to_change_in_a_future_release_Set_the_experimentalDecorators_option_in_your_tsconfig_or_jsconfig_to_remove_this_warning
        );
      }
      const firstDecorator = n.decorators[0];
      this.externalEmitHelpers(firstDecorator, ExternalEmitHelpers.Decorate);
      if (n.kind === Syntax.Param) this.externalEmitHelpers(firstDecorator, ExternalEmitHelpers.Param);
      if (compilerOpts.emitDecoratorMetadata) {
        this.externalEmitHelpers(firstDecorator, ExternalEmitHelpers.Metadata);
        switch (n.kind) {
          case Syntax.ClassDeclaration:
            const constructor = qf.get.firstConstructorWithBody(<qt.ClassDeclaration>n);
            if (constructor) {
              for (const param of constructor.params) {
                markDecoratorMedataDataTypeNodeAsReferenced(getParamTypeNodeForDecoratorCheck(param));
              }
            }
            break;
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
            const otherKind = n.kind === Syntax.GetAccessor ? Syntax.SetAccessor : Syntax.GetAccessor;
            const otherAccessor = qf.get.symbolOfNode(n as qt.AccessorDeclaration).declarationOfKind<qt.AccessorDeclaration>(otherKind);
            markDecoratorMedataDataTypeNodeAsReferenced(getAnnotatedAccessorTypeNode(n as qt.AccessorDeclaration) || (otherAccessor && getAnnotatedAccessorTypeNode(otherAccessor)));
            break;
          case Syntax.MethodDeclaration:
            for (const param of (<qt.FunctionLikeDeclaration>n).params) {
              markDecoratorMedataDataTypeNodeAsReferenced(getParamTypeNodeForDecoratorCheck(param));
            }
            markDecoratorMedataDataTypeNodeAsReferenced(qf.get.effectiveReturnTypeNode(<qt.FunctionLikeDeclaration>n));
            break;
          case Syntax.PropertyDeclaration:
            markDecoratorMedataDataTypeNodeAsReferenced(qf.get.effectiveTypeAnnotationNode(<qt.ParamDeclaration>n));
            break;
          case Syntax.Param:
            markDecoratorMedataDataTypeNodeAsReferenced(getParamTypeNodeForDecoratorCheck(<qt.ParamDeclaration>n));
            const containingSignature = (n as qt.ParamDeclaration).parent;
            for (const param of containingSignature.params) {
              markDecoratorMedataDataTypeNodeAsReferenced(getParamTypeNodeForDecoratorCheck(param));
            }
            break;
        }
      }
      forEach(n.decorators, checkDecorator);
    }
    functionDeclaration(n: qt.FunctionDeclaration): void {
      if (produceDiagnostics) {
        this.functionOrMethodDeclaration(n);
        checkGrammar.forGenerator(n);
        this.collisionWithRequireExportsInGeneratedCode(n, n.name!);
        this.collisionWithGlobalPromiseInGeneratedCode(n, n.name!);
      }
    }
    docTypeAliasTag(n: qt.DocTypedefTag | qt.DocCallbackTag) {
      if (!n.typeExpression) error(n.name, qd.msgs.Doc_typedef_tag_should_either_have_a_type_annotation_or_be_followed_by_property_or_member_tags);
      if (n.name) this.typeNameIsReserved(n.name, qd.msgs.Type_alias_name_cannot_be_0);
      this.sourceElem(n.typeExpression);
    }
    docTemplateTag(n: qt.DocTemplateTag): void {
      this.sourceElem(n.constraint);
      for (const tp of n.typeParams) {
        this.sourceElem(tp);
      }
    }
    docTypeTag(n: qt.DocTypeTag) {
      this.sourceElem(n.typeExpression);
    }
    docParamTag(n: qt.DocParamTag) {
      this.sourceElem(n.typeExpression);
      if (!qf.get.paramSymbolFromDoc(n)) {
        const decl = qf.get.hostSignatureFromDoc(n);
        if (decl) {
          const i = qf.get.doc.tags(decl).filter(isDocParamTag).indexOf(n);
          if (i > -1 && i < decl.params.length && decl.params[i].name.kind === Syntax.BindingPattern) return;
          if (!containsArgsReference(decl)) {
            if (n.name.kind === Syntax.QualifiedName)
              error(n.name, qd.msgs.Qualified_name_0_is_not_allowed_without_a_leading_param_object_1, entityNameToString(n.name), entityNameToString(n.name.left));
            else {
              error(n.name, qd.msgs.Doc_param_tag_has_name_0_but_there_is_no_param_with_that_name, idText(n.name));
            }
          } else if (qf.find.down(qf.get.doc.tags(decl), isDocParamTag) === n && n.typeExpression && n.typeExpression.type && !qf.type.is.array(qf.get.typeFromTypeNode(n.typeExpression.type))) {
            error(
              n.name,
              qd.msgs.Doc_param_tag_has_name_0_but_there_is_no_param_with_that_name_It_would_match_args_if_it_had_an_array_type,
              idText(n.name.kind === Syntax.QualifiedName ? n.name.right : n.name)
            );
          }
        }
      }
    }
    docPropertyTag(n: qt.DocPropertyTag) {
      this.sourceElem(n.typeExpression);
    }
    docFunctionType(n: qt.DocFunctionTyping): void {
      if (produceDiagnostics && !n.type && !qf.is.doc.constructSignature(n)) reportImplicitAny(n, anyType);
      this.signatureDeclaration(n);
    }
    docImplementsTag(n: qt.DocImplementsTag): void {
      const classLike = qf.get.effectiveDocHost(n);
      if (!classLike || (!classLike.kind === Syntax.ClassDeclaration && !classLike.kind === Syntax.ClassExpression)) error(classLike, qd.msgs.Doc_0_is_not_attached_to_a_class, idText(n.tagName));
    }
    docAugmentsTag(n: qt.DocAugmentsTag): void {
      const classLike = qf.get.effectiveDocHost(n);
      if (!classLike || (!classLike.kind === Syntax.ClassDeclaration && !classLike.kind === Syntax.ClassExpression)) {
        error(classLike, qd.msgs.Doc_0_is_not_attached_to_a_class, idText(n.tagName));
        return;
      }
      const augmentsTags = qf.get.doc.tags(classLike).filter(isDocAugmentsTag);
      qf.assert.true(augmentsTags.length > 0);
      if (augmentsTags.length > 1) error(augmentsTags[1], qd.msgs.Class_declarations_cannot_have_more_than_one_augments_or_extends_tag);
      const name = getIdentifierFromEntityNameExpression(n.class.expression);
      const extend = qf.get.classExtendsHeritageElem(classLike);
      if (extend) {
        const className = getIdentifierFromEntityNameExpression(extend.expression);
        if (className && name.escapedText !== className.escapedText) error(name, qd.msgs.Doc_0_1_does_not_match_the_extends_2_clause, idText(n.tagName), idText(name), idText(className));
      }
    }
    functionOrMethodDeclaration(n: qt.FunctionDeclaration | qt.MethodDeclaration | qt.MethodSignature): void {
      this.decorators(n);
      this.signatureDeclaration(n);
      const functionFlags = qf.get.functionFlags(n);
      if (n.name && n.name.kind === Syntax.ComputedPropertyName) this.computedPropertyName(n.name);
      if (!hasNonBindableDynamicName(n)) {
        const symbol = qf.get.symbolOfNode(n);
        const localSymbol = n.localSymbol || symbol;
        const firstDeclaration = qf.find.up(localSymbol.declarations, (declaration) => declaration.kind === n.kind && !(declaration.flags & NodeFlags.JavaScriptFile));
        if (n === firstDeclaration) this.functionOrConstructorSymbol(localSymbol);
        if (symbol.parent) {
          if (symbol.declarationOfKind(n.kind) === n) this.functionOrConstructorSymbol(symbol);
        }
      }
      const body = n.kind === Syntax.MethodSignature ? undefined : n.body;
      this.sourceElem(body);
      this.allCodePathsInNonVoidFunctionReturnOrThrow(n, getReturnTypeFromAnnotation(n));
      if (produceDiagnostics && !qf.get.effectiveReturnTypeNode(n)) {
        if (qf.is.missing(body) && !isPrivateWithinAmbient(n)) reportImplicitAny(n, anyType);
        if (functionFlags & FunctionFlags.Generator && qf.is.present(body)) qf.get.returnTypeOfSignature(qf.get.signatureFromDeclaration(n));
      }
      if (qf.is.inJSFile(n)) {
        const typeTag = qf.get.doc.typeTag(n);
        if (typeTag && typeTag.typeExpression && !getContextualCallSignature(qf.get.typeFromTypeNode(typeTag.typeExpression), n))
          error(typeTag, qd.msgs.The_type_of_a_function_declaration_must_match_the_function_s_signature);
      }
    }
    unusedIdentifiers(potentiallyUnusedIdentifiers: readonly PotentiallyUnusedIdentifier[], addDiagnostic: AddUnusedDiagnostic) {
      for (const n of potentiallyUnusedIdentifiers) {
        switch (n.kind) {
          case Syntax.ClassDeclaration:
          case Syntax.ClassExpression:
            this.unusedClassMembers(n, addDiagnostic);
            this.unusedTypeParams(n, addDiagnostic);
            break;
          case Syntax.SourceFile:
          case Syntax.ModuleDeclaration:
          case Syntax.Block:
          case Syntax.CaseBlock:
          case Syntax.ForStatement:
          case Syntax.ForInStatement:
          case Syntax.ForOfStatement:
            this.unusedLocalsAndParams(n, addDiagnostic);
            break;
          case Syntax.Constructor:
          case Syntax.FunctionExpression:
          case Syntax.FunctionDeclaration:
          case Syntax.ArrowFunction:
          case Syntax.MethodDeclaration:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
            if (n.body) this.unusedLocalsAndParams(n, addDiagnostic);
            this.unusedTypeParams(n, addDiagnostic);
            break;
          case Syntax.MethodSignature:
          case Syntax.CallSignature:
          case Syntax.ConstructSignature:
          case Syntax.FunctionTyping:
          case Syntax.ConstructorTyping:
          case Syntax.TypeAliasDeclaration:
          case Syntax.InterfaceDeclaration:
            this.unusedTypeParams(n, addDiagnostic);
            break;
          case Syntax.InferTyping:
            this.unusedInferTypeParam(n, addDiagnostic);
            break;
          default:
            qc.assert.never(n, 'Node should not have been registered for unused identifiers check');
        }
      }
    }
    unusedClassMembers(n: qt.ClassDeclaration | qt.ClassExpression, addDiagnostic: AddUnusedDiagnostic): void {
      for (const member of n.members) {
        switch (member.kind) {
          case Syntax.MethodDeclaration:
          case Syntax.PropertyDeclaration:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
            if (member.kind === Syntax.SetAccessor && member.symbol.flags & qt.SymbolFlags.GetAccessor) break;
            const symbol = qf.get.symbolOfNode(member);
            if (
              !symbol.referenced &&
              (qf.has.effectiveModifier(member, ModifierFlags.Private) || (qf.is.namedDeclaration(member) && member.name.kind === Syntax.PrivateIdentifier)) &&
              !(member.flags & NodeFlags.Ambient)
            ) {
              addDiagnostic(member, UnusedKind.Local, qf.make.diagForNode(member.name!, qd.msgs._0_is_declared_but_its_value_is_never_read, symbol.symbolToString()));
            }
            break;
          case Syntax.Constructor:
            for (const param of (<qt.ConstructorDeclaration>member).params) {
              if (!param.symbol.referenced && qf.has.syntacticModifier(param, ModifierFlags.Private))
                addDiagnostic(param, UnusedKind.Local, qf.make.diagForNode(param.name, qd.msgs.Property_0_is_declared_but_its_value_is_never_read, param.symbol.name));
            }
            break;
          case Syntax.IndexSignature:
          case Syntax.SemicolonClassElem:
            break;
          default:
            qu.fail();
        }
      }
    }
    unusedInferTypeParam(n: qt.InferTyping, addDiagnostic: AddUnusedDiagnostic): void {
      const { typeParam } = n;
      if (isTypeParamUnused(typeParam)) addDiagnostic(n, UnusedKind.Param, qf.make.diagForNode(n, qd.msgs._0_is_declared_but_its_value_is_never_read, idText(typeParam.name)));
    }
    unusedTypeParams(n: qt.ClassLikeDeclaration | qt.SignatureDeclaration | qt.InterfaceDeclaration | qt.TypeAliasDeclaration, addDiagnostic: AddUnusedDiagnostic): void {
      if (last(qf.get.symbolOfNode(n).declarations) !== n) return;
      const typeParams = qf.get.effectiveTypeParamDeclarations(n);
      const seenParentsWithEveryUnused = new NodeSet<qt.DeclarationWithTypeParamChildren>();
      for (const typeParam of typeParams) {
        if (!isTypeParamUnused(typeParam)) continue;
        const name = idText(typeParam.name);
        const { parent } = typeParam;
        if (parent.kind !== Syntax.InferTyping && parent.typeParams!.every(isTypeParamUnused)) {
          if (seenParentsWithEveryUnused.tryAdd(parent)) {
            const range = parent.kind === Syntax.DocTemplateTag ? parent.range : parent.typeParams!.range;
            const only = parent.typeParams!.length === 1;
            const message = only ? qd.msgs._0_is_declared_but_its_value_is_never_read : qd.msgs.All_type_params_are_unused;
            const arg0 = only ? name : undefined;
            addDiagnostic(typeParam, UnusedKind.Param, qf.make.fileDiag(parent.sourceFile, range.pos, range.end - range.pos, message, arg0));
          }
        } else {
          addDiagnostic(typeParam, UnusedKind.Param, qf.make.diagForNode(typeParam, qd.msgs._0_is_declared_but_its_value_is_never_read, name));
        }
      }
    }
    unusedLocalsAndParams(nodeWithLocals: Node, addDiagnostic: AddUnusedDiagnostic): void {
      const unusedImports = new qu.QMap<[ImportClause, ImportedDeclaration[]]>();
      const unusedDestructures = new qu.QMap<[ObjectBindingPattern, qt.BindingElem[]]>();
      const unusedVariables = new qu.QMap<[VariableDeclarationList, qt.VariableDeclaration[]]>();
      nodeWithLocals.locals!.forEach((local) => {
        if (local.flags & qt.SymbolFlags.TypeParam ? !(local.flags & qt.SymbolFlags.Variable && !(local.referenced! & qt.SymbolFlags.Variable)) : local.referenced || local.exportSymbol) return;
        for (const declaration of local.declarations) {
          if (isValidUnusedLocalDeclaration(declaration)) continue;
          if (isImportedDeclaration(declaration)) addToGroup(unusedImports, importClauseFromImported(declaration), declaration, qf.get.nodeId);
          else if (declaration.kind === Syntax.BindingElem && declaration.parent.kind === Syntax.ObjectBindingPattern) {
            const lastElem = last(declaration.parent.elems);
            if (declaration === lastElem || !last(declaration.parent.elems).dot3Token) addToGroup(unusedDestructures, declaration.parent, declaration, qf.get.nodeId);
          } else if (declaration.kind === Syntax.VariableDeclaration) {
            addToGroup(unusedVariables, declaration.parent, declaration, qf.get.nodeId);
          } else {
            const param = local.valueDeclaration && tryGetRootParamDeclaration(local.valueDeclaration);
            const name = local.valueDeclaration && qf.decl.nameOf(local.valueDeclaration);
            if (param && name) {
              if (!qf.is.paramPropertyDeclaration(param, param.parent) && !paramIsThqy.is.keyword(param) && !qf.is.identifierThatStartsWithUnderscore(name))
                addDiagnostic(param, UnusedKind.Param, qf.make.diagForNode(name, qd.msgs._0_is_declared_but_its_value_is_never_read, local.name));
            } else {
              errorUnusedLocal(declaration, local.name, addDiagnostic);
            }
          }
        }
      });
      unusedImports.forEach(([importClause, unuseds]) => {
        const importDecl = importClause.parent;
        const nDeclarations =
          (importClause.name ? 1 : 0) + (importClause.namedBindings ? (importClause.namedBindings.kind === Syntax.NamespaceImport ? 1 : importClause.namedBindings.elems.length) : 0);
        if (nDeclarations === unuseds.length) {
          addDiagnostic(
            importDecl,
            UnusedKind.Local,
            unuseds.length === 1
              ? qf.make.diagForNode(importDecl, qd.msgs._0_is_declared_but_its_value_is_never_read, idText(first(unuseds).name!))
              : qf.make.diagForNode(importDecl, qd.msgs.All_imports_in_import_declaration_are_unused)
          );
        } else {
          for (const unused of unuseds) errorUnusedLocal(unused, idText(unused.name!), addDiagnostic);
        }
      });
      unusedDestructures.forEach(([bindingPattern, bindingElems]) => {
        const kind = tryGetRootParamDeclaration(bindingPattern.parent) ? UnusedKind.Param : UnusedKind.Local;
        if (bindingPattern.elems.length === bindingElems.length) {
          if (bindingElems.length === 1 && bindingPattern.parent.kind === Syntax.VariableDeclaration && bindingPattern.parent.parent.kind === Syntax.VariableDeclarationList)
            addToGroup(unusedVariables, bindingPattern.parent.parent, bindingPattern.parent, qf.get.nodeId);
          else {
            addDiagnostic(
              bindingPattern,
              kind,
              bindingElems.length === 1
                ? qf.make.diagForNode(bindingPattern, qd.msgs._0_is_declared_but_its_value_is_never_read, bindingNameText(first(bindingElems).name))
                : qf.make.diagForNode(bindingPattern, qd.msgs.All_destructured_elems_are_unused)
            );
          }
        } else {
          for (const e of bindingElems) {
            addDiagnostic(e, kind, qf.make.diagForNode(e, qd.msgs._0_is_declared_but_its_value_is_never_read, bindingNameText(e.name)));
          }
        }
      });
      unusedVariables.forEach(([declarationList, declarations]) => {
        if (declarationList.declarations.length === declarations.length) {
          addDiagnostic(
            declarationList,
            UnusedKind.Local,
            declarations.length === 1
              ? qf.make.diagForNode(first(declarations).name, qd.msgs._0_is_declared_but_its_value_is_never_read, bindingNameText(first(declarations).name))
              : qf.make.diagForNode(declarationList.parent.kind === Syntax.VariableStatement ? declarationList.parent : declarationList, qd.msgs.All_variables_are_unused)
          );
        } else {
          for (const decl of declarations) {
            addDiagnostic(decl, UnusedKind.Local, qf.make.diagForNode(decl, qd.msgs._0_is_declared_but_its_value_is_never_read, bindingNameText(decl.name)));
          }
        }
      });
    }
    block(n: qt.Block) {
      if (n.kind === Syntax.Block) checkGrammar.statementInAmbientContext(n);
      if (qf.is.functionOrModuleBlock(n)) {
        const saveFlowAnalysisDisabled = flowAnalysisDisabled;
        forEach(n.statements, checkSourceElem);
        flowAnalysisDisabled = saveFlowAnalysisDisabled;
      } else {
        forEach(n.statements, checkSourceElem);
      }
      if (n.locals) registerForUnusedIdentifiersCheck(n);
    }
    collisionWithArgsInGeneratedCode(n: qt.SignatureDeclaration) {
      return;
    }
    ifThisIsCapturedInEnclosingScope(n: Node): void {
      qc.findAncestor(n, (current) => {
        if (getNodeCheckFlags(current) & NodeCheckFlags.CaptureThis) {
          const isDeclaration = n.kind !== Syntax.qc.Identifier;
          if (isDeclaration) error(qf.decl.nameOf(<qt.Declaration>n), qd.msgs.Duplicate_identifier_this_Compiler_uses_variable_declaration_this_to_capture_this_reference);
          else {
            error(n, qd.msgs.Expression_resolves_to_variable_declaration_this_that_compiler_uses_to_capture_this_reference);
          }
          return true;
        }
        return false;
      });
    }
    ifNewTargetIsCapturedInEnclosingScope(n: Node): void {
      qc.findAncestor(n, (current) => {
        if (getNodeCheckFlags(current) & NodeCheckFlags.CaptureNewTarget) {
          const isDeclaration = n.kind !== Syntax.qc.Identifier;
          if (isDeclaration)
            error(qf.decl.nameOf(<qt.Declaration>n), qd.msgs.Duplicate_identifier_newTarget_Compiler_uses_variable_declaration_newTarget_to_capture_new_target_meta_property_reference);
          else {
            error(n, qd.msgs.Expression_resolves_to_variable_declaration_newTarget_that_compiler_uses_to_capture_new_target_meta_property_reference);
          }
          return true;
        }
        return false;
      });
    }
    weakMapCollision(n: Node) {
      const enclosingBlockScope = qf.get.enclosingBlockScopeContainer(n);
      if (getNodeCheckFlags(enclosingBlockScope) & NodeCheckFlags.ContainsClassWithPrivateIdentifiers) error(n, qd.msgs.Compiler_reserves_name_0_when_emitting_private_identifier_downlevel, 'WeakMap');
    }
    collisionWithRequireExportsInGeneratedCode(n: Node, name: qt.Identifier) {
      if (moduleKind >= ModuleKind.ES2015 || compilerOpts.noEmit) return;
      if (!needCollisionCheckForIdentifier(n, name, 'require') && !needCollisionCheckForIdentifier(n, name, 'exports')) return;
      if (n.kind === Syntax.ModuleDeclaration && getModuleInstanceState(n) !== ModuleInstanceState.Instantiated) return;
      const parent = getDeclarationContainer(n);
      if (parent.kind === Syntax.SourceFile && qf.is.externalOrCommonJsModule(<qt.SourceFile>parent))
        error(name, qd.msgs.Duplicate_identifier_0_Compiler_reserves_name_1_in_top_level_scope_of_a_module, declarationNameToString(name), declarationNameToString(name));
    }
    collisionWithGlobalPromiseInGeneratedCode(n: Node, name: qt.Identifier): void {
      return;
    }
    varDeclaredNamesNotShadowed(n: qt.VariableDeclaration | qt.BindingElem) {
      if ((qf.get.combinedFlagsOf(n) & NodeFlags.BlockScoped) !== 0 || qf.is.paramDeclaration(n)) return;
      if (n.kind === Syntax.VariableDeclaration && !n.initer) return;
      const symbol = qf.get.symbolOfNode(n);
      if (symbol.flags & qt.SymbolFlags.FunctionScopedVariable) {
        if (!n.name.kind === Syntax.Identifier) return qu.fail();
        const localDeclarationSymbol = resolveName(n, n.name.escapedText, qt.SymbolFlags.Variable, undefined, undefined, false);
        if (localDeclarationSymbol && localDeclarationSymbol !== symbol && localDeclarationSymbol.flags & qt.SymbolFlags.BlockScopedVariable) {
          if (getDeclarationNodeFlagsFromSymbol(localDeclarationSymbol) & NodeFlags.BlockScoped) {
            const varDeclList = qf.get.ancestor(localDeclarationSymbol.valueDeclaration, Syntax.VariableDeclarationList)!;
            const container = varDeclList.parent.kind === Syntax.VariableStatement && varDeclList.parent.parent ? varDeclList.parent.parent : undefined;
            const namesShareScope =
              container &&
              ((container.kind === Syntax.Block && qf.is.functionLike(container.parent)) ||
                container.kind === Syntax.ModuleBlock ||
                container.kind === Syntax.ModuleDeclaration ||
                container.kind === Syntax.SourceFile);
            if (!namesShareScope) {
              const name = localDeclarationSymbol.symbolToString();
              error(n, qd.msgs.Cannot_initialize_outer_scoped_variable_0_in_the_same_scope_as_block_scoped_declaration_1, name, name);
            }
          }
        }
      }
    }
    variableLikeDeclaration(n: qt.ParamDeclaration | qt.PropertyDeclaration | qt.PropertySignature | qt.VariableDeclaration | qt.BindingElem) {
      this.decorators(n);
      if (!n.kind === Syntax.BindingElem) this.sourceElem(n.type);
      if (!n.name) return;
      if (n.name.kind === Syntax.ComputedPropertyName) {
        this.computedPropertyName(n.name);
        if (n.initer) this.expressionCached(n.initer);
      }
      if (n.kind === Syntax.BindingElem) {
        if (n.parent.kind === Syntax.ObjectBindingPattern && languageVersion < qt.ScriptTarget.ESNext) this.externalEmitHelpers(n, ExternalEmitHelpers.Rest);
        if (n.propertyName && n.propertyName.kind === Syntax.ComputedPropertyName) this.computedPropertyName(n.propertyName);
        const parent = n.parent.parent;
        const parentType = qf.get.typeForBindingElemParent(parent);
        const name = n.propertyName || n.name;
        if (parentType && !name.kind === Syntax.BindingPattern) {
          const exprType = qf.get.literalTypeFromPropertyName(name);
          if (qf.type.is.usableAsPropertyName(exprType)) {
            const nameText = getPropertyNameFromType(exprType);
            const property = qf.get.propertyOfType(parentType, nameText);
            if (property) {
              markPropertyAsReferenced(property, false);
              this.propertyAccessibility(parent, !!parent.initer && parent.initer.kind === Syntax.SuperKeyword, parentType, property);
            }
          }
        }
      }
      if (n.name.kind === Syntax.BindingPattern) forEach(n.name.elems, checkSourceElem);
      if (n.initer && qf.get.rootDeclaration(n).kind === Syntax.Param && qf.is.missing((qf.get.containingFunction(n) as qt.FunctionLikeDeclaration).body)) {
        error(n, qd.msgs.A_param_initer_is_only_allowed_in_a_function_or_constructor_implementation);
        return;
      }
      if (n.name.kind === Syntax.BindingPattern) {
        const needCheckIniter = n.initer && n.parent.parent.kind !== Syntax.ForInStatement;
        const needCheckWidenedType = n.name.elems.length === 0;
        if (needCheckIniter || needCheckWidenedType) {
          const widenedType = qf.get.widenedTypeForVariableLikeDeclaration(n);
          if (needCheckIniter) {
            const initerType = this.expressionCached(n.initer!);
            if (strictNullChecks && needCheckWidenedType) this.nonNullNonVoidType(initerType, n);
            else {
              qf.type.check.assignableToAndOptionallyElaborate(initerType, qf.get.widenedTypeForVariableLikeDeclaration(n), n, n.initer);
            }
          }
          if (needCheckWidenedType) {
            if (n.name.kind === Syntax.ArrayBindingPattern) this.iteratedTypeOrElemType(IterationUse.Destructuring, widenedType, undefinedType, n);
            else if (strictNullChecks) {
              this.nonNullNonVoidType(widenedType, n);
            }
          }
        }
        return;
      }
      const symbol = qf.get.symbolOfNode(n);
      const type = convertAutoToAny(this.typeOfSymbol());
      if (n === symbol.valueDeclaration) {
        const initer = qf.get.effectiveIniter(n);
        if (initer) {
          const isJSObjectLiteralIniter =
            qf.is.inJSFile(n) && initer.kind === Syntax.ObjectLiteralExpression && (initer.properties.length === 0 || qf.is.prototypeAccess(n.name)) && qu.hasEntries(symbol.exports);
          if (!isJSObjectLiteralIniter && n.parent.parent.kind !== Syntax.ForInStatement) qf.type.check.assignableToAndOptionallyElaborate(this.expressionCached(initer), type, n, initer, undefined);
        }
        if (symbol.declarations.length > 1) {
          if (qu.some(symbol.declarations, (d) => d !== n && qf.is.variableLike(d) && !areDeclarationFlagsIdentical(d, n)))
            error(n.name, qd.msgs.All_declarations_of_0_must_have_identical_modifiers, declarationNameToString(n.name));
        }
      } else {
        const declarationType = convertAutoToAny(qf.get.widenedTypeForVariableLikeDeclaration(n));
        if (type !== errorType && declarationType !== errorType && !qf.type.is.identicalTo(type, declarationType) && !(symbol.flags & qt.SymbolFlags.Assignment))
          errorNextVariableOrPropertyDeclarationMustHaveSameType(symbol.valueDeclaration, type, n, declarationType);
        if (n.initer) qf.type.check.assignableToAndOptionallyElaborate(this.expressionCached(n.initer), declarationType, n, n.initer, undefined);
        if (!areDeclarationFlagsIdentical(n, symbol.valueDeclaration)) error(n.name, qd.msgs.All_declarations_of_0_must_have_identical_modifiers, declarationNameToString(n.name));
      }
      if (n.kind !== Syntax.PropertyDeclaration && n.kind !== Syntax.PropertySignature) {
        this.exportsOnMergedDeclarations(n);
        if (n.kind === Syntax.VariableDeclaration || n.kind === Syntax.BindingElem) this.varDeclaredNamesNotShadowed(n);
        this.collisionWithRequireExportsInGeneratedCode(n, n.name);
        this.collisionWithGlobalPromiseInGeneratedCode(n, n.name);
        if (!compilerOpts.noEmit && languageVersion < qt.ScriptTarget.ESNext && needCollisionCheckForIdentifier(n, n.name, 'WeakMap')) potentialWeakMapCollisions.push(n);
      }
    }
    variableDeclaration(n: qt.VariableDeclaration) {
      checkGrammar.variableDeclaration(n);
      return this.variableLikeDeclaration(n);
    }
    bindingElem(n: qt.BindingElem) {
      checkGrammar.bindingElem(n);
      return this.variableLikeDeclaration(n);
    }
    variableStatement(n: qt.VariableStatement) {
      if (!checkGrammar.decoratorsAndModifiers(n) && !checkGrammar.variableDeclarationList(n.declarationList)) checkGrammar.forDisallowedLetOrConstStatement(n);
      forEach(n.declarationList.declarations, checkSourceElem);
    }
    expressionStatement(n: qt.ExpressionStatement) {
      checkGrammar.statementInAmbientContext(n);
      this.expression(n.expression);
    }
    ifStatement(n: qt.IfStatement) {
      checkGrammar.statementInAmbientContext(n);
      const type = this.truthinessExpression(n.expression);
      this.testingKnownTruthyCallableType(n.expression, n.thenStatement, type);
      this.sourceElem(n.thenStatement);
      if (n.thenStatement.kind === Syntax.EmptyStatement) error(n.thenStatement, qd.msgs.The_body_of_an_if_statement_cannot_be_the_empty_statement);
      this.sourceElem(n.elseStatement);
    }
    testingKnownTruthyCallableType(condExpr: qt.Expression, body: qt.Statement | qt.Expression, type: qt.Type) {
      if (!strictNullChecks) return;
      const testedNode = condExpr.kind === Syntax.Identifier ? condExpr : condExpr.kind === Syntax.PropertyAccessExpression ? condExpr.name : undefined;
      if (!testedNode) return;
      const possiblyFalsy = getFalsyFlags(type);
      if (possiblyFalsy) return;
      const callSignatures = getSignaturesOfType(type, SignatureKind.Call);
      if (callSignatures.length === 0) return;
      const testedFunctionSymbol = getSymbolAtLocation(testedNode);
      if (!testedFunctionSymbol) return;
      const functionIsUsedInBody = qf.each.child(body, function check(childNode): boolean | undefined {
        if (childNode.kind === Syntax.Identifier) {
          const childSymbol = getSymbolAtLocation(childNode);
          if (childSymbol && childSymbol === testedFunctionSymbol) {
            if (condExpr.kind === Syntax.Identifier) return true;
            let testedExpression = testedNode.parent;
            let childExpression = childNode.parent;
            while (testedExpression && childExpression) {
              if (
                (testedExpression.kind === Syntax.Identifier && childExpression.kind === Syntax.Identifier) ||
                (testedExpression.kind === Syntax.ThisKeyword && childExpression.kind === Syntax.ThisKeyword)
              ) {
                return getSymbolAtLocation(testedExpression) === getSymbolAtLocation(childExpression);
              }
              if (testedExpression.kind === Syntax.PropertyAccessExpression && childExpression.kind === Syntax.PropertyAccessExpression) {
                if (getSymbolAtLocation(testedExpression.name) !== getSymbolAtLocation(childExpression.name)) return false;
                childExpression = childExpression.expression;
                testedExpression = testedExpression.expression;
              }
              return false;
            }
          }
        }
        return qf.each.child(childNode, check);
      });
      if (!functionIsUsedInBody) error(condExpr, qd.msgs.This_condition_will_always_return_true_since_the_function_is_always_defined_Did_you_mean_to_call_it_instead);
    }
    doStatement(n: qt.DoStatement) {
      checkGrammar.statementInAmbientContext(n);
      this.sourceElem(n.statement);
      this.truthinessExpression(n.expression);
    }
    whileStatement(n: qt.WhileStatement) {
      checkGrammar.statementInAmbientContext(n);
      this.truthinessExpression(n.expression);
      this.sourceElem(n.statement);
    }
    truthinessExpression(n: qt.Expression, checkMode?: CheckMode) {
      return qf.type.check.truthinessOf(this.expression(n, checkMode), n);
    }
    forStatement(n: qt.ForStatement) {
      if (!checkGrammar.statementInAmbientContext(n)) {
        if (n.initer && n.initer.kind === Syntax.VariableDeclarationList) checkGrammar.variableDeclarationList(<qt.VariableDeclarationList>n.initer);
      }
      if (n.initer) {
        if (n.initer.kind === Syntax.VariableDeclarationList) forEach((<qt.VariableDeclarationList>n.initer).declarations, checkVariableDeclaration);
        else {
          this.expression(n.initer);
        }
      }
      if (n.condition) this.truthinessExpression(n.condition);
      if (n.incrementor) this.expression(n.incrementor);
      this.sourceElem(n.statement);
      if (n.locals) registerForUnusedIdentifiersCheck(n);
    }
    forOfStatement(n: qt.ForOfStatement): void {
      checkGrammar.forInOrForOfStatement(n);
      if (n.awaitModifier) {
        const functionFlags = qf.get.functionFlags(qf.get.containingFunction(n));
        if ((functionFlags & (FunctionFlags.Invalid | FunctionFlags.Async)) === FunctionFlags.Async && languageVersion < qt.ScriptTarget.ESNext)
          this.externalEmitHelpers(n, ExternalEmitHelpers.ForAwaitOfIncludes);
      }
      if (n.initer.kind === Syntax.VariableDeclarationList) this.forInOrForOfVariableDeclaration(n);
      else {
        const varExpr = n.initer;
        const iteratedType = this.rightHandSideOfForOf(n);
        if (varExpr.kind === Syntax.ArrayLiteralExpression || varExpr.kind === Syntax.ObjectLiteralExpression) this.destructuringAssignment(varExpr, iteratedType || errorType);
        else {
          const leftType = this.expression(varExpr);
          this.referenceExpression(
            varExpr,
            qd.msgs.The_left_hand_side_of_a_for_of_statement_must_be_a_variable_or_a_property_access,
            qd.msgs.The_left_hand_side_of_a_for_of_statement_may_not_be_an_optional_property_access
          );
          if (iteratedType) qf.type.check.assignableToAndOptionallyElaborate(iteratedType, leftType, varExpr, n.expression);
        }
      }
      this.sourceElem(n.statement);
      if (n.locals) registerForUnusedIdentifiersCheck(n);
    }
    forInStatement(n: qt.ForInStatement) {
      checkGrammar.forInOrForOfStatement(n);
      const rightType = qf.get.nonNullableTypeIfNeeded(this.expression(n.expression));
      if (n.initer.kind === Syntax.VariableDeclarationList) {
        const variable = (<qt.VariableDeclarationList>n.initer).declarations[0];
        if (variable && variable.name.kind === Syntax.BindingPattern) error(variable.name, qd.msgs.The_left_hand_side_of_a_for_in_statement_cannot_be_a_destructuring_pattern);
        this.forInOrForOfVariableDeclaration(n);
      } else {
        const varExpr = n.initer;
        const leftType = this.expression(varExpr);
        if (varExpr.kind === Syntax.ArrayLiteralExpression || varExpr.kind === Syntax.ObjectLiteralExpression)
          error(varExpr, qd.msgs.The_left_hand_side_of_a_for_in_statement_cannot_be_a_destructuring_pattern);
        else if (!qf.type.is.assignableTo(qf.get.indexTypeOrString(rightType), leftType)) {
          error(varExpr, qd.msgs.The_left_hand_side_of_a_for_in_statement_must_be_of_type_string_or_any);
        } else {
          this.referenceExpression(
            varExpr,
            qd.msgs.The_left_hand_side_of_a_for_in_statement_must_be_a_variable_or_a_property_access,
            qd.msgs.The_left_hand_side_of_a_for_in_statement_may_not_be_an_optional_property_access
          );
        }
      }
      if (rightType === neverType || !qf.type.is.assignableToKind(rightType, TypeFlags.NonPrimitive | TypeFlags.InstantiableNonPrimitive))
        error(n.expression, qd.msgs.The_right_hand_side_of_a_for_in_statement_must_be_of_type_any_an_object_type_or_a_type_param_but_here_has_type_0, typeToString(rightType));
      this.sourceElem(n.statement);
      if (n.locals) registerForUnusedIdentifiersCheck(n);
    }
    forInOrForOfVariableDeclaration(iterationStatement: qt.ForInOrOfStatement): void {
      const variableDeclarationList = <qt.VariableDeclarationList>iterationStatement.initer;
      if (variableDeclarationList.declarations.length >= 1) {
        const decl = variableDeclarationList.declarations[0];
        this.variableDeclaration(decl);
      }
    }
    rightHandSideOfForOf(statement: qt.ForOfStatement): qt.Type {
      const use = statement.awaitModifier ? IterationUse.ForAwaitOf : IterationUse.ForOf;
      return this.iteratedTypeOrElemType(use, this.nonNullExpression(statement.expression), undefinedType, statement.expression);
    }
    iteratedTypeOrElemType(use: IterationUse, inputType: qt.Type, sentType: qt.Type, errorNode: Node | undefined): qt.Type {
      if (qf.type.is.any(inputType)) return inputType;
      return getIteratedTypeOrElemType(use, inputType, sentType, errorNode, true) || anyType;
    }
    breakOrContinueStatement(n: qt.BreakOrContinueStatement) {
      if (!checkGrammar.statementInAmbientContext(n)) checkGrammar.breakOrContinueStatement(n);
    }
    returnStatement(n: qt.ReturnStatement) {
      if (checkGrammar.statementInAmbientContext(n)) return;
      const func = qf.get.containingFunction(n);
      if (!func) {
        grammarErrorOnFirstToken(n, qd.msgs.A_return_statement_can_only_be_used_within_a_function_body);
        return;
      }
      const signature = qf.get.signatureFromDeclaration(func);
      const returnType = qf.get.returnTypeOfSignature(signature);
      const functionFlags = qf.get.functionFlags(func);
      if (strictNullChecks || n.expression || returnType.flags & TypeFlags.Never) {
        const exprType = n.expression ? this.expressionCached(n.expression) : undefinedType;
        if (func.kind === Syntax.SetAccessor) {
          if (n.expression) error(n, qd.msgs.Setters_cannot_return_a_value);
        } else if (func.kind === Syntax.Constructor) {
          if (n.expression && !qf.type.check.assignableToAndOptionallyElaborate(exprType, returnType, n, n.expression))
            error(n, qd.msgs.Return_type_of_constructor_signature_must_be_assignable_to_the_instance_type_of_the_class);
        } else if (getReturnTypeFromAnnotation(func)) {
          const unwrappedReturnType = unwrapReturnType(returnType, functionFlags) ?? returnType;
          const unwrappedExprType =
            functionFlags & FunctionFlags.Async
              ? qf.type.check.awaited(exprType, n, qd.msgs.The_return_type_of_an_async_function_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member)
              : exprType;
          if (unwrappedReturnType) qf.type.check.assignableToAndOptionallyElaborate(unwrappedExprType, unwrappedReturnType, n, n.expression);
        }
      } else if (func.kind !== Syntax.Constructor && compilerOpts.noImplicitReturns && !isUnwrappedReturnTypeVoidOrAny(func, returnType)) {
        error(n, qd.msgs.Not_all_code_paths_return_a_value);
      }
    }
    withStatement(n: qt.WithStatement) {
      if (!checkGrammar.statementInAmbientContext(n)) {
        if (n.flags & NodeFlags.AwaitContext) grammarErrorOnFirstToken(n, qd.with_statements_are_not_allowed_in_an_async_function_block);
      }
      this.expression(n.expression);
      const sourceFile = n.sourceFile;
      if (!hasParseDiagnostics(sourceFile)) {
        const start = sourceFile.spanOfTokenAtPos(n.pos).start;
        const end = n.statement.pos;
        grammarErrorAtPos(sourceFile, start, end - start, qd.msgs.The_with_statement_is_not_supported_All_symbols_in_a_with_block_will_have_type_any);
      }
    }
    switchStatement(n: qt.SwitchStatement) {
      checkGrammar.statementInAmbientContext(n);
      let firstDefaultClause: qt.CaseOrDefaultClause;
      let hasDuplicateDefaultClause = false;
      const expressionType = this.expression(n.expression);
      const expressionIsLiteral = qf.type.is.literal(expressionType);
      forEach(n.caseBlock.clauses, (clause) => {
        if (clause.kind === Syntax.DefaultClause && !hasDuplicateDefaultClause) {
          if (firstDefaultClause === undefined) firstDefaultClause = clause;
          else {
            grammarErrorOnNode(clause, qd.msgs.A_default_clause_cannot_appear_more_than_once_in_a_switch_statement);
            hasDuplicateDefaultClause = true;
          }
        }
        if (produceDiagnostics && clause.kind === Syntax.CaseClause) {
          let caseType = this.expression(clause.expression);
          const caseIsLiteral = qf.type.is.literal(caseType);
          let comparedExpressionType = expressionType;
          if (!caseIsLiteral || !expressionIsLiteral) {
            caseType = caseIsLiteral ? getBaseTypeOfLiteralType(caseType) : caseType;
            comparedExpressionType = getBaseTypeOfLiteralType(expressionType);
          }
          if (!isTypeEqualityComparableTo(comparedExpressionType, caseType)) qf.type.check.comparableTo(caseType, comparedExpressionType, clause.expression, undefined);
        }
        forEach(clause.statements, checkSourceElem);
        if (compilerOpts.noFallthroughCasesInSwitch && clause.fallthroughFlowNode && isReachableFlowNode(clause.fallthroughFlowNode)) error(clause, qd.msgs.Fallthrough_case_in_switch);
      });
      if (n.caseBlock.locals) registerForUnusedIdentifiersCheck(n.caseBlock);
    }
    labeledStatement(n: qt.LabeledStatement) {
      if (!checkGrammar.statementInAmbientContext(n)) {
        qc.findAncestor(n.parent, (current) => {
          if (qf.is.functionLike(current)) return 'quit';
          if (current.kind === Syntax.LabeledStatement && (<qt.LabeledStatement>current).label.escapedText === n.label.escapedText) {
            grammarErrorOnNode(n.label, qd.msgs.Duplicate_label_0, qf.get.textOf(n.label));
            return true;
          }
          return false;
        });
      }
      this.sourceElem(n.statement);
    }
    throwStatement(n: qt.ThrowStatement) {
      if (!checkGrammar.statementInAmbientContext(n)) {
        if (n.expression === undefined) grammarErrorAfterFirstToken(n, qd.msgs.Line_break_not_permitted_here);
      }
      if (n.expression) this.expression(n.expression);
    }
    tryStatement(n: qt.TryStatement) {
      checkGrammar.statementInAmbientContext(n);
      this.block(n.tryBlock);
      const catchClause = n.catchClause;
      if (catchClause) {
        if (catchClause.variableDeclaration) {
          if (catchClause.variableDeclaration.type) grammarErrorOnFirstToken(catchClause.variableDeclaration.type, qd.msgs.Catch_clause_variable_cannot_have_a_type_annotation);
          else if (catchClause.variableDeclaration.initer) {
            grammarErrorOnFirstToken(catchClause.variableDeclaration.initer, qd.msgs.Catch_clause_variable_cannot_have_an_initer);
          } else {
            const blockLocals = catchClause.block.locals;
            if (blockLocals) {
              forEachKey(catchClause.locals!, (caughtName) => {
                const blockLocal = blockLocals.get(caughtName);
                if (blockLocal && (blockLocal.flags & qt.SymbolFlags.BlockScopedVariable) !== 0)
                  grammarErrorOnNode(blockLocal.valueDeclaration, qd.msgs.Cannot_redeclare_identifier_0_in_catch_clause, caughtName);
              });
            }
          }
        }
        this.block(catchClause.block);
      }
      if (n.finallyBlock) this.block(n.finallyBlock);
    }
    typeNameIsReserved(name: qt.Identifier, message: qd.Message): void {
      switch (name.escapedText) {
        case 'any':
        case 'unknown':
        case 'number':
        case 'bigint':
        case 'boolean':
        case 'string':
        case 'symbol':
        case 'void':
        case 'object':
          error(name, message, name.escapedText as string);
      }
    }
    classNameCollisionWithObject(name: qt.Identifier): void {}
    typeParams(typeParamDeclarations: readonly qt.TypeParamDeclaration[] | undefined) {
      if (typeParamDeclarations) {
        let seenDefault = false;
        for (let i = 0; i < typeParamDeclarations.length; i++) {
          const n = typeParamDeclarations[i];
          this.typeParam(n);
          if (produceDiagnostics) {
            if (n.default) {
              seenDefault = true;
              this.typeParamsNotReferenced(n.default, typeParamDeclarations, i);
            } else if (seenDefault) {
              error(n, qd.msgs.Required_type_params_may_not_follow_optional_type_params);
            }
            for (let j = 0; j < i; j++) {
              if (typeParamDeclarations[j].symbol === n.symbol) error(n.name, qd.msgs.Duplicate_identifier_0, declarationNameToString(n.name));
            }
          }
        }
      }
    }
    typeParamsNotReferenced(root: qt.Typing, typeParams: readonly qt.TypeParamDeclaration[], index: number) {
      visit(root);
      function visit(n: Node) {
        if (n.kind === Syntax.TypingReference) {
          const type = getTypeFromTypeReference(<qt.TypingReference>n);
          if (type.flags & TypeFlags.TypeParam) {
            for (let i = index; i < typeParams.length; i++) {
              if (type.symbol === qf.get.symbolOfNode(typeParams[i])) error(n, qd.msgs.Type_param_defaults_can_only_reference_previously_declared_type_params);
            }
          }
        }
        qf.each.child(n, visit);
      }
    }
    classExpression(n: qt.ClassExpression): qt.Type {
      this.classLikeDeclaration(n);
      this.nodeDeferred(n);
      return qf.get.symbolOfNode(n).typeOfSymbol();
    }
    classExpressionDeferred(n: qt.ClassExpression) {
      forEach(n.members, checkSourceElem);
      registerForUnusedIdentifiersCheck(n);
    }
    classDeclaration(n: qt.ClassDeclaration) {
      if (!n.name && !qf.has.syntacticModifier(n, ModifierFlags.Default)) grammarErrorOnFirstToken(n, qd.msgs.A_class_declaration_without_the_default_modifier_must_have_a_name);
      this.classLikeDeclaration(n);
      forEach(n.members, checkSourceElem);
      registerForUnusedIdentifiersCheck(n);
    }
    classLikeDeclaration(n: qt.ClassLikeDeclaration) {
      checkGrammar.classLikeDeclaration(n);
      this.decorators(n);
      if (n.name) {
        this.typeNameIsReserved(n.name, qd.msgs.Class_name_cannot_be_0);
        this.collisionWithRequireExportsInGeneratedCode(n, n.name);
        this.collisionWithGlobalPromiseInGeneratedCode(n, n.name);
        if (!(n.flags & NodeFlags.Ambient)) this.classNameCollisionWithObject(n.name);
      }
      this.typeParams(qf.get.effectiveTypeParamDeclarations(n));
      this.exportsOnMergedDeclarations(n);
      const symbol = qf.get.symbolOfNode(n);
      const type = <qt.InterfaceType>getDeclaredTypeOfSymbol(symbol);
      const typeWithThis = qf.get.typeWithThisArg(type);
      const staticType = <qt.ObjectType>this.typeOfSymbol();
      this.typeParamListsIdentical(symbol);
      this.classForDuplicateDeclarations(n);
      if (!(n.flags & NodeFlags.Ambient)) this.classForStaticPropertyNameConflicts(n);
      const baseTypeNode = qf.get.effectiveBaseTypeNode(n);
      if (baseTypeNode) {
        forEach(baseTypeNode.typeArgs, checkSourceElem);
        const extendsNode = qf.get.classExtendsHeritageElem(n);
        if (extendsNode && extendsNode !== baseTypeNode) this.expression(extendsNode.expression);
        const baseTypes = getBaseTypes(type);
        if (baseTypes.length && produceDiagnostics) {
          const baseType = baseTypes[0];
          const baseConstructorType = getBaseConstructorTypeOfClass(type);
          const staticBaseType = getApparentType(baseConstructorType);
          qf.type.check.baseAccessibility(staticBaseType, baseTypeNode);
          this.sourceElem(baseTypeNode.expression);
          if (qu.some(baseTypeNode.typeArgs)) {
            forEach(baseTypeNode.typeArgs, checkSourceElem);
            for (const constructor of getConstructorsForTypeArgs(staticBaseType, baseTypeNode.typeArgs, baseTypeNode)) {
              if (!this.typeArgConstraints(baseTypeNode, constructor.typeParams!)) break;
            }
          }
          const baseWithThis = qf.get.typeWithThisArg(baseType, type.thisType);
          if (!qf.type.check.assignableTo(typeWithThis, baseWithThis, undefined)) issueMemberSpecificError(n, typeWithThis, baseWithThis, qd.msgs.Class_0_incorrectly_extends_base_class_1);
          else {
            qf.type.check.assignableTo(staticType, getTypeWithoutSignatures(staticBaseType), n.name || n, qd.msgs.Class_static_side_0_incorrectly_extends_base_class_static_side_1);
          }
          if (baseConstructorType.flags & TypeFlags.TypeVariable && !qf.type.is.mixinConstructor(staticType))
            error(n.name || n, qd.msgs.A_mixin_class_must_have_a_constructor_with_a_single_rest_param_of_type_any);
          if (!(staticBaseType.symbol && staticBaseType.symbol.flags & qt.SymbolFlags.Class) && !(baseConstructorType.flags & TypeFlags.TypeVariable)) {
            const constructors = getInstantiatedConstructorsForTypeArgs(staticBaseType, baseTypeNode.typeArgs, baseTypeNode);
            if (forEach(constructors, (sig) => !qf.is.jsConstructor(sig.declaration) && !qf.type.is.identicalTo(qf.get.returnTypeOfSignature(sig), baseType)))
              error(baseTypeNode.expression, qd.msgs.Base_constructors_must_all_have_the_same_return_type);
          }
          this.kindsOfPropertyMemberOverrides(type, baseType);
        }
      }
      const implementedTypeNodes = qf.get.effectiveImplementsTypeNodes(n);
      if (implementedTypeNodes) {
        for (const typeRefNode of implementedTypeNodes) {
          if (!qf.is.entityNameExpression(typeRefNode.expression)) error(typeRefNode.expression, qd.msgs.A_class_can_only_implement_an_identifier_Slashqualified_name_with_optional_type_args);
          this.typeReferenceNode(typeRefNode);
          if (produceDiagnostics) {
            const t = getReducedType(qf.get.typeFromTypeNode(typeRefNode));
            if (t !== errorType) {
              if (qf.type.is.validBase(t)) {
                const genericDiag =
                  t.symbol && t.symbol.flags & qt.SymbolFlags.Class
                    ? qd.msgs.Class_0_incorrectly_implements_class_1_Did_you_mean_to_extend_1_and_inherit_its_members_as_a_subclass
                    : qd.msgs.Class_0_incorrectly_implements_interface_1;
                const baseWithThis = qf.get.typeWithThisArg(t, type.thisType);
                if (!qf.type.check.assignableTo(typeWithThis, baseWithThis, undefined)) issueMemberSpecificError(n, typeWithThis, baseWithThis, genericDiag);
              } else {
                error(typeRefNode, qd.msgs.A_class_can_only_implement_an_object_type_or_intersection_of_object_types_with_statically_known_members);
              }
            }
          }
        }
      }
      if (produceDiagnostics) {
        qf.type.check.qf.type.check.indexConstraints(type);
        this.typeForDuplicateIndexSignatures(n);
        this.propertyInitialization(n);
      }
    }
    kindsOfPropertyMemberOverrides(type: qt.InterfaceType, baseType: qt.BaseType): void {
      const baseProperties = qf.get.propertiesOfType(baseType);
      basePropertyCheck: for (const baseProperty of baseProperties) {
        const base = getTargetSymbol(baseProperty);
        if (base.flags & qt.SymbolFlags.Prototype) continue;
        const baseSymbol = getPropertyOfObjectType(type, base.escName);
        if (!baseSymbol) continue;
        const derived = getTargetSymbol(baseSymbol);
        const baseDeclarationFlags = base.declarationModifierFlags();
        qf.assert.true(!!derived, "derived should point to something, even if it is the base class' declaration.");
        if (derived === base) {
          const derivedClassDecl = type.symbol.classLikeDeclaration()!;
          if (baseDeclarationFlags & ModifierFlags.Abstract && (!derivedClassDecl || !qf.has.syntacticModifier(derivedClassDecl, ModifierFlags.Abstract))) {
            for (const otherBaseType of getBaseTypes(type)) {
              if (otherBaseType === baseType) continue;
              const baseSymbol = getPropertyOfObjectType(otherBaseType, base.escName);
              const derivedElsewhere = baseSymbol && getTargetSymbol(baseSymbol);
              if (derivedElsewhere && derivedElsewhere !== base) continue basePropertyCheck;
            }
            if (derivedClassDecl.kind === Syntax.ClassExpression)
              error(derivedClassDecl, qd.msgs.Non_abstract_class_expression_does_not_implement_inherited_abstract_member_0_from_class_1, baseProperty.symbolToString(), typeToString(baseType));
            else {
              error(
                derivedClassDecl,
                qd.msgs.Non_abstract_class_0_does_not_implement_inherited_abstract_member_1_from_class_2,
                typeToString(type),
                baseProperty.symbolToString(),
                typeToString(baseType)
              );
            }
          }
        } else {
          const derivedDeclarationFlags = derived.declarationModifierFlags();
          if (baseDeclarationFlags & ModifierFlags.Private || derivedDeclarationFlags & ModifierFlags.Private) continue;
          let errorMessage: qd.Message;
          const basePropertyFlags = base.flags & qt.SymbolFlags.PropertyOrAccessor;
          const derivedPropertyFlags = derived.flags & qt.SymbolFlags.PropertyOrAccessor;
          if (basePropertyFlags && derivedPropertyFlags) {
            if (
              (baseDeclarationFlags & ModifierFlags.Abstract && !(base.valueDeclaration && base.valueDeclaration.kind === Syntax.PropertyDeclaration && base.valueDeclaration.initer)) ||
              (base.valueDeclaration && base.valueDeclaration.parent.kind === Syntax.InterfaceDeclaration) ||
              (derived.valueDeclaration && derived.valueDeclaration.kind === Syntax.BinaryExpression)
            ) {
              continue;
            }
            const overriddenInstanceProperty = basePropertyFlags !== qt.SymbolFlags.Property && derivedPropertyFlags === qt.SymbolFlags.Property;
            const overriddenInstanceAccessor = basePropertyFlags === qt.SymbolFlags.Property && derivedPropertyFlags !== qt.SymbolFlags.Property;
            if (overriddenInstanceProperty || overriddenInstanceAccessor) {
              const errorMessage = overriddenInstanceProperty
                ? qd.msgs._0_is_defined_as_an_accessor_in_class_1_but_is_overridden_here_in_2_as_an_instance_property
                : qd.msgs._0_is_defined_as_a_property_in_class_1_but_is_overridden_here_in_2_as_an_accessor;
              error(qf.decl.nameOf(derived.valueDeclaration) || derived.valueDeclaration, errorMessage, base.symbolToString(), typeToString(baseType), typeToString(type));
            } else if (compilerOpts.useDefineForClassFields) {
              const uninitialized = qf.find.up(derived.declarations, (d) => d.kind === Syntax.PropertyDeclaration && !(d as qt.PropertyDeclaration).initer);
              if (
                uninitialized &&
                !(derived.flags & qt.SymbolFlags.Transient) &&
                !(baseDeclarationFlags & ModifierFlags.Abstract) &&
                !(derivedDeclarationFlags & ModifierFlags.Abstract) &&
                !derived.declarations.some((d) => !!(d.flags & NodeFlags.Ambient))
              ) {
                const constructor = findConstructorDeclaration(type.symbol.classLikeDeclaration()!);
                const propName = (uninitialized as qt.PropertyDeclaration).name;
                if (
                  (uninitialized as qt.PropertyDeclaration).exclamationToken ||
                  !constructor ||
                  !propName.kind === Syntax.Identifier ||
                  !strictNullChecks ||
                  !isPropertyInitializedInConstructor(propName, type, constructor)
                ) {
                  const errorMessage =
                    qd.msgs.Property_0_will_overwrite_the_base_property_in_1_If_this_is_intentional_add_an_initer_Otherwise_add_a_declare_modifier_or_remove_the_redundant_declaration;
                  error(qf.decl.nameOf(derived.valueDeclaration) || derived.valueDeclaration, errorMessage, base.symbolToString(), typeToString(baseType));
                }
              }
            }
            continue;
          } else if (isPrototypeProperty(base)) {
            if (isPrototypeProperty(derived) || derived.flags & qt.SymbolFlags.Property) continue;
            else {
              qf.assert.true(!!(derived.flags & qt.SymbolFlags.Accessor));
              errorMessage = qd.msgs.Class_0_defines_instance_member_function_1_but_extended_class_2_defines_it_as_instance_member_accessor;
            }
          } else if (base.flags & qt.SymbolFlags.Accessor) {
            errorMessage = qd.msgs.Class_0_defines_instance_member_accessor_1_but_extended_class_2_defines_it_as_instance_member_function;
          } else {
            errorMessage = qd.msgs.Class_0_defines_instance_member_property_1_but_extended_class_2_defines_it_as_instance_member_function;
          }
          error(qf.decl.nameOf(derived.valueDeclaration) || derived.valueDeclaration, errorMessage, typeToString(baseType), base.symbolToString(), typeToString(type));
        }
      }
    }
    inheritedPropertiesAreIdentical(type: qt.InterfaceType, typeNode: Node): boolean {
      const baseTypes = getBaseTypes(type);
      if (baseTypes.length < 2) return true;
      interface InheritanceInfoMap {
        prop: qt.Symbol;
        containingType: qt.Type;
      }
      const seen = qu.createEscapedMap<InheritanceInfoMap>();
      forEach(resolveDeclaredMembers(type).declaredProperties, (p) => {
        seen.set(p.escName, { prop: p, containingType: type });
      });
      let ok = true;
      for (const base of baseTypes) {
        const properties = qf.get.propertiesOfType(qf.get.typeWithThisArg(base, type.thisType));
        for (const prop of properties) {
          const existing = seen.get(prop.escName);
          if (!existing) seen.set(prop.escName, { prop, containingType: base });
          else {
            const isInheritedProperty = existing.containingType !== type;
            if (isInheritedProperty && !isPropertyIdenticalTo(existing.prop, prop)) {
              ok = false;
              const typeName1 = typeToString(existing.containingType);
              const typeName2 = typeToString(base);
              let errorInfo = chainqd.Messages(undefined, qd.msgs.Named_property_0_of_types_1_and_2_are_not_identical, prop.symbolToString(), typeName1, typeName2);
              errorInfo = chainqd.Messages(errorInfo, qd.msgs.Interface_0_cannot_simultaneously_extend_types_1_and_2, typeToString(type), typeName1, typeName2);
              diagnostics.add(qf.make.diagForNodeFromMessageChain(typeNode, errorInfo));
            }
          }
        }
      }
      return ok;
    }
    propertyInitialization(n: qt.ClassLikeDeclaration) {
      if (!strictNullChecks || !strictPropertyInitialization || n.flags & NodeFlags.Ambient) return;
      const constructor = findConstructorDeclaration(n);
      for (const member of n.members) {
        if (qf.get.effectiveModifierFlags(member) & ModifierFlags.Ambient) continue;
        if (isInstancePropertyWithoutIniter(member)) {
          const propName = (<qt.PropertyDeclaration>member).name;
          if (propName.kind === Syntax.Identifier || propName.kind === Syntax.PrivateIdentifier) {
            const type = qf.get.symbolOfNode(member).typeOfSymbol();
            if (!(type.flags & TypeFlags.AnyOrUnknown || getFalsyFlags(type) & TypeFlags.Undefined)) {
              if (!constructor || !isPropertyInitializedInConstructor(propName, type, constructor))
                error(member.name, qd.msgs.Property_0_has_no_initer_and_is_not_definitely_assigned_in_the_constructor, declarationNameToString(propName));
            }
          }
        }
      }
    }
    interfaceDeclaration(n: qt.InterfaceDeclaration) {
      if (!checkGrammar.decoratorsAndModifiers(n)) checkGrammar.interfaceDeclaration(n);
      this.typeParams(n.typeParams);
      if (produceDiagnostics) {
        this.typeNameIsReserved(n.name, qd.msgs.Interface_name_cannot_be_0);
        this.exportsOnMergedDeclarations(n);
        const symbol = qf.get.symbolOfNode(n);
        this.typeParamListsIdentical(symbol);
        const firstInterfaceDecl = symbol.declarationOfKind<qt.InterfaceDeclaration>(Syntax.InterfaceDeclaration);
        if (n === firstInterfaceDecl) {
          const type = <qt.InterfaceType>getDeclaredTypeOfSymbol(symbol);
          const typeWithThis = qf.get.typeWithThisArg(type);
          if (this.inheritedPropertiesAreIdentical(type, n.name)) {
            for (const baseType of getBaseTypes(type)) {
              qf.type.check.assignableTo(typeWithThis, qf.get.typeWithThisArg(baseType, type.thisType), n.name, qd.msgs.Interface_0_incorrectly_extends_interface_1);
            }
            qf.type.check.qf.type.check.indexConstraints(type);
          }
        }
        this.objectTypeForDuplicateDeclarations(n);
      }
      forEach(qf.get.interfaceBaseTypeNodes(n), (heritageElem) => {
        if (!qf.is.entityNameExpression(heritageElem.expression)) error(heritageElem.expression, qd.msgs.An_interface_can_only_extend_an_identifier_Slashqualified_name_with_optional_type_args);
        this.typeReferenceNode(heritageElem);
      });
      forEach(n.members, checkSourceElem);
      if (produceDiagnostics) {
        this.typeForDuplicateIndexSignatures(n);
        registerForUnusedIdentifiersCheck(n);
      }
    }
    typeAliasDeclaration(n: qt.TypeAliasDeclaration) {
      checkGrammar.decoratorsAndModifiers(n);
      this.typeNameIsReserved(n.name, qd.msgs.Type_alias_name_cannot_be_0);
      this.exportsOnMergedDeclarations(n);
      this.typeParams(n.typeParams);
      this.sourceElem(n.type);
      registerForUnusedIdentifiersCheck(n);
    }
    enumDeclaration(n: qt.EnumDeclaration) {
      if (!produceDiagnostics) return;
      checkGrammar.decoratorsAndModifiers(n);
      this.typeNameIsReserved(n.name, qd.msgs.Enum_name_cannot_be_0);
      this.collisionWithRequireExportsInGeneratedCode(n, n.name);
      this.collisionWithGlobalPromiseInGeneratedCode(n, n.name);
      this.exportsOnMergedDeclarations(n);
      n.members.forEach(checkEnumMember);
      computeEnumMemberValues(n);
      const enumSymbol = qf.get.symbolOfNode(n);
      const firstDeclaration = enumSymbol.declarationOfKind(n.kind);
      if (n === firstDeclaration) {
        if (enumSymbol.declarations.length > 1) {
          const enumIsConst = qf.is.enumConst(n);
          forEach(enumSymbol.declarations, (decl) => {
            if (decl.kind === Syntax.EnumDeclaration && qf.is.enumConst(decl) !== enumIsConst) error(qf.decl.nameOf(decl), qd.msgs.Enum_declarations_must_all_be_const_or_non_const);
          });
        }
        let seenEnumMissingInitialIniter = false;
        forEach(enumSymbol.declarations, (declaration) => {
          if (declaration.kind !== Syntax.EnumDeclaration) return false;
          const enumDeclaration = <qt.EnumDeclaration>declaration;
          if (!enumDeclaration.members.length) return false;
          const firstEnumMember = enumDeclaration.members[0];
          if (!firstEnumMember.initer) {
            if (seenEnumMissingInitialIniter) error(firstEnumMember.name, qd.msgs.In_an_enum_with_multiple_declarations_only_one_declaration_can_omit_an_initer_for_its_first_enum_elem);
            else {
              seenEnumMissingInitialIniter = true;
            }
          }
        });
      }
    }
    enumMember(n: qt.EnumMember) {
      if (n.name.kind === Syntax.PrivateIdentifier) error(n, qd.msgs.An_enum_member_cannot_be_named_with_a_private_identifier);
    }
    moduleDeclaration(n: qt.ModuleDeclaration) {
      if (produceDiagnostics) {
        const isGlobalAugmentation = qf.is.globalScopeAugmentation(n);
        const inAmbientContext = n.flags & NodeFlags.Ambient;
        if (isGlobalAugmentation && !inAmbientContext) error(n.name, qd.msgs.Augmentations_for_the_global_scope_should_have_declare_modifier_unless_they_appear_in_already_ambient_context);
        const isAmbientExternalModule = qf.is.ambientModule(n);
        const contextErrorMessage = isAmbientExternalModule
          ? qd.msgs.An_ambient_module_declaration_is_only_allowed_at_the_top_level_in_a_file
          : qd.msgs.A_namespace_declaration_is_only_allowed_in_a_namespace_or_module;
        if (checkGrammar.moduleElemContext(n, contextErrorMessage)) return;
        if (!checkGrammar.decoratorsAndModifiers(n)) {
          if (!inAmbientContext && n.name.kind === Syntax.StringLiteral) grammarErrorOnNode(n.name, qd.msgs.Only_ambient_modules_can_use_quoted_names);
        }
        if (n.name.kind === Syntax.Identifier) {
          this.collisionWithRequireExportsInGeneratedCode(n, n.name);
          this.collisionWithGlobalPromiseInGeneratedCode(n, n.name);
        }
        this.exportsOnMergedDeclarations(n);
        const symbol = qf.get.symbolOfNode(n);
        if (
          symbol.flags & qt.SymbolFlags.ValueModule &&
          !inAmbientContext &&
          symbol.declarations.length > 1 &&
          isInstantiatedModule(n, !!compilerOpts.preserveConstEnums || !!compilerOpts.isolatedModules)
        ) {
          const firstNonAmbientClassOrFunc = getFirstNonAmbientClassOrFunctionDeclaration(symbol);
          if (firstNonAmbientClassOrFunc) {
            if (n.sourceFile !== firstNonAmbientClassOrFunc.sourceFile) error(n.name, qd.msgs.A_namespace_declaration_cannot_be_in_a_different_file_from_a_class_or_function_with_which_it_is_merged);
            else if (n.pos < firstNonAmbientClassOrFunc.pos) {
              error(n.name, qd.msgs.A_namespace_declaration_cannot_be_located_prior_to_a_class_or_function_with_which_it_is_merged);
            }
          }
          const mergedClass = symbol.declarationOfKind(Syntax.ClassDeclaration);
          if (mergedClass && inSameLexicalScope(n, mergedClass)) qf.get.nodeLinks(n).flags |= NodeCheckFlags.LexicalModuleMergesWithClass;
        }
        if (isAmbientExternalModule) {
          if (qf.is.externalModuleAugmentation(n)) {
            const checkBody = isGlobalAugmentation || qf.get.symbolOfNode(n).flags & qt.SymbolFlags.Transient;
            if (checkBody && n.body) {
              for (const statement of n.body.statements) {
                this.moduleAugmentationElem(statement, isGlobalAugmentation);
              }
            }
          } else if (qf.is.globalSourceFile(n.parent)) {
            if (isGlobalAugmentation) error(n.name, qd.msgs.Augmentations_for_the_global_scope_can_only_be_directly_nested_in_external_modules_or_ambient_module_declarations);
            else if (isExternalModuleNameRelative(qf.get.textOfIdentifierOrLiteral(n.name))) {
              error(n.name, qd.msgs.Ambient_module_declaration_cannot_specify_relative_module_name);
            }
          } else {
            if (isGlobalAugmentation) error(n.name, qd.msgs.Augmentations_for_the_global_scope_can_only_be_directly_nested_in_external_modules_or_ambient_module_declarations);
            else {
              error(n.name, qd.msgs.Ambient_modules_cannot_be_nested_in_other_modules_or_namespaces);
            }
          }
        }
      }
      if (n.body) {
        this.sourceElem(n.body);
        if (!qf.is.globalScopeAugmentation(n)) registerForUnusedIdentifiersCheck(n);
      }
    }
    moduleAugmentationElem(n: Node, isGlobalAugmentation: boolean): void {
      switch (n.kind) {
        case Syntax.VariableStatement:
          for (const decl of (<qt.VariableStatement>n).declarationList.declarations) {
            this.moduleAugmentationElem(decl, isGlobalAugmentation);
          }
          break;
        case Syntax.ExportAssignment:
        case Syntax.ExportDeclaration:
          grammarErrorOnFirstToken(n, qd.msgs.Exports_and_export_assignments_are_not_permitted_in_module_augmentations);
          break;
        case Syntax.ImportEqualsDeclaration:
        case Syntax.ImportDeclaration:
          grammarErrorOnFirstToken(n, qd.msgs.Imports_are_not_permitted_in_module_augmentations_Consider_moving_them_to_the_enclosing_external_module);
          break;
        case Syntax.BindingElem:
        case Syntax.VariableDeclaration:
          const name = (<qt.VariableDeclaration | qt.BindingElem>n).name;
          if (name.kind === Syntax.BindingPattern) {
            for (const el of name.elems) {
              this.moduleAugmentationElem(el, isGlobalAugmentation);
            }
            break;
          }
        case Syntax.ClassDeclaration:
        case Syntax.EnumDeclaration:
        case Syntax.FunctionDeclaration:
        case Syntax.InterfaceDeclaration:
        case Syntax.ModuleDeclaration:
        case Syntax.TypeAliasDeclaration:
          if (isGlobalAugmentation) return;
          const symbol = qf.get.symbolOfNode(n);
          if (symbol) {
            let reportError = !(symbol.flags & qt.SymbolFlags.Transient);
            if (!reportError) reportError = !!symbol.parent && qf.is.externalModuleAugmentation(symbol.parent.declarations[0]);
          }
          break;
      }
    }
    externalImportOrExportDeclaration(n: qt.ImportDeclaration | qt.ImportEqualsDeclaration | qt.ExportDeclaration): boolean {
      const moduleName = qf.get.externalModuleName(n);
      if (!moduleName || qf.is.missing(moduleName)) return false;
      if (!moduleName.kind === Syntax.StringLiteral) {
        error(moduleName, qd.msgs.String_literal_expected);
        return false;
      }
      const inAmbientExternalModule = n.parent.kind === Syntax.ModuleBlock && qf.is.ambientModule(n.parent.parent);
      if (n.parent.kind !== Syntax.SourceFile && !inAmbientExternalModule) {
        error(moduleName, n.kind === Syntax.ExportDeclaration ? qd.msgs.Export_declarations_are_not_permitted_in_a_namespace : qd.msgs.Import_declarations_in_a_namespace_cannot_reference_a_module);
        return false;
      }
      if (inAmbientExternalModule && isExternalModuleNameRelative(moduleName.text)) {
        if (!isTopLevelInExternalModuleAugmentation(n)) {
          error(n, qd.msgs.Import_or_export_declaration_in_an_ambient_module_declaration_cannot_reference_module_through_relative_module_name);
          return false;
        }
      }
      return true;
    }
    aliasSymbol(n: qt.ImportEqualsDeclaration | qt.ImportClause | qt.NamespaceImport | qt.ImportSpecifier | qt.ExportSpecifier | qt.NamespaceExport) {
      let symbol = qf.get.symbolOfNode(n);
      const target = this.resolveAlias();
      const shouldSkipWithJSExpandoTargets = symbol.flags & qt.SymbolFlags.Assignment;
      if (!shouldSkipWithJSExpandoTargets && target !== unknownSymbol) {
        symbol = qf.get.mergedSymbol(symbol.exportSymbol || symbol);
        const excludedMeanings =
          (symbol.flags & (SymbolFlags.Value | qt.SymbolFlags.ExportValue) ? qt.SymbolFlags.Value : 0) |
          (symbol.flags & qt.SymbolFlags.Type ? qt.SymbolFlags.Type : 0) |
          (symbol.flags & qt.SymbolFlags.Namespace ? qt.SymbolFlags.Namespace : 0);
        if (target.flags & excludedMeanings) {
          const message = n.kind === Syntax.ExportSpecifier ? qd.msgs.Export_declaration_conflicts_with_exported_declaration_of_0 : qd.msgs.Import_declaration_conflicts_with_local_declaration_of_0;
          error(n, message, symbol.symbolToString());
        }
        if (compilerOpts.isolatedModules && n.kind === Syntax.ExportSpecifier && !n.parent.parent.isTypeOnly && !(target.flags & qt.SymbolFlags.Value) && !(n.flags & NodeFlags.Ambient))
          error(n, qd.msgs.Re_exporting_a_type_when_the_isolatedModules_flag_is_provided_requires_using_export_type);
      }
    }
    importBinding(n: qt.ImportEqualsDeclaration | qt.ImportClause | qt.NamespaceImport | qt.ImportSpecifier) {
      this.collisionWithRequireExportsInGeneratedCode(n, n.name!);
      this.collisionWithGlobalPromiseInGeneratedCode(n, n.name!);
      this.aliasSymbol(n);
    }
    importDeclaration(n: qt.ImportDeclaration) {
      if (checkGrammar.moduleElemContext(n, qd.msgs.An_import_declaration_can_only_be_used_in_a_namespace_or_module)) return;
      if (!checkGrammar.decoratorsAndModifiers(n) && qf.has.effectiveModifiers(n)) grammarErrorOnFirstToken(n, qd.msgs.An_import_declaration_cannot_have_modifiers);
      if (this.externalImportOrExportDeclaration(n)) {
        const importClause = n.importClause;
        if (importClause && !checkGrammar.importClause(importClause)) {
          if (importClause.name) this.importBinding(importClause);
          if (importClause.namedBindings) {
            if (importClause.namedBindings.kind === Syntax.NamespaceImport) this.importBinding(importClause.namedBindings);
            else {
              const moduleExisted = resolveExternalModuleName(n, n.moduleSpecifier);
              if (moduleExisted) forEach(importClause.namedBindings.elems, checkImportBinding);
            }
          }
        }
      }
    }
    importEqualsDeclaration(n: qt.ImportEqualsDeclaration) {
      if (checkGrammar.moduleElemContext(n, qd.msgs.An_import_declaration_can_only_be_used_in_a_namespace_or_module)) return;
      checkGrammar.decoratorsAndModifiers(n);
      if (qf.is.internalModuleImportEqualsDeclaration(n) || this.externalImportOrExportDeclaration(n)) {
        this.importBinding(n);
        if (qf.has.syntacticModifier(n, ModifierFlags.Export)) markExportAsReferenced(n);
        if (n.moduleReference.kind !== Syntax.ExternalModuleReference) {
          const target = qf.get.symbolOfNode(n).resolveAlias();
          if (target !== unknownSymbol) {
            if (target.flags & qt.SymbolFlags.Value) {
              const moduleName = qf.get.firstIdentifier(n.moduleReference);
              if (!(resolveEntityName(moduleName, qt.SymbolFlags.Value | qt.SymbolFlags.Namespace)!.flags & qt.SymbolFlags.Namespace))
                error(moduleName, qd.msgs.Module_0_is_hidden_by_a_local_declaration_with_the_same_name, declarationNameToString(moduleName));
            }
            if (target.flags & qt.SymbolFlags.Type) this.typeNameIsReserved(n.name, qd.msgs.Import_name_cannot_be_0);
          }
        } else {
          if (moduleKind >= ModuleKind.ES2015 && !(n.flags & NodeFlags.Ambient)) {
            grammarErrorOnNode(
              n,
              qd.msgs
                .Import_assignment_cannot_be_used_when_targeting_ECMAScript_modules_Consider_using_import_Asterisk_as_ns_from_mod_import_a_from_mod_import_d_from_mod_or_another_module_format_instead
            );
          }
        }
      }
    }
    exportDeclaration(n: qt.ExportDeclaration) {
      if (checkGrammar.moduleElemContext(n, qd.msgs.An_export_declaration_can_only_be_used_in_a_module)) return;
      if (!checkGrammar.decoratorsAndModifiers(n) && qf.has.effectiveModifiers(n)) grammarErrorOnFirstToken(n, qd.msgs.An_export_declaration_cannot_have_modifiers);
      checkGrammar.exportDeclaration(n);
      if (!n.moduleSpecifier || this.externalImportOrExportDeclaration(n)) {
        if (n.exportClause && !n.exportClause.kind === Syntax.NamespaceExport) {
          forEach(n.exportClause.elems, checkExportSpecifier);
          const inAmbientExternalModule = n.parent.kind === Syntax.ModuleBlock && qf.is.ambientModule(n.parent.parent);
          const inAmbientNamespaceDeclaration = !inAmbientExternalModule && n.parent.kind === Syntax.ModuleBlock && !n.moduleSpecifier && n.flags & NodeFlags.Ambient;
          if (n.parent.kind !== Syntax.SourceFile && !inAmbientExternalModule && !inAmbientNamespaceDeclaration) error(n, qd.msgs.Export_declarations_are_not_permitted_in_a_namespace);
        } else {
          const moduleSymbol = resolveExternalModuleName(n, n.moduleSpecifier!);
          if (moduleSymbol && hasExportAssignmentSymbol(moduleSymbol)) error(n.moduleSpecifier, qd.msgs.Module_0_uses_export_and_cannot_be_used_with_export_Asterisk, moduleSymbol.symbolToString());
          else if (n.exportClause) {
            this.aliasSymbol(n.exportClause);
          }
          if (moduleKind !== ModuleKind.System && moduleKind < ModuleKind.ES2015) this.externalEmitHelpers(n, ExternalEmitHelpers.ExportStar);
        }
      }
    }
    importsForTypeOnlyConversion(sourceFile: qt.SourceFile) {
      for (const statement of sourceFile.statements) {
        if (
          statement.kind === Syntax.ImportDeclaration &&
          statement.importClause &&
          !statement.importClause.isTypeOnly &&
          importClauseContainsReferencedImport(statement.importClause) &&
          !referencedAliasDeclaration(statement.importClause, true) &&
          !importClauseContainsConstEnumUsedAsValue(statement.importClause)
        ) {
          error(statement, qd.msgs.This_import_is_never_used_as_a_value_and_must_use_import_type_because_the_importsNotUsedAsValues_is_set_to_error);
        }
      }
    }
    exportSpecifier(n: qt.ExportSpecifier) {
      this.aliasSymbol(n);
      if (getEmitDeclarations(compilerOpts)) collectLinkedAliases(n.propertyName || n.name, true);
      if (!n.parent.parent.moduleSpecifier) {
        const exportedName = n.propertyName || n.name;
        const symbol = resolveName(exportedName, exportedName.escapedText, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace | qt.SymbolFlags.Alias, undefined, undefined, true);
        if (symbol && (symbol === undefinedSymbol || symbol === globalThisSymbol || qf.is.globalSourceFile(getDeclarationContainer(symbol.declarations[0]))))
          error(exportedName, qd.msgs.Cannot_export_0_Only_local_declarations_can_be_exported_from_a_module, idText(exportedName));
        else {
          markExportAsReferenced(n);
          const target = symbol && (symbol.flags & qt.SymbolFlags.Alias ? this.resolveAlias() : symbol);
          if (!target || target === unknownSymbol || target.flags & qt.SymbolFlags.Value) this.expressionCached(n.propertyName || n.name);
        }
      }
    }
    exportAssignment(n: qt.ExportAssignment) {
      if (checkGrammar.moduleElemContext(n, qd.msgs.An_export_assignment_can_only_be_used_in_a_module)) return;
      const container = n.parent.kind === Syntax.SourceFile ? n.parent : <qt.ModuleDeclaration>n.parent.parent;
      if (container.kind === Syntax.ModuleDeclaration && !qf.is.ambientModule(container)) {
        if (n.isExportEquals) error(n, qd.msgs.An_export_assignment_cannot_be_used_in_a_namespace);
        else {
          error(n, qd.msgs.A_default_export_can_only_be_used_in_an_ECMAScript_style_module);
        }
        return;
      }
      if (!checkGrammar.decoratorsAndModifiers(n) && qf.has.effectiveModifiers(n)) grammarErrorOnFirstToken(n, qd.msgs.An_export_assignment_cannot_have_modifiers);
      if (n.expression.kind === Syntax.qc.Identifier) {
        const id = n.expression as qc.Identifier;
        const sym = resolveEntityName(id, qt.SymbolFlags.All, true, true, n);
        if (sym) {
          markAliasReferenced(sym, id);
          const target = sym.flags & qt.SymbolFlags.Alias ? sym.resolveAlias() : sym;
          if (target === unknownSymbol || target.flags & qt.SymbolFlags.Value) this.expressionCached(n.expression);
        }
        if (getEmitDeclarations(compilerOpts)) collectLinkedAliases(n.expression as qc.Identifier, true);
      } else {
        this.expressionCached(n.expression);
      }
      this.externalModuleExports(container);
      if (n.flags & NodeFlags.Ambient && !qf.is.entityNameExpression(n.expression))
        grammarErrorOnNode(n.expression, qd.msgs.The_expression_of_an_export_assignment_must_be_an_identifier_or_qualified_name_in_an_ambient_context);
      if (n.isExportEquals && !(n.flags & NodeFlags.Ambient)) {
        if (moduleKind >= ModuleKind.ES2015)
          grammarErrorOnNode(n, qd.msgs.Export_assignment_cannot_be_used_when_targeting_ECMAScript_modules_Consider_using_export_default_or_another_module_format_instead);
        else if (moduleKind === ModuleKind.System) {
          grammarErrorOnNode(n, qd.msgs.Export_assignment_is_not_supported_when_module_flag_is_system);
        }
      }
    }
    externalModuleExports(n: qt.SourceFile | qt.ModuleDeclaration) {
      const moduleSymbol = qf.get.symbolOfNode(n);
      const links = moduleSymbol.links;
      if (!links.exportsChecked) {
        const exportEqualsSymbol = moduleSymbol.exports!.get('export=' as qu.__String);
        if (exportEqualsSymbol && hasExportedMembers(moduleSymbol)) {
          const declaration = exportEqualsSymbol.getDeclarationOfAliasSymbol() || exportEqualsSymbol.valueDeclaration;
          if (!isTopLevelInExternalModuleAugmentation(declaration) && !qf.is.inJSFile(declaration))
            error(declaration, qd.msgs.An_export_assignment_cannot_be_used_in_a_module_with_other_exported_elems);
        }
        const exports = qf.get.exportsOfModule(moduleSymbol);
        if (exports) {
          exports.forEach(({ declarations, flags }, id) => {
            if (id === '__export') return;
            if (flags & (SymbolFlags.Namespace | qt.SymbolFlags.Interface | qt.SymbolFlags.Enum)) return;
            const exportedDeclarationsCount = countWhere(declarations, qu.and(qf.is.notOverload, qf.is.notAccessor));
            if (flags & qt.SymbolFlags.TypeAlias && exportedDeclarationsCount <= 2) return;
            if (exportedDeclarationsCount > 1) {
              for (const declaration of declarations) {
                if (isNotOverload(declaration)) diagnostics.add(qf.make.diagForNode(declaration, qd.msgs.Cannot_redeclare_exported_variable_0, qy.get.unescUnderscores(id)));
              }
            }
          });
        }
        links.exportsChecked = true;
      }
    }
    sourceElem(n: Node | undefined): void {
      if (n) {
        const saveCurrentNode = currentNode;
        currentNode = n;
        instantiationCount = 0;
        this.sourceElemWorker(n);
        currentNode = saveCurrentNode;
      }
    }
    sourceElemWorker(n: Node): void {
      if (qf.is.inJSFile(n)) forEach((n as qt.DocContainer).doc, ({ tags }) => forEach(tags, checkSourceElem));
      const kind = n.kind;
      if (cancellationToken) {
        switch (kind) {
          case Syntax.ModuleDeclaration:
          case Syntax.ClassDeclaration:
          case Syntax.InterfaceDeclaration:
          case Syntax.FunctionDeclaration:
            cancellationToken.throwIfCancellationRequested();
        }
      }
      if (kind >= Syntax.FirstStatement && kind <= Syntax.LastStatement && n.flowNode && !isReachableFlowNode(n.flowNode))
        errorOrSuggestion(compilerOpts.allowUnreachableCode === false, n, qd.msgs.Unreachable_code_detected);
      switch (kind) {
        case Syntax.TypeParam:
          return this.typeParam(<qt.TypeParamDeclaration>n);
        case Syntax.Param:
          return this.param(<qt.ParamDeclaration>n);
        case Syntax.PropertyDeclaration:
          return this.propertyDeclaration(<qt.PropertyDeclaration>n);
        case Syntax.PropertySignature:
          return this.propertySignature(<qt.PropertySignature>n);
        case Syntax.FunctionTyping:
        case Syntax.ConstructorTyping:
        case Syntax.CallSignature:
        case Syntax.ConstructSignature:
        case Syntax.IndexSignature:
          return this.signatureDeclaration(<qt.SignatureDeclaration>n);
        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
          return this.methodDeclaration(<qt.MethodDeclaration | qt.MethodSignature>n);
        case Syntax.Constructor:
          return this.constructorDeclaration(<qt.ConstructorDeclaration>n);
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          return this.accessorDeclaration(<qt.AccessorDeclaration>n);
        case Syntax.TypingReference:
          return this.typeReferenceNode(<qt.TypingReference>n);
        case Syntax.TypingPredicate:
          return this.typePredicate(<qt.TypingPredicate>n);
        case Syntax.TypingQuery:
          return this.typeQuery(<qt.TypingQuery>n);
        case Syntax.TypingLiteral:
          return this.typeLiteral(<qt.TypingLiteral>n);
        case Syntax.ArrayTyping:
          return this.arrayType(<qt.ArrayTyping>n);
        case Syntax.TupleTyping:
          return this.tupleType(<qt.TupleTyping>n);
        case Syntax.UnionTyping:
        case Syntax.IntersectionTyping:
          return this.unionOrIntersectionType(<qc.UnionOrIntersectionTyping>n);
        case Syntax.ParenthesizedTyping:
        case Syntax.OptionalTyping:
        case Syntax.RestTyping:
          return this.sourceElem((<qt.ParenthesizedTyping | qt.OptionalTyping | qt.RestTyping>n).type);
        case Syntax.ThisTyping:
          return this.thisType(<qt.ThisTyping>n);
        case Syntax.TypingOperator:
          return this.typeOperator(<qt.TypingOperator>n);
        case Syntax.ConditionalTyping:
          return this.conditionalType(<qt.ConditionalTyping>n);
        case Syntax.InferTyping:
          return this.inferType(<qt.InferTyping>n);
        case Syntax.ImportTyping:
          return this.importType(<qt.ImportTyping>n);
        case Syntax.NamedTupleMember:
          return this.namedTupleMember(<qt.NamedTupleMember>n);
        case Syntax.DocAugmentsTag:
          return this.docAugmentsTag(n as qt.DocAugmentsTag);
        case Syntax.DocImplementsTag:
          return this.docImplementsTag(n as qt.DocImplementsTag);
        case Syntax.DocTypedefTag:
        case Syntax.DocCallbackTag:
        case Syntax.DocEnumTag:
          return this.docTypeAliasTag(n as qt.DocTypedefTag);
        case Syntax.DocTemplateTag:
          return this.docTemplateTag(n as qt.DocTemplateTag);
        case Syntax.DocTypeTag:
          return this.docTypeTag(n as qt.DocTypeTag);
        case Syntax.DocParamTag:
          return this.docParamTag(n as qt.DocParamTag);
        case Syntax.DocPropertyTag:
          return this.docPropertyTag(n as qt.DocPropertyTag);
        case Syntax.DocFunctionTyping:
          this.docFunctionType(n as qt.DocFunctionTyping);
        case Syntax.DocNonNullableTyping:
        case Syntax.DocNullableTyping:
        case Syntax.DocAllTyping:
        case Syntax.DocUnknownTyping:
        case Syntax.DocTypingLiteral:
          this.docTypeIsInJsFile(n);
          qf.each.child(n, checkSourceElem);
          return;
        case Syntax.DocVariadicTyping:
          this.docVariadicType(n as qt.DocVariadicTyping);
          return;
        case Syntax.DocTypingExpression:
          return this.sourceElem((n as qt.DocTypingExpression).type);
        case Syntax.IndexedAccessTyping:
          return this.indexedAccessType(<qt.IndexedAccessTyping>n);
        case Syntax.MappedTyping:
          return this.mappedType(<qt.MappedTyping>n);
        case Syntax.FunctionDeclaration:
          return this.functionDeclaration(<qt.FunctionDeclaration>n);
        case Syntax.Block:
        case Syntax.ModuleBlock:
          return this.block(<qt.Block>n);
        case Syntax.VariableStatement:
          return this.variableStatement(<qt.VariableStatement>n);
        case Syntax.ExpressionStatement:
          return this.expressionStatement(<qt.ExpressionStatement>n);
        case Syntax.IfStatement:
          return this.ifStatement(<qt.IfStatement>n);
        case Syntax.DoStatement:
          return this.doStatement(<qt.DoStatement>n);
        case Syntax.WhileStatement:
          return this.whileStatement(<qt.WhileStatement>n);
        case Syntax.ForStatement:
          return this.forStatement(<qt.ForStatement>n);
        case Syntax.ForInStatement:
          return this.forInStatement(<qt.ForInStatement>n);
        case Syntax.ForOfStatement:
          return this.forOfStatement(<qt.ForOfStatement>n);
        case Syntax.ContinueStatement:
        case Syntax.BreakStatement:
          return this.breakOrContinueStatement(<qt.BreakOrContinueStatement>n);
        case Syntax.ReturnStatement:
          return this.returnStatement(<qt.ReturnStatement>n);
        case Syntax.WithStatement:
          return this.withStatement(<qt.WithStatement>n);
        case Syntax.SwitchStatement:
          return this.switchStatement(<qt.SwitchStatement>n);
        case Syntax.LabeledStatement:
          return this.labeledStatement(<qt.LabeledStatement>n);
        case Syntax.ThrowStatement:
          return this.throwStatement(<qt.ThrowStatement>n);
        case Syntax.TryStatement:
          return this.tryStatement(<qt.TryStatement>n);
        case Syntax.VariableDeclaration:
          return this.variableDeclaration(<qt.VariableDeclaration>n);
        case Syntax.BindingElem:
          return this.bindingElem(<qt.BindingElem>n);
        case Syntax.ClassDeclaration:
          return this.classDeclaration(<qt.ClassDeclaration>n);
        case Syntax.InterfaceDeclaration:
          return this.interfaceDeclaration(<qt.InterfaceDeclaration>n);
        case Syntax.TypeAliasDeclaration:
          return this.typeAliasDeclaration(<qt.TypeAliasDeclaration>n);
        case Syntax.EnumDeclaration:
          return this.enumDeclaration(<qt.EnumDeclaration>n);
        case Syntax.ModuleDeclaration:
          return this.moduleDeclaration(<qt.ModuleDeclaration>n);
        case Syntax.ImportDeclaration:
          return this.importDeclaration(<qt.ImportDeclaration>n);
        case Syntax.ImportEqualsDeclaration:
          return this.importEqualsDeclaration(<qt.ImportEqualsDeclaration>n);
        case Syntax.ExportDeclaration:
          return this.exportDeclaration(<qt.ExportDeclaration>n);
        case Syntax.ExportAssignment:
          return this.exportAssignment(<qt.ExportAssignment>n);
        case Syntax.EmptyStatement:
        case Syntax.DebuggerStatement:
          checkGrammar.statementInAmbientContext(n);
          return;
        case Syntax.MissingDeclaration:
          return this.missingDeclaration(n);
      }
    }
    docTypeIsInJsFile(n: Node): void {
      if (!qf.is.inJSFile(n)) grammarErrorOnNode(n, qd.msgs.Doc_types_can_only_be_used_inside_documentation_comments);
    }
    docVariadicType(n: qt.DocVariadicTyping): void {
      this.docTypeIsInJsFile(n);
      this.sourceElem(n.type);
      const { parent } = n;
      if (parent.kind === Syntax.ParamDeclaration && parent.parent.kind === Syntax.DocFunctionTyping) {
        if (last(parent.parent.params) !== parent) error(n, qd.msgs.A_rest_param_must_be_last_in_a_param_list);
        return;
      }
      if (!parent.kind === Syntax.DocTypingExpression) error(n, qd.msgs.Doc_may_only_appear_in_the_last_param_of_a_signature);
      const paramTag = n.parent.parent;
      if (!paramTag.kind === Syntax.DocParamTag) {
        error(n, qd.msgs.Doc_may_only_appear_in_the_last_param_of_a_signature);
        return;
      }
      const param = qf.get.paramSymbolFromDoc(paramTag);
      if (!param) return;
      const host = qf.get.hostSignatureFromDoc(paramTag);
      if (!host || last(host.params).symbol !== param) error(n, qd.msgs.A_rest_param_must_be_last_in_a_param_list);
    }
    nodeDeferred(n: Node) {
      const enclosingFile = n.sourceFile;
      const links = qf.get.nodeLinks(enclosingFile);
      if (!(links.flags & NodeCheckFlags.TypeChecked)) {
        links.deferredNodes = links.deferredNodes || new qu.QMap();
        const id = '' + qf.get.nodeId(n);
        links.deferredNodes.set(id, n);
      }
    }
    deferredNodes(context: qt.SourceFile) {
      const links = qf.get.nodeLinks(context);
      if (links.deferredNodes) links.deferredNodes.forEach(checkDeferredNode);
    }
    deferredNode(n: Node) {
      const saveCurrentNode = currentNode;
      currentNode = n;
      instantiationCount = 0;
      switch (n.kind) {
        case Syntax.CallExpression:
        case Syntax.NewExpression:
        case Syntax.TaggedTemplateExpression:
        case Syntax.Decorator:
        case Syntax.JsxOpeningElem:
          resolveUntypedCall(n as qt.CallLikeExpression);
          break;
        case Syntax.FunctionExpression:
        case Syntax.ArrowFunction:
        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
          this.functionExpressionOrObjectLiteralMethodDeferred(<qt.FunctionExpression>n);
          break;
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          this.accessorDeclaration(<qt.AccessorDeclaration>n);
          break;
        case Syntax.ClassExpression:
          this.classExpressionDeferred(<qt.ClassExpression>n);
          break;
        case Syntax.JsxSelfClosingElem:
          this.jsxSelfClosingElemDeferred(<qt.JsxSelfClosingElem>n);
          break;
        case Syntax.JsxElem:
          this.jsxElemDeferred(<qt.JsxElem>n);
          break;
      }
      currentNode = saveCurrentNode;
    }
    sourceFile(n: qt.SourceFile) {
      performance.mark('beforeCheck');
      this.sourceFileWorker(n);
      performance.mark('afterCheck');
      performance.measure('Check', 'beforeCheck', 'afterCheck');
    }
    sourceFileWorker(n: qt.SourceFile) {
      const links = qf.get.nodeLinks(n);
      if (!(links.flags & NodeCheckFlags.TypeChecked)) {
        if (n.skipTypeChecking(compilerOpts, host)) return;
        checkGrammar.sourceFile(n);
        clear(potentialThisCollisions);
        clear(potentialNewTargetCollisions);
        clear(potentialWeakMapCollisions);
        forEach(n.statements, checkSourceElem);
        this.sourceElem(n.endOfFileToken);
        this.deferredNodes(n);
        if (qf.is.externalOrCommonJsModule(n)) registerForUnusedIdentifiersCheck(n);
        if (!n.isDeclarationFile && (compilerOpts.noUnusedLocals || compilerOpts.noUnusedParams)) {
          this.unusedIdentifiers(getPotentiallyUnusedIdentifiers(n), (containingNode, kind, diag) => {
            if (!qf.has.parseError(containingNode) && unusedIsError(kind, !!(containingNode.flags & NodeFlags.Ambient))) diagnostics.add(diag);
          });
        }
        if (compilerOpts.importsNotUsedAsValues === qt.ImportsNotUsedAsValues.Error && !n.isDeclarationFile && qf.is.externalModule(n)) this.importsForTypeOnlyConversion(n);
        if (qf.is.externalOrCommonJsModule(n)) this.externalModuleExports(n);
        if (potentialThisCollisions.length) {
          forEach(potentialThisCollisions, checkIfThisIsCapturedInEnclosingScope);
          clear(potentialThisCollisions);
        }
        if (potentialNewTargetCollisions.length) {
          forEach(potentialNewTargetCollisions, checkIfNewTargetIsCapturedInEnclosingScope);
          clear(potentialNewTargetCollisions);
        }
        if (potentialWeakMapCollisions.length) {
          forEach(potentialWeakMapCollisions, checkWeakMapCollision);
          clear(potentialWeakMapCollisions);
        }
        links.flags |= NodeCheckFlags.TypeChecked;
      }
    }
    externalEmitHelpers(n: Node, helpers: ExternalEmitHelpers) {
      if ((requestedExternalEmitHelpers & helpers) !== helpers && compilerOpts.importHelpers) {
        const sourceFile = n.sourceFile;
        if (sourceFile.isEffectiveExternalModule(compilerOpts) && !(n.flags & NodeFlags.Ambient)) {
          const helpersModule = resolveHelpersModule(sourceFile, n);
          if (helpersModule !== unknownSymbol) {
            const uncheckedHelpers = helpers & ~requestedExternalEmitHelpers;
            for (let helper = ExternalEmitHelpers.FirstEmitHelper; helper <= ExternalEmitHelpers.LastEmitHelper; helper <<= 1) {
              if (uncheckedHelpers & helper) {
                const name = getHelperName(helper);
                const s = helpersModule.exports!.fetch(qy.get.escUnderscores(name), qt.SymbolFlags.Value);
                if (!s) error(n, qd.msgs.This_syntax_requires_an_imported_helper_named_1_which_does_not_exist_in_0_Consider_upgrading_your_version_of_0, qt.externalHelpersModuleNameText, name);
              }
            }
          }
          requestedExternalEmitHelpers |= helpers;
        }
      }
    }
    ambientIniter(n: qt.VariableDeclaration | qt.PropertyDeclaration | qt.PropertySignature) {
      const { initer } = n;
      if (initer) {
        const isInvalidIniter = !(
          qf.is.stringLiteralOrNumberLiteralExpression(initer) ||
          isSimpleLiteralEnumReference(initer) ||
          initer.kind === Syntax.TrueKeyword ||
          initer.kind === Syntax.FalseKeyword ||
          qt.BigIntLiteral.expression(initer)
        );
        const isConstOrReadonly = qf.is.declarationReadonly(n) || (n.kind === Syntax.VariableDeclaration && qf.is.varConst(n));
        if (isConstOrReadonly && !n.type) {
          if (isInvalidIniter) return grammarErrorOnNode(initer, qd.msgs.A_const_initer_in_an_ambient_context_must_be_a_string_or_numeric_literal_or_literal_enum_reference);
        }
        return grammarErrorOnNode(initer, qd.msgs.Initers_are_not_allowed_in_ambient_contexts);
        if (!isConstOrReadonly || isInvalidIniter) return grammarErrorOnNode(initer, qd.msgs.Initers_are_not_allowed_in_ambient_contexts);
      }
      return;
    }
    eSModuleMarker(name: qt.Identifier | qt.BindingPattern): boolean {
      if (name.kind === Syntax.qc.Identifier) {
        if (idText(name) === '__esModule') return grammarErrorOnNode(name, qd.msgs.Identifier_expected_esModule_is_reserved_as_an_exported_marker_when_transforming_ECMAScript_modules);
      } else {
        const elems = name.elems;
        for (const elem of elems) {
          if (!elem.kind === Syntax.OmittedExpression) return this.eSModuleMarker(elem.name);
        }
      }
      return false;
    }
    numericLiteralValueSize(n: qt.NumericLiteral) {
      if (n.numericLiteralFlags & TokenFlags.Scientific || n.text.length <= 15 || n.text.indexOf('.') !== -1) return;
      const apparentValue = +qf.get.textOf(n);
      if (apparentValue <= 2 ** 53 - 1 && apparentValue + 1 > apparentValue) return;
      addErrorOrSuggestion(false, qf.make.diagForNode(n, qd.msgs.Numeric_literals_with_absolute_values_equal_to_2_53_or_greater_are_too_large_to_be_represented_accurately_as_integers));
    }
    typeArgs(signature: qt.Signature, typeArgNodes: readonly qt.Typing[], reportErrors: boolean, headMessage?: qd.Message): qt.Type[] | undefined {
      const isJavascript = qf.is.inJSFile(signature.declaration);
      const typeParams = signature.typeParams!;
      const typeArgTypes = fillMissingTypeArgs(map(typeArgNodes, qf.get.typeFromTypeNode), typeParams, getMinTypeArgCount(typeParams), isJavascript);
      let mapper: qt.TypeMapper | undefined;
      for (let i = 0; i < typeArgNodes.length; i++) {
        qf.assert.true(typeParams[i] !== undefined, 'Should not call checkTypeArgs with too many type args');
        const constraint = qf.get.constraintOfTypeParam(typeParams[i]);
        if (constraint) {
          const errorInfo = reportErrors && headMessage ? () => chainqd.Messages(undefined, qd.msgs.Type_0_does_not_satisfy_the_constraint_1) : undefined;
          const typeArgHeadMessage = headMessage || qd.msgs.Type_0_does_not_satisfy_the_constraint_1;
          if (!mapper) mapper = createTypeMapper(typeParams, typeArgTypes);
          const typeArg = typeArgTypes[i];
          if (!qf.type.check.assignableTo(typeArg, qf.get.typeWithThisArg(instantiateType(constraint, mapper), typeArg), reportErrors ? typeArgNodes[i] : undefined, typeArgHeadMessage, errorInfo)) {
            return;
          }
        }
      }
      return typeArgTypes;
    }
    grammar = new (class {
      exportDeclaration(n: qt.ExportDeclaration): boolean {
        const isTypeOnlyExportStar = n.isTypeOnly && n.exportClause?.kind !== Syntax.NamedExports;
        if (isTypeOnlyExportStar) grammarErrorOnNode(n, qd.msgs.Only_named_exports_may_use_export_type);
        return !isTypeOnlyExportStar;
      }
      moduleElemContext(n: qt.Statement, errorMessage: qd.Message): boolean {
        const isInAppropriateContext = n.parent.kind === Syntax.SourceFile || n.parent.kind === Syntax.ModuleBlock || n.parent.kind === Syntax.ModuleDeclaration;
        if (!isInAppropriateContext) grammarErrorOnFirstToken(n, errorMessage);
        return !isInAppropriateContext;
      }
      decoratorsAndModifiers(n: Node): boolean {
        return this.decorators(n) || this.modifiers(n);
      }
      decorators(n: Node): boolean {
        if (!n.decorators) return false;
        if (!qf.is.decoratable(n, n.parent, n.parent.parent)) {
          if (n.kind === Syntax.MethodDeclaration && !qf.is.present((<qt.MethodDeclaration>n).body))
            return grammarErrorOnFirstToken(n, qd.msgs.A_decorator_can_only_decorate_a_method_implementation_not_an_overload);
          return grammarErrorOnFirstToken(n, qd.msgs.Decorators_are_not_valid_here);
        } else if (n.kind === Syntax.GetAccessor || n.kind === Syntax.SetAccessor) {
          const accessors = qf.get.allAccessorDeclarations((<qt.ClassDeclaration>n.parent).members, <qt.AccessorDeclaration>n);
          if (accessors.firstAccessor.decorators && n === accessors.secondAccessor)
            return grammarErrorOnFirstToken(n, qd.msgs.Decorators_cannot_be_applied_to_multiple_get_Slashset_accessors_of_the_same_name);
        }
        return false;
      }
      modifiers(n: Node): boolean {
        const quickResult = reportObviousModifierErrors(n);
        if (quickResult !== undefined) return quickResult;
        let lastStatic: Node | undefined, lastDeclare: Node | undefined, lastAsync: Node | undefined, lastReadonly: Node | undefined;
        let flags = ModifierFlags.None;
        for (const modifier of n.modifiers!) {
          if (modifier.kind !== Syntax.ReadonlyKeyword) {
            if (n.kind === Syntax.PropertySignature || n.kind === Syntax.MethodSignature)
              return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_appear_on_a_type_member, qt.Token.toString(modifier.kind));
            if (n.kind === Syntax.IndexSignature) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_appear_on_an_index_signature, qt.Token.toString(modifier.kind));
          }
          switch (modifier.kind) {
            case Syntax.ConstKeyword:
              if (n.kind !== Syntax.EnumDeclaration) return grammarErrorOnNode(n, qd.msgs.A_class_member_cannot_have_the_0_keyword, qt.Token.toString(Syntax.ConstKeyword));
              break;
            case Syntax.PublicKeyword:
            case Syntax.ProtectedKeyword:
            case Syntax.PrivateKeyword:
              const text = visibilityToString(qy.get.modifierFlag(modifier.kind));
              if (flags & ModifierFlags.AccessibilityModifier) return grammarErrorOnNode(modifier, qd.msgs.Accessibility_modifier_already_seen);
              else if (flags & ModifierFlags.Static) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_must_precede_1_modifier, text, 'static');
              else if (flags & ModifierFlags.Readonly) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_must_precede_1_modifier, text, 'readonly');
              else if (flags & ModifierFlags.Async) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_must_precede_1_modifier, text, 'async');
              else if (n.parent.kind === Syntax.ModuleBlock || n.parent.kind === Syntax.SourceFile)
                return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_appear_on_a_module_or_namespace_elem, text);
              else if (flags & ModifierFlags.Abstract) {
                if (modifier.kind === Syntax.PrivateKeyword) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_be_used_with_1_modifier, text, 'abstract');
                return grammarErrorOnNode(modifier, qd.msgs._0_modifier_must_precede_1_modifier, text, 'abstract');
              } else if (qf.is.privateIdentifierPropertyDeclaration(n)) {
                return grammarErrorOnNode(modifier, qd.msgs.An_accessibility_modifier_cannot_be_used_with_a_private_identifier);
              }
              flags |= qy.get.modifierFlag(modifier.kind);
              break;
            case Syntax.StaticKeyword:
              if (flags & ModifierFlags.Static) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_already_seen, 'static');
              else if (flags & ModifierFlags.Readonly) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_must_precede_1_modifier, 'static', 'readonly');
              else if (flags & ModifierFlags.Async) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_must_precede_1_modifier, 'static', 'async');
              else if (n.parent.kind === Syntax.ModuleBlock || n.parent.kind === Syntax.SourceFile)
                return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_appear_on_a_module_or_namespace_elem, 'static');
              else if (n.kind === Syntax.Param) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_appear_on_a_param, 'static');
              else if (flags & ModifierFlags.Abstract) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_be_used_with_1_modifier, 'static', 'abstract');
              else if (qf.is.privateIdentifierPropertyDeclaration(n)) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_be_used_with_a_private_identifier, 'static');
              flags |= ModifierFlags.Static;
              lastStatic = modifier;
              break;
            case Syntax.ReadonlyKeyword:
              if (flags & ModifierFlags.Readonly) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_already_seen, 'readonly');
              else if (n.kind !== Syntax.PropertyDeclaration && n.kind !== Syntax.PropertySignature && n.kind !== Syntax.IndexSignature && n.kind !== Syntax.Param)
                return grammarErrorOnNode(modifier, qd.readonly_modifier_can_only_appear_on_a_property_declaration_or_index_signature);
              flags |= ModifierFlags.Readonly;
              lastReadonly = modifier;
              break;
            case Syntax.ExportKeyword:
              if (flags & ModifierFlags.Export) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_already_seen, 'export');
              else if (flags & ModifierFlags.Ambient) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_must_precede_1_modifier, 'export', 'declare');
              else if (flags & ModifierFlags.Abstract) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_must_precede_1_modifier, 'export', 'abstract');
              else if (flags & ModifierFlags.Async) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_must_precede_1_modifier, 'export', 'async');
              else if (qf.is.classLike(n.parent)) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_appear_on_a_class_elem, 'export');
              else if (n.kind === Syntax.Param) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_appear_on_a_param, 'export');
              flags |= ModifierFlags.Export;
              break;
            case Syntax.DefaultKeyword:
              const container = n.parent.kind === Syntax.SourceFile ? n.parent : n.parent.parent;
              if (container.kind === Syntax.ModuleDeclaration && !qf.is.ambientModule(container))
                return grammarErrorOnNode(modifier, qd.msgs.A_default_export_can_only_be_used_in_an_ECMAScript_style_module);
              flags |= ModifierFlags.Default;
              break;
            case Syntax.DeclareKeyword:
              if (flags & ModifierFlags.Ambient) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_already_seen, 'declare');
              else if (flags & ModifierFlags.Async) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_be_used_in_an_ambient_context, 'async');
              else if (qf.is.classLike(n.parent) && !n.kind === Syntax.PropertyDeclaration) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_appear_on_a_class_elem, 'declare');
              else if (n.kind === Syntax.Param) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_appear_on_a_param, 'declare');
              else if (n.parent.flags & NodeFlags.Ambient && n.parent.kind === Syntax.ModuleBlock)
                return grammarErrorOnNode(modifier, qd.msgs.A_declare_modifier_cannot_be_used_in_an_already_ambient_context);
              else if (qf.is.privateIdentifierPropertyDeclaration(n)) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_be_used_with_a_private_identifier, 'declare');
              flags |= ModifierFlags.Ambient;
              lastDeclare = modifier;
              break;
            case Syntax.AbstractKeyword:
              if (flags & ModifierFlags.Abstract) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_already_seen, 'abstract');
              if (n.kind !== Syntax.ClassDeclaration) {
                if (n.kind !== Syntax.MethodDeclaration && n.kind !== Syntax.PropertyDeclaration && n.kind !== Syntax.GetAccessor && n.kind !== Syntax.SetAccessor)
                  return grammarErrorOnNode(modifier, qd.abstract_modifier_can_only_appear_on_a_class_method_or_property_declaration);
                if (!(n.parent.kind === Syntax.ClassDeclaration && qf.has.syntacticModifier(n.parent, ModifierFlags.Abstract)))
                  return grammarErrorOnNode(modifier, qd.msgs.Abstract_methods_can_only_appear_within_an_abstract_class);
                if (flags & ModifierFlags.Static) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_be_used_with_1_modifier, 'static', 'abstract');
                if (flags & ModifierFlags.Private) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_be_used_with_1_modifier, 'private', 'abstract');
              }
              if (qf.is.namedDeclaration(n) && n.name.kind === Syntax.PrivateIdentifier) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_be_used_with_a_private_identifier, 'abstract');
              flags |= ModifierFlags.Abstract;
              break;
            case Syntax.AsyncKeyword:
              if (flags & ModifierFlags.Async) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_already_seen, 'async');
              else if (flags & ModifierFlags.Ambient || n.parent.flags & NodeFlags.Ambient) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_be_used_in_an_ambient_context, 'async');
              else if (n.kind === Syntax.Param) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_appear_on_a_param, 'async');
              flags |= ModifierFlags.Async;
              lastAsync = modifier;
              break;
          }
        }
        if (n.kind === Syntax.Constructor) {
          if (flags & ModifierFlags.Static) return grammarErrorOnNode(lastStatic!, qd.msgs._0_modifier_cannot_appear_on_a_constructor_declaration, 'static');
          if (flags & ModifierFlags.Abstract) return grammarErrorOnNode(lastStatic!, qd.msgs._0_modifier_cannot_appear_on_a_constructor_declaration, 'abstract');
          else if (flags & ModifierFlags.Async) return grammarErrorOnNode(lastAsync!, qd.msgs._0_modifier_cannot_appear_on_a_constructor_declaration, 'async');
          else if (flags & ModifierFlags.Readonly) return grammarErrorOnNode(lastReadonly!, qd.msgs._0_modifier_cannot_appear_on_a_constructor_declaration, 'readonly');
          return false;
        } else if ((n.kind === Syntax.ImportDeclaration || n.kind === Syntax.ImportEqualsDeclaration) && flags & ModifierFlags.Ambient) {
          return grammarErrorOnNode(lastDeclare!, qd.msgs.A_0_modifier_cannot_be_used_with_an_import_declaration, 'declare');
        } else if (n.kind === Syntax.Param && flags & ModifierFlags.ParamPropertyModifier && n.name.kind === Syntax.BindingPattern) {
          return grammarErrorOnNode(n, qd.msgs.A_param_property_may_not_be_declared_using_a_binding_pattern);
        } else if (n.kind === Syntax.Param && flags & ModifierFlags.ParamPropertyModifier && (<qt.ParamDeclaration>n).dot3Token) {
          return grammarErrorOnNode(n, qd.msgs.A_param_property_cannot_be_declared_using_a_rest_param);
        }
        if (flags & ModifierFlags.Async) return this.asyncModifier(n, lastAsync!);
        return false;
      }
      asyncModifier(n: Node, asyncModifier: Node): boolean {
        switch (n.kind) {
          case Syntax.MethodDeclaration:
          case Syntax.FunctionDeclaration:
          case Syntax.FunctionExpression:
          case Syntax.ArrowFunction:
            return false;
        }
        return grammarErrorOnNode(asyncModifier, qd.msgs._0_modifier_cannot_be_used_here, 'async');
      }
      forDisallowedTrailingComma(list: Nodes<Node> | undefined, diag = qd.msgs.Trailing_comma_not_allowed): boolean {
        if (list && list.trailingComma) return grammarErrorAtPos(list[0], list.end - ','.length, ','.length, diag);
        return false;
      }
      typeParamList(typeParams: Nodes<qt.TypeParamDeclaration> | undefined, file: qt.SourceFile): boolean {
        if (typeParams && typeParams.length === 0) {
          const start = typeParams.pos - '<'.length;
          const end = qy.skipTrivia(file.text, typeParams.end) + '>'.length;
          return grammarErrorAtPos(file, start, end - start, qd.msgs.Type_param_list_cannot_be_empty);
        }
        return false;
      }
      paramList(params: Nodes<qt.ParamDeclaration>) {
        let seenOptionalParam = false;
        const paramCount = params.length;
        for (let i = 0; i < paramCount; i++) {
          const param = params[i];
          if (param.dot3Token) {
            if (i !== paramCount - 1) return grammarErrorOnNode(param.dot3Token, qd.msgs.A_rest_param_must_be_last_in_a_param_list);
            if (!(param.flags & NodeFlags.Ambient)) this.forDisallowedTrailingComma(params, qd.msgs.A_rest_param_or_binding_pattern_may_not_have_a_trailing_comma);
            if (param.questionToken) return grammarErrorOnNode(param.questionToken, qd.msgs.A_rest_param_cannot_be_optional);
            if (param.initer) return grammarErrorOnNode(param.name, qd.msgs.A_rest_param_cannot_have_an_initer);
          } else if (isOptionalParam(param)) {
            seenOptionalParam = true;
            if (param.questionToken && param.initer) return grammarErrorOnNode(param.name, qd.msgs.Param_cannot_have_question_mark_and_initer);
          } else if (seenOptionalParam && !param.initer) {
            return grammarErrorOnNode(param.name, qd.msgs.A_required_param_cannot_follow_an_optional_param);
          }
        }
      }
      forUseStrictSimpleParamList(n: qt.FunctionLikeDeclaration): boolean {
        const useStrictDirective = n.body && n.body.kind === Syntax.Block && qf.stmt.findUseStrictPrologue(n.body.statements);
        if (useStrictDirective) {
          const nonSimpleParams = getNonSimpleParams(n.params);
          if (length(nonSimpleParams)) {
            forEach(nonSimpleParams, (param) => {
              addRelatedInfo(error(param, qd.msgs.This_param_is_not_allowed_with_use_strict_directive), qf.make.diagForNode(useStrictDirective, qd.use_strict_directive_used_here));
            });
            const diagnostics = nonSimpleParams.map((param, index) => (index === 0 ? qf.make.diagForNode(param, qd.msgs.Non_simple_param_declared_here) : qf.make.diagForNode(param, qd.and_here))) as [
              qd.msgs.DiagnosticWithLocation,
              ...qd.msgs.DiagnosticWithLocation[]
            ];
            addRelatedInfo(error(useStrictDirective, qd.use_strict_directive_cannot_be_used_with_non_simple_param_list), ...diagnostics);
            return true;
          }
        }
        return false;
      }
      functionLikeDeclaration(n: qt.FunctionLikeDeclaration | qt.MethodSignature): boolean {
        const file = n.sourceFile;
        return (
          this.decoratorsAndModifiers(n) ||
          this.typeParamList(n.typeParams, file) ||
          this.paramList(n.params) ||
          this.arrowFunction(n, file) ||
          (qf.is.functionLikeDeclaration(n) && this.forUseStrictSimpleParamList(n))
        );
      }
      classLikeDeclaration(n: qt.ClassLikeDeclaration): boolean {
        const file = n.sourceFile;
        return this.classDeclarationHeritageClauses(n) || this.typeParamList(n.typeParams, file);
      }
      arrowFunction(n: Node, file: qt.SourceFile): boolean {
        if (!n.kind === Syntax.ArrowFunction) return false;
        const { equalsGreaterThanToken } = n;
        const startLine = qy.get.lineAndCharOf(file, equalsGreaterThanToken.pos).line;
        const endLine = qy.get.lineAndCharOf(file, equalsGreaterThanToken.end).line;
        return startLine !== endLine && grammarErrorOnNode(equalsGreaterThanToken, qd.msgs.Line_terminator_not_permitted_before_arrow);
      }
      indexSignatureParams(n: qt.SignatureDeclaration): boolean {
        const param = n.params[0];
        if (n.params.length !== 1) {
          if (param) return grammarErrorOnNode(param.name, qd.msgs.An_index_signature_must_have_exactly_one_param);
          return grammarErrorOnNode(n, qd.msgs.An_index_signature_must_have_exactly_one_param);
        }
        this.forDisallowedTrailingComma(n.params, qd.msgs.An_index_signature_cannot_have_a_trailing_comma);
        if (param.dot3Token) return grammarErrorOnNode(param.dot3Token, qd.msgs.An_index_signature_cannot_have_a_rest_param);
        if (qf.has.effectiveModifiers(param)) return grammarErrorOnNode(param.name, qd.msgs.An_index_signature_param_cannot_have_an_accessibility_modifier);
        if (param.questionToken) return grammarErrorOnNode(param.questionToken, qd.msgs.An_index_signature_param_cannot_have_a_question_mark);
        if (param.initer) return grammarErrorOnNode(param.name, qd.msgs.An_index_signature_param_cannot_have_an_initer);
        if (!param.type) return grammarErrorOnNode(param.name, qd.msgs.An_index_signature_param_must_have_a_type_annotation);
        if (param.type.kind !== Syntax.StringKeyword && param.type.kind !== Syntax.NumberKeyword) {
          const type = qf.get.typeFromTypeNode(param.type);
          if (type.flags & TypeFlags.String || type.flags & TypeFlags.Number) {
            return grammarErrorOnNode(
              param.name,
              qd.msgs.An_index_signature_param_type_cannot_be_a_type_alias_Consider_writing_0_Colon_1_Colon_2_instead,
              qf.get.textOf(param.name),
              typeToString(type),
              typeToString(n.type ? qf.get.typeFromTypeNode(n.type) : anyType)
            );
          }
          if (type.flags & TypeFlags.Union && allTypesAssignableToKind(type, TypeFlags.StringOrNumberLiteral, true))
            return grammarErrorOnNode(param.name, qd.msgs.An_index_signature_param_type_cannot_be_a_union_type_Consider_using_a_mapped_object_type_instead);
          return grammarErrorOnNode(param.name, qd.msgs.An_index_signature_param_type_must_be_either_string_or_number);
        }
        if (!n.type) return grammarErrorOnNode(n, qd.msgs.An_index_signature_must_have_a_type_annotation);
        return false;
      }
      indexSignature(n: qt.SignatureDeclaration) {
        return this.decoratorsAndModifiers(n) || this.indexSignatureParams(n);
      }
      forAtLeastOneTypeArg(n: Node, typeArgs: Nodes<qt.Typing> | undefined): boolean {
        if (typeArgs && typeArgs.length === 0) {
          const sourceFile = n.sourceFile;
          const start = typeArgs.pos - '<'.length;
          const end = qy.skipTrivia(sourceFile.text, typeArgs.end) + '>'.length;
          return grammarErrorAtPos(sourceFile, start, end - start, qd.msgs.Type_arg_list_cannot_be_empty);
        }
        return false;
      }
      typeArgs(n: Node, typeArgs: Nodes<qt.Typing> | undefined): boolean {
        return this.forDisallowedTrailingComma(typeArgs) || this.forAtLeastOneTypeArg(n, typeArgs);
      }
      taggedTemplateChain(n: qt.TaggedTemplateExpression): boolean {
        if (n.questionDotToken || n.flags & NodeFlags.OptionalChain) return grammarErrorOnNode(n.template, qd.msgs.Tagged_template_expressions_are_not_permitted_in_an_optional_chain);
        return false;
      }
      forOmittedArg(args: Nodes<qt.Expression> | undefined): boolean {
        if (args) {
          for (const arg of args) {
            if (arg.kind === Syntax.OmittedExpression) return grammarErrorAtPos(arg, arg.pos, 0, qd.msgs.Arg_expression_expected);
          }
        }
        return false;
      }
      args(args: Nodes<qt.Expression> | undefined): boolean {
        return this.forOmittedArg(args);
      }
      heritageClause(n: qt.HeritageClause): boolean {
        const types = n.types;
        if (this.forDisallowedTrailingComma(types)) return true;
        if (types && types.length === 0) {
          const listType = qt.Token.toString(n.token);
          return grammarErrorAtPos(n, types.pos, 0, qd.msgs._0_list_cannot_be_empty, listType);
        }
        return some(types, this.expressionWithTypeArgs);
      }
      expressionWithTypeArgs(n: qt.ExpressionWithTypings) {
        return this.typeArgs(n, n.typeArgs);
      }
      classDeclarationHeritageClauses(n: qt.ClassLikeDeclaration) {
        let seenExtendsClause = false;
        let seenImplementsClause = false;
        if (!this.decoratorsAndModifiers(n) && n.heritageClauses) {
          for (const heritageClause of n.heritageClauses) {
            if (heritageClause.token === Syntax.ExtendsKeyword) {
              if (seenExtendsClause) return grammarErrorOnFirstToken(heritageClause, qd.extends_clause_already_seen);
              if (seenImplementsClause) return grammarErrorOnFirstToken(heritageClause, qd.extends_clause_must_precede_implements_clause);
              if (heritageClause.types.length > 1) return grammarErrorOnFirstToken(heritageClause.types[1], qd.msgs.Classes_can_only_extend_a_single_class);
              seenExtendsClause = true;
            } else {
              qf.assert.true(heritageClause.token === Syntax.ImplementsKeyword);
              if (seenImplementsClause) return grammarErrorOnFirstToken(heritageClause, qd.implements_clause_already_seen);
              seenImplementsClause = true;
            }
            this.heritageClause(heritageClause);
          }
        }
      }
      interfaceDeclaration(n: qt.InterfaceDeclaration) {
        let seenExtendsClause = false;
        if (n.heritageClauses) {
          for (const heritageClause of n.heritageClauses) {
            if (heritageClause.token === Syntax.ExtendsKeyword) {
              if (seenExtendsClause) return grammarErrorOnFirstToken(heritageClause, qd.extends_clause_already_seen);
              seenExtendsClause = true;
            } else {
              qf.assert.true(heritageClause.token === Syntax.ImplementsKeyword);
              return grammarErrorOnFirstToken(heritageClause, qd.msgs.Interface_declaration_cannot_have_implements_clause);
            }
            this.heritageClause(heritageClause);
          }
        }
        return false;
      }
      computedPropertyName(n: Node): boolean {
        if (n.kind !== Syntax.ComputedPropertyName) return false;
        const computedPropertyName = <qt.ComputedPropertyName>n;
        if (computedPropertyName.expression.kind === Syntax.BinaryExpression && (<qt.BinaryExpression>computedPropertyName.expression).operatorToken.kind === Syntax.CommaToken)
          return grammarErrorOnNode(computedPropertyName.expression, qd.msgs.A_comma_expression_is_not_allowed_in_a_computed_property_name);
        return false;
      }
      forGenerator(n: qt.FunctionLikeDeclaration) {
        if (n.asteriskToken) {
          qf.assert.true(n.kind === Syntax.FunctionDeclaration || n.kind === Syntax.FunctionExpression || n.kind === Syntax.MethodDeclaration);
          if (n.flags & NodeFlags.Ambient) return grammarErrorOnNode(n.asteriskToken, qd.msgs.Generators_are_not_allowed_in_an_ambient_context);
          if (!n.body) return grammarErrorOnNode(n.asteriskToken, qd.msgs.An_overload_signature_cannot_be_declared_as_a_generator);
        }
      }
      forInvalidQuestionMark(questionToken: qt.QuestionToken | undefined, message: qd.Message): boolean {
        return !!questionToken && grammarErrorOnNode(questionToken, message);
      }
      forInvalidExclamationToken(exclamationToken: qt.ExclamationToken | undefined, message: qd.Message): boolean {
        return !!exclamationToken && grammarErrorOnNode(exclamationToken, message);
      }
      objectLiteralExpression(n: qt.ObjectLiteralExpression, inDestructuring: boolean) {
        const seen = qu.createEscapedMap<DeclarationMeaning>();
        for (const prop of n.properties) {
          if (prop.kind === Syntax.SpreadAssignment) {
            if (inDestructuring) {
              const expression = qf.skip.parentheses(prop.expression);
              if (qf.is.arrayLiteralExpression(expression) || expression.kind === Syntax.ObjectLiteralExpression)
                return grammarErrorOnNode(prop.expression, qd.msgs.A_rest_elem_cannot_contain_a_binding_pattern);
            }
            continue;
          }
          const name = prop.name;
          if (name.kind === Syntax.ComputedPropertyName) this.computedPropertyName(name);
          if (prop.kind === Syntax.ShorthandPropertyAssignment && !inDestructuring && prop.objectAssignmentIniter)
            return grammarErrorOnNode(prop.equalsToken!, qd.can_only_be_used_in_an_object_literal_property_inside_a_destructuring_assignment);
          if (name.kind === Syntax.PrivateIdentifier) return grammarErrorOnNode(name, qd.msgs.Private_identifiers_are_not_allowed_outside_class_bodies);
          if (prop.modifiers) {
            for (const mod of prop.modifiers!) {
              if (mod.kind !== Syntax.AsyncKeyword || prop.kind !== Syntax.MethodDeclaration) grammarErrorOnNode(mod, qd.msgs._0_modifier_cannot_be_used_here, qf.get.textOf(mod));
            }
          }
          let currentKind: DeclarationMeaning;
          switch (prop.kind) {
            case Syntax.ShorthandPropertyAssignment:
              this.forInvalidExclamationToken(prop.exclamationToken, qd.msgs.A_definite_assignment_assertion_is_not_permitted_in_this_context);
            case Syntax.PropertyAssignment:
              this.forInvalidQuestionMark(prop.questionToken, qd.msgs.An_object_member_cannot_be_declared_optional);
              if (name.kind === Syntax.NumericLiteral) this.numericLiteral(name);
              currentKind = DeclarationMeaning.PropertyAssignment;
              break;
            case Syntax.MethodDeclaration:
              currentKind = DeclarationMeaning.Method;
              break;
            case Syntax.GetAccessor:
              currentKind = DeclarationMeaning.GetAccessor;
              break;
            case Syntax.SetAccessor:
              currentKind = DeclarationMeaning.SetAccessor;
              break;
            default:
              throw qc.assert.never(prop, 'Unexpected syntax kind:' + (<Node>prop).kind);
          }
          if (!inDestructuring) {
            const effectiveName = qf.get.propertyNameForPropertyNameNode(name);
            if (effectiveName === undefined) continue;
            const existingKind = seen.get(effectiveName);
            if (!existingKind) seen.set(effectiveName, currentKind);
            else {
              if (currentKind & DeclarationMeaning.PropertyAssignmentOrMethod && existingKind & DeclarationMeaning.PropertyAssignmentOrMethod)
                grammarErrorOnNode(name, qd.msgs.Duplicate_identifier_0, qf.get.textOf(name));
              else if (currentKind & DeclarationMeaning.GetOrSetAccessor && existingKind & DeclarationMeaning.GetOrSetAccessor) {
                if (existingKind !== DeclarationMeaning.GetOrSetAccessor && currentKind !== existingKind) seen.set(effectiveName, currentKind | existingKind);
                return grammarErrorOnNode(name, qd.msgs.An_object_literal_cannot_have_multiple_get_Slashset_accessors_with_the_same_name);
              }
              return grammarErrorOnNode(name, qd.msgs.An_object_literal_cannot_have_property_and_accessor_with_the_same_name);
            }
          }
        }
      }
      jsxElem(n: qt.JsxOpeningLikeElem) {
        this.typeArgs(n, n.typeArgs);
        const seen = qu.createEscapedMap<boolean>();
        for (const attr of n.attributes.properties) {
          if (attr.kind === Syntax.JsxSpreadAttribute) continue;
          const { name, initer } = attr;
          if (!seen.get(name.escapedText)) seen.set(name.escapedText, true);
          return grammarErrorOnNode(name, qd.msgs.JSX_elems_cannot_have_multiple_attributes_with_the_same_name);
          if (initer && initer.kind === Syntax.JsxExpression && !initer.expression) return grammarErrorOnNode(initer, qd.msgs.JSX_attributes_must_only_be_assigned_a_non_empty_expression);
        }
      }
      jsxExpression(n: qt.JsxExpression) {
        if (n.expression && qf.is.commaSequence(n.expression)) return grammarErrorOnNode(n.expression, qd.msgs.JSX_expressions_may_not_use_the_comma_operator_Did_you_mean_to_write_an_array);
      }
      forInOrForOfStatement(n: qt.ForInOrOfStatement): boolean {
        if (this.statementInAmbientContext(n)) return true;
        if (n.kind === Syntax.ForOfStatement && n.awaitModifier) {
          if ((n.flags & NodeFlags.AwaitContext) === NodeFlags.None) {
            const sourceFile = n.sourceFile;
            if (!hasParseDiagnostics(sourceFile)) {
              const diagnostic = qf.make.diagForNode(n.awaitModifier, qd.msgs.A_for_await_of_statement_is_only_allowed_within_an_async_function_or_async_generator);
              const func = qf.get.containingFunction(n);
              if (func && func.kind !== Syntax.Constructor) {
                qf.assert.true((qf.get.functionFlags(func) & FunctionFlags.Async) === 0, 'Enclosing function should never be an async function.');
                const relatedInfo = qf.make.diagForNode(func, qd.msgs.Did_you_mean_to_mark_this_function_as_async);
                addRelatedInfo(diagnostic, relatedInfo);
              }
              diagnostics.add(diagnostic);
              return true;
            }
            return false;
          }
        }
        if (n.initer.kind === Syntax.VariableDeclarationList) {
          const variableList = <qt.VariableDeclarationList>n.initer;
          if (!this.variableDeclarationList(variableList)) {
            const declarations = variableList.declarations;
            if (!declarations.length) return false;
            if (declarations.length > 1) {
              const diagnostic =
                n.kind === Syntax.ForInStatement
                  ? qd.msgs.Only_a_single_variable_declaration_is_allowed_in_a_for_in_statement
                  : qd.msgs.Only_a_single_variable_declaration_is_allowed_in_a_for_of_statement;
              return grammarErrorOnFirstToken(variableList.declarations[1], diagnostic);
            }
            const firstDeclaration = declarations[0];
            if (firstDeclaration.initer) {
              const diagnostic =
                n.kind === Syntax.ForInStatement
                  ? qd.msgs.The_variable_declaration_of_a_for_in_statement_cannot_have_an_initer
                  : qd.msgs.The_variable_declaration_of_a_for_of_statement_cannot_have_an_initer;
              return grammarErrorOnNode(firstDeclaration.name, diagnostic);
            }
            if (firstDeclaration.type) {
              const diagnostic =
                n.kind === Syntax.ForInStatement
                  ? qd.msgs.The_left_hand_side_of_a_for_in_statement_cannot_use_a_type_annotation
                  : qd.msgs.The_left_hand_side_of_a_for_of_statement_cannot_use_a_type_annotation;
              return grammarErrorOnNode(firstDeclaration, diagnostic);
            }
          }
        }
        return false;
      }
      accessor(accessor: qt.AccessorDeclaration): boolean {
        if (!(accessor.flags & NodeFlags.Ambient)) {
          if (accessor.body === undefined && !qf.has.syntacticModifier(accessor, ModifierFlags.Abstract)) return grammarErrorAtPos(accessor, accessor.end - 1, ';'.length, qd.msgs._0_expected, '{');
        }
        if (accessor.body && qf.has.syntacticModifier(accessor, ModifierFlags.Abstract)) return grammarErrorOnNode(accessor, qd.msgs.An_abstract_accessor_cannot_have_an_implementation);
        if (accessor.typeParams) return grammarErrorOnNode(accessor.name, qd.msgs.An_accessor_cannot_have_type_params);
        if (!doesAccessorHaveCorrectParamCount(accessor))
          return grammarErrorOnNode(accessor.name, accessor.kind === Syntax.GetAccessor ? qd.msgs.A_get_accessor_cannot_have_params : qd.msgs.A_set_accessor_must_have_exactly_one_param);
        if (accessor.kind === Syntax.SetAccessor) {
          if (accessor.type) return grammarErrorOnNode(accessor.name, qd.msgs.A_set_accessor_cannot_have_a_return_type_annotation);
          const param = qg.check.defined(qf.get.setAccessorValueParam(accessor), 'Return value does not match param count assertion.');
          if (param.dot3Token) return grammarErrorOnNode(param.dot3Token, qd.msgs.A_set_accessor_cannot_have_rest_param);
          if (param.questionToken) return grammarErrorOnNode(param.questionToken, qd.msgs.A_set_accessor_cannot_have_an_optional_param);
          if (param.initer) return grammarErrorOnNode(accessor.name, qd.msgs.A_set_accessor_param_cannot_have_an_initer);
        }
        return false;
      }
      typeOperatorNode(n: qt.TypingOperator) {
        if (n.operator === Syntax.UniqueKeyword) {
          if (n.type.kind !== Syntax.SymbolKeyword) return grammarErrorOnNode(n.type, qd.msgs._0_expected, qt.Token.toString(Syntax.SymbolKeyword));
          let parent = walkUpParenthesizedTypes(n.parent);
          if (qf.is.inJSFile(parent) && parent.kind === Syntax.DocTypingExpression) {
            parent = parent.parent;
            if (parent.kind === Syntax.DocTypeTag) parent = parent.parent.parent;
          }
          switch (parent.kind) {
            case Syntax.VariableDeclaration:
              const decl = parent as qt.VariableDeclaration;
              if (decl.name.kind !== Syntax.qc.Identifier) return grammarErrorOnNode(n, qd.unique_symbol_types_may_not_be_used_on_a_variable_declaration_with_a_binding_name);
              if (!qf.is.variableDeclarationInVariableStatement(decl)) return grammarErrorOnNode(n, qd.unique_symbol_types_are_only_allowed_on_variables_in_a_variable_statement);
              if (!(decl.parent.flags & NodeFlags.Const)) return grammarErrorOnNode((<qt.VariableDeclaration>parent).name, qd.msgs.A_variable_whose_type_is_a_unique_symbol_type_must_be_const);
              break;
            case Syntax.PropertyDeclaration:
              if (!qf.has.syntacticModifier(parent, ModifierFlags.Static) || !qf.has.effectiveModifier(parent, ModifierFlags.Readonly))
                return grammarErrorOnNode((<qt.PropertyDeclaration>parent).name, qd.msgs.A_property_of_a_class_whose_type_is_a_unique_symbol_type_must_be_both_static_and_readonly);
              break;
            case Syntax.PropertySignature:
              if (!qf.has.syntacticModifier(parent, ModifierFlags.Readonly))
                return grammarErrorOnNode((<qt.PropertySignature>parent).name, qd.msgs.A_property_of_an_interface_or_type_literal_whose_type_is_a_unique_symbol_type_must_be_readonly);
              break;
            default:
              return grammarErrorOnNode(n, qd.unique_symbol_types_are_not_allowed_here);
          }
        } else if (n.operator === Syntax.ReadonlyKeyword) {
          if (n.type.kind !== Syntax.ArrayTyping && n.type.kind !== Syntax.TupleTyping)
            return grammarErrorOnFirstToken(n, qd.readonly_type_modifier_is_only_permitted_on_array_and_tuple_literal_types, qt.Token.toString(Syntax.SymbolKeyword));
        }
      }
      forInvalidDynamicName(n: qt.DeclarationName, message: qd.Message) {
        if (isNonBindableDynamicName(n)) return grammarErrorOnNode(n, message);
      }
      method(n: qt.MethodDeclaration | qt.MethodSignature) {
        if (this.functionLikeDeclaration(n)) return true;
        if (n.kind === Syntax.MethodDeclaration) {
          if (n.parent.kind === Syntax.ObjectLiteralExpression) {
            if (n.modifiers && !(n.modifiers.length === 1 && first(n.modifiers).kind === Syntax.AsyncKeyword)) return grammarErrorOnFirstToken(n, qd.msgs.Modifiers_cannot_appear_here);
            else if (this.forInvalidQuestionMark(n.questionToken, qd.msgs.An_object_member_cannot_be_declared_optional)) return true;
            else if (this.forInvalidExclamationToken(n.exclamationToken, qd.msgs.A_definite_assignment_assertion_is_not_permitted_in_this_context)) return true;
            else if (n.body === undefined) return grammarErrorAtPos(n, n.end - 1, ';'.length, qd.msgs._0_expected, '{');
          }
          if (this.forGenerator(n)) return true;
        }
        if (qf.is.classLike(n.parent)) {
          if (n.flags & NodeFlags.Ambient) {
            return this.forInvalidDynamicName(n.name, qd.msgs.A_computed_property_name_in_an_ambient_context_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type);
          } else if (n.kind === Syntax.MethodDeclaration && !n.body) {
            return this.forInvalidDynamicName(n.name, qd.msgs.A_computed_property_name_in_a_method_overload_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type);
          }
        } else if (n.parent.kind === Syntax.InterfaceDeclaration) {
          return this.forInvalidDynamicName(n.name, qd.msgs.A_computed_property_name_in_an_interface_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type);
        } else if (n.parent.kind === Syntax.TypingLiteral) {
          return this.forInvalidDynamicName(n.name, qd.msgs.A_computed_property_name_in_a_type_literal_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type);
        }
      }
      breakOrContinueStatement(n: qt.BreakOrContinueStatement): boolean {
        let current: Node = n;
        while (current) {
          if (qf.is.functionLike(current)) return grammarErrorOnNode(n, qd.msgs.Jump_target_cannot_cross_function_boundary);
          switch (current.kind) {
            case Syntax.LabeledStatement:
              if (n.label && (<qt.LabeledStatement>current).label.escapedText === n.label.escapedText) {
                const isMisplacedContinueLabel = n.kind === Syntax.ContinueStatement && !qf.is.iterationStatement((<qt.LabeledStatement>current).statement, true);
                if (isMisplacedContinueLabel) return grammarErrorOnNode(n, qd.msgs.A_continue_statement_can_only_jump_to_a_label_of_an_enclosing_iteration_statement);
                return false;
              }
              break;
            case Syntax.SwitchStatement:
              if (n.kind === Syntax.BreakStatement && !n.label) return false;
              break;
            default:
              if (qf.is.iterationStatement(current, false) && !n.label) return false;
              break;
          }
          current = current.parent;
        }
        if (n.label) {
          const message =
            n.kind === Syntax.BreakStatement
              ? qd.msgs.A_break_statement_can_only_jump_to_a_label_of_an_enclosing_statement
              : qd.msgs.A_continue_statement_can_only_jump_to_a_label_of_an_enclosing_iteration_statement;
          return grammarErrorOnNode(n, message);
        } else {
          const message =
            n.kind === Syntax.BreakStatement
              ? qd.msgs.A_break_statement_can_only_be_used_within_an_enclosing_iteration_or_switch_statement
              : qd.msgs.A_continue_statement_can_only_be_used_within_an_enclosing_iteration_statement;
          return grammarErrorOnNode(n, message);
        }
      }
      bindingElem(n: qt.BindingElem) {
        if (n.dot3Token) {
          const elems = n.parent.elems;
          if (n !== last(elems)) return grammarErrorOnNode(n, qd.msgs.A_rest_elem_must_be_last_in_a_destructuring_pattern);
          this.forDisallowedTrailingComma(elems, qd.msgs.A_rest_param_or_binding_pattern_may_not_have_a_trailing_comma);
          if (n.propertyName) return grammarErrorOnNode(n.name, qd.msgs.A_rest_elem_cannot_have_a_property_name);
          if (n.initer) return grammarErrorAtPos(n, n.initer.pos - 1, 1, qd.msgs.A_rest_elem_cannot_have_an_initer);
        }
        return;
      }
      variableDeclaration(n: qt.VariableDeclaration) {
        if (n.parent.parent.kind !== Syntax.ForInStatement && n.parent.parent.kind !== Syntax.ForOfStatement) {
          if (n.flags & NodeFlags.Ambient) check.ambientIniter(n);
          else if (!n.initer) {
            if (n.name.kind === Syntax.BindingPattern && !n.parent.kind === Syntax.BindingPattern) return grammarErrorOnNode(n, qd.msgs.A_destructuring_declaration_must_have_an_initer);
            if (qf.is.varConst(n)) return grammarErrorOnNode(n, qd.const_declarations_must_be_initialized);
          }
        }
        if (n.exclamationToken && (n.parent.parent.kind !== Syntax.VariableStatement || !n.type || n.initer || n.flags & NodeFlags.Ambient))
          return grammarErrorOnNode(n.exclamationToken, qd.msgs.Definite_assignment_assertions_can_only_be_used_along_with_a_type_annotation);
        const moduleKind = getEmitModuleKind(compilerOpts);
        if (
          moduleKind < ModuleKind.ES2015 &&
          moduleKind !== ModuleKind.System &&
          !compilerOpts.noEmit &&
          !(n.parent.parent.flags & NodeFlags.Ambient) &&
          qf.has.syntacticModifier(n.parent.parent, ModifierFlags.Export)
        ) {
          check.eSModuleMarker(n.name);
        }
        const checkLetConstNames = qf.is.aLet(n) || qf.is.varConst(n);
        return checkLetConstNames && this.nameInLetOrConstDeclarations(n.name);
      }
      nameInLetOrConstDeclarations(name: qt.Identifier | qt.BindingPattern): boolean {
        if (name.kind === Syntax.qc.Identifier) {
          if (name.originalKeywordKind === Syntax.LetKeyword) return grammarErrorOnNode(name, qd.let_is_not_allowed_to_be_used_as_a_name_in_let_or_const_declarations);
        } else {
          const elems = name.elems;
          for (const elem of elems) {
            if (!elem.kind === Syntax.OmittedExpression) this.nameInLetOrConstDeclarations(elem.name);
          }
        }
        return false;
      }
      variableDeclarationList(declarationList: qt.VariableDeclarationList): boolean {
        const declarations = declarationList.declarations;
        if (this.forDisallowedTrailingComma(declarationList.declarations)) return true;
        if (!declarationList.declarations.length) return grammarErrorAtPos(declarationList, declarations.pos, declarations.end - declarations.pos, qd.msgs.Variable_declaration_list_cannot_be_empty);
        return false;
      }
      forDisallowedLetOrConstStatement(n: qt.VariableStatement) {
        if (!allowLetAndConstDeclarations(n.parent)) {
          if (qf.is.aLet(n.declarationList)) return grammarErrorOnNode(n, qd.let_declarations_can_only_be_declared_inside_a_block);
          else if (qf.is.varConst(n.declarationList)) return grammarErrorOnNode(n, qd.const_declarations_can_only_be_declared_inside_a_block);
        }
      }
      metaProperty(n: qt.MetaProperty) {
        const escapedText = n.name.escapedText;
        switch (n.keywordToken) {
          case Syntax.NewKeyword:
            if (escapedText !== 'target')
              return grammarErrorOnNode(n.name, qd.msgs._0_is_not_a_valid_meta_property_for_keyword_1_Did_you_mean_2, n.name.escapedText, qt.Token.toString(n.keywordToken), 'target');
            break;
          case Syntax.ImportKeyword:
            if (escapedText !== 'meta')
              return grammarErrorOnNode(n.name, qd.msgs._0_is_not_a_valid_meta_property_for_keyword_1_Did_you_mean_2, n.name.escapedText, qt.Token.toString(n.keywordToken), 'meta');
            break;
        }
      }
      constructorTypeParams(n: qt.ConstructorDeclaration) {
        const jsdocTypeParams = qf.is.inJSFile(n) ? qf.get.doc.typeParamDeclarations(n) : undefined;
        const range = n.typeParams || (jsdocTypeParams && firstOrUndefined(jsdocTypeParams));
        if (range) {
          const pos = range.pos === range.end ? range.pos : qy.skipTrivia(n.sourceFile.text, range.pos);
          return grammarErrorAtPos(n, pos, range.end - pos, qd.msgs.Type_params_cannot_appear_on_a_constructor_declaration);
        }
      }
      constructorTypeAnnotation(n: qt.ConstructorDeclaration) {
        const type = qf.get.effectiveReturnTypeNode(n);
        if (type) return grammarErrorOnNode(type, qd.msgs.Type_annotation_cannot_appear_on_a_constructor_declaration);
      }
      property(n: qt.PropertyDeclaration | qt.PropertySignature) {
        if (qf.is.classLike(n.parent)) {
          if (n.name.kind === Syntax.StringLiteral && n.name.text === 'constructor') return grammarErrorOnNode(n.name, qd.msgs.Classes_may_not_have_a_field_named_constructor);
          if (this.forInvalidDynamicName(n.name, qd.msgs.A_computed_property_name_in_a_class_property_declaration_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type)) {
            return true;
          }
        } else if (n.parent.kind === Syntax.InterfaceDeclaration) {
          if (this.forInvalidDynamicName(n.name, qd.msgs.A_computed_property_name_in_an_interface_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type)) return true;
          if (n.initer) return grammarErrorOnNode(n.initer, qd.msgs.An_interface_property_cannot_have_an_initer);
        } else if (n.parent.kind === Syntax.TypingLiteral) {
          if (this.forInvalidDynamicName(n.name, qd.msgs.A_computed_property_name_in_a_type_literal_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type)) return true;
          if (n.initer) return grammarErrorOnNode(n.initer, qd.msgs.A_type_literal_property_cannot_have_an_initer);
        }
        if (n.flags & NodeFlags.Ambient) check.ambientIniter(n);
        if (
          n.kind === Syntax.PropertyDeclaration &&
          n.exclamationToken &&
          (!qf.is.classLike(n.parent) || !n.type || n.initer || n.flags & NodeFlags.Ambient || qf.has.syntacticModifier(n, ModifierFlags.Static | ModifierFlags.Abstract))
        ) {
          return grammarErrorOnNode(n.exclamationToken, qd.msgs.A_definite_assignment_assertion_is_not_permitted_in_this_context);
        }
      }
      topLevelElemForRequiredDeclareModifier(n: Node): boolean {
        if (
          n.kind === Syntax.InterfaceDeclaration ||
          n.kind === Syntax.TypeAliasDeclaration ||
          n.kind === Syntax.ImportDeclaration ||
          n.kind === Syntax.ImportEqualsDeclaration ||
          n.kind === Syntax.ExportDeclaration ||
          n.kind === Syntax.ExportAssignment ||
          n.kind === Syntax.NamespaceExportDeclaration ||
          qf.has.syntacticModifier(n, ModifierFlags.Ambient | ModifierFlags.Export | ModifierFlags.Default)
        ) {
          return false;
        }
        return grammarErrorOnFirstToken(n, qd.msgs.Top_level_declarations_in_d_ts_files_must_start_with_either_a_declare_or_export_modifier);
      }
      topLevelElemsForRequiredDeclareModifier(file: qt.SourceFile): boolean {
        for (const decl of file.statements) {
          if (qf.is.declaration(decl) || decl.kind === Syntax.VariableStatement) {
            if (this.topLevelElemForRequiredDeclareModifier(decl)) return true;
          }
        }
        return false;
      }
      sourceFile(n: qt.SourceFile): boolean {
        return !!(n.flags & NodeFlags.Ambient) && this.topLevelElemsForRequiredDeclareModifier(n);
      }
      nullishCoalesceWithLogicalExpression(n: qt.BinaryExpression) {
        const { left, operatorToken, right } = n;
        if (operatorToken.kind === Syntax.Question2Token) {
          if (left.kind === Syntax.BinaryExpression && (left.operatorToken.kind === Syntax.Bar2Token || left.operatorToken.kind === Syntax.Ampersand2Token))
            grammarErrorOnNode(left, qd.msgs._0_and_1_operations_cannot_be_mixed_without_parentheses, qt.Token.toString(left.operatorToken.kind), qt.Token.toString(operatorToken.kind));
          if (right.kind === Syntax.BinaryExpression && (right.operatorToken.kind === Syntax.Bar2Token || right.operatorToken.kind === Syntax.Ampersand2Token))
            grammarErrorOnNode(right, qd.msgs._0_and_1_operations_cannot_be_mixed_without_parentheses, qt.Token.toString(right.operatorToken.kind), qt.Token.toString(operatorToken.kind));
        }
      }
      statementInAmbientContext(n: Node): boolean {
        if (n.flags & NodeFlags.Ambient) {
          const links = qf.get.nodeLinks(n);
          if (!links.hasReportedStatementInAmbientContext && (qf.is.functionLike(n.parent) || qf.is.accessor(n.parent)))
            return (qf.get.nodeLinks(n).hasReportedStatementInAmbientContext = grammarErrorOnFirstToken(n, qd.msgs.An_implementation_cannot_be_declared_in_ambient_contexts));
          if (n.parent.kind === Syntax.Block || n.parent.kind === Syntax.ModuleBlock || n.parent.kind === Syntax.SourceFile) {
            const links = qf.get.nodeLinks(n.parent);
            if (!links.hasReportedStatementInAmbientContext) return (links.hasReportedStatementInAmbientContext = grammarErrorOnFirstToken(n, qd.msgs.Statements_are_not_allowed_in_ambient_contexts));
          } else {
          }
        }
        return false;
      }
      numericLiteral(n: qt.NumericLiteral): boolean {
        if (n.numericLiteralFlags & TokenFlags.Octal) {
          const diagnosticMessage = qd.msgs.Octal_literals_are_not_available_when_targeting_ECMAScript_5_and_higher_Use_the_syntax_0;
          const withMinus = n.parent.kind === Syntax.PrefixUnaryExpression && n.parent.operator === Syntax.MinusToken;
          const literal = (withMinus ? '-' : '') + '0o' + n.text;
          return grammarErrorOnNode(withMinus ? n.parent : n, diagnosticMessage, literal);
        }
        check.numericLiteralValueSize(n);
        return false;
      }
      bigIntLiteral(n: qt.BigIntLiteral): boolean {
        const literalType = n.parent.kind === Syntax.LiteralTyping || (n.parent.kind === Syntax.PrefixUnaryExpression && n.parent.parent.kind === Syntax.LiteralTyping);
        return false;
      }
      importClause(n: qt.ImportClause): boolean {
        if (n.isTypeOnly && n.name && n.namedBindings) return grammarErrorOnNode(n, qd.msgs.A_type_only_import_can_specify_a_default_import_or_named_bindings_but_not_both);
        return false;
      }
      importCallExpression(n: qt.ImportCall): boolean {
        if (moduleKind === ModuleKind.ES2015) return grammarErrorOnNode(n, qd.msgs.Dynamic_imports_are_only_supported_when_the_module_flag_is_set_to_es2020_esnext_commonjs_amd_system_or_umd);
        if (n.typeArgs) return grammarErrorOnNode(n, qd.msgs.Dynamic_import_cannot_have_type_args);
        const nodeArgs = n.args;
        if (nodeArgs.length !== 1) return grammarErrorOnNode(n, qd.msgs.Dynamic_import_must_have_one_spec_as_an_arg);
        this.forDisallowedTrailingComma(nodeArgs);
        if (nodeArgs[0].kind === Syntax.SpreadElem) return grammarErrorOnNode(nodeArgs[0], qd.msgs.Specifier_of_dynamic_import_cannot_be_spread_elem);
        return false;
      }
    })();
  })());
}
export interface Fcheck extends ReturnType<typeof newCheck> {}
