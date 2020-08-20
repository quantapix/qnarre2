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
export function newDecl(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.decl = new (class Fdecl {
    check = new (class extends Fdecl {
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
      andAggregateYieldOperandTypes(func: qt.FunctionLikeDeclaration, checkMode: CheckMode | undefined) {
        const yieldTypes: Type[] = [];
        const nextTypes: Type[] = [];
        const isAsync = (qf.get.functionFlags(func) & FunctionFlags.Async) !== 0;
        qf.each.yieldExpression(<qt.Block>func.body, (yieldExpression) => {
          const yieldExpressionType = yieldExpression.expression ? this.expression(yieldExpression.expression, checkMode) : undefinedWideningType;
          qu.pushIfUnique(yieldTypes, getYieldedTypeOfYieldExpression(yieldExpression, yieldExpressionType, anyType, isAsync));
          let nextType: Type | undefined;
          if (yieldExpression.asteriskToken) {
            const iterationTypes = getIterationTypesOfIterable(yieldExpressionType, isAsync ? IterationUse.AsyncYieldStar : IterationUse.YieldStar, yieldExpression.expression);
            nextType = iterationTypes && iterationTypes.nextType;
          } else nextType = getContextualType(yieldExpression);
          if (nextType) qu.pushIfUnique(nextTypes, nextType);
        });
        return { yieldTypes, nextTypes };
      }
      andAggregateReturnExpressionTypes(func: qt.FunctionLikeDeclaration, checkMode: CheckMode | undefined): Type[] | undefined {
        const functionFlags = qf.get.functionFlags(func);
        const aggregatedTypes: Type[] = [];
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
      allCodePathsInNonVoidFunctionReturnOrThrow(func: qt.FunctionLikeDeclaration | qt.MethodSignature, returnType: Type | undefined): void {
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
      objectLiteralMethod(n: qt.MethodDeclaration, checkMode?: CheckMode): Type {
        checkGrammar.method(n);
        if (n.name.kind === Syntax.ComputedPropertyName) this.computedPropertyName(n.name);
        const uninstantiatedType = this.functionExpressionOrObjectLiteralMethod(n, checkMode);
        return instantiateTypeWithSingleGenericCallSignature(n, uninstantiatedType, checkMode);
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
                addName(instanceNames, param.name, param.name.escapedText, qt.DeclarationMeaning.GetOrSetAccessor);
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
                  addName(names, name, memberName, qt.DeclarationMeaning.GetAccessor);
                  break;
                case Syntax.SetAccessor:
                  addName(names, name, memberName, qt.DeclarationMeaning.SetAccessor);
                  break;
                case Syntax.PropertyDeclaration:
                  addName(names, name, memberName, qt.DeclarationMeaning.GetOrSetAccessor);
                  break;
                case Syntax.MethodDeclaration:
                  addName(names, name, memberName, qt.DeclarationMeaning.Method);
                  break;
              }
            }
          }
        }
        function addName(names: EscapedMap<DeclarationMeaning>, location: Node, name: qu.__String, meaning: qt.DeclarationMeaning) {
          const prev = names.get(name);
          if (prev) {
            if (prev & qt.DeclarationMeaning.Method) {
              if (meaning !== qt.DeclarationMeaning.Method) error(location, qd.msgs.Duplicate_identifier_0, qf.get.textOf(location));
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
      propertyDeclaration(n: qt.PropertyDeclaration | qt.PropertySignature) {
        if (!checkGrammar.decoratorsAndModifiers(n) && !checkGrammar.property(n)) checkGrammar.computedPropertyName(n.name);
        this.variableLikeDeclaration(n);
        if (n.name.kind === Syntax.PrivateIdentifier && languageVersion < qt.ScriptTarget.ESNext) {
          for (let lexicalScope = qf.get.enclosingBlockScopeContainer(n); !!lexicalScope; lexicalScope = qf.get.enclosingBlockScopeContainer(lexicalScope)) {
            qf.get.nodeLinks(lexicalScope).flags |= NodeCheckFlags.ContainsClassWithPrivateIdentifiers;
          }
        }
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
                qu.some(n.params, (p) => qf.has.syntacticModifier(p, ModifierFlags.ParamPropertyModifier)));
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
              if (!superCallStatement)
                error(n, qd.msgs.A_super_call_must_be_the_first_statement_in_the_constructor_when_a_class_contains_initialized_properties_param_properties_or_private_identifiers);
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
              if ((nodeFlags & ModifierFlags.AccessibilityModifier) !== (otherFlags & ModifierFlags.AccessibilityModifier))
                error(n.name, qd.msgs.Getter_and_setter_accessors_do_not_agree_in_visibility);
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
      accessorDeclarationTypesIdentical(first: qt.AccessorDeclaration, second: qt.AccessorDeclaration, getAnnotatedType: (a: qt.AccessorDeclaration) => Type | undefined, message: qd.Message) {
        const firstType = getAnnotatedType(first);
        const secondType = getAnnotatedType(second);
        if (firstType && secondType && !qf.type.is.identicalTo(firstType, secondType)) error(first, message);
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
      functionDeclaration(n: qt.FunctionDeclaration): void {
        if (produceDiagnostics) {
          this.functionOrMethodDeclaration(n);
          checkGrammar.forGenerator(n);
          this.collisionWithRequireExportsInGeneratedCode(n, n.name!);
          this.collisionWithGlobalPromiseInGeneratedCode(n, n.name!);
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
      unusedClassMembers(n: qt.ClassDeclaration | qt.ClassExpression, addDiagnostic: AddUnusedDiagnostic): void {
        for (const member of n.members) {
          switch (member.kind) {
            case Syntax.MethodDeclaration:
            case Syntax.PropertyDeclaration:
            case Syntax.GetAccessor:
            case Syntax.SetAccessor:
              if (member.kind === Syntax.SetAccessor && member.symbol.flags & SymbolFlags.GetAccessor) break;
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
      unusedTypeParams(n: qt.ClassLikeDeclaration | qt.SignatureDeclaration | qt.InterfaceDeclaration | TypeAliasDeclaration, addDiagnostic: AddUnusedDiagnostic): void {
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
      collisionWithArgsInGeneratedCode(n: qt.SignatureDeclaration) {
        return;
      }
      varDeclaredNamesNotShadowed(n: qt.VariableDeclaration | qt.BindingElem) {
        if ((qf.get.combinedFlagsOf(n) & NodeFlags.BlockScoped) !== 0 || qf.is.paramDeclaration(n)) return;
        if (n.kind === Syntax.VariableDeclaration && !n.initer) return;
        const symbol = qf.get.symbolOfNode(n);
        if (symbol.flags & SymbolFlags.FunctionScopedVariable) {
          if (!n.name.kind === Syntax.Identifier) return qu.fail();
          const localDeclarationSymbol = resolveName(n, n.name.escapedText, SymbolFlags.Variable, undefined, undefined, false);
          if (localDeclarationSymbol && localDeclarationSymbol !== symbol && localDeclarationSymbol.flags & SymbolFlags.BlockScopedVariable) {
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
          if (n.parent?.kind === Syntax.ObjectBindingPattern && languageVersion < qt.ScriptTarget.ESNext) this.externalEmitHelpers(n, ExternalEmitHelpers.Rest);
          if (n.propertyName && n.propertyName.kind === Syntax.ComputedPropertyName) this.computedPropertyName(n.propertyName);
          const parent = n.parent?.parent;
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
          const needCheckIniter = n.initer && n.parent?.parent.kind !== Syntax.ForInStatement;
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
            if (!isJSObjectLiteralIniter && n.parent?.parent.kind !== Syntax.ForInStatement)
              qf.type.check.assignableToAndOptionallyElaborate(this.expressionCached(initer), type, n, initer, undefined);
          }
          if (symbol.declarations.length > 1) {
            if (qu.some(symbol.declarations, (d) => d !== n && qf.is.variableLike(d) && !areDeclarationFlagsIdentical(d, n)))
              error(n.name, qd.msgs.All_declarations_of_0_must_have_identical_modifiers, declarationNameToString(n.name));
          }
        } else {
          const declarationType = convertAutoToAny(qf.get.widenedTypeForVariableLikeDeclaration(n));
          if (type !== errorType && declarationType !== errorType && !qf.type.is.identicalTo(type, declarationType) && !(symbol.flags & SymbolFlags.Assignment))
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
      classDeclaration(n: qt.ClassDeclaration) {
        if (!n.name && !qf.has.syntacticModifier(n, ModifierFlags.Default)) errorOnFirstToken(n, qd.msgs.A_class_declaration_without_the_default_modifier_must_have_a_name);
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
            if (!(staticBaseType.symbol && staticBaseType.symbol.flags & SymbolFlags.Class) && !(baseConstructorType.flags & TypeFlags.TypeVariable)) {
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
                    t.symbol && t.symbol.flags & SymbolFlags.Class
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
            if (!inAmbientContext && n.name.kind === Syntax.StringLiteral) errorOnNode(n.name, qd.msgs.Only_ambient_modules_can_use_quoted_names);
          }
          if (n.name.kind === Syntax.Identifier) {
            this.collisionWithRequireExportsInGeneratedCode(n, n.name);
            this.collisionWithGlobalPromiseInGeneratedCode(n, n.name);
          }
          this.exportsOnMergedDeclarations(n);
          const symbol = qf.get.symbolOfNode(n);
          if (
            symbol.flags & SymbolFlags.ValueModule &&
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
              const checkBody = isGlobalAugmentation || qf.get.symbolOfNode(n).flags & SymbolFlags.Transient;
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
      externalImportOrExportDeclaration(n: qt.ImportDeclaration | qt.ImportEqualsDeclaration | qt.ExportDeclaration): boolean {
        const moduleName = qf.get.externalModuleName(n);
        if (!moduleName || qf.is.missing(moduleName)) return false;
        if (!moduleName.kind === Syntax.StringLiteral) {
          error(moduleName, qd.msgs.String_literal_expected);
          return false;
        }
        const inAmbientExternalModule = n.parent?.kind === Syntax.ModuleBlock && qf.is.ambientModule(n.parent?.parent);
        if (n.parent?.kind !== Syntax.SourceFile && !inAmbientExternalModule) {
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
        const shouldSkipWithJSExpandoTargets = symbol.flags & SymbolFlags.Assignment;
        if (!shouldSkipWithJSExpandoTargets && target !== unknownSymbol) {
          symbol = qf.get.mergedSymbol(symbol.exportSymbol || symbol);
          const excludedMeanings =
            (symbol.flags & (SymbolFlags.Value | SymbolFlags.ExportValue) ? SymbolFlags.Value : 0) |
            (symbol.flags & SymbolFlags.Type ? SymbolFlags.Type : 0) |
            (symbol.flags & SymbolFlags.Namespace ? SymbolFlags.Namespace : 0);
          if (target.flags & excludedMeanings) {
            const message = n.kind === Syntax.ExportSpecifier ? qd.msgs.Export_declaration_conflicts_with_exported_declaration_of_0 : qd.msgs.Import_declaration_conflicts_with_local_declaration_of_0;
            error(n, message, symbol.symbolToString());
          }
          if (compilerOpts.isolatedModules && n.kind === Syntax.ExportSpecifier && !n.parent?.parent.isTypeOnly && !(target.flags & SymbolFlags.Value) && !(n.flags & NodeFlags.Ambient))
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
        if (!checkGrammar.decoratorsAndModifiers(n) && qf.has.effectiveModifiers(n)) errorOnFirstToken(n, qd.msgs.An_import_declaration_cannot_have_modifiers);
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
              if (target.flags & SymbolFlags.Value) {
                const moduleName = qf.get.firstIdentifier(n.moduleReference);
                if (!(resolveEntityName(moduleName, SymbolFlags.Value | SymbolFlags.Namespace)!.flags & SymbolFlags.Namespace))
                  error(moduleName, qd.msgs.Module_0_is_hidden_by_a_local_declaration_with_the_same_name, declarationNameToString(moduleName));
              }
              if (target.flags & SymbolFlags.Type) this.typeNameIsReserved(n.name, qd.msgs.Import_name_cannot_be_0);
            }
          } else {
            if (moduleKind >= ModuleKind.ES2015 && !(n.flags & NodeFlags.Ambient)) {
              errorOnNode(
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
        if (!checkGrammar.decoratorsAndModifiers(n) && qf.has.effectiveModifiers(n)) errorOnFirstToken(n, qd.msgs.An_export_declaration_cannot_have_modifiers);
        checkGrammar.exportDeclaration(n);
        if (!n.moduleSpecifier || this.externalImportOrExportDeclaration(n)) {
          if (n.exportClause && !n.exportClause.kind === Syntax.NamespaceExport) {
            forEach(n.exportClause.elems, checkExportSpecifier);
            const inAmbientExternalModule = n.parent?.kind === Syntax.ModuleBlock && qf.is.ambientModule(n.parent?.parent);
            const inAmbientNamespaceDeclaration = !inAmbientExternalModule && n.parent?.kind === Syntax.ModuleBlock && !n.moduleSpecifier && n.flags & NodeFlags.Ambient;
            if (n.parent?.kind !== Syntax.SourceFile && !inAmbientExternalModule && !inAmbientNamespaceDeclaration) error(n, qd.msgs.Export_declarations_are_not_permitted_in_a_namespace);
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
            if (isInvalidIniter) return errorOnNode(initer, qd.msgs.A_const_initer_in_an_ambient_context_must_be_a_string_or_numeric_literal_or_literal_enum_reference);
          }
          return errorOnNode(initer, qd.msgs.Initers_are_not_allowed_in_ambient_contexts);
          if (!isConstOrReadonly || isInvalidIniter) return errorOnNode(initer, qd.msgs.Initers_are_not_allowed_in_ambient_contexts);
        }
        return;
      }
      exportSpecifier(n: qt.ExportSpecifier) {
        this.aliasSymbol(n);
        if (getEmitDeclarations(compilerOpts)) collectLinkedAliases(n.propertyName || n.name, true);
        if (!n.parent?.parent.moduleSpecifier) {
          const exportedName = n.propertyName || n.name;
          const symbol = resolveName(exportedName, exportedName.escapedText, SymbolFlags.Value | SymbolFlags.Type | SymbolFlags.Namespace | SymbolFlags.Alias, undefined, undefined, true);
          if (symbol && (symbol === undefinedSymbol || symbol === globalThisSymbol || qf.is.globalSourceFile(getDeclarationContainer(symbol.declarations[0]))))
            error(exportedName, qd.msgs.Cannot_export_0_Only_local_declarations_can_be_exported_from_a_module, idText(exportedName));
          else {
            markExportAsReferenced(n);
            const target = symbol && (symbol.flags & SymbolFlags.Alias ? this.resolveAlias() : symbol);
            if (!target || target === unknownSymbol || target.flags & SymbolFlags.Value) this.expressionCached(n.propertyName || n.name);
          }
        }
      }
      bindingElem(n: qt.BindingElem) {
        checkGrammar.bindingElem(n);
        return this.variableLikeDeclaration(n);
      }
    })();
  })());
}
export interface Fdecl extends ReturnType<typeof newDecl> {}
export function newStmt(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.stmt = new (class Fstmt {
    check = new (class extends Fstmt {
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
      rightHandSideOfForOf(statement: qt.ForOfStatement): Type {
        const use = statement.awaitModifier ? IterationUse.ForAwaitOf : IterationUse.ForOf;
        return this.iteratedTypeOrElemType(use, this.nonNullExpression(statement.expression), undefinedType, statement.expression);
      }
      breakOrContinueStatement(n: qt.BreakOrContinueStatement) {
        if (!checkGrammar.statementInAmbientContext(n)) checkGrammar.breakOrContinueStatement(n);
      }
      returnStatement(n: qt.ReturnStatement) {
        if (checkGrammar.statementInAmbientContext(n)) return;
        const func = qf.get.containingFunction(n);
        if (!func) {
          errorOnFirstToken(n, qd.msgs.A_return_statement_can_only_be_used_within_a_function_body);
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
          if (n.flags & NodeFlags.AwaitContext) errorOnFirstToken(n, qd.with_statements_are_not_allowed_in_an_async_function_block);
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
              errorOnNode(clause, qd.msgs.A_default_clause_cannot_appear_more_than_once_in_a_switch_statement);
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
              errorOnNode(n.label, qd.msgs.Duplicate_label_0, qf.get.textOf(n.label));
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
            if (catchClause.variableDeclaration.type) errorOnFirstToken(catchClause.variableDeclaration.type, qd.msgs.Catch_clause_variable_cannot_have_a_type_annotation);
            else if (catchClause.variableDeclaration.initer) {
              errorOnFirstToken(catchClause.variableDeclaration.initer, qd.msgs.Catch_clause_variable_cannot_have_an_initer);
            } else {
              const blockLocals = catchClause.block.locals;
              if (blockLocals) {
                forEachKey(catchClause.locals!, (caughtName) => {
                  const blockLocal = blockLocals.get(caughtName);
                  if (blockLocal && (blockLocal.flags & SymbolFlags.BlockScopedVariable) !== 0)
                    errorOnNode(blockLocal.valueDeclaration, qd.msgs.Cannot_redeclare_identifier_0_in_catch_clause, caughtName);
                });
              }
            }
          }
          this.block(catchClause.block);
        }
        if (n.finallyBlock) this.block(n.finallyBlock);
      }
    })();
  })());
}
export interface Fstmt extends ReturnType<typeof newStmt> {}

export function newType(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.type = new (class Ftype {
    check = new (class extends Ftype {
      assignableTo(t: Type, to: Type, err?: Node, m?: qd.Message, c?: () => qd.MessageChain | undefined, o?: { errors?: qd.Diagnostic[] }) {
        return this.relatedTo(t, to, assignableRelation, err, m, c, o);
      }
      comparableTo(t: Type, to: Type, err: Node, m?: qd.Message, c?: () => qd.MessageChain | undefined) {
        return this.relatedTo(t, to, comparableRelation, err, m, c);
      }
      relatedTo(
        t: Type,
        to: Type,
        relation: qu.QMap<qt.RelationComparisonResult>,
        err: Node,
        m?: qd.Message,
        c?: () => qd.MessageChain | undefined,
        o?: { errors?: qd.Diagnostic[]; skipLogging?: boolean }
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
          if (o) (o.errors || (o.errors = [])).push(diag);
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
              const helpfulRetry = qf.type.check.relatedTo(ls.target!.typeOfSymbol(), to, relation, undefined);
              if (helpfulRetry) {
                const diag = qf.make.diagForNode(
                  ls.originatingImport,
                  qd.msgs
                    .Type_originates_at_this_import_A_namespace_style_import_cannot_be_called_or_constructed_and_will_cause_a_failure_at_runtime_Consider_using_a_default_import_or_import_require_here_instead
                );
                relatedInformation = qu.append(relatedInformation, diag);
              }
            }
          }
          const diag = qf.make.diagForNodeFromMessageChain(err!, errorInfo, relatedInformation);
          if (relatedInfo) addRelatedInfo(diag, ...relatedInfo);
          if (o) (o.errors || (o.errors = [])).push(diag);
          if (!o || !o.skipLogging) diagnostics.add(diag);
        }
        if (err && o && o.skipLogging && result === qt.Ternary.False) qf.assert.true(!!o.errors, 'missed opportunity to interact with error.');
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
              result = qf.type.check.relatedToSomeType(
                getRegularTypeOfObjectLiteral(source),
                <qt.UnionType>target,
                reportErrors && !(source.flags & TypeFlags.Primitive) && !(target.flags & TypeFlags.Primitive)
              );
            else if (target.flags & TypeFlags.Intersection) {
              result = qf.type.check.relatedToEachType(getRegularTypeOfObjectLiteral(source), target as qt.IntersectionType, reportErrors, IntersectionState.Target);
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
                !some((<qt.IntersectionType>source).types, (t) => !!(t.objectFlags & ObjectFlags.NonInferrableType))))
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
            const related = qf.type.check.relatedToSomeType(sourceType, target, false);
            if (!related) return qt.Ternary.False;
            result &= related;
          }
          return result;
        }
        function relatedToSomeType(source: Type, target: qt.UnionOrIntersectionType, reportErrors: boolean): qt.Ternary {
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
        function relatedToEachType(source: Type, target: qt.IntersectionType, reportErrors: boolean, intersectionState: IntersectionState): qt.Ternary {
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
                const result = qf.type.check.relatedToDiscriminatedType(source, objectOnlyTarget as qt.UnionType);
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
        function relatedToDiscriminatedType(source: Type, target: qt.UnionType) {
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
            if (length(unmatchedProperty.declarations)) associateRelatedInfo(qf.make.diagForNode(unmatchedProperty.declarations[0], qd.msgs._0_is_declared_here, propName));
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
      assignableToAndOptionallyElaborate(t: Type, to: Type, err?: Node, e?: qt.Expression, m?: qd.Message, c?: () => qd.MessageChain | undefined) {
        return this.relatedToAndOptionallyElaborate(t, to, assignableRelation, err, e, m, c, undefined);
      }
      relatedToAndOptionallyElaborate(
        t: Type,
        to: Type,
        relation: qu.QMap<qt.RelationComparisonResult>,
        err?: Node,
        e?: qt.Expression,
        m?: qd.Message,
        c?: () => qd.MessageChain | undefined,
        o?: { errors?: qd.Diagnostic[]; skipLogging?: boolean }
      ) {
        if (qf.type.is.relatedTo(t, to, relation)) return true;
        if (!err || !elaborateError(e, t, to, relation, m, c, o)) return qf.type.check.relatedTo(t, to, relation, err, m, c, o);
        return false;
      }
      spreadPropOverrides(t: Type, ps: qt.SymbolTable, s: qt.SpreadAssignment | qt.JsxSpreadAttribute) {
        for (const right of qf.get.propertiesOfType(t)) {
          const left = ps.get(right.escName);
          const r = right.typeOfSymbol();
          if (left && !maybeTypeOfKind(r, TypeFlags.Nullable) && !(maybeTypeOfKind(r, TypeFlags.AnyOrUnknown) && right.flags & qt.SymbolFlags.Optional)) {
            const d = error(left.valueDeclaration, qd.msgs._0_is_specified_more_than_once_so_this_usage_will_be_overwritten, qy.get.unescUnderscores(left.escName));
            addRelatedInfo(d, qf.make.diagForNode(s, qd.msgs.This_spread_always_overwrites_this_property));
          }
        }
      }
      nonNullWithReporter(t: Type, n: Node, cb: (n: Node, k: TypeFlags) => void): Type {
        if (strictNullChecks && t.flags & TypeFlags.Unknown) {
          error(n, qd.msgs.Object_is_of_type_unknown);
          return errorType;
        }
        const k = (strictNullChecks ? getFalsyFlags(t) : t.flags) & TypeFlags.Nullable;
        if (k) {
          cb(n, k);
          const u = getNonNullableType(t);
          return u.flags & (TypeFlags.Nullable | TypeFlags.Never) ? errorType : u;
        }
        return t;
      }
      nonNull(t: Type, n: Node) {
        return this.nonNullWithReporter(t, n, reportObjectPossiblyNullOrUndefinedError);
      }
      nonNullNonVoidType(t: Type, n: Node): Type {
        const r = this.nonNull(t, n);
        if (r !== errorType && r.flags & TypeFlags.Void) error(n, qd.msgs.Object_is_possibly_undefined);
        return r;
      }
      privateIdentifierPropAccess(left: Type, right: qt.PrivateIdentifier, s?: qt.Symbol) {
        let propertyOnType: qt.Symbol | undefined;
        const ps = qf.get.propertiesOfType(left);
        if (ps) {
          forEach(ps, (p: qt.Symbol) => {
            const v = p.valueDeclaration;
            if (v && qf.is.namedDeclaration(v) && v.name.kind === Syntax.PrivateIdentifier && v.name.escapedText === right.escapedText) {
              propertyOnType = p;
              return true;
            }
          });
        }
        const n = diagnosticName(right);
        if (propertyOnType) {
          const typeValueDecl = propertyOnType.valueDeclaration;
          const typeClass = qf.get.containingClass(typeValueDecl);
          qf.assert.true(!!typeClass);
          if (s) {
            const v = s.valueDeclaration;
            const c = qf.get.containingClass(v);
            qf.assert.true(!!c);
            if (qc.findAncestor(c, (x) => typeClass === x)) {
              const d = error(
                right,
                qd.msgs.The_property_0_cannot_be_accessed_on_type_1_within_this_class_because_it_is_shadowed_by_another_private_identifier_with_the_same_spelling,
                n,
                typeToString(left)
              );
              addRelatedInfo(
                d,
                qf.make.diagForNode(v, qd.msgs.The_shadowing_declaration_of_0_is_defined_here, n),
                qf.make.diagForNode(typeValueDecl, qd.msgs.The_declaration_of_0_that_you_probably_intended_to_use_is_defined_here, n)
              );
              return true;
            }
          }
          error(right, qd.msgs.Property_0_is_not_accessible_outside_class_1_because_it_has_a_private_identifier, n, diagnosticName(typeClass.name || anon));
          return true;
        }
        return false;
      }
      indexedAccessIndex(t: Type, n: qt.IndexedAccessTyping | qt.ElemAccessExpression) {
        if (!(t.flags & TypeFlags.IndexedAccess)) return t;
        const objectType = (<qt.IndexedAccessType>t).objectType;
        const indexType = (<qt.IndexedAccessType>t).indexType;
        if (qf.type.is.assignableTo(indexType, qf.get.indexType(objectType, false))) {
          if (
            n.kind === Syntax.ElemAccessExpression &&
            qf.is.assignmentTarget(n) &&
            getObjectFlags(objectType) & ObjectFlags.Mapped &&
            getMappedTypeModifiers(<qt.MappedType>objectType) & MappedTypeModifiers.IncludeReadonly
          ) {
            error(n, qd.msgs.Index_signature_in_type_0_only_permits_reading, typeToString(objectType));
          }
          return t;
        }
        const apparentObjectType = getApparentType(objectType);
        if (qf.get.indexInfoOfType(apparentObjectType, IndexKind.Number) && qf.type.is.assignableToKind(indexType, TypeFlags.NumberLike)) return t;
        if (qf.type.is.genericObject(objectType)) {
          const propertyName = getPropertyNameFromIndex(indexType, n);
          if (propertyName) {
            const propertySymbol = forEachType(apparentObjectType, (t) => qf.get.propertyOfType(t, propertyName));
            if (propertySymbol && propertySymbol.declarationModifierFlags() & ModifierFlags.NonPublicAccessibilityModifier) {
              error(n, qd.msgs.Private_or_protected_member_0_cannot_be_accessed_on_a_type_param, qy.get.unescUnderscores(propertyName));
              return errorType;
            }
          }
        }
        error(n, qd.msgs.Type_0_cannot_be_used_to_index_type_1, typeToString(indexType), typeToString(objectType));
        return errorType;
      }
      awaited(t: Type, err: Node, m: qd.Message, arg0?: string | number): Type {
        const r = getAwaitedType(t, err, m, arg0);
        return r || errorType;
      }
      truthinessOf(t: Type, n: Node) {
        if (t.flags & TypeFlags.Void) error(n, qd.msgs.An_expression_of_type_void_cannot_be_tested_for_truthiness);
        return t;
      }
      indexConstraints(t: Type) {
        const declaredNumberIndexer = getIndexDeclarationOfSymbol(t.symbol, IndexKind.Number);
        const declaredStringIndexer = getIndexDeclarationOfSymbol(t.symbol, IndexKind.String);
        const stringIndexType = qf.get.indexTypeOfType(t, IndexKind.String);
        const numberIndexType = qf.get.indexTypeOfType(t, IndexKind.Number);
        const checkIndexConstraintForProperty = (
          s: qt.Symbol,
          propertyType: Type,
          containingType: Type,
          indexDeclaration: qt.Declaration | undefined,
          indexType: Type | undefined,
          indexKind: IndexKind
        ) => {
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
              (b) => getPropertyOfObjectType(b, s.escName) && qf.get.indexTypeOfType(b, indexKind)
            );
            errorNode = someBaseClassHasBothPropertyAndIndexer ? undefined : containingType.symbol.declarations[0];
          }
          if (errorNode && !qf.type.is.assignableTo(propertyType, indexType)) {
            const errorMessage =
              indexKind === IndexKind.String ? qd.msgs.Property_0_of_type_1_is_not_assignable_to_string_index_type_2 : qd.msgs.Property_0_of_type_1_is_not_assignable_to_numeric_index_type_2;
            error(errorNode, errorMessage, s.symbolToString(), typeToString(propertyType), typeToString(indexType));
          }
        };
        if (stringIndexType || numberIndexType) {
          forEach(getPropertiesOfObjectType(t), (p) => {
            const propType = p.typeOfSymbol();
            checkIndexConstraintForProperty(p, propType, t, declaredStringIndexer, stringIndexType, IndexKind.String);
            checkIndexConstraintForProperty(p, propType, t, declaredNumberIndexer, numberIndexType, IndexKind.Number);
          });
          const v = t.symbol.valueDeclaration;
          if (t.objectFlags & ObjectFlags.Class && qf.is.classLike(v)) {
            for (const m of v.members) {
              if (!qf.has.syntacticModifier(m, ModifierFlags.Static) && hasNonBindableDynamicName(m)) {
                const s = qf.get.symbolOfNode(m);
                const propType = this.typeOfSymbol();
                checkIndexConstraintForProperty(s, propType, t, declaredStringIndexer, stringIndexType, IndexKind.String);
                checkIndexConstraintForProperty(s, propType, t, declaredNumberIndexer, numberIndexType, IndexKind.Number);
              }
            }
          }
        }
        let errorNode: Node | undefined;
        if (stringIndexType && numberIndexType) {
          errorNode = declaredNumberIndexer || declaredStringIndexer;
          if (!errorNode && t.objectFlags & ObjectFlags.Interface) {
            const someBaseTypeHasBothIndexers = forEach(getBaseTypes(<qt.InterfaceType>t), (b) => qf.get.indexTypeOfType(b, IndexKind.String) && qf.get.indexTypeOfType(b, IndexKind.Number));
            errorNode = someBaseTypeHasBothIndexers ? undefined : t.symbol.declarations[0];
          }
        }
        if (errorNode && !qf.type.is.assignableTo(numberIndexType!, stringIndexType!))
          error(errorNode, qd.msgs.Numeric_index_type_0_is_not_assignable_to_string_index_type_1, typeToString(numberIndexType!), typeToString(stringIndexType!));
      }
      baseAccessibility(s: Type, n: qt.ExpressionWithTypings) {
        const ss = getSignaturesOfType(s, SignatureKind.Construct);
        if (ss.length) {
          const d = ss[0].declaration;
          if (d && qf.has.effectiveModifier(d, ModifierFlags.Private)) {
            const c = s.symbol.classLikeDeclaration()!;
            if (!isNodeWithinClass(n, c)) error(n, qd.msgs.Cannot_extend_a_class_0_Class_constructor_is_marked_as_private, qf.get.fullyQualifiedName(s.symbol));
          }
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
  return (qf.symb = new (class Fsymbol {
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
          if (diagnosticMessage) addRelatedInfo(diagnosticMessage, qf.make.diagForNode(declaration, qd.msgs._0_is_declared_here, declarationName));
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
        if (diagnosticMessage) addRelatedInfo(diagnosticMessage, qf.make.diagForNode(valueDeclaration, qd.msgs._0_is_declared_here, declarationName));
      }
    })();
  })());
}
export interface Fsymbol extends ReturnType<typeof newSymbol> {}
export function newSign(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.sign = new (class Fsign {
    check = new (class extends Fsignature {
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
    })();
  })());
}
export interface Fsign extends ReturnType<typeof newSign> {}
