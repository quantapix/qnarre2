import * as qc from '../core';
import * as qd from '../diagnostic';
import * as qg from '../debug';
import { ExpandingFlags, Node, ObjectFlags, SymbolFlags, TypeFlags, VarianceFlags } from './type';
import * as qt from './type';
import * as qu from '../util';
import { ModifierFlags, Syntax } from '../syntax';
import * as qy from '../syntax';
import { Symbol } from './symbol';
import { Tget } from './get';
import { Thas, Tis } from './predicate';
export function newCheck(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Tget;
    has: Thas;
    is: Tis;
  }
  const qf = f as Frame;
  return (qf.check = new (class {
    andReportErrorForMissingPrefix(errorLocation: Node, name: qu.__String, nameArg: qu.__String | qc.Identifier): boolean {
      if (!qf.is.kind(qc.Identifier, errorLocation) || errorLocation.escapedText !== name || isTypeReferenceIdentifier(errorLocation) || isInTypeQuery(errorLocation)) return false;
      const container = qf.get.thisContainer(errorLocation, false);
      let location = container;
      while (location) {
        if (qf.is.classLike(location.parent)) {
          const classSymbol = getSymbolOfNode(location.parent);
          if (!classSymbol) break;
          const constructorType = getTypeOfSymbol(classSymbol);
          if (getPropertyOfType(constructorType, name)) {
            qf.error(errorLocation, qd.msgs.Cannot_find_name_0_Did_you_mean_the_static_member_1_0, diagnosticName(nameArg), classSymbol.symbolToString());
            return true;
          }
          if (location === container && !qf.has.syntacticModifier(location, ModifierFlags.Static)) {
            const instanceType = (<InterfaceType>getDeclaredTypeOfSymbol(classSymbol)).thisType!;
            if (getPropertyOfType(instanceType, name)) {
              qf.error(errorLocation, qd.msgs.Cannot_find_name_0_Did_you_mean_the_instance_member_this_0, diagnosticName(nameArg));
              return true;
            }
          }
        }
        location = location.parent;
      }
      return false;
    }
    andReportErrorForExtendingInterface(errorLocation: Node): boolean {
      const expression = getEntityNameForExtendingInterface(errorLocation);
      if (expression && resolveEntityName(expression, qt.SymbolFlags.Interface, true)) {
        error(errorLocation, qd.msgs.Cannot_extend_an_interface_0_Did_you_mean_implements, qf.get.textOf(expression));
        return true;
      }
      return false;
    }
    andReportErrorForUsingTypeAsNamespace(errorLocation: Node, name: qu.__String, meaning: qt.SymbolFlags): boolean {
      const namespaceMeaning = qt.SymbolFlags.Namespace | (qf.is.inJSFile(errorLocation) ? qt.SymbolFlags.Value : 0);
      if (meaning === namespaceMeaning) {
        const symbol = resolveSymbol(resolveName(errorLocation, name, qt.SymbolFlags.Type & ~namespaceMeaning, undefined, undefined, false));
        const parent = errorLocation.parent;
        if (symbol) {
          if (qf.is.kind(qc.QualifiedName, parent)) {
            qu.assert(parent.left === errorLocation, 'Should only be resolving left side of qualified name as a namespace');
            const propName = parent.right.escapedText;
            const propType = getPropertyOfType(getDeclaredTypeOfSymbol(symbol), propName);
            if (propType) {
              error(
                parent,
                qd.msgs.Cannot_access_0_1_because_0_is_a_type_but_not_a_namespace_Did_you_mean_to_retrieve_the_type_of_the_property_1_in_0_with_0_1,
                qy.qf.get.unescUnderscores(name),
                qy.qf.get.unescUnderscores(propName)
              );
              return true;
            }
          }
          error(errorLocation, qd.msgs._0_only_refers_to_a_type_but_is_being_used_as_a_namespace_here, qy.qf.get.unescUnderscores(name));
          return true;
        }
      }
      return false;
    }
    andReportErrorForUsingValueAsType(errorLocation: Node, name: qu.__String, meaning: qt.SymbolFlags): boolean {
      if (meaning & (SymbolFlags.Type & ~SymbolFlags.Namespace)) {
        const x = resolveName(errorLocation, name, ~SymbolFlags.Type & qt.SymbolFlags.Value, undefined, undefined, false);
        const symbol = resolveSymbol(x);
        if (symbol && !(symbol.flags & qt.SymbolFlags.Namespace)) {
          error(errorLocation, qd.msgs._0_refers_to_a_value_but_is_being_used_as_a_type_here_Did_you_mean_typeof_0, qy.qf.get.unescUnderscores(name));
          return true;
        }
      }
      return false;
    }
    andReportErrorForExportingPrimitiveType(errorLocation: Node, name: qu.__String): boolean {
      if (isPrimitiveTypeName(name) && errorLocation.parent.kind === Syntax.ExportSpecifier) {
        error(errorLocation, qd.msgs.Cannot_export_0_Only_local_declarations_can_be_exported_from_a_module, name as string);
        return true;
      }
      return false;
    }
    andReportErrorForUsingTypeAsValue(errorLocation: Node, name: qu.__String, meaning: qt.SymbolFlags): boolean {
      if (meaning & (SymbolFlags.Value & ~SymbolFlags.NamespaceModule)) {
        if (isPrimitiveTypeName(name)) {
          error(errorLocation, qd.msgs._0_only_refers_to_a_type_but_is_being_used_as_a_value_here, qy.qf.get.unescUnderscores(name));
          return true;
        }
        const x = resolveName(errorLocation, name, qt.SymbolFlags.Type & ~SymbolFlags.Value, undefined, undefined, false);
        const symbol = resolveSymbol(x);
        if (symbol && !(symbol.flags & qt.SymbolFlags.NamespaceModule)) {
          const message = isES2015OrLaterConstructorName(name)
            ? qd.msgs._0_only_refers_to_a_type_but_is_being_used_as_a_value_here_Do_you_need_to_change_your_target_library_Try_changing_the_lib_compiler_option_to_es2015_or_later
            : qd.msgs._0_only_refers_to_a_type_but_is_being_used_as_a_value_here;
          error(errorLocation, message, qy.qf.get.unescUnderscores(name));
          return true;
        }
      }
      return false;
    }
    andReportErrorForUsingNamespaceModuleAsValue(errorLocation: Node, name: qu.__String, meaning: qt.SymbolFlags): boolean {
      if (meaning & (SymbolFlags.Value & ~SymbolFlags.NamespaceModule & ~SymbolFlags.Type)) {
        const x = resolveName(errorLocation, name, qt.SymbolFlags.NamespaceModule & ~SymbolFlags.Value, undefined, undefined, false);
        const symbol = resolveSymbol(x);
        if (symbol) {
          error(errorLocation, qd.msgs.Cannot_use_namespace_0_as_a_value, qy.qf.get.unescUnderscores(name));
          return true;
        }
      } else if (meaning & (SymbolFlags.Type & ~SymbolFlags.NamespaceModule & ~SymbolFlags.Value)) {
        const x = resolveName(errorLocation, name, (SymbolFlags.ValueModule | qt.SymbolFlags.NamespaceModule) & ~SymbolFlags.Type, undefined, undefined, false);
        const symbol = resolveSymbol(x);
        if (symbol) {
          error(errorLocation, qd.msgs.Cannot_use_namespace_0_as_a_type, qy.qf.get.unescUnderscores(name));
          return true;
        }
      }
      return false;
    }
    resolvedBlockScopedVariable(result: Symbol, errorLocation: Node): void {
      qu.assert(!!(result.flags & qt.SymbolFlags.BlockScopedVariable || result.flags & qt.SymbolFlags.Class || result.flags & qt.SymbolFlags.Enum));
      if (result.flags & (SymbolFlags.Function | qt.SymbolFlags.FunctionScopedVariable | qt.SymbolFlags.Assignment) && result.flags & qt.SymbolFlags.Class) return;
      const declaration = find(result.declarations, (d) => isBlockOrCatchScoped(d) || qf.is.classLike(d) || d.kind === Syntax.EnumDeclaration);
      if (declaration === undefined) return qu.fail('checkResolvedBlockScopedVariable could not find block-scoped declaration');
      if (!(declaration.flags & NodeFlags.Ambient) && !isBlockScopedNameDeclaredBeforeUse(declaration, errorLocation)) {
        let diagnosticMessage;
        const declarationName = declarationNameToString(qf.get.nameOfDeclaration(declaration));
        if (result.flags & qt.SymbolFlags.BlockScopedVariable) diagnosticMessage = error(errorLocation, qd.msgs.Block_scoped_variable_0_used_before_its_declaration, declarationName);
        else if (result.flags & qt.SymbolFlags.Class) {
          diagnosticMessage = error(errorLocation, qd.msgs.Class_0_used_before_its_declaration, declarationName);
        } else if (result.flags & qt.SymbolFlags.RegularEnum) {
          diagnosticMessage = error(errorLocation, qd.msgs.Enum_0_used_before_its_declaration, declarationName);
        } else {
          qu.assert(!!(result.flags & qt.SymbolFlags.ConstEnum));
          if (compilerOptions.preserveConstEnums) diagnosticMessage = error(errorLocation, qd.msgs.Enum_0_used_before_its_declaration, declarationName);
        }
        if (diagnosticMessage) addRelatedInfo(diagnosticMessage, qf.create.diagnosticForNode(declaration, qd.msgs._0_is_declared_here, declarationName));
      }
    }
    andReportErrorForResolvingImportAliasToTypeOnlySymbol(n: qc.ImportEqualsDeclaration, resolved: Symbol | undefined) {
      if (markSymbolOfAliasDeclarationIfTypeOnly(n, undefined, resolved, false)) {
        const typeOnlyDeclaration = getSymbolOfNode(n).getTypeOnlyAliasDeclaration()!;
        const isExport = typeOnlyDeclarationIsExport(typeOnlyDeclaration);
        const message = isExport
          ? qd.msgs.An_import_alias_cannot_reference_a_declaration_that_was_exported_using_export_type
          : qd.msgs.An_import_alias_cannot_reference_a_declaration_that_was_imported_using_import_type;
        const relatedMessage = isExport ? qd.msgs._0_was_exported_here : qd.msgs._0_was_imported_here;
        const name = qy.qf.get.unescUnderscores(typeOnlyDeclaration.name!.escapedText);
        addRelatedInfo(error(n.moduleReference, message), qf.create.diagnosticForNode(typeOnlyDeclaration, relatedMessage, name));
      }
    }
    noTypeArguments(n: NodeWithTypeArguments, symbol?: Symbol) {
      if (n.typeArguments) {
        error(n, qd.msgs.Type_0_is_not_generic, symbol ? symbol.symbolToString() : (<TypeReferenceNode>n).typeName ? declarationNameToString((<TypeReferenceNode>n).typeName) : anon);
        return false;
      }
      return true;
    }
    typeAssignableTo(
      source: qc.Type,
      target: qc.Type,
      errorNode: Node | undefined,
      headMessage?: qd.Message,
      containingMessageChain?: () => qd.MessageChain | undefined,
      errorOutputObject?: { errors?: qd.Diagnostic[] }
    ): boolean {
      return this.typeRelatedTo(source, target, assignableRelation, errorNode, headMessage, containingMessageChain, errorOutputObject);
    }
    typeAssignableToAndOptionallyElaborate(
      source: qc.Type,
      target: qc.Type,
      errorNode: Node | undefined,
      expr: Expression | undefined,
      headMessage?: qd.Message,
      containingMessageChain?: () => qd.MessageChain | undefined
    ): boolean {
      return this.typeRelatedToAndOptionallyElaborate(source, target, assignableRelation, errorNode, expr, headMessage, containingMessageChain, undefined);
    }
    typeRelatedToAndOptionallyElaborate(
      source: qc.Type,
      target: qc.Type,
      relation: qu.QMap<RelationComparisonResult>,
      errorNode: Node | undefined,
      expr: Expression | undefined,
      headMessage: qd.Message | undefined,
      containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
      errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } | undefined
    ): boolean {
      if (isTypeRelatedTo(source, target, relation)) return true;
      if (!errorNode || !elaborateError(expr, source, target, relation, headMessage, containingMessageChain, errorOutputContainer))
        return this.typeRelatedTo(source, target, relation, errorNode, headMessage, containingMessageChain, errorOutputContainer);
      return false;
    }
    expressionForMutableLocationWithContextualType(next: Expression, sourcePropType: qc.Type) {
      next.contextualType = sourcePropType;
      try {
        return this.expressionForMutableLocation(next, CheckMode.Contextual, sourcePropType);
      } finally {
        next.contextualType = undefined;
      }
    }
    typeComparableTo(source: qc.Type, target: qc.Type, errorNode: Node, headMessage?: qd.Message, containingMessageChain?: () => qd.MessageChain | undefined): boolean {
      return this.typeRelatedTo(source, target, comparableRelation, errorNode, headMessage, containingMessageChain);
    }
    typeRelatedTo(
      source: qc.Type,
      target: qc.Type,
      relation: qu.QMap<RelationComparisonResult>,
      errorNode: Node | undefined,
      headMessage?: qd.Message,
      containingMessageChain?: () => qd.MessageChain | undefined,
      errorOutputContainer?: { errors?: qd.Diagnostic[]; skipLogging?: boolean }
    ): boolean {
      let errorInfo: qd.MessageChain | undefined;
      let relatedInfo: [qd.DiagnosticRelatedInformation, ...qd.DiagnosticRelatedInformation[]] | undefined;
      let maybeKeys: string[];
      let sourceStack: qc.Type[];
      let targetStack: qc.Type[];
      let maybeCount = 0;
      let depth = 0;
      let expandingFlags = ExpandingFlags.None;
      let overflow = false;
      let overrideNextErrorInfo = 0;
      let lastSkippedInfo: [qc.Type, qc.Type] | undefined;
      let incompatibleStack: [qd.Message, (string | number)?, (string | number)?, (string | number)?, (string | number)?][] = [];
      let inPropertyCheck = false;
      qu.assert(relation !== identityRelation || !errorNode, 'no error reporting in identity checking');
      const result = isRelatedTo(source, target, !!errorNode, headMessage);
      if (incompatibleStack.length) reportIncompatibleStack();
      if (overflow) {
        const diag = error(errorNode || currentNode, qd.msgs.Excessive_stack_depth_comparing_types_0_and_1, typeToString(source), typeToString(target));
        if (errorOutputContainer) (errorOutputContainer.errors || (errorOutputContainer.errors = [])).push(diag);
      } else if (errorInfo) {
        if (containingMessageChain) {
          const chain = containingMessageChain();
          if (chain) {
            qd.concatenateMessageChains(chain, errorInfo);
            errorInfo = chain;
          }
        }
        let relatedInformation: qd.DiagnosticRelatedInformation[] | undefined;
        if (headMessage && errorNode && !result && source.symbol) {
          const links = s.getLinks(source.symbol);
          if (links.originatingImport && !qf.is.importCall(links.originatingImport)) {
            const helpfulRetry = this.typeRelatedTo(getTypeOfSymbol(links.target!), target, relation, undefined);
            if (helpfulRetry) {
              const diag = qf.create.diagnosticForNode(
                links.originatingImport,
                qd.msgs
                  .Type_originates_at_this_import_A_namespace_style_import_cannot_be_called_or_constructed_and_will_cause_a_failure_at_runtime_Consider_using_a_default_import_or_import_require_here_instead
              );
              relatedInformation = qu.append(relatedInformation, diag);
            }
          }
        }
        const diag = qf.create.diagnosticForNodeFromMessageChain(errorNode!, errorInfo, relatedInformation);
        if (relatedInfo) addRelatedInfo(diag, ...relatedInfo);
        if (errorOutputContainer) (errorOutputContainer.errors || (errorOutputContainer.errors = [])).push(diag);
        if (!errorOutputContainer || !errorOutputContainer.skipLogging) diagnostics.add(diag);
      }
      if (errorNode && errorOutputContainer && errorOutputContainer.skipLogging && result === qt.Ternary.False) qu.assert(!!errorOutputContainer.errors, 'missed opportunity to interact with error.');
      return result !== qt.Ternary.False;
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
          relatedInfo: !relatedInfo ? undefined : (relatedInfo.slice() as [qd.DiagnosticRelatedInformation, ...qd.DiagnosticRelatedInformation[]] | undefined),
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
            case qd.msgs.Types_of_property_0_are_incompatible.code: {
              if (path.indexOf('new ') === 0) path = `(${path})`;
              const str = '' + args[0];
              if (path.length === 0) path = `${str}`;
              else if (qy.qf.is.identifierText(str)) {
                path = `${path}.${str}`;
              } else if (str[0] === '[' && str[str.length - 1] === ']') {
                path = `${path}${str}`;
              } else {
                path = `${path}[${str}]`;
              }
              break;
            }
            case qd.msgs.Call_signature_return_types_0_and_1_are_incompatible.code:
            case qd.msgs.Construct_signature_return_types_0_and_1_are_incompatible.code:
            case qd.msgs.Call_signatures_with_no_arguments_have_incompatible_return_types_0_and_1.code:
            case qd.msgs.Construct_signatures_with_no_arguments_have_incompatible_return_types_0_and_1.code: {
              if (path.length === 0) {
                let mappedMsg = msg;
                if (msg.code === qd.msgs.Call_signatures_with_no_arguments_have_incompatible_return_types_0_and_1.code) mappedMsg = qd.msgs.Call_signature_return_types_0_and_1_are_incompatible;
                else if (msg.code === qd.msgs.Construct_signatures_with_no_arguments_have_incompatible_return_types_0_and_1.code) {
                  mappedMsg = qd.msgs.Construct_signature_return_types_0_and_1_are_incompatible;
                }
                secondaryRootErrors.unshift([mappedMsg, args[0], args[1]]);
              } else {
                const prefix =
                  msg.code === qd.msgs.Construct_signature_return_types_0_and_1_are_incompatible.code ||
                  msg.code === qd.msgs.Construct_signatures_with_no_arguments_have_incompatible_return_types_0_and_1.code
                    ? 'new '
                    : '';
                const params =
                  msg.code === qd.msgs.Call_signatures_with_no_arguments_have_incompatible_return_types_0_and_1.code ||
                  msg.code === qd.msgs.Construct_signatures_with_no_arguments_have_incompatible_return_types_0_and_1.code
                    ? ''
                    : '...';
                path = `${prefix}${path}(${params})`;
              }
              break;
            }
            default:
              return qu.fail(`Unhandled qd.Diagnostic: ${msg.code}`);
          }
        }
        if (path) reportError(path[path.length - 1] === ')' ? qd.msgs.The_types_returned_by_0_are_incompatible_between_these_types : qd.msgs.The_types_of_0_are_incompatible_between_these_types, path);
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
        qu.assert(!!errorNode);
        if (incompatibleStack.length) reportIncompatibleStack();
        if (message.elidedInCompatabilityPyramid) return;
        errorInfo = chainqd.Messages(errorInfo, message, arg0, arg1, arg2, arg3);
      }
      function associateRelatedInfo(info: qd.DiagnosticRelatedInformation) {
        qu.assert(!!errorInfo);
        if (!relatedInfo) relatedInfo = [info];
        else {
          relatedInfo.push(info);
        }
      }
      function reportRelationError(message: qd.Message | undefined, source: qc.Type, target: qc.Type) {
        if (incompatibleStack.length) reportIncompatibleStack();
        const [sourceType, targetType] = getTypeNamesForErrorDisplay(source, target);
        let generalizedSource = source;
        let generalizedSourceType = sourceType;
        if (isLiteralType(source) && !typeCouldHaveTopLevelSingletonTypes(target)) {
          generalizedSource = getBaseTypeOfLiteralType(source);
          generalizedSourceType = getTypeNameForErrorDisplay(generalizedSource);
        }
        if (target.flags & TypeFlags.TypeParameter) {
          const constraint = getBaseConstraintOfType(target);
          let needsOriginalSource;
          if (constraint && (isTypeAssignableTo(generalizedSource, constraint) || (needsOriginalSource = isTypeAssignableTo(source, constraint)))) {
            reportError(
              qd.msgs._0_is_assignable_to_the_constraint_of_type_1_but_1_could_be_instantiated_with_a_different_subtype_of_constraint_2,
              needsOriginalSource ? sourceType : generalizedSourceType,
              targetType,
              typeToString(constraint)
            );
          } else {
            reportError(qd.msgs._0_could_be_instantiated_with_an_arbitrary_type_which_could_be_unrelated_to_1, targetType, generalizedSourceType);
          }
        }
        if (!message) {
          if (relation === comparableRelation) message = qd.msgs.Type_0_is_not_comparable_to_type_1;
          else if (sourceType === targetType) {
            message = qd.msgs.Type_0_is_not_assignable_to_type_1_Two_different_types_with_this_name_exist_but_they_are_unrelated;
          } else {
            message = qd.msgs.Type_0_is_not_assignable_to_type_1;
          }
        }
        reportError(message, generalizedSourceType, targetType);
      }
      function tryElaborateErrorsForPrimitivesAndObjects(source: qc.Type, target: qc.Type) {
        const sourceType = symbolValueDeclarationIsContextSensitive(source.symbol) ? typeToString(source, source.symbol.valueDeclaration) : typeToString(source);
        const targetType = symbolValueDeclarationIsContextSensitive(target.symbol) ? typeToString(target, target.symbol.valueDeclaration) : typeToString(target);
        if (
          (globalStringType === source && stringType === target) ||
          (globalNumberType === source && numberType === target) ||
          (globalBooleanType === source && booleanType === target) ||
          (getGlobalESSymbolType(false) === source && esSymbolType === target)
        ) {
          reportError(qd.msgs._0_is_a_primitive_but_1_is_a_wrapper_object_Prefer_using_0_when_possible, targetType, sourceType);
        }
      }
      function tryElaborateArrayLikeErrors(source: qc.Type, target: qc.Type, reportErrors: boolean): boolean {
        if (isTupleType(source)) {
          if (source.target.readonly && isMutableArrayOrTuple(target)) {
            if (reportErrors) reportError(qd.msgs.The_type_0_is_readonly_and_cannot_be_assigned_to_the_mutable_type_1, typeToString(source), typeToString(target));
            return false;
          }
          return isTupleType(target) || isArrayType(target);
        }
        if (isReadonlyArrayType(source) && isMutableArrayOrTuple(target)) {
          if (reportErrors) reportError(qd.msgs.The_type_0_is_readonly_and_cannot_be_assigned_to_the_mutable_type_1, typeToString(source), typeToString(target));
          return false;
        }
        if (isTupleType(target)) return isArrayType(source);
        return true;
      }
      function isRelatedTo(originalSource: qc.Type, originalTarget: qc.Type, reportErrors = false, headMessage?: qd.Message, intersectionState = IntersectionState.None): qt.Ternary {
        if (originalSource.flags & TypeFlags.Object && originalTarget.flags & TypeFlags.Primitive) {
          if (isSimpleTypeRelatedTo(originalSource, originalTarget, relation, reportErrors ? reportError : undefined)) return qt.Ternary.True;
          reportErrorResults(originalSource, originalTarget, qt.Ternary.False, !!(getObjectFlags(originalSource) & ObjectFlags.JsxAttributes));
          return qt.Ternary.False;
        }
        const source = getNormalizedType(originalSource, false);
        let target = getNormalizedType(originalTarget, true);
        if (source === target) return qt.Ternary.True;
        if (relation === identityRelation) return isIdenticalTo(source, target);
        if (source.flags & TypeFlags.TypeParameter && getConstraintOfType(source) === target) return qt.Ternary.True;
        if (target.flags & TypeFlags.Union && source.flags & TypeFlags.Object && (target as UnionType).types.length <= 3 && maybeTypeOfKind(target, TypeFlags.Nullable)) {
          const nullStrippedTarget = extractTypesOfKind(target, ~TypeFlags.Nullable);
          if (!(nullStrippedTarget.flags & (TypeFlags.Union | TypeFlags.Never))) {
            if (source === nullStrippedTarget) return qt.Ternary.True;
            target = nullStrippedTarget;
          }
        }
        if (
          (relation === comparableRelation && !(target.flags & TypeFlags.Never) && isSimpleTypeRelatedTo(target, source, relation)) ||
          isSimpleTypeRelatedTo(source, target, relation, reportErrors ? reportError : undefined)
        )
          return qt.Ternary.True;
        const isComparingJsxAttributes = !!(getObjectFlags(source) & ObjectFlags.JsxAttributes);
        const isPerformingExcessPropertyChecks = !(intersectionState & IntersectionState.Target) && isObjectLiteralType(source) && getObjectFlags(source) & ObjectFlags.FreshLiteral;
        if (isPerformingExcessPropertyChecks) {
          if (hasExcessProperties(<FreshObjectLiteralType>source, target, reportErrors)) {
            if (reportErrors) reportRelationError(headMessage, source, target);
            return qt.Ternary.False;
          }
        }
        const isPerformingCommonPropertyChecks =
          relation !== comparableRelation &&
          !(intersectionState & IntersectionState.Target) &&
          source.flags & (TypeFlags.Primitive | TypeFlags.Object | TypeFlags.Intersection) &&
          source !== globalObjectType &&
          target.flags & (TypeFlags.Object | TypeFlags.Intersection) &&
          isWeakType(target) &&
          (getPropertiesOfType(source).length > 0 || typeHasCallOrConstructSignatures(source));
        if (isPerformingCommonPropertyChecks && !hasCommonProperties(source, target, isComparingJsxAttributes)) {
          if (reportErrors) {
            const calls = getSignaturesOfType(source, SignatureKind.Call);
            const constructs = getSignaturesOfType(source, SignatureKind.Construct);
            if ((calls.length > 0 && isRelatedTo(getReturnTypeOfSignature(calls[0]), target, false)) || (constructs.length > 0 && isRelatedTo(getReturnTypeOfSignature(constructs[0]), target, false)))
              reportError(qd.msgs.Value_of_type_0_has_no_properties_in_common_with_type_1_Did_you_mean_to_call_it, typeToString(source), typeToString(target));
            else {
              reportError(qd.msgs.Type_0_has_no_properties_in_common_with_type_1, typeToString(source), typeToString(target));
            }
          }
          return qt.Ternary.False;
        }
        let result = qt.Ternary.False;
        const saveErrorInfo = captureErrorCalculationState();
        if (source.flags & TypeFlags.Union) {
          result =
            relation === comparableRelation
              ? someTypeRelatedToType(source as UnionType, target, reportErrors && !(source.flags & TypeFlags.Primitive), intersectionState)
              : eachTypeRelatedToType(source as UnionType, target, reportErrors && !(source.flags & TypeFlags.Primitive), intersectionState);
        } else {
          if (target.flags & TypeFlags.Union)
            result = typeRelatedToSomeType(getRegularTypeOfObjectLiteral(source), <UnionType>target, reportErrors && !(source.flags & TypeFlags.Primitive) && !(target.flags & TypeFlags.Primitive));
          else if (target.flags & TypeFlags.Intersection) {
            result = typeRelatedToEachType(getRegularTypeOfObjectLiteral(source), target as IntersectionType, reportErrors, IntersectionState.Target);
          } else if (source.flags & TypeFlags.Intersection) {
            result = someTypeRelatedToType(<IntersectionType>source, target, false, IntersectionState.Source);
          }
          if (!result && (source.flags & TypeFlags.StructuredOrInstantiable || target.flags & TypeFlags.StructuredOrInstantiable)) {
            if ((result = recursiveTypeRelatedTo(source, target, reportErrors, intersectionState))) resetErrorInfo(saveErrorInfo);
          }
        }
        if (!result && source.flags & (TypeFlags.Intersection | TypeFlags.TypeParameter)) {
          const constraint = getEffectiveConstraintOfIntersection(source.flags & TypeFlags.Intersection ? (<IntersectionType>source).types : [source], !!(target.flags & TypeFlags.Union));
          if (constraint && (source.flags & TypeFlags.Intersection || target.flags & TypeFlags.Union)) {
            if (everyType(constraint, (c) => c !== source)) {
              if ((result = isRelatedTo(constraint, target, false, undefined, intersectionState))) resetErrorInfo(saveErrorInfo);
            }
          }
        }
        if (
          result &&
          !inPropertyCheck &&
          ((target.flags & TypeFlags.Intersection && (isPerformingExcessPropertyChecks || isPerformingCommonPropertyChecks)) ||
            (isNonGenericObjectType(target) &&
              !isArrayType(target) &&
              !isTupleType(target) &&
              source.flags & TypeFlags.Intersection &&
              getApparentType(source).flags & TypeFlags.StructuredType &&
              !some((<IntersectionType>source).types, (t) => !!(getObjectFlags(t) & ObjectFlags.NonInferrableType))))
        ) {
          inPropertyCheck = true;
          result &= recursiveTypeRelatedTo(source, target, reportErrors, IntersectionState.PropertyCheck);
          inPropertyCheck = false;
        }
        reportErrorResults(source, target, result, isComparingJsxAttributes);
        return result;
        function reportErrorResults(source: qc.Type, target: qc.Type, result: qt.Ternary, isComparingJsxAttributes: boolean) {
          if (!result && reportErrors) {
            source = originalSource.aliasSymbol ? originalSource : source;
            target = originalTarget.aliasSymbol ? originalTarget : target;
            let maybeSuppress = overrideNextErrorInfo > 0;
            if (maybeSuppress) overrideNextErrorInfo--;
            if (source.flags & TypeFlags.Object && target.flags & TypeFlags.Object) {
              const currentError = errorInfo;
              tryElaborateArrayLikeErrors(source, target, reportErrors);
              if (errorInfo !== currentError) maybeSuppress = !!errorInfo;
            }
            if (source.flags & TypeFlags.Object && target.flags & TypeFlags.Primitive) tryElaborateErrorsForPrimitivesAndObjects(source, target);
            else if (source.symbol && source.flags & TypeFlags.Object && globalObjectType === source) {
              reportError(qd.msgs.The_Object_type_is_assignable_to_very_few_other_types_Did_you_mean_to_use_the_any_type_instead);
            } else if (isComparingJsxAttributes && target.flags & TypeFlags.Intersection) {
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
      function isIdenticalTo(source: qc.Type, target: qc.Type): qt.Ternary {
        const flags = source.flags & target.flags;
        if (!(flags & TypeFlags.Substructure)) return qt.Ternary.False;
        if (flags & TypeFlags.UnionOrIntersection) {
          let result = eachTypeRelatedToSomeType(<qc.UnionOrIntersectionType>source, <qc.UnionOrIntersectionType>target);
          if (result) result &= eachTypeRelatedToSomeType(<qc.UnionOrIntersectionType>target, <qc.UnionOrIntersectionType>source);
          return result;
        }
        return recursiveTypeRelatedTo(source, target, false, IntersectionState.None);
      }
      function getTypeOfPropertyInTypes(types: qc.Type[], name: qu.__String) {
        const appendPropType = (propTypes: qc.Type[] | undefined, type: qc.Type) => {
          type = getApparentType(type);
          const prop = type.flags & TypeFlags.UnionOrIntersection ? getPropertyOfqc.UnionOrIntersectionType(<qc.UnionOrIntersectionType>type, name) : getPropertyOfObjectType(type, name);
          const propType = (prop && getTypeOfSymbol(prop)) || (NumericLiteral.name(name) && getIndexTypeOfType(type, IndexKind.Number)) || getIndexTypeOfType(type, IndexKind.String) || undefinedType;
          return qu.append(propTypes, propType);
        };
        return getUnionType(reduceLeft(types, appendPropType, undefined) || empty);
      }
      function hasExcessProperties(source: FreshObjectLiteralType, target: qc.Type, reportErrors: boolean): boolean {
        if (!isExcessPropertyCheckTarget(target) || (!noImplicitAny && getObjectFlags(target) & ObjectFlags.JSLiteral)) return false;
        const isComparingJsxAttributes = !!(getObjectFlags(source) & ObjectFlags.JsxAttributes);
        if ((relation === assignableRelation || relation === comparableRelation) && (isTypeSubsetOf(globalObjectType, target) || (!isComparingJsxAttributes && isEmptyObjectType(target))))
          return false;
        let reducedTarget = target;
        let checkTypes: qc.Type[] | undefined;
        if (target.flags & TypeFlags.Union) {
          reducedTarget = findMatchingDiscriminantType(source, <UnionType>target, isRelatedTo) || filterPrimitivesIfContainsNonPrimitive(<UnionType>target);
          checkTypes = reducedTarget.flags & TypeFlags.Union ? (<UnionType>reducedTarget).types : [reducedTarget];
        }
        for (const prop of getPropertiesOfType(source)) {
          if (shouldCheckAsExcessProperty(prop, source.symbol) && !isIgnoredJsxProperty(source, prop)) {
            if (!isKnownProperty(reducedTarget, prop.escName, isComparingJsxAttributes)) {
              if (reportErrors) {
                const errorTarget = filterType(reducedTarget, isExcessPropertyCheckTarget);
                if (!errorNode) return qu.fail();
                if (qf.is.kind(qc.JsxAttributes, errorNode) || qc.isJsx.openingLikeElement(errorNode) || qc.isJsx.openingLikeElement(errorNode.parent)) {
                  if (prop.valueDeclaration && qf.is.kind(qc.JsxAttribute, prop.valueDeclaration) && qf.get.sourceFileOf(errorNode) === qf.get.sourceFileOf(prop.valueDeclaration.name))
                    errorNode = prop.valueDeclaration.name;
                  reportError(qd.msgs.Property_0_does_not_exist_on_type_1, prop.symbolToString(), typeToString(errorTarget));
                } else {
                  const objectLiteralDeclaration = source.symbol && firstOrUndefined(source.symbol.declarations);
                  let suggestion;
                  if (
                    prop.valueDeclaration &&
                    qc.findAncestor(prop.valueDeclaration, (d) => d === objectLiteralDeclaration) &&
                    qf.get.sourceFileOf(objectLiteralDeclaration) === qf.get.sourceFileOf(errorNode)
                  ) {
                    const propDeclaration = prop.valueDeclaration as ObjectLiteralElementLike;
                    qg.assertNode(propDeclaration, isObjectLiteralElementLike);
                    errorNode = propDeclaration;
                    const name = propDeclaration.name!;
                    if (qf.is.kind(qc.Identifier, name)) suggestion = getSuggestionForNonexistentProperty(name, errorTarget);
                  }
                  if (suggestion !== undefined) {
                    reportError(
                      qd.msgs.Object_literal_may_only_specify_known_properties_but_0_does_not_exist_in_type_1_Did_you_mean_to_write_2,
                      prop.symbolToString(),
                      typeToString(errorTarget),
                      suggestion
                    );
                  } else {
                    reportError(qd.msgs.Object_literal_may_only_specify_known_properties_and_0_does_not_exist_in_type_1, prop.symbolToString(), typeToString(errorTarget));
                  }
                }
              }
              return true;
            }
            if (checkTypes && !isRelatedTo(getTypeOfSymbol(prop), getTypeOfPropertyInTypes(checkTypes, prop.escName), reportErrors)) {
              if (reportErrors) reportIncompatibleError(qd.msgs.Types_of_property_0_are_incompatible, prop.symbolToString());
              return true;
            }
          }
        }
        return false;
      }
      function shouldCheckAsExcessProperty(s: Symbol, container: Symbol) {
        return s.valueDeclaration && container.valueDeclaration && s.valueDeclaration.parent === container.valueDeclaration;
      }
      function eachTypeRelatedToSomeType(source: qc.UnionOrIntersectionType, target: qc.UnionOrIntersectionType): qt.Ternary {
        let result = qt.Ternary.True;
        const sourceTypes = source.types;
        for (const sourceType of sourceTypes) {
          const related = typeRelatedToSomeType(sourceType, target, false);
          if (!related) return qt.Ternary.False;
          result &= related;
        }
        return result;
      }
      function typeRelatedToSomeType(source: qc.Type, target: qc.UnionOrIntersectionType, reportErrors: boolean): qt.Ternary {
        const targetTypes = target.types;
        if (target.flags & TypeFlags.Union && containsType(targetTypes, source)) return qt.Ternary.True;
        for (const type of targetTypes) {
          const related = isRelatedTo(source, type, false);
          if (related) return related;
        }
        if (reportErrors) {
          const bestMatchingType = getBestMatchingType(source, target, isRelatedTo);
          isRelatedTo(source, bestMatchingType || targetTypes[targetTypes.length - 1], true);
        }
        return qt.Ternary.False;
      }
      function typeRelatedToEachType(source: qc.Type, target: IntersectionType, reportErrors: boolean, intersectionState: IntersectionState): qt.Ternary {
        let result = qt.Ternary.True;
        const targetTypes = target.types;
        for (const targetType of targetTypes) {
          const related = isRelatedTo(source, targetType, reportErrors, undefined, intersectionState);
          if (!related) return qt.Ternary.False;
          result &= related;
        }
        return result;
      }
      function someTypeRelatedToType(source: qc.UnionOrIntersectionType, target: qc.Type, reportErrors: boolean, intersectionState: IntersectionState): qt.Ternary {
        const sourceTypes = source.types;
        if (source.flags & TypeFlags.Union && containsType(sourceTypes, target)) return qt.Ternary.True;
        const len = sourceTypes.length;
        for (let i = 0; i < len; i++) {
          const related = isRelatedTo(sourceTypes[i], target, reportErrors && i === len - 1, undefined, intersectionState);
          if (related) return related;
        }
        return qt.Ternary.False;
      }
      function eachTypeRelatedToType(source: qc.UnionOrIntersectionType, target: qc.Type, reportErrors: boolean, intersectionState: IntersectionState): qt.Ternary {
        let result = qt.Ternary.True;
        const sourceTypes = source.types;
        for (let i = 0; i < sourceTypes.length; i++) {
          const sourceType = sourceTypes[i];
          if (target.flags & TypeFlags.Union && (target as UnionType).types.length === sourceTypes.length) {
            const related = isRelatedTo(sourceType, (target as UnionType).types[i], false, undefined, intersectionState);
            if (related) {
              result &= related;
              continue;
            }
          }
          const related = isRelatedTo(sourceType, target, reportErrors, undefined, intersectionState);
          if (!related) return qt.Ternary.False;
          result &= related;
        }
        return result;
      }
      function typeArgumentsRelatedTo(
        sources: readonly qc.Type[] = empty,
        targets: readonly qc.Type[] = empty,
        variances: readonly VarianceFlags[] = empty,
        reportErrors: boolean,
        intersectionState: IntersectionState
      ): qt.Ternary {
        if (sources.length !== targets.length && relation === identityRelation) return qt.Ternary.False;
        const length = sources.length <= targets.length ? sources.length : targets.length;
        let result = qt.Ternary.True;
        for (let i = 0; i < length; i++) {
          const varianceFlags = i < variances.length ? variances[i] : VarianceFlags.Covariant;
          const variance = varianceFlags & VarianceFlags.VarianceMask;
          if (variance !== VarianceFlags.Independent) {
            const s = sources[i];
            const t = targets[i];
            let related = qt.Ternary.True;
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
            if (!related) return qt.Ternary.False;
            result &= related;
          }
        }
        return result;
      }
      function recursiveTypeRelatedTo(source: qc.Type, target: qc.Type, reportErrors: boolean, intersectionState: IntersectionState): qt.Ternary {
        if (overflow) return qt.Ternary.False;
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
            return entry & RelationComparisonResult.Succeeded ? qt.Ternary.True : qt.Ternary.False;
          }
        }
        if (!maybeKeys) {
          maybeKeys = [];
          sourceStack = [];
          targetStack = [];
        } else {
          for (let i = 0; i < maybeCount; i++) {
            if (id === maybeKeys[i]) return qt.Ternary.Maybe;
          }
          if (depth === 100) {
            overflow = true;
            return qt.Ternary.False;
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
        const result = expandingFlags !== ExpandingFlags.Both ? structuredTypeRelatedTo(source, target, reportErrors, intersectionState) : qt.Ternary.Maybe;
        if (outofbandVarianceMarkerHandler) outofbandVarianceMarkerHandler = originalHandler;
        expandingFlags = saveExpandingFlags;
        depth--;
        if (result) {
          if (result === qt.Ternary.True || depth === 0) {
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
      function structuredTypeRelatedTo(source: qc.Type, target: qc.Type, reportErrors: boolean, intersectionState: IntersectionState): qt.Ternary {
        if (intersectionState & IntersectionState.PropertyCheck) return propertiesRelatedTo(source, target, reportErrors, undefined, IntersectionState.None);
        const flags = source.flags & target.flags;
        if (relation === identityRelation && !(flags & TypeFlags.Object)) {
          if (flags & TypeFlags.Index) return isRelatedTo((<IndexType>source).type, (<IndexType>target).type, false);
          let result = qt.Ternary.False;
          if (flags & TypeFlags.IndexedAccess) {
            if ((result = isRelatedTo((<IndexedAccessType>source).objectType, (<IndexedAccessType>target).objectType, false))) {
              if ((result &= isRelatedTo((<IndexedAccessType>source).indexType, (<IndexedAccessType>target).indexType, false))) return result;
            }
          }
          if (flags & TypeFlags.Conditional) {
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
          if (flags & TypeFlags.Substitution) return isRelatedTo((<SubstitutionType>source).substitute, (<SubstitutionType>target).substitute, false);
          return qt.Ternary.False;
        }
        let result: Ternary;
        let originalErrorInfo: qd.MessageChain | undefined;
        let varianceCheckFailed = false;
        const saveErrorInfo = captureErrorCalculationState();
        if (
          source.flags & (TypeFlags.Object | TypeFlags.Conditional) &&
          source.aliasSymbol &&
          source.aliasTypeArguments &&
          source.aliasSymbol === target.aliasSymbol &&
          !(source.aliasTypeArgumentsContainsMarker || target.aliasTypeArgumentsContainsMarker)
        ) {
          const variances = getAliasVariances(source.aliasSymbol);
          if (variances === empty) return qt.Ternary.Maybe;
          const varianceResult = relateVariances(source.aliasTypeArguments, target.aliasTypeArguments, variances, intersectionState);
          if (varianceResult !== undefined) return varianceResult;
        }
        if (target.flags & TypeFlags.TypeParameter) {
          if (getObjectFlags(source) & ObjectFlags.Mapped && isRelatedTo(getIndexType(target), getConstraintTypeFromMappedType(<MappedType>source))) {
            if (!(getMappedTypeModifiers(<MappedType>source) & MappedTypeModifiers.IncludeOptional)) {
              const templateType = getTemplateTypeFromMappedType(<MappedType>source);
              const indexedAccessType = getIndexedAccessType(target, getTypeParameterFromMappedType(<MappedType>source));
              if ((result = isRelatedTo(templateType, indexedAccessType, reportErrors))) return result;
            }
          }
        } else if (target.flags & TypeFlags.Index) {
          if (source.flags & TypeFlags.Index) {
            if ((result = isRelatedTo((<IndexType>target).type, (<IndexType>source).type, false))) return result;
          }
          const constraint = getSimplifiedTypeOrConstraint((<IndexType>target).type);
          if (constraint) {
            if (isRelatedTo(source, getIndexType(constraint, (target as IndexType).stringsOnly), reportErrors) === qt.Ternary.True) return qt.Ternary.True;
          }
        } else if (target.flags & TypeFlags.IndexedAccess) {
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
            if (template.flags & TypeFlags.IndexedAccess && (<IndexedAccessType>template).objectType === source && (<IndexedAccessType>template).indexType === getTypeParameterFromMappedType(target))
              return qt.Ternary.True;
            if (!isGenericMappedType(source)) {
              const targetConstraint = getConstraintTypeFromMappedType(target);
              const sourceKeys = getIndexType(source, true);
              const includeOptional = modifiers & MappedTypeModifiers.IncludeOptional;
              const filteredByApplicability = includeOptional ? intersectTypes(targetConstraint, sourceKeys) : undefined;
              if (includeOptional ? !(filteredByApplicability!.flags & TypeFlags.Never) : isRelatedTo(targetConstraint, sourceKeys)) {
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
        if (source.flags & TypeFlags.TypeVariable) {
          if (source.flags & TypeFlags.IndexedAccess && target.flags & TypeFlags.IndexedAccess) {
            if ((result = isRelatedTo((<IndexedAccessType>source).objectType, (<IndexedAccessType>target).objectType, reportErrors)))
              result &= isRelatedTo((<IndexedAccessType>source).indexType, (<IndexedAccessType>target).indexType, reportErrors);
            if (result) {
              resetErrorInfo(saveErrorInfo);
              return result;
            }
          } else {
            const constraint = getConstraintOfType(<TypeVariable>source);
            if (!constraint || (source.flags & TypeFlags.TypeParameter && constraint.flags & TypeFlags.Any)) {
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
        } else if (source.flags & TypeFlags.Index) {
          if ((result = isRelatedTo(keyofConstraintType, target, reportErrors))) {
            resetErrorInfo(saveErrorInfo);
            return result;
          }
        } else if (source.flags & TypeFlags.Conditional) {
          if (target.flags & TypeFlags.Conditional) {
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
          if (relation !== subtypeRelation && relation !== strictSubtypeRelation && isPartialMappedType(target) && isEmptyObjectType(source)) return qt.Ternary.True;
          if (isGenericMappedType(target)) {
            if (isGenericMappedType(source)) {
              if ((result = mappedTypeRelatedTo(source, target, reportErrors))) {
                resetErrorInfo(saveErrorInfo);
                return result;
              }
            }
            return qt.Ternary.False;
          }
          const sourceIsPrimitive = !!(source.flags & TypeFlags.Primitive);
          if (relation !== identityRelation) source = getApparentType(source);
          else if (isGenericMappedType(source)) return qt.Ternary.False;
          if (
            getObjectFlags(source) & ObjectFlags.Reference &&
            getObjectFlags(target) & ObjectFlags.Reference &&
            (<TypeReference>source).target === (<TypeReference>target).target &&
            !(getObjectFlags(source) & ObjectFlags.MarkerType || getObjectFlags(target) & ObjectFlags.MarkerType)
          ) {
            const variances = getVariances((<TypeReference>source).target);
            if (variances === empty) return qt.Ternary.Maybe;
            const varianceResult = relateVariances(getTypeArguments(<TypeReference>source), getTypeArguments(<TypeReference>target), variances, intersectionState);
            if (varianceResult !== undefined) return varianceResult;
          } else if (isReadonlyArrayType(target) ? isArrayType(source) || isTupleType(source) : isArrayType(target) && isTupleType(source) && !source.target.readonly) {
            if (relation !== identityRelation) return isRelatedTo(getIndexTypeOfType(source, IndexKind.Number) || anyType, getIndexTypeOfType(target, IndexKind.Number) || anyType, reportErrors);
            return qt.Ternary.False;
          } else if (
            (relation === subtypeRelation || relation === strictSubtypeRelation) &&
            isEmptyObjectType(target) &&
            getObjectFlags(target) & ObjectFlags.FreshLiteral &&
            !isEmptyObjectType(source)
          ) {
            return qt.Ternary.False;
          }
          if (source.flags & (TypeFlags.Object | TypeFlags.Intersection) && target.flags & TypeFlags.Object) {
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
          if (source.flags & (TypeFlags.Object | TypeFlags.Intersection) && target.flags & TypeFlags.Union) {
            const objectOnlyTarget = extractTypesOfKind(target, TypeFlags.Object | TypeFlags.Intersection | TypeFlags.Substitution);
            if (objectOnlyTarget.flags & TypeFlags.Union) {
              const result = typeRelatedToDiscriminatedType(source, objectOnlyTarget as UnionType);
              if (result) return result;
            }
          }
        }
        return qt.Ternary.False;
        function relateVariances(
          sourceTypeArguments: readonly qc.Type[] | undefined,
          targetTypeArguments: readonly qc.Type[] | undefined,
          variances: VarianceFlags[],
          intersectionState: IntersectionState
        ) {
          if ((result = typeArgumentsRelatedTo(sourceTypeArguments, targetTypeArguments, variances, reportErrors, intersectionState))) return result;
          if (qu.some(variances, (v) => !!(v & VarianceFlags.AllowsStructuralFallback))) {
            originalErrorInfo = undefined;
            resetErrorInfo(saveErrorInfo);
            return;
          }
          const allowStructuralFallback = targetTypeArguments && hasCovariantVoidArgument(targetTypeArguments, variances);
          varianceCheckFailed = !allowStructuralFallback;
          if (variances !== empty && !allowStructuralFallback) {
            if (varianceCheckFailed && !(reportErrors && some(variances, (v) => (v & VarianceFlags.VarianceMask) === VarianceFlags.Invariant))) return qt.Ternary.False;
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
      function mappedTypeRelatedTo(source: MappedType, target: MappedType, reportErrors: boolean): qt.Ternary {
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
        return qt.Ternary.False;
      }
      function typeRelatedToDiscriminatedType(source: qc.Type, target: UnionType) {
        const sourceProperties = getPropertiesOfType(source);
        const sourcePropertiesFiltered = findDiscriminantProperties(sourceProperties, target);
        if (!sourcePropertiesFiltered) return qt.Ternary.False;
        let numCombinations = 1;
        for (const sourceProperty of sourcePropertiesFiltered) {
          numCombinations *= countTypes(getTypeOfSymbol(sourceProperty));
          if (numCombinations > 25) return qt.Ternary.False;
        }
        const sourceDiscriminantTypes: qc.Type[][] = new Array<qc.Type[]>(sourcePropertiesFiltered.length);
        const excludedProperties = qu.createEscapedMap<true>();
        for (let i = 0; i < sourcePropertiesFiltered.length; i++) {
          const sourceProperty = sourcePropertiesFiltered[i];
          const sourcePropertyType = getTypeOfSymbol(sourceProperty);
          sourceDiscriminantTypes[i] = sourcePropertyType.flags & TypeFlags.Union ? (sourcePropertyType as UnionType).types : [sourcePropertyType];
          excludedProperties.set(sourceProperty.escName, true);
        }
        const discriminantCombinations = cartesianProduct(sourceDiscriminantTypes);
        const matchingTypes: qc.Type[] = [];
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
          if (!hasMatch) return qt.Ternary.False;
        }
        let result = qt.Ternary.True;
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
      function isPropertySymbolTypeRelated(
        sourceProp: Symbol,
        targetProp: Symbol,
        getTypeOfSourceProperty: (sym: Symbol) => qc.Type,
        reportErrors: boolean,
        intersectionState: IntersectionState
      ): qt.Ternary {
        const targetIsOptional = strictNullChecks && !!(getCheckFlags(targetProp) & qt.CheckFlags.Partial);
        const source = getTypeOfSourceProperty(sourceProp);
        if (getCheckFlags(targetProp) & qt.CheckFlags.DeferredType && !s.getLinks(targetProp).type) {
          const links = s.getLinks(targetProp);
          qg.assertIsDefined(links.deferralParent);
          qg.assertIsDefined(links.deferralConstituents);
          const unionParent = !!(links.deferralParent.flags & TypeFlags.Union);
          let result = unionParent ? qt.Ternary.False : qt.Ternary.True;
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
        source: qc.Type,
        target: qc.Type,
        sourceProp: Symbol,
        targetProp: Symbol,
        getTypeOfSourceProperty: (sym: Symbol) => qc.Type,
        reportErrors: boolean,
        intersectionState: IntersectionState,
        skipOptional: boolean
      ): qt.Ternary {
        const sourcePropFlags = getDeclarationModifierFlagsFromSymbol(sourceProp);
        const targetPropFlags = getDeclarationModifierFlagsFromSymbol(targetProp);
        if (sourcePropFlags & ModifierFlags.Private || targetPropFlags & ModifierFlags.Private) {
          if (sourceProp.valueDeclaration !== targetProp.valueDeclaration) {
            if (reportErrors) {
              if (sourcePropFlags & ModifierFlags.Private && targetPropFlags & ModifierFlags.Private)
                reportError(qd.msgs.Types_have_separate_declarations_of_a_private_property_0, targetProp.symbolToString());
              else {
                reportError(
                  qd.msgs.Property_0_is_private_in_type_1_but_not_in_type_2,
                  targetProp.symbolToString(),
                  typeToString(sourcePropFlags & ModifierFlags.Private ? source : target),
                  typeToString(sourcePropFlags & ModifierFlags.Private ? target : source)
                );
              }
            }
            return qt.Ternary.False;
          }
        } else if (targetPropFlags & ModifierFlags.Protected) {
          if (!isValidOverrideOf(sourceProp, targetProp)) {
            if (reportErrors) {
              reportError(
                qd.msgs.Property_0_is_protected_but_type_1_is_not_a_class_derived_from_2,
                targetProp.symbolToString(),
                typeToString(getDeclaringClass(sourceProp) || source),
                typeToString(getDeclaringClass(targetProp) || target)
              );
            }
            return qt.Ternary.False;
          }
        } else if (sourcePropFlags & ModifierFlags.Protected) {
          if (reportErrors) reportError(qd.msgs.Property_0_is_protected_in_type_1_but_public_in_type_2, targetProp.symbolToString(), typeToString(source), typeToString(target));
          return qt.Ternary.False;
        }
        const related = isPropertySymbolTypeRelated(sourceProp, targetProp, getTypeOfSourceProperty, reportErrors, intersectionState);
        if (!related) {
          if (reportErrors) reportIncompatibleError(qd.msgs.Types_of_property_0_are_incompatible, targetProp.symbolToString());
          return qt.Ternary.False;
        }
        if (!skipOptional && sourceProp.flags & qt.SymbolFlags.Optional && !(targetProp.flags & qt.SymbolFlags.Optional)) {
          if (reportErrors) reportError(qd.msgs.Property_0_is_optional_in_type_1_but_required_in_type_2, targetProp.symbolToString(), typeToString(source), typeToString(target));
          return qt.Ternary.False;
        }
        return related;
      }
      function reportUnmatchedProperty(source: qc.Type, target: qc.Type, unmatchedProperty: Symbol, requireOptionalProperties: boolean) {
        let shouldSkipElaboration = false;
        if (
          unmatchedProperty.valueDeclaration &&
          qf.is.namedDeclaration(unmatchedProperty.valueDeclaration) &&
          qf.is.kind(qc.PrivateIdentifier, unmatchedProperty.valueDeclaration.name) &&
          source.symbol &&
          source.symbol.flags & qt.SymbolFlags.Class
        ) {
          const privateIdentifierDescription = unmatchedProperty.valueDeclaration.name.escapedText;
          const symbolTableKey = getSymbolNameForPrivateIdentifier(source.symbol, privateIdentifierDescription);
          if (symbolTableKey && getPropertyOfType(source, symbolTableKey)) {
            const sourceName = getDeclarationName(source.symbol.valueDeclaration);
            const targetName = getDeclarationName(target.symbol.valueDeclaration);
            reportError(
              qd.msgs.Property_0_in_type_1_refers_to_a_different_member_that_cannot_be_accessed_from_within_type_2,
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
          (headMessage.code !== qd.msgs.Class_0_incorrectly_implements_interface_1.code &&
            headMessage.code !== qd.msgs.Class_0_incorrectly_implements_class_1_Did_you_mean_to_extend_1_and_inherit_its_members_as_a_subclass.code)
        ) {
          shouldSkipElaboration = true;
        }
        if (props.length === 1) {
          const propName = unmatchedProperty.symbolToString();
          reportError(qd.msgs.Property_0_is_missing_in_type_1_but_required_in_type_2, propName, ...getTypeNamesForErrorDisplay(source, target));
          if (length(unmatchedProperty.declarations)) associateRelatedInfo(qf.create.diagnosticForNode(unmatchedProperty.declarations[0], qd.msgs._0_is_declared_here, propName));
          if (shouldSkipElaboration && errorInfo) overrideNextErrorInfo++;
        } else if (tryElaborateArrayLikeErrors(source, target, false)) {
          if (props.length > 5) {
            reportError(
              qd.msgs.Type_0_is_missing_the_following_properties_from_type_1_Colon_2_and_3_more,
              typeToString(source),
              typeToString(target),
              map(props.slice(0, 4), (p) => p.symbolToString()).join(', '),
              props.length - 4
            );
          } else {
            reportError(qd.msgs.Type_0_is_missing_the_following_properties_from_type_1_Colon_2, typeToString(source), typeToString(target), map(props, (p) => p.symbolToString()).join(', '));
          }
          if (shouldSkipElaboration && errorInfo) overrideNextErrorInfo++;
        }
      }
      function propertiesRelatedTo(source: qc.Type, target: qc.Type, reportErrors: boolean, excludedProperties: EscapedMap<true> | undefined, intersectionState: IntersectionState): qt.Ternary {
        if (relation === identityRelation) return propertiesIdenticalTo(source, target, excludedProperties);
        const requireOptionalProperties =
          (relation === subtypeRelation || relation === strictSubtypeRelation) && !isObjectLiteralType(source) && !isEmptyArrayLiteralType(source) && !isTupleType(source);
        const unmatchedProperty = getUnmatchedProperty(source, target, requireOptionalProperties, false);
        if (unmatchedProperty) {
          if (reportErrors) reportUnmatchedProperty(source, target, unmatchedProperty, requireOptionalProperties);
          return qt.Ternary.False;
        }
        if (isObjectLiteralType(target)) {
          for (const sourceProp of excludeProperties(getPropertiesOfType(source), excludedProperties)) {
            if (!getPropertyOfObjectType(target, sourceProp.escName)) {
              const sourceType = getTypeOfSymbol(sourceProp);
              if (!(sourceType === undefinedType || sourceType === undefinedWideningType || sourceType === optionalType)) {
                if (reportErrors) reportError(qd.msgs.Property_0_does_not_exist_on_type_1, sourceProp.symbolToString(), typeToString(target));
                return qt.Ternary.False;
              }
            }
          }
        }
        let result = qt.Ternary.True;
        if (isTupleType(target)) {
          const targetRestType = getRestTypeOfTupleType(target);
          if (targetRestType) {
            if (!isTupleType(source)) return qt.Ternary.False;
            const sourceRestType = getRestTypeOfTupleType(source);
            if (sourceRestType && !isRelatedTo(sourceRestType, targetRestType, reportErrors)) {
              if (reportErrors) reportError(qd.msgs.Rest_signatures_are_incompatible);
              return qt.Ternary.False;
            }
            const targetCount = getTypeReferenceArity(target) - 1;
            const sourceCount = getTypeReferenceArity(source) - (sourceRestType ? 1 : 0);
            const sourceTypeArguments = getTypeArguments(<TypeReference>source);
            for (let i = targetCount; i < sourceCount; i++) {
              const related = isRelatedTo(sourceTypeArguments[i], targetRestType, reportErrors);
              if (!related) {
                if (reportErrors) reportError(qd.msgs.Property_0_is_incompatible_with_rest_element_type, '' + i);
                return qt.Ternary.False;
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
              if (!related) return qt.Ternary.False;
              result &= related;
            }
          }
        }
        return result;
      }
      function propertiesIdenticalTo(source: qc.Type, target: qc.Type, excludedProperties: EscapedMap<true> | undefined): qt.Ternary {
        if (!(source.flags & TypeFlags.Object && target.flags & TypeFlags.Object)) return qt.Ternary.False;
        const sourceProperties = excludeProperties(getPropertiesOfObjectType(source), excludedProperties);
        const targetProperties = excludeProperties(getPropertiesOfObjectType(target), excludedProperties);
        if (sourceProperties.length !== targetProperties.length) return qt.Ternary.False;
        let result = qt.Ternary.True;
        for (const sourceProp of sourceProperties) {
          const targetProp = getPropertyOfObjectType(target, sourceProp.escName);
          if (!targetProp) return qt.Ternary.False;
          const related = compareProperties(sourceProp, targetProp, isRelatedTo);
          if (!related) return qt.Ternary.False;
          result &= related;
        }
        return result;
      }
      function signaturesRelatedTo(source: qc.Type, target: qc.Type, kind: SignatureKind, reportErrors: boolean): qt.Ternary {
        if (relation === identityRelation) return signaturesIdenticalTo(source, target, kind);
        if (target === anyFunctionType || source === anyFunctionType) return qt.Ternary.True;
        const sourceIsJSConstructor = source.symbol && isJSConstructor(source.symbol.valueDeclaration);
        const targetIsJSConstructor = target.symbol && isJSConstructor(target.symbol.valueDeclaration);
        const sourceSignatures = getSignaturesOfType(source, sourceIsJSConstructor && kind === SignatureKind.Construct ? SignatureKind.Call : kind);
        const targetSignatures = getSignaturesOfType(target, targetIsJSConstructor && kind === SignatureKind.Construct ? SignatureKind.Call : kind);
        if (kind === SignatureKind.Construct && sourceSignatures.length && targetSignatures.length) {
          if (isAbstractConstructorType(source) && !isAbstractConstructorType(target)) {
            if (reportErrors) reportError(qd.msgs.Cannot_assign_an_abstract_constructor_type_to_a_non_abstract_constructor_type);
            return qt.Ternary.False;
          }
          if (!constructorVisibilitiesAreCompatible(sourceSignatures[0], targetSignatures[0], reportErrors)) return qt.Ternary.False;
        }
        let result = qt.Ternary.True;
        const saveErrorInfo = captureErrorCalculationState();
        const incompatibleReporter = kind === SignatureKind.Construct ? reportIncompatibleConstructSignatureReturn : reportIncompatibleCallSignatureReturn;
        if (getObjectFlags(source) & ObjectFlags.Instantiated && getObjectFlags(target) & ObjectFlags.Instantiated && source.symbol === target.symbol) {
          for (let i = 0; i < targetSignatures.length; i++) {
            const related = signatureRelatedTo(sourceSignatures[i], targetSignatures[i], true, reportErrors, incompatibleReporter(sourceSignatures[i], targetSignatures[i]));
            if (!related) return qt.Ternary.False;
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
            if (shouldElaborateErrors) reportError(qd.msgs.Type_0_provides_no_match_for_the_signature_1, typeToString(source), signatureToString(t, undefined, undefined, kind));
            return qt.Ternary.False;
          }
        }
        return result;
      }
      function reportIncompatibleCallSignatureReturn(siga: Signature, sigb: Signature) {
        if (siga.parameters.length === 0 && sigb.parameters.length === 0) {
          return (source: qc.Type, target: qc.Type) =>
            reportIncompatibleError(qd.msgs.Call_signatures_with_no_arguments_have_incompatible_return_types_0_and_1, typeToString(source), typeToString(target));
        }
        return (source: qc.Type, target: qc.Type) => reportIncompatibleError(qd.msgs.Call_signature_return_types_0_and_1_are_incompatible, typeToString(source), typeToString(target));
      }
      function reportIncompatibleConstructSignatureReturn(siga: Signature, sigb: Signature) {
        if (siga.parameters.length === 0 && sigb.parameters.length === 0) {
          return (source: qc.Type, target: qc.Type) =>
            reportIncompatibleError(qd.msgs.Construct_signatures_with_no_arguments_have_incompatible_return_types_0_and_1, typeToString(source), typeToString(target));
        }
        return (source: qc.Type, target: qc.Type) => reportIncompatibleError(qd.msgs.Construct_signature_return_types_0_and_1_are_incompatible, typeToString(source), typeToString(target));
      }
      function signatureRelatedTo(source: Signature, target: Signature, erase: boolean, reportErrors: boolean, incompatibleReporter: (source: qc.Type, target: qc.Type) => void): qt.Ternary {
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
      function signaturesIdenticalTo(source: qc.Type, target: qc.Type, kind: SignatureKind): qt.Ternary {
        const sourceSignatures = getSignaturesOfType(source, kind);
        const targetSignatures = getSignaturesOfType(target, kind);
        if (sourceSignatures.length !== targetSignatures.length) return qt.Ternary.False;
        let result = qt.Ternary.True;
        for (let i = 0; i < sourceSignatures.length; i++) {
          const related = compareSignaturesIdentical(sourceSignatures[i], targetSignatures[i], false, isRelatedTo);
          if (!related) return qt.Ternary.False;
          result &= related;
        }
        return result;
      }
      function eachPropertyRelatedTo(source: qc.Type, target: qc.Type, kind: IndexKind, reportErrors: boolean): qt.Ternary {
        let result = qt.Ternary.True;
        const props = source.flags & TypeFlags.Intersection ? getPropertiesOfqc.UnionOrIntersectionType(<IntersectionType>source) : getPropertiesOfObjectType(source);
        for (const prop of props) {
          if (isIgnoredJsxProperty(source, prop)) continue;
          const nameType = s.getLinks(prop).nameType;
          if (nameType && nameType.flags & TypeFlags.UniqueESSymbol) continue;
          if (kind === IndexKind.String || NumericLiteral.name(prop.escName)) {
            const related = isRelatedTo(getTypeOfSymbol(prop), target, reportErrors);
            if (!related) {
              if (reportErrors) reportError(qd.msgs.Property_0_is_incompatible_with_index_signature, prop.symbolToString());
              return qt.Ternary.False;
            }
            result &= related;
          }
        }
        return result;
      }
      function indexTypeRelatedTo(sourceType: qc.Type, targetType: qc.Type, reportErrors: boolean) {
        const related = isRelatedTo(sourceType, targetType, reportErrors);
        if (!related && reportErrors) reportError(qd.msgs.Index_signatures_are_incompatible);
        return related;
      }
      function indexTypesRelatedTo(source: qc.Type, target: qc.Type, kind: IndexKind, sourceIsPrimitive: boolean, reportErrors: boolean, intersectionState: IntersectionState): qt.Ternary {
        if (relation === identityRelation) return indexTypesIdenticalTo(source, target, kind);
        const targetType = getIndexTypeOfType(target, kind);
        if (!targetType || (targetType.flags & TypeFlags.Any && !sourceIsPrimitive)) return qt.Ternary.True;
        if (isGenericMappedType(source)) return getIndexTypeOfType(target, IndexKind.String) ? isRelatedTo(getTemplateTypeFromMappedType(source), targetType, reportErrors) : qt.Ternary.False;
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
        if (reportErrors) reportError(qd.msgs.Index_signature_is_missing_in_type_0, typeToString(source));
        return qt.Ternary.False;
      }
      function indexTypesIdenticalTo(source: qc.Type, target: qc.Type, indexKind: IndexKind): qt.Ternary {
        const targetInfo = getIndexInfoOfType(target, indexKind);
        const sourceInfo = getIndexInfoOfType(source, indexKind);
        if (!sourceInfo && !targetInfo) return qt.Ternary.True;
        if (sourceInfo && targetInfo && sourceInfo.isReadonly === targetInfo.isReadonly) return isRelatedTo(sourceInfo.type, targetInfo.type);
        return qt.Ternary.False;
      }
      function constructorVisibilitiesAreCompatible(sourceSignature: Signature, targetSignature: Signature, reportErrors: boolean) {
        if (!sourceSignature.declaration || !targetSignature.declaration) return true;
        const sourceAccessibility = qf.get.selectedEffectiveModifierFlags(sourceSignature.declaration, ModifierFlags.NonPublicAccessibilityModifier);
        const targetAccessibility = qf.get.selectedEffectiveModifierFlags(targetSignature.declaration, ModifierFlags.NonPublicAccessibilityModifier);
        if (targetAccessibility === ModifierFlags.Private) return true;
        if (targetAccessibility === ModifierFlags.Protected && sourceAccessibility !== ModifierFlags.Private) return true;
        if (targetAccessibility !== ModifierFlags.Protected && !sourceAccessibility) return true;
        if (reportErrors) reportError(qd.msgs.Cannot_assign_a_0_constructor_type_to_a_1_constructor_type, visibilityToString(sourceAccessibility), visibilityToString(targetAccessibility));
        return false;
      }
    }
    identifier(n: qc.Identifier): qc.Type {
      const symbol = getResolvedSymbol(n);
      if (symbol === unknownSymbol) return errorType;
      if (symbol === argumentsSymbol) {
        const container = qf.get.containingFunction(n)!;
        getNodeLinks(container).flags |= NodeCheckFlags.CaptureArguments;
        return this.getTypeOfSymbol();
      }
      if (!(n.parent && qf.is.kind(qc.PropertyAccessExpression, n.parent) && n.parent.expression === n)) markAliasReferenced(symbol, n);
      const localOrExportSymbol = getExportSymbolOfValueSymbolIfExported(symbol);
      let declaration: Declaration | undefined = localOrExportSymbol.valueDeclaration;
      if (localOrExportSymbol.flags & qt.SymbolFlags.Class) {
        if (declaration.kind === Syntax.ClassDeclaration && nodeIsDecorated(declaration as ClassDeclaration)) {
          let container = qf.get.containingClass(n);
          while (container !== undefined) {
            if (container === declaration && container.name !== n) {
              getNodeLinks(declaration).flags |= NodeCheckFlags.ClassWithConstructorReference;
              getNodeLinks(n).flags |= NodeCheckFlags.ConstructorReferenceInClass;
              break;
            }
            container = qf.get.containingClass(container);
          }
        } else if (declaration.kind === Syntax.ClassExpression) {
          let container = qf.get.thisContainer(n, false);
          while (container.kind !== Syntax.SourceFile) {
            if (container.parent === declaration) {
              if (container.kind === Syntax.PropertyDeclaration && qf.has.syntacticModifier(container, ModifierFlags.Static)) {
                getNodeLinks(declaration).flags |= NodeCheckFlags.ClassWithConstructorReference;
                getNodeLinks(n).flags |= NodeCheckFlags.ConstructorReferenceInClass;
              }
              break;
            }
            container = qf.get.thisContainer(container, false);
          }
        }
      }
      nestedBlockScopedBinding(n, symbol);
      const type = getConstraintForLocation(getTypeOfSymbol(localOrExportSymbol), n);
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
        if (assignmentKind === AssignmentKind.Definite) return type;
      } else if (isAlias) {
        declaration = find<Declaration>(symbol.declarations, isSomeImportDeclaration);
      }
      return type;
      if (!declaration) return type;
      const isParameter = qf.get.rootDeclaration(declaration).kind === Syntax.Parameter;
      const declarationContainer = getControlFlowContainer(declaration);
      let flowContainer = getControlFlowContainer(n);
      const isOuterVariable = flowContainer !== declarationContainer;
      const isSpreadDestructuringAssignmentTarget = n.parent && n.parent.parent && qf.is.kind(qc.SpreadAssignment, n.parent) && isDestructuringAssignmentTarget(n.parent.parent);
      const isModuleExports = symbol.flags & qt.SymbolFlags.ModuleExports;
      while (
        flowContainer !== declarationContainer &&
        (flowContainer.kind === Syntax.FunctionExpression || flowContainer.kind === Syntax.ArrowFunction || qf.is.objectLiteralOrClassExpressionMethod(flowContainer)) &&
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
        qf.is.kind(qc.BindingElement, declaration) ||
        (type !== autoType &&
          type !== autoArrayType &&
          (!strictNullChecks || (type.flags & (TypeFlags.AnyOrUnknown | TypeFlags.Void)) !== 0 || isInTypeQuery(n) || n.parent.kind === Syntax.ExportSpecifier)) ||
        n.parent.kind === Syntax.NonNullExpression ||
        (declaration.kind === Syntax.VariableDeclaration && (<VariableDeclaration>declaration).exclamationToken) ||
        declaration.flags & NodeFlags.Ambient;
      const initialType = assumeInitialized
        ? isParameter
          ? removeOptionalityFromDeclaredType(type, declaration as VariableLikeDeclaration)
          : type
        : type === autoType || type === autoArrayType
        ? undefinedType
        : getOptionalType(type);
      const flowType = getFlowTypeOfReference(n, type, initialType, flowContainer, !assumeInitialized);
      if (!isEvolvingArrayOperationTarget(n) && (type === autoType || type === autoArrayType)) {
        if (flowType === autoType || flowType === autoArrayType) {
          if (noImplicitAny) {
            error(
              qf.get.nameOfDeclaration(declaration),
              qd.msgs.Variable_0_implicitly_has_type_1_in_some_locations_where_its_type_cannot_be_determined,
              symbol.symbolToString(),
              typeToString(flowType)
            );
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
    nestedBlockScopedBinding(n: qc.Identifier, symbol: Symbol): void {
      return;
    }
    thisBeforeSuper(n: Node, container: Node, diagnosticMessage: qd.Message) {
      const containingClassDecl = <ClassDeclaration>container.parent;
      const baseTypeNode = qf.get.classExtendsHeritageElement(containingClassDecl);
      if (baseTypeNode && !classDeclarationExtendsNull(containingClassDecl)) {
        if (n.flowNode && !isPostSuperFlowNode(n.flowNode, false)) error(n, diagnosticMessage);
      }
    }
    thisNodeIsExpression(n: Node): qc.Type {
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
          if (isInConstructorArgumentIniter(n, container)) error(n, qd.this_cannot_be_referenced_in_constructor_arguments);
          break;
        case Syntax.PropertyDeclaration:
        case Syntax.PropertySignature:
          if (qf.has.syntacticModifier(container, ModifierFlags.Static) && !(compilerOptions.target === ScriptTarget.ESNext && compilerOptions.useDefineForClassFields))
            error(n, qd.this_cannot_be_referenced_in_a_static_property_initer);
          break;
        case Syntax.ComputedPropertyName:
          error(n, qd.this_cannot_be_referenced_in_a_computed_property_name);
          break;
      }
      const type = tryGetThisTypeAt(n, true, container);
      if (noImplicitThis) {
        const globalThisType = getTypeOfSymbol(globalThisSymbol);
        if (type === globalThisType && capturedByArrowFunction) error(n, qd.msgs.The_containing_arrow_function_captures_the_global_value_of_this);
        else if (!type) {
          const diag = error(n, qd.this_implicitly_has_type_any_because_it_does_not_have_a_type_annotation);
          if (!qf.is.kind(qc.SourceFile, container)) {
            const outsideThis = tryGetThisTypeAt(container);
            if (outsideThis && outsideThis !== globalThisType) addRelatedInfo(diag, qf.create.diagnosticForNode(container, qd.msgs.An_outer_value_of_this_is_shadowed_by_this_container));
          }
        }
      }
      return type || anyType;
    }
    superExpression(n: Node): qc.Type {
      const isCallExpression = n.parent.kind === Syntax.CallExpression && (<CallExpression>n.parent).expression === n;
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
      getNodeLinks(n).flags |= nodeCheckFlag;
      if (container.kind === Syntax.MethodDeclaration && qf.has.syntacticModifier(container, ModifierFlags.Async)) {
        if (qf.is.superProperty(n.parent) && qf.is.assignmentTarget(n.parent)) getNodeLinks(container).flags |= NodeCheckFlags.AsyncMethodWithSuperBinding;
        else {
          getNodeLinks(container).flags |= NodeCheckFlags.AsyncMethodWithSuper;
        }
      }
      if (needToCaptureLexicalThis) captureLexicalThis(n.parent, container);
      if (container.parent.kind === Syntax.ObjectLiteralExpression) return anyType;
      const classLikeDeclaration = <ClassLikeDeclaration>container.parent;
      if (!qf.get.classExtendsHeritageElement(classLikeDeclaration)) {
        error(n, qd.super_can_only_be_referenced_in_a_derived_class);
        return errorType;
      }
      const classType = <InterfaceType>getDeclaredTypeOfSymbol(getSymbolOfNode(classLikeDeclaration));
      const baseClassType = classType && getBaseTypes(classType)[0];
      if (!baseClassType) return errorType;
      if (container.kind === Syntax.Constructor && isInConstructorArgumentIniter(n, container)) {
        error(n, qd.super_cannot_be_referenced_in_constructor_arguments);
        return errorType;
      }
      return nodeCheckFlag === NodeCheckFlags.SuperStatic ? getBaseConstructorTypeOfClass(classType) : getTypeWithThisArgument(baseClassType, classType.thisType);
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
    spreadExpression(n: qc.SpreadElement, checkMode?: CheckMode): qc.Type {
      const arrayOrIterableType = this.expression(n.expression, checkMode);
      return this.iteratedTypeOrElementType(IterationUse.Spread, arrayOrIterableType, undefinedType, n.expression);
    }
    arrayLiteral(n: qc.ArrayLiteralExpression, checkMode: CheckMode | undefined, forceTuple: boolean | undefined): qc.Type {
      const elements = n.elements;
      const elementCount = elements.length;
      const elementTypes: qc.Type[] = [];
      let hasEndingSpreadElement = false;
      let hasNonEndingSpreadElement = false;
      const contextualType = getApparentTypeOfContextualType(n);
      const inDestructuringPattern = qf.is.assignmentTarget(n);
      const inConstContext = isConstContext(n);
      for (let i = 0; i < elementCount; i++) {
        const e = elements[i];
        const spread = e.kind === Syntax.SpreadElement && (<SpreadElement>e).expression;
        const spreadType = spread && this.expression(spread, checkMode, forceTuple);
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
            const type = this.expressionForMutableLocation(e, checkMode, elementContextualType, forceTuple);
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
          type.pattern = n;
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
    computedPropertyName(n: qc.ComputedPropertyName): qc.Type {
      const links = getNodeLinks(n.expression);
      if (!links.resolvedType) {
        links.resolvedType = this.expression(n.expression);
        if (
          links.resolvedType.flags & TypeFlags.Nullable ||
          (!isTypeAssignableToKind(links.resolvedType, TypeFlags.StringLike | TypeFlags.NumberLike | TypeFlags.ESSymbolLike) && !isTypeAssignableTo(links.resolvedType, stringNumberSymbolType))
        ) {
          error(n, qd.msgs.A_computed_property_name_must_be_of_type_string_number_symbol_or_any);
        } else {
          this.thatExpressionIsProperSymbolReference(n.expression, links.resolvedType, true);
        }
      }
      return links.resolvedType;
    }
    objectLiteral(n: qc.ObjectLiteralExpression, checkMode?: CheckMode): qc.Type {
      const inDestructuringPattern = qf.is.assignmentTarget(n);
      checkGrammar.objectLiteralExpression(n, inDestructuringPattern);
      const allPropertiesTable = strictNullChecks ? new SymbolTable() : undefined;
      let propertiesTable = new SymbolTable();
      let propertiesArray: Symbol[] = [];
      let spread: qc.Type = emptyObjectType;
      const contextualType = getApparentTypeOfContextualType(n);
      const contextualTypeHasPattern =
        contextualType && contextualType.pattern && (contextualType.pattern.kind === Syntax.ObjectBindingPattern || contextualType.pattern.kind === Syntax.ObjectLiteralExpression);
      const inConstContext = isConstContext(n);
      const checkFlags = inConstContext ? qt.CheckFlags.Readonly : 0;
      const isInJavascript = qf.is.inJSFile(n) && !qf.is.inJsonFile(n);
      const enumTag = qc.getDoc.enumTag(n);
      const isJSObjectLiteral = !contextualType && isInJavascript && !enumTag;
      let objectFlags: ObjectFlags = freshObjectLiteralFlag;
      let patternWithComputedProperties = false;
      let hasComputedStringProperty = false;
      let hasComputedNumberProperty = false;
      for (const elem of n.properties) {
        if (elem.name && qf.is.kind(qc.ComputedPropertyName, elem.name) && !qf.is.wellKnownSymbolSyntactically(elem.name)) this.computedPropertyName(elem.name);
      }
      let offset = 0;
      for (let i = 0; i < n.properties.length; i++) {
        const memberDecl = n.properties[i];
        let member = getSymbolOfNode(memberDecl);
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
              this.typeAssignableTo(type, docType, memberDecl);
              type = docType;
            } else if (enumTag && enumTag.typeExpression) {
              this.typeAssignableTo(type, getTypeFromTypeNode(enumTag.typeExpression), memberDecl);
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
            propertiesTable = new SymbolTable();
            hasComputedStringProperty = false;
            hasComputedNumberProperty = false;
          }
          const type = getReducedType(this.expression(memberDecl.expression));
          if (!isValidSpreadType(type)) {
            error(memberDecl, qd.msgs.Spread_types_may_only_be_created_from_object_types);
            return errorType;
          }
          if (allPropertiesTable) this.spreadPropOverrides(type, allPropertiesTable, memberDecl);
          spread = getSpreadType(spread, type, n.symbol, objectFlags, inConstContext);
          offset = i + 1;
          continue;
        } else {
          qu.assert(memberDecl.kind === Syntax.GetAccessor || memberDecl.kind === Syntax.SetAccessor);
          this.nodeDeferred(memberDecl);
        }
        if (computedNameType && !(computedNameType.flags & TypeFlags.StringOrNumberLiteralOrUnique)) {
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
      if (contextualTypeHasPattern && n.parent.kind !== Syntax.SpreadAssignment) {
        for (const prop of getPropertiesOfType(contextualType!)) {
          if (!propertiesTable.get(prop.escName) && !getPropertyOfType(spread, prop.escName)) {
            if (!(prop.flags & qt.SymbolFlags.Optional))
              error(prop.valueDeclaration || (<TransientSymbol>prop).bindingElement, qd.msgs.Initer_provides_no_value_for_this_binding_element_and_the_binding_element_has_no_default_value);
            propertiesTable.set(prop.escName, prop);
            propertiesArray.push(prop);
          }
        }
      }
      if (spread !== emptyObjectType) {
        if (propertiesArray.length > 0) {
          spread = getSpreadType(spread, createObjectLiteralType(), n.symbol, objectFlags, inConstContext);
          propertiesArray = [];
          propertiesTable = new SymbolTable();
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
      jsxSelfClosingElementDeferred(n: qc.JsxSelfClosingElement) {
        this.jsxOpeningLikeElementOrOpeningFragment(n);
        resolveUntypedCall(n);
      }
      jsxSelfClosingElement(n: qc.JsxSelfClosingElement, _checkMode: CheckMode | undefined): qc.Type {
        this.nodeDeferred(n);
        return getJsxElementTypeAt(n) || anyType;
      }
      jsxElementDeferred(n: qc.JsxElement) {
        this.jsxOpeningLikeElementOrOpeningFragment(n.openingElement);
        if (isJsxIntrinsicIdentifier(n.closingElement.tagName)) getIntrinsicTagSymbol(n.closingElement);
        else {
          this.expression(n.closingElement.tagName);
        }
        this.jsxChildren(n);
      }
      jsxElement(n: qc.JsxElement, _checkMode: CheckMode | undefined): qc.Type {
        this.nodeDeferred(n);
        return getJsxElementTypeAt(n) || anyType;
      }
      jsxFragment(n: qc.JsxFragment): qc.Type {
        this.jsxOpeningLikeElementOrOpeningFragment(n.openingFragment);
        if (compilerOptions.jsx === JsxEmit.React && (compilerOptions.jsxFactory || qf.get.sourceFileOf(n).pragmas.has('jsx')))
          error(n, compilerOptions.jsxFactory ? qd.msgs.JSX_fragment_is_not_supported_when_using_jsxFactory : qd.msgs.JSX_fragment_is_not_supported_when_using_an_inline_JSX_factory_pragma);
        this.jsxChildren(n);
        return getJsxElementTypeAt(n) || anyType;
      }
      jsxAttribute(n: qc.JsxAttribute, checkMode?: CheckMode) {
        return n.initer ? this.expressionForMutableLocation(n.initer, checkMode) : trueType;
      }
      jsxChildren(n: qc.JsxElement | JsxFragment, checkMode?: CheckMode) {
        const childrenTypes: qc.Type[] = [];
        for (const child of n.children) {
          if (child.kind === Syntax.JsxText) {
            if (!child.onlyTriviaWhitespaces) childrenTypes.push(stringType);
          } else {
            childrenTypes.push(this.expressionForMutableLocation(child, checkMode));
          }
        }
        return childrenTypes;
      }
      jsxAttributes(n: qc.JsxAttributes, checkMode: CheckMode | undefined) {
        return createJsxAttributesTypeFromAttributesProperty(n.parent, checkMode);
      }
      jsxReturnAssignableToAppropriateBound(refKind: JsxReferenceKind, elemInstanceType: qc.Type, openingLikeElement: JsxOpeningLikeElement) {
        if (refKind === JsxReferenceKind.Function) {
          const sfcReturnConstraint = getJsxStatelessElementTypeAt(openingLikeElement);
          if (sfcReturnConstraint)
            this.typeRelatedTo(elemInstanceType, sfcReturnConstraint, assignableRelation, openingLikeElement.tagName, qd.msgs.Its_return_type_0_is_not_a_valid_JSX_element, generateInitialErrorChain);
        } else if (refKind === JsxReferenceKind.Component) {
          const classConstraint = getJsxElementClassTypeAt(openingLikeElement);
          if (classConstraint)
            this.typeRelatedTo(elemInstanceType, classConstraint, assignableRelation, openingLikeElement.tagName, qd.msgs.Its_instance_type_0_is_not_a_valid_JSX_element, generateInitialErrorChain);
        } else {
          const sfcReturnConstraint = getJsxStatelessElementTypeAt(openingLikeElement);
          const classConstraint = getJsxElementClassTypeAt(openingLikeElement);
          if (!sfcReturnConstraint || !classConstraint) return;
          const combined = getUnionType([sfcReturnConstraint, classConstraint]);
          this.typeRelatedTo(elemInstanceType, combined, assignableRelation, openingLikeElement.tagName, qd.msgs.Its_element_type_0_is_not_a_valid_JSX_element, generateInitialErrorChain);
        }
        function generateInitialErrorChain(): qd.MessageChain {
          const componentName = qf.get.textOf(openingLikeElement.tagName);
          return chainqd.Messages(undefined, qd.msgs._0_cannot_be_used_as_a_JSX_component, componentName);
        }
      }
      jsxPreconditions(errorNode: Node) {
        if ((compilerOptions.jsx || JsxEmit.None) === JsxEmit.None) error(errorNode, qd.msgs.Cannot_use_JSX_unless_the_jsx_flag_is_provided);
        if (getJsxElementTypeAt(errorNode) === undefined) {
          if (noImplicitAny) error(errorNode, qd.msgs.JSX_element_implicitly_has_type_any_because_the_global_type_JSX_Element_does_not_exist);
        }
      }
      jsxOpeningLikeElementOrOpeningFragment(n: qc.JsxOpeningLikeElement | JsxOpeningFragment) {
        const isNodeOpeningLikeElement = qc.isJsx.openingLikeElement(n);
        if (isNodeOpeningLikeElement) checkGrammar.jsxElement(<JsxOpeningLikeElement>n);
        this.jsxPreconditions(n);
        const reactRefErr = diagnostics && compilerOptions.jsx === JsxEmit.React ? qd.msgs.Cannot_find_name_0 : undefined;
        const reactNamespace = getJsxNamespace(n);
        const reactLocation = isNodeOpeningLikeElement ? (<JsxOpeningLikeElement>n).tagName : n;
        const reactSym = resolveName(reactLocation, reactNamespace, qt.SymbolFlags.Value, reactRefErr, reactNamespace, true);
        if (reactSym) {
          reactSym.isReferenced = qt.SymbolFlags.All;
          if (reactSym.flags & qt.SymbolFlags.Alias && !reactSym.getTypeOnlyAliasDeclaration()) reactSym.markAliasSymbolAsReferenced();
        }
        if (isNodeOpeningLikeElement) {
          const jsxOpeningLikeNode = n as JsxOpeningLikeElement;
          const sig = getResolvedSignature(jsxOpeningLikeNode);
          this.jsxReturnAssignableToAppropriateBound(getJsxReferenceKind(jsxOpeningLikeNode), getReturnTypeOfSignature(sig), jsxOpeningLikeNode);
        }
      }
      jsxExpression(n: qc.JsxExpression, checkMode?: CheckMode) {
        checkGrammar.jsxExpression(n);
        if (n.expression) {
          const type = this.expression(n.expression, checkMode);
          if (n.dot3Token && type !== anyType && !isArrayType(type)) error(n, qd.msgs.JSX_spread_child_must_be_an_array_type);
          return type;
        }
        return errorType;
      }
    })();
    spreadPropOverrides(type: qc.Type, props: SymbolTable, spread: SpreadAssignment | JsxSpreadAttribute) {
      for (const right of getPropertiesOfType(type)) {
        const left = props.get(right.escName);
        const rightType = getTypeOfSymbol(right);
        if (left && !maybeTypeOfKind(rightType, TypeFlags.Nullable) && !(maybeTypeOfKind(rightType, TypeFlags.AnyOrUnknown) && right.flags & qt.SymbolFlags.Optional)) {
          const diagnostic = error(left.valueDeclaration, qd.msgs._0_is_specified_more_than_once_so_this_usage_will_be_overwritten, qy.qf.get.unescUnderscores(left.escName));
          addRelatedInfo(diagnostic, qf.create.diagnosticForNode(spread, qd.msgs.This_spread_always_overwrites_this_property));
        }
      }
    }
    propertyAccessibility(
      n:
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
      type: qc.Type,
      prop: Symbol
    ): boolean {
      const flags = getDeclarationModifierFlagsFromSymbol(prop);
      const errorNode = n.kind === Syntax.QualifiedName ? n.right : n.kind === Syntax.ImportType ? n : n.name;
      if (isSuper) {
        if (flags & ModifierFlags.Abstract) {
          error(errorNode, qd.msgs.Abstract_method_0_in_class_1_cannot_be_accessed_via_super_expression, prop.symbolToString(), typeToString(getDeclaringClass(prop)!));
          return false;
        }
      }
      if (flags & ModifierFlags.Abstract && qf.is.thisProperty(n) && symbolHasNonMethodDeclaration(prop)) {
        const declaringClassDeclaration = getClassLikeDeclarationOfSymbol(getParentOfSymbol(prop)!);
        if (declaringClassDeclaration && isNodeUsedDuringClassInitialization(n)) {
          error(errorNode, qd.msgs.Abstract_property_0_in_class_1_cannot_be_accessed_in_the_constructor, prop.symbolToString(), qf.get.textOfIdentifierOrLiteral(declaringClassDeclaration.name!));
          return false;
        }
      }
      if (qf.is.kind(qc.PropertyAccessExpression, n) && qf.is.kind(qc.PrivateIdentifier, n.name)) {
        if (!qf.get.containingClass(n)) {
          error(errorNode, qd.msgs.Private_identifiers_are_not_allowed_outside_class_bodies);
          return false;
        }
        return true;
      }
      if (!(flags & ModifierFlags.NonPublicAccessibilityModifier)) return true;
      if (flags & ModifierFlags.Private) {
        const declaringClassDeclaration = getClassLikeDeclarationOfSymbol(getParentOfSymbol(prop)!)!;
        if (!isNodeWithinClass(n, declaringClassDeclaration)) {
          error(errorNode, qd.msgs.Property_0_is_private_and_only_accessible_within_class_1, prop.symbolToString(), typeToString(getDeclaringClass(prop)!));
          return false;
        }
        return true;
      }
      if (isSuper) return true;
      let enclosingClass = forEachEnclosingClass(n, (enclosingDeclaration) => {
        const enclosingClass = <InterfaceType>getDeclaredTypeOfSymbol(getSymbolOfNode(enclosingDeclaration)!);
        return isClassDerivedFromDeclaringClasses(enclosingClass, prop) ? enclosingClass : undefined;
      });
      if (!enclosingClass) {
        let thisParameter: ParameterDeclaration | undefined;
        if (flags & ModifierFlags.Static || !(thisParameter = getThisParameterFromNodeContext(n)) || !thisParameter.type) {
          error(errorNode, qd.msgs.Property_0_is_protected_and_only_accessible_within_class_1_and_its_subclasses, prop.symbolToString(), typeToString(getDeclaringClass(prop) || type));
          return false;
        }
        const thisType = getTypeFromTypeNode(thisParameter.type);
        enclosingClass = ((thisType.flags & TypeFlags.TypeParameter ? getConstraintOfTypeParameter(<TypeParameter>thisType) : thisType) as TypeReference).target;
      }
      if (flags & ModifierFlags.Static) return true;
      if (type.flags & TypeFlags.TypeParameter) type = (type as TypeParameter).isThisType ? getConstraintOfTypeParameter(<TypeParameter>type)! : getBaseConstraintOfType(<TypeParameter>type)!;
      if (!type || !hasBaseType(type, enclosingClass)) {
        error(errorNode, qd.msgs.Property_0_is_protected_and_only_accessible_through_an_instance_of_class_1, prop.symbolToString(), typeToString(enclosingClass));
        return false;
      }
      return true;
    }
    nonNullExpression(n: qc.Expression | QualifiedName) {
      return this.nonNullType(this.expression(n), n);
    }
    nonNullTypeWithReporter(type: qc.Type, n: Node, reportError: (n: Node, kind: qt.TypeFlags) => void): qc.Type {
      if (strictNullChecks && type.flags & TypeFlags.Unknown) {
        error(n, qd.msgs.Object_is_of_type_unknown);
        return errorType;
      }
      const kind = (strictNullChecks ? getFalsyFlags(type) : type.flags) & TypeFlags.Nullable;
      if (kind) {
        reportError(n, kind);
        const t = getNonNullableType(type);
        return t.flags & (TypeFlags.Nullable | TypeFlags.Never) ? errorType : t;
      }
      return type;
    }
    nonNullType(type: qc.Type, n: Node) {
      return this.nonNullTypeWithReporter(type, n, reportObjectPossiblyNullOrUndefinedError);
    }
    nonNullNonVoidType(type: qc.Type, n: Node): qc.Type {
      const nonNullType = this.nonNullType(type, n);
      if (nonNullType !== errorType && nonNullType.flags & TypeFlags.Void) error(n, qd.msgs.Object_is_possibly_undefined);
      return nonNullType;
    }
    propertyAccessExpression(n: qc.PropertyAccessExpression) {
      return n.flags & NodeFlags.OptionalChain
        ? this.propertyAccessChain(n as PropertyAccessChain)
        : this.propertyAccessExpressionOrQualifiedName(n, n.expression, this.nonNullExpression(n.expression), n.name);
    }
    propertyAccessChain(n: qc.PropertyAccessChain) {
      const leftType = this.expression(n.expression);
      const nonOptionalType = getOptionalExpressionType(leftType, n.expression);
      return propagateOptionalTypeMarker(this.propertyAccessExpressionOrQualifiedName(n, n.expression, this.nonNullType(nonOptionalType, n.expression), n.name), n, nonOptionalType !== leftType);
    }
    qualifiedName(n: qc.QualifiedName) {
      return this.propertyAccessExpressionOrQualifiedName(n, n.left, this.nonNullExpression(n.left), n.right);
    }
    privateIdentifierPropertyAccess(leftType: qc.Type, right: PrivateIdentifier, lexicallyScopedIdentifier: Symbol | undefined): boolean {
      let propertyOnType: Symbol | undefined;
      const properties = getPropertiesOfType(leftType);
      if (properties) {
        forEach(properties, (symbol: Symbol) => {
          const decl = symbol.valueDeclaration;
          if (decl && qf.is.namedDeclaration(decl) && qf.is.kind(qc.PrivateIdentifier, decl.name) && decl.name.escapedText === right.escapedText) {
            propertyOnType = symbol;
            return true;
          }
        });
      }
      const diagName = diagnosticName(right);
      if (propertyOnType) {
        const typeValueDecl = propertyOnType.valueDeclaration;
        const typeClass = qf.get.containingClass(typeValueDecl);
        qu.assert(!!typeClass);
        if (lexicallyScopedIdentifier) {
          const lexicalValueDecl = lexicallyScopedIdentifier.valueDeclaration;
          const lexicalClass = qf.get.containingClass(lexicalValueDecl);
          qu.assert(!!lexicalClass);
          if (qc.findAncestor(lexicalClass, (x) => typeClass === x)) {
            const diagnostic = error(
              right,
              qd.msgs.The_property_0_cannot_be_accessed_on_type_1_within_this_class_because_it_is_shadowed_by_another_private_identifier_with_the_same_spelling,
              diagName,
              typeToString(leftType)
            );
            addRelatedInfo(
              diagnostic,
              qf.create.diagnosticForNode(lexicalValueDecl, qd.msgs.The_shadowing_declaration_of_0_is_defined_here, diagName),
              qf.create.diagnosticForNode(typeValueDecl, qd.msgs.The_declaration_of_0_that_you_probably_intended_to_use_is_defined_here, diagName)
            );
            return true;
          }
        }
        error(right, qd.msgs.Property_0_is_not_accessible_outside_class_1_because_it_has_a_private_identifier, diagName, diagnosticName(typeClass.name || anon));
        return true;
      }
      return false;
    }
    propertyAccessExpressionOrQualifiedName(n: qc.PropertyAccessExpression | QualifiedName, left: Expression | QualifiedName, leftType: qc.Type, right: qc.Identifier | PrivateIdentifier) {
      const parentSymbol = getNodeLinks(left).resolvedSymbol;
      const assignmentKind = qf.get.assignmentTargetKind(n);
      const apparentType = getApparentType(assignmentKind !== AssignmentKind.None || isMethodAccessForCall(n) ? getWidenedType(leftType) : leftType);
      if (qf.is.kind(qc.PrivateIdentifier, right)) this.externalEmitHelpers(n, ExternalEmitHelpers.ClassPrivateFieldGet);
      const isAnyLike = isTypeAny(apparentType) || apparentType === silentNeverType;
      let prop: Symbol | undefined;
      if (qf.is.kind(qc.PrivateIdentifier, right)) {
        const lexicallyScopedSymbol = lookupSymbolForPrivateIdentifierDeclaration(right.escapedText, right);
        if (isAnyLike) {
          if (lexicallyScopedSymbol) return apparentType;
          if (!qf.get.containingClass(right)) {
            grammarErrorOnNode(right, qd.msgs.Private_identifiers_are_not_allowed_outside_class_bodies);
            return anyType;
          }
        }
        prop = lexicallyScopedSymbol ? getPrivateIdentifierPropertyOfType(leftType, lexicallyScopedSymbol) : undefined;
        if (!prop && this.privateIdentifierPropertyAccess(leftType, right, lexicallyScopedSymbol)) return errorType;
      } else {
        if (isAnyLike) {
          if (qf.is.kind(qc.Identifier, left) && parentSymbol) markAliasReferenced(parentSymbol, n);
          return apparentType;
        }
        prop = getPropertyOfType(apparentType, right.escapedText);
      }
      if (qf.is.kind(qc.Identifier, left) && parentSymbol && !(prop && isConstEnumOrConstEnumOnlyModule(prop))) markAliasReferenced(parentSymbol, n);
      let propType: qc.Type;
      if (!prop) {
        const indexInfo =
          !qf.is.kind(qc.PrivateIdentifier, right) && (assignmentKind === AssignmentKind.None || !isGenericObjectType(leftType) || isThisTypeParameter(leftType))
            ? getIndexInfoOfType(apparentType, IndexKind.String)
            : undefined;
        if (!(indexInfo && indexInfo.type)) {
          if (isJSLiteralType(leftType)) return anyType;
          if (leftType.symbol === globalThisSymbol) {
            if (globalThisSymbol.exports!.has(right.escapedText) && globalThisSymbol.exports!.get(right.escapedText)!.flags & qt.SymbolFlags.BlockScoped)
              error(right, qd.msgs.Property_0_does_not_exist_on_type_1, qy.qf.get.unescUnderscores(right.escapedText), typeToString(leftType));
            else if (noImplicitAny) {
              error(right, qd.msgs.Element_implicitly_has_an_any_type_because_type_0_has_no_index_signature, typeToString(leftType));
            }
            return anyType;
          }
          if (right.escapedText && !this.andReportErrorForExtendingInterface(n)) reportNonexistentProperty(right, isThisTypeParameter(leftType) ? apparentType : leftType);
          return errorType;
        }
        if (indexInfo.isReadonly && (qf.is.assignmentTarget(n) || qf.is.deleteTarget(n))) error(n, qd.msgs.Index_signature_in_type_0_only_permits_reading, typeToString(apparentType));
        propType = indexInfo.type;
      } else {
        this.propertyNotUsedBeforeDeclaration(prop, n, right);
        markPropertyAsReferenced(prop, n, left.kind === Syntax.ThisKeyword);
        getNodeLinks(n).resolvedSymbol = prop;
        this.propertyAccessibility(n, left.kind === Syntax.SuperKeyword, apparentType, prop);
        if (isAssignmentToReadonlyEntity(n as Expression, prop, assignmentKind)) {
          error(right, qd.msgs.Cannot_assign_to_0_because_it_is_a_read_only_property, idText(right));
          return errorType;
        }
        propType = isThisPropertyAccessInConstructor(n, prop) ? autoType : getConstraintForLocation(getTypeOfSymbol(prop), n);
      }
      return getFlowTypeOfAccessExpression(n, prop, propType, right);
    }
    propertyNotUsedBeforeDeclaration(prop: Symbol, n: PropertyAccessExpression | QualifiedName, right: qc.Identifier | PrivateIdentifier): void {
      const { valueDeclaration } = prop;
      if (!valueDeclaration || qf.get.sourceFileOf(n).isDeclarationFile) return;
      let diagnosticMessage;
      const declarationName = idText(right);
      if (
        isInPropertyIniter(n) &&
        !(qf.is.accessExpression(n) && qf.is.accessExpression(n.expression)) &&
        !isBlockScopedNameDeclaredBeforeUse(valueDeclaration, right) &&
        !isPropertyDeclaredInAncestorClass(prop)
      ) {
        diagnosticMessage = error(right, qd.msgs.Property_0_is_used_before_its_initialization, declarationName);
      } else if (
        valueDeclaration.kind === Syntax.ClassDeclaration &&
        n.parent.kind !== Syntax.TypeReference &&
        !(valueDeclaration.flags & NodeFlags.Ambient) &&
        !isBlockScopedNameDeclaredBeforeUse(valueDeclaration, right)
      ) {
        diagnosticMessage = error(right, qd.msgs.Class_0_used_before_its_declaration, declarationName);
      }
      if (diagnosticMessage) addRelatedInfo(diagnosticMessage, qf.create.diagnosticForNode(valueDeclaration, qd.msgs._0_is_declared_here, declarationName));
    }
    indexedAccess(n: qc.ElementAccessExpression): qc.Type {
      return n.flags & NodeFlags.OptionalChain ? this.elementAccessChain(n as ElementAccessChain) : this.elementAccessExpression(n, this.nonNullExpression(n.expression));
    }
    elementAccessChain(n: qc.ElementAccessChain) {
      const exprType = this.expression(n.expression);
      const nonOptionalType = getOptionalExpressionType(exprType, n.expression);
      return propagateOptionalTypeMarker(this.elementAccessExpression(n, this.nonNullType(nonOptionalType, n.expression)), n, nonOptionalType !== exprType);
    }
    elementAccessExpression(n: qc.ElementAccessExpression, exprType: qc.Type): qc.Type {
      const objectType = qf.get.assignmentTargetKind(n) !== AssignmentKind.None || isMethodAccessForCall(n) ? getWidenedType(exprType) : exprType;
      const indexExpression = n.argumentExpression;
      const indexType = this.expression(indexExpression);
      if (objectType === errorType || objectType === silentNeverType) return objectType;
      if (isConstEnumObjectType(objectType) && !StringLiteral.like(indexExpression)) {
        error(indexExpression, qd.msgs.A_const_enum_member_can_only_be_accessed_using_a_string_literal);
        return errorType;
      }
      const effectiveIndexType = isForInVariableForNumericPropertyNames(indexExpression) ? numberType : indexType;
      const accessFlags = qf.is.assignmentTarget(n)
        ? AccessFlags.Writing | (isGenericObjectType(objectType) && !isThisTypeParameter(objectType) ? AccessFlags.NoIndexSignatures : 0)
        : AccessFlags.None;
      const indexedAccessType = getIndexedAccessTypeOrUndefined(objectType, effectiveIndexType, n, accessFlags) || errorType;
      return this.indexedAccessIndexType(getFlowTypeOfAccessExpression(n, indexedAccessType.symbol, indexedAccessType, indexExpression), n);
    }
    thatExpressionIsProperSymbolReference(expression: Expression, expressionType: qc.Type, reportError: boolean): boolean {
      if (expressionType === errorType) return false;
      if (!qf.is.wellKnownSymbolSyntactically(expression)) return false;
      if ((expressionType.flags & TypeFlags.ESSymbolLike) === 0) {
        if (reportError) error(expression, qd.msgs.A_computed_property_name_of_the_form_0_must_be_of_type_symbol, qf.get.textOf(expression));
        return false;
      }
      const leftHandSide = <qc.Identifier>(<PropertyAccessExpression>expression).expression;
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
    typeArguments(signature: Signature, typeArgumentNodes: readonly TypeNode[], reportErrors: boolean, headMessage?: qd.Message): qc.Type[] | undefined {
      const isJavascript = qf.is.inJSFile(signature.declaration);
      const typeParameters = signature.typeParameters!;
      const typeArgumentTypes = fillMissingTypeArguments(map(typeArgumentNodes, getTypeFromTypeNode), typeParameters, getMinTypeArgumentCount(typeParameters), isJavascript);
      let mapper: TypeMapper | undefined;
      for (let i = 0; i < typeArgumentNodes.length; i++) {
        qu.assert(typeParameters[i] !== undefined, 'Should not call checkTypeArguments with too many type arguments');
        const constraint = getConstraintOfTypeParameter(typeParameters[i]);
        if (constraint) {
          const errorInfo = reportErrors && headMessage ? () => chainqd.Messages(undefined, qd.msgs.Type_0_does_not_satisfy_the_constraint_1) : undefined;
          const typeArgumentHeadMessage = headMessage || qd.msgs.Type_0_does_not_satisfy_the_constraint_1;
          if (!mapper) mapper = createTypeMapper(typeParameters, typeArgumentTypes);
          const typeArgument = typeArgumentTypes[i];
          if (
            !this.typeAssignableTo(
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
    applicableSignatureForJsxOpeningLikeElement(
      n: JsxOpeningLikeElement,
      signature: Signature,
      relation: qu.QMap<RelationComparisonResult>,
      checkMode: CheckMode,
      reportErrors: boolean,
      containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
      errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean }
    ) {
      const paramType = getEffectiveFirstArgumentForJsxSignature(signature, n);
      const attributesType = this.expressionWithContextualType(n.attributes, paramType, undefined, checkMode);
      return (
        this.tagNameDoesNotExpectTooManyArguments() &&
        this.typeRelatedToAndOptionallyElaborate(attributesType, paramType, relation, reportErrors ? n.tagName : undefined, n.attributes, undefined, containingMessageChain, errorOutputContainer)
      );
      function checkTagNameDoesNotExpectTooManyArguments(): boolean {
        const tagType = qf.is.kind(qc.JsxOpeningElement, n) || (qf.is.kind(qc.JsxSelfClosingElement, n) && !isJsxIntrinsicIdentifier(n.tagName)) ? this.expression(n.tagName) : undefined;
        if (!tagType) return true;
        const tagCallSignatures = getSignaturesOfType(tagType, SignatureKind.Call);
        if (!length(tagCallSignatures)) return true;
        const factory = getJsxFactoryEntity(n);
        if (!factory) return true;
        const factorySymbol = resolveEntityName(factory, qt.SymbolFlags.Value, true, false, n);
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
          const diag = qf.create.diagnosticForNode(
            n.tagName,
            qd.msgs.Tag_0_expects_at_least_1_arguments_but_the_JSX_factory_2_provides_at_most_3,
            entityNameToString(n.tagName),
            absoluteMinArgCount,
            entityNameToString(factory),
            maxParamCount
          );
          const tagNameDeclaration = getSymbolAtLocation(n.tagName)?.valueDeclaration;
          if (tagNameDeclaration) addRelatedInfo(diag, qf.create.diagnosticForNode(tagNameDeclaration, qd.msgs._0_is_declared_here, entityNameToString(n.tagName)));
          if (errorOutputContainer && errorOutputContainer.skipLogging) (errorOutputContainer.errors || (errorOutputContainer.errors = [])).push(diag);
          if (!errorOutputContainer.skipLogging) diagnostics.add(diag);
        }
        return false;
      }
    }
    callExpression(n: qc.CallExpression | NewExpression, checkMode?: CheckMode): qc.Type {
      if (!checkGrammar.typeArguments(n, n.typeArguments)) checkGrammar.arguments(n.arguments);
      const signature = getResolvedSignature(n, undefined, checkMode);
      if (signature === resolvingSignature) return nonInferrableType;
      if (n.expression.kind === Syntax.SuperKeyword) return voidType;
      if (n.kind === Syntax.NewExpression) {
        const declaration = signature.declaration;
        if (
          declaration &&
          declaration.kind !== Syntax.Constructor &&
          declaration.kind !== Syntax.ConstructSignature &&
          declaration.kind !== Syntax.ConstructorType &&
          !qc.isDoc.constructSignature(declaration) &&
          !isJSConstructor(declaration)
        ) {
          if (noImplicitAny) error(n, qd.new_expression_whose_target_lacks_a_construct_signature_implicitly_has_an_any_type);
          return anyType;
        }
      }
      if (qf.is.inJSFile(n) && isCommonJsRequire(n)) return resolveExternalModuleTypeByLiteral(n.arguments![0] as StringLiteral);
      const returnType = getReturnTypeOfSignature(signature);
      if (returnType.flags & TypeFlags.ESSymbolLike && isSymbolOrSymbolForCall(n)) return getESSymbolLikeTypeForNode(walkUpParenthesizedExpressions(n.parent));
      if (n.kind === Syntax.CallExpression && n.parent.kind === Syntax.ExpressionStatement && returnType.flags & TypeFlags.Void && getTypePredicateOfSignature(signature)) {
        if (!isDottedName(n.expression)) error(n.expression, qd.msgs.Assertions_require_the_call_target_to_be_an_identifier_or_qualified_name);
        else if (!getEffectsSignature(n)) {
          const diagnostic = error(n.expression, qd.msgs.Assertions_require_every_name_in_the_call_target_to_be_declared_with_an_explicit_type_annotation);
          getTypeOfDottedName(n.expression, diagnostic);
        }
      }
      if (qf.is.inJSFile(n)) {
        const decl = qf.get.declarationOfExpando(n);
        if (decl) {
          const jsSymbol = getSymbolOfNode(decl);
          if (jsSymbol && qu.hasEntries(jsSymbol.exports)) {
            const jsAssignmentType = createAnonymousType(jsSymbol, jsSymbol.exports, empty, empty, undefined, undefined);
            jsAssignmentType.objectFlags |= ObjectFlags.JSLiteral;
            return getIntersectionType([returnType, jsAssignmentType]);
          }
        }
      }
      return returnType;
    }
    importCallExpression(n: qc.ImportCall): qc.Type {
      if (!checkGrammar.arguments(n.arguments)) checkGrammar.importCallExpression(n);
      if (n.arguments.length === 0) return createPromiseReturnType(n, anyType);
      const specifier = n.arguments[0];
      const specifierType = this.expressionCached(specifier);
      for (let i = 1; i < n.arguments.length; ++i) {
        this.expressionCached(n.arguments[i]);
      }
      if (specifierType.flags & TypeFlags.Undefined || specifierType.flags & TypeFlags.Null || !isTypeAssignableTo(specifierType, stringType))
        error(specifier, qd.msgs.Dynamic_import_s_specifier_must_be_of_type_string_but_here_has_type_0, typeToString(specifierType));
      const moduleSymbol = resolveExternalModuleName(n, specifier);
      if (moduleSymbol) {
        const esModuleSymbol = resolveESModuleSymbol(moduleSymbol, specifier, true, false);
        if (esModuleSymbol) return createPromiseReturnType(n, getTypeWithSyntheticDefaultImportType(getTypeOfSymbol(esModuleSymbol), esModuleSymbol, moduleSymbol));
      }
      return createPromiseReturnType(n, anyType);
    }
    taggedTemplateExpression(n: qc.TaggedTemplateExpression): qc.Type {
      if (!checkGrammar.taggedTemplateChain(n)) checkGrammar.typeArguments(n, n.typeArguments);
      return getReturnTypeOfSignature(getResolvedSignature(n));
    }
    assertion(n: qc.AssertionExpression) {
      return this.assertionWorker(n, n.type, n.expression);
    }
    assertionWorker(errNode: Node, type: TypeNode, expression: UnaryExpression | Expression, checkMode?: CheckMode) {
      let exprType = this.expression(expression, checkMode);
      if (qf.is.constTypeReference(type)) {
        if (!isValidConstAssertionArgument(expression))
          error(expression, qd.msgs.A_const_assertions_can_only_be_applied_to_references_to_enum_members_or_string_number_boolean_array_or_object_literals);
        return getRegularTypeOfLiteralType(exprType);
      }
      this.sourceElement(type);
      exprType = getRegularTypeOfObjectLiteral(getBaseTypeOfLiteralType(exprType));
      const targetType = getTypeFromTypeNode(type);
      if (produceDiagnostics && targetType !== errorType) {
        const widenedType = getWidenedType(exprType);
        if (!isTypeComparableTo(targetType, widenedType)) {
          this.typeComparableTo(
            exprType,
            targetType,
            errNode,
            qd.msgs.Conversion_of_type_0_to_type_1_may_be_a_mistake_because_neither_type_sufficiently_overlaps_with_the_other_If_this_was_intentional_convert_the_expression_to_unknown_first
          );
        }
      }
      return targetType;
    }
    nonNullChain(n: qc.NonNullChain) {
      const leftType = this.expression(n.expression);
      const nonOptionalType = getOptionalExpressionType(leftType, n.expression);
      return propagateOptionalTypeMarker(getNonNullableType(nonOptionalType), n, nonOptionalType !== leftType);
    }
    nonNullAssertion(n: qc.NonNullExpression) {
      return n.flags & NodeFlags.OptionalChain ? this.nonNullChain(n as NonNullChain) : getNonNullableType(this.expression(n.expression));
    }
    metaProperty(n: qc.MetaProperty): qc.Type {
      checkGrammar.metaProperty(n);
      if (n.keywordToken === Syntax.NewKeyword) return this.newTargetMetaProperty(n);
      if (n.keywordToken === Syntax.ImportKeyword) return this.importMetaProperty(n);
      return qg.assertNever(n.keywordToken);
    }
    newTargetMetaProperty(n: qc.MetaProperty) {
      const container = qf.get.newTargetContainer(n);
      if (!container) {
        error(n, qd.msgs.Meta_property_0_is_only_allowed_in_the_body_of_a_function_declaration_function_expression_or_constructor, 'new.target');
        return errorType;
      } else if (container.kind === Syntax.Constructor) {
        const symbol = getSymbolOfNode(container.parent as ClassLikeDeclaration);
        return this.getTypeOfSymbol();
      } else {
        const symbol = getSymbolOfNode(container)!;
        return this.getTypeOfSymbol();
      }
    }
    importMetaProperty(n: qc.MetaProperty) {
      if (moduleKind !== ModuleKind.ESNext && moduleKind !== ModuleKind.System) error(n, qd.msgs.The_import_meta_meta_property_is_only_allowed_when_the_module_option_is_esnext_or_system);
      const file = qf.get.sourceFileOf(n);
      qu.assert(!!(file.flags & NodeFlags.PossiblyContainsImportMeta), 'Containing file is missing import meta n flag.');
      qu.assert(!!file.externalModuleIndicator, 'Containing file should be a module.');
      return n.name.escapedText === 'meta' ? getGlobalImportMetaType() : errorType;
    }
    andAggregateYieldOperandTypes(func: FunctionLikeDeclaration, checkMode: CheckMode | undefined) {
      const yieldTypes: qc.Type[] = [];
      const nextTypes: qc.Type[] = [];
      const isAsync = (getFunctionFlags(func) & FunctionFlags.Async) !== 0;
      forEachYieldExpression(<Block>func.body, (yieldExpression) => {
        const yieldExpressionType = yieldExpression.expression ? this.expression(yieldExpression.expression, checkMode) : undefinedWideningType;
        pushIfUnique(yieldTypes, getYieldedTypeOfYieldExpression(yieldExpression, yieldExpressionType, anyType, isAsync));
        let nextType: qc.Type | undefined;
        if (yieldExpression.asteriskToken) {
          const iterationTypes = getIterationTypesOfIterable(yieldExpressionType, isAsync ? IterationUse.AsyncYieldStar : IterationUse.YieldStar, yieldExpression.expression);
          nextType = iterationTypes && iterationTypes.nextType;
        } else nextType = getContextualType(yieldExpression);
        if (nextType) pushIfUnique(nextTypes, nextType);
      });
      return { yieldTypes, nextTypes };
    }
    andAggregateReturnExpressionTypes(func: FunctionLikeDeclaration, checkMode: CheckMode | undefined): qc.Type[] | undefined {
      const functionFlags = getFunctionFlags(func);
      const aggregatedTypes: qc.Type[] = [];
      let hasReturnWithNoExpression = functionHasImplicitReturn(func);
      let hasReturnOfTypeNever = false;
      forEachReturnStatement(<Block>func.body, (returnStatement) => {
        const expr = returnStatement.expression;
        if (expr) {
          let type = this.expressionCached(expr, checkMode && checkMode & ~CheckMode.SkipGenericFunctions);
          if (functionFlags & FunctionFlags.Async)
            type = this.awaitedType(type, func, qd.msgs.The_return_type_of_an_async_function_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member);
          if (type.flags & TypeFlags.Never) hasReturnOfTypeNever = true;
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
    allCodePathsInNonVoidFunctionReturnOrThrow(func: FunctionLikeDeclaration | MethodSignature, returnType: qc.Type | undefined): void {
      if (!produceDiagnostics) return;
      const functionFlags = getFunctionFlags(func);
      const type = returnType && unwrapReturnType(returnType, functionFlags);
      if (type && maybeTypeOfKind(type, TypeFlags.Any | TypeFlags.Void)) return;
      if (func.kind === Syntax.MethodSignature || qf.is.missing(func.body) || func.body!.kind !== Syntax.Block || !functionHasImplicitReturn(func)) return;
      const hasExplicitReturn = func.flags & NodeFlags.HasExplicitReturn;
      if (type && type.flags & TypeFlags.Never) error(qf.get.effectiveReturnTypeNode(func), qd.msgs.A_function_returning_never_cannot_have_a_reachable_end_point);
      else if (type && !hasExplicitReturn) {
        error(qf.get.effectiveReturnTypeNode(func), qd.msgs.A_function_whose_declared_type_is_neither_void_nor_any_must_return_a_value);
      } else if (type && strictNullChecks && !isTypeAssignableTo(undefinedType, type)) {
        error(qf.get.effectiveReturnTypeNode(func) || func, qd.msgs.Function_lacks_ending_return_statement_and_return_type_does_not_include_undefined);
      } else if (compilerOptions.noImplicitReturns) {
        if (!type) {
          if (!hasExplicitReturn) return;
          const inferredReturnType = getReturnTypeOfSignature(getSignatureFromDeclaration(func));
          if (isUnwrappedReturnTypeVoidOrAny(func, inferredReturnType)) return;
        }
        error(qf.get.effectiveReturnTypeNode(func) || func, qd.msgs.Not_all_code_paths_return_a_value);
      }
    }
    functionExpressionOrObjectLiteralMethod(n: qc.FunctionExpression | ArrowFunction | MethodDeclaration, checkMode?: CheckMode): qc.Type {
      qu.assert(n.kind !== Syntax.MethodDeclaration || qf.is.objectLiteralMethod(n));
      this.nodeDeferred(n);
      if (checkMode && checkMode & CheckMode.SkipContextSensitive && isContextSensitive(n)) {
        if (!qf.get.effectiveReturnTypeNode(n) && !hasContextSensitiveParameters(n)) {
          const contextualSignature = getContextualSignature(n);
          if (contextualSignature && couldContainTypeVariables(getReturnTypeOfSignature(contextualSignature))) {
            const links = getNodeLinks(n);
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
      return getTypeOfSymbol(getSymbolOfNode(n));
    }
    functionExpressionOrObjectLiteralMethodDeferred(n: qc.ArrowFunction | FunctionExpression | MethodDeclaration) {
      qu.assert(n.kind !== Syntax.MethodDeclaration || qf.is.objectLiteralMethod(n));
      const functionFlags = getFunctionFlags(n);
      const returnType = getReturnTypeFromAnnotation(n);
      this.allCodePathsInNonVoidFunctionReturnOrThrow(n, returnType);
      if (n.body) {
        if (!qf.get.effectiveReturnTypeNode(n)) getReturnTypeOfSignature(getSignatureFromDeclaration(n));
        if (n.body.kind === Syntax.Block) this.sourceElement(n.body);
        else {
          const exprType = this.expression(n.body);
          const returnOrPromisedType = returnType && unwrapReturnType(returnType, functionFlags);
          if (returnOrPromisedType) {
            if ((functionFlags & FunctionFlags.AsyncGenerator) === FunctionFlags.Async) {
              const awaitedType = this.awaitedType(exprType, n.body, qd.msgs.The_return_type_of_an_async_function_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member);
              this.typeAssignableToAndOptionallyElaborate(awaitedType, returnOrPromisedType, n.body, n.body);
            } else {
              this.typeAssignableToAndOptionallyElaborate(exprType, returnOrPromisedType, n.body, n.body);
            }
          }
        }
      }
    }
    arithmeticOperandType(operand: Node, type: qc.Type, diagnostic: qd.Message, isAwaitValid = false): boolean {
      if (!isTypeAssignableTo(type, numberOrBigIntType)) {
        const awaitedType = isAwaitValid && getAwaitedTypeOfPromise(type);
        errorAndMaybeSuggestAwait(operand, !!awaitedType && isTypeAssignableTo(awaitedType, numberOrBigIntType), diagnostic);
        return false;
      }
      return true;
    }
    referenceExpression(expr: Expression, invalidReferenceMessage: qd.Message, invalidOptionalChainMessage: qd.Message): boolean {
      const n = skipOuterExpressions(expr, OuterExpressionKinds.Assertions | OuterExpressionKinds.Parentheses);
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
    deleteExpression(n: qc.DeleteExpression): qc.Type {
      this.expression(n.expression);
      const expr = skipParentheses(n.expression);
      if (!qf.is.accessExpression(expr)) {
        error(expr, qd.msgs.The_operand_of_a_delete_operator_must_be_a_property_reference);
        return booleanType;
      }
      if (expr.kind === Syntax.PropertyAccessExpression && qf.is.kind(qc.PrivateIdentifier, expr.name)) error(expr, qd.msgs.The_operand_of_a_delete_operator_cannot_be_a_private_identifier);
      const links = getNodeLinks(expr);
      const symbol = getExportSymbolOfValueSymbolIfExported(links.resolvedSymbol);
      if (symbol) {
        if (isReadonlySymbol(symbol)) error(expr, qd.msgs.The_operand_of_a_delete_operator_cannot_be_a_read_only_property);
        this.deleteExpressionMustBeOptional(expr, this.getTypeOfSymbol());
      }
      return booleanType;
    }
    deleteExpressionMustBeOptional(expr: AccessExpression, type: qc.Type) {
      const AnyOrUnknownOrNeverFlags = TypeFlags.AnyOrUnknown | TypeFlags.Never;
      if (strictNullChecks && !(type.flags & AnyOrUnknownOrNeverFlags) && !(getFalsyFlags(type) & TypeFlags.Undefined)) error(expr, qd.msgs.The_operand_of_a_delete_operator_must_be_optional);
    }
    typeOfExpression(n: qc.TypeOfExpression): qc.Type {
      this.expression(n.expression);
      return typeofType;
    }
    voidExpression(n: qc.VoidExpression): qc.Type {
      this.expression(n.expression);
      return undefinedWideningType;
    }
    awaitExpression(n: qc.AwaitExpression): qc.Type {
      if (produceDiagnostics) {
        if (!(n.flags & NodeFlags.AwaitContext)) {
          if (isTopLevelAwait(n)) {
            const sourceFile = qf.get.sourceFileOf(n);
            if (!hasParseDiagnostics(sourceFile)) {
              let span: TextSpan | undefined;
              if (!isEffectiveExternalModule(sourceFile, compilerOptions)) {
                if (!span) span = getSpanOfTokenAtPosition(sourceFile, n.pos);
                const diagnostic = qf.create.fileDiagnostic(
                  sourceFile,
                  span.start,
                  span.length,
                  qd.await_expressions_are_only_allowed_at_the_top_level_of_a_file_when_that_file_is_a_module_but_this_file_has_no_imports_or_exports_Consider_adding_an_empty_export_to_make_this_file_a_module
                );
                diagnostics.add(diagnostic);
              }
              if (moduleKind !== ModuleKind.ESNext && moduleKind !== ModuleKind.System) {
                span = getSpanOfTokenAtPosition(sourceFile, n.pos);
                const diagnostic = qf.create.fileDiagnostic(
                  sourceFile,
                  span.start,
                  span.length,
                  qd.msgs.Top_level_await_expressions_are_only_allowed_when_the_module_option_is_set_to_esnext_or_system_and_the_target_option_is_set_to_es2017_or_higher
                );
                diagnostics.add(diagnostic);
              }
            }
          } else {
            const sourceFile = qf.get.sourceFileOf(n);
            if (!hasParseDiagnostics(sourceFile)) {
              const span = getSpanOfTokenAtPosition(sourceFile, n.pos);
              const diagnostic = qf.create.fileDiagnostic(sourceFile, span.start, span.length, qd.await_expressions_are_only_allowed_within_async_functions_and_at_the_top_levels_of_modules);
              const func = qf.get.containingFunction(n);
              if (func && func.kind !== Syntax.Constructor && (getFunctionFlags(func) & FunctionFlags.Async) === 0) {
                const relatedInfo = qf.create.diagnosticForNode(func, qd.msgs.Did_you_mean_to_mark_this_function_as_async);
                addRelatedInfo(diagnostic, relatedInfo);
              }
              diagnostics.add(diagnostic);
            }
          }
        }
        if (isInParameterIniterBeforeContainingFunction(n)) error(n, qd.await_expressions_cannot_be_used_in_a_parameter_initer);
      }
      const operandType = this.expression(n.expression);
      const awaitedType = this.awaitedType(operandType, n, qd.msgs.Type_of_await_operand_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member);
      if (awaitedType === operandType && awaitedType !== errorType && !(operandType.flags & TypeFlags.AnyOrUnknown))
        addErrorOrSuggestion(false, qf.create.diagnosticForNode(n, qd.await_has_no_effect_on_the_type_of_this_expression));
      return awaitedType;
    }
    prefixUnaryExpression(n: qc.PrefixUnaryExpression): qc.Type {
      const operandType = this.expression(n.operand);
      if (operandType === silentNeverType) return silentNeverType;
      switch (n.operand.kind) {
        case Syntax.NumericLiteral:
          switch (n.operator) {
            case Syntax.MinusToken:
              return getFreshTypeOfLiteralType(getLiteralType(-(n.operand as NumericLiteral).text));
            case Syntax.PlusToken:
              return getFreshTypeOfLiteralType(getLiteralType(+(n.operand as NumericLiteral).text));
          }
          break;
        case Syntax.BigIntLiteral:
          if (n.operator === Syntax.MinusToken) {
            return getFreshTypeOfLiteralType(
              getLiteralType({
                negative: true,
                base10Value: parsePseudoBigInt((n.operand as BigIntLiteral).text),
              })
            );
          }
      }
      switch (n.operator) {
        case Syntax.PlusToken:
        case Syntax.MinusToken:
        case Syntax.TildeToken:
          this.nonNullType(operandType, n.operand);
          if (maybeTypeOfKind(operandType, TypeFlags.ESSymbolLike)) error(n.operand, qd.msgs.The_0_operator_cannot_be_applied_to_type_symbol, Token.toString(n.operator));
          if (n.operator === Syntax.PlusToken) {
            if (maybeTypeOfKind(operandType, TypeFlags.BigIntLike))
              error(n.operand, qd.msgs.Operator_0_cannot_be_applied_to_type_1, Token.toString(n.operator), typeToString(getBaseTypeOfLiteralType(operandType)));
            return numberType;
          }
          return getUnaryResultType(operandType);
        case Syntax.ExclamationToken:
          this.truthinessExpression(n.operand);
          const facts = getTypeFacts(operandType) & (TypeFacts.Truthy | TypeFacts.Falsy);
          return facts === TypeFacts.Truthy ? falseType : facts === TypeFacts.Falsy ? trueType : booleanType;
        case Syntax.Plus2Token:
        case Syntax.Minus2Token:
          const ok = this.arithmeticOperandType(n.operand, this.nonNullType(operandType, n.operand), qd.msgs.An_arithmetic_operand_must_be_of_type_any_number_bigint_or_an_enum_type);
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
    postfixUnaryExpression(n: qc.PostfixUnaryExpression): qc.Type {
      const operandType = this.expression(n.operand);
      if (operandType === silentNeverType) return silentNeverType;
      const ok = this.arithmeticOperandType(n.operand, this.nonNullType(operandType, n.operand), qd.msgs.An_arithmetic_operand_must_be_of_type_any_number_bigint_or_an_enum_type);
      if (ok) {
        this.referenceExpression(
          n.operand,
          qd.msgs.The_operand_of_an_increment_or_decrement_operator_must_be_a_variable_or_a_property_access,
          qd.msgs.The_operand_of_an_increment_or_decrement_operator_may_not_be_an_optional_property_access
        );
      }
      return getUnaryResultType(operandType);
    }
    instanceOfExpression(left: Expression, right: Expression, leftType: qc.Type, rightType: qc.Type): qc.Type {
      if (leftType === silentNeverType || rightType === silentNeverType) return silentNeverType;
      if (!isTypeAny(leftType) && allTypesAssignableToKind(leftType, TypeFlags.Primitive))
        error(left, qd.msgs.The_left_hand_side_of_an_instanceof_expression_must_be_of_type_any_an_object_type_or_a_type_parameter);
      if (!(isTypeAny(rightType) || typeHasCallOrConstructSignatures(rightType) || isTypeSubtypeOf(rightType, globalFunctionType)))
        error(right, qd.msgs.The_right_hand_side_of_an_instanceof_expression_must_be_of_type_any_or_of_a_type_assignable_to_the_Function_interface_type);
      return booleanType;
    }
    inExpression(left: Expression, right: Expression, leftType: qc.Type, rightType: qc.Type): qc.Type {
      if (leftType === silentNeverType || rightType === silentNeverType) return silentNeverType;
      leftType = this.nonNullType(leftType, left);
      rightType = this.nonNullType(rightType, right);
      if (!(allTypesAssignableToKind(leftType, TypeFlags.StringLike | TypeFlags.NumberLike | TypeFlags.ESSymbolLike) || isTypeAssignableToKind(leftType, TypeFlags.Index | TypeFlags.TypeParameter)))
        error(left, qd.msgs.The_left_hand_side_of_an_in_expression_must_be_of_type_any_string_number_or_symbol);
      if (!allTypesAssignableToKind(rightType, TypeFlags.NonPrimitive | TypeFlags.InstantiableNonPrimitive))
        error(right, qd.msgs.The_right_hand_side_of_an_in_expression_must_be_of_type_any_an_object_type_or_a_type_parameter);
      return booleanType;
    }
    objectLiteralAssignment(n: qc.ObjectLiteralExpression, sourceType: qc.Type, rightIsThis?: boolean): qc.Type {
      const properties = n.properties;
      if (strictNullChecks && properties.length === 0) return this.nonNullType(sourceType, n);
      for (let i = 0; i < properties.length; i++) {
        this.objectLiteralDestructuringPropertyAssignment(n, sourceType, i, properties, rightIsThis);
      }
      return sourceType;
    }
    objectLiteralDestructuringPropertyAssignment(
      n: qc.ObjectLiteralExpression,
      objectLiteralType: qc.Type,
      propertyIndex: number,
      allProperties?: Nodes<ObjectLiteralElementLike>,
      rightIsThis = false
    ) {
      const properties = n.properties;
      const property = properties[propertyIndex];
      if (property.kind === Syntax.PropertyAssignment || property.kind === Syntax.ShorthandPropertyAssignment) {
        const name = property.name;
        const exprType = getLiteralTypeFromPropertyName(name);
        if (isTypeUsableAsPropertyName(exprType)) {
          const text = getPropertyNameFromType(exprType);
          const prop = getPropertyOfType(objectLiteralType, text);
          if (prop) {
            markPropertyAsReferenced(prop, property, rightIsThis);
            this.propertyAccessibility(property, false, objectLiteralType, prop);
          }
        }
        const elementType = getIndexedAccessType(objectLiteralType, exprType, name);
        const type = getFlowTypeOfDestructuring(property, elementType);
        return this.destructuringAssignment(property.kind === Syntax.ShorthandPropertyAssignment ? property : property.initer, type);
      } else if (property.kind === Syntax.SpreadAssignment) {
        if (propertyIndex < properties.length - 1) error(property, qd.msgs.A_rest_element_must_be_last_in_a_destructuring_pattern);
        else {
          if (languageVersion < ScriptTarget.ESNext) this.externalEmitHelpers(property, ExternalEmitHelpers.Rest);
          const nonRestNames: PropertyName[] = [];
          if (allProperties) {
            for (const otherProperty of allProperties) {
              if (!qf.is.kind(qc.SpreadAssignment, otherProperty)) nonRestNames.push(otherProperty.name);
            }
          }
          const type = getRestType(objectLiteralType, nonRestNames, objectLiteralType.symbol);
          checkGrammar.forDisallowedTrailingComma(allProperties, qd.msgs.A_rest_parameter_or_binding_pattern_may_not_have_a_trailing_comma);
          return this.destructuringAssignment(property.expression, type);
        }
      } else {
        error(property, qd.msgs.Property_assignment_expected);
      }
    }
    arrayLiteralAssignment(n: qc.ArrayLiteralExpression, sourceType: qc.Type, checkMode?: CheckMode): qc.Type {
      const elements = n.elements;
      const elementType = this.iteratedTypeOrElementType(IterationUse.Destructuring, sourceType, undefinedType, n) || errorType;
      for (let i = 0; i < elements.length; i++) {
        this.arrayLiteralDestructuringElementAssignment(n, sourceType, i, elementType, checkMode);
      }
      return sourceType;
    }
    arrayLiteralDestructuringElementAssignment(n: qc.ArrayLiteralExpression, sourceType: qc.Type, elementIndex: number, elementType: qc.Type, checkMode?: CheckMode) {
      const elements = n.elements;
      const element = elements[elementIndex];
      if (element.kind !== Syntax.OmittedExpression) {
        if (element.kind !== Syntax.SpreadElement) {
          const indexType = getLiteralType(elementIndex);
          if (isArrayLikeType(sourceType)) {
            const accessFlags = hasDefaultValue(element) ? AccessFlags.NoTupleBoundsCheck : 0;
            const elementType = getIndexedAccessTypeOrUndefined(sourceType, indexType, createSyntheticExpression(element, indexType), accessFlags) || errorType;
            const assignedType = hasDefaultValue(element) ? getTypeWithFacts(elementType, TypeFacts.NEUndefined) : elementType;
            const type = getFlowTypeOfDestructuring(element, assignedType);
            return this.destructuringAssignment(element, type, checkMode);
          }
          return this.destructuringAssignment(element, elementType, checkMode);
        }
        if (elementIndex < elements.length - 1) error(element, qd.msgs.A_rest_element_must_be_last_in_a_destructuring_pattern);
        else {
          const restExpression = (<SpreadElement>element).expression;
          if (restExpression.kind === Syntax.BinaryExpression && (<BinaryExpression>restExpression).operatorToken.kind === Syntax.EqualsToken)
            error((<BinaryExpression>restExpression).operatorToken, qd.msgs.A_rest_element_cannot_have_an_initer);
          else {
            checkGrammar.forDisallowedTrailingComma(n.elements, qd.msgs.A_rest_parameter_or_binding_pattern_may_not_have_a_trailing_comma);
            const type = everyType(sourceType, isTupleType) ? mapType(sourceType, (t) => sliceTupleType(<TupleTypeReference>t, elementIndex)) : createArrayType(elementType);
            return this.destructuringAssignment(restExpression, type, checkMode);
          }
        }
      }
      return;
    }
    destructuringAssignment(exprOrAssignment: Expression | ShorthandPropertyAssignment, sourceType: qc.Type, checkMode?: CheckMode, rightIsThis?: boolean): qc.Type {
      let target: Expression;
      if (exprOrAssignment.kind === Syntax.ShorthandPropertyAssignment) {
        const prop = <ShorthandPropertyAssignment>exprOrAssignment;
        if (prop.objectAssignmentIniter) {
          if (strictNullChecks && !(getFalsyFlags(this.expression(prop.objectAssignmentIniter)) & TypeFlags.Undefined)) sourceType = getTypeWithFacts(sourceType, TypeFacts.NEUndefined);
          this.binaryLikeExpression(prop.name, prop.equalsToken!, prop.objectAssignmentIniter, checkMode);
        }
        target = (<ShorthandPropertyAssignment>exprOrAssignment).name;
      } else {
        target = exprOrAssignment;
      }
      if (target.kind === Syntax.BinaryExpression && (<BinaryExpression>target).operatorToken.kind === Syntax.EqualsToken) {
        this.binaryExpression(<BinaryExpression>target, checkMode);
        target = (<BinaryExpression>target).left;
      }
      if (target.kind === Syntax.ObjectLiteralExpression) return this.objectLiteralAssignment(<ObjectLiteralExpression>target, sourceType, rightIsThis);
      if (target.kind === Syntax.ArrayLiteralExpression) return this.arrayLiteralAssignment(<ArrayLiteralExpression>target, sourceType, checkMode);
      return this.referenceAssignment(target, sourceType, checkMode);
    }
    referenceAssignment(target: Expression, sourceType: qc.Type, checkMode?: CheckMode): qc.Type {
      const targetType = this.expression(target, checkMode);
      const error =
        target.parent.kind === Syntax.SpreadAssignment
          ? qd.msgs.The_target_of_an_object_rest_assignment_must_be_a_variable_or_a_property_access
          : qd.msgs.The_left_hand_side_of_an_assignment_expression_must_be_a_variable_or_a_property_access;
      const optionalError =
        target.parent.kind === Syntax.SpreadAssignment
          ? qd.msgs.The_target_of_an_object_rest_assignment_may_not_be_an_optional_property_access
          : qd.msgs.The_left_hand_side_of_an_assignment_expression_may_not_be_an_optional_property_access;
      if (this.referenceExpression(target, error, optionalError)) this.typeAssignableToAndOptionallyElaborate(sourceType, targetType, target, target);
      if (qf.is.privateIdentifierPropertyAccessExpression(target)) this.externalEmitHelpers(target.parent, ExternalEmitHelpers.ClassPrivateFieldSet);
      return sourceType;
    }
    binaryExpression(n: qc.BinaryExpression, checkMode?: CheckMode) {
      const workStacks: {
        expr: BinaryExpression[];
        state: CheckBinaryExpressionState[];
        leftType: (qc.Type | undefined)[];
      } = {
        expr: [n],
        state: [CheckBinaryExpressionState.MaybeCheckLeft],
        leftType: [undefined],
      };
      let stackIndex = 0;
      let lastResult: qc.Type | undefined;
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
            if (operator === Syntax.Ampersand2Token || operator === Syntax.Bar2Token || operator === Syntax.Question2Token) this.truthinessOfType(leftType, n.left);
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
      function finishInvocation(result: qc.Type) {
        lastResult = result;
        stackIndex--;
      }
      function advanceState(nextState: CheckBinaryExpressionState) {
        workStacks.state[stackIndex] = nextState;
      }
      function maybeCheckExpression(n: qc.Expression) {
        if (qf.is.kind(qc.n, BinaryExpression)) {
          stackIndex++;
          workStacks.expr[stackIndex] = n;
          workStacks.state[stackIndex] = CheckBinaryExpressionState.MaybeCheckLeft;
          workStacks.leftType[stackIndex] = undefined;
        } else {
          lastResult = this.expression(n, checkMode);
        }
      }
    }
    binaryLikeExpression(left: Expression, operatorToken: Node, right: Expression, checkMode?: CheckMode, errorNode?: Node): qc.Type {
      const operator = operatorToken.kind;
      if (operator === Syntax.EqualsToken && (left.kind === Syntax.ObjectLiteralExpression || left.kind === Syntax.ArrayLiteralExpression))
        return this.destructuringAssignment(left, this.expression(right, checkMode), checkMode, right.kind === Syntax.ThisKeyword);
      let leftType: qc.Type;
      if (operator === Syntax.Ampersand2Token || operator === Syntax.Bar2Token || operator === Syntax.Question2Token) leftType = this.truthinessExpression(left, checkMode);
      else {
        leftType = this.expression(left, checkMode);
      }
      const rightType = this.expression(right, checkMode);
      return this.binaryLikeExpressionWorker(left, operatorToken, right, leftType, rightType, errorNode);
    }
    binaryLikeExpressionWorker(left: Expression, operatorToken: Node, right: Expression, leftType: qc.Type, rightType: qc.Type, errorNode?: Node): qc.Type {
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
          leftType = this.nonNullType(leftType, left);
          rightType = this.nonNullType(rightType, right);
          let suggestedOperator: Syntax | undefined;
          if (leftType.flags & TypeFlags.BooleanLike && rightType.flags & TypeFlags.BooleanLike && (suggestedOperator = getSuggestedBooleanOperator(operatorToken.kind)) !== undefined) {
            error(errorNode || operatorToken, qd.msgs.The_0_operator_is_not_allowed_for_boolean_types_Consider_using_1_instead, Token.toString(operatorToken.kind), Token.toString(suggestedOperator));
            return numberType;
          } else {
            const leftOk = this.arithmeticOperandType(left, leftType, qd.msgs.The_left_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_bigint_or_an_enum_type, true);
            const rightOk = this.arithmeticOperandType(right, rightType, qd.msgs.The_right_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_bigint_or_an_enum_type, true);
            let resultType: qc.Type;
            if (
              (isTypeAssignableToKind(leftType, TypeFlags.AnyOrUnknown) && isTypeAssignableToKind(rightType, TypeFlags.AnyOrUnknown)) ||
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
          if (!isTypeAssignableToKind(leftType, TypeFlags.StringLike) && !isTypeAssignableToKind(rightType, TypeFlags.StringLike)) {
            leftType = this.nonNullType(leftType, left);
            rightType = this.nonNullType(rightType, right);
          }
          let resultType: qc.Type | undefined;
          if (isTypeAssignableToKind(leftType, TypeFlags.NumberLike, true)) resultType = numberType;
          else if (isTypeAssignableToKind(leftType, TypeFlags.BigIntLike, true)) {
            resultType = bigintType;
          } else if (isTypeAssignableToKind(leftType, TypeFlags.StringLike, true)) {
            resultType = stringType;
          } else if (isTypeAny(leftType) || isTypeAny(rightType)) {
            resultType = leftType === errorType || rightType === errorType ? errorType : anyType;
          }
          if (resultType && !this.forDisallowedESSymbolOperand(operator)) return resultType;
          if (!resultType) {
            const closeEnoughKind = TypeFlags.NumberLike | TypeFlags.BigIntLike | TypeFlags.StringLike | TypeFlags.AnyOrUnknown;
            reportOperatorError((left, right) => isTypeAssignableToKind(left, closeEnoughKind) && isTypeAssignableToKind(right, closeEnoughKind));
            return anyType;
          }
          if (operator === Syntax.PlusEqualsToken) this.assignmentOperator(resultType);
          return resultType;
        case Syntax.LessThanToken:
        case Syntax.GreaterThanToken:
        case Syntax.LessThanEqualsToken:
        case Syntax.GreaterThanEqualsToken:
          if (this.forDisallowedESSymbolOperand(operator)) {
            leftType = getBaseTypeOfLiteralType(this.nonNullType(leftType, left));
            rightType = getBaseTypeOfLiteralType(this.nonNullType(rightType, right));
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
          return this.instanceOfExpression(left, right, leftType, rightType);
        case Syntax.InKeyword:
          return this.inExpression(left, right, leftType, rightType);
        case Syntax.Ampersand2Token:
          return getTypeFacts(leftType) & TypeFacts.Truthy ? getUnionType([extractDefinitelyFalsyTypes(strictNullChecks ? leftType : getBaseTypeOfLiteralType(rightType)), rightType]) : leftType;
        case Syntax.Bar2Token:
          return getTypeFacts(leftType) & TypeFacts.Falsy ? getUnionType([removeDefinitelyFalsyTypes(leftType), rightType], UnionReduction.Subtype) : leftType;
        case Syntax.Question2Token:
          return getTypeFacts(leftType) & TypeFacts.EQUndefinedOrNull ? getUnionType([getNonNullableType(leftType), rightType], UnionReduction.Subtype) : leftType;
        case Syntax.EqualsToken:
          const declKind = qf.is.kind(qc.BinaryExpression, left.parent) ? qf.get.assignmentDeclarationKind(left.parent) : AssignmentDeclarationKind.None;
          this.assignmentDeclaration(declKind, rightType);
          if (isAssignmentDeclaration(declKind)) {
            if (
              !(rightType.flags & TypeFlags.Object) ||
              (declKind !== AssignmentDeclarationKind.ModuleExports &&
                declKind !== AssignmentDeclarationKind.Prototype &&
                !isEmptyObjectType(rightType) &&
                !isFunctionObjectType(rightType as ObjectType) &&
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
          if (!compilerOptions.allowUnreachableCode && isSideEffectFree(left) && !isEvalNode(right)) error(left, qd.msgs.Left_side_of_comma_operator_is_unused_and_has_no_side_effects);
          return rightType;
        default:
          return qu.fail();
      }
      function bothAreBigIntLike(left: qc.Type, right: qc.Type): boolean {
        return isTypeAssignableToKind(left, TypeFlags.BigIntLike) && isTypeAssignableToKind(right, TypeFlags.BigIntLike);
      }
      function checkAssignmentDeclaration(kind: AssignmentDeclarationKind, rightType: qc.Type) {
        if (kind === AssignmentDeclarationKind.ModuleExports) {
          for (const prop of getPropertiesOfObjectType(rightType)) {
            const propType = getTypeOfSymbol(prop);
            if (propType.symbol && propType.symbol.flags & qt.SymbolFlags.Class) {
              const name = prop.escName;
              const symbol = resolveName(prop.valueDeclaration, name, qt.SymbolFlags.Type, undefined, name, false);
              if (symbol && symbol.declarations.some(isDocTypedefTag)) {
                addDuplicateDeclarationErrorsForSymbols(symbol, qd.msgs.Duplicate_identifier_0, qy.qf.get.unescUnderscores(name), prop);
                addDuplicateDeclarationErrorsForSymbols(prop, qd.msgs.Duplicate_identifier_0, qy.qf.get.unescUnderscores(name), symbol);
              }
            }
          }
        }
      }
      function isEvalNode(n: qc.Expression) {
        return n.kind === Syntax.qc.Identifier && (n as qc.Identifier).escapedText === 'eval';
      }
      function checkForDisallowedESSymbolOperand(operator: Syntax): boolean {
        const offendingSymbolOperand = maybeTypeOfKind(leftType, TypeFlags.ESSymbolLike) ? left : maybeTypeOfKind(rightType, TypeFlags.ESSymbolLike) ? right : undefined;
        if (offendingSymbolOperand) {
          error(offendingSymbolOperand, qd.msgs.The_0_operator_cannot_be_applied_to_type_symbol, Token.toString(operator));
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
      function checkAssignmentOperator(valueType: qc.Type): void {
        if (produceDiagnostics && qy.qf.is.assignmentOperator(operator)) {
          if (
            this.referenceExpression(
              left,
              qd.msgs.The_left_hand_side_of_an_assignment_expression_must_be_a_variable_or_a_property_access,
              qd.msgs.The_left_hand_side_of_an_assignment_expression_may_not_be_an_optional_property_access
            ) &&
            (!qf.is.kind(qc.Identifier, left) || qy.qf.get.unescUnderscores(left.escapedText) !== 'exports')
          ) {
            this.typeAssignableToAndOptionallyElaborate(valueType, leftType, left, right);
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
            const init = qf.get.assignedExpandoIniter(right);
            return init && qf.is.kind(qc.ObjectLiteralExpression, init) && symbol && qu.hasEntries(symbol.exports);
          default:
            return false;
        }
      }
      function reportOperatorErrorUnless(typesAreCompatible: (left: qc.Type, right: qc.Type) => boolean): boolean {
        if (!typesAreCompatible(leftType, rightType)) {
          reportOperatorError(typesAreCompatible);
          return true;
        }
        return false;
      }
      function reportOperatorError(isRelated?: (left: qc.Type, right: qc.Type) => boolean) {
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
          errorAndMaybeSuggestAwait(errNode, wouldWorkWithAwait, qd.msgs.Operator_0_cannot_be_applied_to_types_1_and_2, Token.toString(operatorToken.kind), leftStr, rightStr);
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
    yieldExpression(n: qc.YieldExpression): qc.Type {
      if (produceDiagnostics) {
        if (!(n.flags & NodeFlags.YieldContext)) grammarErrorOnFirstToken(n, qd.msgs.A_yield_expression_is_only_allowed_in_a_generator_body);
        if (isInParameterIniterBeforeContainingFunction(n)) error(n, qd.yield_expressions_cannot_be_used_in_a_parameter_initer);
      }
      const func = qf.get.containingFunction(n);
      if (!func) return anyType;
      const functionFlags = getFunctionFlags(func);
      if (!(functionFlags & FunctionFlags.Generator)) return anyType;
      const isAsync = (functionFlags & FunctionFlags.Async) !== 0;
      if (n.asteriskToken) {
        if (isAsync && languageVersion < ScriptTarget.ESNext) this.externalEmitHelpers(n, ExternalEmitHelpers.AsyncDelegatorIncludes);
      }
      const returnType = getReturnTypeFromAnnotation(func);
      const iterationTypes = returnType && getIterationTypesOfGeneratorFunctionReturnType(returnType, isAsync);
      const signatureYieldType = (iterationTypes && iterationTypes.yieldType) || anyType;
      const signatureNextType = (iterationTypes && iterationTypes.nextType) || anyType;
      const resolvedSignatureNextType = isAsync ? getAwaitedType(signatureNextType) || anyType : signatureNextType;
      const yieldExpressionType = n.expression ? this.expression(n.expression) : undefinedWideningType;
      const yieldedType = getYieldedTypeOfYieldExpression(n, yieldExpressionType, resolvedSignatureNextType, isAsync);
      if (returnType && yieldedType) this.typeAssignableToAndOptionallyElaborate(yieldedType, signatureYieldType, n.expression || n, n.expression);
      if (n.asteriskToken) {
        const use = isAsync ? IterationUse.AsyncYieldStar : IterationUse.YieldStar;
        return getIterationTypeOfIterable(use, IterationTypeKind.Return, yieldExpressionType, n.expression) || anyType;
      } else if (returnType) {
        return getIterationTypeOfGeneratorFunctionReturnType(IterationTypeKind.Next, returnType, isAsync) || anyType;
      }
      return getContextualIterationType(IterationTypeKind.Next, func) || anyType;
    }
    conditionalExpression(n: qc.ConditionalExpression, checkMode?: CheckMode): qc.Type {
      const type = this.truthinessExpression(n.condition);
      this.testingKnownTruthyCallableType(n.condition, n.whenTrue, type);
      const type1 = this.expression(n.whenTrue, checkMode);
      const type2 = this.expression(n.whenFalse, checkMode);
      return getUnionType([type1, type2], UnionReduction.Subtype);
    }
    templateExpression(n: qc.TemplateExpression): qc.Type {
      forEach(n.templateSpans, (templateSpan) => {
        if (maybeTypeOfKind(this.expression(templateSpan.expression), TypeFlags.ESSymbolLike))
          error(templateSpan.expression, qd.msgs.Implicit_conversion_of_a_symbol_to_a_string_will_fail_at_runtime_Consider_wrapping_this_expression_in_String);
      });
      return stringType;
    }
    expressionWithContextualType(n: qc.Expression, contextualType: qc.Type, inferenceContext: InferenceContext | undefined, checkMode: CheckMode): qc.Type {
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
    expressionCached(n: qc.Expression | QualifiedName, checkMode?: CheckMode): qc.Type {
      const links = getNodeLinks(n);
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
    declarationIniter(declaration: HasExpressionIniter, contextualType?: qc.Type | undefined) {
      const initer = qf.get.effectiveIniter(declaration)!;
      const type = getQuickTypeOfExpression(initer) || (contextualType ? this.expressionWithContextualType(initer, contextualType, undefined, CheckMode.Normal) : this.expressionCached(initer));
      return qf.is.kind(qc.ParameterDeclaration, declaration) &&
        declaration.name.kind === Syntax.ArrayBindingPattern &&
        isTupleType(type) &&
        !type.target.hasRestElement &&
        getTypeReferenceArity(type) < declaration.name.elements.length
        ? padTupleType(type, declaration.name)
        : type;
    }
    expressionForMutableLocation(n: qc.Expression, checkMode: CheckMode | undefined, contextualType?: qc.Type, forceTuple?: boolean): qc.Type {
      const type = this.expression(n, checkMode, forceTuple);
      return isConstContext(n)
        ? getRegularTypeOfLiteralType(type)
        : qf.is.kind(qc.TypeAssertion, n)
        ? type
        : getWidenedLiteralLikeTypeForContextualType(type, instantiateContextualType(arguments.length === 2 ? getContextualType(n) : contextualType, n));
    }
    propertyAssignment(n: qc.PropertyAssignment, checkMode?: CheckMode): qc.Type {
      if (n.name.kind === Syntax.ComputedPropertyName) this.computedPropertyName(n.name);
      return this.expressionForMutableLocation(n.initer, checkMode);
    }
    objectLiteralMethod(n: qc.MethodDeclaration, checkMode?: CheckMode): qc.Type {
      checkGrammar.method(n);
      if (n.name.kind === Syntax.ComputedPropertyName) this.computedPropertyName(n.name);
      const uninstantiatedType = this.functionExpressionOrObjectLiteralMethod(n, checkMode);
      return instantiateTypeWithSingleGenericCallSignature(n, uninstantiatedType, checkMode);
    }
    expression(n: qc.Expression | QualifiedName, checkMode?: CheckMode, forceTuple?: boolean): qc.Type {
      const saveCurrentNode = currentNode;
      currentNode = n;
      instantiationCount = 0;
      const uninstantiatedType = this.expressionWorker(n, checkMode, forceTuple);
      const type = instantiateTypeWithSingleGenericCallSignature(n, uninstantiatedType, checkMode);
      if (isConstEnumObjectType(type)) this.constEnumAccess(n, type);
      currentNode = saveCurrentNode;
      return type;
    }
    constEnumAccess(n: qc.Expression | QualifiedName, type: qc.Type) {
      const ok =
        (n.parent.kind === Syntax.PropertyAccessExpression && (<PropertyAccessExpression>n.parent).expression === n) ||
        (n.parent.kind === Syntax.ElementAccessExpression && (<ElementAccessExpression>n.parent).expression === n) ||
        ((n.kind === Syntax.qc.Identifier || n.kind === Syntax.QualifiedName) && isInRightSideOfImportOrExportAssignment(<qc.Identifier>n)) ||
        (n.parent.kind === Syntax.TypeQuery && (<TypeQueryNode>n.parent).exprName === n) ||
        n.parent.kind === Syntax.ExportSpecifier;
      if (!ok) error(n, qd.const_enums_can_only_be_used_in_property_or_index_access_expressions_or_the_right_hand_side_of_an_import_declaration_or_export_assignment_or_type_query);
      if (compilerOptions.isolatedModules) {
        qu.assert(!!(type.symbol.flags & qt.SymbolFlags.ConstEnum));
        const constEnumDeclaration = type.symbol.valueDeclaration as EnumDeclaration;
        if (constEnumDeclaration.flags & NodeFlags.Ambient) error(n, qd.msgs.Cannot_access_ambient_const_enums_when_the_isolatedModules_flag_is_provided);
      }
    }
    parenthesizedExpression(n: qc.ParenthesizedExpression, checkMode?: CheckMode): qc.Type {
      const tag = qf.is.inJSFile(n) ? qc.getDoc.typeTag(n) : undefined;
      if (tag) return this.assertionWorker(tag, tag.typeExpression.type, n.expression, checkMode);
      return this.expression(n.expression, checkMode);
    }
    expressionWorker(n: qc.Expression | QualifiedName, checkMode: CheckMode | undefined, forceTuple?: boolean): qc.Type {
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
          return getFreshTypeOfLiteralType(getLiteralType((n as StringLiteralLike).text));
        case Syntax.NumericLiteral:
          checkGrammar.numericLiteral(n as NumericLiteral);
          return getFreshTypeOfLiteralType(getLiteralType(+(n as NumericLiteral).text));
        case Syntax.BigIntLiteral:
          checkGrammar.bigIntLiteral(n as BigIntLiteral);
          return getFreshTypeOfLiteralType(getBigIntLiteralType(n as BigIntLiteral));
        case Syntax.TrueKeyword:
          return trueType;
        case Syntax.FalseKeyword:
          return falseType;
        case Syntax.TemplateExpression:
          return this.templateExpression(<TemplateExpression>n);
        case Syntax.RegexLiteral:
          return globalRegExpType;
        case Syntax.ArrayLiteralExpression:
          return this.arrayLiteral(<ArrayLiteralExpression>n, checkMode, forceTuple);
        case Syntax.ObjectLiteralExpression:
          return this.objectLiteral(<ObjectLiteralExpression>n, checkMode);
        case Syntax.PropertyAccessExpression:
          return this.propertyAccessExpression(<PropertyAccessExpression>n);
        case Syntax.QualifiedName:
          return this.qualifiedName(<QualifiedName>n);
        case Syntax.ElementAccessExpression:
          return this.indexedAccess(<ElementAccessExpression>n);
        case Syntax.CallExpression:
          if ((<CallExpression>n).expression.kind === Syntax.ImportKeyword) return this.importCallExpression(<ImportCall>n);
        case Syntax.NewExpression:
          return this.callExpression(<CallExpression>n, checkMode);
        case Syntax.TaggedTemplateExpression:
          return this.taggedTemplateExpression(<TaggedTemplateExpression>n);
        case Syntax.ParenthesizedExpression:
          return this.parenthesizedExpression(<ParenthesizedExpression>n, checkMode);
        case Syntax.ClassExpression:
          return this.classExpression(<ClassExpression>n);
        case Syntax.FunctionExpression:
        case Syntax.ArrowFunction:
          return this.functionExpressionOrObjectLiteralMethod(<FunctionExpression | ArrowFunction>n, checkMode);
        case Syntax.TypeOfExpression:
          return this.typeOfExpression(<TypeOfExpression>n);
        case Syntax.TypeAssertionExpression:
        case Syntax.AsExpression:
          return this.assertion(<AssertionExpression>n);
        case Syntax.NonNullExpression:
          return this.nonNullAssertion(<NonNullExpression>n);
        case Syntax.MetaProperty:
          return this.metaProperty(<MetaProperty>n);
        case Syntax.DeleteExpression:
          return this.deleteExpression(<DeleteExpression>n);
        case Syntax.VoidExpression:
          return this.voidExpression(<VoidExpression>n);
        case Syntax.AwaitExpression:
          return this.awaitExpression(<AwaitExpression>n);
        case Syntax.PrefixUnaryExpression:
          return this.prefixUnaryExpression(<PrefixUnaryExpression>n);
        case Syntax.PostfixUnaryExpression:
          return this.postfixUnaryExpression(<PostfixUnaryExpression>n);
        case Syntax.BinaryExpression:
          return this.binaryExpression(<BinaryExpression>n, checkMode);
        case Syntax.ConditionalExpression:
          return this.conditionalExpression(<ConditionalExpression>n, checkMode);
        case Syntax.SpreadElement:
          return this.spreadExpression(<SpreadElement>n, checkMode);
        case Syntax.OmittedExpression:
          return undefinedWideningType;
        case Syntax.YieldExpression:
          return this.yieldExpression(<YieldExpression>n);
        case Syntax.SyntheticExpression:
          return (<SyntheticExpression>n).type;
        case Syntax.JsxExpression:
          return this.jsxExpression(<JsxExpression>n, checkMode);
        case Syntax.JsxElement:
          return this.jsxElement(<JsxElement>n, checkMode);
        case Syntax.JsxSelfClosingElement:
          return this.jsxSelfClosingElement(<JsxSelfClosingElement>n, checkMode);
        case Syntax.JsxFragment:
          return this.jsxFragment(<JsxFragment>n);
        case Syntax.JsxAttributes:
          return this.jsxAttributes(<JsxAttributes>n, checkMode);
        case Syntax.JsxOpeningElement:
          qu.fail("Shouldn't ever directly check a JsxOpeningElement");
      }
      return errorType;
    }
    typeParameter(n: qc.TypeParameterDeclaration) {
      if (n.expression) grammarErrorOnFirstToken(n.expression, qd.msgs.Type_expected);
      this.sourceElement(n.constraint);
      this.sourceElement(n.default);
      const typeParameter = getDeclaredTypeOfTypeParameter(getSymbolOfNode(n));
      getBaseConstraintOfType(typeParameter);
      if (!hasNonCircularTypeParameterDefault(typeParameter)) error(n.default, qd.msgs.Type_parameter_0_has_a_circular_default, typeToString(typeParameter));
      const constraintType = getConstraintOfTypeParameter(typeParameter);
      const defaultType = getDefaultFromTypeParameter(typeParameter);
      if (constraintType && defaultType) {
        this.typeAssignableTo(
          defaultType,
          getTypeWithThisArgument(instantiateType(constraintType, makeUnaryTypeMapper(typeParameter, defaultType)), defaultType),
          n.default,
          qd.msgs.Type_0_does_not_satisfy_the_constraint_1
        );
      }
      if (produceDiagnostics) this.typeNameIsReserved(n.name, qd.msgs.Type_parameter_name_cannot_be_0);
    }
    parameter(n: qc.ParameterDeclaration) {
      checkGrammar.decoratorsAndModifiers(n);
      this.variableLikeDeclaration(n);
      const func = qf.get.containingFunction(n)!;
      if (qf.has.syntacticModifier(n, ModifierFlags.ParameterPropertyModifier)) {
        if (!(func.kind === Syntax.Constructor && qf.is.present(func.body))) error(n, qd.msgs.A_parameter_property_is_only_allowed_in_a_constructor_implementation);
        if (func.kind === Syntax.Constructor && qf.is.kind(qc.Identifier, n.name) && n.name.escapedText === 'constructor') error(n.name, qd.constructor_cannot_be_used_as_a_parameter_property_name);
      }
      if (n.questionToken && qf.is.kind(qc.BindingPattern, n.name) && (func as FunctionLikeDeclaration).body)
        error(n, qd.msgs.A_binding_pattern_parameter_cannot_be_optional_in_an_implementation_signature);
      if (n.name && qf.is.kind(qc.Identifier, n.name) && (n.name.escapedText === 'this' || n.name.escapedText === 'new')) {
        if (func.parameters.indexOf(n) !== 0) error(n, qd.msgs.A_0_parameter_must_be_the_first_parameter, n.name.escapedText as string);
        if (func.kind === Syntax.Constructor || func.kind === Syntax.ConstructSignature || func.kind === Syntax.ConstructorType) error(n, qd.msgs.A_constructor_cannot_have_a_this_parameter);
        if (func.kind === Syntax.ArrowFunction) error(n, qd.msgs.An_arrow_function_cannot_have_a_this_parameter);
        if (func.kind === Syntax.GetAccessor || func.kind === Syntax.SetAccessor) error(n, qd.get_and_set_accessors_cannot_declare_this_parameters);
      }
      if (n.dot3Token && !qf.is.kind(qc.BindingPattern, n.name) && !isTypeAssignableTo(getReducedType(getTypeOfSymbol(n.symbol)), anyReadonlyArrayType))
        error(n, qd.msgs.A_rest_parameter_must_be_of_an_array_type);
    }
    typePredicate(n: qc.TypePredicateNode): void {
      const parent = getTypePredicateParent(n);
      if (!parent) {
        error(n, qd.msgs.A_type_predicate_is_only_allowed_in_return_type_position_for_functions_and_methods);
        return;
      }
      const signature = getSignatureFromDeclaration(parent);
      const typePredicate = getTypePredicateOfSignature(signature);
      if (!typePredicate) return;
      this.sourceElement(n.type);
      const { parameterName } = n;
      if (typePredicate.kind === TypePredicateKind.This || typePredicate.kind === TypePredicateKind.AssertsThis) getTypeFromThisNodeTypeNode(parameterName as ThisTypeNode);
      else {
        if (typePredicate.parameterIndex >= 0) {
          if (signatureHasRestParameter(signature) && typePredicate.parameterIndex === signature.parameters.length - 1)
            error(parameterName, qd.msgs.A_type_predicate_cannot_reference_a_rest_parameter);
          else {
            if (typePredicate.type) {
              const leadingError = () => chainqd.Messages(undefined, qd.msgs.A_type_predicate_s_type_must_be_assignable_to_its_parameter_s_type);
              this.typeAssignableTo(typePredicate.type, getTypeOfSymbol(signature.parameters[typePredicate.parameterIndex]), n.type, undefined, leadingError);
            }
          }
        } else if (parameterName) {
          let hasReportedError = false;
          for (const { name } of parent.parameters) {
            if (qf.is.kind(qc.BindingPattern, name) && this.ifTypePredicateVariableIsDeclaredInBindingPattern(name, parameterName, typePredicate.parameterName)) {
              hasReportedError = true;
              break;
            }
          }
          if (!hasReportedError) error(n.parameterName, qd.msgs.Cannot_find_parameter_0, typePredicate.parameterName);
        }
      }
    }
    ifTypePredicateVariableIsDeclaredInBindingPattern(pattern: BindingPattern, predicateVariableNode: Node, predicateVariableName: string) {
      for (const element of pattern.elements) {
        if (qf.is.kind(qc.OmittedExpression, element)) continue;
        const name = element.name;
        if (name.kind === Syntax.qc.Identifier && name.escapedText === predicateVariableName) {
          error(predicateVariableNode, qd.msgs.A_type_predicate_cannot_reference_element_0_in_a_binding_pattern, predicateVariableName);
          return true;
        } else if (name.kind === Syntax.ArrayBindingPattern || name.kind === Syntax.ObjectBindingPattern) {
          if (this.ifTypePredicateVariableIsDeclaredInBindingPattern(name, predicateVariableNode, predicateVariableName)) return true;
        }
      }
    }
    signatureDeclaration(n: qc.SignatureDeclaration) {
      if (n.kind === Syntax.IndexSignature) checkGrammar.indexSignature(<SignatureDeclaration>n);
      else if (
        n.kind === Syntax.FunctionType ||
        n.kind === Syntax.FunctionDeclaration ||
        n.kind === Syntax.ConstructorType ||
        n.kind === Syntax.CallSignature ||
        n.kind === Syntax.Constructor ||
        n.kind === Syntax.ConstructSignature
      ) {
        checkGrammar.functionLikeDeclaration(<FunctionLikeDeclaration>n);
      }
      const functionFlags = getFunctionFlags(<FunctionLikeDeclaration>n);
      if (!(functionFlags & FunctionFlags.Invalid)) {
        if ((functionFlags & FunctionFlags.AsyncGenerator) === FunctionFlags.AsyncGenerator && languageVersion < ScriptTarget.ESNext)
          this.externalEmitHelpers(n, ExternalEmitHelpers.AsyncGeneratorIncludes);
      }
      this.typeParameters(n.typeParameters);
      forEach(n.parameters, checkParameter);
      if (n.type) this.sourceElement(n.type);
      if (produceDiagnostics) {
        this.collisionWithArgumentsInGeneratedCode(n);
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
          const functionFlags = getFunctionFlags(<FunctionDeclaration>n);
          if ((functionFlags & (FunctionFlags.Invalid | FunctionFlags.Generator)) === FunctionFlags.Generator) {
            const returnType = getTypeFromTypeNode(returnTypeNode);
            if (returnType === voidType) error(returnTypeNode, qd.msgs.A_generator_cannot_have_a_void_type_annotation);
            else {
              const generatorYieldType = getIterationTypeOfGeneratorFunctionReturnType(IterationTypeKind.Yield, returnType, (functionFlags & FunctionFlags.Async) !== 0) || anyType;
              const generatorReturnType = getIterationTypeOfGeneratorFunctionReturnType(IterationTypeKind.Return, returnType, (functionFlags & FunctionFlags.Async) !== 0) || generatorYieldType;
              const generatorNextType = getIterationTypeOfGeneratorFunctionReturnType(IterationTypeKind.Next, returnType, (functionFlags & FunctionFlags.Async) !== 0) || unknownType;
              const generatorInstantiation = createGeneratorReturnType(generatorYieldType, generatorReturnType, generatorNextType, !!(functionFlags & FunctionFlags.Async));
              this.typeAssignableTo(generatorInstantiation, returnType, returnTypeNode);
            }
          } else if ((functionFlags & FunctionFlags.AsyncGenerator) === FunctionFlags.Async) {
            this.asyncFunctionReturnType(<FunctionLikeDeclaration>n, returnTypeNode);
          }
        }
        if (n.kind !== Syntax.IndexSignature && n.kind !== Syntax.DocFunctionType) registerForUnusedIdentifiersCheck(n);
      }
    }
    classForDuplicateDeclarations(n: qc.ClassLikeDeclaration) {
      const instanceNames = qu.createEscapedMap<DeclarationMeaning>();
      const staticNames = qu.createEscapedMap<DeclarationMeaning>();
      const privateIdentifiers = qu.createEscapedMap<DeclarationMeaning>();
      for (const member of n.members) {
        if (member.kind === Syntax.Constructor) {
          for (const param of (member as ConstructorDeclaration).parameters) {
            if (qf.is.parameterPropertyDeclaration(param, member) && !qf.is.kind(qc.BindingPattern, param.name))
              addName(instanceNames, param.name, param.name.escapedText, DeclarationMeaning.GetOrSetAccessor);
          }
        } else {
          const isStatic = qf.has.syntacticModifier(member, ModifierFlags.Static);
          const name = member.name;
          if (!name) return;
          const names = qf.is.kind(qc.PrivateIdentifier, name) ? privateIdentifiers : isStatic ? staticNames : instanceNames;
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
    classForStaticPropertyNameConflicts(n: qc.ClassLikeDeclaration) {
      for (const member of n.members) {
        const memberNameNode = member.name;
        const isStatic = qf.has.syntacticModifier(member, ModifierFlags.Static);
        if (isStatic && memberNameNode) {
          const memberName = qf.get.propertyNameForPropertyNameNode(memberNameNode);
          switch (memberName) {
            case 'name':
            case 'length':
            case 'caller':
            case 'arguments':
            case 'prototype':
              const message = qd.msgs.Static_property_0_conflicts_with_built_in_property_Function_0_of_constructor_function_1;
              const className = getNameOfSymbolAsWritten(getSymbolOfNode(n));
              error(memberNameNode, message, memberName, className);
              break;
          }
        }
      }
    }
    objectTypeForDuplicateDeclarations(n: qc.TypeLiteralNode | InterfaceDeclaration) {
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
            error(qf.get.nameOfDeclaration(member.symbol.valueDeclaration), qd.msgs.Duplicate_identifier_0, memberName);
            error(member.name, qd.msgs.Duplicate_identifier_0, memberName);
          } else {
            names.set(memberName, true);
          }
        }
      }
    }
    typeForDuplicateIndexSignatures(n: Node) {
      if (n.kind === Syntax.InterfaceDeclaration) {
        const nodeSymbol = getSymbolOfNode(n as InterfaceDeclaration);
        if (nodeSymbol.declarations.length > 0 && nodeSymbol.declarations[0] !== n) return;
      }
      const indexSymbol = getIndexSymbol(getSymbolOfNode(n)!);
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
    propertyDeclaration(n: qc.PropertyDeclaration | PropertySignature) {
      if (!checkGrammar.decoratorsAndModifiers(n) && !checkGrammar.property(n)) checkGrammar.computedPropertyName(n.name);
      this.variableLikeDeclaration(n);
      if (qf.is.kind(qc.PrivateIdentifier, n.name) && languageVersion < ScriptTarget.ESNext) {
        for (let lexicalScope = qf.get.enclosingBlockScopeContainer(n); !!lexicalScope; lexicalScope = qf.get.enclosingBlockScopeContainer(lexicalScope)) {
          getNodeLinks(lexicalScope).flags |= NodeCheckFlags.ContainsClassWithPrivateIdentifiers;
        }
      }
    }
    propertySignature(n: qc.PropertySignature) {
      if (qf.is.kind(qc.PrivateIdentifier, n.name)) error(n, qd.msgs.Private_identifiers_are_not_allowed_outside_class_bodies);
      return this.propertyDeclaration(n);
    }
    methodDeclaration(n: qc.MethodDeclaration | MethodSignature) {
      if (!checkGrammar.method(n)) checkGrammar.computedPropertyName(n.name);
      if (qf.is.kind(qc.PrivateIdentifier, n.name)) error(n, qd.msgs.A_method_cannot_be_named_with_a_private_identifier);
      this.functionOrMethodDeclaration(n);
      if (qf.has.syntacticModifier(n, ModifierFlags.Abstract) && n.kind === Syntax.MethodDeclaration && n.body)
        error(n, qd.msgs.Method_0_cannot_have_an_implementation_because_it_is_marked_abstract, declarationNameToString(n.name));
    }
    constructorDeclaration(n: qc.ConstructorDeclaration) {
      this.signatureDeclaration(n);
      if (!checkGrammar.constructorTypeParameters(n)) checkGrammar.constructorTypeAnnotation(n);
      this.sourceElement(n.body);
      const symbol = getSymbolOfNode(n);
      const firstDeclaration = getDeclarationOfKind(symbol, n.kind);
      if (n === firstDeclaration) this.functionOrConstructorSymbol(symbol);
      if (qf.is.missing(n.body)) return;
      if (!produceDiagnostics) return;
      function isInstancePropertyWithIniterOrPrivateIdentifierProperty(x: Node) {
        if (x.qf.is.privateIdentifierPropertyDeclaration()) return true;
        return x.kind === Syntax.PropertyDeclaration && !qf.has.syntacticModifier(x, ModifierFlags.Static) && !!(<PropertyDeclaration>x).initer;
      }
      const containingClassDecl = <ClassDeclaration>n.parent;
      if (qf.get.classExtendsHeritageElement(containingClassDecl)) {
        captureLexicalThis(n.parent, containingClassDecl);
        const classExtendsNull = classDeclarationExtendsNull(containingClassDecl);
        const superCall = findFirstSuperCall(n.body!);
        if (superCall) {
          if (classExtendsNull) error(superCall, qd.msgs.A_constructor_cannot_contain_a_super_call_when_its_class_extends_null);
          const superCallShouldBeFirst =
            (compilerOptions.target !== ScriptTarget.ESNext || !compilerOptions.useDefineForClassFields) &&
            (qu.some((<ClassDeclaration>n.parent).members, isInstancePropertyWithIniterOrPrivateIdentifierProperty) ||
              some(n.parameters, (p) => qf.has.syntacticModifier(p, ModifierFlags.ParameterPropertyModifier)));
          if (superCallShouldBeFirst) {
            const statements = n.body!.statements;
            let superCallStatement: ExpressionStatement | undefined;
            for (const statement of statements) {
              if (statement.kind === Syntax.ExpressionStatement && qf.is.superCall((<ExpressionStatement>statement).expression)) {
                superCallStatement = <ExpressionStatement>statement;
                break;
              }
              if (!qf.is.prologueDirective(statement)) break;
            }
            if (!superCallStatement)
              error(n, qd.msgs.A_super_call_must_be_the_first_statement_in_the_constructor_when_a_class_contains_initialized_properties_parameter_properties_or_private_identifiers);
          }
        } else if (!classExtendsNull) {
          error(n, qd.msgs.Constructors_for_derived_classes_must_contain_a_super_call);
        }
      }
    }
    accessorDeclaration(n: qc.AccessorDeclaration) {
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
        if (qf.is.kind(qc.PrivateIdentifier, n.name)) error(n.name, qd.msgs.An_accessor_cannot_be_named_with_a_private_identifier);
        if (!hasNonBindableDynamicName(n)) {
          const otherKind = n.kind === Syntax.GetAccessor ? Syntax.SetAccessor : Syntax.GetAccessor;
          const otherAccessor = getDeclarationOfKind<AccessorDeclaration>(getSymbolOfNode(n), otherKind);
          if (otherAccessor) {
            const nodeFlags = qf.get.effectiveModifierFlags(n);
            const otherFlags = qf.get.effectiveModifierFlags(otherAccessor);
            if ((nodeFlags & ModifierFlags.AccessibilityModifier) !== (otherFlags & ModifierFlags.AccessibilityModifier)) error(n.name, qd.msgs.Getter_and_setter_accessors_do_not_agree_in_visibility);
            if ((nodeFlags & ModifierFlags.Abstract) !== (otherFlags & ModifierFlags.Abstract)) error(n.name, qd.msgs.Accessors_must_both_be_abstract_or_non_abstract);
            this.accessorDeclarationTypesIdentical(n, otherAccessor, getAnnotatedAccessorType, qd.get_and_set_accessor_must_have_the_same_type);
            this.accessorDeclarationTypesIdentical(n, otherAccessor, getThisTypeOfDeclaration, qd.get_and_set_accessor_must_have_the_same_this_type);
          }
        }
        const returnType = getTypeOfAccessors(getSymbolOfNode(n));
        if (n.kind === Syntax.GetAccessor) this.allCodePathsInNonVoidFunctionReturnOrThrow(n, returnType);
      }
      this.sourceElement(n.body);
    }
    accessorDeclarationTypesIdentical(first: AccessorDeclaration, second: AccessorDeclaration, getAnnotatedType: (a: AccessorDeclaration) => qc.Type | undefined, message: qd.Message) {
      const firstType = getAnnotatedType(first);
      const secondType = getAnnotatedType(second);
      if (firstType && secondType && !isTypeIdenticalTo(firstType, secondType)) error(first, message);
    }
    missingDeclaration(n: Node) {
      this.decorators(n);
    }
    typeArgumentConstraints(n: qc.TypeReferenceNode | ExpressionWithTypeArguments, typeParameters: readonly TypeParameter[]): boolean {
      let typeArguments: qc.Type[] | undefined;
      let mapper: TypeMapper | undefined;
      let result = true;
      for (let i = 0; i < typeParameters.length; i++) {
        const constraint = getConstraintOfTypeParameter(typeParameters[i]);
        if (constraint) {
          if (!typeArguments) {
            typeArguments = getEffectiveTypeArguments(n, typeParameters);
            mapper = createTypeMapper(typeParameters, typeArguments);
          }
          result = result && this.typeAssignableTo(typeArguments[i], instantiateType(constraint, mapper), n.typeArguments![i], qd.msgs.Type_0_does_not_satisfy_the_constraint_1);
        }
      }
      return result;
    }
    typeReferenceNode(n: qc.TypeReferenceNode | ExpressionWithTypeArguments) {
      checkGrammar.typeArguments(n, n.typeArguments);
      if (n.kind === Syntax.TypeReference && n.typeName.jsdocDotPos !== undefined && !qf.is.inJSFile(n) && !qf.is.inDoc(n))
        grammarErrorAtPos(n, n.typeName.jsdocDotPos, 1, qd.msgs.Doc_types_can_only_be_used_inside_documentation_comments);
      forEach(n.typeArguments, checkSourceElement);
      const type = getTypeFromTypeReference(n);
      if (type !== errorType) {
        if (n.typeArguments && produceDiagnostics) {
          const typeParameters = getTypeParametersForTypeReference(n);
          if (typeParameters) this.typeArgumentConstraints(n, typeParameters);
        }
        if (type.flags & TypeFlags.Enum && getNodeLinks(n).resolvedSymbol!.flags & qt.SymbolFlags.EnumMember)
          error(n, qd.msgs.Enum_type_0_has_members_with_initers_that_are_not_literals, typeToString(type));
      }
    }
    typeQuery(n: qc.TypeQueryNode) {
      getTypeFromTypeQueryNode(n);
    }
    typeLiteral(n: qc.TypeLiteralNode) {
      forEach(n.members, checkSourceElement);
      if (produceDiagnostics) {
        const type = getTypeFromTypeLiteralOrFunctionOrConstructorTypeNode(n);
        this.indexConstraints(type);
        this.typeForDuplicateIndexSignatures(n);
        this.objectTypeForDuplicateDeclarations(n);
      }
    }
    arrayType(n: qc.ArrayTypeNode) {
      this.sourceElement(n.elementType);
    }
    tupleType(n: qc.TupleTypeNode) {
      const elementTypes = n.elements;
      let seenOptionalElement = false;
      let seenNamedElement = false;
      for (let i = 0; i < elementTypes.length; i++) {
        const e = elementTypes[i];
        if (e.kind === Syntax.NamedTupleMember) seenNamedElement = true;
        else if (seenNamedElement) {
          grammarErrorOnNode(e, qd.msgs.Tuple_members_must_all_have_names_or_all_not_have_names);
          break;
        }
        if (isTupleRestElement(e)) {
          if (i !== elementTypes.length - 1) {
            grammarErrorOnNode(e, qd.msgs.A_rest_element_must_be_last_in_a_tuple_type);
            break;
          }
          if (!isArrayType(getTypeFromTypeNode((<RestTypeNode>e).type))) error(e, qd.msgs.A_rest_element_type_must_be_an_array_type);
        } else if (isTupleOptionalElement(e)) {
          seenOptionalElement = true;
        } else if (seenOptionalElement) {
          grammarErrorOnNode(e, qd.msgs.A_required_element_cannot_follow_an_optional_element);
          break;
        }
      }
      forEach(n.elements, checkSourceElement);
    }
    unionOrIntersectionType(n: qc.qc.UnionOrIntersectionTypeNode) {
      forEach(n.types, checkSourceElement);
    }
    indexedAccessIndexType(type: qc.Type, accessNode: IndexedAccessTypeNode | ElementAccessExpression) {
      if (!(type.flags & TypeFlags.IndexedAccess)) return type;
      const objectType = (<IndexedAccessType>type).objectType;
      const indexType = (<IndexedAccessType>type).indexType;
      if (isTypeAssignableTo(indexType, getIndexType(objectType, false))) {
        if (
          accessNode.kind === Syntax.ElementAccessExpression &&
          qf.is.assignmentTarget(accessNode) &&
          getObjectFlags(objectType) & ObjectFlags.Mapped &&
          getMappedTypeModifiers(<MappedType>objectType) & MappedTypeModifiers.IncludeReadonly
        ) {
          error(accessNode, qd.msgs.Index_signature_in_type_0_only_permits_reading, typeToString(objectType));
        }
        return type;
      }
      const apparentObjectType = getApparentType(objectType);
      if (getIndexInfoOfType(apparentObjectType, IndexKind.Number) && isTypeAssignableToKind(indexType, TypeFlags.NumberLike)) return type;
      if (isGenericObjectType(objectType)) {
        const propertyName = getPropertyNameFromIndex(indexType, accessNode);
        if (propertyName) {
          const propertySymbol = forEachType(apparentObjectType, (t) => getPropertyOfType(t, propertyName));
          if (propertySymbol && getDeclarationModifierFlagsFromSymbol(propertySymbol) & ModifierFlags.NonPublicAccessibilityModifier) {
            error(accessNode, qd.msgs.Private_or_protected_member_0_cannot_be_accessed_on_a_type_parameter, qy.qf.get.unescUnderscores(propertyName));
            return errorType;
          }
        }
      }
      error(accessNode, qd.msgs.Type_0_cannot_be_used_to_index_type_1, typeToString(indexType), typeToString(objectType));
      return errorType;
    }
    indexedAccessType(n: qc.IndexedAccessTypeNode) {
      this.sourceElement(n.objectType);
      this.sourceElement(n.indexType);
      this.indexedAccessIndexType(getTypeFromIndexedAccessTypeNode(n), n);
    }
    mappedType(n: qc.MappedTypeNode) {
      this.sourceElement(n.typeParameter);
      this.sourceElement(n.type);
      if (!n.type) reportImplicitAny(n, anyType);
      const type = <MappedType>getTypeFromMappedTypeNode(n);
      const constraintType = getConstraintTypeFromMappedType(type);
      this.typeAssignableTo(constraintType, keyofConstraintType, qf.get.effectiveConstraintOfTypeParameter(n.typeParameter));
    }
    thisType(n: qc.ThisTypeNode) {
      getTypeFromThisNodeTypeNode(n);
    }
    typeOperator(n: qc.TypeOperatorNode) {
      checkGrammar.typeOperatorNode(n);
      this.sourceElement(n.type);
    }
    conditionalType(n: qc.ConditionalTypeNode) {
      qf.each.child(n, checkSourceElement);
    }
    inferType(n: qc.InferTypeNode) {
      if (!qc.findAncestor(n, (x) => x.parent && x.parent.kind === Syntax.ConditionalType && (<ConditionalTypeNode>x.parent).extendsType === x))
        grammarErrorOnNode(n, qd.infer_declarations_are_only_permitted_in_the_extends_clause_of_a_conditional_type);
      this.sourceElement(n.typeParameter);
      registerForUnusedIdentifiersCheck(n);
    }
    importType(n: qc.ImportTypeNode) {
      this.sourceElement(n.argument);
      getTypeFromTypeNode(n);
    }
    namedTupleMember(n: qc.NamedTupleMember) {
      if (n.dot3Token && n.questionToken) grammarErrorOnNode(n, qd.msgs.A_tuple_member_cannot_be_both_optional_and_rest);
      if (n.type.kind === Syntax.OptionalType)
        grammarErrorOnNode(n.type, qd.msgs.A_labeled_tuple_element_is_declared_as_optional_with_a_question_mark_after_the_name_and_before_the_colon_rather_than_after_the_type);
      if (n.type.kind === Syntax.RestType) grammarErrorOnNode(n.type, qd.msgs.A_labeled_tuple_element_is_declared_as_rest_with_a_before_the_name_rather_than_before_the_type);
      this.sourceElement(n.type);
      getTypeFromTypeNode(n);
    }
    exportsOnMergedDeclarations(n: qc.Declaration): void {
      if (!produceDiagnostics) return;
      let symbol = n.localSymbol;
      if (!symbol) {
        symbol = getSymbolOfNode(n)!;
        if (!symbol.exportSymbol) return;
      }
      if (getDeclarationOfKind(symbol, n.kind) !== n) return;
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
          const name = qf.get.nameOfDeclaration(d);
          if (declarationSpaces & commonDeclarationSpacesForDefaultAndNonDefault)
            error(name, qd.msgs.Merged_declaration_0_cannot_include_a_default_export_declaration_Consider_adding_a_separate_export_default_0_declaration_instead, declarationNameToString(name));
          else if (declarationSpaces & commonDeclarationSpacesForExportsAndLocals) {
            error(name, qd.msgs.Individual_declarations_in_merged_declaration_0_must_be_all_exported_or_all_local, declarationNameToString(name));
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
            return qf.is.ambientModule(d as ModuleDeclaration) || getModuleInstanceState(d as ModuleDeclaration) !== ModuleInstanceState.NonInstantiated
              ? DeclarationSpaces.ExportNamespace | DeclarationSpaces.ExportValue
              : DeclarationSpaces.ExportNamespace;
          case Syntax.ClassDeclaration:
          case Syntax.EnumDeclaration:
          case Syntax.EnumMember:
            return DeclarationSpaces.ExportType | DeclarationSpaces.ExportValue;
          case Syntax.SourceFile:
            return DeclarationSpaces.ExportType | DeclarationSpaces.ExportValue | DeclarationSpaces.ExportNamespace;
          case Syntax.ExportAssignment:
            if (!qf.is.entityNameExpression((d as ExportAssignment).expression)) return DeclarationSpaces.ExportValue;
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
          case Syntax.qc.Identifier:
            return DeclarationSpaces.ExportValue;
          default:
            return qg.failBadSyntax(d);
        }
      }
    }
    awaitedType(type: qc.Type, errorNode: Node, diagnosticMessage: qd.Message, arg0?: string | number): qc.Type {
      const awaitedType = getAwaitedType(type, errorNode, diagnosticMessage, arg0);
      return awaitedType || errorType;
    }
    asyncFunctionReturnType(n: qc.FunctionLikeDeclaration | MethodSignature, returnTypeNode: TypeNode) {
      const returnType = getTypeFromTypeNode(returnTypeNode);
      if (returnType === errorType) return;
      const globalPromiseType = getGlobalPromiseType(true);
      if (globalPromiseType !== emptyGenericType && !isReferenceToType(returnType, globalPromiseType)) {
        error(
          returnTypeNode,
          qd.msgs.The_return_type_of_an_async_function_or_method_must_be_the_global_Promise_T_type_Did_you_mean_to_write_Promise_0,
          typeToString(getAwaitedType(returnType) || voidType)
        );
        return;
      }
      this.awaitedType(returnType, n, qd.msgs.The_return_type_of_an_async_function_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member);
    }
    decorator(n: qc.Decorator): void {
      const signature = getResolvedSignature(n);
      const returnType = getReturnTypeOfSignature(signature);
      if (returnType.flags & TypeFlags.Any) return;
      let expectedReturnType: qc.Type;
      const headMessage = getDiagnosticHeadMessageForDecoratorResolution(n);
      let errorInfo: qd.MessageChain | undefined;
      switch (n.parent.kind) {
        case Syntax.ClassDeclaration:
          const classSymbol = getSymbolOfNode(n.parent);
          const classConstructorType = getTypeOfSymbol(classSymbol);
          expectedReturnType = getUnionType([classConstructorType, voidType]);
          break;
        case Syntax.Parameter:
          expectedReturnType = voidType;
          errorInfo = chainqd.Messages(undefined, qd.msgs.The_return_type_of_a_parameter_decorator_function_must_be_either_void_or_any);
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
          expectedReturnType = getUnionType([descriptorType, voidType]);
          break;
        default:
          return qu.fail();
      }
      this.typeAssignableTo(returnType, expectedReturnType, n, headMessage, () => errorInfo);
    }
    decorators(n: Node): void {
      if (!n.decorators) return;
      if (!nodeCanBeDecorated(n, n.parent, n.parent.parent)) return;
      if (!compilerOptions.experimentalDecorators) {
        error(
          n,
          qd.msgs
            .Experimental_support_for_decorators_is_a_feature_that_is_subject_to_change_in_a_future_release_Set_the_experimentalDecorators_option_in_your_tsconfig_or_jsconfig_to_remove_this_warning
        );
      }
      const firstDecorator = n.decorators[0];
      this.externalEmitHelpers(firstDecorator, ExternalEmitHelpers.Decorate);
      if (n.kind === Syntax.Parameter) this.externalEmitHelpers(firstDecorator, ExternalEmitHelpers.Param);
      if (compilerOptions.emitDecoratorMetadata) {
        this.externalEmitHelpers(firstDecorator, ExternalEmitHelpers.Metadata);
        switch (n.kind) {
          case Syntax.ClassDeclaration:
            const constructor = qf.get.firstConstructorWithBody(<ClassDeclaration>n);
            if (constructor) {
              for (const parameter of constructor.parameters) {
                markDecoratorMedataDataTypeNodeAsReferenced(getParameterTypeNodeForDecoratorCheck(parameter));
              }
            }
            break;
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
            const otherKind = n.kind === Syntax.GetAccessor ? Syntax.SetAccessor : Syntax.GetAccessor;
            const otherAccessor = getDeclarationOfKind<AccessorDeclaration>(getSymbolOfNode(n as AccessorDeclaration), otherKind);
            markDecoratorMedataDataTypeNodeAsReferenced(getAnnotatedAccessorTypeNode(n as AccessorDeclaration) || (otherAccessor && getAnnotatedAccessorTypeNode(otherAccessor)));
            break;
          case Syntax.MethodDeclaration:
            for (const parameter of (<FunctionLikeDeclaration>n).parameters) {
              markDecoratorMedataDataTypeNodeAsReferenced(getParameterTypeNodeForDecoratorCheck(parameter));
            }
            markDecoratorMedataDataTypeNodeAsReferenced(qf.get.effectiveReturnTypeNode(<FunctionLikeDeclaration>n));
            break;
          case Syntax.PropertyDeclaration:
            markDecoratorMedataDataTypeNodeAsReferenced(qf.get.effectiveTypeAnnotationNode(<ParameterDeclaration>n));
            break;
          case Syntax.Parameter:
            markDecoratorMedataDataTypeNodeAsReferenced(getParameterTypeNodeForDecoratorCheck(<ParameterDeclaration>n));
            const containingSignature = (n as ParameterDeclaration).parent;
            for (const parameter of containingSignature.parameters) {
              markDecoratorMedataDataTypeNodeAsReferenced(getParameterTypeNodeForDecoratorCheck(parameter));
            }
            break;
        }
      }
      forEach(n.decorators, checkDecorator);
    }
    functionDeclaration(n: qc.FunctionDeclaration): void {
      if (produceDiagnostics) {
        this.functionOrMethodDeclaration(n);
        checkGrammar.forGenerator(n);
        this.collisionWithRequireExportsInGeneratedCode(n, n.name!);
        this.collisionWithGlobalPromiseInGeneratedCode(n, n.name!);
      }
    }
    docTypeAliasTag(n: qc.DocTypedefTag | DocCallbackTag) {
      if (!n.typeExpression) error(n.name, qd.msgs.Doc_typedef_tag_should_either_have_a_type_annotation_or_be_followed_by_property_or_member_tags);
      if (n.name) this.typeNameIsReserved(n.name, qd.msgs.Type_alias_name_cannot_be_0);
      this.sourceElement(n.typeExpression);
    }
    docTemplateTag(n: qc.DocTemplateTag): void {
      this.sourceElement(n.constraint);
      for (const tp of n.typeParameters) {
        this.sourceElement(tp);
      }
    }
    docTypeTag(n: qc.DocTypeTag) {
      this.sourceElement(n.typeExpression);
    }
    docParameterTag(n: qc.DocParameterTag) {
      this.sourceElement(n.typeExpression);
      if (!qf.get.parameterSymbolFromDoc(n)) {
        const decl = qf.get.hostSignatureFromDoc(n);
        if (decl) {
          const i = qc.getDoc.tags(decl).filter(isDocParameterTag).indexOf(n);
          if (i > -1 && i < decl.parameters.length && qf.is.kind(qc.BindingPattern, decl.parameters[i].name)) return;
          if (!containsArgumentsReference(decl)) {
            if (qf.is.kind(qc.QualifiedName, n.name))
              error(n.name, qd.msgs.Qualified_name_0_is_not_allowed_without_a_leading_param_object_1, entityNameToString(n.name), entityNameToString(n.name.left));
            else {
              error(n.name, qd.msgs.Doc_param_tag_has_name_0_but_there_is_no_parameter_with_that_name, idText(n.name));
            }
          } else if (findLast(qc.getDoc.tags(decl), isDocParameterTag) === n && n.typeExpression && n.typeExpression.type && !isArrayType(getTypeFromTypeNode(n.typeExpression.type))) {
            error(
              n.name,
              qd.msgs.Doc_param_tag_has_name_0_but_there_is_no_parameter_with_that_name_It_would_match_arguments_if_it_had_an_array_type,
              idText(n.name.kind === Syntax.QualifiedName ? n.name.right : n.name)
            );
          }
        }
      }
    }
    docPropertyTag(n: qc.DocPropertyTag) {
      this.sourceElement(n.typeExpression);
    }
    docFunctionType(n: qc.DocFunctionType): void {
      if (produceDiagnostics && !n.type && !qc.isDoc.constructSignature(n)) reportImplicitAny(n, anyType);
      this.signatureDeclaration(n);
    }
    docImplementsTag(n: qc.DocImplementsTag): void {
      const classLike = qf.get.effectiveDocHost(n);
      if (!classLike || (!qf.is.kind(qc.ClassDeclaration, classLike) && !qf.is.kind(qc.ClassExpression, classLike))) error(classLike, qd.msgs.Doc_0_is_not_attached_to_a_class, idText(n.tagName));
    }
    docAugmentsTag(n: qc.DocAugmentsTag): void {
      const classLike = qf.get.effectiveDocHost(n);
      if (!classLike || (!qf.is.kind(qc.ClassDeclaration, classLike) && !qf.is.kind(qc.ClassExpression, classLike))) {
        error(classLike, qd.msgs.Doc_0_is_not_attached_to_a_class, idText(n.tagName));
        return;
      }
      const augmentsTags = qc.getDoc.tags(classLike).filter(isDocAugmentsTag);
      qu.assert(augmentsTags.length > 0);
      if (augmentsTags.length > 1) error(augmentsTags[1], qd.msgs.Class_declarations_cannot_have_more_than_one_augments_or_extends_tag);
      const name = getIdentifierFromEntityNameExpression(n.class.expression);
      const extend = qf.get.classExtendsHeritageElement(classLike);
      if (extend) {
        const className = getIdentifierFromEntityNameExpression(extend.expression);
        if (className && name.escapedText !== className.escapedText) error(name, qd.msgs.Doc_0_1_does_not_match_the_extends_2_clause, idText(n.tagName), idText(name), idText(className));
      }
    }
    functionOrMethodDeclaration(n: qc.FunctionDeclaration | MethodDeclaration | MethodSignature): void {
      this.decorators(n);
      this.signatureDeclaration(n);
      const functionFlags = getFunctionFlags(n);
      if (n.name && n.name.kind === Syntax.ComputedPropertyName) this.computedPropertyName(n.name);
      if (!hasNonBindableDynamicName(n)) {
        const symbol = getSymbolOfNode(n);
        const localSymbol = n.localSymbol || symbol;
        const firstDeclaration = find(localSymbol.declarations, (declaration) => declaration.kind === n.kind && !(declaration.flags & NodeFlags.JavaScriptFile));
        if (n === firstDeclaration) this.functionOrConstructorSymbol(localSymbol);
        if (symbol.parent) {
          if (getDeclarationOfKind(symbol, n.kind) === n) this.functionOrConstructorSymbol(symbol);
        }
      }
      const body = n.kind === Syntax.MethodSignature ? undefined : n.body;
      this.sourceElement(body);
      this.allCodePathsInNonVoidFunctionReturnOrThrow(n, getReturnTypeFromAnnotation(n));
      if (produceDiagnostics && !qf.get.effectiveReturnTypeNode(n)) {
        if (qf.is.missing(body) && !isPrivateWithinAmbient(n)) reportImplicitAny(n, anyType);
        if (functionFlags & FunctionFlags.Generator && qf.is.present(body)) getReturnTypeOfSignature(getSignatureFromDeclaration(n));
      }
      if (qf.is.inJSFile(n)) {
        const typeTag = qc.getDoc.typeTag(n);
        if (typeTag && typeTag.typeExpression && !getContextualCallSignature(getTypeFromTypeNode(typeTag.typeExpression), n))
          error(typeTag, qd.msgs.The_type_of_a_function_declaration_must_match_the_function_s_signature);
      }
    }
    unusedIdentifiers(potentiallyUnusedIdentifiers: readonly PotentiallyUnusedIdentifier[], addDiagnostic: AddUnusedDiagnostic) {
      for (const n of potentiallyUnusedIdentifiers) {
        switch (n.kind) {
          case Syntax.ClassDeclaration:
          case Syntax.ClassExpression:
            this.unusedClassMembers(n, addDiagnostic);
            this.unusedTypeParameters(n, addDiagnostic);
            break;
          case Syntax.SourceFile:
          case Syntax.ModuleDeclaration:
          case Syntax.Block:
          case Syntax.CaseBlock:
          case Syntax.ForStatement:
          case Syntax.ForInStatement:
          case Syntax.ForOfStatement:
            this.unusedLocalsAndParameters(n, addDiagnostic);
            break;
          case Syntax.Constructor:
          case Syntax.FunctionExpression:
          case Syntax.FunctionDeclaration:
          case Syntax.ArrowFunction:
          case Syntax.MethodDeclaration:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
            if (n.body) this.unusedLocalsAndParameters(n, addDiagnostic);
            this.unusedTypeParameters(n, addDiagnostic);
            break;
          case Syntax.MethodSignature:
          case Syntax.CallSignature:
          case Syntax.ConstructSignature:
          case Syntax.FunctionType:
          case Syntax.ConstructorType:
          case Syntax.TypeAliasDeclaration:
          case Syntax.InterfaceDeclaration:
            this.unusedTypeParameters(n, addDiagnostic);
            break;
          case Syntax.InferType:
            this.unusedInferTypeParameter(n, addDiagnostic);
            break;
          default:
            qg.assertNever(n, 'Node should not have been registered for unused identifiers check');
        }
      }
    }
    unusedClassMembers(n: qc.ClassDeclaration | ClassExpression, addDiagnostic: AddUnusedDiagnostic): void {
      for (const member of n.members) {
        switch (member.kind) {
          case Syntax.MethodDeclaration:
          case Syntax.PropertyDeclaration:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
            if (member.kind === Syntax.SetAccessor && member.symbol.flags & qt.SymbolFlags.GetAccessor) break;
            const symbol = getSymbolOfNode(member);
            if (
              !symbol.isReferenced &&
              (qf.has.effectiveModifier(member, ModifierFlags.Private) || (qf.is.namedDeclaration(member) && qf.is.kind(qc.PrivateIdentifier, member.name))) &&
              !(member.flags & NodeFlags.Ambient)
            ) {
              addDiagnostic(member, UnusedKind.Local, qf.create.diagnosticForNode(member.name!, qd.msgs._0_is_declared_but_its_value_is_never_read, symbol.symbolToString()));
            }
            break;
          case Syntax.Constructor:
            for (const parameter of (<ConstructorDeclaration>member).parameters) {
              if (!parameter.symbol.isReferenced && qf.has.syntacticModifier(parameter, ModifierFlags.Private))
                addDiagnostic(parameter, UnusedKind.Local, qf.create.diagnosticForNode(parameter.name, qd.msgs.Property_0_is_declared_but_its_value_is_never_read, parameter.symbol.name));
            }
            break;
          case Syntax.IndexSignature:
          case Syntax.SemicolonClassElement:
            break;
          default:
            qu.fail();
        }
      }
    }
    unusedInferTypeParameter(n: qc.InferTypeNode, addDiagnostic: AddUnusedDiagnostic): void {
      const { typeParameter } = n;
      if (isTypeParameterUnused(typeParameter)) addDiagnostic(n, UnusedKind.Parameter, qf.create.diagnosticForNode(n, qd.msgs._0_is_declared_but_its_value_is_never_read, idText(typeParameter.name)));
    }
    unusedTypeParameters(n: qc.ClassLikeDeclaration | SignatureDeclaration | InterfaceDeclaration | TypeAliasDeclaration, addDiagnostic: AddUnusedDiagnostic): void {
      if (last(getSymbolOfNode(n).declarations) !== n) return;
      const typeParameters = qf.get.effectiveTypeParameterDeclarations(n);
      const seenParentsWithEveryUnused = new NodeSet<DeclarationWithTypeParameterChildren>();
      for (const typeParameter of typeParameters) {
        if (!isTypeParameterUnused(typeParameter)) continue;
        const name = idText(typeParameter.name);
        const { parent } = typeParameter;
        if (parent.kind !== Syntax.InferType && parent.typeParameters!.every(isTypeParameterUnused)) {
          if (seenParentsWithEveryUnused.tryAdd(parent)) {
            const range = qf.is.kind(qc.DocTemplateTag, parent) ? parent.getRange() : parent.typeParameters!.getRange();
            const only = parent.typeParameters!.length === 1;
            const message = only ? qd.msgs._0_is_declared_but_its_value_is_never_read : qd.msgs.All_type_parameters_are_unused;
            const arg0 = only ? name : undefined;
            addDiagnostic(typeParameter, UnusedKind.Parameter, qf.create.fileDiagnostic(qf.get.sourceFileOf(parent), range.pos, range.end - range.pos, message, arg0));
          }
        } else {
          addDiagnostic(typeParameter, UnusedKind.Parameter, qf.create.diagnosticForNode(typeParameter, qd.msgs._0_is_declared_but_its_value_is_never_read, name));
        }
      }
    }
    unusedLocalsAndParameters(nodeWithLocals: Node, addDiagnostic: AddUnusedDiagnostic): void {
      const unusedImports = new qu.QMap<[ImportClause, ImportedDeclaration[]]>();
      const unusedDestructures = new qu.QMap<[ObjectBindingPattern, BindingElement[]]>();
      const unusedVariables = new qu.QMap<[VariableDeclarationList, VariableDeclaration[]]>();
      nodeWithLocals.locals!.forEach((local) => {
        if (local.flags & qt.SymbolFlags.TypeParameter ? !(local.flags & qt.SymbolFlags.Variable && !(local.isReferenced! & qt.SymbolFlags.Variable)) : local.isReferenced || local.exportSymbol)
          return;
        for (const declaration of local.declarations) {
          if (isValidUnusedLocalDeclaration(declaration)) continue;
          if (isImportedDeclaration(declaration)) addToGroup(unusedImports, importClauseFromImported(declaration), declaration, getNodeId);
          else if (qf.is.kind(qc.BindingElement, declaration) && qf.is.kind(qc.ObjectBindingPattern, declaration.parent)) {
            const lastElement = last(declaration.parent.elements);
            if (declaration === lastElement || !last(declaration.parent.elements).dot3Token) addToGroup(unusedDestructures, declaration.parent, declaration, getNodeId);
          } else if (qf.is.kind(qc.VariableDeclaration, declaration)) {
            addToGroup(unusedVariables, declaration.parent, declaration, getNodeId);
          } else {
            const parameter = local.valueDeclaration && tryGetRootParameterDeclaration(local.valueDeclaration);
            const name = local.valueDeclaration && qf.get.nameOfDeclaration(local.valueDeclaration);
            if (parameter && name) {
              if (!qf.is.parameterPropertyDeclaration(parameter, parameter.parent) && !parameterIsThqy.qf.is.keyword(parameter) && !isIdentifierThatStartsWithUnderscore(name))
                addDiagnostic(parameter, UnusedKind.Parameter, qf.create.diagnosticForNode(name, qd.msgs._0_is_declared_but_its_value_is_never_read, local.name));
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
              ? qf.create.diagnosticForNode(importDecl, qd.msgs._0_is_declared_but_its_value_is_never_read, idText(first(unuseds).name!))
              : qf.create.diagnosticForNode(importDecl, qd.msgs.All_imports_in_import_declaration_are_unused)
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
                ? qf.create.diagnosticForNode(bindingPattern, qd.msgs._0_is_declared_but_its_value_is_never_read, bindingNameText(first(bindingElements).name))
                : qf.create.diagnosticForNode(bindingPattern, qd.msgs.All_destructured_elements_are_unused)
            );
          }
        } else {
          for (const e of bindingElements) {
            addDiagnostic(e, kind, qf.create.diagnosticForNode(e, qd.msgs._0_is_declared_but_its_value_is_never_read, bindingNameText(e.name)));
          }
        }
      });
      unusedVariables.forEach(([declarationList, declarations]) => {
        if (declarationList.declarations.length === declarations.length) {
          addDiagnostic(
            declarationList,
            UnusedKind.Local,
            declarations.length === 1
              ? qf.create.diagnosticForNode(first(declarations).name, qd.msgs._0_is_declared_but_its_value_is_never_read, bindingNameText(first(declarations).name))
              : qf.create.diagnosticForNode(declarationList.parent.kind === Syntax.VariableStatement ? declarationList.parent : declarationList, qd.msgs.All_variables_are_unused)
          );
        } else {
          for (const decl of declarations) {
            addDiagnostic(decl, UnusedKind.Local, qf.create.diagnosticForNode(decl, qd.msgs._0_is_declared_but_its_value_is_never_read, bindingNameText(decl.name)));
          }
        }
      });
    }
    block(n: qc.Block) {
      if (n.kind === Syntax.Block) checkGrammar.statementInAmbientContext(n);
      if (qf.is.functionOrModuleBlock(n)) {
        const saveFlowAnalysisDisabled = flowAnalysisDisabled;
        forEach(n.statements, checkSourceElement);
        flowAnalysisDisabled = saveFlowAnalysisDisabled;
      } else {
        forEach(n.statements, checkSourceElement);
      }
      if (n.locals) registerForUnusedIdentifiersCheck(n);
    }
    collisionWithArgumentsInGeneratedCode(n: qc.SignatureDeclaration) {
      return;
    }
    ifThisIsCapturedInEnclosingScope(n: Node): void {
      qc.findAncestor(n, (current) => {
        if (getNodeCheckFlags(current) & NodeCheckFlags.CaptureThis) {
          const isDeclaration = n.kind !== Syntax.qc.Identifier;
          if (isDeclaration) error(qf.get.nameOfDeclaration(<Declaration>n), qd.msgs.Duplicate_identifier_this_Compiler_uses_variable_declaration_this_to_capture_this_reference);
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
            error(qf.get.nameOfDeclaration(<Declaration>n), qd.msgs.Duplicate_identifier_newTarget_Compiler_uses_variable_declaration_newTarget_to_capture_new_target_meta_property_reference);
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
    collisionWithRequireExportsInGeneratedCode(n: Node, name: qc.Identifier) {
      if (moduleKind >= ModuleKind.ES2015 || compilerOptions.noEmit) return;
      if (!needCollisionCheckForIdentifier(n, name, 'require') && !needCollisionCheckForIdentifier(n, name, 'exports')) return;
      if (qf.is.kind(qc.ModuleDeclaration, n) && getModuleInstanceState(n) !== ModuleInstanceState.Instantiated) return;
      const parent = getDeclarationContainer(n);
      if (parent.kind === Syntax.SourceFile && qf.is.externalOrCommonJsModule(<SourceFile>parent))
        error(name, qd.msgs.Duplicate_identifier_0_Compiler_reserves_name_1_in_top_level_scope_of_a_module, declarationNameToString(name), declarationNameToString(name));
    }
    collisionWithGlobalPromiseInGeneratedCode(n: Node, name: qc.Identifier): void {
      return;
    }
    varDeclaredNamesNotShadowed(n: qc.VariableDeclaration | BindingElement) {
      if ((qf.get.combinedFlagsOf(n) & NodeFlags.BlockScoped) !== 0 || isParameterDeclaration(n)) return;
      if (n.kind === Syntax.VariableDeclaration && !n.initer) return;
      const symbol = getSymbolOfNode(n);
      if (symbol.flags & qt.SymbolFlags.FunctionScopedVariable) {
        if (!qf.is.kind(qc.Identifier, n.name)) return qu.fail();
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
    variableLikeDeclaration(n: qc.ParameterDeclaration | PropertyDeclaration | PropertySignature | VariableDeclaration | BindingElement) {
      this.decorators(n);
      if (!qf.is.kind(qc.BindingElement, n)) this.sourceElement(n.type);
      if (!n.name) return;
      if (n.name.kind === Syntax.ComputedPropertyName) {
        this.computedPropertyName(n.name);
        if (n.initer) this.expressionCached(n.initer);
      }
      if (n.kind === Syntax.BindingElement) {
        if (n.parent.kind === Syntax.ObjectBindingPattern && languageVersion < ScriptTarget.ESNext) this.externalEmitHelpers(n, ExternalEmitHelpers.Rest);
        if (n.propertyName && n.propertyName.kind === Syntax.ComputedPropertyName) this.computedPropertyName(n.propertyName);
        const parent = n.parent.parent;
        const parentType = getTypeForBindingElementParent(parent);
        const name = n.propertyName || n.name;
        if (parentType && !qf.is.kind(qc.BindingPattern, name)) {
          const exprType = getLiteralTypeFromPropertyName(name);
          if (isTypeUsableAsPropertyName(exprType)) {
            const nameText = getPropertyNameFromType(exprType);
            const property = getPropertyOfType(parentType, nameText);
            if (property) {
              markPropertyAsReferenced(property, false);
              this.propertyAccessibility(parent, !!parent.initer && parent.initer.kind === Syntax.SuperKeyword, parentType, property);
            }
          }
        }
      }
      if (qf.is.kind(qc.BindingPattern, n.name)) forEach(n.name.elements, checkSourceElement);
      if (n.initer && qf.get.rootDeclaration(n).kind === Syntax.Parameter && qf.is.missing((qf.get.containingFunction(n) as FunctionLikeDeclaration).body)) {
        error(n, qd.msgs.A_parameter_initer_is_only_allowed_in_a_function_or_constructor_implementation);
        return;
      }
      if (qf.is.kind(qc.BindingPattern, n.name)) {
        const needCheckIniter = n.initer && n.parent.parent.kind !== Syntax.ForInStatement;
        const needCheckWidenedType = n.name.elements.length === 0;
        if (needCheckIniter || needCheckWidenedType) {
          const widenedType = getWidenedTypeForVariableLikeDeclaration(n);
          if (needCheckIniter) {
            const initerType = this.expressionCached(n.initer!);
            if (strictNullChecks && needCheckWidenedType) this.nonNullNonVoidType(initerType, n);
            else {
              this.typeAssignableToAndOptionallyElaborate(initerType, getWidenedTypeForVariableLikeDeclaration(n), n, n.initer);
            }
          }
          if (needCheckWidenedType) {
            if (qf.is.kind(qc.ArrayBindingPattern, n.name)) this.iteratedTypeOrElementType(IterationUse.Destructuring, widenedType, undefinedType, n);
            else if (strictNullChecks) {
              this.nonNullNonVoidType(widenedType, n);
            }
          }
        }
        return;
      }
      const symbol = getSymbolOfNode(n);
      const type = convertAutoToAny(this.getTypeOfSymbol());
      if (n === symbol.valueDeclaration) {
        const initer = qf.get.effectiveIniter(n);
        if (initer) {
          const isJSObjectLiteralIniter =
            qf.is.inJSFile(n) && qf.is.kind(qc.ObjectLiteralExpression, initer) && (initer.properties.length === 0 || qf.is.prototypeAccess(n.name)) && qu.hasEntries(symbol.exports);
          if (!isJSObjectLiteralIniter && n.parent.parent.kind !== Syntax.ForInStatement) this.typeAssignableToAndOptionallyElaborate(this.expressionCached(initer), type, n, initer, undefined);
        }
        if (symbol.declarations.length > 1) {
          if (qu.some(symbol.declarations, (d) => d !== n && qf.is.variableLike(d) && !areDeclarationFlagsIdentical(d, n)))
            error(n.name, qd.msgs.All_declarations_of_0_must_have_identical_modifiers, declarationNameToString(n.name));
        }
      } else {
        const declarationType = convertAutoToAny(getWidenedTypeForVariableLikeDeclaration(n));
        if (type !== errorType && declarationType !== errorType && !isTypeIdenticalTo(type, declarationType) && !(symbol.flags & qt.SymbolFlags.Assignment))
          errorNextVariableOrPropertyDeclarationMustHaveSameType(symbol.valueDeclaration, type, n, declarationType);
        if (n.initer) this.typeAssignableToAndOptionallyElaborate(this.expressionCached(n.initer), declarationType, n, n.initer, undefined);
        if (!areDeclarationFlagsIdentical(n, symbol.valueDeclaration)) error(n.name, qd.msgs.All_declarations_of_0_must_have_identical_modifiers, declarationNameToString(n.name));
      }
      if (n.kind !== Syntax.PropertyDeclaration && n.kind !== Syntax.PropertySignature) {
        this.exportsOnMergedDeclarations(n);
        if (n.kind === Syntax.VariableDeclaration || n.kind === Syntax.BindingElement) this.varDeclaredNamesNotShadowed(n);
        this.collisionWithRequireExportsInGeneratedCode(n, n.name);
        this.collisionWithGlobalPromiseInGeneratedCode(n, n.name);
        if (!compilerOptions.noEmit && languageVersion < ScriptTarget.ESNext && needCollisionCheckForIdentifier(n, n.name, 'WeakMap')) potentialWeakMapCollisions.push(n);
      }
    }
    variableDeclaration(n: qc.VariableDeclaration) {
      checkGrammar.variableDeclaration(n);
      return this.variableLikeDeclaration(n);
    }
    bindingElement(n: qc.BindingElement) {
      checkGrammar.bindingElement(n);
      return this.variableLikeDeclaration(n);
    }
    variableStatement(n: qc.VariableStatement) {
      if (!checkGrammar.decoratorsAndModifiers(n) && !checkGrammar.variableDeclarationList(n.declarationList)) checkGrammar.forDisallowedLetOrConstStatement(n);
      forEach(n.declarationList.declarations, checkSourceElement);
    }
    expressionStatement(n: qc.ExpressionStatement) {
      checkGrammar.statementInAmbientContext(n);
      this.expression(n.expression);
    }
    ifStatement(n: qc.IfStatement) {
      checkGrammar.statementInAmbientContext(n);
      const type = this.truthinessExpression(n.expression);
      this.testingKnownTruthyCallableType(n.expression, n.thenStatement, type);
      this.sourceElement(n.thenStatement);
      if (n.thenStatement.kind === Syntax.EmptyStatement) error(n.thenStatement, qd.msgs.The_body_of_an_if_statement_cannot_be_the_empty_statement);
      this.sourceElement(n.elseStatement);
    }
    testingKnownTruthyCallableType(condExpr: Expression, body: Statement | Expression, type: qc.Type) {
      if (!strictNullChecks) return;
      const testedNode = qf.is.kind(qc.Identifier, condExpr) ? condExpr : qf.is.kind(qc.PropertyAccessExpression, condExpr) ? condExpr.name : undefined;
      if (!testedNode) return;
      const possiblyFalsy = getFalsyFlags(type);
      if (possiblyFalsy) return;
      const callSignatures = getSignaturesOfType(type, SignatureKind.Call);
      if (callSignatures.length === 0) return;
      const testedFunctionSymbol = getSymbolAtLocation(testedNode);
      if (!testedFunctionSymbol) return;
      const functionIsUsedInBody = qf.each.child(body, function check(childNode): boolean | undefined {
        if (qf.is.kind(qc.Identifier, childNode)) {
          const childSymbol = getSymbolAtLocation(childNode);
          if (childSymbol && childSymbol === testedFunctionSymbol) {
            if (qf.is.kind(qc.Identifier, condExpr)) return true;
            let testedExpression = testedNode.parent;
            let childExpression = childNode.parent;
            while (testedExpression && childExpression) {
              if (
                (qf.is.kind(qc.Identifier, testedExpression) && qf.is.kind(qc.Identifier, childExpression)) ||
                (testedExpression.kind === Syntax.ThisKeyword && childExpression.kind === Syntax.ThisKeyword)
              ) {
                return getSymbolAtLocation(testedExpression) === getSymbolAtLocation(childExpression);
              }
              if (qf.is.kind(qc.PropertyAccessExpression, testedExpression) && qf.is.kind(qc.PropertyAccessExpression, childExpression)) {
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
    doStatement(n: qc.DoStatement) {
      checkGrammar.statementInAmbientContext(n);
      this.sourceElement(n.statement);
      this.truthinessExpression(n.expression);
    }
    whileStatement(n: qc.WhileStatement) {
      checkGrammar.statementInAmbientContext(n);
      this.truthinessExpression(n.expression);
      this.sourceElement(n.statement);
    }
    truthinessOfType(type: qc.Type, n: Node) {
      if (type.flags & TypeFlags.Void) error(n, qd.msgs.An_expression_of_type_void_cannot_be_tested_for_truthiness);
      return type;
    }
    truthinessExpression(n: qc.Expression, checkMode?: CheckMode) {
      return this.truthinessOfType(this.expression(n, checkMode), n);
    }
    forStatement(n: qc.ForStatement) {
      if (!checkGrammar.statementInAmbientContext(n)) {
        if (n.initer && n.initer.kind === Syntax.VariableDeclarationList) checkGrammar.variableDeclarationList(<VariableDeclarationList>n.initer);
      }
      if (n.initer) {
        if (n.initer.kind === Syntax.VariableDeclarationList) forEach((<VariableDeclarationList>n.initer).declarations, checkVariableDeclaration);
        else {
          this.expression(n.initer);
        }
      }
      if (n.condition) this.truthinessExpression(n.condition);
      if (n.incrementor) this.expression(n.incrementor);
      this.sourceElement(n.statement);
      if (n.locals) registerForUnusedIdentifiersCheck(n);
    }
    forOfStatement(n: qc.ForOfStatement): void {
      checkGrammar.forInOrForOfStatement(n);
      if (n.awaitModifier) {
        const functionFlags = getFunctionFlags(qf.get.containingFunction(n));
        if ((functionFlags & (FunctionFlags.Invalid | FunctionFlags.Async)) === FunctionFlags.Async && languageVersion < ScriptTarget.ESNext)
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
          if (iteratedType) this.typeAssignableToAndOptionallyElaborate(iteratedType, leftType, varExpr, n.expression);
        }
      }
      this.sourceElement(n.statement);
      if (n.locals) registerForUnusedIdentifiersCheck(n);
    }
    forInStatement(n: qc.ForInStatement) {
      checkGrammar.forInOrForOfStatement(n);
      const rightType = getNonNullableTypeIfNeeded(this.expression(n.expression));
      if (n.initer.kind === Syntax.VariableDeclarationList) {
        const variable = (<VariableDeclarationList>n.initer).declarations[0];
        if (variable && qf.is.kind(qc.BindingPattern, variable.name)) error(variable.name, qd.msgs.The_left_hand_side_of_a_for_in_statement_cannot_be_a_destructuring_pattern);
        this.forInOrForOfVariableDeclaration(n);
      } else {
        const varExpr = n.initer;
        const leftType = this.expression(varExpr);
        if (varExpr.kind === Syntax.ArrayLiteralExpression || varExpr.kind === Syntax.ObjectLiteralExpression)
          error(varExpr, qd.msgs.The_left_hand_side_of_a_for_in_statement_cannot_be_a_destructuring_pattern);
        else if (!isTypeAssignableTo(getIndexTypeOrString(rightType), leftType)) {
          error(varExpr, qd.msgs.The_left_hand_side_of_a_for_in_statement_must_be_of_type_string_or_any);
        } else {
          this.referenceExpression(
            varExpr,
            qd.msgs.The_left_hand_side_of_a_for_in_statement_must_be_a_variable_or_a_property_access,
            qd.msgs.The_left_hand_side_of_a_for_in_statement_may_not_be_an_optional_property_access
          );
        }
      }
      if (rightType === neverType || !isTypeAssignableToKind(rightType, TypeFlags.NonPrimitive | TypeFlags.InstantiableNonPrimitive))
        error(n.expression, qd.msgs.The_right_hand_side_of_a_for_in_statement_must_be_of_type_any_an_object_type_or_a_type_parameter_but_here_has_type_0, typeToString(rightType));
      this.sourceElement(n.statement);
      if (n.locals) registerForUnusedIdentifiersCheck(n);
    }
    forInOrForOfVariableDeclaration(iterationStatement: ForInOrOfStatement): void {
      const variableDeclarationList = <VariableDeclarationList>iterationStatement.initer;
      if (variableDeclarationList.declarations.length >= 1) {
        const decl = variableDeclarationList.declarations[0];
        this.variableDeclaration(decl);
      }
    }
    rightHandSideOfForOf(statement: ForOfStatement): qc.Type {
      const use = statement.awaitModifier ? IterationUse.ForAwaitOf : IterationUse.ForOf;
      return this.iteratedTypeOrElementType(use, this.nonNullExpression(statement.expression), undefinedType, statement.expression);
    }
    iteratedTypeOrElementType(use: IterationUse, inputType: qc.Type, sentType: qc.Type, errorNode: Node | undefined): qc.Type {
      if (isTypeAny(inputType)) return inputType;
      return getIteratedTypeOrElementType(use, inputType, sentType, errorNode, true) || anyType;
    }
    breakOrContinueStatement(n: qc.BreakOrContinueStatement) {
      if (!checkGrammar.statementInAmbientContext(n)) checkGrammar.breakOrContinueStatement(n);
    }
    returnStatement(n: qc.ReturnStatement) {
      if (checkGrammar.statementInAmbientContext(n)) return;
      const func = qf.get.containingFunction(n);
      if (!func) {
        grammarErrorOnFirstToken(n, qd.msgs.A_return_statement_can_only_be_used_within_a_function_body);
        return;
      }
      const signature = getSignatureFromDeclaration(func);
      const returnType = getReturnTypeOfSignature(signature);
      const functionFlags = getFunctionFlags(func);
      if (strictNullChecks || n.expression || returnType.flags & TypeFlags.Never) {
        const exprType = n.expression ? this.expressionCached(n.expression) : undefinedType;
        if (func.kind === Syntax.SetAccessor) {
          if (n.expression) error(n, qd.msgs.Setters_cannot_return_a_value);
        } else if (func.kind === Syntax.Constructor) {
          if (n.expression && !this.typeAssignableToAndOptionallyElaborate(exprType, returnType, n, n.expression))
            error(n, qd.msgs.Return_type_of_constructor_signature_must_be_assignable_to_the_instance_type_of_the_class);
        } else if (getReturnTypeFromAnnotation(func)) {
          const unwrappedReturnType = unwrapReturnType(returnType, functionFlags) ?? returnType;
          const unwrappedExprType =
            functionFlags & FunctionFlags.Async
              ? this.awaitedType(exprType, n, qd.msgs.The_return_type_of_an_async_function_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member)
              : exprType;
          if (unwrappedReturnType) this.typeAssignableToAndOptionallyElaborate(unwrappedExprType, unwrappedReturnType, n, n.expression);
        }
      } else if (func.kind !== Syntax.Constructor && compilerOptions.noImplicitReturns && !isUnwrappedReturnTypeVoidOrAny(func, returnType)) {
        error(n, qd.msgs.Not_all_code_paths_return_a_value);
      }
    }
    withStatement(n: qc.WithStatement) {
      if (!checkGrammar.statementInAmbientContext(n)) {
        if (n.flags & NodeFlags.AwaitContext) grammarErrorOnFirstToken(n, qd.with_statements_are_not_allowed_in_an_async_function_block);
      }
      this.expression(n.expression);
      const sourceFile = qf.get.sourceFileOf(n);
      if (!hasParseDiagnostics(sourceFile)) {
        const start = getSpanOfTokenAtPosition(sourceFile, n.pos).start;
        const end = n.statement.pos;
        grammarErrorAtPos(sourceFile, start, end - start, qd.msgs.The_with_statement_is_not_supported_All_symbols_in_a_with_block_will_have_type_any);
      }
    }
    switchStatement(n: qc.SwitchStatement) {
      checkGrammar.statementInAmbientContext(n);
      let firstDefaultClause: CaseOrDefaultClause;
      let hasDuplicateDefaultClause = false;
      const expressionType = this.expression(n.expression);
      const expressionIsLiteral = isLiteralType(expressionType);
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
          const caseIsLiteral = isLiteralType(caseType);
          let comparedExpressionType = expressionType;
          if (!caseIsLiteral || !expressionIsLiteral) {
            caseType = caseIsLiteral ? getBaseTypeOfLiteralType(caseType) : caseType;
            comparedExpressionType = getBaseTypeOfLiteralType(expressionType);
          }
          if (!isTypeEqualityComparableTo(comparedExpressionType, caseType)) this.typeComparableTo(caseType, comparedExpressionType, clause.expression, undefined);
        }
        forEach(clause.statements, checkSourceElement);
        if (compilerOptions.noFallthroughCasesInSwitch && clause.fallthroughFlowNode && isReachableFlowNode(clause.fallthroughFlowNode)) error(clause, qd.msgs.Fallthrough_case_in_switch);
      });
      if (n.caseBlock.locals) registerForUnusedIdentifiersCheck(n.caseBlock);
    }
    labeledStatement(n: qc.LabeledStatement) {
      if (!checkGrammar.statementInAmbientContext(n)) {
        qc.findAncestor(n.parent, (current) => {
          if (qf.is.functionLike(current)) return 'quit';
          if (current.kind === Syntax.LabeledStatement && (<LabeledStatement>current).label.escapedText === n.label.escapedText) {
            grammarErrorOnNode(n.label, qd.msgs.Duplicate_label_0, qf.get.textOf(n.label));
            return true;
          }
          return false;
        });
      }
      this.sourceElement(n.statement);
    }
    throwStatement(n: qc.ThrowStatement) {
      if (!checkGrammar.statementInAmbientContext(n)) {
        if (n.expression === undefined) grammarErrorAfterFirstToken(n, qd.msgs.Line_break_not_permitted_here);
      }
      if (n.expression) this.expression(n.expression);
    }
    tryStatement(n: qc.TryStatement) {
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
    indexConstraints(type: qc.Type) {
      const declaredNumberIndexer = getIndexDeclarationOfSymbol(type.symbol, IndexKind.Number);
      const declaredStringIndexer = getIndexDeclarationOfSymbol(type.symbol, IndexKind.String);
      const stringIndexType = getIndexTypeOfType(type, IndexKind.String);
      const numberIndexType = getIndexTypeOfType(type, IndexKind.Number);
      if (stringIndexType || numberIndexType) {
        forEach(getPropertiesOfObjectType(type), (prop) => {
          const propType = getTypeOfSymbol(prop);
          this.indexConstraintForProperty(prop, propType, type, declaredStringIndexer, stringIndexType, IndexKind.String);
          this.indexConstraintForProperty(prop, propType, type, declaredNumberIndexer, numberIndexType, IndexKind.Number);
        });
        const classDeclaration = type.symbol.valueDeclaration;
        if (getObjectFlags(type) & ObjectFlags.Class && qf.is.classLike(classDeclaration)) {
          for (const member of classDeclaration.members) {
            if (!qf.has.syntacticModifier(member, ModifierFlags.Static) && hasNonBindableDynamicName(member)) {
              const symbol = getSymbolOfNode(member);
              const propType = this.getTypeOfSymbol();
              this.indexConstraintForProperty(symbol, propType, type, declaredStringIndexer, stringIndexType, IndexKind.String);
              this.indexConstraintForProperty(symbol, propType, type, declaredNumberIndexer, numberIndexType, IndexKind.Number);
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
        error(errorNode, qd.msgs.Numeric_index_type_0_is_not_assignable_to_string_index_type_1, typeToString(numberIndexType!), typeToString(stringIndexType!));
      function checkIndexConstraintForProperty(
        prop: Symbol,
        propertyType: qc.Type,
        containingType: qc.Type,
        indexDeclaration: Declaration | undefined,
        indexType: qc.Type | undefined,
        indexKind: IndexKind
      ): void {
        if (!indexType || isKnownSymbol(prop)) return;
        const propDeclaration = prop.valueDeclaration;
        const name = propDeclaration && qf.get.nameOfDeclaration(propDeclaration);
        if (name && qf.is.kind(qc.PrivateIdentifier, name)) return;
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
          const errorMessage =
            indexKind === IndexKind.String ? qd.msgs.Property_0_of_type_1_is_not_assignable_to_string_index_type_2 : qd.msgs.Property_0_of_type_1_is_not_assignable_to_numeric_index_type_2;
          error(errorNode, errorMessage, prop.symbolToString(), typeToString(propertyType), typeToString(indexType));
        }
      }
    }
    typeNameIsReserved(name: qc.Identifier, message: qd.Message): void {
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
    classNameCollisionWithObject(name: qc.Identifier): void {}
    typeParameters(typeParameterDeclarations: readonly TypeParameterDeclaration[] | undefined) {
      if (typeParameterDeclarations) {
        let seenDefault = false;
        for (let i = 0; i < typeParameterDeclarations.length; i++) {
          const n = typeParameterDeclarations[i];
          this.typeParameter(n);
          if (produceDiagnostics) {
            if (n.default) {
              seenDefault = true;
              this.typeParametersNotReferenced(n.default, typeParameterDeclarations, i);
            } else if (seenDefault) {
              error(n, qd.msgs.Required_type_parameters_may_not_follow_optional_type_parameters);
            }
            for (let j = 0; j < i; j++) {
              if (typeParameterDeclarations[j].symbol === n.symbol) error(n.name, qd.msgs.Duplicate_identifier_0, declarationNameToString(n.name));
            }
          }
        }
      }
    }
    typeParametersNotReferenced(root: TypeNode, typeParameters: readonly TypeParameterDeclaration[], index: number) {
      visit(root);
      function visit(n: Node) {
        if (n.kind === Syntax.TypeReference) {
          const type = getTypeFromTypeReference(<TypeReferenceNode>n);
          if (type.flags & TypeFlags.TypeParameter) {
            for (let i = index; i < typeParameters.length; i++) {
              if (type.symbol === getSymbolOfNode(typeParameters[i])) error(n, qd.msgs.Type_parameter_defaults_can_only_reference_previously_declared_type_parameters);
            }
          }
        }
        qf.each.child(n, visit);
      }
    }
    classExpression(n: qc.ClassExpression): qc.Type {
      this.classLikeDeclaration(n);
      this.nodeDeferred(n);
      return getTypeOfSymbol(getSymbolOfNode(n));
    }
    classExpressionDeferred(n: qc.ClassExpression) {
      forEach(n.members, checkSourceElement);
      registerForUnusedIdentifiersCheck(n);
    }
    classDeclaration(n: qc.ClassDeclaration) {
      if (!n.name && !qf.has.syntacticModifier(n, ModifierFlags.Default)) grammarErrorOnFirstToken(n, qd.msgs.A_class_declaration_without_the_default_modifier_must_have_a_name);
      this.classLikeDeclaration(n);
      forEach(n.members, checkSourceElement);
      registerForUnusedIdentifiersCheck(n);
    }
    classLikeDeclaration(n: qc.ClassLikeDeclaration) {
      checkGrammar.classLikeDeclaration(n);
      this.decorators(n);
      if (n.name) {
        this.typeNameIsReserved(n.name, qd.msgs.Class_name_cannot_be_0);
        this.collisionWithRequireExportsInGeneratedCode(n, n.name);
        this.collisionWithGlobalPromiseInGeneratedCode(n, n.name);
        if (!(n.flags & NodeFlags.Ambient)) this.classNameCollisionWithObject(n.name);
      }
      this.typeParameters(qf.get.effectiveTypeParameterDeclarations(n));
      this.exportsOnMergedDeclarations(n);
      const symbol = getSymbolOfNode(n);
      const type = <InterfaceType>getDeclaredTypeOfSymbol(symbol);
      const typeWithThis = getTypeWithThisArgument(type);
      const staticType = <ObjectType>this.getTypeOfSymbol();
      this.typeParameterListsIdentical(symbol);
      this.classForDuplicateDeclarations(n);
      if (!(n.flags & NodeFlags.Ambient)) this.classForStaticPropertyNameConflicts(n);
      const baseTypeNode = qf.get.effectiveBaseTypeNode(n);
      if (baseTypeNode) {
        forEach(baseTypeNode.typeArguments, checkSourceElement);
        const extendsNode = qf.get.classExtendsHeritageElement(n);
        if (extendsNode && extendsNode !== baseTypeNode) this.expression(extendsNode.expression);
        const baseTypes = getBaseTypes(type);
        if (baseTypes.length && produceDiagnostics) {
          const baseType = baseTypes[0];
          const baseConstructorType = getBaseConstructorTypeOfClass(type);
          const staticBaseType = getApparentType(baseConstructorType);
          this.baseTypeAccessibility(staticBaseType, baseTypeNode);
          this.sourceElement(baseTypeNode.expression);
          if (qu.some(baseTypeNode.typeArguments)) {
            forEach(baseTypeNode.typeArguments, checkSourceElement);
            for (const constructor of getConstructorsForTypeArguments(staticBaseType, baseTypeNode.typeArguments, baseTypeNode)) {
              if (!this.typeArgumentConstraints(baseTypeNode, constructor.typeParameters!)) break;
            }
          }
          const baseWithThis = getTypeWithThisArgument(baseType, type.thisType);
          if (!this.typeAssignableTo(typeWithThis, baseWithThis, undefined)) issueMemberSpecificError(n, typeWithThis, baseWithThis, qd.msgs.Class_0_incorrectly_extends_base_class_1);
          else {
            this.typeAssignableTo(staticType, getTypeWithoutSignatures(staticBaseType), n.name || n, qd.msgs.Class_static_side_0_incorrectly_extends_base_class_static_side_1);
          }
          if (baseConstructorType.flags & TypeFlags.TypeVariable && !isMixinConstructorType(staticType))
            error(n.name || n, qd.msgs.A_mixin_class_must_have_a_constructor_with_a_single_rest_parameter_of_type_any);
          if (!(staticBaseType.symbol && staticBaseType.symbol.flags & qt.SymbolFlags.Class) && !(baseConstructorType.flags & TypeFlags.TypeVariable)) {
            const constructors = getInstantiatedConstructorsForTypeArguments(staticBaseType, baseTypeNode.typeArguments, baseTypeNode);
            if (forEach(constructors, (sig) => !isJSConstructor(sig.declaration) && !isTypeIdenticalTo(getReturnTypeOfSignature(sig), baseType)))
              error(baseTypeNode.expression, qd.msgs.Base_constructors_must_all_have_the_same_return_type);
          }
          this.kindsOfPropertyMemberOverrides(type, baseType);
        }
      }
      const implementedTypeNodes = qf.get.effectiveImplementsTypeNodes(n);
      if (implementedTypeNodes) {
        for (const typeRefNode of implementedTypeNodes) {
          if (!qf.is.entityNameExpression(typeRefNode.expression)) error(typeRefNode.expression, qd.msgs.A_class_can_only_implement_an_identifier_Slashqualified_name_with_optional_type_arguments);
          this.typeReferenceNode(typeRefNode);
          if (produceDiagnostics) {
            const t = getReducedType(getTypeFromTypeNode(typeRefNode));
            if (t !== errorType) {
              if (isValidBaseType(t)) {
                const genericDiag =
                  t.symbol && t.symbol.flags & qt.SymbolFlags.Class
                    ? qd.msgs.Class_0_incorrectly_implements_class_1_Did_you_mean_to_extend_1_and_inherit_its_members_as_a_subclass
                    : qd.msgs.Class_0_incorrectly_implements_interface_1;
                const baseWithThis = getTypeWithThisArgument(t, type.thisType);
                if (!this.typeAssignableTo(typeWithThis, baseWithThis, undefined)) issueMemberSpecificError(n, typeWithThis, baseWithThis, genericDiag);
              } else {
                error(typeRefNode, qd.msgs.A_class_can_only_implement_an_object_type_or_intersection_of_object_types_with_statically_known_members);
              }
            }
          }
        }
      }
      if (produceDiagnostics) {
        this.indexConstraints(type);
        this.typeForDuplicateIndexSignatures(n);
        this.propertyInitialization(n);
      }
    }
    baseTypeAccessibility(type: qc.Type, n: ExpressionWithTypeArguments) {
      const signatures = getSignaturesOfType(type, SignatureKind.Construct);
      if (signatures.length) {
        const declaration = signatures[0].declaration;
        if (declaration && qf.has.effectiveModifier(declaration, ModifierFlags.Private)) {
          const typeClassDeclaration = getClassLikeDeclarationOfSymbol(type.symbol)!;
          if (!isNodeWithinClass(n, typeClassDeclaration)) error(n, qd.msgs.Cannot_extend_a_class_0_Class_constructor_is_marked_as_private, getFullyQualifiedName(type.symbol));
        }
      }
    }
    kindsOfPropertyMemberOverrides(type: InterfaceType, baseType: BaseType): void {
      const baseProperties = getPropertiesOfType(baseType);
      basePropertyCheck: for (const baseProperty of baseProperties) {
        const base = getTargetSymbol(baseProperty);
        if (base.flags & qt.SymbolFlags.Prototype) continue;
        const baseSymbol = getPropertyOfObjectType(type, base.escName);
        if (!baseSymbol) continue;
        const derived = getTargetSymbol(baseSymbol);
        const baseDeclarationFlags = getDeclarationModifierFlagsFromSymbol(base);
        qu.assert(!!derived, "derived should point to something, even if it is the base class' declaration.");
        if (derived === base) {
          const derivedClassDecl = getClassLikeDeclarationOfSymbol(type.symbol)!;
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
          const derivedDeclarationFlags = getDeclarationModifierFlagsFromSymbol(derived);
          if (baseDeclarationFlags & ModifierFlags.Private || derivedDeclarationFlags & ModifierFlags.Private) continue;
          let errorMessage: qd.Message;
          const basePropertyFlags = base.flags & qt.SymbolFlags.PropertyOrAccessor;
          const derivedPropertyFlags = derived.flags & qt.SymbolFlags.PropertyOrAccessor;
          if (basePropertyFlags && derivedPropertyFlags) {
            if (
              (baseDeclarationFlags & ModifierFlags.Abstract && !(base.valueDeclaration && qf.is.kind(qc.PropertyDeclaration, base.valueDeclaration) && base.valueDeclaration.initer)) ||
              (base.valueDeclaration && base.valueDeclaration.parent.kind === Syntax.InterfaceDeclaration) ||
              (derived.valueDeclaration && qf.is.kind(qc.BinaryExpression, derived.valueDeclaration))
            ) {
              continue;
            }
            const overriddenInstanceProperty = basePropertyFlags !== qt.SymbolFlags.Property && derivedPropertyFlags === qt.SymbolFlags.Property;
            const overriddenInstanceAccessor = basePropertyFlags === qt.SymbolFlags.Property && derivedPropertyFlags !== qt.SymbolFlags.Property;
            if (overriddenInstanceProperty || overriddenInstanceAccessor) {
              const errorMessage = overriddenInstanceProperty
                ? qd.msgs._0_is_defined_as_an_accessor_in_class_1_but_is_overridden_here_in_2_as_an_instance_property
                : qd.msgs._0_is_defined_as_a_property_in_class_1_but_is_overridden_here_in_2_as_an_accessor;
              error(qf.get.nameOfDeclaration(derived.valueDeclaration) || derived.valueDeclaration, errorMessage, base.symbolToString(), typeToString(baseType), typeToString(type));
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
                  !qf.is.kind(qc.Identifier, propName) ||
                  !strictNullChecks ||
                  !isPropertyInitializedInConstructor(propName, type, constructor)
                ) {
                  const errorMessage =
                    qd.msgs.Property_0_will_overwrite_the_base_property_in_1_If_this_is_intentional_add_an_initer_Otherwise_add_a_declare_modifier_or_remove_the_redundant_declaration;
                  error(qf.get.nameOfDeclaration(derived.valueDeclaration) || derived.valueDeclaration, errorMessage, base.symbolToString(), typeToString(baseType));
                }
              }
            }
            continue;
          } else if (isPrototypeProperty(base)) {
            if (isPrototypeProperty(derived) || derived.flags & qt.SymbolFlags.Property) continue;
            else {
              qu.assert(!!(derived.flags & qt.SymbolFlags.Accessor));
              errorMessage = qd.msgs.Class_0_defines_instance_member_function_1_but_extended_class_2_defines_it_as_instance_member_accessor;
            }
          } else if (base.flags & qt.SymbolFlags.Accessor) {
            errorMessage = qd.msgs.Class_0_defines_instance_member_accessor_1_but_extended_class_2_defines_it_as_instance_member_function;
          } else {
            errorMessage = qd.msgs.Class_0_defines_instance_member_property_1_but_extended_class_2_defines_it_as_instance_member_function;
          }
          error(qf.get.nameOfDeclaration(derived.valueDeclaration) || derived.valueDeclaration, errorMessage, typeToString(baseType), base.symbolToString(), typeToString(type));
        }
      }
    }
    inheritedPropertiesAreIdentical(type: InterfaceType, typeNode: Node): boolean {
      const baseTypes = getBaseTypes(type);
      if (baseTypes.length < 2) return true;
      interface InheritanceInfoMap {
        prop: Symbol;
        containingType: qc.Type;
      }
      const seen = qu.createEscapedMap<InheritanceInfoMap>();
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
              let errorInfo = chainqd.Messages(undefined, qd.msgs.Named_property_0_of_types_1_and_2_are_not_identical, prop.symbolToString(), typeName1, typeName2);
              errorInfo = chainqd.Messages(errorInfo, qd.msgs.Interface_0_cannot_simultaneously_extend_types_1_and_2, typeToString(type), typeName1, typeName2);
              diagnostics.add(qf.create.diagnosticForNodeFromMessageChain(typeNode, errorInfo));
            }
          }
        }
      }
      return ok;
    }
    propertyInitialization(n: qc.ClassLikeDeclaration) {
      if (!strictNullChecks || !strictPropertyInitialization || n.flags & NodeFlags.Ambient) return;
      const constructor = findConstructorDeclaration(n);
      for (const member of n.members) {
        if (qf.get.effectiveModifierFlags(member) & ModifierFlags.Ambient) continue;
        if (isInstancePropertyWithoutIniter(member)) {
          const propName = (<PropertyDeclaration>member).name;
          if (qf.is.kind(qc.Identifier, propName) || qf.is.kind(qc.PrivateIdentifier, propName)) {
            const type = getTypeOfSymbol(getSymbolOfNode(member));
            if (!(type.flags & TypeFlags.AnyOrUnknown || getFalsyFlags(type) & TypeFlags.Undefined)) {
              if (!constructor || !isPropertyInitializedInConstructor(propName, type, constructor))
                error(member.name, qd.msgs.Property_0_has_no_initer_and_is_not_definitely_assigned_in_the_constructor, declarationNameToString(propName));
            }
          }
        }
      }
    }
    interfaceDeclaration(n: qc.InterfaceDeclaration) {
      if (!checkGrammar.decoratorsAndModifiers(n)) checkGrammar.interfaceDeclaration(n);
      this.typeParameters(n.typeParameters);
      if (produceDiagnostics) {
        this.typeNameIsReserved(n.name, qd.msgs.Interface_name_cannot_be_0);
        this.exportsOnMergedDeclarations(n);
        const symbol = getSymbolOfNode(n);
        this.typeParameterListsIdentical(symbol);
        const firstInterfaceDecl = getDeclarationOfKind<InterfaceDeclaration>(symbol, Syntax.InterfaceDeclaration);
        if (n === firstInterfaceDecl) {
          const type = <InterfaceType>getDeclaredTypeOfSymbol(symbol);
          const typeWithThis = getTypeWithThisArgument(type);
          if (this.inheritedPropertiesAreIdentical(type, n.name)) {
            for (const baseType of getBaseTypes(type)) {
              this.typeAssignableTo(typeWithThis, getTypeWithThisArgument(baseType, type.thisType), n.name, qd.msgs.Interface_0_incorrectly_extends_interface_1);
            }
            this.indexConstraints(type);
          }
        }
        this.objectTypeForDuplicateDeclarations(n);
      }
      forEach(qf.get.interfaceBaseTypeNodes(n), (heritageElement) => {
        if (!qf.is.entityNameExpression(heritageElement.expression))
          error(heritageElement.expression, qd.msgs.An_interface_can_only_extend_an_identifier_Slashqualified_name_with_optional_type_arguments);
        this.typeReferenceNode(heritageElement);
      });
      forEach(n.members, checkSourceElement);
      if (produceDiagnostics) {
        this.typeForDuplicateIndexSignatures(n);
        registerForUnusedIdentifiersCheck(n);
      }
    }
    typeAliasDeclaration(n: qc.TypeAliasDeclaration) {
      checkGrammar.decoratorsAndModifiers(n);
      this.typeNameIsReserved(n.name, qd.msgs.Type_alias_name_cannot_be_0);
      this.exportsOnMergedDeclarations(n);
      this.typeParameters(n.typeParameters);
      this.sourceElement(n.type);
      registerForUnusedIdentifiersCheck(n);
    }
    enumDeclaration(n: qc.EnumDeclaration) {
      if (!produceDiagnostics) return;
      checkGrammar.decoratorsAndModifiers(n);
      this.typeNameIsReserved(n.name, qd.msgs.Enum_name_cannot_be_0);
      this.collisionWithRequireExportsInGeneratedCode(n, n.name);
      this.collisionWithGlobalPromiseInGeneratedCode(n, n.name);
      this.exportsOnMergedDeclarations(n);
      n.members.forEach(checkEnumMember);
      computeEnumMemberValues(n);
      const enumSymbol = getSymbolOfNode(n);
      const firstDeclaration = getDeclarationOfKind(enumSymbol, n.kind);
      if (n === firstDeclaration) {
        if (enumSymbol.declarations.length > 1) {
          const enumIsConst = qf.is.enumConst(n);
          forEach(enumSymbol.declarations, (decl) => {
            if (qf.is.kind(qc.EnumDeclaration, decl) && qf.is.enumConst(decl) !== enumIsConst) error(qf.get.nameOfDeclaration(decl), qd.msgs.Enum_declarations_must_all_be_const_or_non_const);
          });
        }
        let seenEnumMissingInitialIniter = false;
        forEach(enumSymbol.declarations, (declaration) => {
          if (declaration.kind !== Syntax.EnumDeclaration) return false;
          const enumDeclaration = <EnumDeclaration>declaration;
          if (!enumDeclaration.members.length) return false;
          const firstEnumMember = enumDeclaration.members[0];
          if (!firstEnumMember.initer) {
            if (seenEnumMissingInitialIniter) error(firstEnumMember.name, qd.msgs.In_an_enum_with_multiple_declarations_only_one_declaration_can_omit_an_initer_for_its_first_enum_element);
            else {
              seenEnumMissingInitialIniter = true;
            }
          }
        });
      }
    }
    enumMember(n: qc.EnumMember) {
      if (qf.is.kind(qc.PrivateIdentifier, n.name)) error(n, qd.msgs.An_enum_member_cannot_be_named_with_a_private_identifier);
    }
    moduleDeclaration(n: qc.ModuleDeclaration) {
      if (produceDiagnostics) {
        const isGlobalAugmentation = isGlobalScopeAugmentation(n);
        const inAmbientContext = n.flags & NodeFlags.Ambient;
        if (isGlobalAugmentation && !inAmbientContext) error(n.name, qd.msgs.Augmentations_for_the_global_scope_should_have_declare_modifier_unless_they_appear_in_already_ambient_context);
        const isAmbientExternalModule = qf.is.ambientModule(n);
        const contextErrorMessage = isAmbientExternalModule
          ? qd.msgs.An_ambient_module_declaration_is_only_allowed_at_the_top_level_in_a_file
          : qd.msgs.A_namespace_declaration_is_only_allowed_in_a_namespace_or_module;
        if (checkGrammar.moduleElementContext(n, contextErrorMessage)) return;
        if (!checkGrammar.decoratorsAndModifiers(n)) {
          if (!inAmbientContext && n.name.kind === Syntax.StringLiteral) grammarErrorOnNode(n.name, qd.msgs.Only_ambient_modules_can_use_quoted_names);
        }
        if (qf.is.kind(qc.Identifier, n.name)) {
          this.collisionWithRequireExportsInGeneratedCode(n, n.name);
          this.collisionWithGlobalPromiseInGeneratedCode(n, n.name);
        }
        this.exportsOnMergedDeclarations(n);
        const symbol = getSymbolOfNode(n);
        if (
          symbol.flags & qt.SymbolFlags.ValueModule &&
          !inAmbientContext &&
          symbol.declarations.length > 1 &&
          isInstantiatedModule(n, !!compilerOptions.preserveConstEnums || !!compilerOptions.isolatedModules)
        ) {
          const firstNonAmbientClassOrFunc = getFirstNonAmbientClassOrFunctionDeclaration(symbol);
          if (firstNonAmbientClassOrFunc) {
            if (qf.get.sourceFileOf(n) !== qf.get.sourceFileOf(firstNonAmbientClassOrFunc))
              error(n.name, qd.msgs.A_namespace_declaration_cannot_be_in_a_different_file_from_a_class_or_function_with_which_it_is_merged);
            else if (n.pos < firstNonAmbientClassOrFunc.pos) {
              error(n.name, qd.msgs.A_namespace_declaration_cannot_be_located_prior_to_a_class_or_function_with_which_it_is_merged);
            }
          }
          const mergedClass = getDeclarationOfKind(symbol, Syntax.ClassDeclaration);
          if (mergedClass && inSameLexicalScope(n, mergedClass)) getNodeLinks(n).flags |= NodeCheckFlags.LexicalModuleMergesWithClass;
        }
        if (isAmbientExternalModule) {
          if (qf.is.externalModuleAugmentation(n)) {
            const checkBody = isGlobalAugmentation || getSymbolOfNode(n).flags & qt.SymbolFlags.Transient;
            if (checkBody && n.body) {
              for (const statement of n.body.statements) {
                this.moduleAugmentationElement(statement, isGlobalAugmentation);
              }
            }
          } else if (isGlobalSourceFile(n.parent)) {
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
        this.sourceElement(n.body);
        if (!isGlobalScopeAugmentation(n)) registerForUnusedIdentifiersCheck(n);
      }
    }
    moduleAugmentationElement(n: Node, isGlobalAugmentation: boolean): void {
      switch (n.kind) {
        case Syntax.VariableStatement:
          for (const decl of (<VariableStatement>n).declarationList.declarations) {
            this.moduleAugmentationElement(decl, isGlobalAugmentation);
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
        case Syntax.BindingElement:
        case Syntax.VariableDeclaration:
          const name = (<VariableDeclaration | BindingElement>n).name;
          if (qf.is.kind(qc.BindingPattern, name)) {
            for (const el of name.elements) {
              this.moduleAugmentationElement(el, isGlobalAugmentation);
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
          const symbol = getSymbolOfNode(n);
          if (symbol) {
            let reportError = !(symbol.flags & qt.SymbolFlags.Transient);
            if (!reportError) reportError = !!symbol.parent && qf.is.externalModuleAugmentation(symbol.parent.declarations[0]);
          }
          break;
      }
    }
    externalImportOrExportDeclaration(n: qc.ImportDeclaration | ImportEqualsDeclaration | ExportDeclaration): boolean {
      const moduleName = qf.get.externalModuleName(n);
      if (!moduleName || qf.is.missing(moduleName)) return false;
      if (!qf.is.kind(qc.StringLiteral, moduleName)) {
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
    aliasSymbol(n: qc.ImportEqualsDeclaration | ImportClause | NamespaceImport | ImportSpecifier | ExportSpecifier | NamespaceExport) {
      let symbol = getSymbolOfNode(n);
      const target = this.resolveAlias();
      const shouldSkipWithJSExpandoTargets = symbol.flags & qt.SymbolFlags.Assignment;
      if (!shouldSkipWithJSExpandoTargets && target !== unknownSymbol) {
        symbol = getMergedSymbol(symbol.exportSymbol || symbol);
        const excludedMeanings =
          (symbol.flags & (SymbolFlags.Value | qt.SymbolFlags.ExportValue) ? qt.SymbolFlags.Value : 0) |
          (symbol.flags & qt.SymbolFlags.Type ? qt.SymbolFlags.Type : 0) |
          (symbol.flags & qt.SymbolFlags.Namespace ? qt.SymbolFlags.Namespace : 0);
        if (target.flags & excludedMeanings) {
          const message = n.kind === Syntax.ExportSpecifier ? qd.msgs.Export_declaration_conflicts_with_exported_declaration_of_0 : qd.msgs.Import_declaration_conflicts_with_local_declaration_of_0;
          error(n, message, symbol.symbolToString());
        }
        if (compilerOptions.isolatedModules && n.kind === Syntax.ExportSpecifier && !n.parent.parent.isTypeOnly && !(target.flags & qt.SymbolFlags.Value) && !(n.flags & NodeFlags.Ambient))
          error(n, qd.msgs.Re_exporting_a_type_when_the_isolatedModules_flag_is_provided_requires_using_export_type);
      }
    }
    importBinding(n: qc.ImportEqualsDeclaration | ImportClause | NamespaceImport | ImportSpecifier) {
      this.collisionWithRequireExportsInGeneratedCode(n, n.name!);
      this.collisionWithGlobalPromiseInGeneratedCode(n, n.name!);
      this.aliasSymbol(n);
    }
    importDeclaration(n: qc.ImportDeclaration) {
      if (checkGrammar.moduleElementContext(n, qd.msgs.An_import_declaration_can_only_be_used_in_a_namespace_or_module)) return;
      if (!checkGrammar.decoratorsAndModifiers(n) && qf.has.effectiveModifiers(n)) grammarErrorOnFirstToken(n, qd.msgs.An_import_declaration_cannot_have_modifiers);
      if (this.externalImportOrExportDeclaration(n)) {
        const importClause = n.importClause;
        if (importClause && !checkGrammar.importClause(importClause)) {
          if (importClause.name) this.importBinding(importClause);
          if (importClause.namedBindings) {
            if (importClause.namedBindings.kind === Syntax.NamespaceImport) this.importBinding(importClause.namedBindings);
            else {
              const moduleExisted = resolveExternalModuleName(n, n.moduleSpecifier);
              if (moduleExisted) forEach(importClause.namedBindings.elements, checkImportBinding);
            }
          }
        }
      }
    }
    importEqualsDeclaration(n: qc.ImportEqualsDeclaration) {
      if (checkGrammar.moduleElementContext(n, qd.msgs.An_import_declaration_can_only_be_used_in_a_namespace_or_module)) return;
      checkGrammar.decoratorsAndModifiers(n);
      if (qf.is.internalModuleImportEqualsDeclaration(n) || this.externalImportOrExportDeclaration(n)) {
        this.importBinding(n);
        if (qf.has.syntacticModifier(n, ModifierFlags.Export)) markExportAsReferenced(n);
        if (n.moduleReference.kind !== Syntax.ExternalModuleReference) {
          const target = getSymbolOfNode(n).resolveAlias();
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
    exportDeclaration(n: qc.ExportDeclaration) {
      if (checkGrammar.moduleElementContext(n, qd.msgs.An_export_declaration_can_only_be_used_in_a_module)) return;
      if (!checkGrammar.decoratorsAndModifiers(n) && qf.has.effectiveModifiers(n)) grammarErrorOnFirstToken(n, qd.msgs.An_export_declaration_cannot_have_modifiers);
      checkGrammar.exportDeclaration(n);
      if (!n.moduleSpecifier || this.externalImportOrExportDeclaration(n)) {
        if (n.exportClause && !qf.is.kind(qc.NamespaceExport, n.exportClause)) {
          forEach(n.exportClause.elements, checkExportSpecifier);
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
    importsForTypeOnlyConversion(sourceFile: SourceFile) {
      for (const statement of sourceFile.statements) {
        if (
          qf.is.kind(qc.ImportDeclaration, statement) &&
          statement.importClause &&
          !statement.importClause.isTypeOnly &&
          importClauseContainsReferencedImport(statement.importClause) &&
          !isReferencedAliasDeclaration(statement.importClause, true) &&
          !importClauseContainsConstEnumUsedAsValue(statement.importClause)
        ) {
          error(statement, qd.msgs.This_import_is_never_used_as_a_value_and_must_use_import_type_because_the_importsNotUsedAsValues_is_set_to_error);
        }
      }
    }
    exportSpecifier(n: qc.ExportSpecifier) {
      this.aliasSymbol(n);
      if (getEmitDeclarations(compilerOptions)) collectLinkedAliases(n.propertyName || n.name, true);
      if (!n.parent.parent.moduleSpecifier) {
        const exportedName = n.propertyName || n.name;
        const symbol = resolveName(exportedName, exportedName.escapedText, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace | qt.SymbolFlags.Alias, undefined, undefined, true);
        if (symbol && (symbol === undefinedSymbol || symbol === globalThisSymbol || isGlobalSourceFile(getDeclarationContainer(symbol.declarations[0]))))
          error(exportedName, qd.msgs.Cannot_export_0_Only_local_declarations_can_be_exported_from_a_module, idText(exportedName));
        else {
          markExportAsReferenced(n);
          const target = symbol && (symbol.flags & qt.SymbolFlags.Alias ? this.resolveAlias() : symbol);
          if (!target || target === unknownSymbol || target.flags & qt.SymbolFlags.Value) this.expressionCached(n.propertyName || n.name);
        }
      }
    }
    exportAssignment(n: qc.ExportAssignment) {
      if (checkGrammar.moduleElementContext(n, qd.msgs.An_export_assignment_can_only_be_used_in_a_module)) return;
      const container = n.parent.kind === Syntax.SourceFile ? n.parent : <ModuleDeclaration>n.parent.parent;
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
        if (getEmitDeclarations(compilerOptions)) collectLinkedAliases(n.expression as qc.Identifier, true);
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
    externalModuleExports(n: qc.SourceFile | ModuleDeclaration) {
      const moduleSymbol = getSymbolOfNode(n);
      const links = s.getLinks(moduleSymbol);
      if (!links.exportsChecked) {
        const exportEqualsSymbol = moduleSymbol.exports!.get('export=' as qu.__String);
        if (exportEqualsSymbol && hasExportedMembers(moduleSymbol)) {
          const declaration = exportEqualsSymbol.getDeclarationOfAliasSymbol() || exportEqualsSymbol.valueDeclaration;
          if (!isTopLevelInExternalModuleAugmentation(declaration) && !qf.is.inJSFile(declaration))
            error(declaration, qd.msgs.An_export_assignment_cannot_be_used_in_a_module_with_other_exported_elements);
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
                if (isNotOverload(declaration)) diagnostics.add(qf.create.diagnosticForNode(declaration, qd.msgs.Cannot_redeclare_exported_variable_0, qy.qf.get.unescUnderscores(id)));
              }
            }
          });
        }
        links.exportsChecked = true;
      }
    }
    sourceElement(n: Node | undefined): void {
      if (n) {
        const saveCurrentNode = currentNode;
        currentNode = n;
        instantiationCount = 0;
        this.sourceElementWorker(n);
        currentNode = saveCurrentNode;
      }
    }
    sourceElementWorker(n: Node): void {
      if (qf.is.inJSFile(n)) forEach((n as DocContainer).doc, ({ tags }) => forEach(tags, checkSourceElement));
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
        errorOrSuggestion(compilerOptions.allowUnreachableCode === false, n, qd.msgs.Unreachable_code_detected);
      switch (kind) {
        case Syntax.TypeParameter:
          return this.typeParameter(<TypeParameterDeclaration>n);
        case Syntax.Parameter:
          return this.parameter(<ParameterDeclaration>n);
        case Syntax.PropertyDeclaration:
          return this.propertyDeclaration(<PropertyDeclaration>n);
        case Syntax.PropertySignature:
          return this.propertySignature(<PropertySignature>n);
        case Syntax.FunctionType:
        case Syntax.ConstructorType:
        case Syntax.CallSignature:
        case Syntax.ConstructSignature:
        case Syntax.IndexSignature:
          return this.signatureDeclaration(<SignatureDeclaration>n);
        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
          return this.methodDeclaration(<MethodDeclaration | MethodSignature>n);
        case Syntax.Constructor:
          return this.constructorDeclaration(<ConstructorDeclaration>n);
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          return this.accessorDeclaration(<AccessorDeclaration>n);
        case Syntax.TypeReference:
          return this.typeReferenceNode(<TypeReferenceNode>n);
        case Syntax.TypePredicate:
          return this.typePredicate(<TypePredicateNode>n);
        case Syntax.TypeQuery:
          return this.typeQuery(<TypeQueryNode>n);
        case Syntax.TypeLiteral:
          return this.typeLiteral(<TypeLiteralNode>n);
        case Syntax.ArrayType:
          return this.arrayType(<ArrayTypeNode>n);
        case Syntax.TupleType:
          return this.tupleType(<TupleTypeNode>n);
        case Syntax.UnionType:
        case Syntax.IntersectionType:
          return this.unionOrIntersectionType(<qc.UnionOrIntersectionTypeNode>n);
        case Syntax.ParenthesizedType:
        case Syntax.OptionalType:
        case Syntax.RestType:
          return this.sourceElement((<ParenthesizedTypeNode | OptionalTypeNode | RestTypeNode>n).type);
        case Syntax.ThisType:
          return this.thisType(<ThisTypeNode>n);
        case Syntax.TypeOperator:
          return this.typeOperator(<TypeOperatorNode>n);
        case Syntax.ConditionalType:
          return this.conditionalType(<ConditionalTypeNode>n);
        case Syntax.InferType:
          return this.inferType(<InferTypeNode>n);
        case Syntax.ImportType:
          return this.importType(<ImportTypeNode>n);
        case Syntax.NamedTupleMember:
          return this.namedTupleMember(<NamedTupleMember>n);
        case Syntax.DocAugmentsTag:
          return this.docAugmentsTag(n as DocAugmentsTag);
        case Syntax.DocImplementsTag:
          return this.docImplementsTag(n as DocImplementsTag);
        case Syntax.DocTypedefTag:
        case Syntax.DocCallbackTag:
        case Syntax.DocEnumTag:
          return this.docTypeAliasTag(n as DocTypedefTag);
        case Syntax.DocTemplateTag:
          return this.docTemplateTag(n as DocTemplateTag);
        case Syntax.DocTypeTag:
          return this.docTypeTag(n as DocTypeTag);
        case Syntax.DocParameterTag:
          return this.docParameterTag(n as DocParameterTag);
        case Syntax.DocPropertyTag:
          return this.docPropertyTag(n as DocPropertyTag);
        case Syntax.DocFunctionType:
          this.docFunctionType(n as DocFunctionType);
        case Syntax.DocNonNullableType:
        case Syntax.DocNullableType:
        case Syntax.DocAllType:
        case Syntax.DocUnknownType:
        case Syntax.DocTypeLiteral:
          this.docTypeIsInJsFile(n);
          qf.each.child(n, checkSourceElement);
          return;
        case Syntax.DocVariadicType:
          this.docVariadicType(n as DocVariadicType);
          return;
        case Syntax.DocTypeExpression:
          return this.sourceElement((n as DocTypeExpression).type);
        case Syntax.IndexedAccessType:
          return this.indexedAccessType(<IndexedAccessTypeNode>n);
        case Syntax.MappedType:
          return this.mappedType(<MappedTypeNode>n);
        case Syntax.FunctionDeclaration:
          return this.functionDeclaration(<FunctionDeclaration>n);
        case Syntax.Block:
        case Syntax.ModuleBlock:
          return this.block(<Block>n);
        case Syntax.VariableStatement:
          return this.variableStatement(<VariableStatement>n);
        case Syntax.ExpressionStatement:
          return this.expressionStatement(<ExpressionStatement>n);
        case Syntax.IfStatement:
          return this.ifStatement(<IfStatement>n);
        case Syntax.DoStatement:
          return this.doStatement(<DoStatement>n);
        case Syntax.WhileStatement:
          return this.whileStatement(<WhileStatement>n);
        case Syntax.ForStatement:
          return this.forStatement(<ForStatement>n);
        case Syntax.ForInStatement:
          return this.forInStatement(<ForInStatement>n);
        case Syntax.ForOfStatement:
          return this.forOfStatement(<ForOfStatement>n);
        case Syntax.ContinueStatement:
        case Syntax.BreakStatement:
          return this.breakOrContinueStatement(<BreakOrContinueStatement>n);
        case Syntax.ReturnStatement:
          return this.returnStatement(<ReturnStatement>n);
        case Syntax.WithStatement:
          return this.withStatement(<WithStatement>n);
        case Syntax.SwitchStatement:
          return this.switchStatement(<SwitchStatement>n);
        case Syntax.LabeledStatement:
          return this.labeledStatement(<LabeledStatement>n);
        case Syntax.ThrowStatement:
          return this.throwStatement(<ThrowStatement>n);
        case Syntax.TryStatement:
          return this.tryStatement(<TryStatement>n);
        case Syntax.VariableDeclaration:
          return this.variableDeclaration(<VariableDeclaration>n);
        case Syntax.BindingElement:
          return this.bindingElement(<BindingElement>n);
        case Syntax.ClassDeclaration:
          return this.classDeclaration(<ClassDeclaration>n);
        case Syntax.InterfaceDeclaration:
          return this.interfaceDeclaration(<InterfaceDeclaration>n);
        case Syntax.TypeAliasDeclaration:
          return this.typeAliasDeclaration(<TypeAliasDeclaration>n);
        case Syntax.EnumDeclaration:
          return this.enumDeclaration(<EnumDeclaration>n);
        case Syntax.ModuleDeclaration:
          return this.moduleDeclaration(<ModuleDeclaration>n);
        case Syntax.ImportDeclaration:
          return this.importDeclaration(<ImportDeclaration>n);
        case Syntax.ImportEqualsDeclaration:
          return this.importEqualsDeclaration(<ImportEqualsDeclaration>n);
        case Syntax.ExportDeclaration:
          return this.exportDeclaration(<ExportDeclaration>n);
        case Syntax.ExportAssignment:
          return this.exportAssignment(<ExportAssignment>n);
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
    docVariadicType(n: qc.DocVariadicType): void {
      this.docTypeIsInJsFile(n);
      this.sourceElement(n.type);
      const { parent } = n;
      if (qf.is.kind(qc.ParameterDeclaration, parent) && qf.is.kind(qc.DocFunctionType, parent.parent)) {
        if (last(parent.parent.parameters) !== parent) error(n, qd.msgs.A_rest_parameter_must_be_last_in_a_parameter_list);
        return;
      }
      if (!qf.is.kind(qc.DocTypeExpression, parent)) error(n, qd.msgs.Doc_may_only_appear_in_the_last_parameter_of_a_signature);
      const paramTag = n.parent.parent;
      if (!qf.is.kind(qc.DocParameterTag, paramTag)) {
        error(n, qd.msgs.Doc_may_only_appear_in_the_last_parameter_of_a_signature);
        return;
      }
      const param = qf.get.parameterSymbolFromDoc(paramTag);
      if (!param) return;
      const host = qf.get.hostSignatureFromDoc(paramTag);
      if (!host || last(host.parameters).symbol !== param) error(n, qd.msgs.A_rest_parameter_must_be_last_in_a_parameter_list);
    }
    nodeDeferred(n: Node) {
      const enclosingFile = qf.get.sourceFileOf(n);
      const links = getNodeLinks(enclosingFile);
      if (!(links.flags & NodeCheckFlags.TypeChecked)) {
        links.deferredNodes = links.deferredNodes || new qu.QMap();
        const id = '' + getNodeId(n);
        links.deferredNodes.set(id, n);
      }
    }
    deferredNodes(context: SourceFile) {
      const links = getNodeLinks(context);
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
        case Syntax.JsxOpeningElement:
          resolveUntypedCall(n as CallLikeExpression);
          break;
        case Syntax.FunctionExpression:
        case Syntax.ArrowFunction:
        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
          this.functionExpressionOrObjectLiteralMethodDeferred(<FunctionExpression>n);
          break;
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          this.accessorDeclaration(<AccessorDeclaration>n);
          break;
        case Syntax.ClassExpression:
          this.classExpressionDeferred(<ClassExpression>n);
          break;
        case Syntax.JsxSelfClosingElement:
          this.jsxSelfClosingElementDeferred(<JsxSelfClosingElement>n);
          break;
        case Syntax.JsxElement:
          this.jsxElementDeferred(<JsxElement>n);
          break;
      }
      currentNode = saveCurrentNode;
    }
    sourceFile(n: qc.SourceFile) {
      performance.mark('beforeCheck');
      this.sourceFileWorker(n);
      performance.mark('afterCheck');
      performance.measure('Check', 'beforeCheck', 'afterCheck');
    }
    sourceFileWorker(n: qc.SourceFile) {
      const links = getNodeLinks(n);
      if (!(links.flags & NodeCheckFlags.TypeChecked)) {
        if (skipTypeChecking(n, compilerOptions, host)) return;
        checkGrammar.sourceFile(n);
        clear(potentialThisCollisions);
        clear(potentialNewTargetCollisions);
        clear(potentialWeakMapCollisions);
        forEach(n.statements, checkSourceElement);
        this.sourceElement(n.endOfFileToken);
        this.deferredNodes(n);
        if (qf.is.externalOrCommonJsModule(n)) registerForUnusedIdentifiersCheck(n);
        if (!n.isDeclarationFile && (compilerOptions.noUnusedLocals || compilerOptions.noUnusedParameters)) {
          this.unusedIdentifiers(getPotentiallyUnusedIdentifiers(n), (containingNode, kind, diag) => {
            if (!containsParseError(containingNode) && unusedIsError(kind, !!(containingNode.flags & NodeFlags.Ambient))) diagnostics.add(diag);
          });
        }
        if (compilerOptions.importsNotUsedAsValues === ImportsNotUsedAsValues.Error && !n.isDeclarationFile && qf.is.externalModule(n)) this.importsForTypeOnlyConversion(n);
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
    externalEmitHelpers(location: Node, helpers: ExternalEmitHelpers) {
      if ((requestedExternalEmitHelpers & helpers) !== helpers && compilerOptions.importHelpers) {
        const sourceFile = qf.get.sourceFileOf(location);
        if (isEffectiveExternalModule(sourceFile, compilerOptions) && !(location.flags & NodeFlags.Ambient)) {
          const helpersModule = resolveHelpersModule(sourceFile, location);
          if (helpersModule !== unknownSymbol) {
            const uncheckedHelpers = helpers & ~requestedExternalEmitHelpers;
            for (let helper = ExternalEmitHelpers.FirstEmitHelper; helper <= ExternalEmitHelpers.LastEmitHelper; helper <<= 1) {
              if (uncheckedHelpers & helper) {
                const name = getHelperName(helper);
                const symbol = getSymbol(helpersModule.exports!, qy.qf.get.escUnderscores(name), qt.SymbolFlags.Value);
                if (!symbol)
                  error(location, qd.msgs.This_syntax_requires_an_imported_helper_named_1_which_does_not_exist_in_0_Consider_upgrading_your_version_of_0, externalHelpersModuleNameText, name);
              }
            }
          }
          requestedExternalEmitHelpers |= helpers;
        }
      }
    }
    ambientIniter(n: qc.VariableDeclaration | PropertyDeclaration | PropertySignature) {
      const { initer } = n;
      if (initer) {
        const isInvalidIniter = !(
          StringLiteral.orNumberLiteralExpression(initer) ||
          isSimpleLiteralEnumReference(initer) ||
          initer.kind === Syntax.TrueKeyword ||
          initer.kind === Syntax.FalseKeyword ||
          BigIntLiteral.expression(initer)
        );
        const isConstOrReadonly = isDeclarationReadonly(n) || (qf.is.kind(qc.VariableDeclaration, n) && qf.is.varConst(n));
        if (isConstOrReadonly && !n.type) {
          if (isInvalidIniter) return grammarErrorOnNode(initer, qd.msgs.A_const_initer_in_an_ambient_context_must_be_a_string_or_numeric_literal_or_literal_enum_reference);
        }
        return grammarErrorOnNode(initer, qd.msgs.Initers_are_not_allowed_in_ambient_contexts);
        if (!isConstOrReadonly || isInvalidIniter) return grammarErrorOnNode(initer, qd.msgs.Initers_are_not_allowed_in_ambient_contexts);
      }
      return;
    }
    eSModuleMarker(name: qc.Identifier | BindingPattern): boolean {
      if (name.kind === Syntax.qc.Identifier) {
        if (idText(name) === '__esModule') return grammarErrorOnNode(name, qd.msgs.Identifier_expected_esModule_is_reserved_as_an_exported_marker_when_transforming_ECMAScript_modules);
      } else {
        const elements = name.elements;
        for (const element of elements) {
          if (!qf.is.kind(qc.OmittedExpression, element)) return this.eSModuleMarker(element.name);
        }
      }
      return false;
    }
    numericLiteralValueSize(n: qc.NumericLiteral) {
      if (n.numericLiteralFlags & TokenFlags.Scientific || n.text.length <= 15 || n.text.indexOf('.') !== -1) return;
      const apparentValue = +qf.get.textOf(n);
      if (apparentValue <= 2 ** 53 - 1 && apparentValue + 1 > apparentValue) return;
      addErrorOrSuggestion(false, qf.create.diagnosticForNode(n, qd.msgs.Numeric_literals_with_absolute_values_equal_to_2_53_or_greater_are_too_large_to_be_represented_accurately_as_integers));
    }
    grammar = new (class {
      exportDeclaration(n: qc.ExportDeclaration): boolean {
        const isTypeOnlyExportStar = n.isTypeOnly && n.exportClause?.kind !== Syntax.NamedExports;
        if (isTypeOnlyExportStar) grammarErrorOnNode(n, qd.msgs.Only_named_exports_may_use_export_type);
        return !isTypeOnlyExportStar;
      }
      moduleElementContext(n: qc.Statement, errorMessage: qd.Message): boolean {
        const isInAppropriateContext = n.parent.kind === Syntax.SourceFile || n.parent.kind === Syntax.ModuleBlock || n.parent.kind === Syntax.ModuleDeclaration;
        if (!isInAppropriateContext) grammarErrorOnFirstToken(n, errorMessage);
        return !isInAppropriateContext;
      }
      decoratorsAndModifiers(n: Node): boolean {
        return this.decorators(n) || this.modifiers(n);
      }
      decorators(n: Node): boolean {
        if (!n.decorators) return false;
        if (!nodeCanBeDecorated(n, n.parent, n.parent.parent)) {
          if (n.kind === Syntax.MethodDeclaration && !qf.is.present((<MethodDeclaration>n).body))
            return grammarErrorOnFirstToken(n, qd.msgs.A_decorator_can_only_decorate_a_method_implementation_not_an_overload);
          return grammarErrorOnFirstToken(n, qd.msgs.Decorators_are_not_valid_here);
        } else if (n.kind === Syntax.GetAccessor || n.kind === Syntax.SetAccessor) {
          const accessors = qf.get.allAccessorDeclarations((<ClassDeclaration>n.parent).members, <AccessorDeclaration>n);
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
              return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_appear_on_a_type_member, Token.toString(modifier.kind));
            if (n.kind === Syntax.IndexSignature) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_appear_on_an_index_signature, Token.toString(modifier.kind));
          }
          switch (modifier.kind) {
            case Syntax.ConstKeyword:
              if (n.kind !== Syntax.EnumDeclaration) return grammarErrorOnNode(n, qd.msgs.A_class_member_cannot_have_the_0_keyword, Token.toString(Syntax.ConstKeyword));
              break;
            case Syntax.PublicKeyword:
            case Syntax.ProtectedKeyword:
            case Syntax.PrivateKeyword:
              const text = visibilityToString(qy.qf.get.modifierFlag(modifier.kind));
              if (flags & ModifierFlags.AccessibilityModifier) return grammarErrorOnNode(modifier, qd.msgs.Accessibility_modifier_already_seen);
              else if (flags & ModifierFlags.Static) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_must_precede_1_modifier, text, 'static');
              else if (flags & ModifierFlags.Readonly) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_must_precede_1_modifier, text, 'readonly');
              else if (flags & ModifierFlags.Async) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_must_precede_1_modifier, text, 'async');
              else if (n.parent.kind === Syntax.ModuleBlock || n.parent.kind === Syntax.SourceFile)
                return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_appear_on_a_module_or_namespace_element, text);
              else if (flags & ModifierFlags.Abstract) {
                if (modifier.kind === Syntax.PrivateKeyword) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_be_used_with_1_modifier, text, 'abstract');
                return grammarErrorOnNode(modifier, qd.msgs._0_modifier_must_precede_1_modifier, text, 'abstract');
              } else if (n.qf.is.privateIdentifierPropertyDeclaration()) {
                return grammarErrorOnNode(modifier, qd.msgs.An_accessibility_modifier_cannot_be_used_with_a_private_identifier);
              }
              flags |= qy.qf.get.modifierFlag(modifier.kind);
              break;
            case Syntax.StaticKeyword:
              if (flags & ModifierFlags.Static) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_already_seen, 'static');
              else if (flags & ModifierFlags.Readonly) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_must_precede_1_modifier, 'static', 'readonly');
              else if (flags & ModifierFlags.Async) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_must_precede_1_modifier, 'static', 'async');
              else if (n.parent.kind === Syntax.ModuleBlock || n.parent.kind === Syntax.SourceFile)
                return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_appear_on_a_module_or_namespace_element, 'static');
              else if (n.kind === Syntax.Parameter) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_appear_on_a_parameter, 'static');
              else if (flags & ModifierFlags.Abstract) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_be_used_with_1_modifier, 'static', 'abstract');
              else if (n.qf.is.privateIdentifierPropertyDeclaration()) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_be_used_with_a_private_identifier, 'static');
              flags |= ModifierFlags.Static;
              lastStatic = modifier;
              break;
            case Syntax.ReadonlyKeyword:
              if (flags & ModifierFlags.Readonly) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_already_seen, 'readonly');
              else if (n.kind !== Syntax.PropertyDeclaration && n.kind !== Syntax.PropertySignature && n.kind !== Syntax.IndexSignature && n.kind !== Syntax.Parameter)
                return grammarErrorOnNode(modifier, qd.readonly_modifier_can_only_appear_on_a_property_declaration_or_index_signature);
              flags |= ModifierFlags.Readonly;
              lastReadonly = modifier;
              break;
            case Syntax.ExportKeyword:
              if (flags & ModifierFlags.Export) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_already_seen, 'export');
              else if (flags & ModifierFlags.Ambient) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_must_precede_1_modifier, 'export', 'declare');
              else if (flags & ModifierFlags.Abstract) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_must_precede_1_modifier, 'export', 'abstract');
              else if (flags & ModifierFlags.Async) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_must_precede_1_modifier, 'export', 'async');
              else if (qf.is.classLike(n.parent)) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_appear_on_a_class_element, 'export');
              else if (n.kind === Syntax.Parameter) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_appear_on_a_parameter, 'export');
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
              else if (qf.is.classLike(n.parent) && !qf.is.kind(qc.PropertyDeclaration, n)) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_appear_on_a_class_element, 'declare');
              else if (n.kind === Syntax.Parameter) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_appear_on_a_parameter, 'declare');
              else if (n.parent.flags & NodeFlags.Ambient && n.parent.kind === Syntax.ModuleBlock)
                return grammarErrorOnNode(modifier, qd.msgs.A_declare_modifier_cannot_be_used_in_an_already_ambient_context);
              else if (n.qf.is.privateIdentifierPropertyDeclaration()) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_be_used_with_a_private_identifier, 'declare');
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
              else if (n.kind === Syntax.Parameter) return grammarErrorOnNode(modifier, qd.msgs._0_modifier_cannot_appear_on_a_parameter, 'async');
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
        } else if (n.kind === Syntax.Parameter && flags & ModifierFlags.ParameterPropertyModifier && qf.is.kind(qc.BindingPattern, (<ParameterDeclaration>n).name)) {
          return grammarErrorOnNode(n, qd.msgs.A_parameter_property_may_not_be_declared_using_a_binding_pattern);
        } else if (n.kind === Syntax.Parameter && flags & ModifierFlags.ParameterPropertyModifier && (<ParameterDeclaration>n).dot3Token) {
          return grammarErrorOnNode(n, qd.msgs.A_parameter_property_cannot_be_declared_using_a_rest_parameter);
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
      typeParameterList(typeParameters: Nodes<TypeParameterDeclaration> | undefined, file: SourceFile): boolean {
        if (typeParameters && typeParameters.length === 0) {
          const start = typeParameters.pos - '<'.length;
          const end = qy.skipTrivia(file.text, typeParameters.end) + '>'.length;
          return grammarErrorAtPos(file, start, end - start, qd.msgs.Type_parameter_list_cannot_be_empty);
        }
        return false;
      }
      parameterList(parameters: Nodes<ParameterDeclaration>) {
        let seenOptionalParameter = false;
        const parameterCount = parameters.length;
        for (let i = 0; i < parameterCount; i++) {
          const parameter = parameters[i];
          if (parameter.dot3Token) {
            if (i !== parameterCount - 1) return grammarErrorOnNode(parameter.dot3Token, qd.msgs.A_rest_parameter_must_be_last_in_a_parameter_list);
            if (!(parameter.flags & NodeFlags.Ambient)) this.forDisallowedTrailingComma(parameters, qd.msgs.A_rest_parameter_or_binding_pattern_may_not_have_a_trailing_comma);
            if (parameter.questionToken) return grammarErrorOnNode(parameter.questionToken, qd.msgs.A_rest_parameter_cannot_be_optional);
            if (parameter.initer) return grammarErrorOnNode(parameter.name, qd.msgs.A_rest_parameter_cannot_have_an_initer);
          } else if (isOptionalParameter(parameter)) {
            seenOptionalParameter = true;
            if (parameter.questionToken && parameter.initer) return grammarErrorOnNode(parameter.name, qd.msgs.Parameter_cannot_have_question_mark_and_initer);
          } else if (seenOptionalParameter && !parameter.initer) {
            return grammarErrorOnNode(parameter.name, qd.msgs.A_required_parameter_cannot_follow_an_optional_parameter);
          }
        }
      }
      forUseStrictSimpleParameterList(n: qc.FunctionLikeDeclaration): boolean {
        const useStrictDirective = n.body && qf.is.kind(qc.Block, n.body) && findUseStrictPrologue(n.body.statements);
        if (useStrictDirective) {
          const nonSimpleParameters = getNonSimpleParameters(n.parameters);
          if (length(nonSimpleParameters)) {
            forEach(nonSimpleParameters, (parameter) => {
              addRelatedInfo(error(parameter, qd.msgs.This_parameter_is_not_allowed_with_use_strict_directive), qf.create.diagnosticForNode(useStrictDirective, qd.use_strict_directive_used_here));
            });
            const diagnostics = nonSimpleParameters.map((parameter, index) =>
              index === 0 ? qf.create.diagnosticForNode(parameter, qd.msgs.Non_simple_parameter_declared_here) : qf.create.diagnosticForNode(parameter, qd.and_here)
            ) as [qd.msgs.DiagnosticWithLocation, ...qd.msgs.DiagnosticWithLocation[]];
            addRelatedInfo(error(useStrictDirective, qd.use_strict_directive_cannot_be_used_with_non_simple_parameter_list), ...diagnostics);
            return true;
          }
        }
        return false;
      }
      functionLikeDeclaration(n: qc.FunctionLikeDeclaration | MethodSignature): boolean {
        const file = qf.get.sourceFileOf(n);
        return (
          this.decoratorsAndModifiers(n) ||
          this.typeParameterList(n.typeParameters, file) ||
          this.parameterList(n.parameters) ||
          this.arrowFunction(n, file) ||
          (qf.is.functionLikeDeclaration(n) && this.forUseStrictSimpleParameterList(n))
        );
      }
      classLikeDeclaration(n: qc.ClassLikeDeclaration): boolean {
        const file = qf.get.sourceFileOf(n);
        return this.classDeclarationHeritageClauses(n) || this.typeParameterList(n.typeParameters, file);
      }
      arrowFunction(n: Node, file: SourceFile): boolean {
        if (!qf.is.kind(qc.ArrowFunction, n)) return false;
        const { equalsGreaterThanToken } = n;
        const startLine = qy.qf.get.lineAndCharOf(file, equalsGreaterThanToken.pos).line;
        const endLine = qy.qf.get.lineAndCharOf(file, equalsGreaterThanToken.end).line;
        return startLine !== endLine && grammarErrorOnNode(equalsGreaterThanToken, qd.msgs.Line_terminator_not_permitted_before_arrow);
      }
      indexSignatureParameters(n: qc.SignatureDeclaration): boolean {
        const parameter = n.parameters[0];
        if (n.parameters.length !== 1) {
          if (parameter) return grammarErrorOnNode(parameter.name, qd.msgs.An_index_signature_must_have_exactly_one_parameter);
          return grammarErrorOnNode(n, qd.msgs.An_index_signature_must_have_exactly_one_parameter);
        }
        this.forDisallowedTrailingComma(n.parameters, qd.msgs.An_index_signature_cannot_have_a_trailing_comma);
        if (parameter.dot3Token) return grammarErrorOnNode(parameter.dot3Token, qd.msgs.An_index_signature_cannot_have_a_rest_parameter);
        if (qf.has.effectiveModifiers(parameter)) return grammarErrorOnNode(parameter.name, qd.msgs.An_index_signature_parameter_cannot_have_an_accessibility_modifier);
        if (parameter.questionToken) return grammarErrorOnNode(parameter.questionToken, qd.msgs.An_index_signature_parameter_cannot_have_a_question_mark);
        if (parameter.initer) return grammarErrorOnNode(parameter.name, qd.msgs.An_index_signature_parameter_cannot_have_an_initer);
        if (!parameter.type) return grammarErrorOnNode(parameter.name, qd.msgs.An_index_signature_parameter_must_have_a_type_annotation);
        if (parameter.type.kind !== Syntax.StringKeyword && parameter.type.kind !== Syntax.NumberKeyword) {
          const type = getTypeFromTypeNode(parameter.type);
          if (type.flags & TypeFlags.String || type.flags & TypeFlags.Number) {
            return grammarErrorOnNode(
              parameter.name,
              qd.msgs.An_index_signature_parameter_type_cannot_be_a_type_alias_Consider_writing_0_Colon_1_Colon_2_instead,
              qf.get.textOf(parameter.name),
              typeToString(type),
              typeToString(n.type ? getTypeFromTypeNode(n.type) : anyType)
            );
          }
          if (type.flags & TypeFlags.Union && allTypesAssignableToKind(type, TypeFlags.StringOrNumberLiteral, true))
            return grammarErrorOnNode(parameter.name, qd.msgs.An_index_signature_parameter_type_cannot_be_a_union_type_Consider_using_a_mapped_object_type_instead);
          return grammarErrorOnNode(parameter.name, qd.msgs.An_index_signature_parameter_type_must_be_either_string_or_number);
        }
        if (!n.type) return grammarErrorOnNode(n, qd.msgs.An_index_signature_must_have_a_type_annotation);
        return false;
      }
      indexSignature(n: qc.SignatureDeclaration) {
        return this.decoratorsAndModifiers(n) || this.indexSignatureParameters(n);
      }
      forAtLeastOneTypeArgument(n: Node, typeArguments: Nodes<TypeNode> | undefined): boolean {
        if (typeArguments && typeArguments.length === 0) {
          const sourceFile = qf.get.sourceFileOf(n);
          const start = typeArguments.pos - '<'.length;
          const end = qy.skipTrivia(sourceFile.text, typeArguments.end) + '>'.length;
          return grammarErrorAtPos(sourceFile, start, end - start, qd.msgs.Type_argument_list_cannot_be_empty);
        }
        return false;
      }
      typeArguments(n: Node, typeArguments: Nodes<TypeNode> | undefined): boolean {
        return this.forDisallowedTrailingComma(typeArguments) || this.forAtLeastOneTypeArgument(n, typeArguments);
      }
      taggedTemplateChain(n: qc.TaggedTemplateExpression): boolean {
        if (n.questionDotToken || n.flags & NodeFlags.OptionalChain) return grammarErrorOnNode(n.template, qd.msgs.Tagged_template_expressions_are_not_permitted_in_an_optional_chain);
        return false;
      }
      forOmittedArgument(args: Nodes<Expression> | undefined): boolean {
        if (args) {
          for (const arg of args) {
            if (arg.kind === Syntax.OmittedExpression) return grammarErrorAtPos(arg, arg.pos, 0, qd.msgs.Argument_expression_expected);
          }
        }
        return false;
      }
      arguments(args: Nodes<Expression> | undefined): boolean {
        return this.forOmittedArgument(args);
      }
      heritageClause(n: qc.HeritageClause): boolean {
        const types = n.types;
        if (this.forDisallowedTrailingComma(types)) return true;
        if (types && types.length === 0) {
          const listType = Token.toString(n.token);
          return grammarErrorAtPos(n, types.pos, 0, qd.msgs._0_list_cannot_be_empty, listType);
        }
        return some(types, this.expressionWithTypeArguments);
      }
      expressionWithTypeArguments(n: qc.ExpressionWithTypeArguments) {
        return this.typeArguments(n, n.typeArguments);
      }
      classDeclarationHeritageClauses(n: qc.ClassLikeDeclaration) {
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
              qu.assert(heritageClause.token === Syntax.ImplementsKeyword);
              if (seenImplementsClause) return grammarErrorOnFirstToken(heritageClause, qd.implements_clause_already_seen);
              seenImplementsClause = true;
            }
            this.heritageClause(heritageClause);
          }
        }
      }
      interfaceDeclaration(n: qc.InterfaceDeclaration) {
        let seenExtendsClause = false;
        if (n.heritageClauses) {
          for (const heritageClause of n.heritageClauses) {
            if (heritageClause.token === Syntax.ExtendsKeyword) {
              if (seenExtendsClause) return grammarErrorOnFirstToken(heritageClause, qd.extends_clause_already_seen);
              seenExtendsClause = true;
            } else {
              qu.assert(heritageClause.token === Syntax.ImplementsKeyword);
              return grammarErrorOnFirstToken(heritageClause, qd.msgs.Interface_declaration_cannot_have_implements_clause);
            }
            this.heritageClause(heritageClause);
          }
        }
        return false;
      }
      computedPropertyName(n: Node): boolean {
        if (n.kind !== Syntax.ComputedPropertyName) return false;
        const computedPropertyName = <ComputedPropertyName>n;
        if (computedPropertyName.expression.kind === Syntax.BinaryExpression && (<BinaryExpression>computedPropertyName.expression).operatorToken.kind === Syntax.CommaToken)
          return grammarErrorOnNode(computedPropertyName.expression, qd.msgs.A_comma_expression_is_not_allowed_in_a_computed_property_name);
        return false;
      }
      forGenerator(n: qc.FunctionLikeDeclaration) {
        if (n.asteriskToken) {
          qu.assert(n.kind === Syntax.FunctionDeclaration || n.kind === Syntax.FunctionExpression || n.kind === Syntax.MethodDeclaration);
          if (n.flags & NodeFlags.Ambient) return grammarErrorOnNode(n.asteriskToken, qd.msgs.Generators_are_not_allowed_in_an_ambient_context);
          if (!n.body) return grammarErrorOnNode(n.asteriskToken, qd.msgs.An_overload_signature_cannot_be_declared_as_a_generator);
        }
      }
      forInvalidQuestionMark(questionToken: QuestionToken | undefined, message: qd.Message): boolean {
        return !!questionToken && grammarErrorOnNode(questionToken, message);
      }
      forInvalidExclamationToken(exclamationToken: ExclamationToken | undefined, message: qd.Message): boolean {
        return !!exclamationToken && grammarErrorOnNode(exclamationToken, message);
      }
      objectLiteralExpression(n: qc.ObjectLiteralExpression, inDestructuring: boolean) {
        const seen = qu.createEscapedMap<DeclarationMeaning>();
        for (const prop of n.properties) {
          if (prop.kind === Syntax.SpreadAssignment) {
            if (inDestructuring) {
              const expression = skipParentheses(prop.expression);
              if (isArrayLiteralExpression(expression) || qf.is.kind(qc.ObjectLiteralExpression, expression))
                return grammarErrorOnNode(prop.expression, qd.msgs.A_rest_element_cannot_contain_a_binding_pattern);
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
              throw qg.assertNever(prop, 'Unexpected syntax kind:' + (<Node>prop).kind);
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
      jsxElement(n: qc.JsxOpeningLikeElement) {
        this.typeArguments(n, n.typeArguments);
        const seen = qu.createEscapedMap<boolean>();
        for (const attr of n.attributes.properties) {
          if (attr.kind === Syntax.JsxSpreadAttribute) continue;
          const { name, initer } = attr;
          if (!seen.get(name.escapedText)) seen.set(name.escapedText, true);
          return grammarErrorOnNode(name, qd.msgs.JSX_elements_cannot_have_multiple_attributes_with_the_same_name);
          if (initer && initer.kind === Syntax.JsxExpression && !initer.expression) return grammarErrorOnNode(initer, qd.msgs.JSX_attributes_must_only_be_assigned_a_non_empty_expression);
        }
      }
      jsxExpression(n: qc.JsxExpression) {
        if (n.expression && isCommaSequence(n.expression)) return grammarErrorOnNode(n.expression, qd.msgs.JSX_expressions_may_not_use_the_comma_operator_Did_you_mean_to_write_an_array);
      }
      forInOrForOfStatement(forInOrOfStatement: ForInOrOfStatement): boolean {
        if (this.statementInAmbientContext(forInOrOfStatement)) return true;
        if (forInOrOfStatement.kind === Syntax.ForOfStatement && forInOrOfStatement.awaitModifier) {
          if ((forInOrOfStatement.flags & NodeFlags.AwaitContext) === NodeFlags.None) {
            const sourceFile = qf.get.sourceFileOf(forInOrOfStatement);
            if (!hasParseDiagnostics(sourceFile)) {
              const diagnostic = qf.create.diagnosticForNode(forInOrOfStatement.awaitModifier, qd.msgs.A_for_await_of_statement_is_only_allowed_within_an_async_function_or_async_generator);
              const func = qf.get.containingFunction(forInOrOfStatement);
              if (func && func.kind !== Syntax.Constructor) {
                qu.assert((getFunctionFlags(func) & FunctionFlags.Async) === 0, 'Enclosing function should never be an async function.');
                const relatedInfo = qf.create.diagnosticForNode(func, qd.msgs.Did_you_mean_to_mark_this_function_as_async);
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
          if (!this.variableDeclarationList(variableList)) {
            const declarations = variableList.declarations;
            if (!declarations.length) return false;
            if (declarations.length > 1) {
              const diagnostic =
                forInOrOfStatement.kind === Syntax.ForInStatement
                  ? qd.msgs.Only_a_single_variable_declaration_is_allowed_in_a_for_in_statement
                  : qd.msgs.Only_a_single_variable_declaration_is_allowed_in_a_for_of_statement;
              return grammarErrorOnFirstToken(variableList.declarations[1], diagnostic);
            }
            const firstDeclaration = declarations[0];
            if (firstDeclaration.initer) {
              const diagnostic =
                forInOrOfStatement.kind === Syntax.ForInStatement
                  ? qd.msgs.The_variable_declaration_of_a_for_in_statement_cannot_have_an_initer
                  : qd.msgs.The_variable_declaration_of_a_for_of_statement_cannot_have_an_initer;
              return grammarErrorOnNode(firstDeclaration.name, diagnostic);
            }
            if (firstDeclaration.type) {
              const diagnostic =
                forInOrOfStatement.kind === Syntax.ForInStatement
                  ? qd.msgs.The_left_hand_side_of_a_for_in_statement_cannot_use_a_type_annotation
                  : qd.msgs.The_left_hand_side_of_a_for_of_statement_cannot_use_a_type_annotation;
              return grammarErrorOnNode(firstDeclaration, diagnostic);
            }
          }
        }
        return false;
      }
      accessor(accessor: AccessorDeclaration): boolean {
        if (!(accessor.flags & NodeFlags.Ambient)) {
          if (accessor.body === undefined && !qf.has.syntacticModifier(accessor, ModifierFlags.Abstract)) return grammarErrorAtPos(accessor, accessor.end - 1, ';'.length, qd.msgs._0_expected, '{');
        }
        if (accessor.body && qf.has.syntacticModifier(accessor, ModifierFlags.Abstract)) return grammarErrorOnNode(accessor, qd.msgs.An_abstract_accessor_cannot_have_an_implementation);
        if (accessor.typeParameters) return grammarErrorOnNode(accessor.name, qd.msgs.An_accessor_cannot_have_type_parameters);
        if (!doesAccessorHaveCorrectParameterCount(accessor))
          return grammarErrorOnNode(accessor.name, accessor.kind === Syntax.GetAccessor ? qd.msgs.A_get_accessor_cannot_have_parameters : qd.msgs.A_set_accessor_must_have_exactly_one_parameter);
        if (accessor.kind === Syntax.SetAccessor) {
          if (accessor.type) return grammarErrorOnNode(accessor.name, qd.msgs.A_set_accessor_cannot_have_a_return_type_annotation);
          const parameter = qg.check.defined(qf.get.setAccessorValueParameter(accessor), 'Return value does not match parameter count assertion.');
          if (parameter.dot3Token) return grammarErrorOnNode(parameter.dot3Token, qd.msgs.A_set_accessor_cannot_have_rest_parameter);
          if (parameter.questionToken) return grammarErrorOnNode(parameter.questionToken, qd.msgs.A_set_accessor_cannot_have_an_optional_parameter);
          if (parameter.initer) return grammarErrorOnNode(accessor.name, qd.msgs.A_set_accessor_parameter_cannot_have_an_initer);
        }
        return false;
      }
      typeOperatorNode(n: qc.TypeOperatorNode) {
        if (n.operator === Syntax.UniqueKeyword) {
          if (n.type.kind !== Syntax.SymbolKeyword) return grammarErrorOnNode(n.type, qd.msgs._0_expected, Token.toString(Syntax.SymbolKeyword));
          let parent = walkUpParenthesizedTypes(n.parent);
          if (qf.is.inJSFile(parent) && qf.is.kind(qc.DocTypeExpression, parent)) {
            parent = parent.parent;
            if (qf.is.kind(qc.DocTypeTag, parent)) parent = parent.parent.parent;
          }
          switch (parent.kind) {
            case Syntax.VariableDeclaration:
              const decl = parent as VariableDeclaration;
              if (decl.name.kind !== Syntax.qc.Identifier) return grammarErrorOnNode(n, qd.unique_symbol_types_may_not_be_used_on_a_variable_declaration_with_a_binding_name);
              if (!qf.is.variableDeclarationInVariableStatement(decl)) return grammarErrorOnNode(n, qd.unique_symbol_types_are_only_allowed_on_variables_in_a_variable_statement);
              if (!(decl.parent.flags & NodeFlags.Const)) return grammarErrorOnNode((<VariableDeclaration>parent).name, qd.msgs.A_variable_whose_type_is_a_unique_symbol_type_must_be_const);
              break;
            case Syntax.PropertyDeclaration:
              if (!qf.has.syntacticModifier(parent, ModifierFlags.Static) || !qf.has.effectiveModifier(parent, ModifierFlags.Readonly))
                return grammarErrorOnNode((<PropertyDeclaration>parent).name, qd.msgs.A_property_of_a_class_whose_type_is_a_unique_symbol_type_must_be_both_static_and_readonly);
              break;
            case Syntax.PropertySignature:
              if (!qf.has.syntacticModifier(parent, ModifierFlags.Readonly))
                return grammarErrorOnNode((<PropertySignature>parent).name, qd.msgs.A_property_of_an_interface_or_type_literal_whose_type_is_a_unique_symbol_type_must_be_readonly);
              break;
            default:
              return grammarErrorOnNode(n, qd.unique_symbol_types_are_not_allowed_here);
          }
        } else if (n.operator === Syntax.ReadonlyKeyword) {
          if (n.type.kind !== Syntax.ArrayType && n.type.kind !== Syntax.TupleType)
            return grammarErrorOnFirstToken(n, qd.readonly_type_modifier_is_only_permitted_on_array_and_tuple_literal_types, Token.toString(Syntax.SymbolKeyword));
        }
      }
      forInvalidDynamicName(n: qc.DeclarationName, message: qd.Message) {
        if (isNonBindableDynamicName(n)) return grammarErrorOnNode(n, message);
      }
      method(n: qc.MethodDeclaration | MethodSignature) {
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
        } else if (n.parent.kind === Syntax.TypeLiteral) {
          return this.forInvalidDynamicName(n.name, qd.msgs.A_computed_property_name_in_a_type_literal_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type);
        }
      }
      breakOrContinueStatement(n: qc.BreakOrContinueStatement): boolean {
        let current: Node = n;
        while (current) {
          if (qf.is.functionLike(current)) return grammarErrorOnNode(n, qd.msgs.Jump_target_cannot_cross_function_boundary);
          switch (current.kind) {
            case Syntax.LabeledStatement:
              if (n.label && (<LabeledStatement>current).label.escapedText === n.label.escapedText) {
                const isMisplacedContinueLabel = n.kind === Syntax.ContinueStatement && !qf.is.iterationStatement((<LabeledStatement>current).statement, true);
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
      bindingElement(n: qc.BindingElement) {
        if (n.dot3Token) {
          const elements = n.parent.elements;
          if (n !== last(elements)) return grammarErrorOnNode(n, qd.msgs.A_rest_element_must_be_last_in_a_destructuring_pattern);
          this.forDisallowedTrailingComma(elements, qd.msgs.A_rest_parameter_or_binding_pattern_may_not_have_a_trailing_comma);
          if (n.propertyName) return grammarErrorOnNode(n.name, qd.msgs.A_rest_element_cannot_have_a_property_name);
          if (n.initer) return grammarErrorAtPos(n, n.initer.pos - 1, 1, qd.msgs.A_rest_element_cannot_have_an_initer);
        }
        return;
      }
      variableDeclaration(n: qc.VariableDeclaration) {
        if (n.parent.parent.kind !== Syntax.ForInStatement && n.parent.parent.kind !== Syntax.ForOfStatement) {
          if (n.flags & NodeFlags.Ambient) check.ambientIniter(n);
          else if (!n.initer) {
            if (qf.is.kind(qc.BindingPattern, n.name) && !qf.is.kind(qc.BindingPattern, n.parent)) return grammarErrorOnNode(n, qd.msgs.A_destructuring_declaration_must_have_an_initer);
            if (qf.is.varConst(n)) return grammarErrorOnNode(n, qd.const_declarations_must_be_initialized);
          }
        }
        if (n.exclamationToken && (n.parent.parent.kind !== Syntax.VariableStatement || !n.type || n.initer || n.flags & NodeFlags.Ambient))
          return grammarErrorOnNode(n.exclamationToken, qd.msgs.Definite_assignment_assertions_can_only_be_used_along_with_a_type_annotation);
        const moduleKind = getEmitModuleKind(compilerOptions);
        if (
          moduleKind < ModuleKind.ES2015 &&
          moduleKind !== ModuleKind.System &&
          !compilerOptions.noEmit &&
          !(n.parent.parent.flags & NodeFlags.Ambient) &&
          qf.has.syntacticModifier(n.parent.parent, ModifierFlags.Export)
        ) {
          check.eSModuleMarker(n.name);
        }
        const checkLetConstNames = qf.is.aLet(n) || qf.is.varConst(n);
        return checkLetConstNames && this.nameInLetOrConstDeclarations(n.name);
      }
      nameInLetOrConstDeclarations(name: qc.Identifier | BindingPattern): boolean {
        if (name.kind === Syntax.qc.Identifier) {
          if (name.originalKeywordKind === Syntax.LetKeyword) return grammarErrorOnNode(name, qd.let_is_not_allowed_to_be_used_as_a_name_in_let_or_const_declarations);
        } else {
          const elements = name.elements;
          for (const element of elements) {
            if (!qf.is.kind(qc.OmittedExpression, element)) this.nameInLetOrConstDeclarations(element.name);
          }
        }
        return false;
      }
      variableDeclarationList(declarationList: VariableDeclarationList): boolean {
        const declarations = declarationList.declarations;
        if (this.forDisallowedTrailingComma(declarationList.declarations)) return true;
        if (!declarationList.declarations.length) return grammarErrorAtPos(declarationList, declarations.pos, declarations.end - declarations.pos, qd.msgs.Variable_declaration_list_cannot_be_empty);
        return false;
      }
      forDisallowedLetOrConstStatement(n: qc.VariableStatement) {
        if (!allowLetAndConstDeclarations(n.parent)) {
          if (qf.is.aLet(n.declarationList)) return grammarErrorOnNode(n, qd.let_declarations_can_only_be_declared_inside_a_block);
          else if (qf.is.varConst(n.declarationList)) return grammarErrorOnNode(n, qd.const_declarations_can_only_be_declared_inside_a_block);
        }
      }
      metaProperty(n: qc.MetaProperty) {
        const escapedText = n.name.escapedText;
        switch (n.keywordToken) {
          case Syntax.NewKeyword:
            if (escapedText !== 'target')
              return grammarErrorOnNode(n.name, qd.msgs._0_is_not_a_valid_meta_property_for_keyword_1_Did_you_mean_2, n.name.escapedText, Token.toString(n.keywordToken), 'target');
            break;
          case Syntax.ImportKeyword:
            if (escapedText !== 'meta')
              return grammarErrorOnNode(n.name, qd.msgs._0_is_not_a_valid_meta_property_for_keyword_1_Did_you_mean_2, n.name.escapedText, Token.toString(n.keywordToken), 'meta');
            break;
        }
      }
      constructorTypeParameters(n: qc.ConstructorDeclaration) {
        const jsdocTypeParameters = qf.is.inJSFile(n) ? qc.getDoc.typeParameterDeclarations(n) : undefined;
        const range = n.typeParameters || (jsdocTypeParameters && firstOrUndefined(jsdocTypeParameters));
        if (range) {
          const pos = range.pos === range.end ? range.pos : qy.skipTrivia(qf.get.sourceFileOf(n).text, range.pos);
          return grammarErrorAtPos(n, pos, range.end - pos, qd.msgs.Type_parameters_cannot_appear_on_a_constructor_declaration);
        }
      }
      constructorTypeAnnotation(n: qc.ConstructorDeclaration) {
        const type = qf.get.effectiveReturnTypeNode(n);
        if (type) return grammarErrorOnNode(type, qd.msgs.Type_annotation_cannot_appear_on_a_constructor_declaration);
      }
      property(n: qc.PropertyDeclaration | PropertySignature) {
        if (qf.is.classLike(n.parent)) {
          if (qf.is.kind(qc.StringLiteral, n.name) && n.name.text === 'constructor') return grammarErrorOnNode(n.name, qd.msgs.Classes_may_not_have_a_field_named_constructor);
          if (this.forInvalidDynamicName(n.name, qd.msgs.A_computed_property_name_in_a_class_property_declaration_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type)) {
            return true;
          }
        } else if (n.parent.kind === Syntax.InterfaceDeclaration) {
          if (this.forInvalidDynamicName(n.name, qd.msgs.A_computed_property_name_in_an_interface_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type)) return true;
          if (n.initer) return grammarErrorOnNode(n.initer, qd.msgs.An_interface_property_cannot_have_an_initer);
        } else if (n.parent.kind === Syntax.TypeLiteral) {
          if (this.forInvalidDynamicName(n.name, qd.msgs.A_computed_property_name_in_a_type_literal_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type)) return true;
          if (n.initer) return grammarErrorOnNode(n.initer, qd.msgs.A_type_literal_property_cannot_have_an_initer);
        }
        if (n.flags & NodeFlags.Ambient) check.ambientIniter(n);
        if (
          qf.is.kind(qc.PropertyDeclaration, n) &&
          n.exclamationToken &&
          (!qf.is.classLike(n.parent) || !n.type || n.initer || n.flags & NodeFlags.Ambient || qf.has.syntacticModifier(n, ModifierFlags.Static | ModifierFlags.Abstract))
        ) {
          return grammarErrorOnNode(n.exclamationToken, qd.msgs.A_definite_assignment_assertion_is_not_permitted_in_this_context);
        }
      }
      topLevelElementForRequiredDeclareModifier(n: Node): boolean {
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
      topLevelElementsForRequiredDeclareModifier(file: SourceFile): boolean {
        for (const decl of file.statements) {
          if (qf.is.declaration(decl) || decl.kind === Syntax.VariableStatement) {
            if (this.topLevelElementForRequiredDeclareModifier(decl)) return true;
          }
        }
        return false;
      }
      sourceFile(n: qc.SourceFile): boolean {
        return !!(n.flags & NodeFlags.Ambient) && this.topLevelElementsForRequiredDeclareModifier(n);
      }
      nullishCoalesceWithLogicalExpression(n: qc.BinaryExpression) {
        const { left, operatorToken, right } = n;
        if (operatorToken.kind === Syntax.Question2Token) {
          if (qf.is.kind(qc.BinaryExpression, left) && (left.operatorToken.kind === Syntax.Bar2Token || left.operatorToken.kind === Syntax.Ampersand2Token))
            grammarErrorOnNode(left, qd.msgs._0_and_1_operations_cannot_be_mixed_without_parentheses, Token.toString(left.operatorToken.kind), Token.toString(operatorToken.kind));
          if (qf.is.kind(qc.BinaryExpression, right) && (right.operatorToken.kind === Syntax.Bar2Token || right.operatorToken.kind === Syntax.Ampersand2Token))
            grammarErrorOnNode(right, qd.msgs._0_and_1_operations_cannot_be_mixed_without_parentheses, Token.toString(right.operatorToken.kind), Token.toString(operatorToken.kind));
        }
      }
      statementInAmbientContext(n: Node): boolean {
        if (n.flags & NodeFlags.Ambient) {
          const links = getNodeLinks(n);
          if (!links.hasReportedStatementInAmbientContext && (qf.is.functionLike(n.parent) || qf.is.accessor(n.parent)))
            return (getNodeLinks(n).hasReportedStatementInAmbientContext = grammarErrorOnFirstToken(n, qd.msgs.An_implementation_cannot_be_declared_in_ambient_contexts));
          if (n.parent.kind === Syntax.Block || n.parent.kind === Syntax.ModuleBlock || n.parent.kind === Syntax.SourceFile) {
            const links = getNodeLinks(n.parent);
            if (!links.hasReportedStatementInAmbientContext) return (links.hasReportedStatementInAmbientContext = grammarErrorOnFirstToken(n, qd.msgs.Statements_are_not_allowed_in_ambient_contexts));
          } else {
          }
        }
        return false;
      }
      numericLiteral(n: qc.NumericLiteral): boolean {
        if (n.numericLiteralFlags & TokenFlags.Octal) {
          const diagnosticMessage = qd.msgs.Octal_literals_are_not_available_when_targeting_ECMAScript_5_and_higher_Use_the_syntax_0;
          const withMinus = qf.is.kind(qc.PrefixUnaryExpression, n.parent) && n.parent.operator === Syntax.MinusToken;
          const literal = (withMinus ? '-' : '') + '0o' + n.text;
          return grammarErrorOnNode(withMinus ? n.parent : n, diagnosticMessage, literal);
        }
        check.numericLiteralValueSize(n);
        return false;
      }
      bigIntLiteral(n: qc.BigIntLiteral): boolean {
        const literalType = qf.is.kind(qc.LiteralTypeNode, n.parent) || (qf.is.kind(qc.PrefixUnaryExpression, n.parent) && qf.is.kind(qc.LiteralTypeNode, n.parent.parent));
        return false;
      }
      importClause(n: qc.ImportClause): boolean {
        if (n.isTypeOnly && n.name && n.namedBindings) return grammarErrorOnNode(n, qd.msgs.A_type_only_import_can_specify_a_default_import_or_named_bindings_but_not_both);
        return false;
      }
      importCallExpression(n: qc.ImportCall): boolean {
        if (moduleKind === ModuleKind.ES2015) return grammarErrorOnNode(n, qd.msgs.Dynamic_imports_are_only_supported_when_the_module_flag_is_set_to_es2020_esnext_commonjs_amd_system_or_umd);
        if (n.typeArguments) return grammarErrorOnNode(n, qd.msgs.Dynamic_import_cannot_have_type_arguments);
        const nodeArguments = n.arguments;
        if (nodeArguments.length !== 1) return grammarErrorOnNode(n, qd.msgs.Dynamic_import_must_have_one_specifier_as_an_argument);
        this.forDisallowedTrailingComma(nodeArguments);
        if (qf.is.kind(qc.SpreadElement, nodeArguments[0])) return grammarErrorOnNode(nodeArguments[0], qd.msgs.Specifier_of_dynamic_import_cannot_be_spread_element);
        return false;
      }
    })();
  })());
}
export interface Tcheck extends ReturnType<typeof newCheck> {}
