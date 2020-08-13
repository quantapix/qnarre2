import { Node, Modifier, ModifierFlags } from '../types';
import { qf, Nodes } from '../core';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from '../types';
import * as qu from '../utils';
import * as qy from '../syntax';
export type GetSymbolAccessibilityDiagnostic = (r: qt.SymbolAccessibilityResult) => SymbolAccessibilityDiagnostic | undefined;
export interface SymbolAccessibilityDiagnostic {
  errorNode: Node;
  diagnosticMessage: qd.Message;
  typeName?: qt.DeclarationName | qt.QualifiedName;
}
export type DeclarationDiagnosticProducing =
  | qt.VariableDeclaration
  | qt.PropertyDeclaration
  | qt.PropertySignature
  | qt.BindingElem
  | qt.SetAccessorDeclaration
  | qt.GetAccessorDeclaration
  | qt.ConstructSignatureDeclaration
  | qt.CallSignatureDeclaration
  | qt.MethodDeclaration
  | qt.MethodSignature
  | qt.FunctionDeclaration
  | qt.ParamDeclaration
  | qt.TypeParamDeclaration
  | qt.ExpressionWithTypings
  | qt.ImportEqualsDeclaration
  | qt.TypeAliasDeclaration
  | qt.ConstructorDeclaration
  | qt.IndexSignatureDeclaration
  | qt.PropertyAccessExpression;
export function canProduceDiagnostics(node: Node): node is DeclarationDiagnosticProducing {
  return (
    node.kind === Syntax.VariableDeclaration ||
    node.kind === Syntax.PropertyDeclaration ||
    node.kind === Syntax.PropertySignature ||
    node.kind === Syntax.BindingElem ||
    node.kind === Syntax.SetAccessor ||
    node.kind === Syntax.GetAccessor ||
    node.kind === Syntax.ConstructSignature ||
    node.kind === Syntax.CallSignature ||
    node.kind === Syntax.MethodDeclaration ||
    node.kind === Syntax.MethodSignature ||
    node.kind === Syntax.FunctionDeclaration ||
    node.kind === Syntax.Param ||
    node.kind === Syntax.TypeParam ||
    node.kind === Syntax.ExpressionWithTypings ||
    node.kind === Syntax.ImportEqualsDeclaration ||
    node.kind === Syntax.TypeAliasDeclaration ||
    node.kind === Syntax.Constructor ||
    node.kind === Syntax.IndexSignature ||
    node.kind === Syntax.PropertyAccessExpression
  );
}
export function createGetSymbolAccessibilityDiagnosticForNodeName(node: DeclarationDiagnosticProducing) {
  if (node.kind === Syntax.SetAccessor || node.kind === Syntax.GetAccessor) return getAccessorNameVisibilityError;
  if (node.kind === Syntax.MethodSignature || node.kind === Syntax.MethodDeclaration) return getMethodNameVisibilityError;
  return createGetSymbolAccessibilityDiagnosticForNode(node);
  function getAccessorNameVisibilityError(r: qt.SymbolAccessibilityResult) {
    const diagnosticMessage = getAccessorNameVisibilityMessage(r);
    return diagnosticMessage !== undefined
      ? {
          diagnosticMessage,
          errorNode: node,
          typeName: (node as qt.NamedDecl).name,
        }
      : undefined;
  }
  function getAccessorNameVisibilityMessage(r: qt.SymbolAccessibilityResult) {
    if (qf.has.syntacticModifier(node, ModifierFlags.Static)) {
      return r.errorModuleName
        ? r.accessibility === qt.SymbolAccessibility.CannotBeNamed
          ? qd.msgs.Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
          : qd.msgs.Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2
        : qd.msgs.Public_static_property_0_of_exported_class_has_or_is_using_private_name_1;
    } else if (node.parent?.kind === Syntax.ClassDeclaration) {
      return r.errorModuleName
        ? r.accessibility === qt.SymbolAccessibility.CannotBeNamed
          ? qd.msgs.Public_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
          : qd.msgs.Public_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2
        : qd.msgs.Public_property_0_of_exported_class_has_or_is_using_private_name_1;
    } else {
      return r.errorModuleName ? qd.msgs.Property_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2 : qd.msgs.Property_0_of_exported_interface_has_or_is_using_private_name_1;
    }
  }
  function getMethodNameVisibilityError(r: qt.SymbolAccessibilityResult): SymbolAccessibilityDiagnostic | undefined {
    const diagnosticMessage = getMethodNameVisibilityMessage(r);
    return diagnosticMessage !== undefined
      ? {
          diagnosticMessage,
          errorNode: node,
          typeName: (node as qt.NamedDecl).name,
        }
      : undefined;
  }
  function getMethodNameVisibilityMessage(r: qt.SymbolAccessibilityResult) {
    if (qf.has.syntacticModifier(node, ModifierFlags.Static)) {
      return r.errorModuleName
        ? r.accessibility === qt.SymbolAccessibility.CannotBeNamed
          ? qd.msgs.Public_static_method_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
          : qd.msgs.Public_static_method_0_of_exported_class_has_or_is_using_name_1_from_private_module_2
        : qd.msgs.Public_static_method_0_of_exported_class_has_or_is_using_private_name_1;
    } else if (node.parent?.kind === Syntax.ClassDeclaration) {
      return r.errorModuleName
        ? r.accessibility === qt.SymbolAccessibility.CannotBeNamed
          ? qd.msgs.Public_method_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
          : qd.msgs.Public_method_0_of_exported_class_has_or_is_using_name_1_from_private_module_2
        : qd.msgs.Public_method_0_of_exported_class_has_or_is_using_private_name_1;
    } else {
      return r.errorModuleName ? qd.msgs.Method_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2 : qd.msgs.Method_0_of_exported_interface_has_or_is_using_private_name_1;
    }
  }
}
export function createGetSymbolAccessibilityDiagnosticForNode(node: DeclarationDiagnosticProducing): (r: qt.SymbolAccessibilityResult) => SymbolAccessibilityDiagnostic | undefined {
  if (
    node.kind === Syntax.VariableDeclaration ||
    node.kind === Syntax.PropertyDeclaration ||
    node.kind === Syntax.PropertySignature ||
    node.kind === Syntax.PropertyAccessExpression ||
    node.kind === Syntax.BindingElem ||
    node.kind === Syntax.Constructor
  ) {
    return getVariableDeclarationTypeVisibilityError;
  }
  if (node.kind === Syntax.SetAccessor || node.kind === Syntax.GetAccessor) return getAccessorDeclarationTypeVisibilityError;
  if (
    node.kind === Syntax.ConstructSignature ||
    node.kind === Syntax.CallSignature ||
    node.kind === Syntax.MethodDeclaration ||
    node.kind === Syntax.MethodSignature ||
    node.kind === Syntax.FunctionDeclaration ||
    node.kind === Syntax.IndexSignature
  ) {
    return getReturnTypeVisibilityError;
  }
  if (node.kind === Syntax.Param) {
    if (qf.is.paramPropertyDeclaration(node, node.parent) && qf.has.syntacticModifier(node.parent, ModifierFlags.Private)) return getVariableDeclarationTypeVisibilityError;
    return getParamDeclarationTypeVisibilityError;
  }
  if (node.kind === Syntax.TypeParam) return getTypeParamConstraintVisibilityError;
  if (node.kind === Syntax.ExpressionWithTypings) return getHeritageClauseVisibilityError;
  if (node.kind === Syntax.ImportEqualsDeclaration) return getImportEntityNameVisibilityError;
  if (node.kind === Syntax.TypeAliasDeclaration) return getTypeAliasDeclarationVisibilityError;
  return qc.assert.never(node, `Attempted to set a declaration diagnostic context for unhandled node kind: ${(ts as any).SyntaxKind[(node as any).kind]}`);
  function getVariableDeclarationTypeVisibilityMessage(r: qt.SymbolAccessibilityResult) {
    if (node.kind === Syntax.VariableDeclaration || node.kind === Syntax.BindingElem) {
      return r.errorModuleName
        ? r.accessibility === qt.SymbolAccessibility.CannotBeNamed
          ? qd.msgs.Exported_variable_0_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
          : qd.msgs.Exported_variable_0_has_or_is_using_name_1_from_private_module_2
        : qd.msgs.Exported_variable_0_has_or_is_using_private_name_1;
    } else if (
      node.kind === Syntax.PropertyDeclaration ||
      node.kind === Syntax.PropertyAccessExpression ||
      node.kind === Syntax.PropertySignature ||
      (node.kind === Syntax.Param && qf.has.syntacticModifier(node.parent, ModifierFlags.Private))
    ) {
      if (qf.has.syntacticModifier(node, ModifierFlags.Static)) {
        return r.errorModuleName
          ? r.accessibility === qt.SymbolAccessibility.CannotBeNamed
            ? qd.msgs.Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
            : qd.msgs.Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2
          : qd.msgs.Public_static_property_0_of_exported_class_has_or_is_using_private_name_1;
      } else if (node.parent?.kind === Syntax.ClassDeclaration || node.kind === Syntax.Param) {
        return r.errorModuleName
          ? r.accessibility === qt.SymbolAccessibility.CannotBeNamed
            ? qd.msgs.Public_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
            : qd.msgs.Public_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2
          : qd.msgs.Public_property_0_of_exported_class_has_or_is_using_private_name_1;
      } else {
        return r.errorModuleName ? qd.msgs.Property_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2 : qd.msgs.Property_0_of_exported_interface_has_or_is_using_private_name_1;
      }
    }
    return;
  }
  function getVariableDeclarationTypeVisibilityError(r: qt.SymbolAccessibilityResult): SymbolAccessibilityDiagnostic | undefined {
    const diagnosticMessage = getVariableDeclarationTypeVisibilityMessage(r);
    return diagnosticMessage !== undefined
      ? {
          diagnosticMessage,
          errorNode: node,
          typeName: (node as qt.NamedDecl).name,
        }
      : undefined;
  }
  function getAccessorDeclarationTypeVisibilityError(r: qt.SymbolAccessibilityResult): SymbolAccessibilityDiagnostic {
    let diagnosticMessage: qd.Message;
    if (node.kind === Syntax.SetAccessor) {
      if (qf.has.syntacticModifier(node, ModifierFlags.Static)) {
        diagnosticMessage = r.errorModuleName
          ? qd.msgs.Param_type_of_public_static_setter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2
          : qd.msgs.Param_type_of_public_static_setter_0_from_exported_class_has_or_is_using_private_name_1;
      } else {
        diagnosticMessage = r.errorModuleName
          ? qd.msgs.Param_type_of_public_setter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2
          : qd.msgs.Param_type_of_public_setter_0_from_exported_class_has_or_is_using_private_name_1;
      }
    } else {
      if (qf.has.syntacticModifier(node, ModifierFlags.Static)) {
        diagnosticMessage = r.errorModuleName
          ? r.accessibility === qt.SymbolAccessibility.CannotBeNamed
            ? qd.msgs.Return_type_of_public_static_getter_0_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
            : qd.msgs.Return_type_of_public_static_getter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2
          : qd.msgs.Return_type_of_public_static_getter_0_from_exported_class_has_or_is_using_private_name_1;
      } else {
        diagnosticMessage = r.errorModuleName
          ? r.accessibility === qt.SymbolAccessibility.CannotBeNamed
            ? qd.msgs.Return_type_of_public_getter_0_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
            : qd.msgs.Return_type_of_public_getter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2
          : qd.msgs.Return_type_of_public_getter_0_from_exported_class_has_or_is_using_private_name_1;
      }
    }
    return {
      diagnosticMessage,
      errorNode: (node as qt.NamedDecl).name!,
      typeName: (node as qt.NamedDecl).name,
    };
  }
  function getReturnTypeVisibilityError(r: qt.SymbolAccessibilityResult): SymbolAccessibilityDiagnostic {
    let diagnosticMessage: qd.Message;
    switch (node.kind) {
      case Syntax.ConstructSignature:
        diagnosticMessage = r.errorModuleName
          ? qd.msgs.Return_type_of_constructor_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1
          : qd.msgs.Return_type_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_0;
        break;
      case Syntax.CallSignature:
        diagnosticMessage = r.errorModuleName
          ? qd.msgs.Return_type_of_call_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1
          : qd.msgs.Return_type_of_call_signature_from_exported_interface_has_or_is_using_private_name_0;
        break;
      case Syntax.IndexSignature:
        diagnosticMessage = r.errorModuleName
          ? qd.msgs.Return_type_of_index_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1
          : qd.msgs.Return_type_of_index_signature_from_exported_interface_has_or_is_using_private_name_0;
        break;
      case Syntax.MethodDeclaration:
      case Syntax.MethodSignature:
        if (qf.has.syntacticModifier(node, ModifierFlags.Static)) {
          diagnosticMessage = r.errorModuleName
            ? r.accessibility === qt.SymbolAccessibility.CannotBeNamed
              ? qd.msgs.Return_type_of_public_static_method_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named
              : qd.msgs.Return_type_of_public_static_method_from_exported_class_has_or_is_using_name_0_from_private_module_1
            : qd.msgs.Return_type_of_public_static_method_from_exported_class_has_or_is_using_private_name_0;
        } else if (node.parent?.kind === Syntax.ClassDeclaration) {
          diagnosticMessage = r.errorModuleName
            ? r.accessibility === qt.SymbolAccessibility.CannotBeNamed
              ? qd.msgs.Return_type_of_public_method_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named
              : qd.msgs.Return_type_of_public_method_from_exported_class_has_or_is_using_name_0_from_private_module_1
            : qd.msgs.Return_type_of_public_method_from_exported_class_has_or_is_using_private_name_0;
        } else {
          diagnosticMessage = r.errorModuleName
            ? qd.msgs.Return_type_of_method_from_exported_interface_has_or_is_using_name_0_from_private_module_1
            : qd.msgs.Return_type_of_method_from_exported_interface_has_or_is_using_private_name_0;
        }
        break;
      case Syntax.FunctionDeclaration:
        diagnosticMessage = r.errorModuleName
          ? r.accessibility === qt.SymbolAccessibility.CannotBeNamed
            ? qd.msgs.Return_type_of_exported_function_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named
            : qd.msgs.Return_type_of_exported_function_has_or_is_using_name_0_from_private_module_1
          : qd.msgs.Return_type_of_exported_function_has_or_is_using_private_name_0;
        break;
      default:
        return qu.fail('This is unknown kind for signature: ' + node.kind);
    }
    return {
      diagnosticMessage,
      errorNode: (node as qt.NamedDecl).name || node,
    };
  }
  function getParamDeclarationTypeVisibilityError(r: qt.SymbolAccessibilityResult): SymbolAccessibilityDiagnostic | undefined {
    const diagnosticMessage: qd.Message = getParamDeclarationTypeVisibilityMessage(r);
    return diagnosticMessage !== undefined
      ? {
          diagnosticMessage,
          errorNode: node,
          typeName: (node as qt.NamedDecl).name,
        }
      : undefined;
  }
  function getParamDeclarationTypeVisibilityMessage(r: qt.SymbolAccessibilityResult): qd.Message {
    switch (node.parent?.kind) {
      case Syntax.Constructor:
        return r.errorModuleName
          ? r.accessibility === qt.SymbolAccessibility.CannotBeNamed
            ? qd.msgs.Param_0_of_constructor_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
            : qd.msgs.Param_0_of_constructor_from_exported_class_has_or_is_using_name_1_from_private_module_2
          : qd.msgs.Param_0_of_constructor_from_exported_class_has_or_is_using_private_name_1;
      case Syntax.ConstructSignature:
      case Syntax.ConstructorTyping:
        return r.errorModuleName
          ? qd.msgs.Param_0_of_constructor_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2
          : qd.msgs.Param_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_1;
      case Syntax.CallSignature:
        return r.errorModuleName
          ? qd.msgs.Param_0_of_call_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2
          : qd.msgs.Param_0_of_call_signature_from_exported_interface_has_or_is_using_private_name_1;
      case Syntax.IndexSignature:
        return r.errorModuleName
          ? qd.msgs.Param_0_of_index_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2
          : qd.msgs.Param_0_of_index_signature_from_exported_interface_has_or_is_using_private_name_1;
      case Syntax.MethodDeclaration:
      case Syntax.MethodSignature:
        if (qf.has.syntacticModifier(node.parent, ModifierFlags.Static)) {
          return r.errorModuleName
            ? r.accessibility === qt.SymbolAccessibility.CannotBeNamed
              ? qd.msgs.Param_0_of_public_static_method_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
              : qd.msgs.Param_0_of_public_static_method_from_exported_class_has_or_is_using_name_1_from_private_module_2
            : qd.msgs.Param_0_of_public_static_method_from_exported_class_has_or_is_using_private_name_1;
        } else if (node.parent?.parent?.kind === Syntax.ClassDeclaration) {
          return r.errorModuleName
            ? r.accessibility === qt.SymbolAccessibility.CannotBeNamed
              ? qd.msgs.Param_0_of_public_method_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
              : qd.msgs.Param_0_of_public_method_from_exported_class_has_or_is_using_name_1_from_private_module_2
            : qd.msgs.Param_0_of_public_method_from_exported_class_has_or_is_using_private_name_1;
        } else {
          return r.errorModuleName
            ? qd.msgs.Param_0_of_method_from_exported_interface_has_or_is_using_name_1_from_private_module_2
            : qd.msgs.Param_0_of_method_from_exported_interface_has_or_is_using_private_name_1;
        }
      case Syntax.FunctionDeclaration:
      case Syntax.FunctionTyping:
        return r.errorModuleName
          ? r.accessibility === qt.SymbolAccessibility.CannotBeNamed
            ? qd.msgs.Param_0_of_exported_function_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
            : qd.msgs.Param_0_of_exported_function_has_or_is_using_name_1_from_private_module_2
          : qd.msgs.Param_0_of_exported_function_has_or_is_using_private_name_1;
      case Syntax.SetAccessor:
      case Syntax.GetAccessor:
        return r.errorModuleName
          ? r.accessibility === qt.SymbolAccessibility.CannotBeNamed
            ? qd.msgs.Param_0_of_accessor_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named
            : qd.msgs.Param_0_of_accessor_has_or_is_using_name_1_from_private_module_2
          : qd.msgs.Param_0_of_accessor_has_or_is_using_private_name_1;
      default:
        return qu.fail(`Unknown parent for param: ${(ts as any).SyntaxKind[node.parent?.kind]}`);
    }
  }
  function getTypeParamConstraintVisibilityError(): SymbolAccessibilityDiagnostic {
    let diagnosticMessage: qd.Message;
    switch (node.parent?.kind) {
      case Syntax.ClassDeclaration:
        diagnosticMessage = qd.msgs.Type_param_0_of_exported_class_has_or_is_using_private_name_1;
        break;
      case Syntax.InterfaceDeclaration:
        diagnosticMessage = qd.msgs.Type_param_0_of_exported_interface_has_or_is_using_private_name_1;
        break;
      case Syntax.MappedTyping:
        diagnosticMessage = qd.msgs.Type_param_0_of_exported_mapped_object_type_is_using_private_name_1;
        break;
      case Syntax.ConstructorTyping:
      case Syntax.ConstructSignature:
        diagnosticMessage = qd.msgs.Type_param_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_1;
        break;
      case Syntax.CallSignature:
        diagnosticMessage = qd.msgs.Type_param_0_of_call_signature_from_exported_interface_has_or_is_using_private_name_1;
        break;
      case Syntax.MethodDeclaration:
      case Syntax.MethodSignature:
        if (qf.has.syntacticModifier(node.parent, ModifierFlags.Static)) {
          diagnosticMessage = qd.msgs.Type_param_0_of_public_static_method_from_exported_class_has_or_is_using_private_name_1;
        } else if (node.parent?.parent?.kind === Syntax.ClassDeclaration) {
          diagnosticMessage = qd.msgs.Type_param_0_of_public_method_from_exported_class_has_or_is_using_private_name_1;
        } else {
          diagnosticMessage = qd.msgs.Type_param_0_of_method_from_exported_interface_has_or_is_using_private_name_1;
        }
        break;
      case Syntax.FunctionTyping:
      case Syntax.FunctionDeclaration:
        diagnosticMessage = qd.msgs.Type_param_0_of_exported_function_has_or_is_using_private_name_1;
        break;
      case Syntax.TypeAliasDeclaration:
        diagnosticMessage = qd.msgs.Type_param_0_of_exported_type_alias_has_or_is_using_private_name_1;
        break;
      default:
        return qu.fail('This is unknown parent for type param: ' + node.parent?.kind);
    }
    return {
      diagnosticMessage,
      errorNode: node,
      typeName: (node as qt.NamedDecl).name,
    };
  }
  function getHeritageClauseVisibilityError(): SymbolAccessibilityDiagnostic {
    let diagnosticMessage: qd.Message;
    if (node.parent?.parent?.kind === Syntax.ClassDeclaration) {
      diagnosticMessage =
        node.parent.kind === Syntax.HeritageClause && node.parent.token === Syntax.ImplementsKeyword
          ? qd.msgs.Implements_clause_of_exported_class_0_has_or_is_using_private_name_1
          : qd.msgs.extends_clause_of_exported_class_0_has_or_is_using_private_name_1;
    } else {
      diagnosticMessage = qd.msgs.extends_clause_of_exported_interface_0_has_or_is_using_private_name_1;
    }
    return {
      diagnosticMessage,
      errorNode: node,
      typeName: qf.decl.nameOf(node.parent.parent as qt.Declaration),
    };
  }
  function getImportEntityNameVisibilityError(): SymbolAccessibilityDiagnostic {
    return {
      diagnosticMessage: qd.msgs.Import_declaration_0_is_using_private_name_1,
      errorNode: node,
      typeName: (node as qt.NamedDecl).name,
    };
  }
  function getTypeAliasDeclarationVisibilityError(): SymbolAccessibilityDiagnostic {
    return {
      diagnosticMessage: qd.msgs.Exported_type_alias_0_has_or_is_using_private_name_1,
      errorNode: (node as qt.AnonymousTypeTypeAliasDeclaration).type,
      typeName: (node as qt.TypeAliasDeclaration).name,
    };
  }
}
