import * as qb from '../base';
import * as qc from '../core';
import { diags as qd } from '../diags';
import { Node, Nodes } from '../core';
import * as qs from '../core3';
import * as qt from '../types';
import * as qy from '../syntax';
import { Modifier, ModifierFlags, Syntax } from '../syntax';
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
    qc.is.kind(VariableDeclaration, node) ||
    qc.is.kind(PropertyDeclaration, node) ||
    qc.is.kind(PropertySignature, node) ||
    qc.is.kind(BindingElement, node) ||
    qc.is.kind(SetAccessorDeclaration, node) ||
    qc.is.kind(GetAccessorDeclaration, node) ||
    qc.is.kind(ConstructSignatureDeclaration, node) ||
    qc.is.kind(CallSignatureDeclaration, node) ||
    qc.is.kind(MethodDeclaration, node) ||
    qc.is.kind(MethodSignature, node) ||
    qc.is.kind(FunctionDeclaration, node) ||
    qc.is.kind(qc.ParameterDeclaration, node) ||
    qc.is.kind(TypeParameterDeclaration, node) ||
    qc.is.kind(ExpressionWithTypeArguments, node) ||
    qc.is.kind(ImportEqualsDeclaration, node) ||
    qc.is.kind(TypeAliasDeclaration, node) ||
    qc.is.kind(ConstructorDeclaration, node) ||
    qc.is.kind(IndexSignatureDeclaration, node) ||
    qc.is.kind(PropertyAccessExpression, node)
  );
}
export function createGetSymbolAccessibilityDiagnosticForNodeName(node: DeclarationDiagnosticProducing) {
  if (qc.is.kind(SetAccessorDeclaration, node) || qc.is.kind(GetAccessorDeclaration, node)) return getAccessorNameVisibilityError;
  if (qc.is.kind(MethodSignature, node) || qc.is.kind(MethodDeclaration, node)) return getMethodNameVisibilityError;
  return createGetSymbolAccessibilityDiagnosticForNode(node);
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
    if (qc.has.syntacticModifier(node, ModifierFlags.Static)) {
      return symbolAccessibilityResult.errorModuleName
        ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
          ? qd.Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
          : qd.Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2
        : qd.Public_static_property_0_of_exported_class_has_or_is_using_private_name_1;
    } else if (node.parent.kind === Syntax.ClassDeclaration) {
      return symbolAccessibilityResult.errorModuleName
        ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
          ? qd.Public_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
          : qd.Public_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2
        : qd.Public_property_0_of_exported_class_has_or_is_using_private_name_1;
    } else {
      return symbolAccessibilityResult.errorModuleName
        ? qd.Property_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2
        : qd.Property_0_of_exported_interface_has_or_is_using_private_name_1;
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
    if (qc.has.syntacticModifier(node, ModifierFlags.Static)) {
      return symbolAccessibilityResult.errorModuleName
        ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
          ? qd.Public_static_method_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
          : qd.Public_static_method_0_of_exported_class_has_or_is_using_name_1_from_private_module_2
        : qd.Public_static_method_0_of_exported_class_has_or_is_using_private_name_1;
    } else if (node.parent.kind === Syntax.ClassDeclaration) {
      return symbolAccessibilityResult.errorModuleName
        ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
          ? qd.Public_method_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
          : qd.Public_method_0_of_exported_class_has_or_is_using_name_1_from_private_module_2
        : qd.Public_method_0_of_exported_class_has_or_is_using_private_name_1;
    } else {
      return symbolAccessibilityResult.errorModuleName
        ? qd.Method_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2
        : qd.Method_0_of_exported_interface_has_or_is_using_private_name_1;
    }
  }
}
export function createGetSymbolAccessibilityDiagnosticForNode(
  node: DeclarationDiagnosticProducing
): (symbolAccessibilityResult: SymbolAccessibilityResult) => SymbolAccessibilityDiagnostic | undefined {
  if (
    qc.is.kind(VariableDeclaration, node) ||
    qc.is.kind(PropertyDeclaration, node) ||
    qc.is.kind(PropertySignature, node) ||
    qc.is.kind(PropertyAccessExpression, node) ||
    qc.is.kind(BindingElement, node) ||
    qc.is.kind(ConstructorDeclaration, node)
  ) {
    return getVariableDeclarationTypeVisibilityError;
  }
  if (qc.is.kind(SetAccessorDeclaration, node) || qc.is.kind(GetAccessorDeclaration, node)) return getAccessorDeclarationTypeVisibilityError;
  if (
    qc.is.kind(ConstructSignatureDeclaration, node) ||
    qc.is.kind(CallSignatureDeclaration, node) ||
    qc.is.kind(MethodDeclaration, node) ||
    qc.is.kind(MethodSignature, node) ||
    qc.is.kind(FunctionDeclaration, node) ||
    qc.is.kind(IndexSignatureDeclaration, node)
  ) {
    return getReturnTypeVisibilityError;
  }
  if (qc.is.kind(qc.ParameterDeclaration, node)) {
    if (qc.is.parameterPropertyDeclaration(node, node.parent) && qc.has.syntacticModifier(node.parent, ModifierFlags.Private)) return getVariableDeclarationTypeVisibilityError;
    return getParameterDeclarationTypeVisibilityError;
  }
  if (qc.is.kind(TypeParameterDeclaration, node)) return getTypeParameterConstraintVisibilityError;
  if (qc.is.kind(ExpressionWithTypeArguments, node)) return getHeritageClauseVisibilityError;
  if (qc.is.kind(ImportEqualsDeclaration, node)) return getImportEntityNameVisibilityError;
  if (qc.is.kind(TypeAliasDeclaration, node)) return getTypeAliasDeclarationVisibilityError;
  return Debug.assertNever(node, `Attempted to set a declaration diagnostic context for unhandled node kind: ${(ts as any).SyntaxKind[(node as any).kind]}`);
  function getVariableDeclarationTypeVisibilityDiagnosticMessage(symbolAccessibilityResult: SymbolAccessibilityResult) {
    if (node.kind === Syntax.VariableDeclaration || node.kind === Syntax.BindingElement) {
      return symbolAccessibilityResult.errorModuleName
        ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
          ? qd.Exported_variable_0_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
          : qd.Exported_variable_0_has_or_is_using_name_1_from_private_module_2
        : qd.Exported_variable_0_has_or_is_using_private_name_1;
    } else if (
      node.kind === Syntax.PropertyDeclaration ||
      node.kind === Syntax.PropertyAccessExpression ||
      node.kind === Syntax.PropertySignature ||
      (node.kind === Syntax.Parameter && qc.has.syntacticModifier(node.parent, ModifierFlags.Private))
    ) {
      if (qc.has.syntacticModifier(node, ModifierFlags.Static)) {
        return symbolAccessibilityResult.errorModuleName
          ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
            ? qd.Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
            : qd.Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2
          : qd.Public_static_property_0_of_exported_class_has_or_is_using_private_name_1;
      } else if (node.parent.kind === Syntax.ClassDeclaration || node.kind === Syntax.Parameter) {
        return symbolAccessibilityResult.errorModuleName
          ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
            ? qd.Public_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
            : qd.Public_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2
          : qd.Public_property_0_of_exported_class_has_or_is_using_private_name_1;
      } else {
        return symbolAccessibilityResult.errorModuleName
          ? qd.Property_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2
          : qd.Property_0_of_exported_interface_has_or_is_using_private_name_1;
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
      if (qc.has.syntacticModifier(node, ModifierFlags.Static)) {
        diagnosticMessage = symbolAccessibilityResult.errorModuleName
          ? qd.Parameter_type_of_public_static_setter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2
          : qd.Parameter_type_of_public_static_setter_0_from_exported_class_has_or_is_using_private_name_1;
      } else {
        diagnosticMessage = symbolAccessibilityResult.errorModuleName
          ? qd.Parameter_type_of_public_setter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2
          : qd.Parameter_type_of_public_setter_0_from_exported_class_has_or_is_using_private_name_1;
      }
    } else {
      if (qc.has.syntacticModifier(node, ModifierFlags.Static)) {
        diagnosticMessage = symbolAccessibilityResult.errorModuleName
          ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
            ? qd.Return_type_of_public_static_getter_0_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
            : qd.Return_type_of_public_static_getter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2
          : qd.Return_type_of_public_static_getter_0_from_exported_class_has_or_is_using_private_name_1;
      } else {
        diagnosticMessage = symbolAccessibilityResult.errorModuleName
          ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
            ? qd.Return_type_of_public_getter_0_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
            : qd.Return_type_of_public_getter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2
          : qd.Return_type_of_public_getter_0_from_exported_class_has_or_is_using_private_name_1;
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
        diagnosticMessage = symbolAccessibilityResult.errorModuleName
          ? qd.Return_type_of_constructor_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1
          : qd.Return_type_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_0;
        break;
      case Syntax.CallSignature:
        diagnosticMessage = symbolAccessibilityResult.errorModuleName
          ? qd.Return_type_of_call_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1
          : qd.Return_type_of_call_signature_from_exported_interface_has_or_is_using_private_name_0;
        break;
      case Syntax.IndexSignature:
        diagnosticMessage = symbolAccessibilityResult.errorModuleName
          ? qd.Return_type_of_index_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1
          : qd.Return_type_of_index_signature_from_exported_interface_has_or_is_using_private_name_0;
        break;
      case Syntax.MethodDeclaration:
      case Syntax.MethodSignature:
        if (qc.has.syntacticModifier(node, ModifierFlags.Static)) {
          diagnosticMessage = symbolAccessibilityResult.errorModuleName
            ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
              ? qd.Return_type_of_public_static_method_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named
              : qd.Return_type_of_public_static_method_from_exported_class_has_or_is_using_name_0_from_private_module_1
            : qd.Return_type_of_public_static_method_from_exported_class_has_or_is_using_private_name_0;
        } else if (node.parent.kind === Syntax.ClassDeclaration) {
          diagnosticMessage = symbolAccessibilityResult.errorModuleName
            ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
              ? qd.Return_type_of_public_method_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named
              : qd.Return_type_of_public_method_from_exported_class_has_or_is_using_name_0_from_private_module_1
            : qd.Return_type_of_public_method_from_exported_class_has_or_is_using_private_name_0;
        } else {
          diagnosticMessage = symbolAccessibilityResult.errorModuleName
            ? qd.Return_type_of_method_from_exported_interface_has_or_is_using_name_0_from_private_module_1
            : qd.Return_type_of_method_from_exported_interface_has_or_is_using_private_name_0;
        }
        break;
      case Syntax.FunctionDeclaration:
        diagnosticMessage = symbolAccessibilityResult.errorModuleName
          ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
            ? qd.Return_type_of_exported_function_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named
            : qd.Return_type_of_exported_function_has_or_is_using_name_0_from_private_module_1
          : qd.Return_type_of_exported_function_has_or_is_using_private_name_0;
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
            ? qd.Parameter_0_of_constructor_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
            : qd.Parameter_0_of_constructor_from_exported_class_has_or_is_using_name_1_from_private_module_2
          : qd.Parameter_0_of_constructor_from_exported_class_has_or_is_using_private_name_1;
      case Syntax.ConstructSignature:
      case Syntax.ConstructorType:
        return symbolAccessibilityResult.errorModuleName
          ? qd.Parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2
          : qd.Parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_1;
      case Syntax.CallSignature:
        return symbolAccessibilityResult.errorModuleName
          ? qd.Parameter_0_of_call_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2
          : qd.Parameter_0_of_call_signature_from_exported_interface_has_or_is_using_private_name_1;
      case Syntax.IndexSignature:
        return symbolAccessibilityResult.errorModuleName
          ? qd.Parameter_0_of_index_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2
          : qd.Parameter_0_of_index_signature_from_exported_interface_has_or_is_using_private_name_1;
      case Syntax.MethodDeclaration:
      case Syntax.MethodSignature:
        if (qc.has.syntacticModifier(node.parent, ModifierFlags.Static)) {
          return symbolAccessibilityResult.errorModuleName
            ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
              ? qd.Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
              : qd.Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_name_1_from_private_module_2
            : qd.Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_private_name_1;
        } else if (node.parent.parent.kind === Syntax.ClassDeclaration) {
          return symbolAccessibilityResult.errorModuleName
            ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
              ? qd.Parameter_0_of_public_method_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
              : qd.Parameter_0_of_public_method_from_exported_class_has_or_is_using_name_1_from_private_module_2
            : qd.Parameter_0_of_public_method_from_exported_class_has_or_is_using_private_name_1;
        } else {
          return symbolAccessibilityResult.errorModuleName
            ? qd.Parameter_0_of_method_from_exported_interface_has_or_is_using_name_1_from_private_module_2
            : qd.Parameter_0_of_method_from_exported_interface_has_or_is_using_private_name_1;
        }
      case Syntax.FunctionDeclaration:
      case Syntax.FunctionType:
        return symbolAccessibilityResult.errorModuleName
          ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
            ? qd.Parameter_0_of_exported_function_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
            : qd.Parameter_0_of_exported_function_has_or_is_using_name_1_from_private_module_2
          : qd.Parameter_0_of_exported_function_has_or_is_using_private_name_1;
      case Syntax.SetAccessor:
      case Syntax.GetAccessor:
        return symbolAccessibilityResult.errorModuleName
          ? symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed
            ? qd.Parameter_0_of_accessor_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
            : qd.Parameter_0_of_accessor_has_or_is_using_name_1_from_private_module_2
          : qd.Parameter_0_of_accessor_has_or_is_using_private_name_1;
      default:
        return fail(`Unknown parent for parameter: ${(ts as any).SyntaxKind[node.parent.kind]}`);
    }
  }
  function getTypeParameterConstraintVisibilityError(): SymbolAccessibilityDiagnostic {
    let diagnosticMessage: DiagnosticMessage;
    switch (node.parent.kind) {
      case Syntax.ClassDeclaration:
        diagnosticMessage = qd.Type_parameter_0_of_exported_class_has_or_is_using_private_name_1;
        break;
      case Syntax.InterfaceDeclaration:
        diagnosticMessage = qd.Type_parameter_0_of_exported_interface_has_or_is_using_private_name_1;
        break;
      case Syntax.MappedType:
        diagnosticMessage = qd.Type_parameter_0_of_exported_mapped_object_type_is_using_private_name_1;
        break;
      case Syntax.ConstructorType:
      case Syntax.ConstructSignature:
        diagnosticMessage = qd.Type_parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_1;
        break;
      case Syntax.CallSignature:
        diagnosticMessage = qd.Type_parameter_0_of_call_signature_from_exported_interface_has_or_is_using_private_name_1;
        break;
      case Syntax.MethodDeclaration:
      case Syntax.MethodSignature:
        if (qc.has.syntacticModifier(node.parent, ModifierFlags.Static)) {
          diagnosticMessage = qd.Type_parameter_0_of_public_static_method_from_exported_class_has_or_is_using_private_name_1;
        } else if (node.parent.parent.kind === Syntax.ClassDeclaration) {
          diagnosticMessage = qd.Type_parameter_0_of_public_method_from_exported_class_has_or_is_using_private_name_1;
        } else {
          diagnosticMessage = qd.Type_parameter_0_of_method_from_exported_interface_has_or_is_using_private_name_1;
        }
        break;
      case Syntax.FunctionType:
      case Syntax.FunctionDeclaration:
        diagnosticMessage = qd.Type_parameter_0_of_exported_function_has_or_is_using_private_name_1;
        break;
      case Syntax.TypeAliasDeclaration:
        diagnosticMessage = qd.Type_parameter_0_of_exported_type_alias_has_or_is_using_private_name_1;
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
    if (node.parent.parent.kind === Syntax.ClassDeclaration) {
      diagnosticMessage =
        qc.is.kind(HeritageClause, node.parent) && node.parent.token === Syntax.ImplementsKeyword
          ? qd.Implements_clause_of_exported_class_0_has_or_is_using_private_name_1
          : qd.extends_clause_of_exported_class_0_has_or_is_using_private_name_1;
    } else {
      diagnosticMessage = qd.extends_clause_of_exported_interface_0_has_or_is_using_private_name_1;
    }
    return {
      diagnosticMessage,
      errorNode: node,
      typeName: qc.get.nameOfDeclaration(node.parent.parent as Declaration),
    };
  }
  function getImportEntityNameVisibilityError(): SymbolAccessibilityDiagnostic {
    return {
      diagnosticMessage: qd.Import_declaration_0_is_using_private_name_1,
      errorNode: node,
      typeName: (node as NamedDeclaration).name,
    };
  }
  function getTypeAliasDeclarationVisibilityError(): SymbolAccessibilityDiagnostic {
    return {
      diagnosticMessage: qd.Exported_type_alias_0_has_or_is_using_private_name_1,
      errorNode: (node as TypeAliasDeclaration).type,
      typeName: (node as TypeAliasDeclaration).name,
    };
  }
}
