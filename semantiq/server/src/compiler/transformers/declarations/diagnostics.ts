namespace qnr {
  export type GetSymbolAccessibilityDiagnostic = (symbolAccessibilityResult: SymbolAccessibilityResult) => SymbolAccessibilityDiagnostic | undefined;

  export interface SymbolAccessibilityDiagnostic {
    errorNode: Node;
    diagnosticMessage: DiagnosticMessage;
    typeName?: DeclarationName | QualifiedName;
  }

  export type DeclarationDiagnosticProducing =
    | VariableDeclaration
    | PropertyDeclaration
    | PropertySignature
    | BindingElement
    | SetAccessorDeclaration
    | GetAccessorDeclaration
    | ConstructSignatureDeclaration
    | CallSignatureDeclaration
    | MethodDeclaration
    | MethodSignature
    | FunctionDeclaration
    | ParameterDeclaration
    | TypeParameterDeclaration
    | ExpressionWithTypeArguments
    | ImportEqualsDeclaration
    | TypeAliasDeclaration
    | ConstructorDeclaration
    | IndexSignatureDeclaration
    | PropertyAccessExpression;

  export function canProduceDiagnostics(node: Node): node is DeclarationDiagnosticProducing {
    return (
      qn.is.kind(VariableDeclaration, node) ||
      qn.is.kind(PropertyDeclaration, node) ||
      qn.is.kind(PropertySignature, node) ||
      qn.is.kind(BindingElement, node) ||
      qn.is.kind(SetAccessorDeclaration, node) ||
      qn.is.kind(GetAccessorDeclaration, node) ||
      qn.is.kind(ConstructSignatureDeclaration, node) ||
      qn.is.kind(CallSignatureDeclaration, node) ||
      qn.is.kind(MethodDeclaration, node) ||
      qn.is.kind(MethodSignature, node) ||
      qn.is.kind(FunctionDeclaration, node) ||
      qn.is.kind(ParameterDeclaration, node) ||
      qn.is.kind(TypeParameterDeclaration, node) ||
      qn.is.kind(ExpressionWithTypeArguments, node) ||
      qn.is.kind(ImportEqualsDeclaration, node) ||
      qn.is.kind(TypeAliasDeclaration, node) ||
      qn.is.kind(ConstructorDeclaration, node) ||
      qn.is.kind(IndexSignatureDeclaration, node) ||
      qn.is.kind(PropertyAccessExpression, node)
    );
  }

  export function createGetSymbolAccessibilityDiagnosticForNodeName(node: DeclarationDiagnosticProducing) {
    if (qn.is.kind(SetAccessorDeclaration, node) || qn.is.kind(GetAccessorDeclaration, node)) {
      return getAccessorNameVisibilityError;
    } else if (qn.is.kind(MethodSignature, node) || qn.is.kind(MethodDeclaration, node)) {
      return getMethodNameVisibilityError;
    } else {
      return createGetSymbolAccessibilityDiagnosticForNode(node);
    }
    function getAccessorNameVisibilityError(symbolAccessibilityResult: SymbolAccessibilityResult) {
      const diagnosticMessage = getAccessorNameVisibilityDiagnosticMessage(symbolAccessibilityResult);
      return diagnosticMessage !== undefined
        ? {
            diagnosticMessage,
            errorNode: node,
            typeName: (node as NamedDeclaration).name,
          }
        : undefined;
    }

    function getAccessorNameVisibilityDiagnosticMessage(symbolAccessibilityResult: SymbolAccessibilityResult) {
      if (hasSyntacticModifier(node, ModifierFlags.Static)) {
        return symbolAccessibilityResult.errorModuleName
          ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
            ? Diagnostics.Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
            : Diagnostics.Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2
          : Diagnostics.Public_static_property_0_of_exported_class_has_or_is_using_private_name_1;
      } else if (node.parent.kind === Syntax.ClassDeclaration) {
        return symbolAccessibilityResult.errorModuleName
          ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
            ? Diagnostics.Public_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
            : Diagnostics.Public_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2
          : Diagnostics.Public_property_0_of_exported_class_has_or_is_using_private_name_1;
      } else {
        return symbolAccessibilityResult.errorModuleName
          ? Diagnostics.Property_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2
          : Diagnostics.Property_0_of_exported_interface_has_or_is_using_private_name_1;
      }
    }

    function getMethodNameVisibilityError(symbolAccessibilityResult: SymbolAccessibilityResult): SymbolAccessibilityDiagnostic | undefined {
      const diagnosticMessage = getMethodNameVisibilityDiagnosticMessage(symbolAccessibilityResult);
      return diagnosticMessage !== undefined
        ? {
            diagnosticMessage,
            errorNode: node,
            typeName: (node as NamedDeclaration).name,
          }
        : undefined;
    }

    function getMethodNameVisibilityDiagnosticMessage(symbolAccessibilityResult: SymbolAccessibilityResult) {
      if (hasSyntacticModifier(node, ModifierFlags.Static)) {
        return symbolAccessibilityResult.errorModuleName
          ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
            ? Diagnostics.Public_static_method_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
            : Diagnostics.Public_static_method_0_of_exported_class_has_or_is_using_name_1_from_private_module_2
          : Diagnostics.Public_static_method_0_of_exported_class_has_or_is_using_private_name_1;
      } else if (node.parent.kind === Syntax.ClassDeclaration) {
        return symbolAccessibilityResult.errorModuleName
          ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
            ? Diagnostics.Public_method_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
            : Diagnostics.Public_method_0_of_exported_class_has_or_is_using_name_1_from_private_module_2
          : Diagnostics.Public_method_0_of_exported_class_has_or_is_using_private_name_1;
      } else {
        return symbolAccessibilityResult.errorModuleName
          ? Diagnostics.Method_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2
          : Diagnostics.Method_0_of_exported_interface_has_or_is_using_private_name_1;
      }
    }
  }

  export function createGetSymbolAccessibilityDiagnosticForNode(
    node: DeclarationDiagnosticProducing
  ): (symbolAccessibilityResult: SymbolAccessibilityResult) => SymbolAccessibilityDiagnostic | undefined {
    if (
      qn.is.kind(VariableDeclaration, node) ||
      qn.is.kind(PropertyDeclaration, node) ||
      qn.is.kind(PropertySignature, node) ||
      qn.is.kind(PropertyAccessExpression, node) ||
      qn.is.kind(BindingElement, node) ||
      qn.is.kind(ConstructorDeclaration, node)
    ) {
      return getVariableDeclarationTypeVisibilityError;
    } else if (qn.is.kind(SetAccessorDeclaration, node) || qn.is.kind(GetAccessorDeclaration, node)) {
      return getAccessorDeclarationTypeVisibilityError;
    } else if (
      qn.is.kind(ConstructSignatureDeclaration, node) ||
      qn.is.kind(CallSignatureDeclaration, node) ||
      qn.is.kind(MethodDeclaration, node) ||
      qn.is.kind(MethodSignature, node) ||
      qn.is.kind(FunctionDeclaration, node) ||
      qn.is.kind(IndexSignatureDeclaration, node)
    ) {
      return getReturnTypeVisibilityError;
    } else if (qn.is.kind(ParameterDeclaration, node)) {
      if (qn.is.parameterPropertyDeclaration(node, node.parent) && hasSyntacticModifier(node.parent, ModifierFlags.Private)) {
        return getVariableDeclarationTypeVisibilityError;
      }
      return getParameterDeclarationTypeVisibilityError;
    } else if (qn.is.kind(TypeParameterDeclaration, node)) {
      return getTypeParameterConstraintVisibilityError;
    } else if (qn.is.kind(ExpressionWithTypeArguments, node)) {
      return getHeritageClauseVisibilityError;
    } else if (qn.is.kind(ImportEqualsDeclaration, node)) {
      return getImportEntityNameVisibilityError;
    } else if (qn.is.kind(TypeAliasDeclaration, node)) {
      return getTypeAliasDeclarationVisibilityError;
    } else {
      return Debug.assertNever(node, `Attempted to set a declaration diagnostic context for unhandled node kind: ${(ts as any).SyntaxKind[(node as any).kind]}`);
    }

    function getVariableDeclarationTypeVisibilityDiagnosticMessage(symbolAccessibilityResult: SymbolAccessibilityResult) {
      if (node.kind === Syntax.VariableDeclaration || node.kind === Syntax.BindingElement) {
        return symbolAccessibilityResult.errorModuleName
          ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
            ? Diagnostics.Exported_variable_0_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
            : Diagnostics.Exported_variable_0_has_or_is_using_name_1_from_private_module_2
          : Diagnostics.Exported_variable_0_has_or_is_using_private_name_1;
      }
      // This check is to ensure we don't report error on constructor parameter property as that error would be reported during parameter emit
      // The only exception here is if the constructor was marked as private. we are not emitting the constructor parameters at all.
      else if (
        node.kind === Syntax.PropertyDeclaration ||
        node.kind === Syntax.PropertyAccessExpression ||
        node.kind === Syntax.PropertySignature ||
        (node.kind === Syntax.Parameter && hasSyntacticModifier(node.parent, ModifierFlags.Private))
      ) {
        // TODO(jfreeman): Deal with computed properties in error reporting.
        if (hasSyntacticModifier(node, ModifierFlags.Static)) {
          return symbolAccessibilityResult.errorModuleName
            ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
              ? Diagnostics.Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
              : Diagnostics.Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2
            : Diagnostics.Public_static_property_0_of_exported_class_has_or_is_using_private_name_1;
        } else if (node.parent.kind === Syntax.ClassDeclaration || node.kind === Syntax.Parameter) {
          return symbolAccessibilityResult.errorModuleName
            ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
              ? Diagnostics.Public_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
              : Diagnostics.Public_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2
            : Diagnostics.Public_property_0_of_exported_class_has_or_is_using_private_name_1;
        } else {
          // Interfaces cannot have types that cannot be named
          return symbolAccessibilityResult.errorModuleName
            ? Diagnostics.Property_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2
            : Diagnostics.Property_0_of_exported_interface_has_or_is_using_private_name_1;
        }
      }
    }

    function getVariableDeclarationTypeVisibilityError(symbolAccessibilityResult: SymbolAccessibilityResult): SymbolAccessibilityDiagnostic | undefined {
      const diagnosticMessage = getVariableDeclarationTypeVisibilityDiagnosticMessage(symbolAccessibilityResult);
      return diagnosticMessage !== undefined
        ? {
            diagnosticMessage,
            errorNode: node,
            typeName: (node as NamedDeclaration).name,
          }
        : undefined;
    }

    function getAccessorDeclarationTypeVisibilityError(symbolAccessibilityResult: SymbolAccessibilityResult): SymbolAccessibilityDiagnostic {
      let diagnosticMessage: DiagnosticMessage;
      if (node.kind === Syntax.SetAccessor) {
        // Getters can infer the return type from the returned expression, but setters cannot, so the
        // "_from_external_module_1_but_cannot_be_named" case cannot occur.
        if (hasSyntacticModifier(node, ModifierFlags.Static)) {
          diagnosticMessage = symbolAccessibilityResult.errorModuleName
            ? Diagnostics.Parameter_type_of_public_static_setter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2
            : Diagnostics.Parameter_type_of_public_static_setter_0_from_exported_class_has_or_is_using_private_name_1;
        } else {
          diagnosticMessage = symbolAccessibilityResult.errorModuleName
            ? Diagnostics.Parameter_type_of_public_setter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2
            : Diagnostics.Parameter_type_of_public_setter_0_from_exported_class_has_or_is_using_private_name_1;
        }
      } else {
        if (hasSyntacticModifier(node, ModifierFlags.Static)) {
          diagnosticMessage = symbolAccessibilityResult.errorModuleName
            ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
              ? Diagnostics.Return_type_of_public_static_getter_0_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
              : Diagnostics.Return_type_of_public_static_getter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2
            : Diagnostics.Return_type_of_public_static_getter_0_from_exported_class_has_or_is_using_private_name_1;
        } else {
          diagnosticMessage = symbolAccessibilityResult.errorModuleName
            ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
              ? Diagnostics.Return_type_of_public_getter_0_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
              : Diagnostics.Return_type_of_public_getter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2
            : Diagnostics.Return_type_of_public_getter_0_from_exported_class_has_or_is_using_private_name_1;
        }
      }
      return {
        diagnosticMessage,
        errorNode: (node as NamedDeclaration).name!,
        typeName: (node as NamedDeclaration).name,
      };
    }

    function getReturnTypeVisibilityError(symbolAccessibilityResult: SymbolAccessibilityResult): SymbolAccessibilityDiagnostic {
      let diagnosticMessage: DiagnosticMessage;
      switch (node.kind) {
        case Syntax.ConstructSignature:
          // Interfaces cannot have return types that cannot be named
          diagnosticMessage = symbolAccessibilityResult.errorModuleName
            ? Diagnostics.Return_type_of_constructor_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1
            : Diagnostics.Return_type_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_0;
          break;

        case Syntax.CallSignature:
          // Interfaces cannot have return types that cannot be named
          diagnosticMessage = symbolAccessibilityResult.errorModuleName
            ? Diagnostics.Return_type_of_call_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1
            : Diagnostics.Return_type_of_call_signature_from_exported_interface_has_or_is_using_private_name_0;
          break;

        case Syntax.IndexSignature:
          // Interfaces cannot have return types that cannot be named
          diagnosticMessage = symbolAccessibilityResult.errorModuleName
            ? Diagnostics.Return_type_of_index_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1
            : Diagnostics.Return_type_of_index_signature_from_exported_interface_has_or_is_using_private_name_0;
          break;

        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
          if (hasSyntacticModifier(node, ModifierFlags.Static)) {
            diagnosticMessage = symbolAccessibilityResult.errorModuleName
              ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
                ? Diagnostics.Return_type_of_public_static_method_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named
                : Diagnostics.Return_type_of_public_static_method_from_exported_class_has_or_is_using_name_0_from_private_module_1
              : Diagnostics.Return_type_of_public_static_method_from_exported_class_has_or_is_using_private_name_0;
          } else if (node.parent.kind === Syntax.ClassDeclaration) {
            diagnosticMessage = symbolAccessibilityResult.errorModuleName
              ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
                ? Diagnostics.Return_type_of_public_method_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named
                : Diagnostics.Return_type_of_public_method_from_exported_class_has_or_is_using_name_0_from_private_module_1
              : Diagnostics.Return_type_of_public_method_from_exported_class_has_or_is_using_private_name_0;
          } else {
            // Interfaces cannot have return types that cannot be named
            diagnosticMessage = symbolAccessibilityResult.errorModuleName
              ? Diagnostics.Return_type_of_method_from_exported_interface_has_or_is_using_name_0_from_private_module_1
              : Diagnostics.Return_type_of_method_from_exported_interface_has_or_is_using_private_name_0;
          }
          break;

        case Syntax.FunctionDeclaration:
          diagnosticMessage = symbolAccessibilityResult.errorModuleName
            ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
              ? Diagnostics.Return_type_of_exported_function_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named
              : Diagnostics.Return_type_of_exported_function_has_or_is_using_name_0_from_private_module_1
            : Diagnostics.Return_type_of_exported_function_has_or_is_using_private_name_0;
          break;

        default:
          return fail('This is unknown kind for signature: ' + node.kind);
      }

      return {
        diagnosticMessage,
        errorNode: (node as NamedDeclaration).name || node,
      };
    }

    function getParameterDeclarationTypeVisibilityError(symbolAccessibilityResult: SymbolAccessibilityResult): SymbolAccessibilityDiagnostic | undefined {
      const diagnosticMessage: DiagnosticMessage = getParameterDeclarationTypeVisibilityDiagnosticMessage(symbolAccessibilityResult);
      return diagnosticMessage !== undefined
        ? {
            diagnosticMessage,
            errorNode: node,
            typeName: (node as NamedDeclaration).name,
          }
        : undefined;
    }

    function getParameterDeclarationTypeVisibilityDiagnosticMessage(symbolAccessibilityResult: SymbolAccessibilityResult): DiagnosticMessage {
      switch (node.parent.kind) {
        case Syntax.Constructor:
          return symbolAccessibilityResult.errorModuleName
            ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
              ? Diagnostics.Parameter_0_of_constructor_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
              : Diagnostics.Parameter_0_of_constructor_from_exported_class_has_or_is_using_name_1_from_private_module_2
            : Diagnostics.Parameter_0_of_constructor_from_exported_class_has_or_is_using_private_name_1;

        case Syntax.ConstructSignature:
        case Syntax.ConstructorType:
          // Interfaces cannot have parameter types that cannot be named
          return symbolAccessibilityResult.errorModuleName
            ? Diagnostics.Parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2
            : Diagnostics.Parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_1;

        case Syntax.CallSignature:
          // Interfaces cannot have parameter types that cannot be named
          return symbolAccessibilityResult.errorModuleName
            ? Diagnostics.Parameter_0_of_call_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2
            : Diagnostics.Parameter_0_of_call_signature_from_exported_interface_has_or_is_using_private_name_1;

        case Syntax.IndexSignature:
          // Interfaces cannot have parameter types that cannot be named
          return symbolAccessibilityResult.errorModuleName
            ? Diagnostics.Parameter_0_of_index_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2
            : Diagnostics.Parameter_0_of_index_signature_from_exported_interface_has_or_is_using_private_name_1;

        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
          if (hasSyntacticModifier(node.parent, ModifierFlags.Static)) {
            return symbolAccessibilityResult.errorModuleName
              ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
                ? Diagnostics.Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
                : Diagnostics.Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_name_1_from_private_module_2
              : Diagnostics.Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_private_name_1;
          } else if (node.parent.parent.kind === Syntax.ClassDeclaration) {
            return symbolAccessibilityResult.errorModuleName
              ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
                ? Diagnostics.Parameter_0_of_public_method_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
                : Diagnostics.Parameter_0_of_public_method_from_exported_class_has_or_is_using_name_1_from_private_module_2
              : Diagnostics.Parameter_0_of_public_method_from_exported_class_has_or_is_using_private_name_1;
          } else {
            // Interfaces cannot have parameter types that cannot be named
            return symbolAccessibilityResult.errorModuleName
              ? Diagnostics.Parameter_0_of_method_from_exported_interface_has_or_is_using_name_1_from_private_module_2
              : Diagnostics.Parameter_0_of_method_from_exported_interface_has_or_is_using_private_name_1;
          }

        case Syntax.FunctionDeclaration:
        case Syntax.FunctionType:
          return symbolAccessibilityResult.errorModuleName
            ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
              ? Diagnostics.Parameter_0_of_exported_function_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
              : Diagnostics.Parameter_0_of_exported_function_has_or_is_using_name_1_from_private_module_2
            : Diagnostics.Parameter_0_of_exported_function_has_or_is_using_private_name_1;
        case Syntax.SetAccessor:
        case Syntax.GetAccessor:
          return symbolAccessibilityResult.errorModuleName
            ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
              ? Diagnostics.Parameter_0_of_accessor_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
              : Diagnostics.Parameter_0_of_accessor_has_or_is_using_name_1_from_private_module_2
            : Diagnostics.Parameter_0_of_accessor_has_or_is_using_private_name_1;

        default:
          return fail(`Unknown parent for parameter: ${(ts as any).SyntaxKind[node.parent.kind]}`);
      }
    }

    function getTypeParameterConstraintVisibilityError(): SymbolAccessibilityDiagnostic {
      // Type parameter constraints are named by user so we should always be able to name it
      let diagnosticMessage: DiagnosticMessage;
      switch (node.parent.kind) {
        case Syntax.ClassDeclaration:
          diagnosticMessage = Diagnostics.Type_parameter_0_of_exported_class_has_or_is_using_private_name_1;
          break;

        case Syntax.InterfaceDeclaration:
          diagnosticMessage = Diagnostics.Type_parameter_0_of_exported_interface_has_or_is_using_private_name_1;
          break;

        case Syntax.MappedType:
          diagnosticMessage = Diagnostics.Type_parameter_0_of_exported_mapped_object_type_is_using_private_name_1;
          break;

        case Syntax.ConstructorType:
        case Syntax.ConstructSignature:
          diagnosticMessage = Diagnostics.Type_parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_1;
          break;

        case Syntax.CallSignature:
          diagnosticMessage = Diagnostics.Type_parameter_0_of_call_signature_from_exported_interface_has_or_is_using_private_name_1;
          break;

        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
          if (hasSyntacticModifier(node.parent, ModifierFlags.Static)) {
            diagnosticMessage = Diagnostics.Type_parameter_0_of_public_static_method_from_exported_class_has_or_is_using_private_name_1;
          } else if (node.parent.parent.kind === Syntax.ClassDeclaration) {
            diagnosticMessage = Diagnostics.Type_parameter_0_of_public_method_from_exported_class_has_or_is_using_private_name_1;
          } else {
            diagnosticMessage = Diagnostics.Type_parameter_0_of_method_from_exported_interface_has_or_is_using_private_name_1;
          }
          break;

        case Syntax.FunctionType:
        case Syntax.FunctionDeclaration:
          diagnosticMessage = Diagnostics.Type_parameter_0_of_exported_function_has_or_is_using_private_name_1;
          break;

        case Syntax.TypeAliasDeclaration:
          diagnosticMessage = Diagnostics.Type_parameter_0_of_exported_type_alias_has_or_is_using_private_name_1;
          break;

        default:
          return fail('This is unknown parent for type parameter: ' + node.parent.kind);
      }

      return {
        diagnosticMessage,
        errorNode: node,
        typeName: (node as NamedDeclaration).name,
      };
    }

    function getHeritageClauseVisibilityError(): SymbolAccessibilityDiagnostic {
      let diagnosticMessage: DiagnosticMessage;
      // Heritage clause is written by user so it can always be named
      if (node.parent.parent.kind === Syntax.ClassDeclaration) {
        // Class or Interface implemented/extended is inaccessible
        diagnosticMessage =
          qn.is.kind(HeritageClause, node.parent) && node.parent.token === Syntax.ImplementsKeyword
            ? Diagnostics.Implements_clause_of_exported_class_0_has_or_is_using_private_name_1
            : Diagnostics.extends_clause_of_exported_class_0_has_or_is_using_private_name_1;
      } else {
        // interface is inaccessible
        diagnosticMessage = Diagnostics.extends_clause_of_exported_interface_0_has_or_is_using_private_name_1;
      }

      return {
        diagnosticMessage,
        errorNode: node,
        typeName: getNameOfDeclaration(node.parent.parent as Declaration),
      };
    }

    function getImportEntityNameVisibilityError(): SymbolAccessibilityDiagnostic {
      return {
        diagnosticMessage: Diagnostics.Import_declaration_0_is_using_private_name_1,
        errorNode: node,
        typeName: (node as NamedDeclaration).name,
      };
    }

    function getTypeAliasDeclarationVisibilityError(): SymbolAccessibilityDiagnostic {
      return {
        diagnosticMessage: Diagnostics.Exported_type_alias_0_has_or_is_using_private_name_1,
        errorNode: (node as TypeAliasDeclaration).type,
        typeName: (node as TypeAliasDeclaration).name,
      };
    }
  }
}
