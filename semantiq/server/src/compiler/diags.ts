// generated from './diagnosticInformationMap.generated.ts' by 'src/compiler'
import * as qb from './base';
import { SourceFile } from './types';
export enum Category {
  Warning,
  Error,
  Suggestion,
  Message,
}
export class Message {
  constructor(public code: number, public cat: Category, public key: string, public msg: string, public reportsUnnecessary?: {}, public elided?: boolean) {}
}
export interface MessageChain {
  messageText: string;
  category: Category;
  code: number;
  next?: MessageChain[];
}
export interface DiagnosticRelatedInformation {
  category: Category;
  code: number;
  file?: SourceFile;
  start?: number;
  length?: number;
  messageText: string | MessageChain;
}
export interface Diagnostic extends DiagnosticRelatedInformation {
  reportsUnnecessary?: {};
  source?: string;
  relatedInformation?: DiagnosticRelatedInformation[];
}
export interface DiagnosticWithLocation extends Diagnostic {
  file: SourceFile;
  start: number;
  length: number;
}
export interface DiagnosticCollection {
  add(diagnostic: Diagnostic): void;
  lookup(diagnostic: Diagnostic): Diagnostic | undefined;
  getGlobalDiagnostics(): Diagnostic[];
  getDiagnostics(): Diagnostic[];
  getDiagnostics(fileName: string): DiagnosticWithLocation[];
  reattachFileDiagnostics(newFile: SourceFile): void;
}
export let localizedMessages: qb.MapLike<string> | undefined;
export function setLocalizedMessages(messages: typeof localizedMessages) {
  localizedMessages = messages;
}
export function getLocaleSpecificMessage(message: Message) {
  return (localizedMessages && localizedMessages[message.key]) || message.msg;
}
export function formatMessage(_dummy: any, message: Message, ...args: (string | number | undefined)[]): string;
export function formatMessage(_dummy: any, message: Message): string {
  let text = getLocaleSpecificMessage(message);
  if (arguments.length > 2) {
    text = qb.formatStringFromArgs(text, arguments, 2);
  }
  return text;
}
export function createCompilerDiagnostic(message: Message, ...args: (string | number | undefined)[]): Diagnostic;
export function createCompilerDiagnostic(message: Message): Diagnostic {
  let text = getLocaleSpecificMessage(message);
  if (arguments.length > 1) {
    text = qb.formatStringFromArgs(text, arguments, 1);
  }
  return {
    file: undefined,
    start: undefined,
    length: undefined,
    messageText: text,
    category: message.cat,
    code: message.code,
    reportsUnnecessary: message.reportsUnnecessary,
  };
}
export function createCompilerDiagnosticFromMessageChain(chain: MessageChain): Diagnostic {
  return {
    file: undefined,
    start: undefined,
    length: undefined,
    code: chain.code,
    category: chain.category,
    messageText: chain.next ? chain : chain.messageText,
  };
}
export function chainMessages(details: MessageChain | MessageChain[] | undefined, message: Message, ...args: (string | number | undefined)[]): MessageChain;
export function chainMessages(details: MessageChain | MessageChain[] | undefined, message: Message): MessageChain {
  let text = getLocaleSpecificMessage(message);
  if (arguments.length > 2) {
    text = qb.formatStringFromArgs(text, arguments, 2);
  }
  return {
    messageText: text,
    category: message.cat,
    code: message.code,
    next: details === undefined || Array.isArray(details) ? details : [details],
  };
}
export function concatenateMessageChains(headChain: MessageChain, tailChain: MessageChain): void {
  let lastChain = headChain;
  while (lastChain.next) {
    lastChain = lastChain.next[0];
  }
  lastChain.next = [tailChain];
}
function getDiagnosticFilePath(diagnostic: Diagnostic): string | undefined {
  return diagnostic.file ? diagnostic.file.path : undefined;
}
export function compareDiagnostics(d1: Diagnostic, d2: Diagnostic): qb.Comparison {
  return compareDiagnosticsSkipRelatedInformation(d1, d2) || compareRelatedInformation(d1, d2) || qb.Comparison.EqualTo;
}
export function compareDiagnosticsSkipRelatedInformation(d1: Diagnostic, d2: Diagnostic): qb.Comparison {
  return (
    qb.compareCaseSensitive(getDiagnosticFilePath(d1), getDiagnosticFilePath(d2)) ||
    qb.compareNumbers(d1.start, d2.start) ||
    qb.compareNumbers(d1.length, d2.length) ||
    qb.compareNumbers(d1.code, d2.code) ||
    compareMessageText(d1.messageText, d2.messageText) ||
    qb.Comparison.EqualTo
  );
}
function compareRelatedInformation(d1: Diagnostic, d2: Diagnostic): qb.Comparison {
  if (!d1.relatedInformation && !d2.relatedInformation) return qb.Comparison.EqualTo;
  if (d1.relatedInformation && d2.relatedInformation) {
    return (
      qb.compareNumbers(d1.relatedInformation.length, d2.relatedInformation.length) ||
      qb.forEach(d1.relatedInformation, (d1i, index) => {
        const d2i = d2.relatedInformation![index];
        return compareDiagnostics(d1i, d2i);
      }) ||
      qb.Comparison.EqualTo
    );
  }
  return d1.relatedInformation ? qb.Comparison.LessThan : qb.Comparison.GreaterThan;
}
function compareMessageText(t1: string | MessageChain, t2: string | MessageChain): qb.Comparison {
  if (typeof t1 === 'string' && typeof t2 === 'string') return qb.compareCaseSensitive(t1, t2);
  if (typeof t1 === 'string') return qb.Comparison.LessThan;
  if (typeof t2 === 'string') return qb.Comparison.GreaterThan;
  let res = qb.compareCaseSensitive(t1.messageText, t2.messageText);
  if (res) return res;
  if (!t1.next && !t2.next) return qb.Comparison.EqualTo;
  if (!t1.next) return qb.Comparison.LessThan;
  if (!t2.next) return qb.Comparison.GreaterThan;
  const len = Math.min(t1.next.length, t2.next.length);
  for (let i = 0; i < len; i++) {
    res = compareMessageText(t1.next[i], t2.next[i]);
    if (res) return res;
  }
  if (t1.next.length < t2.next.length) return qb.Comparison.LessThan;
  else if (t1.next.length > t2.next.length) return qb.Comparison.GreaterThan;
  return qb.Comparison.EqualTo;
}
export function addRelatedInfo<T extends Diagnostic>(diagnostic: T, ...relatedInformation: DiagnosticRelatedInformation[]): T {
  if (!relatedInformation.length) return diagnostic;
  if (!diagnostic.relatedInformation) {
    diagnostic.relatedInformation = [];
  }
  diagnostic.relatedInformation.push(...relatedInformation);
  return diagnostic;
}
export function createDiagnosticCollection(): DiagnosticCollection {
  let nonFileDiagnostics = ([] as Diagnostic[]) as qb.Sorteds<Diagnostic>;
  const filesWithDiagnostics = ([] as string[]) as qb.Sorteds<string>;
  const fileDiagnostics = new qb.QMap<qb.Sorteds<DiagnosticWithLocation>>();
  let hasReadNonFileDiagnostics = false;
  return {
    add,
    lookup,
    getGlobalDiagnostics,
    getDiagnostics,
    reattachFileDiagnostics,
  };
  function reattachFileDiagnostics(newFile: SourceFile): void {
    qb.forEach(fileDiagnostics.get(newFile.fileName), (diagnostic) => (diagnostic.file = newFile));
  }
  function lookup(diagnostic: Diagnostic): Diagnostic | undefined {
    let diagnostics: qb.Sorteds<Diagnostic> | undefined;
    if (diagnostic.file) {
      diagnostics = fileDiagnostics.get(diagnostic.file.fileName);
    } else {
      diagnostics = nonFileDiagnostics;
    }
    if (!diagnostics) {
      return;
    }
    const result = qb.binarySearch(diagnostics, diagnostic, qb.identity, compareDiagnosticsSkipRelatedInformation);
    if (result >= 0) return diagnostics[result];
    return;
  }
  function add(diagnostic: Diagnostic): void {
    let diagnostics: qb.Sorteds<Diagnostic> | undefined;
    if (diagnostic.file) {
      diagnostics = fileDiagnostics.get(diagnostic.file.fileName);
      if (!diagnostics) {
        diagnostics = ([] as Diagnostic[]) as qb.Sorteds<DiagnosticWithLocation>;
        fileDiagnostics.set(diagnostic.file.fileName, diagnostics as qb.Sorteds<DiagnosticWithLocation>);
        qb.insertSorted(filesWithDiagnostics, diagnostic.file.fileName, qb.compareCaseSensitive);
      }
    } else {
      if (hasReadNonFileDiagnostics) {
        hasReadNonFileDiagnostics = false;
        nonFileDiagnostics = nonFileDiagnostics.slice() as qb.Sorteds<Diagnostic>;
      }
      diagnostics = nonFileDiagnostics;
    }
    qb.insertSorted(diagnostics, diagnostic, compareDiagnostics);
  }
  function getGlobalDiagnostics(): Diagnostic[] {
    hasReadNonFileDiagnostics = true;
    return nonFileDiagnostics;
  }
  function getDiagnostics(fileName: string): DiagnosticWithLocation[];
  function getDiagnostics(): Diagnostic[];
  function getDiagnostics(fileName?: string): Diagnostic[] {
    if (fileName) return fileDiagnostics.get(fileName) || [];
    const fileDiags: Diagnostic[] = qb.flatMapToMutable(filesWithDiagnostics, (f) => fileDiagnostics.get(f));
    if (!nonFileDiagnostics.length) return fileDiags;
    fileDiags.unshift(...nonFileDiagnostics);
    return fileDiags;
  }
}
export const msgs = {
  Unterminated_string_literal: new Message(1002, Category.Error, 'Unterminated_string_literal_1002', 'Unterminated string literal.'),
  Identifier_expected: new Message(1003, Category.Error, 'Identifier_expected_1003', 'Identifier expected.'),
  _0_expected: new Message(1005, Category.Error, '_0_expected_1005', "'{0}' expected."),
  A_file_cannot_have_a_reference_to_itself: new Message(1006, Category.Error, 'A_file_cannot_have_a_reference_to_itself_1006', 'A file cannot have a reference to itself.'),
  The_parser_expected_to_find_a_to_match_the_token_here: new Message(
    1007,
    Category.Error,
    'The_parser_expected_to_find_a_to_match_the_token_here_1007',
    "The parser expected to find a '}' to match the '{' token here."
  ),
  Trailing_comma_not_allowed: new Message(1009, Category.Error, 'Trailing_comma_not_allowed_1009', 'Trailing comma not allowed.'),
  Asterisk_Slash_expected: new Message(1010, Category.Error, 'Asterisk_Slash_expected_1010', "'*/' expected."),
  An_element_access_expression_should_take_an_argument: new Message(
    1011,
    Category.Error,
    'An_element_access_expression_should_take_an_argument_1011',
    'An element access expression should take an argument.'
  ),
  Unexpected_token: new Message(1012, Category.Error, 'Unexpected_token_1012', 'Unexpected token.'),
  A_rest_parameter_or_binding_pattern_may_not_have_a_trailing_comma: new Message(
    1013,
    Category.Error,
    'A_rest_parameter_or_binding_pattern_may_not_have_a_trailing_comma_1013',
    'A rest parameter or binding pattern may not have a trailing comma.'
  ),
  A_rest_parameter_must_be_last_in_a_parameter_list: new Message(1014, Category.Error, 'A_rest_parameter_must_be_last_in_a_parameter_list_1014', 'A rest parameter must be last in a parameter list.'),
  Parameter_cannot_have_question_mark_and_initer: new Message(1015, Category.Error, 'Parameter_cannot_have_question_mark_and_initer_1015', 'Parameter cannot have question mark and initer.'),
  A_required_parameter_cannot_follow_an_optional_parameter: new Message(
    1016,
    Category.Error,
    'A_required_parameter_cannot_follow_an_optional_parameter_1016',
    'A required parameter cannot follow an optional parameter.'
  ),
  An_index_signature_cannot_have_a_rest_parameter: new Message(1017, Category.Error, 'An_index_signature_cannot_have_a_rest_parameter_1017', 'An index signature cannot have a rest parameter.'),
  An_index_signature_parameter_cannot_have_an_accessibility_modifier: new Message(
    1018,
    Category.Error,
    'An_index_signature_parameter_cannot_have_an_accessibility_modifier_1018',
    'An index signature parameter cannot have an accessibility modifier.'
  ),
  An_index_signature_parameter_cannot_have_a_question_mark: new Message(
    1019,
    Category.Error,
    'An_index_signature_parameter_cannot_have_a_question_mark_1019',
    'An index signature parameter cannot have a question mark.'
  ),
  An_index_signature_parameter_cannot_have_an_initer: new Message(
    1020,
    Category.Error,
    'An_index_signature_parameter_cannot_have_an_initer_1020',
    'An index signature parameter cannot have an initer.'
  ),
  An_index_signature_must_have_a_type_annotation: new Message(1021, Category.Error, 'An_index_signature_must_have_a_type_annotation_1021', 'An index signature must have a type annotation.'),
  An_index_signature_parameter_must_have_a_type_annotation: new Message(
    1022,
    Category.Error,
    'An_index_signature_parameter_must_have_a_type_annotation_1022',
    'An index signature parameter must have a type annotation.'
  ),
  An_index_signature_parameter_type_must_be_either_string_or_number: new Message(
    1023,
    Category.Error,
    'An_index_signature_parameter_type_must_be_either_string_or_number_1023',
    "An index signature parameter type must be either 'string' or 'number'."
  ),
  readonly_modifier_can_only_appear_on_a_property_declaration_or_index_signature: new Message(
    1024,
    Category.Error,
    'readonly_modifier_can_only_appear_on_a_property_declaration_or_index_signature_1024',
    "'readonly' modifier can only appear on a property declaration or index signature."
  ),
  An_index_signature_cannot_have_a_trailing_comma: new Message(1025, Category.Error, 'An_index_signature_cannot_have_a_trailing_comma_1025', 'An index signature cannot have a trailing comma.'),
  Accessibility_modifier_already_seen: new Message(1028, Category.Error, 'Accessibility_modifier_already_seen_1028', 'Accessibility modifier already seen.'),
  _0_modifier_must_precede_1_modifier: new Message(1029, Category.Error, '_0_modifier_must_precede_1_modifier_1029', "'{0}' modifier must precede '{1}' modifier."),
  _0_modifier_already_seen: new Message(1030, Category.Error, '_0_modifier_already_seen_1030', "'{0}' modifier already seen."),
  _0_modifier_cannot_appear_on_a_class_element: new Message(1031, Category.Error, '_0_modifier_cannot_appear_on_a_class_element_1031', "'{0}' modifier cannot appear on a class element."),
  super_must_be_followed_by_an_argument_list_or_member_access: new Message(
    1034,
    Category.Error,
    'super_must_be_followed_by_an_argument_list_or_member_access_1034',
    "'super' must be followed by an argument list or member access."
  ),
  Only_ambient_modules_can_use_quoted_names: new Message(1035, Category.Error, 'Only_ambient_modules_can_use_quoted_names_1035', 'Only ambient modules can use quoted names.'),
  Statements_are_not_allowed_in_ambient_contexts: new Message(1036, Category.Error, 'Statements_are_not_allowed_in_ambient_contexts_1036', 'Statements are not allowed in ambient contexts.'),
  A_declare_modifier_cannot_be_used_in_an_already_ambient_context: new Message(
    1038,
    Category.Error,
    'A_declare_modifier_cannot_be_used_in_an_already_ambient_context_1038',
    "A 'declare' modifier cannot be used in an already ambient context."
  ),
  Initers_are_not_allowed_in_ambient_contexts: new Message(1039, Category.Error, 'Initers_are_not_allowed_in_ambient_contexts_1039', 'Initers are not allowed in ambient contexts.'),
  _0_modifier_cannot_be_used_in_an_ambient_context: new Message(1040, Category.Error, '_0_modifier_cannot_be_used_in_an_ambient_context_1040', "'{0}' modifier cannot be used in an ambient context."),
  _0_modifier_cannot_be_used_with_a_class_declaration: new Message(
    1041,
    Category.Error,
    '_0_modifier_cannot_be_used_with_a_class_declaration_1041',
    "'{0}' modifier cannot be used with a class declaration."
  ),
  _0_modifier_cannot_be_used_here: new Message(1042, Category.Error, '_0_modifier_cannot_be_used_here_1042', "'{0}' modifier cannot be used here."),
  _0_modifier_cannot_appear_on_a_data_property: new Message(1043, Category.Error, '_0_modifier_cannot_appear_on_a_data_property_1043', "'{0}' modifier cannot appear on a data property."),
  _0_modifier_cannot_appear_on_a_module_or_namespace_element: new Message(
    1044,
    Category.Error,
    '_0_modifier_cannot_appear_on_a_module_or_namespace_element_1044',
    "'{0}' modifier cannot appear on a module or namespace element."
  ),
  A_0_modifier_cannot_be_used_with_an_interface_declaration: new Message(
    1045,
    Category.Error,
    'A_0_modifier_cannot_be_used_with_an_interface_declaration_1045',
    "A '{0}' modifier cannot be used with an interface declaration."
  ),
  Top_level_declarations_in_d_ts_files_must_start_with_either_a_declare_or_export_modifier: new Message(
    1046,
    Category.Error,
    'Top_level_declarations_in_d_ts_files_must_start_with_either_a_declare_or_export_modifier_1046',
    "Top-level declarations in .d.ts files must start with either a 'declare' or 'export' modifier."
  ),
  A_rest_parameter_cannot_be_optional: new Message(1047, Category.Error, 'A_rest_parameter_cannot_be_optional_1047', 'A rest parameter cannot be optional.'),
  A_rest_parameter_cannot_have_an_initer: new Message(1048, Category.Error, 'A_rest_parameter_cannot_have_an_initer_1048', 'A rest parameter cannot have an initer.'),
  A_set_accessor_must_have_exactly_one_parameter: new Message(1049, Category.Error, 'A_set_accessor_must_have_exactly_one_parameter_1049', "A 'set' accessor must have exactly one parameter."),
  A_set_accessor_cannot_have_an_optional_parameter: new Message(1051, Category.Error, 'A_set_accessor_cannot_have_an_optional_parameter_1051', "A 'set' accessor cannot have an optional parameter."),
  A_set_accessor_parameter_cannot_have_an_initer: new Message(1052, Category.Error, 'A_set_accessor_parameter_cannot_have_an_initer_1052', "A 'set' accessor parameter cannot have an initer."),
  A_set_accessor_cannot_have_rest_parameter: new Message(1053, Category.Error, 'A_set_accessor_cannot_have_rest_parameter_1053', "A 'set' accessor cannot have rest parameter."),
  A_get_accessor_cannot_have_parameters: new Message(1054, Category.Error, 'A_get_accessor_cannot_have_parameters_1054', "A 'get' accessor cannot have parameters."),
  Type_0_is_not_a_valid_async_function_return_type_in_ES5_SlashES3_because_it_does_not_refer_to_a_Promise_compatible_constructor_value: new Message(
    1055,
    Category.Error,
    'Type_0_is_not_a_valid_async_function_return_type_in_ES5_SlashES3_because_it_does_not_refer_to_a_Prom_1055',
    "Type '{0}' is not a valid async function return type in ES5/ES3 because it does not refer to a Promise-compatible constructor value."
  ),
  Accessors_are_only_available_when_targeting_ECMAScript_5_and_higher: new Message(
    1056,
    Category.Error,
    'Accessors_are_only_available_when_targeting_ECMAScript_5_and_higher_1056',
    'Accessors are only available when targeting ECMAScript 5 and higher.'
  ),
  An_async_function_or_method_must_have_a_valid_awaitable_return_type: new Message(
    1057,
    Category.Error,
    'An_async_function_or_method_must_have_a_valid_awaitable_return_type_1057',
    'An async function or method must have a valid awaitable return type.'
  ),
  The_return_type_of_an_async_function_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member: new Message(
    1058,
    Category.Error,
    'The_return_type_of_an_async_function_must_either_be_a_valid_promise_or_must_not_contain_a_callable_t_1058',
    "The return type of an async function must either be a valid promise or must not contain a callable 'then' member."
  ),
  A_promise_must_have_a_then_method: new Message(1059, Category.Error, 'A_promise_must_have_a_then_method_1059', "A promise must have a 'then' method."),
  The_first_parameter_of_the_then_method_of_a_promise_must_be_a_callback: new Message(
    1060,
    Category.Error,
    'The_first_parameter_of_the_then_method_of_a_promise_must_be_a_callback_1060',
    "The first parameter of the 'then' method of a promise must be a callback."
  ),
  Enum_member_must_have_initer: new Message(1061, Category.Error, 'Enum_member_must_have_initer_1061', 'Enum member must have initer.'),
  Type_is_referenced_directly_or_indirectly_in_the_fulfillment_callback_of_its_own_then_method: new Message(
    1062,
    Category.Error,
    'Type_is_referenced_directly_or_indirectly_in_the_fulfillment_callback_of_its_own_then_method_1062',
    "Type is referenced directly or indirectly in the fulfillment callback of its own 'then' method."
  ),
  An_export_assignment_cannot_be_used_in_a_namespace: new Message(
    1063,
    Category.Error,
    'An_export_assignment_cannot_be_used_in_a_namespace_1063',
    'An export assignment cannot be used in a namespace.'
  ),
  The_return_type_of_an_async_function_or_method_must_be_the_global_Promise_T_type_Did_you_mean_to_write_Promise_0: new Message(
    1064,
    Category.Error,
    'The_return_type_of_an_async_function_or_method_must_be_the_global_Promise_T_type_Did_you_mean_to_wri_1064',
    "The return type of an async function or method must be the global Promise<T> type. Did you mean to write 'Promise<{0}>'?"
  ),
  In_ambient_enum_declarations_member_initer_must_be_constant_expression: new Message(
    1066,
    Category.Error,
    'In_ambient_enum_declarations_member_initer_must_be_constant_expression_1066',
    'In ambient enum declarations member initer must be constant expression.'
  ),
  Unexpected_token_A_constructor_method_accessor_or_property_was_expected: new Message(
    1068,
    Category.Error,
    'Unexpected_token_A_constructor_method_accessor_or_property_was_expected_1068',
    'Unexpected token. A constructor, method, accessor, or property was expected.'
  ),
  Unexpected_token_A_type_parameter_name_was_expected_without_curly_braces: new Message(
    1069,
    Category.Error,
    'Unexpected_token_A_type_parameter_name_was_expected_without_curly_braces_1069',
    'Unexpected token. A type parameter name was expected without curly braces.'
  ),
  _0_modifier_cannot_appear_on_a_type_member: new Message(1070, Category.Error, '_0_modifier_cannot_appear_on_a_type_member_1070', "'{0}' modifier cannot appear on a type member."),
  _0_modifier_cannot_appear_on_an_index_signature: new Message(1071, Category.Error, '_0_modifier_cannot_appear_on_an_index_signature_1071', "'{0}' modifier cannot appear on an index signature."),
  A_0_modifier_cannot_be_used_with_an_import_declaration: new Message(
    1079,
    Category.Error,
    'A_0_modifier_cannot_be_used_with_an_import_declaration_1079',
    "A '{0}' modifier cannot be used with an import declaration."
  ),
  Invalid_reference_directive_syntax: new Message(1084, Category.Error, 'Invalid_reference_directive_syntax_1084', "Invalid 'reference' directive syntax."),
  Octal_literals_are_not_available_when_targeting_ECMAScript_5_and_higher_Use_the_syntax_0: new Message(
    1085,
    Category.Error,
    'Octal_literals_are_not_available_when_targeting_ECMAScript_5_and_higher_Use_the_syntax_0_1085',
    "Octal literals are not available when targeting ECMAScript 5 and higher. Use the syntax '{0}'."
  ),
  _0_modifier_cannot_appear_on_a_constructor_declaration: new Message(
    1089,
    Category.Error,
    '_0_modifier_cannot_appear_on_a_constructor_declaration_1089',
    "'{0}' modifier cannot appear on a constructor declaration."
  ),
  _0_modifier_cannot_appear_on_a_parameter: new Message(1090, Category.Error, '_0_modifier_cannot_appear_on_a_parameter_1090', "'{0}' modifier cannot appear on a parameter."),
  Only_a_single_variable_declaration_is_allowed_in_a_for_in_statement: new Message(
    1091,
    Category.Error,
    'Only_a_single_variable_declaration_is_allowed_in_a_for_in_statement_1091',
    "Only a single variable declaration is allowed in a 'for...in' statement."
  ),
  Type_parameters_cannot_appear_on_a_constructor_declaration: new Message(
    1092,
    Category.Error,
    'Type_parameters_cannot_appear_on_a_constructor_declaration_1092',
    'Type parameters cannot appear on a constructor declaration.'
  ),
  Type_annotation_cannot_appear_on_a_constructor_declaration: new Message(
    1093,
    Category.Error,
    'Type_annotation_cannot_appear_on_a_constructor_declaration_1093',
    'Type annotation cannot appear on a constructor declaration.'
  ),
  An_accessor_cannot_have_type_parameters: new Message(1094, Category.Error, 'An_accessor_cannot_have_type_parameters_1094', 'An accessor cannot have type parameters.'),
  A_set_accessor_cannot_have_a_return_type_annotation: new Message(
    1095,
    Category.Error,
    'A_set_accessor_cannot_have_a_return_type_annotation_1095',
    "A 'set' accessor cannot have a return type annotation."
  ),
  An_index_signature_must_have_exactly_one_parameter: new Message(
    1096,
    Category.Error,
    'An_index_signature_must_have_exactly_one_parameter_1096',
    'An index signature must have exactly one parameter.'
  ),
  _0_list_cannot_be_empty: new Message(1097, Category.Error, '_0_list_cannot_be_empty_1097', "'{0}' list cannot be empty."),
  Type_parameter_list_cannot_be_empty: new Message(1098, Category.Error, 'Type_parameter_list_cannot_be_empty_1098', 'Type parameter list cannot be empty.'),
  Type_argument_list_cannot_be_empty: new Message(1099, Category.Error, 'Type_argument_list_cannot_be_empty_1099', 'Type argument list cannot be empty.'),
  Invalid_use_of_0_in_strict_mode: new Message(1100, Category.Error, 'Invalid_use_of_0_in_strict_mode_1100', "Invalid use of '{0}' in strict mode."),
  with_statements_are_not_allowed_in_strict_mode: new Message(1101, Category.Error, 'with_statements_are_not_allowed_in_strict_mode_1101', "'with' statements are not allowed in strict mode."),
  delete_cannot_be_called_on_an_identifier_in_strict_mode: new Message(
    1102,
    Category.Error,
    'delete_cannot_be_called_on_an_identifier_in_strict_mode_1102',
    "'delete' cannot be called on an identifier in strict mode."
  ),
  A_for_await_of_statement_is_only_allowed_within_an_async_function_or_async_generator: new Message(
    1103,
    Category.Error,
    'A_for_await_of_statement_is_only_allowed_within_an_async_function_or_async_generator_1103',
    "A 'for-await-of' statement is only allowed within an async function or async generator."
  ),
  A_continue_statement_can_only_be_used_within_an_enclosing_iteration_statement: new Message(
    1104,
    Category.Error,
    'A_continue_statement_can_only_be_used_within_an_enclosing_iteration_statement_1104',
    "A 'continue' statement can only be used within an enclosing iteration statement."
  ),
  A_break_statement_can_only_be_used_within_an_enclosing_iteration_or_switch_statement: new Message(
    1105,
    Category.Error,
    'A_break_statement_can_only_be_used_within_an_enclosing_iteration_or_switch_statement_1105',
    "A 'break' statement can only be used within an enclosing iteration or switch statement."
  ),
  Jump_target_cannot_cross_function_boundary: new Message(1107, Category.Error, 'Jump_target_cannot_cross_function_boundary_1107', 'Jump target cannot cross function boundary.'),
  A_return_statement_can_only_be_used_within_a_function_body: new Message(
    1108,
    Category.Error,
    'A_return_statement_can_only_be_used_within_a_function_body_1108',
    "A 'return' statement can only be used within a function body."
  ),
  Expression_expected: new Message(1109, Category.Error, 'Expression_expected_1109', 'Expression expected.'),
  Type_expected: new Message(1110, Category.Error, 'Type_expected_1110', 'Type expected.'),
  A_default_clause_cannot_appear_more_than_once_in_a_switch_statement: new Message(
    1113,
    Category.Error,
    'A_default_clause_cannot_appear_more_than_once_in_a_switch_statement_1113',
    "A 'default' clause cannot appear more than once in a 'switch' statement."
  ),
  Duplicate_label_0: new Message(1114, Category.Error, 'Duplicate_label_0_1114', "Duplicate label '{0}'."),
  A_continue_statement_can_only_jump_to_a_label_of_an_enclosing_iteration_statement: new Message(
    1115,
    Category.Error,
    'A_continue_statement_can_only_jump_to_a_label_of_an_enclosing_iteration_statement_1115',
    "A 'continue' statement can only jump to a label of an enclosing iteration statement."
  ),
  A_break_statement_can_only_jump_to_a_label_of_an_enclosing_statement: new Message(
    1116,
    Category.Error,
    'A_break_statement_can_only_jump_to_a_label_of_an_enclosing_statement_1116',
    "A 'break' statement can only jump to a label of an enclosing statement."
  ),
  An_object_literal_cannot_have_multiple_properties_with_the_same_name_in_strict_mode: new Message(
    1117,
    Category.Error,
    'An_object_literal_cannot_have_multiple_properties_with_the_same_name_in_strict_mode_1117',
    'An object literal cannot have multiple properties with the same name in strict mode.'
  ),
  An_object_literal_cannot_have_multiple_get_Slashset_accessors_with_the_same_name: new Message(
    1118,
    Category.Error,
    'An_object_literal_cannot_have_multiple_get_Slashset_accessors_with_the_same_name_1118',
    'An object literal cannot have multiple get/set accessors with the same name.'
  ),
  An_object_literal_cannot_have_property_and_accessor_with_the_same_name: new Message(
    1119,
    Category.Error,
    'An_object_literal_cannot_have_property_and_accessor_with_the_same_name_1119',
    'An object literal cannot have property and accessor with the same name.'
  ),
  An_export_assignment_cannot_have_modifiers: new Message(1120, Category.Error, 'An_export_assignment_cannot_have_modifiers_1120', 'An export assignment cannot have modifiers.'),
  Octal_literals_are_not_allowed_in_strict_mode: new Message(1121, Category.Error, 'Octal_literals_are_not_allowed_in_strict_mode_1121', 'Octal literals are not allowed in strict mode.'),
  Variable_declaration_list_cannot_be_empty: new Message(1123, Category.Error, 'Variable_declaration_list_cannot_be_empty_1123', 'Variable declaration list cannot be empty.'),
  Digit_expected: new Message(1124, Category.Error, 'Digit_expected_1124', 'Digit expected.'),
  Hexadecimal_digit_expected: new Message(1125, Category.Error, 'Hexadecimal_digit_expected_1125', 'Hexadecimal digit expected.'),
  Unexpected_end_of_text: new Message(1126, Category.Error, 'Unexpected_end_of_text_1126', 'Unexpected end of text.'),
  Invalid_character: new Message(1127, Category.Error, 'Invalid_character_1127', 'Invalid character.'),
  Declaration_or_statement_expected: new Message(1128, Category.Error, 'Declaration_or_statement_expected_1128', 'Declaration or statement expected.'),
  Statement_expected: new Message(1129, Category.Error, 'Statement_expected_1129', 'Statement expected.'),
  case_or_default_expected: new Message(1130, Category.Error, 'case_or_default_expected_1130', "'case' or 'default' expected."),
  Property_or_signature_expected: new Message(1131, Category.Error, 'Property_or_signature_expected_1131', 'Property or signature expected.'),
  Enum_member_expected: new Message(1132, Category.Error, 'Enum_member_expected_1132', 'Enum member expected.'),
  Variable_declaration_expected: new Message(1134, Category.Error, 'Variable_declaration_expected_1134', 'Variable declaration expected.'),
  Argument_expression_expected: new Message(1135, Category.Error, 'Argument_expression_expected_1135', 'Argument expression expected.'),
  Property_assignment_expected: new Message(1136, Category.Error, 'Property_assignment_expected_1136', 'Property assignment expected.'),
  Expression_or_comma_expected: new Message(1137, Category.Error, 'Expression_or_comma_expected_1137', 'Expression or comma expected.'),
  Parameter_declaration_expected: new Message(1138, Category.Error, 'Parameter_declaration_expected_1138', 'Parameter declaration expected.'),
  Type_parameter_declaration_expected: new Message(1139, Category.Error, 'Type_parameter_declaration_expected_1139', 'Type parameter declaration expected.'),
  Type_argument_expected: new Message(1140, Category.Error, 'Type_argument_expected_1140', 'Type argument expected.'),
  String_literal_expected: new Message(1141, Category.Error, 'String_literal_expected_1141', 'String literal expected.'),
  Line_break_not_permitted_here: new Message(1142, Category.Error, 'Line_break_not_permitted_here_1142', 'Line break not permitted here.'),
  or_expected: new Message(1144, Category.Error, 'or_expected_1144', "'{' or ';' expected."),
  Declaration_expected: new Message(1146, Category.Error, 'Declaration_expected_1146', 'Declaration expected.'),
  Import_declarations_in_a_namespace_cannot_reference_a_module: new Message(
    1147,
    Category.Error,
    'Import_declarations_in_a_namespace_cannot_reference_a_module_1147',
    'Import declarations in a namespace cannot reference a module.'
  ),
  Cannot_use_imports_exports_or_module_augmentations_when_module_is_none: new Message(
    1148,
    Category.Error,
    'Cannot_use_imports_exports_or_module_augmentations_when_module_is_none_1148',
    "Cannot use imports, exports, or module augmentations when '--module' is 'none'."
  ),
  File_name_0_differs_from_already_included_file_name_1_only_in_casing: new Message(
    1149,
    Category.Error,
    'File_name_0_differs_from_already_included_file_name_1_only_in_casing_1149',
    "File name '{0}' differs from already included file name '{1}' only in casing."
  ),
  const_declarations_must_be_initialized: new Message(1155, Category.Error, 'const_declarations_must_be_initialized_1155', "'const' declarations must be initialized."),
  const_declarations_can_only_be_declared_inside_a_block: new Message(
    1156,
    Category.Error,
    'const_declarations_can_only_be_declared_inside_a_block_1156',
    "'const' declarations can only be declared inside a block."
  ),
  let_declarations_can_only_be_declared_inside_a_block: new Message(
    1157,
    Category.Error,
    'let_declarations_can_only_be_declared_inside_a_block_1157',
    "'let' declarations can only be declared inside a block."
  ),
  Unterminated_template_literal: new Message(1160, Category.Error, 'Unterminated_template_literal_1160', 'Unterminated template literal.'),
  Unterminated_regular_expression_literal: new Message(1161, Category.Error, 'Unterminated_regular_expression_literal_1161', 'Unterminated regular expression literal.'),
  An_object_member_cannot_be_declared_optional: new Message(1162, Category.Error, 'An_object_member_cannot_be_declared_optional_1162', 'An object member cannot be declared optional.'),
  A_yield_expression_is_only_allowed_in_a_generator_body: new Message(
    1163,
    Category.Error,
    'A_yield_expression_is_only_allowed_in_a_generator_body_1163',
    "A 'yield' expression is only allowed in a generator body."
  ),
  Computed_property_names_are_not_allowed_in_enums: new Message(1164, Category.Error, 'Computed_property_names_are_not_allowed_in_enums_1164', 'Computed property names are not allowed in enums.'),
  A_computed_property_name_in_an_ambient_context_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type: new Message(
    1165,
    Category.Error,
    'A_computed_property_name_in_an_ambient_context_must_refer_to_an_expression_whose_type_is_a_literal_t_1165',
    "A computed property name in an ambient context must refer to an expression whose type is a literal type or a 'unique symbol' type."
  ),
  A_computed_property_name_in_a_class_property_declaration_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type: new Message(
    1166,
    Category.Error,
    'A_computed_property_name_in_a_class_property_declaration_must_refer_to_an_expression_whose_type_is_a_1166',
    "A computed property name in a class property declaration must refer to an expression whose type is a literal type or a 'unique symbol' type."
  ),
  A_computed_property_name_in_a_method_overload_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type: new Message(
    1168,
    Category.Error,
    'A_computed_property_name_in_a_method_overload_must_refer_to_an_expression_whose_type_is_a_literal_ty_1168',
    "A computed property name in a method overload must refer to an expression whose type is a literal type or a 'unique symbol' type."
  ),
  A_computed_property_name_in_an_interface_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type: new Message(
    1169,
    Category.Error,
    'A_computed_property_name_in_an_interface_must_refer_to_an_expression_whose_type_is_a_literal_type_or_1169',
    "A computed property name in an interface must refer to an expression whose type is a literal type or a 'unique symbol' type."
  ),
  A_computed_property_name_in_a_type_literal_must_refer_to_an_expression_whose_type_is_a_literal_type_or_a_unique_symbol_type: new Message(
    1170,
    Category.Error,
    'A_computed_property_name_in_a_type_literal_must_refer_to_an_expression_whose_type_is_a_literal_type__1170',
    "A computed property name in a type literal must refer to an expression whose type is a literal type or a 'unique symbol' type."
  ),
  A_comma_expression_is_not_allowed_in_a_computed_property_name: new Message(
    1171,
    Category.Error,
    'A_comma_expression_is_not_allowed_in_a_computed_property_name_1171',
    'A comma expression is not allowed in a computed property name.'
  ),
  extends_clause_already_seen: new Message(1172, Category.Error, 'extends_clause_already_seen_1172', "'extends' clause already seen."),
  extends_clause_must_precede_implements_clause: new Message(1173, Category.Error, 'extends_clause_must_precede_implements_clause_1173', "'extends' clause must precede 'implements' clause."),
  Classes_can_only_extend_a_single_class: new Message(1174, Category.Error, 'Classes_can_only_extend_a_single_class_1174', 'Classes can only extend a single class.'),
  implements_clause_already_seen: new Message(1175, Category.Error, 'implements_clause_already_seen_1175', "'implements' clause already seen."),
  Interface_declaration_cannot_have_implements_clause: new Message(
    1176,
    Category.Error,
    'Interface_declaration_cannot_have_implements_clause_1176',
    "Interface declaration cannot have 'implements' clause."
  ),
  Binary_digit_expected: new Message(1177, Category.Error, 'Binary_digit_expected_1177', 'Binary digit expected.'),
  Octal_digit_expected: new Message(1178, Category.Error, 'Octal_digit_expected_1178', 'Octal digit expected.'),
  Unexpected_token_expected: new Message(1179, Category.Error, 'Unexpected_token_expected_1179', "Unexpected token. '{' expected."),
  Property_destructuring_pattern_expected: new Message(1180, Category.Error, 'Property_destructuring_pattern_expected_1180', 'Property destructuring pattern expected.'),
  Array_element_destructuring_pattern_expected: new Message(1181, Category.Error, 'Array_element_destructuring_pattern_expected_1181', 'Array element destructuring pattern expected.'),
  A_destructuring_declaration_must_have_an_initer: new Message(1182, Category.Error, 'A_destructuring_declaration_must_have_an_initer_1182', 'A destructuring declaration must have an initer.'),
  An_implementation_cannot_be_declared_in_ambient_contexts: new Message(
    1183,
    Category.Error,
    'An_implementation_cannot_be_declared_in_ambient_contexts_1183',
    'An implementation cannot be declared in ambient contexts.'
  ),
  Modifiers_cannot_appear_here: new Message(1184, Category.Error, 'Modifiers_cannot_appear_here_1184', 'Modifiers cannot appear here.'),
  Merge_conflict_marker_encountered: new Message(1185, Category.Error, 'Merge_conflict_marker_encountered_1185', 'Merge conflict marker encountered.'),
  A_rest_element_cannot_have_an_initer: new Message(1186, Category.Error, 'A_rest_element_cannot_have_an_initer_1186', 'A rest element cannot have an initer.'),
  A_parameter_property_may_not_be_declared_using_a_binding_pattern: new Message(
    1187,
    Category.Error,
    'A_parameter_property_may_not_be_declared_using_a_binding_pattern_1187',
    'A parameter property may not be declared using a binding pattern.'
  ),
  Only_a_single_variable_declaration_is_allowed_in_a_for_of_statement: new Message(
    1188,
    Category.Error,
    'Only_a_single_variable_declaration_is_allowed_in_a_for_of_statement_1188',
    "Only a single variable declaration is allowed in a 'for...of' statement."
  ),
  The_variable_declaration_of_a_for_in_statement_cannot_have_an_initer: new Message(
    1189,
    Category.Error,
    'The_variable_declaration_of_a_for_in_statement_cannot_have_an_initer_1189',
    "The variable declaration of a 'for...in' statement cannot have an initer."
  ),
  The_variable_declaration_of_a_for_of_statement_cannot_have_an_initer: new Message(
    1190,
    Category.Error,
    'The_variable_declaration_of_a_for_of_statement_cannot_have_an_initer_1190',
    "The variable declaration of a 'for...of' statement cannot have an initer."
  ),
  An_import_declaration_cannot_have_modifiers: new Message(1191, Category.Error, 'An_import_declaration_cannot_have_modifiers_1191', 'An import declaration cannot have modifiers.'),
  Module_0_has_no_default_export: new Message(1192, Category.Error, 'Module_0_has_no_default_export_1192', "Module '{0}' has no default export."),
  An_export_declaration_cannot_have_modifiers: new Message(1193, Category.Error, 'An_export_declaration_cannot_have_modifiers_1193', 'An export declaration cannot have modifiers.'),
  Export_declarations_are_not_permitted_in_a_namespace: new Message(
    1194,
    Category.Error,
    'Export_declarations_are_not_permitted_in_a_namespace_1194',
    'Export declarations are not permitted in a namespace.'
  ),
  export_Asterisk_does_not_re_export_a_default: new Message(1195, Category.Error, 'export_Asterisk_does_not_re_export_a_default_1195', "'export *' does not re-export a default."),
  Catch_clause_variable_cannot_have_a_type_annotation: new Message(
    1196,
    Category.Error,
    'Catch_clause_variable_cannot_have_a_type_annotation_1196',
    'Catch clause variable cannot have a type annotation.'
  ),
  Catch_clause_variable_cannot_have_an_initer: new Message(1197, Category.Error, 'Catch_clause_variable_cannot_have_an_initer_1197', 'Catch clause variable cannot have an initer.'),
  An_extended_Unicode_escape_value_must_be_between_0x0_and_0x10FFFF_inclusive: new Message(
    1198,
    Category.Error,
    'An_extended_Unicode_escape_value_must_be_between_0x0_and_0x10FFFF_inclusive_1198',
    'An extended Unicode escape value must be between 0x0 and 0x10FFFF inclusive.'
  ),
  Unterminated_Unicode_escape_sequence: new Message(1199, Category.Error, 'Unterminated_Unicode_escape_sequence_1199', 'Unterminated Unicode escape sequence.'),
  Line_terminator_not_permitted_before_arrow: new Message(1200, Category.Error, 'Line_terminator_not_permitted_before_arrow_1200', 'Line terminator not permitted before arrow.'),
  Import_assignment_cannot_be_used_when_targeting_ECMAScript_modules_Consider_using_import_Asterisk_as_ns_from_mod_import_a_from_mod_import_d_from_mod_or_another_module_format_instead: new Message(
    1202,
    Category.Error,
    'Import_assignment_cannot_be_used_when_targeting_ECMAScript_modules_Consider_using_import_Asterisk_as_1202',
    'Import assignment cannot be used when targeting ECMAScript modules. Consider using \'import * as ns from "mod"\', \'import {a} from "mod"\', \'import d from "mod"\', or another module format instead.'
  ),
  Export_assignment_cannot_be_used_when_targeting_ECMAScript_modules_Consider_using_export_default_or_another_module_format_instead: new Message(
    1203,
    Category.Error,
    'Export_assignment_cannot_be_used_when_targeting_ECMAScript_modules_Consider_using_export_default_or__1203',
    "Export assignment cannot be used when targeting ECMAScript modules. Consider using 'export default' or another module format instead."
  ),
  Re_exporting_a_type_when_the_isolatedModules_flag_is_provided_requires_using_export_type: new Message(
    1205,
    Category.Error,
    'Re_exporting_a_type_when_the_isolatedModules_flag_is_provided_requires_using_export_type_1205',
    "Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'."
  ),
  Decorators_are_not_valid_here: new Message(1206, Category.Error, 'Decorators_are_not_valid_here_1206', 'Decorators are not valid here.'),
  Decorators_cannot_be_applied_to_multiple_get_Slashset_accessors_of_the_same_name: new Message(
    1207,
    Category.Error,
    'Decorators_cannot_be_applied_to_multiple_get_Slashset_accessors_of_the_same_name_1207',
    'Decorators cannot be applied to multiple get/set accessors of the same name.'
  ),
  All_files_must_be_modules_when_the_isolatedModules_flag_is_provided: new Message(
    1208,
    Category.Error,
    'All_files_must_be_modules_when_the_isolatedModules_flag_is_provided_1208',
    "All files must be modules when the '--isolatedModules' flag is provided."
  ),
  Invalid_use_of_0_Class_definitions_are_automatically_in_strict_mode: new Message(
    1210,
    Category.Error,
    'Invalid_use_of_0_Class_definitions_are_automatically_in_strict_mode_1210',
    "Invalid use of '{0}'. Class definitions are automatically in strict mode."
  ),
  A_class_declaration_without_the_default_modifier_must_have_a_name: new Message(
    1211,
    Category.Error,
    'A_class_declaration_without_the_default_modifier_must_have_a_name_1211',
    "A class declaration without the 'default' modifier must have a name."
  ),
  Identifier_expected_0_is_a_reserved_word_in_strict_mode: new Message(
    1212,
    Category.Error,
    'Identifier_expected_0_is_a_reserved_word_in_strict_mode_1212',
    "Identifier expected. '{0}' is a reserved word in strict mode."
  ),
  Identifier_expected_0_is_a_reserved_word_in_strict_mode_Class_definitions_are_automatically_in_strict_mode: new Message(
    1213,
    Category.Error,
    'Identifier_expected_0_is_a_reserved_word_in_strict_mode_Class_definitions_are_automatically_in_stric_1213',
    "Identifier expected. '{0}' is a reserved word in strict mode. Class definitions are automatically in strict mode."
  ),
  Identifier_expected_0_is_a_reserved_word_in_strict_mode_Modules_are_automatically_in_strict_mode: new Message(
    1214,
    Category.Error,
    'Identifier_expected_0_is_a_reserved_word_in_strict_mode_Modules_are_automatically_in_strict_mode_1214',
    "Identifier expected. '{0}' is a reserved word in strict mode. Modules are automatically in strict mode."
  ),
  Invalid_use_of_0_Modules_are_automatically_in_strict_mode: new Message(
    1215,
    Category.Error,
    'Invalid_use_of_0_Modules_are_automatically_in_strict_mode_1215',
    "Invalid use of '{0}'. Modules are automatically in strict mode."
  ),
  Identifier_expected_esModule_is_reserved_as_an_exported_marker_when_transforming_ECMAScript_modules: new Message(
    1216,
    Category.Error,
    'Identifier_expected_esModule_is_reserved_as_an_exported_marker_when_transforming_ECMAScript_modules_1216',
    "Identifier expected. '__esModule' is reserved as an exported marker when transforming ECMAScript modules."
  ),
  Export_assignment_is_not_supported_when_module_flag_is_system: new Message(
    1218,
    Category.Error,
    'Export_assignment_is_not_supported_when_module_flag_is_system_1218',
    "Export assignment is not supported when '--module' flag is 'system'."
  ),
  Experimental_support_for_decorators_is_a_feature_that_is_subject_to_change_in_a_future_release_Set_the_experimentalDecorators_option_in_your_tsconfig_or_jsconfig_to_remove_this_warning: new Message(
    1219,
    Category.Error,
    'Experimental_support_for_decorators_is_a_feature_that_is_subject_to_change_in_a_future_release_Set_t_1219',
    "Experimental support for decorators is a feature that is subject to change in a future release. Set the 'experimentalDecorators' option in your 'tsconfig' or 'jsconfig' to remove this warning."
  ),
  Generators_are_only_available_when_targeting_ECMAScript_2015_or_higher: new Message(
    1220,
    Category.Error,
    'Generators_are_only_available_when_targeting_ECMAScript_2015_or_higher_1220',
    'Generators are only available when targeting ECMAScript 2015 or higher.'
  ),
  Generators_are_not_allowed_in_an_ambient_context: new Message(1221, Category.Error, 'Generators_are_not_allowed_in_an_ambient_context_1221', 'Generators are not allowed in an ambient context.'),
  An_overload_signature_cannot_be_declared_as_a_generator: new Message(
    1222,
    Category.Error,
    'An_overload_signature_cannot_be_declared_as_a_generator_1222',
    'An overload signature cannot be declared as a generator.'
  ),
  _0_tag_already_specified: new Message(1223, Category.Error, '_0_tag_already_specified_1223', "'{0}' tag already specified."),
  Signature_0_must_be_a_type_predicate: new Message(1224, Category.Error, 'Signature_0_must_be_a_type_predicate_1224', "Signature '{0}' must be a type predicate."),
  Cannot_find_parameter_0: new Message(1225, Category.Error, 'Cannot_find_parameter_0_1225', "Cannot find parameter '{0}'."),
  Type_predicate_0_is_not_assignable_to_1: new Message(1226, Category.Error, 'Type_predicate_0_is_not_assignable_to_1_1226', "Type predicate '{0}' is not assignable to '{1}'."),
  Parameter_0_is_not_in_the_same_position_as_parameter_1: new Message(
    1227,
    Category.Error,
    'Parameter_0_is_not_in_the_same_position_as_parameter_1_1227',
    "Parameter '{0}' is not in the same position as parameter '{1}'."
  ),
  A_type_predicate_is_only_allowed_in_return_type_position_for_functions_and_methods: new Message(
    1228,
    Category.Error,
    'A_type_predicate_is_only_allowed_in_return_type_position_for_functions_and_methods_1228',
    'A type predicate is only allowed in return type position for functions and methods.'
  ),
  A_type_predicate_cannot_reference_a_rest_parameter: new Message(
    1229,
    Category.Error,
    'A_type_predicate_cannot_reference_a_rest_parameter_1229',
    'A type predicate cannot reference a rest parameter.'
  ),
  A_type_predicate_cannot_reference_element_0_in_a_binding_pattern: new Message(
    1230,
    Category.Error,
    'A_type_predicate_cannot_reference_element_0_in_a_binding_pattern_1230',
    "A type predicate cannot reference element '{0}' in a binding pattern."
  ),
  An_export_assignment_can_only_be_used_in_a_module: new Message(1231, Category.Error, 'An_export_assignment_can_only_be_used_in_a_module_1231', 'An export assignment can only be used in a module.'),
  An_import_declaration_can_only_be_used_in_a_namespace_or_module: new Message(
    1232,
    Category.Error,
    'An_import_declaration_can_only_be_used_in_a_namespace_or_module_1232',
    'An import declaration can only be used in a namespace or module.'
  ),
  An_export_declaration_can_only_be_used_in_a_module: new Message(
    1233,
    Category.Error,
    'An_export_declaration_can_only_be_used_in_a_module_1233',
    'An export declaration can only be used in a module.'
  ),
  An_ambient_module_declaration_is_only_allowed_at_the_top_level_in_a_file: new Message(
    1234,
    Category.Error,
    'An_ambient_module_declaration_is_only_allowed_at_the_top_level_in_a_file_1234',
    'An ambient module declaration is only allowed at the top level in a file.'
  ),
  A_namespace_declaration_is_only_allowed_in_a_namespace_or_module: new Message(
    1235,
    Category.Error,
    'A_namespace_declaration_is_only_allowed_in_a_namespace_or_module_1235',
    'A namespace declaration is only allowed in a namespace or module.'
  ),
  The_return_type_of_a_property_decorator_function_must_be_either_void_or_any: new Message(
    1236,
    Category.Error,
    'The_return_type_of_a_property_decorator_function_must_be_either_void_or_any_1236',
    "The return type of a property decorator function must be either 'void' or 'any'."
  ),
  The_return_type_of_a_parameter_decorator_function_must_be_either_void_or_any: new Message(
    1237,
    Category.Error,
    'The_return_type_of_a_parameter_decorator_function_must_be_either_void_or_any_1237',
    "The return type of a parameter decorator function must be either 'void' or 'any'."
  ),
  Unable_to_resolve_signature_of_class_decorator_when_called_as_an_expression: new Message(
    1238,
    Category.Error,
    'Unable_to_resolve_signature_of_class_decorator_when_called_as_an_expression_1238',
    'Unable to resolve signature of class decorator when called as an expression.'
  ),
  Unable_to_resolve_signature_of_parameter_decorator_when_called_as_an_expression: new Message(
    1239,
    Category.Error,
    'Unable_to_resolve_signature_of_parameter_decorator_when_called_as_an_expression_1239',
    'Unable to resolve signature of parameter decorator when called as an expression.'
  ),
  Unable_to_resolve_signature_of_property_decorator_when_called_as_an_expression: new Message(
    1240,
    Category.Error,
    'Unable_to_resolve_signature_of_property_decorator_when_called_as_an_expression_1240',
    'Unable to resolve signature of property decorator when called as an expression.'
  ),
  Unable_to_resolve_signature_of_method_decorator_when_called_as_an_expression: new Message(
    1241,
    Category.Error,
    'Unable_to_resolve_signature_of_method_decorator_when_called_as_an_expression_1241',
    'Unable to resolve signature of method decorator when called as an expression.'
  ),
  abstract_modifier_can_only_appear_on_a_class_method_or_property_declaration: new Message(
    1242,
    Category.Error,
    'abstract_modifier_can_only_appear_on_a_class_method_or_property_declaration_1242',
    "'abstract' modifier can only appear on a class, method, or property declaration."
  ),
  _0_modifier_cannot_be_used_with_1_modifier: new Message(1243, Category.Error, '_0_modifier_cannot_be_used_with_1_modifier_1243', "'{0}' modifier cannot be used with '{1}' modifier."),
  Abstract_methods_can_only_appear_within_an_abstract_class: new Message(
    1244,
    Category.Error,
    'Abstract_methods_can_only_appear_within_an_abstract_class_1244',
    'Abstract methods can only appear within an abstract class.'
  ),
  Method_0_cannot_have_an_implementation_because_it_is_marked_abstract: new Message(
    1245,
    Category.Error,
    'Method_0_cannot_have_an_implementation_because_it_is_marked_abstract_1245',
    "Method '{0}' cannot have an implementation because it is marked abstract."
  ),
  An_interface_property_cannot_have_an_initer: new Message(1246, Category.Error, 'An_interface_property_cannot_have_an_initer_1246', 'An interface property cannot have an initer.'),
  A_type_literal_property_cannot_have_an_initer: new Message(1247, Category.Error, 'A_type_literal_property_cannot_have_an_initer_1247', 'A type literal property cannot have an initer.'),
  A_class_member_cannot_have_the_0_keyword: new Message(1248, Category.Error, 'A_class_member_cannot_have_the_0_keyword_1248', "A class member cannot have the '{0}' keyword."),
  A_decorator_can_only_decorate_a_method_implementation_not_an_overload: new Message(
    1249,
    Category.Error,
    'A_decorator_can_only_decorate_a_method_implementation_not_an_overload_1249',
    'A decorator can only decorate a method implementation, not an overload.'
  ),
  Function_declarations_are_not_allowed_inside_blocks_in_strict_mode_when_targeting_ES3_or_ES5: new Message(
    1250,
    Category.Error,
    'Function_declarations_are_not_allowed_inside_blocks_in_strict_mode_when_targeting_ES3_or_ES5_1250',
    "Function declarations are not allowed inside blocks in strict mode when targeting 'ES3' or 'ES5'."
  ),
  Function_declarations_are_not_allowed_inside_blocks_in_strict_mode_when_targeting_ES3_or_ES5_Class_definitions_are_automatically_in_strict_mode: new Message(
    1251,
    Category.Error,
    'Function_declarations_are_not_allowed_inside_blocks_in_strict_mode_when_targeting_ES3_or_ES5_Class_d_1251',
    "Function declarations are not allowed inside blocks in strict mode when targeting 'ES3' or 'ES5'. Class definitions are automatically in strict mode."
  ),
  Function_declarations_are_not_allowed_inside_blocks_in_strict_mode_when_targeting_ES3_or_ES5_Modules_are_automatically_in_strict_mode: new Message(
    1252,
    Category.Error,
    'Function_declarations_are_not_allowed_inside_blocks_in_strict_mode_when_targeting_ES3_or_ES5_Modules_1252',
    "Function declarations are not allowed inside blocks in strict mode when targeting 'ES3' or 'ES5'. Modules are automatically in strict mode."
  ),
  _0_tag_cannot_be_used_independently_as_a_top_level_Doc_tag: new Message(
    1253,
    Category.Error,
    '_0_tag_cannot_be_used_independently_as_a_top_level_Doc_tag_1253',
    "'{0}' tag cannot be used independently as a top level Doc tag."
  ),
  A_const_initer_in_an_ambient_context_must_be_a_string_or_numeric_literal_or_literal_enum_reference: new Message(
    1254,
    Category.Error,
    'A_const_initer_in_an_ambient_context_must_be_a_string_or_numeric_literal_or_literal_enum_refere_1254',
    "A 'const' initer in an ambient context must be a string or numeric literal or literal enum reference."
  ),
  A_definite_assignment_assertion_is_not_permitted_in_this_context: new Message(
    1255,
    Category.Error,
    'A_definite_assignment_assertion_is_not_permitted_in_this_context_1255',
    "A definite assignment assertion '!' is not permitted in this context."
  ),
  A_rest_element_must_be_last_in_a_tuple_type: new Message(1256, Category.Error, 'A_rest_element_must_be_last_in_a_tuple_type_1256', 'A rest element must be last in a tuple type.'),
  A_required_element_cannot_follow_an_optional_element: new Message(
    1257,
    Category.Error,
    'A_required_element_cannot_follow_an_optional_element_1257',
    'A required element cannot follow an optional element.'
  ),
  Definite_assignment_assertions_can_only_be_used_along_with_a_type_annotation: new Message(
    1258,
    Category.Error,
    'Definite_assignment_assertions_can_only_be_used_along_with_a_type_annotation_1258',
    'Definite assignment assertions can only be used along with a type annotation.'
  ),
  Module_0_can_only_be_default_imported_using_the_1_flag: new Message(
    1259,
    Category.Error,
    'Module_0_can_only_be_default_imported_using_the_1_flag_1259',
    "Module '{0}' can only be default-imported using the '{1}' flag"
  ),
  Keywords_cannot_contain_escape_characters: new Message(1260, Category.Error, 'Keywords_cannot_contain_escape_characters_1260', 'Keywords cannot contain escape characters.'),
  Already_included_file_name_0_differs_from_file_name_1_only_in_casing: new Message(
    1261,
    Category.Error,
    'Already_included_file_name_0_differs_from_file_name_1_only_in_casing_1261',
    "Already included file name '{0}' differs from file name '{1}' only in casing."
  ),
  with_statements_are_not_allowed_in_an_async_function_block: new Message(
    1300,
    Category.Error,
    'with_statements_are_not_allowed_in_an_async_function_block_1300',
    "'with' statements are not allowed in an async function block."
  ),
  await_expressions_are_only_allowed_within_async_functions_and_at_the_top_levels_of_modules: new Message(
    1308,
    Category.Error,
    'await_expressions_are_only_allowed_within_async_functions_and_at_the_top_levels_of_modules_1308',
    "'await' expressions are only allowed within async functions and at the top levels of modules."
  ),
  can_only_be_used_in_an_object_literal_property_inside_a_destructuring_assignment: new Message(
    1312,
    Category.Error,
    'can_only_be_used_in_an_object_literal_property_inside_a_destructuring_assignment_1312',
    "'=' can only be used in an object literal property inside a destructuring assignment."
  ),
  The_body_of_an_if_statement_cannot_be_the_empty_statement: new Message(
    1313,
    Category.Error,
    'The_body_of_an_if_statement_cannot_be_the_empty_statement_1313',
    "The body of an 'if' statement cannot be the empty statement."
  ),
  Global_module_exports_may_only_appear_in_module_files: new Message(
    1314,
    Category.Error,
    'Global_module_exports_may_only_appear_in_module_files_1314',
    'Global module exports may only appear in module files.'
  ),
  Global_module_exports_may_only_appear_in_declaration_files: new Message(
    1315,
    Category.Error,
    'Global_module_exports_may_only_appear_in_declaration_files_1315',
    'Global module exports may only appear in declaration files.'
  ),
  Global_module_exports_may_only_appear_at_top_level: new Message(
    1316,
    Category.Error,
    'Global_module_exports_may_only_appear_at_top_level_1316',
    'Global module exports may only appear at top level.'
  ),
  A_parameter_property_cannot_be_declared_using_a_rest_parameter: new Message(
    1317,
    Category.Error,
    'A_parameter_property_cannot_be_declared_using_a_rest_parameter_1317',
    'A parameter property cannot be declared using a rest parameter.'
  ),
  An_abstract_accessor_cannot_have_an_implementation: new Message(
    1318,
    Category.Error,
    'An_abstract_accessor_cannot_have_an_implementation_1318',
    'An abstract accessor cannot have an implementation.'
  ),
  A_default_export_can_only_be_used_in_an_ECMAScript_style_module: new Message(
    1319,
    Category.Error,
    'A_default_export_can_only_be_used_in_an_ECMAScript_style_module_1319',
    'A default export can only be used in an ECMAScript-style module.'
  ),
  Type_of_await_operand_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member: new Message(
    1320,
    Category.Error,
    'Type_of_await_operand_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member_1320',
    "Type of 'await' operand must either be a valid promise or must not contain a callable 'then' member."
  ),
  Type_of_yield_operand_in_an_async_generator_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member: new Message(
    1321,
    Category.Error,
    'Type_of_yield_operand_in_an_async_generator_must_either_be_a_valid_promise_or_must_not_contain_a_cal_1321',
    "Type of 'yield' operand in an async generator must either be a valid promise or must not contain a callable 'then' member."
  ),
  Type_of_iterated_elements_of_a_yield_Asterisk_operand_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member: new Message(
    1322,
    Category.Error,
    'Type_of_iterated_elements_of_a_yield_Asterisk_operand_must_either_be_a_valid_promise_or_must_not_con_1322',
    "Type of iterated elements of a 'yield*' operand must either be a valid promise or must not contain a callable 'then' member."
  ),
  Dynamic_imports_are_only_supported_when_the_module_flag_is_set_to_es2020_esnext_commonjs_amd_system_or_umd: new Message(
    1323,
    Category.Error,
    'Dynamic_imports_are_only_supported_when_the_module_flag_is_set_to_es2020_esnext_commonjs_amd_system__1323',
    "Dynamic imports are only supported when the '--module' flag is set to 'es2020', 'esnext', 'commonjs', 'amd', 'system', or 'umd'."
  ),
  Dynamic_import_must_have_one_specifier_as_an_argument: new Message(
    1324,
    Category.Error,
    'Dynamic_import_must_have_one_specifier_as_an_argument_1324',
    'Dynamic import must have one specifier as an argument.'
  ),
  Specifier_of_dynamic_import_cannot_be_spread_element: new Message(
    1325,
    Category.Error,
    'Specifier_of_dynamic_import_cannot_be_spread_element_1325',
    'Specifier of dynamic import cannot be spread element.'
  ),
  Dynamic_import_cannot_have_type_arguments: new Message(1326, Category.Error, 'Dynamic_import_cannot_have_type_arguments_1326', 'Dynamic import cannot have type arguments'),
  String_literal_with_double_quotes_expected: new Message(1327, Category.Error, 'String_literal_with_double_quotes_expected_1327', 'String literal with double quotes expected.'),
  Property_value_can_only_be_string_literal_numeric_literal_true_false_null_object_literal_or_array_literal: new Message(
    1328,
    Category.Error,
    'Property_value_can_only_be_string_literal_numeric_literal_true_false_null_object_literal_or_array_li_1328',
    "Property value can only be string literal, numeric literal, 'true', 'false', 'null', object literal or array literal."
  ),
  _0_accepts_too_few_arguments_to_be_used_as_a_decorator_here_Did_you_mean_to_call_it_first_and_write_0: new Message(
    1329,
    Category.Error,
    '_0_accepts_too_few_arguments_to_be_used_as_a_decorator_here_Did_you_mean_to_call_it_first_and_write__1329',
    "'{0}' accepts too few arguments to be used as a decorator here. Did you mean to call it first and write '@{0}()'?"
  ),
  A_property_of_an_interface_or_type_literal_whose_type_is_a_unique_symbol_type_must_be_readonly: new Message(
    1330,
    Category.Error,
    'A_property_of_an_interface_or_type_literal_whose_type_is_a_unique_symbol_type_must_be_readonly_1330',
    "A property of an interface or type literal whose type is a 'unique symbol' type must be 'readonly'."
  ),
  A_property_of_a_class_whose_type_is_a_unique_symbol_type_must_be_both_static_and_readonly: new Message(
    1331,
    Category.Error,
    'A_property_of_a_class_whose_type_is_a_unique_symbol_type_must_be_both_static_and_readonly_1331',
    "A property of a class whose type is a 'unique symbol' type must be both 'static' and 'readonly'."
  ),
  A_variable_whose_type_is_a_unique_symbol_type_must_be_const: new Message(
    1332,
    Category.Error,
    'A_variable_whose_type_is_a_unique_symbol_type_must_be_const_1332',
    "A variable whose type is a 'unique symbol' type must be 'const'."
  ),
  unique_symbol_types_may_not_be_used_on_a_variable_declaration_with_a_binding_name: new Message(
    1333,
    Category.Error,
    'unique_symbol_types_may_not_be_used_on_a_variable_declaration_with_a_binding_name_1333',
    "'unique symbol' types may not be used on a variable declaration with a binding name."
  ),
  unique_symbol_types_are_only_allowed_on_variables_in_a_variable_statement: new Message(
    1334,
    Category.Error,
    'unique_symbol_types_are_only_allowed_on_variables_in_a_variable_statement_1334',
    "'unique symbol' types are only allowed on variables in a variable statement."
  ),
  unique_symbol_types_are_not_allowed_here: new Message(1335, Category.Error, 'unique_symbol_types_are_not_allowed_here_1335', "'unique symbol' types are not allowed here."),
  An_index_signature_parameter_type_cannot_be_a_type_alias_Consider_writing_0_Colon_1_Colon_2_instead: new Message(
    1336,
    Category.Error,
    'An_index_signature_parameter_type_cannot_be_a_type_alias_Consider_writing_0_Colon_1_Colon_2_instead_1336',
    "An index signature parameter type cannot be a type alias. Consider writing '[{0}: {1}]: {2}' instead."
  ),
  An_index_signature_parameter_type_cannot_be_a_union_type_Consider_using_a_mapped_object_type_instead: new Message(
    1337,
    Category.Error,
    'An_index_signature_parameter_type_cannot_be_a_union_type_Consider_using_a_mapped_object_type_instead_1337',
    'An index signature parameter type cannot be a union type. Consider using a mapped object type instead.'
  ),
  infer_declarations_are_only_permitted_in_the_extends_clause_of_a_conditional_type: new Message(
    1338,
    Category.Error,
    'infer_declarations_are_only_permitted_in_the_extends_clause_of_a_conditional_type_1338',
    "'infer' declarations are only permitted in the 'extends' clause of a conditional type."
  ),
  Module_0_does_not_refer_to_a_value_but_is_used_as_a_value_here: new Message(
    1339,
    Category.Error,
    'Module_0_does_not_refer_to_a_value_but_is_used_as_a_value_here_1339',
    "Module '{0}' does not refer to a value, but is used as a value here."
  ),
  Module_0_does_not_refer_to_a_type_but_is_used_as_a_type_here_Did_you_mean_typeof_import_0: new Message(
    1340,
    Category.Error,
    'Module_0_does_not_refer_to_a_type_but_is_used_as_a_type_here_Did_you_mean_typeof_import_0_1340',
    "Module '{0}' does not refer to a type, but is used as a type here. Did you mean 'typeof import('{0}')'?"
  ),
  Type_arguments_cannot_be_used_here: new Message(1342, Category.Error, 'Type_arguments_cannot_be_used_here_1342', 'Type arguments cannot be used here.'),
  The_import_meta_meta_property_is_only_allowed_when_the_module_option_is_esnext_or_system: new Message(
    1343,
    Category.Error,
    'The_import_meta_meta_property_is_only_allowed_when_the_module_option_is_esnext_or_system_1343',
    "The 'import.meta' meta-property is only allowed when the '--module' option is 'esnext' or 'system'."
  ),
  A_label_is_not_allowed_here: new Message(1344, Category.Error, 'A_label_is_not_allowed_here_1344', "'A label is not allowed here."),
  An_expression_of_type_void_cannot_be_tested_for_truthiness: new Message(
    1345,
    Category.Error,
    'An_expression_of_type_void_cannot_be_tested_for_truthiness_1345',
    "An expression of type 'void' cannot be tested for truthiness"
  ),
  This_parameter_is_not_allowed_with_use_strict_directive: new Message(
    1346,
    Category.Error,
    'This_parameter_is_not_allowed_with_use_strict_directive_1346',
    "This parameter is not allowed with 'use strict' directive."
  ),
  use_strict_directive_cannot_be_used_with_non_simple_parameter_list: new Message(
    1347,
    Category.Error,
    'use_strict_directive_cannot_be_used_with_non_simple_parameter_list_1347',
    "'use strict' directive cannot be used with non-simple parameter list."
  ),
  Non_simple_parameter_declared_here: new Message(1348, Category.Error, 'Non_simple_parameter_declared_here_1348', 'Non-simple parameter declared here.'),
  use_strict_directive_used_here: new Message(1349, Category.Error, 'use_strict_directive_used_here_1349', "'use strict' directive used here."),
  Print_the_final_configuration_instead_of_building: new Message(
    1350,
    Category.Message,
    'Print_the_final_configuration_instead_of_building_1350',
    'Print the final configuration instead of building.'
  ),
  An_identifier_or_keyword_cannot_immediately_follow_a_numeric_literal: new Message(
    1351,
    Category.Error,
    'An_identifier_or_keyword_cannot_immediately_follow_a_numeric_literal_1351',
    'An identifier or keyword cannot immediately follow a numeric literal.'
  ),
  A_bigint_literal_cannot_use_exponential_notation: new Message(1352, Category.Error, 'A_bigint_literal_cannot_use_exponential_notation_1352', 'A bigint literal cannot use exponential notation.'),
  A_bigint_literal_must_be_an_integer: new Message(1353, Category.Error, 'A_bigint_literal_must_be_an_integer_1353', 'A bigint literal must be an integer.'),
  readonly_type_modifier_is_only_permitted_on_array_and_tuple_literal_types: new Message(
    1354,
    Category.Error,
    'readonly_type_modifier_is_only_permitted_on_array_and_tuple_literal_types_1354',
    "'readonly' type modifier is only permitted on array and tuple literal types."
  ),
  A_const_assertions_can_only_be_applied_to_references_to_enum_members_or_string_number_boolean_array_or_object_literals: new Message(
    1355,
    Category.Error,
    'A_const_assertions_can_only_be_applied_to_references_to_enum_members_or_string_number_boolean_array__1355',
    "A 'const' assertions can only be applied to references to enum members, or string, number, boolean, array, or object literals."
  ),
  Did_you_mean_to_mark_this_function_as_async: new Message(1356, Category.Error, 'Did_you_mean_to_mark_this_function_as_async_1356', "Did you mean to mark this function as 'async'?"),
  An_enum_member_name_must_be_followed_by_a_or: new Message(1357, Category.Error, 'An_enum_member_name_must_be_followed_by_a_or_1357', "An enum member name must be followed by a ',', '=', or '}'."),
  Tagged_template_expressions_are_not_permitted_in_an_optional_chain: new Message(
    1358,
    Category.Error,
    'Tagged_template_expressions_are_not_permitted_in_an_optional_chain_1358',
    'Tagged template expressions are not permitted in an optional chain.'
  ),
  Identifier_expected_0_is_a_reserved_word_that_cannot_be_used_here: new Message(
    1359,
    Category.Error,
    'Identifier_expected_0_is_a_reserved_word_that_cannot_be_used_here_1359',
    "Identifier expected. '{0}' is a reserved word that cannot be used here."
  ),
  Did_you_mean_to_parenthesize_this_function_type: new Message(1360, Category.Error, 'Did_you_mean_to_parenthesize_this_function_type_1360', 'Did you mean to parenthesize this function type?'),
  _0_cannot_be_used_as_a_value_because_it_was_imported_using_import_type: new Message(
    1361,
    Category.Error,
    '_0_cannot_be_used_as_a_value_because_it_was_imported_using_import_type_1361',
    "'{0}' cannot be used as a value because it was imported using 'import type'."
  ),
  _0_cannot_be_used_as_a_value_because_it_was_exported_using_export_type: new Message(
    1362,
    Category.Error,
    '_0_cannot_be_used_as_a_value_because_it_was_exported_using_export_type_1362',
    "'{0}' cannot be used as a value because it was exported using 'export type'."
  ),
  A_type_only_import_can_specify_a_default_import_or_named_bindings_but_not_both: new Message(
    1363,
    Category.Error,
    'A_type_only_import_can_specify_a_default_import_or_named_bindings_but_not_both_1363',
    'A type-only import can specify a default import or named bindings, but not both.'
  ),
  Convert_to_type_only_export: new Message(1364, Category.Message, 'Convert_to_type_only_export_1364', 'Convert to type-only export'),
  Convert_all_re_exported_types_to_type_only_exports: new Message(
    1365,
    Category.Message,
    'Convert_all_re_exported_types_to_type_only_exports_1365',
    'Convert all re-exported types to type-only exports'
  ),
  Split_into_two_separate_import_declarations: new Message(1366, Category.Message, 'Split_into_two_separate_import_declarations_1366', 'Split into two separate import declarations'),
  Split_all_invalid_type_only_imports: new Message(1367, Category.Message, 'Split_all_invalid_type_only_imports_1367', 'Split all invalid type-only imports'),
  Specify_emit_Slashchecking_behavior_for_imports_that_are_only_used_for_types: new Message(
    1368,
    Category.Message,
    'Specify_emit_Slashchecking_behavior_for_imports_that_are_only_used_for_types_1368',
    'Specify emit/checking behavior for imports that are only used for types'
  ),
  Did_you_mean_0: new Message(1369, Category.Message, 'Did_you_mean_0_1369', "Did you mean '{0}'?"),
  Only_ECMAScript_imports_may_use_import_type: new Message(1370, Category.Error, 'Only_ECMAScript_imports_may_use_import_type_1370', "Only ECMAScript imports may use 'import type'."),
  This_import_is_never_used_as_a_value_and_must_use_import_type_because_the_importsNotUsedAsValues_is_set_to_error: new Message(
    1371,
    Category.Error,
    'This_import_is_never_used_as_a_value_and_must_use_import_type_because_the_importsNotUsedAsValues_is__1371',
    "This import is never used as a value and must use 'import type' because the 'importsNotUsedAsValues' is set to 'error'."
  ),
  Convert_to_type_only_import: new Message(1373, Category.Message, 'Convert_to_type_only_import_1373', 'Convert to type-only import'),
  Convert_all_imports_not_used_as_a_value_to_type_only_imports: new Message(
    1374,
    Category.Message,
    'Convert_all_imports_not_used_as_a_value_to_type_only_imports_1374',
    'Convert all imports not used as a value to type-only imports'
  ),
  await_expressions_are_only_allowed_at_the_top_level_of_a_file_when_that_file_is_a_module_but_this_file_has_no_imports_or_exports_Consider_adding_an_empty_export_to_make_this_file_a_module: new Message(
    1375,
    Category.Error,
    'await_expressions_are_only_allowed_at_the_top_level_of_a_file_when_that_file_is_a_module_but_this_fi_1375',
    "'await' expressions are only allowed at the top level of a file when that file is a module, but this file has no imports or exports. Consider adding an empty 'export {}' to make this file a module."
  ),
  _0_was_imported_here: new Message(1376, Category.Message, '_0_was_imported_here_1376', "'{0}' was imported here."),
  _0_was_exported_here: new Message(1377, Category.Message, '_0_was_exported_here_1377', "'{0}' was exported here."),
  Top_level_await_expressions_are_only_allowed_when_the_module_option_is_set_to_esnext_or_system_and_the_target_option_is_set_to_es2017_or_higher: new Message(
    1378,
    Category.Error,
    'Top_level_await_expressions_are_only_allowed_when_the_module_option_is_set_to_esnext_or_system_and_t_1378',
    "Top-level 'await' expressions are only allowed when the 'module' option is set to 'esnext' or 'system', and the 'target' option is set to 'es2017' or higher."
  ),
  An_import_alias_cannot_reference_a_declaration_that_was_exported_using_export_type: new Message(
    1379,
    Category.Error,
    'An_import_alias_cannot_reference_a_declaration_that_was_exported_using_export_type_1379',
    "An import alias cannot reference a declaration that was exported using 'export type'."
  ),
  An_import_alias_cannot_reference_a_declaration_that_was_imported_using_import_type: new Message(
    1380,
    Category.Error,
    'An_import_alias_cannot_reference_a_declaration_that_was_imported_using_import_type_1380',
    "An import alias cannot reference a declaration that was imported using 'import type'."
  ),
  Unexpected_token_Did_you_mean_or_rbrace: new Message(1381, Category.Error, 'Unexpected_token_Did_you_mean_or_rbrace_1381', "Unexpected token. Did you mean `{'}'}` or `&rbrace;`?"),
  Unexpected_token_Did_you_mean_or_gt: new Message(1382, Category.Error, 'Unexpected_token_Did_you_mean_or_gt_1382', "Unexpected token. Did you mean `{'>'}` or `&gt;`?"),
  Only_named_exports_may_use_export_type: new Message(1383, Category.Error, 'Only_named_exports_may_use_export_type_1383', "Only named exports may use 'export type'."),
  A_new_expression_with_type_arguments_must_always_be_followed_by_a_parenthesized_argument_list: new Message(
    1384,
    Category.Error,
    'A_new_expression_with_type_arguments_must_always_be_followed_by_a_parenthesized_argument_list_1384',
    "A 'new' expression with type arguments must always be followed by a parenthesized argument list."
  ),
  The_types_of_0_are_incompatible_between_these_types: new Message(
    2200,
    Category.Error,
    'The_types_of_0_are_incompatible_between_these_types_2200',
    "The types of '{0}' are incompatible between these types."
  ),
  The_types_returned_by_0_are_incompatible_between_these_types: new Message(
    2201,
    Category.Error,
    'The_types_returned_by_0_are_incompatible_between_these_types_2201',
    "The types returned by '{0}' are incompatible between these types."
  ),
  Call_signature_return_types_0_and_1_are_incompatible: new Message(
    2202,
    Category.Error,
    'Call_signature_return_types_0_and_1_are_incompatible_2202',
    "Call signature return types '{0}' and '{1}' are incompatible.",
    undefined,
    true
  ),
  Construct_signature_return_types_0_and_1_are_incompatible: new Message(
    2203,
    Category.Error,
    'Construct_signature_return_types_0_and_1_are_incompatible_2203',
    "Construct signature return types '{0}' and '{1}' are incompatible.",
    undefined,
    true
  ),
  Call_signatures_with_no_arguments_have_incompatible_return_types_0_and_1: new Message(
    2204,
    Category.Error,
    'Call_signatures_with_no_arguments_have_incompatible_return_types_0_and_1_2204',
    "Call signatures with no arguments have incompatible return types '{0}' and '{1}'.",
    undefined,
    true
  ),
  Construct_signatures_with_no_arguments_have_incompatible_return_types_0_and_1: new Message(
    2205,
    Category.Error,
    'Construct_signatures_with_no_arguments_have_incompatible_return_types_0_and_1_2205',
    "Construct signatures with no arguments have incompatible return types '{0}' and '{1}'.",
    undefined,
    true
  ),
  Duplicate_identifier_0: new Message(2300, Category.Error, 'Duplicate_identifier_0_2300', "Duplicate identifier '{0}'."),
  Initer_of_instance_member_variable_0_cannot_reference_identifier_1_declared_in_the_constructor: new Message(
    2301,
    Category.Error,
    'Initer_of_instance_member_variable_0_cannot_reference_identifier_1_declared_in_the_constructor_2301',
    "Initer of instance member variable '{0}' cannot reference identifier '{1}' declared in the constructor."
  ),
  Static_members_cannot_reference_class_type_parameters: new Message(
    2302,
    Category.Error,
    'Static_members_cannot_reference_class_type_parameters_2302',
    'Static members cannot reference class type parameters.'
  ),
  Circular_definition_of_import_alias_0: new Message(2303, Category.Error, 'Circular_definition_of_import_alias_0_2303', "Circular definition of import alias '{0}'."),
  Cannot_find_name_0: new Message(2304, Category.Error, 'Cannot_find_name_0_2304', "Cannot find name '{0}'."),
  Module_0_has_no_exported_member_1: new Message(2305, Category.Error, 'Module_0_has_no_exported_member_1_2305', "Module '{0}' has no exported member '{1}'."),
  File_0_is_not_a_module: new Message(2306, Category.Error, 'File_0_is_not_a_module_2306', "File '{0}' is not a module."),
  Cannot_find_module_0_or_its_corresponding_type_declarations: new Message(
    2307,
    Category.Error,
    'Cannot_find_module_0_or_its_corresponding_type_declarations_2307',
    "Cannot find module '{0}' or its corresponding type declarations."
  ),
  Module_0_has_already_exported_a_member_named_1_Consider_explicitly_re_exporting_to_resolve_the_ambiguity: new Message(
    2308,
    Category.Error,
    'Module_0_has_already_exported_a_member_named_1_Consider_explicitly_re_exporting_to_resolve_the_ambig_2308',
    "Module {0} has already exported a member named '{1}'. Consider explicitly re-exporting to resolve the ambiguity."
  ),
  An_export_assignment_cannot_be_used_in_a_module_with_other_exported_elements: new Message(
    2309,
    Category.Error,
    'An_export_assignment_cannot_be_used_in_a_module_with_other_exported_elements_2309',
    'An export assignment cannot be used in a module with other exported elements.'
  ),
  Type_0_recursively_references_itself_as_a_base_type: new Message(
    2310,
    Category.Error,
    'Type_0_recursively_references_itself_as_a_base_type_2310',
    "Type '{0}' recursively references itself as a base type."
  ),
  A_class_may_only_extend_another_class: new Message(2311, Category.Error, 'A_class_may_only_extend_another_class_2311', 'A class may only extend another class.'),
  An_interface_can_only_extend_an_object_type_or_intersection_of_object_types_with_statically_known_members: new Message(
    2312,
    Category.Error,
    'An_interface_can_only_extend_an_object_type_or_intersection_of_object_types_with_statically_known_me_2312',
    'An interface can only extend an object type or intersection of object types with statically known members.'
  ),
  Type_parameter_0_has_a_circular_constraint: new Message(2313, Category.Error, 'Type_parameter_0_has_a_circular_constraint_2313', "Type parameter '{0}' has a circular constraint."),
  Generic_type_0_requires_1_type_argument_s: new Message(2314, Category.Error, 'Generic_type_0_requires_1_type_argument_s_2314', "Generic type '{0}' requires {1} type argument(s)."),
  Type_0_is_not_generic: new Message(2315, Category.Error, 'Type_0_is_not_generic_2315', "Type '{0}' is not generic."),
  Global_type_0_must_be_a_class_or_interface_type: new Message(2316, Category.Error, 'Global_type_0_must_be_a_class_or_interface_type_2316', "Global type '{0}' must be a class or interface type."),
  Global_type_0_must_have_1_type_parameter_s: new Message(2317, Category.Error, 'Global_type_0_must_have_1_type_parameter_s_2317', "Global type '{0}' must have {1} type parameter(s)."),
  Cannot_find_global_type_0: new Message(2318, Category.Error, 'Cannot_find_global_type_0_2318', "Cannot find global type '{0}'."),
  Named_property_0_of_types_1_and_2_are_not_identical: new Message(
    2319,
    Category.Error,
    'Named_property_0_of_types_1_and_2_are_not_identical_2319',
    "Named property '{0}' of types '{1}' and '{2}' are not identical."
  ),
  Interface_0_cannot_simultaneously_extend_types_1_and_2: new Message(
    2320,
    Category.Error,
    'Interface_0_cannot_simultaneously_extend_types_1_and_2_2320',
    "Interface '{0}' cannot simultaneously extend types '{1}' and '{2}'."
  ),
  Excessive_stack_depth_comparing_types_0_and_1: new Message(2321, Category.Error, 'Excessive_stack_depth_comparing_types_0_and_1_2321', "Excessive stack depth comparing types '{0}' and '{1}'."),
  Type_0_is_not_assignable_to_type_1: new Message(2322, Category.Error, 'Type_0_is_not_assignable_to_type_1_2322', "Type '{0}' is not assignable to type '{1}'."),
  Cannot_redeclare_exported_variable_0: new Message(2323, Category.Error, 'Cannot_redeclare_exported_variable_0_2323', "Cannot redeclare exported variable '{0}'."),
  Property_0_is_missing_in_type_1: new Message(2324, Category.Error, 'Property_0_is_missing_in_type_1_2324', "Property '{0}' is missing in type '{1}'."),
  Property_0_is_private_in_type_1_but_not_in_type_2: new Message(
    2325,
    Category.Error,
    'Property_0_is_private_in_type_1_but_not_in_type_2_2325',
    "Property '{0}' is private in type '{1}' but not in type '{2}'."
  ),
  Types_of_property_0_are_incompatible: new Message(2326, Category.Error, 'Types_of_property_0_are_incompatible_2326', "Types of property '{0}' are incompatible."),
  Property_0_is_optional_in_type_1_but_required_in_type_2: new Message(
    2327,
    Category.Error,
    'Property_0_is_optional_in_type_1_but_required_in_type_2_2327',
    "Property '{0}' is optional in type '{1}' but required in type '{2}'."
  ),
  Types_of_parameters_0_and_1_are_incompatible: new Message(2328, Category.Error, 'Types_of_parameters_0_and_1_are_incompatible_2328', "Types of parameters '{0}' and '{1}' are incompatible."),
  Index_signature_is_missing_in_type_0: new Message(2329, Category.Error, 'Index_signature_is_missing_in_type_0_2329', "Index signature is missing in type '{0}'."),
  Index_signatures_are_incompatible: new Message(2330, Category.Error, 'Index_signatures_are_incompatible_2330', 'Index signatures are incompatible.'),
  this_cannot_be_referenced_in_a_module_or_namespace_body: new Message(
    2331,
    Category.Error,
    'this_cannot_be_referenced_in_a_module_or_namespace_body_2331',
    "'this' cannot be referenced in a module or namespace body."
  ),
  this_cannot_be_referenced_in_current_location: new Message(2332, Category.Error, 'this_cannot_be_referenced_in_current_location_2332', "'this' cannot be referenced in current location."),
  this_cannot_be_referenced_in_constructor_arguments: new Message(
    2333,
    Category.Error,
    'this_cannot_be_referenced_in_constructor_arguments_2333',
    "'this' cannot be referenced in constructor arguments."
  ),
  this_cannot_be_referenced_in_a_static_property_initer: new Message(
    2334,
    Category.Error,
    'this_cannot_be_referenced_in_a_static_property_initer_2334',
    "'this' cannot be referenced in a static property initer."
  ),
  super_can_only_be_referenced_in_a_derived_class: new Message(2335, Category.Error, 'super_can_only_be_referenced_in_a_derived_class_2335', "'super' can only be referenced in a derived class."),
  super_cannot_be_referenced_in_constructor_arguments: new Message(
    2336,
    Category.Error,
    'super_cannot_be_referenced_in_constructor_arguments_2336',
    "'super' cannot be referenced in constructor arguments."
  ),
  Super_calls_are_not_permitted_outside_constructors_or_in_nested_functions_inside_constructors: new Message(
    2337,
    Category.Error,
    'Super_calls_are_not_permitted_outside_constructors_or_in_nested_functions_inside_constructors_2337',
    'Super calls are not permitted outside constructors or in nested functions inside constructors.'
  ),
  super_property_access_is_permitted_only_in_a_constructor_member_function_or_member_accessor_of_a_derived_class: new Message(
    2338,
    Category.Error,
    'super_property_access_is_permitted_only_in_a_constructor_member_function_or_member_accessor_of_a_der_2338',
    "'super' property access is permitted only in a constructor, member function, or member accessor of a derived class."
  ),
  Property_0_does_not_exist_on_type_1: new Message(2339, Category.Error, 'Property_0_does_not_exist_on_type_1_2339', "Property '{0}' does not exist on type '{1}'."),
  Only_public_and_protected_methods_of_the_base_class_are_accessible_via_the_super_keyword: new Message(
    2340,
    Category.Error,
    'Only_public_and_protected_methods_of_the_base_class_are_accessible_via_the_super_keyword_2340',
    "Only public and protected methods of the base class are accessible via the 'super' keyword."
  ),
  Property_0_is_private_and_only_accessible_within_class_1: new Message(
    2341,
    Category.Error,
    'Property_0_is_private_and_only_accessible_within_class_1_2341',
    "Property '{0}' is private and only accessible within class '{1}'."
  ),
  An_index_expression_argument_must_be_of_type_string_number_symbol_or_any: new Message(
    2342,
    Category.Error,
    'An_index_expression_argument_must_be_of_type_string_number_symbol_or_any_2342',
    "An index expression argument must be of type 'string', 'number', 'symbol', or 'any'."
  ),
  This_syntax_requires_an_imported_helper_named_1_which_does_not_exist_in_0_Consider_upgrading_your_version_of_0: new Message(
    2343,
    Category.Error,
    'This_syntax_requires_an_imported_helper_named_1_which_does_not_exist_in_0_Consider_upgrading_your_ve_2343',
    "This syntax requires an imported helper named '{1}' which does not exist in '{0}'. Consider upgrading your version of '{0}'."
  ),
  Type_0_does_not_satisfy_the_constraint_1: new Message(2344, Category.Error, 'Type_0_does_not_satisfy_the_constraint_1_2344', "Type '{0}' does not satisfy the constraint '{1}'."),
  Argument_of_type_0_is_not_assignable_to_parameter_of_type_1: new Message(
    2345,
    Category.Error,
    'Argument_of_type_0_is_not_assignable_to_parameter_of_type_1_2345',
    "Argument of type '{0}' is not assignable to parameter of type '{1}'."
  ),
  Call_target_does_not_contain_any_signatures: new Message(2346, Category.Error, 'Call_target_does_not_contain_any_signatures_2346', 'Call target does not contain any signatures.'),
  Untyped_function_calls_may_not_accept_type_arguments: new Message(
    2347,
    Category.Error,
    'Untyped_function_calls_may_not_accept_type_arguments_2347',
    'Untyped function calls may not accept type arguments.'
  ),
  Value_of_type_0_is_not_callable_Did_you_mean_to_include_new: new Message(
    2348,
    Category.Error,
    'Value_of_type_0_is_not_callable_Did_you_mean_to_include_new_2348',
    "Value of type '{0}' is not callable. Did you mean to include 'new'?"
  ),
  This_expression_is_not_callable: new Message(2349, Category.Error, 'This_expression_is_not_callable_2349', 'This expression is not callable.'),
  Only_a_void_function_can_be_called_with_the_new_keyword: new Message(
    2350,
    Category.Error,
    'Only_a_void_function_can_be_called_with_the_new_keyword_2350',
    "Only a void function can be called with the 'new' keyword."
  ),
  This_expression_is_not_constructable: new Message(2351, Category.Error, 'This_expression_is_not_constructable_2351', 'This expression is not constructable.'),
  Conversion_of_type_0_to_type_1_may_be_a_mistake_because_neither_type_sufficiently_overlaps_with_the_other_If_this_was_intentional_convert_the_expression_to_unknown_first: new Message(
    2352,
    Category.Error,
    'Conversion_of_type_0_to_type_1_may_be_a_mistake_because_neither_type_sufficiently_overlaps_with_the__2352',
    "Conversion of type '{0}' to type '{1}' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first."
  ),
  Object_literal_may_only_specify_known_properties_and_0_does_not_exist_in_type_1: new Message(
    2353,
    Category.Error,
    'Object_literal_may_only_specify_known_properties_and_0_does_not_exist_in_type_1_2353',
    "Object literal may only specify known properties, and '{0}' does not exist in type '{1}'."
  ),
  This_syntax_requires_an_imported_helper_but_module_0_cannot_be_found: new Message(
    2354,
    Category.Error,
    'This_syntax_requires_an_imported_helper_but_module_0_cannot_be_found_2354',
    "This syntax requires an imported helper but module '{0}' cannot be found."
  ),
  A_function_whose_declared_type_is_neither_void_nor_any_must_return_a_value: new Message(
    2355,
    Category.Error,
    'A_function_whose_declared_type_is_neither_void_nor_any_must_return_a_value_2355',
    "A function whose declared type is neither 'void' nor 'any' must return a value."
  ),
  An_arithmetic_operand_must_be_of_type_any_number_bigint_or_an_enum_type: new Message(
    2356,
    Category.Error,
    'An_arithmetic_operand_must_be_of_type_any_number_bigint_or_an_enum_type_2356',
    "An arithmetic operand must be of type 'any', 'number', 'bigint' or an enum type."
  ),
  The_operand_of_an_increment_or_decrement_operator_must_be_a_variable_or_a_property_access: new Message(
    2357,
    Category.Error,
    'The_operand_of_an_increment_or_decrement_operator_must_be_a_variable_or_a_property_access_2357',
    'The operand of an increment or decrement operator must be a variable or a property access.'
  ),
  The_left_hand_side_of_an_instanceof_expression_must_be_of_type_any_an_object_type_or_a_type_parameter: new Message(
    2358,
    Category.Error,
    'The_left_hand_side_of_an_instanceof_expression_must_be_of_type_any_an_object_type_or_a_type_paramete_2358',
    "The left-hand side of an 'instanceof' expression must be of type 'any', an object type or a type parameter."
  ),
  The_right_hand_side_of_an_instanceof_expression_must_be_of_type_any_or_of_a_type_assignable_to_the_Function_interface_type: new Message(
    2359,
    Category.Error,
    'The_right_hand_side_of_an_instanceof_expression_must_be_of_type_any_or_of_a_type_assignable_to_the_F_2359',
    "The right-hand side of an 'instanceof' expression must be of type 'any' or of a type assignable to the 'Function' interface type."
  ),
  The_left_hand_side_of_an_in_expression_must_be_of_type_any_string_number_or_symbol: new Message(
    2360,
    Category.Error,
    'The_left_hand_side_of_an_in_expression_must_be_of_type_any_string_number_or_symbol_2360',
    "The left-hand side of an 'in' expression must be of type 'any', 'string', 'number', or 'symbol'."
  ),
  The_right_hand_side_of_an_in_expression_must_be_of_type_any_an_object_type_or_a_type_parameter: new Message(
    2361,
    Category.Error,
    'The_right_hand_side_of_an_in_expression_must_be_of_type_any_an_object_type_or_a_type_parameter_2361',
    "The right-hand side of an 'in' expression must be of type 'any', an object type or a type parameter."
  ),
  The_left_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_bigint_or_an_enum_type: new Message(
    2362,
    Category.Error,
    'The_left_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_bigint_or_an_enum_type_2362',
    "The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type."
  ),
  The_right_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_bigint_or_an_enum_type: new Message(
    2363,
    Category.Error,
    'The_right_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_bigint_or_an_enum_type_2363',
    "The right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type."
  ),
  The_left_hand_side_of_an_assignment_expression_must_be_a_variable_or_a_property_access: new Message(
    2364,
    Category.Error,
    'The_left_hand_side_of_an_assignment_expression_must_be_a_variable_or_a_property_access_2364',
    'The left-hand side of an assignment expression must be a variable or a property access.'
  ),
  Operator_0_cannot_be_applied_to_types_1_and_2: new Message(2365, Category.Error, 'Operator_0_cannot_be_applied_to_types_1_and_2_2365', "Operator '{0}' cannot be applied to types '{1}' and '{2}'."),
  Function_lacks_ending_return_statement_and_return_type_does_not_include_undefined: new Message(
    2366,
    Category.Error,
    'Function_lacks_ending_return_statement_and_return_type_does_not_include_undefined_2366',
    "Function lacks ending return statement and return type does not include 'undefined'."
  ),
  This_condition_will_always_return_0_since_the_types_1_and_2_have_no_overlap: new Message(
    2367,
    Category.Error,
    'This_condition_will_always_return_0_since_the_types_1_and_2_have_no_overlap_2367',
    "This condition will always return '{0}' since the types '{1}' and '{2}' have no overlap."
  ),
  Type_parameter_name_cannot_be_0: new Message(2368, Category.Error, 'Type_parameter_name_cannot_be_0_2368', "Type parameter name cannot be '{0}'."),
  A_parameter_property_is_only_allowed_in_a_constructor_implementation: new Message(
    2369,
    Category.Error,
    'A_parameter_property_is_only_allowed_in_a_constructor_implementation_2369',
    'A parameter property is only allowed in a constructor implementation.'
  ),
  A_rest_parameter_must_be_of_an_array_type: new Message(2370, Category.Error, 'A_rest_parameter_must_be_of_an_array_type_2370', 'A rest parameter must be of an array type.'),
  A_parameter_initer_is_only_allowed_in_a_function_or_constructor_implementation: new Message(
    2371,
    Category.Error,
    'A_parameter_initer_is_only_allowed_in_a_function_or_constructor_implementation_2371',
    'A parameter initer is only allowed in a function or constructor implementation.'
  ),
  Parameter_0_cannot_reference_itself: new Message(2372, Category.Error, 'Parameter_0_cannot_reference_itself_2372', "Parameter '{0}' cannot reference itself."),
  Parameter_0_cannot_reference_identifier_1_declared_after_it: new Message(
    2373,
    Category.Error,
    'Parameter_0_cannot_reference_identifier_1_declared_after_it_2373',
    "Parameter '{0}' cannot reference identifier '{1}' declared after it."
  ),
  Duplicate_string_index_signature: new Message(2374, Category.Error, 'Duplicate_string_index_signature_2374', 'Duplicate string index signature.'),
  Duplicate_number_index_signature: new Message(2375, Category.Error, 'Duplicate_number_index_signature_2375', 'Duplicate number index signature.'),
  A_super_call_must_be_the_first_statement_in_the_constructor_when_a_class_contains_initialized_properties_parameter_properties_or_private_identifiers: new Message(
    2376,
    Category.Error,
    'A_super_call_must_be_the_first_statement_in_the_constructor_when_a_class_contains_initialized_proper_2376',
    "A 'super' call must be the first statement in the constructor when a class contains initialized properties, parameter properties, or private identifiers."
  ),
  Constructors_for_derived_classes_must_contain_a_super_call: new Message(
    2377,
    Category.Error,
    'Constructors_for_derived_classes_must_contain_a_super_call_2377',
    "Constructors for derived classes must contain a 'super' call."
  ),
  A_get_accessor_must_return_a_value: new Message(2378, Category.Error, 'A_get_accessor_must_return_a_value_2378', "A 'get' accessor must return a value."),
  Getter_and_setter_accessors_do_not_agree_in_visibility: new Message(
    2379,
    Category.Error,
    'Getter_and_setter_accessors_do_not_agree_in_visibility_2379',
    'Getter and setter accessors do not agree in visibility.'
  ),
  get_and_set_accessor_must_have_the_same_type: new Message(2380, Category.Error, 'get_and_set_accessor_must_have_the_same_type_2380', "'get' and 'set' accessor must have the same type."),
  A_signature_with_an_implementation_cannot_use_a_string_literal_type: new Message(
    2381,
    Category.Error,
    'A_signature_with_an_implementation_cannot_use_a_string_literal_type_2381',
    'A signature with an implementation cannot use a string literal type.'
  ),
  Specialized_overload_signature_is_not_assignable_to_any_non_specialized_signature: new Message(
    2382,
    Category.Error,
    'Specialized_overload_signature_is_not_assignable_to_any_non_specialized_signature_2382',
    'Specialized overload signature is not assignable to any non-specialized signature.'
  ),
  Overload_signatures_must_all_be_exported_or_non_exported: new Message(
    2383,
    Category.Error,
    'Overload_signatures_must_all_be_exported_or_non_exported_2383',
    'Overload signatures must all be exported or non-exported.'
  ),
  Overload_signatures_must_all_be_ambient_or_non_ambient: new Message(
    2384,
    Category.Error,
    'Overload_signatures_must_all_be_ambient_or_non_ambient_2384',
    'Overload signatures must all be ambient or non-ambient.'
  ),
  Overload_signatures_must_all_be_public_private_or_protected: new Message(
    2385,
    Category.Error,
    'Overload_signatures_must_all_be_public_private_or_protected_2385',
    'Overload signatures must all be public, private or protected.'
  ),
  Overload_signatures_must_all_be_optional_or_required: new Message(
    2386,
    Category.Error,
    'Overload_signatures_must_all_be_optional_or_required_2386',
    'Overload signatures must all be optional or required.'
  ),
  Function_overload_must_be_static: new Message(2387, Category.Error, 'Function_overload_must_be_static_2387', 'Function overload must be static.'),
  Function_overload_must_not_be_static: new Message(2388, Category.Error, 'Function_overload_must_not_be_static_2388', 'Function overload must not be static.'),
  Function_implementation_name_must_be_0: new Message(2389, Category.Error, 'Function_implementation_name_must_be_0_2389', "Function implementation name must be '{0}'."),
  Constructor_implementation_is_missing: new Message(2390, Category.Error, 'Constructor_implementation_is_missing_2390', 'Constructor implementation is missing.'),
  Function_implementation_is_missing_or_not_immediately_following_the_declaration: new Message(
    2391,
    Category.Error,
    'Function_implementation_is_missing_or_not_immediately_following_the_declaration_2391',
    'Function implementation is missing or not immediately following the declaration.'
  ),
  Multiple_constructor_implementations_are_not_allowed: new Message(
    2392,
    Category.Error,
    'Multiple_constructor_implementations_are_not_allowed_2392',
    'Multiple constructor implementations are not allowed.'
  ),
  Duplicate_function_implementation: new Message(2393, Category.Error, 'Duplicate_function_implementation_2393', 'Duplicate function implementation.'),
  This_overload_signature_is_not_compatible_with_its_implementation_signature: new Message(
    2394,
    Category.Error,
    'This_overload_signature_is_not_compatible_with_its_implementation_signature_2394',
    'This overload signature is not compatible with its implementation signature.'
  ),
  Individual_declarations_in_merged_declaration_0_must_be_all_exported_or_all_local: new Message(
    2395,
    Category.Error,
    'Individual_declarations_in_merged_declaration_0_must_be_all_exported_or_all_local_2395',
    "Individual declarations in merged declaration '{0}' must be all exported or all local."
  ),
  Duplicate_identifier_arguments_Compiler_uses_arguments_to_initialize_rest_parameters: new Message(
    2396,
    Category.Error,
    'Duplicate_identifier_arguments_Compiler_uses_arguments_to_initialize_rest_parameters_2396',
    "Duplicate identifier 'arguments'. Compiler uses 'arguments' to initialize rest parameters."
  ),
  Declaration_name_conflicts_with_built_in_global_identifier_0: new Message(
    2397,
    Category.Error,
    'Declaration_name_conflicts_with_built_in_global_identifier_0_2397',
    "Declaration name conflicts with built-in global identifier '{0}'."
  ),
  constructor_cannot_be_used_as_a_parameter_property_name: new Message(
    2398,
    Category.Error,
    'constructor_cannot_be_used_as_a_parameter_property_name_2398',
    "'constructor' cannot be used as a parameter property name."
  ),
  Duplicate_identifier_this_Compiler_uses_variable_declaration_this_to_capture_this_reference: new Message(
    2399,
    Category.Error,
    'Duplicate_identifier_this_Compiler_uses_variable_declaration_this_to_capture_this_reference_2399',
    "Duplicate identifier '_this'. Compiler uses variable declaration '_this' to capture 'this' reference."
  ),
  Expression_resolves_to_variable_declaration_this_that_compiler_uses_to_capture_this_reference: new Message(
    2400,
    Category.Error,
    'Expression_resolves_to_variable_declaration_this_that_compiler_uses_to_capture_this_reference_2400',
    "Expression resolves to variable declaration '_this' that compiler uses to capture 'this' reference."
  ),
  Duplicate_identifier_super_Compiler_uses_super_to_capture_base_class_reference: new Message(
    2401,
    Category.Error,
    'Duplicate_identifier_super_Compiler_uses_super_to_capture_base_class_reference_2401',
    "Duplicate identifier '_super'. Compiler uses '_super' to capture base class reference."
  ),
  Expression_resolves_to_super_that_compiler_uses_to_capture_base_class_reference: new Message(
    2402,
    Category.Error,
    'Expression_resolves_to_super_that_compiler_uses_to_capture_base_class_reference_2402',
    "Expression resolves to '_super' that compiler uses to capture base class reference."
  ),
  Subsequent_variable_declarations_must_have_the_same_type_Variable_0_must_be_of_type_1_but_here_has_type_2: new Message(
    2403,
    Category.Error,
    'Subsequent_variable_declarations_must_have_the_same_type_Variable_0_must_be_of_type_1_but_here_has_t_2403',
    "Subsequent variable declarations must have the same type.  Variable '{0}' must be of type '{1}', but here has type '{2}'."
  ),
  The_left_hand_side_of_a_for_in_statement_cannot_use_a_type_annotation: new Message(
    2404,
    Category.Error,
    'The_left_hand_side_of_a_for_in_statement_cannot_use_a_type_annotation_2404',
    "The left-hand side of a 'for...in' statement cannot use a type annotation."
  ),
  The_left_hand_side_of_a_for_in_statement_must_be_of_type_string_or_any: new Message(
    2405,
    Category.Error,
    'The_left_hand_side_of_a_for_in_statement_must_be_of_type_string_or_any_2405',
    "The left-hand side of a 'for...in' statement must be of type 'string' or 'any'."
  ),
  The_left_hand_side_of_a_for_in_statement_must_be_a_variable_or_a_property_access: new Message(
    2406,
    Category.Error,
    'The_left_hand_side_of_a_for_in_statement_must_be_a_variable_or_a_property_access_2406',
    "The left-hand side of a 'for...in' statement must be a variable or a property access."
  ),
  The_right_hand_side_of_a_for_in_statement_must_be_of_type_any_an_object_type_or_a_type_parameter_but_here_has_type_0: new Message(
    2407,
    Category.Error,
    'The_right_hand_side_of_a_for_in_statement_must_be_of_type_any_an_object_type_or_a_type_parameter_but_2407',
    "The right-hand side of a 'for...in' statement must be of type 'any', an object type or a type parameter, but here has type '{0}'."
  ),
  Setters_cannot_return_a_value: new Message(2408, Category.Error, 'Setters_cannot_return_a_value_2408', 'Setters cannot return a value.'),
  Return_type_of_constructor_signature_must_be_assignable_to_the_instance_type_of_the_class: new Message(
    2409,
    Category.Error,
    'Return_type_of_constructor_signature_must_be_assignable_to_the_instance_type_of_the_class_2409',
    'Return type of constructor signature must be assignable to the instance type of the class.'
  ),
  The_with_statement_is_not_supported_All_symbols_in_a_with_block_will_have_type_any: new Message(
    2410,
    Category.Error,
    'The_with_statement_is_not_supported_All_symbols_in_a_with_block_will_have_type_any_2410',
    "The 'with' statement is not supported. All symbols in a 'with' block will have type 'any'."
  ),
  Property_0_of_type_1_is_not_assignable_to_string_index_type_2: new Message(
    2411,
    Category.Error,
    'Property_0_of_type_1_is_not_assignable_to_string_index_type_2_2411',
    "Property '{0}' of type '{1}' is not assignable to string index type '{2}'."
  ),
  Property_0_of_type_1_is_not_assignable_to_numeric_index_type_2: new Message(
    2412,
    Category.Error,
    'Property_0_of_type_1_is_not_assignable_to_numeric_index_type_2_2412',
    "Property '{0}' of type '{1}' is not assignable to numeric index type '{2}'."
  ),
  Numeric_index_type_0_is_not_assignable_to_string_index_type_1: new Message(
    2413,
    Category.Error,
    'Numeric_index_type_0_is_not_assignable_to_string_index_type_1_2413',
    "Numeric index type '{0}' is not assignable to string index type '{1}'."
  ),
  Class_name_cannot_be_0: new Message(2414, Category.Error, 'Class_name_cannot_be_0_2414', "Class name cannot be '{0}'."),
  Class_0_incorrectly_extends_base_class_1: new Message(2415, Category.Error, 'Class_0_incorrectly_extends_base_class_1_2415', "Class '{0}' incorrectly extends base class '{1}'."),
  Property_0_in_type_1_is_not_assignable_to_the_same_property_in_base_type_2: new Message(
    2416,
    Category.Error,
    'Property_0_in_type_1_is_not_assignable_to_the_same_property_in_base_type_2_2416',
    "Property '{0}' in type '{1}' is not assignable to the same property in base type '{2}'."
  ),
  Class_static_side_0_incorrectly_extends_base_class_static_side_1: new Message(
    2417,
    Category.Error,
    'Class_static_side_0_incorrectly_extends_base_class_static_side_1_2417',
    "Class static side '{0}' incorrectly extends base class static side '{1}'."
  ),
  Type_of_computed_property_s_value_is_0_which_is_not_assignable_to_type_1: new Message(
    2418,
    Category.Error,
    'Type_of_computed_property_s_value_is_0_which_is_not_assignable_to_type_1_2418',
    "Type of computed property's value is '{0}', which is not assignable to type '{1}'."
  ),
  Class_0_incorrectly_implements_interface_1: new Message(2420, Category.Error, 'Class_0_incorrectly_implements_interface_1_2420', "Class '{0}' incorrectly implements interface '{1}'."),
  A_class_can_only_implement_an_object_type_or_intersection_of_object_types_with_statically_known_members: new Message(
    2422,
    Category.Error,
    'A_class_can_only_implement_an_object_type_or_intersection_of_object_types_with_statically_known_memb_2422',
    'A class can only implement an object type or intersection of object types with statically known members.'
  ),
  Class_0_defines_instance_member_function_1_but_extended_class_2_defines_it_as_instance_member_accessor: new Message(
    2423,
    Category.Error,
    'Class_0_defines_instance_member_function_1_but_extended_class_2_defines_it_as_instance_member_access_2423',
    "Class '{0}' defines instance member function '{1}', but extended class '{2}' defines it as instance member accessor."
  ),
  Class_0_defines_instance_member_property_1_but_extended_class_2_defines_it_as_instance_member_function: new Message(
    2425,
    Category.Error,
    'Class_0_defines_instance_member_property_1_but_extended_class_2_defines_it_as_instance_member_functi_2425',
    "Class '{0}' defines instance member property '{1}', but extended class '{2}' defines it as instance member function."
  ),
  Class_0_defines_instance_member_accessor_1_but_extended_class_2_defines_it_as_instance_member_function: new Message(
    2426,
    Category.Error,
    'Class_0_defines_instance_member_accessor_1_but_extended_class_2_defines_it_as_instance_member_functi_2426',
    "Class '{0}' defines instance member accessor '{1}', but extended class '{2}' defines it as instance member function."
  ),
  Interface_name_cannot_be_0: new Message(2427, Category.Error, 'Interface_name_cannot_be_0_2427', "Interface name cannot be '{0}'."),
  All_declarations_of_0_must_have_identical_type_parameters: new Message(
    2428,
    Category.Error,
    'All_declarations_of_0_must_have_identical_type_parameters_2428',
    "All declarations of '{0}' must have identical type parameters."
  ),
  Interface_0_incorrectly_extends_interface_1: new Message(2430, Category.Error, 'Interface_0_incorrectly_extends_interface_1_2430', "Interface '{0}' incorrectly extends interface '{1}'."),
  Enum_name_cannot_be_0: new Message(2431, Category.Error, 'Enum_name_cannot_be_0_2431', "Enum name cannot be '{0}'."),
  In_an_enum_with_multiple_declarations_only_one_declaration_can_omit_an_initer_for_its_first_enum_element: new Message(
    2432,
    Category.Error,
    'In_an_enum_with_multiple_declarations_only_one_declaration_can_omit_an_initer_for_its_first_enu_2432',
    'In an enum with multiple declarations, only one declaration can omit an initer for its first enum element.'
  ),
  A_namespace_declaration_cannot_be_in_a_different_file_from_a_class_or_function_with_which_it_is_merged: new Message(
    2433,
    Category.Error,
    'A_namespace_declaration_cannot_be_in_a_different_file_from_a_class_or_function_with_which_it_is_merg_2433',
    'A namespace declaration cannot be in a different file from a class or function with which it is merged.'
  ),
  A_namespace_declaration_cannot_be_located_prior_to_a_class_or_function_with_which_it_is_merged: new Message(
    2434,
    Category.Error,
    'A_namespace_declaration_cannot_be_located_prior_to_a_class_or_function_with_which_it_is_merged_2434',
    'A namespace declaration cannot be located prior to a class or function with which it is merged.'
  ),
  Ambient_modules_cannot_be_nested_in_other_modules_or_namespaces: new Message(
    2435,
    Category.Error,
    'Ambient_modules_cannot_be_nested_in_other_modules_or_namespaces_2435',
    'Ambient modules cannot be nested in other modules or namespaces.'
  ),
  Ambient_module_declaration_cannot_specify_relative_module_name: new Message(
    2436,
    Category.Error,
    'Ambient_module_declaration_cannot_specify_relative_module_name_2436',
    'Ambient module declaration cannot specify relative module name.'
  ),
  Module_0_is_hidden_by_a_local_declaration_with_the_same_name: new Message(
    2437,
    Category.Error,
    'Module_0_is_hidden_by_a_local_declaration_with_the_same_name_2437',
    "Module '{0}' is hidden by a local declaration with the same name."
  ),
  Import_name_cannot_be_0: new Message(2438, Category.Error, 'Import_name_cannot_be_0_2438', "Import name cannot be '{0}'."),
  Import_or_export_declaration_in_an_ambient_module_declaration_cannot_reference_module_through_relative_module_name: new Message(
    2439,
    Category.Error,
    'Import_or_export_declaration_in_an_ambient_module_declaration_cannot_reference_module_through_relati_2439',
    'Import or export declaration in an ambient module declaration cannot reference module through relative module name.'
  ),
  Import_declaration_conflicts_with_local_declaration_of_0: new Message(
    2440,
    Category.Error,
    'Import_declaration_conflicts_with_local_declaration_of_0_2440',
    "Import declaration conflicts with local declaration of '{0}'."
  ),
  Duplicate_identifier_0_Compiler_reserves_name_1_in_top_level_scope_of_a_module: new Message(
    2441,
    Category.Error,
    'Duplicate_identifier_0_Compiler_reserves_name_1_in_top_level_scope_of_a_module_2441',
    "Duplicate identifier '{0}'. Compiler reserves name '{1}' in top level scope of a module."
  ),
  Types_have_separate_declarations_of_a_private_property_0: new Message(
    2442,
    Category.Error,
    'Types_have_separate_declarations_of_a_private_property_0_2442',
    "Types have separate declarations of a private property '{0}'."
  ),
  Property_0_is_protected_but_type_1_is_not_a_class_derived_from_2: new Message(
    2443,
    Category.Error,
    'Property_0_is_protected_but_type_1_is_not_a_class_derived_from_2_2443',
    "Property '{0}' is protected but type '{1}' is not a class derived from '{2}'."
  ),
  Property_0_is_protected_in_type_1_but_public_in_type_2: new Message(
    2444,
    Category.Error,
    'Property_0_is_protected_in_type_1_but_public_in_type_2_2444',
    "Property '{0}' is protected in type '{1}' but public in type '{2}'."
  ),
  Property_0_is_protected_and_only_accessible_within_class_1_and_its_subclasses: new Message(
    2445,
    Category.Error,
    'Property_0_is_protected_and_only_accessible_within_class_1_and_its_subclasses_2445',
    "Property '{0}' is protected and only accessible within class '{1}' and its subclasses."
  ),
  Property_0_is_protected_and_only_accessible_through_an_instance_of_class_1: new Message(
    2446,
    Category.Error,
    'Property_0_is_protected_and_only_accessible_through_an_instance_of_class_1_2446',
    "Property '{0}' is protected and only accessible through an instance of class '{1}'."
  ),
  The_0_operator_is_not_allowed_for_boolean_types_Consider_using_1_instead: new Message(
    2447,
    Category.Error,
    'The_0_operator_is_not_allowed_for_boolean_types_Consider_using_1_instead_2447',
    "The '{0}' operator is not allowed for boolean types. Consider using '{1}' instead."
  ),
  Block_scoped_variable_0_used_before_its_declaration: new Message(
    2448,
    Category.Error,
    'Block_scoped_variable_0_used_before_its_declaration_2448',
    "Block-scoped variable '{0}' used before its declaration."
  ),
  Class_0_used_before_its_declaration: new Message(2449, Category.Error, 'Class_0_used_before_its_declaration_2449', "Class '{0}' used before its declaration."),
  Enum_0_used_before_its_declaration: new Message(2450, Category.Error, 'Enum_0_used_before_its_declaration_2450', "Enum '{0}' used before its declaration."),
  Cannot_redeclare_block_scoped_variable_0: new Message(2451, Category.Error, 'Cannot_redeclare_block_scoped_variable_0_2451', "Cannot redeclare block-scoped variable '{0}'."),
  An_enum_member_cannot_have_a_numeric_name: new Message(2452, Category.Error, 'An_enum_member_cannot_have_a_numeric_name_2452', 'An enum member cannot have a numeric name.'),
  The_type_argument_for_type_parameter_0_cannot_be_inferred_from_the_usage_Consider_specifying_the_type_arguments_explicitly: new Message(
    2453,
    Category.Error,
    'The_type_argument_for_type_parameter_0_cannot_be_inferred_from_the_usage_Consider_specifying_the_typ_2453',
    "The type argument for type parameter '{0}' cannot be inferred from the usage. Consider specifying the type arguments explicitly."
  ),
  Variable_0_is_used_before_being_assigned: new Message(2454, Category.Error, 'Variable_0_is_used_before_being_assigned_2454', "Variable '{0}' is used before being assigned."),
  Type_argument_candidate_1_is_not_a_valid_type_argument_because_it_is_not_a_supertype_of_candidate_0: new Message(
    2455,
    Category.Error,
    'Type_argument_candidate_1_is_not_a_valid_type_argument_because_it_is_not_a_supertype_of_candidate_0_2455',
    "Type argument candidate '{1}' is not a valid type argument because it is not a supertype of candidate '{0}'."
  ),
  Type_alias_0_circularly_references_itself: new Message(2456, Category.Error, 'Type_alias_0_circularly_references_itself_2456', "Type alias '{0}' circularly references itself."),
  Type_alias_name_cannot_be_0: new Message(2457, Category.Error, 'Type_alias_name_cannot_be_0_2457', "Type alias name cannot be '{0}'."),
  An_AMD_module_cannot_have_multiple_name_assignments: new Message(
    2458,
    Category.Error,
    'An_AMD_module_cannot_have_multiple_name_assignments_2458',
    'An AMD module cannot have multiple name assignments.'
  ),
  Module_0_declares_1_locally_but_it_is_not_exported: new Message(
    2459,
    Category.Error,
    'Module_0_declares_1_locally_but_it_is_not_exported_2459',
    "Module '{0}' declares '{1}' locally, but it is not exported."
  ),
  Module_0_declares_1_locally_but_it_is_exported_as_2: new Message(
    2460,
    Category.Error,
    'Module_0_declares_1_locally_but_it_is_exported_as_2_2460',
    "Module '{0}' declares '{1}' locally, but it is exported as '{2}'."
  ),
  Type_0_is_not_an_array_type: new Message(2461, Category.Error, 'Type_0_is_not_an_array_type_2461', "Type '{0}' is not an array type."),
  A_rest_element_must_be_last_in_a_destructuring_pattern: new Message(
    2462,
    Category.Error,
    'A_rest_element_must_be_last_in_a_destructuring_pattern_2462',
    'A rest element must be last in a destructuring pattern.'
  ),
  A_binding_pattern_parameter_cannot_be_optional_in_an_implementation_signature: new Message(
    2463,
    Category.Error,
    'A_binding_pattern_parameter_cannot_be_optional_in_an_implementation_signature_2463',
    'A binding pattern parameter cannot be optional in an implementation signature.'
  ),
  A_computed_property_name_must_be_of_type_string_number_symbol_or_any: new Message(
    2464,
    Category.Error,
    'A_computed_property_name_must_be_of_type_string_number_symbol_or_any_2464',
    "A computed property name must be of type 'string', 'number', 'symbol', or 'any'."
  ),
  this_cannot_be_referenced_in_a_computed_property_name: new Message(
    2465,
    Category.Error,
    'this_cannot_be_referenced_in_a_computed_property_name_2465',
    "'this' cannot be referenced in a computed property name."
  ),
  super_cannot_be_referenced_in_a_computed_property_name: new Message(
    2466,
    Category.Error,
    'super_cannot_be_referenced_in_a_computed_property_name_2466',
    "'super' cannot be referenced in a computed property name."
  ),
  A_computed_property_name_cannot_reference_a_type_parameter_from_its_containing_type: new Message(
    2467,
    Category.Error,
    'A_computed_property_name_cannot_reference_a_type_parameter_from_its_containing_type_2467',
    'A computed property name cannot reference a type parameter from its containing type.'
  ),
  Cannot_find_global_value_0: new Message(2468, Category.Error, 'Cannot_find_global_value_0_2468', "Cannot find global value '{0}'."),
  The_0_operator_cannot_be_applied_to_type_symbol: new Message(2469, Category.Error, 'The_0_operator_cannot_be_applied_to_type_symbol_2469', "The '{0}' operator cannot be applied to type 'symbol'."),
  Symbol_reference_does_not_refer_to_the_global_Symbol_constructor_object: new Message(
    2470,
    Category.Error,
    'Symbol_reference_does_not_refer_to_the_global_Symbol_constructor_object_2470',
    "'Symbol' reference does not refer to the global Symbol constructor object."
  ),
  A_computed_property_name_of_the_form_0_must_be_of_type_symbol: new Message(
    2471,
    Category.Error,
    'A_computed_property_name_of_the_form_0_must_be_of_type_symbol_2471',
    "A computed property name of the form '{0}' must be of type 'symbol'."
  ),
  Spread_operator_in_new_expressions_is_only_available_when_targeting_ECMAScript_5_and_higher: new Message(
    2472,
    Category.Error,
    'Spread_operator_in_new_expressions_is_only_available_when_targeting_ECMAScript_5_and_higher_2472',
    "Spread operator in 'new' expressions is only available when targeting ECMAScript 5 and higher."
  ),
  Enum_declarations_must_all_be_const_or_non_const: new Message(2473, Category.Error, 'Enum_declarations_must_all_be_const_or_non_const_2473', 'Enum declarations must all be const or non-const.'),
  const_enum_member_initers_can_only_contain_literal_values_and_other_computed_enum_values: new Message(
    2474,
    Category.Error,
    'const_enum_member_initers_can_only_contain_literal_values_and_other_computed_enum_values_2474',
    'const enum member initers can only contain literal values and other computed enum values.'
  ),
  const_enums_can_only_be_used_in_property_or_index_access_expressions_or_the_right_hand_side_of_an_import_declaration_or_export_assignment_or_type_query: new Message(
    2475,
    Category.Error,
    'const_enums_can_only_be_used_in_property_or_index_access_expressions_or_the_right_hand_side_of_an_im_2475',
    "'const' enums can only be used in property or index access expressions or the right hand side of an import declaration or export assignment or type query."
  ),
  A_const_enum_member_can_only_be_accessed_using_a_string_literal: new Message(
    2476,
    Category.Error,
    'A_const_enum_member_can_only_be_accessed_using_a_string_literal_2476',
    'A const enum member can only be accessed using a string literal.'
  ),
  const_enum_member_initer_was_evaluated_to_a_non_finite_value: new Message(
    2477,
    Category.Error,
    'const_enum_member_initer_was_evaluated_to_a_non_finite_value_2477',
    "'const' enum member initer was evaluated to a non-finite value."
  ),
  const_enum_member_initer_was_evaluated_to_disallowed_value_NaN: new Message(
    2478,
    Category.Error,
    'const_enum_member_initer_was_evaluated_to_disallowed_value_NaN_2478',
    "'const' enum member initer was evaluated to disallowed value 'NaN'."
  ),
  Property_0_does_not_exist_on_const_enum_1: new Message(2479, Category.Error, 'Property_0_does_not_exist_on_const_enum_1_2479', "Property '{0}' does not exist on 'const' enum '{1}'."),
  let_is_not_allowed_to_be_used_as_a_name_in_let_or_const_declarations: new Message(
    2480,
    Category.Error,
    'let_is_not_allowed_to_be_used_as_a_name_in_let_or_const_declarations_2480',
    "'let' is not allowed to be used as a name in 'let' or 'const' declarations."
  ),
  Cannot_initialize_outer_scoped_variable_0_in_the_same_scope_as_block_scoped_declaration_1: new Message(
    2481,
    Category.Error,
    'Cannot_initialize_outer_scoped_variable_0_in_the_same_scope_as_block_scoped_declaration_1_2481',
    "Cannot initialize outer scoped variable '{0}' in the same scope as block scoped declaration '{1}'."
  ),
  The_left_hand_side_of_a_for_of_statement_cannot_use_a_type_annotation: new Message(
    2483,
    Category.Error,
    'The_left_hand_side_of_a_for_of_statement_cannot_use_a_type_annotation_2483',
    "The left-hand side of a 'for...of' statement cannot use a type annotation."
  ),
  Export_declaration_conflicts_with_exported_declaration_of_0: new Message(
    2484,
    Category.Error,
    'Export_declaration_conflicts_with_exported_declaration_of_0_2484',
    "Export declaration conflicts with exported declaration of '{0}'."
  ),
  The_left_hand_side_of_a_for_of_statement_must_be_a_variable_or_a_property_access: new Message(
    2487,
    Category.Error,
    'The_left_hand_side_of_a_for_of_statement_must_be_a_variable_or_a_property_access_2487',
    "The left-hand side of a 'for...of' statement must be a variable or a property access."
  ),
  Type_0_must_have_a_Symbol_iterator_method_that_returns_an_iterator: new Message(
    2488,
    Category.Error,
    'Type_0_must_have_a_Symbol_iterator_method_that_returns_an_iterator_2488',
    "Type '{0}' must have a '[Symbol.iterator]()' method that returns an iterator."
  ),
  An_iterator_must_have_a_next_method: new Message(2489, Category.Error, 'An_iterator_must_have_a_next_method_2489', "An iterator must have a 'next()' method."),
  The_type_returned_by_the_0_method_of_an_iterator_must_have_a_value_property: new Message(
    2490,
    Category.Error,
    'The_type_returned_by_the_0_method_of_an_iterator_must_have_a_value_property_2490',
    "The type returned by the '{0}()' method of an iterator must have a 'value' property."
  ),
  The_left_hand_side_of_a_for_in_statement_cannot_be_a_destructuring_pattern: new Message(
    2491,
    Category.Error,
    'The_left_hand_side_of_a_for_in_statement_cannot_be_a_destructuring_pattern_2491',
    "The left-hand side of a 'for...in' statement cannot be a destructuring pattern."
  ),
  Cannot_redeclare_identifier_0_in_catch_clause: new Message(2492, Category.Error, 'Cannot_redeclare_identifier_0_in_catch_clause_2492', "Cannot redeclare identifier '{0}' in catch clause."),
  Tuple_type_0_of_length_1_has_no_element_at_index_2: new Message(
    2493,
    Category.Error,
    'Tuple_type_0_of_length_1_has_no_element_at_index_2_2493',
    "Tuple type '{0}' of length '{1}' has no element at index '{2}'."
  ),
  Using_a_string_in_a_for_of_statement_is_only_supported_in_ECMAScript_5_and_higher: new Message(
    2494,
    Category.Error,
    'Using_a_string_in_a_for_of_statement_is_only_supported_in_ECMAScript_5_and_higher_2494',
    "Using a string in a 'for...of' statement is only supported in ECMAScript 5 and higher."
  ),
  Type_0_is_not_an_array_type_or_a_string_type: new Message(2495, Category.Error, 'Type_0_is_not_an_array_type_or_a_string_type_2495', "Type '{0}' is not an array type or a string type."),
  The_arguments_object_cannot_be_referenced_in_an_arrow_function_in_ES3_and_ES5_Consider_using_a_standard_function_expression: new Message(
    2496,
    Category.Error,
    'The_arguments_object_cannot_be_referenced_in_an_arrow_function_in_ES3_and_ES5_Consider_using_a_stand_2496',
    "The 'arguments' object cannot be referenced in an arrow function in ES3 and ES5. Consider using a standard function expression."
  ),
  This_module_can_only_be_referenced_with_ECMAScript_imports_Slashexports_by_turning_on_the_0_flag_and_referencing_its_default_export: new Message(
    2497,
    Category.Error,
    'This_module_can_only_be_referenced_with_ECMAScript_imports_Slashexports_by_turning_on_the_0_flag_and_2497',
    "This module can only be referenced with ECMAScript imports/exports by turning on the '{0}' flag and referencing its default export."
  ),
  Module_0_uses_export_and_cannot_be_used_with_export_Asterisk: new Message(
    2498,
    Category.Error,
    'Module_0_uses_export_and_cannot_be_used_with_export_Asterisk_2498',
    "Module '{0}' uses 'export =' and cannot be used with 'export *'."
  ),
  An_interface_can_only_extend_an_identifier_Slashqualified_name_with_optional_type_arguments: new Message(
    2499,
    Category.Error,
    'An_interface_can_only_extend_an_identifier_Slashqualified_name_with_optional_type_arguments_2499',
    'An interface can only extend an identifier/qualified-name with optional type arguments.'
  ),
  A_class_can_only_implement_an_identifier_Slashqualified_name_with_optional_type_arguments: new Message(
    2500,
    Category.Error,
    'A_class_can_only_implement_an_identifier_Slashqualified_name_with_optional_type_arguments_2500',
    'A class can only implement an identifier/qualified-name with optional type arguments.'
  ),
  A_rest_element_cannot_contain_a_binding_pattern: new Message(2501, Category.Error, 'A_rest_element_cannot_contain_a_binding_pattern_2501', 'A rest element cannot contain a binding pattern.'),
  _0_is_referenced_directly_or_indirectly_in_its_own_type_annotation: new Message(
    2502,
    Category.Error,
    '_0_is_referenced_directly_or_indirectly_in_its_own_type_annotation_2502',
    "'{0}' is referenced directly or indirectly in its own type annotation."
  ),
  Cannot_find_namespace_0: new Message(2503, Category.Error, 'Cannot_find_namespace_0_2503', "Cannot find namespace '{0}'."),
  Type_0_must_have_a_Symbol_asyncIterator_method_that_returns_an_async_iterator: new Message(
    2504,
    Category.Error,
    'Type_0_must_have_a_Symbol_asyncIterator_method_that_returns_an_async_iterator_2504',
    "Type '{0}' must have a '[Symbol.asyncIterator]()' method that returns an async iterator."
  ),
  A_generator_cannot_have_a_void_type_annotation: new Message(2505, Category.Error, 'A_generator_cannot_have_a_void_type_annotation_2505', "A generator cannot have a 'void' type annotation."),
  _0_is_referenced_directly_or_indirectly_in_its_own_base_expression: new Message(
    2506,
    Category.Error,
    '_0_is_referenced_directly_or_indirectly_in_its_own_base_expression_2506',
    "'{0}' is referenced directly or indirectly in its own base expression."
  ),
  Type_0_is_not_a_constructor_function_type: new Message(2507, Category.Error, 'Type_0_is_not_a_constructor_function_type_2507', "Type '{0}' is not a constructor function type."),
  No_base_constructor_has_the_specified_number_of_type_arguments: new Message(
    2508,
    Category.Error,
    'No_base_constructor_has_the_specified_number_of_type_arguments_2508',
    'No base constructor has the specified number of type arguments.'
  ),
  Base_constructor_return_type_0_is_not_an_object_type_or_intersection_of_object_types_with_statically_known_members: new Message(
    2509,
    Category.Error,
    'Base_constructor_return_type_0_is_not_an_object_type_or_intersection_of_object_types_with_statically_2509',
    "Base constructor return type '{0}' is not an object type or intersection of object types with statically known members."
  ),
  Base_constructors_must_all_have_the_same_return_type: new Message(
    2510,
    Category.Error,
    'Base_constructors_must_all_have_the_same_return_type_2510',
    'Base constructors must all have the same return type.'
  ),
  Cannot_create_an_instance_of_an_abstract_class: new Message(2511, Category.Error, 'Cannot_create_an_instance_of_an_abstract_class_2511', 'Cannot create an instance of an abstract class.'),
  Overload_signatures_must_all_be_abstract_or_non_abstract: new Message(
    2512,
    Category.Error,
    'Overload_signatures_must_all_be_abstract_or_non_abstract_2512',
    'Overload signatures must all be abstract or non-abstract.'
  ),
  Abstract_method_0_in_class_1_cannot_be_accessed_via_super_expression: new Message(
    2513,
    Category.Error,
    'Abstract_method_0_in_class_1_cannot_be_accessed_via_super_expression_2513',
    "Abstract method '{0}' in class '{1}' cannot be accessed via super expression."
  ),
  Classes_containing_abstract_methods_must_be_marked_abstract: new Message(
    2514,
    Category.Error,
    'Classes_containing_abstract_methods_must_be_marked_abstract_2514',
    'Classes containing abstract methods must be marked abstract.'
  ),
  Non_abstract_class_0_does_not_implement_inherited_abstract_member_1_from_class_2: new Message(
    2515,
    Category.Error,
    'Non_abstract_class_0_does_not_implement_inherited_abstract_member_1_from_class_2_2515',
    "Non-abstract class '{0}' does not implement inherited abstract member '{1}' from class '{2}'."
  ),
  All_declarations_of_an_abstract_method_must_be_consecutive: new Message(
    2516,
    Category.Error,
    'All_declarations_of_an_abstract_method_must_be_consecutive_2516',
    'All declarations of an abstract method must be consecutive.'
  ),
  Cannot_assign_an_abstract_constructor_type_to_a_non_abstract_constructor_type: new Message(
    2517,
    Category.Error,
    'Cannot_assign_an_abstract_constructor_type_to_a_non_abstract_constructor_type_2517',
    'Cannot assign an abstract constructor type to a non-abstract constructor type.'
  ),
  A_this_based_type_guard_is_not_compatible_with_a_parameter_based_type_guard: new Message(
    2518,
    Category.Error,
    'A_this_based_type_guard_is_not_compatible_with_a_parameter_based_type_guard_2518',
    "A 'this'-based type guard is not compatible with a parameter-based type guard."
  ),
  An_async_iterator_must_have_a_next_method: new Message(2519, Category.Error, 'An_async_iterator_must_have_a_next_method_2519', "An async iterator must have a 'next()' method."),
  Duplicate_identifier_0_Compiler_uses_declaration_1_to_support_async_functions: new Message(
    2520,
    Category.Error,
    'Duplicate_identifier_0_Compiler_uses_declaration_1_to_support_async_functions_2520',
    "Duplicate identifier '{0}'. Compiler uses declaration '{1}' to support async functions."
  ),
  Expression_resolves_to_variable_declaration_0_that_compiler_uses_to_support_async_functions: new Message(
    2521,
    Category.Error,
    'Expression_resolves_to_variable_declaration_0_that_compiler_uses_to_support_async_functions_2521',
    "Expression resolves to variable declaration '{0}' that compiler uses to support async functions."
  ),
  The_arguments_object_cannot_be_referenced_in_an_async_function_or_method_in_ES3_and_ES5_Consider_using_a_standard_function_or_method: new Message(
    2522,
    Category.Error,
    'The_arguments_object_cannot_be_referenced_in_an_async_function_or_method_in_ES3_and_ES5_Consider_usi_2522',
    "The 'arguments' object cannot be referenced in an async function or method in ES3 and ES5. Consider using a standard function or method."
  ),
  yield_expressions_cannot_be_used_in_a_parameter_initer: new Message(
    2523,
    Category.Error,
    'yield_expressions_cannot_be_used_in_a_parameter_initer_2523',
    "'yield' expressions cannot be used in a parameter initer."
  ),
  await_expressions_cannot_be_used_in_a_parameter_initer: new Message(
    2524,
    Category.Error,
    'await_expressions_cannot_be_used_in_a_parameter_initer_2524',
    "'await' expressions cannot be used in a parameter initer."
  ),
  Initer_provides_no_value_for_this_binding_element_and_the_binding_element_has_no_default_value: new Message(
    2525,
    Category.Error,
    'Initer_provides_no_value_for_this_binding_element_and_the_binding_element_has_no_default_value_2525',
    'Initer provides no value for this binding element and the binding element has no default value.'
  ),
  A_this_type_is_available_only_in_a_non_static_member_of_a_class_or_interface: new Message(
    2526,
    Category.Error,
    'A_this_type_is_available_only_in_a_non_static_member_of_a_class_or_interface_2526',
    "A 'this' type is available only in a non-static member of a class or interface."
  ),
  The_inferred_type_of_0_references_an_inaccessible_1_type_A_type_annotation_is_necessary: new Message(
    2527,
    Category.Error,
    'The_inferred_type_of_0_references_an_inaccessible_1_type_A_type_annotation_is_necessary_2527',
    "The inferred type of '{0}' references an inaccessible '{1}' type. A type annotation is necessary."
  ),
  A_module_cannot_have_multiple_default_exports: new Message(2528, Category.Error, 'A_module_cannot_have_multiple_default_exports_2528', 'A module cannot have multiple default exports.'),
  Duplicate_identifier_0_Compiler_reserves_name_1_in_top_level_scope_of_a_module_containing_async_functions: new Message(
    2529,
    Category.Error,
    'Duplicate_identifier_0_Compiler_reserves_name_1_in_top_level_scope_of_a_module_containing_async_func_2529',
    "Duplicate identifier '{0}'. Compiler reserves name '{1}' in top level scope of a module containing async functions."
  ),
  Property_0_is_incompatible_with_index_signature: new Message(2530, Category.Error, 'Property_0_is_incompatible_with_index_signature_2530', "Property '{0}' is incompatible with index signature."),
  Object_is_possibly_null: new Message(2531, Category.Error, 'Object_is_possibly_null_2531', "Object is possibly 'null'."),
  Object_is_possibly_undefined: new Message(2532, Category.Error, 'Object_is_possibly_undefined_2532', "Object is possibly 'undefined'."),
  Object_is_possibly_null_or_undefined: new Message(2533, Category.Error, 'Object_is_possibly_null_or_undefined_2533', "Object is possibly 'null' or 'undefined'."),
  A_function_returning_never_cannot_have_a_reachable_end_point: new Message(
    2534,
    Category.Error,
    'A_function_returning_never_cannot_have_a_reachable_end_point_2534',
    "A function returning 'never' cannot have a reachable end point."
  ),
  Enum_type_0_has_members_with_initers_that_are_not_literals: new Message(
    2535,
    Category.Error,
    'Enum_type_0_has_members_with_initers_that_are_not_literals_2535',
    "Enum type '{0}' has members with initers that are not literals."
  ),
  Type_0_cannot_be_used_to_index_type_1: new Message(2536, Category.Error, 'Type_0_cannot_be_used_to_index_type_1_2536', "Type '{0}' cannot be used to index type '{1}'."),
  Type_0_has_no_matching_index_signature_for_type_1: new Message(
    2537,
    Category.Error,
    'Type_0_has_no_matching_index_signature_for_type_1_2537',
    "Type '{0}' has no matching index signature for type '{1}'."
  ),
  Type_0_cannot_be_used_as_an_index_type: new Message(2538, Category.Error, 'Type_0_cannot_be_used_as_an_index_type_2538', "Type '{0}' cannot be used as an index type."),
  Cannot_assign_to_0_because_it_is_not_a_variable: new Message(2539, Category.Error, 'Cannot_assign_to_0_because_it_is_not_a_variable_2539', "Cannot assign to '{0}' because it is not a variable."),
  Cannot_assign_to_0_because_it_is_a_read_only_property: new Message(
    2540,
    Category.Error,
    'Cannot_assign_to_0_because_it_is_a_read_only_property_2540',
    "Cannot assign to '{0}' because it is a read-only property."
  ),
  The_target_of_an_assignment_must_be_a_variable_or_a_property_access: new Message(
    2541,
    Category.Error,
    'The_target_of_an_assignment_must_be_a_variable_or_a_property_access_2541',
    'The target of an assignment must be a variable or a property access.'
  ),
  Index_signature_in_type_0_only_permits_reading: new Message(2542, Category.Error, 'Index_signature_in_type_0_only_permits_reading_2542', "Index signature in type '{0}' only permits reading."),
  Duplicate_identifier_newTarget_Compiler_uses_variable_declaration_newTarget_to_capture_new_target_meta_property_reference: new Message(
    2543,
    Category.Error,
    'Duplicate_identifier_newTarget_Compiler_uses_variable_declaration_newTarget_to_capture_new_target_me_2543',
    "Duplicate identifier '_newTarget'. Compiler uses variable declaration '_newTarget' to capture 'new.target' meta-property reference."
  ),
  Expression_resolves_to_variable_declaration_newTarget_that_compiler_uses_to_capture_new_target_meta_property_reference: new Message(
    2544,
    Category.Error,
    'Expression_resolves_to_variable_declaration_newTarget_that_compiler_uses_to_capture_new_target_meta__2544',
    "Expression resolves to variable declaration '_newTarget' that compiler uses to capture 'new.target' meta-property reference."
  ),
  A_mixin_class_must_have_a_constructor_with_a_single_rest_parameter_of_type_any: new Message(
    2545,
    Category.Error,
    'A_mixin_class_must_have_a_constructor_with_a_single_rest_parameter_of_type_any_2545',
    "A mixin class must have a constructor with a single rest parameter of type 'any[]'."
  ),
  The_type_returned_by_the_0_method_of_an_async_iterator_must_be_a_promise_for_a_type_with_a_value_property: new Message(
    2547,
    Category.Error,
    'The_type_returned_by_the_0_method_of_an_async_iterator_must_be_a_promise_for_a_type_with_a_value_pro_2547',
    "The type returned by the '{0}()' method of an async iterator must be a promise for a type with a 'value' property."
  ),
  Type_0_is_not_an_array_type_or_does_not_have_a_Symbol_iterator_method_that_returns_an_iterator: new Message(
    2548,
    Category.Error,
    'Type_0_is_not_an_array_type_or_does_not_have_a_Symbol_iterator_method_that_returns_an_iterator_2548',
    "Type '{0}' is not an array type or does not have a '[Symbol.iterator]()' method that returns an iterator."
  ),
  Type_0_is_not_an_array_type_or_a_string_type_or_does_not_have_a_Symbol_iterator_method_that_returns_an_iterator: new Message(
    2549,
    Category.Error,
    'Type_0_is_not_an_array_type_or_a_string_type_or_does_not_have_a_Symbol_iterator_method_that_returns__2549',
    "Type '{0}' is not an array type or a string type or does not have a '[Symbol.iterator]()' method that returns an iterator."
  ),
  Property_0_does_not_exist_on_type_1_Did_you_mean_2: new Message(
    2551,
    Category.Error,
    'Property_0_does_not_exist_on_type_1_Did_you_mean_2_2551',
    "Property '{0}' does not exist on type '{1}'. Did you mean '{2}'?"
  ),
  Cannot_find_name_0_Did_you_mean_1: new Message(2552, Category.Error, 'Cannot_find_name_0_Did_you_mean_1_2552', "Cannot find name '{0}'. Did you mean '{1}'?"),
  Computed_values_are_not_permitted_in_an_enum_with_string_valued_members: new Message(
    2553,
    Category.Error,
    'Computed_values_are_not_permitted_in_an_enum_with_string_valued_members_2553',
    'Computed values are not permitted in an enum with string valued members.'
  ),
  Expected_0_arguments_but_got_1: new Message(2554, Category.Error, 'Expected_0_arguments_but_got_1_2554', 'Expected {0} arguments, but got {1}.'),
  Expected_at_least_0_arguments_but_got_1: new Message(2555, Category.Error, 'Expected_at_least_0_arguments_but_got_1_2555', 'Expected at least {0} arguments, but got {1}.'),
  Expected_0_arguments_but_got_1_or_more: new Message(2556, Category.Error, 'Expected_0_arguments_but_got_1_or_more_2556', 'Expected {0} arguments, but got {1} or more.'),
  Expected_at_least_0_arguments_but_got_1_or_more: new Message(2557, Category.Error, 'Expected_at_least_0_arguments_but_got_1_or_more_2557', 'Expected at least {0} arguments, but got {1} or more.'),
  Expected_0_type_arguments_but_got_1: new Message(2558, Category.Error, 'Expected_0_type_arguments_but_got_1_2558', 'Expected {0} type arguments, but got {1}.'),
  Type_0_has_no_properties_in_common_with_type_1: new Message(2559, Category.Error, 'Type_0_has_no_properties_in_common_with_type_1_2559', "Type '{0}' has no properties in common with type '{1}'."),
  Value_of_type_0_has_no_properties_in_common_with_type_1_Did_you_mean_to_call_it: new Message(
    2560,
    Category.Error,
    'Value_of_type_0_has_no_properties_in_common_with_type_1_Did_you_mean_to_call_it_2560',
    "Value of type '{0}' has no properties in common with type '{1}'. Did you mean to call it?"
  ),
  Object_literal_may_only_specify_known_properties_but_0_does_not_exist_in_type_1_Did_you_mean_to_write_2: new Message(
    2561,
    Category.Error,
    'Object_literal_may_only_specify_known_properties_but_0_does_not_exist_in_type_1_Did_you_mean_to_writ_2561',
    "Object literal may only specify known properties, but '{0}' does not exist in type '{1}'. Did you mean to write '{2}'?"
  ),
  Base_class_expressions_cannot_reference_class_type_parameters: new Message(
    2562,
    Category.Error,
    'Base_class_expressions_cannot_reference_class_type_parameters_2562',
    'Base class expressions cannot reference class type parameters.'
  ),
  The_containing_function_or_module_body_is_too_large_for_control_flow_analysis: new Message(
    2563,
    Category.Error,
    'The_containing_function_or_module_body_is_too_large_for_control_flow_analysis_2563',
    'The containing function or module body is too large for control flow analysis.'
  ),
  Property_0_has_no_initer_and_is_not_definitely_assigned_in_the_constructor: new Message(
    2564,
    Category.Error,
    'Property_0_has_no_initer_and_is_not_definitely_assigned_in_the_constructor_2564',
    "Property '{0}' has no initer and is not definitely assigned in the constructor."
  ),
  Property_0_is_used_before_being_assigned: new Message(2565, Category.Error, 'Property_0_is_used_before_being_assigned_2565', "Property '{0}' is used before being assigned."),
  A_rest_element_cannot_have_a_property_name: new Message(2566, Category.Error, 'A_rest_element_cannot_have_a_property_name_2566', 'A rest element cannot have a property name.'),
  Enum_declarations_can_only_merge_with_namespace_or_other_enum_declarations: new Message(
    2567,
    Category.Error,
    'Enum_declarations_can_only_merge_with_namespace_or_other_enum_declarations_2567',
    'Enum declarations can only merge with namespace or other enum declarations.'
  ),
  Type_0_is_not_an_array_type_or_a_string_type_Use_compiler_option_downlevelIteration_to_allow_iterating_of_iterators: new Message(
    2569,
    Category.Error,
    'Type_0_is_not_an_array_type_or_a_string_type_Use_compiler_option_downlevelIteration_to_allow_iterati_2569',
    "Type '{0}' is not an array type or a string type. Use compiler option '--downlevelIteration' to allow iterating of iterators."
  ),
  Object_is_of_type_unknown: new Message(2571, Category.Error, 'Object_is_of_type_unknown_2571', "Object is of type 'unknown'."),
  Rest_signatures_are_incompatible: new Message(2572, Category.Error, 'Rest_signatures_are_incompatible_2572', 'Rest signatures are incompatible.'),
  Property_0_is_incompatible_with_rest_element_type: new Message(
    2573,
    Category.Error,
    'Property_0_is_incompatible_with_rest_element_type_2573',
    "Property '{0}' is incompatible with rest element type."
  ),
  A_rest_element_type_must_be_an_array_type: new Message(2574, Category.Error, 'A_rest_element_type_must_be_an_array_type_2574', 'A rest element type must be an array type.'),
  No_overload_expects_0_arguments_but_overloads_do_exist_that_expect_either_1_or_2_arguments: new Message(
    2575,
    Category.Error,
    'No_overload_expects_0_arguments_but_overloads_do_exist_that_expect_either_1_or_2_arguments_2575',
    'No overload expects {0} arguments, but overloads do exist that expect either {1} or {2} arguments.'
  ),
  Property_0_is_a_static_member_of_type_1: new Message(2576, Category.Error, 'Property_0_is_a_static_member_of_type_1_2576', "Property '{0}' is a static member of type '{1}'"),
  Return_type_annotation_circularly_references_itself: new Message(
    2577,
    Category.Error,
    'Return_type_annotation_circularly_references_itself_2577',
    'Return type annotation circularly references itself.'
  ),
  Unused_ts_expect_error_directive: new Message(2578, Category.Error, 'Unused_ts_expect_error_directive_2578', "Unused '@ts-expect-error' directive."),
  Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_node_Try_npm_i_types_Slashnode: new Message(
    2580,
    Category.Error,
    'Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_node_Try_npm_i_types_Slashnode_2580',
    "Cannot find name '{0}'. Do you need to install type definitions for node? Try `npm i @types/node`."
  ),
  Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_jQuery_Try_npm_i_types_Slashjquery: new Message(
    2581,
    Category.Error,
    'Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_jQuery_Try_npm_i_types_Slashjquery_2581',
    "Cannot find name '{0}'. Do you need to install type definitions for jQuery? Try `npm i @types/jquery`."
  ),
  Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_a_test_runner_Try_npm_i_types_Slashjest_or_npm_i_types_Slashmocha: new Message(
    2582,
    Category.Error,
    'Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_a_test_runner_Try_npm_i_types_Slashje_2582',
    "Cannot find name '{0}'. Do you need to install type definitions for a test runner? Try `npm i @types/jest` or `npm i @types/mocha`."
  ),
  Cannot_find_name_0_Do_you_need_to_change_your_target_library_Try_changing_the_lib_compiler_option_to_es2015_or_later: new Message(
    2583,
    Category.Error,
    'Cannot_find_name_0_Do_you_need_to_change_your_target_library_Try_changing_the_lib_compiler_option_to_2583',
    "Cannot find name '{0}'. Do you need to change your target library? Try changing the `lib` compiler option to es2015 or later."
  ),
  Cannot_find_name_0_Do_you_need_to_change_your_target_library_Try_changing_the_lib_compiler_option_to_include_dom: new Message(
    2584,
    Category.Error,
    'Cannot_find_name_0_Do_you_need_to_change_your_target_library_Try_changing_the_lib_compiler_option_to_2584',
    "Cannot find name '{0}'. Do you need to change your target library? Try changing the `lib` compiler option to include 'dom'."
  ),
  _0_only_refers_to_a_type_but_is_being_used_as_a_value_here_Do_you_need_to_change_your_target_library_Try_changing_the_lib_compiler_option_to_es2015_or_later: new Message(
    2585,
    Category.Error,
    '_0_only_refers_to_a_type_but_is_being_used_as_a_value_here_Do_you_need_to_change_your_target_library_2585',
    "'{0}' only refers to a type, but is being used as a value here. Do you need to change your target library? Try changing the `lib` compiler option to es2015 or later."
  ),
  Enum_type_0_circularly_references_itself: new Message(2586, Category.Error, 'Enum_type_0_circularly_references_itself_2586', "Enum type '{0}' circularly references itself."),
  Doc_type_0_circularly_references_itself: new Message(2587, Category.Error, 'Doc_type_0_circularly_references_itself_2587', "Doc type '{0}' circularly references itself."),
  Cannot_assign_to_0_because_it_is_a_constant: new Message(2588, Category.Error, 'Cannot_assign_to_0_because_it_is_a_constant_2588', "Cannot assign to '{0}' because it is a constant."),
  Type_instantiation_is_excessively_deep_and_possibly_infinite: new Message(
    2589,
    Category.Error,
    'Type_instantiation_is_excessively_deep_and_possibly_infinite_2589',
    'Type instantiation is excessively deep and possibly infinite.'
  ),
  Expression_produces_a_union_type_that_is_too_complex_to_represent: new Message(
    2590,
    Category.Error,
    'Expression_produces_a_union_type_that_is_too_complex_to_represent_2590',
    'Expression produces a union type that is too complex to represent.'
  ),
  Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_node_Try_npm_i_types_Slashnode_and_then_add_node_to_the_types_field_in_your_tsconfig: new Message(
    2591,
    Category.Error,
    'Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_node_Try_npm_i_types_Slashnode_and_th_2591',
    "Cannot find name '{0}'. Do you need to install type definitions for node? Try `npm i @types/node` and then add `node` to the types field in your tsconfig."
  ),
  Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_jQuery_Try_npm_i_types_Slashjquery_and_then_add_jquery_to_the_types_field_in_your_tsconfig: new Message(
    2592,
    Category.Error,
    'Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_jQuery_Try_npm_i_types_Slashjquery_an_2592',
    "Cannot find name '{0}'. Do you need to install type definitions for jQuery? Try `npm i @types/jquery` and then add `jquery` to the types field in your tsconfig."
  ),
  Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_a_test_runner_Try_npm_i_types_Slashjest_or_npm_i_types_Slashmocha_and_then_add_jest_or_mocha_to_the_types_field_in_your_tsconfig: new Message(
    2593,
    Category.Error,
    'Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_a_test_runner_Try_npm_i_types_Slashje_2593',
    "Cannot find name '{0}'. Do you need to install type definitions for a test runner? Try `npm i @types/jest` or `npm i @types/mocha` and then add `jest` or `mocha` to the types field in your tsconfig."
  ),
  This_module_is_declared_with_using_export_and_can_only_be_used_with_a_default_import_when_using_the_0_flag: new Message(
    2594,
    Category.Error,
    'This_module_is_declared_with_using_export_and_can_only_be_used_with_a_default_import_when_using_the__2594',
    "This module is declared with using 'export =', and can only be used with a default import when using the '{0}' flag."
  ),
  _0_can_only_be_imported_by_using_a_default_import: new Message(
    2595,
    Category.Error,
    '_0_can_only_be_imported_by_using_a_default_import_2595',
    "'{0}' can only be imported by using a default import."
  ),
  _0_can_only_be_imported_by_turning_on_the_esModuleInterop_flag_and_using_a_default_import: new Message(
    2596,
    Category.Error,
    '_0_can_only_be_imported_by_turning_on_the_esModuleInterop_flag_and_using_a_default_import_2596',
    "'{0}' can only be imported by turning on the 'esModuleInterop' flag and using a default import."
  ),
  _0_can_only_be_imported_by_using_a_require_call_or_by_using_a_default_import: new Message(
    2597,
    Category.Error,
    '_0_can_only_be_imported_by_using_a_require_call_or_by_using_a_default_import_2597',
    "'{0}' can only be imported by using a 'require' call or by using a default import."
  ),
  _0_can_only_be_imported_by_using_a_require_call_or_by_turning_on_the_esModuleInterop_flag_and_using_a_default_import: new Message(
    2598,
    Category.Error,
    '_0_can_only_be_imported_by_using_a_require_call_or_by_turning_on_the_esModuleInterop_flag_and_using__2598',
    "'{0}' can only be imported by using a 'require' call or by turning on the 'esModuleInterop' flag and using a default import."
  ),
  JSX_element_attributes_type_0_may_not_be_a_union_type: new Message(
    2600,
    Category.Error,
    'JSX_element_attributes_type_0_may_not_be_a_union_type_2600',
    "JSX element attributes type '{0}' may not be a union type."
  ),
  The_return_type_of_a_JSX_element_constructor_must_return_an_object_type: new Message(
    2601,
    Category.Error,
    'The_return_type_of_a_JSX_element_constructor_must_return_an_object_type_2601',
    'The return type of a JSX element constructor must return an object type.'
  ),
  JSX_element_implicitly_has_type_any_because_the_global_type_JSX_Element_does_not_exist: new Message(
    2602,
    Category.Error,
    'JSX_element_implicitly_has_type_any_because_the_global_type_JSX_Element_does_not_exist_2602',
    "JSX element implicitly has type 'any' because the global type 'JSX.Element' does not exist."
  ),
  Property_0_in_type_1_is_not_assignable_to_type_2: new Message(
    2603,
    Category.Error,
    'Property_0_in_type_1_is_not_assignable_to_type_2_2603',
    "Property '{0}' in type '{1}' is not assignable to type '{2}'."
  ),
  JSX_element_type_0_does_not_have_any_construct_or_call_signatures: new Message(
    2604,
    Category.Error,
    'JSX_element_type_0_does_not_have_any_construct_or_call_signatures_2604',
    "JSX element type '{0}' does not have any construct or call signatures."
  ),
  JSX_element_type_0_is_not_a_constructor_function_for_JSX_elements: new Message(
    2605,
    Category.Error,
    'JSX_element_type_0_is_not_a_constructor_function_for_JSX_elements_2605',
    "JSX element type '{0}' is not a constructor function for JSX elements."
  ),
  Property_0_of_JSX_spread_attribute_is_not_assignable_to_target_property: new Message(
    2606,
    Category.Error,
    'Property_0_of_JSX_spread_attribute_is_not_assignable_to_target_property_2606',
    "Property '{0}' of JSX spread attribute is not assignable to target property."
  ),
  JSX_element_class_does_not_support_attributes_because_it_does_not_have_a_0_property: new Message(
    2607,
    Category.Error,
    'JSX_element_class_does_not_support_attributes_because_it_does_not_have_a_0_property_2607',
    "JSX element class does not support attributes because it does not have a '{0}' property."
  ),
  The_global_type_JSX_0_may_not_have_more_than_one_property: new Message(
    2608,
    Category.Error,
    'The_global_type_JSX_0_may_not_have_more_than_one_property_2608',
    "The global type 'JSX.{0}' may not have more than one property."
  ),
  JSX_spread_child_must_be_an_array_type: new Message(2609, Category.Error, 'JSX_spread_child_must_be_an_array_type_2609', 'JSX spread child must be an array type.'),
  _0_is_defined_as_an_accessor_in_class_1_but_is_overridden_here_in_2_as_an_instance_property: new Message(
    2610,
    Category.Error,
    '_0_is_defined_as_an_accessor_in_class_1_but_is_overridden_here_in_2_as_an_instance_property_2610',
    "'{0}' is defined as an accessor in class '{1}', but is overridden here in '{2}' as an instance property."
  ),
  _0_is_defined_as_a_property_in_class_1_but_is_overridden_here_in_2_as_an_accessor: new Message(
    2611,
    Category.Error,
    '_0_is_defined_as_a_property_in_class_1_but_is_overridden_here_in_2_as_an_accessor_2611',
    "'{0}' is defined as a property in class '{1}', but is overridden here in '{2}' as an accessor."
  ),
  Property_0_will_overwrite_the_base_property_in_1_If_this_is_intentional_add_an_initer_Otherwise_add_a_declare_modifier_or_remove_the_redundant_declaration: new Message(
    2612,
    Category.Error,
    'Property_0_will_overwrite_the_base_property_in_1_If_this_is_intentional_add_an_initer_Otherwise_2612',
    "Property '{0}' will overwrite the base property in '{1}'. If this is intentional, add an initer. Otherwise, add a 'declare' modifier or remove the redundant declaration."
  ),
  Module_0_has_no_default_export_Did_you_mean_to_use_import_1_from_0_instead: new Message(
    2613,
    Category.Error,
    'Module_0_has_no_default_export_Did_you_mean_to_use_import_1_from_0_instead_2613',
    "Module '{0}' has no default export. Did you mean to use 'import { {1} } from {0}' instead?"
  ),
  Module_0_has_no_exported_member_1_Did_you_mean_to_use_import_1_from_0_instead: new Message(
    2614,
    Category.Error,
    'Module_0_has_no_exported_member_1_Did_you_mean_to_use_import_1_from_0_instead_2614',
    "Module '{0}' has no exported member '{1}'. Did you mean to use 'import {1} from {0}' instead?"
  ),
  Type_of_property_0_circularly_references_itself_in_mapped_type_1: new Message(
    2615,
    Category.Error,
    'Type_of_property_0_circularly_references_itself_in_mapped_type_1_2615',
    "Type of property '{0}' circularly references itself in mapped type '{1}'."
  ),
  _0_can_only_be_imported_by_using_import_1_require_2_or_a_default_import: new Message(
    2616,
    Category.Error,
    '_0_can_only_be_imported_by_using_import_1_require_2_or_a_default_import_2616',
    "'{0}' can only be imported by using 'import {1} = require({2})' or a default import."
  ),
  _0_can_only_be_imported_by_using_import_1_require_2_or_by_turning_on_the_esModuleInterop_flag_and_using_a_default_import: new Message(
    2617,
    Category.Error,
    '_0_can_only_be_imported_by_using_import_1_require_2_or_by_turning_on_the_esModuleInterop_flag_and_us_2617',
    "'{0}' can only be imported by using 'import {1} = require({2})' or by turning on the 'esModuleInterop' flag and using a default import."
  ),
  Cannot_augment_module_0_with_value_exports_because_it_resolves_to_a_non_module_entity: new Message(
    2649,
    Category.Error,
    'Cannot_augment_module_0_with_value_exports_because_it_resolves_to_a_non_module_entity_2649',
    "Cannot augment module '{0}' with value exports because it resolves to a non-module entity."
  ),
  A_member_initer_in_a_enum_declaration_cannot_reference_members_declared_after_it_including_members_defined_in_other_enums: new Message(
    2651,
    Category.Error,
    'A_member_initer_in_a_enum_declaration_cannot_reference_members_declared_after_it_including_memb_2651',
    'A member initer in a enum declaration cannot reference members declared after it, including members defined in other enums.'
  ),
  Merged_declaration_0_cannot_include_a_default_export_declaration_Consider_adding_a_separate_export_default_0_declaration_instead: new Message(
    2652,
    Category.Error,
    'Merged_declaration_0_cannot_include_a_default_export_declaration_Consider_adding_a_separate_export_d_2652',
    "Merged declaration '{0}' cannot include a default export declaration. Consider adding a separate 'export default {0}' declaration instead."
  ),
  Non_abstract_class_expression_does_not_implement_inherited_abstract_member_0_from_class_1: new Message(
    2653,
    Category.Error,
    'Non_abstract_class_expression_does_not_implement_inherited_abstract_member_0_from_class_1_2653',
    "Non-abstract class expression does not implement inherited abstract member '{0}' from class '{1}'."
  ),
  Exported_external_package_typings_file_cannot_contain_tripleslash_references_Please_contact_the_package_author_to_update_the_package_definition: new Message(
    2654,
    Category.Error,
    'Exported_external_package_typings_file_cannot_contain_tripleslash_references_Please_contact_the_pack_2654',
    'Exported external package typings file cannot contain tripleslash references. Please contact the package author to update the package definition.'
  ),
  Exported_external_package_typings_file_0_is_not_a_module_Please_contact_the_package_author_to_update_the_package_definition: new Message(
    2656,
    Category.Error,
    'Exported_external_package_typings_file_0_is_not_a_module_Please_contact_the_package_author_to_update_2656',
    "Exported external package typings file '{0}' is not a module. Please contact the package author to update the package definition."
  ),
  JSX_expressions_must_have_one_parent_element: new Message(2657, Category.Error, 'JSX_expressions_must_have_one_parent_element_2657', 'JSX expressions must have one parent element.'),
  Type_0_provides_no_match_for_the_signature_1: new Message(2658, Category.Error, 'Type_0_provides_no_match_for_the_signature_1_2658', "Type '{0}' provides no match for the signature '{1}'."),
  super_is_only_allowed_in_members_of_object_literal_expressions_when_option_target_is_ES2015_or_higher: new Message(
    2659,
    Category.Error,
    'super_is_only_allowed_in_members_of_object_literal_expressions_when_option_target_is_ES2015_or_highe_2659',
    "'super' is only allowed in members of object literal expressions when option 'target' is 'ES2015' or higher."
  ),
  super_can_only_be_referenced_in_members_of_derived_classes_or_object_literal_expressions: new Message(
    2660,
    Category.Error,
    'super_can_only_be_referenced_in_members_of_derived_classes_or_object_literal_expressions_2660',
    "'super' can only be referenced in members of derived classes or object literal expressions."
  ),
  Cannot_export_0_Only_local_declarations_can_be_exported_from_a_module: new Message(
    2661,
    Category.Error,
    'Cannot_export_0_Only_local_declarations_can_be_exported_from_a_module_2661',
    "Cannot export '{0}'. Only local declarations can be exported from a module."
  ),
  Cannot_find_name_0_Did_you_mean_the_static_member_1_0: new Message(
    2662,
    Category.Error,
    'Cannot_find_name_0_Did_you_mean_the_static_member_1_0_2662',
    "Cannot find name '{0}'. Did you mean the static member '{1}.{0}'?"
  ),
  Cannot_find_name_0_Did_you_mean_the_instance_member_this_0: new Message(
    2663,
    Category.Error,
    'Cannot_find_name_0_Did_you_mean_the_instance_member_this_0_2663',
    "Cannot find name '{0}'. Did you mean the instance member 'this.{0}'?"
  ),
  Invalid_module_name_in_augmentation_module_0_cannot_be_found: new Message(
    2664,
    Category.Error,
    'Invalid_module_name_in_augmentation_module_0_cannot_be_found_2664',
    "Invalid module name in augmentation, module '{0}' cannot be found."
  ),
  Invalid_module_name_in_augmentation_Module_0_resolves_to_an_untyped_module_at_1_which_cannot_be_augmented: new Message(
    2665,
    Category.Error,
    'Invalid_module_name_in_augmentation_Module_0_resolves_to_an_untyped_module_at_1_which_cannot_be_augm_2665',
    "Invalid module name in augmentation. Module '{0}' resolves to an untyped module at '{1}', which cannot be augmented."
  ),
  Exports_and_export_assignments_are_not_permitted_in_module_augmentations: new Message(
    2666,
    Category.Error,
    'Exports_and_export_assignments_are_not_permitted_in_module_augmentations_2666',
    'Exports and export assignments are not permitted in module augmentations.'
  ),
  Imports_are_not_permitted_in_module_augmentations_Consider_moving_them_to_the_enclosing_external_module: new Message(
    2667,
    Category.Error,
    'Imports_are_not_permitted_in_module_augmentations_Consider_moving_them_to_the_enclosing_external_mod_2667',
    'Imports are not permitted in module augmentations. Consider moving them to the enclosing external module.'
  ),
  export_modifier_cannot_be_applied_to_ambient_modules_and_module_augmentations_since_they_are_always_visible: new Message(
    2668,
    Category.Error,
    'export_modifier_cannot_be_applied_to_ambient_modules_and_module_augmentations_since_they_are_always__2668',
    "'export' modifier cannot be applied to ambient modules and module augmentations since they are always visible."
  ),
  Augmentations_for_the_global_scope_can_only_be_directly_nested_in_external_modules_or_ambient_module_declarations: new Message(
    2669,
    Category.Error,
    'Augmentations_for_the_global_scope_can_only_be_directly_nested_in_external_modules_or_ambient_module_2669',
    'Augmentations for the global scope can only be directly nested in external modules or ambient module declarations.'
  ),
  Augmentations_for_the_global_scope_should_have_declare_modifier_unless_they_appear_in_already_ambient_context: new Message(
    2670,
    Category.Error,
    'Augmentations_for_the_global_scope_should_have_declare_modifier_unless_they_appear_in_already_ambien_2670',
    "Augmentations for the global scope should have 'declare' modifier unless they appear in already ambient context."
  ),
  Cannot_augment_module_0_because_it_resolves_to_a_non_module_entity: new Message(
    2671,
    Category.Error,
    'Cannot_augment_module_0_because_it_resolves_to_a_non_module_entity_2671',
    "Cannot augment module '{0}' because it resolves to a non-module entity."
  ),
  Cannot_assign_a_0_constructor_type_to_a_1_constructor_type: new Message(
    2672,
    Category.Error,
    'Cannot_assign_a_0_constructor_type_to_a_1_constructor_type_2672',
    "Cannot assign a '{0}' constructor type to a '{1}' constructor type."
  ),
  Constructor_of_class_0_is_private_and_only_accessible_within_the_class_declaration: new Message(
    2673,
    Category.Error,
    'Constructor_of_class_0_is_private_and_only_accessible_within_the_class_declaration_2673',
    "Constructor of class '{0}' is private and only accessible within the class declaration."
  ),
  Constructor_of_class_0_is_protected_and_only_accessible_within_the_class_declaration: new Message(
    2674,
    Category.Error,
    'Constructor_of_class_0_is_protected_and_only_accessible_within_the_class_declaration_2674',
    "Constructor of class '{0}' is protected and only accessible within the class declaration."
  ),
  Cannot_extend_a_class_0_Class_constructor_is_marked_as_private: new Message(
    2675,
    Category.Error,
    'Cannot_extend_a_class_0_Class_constructor_is_marked_as_private_2675',
    "Cannot extend a class '{0}'. Class constructor is marked as private."
  ),
  Accessors_must_both_be_abstract_or_non_abstract: new Message(2676, Category.Error, 'Accessors_must_both_be_abstract_or_non_abstract_2676', 'Accessors must both be abstract or non-abstract.'),
  A_type_predicate_s_type_must_be_assignable_to_its_parameter_s_type: new Message(
    2677,
    Category.Error,
    'A_type_predicate_s_type_must_be_assignable_to_its_parameter_s_type_2677',
    "A type predicate's type must be assignable to its parameter's type."
  ),
  Type_0_is_not_comparable_to_type_1: new Message(2678, Category.Error, 'Type_0_is_not_comparable_to_type_1_2678', "Type '{0}' is not comparable to type '{1}'."),
  A_function_that_is_called_with_the_new_keyword_cannot_have_a_this_type_that_is_void: new Message(
    2679,
    Category.Error,
    'A_function_that_is_called_with_the_new_keyword_cannot_have_a_this_type_that_is_void_2679',
    "A function that is called with the 'new' keyword cannot have a 'this' type that is 'void'."
  ),
  A_0_parameter_must_be_the_first_parameter: new Message(2680, Category.Error, 'A_0_parameter_must_be_the_first_parameter_2680', "A '{0}' parameter must be the first parameter."),
  A_constructor_cannot_have_a_this_parameter: new Message(2681, Category.Error, 'A_constructor_cannot_have_a_this_parameter_2681', "A constructor cannot have a 'this' parameter."),
  get_and_set_accessor_must_have_the_same_this_type: new Message(
    2682,
    Category.Error,
    'get_and_set_accessor_must_have_the_same_this_type_2682',
    "'get' and 'set' accessor must have the same 'this' type."
  ),
  this_implicitly_has_type_any_because_it_does_not_have_a_type_annotation: new Message(
    2683,
    Category.Error,
    'this_implicitly_has_type_any_because_it_does_not_have_a_type_annotation_2683',
    "'this' implicitly has type 'any' because it does not have a type annotation."
  ),
  The_this_context_of_type_0_is_not_assignable_to_method_s_this_of_type_1: new Message(
    2684,
    Category.Error,
    'The_this_context_of_type_0_is_not_assignable_to_method_s_this_of_type_1_2684',
    "The 'this' context of type '{0}' is not assignable to method's 'this' of type '{1}'."
  ),
  The_this_types_of_each_signature_are_incompatible: new Message(
    2685,
    Category.Error,
    'The_this_types_of_each_signature_are_incompatible_2685',
    "The 'this' types of each signature are incompatible."
  ),
  _0_refers_to_a_UMD_global_but_the_current_file_is_a_module_Consider_adding_an_import_instead: new Message(
    2686,
    Category.Error,
    '_0_refers_to_a_UMD_global_but_the_current_file_is_a_module_Consider_adding_an_import_instead_2686',
    "'{0}' refers to a UMD global, but the current file is a module. Consider adding an import instead."
  ),
  All_declarations_of_0_must_have_identical_modifiers: new Message(
    2687,
    Category.Error,
    'All_declarations_of_0_must_have_identical_modifiers_2687',
    "All declarations of '{0}' must have identical modifiers."
  ),
  Cannot_find_type_definition_file_for_0: new Message(2688, Category.Error, 'Cannot_find_type_definition_file_for_0_2688', "Cannot find type definition file for '{0}'."),
  Cannot_extend_an_interface_0_Did_you_mean_implements: new Message(
    2689,
    Category.Error,
    'Cannot_extend_an_interface_0_Did_you_mean_implements_2689',
    "Cannot extend an interface '{0}'. Did you mean 'implements'?"
  ),
  An_import_path_cannot_end_with_a_0_extension_Consider_importing_1_instead: new Message(
    2691,
    Category.Error,
    'An_import_path_cannot_end_with_a_0_extension_Consider_importing_1_instead_2691',
    "An import path cannot end with a '{0}' extension. Consider importing '{1}' instead."
  ),
  _0_is_a_primitive_but_1_is_a_wrapper_object_Prefer_using_0_when_possible: new Message(
    2692,
    Category.Error,
    '_0_is_a_primitive_but_1_is_a_wrapper_object_Prefer_using_0_when_possible_2692',
    "'{0}' is a primitive, but '{1}' is a wrapper object. Prefer using '{0}' when possible."
  ),
  _0_only_refers_to_a_type_but_is_being_used_as_a_value_here: new Message(
    2693,
    Category.Error,
    '_0_only_refers_to_a_type_but_is_being_used_as_a_value_here_2693',
    "'{0}' only refers to a type, but is being used as a value here."
  ),
  Namespace_0_has_no_exported_member_1: new Message(2694, Category.Error, 'Namespace_0_has_no_exported_member_1_2694', "Namespace '{0}' has no exported member '{1}'."),
  Left_side_of_comma_operator_is_unused_and_has_no_side_effects: new Message(
    2695,
    Category.Error,
    'Left_side_of_comma_operator_is_unused_and_has_no_side_effects_2695',
    'Left side of comma operator is unused and has no side effects.',
    true
  ),
  The_Object_type_is_assignable_to_very_few_other_types_Did_you_mean_to_use_the_any_type_instead: new Message(
    2696,
    Category.Error,
    'The_Object_type_is_assignable_to_very_few_other_types_Did_you_mean_to_use_the_any_type_instead_2696',
    "The 'Object' type is assignable to very few other types. Did you mean to use the 'any' type instead?"
  ),
  An_async_function_or_method_must_return_a_Promise_Make_sure_you_have_a_declaration_for_Promise_or_include_ES2015_in_your_lib_option: new Message(
    2697,
    Category.Error,
    'An_async_function_or_method_must_return_a_Promise_Make_sure_you_have_a_declaration_for_Promise_or_in_2697',
    "An async function or method must return a 'Promise'. Make sure you have a declaration for 'Promise' or include 'ES2015' in your `--lib` option."
  ),
  Spread_types_may_only_be_created_from_object_types: new Message(
    2698,
    Category.Error,
    'Spread_types_may_only_be_created_from_object_types_2698',
    'Spread types may only be created from object types.'
  ),
  Static_property_0_conflicts_with_built_in_property_Function_0_of_constructor_function_1: new Message(
    2699,
    Category.Error,
    'Static_property_0_conflicts_with_built_in_property_Function_0_of_constructor_function_1_2699',
    "Static property '{0}' conflicts with built-in property 'Function.{0}' of constructor function '{1}'."
  ),
  Rest_types_may_only_be_created_from_object_types: new Message(2700, Category.Error, 'Rest_types_may_only_be_created_from_object_types_2700', 'Rest types may only be created from object types.'),
  The_target_of_an_object_rest_assignment_must_be_a_variable_or_a_property_access: new Message(
    2701,
    Category.Error,
    'The_target_of_an_object_rest_assignment_must_be_a_variable_or_a_property_access_2701',
    'The target of an object rest assignment must be a variable or a property access.'
  ),
  _0_only_refers_to_a_type_but_is_being_used_as_a_namespace_here: new Message(
    2702,
    Category.Error,
    '_0_only_refers_to_a_type_but_is_being_used_as_a_namespace_here_2702',
    "'{0}' only refers to a type, but is being used as a namespace here."
  ),
  The_operand_of_a_delete_operator_must_be_a_property_reference: new Message(
    2703,
    Category.Error,
    'The_operand_of_a_delete_operator_must_be_a_property_reference_2703',
    "The operand of a 'delete' operator must be a property reference."
  ),
  The_operand_of_a_delete_operator_cannot_be_a_read_only_property: new Message(
    2704,
    Category.Error,
    'The_operand_of_a_delete_operator_cannot_be_a_read_only_property_2704',
    "The operand of a 'delete' operator cannot be a read-only property."
  ),
  An_async_function_or_method_in_ES5_SlashES3_requires_the_Promise_constructor_Make_sure_you_have_a_declaration_for_the_Promise_constructor_or_include_ES2015_in_your_lib_option: new Message(
    2705,
    Category.Error,
    'An_async_function_or_method_in_ES5_SlashES3_requires_the_Promise_constructor_Make_sure_you_have_a_de_2705',
    "An async function or method in ES5/ES3 requires the 'Promise' constructor.  Make sure you have a declaration for the 'Promise' constructor or include 'ES2015' in your `--lib` option."
  ),
  Required_type_parameters_may_not_follow_optional_type_parameters: new Message(
    2706,
    Category.Error,
    'Required_type_parameters_may_not_follow_optional_type_parameters_2706',
    'Required type parameters may not follow optional type parameters.'
  ),
  Generic_type_0_requires_between_1_and_2_type_arguments: new Message(
    2707,
    Category.Error,
    'Generic_type_0_requires_between_1_and_2_type_arguments_2707',
    "Generic type '{0}' requires between {1} and {2} type arguments."
  ),
  Cannot_use_namespace_0_as_a_value: new Message(2708, Category.Error, 'Cannot_use_namespace_0_as_a_value_2708', "Cannot use namespace '{0}' as a value."),
  Cannot_use_namespace_0_as_a_type: new Message(2709, Category.Error, 'Cannot_use_namespace_0_as_a_type_2709', "Cannot use namespace '{0}' as a type."),
  _0_are_specified_twice_The_attribute_named_0_will_be_overwritten: new Message(
    2710,
    Category.Error,
    '_0_are_specified_twice_The_attribute_named_0_will_be_overwritten_2710',
    "'{0}' are specified twice. The attribute named '{0}' will be overwritten."
  ),
  A_dynamic_import_call_returns_a_Promise_Make_sure_you_have_a_declaration_for_Promise_or_include_ES2015_in_your_lib_option: new Message(
    2711,
    Category.Error,
    'A_dynamic_import_call_returns_a_Promise_Make_sure_you_have_a_declaration_for_Promise_or_include_ES20_2711',
    "A dynamic import call returns a 'Promise'. Make sure you have a declaration for 'Promise' or include 'ES2015' in your `--lib` option."
  ),
  A_dynamic_import_call_in_ES5_SlashES3_requires_the_Promise_constructor_Make_sure_you_have_a_declaration_for_the_Promise_constructor_or_include_ES2015_in_your_lib_option: new Message(
    2712,
    Category.Error,
    'A_dynamic_import_call_in_ES5_SlashES3_requires_the_Promise_constructor_Make_sure_you_have_a_declarat_2712',
    "A dynamic import call in ES5/ES3 requires the 'Promise' constructor.  Make sure you have a declaration for the 'Promise' constructor or include 'ES2015' in your `--lib` option."
  ),
  Cannot_access_0_1_because_0_is_a_type_but_not_a_namespace_Did_you_mean_to_retrieve_the_type_of_the_property_1_in_0_with_0_1: new Message(
    2713,
    Category.Error,
    'Cannot_access_0_1_because_0_is_a_type_but_not_a_namespace_Did_you_mean_to_retrieve_the_type_of_the_p_2713',
    "Cannot access '{0}.{1}' because '{0}' is a type, but not a namespace. Did you mean to retrieve the type of the property '{1}' in '{0}' with '{0}[\"{1}\"]'?"
  ),
  The_expression_of_an_export_assignment_must_be_an_identifier_or_qualified_name_in_an_ambient_context: new Message(
    2714,
    Category.Error,
    'The_expression_of_an_export_assignment_must_be_an_identifier_or_qualified_name_in_an_ambient_context_2714',
    'The expression of an export assignment must be an identifier or qualified name in an ambient context.'
  ),
  Abstract_property_0_in_class_1_cannot_be_accessed_in_the_constructor: new Message(
    2715,
    Category.Error,
    'Abstract_property_0_in_class_1_cannot_be_accessed_in_the_constructor_2715',
    "Abstract property '{0}' in class '{1}' cannot be accessed in the constructor."
  ),
  Type_parameter_0_has_a_circular_default: new Message(2716, Category.Error, 'Type_parameter_0_has_a_circular_default_2716', "Type parameter '{0}' has a circular default."),
  Subsequent_property_declarations_must_have_the_same_type_Property_0_must_be_of_type_1_but_here_has_type_2: new Message(
    2717,
    Category.Error,
    'Subsequent_property_declarations_must_have_the_same_type_Property_0_must_be_of_type_1_but_here_has_t_2717',
    "Subsequent property declarations must have the same type.  Property '{0}' must be of type '{1}', but here has type '{2}'."
  ),
  Duplicate_property_0: new Message(2718, Category.Error, 'Duplicate_property_0_2718', "Duplicate property '{0}'."),
  Type_0_is_not_assignable_to_type_1_Two_different_types_with_this_name_exist_but_they_are_unrelated: new Message(
    2719,
    Category.Error,
    'Type_0_is_not_assignable_to_type_1_Two_different_types_with_this_name_exist_but_they_are_unrelated_2719',
    "Type '{0}' is not assignable to type '{1}'. Two different types with this name exist, but they are unrelated."
  ),
  Class_0_incorrectly_implements_class_1_Did_you_mean_to_extend_1_and_inherit_its_members_as_a_subclass: new Message(
    2720,
    Category.Error,
    'Class_0_incorrectly_implements_class_1_Did_you_mean_to_extend_1_and_inherit_its_members_as_a_subclas_2720',
    "Class '{0}' incorrectly implements class '{1}'. Did you mean to extend '{1}' and inherit its members as a subclass?"
  ),
  Cannot_invoke_an_object_which_is_possibly_null: new Message(2721, Category.Error, 'Cannot_invoke_an_object_which_is_possibly_null_2721', "Cannot invoke an object which is possibly 'null'."),
  Cannot_invoke_an_object_which_is_possibly_undefined: new Message(
    2722,
    Category.Error,
    'Cannot_invoke_an_object_which_is_possibly_undefined_2722',
    "Cannot invoke an object which is possibly 'undefined'."
  ),
  Cannot_invoke_an_object_which_is_possibly_null_or_undefined: new Message(
    2723,
    Category.Error,
    'Cannot_invoke_an_object_which_is_possibly_null_or_undefined_2723',
    "Cannot invoke an object which is possibly 'null' or 'undefined'."
  ),
  Module_0_has_no_exported_member_1_Did_you_mean_2: new Message(
    2724,
    Category.Error,
    'Module_0_has_no_exported_member_1_Did_you_mean_2_2724',
    "Module '{0}' has no exported member '{1}'. Did you mean '{2}'?"
  ),
  Class_name_cannot_be_Object_when_targeting_ES5_with_module_0: new Message(
    2725,
    Category.Error,
    'Class_name_cannot_be_Object_when_targeting_ES5_with_module_0_2725',
    "Class name cannot be 'Object' when targeting ES5 with module {0}."
  ),
  Cannot_find_lib_definition_for_0: new Message(2726, Category.Error, 'Cannot_find_lib_definition_for_0_2726', "Cannot find lib definition for '{0}'."),
  Cannot_find_lib_definition_for_0_Did_you_mean_1: new Message(
    2727,
    Category.Error,
    'Cannot_find_lib_definition_for_0_Did_you_mean_1_2727',
    "Cannot find lib definition for '{0}'. Did you mean '{1}'?"
  ),
  _0_is_declared_here: new Message(2728, Category.Message, '_0_is_declared_here_2728', "'{0}' is declared here."),
  Property_0_is_used_before_its_initialization: new Message(2729, Category.Error, 'Property_0_is_used_before_its_initialization_2729', "Property '{0}' is used before its initialization."),
  An_arrow_function_cannot_have_a_this_parameter: new Message(2730, Category.Error, 'An_arrow_function_cannot_have_a_this_parameter_2730', "An arrow function cannot have a 'this' parameter."),
  Implicit_conversion_of_a_symbol_to_a_string_will_fail_at_runtime_Consider_wrapping_this_expression_in_String: new Message(
    2731,
    Category.Error,
    'Implicit_conversion_of_a_symbol_to_a_string_will_fail_at_runtime_Consider_wrapping_this_expression_i_2731',
    "Implicit conversion of a 'symbol' to a 'string' will fail at runtime. Consider wrapping this expression in 'String(...)'."
  ),
  Cannot_find_module_0_Consider_using_resolveJsonModule_to_import_module_with_json_extension: new Message(
    2732,
    Category.Error,
    'Cannot_find_module_0_Consider_using_resolveJsonModule_to_import_module_with_json_extension_2732',
    "Cannot find module '{0}'. Consider using '--resolveJsonModule' to import module with '.json' extension"
  ),
  Property_0_was_also_declared_here: new Message(2733, Category.Error, 'Property_0_was_also_declared_here_2733', "Property '{0}' was also declared here."),
  Are_you_missing_a_semicolon: new Message(2734, Category.Error, 'Are_you_missing_a_semicolon_2734', 'Are you missing a semicolon?'),
  Did_you_mean_for_0_to_be_constrained_to_type_new_args_Colon_any_1: new Message(
    2735,
    Category.Error,
    'Did_you_mean_for_0_to_be_constrained_to_type_new_args_Colon_any_1_2735',
    "Did you mean for '{0}' to be constrained to type 'new (...args: any[]) => {1}'?"
  ),
  Operator_0_cannot_be_applied_to_type_1: new Message(2736, Category.Error, 'Operator_0_cannot_be_applied_to_type_1_2736', "Operator '{0}' cannot be applied to type '{1}'."),
  BigInt_literals_are_not_available_when_targeting_lower_than_ES2020: new Message(
    2737,
    Category.Error,
    'BigInt_literals_are_not_available_when_targeting_lower_than_ES2020_2737',
    'BigInt literals are not available when targeting lower than ES2020.'
  ),
  An_outer_value_of_this_is_shadowed_by_this_container: new Message(
    2738,
    Category.Message,
    'An_outer_value_of_this_is_shadowed_by_this_container_2738',
    "An outer value of 'this' is shadowed by this container."
  ),
  Type_0_is_missing_the_following_properties_from_type_1_Colon_2: new Message(
    2739,
    Category.Error,
    'Type_0_is_missing_the_following_properties_from_type_1_Colon_2_2739',
    "Type '{0}' is missing the following properties from type '{1}': {2}"
  ),
  Type_0_is_missing_the_following_properties_from_type_1_Colon_2_and_3_more: new Message(
    2740,
    Category.Error,
    'Type_0_is_missing_the_following_properties_from_type_1_Colon_2_and_3_more_2740',
    "Type '{0}' is missing the following properties from type '{1}': {2}, and {3} more."
  ),
  Property_0_is_missing_in_type_1_but_required_in_type_2: new Message(
    2741,
    Category.Error,
    'Property_0_is_missing_in_type_1_but_required_in_type_2_2741',
    "Property '{0}' is missing in type '{1}' but required in type '{2}'."
  ),
  The_inferred_type_of_0_cannot_be_named_without_a_reference_to_1_This_is_likely_not_portable_A_type_annotation_is_necessary: new Message(
    2742,
    Category.Error,
    'The_inferred_type_of_0_cannot_be_named_without_a_reference_to_1_This_is_likely_not_portable_A_type_a_2742',
    "The inferred type of '{0}' cannot be named without a reference to '{1}'. This is likely not portable. A type annotation is necessary."
  ),
  No_overload_expects_0_type_arguments_but_overloads_do_exist_that_expect_either_1_or_2_type_arguments: new Message(
    2743,
    Category.Error,
    'No_overload_expects_0_type_arguments_but_overloads_do_exist_that_expect_either_1_or_2_type_arguments_2743',
    'No overload expects {0} type arguments, but overloads do exist that expect either {1} or {2} type arguments.'
  ),
  Type_parameter_defaults_can_only_reference_previously_declared_type_parameters: new Message(
    2744,
    Category.Error,
    'Type_parameter_defaults_can_only_reference_previously_declared_type_parameters_2744',
    'Type parameter defaults can only reference previously declared type parameters.'
  ),
  This_JSX_tag_s_0_prop_expects_type_1_which_requires_multiple_children_but_only_a_single_child_was_provided: new Message(
    2745,
    Category.Error,
    'This_JSX_tag_s_0_prop_expects_type_1_which_requires_multiple_children_but_only_a_single_child_was_pr_2745',
    "This JSX tag's '{0}' prop expects type '{1}' which requires multiple children, but only a single child was provided."
  ),
  This_JSX_tag_s_0_prop_expects_a_single_child_of_type_1_but_multiple_children_were_provided: new Message(
    2746,
    Category.Error,
    'This_JSX_tag_s_0_prop_expects_a_single_child_of_type_1_but_multiple_children_were_provided_2746',
    "This JSX tag's '{0}' prop expects a single child of type '{1}', but multiple children were provided."
  ),
  _0_components_don_t_accept_text_as_child_elements_Text_in_JSX_has_the_type_string_but_the_expected_type_of_1_is_2: new Message(
    2747,
    Category.Error,
    '_0_components_don_t_accept_text_as_child_elements_Text_in_JSX_has_the_type_string_but_the_expected_t_2747',
    "'{0}' components don't accept text as child elements. Text in JSX has the type 'string', but the expected type of '{1}' is '{2}'."
  ),
  Cannot_access_ambient_const_enums_when_the_isolatedModules_flag_is_provided: new Message(
    2748,
    Category.Error,
    'Cannot_access_ambient_const_enums_when_the_isolatedModules_flag_is_provided_2748',
    "Cannot access ambient const enums when the '--isolatedModules' flag is provided."
  ),
  _0_refers_to_a_value_but_is_being_used_as_a_type_here_Did_you_mean_typeof_0: new Message(
    2749,
    Category.Error,
    '_0_refers_to_a_value_but_is_being_used_as_a_type_here_Did_you_mean_typeof_0_2749',
    "'{0}' refers to a value, but is being used as a type here. Did you mean 'typeof {0}'?"
  ),
  The_implementation_signature_is_declared_here: new Message(2750, Category.Error, 'The_implementation_signature_is_declared_here_2750', 'The implementation signature is declared here.'),
  Circularity_originates_in_type_at_this_location: new Message(2751, Category.Error, 'Circularity_originates_in_type_at_this_location_2751', 'Circularity originates in type at this location.'),
  The_first_export_default_is_here: new Message(2752, Category.Error, 'The_first_export_default_is_here_2752', 'The first export default is here.'),
  Another_export_default_is_here: new Message(2753, Category.Error, 'Another_export_default_is_here_2753', 'Another export default is here.'),
  super_may_not_use_type_arguments: new Message(2754, Category.Error, 'super_may_not_use_type_arguments_2754', "'super' may not use type arguments."),
  No_constituent_of_type_0_is_callable: new Message(2755, Category.Error, 'No_constituent_of_type_0_is_callable_2755', "No constituent of type '{0}' is callable."),
  Not_all_constituents_of_type_0_are_callable: new Message(2756, Category.Error, 'Not_all_constituents_of_type_0_are_callable_2756', "Not all constituents of type '{0}' are callable."),
  Type_0_has_no_call_signatures: new Message(2757, Category.Error, 'Type_0_has_no_call_signatures_2757', "Type '{0}' has no call signatures."),
  Each_member_of_the_union_type_0_has_signatures_but_none_of_those_signatures_are_compatible_with_each_other: new Message(
    2758,
    Category.Error,
    'Each_member_of_the_union_type_0_has_signatures_but_none_of_those_signatures_are_compatible_with_each_2758',
    "Each member of the union type '{0}' has signatures, but none of those signatures are compatible with each other."
  ),
  No_constituent_of_type_0_is_constructable: new Message(2759, Category.Error, 'No_constituent_of_type_0_is_constructable_2759', "No constituent of type '{0}' is constructable."),
  Not_all_constituents_of_type_0_are_constructable: new Message(2760, Category.Error, 'Not_all_constituents_of_type_0_are_constructable_2760', "Not all constituents of type '{0}' are constructable."),
  Type_0_has_no_construct_signatures: new Message(2761, Category.Error, 'Type_0_has_no_construct_signatures_2761', "Type '{0}' has no construct signatures."),
  Each_member_of_the_union_type_0_has_construct_signatures_but_none_of_those_signatures_are_compatible_with_each_other: new Message(
    2762,
    Category.Error,
    'Each_member_of_the_union_type_0_has_construct_signatures_but_none_of_those_signatures_are_compatible_2762',
    "Each member of the union type '{0}' has construct signatures, but none of those signatures are compatible with each other."
  ),
  Cannot_iterate_value_because_the_next_method_of_its_iterator_expects_type_1_but_for_of_will_always_send_0: new Message(
    2763,
    Category.Error,
    'Cannot_iterate_value_because_the_next_method_of_its_iterator_expects_type_1_but_for_of_will_always_s_2763',
    "Cannot iterate value because the 'next' method of its iterator expects type '{1}', but for-of will always send '{0}'."
  ),
  Cannot_iterate_value_because_the_next_method_of_its_iterator_expects_type_1_but_array_spread_will_always_send_0: new Message(
    2764,
    Category.Error,
    'Cannot_iterate_value_because_the_next_method_of_its_iterator_expects_type_1_but_array_spread_will_al_2764',
    "Cannot iterate value because the 'next' method of its iterator expects type '{1}', but array spread will always send '{0}'."
  ),
  Cannot_iterate_value_because_the_next_method_of_its_iterator_expects_type_1_but_array_destructuring_will_always_send_0: new Message(
    2765,
    Category.Error,
    'Cannot_iterate_value_because_the_next_method_of_its_iterator_expects_type_1_but_array_destructuring__2765',
    "Cannot iterate value because the 'next' method of its iterator expects type '{1}', but array destructuring will always send '{0}'."
  ),
  Cannot_delegate_iteration_to_value_because_the_next_method_of_its_iterator_expects_type_1_but_the_containing_generator_will_always_send_0: new Message(
    2766,
    Category.Error,
    'Cannot_delegate_iteration_to_value_because_the_next_method_of_its_iterator_expects_type_1_but_the_co_2766',
    "Cannot delegate iteration to value because the 'next' method of its iterator expects type '{1}', but the containing generator will always send '{0}'."
  ),
  The_0_property_of_an_iterator_must_be_a_method: new Message(2767, Category.Error, 'The_0_property_of_an_iterator_must_be_a_method_2767', "The '{0}' property of an iterator must be a method."),
  The_0_property_of_an_async_iterator_must_be_a_method: new Message(
    2768,
    Category.Error,
    'The_0_property_of_an_async_iterator_must_be_a_method_2768',
    "The '{0}' property of an async iterator must be a method."
  ),
  No_overload_matches_this_call: new Message(2769, Category.Error, 'No_overload_matches_this_call_2769', 'No overload matches this call.'),
  The_last_overload_gave_the_following_error: new Message(2770, Category.Error, 'The_last_overload_gave_the_following_error_2770', 'The last overload gave the following error.'),
  The_last_overload_is_declared_here: new Message(2771, Category.Error, 'The_last_overload_is_declared_here_2771', 'The last overload is declared here.'),
  Overload_0_of_1_2_gave_the_following_error: new Message(2772, Category.Error, 'Overload_0_of_1_2_gave_the_following_error_2772', "Overload {0} of {1}, '{2}', gave the following error."),
  Did_you_forget_to_use_await: new Message(2773, Category.Error, 'Did_you_forget_to_use_await_2773', "Did you forget to use 'await'?"),
  This_condition_will_always_return_true_since_the_function_is_always_defined_Did_you_mean_to_call_it_instead: new Message(
    2774,
    Category.Error,
    'This_condition_will_always_return_true_since_the_function_is_always_defined_Did_you_mean_to_call_it__2774',
    'This condition will always return true since the function is always defined. Did you mean to call it instead?'
  ),
  Assertions_require_every_name_in_the_call_target_to_be_declared_with_an_explicit_type_annotation: new Message(
    2775,
    Category.Error,
    'Assertions_require_every_name_in_the_call_target_to_be_declared_with_an_explicit_type_annotation_2775',
    'Assertions require every name in the call target to be declared with an explicit type annotation.'
  ),
  Assertions_require_the_call_target_to_be_an_identifier_or_qualified_name: new Message(
    2776,
    Category.Error,
    'Assertions_require_the_call_target_to_be_an_identifier_or_qualified_name_2776',
    'Assertions require the call target to be an identifier or qualified name.'
  ),
  The_operand_of_an_increment_or_decrement_operator_may_not_be_an_optional_property_access: new Message(
    2777,
    Category.Error,
    'The_operand_of_an_increment_or_decrement_operator_may_not_be_an_optional_property_access_2777',
    'The operand of an increment or decrement operator may not be an optional property access.'
  ),
  The_target_of_an_object_rest_assignment_may_not_be_an_optional_property_access: new Message(
    2778,
    Category.Error,
    'The_target_of_an_object_rest_assignment_may_not_be_an_optional_property_access_2778',
    'The target of an object rest assignment may not be an optional property access.'
  ),
  The_left_hand_side_of_an_assignment_expression_may_not_be_an_optional_property_access: new Message(
    2779,
    Category.Error,
    'The_left_hand_side_of_an_assignment_expression_may_not_be_an_optional_property_access_2779',
    'The left-hand side of an assignment expression may not be an optional property access.'
  ),
  The_left_hand_side_of_a_for_in_statement_may_not_be_an_optional_property_access: new Message(
    2780,
    Category.Error,
    'The_left_hand_side_of_a_for_in_statement_may_not_be_an_optional_property_access_2780',
    "The left-hand side of a 'for...in' statement may not be an optional property access."
  ),
  The_left_hand_side_of_a_for_of_statement_may_not_be_an_optional_property_access: new Message(
    2781,
    Category.Error,
    'The_left_hand_side_of_a_for_of_statement_may_not_be_an_optional_property_access_2781',
    "The left-hand side of a 'for...of' statement may not be an optional property access."
  ),
  _0_needs_an_explicit_type_annotation: new Message(2782, Category.Message, '_0_needs_an_explicit_type_annotation_2782', "'{0}' needs an explicit type annotation."),
  _0_is_specified_more_than_once_so_this_usage_will_be_overwritten: new Message(
    2783,
    Category.Error,
    '_0_is_specified_more_than_once_so_this_usage_will_be_overwritten_2783',
    "'{0}' is specified more than once, so this usage will be overwritten."
  ),
  get_and_set_accessors_cannot_declare_this_parameters: new Message(
    2784,
    Category.Error,
    'get_and_set_accessors_cannot_declare_this_parameters_2784',
    "'get' and 'set' accessors cannot declare 'this' parameters."
  ),
  This_spread_always_overwrites_this_property: new Message(2785, Category.Error, 'This_spread_always_overwrites_this_property_2785', 'This spread always overwrites this property.'),
  _0_cannot_be_used_as_a_JSX_component: new Message(2786, Category.Error, '_0_cannot_be_used_as_a_JSX_component_2786', "'{0}' cannot be used as a JSX component."),
  Its_return_type_0_is_not_a_valid_JSX_element: new Message(2787, Category.Error, 'Its_return_type_0_is_not_a_valid_JSX_element_2787', "Its return type '{0}' is not a valid JSX element."),
  Its_instance_type_0_is_not_a_valid_JSX_element: new Message(2788, Category.Error, 'Its_instance_type_0_is_not_a_valid_JSX_element_2788', "Its instance type '{0}' is not a valid JSX element."),
  Its_element_type_0_is_not_a_valid_JSX_element: new Message(2789, Category.Error, 'Its_element_type_0_is_not_a_valid_JSX_element_2789', "Its element type '{0}' is not a valid JSX element."),
  The_operand_of_a_delete_operator_must_be_optional: new Message(
    2790,
    Category.Error,
    'The_operand_of_a_delete_operator_must_be_optional_2790',
    "The operand of a 'delete' operator must be optional."
  ),
  Exponentiation_cannot_be_performed_on_bigint_values_unless_the_target_option_is_set_to_es2016_or_later: new Message(
    2791,
    Category.Error,
    'Exponentiation_cannot_be_performed_on_bigint_values_unless_the_target_option_is_set_to_es2016_or_lat_2791',
    "Exponentiation cannot be performed on 'bigint' values unless the 'target' option is set to 'es2016' or later."
  ),
  Import_declaration_0_is_using_private_name_1: new Message(4000, Category.Error, 'Import_declaration_0_is_using_private_name_1_4000', "Import declaration '{0}' is using private name '{1}'."),
  Type_parameter_0_of_exported_class_has_or_is_using_private_name_1: new Message(
    4002,
    Category.Error,
    'Type_parameter_0_of_exported_class_has_or_is_using_private_name_1_4002',
    "Type parameter '{0}' of exported class has or is using private name '{1}'."
  ),
  Type_parameter_0_of_exported_interface_has_or_is_using_private_name_1: new Message(
    4004,
    Category.Error,
    'Type_parameter_0_of_exported_interface_has_or_is_using_private_name_1_4004',
    "Type parameter '{0}' of exported interface has or is using private name '{1}'."
  ),
  Type_parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_1: new Message(
    4006,
    Category.Error,
    'Type_parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_1_4006',
    "Type parameter '{0}' of constructor signature from exported interface has or is using private name '{1}'."
  ),
  Type_parameter_0_of_call_signature_from_exported_interface_has_or_is_using_private_name_1: new Message(
    4008,
    Category.Error,
    'Type_parameter_0_of_call_signature_from_exported_interface_has_or_is_using_private_name_1_4008',
    "Type parameter '{0}' of call signature from exported interface has or is using private name '{1}'."
  ),
  Type_parameter_0_of_public_static_method_from_exported_class_has_or_is_using_private_name_1: new Message(
    4010,
    Category.Error,
    'Type_parameter_0_of_public_static_method_from_exported_class_has_or_is_using_private_name_1_4010',
    "Type parameter '{0}' of public static method from exported class has or is using private name '{1}'."
  ),
  Type_parameter_0_of_public_method_from_exported_class_has_or_is_using_private_name_1: new Message(
    4012,
    Category.Error,
    'Type_parameter_0_of_public_method_from_exported_class_has_or_is_using_private_name_1_4012',
    "Type parameter '{0}' of public method from exported class has or is using private name '{1}'."
  ),
  Type_parameter_0_of_method_from_exported_interface_has_or_is_using_private_name_1: new Message(
    4014,
    Category.Error,
    'Type_parameter_0_of_method_from_exported_interface_has_or_is_using_private_name_1_4014',
    "Type parameter '{0}' of method from exported interface has or is using private name '{1}'."
  ),
  Type_parameter_0_of_exported_function_has_or_is_using_private_name_1: new Message(
    4016,
    Category.Error,
    'Type_parameter_0_of_exported_function_has_or_is_using_private_name_1_4016',
    "Type parameter '{0}' of exported function has or is using private name '{1}'."
  ),
  Implements_clause_of_exported_class_0_has_or_is_using_private_name_1: new Message(
    4019,
    Category.Error,
    'Implements_clause_of_exported_class_0_has_or_is_using_private_name_1_4019',
    "Implements clause of exported class '{0}' has or is using private name '{1}'."
  ),
  extends_clause_of_exported_class_0_has_or_is_using_private_name_1: new Message(
    4020,
    Category.Error,
    'extends_clause_of_exported_class_0_has_or_is_using_private_name_1_4020',
    "'extends' clause of exported class '{0}' has or is using private name '{1}'."
  ),
  extends_clause_of_exported_interface_0_has_or_is_using_private_name_1: new Message(
    4022,
    Category.Error,
    'extends_clause_of_exported_interface_0_has_or_is_using_private_name_1_4022',
    "'extends' clause of exported interface '{0}' has or is using private name '{1}'."
  ),
  Exported_variable_0_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: new Message(
    4023,
    Category.Error,
    'Exported_variable_0_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named_4023',
    "Exported variable '{0}' has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Exported_variable_0_has_or_is_using_name_1_from_private_module_2: new Message(
    4024,
    Category.Error,
    'Exported_variable_0_has_or_is_using_name_1_from_private_module_2_4024',
    "Exported variable '{0}' has or is using name '{1}' from private module '{2}'."
  ),
  Exported_variable_0_has_or_is_using_private_name_1: new Message(
    4025,
    Category.Error,
    'Exported_variable_0_has_or_is_using_private_name_1_4025',
    "Exported variable '{0}' has or is using private name '{1}'."
  ),
  Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: new Message(
    4026,
    Category.Error,
    'Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot__4026',
    "Public static property '{0}' of exported class has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2: new Message(
    4027,
    Category.Error,
    'Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2_4027',
    "Public static property '{0}' of exported class has or is using name '{1}' from private module '{2}'."
  ),
  Public_static_property_0_of_exported_class_has_or_is_using_private_name_1: new Message(
    4028,
    Category.Error,
    'Public_static_property_0_of_exported_class_has_or_is_using_private_name_1_4028',
    "Public static property '{0}' of exported class has or is using private name '{1}'."
  ),
  Public_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: new Message(
    4029,
    Category.Error,
    'Public_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_name_4029',
    "Public property '{0}' of exported class has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Public_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2: new Message(
    4030,
    Category.Error,
    'Public_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2_4030',
    "Public property '{0}' of exported class has or is using name '{1}' from private module '{2}'."
  ),
  Public_property_0_of_exported_class_has_or_is_using_private_name_1: new Message(
    4031,
    Category.Error,
    'Public_property_0_of_exported_class_has_or_is_using_private_name_1_4031',
    "Public property '{0}' of exported class has or is using private name '{1}'."
  ),
  Property_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2: new Message(
    4032,
    Category.Error,
    'Property_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2_4032',
    "Property '{0}' of exported interface has or is using name '{1}' from private module '{2}'."
  ),
  Property_0_of_exported_interface_has_or_is_using_private_name_1: new Message(
    4033,
    Category.Error,
    'Property_0_of_exported_interface_has_or_is_using_private_name_1_4033',
    "Property '{0}' of exported interface has or is using private name '{1}'."
  ),
  Parameter_type_of_public_static_setter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2: new Message(
    4034,
    Category.Error,
    'Parameter_type_of_public_static_setter_0_from_exported_class_has_or_is_using_name_1_from_private_mod_4034',
    "Parameter type of public static setter '{0}' from exported class has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_type_of_public_static_setter_0_from_exported_class_has_or_is_using_private_name_1: new Message(
    4035,
    Category.Error,
    'Parameter_type_of_public_static_setter_0_from_exported_class_has_or_is_using_private_name_1_4035',
    "Parameter type of public static setter '{0}' from exported class has or is using private name '{1}'."
  ),
  Parameter_type_of_public_setter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2: new Message(
    4036,
    Category.Error,
    'Parameter_type_of_public_setter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2_4036',
    "Parameter type of public setter '{0}' from exported class has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_type_of_public_setter_0_from_exported_class_has_or_is_using_private_name_1: new Message(
    4037,
    Category.Error,
    'Parameter_type_of_public_setter_0_from_exported_class_has_or_is_using_private_name_1_4037',
    "Parameter type of public setter '{0}' from exported class has or is using private name '{1}'."
  ),
  Return_type_of_public_static_getter_0_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: new Message(
    4038,
    Category.Error,
    'Return_type_of_public_static_getter_0_from_exported_class_has_or_is_using_name_1_from_external_modul_4038',
    "Return type of public static getter '{0}' from exported class has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Return_type_of_public_static_getter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2: new Message(
    4039,
    Category.Error,
    'Return_type_of_public_static_getter_0_from_exported_class_has_or_is_using_name_1_from_private_module_4039',
    "Return type of public static getter '{0}' from exported class has or is using name '{1}' from private module '{2}'."
  ),
  Return_type_of_public_static_getter_0_from_exported_class_has_or_is_using_private_name_1: new Message(
    4040,
    Category.Error,
    'Return_type_of_public_static_getter_0_from_exported_class_has_or_is_using_private_name_1_4040',
    "Return type of public static getter '{0}' from exported class has or is using private name '{1}'."
  ),
  Return_type_of_public_getter_0_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: new Message(
    4041,
    Category.Error,
    'Return_type_of_public_getter_0_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_4041',
    "Return type of public getter '{0}' from exported class has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Return_type_of_public_getter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2: new Message(
    4042,
    Category.Error,
    'Return_type_of_public_getter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2_4042',
    "Return type of public getter '{0}' from exported class has or is using name '{1}' from private module '{2}'."
  ),
  Return_type_of_public_getter_0_from_exported_class_has_or_is_using_private_name_1: new Message(
    4043,
    Category.Error,
    'Return_type_of_public_getter_0_from_exported_class_has_or_is_using_private_name_1_4043',
    "Return type of public getter '{0}' from exported class has or is using private name '{1}'."
  ),
  Return_type_of_constructor_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1: new Message(
    4044,
    Category.Error,
    'Return_type_of_constructor_signature_from_exported_interface_has_or_is_using_name_0_from_private_mod_4044',
    "Return type of constructor signature from exported interface has or is using name '{0}' from private module '{1}'."
  ),
  Return_type_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_0: new Message(
    4045,
    Category.Error,
    'Return_type_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_0_4045',
    "Return type of constructor signature from exported interface has or is using private name '{0}'."
  ),
  Return_type_of_call_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1: new Message(
    4046,
    Category.Error,
    'Return_type_of_call_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1_4046',
    "Return type of call signature from exported interface has or is using name '{0}' from private module '{1}'."
  ),
  Return_type_of_call_signature_from_exported_interface_has_or_is_using_private_name_0: new Message(
    4047,
    Category.Error,
    'Return_type_of_call_signature_from_exported_interface_has_or_is_using_private_name_0_4047',
    "Return type of call signature from exported interface has or is using private name '{0}'."
  ),
  Return_type_of_index_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1: new Message(
    4048,
    Category.Error,
    'Return_type_of_index_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1_4048',
    "Return type of index signature from exported interface has or is using name '{0}' from private module '{1}'."
  ),
  Return_type_of_index_signature_from_exported_interface_has_or_is_using_private_name_0: new Message(
    4049,
    Category.Error,
    'Return_type_of_index_signature_from_exported_interface_has_or_is_using_private_name_0_4049',
    "Return type of index signature from exported interface has or is using private name '{0}'."
  ),
  Return_type_of_public_static_method_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named: new Message(
    4050,
    Category.Error,
    'Return_type_of_public_static_method_from_exported_class_has_or_is_using_name_0_from_external_module__4050',
    "Return type of public static method from exported class has or is using name '{0}' from external module {1} but cannot be named."
  ),
  Return_type_of_public_static_method_from_exported_class_has_or_is_using_name_0_from_private_module_1: new Message(
    4051,
    Category.Error,
    'Return_type_of_public_static_method_from_exported_class_has_or_is_using_name_0_from_private_module_1_4051',
    "Return type of public static method from exported class has or is using name '{0}' from private module '{1}'."
  ),
  Return_type_of_public_static_method_from_exported_class_has_or_is_using_private_name_0: new Message(
    4052,
    Category.Error,
    'Return_type_of_public_static_method_from_exported_class_has_or_is_using_private_name_0_4052',
    "Return type of public static method from exported class has or is using private name '{0}'."
  ),
  Return_type_of_public_method_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named: new Message(
    4053,
    Category.Error,
    'Return_type_of_public_method_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_c_4053',
    "Return type of public method from exported class has or is using name '{0}' from external module {1} but cannot be named."
  ),
  Return_type_of_public_method_from_exported_class_has_or_is_using_name_0_from_private_module_1: new Message(
    4054,
    Category.Error,
    'Return_type_of_public_method_from_exported_class_has_or_is_using_name_0_from_private_module_1_4054',
    "Return type of public method from exported class has or is using name '{0}' from private module '{1}'."
  ),
  Return_type_of_public_method_from_exported_class_has_or_is_using_private_name_0: new Message(
    4055,
    Category.Error,
    'Return_type_of_public_method_from_exported_class_has_or_is_using_private_name_0_4055',
    "Return type of public method from exported class has or is using private name '{0}'."
  ),
  Return_type_of_method_from_exported_interface_has_or_is_using_name_0_from_private_module_1: new Message(
    4056,
    Category.Error,
    'Return_type_of_method_from_exported_interface_has_or_is_using_name_0_from_private_module_1_4056',
    "Return type of method from exported interface has or is using name '{0}' from private module '{1}'."
  ),
  Return_type_of_method_from_exported_interface_has_or_is_using_private_name_0: new Message(
    4057,
    Category.Error,
    'Return_type_of_method_from_exported_interface_has_or_is_using_private_name_0_4057',
    "Return type of method from exported interface has or is using private name '{0}'."
  ),
  Return_type_of_exported_function_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named: new Message(
    4058,
    Category.Error,
    'Return_type_of_exported_function_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named_4058',
    "Return type of exported function has or is using name '{0}' from external module {1} but cannot be named."
  ),
  Return_type_of_exported_function_has_or_is_using_name_0_from_private_module_1: new Message(
    4059,
    Category.Error,
    'Return_type_of_exported_function_has_or_is_using_name_0_from_private_module_1_4059',
    "Return type of exported function has or is using name '{0}' from private module '{1}'."
  ),
  Return_type_of_exported_function_has_or_is_using_private_name_0: new Message(
    4060,
    Category.Error,
    'Return_type_of_exported_function_has_or_is_using_private_name_0_4060',
    "Return type of exported function has or is using private name '{0}'."
  ),
  Parameter_0_of_constructor_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: new Message(
    4061,
    Category.Error,
    'Parameter_0_of_constructor_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_can_4061',
    "Parameter '{0}' of constructor from exported class has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Parameter_0_of_constructor_from_exported_class_has_or_is_using_name_1_from_private_module_2: new Message(
    4062,
    Category.Error,
    'Parameter_0_of_constructor_from_exported_class_has_or_is_using_name_1_from_private_module_2_4062',
    "Parameter '{0}' of constructor from exported class has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_0_of_constructor_from_exported_class_has_or_is_using_private_name_1: new Message(
    4063,
    Category.Error,
    'Parameter_0_of_constructor_from_exported_class_has_or_is_using_private_name_1_4063',
    "Parameter '{0}' of constructor from exported class has or is using private name '{1}'."
  ),
  Parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2: new Message(
    4064,
    Category.Error,
    'Parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_name_1_from_private_mod_4064',
    "Parameter '{0}' of constructor signature from exported interface has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_1: new Message(
    4065,
    Category.Error,
    'Parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_1_4065',
    "Parameter '{0}' of constructor signature from exported interface has or is using private name '{1}'."
  ),
  Parameter_0_of_call_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2: new Message(
    4066,
    Category.Error,
    'Parameter_0_of_call_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2_4066',
    "Parameter '{0}' of call signature from exported interface has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_0_of_call_signature_from_exported_interface_has_or_is_using_private_name_1: new Message(
    4067,
    Category.Error,
    'Parameter_0_of_call_signature_from_exported_interface_has_or_is_using_private_name_1_4067',
    "Parameter '{0}' of call signature from exported interface has or is using private name '{1}'."
  ),
  Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: new Message(
    4068,
    Category.Error,
    'Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_name_1_from_external_module__4068',
    "Parameter '{0}' of public static method from exported class has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_name_1_from_private_module_2: new Message(
    4069,
    Category.Error,
    'Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_name_1_from_private_module_2_4069',
    "Parameter '{0}' of public static method from exported class has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_private_name_1: new Message(
    4070,
    Category.Error,
    'Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_private_name_1_4070',
    "Parameter '{0}' of public static method from exported class has or is using private name '{1}'."
  ),
  Parameter_0_of_public_method_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: new Message(
    4071,
    Category.Error,
    'Parameter_0_of_public_method_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_c_4071',
    "Parameter '{0}' of public method from exported class has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Parameter_0_of_public_method_from_exported_class_has_or_is_using_name_1_from_private_module_2: new Message(
    4072,
    Category.Error,
    'Parameter_0_of_public_method_from_exported_class_has_or_is_using_name_1_from_private_module_2_4072',
    "Parameter '{0}' of public method from exported class has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_0_of_public_method_from_exported_class_has_or_is_using_private_name_1: new Message(
    4073,
    Category.Error,
    'Parameter_0_of_public_method_from_exported_class_has_or_is_using_private_name_1_4073',
    "Parameter '{0}' of public method from exported class has or is using private name '{1}'."
  ),
  Parameter_0_of_method_from_exported_interface_has_or_is_using_name_1_from_private_module_2: new Message(
    4074,
    Category.Error,
    'Parameter_0_of_method_from_exported_interface_has_or_is_using_name_1_from_private_module_2_4074',
    "Parameter '{0}' of method from exported interface has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_0_of_method_from_exported_interface_has_or_is_using_private_name_1: new Message(
    4075,
    Category.Error,
    'Parameter_0_of_method_from_exported_interface_has_or_is_using_private_name_1_4075',
    "Parameter '{0}' of method from exported interface has or is using private name '{1}'."
  ),
  Parameter_0_of_exported_function_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: new Message(
    4076,
    Category.Error,
    'Parameter_0_of_exported_function_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named_4076',
    "Parameter '{0}' of exported function has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Parameter_0_of_exported_function_has_or_is_using_name_1_from_private_module_2: new Message(
    4077,
    Category.Error,
    'Parameter_0_of_exported_function_has_or_is_using_name_1_from_private_module_2_4077',
    "Parameter '{0}' of exported function has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_0_of_exported_function_has_or_is_using_private_name_1: new Message(
    4078,
    Category.Error,
    'Parameter_0_of_exported_function_has_or_is_using_private_name_1_4078',
    "Parameter '{0}' of exported function has or is using private name '{1}'."
  ),
  Exported_type_alias_0_has_or_is_using_private_name_1: new Message(
    4081,
    Category.Error,
    'Exported_type_alias_0_has_or_is_using_private_name_1_4081',
    "Exported type alias '{0}' has or is using private name '{1}'."
  ),
  Default_export_of_the_module_has_or_is_using_private_name_0: new Message(
    4082,
    Category.Error,
    'Default_export_of_the_module_has_or_is_using_private_name_0_4082',
    "Default export of the module has or is using private name '{0}'."
  ),
  Type_parameter_0_of_exported_type_alias_has_or_is_using_private_name_1: new Message(
    4083,
    Category.Error,
    'Type_parameter_0_of_exported_type_alias_has_or_is_using_private_name_1_4083',
    "Type parameter '{0}' of exported type alias has or is using private name '{1}'."
  ),
  Conflicting_definitions_for_0_found_at_1_and_2_Consider_installing_a_specific_version_of_this_library_to_resolve_the_conflict: new Message(
    4090,
    Category.Error,
    'Conflicting_definitions_for_0_found_at_1_and_2_Consider_installing_a_specific_version_of_this_librar_4090',
    "Conflicting definitions for '{0}' found at '{1}' and '{2}'. Consider installing a specific version of this library to resolve the conflict."
  ),
  Parameter_0_of_index_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2: new Message(
    4091,
    Category.Error,
    'Parameter_0_of_index_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2_4091',
    "Parameter '{0}' of index signature from exported interface has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_0_of_index_signature_from_exported_interface_has_or_is_using_private_name_1: new Message(
    4092,
    Category.Error,
    'Parameter_0_of_index_signature_from_exported_interface_has_or_is_using_private_name_1_4092',
    "Parameter '{0}' of index signature from exported interface has or is using private name '{1}'."
  ),
  Property_0_of_exported_class_expression_may_not_be_private_or_protected: new Message(
    4094,
    Category.Error,
    'Property_0_of_exported_class_expression_may_not_be_private_or_protected_4094',
    "Property '{0}' of exported class expression may not be private or protected."
  ),
  Public_static_method_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: new Message(
    4095,
    Category.Error,
    'Public_static_method_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_4095',
    "Public static method '{0}' of exported class has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Public_static_method_0_of_exported_class_has_or_is_using_name_1_from_private_module_2: new Message(
    4096,
    Category.Error,
    'Public_static_method_0_of_exported_class_has_or_is_using_name_1_from_private_module_2_4096',
    "Public static method '{0}' of exported class has or is using name '{1}' from private module '{2}'."
  ),
  Public_static_method_0_of_exported_class_has_or_is_using_private_name_1: new Message(
    4097,
    Category.Error,
    'Public_static_method_0_of_exported_class_has_or_is_using_private_name_1_4097',
    "Public static method '{0}' of exported class has or is using private name '{1}'."
  ),
  Public_method_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: new Message(
    4098,
    Category.Error,
    'Public_method_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named_4098',
    "Public method '{0}' of exported class has or is using name '{1}' from external module {2} but cannot be named."
  ),
  Public_method_0_of_exported_class_has_or_is_using_name_1_from_private_module_2: new Message(
    4099,
    Category.Error,
    'Public_method_0_of_exported_class_has_or_is_using_name_1_from_private_module_2_4099',
    "Public method '{0}' of exported class has or is using name '{1}' from private module '{2}'."
  ),
  Public_method_0_of_exported_class_has_or_is_using_private_name_1: new Message(
    4100,
    Category.Error,
    'Public_method_0_of_exported_class_has_or_is_using_private_name_1_4100',
    "Public method '{0}' of exported class has or is using private name '{1}'."
  ),
  Method_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2: new Message(
    4101,
    Category.Error,
    'Method_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2_4101',
    "Method '{0}' of exported interface has or is using name '{1}' from private module '{2}'."
  ),
  Method_0_of_exported_interface_has_or_is_using_private_name_1: new Message(
    4102,
    Category.Error,
    'Method_0_of_exported_interface_has_or_is_using_private_name_1_4102',
    "Method '{0}' of exported interface has or is using private name '{1}'."
  ),
  Type_parameter_0_of_exported_mapped_object_type_is_using_private_name_1: new Message(
    4103,
    Category.Error,
    'Type_parameter_0_of_exported_mapped_object_type_is_using_private_name_1_4103',
    "Type parameter '{0}' of exported mapped object type is using private name '{1}'."
  ),
  The_type_0_is_readonly_and_cannot_be_assigned_to_the_mutable_type_1: new Message(
    4104,
    Category.Error,
    'The_type_0_is_readonly_and_cannot_be_assigned_to_the_mutable_type_1_4104',
    "The type '{0}' is 'readonly' and cannot be assigned to the mutable type '{1}'."
  ),
  Private_or_protected_member_0_cannot_be_accessed_on_a_type_parameter: new Message(
    4105,
    Category.Error,
    'Private_or_protected_member_0_cannot_be_accessed_on_a_type_parameter_4105',
    "Private or protected member '{0}' cannot be accessed on a type parameter."
  ),
  Parameter_0_of_accessor_has_or_is_using_private_name_1: new Message(
    4106,
    Category.Error,
    'Parameter_0_of_accessor_has_or_is_using_private_name_1_4106',
    "Parameter '{0}' of accessor has or is using private name '{1}'."
  ),
  Parameter_0_of_accessor_has_or_is_using_name_1_from_private_module_2: new Message(
    4107,
    Category.Error,
    'Parameter_0_of_accessor_has_or_is_using_name_1_from_private_module_2_4107',
    "Parameter '{0}' of accessor has or is using name '{1}' from private module '{2}'."
  ),
  Parameter_0_of_accessor_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named: new Message(
    4108,
    Category.Error,
    'Parameter_0_of_accessor_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named_4108',
    "Parameter '{0}' of accessor has or is using name '{1}' from external module '{2}' but cannot be named."
  ),
  Type_arguments_for_0_circularly_reference_themselves: new Message(
    4109,
    Category.Error,
    'Type_arguments_for_0_circularly_reference_themselves_4109',
    "Type arguments for '{0}' circularly reference themselves."
  ),
  Tuple_type_arguments_circularly_reference_themselves: new Message(
    4110,
    Category.Error,
    'Tuple_type_arguments_circularly_reference_themselves_4110',
    'Tuple type arguments circularly reference themselves.'
  ),
  The_current_host_does_not_support_the_0_option: new Message(5001, Category.Error, 'The_current_host_does_not_support_the_0_option_5001', "The current host does not support the '{0}' option."),
  Cannot_find_the_common_subdirectory_path_for_the_input_files: new Message(
    5009,
    Category.Error,
    'Cannot_find_the_common_subdirectory_path_for_the_input_files_5009',
    'Cannot find the common subdirectory path for the input files.'
  ),
  File_specification_cannot_end_in_a_recursive_directory_wildcard_Asterisk_Asterisk_Colon_0: new Message(
    5010,
    Category.Error,
    'File_specification_cannot_end_in_a_recursive_directory_wildcard_Asterisk_Asterisk_Colon_0_5010',
    "File specification cannot end in a recursive directory wildcard ('**'): '{0}'."
  ),
  Cannot_read_file_0_Colon_1: new Message(5012, Category.Error, 'Cannot_read_file_0_Colon_1_5012', "Cannot read file '{0}': {1}."),
  Failed_to_parse_file_0_Colon_1: new Message(5014, Category.Error, 'Failed_to_parse_file_0_Colon_1_5014', "Failed to parse file '{0}': {1}."),
  Unknown_compiler_option_0: new Message(5023, Category.Error, 'Unknown_compiler_option_0_5023', "Unknown compiler option '{0}'."),
  Compiler_option_0_requires_a_value_of_type_1: new Message(5024, Category.Error, 'Compiler_option_0_requires_a_value_of_type_1_5024', "Compiler option '{0}' requires a value of type {1}."),
  Unknown_compiler_option_0_Did_you_mean_1: new Message(5025, Category.Error, 'Unknown_compiler_option_0_Did_you_mean_1_5025', "Unknown compiler option '{0}'. Did you mean '{1}'?"),
  Could_not_write_file_0_Colon_1: new Message(5033, Category.Error, 'Could_not_write_file_0_Colon_1_5033', "Could not write file '{0}': {1}."),
  Option_project_cannot_be_mixed_with_source_files_on_a_command_line: new Message(
    5042,
    Category.Error,
    'Option_project_cannot_be_mixed_with_source_files_on_a_command_line_5042',
    "Option 'project' cannot be mixed with source files on a command line."
  ),
  Option_isolatedModules_can_only_be_used_when_either_option_module_is_provided_or_option_target_is_ES2015_or_higher: new Message(
    5047,
    Category.Error,
    'Option_isolatedModules_can_only_be_used_when_either_option_module_is_provided_or_option_target_is_ES_5047',
    "Option 'isolatedModules' can only be used when either option '--module' is provided or option 'target' is 'ES2015' or higher."
  ),
  Option_0_cannot_be_specified_when_option_target_is_ES3: new Message(
    5048,
    Category.Error,
    'Option_0_cannot_be_specified_when_option_target_is_ES3_5048',
    "Option '{0}' cannot be specified when option 'target' is 'ES3'."
  ),
  Option_0_can_only_be_used_when_either_option_inlineSourceMap_or_option_sourceMap_is_provided: new Message(
    5051,
    Category.Error,
    'Option_0_can_only_be_used_when_either_option_inlineSourceMap_or_option_sourceMap_is_provided_5051',
    "Option '{0} can only be used when either option '--inlineSourceMap' or option '--sourceMap' is provided."
  ),
  Option_0_cannot_be_specified_without_specifying_option_1: new Message(
    5052,
    Category.Error,
    'Option_0_cannot_be_specified_without_specifying_option_1_5052',
    "Option '{0}' cannot be specified without specifying option '{1}'."
  ),
  Option_0_cannot_be_specified_with_option_1: new Message(5053, Category.Error, 'Option_0_cannot_be_specified_with_option_1_5053', "Option '{0}' cannot be specified with option '{1}'."),
  A_tsconfig_json_file_is_already_defined_at_Colon_0: new Message(
    5054,
    Category.Error,
    'A_tsconfig_json_file_is_already_defined_at_Colon_0_5054',
    "A 'tsconfig.json' file is already defined at: '{0}'."
  ),
  Cannot_write_file_0_because_it_would_overwrite_input_file: new Message(
    5055,
    Category.Error,
    'Cannot_write_file_0_because_it_would_overwrite_input_file_5055',
    "Cannot write file '{0}' because it would overwrite input file."
  ),
  Cannot_write_file_0_because_it_would_be_overwritten_by_multiple_input_files: new Message(
    5056,
    Category.Error,
    'Cannot_write_file_0_because_it_would_be_overwritten_by_multiple_input_files_5056',
    "Cannot write file '{0}' because it would be overwritten by multiple input files."
  ),
  Cannot_find_a_tsconfig_json_file_at_the_specified_directory_Colon_0: new Message(
    5057,
    Category.Error,
    'Cannot_find_a_tsconfig_json_file_at_the_specified_directory_Colon_0_5057',
    "Cannot find a tsconfig.json file at the specified directory: '{0}'."
  ),
  The_specified_path_does_not_exist_Colon_0: new Message(5058, Category.Error, 'The_specified_path_does_not_exist_Colon_0_5058', "The specified path does not exist: '{0}'."),
  Invalid_value_for_reactNamespace_0_is_not_a_valid_identifier: new Message(
    5059,
    Category.Error,
    'Invalid_value_for_reactNamespace_0_is_not_a_valid_identifier_5059',
    "Invalid value for '--reactNamespace'. '{0}' is not a valid identifier."
  ),
  Option_paths_cannot_be_used_without_specifying_baseUrl_option: new Message(
    5060,
    Category.Error,
    'Option_paths_cannot_be_used_without_specifying_baseUrl_option_5060',
    "Option 'paths' cannot be used without specifying '--baseUrl' option."
  ),
  Pattern_0_can_have_at_most_one_Asterisk_character: new Message(5061, Category.Error, 'Pattern_0_can_have_at_most_one_Asterisk_character_5061', "Pattern '{0}' can have at most one '*' character."),
  Substitution_0_in_pattern_1_can_have_at_most_one_Asterisk_character: new Message(
    5062,
    Category.Error,
    'Substitution_0_in_pattern_1_can_have_at_most_one_Asterisk_character_5062',
    "Substitution '{0}' in pattern '{1}' can have at most one '*' character."
  ),
  Substitutions_for_pattern_0_should_be_an_array: new Message(5063, Category.Error, 'Substitutions_for_pattern_0_should_be_an_array_5063', "Substitutions for pattern '{0}' should be an array."),
  Substitution_0_for_pattern_1_has_incorrect_type_expected_string_got_2: new Message(
    5064,
    Category.Error,
    'Substitution_0_for_pattern_1_has_incorrect_type_expected_string_got_2_5064',
    "Substitution '{0}' for pattern '{1}' has incorrect type, expected 'string', got '{2}'."
  ),
  File_specification_cannot_contain_a_parent_directory_that_appears_after_a_recursive_directory_wildcard_Asterisk_Asterisk_Colon_0: new Message(
    5065,
    Category.Error,
    'File_specification_cannot_contain_a_parent_directory_that_appears_after_a_recursive_directory_wildca_5065',
    "File specification cannot contain a parent directory ('..') that appears after a recursive directory wildcard ('**'): '{0}'."
  ),
  Substitutions_for_pattern_0_shouldn_t_be_an_empty_array: new Message(
    5066,
    Category.Error,
    'Substitutions_for_pattern_0_shouldn_t_be_an_empty_array_5066',
    "Substitutions for pattern '{0}' shouldn't be an empty array."
  ),
  Invalid_value_for_jsxFactory_0_is_not_a_valid_identifier_or_qualified_name: new Message(
    5067,
    Category.Error,
    'Invalid_value_for_jsxFactory_0_is_not_a_valid_identifier_or_qualified_name_5067',
    "Invalid value for 'jsxFactory'. '{0}' is not a valid identifier or qualified-name."
  ),
  Adding_a_tsconfig_json_file_will_help_organize_projects_that_contain_both_TypeScript_and_JavaScript_files_Learn_more_at_https_Colon_Slash_Slashaka_ms_Slashtsconfig: new Message(
    5068,
    Category.Error,
    'Adding_a_tsconfig_json_file_will_help_organize_projects_that_contain_both_TypeScript_and_JavaScript__5068',
    'Adding a tsconfig.json file will help organize projects that contain both TypeScript and JavaScript files. Learn more at https://aka.ms/tsconfig.'
  ),
  Option_0_cannot_be_specified_without_specifying_option_1_or_option_2: new Message(
    5069,
    Category.Error,
    'Option_0_cannot_be_specified_without_specifying_option_1_or_option_2_5069',
    "Option '{0}' cannot be specified without specifying option '{1}' or option '{2}'."
  ),
  Option_resolveJsonModule_cannot_be_specified_without_node_module_resolution_strategy: new Message(
    5070,
    Category.Error,
    'Option_resolveJsonModule_cannot_be_specified_without_node_module_resolution_strategy_5070',
    "Option '--resolveJsonModule' cannot be specified without 'node' module resolution strategy."
  ),
  Option_resolveJsonModule_can_only_be_specified_when_module_code_generation_is_commonjs_amd_es2015_or_esNext: new Message(
    5071,
    Category.Error,
    'Option_resolveJsonModule_can_only_be_specified_when_module_code_generation_is_commonjs_amd_es2015_or_5071',
    "Option '--resolveJsonModule' can only be specified when module code generation is 'commonjs', 'amd', 'es2015' or 'esNext'."
  ),
  Unknown_build_option_0: new Message(5072, Category.Error, 'Unknown_build_option_0_5072', "Unknown build option '{0}'."),
  Build_option_0_requires_a_value_of_type_1: new Message(5073, Category.Error, 'Build_option_0_requires_a_value_of_type_1_5073', "Build option '{0}' requires a value of type {1}."),
  Option_incremental_can_only_be_specified_using_tsconfig_emitting_to_single_file_or_when_option_tsBuildInfoFile_is_specified: new Message(
    5074,
    Category.Error,
    'Option_incremental_can_only_be_specified_using_tsconfig_emitting_to_single_file_or_when_option_tsBui_5074',
    "Option '--incremental' can only be specified using tsconfig, emitting to single file or when option `--tsBuildInfoFile` is specified."
  ),
  _0_is_assignable_to_the_constraint_of_type_1_but_1_could_be_instantiated_with_a_different_subtype_of_constraint_2: new Message(
    5075,
    Category.Error,
    '_0_is_assignable_to_the_constraint_of_type_1_but_1_could_be_instantiated_with_a_different_subtype_of_5075',
    "'{0}' is assignable to the constraint of type '{1}', but '{1}' could be instantiated with a different subtype of constraint '{2}'."
  ),
  _0_and_1_operations_cannot_be_mixed_without_parentheses: new Message(
    5076,
    Category.Error,
    '_0_and_1_operations_cannot_be_mixed_without_parentheses_5076',
    "'{0}' and '{1}' operations cannot be mixed without parentheses."
  ),
  Unknown_build_option_0_Did_you_mean_1: new Message(5077, Category.Error, 'Unknown_build_option_0_Did_you_mean_1_5077', "Unknown build option '{0}'. Did you mean '{1}'?"),
  Unknown_watch_option_0: new Message(5078, Category.Error, 'Unknown_watch_option_0_5078', "Unknown watch option '{0}'."),
  Unknown_watch_option_0_Did_you_mean_1: new Message(5079, Category.Error, 'Unknown_watch_option_0_Did_you_mean_1_5079', "Unknown watch option '{0}'. Did you mean '{1}'?"),
  Watch_option_0_requires_a_value_of_type_1: new Message(5080, Category.Error, 'Watch_option_0_requires_a_value_of_type_1_5080', "Watch option '{0}' requires a value of type {1}."),
  Cannot_find_a_tsconfig_json_file_at_the_current_directory_Colon_0: new Message(
    5081,
    Category.Error,
    'Cannot_find_a_tsconfig_json_file_at_the_current_directory_Colon_0_5081',
    'Cannot find a tsconfig.json file at the current directory: {0}.'
  ),
  _0_could_be_instantiated_with_an_arbitrary_type_which_could_be_unrelated_to_1: new Message(
    5082,
    Category.Error,
    '_0_could_be_instantiated_with_an_arbitrary_type_which_could_be_unrelated_to_1_5082',
    "'{0}' could be instantiated with an arbitrary type which could be unrelated to '{1}'."
  ),
  Cannot_read_file_0: new Message(5083, Category.Error, 'Cannot_read_file_0_5083', "Cannot read file '{0}'."),
  Tuple_members_must_all_have_names_or_all_not_have_names: new Message(
    5084,
    Category.Error,
    'Tuple_members_must_all_have_names_or_all_not_have_names_5084',
    'Tuple members must all have names or all not have names.'
  ),
  A_tuple_member_cannot_be_both_optional_and_rest: new Message(5085, Category.Error, 'A_tuple_member_cannot_be_both_optional_and_rest_5085', 'A tuple member cannot be both optional and rest.'),
  A_labeled_tuple_element_is_declared_as_optional_with_a_question_mark_after_the_name_and_before_the_colon_rather_than_after_the_type: new Message(
    5086,
    Category.Error,
    'A_labeled_tuple_element_is_declared_as_optional_with_a_question_mark_after_the_name_and_before_the_c_5086',
    'A labeled tuple element is declared as optional with a question mark after the name and before the colon, rather than after the type.'
  ),
  A_labeled_tuple_element_is_declared_as_rest_with_a_before_the_name_rather_than_before_the_type: new Message(
    5087,
    Category.Error,
    'A_labeled_tuple_element_is_declared_as_rest_with_a_before_the_name_rather_than_before_the_type_5087',
    'A labeled tuple element is declared as rest with a `...` before the name, rather than before the type.'
  ),
  Generates_a_sourcemap_for_each_corresponding_d_ts_file: new Message(
    6000,
    Category.Message,
    'Generates_a_sourcemap_for_each_corresponding_d_ts_file_6000',
    "Generates a sourcemap for each corresponding '.d.ts' file."
  ),
  Concatenate_and_emit_output_to_single_file: new Message(6001, Category.Message, 'Concatenate_and_emit_output_to_single_file_6001', 'Concatenate and emit output to single file.'),
  Generates_corresponding_d_ts_file: new Message(6002, Category.Message, 'Generates_corresponding_d_ts_file_6002', "Generates corresponding '.d.ts' file."),
  Specify_the_location_where_debugger_should_locate_map_files_instead_of_generated_locations: new Message(
    6003,
    Category.Message,
    'Specify_the_location_where_debugger_should_locate_map_files_instead_of_generated_locations_6003',
    'Specify the location where debugger should locate map files instead of generated locations.'
  ),
  Specify_the_location_where_debugger_should_locate_TypeScript_files_instead_of_source_locations: new Message(
    6004,
    Category.Message,
    'Specify_the_location_where_debugger_should_locate_TypeScript_files_instead_of_source_locations_6004',
    'Specify the location where debugger should locate TypeScript files instead of source locations.'
  ),
  Watch_input_files: new Message(6005, Category.Message, 'Watch_input_files_6005', 'Watch input files.'),
  Redirect_output_structure_to_the_directory: new Message(6006, Category.Message, 'Redirect_output_structure_to_the_directory_6006', 'Redirect output structure to the directory.'),
  Do_not_erase_const_enum_declarations_in_generated_code: new Message(
    6007,
    Category.Message,
    'Do_not_erase_const_enum_declarations_in_generated_code_6007',
    'Do not erase const enum declarations in generated code.'
  ),
  Do_not_emit_outputs_if_any_errors_were_reported: new Message(6008, Category.Message, 'Do_not_emit_outputs_if_any_errors_were_reported_6008', 'Do not emit outputs if any errors were reported.'),
  Do_not_emit_comments_to_output: new Message(6009, Category.Message, 'Do_not_emit_comments_to_output_6009', 'Do not emit comments to output.'),
  Do_not_emit_outputs: new Message(6010, Category.Message, 'Do_not_emit_outputs_6010', 'Do not emit outputs.'),
  Allow_default_imports_from_modules_with_no_default_export_This_does_not_affect_code_emit_just_typechecking: new Message(
    6011,
    Category.Message,
    'Allow_default_imports_from_modules_with_no_default_export_This_does_not_affect_code_emit_just_typech_6011',
    'Allow default imports from modules with no default export. This does not affect code emit, just typechecking.'
  ),
  Skip_type_checking_of_declaration_files: new Message(6012, Category.Message, 'Skip_type_checking_of_declaration_files_6012', 'Skip type checking of declaration files.'),
  Do_not_resolve_the_real_path_of_symlinks: new Message(6013, Category.Message, 'Do_not_resolve_the_real_path_of_symlinks_6013', 'Do not resolve the real path of symlinks.'),
  Only_emit_d_ts_declaration_files: new Message(6014, Category.Message, 'Only_emit_d_ts_declaration_files_6014', "Only emit '.d.ts' declaration files."),
  Specify_ECMAScript_target_version_Colon_ES3_default_ES5_ES2015_ES2016_ES2017_ES2018_ES2019_ES2020_or_ESNEXT: new Message(
    6015,
    Category.Message,
    'Specify_ECMAScript_target_version_Colon_ES3_default_ES5_ES2015_ES2016_ES2017_ES2018_ES2019_ES2020_or_6015',
    "Specify ECMAScript target version: 'ES3' (default), 'ES5', 'ES2015', 'ES2016', 'ES2017', 'ES2018', 'ES2019', 'ES2020', or 'ESNEXT'."
  ),
  Specify_module_code_generation_Colon_none_commonjs_amd_system_umd_es2015_es2020_or_ESNext: new Message(
    6016,
    Category.Message,
    'Specify_module_code_generation_Colon_none_commonjs_amd_system_umd_es2015_es2020_or_ESNext_6016',
    "Specify module code generation: 'none', 'commonjs', 'amd', 'system', 'umd', 'es2015', 'es2020', or 'ESNext'."
  ),
  Print_this_message: new Message(6017, Category.Message, 'Print_this_message_6017', 'Print this message.'),
  Print_the_compiler_s_version: new Message(6019, Category.Message, 'Print_the_compiler_s_version_6019', "Print the compiler's version."),
  Compile_the_project_given_the_path_to_its_configuration_file_or_to_a_folder_with_a_tsconfig_json: new Message(
    6020,
    Category.Message,
    'Compile_the_project_given_the_path_to_its_configuration_file_or_to_a_folder_with_a_tsconfig_json_6020',
    "Compile the project given the path to its configuration file, or to a folder with a 'tsconfig.json'."
  ),
  Syntax_Colon_0: new Message(6023, Category.Message, 'Syntax_Colon_0_6023', 'Syntax: {0}'),
  options: new Message(6024, Category.Message, 'options_6024', 'options'),
  file: new Message(6025, Category.Message, 'file_6025', 'file'),
  Examples_Colon_0: new Message(6026, Category.Message, 'Examples_Colon_0_6026', 'Examples: {0}'),
  Options_Colon: new Message(6027, Category.Message, 'Options_Colon_6027', 'Options:'),
  Version_0: new Message(6029, Category.Message, 'Version_0_6029', 'Version {0}'),
  Insert_command_line_options_and_files_from_a_file: new Message(
    6030,
    Category.Message,
    'Insert_command_line_options_and_files_from_a_file_6030',
    'Insert command line options and files from a file.'
  ),
  Starting_compilation_in_watch_mode: new Message(6031, Category.Message, 'Starting_compilation_in_watch_mode_6031', 'Starting compilation in watch mode...'),
  File_change_detected_Starting_incremental_compilation: new Message(
    6032,
    Category.Message,
    'File_change_detected_Starting_incremental_compilation_6032',
    'File change detected. Starting incremental compilation...'
  ),
  KIND: new Message(6034, Category.Message, 'KIND_6034', 'KIND'),
  FILE: new Message(6035, Category.Message, 'FILE_6035', 'FILE'),
  VERSION: new Message(6036, Category.Message, 'VERSION_6036', 'VERSION'),
  LOCATION: new Message(6037, Category.Message, 'LOCATION_6037', 'LOCATION'),
  DIRECTORY: new Message(6038, Category.Message, 'DIRECTORY_6038', 'DIRECTORY'),
  STRATEGY: new Message(6039, Category.Message, 'STRATEGY_6039', 'STRATEGY'),
  FILE_OR_DIRECTORY: new Message(6040, Category.Message, 'FILE_OR_DIRECTORY_6040', 'FILE OR DIRECTORY'),
  Generates_corresponding_map_file: new Message(6043, Category.Message, 'Generates_corresponding_map_file_6043', "Generates corresponding '.map' file."),
  Compiler_option_0_expects_an_argument: new Message(6044, Category.Error, 'Compiler_option_0_expects_an_argument_6044', "Compiler option '{0}' expects an argument."),
  Unterminated_quoted_string_in_response_file_0: new Message(6045, Category.Error, 'Unterminated_quoted_string_in_response_file_0_6045', "Unterminated quoted string in response file '{0}'."),
  Argument_for_0_option_must_be_Colon_1: new Message(6046, Category.Error, 'Argument_for_0_option_must_be_Colon_1_6046', "Argument for '{0}' option must be: {1}."),
  Locale_must_be_of_the_form_language_or_language_territory_For_example_0_or_1: new Message(
    6048,
    Category.Error,
    'Locale_must_be_of_the_form_language_or_language_territory_For_example_0_or_1_6048',
    "Locale must be of the form <language> or <language>-<territory>. For example '{0}' or '{1}'."
  ),
  Unsupported_locale_0: new Message(6049, Category.Error, 'Unsupported_locale_0_6049', "Unsupported locale '{0}'."),
  Unable_to_open_file_0: new Message(6050, Category.Error, 'Unable_to_open_file_0_6050', "Unable to open file '{0}'."),
  Corrupted_locale_file_0: new Message(6051, Category.Error, 'Corrupted_locale_file_0_6051', 'Corrupted locale file {0}.'),
  Raise_error_on_expressions_and_declarations_with_an_implied_any_type: new Message(
    6052,
    Category.Message,
    'Raise_error_on_expressions_and_declarations_with_an_implied_any_type_6052',
    "Raise error on expressions and declarations with an implied 'any' type."
  ),
  File_0_not_found: new Message(6053, Category.Error, 'File_0_not_found_6053', "File '{0}' not found."),
  File_0_has_an_unsupported_extension_The_only_supported_extensions_are_1: new Message(
    6054,
    Category.Error,
    'File_0_has_an_unsupported_extension_The_only_supported_extensions_are_1_6054',
    "File '{0}' has an unsupported extension. The only supported extensions are {1}."
  ),
  Suppress_noImplicitAny_errors_for_indexing_objects_lacking_index_signatures: new Message(
    6055,
    Category.Message,
    'Suppress_noImplicitAny_errors_for_indexing_objects_lacking_index_signatures_6055',
    'Suppress noImplicitAny errors for indexing objects lacking index signatures.'
  ),
  Do_not_emit_declarations_for_code_that_has_an_internal_annotation: new Message(
    6056,
    Category.Message,
    'Do_not_emit_declarations_for_code_that_has_an_internal_annotation_6056',
    "Do not emit declarations for code that has an '@internal' annotation."
  ),
  Specify_the_root_directory_of_input_files_Use_to_control_the_output_directory_structure_with_outDir: new Message(
    6058,
    Category.Message,
    'Specify_the_root_directory_of_input_files_Use_to_control_the_output_directory_structure_with_outDir_6058',
    'Specify the root directory of input files. Use to control the output directory structure with --outDir.'
  ),
  File_0_is_not_under_rootDir_1_rootDir_is_expected_to_contain_all_source_files: new Message(
    6059,
    Category.Error,
    'File_0_is_not_under_rootDir_1_rootDir_is_expected_to_contain_all_source_files_6059',
    "File '{0}' is not under 'rootDir' '{1}'. 'rootDir' is expected to contain all source files."
  ),
  Specify_the_end_of_line_sequence_to_be_used_when_emitting_files_Colon_CRLF_dos_or_LF_unix: new Message(
    6060,
    Category.Message,
    'Specify_the_end_of_line_sequence_to_be_used_when_emitting_files_Colon_CRLF_dos_or_LF_unix_6060',
    "Specify the end of line sequence to be used when emitting files: 'CRLF' (dos) or 'LF' (unix)."
  ),
  NEWLINE: new Message(6061, Category.Message, 'NEWLINE_6061', 'NEWLINE'),
  Option_0_can_only_be_specified_in_tsconfig_json_file_or_set_to_null_on_command_line: new Message(
    6064,
    Category.Error,
    'Option_0_can_only_be_specified_in_tsconfig_json_file_or_set_to_null_on_command_line_6064',
    "Option '{0}' can only be specified in 'tsconfig.json' file or set to 'null' on command line."
  ),
  Enables_experimental_support_for_ES7_decorators: new Message(6065, Category.Message, 'Enables_experimental_support_for_ES7_decorators_6065', 'Enables experimental support for ES7 decorators.'),
  Enables_experimental_support_for_emitting_type_metadata_for_decorators: new Message(
    6066,
    Category.Message,
    'Enables_experimental_support_for_emitting_type_metadata_for_decorators_6066',
    'Enables experimental support for emitting type metadata for decorators.'
  ),
  Enables_experimental_support_for_ES7_async_functions: new Message(
    6068,
    Category.Message,
    'Enables_experimental_support_for_ES7_async_functions_6068',
    'Enables experimental support for ES7 async functions.'
  ),
  Specify_module_resolution_strategy_Colon_node_Node_js_or_classic_TypeScript_pre_1_6: new Message(
    6069,
    Category.Message,
    'Specify_module_resolution_strategy_Colon_node_Node_js_or_classic_TypeScript_pre_1_6_6069',
    "Specify module resolution strategy: 'node' (Node.js) or 'classic' (TypeScript pre-1.6)."
  ),
  Initializes_a_TypeScript_project_and_creates_a_tsconfig_json_file: new Message(
    6070,
    Category.Message,
    'Initializes_a_TypeScript_project_and_creates_a_tsconfig_json_file_6070',
    'Initializes a TypeScript project and creates a tsconfig.json file.'
  ),
  Successfully_created_a_tsconfig_json_file: new Message(6071, Category.Message, 'Successfully_created_a_tsconfig_json_file_6071', 'Successfully created a tsconfig.json file.'),
  Suppress_excess_property_checks_for_object_literals: new Message(
    6072,
    Category.Message,
    'Suppress_excess_property_checks_for_object_literals_6072',
    'Suppress excess property checks for object literals.'
  ),
  Stylize_errors_and_messages_using_color_and_context_experimental: new Message(
    6073,
    Category.Message,
    'Stylize_errors_and_messages_using_color_and_context_experimental_6073',
    'Stylize errors and messages using color and context (experimental).'
  ),
  Do_not_report_errors_on_unused_labels: new Message(6074, Category.Message, 'Do_not_report_errors_on_unused_labels_6074', 'Do not report errors on unused labels.'),
  Report_error_when_not_all_code_paths_in_function_return_a_value: new Message(
    6075,
    Category.Message,
    'Report_error_when_not_all_code_paths_in_function_return_a_value_6075',
    'Report error when not all code paths in function return a value.'
  ),
  Report_errors_for_fallthrough_cases_in_switch_statement: new Message(
    6076,
    Category.Message,
    'Report_errors_for_fallthrough_cases_in_switch_statement_6076',
    'Report errors for fallthrough cases in switch statement.'
  ),
  Do_not_report_errors_on_unreachable_code: new Message(6077, Category.Message, 'Do_not_report_errors_on_unreachable_code_6077', 'Do not report errors on unreachable code.'),
  Disallow_inconsistently_cased_references_to_the_same_file: new Message(
    6078,
    Category.Message,
    'Disallow_inconsistently_cased_references_to_the_same_file_6078',
    'Disallow inconsistently-cased references to the same file.'
  ),
  Specify_library_files_to_be_included_in_the_compilation: new Message(
    6079,
    Category.Message,
    'Specify_library_files_to_be_included_in_the_compilation_6079',
    'Specify library files to be included in the compilation.'
  ),
  Specify_JSX_code_generation_Colon_preserve_react_native_or_react: new Message(
    6080,
    Category.Message,
    'Specify_JSX_code_generation_Colon_preserve_react_native_or_react_6080',
    "Specify JSX code generation: 'preserve', 'react-native', or 'react'."
  ),
  File_0_has_an_unsupported_extension_so_skipping_it: new Message(
    6081,
    Category.Message,
    'File_0_has_an_unsupported_extension_so_skipping_it_6081',
    "File '{0}' has an unsupported extension, so skipping it."
  ),
  Only_amd_and_system_modules_are_supported_alongside_0: new Message(
    6082,
    Category.Error,
    'Only_amd_and_system_modules_are_supported_alongside_0_6082',
    "Only 'amd' and 'system' modules are supported alongside --{0}."
  ),
  Base_directory_to_resolve_non_absolute_module_names: new Message(
    6083,
    Category.Message,
    'Base_directory_to_resolve_non_absolute_module_names_6083',
    'Base directory to resolve non-absolute module names.'
  ),
  Deprecated_Use_jsxFactory_instead_Specify_the_object_invoked_for_createElement_when_targeting_react_JSX_emit: new Message(
    6084,
    Category.Message,
    'Deprecated_Use_jsxFactory_instead_Specify_the_object_invoked_for_createElement_when_targeting_react__6084',
    "[Deprecated] Use '--jsxFactory' instead. Specify the object invoked for createElement when targeting 'react' JSX emit"
  ),
  Enable_tracing_of_the_name_resolution_process: new Message(6085, Category.Message, 'Enable_tracing_of_the_name_resolution_process_6085', 'Enable tracing of the name resolution process.'),
  Resolving_module_0_from_1: new Message(6086, Category.Message, 'Resolving_module_0_from_1_6086', "======== Resolving module '{0}' from '{1}'. ========"),
  Explicitly_specified_module_resolution_kind_Colon_0: new Message(
    6087,
    Category.Message,
    'Explicitly_specified_module_resolution_kind_Colon_0_6087',
    "Explicitly specified module resolution kind: '{0}'."
  ),
  Module_resolution_kind_is_not_specified_using_0: new Message(6088, Category.Message, 'Module_resolution_kind_is_not_specified_using_0_6088', "Module resolution kind is not specified, using '{0}'."),
  Module_name_0_was_successfully_resolved_to_1: new Message(
    6089,
    Category.Message,
    'Module_name_0_was_successfully_resolved_to_1_6089',
    "======== Module name '{0}' was successfully resolved to '{1}'. ========"
  ),
  Module_name_0_was_not_resolved: new Message(6090, Category.Message, 'Module_name_0_was_not_resolved_6090', "======== Module name '{0}' was not resolved. ========"),
  paths_option_is_specified_looking_for_a_pattern_to_match_module_name_0: new Message(
    6091,
    Category.Message,
    'paths_option_is_specified_looking_for_a_pattern_to_match_module_name_0_6091',
    "'paths' option is specified, looking for a pattern to match module name '{0}'."
  ),
  Module_name_0_matched_pattern_1: new Message(6092, Category.Message, 'Module_name_0_matched_pattern_1_6092', "Module name '{0}', matched pattern '{1}'."),
  Trying_substitution_0_candidate_module_location_Colon_1: new Message(
    6093,
    Category.Message,
    'Trying_substitution_0_candidate_module_location_Colon_1_6093',
    "Trying substitution '{0}', candidate module location: '{1}'."
  ),
  Resolving_module_name_0_relative_to_base_url_1_2: new Message(
    6094,
    Category.Message,
    'Resolving_module_name_0_relative_to_base_url_1_2_6094',
    "Resolving module name '{0}' relative to base url '{1}' - '{2}'."
  ),
  Loading_module_as_file_Slash_folder_candidate_module_location_0_target_file_type_1: new Message(
    6095,
    Category.Message,
    'Loading_module_as_file_Slash_folder_candidate_module_location_0_target_file_type_1_6095',
    "Loading module as file / folder, candidate module location '{0}', target file type '{1}'."
  ),
  File_0_does_not_exist: new Message(6096, Category.Message, 'File_0_does_not_exist_6096', "File '{0}' does not exist."),
  File_0_exist_use_it_as_a_name_resolution_result: new Message(
    6097,
    Category.Message,
    'File_0_exist_use_it_as_a_name_resolution_result_6097',
    "File '{0}' exist - use it as a name resolution result."
  ),
  Loading_module_0_from_node_modules_folder_target_file_type_1: new Message(
    6098,
    Category.Message,
    'Loading_module_0_from_node_modules_folder_target_file_type_1_6098',
    "Loading module '{0}' from 'node_modules' folder, target file type '{1}'."
  ),
  Found_package_json_at_0: new Message(6099, Category.Message, 'Found_package_json_at_0_6099', "Found 'package.json' at '{0}'."),
  package_json_does_not_have_a_0_field: new Message(6100, Category.Message, 'package_json_does_not_have_a_0_field_6100', "'package.json' does not have a '{0}' field."),
  package_json_has_0_field_1_that_references_2: new Message(6101, Category.Message, 'package_json_has_0_field_1_that_references_2_6101', "'package.json' has '{0}' field '{1}' that references '{2}'."),
  Allow_javascript_files_to_be_compiled: new Message(6102, Category.Message, 'Allow_javascript_files_to_be_compiled_6102', 'Allow javascript files to be compiled.'),
  Option_0_should_have_array_of_strings_as_a_value: new Message(6103, Category.Error, 'Option_0_should_have_array_of_strings_as_a_value_6103', "Option '{0}' should have array of strings as a value."),
  Checking_if_0_is_the_longest_matching_prefix_for_1_2: new Message(
    6104,
    Category.Message,
    'Checking_if_0_is_the_longest_matching_prefix_for_1_2_6104',
    "Checking if '{0}' is the longest matching prefix for '{1}' - '{2}'."
  ),
  Expected_type_of_0_field_in_package_json_to_be_1_got_2: new Message(
    6105,
    Category.Message,
    'Expected_type_of_0_field_in_package_json_to_be_1_got_2_6105',
    "Expected type of '{0}' field in 'package.json' to be '{1}', got '{2}'."
  ),
  baseUrl_option_is_set_to_0_using_this_value_to_resolve_non_relative_module_name_1: new Message(
    6106,
    Category.Message,
    'baseUrl_option_is_set_to_0_using_this_value_to_resolve_non_relative_module_name_1_6106',
    "'baseUrl' option is set to '{0}', using this value to resolve non-relative module name '{1}'."
  ),
  rootDirs_option_is_set_using_it_to_resolve_relative_module_name_0: new Message(
    6107,
    Category.Message,
    'rootDirs_option_is_set_using_it_to_resolve_relative_module_name_0_6107',
    "'rootDirs' option is set, using it to resolve relative module name '{0}'."
  ),
  Longest_matching_prefix_for_0_is_1: new Message(6108, Category.Message, 'Longest_matching_prefix_for_0_is_1_6108', "Longest matching prefix for '{0}' is '{1}'."),
  Loading_0_from_the_root_dir_1_candidate_location_2: new Message(
    6109,
    Category.Message,
    'Loading_0_from_the_root_dir_1_candidate_location_2_6109',
    "Loading '{0}' from the root dir '{1}', candidate location '{2}'."
  ),
  Trying_other_entries_in_rootDirs: new Message(6110, Category.Message, 'Trying_other_entries_in_rootDirs_6110', "Trying other entries in 'rootDirs'."),
  Module_resolution_using_rootDirs_has_failed: new Message(6111, Category.Message, 'Module_resolution_using_rootDirs_has_failed_6111', "Module resolution using 'rootDirs' has failed."),
  Do_not_emit_use_strict_directives_in_module_output: new Message(
    6112,
    Category.Message,
    'Do_not_emit_use_strict_directives_in_module_output_6112',
    "Do not emit 'use strict' directives in module output."
  ),
  Enable_strict_null_checks: new Message(6113, Category.Message, 'Enable_strict_null_checks_6113', 'Enable strict null checks.'),
  Unknown_option_excludes_Did_you_mean_exclude: new Message(6114, Category.Error, 'Unknown_option_excludes_Did_you_mean_exclude_6114', "Unknown option 'excludes'. Did you mean 'exclude'?"),
  Raise_error_on_this_expressions_with_an_implied_any_type: new Message(
    6115,
    Category.Message,
    'Raise_error_on_this_expressions_with_an_implied_any_type_6115',
    "Raise error on 'this' expressions with an implied 'any' type."
  ),
  Resolving_type_reference_directive_0_containing_file_1_root_directory_2: new Message(
    6116,
    Category.Message,
    'Resolving_type_reference_directive_0_containing_file_1_root_directory_2_6116',
    "======== Resolving type reference directive '{0}', containing file '{1}', root directory '{2}'. ========"
  ),
  Resolving_using_primary_search_paths: new Message(6117, Category.Message, 'Resolving_using_primary_search_paths_6117', 'Resolving using primary search paths...'),
  Resolving_from_node_modules_folder: new Message(6118, Category.Message, 'Resolving_from_node_modules_folder_6118', 'Resolving from node_modules folder...'),
  Type_reference_directive_0_was_successfully_resolved_to_1_primary_Colon_2: new Message(
    6119,
    Category.Message,
    'Type_reference_directive_0_was_successfully_resolved_to_1_primary_Colon_2_6119',
    "======== Type reference directive '{0}' was successfully resolved to '{1}', primary: {2}. ========"
  ),
  Type_reference_directive_0_was_not_resolved: new Message(
    6120,
    Category.Message,
    'Type_reference_directive_0_was_not_resolved_6120',
    "======== Type reference directive '{0}' was not resolved. ========"
  ),
  Resolving_with_primary_search_path_0: new Message(6121, Category.Message, 'Resolving_with_primary_search_path_0_6121', "Resolving with primary search path '{0}'."),
  Root_directory_cannot_be_determined_skipping_primary_search_paths: new Message(
    6122,
    Category.Message,
    'Root_directory_cannot_be_determined_skipping_primary_search_paths_6122',
    'Root directory cannot be determined, skipping primary search paths.'
  ),
  Resolving_type_reference_directive_0_containing_file_1_root_directory_not_set: new Message(
    6123,
    Category.Message,
    'Resolving_type_reference_directive_0_containing_file_1_root_directory_not_set_6123',
    "======== Resolving type reference directive '{0}', containing file '{1}', root directory not set. ========"
  ),
  Type_declaration_files_to_be_included_in_compilation: new Message(
    6124,
    Category.Message,
    'Type_declaration_files_to_be_included_in_compilation_6124',
    'Type declaration files to be included in compilation.'
  ),
  Looking_up_in_node_modules_folder_initial_location_0: new Message(
    6125,
    Category.Message,
    'Looking_up_in_node_modules_folder_initial_location_0_6125',
    "Looking up in 'node_modules' folder, initial location '{0}'."
  ),
  Containing_file_is_not_specified_and_root_directory_cannot_be_determined_skipping_lookup_in_node_modules_folder: new Message(
    6126,
    Category.Message,
    'Containing_file_is_not_specified_and_root_directory_cannot_be_determined_skipping_lookup_in_node_mod_6126',
    "Containing file is not specified and root directory cannot be determined, skipping lookup in 'node_modules' folder."
  ),
  Resolving_type_reference_directive_0_containing_file_not_set_root_directory_1: new Message(
    6127,
    Category.Message,
    'Resolving_type_reference_directive_0_containing_file_not_set_root_directory_1_6127',
    "======== Resolving type reference directive '{0}', containing file not set, root directory '{1}'. ========"
  ),
  Resolving_type_reference_directive_0_containing_file_not_set_root_directory_not_set: new Message(
    6128,
    Category.Message,
    'Resolving_type_reference_directive_0_containing_file_not_set_root_directory_not_set_6128',
    "======== Resolving type reference directive '{0}', containing file not set, root directory not set. ========"
  ),
  Resolving_real_path_for_0_result_1: new Message(6130, Category.Message, 'Resolving_real_path_for_0_result_1_6130', "Resolving real path for '{0}', result '{1}'."),
  Cannot_compile_modules_using_option_0_unless_the_module_flag_is_amd_or_system: new Message(
    6131,
    Category.Error,
    'Cannot_compile_modules_using_option_0_unless_the_module_flag_is_amd_or_system_6131',
    "Cannot compile modules using option '{0}' unless the '--module' flag is 'amd' or 'system'."
  ),
  File_name_0_has_a_1_extension_stripping_it: new Message(6132, Category.Message, 'File_name_0_has_a_1_extension_stripping_it_6132', "File name '{0}' has a '{1}' extension - stripping it."),
  _0_is_declared_but_its_value_is_never_read: new Message(6133, Category.Error, '_0_is_declared_but_its_value_is_never_read_6133', "'{0}' is declared but its value is never read.", true),
  Report_errors_on_unused_locals: new Message(6134, Category.Message, 'Report_errors_on_unused_locals_6134', 'Report errors on unused locals.'),
  Report_errors_on_unused_parameters: new Message(6135, Category.Message, 'Report_errors_on_unused_parameters_6135', 'Report errors on unused parameters.'),
  The_maximum_dependency_depth_to_search_under_node_modules_and_load_JavaScript_files: new Message(
    6136,
    Category.Message,
    'The_maximum_dependency_depth_to_search_under_node_modules_and_load_JavaScript_files_6136',
    'The maximum dependency depth to search under node_modules and load JavaScript files.'
  ),
  Cannot_import_type_declaration_files_Consider_importing_0_instead_of_1: new Message(
    6137,
    Category.Error,
    'Cannot_import_type_declaration_files_Consider_importing_0_instead_of_1_6137',
    "Cannot import type declaration files. Consider importing '{0}' instead of '{1}'."
  ),
  Property_0_is_declared_but_its_value_is_never_read: new Message(
    6138,
    Category.Error,
    'Property_0_is_declared_but_its_value_is_never_read_6138',
    "Property '{0}' is declared but its value is never read.",
    true
  ),
  Import_emit_helpers_from_tslib: new Message(6139, Category.Message, 'Import_emit_helpers_from_tslib_6139', "Import emit helpers from 'tslib'."),
  Auto_discovery_for_typings_is_enabled_in_project_0_Running_extra_resolution_pass_for_module_1_using_cache_location_2: new Message(
    6140,
    Category.Error,
    'Auto_discovery_for_typings_is_enabled_in_project_0_Running_extra_resolution_pass_for_module_1_using__6140',
    "Auto discovery for typings is enabled in project '{0}'. Running extra resolution pass for module '{1}' using cache location '{2}'."
  ),
  Parse_in_strict_mode_and_emit_use_strict_for_each_source_file: new Message(
    6141,
    Category.Message,
    'Parse_in_strict_mode_and_emit_use_strict_for_each_source_file_6141',
    'Parse in strict mode and emit "use strict" for each source file.'
  ),
  Module_0_was_resolved_to_1_but_jsx_is_not_set: new Message(6142, Category.Error, 'Module_0_was_resolved_to_1_but_jsx_is_not_set_6142', "Module '{0}' was resolved to '{1}', but '--jsx' is not set."),
  Module_0_was_resolved_as_locally_declared_ambient_module_in_file_1: new Message(
    6144,
    Category.Message,
    'Module_0_was_resolved_as_locally_declared_ambient_module_in_file_1_6144',
    "Module '{0}' was resolved as locally declared ambient module in file '{1}'."
  ),
  Module_0_was_resolved_as_ambient_module_declared_in_1_since_this_file_was_not_modified: new Message(
    6145,
    Category.Message,
    'Module_0_was_resolved_as_ambient_module_declared_in_1_since_this_file_was_not_modified_6145',
    "Module '{0}' was resolved as ambient module declared in '{1}' since this file was not modified."
  ),
  Specify_the_JSX_factory_function_to_use_when_targeting_react_JSX_emit_e_g_React_createElement_or_h: new Message(
    6146,
    Category.Message,
    'Specify_the_JSX_factory_function_to_use_when_targeting_react_JSX_emit_e_g_React_createElement_or_h_6146',
    "Specify the JSX factory function to use when targeting 'react' JSX emit, e.g. 'React.createElement' or 'h'."
  ),
  Resolution_for_module_0_was_found_in_cache_from_location_1: new Message(
    6147,
    Category.Message,
    'Resolution_for_module_0_was_found_in_cache_from_location_1_6147',
    "Resolution for module '{0}' was found in cache from location '{1}'."
  ),
  Directory_0_does_not_exist_skipping_all_lookups_in_it: new Message(
    6148,
    Category.Message,
    'Directory_0_does_not_exist_skipping_all_lookups_in_it_6148',
    "Directory '{0}' does not exist, skipping all lookups in it."
  ),
  Show_diagnostic_information: new Message(6149, Category.Message, 'Show_diagnostic_information_6149', 'Show diagnostic information.'),
  Show_verbose_diagnostic_information: new Message(6150, Category.Message, 'Show_verbose_diagnostic_information_6150', 'Show verbose diagnostic information.'),
  Emit_a_single_file_with_source_maps_instead_of_having_a_separate_file: new Message(
    6151,
    Category.Message,
    'Emit_a_single_file_with_source_maps_instead_of_having_a_separate_file_6151',
    'Emit a single file with source maps instead of having a separate file.'
  ),
  Emit_the_source_alongside_the_sourcemaps_within_a_single_file_requires_inlineSourceMap_or_sourceMap_to_be_set: new Message(
    6152,
    Category.Message,
    'Emit_the_source_alongside_the_sourcemaps_within_a_single_file_requires_inlineSourceMap_or_sourceMap__6152',
    "Emit the source alongside the sourcemaps within a single file; requires '--inlineSourceMap' or '--sourceMap' to be set."
  ),
  Transpile_each_file_as_a_separate_module_similar_to_ts_transpileModule: new Message(
    6153,
    Category.Message,
    'Transpile_each_file_as_a_separate_module_similar_to_ts_transpileModule_6153',
    "Transpile each file as a separate module (similar to 'ts.transpileModule')."
  ),
  Print_names_of_generated_files_part_of_the_compilation: new Message(
    6154,
    Category.Message,
    'Print_names_of_generated_files_part_of_the_compilation_6154',
    'Print names of generated files part of the compilation.'
  ),
  Print_names_of_files_part_of_the_compilation: new Message(6155, Category.Message, 'Print_names_of_files_part_of_the_compilation_6155', 'Print names of files part of the compilation.'),
  The_locale_used_when_displaying_messages_to_the_user_e_g_en_us: new Message(
    6156,
    Category.Message,
    'The_locale_used_when_displaying_messages_to_the_user_e_g_en_us_6156',
    "The locale used when displaying messages to the user (e.g. 'en-us')"
  ),
  Do_not_generate_custom_helper_functions_like_extends_in_compiled_output: new Message(
    6157,
    Category.Message,
    'Do_not_generate_custom_helper_functions_like_extends_in_compiled_output_6157',
    "Do not generate custom helper functions like '__extends' in compiled output."
  ),
  Do_not_include_the_default_library_file_lib_d_ts: new Message(6158, Category.Message, 'Do_not_include_the_default_library_file_lib_d_ts_6158', 'Do not include the default library file (lib.d.ts).'),
  Do_not_add_triple_slash_references_or_imported_modules_to_the_list_of_compiled_files: new Message(
    6159,
    Category.Message,
    'Do_not_add_triple_slash_references_or_imported_modules_to_the_list_of_compiled_files_6159',
    'Do not add triple-slash references or imported modules to the list of compiled files.'
  ),
  Deprecated_Use_skipLibCheck_instead_Skip_type_checking_of_default_library_declaration_files: new Message(
    6160,
    Category.Message,
    'Deprecated_Use_skipLibCheck_instead_Skip_type_checking_of_default_library_declaration_files_6160',
    "[Deprecated] Use '--skipLibCheck' instead. Skip type checking of default library declaration files."
  ),
  List_of_folders_to_include_type_definitions_from: new Message(6161, Category.Message, 'List_of_folders_to_include_type_definitions_from_6161', 'List of folders to include type definitions from.'),
  Disable_size_limitations_on_JavaScript_projects: new Message(6162, Category.Message, 'Disable_size_limitations_on_JavaScript_projects_6162', 'Disable size limitations on JavaScript projects.'),
  The_character_set_of_the_input_files: new Message(6163, Category.Message, 'The_character_set_of_the_input_files_6163', 'The character set of the input files.'),
  Emit_a_UTF_8_Byte_Order_Mark_BOM_in_the_beginning_of_output_files: new Message(
    6164,
    Category.Message,
    'Emit_a_UTF_8_Byte_Order_Mark_BOM_in_the_beginning_of_output_files_6164',
    'Emit a UTF-8 Byte Order Mark (BOM) in the beginning of output files.'
  ),
  Do_not_truncate_error_messages: new Message(6165, Category.Message, 'Do_not_truncate_error_messages_6165', 'Do not truncate error messages.'),
  Output_directory_for_generated_declaration_files: new Message(6166, Category.Message, 'Output_directory_for_generated_declaration_files_6166', 'Output directory for generated declaration files.'),
  A_series_of_entries_which_re_map_imports_to_lookup_locations_relative_to_the_baseUrl: new Message(
    6167,
    Category.Message,
    'A_series_of_entries_which_re_map_imports_to_lookup_locations_relative_to_the_baseUrl_6167',
    "A series of entries which re-map imports to lookup locations relative to the 'baseUrl'."
  ),
  List_of_root_folders_whose_combined_content_represents_the_structure_of_the_project_at_runtime: new Message(
    6168,
    Category.Message,
    'List_of_root_folders_whose_combined_content_represents_the_structure_of_the_project_at_runtime_6168',
    'List of root folders whose combined content represents the structure of the project at runtime.'
  ),
  Show_all_compiler_options: new Message(6169, Category.Message, 'Show_all_compiler_options_6169', 'Show all compiler options.'),
  Deprecated_Use_outFile_instead_Concatenate_and_emit_output_to_single_file: new Message(
    6170,
    Category.Message,
    'Deprecated_Use_outFile_instead_Concatenate_and_emit_output_to_single_file_6170',
    "[Deprecated] Use '--outFile' instead. Concatenate and emit output to single file"
  ),
  Command_line_Options: new Message(6171, Category.Message, 'Command_line_Options_6171', 'Command-line Options'),
  Basic_Options: new Message(6172, Category.Message, 'Basic_Options_6172', 'Basic Options'),
  Strict_Type_Checking_Options: new Message(6173, Category.Message, 'Strict_Type_Checking_Options_6173', 'Strict Type-Checking Options'),
  Module_Resolution_Options: new Message(6174, Category.Message, 'Module_Resolution_Options_6174', 'Module Resolution Options'),
  Source_Map_Options: new Message(6175, Category.Message, 'Source_Map_Options_6175', 'Source Map Options'),
  Additional_Checks: new Message(6176, Category.Message, 'Additional_Checks_6176', 'Additional Checks'),
  Experimental_Options: new Message(6177, Category.Message, 'Experimental_Options_6177', 'Experimental Options'),
  Advanced_Options: new Message(6178, Category.Message, 'Advanced_Options_6178', 'Advanced Options'),
  Provide_full_support_for_iterables_in_for_of_spread_and_destructuring_when_targeting_ES5_or_ES3: new Message(
    6179,
    Category.Message,
    'Provide_full_support_for_iterables_in_for_of_spread_and_destructuring_when_targeting_ES5_or_ES3_6179',
    "Provide full support for iterables in 'for-of', spread, and destructuring when targeting 'ES5' or 'ES3'."
  ),
  Enable_all_strict_type_checking_options: new Message(6180, Category.Message, 'Enable_all_strict_type_checking_options_6180', 'Enable all strict type-checking options.'),
  List_of_language_service_plugins: new Message(6181, Category.Message, 'List_of_language_service_plugins_6181', 'List of language service plugins.'),
  Scoped_package_detected_looking_in_0: new Message(6182, Category.Message, 'Scoped_package_detected_looking_in_0_6182', "Scoped package detected, looking in '{0}'"),
  Reusing_resolution_of_module_0_to_file_1_from_old_program: new Message(
    6183,
    Category.Message,
    'Reusing_resolution_of_module_0_to_file_1_from_old_program_6183',
    "Reusing resolution of module '{0}' to file '{1}' from old program."
  ),
  Reusing_module_resolutions_originating_in_0_since_resolutions_are_unchanged_from_old_program: new Message(
    6184,
    Category.Message,
    'Reusing_module_resolutions_originating_in_0_since_resolutions_are_unchanged_from_old_program_6184',
    "Reusing module resolutions originating in '{0}' since resolutions are unchanged from old program."
  ),
  Disable_strict_checking_of_generic_signatures_in_function_types: new Message(
    6185,
    Category.Message,
    'Disable_strict_checking_of_generic_signatures_in_function_types_6185',
    'Disable strict checking of generic signatures in function types.'
  ),
  Enable_strict_checking_of_function_types: new Message(6186, Category.Message, 'Enable_strict_checking_of_function_types_6186', 'Enable strict checking of function types.'),
  Enable_strict_checking_of_property_initialization_in_classes: new Message(
    6187,
    Category.Message,
    'Enable_strict_checking_of_property_initialization_in_classes_6187',
    'Enable strict checking of property initialization in classes.'
  ),
  Numeric_separators_are_not_allowed_here: new Message(6188, Category.Error, 'Numeric_separators_are_not_allowed_here_6188', 'Numeric separators are not allowed here.'),
  Multiple_consecutive_numeric_separators_are_not_permitted: new Message(
    6189,
    Category.Error,
    'Multiple_consecutive_numeric_separators_are_not_permitted_6189',
    'Multiple consecutive numeric separators are not permitted.'
  ),
  Whether_to_keep_outdated_console_output_in_watch_mode_instead_of_clearing_the_screen: new Message(
    6191,
    Category.Message,
    'Whether_to_keep_outdated_console_output_in_watch_mode_instead_of_clearing_the_screen_6191',
    'Whether to keep outdated console output in watch mode instead of clearing the screen.'
  ),
  All_imports_in_import_declaration_are_unused: new Message(6192, Category.Error, 'All_imports_in_import_declaration_are_unused_6192', 'All imports in import declaration are unused.', true),
  Found_1_error_Watching_for_file_changes: new Message(6193, Category.Message, 'Found_1_error_Watching_for_file_changes_6193', 'Found 1 error. Watching for file changes.'),
  Found_0_errors_Watching_for_file_changes: new Message(6194, Category.Message, 'Found_0_errors_Watching_for_file_changes_6194', 'Found {0} errors. Watching for file changes.'),
  Resolve_keyof_to_string_valued_property_names_only_no_numbers_or_symbols: new Message(
    6195,
    Category.Message,
    'Resolve_keyof_to_string_valued_property_names_only_no_numbers_or_symbols_6195',
    "Resolve 'keyof' to string valued property names only (no numbers or symbols)."
  ),
  _0_is_declared_but_never_used: new Message(6196, Category.Error, '_0_is_declared_but_never_used_6196', "'{0}' is declared but never used.", true),
  Include_modules_imported_with_json_extension: new Message(6197, Category.Message, 'Include_modules_imported_with_json_extension_6197', "Include modules imported with '.json' extension"),
  All_destructured_elements_are_unused: new Message(6198, Category.Error, 'All_destructured_elements_are_unused_6198', 'All destructured elements are unused.', true),
  All_variables_are_unused: new Message(6199, Category.Error, 'All_variables_are_unused_6199', 'All variables are unused.', true),
  Definitions_of_the_following_identifiers_conflict_with_those_in_another_file_Colon_0: new Message(
    6200,
    Category.Error,
    'Definitions_of_the_following_identifiers_conflict_with_those_in_another_file_Colon_0_6200',
    'Definitions of the following identifiers conflict with those in another file: {0}'
  ),
  Conflicts_are_in_this_file: new Message(6201, Category.Message, 'Conflicts_are_in_this_file_6201', 'Conflicts are in this file.'),
  Project_references_may_not_form_a_circular_graph_Cycle_detected_Colon_0: new Message(
    6202,
    Category.Error,
    'Project_references_may_not_form_a_circular_graph_Cycle_detected_Colon_0_6202',
    'Project references may not form a circular graph. Cycle detected: {0}'
  ),
  _0_was_also_declared_here: new Message(6203, Category.Message, '_0_was_also_declared_here_6203', "'{0}' was also declared here."),
  and_here: new Message(6204, Category.Message, 'and_here_6204', 'and here.'),
  All_type_parameters_are_unused: new Message(6205, Category.Error, 'All_type_parameters_are_unused_6205', 'All type parameters are unused'),
  package_json_has_a_typesVersions_field_with_version_specific_path_mappings: new Message(
    6206,
    Category.Message,
    'package_json_has_a_typesVersions_field_with_version_specific_path_mappings_6206',
    "'package.json' has a 'typesVersions' field with version-specific path mappings."
  ),
  package_json_does_not_have_a_typesVersions_entry_that_matches_version_0: new Message(
    6207,
    Category.Message,
    'package_json_does_not_have_a_typesVersions_entry_that_matches_version_0_6207',
    "'package.json' does not have a 'typesVersions' entry that matches version '{0}'."
  ),
  package_json_has_a_typesVersions_entry_0_that_matches_compiler_version_1_looking_for_a_pattern_to_match_module_name_2: new Message(
    6208,
    Category.Message,
    'package_json_has_a_typesVersions_entry_0_that_matches_compiler_version_1_looking_for_a_pattern_to_ma_6208',
    "'package.json' has a 'typesVersions' entry '{0}' that matches compiler version '{1}', looking for a pattern to match module name '{2}'."
  ),
  package_json_has_a_typesVersions_entry_0_that_is_not_a_valid_semver_range: new Message(
    6209,
    Category.Message,
    'package_json_has_a_typesVersions_entry_0_that_is_not_a_valid_semver_range_6209',
    "'package.json' has a 'typesVersions' entry '{0}' that is not a valid semver range."
  ),
  An_argument_for_0_was_not_provided: new Message(6210, Category.Message, 'An_argument_for_0_was_not_provided_6210', "An argument for '{0}' was not provided."),
  An_argument_matching_this_binding_pattern_was_not_provided: new Message(
    6211,
    Category.Message,
    'An_argument_matching_this_binding_pattern_was_not_provided_6211',
    'An argument matching this binding pattern was not provided.'
  ),
  Did_you_mean_to_call_this_expression: new Message(6212, Category.Message, 'Did_you_mean_to_call_this_expression_6212', 'Did you mean to call this expression?'),
  Did_you_mean_to_use_new_with_this_expression: new Message(6213, Category.Message, 'Did_you_mean_to_use_new_with_this_expression_6213', "Did you mean to use 'new' with this expression?"),
  Enable_strict_bind_call_and_apply_methods_on_functions: new Message(
    6214,
    Category.Message,
    'Enable_strict_bind_call_and_apply_methods_on_functions_6214',
    "Enable strict 'bind', 'call', and 'apply' methods on functions."
  ),
  Using_compiler_options_of_project_reference_redirect_0: new Message(
    6215,
    Category.Message,
    'Using_compiler_options_of_project_reference_redirect_0_6215',
    "Using compiler options of project reference redirect '{0}'."
  ),
  Found_1_error: new Message(6216, Category.Message, 'Found_1_error_6216', 'Found 1 error.'),
  Found_0_errors: new Message(6217, Category.Message, 'Found_0_errors_6217', 'Found {0} errors.'),
  Module_name_0_was_successfully_resolved_to_1_with_Package_ID_2: new Message(
    6218,
    Category.Message,
    'Module_name_0_was_successfully_resolved_to_1_with_Package_ID_2_6218',
    "======== Module name '{0}' was successfully resolved to '{1}' with Package ID '{2}'. ========"
  ),
  Type_reference_directive_0_was_successfully_resolved_to_1_with_Package_ID_2_primary_Colon_3: new Message(
    6219,
    Category.Message,
    'Type_reference_directive_0_was_successfully_resolved_to_1_with_Package_ID_2_primary_Colon_3_6219',
    "======== Type reference directive '{0}' was successfully resolved to '{1}' with Package ID '{2}', primary: {3}. ========"
  ),
  package_json_had_a_falsy_0_field: new Message(6220, Category.Message, 'package_json_had_a_falsy_0_field_6220', "'package.json' had a falsy '{0}' field."),
  Disable_use_of_source_files_instead_of_declaration_files_from_referenced_projects: new Message(
    6221,
    Category.Message,
    'Disable_use_of_source_files_instead_of_declaration_files_from_referenced_projects_6221',
    'Disable use of source files instead of declaration files from referenced projects.'
  ),
  Emit_class_fields_with_Define_instead_of_Set: new Message(6222, Category.Message, 'Emit_class_fields_with_Define_instead_of_Set_6222', 'Emit class fields with Define instead of Set.'),
  Generates_a_CPU_profile: new Message(6223, Category.Message, 'Generates_a_CPU_profile_6223', 'Generates a CPU profile.'),
  Disable_solution_searching_for_this_project: new Message(6224, Category.Message, 'Disable_solution_searching_for_this_project_6224', 'Disable solution searching for this project.'),
  Specify_strategy_for_watching_file_Colon_FixedPollingInterval_default_PriorityPollingInterval_DynamicPriorityPolling_UseFsEvents_UseFsEventsOnParentDirectory: new Message(
    6225,
    Category.Message,
    'Specify_strategy_for_watching_file_Colon_FixedPollingInterval_default_PriorityPollingInterval_Dynami_6225',
    "Specify strategy for watching file: 'FixedPollingInterval' (default), 'PriorityPollingInterval', 'DynamicPriorityPolling', 'UseFsEvents', 'UseFsEventsOnParentDirectory'."
  ),
  Specify_strategy_for_watching_directory_on_platforms_that_don_t_support_recursive_watching_natively_Colon_UseFsEvents_default_FixedPollingInterval_DynamicPriorityPolling: new Message(
    6226,
    Category.Message,
    'Specify_strategy_for_watching_directory_on_platforms_that_don_t_support_recursive_watching_natively__6226',
    "Specify strategy for watching directory on platforms that don't support recursive watching natively: 'UseFsEvents' (default), 'FixedPollingInterval', 'DynamicPriorityPolling'."
  ),
  Specify_strategy_for_creating_a_polling_watch_when_it_fails_to_create_using_file_system_events_Colon_FixedInterval_default_PriorityInterval_DynamicPriority: new Message(
    6227,
    Category.Message,
    'Specify_strategy_for_creating_a_polling_watch_when_it_fails_to_create_using_file_system_events_Colon_6227',
    "Specify strategy for creating a polling watch when it fails to create using file system events: 'FixedInterval' (default), 'PriorityInterval', 'DynamicPriority'."
  ),
  Synchronously_call_callbacks_and_update_the_state_of_directory_watchers_on_platforms_that_don_t_support_recursive_watching_natively: new Message(
    6228,
    Category.Message,
    'Synchronously_call_callbacks_and_update_the_state_of_directory_watchers_on_platforms_that_don_t_supp_6228',
    "Synchronously call callbacks and update the state of directory watchers on platforms that don't support recursive watching natively."
  ),
  Tag_0_expects_at_least_1_arguments_but_the_JSX_factory_2_provides_at_most_3: new Message(
    6229,
    Category.Error,
    'Tag_0_expects_at_least_1_arguments_but_the_JSX_factory_2_provides_at_most_3_6229',
    "Tag '{0}' expects at least '{1}' arguments, but the JSX factory '{2}' provides at most '{3}'."
  ),
  Option_0_can_only_be_specified_in_tsconfig_json_file_or_set_to_false_or_null_on_command_line: new Message(
    6230,
    Category.Error,
    'Option_0_can_only_be_specified_in_tsconfig_json_file_or_set_to_false_or_null_on_command_line_6230',
    "Option '{0}' can only be specified in 'tsconfig.json' file or set to 'false' or 'null' on command line."
  ),
  Could_not_resolve_the_path_0_with_the_extensions_Colon_1: new Message(
    6231,
    Category.Error,
    'Could_not_resolve_the_path_0_with_the_extensions_Colon_1_6231',
    "Could not resolve the path '{0}' with the extensions: {1}."
  ),
  Declaration_augments_declaration_in_another_file_This_cannot_be_serialized: new Message(
    6232,
    Category.Error,
    'Declaration_augments_declaration_in_another_file_This_cannot_be_serialized_6232',
    'Declaration augments declaration in another file. This cannot be serialized.'
  ),
  This_is_the_declaration_being_augmented_Consider_moving_the_augmenting_declaration_into_the_same_file: new Message(
    6233,
    Category.Error,
    'This_is_the_declaration_being_augmented_Consider_moving_the_augmenting_declaration_into_the_same_fil_6233',
    'This is the declaration being augmented. Consider moving the augmenting declaration into the same file.'
  ),
  This_expression_is_not_callable_because_it_is_a_get_accessor_Did_you_mean_to_use_it_without: new Message(
    6234,
    Category.Error,
    'This_expression_is_not_callable_because_it_is_a_get_accessor_Did_you_mean_to_use_it_without_6234',
    "This expression is not callable because it is a 'get' accessor. Did you mean to use it without '()'?"
  ),
  Projects_to_reference: new Message(6300, Category.Message, 'Projects_to_reference_6300', 'Projects to reference'),
  Enable_project_compilation: new Message(6302, Category.Message, 'Enable_project_compilation_6302', 'Enable project compilation'),
  Composite_projects_may_not_disable_declaration_emit: new Message(
    6304,
    Category.Error,
    'Composite_projects_may_not_disable_declaration_emit_6304',
    'Composite projects may not disable declaration emit.'
  ),
  Output_file_0_has_not_been_built_from_source_file_1: new Message(
    6305,
    Category.Error,
    'Output_file_0_has_not_been_built_from_source_file_1_6305',
    "Output file '{0}' has not been built from source file '{1}'."
  ),
  Referenced_project_0_must_have_setting_composite_Colon_true: new Message(
    6306,
    Category.Error,
    'Referenced_project_0_must_have_setting_composite_Colon_true_6306',
    'Referenced project \'{0}\' must have setting "composite": true.'
  ),
  File_0_is_not_listed_within_the_file_list_of_project_1_Projects_must_list_all_files_or_use_an_include_pattern: new Message(
    6307,
    Category.Error,
    'File_0_is_not_listed_within_the_file_list_of_project_1_Projects_must_list_all_files_or_use_an_includ_6307',
    "File '{0}' is not listed within the file list of project '{1}'. Projects must list all files or use an 'include' pattern."
  ),
  Cannot_prepend_project_0_because_it_does_not_have_outFile_set: new Message(
    6308,
    Category.Error,
    'Cannot_prepend_project_0_because_it_does_not_have_outFile_set_6308',
    "Cannot prepend project '{0}' because it does not have 'outFile' set"
  ),
  Output_file_0_from_project_1_does_not_exist: new Message(6309, Category.Error, 'Output_file_0_from_project_1_does_not_exist_6309', "Output file '{0}' from project '{1}' does not exist"),
  Project_0_is_out_of_date_because_oldest_output_1_is_older_than_newest_input_2: new Message(
    6350,
    Category.Message,
    'Project_0_is_out_of_date_because_oldest_output_1_is_older_than_newest_input_2_6350',
    "Project '{0}' is out of date because oldest output '{1}' is older than newest input '{2}'"
  ),
  Project_0_is_up_to_date_because_newest_input_1_is_older_than_oldest_output_2: new Message(
    6351,
    Category.Message,
    'Project_0_is_up_to_date_because_newest_input_1_is_older_than_oldest_output_2_6351',
    "Project '{0}' is up to date because newest input '{1}' is older than oldest output '{2}'"
  ),
  Project_0_is_out_of_date_because_output_file_1_does_not_exist: new Message(
    6352,
    Category.Message,
    'Project_0_is_out_of_date_because_output_file_1_does_not_exist_6352',
    "Project '{0}' is out of date because output file '{1}' does not exist"
  ),
  Project_0_is_out_of_date_because_its_dependency_1_is_out_of_date: new Message(
    6353,
    Category.Message,
    'Project_0_is_out_of_date_because_its_dependency_1_is_out_of_date_6353',
    "Project '{0}' is out of date because its dependency '{1}' is out of date"
  ),
  Project_0_is_up_to_date_with_d_ts_files_from_its_dependencies: new Message(
    6354,
    Category.Message,
    'Project_0_is_up_to_date_with_d_ts_files_from_its_dependencies_6354',
    "Project '{0}' is up to date with .d.ts files from its dependencies"
  ),
  Projects_in_this_build_Colon_0: new Message(6355, Category.Message, 'Projects_in_this_build_Colon_0_6355', 'Projects in this build: {0}'),
  A_non_dry_build_would_delete_the_following_files_Colon_0: new Message(
    6356,
    Category.Message,
    'A_non_dry_build_would_delete_the_following_files_Colon_0_6356',
    'A non-dry build would delete the following files: {0}'
  ),
  A_non_dry_build_would_build_project_0: new Message(6357, Category.Message, 'A_non_dry_build_would_build_project_0_6357', "A non-dry build would build project '{0}'"),
  Building_project_0: new Message(6358, Category.Message, 'Building_project_0_6358', "Building project '{0}'..."),
  Updating_output_timestamps_of_project_0: new Message(6359, Category.Message, 'Updating_output_timestamps_of_project_0_6359', "Updating output timestamps of project '{0}'..."),
  delete_this_Project_0_is_up_to_date_because_it_was_previously_built: new Message(
    6360,
    Category.Message,
    'delete_this_Project_0_is_up_to_date_because_it_was_previously_built_6360',
    "delete this - Project '{0}' is up to date because it was previously built"
  ),
  Project_0_is_up_to_date: new Message(6361, Category.Message, 'Project_0_is_up_to_date_6361', "Project '{0}' is up to date"),
  Skipping_build_of_project_0_because_its_dependency_1_has_errors: new Message(
    6362,
    Category.Message,
    'Skipping_build_of_project_0_because_its_dependency_1_has_errors_6362',
    "Skipping build of project '{0}' because its dependency '{1}' has errors"
  ),
  Project_0_can_t_be_built_because_its_dependency_1_has_errors: new Message(
    6363,
    Category.Message,
    'Project_0_can_t_be_built_because_its_dependency_1_has_errors_6363',
    "Project '{0}' can't be built because its dependency '{1}' has errors"
  ),
  Build_one_or_more_projects_and_their_dependencies_if_out_of_date: new Message(
    6364,
    Category.Message,
    'Build_one_or_more_projects_and_their_dependencies_if_out_of_date_6364',
    'Build one or more projects and their dependencies, if out of date'
  ),
  Delete_the_outputs_of_all_projects: new Message(6365, Category.Message, 'Delete_the_outputs_of_all_projects_6365', 'Delete the outputs of all projects'),
  Enable_verbose_logging: new Message(6366, Category.Message, 'Enable_verbose_logging_6366', 'Enable verbose logging'),
  Show_what_would_be_built_or_deleted_if_specified_with_clean: new Message(
    6367,
    Category.Message,
    'Show_what_would_be_built_or_deleted_if_specified_with_clean_6367',
    "Show what would be built (or deleted, if specified with '--clean')"
  ),
  Build_all_projects_including_those_that_appear_to_be_up_to_date: new Message(
    6368,
    Category.Message,
    'Build_all_projects_including_those_that_appear_to_be_up_to_date_6368',
    'Build all projects, including those that appear to be up to date'
  ),
  Option_build_must_be_the_first_command_line_argument: new Message(
    6369,
    Category.Error,
    'Option_build_must_be_the_first_command_line_argument_6369',
    "Option '--build' must be the first command line argument."
  ),
  Options_0_and_1_cannot_be_combined: new Message(6370, Category.Error, 'Options_0_and_1_cannot_be_combined_6370', "Options '{0}' and '{1}' cannot be combined."),
  Updating_unchanged_output_timestamps_of_project_0: new Message(
    6371,
    Category.Message,
    'Updating_unchanged_output_timestamps_of_project_0_6371',
    "Updating unchanged output timestamps of project '{0}'..."
  ),
  Project_0_is_out_of_date_because_output_of_its_dependency_1_has_changed: new Message(
    6372,
    Category.Message,
    'Project_0_is_out_of_date_because_output_of_its_dependency_1_has_changed_6372',
    "Project '{0}' is out of date because output of its dependency '{1}' has changed"
  ),
  Updating_output_of_project_0: new Message(6373, Category.Message, 'Updating_output_of_project_0_6373', "Updating output of project '{0}'..."),
  A_non_dry_build_would_update_timestamps_for_output_of_project_0: new Message(
    6374,
    Category.Message,
    'A_non_dry_build_would_update_timestamps_for_output_of_project_0_6374',
    "A non-dry build would update timestamps for output of project '{0}'"
  ),
  A_non_dry_build_would_update_output_of_project_0: new Message(
    6375,
    Category.Message,
    'A_non_dry_build_would_update_output_of_project_0_6375',
    "A non-dry build would update output of project '{0}'"
  ),
  Cannot_update_output_of_project_0_because_there_was_error_reading_file_1: new Message(
    6376,
    Category.Message,
    'Cannot_update_output_of_project_0_because_there_was_error_reading_file_1_6376',
    "Cannot update output of project '{0}' because there was error reading file '{1}'"
  ),
  Cannot_write_file_0_because_it_will_overwrite_tsbuildinfo_file_generated_by_referenced_project_1: new Message(
    6377,
    Category.Error,
    'Cannot_write_file_0_because_it_will_overwrite_tsbuildinfo_file_generated_by_referenced_project_1_6377',
    "Cannot write file '{0}' because it will overwrite '.tsbuildinfo' file generated by referenced project '{1}'"
  ),
  Enable_incremental_compilation: new Message(6378, Category.Message, 'Enable_incremental_compilation_6378', 'Enable incremental compilation'),
  Composite_projects_may_not_disable_incremental_compilation: new Message(
    6379,
    Category.Error,
    'Composite_projects_may_not_disable_incremental_compilation_6379',
    'Composite projects may not disable incremental compilation.'
  ),
  Specify_file_to_store_incremental_compilation_information: new Message(
    6380,
    Category.Message,
    'Specify_file_to_store_incremental_compilation_information_6380',
    'Specify file to store incremental compilation information'
  ),
  Project_0_is_out_of_date_because_output_for_it_was_generated_with_version_1_that_differs_with_current_version_2: new Message(
    6381,
    Category.Message,
    'Project_0_is_out_of_date_because_output_for_it_was_generated_with_version_1_that_differs_with_curren_6381',
    "Project '{0}' is out of date because output for it was generated with version '{1}' that differs with current version '{2}'"
  ),
  Skipping_build_of_project_0_because_its_dependency_1_was_not_built: new Message(
    6382,
    Category.Message,
    'Skipping_build_of_project_0_because_its_dependency_1_was_not_built_6382',
    "Skipping build of project '{0}' because its dependency '{1}' was not built"
  ),
  Project_0_can_t_be_built_because_its_dependency_1_was_not_built: new Message(
    6383,
    Category.Message,
    'Project_0_can_t_be_built_because_its_dependency_1_was_not_built_6383',
    "Project '{0}' can't be built because its dependency '{1}' was not built"
  ),
  Have_recompiles_in_incremental_and_watch_assume_that_changes_within_a_file_will_only_affect_files_directly_depending_on_it: new Message(
    6384,
    Category.Message,
    'Have_recompiles_in_incremental_and_watch_assume_that_changes_within_a_file_will_only_affect_files_di_6384',
    "Have recompiles in '--incremental' and '--watch' assume that changes within a file will only affect files directly depending on it."
  ),
  The_expected_type_comes_from_property_0_which_is_declared_here_on_type_1: new Message(
    6500,
    Category.Message,
    'The_expected_type_comes_from_property_0_which_is_declared_here_on_type_1_6500',
    "The expected type comes from property '{0}' which is declared here on type '{1}'"
  ),
  The_expected_type_comes_from_this_index_signature: new Message(
    6501,
    Category.Message,
    'The_expected_type_comes_from_this_index_signature_6501',
    'The expected type comes from this index signature.'
  ),
  The_expected_type_comes_from_the_return_type_of_this_signature: new Message(
    6502,
    Category.Message,
    'The_expected_type_comes_from_the_return_type_of_this_signature_6502',
    'The expected type comes from the return type of this signature.'
  ),
  Print_names_of_files_that_are_part_of_the_compilation_and_then_stop_processing: new Message(
    6503,
    Category.Message,
    'Print_names_of_files_that_are_part_of_the_compilation_and_then_stop_processing_6503',
    'Print names of files that are part of the compilation and then stop processing.'
  ),
  File_0_is_a_JavaScript_file_Did_you_mean_to_enable_the_allowJs_option: new Message(
    6504,
    Category.Error,
    'File_0_is_a_JavaScript_file_Did_you_mean_to_enable_the_allowJs_option_6504',
    "File '{0}' is a JavaScript file. Did you mean to enable the 'allowJs' option?"
  ),
  Variable_0_implicitly_has_an_1_type: new Message(7005, Category.Error, 'Variable_0_implicitly_has_an_1_type_7005', "Variable '{0}' implicitly has an '{1}' type."),
  Parameter_0_implicitly_has_an_1_type: new Message(7006, Category.Error, 'Parameter_0_implicitly_has_an_1_type_7006', "Parameter '{0}' implicitly has an '{1}' type."),
  Member_0_implicitly_has_an_1_type: new Message(7008, Category.Error, 'Member_0_implicitly_has_an_1_type_7008', "Member '{0}' implicitly has an '{1}' type."),
  new_expression_whose_target_lacks_a_construct_signature_implicitly_has_an_any_type: new Message(
    7009,
    Category.Error,
    'new_expression_whose_target_lacks_a_construct_signature_implicitly_has_an_any_type_7009',
    "'new' expression, whose target lacks a construct signature, implicitly has an 'any' type."
  ),
  _0_which_lacks_return_type_annotation_implicitly_has_an_1_return_type: new Message(
    7010,
    Category.Error,
    '_0_which_lacks_return_type_annotation_implicitly_has_an_1_return_type_7010',
    "'{0}', which lacks return-type annotation, implicitly has an '{1}' return type."
  ),
  Function_expression_which_lacks_return_type_annotation_implicitly_has_an_0_return_type: new Message(
    7011,
    Category.Error,
    'Function_expression_which_lacks_return_type_annotation_implicitly_has_an_0_return_type_7011',
    "Function expression, which lacks return-type annotation, implicitly has an '{0}' return type."
  ),
  Construct_signature_which_lacks_return_type_annotation_implicitly_has_an_any_return_type: new Message(
    7013,
    Category.Error,
    'Construct_signature_which_lacks_return_type_annotation_implicitly_has_an_any_return_type_7013',
    "Construct signature, which lacks return-type annotation, implicitly has an 'any' return type."
  ),
  Function_type_which_lacks_return_type_annotation_implicitly_has_an_0_return_type: new Message(
    7014,
    Category.Error,
    'Function_type_which_lacks_return_type_annotation_implicitly_has_an_0_return_type_7014',
    "Function type, which lacks return-type annotation, implicitly has an '{0}' return type."
  ),
  Element_implicitly_has_an_any_type_because_index_expression_is_not_of_type_number: new Message(
    7015,
    Category.Error,
    'Element_implicitly_has_an_any_type_because_index_expression_is_not_of_type_number_7015',
    "Element implicitly has an 'any' type because index expression is not of type 'number'."
  ),
  Could_not_find_a_declaration_file_for_module_0_1_implicitly_has_an_any_type: new Message(
    7016,
    Category.Error,
    'Could_not_find_a_declaration_file_for_module_0_1_implicitly_has_an_any_type_7016',
    "Could not find a declaration file for module '{0}'. '{1}' implicitly has an 'any' type."
  ),
  Element_implicitly_has_an_any_type_because_type_0_has_no_index_signature: new Message(
    7017,
    Category.Error,
    'Element_implicitly_has_an_any_type_because_type_0_has_no_index_signature_7017',
    "Element implicitly has an 'any' type because type '{0}' has no index signature."
  ),
  Object_literal_s_property_0_implicitly_has_an_1_type: new Message(
    7018,
    Category.Error,
    'Object_literal_s_property_0_implicitly_has_an_1_type_7018',
    "Object literal's property '{0}' implicitly has an '{1}' type."
  ),
  Rest_parameter_0_implicitly_has_an_any_type: new Message(7019, Category.Error, 'Rest_parameter_0_implicitly_has_an_any_type_7019', "Rest parameter '{0}' implicitly has an 'any[]' type."),
  Call_signature_which_lacks_return_type_annotation_implicitly_has_an_any_return_type: new Message(
    7020,
    Category.Error,
    'Call_signature_which_lacks_return_type_annotation_implicitly_has_an_any_return_type_7020',
    "Call signature, which lacks return-type annotation, implicitly has an 'any' return type."
  ),
  _0_implicitly_has_type_any_because_it_does_not_have_a_type_annotation_and_is_referenced_directly_or_indirectly_in_its_own_initer: new Message(
    7022,
    Category.Error,
    '_0_implicitly_has_type_any_because_it_does_not_have_a_type_annotation_and_is_referenced_directly_or__7022',
    "'{0}' implicitly has type 'any' because it does not have a type annotation and is referenced directly or indirectly in its own initer."
  ),
  _0_implicitly_has_return_type_any_because_it_does_not_have_a_return_type_annotation_and_is_referenced_directly_or_indirectly_in_one_of_its_return_expressions: new Message(
    7023,
    Category.Error,
    '_0_implicitly_has_return_type_any_because_it_does_not_have_a_return_type_annotation_and_is_reference_7023',
    "'{0}' implicitly has return type 'any' because it does not have a return type annotation and is referenced directly or indirectly in one of its return expressions."
  ),
  Function_implicitly_has_return_type_any_because_it_does_not_have_a_return_type_annotation_and_is_referenced_directly_or_indirectly_in_one_of_its_return_expressions: new Message(
    7024,
    Category.Error,
    'Function_implicitly_has_return_type_any_because_it_does_not_have_a_return_type_annotation_and_is_ref_7024',
    "Function implicitly has return type 'any' because it does not have a return type annotation and is referenced directly or indirectly in one of its return expressions."
  ),
  Generator_implicitly_has_yield_type_0_because_it_does_not_yield_any_values_Consider_supplying_a_return_type_annotation: new Message(
    7025,
    Category.Error,
    'Generator_implicitly_has_yield_type_0_because_it_does_not_yield_any_values_Consider_supplying_a_retu_7025',
    "Generator implicitly has yield type '{0}' because it does not yield any values. Consider supplying a return type annotation."
  ),
  JSX_element_implicitly_has_type_any_because_no_interface_JSX_0_exists: new Message(
    7026,
    Category.Error,
    'JSX_element_implicitly_has_type_any_because_no_interface_JSX_0_exists_7026',
    "JSX element implicitly has type 'any' because no interface 'JSX.{0}' exists."
  ),
  Unreachable_code_detected: new Message(7027, Category.Error, 'Unreachable_code_detected_7027', 'Unreachable code detected.', true),
  Unused_label: new Message(7028, Category.Error, 'Unused_label_7028', 'Unused label.', true),
  Fallthrough_case_in_switch: new Message(7029, Category.Error, 'Fallthrough_case_in_switch_7029', 'Fallthrough case in switch.'),
  Not_all_code_paths_return_a_value: new Message(7030, Category.Error, 'Not_all_code_paths_return_a_value_7030', 'Not all code paths return a value.'),
  Binding_element_0_implicitly_has_an_1_type: new Message(7031, Category.Error, 'Binding_element_0_implicitly_has_an_1_type_7031', "Binding element '{0}' implicitly has an '{1}' type."),
  Property_0_implicitly_has_type_any_because_its_set_accessor_lacks_a_parameter_type_annotation: new Message(
    7032,
    Category.Error,
    'Property_0_implicitly_has_type_any_because_its_set_accessor_lacks_a_parameter_type_annotation_7032',
    "Property '{0}' implicitly has type 'any', because its set accessor lacks a parameter type annotation."
  ),
  Property_0_implicitly_has_type_any_because_its_get_accessor_lacks_a_return_type_annotation: new Message(
    7033,
    Category.Error,
    'Property_0_implicitly_has_type_any_because_its_get_accessor_lacks_a_return_type_annotation_7033',
    "Property '{0}' implicitly has type 'any', because its get accessor lacks a return type annotation."
  ),
  Variable_0_implicitly_has_type_1_in_some_locations_where_its_type_cannot_be_determined: new Message(
    7034,
    Category.Error,
    'Variable_0_implicitly_has_type_1_in_some_locations_where_its_type_cannot_be_determined_7034',
    "Variable '{0}' implicitly has type '{1}' in some locations where its type cannot be determined."
  ),
  Try_npm_install_types_Slash_1_if_it_exists_or_add_a_new_declaration_d_ts_file_containing_declare_module_0: new Message(
    7035,
    Category.Error,
    'Try_npm_install_types_Slash_1_if_it_exists_or_add_a_new_declaration_d_ts_file_containing_declare_mod_7035',
    "Try `npm install @types/{1}` if it exists or add a new declaration (.d.ts) file containing `declare module '{0}';`"
  ),
  Dynamic_import_s_specifier_must_be_of_type_string_but_here_has_type_0: new Message(
    7036,
    Category.Error,
    'Dynamic_import_s_specifier_must_be_of_type_string_but_here_has_type_0_7036',
    "Dynamic import's specifier must be of type 'string', but here has type '{0}'."
  ),
  Enables_emit_interoperability_between_CommonJS_and_ES_Modules_via_creation_of_namespace_objects_for_all_imports_Implies_allowSyntheticDefaultImports: new Message(
    7037,
    Category.Message,
    'Enables_emit_interoperability_between_CommonJS_and_ES_Modules_via_creation_of_namespace_objects_for__7037',
    "Enables emit interoperability between CommonJS and ES Modules via creation of namespace objects for all imports. Implies 'allowSyntheticDefaultImports'."
  ),
  Type_originates_at_this_import_A_namespace_style_import_cannot_be_called_or_constructed_and_will_cause_a_failure_at_runtime_Consider_using_a_default_import_or_import_require_here_instead: new Message(
    7038,
    Category.Message,
    'Type_originates_at_this_import_A_namespace_style_import_cannot_be_called_or_constructed_and_will_cau_7038',
    'Type originates at this import. A namespace-style import cannot be called or constructed, and will cause a failure at runtime. Consider using a default import or import require here instead.'
  ),
  Mapped_object_type_implicitly_has_an_any_template_type: new Message(
    7039,
    Category.Error,
    'Mapped_object_type_implicitly_has_an_any_template_type_7039',
    "Mapped object type implicitly has an 'any' template type."
  ),
  If_the_0_package_actually_exposes_this_module_consider_sending_a_pull_request_to_amend_https_Colon_Slash_Slashgithub_com_SlashDefinitelyTyped_SlashDefinitelyTyped_Slashtree_Slashmaster_Slashtypes_Slash_1: new Message(
    7040,
    Category.Error,
    'If_the_0_package_actually_exposes_this_module_consider_sending_a_pull_request_to_amend_https_Colon_S_7040',
    "If the '{0}' package actually exposes this module, consider sending a pull request to amend 'https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/{1}`"
  ),
  The_containing_arrow_function_captures_the_global_value_of_this: new Message(
    7041,
    Category.Error,
    'The_containing_arrow_function_captures_the_global_value_of_this_7041',
    "The containing arrow function captures the global value of 'this'."
  ),
  Module_0_was_resolved_to_1_but_resolveJsonModule_is_not_used: new Message(
    7042,
    Category.Error,
    'Module_0_was_resolved_to_1_but_resolveJsonModule_is_not_used_7042',
    "Module '{0}' was resolved to '{1}', but '--resolveJsonModule' is not used."
  ),
  Variable_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage: new Message(
    7043,
    Category.Suggestion,
    'Variable_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage_7043',
    "Variable '{0}' implicitly has an '{1}' type, but a better type may be inferred from usage."
  ),
  Parameter_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage: new Message(
    7044,
    Category.Suggestion,
    'Parameter_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage_7044',
    "Parameter '{0}' implicitly has an '{1}' type, but a better type may be inferred from usage."
  ),
  Member_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage: new Message(
    7045,
    Category.Suggestion,
    'Member_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage_7045',
    "Member '{0}' implicitly has an '{1}' type, but a better type may be inferred from usage."
  ),
  Variable_0_implicitly_has_type_1_in_some_locations_but_a_better_type_may_be_inferred_from_usage: new Message(
    7046,
    Category.Suggestion,
    'Variable_0_implicitly_has_type_1_in_some_locations_but_a_better_type_may_be_inferred_from_usage_7046',
    "Variable '{0}' implicitly has type '{1}' in some locations, but a better type may be inferred from usage."
  ),
  Rest_parameter_0_implicitly_has_an_any_type_but_a_better_type_may_be_inferred_from_usage: new Message(
    7047,
    Category.Suggestion,
    'Rest_parameter_0_implicitly_has_an_any_type_but_a_better_type_may_be_inferred_from_usage_7047',
    "Rest parameter '{0}' implicitly has an 'any[]' type, but a better type may be inferred from usage."
  ),
  Property_0_implicitly_has_type_any_but_a_better_type_for_its_get_accessor_may_be_inferred_from_usage: new Message(
    7048,
    Category.Suggestion,
    'Property_0_implicitly_has_type_any_but_a_better_type_for_its_get_accessor_may_be_inferred_from_usage_7048',
    "Property '{0}' implicitly has type 'any', but a better type for its get accessor may be inferred from usage."
  ),
  Property_0_implicitly_has_type_any_but_a_better_type_for_its_set_accessor_may_be_inferred_from_usage: new Message(
    7049,
    Category.Suggestion,
    'Property_0_implicitly_has_type_any_but_a_better_type_for_its_set_accessor_may_be_inferred_from_usage_7049',
    "Property '{0}' implicitly has type 'any', but a better type for its set accessor may be inferred from usage."
  ),
  _0_implicitly_has_an_1_return_type_but_a_better_type_may_be_inferred_from_usage: new Message(
    7050,
    Category.Suggestion,
    '_0_implicitly_has_an_1_return_type_but_a_better_type_may_be_inferred_from_usage_7050',
    "'{0}' implicitly has an '{1}' return type, but a better type may be inferred from usage."
  ),
  Parameter_has_a_name_but_no_type_Did_you_mean_0_Colon_1: new Message(
    7051,
    Category.Error,
    'Parameter_has_a_name_but_no_type_Did_you_mean_0_Colon_1_7051',
    "Parameter has a name but no type. Did you mean '{0}: {1}'?"
  ),
  Element_implicitly_has_an_any_type_because_type_0_has_no_index_signature_Did_you_mean_to_call_1: new Message(
    7052,
    Category.Error,
    'Element_implicitly_has_an_any_type_because_type_0_has_no_index_signature_Did_you_mean_to_call_1_7052',
    "Element implicitly has an 'any' type because type '{0}' has no index signature. Did you mean to call '{1}'?"
  ),
  Element_implicitly_has_an_any_type_because_expression_of_type_0_can_t_be_used_to_index_type_1: new Message(
    7053,
    Category.Error,
    'Element_implicitly_has_an_any_type_because_expression_of_type_0_can_t_be_used_to_index_type_1_7053',
    "Element implicitly has an 'any' type because expression of type '{0}' can't be used to index type '{1}'."
  ),
  No_index_signature_with_a_parameter_of_type_0_was_found_on_type_1: new Message(
    7054,
    Category.Error,
    'No_index_signature_with_a_parameter_of_type_0_was_found_on_type_1_7054',
    "No index signature with a parameter of type '{0}' was found on type '{1}'."
  ),
  _0_which_lacks_return_type_annotation_implicitly_has_an_1_yield_type: new Message(
    7055,
    Category.Error,
    '_0_which_lacks_return_type_annotation_implicitly_has_an_1_yield_type_7055',
    "'{0}', which lacks return-type annotation, implicitly has an '{1}' yield type."
  ),
  You_cannot_rename_this_element: new Message(8000, Category.Error, 'You_cannot_rename_this_element_8000', 'You cannot rename this element.'),
  You_cannot_rename_elements_that_are_defined_in_the_standard_TypeScript_library: new Message(
    8001,
    Category.Error,
    'You_cannot_rename_elements_that_are_defined_in_the_standard_TypeScript_library_8001',
    'You cannot rename elements that are defined in the standard TypeScript library.'
  ),
  import_can_only_be_used_in_TypeScript_files: new Message(8002, Category.Error, 'import_can_only_be_used_in_TypeScript_files_8002', "'import ... =' can only be used in TypeScript files."),
  export_can_only_be_used_in_TypeScript_files: new Message(8003, Category.Error, 'export_can_only_be_used_in_TypeScript_files_8003', "'export =' can only be used in TypeScript files."),
  Type_parameter_declarations_can_only_be_used_in_TypeScript_files: new Message(
    8004,
    Category.Error,
    'Type_parameter_declarations_can_only_be_used_in_TypeScript_files_8004',
    'Type parameter declarations can only be used in TypeScript files.'
  ),
  implements_clauses_can_only_be_used_in_TypeScript_files: new Message(
    8005,
    Category.Error,
    'implements_clauses_can_only_be_used_in_TypeScript_files_8005',
    "'implements' clauses can only be used in TypeScript files."
  ),
  _0_declarations_can_only_be_used_in_TypeScript_files: new Message(
    8006,
    Category.Error,
    '_0_declarations_can_only_be_used_in_TypeScript_files_8006',
    "'{0}' declarations can only be used in TypeScript files."
  ),
  Type_aliases_can_only_be_used_in_TypeScript_files: new Message(8008, Category.Error, 'Type_aliases_can_only_be_used_in_TypeScript_files_8008', 'Type aliases can only be used in TypeScript files.'),
  The_0_modifier_can_only_be_used_in_TypeScript_files: new Message(
    8009,
    Category.Error,
    'The_0_modifier_can_only_be_used_in_TypeScript_files_8009',
    "The '{0}' modifier can only be used in TypeScript files."
  ),
  Type_annotations_can_only_be_used_in_TypeScript_files: new Message(
    8010,
    Category.Error,
    'Type_annotations_can_only_be_used_in_TypeScript_files_8010',
    'Type annotations can only be used in TypeScript files.'
  ),
  Type_arguments_can_only_be_used_in_TypeScript_files: new Message(
    8011,
    Category.Error,
    'Type_arguments_can_only_be_used_in_TypeScript_files_8011',
    'Type arguments can only be used in TypeScript files.'
  ),
  Parameter_modifiers_can_only_be_used_in_TypeScript_files: new Message(
    8012,
    Category.Error,
    'Parameter_modifiers_can_only_be_used_in_TypeScript_files_8012',
    'Parameter modifiers can only be used in TypeScript files.'
  ),
  Non_null_assertions_can_only_be_used_in_TypeScript_files: new Message(
    8013,
    Category.Error,
    'Non_null_assertions_can_only_be_used_in_TypeScript_files_8013',
    'Non-null assertions can only be used in TypeScript files.'
  ),
  Type_assertion_expressions_can_only_be_used_in_TypeScript_files: new Message(
    8016,
    Category.Error,
    'Type_assertion_expressions_can_only_be_used_in_TypeScript_files_8016',
    'Type assertion expressions can only be used in TypeScript files.'
  ),
  Octal_literal_types_must_use_ES2015_syntax_Use_the_syntax_0: new Message(
    8017,
    Category.Error,
    'Octal_literal_types_must_use_ES2015_syntax_Use_the_syntax_0_8017',
    "Octal literal types must use ES2015 syntax. Use the syntax '{0}'."
  ),
  Octal_literals_are_not_allowed_in_enums_members_initer_Use_the_syntax_0: new Message(
    8018,
    Category.Error,
    'Octal_literals_are_not_allowed_in_enums_members_initer_Use_the_syntax_0_8018',
    "Octal literals are not allowed in enums members initer. Use the syntax '{0}'."
  ),
  Report_errors_in_js_files: new Message(8019, Category.Message, 'Report_errors_in_js_files_8019', 'Report errors in .js files.'),
  Doc_types_can_only_be_used_inside_documentation_comments: new Message(
    8020,
    Category.Error,
    'Doc_types_can_only_be_used_inside_documentation_comments_8020',
    'Doc types can only be used inside documentation comments.'
  ),
  Doc_typedef_tag_should_either_have_a_type_annotation_or_be_followed_by_property_or_member_tags: new Message(
    8021,
    Category.Error,
    'Doc_typedef_tag_should_either_have_a_type_annotation_or_be_followed_by_property_or_member_tags_8021',
    "Doc '@typedef' tag should either have a type annotation or be followed by '@property' or '@member' tags."
  ),
  Doc_0_is_not_attached_to_a_class: new Message(8022, Category.Error, 'Doc_0_is_not_attached_to_a_class_8022', "Doc '@{0}' is not attached to a class."),
  Doc_0_1_does_not_match_the_extends_2_clause: new Message(8023, Category.Error, 'Doc_0_1_does_not_match_the_extends_2_clause_8023', "Doc '@{0} {1}' does not match the 'extends {2}' clause."),
  Doc_param_tag_has_name_0_but_there_is_no_parameter_with_that_name: new Message(
    8024,
    Category.Error,
    'Doc_param_tag_has_name_0_but_there_is_no_parameter_with_that_name_8024',
    "Doc '@param' tag has name '{0}', but there is no parameter with that name."
  ),
  Class_declarations_cannot_have_more_than_one_augments_or_extends_tag: new Message(
    8025,
    Category.Error,
    'Class_declarations_cannot_have_more_than_one_augments_or_extends_tag_8025',
    'Class declarations cannot have more than one `@augments` or `@extends` tag.'
  ),
  Expected_0_type_arguments_provide_these_with_an_extends_tag: new Message(
    8026,
    Category.Error,
    'Expected_0_type_arguments_provide_these_with_an_extends_tag_8026',
    "Expected {0} type arguments; provide these with an '@extends' tag."
  ),
  Expected_0_1_type_arguments_provide_these_with_an_extends_tag: new Message(
    8027,
    Category.Error,
    'Expected_0_1_type_arguments_provide_these_with_an_extends_tag_8027',
    "Expected {0}-{1} type arguments; provide these with an '@extends' tag."
  ),
  Doc_may_only_appear_in_the_last_parameter_of_a_signature: new Message(
    8028,
    Category.Error,
    'Doc_may_only_appear_in_the_last_parameter_of_a_signature_8028',
    "Doc '...' may only appear in the last parameter of a signature."
  ),
  Doc_param_tag_has_name_0_but_there_is_no_parameter_with_that_name_It_would_match_arguments_if_it_had_an_array_type: new Message(
    8029,
    Category.Error,
    'Doc_param_tag_has_name_0_but_there_is_no_parameter_with_that_name_It_would_match_arguments_if_it_h_8029',
    "Doc '@param' tag has name '{0}', but there is no parameter with that name. It would match 'arguments' if it had an array type."
  ),
  The_type_of_a_function_declaration_must_match_the_function_s_signature: new Message(
    8030,
    Category.Error,
    'The_type_of_a_function_declaration_must_match_the_function_s_signature_8030',
    "The type of a function declaration must match the function's signature."
  ),
  You_cannot_rename_a_module_via_a_global_import: new Message(8031, Category.Error, 'You_cannot_rename_a_module_via_a_global_import_8031', 'You cannot rename a module via a global import.'),
  Qualified_name_0_is_not_allowed_without_a_leading_param_object_1: new Message(
    8032,
    Category.Error,
    'Qualified_name_0_is_not_allowed_without_a_leading_param_object_1_8032',
    "Qualified name '{0}' is not allowed without a leading '@param {object} {1}'."
  ),
  A_Doc_typedef_comment_may_not_contain_multiple_type_tags: new Message(
    8033,
    Category.Error,
    'A_Doc_typedef_comment_may_not_contain_multiple_type_tags_8033',
    "A Doc '@typedef' comment may not contain multiple '@type' tags."
  ),
  The_tag_was_first_specified_here: new Message(8034, Category.Error, 'The_tag_was_first_specified_here_8034', 'The tag was first specified here.'),
  Only_identifiers_Slashqualified_names_with_optional_type_arguments_are_currently_supported_in_a_class_extends_clause: new Message(
    9002,
    Category.Error,
    'Only_identifiers_Slashqualified_names_with_optional_type_arguments_are_currently_supported_in_a_clas_9002',
    "Only identifiers/qualified-names with optional type arguments are currently supported in a class 'extends' clause."
  ),
  class_expressions_are_not_currently_supported: new Message(9003, Category.Error, 'class_expressions_are_not_currently_supported_9003', "'class' expressions are not currently supported."),
  Language_service_is_disabled: new Message(9004, Category.Error, 'Language_service_is_disabled_9004', 'Language service is disabled.'),
  Declaration_emit_for_this_file_requires_using_private_name_0_An_explicit_type_annotation_may_unblock_declaration_emit: new Message(
    9005,
    Category.Error,
    'Declaration_emit_for_this_file_requires_using_private_name_0_An_explicit_type_annotation_may_unblock_9005',
    "Declaration emit for this file requires using private name '{0}'. An explicit type annotation may unblock declaration emit."
  ),
  Declaration_emit_for_this_file_requires_using_private_name_0_from_module_1_An_explicit_type_annotation_may_unblock_declaration_emit: new Message(
    9006,
    Category.Error,
    'Declaration_emit_for_this_file_requires_using_private_name_0_from_module_1_An_explicit_type_annotati_9006',
    "Declaration emit for this file requires using private name '{0}' from module '{1}'. An explicit type annotation may unblock declaration emit."
  ),
  JSX_attributes_must_only_be_assigned_a_non_empty_expression: new Message(
    17000,
    Category.Error,
    'JSX_attributes_must_only_be_assigned_a_non_empty_expression_17000',
    "JSX attributes must only be assigned a non-empty 'expression'."
  ),
  JSX_elements_cannot_have_multiple_attributes_with_the_same_name: new Message(
    17001,
    Category.Error,
    'JSX_elements_cannot_have_multiple_attributes_with_the_same_name_17001',
    'JSX elements cannot have multiple attributes with the same name.'
  ),
  Expected_corresponding_JSX_closing_tag_for_0: new Message(17002, Category.Error, 'Expected_corresponding_JSX_closing_tag_for_0_17002', "Expected corresponding JSX closing tag for '{0}'."),
  JSX_attribute_expected: new Message(17003, Category.Error, 'JSX_attribute_expected_17003', 'JSX attribute expected.'),
  Cannot_use_JSX_unless_the_jsx_flag_is_provided: new Message(17004, Category.Error, 'Cannot_use_JSX_unless_the_jsx_flag_is_provided_17004', "Cannot use JSX unless the '--jsx' flag is provided."),
  A_constructor_cannot_contain_a_super_call_when_its_class_extends_null: new Message(
    17005,
    Category.Error,
    'A_constructor_cannot_contain_a_super_call_when_its_class_extends_null_17005',
    "A constructor cannot contain a 'super' call when its class extends 'null'."
  ),
  An_unary_expression_with_the_0_operator_is_not_allowed_in_the_left_hand_side_of_an_exponentiation_expression_Consider_enclosing_the_expression_in_parentheses: new Message(
    17006,
    Category.Error,
    'An_unary_expression_with_the_0_operator_is_not_allowed_in_the_left_hand_side_of_an_exponentiation_ex_17006',
    "An unary expression with the '{0}' operator is not allowed in the left-hand side of an exponentiation expression. Consider enclosing the expression in parentheses."
  ),
  A_type_assertion_expression_is_not_allowed_in_the_left_hand_side_of_an_exponentiation_expression_Consider_enclosing_the_expression_in_parentheses: new Message(
    17007,
    Category.Error,
    'A_type_assertion_expression_is_not_allowed_in_the_left_hand_side_of_an_exponentiation_expression_Con_17007',
    'A type assertion expression is not allowed in the left-hand side of an exponentiation expression. Consider enclosing the expression in parentheses.'
  ),
  JSX_element_0_has_no_corresponding_closing_tag: new Message(17008, Category.Error, 'JSX_element_0_has_no_corresponding_closing_tag_17008', "JSX element '{0}' has no corresponding closing tag."),
  super_must_be_called_before_accessing_this_in_the_constructor_of_a_derived_class: new Message(
    17009,
    Category.Error,
    'super_must_be_called_before_accessing_this_in_the_constructor_of_a_derived_class_17009',
    "'super' must be called before accessing 'this' in the constructor of a derived class."
  ),
  Unknown_type_acquisition_option_0: new Message(17010, Category.Error, 'Unknown_type_acquisition_option_0_17010', "Unknown type acquisition option '{0}'."),
  super_must_be_called_before_accessing_a_property_of_super_in_the_constructor_of_a_derived_class: new Message(
    17011,
    Category.Error,
    'super_must_be_called_before_accessing_a_property_of_super_in_the_constructor_of_a_derived_class_17011',
    "'super' must be called before accessing a property of 'super' in the constructor of a derived class."
  ),
  _0_is_not_a_valid_meta_property_for_keyword_1_Did_you_mean_2: new Message(
    17012,
    Category.Error,
    '_0_is_not_a_valid_meta_property_for_keyword_1_Did_you_mean_2_17012',
    "'{0}' is not a valid meta-property for keyword '{1}'. Did you mean '{2}'?"
  ),
  Meta_property_0_is_only_allowed_in_the_body_of_a_function_declaration_function_expression_or_constructor: new Message(
    17013,
    Category.Error,
    'Meta_property_0_is_only_allowed_in_the_body_of_a_function_declaration_function_expression_or_constru_17013',
    "Meta-property '{0}' is only allowed in the body of a function declaration, function expression, or constructor."
  ),
  JSX_fragment_has_no_corresponding_closing_tag: new Message(17014, Category.Error, 'JSX_fragment_has_no_corresponding_closing_tag_17014', 'JSX fragment has no corresponding closing tag.'),
  Expected_corresponding_closing_tag_for_JSX_fragment: new Message(
    17015,
    Category.Error,
    'Expected_corresponding_closing_tag_for_JSX_fragment_17015',
    'Expected corresponding closing tag for JSX fragment.'
  ),
  JSX_fragment_is_not_supported_when_using_jsxFactory: new Message(
    17016,
    Category.Error,
    'JSX_fragment_is_not_supported_when_using_jsxFactory_17016',
    'JSX fragment is not supported when using --jsxFactory'
  ),
  JSX_fragment_is_not_supported_when_using_an_inline_JSX_factory_pragma: new Message(
    17017,
    Category.Error,
    'JSX_fragment_is_not_supported_when_using_an_inline_JSX_factory_pragma_17017',
    'JSX fragment is not supported when using an inline JSX factory pragma'
  ),
  Unknown_type_acquisition_option_0_Did_you_mean_1: new Message(
    17018,
    Category.Error,
    'Unknown_type_acquisition_option_0_Did_you_mean_1_17018',
    "Unknown type acquisition option '{0}'. Did you mean '{1}'?"
  ),
  Circularity_detected_while_resolving_configuration_Colon_0: new Message(
    18000,
    Category.Error,
    'Circularity_detected_while_resolving_configuration_Colon_0_18000',
    'Circularity detected while resolving configuration: {0}'
  ),
  A_path_in_an_extends_option_must_be_relative_or_rooted_but_0_is_not: new Message(
    18001,
    Category.Error,
    'A_path_in_an_extends_option_must_be_relative_or_rooted_but_0_is_not_18001',
    "A path in an 'extends' option must be relative or rooted, but '{0}' is not."
  ),
  The_files_list_in_config_file_0_is_empty: new Message(18002, Category.Error, 'The_files_list_in_config_file_0_is_empty_18002', "The 'files' list in config file '{0}' is empty."),
  No_inputs_were_found_in_config_file_0_Specified_include_paths_were_1_and_exclude_paths_were_2: new Message(
    18003,
    Category.Error,
    'No_inputs_were_found_in_config_file_0_Specified_include_paths_were_1_and_exclude_paths_were_2_18003',
    "No inputs were found in config file '{0}'. Specified 'include' paths were '{1}' and 'exclude' paths were '{2}'."
  ),
  File_is_a_CommonJS_module_it_may_be_converted_to_an_ES6_module: new Message(
    80001,
    Category.Suggestion,
    'File_is_a_CommonJS_module_it_may_be_converted_to_an_ES6_module_80001',
    'File is a CommonJS module; it may be converted to an ES6 module.'
  ),
  This_constructor_function_may_be_converted_to_a_class_declaration: new Message(
    80002,
    Category.Suggestion,
    'This_constructor_function_may_be_converted_to_a_class_declaration_80002',
    'This constructor function may be converted to a class declaration.'
  ),
  Import_may_be_converted_to_a_default_import: new Message(80003, Category.Suggestion, 'Import_may_be_converted_to_a_default_import_80003', 'Import may be converted to a default import.'),
  Doc_types_may_be_moved_to_TypeScript_types: new Message(80004, Category.Suggestion, 'Doc_types_may_be_moved_to_TypeScript_types_80004', 'Doc types may be moved to TypeScript types.'),
  require_call_may_be_converted_to_an_import: new Message(80005, Category.Suggestion, 'require_call_may_be_converted_to_an_import_80005', "'require' call may be converted to an import."),
  This_may_be_converted_to_an_async_function: new Message(80006, Category.Suggestion, 'This_may_be_converted_to_an_async_function_80006', 'This may be converted to an async function.'),
  await_has_no_effect_on_the_type_of_this_expression: new Message(
    80007,
    Category.Suggestion,
    'await_has_no_effect_on_the_type_of_this_expression_80007',
    "'await' has no effect on the type of this expression."
  ),
  Numeric_literals_with_absolute_values_equal_to_2_53_or_greater_are_too_large_to_be_represented_accurately_as_integers: new Message(
    80008,
    Category.Suggestion,
    'Numeric_literals_with_absolute_values_equal_to_2_53_or_greater_are_too_large_to_be_represented_accur_80008',
    'Numeric literals with absolute values equal to 2^53 or greater are too large to be represented accurately as integers.'
  ),
  Add_missing_super_call: new Message(90001, Category.Message, 'Add_missing_super_call_90001', "Add missing 'super()' call"),
  Make_super_call_the_first_statement_in_the_constructor: new Message(
    90002,
    Category.Message,
    'Make_super_call_the_first_statement_in_the_constructor_90002',
    "Make 'super()' call the first statement in the constructor"
  ),
  Change_extends_to_implements: new Message(90003, Category.Message, 'Change_extends_to_implements_90003', "Change 'extends' to 'implements'"),
  Remove_unused_declaration_for_Colon_0: new Message(90004, Category.Message, 'Remove_unused_declaration_for_Colon_0_90004', "Remove unused declaration for: '{0}'"),
  Remove_import_from_0: new Message(90005, Category.Message, 'Remove_import_from_0_90005', "Remove import from '{0}'"),
  Implement_interface_0: new Message(90006, Category.Message, 'Implement_interface_0_90006', "Implement interface '{0}'"),
  Implement_inherited_abstract_class: new Message(90007, Category.Message, 'Implement_inherited_abstract_class_90007', 'Implement inherited abstract class'),
  Add_0_to_unresolved_variable: new Message(90008, Category.Message, 'Add_0_to_unresolved_variable_90008', "Add '{0}.' to unresolved variable"),
  Remove_destructuring: new Message(90009, Category.Message, 'Remove_destructuring_90009', 'Remove destructuring'),
  Remove_variable_statement: new Message(90010, Category.Message, 'Remove_variable_statement_90010', 'Remove variable statement'),
  Remove_template_tag: new Message(90011, Category.Message, 'Remove_template_tag_90011', 'Remove template tag'),
  Remove_type_parameters: new Message(90012, Category.Message, 'Remove_type_parameters_90012', 'Remove type parameters'),
  Import_0_from_module_1: new Message(90013, Category.Message, 'Import_0_from_module_1_90013', 'Import \'{0}\' from module "{1}"'),
  Change_0_to_1: new Message(90014, Category.Message, 'Change_0_to_1_90014', "Change '{0}' to '{1}'"),
  Add_0_to_existing_import_declaration_from_1: new Message(90015, Category.Message, 'Add_0_to_existing_import_declaration_from_1_90015', 'Add \'{0}\' to existing import declaration from "{1}"'),
  Declare_property_0: new Message(90016, Category.Message, 'Declare_property_0_90016', "Declare property '{0}'"),
  Add_index_signature_for_property_0: new Message(90017, Category.Message, 'Add_index_signature_for_property_0_90017', "Add index signature for property '{0}'"),
  Disable_checking_for_this_file: new Message(90018, Category.Message, 'Disable_checking_for_this_file_90018', 'Disable checking for this file'),
  Ignore_this_error_message: new Message(90019, Category.Message, 'Ignore_this_error_message_90019', 'Ignore this error message'),
  Initialize_property_0_in_the_constructor: new Message(90020, Category.Message, 'Initialize_property_0_in_the_constructor_90020', "Initialize property '{0}' in the constructor"),
  Initialize_static_property_0: new Message(90021, Category.Message, 'Initialize_static_property_0_90021', "Initialize static property '{0}'"),
  Change_spelling_to_0: new Message(90022, Category.Message, 'Change_spelling_to_0_90022', "Change spelling to '{0}'"),
  Declare_method_0: new Message(90023, Category.Message, 'Declare_method_0_90023', "Declare method '{0}'"),
  Declare_static_method_0: new Message(90024, Category.Message, 'Declare_static_method_0_90024', "Declare static method '{0}'"),
  Prefix_0_with_an_underscore: new Message(90025, Category.Message, 'Prefix_0_with_an_underscore_90025', "Prefix '{0}' with an underscore"),
  Rewrite_as_the_indexed_access_type_0: new Message(90026, Category.Message, 'Rewrite_as_the_indexed_access_type_0_90026', "Rewrite as the indexed access type '{0}'"),
  Declare_static_property_0: new Message(90027, Category.Message, 'Declare_static_property_0_90027', "Declare static property '{0}'"),
  Call_decorator_expression: new Message(90028, Category.Message, 'Call_decorator_expression_90028', 'Call decorator expression'),
  Add_async_modifier_to_containing_function: new Message(90029, Category.Message, 'Add_async_modifier_to_containing_function_90029', 'Add async modifier to containing function'),
  Replace_infer_0_with_unknown: new Message(90030, Category.Message, 'Replace_infer_0_with_unknown_90030', "Replace 'infer {0}' with 'unknown'"),
  Replace_all_unused_infer_with_unknown: new Message(90031, Category.Message, 'Replace_all_unused_infer_with_unknown_90031', "Replace all unused 'infer' with 'unknown'"),
  Import_default_0_from_module_1: new Message(90032, Category.Message, 'Import_default_0_from_module_1_90032', 'Import default \'{0}\' from module "{1}"'),
  Add_default_import_0_to_existing_import_declaration_from_1: new Message(
    90033,
    Category.Message,
    'Add_default_import_0_to_existing_import_declaration_from_1_90033',
    'Add default import \'{0}\' to existing import declaration from "{1}"'
  ),
  Add_parameter_name: new Message(90034, Category.Message, 'Add_parameter_name_90034', 'Add parameter name'),
  Declare_private_property_0: new Message(90035, Category.Message, 'Declare_private_property_0_90035', "Declare private property '{0}'"),
  Replace_0_with_Promise_1: new Message(90036, Category.Message, 'Replace_0_with_Promise_1_90036', "Replace '{0}' with 'Promise<{1}>'"),
  Fix_all_incorrect_return_type_of_an_async_functions: new Message(
    90037,
    Category.Message,
    'Fix_all_incorrect_return_type_of_an_async_functions_90037',
    'Fix all incorrect return type of an async functions'
  ),
  Declare_private_method_0: new Message(90038, Category.Message, 'Declare_private_method_0_90038', "Declare private method '{0}'"),
  Declare_a_private_field_named_0: new Message(90053, Category.Message, 'Declare_a_private_field_named_0_90053', "Declare a private field named '{0}'."),
  Convert_function_to_an_ES2015_class: new Message(95001, Category.Message, 'Convert_function_to_an_ES2015_class_95001', 'Convert function to an ES2015 class'),
  Convert_function_0_to_class: new Message(95002, Category.Message, 'Convert_function_0_to_class_95002', "Convert function '{0}' to class"),
  Extract_to_0_in_1: new Message(95004, Category.Message, 'Extract_to_0_in_1_95004', 'Extract to {0} in {1}'),
  Extract_function: new Message(95005, Category.Message, 'Extract_function_95005', 'Extract function'),
  Extract_constant: new Message(95006, Category.Message, 'Extract_constant_95006', 'Extract constant'),
  Extract_to_0_in_enclosing_scope: new Message(95007, Category.Message, 'Extract_to_0_in_enclosing_scope_95007', 'Extract to {0} in enclosing scope'),
  Extract_to_0_in_1_scope: new Message(95008, Category.Message, 'Extract_to_0_in_1_scope_95008', 'Extract to {0} in {1} scope'),
  Annotate_with_type_from_Doc: new Message(95009, Category.Message, 'Annotate_with_type_from_Doc_95009', 'Annotate with type from Doc'),
  Annotate_with_types_from_Doc: new Message(95010, Category.Message, 'Annotate_with_types_from_Doc_95010', 'Annotate with types from Doc'),
  Infer_type_of_0_from_usage: new Message(95011, Category.Message, 'Infer_type_of_0_from_usage_95011', "Infer type of '{0}' from usage"),
  Infer_parameter_types_from_usage: new Message(95012, Category.Message, 'Infer_parameter_types_from_usage_95012', 'Infer parameter types from usage'),
  Convert_to_default_import: new Message(95013, Category.Message, 'Convert_to_default_import_95013', 'Convert to default import'),
  Install_0: new Message(95014, Category.Message, 'Install_0_95014', "Install '{0}'"),
  Replace_import_with_0: new Message(95015, Category.Message, 'Replace_import_with_0_95015', "Replace import with '{0}'."),
  Use_synthetic_default_member: new Message(95016, Category.Message, 'Use_synthetic_default_member_95016', "Use synthetic 'default' member."),
  Convert_to_ES6_module: new Message(95017, Category.Message, 'Convert_to_ES6_module_95017', 'Convert to ES6 module'),
  Add_undefined_type_to_property_0: new Message(95018, Category.Message, 'Add_undefined_type_to_property_0_95018', "Add 'undefined' type to property '{0}'"),
  Add_initer_to_property_0: new Message(95019, Category.Message, 'Add_initer_to_property_0_95019', "Add initer to property '{0}'"),
  Add_definite_assignment_assertion_to_property_0: new Message(95020, Category.Message, 'Add_definite_assignment_assertion_to_property_0_95020', "Add definite assignment assertion to property '{0}'"),
  Add_all_missing_members: new Message(95022, Category.Message, 'Add_all_missing_members_95022', 'Add all missing members'),
  Infer_all_types_from_usage: new Message(95023, Category.Message, 'Infer_all_types_from_usage_95023', 'Infer all types from usage'),
  Delete_all_unused_declarations: new Message(95024, Category.Message, 'Delete_all_unused_declarations_95024', 'Delete all unused declarations'),
  Prefix_all_unused_declarations_with_where_possible: new Message(
    95025,
    Category.Message,
    'Prefix_all_unused_declarations_with_where_possible_95025',
    "Prefix all unused declarations with '_' where possible"
  ),
  Fix_all_detected_spelling_errors: new Message(95026, Category.Message, 'Fix_all_detected_spelling_errors_95026', 'Fix all detected spelling errors'),
  Add_initers_to_all_uninitialized_properties: new Message(95027, Category.Message, 'Add_initers_to_all_uninitialized_properties_95027', 'Add initers to all uninitialized properties'),
  Add_definite_assignment_assertions_to_all_uninitialized_properties: new Message(
    95028,
    Category.Message,
    'Add_definite_assignment_assertions_to_all_uninitialized_properties_95028',
    'Add definite assignment assertions to all uninitialized properties'
  ),
  Add_undefined_type_to_all_uninitialized_properties: new Message(
    95029,
    Category.Message,
    'Add_undefined_type_to_all_uninitialized_properties_95029',
    'Add undefined type to all uninitialized properties'
  ),
  Change_all_jsdoc_style_types_to_TypeScript: new Message(95030, Category.Message, 'Change_all_jsdoc_style_types_to_TypeScript_95030', 'Change all jsdoc-style types to TypeScript'),
  Change_all_jsdoc_style_types_to_TypeScript_and_add_undefined_to_nullable_types: new Message(
    95031,
    Category.Message,
    'Change_all_jsdoc_style_types_to_TypeScript_and_add_undefined_to_nullable_types_95031',
    "Change all jsdoc-style types to TypeScript (and add '| undefined' to nullable types)"
  ),
  Implement_all_unimplemented_interfaces: new Message(95032, Category.Message, 'Implement_all_unimplemented_interfaces_95032', 'Implement all unimplemented interfaces'),
  Install_all_missing_types_packages: new Message(95033, Category.Message, 'Install_all_missing_types_packages_95033', 'Install all missing types packages'),
  Rewrite_all_as_indexed_access_types: new Message(95034, Category.Message, 'Rewrite_all_as_indexed_access_types_95034', 'Rewrite all as indexed access types'),
  Convert_all_to_default_imports: new Message(95035, Category.Message, 'Convert_all_to_default_imports_95035', 'Convert all to default imports'),
  Make_all_super_calls_the_first_statement_in_their_constructor: new Message(
    95036,
    Category.Message,
    'Make_all_super_calls_the_first_statement_in_their_constructor_95036',
    "Make all 'super()' calls the first statement in their constructor"
  ),
  Add_qualifier_to_all_unresolved_variables_matching_a_member_name: new Message(
    95037,
    Category.Message,
    'Add_qualifier_to_all_unresolved_variables_matching_a_member_name_95037',
    'Add qualifier to all unresolved variables matching a member name'
  ),
  Change_all_extended_interfaces_to_implements: new Message(95038, Category.Message, 'Change_all_extended_interfaces_to_implements_95038', "Change all extended interfaces to 'implements'"),
  Add_all_missing_super_calls: new Message(95039, Category.Message, 'Add_all_missing_super_calls_95039', 'Add all missing super calls'),
  Implement_all_inherited_abstract_classes: new Message(95040, Category.Message, 'Implement_all_inherited_abstract_classes_95040', 'Implement all inherited abstract classes'),
  Add_all_missing_async_modifiers: new Message(95041, Category.Message, 'Add_all_missing_async_modifiers_95041', "Add all missing 'async' modifiers"),
  Add_ts_ignore_to_all_error_messages: new Message(95042, Category.Message, 'Add_ts_ignore_to_all_error_messages_95042', "Add '@ts-ignore' to all error messages"),
  Annotate_everything_with_types_from_Doc: new Message(95043, Category.Message, 'Annotate_everything_with_types_from_Doc_95043', 'Annotate everything with types from Doc'),
  Add_to_all_uncalled_decorators: new Message(95044, Category.Message, 'Add_to_all_uncalled_decorators_95044', "Add '()' to all uncalled decorators"),
  Convert_all_constructor_functions_to_classes: new Message(95045, Category.Message, 'Convert_all_constructor_functions_to_classes_95045', 'Convert all constructor functions to classes'),
  Generate_get_and_set_accessors: new Message(95046, Category.Message, 'Generate_get_and_set_accessors_95046', "Generate 'get' and 'set' accessors"),
  Convert_require_to_import: new Message(95047, Category.Message, 'Convert_require_to_import_95047', "Convert 'require' to 'import'"),
  Convert_all_require_to_import: new Message(95048, Category.Message, 'Convert_all_require_to_import_95048', "Convert all 'require' to 'import'"),
  Move_to_a_new_file: new Message(95049, Category.Message, 'Move_to_a_new_file_95049', 'Move to a new file'),
  Remove_unreachable_code: new Message(95050, Category.Message, 'Remove_unreachable_code_95050', 'Remove unreachable code'),
  Remove_all_unreachable_code: new Message(95051, Category.Message, 'Remove_all_unreachable_code_95051', 'Remove all unreachable code'),
  Add_missing_typeof: new Message(95052, Category.Message, 'Add_missing_typeof_95052', "Add missing 'typeof'"),
  Remove_unused_label: new Message(95053, Category.Message, 'Remove_unused_label_95053', 'Remove unused label'),
  Remove_all_unused_labels: new Message(95054, Category.Message, 'Remove_all_unused_labels_95054', 'Remove all unused labels'),
  Convert_0_to_mapped_object_type: new Message(95055, Category.Message, 'Convert_0_to_mapped_object_type_95055', "Convert '{0}' to mapped object type"),
  Convert_namespace_import_to_named_imports: new Message(95056, Category.Message, 'Convert_namespace_import_to_named_imports_95056', 'Convert namespace import to named imports'),
  Convert_named_imports_to_namespace_import: new Message(95057, Category.Message, 'Convert_named_imports_to_namespace_import_95057', 'Convert named imports to namespace import'),
  Add_or_remove_braces_in_an_arrow_function: new Message(95058, Category.Message, 'Add_or_remove_braces_in_an_arrow_function_95058', 'Add or remove braces in an arrow function'),
  Add_braces_to_arrow_function: new Message(95059, Category.Message, 'Add_braces_to_arrow_function_95059', 'Add braces to arrow function'),
  Remove_braces_from_arrow_function: new Message(95060, Category.Message, 'Remove_braces_from_arrow_function_95060', 'Remove braces from arrow function'),
  Convert_default_export_to_named_export: new Message(95061, Category.Message, 'Convert_default_export_to_named_export_95061', 'Convert default export to named export'),
  Convert_named_export_to_default_export: new Message(95062, Category.Message, 'Convert_named_export_to_default_export_95062', 'Convert named export to default export'),
  Add_missing_enum_member_0: new Message(95063, Category.Message, 'Add_missing_enum_member_0_95063', "Add missing enum member '{0}'"),
  Add_all_missing_imports: new Message(95064, Category.Message, 'Add_all_missing_imports_95064', 'Add all missing imports'),
  Convert_to_async_function: new Message(95065, Category.Message, 'Convert_to_async_function_95065', 'Convert to async function'),
  Convert_all_to_async_functions: new Message(95066, Category.Message, 'Convert_all_to_async_functions_95066', 'Convert all to async functions'),
  Add_missing_call_parentheses: new Message(95067, Category.Message, 'Add_missing_call_parentheses_95067', 'Add missing call parentheses'),
  Add_all_missing_call_parentheses: new Message(95068, Category.Message, 'Add_all_missing_call_parentheses_95068', 'Add all missing call parentheses'),
  Add_unknown_conversion_for_non_overlapping_types: new Message(
    95069,
    Category.Message,
    'Add_unknown_conversion_for_non_overlapping_types_95069',
    "Add 'unknown' conversion for non-overlapping types"
  ),
  Add_unknown_to_all_conversions_of_non_overlapping_types: new Message(
    95070,
    Category.Message,
    'Add_unknown_to_all_conversions_of_non_overlapping_types_95070',
    "Add 'unknown' to all conversions of non-overlapping types"
  ),
  Add_missing_new_operator_to_call: new Message(95071, Category.Message, 'Add_missing_new_operator_to_call_95071', "Add missing 'new' operator to call"),
  Add_missing_new_operator_to_all_calls: new Message(95072, Category.Message, 'Add_missing_new_operator_to_all_calls_95072', "Add missing 'new' operator to all calls"),
  Add_names_to_all_parameters_without_names: new Message(95073, Category.Message, 'Add_names_to_all_parameters_without_names_95073', 'Add names to all parameters without names'),
  Enable_the_experimentalDecorators_option_in_your_configuration_file: new Message(
    95074,
    Category.Message,
    'Enable_the_experimentalDecorators_option_in_your_configuration_file_95074',
    "Enable the 'experimentalDecorators' option in your configuration file"
  ),
  Convert_parameters_to_destructured_object: new Message(95075, Category.Message, 'Convert_parameters_to_destructured_object_95075', 'Convert parameters to destructured object'),
  Allow_accessing_UMD_globals_from_modules: new Message(95076, Category.Message, 'Allow_accessing_UMD_globals_from_modules_95076', 'Allow accessing UMD globals from modules.'),
  Extract_type: new Message(95077, Category.Message, 'Extract_type_95077', 'Extract type'),
  Extract_to_type_alias: new Message(95078, Category.Message, 'Extract_to_type_alias_95078', 'Extract to type alias'),
  Extract_to_typedef: new Message(95079, Category.Message, 'Extract_to_typedef_95079', 'Extract to typedef'),
  Infer_this_type_of_0_from_usage: new Message(95080, Category.Message, 'Infer_this_type_of_0_from_usage_95080', "Infer 'this' type of '{0}' from usage"),
  Add_const_to_unresolved_variable: new Message(95081, Category.Message, 'Add_const_to_unresolved_variable_95081', "Add 'const' to unresolved variable"),
  Add_const_to_all_unresolved_variables: new Message(95082, Category.Message, 'Add_const_to_all_unresolved_variables_95082', "Add 'const' to all unresolved variables"),
  Add_await: new Message(95083, Category.Message, 'Add_await_95083', "Add 'await'"),
  Add_await_to_initer_for_0: new Message(95084, Category.Message, 'Add_await_to_initer_for_0_95084', "Add 'await' to initer for '{0}'"),
  Fix_all_expressions_possibly_missing_await: new Message(95085, Category.Message, 'Fix_all_expressions_possibly_missing_await_95085', "Fix all expressions possibly missing 'await'"),
  Remove_unnecessary_await: new Message(95086, Category.Message, 'Remove_unnecessary_await_95086', "Remove unnecessary 'await'"),
  Remove_all_unnecessary_uses_of_await: new Message(95087, Category.Message, 'Remove_all_unnecessary_uses_of_await_95087', "Remove all unnecessary uses of 'await'"),
  Enable_the_jsx_flag_in_your_configuration_file: new Message(95088, Category.Message, 'Enable_the_jsx_flag_in_your_configuration_file_95088', "Enable the '--jsx' flag in your configuration file"),
  Add_await_to_initers: new Message(95089, Category.Message, 'Add_await_to_initers_95089', "Add 'await' to initers"),
  Extract_to_interface: new Message(95090, Category.Message, 'Extract_to_interface_95090', 'Extract to interface'),
  Convert_to_a_bigint_numeric_literal: new Message(95091, Category.Message, 'Convert_to_a_bigint_numeric_literal_95091', 'Convert to a bigint numeric literal'),
  Convert_all_to_bigint_numeric_literals: new Message(95092, Category.Message, 'Convert_all_to_bigint_numeric_literals_95092', 'Convert all to bigint numeric literals'),
  Convert_const_to_let: new Message(95093, Category.Message, 'Convert_const_to_let_95093', "Convert 'const' to 'let'"),
  Prefix_with_declare: new Message(95094, Category.Message, 'Prefix_with_declare_95094', "Prefix with 'declare'"),
  Prefix_all_incorrect_property_declarations_with_declare: new Message(
    95095,
    Category.Message,
    'Prefix_all_incorrect_property_declarations_with_declare_95095',
    "Prefix all incorrect property declarations with 'declare'"
  ),
  Convert_to_template_string: new Message(95096, Category.Message, 'Convert_to_template_string_95096', 'Convert to template string'),
  Add_export_to_make_this_file_into_a_module: new Message(95097, Category.Message, 'Add_export_to_make_this_file_into_a_module_95097', "Add 'export {}' to make this file into a module"),
  Set_the_target_option_in_your_configuration_file_to_0: new Message(
    95098,
    Category.Message,
    'Set_the_target_option_in_your_configuration_file_to_0_95098',
    "Set the 'target' option in your configuration file to '{0}'"
  ),
  Set_the_module_option_in_your_configuration_file_to_0: new Message(
    95099,
    Category.Message,
    'Set_the_module_option_in_your_configuration_file_to_0_95099',
    "Set the 'module' option in your configuration file to '{0}'"
  ),
  Convert_invalid_character_to_its_html_entity_code: new Message(
    95100,
    Category.Message,
    'Convert_invalid_character_to_its_html_entity_code_95100',
    'Convert invalid character to its html entity code'
  ),
  Convert_all_invalid_characters_to_HTML_entity_code: new Message(
    95101,
    Category.Message,
    'Convert_all_invalid_characters_to_HTML_entity_code_95101',
    'Convert all invalid characters to HTML entity code'
  ),
  Add_class_tag: new Message(95102, Category.Message, 'Add_class_tag_95102', "Add '@class' tag"),
  Add_this_tag: new Message(95103, Category.Message, 'Add_this_tag_95103', "Add '@this' tag"),
  Add_this_parameter: new Message(95104, Category.Message, 'Add_this_parameter_95104', "Add 'this' parameter."),
  Convert_function_expression_0_to_arrow_function: new Message(95105, Category.Message, 'Convert_function_expression_0_to_arrow_function_95105', "Convert function expression '{0}' to arrow function"),
  Convert_function_declaration_0_to_arrow_function: new Message(
    95106,
    Category.Message,
    'Convert_function_declaration_0_to_arrow_function_95106',
    "Convert function declaration '{0}' to arrow function"
  ),
  Fix_all_implicit_this_errors: new Message(95107, Category.Message, 'Fix_all_implicit_this_errors_95107', "Fix all implicit-'this' errors"),
  Wrap_invalid_character_in_an_expression_container: new Message(
    95108,
    Category.Message,
    'Wrap_invalid_character_in_an_expression_container_95108',
    'Wrap invalid character in an expression container'
  ),
  Wrap_all_invalid_characters_in_an_expression_container: new Message(
    95109,
    Category.Message,
    'Wrap_all_invalid_characters_in_an_expression_container_95109',
    'Wrap all invalid characters in an expression container'
  ),
  Visit_https_Colon_Slash_Slashaka_ms_Slashtsconfig_json_to_read_more_about_this_file: new Message(
    95110,
    Category.Message,
    'Visit_https_Colon_Slash_Slashaka_ms_Slashtsconfig_json_to_read_more_about_this_file_95110',
    'Visit https://aka.ms/tsconfig.json to read more about this file'
  ),
  Add_a_return_statement: new Message(95111, Category.Message, 'Add_a_return_statement_95111', 'Add a return statement'),
  Remove_braces_from_arrow_function_body: new Message(95112, Category.Message, 'Remove_braces_from_arrow_function_body_95112', 'Remove braces from arrow function body'),
  Wrap_the_following_body_with_parentheses_which_should_be_an_object_literal: new Message(
    95113,
    Category.Message,
    'Wrap_the_following_body_with_parentheses_which_should_be_an_object_literal_95113',
    'Wrap the following body with parentheses which should be an object literal'
  ),
  Add_all_missing_return_statement: new Message(95114, Category.Message, 'Add_all_missing_return_statement_95114', 'Add all missing return statement'),
  Remove_braces_from_all_arrow_function_bodies_with_relevant_issues: new Message(
    95115,
    Category.Message,
    'Remove_braces_from_all_arrow_function_bodies_with_relevant_issues_95115',
    'Remove braces from all arrow function bodies with relevant issues'
  ),
  Wrap_all_object_literal_with_parentheses: new Message(95116, Category.Message, 'Wrap_all_object_literal_with_parentheses_95116', 'Wrap all object literal with parentheses'),
  Move_labeled_tuple_element_modifiers_to_labels: new Message(95117, Category.Message, 'Move_labeled_tuple_element_modifiers_to_labels_95117', 'Move labeled tuple element modifiers to labels'),
  Convert_overload_list_to_single_signature: new Message(95118, Category.Message, 'Convert_overload_list_to_single_signature_95118', 'Convert overload list to single signature'),
  Generate_get_and_set_accessors_for_all_overriding_properties: new Message(
    95119,
    Category.Message,
    'Generate_get_and_set_accessors_for_all_overriding_properties_95119',
    "Generate 'get' and 'set' accessors for all overriding properties"
  ),
  No_value_exists_in_scope_for_the_shorthand_property_0_Either_declare_one_or_provide_an_initer: new Message(
    18004,
    Category.Error,
    'No_value_exists_in_scope_for_the_shorthand_property_0_Either_declare_one_or_provide_an_initer_18004',
    "No value exists in scope for the shorthand property '{0}'. Either declare one or provide an initer."
  ),
  Classes_may_not_have_a_field_named_constructor: new Message(18006, Category.Error, 'Classes_may_not_have_a_field_named_constructor_18006', "Classes may not have a field named 'constructor'."),
  JSX_expressions_may_not_use_the_comma_operator_Did_you_mean_to_write_an_array: new Message(
    18007,
    Category.Error,
    'JSX_expressions_may_not_use_the_comma_operator_Did_you_mean_to_write_an_array_18007',
    'JSX expressions may not use the comma operator. Did you mean to write an array?'
  ),
  Private_identifiers_cannot_be_used_as_parameters: new Message(18009, Category.Error, 'Private_identifiers_cannot_be_used_as_parameters_18009', 'Private identifiers cannot be used as parameters'),
  An_accessibility_modifier_cannot_be_used_with_a_private_identifier: new Message(
    18010,
    Category.Error,
    'An_accessibility_modifier_cannot_be_used_with_a_private_identifier_18010',
    'An accessibility modifier cannot be used with a private identifier.'
  ),
  The_operand_of_a_delete_operator_cannot_be_a_private_identifier: new Message(
    18011,
    Category.Error,
    'The_operand_of_a_delete_operator_cannot_be_a_private_identifier_18011',
    "The operand of a 'delete' operator cannot be a private identifier."
  ),
  constructor_is_a_reserved_word: new Message(18012, Category.Error, 'constructor_is_a_reserved_word_18012', "'#constructor' is a reserved word."),
  Property_0_is_not_accessible_outside_class_1_because_it_has_a_private_identifier: new Message(
    18013,
    Category.Error,
    'Property_0_is_not_accessible_outside_class_1_because_it_has_a_private_identifier_18013',
    "Property '{0}' is not accessible outside class '{1}' because it has a private identifier."
  ),
  The_property_0_cannot_be_accessed_on_type_1_within_this_class_because_it_is_shadowed_by_another_private_identifier_with_the_same_spelling: new Message(
    18014,
    Category.Error,
    'The_property_0_cannot_be_accessed_on_type_1_within_this_class_because_it_is_shadowed_by_another_priv_18014',
    "The property '{0}' cannot be accessed on type '{1}' within this class because it is shadowed by another private identifier with the same spelling."
  ),
  Property_0_in_type_1_refers_to_a_different_member_that_cannot_be_accessed_from_within_type_2: new Message(
    18015,
    Category.Error,
    'Property_0_in_type_1_refers_to_a_different_member_that_cannot_be_accessed_from_within_type_2_18015',
    "Property '{0}' in type '{1}' refers to a different member that cannot be accessed from within type '{2}'."
  ),
  Private_identifiers_are_not_allowed_outside_class_bodies: new Message(
    18016,
    Category.Error,
    'Private_identifiers_are_not_allowed_outside_class_bodies_18016',
    'Private identifiers are not allowed outside class bodies.'
  ),
  The_shadowing_declaration_of_0_is_defined_here: new Message(18017, Category.Error, 'The_shadowing_declaration_of_0_is_defined_here_18017', "The shadowing declaration of '{0}' is defined here"),
  The_declaration_of_0_that_you_probably_intended_to_use_is_defined_here: new Message(
    18018,
    Category.Error,
    'The_declaration_of_0_that_you_probably_intended_to_use_is_defined_here_18018',
    "The declaration of '{0}' that you probably intended to use is defined here"
  ),
  _0_modifier_cannot_be_used_with_a_private_identifier: new Message(
    18019,
    Category.Error,
    '_0_modifier_cannot_be_used_with_a_private_identifier_18019',
    "'{0}' modifier cannot be used with a private identifier"
  ),
  A_method_cannot_be_named_with_a_private_identifier: new Message(
    18022,
    Category.Error,
    'A_method_cannot_be_named_with_a_private_identifier_18022',
    'A method cannot be named with a private identifier.'
  ),
  An_accessor_cannot_be_named_with_a_private_identifier: new Message(
    18023,
    Category.Error,
    'An_accessor_cannot_be_named_with_a_private_identifier_18023',
    'An accessor cannot be named with a private identifier.'
  ),
  An_enum_member_cannot_be_named_with_a_private_identifier: new Message(
    18024,
    Category.Error,
    'An_enum_member_cannot_be_named_with_a_private_identifier_18024',
    'An enum member cannot be named with a private identifier.'
  ),
  can_only_be_used_at_the_start_of_a_file: new Message(18026, Category.Error, 'can_only_be_used_at_the_start_of_a_file_18026', "'#!' can only be used at the start of a file."),
  Compiler_reserves_name_0_when_emitting_private_identifier_downlevel: new Message(
    18027,
    Category.Error,
    'Compiler_reserves_name_0_when_emitting_private_identifier_downlevel_18027',
    "Compiler reserves name '{0}' when emitting private identifier downlevel."
  ),
  Private_identifiers_are_only_available_when_targeting_ECMAScript_2015_and_higher: new Message(
    18028,
    Category.Error,
    'Private_identifiers_are_only_available_when_targeting_ECMAScript_2015_and_higher_18028',
    'Private identifiers are only available when targeting ECMAScript 2015 and higher.'
  ),
  Private_identifiers_are_not_allowed_in_variable_declarations: new Message(
    18029,
    Category.Error,
    'Private_identifiers_are_not_allowed_in_variable_declarations_18029',
    'Private identifiers are not allowed in variable declarations.'
  ),
  An_optional_chain_cannot_contain_private_identifiers: new Message(
    18030,
    Category.Error,
    'An_optional_chain_cannot_contain_private_identifiers_18030',
    'An optional chain cannot contain private identifiers.'
  ),
  The_intersection_0_was_reduced_to_never_because_property_1_has_conflicting_types_in_some_constituents: new Message(
    18031,
    Category.Error,
    'The_intersection_0_was_reduced_to_never_because_property_1_has_conflicting_types_in_some_constituent_18031',
    "The intersection '{0}' was reduced to 'never' because property '{1}' has conflicting types in some constituents."
  ),
  The_intersection_0_was_reduced_to_never_because_property_1_exists_in_multiple_constituents_and_is_private_in_some: new Message(
    18032,
    Category.Error,
    'The_intersection_0_was_reduced_to_never_because_property_1_exists_in_multiple_constituents_and_is_pr_18032',
    "The intersection '{0}' was reduced to 'never' because property '{1}' exists in multiple constituents and is private in some."
  ),
  Only_numeric_enums_can_have_computed_members_but_this_expression_has_type_0_If_you_do_not_need_exhaustiveness_checks_consider_using_an_object_literal_instead: new Message(
    18033,
    Category.Error,
    'Only_numeric_enums_can_have_computed_members_but_this_expression_has_type_0_If_you_do_not_need_exhau_18033',
    "Only numeric enums can have computed members, but this expression has type '{0}'. If you do not need exhaustiveness checks, consider using an object literal instead."
  ),
};
