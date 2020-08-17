import * as qc from '../core';
import * as qd from '../diags';
import * as qg from '../debug';
import { ExpandingFlags, ModifierFlags, ObjectFlags, SymbolFlags, TypeFlags, VarianceFlags } from './types';
import { Node, Type, TypeParam, TypeReference, TypeVariable } from './types';
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
  return (qf.check = new (class extends qu.Fcheck {})());
}
export interface Fcheck extends ReturnType<typeof newCheck> {}
export function newType(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.type = new (class Ftype {
    check = new (class extends Ftype {
      typeAssignableTo(t: Type, to: Type, err?: Node, m?: qd.Message, c?: () => qd.MessageChain | undefined, e?: { errors?: qd.Diagnostic[] }) {
        return this.typeRelatedTo(t, to, assignableRelation, err, m, c, e);
      }
      typeComparableTo(t: Type, to: Type, err: Node, m?: qd.Message, c?: () => qd.MessageChain | undefined) {
        return this.typeRelatedTo(t, to, comparableRelation, err, m, c);
      }
      typeRelatedTo(
        t: Type,
        to: Type,
        relation: qu.QMap<qt.RelationComparisonResult>,
        err: Node,
        m?: qd.Message,
        c?: () => qd.MessageChain | undefined,
        e?: { errors?: qd.Diagnostic[]; skipLogging?: boolean }
      ) {
        let errorInfo: qd.MessageChain | undefined;
        let relatedInfo: [qd.DiagnosticRelatedInformation, ...qd.DiagnosticRelatedInformation[]] | undefined;
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
        qf.assert.true(relation !== identityRelation || !err, 'no error reporting in identity checking');
        const result = isRelatedTo(t, to, !!err, m);
        if (incompatibleStack.length) reportIncompatibleStack();
        if (overflow) {
          const diag = error(err || currentNode, qd.msgs.Excessive_stack_depth_comparing_types_0_and_1, typeToString(t), typeToString(to));
          if (e) (e.errors || (e.errors = [])).push(diag);
        } else if (errorInfo) {
          if (c) {
            const chain = c();
            if (chain) {
              qd.concatenateMessageChains(chain, errorInfo);
              errorInfo = chain;
            }
          }
          let relatedInformation: qd.DiagnosticRelatedInformation[] | undefined;
          if (m && err && !result && t.symbol) {
            const ls = t.symbol.links;
            if (ls.originatingImport && !qf.is.importCall(ls.originatingImport)) {
              const helpfulRetry = this.typeRelatedTo(ls.target!.typeOfSymbol(), to, relation, undefined);
              if (helpfulRetry) {
                const diag = qf.create.diagForNode(
                  ls.originatingImport,
                  qd.msgs
                    .Type_originates_at_this_import_A_namespace_style_import_cannot_be_called_or_constructed_and_will_cause_a_failure_at_runtime_Consider_using_a_default_import_or_import_require_here_instead
                );
                relatedInformation = qu.append(relatedInformation, diag);
              }
            }
          }
          const diag = qf.create.diagForNodeFromMessageChain(err!, errorInfo, relatedInformation);
          if (relatedInfo) addRelatedInfo(diag, ...relatedInfo);
          if (e) (e.errors || (e.errors = [])).push(diag);
          if (!e || !e.skipLogging) diagnostics.add(diag);
        }
        if (err && e && e.skipLogging && result === qt.Ternary.False) qf.assert.true(!!e.errors, 'missed opportunity to interact with error.');
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
                else if (qy.is.identifierText(str)) {
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
              case qd.msgs.Call_signatures_with_no_args_have_incompatible_return_types_0_and_1.code:
              case qd.msgs.Construct_signatures_with_no_args_have_incompatible_return_types_0_and_1.code: {
                if (path.length === 0) {
                  let mappedMsg = msg;
                  if (msg.code === qd.msgs.Call_signatures_with_no_args_have_incompatible_return_types_0_and_1.code) mappedMsg = qd.msgs.Call_signature_return_types_0_and_1_are_incompatible;
                  else if (msg.code === qd.msgs.Construct_signatures_with_no_args_have_incompatible_return_types_0_and_1.code) {
                    mappedMsg = qd.msgs.Construct_signature_return_types_0_and_1_are_incompatible;
                  }
                  secondaryRootErrors.unshift([mappedMsg, args[0], args[1]]);
                } else {
                  const prefix =
                    msg.code === qd.msgs.Construct_signature_return_types_0_and_1_are_incompatible.code ||
                    msg.code === qd.msgs.Construct_signatures_with_no_args_have_incompatible_return_types_0_and_1.code
                      ? 'new '
                      : '';
                  const params =
                    msg.code === qd.msgs.Call_signatures_with_no_args_have_incompatible_return_types_0_and_1.code ||
                    msg.code === qd.msgs.Construct_signatures_with_no_args_have_incompatible_return_types_0_and_1.code
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
          if (path)
            reportError(path[path.length - 1] === ')' ? qd.msgs.The_types_returned_by_0_are_incompatible_between_these_types : qd.msgs.The_types_of_0_are_incompatible_between_these_types, path);
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
          qf.assert.true(!!err);
          if (incompatibleStack.length) reportIncompatibleStack();
          if (message.elidedInCompatabilityPyramid) return;
          errorInfo = chainqd.Messages(errorInfo, message, arg0, arg1, arg2, arg3);
        }
        function associateRelatedInfo(info: qd.DiagnosticRelatedInformation) {
          qf.assert.true(!!errorInfo);
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
          if (qf.type.is.literal(source) && !typeCouldHaveTopLevelSingletonTypes(target)) {
            generalizedSource = getBaseTypeOfLiteralType(source);
            generalizedSourceType = getTypeNameForErrorDisplay(generalizedSource);
          }
          if (target.flags & TypeFlags.TypeParam) {
            const constraint = qf.get.baseConstraintOfType(target);
            let needsOriginalSource;
            if (constraint && (qf.type.is.assignableTo(generalizedSource, constraint) || (needsOriginalSource = qf.type.is.assignableTo(source, constraint)))) {
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
        function tryElaborateErrorsForPrimitivesAndObjects(source: Type, target: Type) {
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
        function tryElaborateArrayLikeErrors(source: Type, target: Type, reportErrors: boolean): boolean {
          if (qf.type.is.tuple(source)) {
            if (source.target.readonly && isMutableArrayOrTuple(target)) {
              if (reportErrors) reportError(qd.msgs.The_type_0_is_readonly_and_cannot_be_assigned_to_the_mutable_type_1, typeToString(source), typeToString(target));
              return false;
            }
            return qf.type.is.tuple(target) || qf.type.is.array(target);
          }
          if (qf.type.is.readonlyArray(source) && isMutableArrayOrTuple(target)) {
            if (reportErrors) reportError(qd.msgs.The_type_0_is_readonly_and_cannot_be_assigned_to_the_mutable_type_1, typeToString(source), typeToString(target));
            return false;
          }
          if (qf.type.is.tuple(target)) return qf.type.is.array(source);
          return true;
        }
        function isRelatedTo(originalSource: Type, originalTarget: Type, reportErrors = false, headMessage?: qd.Message, intersectionState = IntersectionState.None): qt.Ternary {
          if (originalSource.flags & TypeFlags.Object && originalTarget.flags & TypeFlags.Primitive) {
            if (qf.type.is.simpleRelatedTo(originalSource, originalTarget, relation, reportErrors ? reportError : undefined)) return qt.Ternary.True;
            reportErrorResults(originalSource, originalTarget, qt.Ternary.False, !!(getObjectFlags(originalSource) & ObjectFlags.JsxAttributes));
            return qt.Ternary.False;
          }
          const source = getNormalizedType(originalSource, false);
          let target = getNormalizedType(originalTarget, true);
          if (source === target) return qt.Ternary.True;
          if (relation === identityRelation) return isIdenticalTo(source, target);
          if (source.flags & TypeFlags.TypeParam && getConstraintOfType(source) === target) return qt.Ternary.True;
          if (target.flags & TypeFlags.Union && source.flags & TypeFlags.Object && (target as qt.UnionType).types.length <= 3 && maybeTypeOfKind(target, TypeFlags.Nullable)) {
            const nullStrippedTarget = extractTypesOfKind(target, ~TypeFlags.Nullable);
            if (!(nullStrippedTarget.flags & (TypeFlags.Union | TypeFlags.Never))) {
              if (source === nullStrippedTarget) return qt.Ternary.True;
              target = nullStrippedTarget;
            }
          }
          if (
            (relation === comparableRelation && !(target.flags & TypeFlags.Never) && qf.type.is.simpleRelatedTo(target, source, relation)) ||
            qf.type.is.simpleRelatedTo(source, target, relation, reportErrors ? reportError : undefined)
          )
            return qt.Ternary.True;
          const isComparingJsxAttributes = !!(getObjectFlags(source) & ObjectFlags.JsxAttributes);
          const isPerformingExcessPropertyChecks = !(intersectionState & IntersectionState.Target) && qf.type.is.objectLiteral(source) && getObjectFlags(source) & ObjectFlags.FreshLiteral;
          if (isPerformingExcessPropertyChecks) {
            if (hasExcessProperties(<qt.FreshObjectLiteralType>source, target, reportErrors)) {
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
            qf.type.is.weak(target) &&
            (qf.get.propertiesOfType(source).length > 0 || qf.type.is.withCallOrConstructSignatures(source));
          if (isPerformingCommonPropertyChecks && !hasCommonProperties(source, target, isComparingJsxAttributes)) {
            if (reportErrors) {
              const calls = getSignaturesOfType(source, SignatureKind.Call);
              const constructs = getSignaturesOfType(source, SignatureKind.Construct);
              if (
                (calls.length > 0 && isRelatedTo(qf.get.returnTypeOfSignature(calls[0]), target, false)) ||
                (constructs.length > 0 && isRelatedTo(qf.get.returnTypeOfSignature(constructs[0]), target, false))
              )
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
                ? someTypeRelatedToType(source as qt.UnionType, target, reportErrors && !(source.flags & TypeFlags.Primitive), intersectionState)
                : eachTypeRelatedToType(source as qt.UnionType, target, reportErrors && !(source.flags & TypeFlags.Primitive), intersectionState);
          } else {
            if (target.flags & TypeFlags.Union)
              result = typeRelatedToSomeType(
                getRegularTypeOfObjectLiteral(source),
                <qt.UnionType>target,
                reportErrors && !(source.flags & TypeFlags.Primitive) && !(target.flags & TypeFlags.Primitive)
              );
            else if (target.flags & TypeFlags.Intersection) {
              result = typeRelatedToEachType(getRegularTypeOfObjectLiteral(source), target as qt.IntersectionType, reportErrors, IntersectionState.Target);
            } else if (source.flags & TypeFlags.Intersection) {
              result = someTypeRelatedToType(<qt.IntersectionType>source, target, false, IntersectionState.Source);
            }
            if (!result && (source.flags & TypeFlags.StructuredOrInstantiable || target.flags & TypeFlags.StructuredOrInstantiable)) {
              if ((result = recursiveTypeRelatedTo(source, target, reportErrors, intersectionState))) resetErrorInfo(saveErrorInfo);
            }
          }
          if (!result && source.flags & (TypeFlags.Intersection | TypeFlags.TypeParam)) {
            const constraint = getEffectiveConstraintOfIntersection(source.flags & TypeFlags.Intersection ? (<qt.IntersectionType>source).types : [source], !!(target.flags & TypeFlags.Union));
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
              (qf.type.is.nonGenericObject(target) &&
                !qf.type.is.array(target) &&
                !qf.type.is.tuple(target) &&
                source.flags & TypeFlags.Intersection &&
                getApparentType(source).flags & TypeFlags.StructuredType &&
                !some((<qt.IntersectionType>source).types, (t) => !!(getObjectFlags(t) & ObjectFlags.NonInferrableType))))
          ) {
            inPropertyCheck = true;
            result &= recursiveTypeRelatedTo(source, target, reportErrors, IntersectionState.PropertyCheck);
            inPropertyCheck = false;
          }
          reportErrorResults(source, target, result, isComparingJsxAttributes);
          return result;
          function reportErrorResults(source: Type, target: Type, result: qt.Ternary, isComparingJsxAttributes: boolean) {
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
                const targetTypes = (target as qt.IntersectionType).types;
                const intrinsicAttributes = getJsxType(JsxNames.IntrinsicAttributes, err);
                const intrinsicClassAttributes = getJsxType(JsxNames.IntrinsicClassAttributes, err);
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
        function isIdenticalTo(source: Type, target: Type): qt.Ternary {
          const flags = source.flags & target.flags;
          if (!(flags & TypeFlags.Substructure)) return qt.Ternary.False;
          if (flags & TypeFlags.UnionOrIntersection) {
            let result = eachTypeRelatedToSomeType(<qt.UnionOrIntersectionType>source, <qt.UnionOrIntersectionType>target);
            if (result) result &= eachTypeRelatedToSomeType(<qt.UnionOrIntersectionType>target, <qt.UnionOrIntersectionType>source);
            return result;
          }
          return recursiveTypeRelatedTo(source, target, false, IntersectionState.None);
        }
        function getTypeOfPropertyInTypes(types: Type[], name: qu.__String) {
          const appendPropType = (propTypes: Type[] | undefined, type: Type) => {
            type = getApparentType(type);
            const prop = type.flags & TypeFlags.UnionOrIntersection ? getPropertyOfqt.UnionOrIntersectionType(<qt.UnionOrIntersectionType>type, name) : getPropertyOfObjectType(type, name);
            const propType =
              (prop && prop.typeOfSymbol()) || (NumericLiteral.name(name) && qf.get.indexTypeOfType(type, IndexKind.Number)) || qf.get.indexTypeOfType(type, IndexKind.String) || undefinedType;
            return qu.append(propTypes, propType);
          };
          return qf.get.unionType(reduceLeft(types, appendPropType, undefined) || empty);
        }
        function hasExcessProperties(source: qt.FreshObjectLiteralType, target: Type, reportErrors: boolean): boolean {
          if (!qf.is.excessPropertyCheckTarget(target) || (!noImplicitAny && getObjectFlags(target) & ObjectFlags.JSLiteral)) return false;
          const isComparingJsxAttributes = !!(getObjectFlags(source) & ObjectFlags.JsxAttributes);
          if ((relation === assignableRelation || relation === comparableRelation) && (isTypeSubsetOf(globalObjectType, target) || (!isComparingJsxAttributes && qf.type.is.emptyObject(target))))
            return false;
          let reducedTarget = target;
          let checkTypes: Type[] | undefined;
          if (target.flags & TypeFlags.Union) {
            reducedTarget = findMatchingDiscriminantType(source, <qt.UnionType>target, isRelatedTo) || filterPrimitivesIfContainsNonPrimitive(<qt.UnionType>target);
            checkTypes = reducedTarget.flags & TypeFlags.Union ? (<qt.UnionType>reducedTarget).types : [reducedTarget];
          }
          for (const prop of qf.get.propertiesOfType(source)) {
            if (shouldCheckAsExcessProperty(prop, source.symbol) && !qf.type.is.ignoredJsxProperty(source, prop)) {
              if (!qf.is.knownProperty(reducedTarget, prop.escName, isComparingJsxAttributes)) {
                if (reportErrors) {
                  const errorTarget = filterType(reducedTarget, qf.is.excessPropertyCheckTarget);
                  if (!err) return qu.fail();
                  if (err.kind === Syntax.JsxAttributes || qf.is.jsx.openingLikeElem(err) || qf.is.jsx.openingLikeElem(err.parent)) {
                    if (prop.valueDeclaration && prop.valueDeclaration.kind === Syntax.JsxAttribute && err.sourceFile === prop.valueDeclaration.name.sourceFile) err = prop.valueDeclaration.name;
                    reportError(qd.msgs.Property_0_does_not_exist_on_type_1, prop.symbolToString(), typeToString(errorTarget));
                  } else {
                    const objectLiteralDeclaration = source.symbol && firstOrUndefined(source.symbol.declarations);
                    let suggestion;
                    if (prop.valueDeclaration && qc.findAncestor(prop.valueDeclaration, (d) => d === objectLiteralDeclaration) && objectLiteralDeclaration.sourceFile === err.sourceFile) {
                      const propDeclaration = prop.valueDeclaration as qt.ObjectLiteralElemLike;
                      qg.assert.node(propDeclaration, isObjectLiteralElemLike);
                      err = propDeclaration;
                      const name = propDeclaration.name!;
                      if (name.kind === Syntax.Identifier) suggestion = getSuggestionForNonexistentProperty(name, errorTarget);
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
              if (checkTypes && !isRelatedTo(prop.typeOfSymbol(), getTypeOfPropertyInTypes(checkTypes, prop.escName), reportErrors)) {
                if (reportErrors) reportIncompatibleError(qd.msgs.Types_of_property_0_are_incompatible, prop.symbolToString());
                return true;
              }
            }
          }
          return false;
        }
        function shouldCheckAsExcessProperty(s: qt.Symbol, container: qt.Symbol) {
          return s.valueDeclaration && container.valueDeclaration && s.valueDeclaration.parent === container.valueDeclaration;
        }
        function eachTypeRelatedToSomeType(source: qt.UnionOrIntersectionType, target: qt.UnionOrIntersectionType): qt.Ternary {
          let result = qt.Ternary.True;
          const sourceTypes = source.types;
          for (const sourceType of sourceTypes) {
            const related = typeRelatedToSomeType(sourceType, target, false);
            if (!related) return qt.Ternary.False;
            result &= related;
          }
          return result;
        }
        function typeRelatedToSomeType(source: Type, target: qt.UnionOrIntersectionType, reportErrors: boolean): qt.Ternary {
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
        function typeRelatedToEachType(source: Type, target: qt.IntersectionType, reportErrors: boolean, intersectionState: IntersectionState): qt.Ternary {
          let result = qt.Ternary.True;
          const targetTypes = target.types;
          for (const targetType of targetTypes) {
            const related = isRelatedTo(source, targetType, reportErrors, undefined, intersectionState);
            if (!related) return qt.Ternary.False;
            result &= related;
          }
          return result;
        }
        function someTypeRelatedToType(source: qt.UnionOrIntersectionType, target: Type, reportErrors: boolean, intersectionState: IntersectionState): qt.Ternary {
          const sourceTypes = source.types;
          if (source.flags & TypeFlags.Union && containsType(sourceTypes, target)) return qt.Ternary.True;
          const len = sourceTypes.length;
          for (let i = 0; i < len; i++) {
            const related = isRelatedTo(sourceTypes[i], target, reportErrors && i === len - 1, undefined, intersectionState);
            if (related) return related;
          }
          return qt.Ternary.False;
        }
        function eachTypeRelatedToType(source: qt.UnionOrIntersectionType, target: Type, reportErrors: boolean, intersectionState: IntersectionState): qt.Ternary {
          let result = qt.Ternary.True;
          const sourceTypes = source.types;
          for (let i = 0; i < sourceTypes.length; i++) {
            const sourceType = sourceTypes[i];
            if (target.flags & TypeFlags.Union && (target as qt.UnionType).types.length === sourceTypes.length) {
              const related = isRelatedTo(sourceType, (target as qt.UnionType).types[i], false, undefined, intersectionState);
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
        function typeArgsRelatedTo(
          sources: readonly Type[] = empty,
          targets: readonly Type[] = empty,
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
        function recursiveTypeRelatedTo(source: Type, target: Type, reportErrors: boolean, intersectionState: IntersectionState): qt.Ternary {
          if (overflow) return qt.Ternary.False;
          const id = getRelationKey(source, target, intersectionState | (inPropertyCheck ? IntersectionState.InPropertyCheck : 0), relation);
          const entry = relation.get(id);
          if (entry !== undefined) {
            if (reportErrors && entry & qt.RelationComparisonResult.Failed && !(entry & qt.RelationComparisonResult.Reported)) {
            } else {
              if (outofbandVarianceMarkerHandler) {
                const saved = entry & qt.RelationComparisonResult.ReportsMask;
                if (saved & qt.RelationComparisonResult.ReportsUnmeasurable) instantiateType(source, makeFunctionTypeMapper(reportUnmeasurableMarkers));
                if (saved & qt.RelationComparisonResult.ReportsUnreliable) instantiateType(source, makeFunctionTypeMapper(reportUnreliableMarkers));
              }
              return entry & qt.RelationComparisonResult.Succeeded ? qt.Ternary.True : qt.Ternary.False;
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
          if (!(expandingFlags & ExpandingFlags.Source) && qf.type.is.deeplyNested(source, sourceStack, depth)) expandingFlags |= ExpandingFlags.Source;
          if (!(expandingFlags & ExpandingFlags.Target) && qf.type.is.deeplyNested(target, targetStack, depth)) expandingFlags |= ExpandingFlags.Target;
          let originalHandler: typeof outofbandVarianceMarkerHandler;
          let propagatingVarianceFlags: qt.RelationComparisonResult = 0;
          if (outofbandVarianceMarkerHandler) {
            originalHandler = outofbandVarianceMarkerHandler;
            outofbandVarianceMarkerHandler = (onlyUnreliable) => {
              propagatingVarianceFlags |= onlyUnreliable ? qt.RelationComparisonResult.ReportsUnreliable : qt.RelationComparisonResult.ReportsUnmeasurable;
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
                relation.set(maybeKeys[i], qt.RelationComparisonResult.Succeeded | propagatingVarianceFlags);
              }
              maybeCount = maybeStart;
            }
          } else {
            relation.set(id, (reportErrors ? qt.RelationComparisonResult.Reported : 0) | qt.RelationComparisonResult.Failed | propagatingVarianceFlags);
            maybeCount = maybeStart;
          }
          return result;
        }
        function structuredTypeRelatedTo(source: Type, target: Type, reportErrors: boolean, intersectionState: IntersectionState): qt.Ternary {
          if (intersectionState & IntersectionState.PropertyCheck) return propertiesRelatedTo(source, target, reportErrors, undefined, IntersectionState.None);
          const flags = source.flags & target.flags;
          if (relation === identityRelation && !(flags & TypeFlags.Object)) {
            if (flags & TypeFlags.Index) return isRelatedTo((<qt.IndexType>source).type, (<qt.IndexType>target).type, false);
            let result = qt.Ternary.False;
            if (flags & TypeFlags.IndexedAccess) {
              if ((result = isRelatedTo((<qt.IndexedAccessType>source).objectType, (<qt.IndexedAccessType>target).objectType, false))) {
                if ((result &= isRelatedTo((<qt.IndexedAccessType>source).indexType, (<qt.IndexedAccessType>target).indexType, false))) return result;
              }
            }
            if (flags & TypeFlags.Conditional) {
              if ((<qt.ConditionalType>source).root.isDistributive === (<qt.ConditionalType>target).root.isDistributive) {
                if ((result = isRelatedTo((<qt.ConditionalType>source).checkType, (<qt.ConditionalType>target).checkType, false))) {
                  if ((result &= isRelatedTo((<qt.ConditionalType>source).extendsType, (<qt.ConditionalType>target).extendsType, false))) {
                    if ((result &= isRelatedTo(getTrueTypeFromConditionalType(<qt.ConditionalType>source), getTrueTypeFromConditionalType(<qt.ConditionalType>target), false))) {
                      if ((result &= isRelatedTo(getFalseTypeFromConditionalType(<qt.ConditionalType>source), getFalseTypeFromConditionalType(<qt.ConditionalType>target), false))) return result;
                    }
                  }
                }
              }
            }
            if (flags & TypeFlags.Substitution) return isRelatedTo((<qt.SubstitutionType>source).substitute, (<qt.SubstitutionType>target).substitute, false);
            return qt.Ternary.False;
          }
          let result: qt.Ternary;
          let originalErrorInfo: qd.MessageChain | undefined;
          let varianceCheckFailed = false;
          const saveErrorInfo = captureErrorCalculationState();
          if (
            source.flags & (TypeFlags.Object | TypeFlags.Conditional) &&
            source.aliasSymbol &&
            source.aliasTypeArgs &&
            source.aliasSymbol === target.aliasSymbol &&
            !(source.aliasTypeArgsContainsMarker || target.aliasTypeArgsContainsMarker)
          ) {
            const variances = getAliasVariances(source.aliasSymbol);
            if (variances === empty) return qt.Ternary.Maybe;
            const varianceResult = relateVariances(source.aliasTypeArgs, target.aliasTypeArgs, variances, intersectionState);
            if (varianceResult !== undefined) return varianceResult;
          }
          if (target.flags & TypeFlags.TypeParam) {
            if (getObjectFlags(source) & ObjectFlags.Mapped && isRelatedTo(qf.get.indexType(target), getConstraintTypeFromMappedType(<qt.MappedType>source))) {
              if (!(getMappedTypeModifiers(<qt.MappedType>source) & MappedTypeModifiers.IncludeOptional)) {
                const templateType = getTemplateTypeFromMappedType(<qt.MappedType>source);
                const indexedAccessType = qf.get.indexedAccessType(target, getTypeParamFromMappedType(<qt.MappedType>source));
                if ((result = isRelatedTo(templateType, indexedAccessType, reportErrors))) return result;
              }
            }
          } else if (target.flags & TypeFlags.Index) {
            if (source.flags & TypeFlags.Index) {
              if ((result = isRelatedTo((<qt.IndexType>target).type, (<qt.IndexType>source).type, false))) return result;
            }
            const constraint = getSimplifiedTypeOrConstraint((<qt.IndexType>target).type);
            if (constraint) {
              if (isRelatedTo(source, qf.get.indexType(constraint, (target as qt.IndexType).stringsOnly), reportErrors) === qt.Ternary.True) return qt.Ternary.True;
            }
          } else if (target.flags & TypeFlags.IndexedAccess) {
            if (relation !== identityRelation) {
              const objectType = (<qt.IndexedAccessType>target).objectType;
              const indexType = (<qt.IndexedAccessType>target).indexType;
              const baseObjectType = qf.get.baseConstraintOfType(objectType) || objectType;
              const baseIndexType = qf.get.baseConstraintOfType(indexType) || indexType;
              if (!qf.type.is.genericObject(baseObjectType) && !qf.type.is.genericIndex(baseIndexType)) {
                const accessFlags = AccessFlags.Writing | (baseObjectType !== objectType ? AccessFlags.NoIndexSignatures : 0);
                const constraint = qf.get.indexedAccessTypeOrUndefined(baseObjectType, baseIndexType, undefined, accessFlags);
                if (constraint && (result = isRelatedTo(source, constraint, reportErrors))) return result;
              }
            }
          } else if (qf.type.is.genericMapped(target)) {
            const template = getTemplateTypeFromMappedType(target);
            const modifiers = getMappedTypeModifiers(target);
            if (!(modifiers & MappedTypeModifiers.ExcludeOptional)) {
              if (
                template.flags & TypeFlags.IndexedAccess &&
                (<qt.IndexedAccessType>template).objectType === source &&
                (<qt.IndexedAccessType>template).indexType === getTypeParamFromMappedType(target)
              )
                return qt.Ternary.True;
              if (!qf.type.is.genericMapped(source)) {
                const targetConstraint = getConstraintTypeFromMappedType(target);
                const sourceKeys = qf.get.indexType(source, true);
                const includeOptional = modifiers & MappedTypeModifiers.IncludeOptional;
                const filteredByApplicability = includeOptional ? intersectTypes(targetConstraint, sourceKeys) : undefined;
                if (includeOptional ? !(filteredByApplicability!.flags & TypeFlags.Never) : isRelatedTo(targetConstraint, sourceKeys)) {
                  const typeParam = getTypeParamFromMappedType(target);
                  const indexingType = filteredByApplicability ? qf.get.intersectionType([filteredByApplicability, typeParam]) : typeParam;
                  const indexedAccessType = qf.get.indexedAccessType(source, indexingType);
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
              if ((result = isRelatedTo((<qt.IndexedAccessType>source).objectType, (<qt.IndexedAccessType>target).objectType, reportErrors)))
                result &= isRelatedTo((<qt.IndexedAccessType>source).indexType, (<qt.IndexedAccessType>target).indexType, reportErrors);
              if (result) {
                resetErrorInfo(saveErrorInfo);
                return result;
              }
            } else {
              const constraint = getConstraintOfType(<TypeVariable>source);
              if (!constraint || (source.flags & TypeFlags.TypeParam && constraint.flags & TypeFlags.Any)) {
                if ((result = isRelatedTo(emptyObjectType, extractTypesOfKind(target, ~TypeFlags.NonPrimitive)))) {
                  resetErrorInfo(saveErrorInfo);
                  return result;
                }
              } else if ((result = isRelatedTo(constraint, target, false, undefined, intersectionState))) {
                resetErrorInfo(saveErrorInfo);
                return result;
              } else if ((result = isRelatedTo(qf.get.typeWithThisArg(constraint, source), target, reportErrors, undefined, intersectionState))) {
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
              const sourceParams = (source as qt.ConditionalType).root.inferTypeParams;
              let sourceExtends = (<qt.ConditionalType>source).extendsType;
              let mapper: qt.TypeMapper | undefined;
              if (sourceParams) {
                const ctx = createInferenceContext(sourceParams, undefined, InferenceFlags.None, isRelatedTo);
                inferTypes(ctx.inferences, (<qt.ConditionalType>target).extendsType, sourceExtends, qt.InferencePriority.NoConstraints | qt.InferencePriority.AlwaysStrict);
                sourceExtends = instantiateType(sourceExtends, ctx.mapper);
                mapper = ctx.mapper;
              }
              if (
                qf.type.is.identicalTo(sourceExtends, (<qt.ConditionalType>target).extendsType) &&
                (isRelatedTo((<qt.ConditionalType>source).checkType, (<qt.ConditionalType>target).checkType) ||
                  isRelatedTo((<qt.ConditionalType>target).checkType, (<qt.ConditionalType>source).checkType))
              ) {
                if (
                  (result = isRelatedTo(instantiateType(getTrueTypeFromConditionalType(<qt.ConditionalType>source), mapper), getTrueTypeFromConditionalType(<qt.ConditionalType>target), reportErrors))
                )
                  result &= isRelatedTo(getFalseTypeFromConditionalType(<qt.ConditionalType>source), getFalseTypeFromConditionalType(<qt.ConditionalType>target), reportErrors);
                if (result) {
                  resetErrorInfo(saveErrorInfo);
                  return result;
                }
              }
            } else {
              const distributiveConstraint = getConstraintOfDistributiveConditionalType(<qt.ConditionalType>source);
              if (distributiveConstraint) {
                if ((result = isRelatedTo(distributiveConstraint, target, reportErrors))) {
                  resetErrorInfo(saveErrorInfo);
                  return result;
                }
              }
            }
            const defaultConstraint = getDefaultConstraintOfConditionalType(<qt.ConditionalType>source);
            if (defaultConstraint) {
              if ((result = isRelatedTo(defaultConstraint, target, reportErrors))) {
                resetErrorInfo(saveErrorInfo);
                return result;
              }
            }
          } else {
            if (relation !== subtypeRelation && relation !== strictSubtypeRelation && qf.type.is.partialMapped(target) && qf.type.is.emptyObject(source)) return qt.Ternary.True;
            if (qf.type.is.genericMapped(target)) {
              if (qf.type.is.genericMapped(source)) {
                if ((result = mappedTypeRelatedTo(source, target, reportErrors))) {
                  resetErrorInfo(saveErrorInfo);
                  return result;
                }
              }
              return qt.Ternary.False;
            }
            const sourceIsPrimitive = !!(source.flags & TypeFlags.Primitive);
            if (relation !== identityRelation) source = getApparentType(source);
            else if (qf.type.is.genericMapped(source)) return qt.Ternary.False;
            if (
              getObjectFlags(source) & ObjectFlags.Reference &&
              getObjectFlags(target) & ObjectFlags.Reference &&
              (<TypeReference>source).target === (<TypeReference>target).target &&
              !(getObjectFlags(source) & ObjectFlags.MarkerType || getObjectFlags(target) & ObjectFlags.MarkerType)
            ) {
              const variances = getVariances((<TypeReference>source).target);
              if (variances === empty) return qt.Ternary.Maybe;
              const varianceResult = relateVariances(getTypeArgs(<TypeReference>source), getTypeArgs(<TypeReference>target), variances, intersectionState);
              if (varianceResult !== undefined) return varianceResult;
            } else if (qf.type.is.readonlyArray(target) ? qf.type.is.array(source) || qf.type.is.tuple(source) : qf.type.is.array(target) && qf.type.is.tuple(source) && !source.target.readonly) {
              if (relation !== identityRelation)
                return isRelatedTo(qf.get.indexTypeOfType(source, IndexKind.Number) || anyType, qf.get.indexTypeOfType(target, IndexKind.Number) || anyType, reportErrors);
              return qt.Ternary.False;
            } else if (
              (relation === subtypeRelation || relation === strictSubtypeRelation) &&
              qf.type.is.emptyObject(target) &&
              getObjectFlags(target) & ObjectFlags.FreshLiteral &&
              !qf.type.is.emptyObject(source)
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
                const result = typeRelatedToDiscriminatedType(source, objectOnlyTarget as qt.UnionType);
                if (result) return result;
              }
            }
          }
          return qt.Ternary.False;
          function relateVariances(sourceTypeArgs: readonly Type[] | undefined, targetTypeArgs: readonly Type[] | undefined, variances: VarianceFlags[], intersectionState: IntersectionState) {
            if ((result = typeArgsRelatedTo(sourceTypeArgs, targetTypeArgs, variances, reportErrors, intersectionState))) return result;
            if (qu.some(variances, (v) => !!(v & VarianceFlags.AllowsStructuralFallback))) {
              originalErrorInfo = undefined;
              resetErrorInfo(saveErrorInfo);
              return;
            }
            const allowStructuralFallback = targetTypeArgs && hasCovariantVoidArg(targetTypeArgs, variances);
            varianceCheckFailed = !allowStructuralFallback;
            if (variances !== empty && !allowStructuralFallback) {
              if (varianceCheckFailed && !(reportErrors && some(variances, (v) => (v & VarianceFlags.VarianceMask) === VarianceFlags.Invariant))) return qt.Ternary.False;
              originalErrorInfo = errorInfo;
              resetErrorInfo(saveErrorInfo);
            }
          }
        }
        function reportUnmeasurableMarkers(p: TypeParam) {
          if (outofbandVarianceMarkerHandler && (p === markerSuperType || p === markerSubType || p === markerOtherType)) outofbandVarianceMarkerHandler(false);
          return p;
        }
        function reportUnreliableMarkers(p: TypeParam) {
          if (outofbandVarianceMarkerHandler && (p === markerSuperType || p === markerSubType || p === markerOtherType)) outofbandVarianceMarkerHandler(true);
          return p;
        }
        function mappedTypeRelatedTo(source: qt.MappedType, target: qt.MappedType, reportErrors: boolean): qt.Ternary {
          const modifiersRelated =
            relation === comparableRelation ||
            (relation === identityRelation ? getMappedTypeModifiers(source) === getMappedTypeModifiers(target) : getCombinedMappedTypeOptionality(source) <= getCombinedMappedTypeOptionality(target));
          if (modifiersRelated) {
            let result: qt.Ternary;
            const targetConstraint = getConstraintTypeFromMappedType(target);
            const sourceConstraint = instantiateType(
              getConstraintTypeFromMappedType(source),
              makeFunctionTypeMapper(getCombinedMappedTypeOptionality(source) < 0 ? reportUnmeasurableMarkers : reportUnreliableMarkers)
            );
            if ((result = isRelatedTo(targetConstraint, sourceConstraint, reportErrors))) {
              const mapper = createTypeMapper([getTypeParamFromMappedType(source)], [getTypeParamFromMappedType(target)]);
              return result & isRelatedTo(instantiateType(getTemplateTypeFromMappedType(source), mapper), getTemplateTypeFromMappedType(target), reportErrors);
            }
          }
          return qt.Ternary.False;
        }
        function typeRelatedToDiscriminatedType(source: Type, target: qt.UnionType) {
          const sourceProperties = qf.get.propertiesOfType(source);
          const sourcePropertiesFiltered = findDiscriminantProperties(sourceProperties, target);
          if (!sourcePropertiesFiltered) return qt.Ternary.False;
          let numCombinations = 1;
          for (const sourceProperty of sourcePropertiesFiltered) {
            numCombinations *= countTypes(sourceProperty.typeOfSymbol());
            if (numCombinations > 25) return qt.Ternary.False;
          }
          const sourceDiscriminantTypes: Type[][] = new Array<Type[]>(sourcePropertiesFiltered.length);
          const excludedProperties = qu.createEscapedMap<true>();
          for (let i = 0; i < sourcePropertiesFiltered.length; i++) {
            const sourceProperty = sourcePropertiesFiltered[i];
            const sourcePropertyType = sourceProperty.typeOfSymbol();
            sourceDiscriminantTypes[i] = sourcePropertyType.flags & TypeFlags.Union ? (sourcePropertyType as qt.UnionType).types : [sourcePropertyType];
            excludedProperties.set(sourceProperty.escName, true);
          }
          const discriminantCombinations = cartesianProduct(sourceDiscriminantTypes);
          const matchingTypes: Type[] = [];
          for (const combination of discriminantCombinations) {
            let hasMatch = false;
            outer: for (const type of target.types) {
              for (let i = 0; i < sourcePropertiesFiltered.length; i++) {
                const sourceProperty = sourcePropertiesFiltered[i];
                const targetProperty = qf.get.propertyOfType(type, sourceProperty.escName);
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
              qu.pushIfUnique(matchingTypes, type, equateValues);
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
        function excludeProperties(properties: qt.Symbol[], excludedProperties: EscapedMap<true> | undefined) {
          if (!excludedProperties || properties.length === 0) return properties;
          let result: qt.Symbol[] | undefined;
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
          sourceProp: qt.Symbol,
          targetProp: qt.Symbol,
          getTypeOfSourceProperty: (sym: qt.Symbol) => Type,
          reportErrors: boolean,
          intersectionState: IntersectionState
        ): qt.Ternary {
          const targetIsOptional = strictNullChecks && !!(targetProp.checkFlags() & qt.CheckFlags.Partial);
          const source = getTypeOfSourceProperty(sourceProp);
          if (targetProp.checkFlags() & qt.CheckFlags.DeferredType && !targetProp.links.type) {
            const links = targetProp.links;
            qf.assert.defined(links.deferralParent);
            qf.assert.defined(links.deferralConstituents);
            const unionParent = !!(links.deferralParent.flags & TypeFlags.Union);
            let result = unionParent ? qt.Ternary.False : qt.Ternary.True;
            const targetTypes = links.deferralConstituents;
            for (const targetType of targetTypes) {
              const related = isRelatedTo(source, targetType, false, undefined, unionParent ? 0 : IntersectionState.Target);
              if (!unionParent) {
                if (!related) return isRelatedTo(source, addOptionality(targetProp.typeOfSymbol(), targetIsOptional), reportErrors);
                result &= related;
              } else {
                if (related) return related;
              }
            }
            if (unionParent && !result && targetIsOptional) result = isRelatedTo(source, undefinedType);
            if (unionParent && !result && reportErrors) return isRelatedTo(source, addOptionality(targetProp.typeOfSymbol(), targetIsOptional), reportErrors);
            return result;
          }
          return isRelatedTo(source, addOptionality(targetProp.typeOfSymbol(), targetIsOptional), reportErrors, undefined, intersectionState);
        }
        function propertyRelatedTo(
          source: Type,
          target: Type,
          sourceProp: qt.Symbol,
          targetProp: qt.Symbol,
          getTypeOfSourceProperty: (sym: qt.Symbol) => Type,
          reportErrors: boolean,
          intersectionState: IntersectionState,
          skipOptional: boolean
        ): qt.Ternary {
          const sourcePropFlags = sourceProp.declarationModifierFlags();
          const targetPropFlags = targetProp.declarationModifierFlags();
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
        function reportUnmatchedProperty(source: Type, target: Type, unmatchedProperty: qt.Symbol, requireOptionalProperties: boolean) {
          let shouldSkipElaboration = false;
          if (
            unmatchedProperty.valueDeclaration &&
            qf.is.namedDeclaration(unmatchedProperty.valueDeclaration) &&
            unmatchedProperty.valueDeclaration.name.kind === Syntax.PrivateIdentifier &&
            source.symbol &&
            source.symbol.flags & qt.SymbolFlags.Class
          ) {
            const privateIdentifierDescription = unmatchedProperty.valueDeclaration.name.escapedText;
            const symbolTableKey = source.symbol.nameForPrivateIdentifier(privateIdentifierDescription);
            if (symbolTableKey && qf.get.propertyOfType(source, symbolTableKey)) {
              const sourceName = qf.decl.name(source.symbol.valueDeclaration);
              const targetName = qf.decl.name(target.symbol.valueDeclaration);
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
            !m ||
            (m.code !== qd.msgs.Class_0_incorrectly_implements_interface_1.code &&
              m.code !== qd.msgs.Class_0_incorrectly_implements_class_1_Did_you_mean_to_extend_1_and_inherit_its_members_as_a_subclass.code)
          ) {
            shouldSkipElaboration = true;
          }
          if (props.length === 1) {
            const propName = unmatchedProperty.symbolToString();
            reportError(qd.msgs.Property_0_is_missing_in_type_1_but_required_in_type_2, propName, ...getTypeNamesForErrorDisplay(source, target));
            if (length(unmatchedProperty.declarations)) associateRelatedInfo(qf.create.diagForNode(unmatchedProperty.declarations[0], qd.msgs._0_is_declared_here, propName));
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
        function propertiesRelatedTo(source: Type, target: Type, reportErrors: boolean, excludedProperties: EscapedMap<true> | undefined, intersectionState: IntersectionState): qt.Ternary {
          if (relation === identityRelation) return propertiesIdenticalTo(source, target, excludedProperties);
          const requireOptionalProperties =
            (relation === subtypeRelation || relation === strictSubtypeRelation) && !qf.type.is.objectLiteral(source) && !qf.type.is.emptyArrayLiteral(source) && !qf.type.is.tuple(source);
          const unmatchedProperty = getUnmatchedProperty(source, target, requireOptionalProperties, false);
          if (unmatchedProperty) {
            if (reportErrors) reportUnmatchedProperty(source, target, unmatchedProperty, requireOptionalProperties);
            return qt.Ternary.False;
          }
          if (qf.type.is.objectLiteral(target)) {
            for (const sourceProp of excludeProperties(qf.get.propertiesOfType(source), excludedProperties)) {
              if (!getPropertyOfObjectType(target, sourceProp.escName)) {
                const sourceType = sourceProp.typeOfSymbol();
                if (!(sourceType === undefinedType || sourceType === undefinedWideningType || sourceType === optionalType)) {
                  if (reportErrors) reportError(qd.msgs.Property_0_does_not_exist_on_type_1, sourceProp.symbolToString(), typeToString(target));
                  return qt.Ternary.False;
                }
              }
            }
          }
          let result = qt.Ternary.True;
          if (qf.type.is.tuple(target)) {
            const targetRestType = getRestTypeOfTupleType(target);
            if (targetRestType) {
              if (!qf.type.is.tuple(source)) return qt.Ternary.False;
              const sourceRestType = getRestTypeOfTupleType(source);
              if (sourceRestType && !isRelatedTo(sourceRestType, targetRestType, reportErrors)) {
                if (reportErrors) reportError(qd.msgs.Rest_signatures_are_incompatible);
                return qt.Ternary.False;
              }
              const targetCount = getTypeReferenceArity(target) - 1;
              const sourceCount = getTypeReferenceArity(source) - (sourceRestType ? 1 : 0);
              const sourceTypeArgs = getTypeArgs(<TypeReference>source);
              for (let i = targetCount; i < sourceCount; i++) {
                const related = isRelatedTo(sourceTypeArgs[i], targetRestType, reportErrors);
                if (!related) {
                  if (reportErrors) reportError(qd.msgs.Property_0_is_incompatible_with_rest_elem_type, '' + i);
                  return qt.Ternary.False;
                }
                result &= related;
              }
            }
          }
          const properties = qf.get.propertiesOfType(target);
          const numericNamesOnly = qf.type.is.tuple(source) && qf.type.is.tuple(target);
          for (const targetProp of excludeProperties(properties, excludedProperties)) {
            const name = targetProp.escName;
            if (!(targetProp.flags & qt.SymbolFlags.Prototype) && (!numericNamesOnly || qt.NumericLiteral.name(name) || name === 'length')) {
              const sourceProp = qf.get.propertyOfType(source, name);
              if (sourceProp && sourceProp !== targetProp) {
                const related = propertyRelatedTo(source, target, sourceProp, targetProp, qf.get.typeOfSymbol, reportErrors, intersectionState, relation === comparableRelation);
                if (!related) return qt.Ternary.False;
                result &= related;
              }
            }
          }
          return result;
        }
        function propertiesIdenticalTo(source: Type, target: Type, excludedProperties: EscapedMap<true> | undefined): qt.Ternary {
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
        function signaturesRelatedTo(source: Type, target: Type, kind: SignatureKind, reportErrors: boolean): qt.Ternary {
          if (relation === identityRelation) return signaturesIdenticalTo(source, target, kind);
          if (target === anyFunctionType || source === anyFunctionType) return qt.Ternary.True;
          const sourceIsJSConstructor = source.symbol && qf.is.jsConstructor(source.symbol.valueDeclaration);
          const targetIsJSConstructor = target.symbol && qf.is.jsConstructor(target.symbol.valueDeclaration);
          const sourceSignatures = getSignaturesOfType(source, sourceIsJSConstructor && kind === SignatureKind.Construct ? SignatureKind.Call : kind);
          const targetSignatures = getSignaturesOfType(target, targetIsJSConstructor && kind === SignatureKind.Construct ? SignatureKind.Call : kind);
          if (kind === SignatureKind.Construct && sourceSignatures.length && targetSignatures.length) {
            if (qf.type.is.abstractConstructor(source) && !qf.type.is.abstractConstructor(target)) {
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
            const eraseGenerics = relation === comparableRelation || !!compilerOpts.noStrictGenericChecks;
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
        function reportIncompatibleCallSignatureReturn(siga: qt.Signature, sigb: qt.Signature) {
          if (siga.params.length === 0 && sigb.params.length === 0) {
            return (source: Type, target: Type) => reportIncompatibleError(qd.msgs.Call_signatures_with_no_args_have_incompatible_return_types_0_and_1, typeToString(source), typeToString(target));
          }
          return (source: Type, target: Type) => reportIncompatibleError(qd.msgs.Call_signature_return_types_0_and_1_are_incompatible, typeToString(source), typeToString(target));
        }
        function reportIncompatibleConstructSignatureReturn(siga: qt.Signature, sigb: qt.Signature) {
          if (siga.params.length === 0 && sigb.params.length === 0) {
            return (source: Type, target: Type) =>
              reportIncompatibleError(qd.msgs.Construct_signatures_with_no_args_have_incompatible_return_types_0_and_1, typeToString(source), typeToString(target));
          }
          return (source: Type, target: Type) => reportIncompatibleError(qd.msgs.Construct_signature_return_types_0_and_1_are_incompatible, typeToString(source), typeToString(target));
        }
        function signatureRelatedTo(source: qt.Signature, target: qt.Signature, erase: boolean, reportErrors: boolean, incompatibleReporter: (source: Type, target: Type) => void): qt.Ternary {
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
        function signaturesIdenticalTo(source: Type, target: Type, kind: SignatureKind): qt.Ternary {
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
        function eachPropertyRelatedTo(source: Type, target: Type, kind: IndexKind, reportErrors: boolean): qt.Ternary {
          let result = qt.Ternary.True;
          const props = source.flags & TypeFlags.Intersection ? getPropertiesOfqt.UnionOrIntersectionType(<qt.IntersectionType>source) : getPropertiesOfObjectType(source);
          for (const prop of props) {
            if (qf.type.is.ignoredJsxProperty(source, prop)) continue;
            const nameType = prop.links.nameType;
            if (nameType && nameType.flags & TypeFlags.UniqueESSymbol) continue;
            if (kind === IndexKind.String || qt.NumericLiteral.name(prop.escName)) {
              const related = isRelatedTo(prop.typeOfSymbol(), target, reportErrors);
              if (!related) {
                if (reportErrors) reportError(qd.msgs.Property_0_is_incompatible_with_index_signature, prop.symbolToString());
                return qt.Ternary.False;
              }
              result &= related;
            }
          }
          return result;
        }
        function indexTypeRelatedTo(sourceType: Type, targetType: Type, reportErrors: boolean) {
          const related = isRelatedTo(sourceType, targetType, reportErrors);
          if (!related && reportErrors) reportError(qd.msgs.Index_signatures_are_incompatible);
          return related;
        }
        function indexTypesRelatedTo(source: Type, target: Type, kind: IndexKind, sourceIsPrimitive: boolean, reportErrors: boolean, intersectionState: IntersectionState): qt.Ternary {
          if (relation === identityRelation) return indexTypesIdenticalTo(source, target, kind);
          const targetType = qf.get.indexTypeOfType(target, kind);
          if (!targetType || (targetType.flags & TypeFlags.Any && !sourceIsPrimitive)) return qt.Ternary.True;
          if (qf.type.is.genericMapped(source))
            return qf.get.indexTypeOfType(target, IndexKind.String) ? isRelatedTo(getTemplateTypeFromMappedType(source), targetType, reportErrors) : qt.Ternary.False;
          const indexType = qf.get.indexTypeOfType(source, kind) || (kind === IndexKind.Number && qf.get.indexTypeOfType(source, IndexKind.String));
          if (indexType) return indexTypeRelatedTo(indexType, targetType, reportErrors);
          if (!(intersectionState & IntersectionState.Source) && qf.type.is.withInferableIndex(source)) {
            let related = eachPropertyRelatedTo(source, targetType, kind, reportErrors);
            if (related && kind === IndexKind.String) {
              const numberIndexType = qf.get.indexTypeOfType(source, IndexKind.Number);
              if (numberIndexType) related &= indexTypeRelatedTo(numberIndexType, targetType, reportErrors);
            }
            return related;
          }
          if (reportErrors) reportError(qd.msgs.Index_signature_is_missing_in_type_0, typeToString(source));
          return qt.Ternary.False;
        }
        function indexTypesIdenticalTo(t: Type, to: Type, k: IndexKind): qt.Ternary {
          const targetInfo = qf.get.indexInfoOfType(to, k);
          const sourceInfo = qf.get.indexInfoOfType(t, k);
          if (!sourceInfo && !targetInfo) return qt.Ternary.True;
          if (sourceInfo && targetInfo && sourceInfo.isReadonly === targetInfo.isReadonly) return isRelatedTo(sourceInfo.type, targetInfo.type);
          return qt.Ternary.False;
        }
        function constructorVisibilitiesAreCompatible(sourceSignature: qt.Signature, targetSignature: qt.Signature, reportErrors: boolean) {
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
      typeAssignableToAndOptionallyElaborate(
        source: Type,
        target: Type,
        errorNode: Node | undefined,
        expr: qt.Expression | undefined,
        headMessage?: qd.Message,
        containingMessageChain?: () => qd.MessageChain | undefined
      ): boolean {
        return this.typeRelatedToAndOptionallyElaborate(source, target, assignableRelation, errorNode, expr, headMessage, containingMessageChain, undefined);
      }
      typeRelatedToAndOptionallyElaborate(
        source: Type,
        target: Type,
        relation: qu.QMap<qt.RelationComparisonResult>,
        errorNode: Node | undefined,
        expr: qt.Expression | undefined,
        headMessage: qd.Message | undefined,
        containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
        errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } | undefined
      ): boolean {
        if (qf.type.is.relatedTo(source, target, relation)) return true;
        if (!errorNode || !elaborateError(expr, source, target, relation, headMessage, containingMessageChain, errorOutputContainer))
          return this.typeRelatedTo(source, target, relation, errorNode, headMessage, containingMessageChain, errorOutputContainer);
        return false;
      }
      spreadPropOverrides(type: Type, props: qt.SymbolTable, spread: qt.SpreadAssignment | qt.JsxSpreadAttribute) {
        for (const right of qf.get.propertiesOfType(type)) {
          const left = props.get(right.escName);
          const rightType = right.typeOfSymbol();
          if (left && !maybeTypeOfKind(rightType, TypeFlags.Nullable) && !(maybeTypeOfKind(rightType, TypeFlags.AnyOrUnknown) && right.flags & qt.SymbolFlags.Optional)) {
            const diagnostic = error(left.valueDeclaration, qd.msgs._0_is_specified_more_than_once_so_this_usage_will_be_overwritten, qy.get.unescUnderscores(left.escName));
            addRelatedInfo(diagnostic, qf.create.diagForNode(spread, qd.msgs.This_spread_always_overwrites_this_property));
          }
        }
      }
      nonNullTypeWithReporter(type: Type, n: Node, reportError: (n: Node, kind: TypeFlags) => void): Type {
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
      nonNullType(type: Type, n: Node) {
        return this.nonNullTypeWithReporter(type, n, reportObjectPossiblyNullOrUndefinedError);
      }
      nonNullNonVoidType(type: Type, n: Node): Type {
        const nonNullType = this.nonNullType(type, n);
        if (nonNullType !== errorType && nonNullType.flags & TypeFlags.Void) error(n, qd.msgs.Object_is_possibly_undefined);
        return nonNullType;
      }
      privateIdentifierPropertyAccess(leftType: Type, right: qt.PrivateIdentifier, lexicallyScopedIdentifier: qt.Symbol | undefined): boolean {
        let propertyOnType: qt.Symbol | undefined;
        const properties = qf.get.propertiesOfType(leftType);
        if (properties) {
          forEach(properties, (symbol: qt.Symbol) => {
            const decl = symbol.valueDeclaration;
            if (decl && qf.is.namedDeclaration(decl) && decl.name.kind === Syntax.PrivateIdentifier && decl.name.escapedText === right.escapedText) {
              propertyOnType = symbol;
              return true;
            }
          });
        }
        const diagName = diagnosticName(right);
        if (propertyOnType) {
          const typeValueDecl = propertyOnType.valueDeclaration;
          const typeClass = qf.get.containingClass(typeValueDecl);
          qf.assert.true(!!typeClass);
          if (lexicallyScopedIdentifier) {
            const lexicalValueDecl = lexicallyScopedIdentifier.valueDeclaration;
            const lexicalClass = qf.get.containingClass(lexicalValueDecl);
            qf.assert.true(!!lexicalClass);
            if (qc.findAncestor(lexicalClass, (x) => typeClass === x)) {
              const diagnostic = error(
                right,
                qd.msgs.The_property_0_cannot_be_accessed_on_type_1_within_this_class_because_it_is_shadowed_by_another_private_identifier_with_the_same_spelling,
                diagName,
                typeToString(leftType)
              );
              addRelatedInfo(
                diagnostic,
                qf.create.diagForNode(lexicalValueDecl, qd.msgs.The_shadowing_declaration_of_0_is_defined_here, diagName),
                qf.create.diagForNode(typeValueDecl, qd.msgs.The_declaration_of_0_that_you_probably_intended_to_use_is_defined_here, diagName)
              );
              return true;
            }
          }
          error(right, qd.msgs.Property_0_is_not_accessible_outside_class_1_because_it_has_a_private_identifier, diagName, diagnosticName(typeClass.name || anon));
          return true;
        }
        return false;
      }
      indexedAccessIndexType(type: Type, accessNode: qt.IndexedAccessTyping | qt.ElemAccessExpression) {
        if (!(type.flags & TypeFlags.IndexedAccess)) return type;
        const objectType = (<qt.IndexedAccessType>type).objectType;
        const indexType = (<qt.IndexedAccessType>type).indexType;
        if (qf.type.is.assignableTo(indexType, qf.get.indexType(objectType, false))) {
          if (
            accessNode.kind === Syntax.ElemAccessExpression &&
            qf.is.assignmentTarget(accessNode) &&
            getObjectFlags(objectType) & ObjectFlags.Mapped &&
            getMappedTypeModifiers(<qt.MappedType>objectType) & MappedTypeModifiers.IncludeReadonly
          ) {
            error(accessNode, qd.msgs.Index_signature_in_type_0_only_permits_reading, typeToString(objectType));
          }
          return type;
        }
        const apparentObjectType = getApparentType(objectType);
        if (qf.get.indexInfoOfType(apparentObjectType, IndexKind.Number) && qf.type.is.assignableToKind(indexType, TypeFlags.NumberLike)) return type;
        if (qf.type.is.genericObject(objectType)) {
          const propertyName = getPropertyNameFromIndex(indexType, accessNode);
          if (propertyName) {
            const propertySymbol = forEachType(apparentObjectType, (t) => qf.get.propertyOfType(t, propertyName));
            if (propertySymbol && propertySymbol.declarationModifierFlags() & ModifierFlags.NonPublicAccessibilityModifier) {
              error(accessNode, qd.msgs.Private_or_protected_member_0_cannot_be_accessed_on_a_type_param, qy.get.unescUnderscores(propertyName));
              return errorType;
            }
          }
        }
        error(accessNode, qd.msgs.Type_0_cannot_be_used_to_index_type_1, typeToString(indexType), typeToString(objectType));
        return errorType;
      }
      awaitedType(type: Type, errorNode: Node, diagnosticMessage: qd.Message, arg0?: string | number): Type {
        const awaitedType = getAwaitedType(type, errorNode, diagnosticMessage, arg0);
        return awaitedType || errorType;
      }
      truthinessOfType(type: Type, n: Node) {
        if (type.flags & TypeFlags.Void) error(n, qd.msgs.An_expression_of_type_void_cannot_be_tested_for_truthiness);
        return type;
      }
      indexConstraints(type: Type) {
        const declaredNumberIndexer = getIndexDeclarationOfSymbol(type.symbol, IndexKind.Number);
        const declaredStringIndexer = getIndexDeclarationOfSymbol(type.symbol, IndexKind.String);
        const stringIndexType = qf.get.indexTypeOfType(type, IndexKind.String);
        const numberIndexType = qf.get.indexTypeOfType(type, IndexKind.Number);
        if (stringIndexType || numberIndexType) {
          forEach(getPropertiesOfObjectType(type), (prop) => {
            const propType = prop.typeOfSymbol();
            this.indexConstraintForProperty(prop, propType, type, declaredStringIndexer, stringIndexType, IndexKind.String);
            this.indexConstraintForProperty(prop, propType, type, declaredNumberIndexer, numberIndexType, IndexKind.Number);
          });
          const classDeclaration = type.symbol.valueDeclaration;
          if (getObjectFlags(type) & ObjectFlags.Class && qf.is.classLike(classDeclaration)) {
            for (const member of classDeclaration.members) {
              if (!qf.has.syntacticModifier(member, ModifierFlags.Static) && hasNonBindableDynamicName(member)) {
                const symbol = qf.get.symbolOfNode(member);
                const propType = this.typeOfSymbol();
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
            const someBaseTypeHasBothIndexers = forEach(
              getBaseTypes(<qt.InterfaceType>type),
              (base) => qf.get.indexTypeOfType(base, IndexKind.String) && qf.get.indexTypeOfType(base, IndexKind.Number)
            );
            errorNode = someBaseTypeHasBothIndexers ? undefined : type.symbol.declarations[0];
          }
        }
        if (errorNode && !qf.type.is.assignableTo(numberIndexType!, stringIndexType!))
          error(errorNode, qd.msgs.Numeric_index_type_0_is_not_assignable_to_string_index_type_1, typeToString(numberIndexType!), typeToString(stringIndexType!));
        function checkIndexConstraintForProperty(
          s: qt.Symbol,
          propertyType: Type,
          containingType: Type,
          indexDeclaration: qt.Declaration | undefined,
          indexType: Type | undefined,
          indexKind: IndexKind
        ): void {
          if (!indexType || s.isKnown()) return;
          const propDeclaration = s.valueDeclaration;
          const name = propDeclaration && qf.decl.nameOf(propDeclaration);
          if (name && name.kind === Syntax.PrivateIdentifier) return;
          if (indexKind === IndexKind.Number && !(name ? isNumericName(name) : qt.NumericLiteral.name(s.escName))) return;
          let errorNode: Node | undefined;
          if (propDeclaration && name && (propDeclaration.kind === Syntax.BinaryExpression || name.kind === Syntax.ComputedPropertyName || s.parent === containingType.symbol))
            errorNode = propDeclaration;
          else if (indexDeclaration) {
            errorNode = indexDeclaration;
          } else if (getObjectFlags(containingType) & ObjectFlags.Interface) {
            const someBaseClassHasBothPropertyAndIndexer = forEach(
              getBaseTypes(<qt.InterfaceType>containingType),
              (base) => getPropertyOfObjectType(base, s.escName) && qf.get.indexTypeOfType(base, indexKind)
            );
            errorNode = someBaseClassHasBothPropertyAndIndexer ? undefined : containingType.symbol.declarations[0];
          }
          if (errorNode && !qf.type.is.assignableTo(propertyType, indexType)) {
            const errorMessage =
              indexKind === IndexKind.String ? qd.msgs.Property_0_of_type_1_is_not_assignable_to_string_index_type_2 : qd.msgs.Property_0_of_type_1_is_not_assignable_to_numeric_index_type_2;
            error(errorNode, errorMessage, s.symbolToString(), typeToString(propertyType), typeToString(indexType));
          }
        }
      }
      baseTypeAccessibility(type: Type, n: qt.ExpressionWithTypings) {
        const signatures = getSignaturesOfType(type, SignatureKind.Construct);
        if (signatures.length) {
          const declaration = signatures[0].declaration;
          if (declaration && qf.has.effectiveModifier(declaration, ModifierFlags.Private)) {
            const typeClassDeclaration = type.symbol.classLikeDeclaration()!;
            if (!isNodeWithinClass(n, typeClassDeclaration)) error(n, qd.msgs.Cannot_extend_a_class_0_Class_constructor_is_marked_as_private, qf.get.fullyQualifiedName(type.symbol));
          }
        }
      }
    })();
  })());
}
export interface Ftype extends ReturnType<typeof newType> {}
export function newSymbol(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.symbol = new (class Fsymbol {
    check = new (class extends Fsymbol {
      resolvedBlockScopedVariable(result: qt.Symbol, n: Node): void {
        qf.assert.true(!!(result.flags & qt.SymbolFlags.BlockScopedVariable || result.flags & qt.SymbolFlags.Class || result.flags & qt.SymbolFlags.Enum));
        if (result.flags & (SymbolFlags.Function | qt.SymbolFlags.FunctionScopedVariable | qt.SymbolFlags.Assignment) && result.flags & qt.SymbolFlags.Class) return;
        const declaration = qf.find.up(result.declarations, (d) => qf.is.blockOrCatchScoped(d) || qf.is.classLike(d) || d.kind === Syntax.EnumDeclaration);
        if (declaration === undefined) return qu.fail('checkResolvedBlockScopedVariable could not find block-scoped declaration');
        if (!(declaration.flags & NodeFlags.Ambient) && !qf.is.blockScopedNameDeclaredBeforeUse(declaration, n)) {
          let diagnosticMessage;
          const declarationName = declarationNameToString(qf.decl.nameOf(declaration));
          if (result.flags & qt.SymbolFlags.BlockScopedVariable) diagnosticMessage = error(n, qd.msgs.Block_scoped_variable_0_used_before_its_declaration, declarationName);
          else if (result.flags & qt.SymbolFlags.Class) {
            diagnosticMessage = error(n, qd.msgs.Class_0_used_before_its_declaration, declarationName);
          } else if (result.flags & qt.SymbolFlags.RegularEnum) {
            diagnosticMessage = error(n, qd.msgs.Enum_0_used_before_its_declaration, declarationName);
          } else {
            qf.assert.true(!!(result.flags & qt.SymbolFlags.ConstEnum));
            if (compilerOpts.preserveConstEnums) diagnosticMessage = error(n, qd.msgs.Enum_0_used_before_its_declaration, declarationName);
          }
          if (diagnosticMessage) addRelatedInfo(diagnosticMessage, qf.create.diagForNode(declaration, qd.msgs._0_is_declared_here, declarationName));
        }
      }
      propertyNotUsedBeforeDeclaration(prop: qt.Symbol, n: qt.PropertyAccessExpression | qt.QualifiedName, right: qt.Identifier | qt.PrivateIdentifier): void {
        const { valueDeclaration } = prop;
        if (!valueDeclaration || n.sourceFile.isDeclarationFile) return;
        let diagnosticMessage;
        const declarationName = idText(right);
        if (
          isInPropertyIniter(n) &&
          !(qf.is.accessExpression(n) && qf.is.accessExpression(n.expression)) &&
          !qf.is.blockScopedNameDeclaredBeforeUse(valueDeclaration, right) &&
          !isPropertyDeclaredInAncestorClass(prop)
        ) {
          diagnosticMessage = error(right, qd.msgs.Property_0_is_used_before_its_initialization, declarationName);
        } else if (
          valueDeclaration.kind === Syntax.ClassDeclaration &&
          n.parent.kind !== Syntax.TypingReference &&
          !(valueDeclaration.flags & NodeFlags.Ambient) &&
          !qf.is.blockScopedNameDeclaredBeforeUse(valueDeclaration, right)
        ) {
          diagnosticMessage = error(right, qd.msgs.Class_0_used_before_its_declaration, declarationName);
        }
        if (diagnosticMessage) addRelatedInfo(diagnosticMessage, qf.create.diagForNode(valueDeclaration, qd.msgs._0_is_declared_here, declarationName));
      }
    })();
  })());
}
export interface Fsymbol extends ReturnType<typeof newSymbol> {}
export function newSignature(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.signature = new (class Fsignature {
    check = new (class extends Fsignature {})();
  })());
}
export interface Fsignature extends ReturnType<typeof newSignature> {}
