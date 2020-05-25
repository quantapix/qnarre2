/* eslint-disable @typescript-eslint/ban-types */
// auto-generated from './diagnosticInformationMap.generated.ts' by 'src/compiler'

import * as qt from './types';

function diag(code: number, category: qt.DiagnosticCategory, key: string, message: string, reportsUnnecessary?: {}, elidedInCompatabilityPyramid?: boolean): qt.DiagnosticMessage {
  return { code, category, key, message, reportsUnnecessary, elidedInCompatabilityPyramid };
}
export const Diagnostics = {
  Unterminated_string_literal: diag(1002, qt.DiagnosticCategory.Error, 'Unterminated_string_literal_1002', 'Unterminated string literal.'),
  Identifier_expected: diag(1003, qt.DiagnosticCategory.Error, 'Identifier_expected_1003', 'Identifier expected.'),
  _0_expected: diag(1005, qt.DiagnosticCategory.Error, '_0_expected_1005', "'{0}' expected."),
  A_file_cannot_have_a_reference_to_itself: diag(1006, qt.DiagnosticCategory.Error, 'A_file_cannot_have_a_reference_to_itself_1006', 'A file cannot have a reference to itself.'),
  The_parser_expected_to_find_a_to_match_the_token_here: diag(
    1007,
    qt.DiagnosticCategory.Error,
    'The_parser_expected_to_find_a_to_match_the_token_here_1007',
    "The parser expected to find a '}' to match the '{' token here."
  ),
  Trailing_comma_not_allowed: diag(1009, qt.DiagnosticCategory.Error, 'Trailing_comma_not_allowed_1009', 'Trailing comma not allowed.'),
  Asterisk_Slash_expected: diag(1010, qt.DiagnosticCategory.Error, 'Asterisk_Slash_expected_1010', "'*/' expected."),
  An_element_access_expression_should_take_an_argument: diag(
    1011,
    qt.DiagnosticCategory.Error,
    'An_element_access_expression_should_take_an_argument_1011',
    'An element access expression should take an argument.'
  ),
  Unexpected_token: diag(1012, qt.DiagnosticCategory.Error, 'Unexpected_token_1012', 'Unexpected token.'),
  A_rest_parameter_or_binding_pattern_may_not_have_a_trailing_comma: diag(
    1013,
    qt.DiagnosticCategory.Error,
    'A_rest_parameter_or_binding_pattern_may_not_have_a_trailing_comma_1013',
    'A rest parameter or binding pattern may not have a trailing comma.'
  ),
  A_rest_parameter_must_be_last_in_a_parameter_list: diag(
    1014,
    qt.DiagnosticCategory.Error,
    'A_rest_parameter_must_be_last_in_a_parameter_list_1014',
    'A rest parameter must be last in a parameter list.'
  ),
  Parameter_cannot_have_question_mark_and_initializer: diag(
    1015,
    qt.DiagnosticCategory.Error,
    'Parameter_cannot_have_question_mark_and_initializer_1015',
    'Parameter cannot have question mark and initializer.'
  ),
  A_required_parameter_cannot_follow_an_optional_parameter: diag(
    1016,
    qt.DiagnosticCategory.Error,
    'A_required_parameter_cannot_follow_an_optional_parameter_1016',
    'A required parameter cannot follow an optional parameter.'
  ),
  An_index_signature_cannot_have_a_rest_parameter: diag(1017, qt.DiagnosticCategory.Error, 'An_index_signature_cannot_have_a_rest_parameter_1017', 'An index signature cannot have a rest parameter.'),
  An_index_signature_parameter_cannot_have_an_accessibility_modifier: diag(
    1018,
    qt.DiagnosticCategory.Error,
    'An_index_signature_parameter_cannot_have_an_accessibility_modifier_1018',
    'An index signature parameter cannot have an accessibility modifier.'
  ),
  An_index_signature_parameter_cannot_have_a_question_mark: diag(
    1019,
    qt.DiagnosticCategory.Error,
    'An_index_signature_parameter_cannot_have_a_question_mark_1019',
    'An index signature parameter cannot have a question mark.'
  ),
  An_index_signature_parameter_cannot_have_an_initializer: diag(
    1020,
    qt.DiagnosticCategory.Error,
    'An_index_signature_parameter_cannot_have_an_initializer_1020',
    'An index signature parameter cannot have an initializer.'
  ),
  An_index_signature_must_have_a_type_annotation: diag(1021, qt.DiagnosticCategory.Error, 'An_index_signature_must_have_a_type_annotation_1021', 'An index signature must have a type annotation.'),
  An_index_signature_parameter_must_have_a_type_annotation: diag(
    1022,
    qt.DiagnosticCategory.Error,
    'An_index_signature_parameter_must_have_a_type_annotation_1022',
    'An index signature parameter must have a type annotation.'
  ),
  An_index_signature_parameter_type_must_be_either_string_or_number: diag(
    1023,
    qt.DiagnosticCategory.Error,
    'An_index_signature_parameter_type_must_be_either_string_or_number_1023',
    "An index signature parameter type must be either 'string' or 'number'."
  ),
  readonly_modifier_can_only_appear_on_a_property_declaration_or_index_signature: diag(
    1024,
    qt.DiagnosticCategory.Error,
    'readonly_modifier_can_only_appear_on_a_property_declaration_or_index_signature_1024',
    "'readonly' modifier can only appear on a property declaration or index signature."
  ),
  An_index_signature_cannot_have_a_trailing_comma: diag(1025, qt.DiagnosticCategory.Error, 'An_index_signature_cannot_have_a_trailing_comma_1025', 'An index signature cannot have a trailing comma.'),
  Accessibility_modifier_already_seen: diag(1028, qt.DiagnosticCategory.Error, 'Accessibility_modifier_already_seen_1028', 'Accessibility modifier already seen.'),
  _0_modifier_must_precede_1_modifier: diag(1029, qt.DiagnosticCategory.Error, '_0_modifier_must_precede_1_modifier_1029', "'{0}' modifier must precede '{1}' modifier."),
  _0_modifier_already_seen: diag(1030, qt.DiagnosticCategory.Error, '_0_modifier_already_seen_1030', "'{0}' modifier already seen."),
  _0_modifier_cannot_appear_on_a_class_element: diag(1031, qt.DiagnosticCategory.Error, '_0_modifier_cannot_appear_on_a_class_element_1031', "'{0}' modifier cannot appear on a class element."),
  super_must_be_followed_by_an_argument_list_or_member_access: diag(
    1034,
    qt.DiagnosticCategory.Error,
    'super_must_be_followed_by_an_argument_list_or_member_access_1034',
    "'super' must be followed by an argument list or member access."
  ),
  Only_ambient_modules_can_use_quoted_names: diag(1035, qt.DiagnosticCategory.Error, 'Only_ambient_modules_can_use_quoted_names_1035', 'Only ambient modules can use quoted names.'),
  Statements_are_not_allowed_in_ambient_contexts: diag(1036, qt.DiagnosticCategory.Error, 'Statements_are_not_allowed_in_ambient_contexts_1036', 'Statements are not allowed in ambient contexts.'),
  A_declare_modifier_cannot_be_used_in_an_already_ambient_context: diag(
    1038,
    qt.DiagnosticCategory.Error,
    'A_declare_modifier_cannot_be_used_in_an_already_ambient_context_1038',
    "A 'declare' modifier cannot be used in an already ambient context."
  ),
  Initializers_are_not_allowed_in_ambient_contexts: diag(
    1039,
    qt.DiagnosticCategory.Error,
    'Initializers_are_not_allowed_in_ambient_contexts_1039',
    'Initializers are not allowed in ambient contexts.'
  ),
  _0_modifier_cannot_be_used_in_an_ambient_context: diag(
    1040,
    qt.DiagnosticCategory.Error,
    '_0_modifier_cannot_be_used_in_an_ambient_context_1040',
    "'{0}' modifier cannot be used in an ambient context."
  ),
  _0_modifier_cannot_be_used_with_a_class_declaration: diag(
    1041,
    qt.DiagnosticCategory.Error,
    '_0_modifier_cannot_be_used_with_a_class_declaration_1041',
    "'{0}' modifier cannot be used with a class declaration."
  ),
  _0_modifier_cannot_be_used_here: diag(1042, qt.DiagnosticCategory.Error, '_0_modifier_cannot_be_used_here_1042', "'{0}' modifier cannot be used here."),
  _0_modifier_cannot_appear_on_a_data_property: diag(1043, qt.DiagnosticCategory.Error, '_0_modifier_cannot_appear_on_a_data_property_1043', "'{0}' modifier cannot appear on a data property."),
  _0_modifier_cannot_appear_on_a_module_or_namespace_element: diag(
    1044,
    qt.DiagnosticCategory.Error,
    '_0_modifier_cannot_appear_on_a_module_or_namespace_element_1044',
    "'{0}' modifier cannot appear on a module or namespace element."
  ),
  A_0_modifier_cannot_be_used_with_an_interface_declaration: diag(
    1045,
    qt.DiagnosticCategory.Error,
    'A_0_modifier_cannot_be_used_with_an_interface_declaration_1045',
    "A '{0}' modifier cannot be used with an interface declaration."
  ),
  Top_level_declarations_in_d_ts_files_must_start_with_either_a_declare_or_export_modifier: diag(
    1046,
    qt.DiagnosticCategory.Error,
    'Top_level_declarations_in_d_ts_files_must_start_with_either_a_declare_or_export_modifier_1046',
    "Top-level declarations in .d.ts files must start with either a 'declare' or 'export' modifier."
  ),
  A_rest_parameter_cannot_be_optional: diag(1047, qt.DiagnosticCategory.Error, 'A_rest_parameter_cannot_be_optional_1047', 'A rest parameter cannot be optional.'),
  A_rest_parameter_cannot_have_an_initializer: diag(1048, qt.DiagnosticCategory.Error, 'A_rest_parameter_cannot_have_an_initializer_1048', 'A rest parameter cannot have an initializer.'),
  A_set_accessor_must_have_exactly_one_parameter: diag(1049, qt.DiagnosticCategory.Error, 'A_set_accessor_must_have_exactly_one_parameter_1049', "A 'set' accessor must have exactly one parameter."),
  A_set_accessor_cannot_have_an_optional_parameter: diag(
    1051,
    qt.DiagnosticCategory.Error,
    'A_set_accessor_cannot_have_an_optional_parameter_1051',
    "A 'set' accessor cannot have an optional parameter."
  ),
  A_set_accessor_parameter_cannot_have_an_initializer: diag(
    1052,
    qt.DiagnosticCategory.Error,
    'A_set_accessor_parameter_cannot_have_an_initializer_1052',
    "A 'set' accessor parameter cannot have an initializer."
  ),
  A_set_accessor_cannot_have_rest_parameter: diag(1053, qt.DiagnosticCategory.Error, 'A_set_accessor_cannot_have_rest_parameter_1053', "A 'set' accessor cannot have rest parameter."),
  A_get_accessor_cannot_have_parameters: diag(1054, qt.DiagnosticCategory.Error, 'A_get_accessor_cannot_have_parameters_1054', "A 'get' accessor cannot have parameters."),
  Type_0_is_not_a_valid_async_function_return_type_in_ES5_SlashES3_because_it_does_not_refer_to_a_Promise_compatible_constructor_value: diag(
    1055,
    qt.DiagnosticCategory.Error,
    'Type_0_is_not_a_valid_async_function_return_type_in_ES5_SlashES3_because_it_does_not_refer_to_a_Prom_1055',
    "Type '{0}' is not a valid async function return type in ES5/ES3 because it does not refer to a Promise-compatible constructor value."
  ),
  Accessors_are_only_available_when_targeting_ECMAScript_5_and_higher: diag(
    1056,
    qt.DiagnosticCategory.Error,
    'Accessors_are_only_available_when_targeting_ECMAScript_5_and_higher_1056',
    'Accessors are only available when targeting ECMAScript 5 and higher.'
  ),
  An_async_function_or_method_must_have_a_valid_awaitable_return_type: diag(
    1057,
    qt.DiagnosticCategory.Error,
    'An_async_function_or_method_must_have_a_valid_awaitable_return_type_1057',
    'An async function or method must have a valid awaitable return type.'
  ),
  The_return_type_of_an_async_function_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member: diag(
    1058,
    qt.DiagnosticCategory.Error,
    'The_return_type_of_an_async_function_must_either_be_a_valid_promise_or_must_not_contain_a_callable_t_1058',
    "The return type of an async function must either be a valid promise or must not contain a callable 'then' member."
  ),
  A_promise_must_have_a_then_method: diag(1059, qt.DiagnosticCategory.Error, 'A_promise_must_have_a_then_method_1059', "A promise must have a 'then' method."),
  The_first_parameter_of_the_then_method_of_a_promise_must_be_a_callback: diag(
    1060,
    qt.DiagnosticCategory.Error,
    'The_first_parameter_of_the_then_method_of_a_promise_must_be_a_callback_1060',
    "The first parameter of the 'then' method of a promise must be a callback."
  ),
  Enum_member_must_have_initializer: diag(1061, qt.DiagnosticCategory.Error, 'Enum_member_must_have_initializer_1061', 'Enum member must have initializer.'),
  Type_is_referenced_directly_or_indirectly_in_the_fulfillment_callback_of_its_own_then_method: diag(
    1062,
    qt.DiagnosticCategory.Error,
    'Type_is_referenced_directly_or_indirectly_in_the_fulfillment_callback_of_its_own_then_method_1062',
    "Type is referenced directly or indirectly in the fulfillment callback of its own 'then' method."
  ),
  An_export_assignment_cannot_be_used_in_a_namespace: diag(
    1063,
    qt.DiagnosticCategory.Error,
    'An_export_assignment_cannot_be_used_in_a_namespace_1063',
    'An export assignment cannot be used in a namespace.'
  ),
  The_return_type_of_an_async_function_or_method_must_be_the_global_Promise_T_type: diag(
    1064,
    qt.DiagnosticCategory.Error,
    'The_return_type_of_an_async_function_or_method_must_be_the_global_Promise_T_type_1064',
    'The return type of an async function or method must be the global Promise<T> type.'
  ),
  In_ambient_enum_declarations_member_initializer_must_be_constant_expression: diag(
    1066,
    qt.DiagnosticCategory.Error,
    'In_ambient_enum_declarations_member_initializer_must_be_constant_expression_1066',
    'In ambient enum declarations member initializer must be constant expression.'
  ),
  Unexpected_token_A_constructor_method_accessor_or_property_was_expected: diag(
    1068,
    qt.DiagnosticCategory.Error,
    'Unexpected_token_A_constructor_method_accessor_or_property_was_expected_1068',
    'Unexpected token. A constructor, method, accessor, or property was expected.'
  ),
  Unexpected_token_A_type_parameter_name_was_expected_without_curly_braces: diag(
    1069,
    qt.DiagnosticCategory.Error,
    'Unexpected_token_A_type_parameter_name_was_expected_without_curly_braces_1069',
    'Unexpected token. A type parameter name was expected without curly braces.'
  ),
  _0_modifier_cannot_appear_on_a_type_member: diag(1070, qt.DiagnosticCategory.Error, '_0_modifier_cannot_appear_on_a_type_member_1070', "'{0}' modifier cannot appear on a type member."),
  _0_modifier_cannot_appear_on_an_index_signature: diag(
    1071,
    qt.DiagnosticCategory.Error,
    '_0_modifier_cannot_appear_on_an_index_signature_1071',
    "'{0}' modifier cannot appear on an index signature."
  ),
  A_0_modifier_cannot_be_used_with_an_import_declaration: diag(
    1079,
    qt.DiagnosticCategory.Error,
    'A_0_modifier_cannot_be_used_with_an_import_declaration_1079',
    "A '{0}' modifier cannot be used with an import declaration."
  ),
  Invalid_reference_directive_syntax: diag(1084, qt.DiagnosticCategory.Error, 'Invalid_reference_directive_syntax_1084', "Invalid 'reference' directive syntax."),
  Octal_literals_are_not_available_when_targeting_ECMAScript_5_and_higher_Use_the_syntax_0: diag(
    1085,
    qt.DiagnosticCategory.Error,
    'Octal_literals_are_not_available_when_targeting_ECMAScript_5_and_higher_Use_the_syntax_0_1085',
    "Octal literals are not available when targeting ECMAScript 5 and higher. Use the syntax '{0}'."
  ),
  _0_modifier_cannot_appear_on_a_constructor_declaration: diag(
    1089,
    qt.DiagnosticCategory.Error,
    '_0_modifier_cannot_appear_on_a_constructor_declaration_1089',
    "'{0}' modifier cannot appear on a constructor declaration."
  ),
  _0_modifier_cannot_appear_on_a_parameter: diag(1090, qt.DiagnosticCategory.Error, '_0_modifier_cannot_appear_on_a_parameter_1090', "'{0}' modifier cannot appear on a parameter."),
  Only_a_single_variable_declaration_is_allowed_in_a_for_in_statement: diag(
    1091,
    qt.DiagnosticCategory.Error,
    'Only_a_single_variable_declaration_is_allowed_in_a_for_in_statement_1091',
    "Only a single variable declaration is allowed in a 'for...in' statement."
  ),
  Type_parameters_cannot_appear_on_a_constructor_declaration: diag(
    1092,
    qt.DiagnosticCategory.Error,
    'Type_parameters_cannot_appear_on_a_constructor_declaration_1092',
    'Type parameters cannot appear on a constructor declaration.'
  ),
  Type_annotation_cannot_appear_on_a_constructor_declaration: diag(
    1093,
    qt.DiagnosticCategory.Error,
    'Type_annotation_cannot_appear_on_a_constructor_declaration_1093',
    'Type annotation cannot appear on a constructor declaration.'
  ),
  An_accessor_cannot_have_type_parameters: diag(1094, qt.DiagnosticCategory.Error, 'An_accessor_cannot_have_type_parameters_1094', 'An accessor cannot have type parameters.'),
  A_set_accessor_cannot_have_a_return_type_annotation: diag(
    1095,
    qt.DiagnosticCategory.Error,
    'A_set_accessor_cannot_have_a_return_type_annotation_1095',
    "A 'set' accessor cannot have a return type annotation."
  ),
  An_index_signature_must_have_exactly_one_parameter: diag(
    1096,
    qt.DiagnosticCategory.Error,
    'An_index_signature_must_have_exactly_one_parameter_1096',
    'An index signature must have exactly one parameter.'
  ),
  _0_list_cannot_be_empty: diag(1097, qt.DiagnosticCategory.Error, '_0_list_cannot_be_empty_1097', "'{0}' list cannot be empty."),
  Type_parameter_list_cannot_be_empty: diag(1098, qt.DiagnosticCategory.Error, 'Type_parameter_list_cannot_be_empty_1098', 'Type parameter list cannot be empty.'),
  Type_argument_list_cannot_be_empty: diag(1099, qt.DiagnosticCategory.Error, 'Type_argument_list_cannot_be_empty_1099', 'Type argument list cannot be empty.'),
  Invalid_use_of_0_in_strict_mode: diag(1100, qt.DiagnosticCategory.Error, 'Invalid_use_of_0_in_strict_mode_1100', "Invalid use of '{0}' in strict mode."),
  with_statements_are_not_allowed_in_strict_mode: diag(1101, qt.DiagnosticCategory.Error, 'with_statements_are_not_allowed_in_strict_mode_1101', "'with' statements are not allowed in strict mode."),
  delete_cannot_be_called_on_an_identifier_in_strict_mode: diag(
    1102,
    qt.DiagnosticCategory.Error,
    'delete_cannot_be_called_on_an_identifier_in_strict_mode_1102',
    "'delete' cannot be called on an identifier in strict mode."
  ),
  A_for_await_of_statement_is_only_allowed_within_an_async_function_or_async_generator: diag(
    1103,
    qt.DiagnosticCategory.Error,
    'A_for_await_of_statement_is_only_allowed_within_an_async_function_or_async_generator_1103',
    "A 'for-await-of' statement is only allowed within an async function or async generator."
  ),
  A_continue_statement_can_only_be_used_within_an_enclosing_iteration_statement: diag(
    1104,
    qt.DiagnosticCategory.Error,
    'A_continue_statement_can_only_be_used_within_an_enclosing_iteration_statement_1104',
    "A 'continue' statement can only be used within an enclosing iteration statement."
  ),
  A_break_statement_can_only_be_used_within_an_enclosing_iteration_or_switch_statement: diag(
    1105,
    qt.DiagnosticCategory.Error,
    'A_break_statement_can_only_be_used_within_an_enclosing_iteration_or_switch_statement_1105',
    "A 'break' statement can only be used within an enclosing iteration or switch statement."
  ),
  Jump_target_cannot_cross_function_boundary: diag(1107, qt.DiagnosticCategory.Error, 'Jump_target_cannot_cross_function_boundary_1107', 'Jump target cannot cross function boundary.'),
  A_return_statement_can_only_be_used_within_a_function_body: diag(
    1108,
    qt.DiagnosticCategory.Error,
    'A_return_statement_can_only_be_used_within_a_function_body_1108',
    "A 'return' statement can only be used within a function body."
  ),
  Expression_expected: diag(1109, qt.DiagnosticCategory.Error, 'Expression_expected_1109', 'Expression expected.'),
  Type_expected: diag(1110, qt.DiagnosticCategory.Error, 'Type_expected_1110', 'Type expected.'),
  A_default_clause_cannot_appear_more_than_once_in_a_switch_statement: diag(
    1113,
    qt.DiagnosticCategory.Error,
    'A_default_clause_cannot_appear_more_than_once_in_a_switch_statement_1113',
    "A 'default' clause cannot appear more than once in a 'switch' statement."
  ),
  Duplicate_label_0: diag(1114, qt.DiagnosticCategory.Error, 'Duplicate_label_0_1114', "Duplicate label '{0}'."),
  A_continue_statement_can_only_jump_to_a_label_of_an_enclosing_iteration_statement: diag(
    1115,
    qt.DiagnosticCategory.Error,
    'A_continue_statement_can_only_jump_to_a_label_of_an_enclosing_iteration_statement_1115',
    "A 'continue' statement can only jump to a label of an enclosing iteration statement."
  ),
  A_break_statement_can_only_jump_to_a_label_of_an_enclosing_statement: diag(
    1116,
    qt.DiagnosticCategory.Error,
    'A_break_statement_can_only_jump_to_a_label_of_an_enclosing_statement_1116',
    "A 'break' statement can only jump to a label of an enclosing statement."
  ),
  An_object_literal_cannot_have_multiple_properties_with_the_same_name_in_strict_mode: diag(
    1117,
    qt.DiagnosticCategory.Error,
    'An_object_literal_cannot_have_multiple_properties_with_the_same_name_in_strict_mode_1117',
    'An object literal cannot have multiple properties with the same name in strict mode.'
  ),
  An_object_literal_cannot_have_multiple_get_Slashset_accessors_with_the_same_name: diag(
    1118,
    qt.DiagnosticCategory.Error,
    'An_object_literal_cannot_have_multiple_get_Slashset_accessors_with_the_same_name_1118',
    'An object literal cannot have multiple get/set accessors with the same name.'
  ),
  An_object_literal_cannot_have_property_and_accessor_with_the_same_name: diag(
    1119,
    qt.DiagnosticCategory.Error,
    'An_object_literal_cannot_have_property_and_accessor_with_the_same_name_1119',
    'An object literal cannot have property and accessor with the same name.'
  ),
  An_export_assignment_cannot_have_modifiers: diag(1120, qt.DiagnosticCategory.Error, 'An_export_assignment_cannot_have_modifiers_1120', 'An export assignment cannot have modifiers.'),
  Octal_literals_are_not_allowed_in_strict_mode: diag(1121, qt.DiagnosticCategory.Error, 'Octal_literals_are_not_allowed_in_strict_mode_1121', 'Octal literals are not allowed in strict mode.'),
  Variable_declaration_list_cannot_be_empty: diag(1123, qt.DiagnosticCategory.Error, 'Variable_declaration_list_cannot_be_empty_1123', 'Variable declaration list cannot be empty.'),
  Digit_expected: diag(1124, qt.DiagnosticCategory.Error, 'Digit_expected_1124', 'Digit expected.'),
  Hexadecimal_digit_expected: diag(1125, qt.DiagnosticCategory.Error, 'Hexadecimal_digit_expected_1125', 'Hexadecimal digit expected.'),
  Unexpected_end_of_text: diag(1126, qt.DiagnosticCategory.Error, 'Unexpected_end_of_text_1126', 'Unexpected end of text.'),
  Invalid_character: diag(1127, qt.DiagnosticCategory.Error, 'Invalid_character_1127', 'Invalid character.'),
  Declaration_or_statement_expected: diag(1128, qt.DiagnosticCategory.Error, 'Declaration_or_statement_expected_1128', 'Declaration or statement expected.'),
  Statement_expected: diag(1129, qt.DiagnosticCategory.Error, 'Statement_expected_1129', 'Statement expected.'),
  case_or_default_expected: diag(1130, qt.DiagnosticCategory.Error, 'case_or_default_expected_1130', "'case' or 'default' expected."),
  Property_or_signature_expected: diag(1131, qt.DiagnosticCategory.Error, 'Property_or_signature_expected_1131', 'Property or signature expected.'),
  Enum_member_expected: diag(1132, qt.DiagnosticCategory.Error, 'Enum_member_expected_1132', 'Enum member expected.'),
  Variable_declaration_expected: diag(1134, qt.DiagnosticCategory.Error, 'Variable_declaration_expected_1134', 'Variable declaration expected.'),
  Argument_expression_expected: diag(1135, qt.DiagnosticCategory.Error, 'Argument_expression_expected_1135', 'Argument expression expected.'),
  Property_assignment_expected: diag(1136, qt.DiagnosticCategory.Error, 'Property_assignment_expected_1136', 'Property assignment expected.'),
  Expression_or_comma_expected: diag(1137, qt.DiagnosticCategory.Error, 'Expression_or_comma_expected_1137', 'Expression or comma expected.'),
  Parameter_declaration_expected: diag(1138, qt.DiagnosticCategory.Error, 'Parameter_declaration_expected_1138', 'Parameter declaration expected.'),
  Type_parameter_declaration_expected: diag(1139, qt.DiagnosticCategory.Error, 'Type_parameter_declaration_expected_1139', 'Type parameter declaration expected.'),
  Type_argument_expected: diag(1140, qt.DiagnosticCategory.Error, 'Type_argument_expected_1140', 'Type argument expected.'),
  String_literal_expected: diag(1141, qt.DiagnosticCategory.Error, 'String_literal_expected_1141', 'String literal expected.'),
  Line_break_not_permitted_here: diag(1142, qt.DiagnosticCategory.Error, 'Line_break_not_permitted_here_1142', 'Line break not permitted here.'),
  or_expected: diag(1144, qt.DiagnosticCategory.Error, 'or_expected_1144', "'{' or ';' expected."),
  Declaration_expected: diag(1146, qt.DiagnosticCategory.Error, 'Declaration_expected_1146', 'Declaration expected.'),
  Import_declarations_in_a_namespace_cannot_reference_a_module: diag(
    1147,
    qt.DiagnosticCategory.Error,
    'Import_declarations_in_a_namespace_cannot_reference_a_module_1147',
    'Import declarations in a namespace cannot reference a module.'
  ),
  Cannot_use_imports_exports_or_module_augmentations_when_module_is_none: diag(
    1148,
    qt.DiagnosticCategory.Error,
    'Cannot_use_imports_exports_or_module_augmentations_when_module_is_none_1148',
    "Cannot use imports, exports, or module augmentations when '--module' is 'none'."
  ),
  File_name_0_differs_from_already_included_file_name_1_only_in_casing: diag(
    1149,
    qt.DiagnosticCategory.Error,
    'File_name_0_differs_from_already_included_file_name_1_only_in_casing_1149',
    "File name '{0}' differs from already included file name '{1}' only in casing."
  ),
  const_declarations_must_be_initialized: diag(1155, qt.DiagnosticCategory.Error, 'const_declarations_must_be_initialized_1155', "'const' declarations must be initialized."),
  const_declarations_can_only_be_declared_inside_a_block: diag(
    1156,
    qt.DiagnosticCategory.Error,
    'const_declarations_can_only_be_declared_inside_a_block_1156',
    "'const' declarations can only be declared inside a block."
  ),
  let_declarations_can_only_be_declared_inside_a_block: diag(
    1157,
    qt.DiagnosticCategory.Error,
    'let_declarations_can_only_be_declared_inside_a_block_1157',
    "'let' declarations can only be declared inside a block."
  ),
  Unterminated_template_literal: diag(1160, qt.DiagnosticCategory.Error, 'Unterminated_template_literal_1160', 'Unterminated template literal.'),
  Unterminated_regular_expression_literal: diag(1161, qt.DiagnosticCategory.Error, 'Unterminated_regular_expression_literal_1161', 'Unterminated regular expression literal.'),
  An_object_member_cannot_be_declared_optional: diag(1162, qt.DiagnosticCategory.Error, 'An_object_member_cannot_be_declared_optional_1162', 'An object member cannot be declared optional.'),
  A_yield_expression_is_only_allowed_in_a_generator_body: diag(
    1163,
    qt.DiagnosticCategory.Error,
    'A_yield_expression_is_only_allowed_in_a_generator_body_1163',
    "A 'yield' expression is only allowed in a generator body."
  ),
  Computed_property_names_are_not_allowed_in_enums: diag(
    1164,
    qt.DiagnosticCategory.Error,
    'Computed_property_names_are_not_allowed_in_enums_1164',
    'Computed property names are not allowed in enums.'
  ),
  A_computed_property_name_in_an_ambient_context_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type: diag(
    1165,
    qt.DiagnosticCategory.Error,
    'A_computed_property_name_in_an_ambient_context_must_refer_to_an_expression_whose_type_is_a_literal_t_1165',
    "A computed property name in an ambient context must refer to an expression whose type is a literal type or a 'unique symbol' type."
  ),
  A_computed_property_name_in_a_class_property_declaration_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type: diag(
    1166,
    qt.DiagnosticCategory.Error,
    'A_computed_property_name_in_a_class_property_declaration_must_refer_to_an_expression_whose_type_is_a_1166',
    "A computed property name in a class property declaration must refer to an expression whose type is a literal type or a 'unique symbol' type."
  ),
  A_computed_property_name_in_a_method_overload_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type: diag(
    1168,
    qt.DiagnosticCategory.Error,
    'A_computed_property_name_in_a_method_overload_must_refer_to_an_expression_whose_type_is_a_literal_ty_1168',
    "A computed property name in a method overload must refer to an expression whose type is a literal type or a 'unique symbol' type."
  ),
  A_computed_property_name_in_an_interface_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type: diag(
    1169,
    qt.DiagnosticCategory.Error,
    'A_computed_property_name_in_an_interface_must_refer_to_an_expression_whose_type_is_a_literal_type_or_1169',
    "A computed property name in an interface must refer to an expression whose type is a literal type or a 'unique symbol' type."
  ),
  A_computed_property_name_in_a_type_literal_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type: diag(
    1170,
    qt.DiagnosticCategory.Error,
    'A_computed_property_name_in_a_type_literal_must_refer_to_an_expression_whose_type_is_a_literal_type__1170',
    "A computed property name in a type literal must refer to an expression whose type is a literal type or a 'unique symbol' type."
  ),
  A_comma_expression_is_not_allowed_in_a_computed_property_name: diag(
    1171,
    qt.DiagnosticCategory.Error,
    'A_comma_expression_is_not_allowed_in_a_computed_property_name_1171',
    'A comma expression is not allowed in a computed property name.'
  ),
  extends_clause_already_seen: diag(1172, qt.DiagnosticCategory.Error, 'extends_clause_already_seen_1172', "'extends' clause already seen."),
  extends_clause_must_precede_implements_clause: diag(1173, qt.DiagnosticCategory.Error, 'extends_clause_must_precede_implements_clause_1173', "'extends' clause must precede 'implements' clause."),
  Classes_can_only_extend_a_single_class: diag(1174, qt.DiagnosticCategory.Error, 'Classes_can_only_extend_a_single_class_1174', 'Classes can only extend a single class.'),
  implements_clause_already_seen: diag(1175, qt.DiagnosticCategory.Error, 'implements_clause_already_seen_1175', "'implements' clause already seen."),
  Interface_declaration_cannot_have_implements_clause: diag(
    1176,
    qt.DiagnosticCategory.Error,
    'Interface_declaration_cannot_have_implements_clause_1176',
    "Interface declaration cannot have 'implements' clause."
  ),
  Binary_digit_expected: diag(1177, qt.DiagnosticCategory.Error, 'Binary_digit_expected_1177', 'Binary digit expected.'),
  Octal_digit_expected: diag(1178, qt.DiagnosticCategory.Error, 'Octal_digit_expected_1178', 'Octal digit expected.'),
  Unexpected_token_expected: diag(1179, qt.DiagnosticCategory.Error, 'Unexpected_token_expected_1179', "Unexpected token. '{' expected."),
  Property_destructuring_pattern_expected: diag(1180, qt.DiagnosticCategory.Error, 'Property_destructuring_pattern_expected_1180', 'Property destructuring pattern expected.'),
  Array_element_destructuring_pattern_expected: diag(1181, qt.DiagnosticCategory.Error, 'Array_element_destructuring_pattern_expected_1181', 'Array element destructuring pattern expected.'),
  A_destructuring_declaration_must_have_an_initializer: diag(
    1182,
    qt.DiagnosticCategory.Error,
    'A_destructuring_declaration_must_have_an_initializer_1182',
    'A destructuring declaration must have an initializer.'
  ),
  An_implementation_cannot_be_declared_in_ambient_contexts: diag(
    1183,
    qt.DiagnosticCategory.Error,
    'An_implementation_cannot_be_declared_in_ambient_contexts_1183',
    'An implementation cannot be declared in ambient contexts.'
  ),
  Modifiers_cannot_appear_here: diag(1184, qt.DiagnosticCategory.Error, 'Modifiers_cannot_appear_here_1184', 'Modifiers cannot appear here.'),
  Merge_conflict_marker_encountered: diag(1185, qt.DiagnosticCategory.Error, 'Merge_conflict_marker_encountered_1185', 'Merge conflict marker encountered.'),
  A_rest_element_cannot_have_an_initializer: diag(1186, qt.DiagnosticCategory.Error, 'A_rest_element_cannot_have_an_initializer_1186', 'A rest element cannot have an initializer.'),
  A_parameter_property_may_not_be_declared_using_a_binding_pattern: diag(
    1187,
    qt.DiagnosticCategory.Error,
    'A_parameter_property_may_not_be_declared_using_a_binding_pattern_1187',
    'A parameter property may not be declared using a binding pattern.'
  ),
  Only_a_single_variable_declaration_is_allowed_in_a_for_of_statement: diag(
    1188,
    qt.DiagnosticCategory.Error,
    'Only_a_single_variable_declaration_is_allowed_in_a_for_of_statement_1188',
    "Only a single variable declaration is allowed in a 'for...of' statement."
  ),
  The_variable_declaration_of_a_for_in_statement_cannot_have_an_initializer: diag(
    1189,
    qt.DiagnosticCategory.Error,
    'The_variable_declaration_of_a_for_in_statement_cannot_have_an_initializer_1189',
    "The variable declaration of a 'for...in' statement cannot have an initializer."
  ),
  The_variable_declaration_of_a_for_of_statement_cannot_have_an_initializer: diag(
    1190,
    qt.DiagnosticCategory.Error,
    'The_variable_declaration_of_a_for_of_statement_cannot_have_an_initializer_1190',
    "The variable declaration of a 'for...of' statement cannot have an initializer."
  ),
  An_import_declaration_cannot_have_modifiers: diag(1191, qt.DiagnosticCategory.Error, 'An_import_declaration_cannot_have_modifiers_1191', 'An import declaration cannot have modifiers.'),
  Module_0_has_no_default_export: diag(1192, qt.DiagnosticCategory.Error, 'Module_0_has_no_default_export_1192', "Module '{0}' has no default export."),
  An_export_declaration_cannot_have_modifiers: diag(1193, qt.DiagnosticCategory.Error, 'An_export_declaration_cannot_have_modifiers_1193', 'An export declaration cannot have modifiers.'),
  Export_declarations_are_not_permitted_in_a_namespace: diag(
    1194,
    qt.DiagnosticCategory.Error,
    'Export_declarations_are_not_permitted_in_a_namespace_1194',
    'Export declarations are not permitted in a namespace.'
  ),
  export_Asterisk_does_not_re_export_a_default: diag(1195, qt.DiagnosticCategory.Error, 'export_Asterisk_does_not_re_export_a_default_1195', "'export *' does not re-export a default."),
  Catch_clause_variable_cannot_have_a_type_annotation: diag(
    1196,
    qt.DiagnosticCategory.Error,
    'Catch_clause_variable_cannot_have_a_type_annotation_1196',
    'Catch clause variable cannot have a type annotation.'
  ),
  Catch_clause_variable_cannot_have_an_initializer: diag(
    1197,
    qt.DiagnosticCategory.Error,
    'Catch_clause_variable_cannot_have_an_initializer_1197',
    'Catch clause variable cannot have an initializer.'
  ),
  An_extended_Unicode_escape_value_must_be_between_0x0_and_0x10FFFF_inclusive: diag(
    1198,
    qt.DiagnosticCategory.Error,
    'An_extended_Unicode_escape_value_must_be_between_0x0_and_0x10FFFF_inclusive_1198',
    'An extended Unicode escape value must be between 0x0 and 0x10FFFF inclusive.'
  ),
  Unterminated_Unicode_escape_sequence: diag(1199, qt.DiagnosticCategory.Error, 'Unterminated_Unicode_escape_sequence_1199', 'Unterminated Unicode escape sequence.'),
  Line_terminator_not_permitted_before_arrow: diag(1200, qt.DiagnosticCategory.Error, 'Line_terminator_not_permitted_before_arrow_1200', 'Line terminator not permitted before arrow.'),
  Import_assignment_cannot_be_used_when_targeting_ECMAScript_modules_Consider_using_import_Asterisk_as_ns_from_mod_import_a_from_mod_import_d_from_mod_or_another_module_format_instead: diag(
    1202,
    qt.DiagnosticCategory.Error,
    'Import_assignment_cannot_be_used_when_targeting_ECMAScript_modules_Consider_using_import_Asterisk_as_1202',
    'Import assignment cannot be used when targeting ECMAScript modules. Consider using \'import * as ns from "mod"\', \'import {a} from "mod"\', \'import d from "mod"\', or another module format instead.'
  ),
  Export_assignment_cannot_be_used_when_targeting_ECMAScript_modules_Consider_using_export_default_or_another_module_format_instead: diag(
    1203,
    qt.DiagnosticCategory.Error,
    'Export_assignment_cannot_be_used_when_targeting_ECMAScript_modules_Consider_using_export_default_or__1203',
    "Export assignment cannot be used when targeting ECMAScript modules. Consider using 'export default' or another module format instead."
  ),
  Re_exporting_a_type_when_the_isolatedModules_flag_is_provided_requires_using_export_type: diag(
    1205,
    qt.DiagnosticCategory.Error,
    'Re_exporting_a_type_when_the_isolatedModules_flag_is_provided_requires_using_export_type_1205',
    "Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'."
  ),
  Decorators_are_not_valid_here: diag(1206, qt.DiagnosticCategory.Error, 'Decorators_are_not_valid_here_1206', 'Decorators are not valid here.'),
  Decorators_cannot_be_applied_to_multiple_get_Slashset_accessors_of_the_same_name: diag(
    1207,
    qt.DiagnosticCategory.Error,
    'Decorators_cannot_be_applied_to_multiple_get_Slashset_accessors_of_the_same_name_1207',
    'Decorators cannot be applied to multiple get/set accessors of the same name.'
  ),
  All_files_must_be_modules_when_the_isolatedModules_flag_is_provided: diag(
    1208,
    qt.DiagnosticCategory.Error,
    'All_files_must_be_modules_when_the_isolatedModules_flag_is_provided_1208',
    "All files must be modules when the '--isolatedModules' flag is provided."
  ),
  Invalid_use_of_0_Class_definitions_are_automatically_in_strict_mode: diag(
    1210,
    qt.DiagnosticCategory.Error,
    'Invalid_use_of_0_Class_definitions_are_automatically_in_strict_mode_1210',
    "Invalid use of '{0}'. Class definitions are automatically in strict mode."
  ),
  A_class_declaration_without_the_default_modifier_must_have_a_name: diag(
    1211,
    qt.DiagnosticCategory.Error,
    'A_class_declaration_without_the_default_modifier_must_have_a_name_1211',
    "A class declaration without the 'default' modifier must have a name."
  ),
  Identifier_expected_0_is_a_reserved_word_in_strict_mode: diag(
    1212,
    qt.DiagnosticCategory.Error,
    'Identifier_expected_0_is_a_reserved_word_in_strict_mode_1212',
    "Identifier expected. '{0}' is a reserved word in strict mode."
  ),
  Identifier_expected_0_is_a_reserved_word_in_strict_mode_Class_definitions_are_automatically_in_strict_mode: diag(
    1213,
    qt.DiagnosticCategory.Error,
    'Identifier_expected_0_is_a_reserved_word_in_strict_mode_Class_definitions_are_automatically_in_stric_1213',
    "Identifier expected. '{0}' is a reserved word in strict mode. Class definitions are automatically in strict mode."
  ),
  Identifier_expected_0_is_a_reserved_word_in_strict_mode_Modules_are_automatically_in_strict_mode: diag(
    1214,
    qt.DiagnosticCategory.Error,
    'Identifier_expected_0_is_a_reserved_word_in_strict_mode_Modules_are_automatically_in_strict_mode_1214',
    "Identifier expected. '{0}' is a reserved word in strict mode. Modules are automatically in strict mode."
  ),
  Invalid_use_of_0_Modules_are_automatically_in_strict_mode: diag(
    1215,
    qt.DiagnosticCategory.Error,
    'Invalid_use_of_0_Modules_are_automatically_in_strict_mode_1215',
    "Invalid use of '{0}'. Modules are automatically in strict mode."
  ),
  Identifier_expected_esModule_is_reserved_as_an_exported_marker_when_transforming_ECMAScript_modules: diag(
    1216,
    qt.DiagnosticCategory.Error,
    'Identifier_expected_esModule_is_reserved_as_an_exported_marker_when_transforming_ECMAScript_modules_1216',
    "Identifier expected. '__esModule' is reserved as an exported marker when transforming ECMAScript modules."
  ),
  Export_assignment_is_not_supported_when_module_flag_is_system: diag(
    1218,
    qt.DiagnosticCategory.Error,
    'Export_assignment_is_not_supported_when_module_flag_is_system_1218',
    "Export assignment is not supported when '--module' flag is 'system'."
  ),
  Experimental_support_for_decorators_is_a_feature_that_is_subject_to_change_in_a_future_release_Set_the_experimentalDecorators_option_in_your_tsconfig_or_jsconfig_to_remove_this_warning: diag(
    1219,
    qt.DiagnosticCategory.Error,
    'Experimental_support_for_decorators_is_a_feature_that_is_subject_to_change_in_a_future_release_Set_t_1219',
    "Experimental support for decorators is a feature that is subject to change in a future release. Set the 'experimentalDecorators' option in your 'tsconfig' or 'jsconfig' to remove this warning."
  ),
  Generators_are_only_available_when_targeting_ECMAScript_2015_or_higher: diag(
    1220,
    qt.DiagnosticCategory.Error,
    'Generators_are_only_available_when_targeting_ECMAScript_2015_or_higher_1220',
    'Generators are only available when targeting ECMAScript 2015 or higher.'
  ),
  Generators_are_not_allowed_in_an_ambient_context: diag(
    1221,
    qt.DiagnosticCategory.Error,
    'Generators_are_not_allowed_in_an_ambient_context_1221',
    'Generators are not allowed in an ambient context.'
  ),
  An_overload_signature_cannot_be_declared_as_a_generator: diag(
    1222,
    qt.DiagnosticCategory.Error,
    'An_overload_signature_cannot_be_declared_as_a_generator_1222',
    'An overload signature cannot be declared as a generator.'
  ),
  _0_tag_already_specified: diag(1223, qt.DiagnosticCategory.Error, '_0_tag_already_specified_1223', "'{0}' tag already specified."),
  Signature_0_must_be_a_type_predicate: diag(1224, qt.DiagnosticCategory.Error, 'Signature_0_must_be_a_type_predicate_1224', "Signature '{0}' must be a type predicate."),
  Cannot_find_parameter_0: diag(1225, qt.DiagnosticCategory.Error, 'Cannot_find_parameter_0_1225', "Cannot find parameter '{0}'."),
  Type_predicate_0_is_not_assignable_to_1: diag(1226, qt.DiagnosticCategory.Error, 'Type_predicate_0_is_not_assignable_to_1_1226', "Type predicate '{0}' is not assignable to '{1}'."),
  Parameter_0_is_not_in_the_same_position_as_parameter_1: diag(
    1227,
    qt.DiagnosticCategory.Error,
    'Parameter_0_is_not_in_the_same_position_as_parameter_1_1227',
    "Parameter '{0}' is not in the same position as parameter '{1}'."
  ),
  A_type_predicate_is_only_allowed_in_return_type_position_for_functions_and_methods: diag(
    1228,
    qt.DiagnosticCategory.Error,
    'A_type_predicate_is_only_allowed_in_return_type_position_for_functions_and_methods_1228',
    'A type predicate is only allowed in return type position for functions and methods.'
  ),
  A_type_predicate_cannot_reference_a_rest_parameter: diag(
    1229,
    qt.DiagnosticCategory.Error,
    'A_type_predicate_cannot_reference_a_rest_parameter_1229',
    'A type predicate cannot reference a rest parameter.'
  ),
  A_type_predicate_cannot_reference_element_0_in_a_binding_pattern: diag(
    1230,
    qt.DiagnosticCategory.Error,
    'A_type_predicate_cannot_reference_element_0_in_a_binding_pattern_1230',
    "A type predicate cannot reference element '{0}' in a binding pattern."
  ),
  An_export_assignment_can_only_be_used_in_a_module: diag(
    1231,
    qt.DiagnosticCategory.Error,
    'An_export_assignment_can_only_be_used_in_a_module_1231',
    'An export assignment can only be used in a module.'
  ),
  An_import_declaration_can_only_be_used_in_a_namespace_or_module: diag(
    1232,
    qt.DiagnosticCategory.Error,
    'An_import_declaration_can_only_be_used_in_a_namespace_or_module_1232',
    'An import declaration can only be used in a namespace or module.'
  ),
  An_export_declaration_can_only_be_used_in_a_module: diag(
    1233,
    qt.DiagnosticCategory.Error,
    'An_export_declaration_can_only_be_used_in_a_module_1233',
    'An export declaration can only be used in a module.'
  ),
  An_ambient_module_declaration_is_only_allowed_at_the_top_level_in_a_file: diag(
    1234,
    qt.DiagnosticCategory.Error,
    'An_ambient_module_declaration_is_only_allowed_at_the_top_level_in_a_file_1234',
    'An ambient module declaration is only allowed at the top level in a file.'
  ),
  A_namespace_declaration_is_only_allowed_in_a_namespace_or_module: diag(
    1235,
    qt.DiagnosticCategory.Error,
    'A_namespace_declaration_is_only_allowed_in_a_namespace_or_module_1235',
    'A namespace declaration is only allowed in a namespace or module.'
  ),
  The_return_type_of_a_property_decorator_function_must_be_either_void_or_any: diag(
    1236,
    qt.DiagnosticCategory.Error,
    'The_return_type_of_a_property_decorator_function_must_be_either_void_or_any_1236',
    "The return type of a property decorator function must be either 'void' or 'any'."
  ),
  The_return_type_of_a_parameter_decorator_function_must_be_either_void_or_any: diag(
    1237,
    qt.DiagnosticCategory.Error,
    'The_return_type_of_a_parameter_decorator_function_must_be_either_void_or_any_1237',
    "The return type of a parameter decorator function must be either 'void' or 'any'."
  ),
  Unable_to_resolve_signature_of_class_decorator_when_called_as_an_expression: diag(
    1238,
    qt.DiagnosticCategory.Error,
    'Unable_to_resolve_signature_of_class_decorator_when_called_as_an_expression_1238',
    'Unable to resolve signature of class decorator when called as an expression.'
  ),
  Unable_to_resolve_signature_of_parameter_decorator_when_called_as_an_expression: diag(
    1239,
    qt.DiagnosticCategory.Error,
    'Unable_to_resolve_signature_of_parameter_decorator_when_called_as_an_expression_1239',
    'Unable to resolve signature of parameter decorator when called as an expression.'
  ),
  Unable_to_resolve_signature_of_property_decorator_when_called_as_an_expression: diag(
    1240,
    qt.DiagnosticCategory.Error,
    'Unable_to_resolve_signature_of_property_decorator_when_called_as_an_expression_1240',
    'Unable to resolve signature of property decorator when called as an expression.'
  ),
  Unable_to_resolve_signature_of_method_decorator_when_called_as_an_expression: diag(
    1241,
    qt.DiagnosticCategory.Error,
    'Unable_to_resolve_signature_of_method_decorator_when_called_as_an_expression_1241',
    'Unable to resolve signature of method decorator when called as an expression.'
  ),
  abstract_modifier_can_only_appear_on_a_class_method_or_property_declaration: diag(
    1242,
    qt.DiagnosticCategory.Error,
    'abstract_modifier_can_only_appear_on_a_class_method_or_property_declaration_1242',
    "'abstract' modifier can only appear on a class, method, or property declaration."
  ),
  _0_modifier_cannot_be_used_with_1_modifier: diag(1243, qt.DiagnosticCategory.Error, '_0_modifier_cannot_be_used_with_1_modifier_1243', "'{0}' modifier cannot be used with '{1}' modifier."),
  Abstract_methods_can_only_appear_within_an_abstract_class: diag(
    1244,
    qt.DiagnosticCategory.Error,
    'Abstract_methods_can_only_appear_within_an_abstract_class_1244',
    'Abstract methods can only appear within an abstract class.'
  ),
  Method_0_cannot_have_an_implementation_because_it_is_marked_abstract: diag(
    1245,
    qt.DiagnosticCategory.Error,
    'Method_0_cannot_have_an_implementation_because_it_is_marked_abstract_1245',
    "Method '{0}' cannot have an implementation because it is marked abstract."
  ),
  An_interface_property_cannot_have_an_initializer: diag(
    1246,
    qt.DiagnosticCategory.Error,
    'An_interface_property_cannot_have_an_initializer_1246',
    'An interface property cannot have an initializer.'
  ),
  A_type_literal_property_cannot_have_an_initializer: diag(
    1247,
    qt.DiagnosticCategory.Error,
    'A_type_literal_property_cannot_have_an_initializer_1247',
    'A type literal property cannot have an initializer.'
  ),
  A_class_member_cannot_have_the_0_keyword: diag(1248, qt.DiagnosticCategory.Error, 'A_class_member_cannot_have_the_0_keyword_1248', "A class member cannot have the '{0}' keyword."),
  A_decorator_can_only_decorate_a_method_implementation_not_an_overload: diag(
    1249,
    qt.DiagnosticCategory.Error,
    'A_decorator_can_only_decorate_a_method_implementation_not_an_overload_1249',
    'A decorator can only decorate a method implementation, not an overload.'
  ),
  Function_declarations_are_not_allowed_inside_blocks_in_strict_mode_when_targeting_ES3_or_ES5: diag(
    1250,
    qt.DiagnosticCategory.Error,
    'Function_declarations_are_not_allowed_inside_blocks_in_strict_mode_when_targeting_ES3_or_ES5_1250',
    "Function declarations are not allowed inside blocks in strict mode when targeting 'ES3' or 'ES5'."
  ),
  Function_declarations_are_not_allowed_inside_blocks_in_strict_mode_when_targeting_ES3_or_ES5_Class_definitions_are_automatically_in_strict_mode: diag(
    1251,
    qt.DiagnosticCategory.Error,
    'Function_declarations_are_not_allowed_inside_blocks_in_strict_mode_when_targeting_ES3_or_ES5_Class_d_1251',
    "Function declarations are not allowed inside blocks in strict mode when targeting 'ES3' or 'ES5'. Class definitions are automatically in strict mode."
  ),
  Function_declarations_are_not_allowed_inside_blocks_in_strict_mode_when_targeting_ES3_or_ES5_Modules_are_automatically_in_strict_mode: diag(
    1252,
    qt.DiagnosticCategory.Error,
    'Function_declarations_are_not_allowed_inside_blocks_in_strict_mode_when_targeting_ES3_or_ES5_Modules_1252',
    "Function declarations are not allowed inside blocks in strict mode when targeting 'ES3' or 'ES5'. Modules are automatically in strict mode."
  ),
  _0_tag_cannot_be_used_independently_as_a_top_level_JSDoc_tag: diag(
    1253,
    qt.DiagnosticCategory.Error,
    '_0_tag_cannot_be_used_independently_as_a_top_level_JSDoc_tag_1253',
    "'{0}' tag cannot be used independently as a top level JSDoc tag."
  ),
  A_const_initializer_in_an_ambient_context_must_be_a_string_or_numeric_literal_or_literal_enum_reference: diag(
    1254,
    qt.DiagnosticCategory.Error,
    'A_const_initializer_in_an_ambient_context_must_be_a_string_or_numeric_literal_or_literal_enum_refere_1254',
    "A 'const' initializer in an ambient context must be a string or numeric literal or literal enum reference."
  ),
  A_definite_assignment_assertion_is_not_permitted_in_this_context: diag(
    1255,
    qt.DiagnosticCategory.Error,
    'A_definite_assignment_assertion_is_not_permitted_in_this_context_1255',
    "A definite assignment assertion '!' is not permitted in this context."
  ),
  A_rest_element_must_be_last_in_a_tuple_type: diag(1256, qt.DiagnosticCategory.Error, 'A_rest_element_must_be_last_in_a_tuple_type_1256', 'A rest element must be last in a tuple type.'),
  A_required_element_cannot_follow_an_optional_element: diag(
    1257,
    qt.DiagnosticCategory.Error,
    'A_required_element_cannot_follow_an_optional_element_1257',
    'A required element cannot follow an optional element.'
  ),
  Definite_assignment_assertions_can_only_be_used_along_with_a_type_annotation: diag(
    1258,
    qt.DiagnosticCategory.Error,
    'Definite_assignment_assertions_can_only_be_used_along_with_a_type_annotation_1258',
    'Definite assignment assertions can only be used along with a type annotation.'
  ),
  Module_0_can_only_be_default_imported_using_the_1_flag: diag(
    1259,
    qt.DiagnosticCategory.Error,
    'Module_0_can_only_be_default_imported_using_the_1_flag_1259',
    "Module '{0}' can only be default-imported using the '{1}' flag"
  ),
  Keywords_cannot_contain_escape_characters: diag(1260, qt.DiagnosticCategory.Error, 'Keywords_cannot_contain_escape_characters_1260', 'Keywords cannot contain escape characters.'),
  Already_included_file_name_0_differs_from_file_name_1_only_in_casing: diag(
    1261,
    qt.DiagnosticCategory.Error,
    'Already_included_file_name_0_differs_from_file_name_1_only_in_casing_1261',
    "Already included file name '{0}' differs from file name '{1}' only in casing."
  ),
  with_statements_are_not_allowed_in_an_async_function_block: diag(
    1300,
    qt.DiagnosticCategory.Error,
    'with_statements_are_not_allowed_in_an_async_function_block_1300',
    "'with' statements are not allowed in an async function block."
  ),
  await_expressions_are_only_allowed_within_async_functions_and_at_the_top_levels_of_modules: diag(
    1308,
    qt.DiagnosticCategory.Error,
    'await_expressions_are_only_allowed_within_async_functions_and_at_the_top_levels_of_modules_1308',
    "'await' expressions are only allowed within async functions and at the top levels of modules."
  ),
  can_only_be_used_in_an_object_literal_property_inside_a_destructuring_assignment: diag(
    1312,
    qt.DiagnosticCategory.Error,
    'can_only_be_used_in_an_object_literal_property_inside_a_destructuring_assignment_1312',
    "'=' can only be used in an object literal property inside a destructuring assignment."
  ),
  The_body_of_an_if_statement_cannot_be_the_empty_statement: diag(
    1313,
    qt.DiagnosticCategory.Error,
    'The_body_of_an_if_statement_cannot_be_the_empty_statement_1313',
    "The body of an 'if' statement cannot be the empty statement."
  ),
  Global_module_exports_may_only_appear_in_module_files: diag(
    1314,
    qt.DiagnosticCategory.Error,
    'Global_module_exports_may_only_appear_in_module_files_1314',
    'Global module exports may only appear in module files.'
  ),
  Global_module_exports_may_only_appear_in_declaration_files: diag(
    1315,
    qt.DiagnosticCategory.Error,
    'Global_module_exports_may_only_appear_in_declaration_files_1315',
    'Global module exports may only appear in declaration files.'
  ),
  Global_module_exports_may_only_appear_at_top_level: diag(
    1316,
    qt.DiagnosticCategory.Error,
    'Global_module_exports_may_only_appear_at_top_level_1316',
    'Global module exports may only appear at top level.'
  ),
  A_parameter_property_cannot_be_declared_using_a_rest_parameter: diag(
    1317,
    qt.DiagnosticCategory.Error,
    'A_parameter_property_cannot_be_declared_using_a_rest_parameter_1317',
    'A parameter property cannot be declared using a rest parameter.'
  ),
  An_abstract_accessor_cannot_have_an_implementation: diag(
    1318,
    qt.DiagnosticCategory.Error,
    'An_abstract_accessor_cannot_have_an_implementation_1318',
    'An abstract accessor cannot have an implementation.'
  ),
  A_default_export_can_only_be_used_in_an_ECMAScript_style_module: diag(
    1319,
    qt.DiagnosticCategory.Error,
    'A_default_export_can_only_be_used_in_an_ECMAScript_style_module_1319',
    'A default export can only be used in an ECMAScript-style module.'
  ),
  Type_of_await_operand_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member: diag(
    1320,
    qt.DiagnosticCategory.Error,
    'Type_of_await_operand_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member_1320',
    "Type of 'await' operand must either be a valid promise or must not contain a callable 'then' member."
  ),
  Type_of_yield_operand_in_an_async_generator_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member: diag(
    1321,
    qt.DiagnosticCategory.Error,
    'Type_of_yield_operand_in_an_async_generator_must_either_be_a_valid_promise_or_must_not_contain_a_cal_1321',
    "Type of 'yield' operand in an async generator must either be a valid promise or must not contain a callable 'then' member."
  ),
  Type_of_iterated_elements_of_a_yield_Asterisk_operand_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member: diag(
    1322,
    qt.DiagnosticCategory.Error,
    'Type_of_iterated_elements_of_a_yield_Asterisk_operand_must_either_be_a_valid_promise_or_must_not_con_1322',
    "Type of iterated elements of a 'yield*' operand must either be a valid promise or must not contain a callable 'then' member."
  ),
  Dynamic_imports_are_only_supported_when_the_module_flag_is_set_to_es2020_esnext_commonjs_amd_system_or_umd: diag(
    1323,
    qt.DiagnosticCategory.Error,
    'Dynamic_imports_are_only_supported_when_the_module_flag_is_set_to_es2020_esnext_commonjs_amd_system__1323',
    "Dynamic imports are only supported when the '--module' flag is set to 'es2020', 'esnext', 'commonjs', 'amd', 'system', or 'umd'."
  ),
  Dynamic_import_must_have_one_specifier_as_an_argument: diag(
    1324,
    qt.DiagnosticCategory.Error,
    'Dynamic_import_must_have_one_specifier_as_an_argument_1324',
    'Dynamic import must have one specifier as an argument.'
  ),
  Specifier_of_dynamic_import_cannot_be_spread_element: diag(
    1325,
    qt.DiagnosticCategory.Error,
    'Specifier_of_dynamic_import_cannot_be_spread_element_1325',
    'Specifier of dynamic import cannot be spread element.'
  ),
  Dynamic_import_cannot_have_type_arguments: diag(1326, qt.DiagnosticCategory.Error, 'Dynamic_import_cannot_have_type_arguments_1326', 'Dynamic import cannot have type arguments'),
  String_literal_with_double_quotes_expected: diag(1327, qt.DiagnosticCategory.Error, 'String_literal_with_double_quotes_expected_1327', 'String literal with double quotes expected.'),
  Property_value_can_only_be_string_literal_numeric_literal_true_false_null_object_literal_or_array_literal: diag(
    1328,
    qt.DiagnosticCategory.Error,
    'Property_value_can_only_be_string_literal_numeric_literal_true_false_null_object_literal_or_array_li_1328',
    "Property value can only be string literal, numeric literal, 'true', 'false', 'null', object literal or array literal."
  ),
  _0_accepts_too_few_arguments_to_be_used_as_a_decorator_here_Did_you_mean_to_call_it_first_and_write_0: diag(
    1329,
    qt.DiagnosticCategory.Error,
    '_0_accepts_too_few_arguments_to_be_used_as_a_decorator_here_Did_you_mean_to_call_it_first_and_write__1329',
    "'{0}' accepts too few arguments to be used as a decorator here. Did you mean to call it first and write '@{0}()'?"
  ),
  A_property_of_an_interface_or_type_literal_whose_type_is_a_unique_symbol_type_must_be_readonly: diag(
    1330,
    qt.DiagnosticCategory.Error,
    'A_property_of_an_interface_or_type_literal_whose_type_is_a_unique_symbol_type_must_be_readonly_1330',
    "A property of an interface or type literal whose type is a 'unique symbol' type must be 'readonly'."
  ),
  A_property_of_a_class_whose_type_is_a_unique_symbol_type_must_be_both_static_and_readonly: diag(
    1331,
    qt.DiagnosticCategory.Error,
    'A_property_of_a_class_whose_type_is_a_unique_symbol_type_must_be_both_static_and_readonly_1331',
    "A property of a class whose type is a 'unique symbol' type must be both 'static' and 'readonly'."
  ),
  A_variable_whose_type_is_a_unique_symbol_type_must_be_const: diag(
    1332,
    qt.DiagnosticCategory.Error,
    'A_variable_whose_type_is_a_unique_symbol_type_must_be_const_1332',
    "A variable whose type is a 'unique symbol' type must be 'const'."
  ),
  unique_symbol_types_may_not_be_used_on_a_variable_declaration_with_a_binding_name: diag(
    1333,
    qt.DiagnosticCategory.Error,
    'unique_symbol_types_may_not_be_used_on_a_variable_declaration_with_a_binding_name_1333',
    "'unique symbol' types may not be used on a variable declaration with a binding name."
  ),
  unique_symbol_types_are_only_allowed_on_variables_in_a_variable_statement: diag(
    1334,
    qt.DiagnosticCategory.Error,
    'unique_symbol_types_are_only_allowed_on_variables_in_a_variable_statement_1334',
    "'unique symbol' types are only allowed on variables in a variable statement."
  ),
  unique_symbol_types_are_not_allowed_here: diag(1335, qt.DiagnosticCategory.Error, 'unique_symbol_types_are_not_allowed_here_1335', "'unique symbol' types are not allowed here."),
  An_index_signature_parameter_type_cannot_be_a_type_alias_Consider_writing_0_Colon_1_Colon_2_instead: diag(
    1336,
    qt.DiagnosticCategory.Error,
    'An_index_signature_parameter_type_cannot_be_a_type_alias_Consider_writing_0_Colon_1_Colon_2_instead_1336',
    "An index signature parameter type cannot be a type alias. Consider writing '[{0}: {1}]: {2}' instead."
  ),
  An_index_signature_parameter_type_cannot_be_a_union_type_Consider_using_a_mapped_object_type_instead: diag(
    1337,
    qt.DiagnosticCategory.Error,
    'An_index_signature_parameter_type_cannot_be_a_union_type_Consider_using_a_mapped_object_type_instead_1337',
    'An index signature parameter type cannot be a union type. Consider using a mapped object type instead.'
  ),
  infer_declarations_are_only_permitted_in_the_extends_clause_of_a_conditional_type: diag(
    1338,
    qt.DiagnosticCategory.Error,
    'infer_declarations_are_only_permitted_in_the_extends_clause_of_a_conditional_type_1338',
    "'infer' declarations are only permitted in the 'extends' clause of a conditional type."
  ),
  Module_0_does_not_refer_to_a_value_but_is_used_as_a_value_here: diag(
    1339,
    qt.DiagnosticCategory.Error,
    'Module_0_does_not_refer_to_a_value_but_is_used_as_a_value_here_1339',
    "Module '{0}' does not refer to a value, but is used as a value here."
  ),
  Module_0_does_not_refer_to_a_type_but_is_used_as_a_type_here_Did_you_mean_typeof_import_0: diag(
    1340,
    qt.DiagnosticCategory.Error,
    'Module_0_does_not_refer_to_a_type_but_is_used_as_a_type_here_Did_you_mean_typeof_import_0_1340',
    "Module '{0}' does not refer to a type, but is used as a type here. Did you mean 'typeof import('{0}')'?"
  ),
  Type_arguments_cannot_be_used_here: diag(1342, qt.DiagnosticCategory.Error, 'Type_arguments_cannot_be_used_here_1342', 'Type arguments cannot be used here.'),
  The_import_meta_meta_property_is_only_allowed_when_the_module_option_is_esnext_or_system: diag(
    1343,
    qt.DiagnosticCategory.Error,
    'The_import_meta_meta_property_is_only_allowed_when_the_module_option_is_esnext_or_system_1343',
    "The 'import.meta' meta-property is only allowed when the '--module' option is 'esnext' or 'system'."
  ),
  A_label_is_not_allowed_here: diag(1344, qt.DiagnosticCategory.Error, 'A_label_is_not_allowed_here_1344', "'A label is not allowed here."),
  An_expression_of_type_void_cannot_be_tested_for_truthiness: diag(
    1345,
    qt.DiagnosticCategory.Error,
    'An_expression_of_type_void_cannot_be_tested_for_truthiness_1345',
    "An expression of type 'void' cannot be tested for truthiness"
  ),
  This_parameter_is_not_allowed_with_use_strict_directive: diag(
    1346,
    qt.DiagnosticCategory.Error,
    'This_parameter_is_not_allowed_with_use_strict_directive_1346',
    "This parameter is not allowed with 'use strict' directive."
  ),
  use_strict_directive_cannot_be_used_with_non_simple_parameter_list: diag(
    1347,
    qt.DiagnosticCategory.Error,
    'use_strict_directive_cannot_be_used_with_non_simple_parameter_list_1347',
    "'use strict' directive cannot be used with non-simple parameter list."
  ),
  Non_simple_parameter_declared_here: diag(1348, qt.DiagnosticCategory.Error, 'Non_simple_parameter_declared_here_1348', 'Non-simple parameter declared here.'),
  use_strict_directive_used_here: diag(1349, qt.DiagnosticCategory.Error, 'use_strict_directive_used_here_1349', "'use strict' directive used here."),
  Print_the_final_configuration_instead_of_building: diag(
    1350,
    qt.DiagnosticCategory.Message,
    'Print_the_final_configuration_instead_of_building_1350',
    'Print the final configuration instead of building.'
  ),
  An_identifier_or_keyword_cannot_immediately_follow_a_numeric_literal: diag(
    1351,
    qt.DiagnosticCategory.Error,
    'An_identifier_or_keyword_cannot_immediately_follow_a_numeric_literal_1351',
    'An identifier or keyword cannot immediately follow a numeric literal.'
  ),
  A_bigint_literal_cannot_use_exponential_notation: diag(
    1352,
    qt.DiagnosticCategory.Error,
    'A_bigint_literal_cannot_use_exponential_notation_1352',
    'A bigint literal cannot use exponential notation.'
  ),
  A_bigint_literal_must_be_an_integer: diag(1353, qt.DiagnosticCategory.Error, 'A_bigint_literal_must_be_an_integer_1353', 'A bigint literal must be an integer.'),
  readonly_type_modifier_is_only_permitted_on_array_and_tuple_literal_types: diag(
    1354,
    qt.DiagnosticCategory.Error,
    'readonly_type_modifier_is_only_permitted_on_array_and_tuple_literal_types_1354',
    "'readonly' type modifier is only permitted on array and tuple literal types."
  ),
  A_const_assertions_can_only_be_applied_to_references_to_enum_members_or_string_number_boolean_array_or_object_literals: diag(
    1355,
    qt.DiagnosticCategory.Error,
    'A_const_assertions_can_only_be_applied_to_references_to_enum_members_or_string_number_boolean_array__1355',
    "A 'const' assertions can only be applied to references to enum members, or string, number, boolean, array, or object literals."
  ),
  Did_you_mean_to_mark_this_function_as_async: diag(1356, qt.DiagnosticCategory.Error, 'Did_you_mean_to_mark_this_function_as_async_1356', "Did you mean to mark this function as 'async'?"),
  An_enum_member_name_must_be_followed_by_a_or: diag(
    1357,
    qt.DiagnosticCategory.Error,
    'An_enum_member_name_must_be_followed_by_a_or_1357',
    "An enum member name must be followed by a ',', '=', or '}'."
  ),
  Tagged_template_expressions_are_not_permitted_in_an_optional_chain: diag(
    1358,
    qt.DiagnosticCategory.Error,
    'Tagged_template_expressions_are_not_permitted_in_an_optional_chain_1358',
    'Tagged template expressions are not permitted in an optional chain.'
  ),
  Identifier_expected_0_is_a_reserved_word_that_cannot_be_used_here: diag(
    1359,
    qt.DiagnosticCategory.Error,
    'Identifier_expected_0_is_a_reserved_word_that_cannot_be_used_here_1359',
    "Identifier expected. '{0}' is a reserved word that cannot be used here."
  ),
  Did_you_mean_to_parenthesize_this_function_type: diag(1360, qt.DiagnosticCategory.Error, 'Did_you_mean_to_parenthesize_this_function_type_1360', 'Did you mean to parenthesize this function type?'),
  _0_cannot_be_used_as_a_value_because_it_was_imported_using_import_type: diag(
    1361,
    qt.DiagnosticCategory.Error,
    '_0_cannot_be_used_as_a_value_because_it_was_imported_using_import_type_1361',
    "'{0}' cannot be used as a value because it was imported using 'import type'."
  ),
  _0_cannot_be_used_as_a_value_because_it_was_exported_using_export_type: diag(
    1362,
    qt.DiagnosticCategory.Error,
    '_0_cannot_be_used_as_a_value_because_it_was_exported_using_export_type_1362',
    "'{0}' cannot be used as a value because it was exported using 'export type'."
  ),
  A_type_only_import_can_specify_a_default_import_or_named_bindings_but_not_both: diag(
    1363,
    qt.DiagnosticCategory.Error,
    'A_type_only_import_can_specify_a_default_import_or_named_bindings_but_not_both_1363',
    'A type-only import can specify a default import or named bindings, but not both.'
  ),
  Convert_to_type_only_export: diag(1364, qt.DiagnosticCategory.Message, 'Convert_to_type_only_export_1364', 'Convert to type-only export'),
  Convert_all_re_exported_types_to_type_only_exports: diag(
    1365,
    qt.DiagnosticCategory.Message,
    'Convert_all_re_exported_types_to_type_only_exports_1365',
    'Convert all re-exported types to type-only exports'
  ),
  Split_into_two_separate_import_declarations: diag(1366, qt.DiagnosticCategory.Message, 'Split_into_two_separate_import_declarations_1366', 'Split into two separate import declarations'),
  Split_all_invalid_type_only_imports: diag(1367, qt.DiagnosticCategory.Message, 'Split_all_invalid_type_only_imports_1367', 'Split all invalid type-only imports'),
  Specify_emit_Slashchecking_behavior_for_imports_that_are_only_used_for_types: diag(
    1368,
    qt.DiagnosticCategory.Message,
    'Specify_emit_Slashchecking_behavior_for_imports_that_are_only_used_for_types_1368',
    'Specify emit/checking behavior for imports that are only used for types'
  ),
  Did_you_mean_0: diag(1369, qt.DiagnosticCategory.Message, 'Did_you_mean_0_1369', "Did you mean '{0}'?"),
  Only_ECMAScript_imports_may_use_import_type: diag(1370, qt.DiagnosticCategory.Error, 'Only_ECMAScript_imports_may_use_import_type_1370', "Only ECMAScript imports may use 'import type'."),
  This_import_is_never_used_as_a_value_and_must_use_import_type_because_the_importsNotUsedAsValues_is_set_to_error: diag(
    1371,
    qt.DiagnosticCategory.Error,
    'This_import_is_never_used_as_a_value_and_must_use_import_type_because_the_importsNotUsedAsValues_is__1371',
    "This import is never used as a value and must use 'import type' because the 'importsNotUsedAsValues' is set to 'error'."
  ),
  Convert_to_type_only_import: diag(1373, qt.DiagnosticCategory.Message, 'Convert_to_type_only_import_1373', 'Convert to type-only import'),
  Convert_all_imports_not_used_as_a_value_to_type_only_imports: diag(
    1374,
    qt.DiagnosticCategory.Message,
    'Convert_all_imports_not_used_as_a_value_to_type_only_imports_1374',
    'Convert all imports not used as a value to type-only imports'
  ),
  await_expressions_are_only_allowed_at_the_top_level_of_a_file_when_that_file_is_a_module_but_this_file_has_no_imports_or_exports_Consider_adding_an_empty_export_to_make_this_file_a_module: diag(
    1375,
    qt.DiagnosticCategory.Error,
    'await_expressions_are_only_allowed_at_the_top_level_of_a_file_when_that_file_is_a_module_but_this_fi_1375',
    "'await' expressions are only allowed at the top level of a file when that file is a module, but this file has no imports or exports. Consider adding an empty 'export {}' to make this file a module."
  ),
  _0_was_imported_here: diag(1376, qt.DiagnosticCategory.Message, '_0_was_imported_here_1376', "'{0}' was imported here."),
  _0_was_exported_here: diag(1377, qt.DiagnosticCategory.Message, '_0_was_exported_here_1377', "'{0}' was exported here."),
  Top_level_await_expressions_are_only_allowed_when_the_module_option_is_set_to_esnext_or_system_and_the_target_option_is_set_to_es2017_or_higher: diag(
    1378,
    qt.DiagnosticCategory.Error,
    'Top_level_await_expressions_are_only_allowed_when_the_module_option_is_set_to_esnext_or_system_and_t_1378',
    "Top-level 'await' expressions are only allowed when the 'module' option is set to 'esnext' or 'system', and the 'target' option is set to 'es2017' or higher."
  ),
  An_import_alias_cannot_reference_a_declaration_that_was_exported_using_export_type: diag(
    1379,
    qt.DiagnosticCategory.Error,
    'An_import_alias_cannot_reference_a_declaration_that_was_exported_using_export_type_1379',
    "An import alias cannot reference a declaration that was exported using 'export type'."
  ),
  An_import_alias_cannot_reference_a_declaration_that_was_imported_using_import_type: diag(
    1380,
    qt.DiagnosticCategory.Error,
    'An_import_alias_cannot_reference_a_declaration_that_was_imported_using_import_type_1380',
    "An import alias cannot reference a declaration that was imported using 'import type'."
  ),
  Unexpected_token_Did_you_mean_or_rbrace: diag(1381, qt.DiagnosticCategory.Error, 'Unexpected_token_Did_you_mean_or_rbrace_1381', "Unexpected token. Did you mean `{'}'}` or `&rbrace;`?"),
  Unexpected_token_Did_you_mean_or_gt: diag(1382, qt.DiagnosticCategory.Error, 'Unexpected_token_Did_you_mean_or_gt_1382', "Unexpected token. Did you mean `{'>'}` or `&gt;`?"),
  Only_named_exports_may_use_export_type: diag(1383, qt.DiagnosticCategory.Error, 'Only_named_exports_may_use_export_type_1383', "Only named exports may use 'export type'."),
  A_new_expression_with_type_arguments_must_always_be_followed_by_a_parenthesized_argument_list: diag(
    1384,
    qt.DiagnosticCategory.Error,
    'A_new_expression_with_type_arguments_must_always_be_followed_by_a_parenthesized_argument_list_1384',
    "A 'new' expression with type arguments must always be followed by a parenthesized argument list."
  ),
  The_types_of_0_are_incompatible_between_these_types: diag(
    2200,
    qt.DiagnosticCategory.Error,
    'The_types_of_0_are_incompatible_between_these_types_2200',
    "The types of '{0}' are incompatible between these types."
  ),
  The_types_returned_by_0_are_incompatible_between_these_types: diag(
    2201,
    qt.DiagnosticCategory.Error,
    'The_types_returned_by_0_are_incompatible_between_these_types_2201',
    "The types returned by '{0}' are incompatible between these types."
  ),
  Call_signature_return_types_0_and_1_are_incompatible: diag(
    2202,
    qt.DiagnosticCategory.Error,
    'Call_signature_return_types_0_and_1_are_incompatible_2202',
    "Call signature return types '{0}' and '{1}' are incompatible.",
    /*reportsUnnecessary*/ undefined,
    /*elidedInCompatabilityPyramid*/ true
  ),
  Construct_signature_return_types_0_and_1_are_incompatible: diag(
    2203,
    qt.DiagnosticCategory.Error,
    'Construct_signature_return_types_0_and_1_are_incompatible_2203',
    "Construct signature return types '{0}' and '{1}' are incompatible.",
    /*reportsUnnecessary*/ undefined,
    /*elidedInCompatabilityPyramid*/ true
  ),
  Call_signatures_with_no_arguments_have_incompatible_return_types_0_and_1: diag(
    2204,
    qt.DiagnosticCategory.Error,
    'Call_signatures_with_no_arguments_have_incompatible_return_types_0_and_1_2204',
    "Call signatures with no arguments have incompatible return types '{0}' and '{1}'.",
    /*reportsUnnecessary*/ undefined,
    /*elidedInCompatabilityPyramid*/ true
  ),
  Construct_signatures_with_no_arguments_have_incompatible_return_types_0_and_1: diag(
    2205,
    qt.DiagnosticCategory.Error,
    'Construct_signatures_with_no_arguments_have_incompatible_return_types_0_and_1_2205',
    "Construct signatures with no arguments have incompatible return types '{0}' and '{1}'.",
    /*reportsUnnecessary*/ undefined,
    /*elidedInCompatabilityPyramid*/ true
  ),
  Duplicate_identifier_0: diag(2300, qt.DiagnosticCategory.Error, 'Duplicate_identifier_0_2300', "Duplicate identifier '{0}'."),
  Initializer_of_instance_member_variable_0_cannot_reference_identifier_1_declared_in_the_constructor: diag(
    2301,
    qt.DiagnosticCategory.Error,
    'Initializer_of_instance_member_variable_0_cannot_reference_identifier_1_declared_in_the_constructor_2301',
    "Initializer of instance member variable '{0}' cannot reference identifier '{1}' declared in the constructor."
  ),
  Static_members_cannot_reference_class_type_parameters: diag(
    2302,
    qt.DiagnosticCategory.Error,
    'Static_members_cannot_reference_class_type_parameters_2302',
    'Static members cannot reference class type parameters.'
  ),
  Circular_definition_of_import_alias_0: diag(2303, qt.DiagnosticCategory.Error, 'Circular_definition_of_import_alias_0_2303', "Circular definition of import alias '{0}'."),
  Cannot_find_name_0: diag(2304, qt.DiagnosticCategory.Error, 'Cannot_find_name_0_2304', "Cannot find name '{0}'."),
  Module_0_has_no_exported_member_1: diag(2305, qt.DiagnosticCategory.Error, 'Module_0_has_no_exported_member_1_2305', "Module '{0}' has no exported member '{1}'."),
  File_0_is_not_a_module: diag(2306, qt.DiagnosticCategory.Error, 'File_0_is_not_a_module_2306', "File '{0}' is not a module."),
  Cannot_find_module_0_or_its_corresponding_type_declarations: diag(
    2307,
    qt.DiagnosticCategory.Error,
    'Cannot_find_module_0_or_its_corresponding_type_declarations_2307',
    "Cannot find module '{0}' or its corresponding type declarations."
  ),
  Module_0_has_already_exported_a_member_named_1_Consider_explicitly_re_exporting_to_resolve_the_ambiguity: diag(
    2308,
    qt.DiagnosticCategory.Error,
    'Module_0_has_already_exported_a_member_named_1_Consider_explicitly_re_exporting_to_resolve_the_ambig_2308',
    "Module {0} has already exported a member named '{1}'. Consider explicitly re-exporting to resolve the ambiguity."
  ),
  An_export_assignment_cannot_be_used_in_a_module_with_other_exported_elements: diag(
    2309,
    qt.DiagnosticCategory.Error,
    'An_export_assignment_cannot_be_used_in_a_module_with_other_exported_elements_2309',
    'An export assignment cannot be used in a module with other exported elements.'
  ),
  Type_0_recursively_references_itself_as_a_base_type: diag(
    2310,
    qt.DiagnosticCategory.Error,
    'Type_0_recursively_references_itself_as_a_base_type_2310',
    "Type '{0}' recursively references itself as a base type."
  ),
  A_class_may_only_extend_another_class: diag(2311, qt.DiagnosticCategory.Error, 'A_class_may_only_extend_another_class_2311', 'A class may only extend another class.'),
  An_interface_can_only_extend_an_object_type_or_intersection_of_object_types_with_statically_known_members: diag(
    2312,
    qt.DiagnosticCategory.Error,
    'An_interface_can_only_extend_an_object_type_or_intersection_of_object_types_with_statically_known_me_2312',
    'An interface can only extend an object type or intersection of object types with statically known members.'
  ),
  Type_parameter_0_has_a_circular_constraint: diag(2313, qt.DiagnosticCategory.Error, 'Type_parameter_0_has_a_circular_constraint_2313', "Type parameter '{0}' has a circular constraint."),
  Generic_type_0_requires_1_type_argument_s: diag(2314, qt.DiagnosticCategory.Error, 'Generic_type_0_requires_1_type_argument_s_2314', "Generic type '{0}' requires {1} type argument(s)."),
  Type_0_is_not_generic: diag(2315, qt.DiagnosticCategory.Error, 'Type_0_is_not_generic_2315', "Type '{0}' is not generic."),
  Global_type_0_must_be_a_class_or_interface_type: diag(
    2316,
    qt.DiagnosticCategory.Error,
    'Global_type_0_must_be_a_class_or_interface_type_2316',
    "Global type '{0}' must be a class or interface type."
  ),
  Global_type_0_must_have_1_type_parameter_s: diag(2317, qt.DiagnosticCategory.Error, 'Global_type_0_must_have_1_type_parameter_s_2317', "Global type '{0}' must have {1} type parameter(s)."),
  Cannot_find_global_type_0: diag(2318, qt.DiagnosticCategory.Error, 'Cannot_find_global_type_0_2318', "Cannot find global type '{0}'."),
  Named_property_0_of_types_1_and_2_are_not_identical: diag(
    2319,
    qt.DiagnosticCategory.Error,
    'Named_property_0_of_types_1_and_2_are_not_identical_2319',
    "Named property '{0}' of types '{1}' and '{2}' are not identical."
  ),
  Interface_0_cannot_simultaneously_extend_types_1_and_2: diag(
    2320,
    qt.DiagnosticCategory.Error,
    'Interface_0_cannot_simultaneously_extend_types_1_and_2_2320',
    "Interface '{0}' cannot simultaneously extend types '{1}' and '{2}'."
  ),
  Excessive_stack_depth_comparing_types_0_and_1: diag(
    2321,
    qt.DiagnosticCategory.Error,
    'Excessive_stack_depth_comparing_types_0_and_1_2321',
    "Excessive stack depth comparing types '{0}' and '{1}'."
  ),
  Type_0_is_not_assignable_to_type_1: diag(2322, qt.DiagnosticCategory.Error, 'Type_0_is_not_assignable_to_type_1_2322', "Type '{0}' is not assignable to type '{1}'."),
  Cannot_redeclare_exported_variable_0: diag(2323, qt.DiagnosticCategory.Error, 'Cannot_redeclare_exported_variable_0_2323', "Cannot redeclare exported variable '{0}'."),
  Property_0_is_missing_in_type_1: diag(2324, qt.DiagnosticCategory.Error, 'Property_0_is_missing_in_type_1_2324', "Property '{0}' is missing in type '{1}'."),
  Property_0_is_private_in_type_1_but_not_in_type_2: diag(
    2325,
    qt.DiagnosticCategory.Error,
    'Property_0_is_private_in_type_1_but_not_in_type_2_2325',
    "Property '{0}' is private in type '{1}' but not in type '{2}'."
  ),
  Types_of_property_0_are_incompatible: diag(2326, qt.DiagnosticCategory.Error, 'Types_of_property_0_are_incompatible_2326', "Types of property '{0}' are incompatible."),
  Property_0_is_optional_in_type_1_but_required_in_type_2: diag(
    2327,
    qt.DiagnosticCategory.Error,
    'Property_0_is_optional_in_type_1_but_required_in_type_2_2327',
    "Property '{0}' is optional in type '{1}' but required in type '{2}'."
  ),
  Types_of_parameters_0_and_1_are_incompatible: diag(2328, qt.DiagnosticCategory.Error, 'Types_of_parameters_0_and_1_are_incompatible_2328', "Types of parameters '{0}' and '{1}' are incompatible."),
  Index_signature_is_missing_in_type_0: diag(2329, qt.DiagnosticCategory.Error, 'Index_signature_is_missing_in_type_0_2329', "Index signature is missing in type '{0}'."),
  Index_signatures_are_incompatible: diag(2330, qt.DiagnosticCategory.Error, 'Index_signatures_are_incompatible_2330', 'Index signatures are incompatible.'),
  this_cannot_be_referenced_in_a_module_or_namespace_body: diag(
    2331,
    qt.DiagnosticCategory.Error,
    'this_cannot_be_referenced_in_a_module_or_namespace_body_2331',
    "'this' cannot be referenced in a module or namespace body."
  ),
  this_cannot_be_referenced_in_current_location: diag(2332, qt.DiagnosticCategory.Error, 'this_cannot_be_referenced_in_current_location_2332', "'this' cannot be referenced in current location."),
  this_cannot_be_referenced_in_constructor_arguments: diag(
    2333,
    qt.DiagnosticCategory.Error,
    'this_cannot_be_referenced_in_constructor_arguments_2333',
    "'this' cannot be referenced in constructor arguments."
  ),
  this_cannot_be_referenced_in_a_static_property_initializer: diag(
    2334,
    qt.DiagnosticCategory.Error,
    'this_cannot_be_referenced_in_a_static_property_initializer_2334',
    "'this' cannot be referenced in a static property initializer."
  ),
  super_can_only_be_referenced_in_a_derived_class: diag(
    2335,
    qt.DiagnosticCategory.Error,
    'super_can_only_be_referenced_in_a_derived_class_2335',
    "'super' can only be referenced in a derived class."
  ),
  super_cannot_be_referenced_in_constructor_arguments: diag(
    2336,
    qt.DiagnosticCategory.Error,
    'super_cannot_be_referenced_in_constructor_arguments_2336',
    "'super' cannot be referenced in constructor arguments."
  ),
  Super_calls_are_not_permitted_outside_constructors_or_in_nested_functions_inside_constructors: diag(
    2337,
    qt.DiagnosticCategory.Error,
    'Super_calls_are_not_permitted_outside_constructors_or_in_nested_functions_inside_constructors_2337',
    'Super calls are not permitted outside constructors or in nested functions inside constructors.'
  ),
  super_property_access_is_permitted_only_in_a_constructor_member_function_or_member_accessor_of_a_derived_class: diag(
    2338,
    qt.DiagnosticCategory.Error,
    'super_property_access_is_permitted_only_in_a_constructor_member_function_or_member_accessor_of_a_der_2338',
    "'super' property access is permitted only in a constructor, member function, or member accessor of a derived class."
  ),
  Property_0_does_not_exist_on_type_1: diag(2339, qt.DiagnosticCategory.Error, 'Property_0_does_not_exist_on_type_1_2339', "Property '{0}' does not exist on type '{1}'."),
  Only_public_and_protected_methods_of_the_base_class_are_accessible_via_the_super_keyword: diag(
    2340,
    qt.DiagnosticCategory.Error,
    'Only_public_and_protected_methods_of_the_base_class_are_accessible_via_the_super_keyword_2340',
    "Only public and protected methods of the base class are accessible via the 'super' keyword."
  ),
  Property_0_is_private_and_only_accessible_within_class_1: diag(
    2341,
    qt.DiagnosticCategory.Error,
    'Property_0_is_private_and_only_accessible_within_class_1_2341',
    "Property '{0}' is private and only accessible within class '{1}'."
  ),
  An_index_expression_argument_must_be_of_type_string_number_symbol_or_any: diag(
    2342,
    qt.DiagnosticCategory.Error,
    'An_index_expression_argument_must_be_of_type_string_number_symbol_or_any_2342',
    "An index expression argument must be of type 'string', 'number', 'symbol', or 'any'."
  ),
  This_syntax_requires_an_imported_helper_named_1_which_does_not_exist_in_0_Consider_upgrading_your_version_of_0: diag(
    2343,
    qt.DiagnosticCategory.Error,
    'This_syntax_requires_an_imported_helper_named_1_which_does_not_exist_in_0_Consider_upgrading_your_ve_2343',
    "This syntax requires an imported helper named '{1}' which does not exist in '{0}'. Consider upgrading your version of '{0}'."
  ),
  Type_0_does_not_satisfy_the_constraint_1: diag(2344, qt.DiagnosticCategory.Error, 'Type_0_does_not_satisfy_the_constraint_1_2344', "Type '{0}' does not satisfy the constraint '{1}'."),
  Argument_of_type_0_is_not_assignable_to_parameter_of_type_1: diag(
    2345,
    qt.DiagnosticCategory.Error,
    'Argument_of_type_0_is_not_assignable_to_parameter_of_type_1_2345',
    "Argument of type '{0}' is not assignable to parameter of type '{1}'."
  ),
  Call_target_does_not_contain_any_signatures: diag(2346, qt.DiagnosticCategory.Error, 'Call_target_does_not_contain_any_signatures_2346', 'Call target does not contain any signatures.'),
  Untyped_function_calls_may_not_accept_type_arguments: diag(
    2347,
    qt.DiagnosticCategory.Error,
    'Untyped_function_calls_may_not_accept_type_arguments_2347',
    'Untyped function calls may not accept type arguments.'
  ),
  Value_of_type_0_is_not_callable_Did_you_mean_to_include_new: diag(
    2348,
    qt.DiagnosticCategory.Error,
    'Value_of_type_0_is_not_callable_Did_you_mean_to_include_new_2348',
    "Value of type '{0}' is not callable. Did you mean to include 'new'?"
  ),
  This_expression_is_not_callable: diag(2349, qt.DiagnosticCategory.Error, 'This_expression_is_not_callable_2349', 'This expression is not callable.'),
  Only_a_void_function_can_be_called_with_the_new_keyword: diag(
    2350,
    qt.DiagnosticCategory.Error,
    'Only_a_void_function_can_be_called_with_the_new_keyword_2350',
    "Only a void function can be called with the 'new' keyword."
  ),
  This_expression_is_not_constructable: diag(2351, qt.DiagnosticCategory.Error, 'This_expression_is_not_constructable_2351', 'This expression is not constructable.'),
  Conversion_of_type_0_to_type_1_may_be_a_mistake_because_neither_type_sufficiently_overlaps_with_the_other_If_this_was_intentional_convert_the_expression_to_unknown_first: diag(
    2352,
    qt.DiagnosticCategory.Error,
    'Conversion_of_type_0_to_type_1_may_be_a_mistake_because_neither_type_sufficiently_overlaps_with_the__2352',
    "Conversion of type '{0}' to type '{1}' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first."
  ),
  Object_literal_may_only_specify_known_properties_and_0_does_not_exist_in_type_1: diag(
    2353,
    qt.DiagnosticCategory.Error,
    'Object_literal_may_only_specify_known_properties_and_0_does_not_exist_in_type_1_2353',
    "Object literal may only specify known properties, and '{0}' does not exist in type '{1}'."
  ),
  This_syntax_requires_an_imported_helper_but_module_0_cannot_be_found: diag(
    2354,
    qt.DiagnosticCategory.Error,
    'This_syntax_requires_an_imported_helper_but_module_0_cannot_be_found_2354',
    "This syntax requires an imported helper but module '{0}' cannot be found."
  ),
  A_function_whose_declared_type_is_neither_void_nor_any_must_return_a_value: diag(
    2355,
    qt.DiagnosticCategory.Error,
    'A_function_whose_declared_type_is_neither_void_nor_any_must_return_a_value_2355',
    "A function whose declared type is neither 'void' nor 'any' must return a value."
  ),
  An_arithmetic_operand_must_be_of_type_any_number_bigint_or_an_enum_type: diag(
    2356,
    qt.DiagnosticCategory.Error,
    'An_arithmetic_operand_must_be_of_type_any_number_bigint_or_an_enum_type_2356',
    "An arithmetic operand must be of type 'any', 'number', 'bigint' or an enum type."
  ),
  The_operand_of_an_increment_or_decrement_operator_must_be_a_variable_or_a_property_access: diag(
    2357,
    qt.DiagnosticCategory.Error,
    'The_operand_of_an_increment_or_decrement_operator_must_be_a_variable_or_a_property_access_2357',
    'The operand of an increment or decrement operator must be a variable or a property access.'
  ),
  The_left_hand_side_of_an_instanceof_expression_must_be_of_type_any_an_object_type_or_a_type_parameter: diag(
    2358,
    qt.DiagnosticCategory.Error,
    'The_left_hand_side_of_an_instanceof_expression_must_be_of_type_any_an_object_type_or_a_type_paramete_2358',
    "The left-hand side of an 'instanceof' expression must be of type 'any', an object type or a type parameter."
  ),
  The_right_hand_side_of_an_instanceof_expression_must_be_of_type_any_or_of_a_type_assignable_to_the_Function_interface_type: diag(
    2359,
    qt.DiagnosticCategory.Error,
    'The_right_hand_side_of_an_instanceof_expression_must_be_of_type_any_or_of_a_type_assignable_to_the_F_2359',
    "The right-hand side of an 'instanceof' expression must be of type 'any' or of a type assignable to the 'Function' interface type."
  ),
  The_left_hand_side_of_an_in_expression_must_be_of_type_any_string_number_or_symbol: diag(
    2360,
    qt.DiagnosticCategory.Error,
    'The_left_hand_side_of_an_in_expression_must_be_of_type_any_string_number_or_symbol_2360',
    "The left-hand side of an 'in' expression must be of type 'any', 'string', 'number', or 'symbol'."
  ),
  The_right_hand_side_of_an_in_expression_must_be_of_type_any_an_object_type_or_a_type_parameter: diag(
    2361,
    qt.DiagnosticCategory.Error,
    'The_right_hand_side_of_an_in_expression_must_be_of_type_any_an_object_type_or_a_type_parameter_2361',
    "The right-hand side of an 'in' expression must be of type 'any', an object type or a type parameter."
  ),
  The_left_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_bigint_or_an_enum_type: diag(
    2362,
    qt.DiagnosticCategory.Error,
    'The_left_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_bigint_or_an_enum_type_2362',
    "The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type."
  ),
  The_right_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_bigint_or_an_enum_type: diag(
    2363,
    qt.DiagnosticCategory.Error,
    'The_right_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_bigint_or_an_enum_type_2363',
    "The right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type."
  ),
  The_left_hand_side_of_an_assignment_expression_must_be_a_variable_or_a_property_access: diag(
    2364,
    qt.DiagnosticCategory.Error,
    'The_left_hand_side_of_an_assignment_expression_must_be_a_variable_or_a_property_access_2364',
    'The left-hand side of an assignment expression must be a variable or a property access.'
  ),
  Operator_0_cannot_be_applied_to_types_1_and_2: diag(
    2365,
    qt.DiagnosticCategory.Error,
    'Operator_0_cannot_be_applied_to_types_1_and_2_2365',
    "Operator '{0}' cannot be applied to types '{1}' and '{2}'."
  ),
  Function_lacks_ending_return_statement_and_return_type_does_not_include_undefined: diag(
    2366,
    qt.DiagnosticCategory.Error,
    'Function_lacks_ending_return_statement_and_return_type_does_not_include_undefined_2366',
    "Function lacks ending return statement and return type does not include 'undefined'."
  ),
  This_condition_will_always_return_0_since_the_types_1_and_2_have_no_overlap: diag(
    2367,
    qt.DiagnosticCategory.Error,
    'This_condition_will_always_return_0_since_the_types_1_and_2_have_no_overlap_2367',
    "This condition will always return '{0}' since the types '{1}' and '{2}' have no overlap."
  ),
  Type_parameter_name_cannot_be_0: diag(2368, qt.DiagnosticCategory.Error, 'Type_parameter_name_cannot_be_0_2368', "Type parameter name cannot be '{0}'."),
  A_parameter_property_is_only_allowed_in_a_constructor_implementation: diag(
    2369,
    qt.DiagnosticCategory.Error,
    'A_parameter_property_is_only_allowed_in_a_constructor_implementation_2369',
    'A parameter property is only allowed in a constructor implementation.'
  ),
  A_rest_parameter_must_be_of_an_array_type: diag(2370, qt.DiagnosticCategory.Error, 'A_rest_parameter_must_be_of_an_array_type_2370', 'A rest parameter must be of an array type.'),
  A_parameter_initializer_is_only_allowed_in_a_function_or_constructor_implementation: diag(
    2371,
    qt.DiagnosticCategory.Error,
    'A_parameter_initializer_is_only_allowed_in_a_function_or_constructor_implementation_2371',
    'A parameter initializer is only allowed in a function or constructor implementation.'
  ),
  Parameter_0_cannot_be_referenced_in_its_initializer: diag(
    2372,
    qt.DiagnosticCategory.Error,
    'Parameter_0_cannot_be_referenced_in_its_initializer_2372',
    "Parameter '{0}' cannot be referenced in its initializer."
  ),
  Initializer_of_parameter_0_cannot_reference_identifier_1_declared_after_it: diag(
    2373,
    qt.DiagnosticCategory.Error,
    'Initializer_of_parameter_0_cannot_reference_identifier_1_declared_after_it_2373',
    "Initializer of parameter '{0}' cannot reference identifier '{1}' declared after it."
  ),
  Duplicate_string_index_signature: diag(2374, qt.DiagnosticCategory.Error, 'Duplicate_string_index_signature_2374', 'Duplicate string index signature.'),
  Duplicate_number_index_signature: diag(2375, qt.DiagnosticCategory.Error, 'Duplicate_number_index_signature_2375', 'Duplicate number index signature.'),
  A_super_call_must_be_the_first_statement_in_the_constructor_when_a_class_contains_initialized_properties_parameter_properties_or_private_identifiers: diag(
    2376,
    qt.DiagnosticCategory.Error,
    'A_super_call_must_be_the_first_statement_in_the_constructor_when_a_class_contains_initialized_proper_2376',
    "A 'super' call must be the first statement in the constructor when a class contains initialized properties, parameter properties, or private identifiers."
  ),
  Constructors_for_derived_classes_must_contain_a_super_call: diag(
    2377,
    qt.DiagnosticCategory.Error,
    'Constructors_for_derived_classes_must_contain_a_super_call_2377',
    "Constructors for derived classes must contain a 'super' call."
  ),
  A_get_accessor_must_return_a_value: diag(2378, qt.DiagnosticCategory.Error, 'A_get_accessor_must_return_a_value_2378', "A 'get' accessor must return a value."),
  Getter_and_setter_accessors_do_not_agree_in_visibility: diag(
    2379,
    qt.DiagnosticCategory.Error,
    'Getter_and_setter_accessors_do_not_agree_in_visibility_2379',
    'Getter and setter accessors do not agree in visibility.'
  ),
  get_and_set_accessor_must_have_the_same_type: diag(2380, qt.DiagnosticCategory.Error, 'get_and_set_accessor_must_have_the_same_type_2380', "'get' and 'set' accessor must have the same type."),
  A_signature_with_an_implementation_cannot_use_a_string_literal_type: diag(
    2381,
    qt.DiagnosticCategory.Error,
    'A_signature_with_an_implementation_cannot_use_a_string_literal_type_2381',
    'A signature with an implementation cannot use a string literal type.'
  ),
  Specialized_overload_signature_is_not_assignable_to_any_non_specialized_signature: diag(
    2382,
    qt.DiagnosticCategory.Error,
    'Specialized_overload_signature_is_not_assignable_to_any_non_specialized_signature_2382',
    'Specialized overload signature is not assignable to any non-specialized signature.'
  ),
  Overload_signatures_must_all_be_exported_or_non_exported: diag(
    2383,
    qt.DiagnosticCategory.Error,
    'Overload_signatures_must_all_be_exported_or_non_exported_2383',
    'Overload signatures must all be exported or non-exported.'
  ),
  Overload_signatures_must_all_be_ambient_or_non_ambient: diag(
    2384,
    qt.DiagnosticCategory.Error,
    'Overload_signatures_must_all_be_ambient_or_non_ambient_2384',
    'Overload signatures must all be ambient or non-ambient.'
  ),
  Overload_signatures_must_all_be_public_private_or_protected: diag(
    2385,
    qt.DiagnosticCategory.Error,
    'Overload_signatures_must_all_be_public_private_or_protected_2385',
    'Overload signatures must all be public, private or protected.'
  ),
  Overload_signatures_must_all_be_optional_or_required: diag(
    2386,
    qt.DiagnosticCategory.Error,
    'Overload_signatures_must_all_be_optional_or_required_2386',
    'Overload signatures must all be optional or required.'
  ),
  Function_overload_must_be_static: diag(2387, qt.DiagnosticCategory.Error, 'Function_overload_must_be_static_2387', 'Function overload must be static.'),
  Function_overload_must_not_be_static: diag(2388, qt.DiagnosticCategory.Error, 'Function_overload_must_not_be_static_2388', 'Function overload must not be static.'),
  Function_implementation_name_must_be_0: diag(2389, qt.DiagnosticCategory.Error, 'Function_implementation_name_must_be_0_2389', "Function implementation name must be '{0}'."),
  Constructor_implementation_is_missing: diag(2390, qt.DiagnosticCategory.Error, 'Constructor_implementation_is_missing_2390', 'Constructor implementation is missing.'),
  Function_implementation_is_missing_or_not_immediately_following_the_declaration: diag(
    2391,
    qt.DiagnosticCategory.Error,
    'Function_implementation_is_missing_or_not_immediately_following_the_declaration_2391',
    'Function implementation is missing or not immediately following the declaration.'
  ),
  Multiple_constructor_implementations_are_not_allowed: diag(
    2392,
    qt.DiagnosticCategory.Error,
    'Multiple_constructor_implementations_are_not_allowed_2392',
    'Multiple constructor implementations are not allowed.'
  ),
  Duplicate_function_implementation: diag(2393, qt.DiagnosticCategory.Error, 'Duplicate_function_implementation_2393', 'Duplicate function implementation.'),
  This_overload_signature_is_not_compatible_with_its_implementation_signature: diag(
    2394,
    qt.DiagnosticCategory.Error,
    'This_overload_signature_is_not_compatible_with_its_implementation_signature_2394',
    'This overload signature is not compatible with its implementation signature.'
  ),
  Individual_declarations_in_merged_declaration_0_must_be_all_exported_or_all_local: diag(
    2395,
    qt.DiagnosticCategory.Error,
    'Individual_declarations_in_merged_declaration_0_must_be_all_exported_or_all_local_2395',
    "Individual declarations in merged declaration '{0}' must be all exported or all local."
  ),
  Duplicate_identifier_arguments_Compiler_uses_arguments_to_initialize_rest_parameters: diag(
    2396,
    qt.DiagnosticCategory.Error,
    'Duplicate_identifier_arguments_Compiler_uses_arguments_to_initialize_rest_parameters_2396',
    "Duplicate identifier 'arguments'. Compiler uses 'arguments' to initialize rest parameters."
  ),
  Declaration_name_conflicts_with_built_in_global_identifier_0: diag(
    2397,
    qt.DiagnosticCategory.Error,
    'Declaration_name_conflicts_with_built_in_global_identifier_0_2397',
    "Declaration name conflicts with built-in global identifier '{0}'."
  ),
  constructor_cannot_be_used_as_a_parameter_property_name: diag(
    2398,
    qt.DiagnosticCategory.Error,
    'constructor_cannot_be_used_as_a_parameter_property_name_2398',
    "'constructor' cannot be used as a parameter property name."
  ),
  Duplicate_identifier_this_Compiler_uses_variable_declaration_this_to_capture_this_reference: diag(
    2399,
    qt.DiagnosticCategory.Error,
    'Duplicate_identifier_this_Compiler_uses_variable_declaration_this_to_capture_this_reference_2399',
    "Duplicate identifier '_this'. Compiler uses variable declaration '_this' to capture 'this' reference."
  ),
  Expression_resolves_to_variable_declaration_this_that_compiler_uses_to_capture_this_reference: diag(
    2400,
    qt.DiagnosticCategory.Error,
    'Expression_resolves_to_variable_declaration_this_that_compiler_uses_to_capture_this_reference_2400',
    "Expression resolves to variable declaration '_this' that compiler uses to capture 'this' reference."
  ),
  Duplicate_identifier_super_Compiler_uses_super_to_capture_base_class_reference: diag(
    2401,
    qt.DiagnosticCategory.Error,
    'Duplicate_identifier_super_Compiler_uses_super_to_capture_base_class_reference_2401',
    "Duplicate identifier '_super'. Compiler uses '_super' to capture base class reference."
  ),
  Expression_resolves_to_super_that_compiler_uses_to_capture_base_class_reference: diag(
    2402,
    qt.DiagnosticCategory.Error,
    'Expression_resolves_to_super_that_compiler_uses_to_capture_base_class_reference_2402',
    "Expression resolves to '_super' that compiler uses to capture base class reference."
  ),
  Subsequent_variable_declarations_must_have_the_same_type_Variable_0_must_be_of_type_1_but_here_has_type_2: diag(
    2403,
    qt.DiagnosticCategory.Error,
    'Subsequent_variable_declarations_must_have_the_same_type_Variable_0_must_be_of_type_1_but_here_has_t_2403',
    "Subsequent variable declarations must have the same type.  Variable '{0}' must be of type '{1}', but here has type '{2}'."
  ),
  The_left_hand_side_of_a_for_in_statement_cannot_use_a_type_annotation: diag(
    2404,
    qt.DiagnosticCategory.Error,
    'The_left_hand_side_of_a_for_in_statement_cannot_use_a_type_annotation_2404',
    "The left-hand side of a 'for...in' statement cannot use a type annotation."
  ),
  The_left_hand_side_of_a_for_in_statement_must_be_of_type_string_or_any: diag(
    2405,
    qt.DiagnosticCategory.Error,
    'The_left_hand_side_of_a_for_in_statement_must_be_of_type_string_or_any_2405',
    "The left-hand side of a 'for...in' statement must be of type 'string' or 'any'."
  ),
  The_left_hand_side_of_a_for_in_statement_must_be_a_variable_or_a_property_access: diag(
    2406,
    qt.DiagnosticCategory.Error,
    'The_left_hand_side_of_a_for_in_statement_must_be_a_variable_or_a_property_access_2406',
    "The left-hand side of a 'for...in' statement must be a variable or a property access."
  ),
  The_right_hand_side_of_a_for_in_statement_must_be_of_type_any_an_object_type_or_a_type_parameter_but_here_has_type_0: diag(
    2407,
    qt.DiagnosticCategory.Error,
    'The_right_hand_side_of_a_for_in_statement_must_be_of_type_any_an_object_type_or_a_type_parameter_but_2407',
    "The right-hand side of a 'for...in' statement must be of type 'any', an object type or a type parameter, but here has type '{0}'."
  ),
  Setters_cannot_return_a_value: diag(2408, qt.DiagnosticCategory.Error, 'Setters_cannot_return_a_value_2408', 'Setters cannot return a value.'),
  Return_type_of_constructor_signature_must_be_assignable_to_the_instance_type_of_the_class: diag(
    2409,
    qt.DiagnosticCategory.Error,
    'Return_type_of_constructor_signature_must_be_assignable_to_the_instance_type_of_the_class_2409',
    'Return type of constructor signature must be assignable to the instance type of the class.'
  ),
  The_with_statement_is_not_supported_All_symbols_in_a_with_block_will_have_type_any: diag(
    2410,
    qt.DiagnosticCategory.Error,
    'The_with_statement_is_not_supported_All_symbols_in_a_with_block_will_have_type_any_2410',
    "The 'with' statement is not supported. All symbols in a 'with' block will have type 'any'."
  ),
  Property_0_of_type_1_is_not_assignable_to_string_index_type_2: diag(
    2411,
    qt.DiagnosticCategory.Error,
    'Property_0_of_type_1_is_not_assignable_to_string_index_type_2_2411',
    "Property '{0}' of type '{1}' is not assignable to string index type '{2}'."
  ),
  Property_0_of_type_1_is_not_assignable_to_numeric_index_type_2: diag(
    2412,
    qt.DiagnosticCategory.Error,
    'Property_0_of_type_1_is_not_assignable_to_numeric_index_type_2_2412',
    "Property '{0}' of type '{1}' is not assignable to numeric index type '{2}'."
  ),
  Numeric_index_type_0_is_not_assignable_to_string_index_type_1: diag(
    2413,
    qt.DiagnosticCategory.Error,
    'Numeric_index_type_0_is_not_assignable_to_string_index_type_1_2413',
    "Numeric index type '{0}' is not assignable to string index type '{1}'."
  ),
  Class_name_cannot_be_0: diag(2414, qt.DiagnosticCategory.Error, 'Class_name_cannot_be_0_2414', "Class name cannot be '{0}'."),
  Class_0_incorrectly_extends_base_class_1: diag(2415, qt.DiagnosticCategory.Error, 'Class_0_incorrectly_extends_base_class_1_2415', "Class '{0}' incorrectly extends base class '{1}'."),
  Property_0_in_type_1_is_not_assignable_to_the_same_property_in_base_type_2: diag(
    2416,
    qt.DiagnosticCategory.Error,
    'Property_0_in_type_1_is_not_assignable_to_the_same_property_in_base_type_2_2416',
    "Property '{0}' in type '{1}' is not assignable to the same property in base type '{2}'."
  ),
  Class_static_side_0_incorrectly_extends_base_class_static_side_1: diag(
    2417,
    qt.DiagnosticCategory.Error,
    'Class_static_side_0_incorrectly_extends_base_class_static_side_1_2417',
    "Class static side '{0}' incorrectly extends base class static side '{1}'."
  ),
  Type_of_computed_property_s_value_is_0_which_is_not_assignable_to_type_1: diag(
    2418,
    qt.DiagnosticCategory.Error,
    'Type_of_computed_property_s_value_is_0_which_is_not_assignable_to_type_1_2418',
    "Type of computed property's value is '{0}', which is not assignable to type '{1}'."
  ),
  Class_0_incorrectly_implements_interface_1: diag(2420, qt.DiagnosticCategory.Error, 'Class_0_incorrectly_implements_interface_1_2420', "Class '{0}' incorrectly implements interface '{1}'."),
  A_class_can_only_implement_an_object_type_or_intersection_of_object_types_with_statically_known_members: diag(
    2422,
    qt.DiagnosticCategory.Error,
    'A_class_can_only_implement_an_object_type_or_intersection_of_object_types_with_statically_known_memb_2422',
    'A class can only implement an object type or intersection of object types with statically known members.'
  ),
  Class_0_defines_instance_member_function_1_but_extended_class_2_defines_it_as_instance_member_accessor: diag(
    2423,
    qt.DiagnosticCategory.Error,
    'Class_0_defines_instance_member_function_1_but_extended_class_2_defines_it_as_instance_member_access_2423',
    "Class '{0}' defines instance member function '{1}', but extended class '{2}' defines it as instance member accessor."
  ),
  Class_0_defines_instance_member_property_1_but_extended_class_2_defines_it_as_instance_member_function: diag(
    2425,
    qt.DiagnosticCategory.Error,
    'Class_0_defines_instance_member_property_1_but_extended_class_2_defines_it_as_instance_member_functi_2425',
    "Class '{0}' defines instance member property '{1}', but extended class '{2}' defines it as instance member function."
  ),
  Class_0_defines_instance_member_accessor_1_but_extended_class_2_defines_it_as_instance_member_function: diag(
    2426,
    qt.DiagnosticCategory.Error,
    'Class_0_defines_instance_member_accessor_1_but_extended_class_2_defines_it_as_instance_member_functi_2426',
    "Class '{0}' defines instance member accessor '{1}', but extended class '{2}' defines it as instance member function."
  ),
  Interface_name_cannot_be_0: diag(2427, qt.DiagnosticCategory.Error, 'Interface_name_cannot_be_0_2427', "Interface name cannot be '{0}'."),
  All_declarations_of_0_must_have_identical_type_parameters: diag(
    2428,
    qt.DiagnosticCategory.Error,
    'All_declarations_of_0_must_have_identical_type_parameters_2428',
    "All declarations of '{0}' must have identical type parameters."
  ),
  Interface_0_incorrectly_extends_interface_1: diag(2430, qt.DiagnosticCategory.Error, 'Interface_0_incorrectly_extends_interface_1_2430', "Interface '{0}' incorrectly extends interface '{1}'."),
  Enum_name_cannot_be_0: diag(2431, qt.DiagnosticCategory.Error, 'Enum_name_cannot_be_0_2431', "Enum name cannot be '{0}'."),
  In_an_enum_with_multiple_declarations_only_one_declaration_can_omit_an_initializer_for_its_first_enum_element: diag(
    2432,
    qt.DiagnosticCategory.Error,
    'In_an_enum_with_multiple_declarations_only_one_declaration_can_omit_an_initializer_for_its_first_enu_2432',
    'In an enum with multiple declarations, only one declaration can omit an initializer for its first enum element.'
  ),
  A_namespace_declaration_cannot_be_in_a_different_file_from_a_class_or_function_with_which_it_is_merged: diag(
    2433,
    qt.DiagnosticCategory.Error,
    'A_namespace_declaration_cannot_be_in_a_different_file_from_a_class_or_function_with_which_it_is_merg_2433',
    'A namespace declaration cannot be in a different file from a class or function with which it is merged.'
  ),
  A_namespace_declaration_cannot_be_located_prior_to_a_class_or_function_with_which_it_is_merged: diag(
    2434,
    qt.DiagnosticCategory.Error,
    'A_namespace_declaration_cannot_be_located_prior_to_a_class_or_function_with_which_it_is_merged_2434',
    'A namespace declaration cannot be located prior to a class or function with which it is merged.'
  ),
  Ambient_modules_cannot_be_nested_in_other_modules_or_namespaces: diag(
    2435,
    qt.DiagnosticCategory.Error,
    'Ambient_modules_cannot_be_nested_in_other_modules_or_namespaces_2435',
    'Ambient modules cannot be nested in other modules or namespaces.'
  ),
  Ambient_module_declaration_cannot_specify_relative_module_name: diag(
    2436,
    qt.DiagnosticCategory.Error,
    'Ambient_module_declaration_cannot_specify_relative_module_name_2436',
    'Ambient module declaration cannot specify relative module name.'
  ),
  Module_0_is_hidden_by_a_local_declaration_with_the_same_name: diag(
    2437,
    qt.DiagnosticCategory.Error,
    'Module_0_is_hidden_by_a_local_declaration_with_the_same_name_2437',
    "Module '{0}' is hidden by a local declaration with the same name."
  ),
  Import_name_cannot_be_0: diag(2438, qt.DiagnosticCategory.Error, 'Import_name_cannot_be_0_2438', "Import name cannot be '{0}'."),
  Import_or_export_declaration_in_an_ambient_module_declaration_cannot_reference_module_through_relative_module_name: diag(
    2439,
    qt.DiagnosticCategory.Error,
    'Import_or_export_declaration_in_an_ambient_module_declaration_cannot_reference_module_through_relati_2439',
    'Import or export declaration in an ambient module declaration cannot reference module through relative module name.'
  ),
  Import_declaration_conflicts_with_local_declaration_of_0: diag(
    2440,
    qt.DiagnosticCategory.Error,
    'Import_declaration_conflicts_with_local_declaration_of_0_2440',
    "Import declaration conflicts with local declaration of '{0}'."
  ),
  Duplicate_identifier_0_Compiler_reserves_name_1_in_top_level_scope_of_a_module: diag(
    2441,
    qt.DiagnosticCategory.Error,
    'Duplicate_identifier_0_Compiler_reserves_name_1_in_top_level_scope_of_a_module_2441',
    "Duplicate identifier '{0}'. Compiler reserves name '{1}' in top level scope of a module."
  ),
  Types_have_separate_declarations_of_a_private_property_0: diag(
    2442,
    qt.DiagnosticCategory.Error,
    'Types_have_separate_declarations_of_a_private_property_0_2442',
    "Types have separate declarations of a private property '{0}'."
  ),
  Property_0_is_protected_but_type_1_is_not_a_class_derived_from_2: diag(
    2443,
    qt.DiagnosticCategory.Error,
    'Property_0_is_protected_but_type_1_is_not_a_class_derived_from_2_2443',
    "Property '{0}' is protected but type '{1}' is not a class derived from '{2}'."
  ),
  Property_0_is_protected_in_type_1_but_public_in_type_2: diag(
    2444,
    qt.DiagnosticCategory.Error,
    'Property_0_is_protected_in_type_1_but_public_in_type_2_2444',
    "Property '{0}' is protected in type '{1}' but public in type '{2}'."
  ),
  Property_0_is_protected_and_only_accessible_within_class_1_and_its_subclasses: diag(
    2445,
    qt.DiagnosticCategory.Error,
    'Property_0_is_protected_and_only_accessible_within_class_1_and_its_subclasses_2445',
    "Property '{0}' is protected and only accessible within class '{1}' and its subclasses."
  ),
  Property_0_is_protected_and_only_accessible_through_an_instance_of_class_1: diag(
    2446,
    qt.DiagnosticCategory.Error,
    'Property_0_is_protected_and_only_accessible_through_an_instance_of_class_1_2446',
    "Property '{0}' is protected and only accessible through an instance of class '{1}'."
  ),
  The_0_operator_is_not_allowed_for_boolean_types_Consider_using_1_instead: diag(
    2447,
    qt.DiagnosticCategory.Error,
    'The_0_operator_is_not_allowed_for_boolean_types_Consider_using_1_instead_2447',
    "The '{0}' operator is not allowed for boolean types. Consider using '{1}' instead."
  ),
  Block_scoped_variable_0_used_before_its_declaration: diag(
    2448,
    qt.DiagnosticCategory.Error,
    'Block_scoped_variable_0_used_before_its_declaration_2448',
    "Block-scoped variable '{0}' used before its declaration."
  ),
  Class_0_used_before_its_declaration: diag(2449, qt.DiagnosticCategory.Error, 'Class_0_used_before_its_declaration_2449', "Class '{0}' used before its declaration."),
  Enum_0_used_before_its_declaration: diag(2450, qt.DiagnosticCategory.Error, 'Enum_0_used_before_its_declaration_2450', "Enum '{0}' used before its declaration."),
  Cannot_redeclare_block_scoped_variable_0: diag(2451, qt.DiagnosticCategory.Error, 'Cannot_redeclare_block_scoped_variable_0_2451', "Cannot redeclare block-scoped variable '{0}'."),
  An_enum_member_cannot_have_a_numeric_name: diag(2452, qt.DiagnosticCategory.Error, 'An_enum_member_cannot_have_a_numeric_name_2452', 'An enum member cannot have a numeric name.'),
  The_type_argument_for_type_parameter_0_cannot_be_inferred_from_the_usage_Consider_specifying_the_type_arguments_explicitly: diag(
    2453,
    qt.DiagnosticCategory.Error,
    'The_type_argument_for_type_parameter_0_cannot_be_inferred_from_the_usage_Consider_specifying_the_typ_2453',
    "The type argument for type parameter '{0}' cannot be inferred from the usage. Consider specifying the type arguments explicitly."
  ),
  Variable_0_is_used_before_being_assigned: diag(2454, qt.DiagnosticCategory.Error, 'Variable_0_is_used_before_being_assigned_2454', "Variable '{0}' is used before being assigned."),
  Type_argument_candidate_1_is_not_a_valid_type_argument_because_it_is_not_a_supertype_of_candidate_0: diag(
    2455,
    qt.DiagnosticCategory.Error,
    'Type_argument_candidate_1_is_not_a_valid_type_argument_because_it_is_not_a_supertype_of_candidate_0_2455',
    "Type argument candidate '{1}' is not a valid type argument because it is not a supertype of candidate '{0}'."
  ),
  Type_alias_0_circularly_references_itself: diag(2456, qt.DiagnosticCategory.Error, 'Type_alias_0_circularly_references_itself_2456', "Type alias '{0}' circularly references itself."),
  Type_alias_name_cannot_be_0: diag(2457, qt.DiagnosticCategory.Error, 'Type_alias_name_cannot_be_0_2457', "Type alias name cannot be '{0}'."),
  An_AMD_module_cannot_have_multiple_name_assignments: diag(
    2458,
    qt.DiagnosticCategory.Error,
    'An_AMD_module_cannot_have_multiple_name_assignments_2458',
    'An AMD module cannot have multiple name assignments.'
  ),
  Module_0_declares_1_locally_but_it_is_not_exported: diag(
    2459,
    qt.DiagnosticCategory.Error,
    'Module_0_declares_1_locally_but_it_is_not_exported_2459',
    "Module '{0}' declares '{1}' locally, but it is not exported."
  ),
  Module_0_declares_1_locally_but_it_is_exported_as_2: diag(
    2460,
    qt.DiagnosticCategory.Error,
    'Module_0_declares_1_locally_but_it_is_exported_as_2_2460',
    "Module '{0}' declares '{1}' locally, but it is exported as '{2}'."
  ),
  Type_0_is_not_an_array_type: diag(2461, qt.DiagnosticCategory.Error, 'Type_0_is_not_an_array_type_2461', "Type '{0}' is not an array type."),
  A_rest_element_must_be_last_in_a_destructuring_pattern: diag(
    2462,
    qt.DiagnosticCategory.Error,
    'A_rest_element_must_be_last_in_a_destructuring_pattern_2462',
    'A rest element must be last in a destructuring pattern.'
  ),
  A_binding_pattern_parameter_cannot_be_optional_in_an_implementation_signature: diag(
    2463,
    qt.DiagnosticCategory.Error,
    'A_binding_pattern_parameter_cannot_be_optional_in_an_implementation_signature_2463',
    'A binding pattern parameter cannot be optional in an implementation signature.'
  ),
  A_computed_property_name_must_be_of_type_string_number_symbol_or_any: diag(
    2464,
    qt.DiagnosticCategory.Error,
    'A_computed_property_name_must_be_of_type_string_number_symbol_or_any_2464',
    "A computed property name must be of type 'string', 'number', 'symbol', or 'any'."
  ),
  this_cannot_be_referenced_in_a_computed_property_name: diag(
    2465,
    qt.DiagnosticCategory.Error,
    'this_cannot_be_referenced_in_a_computed_property_name_2465',
    "'this' cannot be referenced in a computed property name."
  ),
  super_cannot_be_referenced_in_a_computed_property_name: diag(
    2466,
    qt.DiagnosticCategory.Error,
    'super_cannot_be_referenced_in_a_computed_property_name_2466',
    "'super' cannot be referenced in a computed property name."
  ),
  A_computed_property_name_cannot_reference_a_type_parameter_from_its_containing_type: diag(
    2467,
    qt.DiagnosticCategory.Error,
    'A_computed_property_name_cannot_reference_a_type_parameter_from_its_containing_type_2467',
    'A computed property name cannot reference a type parameter from its containing type.'
  ),
  Cannot_find_global_value_0: diag(2468, qt.DiagnosticCategory.Error, 'Cannot_find_global_value_0_2468', "Cannot find global value '{0}'."),
  The_0_operator_cannot_be_applied_to_type_symbol: diag(
    2469,
    qt.DiagnosticCategory.Error,
    'The_0_operator_cannot_be_applied_to_type_symbol_2469',
    "The '{0}' operator cannot be applied to type 'symbol'."
  ),
  Symbol_reference_does_not_refer_to_the_global_Symbol_constructor_object: diag(
    2470,
    qt.DiagnosticCategory.Error,
    'Symbol_reference_does_not_refer_to_the_global_Symbol_constructor_object_2470',
    "'Symbol' reference does not refer to the global Symbol constructor object."
  ),
  A_computed_property_name_of_the_form_0_must_be_of_type_symbol: diag(
    2471,
    qt.DiagnosticCategory.Error,
    'A_computed_property_name_of_the_form_0_must_be_of_type_symbol_2471',
    "A computed property name of the form '{0}' must be of type 'symbol'."
  ),
  Spread_operator_in_new_expressions_is_only_available_when_targeting_ECMAScript_5_and_higher: diag(
    2472,
    qt.DiagnosticCategory.Error,
    'Spread_operator_in_new_expressions_is_only_available_when_targeting_ECMAScript_5_and_higher_2472',
    "Spread operator in 'new' expressions is only available when targeting ECMAScript 5 and higher."
  ),
  Enum_declarations_must_all_be_const_or_non_const: diag(
    2473,
    qt.DiagnosticCategory.Error,
    'Enum_declarations_must_all_be_const_or_non_const_2473',
    'Enum declarations must all be const or non-const.'
  ),
  const_enum_member_initializers_can_only_contain_literal_values_and_other_computed_enum_values: diag(
    2474,
    qt.DiagnosticCategory.Error,
    'const_enum_member_initializers_can_only_contain_literal_values_and_other_computed_enum_values_2474',
    'const enum member initializers can only contain literal values and other computed enum values.'
  ),
  const_enums_can_only_be_used_in_property_or_index_access_expressions_or_the_right_hand_side_of_an_import_declaration_or_export_assignment_or_type_query: diag(
    2475,
    qt.DiagnosticCategory.Error,
    'const_enums_can_only_be_used_in_property_or_index_access_expressions_or_the_right_hand_side_of_an_im_2475',
    "'const' enums can only be used in property or index access expressions or the right hand side of an import declaration or export assignment or type query."
  ),
  A_const_enum_member_can_only_be_accessed_using_a_string_literal: diag(
    2476,
    qt.DiagnosticCategory.Error,
    'A_const_enum_member_can_only_be_accessed_using_a_string_literal_2476',
    'A const enum member can only be accessed using a string literal.'
  ),
  const_enum_member_initializer_was_evaluated_to_a_non_finite_value: diag(
    2477,
    qt.DiagnosticCategory.Error,
    'const_enum_member_initializer_was_evaluated_to_a_non_finite_value_2477',
    "'const' enum member initializer was evaluated to a non-finite value."
  ),
  const_enum_member_initializer_was_evaluated_to_disallowed_value_NaN: diag(
    2478,
    qt.DiagnosticCategory.Error,
    'const_enum_member_initializer_was_evaluated_to_disallowed_value_NaN_2478',
    "'const' enum member initializer was evaluated to disallowed value 'NaN'."
  ),
  Property_0_does_not_exist_on_const_enum_1: diag(2479, qt.DiagnosticCategory.Error, 'Property_0_does_not_exist_on_const_enum_1_2479', "Property '{0}' does not exist on 'const' enum '{1}'."),
  let_is_not_allowed_to_be_used_as_a_name_in_let_or_const_declarations: diag(
    2480,
    qt.DiagnosticCategory.Error,
    'let_is_not_allowed_to_be_used_as_a_name_in_let_or_const_declarations_2480',
    "'let' is not allowed to be used as a name in 'let' or 'const' declarations."
  ),
  Cannot_initialize_outer_scoped_variable_0_in_the_same_scope_as_block_scoped_declaration_1: diag(
    2481,
    qt.DiagnosticCategory.Error,
    'Cannot_initialize_outer_scoped_variable_0_in_the_same_scope_as_block_scoped_declaration_1_2481',
    "Cannot initialize outer scoped variable '{0}' in the same scope as block scoped declaration '{1}'."
  ),
  The_left_hand_side_of_a_for_of_statement_cannot_use_a_type_annotation: diag(
    2483,
    qt.DiagnosticCategory.Error,
    'The_left_hand_side_of_a_for_of_statement_cannot_use_a_type_annotation_2483',
    "The left-hand side of a 'for...of' statement cannot use a type annotation."
  ),
  Export_declaration_conflicts_with_exported_declaration_of_0: diag(
    2484,
    qt.DiagnosticCategory.Error,
    'Export_declaration_conflicts_with_exported_declaration_of_0_2484',
    "Export declaration conflicts with exported declaration of '{0}'."
  ),
  The_left_hand_side_of_a_for_of_statement_must_be_a_variable_or_a_property_access: diag(
    2487,
    qt.DiagnosticCategory.Error,
    'The_left_hand_side_of_a_for_of_statement_must_be_a_variable_or_a_property_access_2487',
    "The left-hand side of a 'for...of' statement must be a variable or a property access."
  ),
  Type_0_must_have_a_Symbol_iterator_method_that_returns_an_iterator: diag(
    2488,
    qt.DiagnosticCategory.Error,
    'Type_0_must_have_a_Symbol_iterator_method_that_returns_an_iterator_2488',
    "Type '{0}' must have a '[Symbol.iterator]()' method that returns an iterator."
  ),
  An_iterator_must_have_a_next_method: diag(2489, qt.DiagnosticCategory.Error, 'An_iterator_must_have_a_next_method_2489', "An iterator must have a 'next()' method."),
  The_type_returned_by_the_0_method_of_an_iterator_must_have_a_value_property: diag(
    2490,
    qt.DiagnosticCategory.Error,
    'The_type_returned_by_the_0_method_of_an_iterator_must_have_a_value_property_2490',
    "The type returned by the '{0}()' method of an iterator must have a 'value' property."
  ),
  The_left_hand_side_of_a_for_in_statement_cannot_be_a_destructuring_pattern: diag(
    2491,
    qt.DiagnosticCategory.Error,
    'The_left_hand_side_of_a_for_in_statement_cannot_be_a_destructuring_pattern_2491',
    "The left-hand side of a 'for...in' statement cannot be a destructuring pattern."
  ),
  Cannot_redeclare_identifier_0_in_catch_clause: diag(2492, qt.DiagnosticCategory.Error, 'Cannot_redeclare_identifier_0_in_catch_clause_2492', "Cannot redeclare identifier '{0}' in catch clause."),
  Tuple_type_0_of_length_1_has_no_element_at_index_2: diag(
    2493,
    qt.DiagnosticCategory.Error,
    'Tuple_type_0_of_length_1_has_no_element_at_index_2_2493',
    "Tuple type '{0}' of length '{1}' has no element at index '{2}'."
  ),
  Using_a_string_in_a_for_of_statement_is_only_supported_in_ECMAScript_5_and_higher: diag(
    2494,
    qt.DiagnosticCategory.Error,
    'Using_a_string_in_a_for_of_statement_is_only_supported_in_ECMAScript_5_and_higher_2494',
    "Using a string in a 'for...of' statement is only supported in ECMAScript 5 and higher."
  ),
  Type_0_is_not_an_array_type_or_a_string_type: diag(2495, qt.DiagnosticCategory.Error, 'Type_0_is_not_an_array_type_or_a_string_type_2495', "Type '{0}' is not an array type or a string type."),
  The_arguments_object_cannot_be_referenced_in_an_arrow_function_in_ES3_and_ES5_Consider_using_a_standard_function_expression: diag(
    2496,
    qt.DiagnosticCategory.Error,
    'The_arguments_object_cannot_be_referenced_in_an_arrow_function_in_ES3_and_ES5_Consider_using_a_stand_2496',
    "The 'arguments' object cannot be referenced in an arrow function in ES3 and ES5. Consider using a standard function expression."
  ),
  This_module_can_only_be_referenced_with_ECMAScript_imports_Slashexports_by_turning_on_the_0_flag_and_referencing_its_default_export: diag(
    2497,
    qt.DiagnosticCategory.Error,
    'This_module_can_only_be_referenced_with_ECMAScript_imports_Slashexports_by_turning_on_the_0_flag_and_2497',
    "This module can only be referenced with ECMAScript imports/exports by turning on the '{0}' flag and referencing its default export."
  ),
  Module_0_uses_export_and_cannot_be_used_with_export_Asterisk: diag(
    2498,
    qt.DiagnosticCategory.Error,
    'Module_0_uses_export_and_cannot_be_used_with_export_Asterisk_2498',
    "Module '{0}' uses 'export =' and cannot be used with 'export *'."
  ),
  An_interface_can_only_extend_an_identifier_Slashqualified_name_with_optional_type_arguments: diag(
    2499,
    qt.DiagnosticCategory.Error,
    'An_interface_can_only_extend_an_identifier_Slashqualified_name_with_optional_type_arguments_2499',
    'An interface can only extend an identifier/qualified-name with optional type arguments.'
  ),
  A_class_can_only_implement_an_identifier_Slashqualified_name_with_optional_type_arguments: diag(
    2500,
    qt.DiagnosticCategory.Error,
    'A_class_can_only_implement_an_identifier_Slashqualified_name_with_optional_type_arguments_2500',
    'A class can only implement an identifier/qualified-name with optional type arguments.'
  ),
  A_rest_element_cannot_contain_a_binding_pattern: diag(2501, qt.DiagnosticCategory.Error, 'A_rest_element_cannot_contain_a_binding_pattern_2501', 'A rest element cannot contain a binding pattern.'),
  _0_is_referenced_directly_or_indirectly_in_its_own_type_annotation: diag(
    2502,
    qt.DiagnosticCategory.Error,
    '_0_is_referenced_directly_or_indirectly_in_its_own_type_annotation_2502',
    "'{0}' is referenced directly or indirectly in its own type annotation."
  ),
  Cannot_find_namespace_0: diag(2503, qt.DiagnosticCategory.Error, 'Cannot_find_namespace_0_2503', "Cannot find namespace '{0}'."),
  Type_0_must_have_a_Symbol_asyncIterator_method_that_returns_an_async_iterator: diag(
    2504,
    qt.DiagnosticCategory.Error,
    'Type_0_must_have_a_Symbol_asyncIterator_method_that_returns_an_async_iterator_2504',
    "Type '{0}' must have a '[Symbol.asyncIterator]()' method that returns an async iterator."
  ),
  A_generator_cannot_have_a_void_type_annotation: diag(2505, qt.DiagnosticCategory.Error, 'A_generator_cannot_have_a_void_type_annotation_2505', "A generator cannot have a 'void' type annotation."),
  _0_is_referenced_directly_or_indirectly_in_its_own_base_expression: diag(
    2506,
    qt.DiagnosticCategory.Error,
    '_0_is_referenced_directly_or_indirectly_in_its_own_base_expression_2506',
    "'{0}' is referenced directly or indirectly in its own base expression."
  ),
  Type_0_is_not_a_constructor_function_type: diag(2507, qt.DiagnosticCategory.Error, 'Type_0_is_not_a_constructor_function_type_2507', "Type '{0}' is not a constructor function type."),
  No_base_constructor_has_the_specified_number_of_type_arguments: diag(
    2508,
    qt.DiagnosticCategory.Error,
    'No_base_constructor_has_the_specified_number_of_type_arguments_2508',
    'No base constructor has the specified number of type arguments.'
  ),
  Base_constructor_return_type_0_is_not_an_object_type_or_intersection_of_object_types_with_statically_known_members: diag(
    2509,
    qt.DiagnosticCategory.Error,
    'Base_constructor_return_type_0_is_not_an_object_type_or_intersection_of_object_types_with_statically_2509',
    "Base constructor return type '{0}' is not an object type or intersection of object types with statically known members."
  ),
  Base_constructors_must_all_have_the_same_return_type: diag(
    2510,
    qt.DiagnosticCategory.Error,
    'Base_constructors_must_all_have_the_same_return_type_2510',
    'Base constructors must all have the same return type.'
  ),
  Cannot_create_an_instance_of_an_abstract_class: diag(2511, qt.DiagnosticCategory.Error, 'Cannot_create_an_instance_of_an_abstract_class_2511', 'Cannot create an instance of an abstract class.'),
  Overload_signatures_must_all_be_abstract_or_non_abstract: diag(
    2512,
    qt.DiagnosticCategory.Error,
    'Overload_signatures_must_all_be_abstract_or_non_abstract_2512',
    'Overload signatures must all be abstract or non-abstract.'
  ),
  Abstract_method_0_in_class_1_cannot_be_accessed_via_super_expression: diag(
    2513,
    qt.DiagnosticCategory.Error,
    'Abstract_method_0_in_class_1_cannot_be_accessed_via_super_expression_2513',
    "Abstract method '{0}' in class '{1}' cannot be accessed via super expression."
  ),
  Classes_containing_abstract_methods_must_be_marked_abstract: diag(
    2514,
    qt.DiagnosticCategory.Error,
    'Classes_containing_abstract_methods_must_be_marked_abstract_2514',
    'Classes containing abstract methods must be marked abstract.'
  ),
  Non_abstract_class_0_does_not_implement_inherited_abstract_member_1_from_class_2: diag(
    2515,
    qt.DiagnosticCategory.Error,
    'Non_abstract_class_0_does_not_implement_inherited_abstract_member_1_from_class_2_2515',
    "Non-abstract class '{0}' does not implement inherited abstract member '{1}' from class '{2}'."
  ),
  All_declarations_of_an_abstract_method_must_be_consecutive: diag(
    2516,
    qt.DiagnosticCategory.Error,
    'All_declarations_of_an_abstract_method_must_be_consecutive_2516',
    'All declarations of an abstract method must be consecutive.'
  ),
  Cannot_assign_an_abstract_constructor_type_to_a_non_abstract_constructor_type: diag(
    2517,
    qt.DiagnosticCategory.Error,
    'Cannot_assign_an_abstract_constructor_type_to_a_non_abstract_constructor_type_2517',
    'Cannot assign an abstract constructor type to a non-abstract constructor type.'
  ),
  A_this_based_type_guard_is_not_compatible_with_a_parameter_based_type_guard: diag(
    2518,
    qt.DiagnosticCategory.Error,
    'A_this_based_type_guard_is_not_compatible_with_a_parameter_based_type_guard_2518',
    "A 'this'-based type guard is not compatible with a parameter-based type guard."
  ),
  An_async_iterator_must_have_a_next_method: diag(2519, qt.DiagnosticCategory.Error, 'An_async_iterator_must_have_a_next_method_2519', "An async iterator must have a 'next()' method."),
  Duplicate_identifier_0_Compiler_uses_declaration_1_to_support_async_functions: diag(
    2520,
    qt.DiagnosticCategory.Error,
    'Duplicate_identifier_0_Compiler_uses_declaration_1_to_support_async_functions_2520',
    "Duplicate identifier '{0}'. Compiler uses declaration '{1}' to support async functions."
  ),
  Expression_resolves_to_variable_declaration_0_that_compiler_uses_to_support_async_functions: diag(
    2521,
    qt.DiagnosticCategory.Error,
    'Expression_resolves_to_variable_declaration_0_that_compiler_uses_to_support_async_functions_2521',
    "Expression resolves to variable declaration '{0}' that compiler uses to support async functions."
  ),
  The_arguments_object_cannot_be_referenced_in_an_async_function_or_method_in_ES3_and_ES5_Consider_using_a_standard_function_or_method: diag(
    2522,
    qt.DiagnosticCategory.Error,
    'The_arguments_object_cannot_be_referenced_in_an_async_function_or_method_in_ES3_and_ES5_Consider_usi_2522',
    "The 'arguments' object cannot be referenced in an async function or method in ES3 and ES5. Consider using a standard function or method."
  ),
  yield_expressions_cannot_be_used_in_a_parameter_initializer: diag(
    2523,
    qt.DiagnosticCategory.Error,
    'yield_expressions_cannot_be_used_in_a_parameter_initializer_2523',
    "'yield' expressions cannot be used in a parameter initializer."
  ),
  await_expressions_cannot_be_used_in_a_parameter_initializer: diag(
    2524,
    qt.DiagnosticCategory.Error,
    'await_expressions_cannot_be_used_in_a_parameter_initializer_2524',
    "'await' expressions cannot be used in a parameter initializer."
  ),
  Initializer_provides_no_value_for_this_binding_element_and_the_binding_element_has_no_default_value: diag(
    2525,
    qt.DiagnosticCategory.Error,
    'Initializer_provides_no_value_for_this_binding_element_and_the_binding_element_has_no_default_value_2525',
    'Initializer provides no value for this binding element and the binding element has no default value.'
  ),
  A_this_type_is_available_only_in_a_non_static_member_of_a_class_or_interface: diag(
    2526,
    qt.DiagnosticCategory.Error,
    'A_this_type_is_available_only_in_a_non_static_member_of_a_class_or_interface_2526',
    "A 'this' type is available only in a non-static member of a class or interface."
  ),
  The_inferred_type_of_0_references_an_inaccessible_1_type_A_type_annotation_is_necessary: diag(
    2527,
    qt.DiagnosticCategory.Error,
    'The_inferred_type_of_0_references_an_inaccessible_1_type_A_type_annotation_is_necessary_2527',
    "The inferred type of '{0}' references an inaccessible '{1}' type. A type annotation is necessary."
  ),
  A_module_cannot_have_multiple_default_exports: diag(2528, qt.DiagnosticCategory.Error, 'A_module_cannot_have_multiple_default_exports_2528', 'A module cannot have multiple default exports.'),
  Duplicate_identifier_0_Compiler_reserves_name_1_in_top_level_scope_of_a_module_containing_async_functions: diag(
    2529,
    qt.DiagnosticCategory.Error,
    'Duplicate_identifier_0_Compiler_reserves_name_1_in_top_level_scope_of_a_module_containing_async_func_2529',
    "Duplicate identifier '{0}'. Compiler reserves name '{1}' in top level scope of a module containing async functions."
  ),
  Property_0_is_incompatible_with_index_signature: diag(
    2530,
    qt.DiagnosticCategory.Error,
    'Property_0_is_incompatible_with_index_signature_2530',
    "Property '{0}' is incompatible with index signature."
  ),
  Object_is_possibly_null: diag(2531, qt.DiagnosticCategory.Error, 'Object_is_possibly_null_2531', "Object is possibly 'null'."),
  Object_is_possibly_undefined: diag(2532, qt.DiagnosticCategory.Error, 'Object_is_possibly_undefined_2532', "Object is possibly 'undefined'."),
  Object_is_possibly_null_or_undefined: diag(2533, qt.DiagnosticCategory.Error, 'Object_is_possibly_null_or_undefined_2533', "Object is possibly 'null' or 'undefined'."),
  A_function_returning_never_cannot_have_a_reachable_end_point: diag(
    2534,
    qt.DiagnosticCategory.Error,
    'A_function_returning_never_cannot_have_a_reachable_end_point_2534',
    "A function returning 'never' cannot have a reachable end point."
  ),
  Enum_type_0_has_members_with_initializers_that_are_not_literals: diag(
    2535,
    qt.DiagnosticCategory.Error,
    'Enum_type_0_has_members_with_initializers_that_are_not_literals_2535',
    "Enum type '{0}' has members with initializers that are not literals."
  ),
  Type_0_cannot_be_used_to_index_type_1: diag(2536, qt.DiagnosticCategory.Error, 'Type_0_cannot_be_used_to_index_type_1_2536', "Type '{0}' cannot be used to index type '{1}'."),
  Type_0_has_no_matching_index_signature_for_type_1: diag(
    2537,
    qt.DiagnosticCategory.Error,
    'Type_0_has_no_matching_index_signature_for_type_1_2537',
    "Type '{0}' has no matching index signature for type '{1}'."
  ),
  Type_0_cannot_be_used_as_an_index_type: diag(2538, qt.DiagnosticCategory.Error, 'Type_0_cannot_be_used_as_an_index_type_2538', "Type '{0}' cannot be used as an index type."),
  Cannot_assign_to_0_because_it_is_not_a_variable: diag(
    2539,
    qt.DiagnosticCategory.Error,
    'Cannot_assign_to_0_because_it_is_not_a_variable_2539',
    "Cannot assign to '{0}' because it is not a variable."
  ),
  Cannot_assign_to_0_because_it_is_a_read_only_property: diag(
    2540,
    qt.DiagnosticCategory.Error,
    'Cannot_assign_to_0_because_it_is_a_read_only_property_2540',
    "Cannot assign to '{0}' because it is a read-only property."
  ),
  The_target_of_an_assignment_must_be_a_variable_or_a_property_access: diag(
    2541,
    qt.DiagnosticCategory.Error,
    'The_target_of_an_assignment_must_be_a_variable_or_a_property_access_2541',
    'The target of an assignment must be a variable or a property access.'
  ),
  Index_signature_in_type_0_only_permits_reading: diag(2542, qt.DiagnosticCategory.Error, 'Index_signature_in_type_0_only_permits_reading_2542', "Index signature in type '{0}' only permits reading."),
  Duplicate_identifier_newTarget_Compiler_uses_variable_declaration_newTarget_to_capture_new_target_meta_property_reference: diag(
    2543,
    qt.DiagnosticCategory.Error,
    'Duplicate_identifier_newTarget_Compiler_uses_variable_declaration_newTarget_to_capture_new_target_me_2543',
    "Duplicate identifier '_newTarget'. Compiler uses variable declaration '_newTarget' to capture 'new.target' meta-property reference."
  ),
  Expression_resolves_to_variable_declaration_newTarget_that_compiler_uses_to_capture_new_target_meta_property_reference: diag(
    2544,
    qt.DiagnosticCategory.Error,
    'Expression_resolves_to_variable_declaration_newTarget_that_compiler_uses_to_capture_new_target_meta__2544',
    "Expression resolves to variable declaration '_newTarget' that compiler uses to capture 'new.target' meta-property reference."
  ),
  A_mixin_class_must_have_a_constructor_with_a_single_rest_parameter_of_type_any: diag(
    2545,
    qt.DiagnosticCategory.Error,
    'A_mixin_class_must_have_a_constructor_with_a_single_rest_parameter_of_type_any_2545',
    "A mixin class must have a constructor with a single rest parameter of type 'any[]'."
  ),
  The_type_returned_by_the_0_method_of_an_async_iterator_must_be_a_promise_for_a_type_with_a_value_property: diag(
    2547,
    qt.DiagnosticCategory.Error,
    'The_type_returned_by_the_0_method_of_an_async_iterator_must_be_a_promise_for_a_type_with_a_value_pro_2547',
    "The type returned by the '{0}()' method of an async iterator must be a promise for a type with a 'value' property."
  ),
  Type_0_is_not_an_array_type_or_does_not_have_a_Symbol_iterator_method_that_returns_an_iterator: diag(
    2548,
    qt.DiagnosticCategory.Error,
    'Type_0_is_not_an_array_type_or_does_not_have_a_Symbol_iterator_method_that_returns_an_iterator_2548',
    "Type '{0}' is not an array type or does not have a '[Symbol.iterator]()' method that returns an iterator."
  ),
  Type_0_is_not_an_array_type_or_a_string_type_or_does_not_have_a_Symbol_iterator_method_that_returns_an_iterator: diag(
    2549,
    qt.DiagnosticCategory.Error,
    'Type_0_is_not_an_array_type_or_a_string_type_or_does_not_have_a_Symbol_iterator_method_that_returns__2549',
    "Type '{0}' is not an array type or a string type or does not have a '[Symbol.iterator]()' method that returns an iterator."
  ),
  Property_0_does_not_exist_on_type_1_Did_you_mean_2: diag(
    2551,
    qt.DiagnosticCategory.Error,
    'Property_0_does_not_exist_on_type_1_Did_you_mean_2_2551',
    "Property '{0}' does not exist on type '{1}'. Did you mean '{2}'?"
  ),
  Cannot_find_name_0_Did_you_mean_1: diag(2552, qt.DiagnosticCategory.Error, 'Cannot_find_name_0_Did_you_mean_1_2552', "Cannot find name '{0}'. Did you mean '{1}'?"),
  Computed_values_are_not_permitted_in_an_enum_with_string_valued_members: diag(
    2553,
    qt.DiagnosticCategory.Error,
    'Computed_values_are_not_permitted_in_an_enum_with_string_valued_members_2553',
    'Computed values are not permitted in an enum with string valued members.'
  ),
  Expected_0_arguments_but_got_1: diag(2554, qt.DiagnosticCategory.Error, 'Expected_0_arguments_but_got_1_2554', 'Expected {0} arguments, but got {1}.'),
  Expected_at_least_0_arguments_but_got_1: diag(2555, qt.DiagnosticCategory.Error, 'Expected_at_least_0_arguments_but_got_1_2555', 'Expected at least {0} arguments, but got {1}.'),
  Expected_0_arguments_but_got_1_or_more: diag(2556, qt.DiagnosticCategory.Error, 'Expected_0_arguments_but_got_1_or_more_2556', 'Expected {0} arguments, but got {1} or more.'),
  Expected_at_least_0_arguments_but_got_1_or_more: diag(
    2557,
    qt.DiagnosticCategory.Error,
    'Expected_at_least_0_arguments_but_got_1_or_more_2557',
    'Expected at least {0} arguments, but got {1} or more.'
  ),
  Expected_0_type_arguments_but_got_1: diag(2558, qt.DiagnosticCategory.Error, 'Expected_0_type_arguments_but_got_1_2558', 'Expected {0} type arguments, but got {1}.'),
  Type_0_has_no_properties_in_common_with_type_1: diag(
    2559,
    qt.DiagnosticCategory.Error,
    'Type_0_has_no_properties_in_common_with_type_1_2559',
    "Type '{0}' has no properties in common with type '{1}'."
  ),
  Value_of_type_0_has_no_properties_in_common_with_type_1_Did_you_mean_to_call_it: diag(
    2560,
    qt.DiagnosticCategory.Error,
    'Value_of_type_0_has_no_properties_in_common_with_type_1_Did_you_mean_to_call_it_2560',
    "Value of type '{0}' has no properties in common with type '{1}'. Did you mean to call it?"
  ),
  Object_literal_may_only_specify_known_properties_but_0_does_not_exist_in_type_1_Did_you_mean_to_write_2: diag(
    2561,
    qt.DiagnosticCategory.Error,
    'Object_literal_may_only_specify_known_properties_but_0_does_not_exist_in_type_1_Did_you_mean_to_writ_2561',
    "Object literal may only specify known properties, but '{0}' does not exist in type '{1}'. Did you mean to write '{2}'?"
  ),
  Base_class_expressions_cannot_reference_class_type_parameters: diag(
    2562,
    qt.DiagnosticCategory.Error,
    'Base_class_expressions_cannot_reference_class_type_parameters_2562',
    'Base class expressions cannot reference class type parameters.'
  ),
  The_containing_function_or_module_body_is_too_large_for_control_flow_analysis: diag(
    2563,
    qt.DiagnosticCategory.Error,
    'The_containing_function_or_module_body_is_too_large_for_control_flow_analysis_2563',
    'The containing function or module body is too large for control flow analysis.'
  ),
  Property_0_has_no_initializer_and_is_not_definitely_assigned_in_the_constructor: diag(
    2564,
    qt.DiagnosticCategory.Error,
    'Property_0_has_no_initializer_and_is_not_definitely_assigned_in_the_constructor_2564',
    "Property '{0}' has no initializer and is not definitely assigned in the constructor."
  ),
  Property_0_is_used_before_being_assigned: diag(2565, qt.DiagnosticCategory.Error, 'Property_0_is_used_before_being_assigned_2565', "Property '{0}' is used before being assigned."),
  A_rest_element_cannot_have_a_property_name: diag(2566, qt.DiagnosticCategory.Error, 'A_rest_element_cannot_have_a_property_name_2566', 'A rest element cannot have a property name.'),
  Enum_declarations_can_only_merge_with_namespace_or_other_enum_declarations: diag(
    2567,
    qt.DiagnosticCategory.Error,
    'Enum_declarations_can_only_merge_with_namespace_or_other_enum_declarations_2567',
    'Enum declarations can only merge with namespace or other enum declarations.'
  ),
  Type_0_is_not_an_array_type_or_a_string_type_Use_compiler_option_downlevelIteration_to_allow_iterating_of_iterators: diag(
    2569,
    qt.DiagnosticCategory.Error,
    'Type_0_is_not_an_array_type_or_a_string_type_Use_compiler_option_downlevelIteration_to_allow_iterati_2569',
    "Type '{0}' is not an array type or a string type. Use compiler option '--downlevelIteration' to allow iterating of iterators."
  ),
  Object_is_of_type_unknown: diag(2571, qt.DiagnosticCategory.Error, 'Object_is_of_type_unknown_2571', "Object is of type 'unknown'."),
  Rest_signatures_are_incompatible: diag(2572, qt.DiagnosticCategory.Error, 'Rest_signatures_are_incompatible_2572', 'Rest signatures are incompatible.'),
  Property_0_is_incompatible_with_rest_element_type: diag(
    2573,
    qt.DiagnosticCategory.Error,
    'Property_0_is_incompatible_with_rest_element_type_2573',
    "Property '{0}' is incompatible with rest element type."
  ),
  A_rest_element_type_must_be_an_array_type: diag(2574, qt.DiagnosticCategory.Error, 'A_rest_element_type_must_be_an_array_type_2574', 'A rest element type must be an array type.'),
  No_overload_expects_0_arguments_but_overloads_do_exist_that_expect_either_1_or_2_arguments: diag(
    2575,
    qt.DiagnosticCategory.Error,
    'No_overload_expects_0_arguments_but_overloads_do_exist_that_expect_either_1_or_2_arguments_2575',
    'No overload expects {0} arguments, but overloads do exist that expect either {1} or {2} arguments.'
  ),
  Property_0_is_a_static_member_of_type_1: diag(2576, qt.DiagnosticCategory.Error, 'Property_0_is_a_static_member_of_type_1_2576', "Property '{0}' is a static member of type '{1}'"),
  Return_type_annotation_circularly_references_itself: diag(
    2577,
    qt.DiagnosticCategory.Error,
    'Return_type_annotation_circularly_references_itself_2577',
    'Return type annotation circularly references itself.'
  ),
  Unused_ts_expect_error_directive: diag(2578, qt.DiagnosticCategory.Error, 'Unused_ts_expect_error_directive_2578', "Unused '@ts-expect-error' directive."),
  Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_node_Try_npm_i_types_Slashnode: diag(
    2580,
    qt.DiagnosticCategory.Error,
    'Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_node_Try_npm_i_types_Slashnode_2580',
    "Cannot find name '{0}'. Do you need to install type definitions for node? Try `npm i @types/node`."
  ),
  Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_jQuery_Try_npm_i_types_Slashjquery: diag(
    2581,
    qt.DiagnosticCategory.Error,
    'Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_jQuery_Try_npm_i_types_Slashjquery_2581',
    "Cannot find name '{0}'. Do you need to install type definitions for jQuery? Try `npm i @types/jquery`."
  ),
  Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_a_test_runner_Try_npm_i_types_Slashjest_or_npm_i_types_Slashmocha: diag(
    2582,
    qt.DiagnosticCategory.Error,
    'Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_a_test_runner_Try_npm_i_types_Slashje_2582',
    "Cannot find name '{0}'. Do you need to install type definitions for a test runner? Try `npm i @types/jest` or `npm i @types/mocha`."
  ),
  Cannot_find_name_0_Do_you_need_to_change_your_target_library_Try_changing_the_lib_compiler_option_to_es2015_or_later: diag(
    2583,
    qt.DiagnosticCategory.Error,
    'Cannot_find_name_0_Do_you_need_to_change_your_target_library_Try_changing_the_lib_compiler_option_to_2583',
    "Cannot find name '{0}'. Do you need to change your target library? Try changing the `lib` compiler option to es2015 or later."
  ),
  Cannot_find_name_0_Do_you_need_to_change_your_target_library_Try_changing_the_lib_compiler_option_to_include_dom: diag(
    2584,
    qt.DiagnosticCategory.Error,
    'Cannot_find_name_0_Do_you_need_to_change_your_target_library_Try_changing_the_lib_compiler_option_to_2584',
    "Cannot find name '{0}'. Do you need to change your target library? Try changing the `lib` compiler option to include 'dom'."
  ),
  _0_only_refers_to_a_type_but_is_being_used_as_a_value_here_Do_you_need_to_change_your_target_library_Try_changing_the_lib_compiler_option_to_es2015_or_later: diag(
    2585,
    qt.DiagnosticCategory.Error,
    '_0_only_refers_to_a_type_but_is_being_used_as_a_value_here_Do_you_need_to_change_your_target_library_2585',
    "'{0}' only refers to a type, but is being used as a value here. Do you need to change your target library? Try changing the `lib` compiler option to es2015 or later."
  ),
  Enum_type_0_circularly_references_itself: diag(2586, qt.DiagnosticCategory.Error, 'Enum_type_0_circularly_references_itself_2586', "Enum type '{0}' circularly references itself."),
  JSDoc_type_0_circularly_references_itself: diag(2587, qt.DiagnosticCategory.Error, 'JSDoc_type_0_circularly_references_itself_2587', "JSDoc type '{0}' circularly references itself."),
  Cannot_assign_to_0_because_it_is_a_constant: diag(2588, qt.DiagnosticCategory.Error, 'Cannot_assign_to_0_because_it_is_a_constant_2588', "Cannot assign to '{0}' because it is a constant."),
  Type_instantiation_is_excessively_deep_and_possibly_infinite: diag(
    2589,
    qt.DiagnosticCategory.Error,
    'Type_instantiation_is_excessively_deep_and_possibly_infinite_2589',
    'Type instantiation is excessively deep and possibly infinite.'
  ),
  Expression_produces_a_union_type_that_is_too_complex_to_represent: diag(
    2590,
    qt.DiagnosticCategory.Error,
    'Expression_produces_a_union_type_that_is_too_complex_to_represent_2590',
    'Expression produces a union type that is too complex to represent.'
  ),
  Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_node_Try_npm_i_types_Slashnode_and_then_add_node_to_the_types_field_in_your_tsconfig: diag(
    2591,
    qt.DiagnosticCategory.Error,
    'Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_node_Try_npm_i_types_Slashnode_and_th_2591',
    "Cannot find name '{0}'. Do you need to install type definitions for node? Try `npm i @types/node` and then add `node` to the types field in your tsconfig."
  ),
  Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_jQuery_Try_npm_i_types_Slashjquery_and_then_add_jquery_to_the_types_field_in_your_tsconfig: diag(
    2592,
    qt.DiagnosticCategory.Error,
    'Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_jQuery_Try_npm_i_types_Slashjquery_an_2592',
    "Cannot find name '{0}'. Do you need to install type definitions for jQuery? Try `npm i @types/jquery` and then add `jquery` to the types field in your tsconfig."
  ),
  Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_a_test_runner_Try_npm_i_types_Slashjest_or_npm_i_types_Slashmocha_and_then_add_jest_or_mocha_to_the_types_field_in_your_tsconfig: diag(
    2593,
    qt.DiagnosticCategory.Error,
    'Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_a_test_runner_Try_npm_i_types_Slashje_2593',
    "Cannot find name '{0}'. Do you need to install type definitions for a test runner? Try `npm i @types/jest` or `npm i @types/mocha` and then add `jest` or `mocha` to the types field in your tsconfig."
  ),
  This_module_is_declared_with_using_export_and_can_only_be_used_with_a_default_import_when_using_the_0_flag: diag(
    2594,
    qt.DiagnosticCategory.Error,
    'This_module_is_declared_with_using_export_and_can_only_be_used_with_a_default_import_when_using_the__2594',
    "This module is declared with using 'export =', and can only be used with a default import when using the '{0}' flag."
  ),
  _0_can_only_be_imported_by_using_a_default_import: diag(
    2595,
    qt.DiagnosticCategory.Error,
    '_0_can_only_be_imported_by_using_a_default_import_2595',
    "'{0}' can only be imported by using a default import."
  ),
  _0_can_only_be_imported_by_turning_on_the_esModuleInterop_flag_and_using_a_default_import: diag(
    2596,
    qt.DiagnosticCategory.Error,
    '_0_can_only_be_imported_by_turning_on_the_esModuleInterop_flag_and_using_a_default_import_2596',
    "'{0}' can only be imported by turning on the 'esModuleInterop' flag and using a default import."
  ),
  _0_can_only_be_imported_by_using_a_require_call_or_by_using_a_default_import: diag(
    2597,
    qt.DiagnosticCategory.Error,
    '_0_can_only_be_imported_by_using_a_require_call_or_by_using_a_default_import_2597',
    "'{0}' can only be imported by using a 'require' call or by using a default import."
  ),
  _0_can_only_be_imported_by_using_a_require_call_or_by_turning_on_the_esModuleInterop_flag_and_using_a_default_import: diag(
    2598,
    qt.DiagnosticCategory.Error,
    '_0_can_only_be_imported_by_using_a_require_call_or_by_turning_on_the_esModuleInterop_flag_and_using__2598',
    "'{0}' can only be imported by using a 'require' call or by turning on the 'esModuleInterop' flag and using a default import."
  ),
  JSX_element_attributes_type_0_may_not_be_a_union_type: diag(
    2600,
    qt.DiagnosticCategory.Error,
    'JSX_element_attributes_type_0_may_not_be_a_union_type_2600',
    "JSX element attributes type '{0}' may not be a union type."
  ),
  The_return_type_of_a_JSX_element_constructor_must_return_an_object_type: diag(
    2601,
    qt.DiagnosticCategory.Error,
    'The_return_type_of_a_JSX_element_constructor_must_return_an_object_type_2601',
    'The return type of a JSX element constructor must return an object type.'
  ),
  JSX_element_implicitly_has_type_any_because_the_global_type_JSX_Element_does_not_exist: diag(
    2602,
    qt.DiagnosticCategory.Error,
    'JSX_element_implicitly_has_type_any_because_the_global_type_JSX_Element_does_not_exist_2602',
    "JSX element implicitly has type 'any' because the global type 'JSX.Element' does not exist."
  ),
  Property_0_in_type_1_is_not_assignable_to_type_2: diag(
    2603,
    qt.DiagnosticCategory.Error,
    'Property_0_in_type_1_is_not_assignable_to_type_2_2603',
    "Property '{0}' in type '{1}' is not assignable to type '{2}'."
  ),
  JSX_element_type_0_does_not_have_any_construct_or_call_signatures: diag(
    2604,
    qt.DiagnosticCategory.Error,
    'JSX_element_type_0_does_not_have_any_construct_or_call_signatures_2604',
    "JSX element type '{0}' does not have any construct or call signatures."
  ),
  JSX_element_type_0_is_not_a_constructor_function_for_JSX_elements: diag(
    2605,
    qt.DiagnosticCategory.Error,
    'JSX_element_type_0_is_not_a_constructor_function_for_JSX_elements_2605',
    "JSX element type '{0}' is not a constructor function for JSX elements."
  ),
  Property_0_of_JSX_spread_attribute_is_not_assignable_to_target_property: diag(
    2606,
    qt.DiagnosticCategory.Error,
    'Property_0_of_JSX_spread_attribute_is_not_assignable_to_target_property_2606',
    "Property '{0}' of JSX spread attribute is not assignable to target property."
  ),
  JSX_element_class_does_not_support_attributes_because_it_does_not_have_a_0_property: diag(
    2607,
    qt.DiagnosticCategory.Error,
    'JSX_element_class_does_not_support_attributes_because_it_does_not_have_a_0_property_2607',
    "JSX element class does not support attributes because it does not have a '{0}' property."
  ),
  The_global_type_JSX_0_may_not_have_more_than_one_property: diag(
    2608,
    qt.DiagnosticCategory.Error,
    'The_global_type_JSX_0_may_not_have_more_than_one_property_2608',
    "The global type 'JSX.{0}' may not have more than one property."
  ),
  JSX_spread_child_must_be_an_array_type: diag(2609, qt.DiagnosticCategory.Error, 'JSX_spread_child_must_be_an_array_type_2609', 'JSX spread child must be an array type.'),
  _0_is_defined_as_an_accessor_in_class_1_but_is_overridden_here_in_2_as_an_instance_property: diag(
    2610,
    qt.DiagnosticCategory.Error,
    '_0_is_defined_as_an_accessor_in_class_1_but_is_overridden_here_in_2_as_an_instance_property_2610',
    "'{0}' is defined as an accessor in class '{1}', but is overridden here in '{2}' as an instance property."
  ),
  _0_is_defined_as_a_property_in_class_1_but_is_overridden_here_in_2_as_an_accessor: diag(
    2611,
    qt.DiagnosticCategory.Error,
    '_0_is_defined_as_a_property_in_class_1_but_is_overridden_here_in_2_as_an_accessor_2611',
    "'{0}' is defined as a property in class '{1}', but is overridden here in '{2}' as an accessor."
  ),
  Property_0_will_overwrite_the_base_property_in_1_If_this_is_intentional_add_an_initializer_Otherwise_add_a_declare_modifier_or_remove_the_redundant_declaration: diag(
    2612,
    qt.DiagnosticCategory.Error,
    'Property_0_will_overwrite_the_base_property_in_1_If_this_is_intentional_add_an_initializer_Otherwise_2612',
    "Property '{0}' will overwrite the base property in '{1}'. If this is intentional, add an initializer. Otherwise, add a 'declare' modifier or remove the redundant declaration."
  ),
  Module_0_has_no_default_export_Did_you_mean_to_use_import_1_from_0_instead: diag(
    2613,
    qt.DiagnosticCategory.Error,
    'Module_0_has_no_default_export_Did_you_mean_to_use_import_1_from_0_instead_2613',
    "Module '{0}' has no default export. Did you mean to use 'import { {1} } from {0}' instead?"
  ),
  Module_0_has_no_exported_member_1_Did_you_mean_to_use_import_1_from_0_instead: diag(
    2614,
    qt.DiagnosticCategory.Error,
    'Module_0_has_no_exported_member_1_Did_you_mean_to_use_import_1_from_0_instead_2614',
    "Module '{0}' has no exported member '{1}'. Did you mean to use 'import {1} from {0}' instead?"
  ),
  Type_of_property_0_circularly_references_itself_in_mapped_type_1: diag(
    2615,
    qt.DiagnosticCategory.Error,
    'Type_of_property_0_circularly_references_itself_in_mapped_type_1_2615',
    "Type of property '{0}' circularly references itself in mapped type '{1}'."
  ),
  _0_can_only_be_imported_by_using_import_1_require_2_or_a_default_import: diag(
    2616,
    qt.DiagnosticCategory.Error,
    '_0_can_only_be_imported_by_using_import_1_require_2_or_a_default_import_2616',
    "'{0}' can only be imported by using 'import {1} = require({2})' or a default import."
  ),
  _0_can_only_be_imported_by_using_import_1_require_2_or_by_turning_on_the_esModuleInterop_flag_and_using_a_default_import: diag(
    2617,
    qt.DiagnosticCategory.Error,
    '_0_can_only_be_imported_by_using_import_1_require_2_or_by_turning_on_the_esModuleInterop_flag_and_us_2617',
    "'{0}' can only be imported by using 'import {1} = require({2})' or by turning on the 'esModuleInterop' flag and using a default import."
  ),
  Cannot_augment_module_0_with_value_exports_because_it_resolves_to_a_non_module_entity: diag(
    2649,
    qt.DiagnosticCategory.Error,
    'Cannot_augment_module_0_with_value_exports_because_it_resolves_to_a_non_module_entity_2649',
    "Cannot augment module '{0}' with value exports because it resolves to a non-module entity."
  ),
  A_member_initializer_in_a_enum_declaration_cannot_reference_members_declared_after_it_including_members_defined_in_other_enums: diag(
    2651,
    qt.DiagnosticCategory.Error,
    'A_member_initializer_in_a_enum_declaration_cannot_reference_members_declared_after_it_including_memb_2651',
    'A member initializer in a enum declaration cannot reference members declared after it, including members defined in other enums.'
  ),
  Merged_declaration_0_cannot_include_a_default_export_declaration_Consider_adding_a_separate_export_default_0_declaration_instead: diag(
    2652,
    qt.DiagnosticCategory.Error,
    'Merged_declaration_0_cannot_include_a_default_export_declaration_Consider_adding_a_separate_export_d_2652',
    "Merged declaration '{0}' cannot include a default export declaration. Consider adding a separate 'export default {0}' declaration instead."
  ),
  Non_abstract_class_expression_does_not_implement_inherited_abstract_member_0_from_class_1: diag(
    2653,
    qt.DiagnosticCategory.Error,
    'Non_abstract_class_expression_does_not_implement_inherited_abstract_member_0_from_class_1_2653',
    "Non-abstract class expression does not implement inherited abstract member '{0}' from class '{1}'."
  ),
  Exported_external_package_typings_file_cannot_contain_tripleslash_references_Please_contact_the_package_author_to_update_the_package_definition: diag(
    2654,
    qt.DiagnosticCategory.Error,
    'Exported_external_package_typings_file_cannot_contain_tripleslash_references_Please_contact_the_pack_2654',
    'Exported external package typings file cannot contain tripleslash references. Please contact the package author to update the package definition.'
  ),
  Exported_external_package_typings_file_0_is_not_a_module_Please_contact_the_package_author_to_update_the_package_definition: diag(
    2656,
    qt.DiagnosticCategory.Error,
    'Exported_external_package_typings_file_0_is_not_a_module_Please_contact_the_package_author_to_update_2656',
    "Exported external package typings file '{0}' is not a module. Please contact the package author to update the package definition."
  ),
  JSX_expressions_must_have_one_parent_element: diag(2657, qt.DiagnosticCategory.Error, 'JSX_expressions_must_have_one_parent_element_2657', 'JSX expressions must have one parent element.'),
  Type_0_provides_no_match_for_the_signature_1: diag(2658, qt.DiagnosticCategory.Error, 'Type_0_provides_no_match_for_the_signature_1_2658', "Type '{0}' provides no match for the signature '{1}'."),
  super_is_only_allowed_in_members_of_object_literal_expressions_when_option_target_is_ES2015_or_higher: diag(
    2659,
    qt.DiagnosticCategory.Error,
    'super_is_only_allowed_in_members_of_object_literal_expressions_when_option_target_is_ES2015_or_highe_2659',
    "'super' is only allowed in members of object literal expressions when option 'target' is 'ES2015' or higher."
  ),
  super_can_only_be_referenced_in_members_of_derived_classes_or_object_literal_expressions: diag(
    2660,
    qt.DiagnosticCategory.Error,
    'super_can_only_be_referenced_in_members_of_derived_classes_or_object_literal_expressions_2660',
    "'super' can only be referenced in members of derived classes or object literal expressions."
  ),
  Cannot_export_0_Only_local_declarations_can_be_exported_from_a_module: diag(
    2661,
    qt.DiagnosticCategory.Error,
    'Cannot_export_0_Only_local_declarations_can_be_exported_from_a_module_2661',
    "Cannot export '{0}'. Only local declarations can be exported from a module."
  ),
  Cannot_find_name_0_Did_you_mean_the_static_member_1_0: diag(
    2662,
    qt.DiagnosticCategory.Error,
    'Cannot_find_name_0_Did_you_mean_the_static_member_1_0_2662',
    "Cannot find name '{0}'. Did you mean the static member '{1}.{0}'?"
  ),
  Cannot_find_name_0_Did_you_mean_the_instance_member_this_0: diag(
    2663,
    qt.DiagnosticCategory.Error,
    'Cannot_find_name_0_Did_you_mean_the_instance_member_this_0_2663',
    "Cannot find name '{0}'. Did you mean the instance member 'this.{0}'?"
  ),
  Invalid_module_name_in_augmentation_module_0_cannot_be_found: diag(
    2664,
    qt.DiagnosticCategory.Error,
    'Invalid_module_name_in_augmentation_module_0_cannot_be_found_2664',
    "Invalid module name in augmentation, module '{0}' cannot be found."
  ),
  Invalid_module_name_in_augmentation_Module_0_resolves_to_an_untyped_module_at_1_which_cannot_be_augmented: diag(
    2665,
    qt.DiagnosticCategory.Error,
    'Invalid_module_name_in_augmentation_Module_0_resolves_to_an_untyped_module_at_1_which_cannot_be_augm_2665',
    "Invalid module name in augmentation. Module '{0}' resolves to an untyped module at '{1}', which cannot be augmented."
  ),
  Exports_and_export_assignments_are_not_permitted_in_module_augmentations: diag(
    2666,
    qt.DiagnosticCategory.Error,
    'Exports_and_export_assignments_are_not_permitted_in_module_augmentations_2666',
    'Exports and export assignments are not permitted in module augmentations.'
  ),
  Imports_are_not_permitted_in_module_augmentations_Consider_moving_them_to_the_enclosing_external_module: diag(
    2667,
    qt.DiagnosticCategory.Error,
    'Imports_are_not_permitted_in_module_augmentations_Consider_moving_them_to_the_enclosing_external_mod_2667',
    'Imports are not permitted in module augmentations. Consider moving them to the enclosing external module.'
  ),
  export_modifier_cannot_be_applied_to_ambient_modules_and_module_augmentations_since_they_are_always_visible: diag(
    2668,
    qt.DiagnosticCategory.Error,
    'export_modifier_cannot_be_applied_to_ambient_modules_and_module_augmentations_since_they_are_always__2668',
    "'export' modifier cannot be applied to ambient modules and module augmentations since they are always visible."
  ),
  Augmentations_for_the_global_scope_can_only_be_directly_nested_in_external_modules_or_ambient_module_declarations: diag(
    2669,
    qt.DiagnosticCategory.Error,
    'Augmentations_for_the_global_scope_can_only_be_directly_nested_in_external_modules_or_ambient_module_2669',
    'Augmentations for the global scope can only be directly nested in external modules or ambient module declarations.'
  ),
  Augmentations_for_the_global_scope_should_have_declare_modifier_unless_they_appear_in_already_ambient_context: diag(
    2670,
    qt.DiagnosticCategory.Error,
    'Augmentations_for_the_global_scope_should_have_declare_modifier_unless_they_appear_in_already_ambien_2670',
    "Augmentations for the global scope should have 'declare' modifier unless they appear in already ambient context."
  ),
  Cannot_augment_module_0_because_it_resolves_to_a_non_module_entity: diag(
    2671,
    qt.DiagnosticCategory.Error,
    'Cannot_augment_module_0_because_it_resolves_to_a_non_module_entity_2671',
    "Cannot augment module '{0}' because it resolves to a non-module entity."
  ),
  Cannot_assign_a_0_constructor_type_to_a_1_constructor_type: diag(
    2672,
    qt.DiagnosticCategory.Error,
    'Cannot_assign_a_0_constructor_type_to_a_1_constructor_type_2672',
    "Cannot assign a '{0}' constructor type to a '{1}' constructor type."
  ),
  Constructor_of_class_0_is_private_and_only_accessible_within_the_class_declaration: diag(
    2673,
    qt.DiagnosticCategory.Error,
    'Constructor_of_class_0_is_private_and_only_accessible_within_the_class_declaration_2673',
    "Constructor of class '{0}' is private and only accessible within the class declaration."
  ),
  Constructor_of_class_0_is_protected_and_only_accessible_within_the_class_declaration: diag(
    2674,
    qt.DiagnosticCategory.Error,
    'Constructor_of_class_0_is_protected_and_only_accessible_within_the_class_declaration_2674',
    "Constructor of class '{0}' is protected and only accessible within the class declaration."
  ),
  Cannot_extend_a_class_0_Class_constructor_is_marked_as_private: diag(
    2675,
    qt.DiagnosticCategory.Error,
    'Cannot_extend_a_class_0_Class_constructor_is_marked_as_private_2675',
    "Cannot extend a class '{0}'. Class constructor is marked as private."
  ),
  Accessors_must_both_be_abstract_or_non_abstract: diag(2676, qt.DiagnosticCategory.Error, 'Accessors_must_both_be_abstract_or_non_abstract_2676', 'Accessors must both be abstract or non-abstract.'),
  A_type_predicate_s_type_must_be_assignable_to_its_parameter_s_type: diag(
    2677,
    qt.DiagnosticCategory.Error,
    'A_type_predicate_s_type_must_be_assignable_to_its_parameter_s_type_2677',
    "A type predicate's type must be assignable to its parameter's type."
  ),
  Type_0_is_not_comparable_to_type_1: diag(2678, qt.DiagnosticCategory.Error, 'Type_0_is_not_comparable_to_type_1_2678', "Type '{0}' is not comparable to type '{1}'."),
  A_function_that_is_called_with_the_new_keyword_cannot_have_a_this_type_that_is_void: diag(
    2679,
    qt.DiagnosticCategory.Error,
    'A_function_that_is_called_with_the_new_keyword_cannot_have_a_this_type_that_is_void_2679',
    "A function that is called with the 'new' keyword cannot have a 'this' type that is 'void'."
  ),
  A_0_parameter_must_be_the_first_parameter: diag(2680, qt.DiagnosticCategory.Error, 'A_0_parameter_must_be_the_first_parameter_2680', "A '{0}' parameter must be the first parameter."),
  A_constructor_cannot_have_a_this_parameter: diag(2681, qt.DiagnosticCategory.Error, 'A_constructor_cannot_have_a_this_parameter_2681', "A constructor cannot have a 'this' parameter."),
  get_and_set_accessor_must_have_the_same_this_type: diag(
    2682,
    qt.DiagnosticCategory.Error,
    'get_and_set_accessor_must_have_the_same_this_type_2682',
    "'get' and 'set' accessor must have the same 'this' type."
  ),
  this_implicitly_has_type_any_because_it_does_not_have_a_type_annotation: diag(
    2683,
    qt.DiagnosticCategory.Error,
    'this_implicitly_has_type_any_because_it_does_not_have_a_type_annotation_2683',
    "'this' implicitly has type 'any' because it does not have a type annotation."
  ),
  The_this_context_of_type_0_is_not_assignable_to_method_s_this_of_type_1: diag(
    2684,
    qt.DiagnosticCategory.Error,
    'The_this_context_of_type_0_is_not_assignable_to_method_s_this_of_type_1_2684',
    "The 'this' context of type '{0}' is not assignable to method's 'this' of type '{1}'."
  ),
  The_this_types_of_each_signature_are_incompatible: diag(
    2685,
    qt.DiagnosticCategory.Error,
    'The_this_types_of_each_signature_are_incompatible_2685',
    "The 'this' types of each signature are incompatible."
  ),
  _0_refers_to_a_UMD_global_but_the_current_file_is_a_module_Consider_adding_an_import_instead: diag(
    2686,
    qt.DiagnosticCategory.Error,
    '_0_refers_to_a_UMD_global_but_the_current_file_is_a_module_Consider_adding_an_import_instead_2686',
    "'{0}' refers to a UMD global, but the current file is a module. Consider adding an import instead."
  ),
  All_declarations_of_0_must_have_identical_modifiers: diag(
    2687,
    qt.DiagnosticCategory.Error,
    'All_declarations_of_0_must_have_identical_modifiers_2687',
    "All declarations of '{0}' must have identical modifiers."
  ),
  Cannot_find_type_definition_file_for_0: diag(2688, qt.DiagnosticCategory.Error, 'Cannot_find_type_definition_file_for_0_2688', "Cannot find type definition file for '{0}'."),
  Cannot_extend_an_interface_0_Did_you_mean_implements: diag(
    2689,
    qt.DiagnosticCategory.Error,
    'Cannot_extend_an_interface_0_Did_you_mean_implements_2689',
    "Cannot extend an interface '{0}'. Did you mean 'implements'?"
  ),
  An_import_path_cannot_end_with_a_0_extension_Consider_importing_1_instead: diag(
    2691,
    qt.DiagnosticCategory.Error,
    'An_import_path_cannot_end_with_a_0_extension_Consider_importing_1_instead_2691',
    "An import path cannot end with a '{0}' extension. Consider importing '{1}' instead."
  ),
  _0_is_a_primitive_but_1_is_a_wrapper_object_Prefer_using_0_when_possible: diag(
    2692,
    qt.DiagnosticCategory.Error,
    '_0_is_a_primitive_but_1_is_a_wrapper_object_Prefer_using_0_when_possible_2692',
    "'{0}' is a primitive, but '{1}' is a wrapper object. Prefer using '{0}' when possible."
  ),
  _0_only_refers_to_a_type_but_is_being_used_as_a_value_here: diag(
    2693,
    qt.DiagnosticCategory.Error,
    '_0_only_refers_to_a_type_but_is_being_used_as_a_value_here_2693',
    "'{0}' only refers to a type, but is being used as a value here."
  ),
  Namespace_0_has_no_exported_member_1: diag(2694, qt.DiagnosticCategory.Error, 'Namespace_0_has_no_exported_member_1_2694', "Namespace '{0}' has no exported member '{1}'."),
  Left_side_of_comma_operator_is_unused_and_has_no_side_effects: diag(
    2695,
    qt.DiagnosticCategory.Error,
    'Left_side_of_comma_operator_is_unused_and_has_no_side_effects_2695',
    'Left side of comma operator is unused and has no side effects.',
    /*reportsUnnecessary*/ true
  ),
  The_Object_type_is_assignable_to_very_few_other_types_Did_you_mean_to_use_the_any_type_instead: diag(
    2696,
    qt.DiagnosticCategory.Error,
    'The_Object_type_is_assignable_to_very_few_other_types_Did_you_mean_to_use_the_any_type_instead_2696',
    "The 'Object' type is assignable to very few other types. Did you mean to use the 'any' type instead?"
  ),
  An_async_function_or_method_must_return_a_Promise_Make_sure_you_have_a_declaration_for_Promise_or_include_ES2015_in_your_lib_option: diag(
    2697,
    qt.DiagnosticCategory.Error,
    'An_async_function_or_method_must_return_a_Promise_Make_sure_you_have_a_declaration_for_Promise_or_in_2697',
    "An async function or method must return a 'Promise'. Make sure you have a declaration for 'Promise' or include 'ES2015' in your `--lib` option."
  ),
  Spread_types_may_only_be_created_from_object_types: diag(
    2698,
    qt.DiagnosticCategory.Error,
    'Spread_types_may_only_be_created_from_object_types_2698',
    'Spread types may only be created from object types.'
  ),
  Static_property_0_conflicts_with_built_in_property_Function_0_of_constructor_function_1: diag(
    2699,
    qt.DiagnosticCategory.Error,
    'Static_property_0_conflicts_with_built_in_property_Function_0_of_constructor_function_1_2699',
    "Static property '{0}' conflicts with built-in property 'Function.{0}' of constructor function '{1}'."
  ),
  Rest_types_may_only_be_created_from_object_types: diag(
    2700,
    qt.DiagnosticCategory.Error,
    'Rest_types_may_only_be_created_from_object_types_2700',
    'Rest types may only be created from object types.'
  ),
  The_target_of_an_object_rest_assignment_must_be_a_variable_or_a_property_access: diag(
    2701,
    qt.DiagnosticCategory.Error,
    'The_target_of_an_object_rest_assignment_must_be_a_variable_or_a_property_access_2701',
    'The target of an object rest assignment must be a variable or a property access.'
  ),
  _0_only_refers_to_a_type_but_is_being_used_as_a_namespace_here: diag(
    2702,
    qt.DiagnosticCategory.Error,
    '_0_only_refers_to_a_type_but_is_being_used_as_a_namespace_here_2702',
    "'{0}' only refers to a type, but is being used as a namespace here."
  ),
  The_operand_of_a_delete_operator_must_be_a_property_reference: diag(
    2703,
    qt.DiagnosticCategory.Error,
    'The_operand_of_a_delete_operator_must_be_a_property_reference_2703',
    "The operand of a 'delete' operator must be a property reference."
  ),
  The_operand_of_a_delete_operator_cannot_be_a_read_only_property: diag(
    2704,
    qt.DiagnosticCategory.Error,
    'The_operand_of_a_delete_operator_cannot_be_a_read_only_property_2704',
    "The operand of a 'delete' operator cannot be a read-only property."
  ),
  An_async_function_or_method_in_ES5_SlashES3_requires_the_Promise_constructor_Make_sure_you_have_a_declaration_for_the_Promise_constructor_or_include_ES2015_in_your_lib_option: diag(
    2705,
    qt.DiagnosticCategory.Error,
    'An_async_function_or_method_in_ES5_SlashES3_requires_the_Promise_constructor_Make_sure_you_have_a_de_2705',
    "An async function or method in ES5/ES3 requires the 'Promise' constructor.  Make sure you have a declaration for the 'Promise' constructor or include 'ES2015' in your `--lib` option."
  ),
  Required_type_parameters_may_not_follow_optional_type_parameters: diag(
    2706,
    qt.DiagnosticCategory.Error,
    'Required_type_parameters_may_not_follow_optional_type_parameters_2706',
    'Required type parameters may not follow optional type parameters.'
  ),
  Generic_type_0_requires_between_1_and_2_type_arguments: diag(
    2707,
    qt.DiagnosticCategory.Error,
    'Generic_type_0_requires_between_1_and_2_type_arguments_2707',
    "Generic type '{0}' requires between {1} and {2} type arguments."
  ),
  Cannot_use_namespace_0_as_a_value: diag(2708, qt.DiagnosticCategory.Error, 'Cannot_use_namespace_0_as_a_value_2708', "Cannot use namespace '{0}' as a value."),
  Cannot_use_namespace_0_as_a_type: diag(2709, qt.DiagnosticCategory.Error, 'Cannot_use_namespace_0_as_a_type_2709', "Cannot use namespace '{0}' as a type."),
  _0_are_specified_twice_The_attribute_named_0_will_be_overwritten: diag(
    2710,
    qt.DiagnosticCategory.Error,
    '_0_are_specified_twice_The_attribute_named_0_will_be_overwritten_2710',
    "'{0}' are specified twice. The attribute named '{0}' will be overwritten."
  ),
  A_dynamic_import_call_returns_a_Promise_Make_sure_you_have_a_declaration_for_Promise_or_include_ES2015_in_your_lib_option: diag(
    2711,
    qt.DiagnosticCategory.Error,
    'A_dynamic_import_call_returns_a_Promise_Make_sure_you_have_a_declaration_for_Promise_or_include_ES20_2711',
    "A dynamic import call returns a 'Promise'. Make sure you have a declaration for 'Promise' or include 'ES2015' in your `--lib` option."
  ),
  A_dynamic_import_call_in_ES5_SlashES3_requires_the_Promise_constructor_Make_sure_you_have_a_declaration_for_the_Promise_constructor_or_include_ES2015_in_your_lib_option: diag(
    2712,
    qt.DiagnosticCategory.Error,
    'A_dynamic_import_call_in_ES5_SlashES3_requires_the_Promise_constructor_Make_sure_you_have_a_declarat_2712',
    "A dynamic import call in ES5/ES3 requires the 'Promise' constructor.  Make sure you have a declaration for the 'Promise' constructor or include 'ES2015' in your `--lib` option."
  ),
  Cannot_access_0_1_because_0_is_a_type_but_not_a_namespace_Did_you_mean_to_retrieve_the_type_of_the_property_1_in_0_with_0_1: diag(
    2713,
    qt.DiagnosticCategory.Error,
    'Cannot_access_0_1_because_0_is_a_type_but_not_a_namespace_Did_you_mean_to_retrieve_the_type_of_the_p_2713',
    "Cannot access '{0}.{1}' because '{0}' is a type, but not a namespace. Did you mean to retrieve the type of the property '{1}' in '{0}' with '{0}[\"{1}\"]'?"
  ),
  The_expression_of_an_export_assignment_must_be_an_identifier_or_qualified_name_in_an_ambient_context: diag(
    2714,
    qt.DiagnosticCategory.Error,
    'The_expression_of_an_export_assignment_must_be_an_identifier_or_qualified_name_in_an_ambient_context_2714',
    'The expression of an export assignment must be an identifier or qualified name in an ambient context.'
  ),
  Abstract_property_0_in_class_1_cannot_be_accessed_in_the_constructor: diag(
    2715,
    qt.DiagnosticCategory.Error,
    'Abstract_property_0_in_class_1_cannot_be_accessed_in_the_constructor_2715',
    "Abstract property '{0}' in class '{1}' cannot be accessed in the constructor."
  ),
  Type_parameter_0_has_a_circular_default: diag(2716, qt.DiagnosticCategory.Error, 'Type_parameter_0_has_a_circular_default_2716', "Type parameter '{0}' has a circular default."),
  Subsequent_property_declarations_must_have_the_same_type_Property_0_must_be_of_type_1_but_here_has_type_2: diag(
    2717,
    qt.DiagnosticCategory.Error,
    'Subsequent_property_declarations_must_have_the_same_type_Property_0_must_be_of_type_1_but_here_has_t_2717',
    "Subsequent property declarations must have the same type.  Property '{0}' must be of type '{1}', but here has type '{2}'."
  ),
  Duplicate_property_0: diag(2718, qt.DiagnosticCategory.Error, 'Duplicate_property_0_2718', "Duplicate property '{0}'."),
  Type_0_is_not_assignable_to_type_1_Two_different_types_with_this_name_exist_but_they_are_unrelated: diag(
    2719,
    qt.DiagnosticCategory.Error,
    'Type_0_is_not_assignable_to_type_1_Two_different_types_with_this_name_exist_but_they_are_unrelated_2719',
    "Type '{0}' is not assignable to type '{1}'. Two different types with this name exist, but they are unrelated."
  ),
  Class_0_incorrectly_implements_class_1_Did_you_mean_to_extend_1_and_inherit_its_members_as_a_subclass: diag(
    2720,
    qt.DiagnosticCategory.Error,
    'Class_0_incorrectly_implements_class_1_Did_you_mean_to_extend_1_and_inherit_its_members_as_a_subclas_2720',
    "Class '{0}' incorrectly implements class '{1}'. Did you mean to extend '{1}' and inherit its members as a subclass?"
  ),
  Cannot_invoke_an_object_which_is_possibly_null: diag(2721, qt.DiagnosticCategory.Error, 'Cannot_invoke_an_object_which_is_possibly_null_2721', "Cannot invoke an object which is possibly 'null'."),
  Cannot_invoke_an_object_which_is_possibly_undefined: diag(
    2722,
    qt.DiagnosticCategory.Error,
    'Cannot_invoke_an_object_which_is_possibly_undefined_2722',
    "Cannot invoke an object which is possibly 'undefined'."
  ),
  Cannot_invoke_an_object_which_is_possibly_null_or_undefined: diag(
    2723,
    qt.DiagnosticCategory.Error,
    'Cannot_invoke_an_object_which_is_possibly_null_or_undefined_2723',
    "Cannot invoke an object which is possibly 'null' or 'undefined'."
  ),
  Module_0_has_no_exported_member_1_Did_you_mean_2: diag(
    2724,
    qt.DiagnosticCategory.Error,
    'Module_0_has_no_exported_member_1_Did_you_mean_2_2724',
    "Module '{0}' has no exported member '{1}'. Did you mean '{2}'?"
  ),
  Class_name_cannot_be_Object_when_targeting_ES5_with_module_0: diag(
    2725,
    qt.DiagnosticCategory.Error,
    'Class_name_cannot_be_Object_when_targeting_ES5_with_module_0_2725',
    "Class name cannot be 'Object' when targeting ES5 with module {0}."
  ),
  Cannot_find_lib_definition_for_0: diag(2726, qt.DiagnosticCategory.Error, 'Cannot_find_lib_definition_for_0_2726', "Cannot find lib definition for '{0}'."),
  Cannot_find_lib_definition_for_0_Did_you_mean_1: diag(
    2727,
    qt.DiagnosticCategory.Error,
    'Cannot_find_lib_definition_for_0_Did_you_mean_1_2727',
    "Cannot find lib definition for '{0}'. Did you mean '{1}'?"
  ),
  _0_is_declared_here: diag(2728, qt.DiagnosticCategory.Message, '_0_is_declared_here_2728', "'{0}' is declared here."),
  Property_0_is_used_before_its_initialization: diag(2729, qt.DiagnosticCategory.Error, 'Property_0_is_used_before_its_initialization_2729', "Property '{0}' is used before its initialization."),
  An_arrow_function_cannot_have_a_this_parameter: diag(2730, qt.DiagnosticCategory.Error, 'An_arrow_function_cannot_have_a_this_parameter_2730', "An arrow function cannot have a 'this' parameter."),
  Implicit_conversion_of_a_symbol_to_a_string_will_fail_at_runtime_Consider_wrapping_this_expression_in_String: diag(
    2731,
    qt.DiagnosticCategory.Error,
    'Implicit_conversion_of_a_symbol_to_a_string_will_fail_at_runtime_Consider_wrapping_this_expression_i_2731',
    "Implicit conversion of a 'symbol' to a 'string' will fail at runtime. Consider wrapping this expression in 'String(...)'."
  ),
  Cannot_find_module_0_Consider_using_resolveJsonModule_to_import_module_with_json_extension: diag(
    2732,
    qt.DiagnosticCategory.Error,
    'Cannot_find_module_0_Consider_using_resolveJsonModule_to_import_module_with_json_extension_2732',
    "Cannot find module '{0}'. Consider using '--resolveJsonModule' to import module with '.json' extension"
  ),
  Property_0_was_also_declared_here: diag(2733, qt.DiagnosticCategory.Error, 'Property_0_was_also_declared_here_2733', "Property '{0}' was also declared here."),
  Are_you_missing_a_semicolon: diag(2734, qt.DiagnosticCategory.Error, 'Are_you_missing_a_semicolon_2734', 'Are you missing a semicolon?'),
  Did_you_mean_for_0_to_be_constrained_to_type_new_args_Colon_any_1: diag(
    2735,
    qt.DiagnosticCategory.Error,
    'Did_you_mean_for_0_to_be_constrained_to_type_new_args_Colon_any_1_2735',
    "Did you mean for '{0}' to be constrained to type 'new (...args: any[]) => {1}'?"
  ),
  Operator_0_cannot_be_applied_to_type_1: diag(2736, qt.DiagnosticCategory.Error, 'Operator_0_cannot_be_applied_to_type_1_2736', "Operator '{0}' cannot be applied to type '{1}'."),
  BigInt_literals_are_not_available_when_targeting_lower_than_ES2020: diag(
    2737,
    qt.DiagnosticCategory.Error,
    'BigInt_literals_are_not_available_when_targeting_lower_than_ES2020_2737',
    'BigInt literals are not available when targeting lower than ES2020.'
  ),
  An_outer_value_of_this_is_shadowed_by_this_container: diag(
    2738,
    qt.DiagnosticCategory.Message,
    'An_outer_value_of_this_is_shadowed_by_this_container_2738',
    "An outer value of 'this' is shadowed by this container."
  ),
  Type_0_is_missing_the_following_properties_from_type_1_Colon_2: diag(
    2739,
    qt.DiagnosticCategory.Error,
    'Type_0_is_missing_the_following_properties_from_type_1_Colon_2_2739',
    "Type '{0}' is missing the following properties from type '{1}': {2}"
  ),
  Type_0_is_missing_the_following_properties_from_type_1_Colon_2_and_3_more: diag(
    2740,
    qt.DiagnosticCategory.Error,
    'Type_0_is_missing_the_following_properties_from_type_1_Colon_2_and_3_more_2740',
    "Type '{0}' is missing the following properties from type '{1}': {2}, and {3} more."
  ),
  Property_0_is_missing_in_type_1_but_required_in_type_2: diag(
    2741,
    qt.DiagnosticCategory.Error,
    'Property_0_is_missing_in_type_1_but_required_in_type_2_2741',
    "Property '{0}' is missing in type '{1}' but required in type '{2}'."
  ),
  The_inferred_type_of_0_cannot_be_named_without_a_reference_to_1_This_is_likely_not_portable_A_type_annotation_is_necessary: diag(
    2742,
    qt.DiagnosticCategory.Error,
    'The_inferred_type_of_0_cannot_be_named_without_a_reference_to_1_This_is_likely_not_portable_A_type_a_2742',
    "The inferred type of '{0}' cannot be named without a reference to '{1}'. This is likely not portable. A type annotation is necessary."
  ),
  No_overload_expects_0_type_arguments_but_overloads_do_exist_that_expect_either_1_or_2_type_arguments: diag(
    2743,
    qt.DiagnosticCategory.Error,
    'No_overload_expects_0_type_arguments_but_overloads_do_exist_that_expect_either_1_or_2_type_arguments_2743',
    'No overload expects {0} type arguments, but overloads do exist that expect either {1} or {2} type arguments.'
  ),
  Type_parameter_defaults_can_only_reference_previously_declared_type_parameters: diag(
    2744,
    qt.DiagnosticCategory.Error,
    'Type_parameter_defaults_can_only_reference_previously_declared_type_parameters_2744',
    'Type parameter defaults can only reference previously declared type parameters.'
  ),
  This_JSX_tag_s_0_prop_expects_type_1_which_requires_multiple_children_but_only_a_single_child_was_provided: diag(
    2745,
    qt.DiagnosticCategory.Error,
    'This_JSX_tag_s_0_prop_expects_type_1_which_requires_multiple_children_but_only_a_single_child_was_pr_2745',
    "This JSX tag's '{0}' prop expects type '{1}' which requires multiple children, but only a single child was provided."
  ),
  This_JSX_tag_s_0_prop_expects_a_single_child_of_type_1_but_multiple_children_were_provided: diag(
    2746,
    qt.DiagnosticCategory.Error,
    'This_JSX_tag_s_0_prop_expects_a_single_child_of_type_1_but_multiple_children_were_provided_2746',
    "This JSX tag's '{0}' prop expects a single child of type '{1}', but multiple children were provided."
  ),
  _0_components_don_t_accept_text_as_child_elements_Text_in_JSX_has_the_type_string_but_the_expected_type_of_1_is_2: diag(
    2747,
    qt.DiagnosticCategory.Error,
    '_0_components_don_t_accept_text_as_child_elements_Text_in_JSX_has_the_type_string_but_the_expected_t_2747',
    "'{0}' components don't accept text as child elements. Text in JSX has the type 'string', but the expected type of '{1}' is '{2}'."
  ),
  Cannot_access_ambient_const_enums_when_the_isolatedModules_flag_is_provided: diag(
    2748,
    qt.DiagnosticCategory.Error,
    'Cannot_access_ambient_const_enums_when_the_isolatedModules_flag_is_provided_2748',
    "Cannot access ambient const enums when the '--isolatedModules' flag is provided."
  ),
  _0_refers_to_a_value_but_is_being_used_as_a_type_here_Did_you_mean_typeof_0: diag(
    2749,
    qt.DiagnosticCategory.Error,
    '_0_refers_to_a_value_but_is_being_used_as_a_type_here_Did_you_mean_typeof_0_2749',
    "'{0}' refers to a value, but is being used as a type here. Did you mean 'typeof {0}'?"
  ),
  The_implementation_signature_is_declared_here: diag(2750, qt.DiagnosticCategory.Error, 'The_implementation_signature_is_declared_here_2750', 'The implementation signature is declared here.'),
  Circularity_originates_in_type_at_this_location: diag(2751, qt.DiagnosticCategory.Error, 'Circularity_originates_in_type_at_this_location_2751', 'Circularity originates in type at this location.'),
  The_first_export_default_is_here: diag(2752, qt.DiagnosticCategory.Error, 'The_first_export_default_is_here_2752', 'The first export default is here.'),
  Another_export_default_is_here: diag(2753, qt.DiagnosticCategory.Error, 'Another_export_default_is_here_2753', 'Another export default is here.'),
  super_may_not_use_type_arguments: diag(2754, qt.DiagnosticCategory.Error, 'super_may_not_use_type_arguments_2754', "'super' may not use type arguments."),
  No_constituent_of_type_0_is_callable: diag(2755, qt.DiagnosticCategory.Error, 'No_constituent_of_type_0_is_callable_2755', "No constituent of type '{0}' is callable."),
  Not_all_constituents_of_type_0_are_callable: diag(2756, qt.DiagnosticCategory.Error, 'Not_all_constituents_of_type_0_are_callable_2756', "Not all constituents of type '{0}' are callable."),
  Type_0_has_no_call_signatures: diag(2757, qt.DiagnosticCategory.Error, 'Type_0_has_no_call_signatures_2757', "Type '{0}' has no call signatures."),
  Each_member_of_the_union_type_0_has_signatures_but_none_of_those_signatures_are_compatible_with_each_other: diag(
    2758,
    qt.DiagnosticCategory.Error,
    'Each_member_of_the_union_type_0_has_signatures_but_none_of_those_signatures_are_compatible_with_each_2758',
    "Each member of the union type '{0}' has signatures, but none of those signatures are compatible with each other."
  ),
  No_constituent_of_type_0_is_constructable: diag(2759, qt.DiagnosticCategory.Error, 'No_constituent_of_type_0_is_constructable_2759', "No constituent of type '{0}' is constructable."),
  Not_all_constituents_of_type_0_are_constructable: diag(
    2760,
    qt.DiagnosticCategory.Error,
    'Not_all_constituents_of_type_0_are_constructable_2760',
    "Not all constituents of type '{0}' are constructable."
  ),
  Type_0_has_no_construct_signatures: diag(2761, qt.DiagnosticCategory.Error, 'Type_0_has_no_construct_signatures_2761', "Type '{0}' has no construct signatures."),
  Each_member_of_the_union_type_0_has_construct_signatures_but_none_of_those_signatures_are_compatible_with_each_other: diag(
    2762,
    qt.DiagnosticCategory.Error,
    'Each_member_of_the_union_type_0_has_construct_signatures_but_none_of_those_signatures_are_compatible_2762',
    "Each member of the union type '{0}' has construct signatures, but none of those signatures are compatible with each other."
  ),
  Cannot_iterate_value_because_the_next_method_of_its_iterator_expects_type_1_but_for_of_will_always_send_0: diag(
    2763,
    qt.DiagnosticCategory.Error,
    'Cannot_iterate_value_because_the_next_method_of_its_iterator_expects_type_1_but_for_of_will_always_s_2763',
    "Cannot iterate value because the 'next' method of its iterator expects type '{1}', but for-of will always send '{0}'."
  ),
  Cannot_iterate_value_because_the_next_method_of_its_iterator_expects_type_1_but_array_spread_will_always_send_0: diag(
    2764,
    qt.DiagnosticCategory.Error,
    'Cannot_iterate_value_because_the_next_method_of_its_iterator_expects_type_1_but_array_spread_will_al_2764',
    "Cannot iterate value because the 'next' method of its iterator expects type '{1}', but array spread will always send '{0}'."
  ),
  Cannot_iterate_value_because_the_next_method_of_its_iterator_expects_type_1_but_array_destructuring_will_always_send_0: diag(
    2765,
    qt.DiagnosticCategory.Error,
    'Cannot_iterate_value_because_the_next_method_of_its_iterator_expects_type_1_but_array_destructuring__2765',
    "Cannot iterate value because the 'next' method of its iterator expects type '{1}', but array destructuring will always send '{0}'."
  ),
  Cannot_delegate_iteration_to_value_because_the_next_method_of_its_iterator_expects_type_1_but_the_containing_generator_will_always_send_0: diag(
    2766,
    qt.DiagnosticCategory.Error,
    'Cannot_delegate_iteration_to_value_because_the_next_method_of_its_iterator_expects_type_1_but_the_co_2766',
    "Cannot delegate iteration to value because the 'next' method of its iterator expects type '{1}', but the containing generator will always send '{0}'."
  ),
  The_0_property_of_an_iterator_must_be_a_method: diag(2767, qt.DiagnosticCategory.Error, 'The_0_property_of_an_iterator_must_be_a_method_2767', "The '{0}' property of an iterator must be a method."),
  The_0_property_of_an_async_iterator_must_be_a_method: diag(
    2768,
    qt.DiagnosticCategory.Error,
    'The_0_property_of_an_async_iterator_must_be_a_method_2768',
    "The '{0}' property of an async iterator must be a method."
  ),
  No_overload_matches_this_call: diag(2769, qt.DiagnosticCategory.Error, 'No_overload_matches_this_call_2769', 'No overload matches this call.'),
  The_last_overload_gave_the_following_error: diag(2770, qt.DiagnosticCategory.Error, 'The_last_overload_gave_the_following_error_2770', 'The last overload gave the following error.'),
  The_last_overload_is_declared_here: diag(2771, qt.DiagnosticCategory.Error, 'The_last_overload_is_declared_here_2771', 'The last overload is declared here.'),
  Overload_0_of_1_2_gave_the_following_error: diag(2772, qt.DiagnosticCategory.Error, 'Overload_0_of_1_2_gave_the_following_error_2772', "Overload {0} of {1}, '{2}', gave the following error."),
  Did_you_forget_to_use_await: diag(2773, qt.DiagnosticCategory.Error, 'Did_you_forget_to_use_await_2773', "Did you forget to use 'await'?"),
  This_condition_will_always_return_true_since_the_function_is_always_defined_Did_you_mean_to_call_it_instead: diag(
    2774,
    qt.DiagnosticCategory.Error,
    'This_condition_will_always_return_true_since_the_function_is_always_defined_Did_you_mean_to_call_it__2774',
    'This condition will always return true since the function is always defined. Did you mean to call it instead?'
  ),
  Assertions_require_every_name_in_the_call_target_to_be_declared_with_an_explicit_type_annotation: diag(
    2775,
    qt.DiagnosticCategory.Error,
    'Assertions_require_every_name_in_the_call_target_to_be_declared_with_an_explicit_type_annotation_2775',
    'Assertions require every name in the call target to be declared with an explicit type annotation.'
  ),
  Assertions_require_the_call_target_to_be_an_identifier_or_qualified_name: diag(
    2776,
    qt.DiagnosticCategory.Error,
    'Assertions_require_the_call_target_to_be_an_identifier_or_qualified_name_2776',
    'Assertions require the call target to be an identifier or qualified name.'
  ),
  The_operand_of_an_increment_or_decrement_operator_may_not_be_an_optional_property_access: diag(
    2777,
    qt.DiagnosticCategory.Error,
    'The_operand_of_an_increment_or_decrement_operator_may_not_be_an_optional_property_access_2777',
    'The operand of an increment or decrement operator may not be an optional property access.'
  ),
  The_target_of_an_object_rest_assignment_may_not_be_an_optional_property_access: diag(
    2778,
    qt.DiagnosticCategory.Error,
    'The_target_of_an_object_rest_assignment_may_not_be_an_optional_property_access_2778',
    'The target of an object rest assignment may not be an optional property access.'
  ),
  The_left_hand_side_of_an_assignment_expression_may_not_be_an_optional_property_access: diag(
    2779,
    qt.DiagnosticCategory.Error,
    'The_left_hand_side_of_an_assignment_expression_may_not_be_an_optional_property_access_2779',
    'The left-hand side of an assignment expression may not be an optional property access.'
  ),
  The_left_hand_side_of_a_for_in_statement_may_not_be_an_optional_property_access: diag(
    2780,
    qt.DiagnosticCategory.Error,
    'The_left_hand_side_of_a_for_in_statement_may_not_be_an_optional_property_access_2780',
    "The left-hand side of a 'for...in' statement may not be an optional property access."
  ),
  The_left_hand_side_of_a_for_of_statement_may_not_be_an_optional_property_access: diag(
    2781,
    qt.DiagnosticCategory.Error,
    'The_left_hand_side_of_a_for_of_statement_may_not_be_an_optional_property_access_2781',
    "The left-hand side of a 'for...of' statement may not be an optional property access."
  ),
  _0_needs_an_explicit_type_annotation: diag(2782, qt.DiagnosticCategory.Message, '_0_needs_an_explicit_type_annotation_2782', "'{0}' needs an explicit type annotation."),
  _0_is_specified_more_than_once_so_this_usage_will_be_overwritten: diag(
    2783,
    qt.DiagnosticCategory.Error,
    '_0_is_specified_more_than_once_so_this_usage_will_be_overwritten_2783',
    "'{0}' is specified more than once, so this usage will be overwritten."
  ),
  get_and_set_accessors_cannot_declare_this_parameters: diag(
    2784,
    qt.DiagnosticCategory.Error,
    'get_and_set_accessors_cannot_declare_this_parameters_2784',
    "'get' and 'set' accessors cannot declare 'this' parameters."
  ),
  This_spread_always_overwrites_this_property: diag(2785, qt.DiagnosticCategory.Error, 'This_spread_always_overwrites_this_property_2785', 'This spread always overwrites this property.'),
  _0_cannot_be_used_as_a_JSX_component: diag(2786, qt.DiagnosticCategory.Error, '_0_cannot_be_used_as_a_JSX_component_2786', "'{0}' cannot be used as a JSX component."),
  Its_return_type_0_is_not_a_valid_JSX_element: diag(2787, qt.DiagnosticCategory.Error, 'Its_return_type_0_is_not_a_valid_JSX_element_2787', "Its return type '{0}' is not a valid JSX element."),
  Its_instance_type_0_is_not_a_valid_JSX_element: diag(2788, qt.DiagnosticCategory.Error, 'Its_instance_type_0_is_not_a_valid_JSX_element_2788', "Its instance type '{0}' is not a valid JSX element."),
  Its_element_type_0_is_not_a_valid_JSX_element: diag(2789, qt.DiagnosticCategory.Error, 'Its_element_type_0_is_not_a_valid_JSX_element_2789', "Its element type '{0}' is not a valid JSX element."),
  Import_declaration_0_is_using_private_name_1: diag(4000, qt.DiagnosticCategory.Error, 'Import_declaration_0_is_using_private_name_1_4000', "Import declaration '{0}' is using private name '{1}'."),
  Type_parameter_0_of_exported_class_has_or_is_using_private_name_1: diag(
    4002,
    qt.DiagnosticCategory.Error,
    'Type_parameter_0_of_exported_class_has_or_is_using_private_name_1_4002',
    "Type parameter '{0}' of exported class has or is using private name '{1}'."
  ),
  Type_parameter_0_of_exported_interface_has_or_is_using_private_name_1: diag(
    4004,
    qt.DiagnosticCategory.Error,
    'Type_parameter_0_of_exported_interface_has_or_is_using_private_name_1_4004',
    "Type parameter '{0}' of exported interface has or is using private name '{1}'."
  ),
  Type_parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_1: diag(
    4006,
    qt.DiagnosticCategory.Error,
    'Type_parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_1_4006',
    "Type parameter '{0}' of constructor signature from exported interface has or is using private name '{1}'."
  ),
  Type_parameter_0_of_call_signature_from_exported_interface_has_or_is_using_private_name_1: diag(
    4008,
    qt.DiagnosticCategory.Error,
    'Type_parameter_0_of_call_signature_from_exported_interface_has_or_is_using_private_name_1_4008',
    "Type parameter '{0}' of call signature from exported interface has or is using private name '{1}'."
  ),
  Type_parameter_0_of_public_static_method_from_exported_class_has_or_is_using_private_name_1: diag(
    4010,
    qt.DiagnosticCategory.Error,
    'Type_parameter_0_of_public_static_method_from_exported_class_has_or_is_using_private_name_1_4010',
    "Type parameter '{0}' of public static method from exported class has or is using private name '{1}'."
  ),
  Type_parameter_0_of_public_method_from_exported_class_has_or_is_using_private_name_1: diag(
    4012,
    qt.DiagnosticCategory.Error,
    'Type_parameter_0_of_public_method_from_exported_class_has_or_is_using_private_name_1_4012',
    "Type parameter '{0}' of public method from exported class has or is using private name '{1}'."
  ),
  Type_parameter_0_of_method_from_exported_interface_has_or_is_using_private_name_1: diag(
    4014,
    qt.DiagnosticCategory.Error,
    'Type_parameter_0_of_method_from_exported_interface_has_or_is_using_private_name_1_4014',
    "Type parameter '{0}' of method from exported interface has or is using private name '{1}'."
  ),
  Type_parameter_0_of_exported_function_has_or_is_using_private_name_1: diag(
    4016,
    qt.DiagnosticCategory.Error,
    'Type_parameter_0_of_exported_function_has_or_is_using_private_name_1_4016',
    "Type parameter '{0}' of exported function has or is using private name '{1}'."
  ),
  Implements_clause_of_exported_class_0_has_or_is_using_private_name_1: diag(
    4019,
    qt.DiagnosticCategory.Error,
    'Implements_clause_of_exported_class_0_has_or_is_using_private_name_1_4019',
    "Implements clause of exported class '{0}' has or is using private name '{1}'."
  ),
  extends_clause_of_exported_class_0_has_or_is_using_private_name_1: diag(
    4020,
    qt.DiagnosticCategory.Error,
    'extends_clause_of_exported_class_0_has_or_is_using_private_name_1_4020',
    "'extends' clause of exported class '{0}' has or is using private name '{1}'."
  ),
  extends_clause_of_exported_interface_0_has_or_is_using_private_name_1: diag(
    4022,
    qt.DiagnosticCategory.Error,
    'extends_clause_of_exported_interface_0_has_or_is_using_private_name_1_4022',
    "'extends' clause of exported interface '{0}' has or is using private name '{1}'."
  ),
  Exported_variable_0_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: diag(
    4023,
    qt.DiagnosticCategory.Error,
    'Exported_variable_0_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named_4023',
    "Exported variable '{0}' has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Exported_variable_0_has_or_is_using_name_1_from_private_module_2: diag(
    4024,
    qt.DiagnosticCategory.Error,
    'Exported_variable_0_has_or_is_using_name_1_from_private_module_2_4024',
    "Exported variable '{0}' has or is using name '{1}' from private module '{2}'."
  ),
  Exported_variable_0_has_or_is_using_private_name_1: diag(
    4025,
    qt.DiagnosticCategory.Error,
    'Exported_variable_0_has_or_is_using_private_name_1_4025',
    "Exported variable '{0}' has or is using private name '{1}'."
  ),
  Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: diag(
    4026,
    qt.DiagnosticCategory.Error,
    'Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot__4026',
    "Public static property '{0}' of exported class has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2: diag(
    4027,
    qt.DiagnosticCategory.Error,
    'Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2_4027',
    "Public static property '{0}' of exported class has or is using name '{1}' from private module '{2}'."
  ),
  Public_static_property_0_of_exported_class_has_or_is_using_private_name_1: diag(
    4028,
    qt.DiagnosticCategory.Error,
    'Public_static_property_0_of_exported_class_has_or_is_using_private_name_1_4028',
    "Public static property '{0}' of exported class has or is using private name '{1}'."
  ),
  Public_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: diag(
    4029,
    qt.DiagnosticCategory.Error,
    'Public_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_name_4029',
    "Public property '{0}' of exported class has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Public_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2: diag(
    4030,
    qt.DiagnosticCategory.Error,
    'Public_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2_4030',
    "Public property '{0}' of exported class has or is using name '{1}' from private module '{2}'."
  ),
  Public_property_0_of_exported_class_has_or_is_using_private_name_1: diag(
    4031,
    qt.DiagnosticCategory.Error,
    'Public_property_0_of_exported_class_has_or_is_using_private_name_1_4031',
    "Public property '{0}' of exported class has or is using private name '{1}'."
  ),
  Property_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2: diag(
    4032,
    qt.DiagnosticCategory.Error,
    'Property_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2_4032',
    "Property '{0}' of exported interface has or is using name '{1}' from private module '{2}'."
  ),
  Property_0_of_exported_interface_has_or_is_using_private_name_1: diag(
    4033,
    qt.DiagnosticCategory.Error,
    'Property_0_of_exported_interface_has_or_is_using_private_name_1_4033',
    "Property '{0}' of exported interface has or is using private name '{1}'."
  ),
  Parameter_type_of_public_static_setter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2: diag(
    4034,
    qt.DiagnosticCategory.Error,
    'Parameter_type_of_public_static_setter_0_from_exported_class_has_or_is_using_name_1_from_private_mod_4034',
    "Parameter type of public static setter '{0}' from exported class has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_type_of_public_static_setter_0_from_exported_class_has_or_is_using_private_name_1: diag(
    4035,
    qt.DiagnosticCategory.Error,
    'Parameter_type_of_public_static_setter_0_from_exported_class_has_or_is_using_private_name_1_4035',
    "Parameter type of public static setter '{0}' from exported class has or is using private name '{1}'."
  ),
  Parameter_type_of_public_setter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2: diag(
    4036,
    qt.DiagnosticCategory.Error,
    'Parameter_type_of_public_setter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2_4036',
    "Parameter type of public setter '{0}' from exported class has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_type_of_public_setter_0_from_exported_class_has_or_is_using_private_name_1: diag(
    4037,
    qt.DiagnosticCategory.Error,
    'Parameter_type_of_public_setter_0_from_exported_class_has_or_is_using_private_name_1_4037',
    "Parameter type of public setter '{0}' from exported class has or is using private name '{1}'."
  ),
  Return_type_of_public_static_getter_0_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: diag(
    4038,
    qt.DiagnosticCategory.Error,
    'Return_type_of_public_static_getter_0_from_exported_class_has_or_is_using_name_1_from_external_modul_4038',
    "Return type of public static getter '{0}' from exported class has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Return_type_of_public_static_getter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2: diag(
    4039,
    qt.DiagnosticCategory.Error,
    'Return_type_of_public_static_getter_0_from_exported_class_has_or_is_using_name_1_from_private_module_4039',
    "Return type of public static getter '{0}' from exported class has or is using name '{1}' from private module '{2}'."
  ),
  Return_type_of_public_static_getter_0_from_exported_class_has_or_is_using_private_name_1: diag(
    4040,
    qt.DiagnosticCategory.Error,
    'Return_type_of_public_static_getter_0_from_exported_class_has_or_is_using_private_name_1_4040',
    "Return type of public static getter '{0}' from exported class has or is using private name '{1}'."
  ),
  Return_type_of_public_getter_0_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: diag(
    4041,
    qt.DiagnosticCategory.Error,
    'Return_type_of_public_getter_0_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_4041',
    "Return type of public getter '{0}' from exported class has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Return_type_of_public_getter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2: diag(
    4042,
    qt.DiagnosticCategory.Error,
    'Return_type_of_public_getter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2_4042',
    "Return type of public getter '{0}' from exported class has or is using name '{1}' from private module '{2}'."
  ),
  Return_type_of_public_getter_0_from_exported_class_has_or_is_using_private_name_1: diag(
    4043,
    qt.DiagnosticCategory.Error,
    'Return_type_of_public_getter_0_from_exported_class_has_or_is_using_private_name_1_4043',
    "Return type of public getter '{0}' from exported class has or is using private name '{1}'."
  ),
  Return_type_of_constructor_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1: diag(
    4044,
    qt.DiagnosticCategory.Error,
    'Return_type_of_constructor_signature_from_exported_interface_has_or_is_using_name_0_from_private_mod_4044',
    "Return type of constructor signature from exported interface has or is using name '{0}' from private module '{1}'."
  ),
  Return_type_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_0: diag(
    4045,
    qt.DiagnosticCategory.Error,
    'Return_type_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_0_4045',
    "Return type of constructor signature from exported interface has or is using private name '{0}'."
  ),
  Return_type_of_call_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1: diag(
    4046,
    qt.DiagnosticCategory.Error,
    'Return_type_of_call_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1_4046',
    "Return type of call signature from exported interface has or is using name '{0}' from private module '{1}'."
  ),
  Return_type_of_call_signature_from_exported_interface_has_or_is_using_private_name_0: diag(
    4047,
    qt.DiagnosticCategory.Error,
    'Return_type_of_call_signature_from_exported_interface_has_or_is_using_private_name_0_4047',
    "Return type of call signature from exported interface has or is using private name '{0}'."
  ),
  Return_type_of_index_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1: diag(
    4048,
    qt.DiagnosticCategory.Error,
    'Return_type_of_index_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1_4048',
    "Return type of index signature from exported interface has or is using name '{0}' from private module '{1}'."
  ),
  Return_type_of_index_signature_from_exported_interface_has_or_is_using_private_name_0: diag(
    4049,
    qt.DiagnosticCategory.Error,
    'Return_type_of_index_signature_from_exported_interface_has_or_is_using_private_name_0_4049',
    "Return type of index signature from exported interface has or is using private name '{0}'."
  ),
  Return_type_of_public_static_method_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named: diag(
    4050,
    qt.DiagnosticCategory.Error,
    'Return_type_of_public_static_method_from_exported_class_has_or_is_using_name_0_from_external_module__4050',
    "Return type of public static method from exported class has or is using name '{0}' from external module {1} but cannot be named."
  ),
  Return_type_of_public_static_method_from_exported_class_has_or_is_using_name_0_from_private_module_1: diag(
    4051,
    qt.DiagnosticCategory.Error,
    'Return_type_of_public_static_method_from_exported_class_has_or_is_using_name_0_from_private_module_1_4051',
    "Return type of public static method from exported class has or is using name '{0}' from private module '{1}'."
  ),
  Return_type_of_public_static_method_from_exported_class_has_or_is_using_private_name_0: diag(
    4052,
    qt.DiagnosticCategory.Error,
    'Return_type_of_public_static_method_from_exported_class_has_or_is_using_private_name_0_4052',
    "Return type of public static method from exported class has or is using private name '{0}'."
  ),
  Return_type_of_public_method_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named: diag(
    4053,
    qt.DiagnosticCategory.Error,
    'Return_type_of_public_method_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_c_4053',
    "Return type of public method from exported class has or is using name '{0}' from external module {1} but cannot be named."
  ),
  Return_type_of_public_method_from_exported_class_has_or_is_using_name_0_from_private_module_1: diag(
    4054,
    qt.DiagnosticCategory.Error,
    'Return_type_of_public_method_from_exported_class_has_or_is_using_name_0_from_private_module_1_4054',
    "Return type of public method from exported class has or is using name '{0}' from private module '{1}'."
  ),
  Return_type_of_public_method_from_exported_class_has_or_is_using_private_name_0: diag(
    4055,
    qt.DiagnosticCategory.Error,
    'Return_type_of_public_method_from_exported_class_has_or_is_using_private_name_0_4055',
    "Return type of public method from exported class has or is using private name '{0}'."
  ),
  Return_type_of_method_from_exported_interface_has_or_is_using_name_0_from_private_module_1: diag(
    4056,
    qt.DiagnosticCategory.Error,
    'Return_type_of_method_from_exported_interface_has_or_is_using_name_0_from_private_module_1_4056',
    "Return type of method from exported interface has or is using name '{0}' from private module '{1}'."
  ),
  Return_type_of_method_from_exported_interface_has_or_is_using_private_name_0: diag(
    4057,
    qt.DiagnosticCategory.Error,
    'Return_type_of_method_from_exported_interface_has_or_is_using_private_name_0_4057',
    "Return type of method from exported interface has or is using private name '{0}'."
  ),
  Return_type_of_exported_function_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named: diag(
    4058,
    qt.DiagnosticCategory.Error,
    'Return_type_of_exported_function_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named_4058',
    "Return type of exported function has or is using name '{0}' from external module {1} but cannot be named."
  ),
  Return_type_of_exported_function_has_or_is_using_name_0_from_private_module_1: diag(
    4059,
    qt.DiagnosticCategory.Error,
    'Return_type_of_exported_function_has_or_is_using_name_0_from_private_module_1_4059',
    "Return type of exported function has or is using name '{0}' from private module '{1}'."
  ),
  Return_type_of_exported_function_has_or_is_using_private_name_0: diag(
    4060,
    qt.DiagnosticCategory.Error,
    'Return_type_of_exported_function_has_or_is_using_private_name_0_4060',
    "Return type of exported function has or is using private name '{0}'."
  ),
  Parameter_0_of_constructor_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: diag(
    4061,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_constructor_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_can_4061',
    "Parameter '{0}' of constructor from exported class has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Parameter_0_of_constructor_from_exported_class_has_or_is_using_name_1_from_private_module_2: diag(
    4062,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_constructor_from_exported_class_has_or_is_using_name_1_from_private_module_2_4062',
    "Parameter '{0}' of constructor from exported class has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_0_of_constructor_from_exported_class_has_or_is_using_private_name_1: diag(
    4063,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_constructor_from_exported_class_has_or_is_using_private_name_1_4063',
    "Parameter '{0}' of constructor from exported class has or is using private name '{1}'."
  ),
  Parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2: diag(
    4064,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_name_1_from_private_mod_4064',
    "Parameter '{0}' of constructor signature from exported interface has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_1: diag(
    4065,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_1_4065',
    "Parameter '{0}' of constructor signature from exported interface has or is using private name '{1}'."
  ),
  Parameter_0_of_call_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2: diag(
    4066,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_call_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2_4066',
    "Parameter '{0}' of call signature from exported interface has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_0_of_call_signature_from_exported_interface_has_or_is_using_private_name_1: diag(
    4067,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_call_signature_from_exported_interface_has_or_is_using_private_name_1_4067',
    "Parameter '{0}' of call signature from exported interface has or is using private name '{1}'."
  ),
  Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: diag(
    4068,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_name_1_from_external_module__4068',
    "Parameter '{0}' of public static method from exported class has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_name_1_from_private_module_2: diag(
    4069,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_name_1_from_private_module_2_4069',
    "Parameter '{0}' of public static method from exported class has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_private_name_1: diag(
    4070,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_private_name_1_4070',
    "Parameter '{0}' of public static method from exported class has or is using private name '{1}'."
  ),
  Parameter_0_of_public_method_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: diag(
    4071,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_public_method_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_c_4071',
    "Parameter '{0}' of public method from exported class has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Parameter_0_of_public_method_from_exported_class_has_or_is_using_name_1_from_private_module_2: diag(
    4072,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_public_method_from_exported_class_has_or_is_using_name_1_from_private_module_2_4072',
    "Parameter '{0}' of public method from exported class has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_0_of_public_method_from_exported_class_has_or_is_using_private_name_1: diag(
    4073,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_public_method_from_exported_class_has_or_is_using_private_name_1_4073',
    "Parameter '{0}' of public method from exported class has or is using private name '{1}'."
  ),
  Parameter_0_of_method_from_exported_interface_has_or_is_using_name_1_from_private_module_2: diag(
    4074,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_method_from_exported_interface_has_or_is_using_name_1_from_private_module_2_4074',
    "Parameter '{0}' of method from exported interface has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_0_of_method_from_exported_interface_has_or_is_using_private_name_1: diag(
    4075,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_method_from_exported_interface_has_or_is_using_private_name_1_4075',
    "Parameter '{0}' of method from exported interface has or is using private name '{1}'."
  ),
  Parameter_0_of_exported_function_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: diag(
    4076,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_exported_function_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named_4076',
    "Parameter '{0}' of exported function has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Parameter_0_of_exported_function_has_or_is_using_name_1_from_private_module_2: diag(
    4077,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_exported_function_has_or_is_using_name_1_from_private_module_2_4077',
    "Parameter '{0}' of exported function has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_0_of_exported_function_has_or_is_using_private_name_1: diag(
    4078,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_exported_function_has_or_is_using_private_name_1_4078',
    "Parameter '{0}' of exported function has or is using private name '{1}'."
  ),
  Exported_type_alias_0_has_or_is_using_private_name_1: diag(
    4081,
    qt.DiagnosticCategory.Error,
    'Exported_type_alias_0_has_or_is_using_private_name_1_4081',
    "Exported type alias '{0}' has or is using private name '{1}'."
  ),
  Default_export_of_the_module_has_or_is_using_private_name_0: diag(
    4082,
    qt.DiagnosticCategory.Error,
    'Default_export_of_the_module_has_or_is_using_private_name_0_4082',
    "Default export of the module has or is using private name '{0}'."
  ),
  Type_parameter_0_of_exported_type_alias_has_or_is_using_private_name_1: diag(
    4083,
    qt.DiagnosticCategory.Error,
    'Type_parameter_0_of_exported_type_alias_has_or_is_using_private_name_1_4083',
    "Type parameter '{0}' of exported type alias has or is using private name '{1}'."
  ),
  Conflicting_definitions_for_0_found_at_1_and_2_Consider_installing_a_specific_version_of_this_library_to_resolve_the_conflict: diag(
    4090,
    qt.DiagnosticCategory.Error,
    'Conflicting_definitions_for_0_found_at_1_and_2_Consider_installing_a_specific_version_of_this_librar_4090',
    "Conflicting definitions for '{0}' found at '{1}' and '{2}'. Consider installing a specific version of this library to resolve the conflict."
  ),
  Parameter_0_of_index_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2: diag(
    4091,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_index_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2_4091',
    "Parameter '{0}' of index signature from exported interface has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_0_of_index_signature_from_exported_interface_has_or_is_using_private_name_1: diag(
    4092,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_index_signature_from_exported_interface_has_or_is_using_private_name_1_4092',
    "Parameter '{0}' of index signature from exported interface has or is using private name '{1}'."
  ),
  Property_0_of_exported_class_expression_may_not_be_private_or_protected: diag(
    4094,
    qt.DiagnosticCategory.Error,
    'Property_0_of_exported_class_expression_may_not_be_private_or_protected_4094',
    "Property '{0}' of exported class expression may not be private or protected."
  ),
  Public_static_method_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: diag(
    4095,
    qt.DiagnosticCategory.Error,
    'Public_static_method_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_4095',
    "Public static method '{0}' of exported class has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Public_static_method_0_of_exported_class_has_or_is_using_name_1_from_private_module_2: diag(
    4096,
    qt.DiagnosticCategory.Error,
    'Public_static_method_0_of_exported_class_has_or_is_using_name_1_from_private_module_2_4096',
    "Public static method '{0}' of exported class has or is using name '{1}' from private module '{2}'."
  ),
  Public_static_method_0_of_exported_class_has_or_is_using_private_name_1: diag(
    4097,
    qt.DiagnosticCategory.Error,
    'Public_static_method_0_of_exported_class_has_or_is_using_private_name_1_4097',
    "Public static method '{0}' of exported class has or is using private name '{1}'."
  ),
  Public_method_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: diag(
    4098,
    qt.DiagnosticCategory.Error,
    'Public_method_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named_4098',
    "Public method '{0}' of exported class has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Public_method_0_of_exported_class_has_or_is_using_name_1_from_private_module_2: diag(
    4099,
    qt.DiagnosticCategory.Error,
    'Public_method_0_of_exported_class_has_or_is_using_name_1_from_private_module_2_4099',
    "Public method '{0}' of exported class has or is using name '{1}' from private module '{2}'."
  ),
  Public_method_0_of_exported_class_has_or_is_using_private_name_1: diag(
    4100,
    qt.DiagnosticCategory.Error,
    'Public_method_0_of_exported_class_has_or_is_using_private_name_1_4100',
    "Public method '{0}' of exported class has or is using private name '{1}'."
  ),
  Method_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2: diag(
    4101,
    qt.DiagnosticCategory.Error,
    'Method_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2_4101',
    "Method '{0}' of exported interface has or is using name '{1}' from private module '{2}'."
  ),
  Method_0_of_exported_interface_has_or_is_using_private_name_1: diag(
    4102,
    qt.DiagnosticCategory.Error,
    'Method_0_of_exported_interface_has_or_is_using_private_name_1_4102',
    "Method '{0}' of exported interface has or is using private name '{1}'."
  ),
  Type_parameter_0_of_exported_mapped_object_type_is_using_private_name_1: diag(
    4103,
    qt.DiagnosticCategory.Error,
    'Type_parameter_0_of_exported_mapped_object_type_is_using_private_name_1_4103',
    "Type parameter '{0}' of exported mapped object type is using private name '{1}'."
  ),
  The_type_0_is_readonly_and_cannot_be_assigned_to_the_mutable_type_1: diag(
    4104,
    qt.DiagnosticCategory.Error,
    'The_type_0_is_readonly_and_cannot_be_assigned_to_the_mutable_type_1_4104',
    "The type '{0}' is 'readonly' and cannot be assigned to the mutable type '{1}'."
  ),
  Private_or_protected_member_0_cannot_be_accessed_on_a_type_parameter: diag(
    4105,
    qt.DiagnosticCategory.Error,
    'Private_or_protected_member_0_cannot_be_accessed_on_a_type_parameter_4105',
    "Private or protected member '{0}' cannot be accessed on a type parameter."
  ),
  Parameter_0_of_accessor_has_or_is_using_private_name_1: diag(
    4106,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_accessor_has_or_is_using_private_name_1_4106',
    "Parameter '{0}' of accessor has or is using private name '{1}'."
  ),
  Parameter_0_of_accessor_has_or_is_using_name_1_from_private_module_2: diag(
    4107,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_accessor_has_or_is_using_name_1_from_private_module_2_4107',
    "Parameter '{0}' of accessor has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_0_of_accessor_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: diag(
    4108,
    qt.DiagnosticCategory.Error,
    'Parameter_0_of_accessor_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named_4108',
    "Parameter '{0}' of accessor has or is using name '{1}' from external module '{2}' but cannot be named."
  ),
  Type_arguments_for_0_circularly_reference_themselves: diag(
    4109,
    qt.DiagnosticCategory.Error,
    'Type_arguments_for_0_circularly_reference_themselves_4109',
    "Type arguments for '{0}' circularly reference themselves."
  ),
  Tuple_type_arguments_circularly_reference_themselves: diag(
    4110,
    qt.DiagnosticCategory.Error,
    'Tuple_type_arguments_circularly_reference_themselves_4110',
    'Tuple type arguments circularly reference themselves.'
  ),
  The_current_host_does_not_support_the_0_option: diag(5001, qt.DiagnosticCategory.Error, 'The_current_host_does_not_support_the_0_option_5001', "The current host does not support the '{0}' option."),
  Cannot_find_the_common_subdirectory_path_for_the_input_files: diag(
    5009,
    qt.DiagnosticCategory.Error,
    'Cannot_find_the_common_subdirectory_path_for_the_input_files_5009',
    'Cannot find the common subdirectory path for the input files.'
  ),
  File_specification_cannot_end_in_a_recursive_directory_wildcard_Asterisk_Asterisk_Colon_0: diag(
    5010,
    qt.DiagnosticCategory.Error,
    'File_specification_cannot_end_in_a_recursive_directory_wildcard_Asterisk_Asterisk_Colon_0_5010',
    "File specification cannot end in a recursive directory wildcard ('**'): '{0}'."
  ),
  Cannot_read_file_0_Colon_1: diag(5012, qt.DiagnosticCategory.Error, 'Cannot_read_file_0_Colon_1_5012', "Cannot read file '{0}': {1}."),
  Failed_to_parse_file_0_Colon_1: diag(5014, qt.DiagnosticCategory.Error, 'Failed_to_parse_file_0_Colon_1_5014', "Failed to parse file '{0}': {1}."),
  Unknown_compiler_option_0: diag(5023, qt.DiagnosticCategory.Error, 'Unknown_compiler_option_0_5023', "Unknown compiler option '{0}'."),
  Compiler_option_0_requires_a_value_of_type_1: diag(5024, qt.DiagnosticCategory.Error, 'Compiler_option_0_requires_a_value_of_type_1_5024', "Compiler option '{0}' requires a value of type {1}."),
  Unknown_compiler_option_0_Did_you_mean_1: diag(5025, qt.DiagnosticCategory.Error, 'Unknown_compiler_option_0_Did_you_mean_1_5025', "Unknown compiler option '{0}'. Did you mean '{1}'?"),
  Could_not_write_file_0_Colon_1: diag(5033, qt.DiagnosticCategory.Error, 'Could_not_write_file_0_Colon_1_5033', "Could not write file '{0}': {1}."),
  Option_project_cannot_be_mixed_with_source_files_on_a_command_line: diag(
    5042,
    qt.DiagnosticCategory.Error,
    'Option_project_cannot_be_mixed_with_source_files_on_a_command_line_5042',
    "Option 'project' cannot be mixed with source files on a command line."
  ),
  Option_isolatedModules_can_only_be_used_when_either_option_module_is_provided_or_option_target_is_ES2015_or_higher: diag(
    5047,
    qt.DiagnosticCategory.Error,
    'Option_isolatedModules_can_only_be_used_when_either_option_module_is_provided_or_option_target_is_ES_5047',
    "Option 'isolatedModules' can only be used when either option '--module' is provided or option 'target' is 'ES2015' or higher."
  ),
  Option_0_cannot_be_specified_when_option_target_is_ES3: diag(
    5048,
    qt.DiagnosticCategory.Error,
    'Option_0_cannot_be_specified_when_option_target_is_ES3_5048',
    "Option '{0}' cannot be specified when option 'target' is 'ES3'."
  ),
  Option_0_can_only_be_used_when_either_option_inlineSourceMap_or_option_sourceMap_is_provided: diag(
    5051,
    qt.DiagnosticCategory.Error,
    'Option_0_can_only_be_used_when_either_option_inlineSourceMap_or_option_sourceMap_is_provided_5051',
    "Option '{0} can only be used when either option '--inlineSourceMap' or option '--sourceMap' is provided."
  ),
  Option_0_cannot_be_specified_without_specifying_option_1: diag(
    5052,
    qt.DiagnosticCategory.Error,
    'Option_0_cannot_be_specified_without_specifying_option_1_5052',
    "Option '{0}' cannot be specified without specifying option '{1}'."
  ),
  Option_0_cannot_be_specified_with_option_1: diag(5053, qt.DiagnosticCategory.Error, 'Option_0_cannot_be_specified_with_option_1_5053', "Option '{0}' cannot be specified with option '{1}'."),
  A_tsconfig_json_file_is_already_defined_at_Colon_0: diag(
    5054,
    qt.DiagnosticCategory.Error,
    'A_tsconfig_json_file_is_already_defined_at_Colon_0_5054',
    "A 'tsconfig.json' file is already defined at: '{0}'."
  ),
  Cannot_write_file_0_because_it_would_overwrite_input_file: diag(
    5055,
    qt.DiagnosticCategory.Error,
    'Cannot_write_file_0_because_it_would_overwrite_input_file_5055',
    "Cannot write file '{0}' because it would overwrite input file."
  ),
  Cannot_write_file_0_because_it_would_be_overwritten_by_multiple_input_files: diag(
    5056,
    qt.DiagnosticCategory.Error,
    'Cannot_write_file_0_because_it_would_be_overwritten_by_multiple_input_files_5056',
    "Cannot write file '{0}' because it would be overwritten by multiple input files."
  ),
  Cannot_find_a_tsconfig_json_file_at_the_specified_directory_Colon_0: diag(
    5057,
    qt.DiagnosticCategory.Error,
    'Cannot_find_a_tsconfig_json_file_at_the_specified_directory_Colon_0_5057',
    "Cannot find a tsconfig.json file at the specified directory: '{0}'."
  ),
  The_specified_path_does_not_exist_Colon_0: diag(5058, qt.DiagnosticCategory.Error, 'The_specified_path_does_not_exist_Colon_0_5058', "The specified path does not exist: '{0}'."),
  Invalid_value_for_reactNamespace_0_is_not_a_valid_identifier: diag(
    5059,
    qt.DiagnosticCategory.Error,
    'Invalid_value_for_reactNamespace_0_is_not_a_valid_identifier_5059',
    "Invalid value for '--reactNamespace'. '{0}' is not a valid identifier."
  ),
  Option_paths_cannot_be_used_without_specifying_baseUrl_option: diag(
    5060,
    qt.DiagnosticCategory.Error,
    'Option_paths_cannot_be_used_without_specifying_baseUrl_option_5060',
    "Option 'paths' cannot be used without specifying '--baseUrl' option."
  ),
  qc.Pattern_0_can_have_at_most_one_Asterisk_character: diag(
    5061,
    qt.DiagnosticCategory.Error,
    'Pattern_0_can_have_at_most_one_Asterisk_character_5061',
    "Pattern '{0}' can have at most one '*' character."
  ),
  Substitution_0_in_pattern_1_can_have_at_most_one_Asterisk_character: diag(
    5062,
    qt.DiagnosticCategory.Error,
    'Substitution_0_in_pattern_1_can_have_at_most_one_Asterisk_character_5062',
    "Substitution '{0}' in pattern '{1}' can have at most one '*' character."
  ),
  Substitutions_for_pattern_0_should_be_an_array: diag(5063, qt.DiagnosticCategory.Error, 'Substitutions_for_pattern_0_should_be_an_array_5063', "Substitutions for pattern '{0}' should be an array."),
  Substitution_0_for_pattern_1_has_incorrect_type_expected_string_got_2: diag(
    5064,
    qt.DiagnosticCategory.Error,
    'Substitution_0_for_pattern_1_has_incorrect_type_expected_string_got_2_5064',
    "Substitution '{0}' for pattern '{1}' has incorrect type, expected 'string', got '{2}'."
  ),
  File_specification_cannot_contain_a_parent_directory_that_appears_after_a_recursive_directory_wildcard_Asterisk_Asterisk_Colon_0: diag(
    5065,
    qt.DiagnosticCategory.Error,
    'File_specification_cannot_contain_a_parent_directory_that_appears_after_a_recursive_directory_wildca_5065',
    "File specification cannot contain a parent directory ('..') that appears after a recursive directory wildcard ('**'): '{0}'."
  ),
  Substitutions_for_pattern_0_shouldn_t_be_an_empty_array: diag(
    5066,
    qt.DiagnosticCategory.Error,
    'Substitutions_for_pattern_0_shouldn_t_be_an_empty_array_5066',
    "Substitutions for pattern '{0}' shouldn't be an empty array."
  ),
  Invalid_value_for_jsxFactory_0_is_not_a_valid_identifier_or_qualified_name: diag(
    5067,
    qt.DiagnosticCategory.Error,
    'Invalid_value_for_jsxFactory_0_is_not_a_valid_identifier_or_qualified_name_5067',
    "Invalid value for 'jsxFactory'. '{0}' is not a valid identifier or qualified-name."
  ),
  Adding_a_tsconfig_json_file_will_help_organize_projects_that_contain_both_TypeScript_and_JavaScript_files_Learn_more_at_https_Colon_Slash_Slashaka_ms_Slashtsconfig: diag(
    5068,
    qt.DiagnosticCategory.Error,
    'Adding_a_tsconfig_json_file_will_help_organize_projects_that_contain_both_TypeScript_and_JavaScript__5068',
    'Adding a tsconfig.json file will help organize projects that contain both TypeScript and JavaScript files. Learn more at https://aka.ms/tsconfig.'
  ),
  Option_0_cannot_be_specified_without_specifying_option_1_or_option_2: diag(
    5069,
    qt.DiagnosticCategory.Error,
    'Option_0_cannot_be_specified_without_specifying_option_1_or_option_2_5069',
    "Option '{0}' cannot be specified without specifying option '{1}' or option '{2}'."
  ),
  Option_resolveJsonModule_cannot_be_specified_without_node_module_resolution_strategy: diag(
    5070,
    qt.DiagnosticCategory.Error,
    'Option_resolveJsonModule_cannot_be_specified_without_node_module_resolution_strategy_5070',
    "Option '--resolveJsonModule' cannot be specified without 'node' module resolution strategy."
  ),
  Option_resolveJsonModule_can_only_be_specified_when_module_code_generation_is_commonjs_amd_es2015_or_esNext: diag(
    5071,
    qt.DiagnosticCategory.Error,
    'Option_resolveJsonModule_can_only_be_specified_when_module_code_generation_is_commonjs_amd_es2015_or_5071',
    "Option '--resolveJsonModule' can only be specified when module code generation is 'commonjs', 'amd', 'es2015' or 'esNext'."
  ),
  Unknown_build_option_0: diag(5072, qt.DiagnosticCategory.Error, 'Unknown_build_option_0_5072', "Unknown build option '{0}'."),
  Build_option_0_requires_a_value_of_type_1: diag(5073, qt.DiagnosticCategory.Error, 'Build_option_0_requires_a_value_of_type_1_5073', "Build option '{0}' requires a value of type {1}."),
  Option_incremental_can_only_be_specified_using_tsconfig_emitting_to_single_file_or_when_option_tsBuildInfoFile_is_specified: diag(
    5074,
    qt.DiagnosticCategory.Error,
    'Option_incremental_can_only_be_specified_using_tsconfig_emitting_to_single_file_or_when_option_tsBui_5074',
    "Option '--incremental' can only be specified using tsconfig, emitting to single file or when option `--tsBuildInfoFile` is specified."
  ),
  _0_is_assignable_to_the_constraint_of_type_1_but_1_could_be_instantiated_with_a_different_subtype_of_constraint_2: diag(
    5075,
    qt.DiagnosticCategory.Error,
    '_0_is_assignable_to_the_constraint_of_type_1_but_1_could_be_instantiated_with_a_different_subtype_of_5075',
    "'{0}' is assignable to the constraint of type '{1}', but '{1}' could be instantiated with a different subtype of constraint '{2}'."
  ),
  _0_and_1_operations_cannot_be_mixed_without_parentheses: diag(
    5076,
    qt.DiagnosticCategory.Error,
    '_0_and_1_operations_cannot_be_mixed_without_parentheses_5076',
    "'{0}' and '{1}' operations cannot be mixed without parentheses."
  ),
  Unknown_build_option_0_Did_you_mean_1: diag(5077, qt.DiagnosticCategory.Error, 'Unknown_build_option_0_Did_you_mean_1_5077', "Unknown build option '{0}'. Did you mean '{1}'?"),
  Unknown_watch_option_0: diag(5078, qt.DiagnosticCategory.Error, 'Unknown_watch_option_0_5078', "Unknown watch option '{0}'."),
  Unknown_watch_option_0_Did_you_mean_1: diag(5079, qt.DiagnosticCategory.Error, 'Unknown_watch_option_0_Did_you_mean_1_5079', "Unknown watch option '{0}'. Did you mean '{1}'?"),
  Watch_option_0_requires_a_value_of_type_1: diag(5080, qt.DiagnosticCategory.Error, 'Watch_option_0_requires_a_value_of_type_1_5080', "Watch option '{0}' requires a value of type {1}."),
  Cannot_find_a_tsconfig_json_file_at_the_current_directory_Colon_0: diag(
    5081,
    qt.DiagnosticCategory.Error,
    'Cannot_find_a_tsconfig_json_file_at_the_current_directory_Colon_0_5081',
    'Cannot find a tsconfig.json file at the current directory: {0}.'
  ),
  _0_could_be_instantiated_with_an_arbitrary_type_which_could_be_unrelated_to_1: diag(
    5082,
    qt.DiagnosticCategory.Error,
    '_0_could_be_instantiated_with_an_arbitrary_type_which_could_be_unrelated_to_1_5082',
    "'{0}' could be instantiated with an arbitrary type which could be unrelated to '{1}'."
  ),
  Cannot_read_file_0: diag(5083, qt.DiagnosticCategory.Error, 'Cannot_read_file_0_5083', "Cannot read file '{0}'."),
  Generates_a_sourcemap_for_each_corresponding_d_ts_file: diag(
    6000,
    qt.DiagnosticCategory.Message,
    'Generates_a_sourcemap_for_each_corresponding_d_ts_file_6000',
    "Generates a sourcemap for each corresponding '.d.ts' file."
  ),
  Concatenate_and_emit_output_to_single_file: diag(6001, qt.DiagnosticCategory.Message, 'Concatenate_and_emit_output_to_single_file_6001', 'Concatenate and emit output to single file.'),
  Generates_corresponding_d_ts_file: diag(6002, qt.DiagnosticCategory.Message, 'Generates_corresponding_d_ts_file_6002', "Generates corresponding '.d.ts' file."),
  Specify_the_location_where_debugger_should_locate_map_files_instead_of_generated_locations: diag(
    6003,
    qt.DiagnosticCategory.Message,
    'Specify_the_location_where_debugger_should_locate_map_files_instead_of_generated_locations_6003',
    'Specify the location where debugger should locate map files instead of generated locations.'
  ),
  Specify_the_location_where_debugger_should_locate_TypeScript_files_instead_of_source_locations: diag(
    6004,
    qt.DiagnosticCategory.Message,
    'Specify_the_location_where_debugger_should_locate_TypeScript_files_instead_of_source_locations_6004',
    'Specify the location where debugger should locate TypeScript files instead of source locations.'
  ),
  Watch_input_files: diag(6005, qt.DiagnosticCategory.Message, 'Watch_input_files_6005', 'Watch input files.'),
  Redirect_output_structure_to_the_directory: diag(6006, qt.DiagnosticCategory.Message, 'Redirect_output_structure_to_the_directory_6006', 'Redirect output structure to the directory.'),
  Do_not_erase_const_enum_declarations_in_generated_code: diag(
    6007,
    qt.DiagnosticCategory.Message,
    'Do_not_erase_const_enum_declarations_in_generated_code_6007',
    'Do not erase const enum declarations in generated code.'
  ),
  Do_not_emit_outputs_if_any_errors_were_reported: diag(
    6008,
    qt.DiagnosticCategory.Message,
    'Do_not_emit_outputs_if_any_errors_were_reported_6008',
    'Do not emit outputs if any errors were reported.'
  ),
  Do_not_emit_comments_to_output: diag(6009, qt.DiagnosticCategory.Message, 'Do_not_emit_comments_to_output_6009', 'Do not emit comments to output.'),
  Do_not_emit_outputs: diag(6010, qt.DiagnosticCategory.Message, 'Do_not_emit_outputs_6010', 'Do not emit outputs.'),
  Allow_default_imports_from_modules_with_no_default_export_This_does_not_affect_code_emit_just_typechecking: diag(
    6011,
    qt.DiagnosticCategory.Message,
    'Allow_default_imports_from_modules_with_no_default_export_This_does_not_affect_code_emit_just_typech_6011',
    'Allow default imports from modules with no default export. This does not affect code emit, just typechecking.'
  ),
  Skip_type_checking_of_declaration_files: diag(6012, qt.DiagnosticCategory.Message, 'Skip_type_checking_of_declaration_files_6012', 'Skip type checking of declaration files.'),
  Do_not_resolve_the_real_path_of_symlinks: diag(6013, qt.DiagnosticCategory.Message, 'Do_not_resolve_the_real_path_of_symlinks_6013', 'Do not resolve the real path of symlinks.'),
  Only_emit_d_ts_declaration_files: diag(6014, qt.DiagnosticCategory.Message, 'Only_emit_d_ts_declaration_files_6014', "Only emit '.d.ts' declaration files."),
  Specify_ECMAScript_target_version_Colon_ES3_default_ES5_ES2015_ES2016_ES2017_ES2018_ES2019_ES2020_or_ESNEXT: diag(
    6015,
    qt.DiagnosticCategory.Message,
    'Specify_ECMAScript_target_version_Colon_ES3_default_ES5_ES2015_ES2016_ES2017_ES2018_ES2019_ES2020_or_6015',
    "Specify ECMAScript target version: 'ES3' (default), 'ES5', 'ES2015', 'ES2016', 'ES2017', 'ES2018', 'ES2019', 'ES2020', or 'ESNEXT'."
  ),
  Specify_module_code_generation_Colon_none_commonjs_amd_system_umd_es2015_es2020_or_ESNext: diag(
    6016,
    qt.DiagnosticCategory.Message,
    'Specify_module_code_generation_Colon_none_commonjs_amd_system_umd_es2015_es2020_or_ESNext_6016',
    "Specify module code generation: 'none', 'commonjs', 'amd', 'system', 'umd', 'es2015', 'es2020', or 'ESNext'."
  ),
  Print_this_message: diag(6017, qt.DiagnosticCategory.Message, 'Print_this_message_6017', 'Print this message.'),
  Print_the_compiler_s_version: diag(6019, qt.DiagnosticCategory.Message, 'Print_the_compiler_s_version_6019', "Print the compiler's version."),
  Compile_the_project_given_the_path_to_its_configuration_file_or_to_a_folder_with_a_tsconfig_json: diag(
    6020,
    qt.DiagnosticCategory.Message,
    'Compile_the_project_given_the_path_to_its_configuration_file_or_to_a_folder_with_a_tsconfig_json_6020',
    "Compile the project given the path to its configuration file, or to a folder with a 'tsconfig.json'."
  ),
  Syntax_Colon_0: diag(6023, qt.DiagnosticCategory.Message, 'Syntax_Colon_0_6023', 'Syntax: {0}'),
  options: diag(6024, qt.DiagnosticCategory.Message, 'options_6024', 'options'),
  file: diag(6025, qt.DiagnosticCategory.Message, 'file_6025', 'file'),
  Examples_Colon_0: diag(6026, qt.DiagnosticCategory.Message, 'Examples_Colon_0_6026', 'Examples: {0}'),
  Options_Colon: diag(6027, qt.DiagnosticCategory.Message, 'Options_Colon_6027', 'Options:'),
  Version_0: diag(6029, qt.DiagnosticCategory.Message, 'Version_0_6029', 'Version {0}'),
  Insert_command_line_options_and_files_from_a_file: diag(
    6030,
    qt.DiagnosticCategory.Message,
    'Insert_command_line_options_and_files_from_a_file_6030',
    'Insert command line options and files from a file.'
  ),
  Starting_compilation_in_watch_mode: diag(6031, qt.DiagnosticCategory.Message, 'Starting_compilation_in_watch_mode_6031', 'Starting compilation in watch mode...'),
  File_change_detected_Starting_incremental_compilation: diag(
    6032,
    qt.DiagnosticCategory.Message,
    'File_change_detected_Starting_incremental_compilation_6032',
    'File change detected. Starting incremental compilation...'
  ),
  KIND: diag(6034, qt.DiagnosticCategory.Message, 'KIND_6034', 'KIND'),
  FILE: diag(6035, qt.DiagnosticCategory.Message, 'FILE_6035', 'FILE'),
  VERSION: diag(6036, qt.DiagnosticCategory.Message, 'VERSION_6036', 'VERSION'),
  LOCATION: diag(6037, qt.DiagnosticCategory.Message, 'LOCATION_6037', 'LOCATION'),
  DIRECTORY: diag(6038, qt.DiagnosticCategory.Message, 'DIRECTORY_6038', 'DIRECTORY'),
  STRATEGY: diag(6039, qt.DiagnosticCategory.Message, 'STRATEGY_6039', 'STRATEGY'),
  FILE_OR_DIRECTORY: diag(6040, qt.DiagnosticCategory.Message, 'FILE_OR_DIRECTORY_6040', 'FILE OR DIRECTORY'),
  Generates_corresponding_map_file: diag(6043, qt.DiagnosticCategory.Message, 'Generates_corresponding_map_file_6043', "Generates corresponding '.map' file."),
  Compiler_option_0_expects_an_argument: diag(6044, qt.DiagnosticCategory.Error, 'Compiler_option_0_expects_an_argument_6044', "Compiler option '{0}' expects an argument."),
  Unterminated_quoted_string_in_response_file_0: diag(6045, qt.DiagnosticCategory.Error, 'Unterminated_quoted_string_in_response_file_0_6045', "Unterminated quoted string in response file '{0}'."),
  Argument_for_0_option_must_be_Colon_1: diag(6046, qt.DiagnosticCategory.Error, 'Argument_for_0_option_must_be_Colon_1_6046', "Argument for '{0}' option must be: {1}."),
  Locale_must_be_of_the_form_language_or_language_territory_For_example_0_or_1: diag(
    6048,
    qt.DiagnosticCategory.Error,
    'Locale_must_be_of_the_form_language_or_language_territory_For_example_0_or_1_6048',
    "Locale must be of the form <language> or <language>-<territory>. For example '{0}' or '{1}'."
  ),
  Unsupported_locale_0: diag(6049, qt.DiagnosticCategory.Error, 'Unsupported_locale_0_6049', "Unsupported locale '{0}'."),
  Unable_to_open_file_0: diag(6050, qt.DiagnosticCategory.Error, 'Unable_to_open_file_0_6050', "Unable to open file '{0}'."),
  Corrupted_locale_file_0: diag(6051, qt.DiagnosticCategory.Error, 'Corrupted_locale_file_0_6051', 'Corrupted locale file {0}.'),
  Raise_error_on_expressions_and_declarations_with_an_implied_any_type: diag(
    6052,
    qt.DiagnosticCategory.Message,
    'Raise_error_on_expressions_and_declarations_with_an_implied_any_type_6052',
    "Raise error on expressions and declarations with an implied 'any' type."
  ),
  File_0_not_found: diag(6053, qt.DiagnosticCategory.Error, 'File_0_not_found_6053', "File '{0}' not found."),
  File_0_has_an_unsupported_extension_The_only_supported_extensions_are_1: diag(
    6054,
    qt.DiagnosticCategory.Error,
    'File_0_has_an_unsupported_extension_The_only_supported_extensions_are_1_6054',
    "File '{0}' has an unsupported extension. The only supported extensions are {1}."
  ),
  Suppress_noImplicitAny_errors_for_indexing_objects_lacking_index_signatures: diag(
    6055,
    qt.DiagnosticCategory.Message,
    'Suppress_noImplicitAny_errors_for_indexing_objects_lacking_index_signatures_6055',
    'Suppress noImplicitAny errors for indexing objects lacking index signatures.'
  ),
  Do_not_emit_declarations_for_code_that_has_an_internal_annotation: diag(
    6056,
    qt.DiagnosticCategory.Message,
    'Do_not_emit_declarations_for_code_that_has_an_internal_annotation_6056',
    "Do not emit declarations for code that has an '@internal' annotation."
  ),
  Specify_the_root_directory_of_input_files_Use_to_control_the_output_directory_structure_with_outDir: diag(
    6058,
    qt.DiagnosticCategory.Message,
    'Specify_the_root_directory_of_input_files_Use_to_control_the_output_directory_structure_with_outDir_6058',
    'Specify the root directory of input files. Use to control the output directory structure with --outDir.'
  ),
  File_0_is_not_under_rootDir_1_rootDir_is_expected_to_contain_all_source_files: diag(
    6059,
    qt.DiagnosticCategory.Error,
    'File_0_is_not_under_rootDir_1_rootDir_is_expected_to_contain_all_source_files_6059',
    "File '{0}' is not under 'rootDir' '{1}'. 'rootDir' is expected to contain all source files."
  ),
  Specify_the_end_of_line_sequence_to_be_used_when_emitting_files_Colon_CRLF_dos_or_LF_unix: diag(
    6060,
    qt.DiagnosticCategory.Message,
    'Specify_the_end_of_line_sequence_to_be_used_when_emitting_files_Colon_CRLF_dos_or_LF_unix_6060',
    "Specify the end of line sequence to be used when emitting files: 'CRLF' (dos) or 'LF' (unix)."
  ),
  NEWLINE: diag(6061, qt.DiagnosticCategory.Message, 'NEWLINE_6061', 'NEWLINE'),
  Option_0_can_only_be_specified_in_tsconfig_json_file_or_set_to_null_on_command_line: diag(
    6064,
    qt.DiagnosticCategory.Error,
    'Option_0_can_only_be_specified_in_tsconfig_json_file_or_set_to_null_on_command_line_6064',
    "Option '{0}' can only be specified in 'tsconfig.json' file or set to 'null' on command line."
  ),
  Enables_experimental_support_for_ES7_decorators: diag(
    6065,
    qt.DiagnosticCategory.Message,
    'Enables_experimental_support_for_ES7_decorators_6065',
    'Enables experimental support for ES7 decorators.'
  ),
  Enables_experimental_support_for_emitting_type_metadata_for_decorators: diag(
    6066,
    qt.DiagnosticCategory.Message,
    'Enables_experimental_support_for_emitting_type_metadata_for_decorators_6066',
    'Enables experimental support for emitting type metadata for decorators.'
  ),
  Enables_experimental_support_for_ES7_async_functions: diag(
    6068,
    qt.DiagnosticCategory.Message,
    'Enables_experimental_support_for_ES7_async_functions_6068',
    'Enables experimental support for ES7 async functions.'
  ),
  Specify_module_resolution_strategy_Colon_node_Node_js_or_classic_TypeScript_pre_1_6: diag(
    6069,
    qt.DiagnosticCategory.Message,
    'Specify_module_resolution_strategy_Colon_node_Node_js_or_classic_TypeScript_pre_1_6_6069',
    "Specify module resolution strategy: 'node' (Node.js) or 'classic' (TypeScript pre-1.6)."
  ),
  Initializes_a_TypeScript_project_and_creates_a_tsconfig_json_file: diag(
    6070,
    qt.DiagnosticCategory.Message,
    'Initializes_a_TypeScript_project_and_creates_a_tsconfig_json_file_6070',
    'Initializes a TypeScript project and creates a tsconfig.json file.'
  ),
  Successfully_created_a_tsconfig_json_file: diag(6071, qt.DiagnosticCategory.Message, 'Successfully_created_a_tsconfig_json_file_6071', 'Successfully created a tsconfig.json file.'),
  Suppress_excess_property_checks_for_object_literals: diag(
    6072,
    qt.DiagnosticCategory.Message,
    'Suppress_excess_property_checks_for_object_literals_6072',
    'Suppress excess property checks for object literals.'
  ),
  Stylize_errors_and_messages_using_color_and_context_experimental: diag(
    6073,
    qt.DiagnosticCategory.Message,
    'Stylize_errors_and_messages_using_color_and_context_experimental_6073',
    'Stylize errors and messages using color and context (experimental).'
  ),
  Do_not_report_errors_on_unused_labels: diag(6074, qt.DiagnosticCategory.Message, 'Do_not_report_errors_on_unused_labels_6074', 'Do not report errors on unused labels.'),
  Report_error_when_not_all_code_paths_in_function_return_a_value: diag(
    6075,
    qt.DiagnosticCategory.Message,
    'Report_error_when_not_all_code_paths_in_function_return_a_value_6075',
    'Report error when not all code paths in function return a value.'
  ),
  Report_errors_for_fallthrough_cases_in_switch_statement: diag(
    6076,
    qt.DiagnosticCategory.Message,
    'Report_errors_for_fallthrough_cases_in_switch_statement_6076',
    'Report errors for fallthrough cases in switch statement.'
  ),
  Do_not_report_errors_on_unreachable_code: diag(6077, qt.DiagnosticCategory.Message, 'Do_not_report_errors_on_unreachable_code_6077', 'Do not report errors on unreachable code.'),
  Disallow_inconsistently_cased_references_to_the_same_file: diag(
    6078,
    qt.DiagnosticCategory.Message,
    'Disallow_inconsistently_cased_references_to_the_same_file_6078',
    'Disallow inconsistently-cased references to the same file.'
  ),
  Specify_library_files_to_be_included_in_the_compilation: diag(
    6079,
    qt.DiagnosticCategory.Message,
    'Specify_library_files_to_be_included_in_the_compilation_6079',
    'Specify library files to be included in the compilation.'
  ),
  Specify_JSX_code_generation_Colon_preserve_react_native_or_react: diag(
    6080,
    qt.DiagnosticCategory.Message,
    'Specify_JSX_code_generation_Colon_preserve_react_native_or_react_6080',
    "Specify JSX code generation: 'preserve', 'react-native', or 'react'."
  ),
  File_0_has_an_unsupported_extension_so_skipping_it: diag(
    6081,
    qt.DiagnosticCategory.Message,
    'File_0_has_an_unsupported_extension_so_skipping_it_6081',
    "File '{0}' has an unsupported extension, so skipping it."
  ),
  Only_amd_and_system_modules_are_supported_alongside_0: diag(
    6082,
    qt.DiagnosticCategory.Error,
    'Only_amd_and_system_modules_are_supported_alongside_0_6082',
    "Only 'amd' and 'system' modules are supported alongside --{0}."
  ),
  Base_directory_to_resolve_non_absolute_module_names: diag(
    6083,
    qt.DiagnosticCategory.Message,
    'Base_directory_to_resolve_non_absolute_module_names_6083',
    'Base directory to resolve non-absolute module names.'
  ),
  Deprecated_Use_jsxFactory_instead_Specify_the_object_invoked_for_createElement_when_targeting_react_JSX_emit: diag(
    6084,
    qt.DiagnosticCategory.Message,
    'Deprecated_Use_jsxFactory_instead_Specify_the_object_invoked_for_createElement_when_targeting_react__6084',
    "[Deprecated] Use '--jsxFactory' instead. Specify the object invoked for createElement when targeting 'react' JSX emit"
  ),
  Enable_tracing_of_the_name_resolution_process: diag(6085, qt.DiagnosticCategory.Message, 'Enable_tracing_of_the_name_resolution_process_6085', 'Enable tracing of the name resolution process.'),
  Resolving_module_0_from_1: diag(6086, qt.DiagnosticCategory.Message, 'Resolving_module_0_from_1_6086', "======== Resolving module '{0}' from '{1}'. ========"),
  Explicitly_specified_module_resolution_kind_Colon_0: diag(
    6087,
    qt.DiagnosticCategory.Message,
    'Explicitly_specified_module_resolution_kind_Colon_0_6087',
    "Explicitly specified module resolution kind: '{0}'."
  ),
  Module_resolution_kind_is_not_specified_using_0: diag(
    6088,
    qt.DiagnosticCategory.Message,
    'Module_resolution_kind_is_not_specified_using_0_6088',
    "Module resolution kind is not specified, using '{0}'."
  ),
  Module_name_0_was_successfully_resolved_to_1: diag(
    6089,
    qt.DiagnosticCategory.Message,
    'Module_name_0_was_successfully_resolved_to_1_6089',
    "======== Module name '{0}' was successfully resolved to '{1}'. ========"
  ),
  Module_name_0_was_not_resolved: diag(6090, qt.DiagnosticCategory.Message, 'Module_name_0_was_not_resolved_6090', "======== Module name '{0}' was not resolved. ========"),
  paths_option_is_specified_looking_for_a_pattern_to_match_module_name_0: diag(
    6091,
    qt.DiagnosticCategory.Message,
    'paths_option_is_specified_looking_for_a_pattern_to_match_module_name_0_6091',
    "'paths' option is specified, looking for a pattern to match module name '{0}'."
  ),
  Module_name_0_matched_pattern_1: diag(6092, qt.DiagnosticCategory.Message, 'Module_name_0_matched_pattern_1_6092', "Module name '{0}', matched pattern '{1}'."),
  Trying_substitution_0_candidate_module_location_Colon_1: diag(
    6093,
    qt.DiagnosticCategory.Message,
    'Trying_substitution_0_candidate_module_location_Colon_1_6093',
    "Trying substitution '{0}', candidate module location: '{1}'."
  ),
  Resolving_module_name_0_relative_to_base_url_1_2: diag(
    6094,
    qt.DiagnosticCategory.Message,
    'Resolving_module_name_0_relative_to_base_url_1_2_6094',
    "Resolving module name '{0}' relative to base url '{1}' - '{2}'."
  ),
  Loading_module_as_file_Slash_folder_candidate_module_location_0_target_file_type_1: diag(
    6095,
    qt.DiagnosticCategory.Message,
    'Loading_module_as_file_Slash_folder_candidate_module_location_0_target_file_type_1_6095',
    "Loading module as file / folder, candidate module location '{0}', target file type '{1}'."
  ),
  File_0_does_not_exist: diag(6096, qt.DiagnosticCategory.Message, 'File_0_does_not_exist_6096', "File '{0}' does not exist."),
  File_0_exist_use_it_as_a_name_resolution_result: diag(
    6097,
    qt.DiagnosticCategory.Message,
    'File_0_exist_use_it_as_a_name_resolution_result_6097',
    "File '{0}' exist - use it as a name resolution result."
  ),
  Loading_module_0_from_node_modules_folder_target_file_type_1: diag(
    6098,
    qt.DiagnosticCategory.Message,
    'Loading_module_0_from_node_modules_folder_target_file_type_1_6098',
    "Loading module '{0}' from 'node_modules' folder, target file type '{1}'."
  ),
  Found_package_json_at_0: diag(6099, qt.DiagnosticCategory.Message, 'Found_package_json_at_0_6099', "Found 'package.json' at '{0}'."),
  package_json_does_not_have_a_0_field: diag(6100, qt.DiagnosticCategory.Message, 'package_json_does_not_have_a_0_field_6100', "'package.json' does not have a '{0}' field."),
  package_json_has_0_field_1_that_references_2: diag(
    6101,
    qt.DiagnosticCategory.Message,
    'package_json_has_0_field_1_that_references_2_6101',
    "'package.json' has '{0}' field '{1}' that references '{2}'."
  ),
  Allow_javascript_files_to_be_compiled: diag(6102, qt.DiagnosticCategory.Message, 'Allow_javascript_files_to_be_compiled_6102', 'Allow javascript files to be compiled.'),
  Option_0_should_have_array_of_strings_as_a_value: diag(
    6103,
    qt.DiagnosticCategory.Error,
    'Option_0_should_have_array_of_strings_as_a_value_6103',
    "Option '{0}' should have array of strings as a value."
  ),
  Checking_if_0_is_the_longest_matching_prefix_for_1_2: diag(
    6104,
    qt.DiagnosticCategory.Message,
    'Checking_if_0_is_the_longest_matching_prefix_for_1_2_6104',
    "Checking if '{0}' is the longest matching prefix for '{1}' - '{2}'."
  ),
  Expected_type_of_0_field_in_package_json_to_be_1_got_2: diag(
    6105,
    qt.DiagnosticCategory.Message,
    'Expected_type_of_0_field_in_package_json_to_be_1_got_2_6105',
    "Expected type of '{0}' field in 'package.json' to be '{1}', got '{2}'."
  ),
  baseUrl_option_is_set_to_0_using_this_value_to_resolve_non_relative_module_name_1: diag(
    6106,
    qt.DiagnosticCategory.Message,
    'baseUrl_option_is_set_to_0_using_this_value_to_resolve_non_relative_module_name_1_6106',
    "'baseUrl' option is set to '{0}', using this value to resolve non-relative module name '{1}'."
  ),
  rootDirs_option_is_set_using_it_to_resolve_relative_module_name_0: diag(
    6107,
    qt.DiagnosticCategory.Message,
    'rootDirs_option_is_set_using_it_to_resolve_relative_module_name_0_6107',
    "'rootDirs' option is set, using it to resolve relative module name '{0}'."
  ),
  Longest_matching_prefix_for_0_is_1: diag(6108, qt.DiagnosticCategory.Message, 'Longest_matching_prefix_for_0_is_1_6108', "Longest matching prefix for '{0}' is '{1}'."),
  Loading_0_from_the_root_dir_1_candidate_location_2: diag(
    6109,
    qt.DiagnosticCategory.Message,
    'Loading_0_from_the_root_dir_1_candidate_location_2_6109',
    "Loading '{0}' from the root dir '{1}', candidate location '{2}'."
  ),
  Trying_other_entries_in_rootDirs: diag(6110, qt.DiagnosticCategory.Message, 'Trying_other_entries_in_rootDirs_6110', "Trying other entries in 'rootDirs'."),
  Module_resolution_using_rootDirs_has_failed: diag(6111, qt.DiagnosticCategory.Message, 'Module_resolution_using_rootDirs_has_failed_6111', "Module resolution using 'rootDirs' has failed."),
  Do_not_emit_use_strict_directives_in_module_output: diag(
    6112,
    qt.DiagnosticCategory.Message,
    'Do_not_emit_use_strict_directives_in_module_output_6112',
    "Do not emit 'use strict' directives in module output."
  ),
  Enable_strict_null_checks: diag(6113, qt.DiagnosticCategory.Message, 'Enable_strict_null_checks_6113', 'Enable strict null checks.'),
  Unknown_option_excludes_Did_you_mean_exclude: diag(6114, qt.DiagnosticCategory.Error, 'Unknown_option_excludes_Did_you_mean_exclude_6114', "Unknown option 'excludes'. Did you mean 'exclude'?"),
  Raise_error_on_this_expressions_with_an_implied_any_type: diag(
    6115,
    qt.DiagnosticCategory.Message,
    'Raise_error_on_this_expressions_with_an_implied_any_type_6115',
    "Raise error on 'this' expressions with an implied 'any' type."
  ),
  Resolving_type_reference_directive_0_containing_file_1_root_directory_2: diag(
    6116,
    qt.DiagnosticCategory.Message,
    'Resolving_type_reference_directive_0_containing_file_1_root_directory_2_6116',
    "======== Resolving type reference directive '{0}', containing file '{1}', root directory '{2}'. ========"
  ),
  Resolving_using_primary_search_paths: diag(6117, qt.DiagnosticCategory.Message, 'Resolving_using_primary_search_paths_6117', 'Resolving using primary search paths...'),
  Resolving_from_node_modules_folder: diag(6118, qt.DiagnosticCategory.Message, 'Resolving_from_node_modules_folder_6118', 'Resolving from node_modules folder...'),
  Type_reference_directive_0_was_successfully_resolved_to_1_primary_Colon_2: diag(
    6119,
    qt.DiagnosticCategory.Message,
    'Type_reference_directive_0_was_successfully_resolved_to_1_primary_Colon_2_6119',
    "======== Type reference directive '{0}' was successfully resolved to '{1}', primary: {2}. ========"
  ),
  Type_reference_directive_0_was_not_resolved: diag(
    6120,
    qt.DiagnosticCategory.Message,
    'Type_reference_directive_0_was_not_resolved_6120',
    "======== Type reference directive '{0}' was not resolved. ========"
  ),
  Resolving_with_primary_search_path_0: diag(6121, qt.DiagnosticCategory.Message, 'Resolving_with_primary_search_path_0_6121', "Resolving with primary search path '{0}'."),
  Root_directory_cannot_be_determined_skipping_primary_search_paths: diag(
    6122,
    qt.DiagnosticCategory.Message,
    'Root_directory_cannot_be_determined_skipping_primary_search_paths_6122',
    'Root directory cannot be determined, skipping primary search paths.'
  ),
  Resolving_type_reference_directive_0_containing_file_1_root_directory_not_set: diag(
    6123,
    qt.DiagnosticCategory.Message,
    'Resolving_type_reference_directive_0_containing_file_1_root_directory_not_set_6123',
    "======== Resolving type reference directive '{0}', containing file '{1}', root directory not set. ========"
  ),
  Type_declaration_files_to_be_included_in_compilation: diag(
    6124,
    qt.DiagnosticCategory.Message,
    'Type_declaration_files_to_be_included_in_compilation_6124',
    'Type declaration files to be included in compilation.'
  ),
  Looking_up_in_node_modules_folder_initial_location_0: diag(
    6125,
    qt.DiagnosticCategory.Message,
    'Looking_up_in_node_modules_folder_initial_location_0_6125',
    "Looking up in 'node_modules' folder, initial location '{0}'."
  ),
  Containing_file_is_not_specified_and_root_directory_cannot_be_determined_skipping_lookup_in_node_modules_folder: diag(
    6126,
    qt.DiagnosticCategory.Message,
    'Containing_file_is_not_specified_and_root_directory_cannot_be_determined_skipping_lookup_in_node_mod_6126',
    "Containing file is not specified and root directory cannot be determined, skipping lookup in 'node_modules' folder."
  ),
  Resolving_type_reference_directive_0_containing_file_not_set_root_directory_1: diag(
    6127,
    qt.DiagnosticCategory.Message,
    'Resolving_type_reference_directive_0_containing_file_not_set_root_directory_1_6127',
    "======== Resolving type reference directive '{0}', containing file not set, root directory '{1}'. ========"
  ),
  Resolving_type_reference_directive_0_containing_file_not_set_root_directory_not_set: diag(
    6128,
    qt.DiagnosticCategory.Message,
    'Resolving_type_reference_directive_0_containing_file_not_set_root_directory_not_set_6128',
    "======== Resolving type reference directive '{0}', containing file not set, root directory not set. ========"
  ),
  Resolving_real_path_for_0_result_1: diag(6130, qt.DiagnosticCategory.Message, 'Resolving_real_path_for_0_result_1_6130', "Resolving real path for '{0}', result '{1}'."),
  Cannot_compile_modules_using_option_0_unless_the_module_flag_is_amd_or_system: diag(
    6131,
    qt.DiagnosticCategory.Error,
    'Cannot_compile_modules_using_option_0_unless_the_module_flag_is_amd_or_system_6131',
    "Cannot compile modules using option '{0}' unless the '--module' flag is 'amd' or 'system'."
  ),
  File_name_0_has_a_1_extension_stripping_it: diag(6132, qt.DiagnosticCategory.Message, 'File_name_0_has_a_1_extension_stripping_it_6132', "File name '{0}' has a '{1}' extension - stripping it."),
  _0_is_declared_but_its_value_is_never_read: diag(
    6133,
    qt.DiagnosticCategory.Error,
    '_0_is_declared_but_its_value_is_never_read_6133',
    "'{0}' is declared but its value is never read.",
    /*reportsUnnecessary*/ true
  ),
  Report_errors_on_unused_locals: diag(6134, qt.DiagnosticCategory.Message, 'Report_errors_on_unused_locals_6134', 'Report errors on unused locals.'),
  Report_errors_on_unused_parameters: diag(6135, qt.DiagnosticCategory.Message, 'Report_errors_on_unused_parameters_6135', 'Report errors on unused parameters.'),
  The_maximum_dependency_depth_to_search_under_node_modules_and_load_JavaScript_files: diag(
    6136,
    qt.DiagnosticCategory.Message,
    'The_maximum_dependency_depth_to_search_under_node_modules_and_load_JavaScript_files_6136',
    'The maximum dependency depth to search under node_modules and load JavaScript files.'
  ),
  Cannot_import_type_declaration_files_Consider_importing_0_instead_of_1: diag(
    6137,
    qt.DiagnosticCategory.Error,
    'Cannot_import_type_declaration_files_Consider_importing_0_instead_of_1_6137',
    "Cannot import type declaration files. Consider importing '{0}' instead of '{1}'."
  ),
  Property_0_is_declared_but_its_value_is_never_read: diag(
    6138,
    qt.DiagnosticCategory.Error,
    'Property_0_is_declared_but_its_value_is_never_read_6138',
    "Property '{0}' is declared but its value is never read.",
    /*reportsUnnecessary*/ true
  ),
  Import_emit_helpers_from_tslib: diag(6139, qt.DiagnosticCategory.Message, 'Import_emit_helpers_from_tslib_6139', "Import emit helpers from 'tslib'."),
  Auto_discovery_for_typings_is_enabled_in_project_0_Running_extra_resolution_pass_for_module_1_using_cache_location_2: diag(
    6140,
    qt.DiagnosticCategory.Error,
    'Auto_discovery_for_typings_is_enabled_in_project_0_Running_extra_resolution_pass_for_module_1_using__6140',
    "Auto discovery for typings is enabled in project '{0}'. Running extra resolution pass for module '{1}' using cache location '{2}'."
  ),
  Parse_in_strict_mode_and_emit_use_strict_for_each_source_file: diag(
    6141,
    qt.DiagnosticCategory.Message,
    'Parse_in_strict_mode_and_emit_use_strict_for_each_source_file_6141',
    'Parse in strict mode and emit "use strict" for each source file.'
  ),
  Module_0_was_resolved_to_1_but_jsx_is_not_set: diag(
    6142,
    qt.DiagnosticCategory.Error,
    'Module_0_was_resolved_to_1_but_jsx_is_not_set_6142',
    "Module '{0}' was resolved to '{1}', but '--jsx' is not set."
  ),
  Module_0_was_resolved_as_locally_declared_ambient_module_in_file_1: diag(
    6144,
    qt.DiagnosticCategory.Message,
    'Module_0_was_resolved_as_locally_declared_ambient_module_in_file_1_6144',
    "Module '{0}' was resolved as locally declared ambient module in file '{1}'."
  ),
  Module_0_was_resolved_as_ambient_module_declared_in_1_since_this_file_was_not_modified: diag(
    6145,
    qt.DiagnosticCategory.Message,
    'Module_0_was_resolved_as_ambient_module_declared_in_1_since_this_file_was_not_modified_6145',
    "Module '{0}' was resolved as ambient module declared in '{1}' since this file was not modified."
  ),
  Specify_the_JSX_factory_function_to_use_when_targeting_react_JSX_emit_e_g_React_createElement_or_h: diag(
    6146,
    qt.DiagnosticCategory.Message,
    'Specify_the_JSX_factory_function_to_use_when_targeting_react_JSX_emit_e_g_React_createElement_or_h_6146',
    "Specify the JSX factory function to use when targeting 'react' JSX emit, e.g. 'React.createElement' or 'h'."
  ),
  Resolution_for_module_0_was_found_in_cache_from_location_1: diag(
    6147,
    qt.DiagnosticCategory.Message,
    'Resolution_for_module_0_was_found_in_cache_from_location_1_6147',
    "Resolution for module '{0}' was found in cache from location '{1}'."
  ),
  Directory_0_does_not_exist_skipping_all_lookups_in_it: diag(
    6148,
    qt.DiagnosticCategory.Message,
    'Directory_0_does_not_exist_skipping_all_lookups_in_it_6148',
    "Directory '{0}' does not exist, skipping all lookups in it."
  ),
  Show_diagnostic_information: diag(6149, qt.DiagnosticCategory.Message, 'Show_diagnostic_information_6149', 'Show diagnostic information.'),
  Show_verbose_diagnostic_information: diag(6150, qt.DiagnosticCategory.Message, 'Show_verbose_diagnostic_information_6150', 'Show verbose diagnostic information.'),
  Emit_a_single_file_with_source_maps_instead_of_having_a_separate_file: diag(
    6151,
    qt.DiagnosticCategory.Message,
    'Emit_a_single_file_with_source_maps_instead_of_having_a_separate_file_6151',
    'Emit a single file with source maps instead of having a separate file.'
  ),
  Emit_the_source_alongside_the_sourcemaps_within_a_single_file_requires_inlineSourceMap_or_sourceMap_to_be_set: diag(
    6152,
    qt.DiagnosticCategory.Message,
    'Emit_the_source_alongside_the_sourcemaps_within_a_single_file_requires_inlineSourceMap_or_sourceMap__6152',
    "Emit the source alongside the sourcemaps within a single file; requires '--inlineSourceMap' or '--sourceMap' to be set."
  ),
  Transpile_each_file_as_a_separate_module_similar_to_ts_transpileModule: diag(
    6153,
    qt.DiagnosticCategory.Message,
    'Transpile_each_file_as_a_separate_module_similar_to_ts_transpileModule_6153',
    "Transpile each file as a separate module (similar to 'ts.transpileModule')."
  ),
  Print_names_of_generated_files_part_of_the_compilation: diag(
    6154,
    qt.DiagnosticCategory.Message,
    'Print_names_of_generated_files_part_of_the_compilation_6154',
    'Print names of generated files part of the compilation.'
  ),
  Print_names_of_files_part_of_the_compilation: diag(6155, qt.DiagnosticCategory.Message, 'Print_names_of_files_part_of_the_compilation_6155', 'Print names of files part of the compilation.'),
  The_locale_used_when_displaying_messages_to_the_user_e_g_en_us: diag(
    6156,
    qt.DiagnosticCategory.Message,
    'The_locale_used_when_displaying_messages_to_the_user_e_g_en_us_6156',
    "The locale used when displaying messages to the user (e.g. 'en-us')"
  ),
  Do_not_generate_custom_helper_functions_like_extends_in_compiled_output: diag(
    6157,
    qt.DiagnosticCategory.Message,
    'Do_not_generate_custom_helper_functions_like_extends_in_compiled_output_6157',
    "Do not generate custom helper functions like '__extends' in compiled output."
  ),
  Do_not_include_the_default_library_file_lib_d_ts: diag(
    6158,
    qt.DiagnosticCategory.Message,
    'Do_not_include_the_default_library_file_lib_d_ts_6158',
    'Do not include the default library file (lib.d.ts).'
  ),
  Do_not_add_triple_slash_references_or_imported_modules_to_the_list_of_compiled_files: diag(
    6159,
    qt.DiagnosticCategory.Message,
    'Do_not_add_triple_slash_references_or_imported_modules_to_the_list_of_compiled_files_6159',
    'Do not add triple-slash references or imported modules to the list of compiled files.'
  ),
  Deprecated_Use_skipLibCheck_instead_Skip_type_checking_of_default_library_declaration_files: diag(
    6160,
    qt.DiagnosticCategory.Message,
    'Deprecated_Use_skipLibCheck_instead_Skip_type_checking_of_default_library_declaration_files_6160',
    "[Deprecated] Use '--skipLibCheck' instead. Skip type checking of default library declaration files."
  ),
  List_of_folders_to_include_type_definitions_from: diag(
    6161,
    qt.DiagnosticCategory.Message,
    'List_of_folders_to_include_type_definitions_from_6161',
    'List of folders to include type definitions from.'
  ),
  Disable_size_limitations_on_JavaScript_projects: diag(
    6162,
    qt.DiagnosticCategory.Message,
    'Disable_size_limitations_on_JavaScript_projects_6162',
    'Disable size limitations on JavaScript projects.'
  ),
  The_character_set_of_the_input_files: diag(6163, qt.DiagnosticCategory.Message, 'The_character_set_of_the_input_files_6163', 'The character set of the input files.'),
  Emit_a_UTF_8_Byte_Order_Mark_BOM_in_the_beginning_of_output_files: diag(
    6164,
    qt.DiagnosticCategory.Message,
    'Emit_a_UTF_8_Byte_Order_Mark_BOM_in_the_beginning_of_output_files_6164',
    'Emit a UTF-8 Byte Order Mark (BOM) in the beginning of output files.'
  ),
  Do_not_truncate_error_messages: diag(6165, qt.DiagnosticCategory.Message, 'Do_not_truncate_error_messages_6165', 'Do not truncate error messages.'),
  Output_directory_for_generated_declaration_files: diag(
    6166,
    qt.DiagnosticCategory.Message,
    'Output_directory_for_generated_declaration_files_6166',
    'Output directory for generated declaration files.'
  ),
  A_series_of_entries_which_re_map_imports_to_lookup_locations_relative_to_the_baseUrl: diag(
    6167,
    qt.DiagnosticCategory.Message,
    'A_series_of_entries_which_re_map_imports_to_lookup_locations_relative_to_the_baseUrl_6167',
    "A series of entries which re-map imports to lookup locations relative to the 'baseUrl'."
  ),
  List_of_root_folders_whose_combined_content_represents_the_structure_of_the_project_at_runtime: diag(
    6168,
    qt.DiagnosticCategory.Message,
    'List_of_root_folders_whose_combined_content_represents_the_structure_of_the_project_at_runtime_6168',
    'List of root folders whose combined content represents the structure of the project at runtime.'
  ),
  Show_all_compiler_options: diag(6169, qt.DiagnosticCategory.Message, 'Show_all_compiler_options_6169', 'Show all compiler options.'),
  Deprecated_Use_outFile_instead_Concatenate_and_emit_output_to_single_file: diag(
    6170,
    qt.DiagnosticCategory.Message,
    'Deprecated_Use_outFile_instead_Concatenate_and_emit_output_to_single_file_6170',
    "[Deprecated] Use '--outFile' instead. Concatenate and emit output to single file"
  ),
  Command_line_Options: diag(6171, qt.DiagnosticCategory.Message, 'Command_line_Options_6171', 'Command-line Options'),
  Basic_Options: diag(6172, qt.DiagnosticCategory.Message, 'Basic_Options_6172', 'Basic Options'),
  Strict_Type_Checking_Options: diag(6173, qt.DiagnosticCategory.Message, 'Strict_Type_Checking_Options_6173', 'Strict Type-Checking Options'),
  Module_Resolution_Options: diag(6174, qt.DiagnosticCategory.Message, 'Module_Resolution_Options_6174', 'Module Resolution Options'),
  Source_Map_Options: diag(6175, qt.DiagnosticCategory.Message, 'Source_Map_Options_6175', 'Source Map Options'),
  Additional_Checks: diag(6176, qt.DiagnosticCategory.Message, 'Additional_Checks_6176', 'Additional Checks'),
  Experimental_Options: diag(6177, qt.DiagnosticCategory.Message, 'Experimental_Options_6177', 'Experimental Options'),
  Advanced_Options: diag(6178, qt.DiagnosticCategory.Message, 'Advanced_Options_6178', 'Advanced Options'),
  Provide_full_support_for_iterables_in_for_of_spread_and_destructuring_when_targeting_ES5_or_ES3: diag(
    6179,
    qt.DiagnosticCategory.Message,
    'Provide_full_support_for_iterables_in_for_of_spread_and_destructuring_when_targeting_ES5_or_ES3_6179',
    "Provide full support for iterables in 'for-of', spread, and destructuring when targeting 'ES5' or 'ES3'."
  ),
  Enable_all_strict_type_checking_options: diag(6180, qt.DiagnosticCategory.Message, 'Enable_all_strict_type_checking_options_6180', 'Enable all strict type-checking options.'),
  List_of_language_service_plugins: diag(6181, qt.DiagnosticCategory.Message, 'List_of_language_service_plugins_6181', 'List of language service plugins.'),
  Scoped_package_detected_looking_in_0: diag(6182, qt.DiagnosticCategory.Message, 'Scoped_package_detected_looking_in_0_6182', "Scoped package detected, looking in '{0}'"),
  Reusing_resolution_of_module_0_to_file_1_from_old_program: diag(
    6183,
    qt.DiagnosticCategory.Message,
    'Reusing_resolution_of_module_0_to_file_1_from_old_program_6183',
    "Reusing resolution of module '{0}' to file '{1}' from old program."
  ),
  Reusing_module_resolutions_originating_in_0_since_resolutions_are_unchanged_from_old_program: diag(
    6184,
    qt.DiagnosticCategory.Message,
    'Reusing_module_resolutions_originating_in_0_since_resolutions_are_unchanged_from_old_program_6184',
    "Reusing module resolutions originating in '{0}' since resolutions are unchanged from old program."
  ),
  Disable_strict_checking_of_generic_signatures_in_function_types: diag(
    6185,
    qt.DiagnosticCategory.Message,
    'Disable_strict_checking_of_generic_signatures_in_function_types_6185',
    'Disable strict checking of generic signatures in function types.'
  ),
  Enable_strict_checking_of_function_types: diag(6186, qt.DiagnosticCategory.Message, 'Enable_strict_checking_of_function_types_6186', 'Enable strict checking of function types.'),
  Enable_strict_checking_of_property_initialization_in_classes: diag(
    6187,
    qt.DiagnosticCategory.Message,
    'Enable_strict_checking_of_property_initialization_in_classes_6187',
    'Enable strict checking of property initialization in classes.'
  ),
  Numeric_separators_are_not_allowed_here: diag(6188, qt.DiagnosticCategory.Error, 'Numeric_separators_are_not_allowed_here_6188', 'Numeric separators are not allowed here.'),
  Multiple_consecutive_numeric_separators_are_not_permitted: diag(
    6189,
    qt.DiagnosticCategory.Error,
    'Multiple_consecutive_numeric_separators_are_not_permitted_6189',
    'Multiple consecutive numeric separators are not permitted.'
  ),
  Whether_to_keep_outdated_console_output_in_watch_mode_instead_of_clearing_the_screen: diag(
    6191,
    qt.DiagnosticCategory.Message,
    'Whether_to_keep_outdated_console_output_in_watch_mode_instead_of_clearing_the_screen_6191',
    'Whether to keep outdated console output in watch mode instead of clearing the screen.'
  ),
  All_imports_in_import_declaration_are_unused: diag(
    6192,
    qt.DiagnosticCategory.Error,
    'All_imports_in_import_declaration_are_unused_6192',
    'All imports in import declaration are unused.',
    /*reportsUnnecessary*/ true
  ),
  Found_1_error_Watching_for_file_changes: diag(6193, qt.DiagnosticCategory.Message, 'Found_1_error_Watching_for_file_changes_6193', 'Found 1 error. Watching for file changes.'),
  Found_0_errors_Watching_for_file_changes: diag(6194, qt.DiagnosticCategory.Message, 'Found_0_errors_Watching_for_file_changes_6194', 'Found {0} errors. Watching for file changes.'),
  Resolve_keyof_to_string_valued_property_names_only_no_numbers_or_symbols: diag(
    6195,
    qt.DiagnosticCategory.Message,
    'Resolve_keyof_to_string_valued_property_names_only_no_numbers_or_symbols_6195',
    "Resolve 'keyof' to string valued property names only (no numbers or symbols)."
  ),
  _0_is_declared_but_never_used: diag(6196, qt.DiagnosticCategory.Error, '_0_is_declared_but_never_used_6196', "'{0}' is declared but never used.", /*reportsUnnecessary*/ true),
  Include_modules_imported_with_json_extension: diag(6197, qt.DiagnosticCategory.Message, 'Include_modules_imported_with_json_extension_6197', "Include modules imported with '.json' extension"),
  All_destructured_elements_are_unused: diag(6198, qt.DiagnosticCategory.Error, 'All_destructured_elements_are_unused_6198', 'All destructured elements are unused.', /*reportsUnnecessary*/ true),
  All_variables_are_unused: diag(6199, qt.DiagnosticCategory.Error, 'All_variables_are_unused_6199', 'All variables are unused.', /*reportsUnnecessary*/ true),
  Definitions_of_the_following_identifiers_conflict_with_those_in_another_file_Colon_0: diag(
    6200,
    qt.DiagnosticCategory.Error,
    'Definitions_of_the_following_identifiers_conflict_with_those_in_another_file_Colon_0_6200',
    'Definitions of the following identifiers conflict with those in another file: {0}'
  ),
  Conflicts_are_in_this_file: diag(6201, qt.DiagnosticCategory.Message, 'Conflicts_are_in_this_file_6201', 'Conflicts are in this file.'),
  Project_references_may_not_form_a_circular_graph_Cycle_detected_Colon_0: diag(
    6202,
    qt.DiagnosticCategory.Error,
    'Project_references_may_not_form_a_circular_graph_Cycle_detected_Colon_0_6202',
    'Project references may not form a circular graph. Cycle detected: {0}'
  ),
  _0_was_also_declared_here: diag(6203, qt.DiagnosticCategory.Message, '_0_was_also_declared_here_6203', "'{0}' was also declared here."),
  and_here: diag(6204, qt.DiagnosticCategory.Message, 'and_here_6204', 'and here.'),
  All_type_parameters_are_unused: diag(6205, qt.DiagnosticCategory.Error, 'All_type_parameters_are_unused_6205', 'All type parameters are unused'),
  package_json_has_a_typesVersions_field_with_version_specific_path_mappings: diag(
    6206,
    qt.DiagnosticCategory.Message,
    'package_json_has_a_typesVersions_field_with_version_specific_path_mappings_6206',
    "'package.json' has a 'typesVersions' field with version-specific path mappings."
  ),
  package_json_does_not_have_a_typesVersions_entry_that_matches_version_0: diag(
    6207,
    qt.DiagnosticCategory.Message,
    'package_json_does_not_have_a_typesVersions_entry_that_matches_version_0_6207',
    "'package.json' does not have a 'typesVersions' entry that matches version '{0}'."
  ),
  package_json_has_a_typesVersions_entry_0_that_matches_compiler_version_1_looking_for_a_pattern_to_match_module_name_2: diag(
    6208,
    qt.DiagnosticCategory.Message,
    'package_json_has_a_typesVersions_entry_0_that_matches_compiler_version_1_looking_for_a_pattern_to_ma_6208',
    "'package.json' has a 'typesVersions' entry '{0}' that matches compiler version '{1}', looking for a pattern to match module name '{2}'."
  ),
  package_json_has_a_typesVersions_entry_0_that_is_not_a_valid_semver_range: diag(
    6209,
    qt.DiagnosticCategory.Message,
    'package_json_has_a_typesVersions_entry_0_that_is_not_a_valid_semver_range_6209',
    "'package.json' has a 'typesVersions' entry '{0}' that is not a valid semver range."
  ),
  An_argument_for_0_was_not_provided: diag(6210, qt.DiagnosticCategory.Message, 'An_argument_for_0_was_not_provided_6210', "An argument for '{0}' was not provided."),
  An_argument_matching_this_binding_pattern_was_not_provided: diag(
    6211,
    qt.DiagnosticCategory.Message,
    'An_argument_matching_this_binding_pattern_was_not_provided_6211',
    'An argument matching this binding pattern was not provided.'
  ),
  Did_you_mean_to_call_this_expression: diag(6212, qt.DiagnosticCategory.Message, 'Did_you_mean_to_call_this_expression_6212', 'Did you mean to call this expression?'),
  Did_you_mean_to_use_new_with_this_expression: diag(6213, qt.DiagnosticCategory.Message, 'Did_you_mean_to_use_new_with_this_expression_6213', "Did you mean to use 'new' with this expression?"),
  Enable_strict_bind_call_and_apply_methods_on_functions: diag(
    6214,
    qt.DiagnosticCategory.Message,
    'Enable_strict_bind_call_and_apply_methods_on_functions_6214',
    "Enable strict 'bind', 'call', and 'apply' methods on functions."
  ),
  Using_compiler_options_of_project_reference_redirect_0: diag(
    6215,
    qt.DiagnosticCategory.Message,
    'Using_compiler_options_of_project_reference_redirect_0_6215',
    "Using compiler options of project reference redirect '{0}'."
  ),
  Found_1_error: diag(6216, qt.DiagnosticCategory.Message, 'Found_1_error_6216', 'Found 1 error.'),
  Found_0_errors: diag(6217, qt.DiagnosticCategory.Message, 'Found_0_errors_6217', 'Found {0} errors.'),
  Module_name_0_was_successfully_resolved_to_1_with_Package_ID_2: diag(
    6218,
    qt.DiagnosticCategory.Message,
    'Module_name_0_was_successfully_resolved_to_1_with_Package_ID_2_6218',
    "======== Module name '{0}' was successfully resolved to '{1}' with Package ID '{2}'. ========"
  ),
  Type_reference_directive_0_was_successfully_resolved_to_1_with_Package_ID_2_primary_Colon_3: diag(
    6219,
    qt.DiagnosticCategory.Message,
    'Type_reference_directive_0_was_successfully_resolved_to_1_with_Package_ID_2_primary_Colon_3_6219',
    "======== Type reference directive '{0}' was successfully resolved to '{1}' with Package ID '{2}', primary: {3}. ========"
  ),
  package_json_had_a_falsy_0_field: diag(6220, qt.DiagnosticCategory.Message, 'package_json_had_a_falsy_0_field_6220', "'package.json' had a falsy '{0}' field."),
  Disable_use_of_source_files_instead_of_declaration_files_from_referenced_projects: diag(
    6221,
    qt.DiagnosticCategory.Message,
    'Disable_use_of_source_files_instead_of_declaration_files_from_referenced_projects_6221',
    'Disable use of source files instead of declaration files from referenced projects.'
  ),
  Emit_class_fields_with_Define_instead_of_Set: diag(6222, qt.DiagnosticCategory.Message, 'Emit_class_fields_with_Define_instead_of_Set_6222', 'Emit class fields with Define instead of Set.'),
  Generates_a_CPU_profile: diag(6223, qt.DiagnosticCategory.Message, 'Generates_a_CPU_profile_6223', 'Generates a CPU profile.'),
  Disable_solution_searching_for_this_project: diag(6224, qt.DiagnosticCategory.Message, 'Disable_solution_searching_for_this_project_6224', 'Disable solution searching for this project.'),
  Specify_strategy_for_watching_file_Colon_FixedPollingInterval_default_PriorityPollingInterval_DynamicPriorityPolling_UseFsEvents_UseFsEventsOnParentDirectory: diag(
    6225,
    qt.DiagnosticCategory.Message,
    'Specify_strategy_for_watching_file_Colon_FixedPollingInterval_default_PriorityPollingInterval_Dynami_6225',
    "Specify strategy for watching file: 'FixedPollingInterval' (default), 'PriorityPollingInterval', 'DynamicPriorityPolling', 'UseFsEvents', 'UseFsEventsOnParentDirectory'."
  ),
  Specify_strategy_for_watching_directory_on_platforms_that_don_t_support_recursive_watching_natively_Colon_UseFsEvents_default_FixedPollingInterval_DynamicPriorityPolling: diag(
    6226,
    qt.DiagnosticCategory.Message,
    'Specify_strategy_for_watching_directory_on_platforms_that_don_t_support_recursive_watching_natively__6226',
    "Specify strategy for watching directory on platforms that don't support recursive watching natively: 'UseFsEvents' (default), 'FixedPollingInterval', 'DynamicPriorityPolling'."
  ),
  Specify_strategy_for_creating_a_polling_watch_when_it_fails_to_create_using_file_system_events_Colon_FixedInterval_default_PriorityInterval_DynamicPriority: diag(
    6227,
    qt.DiagnosticCategory.Message,
    'Specify_strategy_for_creating_a_polling_watch_when_it_fails_to_create_using_file_system_events_Colon_6227',
    "Specify strategy for creating a polling watch when it fails to create using file system events: 'FixedInterval' (default), 'PriorityInterval', 'DynamicPriority'."
  ),
  Synchronously_call_callbacks_and_update_the_state_of_directory_watchers_on_platforms_that_don_t_support_recursive_watching_natively: diag(
    6228,
    qt.DiagnosticCategory.Message,
    'Synchronously_call_callbacks_and_update_the_state_of_directory_watchers_on_platforms_that_don_t_supp_6228',
    "Synchronously call callbacks and update the state of directory watchers on platforms that don't support recursive watching natively."
  ),
  Tag_0_expects_at_least_1_arguments_but_the_JSX_factory_2_provides_at_most_3: diag(
    6229,
    qt.DiagnosticCategory.Error,
    'Tag_0_expects_at_least_1_arguments_but_the_JSX_factory_2_provides_at_most_3_6229',
    "Tag '{0}' expects at least '{1}' arguments, but the JSX factory '{2}' provides at most '{3}'."
  ),
  Option_0_can_only_be_specified_in_tsconfig_json_file_or_set_to_false_or_null_on_command_line: diag(
    6230,
    qt.DiagnosticCategory.Error,
    'Option_0_can_only_be_specified_in_tsconfig_json_file_or_set_to_false_or_null_on_command_line_6230',
    "Option '{0}' can only be specified in 'tsconfig.json' file or set to 'false' or 'null' on command line."
  ),
  Could_not_resolve_the_path_0_with_the_extensions_Colon_1: diag(
    6231,
    qt.DiagnosticCategory.Error,
    'Could_not_resolve_the_path_0_with_the_extensions_Colon_1_6231',
    "Could not resolve the path '{0}' with the extensions: {1}."
  ),
  Projects_to_reference: diag(6300, qt.DiagnosticCategory.Message, 'Projects_to_reference_6300', 'Projects to reference'),
  Enable_project_compilation: diag(6302, qt.DiagnosticCategory.Message, 'Enable_project_compilation_6302', 'Enable project compilation'),
  Composite_projects_may_not_disable_declaration_emit: diag(
    6304,
    qt.DiagnosticCategory.Error,
    'Composite_projects_may_not_disable_declaration_emit_6304',
    'Composite projects may not disable declaration emit.'
  ),
  Output_file_0_has_not_been_built_from_source_file_1: diag(
    6305,
    qt.DiagnosticCategory.Error,
    'Output_file_0_has_not_been_built_from_source_file_1_6305',
    "Output file '{0}' has not been built from source file '{1}'."
  ),
  Referenced_project_0_must_have_setting_composite_Colon_true: diag(
    6306,
    qt.DiagnosticCategory.Error,
    'Referenced_project_0_must_have_setting_composite_Colon_true_6306',
    'Referenced project \'{0}\' must have setting "composite": true.'
  ),
  File_0_is_not_listed_within_the_file_list_of_project_1_Projects_must_list_all_files_or_use_an_include_pattern: diag(
    6307,
    qt.DiagnosticCategory.Error,
    'File_0_is_not_listed_within_the_file_list_of_project_1_Projects_must_list_all_files_or_use_an_includ_6307',
    "File '{0}' is not listed within the file list of project '{1}'. Projects must list all files or use an 'include' pattern."
  ),
  Cannot_prepend_project_0_because_it_does_not_have_outFile_set: diag(
    6308,
    qt.DiagnosticCategory.Error,
    'Cannot_prepend_project_0_because_it_does_not_have_outFile_set_6308',
    "Cannot prepend project '{0}' because it does not have 'outFile' set"
  ),
  Output_file_0_from_project_1_does_not_exist: diag(6309, qt.DiagnosticCategory.Error, 'Output_file_0_from_project_1_does_not_exist_6309', "Output file '{0}' from project '{1}' does not exist"),
  Project_0_is_out_of_date_because_oldest_output_1_is_older_than_newest_input_2: diag(
    6350,
    qt.DiagnosticCategory.Message,
    'Project_0_is_out_of_date_because_oldest_output_1_is_older_than_newest_input_2_6350',
    "Project '{0}' is out of date because oldest output '{1}' is older than newest input '{2}'"
  ),
  Project_0_is_up_to_date_because_newest_input_1_is_older_than_oldest_output_2: diag(
    6351,
    qt.DiagnosticCategory.Message,
    'Project_0_is_up_to_date_because_newest_input_1_is_older_than_oldest_output_2_6351',
    "Project '{0}' is up to date because newest input '{1}' is older than oldest output '{2}'"
  ),
  Project_0_is_out_of_date_because_output_file_1_does_not_exist: diag(
    6352,
    qt.DiagnosticCategory.Message,
    'Project_0_is_out_of_date_because_output_file_1_does_not_exist_6352',
    "Project '{0}' is out of date because output file '{1}' does not exist"
  ),
  Project_0_is_out_of_date_because_its_dependency_1_is_out_of_date: diag(
    6353,
    qt.DiagnosticCategory.Message,
    'Project_0_is_out_of_date_because_its_dependency_1_is_out_of_date_6353',
    "Project '{0}' is out of date because its dependency '{1}' is out of date"
  ),
  Project_0_is_up_to_date_with_d_ts_files_from_its_dependencies: diag(
    6354,
    qt.DiagnosticCategory.Message,
    'Project_0_is_up_to_date_with_d_ts_files_from_its_dependencies_6354',
    "Project '{0}' is up to date with .d.ts files from its dependencies"
  ),
  Projects_in_this_build_Colon_0: diag(6355, qt.DiagnosticCategory.Message, 'Projects_in_this_build_Colon_0_6355', 'Projects in this build: {0}'),
  A_non_dry_build_would_delete_the_following_files_Colon_0: diag(
    6356,
    qt.DiagnosticCategory.Message,
    'A_non_dry_build_would_delete_the_following_files_Colon_0_6356',
    'A non-dry build would delete the following files: {0}'
  ),
  A_non_dry_build_would_build_project_0: diag(6357, qt.DiagnosticCategory.Message, 'A_non_dry_build_would_build_project_0_6357', "A non-dry build would build project '{0}'"),
  Building_project_0: diag(6358, qt.DiagnosticCategory.Message, 'Building_project_0_6358', "Building project '{0}'..."),
  Updating_output_timestamps_of_project_0: diag(6359, qt.DiagnosticCategory.Message, 'Updating_output_timestamps_of_project_0_6359', "Updating output timestamps of project '{0}'..."),
  delete_this_Project_0_is_up_to_date_because_it_was_previously_built: diag(
    6360,
    qt.DiagnosticCategory.Message,
    'delete_this_Project_0_is_up_to_date_because_it_was_previously_built_6360',
    "delete this - Project '{0}' is up to date because it was previously built"
  ),
  Project_0_is_up_to_date: diag(6361, qt.DiagnosticCategory.Message, 'Project_0_is_up_to_date_6361', "Project '{0}' is up to date"),
  Skipping_build_of_project_0_because_its_dependency_1_has_errors: diag(
    6362,
    qt.DiagnosticCategory.Message,
    'Skipping_build_of_project_0_because_its_dependency_1_has_errors_6362',
    "Skipping build of project '{0}' because its dependency '{1}' has errors"
  ),
  Project_0_can_t_be_built_because_its_dependency_1_has_errors: diag(
    6363,
    qt.DiagnosticCategory.Message,
    'Project_0_can_t_be_built_because_its_dependency_1_has_errors_6363',
    "Project '{0}' can't be built because its dependency '{1}' has errors"
  ),
  Build_one_or_more_projects_and_their_dependencies_if_out_of_date: diag(
    6364,
    qt.DiagnosticCategory.Message,
    'Build_one_or_more_projects_and_their_dependencies_if_out_of_date_6364',
    'Build one or more projects and their dependencies, if out of date'
  ),
  Delete_the_outputs_of_all_projects: diag(6365, qt.DiagnosticCategory.Message, 'Delete_the_outputs_of_all_projects_6365', 'Delete the outputs of all projects'),
  Enable_verbose_logging: diag(6366, qt.DiagnosticCategory.Message, 'Enable_verbose_logging_6366', 'Enable verbose logging'),
  Show_what_would_be_built_or_deleted_if_specified_with_clean: diag(
    6367,
    qt.DiagnosticCategory.Message,
    'Show_what_would_be_built_or_deleted_if_specified_with_clean_6367',
    "Show what would be built (or deleted, if specified with '--clean')"
  ),
  Build_all_projects_including_those_that_appear_to_be_up_to_date: diag(
    6368,
    qt.DiagnosticCategory.Message,
    'Build_all_projects_including_those_that_appear_to_be_up_to_date_6368',
    'Build all projects, including those that appear to be up to date'
  ),
  Option_build_must_be_the_first_command_line_argument: diag(
    6369,
    qt.DiagnosticCategory.Error,
    'Option_build_must_be_the_first_command_line_argument_6369',
    "Option '--build' must be the first command line argument."
  ),
  Options_0_and_1_cannot_be_combined: diag(6370, qt.DiagnosticCategory.Error, 'Options_0_and_1_cannot_be_combined_6370', "Options '{0}' and '{1}' cannot be combined."),
  Updating_unchanged_output_timestamps_of_project_0: diag(
    6371,
    qt.DiagnosticCategory.Message,
    'Updating_unchanged_output_timestamps_of_project_0_6371',
    "Updating unchanged output timestamps of project '{0}'..."
  ),
  Project_0_is_out_of_date_because_output_of_its_dependency_1_has_changed: diag(
    6372,
    qt.DiagnosticCategory.Message,
    'Project_0_is_out_of_date_because_output_of_its_dependency_1_has_changed_6372',
    "Project '{0}' is out of date because output of its dependency '{1}' has changed"
  ),
  Updating_output_of_project_0: diag(6373, qt.DiagnosticCategory.Message, 'Updating_output_of_project_0_6373', "Updating output of project '{0}'..."),
  A_non_dry_build_would_update_timestamps_for_output_of_project_0: diag(
    6374,
    qt.DiagnosticCategory.Message,
    'A_non_dry_build_would_update_timestamps_for_output_of_project_0_6374',
    "A non-dry build would update timestamps for output of project '{0}'"
  ),
  A_non_dry_build_would_update_output_of_project_0: diag(
    6375,
    qt.DiagnosticCategory.Message,
    'A_non_dry_build_would_update_output_of_project_0_6375',
    "A non-dry build would update output of project '{0}'"
  ),
  Cannot_update_output_of_project_0_because_there_was_error_reading_file_1: diag(
    6376,
    qt.DiagnosticCategory.Message,
    'Cannot_update_output_of_project_0_because_there_was_error_reading_file_1_6376',
    "Cannot update output of project '{0}' because there was error reading file '{1}'"
  ),
  Cannot_write_file_0_because_it_will_overwrite_tsbuildinfo_file_generated_by_referenced_project_1: diag(
    6377,
    qt.DiagnosticCategory.Error,
    'Cannot_write_file_0_because_it_will_overwrite_tsbuildinfo_file_generated_by_referenced_project_1_6377',
    "Cannot write file '{0}' because it will overwrite '.tsbuildinfo' file generated by referenced project '{1}'"
  ),
  Enable_incremental_compilation: diag(6378, qt.DiagnosticCategory.Message, 'Enable_incremental_compilation_6378', 'Enable incremental compilation'),
  Composite_projects_may_not_disable_incremental_compilation: diag(
    6379,
    qt.DiagnosticCategory.Error,
    'Composite_projects_may_not_disable_incremental_compilation_6379',
    'Composite projects may not disable incremental compilation.'
  ),
  Specify_file_to_store_incremental_compilation_information: diag(
    6380,
    qt.DiagnosticCategory.Message,
    'Specify_file_to_store_incremental_compilation_information_6380',
    'Specify file to store incremental compilation information'
  ),
  Project_0_is_out_of_date_because_output_for_it_was_generated_with_version_1_that_differs_with_current_version_2: diag(
    6381,
    qt.DiagnosticCategory.Message,
    'Project_0_is_out_of_date_because_output_for_it_was_generated_with_version_1_that_differs_with_curren_6381',
    "Project '{0}' is out of date because output for it was generated with version '{1}' that differs with current version '{2}'"
  ),
  Skipping_build_of_project_0_because_its_dependency_1_was_not_built: diag(
    6382,
    qt.DiagnosticCategory.Message,
    'Skipping_build_of_project_0_because_its_dependency_1_was_not_built_6382',
    "Skipping build of project '{0}' because its dependency '{1}' was not built"
  ),
  Project_0_can_t_be_built_because_its_dependency_1_was_not_built: diag(
    6383,
    qt.DiagnosticCategory.Message,
    'Project_0_can_t_be_built_because_its_dependency_1_was_not_built_6383',
    "Project '{0}' can't be built because its dependency '{1}' was not built"
  ),
  Have_recompiles_in_incremental_and_watch_assume_that_changes_within_a_file_will_only_affect_files_directly_depending_on_it: diag(
    6384,
    qt.DiagnosticCategory.Message,
    'Have_recompiles_in_incremental_and_watch_assume_that_changes_within_a_file_will_only_affect_files_di_6384',
    "Have recompiles in '--incremental' and '--watch' assume that changes within a file will only affect files directly depending on it."
  ),
  The_expected_type_comes_from_property_0_which_is_declared_here_on_type_1: diag(
    6500,
    qt.DiagnosticCategory.Message,
    'The_expected_type_comes_from_property_0_which_is_declared_here_on_type_1_6500',
    "The expected type comes from property '{0}' which is declared here on type '{1}'"
  ),
  The_expected_type_comes_from_this_index_signature: diag(
    6501,
    qt.DiagnosticCategory.Message,
    'The_expected_type_comes_from_this_index_signature_6501',
    'The expected type comes from this index signature.'
  ),
  The_expected_type_comes_from_the_return_type_of_this_signature: diag(
    6502,
    qt.DiagnosticCategory.Message,
    'The_expected_type_comes_from_the_return_type_of_this_signature_6502',
    'The expected type comes from the return type of this signature.'
  ),
  Print_names_of_files_that_are_part_of_the_compilation_and_then_stop_processing: diag(
    6503,
    qt.DiagnosticCategory.Message,
    'Print_names_of_files_that_are_part_of_the_compilation_and_then_stop_processing_6503',
    'Print names of files that are part of the compilation and then stop processing.'
  ),
  File_0_is_a_JavaScript_file_Did_you_mean_to_enable_the_allowJs_option: diag(
    6504,
    qt.DiagnosticCategory.Error,
    'File_0_is_a_JavaScript_file_Did_you_mean_to_enable_the_allowJs_option_6504',
    "File '{0}' is a JavaScript file. Did you mean to enable the 'allowJs' option?"
  ),
  Variable_0_implicitly_has_an_1_type: diag(7005, qt.DiagnosticCategory.Error, 'Variable_0_implicitly_has_an_1_type_7005', "Variable '{0}' implicitly has an '{1}' type."),
  Parameter_0_implicitly_has_an_1_type: diag(7006, qt.DiagnosticCategory.Error, 'Parameter_0_implicitly_has_an_1_type_7006', "Parameter '{0}' implicitly has an '{1}' type."),
  Member_0_implicitly_has_an_1_type: diag(7008, qt.DiagnosticCategory.Error, 'Member_0_implicitly_has_an_1_type_7008', "Member '{0}' implicitly has an '{1}' type."),
  new_expression_whose_target_lacks_a_construct_signature_implicitly_has_an_any_type: diag(
    7009,
    qt.DiagnosticCategory.Error,
    'new_expression_whose_target_lacks_a_construct_signature_implicitly_has_an_any_type_7009',
    "'new' expression, whose target lacks a construct signature, implicitly has an 'any' type."
  ),
  _0_which_lacks_return_type_annotation_implicitly_has_an_1_return_type: diag(
    7010,
    qt.DiagnosticCategory.Error,
    '_0_which_lacks_return_type_annotation_implicitly_has_an_1_return_type_7010',
    "'{0}', which lacks return-type annotation, implicitly has an '{1}' return type."
  ),
  Function_expression_which_lacks_return_type_annotation_implicitly_has_an_0_return_type: diag(
    7011,
    qt.DiagnosticCategory.Error,
    'Function_expression_which_lacks_return_type_annotation_implicitly_has_an_0_return_type_7011',
    "Function expression, which lacks return-type annotation, implicitly has an '{0}' return type."
  ),
  Construct_signature_which_lacks_return_type_annotation_implicitly_has_an_any_return_type: diag(
    7013,
    qt.DiagnosticCategory.Error,
    'Construct_signature_which_lacks_return_type_annotation_implicitly_has_an_any_return_type_7013',
    "Construct signature, which lacks return-type annotation, implicitly has an 'any' return type."
  ),
  Function_type_which_lacks_return_type_annotation_implicitly_has_an_0_return_type: diag(
    7014,
    qt.DiagnosticCategory.Error,
    'Function_type_which_lacks_return_type_annotation_implicitly_has_an_0_return_type_7014',
    "Function type, which lacks return-type annotation, implicitly has an '{0}' return type."
  ),
  Element_implicitly_has_an_any_type_because_index_expression_is_not_of_type_number: diag(
    7015,
    qt.DiagnosticCategory.Error,
    'Element_implicitly_has_an_any_type_because_index_expression_is_not_of_type_number_7015',
    "Element implicitly has an 'any' type because index expression is not of type 'number'."
  ),
  Could_not_find_a_declaration_file_for_module_0_1_implicitly_has_an_any_type: diag(
    7016,
    qt.DiagnosticCategory.Error,
    'Could_not_find_a_declaration_file_for_module_0_1_implicitly_has_an_any_type_7016',
    "Could not find a declaration file for module '{0}'. '{1}' implicitly has an 'any' type."
  ),
  Element_implicitly_has_an_any_type_because_type_0_has_no_index_signature: diag(
    7017,
    qt.DiagnosticCategory.Error,
    'Element_implicitly_has_an_any_type_because_type_0_has_no_index_signature_7017',
    "Element implicitly has an 'any' type because type '{0}' has no index signature."
  ),
  Object_literal_s_property_0_implicitly_has_an_1_type: diag(
    7018,
    qt.DiagnosticCategory.Error,
    'Object_literal_s_property_0_implicitly_has_an_1_type_7018',
    "Object literal's property '{0}' implicitly has an '{1}' type."
  ),
  Rest_parameter_0_implicitly_has_an_any_type: diag(7019, qt.DiagnosticCategory.Error, 'Rest_parameter_0_implicitly_has_an_any_type_7019', "Rest parameter '{0}' implicitly has an 'any[]' type."),
  Call_signature_which_lacks_return_type_annotation_implicitly_has_an_any_return_type: diag(
    7020,
    qt.DiagnosticCategory.Error,
    'Call_signature_which_lacks_return_type_annotation_implicitly_has_an_any_return_type_7020',
    "Call signature, which lacks return-type annotation, implicitly has an 'any' return type."
  ),
  _0_implicitly_has_type_any_because_it_does_not_have_a_type_annotation_and_is_referenced_directly_or_indirectly_in_its_own_initializer: diag(
    7022,
    qt.DiagnosticCategory.Error,
    '_0_implicitly_has_type_any_because_it_does_not_have_a_type_annotation_and_is_referenced_directly_or__7022',
    "'{0}' implicitly has type 'any' because it does not have a type annotation and is referenced directly or indirectly in its own initializer."
  ),
  _0_implicitly_has_return_type_any_because_it_does_not_have_a_return_type_annotation_and_is_referenced_directly_or_indirectly_in_one_of_its_return_expressions: diag(
    7023,
    qt.DiagnosticCategory.Error,
    '_0_implicitly_has_return_type_any_because_it_does_not_have_a_return_type_annotation_and_is_reference_7023',
    "'{0}' implicitly has return type 'any' because it does not have a return type annotation and is referenced directly or indirectly in one of its return expressions."
  ),
  Function_implicitly_has_return_type_any_because_it_does_not_have_a_return_type_annotation_and_is_referenced_directly_or_indirectly_in_one_of_its_return_expressions: diag(
    7024,
    qt.DiagnosticCategory.Error,
    'Function_implicitly_has_return_type_any_because_it_does_not_have_a_return_type_annotation_and_is_ref_7024',
    "Function implicitly has return type 'any' because it does not have a return type annotation and is referenced directly or indirectly in one of its return expressions."
  ),
  Generator_implicitly_has_yield_type_0_because_it_does_not_yield_any_values_Consider_supplying_a_return_type_annotation: diag(
    7025,
    qt.DiagnosticCategory.Error,
    'Generator_implicitly_has_yield_type_0_because_it_does_not_yield_any_values_Consider_supplying_a_retu_7025',
    "Generator implicitly has yield type '{0}' because it does not yield any values. Consider supplying a return type annotation."
  ),
  JSX_element_implicitly_has_type_any_because_no_interface_JSX_0_exists: diag(
    7026,
    qt.DiagnosticCategory.Error,
    'JSX_element_implicitly_has_type_any_because_no_interface_JSX_0_exists_7026',
    "JSX element implicitly has type 'any' because no interface 'JSX.{0}' exists."
  ),
  Unreachable_code_detected: diag(7027, qt.DiagnosticCategory.Error, 'Unreachable_code_detected_7027', 'Unreachable code detected.', /*reportsUnnecessary*/ true),
  Unused_label: diag(7028, qt.DiagnosticCategory.Error, 'Unused_label_7028', 'Unused label.', /*reportsUnnecessary*/ true),
  Fallthrough_case_in_switch: diag(7029, qt.DiagnosticCategory.Error, 'Fallthrough_case_in_switch_7029', 'Fallthrough case in switch.'),
  Not_all_code_paths_return_a_value: diag(7030, qt.DiagnosticCategory.Error, 'Not_all_code_paths_return_a_value_7030', 'Not all code paths return a value.'),
  Binding_element_0_implicitly_has_an_1_type: diag(7031, qt.DiagnosticCategory.Error, 'Binding_element_0_implicitly_has_an_1_type_7031', "Binding element '{0}' implicitly has an '{1}' type."),
  Property_0_implicitly_has_type_any_because_its_set_accessor_lacks_a_parameter_type_annotation: diag(
    7032,
    qt.DiagnosticCategory.Error,
    'Property_0_implicitly_has_type_any_because_its_set_accessor_lacks_a_parameter_type_annotation_7032',
    "Property '{0}' implicitly has type 'any', because its set accessor lacks a parameter type annotation."
  ),
  Property_0_implicitly_has_type_any_because_its_get_accessor_lacks_a_return_type_annotation: diag(
    7033,
    qt.DiagnosticCategory.Error,
    'Property_0_implicitly_has_type_any_because_its_get_accessor_lacks_a_return_type_annotation_7033',
    "Property '{0}' implicitly has type 'any', because its get accessor lacks a return type annotation."
  ),
  Variable_0_implicitly_has_type_1_in_some_locations_where_its_type_cannot_be_determined: diag(
    7034,
    qt.DiagnosticCategory.Error,
    'Variable_0_implicitly_has_type_1_in_some_locations_where_its_type_cannot_be_determined_7034',
    "Variable '{0}' implicitly has type '{1}' in some locations where its type cannot be determined."
  ),
  Try_npm_install_types_Slash_1_if_it_exists_or_add_a_new_declaration_d_ts_file_containing_declare_module_0: diag(
    7035,
    qt.DiagnosticCategory.Error,
    'Try_npm_install_types_Slash_1_if_it_exists_or_add_a_new_declaration_d_ts_file_containing_declare_mod_7035',
    "Try `npm install @types/{1}` if it exists or add a new declaration (.d.ts) file containing `declare module '{0}';`"
  ),
  Dynamic_import_s_specifier_must_be_of_type_string_but_here_has_type_0: diag(
    7036,
    qt.DiagnosticCategory.Error,
    'Dynamic_import_s_specifier_must_be_of_type_string_but_here_has_type_0_7036',
    "Dynamic import's specifier must be of type 'string', but here has type '{0}'."
  ),
  Enables_emit_interoperability_between_CommonJS_and_ES_Modules_via_creation_of_namespace_objects_for_all_imports_Implies_allowSyntheticDefaultImports: diag(
    7037,
    qt.DiagnosticCategory.Message,
    'Enables_emit_interoperability_between_CommonJS_and_ES_Modules_via_creation_of_namespace_objects_for__7037',
    "Enables emit interoperability between CommonJS and ES Modules via creation of namespace objects for all imports. Implies 'allowSyntheticDefaultImports'."
  ),
  Type_originates_at_this_import_A_namespace_style_import_cannot_be_called_or_constructed_and_will_cause_a_failure_at_runtime_Consider_using_a_default_import_or_import_require_here_instead: diag(
    7038,
    qt.DiagnosticCategory.Message,
    'Type_originates_at_this_import_A_namespace_style_import_cannot_be_called_or_constructed_and_will_cau_7038',
    'Type originates at this import. A namespace-style import cannot be called or constructed, and will cause a failure at runtime. Consider using a default import or import require here instead.'
  ),
  Mapped_object_type_implicitly_has_an_any_template_type: diag(
    7039,
    qt.DiagnosticCategory.Error,
    'Mapped_object_type_implicitly_has_an_any_template_type_7039',
    "Mapped object type implicitly has an 'any' template type."
  ),
  If_the_0_package_actually_exposes_this_module_consider_sending_a_pull_request_to_amend_https_Colon_Slash_Slashgithub_com_SlashDefinitelyTyped_SlashDefinitelyTyped_Slashtree_Slashmaster_Slashtypes_Slash_1: diag(
    7040,
    qt.DiagnosticCategory.Error,
    'If_the_0_package_actually_exposes_this_module_consider_sending_a_pull_request_to_amend_https_Colon_S_7040',
    "If the '{0}' package actually exposes this module, consider sending a pull request to amend 'https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/{1}`"
  ),
  The_containing_arrow_function_captures_the_global_value_of_this: diag(
    7041,
    qt.DiagnosticCategory.Error,
    'The_containing_arrow_function_captures_the_global_value_of_this_7041',
    "The containing arrow function captures the global value of 'this'."
  ),
  Module_0_was_resolved_to_1_but_resolveJsonModule_is_not_used: diag(
    7042,
    qt.DiagnosticCategory.Error,
    'Module_0_was_resolved_to_1_but_resolveJsonModule_is_not_used_7042',
    "Module '{0}' was resolved to '{1}', but '--resolveJsonModule' is not used."
  ),
  Variable_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage: diag(
    7043,
    qt.DiagnosticCategory.Suggestion,
    'Variable_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage_7043',
    "Variable '{0}' implicitly has an '{1}' type, but a better type may be inferred from usage."
  ),
  Parameter_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage: diag(
    7044,
    qt.DiagnosticCategory.Suggestion,
    'Parameter_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage_7044',
    "Parameter '{0}' implicitly has an '{1}' type, but a better type may be inferred from usage."
  ),
  Member_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage: diag(
    7045,
    qt.DiagnosticCategory.Suggestion,
    'Member_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage_7045',
    "Member '{0}' implicitly has an '{1}' type, but a better type may be inferred from usage."
  ),
  Variable_0_implicitly_has_type_1_in_some_locations_but_a_better_type_may_be_inferred_from_usage: diag(
    7046,
    qt.DiagnosticCategory.Suggestion,
    'Variable_0_implicitly_has_type_1_in_some_locations_but_a_better_type_may_be_inferred_from_usage_7046',
    "Variable '{0}' implicitly has type '{1}' in some locations, but a better type may be inferred from usage."
  ),
  Rest_parameter_0_implicitly_has_an_any_type_but_a_better_type_may_be_inferred_from_usage: diag(
    7047,
    qt.DiagnosticCategory.Suggestion,
    'Rest_parameter_0_implicitly_has_an_any_type_but_a_better_type_may_be_inferred_from_usage_7047',
    "Rest parameter '{0}' implicitly has an 'any[]' type, but a better type may be inferred from usage."
  ),
  Property_0_implicitly_has_type_any_but_a_better_type_for_its_get_accessor_may_be_inferred_from_usage: diag(
    7048,
    qt.DiagnosticCategory.Suggestion,
    'Property_0_implicitly_has_type_any_but_a_better_type_for_its_get_accessor_may_be_inferred_from_usage_7048',
    "Property '{0}' implicitly has type 'any', but a better type for its get accessor may be inferred from usage."
  ),
  Property_0_implicitly_has_type_any_but_a_better_type_for_its_set_accessor_may_be_inferred_from_usage: diag(
    7049,
    qt.DiagnosticCategory.Suggestion,
    'Property_0_implicitly_has_type_any_but_a_better_type_for_its_set_accessor_may_be_inferred_from_usage_7049',
    "Property '{0}' implicitly has type 'any', but a better type for its set accessor may be inferred from usage."
  ),
  _0_implicitly_has_an_1_return_type_but_a_better_type_may_be_inferred_from_usage: diag(
    7050,
    qt.DiagnosticCategory.Suggestion,
    '_0_implicitly_has_an_1_return_type_but_a_better_type_may_be_inferred_from_usage_7050',
    "'{0}' implicitly has an '{1}' return type, but a better type may be inferred from usage."
  ),
  Parameter_has_a_name_but_no_type_Did_you_mean_0_Colon_1: diag(
    7051,
    qt.DiagnosticCategory.Error,
    'Parameter_has_a_name_but_no_type_Did_you_mean_0_Colon_1_7051',
    "Parameter has a name but no type. Did you mean '{0}: {1}'?"
  ),
  Element_implicitly_has_an_any_type_because_type_0_has_no_index_signature_Did_you_mean_to_call_1: diag(
    7052,
    qt.DiagnosticCategory.Error,
    'Element_implicitly_has_an_any_type_because_type_0_has_no_index_signature_Did_you_mean_to_call_1_7052',
    "Element implicitly has an 'any' type because type '{0}' has no index signature. Did you mean to call '{1}'?"
  ),
  Element_implicitly_has_an_any_type_because_expression_of_type_0_can_t_be_used_to_index_type_1: diag(
    7053,
    qt.DiagnosticCategory.Error,
    'Element_implicitly_has_an_any_type_because_expression_of_type_0_can_t_be_used_to_index_type_1_7053',
    "Element implicitly has an 'any' type because expression of type '{0}' can't be used to index type '{1}'."
  ),
  No_index_signature_with_a_parameter_of_type_0_was_found_on_type_1: diag(
    7054,
    qt.DiagnosticCategory.Error,
    'No_index_signature_with_a_parameter_of_type_0_was_found_on_type_1_7054',
    "No index signature with a parameter of type '{0}' was found on type '{1}'."
  ),
  _0_which_lacks_return_type_annotation_implicitly_has_an_1_yield_type: diag(
    7055,
    qt.DiagnosticCategory.Error,
    '_0_which_lacks_return_type_annotation_implicitly_has_an_1_yield_type_7055',
    "'{0}', which lacks return-type annotation, implicitly has an '{1}' yield type."
  ),
  You_cannot_rename_this_element: diag(8000, qt.DiagnosticCategory.Error, 'You_cannot_rename_this_element_8000', 'You cannot rename this element.'),
  You_cannot_rename_elements_that_are_defined_in_the_standard_TypeScript_library: diag(
    8001,
    qt.DiagnosticCategory.Error,
    'You_cannot_rename_elements_that_are_defined_in_the_standard_TypeScript_library_8001',
    'You cannot rename elements that are defined in the standard TypeScript library.'
  ),
  import_can_only_be_used_in_TypeScript_files: diag(8002, qt.DiagnosticCategory.Error, 'import_can_only_be_used_in_TypeScript_files_8002', "'import ... =' can only be used in TypeScript files."),
  export_can_only_be_used_in_TypeScript_files: diag(8003, qt.DiagnosticCategory.Error, 'export_can_only_be_used_in_TypeScript_files_8003', "'export =' can only be used in TypeScript files."),
  Type_parameter_declarations_can_only_be_used_in_TypeScript_files: diag(
    8004,
    qt.DiagnosticCategory.Error,
    'Type_parameter_declarations_can_only_be_used_in_TypeScript_files_8004',
    'Type parameter declarations can only be used in TypeScript files.'
  ),
  implements_clauses_can_only_be_used_in_TypeScript_files: diag(
    8005,
    qt.DiagnosticCategory.Error,
    'implements_clauses_can_only_be_used_in_TypeScript_files_8005',
    "'implements' clauses can only be used in TypeScript files."
  ),
  _0_declarations_can_only_be_used_in_TypeScript_files: diag(
    8006,
    qt.DiagnosticCategory.Error,
    '_0_declarations_can_only_be_used_in_TypeScript_files_8006',
    "'{0}' declarations can only be used in TypeScript files."
  ),
  Type_aliases_can_only_be_used_in_TypeScript_files: diag(
    8008,
    qt.DiagnosticCategory.Error,
    'Type_aliases_can_only_be_used_in_TypeScript_files_8008',
    'Type aliases can only be used in TypeScript files.'
  ),
  The_0_modifier_can_only_be_used_in_TypeScript_files: diag(
    8009,
    qt.DiagnosticCategory.Error,
    'The_0_modifier_can_only_be_used_in_TypeScript_files_8009',
    "The '{0}' modifier can only be used in TypeScript files."
  ),
  Type_annotations_can_only_be_used_in_TypeScript_files: diag(
    8010,
    qt.DiagnosticCategory.Error,
    'Type_annotations_can_only_be_used_in_TypeScript_files_8010',
    'Type annotations can only be used in TypeScript files.'
  ),
  Type_arguments_can_only_be_used_in_TypeScript_files: diag(
    8011,
    qt.DiagnosticCategory.Error,
    'Type_arguments_can_only_be_used_in_TypeScript_files_8011',
    'Type arguments can only be used in TypeScript files.'
  ),
  Parameter_modifiers_can_only_be_used_in_TypeScript_files: diag(
    8012,
    qt.DiagnosticCategory.Error,
    'Parameter_modifiers_can_only_be_used_in_TypeScript_files_8012',
    'Parameter modifiers can only be used in TypeScript files.'
  ),
  Non_null_assertions_can_only_be_used_in_TypeScript_files: diag(
    8013,
    qt.DiagnosticCategory.Error,
    'Non_null_assertions_can_only_be_used_in_TypeScript_files_8013',
    'Non-null assertions can only be used in TypeScript files.'
  ),
  Type_assertion_expressions_can_only_be_used_in_TypeScript_files: diag(
    8016,
    qt.DiagnosticCategory.Error,
    'Type_assertion_expressions_can_only_be_used_in_TypeScript_files_8016',
    'Type assertion expressions can only be used in TypeScript files.'
  ),
  Octal_literal_types_must_use_ES2015_syntax_Use_the_syntax_0: diag(
    8017,
    qt.DiagnosticCategory.Error,
    'Octal_literal_types_must_use_ES2015_syntax_Use_the_syntax_0_8017',
    "Octal literal types must use ES2015 syntax. Use the syntax '{0}'."
  ),
  Octal_literals_are_not_allowed_in_enums_members_initializer_Use_the_syntax_0: diag(
    8018,
    qt.DiagnosticCategory.Error,
    'Octal_literals_are_not_allowed_in_enums_members_initializer_Use_the_syntax_0_8018',
    "Octal literals are not allowed in enums members initializer. Use the syntax '{0}'."
  ),
  Report_errors_in_js_files: diag(8019, qt.DiagnosticCategory.Message, 'Report_errors_in_js_files_8019', 'Report errors in .js files.'),
  JSDoc_types_can_only_be_used_inside_documentation_comments: diag(
    8020,
    qt.DiagnosticCategory.Error,
    'JSDoc_types_can_only_be_used_inside_documentation_comments_8020',
    'JSDoc types can only be used inside documentation comments.'
  ),
  JSDoc_typedef_tag_should_either_have_a_type_annotation_or_be_followed_by_property_or_member_tags: diag(
    8021,
    qt.DiagnosticCategory.Error,
    'JSDoc_typedef_tag_should_either_have_a_type_annotation_or_be_followed_by_property_or_member_tags_8021',
    "JSDoc '@typedef' tag should either have a type annotation or be followed by '@property' or '@member' tags."
  ),
  JSDoc_0_is_not_attached_to_a_class: diag(8022, qt.DiagnosticCategory.Error, 'JSDoc_0_is_not_attached_to_a_class_8022', "JSDoc '@{0}' is not attached to a class."),
  JSDoc_0_1_does_not_match_the_extends_2_clause: diag(
    8023,
    qt.DiagnosticCategory.Error,
    'JSDoc_0_1_does_not_match_the_extends_2_clause_8023',
    "JSDoc '@{0} {1}' does not match the 'extends {2}' clause."
  ),
  JSDoc_param_tag_has_name_0_but_there_is_no_parameter_with_that_name: diag(
    8024,
    qt.DiagnosticCategory.Error,
    'JSDoc_param_tag_has_name_0_but_there_is_no_parameter_with_that_name_8024',
    "JSDoc '@param' tag has name '{0}', but there is no parameter with that name."
  ),
  Class_declarations_cannot_have_more_than_one_augments_or_extends_tag: diag(
    8025,
    qt.DiagnosticCategory.Error,
    'Class_declarations_cannot_have_more_than_one_augments_or_extends_tag_8025',
    'Class declarations cannot have more than one `@augments` or `@extends` tag.'
  ),
  Expected_0_type_arguments_provide_these_with_an_extends_tag: diag(
    8026,
    qt.DiagnosticCategory.Error,
    'Expected_0_type_arguments_provide_these_with_an_extends_tag_8026',
    "Expected {0} type arguments; provide these with an '@extends' tag."
  ),
  Expected_0_1_type_arguments_provide_these_with_an_extends_tag: diag(
    8027,
    qt.DiagnosticCategory.Error,
    'Expected_0_1_type_arguments_provide_these_with_an_extends_tag_8027',
    "Expected {0}-{1} type arguments; provide these with an '@extends' tag."
  ),
  JSDoc_may_only_appear_in_the_last_parameter_of_a_signature: diag(
    8028,
    qt.DiagnosticCategory.Error,
    'JSDoc_may_only_appear_in_the_last_parameter_of_a_signature_8028',
    "JSDoc '...' may only appear in the last parameter of a signature."
  ),
  JSDoc_param_tag_has_name_0_but_there_is_no_parameter_with_that_name_It_would_match_arguments_if_it_had_an_array_type: diag(
    8029,
    qt.DiagnosticCategory.Error,
    'JSDoc_param_tag_has_name_0_but_there_is_no_parameter_with_that_name_It_would_match_arguments_if_it_h_8029',
    "JSDoc '@param' tag has name '{0}', but there is no parameter with that name. It would match 'arguments' if it had an array type."
  ),
  The_type_of_a_function_declaration_must_match_the_function_s_signature: diag(
    8030,
    qt.DiagnosticCategory.Error,
    'The_type_of_a_function_declaration_must_match_the_function_s_signature_8030',
    "The type of a function declaration must match the function's signature."
  ),
  You_cannot_rename_a_module_via_a_global_import: diag(8031, qt.DiagnosticCategory.Error, 'You_cannot_rename_a_module_via_a_global_import_8031', 'You cannot rename a module via a global import.'),
  Qualified_name_0_is_not_allowed_without_a_leading_param_object_1: diag(
    8032,
    qt.DiagnosticCategory.Error,
    'Qualified_name_0_is_not_allowed_without_a_leading_param_object_1_8032',
    "Qualified name '{0}' is not allowed without a leading '@param {object} {1}'."
  ),
  Only_identifiers_Slashqualified_names_with_optional_type_arguments_are_currently_supported_in_a_class_extends_clause: diag(
    9002,
    qt.DiagnosticCategory.Error,
    'Only_identifiers_Slashqualified_names_with_optional_type_arguments_are_currently_supported_in_a_clas_9002',
    "Only identifiers/qualified-names with optional type arguments are currently supported in a class 'extends' clause."
  ),
  class_expressions_are_not_currently_supported: diag(9003, qt.DiagnosticCategory.Error, 'class_expressions_are_not_currently_supported_9003', "'class' expressions are not currently supported."),
  Language_service_is_disabled: diag(9004, qt.DiagnosticCategory.Error, 'Language_service_is_disabled_9004', 'Language service is disabled.'),
  Declaration_emit_for_this_file_requires_using_private_name_0_An_explicit_type_annotation_may_unblock_declaration_emit: diag(
    9005,
    qt.DiagnosticCategory.Error,
    'Declaration_emit_for_this_file_requires_using_private_name_0_An_explicit_type_annotation_may_unblock_9005',
    "Declaration emit for this file requires using private name '{0}'. An explicit type annotation may unblock declaration emit."
  ),
  Declaration_emit_for_this_file_requires_using_private_name_0_from_module_1_An_explicit_type_annotation_may_unblock_declaration_emit: diag(
    9006,
    qt.DiagnosticCategory.Error,
    'Declaration_emit_for_this_file_requires_using_private_name_0_from_module_1_An_explicit_type_annotati_9006',
    "Declaration emit for this file requires using private name '{0}' from module '{1}'. An explicit type annotation may unblock declaration emit."
  ),
  JSX_attributes_must_only_be_assigned_a_non_empty_expression: diag(
    17000,
    qt.DiagnosticCategory.Error,
    'JSX_attributes_must_only_be_assigned_a_non_empty_expression_17000',
    "JSX attributes must only be assigned a non-empty 'expression'."
  ),
  JSX_elements_cannot_have_multiple_attributes_with_the_same_name: diag(
    17001,
    qt.DiagnosticCategory.Error,
    'JSX_elements_cannot_have_multiple_attributes_with_the_same_name_17001',
    'JSX elements cannot have multiple attributes with the same name.'
  ),
  Expected_corresponding_JSX_closing_tag_for_0: diag(17002, qt.DiagnosticCategory.Error, 'Expected_corresponding_JSX_closing_tag_for_0_17002', "Expected corresponding JSX closing tag for '{0}'."),
  JSX_attribute_expected: diag(17003, qt.DiagnosticCategory.Error, 'JSX_attribute_expected_17003', 'JSX attribute expected.'),
  Cannot_use_JSX_unless_the_jsx_flag_is_provided: diag(
    17004,
    qt.DiagnosticCategory.Error,
    'Cannot_use_JSX_unless_the_jsx_flag_is_provided_17004',
    "Cannot use JSX unless the '--jsx' flag is provided."
  ),
  A_constructor_cannot_contain_a_super_call_when_its_class_extends_null: diag(
    17005,
    qt.DiagnosticCategory.Error,
    'A_constructor_cannot_contain_a_super_call_when_its_class_extends_null_17005',
    "A constructor cannot contain a 'super' call when its class extends 'null'."
  ),
  An_unary_expression_with_the_0_operator_is_not_allowed_in_the_left_hand_side_of_an_exponentiation_expression_Consider_enclosing_the_expression_in_parentheses: diag(
    17006,
    qt.DiagnosticCategory.Error,
    'An_unary_expression_with_the_0_operator_is_not_allowed_in_the_left_hand_side_of_an_exponentiation_ex_17006',
    "An unary expression with the '{0}' operator is not allowed in the left-hand side of an exponentiation expression. Consider enclosing the expression in parentheses."
  ),
  A_type_assertion_expression_is_not_allowed_in_the_left_hand_side_of_an_exponentiation_expression_Consider_enclosing_the_expression_in_parentheses: diag(
    17007,
    qt.DiagnosticCategory.Error,
    'A_type_assertion_expression_is_not_allowed_in_the_left_hand_side_of_an_exponentiation_expression_Con_17007',
    'A type assertion expression is not allowed in the left-hand side of an exponentiation expression. Consider enclosing the expression in parentheses.'
  ),
  JSX_element_0_has_no_corresponding_closing_tag: diag(
    17008,
    qt.DiagnosticCategory.Error,
    'JSX_element_0_has_no_corresponding_closing_tag_17008',
    "JSX element '{0}' has no corresponding closing tag."
  ),
  super_must_be_called_before_accessing_this_in_the_constructor_of_a_derived_class: diag(
    17009,
    qt.DiagnosticCategory.Error,
    'super_must_be_called_before_accessing_this_in_the_constructor_of_a_derived_class_17009',
    "'super' must be called before accessing 'this' in the constructor of a derived class."
  ),
  Unknown_type_acquisition_option_0: diag(17010, qt.DiagnosticCategory.Error, 'Unknown_type_acquisition_option_0_17010', "Unknown type acquisition option '{0}'."),
  super_must_be_called_before_accessing_a_property_of_super_in_the_constructor_of_a_derived_class: diag(
    17011,
    qt.DiagnosticCategory.Error,
    'super_must_be_called_before_accessing_a_property_of_super_in_the_constructor_of_a_derived_class_17011',
    "'super' must be called before accessing a property of 'super' in the constructor of a derived class."
  ),
  _0_is_not_a_valid_meta_property_for_keyword_1_Did_you_mean_2: diag(
    17012,
    qt.DiagnosticCategory.Error,
    '_0_is_not_a_valid_meta_property_for_keyword_1_Did_you_mean_2_17012',
    "'{0}' is not a valid meta-property for keyword '{1}'. Did you mean '{2}'?"
  ),
  Meta_property_0_is_only_allowed_in_the_body_of_a_function_declaration_function_expression_or_constructor: diag(
    17013,
    qt.DiagnosticCategory.Error,
    'Meta_property_0_is_only_allowed_in_the_body_of_a_function_declaration_function_expression_or_constru_17013',
    "Meta-property '{0}' is only allowed in the body of a function declaration, function expression, or constructor."
  ),
  JSX_fragment_has_no_corresponding_closing_tag: diag(17014, qt.DiagnosticCategory.Error, 'JSX_fragment_has_no_corresponding_closing_tag_17014', 'JSX fragment has no corresponding closing tag.'),
  Expected_corresponding_closing_tag_for_JSX_fragment: diag(
    17015,
    qt.DiagnosticCategory.Error,
    'Expected_corresponding_closing_tag_for_JSX_fragment_17015',
    'Expected corresponding closing tag for JSX fragment.'
  ),
  JSX_fragment_is_not_supported_when_using_jsxFactory: diag(
    17016,
    qt.DiagnosticCategory.Error,
    'JSX_fragment_is_not_supported_when_using_jsxFactory_17016',
    'JSX fragment is not supported when using --jsxFactory'
  ),
  JSX_fragment_is_not_supported_when_using_an_inline_JSX_factory_pragma: diag(
    17017,
    qt.DiagnosticCategory.Error,
    'JSX_fragment_is_not_supported_when_using_an_inline_JSX_factory_pragma_17017',
    'JSX fragment is not supported when using an inline JSX factory pragma'
  ),
  Unknown_type_acquisition_option_0_Did_you_mean_1: diag(
    17018,
    qt.DiagnosticCategory.Error,
    'Unknown_type_acquisition_option_0_Did_you_mean_1_17018',
    "Unknown type acquisition option '{0}'. Did you mean '{1}'?"
  ),
  Circularity_detected_while_resolving_configuration_Colon_0: diag(
    18000,
    qt.DiagnosticCategory.Error,
    'Circularity_detected_while_resolving_configuration_Colon_0_18000',
    'Circularity detected while resolving configuration: {0}'
  ),
  A_path_in_an_extends_option_must_be_relative_or_rooted_but_0_is_not: diag(
    18001,
    qt.DiagnosticCategory.Error,
    'A_path_in_an_extends_option_must_be_relative_or_rooted_but_0_is_not_18001',
    "A path in an 'extends' option must be relative or rooted, but '{0}' is not."
  ),
  The_files_list_in_config_file_0_is_empty: diag(18002, qt.DiagnosticCategory.Error, 'The_files_list_in_config_file_0_is_empty_18002', "The 'files' list in config file '{0}' is empty."),
  No_inputs_were_found_in_config_file_0_Specified_include_paths_were_1_and_exclude_paths_were_2: diag(
    18003,
    qt.DiagnosticCategory.Error,
    'No_inputs_were_found_in_config_file_0_Specified_include_paths_were_1_and_exclude_paths_were_2_18003',
    "No inputs were found in config file '{0}'. Specified 'include' paths were '{1}' and 'exclude' paths were '{2}'."
  ),
  File_is_a_CommonJS_module_it_may_be_converted_to_an_ES6_module: diag(
    80001,
    qt.DiagnosticCategory.Suggestion,
    'File_is_a_CommonJS_module_it_may_be_converted_to_an_ES6_module_80001',
    'File is a CommonJS module; it may be converted to an ES6 module.'
  ),
  This_constructor_function_may_be_converted_to_a_class_declaration: diag(
    80002,
    qt.DiagnosticCategory.Suggestion,
    'This_constructor_function_may_be_converted_to_a_class_declaration_80002',
    'This constructor function may be converted to a class declaration.'
  ),
  Import_may_be_converted_to_a_default_import: diag(80003, qt.DiagnosticCategory.Suggestion, 'Import_may_be_converted_to_a_default_import_80003', 'Import may be converted to a default import.'),
  JSDoc_types_may_be_moved_to_TypeScript_types: diag(80004, qt.DiagnosticCategory.Suggestion, 'JSDoc_types_may_be_moved_to_TypeScript_types_80004', 'JSDoc types may be moved to TypeScript types.'),
  require_call_may_be_converted_to_an_import: diag(80005, qt.DiagnosticCategory.Suggestion, 'require_call_may_be_converted_to_an_import_80005', "'require' call may be converted to an import."),
  This_may_be_converted_to_an_async_function: diag(80006, qt.DiagnosticCategory.Suggestion, 'This_may_be_converted_to_an_async_function_80006', 'This may be converted to an async function.'),
  await_has_no_effect_on_the_type_of_this_expression: diag(
    80007,
    qt.DiagnosticCategory.Suggestion,
    'await_has_no_effect_on_the_type_of_this_expression_80007',
    "'await' has no effect on the type of this expression."
  ),
  Numeric_literals_with_absolute_values_equal_to_2_53_or_greater_are_too_large_to_be_represented_accurately_as_integers: diag(
    80008,
    qt.DiagnosticCategory.Suggestion,
    'Numeric_literals_with_absolute_values_equal_to_2_53_or_greater_are_too_large_to_be_represented_accur_80008',
    'Numeric literals with absolute values equal to 2^53 or greater are too large to be represented accurately as integers.'
  ),
  Add_missing_super_call: diag(90001, qt.DiagnosticCategory.Message, 'Add_missing_super_call_90001', "Add missing 'super()' call"),
  Make_super_call_the_first_statement_in_the_constructor: diag(
    90002,
    qt.DiagnosticCategory.Message,
    'Make_super_call_the_first_statement_in_the_constructor_90002',
    "Make 'super()' call the first statement in the constructor"
  ),
  Change_extends_to_implements: diag(90003, qt.DiagnosticCategory.Message, 'Change_extends_to_implements_90003', "Change 'extends' to 'implements'"),
  Remove_unused_declaration_for_Colon_0: diag(90004, qt.DiagnosticCategory.Message, 'Remove_unused_declaration_for_Colon_0_90004', "Remove unused declaration for: '{0}'"),
  Remove_import_from_0: diag(90005, qt.DiagnosticCategory.Message, 'Remove_import_from_0_90005', "Remove import from '{0}'"),
  Implement_interface_0: diag(90006, qt.DiagnosticCategory.Message, 'Implement_interface_0_90006', "Implement interface '{0}'"),
  Implement_inherited_abstract_class: diag(90007, qt.DiagnosticCategory.Message, 'Implement_inherited_abstract_class_90007', 'Implement inherited abstract class'),
  Add_0_to_unresolved_variable: diag(90008, qt.DiagnosticCategory.Message, 'Add_0_to_unresolved_variable_90008', "Add '{0}.' to unresolved variable"),
  Remove_destructuring: diag(90009, qt.DiagnosticCategory.Message, 'Remove_destructuring_90009', 'Remove destructuring'),
  Remove_variable_statement: diag(90010, qt.DiagnosticCategory.Message, 'Remove_variable_statement_90010', 'Remove variable statement'),
  Remove_template_tag: diag(90011, qt.DiagnosticCategory.Message, 'Remove_template_tag_90011', 'Remove template tag'),
  Remove_type_parameters: diag(90012, qt.DiagnosticCategory.Message, 'Remove_type_parameters_90012', 'Remove type parameters'),
  Import_0_from_module_1: diag(90013, qt.DiagnosticCategory.Message, 'Import_0_from_module_1_90013', 'Import \'{0}\' from module "{1}"'),
  Change_0_to_1: diag(90014, qt.DiagnosticCategory.Message, 'Change_0_to_1_90014', "Change '{0}' to '{1}'"),
  Add_0_to_existing_import_declaration_from_1: diag(90015, qt.DiagnosticCategory.Message, 'Add_0_to_existing_import_declaration_from_1_90015', 'Add \'{0}\' to existing import declaration from "{1}"'),
  Declare_property_0: diag(90016, qt.DiagnosticCategory.Message, 'Declare_property_0_90016', "Declare property '{0}'"),
  Add_index_signature_for_property_0: diag(90017, qt.DiagnosticCategory.Message, 'Add_index_signature_for_property_0_90017', "Add index signature for property '{0}'"),
  Disable_checking_for_this_file: diag(90018, qt.DiagnosticCategory.Message, 'Disable_checking_for_this_file_90018', 'Disable checking for this file'),
  Ignore_this_error_message: diag(90019, qt.DiagnosticCategory.Message, 'Ignore_this_error_message_90019', 'Ignore this error message'),
  Initialize_property_0_in_the_constructor: diag(90020, qt.DiagnosticCategory.Message, 'Initialize_property_0_in_the_constructor_90020', "Initialize property '{0}' in the constructor"),
  Initialize_static_property_0: diag(90021, qt.DiagnosticCategory.Message, 'Initialize_static_property_0_90021', "Initialize static property '{0}'"),
  Change_spelling_to_0: diag(90022, qt.DiagnosticCategory.Message, 'Change_spelling_to_0_90022', "Change spelling to '{0}'"),
  Declare_method_0: diag(90023, qt.DiagnosticCategory.Message, 'Declare_method_0_90023', "Declare method '{0}'"),
  Declare_static_method_0: diag(90024, qt.DiagnosticCategory.Message, 'Declare_static_method_0_90024', "Declare static method '{0}'"),
  Prefix_0_with_an_underscore: diag(90025, qt.DiagnosticCategory.Message, 'Prefix_0_with_an_underscore_90025', "Prefix '{0}' with an underscore"),
  Rewrite_as_the_indexed_access_type_0: diag(90026, qt.DiagnosticCategory.Message, 'Rewrite_as_the_indexed_access_type_0_90026', "Rewrite as the indexed access type '{0}'"),
  Declare_static_property_0: diag(90027, qt.DiagnosticCategory.Message, 'Declare_static_property_0_90027', "Declare static property '{0}'"),
  Call_decorator_expression: diag(90028, qt.DiagnosticCategory.Message, 'Call_decorator_expression_90028', 'Call decorator expression'),
  Add_async_modifier_to_containing_function: diag(90029, qt.DiagnosticCategory.Message, 'Add_async_modifier_to_containing_function_90029', 'Add async modifier to containing function'),
  Replace_infer_0_with_unknown: diag(90030, qt.DiagnosticCategory.Message, 'Replace_infer_0_with_unknown_90030', "Replace 'infer {0}' with 'unknown'"),
  Replace_all_unused_infer_with_unknown: diag(90031, qt.DiagnosticCategory.Message, 'Replace_all_unused_infer_with_unknown_90031', "Replace all unused 'infer' with 'unknown'"),
  Import_default_0_from_module_1: diag(90032, qt.DiagnosticCategory.Message, 'Import_default_0_from_module_1_90032', 'Import default \'{0}\' from module "{1}"'),
  Add_default_import_0_to_existing_import_declaration_from_1: diag(
    90033,
    qt.DiagnosticCategory.Message,
    'Add_default_import_0_to_existing_import_declaration_from_1_90033',
    'Add default import \'{0}\' to existing import declaration from "{1}"'
  ),
  Add_parameter_name: diag(90034, qt.DiagnosticCategory.Message, 'Add_parameter_name_90034', 'Add parameter name'),
  Declare_private_property_0: diag(90035, qt.DiagnosticCategory.Message, 'Declare_private_property_0_90035', "Declare private property '{0}'"),
  Declare_a_private_field_named_0: diag(90053, qt.DiagnosticCategory.Message, 'Declare_a_private_field_named_0_90053', "Declare a private field named '{0}'."),
  Convert_function_to_an_ES2015_class: diag(95001, qt.DiagnosticCategory.Message, 'Convert_function_to_an_ES2015_class_95001', 'Convert function to an ES2015 class'),
  Convert_function_0_to_class: diag(95002, qt.DiagnosticCategory.Message, 'Convert_function_0_to_class_95002', "Convert function '{0}' to class"),
  Extract_to_0_in_1: diag(95004, qt.DiagnosticCategory.Message, 'Extract_to_0_in_1_95004', 'Extract to {0} in {1}'),
  Extract_function: diag(95005, qt.DiagnosticCategory.Message, 'Extract_function_95005', 'Extract function'),
  Extract_constant: diag(95006, qt.DiagnosticCategory.Message, 'Extract_constant_95006', 'Extract constant'),
  Extract_to_0_in_enclosing_scope: diag(95007, qt.DiagnosticCategory.Message, 'Extract_to_0_in_enclosing_scope_95007', 'Extract to {0} in enclosing scope'),
  Extract_to_0_in_1_scope: diag(95008, qt.DiagnosticCategory.Message, 'Extract_to_0_in_1_scope_95008', 'Extract to {0} in {1} scope'),
  Annotate_with_type_from_JSDoc: diag(95009, qt.DiagnosticCategory.Message, 'Annotate_with_type_from_JSDoc_95009', 'Annotate with type from JSDoc'),
  Annotate_with_types_from_JSDoc: diag(95010, qt.DiagnosticCategory.Message, 'Annotate_with_types_from_JSDoc_95010', 'Annotate with types from JSDoc'),
  Infer_type_of_0_from_usage: diag(95011, qt.DiagnosticCategory.Message, 'Infer_type_of_0_from_usage_95011', "Infer type of '{0}' from usage"),
  Infer_parameter_types_from_usage: diag(95012, qt.DiagnosticCategory.Message, 'Infer_parameter_types_from_usage_95012', 'Infer parameter types from usage'),
  Convert_to_default_import: diag(95013, qt.DiagnosticCategory.Message, 'Convert_to_default_import_95013', 'Convert to default import'),
  Install_0: diag(95014, qt.DiagnosticCategory.Message, 'Install_0_95014', "Install '{0}'"),
  Replace_import_with_0: diag(95015, qt.DiagnosticCategory.Message, 'Replace_import_with_0_95015', "Replace import with '{0}'."),
  Use_synthetic_default_member: diag(95016, qt.DiagnosticCategory.Message, 'Use_synthetic_default_member_95016', "Use synthetic 'default' member."),
  Convert_to_ES6_module: diag(95017, qt.DiagnosticCategory.Message, 'Convert_to_ES6_module_95017', 'Convert to ES6 module'),
  Add_undefined_type_to_property_0: diag(95018, qt.DiagnosticCategory.Message, 'Add_undefined_type_to_property_0_95018', "Add 'undefined' type to property '{0}'"),
  Add_initializer_to_property_0: diag(95019, qt.DiagnosticCategory.Message, 'Add_initializer_to_property_0_95019', "Add initializer to property '{0}'"),
  Add_definite_assignment_assertion_to_property_0: diag(
    95020,
    qt.DiagnosticCategory.Message,
    'Add_definite_assignment_assertion_to_property_0_95020',
    "Add definite assignment assertion to property '{0}'"
  ),
  Add_all_missing_members: diag(95022, qt.DiagnosticCategory.Message, 'Add_all_missing_members_95022', 'Add all missing members'),
  Infer_all_types_from_usage: diag(95023, qt.DiagnosticCategory.Message, 'Infer_all_types_from_usage_95023', 'Infer all types from usage'),
  Delete_all_unused_declarations: diag(95024, qt.DiagnosticCategory.Message, 'Delete_all_unused_declarations_95024', 'Delete all unused declarations'),
  Prefix_all_unused_declarations_with_where_possible: diag(
    95025,
    qt.DiagnosticCategory.Message,
    'Prefix_all_unused_declarations_with_where_possible_95025',
    "Prefix all unused declarations with '_' where possible"
  ),
  Fix_all_detected_spelling_errors: diag(95026, qt.DiagnosticCategory.Message, 'Fix_all_detected_spelling_errors_95026', 'Fix all detected spelling errors'),
  Add_initializers_to_all_uninitialized_properties: diag(
    95027,
    qt.DiagnosticCategory.Message,
    'Add_initializers_to_all_uninitialized_properties_95027',
    'Add initializers to all uninitialized properties'
  ),
  Add_definite_assignment_assertions_to_all_uninitialized_properties: diag(
    95028,
    qt.DiagnosticCategory.Message,
    'Add_definite_assignment_assertions_to_all_uninitialized_properties_95028',
    'Add definite assignment assertions to all uninitialized properties'
  ),
  Add_undefined_type_to_all_uninitialized_properties: diag(
    95029,
    qt.DiagnosticCategory.Message,
    'Add_undefined_type_to_all_uninitialized_properties_95029',
    'Add undefined type to all uninitialized properties'
  ),
  Change_all_jsdoc_style_types_to_TypeScript: diag(95030, qt.DiagnosticCategory.Message, 'Change_all_jsdoc_style_types_to_TypeScript_95030', 'Change all jsdoc-style types to TypeScript'),
  Change_all_jsdoc_style_types_to_TypeScript_and_add_undefined_to_nullable_types: diag(
    95031,
    qt.DiagnosticCategory.Message,
    'Change_all_jsdoc_style_types_to_TypeScript_and_add_undefined_to_nullable_types_95031',
    "Change all jsdoc-style types to TypeScript (and add '| undefined' to nullable types)"
  ),
  Implement_all_unimplemented_interfaces: diag(95032, qt.DiagnosticCategory.Message, 'Implement_all_unimplemented_interfaces_95032', 'Implement all unimplemented interfaces'),
  Install_all_missing_types_packages: diag(95033, qt.DiagnosticCategory.Message, 'Install_all_missing_types_packages_95033', 'Install all missing types packages'),
  Rewrite_all_as_indexed_access_types: diag(95034, qt.DiagnosticCategory.Message, 'Rewrite_all_as_indexed_access_types_95034', 'Rewrite all as indexed access types'),
  Convert_all_to_default_imports: diag(95035, qt.DiagnosticCategory.Message, 'Convert_all_to_default_imports_95035', 'Convert all to default imports'),
  Make_all_super_calls_the_first_statement_in_their_constructor: diag(
    95036,
    qt.DiagnosticCategory.Message,
    'Make_all_super_calls_the_first_statement_in_their_constructor_95036',
    "Make all 'super()' calls the first statement in their constructor"
  ),
  Add_qualifier_to_all_unresolved_variables_matching_a_member_name: diag(
    95037,
    qt.DiagnosticCategory.Message,
    'Add_qualifier_to_all_unresolved_variables_matching_a_member_name_95037',
    'Add qualifier to all unresolved variables matching a member name'
  ),
  Change_all_extended_interfaces_to_implements: diag(95038, qt.DiagnosticCategory.Message, 'Change_all_extended_interfaces_to_implements_95038', "Change all extended interfaces to 'implements'"),
  Add_all_missing_super_calls: diag(95039, qt.DiagnosticCategory.Message, 'Add_all_missing_super_calls_95039', 'Add all missing super calls'),
  Implement_all_inherited_abstract_classes: diag(95040, qt.DiagnosticCategory.Message, 'Implement_all_inherited_abstract_classes_95040', 'Implement all inherited abstract classes'),
  Add_all_missing_async_modifiers: diag(95041, qt.DiagnosticCategory.Message, 'Add_all_missing_async_modifiers_95041', "Add all missing 'async' modifiers"),
  Add_ts_ignore_to_all_error_messages: diag(95042, qt.DiagnosticCategory.Message, 'Add_ts_ignore_to_all_error_messages_95042', "Add '@ts-ignore' to all error messages"),
  Annotate_everything_with_types_from_JSDoc: diag(95043, qt.DiagnosticCategory.Message, 'Annotate_everything_with_types_from_JSDoc_95043', 'Annotate everything with types from JSDoc'),
  Add_to_all_uncalled_decorators: diag(95044, qt.DiagnosticCategory.Message, 'Add_to_all_uncalled_decorators_95044', "Add '()' to all uncalled decorators"),
  Convert_all_constructor_functions_to_classes: diag(95045, qt.DiagnosticCategory.Message, 'Convert_all_constructor_functions_to_classes_95045', 'Convert all constructor functions to classes'),
  Generate_get_and_set_accessors: diag(95046, qt.DiagnosticCategory.Message, 'Generate_get_and_set_accessors_95046', "Generate 'get' and 'set' accessors"),
  Convert_require_to_import: diag(95047, qt.DiagnosticCategory.Message, 'Convert_require_to_import_95047', "Convert 'require' to 'import'"),
  Convert_all_require_to_import: diag(95048, qt.DiagnosticCategory.Message, 'Convert_all_require_to_import_95048', "Convert all 'require' to 'import'"),
  Move_to_a_new_file: diag(95049, qt.DiagnosticCategory.Message, 'Move_to_a_new_file_95049', 'Move to a new file'),
  Remove_unreachable_code: diag(95050, qt.DiagnosticCategory.Message, 'Remove_unreachable_code_95050', 'Remove unreachable code'),
  Remove_all_unreachable_code: diag(95051, qt.DiagnosticCategory.Message, 'Remove_all_unreachable_code_95051', 'Remove all unreachable code'),
  Add_missing_typeof: diag(95052, qt.DiagnosticCategory.Message, 'Add_missing_typeof_95052', "Add missing 'typeof'"),
  Remove_unused_label: diag(95053, qt.DiagnosticCategory.Message, 'Remove_unused_label_95053', 'Remove unused label'),
  Remove_all_unused_labels: diag(95054, qt.DiagnosticCategory.Message, 'Remove_all_unused_labels_95054', 'Remove all unused labels'),
  Convert_0_to_mapped_object_type: diag(95055, qt.DiagnosticCategory.Message, 'Convert_0_to_mapped_object_type_95055', "Convert '{0}' to mapped object type"),
  Convert_namespace_import_to_named_imports: diag(95056, qt.DiagnosticCategory.Message, 'Convert_namespace_import_to_named_imports_95056', 'Convert namespace import to named imports'),
  Convert_named_imports_to_namespace_import: diag(95057, qt.DiagnosticCategory.Message, 'Convert_named_imports_to_namespace_import_95057', 'Convert named imports to namespace import'),
  Add_or_remove_braces_in_an_arrow_function: diag(95058, qt.DiagnosticCategory.Message, 'Add_or_remove_braces_in_an_arrow_function_95058', 'Add or remove braces in an arrow function'),
  Add_braces_to_arrow_function: diag(95059, qt.DiagnosticCategory.Message, 'Add_braces_to_arrow_function_95059', 'Add braces to arrow function'),
  Remove_braces_from_arrow_function: diag(95060, qt.DiagnosticCategory.Message, 'Remove_braces_from_arrow_function_95060', 'Remove braces from arrow function'),
  Convert_default_export_to_named_export: diag(95061, qt.DiagnosticCategory.Message, 'Convert_default_export_to_named_export_95061', 'Convert default export to named export'),
  Convert_named_export_to_default_export: diag(95062, qt.DiagnosticCategory.Message, 'Convert_named_export_to_default_export_95062', 'Convert named export to default export'),
  Add_missing_enum_member_0: diag(95063, qt.DiagnosticCategory.Message, 'Add_missing_enum_member_0_95063', "Add missing enum member '{0}'"),
  Add_all_missing_imports: diag(95064, qt.DiagnosticCategory.Message, 'Add_all_missing_imports_95064', 'Add all missing imports'),
  Convert_to_async_function: diag(95065, qt.DiagnosticCategory.Message, 'Convert_to_async_function_95065', 'Convert to async function'),
  Convert_all_to_async_functions: diag(95066, qt.DiagnosticCategory.Message, 'Convert_all_to_async_functions_95066', 'Convert all to async functions'),
  Add_missing_call_parentheses: diag(95067, qt.DiagnosticCategory.Message, 'Add_missing_call_parentheses_95067', 'Add missing call parentheses'),
  Add_all_missing_call_parentheses: diag(95068, qt.DiagnosticCategory.Message, 'Add_all_missing_call_parentheses_95068', 'Add all missing call parentheses'),
  Add_unknown_conversion_for_non_overlapping_types: diag(
    95069,
    qt.DiagnosticCategory.Message,
    'Add_unknown_conversion_for_non_overlapping_types_95069',
    "Add 'unknown' conversion for non-overlapping types"
  ),
  Add_unknown_to_all_conversions_of_non_overlapping_types: diag(
    95070,
    qt.DiagnosticCategory.Message,
    'Add_unknown_to_all_conversions_of_non_overlapping_types_95070',
    "Add 'unknown' to all conversions of non-overlapping types"
  ),
  Add_missing_new_operator_to_call: diag(95071, qt.DiagnosticCategory.Message, 'Add_missing_new_operator_to_call_95071', "Add missing 'new' operator to call"),
  Add_missing_new_operator_to_all_calls: diag(95072, qt.DiagnosticCategory.Message, 'Add_missing_new_operator_to_all_calls_95072', "Add missing 'new' operator to all calls"),
  Add_names_to_all_parameters_without_names: diag(95073, qt.DiagnosticCategory.Message, 'Add_names_to_all_parameters_without_names_95073', 'Add names to all parameters without names'),
  Enable_the_experimentalDecorators_option_in_your_configuration_file: diag(
    95074,
    qt.DiagnosticCategory.Message,
    'Enable_the_experimentalDecorators_option_in_your_configuration_file_95074',
    "Enable the 'experimentalDecorators' option in your configuration file"
  ),
  Convert_parameters_to_destructured_object: diag(95075, qt.DiagnosticCategory.Message, 'Convert_parameters_to_destructured_object_95075', 'Convert parameters to destructured object'),
  Allow_accessing_UMD_globals_from_modules: diag(95076, qt.DiagnosticCategory.Message, 'Allow_accessing_UMD_globals_from_modules_95076', 'Allow accessing UMD globals from modules.'),
  Extract_type: diag(95077, qt.DiagnosticCategory.Message, 'Extract_type_95077', 'Extract type'),
  Extract_to_type_alias: diag(95078, qt.DiagnosticCategory.Message, 'Extract_to_type_alias_95078', 'Extract to type alias'),
  Extract_to_typedef: diag(95079, qt.DiagnosticCategory.Message, 'Extract_to_typedef_95079', 'Extract to typedef'),
  Infer_this_type_of_0_from_usage: diag(95080, qt.DiagnosticCategory.Message, 'Infer_this_type_of_0_from_usage_95080', "Infer 'this' type of '{0}' from usage"),
  Add_const_to_unresolved_variable: diag(95081, qt.DiagnosticCategory.Message, 'Add_const_to_unresolved_variable_95081', "Add 'const' to unresolved variable"),
  Add_const_to_all_unresolved_variables: diag(95082, qt.DiagnosticCategory.Message, 'Add_const_to_all_unresolved_variables_95082', "Add 'const' to all unresolved variables"),
  Add_await: diag(95083, qt.DiagnosticCategory.Message, 'Add_await_95083', "Add 'await'"),
  Add_await_to_initializer_for_0: diag(95084, qt.DiagnosticCategory.Message, 'Add_await_to_initializer_for_0_95084', "Add 'await' to initializer for '{0}'"),
  Fix_all_expressions_possibly_missing_await: diag(95085, qt.DiagnosticCategory.Message, 'Fix_all_expressions_possibly_missing_await_95085', "Fix all expressions possibly missing 'await'"),
  Remove_unnecessary_await: diag(95086, qt.DiagnosticCategory.Message, 'Remove_unnecessary_await_95086', "Remove unnecessary 'await'"),
  Remove_all_unnecessary_uses_of_await: diag(95087, qt.DiagnosticCategory.Message, 'Remove_all_unnecessary_uses_of_await_95087', "Remove all unnecessary uses of 'await'"),
  Enable_the_jsx_flag_in_your_configuration_file: diag(
    95088,
    qt.DiagnosticCategory.Message,
    'Enable_the_jsx_flag_in_your_configuration_file_95088',
    "Enable the '--jsx' flag in your configuration file"
  ),
  Add_await_to_initializers: diag(95089, qt.DiagnosticCategory.Message, 'Add_await_to_initializers_95089', "Add 'await' to initializers"),
  Extract_to_interface: diag(95090, qt.DiagnosticCategory.Message, 'Extract_to_interface_95090', 'Extract to interface'),
  Convert_to_a_bigint_numeric_literal: diag(95091, qt.DiagnosticCategory.Message, 'Convert_to_a_bigint_numeric_literal_95091', 'Convert to a bigint numeric literal'),
  Convert_all_to_bigint_numeric_literals: diag(95092, qt.DiagnosticCategory.Message, 'Convert_all_to_bigint_numeric_literals_95092', 'Convert all to bigint numeric literals'),
  Convert_const_to_let: diag(95093, qt.DiagnosticCategory.Message, 'Convert_const_to_let_95093', "Convert 'const' to 'let'"),
  Prefix_with_declare: diag(95094, qt.DiagnosticCategory.Message, 'Prefix_with_declare_95094', "Prefix with 'declare'"),
  Prefix_all_incorrect_property_declarations_with_declare: diag(
    95095,
    qt.DiagnosticCategory.Message,
    'Prefix_all_incorrect_property_declarations_with_declare_95095',
    "Prefix all incorrect property declarations with 'declare'"
  ),
  Convert_to_template_string: diag(95096, qt.DiagnosticCategory.Message, 'Convert_to_template_string_95096', 'Convert to template string'),
  Add_export_to_make_this_file_into_a_module: diag(95097, qt.DiagnosticCategory.Message, 'Add_export_to_make_this_file_into_a_module_95097', "Add 'export {}' to make this file into a module"),
  Set_the_target_option_in_your_configuration_file_to_0: diag(
    95098,
    qt.DiagnosticCategory.Message,
    'Set_the_target_option_in_your_configuration_file_to_0_95098',
    "Set the 'target' option in your configuration file to '{0}'"
  ),
  Set_the_module_option_in_your_configuration_file_to_0: diag(
    95099,
    qt.DiagnosticCategory.Message,
    'Set_the_module_option_in_your_configuration_file_to_0_95099',
    "Set the 'module' option in your configuration file to '{0}'"
  ),
  Convert_invalid_character_to_its_html_entity_code: diag(
    95100,
    qt.DiagnosticCategory.Message,
    'Convert_invalid_character_to_its_html_entity_code_95100',
    'Convert invalid character to its html entity code'
  ),
  Convert_all_invalid_characters_to_HTML_entity_code: diag(
    95101,
    qt.DiagnosticCategory.Message,
    'Convert_all_invalid_characters_to_HTML_entity_code_95101',
    'Convert all invalid characters to HTML entity code'
  ),
  Add_class_tag: diag(95102, qt.DiagnosticCategory.Message, 'Add_class_tag_95102', "Add '@class' tag"),
  Add_this_tag: diag(95103, qt.DiagnosticCategory.Message, 'Add_this_tag_95103', "Add '@this' tag"),
  Add_this_parameter: diag(95104, qt.DiagnosticCategory.Message, 'Add_this_parameter_95104', "Add 'this' parameter."),
  Convert_function_expression_0_to_arrow_function: diag(
    95105,
    qt.DiagnosticCategory.Message,
    'Convert_function_expression_0_to_arrow_function_95105',
    "Convert function expression '{0}' to arrow function"
  ),
  Convert_function_declaration_0_to_arrow_function: diag(
    95106,
    qt.DiagnosticCategory.Message,
    'Convert_function_declaration_0_to_arrow_function_95106',
    "Convert function declaration '{0}' to arrow function"
  ),
  Fix_all_implicit_this_errors: diag(95107, qt.DiagnosticCategory.Message, 'Fix_all_implicit_this_errors_95107', "Fix all implicit-'this' errors"),
  Wrap_invalid_character_in_an_expression_container: diag(
    95108,
    qt.DiagnosticCategory.Message,
    'Wrap_invalid_character_in_an_expression_container_95108',
    'Wrap invalid character in an expression container'
  ),
  Wrap_all_invalid_characters_in_an_expression_container: diag(
    95109,
    qt.DiagnosticCategory.Message,
    'Wrap_all_invalid_characters_in_an_expression_container_95109',
    'Wrap all invalid characters in an expression container'
  ),
  Visit_https_Colon_Slash_Slashaka_ms_Slashtsconfig_json_to_read_more_about_this_file: diag(
    95110,
    qt.DiagnosticCategory.Message,
    'Visit_https_Colon_Slash_Slashaka_ms_Slashtsconfig_json_to_read_more_about_this_file_95110',
    'Visit https://aka.ms/tsconfig.json to read more about this file'
  ),
  Add_a_return_statement: diag(95111, qt.DiagnosticCategory.Message, 'Add_a_return_statement_95111', 'Add a return statement'),
  Remove_block_body_braces: diag(95112, qt.DiagnosticCategory.Message, 'Remove_block_body_braces_95112', 'Remove block body braces'),
  Wrap_the_following_body_with_parentheses_which_should_be_an_object_literal: diag(
    95113,
    qt.DiagnosticCategory.Message,
    'Wrap_the_following_body_with_parentheses_which_should_be_an_object_literal_95113',
    'Wrap the following body with parentheses which should be an object literal'
  ),
  Add_all_missing_return_statement: diag(95114, qt.DiagnosticCategory.Message, 'Add_all_missing_return_statement_95114', 'Add all missing return statement'),
  Remove_all_incorrect_body_block_braces: diag(95115, qt.DiagnosticCategory.Message, 'Remove_all_incorrect_body_block_braces_95115', 'Remove all incorrect body block braces'),
  Wrap_all_object_literal_with_parentheses: diag(95116, qt.DiagnosticCategory.Message, 'Wrap_all_object_literal_with_parentheses_95116', 'Wrap all object literal with parentheses'),
  No_value_exists_in_scope_for_the_shorthand_property_0_Either_declare_one_or_provide_an_initializer: diag(
    18004,
    qt.DiagnosticCategory.Error,
    'No_value_exists_in_scope_for_the_shorthand_property_0_Either_declare_one_or_provide_an_initializer_18004',
    "No value exists in scope for the shorthand property '{0}'. Either declare one or provide an initializer."
  ),
  Classes_may_not_have_a_field_named_constructor: diag(18006, qt.DiagnosticCategory.Error, 'Classes_may_not_have_a_field_named_constructor_18006', "Classes may not have a field named 'constructor'."),
  JSX_expressions_may_not_use_the_comma_operator_Did_you_mean_to_write_an_array: diag(
    18007,
    qt.DiagnosticCategory.Error,
    'JSX_expressions_may_not_use_the_comma_operator_Did_you_mean_to_write_an_array_18007',
    'JSX expressions may not use the comma operator. Did you mean to write an array?'
  ),
  Private_identifiers_cannot_be_used_as_parameters: diag(
    18009,
    qt.DiagnosticCategory.Error,
    'Private_identifiers_cannot_be_used_as_parameters_18009',
    'Private identifiers cannot be used as parameters'
  ),
  An_accessibility_modifier_cannot_be_used_with_a_private_identifier: diag(
    18010,
    qt.DiagnosticCategory.Error,
    'An_accessibility_modifier_cannot_be_used_with_a_private_identifier_18010',
    'An accessibility modifier cannot be used with a private identifier.'
  ),
  The_operand_of_a_delete_operator_cannot_be_a_private_identifier: diag(
    18011,
    qt.DiagnosticCategory.Error,
    'The_operand_of_a_delete_operator_cannot_be_a_private_identifier_18011',
    "The operand of a 'delete' operator cannot be a private identifier."
  ),
  constructor_is_a_reserved_word: diag(18012, qt.DiagnosticCategory.Error, 'constructor_is_a_reserved_word_18012', "'#constructor' is a reserved word."),
  Property_0_is_not_accessible_outside_class_1_because_it_has_a_private_identifier: diag(
    18013,
    qt.DiagnosticCategory.Error,
    'Property_0_is_not_accessible_outside_class_1_because_it_has_a_private_identifier_18013',
    "Property '{0}' is not accessible outside class '{1}' because it has a private identifier."
  ),
  The_property_0_cannot_be_accessed_on_type_1_within_this_class_because_it_is_shadowed_by_another_private_identifier_with_the_same_spelling: diag(
    18014,
    qt.DiagnosticCategory.Error,
    'The_property_0_cannot_be_accessed_on_type_1_within_this_class_because_it_is_shadowed_by_another_priv_18014',
    "The property '{0}' cannot be accessed on type '{1}' within this class because it is shadowed by another private identifier with the same spelling."
  ),
  Property_0_in_type_1_refers_to_a_different_member_that_cannot_be_accessed_from_within_type_2: diag(
    18015,
    qt.DiagnosticCategory.Error,
    'Property_0_in_type_1_refers_to_a_different_member_that_cannot_be_accessed_from_within_type_2_18015',
    "Property '{0}' in type '{1}' refers to a different member that cannot be accessed from within type '{2}'."
  ),
  Private_identifiers_are_not_allowed_outside_class_bodies: diag(
    18016,
    qt.DiagnosticCategory.Error,
    'Private_identifiers_are_not_allowed_outside_class_bodies_18016',
    'Private identifiers are not allowed outside class bodies.'
  ),
  The_shadowing_declaration_of_0_is_defined_here: diag(
    18017,
    qt.DiagnosticCategory.Error,
    'The_shadowing_declaration_of_0_is_defined_here_18017',
    "The shadowing declaration of '{0}' is defined here"
  ),
  The_declaration_of_0_that_you_probably_intended_to_use_is_defined_here: diag(
    18018,
    qt.DiagnosticCategory.Error,
    'The_declaration_of_0_that_you_probably_intended_to_use_is_defined_here_18018',
    "The declaration of '{0}' that you probably intended to use is defined here"
  ),
  _0_modifier_cannot_be_used_with_a_private_identifier: diag(
    18019,
    qt.DiagnosticCategory.Error,
    '_0_modifier_cannot_be_used_with_a_private_identifier_18019',
    "'{0}' modifier cannot be used with a private identifier"
  ),
  A_method_cannot_be_named_with_a_private_identifier: diag(
    18022,
    qt.DiagnosticCategory.Error,
    'A_method_cannot_be_named_with_a_private_identifier_18022',
    'A method cannot be named with a private identifier.'
  ),
  An_accessor_cannot_be_named_with_a_private_identifier: diag(
    18023,
    qt.DiagnosticCategory.Error,
    'An_accessor_cannot_be_named_with_a_private_identifier_18023',
    'An accessor cannot be named with a private identifier.'
  ),
  An_enum_member_cannot_be_named_with_a_private_identifier: diag(
    18024,
    qt.DiagnosticCategory.Error,
    'An_enum_member_cannot_be_named_with_a_private_identifier_18024',
    'An enum member cannot be named with a private identifier.'
  ),
  can_only_be_used_at_the_start_of_a_file: diag(18026, qt.DiagnosticCategory.Error, 'can_only_be_used_at_the_start_of_a_file_18026', "'#!' can only be used at the start of a file."),
  Compiler_reserves_name_0_when_emitting_private_identifier_downlevel: diag(
    18027,
    qt.DiagnosticCategory.Error,
    'Compiler_reserves_name_0_when_emitting_private_identifier_downlevel_18027',
    "Compiler reserves name '{0}' when emitting private identifier downlevel."
  ),
  Private_identifiers_are_only_available_when_targeting_ECMAScript_2015_and_higher: diag(
    18028,
    qt.DiagnosticCategory.Error,
    'Private_identifiers_are_only_available_when_targeting_ECMAScript_2015_and_higher_18028',
    'Private identifiers are only available when targeting ECMAScript 2015 and higher.'
  ),
  Private_identifiers_are_not_allowed_in_variable_declarations: diag(
    18029,
    qt.DiagnosticCategory.Error,
    'Private_identifiers_are_not_allowed_in_variable_declarations_18029',
    'Private identifiers are not allowed in variable declarations.'
  ),
  An_optional_chain_cannot_contain_private_identifiers: diag(
    18030,
    qt.DiagnosticCategory.Error,
    'An_optional_chain_cannot_contain_private_identifiers_18030',
    'An optional chain cannot contain private identifiers.'
  ),
  The_intersection_0_was_reduced_to_never_because_property_1_has_conflicting_types_in_some_constituents: diag(
    18031,
    qt.DiagnosticCategory.Error,
    'The_intersection_0_was_reduced_to_never_because_property_1_has_conflicting_types_in_some_constituent_18031',
    "The intersection '{0}' was reduced to 'never' because property '{1}' has conflicting types in some constituents."
  ),
  The_intersection_0_was_reduced_to_never_because_property_1_exists_in_multiple_constituents_and_is_private_in_some: diag(
    18032,
    qt.DiagnosticCategory.Error,
    'The_intersection_0_was_reduced_to_never_because_property_1_exists_in_multiple_constituents_and_is_pr_18032',
    "The intersection '{0}' was reduced to 'never' because property '{1}' exists in multiple constituents and is private in some."
  ),
  Only_numeric_enums_can_have_computed_members_but_this_expression_has_type_0_If_you_do_not_need_exhaustiveness_checks_consider_using_an_object_literal_instead: diag(
    18033,
    qt.DiagnosticCategory.Error,
    'Only_numeric_enums_can_have_computed_members_but_this_expression_has_type_0_If_you_do_not_need_exhau_18033',
    "Only numeric enums can have computed members, but this expression has type '{0}'. If you do not need exhaustiveness checks, consider using an object literal instead."
  ),
};
