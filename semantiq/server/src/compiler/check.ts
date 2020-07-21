import * as qb from './base';
import { is, get, has } from './core3';
import * as qc from './core3';
import * as qd from './diags';
import { Node } from './types';
import * as qt from './types';
import { ModifierFlags, Syntax } from './syntax';
import * as qy from './syntax';
export const check = new (class {
  checkAndReportErrorForMissingPrefix(errorLocation: Node, name: qb.__String, nameArg: qb.__String | Identifier): boolean {
    if (!is.kind(qc.Identifier, errorLocation) || errorLocation.escapedText !== name || isTypeReferenceIdentifier(errorLocation) || isInTypeQuery(errorLocation)) return false;
    const container = get.thisContainer(errorLocation, false);
    let location = container;
    while (location) {
      if (is.classLike(location.parent)) {
        const classSymbol = getSymbolOfNode(location.parent);
        if (!classSymbol) break;
        const constructorType = getTypeOfSymbol(classSymbol);
        if (getPropertyOfType(constructorType, name)) {
          error(errorLocation, qd.Cannot_find_name_0_Did_you_mean_the_static_member_1_0, diagnosticName(nameArg), classSymbol.symbolToString());
          return true;
        }
        if (location === container && !has.syntacticModifier(location, ModifierFlags.Static)) {
          const instanceType = (<InterfaceType>getDeclaredTypeOfSymbol(classSymbol)).thisType!;
          if (getPropertyOfType(instanceType, name)) {
            error(errorLocation, qd.Cannot_find_name_0_Did_you_mean_the_instance_member_this_0, diagnosticName(nameArg));
            return true;
          }
        }
      }
      location = location.parent;
    }
    return false;
  }
  checkAndReportErrorForExtendingInterface(errorLocation: Node): boolean {
    const expression = getEntityNameForExtendingInterface(errorLocation);
    if (expression && resolveEntityName(expression, qt.SymbolFlags.Interface, true)) {
      error(errorLocation, qd.Cannot_extend_an_interface_0_Did_you_mean_implements, get.textOf(expression));
      return true;
    }
    return false;
  }
  checkAndReportErrorForUsingTypeAsNamespace(errorLocation: Node, name: qb.__String, meaning: qt.SymbolFlags): boolean {
    const namespaceMeaning = qt.SymbolFlags.Namespace | (is.inJSFile(errorLocation) ? qt.SymbolFlags.Value : 0);
    if (meaning === namespaceMeaning) {
      const symbol = resolveSymbol(resolveName(errorLocation, name, qt.SymbolFlags.Type & ~namespaceMeaning, undefined, undefined, false));
      const parent = errorLocation.parent;
      if (symbol) {
        if (is.kind(qc.QualifiedName, parent)) {
          assert(parent.left === errorLocation, 'Should only be resolving left side of qualified name as a namespace');
          const propName = parent.right.escapedText;
          const propType = getPropertyOfType(getDeclaredTypeOfSymbol(symbol), propName);
          if (propType) {
            error(
              parent,
              qd.Cannot_access_0_1_because_0_is_a_type_but_not_a_namespace_Did_you_mean_to_retrieve_the_type_of_the_property_1_in_0_with_0_1,
              qy.get.unescUnderscores(name),
              qy.get.unescUnderscores(propName)
            );
            return true;
          }
        }
        error(errorLocation, qd._0_only_refers_to_a_type_but_is_being_used_as_a_namespace_here, qy.get.unescUnderscores(name));
        return true;
      }
    }
    return false;
  }
  checkAndReportErrorForUsingValueAsType(errorLocation: Node, name: qb.__String, meaning: qt.SymbolFlags): boolean {
    if (meaning & (SymbolFlags.Type & ~SymbolFlags.Namespace)) {
      const n = resolveName(errorLocation, name, ~SymbolFlags.Type & qt.SymbolFlags.Value, undefined, undefined, false);
      const symbol = resolveSymbol(n);
      if (symbol && !(symbol.flags & qt.SymbolFlags.Namespace)) {
        error(errorLocation, qd._0_refers_to_a_value_but_is_being_used_as_a_type_here_Did_you_mean_typeof_0, qy.get.unescUnderscores(name));
        return true;
      }
    }
    return false;
  }
  checkAndReportErrorForExportingPrimitiveType(errorLocation: Node, name: qb.__String): boolean {
    if (isPrimitiveTypeName(name) && errorLocation.parent.kind === Syntax.ExportSpecifier) {
      error(errorLocation, qd.Cannot_export_0_Only_local_declarations_can_be_exported_from_a_module, name as string);
      return true;
    }
    return false;
  }
  checkAndReportErrorForUsingTypeAsValue(errorLocation: Node, name: qb.__String, meaning: qt.SymbolFlags): boolean {
    if (meaning & (SymbolFlags.Value & ~SymbolFlags.NamespaceModule)) {
      if (isPrimitiveTypeName(name)) {
        error(errorLocation, qd._0_only_refers_to_a_type_but_is_being_used_as_a_value_here, qy.get.unescUnderscores(name));
        return true;
      }
      const n = resolveName(errorLocation, name, qt.SymbolFlags.Type & ~SymbolFlags.Value, undefined, undefined, false);
      const symbol = resolveSymbol(n);
      if (symbol && !(symbol.flags & qt.SymbolFlags.NamespaceModule)) {
        const message = isES2015OrLaterConstructorName(name)
          ? qd._0_only_refers_to_a_type_but_is_being_used_as_a_value_here_Do_you_need_to_change_your_target_library_Try_changing_the_lib_compiler_option_to_es2015_or_later
          : qd._0_only_refers_to_a_type_but_is_being_used_as_a_value_here;
        error(errorLocation, message, qy.get.unescUnderscores(name));
        return true;
      }
    }
    return false;
  }
  checkAndReportErrorForUsingNamespaceModuleAsValue(errorLocation: Node, name: qb.__String, meaning: qt.SymbolFlags): boolean {
    if (meaning & (SymbolFlags.Value & ~SymbolFlags.NamespaceModule & ~SymbolFlags.Type)) {
      const n = resolveName(errorLocation, name, qt.SymbolFlags.NamespaceModule & ~SymbolFlags.Value, undefined, undefined, false);
      const symbol = resolveSymbol(n);
      if (symbol) {
        error(errorLocation, qd.Cannot_use_namespace_0_as_a_value, qy.get.unescUnderscores(name));
        return true;
      }
    } else if (meaning & (SymbolFlags.Type & ~SymbolFlags.NamespaceModule & ~SymbolFlags.Value)) {
      const n = resolveName(errorLocation, name, (SymbolFlags.ValueModule | qt.SymbolFlags.NamespaceModule) & ~SymbolFlags.Type, undefined, undefined, false);
      const symbol = resolveSymbol(n);
      if (symbol) {
        error(errorLocation, qd.Cannot_use_namespace_0_as_a_type, qy.get.unescUnderscores(name));
        return true;
      }
    }
    return false;
  }
  checkResolvedBlockScopedVariable(result: Symbol, errorLocation: Node): void {
    assert(!!(result.flags & qt.SymbolFlags.BlockScopedVariable || result.flags & qt.SymbolFlags.Class || result.flags & qt.SymbolFlags.Enum));
    if (result.flags & (SymbolFlags.Function | qt.SymbolFlags.FunctionScopedVariable | qt.SymbolFlags.Assignment) && result.flags & qt.SymbolFlags.Class) return;
    const declaration = find(result.declarations, (d) => isBlockOrCatchScoped(d) || is.classLike(d) || d.kind === Syntax.EnumDeclaration);
    if (declaration === undefined) return fail('checkResolvedBlockScopedVariable could not find block-scoped declaration');
    if (!(declaration.flags & NodeFlags.Ambient) && !isBlockScopedNameDeclaredBeforeUse(declaration, errorLocation)) {
      let diagnosticMessage;
      const declarationName = declarationNameToString(get.nameOfDeclaration(declaration));
      if (result.flags & qt.SymbolFlags.BlockScopedVariable) diagnosticMessage = error(errorLocation, qd.Block_scoped_variable_0_used_before_its_declaration, declarationName);
      else if (result.flags & qt.SymbolFlags.Class) {
        diagnosticMessage = error(errorLocation, qd.Class_0_used_before_its_declaration, declarationName);
      } else if (result.flags & qt.SymbolFlags.RegularEnum) {
        diagnosticMessage = error(errorLocation, qd.Enum_0_used_before_its_declaration, declarationName);
      } else {
        assert(!!(result.flags & qt.SymbolFlags.ConstEnum));
        if (compilerOptions.preserveConstEnums) diagnosticMessage = error(errorLocation, qd.Enum_0_used_before_its_declaration, declarationName);
      }
      if (diagnosticMessage) addRelatedInfo(diagnosticMessage, createDiagnosticForNode(declaration, qd._0_is_declared_here, declarationName));
    }
  }
  checkAndReportErrorForResolvingImportAliasToTypeOnlySymbol(node: ImportEqualsDeclaration, resolved: Symbol | undefined) {
    if (markSymbolOfAliasDeclarationIfTypeOnly(node, undefined, resolved, false)) {
      const typeOnlyDeclaration = getSymbolOfNode(node).getTypeOnlyAliasDeclaration()!;
      const isExport = typeOnlyDeclarationIsExport(typeOnlyDeclaration);
      const message = isExport
        ? qd.An_import_alias_cannot_reference_a_declaration_that_was_exported_using_export_type
        : qd.An_import_alias_cannot_reference_a_declaration_that_was_imported_using_import_type;
      const relatedMessage = isExport ? qd._0_was_exported_here : qd._0_was_imported_here;
      const name = qy.get.unescUnderscores(typeOnlyDeclaration.name!.escapedText);
      addRelatedInfo(error(node.moduleReference, message), createDiagnosticForNode(typeOnlyDeclaration, relatedMessage, name));
    }
  }
  checkNoTypeArguments(node: NodeWithTypeArguments, symbol?: Symbol) {
    if (node.typeArguments) {
      error(node, qd.Type_0_is_not_generic, symbol ? symbol.symbolToString() : (<TypeReferenceNode>node).typeName ? declarationNameToString((<TypeReferenceNode>node).typeName) : anon);
      return false;
    }
    return true;
  }
  checkTypeAssignableTo(
    source: Type,
    target: Type,
    errorNode: Node | undefined,
    headMessage?: qd.Message,
    containingMessageChain?: () => qd.MessageChain | undefined,
    errorOutputObject?: { errors?: Diagnostic[] }
  ): boolean {
    return checkTypeRelatedTo(source, target, assignableRelation, errorNode, headMessage, containingMessageChain, errorOutputObject);
  }
  checkTypeAssignableToAndOptionallyElaborate(
    source: Type,
    target: Type,
    errorNode: Node | undefined,
    expr: Expression | undefined,
    headMessage?: qd.Message,
    containingMessageChain?: () => qd.MessageChain | undefined
  ): boolean {
    return checkTypeRelatedToAndOptionallyElaborate(source, target, assignableRelation, errorNode, expr, headMessage, containingMessageChain, undefined);
  }
  checkTypeRelatedToAndOptionallyElaborate(
    source: Type,
    target: Type,
    relation: qb.QMap<RelationComparisonResult>,
    errorNode: Node | undefined,
    expr: Expression | undefined,
    headMessage: qd.Message | undefined,
    containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
    errorOutputContainer: { errors?: Diagnostic[]; skipLogging?: boolean } | undefined
  ): boolean {
    if (isTypeRelatedTo(source, target, relation)) return true;
    if (!errorNode || !elaborateError(expr, source, target, relation, headMessage, containingMessageChain, errorOutputContainer))
      return checkTypeRelatedTo(source, target, relation, errorNode, headMessage, containingMessageChain, errorOutputContainer);
    return false;
  }
  checkExpressionForMutableLocationWithContextualType(next: Expression, sourcePropType: Type) {
    next.contextualType = sourcePropType;
    try {
      return checkExpressionForMutableLocation(next, CheckMode.Contextual, sourcePropType);
    } finally {
      next.contextualType = undefined;
    }
  }
  checkTypeComparableTo(source: Type, target: Type, errorNode: Node, headMessage?: qd.Message, containingMessageChain?: () => qd.MessageChain | undefined): boolean {
    return checkTypeRelatedTo(source, target, comparableRelation, errorNode, headMessage, containingMessageChain);
  }
  checkTypeRelatedTo(
    source: Type,
    target: Type,
    relation: qb.QMap<RelationComparisonResult>,
    errorNode: Node | undefined,
    headMessage?: qd.Message,
    containingMessageChain?: () => qd.MessageChain | undefined,
    errorOutputContainer?: { errors?: Diagnostic[]; skipLogging?: boolean }
  ): boolean {
    let errorInfo: qd.MessageChain | undefined;
    let relatedInfo: [DiagnosticRelatedInformation, ...DiagnosticRelatedInformation[]] | undefined;
    let maybeKeys: string[];
    let sourceStack: Type[];
    let targetStack: Type[];
    let maybeCount = 0;
    let depth = 0;
    let expandingFlags = ExpandingFlags.None;
    let overflow = false;
    let overrideNextErrorInfo = 0;
    let lastSkippedInfo: [Type, Type] | undefined;
    let incompatibleStack: [qd.Message, (string | number)?, (string | number)?, (string | number)?, (string | number)?][] = [];
    let inPropertyCheck = false;
    assert(relation !== identityRelation || !errorNode, 'no error reporting in identity checking');
    const result = isRelatedTo(source, target, !!errorNode, headMessage);
    if (incompatibleStack.length) reportIncompatibleStack();
    if (overflow) {
      const diag = error(errorNode || currentNode, qd.Excessive_stack_depth_comparing_types_0_and_1, typeToString(source), typeToString(target));
      if (errorOutputContainer) (errorOutputContainer.errors || (errorOutputContainer.errors = [])).push(diag);
    } else if (errorInfo) {
      if (containingMessageChain) {
        const chain = containingMessageChain();
        if (chain) {
          concatenateqd.MessageChains(chain, errorInfo);
          errorInfo = chain;
        }
      }
      let relatedInformation: DiagnosticRelatedInformation[] | undefined;
      if (headMessage && errorNode && !result && source.symbol) {
        const links = s.getLinks(source.symbol);
        if (links.originatingImport && !is.importCall(links.originatingImport)) {
          const helpfulRetry = checkTypeRelatedTo(getTypeOfSymbol(links.target!), target, relation, undefined);
          if (helpfulRetry) {
            const diag = createDiagnosticForNode(
              links.originatingImport,
              qd.Type_originates_at_this_import_A_namespace_style_import_cannot_be_called_or_constructed_and_will_cause_a_failure_at_runtime_Consider_using_a_default_import_or_import_require_here_instead
            );
            relatedInformation = append(relatedInformation, diag);
          }
        }
      }
      const diag = createDiagnosticForNodeFromMessageChain(errorNode!, errorInfo, relatedInformation);
      if (relatedInfo) addRelatedInfo(diag, ...relatedInfo);
      if (errorOutputContainer) (errorOutputContainer.errors || (errorOutputContainer.errors = [])).push(diag);
      if (!errorOutputContainer || !errorOutputContainer.skipLogging) diagnostics.add(diag);
    }
    if (errorNode && errorOutputContainer && errorOutputContainer.skipLogging && result === Ternary.False) assert(!!errorOutputContainer.errors, 'missed opportunity to interact with error.');
    return result !== Ternary.False;
    function resetErrorInfo(saved: ReturnType<typeof captureErrorCalculationState>) {
      errorInfo = saved.errorInfo;
      lastSkippedInfo = saved.lastSkippedInfo;
      incompatibleStack = saved.incompatibleStack;
      overrideNextErrorInfo = saved.overrideNextErrorInfo;
      relatedInfo = saved.relatedInfo;
    }
    function captureErrorCalculationState() {
      return {
        errorInfo,
        lastSkippedInfo,
        incompatibleStack: incompatibleStack.slice(),
        overrideNextErrorInfo,
        relatedInfo: !relatedInfo ? undefined : (relatedInfo.slice() as [DiagnosticRelatedInformation, ...DiagnosticRelatedInformation[]] | undefined),
      };
    }
    function reportIncompatibleError(message: qd.Message, arg0?: string | number, arg1?: string | number, arg2?: string | number, arg3?: string | number) {
      overrideNextErrorInfo++;
      lastSkippedInfo = undefined;
      incompatibleStack.push([message, arg0, arg1, arg2, arg3]);
    }
    function reportIncompatibleStack() {
      const stack = incompatibleStack;
      incompatibleStack = [];
      const info = lastSkippedInfo;
      lastSkippedInfo = undefined;
      if (stack.length === 1) {
        reportError(...stack[0]);
        if (info) reportRelationError(undefined, ...info);
        return;
      }
      let path = '';
      const secondaryRootErrors: typeof incompatibleStack = [];
      while (stack.length) {
        const [msg, ...args] = stack.pop()!;
        switch (msg.code) {
          case qd.Types_of_property_0_are_incompatible.code: {
            if (path.indexOf('new ') === 0) path = `(${path})`;
            const str = '' + args[0];
            if (path.length === 0) path = `${str}`;
            else if (qy.is.identifierText(str)) {
              path = `${path}.${str}`;
            } else if (str[0] === '[' && str[str.length - 1] === ']') {
              path = `${path}${str}`;
            } else {
              path = `${path}[${str}]`;
            }
            break;
          }
          case qd.Call_signature_return_types_0_and_1_are_incompatible.code:
          case qd.Construct_signature_return_types_0_and_1_are_incompatible.code:
          case qd.Call_signatures_with_no_arguments_have_incompatible_return_types_0_and_1.code:
          case qd.Construct_signatures_with_no_arguments_have_incompatible_return_types_0_and_1.code: {
            if (path.length === 0) {
              let mappedMsg = msg;
              if (msg.code === qd.Call_signatures_with_no_arguments_have_incompatible_return_types_0_and_1.code) mappedMsg = qd.Call_signature_return_types_0_and_1_are_incompatible;
              else if (msg.code === qd.Construct_signatures_with_no_arguments_have_incompatible_return_types_0_and_1.code) {
                mappedMsg = qd.Construct_signature_return_types_0_and_1_are_incompatible;
              }
              secondaryRootErrors.unshift([mappedMsg, args[0], args[1]]);
            } else {
              const prefix =
                msg.code === qd.Construct_signature_return_types_0_and_1_are_incompatible.code || msg.code === qd.Construct_signatures_with_no_arguments_have_incompatible_return_types_0_and_1.code
                  ? 'new '
                  : '';
              const params =
                msg.code === qd.Call_signatures_with_no_arguments_have_incompatible_return_types_0_and_1.code ||
                msg.code === qd.Construct_signatures_with_no_arguments_have_incompatible_return_types_0_and_1.code
                  ? ''
                  : '...';
              path = `${prefix}${path}(${params})`;
            }
            break;
          }
          default:
            return fail(`Unhandled Diagnostic: ${msg.code}`);
        }
      }
      if (path) reportError(path[path.length - 1] === ')' ? qd.The_types_returned_by_0_are_incompatible_between_these_types : qd.The_types_of_0_are_incompatible_between_these_types, path);
      else {
        secondaryRootErrors.shift();
      }
      for (const [msg, ...args] of secondaryRootErrors) {
        const originalValue = msg.elidedInCompatabilityPyramid;
        msg.elidedInCompatabilityPyramid = false;
        reportError(msg, ...args);
        msg.elidedInCompatabilityPyramid = originalValue;
      }
      if (info) reportRelationError(undefined, ...info);
    }
    function reportError(message: qd.Message, arg0?: string | number, arg1?: string | number, arg2?: string | number, arg3?: string | number): void {
      assert(!!errorNode);
      if (incompatibleStack.length) reportIncompatibleStack();
      if (message.elidedInCompatabilityPyramid) return;
      errorInfo = chainqd.Messages(errorInfo, message, arg0, arg1, arg2, arg3);
    }
    function associateRelatedInfo(info: DiagnosticRelatedInformation) {
      assert(!!errorInfo);
      if (!relatedInfo) relatedInfo = [info];
      else {
        relatedInfo.push(info);
      }
    }
    function reportRelationError(message: qd.Message | undefined, source: Type, target: Type) {
      if (incompatibleStack.length) reportIncompatibleStack();
      const [sourceType, targetType] = getTypeNamesForErrorDisplay(source, target);
      let generalizedSource = source;
      let generalizedSourceType = sourceType;
      if (isLiteralType(source) && !typeCouldHaveTopLevelSingletonTypes(target)) {
        generalizedSource = getBaseTypeOfLiteralType(source);
        generalizedSourceType = getTypeNameForErrorDisplay(generalizedSource);
      }
      if (target.flags & qt.TypeFlags.TypeParameter) {
        const constraint = getBaseConstraintOfType(target);
        let needsOriginalSource;
        if (constraint && (isTypeAssignableTo(generalizedSource, constraint) || (needsOriginalSource = isTypeAssignableTo(source, constraint)))) {
          reportError(
            qd._0_is_assignable_to_the_constraint_of_type_1_but_1_could_be_instantiated_with_a_different_subtype_of_constraint_2,
            needsOriginalSource ? sourceType : generalizedSourceType,
            targetType,
            typeToString(constraint)
          );
        } else {
          reportError(qd._0_could_be_instantiated_with_an_arbitrary_type_which_could_be_unrelated_to_1, targetType, generalizedSourceType);
        }
      }
      if (!message) {
        if (relation === comparableRelation) message = qd.Type_0_is_not_comparable_to_type_1;
        else if (sourceType === targetType) {
          message = qd.Type_0_is_not_assignable_to_type_1_Two_different_types_with_this_name_exist_but_they_are_unrelated;
        } else {
          message = qd.Type_0_is_not_assignable_to_type_1;
        }
      }
      reportError(message, generalizedSourceType, targetType);
    }
    function tryElaborateErrorsForPrimitivesAndObjects(source: Type, target: Type) {
      const sourceType = symbolValueDeclarationIsContextSensitive(source.symbol) ? typeToString(source, source.symbol.valueDeclaration) : typeToString(source);
      const targetType = symbolValueDeclarationIsContextSensitive(target.symbol) ? typeToString(target, target.symbol.valueDeclaration) : typeToString(target);
      if (
        (globalStringType === source && stringType === target) ||
        (globalNumberType === source && numberType === target) ||
        (globalBooleanType === source && booleanType === target) ||
        (getGlobalESSymbolType(false) === source && esSymbolType === target)
      ) {
        reportError(qd._0_is_a_primitive_but_1_is_a_wrapper_object_Prefer_using_0_when_possible, targetType, sourceType);
      }
    }
    function tryElaborateArrayLikeErrors(source: Type, target: Type, reportErrors: boolean): boolean {
      if (isTupleType(source)) {
        if (source.target.readonly && isMutableArrayOrTuple(target)) {
          if (reportErrors) reportError(qd.The_type_0_is_readonly_and_cannot_be_assigned_to_the_mutable_type_1, typeToString(source), typeToString(target));
          return false;
        }
        return isTupleType(target) || isArrayType(target);
      }
      if (isReadonlyArrayType(source) && isMutableArrayOrTuple(target)) {
        if (reportErrors) reportError(qd.The_type_0_is_readonly_and_cannot_be_assigned_to_the_mutable_type_1, typeToString(source), typeToString(target));
        return false;
      }
      if (isTupleType(target)) return isArrayType(source);
      return true;
    }
    function isRelatedTo(originalSource: Type, originalTarget: Type, reportErrors = false, headMessage?: qd.Message, intersectionState = IntersectionState.None): Ternary {
      if (originalSource.flags & qt.TypeFlags.Object && originalTarget.flags & qt.TypeFlags.Primitive) {
        if (isSimpleTypeRelatedTo(originalSource, originalTarget, relation, reportErrors ? reportError : undefined)) return Ternary.True;
        reportErrorResults(originalSource, originalTarget, Ternary.False, !!(getObjectFlags(originalSource) & ObjectFlags.JsxAttributes));
        return Ternary.False;
      }
      const source = getNormalizedType(originalSource, false);
      let target = getNormalizedType(originalTarget, true);
      if (source === target) return Ternary.True;
      if (relation === identityRelation) return isIdenticalTo(source, target);
      if (source.flags & qt.TypeFlags.TypeParameter && getConstraintOfType(source) === target) return Ternary.True;
      if (target.flags & qt.TypeFlags.Union && source.flags & qt.TypeFlags.Object && (target as UnionType).types.length <= 3 && maybeTypeOfKind(target, qt.TypeFlags.Nullable)) {
        const nullStrippedTarget = extractTypesOfKind(target, ~TypeFlags.Nullable);
        if (!(nullStrippedTarget.flags & (TypeFlags.Union | qt.TypeFlags.Never))) {
          if (source === nullStrippedTarget) return Ternary.True;
          target = nullStrippedTarget;
        }
      }
      if (
        (relation === comparableRelation && !(target.flags & qt.TypeFlags.Never) && isSimpleTypeRelatedTo(target, source, relation)) ||
        isSimpleTypeRelatedTo(source, target, relation, reportErrors ? reportError : undefined)
      )
        return Ternary.True;
      const isComparingJsxAttributes = !!(getObjectFlags(source) & ObjectFlags.JsxAttributes);
      const isPerformingExcessPropertyChecks = !(intersectionState & IntersectionState.Target) && isObjectLiteralType(source) && getObjectFlags(source) & ObjectFlags.FreshLiteral;
      if (isPerformingExcessPropertyChecks) {
        if (hasExcessProperties(<FreshObjectLiteralType>source, target, reportErrors)) {
          if (reportErrors) reportRelationError(headMessage, source, target);
          return Ternary.False;
        }
      }
      const isPerformingCommonPropertyChecks =
        relation !== comparableRelation &&
        !(intersectionState & IntersectionState.Target) &&
        source.flags & (TypeFlags.Primitive | qt.TypeFlags.Object | qt.TypeFlags.Intersection) &&
        source !== globalObjectType &&
        target.flags & (TypeFlags.Object | qt.TypeFlags.Intersection) &&
        isWeakType(target) &&
        (getPropertiesOfType(source).length > 0 || typeHasCallOrConstructSignatures(source));
      if (isPerformingCommonPropertyChecks && !hasCommonProperties(source, target, isComparingJsxAttributes)) {
        if (reportErrors) {
          const calls = getSignaturesOfType(source, SignatureKind.Call);
          const constructs = getSignaturesOfType(source, SignatureKind.Construct);
          if ((calls.length > 0 && isRelatedTo(getReturnTypeOfSignature(calls[0]), target, false)) || (constructs.length > 0 && isRelatedTo(getReturnTypeOfSignature(constructs[0]), target, false)))
            reportError(qd.Value_of_type_0_has_no_properties_in_common_with_type_1_Did_you_mean_to_call_it, typeToString(source), typeToString(target));
          else {
            reportError(qd.Type_0_has_no_properties_in_common_with_type_1, typeToString(source), typeToString(target));
          }
        }
        return Ternary.False;
      }
      let result = Ternary.False;
      const saveErrorInfo = captureErrorCalculationState();
      if (source.flags & qt.TypeFlags.Union) {
        result =
          relation === comparableRelation
            ? someTypeRelatedToType(source as UnionType, target, reportErrors && !(source.flags & qt.TypeFlags.Primitive), intersectionState)
            : eachTypeRelatedToType(source as UnionType, target, reportErrors && !(source.flags & qt.TypeFlags.Primitive), intersectionState);
      } else {
        if (target.flags & qt.TypeFlags.Union)
          result = typeRelatedToSomeType(
            getRegularTypeOfObjectLiteral(source),
            <UnionType>target,
            reportErrors && !(source.flags & qt.TypeFlags.Primitive) && !(target.flags & qt.TypeFlags.Primitive)
          );
        else if (target.flags & qt.TypeFlags.Intersection) {
          result = typeRelatedToEachType(getRegularTypeOfObjectLiteral(source), target as IntersectionType, reportErrors, IntersectionState.Target);
        } else if (source.flags & qt.TypeFlags.Intersection) {
          result = someTypeRelatedToType(<IntersectionType>source, target, false, IntersectionState.Source);
        }
        if (!result && (source.flags & qt.TypeFlags.StructuredOrInstantiable || target.flags & qt.TypeFlags.StructuredOrInstantiable)) {
          if ((result = recursiveTypeRelatedTo(source, target, reportErrors, intersectionState))) resetErrorInfo(saveErrorInfo);
        }
      }
      if (!result && source.flags & (TypeFlags.Intersection | qt.TypeFlags.TypeParameter)) {
        const constraint = getEffectiveConstraintOfIntersection(source.flags & qt.TypeFlags.Intersection ? (<IntersectionType>source).types : [source], !!(target.flags & qt.TypeFlags.Union));
        if (constraint && (source.flags & qt.TypeFlags.Intersection || target.flags & qt.TypeFlags.Union)) {
          if (everyType(constraint, (c) => c !== source)) {
            if ((result = isRelatedTo(constraint, target, false, undefined, intersectionState))) resetErrorInfo(saveErrorInfo);
          }
        }
      }
      if (
        result &&
        !inPropertyCheck &&
        ((target.flags & qt.TypeFlags.Intersection && (isPerformingExcessPropertyChecks || isPerformingCommonPropertyChecks)) ||
          (isNonGenericObjectType(target) &&
            !isArrayType(target) &&
            !isTupleType(target) &&
            source.flags & qt.TypeFlags.Intersection &&
            getApparentType(source).flags & qt.TypeFlags.StructuredType &&
            !some((<IntersectionType>source).types, (t) => !!(getObjectFlags(t) & ObjectFlags.NonInferrableType))))
      ) {
        inPropertyCheck = true;
        result &= recursiveTypeRelatedTo(source, target, reportErrors, IntersectionState.PropertyCheck);
        inPropertyCheck = false;
      }
      reportErrorResults(source, target, result, isComparingJsxAttributes);
      return result;
      function reportErrorResults(source: Type, target: Type, result: Ternary, isComparingJsxAttributes: boolean) {
        if (!result && reportErrors) {
          source = originalSource.aliasSymbol ? originalSource : source;
          target = originalTarget.aliasSymbol ? originalTarget : target;
          let maybeSuppress = overrideNextErrorInfo > 0;
          if (maybeSuppress) overrideNextErrorInfo--;
          if (source.flags & qt.TypeFlags.Object && target.flags & qt.TypeFlags.Object) {
            const currentError = errorInfo;
            tryElaborateArrayLikeErrors(source, target, reportErrors);
            if (errorInfo !== currentError) maybeSuppress = !!errorInfo;
          }
          if (source.flags & qt.TypeFlags.Object && target.flags & qt.TypeFlags.Primitive) tryElaborateErrorsForPrimitivesAndObjects(source, target);
          else if (source.symbol && source.flags & qt.TypeFlags.Object && globalObjectType === source) {
            reportError(qd.The_Object_type_is_assignable_to_very_few_other_types_Did_you_mean_to_use_the_any_type_instead);
          } else if (isComparingJsxAttributes && target.flags & qt.TypeFlags.Intersection) {
            const targetTypes = (target as IntersectionType).types;
            const intrinsicAttributes = getJsxType(JsxNames.IntrinsicAttributes, errorNode);
            const intrinsicClassAttributes = getJsxType(JsxNames.IntrinsicClassAttributes, errorNode);
            if (intrinsicAttributes !== errorType && intrinsicClassAttributes !== errorType && (contains(targetTypes, intrinsicAttributes) || contains(targetTypes, intrinsicClassAttributes)))
              return result;
          } else {
            errorInfo = elaborateNeverIntersection(errorInfo, originalTarget);
          }
          if (!headMessage && maybeSuppress) {
            lastSkippedInfo = [source, target];
            return result;
          }
          reportRelationError(headMessage, source, target);
        }
      }
    }
    function isIdenticalTo(source: Type, target: Type): Ternary {
      const flags = source.flags & target.flags;
      if (!(flags & qt.TypeFlags.Substructure)) return Ternary.False;
      if (flags & qt.TypeFlags.UnionOrIntersection) {
        let result = eachTypeRelatedToSomeType(<UnionOrIntersectionType>source, <UnionOrIntersectionType>target);
        if (result) result &= eachTypeRelatedToSomeType(<UnionOrIntersectionType>target, <UnionOrIntersectionType>source);
        return result;
      }
      return recursiveTypeRelatedTo(source, target, false, IntersectionState.None);
    }
    function getTypeOfPropertyInTypes(types: Type[], name: qb.__String) {
      const appendPropType = (propTypes: Type[] | undefined, type: Type) => {
        type = getApparentType(type);
        const prop = type.flags & qt.TypeFlags.UnionOrIntersection ? getPropertyOfUnionOrIntersectionType(<UnionOrIntersectionType>type, name) : getPropertyOfObjectType(type, name);
        const propType = (prop && getTypeOfSymbol(prop)) || (NumericLiteral.name(name) && getIndexTypeOfType(type, IndexKind.Number)) || getIndexTypeOfType(type, IndexKind.String) || undefinedType;
        return append(propTypes, propType);
      };
      return getUnionType(reduceLeft(types, appendPropType, undefined) || empty);
    }
    function hasExcessProperties(source: FreshObjectLiteralType, target: Type, reportErrors: boolean): boolean {
      if (!isExcessPropertyCheckTarget(target) || (!noImplicitAny && getObjectFlags(target) & ObjectFlags.JSLiteral)) return false;
      const isComparingJsxAttributes = !!(getObjectFlags(source) & ObjectFlags.JsxAttributes);
      if ((relation === assignableRelation || relation === comparableRelation) && (isTypeSubsetOf(globalObjectType, target) || (!isComparingJsxAttributes && isEmptyObjectType(target)))) return false;
      let reducedTarget = target;
      let checkTypes: Type[] | undefined;
      if (target.flags & qt.TypeFlags.Union) {
        reducedTarget = findMatchingDiscriminantType(source, <UnionType>target, isRelatedTo) || filterPrimitivesIfContainsNonPrimitive(<UnionType>target);
        checkTypes = reducedTarget.flags & qt.TypeFlags.Union ? (<UnionType>reducedTarget).types : [reducedTarget];
      }
      for (const prop of getPropertiesOfType(source)) {
        if (shouldCheckAsExcessProperty(prop, source.symbol) && !isIgnoredJsxProperty(source, prop)) {
          if (!isKnownProperty(reducedTarget, prop.escName, isComparingJsxAttributes)) {
            if (reportErrors) {
              const errorTarget = filterType(reducedTarget, isExcessPropertyCheckTarget);
              if (!errorNode) return fail();
              if (is.kind(qc.JsxAttributes, errorNode) || qc.isJsx.openingLikeElement(errorNode) || qc.isJsx.openingLikeElement(errorNode.parent)) {
                if (prop.valueDeclaration && is.kind(qc.JsxAttribute, prop.valueDeclaration) && get.sourceFileOf(errorNode) === get.sourceFileOf(prop.valueDeclaration.name))
                  errorNode = prop.valueDeclaration.name;
                reportError(qd.Property_0_does_not_exist_on_type_1, prop.symbolToString(), typeToString(errorTarget));
              } else {
                const objectLiteralDeclaration = source.symbol && firstOrUndefined(source.symbol.declarations);
                let suggestion;
                if (
                  prop.valueDeclaration &&
                  qc.findAncestor(prop.valueDeclaration, (d) => d === objectLiteralDeclaration) &&
                  get.sourceFileOf(objectLiteralDeclaration) === get.sourceFileOf(errorNode)
                ) {
                  const propDeclaration = prop.valueDeclaration as ObjectLiteralElementLike;
                  Debug.assertNode(propDeclaration, isObjectLiteralElementLike);
                  errorNode = propDeclaration;
                  const name = propDeclaration.name!;
                  if (is.kind(qc.Identifier, name)) suggestion = getSuggestionForNonexistentProperty(name, errorTarget);
                }
                if (suggestion !== undefined) {
                  reportError(qd.Object_literal_may_only_specify_known_properties_but_0_does_not_exist_in_type_1_Did_you_mean_to_write_2, prop.symbolToString(), typeToString(errorTarget), suggestion);
                } else {
                  reportError(qd.Object_literal_may_only_specify_known_properties_and_0_does_not_exist_in_type_1, prop.symbolToString(), typeToString(errorTarget));
                }
              }
            }
            return true;
          }
          if (checkTypes && !isRelatedTo(getTypeOfSymbol(prop), getTypeOfPropertyInTypes(checkTypes, prop.escName), reportErrors)) {
            if (reportErrors) reportIncompatibleError(qd.Types_of_property_0_are_incompatible, prop.symbolToString());
            return true;
          }
        }
      }
      return false;
    }
    function shouldCheckAsExcessProperty(prop: Symbol, container: Symbol) {
      return prop.valueDeclaration && container.valueDeclaration && prop.valueDeclaration.parent === container.valueDeclaration;
    }
    function eachTypeRelatedToSomeType(source: UnionOrIntersectionType, target: UnionOrIntersectionType): Ternary {
      let result = Ternary.True;
      const sourceTypes = source.types;
      for (const sourceType of sourceTypes) {
        const related = typeRelatedToSomeType(sourceType, target, false);
        if (!related) return Ternary.False;
        result &= related;
      }
      return result;
    }
    function typeRelatedToSomeType(source: Type, target: UnionOrIntersectionType, reportErrors: boolean): Ternary {
      const targetTypes = target.types;
      if (target.flags & qt.TypeFlags.Union && containsType(targetTypes, source)) return Ternary.True;
      for (const type of targetTypes) {
        const related = isRelatedTo(source, type, false);
        if (related) return related;
      }
      if (reportErrors) {
        const bestMatchingType = getBestMatchingType(source, target, isRelatedTo);
        isRelatedTo(source, bestMatchingType || targetTypes[targetTypes.length - 1], true);
      }
      return Ternary.False;
    }
    function typeRelatedToEachType(source: Type, target: IntersectionType, reportErrors: boolean, intersectionState: IntersectionState): Ternary {
      let result = Ternary.True;
      const targetTypes = target.types;
      for (const targetType of targetTypes) {
        const related = isRelatedTo(source, targetType, reportErrors, undefined, intersectionState);
        if (!related) return Ternary.False;
        result &= related;
      }
      return result;
    }
    function someTypeRelatedToType(source: UnionOrIntersectionType, target: Type, reportErrors: boolean, intersectionState: IntersectionState): Ternary {
      const sourceTypes = source.types;
      if (source.flags & qt.TypeFlags.Union && containsType(sourceTypes, target)) return Ternary.True;
      const len = sourceTypes.length;
      for (let i = 0; i < len; i++) {
        const related = isRelatedTo(sourceTypes[i], target, reportErrors && i === len - 1, undefined, intersectionState);
        if (related) return related;
      }
      return Ternary.False;
    }
    function eachTypeRelatedToType(source: UnionOrIntersectionType, target: Type, reportErrors: boolean, intersectionState: IntersectionState): Ternary {
      let result = Ternary.True;
      const sourceTypes = source.types;
      for (let i = 0; i < sourceTypes.length; i++) {
        const sourceType = sourceTypes[i];
        if (target.flags & qt.TypeFlags.Union && (target as UnionType).types.length === sourceTypes.length) {
          const related = isRelatedTo(sourceType, (target as UnionType).types[i], false, undefined, intersectionState);
          if (related) {
            result &= related;
            continue;
          }
        }
        const related = isRelatedTo(sourceType, target, reportErrors, undefined, intersectionState);
        if (!related) return Ternary.False;
        result &= related;
      }
      return result;
    }
    function typeArgumentsRelatedTo(
      sources: readonly Type[] = empty,
      targets: readonly Type[] = empty,
      variances: readonly VarianceFlags[] = empty,
      reportErrors: boolean,
      intersectionState: IntersectionState
    ): Ternary {
      if (sources.length !== targets.length && relation === identityRelation) return Ternary.False;
      const length = sources.length <= targets.length ? sources.length : targets.length;
      let result = Ternary.True;
      for (let i = 0; i < length; i++) {
        const varianceFlags = i < variances.length ? variances[i] : VarianceFlags.Covariant;
        const variance = varianceFlags & VarianceFlags.VarianceMask;
        if (variance !== VarianceFlags.Independent) {
          const s = sources[i];
          const t = targets[i];
          let related = Ternary.True;
          if (varianceFlags & VarianceFlags.Unmeasurable) related = relation === identityRelation ? isRelatedTo(s, t, false) : compareTypesIdentical(s, t);
          else if (variance === VarianceFlags.Covariant) {
            related = isRelatedTo(s, t, reportErrors, undefined, intersectionState);
          } else if (variance === VarianceFlags.Contravariant) {
            related = isRelatedTo(t, s, reportErrors, undefined, intersectionState);
          } else if (variance === VarianceFlags.Bivariant) {
            related = isRelatedTo(t, s, false);
            if (!related) related = isRelatedTo(s, t, reportErrors, undefined, intersectionState);
          } else {
            related = isRelatedTo(s, t, reportErrors, undefined, intersectionState);
            if (related) related &= isRelatedTo(t, s, reportErrors, undefined, intersectionState);
          }
          if (!related) return Ternary.False;
          result &= related;
        }
      }
      return result;
    }
    function recursiveTypeRelatedTo(source: Type, target: Type, reportErrors: boolean, intersectionState: IntersectionState): Ternary {
      if (overflow) return Ternary.False;
      const id = getRelationKey(source, target, intersectionState | (inPropertyCheck ? IntersectionState.InPropertyCheck : 0), relation);
      const entry = relation.get(id);
      if (entry !== undefined) {
        if (reportErrors && entry & RelationComparisonResult.Failed && !(entry & RelationComparisonResult.Reported)) {
        } else {
          if (outofbandVarianceMarkerHandler) {
            const saved = entry & RelationComparisonResult.ReportsMask;
            if (saved & RelationComparisonResult.ReportsUnmeasurable) instantiateType(source, makeFunctionTypeMapper(reportUnmeasurableMarkers));
            if (saved & RelationComparisonResult.ReportsUnreliable) instantiateType(source, makeFunctionTypeMapper(reportUnreliableMarkers));
          }
          return entry & RelationComparisonResult.Succeeded ? Ternary.True : Ternary.False;
        }
      }
      if (!maybeKeys) {
        maybeKeys = [];
        sourceStack = [];
        targetStack = [];
      } else {
        for (let i = 0; i < maybeCount; i++) {
          if (id === maybeKeys[i]) return Ternary.Maybe;
        }
        if (depth === 100) {
          overflow = true;
          return Ternary.False;
        }
      }
      const maybeStart = maybeCount;
      maybeKeys[maybeCount] = id;
      maybeCount++;
      sourceStack[depth] = source;
      targetStack[depth] = target;
      depth++;
      const saveExpandingFlags = expandingFlags;
      if (!(expandingFlags & ExpandingFlags.Source) && isDeeplyNestedType(source, sourceStack, depth)) expandingFlags |= ExpandingFlags.Source;
      if (!(expandingFlags & ExpandingFlags.Target) && isDeeplyNestedType(target, targetStack, depth)) expandingFlags |= ExpandingFlags.Target;
      let originalHandler: typeof outofbandVarianceMarkerHandler;
      let propagatingVarianceFlags: RelationComparisonResult = 0;
      if (outofbandVarianceMarkerHandler) {
        originalHandler = outofbandVarianceMarkerHandler;
        outofbandVarianceMarkerHandler = (onlyUnreliable) => {
          propagatingVarianceFlags |= onlyUnreliable ? RelationComparisonResult.ReportsUnreliable : RelationComparisonResult.ReportsUnmeasurable;
          return originalHandler!(onlyUnreliable);
        };
      }
      const result = expandingFlags !== ExpandingFlags.Both ? structuredTypeRelatedTo(source, target, reportErrors, intersectionState) : Ternary.Maybe;
      if (outofbandVarianceMarkerHandler) outofbandVarianceMarkerHandler = originalHandler;
      expandingFlags = saveExpandingFlags;
      depth--;
      if (result) {
        if (result === Ternary.True || depth === 0) {
          for (let i = maybeStart; i < maybeCount; i++) {
            relation.set(maybeKeys[i], RelationComparisonResult.Succeeded | propagatingVarianceFlags);
          }
          maybeCount = maybeStart;
        }
      } else {
        relation.set(id, (reportErrors ? RelationComparisonResult.Reported : 0) | RelationComparisonResult.Failed | propagatingVarianceFlags);
        maybeCount = maybeStart;
      }
      return result;
    }
    function structuredTypeRelatedTo(source: Type, target: Type, reportErrors: boolean, intersectionState: IntersectionState): Ternary {
      if (intersectionState & IntersectionState.PropertyCheck) return propertiesRelatedTo(source, target, reportErrors, undefined, IntersectionState.None);
      const flags = source.flags & target.flags;
      if (relation === identityRelation && !(flags & qt.TypeFlags.Object)) {
        if (flags & qt.TypeFlags.Index) return isRelatedTo((<IndexType>source).type, (<IndexType>target).type, false);
        let result = Ternary.False;
        if (flags & qt.TypeFlags.IndexedAccess) {
          if ((result = isRelatedTo((<IndexedAccessType>source).objectType, (<IndexedAccessType>target).objectType, false))) {
            if ((result &= isRelatedTo((<IndexedAccessType>source).indexType, (<IndexedAccessType>target).indexType, false))) return result;
          }
        }
        if (flags & qt.TypeFlags.Conditional) {
          if ((<ConditionalType>source).root.isDistributive === (<ConditionalType>target).root.isDistributive) {
            if ((result = isRelatedTo((<ConditionalType>source).checkType, (<ConditionalType>target).checkType, false))) {
              if ((result &= isRelatedTo((<ConditionalType>source).extendsType, (<ConditionalType>target).extendsType, false))) {
                if ((result &= isRelatedTo(getTrueTypeFromConditionalType(<ConditionalType>source), getTrueTypeFromConditionalType(<ConditionalType>target), false))) {
                  if ((result &= isRelatedTo(getFalseTypeFromConditionalType(<ConditionalType>source), getFalseTypeFromConditionalType(<ConditionalType>target), false))) return result;
                }
              }
            }
          }
        }
        if (flags & qt.TypeFlags.Substitution) return isRelatedTo((<SubstitutionType>source).substitute, (<SubstitutionType>target).substitute, false);
        return Ternary.False;
      }
      let result: Ternary;
      let originalErrorInfo: qd.MessageChain | undefined;
      let varianceCheckFailed = false;
      const saveErrorInfo = captureErrorCalculationState();
      if (
        source.flags & (TypeFlags.Object | qt.TypeFlags.Conditional) &&
        source.aliasSymbol &&
        source.aliasTypeArguments &&
        source.aliasSymbol === target.aliasSymbol &&
        !(source.aliasTypeArgumentsContainsMarker || target.aliasTypeArgumentsContainsMarker)
      ) {
        const variances = getAliasVariances(source.aliasSymbol);
        if (variances === empty) return Ternary.Maybe;
        const varianceResult = relateVariances(source.aliasTypeArguments, target.aliasTypeArguments, variances, intersectionState);
        if (varianceResult !== undefined) return varianceResult;
      }
      if (target.flags & qt.TypeFlags.TypeParameter) {
        if (getObjectFlags(source) & ObjectFlags.Mapped && isRelatedTo(getIndexType(target), getConstraintTypeFromMappedType(<MappedType>source))) {
          if (!(getMappedTypeModifiers(<MappedType>source) & MappedTypeModifiers.IncludeOptional)) {
            const templateType = getTemplateTypeFromMappedType(<MappedType>source);
            const indexedAccessType = getIndexedAccessType(target, getTypeParameterFromMappedType(<MappedType>source));
            if ((result = isRelatedTo(templateType, indexedAccessType, reportErrors))) return result;
          }
        }
      } else if (target.flags & qt.TypeFlags.Index) {
        if (source.flags & qt.TypeFlags.Index) {
          if ((result = isRelatedTo((<IndexType>target).type, (<IndexType>source).type, false))) return result;
        }
        const constraint = getSimplifiedTypeOrConstraint((<IndexType>target).type);
        if (constraint) {
          if (isRelatedTo(source, getIndexType(constraint, (target as IndexType).stringsOnly), reportErrors) === Ternary.True) return Ternary.True;
        }
      } else if (target.flags & qt.TypeFlags.IndexedAccess) {
        if (relation !== identityRelation) {
          const objectType = (<IndexedAccessType>target).objectType;
          const indexType = (<IndexedAccessType>target).indexType;
          const baseObjectType = getBaseConstraintOfType(objectType) || objectType;
          const baseIndexType = getBaseConstraintOfType(indexType) || indexType;
          if (!isGenericObjectType(baseObjectType) && !isGenericIndexType(baseIndexType)) {
            const accessFlags = AccessFlags.Writing | (baseObjectType !== objectType ? AccessFlags.NoIndexSignatures : 0);
            const constraint = getIndexedAccessTypeOrUndefined(baseObjectType, baseIndexType, undefined, accessFlags);
            if (constraint && (result = isRelatedTo(source, constraint, reportErrors))) return result;
          }
        }
      } else if (isGenericMappedType(target)) {
        const template = getTemplateTypeFromMappedType(target);
        const modifiers = getMappedTypeModifiers(target);
        if (!(modifiers & MappedTypeModifiers.ExcludeOptional)) {
          if (template.flags & qt.TypeFlags.IndexedAccess && (<IndexedAccessType>template).objectType === source && (<IndexedAccessType>template).indexType === getTypeParameterFromMappedType(target))
            return Ternary.True;
          if (!isGenericMappedType(source)) {
            const targetConstraint = getConstraintTypeFromMappedType(target);
            const sourceKeys = getIndexType(source, true);
            const includeOptional = modifiers & MappedTypeModifiers.IncludeOptional;
            const filteredByApplicability = includeOptional ? intersectTypes(targetConstraint, sourceKeys) : undefined;
            if (includeOptional ? !(filteredByApplicability!.flags & qt.TypeFlags.Never) : isRelatedTo(targetConstraint, sourceKeys)) {
              const typeParameter = getTypeParameterFromMappedType(target);
              const indexingType = filteredByApplicability ? getIntersectionType([filteredByApplicability, typeParameter]) : typeParameter;
              const indexedAccessType = getIndexedAccessType(source, indexingType);
              const templateType = getTemplateTypeFromMappedType(target);
              if ((result = isRelatedTo(indexedAccessType, templateType, reportErrors))) return result;
            }
            originalErrorInfo = errorInfo;
            resetErrorInfo(saveErrorInfo);
          }
        }
      }
      if (source.flags & qt.TypeFlags.TypeVariable) {
        if (source.flags & qt.TypeFlags.IndexedAccess && target.flags & qt.TypeFlags.IndexedAccess) {
          if ((result = isRelatedTo((<IndexedAccessType>source).objectType, (<IndexedAccessType>target).objectType, reportErrors)))
            result &= isRelatedTo((<IndexedAccessType>source).indexType, (<IndexedAccessType>target).indexType, reportErrors);
          if (result) {
            resetErrorInfo(saveErrorInfo);
            return result;
          }
        } else {
          const constraint = getConstraintOfType(<TypeVariable>source);
          if (!constraint || (source.flags & qt.TypeFlags.TypeParameter && constraint.flags & qt.TypeFlags.Any)) {
            if ((result = isRelatedTo(emptyObjectType, extractTypesOfKind(target, ~TypeFlags.NonPrimitive)))) {
              resetErrorInfo(saveErrorInfo);
              return result;
            }
          } else if ((result = isRelatedTo(constraint, target, false, undefined, intersectionState))) {
            resetErrorInfo(saveErrorInfo);
            return result;
          } else if ((result = isRelatedTo(getTypeWithThisArgument(constraint, source), target, reportErrors, undefined, intersectionState))) {
            resetErrorInfo(saveErrorInfo);
            return result;
          }
        }
      } else if (source.flags & qt.TypeFlags.Index) {
        if ((result = isRelatedTo(keyofConstraintType, target, reportErrors))) {
          resetErrorInfo(saveErrorInfo);
          return result;
        }
      } else if (source.flags & qt.TypeFlags.Conditional) {
        if (target.flags & qt.TypeFlags.Conditional) {
          const sourceParams = (source as ConditionalType).root.inferTypeParameters;
          let sourceExtends = (<ConditionalType>source).extendsType;
          let mapper: TypeMapper | undefined;
          if (sourceParams) {
            const ctx = createInferenceContext(sourceParams, undefined, InferenceFlags.None, isRelatedTo);
            inferTypes(ctx.inferences, (<ConditionalType>target).extendsType, sourceExtends, InferencePriority.NoConstraints | InferencePriority.AlwaysStrict);
            sourceExtends = instantiateType(sourceExtends, ctx.mapper);
            mapper = ctx.mapper;
          }
          if (
            isTypeIdenticalTo(sourceExtends, (<ConditionalType>target).extendsType) &&
            (isRelatedTo((<ConditionalType>source).checkType, (<ConditionalType>target).checkType) || isRelatedTo((<ConditionalType>target).checkType, (<ConditionalType>source).checkType))
          ) {
            if ((result = isRelatedTo(instantiateType(getTrueTypeFromConditionalType(<ConditionalType>source), mapper), getTrueTypeFromConditionalType(<ConditionalType>target), reportErrors)))
              result &= isRelatedTo(getFalseTypeFromConditionalType(<ConditionalType>source), getFalseTypeFromConditionalType(<ConditionalType>target), reportErrors);
            if (result) {
              resetErrorInfo(saveErrorInfo);
              return result;
            }
          }
        } else {
          const distributiveConstraint = getConstraintOfDistributiveConditionalType(<ConditionalType>source);
          if (distributiveConstraint) {
            if ((result = isRelatedTo(distributiveConstraint, target, reportErrors))) {
              resetErrorInfo(saveErrorInfo);
              return result;
            }
          }
        }
        const defaultConstraint = getDefaultConstraintOfConditionalType(<ConditionalType>source);
        if (defaultConstraint) {
          if ((result = isRelatedTo(defaultConstraint, target, reportErrors))) {
            resetErrorInfo(saveErrorInfo);
            return result;
          }
        }
      } else {
        if (relation !== subtypeRelation && relation !== strictSubtypeRelation && isPartialMappedType(target) && isEmptyObjectType(source)) return Ternary.True;
        if (isGenericMappedType(target)) {
          if (isGenericMappedType(source)) {
            if ((result = mappedTypeRelatedTo(source, target, reportErrors))) {
              resetErrorInfo(saveErrorInfo);
              return result;
            }
          }
          return Ternary.False;
        }
        const sourceIsPrimitive = !!(source.flags & qt.TypeFlags.Primitive);
        if (relation !== identityRelation) source = getApparentType(source);
        else if (isGenericMappedType(source)) return Ternary.False;
        if (
          getObjectFlags(source) & ObjectFlags.Reference &&
          getObjectFlags(target) & ObjectFlags.Reference &&
          (<TypeReference>source).target === (<TypeReference>target).target &&
          !(getObjectFlags(source) & ObjectFlags.MarkerType || getObjectFlags(target) & ObjectFlags.MarkerType)
        ) {
          const variances = getVariances((<TypeReference>source).target);
          if (variances === empty) return Ternary.Maybe;
          const varianceResult = relateVariances(getTypeArguments(<TypeReference>source), getTypeArguments(<TypeReference>target), variances, intersectionState);
          if (varianceResult !== undefined) return varianceResult;
        } else if (isReadonlyArrayType(target) ? isArrayType(source) || isTupleType(source) : isArrayType(target) && isTupleType(source) && !source.target.readonly) {
          if (relation !== identityRelation) return isRelatedTo(getIndexTypeOfType(source, IndexKind.Number) || anyType, getIndexTypeOfType(target, IndexKind.Number) || anyType, reportErrors);
          return Ternary.False;
        } else if (
          (relation === subtypeRelation || relation === strictSubtypeRelation) &&
          isEmptyObjectType(target) &&
          getObjectFlags(target) & ObjectFlags.FreshLiteral &&
          !isEmptyObjectType(source)
        ) {
          return Ternary.False;
        }
        if (source.flags & (TypeFlags.Object | qt.TypeFlags.Intersection) && target.flags & qt.TypeFlags.Object) {
          const reportStructuralErrors = reportErrors && errorInfo === saveErrorInfo.errorInfo && !sourceIsPrimitive;
          result = propertiesRelatedTo(source, target, reportStructuralErrors, undefined, intersectionState);
          if (result) {
            result &= signaturesRelatedTo(source, target, SignatureKind.Call, reportStructuralErrors);
            if (result) {
              result &= signaturesRelatedTo(source, target, SignatureKind.Construct, reportStructuralErrors);
              if (result) {
                result &= indexTypesRelatedTo(source, target, IndexKind.String, sourceIsPrimitive, reportStructuralErrors, intersectionState);
                if (result) result &= indexTypesRelatedTo(source, target, IndexKind.Number, sourceIsPrimitive, reportStructuralErrors, intersectionState);
              }
            }
          }
          if (varianceCheckFailed && result) errorInfo = originalErrorInfo || errorInfo || saveErrorInfo.errorInfo;
          else if (result) return result;
        }
        if (source.flags & (TypeFlags.Object | qt.TypeFlags.Intersection) && target.flags & qt.TypeFlags.Union) {
          const objectOnlyTarget = extractTypesOfKind(target, qt.TypeFlags.Object | qt.TypeFlags.Intersection | qt.TypeFlags.Substitution);
          if (objectOnlyTarget.flags & qt.TypeFlags.Union) {
            const result = typeRelatedToDiscriminatedType(source, objectOnlyTarget as UnionType);
            if (result) return result;
          }
        }
      }
      return Ternary.False;
      function relateVariances(sourceTypeArguments: readonly Type[] | undefined, targetTypeArguments: readonly Type[] | undefined, variances: VarianceFlags[], intersectionState: IntersectionState) {
        if ((result = typeArgumentsRelatedTo(sourceTypeArguments, targetTypeArguments, variances, reportErrors, intersectionState))) return result;
        if (some(variances, (v) => !!(v & VarianceFlags.AllowsStructuralFallback))) {
          originalErrorInfo = undefined;
          resetErrorInfo(saveErrorInfo);
          return;
        }
        const allowStructuralFallback = targetTypeArguments && hasCovariantVoidArgument(targetTypeArguments, variances);
        varianceCheckFailed = !allowStructuralFallback;
        if (variances !== empty && !allowStructuralFallback) {
          if (varianceCheckFailed && !(reportErrors && some(variances, (v) => (v & VarianceFlags.VarianceMask) === VarianceFlags.Invariant))) return Ternary.False;
          originalErrorInfo = errorInfo;
          resetErrorInfo(saveErrorInfo);
        }
      }
    }
    function reportUnmeasurableMarkers(p: TypeParameter) {
      if (outofbandVarianceMarkerHandler && (p === markerSuperType || p === markerSubType || p === markerOtherType)) outofbandVarianceMarkerHandler(false);
      return p;
    }
    function reportUnreliableMarkers(p: TypeParameter) {
      if (outofbandVarianceMarkerHandler && (p === markerSuperType || p === markerSubType || p === markerOtherType)) outofbandVarianceMarkerHandler(true);
      return p;
    }
    function mappedTypeRelatedTo(source: MappedType, target: MappedType, reportErrors: boolean): Ternary {
      const modifiersRelated =
        relation === comparableRelation ||
        (relation === identityRelation ? getMappedTypeModifiers(source) === getMappedTypeModifiers(target) : getCombinedMappedTypeOptionality(source) <= getCombinedMappedTypeOptionality(target));
      if (modifiersRelated) {
        let result: Ternary;
        const targetConstraint = getConstraintTypeFromMappedType(target);
        const sourceConstraint = instantiateType(
          getConstraintTypeFromMappedType(source),
          makeFunctionTypeMapper(getCombinedMappedTypeOptionality(source) < 0 ? reportUnmeasurableMarkers : reportUnreliableMarkers)
        );
        if ((result = isRelatedTo(targetConstraint, sourceConstraint, reportErrors))) {
          const mapper = createTypeMapper([getTypeParameterFromMappedType(source)], [getTypeParameterFromMappedType(target)]);
          return result & isRelatedTo(instantiateType(getTemplateTypeFromMappedType(source), mapper), getTemplateTypeFromMappedType(target), reportErrors);
        }
      }
      return Ternary.False;
    }
    function typeRelatedToDiscriminatedType(source: Type, target: UnionType) {
      const sourceProperties = getPropertiesOfType(source);
      const sourcePropertiesFiltered = findDiscriminantProperties(sourceProperties, target);
      if (!sourcePropertiesFiltered) return Ternary.False;
      let numCombinations = 1;
      for (const sourceProperty of sourcePropertiesFiltered) {
        numCombinations *= countTypes(getTypeOfSymbol(sourceProperty));
        if (numCombinations > 25) return Ternary.False;
      }
      const sourceDiscriminantTypes: Type[][] = new Array<Type[]>(sourcePropertiesFiltered.length);
      const excludedProperties = qb.createEscapedMap<true>();
      for (let i = 0; i < sourcePropertiesFiltered.length; i++) {
        const sourceProperty = sourcePropertiesFiltered[i];
        const sourcePropertyType = getTypeOfSymbol(sourceProperty);
        sourceDiscriminantTypes[i] = sourcePropertyType.flags & qt.TypeFlags.Union ? (sourcePropertyType as UnionType).types : [sourcePropertyType];
        excludedProperties.set(sourceProperty.escName, true);
      }
      const discriminantCombinations = cartesianProduct(sourceDiscriminantTypes);
      const matchingTypes: Type[] = [];
      for (const combination of discriminantCombinations) {
        let hasMatch = false;
        outer: for (const type of target.types) {
          for (let i = 0; i < sourcePropertiesFiltered.length; i++) {
            const sourceProperty = sourcePropertiesFiltered[i];
            const targetProperty = getPropertyOfType(type, sourceProperty.escName);
            if (!targetProperty) continue outer;
            if (sourceProperty === targetProperty) continue;
            const related = propertyRelatedTo(
              source,
              target,
              sourceProperty,
              targetProperty,
              (_) => combination[i],
              false,
              IntersectionState.None,
              strictNullChecks || relation === comparableRelation
            );
            if (!related) continue outer;
          }
          pushIfUnique(matchingTypes, type, equateValues);
          hasMatch = true;
        }
        if (!hasMatch) return Ternary.False;
      }
      let result = Ternary.True;
      for (const type of matchingTypes) {
        result &= propertiesRelatedTo(source, type, false, excludedProperties, IntersectionState.None);
        if (result) {
          result &= signaturesRelatedTo(source, type, SignatureKind.Call, false);
          if (result) {
            result &= signaturesRelatedTo(source, type, SignatureKind.Construct, false);
            if (result) {
              result &= indexTypesRelatedTo(source, type, IndexKind.String, false, IntersectionState.None);
              if (result) result &= indexTypesRelatedTo(source, type, IndexKind.Number, false, IntersectionState.None);
            }
          }
        }
        if (!result) return result;
      }
      return result;
    }
    function excludeProperties(properties: Symbol[], excludedProperties: EscapedMap<true> | undefined) {
      if (!excludedProperties || properties.length === 0) return properties;
      let result: Symbol[] | undefined;
      for (let i = 0; i < properties.length; i++) {
        if (!excludedProperties.has(properties[i].escName)) {
          if (result) result.push(properties[i]);
        } else if (!result) {
          result = properties.slice(0, i);
        }
      }
      return result || properties;
    }
    function isPropertySymbolTypeRelated(sourceProp: Symbol, targetProp: Symbol, getTypeOfSourceProperty: (sym: Symbol) => Type, reportErrors: boolean, intersectionState: IntersectionState): Ternary {
      const targetIsOptional = strictNullChecks && !!(getCheckFlags(targetProp) & qt.CheckFlags.Partial);
      const source = getTypeOfSourceProperty(sourceProp);
      if (getCheckFlags(targetProp) & qt.CheckFlags.DeferredType && !s.getLinks(targetProp).type) {
        const links = s.getLinks(targetProp);
        Debug.assertIsDefined(links.deferralParent);
        Debug.assertIsDefined(links.deferralConstituents);
        const unionParent = !!(links.deferralParent.flags & qt.TypeFlags.Union);
        let result = unionParent ? Ternary.False : Ternary.True;
        const targetTypes = links.deferralConstituents;
        for (const targetType of targetTypes) {
          const related = isRelatedTo(source, targetType, false, undefined, unionParent ? 0 : IntersectionState.Target);
          if (!unionParent) {
            if (!related) return isRelatedTo(source, addOptionality(getTypeOfSymbol(targetProp), targetIsOptional), reportErrors);
            result &= related;
          } else {
            if (related) return related;
          }
        }
        if (unionParent && !result && targetIsOptional) result = isRelatedTo(source, undefinedType);
        if (unionParent && !result && reportErrors) return isRelatedTo(source, addOptionality(getTypeOfSymbol(targetProp), targetIsOptional), reportErrors);
        return result;
      }
      return isRelatedTo(source, addOptionality(getTypeOfSymbol(targetProp), targetIsOptional), reportErrors, undefined, intersectionState);
    }
    function propertyRelatedTo(
      source: Type,
      target: Type,
      sourceProp: Symbol,
      targetProp: Symbol,
      getTypeOfSourceProperty: (sym: Symbol) => Type,
      reportErrors: boolean,
      intersectionState: IntersectionState,
      skipOptional: boolean
    ): Ternary {
      const sourcePropFlags = getDeclarationModifierFlagsFromSymbol(sourceProp);
      const targetPropFlags = getDeclarationModifierFlagsFromSymbol(targetProp);
      if (sourcePropFlags & ModifierFlags.Private || targetPropFlags & ModifierFlags.Private) {
        if (sourceProp.valueDeclaration !== targetProp.valueDeclaration) {
          if (reportErrors) {
            if (sourcePropFlags & ModifierFlags.Private && targetPropFlags & ModifierFlags.Private)
              reportError(qd.Types_have_separate_declarations_of_a_private_property_0, targetProp.symbolToString());
            else {
              reportError(
                qd.Property_0_is_private_in_type_1_but_not_in_type_2,
                targetProp.symbolToString(),
                typeToString(sourcePropFlags & ModifierFlags.Private ? source : target),
                typeToString(sourcePropFlags & ModifierFlags.Private ? target : source)
              );
            }
          }
          return Ternary.False;
        }
      } else if (targetPropFlags & ModifierFlags.Protected) {
        if (!isValidOverrideOf(sourceProp, targetProp)) {
          if (reportErrors) {
            reportError(
              qd.Property_0_is_protected_but_type_1_is_not_a_class_derived_from_2,
              targetProp.symbolToString(),
              typeToString(getDeclaringClass(sourceProp) || source),
              typeToString(getDeclaringClass(targetProp) || target)
            );
          }
          return Ternary.False;
        }
      } else if (sourcePropFlags & ModifierFlags.Protected) {
        if (reportErrors) reportError(qd.Property_0_is_protected_in_type_1_but_public_in_type_2, targetProp.symbolToString(), typeToString(source), typeToString(target));
        return Ternary.False;
      }
      const related = isPropertySymbolTypeRelated(sourceProp, targetProp, getTypeOfSourceProperty, reportErrors, intersectionState);
      if (!related) {
        if (reportErrors) reportIncompatibleError(qd.Types_of_property_0_are_incompatible, targetProp.symbolToString());
        return Ternary.False;
      }
      if (!skipOptional && sourceProp.flags & qt.SymbolFlags.Optional && !(targetProp.flags & qt.SymbolFlags.Optional)) {
        if (reportErrors) reportError(qd.Property_0_is_optional_in_type_1_but_required_in_type_2, targetProp.symbolToString(), typeToString(source), typeToString(target));
        return Ternary.False;
      }
      return related;
    }
    function reportUnmatchedProperty(source: Type, target: Type, unmatchedProperty: Symbol, requireOptionalProperties: boolean) {
      let shouldSkipElaboration = false;
      if (
        unmatchedProperty.valueDeclaration &&
        is.namedDeclaration(unmatchedProperty.valueDeclaration) &&
        is.kind(qc.PrivateIdentifier, unmatchedProperty.valueDeclaration.name) &&
        source.symbol &&
        source.symbol.flags & qt.SymbolFlags.Class
      ) {
        const privateIdentifierDescription = unmatchedProperty.valueDeclaration.name.escapedText;
        const symbolTableKey = getSymbolNameForPrivateIdentifier(source.symbol, privateIdentifierDescription);
        if (symbolTableKey && getPropertyOfType(source, symbolTableKey)) {
          const sourceName = getDeclarationName(source.symbol.valueDeclaration);
          const targetName = getDeclarationName(target.symbol.valueDeclaration);
          reportError(
            qd.Property_0_in_type_1_refers_to_a_different_member_that_cannot_be_accessed_from_within_type_2,
            diagnosticName(privateIdentifierDescription),
            diagnosticName(sourceName.escapedText === '' ? anon : sourceName),
            diagnosticName(targetName.escapedText === '' ? anon : targetName)
          );
          return;
        }
      }
      const props = arrayFrom(getUnmatchedProperties(source, target, requireOptionalProperties, false));
      if (
        !headMessage ||
        (headMessage.code !== qd.Class_0_incorrectly_implements_interface_1.code &&
          headMessage.code !== qd.Class_0_incorrectly_implements_class_1_Did_you_mean_to_extend_1_and_inherit_its_members_as_a_subclass.code)
      ) {
        shouldSkipElaboration = true;
      }
      if (props.length === 1) {
        const propName = unmatchedProperty.symbolToString();
        reportError(qd.Property_0_is_missing_in_type_1_but_required_in_type_2, propName, ...getTypeNamesForErrorDisplay(source, target));
        if (length(unmatchedProperty.declarations)) associateRelatedInfo(createDiagnosticForNode(unmatchedProperty.declarations[0], qd._0_is_declared_here, propName));
        if (shouldSkipElaboration && errorInfo) overrideNextErrorInfo++;
      } else if (tryElaborateArrayLikeErrors(source, target, false)) {
        if (props.length > 5) {
          reportError(
            qd.Type_0_is_missing_the_following_properties_from_type_1_Colon_2_and_3_more,
            typeToString(source),
            typeToString(target),
            map(props.slice(0, 4), (p) => p.symbolToString()).join(', '),
            props.length - 4
          );
        } else {
          reportError(qd.Type_0_is_missing_the_following_properties_from_type_1_Colon_2, typeToString(source), typeToString(target), map(props, (p) => p.symbolToString()).join(', '));
        }
        if (shouldSkipElaboration && errorInfo) overrideNextErrorInfo++;
      }
    }
    function propertiesRelatedTo(source: Type, target: Type, reportErrors: boolean, excludedProperties: EscapedMap<true> | undefined, intersectionState: IntersectionState): Ternary {
      if (relation === identityRelation) return propertiesIdenticalTo(source, target, excludedProperties);
      const requireOptionalProperties =
        (relation === subtypeRelation || relation === strictSubtypeRelation) && !isObjectLiteralType(source) && !isEmptyArrayLiteralType(source) && !isTupleType(source);
      const unmatchedProperty = getUnmatchedProperty(source, target, requireOptionalProperties, false);
      if (unmatchedProperty) {
        if (reportErrors) reportUnmatchedProperty(source, target, unmatchedProperty, requireOptionalProperties);
        return Ternary.False;
      }
      if (isObjectLiteralType(target)) {
        for (const sourceProp of excludeProperties(getPropertiesOfType(source), excludedProperties)) {
          if (!getPropertyOfObjectType(target, sourceProp.escName)) {
            const sourceType = getTypeOfSymbol(sourceProp);
            if (!(sourceType === undefinedType || sourceType === undefinedWideningType || sourceType === optionalType)) {
              if (reportErrors) reportError(qd.Property_0_does_not_exist_on_type_1, sourceProp.symbolToString(), typeToString(target));
              return Ternary.False;
            }
          }
        }
      }
      let result = Ternary.True;
      if (isTupleType(target)) {
        const targetRestType = getRestTypeOfTupleType(target);
        if (targetRestType) {
          if (!isTupleType(source)) return Ternary.False;
          const sourceRestType = getRestTypeOfTupleType(source);
          if (sourceRestType && !isRelatedTo(sourceRestType, targetRestType, reportErrors)) {
            if (reportErrors) reportError(qd.Rest_signatures_are_incompatible);
            return Ternary.False;
          }
          const targetCount = getTypeReferenceArity(target) - 1;
          const sourceCount = getTypeReferenceArity(source) - (sourceRestType ? 1 : 0);
          const sourceTypeArguments = getTypeArguments(<TypeReference>source);
          for (let i = targetCount; i < sourceCount; i++) {
            const related = isRelatedTo(sourceTypeArguments[i], targetRestType, reportErrors);
            if (!related) {
              if (reportErrors) reportError(qd.Property_0_is_incompatible_with_rest_element_type, '' + i);
              return Ternary.False;
            }
            result &= related;
          }
        }
      }
      const properties = getPropertiesOfType(target);
      const numericNamesOnly = isTupleType(source) && isTupleType(target);
      for (const targetProp of excludeProperties(properties, excludedProperties)) {
        const name = targetProp.escName;
        if (!(targetProp.flags & qt.SymbolFlags.Prototype) && (!numericNamesOnly || NumericLiteral.name(name) || name === 'length')) {
          const sourceProp = getPropertyOfType(source, name);
          if (sourceProp && sourceProp !== targetProp) {
            const related = propertyRelatedTo(source, target, sourceProp, targetProp, getTypeOfSymbol, reportErrors, intersectionState, relation === comparableRelation);
            if (!related) return Ternary.False;
            result &= related;
          }
        }
      }
      return result;
    }
    function propertiesIdenticalTo(source: Type, target: Type, excludedProperties: EscapedMap<true> | undefined): Ternary {
      if (!(source.flags & qt.TypeFlags.Object && target.flags & qt.TypeFlags.Object)) return Ternary.False;
      const sourceProperties = excludeProperties(getPropertiesOfObjectType(source), excludedProperties);
      const targetProperties = excludeProperties(getPropertiesOfObjectType(target), excludedProperties);
      if (sourceProperties.length !== targetProperties.length) return Ternary.False;
      let result = Ternary.True;
      for (const sourceProp of sourceProperties) {
        const targetProp = getPropertyOfObjectType(target, sourceProp.escName);
        if (!targetProp) return Ternary.False;
        const related = compareProperties(sourceProp, targetProp, isRelatedTo);
        if (!related) return Ternary.False;
        result &= related;
      }
      return result;
    }
    function signaturesRelatedTo(source: Type, target: Type, kind: SignatureKind, reportErrors: boolean): Ternary {
      if (relation === identityRelation) return signaturesIdenticalTo(source, target, kind);
      if (target === anyFunctionType || source === anyFunctionType) return Ternary.True;
      const sourceIsJSConstructor = source.symbol && isJSConstructor(source.symbol.valueDeclaration);
      const targetIsJSConstructor = target.symbol && isJSConstructor(target.symbol.valueDeclaration);
      const sourceSignatures = getSignaturesOfType(source, sourceIsJSConstructor && kind === SignatureKind.Construct ? SignatureKind.Call : kind);
      const targetSignatures = getSignaturesOfType(target, targetIsJSConstructor && kind === SignatureKind.Construct ? SignatureKind.Call : kind);
      if (kind === SignatureKind.Construct && sourceSignatures.length && targetSignatures.length) {
        if (isAbstractConstructorType(source) && !isAbstractConstructorType(target)) {
          if (reportErrors) reportError(qd.Cannot_assign_an_abstract_constructor_type_to_a_non_abstract_constructor_type);
          return Ternary.False;
        }
        if (!constructorVisibilitiesAreCompatible(sourceSignatures[0], targetSignatures[0], reportErrors)) return Ternary.False;
      }
      let result = Ternary.True;
      const saveErrorInfo = captureErrorCalculationState();
      const incompatibleReporter = kind === SignatureKind.Construct ? reportIncompatibleConstructSignatureReturn : reportIncompatibleCallSignatureReturn;
      if (getObjectFlags(source) & ObjectFlags.Instantiated && getObjectFlags(target) & ObjectFlags.Instantiated && source.symbol === target.symbol) {
        for (let i = 0; i < targetSignatures.length; i++) {
          const related = signatureRelatedTo(sourceSignatures[i], targetSignatures[i], true, reportErrors, incompatibleReporter(sourceSignatures[i], targetSignatures[i]));
          if (!related) return Ternary.False;
          result &= related;
        }
      } else if (sourceSignatures.length === 1 && targetSignatures.length === 1) {
        const eraseGenerics = relation === comparableRelation || !!compilerOptions.noStrictGenericChecks;
        result = signatureRelatedTo(sourceSignatures[0], targetSignatures[0], eraseGenerics, reportErrors, incompatibleReporter(sourceSignatures[0], targetSignatures[0]));
      } else {
        outer: for (const t of targetSignatures) {
          let shouldElaborateErrors = reportErrors;
          for (const s of sourceSignatures) {
            const related = signatureRelatedTo(s, t, true, shouldElaborateErrors, incompatibleReporter(s, t));
            if (related) {
              result &= related;
              resetErrorInfo(saveErrorInfo);
              continue outer;
            }
            shouldElaborateErrors = false;
          }
          if (shouldElaborateErrors) reportError(qd.Type_0_provides_no_match_for_the_signature_1, typeToString(source), signatureToString(t, undefined, undefined, kind));
          return Ternary.False;
        }
      }
      return result;
    }
    function reportIncompatibleCallSignatureReturn(siga: Signature, sigb: Signature) {
      if (siga.parameters.length === 0 && sigb.parameters.length === 0) {
        return (source: Type, target: Type) => reportIncompatibleError(qd.Call_signatures_with_no_arguments_have_incompatible_return_types_0_and_1, typeToString(source), typeToString(target));
      }
      return (source: Type, target: Type) => reportIncompatibleError(qd.Call_signature_return_types_0_and_1_are_incompatible, typeToString(source), typeToString(target));
    }
    function reportIncompatibleConstructSignatureReturn(siga: Signature, sigb: Signature) {
      if (siga.parameters.length === 0 && sigb.parameters.length === 0) {
        return (source: Type, target: Type) => reportIncompatibleError(qd.Construct_signatures_with_no_arguments_have_incompatible_return_types_0_and_1, typeToString(source), typeToString(target));
      }
      return (source: Type, target: Type) => reportIncompatibleError(qd.Construct_signature_return_types_0_and_1_are_incompatible, typeToString(source), typeToString(target));
    }
    function signatureRelatedTo(source: Signature, target: Signature, erase: boolean, reportErrors: boolean, incompatibleReporter: (source: Type, target: Type) => void): Ternary {
      return compareSignaturesRelated(
        erase ? getErasedSignature(source) : source,
        erase ? getErasedSignature(target) : target,
        relation === strictSubtypeRelation ? SignatureCheckMode.StrictArity : 0,
        reportErrors,
        reportError,
        incompatibleReporter,
        isRelatedTo,
        makeFunctionTypeMapper(reportUnreliableMarkers)
      );
    }
    function signaturesIdenticalTo(source: Type, target: Type, kind: SignatureKind): Ternary {
      const sourceSignatures = getSignaturesOfType(source, kind);
      const targetSignatures = getSignaturesOfType(target, kind);
      if (sourceSignatures.length !== targetSignatures.length) return Ternary.False;
      let result = Ternary.True;
      for (let i = 0; i < sourceSignatures.length; i++) {
        const related = compareSignaturesIdentical(sourceSignatures[i], targetSignatures[i], false, isRelatedTo);
        if (!related) return Ternary.False;
        result &= related;
      }
      return result;
    }
    function eachPropertyRelatedTo(source: Type, target: Type, kind: IndexKind, reportErrors: boolean): Ternary {
      let result = Ternary.True;
      const props = source.flags & qt.TypeFlags.Intersection ? getPropertiesOfUnionOrIntersectionType(<IntersectionType>source) : getPropertiesOfObjectType(source);
      for (const prop of props) {
        if (isIgnoredJsxProperty(source, prop)) continue;
        const nameType = s.getLinks(prop).nameType;
        if (nameType && nameType.flags & qt.TypeFlags.UniqueESSymbol) continue;
        if (kind === IndexKind.String || NumericLiteral.name(prop.escName)) {
          const related = isRelatedTo(getTypeOfSymbol(prop), target, reportErrors);
          if (!related) {
            if (reportErrors) reportError(qd.Property_0_is_incompatible_with_index_signature, prop.symbolToString());
            return Ternary.False;
          }
          result &= related;
        }
      }
      return result;
    }
    function indexTypeRelatedTo(sourceType: Type, targetType: Type, reportErrors: boolean) {
      const related = isRelatedTo(sourceType, targetType, reportErrors);
      if (!related && reportErrors) reportError(qd.Index_signatures_are_incompatible);
      return related;
    }
    function indexTypesRelatedTo(source: Type, target: Type, kind: IndexKind, sourceIsPrimitive: boolean, reportErrors: boolean, intersectionState: IntersectionState): Ternary {
      if (relation === identityRelation) return indexTypesIdenticalTo(source, target, kind);
      const targetType = getIndexTypeOfType(target, kind);
      if (!targetType || (targetType.flags & qt.TypeFlags.Any && !sourceIsPrimitive)) return Ternary.True;
      if (isGenericMappedType(source)) return getIndexTypeOfType(target, IndexKind.String) ? isRelatedTo(getTemplateTypeFromMappedType(source), targetType, reportErrors) : Ternary.False;
      const indexType = getIndexTypeOfType(source, kind) || (kind === IndexKind.Number && getIndexTypeOfType(source, IndexKind.String));
      if (indexType) return indexTypeRelatedTo(indexType, targetType, reportErrors);
      if (!(intersectionState & IntersectionState.Source) && isObjectTypeWithInferableIndex(source)) {
        let related = eachPropertyRelatedTo(source, targetType, kind, reportErrors);
        if (related && kind === IndexKind.String) {
          const numberIndexType = getIndexTypeOfType(source, IndexKind.Number);
          if (numberIndexType) related &= indexTypeRelatedTo(numberIndexType, targetType, reportErrors);
        }
        return related;
      }
      if (reportErrors) reportError(qd.Index_signature_is_missing_in_type_0, typeToString(source));
      return Ternary.False;
    }
    function indexTypesIdenticalTo(source: Type, target: Type, indexKind: IndexKind): Ternary {
      const targetInfo = getIndexInfoOfType(target, indexKind);
      const sourceInfo = getIndexInfoOfType(source, indexKind);
      if (!sourceInfo && !targetInfo) return Ternary.True;
      if (sourceInfo && targetInfo && sourceInfo.isReadonly === targetInfo.isReadonly) return isRelatedTo(sourceInfo.type, targetInfo.type);
      return Ternary.False;
    }
    function constructorVisibilitiesAreCompatible(sourceSignature: Signature, targetSignature: Signature, reportErrors: boolean) {
      if (!sourceSignature.declaration || !targetSignature.declaration) return true;
      const sourceAccessibility = get.selectedEffectiveModifierFlags(sourceSignature.declaration, ModifierFlags.NonPublicAccessibilityModifier);
      const targetAccessibility = get.selectedEffectiveModifierFlags(targetSignature.declaration, ModifierFlags.NonPublicAccessibilityModifier);
      if (targetAccessibility === ModifierFlags.Private) return true;
      if (targetAccessibility === ModifierFlags.Protected && sourceAccessibility !== ModifierFlags.Private) return true;
      if (targetAccessibility !== ModifierFlags.Protected && !sourceAccessibility) return true;
      if (reportErrors) reportError(qd.Cannot_assign_a_0_constructor_type_to_a_1_constructor_type, visibilityToString(sourceAccessibility), visibilityToString(targetAccessibility));
      return false;
    }
  }
  checkIdentifier(node: Identifier): Type {
    const symbol = getResolvedSymbol(node);
    if (symbol === unknownSymbol) return errorType;
    if (symbol === argumentsSymbol) {
      const container = get.containingFunction(node)!;
      getNodeLinks(container).flags |= NodeCheckFlags.CaptureArguments;
      return this.getTypeOfSymbol();
    }
    if (!(node.parent && is.kind(qc.PropertyAccessExpression, node.parent) && node.parent.expression === node)) markAliasReferenced(symbol, node);
    const localOrExportSymbol = getExportSymbolOfValueSymbolIfExported(symbol);
    let declaration: Declaration | undefined = localOrExportSymbol.valueDeclaration;
    if (localOrExportSymbol.flags & qt.SymbolFlags.Class) {
      if (declaration.kind === Syntax.ClassDeclaration && nodeIsDecorated(declaration as ClassDeclaration)) {
        let container = get.containingClass(node);
        while (container !== undefined) {
          if (container === declaration && container.name !== node) {
            getNodeLinks(declaration).flags |= NodeCheckFlags.ClassWithConstructorReference;
            getNodeLinks(node).flags |= NodeCheckFlags.ConstructorReferenceInClass;
            break;
          }
          container = get.containingClass(container);
        }
      } else if (declaration.kind === Syntax.ClassExpression) {
        let container = get.thisContainer(node, false);
        while (container.kind !== Syntax.SourceFile) {
          if (container.parent === declaration) {
            if (container.kind === Syntax.PropertyDeclaration && has.syntacticModifier(container, ModifierFlags.Static)) {
              getNodeLinks(declaration).flags |= NodeCheckFlags.ClassWithConstructorReference;
              getNodeLinks(node).flags |= NodeCheckFlags.ConstructorReferenceInClass;
            }
            break;
          }
          container = get.thisContainer(container, false);
        }
      }
    }
    checkNestedBlockScopedBinding(node, symbol);
    const type = getConstraintForLocation(getTypeOfSymbol(localOrExportSymbol), node);
    const assignmentKind = get.assignmentTargetKind(node);
    if (assignmentKind) {
      if (!(localOrExportSymbol.flags & qt.SymbolFlags.Variable) && !(is.inJSFile(node) && localOrExportSymbol.flags & qt.SymbolFlags.ValueModule)) {
        error(node, qd.Cannot_assign_to_0_because_it_is_not_a_variable, symbol.symbolToString());
        return errorType;
      }
      if (isReadonlySymbol(localOrExportSymbol)) {
        if (localOrExportSymbol.flags & qt.SymbolFlags.Variable) error(node, qd.Cannot_assign_to_0_because_it_is_a_constant, symbol.symbolToString());
        else {
          error(node, qd.Cannot_assign_to_0_because_it_is_a_read_only_property, symbol.symbolToString());
        }
        return errorType;
      }
    }
    const isAlias = localOrExportSymbol.flags & qt.SymbolFlags.Alias;
    if (localOrExportSymbol.flags & qt.SymbolFlags.Variable) {
      if (assignmentKind === AssignmentKind.Definite) return type;
    } else if (isAlias) {
      declaration = find<Declaration>(symbol.declarations, isSomeImportDeclaration);
    }
    return type;
    if (!declaration) return type;
    const isParameter = get.rootDeclaration(declaration).kind === Syntax.Parameter;
    const declarationContainer = getControlFlowContainer(declaration);
    let flowContainer = getControlFlowContainer(node);
    const isOuterVariable = flowContainer !== declarationContainer;
    const isSpreadDestructuringAssignmentTarget = node.parent && node.parent.parent && is.kind(qc.SpreadAssignment, node.parent) && isDestructuringAssignmentTarget(node.parent.parent);
    const isModuleExports = symbol.flags & qt.SymbolFlags.ModuleExports;
    while (
      flowContainer !== declarationContainer &&
      (flowContainer.kind === Syntax.FunctionExpression || flowContainer.kind === Syntax.ArrowFunction || is.objectLiteralOrClassExpressionMethod(flowContainer)) &&
      (isConstVariable(localOrExportSymbol) || (isParameter && !isParameterAssigned(localOrExportSymbol)))
    ) {
      flowContainer = getControlFlowContainer(flowContainer);
    }
    const assumeInitialized =
      isParameter ||
      isAlias ||
      isOuterVariable ||
      isSpreadDestructuringAssignmentTarget ||
      isModuleExports ||
      is.kind(qc.BindingElement, declaration) ||
      (type !== autoType &&
        type !== autoArrayType &&
        (!strictNullChecks || (type.flags & (TypeFlags.AnyOrUnknown | qt.TypeFlags.Void)) !== 0 || isInTypeQuery(node) || node.parent.kind === Syntax.ExportSpecifier)) ||
      node.parent.kind === Syntax.NonNullExpression ||
      (declaration.kind === Syntax.VariableDeclaration && (<VariableDeclaration>declaration).exclamationToken) ||
      declaration.flags & NodeFlags.Ambient;
    const initialType = assumeInitialized
      ? isParameter
        ? removeOptionalityFromDeclaredType(type, declaration as VariableLikeDeclaration)
        : type
      : type === autoType || type === autoArrayType
      ? undefinedType
      : getOptionalType(type);
    const flowType = getFlowTypeOfReference(node, type, initialType, flowContainer, !assumeInitialized);
    if (!isEvolvingArrayOperationTarget(node) && (type === autoType || type === autoArrayType)) {
      if (flowType === autoType || flowType === autoArrayType) {
        if (noImplicitAny) {
          error(get.nameOfDeclaration(declaration), qd.Variable_0_implicitly_has_type_1_in_some_locations_where_its_type_cannot_be_determined, symbol.symbolToString(), typeToString(flowType));
          error(node, qd.Variable_0_implicitly_has_an_1_type, symbol.symbolToString(), typeToString(flowType));
        }
        return convertAutoToAny(flowType);
      }
    } else if (!assumeInitialized && !(getFalsyFlags(type) & qt.TypeFlags.Undefined) && getFalsyFlags(flowType) & qt.TypeFlags.Undefined) {
      error(node, qd.Variable_0_is_used_before_being_assigned, symbol.symbolToString());
      return type;
    }
    return assignmentKind ? getBaseTypeOfLiteralType(flowType) : flowType;
  }
  checkNestedBlockScopedBinding(node: Identifier, symbol: Symbol): void {
    return;
  }
  checkThisBeforeSuper(node: Node, container: Node, diagnosticMessage: qd.Message) {
    const containingClassDecl = <ClassDeclaration>container.parent;
    const baseTypeNode = getClassExtendsHeritageElement(containingClassDecl);
    if (baseTypeNode && !classDeclarationExtendsNull(containingClassDecl)) {
      if (node.flowNode && !isPostSuperFlowNode(node.flowNode, false)) error(node, diagnosticMessage);
    }
  }
  checkThisNodeIsExpression(node: Node): Type {
    let container = get.thisContainer(node, true);
    let capturedByArrowFunction = false;
    if (container.kind === Syntax.Constructor) checkThisBeforeSuper(node, container, qd.super_must_be_called_before_accessing_this_in_the_constructor_of_a_derived_class);
    if (container.kind === Syntax.ArrowFunction) {
      container = get.thisContainer(container, false);
      capturedByArrowFunction = true;
    }
    switch (container.kind) {
      case Syntax.ModuleDeclaration:
        error(node, qd.this_cannot_be_referenced_in_a_module_or_namespace_body);
        break;
      case Syntax.EnumDeclaration:
        error(node, qd.this_cannot_be_referenced_in_current_location);
        break;
      case Syntax.Constructor:
        if (isInConstructorArgumentIniter(node, container)) error(node, qd.this_cannot_be_referenced_in_constructor_arguments);
        break;
      case Syntax.PropertyDeclaration:
      case Syntax.PropertySignature:
        if (has.syntacticModifier(container, ModifierFlags.Static) && !(compilerOptions.target === ScriptTarget.ESNext && compilerOptions.useDefineForClassFields))
          error(node, qd.this_cannot_be_referenced_in_a_static_property_initer);
        break;
      case Syntax.ComputedPropertyName:
        error(node, qd.this_cannot_be_referenced_in_a_computed_property_name);
        break;
    }
    const type = tryGetThisTypeAt(node, true, container);
    if (noImplicitThis) {
      const globalThisType = getTypeOfSymbol(globalThisSymbol);
      if (type === globalThisType && capturedByArrowFunction) error(node, qd.The_containing_arrow_function_captures_the_global_value_of_this);
      else if (!type) {
        const diag = error(node, qd.this_implicitly_has_type_any_because_it_does_not_have_a_type_annotation);
        if (!is.kind(qc.SourceFile, container)) {
          const outsideThis = tryGetThisTypeAt(container);
          if (outsideThis && outsideThis !== globalThisType) addRelatedInfo(diag, createDiagnosticForNode(container, qd.An_outer_value_of_this_is_shadowed_by_this_container));
        }
      }
    }
    return type || anyType;
  }
  checkSuperExpression(node: Node): Type {
    const isCallExpression = node.parent.kind === Syntax.CallExpression && (<CallExpression>node.parent).expression === node;
    const immediateContainer = get.superContainer(node, true);
    let container = immediateContainer;
    let needToCaptureLexicalThis = false;
    if (!isCallExpression) {
      while (container && container.kind === Syntax.ArrowFunction) {
        container = get.superContainer(container, true);
        needToCaptureLexicalThis = false;
      }
    }
    const canUseSuperExpression = isLegalUsageOfSuperExpression(container);
    let nodeCheckFlag: NodeCheckFlags = 0;
    if (!canUseSuperExpression) {
      const current = qc.findAncestor(node, (n) => (n === container ? 'quit' : n.kind === Syntax.ComputedPropertyName));
      if (current && current.kind === Syntax.ComputedPropertyName) error(node, qd.super_cannot_be_referenced_in_a_computed_property_name);
      else if (isCallExpression) {
        error(node, qd.Super_calls_are_not_permitted_outside_constructors_or_in_nested_functions_inside_constructors);
      } else if (!container || !container.parent || !(is.classLike(container.parent) || container.parent.kind === Syntax.ObjectLiteralExpression)) {
        error(node, qd.super_can_only_be_referenced_in_members_of_derived_classes_or_object_literal_expressions);
      } else {
        error(node, qd.super_property_access_is_permitted_only_in_a_constructor_member_function_or_member_accessor_of_a_derived_class);
      }
      return errorType;
    }
    if (!isCallExpression && immediateContainer.kind === Syntax.Constructor)
      checkThisBeforeSuper(node, container, qd.super_must_be_called_before_accessing_a_property_of_super_in_the_constructor_of_a_derived_class);
    if (has.syntacticModifier(container, ModifierFlags.Static) || isCallExpression) nodeCheckFlag = NodeCheckFlags.SuperStatic;
    else {
      nodeCheckFlag = NodeCheckFlags.SuperInstance;
    }
    getNodeLinks(node).flags |= nodeCheckFlag;
    if (container.kind === Syntax.MethodDeclaration && has.syntacticModifier(container, ModifierFlags.Async)) {
      if (is.superProperty(node.parent) && is.assignmentTarget(node.parent)) getNodeLinks(container).flags |= NodeCheckFlags.AsyncMethodWithSuperBinding;
      else {
        getNodeLinks(container).flags |= NodeCheckFlags.AsyncMethodWithSuper;
      }
    }
    if (needToCaptureLexicalThis) captureLexicalThis(node.parent, container);
    if (container.parent.kind === Syntax.ObjectLiteralExpression) return anyType;
    const classLikeDeclaration = <ClassLikeDeclaration>container.parent;
    if (!getClassExtendsHeritageElement(classLikeDeclaration)) {
      error(node, qd.super_can_only_be_referenced_in_a_derived_class);
      return errorType;
    }
    const classType = <InterfaceType>getDeclaredTypeOfSymbol(getSymbolOfNode(classLikeDeclaration));
    const baseClassType = classType && getBaseTypes(classType)[0];
    if (!baseClassType) return errorType;
    if (container.kind === Syntax.Constructor && isInConstructorArgumentIniter(node, container)) {
      error(node, qd.super_cannot_be_referenced_in_constructor_arguments);
      return errorType;
    }
    return nodeCheckFlag === NodeCheckFlags.SuperStatic ? getBaseConstructorTypeOfClass(classType) : getTypeWithThisArgument(baseClassType, classType.thisType);
    function isLegalUsageOfSuperExpression(container: Node): boolean {
      if (!container) return false;
      if (isCallExpression) return container.kind === Syntax.Constructor;
      else {
        if (is.classLike(container.parent) || container.parent.kind === Syntax.ObjectLiteralExpression) {
          if (has.syntacticModifier(container, ModifierFlags.Static))
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
  checkSpreadExpression(node: SpreadElement, checkMode?: CheckMode): Type {
    const arrayOrIterableType = checkExpression(node.expression, checkMode);
    return checkIteratedTypeOrElementType(IterationUse.Spread, arrayOrIterableType, undefinedType, node.expression);
  }
  checkArrayLiteral(node: ArrayLiteralExpression, checkMode: CheckMode | undefined, forceTuple: boolean | undefined): Type {
    const elements = node.elements;
    const elementCount = elements.length;
    const elementTypes: Type[] = [];
    let hasEndingSpreadElement = false;
    let hasNonEndingSpreadElement = false;
    const contextualType = getApparentTypeOfContextualType(node);
    const inDestructuringPattern = is.assignmentTarget(node);
    const inConstContext = isConstContext(node);
    for (let i = 0; i < elementCount; i++) {
      const e = elements[i];
      const spread = e.kind === Syntax.SpreadElement && (<SpreadElement>e).expression;
      const spreadType = spread && checkExpression(spread, checkMode, forceTuple);
      if (spreadType && isTupleType(spreadType)) {
        elementTypes.push(...getTypeArguments(spreadType));
        if (spreadType.target.hasRestElement) {
          if (i === elementCount - 1) hasEndingSpreadElement = true;
          else hasNonEndingSpreadElement = true;
        }
      } else {
        if (inDestructuringPattern && spreadType) {
          const restElementType = getIndexTypeOfType(spreadType, IndexKind.Number) || getIteratedTypeOrElementType(IterationUse.Destructuring, spreadType, undefinedType, undefined, false);
          if (restElementType) elementTypes.push(restElementType);
        } else {
          const elementContextualType = getContextualTypeForElementExpression(contextualType, elementTypes.length);
          const type = checkExpressionForMutableLocation(e, checkMode, elementContextualType, forceTuple);
          elementTypes.push(type);
        }
        if (spread) {
          if (i === elementCount - 1) hasEndingSpreadElement = true;
          else hasNonEndingSpreadElement = true;
        }
      }
    }
    if (!hasNonEndingSpreadElement) {
      const minLength = elementTypes.length - (hasEndingSpreadElement ? 1 : 0);
      let tupleResult;
      if (inDestructuringPattern && minLength > 0) {
        const type = cloneTypeReference(<TypeReference>createTupleType(elementTypes, minLength, hasEndingSpreadElement));
        type.pattern = node;
        return type;
      } else if ((tupleResult = getArrayLiteralTupleTypeIfApplicable(elementTypes, contextualType, hasEndingSpreadElement, elementTypes.length, inConstContext))) {
        return createArrayLiteralType(tupleResult);
      } else if (forceTuple) {
        return createArrayLiteralType(createTupleType(elementTypes, minLength, hasEndingSpreadElement));
      }
    }
    return createArrayLiteralType(
      createArrayType(elementTypes.length ? getUnionType(elementTypes, UnionReduction.Subtype) : strictNullChecks ? implicitNeverType : undefinedWideningType, inConstContext)
    );
  }
  checkComputedPropertyName(node: ComputedPropertyName): Type {
    const links = getNodeLinks(node.expression);
    if (!links.resolvedType) {
      links.resolvedType = checkExpression(node.expression);
      if (
        links.resolvedType.flags & qt.TypeFlags.Nullable ||
        (!isTypeAssignableToKind(links.resolvedType, qt.TypeFlags.StringLike | qt.TypeFlags.NumberLike | qt.TypeFlags.ESSymbolLike) && !isTypeAssignableTo(links.resolvedType, stringNumberSymbolType))
      ) {
        error(node, qd.A_computed_property_name_must_be_of_type_string_number_symbol_or_any);
      } else {
        checkThatExpressionIsProperSymbolReference(node.expression, links.resolvedType, true);
      }
    }
    return links.resolvedType;
  }
  checkObjectLiteral(node: ObjectLiteralExpression, checkMode?: CheckMode): Type {
    const inDestructuringPattern = is.assignmentTarget(node);
    checkGrammarObjectLiteralExpression(node, inDestructuringPattern);
    const allPropertiesTable = strictNullChecks ? new SymbolTable() : undefined;
    let propertiesTable = new SymbolTable();
    let propertiesArray: Symbol[] = [];
    let spread: Type = emptyObjectType;
    const contextualType = getApparentTypeOfContextualType(node);
    const contextualTypeHasPattern =
      contextualType && contextualType.pattern && (contextualType.pattern.kind === Syntax.ObjectBindingPattern || contextualType.pattern.kind === Syntax.ObjectLiteralExpression);
    const inConstContext = isConstContext(node);
    const checkFlags = inConstContext ? qt.CheckFlags.Readonly : 0;
    const isInJavascript = is.inJSFile(node) && !is.inJsonFile(node);
    const enumTag = qc.getDoc.enumTag(node);
    const isJSObjectLiteral = !contextualType && isInJavascript && !enumTag;
    let objectFlags: ObjectFlags = freshObjectLiteralFlag;
    let patternWithComputedProperties = false;
    let hasComputedStringProperty = false;
    let hasComputedNumberProperty = false;
    for (const elem of node.properties) {
      if (elem.name && is.kind(qc.ComputedPropertyName, elem.name) && !is.wellKnownSymbolSyntactically(elem.name)) checkComputedPropertyName(elem.name);
    }
    let offset = 0;
    for (let i = 0; i < node.properties.length; i++) {
      const memberDecl = node.properties[i];
      let member = getSymbolOfNode(memberDecl);
      const computedNameType =
        memberDecl.name && memberDecl.name.kind === Syntax.ComputedPropertyName && !is.wellKnownSymbolSyntactically(memberDecl.name.expression)
          ? checkComputedPropertyName(memberDecl.name)
          : undefined;
      if (memberDecl.kind === Syntax.PropertyAssignment || memberDecl.kind === Syntax.ShorthandPropertyAssignment || is.objectLiteralMethod(memberDecl)) {
        let type =
          memberDecl.kind === Syntax.PropertyAssignment
            ? checkPropertyAssignment(memberDecl, checkMode)
            : memberDecl.kind === Syntax.ShorthandPropertyAssignment
            ? checkExpressionForMutableLocation(memberDecl.name, checkMode)
            : checkObjectLiteralMethod(memberDecl, checkMode);
        if (isInJavascript) {
          const docType = getTypeForDeclarationFromDocComment(memberDecl);
          if (docType) {
            checkTypeAssignableTo(type, docType, memberDecl);
            type = docType;
          } else if (enumTag && enumTag.typeExpression) {
            checkTypeAssignableTo(type, getTypeFromTypeNode(enumTag.typeExpression), memberDecl);
          }
        }
        objectFlags |= getObjectFlags(type) & ObjectFlags.PropagatingFlags;
        const nameType = computedNameType && isTypeUsableAsPropertyName(computedNameType) ? computedNameType : undefined;
        const prop = nameType
          ? new Symbol(SymbolFlags.Property | member.flags, getPropertyNameFromType(nameType), checkFlags | qt.CheckFlags.Late)
          : new Symbol(SymbolFlags.Property | member.flags, member.escName, checkFlags);
        if (nameType) prop.nameType = nameType;
        if (inDestructuringPattern) {
          const isOptional =
            (memberDecl.kind === Syntax.PropertyAssignment && hasDefaultValue(memberDecl.initer)) || (memberDecl.kind === Syntax.ShorthandPropertyAssignment && memberDecl.objectAssignmentIniter);
          if (isOptional) prop.flags |= qt.SymbolFlags.Optional;
        } else if (contextualTypeHasPattern && !(getObjectFlags(contextualType!) & ObjectFlags.ObjectLiteralPatternWithComputedProperties)) {
          const impliedProp = getPropertyOfType(contextualType!, member.escName);
          if (impliedProp) prop.flags |= impliedProp.flags & qt.SymbolFlags.Optional;
          else if (!compilerOptions.suppressExcessPropertyErrors && !getIndexInfoOfType(contextualType!, IndexKind.String)) {
            error(memberDecl.name, qd.Object_literal_may_only_specify_known_properties_and_0_does_not_exist_in_type_1, member.symbolToString(), typeToString(contextualType!));
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
          spread = getSpreadType(spread, createObjectLiteralType(), node.symbol, objectFlags, inConstContext);
          propertiesArray = [];
          propertiesTable = new SymbolTable();
          hasComputedStringProperty = false;
          hasComputedNumberProperty = false;
        }
        const type = getReducedType(checkExpression(memberDecl.expression));
        if (!isValidSpreadType(type)) {
          error(memberDecl, qd.Spread_types_may_only_be_created_from_object_types);
          return errorType;
        }
        if (allPropertiesTable) checkSpreadPropOverrides(type, allPropertiesTable, memberDecl);
        spread = getSpreadType(spread, type, node.symbol, objectFlags, inConstContext);
        offset = i + 1;
        continue;
      } else {
        assert(memberDecl.kind === Syntax.GetAccessor || memberDecl.kind === Syntax.SetAccessor);
        checkNodeDeferred(memberDecl);
      }
      if (computedNameType && !(computedNameType.flags & qt.TypeFlags.StringOrNumberLiteralOrUnique)) {
        if (isTypeAssignableTo(computedNameType, stringNumberSymbolType)) {
          if (isTypeAssignableTo(computedNameType, numberType)) hasComputedNumberProperty = true;
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
    if (contextualTypeHasPattern && node.parent.kind !== Syntax.SpreadAssignment) {
      for (const prop of getPropertiesOfType(contextualType!)) {
        if (!propertiesTable.get(prop.escName) && !getPropertyOfType(spread, prop.escName)) {
          if (!(prop.flags & qt.SymbolFlags.Optional))
            error(prop.valueDeclaration || (<TransientSymbol>prop).bindingElement, qd.Initer_provides_no_value_for_this_binding_element_and_the_binding_element_has_no_default_value);
          propertiesTable.set(prop.escName, prop);
          propertiesArray.push(prop);
        }
      }
    }
    if (spread !== emptyObjectType) {
      if (propertiesArray.length > 0) {
        spread = getSpreadType(spread, createObjectLiteralType(), node.symbol, objectFlags, inConstContext);
        propertiesArray = [];
        propertiesTable = new SymbolTable();
        hasComputedStringProperty = false;
        hasComputedNumberProperty = false;
      }
      return mapType(spread, (t) => (t === emptyObjectType ? createObjectLiteralType() : t));
    }
    return createObjectLiteralType();
    function createObjectLiteralType() {
      const stringIndexInfo = hasComputedStringProperty ? getObjectLiteralIndexInfo(node, offset, propertiesArray, IndexKind.String) : undefined;
      const numberIndexInfo = hasComputedNumberProperty ? getObjectLiteralIndexInfo(node, offset, propertiesArray, IndexKind.Number) : undefined;
      const result = createAnonymousType(node.symbol, propertiesTable, empty, empty, stringIndexInfo, numberIndexInfo);
      result.objectFlags |= objectFlags | ObjectFlags.ObjectLiteral | ObjectFlags.ContainsObjectOrArrayLiteral;
      if (isJSObjectLiteral) result.objectFlags |= ObjectFlags.JSLiteral;
      if (patternWithComputedProperties) result.objectFlags |= ObjectFlags.ObjectLiteralPatternWithComputedProperties;
      if (inDestructuringPattern) result.pattern = node;
      return result;
    }
  }
  checkJsxSelfClosingElementDeferred(node: JsxSelfClosingElement) {
    checkJsxOpeningLikeElementOrOpeningFragment(node);
    resolveUntypedCall(node);
  }
  checkJsxSelfClosingElement(node: JsxSelfClosingElement, _checkMode: CheckMode | undefined): Type {
    checkNodeDeferred(node);
    return getJsxElementTypeAt(node) || anyType;
  }
  checkJsxElementDeferred(node: JsxElement) {
    checkJsxOpeningLikeElementOrOpeningFragment(node.openingElement);
    if (isJsxIntrinsicIdentifier(node.closingElement.tagName)) getIntrinsicTagSymbol(node.closingElement);
    else {
      checkExpression(node.closingElement.tagName);
    }
    checkJsxChildren(node);
  }
  checkJsxElement(node: JsxElement, _checkMode: CheckMode | undefined): Type {
    checkNodeDeferred(node);
    return getJsxElementTypeAt(node) || anyType;
  }
  checkJsxFragment(node: JsxFragment): Type {
    checkJsxOpeningLikeElementOrOpeningFragment(node.openingFragment);
    if (compilerOptions.jsx === JsxEmit.React && (compilerOptions.jsxFactory || get.sourceFileOf(node).pragmas.has('jsx')))
      error(node, compilerOptions.jsxFactory ? qd.JSX_fragment_is_not_supported_when_using_jsxFactory : qd.JSX_fragment_is_not_supported_when_using_an_inline_JSX_factory_pragma);
    checkJsxChildren(node);
    return getJsxElementTypeAt(node) || anyType;
  }
  checkJsxAttribute(node: JsxAttribute, checkMode?: CheckMode) {
    return node.initer ? checkExpressionForMutableLocation(node.initer, checkMode) : trueType;
  }
  checkJsxChildren(node: JsxElement | JsxFragment, checkMode?: CheckMode) {
    const childrenTypes: Type[] = [];
    for (const child of node.children) {
      if (child.kind === Syntax.JsxText) {
        if (!child.onlyTriviaWhitespaces) childrenTypes.push(stringType);
      } else {
        childrenTypes.push(checkExpressionForMutableLocation(child, checkMode));
      }
    }
    return childrenTypes;
  }
  checkSpreadPropOverrides(type: Type, props: SymbolTable, spread: SpreadAssignment | JsxSpreadAttribute) {
    for (const right of getPropertiesOfType(type)) {
      const left = props.get(right.escName);
      const rightType = getTypeOfSymbol(right);
      if (left && !maybeTypeOfKind(rightType, qt.TypeFlags.Nullable) && !(maybeTypeOfKind(rightType, qt.TypeFlags.AnyOrUnknown) && right.flags & qt.SymbolFlags.Optional)) {
        const diagnostic = error(left.valueDeclaration, qd._0_is_specified_more_than_once_so_this_usage_will_be_overwritten, qy.get.unescUnderscores(left.escName));
        addRelatedInfo(diagnostic, createDiagnosticForNode(spread, qd.This_spread_always_overwrites_this_property));
      }
    }
  }
  checkJsxAttributes(node: JsxAttributes, checkMode: CheckMode | undefined) {
    return createJsxAttributesTypeFromAttributesProperty(node.parent, checkMode);
  }
  checkJsxReturnAssignableToAppropriateBound(refKind: JsxReferenceKind, elemInstanceType: Type, openingLikeElement: JsxOpeningLikeElement) {
    if (refKind === JsxReferenceKind.Function) {
      const sfcReturnConstraint = getJsxStatelessElementTypeAt(openingLikeElement);
      if (sfcReturnConstraint)
        checkTypeRelatedTo(elemInstanceType, sfcReturnConstraint, assignableRelation, openingLikeElement.tagName, qd.Its_return_type_0_is_not_a_valid_JSX_element, generateInitialErrorChain);
    } else if (refKind === JsxReferenceKind.Component) {
      const classConstraint = getJsxElementClassTypeAt(openingLikeElement);
      if (classConstraint)
        checkTypeRelatedTo(elemInstanceType, classConstraint, assignableRelation, openingLikeElement.tagName, qd.Its_instance_type_0_is_not_a_valid_JSX_element, generateInitialErrorChain);
    } else {
      const sfcReturnConstraint = getJsxStatelessElementTypeAt(openingLikeElement);
      const classConstraint = getJsxElementClassTypeAt(openingLikeElement);
      if (!sfcReturnConstraint || !classConstraint) return;
      const combined = getUnionType([sfcReturnConstraint, classConstraint]);
      checkTypeRelatedTo(elemInstanceType, combined, assignableRelation, openingLikeElement.tagName, qd.Its_element_type_0_is_not_a_valid_JSX_element, generateInitialErrorChain);
    }
    function generateInitialErrorChain(): qd.MessageChain {
      const componentName = get.textOf(openingLikeElement.tagName);
      return chainqd.Messages(undefined, qd._0_cannot_be_used_as_a_JSX_component, componentName);
    }
  }
  checkJsxPreconditions(errorNode: Node) {
    if ((compilerOptions.jsx || JsxEmit.None) === JsxEmit.None) error(errorNode, qd.Cannot_use_JSX_unless_the_jsx_flag_is_provided);
    if (getJsxElementTypeAt(errorNode) === undefined) {
      if (noImplicitAny) error(errorNode, qd.JSX_element_implicitly_has_type_any_because_the_global_type_JSX_Element_does_not_exist);
    }
  }
  checkJsxOpeningLikeElementOrOpeningFragment(node: JsxOpeningLikeElement | JsxOpeningFragment) {
    const isNodeOpeningLikeElement = qc.isJsx.openingLikeElement(node);
    if (isNodeOpeningLikeElement) checkGrammarJsxElement(<JsxOpeningLikeElement>node);
    checkJsxPreconditions(node);
    const reactRefErr = diagnostics && compilerOptions.jsx === JsxEmit.React ? qd.Cannot_find_name_0 : undefined;
    const reactNamespace = getJsxNamespace(node);
    const reactLocation = isNodeOpeningLikeElement ? (<JsxOpeningLikeElement>node).tagName : node;
    const reactSym = resolveName(reactLocation, reactNamespace, qt.SymbolFlags.Value, reactRefErr, reactNamespace, true);
    if (reactSym) {
      reactSym.isReferenced = qt.SymbolFlags.All;
      if (reactSym.flags & qt.SymbolFlags.Alias && !reactSym.getTypeOnlyAliasDeclaration()) reactSym.markAliasSymbolAsReferenced();
    }
    if (isNodeOpeningLikeElement) {
      const jsxOpeningLikeNode = node as JsxOpeningLikeElement;
      const sig = getResolvedSignature(jsxOpeningLikeNode);
      checkJsxReturnAssignableToAppropriateBound(getJsxReferenceKind(jsxOpeningLikeNode), getReturnTypeOfSignature(sig), jsxOpeningLikeNode);
    }
  }
  checkJsxExpression(node: JsxExpression, checkMode?: CheckMode) {
    checkGrammarJsxExpression(node);
    if (node.expression) {
      const type = checkExpression(node.expression, checkMode);
      if (node.dot3Token && type !== anyType && !isArrayType(type)) error(node, qd.JSX_spread_child_must_be_an_array_type);
      return type;
    }
    return errorType;
  }
  checkPropertyAccessibility(
    node:
      | PropertyAccessExpression
      | QualifiedName
      | PropertyAccessExpression
      | VariableDeclaration
      | ParameterDeclaration
      | ImportTypeNode
      | PropertyAssignment
      | ShorthandPropertyAssignment
      | BindingElement,
    isSuper: boolean,
    type: Type,
    prop: Symbol
  ): boolean {
    const flags = getDeclarationModifierFlagsFromSymbol(prop);
    const errorNode = node.kind === Syntax.QualifiedName ? node.right : node.kind === Syntax.ImportType ? node : node.name;
    if (isSuper) {
      if (flags & ModifierFlags.Abstract) {
        error(errorNode, qd.Abstract_method_0_in_class_1_cannot_be_accessed_via_super_expression, prop.symbolToString(), typeToString(getDeclaringClass(prop)!));
        return false;
      }
    }
    if (flags & ModifierFlags.Abstract && is.thisProperty(node) && symbolHasNonMethodDeclaration(prop)) {
      const declaringClassDeclaration = getClassLikeDeclarationOfSymbol(getParentOfSymbol(prop)!);
      if (declaringClassDeclaration && isNodeUsedDuringClassInitialization(node)) {
        error(errorNode, qd.Abstract_property_0_in_class_1_cannot_be_accessed_in_the_constructor, prop.symbolToString(), getTextOfIdentifierOrLiteral(declaringClassDeclaration.name!));
        return false;
      }
    }
    if (is.kind(qc.PropertyAccessExpression, node) && is.kind(qc.PrivateIdentifier, node.name)) {
      if (!get.containingClass(node)) {
        error(errorNode, qd.Private_identifiers_are_not_allowed_outside_class_bodies);
        return false;
      }
      return true;
    }
    if (!(flags & ModifierFlags.NonPublicAccessibilityModifier)) return true;
    if (flags & ModifierFlags.Private) {
      const declaringClassDeclaration = getClassLikeDeclarationOfSymbol(getParentOfSymbol(prop)!)!;
      if (!isNodeWithinClass(node, declaringClassDeclaration)) {
        error(errorNode, qd.Property_0_is_private_and_only_accessible_within_class_1, prop.symbolToString(), typeToString(getDeclaringClass(prop)!));
        return false;
      }
      return true;
    }
    if (isSuper) return true;
    let enclosingClass = forEachEnclosingClass(node, (enclosingDeclaration) => {
      const enclosingClass = <InterfaceType>getDeclaredTypeOfSymbol(getSymbolOfNode(enclosingDeclaration)!);
      return isClassDerivedFromDeclaringClasses(enclosingClass, prop) ? enclosingClass : undefined;
    });
    if (!enclosingClass) {
      let thisParameter: ParameterDeclaration | undefined;
      if (flags & ModifierFlags.Static || !(thisParameter = getThisParameterFromNodeContext(node)) || !thisParameter.type) {
        error(errorNode, qd.Property_0_is_protected_and_only_accessible_within_class_1_and_its_subclasses, prop.symbolToString(), typeToString(getDeclaringClass(prop) || type));
        return false;
      }
      const thisType = getTypeFromTypeNode(thisParameter.type);
      enclosingClass = ((thisType.flags & qt.TypeFlags.TypeParameter ? getConstraintOfTypeParameter(<TypeParameter>thisType) : thisType) as TypeReference).target;
    }
    if (flags & ModifierFlags.Static) return true;
    if (type.flags & qt.TypeFlags.TypeParameter) type = (type as TypeParameter).isThisType ? getConstraintOfTypeParameter(<TypeParameter>type)! : getBaseConstraintOfType(<TypeParameter>type)!;
    if (!type || !hasBaseType(type, enclosingClass)) {
      error(errorNode, qd.Property_0_is_protected_and_only_accessible_through_an_instance_of_class_1, prop.symbolToString(), typeToString(enclosingClass));
      return false;
    }
    return true;
  }
  checkNonNullExpression(node: Expression | QualifiedName) {
    return checkNonNullType(checkExpression(node), node);
  }
  checkNonNullTypeWithReporter(type: Type, node: Node, reportError: (node: Node, kind: qt.TypeFlags) => void): Type {
    if (strictNullChecks && type.flags & qt.TypeFlags.Unknown) {
      error(node, qd.Object_is_of_type_unknown);
      return errorType;
    }
    const kind = (strictNullChecks ? getFalsyFlags(type) : type.flags) & qt.TypeFlags.Nullable;
    if (kind) {
      reportError(node, kind);
      const t = getNonNullableType(type);
      return t.flags & (TypeFlags.Nullable | qt.TypeFlags.Never) ? errorType : t;
    }
    return type;
  }
  checkNonNullType(type: Type, node: Node) {
    return checkNonNullTypeWithReporter(type, node, reportObjectPossiblyNullOrUndefinedError);
  }
  checkNonNullNonVoidType(type: Type, node: Node): Type {
    const nonNullType = checkNonNullType(type, node);
    if (nonNullType !== errorType && nonNullType.flags & qt.TypeFlags.Void) error(node, qd.Object_is_possibly_undefined);
    return nonNullType;
  }
  checkPropertyAccessExpression(node: PropertyAccessExpression) {
    return node.flags & NodeFlags.OptionalChain
      ? checkPropertyAccessChain(node as PropertyAccessChain)
      : checkPropertyAccessExpressionOrQualifiedName(node, node.expression, checkNonNullExpression(node.expression), node.name);
  }
  checkPropertyAccessChain(node: PropertyAccessChain) {
    const leftType = checkExpression(node.expression);
    const nonOptionalType = getOptionalExpressionType(leftType, node.expression);
    return propagateOptionalTypeMarker(
      checkPropertyAccessExpressionOrQualifiedName(node, node.expression, checkNonNullType(nonOptionalType, node.expression), node.name),
      node,
      nonOptionalType !== leftType
    );
  }
  checkQualifiedName(node: QualifiedName) {
    return checkPropertyAccessExpressionOrQualifiedName(node, node.left, checkNonNullExpression(node.left), node.right);
  }
  checkPrivateIdentifierPropertyAccess(leftType: Type, right: PrivateIdentifier, lexicallyScopedIdentifier: Symbol | undefined): boolean {
    let propertyOnType: Symbol | undefined;
    const properties = getPropertiesOfType(leftType);
    if (properties) {
      forEach(properties, (symbol: Symbol) => {
        const decl = symbol.valueDeclaration;
        if (decl && is.namedDeclaration(decl) && is.kind(qc.PrivateIdentifier, decl.name) && decl.name.escapedText === right.escapedText) {
          propertyOnType = symbol;
          return true;
        }
      });
    }
    const diagName = diagnosticName(right);
    if (propertyOnType) {
      const typeValueDecl = propertyOnType.valueDeclaration;
      const typeClass = get.containingClass(typeValueDecl);
      assert(!!typeClass);
      if (lexicallyScopedIdentifier) {
        const lexicalValueDecl = lexicallyScopedIdentifier.valueDeclaration;
        const lexicalClass = get.containingClass(lexicalValueDecl);
        assert(!!lexicalClass);
        if (qc.findAncestor(lexicalClass, (n) => typeClass === n)) {
          const diagnostic = error(
            right,
            qd.The_property_0_cannot_be_accessed_on_type_1_within_this_class_because_it_is_shadowed_by_another_private_identifier_with_the_same_spelling,
            diagName,
            typeToString(leftType)
          );
          addRelatedInfo(
            diagnostic,
            createDiagnosticForNode(lexicalValueDecl, qd.The_shadowing_declaration_of_0_is_defined_here, diagName),
            createDiagnosticForNode(typeValueDecl, qd.The_declaration_of_0_that_you_probably_intended_to_use_is_defined_here, diagName)
          );
          return true;
        }
      }
      error(right, qd.Property_0_is_not_accessible_outside_class_1_because_it_has_a_private_identifier, diagName, diagnosticName(typeClass.name || anon));
      return true;
    }
    return false;
  }
  checkPropertyAccessExpressionOrQualifiedName(node: PropertyAccessExpression | QualifiedName, left: Expression | QualifiedName, leftType: Type, right: Identifier | PrivateIdentifier) {
    const parentSymbol = getNodeLinks(left).resolvedSymbol;
    const assignmentKind = get.assignmentTargetKind(node);
    const apparentType = getApparentType(assignmentKind !== AssignmentKind.None || isMethodAccessForCall(node) ? getWidenedType(leftType) : leftType);
    if (is.kind(qc.PrivateIdentifier, right)) checkExternalEmitHelpers(node, ExternalEmitHelpers.ClassPrivateFieldGet);
    const isAnyLike = isTypeAny(apparentType) || apparentType === silentNeverType;
    let prop: Symbol | undefined;
    if (is.kind(qc.PrivateIdentifier, right)) {
      const lexicallyScopedSymbol = lookupSymbolForPrivateIdentifierDeclaration(right.escapedText, right);
      if (isAnyLike) {
        if (lexicallyScopedSymbol) return apparentType;
        if (!get.containingClass(right)) {
          grammarErrorOnNode(right, qd.Private_identifiers_are_not_allowed_outside_class_bodies);
          return anyType;
        }
      }
      prop = lexicallyScopedSymbol ? getPrivateIdentifierPropertyOfType(leftType, lexicallyScopedSymbol) : undefined;
      if (!prop && checkPrivateIdentifierPropertyAccess(leftType, right, lexicallyScopedSymbol)) return errorType;
    } else {
      if (isAnyLike) {
        if (is.kind(qc.Identifier, left) && parentSymbol) markAliasReferenced(parentSymbol, node);
        return apparentType;
      }
      prop = getPropertyOfType(apparentType, right.escapedText);
    }
    if (is.kind(qc.Identifier, left) && parentSymbol && !(prop && isConstEnumOrConstEnumOnlyModule(prop))) markAliasReferenced(parentSymbol, node);
    let propType: Type;
    if (!prop) {
      const indexInfo =
        !is.kind(qc.PrivateIdentifier, right) && (assignmentKind === AssignmentKind.None || !isGenericObjectType(leftType) || isThisTypeParameter(leftType))
          ? getIndexInfoOfType(apparentType, IndexKind.String)
          : undefined;
      if (!(indexInfo && indexInfo.type)) {
        if (isJSLiteralType(leftType)) return anyType;
        if (leftType.symbol === globalThisSymbol) {
          if (globalThisSymbol.exports!.has(right.escapedText) && globalThisSymbol.exports!.get(right.escapedText)!.flags & qt.SymbolFlags.BlockScoped)
            error(right, qd.Property_0_does_not_exist_on_type_1, qy.get.unescUnderscores(right.escapedText), typeToString(leftType));
          else if (noImplicitAny) {
            error(right, qd.Element_implicitly_has_an_any_type_because_type_0_has_no_index_signature, typeToString(leftType));
          }
          return anyType;
        }
        if (right.escapedText && !checkAndReportErrorForExtendingInterface(node)) reportNonexistentProperty(right, isThisTypeParameter(leftType) ? apparentType : leftType);
        return errorType;
      }
      if (indexInfo.isReadonly && (is.assignmentTarget(node) || is.deleteTarget(node))) error(node, qd.Index_signature_in_type_0_only_permits_reading, typeToString(apparentType));
      propType = indexInfo.type;
    } else {
      checkPropertyNotUsedBeforeDeclaration(prop, node, right);
      markPropertyAsReferenced(prop, node, left.kind === Syntax.ThisKeyword);
      getNodeLinks(node).resolvedSymbol = prop;
      checkPropertyAccessibility(node, left.kind === Syntax.SuperKeyword, apparentType, prop);
      if (isAssignmentToReadonlyEntity(node as Expression, prop, assignmentKind)) {
        error(right, qd.Cannot_assign_to_0_because_it_is_a_read_only_property, idText(right));
        return errorType;
      }
      propType = isThisPropertyAccessInConstructor(node, prop) ? autoType : getConstraintForLocation(getTypeOfSymbol(prop), node);
    }
    return getFlowTypeOfAccessExpression(node, prop, propType, right);
  }
  checkPropertyNotUsedBeforeDeclaration(prop: Symbol, node: PropertyAccessExpression | QualifiedName, right: Identifier | PrivateIdentifier): void {
    const { valueDeclaration } = prop;
    if (!valueDeclaration || get.sourceFileOf(node).isDeclarationFile) return;
    let diagnosticMessage;
    const declarationName = idText(right);
    if (
      isInPropertyIniter(node) &&
      !(is.accessExpression(node) && is.accessExpression(node.expression)) &&
      !isBlockScopedNameDeclaredBeforeUse(valueDeclaration, right) &&
      !isPropertyDeclaredInAncestorClass(prop)
    ) {
      diagnosticMessage = error(right, qd.Property_0_is_used_before_its_initialization, declarationName);
    } else if (
      valueDeclaration.kind === Syntax.ClassDeclaration &&
      node.parent.kind !== Syntax.TypeReference &&
      !(valueDeclaration.flags & NodeFlags.Ambient) &&
      !isBlockScopedNameDeclaredBeforeUse(valueDeclaration, right)
    ) {
      diagnosticMessage = error(right, qd.Class_0_used_before_its_declaration, declarationName);
    }
    if (diagnosticMessage) addRelatedInfo(diagnosticMessage, createDiagnosticForNode(valueDeclaration, qd._0_is_declared_here, declarationName));
  }
  checkIndexedAccess(node: ElementAccessExpression): Type {
    return node.flags & NodeFlags.OptionalChain ? checkElementAccessChain(node as ElementAccessChain) : checkElementAccessExpression(node, checkNonNullExpression(node.expression));
  }
  checkElementAccessChain(node: ElementAccessChain) {
    const exprType = checkExpression(node.expression);
    const nonOptionalType = getOptionalExpressionType(exprType, node.expression);
    return propagateOptionalTypeMarker(checkElementAccessExpression(node, checkNonNullType(nonOptionalType, node.expression)), node, nonOptionalType !== exprType);
  }
  checkElementAccessExpression(node: ElementAccessExpression, exprType: Type): Type {
    const objectType = get.assignmentTargetKind(node) !== AssignmentKind.None || isMethodAccessForCall(node) ? getWidenedType(exprType) : exprType;
    const indexExpression = node.argumentExpression;
    const indexType = checkExpression(indexExpression);
    if (objectType === errorType || objectType === silentNeverType) return objectType;
    if (isConstEnumObjectType(objectType) && !StringLiteral.like(indexExpression)) {
      error(indexExpression, qd.A_const_enum_member_can_only_be_accessed_using_a_string_literal);
      return errorType;
    }
    const effectiveIndexType = isForInVariableForNumericPropertyNames(indexExpression) ? numberType : indexType;
    const accessFlags = is.assignmentTarget(node) ? AccessFlags.Writing | (isGenericObjectType(objectType) && !isThisTypeParameter(objectType) ? AccessFlags.NoIndexSignatures : 0) : AccessFlags.None;
    const indexedAccessType = getIndexedAccessTypeOrUndefined(objectType, effectiveIndexType, node, accessFlags) || errorType;
    return checkIndexedAccessIndexType(getFlowTypeOfAccessExpression(node, indexedAccessType.symbol, indexedAccessType, indexExpression), node);
  }
  checkThatExpressionIsProperSymbolReference(expression: Expression, expressionType: Type, reportError: boolean): boolean {
    if (expressionType === errorType) return false;
    if (!is.wellKnownSymbolSyntactically(expression)) return false;
    if ((expressionType.flags & qt.TypeFlags.ESSymbolLike) === 0) {
      if (reportError) error(expression, qd.A_computed_property_name_of_the_form_0_must_be_of_type_symbol, get.textOf(expression));
      return false;
    }
    const leftHandSide = <Identifier>(<PropertyAccessExpression>expression).expression;
    const leftHandSideSymbol = getResolvedSymbol(leftHandSide);
    if (!leftHandSideSymbol) return false;
    const globalESSymbol = getGlobalESSymbolConstructorSymbol(true);
    if (!globalESSymbol) return false;
    if (leftHandSideSymbol !== globalESSymbol) {
      if (reportError) error(leftHandSide, qd.Symbol_reference_does_not_refer_to_the_global_Symbol_constructor_object);
      return false;
    }
    return true;
  }
  checkTypeArguments(signature: Signature, typeArgumentNodes: readonly TypeNode[], reportErrors: boolean, headMessage?: qd.Message): Type[] | undefined {
    const isJavascript = is.inJSFile(signature.declaration);
    const typeParameters = signature.typeParameters!;
    const typeArgumentTypes = fillMissingTypeArguments(map(typeArgumentNodes, getTypeFromTypeNode), typeParameters, getMinTypeArgumentCount(typeParameters), isJavascript);
    let mapper: TypeMapper | undefined;
    for (let i = 0; i < typeArgumentNodes.length; i++) {
      assert(typeParameters[i] !== undefined, 'Should not call checkTypeArguments with too many type arguments');
      const constraint = getConstraintOfTypeParameter(typeParameters[i]);
      if (constraint) {
        const errorInfo = reportErrors && headMessage ? () => chainqd.Messages(undefined, qd.Type_0_does_not_satisfy_the_constraint_1) : undefined;
        const typeArgumentHeadMessage = headMessage || qd.Type_0_does_not_satisfy_the_constraint_1;
        if (!mapper) mapper = createTypeMapper(typeParameters, typeArgumentTypes);
        const typeArgument = typeArgumentTypes[i];
        if (
          !checkTypeAssignableTo(
            typeArgument,
            getTypeWithThisArgument(instantiateType(constraint, mapper), typeArgument),
            reportErrors ? typeArgumentNodes[i] : undefined,
            typeArgumentHeadMessage,
            errorInfo
          )
        ) {
          return;
        }
      }
    }
    return typeArgumentTypes;
  }
  checkApplicableSignatureForJsxOpeningLikeElement(
    node: JsxOpeningLikeElement,
    signature: Signature,
    relation: qb.QMap<RelationComparisonResult>,
    checkMode: CheckMode,
    reportErrors: boolean,
    containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
    errorOutputContainer: { errors?: Diagnostic[]; skipLogging?: boolean }
  ) {
    const paramType = getEffectiveFirstArgumentForJsxSignature(signature, node);
    const attributesType = checkExpressionWithContextualType(node.attributes, paramType, undefined, checkMode);
    return (
      checkTagNameDoesNotExpectTooManyArguments() &&
      checkTypeRelatedToAndOptionallyElaborate(attributesType, paramType, relation, reportErrors ? node.tagName : undefined, node.attributes, undefined, containingMessageChain, errorOutputContainer)
    );
    function checkTagNameDoesNotExpectTooManyArguments(): boolean {
      const tagType = is.kind(qc.JsxOpeningElement, node) || (is.kind(qc.JsxSelfClosingElement, node) && !isJsxIntrinsicIdentifier(node.tagName)) ? checkExpression(node.tagName) : undefined;
      if (!tagType) return true;
      const tagCallSignatures = getSignaturesOfType(tagType, SignatureKind.Call);
      if (!length(tagCallSignatures)) return true;
      const factory = getJsxFactoryEntity(node);
      if (!factory) return true;
      const factorySymbol = resolveEntityName(factory, qt.SymbolFlags.Value, true, false, node);
      if (!factorySymbol) return true;
      const factoryType = getTypeOfSymbol(factorySymbol);
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
          if (hasEffectiveRestParameter(paramSig)) return true;
          const paramCount = getParameterCount(paramSig);
          if (paramCount > maxParamCount) maxParamCount = paramCount;
        }
      }
      if (!hasFirstParamSignatures) return true;
      let absoluteMinArgCount = Infinity;
      for (const tagSig of tagCallSignatures) {
        const tagRequiredArgCount = getMinArgumentCount(tagSig);
        if (tagRequiredArgCount < absoluteMinArgCount) absoluteMinArgCount = tagRequiredArgCount;
      }
      if (absoluteMinArgCount <= maxParamCount) return true;
      if (reportErrors) {
        const diag = createDiagnosticForNode(
          node.tagName,
          qd.Tag_0_expects_at_least_1_arguments_but_the_JSX_factory_2_provides_at_most_3,
          entityNameToString(node.tagName),
          absoluteMinArgCount,
          entityNameToString(factory),
          maxParamCount
        );
        const tagNameDeclaration = getSymbolAtLocation(node.tagName)?.valueDeclaration;
        if (tagNameDeclaration) addRelatedInfo(diag, createDiagnosticForNode(tagNameDeclaration, qd._0_is_declared_here, entityNameToString(node.tagName)));
        if (errorOutputContainer && errorOutputContainer.skipLogging) (errorOutputContainer.errors || (errorOutputContainer.errors = [])).push(diag);
        if (!errorOutputContainer.skipLogging) diagnostics.add(diag);
      }
      return false;
    }
  }
  checkCallExpression(node: CallExpression | NewExpression, checkMode?: CheckMode): Type {
    if (!checkGrammarTypeArguments(node, node.typeArguments)) checkGrammarArguments(node.arguments);
    const signature = getResolvedSignature(node, undefined, checkMode);
    if (signature === resolvingSignature) return nonInferrableType;
    if (node.expression.kind === Syntax.SuperKeyword) return voidType;
    if (node.kind === Syntax.NewExpression) {
      const declaration = signature.declaration;
      if (
        declaration &&
        declaration.kind !== Syntax.Constructor &&
        declaration.kind !== Syntax.ConstructSignature &&
        declaration.kind !== Syntax.ConstructorType &&
        !qc.isDoc.constructSignature(declaration) &&
        !isJSConstructor(declaration)
      ) {
        if (noImplicitAny) error(node, qd.new_expression_whose_target_lacks_a_construct_signature_implicitly_has_an_any_type);
        return anyType;
      }
    }
    if (is.inJSFile(node) && isCommonJsRequire(node)) return resolveExternalModuleTypeByLiteral(node.arguments![0] as StringLiteral);
    const returnType = getReturnTypeOfSignature(signature);
    if (returnType.flags & qt.TypeFlags.ESSymbolLike && isSymbolOrSymbolForCall(node)) return getESSymbolLikeTypeForNode(walkUpParenthesizedExpressions(node.parent));
    if (node.kind === Syntax.CallExpression && node.parent.kind === Syntax.ExpressionStatement && returnType.flags & qt.TypeFlags.Void && getTypePredicateOfSignature(signature)) {
      if (!isDottedName(node.expression)) error(node.expression, qd.Assertions_require_the_call_target_to_be_an_identifier_or_qualified_name);
      else if (!getEffectsSignature(node)) {
        const diagnostic = error(node.expression, qd.Assertions_require_every_name_in_the_call_target_to_be_declared_with_an_explicit_type_annotation);
        getTypeOfDottedName(node.expression, diagnostic);
      }
    }
    if (is.inJSFile(node)) {
      const decl = get.declarationOfExpando(node);
      if (decl) {
        const jsSymbol = getSymbolOfNode(decl);
        if (jsSymbol && qb.hasEntries(jsSymbol.exports)) {
          const jsAssignmentType = createAnonymousType(jsSymbol, jsSymbol.exports, empty, empty, undefined, undefined);
          jsAssignmentType.objectFlags |= ObjectFlags.JSLiteral;
          return getIntersectionType([returnType, jsAssignmentType]);
        }
      }
    }
    return returnType;
  }
  checkImportCallExpression(node: ImportCall): Type {
    if (!checkGrammarArguments(node.arguments)) checkGrammarImportCallExpression(node);
    if (node.arguments.length === 0) return createPromiseReturnType(node, anyType);
    const specifier = node.arguments[0];
    const specifierType = checkExpressionCached(specifier);
    for (let i = 1; i < node.arguments.length; ++i) {
      checkExpressionCached(node.arguments[i]);
    }
    if (specifierType.flags & qt.TypeFlags.Undefined || specifierType.flags & qt.TypeFlags.Null || !isTypeAssignableTo(specifierType, stringType))
      error(specifier, qd.Dynamic_import_s_specifier_must_be_of_type_string_but_here_has_type_0, typeToString(specifierType));
    const moduleSymbol = resolveExternalModuleName(node, specifier);
    if (moduleSymbol) {
      const esModuleSymbol = resolveESModuleSymbol(moduleSymbol, specifier, true, false);
      if (esModuleSymbol) return createPromiseReturnType(node, getTypeWithSyntheticDefaultImportType(getTypeOfSymbol(esModuleSymbol), esModuleSymbol, moduleSymbol));
    }
    return createPromiseReturnType(node, anyType);
  }
  checkTaggedTemplateExpression(node: TaggedTemplateExpression): Type {
    if (!checkGrammarTaggedTemplateChain(node)) checkGrammarTypeArguments(node, node.typeArguments);
    return getReturnTypeOfSignature(getResolvedSignature(node));
  }
  checkAssertion(node: AssertionExpression) {
    return checkAssertionWorker(node, node.type, node.expression);
  }
  checkAssertionWorker(errNode: Node, type: TypeNode, expression: UnaryExpression | Expression, checkMode?: CheckMode) {
    let exprType = checkExpression(expression, checkMode);
    if (is.constTypeReference(type)) {
      if (!isValidConstAssertionArgument(expression)) error(expression, qd.A_const_assertions_can_only_be_applied_to_references_to_enum_members_or_string_number_boolean_array_or_object_literals);
      return getRegularTypeOfLiteralType(exprType);
    }
    checkSourceElement(type);
    exprType = getRegularTypeOfObjectLiteral(getBaseTypeOfLiteralType(exprType));
    const targetType = getTypeFromTypeNode(type);
    if (produceDiagnostics && targetType !== errorType) {
      const widenedType = getWidenedType(exprType);
      if (!isTypeComparableTo(targetType, widenedType)) {
        checkTypeComparableTo(
          exprType,
          targetType,
          errNode,
          qd.Conversion_of_type_0_to_type_1_may_be_a_mistake_because_neither_type_sufficiently_overlaps_with_the_other_If_this_was_intentional_convert_the_expression_to_unknown_first
        );
      }
    }
    return targetType;
  }
  checkNonNullChain(node: NonNullChain) {
    const leftType = checkExpression(node.expression);
    const nonOptionalType = getOptionalExpressionType(leftType, node.expression);
    return propagateOptionalTypeMarker(getNonNullableType(nonOptionalType), node, nonOptionalType !== leftType);
  }
  checkNonNullAssertion(node: NonNullExpression) {
    return node.flags & NodeFlags.OptionalChain ? checkNonNullChain(node as NonNullChain) : getNonNullableType(checkExpression(node.expression));
  }
  checkMetaProperty(node: MetaProperty): Type {
    checkGrammarMetaProperty(node);
    if (node.keywordToken === Syntax.NewKeyword) return checkNewTargetMetaProperty(node);
    if (node.keywordToken === Syntax.ImportKeyword) return checkImportMetaProperty(node);
    return Debug.assertNever(node.keywordToken);
  }
  checkNewTargetMetaProperty(node: MetaProperty) {
    const container = get.newTargetContainer(node);
    if (!container) {
      error(node, qd.Meta_property_0_is_only_allowed_in_the_body_of_a_function_declaration_function_expression_or_constructor, 'new.target');
      return errorType;
    } else if (container.kind === Syntax.Constructor) {
      const symbol = getSymbolOfNode(container.parent as ClassLikeDeclaration);
      return this.getTypeOfSymbol();
    } else {
      const symbol = getSymbolOfNode(container)!;
      return this.getTypeOfSymbol();
    }
  }
  checkImportMetaProperty(node: MetaProperty) {
    if (moduleKind !== ModuleKind.ESNext && moduleKind !== ModuleKind.System) error(node, qd.The_import_meta_meta_property_is_only_allowed_when_the_module_option_is_esnext_or_system);
    const file = get.sourceFileOf(node);
    assert(!!(file.flags & NodeFlags.PossiblyContainsImportMeta), 'Containing file is missing import meta node flag.');
    assert(!!file.externalModuleIndicator, 'Containing file should be a module.');
    return node.name.escapedText === 'meta' ? getGlobalImportMetaType() : errorType;
  }
  checkAndAggregateYieldOperandTypes(func: FunctionLikeDeclaration, checkMode: CheckMode | undefined) {
    const yieldTypes: Type[] = [];
    const nextTypes: Type[] = [];
    const isAsync = (getFunctionFlags(func) & FunctionFlags.Async) !== 0;
    forEachYieldExpression(<Block>func.body, (yieldExpression) => {
      const yieldExpressionType = yieldExpression.expression ? checkExpression(yieldExpression.expression, checkMode) : undefinedWideningType;
      pushIfUnique(yieldTypes, getYieldedTypeOfYieldExpression(yieldExpression, yieldExpressionType, anyType, isAsync));
      let nextType: Type | undefined;
      if (yieldExpression.asteriskToken) {
        const iterationTypes = getIterationTypesOfIterable(yieldExpressionType, isAsync ? IterationUse.AsyncYieldStar : IterationUse.YieldStar, yieldExpression.expression);
        nextType = iterationTypes && iterationTypes.nextType;
      } else nextType = getContextualType(yieldExpression);
      if (nextType) pushIfUnique(nextTypes, nextType);
    });
    return { yieldTypes, nextTypes };
  }
  checkAndAggregateReturnExpressionTypes(func: FunctionLikeDeclaration, checkMode: CheckMode | undefined): Type[] | undefined {
    const functionFlags = getFunctionFlags(func);
    const aggregatedTypes: Type[] = [];
    let hasReturnWithNoExpression = functionHasImplicitReturn(func);
    let hasReturnOfTypeNever = false;
    forEachReturnStatement(<Block>func.body, (returnStatement) => {
      const expr = returnStatement.expression;
      if (expr) {
        let type = checkExpressionCached(expr, checkMode && checkMode & ~CheckMode.SkipGenericFunctions);
        if (functionFlags & FunctionFlags.Async) type = checkAwaitedType(type, func, qd.The_return_type_of_an_async_function_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member);
        if (type.flags & qt.TypeFlags.Never) hasReturnOfTypeNever = true;
        pushIfUnique(aggregatedTypes, type);
      } else {
        hasReturnWithNoExpression = true;
      }
    });
    if (aggregatedTypes.length === 0 && !hasReturnWithNoExpression && (hasReturnOfTypeNever || mayReturnNever(func))) return;
    if (strictNullChecks && aggregatedTypes.length && hasReturnWithNoExpression && !(isJSConstructor(func) && aggregatedTypes.some((t) => t.symbol === func.symbol)))
      pushIfUnique(aggregatedTypes, undefinedType);
    return aggregatedTypes;
  }
  checkAllCodePathsInNonVoidFunctionReturnOrThrow(func: FunctionLikeDeclaration | MethodSignature, returnType: Type | undefined): void {
    if (!produceDiagnostics) return;
    const functionFlags = getFunctionFlags(func);
    const type = returnType && unwrapReturnType(returnType, functionFlags);
    if (type && maybeTypeOfKind(type, qt.TypeFlags.Any | qt.TypeFlags.Void)) return;
    if (func.kind === Syntax.MethodSignature || is.missing(func.body) || func.body!.kind !== Syntax.Block || !functionHasImplicitReturn(func)) return;
    const hasExplicitReturn = func.flags & NodeFlags.HasExplicitReturn;
    if (type && type.flags & qt.TypeFlags.Never) error(getEffectiveReturnTypeNode(func), qd.A_function_returning_never_cannot_have_a_reachable_end_point);
    else if (type && !hasExplicitReturn) {
      error(getEffectiveReturnTypeNode(func), qd.A_function_whose_declared_type_is_neither_void_nor_any_must_return_a_value);
    } else if (type && strictNullChecks && !isTypeAssignableTo(undefinedType, type)) {
      error(getEffectiveReturnTypeNode(func) || func, qd.Function_lacks_ending_return_statement_and_return_type_does_not_include_undefined);
    } else if (compilerOptions.noImplicitReturns) {
      if (!type) {
        if (!hasExplicitReturn) return;
        const inferredReturnType = getReturnTypeOfSignature(getSignatureFromDeclaration(func));
        if (isUnwrappedReturnTypeVoidOrAny(func, inferredReturnType)) return;
      }
      error(getEffectiveReturnTypeNode(func) || func, qd.Not_all_code_paths_return_a_value);
    }
  }
  checkFunctionExpressionOrObjectLiteralMethod(node: FunctionExpression | ArrowFunction | MethodDeclaration, checkMode?: CheckMode): Type {
    assert(node.kind !== Syntax.MethodDeclaration || is.objectLiteralMethod(node));
    checkNodeDeferred(node);
    if (checkMode && checkMode & CheckMode.SkipContextSensitive && isContextSensitive(node)) {
      if (!getEffectiveReturnTypeNode(node) && !hasContextSensitiveParameters(node)) {
        const contextualSignature = getContextualSignature(node);
        if (contextualSignature && couldContainTypeVariables(getReturnTypeOfSignature(contextualSignature))) {
          const links = getNodeLinks(node);
          if (links.contextFreeType) return links.contextFreeType;
          const returnType = getReturnTypeFromBody(node, checkMode);
          const returnOnlySignature = createSignature(undefined, undefined, undefined, empty, returnType, undefined, 0, SignatureFlags.None);
          const returnOnlyType = createAnonymousType(node.symbol, emptySymbols, [returnOnlySignature], empty, undefined, undefined);
          returnOnlyType.objectFlags |= ObjectFlags.NonInferrableType;
          return (links.contextFreeType = returnOnlyType);
        }
      }
      return anyFunctionType;
    }
    const hasGrammarError = checkGrammarFunctionLikeDeclaration(node);
    if (!hasGrammarError && node.kind === Syntax.FunctionExpression) checkGrammarForGenerator(node);
    contextuallyCheckFunctionExpressionOrObjectLiteralMethod(node, checkMode);
    return getTypeOfSymbol(getSymbolOfNode(node));
  }
  checkFunctionExpressionOrObjectLiteralMethodDeferred(node: ArrowFunction | FunctionExpression | MethodDeclaration) {
    assert(node.kind !== Syntax.MethodDeclaration || is.objectLiteralMethod(node));
    const functionFlags = getFunctionFlags(node);
    const returnType = getReturnTypeFromAnnotation(node);
    checkAllCodePathsInNonVoidFunctionReturnOrThrow(node, returnType);
    if (node.body) {
      if (!getEffectiveReturnTypeNode(node)) getReturnTypeOfSignature(getSignatureFromDeclaration(node));
      if (node.body.kind === Syntax.Block) checkSourceElement(node.body);
      else {
        const exprType = checkExpression(node.body);
        const returnOrPromisedType = returnType && unwrapReturnType(returnType, functionFlags);
        if (returnOrPromisedType) {
          if ((functionFlags & FunctionFlags.AsyncGenerator) === FunctionFlags.Async) {
            const awaitedType = checkAwaitedType(exprType, node.body, qd.The_return_type_of_an_async_function_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member);
            checkTypeAssignableToAndOptionallyElaborate(awaitedType, returnOrPromisedType, node.body, node.body);
          } else {
            checkTypeAssignableToAndOptionallyElaborate(exprType, returnOrPromisedType, node.body, node.body);
          }
        }
      }
    }
  }
  checkArithmeticOperandType(operand: Node, type: Type, diagnostic: qd.Message, isAwaitValid = false): boolean {
    if (!isTypeAssignableTo(type, numberOrBigIntType)) {
      const awaitedType = isAwaitValid && getAwaitedTypeOfPromise(type);
      errorAndMaybeSuggestAwait(operand, !!awaitedType && isTypeAssignableTo(awaitedType, numberOrBigIntType), diagnostic);
      return false;
    }
    return true;
  }
  checkReferenceExpression(expr: Expression, invalidReferenceMessage: qd.Message, invalidOptionalChainMessage: qd.Message): boolean {
    const node = skipOuterExpressions(expr, OuterExpressionKinds.Assertions | OuterExpressionKinds.Parentheses);
    if (node.kind !== Syntax.Identifier && !is.accessExpression(node)) {
      error(expr, invalidReferenceMessage);
      return false;
    }
    if (node.flags & NodeFlags.OptionalChain) {
      error(expr, invalidOptionalChainMessage);
      return false;
    }
    return true;
  }
  checkDeleteExpression(node: DeleteExpression): Type {
    checkExpression(node.expression);
    const expr = skipParentheses(node.expression);
    if (!is.accessExpression(expr)) {
      error(expr, qd.The_operand_of_a_delete_operator_must_be_a_property_reference);
      return booleanType;
    }
    if (expr.kind === Syntax.PropertyAccessExpression && is.kind(qc.PrivateIdentifier, expr.name)) error(expr, qd.The_operand_of_a_delete_operator_cannot_be_a_private_identifier);
    const links = getNodeLinks(expr);
    const symbol = getExportSymbolOfValueSymbolIfExported(links.resolvedSymbol);
    if (symbol) {
      if (isReadonlySymbol(symbol)) error(expr, qd.The_operand_of_a_delete_operator_cannot_be_a_read_only_property);
      checkDeleteExpressionMustBeOptional(expr, this.getTypeOfSymbol());
    }
    return booleanType;
  }
  checkDeleteExpressionMustBeOptional(expr: AccessExpression, type: Type) {
    const AnyOrUnknownOrNeverFlags = qt.TypeFlags.AnyOrUnknown | qt.TypeFlags.Never;
    if (strictNullChecks && !(type.flags & AnyOrUnknownOrNeverFlags) && !(getFalsyFlags(type) & qt.TypeFlags.Undefined)) error(expr, qd.The_operand_of_a_delete_operator_must_be_optional);
  }
  checkTypeOfExpression(node: TypeOfExpression): Type {
    checkExpression(node.expression);
    return typeofType;
  }
  checkVoidExpression(node: VoidExpression): Type {
    checkExpression(node.expression);
    return undefinedWideningType;
  }
  checkAwaitExpression(node: AwaitExpression): Type {
    if (produceDiagnostics) {
      if (!(node.flags & NodeFlags.AwaitContext)) {
        if (isTopLevelAwait(node)) {
          const sourceFile = get.sourceFileOf(node);
          if (!hasParseDiagnostics(sourceFile)) {
            let span: TextSpan | undefined;
            if (!isEffectiveExternalModule(sourceFile, compilerOptions)) {
              if (!span) span = getSpanOfTokenAtPosition(sourceFile, node.pos);
              const diagnostic = createFileDiagnostic(
                sourceFile,
                span.start,
                span.length,
                qd.await_expressions_are_only_allowed_at_the_top_level_of_a_file_when_that_file_is_a_module_but_this_file_has_no_imports_or_exports_Consider_adding_an_empty_export_to_make_this_file_a_module
              );
              diagnostics.add(diagnostic);
            }
            if (moduleKind !== ModuleKind.ESNext && moduleKind !== ModuleKind.System) {
              span = getSpanOfTokenAtPosition(sourceFile, node.pos);
              const diagnostic = createFileDiagnostic(
                sourceFile,
                span.start,
                span.length,
                qd.Top_level_await_expressions_are_only_allowed_when_the_module_option_is_set_to_esnext_or_system_and_the_target_option_is_set_to_es2017_or_higher
              );
              diagnostics.add(diagnostic);
            }
          }
        } else {
          const sourceFile = get.sourceFileOf(node);
          if (!hasParseDiagnostics(sourceFile)) {
            const span = getSpanOfTokenAtPosition(sourceFile, node.pos);
            const diagnostic = createFileDiagnostic(sourceFile, span.start, span.length, qd.await_expressions_are_only_allowed_within_async_functions_and_at_the_top_levels_of_modules);
            const func = get.containingFunction(node);
            if (func && func.kind !== Syntax.Constructor && (getFunctionFlags(func) & FunctionFlags.Async) === 0) {
              const relatedInfo = createDiagnosticForNode(func, qd.Did_you_mean_to_mark_this_function_as_async);
              addRelatedInfo(diagnostic, relatedInfo);
            }
            diagnostics.add(diagnostic);
          }
        }
      }
      if (isInParameterIniterBeforeContainingFunction(node)) error(node, qd.await_expressions_cannot_be_used_in_a_parameter_initer);
    }
    const operandType = checkExpression(node.expression);
    const awaitedType = checkAwaitedType(operandType, node, qd.Type_of_await_operand_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member);
    if (awaitedType === operandType && awaitedType !== errorType && !(operandType.flags & qt.TypeFlags.AnyOrUnknown))
      addErrorOrSuggestion(false, createDiagnosticForNode(node, qd.await_has_no_effect_on_the_type_of_this_expression));
    return awaitedType;
  }
  checkPrefixUnaryExpression(node: PrefixUnaryExpression): Type {
    const operandType = checkExpression(node.operand);
    if (operandType === silentNeverType) return silentNeverType;
    switch (node.operand.kind) {
      case Syntax.NumericLiteral:
        switch (node.operator) {
          case Syntax.MinusToken:
            return getFreshTypeOfLiteralType(getLiteralType(-(node.operand as NumericLiteral).text));
          case Syntax.PlusToken:
            return getFreshTypeOfLiteralType(getLiteralType(+(node.operand as NumericLiteral).text));
        }
        break;
      case Syntax.BigIntLiteral:
        if (node.operator === Syntax.MinusToken) {
          return getFreshTypeOfLiteralType(
            getLiteralType({
              negative: true,
              base10Value: parsePseudoBigInt((node.operand as BigIntLiteral).text),
            })
          );
        }
    }
    switch (node.operator) {
      case Syntax.PlusToken:
      case Syntax.MinusToken:
      case Syntax.TildeToken:
        checkNonNullType(operandType, node.operand);
        if (maybeTypeOfKind(operandType, qt.TypeFlags.ESSymbolLike)) error(node.operand, qd.The_0_operator_cannot_be_applied_to_type_symbol, Token.toString(node.operator));
        if (node.operator === Syntax.PlusToken) {
          if (maybeTypeOfKind(operandType, qt.TypeFlags.BigIntLike))
            error(node.operand, qd.Operator_0_cannot_be_applied_to_type_1, Token.toString(node.operator), typeToString(getBaseTypeOfLiteralType(operandType)));
          return numberType;
        }
        return getUnaryResultType(operandType);
      case Syntax.ExclamationToken:
        checkTruthinessExpression(node.operand);
        const facts = getTypeFacts(operandType) & (TypeFacts.Truthy | TypeFacts.Falsy);
        return facts === TypeFacts.Truthy ? falseType : facts === TypeFacts.Falsy ? trueType : booleanType;
      case Syntax.Plus2Token:
      case Syntax.Minus2Token:
        const ok = checkArithmeticOperandType(node.operand, checkNonNullType(operandType, node.operand), qd.An_arithmetic_operand_must_be_of_type_any_number_bigint_or_an_enum_type);
        if (ok) {
          checkReferenceExpression(
            node.operand,
            qd.The_operand_of_an_increment_or_decrement_operator_must_be_a_variable_or_a_property_access,
            qd.The_operand_of_an_increment_or_decrement_operator_may_not_be_an_optional_property_access
          );
        }
        return getUnaryResultType(operandType);
    }
    return errorType;
  }
  checkPostfixUnaryExpression(node: PostfixUnaryExpression): Type {
    const operandType = checkExpression(node.operand);
    if (operandType === silentNeverType) return silentNeverType;
    const ok = checkArithmeticOperandType(node.operand, checkNonNullType(operandType, node.operand), qd.An_arithmetic_operand_must_be_of_type_any_number_bigint_or_an_enum_type);
    if (ok) {
      checkReferenceExpression(
        node.operand,
        qd.The_operand_of_an_increment_or_decrement_operator_must_be_a_variable_or_a_property_access,
        qd.The_operand_of_an_increment_or_decrement_operator_may_not_be_an_optional_property_access
      );
    }
    return getUnaryResultType(operandType);
  }
  checkInstanceOfExpression(left: Expression, right: Expression, leftType: Type, rightType: Type): Type {
    if (leftType === silentNeverType || rightType === silentNeverType) return silentNeverType;
    if (!isTypeAny(leftType) && allTypesAssignableToKind(leftType, qt.TypeFlags.Primitive))
      error(left, qd.The_left_hand_side_of_an_instanceof_expression_must_be_of_type_any_an_object_type_or_a_type_parameter);
    if (!(isTypeAny(rightType) || typeHasCallOrConstructSignatures(rightType) || isTypeSubtypeOf(rightType, globalFunctionType)))
      error(right, qd.The_right_hand_side_of_an_instanceof_expression_must_be_of_type_any_or_of_a_type_assignable_to_the_Function_interface_type);
    return booleanType;
  }
  checkInExpression(left: Expression, right: Expression, leftType: Type, rightType: Type): Type {
    if (leftType === silentNeverType || rightType === silentNeverType) return silentNeverType;
    leftType = checkNonNullType(leftType, left);
    rightType = checkNonNullType(rightType, right);
    if (
      !(
        allTypesAssignableToKind(leftType, qt.TypeFlags.StringLike | qt.TypeFlags.NumberLike | qt.TypeFlags.ESSymbolLike) ||
        isTypeAssignableToKind(leftType, qt.TypeFlags.Index | qt.TypeFlags.TypeParameter)
      )
    )
      error(left, qd.The_left_hand_side_of_an_in_expression_must_be_of_type_any_string_number_or_symbol);
    if (!allTypesAssignableToKind(rightType, qt.TypeFlags.NonPrimitive | qt.TypeFlags.InstantiableNonPrimitive))
      error(right, qd.The_right_hand_side_of_an_in_expression_must_be_of_type_any_an_object_type_or_a_type_parameter);
    return booleanType;
  }
  checkObjectLiteralAssignment(node: ObjectLiteralExpression, sourceType: Type, rightIsThis?: boolean): Type {
    const properties = node.properties;
    if (strictNullChecks && properties.length === 0) return checkNonNullType(sourceType, node);
    for (let i = 0; i < properties.length; i++) {
      checkObjectLiteralDestructuringPropertyAssignment(node, sourceType, i, properties, rightIsThis);
    }
    return sourceType;
  }
  checkObjectLiteralDestructuringPropertyAssignment(
    node: ObjectLiteralExpression,
    objectLiteralType: Type,
    propertyIndex: number,
    allProperties?: Nodes<ObjectLiteralElementLike>,
    rightIsThis = false
  ) {
    const properties = node.properties;
    const property = properties[propertyIndex];
    if (property.kind === Syntax.PropertyAssignment || property.kind === Syntax.ShorthandPropertyAssignment) {
      const name = property.name;
      const exprType = getLiteralTypeFromPropertyName(name);
      if (isTypeUsableAsPropertyName(exprType)) {
        const text = getPropertyNameFromType(exprType);
        const prop = getPropertyOfType(objectLiteralType, text);
        if (prop) {
          markPropertyAsReferenced(prop, property, rightIsThis);
          checkPropertyAccessibility(property, false, objectLiteralType, prop);
        }
      }
      const elementType = getIndexedAccessType(objectLiteralType, exprType, name);
      const type = getFlowTypeOfDestructuring(property, elementType);
      return checkDestructuringAssignment(property.kind === Syntax.ShorthandPropertyAssignment ? property : property.initer, type);
    } else if (property.kind === Syntax.SpreadAssignment) {
      if (propertyIndex < properties.length - 1) error(property, qd.A_rest_element_must_be_last_in_a_destructuring_pattern);
      else {
        if (languageVersion < ScriptTarget.ESNext) checkExternalEmitHelpers(property, ExternalEmitHelpers.Rest);
        const nonRestNames: PropertyName[] = [];
        if (allProperties) {
          for (const otherProperty of allProperties) {
            if (!is.kind(qc.SpreadAssignment, otherProperty)) nonRestNames.push(otherProperty.name);
          }
        }
        const type = getRestType(objectLiteralType, nonRestNames, objectLiteralType.symbol);
        checkGrammarForDisallowedTrailingComma(allProperties, qd.A_rest_parameter_or_binding_pattern_may_not_have_a_trailing_comma);
        return checkDestructuringAssignment(property.expression, type);
      }
    } else {
      error(property, qd.Property_assignment_expected);
    }
  }
  checkArrayLiteralAssignment(node: ArrayLiteralExpression, sourceType: Type, checkMode?: CheckMode): Type {
    const elements = node.elements;
    const elementType = checkIteratedTypeOrElementType(IterationUse.Destructuring, sourceType, undefinedType, node) || errorType;
    for (let i = 0; i < elements.length; i++) {
      checkArrayLiteralDestructuringElementAssignment(node, sourceType, i, elementType, checkMode);
    }
    return sourceType;
  }
  checkArrayLiteralDestructuringElementAssignment(node: ArrayLiteralExpression, sourceType: Type, elementIndex: number, elementType: Type, checkMode?: CheckMode) {
    const elements = node.elements;
    const element = elements[elementIndex];
    if (element.kind !== Syntax.OmittedExpression) {
      if (element.kind !== Syntax.SpreadElement) {
        const indexType = getLiteralType(elementIndex);
        if (isArrayLikeType(sourceType)) {
          const accessFlags = hasDefaultValue(element) ? AccessFlags.NoTupleBoundsCheck : 0;
          const elementType = getIndexedAccessTypeOrUndefined(sourceType, indexType, createSyntheticExpression(element, indexType), accessFlags) || errorType;
          const assignedType = hasDefaultValue(element) ? getTypeWithFacts(elementType, TypeFacts.NEUndefined) : elementType;
          const type = getFlowTypeOfDestructuring(element, assignedType);
          return checkDestructuringAssignment(element, type, checkMode);
        }
        return checkDestructuringAssignment(element, elementType, checkMode);
      }
      if (elementIndex < elements.length - 1) error(element, qd.A_rest_element_must_be_last_in_a_destructuring_pattern);
      else {
        const restExpression = (<SpreadElement>element).expression;
        if (restExpression.kind === Syntax.BinaryExpression && (<BinaryExpression>restExpression).operatorToken.kind === Syntax.EqualsToken)
          error((<BinaryExpression>restExpression).operatorToken, qd.A_rest_element_cannot_have_an_initer);
        else {
          checkGrammarForDisallowedTrailingComma(node.elements, qd.A_rest_parameter_or_binding_pattern_may_not_have_a_trailing_comma);
          const type = everyType(sourceType, isTupleType) ? mapType(sourceType, (t) => sliceTupleType(<TupleTypeReference>t, elementIndex)) : createArrayType(elementType);
          return checkDestructuringAssignment(restExpression, type, checkMode);
        }
      }
    }
    return;
  }
  checkDestructuringAssignment(exprOrAssignment: Expression | ShorthandPropertyAssignment, sourceType: Type, checkMode?: CheckMode, rightIsThis?: boolean): Type {
    let target: Expression;
    if (exprOrAssignment.kind === Syntax.ShorthandPropertyAssignment) {
      const prop = <ShorthandPropertyAssignment>exprOrAssignment;
      if (prop.objectAssignmentIniter) {
        if (strictNullChecks && !(getFalsyFlags(checkExpression(prop.objectAssignmentIniter)) & qt.TypeFlags.Undefined)) sourceType = getTypeWithFacts(sourceType, TypeFacts.NEUndefined);
        checkBinaryLikeExpression(prop.name, prop.equalsToken!, prop.objectAssignmentIniter, checkMode);
      }
      target = (<ShorthandPropertyAssignment>exprOrAssignment).name;
    } else {
      target = exprOrAssignment;
    }
    if (target.kind === Syntax.BinaryExpression && (<BinaryExpression>target).operatorToken.kind === Syntax.EqualsToken) {
      checkBinaryExpression(<BinaryExpression>target, checkMode);
      target = (<BinaryExpression>target).left;
    }
    if (target.kind === Syntax.ObjectLiteralExpression) return checkObjectLiteralAssignment(<ObjectLiteralExpression>target, sourceType, rightIsThis);
    if (target.kind === Syntax.ArrayLiteralExpression) return checkArrayLiteralAssignment(<ArrayLiteralExpression>target, sourceType, checkMode);
    return checkReferenceAssignment(target, sourceType, checkMode);
  }
  checkReferenceAssignment(target: Expression, sourceType: Type, checkMode?: CheckMode): Type {
    const targetType = checkExpression(target, checkMode);
    const error =
      target.parent.kind === Syntax.SpreadAssignment
        ? qd.The_target_of_an_object_rest_assignment_must_be_a_variable_or_a_property_access
        : qd.The_left_hand_side_of_an_assignment_expression_must_be_a_variable_or_a_property_access;
    const optionalError =
      target.parent.kind === Syntax.SpreadAssignment
        ? qd.The_target_of_an_object_rest_assignment_may_not_be_an_optional_property_access
        : qd.The_left_hand_side_of_an_assignment_expression_may_not_be_an_optional_property_access;
    if (checkReferenceExpression(target, error, optionalError)) checkTypeAssignableToAndOptionallyElaborate(sourceType, targetType, target, target);
    if (is.privateIdentifierPropertyAccessExpression(target)) checkExternalEmitHelpers(target.parent, ExternalEmitHelpers.ClassPrivateFieldSet);
    return sourceType;
  }
  checkBinaryExpression(node: BinaryExpression, checkMode?: CheckMode) {
    const workStacks: {
      expr: BinaryExpression[];
      state: CheckBinaryExpressionState[];
      leftType: (Type | undefined)[];
    } = {
      expr: [node],
      state: [CheckBinaryExpressionState.MaybeCheckLeft],
      leftType: [undefined],
    };
    let stackIndex = 0;
    let lastResult: Type | undefined;
    while (stackIndex >= 0) {
      node = workStacks.expr[stackIndex];
      switch (workStacks.state[stackIndex]) {
        case CheckBinaryExpressionState.MaybeCheckLeft: {
          if (is.inJSFile(node) && getAssignedExpandoIniter(node)) {
            finishInvocation(checkExpression(node.right, checkMode));
            break;
          }
          checkGrammarNullishCoalesceWithLogicalExpression(node);
          const operator = node.operatorToken.kind;
          if (operator === Syntax.EqualsToken && (node.left.kind === Syntax.ObjectLiteralExpression || node.left.kind === Syntax.ArrayLiteralExpression)) {
            finishInvocation(checkDestructuringAssignment(node.left, checkExpression(node.right, checkMode), checkMode, node.right.kind === Syntax.ThisKeyword));
            break;
          }
          advanceState(CheckBinaryExpressionState.CheckRight);
          maybeCheckExpression(node.left);
          break;
        }
        case CheckBinaryExpressionState.CheckRight: {
          const leftType = lastResult!;
          workStacks.leftType[stackIndex] = leftType;
          const operator = node.operatorToken.kind;
          if (operator === Syntax.Ampersand2Token || operator === Syntax.Bar2Token || operator === Syntax.Question2Token) checkTruthinessOfType(leftType, node.left);
          advanceState(CheckBinaryExpressionState.FinishCheck);
          maybeCheckExpression(node.right);
          break;
        }
        case CheckBinaryExpressionState.FinishCheck: {
          const leftType = workStacks.leftType[stackIndex]!;
          const rightType = lastResult!;
          finishInvocation(checkBinaryLikeExpressionWorker(node.left, node.operatorToken, node.right, leftType, rightType, node));
          break;
        }
        default:
          return fail(`Invalid state ${workStacks.state[stackIndex]} for checkBinaryExpression`);
      }
    }
    return lastResult!;
    function finishInvocation(result: Type) {
      lastResult = result;
      stackIndex--;
    }
    function advanceState(nextState: CheckBinaryExpressionState) {
      workStacks.state[stackIndex] = nextState;
    }
    function maybeCheckExpression(node: Expression) {
      if (is.kind(qc.node, BinaryExpression)) {
        stackIndex++;
        workStacks.expr[stackIndex] = node;
        workStacks.state[stackIndex] = CheckBinaryExpressionState.MaybeCheckLeft;
        workStacks.leftType[stackIndex] = undefined;
      } else {
        lastResult = checkExpression(node, checkMode);
      }
    }
  }
  checkGrammarNullishCoalesceWithLogicalExpression(node: BinaryExpression) {
    const { left, operatorToken, right } = node;
    if (operatorToken.kind === Syntax.Question2Token) {
      if (is.kind(qc.BinaryExpression, left) && (left.operatorToken.kind === Syntax.Bar2Token || left.operatorToken.kind === Syntax.Ampersand2Token))
        grammarErrorOnNode(left, qd._0_and_1_operations_cannot_be_mixed_without_parentheses, Token.toString(left.operatorToken.kind), Token.toString(operatorToken.kind));
      if (is.kind(qc.BinaryExpression, right) && (right.operatorToken.kind === Syntax.Bar2Token || right.operatorToken.kind === Syntax.Ampersand2Token))
        grammarErrorOnNode(right, qd._0_and_1_operations_cannot_be_mixed_without_parentheses, Token.toString(right.operatorToken.kind), Token.toString(operatorToken.kind));
    }
  }
  checkBinaryLikeExpression(left: Expression, operatorToken: Node, right: Expression, checkMode?: CheckMode, errorNode?: Node): Type {
    const operator = operatorToken.kind;
    if (operator === Syntax.EqualsToken && (left.kind === Syntax.ObjectLiteralExpression || left.kind === Syntax.ArrayLiteralExpression))
      return checkDestructuringAssignment(left, checkExpression(right, checkMode), checkMode, right.kind === Syntax.ThisKeyword);
    let leftType: Type;
    if (operator === Syntax.Ampersand2Token || operator === Syntax.Bar2Token || operator === Syntax.Question2Token) leftType = checkTruthinessExpression(left, checkMode);
    else {
      leftType = checkExpression(left, checkMode);
    }
    const rightType = checkExpression(right, checkMode);
    return checkBinaryLikeExpressionWorker(left, operatorToken, right, leftType, rightType, errorNode);
  }
  checkBinaryLikeExpressionWorker(left: Expression, operatorToken: Node, right: Expression, leftType: Type, rightType: Type, errorNode?: Node): Type {
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
        leftType = checkNonNullType(leftType, left);
        rightType = checkNonNullType(rightType, right);
        let suggestedOperator: Syntax | undefined;
        if (leftType.flags & qt.TypeFlags.BooleanLike && rightType.flags & qt.TypeFlags.BooleanLike && (suggestedOperator = getSuggestedBooleanOperator(operatorToken.kind)) !== undefined) {
          error(errorNode || operatorToken, qd.The_0_operator_is_not_allowed_for_boolean_types_Consider_using_1_instead, Token.toString(operatorToken.kind), Token.toString(suggestedOperator));
          return numberType;
        } else {
          const leftOk = checkArithmeticOperandType(left, leftType, qd.The_left_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_bigint_or_an_enum_type, true);
          const rightOk = checkArithmeticOperandType(right, rightType, qd.The_right_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_bigint_or_an_enum_type, true);
          let resultType: Type;
          if (
            (isTypeAssignableToKind(leftType, qt.TypeFlags.AnyOrUnknown) && isTypeAssignableToKind(rightType, qt.TypeFlags.AnyOrUnknown)) ||
            !(maybeTypeOfKind(leftType, qt.TypeFlags.BigIntLike) || maybeTypeOfKind(rightType, qt.TypeFlags.BigIntLike))
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
          if (leftOk && rightOk) checkAssignmentOperator(resultType);
          return resultType;
        }
      case Syntax.PlusToken:
      case Syntax.PlusEqualsToken:
        if (leftType === silentNeverType || rightType === silentNeverType) return silentNeverType;
        if (!isTypeAssignableToKind(leftType, qt.TypeFlags.StringLike) && !isTypeAssignableToKind(rightType, qt.TypeFlags.StringLike)) {
          leftType = checkNonNullType(leftType, left);
          rightType = checkNonNullType(rightType, right);
        }
        let resultType: Type | undefined;
        if (isTypeAssignableToKind(leftType, qt.TypeFlags.NumberLike, true)) resultType = numberType;
        else if (isTypeAssignableToKind(leftType, qt.TypeFlags.BigIntLike, true)) {
          resultType = bigintType;
        } else if (isTypeAssignableToKind(leftType, qt.TypeFlags.StringLike, true)) {
          resultType = stringType;
        } else if (isTypeAny(leftType) || isTypeAny(rightType)) {
          resultType = leftType === errorType || rightType === errorType ? errorType : anyType;
        }
        if (resultType && !checkForDisallowedESSymbolOperand(operator)) return resultType;
        if (!resultType) {
          const closeEnoughKind = qt.TypeFlags.NumberLike | qt.TypeFlags.BigIntLike | qt.TypeFlags.StringLike | qt.TypeFlags.AnyOrUnknown;
          reportOperatorError((left, right) => isTypeAssignableToKind(left, closeEnoughKind) && isTypeAssignableToKind(right, closeEnoughKind));
          return anyType;
        }
        if (operator === Syntax.PlusEqualsToken) checkAssignmentOperator(resultType);
        return resultType;
      case Syntax.LessThanToken:
      case Syntax.GreaterThanToken:
      case Syntax.LessThanEqualsToken:
      case Syntax.GreaterThanEqualsToken:
        if (checkForDisallowedESSymbolOperand(operator)) {
          leftType = getBaseTypeOfLiteralType(checkNonNullType(leftType, left));
          rightType = getBaseTypeOfLiteralType(checkNonNullType(rightType, right));
          reportOperatorErrorUnless(
            (left, right) => isTypeComparableTo(left, right) || isTypeComparableTo(right, left) || (isTypeAssignableTo(left, numberOrBigIntType) && isTypeAssignableTo(right, numberOrBigIntType))
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
        return checkInstanceOfExpression(left, right, leftType, rightType);
      case Syntax.InKeyword:
        return checkInExpression(left, right, leftType, rightType);
      case Syntax.Ampersand2Token:
        return getTypeFacts(leftType) & TypeFacts.Truthy ? getUnionType([extractDefinitelyFalsyTypes(strictNullChecks ? leftType : getBaseTypeOfLiteralType(rightType)), rightType]) : leftType;
      case Syntax.Bar2Token:
        return getTypeFacts(leftType) & TypeFacts.Falsy ? getUnionType([removeDefinitelyFalsyTypes(leftType), rightType], UnionReduction.Subtype) : leftType;
      case Syntax.Question2Token:
        return getTypeFacts(leftType) & TypeFacts.EQUndefinedOrNull ? getUnionType([getNonNullableType(leftType), rightType], UnionReduction.Subtype) : leftType;
      case Syntax.EqualsToken:
        const declKind = is.kind(qc.BinaryExpression, left.parent) ? getAssignmentDeclarationKind(left.parent) : AssignmentDeclarationKind.None;
        checkAssignmentDeclaration(declKind, rightType);
        if (isAssignmentDeclaration(declKind)) {
          if (
            !(rightType.flags & qt.TypeFlags.Object) ||
            (declKind !== AssignmentDeclarationKind.ModuleExports &&
              declKind !== AssignmentDeclarationKind.Prototype &&
              !isEmptyObjectType(rightType) &&
              !isFunctionObjectType(rightType as ObjectType) &&
              !(getObjectFlags(rightType) & ObjectFlags.Class))
          ) {
            checkAssignmentOperator(rightType);
          }
          return leftType;
        } else {
          checkAssignmentOperator(rightType);
          return getRegularTypeOfObjectLiteral(rightType);
        }
      case Syntax.CommaToken:
        if (!compilerOptions.allowUnreachableCode && isSideEffectFree(left) && !isEvalNode(right)) error(left, qd.Left_side_of_comma_operator_is_unused_and_has_no_side_effects);
        return rightType;
      default:
        return fail();
    }
    function bothAreBigIntLike(left: Type, right: Type): boolean {
      return isTypeAssignableToKind(left, qt.TypeFlags.BigIntLike) && isTypeAssignableToKind(right, qt.TypeFlags.BigIntLike);
    }
    function checkAssignmentDeclaration(kind: AssignmentDeclarationKind, rightType: Type) {
      if (kind === AssignmentDeclarationKind.ModuleExports) {
        for (const prop of getPropertiesOfObjectType(rightType)) {
          const propType = getTypeOfSymbol(prop);
          if (propType.symbol && propType.symbol.flags & qt.SymbolFlags.Class) {
            const name = prop.escName;
            const symbol = resolveName(prop.valueDeclaration, name, qt.SymbolFlags.Type, undefined, name, false);
            if (symbol && symbol.declarations.some(isDocTypedefTag)) {
              addDuplicateDeclarationErrorsForSymbols(symbol, qd.Duplicate_identifier_0, qy.get.unescUnderscores(name), prop);
              addDuplicateDeclarationErrorsForSymbols(prop, qd.Duplicate_identifier_0, qy.get.unescUnderscores(name), symbol);
            }
          }
        }
      }
    }
    function isEvalNode(node: Expression) {
      return node.kind === Syntax.Identifier && (node as Identifier).escapedText === 'eval';
    }
    function checkForDisallowedESSymbolOperand(operator: Syntax): boolean {
      const offendingSymbolOperand = maybeTypeOfKind(leftType, qt.TypeFlags.ESSymbolLike) ? left : maybeTypeOfKind(rightType, qt.TypeFlags.ESSymbolLike) ? right : undefined;
      if (offendingSymbolOperand) {
        error(offendingSymbolOperand, qd.The_0_operator_cannot_be_applied_to_type_symbol, Token.toString(operator));
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
    function checkAssignmentOperator(valueType: Type): void {
      if (produceDiagnostics && qy.is.assignmentOperator(operator)) {
        if (
          checkReferenceExpression(
            left,
            qd.The_left_hand_side_of_an_assignment_expression_must_be_a_variable_or_a_property_access,
            qd.The_left_hand_side_of_an_assignment_expression_may_not_be_an_optional_property_access
          ) &&
          (!is.kind(qc.Identifier, left) || qy.get.unescUnderscores(left.escapedText) !== 'exports')
        ) {
          checkTypeAssignableToAndOptionallyElaborate(valueType, leftType, left, right);
        }
      }
    }
    function isAssignmentDeclaration(kind: AssignmentDeclarationKind) {
      switch (kind) {
        case AssignmentDeclarationKind.ModuleExports:
          return true;
        case AssignmentDeclarationKind.ExportsProperty:
        case AssignmentDeclarationKind.Property:
        case AssignmentDeclarationKind.Prototype:
        case AssignmentDeclarationKind.PrototypeProperty:
        case AssignmentDeclarationKind.ThisProperty:
          const symbol = getSymbolOfNode(left);
          const init = getAssignedExpandoIniter(right);
          return init && is.kind(qc.ObjectLiteralExpression, init) && symbol && qb.hasEntries(symbol.exports);
        default:
          return false;
      }
    }
    function reportOperatorErrorUnless(typesAreCompatible: (left: Type, right: Type) => boolean): boolean {
      if (!typesAreCompatible(leftType, rightType)) {
        reportOperatorError(typesAreCompatible);
        return true;
      }
      return false;
    }
    function reportOperatorError(isRelated?: (left: Type, right: Type) => boolean) {
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
        errorAndMaybeSuggestAwait(errNode, wouldWorkWithAwait, qd.Operator_0_cannot_be_applied_to_types_1_and_2, Token.toString(operatorToken.kind), leftStr, rightStr);
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
      if (typeName) return errorAndMaybeSuggestAwait(errNode, maybeMissingAwait, qd.This_condition_will_always_return_0_since_the_types_1_and_2_have_no_overlap, typeName, leftStr, rightStr);
      return;
    }
  }
  checkYieldExpression(node: YieldExpression): Type {
    if (produceDiagnostics) {
      if (!(node.flags & NodeFlags.YieldContext)) grammarErrorOnFirstToken(node, qd.A_yield_expression_is_only_allowed_in_a_generator_body);
      if (isInParameterIniterBeforeContainingFunction(node)) error(node, qd.yield_expressions_cannot_be_used_in_a_parameter_initer);
    }
    const func = get.containingFunction(node);
    if (!func) return anyType;
    const functionFlags = getFunctionFlags(func);
    if (!(functionFlags & FunctionFlags.Generator)) return anyType;
    const isAsync = (functionFlags & FunctionFlags.Async) !== 0;
    if (node.asteriskToken) {
      if (isAsync && languageVersion < ScriptTarget.ESNext) checkExternalEmitHelpers(node, ExternalEmitHelpers.AsyncDelegatorIncludes);
    }
    const returnType = getReturnTypeFromAnnotation(func);
    const iterationTypes = returnType && getIterationTypesOfGeneratorFunctionReturnType(returnType, isAsync);
    const signatureYieldType = (iterationTypes && iterationTypes.yieldType) || anyType;
    const signatureNextType = (iterationTypes && iterationTypes.nextType) || anyType;
    const resolvedSignatureNextType = isAsync ? getAwaitedType(signatureNextType) || anyType : signatureNextType;
    const yieldExpressionType = node.expression ? checkExpression(node.expression) : undefinedWideningType;
    const yieldedType = getYieldedTypeOfYieldExpression(node, yieldExpressionType, resolvedSignatureNextType, isAsync);
    if (returnType && yieldedType) checkTypeAssignableToAndOptionallyElaborate(yieldedType, signatureYieldType, node.expression || node, node.expression);
    if (node.asteriskToken) {
      const use = isAsync ? IterationUse.AsyncYieldStar : IterationUse.YieldStar;
      return getIterationTypeOfIterable(use, IterationTypeKind.Return, yieldExpressionType, node.expression) || anyType;
    } else if (returnType) {
      return getIterationTypeOfGeneratorFunctionReturnType(IterationTypeKind.Next, returnType, isAsync) || anyType;
    }
    return getContextualIterationType(IterationTypeKind.Next, func) || anyType;
  }
  checkConditionalExpression(node: ConditionalExpression, checkMode?: CheckMode): Type {
    const type = checkTruthinessExpression(node.condition);
    checkTestingKnownTruthyCallableType(node.condition, node.whenTrue, type);
    const type1 = checkExpression(node.whenTrue, checkMode);
    const type2 = checkExpression(node.whenFalse, checkMode);
    return getUnionType([type1, type2], UnionReduction.Subtype);
  }
  checkTemplateExpression(node: TemplateExpression): Type {
    forEach(node.templateSpans, (templateSpan) => {
      if (maybeTypeOfKind(checkExpression(templateSpan.expression), qt.TypeFlags.ESSymbolLike))
        error(templateSpan.expression, qd.Implicit_conversion_of_a_symbol_to_a_string_will_fail_at_runtime_Consider_wrapping_this_expression_in_String);
    });
    return stringType;
  }
  checkExpressionWithContextualType(node: Expression, contextualType: Type, inferenceContext: InferenceContext | undefined, checkMode: CheckMode): Type {
    const context = getContextNode(node);
    const saveContextualType = context.contextualType;
    const saveInferenceContext = context.inferenceContext;
    try {
      context.contextualType = contextualType;
      context.inferenceContext = inferenceContext;
      const type = checkExpression(node, checkMode | CheckMode.Contextual | (inferenceContext ? CheckMode.Inferential : 0));
      const result = maybeTypeOfKind(type, qt.TypeFlags.Literal) && isLiteralOfContextualType(type, instantiateContextualType(contextualType, node)) ? getRegularTypeOfLiteralType(type) : type;
      return result;
    } finally {
      context.contextualType = saveContextualType;
      context.inferenceContext = saveInferenceContext;
    }
  }
  checkExpressionCached(node: Expression | QualifiedName, checkMode?: CheckMode): Type {
    const links = getNodeLinks(node);
    if (!links.resolvedType) {
      if (checkMode && checkMode !== CheckMode.Normal) return checkExpression(node, checkMode);
      const saveFlowLoopStart = flowLoopStart;
      const saveFlowTypeCache = flowTypeCache;
      flowLoopStart = flowLoopCount;
      flowTypeCache = undefined;
      links.resolvedType = checkExpression(node, checkMode);
      flowTypeCache = saveFlowTypeCache;
      flowLoopStart = saveFlowLoopStart;
    }
    return links.resolvedType;
  }
  checkDeclarationIniter(declaration: HasExpressionIniter, contextualType?: Type | undefined) {
    const initer = getEffectiveIniter(declaration)!;
    const type = getQuickTypeOfExpression(initer) || (contextualType ? checkExpressionWithContextualType(initer, contextualType, undefined, CheckMode.Normal) : checkExpressionCached(initer));
    return is.kind(qc.ParameterDeclaration, declaration) &&
      declaration.name.kind === Syntax.ArrayBindingPattern &&
      isTupleType(type) &&
      !type.target.hasRestElement &&
      getTypeReferenceArity(type) < declaration.name.elements.length
      ? padTupleType(type, declaration.name)
      : type;
  }
  checkExpressionForMutableLocation(node: Expression, checkMode: CheckMode | undefined, contextualType?: Type, forceTuple?: boolean): Type {
    const type = checkExpression(node, checkMode, forceTuple);
    return isConstContext(node)
      ? getRegularTypeOfLiteralType(type)
      : is.kind(qc.TypeAssertion, node)
      ? type
      : getWidenedLiteralLikeTypeForContextualType(type, instantiateContextualType(arguments.length === 2 ? getContextualType(node) : contextualType, node));
  }
  checkPropertyAssignment(node: PropertyAssignment, checkMode?: CheckMode): Type {
    if (node.name.kind === Syntax.ComputedPropertyName) checkComputedPropertyName(node.name);
    return checkExpressionForMutableLocation(node.initer, checkMode);
  }
  checkObjectLiteralMethod(node: MethodDeclaration, checkMode?: CheckMode): Type {
    checkGrammarMethod(node);
    if (node.name.kind === Syntax.ComputedPropertyName) checkComputedPropertyName(node.name);
    const uninstantiatedType = checkFunctionExpressionOrObjectLiteralMethod(node, checkMode);
    return instantiateTypeWithSingleGenericCallSignature(node, uninstantiatedType, checkMode);
  }
  checkExpression(node: Expression | QualifiedName, checkMode?: CheckMode, forceTuple?: boolean): Type {
    const saveCurrentNode = currentNode;
    currentNode = node;
    instantiationCount = 0;
    const uninstantiatedType = checkExpressionWorker(node, checkMode, forceTuple);
    const type = instantiateTypeWithSingleGenericCallSignature(node, uninstantiatedType, checkMode);
    if (isConstEnumObjectType(type)) checkConstEnumAccess(node, type);
    currentNode = saveCurrentNode;
    return type;
  }
  checkConstEnumAccess(node: Expression | QualifiedName, type: Type) {
    const ok =
      (node.parent.kind === Syntax.PropertyAccessExpression && (<PropertyAccessExpression>node.parent).expression === node) ||
      (node.parent.kind === Syntax.ElementAccessExpression && (<ElementAccessExpression>node.parent).expression === node) ||
      ((node.kind === Syntax.Identifier || node.kind === Syntax.QualifiedName) && isInRightSideOfImportOrExportAssignment(<Identifier>node)) ||
      (node.parent.kind === Syntax.TypeQuery && (<TypeQueryNode>node.parent).exprName === node) ||
      node.parent.kind === Syntax.ExportSpecifier;
    if (!ok) error(node, qd.const_enums_can_only_be_used_in_property_or_index_access_expressions_or_the_right_hand_side_of_an_import_declaration_or_export_assignment_or_type_query);
    if (compilerOptions.isolatedModules) {
      assert(!!(type.symbol.flags & qt.SymbolFlags.ConstEnum));
      const constEnumDeclaration = type.symbol.valueDeclaration as EnumDeclaration;
      if (constEnumDeclaration.flags & NodeFlags.Ambient) error(node, qd.Cannot_access_ambient_const_enums_when_the_isolatedModules_flag_is_provided);
    }
  }
  checkParenthesizedExpression(node: ParenthesizedExpression, checkMode?: CheckMode): Type {
    const tag = is.inJSFile(node) ? qc.getDoc.typeTag(node) : undefined;
    if (tag) return checkAssertionWorker(tag, tag.typeExpression.type, node.expression, checkMode);
    return checkExpression(node.expression, checkMode);
  }
  checkExpressionWorker(node: Expression | QualifiedName, checkMode: CheckMode | undefined, forceTuple?: boolean): Type {
    const kind = node.kind;
    if (cancellationToken) {
      switch (kind) {
        case Syntax.ClassExpression:
        case Syntax.FunctionExpression:
        case Syntax.ArrowFunction:
          cancellationToken.throwIfCancellationRequested();
      }
    }
    switch (kind) {
      case Syntax.Identifier:
        return checkIdentifier(<Identifier>node);
      case Syntax.ThisKeyword:
        return checkThisNodeExpression(node);
      case Syntax.SuperKeyword:
        return checkSuperExpression(node);
      case Syntax.NullKeyword:
        return nullWideningType;
      case Syntax.NoSubstitutionLiteral:
      case Syntax.StringLiteral:
        return getFreshTypeOfLiteralType(getLiteralType((node as StringLiteralLike).text));
      case Syntax.NumericLiteral:
        checkGrammarNumericLiteral(node as NumericLiteral);
        return getFreshTypeOfLiteralType(getLiteralType(+(node as NumericLiteral).text));
      case Syntax.BigIntLiteral:
        checkGrammarBigIntLiteral(node as BigIntLiteral);
        return getFreshTypeOfLiteralType(getBigIntLiteralType(node as BigIntLiteral));
      case Syntax.TrueKeyword:
        return trueType;
      case Syntax.FalseKeyword:
        return falseType;
      case Syntax.TemplateExpression:
        return checkTemplateExpression(<TemplateExpression>node);
      case Syntax.RegexLiteral:
        return globalRegExpType;
      case Syntax.ArrayLiteralExpression:
        return checkArrayLiteral(<ArrayLiteralExpression>node, checkMode, forceTuple);
      case Syntax.ObjectLiteralExpression:
        return checkObjectLiteral(<ObjectLiteralExpression>node, checkMode);
      case Syntax.PropertyAccessExpression:
        return checkPropertyAccessExpression(<PropertyAccessExpression>node);
      case Syntax.QualifiedName:
        return checkQualifiedName(<QualifiedName>node);
      case Syntax.ElementAccessExpression:
        return checkIndexedAccess(<ElementAccessExpression>node);
      case Syntax.CallExpression:
        if ((<CallExpression>node).expression.kind === Syntax.ImportKeyword) return checkImportCallExpression(<ImportCall>node);
      case Syntax.NewExpression:
        return checkCallExpression(<CallExpression>node, checkMode);
      case Syntax.TaggedTemplateExpression:
        return checkTaggedTemplateExpression(<TaggedTemplateExpression>node);
      case Syntax.ParenthesizedExpression:
        return checkParenthesizedExpression(<ParenthesizedExpression>node, checkMode);
      case Syntax.ClassExpression:
        return checkClassExpression(<ClassExpression>node);
      case Syntax.FunctionExpression:
      case Syntax.ArrowFunction:
        return checkFunctionExpressionOrObjectLiteralMethod(<FunctionExpression | ArrowFunction>node, checkMode);
      case Syntax.TypeOfExpression:
        return checkTypeOfExpression(<TypeOfExpression>node);
      case Syntax.TypeAssertionExpression:
      case Syntax.AsExpression:
        return checkAssertion(<AssertionExpression>node);
      case Syntax.NonNullExpression:
        return checkNonNullAssertion(<NonNullExpression>node);
      case Syntax.MetaProperty:
        return checkMetaProperty(<MetaProperty>node);
      case Syntax.DeleteExpression:
        return checkDeleteExpression(<DeleteExpression>node);
      case Syntax.VoidExpression:
        return checkVoidExpression(<VoidExpression>node);
      case Syntax.AwaitExpression:
        return checkAwaitExpression(<AwaitExpression>node);
      case Syntax.PrefixUnaryExpression:
        return checkPrefixUnaryExpression(<PrefixUnaryExpression>node);
      case Syntax.PostfixUnaryExpression:
        return checkPostfixUnaryExpression(<PostfixUnaryExpression>node);
      case Syntax.BinaryExpression:
        return checkBinaryExpression(<BinaryExpression>node, checkMode);
      case Syntax.ConditionalExpression:
        return checkConditionalExpression(<ConditionalExpression>node, checkMode);
      case Syntax.SpreadElement:
        return checkSpreadExpression(<SpreadElement>node, checkMode);
      case Syntax.OmittedExpression:
        return undefinedWideningType;
      case Syntax.YieldExpression:
        return checkYieldExpression(<YieldExpression>node);
      case Syntax.SyntheticExpression:
        return (<SyntheticExpression>node).type;
      case Syntax.JsxExpression:
        return checkJsxExpression(<JsxExpression>node, checkMode);
      case Syntax.JsxElement:
        return checkJsxElement(<JsxElement>node, checkMode);
      case Syntax.JsxSelfClosingElement:
        return checkJsxSelfClosingElement(<JsxSelfClosingElement>node, checkMode);
      case Syntax.JsxFragment:
        return checkJsxFragment(<JsxFragment>node);
      case Syntax.JsxAttributes:
        return checkJsxAttributes(<JsxAttributes>node, checkMode);
      case Syntax.JsxOpeningElement:
        fail("Shouldn't ever directly check a JsxOpeningElement");
    }
    return errorType;
  }
  checkTypeParameter(node: TypeParameterDeclaration) {
    if (node.expression) grammarErrorOnFirstToken(node.expression, qd.Type_expected);
    checkSourceElement(node.constraint);
    checkSourceElement(node.default);
    const typeParameter = getDeclaredTypeOfTypeParameter(getSymbolOfNode(node));
    getBaseConstraintOfType(typeParameter);
    if (!hasNonCircularTypeParameterDefault(typeParameter)) error(node.default, qd.Type_parameter_0_has_a_circular_default, typeToString(typeParameter));
    const constraintType = getConstraintOfTypeParameter(typeParameter);
    const defaultType = getDefaultFromTypeParameter(typeParameter);
    if (constraintType && defaultType) {
      checkTypeAssignableTo(
        defaultType,
        getTypeWithThisArgument(instantiateType(constraintType, makeUnaryTypeMapper(typeParameter, defaultType)), defaultType),
        node.default,
        qd.Type_0_does_not_satisfy_the_constraint_1
      );
    }
    if (produceDiagnostics) checkTypeNameIsReserved(node.name, qd.Type_parameter_name_cannot_be_0);
  }
  checkParameter(node: ParameterDeclaration) {
    checkGrammarDecoratorsAndModifiers(node);
    checkVariableLikeDeclaration(node);
    const func = get.containingFunction(node)!;
    if (has.syntacticModifier(node, ModifierFlags.ParameterPropertyModifier)) {
      if (!(func.kind === Syntax.Constructor && is.present(func.body))) error(node, qd.A_parameter_property_is_only_allowed_in_a_constructor_implementation);
      if (func.kind === Syntax.Constructor && is.kind(qc.Identifier, node.name) && node.name.escapedText === 'constructor')
        error(node.name, qd.constructor_cannot_be_used_as_a_parameter_property_name);
    }
    if (node.questionToken && is.kind(qc.BindingPattern, node.name) && (func as FunctionLikeDeclaration).body)
      error(node, qd.A_binding_pattern_parameter_cannot_be_optional_in_an_implementation_signature);
    if (node.name && is.kind(qc.Identifier, node.name) && (node.name.escapedText === 'this' || node.name.escapedText === 'new')) {
      if (func.parameters.indexOf(node) !== 0) error(node, qd.A_0_parameter_must_be_the_first_parameter, node.name.escapedText as string);
      if (func.kind === Syntax.Constructor || func.kind === Syntax.ConstructSignature || func.kind === Syntax.ConstructorType) error(node, qd.A_constructor_cannot_have_a_this_parameter);
      if (func.kind === Syntax.ArrowFunction) error(node, qd.An_arrow_function_cannot_have_a_this_parameter);
      if (func.kind === Syntax.GetAccessor || func.kind === Syntax.SetAccessor) error(node, qd.get_and_set_accessors_cannot_declare_this_parameters);
    }
    if (node.dot3Token && !is.kind(qc.BindingPattern, node.name) && !isTypeAssignableTo(getReducedType(getTypeOfSymbol(node.symbol)), anyReadonlyArrayType))
      error(node, qd.A_rest_parameter_must_be_of_an_array_type);
  }
  checkTypePredicate(node: TypePredicateNode): void {
    const parent = getTypePredicateParent(node);
    if (!parent) {
      error(node, qd.A_type_predicate_is_only_allowed_in_return_type_position_for_functions_and_methods);
      return;
    }
    const signature = getSignatureFromDeclaration(parent);
    const typePredicate = getTypePredicateOfSignature(signature);
    if (!typePredicate) return;
    checkSourceElement(node.type);
    const { parameterName } = node;
    if (typePredicate.kind === TypePredicateKind.This || typePredicate.kind === TypePredicateKind.AssertsThis) getTypeFromThisNodeTypeNode(parameterName as ThisTypeNode);
    else {
      if (typePredicate.parameterIndex >= 0) {
        if (signatureHasRestParameter(signature) && typePredicate.parameterIndex === signature.parameters.length - 1) error(parameterName, qd.A_type_predicate_cannot_reference_a_rest_parameter);
        else {
          if (typePredicate.type) {
            const leadingError = () => chainqd.Messages(undefined, qd.A_type_predicate_s_type_must_be_assignable_to_its_parameter_s_type);
            checkTypeAssignableTo(typePredicate.type, getTypeOfSymbol(signature.parameters[typePredicate.parameterIndex]), node.type, undefined, leadingError);
          }
        }
      } else if (parameterName) {
        let hasReportedError = false;
        for (const { name } of parent.parameters) {
          if (is.kind(qc.BindingPattern, name) && checkIfTypePredicateVariableIsDeclaredInBindingPattern(name, parameterName, typePredicate.parameterName)) {
            hasReportedError = true;
            break;
          }
        }
        if (!hasReportedError) error(node.parameterName, qd.Cannot_find_parameter_0, typePredicate.parameterName);
      }
    }
  }
  checkIfTypePredicateVariableIsDeclaredInBindingPattern(pattern: BindingPattern, predicateVariableNode: Node, predicateVariableName: string) {
    for (const element of pattern.elements) {
      if (is.kind(qc.OmittedExpression, element)) continue;
      const name = element.name;
      if (name.kind === Syntax.Identifier && name.escapedText === predicateVariableName) {
        error(predicateVariableNode, qd.A_type_predicate_cannot_reference_element_0_in_a_binding_pattern, predicateVariableName);
        return true;
      } else if (name.kind === Syntax.ArrayBindingPattern || name.kind === Syntax.ObjectBindingPattern) {
        if (checkIfTypePredicateVariableIsDeclaredInBindingPattern(name, predicateVariableNode, predicateVariableName)) return true;
      }
    }
  }
  checkSignatureDeclaration(node: SignatureDeclaration) {
    if (node.kind === Syntax.IndexSignature) checkGrammarIndexSignature(<SignatureDeclaration>node);
    else if (
      node.kind === Syntax.FunctionType ||
      node.kind === Syntax.FunctionDeclaration ||
      node.kind === Syntax.ConstructorType ||
      node.kind === Syntax.CallSignature ||
      node.kind === Syntax.Constructor ||
      node.kind === Syntax.ConstructSignature
    ) {
      checkGrammarFunctionLikeDeclaration(<FunctionLikeDeclaration>node);
    }
    const functionFlags = getFunctionFlags(<FunctionLikeDeclaration>node);
    if (!(functionFlags & FunctionFlags.Invalid)) {
      if ((functionFlags & FunctionFlags.AsyncGenerator) === FunctionFlags.AsyncGenerator && languageVersion < ScriptTarget.ESNext)
        checkExternalEmitHelpers(node, ExternalEmitHelpers.AsyncGeneratorIncludes);
    }
    checkTypeParameters(node.typeParameters);
    forEach(node.parameters, checkParameter);
    if (node.type) checkSourceElement(node.type);
    if (produceDiagnostics) {
      checkCollisionWithArgumentsInGeneratedCode(node);
      const returnTypeNode = getEffectiveReturnTypeNode(node);
      if (noImplicitAny && !returnTypeNode) {
        switch (node.kind) {
          case Syntax.ConstructSignature:
            error(node, qd.Construct_signature_which_lacks_return_type_annotation_implicitly_has_an_any_return_type);
            break;
          case Syntax.CallSignature:
            error(node, qd.Call_signature_which_lacks_return_type_annotation_implicitly_has_an_any_return_type);
            break;
        }
      }
      if (returnTypeNode) {
        const functionFlags = getFunctionFlags(<FunctionDeclaration>node);
        if ((functionFlags & (FunctionFlags.Invalid | FunctionFlags.Generator)) === FunctionFlags.Generator) {
          const returnType = getTypeFromTypeNode(returnTypeNode);
          if (returnType === voidType) error(returnTypeNode, qd.A_generator_cannot_have_a_void_type_annotation);
          else {
            const generatorYieldType = getIterationTypeOfGeneratorFunctionReturnType(IterationTypeKind.Yield, returnType, (functionFlags & FunctionFlags.Async) !== 0) || anyType;
            const generatorReturnType = getIterationTypeOfGeneratorFunctionReturnType(IterationTypeKind.Return, returnType, (functionFlags & FunctionFlags.Async) !== 0) || generatorYieldType;
            const generatorNextType = getIterationTypeOfGeneratorFunctionReturnType(IterationTypeKind.Next, returnType, (functionFlags & FunctionFlags.Async) !== 0) || unknownType;
            const generatorInstantiation = createGeneratorReturnType(generatorYieldType, generatorReturnType, generatorNextType, !!(functionFlags & FunctionFlags.Async));
            checkTypeAssignableTo(generatorInstantiation, returnType, returnTypeNode);
          }
        } else if ((functionFlags & FunctionFlags.AsyncGenerator) === FunctionFlags.Async) {
          checkAsyncFunctionReturnType(<FunctionLikeDeclaration>node, returnTypeNode);
        }
      }
      if (node.kind !== Syntax.IndexSignature && node.kind !== Syntax.DocFunctionType) registerForUnusedIdentifiersCheck(node);
    }
  }
  checkClassForDuplicateDeclarations(node: ClassLikeDeclaration) {
    const instanceNames = qb.createEscapedMap<DeclarationMeaning>();
    const staticNames = qb.createEscapedMap<DeclarationMeaning>();
    const privateIdentifiers = qb.createEscapedMap<DeclarationMeaning>();
    for (const member of node.members) {
      if (member.kind === Syntax.Constructor) {
        for (const param of (member as ConstructorDeclaration).parameters) {
          if (is.parameterPropertyDeclaration(param, member) && !is.kind(qc.BindingPattern, param.name))
            addName(instanceNames, param.name, param.name.escapedText, DeclarationMeaning.GetOrSetAccessor);
        }
      } else {
        const isStatic = has.syntacticModifier(member, ModifierFlags.Static);
        const name = member.name;
        if (!name) return;
        const names = is.kind(qc.PrivateIdentifier, name) ? privateIdentifiers : isStatic ? staticNames : instanceNames;
        const memberName = name && getPropertyNameForPropertyNameNode(name);
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
    function addName(names: EscapedMap<DeclarationMeaning>, location: Node, name: qb.__String, meaning: DeclarationMeaning) {
      const prev = names.get(name);
      if (prev) {
        if (prev & DeclarationMeaning.Method) {
          if (meaning !== DeclarationMeaning.Method) error(location, qd.Duplicate_identifier_0, get.textOf(location));
        } else if (prev & meaning) {
          error(location, qd.Duplicate_identifier_0, get.textOf(location));
        } else {
          names.set(name, prev | meaning);
        }
      } else {
        names.set(name, meaning);
      }
    }
  }
  checkClassForStaticPropertyNameConflicts(node: ClassLikeDeclaration) {
    for (const member of node.members) {
      const memberNameNode = member.name;
      const isStatic = has.syntacticModifier(member, ModifierFlags.Static);
      if (isStatic && memberNameNode) {
        const memberName = getPropertyNameForPropertyNameNode(memberNameNode);
        switch (memberName) {
          case 'name':
          case 'length':
          case 'caller':
          case 'arguments':
          case 'prototype':
            const message = qd.Static_property_0_conflicts_with_built_in_property_Function_0_of_constructor_function_1;
            const className = getNameOfSymbolAsWritten(getSymbolOfNode(node));
            error(memberNameNode, message, memberName, className);
            break;
        }
      }
    }
  }
  checkObjectTypeForDuplicateDeclarations(node: TypeLiteralNode | InterfaceDeclaration) {
    const names = new qb.QMap<boolean>();
    for (const member of node.members) {
      if (member.kind === Syntax.PropertySignature) {
        let memberName: string;
        const name = member.name!;
        switch (name.kind) {
          case Syntax.StringLiteral:
          case Syntax.NumericLiteral:
            memberName = name.text;
            break;
          case Syntax.Identifier:
            memberName = idText(name);
            break;
          default:
            continue;
        }
        if (names.get(memberName)) {
          error(get.nameOfDeclaration(member.symbol.valueDeclaration), qd.Duplicate_identifier_0, memberName);
          error(member.name, qd.Duplicate_identifier_0, memberName);
        } else {
          names.set(memberName, true);
        }
      }
    }
  }
  checkTypeForDuplicateIndexSignatures(node: Node) {
    if (node.kind === Syntax.InterfaceDeclaration) {
      const nodeSymbol = getSymbolOfNode(node as InterfaceDeclaration);
      if (nodeSymbol.declarations.length > 0 && nodeSymbol.declarations[0] !== node) return;
    }
    const indexSymbol = getIndexSymbol(getSymbolOfNode(node)!);
    if (indexSymbol) {
      let seenNumericIndexer = false;
      let seenStringIndexer = false;
      for (const decl of indexSymbol.declarations) {
        const declaration = <SignatureDeclaration>decl;
        if (declaration.parameters.length === 1 && declaration.parameters[0].type) {
          switch (declaration.parameters[0].type.kind) {
            case Syntax.StringKeyword:
              if (!seenStringIndexer) seenStringIndexer = true;
              else {
                error(declaration, qd.Duplicate_string_index_signature);
              }
              break;
            case Syntax.NumberKeyword:
              if (!seenNumericIndexer) seenNumericIndexer = true;
              else {
                error(declaration, qd.Duplicate_number_index_signature);
              }
              break;
          }
        }
      }
    }
  }
  checkPropertyDeclaration(node: PropertyDeclaration | PropertySignature) {
    if (!checkGrammarDecoratorsAndModifiers(node) && !checkGrammarProperty(node)) checkGrammarComputedPropertyName(node.name);
    checkVariableLikeDeclaration(node);
    if (is.kind(qc.PrivateIdentifier, node.name) && languageVersion < ScriptTarget.ESNext) {
      for (let lexicalScope = get.enclosingBlockScopeContainer(node); !!lexicalScope; lexicalScope = get.enclosingBlockScopeContainer(lexicalScope)) {
        getNodeLinks(lexicalScope).flags |= NodeCheckFlags.ContainsClassWithPrivateIdentifiers;
      }
    }
  }
  checkPropertySignature(node: PropertySignature) {
    if (is.kind(qc.PrivateIdentifier, node.name)) error(node, qd.Private_identifiers_are_not_allowed_outside_class_bodies);
    return checkPropertyDeclaration(node);
  }
  checkMethodDeclaration(node: MethodDeclaration | MethodSignature) {
    if (!checkGrammarMethod(node)) checkGrammarComputedPropertyName(node.name);
    if (is.kind(qc.PrivateIdentifier, node.name)) error(node, qd.A_method_cannot_be_named_with_a_private_identifier);
    checkFunctionOrMethodDeclaration(node);
    if (has.syntacticModifier(node, ModifierFlags.Abstract) && node.kind === Syntax.MethodDeclaration && node.body)
      error(node, qd.Method_0_cannot_have_an_implementation_because_it_is_marked_abstract, declarationNameToString(node.name));
  }
  checkConstructorDeclaration(node: ConstructorDeclaration) {
    checkSignatureDeclaration(node);
    if (!checkGrammarConstructorTypeParameters(node)) checkGrammarConstructorTypeAnnotation(node);
    checkSourceElement(node.body);
    const symbol = getSymbolOfNode(node);
    const firstDeclaration = getDeclarationOfKind(symbol, node.kind);
    if (node === firstDeclaration) checkFunctionOrConstructorSymbol(symbol);
    if (is.missing(node.body)) return;
    if (!produceDiagnostics) return;
    function isInstancePropertyWithIniterOrPrivateIdentifierProperty(n: Node) {
      if (n.is.privateIdentifierPropertyDeclaration()) return true;
      return n.kind === Syntax.PropertyDeclaration && !has.syntacticModifier(n, ModifierFlags.Static) && !!(<PropertyDeclaration>n).initer;
    }
    const containingClassDecl = <ClassDeclaration>node.parent;
    if (getClassExtendsHeritageElement(containingClassDecl)) {
      captureLexicalThis(node.parent, containingClassDecl);
      const classExtendsNull = classDeclarationExtendsNull(containingClassDecl);
      const superCall = findFirstSuperCall(node.body!);
      if (superCall) {
        if (classExtendsNull) error(superCall, qd.A_constructor_cannot_contain_a_super_call_when_its_class_extends_null);
        const superCallShouldBeFirst =
          (compilerOptions.target !== ScriptTarget.ESNext || !compilerOptions.useDefineForClassFields) &&
          (some((<ClassDeclaration>node.parent).members, isInstancePropertyWithIniterOrPrivateIdentifierProperty) ||
            some(node.parameters, (p) => has.syntacticModifier(p, ModifierFlags.ParameterPropertyModifier)));
        if (superCallShouldBeFirst) {
          const statements = node.body!.statements;
          let superCallStatement: ExpressionStatement | undefined;
          for (const statement of statements) {
            if (statement.kind === Syntax.ExpressionStatement && is.superCall((<ExpressionStatement>statement).expression)) {
              superCallStatement = <ExpressionStatement>statement;
              break;
            }
            if (!is.prologueDirective(statement)) break;
          }
          if (!superCallStatement) error(node, qd.A_super_call_must_be_the_first_statement_in_the_constructor_when_a_class_contains_initialized_properties_parameter_properties_or_private_identifiers);
        }
      } else if (!classExtendsNull) {
        error(node, qd.Constructors_for_derived_classes_must_contain_a_super_call);
      }
    }
  }
  checkAccessorDeclaration(node: AccessorDeclaration) {
    if (produceDiagnostics) {
      if (!checkGrammarFunctionLikeDeclaration(node) && !checkGrammarAccessor(node)) checkGrammarComputedPropertyName(node.name);
      checkDecorators(node);
      checkSignatureDeclaration(node);
      if (node.kind === Syntax.GetAccessor) {
        if (!(node.flags & NodeFlags.Ambient) && is.present(node.body) && node.flags & NodeFlags.HasImplicitReturn) {
          if (!(node.flags & NodeFlags.HasExplicitReturn)) error(node.name, qd.A_get_accessor_must_return_a_value);
        }
      }
      if (node.name.kind === Syntax.ComputedPropertyName) checkComputedPropertyName(node.name);
      if (is.kind(qc.PrivateIdentifier, node.name)) error(node.name, qd.An_accessor_cannot_be_named_with_a_private_identifier);
      if (!hasNonBindableDynamicName(node)) {
        const otherKind = node.kind === Syntax.GetAccessor ? Syntax.SetAccessor : Syntax.GetAccessor;
        const otherAccessor = getDeclarationOfKind<AccessorDeclaration>(getSymbolOfNode(node), otherKind);
        if (otherAccessor) {
          const nodeFlags = get.effectiveModifierFlags(node);
          const otherFlags = get.effectiveModifierFlags(otherAccessor);
          if ((nodeFlags & ModifierFlags.AccessibilityModifier) !== (otherFlags & ModifierFlags.AccessibilityModifier)) error(node.name, qd.Getter_and_setter_accessors_do_not_agree_in_visibility);
          if ((nodeFlags & ModifierFlags.Abstract) !== (otherFlags & ModifierFlags.Abstract)) error(node.name, qd.Accessors_must_both_be_abstract_or_non_abstract);
          checkAccessorDeclarationTypesIdentical(node, otherAccessor, getAnnotatedAccessorType, qd.get_and_set_accessor_must_have_the_same_type);
          checkAccessorDeclarationTypesIdentical(node, otherAccessor, getThisTypeOfDeclaration, qd.get_and_set_accessor_must_have_the_same_this_type);
        }
      }
      const returnType = getTypeOfAccessors(getSymbolOfNode(node));
      if (node.kind === Syntax.GetAccessor) checkAllCodePathsInNonVoidFunctionReturnOrThrow(node, returnType);
    }
    checkSourceElement(node.body);
  }
  checkAccessorDeclarationTypesIdentical(first: AccessorDeclaration, second: AccessorDeclaration, getAnnotatedType: (a: AccessorDeclaration) => Type | undefined, message: qd.Message) {
    const firstType = getAnnotatedType(first);
    const secondType = getAnnotatedType(second);
    if (firstType && secondType && !isTypeIdenticalTo(firstType, secondType)) error(first, message);
  }
  checkMissingDeclaration(node: Node) {
    checkDecorators(node);
  }
  checkTypeArgumentConstraints(node: TypeReferenceNode | ExpressionWithTypeArguments, typeParameters: readonly TypeParameter[]): boolean {
    let typeArguments: Type[] | undefined;
    let mapper: TypeMapper | undefined;
    let result = true;
    for (let i = 0; i < typeParameters.length; i++) {
      const constraint = getConstraintOfTypeParameter(typeParameters[i]);
      if (constraint) {
        if (!typeArguments) {
          typeArguments = getEffectiveTypeArguments(node, typeParameters);
          mapper = createTypeMapper(typeParameters, typeArguments);
        }
        result = result && checkTypeAssignableTo(typeArguments[i], instantiateType(constraint, mapper), node.typeArguments![i], qd.Type_0_does_not_satisfy_the_constraint_1);
      }
    }
    return result;
  }
  checkTypeReferenceNode(node: TypeReferenceNode | ExpressionWithTypeArguments) {
    checkGrammarTypeArguments(node, node.typeArguments);
    if (node.kind === Syntax.TypeReference && node.typeName.jsdocDotPos !== undefined && !is.inJSFile(node) && !is.inDoc(node))
      grammarErrorAtPos(node, node.typeName.jsdocDotPos, 1, qd.Doc_types_can_only_be_used_inside_documentation_comments);
    forEach(node.typeArguments, checkSourceElement);
    const type = getTypeFromTypeReference(node);
    if (type !== errorType) {
      if (node.typeArguments && produceDiagnostics) {
        const typeParameters = getTypeParametersForTypeReference(node);
        if (typeParameters) checkTypeArgumentConstraints(node, typeParameters);
      }
      if (type.flags & qt.TypeFlags.Enum && getNodeLinks(node).resolvedSymbol!.flags & qt.SymbolFlags.EnumMember)
        error(node, qd.Enum_type_0_has_members_with_initers_that_are_not_literals, typeToString(type));
    }
  }
  checkTypeQuery(node: TypeQueryNode) {
    getTypeFromTypeQueryNode(node);
  }
  checkTypeLiteral(node: TypeLiteralNode) {
    forEach(node.members, checkSourceElement);
    if (produceDiagnostics) {
      const type = getTypeFromTypeLiteralOrFunctionOrConstructorTypeNode(node);
      checkIndexConstraints(type);
      checkTypeForDuplicateIndexSignatures(node);
      checkObjectTypeForDuplicateDeclarations(node);
    }
  }
  checkArrayType(node: ArrayTypeNode) {
    checkSourceElement(node.elementType);
  }
  checkTupleType(node: TupleTypeNode) {
    const elementTypes = node.elements;
    let seenOptionalElement = false;
    let seenNamedElement = false;
    for (let i = 0; i < elementTypes.length; i++) {
      const e = elementTypes[i];
      if (e.kind === Syntax.NamedTupleMember) seenNamedElement = true;
      else if (seenNamedElement) {
        grammarErrorOnNode(e, qd.Tuple_members_must_all_have_names_or_all_not_have_names);
        break;
      }
      if (isTupleRestElement(e)) {
        if (i !== elementTypes.length - 1) {
          grammarErrorOnNode(e, qd.A_rest_element_must_be_last_in_a_tuple_type);
          break;
        }
        if (!isArrayType(getTypeFromTypeNode((<RestTypeNode>e).type))) error(e, qd.A_rest_element_type_must_be_an_array_type);
      } else if (isTupleOptionalElement(e)) {
        seenOptionalElement = true;
      } else if (seenOptionalElement) {
        grammarErrorOnNode(e, qd.A_required_element_cannot_follow_an_optional_element);
        break;
      }
    }
    forEach(node.elements, checkSourceElement);
  }
  checkUnionOrIntersectionType(node: UnionOrIntersectionTypeNode) {
    forEach(node.types, checkSourceElement);
  }
  checkIndexedAccessIndexType(type: Type, accessNode: IndexedAccessTypeNode | ElementAccessExpression) {
    if (!(type.flags & qt.TypeFlags.IndexedAccess)) return type;
    const objectType = (<IndexedAccessType>type).objectType;
    const indexType = (<IndexedAccessType>type).indexType;
    if (isTypeAssignableTo(indexType, getIndexType(objectType, false))) {
      if (
        accessNode.kind === Syntax.ElementAccessExpression &&
        is.assignmentTarget(accessNode) &&
        getObjectFlags(objectType) & ObjectFlags.Mapped &&
        getMappedTypeModifiers(<MappedType>objectType) & MappedTypeModifiers.IncludeReadonly
      ) {
        error(accessNode, qd.Index_signature_in_type_0_only_permits_reading, typeToString(objectType));
      }
      return type;
    }
    const apparentObjectType = getApparentType(objectType);
    if (getIndexInfoOfType(apparentObjectType, IndexKind.Number) && isTypeAssignableToKind(indexType, qt.TypeFlags.NumberLike)) return type;
    if (isGenericObjectType(objectType)) {
      const propertyName = getPropertyNameFromIndex(indexType, accessNode);
      if (propertyName) {
        const propertySymbol = forEachType(apparentObjectType, (t) => getPropertyOfType(t, propertyName));
        if (propertySymbol && getDeclarationModifierFlagsFromSymbol(propertySymbol) & ModifierFlags.NonPublicAccessibilityModifier) {
          error(accessNode, qd.Private_or_protected_member_0_cannot_be_accessed_on_a_type_parameter, qy.get.unescUnderscores(propertyName));
          return errorType;
        }
      }
    }
    error(accessNode, qd.Type_0_cannot_be_used_to_index_type_1, typeToString(indexType), typeToString(objectType));
    return errorType;
  }
  checkIndexedAccessType(node: IndexedAccessTypeNode) {
    checkSourceElement(node.objectType);
    checkSourceElement(node.indexType);
    checkIndexedAccessIndexType(getTypeFromIndexedAccessTypeNode(node), node);
  }
  checkMappedType(node: MappedTypeNode) {
    checkSourceElement(node.typeParameter);
    checkSourceElement(node.type);
    if (!node.type) reportImplicitAny(node, anyType);
    const type = <MappedType>getTypeFromMappedTypeNode(node);
    const constraintType = getConstraintTypeFromMappedType(type);
    checkTypeAssignableTo(constraintType, keyofConstraintType, get.effectiveConstraintOfTypeParameter(node.typeParameter));
  }
  checkThisType(node: ThisTypeNode) {
    getTypeFromThisNodeTypeNode(node);
  }
  checkTypeOperator(node: TypeOperatorNode) {
    checkGrammarTypeOperatorNode(node);
    checkSourceElement(node.type);
  }
  checkConditionalType(node: ConditionalTypeNode) {
    qc.forEach.child(node, checkSourceElement);
  }
  checkInferType(node: InferTypeNode) {
    if (!qc.findAncestor(node, (n) => n.parent && n.parent.kind === Syntax.ConditionalType && (<ConditionalTypeNode>n.parent).extendsType === n))
      grammarErrorOnNode(node, qd.infer_declarations_are_only_permitted_in_the_extends_clause_of_a_conditional_type);
    checkSourceElement(node.typeParameter);
    registerForUnusedIdentifiersCheck(node);
  }
  checkImportType(node: ImportTypeNode) {
    checkSourceElement(node.argument);
    getTypeFromTypeNode(node);
  }
  checkNamedTupleMember(node: NamedTupleMember) {
    if (node.dot3Token && node.questionToken) grammarErrorOnNode(node, qd.A_tuple_member_cannot_be_both_optional_and_rest);
    if (node.type.kind === Syntax.OptionalType)
      grammarErrorOnNode(node.type, qd.A_labeled_tuple_element_is_declared_as_optional_with_a_question_mark_after_the_name_and_before_the_colon_rather_than_after_the_type);
    if (node.type.kind === Syntax.RestType) grammarErrorOnNode(node.type, qd.A_labeled_tuple_element_is_declared_as_rest_with_a_before_the_name_rather_than_before_the_type);
    checkSourceElement(node.type);
    getTypeFromTypeNode(node);
  }
  checkExportsOnMergedDeclarations(node: Declaration): void {
    if (!produceDiagnostics) return;
    let symbol = node.localSymbol;
    if (!symbol) {
      symbol = getSymbolOfNode(node)!;
      if (!symbol.exportSymbol) return;
    }
    if (getDeclarationOfKind(symbol, node.kind) !== node) return;
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
        const name = get.nameOfDeclaration(d);
        if (declarationSpaces & commonDeclarationSpacesForDefaultAndNonDefault)
          error(name, qd.Merged_declaration_0_cannot_include_a_default_export_declaration_Consider_adding_a_separate_export_default_0_declaration_instead, declarationNameToString(name));
        else if (declarationSpaces & commonDeclarationSpacesForExportsAndLocals) {
          error(name, qd.Individual_declarations_in_merged_declaration_0_must_be_all_exported_or_all_local, declarationNameToString(name));
        }
      }
    }
    function getDeclarationSpaces(decl: Declaration): DeclarationSpaces {
      let d = decl as Node;
      switch (d.kind) {
        case Syntax.InterfaceDeclaration:
        case Syntax.TypeAliasDeclaration:
        case Syntax.DocTypedefTag:
        case Syntax.DocCallbackTag:
        case Syntax.DocEnumTag:
          return DeclarationSpaces.ExportType;
        case Syntax.ModuleDeclaration:
          return is.ambientModule(d as ModuleDeclaration) || getModuleInstanceState(d as ModuleDeclaration) !== ModuleInstanceState.NonInstantiated
            ? DeclarationSpaces.ExportNamespace | DeclarationSpaces.ExportValue
            : DeclarationSpaces.ExportNamespace;
        case Syntax.ClassDeclaration:
        case Syntax.EnumDeclaration:
        case Syntax.EnumMember:
          return DeclarationSpaces.ExportType | DeclarationSpaces.ExportValue;
        case Syntax.SourceFile:
          return DeclarationSpaces.ExportType | DeclarationSpaces.ExportValue | DeclarationSpaces.ExportNamespace;
        case Syntax.ExportAssignment:
          if (!is.entityNameExpression((d as ExportAssignment).expression)) return DeclarationSpaces.ExportValue;
          d = (d as ExportAssignment).expression;
        case Syntax.ImportEqualsDeclaration:
        case Syntax.NamespaceImport:
        case Syntax.ImportClause:
          let result = DeclarationSpaces.None;
          const target = resolveAlias(getSymbolOfNode(d)!);
          forEach(target.declarations, (d) => {
            result |= getDeclarationSpaces(d);
          });
          return result;
        case Syntax.VariableDeclaration:
        case Syntax.BindingElement:
        case Syntax.FunctionDeclaration:
        case Syntax.ImportSpecifier:
        case Syntax.Identifier:
          return DeclarationSpaces.ExportValue;
        default:
          return Debug.failBadSyntax(d);
      }
    }
  }
  checkAwaitedType(type: Type, errorNode: Node, diagnosticMessage: qd.Message, arg0?: string | number): Type {
    const awaitedType = getAwaitedType(type, errorNode, diagnosticMessage, arg0);
    return awaitedType || errorType;
  }
  checkAsyncFunctionReturnType(node: FunctionLikeDeclaration | MethodSignature, returnTypeNode: TypeNode) {
    const returnType = getTypeFromTypeNode(returnTypeNode);
    if (returnType === errorType) return;
    const globalPromiseType = getGlobalPromiseType(true);
    if (globalPromiseType !== emptyGenericType && !isReferenceToType(returnType, globalPromiseType)) {
      error(returnTypeNode, qd.The_return_type_of_an_async_function_or_method_must_be_the_global_Promise_T_type_Did_you_mean_to_write_Promise_0, typeToString(getAwaitedType(returnType) || voidType));
      return;
    }
    checkAwaitedType(returnType, node, qd.The_return_type_of_an_async_function_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member);
  }
  checkDecorator(node: Decorator): void {
    const signature = getResolvedSignature(node);
    const returnType = getReturnTypeOfSignature(signature);
    if (returnType.flags & qt.TypeFlags.Any) return;
    let expectedReturnType: Type;
    const headMessage = getDiagnosticHeadMessageForDecoratorResolution(node);
    let errorInfo: qd.MessageChain | undefined;
    switch (node.parent.kind) {
      case Syntax.ClassDeclaration:
        const classSymbol = getSymbolOfNode(node.parent);
        const classConstructorType = getTypeOfSymbol(classSymbol);
        expectedReturnType = getUnionType([classConstructorType, voidType]);
        break;
      case Syntax.Parameter:
        expectedReturnType = voidType;
        errorInfo = chainqd.Messages(undefined, qd.The_return_type_of_a_parameter_decorator_function_must_be_either_void_or_any);
        break;
      case Syntax.PropertyDeclaration:
        expectedReturnType = voidType;
        errorInfo = chainqd.Messages(undefined, qd.The_return_type_of_a_property_decorator_function_must_be_either_void_or_any);
        break;
      case Syntax.MethodDeclaration:
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        const methodType = getTypeOfNode(node.parent);
        const descriptorType = createTypedPropertyDescriptorType(methodType);
        expectedReturnType = getUnionType([descriptorType, voidType]);
        break;
      default:
        return fail();
    }
    checkTypeAssignableTo(returnType, expectedReturnType, node, headMessage, () => errorInfo);
  }
  checkDecorators(node: Node): void {
    if (!node.decorators) return;
    if (!nodeCanBeDecorated(node, node.parent, node.parent.parent)) return;
    if (!compilerOptions.experimentalDecorators) {
      error(
        node,
        qd.Experimental_support_for_decorators_is_a_feature_that_is_subject_to_change_in_a_future_release_Set_the_experimentalDecorators_option_in_your_tsconfig_or_jsconfig_to_remove_this_warning
      );
    }
    const firstDecorator = node.decorators[0];
    checkExternalEmitHelpers(firstDecorator, ExternalEmitHelpers.Decorate);
    if (node.kind === Syntax.Parameter) checkExternalEmitHelpers(firstDecorator, ExternalEmitHelpers.Param);
    if (compilerOptions.emitDecoratorMetadata) {
      checkExternalEmitHelpers(firstDecorator, ExternalEmitHelpers.Metadata);
      switch (node.kind) {
        case Syntax.ClassDeclaration:
          const constructor = getFirstConstructorWithBody(<ClassDeclaration>node);
          if (constructor) {
            for (const parameter of constructor.parameters) {
              markDecoratorMedataDataTypeNodeAsReferenced(getParameterTypeNodeForDecoratorCheck(parameter));
            }
          }
          break;
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          const otherKind = node.kind === Syntax.GetAccessor ? Syntax.SetAccessor : Syntax.GetAccessor;
          const otherAccessor = getDeclarationOfKind<AccessorDeclaration>(getSymbolOfNode(node as AccessorDeclaration), otherKind);
          markDecoratorMedataDataTypeNodeAsReferenced(getAnnotatedAccessorTypeNode(node as AccessorDeclaration) || (otherAccessor && getAnnotatedAccessorTypeNode(otherAccessor)));
          break;
        case Syntax.MethodDeclaration:
          for (const parameter of (<FunctionLikeDeclaration>node).parameters) {
            markDecoratorMedataDataTypeNodeAsReferenced(getParameterTypeNodeForDecoratorCheck(parameter));
          }
          markDecoratorMedataDataTypeNodeAsReferenced(getEffectiveReturnTypeNode(<FunctionLikeDeclaration>node));
          break;
        case Syntax.PropertyDeclaration:
          markDecoratorMedataDataTypeNodeAsReferenced(get.effectiveTypeAnnotationNode(<ParameterDeclaration>node));
          break;
        case Syntax.Parameter:
          markDecoratorMedataDataTypeNodeAsReferenced(getParameterTypeNodeForDecoratorCheck(<ParameterDeclaration>node));
          const containingSignature = (node as ParameterDeclaration).parent;
          for (const parameter of containingSignature.parameters) {
            markDecoratorMedataDataTypeNodeAsReferenced(getParameterTypeNodeForDecoratorCheck(parameter));
          }
          break;
      }
    }
    forEach(node.decorators, checkDecorator);
  }
  checkFunctionDeclaration(node: FunctionDeclaration): void {
    if (produceDiagnostics) {
      checkFunctionOrMethodDeclaration(node);
      checkGrammarForGenerator(node);
      checkCollisionWithRequireExportsInGeneratedCode(node, node.name!);
      checkCollisionWithGlobalPromiseInGeneratedCode(node, node.name!);
    }
  }
  checkDocTypeAliasTag(node: DocTypedefTag | DocCallbackTag) {
    if (!node.typeExpression) error(node.name, qd.Doc_typedef_tag_should_either_have_a_type_annotation_or_be_followed_by_property_or_member_tags);
    if (node.name) checkTypeNameIsReserved(node.name, qd.Type_alias_name_cannot_be_0);
    checkSourceElement(node.typeExpression);
  }
  checkDocTemplateTag(node: DocTemplateTag): void {
    checkSourceElement(node.constraint);
    for (const tp of node.typeParameters) {
      checkSourceElement(tp);
    }
  }
  checkDocTypeTag(node: DocTypeTag) {
    checkSourceElement(node.typeExpression);
  }
  checkDocParameterTag(node: DocParameterTag) {
    checkSourceElement(node.typeExpression);
    if (!getParameterSymbolFromDoc(node)) {
      const decl = get.hostSignatureFromDoc(node);
      if (decl) {
        const i = qc.getDoc.tags(decl).filter(isDocParameterTag).indexOf(node);
        if (i > -1 && i < decl.parameters.length && is.kind(qc.BindingPattern, decl.parameters[i].name)) return;
        if (!containsArgumentsReference(decl)) {
          if (is.kind(qc.QualifiedName, node.name))
            error(node.name, qd.Qualified_name_0_is_not_allowed_without_a_leading_param_object_1, entityNameToString(node.name), entityNameToString(node.name.left));
          else {
            error(node.name, qd.Doc_param_tag_has_name_0_but_there_is_no_parameter_with_that_name, idText(node.name));
          }
        } else if (findLast(qc.getDoc.tags(decl), isDocParameterTag) === node && node.typeExpression && node.typeExpression.type && !isArrayType(getTypeFromTypeNode(node.typeExpression.type))) {
          error(
            node.name,
            qd.Doc_param_tag_has_name_0_but_there_is_no_parameter_with_that_name_It_would_match_arguments_if_it_had_an_array_type,
            idText(node.name.kind === Syntax.QualifiedName ? node.name.right : node.name)
          );
        }
      }
    }
  }
  checkDocPropertyTag(node: DocPropertyTag) {
    checkSourceElement(node.typeExpression);
  }
  checkDocFunctionType(node: DocFunctionType): void {
    if (produceDiagnostics && !node.type && !qc.isDoc.constructSignature(node)) reportImplicitAny(node, anyType);
    checkSignatureDeclaration(node);
  }
  checkDocImplementsTag(node: DocImplementsTag): void {
    const classLike = get.effectiveDocHost(node);
    if (!classLike || (!is.kind(qc.ClassDeclaration, classLike) && !is.kind(qc.ClassExpression, classLike))) error(classLike, qd.Doc_0_is_not_attached_to_a_class, idText(node.tagName));
  }
  checkDocAugmentsTag(node: DocAugmentsTag): void {
    const classLike = get.effectiveDocHost(node);
    if (!classLike || (!is.kind(qc.ClassDeclaration, classLike) && !is.kind(qc.ClassExpression, classLike))) {
      error(classLike, qd.Doc_0_is_not_attached_to_a_class, idText(node.tagName));
      return;
    }
    const augmentsTags = qc.getDoc.tags(classLike).filter(isDocAugmentsTag);
    assert(augmentsTags.length > 0);
    if (augmentsTags.length > 1) error(augmentsTags[1], qd.Class_declarations_cannot_have_more_than_one_augments_or_extends_tag);
    const name = getIdentifierFromEntityNameExpression(node.class.expression);
    const extend = getClassExtendsHeritageElement(classLike);
    if (extend) {
      const className = getIdentifierFromEntityNameExpression(extend.expression);
      if (className && name.escapedText !== className.escapedText) error(name, qd.Doc_0_1_does_not_match_the_extends_2_clause, idText(node.tagName), idText(name), idText(className));
    }
  }
  checkFunctionOrMethodDeclaration(node: FunctionDeclaration | MethodDeclaration | MethodSignature): void {
    checkDecorators(node);
    checkSignatureDeclaration(node);
    const functionFlags = getFunctionFlags(node);
    if (node.name && node.name.kind === Syntax.ComputedPropertyName) checkComputedPropertyName(node.name);
    if (!hasNonBindableDynamicName(node)) {
      const symbol = getSymbolOfNode(node);
      const localSymbol = node.localSymbol || symbol;
      const firstDeclaration = find(localSymbol.declarations, (declaration) => declaration.kind === node.kind && !(declaration.flags & NodeFlags.JavaScriptFile));
      if (node === firstDeclaration) checkFunctionOrConstructorSymbol(localSymbol);
      if (symbol.parent) {
        if (getDeclarationOfKind(symbol, node.kind) === node) checkFunctionOrConstructorSymbol(symbol);
      }
    }
    const body = node.kind === Syntax.MethodSignature ? undefined : node.body;
    checkSourceElement(body);
    checkAllCodePathsInNonVoidFunctionReturnOrThrow(node, getReturnTypeFromAnnotation(node));
    if (produceDiagnostics && !getEffectiveReturnTypeNode(node)) {
      if (is.missing(body) && !isPrivateWithinAmbient(node)) reportImplicitAny(node, anyType);
      if (functionFlags & FunctionFlags.Generator && is.present(body)) getReturnTypeOfSignature(getSignatureFromDeclaration(node));
    }
    if (is.inJSFile(node)) {
      const typeTag = qc.getDoc.typeTag(node);
      if (typeTag && typeTag.typeExpression && !getContextualCallSignature(getTypeFromTypeNode(typeTag.typeExpression), node))
        error(typeTag, qd.The_type_of_a_function_declaration_must_match_the_function_s_signature);
    }
  }
  checkUnusedIdentifiers(potentiallyUnusedIdentifiers: readonly PotentiallyUnusedIdentifier[], addDiagnostic: AddUnusedDiagnostic) {
    for (const node of potentiallyUnusedIdentifiers) {
      switch (node.kind) {
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
          checkUnusedClassMembers(node, addDiagnostic);
          checkUnusedTypeParameters(node, addDiagnostic);
          break;
        case Syntax.SourceFile:
        case Syntax.ModuleDeclaration:
        case Syntax.Block:
        case Syntax.CaseBlock:
        case Syntax.ForStatement:
        case Syntax.ForInStatement:
        case Syntax.ForOfStatement:
          checkUnusedLocalsAndParameters(node, addDiagnostic);
          break;
        case Syntax.Constructor:
        case Syntax.FunctionExpression:
        case Syntax.FunctionDeclaration:
        case Syntax.ArrowFunction:
        case Syntax.MethodDeclaration:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          if (node.body) checkUnusedLocalsAndParameters(node, addDiagnostic);
          checkUnusedTypeParameters(node, addDiagnostic);
          break;
        case Syntax.MethodSignature:
        case Syntax.CallSignature:
        case Syntax.ConstructSignature:
        case Syntax.FunctionType:
        case Syntax.ConstructorType:
        case Syntax.TypeAliasDeclaration:
        case Syntax.InterfaceDeclaration:
          checkUnusedTypeParameters(node, addDiagnostic);
          break;
        case Syntax.InferType:
          checkUnusedInferTypeParameter(node, addDiagnostic);
          break;
        default:
          Debug.assertNever(node, 'Node should not have been registered for unused identifiers check');
      }
    }
  }
  checkUnusedClassMembers(node: ClassDeclaration | ClassExpression, addDiagnostic: AddUnusedDiagnostic): void {
    for (const member of node.members) {
      switch (member.kind) {
        case Syntax.MethodDeclaration:
        case Syntax.PropertyDeclaration:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          if (member.kind === Syntax.SetAccessor && member.symbol.flags & qt.SymbolFlags.GetAccessor) break;
          const symbol = getSymbolOfNode(member);
          if (
            !symbol.isReferenced &&
            (has.effectiveModifier(member, ModifierFlags.Private) || (is.namedDeclaration(member) && is.kind(qc.PrivateIdentifier, member.name))) &&
            !(member.flags & NodeFlags.Ambient)
          ) {
            addDiagnostic(member, UnusedKind.Local, createDiagnosticForNode(member.name!, qd._0_is_declared_but_its_value_is_never_read, symbol.symbolToString()));
          }
          break;
        case Syntax.Constructor:
          for (const parameter of (<ConstructorDeclaration>member).parameters) {
            if (!parameter.symbol.isReferenced && has.syntacticModifier(parameter, ModifierFlags.Private))
              addDiagnostic(parameter, UnusedKind.Local, createDiagnosticForNode(parameter.name, qd.Property_0_is_declared_but_its_value_is_never_read, parameter.symbol.name));
          }
          break;
        case Syntax.IndexSignature:
        case Syntax.SemicolonClassElement:
          break;
        default:
          fail();
      }
    }
  }
  checkUnusedInferTypeParameter(node: InferTypeNode, addDiagnostic: AddUnusedDiagnostic): void {
    const { typeParameter } = node;
    if (isTypeParameterUnused(typeParameter)) addDiagnostic(node, UnusedKind.Parameter, createDiagnosticForNode(node, qd._0_is_declared_but_its_value_is_never_read, idText(typeParameter.name)));
  }
  checkUnusedTypeParameters(node: ClassLikeDeclaration | SignatureDeclaration | InterfaceDeclaration | TypeAliasDeclaration, addDiagnostic: AddUnusedDiagnostic): void {
    if (last(getSymbolOfNode(node).declarations) !== node) return;
    const typeParameters = get.effectiveTypeParameterDeclarations(node);
    const seenParentsWithEveryUnused = new NodeSet<DeclarationWithTypeParameterChildren>();
    for (const typeParameter of typeParameters) {
      if (!isTypeParameterUnused(typeParameter)) continue;
      const name = idText(typeParameter.name);
      const { parent } = typeParameter;
      if (parent.kind !== Syntax.InferType && parent.typeParameters!.every(isTypeParameterUnused)) {
        if (seenParentsWithEveryUnused.tryAdd(parent)) {
          const range = is.kind(qc.DocTemplateTag, parent) ? parent.getRange() : parent.typeParameters!.getRange();
          const only = parent.typeParameters!.length === 1;
          const message = only ? qd._0_is_declared_but_its_value_is_never_read : qd.All_type_parameters_are_unused;
          const arg0 = only ? name : undefined;
          addDiagnostic(typeParameter, UnusedKind.Parameter, createFileDiagnostic(get.sourceFileOf(parent), range.pos, range.end - range.pos, message, arg0));
        }
      } else {
        addDiagnostic(typeParameter, UnusedKind.Parameter, createDiagnosticForNode(typeParameter, qd._0_is_declared_but_its_value_is_never_read, name));
      }
    }
  }
  checkUnusedLocalsAndParameters(nodeWithLocals: Node, addDiagnostic: AddUnusedDiagnostic): void {
    const unusedImports = new qb.QMap<[ImportClause, ImportedDeclaration[]]>();
    const unusedDestructures = new qb.QMap<[ObjectBindingPattern, BindingElement[]]>();
    const unusedVariables = new qb.QMap<[VariableDeclarationList, VariableDeclaration[]]>();
    nodeWithLocals.locals!.forEach((local) => {
      if (local.flags & qt.SymbolFlags.TypeParameter ? !(local.flags & qt.SymbolFlags.Variable && !(local.isReferenced! & qt.SymbolFlags.Variable)) : local.isReferenced || local.exportSymbol) return;
      for (const declaration of local.declarations) {
        if (isValidUnusedLocalDeclaration(declaration)) continue;
        if (isImportedDeclaration(declaration)) addToGroup(unusedImports, importClauseFromImported(declaration), declaration, getNodeId);
        else if (is.kind(qc.BindingElement, declaration) && is.kind(qc.ObjectBindingPattern, declaration.parent)) {
          const lastElement = last(declaration.parent.elements);
          if (declaration === lastElement || !last(declaration.parent.elements).dot3Token) addToGroup(unusedDestructures, declaration.parent, declaration, getNodeId);
        } else if (is.kind(qc.VariableDeclaration, declaration)) {
          addToGroup(unusedVariables, declaration.parent, declaration, getNodeId);
        } else {
          const parameter = local.valueDeclaration && tryGetRootParameterDeclaration(local.valueDeclaration);
          const name = local.valueDeclaration && get.nameOfDeclaration(local.valueDeclaration);
          if (parameter && name) {
            if (!is.parameterPropertyDeclaration(parameter, parameter.parent) && !parameterIsThqy.is.keyword(parameter) && !isIdentifierThatStartsWithUnderscore(name))
              addDiagnostic(parameter, UnusedKind.Parameter, createDiagnosticForNode(name, qd._0_is_declared_but_its_value_is_never_read, local.name));
          } else {
            errorUnusedLocal(declaration, local.name, addDiagnostic);
          }
        }
      }
    });
    unusedImports.forEach(([importClause, unuseds]) => {
      const importDecl = importClause.parent;
      const nDeclarations =
        (importClause.name ? 1 : 0) + (importClause.namedBindings ? (importClause.namedBindings.kind === Syntax.NamespaceImport ? 1 : importClause.namedBindings.elements.length) : 0);
      if (nDeclarations === unuseds.length) {
        addDiagnostic(
          importDecl,
          UnusedKind.Local,
          unuseds.length === 1
            ? createDiagnosticForNode(importDecl, qd._0_is_declared_but_its_value_is_never_read, idText(first(unuseds).name!))
            : createDiagnosticForNode(importDecl, qd.All_imports_in_import_declaration_are_unused)
        );
      } else {
        for (const unused of unuseds) errorUnusedLocal(unused, idText(unused.name!), addDiagnostic);
      }
    });
    unusedDestructures.forEach(([bindingPattern, bindingElements]) => {
      const kind = tryGetRootParameterDeclaration(bindingPattern.parent) ? UnusedKind.Parameter : UnusedKind.Local;
      if (bindingPattern.elements.length === bindingElements.length) {
        if (bindingElements.length === 1 && bindingPattern.parent.kind === Syntax.VariableDeclaration && bindingPattern.parent.parent.kind === Syntax.VariableDeclarationList)
          addToGroup(unusedVariables, bindingPattern.parent.parent, bindingPattern.parent, getNodeId);
        else {
          addDiagnostic(
            bindingPattern,
            kind,
            bindingElements.length === 1
              ? createDiagnosticForNode(bindingPattern, qd._0_is_declared_but_its_value_is_never_read, bindingNameText(first(bindingElements).name))
              : createDiagnosticForNode(bindingPattern, qd.All_destructured_elements_are_unused)
          );
        }
      } else {
        for (const e of bindingElements) {
          addDiagnostic(e, kind, createDiagnosticForNode(e, qd._0_is_declared_but_its_value_is_never_read, bindingNameText(e.name)));
        }
      }
    });
    unusedVariables.forEach(([declarationList, declarations]) => {
      if (declarationList.declarations.length === declarations.length) {
        addDiagnostic(
          declarationList,
          UnusedKind.Local,
          declarations.length === 1
            ? createDiagnosticForNode(first(declarations).name, qd._0_is_declared_but_its_value_is_never_read, bindingNameText(first(declarations).name))
            : createDiagnosticForNode(declarationList.parent.kind === Syntax.VariableStatement ? declarationList.parent : declarationList, qd.All_variables_are_unused)
        );
      } else {
        for (const decl of declarations) {
          addDiagnostic(decl, UnusedKind.Local, createDiagnosticForNode(decl, qd._0_is_declared_but_its_value_is_never_read, bindingNameText(decl.name)));
        }
      }
    });
  }
  checkBlock(node: Block) {
    if (node.kind === Syntax.Block) checkGrammarStatementInAmbientContext(node);
    if (is.functionOrModuleBlock(node)) {
      const saveFlowAnalysisDisabled = flowAnalysisDisabled;
      forEach(node.statements, checkSourceElement);
      flowAnalysisDisabled = saveFlowAnalysisDisabled;
    } else {
      forEach(node.statements, checkSourceElement);
    }
    if (node.locals) registerForUnusedIdentifiersCheck(node);
  }
  checkCollisionWithArgumentsInGeneratedCode(node: SignatureDeclaration) {
    return;
  }
  checkIfThisIsCapturedInEnclosingScope(node: Node): void {
    qc.findAncestor(node, (current) => {
      if (getNodeCheckFlags(current) & NodeCheckFlags.CaptureThis) {
        const isDeclaration = node.kind !== Syntax.Identifier;
        if (isDeclaration) error(get.nameOfDeclaration(<Declaration>node), qd.Duplicate_identifier_this_Compiler_uses_variable_declaration_this_to_capture_this_reference);
        else {
          error(node, qd.Expression_resolves_to_variable_declaration_this_that_compiler_uses_to_capture_this_reference);
        }
        return true;
      }
      return false;
    });
  }
  checkIfNewTargetIsCapturedInEnclosingScope(node: Node): void {
    qc.findAncestor(node, (current) => {
      if (getNodeCheckFlags(current) & NodeCheckFlags.CaptureNewTarget) {
        const isDeclaration = node.kind !== Syntax.Identifier;
        if (isDeclaration)
          error(get.nameOfDeclaration(<Declaration>node), qd.Duplicate_identifier_newTarget_Compiler_uses_variable_declaration_newTarget_to_capture_new_target_meta_property_reference);
        else {
          error(node, qd.Expression_resolves_to_variable_declaration_newTarget_that_compiler_uses_to_capture_new_target_meta_property_reference);
        }
        return true;
      }
      return false;
    });
  }
  checkWeakMapCollision(node: Node) {
    const enclosingBlockScope = get.enclosingBlockScopeContainer(node);
    if (getNodeCheckFlags(enclosingBlockScope) & NodeCheckFlags.ContainsClassWithPrivateIdentifiers) error(node, qd.Compiler_reserves_name_0_when_emitting_private_identifier_downlevel, 'WeakMap');
  }
  checkCollisionWithRequireExportsInGeneratedCode(node: Node, name: Identifier) {
    if (moduleKind >= ModuleKind.ES2015 || compilerOptions.noEmit) return;
    if (!needCollisionCheckForIdentifier(node, name, 'require') && !needCollisionCheckForIdentifier(node, name, 'exports')) return;
    if (is.kind(qc.ModuleDeclaration, node) && getModuleInstanceState(node) !== ModuleInstanceState.Instantiated) return;
    const parent = getDeclarationContainer(node);
    if (parent.kind === Syntax.SourceFile && is.externalOrCommonJsModule(<SourceFile>parent))
      error(name, qd.Duplicate_identifier_0_Compiler_reserves_name_1_in_top_level_scope_of_a_module, declarationNameToString(name), declarationNameToString(name));
  }
  checkCollisionWithGlobalPromiseInGeneratedCode(node: Node, name: Identifier): void {
    return;
  }
  checkVarDeclaredNamesNotShadowed(node: VariableDeclaration | BindingElement) {
    if ((get.combinedFlagsOf(node) & NodeFlags.BlockScoped) !== 0 || isParameterDeclaration(node)) return;
    if (node.kind === Syntax.VariableDeclaration && !node.initer) return;
    const symbol = getSymbolOfNode(node);
    if (symbol.flags & qt.SymbolFlags.FunctionScopedVariable) {
      if (!is.kind(qc.Identifier, node.name)) return fail();
      const localDeclarationSymbol = resolveName(node, node.name.escapedText, qt.SymbolFlags.Variable, undefined, undefined, false);
      if (localDeclarationSymbol && localDeclarationSymbol !== symbol && localDeclarationSymbol.flags & qt.SymbolFlags.BlockScopedVariable) {
        if (getDeclarationNodeFlagsFromSymbol(localDeclarationSymbol) & NodeFlags.BlockScoped) {
          const varDeclList = get.ancestor(localDeclarationSymbol.valueDeclaration, Syntax.VariableDeclarationList)!;
          const container = varDeclList.parent.kind === Syntax.VariableStatement && varDeclList.parent.parent ? varDeclList.parent.parent : undefined;
          const namesShareScope =
            container &&
            ((container.kind === Syntax.Block && is.functionLike(container.parent)) ||
              container.kind === Syntax.ModuleBlock ||
              container.kind === Syntax.ModuleDeclaration ||
              container.kind === Syntax.SourceFile);
          if (!namesShareScope) {
            const name = localDeclarationSymbol.symbolToString();
            error(node, qd.Cannot_initialize_outer_scoped_variable_0_in_the_same_scope_as_block_scoped_declaration_1, name, name);
          }
        }
      }
    }
  }
  checkVariableLikeDeclaration(node: ParameterDeclaration | PropertyDeclaration | PropertySignature | VariableDeclaration | BindingElement) {
    checkDecorators(node);
    if (!is.kind(qc.BindingElement, node)) checkSourceElement(node.type);
    if (!node.name) return;
    if (node.name.kind === Syntax.ComputedPropertyName) {
      checkComputedPropertyName(node.name);
      if (node.initer) checkExpressionCached(node.initer);
    }
    if (node.kind === Syntax.BindingElement) {
      if (node.parent.kind === Syntax.ObjectBindingPattern && languageVersion < ScriptTarget.ESNext) checkExternalEmitHelpers(node, ExternalEmitHelpers.Rest);
      if (node.propertyName && node.propertyName.kind === Syntax.ComputedPropertyName) checkComputedPropertyName(node.propertyName);
      const parent = node.parent.parent;
      const parentType = getTypeForBindingElementParent(parent);
      const name = node.propertyName || node.name;
      if (parentType && !is.kind(qc.BindingPattern, name)) {
        const exprType = getLiteralTypeFromPropertyName(name);
        if (isTypeUsableAsPropertyName(exprType)) {
          const nameText = getPropertyNameFromType(exprType);
          const property = getPropertyOfType(parentType, nameText);
          if (property) {
            markPropertyAsReferenced(property, false);
            checkPropertyAccessibility(parent, !!parent.initer && parent.initer.kind === Syntax.SuperKeyword, parentType, property);
          }
        }
      }
    }
    if (is.kind(qc.BindingPattern, node.name)) forEach(node.name.elements, checkSourceElement);
    if (node.initer && get.rootDeclaration(node).kind === Syntax.Parameter && is.missing((get.containingFunction(node) as FunctionLikeDeclaration).body)) {
      error(node, qd.A_parameter_initer_is_only_allowed_in_a_function_or_constructor_implementation);
      return;
    }
    if (is.kind(qc.BindingPattern, node.name)) {
      const needCheckIniter = node.initer && node.parent.parent.kind !== Syntax.ForInStatement;
      const needCheckWidenedType = node.name.elements.length === 0;
      if (needCheckIniter || needCheckWidenedType) {
        const widenedType = getWidenedTypeForVariableLikeDeclaration(node);
        if (needCheckIniter) {
          const initerType = checkExpressionCached(node.initer!);
          if (strictNullChecks && needCheckWidenedType) checkNonNullNonVoidType(initerType, node);
          else {
            checkTypeAssignableToAndOptionallyElaborate(initerType, getWidenedTypeForVariableLikeDeclaration(node), node, node.initer);
          }
        }
        if (needCheckWidenedType) {
          if (is.kind(qc.ArrayBindingPattern, node.name)) checkIteratedTypeOrElementType(IterationUse.Destructuring, widenedType, undefinedType, node);
          else if (strictNullChecks) {
            checkNonNullNonVoidType(widenedType, node);
          }
        }
      }
      return;
    }
    const symbol = getSymbolOfNode(node);
    const type = convertAutoToAny(this.getTypeOfSymbol());
    if (node === symbol.valueDeclaration) {
      const initer = getEffectiveIniter(node);
      if (initer) {
        const isJSObjectLiteralIniter =
          is.inJSFile(node) && is.kind(qc.ObjectLiteralExpression, initer) && (initer.properties.length === 0 || is.prototypeAccess(node.name)) && qb.hasEntries(symbol.exports);
        if (!isJSObjectLiteralIniter && node.parent.parent.kind !== Syntax.ForInStatement) checkTypeAssignableToAndOptionallyElaborate(checkExpressionCached(initer), type, node, initer, undefined);
      }
      if (symbol.declarations.length > 1) {
        if (some(symbol.declarations, (d) => d !== node && is.variableLike(d) && !areDeclarationFlagsIdentical(d, node)))
          error(node.name, qd.All_declarations_of_0_must_have_identical_modifiers, declarationNameToString(node.name));
      }
    } else {
      const declarationType = convertAutoToAny(getWidenedTypeForVariableLikeDeclaration(node));
      if (type !== errorType && declarationType !== errorType && !isTypeIdenticalTo(type, declarationType) && !(symbol.flags & qt.SymbolFlags.Assignment))
        errorNextVariableOrPropertyDeclarationMustHaveSameType(symbol.valueDeclaration, type, node, declarationType);
      if (node.initer) checkTypeAssignableToAndOptionallyElaborate(checkExpressionCached(node.initer), declarationType, node, node.initer, undefined);
      if (!areDeclarationFlagsIdentical(node, symbol.valueDeclaration)) error(node.name, qd.All_declarations_of_0_must_have_identical_modifiers, declarationNameToString(node.name));
    }
    if (node.kind !== Syntax.PropertyDeclaration && node.kind !== Syntax.PropertySignature) {
      checkExportsOnMergedDeclarations(node);
      if (node.kind === Syntax.VariableDeclaration || node.kind === Syntax.BindingElement) checkVarDeclaredNamesNotShadowed(node);
      checkCollisionWithRequireExportsInGeneratedCode(node, node.name);
      checkCollisionWithGlobalPromiseInGeneratedCode(node, node.name);
      if (!compilerOptions.noEmit && languageVersion < ScriptTarget.ESNext && needCollisionCheckForIdentifier(node, node.name, 'WeakMap')) potentialWeakMapCollisions.push(node);
    }
  }
  checkVariableDeclaration(node: VariableDeclaration) {
    checkGrammarVariableDeclaration(node);
    return checkVariableLikeDeclaration(node);
  }
  checkBindingElement(node: BindingElement) {
    checkGrammarBindingElement(node);
    return checkVariableLikeDeclaration(node);
  }
  checkVariableStatement(node: VariableStatement) {
    if (!checkGrammarDecoratorsAndModifiers(node) && !checkGrammarVariableDeclarationList(node.declarationList)) checkGrammarForDisallowedLetOrConstStatement(node);
    forEach(node.declarationList.declarations, checkSourceElement);
  }
  checkExpressionStatement(node: ExpressionStatement) {
    checkGrammarStatementInAmbientContext(node);
    checkExpression(node.expression);
  }
  checkIfStatement(node: IfStatement) {
    checkGrammarStatementInAmbientContext(node);
    const type = checkTruthinessExpression(node.expression);
    checkTestingKnownTruthyCallableType(node.expression, node.thenStatement, type);
    checkSourceElement(node.thenStatement);
    if (node.thenStatement.kind === Syntax.EmptyStatement) error(node.thenStatement, qd.The_body_of_an_if_statement_cannot_be_the_empty_statement);
    checkSourceElement(node.elseStatement);
  }
  checkTestingKnownTruthyCallableType(condExpr: Expression, body: Statement | Expression, type: Type) {
    if (!strictNullChecks) return;
    const testedNode = is.kind(qc.Identifier, condExpr) ? condExpr : is.kind(qc.PropertyAccessExpression, condExpr) ? condExpr.name : undefined;
    if (!testedNode) return;
    const possiblyFalsy = getFalsyFlags(type);
    if (possiblyFalsy) return;
    const callSignatures = getSignaturesOfType(type, SignatureKind.Call);
    if (callSignatures.length === 0) return;
    const testedFunctionSymbol = getSymbolAtLocation(testedNode);
    if (!testedFunctionSymbol) return;
    const functionIsUsedInBody = qc.forEach.child(body, function check(childNode): boolean | undefined {
      if (is.kind(qc.Identifier, childNode)) {
        const childSymbol = getSymbolAtLocation(childNode);
        if (childSymbol && childSymbol === testedFunctionSymbol) {
          if (is.kind(qc.Identifier, condExpr)) return true;
          let testedExpression = testedNode.parent;
          let childExpression = childNode.parent;
          while (testedExpression && childExpression) {
            if (
              (is.kind(qc.Identifier, testedExpression) && is.kind(qc.Identifier, childExpression)) ||
              (testedExpression.kind === Syntax.ThisKeyword && childExpression.kind === Syntax.ThisKeyword)
            ) {
              return getSymbolAtLocation(testedExpression) === getSymbolAtLocation(childExpression);
            }
            if (is.kind(qc.PropertyAccessExpression, testedExpression) && is.kind(qc.PropertyAccessExpression, childExpression)) {
              if (getSymbolAtLocation(testedExpression.name) !== getSymbolAtLocation(childExpression.name)) return false;
              childExpression = childExpression.expression;
              testedExpression = testedExpression.expression;
            }
            return false;
          }
        }
      }
      return qc.forEach.child(childNode, check);
    });
    if (!functionIsUsedInBody) error(condExpr, qd.This_condition_will_always_return_true_since_the_function_is_always_defined_Did_you_mean_to_call_it_instead);
  }
  checkDoStatement(node: DoStatement) {
    checkGrammarStatementInAmbientContext(node);
    checkSourceElement(node.statement);
    checkTruthinessExpression(node.expression);
  }
  checkWhileStatement(node: WhileStatement) {
    checkGrammarStatementInAmbientContext(node);
    checkTruthinessExpression(node.expression);
    checkSourceElement(node.statement);
  }
  checkTruthinessOfType(type: Type, node: Node) {
    if (type.flags & qt.TypeFlags.Void) error(node, qd.An_expression_of_type_void_cannot_be_tested_for_truthiness);
    return type;
  }
  checkTruthinessExpression(node: Expression, checkMode?: CheckMode) {
    return checkTruthinessOfType(checkExpression(node, checkMode), node);
  }
  checkForStatement(node: ForStatement) {
    if (!checkGrammarStatementInAmbientContext(node)) {
      if (node.initer && node.initer.kind === Syntax.VariableDeclarationList) checkGrammarVariableDeclarationList(<VariableDeclarationList>node.initer);
    }
    if (node.initer) {
      if (node.initer.kind === Syntax.VariableDeclarationList) forEach((<VariableDeclarationList>node.initer).declarations, checkVariableDeclaration);
      else {
        checkExpression(node.initer);
      }
    }
    if (node.condition) checkTruthinessExpression(node.condition);
    if (node.incrementor) checkExpression(node.incrementor);
    checkSourceElement(node.statement);
    if (node.locals) registerForUnusedIdentifiersCheck(node);
  }
  checkForOfStatement(node: ForOfStatement): void {
    checkGrammarForInOrForOfStatement(node);
    if (node.awaitModifier) {
      const functionFlags = getFunctionFlags(get.containingFunction(node));
      if ((functionFlags & (FunctionFlags.Invalid | FunctionFlags.Async)) === FunctionFlags.Async && languageVersion < ScriptTarget.ESNext)
        checkExternalEmitHelpers(node, ExternalEmitHelpers.ForAwaitOfIncludes);
    }
    if (node.initer.kind === Syntax.VariableDeclarationList) checkForInOrForOfVariableDeclaration(node);
    else {
      const varExpr = node.initer;
      const iteratedType = checkRightHandSideOfForOf(node);
      if (varExpr.kind === Syntax.ArrayLiteralExpression || varExpr.kind === Syntax.ObjectLiteralExpression) checkDestructuringAssignment(varExpr, iteratedType || errorType);
      else {
        const leftType = checkExpression(varExpr);
        checkReferenceExpression(
          varExpr,
          qd.The_left_hand_side_of_a_for_of_statement_must_be_a_variable_or_a_property_access,
          qd.The_left_hand_side_of_a_for_of_statement_may_not_be_an_optional_property_access
        );
        if (iteratedType) checkTypeAssignableToAndOptionallyElaborate(iteratedType, leftType, varExpr, node.expression);
      }
    }
    checkSourceElement(node.statement);
    if (node.locals) registerForUnusedIdentifiersCheck(node);
  }
  checkForInStatement(node: ForInStatement) {
    checkGrammarForInOrForOfStatement(node);
    const rightType = getNonNullableTypeIfNeeded(checkExpression(node.expression));
    if (node.initer.kind === Syntax.VariableDeclarationList) {
      const variable = (<VariableDeclarationList>node.initer).declarations[0];
      if (variable && is.kind(qc.BindingPattern, variable.name)) error(variable.name, qd.The_left_hand_side_of_a_for_in_statement_cannot_be_a_destructuring_pattern);
      checkForInOrForOfVariableDeclaration(node);
    } else {
      const varExpr = node.initer;
      const leftType = checkExpression(varExpr);
      if (varExpr.kind === Syntax.ArrayLiteralExpression || varExpr.kind === Syntax.ObjectLiteralExpression)
        error(varExpr, qd.The_left_hand_side_of_a_for_in_statement_cannot_be_a_destructuring_pattern);
      else if (!isTypeAssignableTo(getIndexTypeOrString(rightType), leftType)) {
        error(varExpr, qd.The_left_hand_side_of_a_for_in_statement_must_be_of_type_string_or_any);
      } else {
        checkReferenceExpression(
          varExpr,
          qd.The_left_hand_side_of_a_for_in_statement_must_be_a_variable_or_a_property_access,
          qd.The_left_hand_side_of_a_for_in_statement_may_not_be_an_optional_property_access
        );
      }
    }
    if (rightType === neverType || !isTypeAssignableToKind(rightType, qt.TypeFlags.NonPrimitive | qt.TypeFlags.InstantiableNonPrimitive))
      error(node.expression, qd.The_right_hand_side_of_a_for_in_statement_must_be_of_type_any_an_object_type_or_a_type_parameter_but_here_has_type_0, typeToString(rightType));
    checkSourceElement(node.statement);
    if (node.locals) registerForUnusedIdentifiersCheck(node);
  }
  checkForInOrForOfVariableDeclaration(iterationStatement: ForInOrOfStatement): void {
    const variableDeclarationList = <VariableDeclarationList>iterationStatement.initer;
    if (variableDeclarationList.declarations.length >= 1) {
      const decl = variableDeclarationList.declarations[0];
      checkVariableDeclaration(decl);
    }
  }
  checkRightHandSideOfForOf(statement: ForOfStatement): Type {
    const use = statement.awaitModifier ? IterationUse.ForAwaitOf : IterationUse.ForOf;
    return checkIteratedTypeOrElementType(use, checkNonNullExpression(statement.expression), undefinedType, statement.expression);
  }
  checkIteratedTypeOrElementType(use: IterationUse, inputType: Type, sentType: Type, errorNode: Node | undefined): Type {
    if (isTypeAny(inputType)) return inputType;
    return getIteratedTypeOrElementType(use, inputType, sentType, errorNode, true) || anyType;
  }
  checkBreakOrContinueStatement(node: BreakOrContinueStatement) {
    if (!checkGrammarStatementInAmbientContext(node)) checkGrammarBreakOrContinueStatement(node);
  }
  checkReturnStatement(node: ReturnStatement) {
    if (checkGrammarStatementInAmbientContext(node)) return;
    const func = get.containingFunction(node);
    if (!func) {
      grammarErrorOnFirstToken(node, qd.A_return_statement_can_only_be_used_within_a_function_body);
      return;
    }
    const signature = getSignatureFromDeclaration(func);
    const returnType = getReturnTypeOfSignature(signature);
    const functionFlags = getFunctionFlags(func);
    if (strictNullChecks || node.expression || returnType.flags & qt.TypeFlags.Never) {
      const exprType = node.expression ? checkExpressionCached(node.expression) : undefinedType;
      if (func.kind === Syntax.SetAccessor) {
        if (node.expression) error(node, qd.Setters_cannot_return_a_value);
      } else if (func.kind === Syntax.Constructor) {
        if (node.expression && !checkTypeAssignableToAndOptionallyElaborate(exprType, returnType, node, node.expression))
          error(node, qd.Return_type_of_constructor_signature_must_be_assignable_to_the_instance_type_of_the_class);
      } else if (getReturnTypeFromAnnotation(func)) {
        const unwrappedReturnType = unwrapReturnType(returnType, functionFlags) ?? returnType;
        const unwrappedExprType =
          functionFlags & FunctionFlags.Async
            ? checkAwaitedType(exprType, node, qd.The_return_type_of_an_async_function_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member)
            : exprType;
        if (unwrappedReturnType) checkTypeAssignableToAndOptionallyElaborate(unwrappedExprType, unwrappedReturnType, node, node.expression);
      }
    } else if (func.kind !== Syntax.Constructor && compilerOptions.noImplicitReturns && !isUnwrappedReturnTypeVoidOrAny(func, returnType)) {
      error(node, qd.Not_all_code_paths_return_a_value);
    }
  }
  checkWithStatement(node: WithStatement) {
    if (!checkGrammarStatementInAmbientContext(node)) {
      if (node.flags & NodeFlags.AwaitContext) grammarErrorOnFirstToken(node, qd.with_statements_are_not_allowed_in_an_async_function_block);
    }
    checkExpression(node.expression);
    const sourceFile = get.sourceFileOf(node);
    if (!hasParseDiagnostics(sourceFile)) {
      const start = getSpanOfTokenAtPosition(sourceFile, node.pos).start;
      const end = node.statement.pos;
      grammarErrorAtPos(sourceFile, start, end - start, qd.The_with_statement_is_not_supported_All_symbols_in_a_with_block_will_have_type_any);
    }
  }
  checkSwitchStatement(node: SwitchStatement) {
    checkGrammarStatementInAmbientContext(node);
    let firstDefaultClause: CaseOrDefaultClause;
    let hasDuplicateDefaultClause = false;
    const expressionType = checkExpression(node.expression);
    const expressionIsLiteral = isLiteralType(expressionType);
    forEach(node.caseBlock.clauses, (clause) => {
      if (clause.kind === Syntax.DefaultClause && !hasDuplicateDefaultClause) {
        if (firstDefaultClause === undefined) firstDefaultClause = clause;
        else {
          grammarErrorOnNode(clause, qd.A_default_clause_cannot_appear_more_than_once_in_a_switch_statement);
          hasDuplicateDefaultClause = true;
        }
      }
      if (produceDiagnostics && clause.kind === Syntax.CaseClause) {
        let caseType = checkExpression(clause.expression);
        const caseIsLiteral = isLiteralType(caseType);
        let comparedExpressionType = expressionType;
        if (!caseIsLiteral || !expressionIsLiteral) {
          caseType = caseIsLiteral ? getBaseTypeOfLiteralType(caseType) : caseType;
          comparedExpressionType = getBaseTypeOfLiteralType(expressionType);
        }
        if (!isTypeEqualityComparableTo(comparedExpressionType, caseType)) checkTypeComparableTo(caseType, comparedExpressionType, clause.expression, undefined);
      }
      forEach(clause.statements, checkSourceElement);
      if (compilerOptions.noFallthroughCasesInSwitch && clause.fallthroughFlowNode && isReachableFlowNode(clause.fallthroughFlowNode)) error(clause, qd.Fallthrough_case_in_switch);
    });
    if (node.caseBlock.locals) registerForUnusedIdentifiersCheck(node.caseBlock);
  }
  checkLabeledStatement(node: LabeledStatement) {
    if (!checkGrammarStatementInAmbientContext(node)) {
      qc.findAncestor(node.parent, (current) => {
        if (is.functionLike(current)) return 'quit';
        if (current.kind === Syntax.LabeledStatement && (<LabeledStatement>current).label.escapedText === node.label.escapedText) {
          grammarErrorOnNode(node.label, qd.Duplicate_label_0, get.textOf(node.label));
          return true;
        }
        return false;
      });
    }
    checkSourceElement(node.statement);
  }
  checkThrowStatement(node: ThrowStatement) {
    if (!checkGrammarStatementInAmbientContext(node)) {
      if (node.expression === undefined) grammarErrorAfterFirstToken(node, qd.Line_break_not_permitted_here);
    }
    if (node.expression) checkExpression(node.expression);
  }
  checkTryStatement(node: TryStatement) {
    checkGrammarStatementInAmbientContext(node);
    checkBlock(node.tryBlock);
    const catchClause = node.catchClause;
    if (catchClause) {
      if (catchClause.variableDeclaration) {
        if (catchClause.variableDeclaration.type) grammarErrorOnFirstToken(catchClause.variableDeclaration.type, qd.Catch_clause_variable_cannot_have_a_type_annotation);
        else if (catchClause.variableDeclaration.initer) {
          grammarErrorOnFirstToken(catchClause.variableDeclaration.initer, qd.Catch_clause_variable_cannot_have_an_initer);
        } else {
          const blockLocals = catchClause.block.locals;
          if (blockLocals) {
            forEachKey(catchClause.locals!, (caughtName) => {
              const blockLocal = blockLocals.get(caughtName);
              if (blockLocal && (blockLocal.flags & qt.SymbolFlags.BlockScopedVariable) !== 0)
                grammarErrorOnNode(blockLocal.valueDeclaration, qd.Cannot_redeclare_identifier_0_in_catch_clause, caughtName);
            });
          }
        }
      }
      checkBlock(catchClause.block);
    }
    if (node.finallyBlock) checkBlock(node.finallyBlock);
  }
  checkIndexConstraints(type: Type) {
    const declaredNumberIndexer = getIndexDeclarationOfSymbol(type.symbol, IndexKind.Number);
    const declaredStringIndexer = getIndexDeclarationOfSymbol(type.symbol, IndexKind.String);
    const stringIndexType = getIndexTypeOfType(type, IndexKind.String);
    const numberIndexType = getIndexTypeOfType(type, IndexKind.Number);
    if (stringIndexType || numberIndexType) {
      forEach(getPropertiesOfObjectType(type), (prop) => {
        const propType = getTypeOfSymbol(prop);
        checkIndexConstraintForProperty(prop, propType, type, declaredStringIndexer, stringIndexType, IndexKind.String);
        checkIndexConstraintForProperty(prop, propType, type, declaredNumberIndexer, numberIndexType, IndexKind.Number);
      });
      const classDeclaration = type.symbol.valueDeclaration;
      if (getObjectFlags(type) & ObjectFlags.Class && is.classLike(classDeclaration)) {
        for (const member of classDeclaration.members) {
          if (!has.syntacticModifier(member, ModifierFlags.Static) && hasNonBindableDynamicName(member)) {
            const symbol = getSymbolOfNode(member);
            const propType = this.getTypeOfSymbol();
            checkIndexConstraintForProperty(symbol, propType, type, declaredStringIndexer, stringIndexType, IndexKind.String);
            checkIndexConstraintForProperty(symbol, propType, type, declaredNumberIndexer, numberIndexType, IndexKind.Number);
          }
        }
      }
    }
    let errorNode: Node | undefined;
    if (stringIndexType && numberIndexType) {
      errorNode = declaredNumberIndexer || declaredStringIndexer;
      if (!errorNode && getObjectFlags(type) & ObjectFlags.Interface) {
        const someBaseTypeHasBothIndexers = forEach(getBaseTypes(<InterfaceType>type), (base) => getIndexTypeOfType(base, IndexKind.String) && getIndexTypeOfType(base, IndexKind.Number));
        errorNode = someBaseTypeHasBothIndexers ? undefined : type.symbol.declarations[0];
      }
    }
    if (errorNode && !isTypeAssignableTo(numberIndexType!, stringIndexType!))
      error(errorNode, qd.Numeric_index_type_0_is_not_assignable_to_string_index_type_1, typeToString(numberIndexType!), typeToString(stringIndexType!));
    function checkIndexConstraintForProperty(
      prop: Symbol,
      propertyType: Type,
      containingType: Type,
      indexDeclaration: Declaration | undefined,
      indexType: Type | undefined,
      indexKind: IndexKind
    ): void {
      if (!indexType || isKnownSymbol(prop)) return;
      const propDeclaration = prop.valueDeclaration;
      const name = propDeclaration && get.nameOfDeclaration(propDeclaration);
      if (name && is.kind(qc.PrivateIdentifier, name)) return;
      if (indexKind === IndexKind.Number && !(name ? isNumericName(name) : NumericLiteral.name(prop.escName))) return;
      let errorNode: Node | undefined;
      if (propDeclaration && name && (propDeclaration.kind === Syntax.BinaryExpression || name.kind === Syntax.ComputedPropertyName || prop.parent === containingType.symbol))
        errorNode = propDeclaration;
      else if (indexDeclaration) {
        errorNode = indexDeclaration;
      } else if (getObjectFlags(containingType) & ObjectFlags.Interface) {
        const someBaseClassHasBothPropertyAndIndexer = forEach(
          getBaseTypes(<InterfaceType>containingType),
          (base) => getPropertyOfObjectType(base, prop.escName) && getIndexTypeOfType(base, indexKind)
        );
        errorNode = someBaseClassHasBothPropertyAndIndexer ? undefined : containingType.symbol.declarations[0];
      }
      if (errorNode && !isTypeAssignableTo(propertyType, indexType)) {
        const errorMessage = indexKind === IndexKind.String ? qd.Property_0_of_type_1_is_not_assignable_to_string_index_type_2 : qd.Property_0_of_type_1_is_not_assignable_to_numeric_index_type_2;
        error(errorNode, errorMessage, prop.symbolToString(), typeToString(propertyType), typeToString(indexType));
      }
    }
  }
  checkTypeNameIsReserved(name: Identifier, message: qd.Message): void {
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
  checkClassNameCollisionWithObject(name: Identifier): void {}
  checkTypeParameters(typeParameterDeclarations: readonly TypeParameterDeclaration[] | undefined) {
    if (typeParameterDeclarations) {
      let seenDefault = false;
      for (let i = 0; i < typeParameterDeclarations.length; i++) {
        const node = typeParameterDeclarations[i];
        checkTypeParameter(node);
        if (produceDiagnostics) {
          if (node.default) {
            seenDefault = true;
            checkTypeParametersNotReferenced(node.default, typeParameterDeclarations, i);
          } else if (seenDefault) {
            error(node, qd.Required_type_parameters_may_not_follow_optional_type_parameters);
          }
          for (let j = 0; j < i; j++) {
            if (typeParameterDeclarations[j].symbol === node.symbol) error(node.name, qd.Duplicate_identifier_0, declarationNameToString(node.name));
          }
        }
      }
    }
  }
  checkTypeParametersNotReferenced(root: TypeNode, typeParameters: readonly TypeParameterDeclaration[], index: number) {
    visit(root);
    function visit(node: Node) {
      if (node.kind === Syntax.TypeReference) {
        const type = getTypeFromTypeReference(<TypeReferenceNode>node);
        if (type.flags & qt.TypeFlags.TypeParameter) {
          for (let i = index; i < typeParameters.length; i++) {
            if (type.symbol === getSymbolOfNode(typeParameters[i])) error(node, qd.Type_parameter_defaults_can_only_reference_previously_declared_type_parameters);
          }
        }
      }
      qc.forEach.child(node, visit);
    }
  }
  checkClassExpression(node: ClassExpression): Type {
    checkClassLikeDeclaration(node);
    checkNodeDeferred(node);
    return getTypeOfSymbol(getSymbolOfNode(node));
  }
  checkClassExpressionDeferred(node: ClassExpression) {
    forEach(node.members, checkSourceElement);
    registerForUnusedIdentifiersCheck(node);
  }
  checkClassDeclaration(node: ClassDeclaration) {
    if (!node.name && !has.syntacticModifier(node, ModifierFlags.Default)) grammarErrorOnFirstToken(node, qd.A_class_declaration_without_the_default_modifier_must_have_a_name);
    checkClassLikeDeclaration(node);
    forEach(node.members, checkSourceElement);
    registerForUnusedIdentifiersCheck(node);
  }
  checkClassLikeDeclaration(node: ClassLikeDeclaration) {
    checkGrammarClassLikeDeclaration(node);
    checkDecorators(node);
    if (node.name) {
      checkTypeNameIsReserved(node.name, qd.Class_name_cannot_be_0);
      checkCollisionWithRequireExportsInGeneratedCode(node, node.name);
      checkCollisionWithGlobalPromiseInGeneratedCode(node, node.name);
      if (!(node.flags & NodeFlags.Ambient)) checkClassNameCollisionWithObject(node.name);
    }
    checkTypeParameters(get.effectiveTypeParameterDeclarations(node));
    checkExportsOnMergedDeclarations(node);
    const symbol = getSymbolOfNode(node);
    const type = <InterfaceType>getDeclaredTypeOfSymbol(symbol);
    const typeWithThis = getTypeWithThisArgument(type);
    const staticType = <ObjectType>this.getTypeOfSymbol();
    checkTypeParameterListsIdentical(symbol);
    checkClassForDuplicateDeclarations(node);
    if (!(node.flags & NodeFlags.Ambient)) checkClassForStaticPropertyNameConflicts(node);
    const baseTypeNode = getEffectiveBaseTypeNode(node);
    if (baseTypeNode) {
      forEach(baseTypeNode.typeArguments, checkSourceElement);
      const extendsNode = getClassExtendsHeritageElement(node);
      if (extendsNode && extendsNode !== baseTypeNode) checkExpression(extendsNode.expression);
      const baseTypes = getBaseTypes(type);
      if (baseTypes.length && produceDiagnostics) {
        const baseType = baseTypes[0];
        const baseConstructorType = getBaseConstructorTypeOfClass(type);
        const staticBaseType = getApparentType(baseConstructorType);
        checkBaseTypeAccessibility(staticBaseType, baseTypeNode);
        checkSourceElement(baseTypeNode.expression);
        if (some(baseTypeNode.typeArguments)) {
          forEach(baseTypeNode.typeArguments, checkSourceElement);
          for (const constructor of getConstructorsForTypeArguments(staticBaseType, baseTypeNode.typeArguments, baseTypeNode)) {
            if (!checkTypeArgumentConstraints(baseTypeNode, constructor.typeParameters!)) break;
          }
        }
        const baseWithThis = getTypeWithThisArgument(baseType, type.thisType);
        if (!checkTypeAssignableTo(typeWithThis, baseWithThis, undefined)) issueMemberSpecificError(node, typeWithThis, baseWithThis, qd.Class_0_incorrectly_extends_base_class_1);
        else {
          checkTypeAssignableTo(staticType, getTypeWithoutSignatures(staticBaseType), node.name || node, qd.Class_static_side_0_incorrectly_extends_base_class_static_side_1);
        }
        if (baseConstructorType.flags & qt.TypeFlags.TypeVariable && !isMixinConstructorType(staticType))
          error(node.name || node, qd.A_mixin_class_must_have_a_constructor_with_a_single_rest_parameter_of_type_any);
        if (!(staticBaseType.symbol && staticBaseType.symbol.flags & qt.SymbolFlags.Class) && !(baseConstructorType.flags & qt.TypeFlags.TypeVariable)) {
          const constructors = getInstantiatedConstructorsForTypeArguments(staticBaseType, baseTypeNode.typeArguments, baseTypeNode);
          if (forEach(constructors, (sig) => !isJSConstructor(sig.declaration) && !isTypeIdenticalTo(getReturnTypeOfSignature(sig), baseType)))
            error(baseTypeNode.expression, qd.Base_constructors_must_all_have_the_same_return_type);
        }
        checkKindsOfPropertyMemberOverrides(type, baseType);
      }
    }
    const implementedTypeNodes = getEffectiveImplementsTypeNodes(node);
    if (implementedTypeNodes) {
      for (const typeRefNode of implementedTypeNodes) {
        if (!is.entityNameExpression(typeRefNode.expression)) error(typeRefNode.expression, qd.A_class_can_only_implement_an_identifier_Slashqualified_name_with_optional_type_arguments);
        checkTypeReferenceNode(typeRefNode);
        if (produceDiagnostics) {
          const t = getReducedType(getTypeFromTypeNode(typeRefNode));
          if (t !== errorType) {
            if (isValidBaseType(t)) {
              const genericDiag =
                t.symbol && t.symbol.flags & qt.SymbolFlags.Class
                  ? qd.Class_0_incorrectly_implements_class_1_Did_you_mean_to_extend_1_and_inherit_its_members_as_a_subclass
                  : qd.Class_0_incorrectly_implements_interface_1;
              const baseWithThis = getTypeWithThisArgument(t, type.thisType);
              if (!checkTypeAssignableTo(typeWithThis, baseWithThis, undefined)) issueMemberSpecificError(node, typeWithThis, baseWithThis, genericDiag);
            } else {
              error(typeRefNode, qd.A_class_can_only_implement_an_object_type_or_intersection_of_object_types_with_statically_known_members);
            }
          }
        }
      }
    }
    if (produceDiagnostics) {
      checkIndexConstraints(type);
      checkTypeForDuplicateIndexSignatures(node);
      checkPropertyInitialization(node);
    }
  }
  checkBaseTypeAccessibility(type: Type, node: ExpressionWithTypeArguments) {
    const signatures = getSignaturesOfType(type, SignatureKind.Construct);
    if (signatures.length) {
      const declaration = signatures[0].declaration;
      if (declaration && has.effectiveModifier(declaration, ModifierFlags.Private)) {
        const typeClassDeclaration = getClassLikeDeclarationOfSymbol(type.symbol)!;
        if (!isNodeWithinClass(node, typeClassDeclaration)) error(node, qd.Cannot_extend_a_class_0_Class_constructor_is_marked_as_private, getFullyQualifiedName(type.symbol));
      }
    }
  }
  checkKindsOfPropertyMemberOverrides(type: InterfaceType, baseType: BaseType): void {
    const baseProperties = getPropertiesOfType(baseType);
    basePropertyCheck: for (const baseProperty of baseProperties) {
      const base = getTargetSymbol(baseProperty);
      if (base.flags & qt.SymbolFlags.Prototype) continue;
      const baseSymbol = getPropertyOfObjectType(type, base.escName);
      if (!baseSymbol) continue;
      const derived = getTargetSymbol(baseSymbol);
      const baseDeclarationFlags = getDeclarationModifierFlagsFromSymbol(base);
      assert(!!derived, "derived should point to something, even if it is the base class' declaration.");
      if (derived === base) {
        const derivedClassDecl = getClassLikeDeclarationOfSymbol(type.symbol)!;
        if (baseDeclarationFlags & ModifierFlags.Abstract && (!derivedClassDecl || !has.syntacticModifier(derivedClassDecl, ModifierFlags.Abstract))) {
          for (const otherBaseType of getBaseTypes(type)) {
            if (otherBaseType === baseType) continue;
            const baseSymbol = getPropertyOfObjectType(otherBaseType, base.escName);
            const derivedElsewhere = baseSymbol && getTargetSymbol(baseSymbol);
            if (derivedElsewhere && derivedElsewhere !== base) continue basePropertyCheck;
          }
          if (derivedClassDecl.kind === Syntax.ClassExpression)
            error(derivedClassDecl, qd.Non_abstract_class_expression_does_not_implement_inherited_abstract_member_0_from_class_1, baseProperty.symbolToString(), typeToString(baseType));
          else {
            error(derivedClassDecl, qd.Non_abstract_class_0_does_not_implement_inherited_abstract_member_1_from_class_2, typeToString(type), baseProperty.symbolToString(), typeToString(baseType));
          }
        }
      } else {
        const derivedDeclarationFlags = getDeclarationModifierFlagsFromSymbol(derived);
        if (baseDeclarationFlags & ModifierFlags.Private || derivedDeclarationFlags & ModifierFlags.Private) continue;
        let errorMessage: qd.Message;
        const basePropertyFlags = base.flags & qt.SymbolFlags.PropertyOrAccessor;
        const derivedPropertyFlags = derived.flags & qt.SymbolFlags.PropertyOrAccessor;
        if (basePropertyFlags && derivedPropertyFlags) {
          if (
            (baseDeclarationFlags & ModifierFlags.Abstract && !(base.valueDeclaration && is.kind(qc.PropertyDeclaration, base.valueDeclaration) && base.valueDeclaration.initer)) ||
            (base.valueDeclaration && base.valueDeclaration.parent.kind === Syntax.InterfaceDeclaration) ||
            (derived.valueDeclaration && is.kind(qc.BinaryExpression, derived.valueDeclaration))
          ) {
            continue;
          }
          const overriddenInstanceProperty = basePropertyFlags !== qt.SymbolFlags.Property && derivedPropertyFlags === qt.SymbolFlags.Property;
          const overriddenInstanceAccessor = basePropertyFlags === qt.SymbolFlags.Property && derivedPropertyFlags !== qt.SymbolFlags.Property;
          if (overriddenInstanceProperty || overriddenInstanceAccessor) {
            const errorMessage = overriddenInstanceProperty
              ? qd._0_is_defined_as_an_accessor_in_class_1_but_is_overridden_here_in_2_as_an_instance_property
              : qd._0_is_defined_as_a_property_in_class_1_but_is_overridden_here_in_2_as_an_accessor;
            error(get.nameOfDeclaration(derived.valueDeclaration) || derived.valueDeclaration, errorMessage, base.symbolToString(), typeToString(baseType), typeToString(type));
          } else if (compilerOptions.useDefineForClassFields) {
            const uninitialized = find(derived.declarations, (d) => d.kind === Syntax.PropertyDeclaration && !(d as PropertyDeclaration).initer);
            if (
              uninitialized &&
              !(derived.flags & qt.SymbolFlags.Transient) &&
              !(baseDeclarationFlags & ModifierFlags.Abstract) &&
              !(derivedDeclarationFlags & ModifierFlags.Abstract) &&
              !derived.declarations.some((d) => !!(d.flags & NodeFlags.Ambient))
            ) {
              const constructor = findConstructorDeclaration(getClassLikeDeclarationOfSymbol(type.symbol)!);
              const propName = (uninitialized as PropertyDeclaration).name;
              if (
                (uninitialized as PropertyDeclaration).exclamationToken ||
                !constructor ||
                !is.kind(qc.Identifier, propName) ||
                !strictNullChecks ||
                !isPropertyInitializedInConstructor(propName, type, constructor)
              ) {
                const errorMessage = qd.Property_0_will_overwrite_the_base_property_in_1_If_this_is_intentional_add_an_initer_Otherwise_add_a_declare_modifier_or_remove_the_redundant_declaration;
                error(get.nameOfDeclaration(derived.valueDeclaration) || derived.valueDeclaration, errorMessage, base.symbolToString(), typeToString(baseType));
              }
            }
          }
          continue;
        } else if (isPrototypeProperty(base)) {
          if (isPrototypeProperty(derived) || derived.flags & qt.SymbolFlags.Property) continue;
          else {
            assert(!!(derived.flags & qt.SymbolFlags.Accessor));
            errorMessage = qd.Class_0_defines_instance_member_function_1_but_extended_class_2_defines_it_as_instance_member_accessor;
          }
        } else if (base.flags & qt.SymbolFlags.Accessor) {
          errorMessage = qd.Class_0_defines_instance_member_accessor_1_but_extended_class_2_defines_it_as_instance_member_function;
        } else {
          errorMessage = qd.Class_0_defines_instance_member_property_1_but_extended_class_2_defines_it_as_instance_member_function;
        }
        error(get.nameOfDeclaration(derived.valueDeclaration) || derived.valueDeclaration, errorMessage, typeToString(baseType), base.symbolToString(), typeToString(type));
      }
    }
  }
  checkInheritedPropertiesAreIdentical(type: InterfaceType, typeNode: Node): boolean {
    const baseTypes = getBaseTypes(type);
    if (baseTypes.length < 2) return true;
    interface InheritanceInfoMap {
      prop: Symbol;
      containingType: Type;
    }
    const seen = qb.createEscapedMap<InheritanceInfoMap>();
    forEach(resolveDeclaredMembers(type).declaredProperties, (p) => {
      seen.set(p.escName, { prop: p, containingType: type });
    });
    let ok = true;
    for (const base of baseTypes) {
      const properties = getPropertiesOfType(getTypeWithThisArgument(base, type.thisType));
      for (const prop of properties) {
        const existing = seen.get(prop.escName);
        if (!existing) seen.set(prop.escName, { prop, containingType: base });
        else {
          const isInheritedProperty = existing.containingType !== type;
          if (isInheritedProperty && !isPropertyIdenticalTo(existing.prop, prop)) {
            ok = false;
            const typeName1 = typeToString(existing.containingType);
            const typeName2 = typeToString(base);
            let errorInfo = chainqd.Messages(undefined, qd.Named_property_0_of_types_1_and_2_are_not_identical, prop.symbolToString(), typeName1, typeName2);
            errorInfo = chainqd.Messages(errorInfo, qd.Interface_0_cannot_simultaneously_extend_types_1_and_2, typeToString(type), typeName1, typeName2);
            diagnostics.add(createDiagnosticForNodeFromMessageChain(typeNode, errorInfo));
          }
        }
      }
    }
    return ok;
  }
  checkPropertyInitialization(node: ClassLikeDeclaration) {
    if (!strictNullChecks || !strictPropertyInitialization || node.flags & NodeFlags.Ambient) return;
    const constructor = findConstructorDeclaration(node);
    for (const member of node.members) {
      if (get.effectiveModifierFlags(member) & ModifierFlags.Ambient) continue;
      if (isInstancePropertyWithoutIniter(member)) {
        const propName = (<PropertyDeclaration>member).name;
        if (is.kind(qc.Identifier, propName) || is.kind(qc.PrivateIdentifier, propName)) {
          const type = getTypeOfSymbol(getSymbolOfNode(member));
          if (!(type.flags & qt.TypeFlags.AnyOrUnknown || getFalsyFlags(type) & qt.TypeFlags.Undefined)) {
            if (!constructor || !isPropertyInitializedInConstructor(propName, type, constructor))
              error(member.name, qd.Property_0_has_no_initer_and_is_not_definitely_assigned_in_the_constructor, declarationNameToString(propName));
          }
        }
      }
    }
  }
  checkInterfaceDeclaration(node: InterfaceDeclaration) {
    if (!checkGrammarDecoratorsAndModifiers(node)) checkGrammarInterfaceDeclaration(node);
    checkTypeParameters(node.typeParameters);
    if (produceDiagnostics) {
      checkTypeNameIsReserved(node.name, qd.Interface_name_cannot_be_0);
      checkExportsOnMergedDeclarations(node);
      const symbol = getSymbolOfNode(node);
      checkTypeParameterListsIdentical(symbol);
      const firstInterfaceDecl = getDeclarationOfKind<InterfaceDeclaration>(symbol, Syntax.InterfaceDeclaration);
      if (node === firstInterfaceDecl) {
        const type = <InterfaceType>getDeclaredTypeOfSymbol(symbol);
        const typeWithThis = getTypeWithThisArgument(type);
        if (checkInheritedPropertiesAreIdentical(type, node.name)) {
          for (const baseType of getBaseTypes(type)) {
            checkTypeAssignableTo(typeWithThis, getTypeWithThisArgument(baseType, type.thisType), node.name, qd.Interface_0_incorrectly_extends_interface_1);
          }
          checkIndexConstraints(type);
        }
      }
      checkObjectTypeForDuplicateDeclarations(node);
    }
    forEach(getInterfaceBaseTypeNodes(node), (heritageElement) => {
      if (!is.entityNameExpression(heritageElement.expression)) error(heritageElement.expression, qd.An_interface_can_only_extend_an_identifier_Slashqualified_name_with_optional_type_arguments);
      checkTypeReferenceNode(heritageElement);
    });
    forEach(node.members, checkSourceElement);
    if (produceDiagnostics) {
      checkTypeForDuplicateIndexSignatures(node);
      registerForUnusedIdentifiersCheck(node);
    }
  }
  checkTypeAliasDeclaration(node: TypeAliasDeclaration) {
    checkGrammarDecoratorsAndModifiers(node);
    checkTypeNameIsReserved(node.name, qd.Type_alias_name_cannot_be_0);
    checkExportsOnMergedDeclarations(node);
    checkTypeParameters(node.typeParameters);
    checkSourceElement(node.type);
    registerForUnusedIdentifiersCheck(node);
  }
  checkEnumDeclaration(node: EnumDeclaration) {
    if (!produceDiagnostics) return;
    checkGrammarDecoratorsAndModifiers(node);
    checkTypeNameIsReserved(node.name, qd.Enum_name_cannot_be_0);
    checkCollisionWithRequireExportsInGeneratedCode(node, node.name);
    checkCollisionWithGlobalPromiseInGeneratedCode(node, node.name);
    checkExportsOnMergedDeclarations(node);
    node.members.forEach(checkEnumMember);
    computeEnumMemberValues(node);
    const enumSymbol = getSymbolOfNode(node);
    const firstDeclaration = getDeclarationOfKind(enumSymbol, node.kind);
    if (node === firstDeclaration) {
      if (enumSymbol.declarations.length > 1) {
        const enumIsConst = is.enumConst(node);
        forEach(enumSymbol.declarations, (decl) => {
          if (is.kind(qc.EnumDeclaration, decl) && is.enumConst(decl) !== enumIsConst) error(get.nameOfDeclaration(decl), qd.Enum_declarations_must_all_be_const_or_non_const);
        });
      }
      let seenEnumMissingInitialIniter = false;
      forEach(enumSymbol.declarations, (declaration) => {
        if (declaration.kind !== Syntax.EnumDeclaration) return false;
        const enumDeclaration = <EnumDeclaration>declaration;
        if (!enumDeclaration.members.length) return false;
        const firstEnumMember = enumDeclaration.members[0];
        if (!firstEnumMember.initer) {
          if (seenEnumMissingInitialIniter) error(firstEnumMember.name, qd.In_an_enum_with_multiple_declarations_only_one_declaration_can_omit_an_initer_for_its_first_enum_element);
          else {
            seenEnumMissingInitialIniter = true;
          }
        }
      });
    }
  }
  checkEnumMember(node: EnumMember) {
    if (is.kind(qc.PrivateIdentifier, node.name)) error(node, qd.An_enum_member_cannot_be_named_with_a_private_identifier);
  }
  checkModuleDeclaration(node: ModuleDeclaration) {
    if (produceDiagnostics) {
      const isGlobalAugmentation = isGlobalScopeAugmentation(node);
      const inAmbientContext = node.flags & NodeFlags.Ambient;
      if (isGlobalAugmentation && !inAmbientContext) error(node.name, qd.Augmentations_for_the_global_scope_should_have_declare_modifier_unless_they_appear_in_already_ambient_context);
      const isAmbientExternalModule = is.ambientModule(node);
      const contextErrorMessage = isAmbientExternalModule
        ? qd.An_ambient_module_declaration_is_only_allowed_at_the_top_level_in_a_file
        : qd.A_namespace_declaration_is_only_allowed_in_a_namespace_or_module;
      if (checkGrammarModuleElementContext(node, contextErrorMessage)) return;
      if (!checkGrammarDecoratorsAndModifiers(node)) {
        if (!inAmbientContext && node.name.kind === Syntax.StringLiteral) grammarErrorOnNode(node.name, qd.Only_ambient_modules_can_use_quoted_names);
      }
      if (is.kind(qc.Identifier, node.name)) {
        checkCollisionWithRequireExportsInGeneratedCode(node, node.name);
        checkCollisionWithGlobalPromiseInGeneratedCode(node, node.name);
      }
      checkExportsOnMergedDeclarations(node);
      const symbol = getSymbolOfNode(node);
      if (
        symbol.flags & qt.SymbolFlags.ValueModule &&
        !inAmbientContext &&
        symbol.declarations.length > 1 &&
        isInstantiatedModule(node, !!compilerOptions.preserveConstEnums || !!compilerOptions.isolatedModules)
      ) {
        const firstNonAmbientClassOrFunc = getFirstNonAmbientClassOrFunctionDeclaration(symbol);
        if (firstNonAmbientClassOrFunc) {
          if (get.sourceFileOf(node) !== get.sourceFileOf(firstNonAmbientClassOrFunc))
            error(node.name, qd.A_namespace_declaration_cannot_be_in_a_different_file_from_a_class_or_function_with_which_it_is_merged);
          else if (node.pos < firstNonAmbientClassOrFunc.pos) {
            error(node.name, qd.A_namespace_declaration_cannot_be_located_prior_to_a_class_or_function_with_which_it_is_merged);
          }
        }
        const mergedClass = getDeclarationOfKind(symbol, Syntax.ClassDeclaration);
        if (mergedClass && inSameLexicalScope(node, mergedClass)) getNodeLinks(node).flags |= NodeCheckFlags.LexicalModuleMergesWithClass;
      }
      if (isAmbientExternalModule) {
        if (is.externalModuleAugmentation(node)) {
          const checkBody = isGlobalAugmentation || getSymbolOfNode(node).flags & qt.SymbolFlags.Transient;
          if (checkBody && node.body) {
            for (const statement of node.body.statements) {
              checkModuleAugmentationElement(statement, isGlobalAugmentation);
            }
          }
        } else if (isGlobalSourceFile(node.parent)) {
          if (isGlobalAugmentation) error(node.name, qd.Augmentations_for_the_global_scope_can_only_be_directly_nested_in_external_modules_or_ambient_module_declarations);
          else if (isExternalModuleNameRelative(getTextOfIdentifierOrLiteral(node.name))) {
            error(node.name, qd.Ambient_module_declaration_cannot_specify_relative_module_name);
          }
        } else {
          if (isGlobalAugmentation) error(node.name, qd.Augmentations_for_the_global_scope_can_only_be_directly_nested_in_external_modules_or_ambient_module_declarations);
          else {
            error(node.name, qd.Ambient_modules_cannot_be_nested_in_other_modules_or_namespaces);
          }
        }
      }
    }
    if (node.body) {
      checkSourceElement(node.body);
      if (!isGlobalScopeAugmentation(node)) registerForUnusedIdentifiersCheck(node);
    }
  }
  checkModuleAugmentationElement(node: Node, isGlobalAugmentation: boolean): void {
    switch (node.kind) {
      case Syntax.VariableStatement:
        for (const decl of (<VariableStatement>node).declarationList.declarations) {
          checkModuleAugmentationElement(decl, isGlobalAugmentation);
        }
        break;
      case Syntax.ExportAssignment:
      case Syntax.ExportDeclaration:
        grammarErrorOnFirstToken(node, qd.Exports_and_export_assignments_are_not_permitted_in_module_augmentations);
        break;
      case Syntax.ImportEqualsDeclaration:
      case Syntax.ImportDeclaration:
        grammarErrorOnFirstToken(node, qd.Imports_are_not_permitted_in_module_augmentations_Consider_moving_them_to_the_enclosing_external_module);
        break;
      case Syntax.BindingElement:
      case Syntax.VariableDeclaration:
        const name = (<VariableDeclaration | BindingElement>node).name;
        if (is.kind(qc.BindingPattern, name)) {
          for (const el of name.elements) {
            checkModuleAugmentationElement(el, isGlobalAugmentation);
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
        const symbol = getSymbolOfNode(node);
        if (symbol) {
          let reportError = !(symbol.flags & qt.SymbolFlags.Transient);
          if (!reportError) reportError = !!symbol.parent && is.externalModuleAugmentation(symbol.parent.declarations[0]);
        }
        break;
    }
  }
  checkExternalImportOrExportDeclaration(node: ImportDeclaration | ImportEqualsDeclaration | ExportDeclaration): boolean {
    const moduleName = getExternalModuleName(node);
    if (!moduleName || is.missing(moduleName)) return false;
    if (!is.kind(qc.StringLiteral, moduleName)) {
      error(moduleName, qd.String_literal_expected);
      return false;
    }
    const inAmbientExternalModule = node.parent.kind === Syntax.ModuleBlock && is.ambientModule(node.parent.parent);
    if (node.parent.kind !== Syntax.SourceFile && !inAmbientExternalModule) {
      error(moduleName, node.kind === Syntax.ExportDeclaration ? qd.Export_declarations_are_not_permitted_in_a_namespace : qd.Import_declarations_in_a_namespace_cannot_reference_a_module);
      return false;
    }
    if (inAmbientExternalModule && isExternalModuleNameRelative(moduleName.text)) {
      if (!isTopLevelInExternalModuleAugmentation(node)) {
        error(node, qd.Import_or_export_declaration_in_an_ambient_module_declaration_cannot_reference_module_through_relative_module_name);
        return false;
      }
    }
    return true;
  }
  checkAliasSymbol(node: ImportEqualsDeclaration | ImportClause | NamespaceImport | ImportSpecifier | ExportSpecifier | NamespaceExport) {
    let symbol = getSymbolOfNode(node);
    const target = this.resolveAlias();
    const shouldSkipWithJSExpandoTargets = symbol.flags & qt.SymbolFlags.Assignment;
    if (!shouldSkipWithJSExpandoTargets && target !== unknownSymbol) {
      symbol = getMergedSymbol(symbol.exportSymbol || symbol);
      const excludedMeanings =
        (symbol.flags & (SymbolFlags.Value | qt.SymbolFlags.ExportValue) ? qt.SymbolFlags.Value : 0) |
        (symbol.flags & qt.SymbolFlags.Type ? qt.SymbolFlags.Type : 0) |
        (symbol.flags & qt.SymbolFlags.Namespace ? qt.SymbolFlags.Namespace : 0);
      if (target.flags & excludedMeanings) {
        const message = node.kind === Syntax.ExportSpecifier ? qd.Export_declaration_conflicts_with_exported_declaration_of_0 : qd.Import_declaration_conflicts_with_local_declaration_of_0;
        error(node, message, symbol.symbolToString());
      }
      if (compilerOptions.isolatedModules && node.kind === Syntax.ExportSpecifier && !node.parent.parent.isTypeOnly && !(target.flags & qt.SymbolFlags.Value) && !(node.flags & NodeFlags.Ambient))
        error(node, qd.Re_exporting_a_type_when_the_isolatedModules_flag_is_provided_requires_using_export_type);
    }
  }
  checkImportBinding(node: ImportEqualsDeclaration | ImportClause | NamespaceImport | ImportSpecifier) {
    checkCollisionWithRequireExportsInGeneratedCode(node, node.name!);
    checkCollisionWithGlobalPromiseInGeneratedCode(node, node.name!);
    checkAliasSymbol(node);
  }
  checkImportDeclaration(node: ImportDeclaration) {
    if (checkGrammarModuleElementContext(node, qd.An_import_declaration_can_only_be_used_in_a_namespace_or_module)) return;
    if (!checkGrammarDecoratorsAndModifiers(node) && has.effectiveModifiers(node)) grammarErrorOnFirstToken(node, qd.An_import_declaration_cannot_have_modifiers);
    if (checkExternalImportOrExportDeclaration(node)) {
      const importClause = node.importClause;
      if (importClause && !checkGrammarImportClause(importClause)) {
        if (importClause.name) checkImportBinding(importClause);
        if (importClause.namedBindings) {
          if (importClause.namedBindings.kind === Syntax.NamespaceImport) checkImportBinding(importClause.namedBindings);
          else {
            const moduleExisted = resolveExternalModuleName(node, node.moduleSpecifier);
            if (moduleExisted) forEach(importClause.namedBindings.elements, checkImportBinding);
          }
        }
      }
    }
  }
  checkImportEqualsDeclaration(node: ImportEqualsDeclaration) {
    if (checkGrammarModuleElementContext(node, qd.An_import_declaration_can_only_be_used_in_a_namespace_or_module)) return;
    checkGrammarDecoratorsAndModifiers(node);
    if (is.internalModuleImportEqualsDeclaration(node) || checkExternalImportOrExportDeclaration(node)) {
      checkImportBinding(node);
      if (has.syntacticModifier(node, ModifierFlags.Export)) markExportAsReferenced(node);
      if (node.moduleReference.kind !== Syntax.ExternalModuleReference) {
        const target = getSymbolOfNode(node).resolveAlias();
        if (target !== unknownSymbol) {
          if (target.flags & qt.SymbolFlags.Value) {
            const moduleName = getFirstIdentifier(node.moduleReference);
            if (!(resolveEntityName(moduleName, qt.SymbolFlags.Value | qt.SymbolFlags.Namespace)!.flags & qt.SymbolFlags.Namespace))
              error(moduleName, qd.Module_0_is_hidden_by_a_local_declaration_with_the_same_name, declarationNameToString(moduleName));
          }
          if (target.flags & qt.SymbolFlags.Type) checkTypeNameIsReserved(node.name, qd.Import_name_cannot_be_0);
        }
      } else {
        if (moduleKind >= ModuleKind.ES2015 && !(node.flags & NodeFlags.Ambient)) {
          grammarErrorOnNode(
            node,
            qd.Import_assignment_cannot_be_used_when_targeting_ECMAScript_modules_Consider_using_import_Asterisk_as_ns_from_mod_import_a_from_mod_import_d_from_mod_or_another_module_format_instead
          );
        }
      }
    }
  }
  checkExportDeclaration(node: ExportDeclaration) {
    if (checkGrammarModuleElementContext(node, qd.An_export_declaration_can_only_be_used_in_a_module)) return;
    if (!checkGrammarDecoratorsAndModifiers(node) && has.effectiveModifiers(node)) grammarErrorOnFirstToken(node, qd.An_export_declaration_cannot_have_modifiers);
    checkGrammarExportDeclaration(node);
    if (!node.moduleSpecifier || checkExternalImportOrExportDeclaration(node)) {
      if (node.exportClause && !is.kind(qc.NamespaceExport, node.exportClause)) {
        forEach(node.exportClause.elements, checkExportSpecifier);
        const inAmbientExternalModule = node.parent.kind === Syntax.ModuleBlock && is.ambientModule(node.parent.parent);
        const inAmbientNamespaceDeclaration = !inAmbientExternalModule && node.parent.kind === Syntax.ModuleBlock && !node.moduleSpecifier && node.flags & NodeFlags.Ambient;
        if (node.parent.kind !== Syntax.SourceFile && !inAmbientExternalModule && !inAmbientNamespaceDeclaration) error(node, qd.Export_declarations_are_not_permitted_in_a_namespace);
      } else {
        const moduleSymbol = resolveExternalModuleName(node, node.moduleSpecifier!);
        if (moduleSymbol && hasExportAssignmentSymbol(moduleSymbol)) error(node.moduleSpecifier, qd.Module_0_uses_export_and_cannot_be_used_with_export_Asterisk, moduleSymbol.symbolToString());
        else if (node.exportClause) {
          checkAliasSymbol(node.exportClause);
        }
        if (moduleKind !== ModuleKind.System && moduleKind < ModuleKind.ES2015) checkExternalEmitHelpers(node, ExternalEmitHelpers.ExportStar);
      }
    }
  }
  checkGrammarExportDeclaration(node: ExportDeclaration): boolean {
    const isTypeOnlyExportStar = node.isTypeOnly && node.exportClause?.kind !== Syntax.NamedExports;
    if (isTypeOnlyExportStar) grammarErrorOnNode(node, qd.Only_named_exports_may_use_export_type);
    return !isTypeOnlyExportStar;
  }
  checkGrammarModuleElementContext(node: Statement, errorMessage: qd.Message): boolean {
    const isInAppropriateContext = node.parent.kind === Syntax.SourceFile || node.parent.kind === Syntax.ModuleBlock || node.parent.kind === Syntax.ModuleDeclaration;
    if (!isInAppropriateContext) grammarErrorOnFirstToken(node, errorMessage);
    return !isInAppropriateContext;
  }
  checkImportsForTypeOnlyConversion(sourceFile: SourceFile) {
    for (const statement of sourceFile.statements) {
      if (
        is.kind(qc.ImportDeclaration, statement) &&
        statement.importClause &&
        !statement.importClause.isTypeOnly &&
        importClauseContainsReferencedImport(statement.importClause) &&
        !isReferencedAliasDeclaration(statement.importClause, true) &&
        !importClauseContainsConstEnumUsedAsValue(statement.importClause)
      ) {
        error(statement, qd.This_import_is_never_used_as_a_value_and_must_use_import_type_because_the_importsNotUsedAsValues_is_set_to_error);
      }
    }
  }
  checkExportSpecifier(node: ExportSpecifier) {
    checkAliasSymbol(node);
    if (getEmitDeclarations(compilerOptions)) collectLinkedAliases(node.propertyName || node.name, true);
    if (!node.parent.parent.moduleSpecifier) {
      const exportedName = node.propertyName || node.name;
      const symbol = resolveName(exportedName, exportedName.escapedText, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace | qt.SymbolFlags.Alias, undefined, undefined, true);
      if (symbol && (symbol === undefinedSymbol || symbol === globalThisSymbol || isGlobalSourceFile(getDeclarationContainer(symbol.declarations[0]))))
        error(exportedName, qd.Cannot_export_0_Only_local_declarations_can_be_exported_from_a_module, idText(exportedName));
      else {
        markExportAsReferenced(node);
        const target = symbol && (symbol.flags & qt.SymbolFlags.Alias ? this.resolveAlias() : symbol);
        if (!target || target === unknownSymbol || target.flags & qt.SymbolFlags.Value) checkExpressionCached(node.propertyName || node.name);
      }
    }
  }
  checkExportAssignment(node: ExportAssignment) {
    if (checkGrammarModuleElementContext(node, qd.An_export_assignment_can_only_be_used_in_a_module)) return;
    const container = node.parent.kind === Syntax.SourceFile ? node.parent : <ModuleDeclaration>node.parent.parent;
    if (container.kind === Syntax.ModuleDeclaration && !is.ambientModule(container)) {
      if (node.isExportEquals) error(node, qd.An_export_assignment_cannot_be_used_in_a_namespace);
      else {
        error(node, qd.A_default_export_can_only_be_used_in_an_ECMAScript_style_module);
      }
      return;
    }
    if (!checkGrammarDecoratorsAndModifiers(node) && has.effectiveModifiers(node)) grammarErrorOnFirstToken(node, qd.An_export_assignment_cannot_have_modifiers);
    if (node.expression.kind === Syntax.Identifier) {
      const id = node.expression as Identifier;
      const sym = resolveEntityName(id, qt.SymbolFlags.All, true, true, node);
      if (sym) {
        markAliasReferenced(sym, id);
        const target = sym.flags & qt.SymbolFlags.Alias ? sym.resolveAlias() : sym;
        if (target === unknownSymbol || target.flags & qt.SymbolFlags.Value) checkExpressionCached(node.expression);
      }
      if (getEmitDeclarations(compilerOptions)) collectLinkedAliases(node.expression as Identifier, true);
    } else {
      checkExpressionCached(node.expression);
    }
    checkExternalModuleExports(container);
    if (node.flags & NodeFlags.Ambient && !is.entityNameExpression(node.expression))
      grammarErrorOnNode(node.expression, qd.The_expression_of_an_export_assignment_must_be_an_identifier_or_qualified_name_in_an_ambient_context);
    if (node.isExportEquals && !(node.flags & NodeFlags.Ambient)) {
      if (moduleKind >= ModuleKind.ES2015)
        grammarErrorOnNode(node, qd.Export_assignment_cannot_be_used_when_targeting_ECMAScript_modules_Consider_using_export_default_or_another_module_format_instead);
      else if (moduleKind === ModuleKind.System) {
        grammarErrorOnNode(node, qd.Export_assignment_is_not_supported_when_module_flag_is_system);
      }
    }
  }
  checkExternalModuleExports(node: SourceFile | ModuleDeclaration) {
    const moduleSymbol = getSymbolOfNode(node);
    const links = s.getLinks(moduleSymbol);
    if (!links.exportsChecked) {
      const exportEqualsSymbol = moduleSymbol.exports!.get('export=' as qb.__String);
      if (exportEqualsSymbol && hasExportedMembers(moduleSymbol)) {
        const declaration = exportEqualsSymbol.getDeclarationOfAliasSymbol() || exportEqualsSymbol.valueDeclaration;
        if (!isTopLevelInExternalModuleAugmentation(declaration) && !is.inJSFile(declaration)) error(declaration, qd.An_export_assignment_cannot_be_used_in_a_module_with_other_exported_elements);
      }
      const exports = getExportsOfModule(moduleSymbol);
      if (exports) {
        exports.forEach(({ declarations, flags }, id) => {
          if (id === '__export') return;
          if (flags & (SymbolFlags.Namespace | qt.SymbolFlags.Interface | qt.SymbolFlags.Enum)) return;
          const exportedDeclarationsCount = countWhere(declarations, isNotOverloadAndNotAccessor);
          if (flags & qt.SymbolFlags.TypeAlias && exportedDeclarationsCount <= 2) return;
          if (exportedDeclarationsCount > 1) {
            for (const declaration of declarations) {
              if (isNotOverload(declaration)) diagnostics.add(createDiagnosticForNode(declaration, qd.Cannot_redeclare_exported_variable_0, qy.get.unescUnderscores(id)));
            }
          }
        });
      }
      links.exportsChecked = true;
    }
  }
  checkSourceElement(node: Node | undefined): void {
    if (node) {
      const saveCurrentNode = currentNode;
      currentNode = node;
      instantiationCount = 0;
      checkSourceElementWorker(node);
      currentNode = saveCurrentNode;
    }
  }
  checkSourceElementWorker(node: Node): void {
    if (is.inJSFile(node)) forEach((node as DocContainer).doc, ({ tags }) => forEach(tags, checkSourceElement));
    const kind = node.kind;
    if (cancellationToken) {
      switch (kind) {
        case Syntax.ModuleDeclaration:
        case Syntax.ClassDeclaration:
        case Syntax.InterfaceDeclaration:
        case Syntax.FunctionDeclaration:
          cancellationToken.throwIfCancellationRequested();
      }
    }
    if (kind >= Syntax.FirstStatement && kind <= Syntax.LastStatement && node.flowNode && !isReachableFlowNode(node.flowNode))
      errorOrSuggestion(compilerOptions.allowUnreachableCode === false, node, qd.Unreachable_code_detected);
    switch (kind) {
      case Syntax.TypeParameter:
        return checkTypeParameter(<TypeParameterDeclaration>node);
      case Syntax.Parameter:
        return checkParameter(<ParameterDeclaration>node);
      case Syntax.PropertyDeclaration:
        return checkPropertyDeclaration(<PropertyDeclaration>node);
      case Syntax.PropertySignature:
        return checkPropertySignature(<PropertySignature>node);
      case Syntax.FunctionType:
      case Syntax.ConstructorType:
      case Syntax.CallSignature:
      case Syntax.ConstructSignature:
      case Syntax.IndexSignature:
        return checkSignatureDeclaration(<SignatureDeclaration>node);
      case Syntax.MethodDeclaration:
      case Syntax.MethodSignature:
        return checkMethodDeclaration(<MethodDeclaration | MethodSignature>node);
      case Syntax.Constructor:
        return checkConstructorDeclaration(<ConstructorDeclaration>node);
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        return checkAccessorDeclaration(<AccessorDeclaration>node);
      case Syntax.TypeReference:
        return checkTypeReferenceNode(<TypeReferenceNode>node);
      case Syntax.TypePredicate:
        return checkTypePredicate(<TypePredicateNode>node);
      case Syntax.TypeQuery:
        return checkTypeQuery(<TypeQueryNode>node);
      case Syntax.TypeLiteral:
        return checkTypeLiteral(<TypeLiteralNode>node);
      case Syntax.ArrayType:
        return checkArrayType(<ArrayTypeNode>node);
      case Syntax.TupleType:
        return checkTupleType(<TupleTypeNode>node);
      case Syntax.UnionType:
      case Syntax.IntersectionType:
        return checkUnionOrIntersectionType(<UnionOrIntersectionTypeNode>node);
      case Syntax.ParenthesizedType:
      case Syntax.OptionalType:
      case Syntax.RestType:
        return checkSourceElement((<ParenthesizedTypeNode | OptionalTypeNode | RestTypeNode>node).type);
      case Syntax.ThisType:
        return checkThisType(<ThisTypeNode>node);
      case Syntax.TypeOperator:
        return checkTypeOperator(<TypeOperatorNode>node);
      case Syntax.ConditionalType:
        return checkConditionalType(<ConditionalTypeNode>node);
      case Syntax.InferType:
        return checkInferType(<InferTypeNode>node);
      case Syntax.ImportType:
        return checkImportType(<ImportTypeNode>node);
      case Syntax.NamedTupleMember:
        return checkNamedTupleMember(<NamedTupleMember>node);
      case Syntax.DocAugmentsTag:
        return checkDocAugmentsTag(node as DocAugmentsTag);
      case Syntax.DocImplementsTag:
        return checkDocImplementsTag(node as DocImplementsTag);
      case Syntax.DocTypedefTag:
      case Syntax.DocCallbackTag:
      case Syntax.DocEnumTag:
        return checkDocTypeAliasTag(node as DocTypedefTag);
      case Syntax.DocTemplateTag:
        return checkDocTemplateTag(node as DocTemplateTag);
      case Syntax.DocTypeTag:
        return checkDocTypeTag(node as DocTypeTag);
      case Syntax.DocParameterTag:
        return checkDocParameterTag(node as DocParameterTag);
      case Syntax.DocPropertyTag:
        return checkDocPropertyTag(node as DocPropertyTag);
      case Syntax.DocFunctionType:
        checkDocFunctionType(node as DocFunctionType);
      case Syntax.DocNonNullableType:
      case Syntax.DocNullableType:
      case Syntax.DocAllType:
      case Syntax.DocUnknownType:
      case Syntax.DocTypeLiteral:
        checkDocTypeIsInJsFile(node);
        qc.forEach.child(node, checkSourceElement);
        return;
      case Syntax.DocVariadicType:
        checkDocVariadicType(node as DocVariadicType);
        return;
      case Syntax.DocTypeExpression:
        return checkSourceElement((node as DocTypeExpression).type);
      case Syntax.IndexedAccessType:
        return checkIndexedAccessType(<IndexedAccessTypeNode>node);
      case Syntax.MappedType:
        return checkMappedType(<MappedTypeNode>node);
      case Syntax.FunctionDeclaration:
        return checkFunctionDeclaration(<FunctionDeclaration>node);
      case Syntax.Block:
      case Syntax.ModuleBlock:
        return checkBlock(<Block>node);
      case Syntax.VariableStatement:
        return checkVariableStatement(<VariableStatement>node);
      case Syntax.ExpressionStatement:
        return checkExpressionStatement(<ExpressionStatement>node);
      case Syntax.IfStatement:
        return checkIfStatement(<IfStatement>node);
      case Syntax.DoStatement:
        return checkDoStatement(<DoStatement>node);
      case Syntax.WhileStatement:
        return checkWhileStatement(<WhileStatement>node);
      case Syntax.ForStatement:
        return checkForStatement(<ForStatement>node);
      case Syntax.ForInStatement:
        return checkForInStatement(<ForInStatement>node);
      case Syntax.ForOfStatement:
        return checkForOfStatement(<ForOfStatement>node);
      case Syntax.ContinueStatement:
      case Syntax.BreakStatement:
        return checkBreakOrContinueStatement(<BreakOrContinueStatement>node);
      case Syntax.ReturnStatement:
        return checkReturnStatement(<ReturnStatement>node);
      case Syntax.WithStatement:
        return checkWithStatement(<WithStatement>node);
      case Syntax.SwitchStatement:
        return checkSwitchStatement(<SwitchStatement>node);
      case Syntax.LabeledStatement:
        return checkLabeledStatement(<LabeledStatement>node);
      case Syntax.ThrowStatement:
        return checkThrowStatement(<ThrowStatement>node);
      case Syntax.TryStatement:
        return checkTryStatement(<TryStatement>node);
      case Syntax.VariableDeclaration:
        return checkVariableDeclaration(<VariableDeclaration>node);
      case Syntax.BindingElement:
        return checkBindingElement(<BindingElement>node);
      case Syntax.ClassDeclaration:
        return checkClassDeclaration(<ClassDeclaration>node);
      case Syntax.InterfaceDeclaration:
        return checkInterfaceDeclaration(<InterfaceDeclaration>node);
      case Syntax.TypeAliasDeclaration:
        return checkTypeAliasDeclaration(<TypeAliasDeclaration>node);
      case Syntax.EnumDeclaration:
        return checkEnumDeclaration(<EnumDeclaration>node);
      case Syntax.ModuleDeclaration:
        return checkModuleDeclaration(<ModuleDeclaration>node);
      case Syntax.ImportDeclaration:
        return checkImportDeclaration(<ImportDeclaration>node);
      case Syntax.ImportEqualsDeclaration:
        return checkImportEqualsDeclaration(<ImportEqualsDeclaration>node);
      case Syntax.ExportDeclaration:
        return checkExportDeclaration(<ExportDeclaration>node);
      case Syntax.ExportAssignment:
        return checkExportAssignment(<ExportAssignment>node);
      case Syntax.EmptyStatement:
      case Syntax.DebuggerStatement:
        checkGrammarStatementInAmbientContext(node);
        return;
      case Syntax.MissingDeclaration:
        return checkMissingDeclaration(node);
    }
  }
  checkDocTypeIsInJsFile(node: Node): void {
    if (!is.inJSFile(node)) grammarErrorOnNode(node, qd.Doc_types_can_only_be_used_inside_documentation_comments);
  }
  checkDocVariadicType(node: DocVariadicType): void {
    checkDocTypeIsInJsFile(node);
    checkSourceElement(node.type);
    const { parent } = node;
    if (is.kind(qc.ParameterDeclaration, parent) && is.kind(qc.DocFunctionType, parent.parent)) {
      if (last(parent.parent.parameters) !== parent) error(node, qd.A_rest_parameter_must_be_last_in_a_parameter_list);
      return;
    }
    if (!is.kind(qc.DocTypeExpression, parent)) error(node, qd.Doc_may_only_appear_in_the_last_parameter_of_a_signature);
    const paramTag = node.parent.parent;
    if (!is.kind(qc.DocParameterTag, paramTag)) {
      error(node, qd.Doc_may_only_appear_in_the_last_parameter_of_a_signature);
      return;
    }
    const param = getParameterSymbolFromDoc(paramTag);
    if (!param) return;
    const host = get.hostSignatureFromDoc(paramTag);
    if (!host || last(host.parameters).symbol !== param) error(node, qd.A_rest_parameter_must_be_last_in_a_parameter_list);
  }
  checkNodeDeferred(node: Node) {
    const enclosingFile = get.sourceFileOf(node);
    const links = getNodeLinks(enclosingFile);
    if (!(links.flags & NodeCheckFlags.TypeChecked)) {
      links.deferredNodes = links.deferredNodes || new qb.QMap();
      const id = '' + getNodeId(node);
      links.deferredNodes.set(id, node);
    }
  }
  checkDeferredNodes(context: SourceFile) {
    const links = getNodeLinks(context);
    if (links.deferredNodes) links.deferredNodes.forEach(checkDeferredNode);
  }
  checkDeferredNode(node: Node) {
    const saveCurrentNode = currentNode;
    currentNode = node;
    instantiationCount = 0;
    switch (node.kind) {
      case Syntax.CallExpression:
      case Syntax.NewExpression:
      case Syntax.TaggedTemplateExpression:
      case Syntax.Decorator:
      case Syntax.JsxOpeningElement:
        resolveUntypedCall(node as CallLikeExpression);
        break;
      case Syntax.FunctionExpression:
      case Syntax.ArrowFunction:
      case Syntax.MethodDeclaration:
      case Syntax.MethodSignature:
        checkFunctionExpressionOrObjectLiteralMethodDeferred(<FunctionExpression>node);
        break;
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        checkAccessorDeclaration(<AccessorDeclaration>node);
        break;
      case Syntax.ClassExpression:
        checkClassExpressionDeferred(<ClassExpression>node);
        break;
      case Syntax.JsxSelfClosingElement:
        checkJsxSelfClosingElementDeferred(<JsxSelfClosingElement>node);
        break;
      case Syntax.JsxElement:
        checkJsxElementDeferred(<JsxElement>node);
        break;
    }
    currentNode = saveCurrentNode;
  }
  checkSourceFile(node: SourceFile) {
    performance.mark('beforeCheck');
    checkSourceFileWorker(node);
    performance.mark('afterCheck');
    performance.measure('Check', 'beforeCheck', 'afterCheck');
  }
  checkSourceFileWorker(node: SourceFile) {
    const links = getNodeLinks(node);
    if (!(links.flags & NodeCheckFlags.TypeChecked)) {
      if (skipTypeChecking(node, compilerOptions, host)) return;
      checkGrammarSourceFile(node);
      clear(potentialThisCollisions);
      clear(potentialNewTargetCollisions);
      clear(potentialWeakMapCollisions);
      forEach(node.statements, checkSourceElement);
      checkSourceElement(node.endOfFileToken);
      checkDeferredNodes(node);
      if (is.externalOrCommonJsModule(node)) registerForUnusedIdentifiersCheck(node);
      if (!node.isDeclarationFile && (compilerOptions.noUnusedLocals || compilerOptions.noUnusedParameters)) {
        checkUnusedIdentifiers(getPotentiallyUnusedIdentifiers(node), (containingNode, kind, diag) => {
          if (!containsParseError(containingNode) && unusedIsError(kind, !!(containingNode.flags & NodeFlags.Ambient))) diagnostics.add(diag);
        });
      }
      if (compilerOptions.importsNotUsedAsValues === ImportsNotUsedAsValues.Error && !node.isDeclarationFile && is.externalModule(node)) checkImportsForTypeOnlyConversion(node);
      if (is.externalOrCommonJsModule(node)) checkExternalModuleExports(node);
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
  checkExternalEmitHelpers(location: Node, helpers: ExternalEmitHelpers) {
    if ((requestedExternalEmitHelpers & helpers) !== helpers && compilerOptions.importHelpers) {
      const sourceFile = get.sourceFileOf(location);
      if (isEffectiveExternalModule(sourceFile, compilerOptions) && !(location.flags & NodeFlags.Ambient)) {
        const helpersModule = resolveHelpersModule(sourceFile, location);
        if (helpersModule !== unknownSymbol) {
          const uncheckedHelpers = helpers & ~requestedExternalEmitHelpers;
          for (let helper = ExternalEmitHelpers.FirstEmitHelper; helper <= ExternalEmitHelpers.LastEmitHelper; helper <<= 1) {
            if (uncheckedHelpers & helper) {
              const name = getHelperName(helper);
              const symbol = getSymbol(helpersModule.exports!, qy.get.escUnderscores(name), qt.SymbolFlags.Value);
              if (!symbol) error(location, qd.This_syntax_requires_an_imported_helper_named_1_which_does_not_exist_in_0_Consider_upgrading_your_version_of_0, externalHelpersModuleNameText, name);
            }
          }
        }
        requestedExternalEmitHelpers |= helpers;
      }
    }
  }
  checkGrammarDecoratorsAndModifiers(node: Node): boolean {
    return checkGrammarDecorators(node) || checkGrammarModifiers(node);
  }
  checkGrammarDecorators(node: Node): boolean {
    if (!node.decorators) return false;
    if (!nodeCanBeDecorated(node, node.parent, node.parent.parent)) {
      if (node.kind === Syntax.MethodDeclaration && !is.present((<MethodDeclaration>node).body))
        return grammarErrorOnFirstToken(node, qd.A_decorator_can_only_decorate_a_method_implementation_not_an_overload);
      return grammarErrorOnFirstToken(node, qd.Decorators_are_not_valid_here);
    } else if (node.kind === Syntax.GetAccessor || node.kind === Syntax.SetAccessor) {
      const accessors = getAllAccessorDeclarations((<ClassDeclaration>node.parent).members, <AccessorDeclaration>node);
      if (accessors.firstAccessor.decorators && node === accessors.secondAccessor)
        return grammarErrorOnFirstToken(node, qd.Decorators_cannot_be_applied_to_multiple_get_Slashset_accessors_of_the_same_name);
    }
    return false;
  }
  checkGrammarModifiers(node: Node): boolean {
    const quickResult = reportObviousModifierErrors(node);
    if (quickResult !== undefined) return quickResult;
    let lastStatic: Node | undefined, lastDeclare: Node | undefined, lastAsync: Node | undefined, lastReadonly: Node | undefined;
    let flags = ModifierFlags.None;
    for (const modifier of node.modifiers!) {
      if (modifier.kind !== Syntax.ReadonlyKeyword) {
        if (node.kind === Syntax.PropertySignature || node.kind === Syntax.MethodSignature)
          return grammarErrorOnNode(modifier, qd._0_modifier_cannot_appear_on_a_type_member, Token.toString(modifier.kind));
        if (node.kind === Syntax.IndexSignature) return grammarErrorOnNode(modifier, qd._0_modifier_cannot_appear_on_an_index_signature, Token.toString(modifier.kind));
      }
      switch (modifier.kind) {
        case Syntax.ConstKeyword:
          if (node.kind !== Syntax.EnumDeclaration) return grammarErrorOnNode(node, qd.A_class_member_cannot_have_the_0_keyword, Token.toString(Syntax.ConstKeyword));
          break;
        case Syntax.PublicKeyword:
        case Syntax.ProtectedKeyword:
        case Syntax.PrivateKeyword:
          const text = visibilityToString(qy.get.modifierFlag(modifier.kind));
          if (flags & ModifierFlags.AccessibilityModifier) return grammarErrorOnNode(modifier, qd.Accessibility_modifier_already_seen);
          else if (flags & ModifierFlags.Static) return grammarErrorOnNode(modifier, qd._0_modifier_must_precede_1_modifier, text, 'static');
          else if (flags & ModifierFlags.Readonly) return grammarErrorOnNode(modifier, qd._0_modifier_must_precede_1_modifier, text, 'readonly');
          else if (flags & ModifierFlags.Async) return grammarErrorOnNode(modifier, qd._0_modifier_must_precede_1_modifier, text, 'async');
          else if (node.parent.kind === Syntax.ModuleBlock || node.parent.kind === Syntax.SourceFile)
            return grammarErrorOnNode(modifier, qd._0_modifier_cannot_appear_on_a_module_or_namespace_element, text);
          else if (flags & ModifierFlags.Abstract) {
            if (modifier.kind === Syntax.PrivateKeyword) return grammarErrorOnNode(modifier, qd._0_modifier_cannot_be_used_with_1_modifier, text, 'abstract');
            return grammarErrorOnNode(modifier, qd._0_modifier_must_precede_1_modifier, text, 'abstract');
          } else if (node.is.privateIdentifierPropertyDeclaration()) {
            return grammarErrorOnNode(modifier, qd.An_accessibility_modifier_cannot_be_used_with_a_private_identifier);
          }
          flags |= qy.get.modifierFlag(modifier.kind);
          break;
        case Syntax.StaticKeyword:
          if (flags & ModifierFlags.Static) return grammarErrorOnNode(modifier, qd._0_modifier_already_seen, 'static');
          else if (flags & ModifierFlags.Readonly) return grammarErrorOnNode(modifier, qd._0_modifier_must_precede_1_modifier, 'static', 'readonly');
          else if (flags & ModifierFlags.Async) return grammarErrorOnNode(modifier, qd._0_modifier_must_precede_1_modifier, 'static', 'async');
          else if (node.parent.kind === Syntax.ModuleBlock || node.parent.kind === Syntax.SourceFile)
            return grammarErrorOnNode(modifier, qd._0_modifier_cannot_appear_on_a_module_or_namespace_element, 'static');
          else if (node.kind === Syntax.Parameter) return grammarErrorOnNode(modifier, qd._0_modifier_cannot_appear_on_a_parameter, 'static');
          else if (flags & ModifierFlags.Abstract) return grammarErrorOnNode(modifier, qd._0_modifier_cannot_be_used_with_1_modifier, 'static', 'abstract');
          else if (node.is.privateIdentifierPropertyDeclaration()) return grammarErrorOnNode(modifier, qd._0_modifier_cannot_be_used_with_a_private_identifier, 'static');
          flags |= ModifierFlags.Static;
          lastStatic = modifier;
          break;
        case Syntax.ReadonlyKeyword:
          if (flags & ModifierFlags.Readonly) return grammarErrorOnNode(modifier, qd._0_modifier_already_seen, 'readonly');
          else if (node.kind !== Syntax.PropertyDeclaration && node.kind !== Syntax.PropertySignature && node.kind !== Syntax.IndexSignature && node.kind !== Syntax.Parameter)
            return grammarErrorOnNode(modifier, qd.readonly_modifier_can_only_appear_on_a_property_declaration_or_index_signature);
          flags |= ModifierFlags.Readonly;
          lastReadonly = modifier;
          break;
        case Syntax.ExportKeyword:
          if (flags & ModifierFlags.Export) return grammarErrorOnNode(modifier, qd._0_modifier_already_seen, 'export');
          else if (flags & ModifierFlags.Ambient) return grammarErrorOnNode(modifier, qd._0_modifier_must_precede_1_modifier, 'export', 'declare');
          else if (flags & ModifierFlags.Abstract) return grammarErrorOnNode(modifier, qd._0_modifier_must_precede_1_modifier, 'export', 'abstract');
          else if (flags & ModifierFlags.Async) return grammarErrorOnNode(modifier, qd._0_modifier_must_precede_1_modifier, 'export', 'async');
          else if (is.classLike(node.parent)) return grammarErrorOnNode(modifier, qd._0_modifier_cannot_appear_on_a_class_element, 'export');
          else if (node.kind === Syntax.Parameter) return grammarErrorOnNode(modifier, qd._0_modifier_cannot_appear_on_a_parameter, 'export');
          flags |= ModifierFlags.Export;
          break;
        case Syntax.DefaultKeyword:
          const container = node.parent.kind === Syntax.SourceFile ? node.parent : node.parent.parent;
          if (container.kind === Syntax.ModuleDeclaration && !is.ambientModule(container)) return grammarErrorOnNode(modifier, qd.A_default_export_can_only_be_used_in_an_ECMAScript_style_module);
          flags |= ModifierFlags.Default;
          break;
        case Syntax.DeclareKeyword:
          if (flags & ModifierFlags.Ambient) return grammarErrorOnNode(modifier, qd._0_modifier_already_seen, 'declare');
          else if (flags & ModifierFlags.Async) return grammarErrorOnNode(modifier, qd._0_modifier_cannot_be_used_in_an_ambient_context, 'async');
          else if (is.classLike(node.parent) && !is.kind(qc.PropertyDeclaration, node)) return grammarErrorOnNode(modifier, qd._0_modifier_cannot_appear_on_a_class_element, 'declare');
          else if (node.kind === Syntax.Parameter) return grammarErrorOnNode(modifier, qd._0_modifier_cannot_appear_on_a_parameter, 'declare');
          else if (node.parent.flags & NodeFlags.Ambient && node.parent.kind === Syntax.ModuleBlock)
            return grammarErrorOnNode(modifier, qd.A_declare_modifier_cannot_be_used_in_an_already_ambient_context);
          else if (node.is.privateIdentifierPropertyDeclaration()) return grammarErrorOnNode(modifier, qd._0_modifier_cannot_be_used_with_a_private_identifier, 'declare');
          flags |= ModifierFlags.Ambient;
          lastDeclare = modifier;
          break;
        case Syntax.AbstractKeyword:
          if (flags & ModifierFlags.Abstract) return grammarErrorOnNode(modifier, qd._0_modifier_already_seen, 'abstract');
          if (node.kind !== Syntax.ClassDeclaration) {
            if (node.kind !== Syntax.MethodDeclaration && node.kind !== Syntax.PropertyDeclaration && node.kind !== Syntax.GetAccessor && node.kind !== Syntax.SetAccessor)
              return grammarErrorOnNode(modifier, qd.abstract_modifier_can_only_appear_on_a_class_method_or_property_declaration);
            if (!(node.parent.kind === Syntax.ClassDeclaration && has.syntacticModifier(node.parent, ModifierFlags.Abstract)))
              return grammarErrorOnNode(modifier, qd.Abstract_methods_can_only_appear_within_an_abstract_class);
            if (flags & ModifierFlags.Static) return grammarErrorOnNode(modifier, qd._0_modifier_cannot_be_used_with_1_modifier, 'static', 'abstract');
            if (flags & ModifierFlags.Private) return grammarErrorOnNode(modifier, qd._0_modifier_cannot_be_used_with_1_modifier, 'private', 'abstract');
          }
          if (is.namedDeclaration(node) && node.name.kind === Syntax.PrivateIdentifier) return grammarErrorOnNode(modifier, qd._0_modifier_cannot_be_used_with_a_private_identifier, 'abstract');
          flags |= ModifierFlags.Abstract;
          break;
        case Syntax.AsyncKeyword:
          if (flags & ModifierFlags.Async) return grammarErrorOnNode(modifier, qd._0_modifier_already_seen, 'async');
          else if (flags & ModifierFlags.Ambient || node.parent.flags & NodeFlags.Ambient) return grammarErrorOnNode(modifier, qd._0_modifier_cannot_be_used_in_an_ambient_context, 'async');
          else if (node.kind === Syntax.Parameter) return grammarErrorOnNode(modifier, qd._0_modifier_cannot_appear_on_a_parameter, 'async');
          flags |= ModifierFlags.Async;
          lastAsync = modifier;
          break;
      }
    }
    if (node.kind === Syntax.Constructor) {
      if (flags & ModifierFlags.Static) return grammarErrorOnNode(lastStatic!, qd._0_modifier_cannot_appear_on_a_constructor_declaration, 'static');
      if (flags & ModifierFlags.Abstract) return grammarErrorOnNode(lastStatic!, qd._0_modifier_cannot_appear_on_a_constructor_declaration, 'abstract');
      else if (flags & ModifierFlags.Async) return grammarErrorOnNode(lastAsync!, qd._0_modifier_cannot_appear_on_a_constructor_declaration, 'async');
      else if (flags & ModifierFlags.Readonly) return grammarErrorOnNode(lastReadonly!, qd._0_modifier_cannot_appear_on_a_constructor_declaration, 'readonly');
      return false;
    } else if ((node.kind === Syntax.ImportDeclaration || node.kind === Syntax.ImportEqualsDeclaration) && flags & ModifierFlags.Ambient) {
      return grammarErrorOnNode(lastDeclare!, qd.A_0_modifier_cannot_be_used_with_an_import_declaration, 'declare');
    } else if (node.kind === Syntax.Parameter && flags & ModifierFlags.ParameterPropertyModifier && is.kind(qc.BindingPattern, (<ParameterDeclaration>node).name)) {
      return grammarErrorOnNode(node, qd.A_parameter_property_may_not_be_declared_using_a_binding_pattern);
    } else if (node.kind === Syntax.Parameter && flags & ModifierFlags.ParameterPropertyModifier && (<ParameterDeclaration>node).dot3Token) {
      return grammarErrorOnNode(node, qd.A_parameter_property_cannot_be_declared_using_a_rest_parameter);
    }
    if (flags & ModifierFlags.Async) return checkGrammarAsyncModifier(node, lastAsync!);
    return false;
  }
  checkGrammarAsyncModifier(node: Node, asyncModifier: Node): boolean {
    switch (node.kind) {
      case Syntax.MethodDeclaration:
      case Syntax.FunctionDeclaration:
      case Syntax.FunctionExpression:
      case Syntax.ArrowFunction:
        return false;
    }
    return grammarErrorOnNode(asyncModifier, qd._0_modifier_cannot_be_used_here, 'async');
  }
  checkGrammarForDisallowedTrailingComma(list: Nodes<Node> | undefined, diag = qd.Trailing_comma_not_allowed): boolean {
    if (list && list.trailingComma) return grammarErrorAtPos(list[0], list.end - ','.length, ','.length, diag);
    return false;
  }
  checkGrammarTypeParameterList(typeParameters: Nodes<TypeParameterDeclaration> | undefined, file: SourceFile): boolean {
    if (typeParameters && typeParameters.length === 0) {
      const start = typeParameters.pos - '<'.length;
      const end = qy.skipTrivia(file.text, typeParameters.end) + '>'.length;
      return grammarErrorAtPos(file, start, end - start, qd.Type_parameter_list_cannot_be_empty);
    }
    return false;
  }
  checkGrammarParameterList(parameters: Nodes<ParameterDeclaration>) {
    let seenOptionalParameter = false;
    const parameterCount = parameters.length;
    for (let i = 0; i < parameterCount; i++) {
      const parameter = parameters[i];
      if (parameter.dot3Token) {
        if (i !== parameterCount - 1) return grammarErrorOnNode(parameter.dot3Token, qd.A_rest_parameter_must_be_last_in_a_parameter_list);
        if (!(parameter.flags & NodeFlags.Ambient)) checkGrammarForDisallowedTrailingComma(parameters, qd.A_rest_parameter_or_binding_pattern_may_not_have_a_trailing_comma);
        if (parameter.questionToken) return grammarErrorOnNode(parameter.questionToken, qd.A_rest_parameter_cannot_be_optional);
        if (parameter.initer) return grammarErrorOnNode(parameter.name, qd.A_rest_parameter_cannot_have_an_initer);
      } else if (isOptionalParameter(parameter)) {
        seenOptionalParameter = true;
        if (parameter.questionToken && parameter.initer) return grammarErrorOnNode(parameter.name, qd.Parameter_cannot_have_question_mark_and_initer);
      } else if (seenOptionalParameter && !parameter.initer) {
        return grammarErrorOnNode(parameter.name, qd.A_required_parameter_cannot_follow_an_optional_parameter);
      }
    }
  }
  checkGrammarForUseStrictSimpleParameterList(node: FunctionLikeDeclaration): boolean {
    const useStrictDirective = node.body && is.kind(qc.Block, node.body) && findUseStrictPrologue(node.body.statements);
    if (useStrictDirective) {
      const nonSimpleParameters = getNonSimpleParameters(node.parameters);
      if (length(nonSimpleParameters)) {
        forEach(nonSimpleParameters, (parameter) => {
          addRelatedInfo(error(parameter, qd.This_parameter_is_not_allowed_with_use_strict_directive), createDiagnosticForNode(useStrictDirective, qd.use_strict_directive_used_here));
        });
        const diagnostics = nonSimpleParameters.map((parameter, index) =>
          index === 0 ? createDiagnosticForNode(parameter, qd.Non_simple_parameter_declared_here) : createDiagnosticForNode(parameter, qd.and_here)
        ) as [qd.DiagnosticWithLocation, ...qd.DiagnosticWithLocation[]];
        addRelatedInfo(error(useStrictDirective, qd.use_strict_directive_cannot_be_used_with_non_simple_parameter_list), ...diagnostics);
        return true;
      }
    }
    return false;
  }
  checkGrammarFunctionLikeDeclaration(node: FunctionLikeDeclaration | MethodSignature): boolean {
    const file = get.sourceFileOf(node);
    return (
      checkGrammarDecoratorsAndModifiers(node) ||
      checkGrammarTypeParameterList(node.typeParameters, file) ||
      checkGrammarParameterList(node.parameters) ||
      checkGrammarArrowFunction(node, file) ||
      (is.functionLikeDeclaration(node) && checkGrammarForUseStrictSimpleParameterList(node))
    );
  }
  checkGrammarClassLikeDeclaration(node: ClassLikeDeclaration): boolean {
    const file = get.sourceFileOf(node);
    return checkGrammarClassDeclarationHeritageClauses(node) || checkGrammarTypeParameterList(node.typeParameters, file);
  }
  checkGrammarArrowFunction(node: Node, file: SourceFile): boolean {
    if (!is.kind(qc.ArrowFunction, node)) return false;
    const { equalsGreaterThanToken } = node;
    const startLine = qy.get.lineAndCharOf(file, equalsGreaterThanToken.pos).line;
    const endLine = qy.get.lineAndCharOf(file, equalsGreaterThanToken.end).line;
    return startLine !== endLine && grammarErrorOnNode(equalsGreaterThanToken, qd.Line_terminator_not_permitted_before_arrow);
  }
  checkGrammarIndexSignatureParameters(node: SignatureDeclaration): boolean {
    const parameter = node.parameters[0];
    if (node.parameters.length !== 1) {
      if (parameter) return grammarErrorOnNode(parameter.name, qd.An_index_signature_must_have_exactly_one_parameter);
      return grammarErrorOnNode(node, qd.An_index_signature_must_have_exactly_one_parameter);
    }
    checkGrammarForDisallowedTrailingComma(node.parameters, qd.An_index_signature_cannot_have_a_trailing_comma);
    if (parameter.dot3Token) return grammarErrorOnNode(parameter.dot3Token, qd.An_index_signature_cannot_have_a_rest_parameter);
    if (has.effectiveModifiers(parameter)) return grammarErrorOnNode(parameter.name, qd.An_index_signature_parameter_cannot_have_an_accessibility_modifier);
    if (parameter.questionToken) return grammarErrorOnNode(parameter.questionToken, qd.An_index_signature_parameter_cannot_have_a_question_mark);
    if (parameter.initer) return grammarErrorOnNode(parameter.name, qd.An_index_signature_parameter_cannot_have_an_initer);
    if (!parameter.type) return grammarErrorOnNode(parameter.name, qd.An_index_signature_parameter_must_have_a_type_annotation);
    if (parameter.type.kind !== Syntax.StringKeyword && parameter.type.kind !== Syntax.NumberKeyword) {
      const type = getTypeFromTypeNode(parameter.type);
      if (type.flags & qt.TypeFlags.String || type.flags & qt.TypeFlags.Number) {
        return grammarErrorOnNode(
          parameter.name,
          qd.An_index_signature_parameter_type_cannot_be_a_type_alias_Consider_writing_0_Colon_1_Colon_2_instead,
          get.textOf(parameter.name),
          typeToString(type),
          typeToString(node.type ? getTypeFromTypeNode(node.type) : anyType)
        );
      }
      if (type.flags & qt.TypeFlags.Union && allTypesAssignableToKind(type, qt.TypeFlags.StringOrNumberLiteral, true))
        return grammarErrorOnNode(parameter.name, qd.An_index_signature_parameter_type_cannot_be_a_union_type_Consider_using_a_mapped_object_type_instead);
      return grammarErrorOnNode(parameter.name, qd.An_index_signature_parameter_type_must_be_either_string_or_number);
    }
    if (!node.type) return grammarErrorOnNode(node, qd.An_index_signature_must_have_a_type_annotation);
    return false;
  }
  checkGrammarIndexSignature(node: SignatureDeclaration) {
    return checkGrammarDecoratorsAndModifiers(node) || checkGrammarIndexSignatureParameters(node);
  }
  checkGrammarForAtLeastOneTypeArgument(node: Node, typeArguments: Nodes<TypeNode> | undefined): boolean {
    if (typeArguments && typeArguments.length === 0) {
      const sourceFile = get.sourceFileOf(node);
      const start = typeArguments.pos - '<'.length;
      const end = qy.skipTrivia(sourceFile.text, typeArguments.end) + '>'.length;
      return grammarErrorAtPos(sourceFile, start, end - start, qd.Type_argument_list_cannot_be_empty);
    }
    return false;
  }
  checkGrammarTypeArguments(node: Node, typeArguments: Nodes<TypeNode> | undefined): boolean {
    return checkGrammarForDisallowedTrailingComma(typeArguments) || checkGrammarForAtLeastOneTypeArgument(node, typeArguments);
  }
  checkGrammarTaggedTemplateChain(node: TaggedTemplateExpression): boolean {
    if (node.questionDotToken || node.flags & NodeFlags.OptionalChain) return grammarErrorOnNode(node.template, qd.Tagged_template_expressions_are_not_permitted_in_an_optional_chain);
    return false;
  }
  checkGrammarForOmittedArgument(args: Nodes<Expression> | undefined): boolean {
    if (args) {
      for (const arg of args) {
        if (arg.kind === Syntax.OmittedExpression) return grammarErrorAtPos(arg, arg.pos, 0, qd.Argument_expression_expected);
      }
    }
    return false;
  }
  checkGrammarArguments(args: Nodes<Expression> | undefined): boolean {
    return checkGrammarForOmittedArgument(args);
  }
  checkGrammarHeritageClause(node: HeritageClause): boolean {
    const types = node.types;
    if (checkGrammarForDisallowedTrailingComma(types)) return true;
    if (types && types.length === 0) {
      const listType = Token.toString(node.token);
      return grammarErrorAtPos(node, types.pos, 0, qd._0_list_cannot_be_empty, listType);
    }
    return some(types, checkGrammarExpressionWithTypeArguments);
  }
  checkGrammarExpressionWithTypeArguments(node: ExpressionWithTypeArguments) {
    return checkGrammarTypeArguments(node, node.typeArguments);
  }
  checkGrammarClassDeclarationHeritageClauses(node: ClassLikeDeclaration) {
    let seenExtendsClause = false;
    let seenImplementsClause = false;
    if (!checkGrammarDecoratorsAndModifiers(node) && node.heritageClauses) {
      for (const heritageClause of node.heritageClauses) {
        if (heritageClause.token === Syntax.ExtendsKeyword) {
          if (seenExtendsClause) return grammarErrorOnFirstToken(heritageClause, qd.extends_clause_already_seen);
          if (seenImplementsClause) return grammarErrorOnFirstToken(heritageClause, qd.extends_clause_must_precede_implements_clause);
          if (heritageClause.types.length > 1) return grammarErrorOnFirstToken(heritageClause.types[1], qd.Classes_can_only_extend_a_single_class);
          seenExtendsClause = true;
        } else {
          assert(heritageClause.token === Syntax.ImplementsKeyword);
          if (seenImplementsClause) return grammarErrorOnFirstToken(heritageClause, qd.implements_clause_already_seen);
          seenImplementsClause = true;
        }
        checkGrammarHeritageClause(heritageClause);
      }
    }
  }
  checkGrammarInterfaceDeclaration(node: InterfaceDeclaration) {
    let seenExtendsClause = false;
    if (node.heritageClauses) {
      for (const heritageClause of node.heritageClauses) {
        if (heritageClause.token === Syntax.ExtendsKeyword) {
          if (seenExtendsClause) return grammarErrorOnFirstToken(heritageClause, qd.extends_clause_already_seen);
          seenExtendsClause = true;
        } else {
          assert(heritageClause.token === Syntax.ImplementsKeyword);
          return grammarErrorOnFirstToken(heritageClause, qd.Interface_declaration_cannot_have_implements_clause);
        }
        checkGrammarHeritageClause(heritageClause);
      }
    }
    return false;
  }
  checkGrammarComputedPropertyName(node: Node): boolean {
    if (node.kind !== Syntax.ComputedPropertyName) return false;
    const computedPropertyName = <ComputedPropertyName>node;
    if (computedPropertyName.expression.kind === Syntax.BinaryExpression && (<BinaryExpression>computedPropertyName.expression).operatorToken.kind === Syntax.CommaToken)
      return grammarErrorOnNode(computedPropertyName.expression, qd.A_comma_expression_is_not_allowed_in_a_computed_property_name);
    return false;
  }
  checkGrammarForGenerator(node: FunctionLikeDeclaration) {
    if (node.asteriskToken) {
      assert(node.kind === Syntax.FunctionDeclaration || node.kind === Syntax.FunctionExpression || node.kind === Syntax.MethodDeclaration);
      if (node.flags & NodeFlags.Ambient) return grammarErrorOnNode(node.asteriskToken, qd.Generators_are_not_allowed_in_an_ambient_context);
      if (!node.body) return grammarErrorOnNode(node.asteriskToken, qd.An_overload_signature_cannot_be_declared_as_a_generator);
    }
  }
  checkGrammarForInvalidQuestionMark(questionToken: QuestionToken | undefined, message: qd.Message): boolean {
    return !!questionToken && grammarErrorOnNode(questionToken, message);
  }
  checkGrammarForInvalidExclamationToken(exclamationToken: ExclamationToken | undefined, message: qd.Message): boolean {
    return !!exclamationToken && grammarErrorOnNode(exclamationToken, message);
  }
  checkGrammarObjectLiteralExpression(node: ObjectLiteralExpression, inDestructuring: boolean) {
    const seen = qb.createEscapedMap<DeclarationMeaning>();
    for (const prop of node.properties) {
      if (prop.kind === Syntax.SpreadAssignment) {
        if (inDestructuring) {
          const expression = skipParentheses(prop.expression);
          if (isArrayLiteralExpression(expression) || is.kind(qc.ObjectLiteralExpression, expression)) return grammarErrorOnNode(prop.expression, qd.A_rest_element_cannot_contain_a_binding_pattern);
        }
        continue;
      }
      const name = prop.name;
      if (name.kind === Syntax.ComputedPropertyName) checkGrammarComputedPropertyName(name);
      if (prop.kind === Syntax.ShorthandPropertyAssignment && !inDestructuring && prop.objectAssignmentIniter)
        return grammarErrorOnNode(prop.equalsToken!, qd.can_only_be_used_in_an_object_literal_property_inside_a_destructuring_assignment);
      if (name.kind === Syntax.PrivateIdentifier) return grammarErrorOnNode(name, qd.Private_identifiers_are_not_allowed_outside_class_bodies);
      if (prop.modifiers) {
        for (const mod of prop.modifiers!) {
          if (mod.kind !== Syntax.AsyncKeyword || prop.kind !== Syntax.MethodDeclaration) grammarErrorOnNode(mod, qd._0_modifier_cannot_be_used_here, get.textOf(mod));
        }
      }
      let currentKind: DeclarationMeaning;
      switch (prop.kind) {
        case Syntax.ShorthandPropertyAssignment:
          checkGrammarForInvalidExclamationToken(prop.exclamationToken, qd.A_definite_assignment_assertion_is_not_permitted_in_this_context);
        case Syntax.PropertyAssignment:
          checkGrammarForInvalidQuestionMark(prop.questionToken, qd.An_object_member_cannot_be_declared_optional);
          if (name.kind === Syntax.NumericLiteral) checkGrammarNumericLiteral(name);
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
          throw Debug.assertNever(prop, 'Unexpected syntax kind:' + (<Node>prop).kind);
      }
      if (!inDestructuring) {
        const effectiveName = getPropertyNameForPropertyNameNode(name);
        if (effectiveName === undefined) continue;
        const existingKind = seen.get(effectiveName);
        if (!existingKind) seen.set(effectiveName, currentKind);
        else {
          if (currentKind & DeclarationMeaning.PropertyAssignmentOrMethod && existingKind & DeclarationMeaning.PropertyAssignmentOrMethod)
            grammarErrorOnNode(name, qd.Duplicate_identifier_0, get.textOf(name));
          else if (currentKind & DeclarationMeaning.GetOrSetAccessor && existingKind & DeclarationMeaning.GetOrSetAccessor) {
            if (existingKind !== DeclarationMeaning.GetOrSetAccessor && currentKind !== existingKind) seen.set(effectiveName, currentKind | existingKind);
            return grammarErrorOnNode(name, qd.An_object_literal_cannot_have_multiple_get_Slashset_accessors_with_the_same_name);
          }
          return grammarErrorOnNode(name, qd.An_object_literal_cannot_have_property_and_accessor_with_the_same_name);
        }
      }
    }
  }
  checkGrammarJsxElement(node: JsxOpeningLikeElement) {
    checkGrammarTypeArguments(node, node.typeArguments);
    const seen = qb.createEscapedMap<boolean>();
    for (const attr of node.attributes.properties) {
      if (attr.kind === Syntax.JsxSpreadAttribute) continue;
      const { name, initer } = attr;
      if (!seen.get(name.escapedText)) seen.set(name.escapedText, true);
      return grammarErrorOnNode(name, qd.JSX_elements_cannot_have_multiple_attributes_with_the_same_name);
      if (initer && initer.kind === Syntax.JsxExpression && !initer.expression) return grammarErrorOnNode(initer, qd.JSX_attributes_must_only_be_assigned_a_non_empty_expression);
    }
  }
  checkGrammarJsxExpression(node: JsxExpression) {
    if (node.expression && isCommaSequence(node.expression)) return grammarErrorOnNode(node.expression, qd.JSX_expressions_may_not_use_the_comma_operator_Did_you_mean_to_write_an_array);
  }
  checkGrammarForInOrForOfStatement(forInOrOfStatement: ForInOrOfStatement): boolean {
    if (checkGrammarStatementInAmbientContext(forInOrOfStatement)) return true;
    if (forInOrOfStatement.kind === Syntax.ForOfStatement && forInOrOfStatement.awaitModifier) {
      if ((forInOrOfStatement.flags & NodeFlags.AwaitContext) === NodeFlags.None) {
        const sourceFile = get.sourceFileOf(forInOrOfStatement);
        if (!hasParseDiagnostics(sourceFile)) {
          const diagnostic = createDiagnosticForNode(forInOrOfStatement.awaitModifier, qd.A_for_await_of_statement_is_only_allowed_within_an_async_function_or_async_generator);
          const func = get.containingFunction(forInOrOfStatement);
          if (func && func.kind !== Syntax.Constructor) {
            assert((getFunctionFlags(func) & FunctionFlags.Async) === 0, 'Enclosing function should never be an async function.');
            const relatedInfo = createDiagnosticForNode(func, qd.Did_you_mean_to_mark_this_function_as_async);
            addRelatedInfo(diagnostic, relatedInfo);
          }
          diagnostics.add(diagnostic);
          return true;
        }
        return false;
      }
    }
    if (forInOrOfStatement.initer.kind === Syntax.VariableDeclarationList) {
      const variableList = <VariableDeclarationList>forInOrOfStatement.initer;
      if (!checkGrammarVariableDeclarationList(variableList)) {
        const declarations = variableList.declarations;
        if (!declarations.length) return false;
        if (declarations.length > 1) {
          const diagnostic =
            forInOrOfStatement.kind === Syntax.ForInStatement
              ? qd.Only_a_single_variable_declaration_is_allowed_in_a_for_in_statement
              : qd.Only_a_single_variable_declaration_is_allowed_in_a_for_of_statement;
          return grammarErrorOnFirstToken(variableList.declarations[1], diagnostic);
        }
        const firstDeclaration = declarations[0];
        if (firstDeclaration.initer) {
          const diagnostic =
            forInOrOfStatement.kind === Syntax.ForInStatement
              ? qd.The_variable_declaration_of_a_for_in_statement_cannot_have_an_initer
              : qd.The_variable_declaration_of_a_for_of_statement_cannot_have_an_initer;
          return grammarErrorOnNode(firstDeclaration.name, diagnostic);
        }
        if (firstDeclaration.type) {
          const diagnostic =
            forInOrOfStatement.kind === Syntax.ForInStatement
              ? qd.The_left_hand_side_of_a_for_in_statement_cannot_use_a_type_annotation
              : qd.The_left_hand_side_of_a_for_of_statement_cannot_use_a_type_annotation;
          return grammarErrorOnNode(firstDeclaration, diagnostic);
        }
      }
    }
    return false;
  }
  checkGrammarAccessor(accessor: AccessorDeclaration): boolean {
    if (!(accessor.flags & NodeFlags.Ambient)) {
      if (accessor.body === undefined && !has.syntacticModifier(accessor, ModifierFlags.Abstract)) return grammarErrorAtPos(accessor, accessor.end - 1, ';'.length, qd._0_expected, '{');
    }
    if (accessor.body && has.syntacticModifier(accessor, ModifierFlags.Abstract)) return grammarErrorOnNode(accessor, qd.An_abstract_accessor_cannot_have_an_implementation);
    if (accessor.typeParameters) return grammarErrorOnNode(accessor.name, qd.An_accessor_cannot_have_type_parameters);
    if (!doesAccessorHaveCorrectParameterCount(accessor))
      return grammarErrorOnNode(accessor.name, accessor.kind === Syntax.GetAccessor ? qd.A_get_accessor_cannot_have_parameters : qd.A_set_accessor_must_have_exactly_one_parameter);
    if (accessor.kind === Syntax.SetAccessor) {
      if (accessor.type) return grammarErrorOnNode(accessor.name, qd.A_set_accessor_cannot_have_a_return_type_annotation);
      const parameter = Debug.checkDefined(getSetAccessorValueParameter(accessor), 'Return value does not match parameter count assertion.');
      if (parameter.dot3Token) return grammarErrorOnNode(parameter.dot3Token, qd.A_set_accessor_cannot_have_rest_parameter);
      if (parameter.questionToken) return grammarErrorOnNode(parameter.questionToken, qd.A_set_accessor_cannot_have_an_optional_parameter);
      if (parameter.initer) return grammarErrorOnNode(accessor.name, qd.A_set_accessor_parameter_cannot_have_an_initer);
    }
    return false;
  }
  checkGrammarTypeOperatorNode(node: TypeOperatorNode) {
    if (node.operator === Syntax.UniqueKeyword) {
      if (node.type.kind !== Syntax.SymbolKeyword) return grammarErrorOnNode(node.type, qd._0_expected, Token.toString(Syntax.SymbolKeyword));
      let parent = walkUpParenthesizedTypes(node.parent);
      if (is.inJSFile(parent) && is.kind(qc.DocTypeExpression, parent)) {
        parent = parent.parent;
        if (is.kind(qc.DocTypeTag, parent)) parent = parent.parent.parent;
      }
      switch (parent.kind) {
        case Syntax.VariableDeclaration:
          const decl = parent as VariableDeclaration;
          if (decl.name.kind !== Syntax.Identifier) return grammarErrorOnNode(node, qd.unique_symbol_types_may_not_be_used_on_a_variable_declaration_with_a_binding_name);
          if (!is.variableDeclarationInVariableStatement(decl)) return grammarErrorOnNode(node, qd.unique_symbol_types_are_only_allowed_on_variables_in_a_variable_statement);
          if (!(decl.parent.flags & NodeFlags.Const)) return grammarErrorOnNode((<VariableDeclaration>parent).name, qd.A_variable_whose_type_is_a_unique_symbol_type_must_be_const);
          break;
        case Syntax.PropertyDeclaration:
          if (!has.syntacticModifier(parent, ModifierFlags.Static) || !has.effectiveModifier(parent, ModifierFlags.Readonly))
            return grammarErrorOnNode((<PropertyDeclaration>parent).name, qd.A_property_of_a_class_whose_type_is_a_unique_symbol_type_must_be_both_static_and_readonly);
          break;
        case Syntax.PropertySignature:
          if (!has.syntacticModifier(parent, ModifierFlags.Readonly))
            return grammarErrorOnNode((<PropertySignature>parent).name, qd.A_property_of_an_interface_or_type_literal_whose_type_is_a_unique_symbol_type_must_be_readonly);
          break;
        default:
          return grammarErrorOnNode(node, qd.unique_symbol_types_are_not_allowed_here);
      }
    } else if (node.operator === Syntax.ReadonlyKeyword) {
      if (node.type.kind !== Syntax.ArrayType && node.type.kind !== Syntax.TupleType)
        return grammarErrorOnFirstToken(node, qd.readonly_type_modifier_is_only_permitted_on_array_and_tuple_literal_types, Token.toString(Syntax.SymbolKeyword));
    }
  }
  checkGrammarForInvalidDynamicName(node: DeclarationName, message: qd.Message) {
    if (isNonBindableDynamicName(node)) return grammarErrorOnNode(node, message);
  }
  checkGrammarMethod(node: MethodDeclaration | MethodSignature) {
    if (checkGrammarFunctionLikeDeclaration(node)) return true;
    if (node.kind === Syntax.MethodDeclaration) {
      if (node.parent.kind === Syntax.ObjectLiteralExpression) {
        if (node.modifiers && !(node.modifiers.length === 1 && first(node.modifiers).kind === Syntax.AsyncKeyword)) return grammarErrorOnFirstToken(node, qd.Modifiers_cannot_appear_here);
        else if (checkGrammarForInvalidQuestionMark(node.questionToken, qd.An_object_member_cannot_be_declared_optional)) return true;
        else if (checkGrammarForInvalidExclamationToken(node.exclamationToken, qd.A_definite_assignment_assertion_is_not_permitted_in_this_context)) return true;
        else if (node.body === undefined) return grammarErrorAtPos(node, node.end - 1, ';'.length, qd._0_expected, '{');
      }
      if (checkGrammarForGenerator(node)) return true;
    }
    if (is.classLike(node.parent)) {
      if (node.flags & NodeFlags.Ambient) {
        return checkGrammarForInvalidDynamicName(node.name, qd.A_computed_property_name_in_an_ambient_context_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type);
      } else if (node.kind === Syntax.MethodDeclaration && !node.body) {
        return checkGrammarForInvalidDynamicName(node.name, qd.A_computed_property_name_in_a_method_overload_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type);
      }
    } else if (node.parent.kind === Syntax.InterfaceDeclaration) {
      return checkGrammarForInvalidDynamicName(node.name, qd.A_computed_property_name_in_an_interface_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type);
    } else if (node.parent.kind === Syntax.TypeLiteral) {
      return checkGrammarForInvalidDynamicName(node.name, qd.A_computed_property_name_in_a_type_literal_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type);
    }
  }
  checkGrammarBreakOrContinueStatement(node: BreakOrContinueStatement): boolean {
    let current: Node = node;
    while (current) {
      if (is.functionLike(current)) return grammarErrorOnNode(node, qd.Jump_target_cannot_cross_function_boundary);
      switch (current.kind) {
        case Syntax.LabeledStatement:
          if (node.label && (<LabeledStatement>current).label.escapedText === node.label.escapedText) {
            const isMisplacedContinueLabel = node.kind === Syntax.ContinueStatement && !is.iterationStatement((<LabeledStatement>current).statement, true);
            if (isMisplacedContinueLabel) return grammarErrorOnNode(node, qd.A_continue_statement_can_only_jump_to_a_label_of_an_enclosing_iteration_statement);
            return false;
          }
          break;
        case Syntax.SwitchStatement:
          if (node.kind === Syntax.BreakStatement && !node.label) return false;
          break;
        default:
          if (is.iterationStatement(current, false) && !node.label) return false;
          break;
      }
      current = current.parent;
    }
    if (node.label) {
      const message =
        node.kind === Syntax.BreakStatement
          ? qd.A_break_statement_can_only_jump_to_a_label_of_an_enclosing_statement
          : qd.A_continue_statement_can_only_jump_to_a_label_of_an_enclosing_iteration_statement;
      return grammarErrorOnNode(node, message);
    } else {
      const message =
        node.kind === Syntax.BreakStatement
          ? qd.A_break_statement_can_only_be_used_within_an_enclosing_iteration_or_switch_statement
          : qd.A_continue_statement_can_only_be_used_within_an_enclosing_iteration_statement;
      return grammarErrorOnNode(node, message);
    }
  }
  checkGrammarBindingElement(node: BindingElement) {
    if (node.dot3Token) {
      const elements = node.parent.elements;
      if (node !== last(elements)) return grammarErrorOnNode(node, qd.A_rest_element_must_be_last_in_a_destructuring_pattern);
      checkGrammarForDisallowedTrailingComma(elements, qd.A_rest_parameter_or_binding_pattern_may_not_have_a_trailing_comma);
      if (node.propertyName) return grammarErrorOnNode(node.name, qd.A_rest_element_cannot_have_a_property_name);
      if (node.initer) return grammarErrorAtPos(node, node.initer.pos - 1, 1, qd.A_rest_element_cannot_have_an_initer);
    }
    return;
  }
  checkAmbientIniter(node: VariableDeclaration | PropertyDeclaration | PropertySignature) {
    const { initer } = node;
    if (initer) {
      const isInvalidIniter = !(
        StringLiteral.orNumberLiteralExpression(initer) ||
        isSimpleLiteralEnumReference(initer) ||
        initer.kind === Syntax.TrueKeyword ||
        initer.kind === Syntax.FalseKeyword ||
        BigIntLiteral.expression(initer)
      );
      const isConstOrReadonly = isDeclarationReadonly(node) || (is.kind(qc.VariableDeclaration, node) && is.varConst(node));
      if (isConstOrReadonly && !node.type) {
        if (isInvalidIniter) return grammarErrorOnNode(initer, qd.A_const_initer_in_an_ambient_context_must_be_a_string_or_numeric_literal_or_literal_enum_reference);
      }
      return grammarErrorOnNode(initer, qd.Initers_are_not_allowed_in_ambient_contexts);
      if (!isConstOrReadonly || isInvalidIniter) return grammarErrorOnNode(initer, qd.Initers_are_not_allowed_in_ambient_contexts);
    }
    return;
  }
  checkGrammarVariableDeclaration(node: VariableDeclaration) {
    if (node.parent.parent.kind !== Syntax.ForInStatement && node.parent.parent.kind !== Syntax.ForOfStatement) {
      if (node.flags & NodeFlags.Ambient) checkAmbientIniter(node);
      else if (!node.initer) {
        if (is.kind(qc.BindingPattern, node.name) && !is.kind(qc.BindingPattern, node.parent)) return grammarErrorOnNode(node, qd.A_destructuring_declaration_must_have_an_initer);
        if (is.varConst(node)) return grammarErrorOnNode(node, qd.const_declarations_must_be_initialized);
      }
    }
    if (node.exclamationToken && (node.parent.parent.kind !== Syntax.VariableStatement || !node.type || node.initer || node.flags & NodeFlags.Ambient))
      return grammarErrorOnNode(node.exclamationToken, qd.Definite_assignment_assertions_can_only_be_used_along_with_a_type_annotation);
    const moduleKind = getEmitModuleKind(compilerOptions);
    if (
      moduleKind < ModuleKind.ES2015 &&
      moduleKind !== ModuleKind.System &&
      !compilerOptions.noEmit &&
      !(node.parent.parent.flags & NodeFlags.Ambient) &&
      has.syntacticModifier(node.parent.parent, ModifierFlags.Export)
    ) {
      checkESModuleMarker(node.name);
    }
    const checkLetConstNames = is.aLet(node) || is.varConst(node);
    return checkLetConstNames && checkGrammarNameInLetOrConstDeclarations(node.name);
  }
  checkESModuleMarker(name: Identifier | BindingPattern): boolean {
    if (name.kind === Syntax.Identifier) {
      if (idText(name) === '__esModule') return grammarErrorOnNode(name, qd.Identifier_expected_esModule_is_reserved_as_an_exported_marker_when_transforming_ECMAScript_modules);
    } else {
      const elements = name.elements;
      for (const element of elements) {
        if (!is.kind(qc.OmittedExpression, element)) return checkESModuleMarker(element.name);
      }
    }
    return false;
  }
  checkGrammarNameInLetOrConstDeclarations(name: Identifier | BindingPattern): boolean {
    if (name.kind === Syntax.Identifier) {
      if (name.originalKeywordKind === Syntax.LetKeyword) return grammarErrorOnNode(name, qd.let_is_not_allowed_to_be_used_as_a_name_in_let_or_const_declarations);
    } else {
      const elements = name.elements;
      for (const element of elements) {
        if (!is.kind(qc.OmittedExpression, element)) checkGrammarNameInLetOrConstDeclarations(element.name);
      }
    }
    return false;
  }
  checkGrammarVariableDeclarationList(declarationList: VariableDeclarationList): boolean {
    const declarations = declarationList.declarations;
    if (checkGrammarForDisallowedTrailingComma(declarationList.declarations)) return true;
    if (!declarationList.declarations.length) return grammarErrorAtPos(declarationList, declarations.pos, declarations.end - declarations.pos, qd.Variable_declaration_list_cannot_be_empty);
    return false;
  }
  checkGrammarForDisallowedLetOrConstStatement(node: VariableStatement) {
    if (!allowLetAndConstDeclarations(node.parent)) {
      if (is.aLet(node.declarationList)) return grammarErrorOnNode(node, qd.let_declarations_can_only_be_declared_inside_a_block);
      else if (is.varConst(node.declarationList)) return grammarErrorOnNode(node, qd.const_declarations_can_only_be_declared_inside_a_block);
    }
  }
  checkGrammarMetaProperty(node: MetaProperty) {
    const escapedText = node.name.escapedText;
    switch (node.keywordToken) {
      case Syntax.NewKeyword:
        if (escapedText !== 'target')
          return grammarErrorOnNode(node.name, qd._0_is_not_a_valid_meta_property_for_keyword_1_Did_you_mean_2, node.name.escapedText, Token.toString(node.keywordToken), 'target');
        break;
      case Syntax.ImportKeyword:
        if (escapedText !== 'meta')
          return grammarErrorOnNode(node.name, qd._0_is_not_a_valid_meta_property_for_keyword_1_Did_you_mean_2, node.name.escapedText, Token.toString(node.keywordToken), 'meta');
        break;
    }
  }
  checkGrammarConstructorTypeParameters(node: ConstructorDeclaration) {
    const jsdocTypeParameters = is.inJSFile(node) ? qc.getDoc.typeParameterDeclarations(node) : undefined;
    const range = node.typeParameters || (jsdocTypeParameters && firstOrUndefined(jsdocTypeParameters));
    if (range) {
      const pos = range.pos === range.end ? range.pos : qy.skipTrivia(get.sourceFileOf(node).text, range.pos);
      return grammarErrorAtPos(node, pos, range.end - pos, qd.Type_parameters_cannot_appear_on_a_constructor_declaration);
    }
  }
  checkGrammarConstructorTypeAnnotation(node: ConstructorDeclaration) {
    const type = getEffectiveReturnTypeNode(node);
    if (type) return grammarErrorOnNode(type, qd.Type_annotation_cannot_appear_on_a_constructor_declaration);
  }
  checkGrammarProperty(node: PropertyDeclaration | PropertySignature) {
    if (is.classLike(node.parent)) {
      if (is.kind(qc.StringLiteral, node.name) && node.name.text === 'constructor') return grammarErrorOnNode(node.name, qd.Classes_may_not_have_a_field_named_constructor);
      if (checkGrammarForInvalidDynamicName(node.name, qd.A_computed_property_name_in_a_class_property_declaration_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type)) {
        return true;
      }
    } else if (node.parent.kind === Syntax.InterfaceDeclaration) {
      if (checkGrammarForInvalidDynamicName(node.name, qd.A_computed_property_name_in_an_interface_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type)) return true;
      if (node.initer) return grammarErrorOnNode(node.initer, qd.An_interface_property_cannot_have_an_initer);
    } else if (node.parent.kind === Syntax.TypeLiteral) {
      if (checkGrammarForInvalidDynamicName(node.name, qd.A_computed_property_name_in_a_type_literal_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type)) return true;
      if (node.initer) return grammarErrorOnNode(node.initer, qd.A_type_literal_property_cannot_have_an_initer);
    }
    if (node.flags & NodeFlags.Ambient) checkAmbientIniter(node);
    if (
      is.kind(qc.PropertyDeclaration, node) &&
      node.exclamationToken &&
      (!is.classLike(node.parent) || !node.type || node.initer || node.flags & NodeFlags.Ambient || has.syntacticModifier(node, ModifierFlags.Static | ModifierFlags.Abstract))
    ) {
      return grammarErrorOnNode(node.exclamationToken, qd.A_definite_assignment_assertion_is_not_permitted_in_this_context);
    }
  }
  checkGrammarTopLevelElementForRequiredDeclareModifier(node: Node): boolean {
    if (
      node.kind === Syntax.InterfaceDeclaration ||
      node.kind === Syntax.TypeAliasDeclaration ||
      node.kind === Syntax.ImportDeclaration ||
      node.kind === Syntax.ImportEqualsDeclaration ||
      node.kind === Syntax.ExportDeclaration ||
      node.kind === Syntax.ExportAssignment ||
      node.kind === Syntax.NamespaceExportDeclaration ||
      has.syntacticModifier(node, ModifierFlags.Ambient | ModifierFlags.Export | ModifierFlags.Default)
    ) {
      return false;
    }
    return grammarErrorOnFirstToken(node, qd.Top_level_declarations_in_d_ts_files_must_start_with_either_a_declare_or_export_modifier);
  }
  checkGrammarTopLevelElementsForRequiredDeclareModifier(file: SourceFile): boolean {
    for (const decl of file.statements) {
      if (is.declaration(decl) || decl.kind === Syntax.VariableStatement) {
        if (checkGrammarTopLevelElementForRequiredDeclareModifier(decl)) return true;
      }
    }
    return false;
  }
  checkGrammarSourceFile(node: SourceFile): boolean {
    return !!(node.flags & NodeFlags.Ambient) && checkGrammarTopLevelElementsForRequiredDeclareModifier(node);
  }
  checkGrammarStatementInAmbientContext(node: Node): boolean {
    if (node.flags & NodeFlags.Ambient) {
      const links = getNodeLinks(node);
      if (!links.hasReportedStatementInAmbientContext && (is.functionLike(node.parent) || is.accessor(node.parent)))
        return (getNodeLinks(node).hasReportedStatementInAmbientContext = grammarErrorOnFirstToken(node, qd.An_implementation_cannot_be_declared_in_ambient_contexts));
      if (node.parent.kind === Syntax.Block || node.parent.kind === Syntax.ModuleBlock || node.parent.kind === Syntax.SourceFile) {
        const links = getNodeLinks(node.parent);
        if (!links.hasReportedStatementInAmbientContext) return (links.hasReportedStatementInAmbientContext = grammarErrorOnFirstToken(node, qd.Statements_are_not_allowed_in_ambient_contexts));
      } else {
      }
    }
    return false;
  }
  checkGrammarNumericLiteral(node: NumericLiteral): boolean {
    if (node.numericLiteralFlags & TokenFlags.Octal) {
      const diagnosticMessage = qd.Octal_literals_are_not_available_when_targeting_ECMAScript_5_and_higher_Use_the_syntax_0;
      const withMinus = is.kind(qc.PrefixUnaryExpression, node.parent) && node.parent.operator === Syntax.MinusToken;
      const literal = (withMinus ? '-' : '') + '0o' + node.text;
      return grammarErrorOnNode(withMinus ? node.parent : node, diagnosticMessage, literal);
    }
    checkNumericLiteralValueSize(node);
    return false;
  }
  checkNumericLiteralValueSize(node: NumericLiteral) {
    if (node.numericLiteralFlags & TokenFlags.Scientific || node.text.length <= 15 || node.text.indexOf('.') !== -1) return;
    const apparentValue = +get.textOf(node);
    if (apparentValue <= 2 ** 53 - 1 && apparentValue + 1 > apparentValue) return;
    addErrorOrSuggestion(false, createDiagnosticForNode(node, qd.Numeric_literals_with_absolute_values_equal_to_2_53_or_greater_are_too_large_to_be_represented_accurately_as_integers));
  }
  checkGrammarBigIntLiteral(node: BigIntLiteral): boolean {
    const literalType = is.kind(qc.LiteralTypeNode, node.parent) || (is.kind(qc.PrefixUnaryExpression, node.parent) && is.kind(qc.LiteralTypeNode, node.parent.parent));
    return false;
  }
  checkGrammarImportClause(node: ImportClause): boolean {
    if (node.isTypeOnly && node.name && node.namedBindings) return grammarErrorOnNode(node, qd.A_type_only_import_can_specify_a_default_import_or_named_bindings_but_not_both);
    return false;
  }
  checkGrammarImportCallExpression(node: ImportCall): boolean {
    if (moduleKind === ModuleKind.ES2015) return grammarErrorOnNode(node, qd.Dynamic_imports_are_only_supported_when_the_module_flag_is_set_to_es2020_esnext_commonjs_amd_system_or_umd);
    if (node.typeArguments) return grammarErrorOnNode(node, qd.Dynamic_import_cannot_have_type_arguments);
    const nodeArguments = node.arguments;
    if (nodeArguments.length !== 1) return grammarErrorOnNode(node, qd.Dynamic_import_must_have_one_specifier_as_an_argument);
    checkGrammarForDisallowedTrailingComma(nodeArguments);
    if (is.kind(qc.SpreadElement, nodeArguments[0])) return grammarErrorOnNode(nodeArguments[0], qd.Specifier_of_dynamic_import_cannot_be_spread_element);
    return false;
  }
})();
