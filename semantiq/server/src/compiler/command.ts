import { Node } from './types';
import { qf } from './core';
import { Syntax } from './syntax';
import * as qc from './core';
import * as qd from './diags';
import * as qt from './types';
import * as qu from './utils';
import * as qy from './syntax';
export const compileOnSaveCommandLineOption: qt.CommandLineOption = { name: 'compileOnSave', type: 'boolean' };
const libEntries: [string, string][] = [
  ['es5', 'lib.es5.d.ts'],
  ['es6', 'lib.es2015.d.ts'],
  ['es2015', 'lib.es2015.d.ts'],
  ['es7', 'lib.es2016.d.ts'],
  ['es2016', 'lib.es2016.d.ts'],
  ['es2017', 'lib.es2017.d.ts'],
  ['es2018', 'lib.es2018.d.ts'],
  ['es2019', 'lib.es2019.d.ts'],
  ['es2020', 'lib.es2020.d.ts'],
  ['esnext', 'lib.esnext.d.ts'],
  ['dom', 'lib.dom.d.ts'],
  ['dom.iterable', 'lib.dom.iterable.d.ts'],
  ['webworker', 'lib.webworker.d.ts'],
  ['webworker.importscripts', 'lib.webworker.importscripts.d.ts'],
  ['scripthost', 'lib.scripthost.d.ts'],
  ['es2015.core', 'lib.es2015.core.d.ts'],
  ['es2015.collection', 'lib.es2015.collection.d.ts'],
  ['es2015.generator', 'lib.es2015.generator.d.ts'],
  ['es2015.iterable', 'lib.es2015.iterable.d.ts'],
  ['es2015.promise', 'lib.es2015.promise.d.ts'],
  ['es2015.proxy', 'lib.es2015.proxy.d.ts'],
  ['es2015.reflect', 'lib.es2015.reflect.d.ts'],
  ['es2015.symbol', 'lib.es2015.symbol.d.ts'],
  ['es2015.symbol.wellknown', 'lib.es2015.symbol.wellknown.d.ts'],
  ['es2016.array.include', 'lib.es2016.array.include.d.ts'],
  ['es2017.object', 'lib.es2017.object.d.ts'],
  ['es2017.sharedmemory', 'lib.es2017.sharedmemory.d.ts'],
  ['es2017.string', 'lib.es2017.string.d.ts'],
  ['es2017.intl', 'lib.es2017.intl.d.ts'],
  ['es2017.typedarrays', 'lib.es2017.typedarrays.d.ts'],
  ['es2018.asyncgenerator', 'lib.es2018.asyncgenerator.d.ts'],
  ['es2018.asynciterable', 'lib.es2018.asynciterable.d.ts'],
  ['es2018.intl', 'lib.es2018.intl.d.ts'],
  ['es2018.promise', 'lib.es2018.promise.d.ts'],
  ['es2018.regexp', 'lib.es2018.regexp.d.ts'],
  ['es2019.array', 'lib.es2019.array.d.ts'],
  ['es2019.object', 'lib.es2019.object.d.ts'],
  ['es2019.string', 'lib.es2019.string.d.ts'],
  ['es2019.symbol', 'lib.es2019.symbol.d.ts'],
  ['es2020.bigint', 'lib.es2020.bigint.d.ts'],
  ['es2020.promise', 'lib.es2020.promise.d.ts'],
  ['es2020.string', 'lib.es2020.string.d.ts'],
  ['es2020.symbol.wellknown', 'lib.es2020.symbol.wellknown.d.ts'],
  ['es2020.intl', 'lib.es2020.intl.d.ts'],
  ['esnext.array', 'lib.es2019.array.d.ts'],
  ['esnext.symbol', 'lib.es2019.symbol.d.ts'],
  ['esnext.asynciterable', 'lib.es2018.asynciterable.d.ts'],
  ['esnext.intl', 'lib.esnext.intl.d.ts'],
  ['esnext.bigint', 'lib.es2020.bigint.d.ts'],
  ['esnext.string', 'lib.esnext.string.d.ts'],
  ['esnext.promise', 'lib.esnext.promise.d.ts'],
];
export const libs = libEntries.map((entry) => entry[0]);
export const libMap = qu.createMap(libEntries);
export const optsForWatch: qt.CommandLineOption[] = [
  {
    name: 'watchFile',
    type: qu.createMap({
      fixedpollinginterval: qt.WatchFileKind.FixedPollingInterval,
      prioritypollinginterval: qt.WatchFileKind.PriorityPollingInterval,
      dynamicprioritypolling: qt.WatchFileKind.DynamicPriorityPolling,
      usefsevents: qt.WatchFileKind.UseFsEvents,
      usefseventsonparentdirectory: qt.WatchFileKind.UseFsEventsOnParentDirectory,
    }),
    category: qd.Advanced_Opts,
    description: qd.Specify_strategy_for_watching_file_Colon_FixedPollingInterval_default_PriorityPollingInterval_DynamicPriorityPolling_UseFsEvents_UseFsEventsOnParentDirectory,
  },
  {
    name: 'watchDirectory',
    type: qu.createMap({
      usefsevents: qt.WatchDirectoryKind.UseFsEvents,
      fixedpollinginterval: qt.WatchDirectoryKind.FixedPollingInterval,
      dynamicprioritypolling: qt.WatchDirectoryKind.DynamicPriorityPolling,
    }),
    category: qd.Advanced_Opts,
    description: qd.Specify_strategy_for_watching_directory_on_platforms_that_don_t_support_recursive_watching_natively_Colon_UseFsEvents_default_FixedPollingInterval_DynamicPriorityPolling,
  },
  {
    name: 'fallbackPolling',
    type: qu.createMap({
      fixedinterval: qt.PollingWatchKind.FixedInterval,
      priorityinterval: qt.PollingWatchKind.PriorityInterval,
      dynamicpriority: qt.PollingWatchKind.DynamicPriority,
    }),
    category: qd.Advanced_Opts,
    description: qd.Specify_strategy_for_creating_a_polling_watch_when_it_fails_to_create_using_file_system_events_Colon_FixedInterval_default_PriorityInterval_DynamicPriority,
  },
  {
    name: 'synchronousWatchDirectory',
    type: 'boolean',
    category: qd.Advanced_Opts,
    description: qd.Synchronously_call_callbacks_and_update_the_state_of_directory_watchers_on_platforms_that_don_t_support_recursive_watching_natively,
  },
];
export const commonOptsWithBuild: qt.CommandLineOption[] = [
  {
    name: 'help',
    shortName: 'h',
    type: 'boolean',
    showInSimplifiedHelpView: true,
    category: qd.Command_line_Opts,
    description: qd.Print_this_message,
  },
  {
    name: 'help',
    shortName: '?',
    type: 'boolean',
  },
  {
    name: 'watch',
    shortName: 'w',
    type: 'boolean',
    showInSimplifiedHelpView: true,
    category: qd.Command_line_Opts,
    description: qd.Watch_input_files,
  },
  {
    name: 'preserveWatchOutput',
    type: 'boolean',
    showInSimplifiedHelpView: false,
    category: qd.Command_line_Opts,
    description: qd.Whether_to_keep_outdated_console_output_in_watch_mode_instead_of_clearing_the_screen,
  },
  {
    name: 'listFiles',
    type: 'boolean',
    category: qd.Advanced_Opts,
    description: qd.Print_names_of_files_part_of_the_compilation,
  },
  {
    name: 'listEmittedFiles',
    type: 'boolean',
    category: qd.Advanced_Opts,
    description: qd.Print_names_of_generated_files_part_of_the_compilation,
  },
  {
    name: 'pretty',
    type: 'boolean',
    showInSimplifiedHelpView: true,
    category: qd.Command_line_Opts,
    description: qd.Stylize_errors_and_messages_using_color_and_context_experimental,
  },
  {
    name: 'traceResolution',
    type: 'boolean',
    category: qd.Advanced_Opts,
    description: qd.Enable_tracing_of_the_name_resolution_process,
  },
  {
    name: 'diagnostics',
    type: 'boolean',
    category: qd.Advanced_Opts,
    description: qd.Show_diagnostic_information,
  },
  {
    name: 'extendedDiagnostics',
    type: 'boolean',
    category: qd.Advanced_Opts,
    description: qd.Show_verbose_diagnostic_information,
  },
  {
    name: 'generateCpuProfile',
    type: 'string',
    isFilePath: true,
    paramType: qd.FILE_OR_DIRECTORY,
    category: qd.Advanced_Opts,
    description: qd.Generates_a_CPU_profile,
  },
  {
    name: 'incremental',
    shortName: 'i',
    type: 'boolean',
    category: qd.Basic_Opts,
    description: qd.Enable_incremental_compilation,
    transpileOptionValue: undefined,
  },
  {
    name: 'assumeChangesOnlyAffectDirectDependencies',
    type: 'boolean',
    affectsSemanticDiagnostics: true,
    affectsEmit: true,
    category: qd.Advanced_Opts,
    description: qd.Have_recompiles_in_incremental_and_watch_assume_that_changes_within_a_file_will_only_affect_files_directly_depending_on_it,
  },
  {
    name: 'locale',
    type: 'string',
    category: qd.Advanced_Opts,
    description: qd.The_locale_used_when_displaying_messages_to_the_user_e_g_en_us,
  },
];
export const optionDeclarations: qt.CommandLineOption[] = [
  ...commonOptsWithBuild,
  {
    name: 'all',
    type: 'boolean',
    showInSimplifiedHelpView: true,
    category: qd.Command_line_Opts,
    description: qd.Show_all_compiler_opts,
  },
  {
    name: 'version',
    shortName: 'v',
    type: 'boolean',
    showInSimplifiedHelpView: true,
    category: qd.Command_line_Opts,
    description: qd.Print_the_compiler_s_version,
  },
  {
    name: 'init',
    type: 'boolean',
    showInSimplifiedHelpView: true,
    category: qd.Command_line_Opts,
    description: qd.Initializes_a_TypeScript_project_and_creates_a_tsconfig_json_file,
  },
  {
    name: 'project',
    shortName: 'p',
    type: 'string',
    isFilePath: true,
    showInSimplifiedHelpView: true,
    category: qd.Command_line_Opts,
    paramType: qd.FILE_OR_DIRECTORY,
    description: qd.Compile_the_project_given_the_path_to_its_configuration_file_or_to_a_folder_with_a_tsconfig_json,
  },
  {
    name: 'build',
    type: 'boolean',
    shortName: 'b',
    showInSimplifiedHelpView: true,
    category: qd.Command_line_Opts,
    description: qd.Build_one_or_more_projects_and_their_dependencies_if_out_of_date,
  },
  {
    name: 'showConfig',
    type: 'boolean',
    category: qd.Command_line_Opts,
    isCommandLineOnly: true,
    description: qd.Print_the_final_configuration_instead_of_building,
  },
  {
    name: 'listFilesOnly',
    type: 'boolean',
    category: qd.Command_line_Opts,
    affectsSemanticDiagnostics: true,
    affectsEmit: true,
    isCommandLineOnly: true,
    description: qd.Print_names_of_files_that_are_part_of_the_compilation_and_then_stop_processing,
  },
  {
    name: 'target',
    shortName: 't',
    type: qu.createMap({
      es2020: qt.ScriptTarget.ES2020,
    }),
    affectsSourceFile: true,
    affectsModuleResolution: true,
    affectsEmit: true,
    paramType: qd.VERSION,
    showInSimplifiedHelpView: true,
    category: qd.Basic_Opts,
    description: qd.Specify_ECMAScript_target_version_Colon_ES3_default_ES5_ES2015_ES2016_ES2017_ES2018_ES2019_ES2020_or_ESNEXT,
  },
  {
    name: 'module',
    shortName: 'm',
    type: qu.createMap({
      none: ModuleKind.None,
      commonjs: ModuleKind.CommonJS,
      amd: ModuleKind.AMD,
      system: ModuleKind.System,
      umd: ModuleKind.UMD,
      es6: ModuleKind.ES2015,
      es2015: ModuleKind.ES2015,
      es2020: ModuleKind.ES2020,
      esnext: ModuleKind.ESNext,
    }),
    affectsModuleResolution: true,
    affectsEmit: true,
    paramType: qd.KIND,
    showInSimplifiedHelpView: true,
    category: qd.Basic_Opts,
    description: qd.Specify_module_code_generation_Colon_none_commonjs_amd_system_umd_es2015_es2020_or_ESNext,
  },
  {
    name: 'lib',
    type: 'list',
    elem: {
      name: 'lib',
      type: libMap,
    },
    affectsModuleResolution: true,
    showInSimplifiedHelpView: true,
    category: qd.Basic_Opts,
    description: qd.Specify_library_files_to_be_included_in_the_compilation,
    transpileOptionValue: undefined,
  },
  {
    name: 'allowJs',
    type: 'boolean',
    affectsModuleResolution: true,
    showInSimplifiedHelpView: true,
    category: qd.Basic_Opts,
    description: qd.Allow_javascript_files_to_be_compiled,
  },
  {
    name: 'checkJs',
    type: 'boolean',
    category: qd.Basic_Opts,
    description: qd.Report_errors_in_js_files,
  },
  {
    name: 'jsx',
    type: qu.createMap({
      preserve: qt.JsxEmit.Preserve,
      'react-native': qt.JsxEmit.ReactNative,
      react: qt.JsxEmit.React,
    }),
    affectsSourceFile: true,
    paramType: qd.KIND,
    showInSimplifiedHelpView: true,
    category: qd.Basic_Opts,
    description: qd.Specify_JSX_code_generation_Colon_preserve_react_native_or_react,
  },
  {
    name: 'declaration',
    shortName: 'd',
    type: 'boolean',
    affectsEmit: true,
    showInSimplifiedHelpView: true,
    category: qd.Basic_Opts,
    description: qd.Generates_corresponding_d_ts_file,
    transpileOptionValue: undefined,
  },
  {
    name: 'declarationMap',
    type: 'boolean',
    affectsEmit: true,
    showInSimplifiedHelpView: true,
    category: qd.Basic_Opts,
    description: qd.Generates_a_sourcemap_for_each_corresponding_d_ts_file,
    transpileOptionValue: undefined,
  },
  {
    name: 'emitDeclarationOnly',
    type: 'boolean',
    affectsEmit: true,
    category: qd.Advanced_Opts,
    description: qd.Only_emit_d_ts_declaration_files,
    transpileOptionValue: undefined,
  },
  {
    name: 'sourceMap',
    type: 'boolean',
    affectsEmit: true,
    showInSimplifiedHelpView: true,
    category: qd.Basic_Opts,
    description: qd.Generates_corresponding_map_file,
  },
  {
    name: 'outFile',
    type: 'string',
    affectsEmit: true,
    isFilePath: true,
    paramType: qd.FILE,
    showInSimplifiedHelpView: true,
    category: qd.Basic_Opts,
    description: qd.Concatenate_and_emit_output_to_single_file,
    transpileOptionValue: undefined,
  },
  {
    name: 'outDir',
    type: 'string',
    affectsEmit: true,
    isFilePath: true,
    paramType: qd.DIRECTORY,
    showInSimplifiedHelpView: true,
    category: qd.Basic_Opts,
    description: qd.Redirect_output_structure_to_the_directory,
  },
  {
    name: 'rootDir',
    type: 'string',
    affectsEmit: true,
    isFilePath: true,
    paramType: qd.LOCATION,
    category: qd.Basic_Opts,
    description: qd.Specify_the_root_directory_of_input_files_Use_to_control_the_output_directory_structure_with_outDir,
  },
  {
    name: 'composite',
    type: 'boolean',
    affectsEmit: true,
    isTSConfigOnly: true,
    category: qd.Basic_Opts,
    description: qd.Enable_project_compilation,
    transpileOptionValue: undefined,
  },
  {
    name: 'tsBuildInfoFile',
    type: 'string',
    affectsEmit: true,
    isFilePath: true,
    paramType: qd.FILE,
    category: qd.Basic_Opts,
    description: qd.Specify_file_to_store_incremental_compilation_information,
    transpileOptionValue: undefined,
  },
  {
    name: 'removeComments',
    type: 'boolean',
    affectsEmit: true,
    showInSimplifiedHelpView: true,
    category: qd.Basic_Opts,
    description: qd.Do_not_emit_comments_to_output,
  },
  {
    name: 'noEmit',
    type: 'boolean',
    affectsEmit: true,
    showInSimplifiedHelpView: true,
    category: qd.Basic_Opts,
    description: qd.Do_not_emit_outputs,
    transpileOptionValue: undefined,
  },
  {
    name: 'importHelpers',
    type: 'boolean',
    affectsEmit: true,
    category: qd.Basic_Opts,
    description: qd.Import_emit_helpers_from_tslib,
  },
  {
    name: 'importsNotUsedAsValues',
    type: qu.createMap({
      remove: qt.ImportsNotUsedAsValues.Remove,
      preserve: qt.ImportsNotUsedAsValues.Preserve,
      error: qt.ImportsNotUsedAsValues.Error,
    }),
    affectsEmit: true,
    affectsSemanticDiagnostics: true,
    category: qd.Advanced_Opts,
    description: qd.Specify_emit_Slashchecking_behavior_for_imports_that_are_only_used_for_types,
  },
  {
    name: 'downlevelIteration',
    type: 'boolean',
    affectsEmit: true,
    category: qd.Basic_Opts,
    description: qd.Provide_full_support_for_iterables_in_for_of_spread_and_destructuring_when_targeting_ES5_or_ES3,
  },
  {
    name: 'isolatedModules',
    type: 'boolean',
    category: qd.Basic_Opts,
    description: qd.Transpile_each_file_as_a_separate_module_similar_to_ts_transpileModule,
    transpileOptionValue: true,
  },
  {
    name: 'strict',
    type: 'boolean',
    showInSimplifiedHelpView: true,
    category: qd.Strict_Type_Checking_Opts,
    description: qd.Enable_all_strict_type_checking_opts,
  },
  {
    name: 'noImplicitAny',
    type: 'boolean',
    affectsSemanticDiagnostics: true,
    strictFlag: true,
    showInSimplifiedHelpView: true,
    category: qd.Strict_Type_Checking_Opts,
    description: qd.Raise_error_on_expressions_and_declarations_with_an_implied_any_type,
  },
  {
    name: 'strictNullChecks',
    type: 'boolean',
    affectsSemanticDiagnostics: true,
    strictFlag: true,
    showInSimplifiedHelpView: true,
    category: qd.Strict_Type_Checking_Opts,
    description: qd.Enable_strict_null_checks,
  },
  {
    name: 'strictFunctionTypes',
    type: 'boolean',
    affectsSemanticDiagnostics: true,
    strictFlag: true,
    showInSimplifiedHelpView: true,
    category: qd.Strict_Type_Checking_Opts,
    description: qd.Enable_strict_checking_of_function_types,
  },
  {
    name: 'strictBindCallApply',
    type: 'boolean',
    strictFlag: true,
    showInSimplifiedHelpView: true,
    category: qd.Strict_Type_Checking_Opts,
    description: qd.Enable_strict_bind_call_and_apply_methods_on_functions,
  },
  {
    name: 'strictPropertyInitialization',
    type: 'boolean',
    affectsSemanticDiagnostics: true,
    strictFlag: true,
    showInSimplifiedHelpView: true,
    category: qd.Strict_Type_Checking_Opts,
    description: qd.Enable_strict_checking_of_property_initialization_in_classes,
  },
  {
    name: 'noImplicitThis',
    type: 'boolean',
    affectsSemanticDiagnostics: true,
    strictFlag: true,
    showInSimplifiedHelpView: true,
    category: qd.Strict_Type_Checking_Opts,
    description: qd.Raise_error_on_this_expressions_with_an_implied_any_type,
  },
  {
    name: 'alwaysStrict',
    type: 'boolean',
    affectsSourceFile: true,
    strictFlag: true,
    showInSimplifiedHelpView: true,
    category: qd.Strict_Type_Checking_Opts,
    description: qd.Parse_in_strict_mode_and_emit_use_strict_for_each_source_file,
  },
  {
    name: 'noUnusedLocals',
    type: 'boolean',
    affectsSemanticDiagnostics: true,
    showInSimplifiedHelpView: true,
    category: qd.Additional_Checks,
    description: qd.Report_errors_on_unused_locals,
  },
  {
    name: 'noUnusedParams',
    type: 'boolean',
    affectsSemanticDiagnostics: true,
    showInSimplifiedHelpView: true,
    category: qd.Additional_Checks,
    description: qd.Report_errors_on_unused_params,
  },
  {
    name: 'noImplicitReturns',
    type: 'boolean',
    affectsSemanticDiagnostics: true,
    showInSimplifiedHelpView: true,
    category: qd.Additional_Checks,
    description: qd.Report_error_when_not_all_code_paths_in_function_return_a_value,
  },
  {
    name: 'noFallthroughCasesInSwitch',
    type: 'boolean',
    affectsBindDiagnostics: true,
    affectsSemanticDiagnostics: true,
    showInSimplifiedHelpView: true,
    category: qd.Additional_Checks,
    description: qd.Report_errors_for_fallthrough_cases_in_switch_statement,
  },
  {
    name: 'moduleResolution',
    type: qu.createMap({
      node: qt.ModuleResolutionKind.NodeJs,
      classic: qt.ModuleResolutionKind.Classic,
    }),
    affectsModuleResolution: true,
    paramType: qd.STRATEGY,
    category: qd.Module_Resolution_Opts,
    description: qd.Specify_module_resolution_strategy_Colon_node_Node_js_or_classic_TypeScript_pre_1_6,
  },
  {
    name: 'baseUrl',
    type: 'string',
    affectsModuleResolution: true,
    isFilePath: true,
    category: qd.Module_Resolution_Opts,
    description: qd.Base_directory_to_resolve_non_absolute_module_names,
  },
  {
    name: 'paths',
    type: 'object',
    affectsModuleResolution: true,
    isTSConfigOnly: true,
    category: qd.Module_Resolution_Opts,
    description: qd.A_series_of_entries_which_re_map_imports_to_lookup_locations_relative_to_the_baseUrl,
    transpileOptionValue: undefined,
  },
  {
    name: 'rootDirs',
    type: 'list',
    isTSConfigOnly: true,
    elem: {
      name: 'rootDirs',
      type: 'string',
      isFilePath: true,
    },
    affectsModuleResolution: true,
    category: qd.Module_Resolution_Opts,
    description: qd.List_of_root_folders_whose_combined_content_represents_the_structure_of_the_project_at_runtime,
    transpileOptionValue: undefined,
  },
  {
    name: 'typeRoots',
    type: 'list',
    elem: {
      name: 'typeRoots',
      type: 'string',
      isFilePath: true,
    },
    affectsModuleResolution: true,
    category: qd.Module_Resolution_Opts,
    description: qd.List_of_folders_to_include_type_definitions_from,
  },
  {
    name: 'types',
    type: 'list',
    elem: {
      name: 'types',
      type: 'string',
    },
    affectsModuleResolution: true,
    showInSimplifiedHelpView: true,
    category: qd.Module_Resolution_Opts,
    description: qd.Type_declaration_files_to_be_included_in_compilation,
    transpileOptionValue: undefined,
  },
  {
    name: 'allowSyntheticDefaultImports',
    type: 'boolean',
    affectsSemanticDiagnostics: true,
    category: qd.Module_Resolution_Opts,
    description: qd.Allow_default_imports_from_modules_with_no_default_export_This_does_not_affect_code_emit_just_typechecking,
  },
  {
    name: 'esModuleInterop',
    type: 'boolean',
    affectsSemanticDiagnostics: true,
    affectsEmit: true,
    showInSimplifiedHelpView: true,
    category: qd.Module_Resolution_Opts,
    description: qd.Enables_emit_interoperability_between_CommonJS_and_ES_Modules_via_creation_of_namespace_objects_for_all_imports_Implies_allowSyntheticDefaultImports,
  },
  {
    name: 'preserveSymlinks',
    type: 'boolean',
    category: qd.Module_Resolution_Opts,
    description: qd.Do_not_resolve_the_real_path_of_symlinks,
  },
  {
    name: 'allowUmdGlobalAccess',
    type: 'boolean',
    affectsSemanticDiagnostics: true,
    category: qd.Module_Resolution_Opts,
    description: qd.Allow_accessing_UMD_globals_from_modules,
  },
  {
    name: 'sourceRoot',
    type: 'string',
    affectsEmit: true,
    paramType: qd.LOCATION,
    category: qd.Source_Map_Opts,
    description: qd.Specify_the_location_where_debugger_should_locate_TypeScript_files_instead_of_source_locations,
  },
  {
    name: 'mapRoot',
    type: 'string',
    affectsEmit: true,
    paramType: qd.LOCATION,
    category: qd.Source_Map_Opts,
    description: qd.Specify_the_location_where_debugger_should_locate_map_files_instead_of_generated_locations,
  },
  {
    name: 'inlineSourceMap',
    type: 'boolean',
    affectsEmit: true,
    category: qd.Source_Map_Opts,
    description: qd.Emit_a_single_file_with_source_maps_instead_of_having_a_separate_file,
  },
  {
    name: 'inlineSources',
    type: 'boolean',
    affectsEmit: true,
    category: qd.Source_Map_Opts,
    description: qd.Emit_the_source_alongside_the_sourcemaps_within_a_single_file_requires_inlineSourceMap_or_sourceMap_to_be_set,
  },
  {
    name: 'experimentalDecorators',
    type: 'boolean',
    affectsSemanticDiagnostics: true,
    category: qd.Experimental_Opts,
    description: qd.Enables_experimental_support_for_ES7_decorators,
  },
  {
    name: 'emitDecoratorMetadata',
    type: 'boolean',
    affectsSemanticDiagnostics: true,
    affectsEmit: true,
    category: qd.Experimental_Opts,
    description: qd.Enables_experimental_support_for_emitting_type_metadata_for_decorators,
  },
  {
    name: 'jsxFactory',
    type: 'string',
    category: qd.Advanced_Opts,
    description: qd.Specify_the_JSX_factory_function_to_use_when_targeting_react_JSX_emit_e_g_React_createElem_or_h,
  },
  {
    name: 'resolveJsonModule',
    type: 'boolean',
    affectsModuleResolution: true,
    category: qd.Advanced_Opts,
    description: qd.Include_modules_imported_with_json_extension,
  },
  {
    name: 'out',
    type: 'string',
    affectsEmit: true,
    isFilePath: false,
    category: qd.Advanced_Opts,
    paramType: qd.FILE,
    description: qd.Deprecated_Use_outFile_instead_Concatenate_and_emit_output_to_single_file,
    transpileOptionValue: undefined,
  },
  {
    name: 'reactNamespace',
    type: 'string',
    affectsEmit: true,
    category: qd.Advanced_Opts,
    description: qd.Deprecated_Use_jsxFactory_instead_Specify_the_object_invoked_for_createElem_when_targeting_react_JSX_emit,
  },
  {
    name: 'skipDefaultLibCheck',
    type: 'boolean',
    category: qd.Advanced_Opts,
    description: qd.Deprecated_Use_skipLibCheck_instead_Skip_type_checking_of_default_library_declaration_files,
  },
  {
    name: 'charset',
    type: 'string',
    category: qd.Advanced_Opts,
    description: qd.The_character_set_of_the_input_files,
  },
  {
    name: 'emitBOM',
    type: 'boolean',
    affectsEmit: true,
    category: qd.Advanced_Opts,
    description: qd.Emit_a_UTF_8_Byte_Order_Mark_BOM_in_the_beginning_of_output_files,
  },
  {
    name: 'newLine',
    type: qu.createMap({
      crlf: qt.NewLineKind.CarriageReturnLineFeed,
      lf: qt.NewLineKind.LineFeed,
    }),
    affectsEmit: true,
    paramType: qd.NEWLINE,
    category: qd.Advanced_Opts,
    description: qd.Specify_the_end_of_line_sequence_to_be_used_when_emitting_files_Colon_CRLF_dos_or_LF_unix,
  },
  {
    name: 'noErrorTruncation',
    type: 'boolean',
    affectsSemanticDiagnostics: true,
    category: qd.Advanced_Opts,
    description: qd.Do_not_truncate_error_messages,
  },
  {
    name: 'noLib',
    type: 'boolean',
    affectsModuleResolution: true,
    category: qd.Advanced_Opts,
    description: qd.Do_not_include_the_default_library_file_lib_d_ts,
    transpileOptionValue: true,
  },
  {
    name: 'noResolve',
    type: 'boolean',
    affectsModuleResolution: true,
    category: qd.Advanced_Opts,
    description: qd.Do_not_add_triple_slash_references_or_imported_modules_to_the_list_of_compiled_files,
    transpileOptionValue: true,
  },
  {
    name: 'stripInternal',
    type: 'boolean',
    affectsEmit: true,
    category: qd.Advanced_Opts,
    description: qd.Do_not_emit_declarations_for_code_that_has_an_internal_annotation,
  },
  {
    name: 'disableSizeLimit',
    type: 'boolean',
    affectsSourceFile: true,
    category: qd.Advanced_Opts,
    description: qd.Disable_size_limitations_on_JavaScript_projects,
  },
  {
    name: 'disableSourceOfProjectReferenceRedirect',
    type: 'boolean',
    isTSConfigOnly: true,
    category: qd.Advanced_Opts,
    description: qd.Disable_use_of_source_files_instead_of_declaration_files_from_referenced_projects,
  },
  {
    name: 'disableSolutionSearching',
    type: 'boolean',
    isTSConfigOnly: true,
    category: qd.Advanced_Opts,
    description: qd.Disable_solution_searching_for_this_project,
  },
  {
    name: 'noImplicitUseStrict',
    type: 'boolean',
    affectsSemanticDiagnostics: true,
    category: qd.Advanced_Opts,
    description: qd.Do_not_emit_use_strict_directives_in_module_output,
  },
  {
    name: 'noEmitHelpers',
    type: 'boolean',
    affectsEmit: true,
    category: qd.Advanced_Opts,
    description: qd.Do_not_generate_custom_helper_functions_like_extends_in_compiled_output,
  },
  {
    name: 'noEmitOnError',
    type: 'boolean',
    affectsEmit: true,
    category: qd.Advanced_Opts,
    description: qd.Do_not_emit_outputs_if_any_errors_were_reported,
    transpileOptionValue: undefined,
  },
  {
    name: 'preserveConstEnums',
    type: 'boolean',
    affectsEmit: true,
    category: qd.Advanced_Opts,
    description: qd.Do_not_erase_const_enum_declarations_in_generated_code,
  },
  {
    name: 'declarationDir',
    type: 'string',
    affectsEmit: true,
    isFilePath: true,
    paramType: qd.DIRECTORY,
    category: qd.Advanced_Opts,
    description: qd.Output_directory_for_generated_declaration_files,
    transpileOptionValue: undefined,
  },
  {
    name: 'skipLibCheck',
    type: 'boolean',
    category: qd.Advanced_Opts,
    description: qd.Skip_type_checking_of_declaration_files,
  },
  {
    name: 'allowUnusedLabels',
    type: 'boolean',
    affectsBindDiagnostics: true,
    affectsSemanticDiagnostics: true,
    category: qd.Advanced_Opts,
    description: qd.Do_not_report_errors_on_unused_labels,
  },
  {
    name: 'allowUnreachableCode',
    type: 'boolean',
    affectsBindDiagnostics: true,
    affectsSemanticDiagnostics: true,
    category: qd.Advanced_Opts,
    description: qd.Do_not_report_errors_on_unreachable_code,
  },
  {
    name: 'suppressExcessPropertyErrors',
    type: 'boolean',
    affectsSemanticDiagnostics: true,
    category: qd.Advanced_Opts,
    description: qd.Suppress_excess_property_checks_for_object_literals,
  },
  {
    name: 'suppressImplicitAnyIndexErrors',
    type: 'boolean',
    affectsSemanticDiagnostics: true,
    category: qd.Advanced_Opts,
    description: qd.Suppress_noImplicitAny_errors_for_indexing_objects_lacking_index_signatures,
  },
  {
    name: 'forceConsistentCasingInFileNames',
    type: 'boolean',
    affectsModuleResolution: true,
    category: qd.Advanced_Opts,
    description: qd.Disallow_inconsistently_cased_references_to_the_same_file,
  },
  {
    name: 'maxNodeModuleJsDepth',
    type: 'number',
    affectsModuleResolution: true,
    category: qd.Advanced_Opts,
    description: qd.The_maximum_dependency_depth_to_search_under_node_modules_and_load_JavaScript_files,
  },
  {
    name: 'noStrictGenericChecks',
    type: 'boolean',
    affectsSemanticDiagnostics: true,
    category: qd.Advanced_Opts,
    description: qd.Disable_strict_checking_of_generic_signatures_in_function_types,
  },
  {
    name: 'useDefineForClassFields',
    type: 'boolean',
    affectsSemanticDiagnostics: true,
    affectsEmit: true,
    category: qd.Advanced_Opts,
    description: qd.Emit_class_fields_with_Define_instead_of_Set,
  },
  {
    name: 'keyofStringsOnly',
    type: 'boolean',
    category: qd.Advanced_Opts,
    description: qd.Resolve_keyof_to_string_valued_property_names_only_no_numbers_or_symbols,
  },
  {
    name: 'plugins',
    type: 'list',
    isTSConfigOnly: true,
    elem: {
      name: 'plugin',
      type: 'object',
    },
    description: qd.List_of_language_service_plugins,
  },
];
export const semanticDiagnosticsOptionDeclarations: readonly qt.CommandLineOption[] = optionDeclarations.filter((option) => !!option.affectsSemanticDiagnostics);
export const affectsEmitOptionDeclarations: readonly qt.CommandLineOption[] = optionDeclarations.filter((option) => !!option.affectsEmit);
export const moduleResolutionOptionDeclarations: readonly qt.CommandLineOption[] = optionDeclarations.filter((option) => !!option.affectsModuleResolution);
export const sourceFileAffectingCompilerOpts: readonly qt.CommandLineOption[] = optionDeclarations.filter(
  (option) => !!option.affectsSourceFile || !!option.affectsModuleResolution || !!option.affectsBindDiagnostics
);
export const transpileOptionValueCompilerOpts: readonly qt.CommandLineOption[] = optionDeclarations.filter((option) => hasProperty(option, 'transpileOptionValue'));
export const buildOpts: qt.CommandLineOption[] = [
  ...commonOptsWithBuild,
  {
    name: 'verbose',
    shortName: 'v',
    category: qd.Command_line_Opts,
    description: qd.Enable_verbose_logging,
    type: 'boolean',
  },
  {
    name: 'dry',
    shortName: 'd',
    category: qd.Command_line_Opts,
    description: qd.Show_what_would_be_built_or_deleted_if_specified_with_clean,
    type: 'boolean',
  },
  {
    name: 'force',
    shortName: 'f',
    category: qd.Command_line_Opts,
    description: qd.Build_all_projects_including_those_that_appear_to_be_up_to_date,
    type: 'boolean',
  },
  {
    name: 'clean',
    category: qd.Command_line_Opts,
    description: qd.Delete_the_outputs_of_all_projects,
    type: 'boolean',
  },
];
export const typeAcquisitionDeclarations: qt.CommandLineOption[] = [
  {
    name: 'enableAutoDiscovery',
    type: 'boolean',
  },
  {
    name: 'enable',
    type: 'boolean',
  },
  {
    name: 'include',
    type: 'list',
    elem: {
      name: 'include',
      type: 'string',
    },
  },
  {
    name: 'exclude',
    type: 'list',
    elem: {
      name: 'exclude',
      type: 'string',
    },
  },
];
export interface OptsNameMap {
  optsNameMap: qu.QMap<qt.CommandLineOption>;
  shortOptionNames: qu.QMap<string>;
}
export function createOptionNameMap(optionDeclarations: readonly qt.CommandLineOption[]): OptsNameMap {
  const optsNameMap = qu.createMap<qt.CommandLineOption>();
  const shortOptionNames = qu.createMap<string>();
  forEach(optionDeclarations, (option) => {
    optsNameMap.set(option.name.toLowerCase(), option);
    if (option.shortName) {
      shortOptionNames.set(option.shortName, option.name);
    }
  });
  return { optsNameMap, shortOptionNames };
}
let optsNameMapCache: OptsNameMap;
export function getOptsNameMap(): OptsNameMap {
  return optsNameMapCache || (optsNameMapCache = createOptionNameMap(optionDeclarations));
}
export const defaultInitCompilerOpts: qt.CompilerOpts = {
  module: ModuleKind.CommonJS,
  target: qt.ScriptTarget.ES2020,
  strict: true,
  esModuleInterop: true,
  forceConsistentCasingInFileNames: true,
  skipLibCheck: true,
};
export function convertEnableAutoDiscoveryToEnable(typeAcquisition: qt.TypeAcquisition): qt.TypeAcquisition {
  if (typeAcquisition && typeAcquisition.enableAutoDiscovery !== undefined && typeAcquisition.enable === undefined) {
    return {
      enable: typeAcquisition.enableAutoDiscovery,
      include: typeAcquisition.include || [],
      exclude: typeAcquisition.exclude || [],
    };
  }
  return typeAcquisition;
}
export function createCompilerDiagnosticForInvalidCustomType(opt: qt.CommandLineOptionOfCustomType): Diagnostic {
  return createDiagnosticForInvalidCustomType(opt, createCompilerDiagnostic);
}
function createDiagnosticForInvalidCustomType(opt: qt.CommandLineOptionOfCustomType, createDiagnostic: (message: qd.Message, arg0: string, arg1: string) => Diagnostic): Diagnostic {
  const namesOfType = arrayFrom(opt.type.keys())
    .map((key) => `'${key}'`)
    .join(', ');
  return createDiagnostic(qd.Arg_for_0_option_must_be_Colon_1, `--${opt.name}`, namesOfType);
}
export function parseCustomTypeOption(opt: qt.CommandLineOptionOfCustomType, value: string, errors: Push<Diagnostic>) {
  return convertJsonOptionOfCustomType(opt, trimString(value || ''), errors);
}
export function parseListTypeOption(opt: qt.CommandLineOptionOfListType, value = '', errors: Push<Diagnostic>): (string | number)[] | undefined {
  value = trimString(value);
  if (startsWith(value, '-')) {
    return;
  }
  if (value === '') return [];
  const values = value.split(',');
  switch (opt.elem.type) {
    case 'number':
      return map(values, parseInt);
    case 'string':
      return map(values, (v) => v || '');
    default:
      return mapDefined(values, (v) => parseCustomTypeOption(<qt.CommandLineOptionOfCustomType>opt.elem, v, errors));
  }
}
export interface OptsBase {
  [option: string]: qt.CompilerOptsValue | qt.TsConfigSourceFile | undefined;
}
export interface ParseCommandLineWorkerDiagnostics extends qt.DidYouMeanOptsDiagnostics {
  getOptsNameMap: () => OptsNameMap;
  optionTypeMismatchDiagnostic: qd.Message;
}
function getOptionName(option: qt.CommandLineOption) {
  return option.name;
}
export function changesAffectModuleResolution(oldOpts: qt.CompilerOpts, newOpts: qt.CompilerOpts): boolean {
  return oldOpts.configFilePath !== newOpts.configFilePath || optsHaveModuleResolutionChanges(oldOpts, newOpts);
}
export function optsHaveModuleResolutionChanges(oldOpts: qt.CompilerOpts, newOpts: qt.CompilerOpts) {
  return moduleResolutionOptionDeclarations.some((o) => !isJsonEqual(getCompilerOptionValue(oldOpts, o), getCompilerOptionValue(newOpts, o)));
}
function createUnknownOptionError(
  unknownOption: string,
  diagnostics: qt.DidYouMeanOptsDiagnostics,
  createDiagnostics: (message: qd.Message, arg0: string, arg1?: string) => Diagnostic,
  unknownOptionErrorText?: string
) {
  const possibleOption = getSpellingSuggestion(unknownOption, diagnostics.optionDeclarations, getOptionName);
  return possibleOption
    ? createDiagnostics(diagnostics.unknownDidYouMeanDiagnostic, unknownOptionErrorText || unknownOption, possibleOption.name)
    : createDiagnostics(diagnostics.unknownOptionDiagnostic, unknownOptionErrorText || unknownOption);
}
export function parseCommandLineWorker(diagnostics: ParseCommandLineWorkerDiagnostics, commandLine: readonly string[], readFile?: (path: string) => string | undefined) {
  const opts = {} as OptsBase;
  let watchOpts: qt.WatchOpts | undefined;
  const fileNames: string[] = [];
  const errors: Diagnostic[] = [];
  parseStrings(commandLine);
  return {
    opts,
    watchOpts,
    fileNames,
    errors,
  };
  function parseStrings(args: readonly string[]) {
    let i = 0;
    while (i < args.length) {
      const s = args[i];
      i++;
      if (s.charCodeAt(0) === Codes.at) {
        parseResponseFile(s.slice(1));
      } else if (s.charCodeAt(0) === Codes.minus) {
        const inputOptionName = s.slice(s.charCodeAt(1) === Codes.minus ? 2 : 1);
        const opt = getOptionDeclarationFromName(diagnostics.getOptsNameMap, inputOptionName, true);
        if (opt) {
          i = parseOptionValue(args, i, diagnostics, opt, opts, errors);
        } else {
          const watchOpt = getOptionDeclarationFromName(watchOptsDidYouMeanqd.getOptsNameMap, inputOptionName, true);
          if (watchOpt) {
            i = parseOptionValue(args, i, watchOptsDidYouMeanDiagnostics, watchOpt, watchOpts || (watchOpts = {}), errors);
          } else {
            errors.push(createUnknownOptionError(inputOptionName, diagnostics, createCompilerDiagnostic, s));
          }
        }
      } else {
        fileNames.push(s);
      }
    }
  }
  function parseResponseFile(fileName: string) {
    const text = tryReadFile(fileName, readFile || ((fileName) => sys.readFile(fileName)));
    if (!isString(text)) {
      errors.push(text);
      return;
    }
    const args: string[] = [];
    let pos = 0;
    while (true) {
      while (pos < text.length && text.charCodeAt(pos) <= Codes.space) pos++;
      if (pos >= text.length) break;
      const start = pos;
      if (text.charCodeAt(start) === Codes.doubleQuote) {
        pos++;
        while (pos < text.length && text.charCodeAt(pos) !== Codes.doubleQuote) pos++;
        if (pos < text.length) {
          args.push(text.substring(start + 1, pos));
          pos++;
        } else {
          errors.push(createCompilerDiagnostic(qd.Unterminated_quoted_string_in_response_file_0, fileName));
        }
      } else {
        while (text.charCodeAt(pos) > Codes.space) pos++;
        args.push(text.substring(start, pos));
      }
    }
    parseStrings(args);
  }
}
function parseOptionValue(args: readonly string[], i: number, diagnostics: ParseCommandLineWorkerDiagnostics, opt: qt.CommandLineOption, opts: OptsBase, errors: Diagnostic[]) {
  if (opt.isTSConfigOnly) {
    const optValue = args[i];
    if (optValue === 'null') {
      opts[opt.name] = undefined;
      i++;
    } else if (opt.type === 'boolean') {
      if (optValue === 'false') {
        opts[opt.name] = false;
        i++;
      } else {
        if (optValue === 'true') i++;
        errors.push(createCompilerDiagnostic(qd.Option_0_can_only_be_specified_in_tsconfig_json_file_or_set_to_false_or_null_on_command_line, opt.name));
      }
    } else {
      errors.push(createCompilerDiagnostic(qd.Option_0_can_only_be_specified_in_tsconfig_json_file_or_set_to_null_on_command_line, opt.name));
      if (optValue && !startsWith(optValue, '-')) i++;
    }
  } else {
    if (!args[i] && opt.type !== 'boolean') {
      errors.push(createCompilerDiagnostic(diagnostics.optionTypeMismatchDiagnostic, opt.name, getCompilerOptionValueTypeString(opt)));
    }
    if (args[i] !== 'null') {
      switch (opt.type) {
        case 'number':
          opts[opt.name] = parseInt(args[i]);
          i++;
          break;
        case 'boolean':
          const optValue = args[i];
          opts[opt.name] = optValue !== 'false';
          if (optValue === 'false' || optValue === 'true') {
            i++;
          }
          break;
        case 'string':
          opts[opt.name] = args[i] || '';
          i++;
          break;
        case 'list':
          const result = parseListTypeOption(opt, args[i], errors);
          opts[opt.name] = result || [];
          if (result) {
            i++;
          }
          break;
        default:
          opts[opt.name] = parseCustomTypeOption(<qt.CommandLineOptionOfCustomType>opt, args[i], errors);
          i++;
          break;
      }
    } else {
      opts[opt.name] = undefined;
      i++;
    }
  }
  return i;
}
export const compilerOptsDidYouMeanDiagnostics: ParseCommandLineWorkerDiagnostics = {
  getOptsNameMap,
  optionDeclarations,
  unknownOptionDiagnostic: qd.Unknown_compiler_option_0,
  unknownDidYouMeanDiagnostic: qd.Unknown_compiler_option_0_Did_you_mean_1,
  optionTypeMismatchDiagnostic: qd.Compiler_option_0_expects_an_arg,
};
export function parseCommandLine(commandLine: readonly string[], readFile?: (path: string) => string | undefined): qt.ParsedCommandLine {
  return parseCommandLineWorker(compilerOptsDidYouMeanDiagnostics, commandLine, readFile);
}
export function getOptionFromName(optionName: string, allowShort?: boolean): qt.CommandLineOption | undefined {
  return getOptionDeclarationFromName(getOptsNameMap, optionName, allowShort);
}
function getOptionDeclarationFromName(getOptionNameMap: () => OptsNameMap, optionName: string, allowShort = false): qt.CommandLineOption | undefined {
  optionName = optionName.toLowerCase();
  const { optsNameMap, shortOptionNames } = getOptionNameMap();
  if (allowShort) {
    const short = shortOptionNames.get(optionName);
    if (short !== undefined) {
      optionName = short;
    }
  }
  return optsNameMap.get(optionName);
}
export interface ParsedBuildCommand {
  buildOpts: BuildOpts;
  watchOpts: qt.WatchOpts | undefined;
  projects: string[];
  errors: Diagnostic[];
}
let buildOptsNameMapCache: OptsNameMap;
function getBuildOptsNameMap(): OptsNameMap {
  return buildOptsNameMapCache || (buildOptsNameMapCache = createOptionNameMap(buildOpts));
}
const buildOptsDidYouMeanDiagnostics: ParseCommandLineWorkerDiagnostics = {
  getOptsNameMap: getBuildOptsNameMap,
  optionDeclarations: buildOpts,
  unknownOptionDiagnostic: qd.Unknown_build_option_0,
  unknownDidYouMeanDiagnostic: qd.Unknown_build_option_0_Did_you_mean_1,
  optionTypeMismatchDiagnostic: qd.Build_option_0_requires_a_value_of_type_1,
};
export function parseBuildCommand(args: readonly string[]): ParsedBuildCommand {
  const { opts, watchOpts, fileNames: projects, errors } = parseCommandLineWorker(buildOptsDidYouMeanDiagnostics, args);
  const buildOpts = opts as BuildOpts;
  if (projects.length === 0) {
    projects.push('.');
  }
  if (buildOpts.clean && buildOpts.force) {
    errors.push(createCompilerDiagnostic(qd.Opts_0_and_1_cannot_be_combined, 'clean', 'force'));
  }
  if (buildOpts.clean && buildOpts.verbose) {
    errors.push(createCompilerDiagnostic(qd.Opts_0_and_1_cannot_be_combined, 'clean', 'verbose'));
  }
  if (buildOpts.clean && buildOpts.watch) {
    errors.push(createCompilerDiagnostic(qd.Opts_0_and_1_cannot_be_combined, 'clean', 'watch'));
  }
  if (buildOpts.watch && buildOpts.dry) {
    errors.push(createCompilerDiagnostic(qd.Opts_0_and_1_cannot_be_combined, 'watch', 'dry'));
  }
  return { buildOpts, watchOpts, projects, errors };
}
export function getDiagnosticText(_message: qd.Message, ...args: any[]): string {
  const diagnostic = createCompilerDiagnostic.apply(undefined, args);
  return <string>diagnostic.messageText;
}
export type DiagnosticReporter = (diagnostic: Diagnostic) => void;
export interface ConfigFileDiagnosticsReporter {
  onUnRecoverableConfigFileDiagnostic: DiagnosticReporter;
}
export interface ParseConfigFileHost extends qt.ParseConfigHost, ConfigFileDiagnosticsReporter {
  getCurrentDirectory(): string;
}
export function getParsedCommandLineOfConfigFile(
  configFileName: string,
  optsToExtend: qt.CompilerOpts,
  host: ParseConfigFileHost,
  extendedConfigCache?: qu.QMap<ExtendedConfigCacheEntry>,
  watchOptsToExtend?: qt.WatchOpts,
  extraFileExtensions?: readonly qt.FileExtensionInfo[]
): qt.ParsedCommandLine | undefined {
  const configFileText = tryReadFile(configFileName, (fileName) => host.readFile(fileName));
  if (!isString(configFileText)) {
    host.onUnRecoverableConfigFileDiagnostic(configFileText);
    return;
  }
  const result = qp_parseJsonText(configFileName, configFileText);
  const cwd = host.getCurrentDirectory();
  result.path = toPath(configFileName, cwd, createGetCanonicalFileName(host.useCaseSensitiveFileNames));
  result.resolvedPath = result.path;
  result.originalFileName = result.fileName;
  return parseJsonSourceFileConfigFileContent(
    result,
    host,
    getNormalizedAbsolutePath(getDirectoryPath(configFileName), cwd),
    optsToExtend,
    getNormalizedAbsolutePath(configFileName, cwd),
    undefined,
    extraFileExtensions,
    extendedConfigCache,
    watchOptsToExtend
  );
}
export function readConfigFile(fileName: string, readFile: (path: string) => string | undefined): { config?: any; error?: Diagnostic } {
  const textOrDiagnostic = tryReadFile(fileName, readFile);
  return isString(textOrDiagnostic) ? parseConfigFileTextToJson(fileName, textOrDiagnostic) : { config: {}, error: textOrDiagnostic };
}
export function parseConfigFileTextToJson(fileName: string, jsonText: string): { config?: any; error?: Diagnostic } {
  const jsonSourceFile = qp_parseJsonText(fileName, jsonText);
  return {
    config: convertToObject(jsonSourceFile, jsonSourceFile.parseDiagnostics),
    error: jsonSourceFile.parseqd.length ? jsonSourceFile.parseDiagnostics[0] : undefined,
  };
}
export function readJsonConfigFile(fileName: string, readFile: (path: string) => string | undefined): qt.TsConfigSourceFile {
  const textOrDiagnostic = tryReadFile(fileName, readFile);
  return isString(textOrDiagnostic) ? qp_parseJsonText(fileName, textOrDiagnostic) : <qt.TsConfigSourceFile>{ parseDiagnostics: [textOrDiagnostic] };
}
export function tryReadFile(fileName: string, readFile: (path: string) => string | undefined): string | Diagnostic {
  let text: string | undefined;
  try {
    text = readFile(fileName);
  } catch (e) {
    return createCompilerDiagnostic(qd.Cannot_read_file_0_Colon_1, fileName, e.message);
  }
  return text === undefined ? createCompilerDiagnostic(qd.Cannot_read_file_0, fileName) : text;
}
function commandLineOptsToMap(opts: readonly qt.CommandLineOption[]) {
  return arrayToMap(opts, getOptionName);
}
const typeAcquisitionDidYouMeanDiagnostics: qt.DidYouMeanOptsDiagnostics = {
  optionDeclarations: typeAcquisitionDeclarations,
  unknownOptionDiagnostic: qd.Unknown_type_acquisition_option_0,
  unknownDidYouMeanDiagnostic: qd.Unknown_type_acquisition_option_0_Did_you_mean_1,
};
let watchOptsNameMapCache: OptsNameMap;
function getWatchOptsNameMap(): OptsNameMap {
  return watchOptsNameMapCache || (watchOptsNameMapCache = createOptionNameMap(optsForWatch));
}
const watchOptsDidYouMeanDiagnostics: ParseCommandLineWorkerDiagnostics = {
  getOptsNameMap: getWatchOptsNameMap,
  optionDeclarations: optsForWatch,
  unknownOptionDiagnostic: qd.Unknown_watch_option_0,
  unknownDidYouMeanDiagnostic: qd.Unknown_watch_option_0_Did_you_mean_1,
  optionTypeMismatchDiagnostic: qd.Watch_option_0_requires_a_value_of_type_1,
};
let commandLineCompilerOptsMapCache: qu.QMap<qt.CommandLineOption>;
function getCommandLineCompilerOptsMap() {
  return commandLineCompilerOptsMapCache || (commandLineCompilerOptsMapCache = commandLineOptsToMap(optionDeclarations));
}
let commandLineWatchOptsMapCache: qu.QMap<qt.CommandLineOption>;
function getCommandLineWatchOptsMap() {
  return commandLineWatchOptsMapCache || (commandLineWatchOptsMapCache = commandLineOptsToMap(optsForWatch));
}
let commandLineTypeAcquisitionMapCache: qu.QMap<qt.CommandLineOption>;
function getCommandLineTypeAcquisitionMap() {
  return commandLineTypeAcquisitionMapCache || (commandLineTypeAcquisitionMapCache = commandLineOptsToMap(typeAcquisitionDeclarations));
}
let _tsconfigRootOpts: qt.TsConfigOnlyOption;
function getTsconfigRootOptsMap() {
  if (_tsconfigRootOpts === undefined) {
    _tsconfigRootOpts = {
      name: undefined!,
      type: 'object',
      elemOpts: commandLineOptsToMap([
        {
          name: 'compilerOpts',
          type: 'object',
          elemOpts: getCommandLineCompilerOptsMap(),
          extraKeyDiagnostics: compilerOptsDidYouMeanDiagnostics,
        },
        {
          name: 'watchOpts',
          type: 'object',
          elemOpts: getCommandLineWatchOptsMap(),
          extraKeyDiagnostics: watchOptsDidYouMeanDiagnostics,
        },
        {
          name: 'typingOpts',
          type: 'object',
          elemOpts: getCommandLineTypeAcquisitionMap(),
          extraKeyDiagnostics: typeAcquisitionDidYouMeanDiagnostics,
        },
        {
          name: 'typeAcquisition',
          type: 'object',
          elemOpts: getCommandLineTypeAcquisitionMap(),
          extraKeyDiagnostics: typeAcquisitionDidYouMeanDiagnostics,
        },
        {
          name: 'extends',
          type: 'string',
        },
        {
          name: 'references',
          type: 'list',
          elem: {
            name: 'references',
            type: 'object',
          },
        },
        {
          name: 'files',
          type: 'list',
          elem: {
            name: 'files',
            type: 'string',
          },
        },
        {
          name: 'include',
          type: 'list',
          elem: {
            name: 'include',
            type: 'string',
          },
        },
        {
          name: 'exclude',
          type: 'list',
          elem: {
            name: 'exclude',
            type: 'string',
          },
        },
        compileOnSaveCommandLineOption,
      ]),
    };
  }
  return _tsconfigRootOpts;
}
interface JsonConversionNotifier {
  onSetValidOptionKeyValueInParent(parentOption: string, option: qt.CommandLineOption, value: qt.CompilerOptsValue): void;
  onSetValidOptionKeyValueInRoot(key: string, keyNode: qt.PropertyName, value: qt.CompilerOptsValue, valueNode: qt.Expression): void;
  onSetUnknownOptionKeyValueInRoot(key: string, keyNode: qt.PropertyName, value: qt.CompilerOptsValue, valueNode: qt.Expression): void;
}
export function convertToObject(sourceFile: qt.JsonSourceFile, errors: Push<Diagnostic>): any {
  return convertToObjectWorker(sourceFile, errors, undefined);
}
export function convertToObjectWorker(
  sourceFile: qt.JsonSourceFile,
  errors: Push<Diagnostic>,
  returnValue: boolean,
  knownRootOpts: qt.CommandLineOption | undefined,
  jsonConversionNotifier: JsonConversionNotifier | undefined
): any {
  if (!sourceFile.statements.length) return returnValue ? {} : undefined;
  return convertPropertyValueToJson(sourceFile.statements[0].expression, knownRootOpts);
  function isRootOptionMap(knownOpts: qu.QMap<qt.CommandLineOption> | undefined) {
    return knownRootOpts && (knownRootOpts as qt.TsConfigOnlyOption).elemOpts === knownOpts;
  }
  function convertObjectLiteralExpressionToJson(
    node: qt.ObjectLiteralExpression,
    knownOpts: qu.QMap<qt.CommandLineOption> | undefined,
    extraKeyDiagnostics: qt.DidYouMeanOptsDiagnostics | undefined,
    parentOption: string | undefined
  ): any {
    const result: any = returnValue ? {} : undefined;
    for (const elem of node.properties) {
      if (elem.kind !== Syntax.PropertyAssignment) {
        errors.push(qf.create.diagnosticForNodeInSourceFile(sourceFile, elem, qd.Property_assignment_expected));
        continue;
      }
      if (elem.questionToken) {
        errors.push(qf.create.diagnosticForNodeInSourceFile(sourceFile, elem.questionToken, qd.The_0_modifier_can_only_be_used_in_TypeScript_files, '?'));
      }
      if (!isDoubleQuotedString(elem.name)) {
        errors.push(qf.create.diagnosticForNodeInSourceFile(sourceFile, elem.name, qd.String_literal_with_double_quotes_expected));
      }
      const textOfKey = qf.is.computedNonLiteralName(elem.name) ? undefined : qf.get.textOfPropertyName(elem.name);
      const keyText = textOfKey && qy.get.unescUnderscores(textOfKey);
      const option = keyText && knownOpts ? knownOpts.get(keyText) : undefined;
      if (keyText && extraKeyDiagnostics && !option) {
        if (knownOpts) {
          errors.push(createUnknownOptionError(keyText, extraKeyDiagnostics, (message, arg0, arg1) => qf.create.diagnosticForNodeInSourceFile(sourceFile, elem.name, message, arg0, arg1)));
        } else {
          errors.push(qf.create.diagnosticForNodeInSourceFile(sourceFile, elem.name, extraKeyqd.unknownOptionDiagnostic, keyText));
        }
      }
      const value = convertPropertyValueToJson(elem.initer, option);
      if (typeof keyText !== 'undefined') {
        if (returnValue) {
          result[keyText] = value;
        }
        if (jsonConversionNotifier && (parentOption || isRootOptionMap(knownOpts))) {
          const isValidOptionValue = isCompilerOptsValue(option, value);
          if (parentOption) {
            if (isValidOptionValue) {
              jsonConversionNotifier.onSetValidOptionKeyValueInParent(parentOption, option!, value);
            }
          } else if (isRootOptionMap(knownOpts)) {
            if (isValidOptionValue) {
              jsonConversionNotifier.onSetValidOptionKeyValueInRoot(keyText, elem.name, value, elem.initer);
            } else if (!option) {
              jsonConversionNotifier.onSetUnknownOptionKeyValueInRoot(keyText, elem.name, value, elem.initer);
            }
          }
        }
      }
    }
    return result;
  }
  function convertArrayLiteralExpressionToJson(elems: Nodes<qt.Expression>, elemOption: qt.CommandLineOption | undefined): any[] | void {
    if (!returnValue) return elems.forEach((elem) => convertPropertyValueToJson(elem, elemOption));
    return filter(
      elems.map((elem) => convertPropertyValueToJson(elem, elemOption)),
      (v) => v !== undefined
    );
  }
  function convertPropertyValueToJson(valueExpression: qt.Expression, option: qt.CommandLineOption | undefined): any {
    switch (valueExpression.kind) {
      case Syntax.TrueKeyword:
        reportInvalidOptionValue(option && option.type !== 'boolean');
        return true;
      case Syntax.FalseKeyword:
        reportInvalidOptionValue(option && option.type !== 'boolean');
        return false;
      case Syntax.NullKeyword:
        reportInvalidOptionValue(option && option.name === 'extends');
        return null;
      case Syntax.StringLiteral:
        if (!isDoubleQuotedString(valueExpression)) {
          errors.push(qf.create.diagnosticForNodeInSourceFile(sourceFile, valueExpression, qd.String_literal_with_double_quotes_expected));
        }
        reportInvalidOptionValue(option && isString(option.type) && option.type !== 'string');
        const text = (<qt.StringLiteral>valueExpression).text;
        if (option && !isString(option.type)) {
          const customOption = <qt.CommandLineOptionOfCustomType>option;
          if (!customOption.type.has(text.toLowerCase())) {
            errors.push(createDiagnosticForInvalidCustomType(customOption, (message, arg0, arg1) => qf.create.diagnosticForNodeInSourceFile(sourceFile, valueExpression, message, arg0, arg1)));
          }
        }
        return text;
      case Syntax.NumericLiteral:
        reportInvalidOptionValue(option && option.type !== 'number');
        return Number((<qt.NumericLiteral>valueExpression).text);
      case Syntax.PrefixUnaryExpression:
        if ((<qt.PrefixUnaryExpression>valueExpression).operator !== Syntax.MinusToken || (<qt.PrefixUnaryExpression>valueExpression).operand.kind !== Syntax.NumericLiteral) {
          break;
        }
        reportInvalidOptionValue(option && option.type !== 'number');
        return -Number((<qt.NumericLiteral>(<qt.PrefixUnaryExpression>valueExpression).operand).text);
      case Syntax.ObjectLiteralExpression:
        reportInvalidOptionValue(option && option.type !== 'object');
        const objectLiteralExpression = <qt.ObjectLiteralExpression>valueExpression;
        if (option) {
          const { elemOpts, extraKeyDiagnostics, name: optionName } = <qt.TsConfigOnlyOption>option;
          return convertObjectLiteralExpressionToJson(objectLiteralExpression, elemOpts, extraKeyDiagnostics, optionName);
        } else {
          return convertObjectLiteralExpressionToJson(objectLiteralExpression, undefined);
        }
      case Syntax.ArrayLiteralExpression:
        reportInvalidOptionValue(option && option.type !== 'list');
        return convertArrayLiteralExpressionToJson((<qt.ArrayLiteralExpression>valueExpression).elems, option && (<qt.CommandLineOptionOfListType>option).elem);
    }
    if (option) {
      reportInvalidOptionValue(true);
    } else {
      errors.push(qf.create.diagnosticForNodeInSourceFile(sourceFile, valueExpression, qd.Property_value_can_only_be_string_literal_numeric_literal_true_false_null_object_literal_or_array_literal));
    }
    return;
    function reportInvalidOptionValue(isError: boolean | undefined) {
      if (isError) {
        errors.push(qf.create.diagnosticForNodeInSourceFile(sourceFile, valueExpression, qd.Compiler_option_0_requires_a_value_of_type_1, option!.name, getCompilerOptionValueTypeString(option!)));
      }
    }
  }
  function isDoubleQuotedString(node: Node): boolean {
    return node.kind === Syntax.StringLiteral && isStringDoubleQuoted(node, sourceFile);
  }
}
function getCompilerOptionValueTypeString(option: qt.CommandLineOption) {
  return option.type === 'list' ? 'Array' : isString(option.type) ? option.type : 'string';
}
function isCompilerOptsValue(option: qt.CommandLineOption | undefined, value: any): value is qt.CompilerOptsValue {
  if (option) {
    if (isNullOrUndefined(value)) return true;
    if (option.type === 'list') return isArray(value);
    const expectedType = isString(option.type) ? option.type : 'string';
    return typeof value === expectedType;
  }
  return false;
}
export interface TSConfig {
  compilerOpts: qt.CompilerOpts;
  compileOnSave: boolean | undefined;
  exclude?: readonly string[];
  files: readonly string[] | undefined;
  include?: readonly string[];
  references: readonly qt.ProjectReference[] | undefined;
}
export interface ConvertToTSConfigHost {
  getCurrentDirectory(): string;
  useCaseSensitiveFileNames: boolean;
}
export function convertToTSConfig(configParseResult: qt.ParsedCommandLine, configFileName: string, host: ConvertToTSConfigHost): TSConfig {
  const getCanonicalFileName = createGetCanonicalFileName(host.useCaseSensitiveFileNames);
  const files = map(
    filter(
      configParseResult.fileNames,
      !configParseResult.configFileSpecs || !configParseResult.configFileSpecs.validatedIncludeSpecs
        ? (_) => true
        : matchesSpecs(configFileName, configParseResult.configFileSpecs.validatedIncludeSpecs, configParseResult.configFileSpecs.validatedExcludeSpecs, host)
    ),
    (f) => getRelativePathFromFile(getNormalizedAbsolutePath(configFileName, host.getCurrentDirectory()), getNormalizedAbsolutePath(f, host.getCurrentDirectory()), getCanonicalFileName)
  );
  const optionMap = serializeCompilerOpts(configParseResult.opts, {
    configFilePath: getNormalizedAbsolutePath(configFileName, host.getCurrentDirectory()),
    useCaseSensitiveFileNames: host.useCaseSensitiveFileNames,
  });
  const watchOptionMap = configParseResult.watchOpts && serializeWatchOpts(configParseResult.watchOpts);
  const config = {
    compilerOpts: {
      ...optionMapToObject(optionMap),
      showConfig: undefined,
      configFile: undefined,
      configFilePath: undefined,
      help: undefined,
      init: undefined,
      listFiles: undefined,
      listEmittedFiles: undefined,
      project: undefined,
      build: undefined,
      version: undefined,
    },
    watchOpts: watchOptionMap && optionMapToObject(watchOptionMap),
    references: map(configParseResult.projectReferences, (r) => ({ ...r, path: r.originalPath ? r.originalPath : '', originalPath: undefined })),
    files: length(files) ? files : undefined,
    ...(configParseResult.configFileSpecs
      ? {
          include: filterSameAsDefaultInclude(configParseResult.configFileSpecs.validatedIncludeSpecs),
          exclude: configParseResult.configFileSpecs.validatedExcludeSpecs,
        }
      : {}),
    compileOnSave: !!configParseResult.compileOnSave ? true : undefined,
  };
  return config;
}
function optionMapToObject(optionMap: qu.QMap<qt.CompilerOptsValue>): object {
  return {
    ...arrayFrom(optionMap.entries()).reduce((prev, cur) => ({ ...prev, [cur[0]]: cur[1] }), {}),
  };
}
function matchesSpecs(path: string, includeSpecs: readonly string[] | undefined, excludeSpecs: readonly string[] | undefined, host: ConvertToTSConfigHost): (path: string) => boolean {
  if (!includeSpecs) return (_) => true;
  const patterns = getFileMatcherPatterns(path, excludeSpecs, includeSpecs, host.useCaseSensitiveFileNames, host.getCurrentDirectory());
  const excludeRe = patterns.excludePattern && getRegexFromPattern(patterns.excludePattern, host.useCaseSensitiveFileNames);
  const includeRe = patterns.includeFilePattern && getRegexFromPattern(patterns.includeFilePattern, host.useCaseSensitiveFileNames);
  if (includeRe) {
    if (excludeRe) return (path) => !(includeRe.test(path) && !excludeRe.test(path));
    return (path) => !includeRe.test(path);
  }
  if (excludeRe) return (path) => excludeRe.test(path);
  return (_) => true;
}
function getCustomTypeMapOfCommandLineOption(optionDefinition: qt.CommandLineOption): qu.QMap<string | number> | undefined {
  if (optionDefinition.type === 'string' || optionDefinition.type === 'number' || optionDefinition.type === 'boolean' || optionDefinition.type === 'object') {
    return;
  } else if (optionDefinition.type === 'list') {
    return getCustomTypeMapOfCommandLineOption(optionDefinition.elem);
  } else {
    return (<qt.CommandLineOptionOfCustomType>optionDefinition).type;
  }
}
function getNameOfCompilerOptionValue(value: qt.CompilerOptsValue, customTypeMap: qu.QMap<string | number>): string | undefined {
  return qu.forEachEntry(customTypeMap, (mapValue, key) => {
    if (mapValue === value) return key;
    return;
  });
}
function serializeCompilerOpts(opts: qt.CompilerOpts, pathOpts?: { configFilePath: string; useCaseSensitiveFileNames: boolean }): qu.QMap<qt.CompilerOptsValue> {
  return serializeOptionBaseObject(opts, getOptsNameMap(), pathOpts);
}
function serializeWatchOpts(opts: qt.WatchOpts) {
  return serializeOptionBaseObject(opts, getWatchOptsNameMap());
}
function serializeOptionBaseObject(opts: OptsBase, { optsNameMap }: OptsNameMap, pathOpts?: { configFilePath: string; useCaseSensitiveFileNames: boolean }): qu.QMap<qt.CompilerOptsValue> {
  const result = qu.createMap<qt.CompilerOptsValue>();
  const getCanonicalFileName = pathOpts && createGetCanonicalFileName(pathOpts.useCaseSensitiveFileNames);
  for (const name in opts) {
    if (hasProperty(opts, name)) {
      if (optsNameMap.has(name) && optsNameMap.get(name)!.category === qd.Command_line_Opts) {
        continue;
      }
      const value = <qt.CompilerOptsValue>opts[name];
      const optionDefinition = optsNameMap.get(name.toLowerCase());
      if (optionDefinition) {
        const customTypeMap = getCustomTypeMapOfCommandLineOption(optionDefinition);
        if (!customTypeMap) {
          if (pathOpts && optionDefinition.isFilePath) {
            result.set(name, getRelativePathFromFile(pathOpts.configFilePath, getNormalizedAbsolutePath(value as string, getDirectoryPath(pathOpts.configFilePath)), getCanonicalFileName!));
          } else {
            result.set(name, value);
          }
        } else {
          if (optionDefinition.type === 'list') {
            result.set(
              name,
              (value as readonly (string | number)[]).map((elem) => getNameOfCompilerOptionValue(elem, customTypeMap)!)
            );
          } else {
            result.set(name, getNameOfCompilerOptionValue(value, customTypeMap));
          }
        }
      }
    }
  }
  return result;
}
export function generateTSConfig(opts: qt.CompilerOpts, fileNames: readonly string[], newLine: string): string {
  const compilerOpts = extend(opts, defaultInitCompilerOpts);
  const compilerOptsMap = serializeCompilerOpts(compilerOpts);
  return writeConfigurations();
  function getDefaultValueForOption(option: qt.CommandLineOption) {
    switch (option.type) {
      case 'number':
        return 1;
      case 'boolean':
        return true;
      case 'string':
        return option.isFilePath ? './' : '';
      case 'list':
        return [];
      case 'object':
        return {};
      default:
        const iterResult = option.type.keys().next();
        if (!iterResult.done) return iterResult.value;
        return fail("Expected 'option.type' to have entries.");
    }
  }
  function makePadding(paddingLength: number): string {
    return Array(paddingLength + 1).join(' ');
  }
  function isAllowedOption({ category, name }: qt.CommandLineOption): boolean {
    return category !== undefined && category !== qd.Command_line_Opts && (category !== qd.Advanced_Opts || compilerOptsMap.has(name));
  }
  function writeConfigurations() {
    const categorizedOpts = new MultiMap<qt.CommandLineOption>();
    for (const option of optionDeclarations) {
      const { category } = option;
      if (isAllowedOption(option)) {
        categorizedOpts.add(getLocaleSpecificMessage(category!), option);
      }
    }
    let marginLength = 0;
    let seenKnownKeys = 0;
    const entries: { value: string; description?: string }[] = [];
    categorizedOpts.forEach((opts, category) => {
      if (entries.length !== 0) {
        entries.push({ value: '' });
      }
      entries.push({ value: `` });
      for (const option of opts) {
        let optionName;
        if (compilerOptsMap.has(option.name)) {
          optionName = `"${option.name}": ${JSON.stringify(compilerOptsMap.get(option.name))}${(seenKnownKeys += 1) === compilerOptsMap.size ? '' : ','}`;
        } else {
          optionName = ``;
        }
        entries.push({
          value: optionName,
          description: ``,
        });
        marginLength = Math.max(optionName.length, marginLength);
      }
    });
    const tab = makePadding(2);
    const result: string[] = [];
    result.push(`{`);
    result.push(`${tab}"compilerOpts": {`);
    result.push(`${tab}${tab}`);
    result.push('');
    for (const entry of entries) {
      const { value, description = '' } = entry;
      result.push(value && `${tab}${tab}${value}${description && makePadding(marginLength - value.length + 2) + description}`);
    }
    if (fileNames.length) {
      result.push(`${tab}},`);
      result.push(`${tab}"files": [`);
      for (let i = 0; i < fileNames.length; i++) {
        result.push(`${tab}${tab}${JSON.stringify(fileNames[i])}${i === fileNames.length - 1 ? '' : ','}`);
      }
      result.push(`${tab}]`);
    } else {
      result.push(`${tab}}`);
    }
    result.push(`}`);
    return result.join(newLine) + newLine;
  }
}
export function convertToOptsWithAbsolutePaths(opts: qt.CompilerOpts, toAbsolutePath: (path: string) => string) {
  const result: qt.CompilerOpts = {};
  const optsNameMap = getOptsNameMap().optsNameMap;
  for (const name in opts) {
    if (hasProperty(opts, name)) {
      result[name] = convertToOptionValueWithAbsolutePaths(optsNameMap.get(name.toLowerCase()), opts[name] as qt.CompilerOptsValue, toAbsolutePath);
    }
  }
  if (result.configFilePath) {
    result.configFilePath = toAbsolutePath(result.configFilePath);
  }
  return result;
}
function convertToOptionValueWithAbsolutePaths(option: qt.CommandLineOption | undefined, value: qt.CompilerOptsValue, toAbsolutePath: (path: string) => string) {
  if (option && !isNullOrUndefined(value)) {
    if (option.type === 'list') {
      const values = value as readonly (string | number)[];
      if (option.elem.isFilePath && values.length) return values.map(toAbsolutePath);
    } else if (option.isFilePath) {
      return toAbsolutePath(value as string);
    }
  }
  return value;
}
export function parseJsonConfigFileContent(
  json: any,
  host: qt.ParseConfigHost,
  basePath: string,
  existingOpts?: qt.CompilerOpts,
  configFileName?: string,
  resolutionStack?: qt.Path[],
  extraFileExtensions?: readonly qt.FileExtensionInfo[],
  extendedConfigCache?: qu.QMap<ExtendedConfigCacheEntry>,
  existingWatchOpts?: qt.WatchOpts
): qt.ParsedCommandLine {
  return parseJsonConfigFileContentWorker(json, undefined, host, basePath, existingOpts, existingWatchOpts, configFileName, resolutionStack, extraFileExtensions, extendedConfigCache);
}
export function parseJsonSourceFileConfigFileContent(
  sourceFile: qt.TsConfigSourceFile,
  host: qt.ParseConfigHost,
  basePath: string,
  existingOpts?: qt.CompilerOpts,
  configFileName?: string,
  resolutionStack?: qt.Path[],
  extraFileExtensions?: readonly qt.FileExtensionInfo[],
  extendedConfigCache?: qu.QMap<ExtendedConfigCacheEntry>,
  existingWatchOpts?: qt.WatchOpts
): qt.ParsedCommandLine {
  return parseJsonConfigFileContentWorker(undefined, sourceFile, host, basePath, existingOpts, existingWatchOpts, configFileName, resolutionStack, extraFileExtensions, extendedConfigCache);
}
export function setConfigFileInOpts(opts: qt.CompilerOpts, configFile: qt.TsConfigSourceFile | undefined) {
  if (configFile) {
    Object.defineProperty(opts, 'configFile', { enumerable: false, writable: false, value: configFile });
  }
}
function isNullOrUndefined(x: any): x is null | undefined {
  return x === undefined || x === null;
}
function directoryOfCombinedPath(fileName: string, basePath: string) {
  return getDirectoryPath(getNormalizedAbsolutePath(fileName, basePath));
}
function parseJsonConfigFileContentWorker(
  json: any,
  sourceFile: qt.TsConfigSourceFile | undefined,
  host: qt.ParseConfigHost,
  basePath: string,
  existingOpts: qt.CompilerOpts = {},
  existingWatchOpts: qt.WatchOpts | undefined,
  configFileName?: string,
  resolutionStack: qt.Path[] = [],
  extraFileExtensions: readonly qt.FileExtensionInfo[] = [],
  extendedConfigCache?: qu.QMap<ExtendedConfigCacheEntry>
): qt.ParsedCommandLine {
  assert((json === undefined && sourceFile !== undefined) || (json !== undefined && sourceFile === undefined));
  const errors: Diagnostic[] = [];
  const parsedConfig = parseConfig(json, sourceFile, host, basePath, configFileName, resolutionStack, errors, extendedConfigCache);
  const { raw } = parsedConfig;
  const opts = extend(existingOpts, parsedConfig.opts || {});
  const watchOpts = existingWatchOpts && parsedConfig.watchOpts ? extend(existingWatchOpts, parsedConfig.watchOpts) : parsedConfig.watchOpts || existingWatchOpts;
  opts.configFilePath = configFileName && normalizeSlashes(configFileName);
  setConfigFileInOpts(opts, sourceFile);
  let projectReferences: qt.ProjectReference[] | undefined;
  const { fileNames, wildcardDirectories, spec } = getFileNames();
  return {
    opts,
    watchOpts,
    fileNames,
    projectReferences,
    typeAcquisition: parsedConfig.typeAcquisition || getDefaultTypeAcquisition(),
    raw,
    errors,
    wildcardDirectories,
    compileOnSave: !!raw.compileOnSave,
    configFileSpecs: spec,
  };
  function createCompilerDiagnosticOnlyIfJson(message: qd.Message, arg0?: string, arg1?: string) {
    if (!sourceFile) {
      errors.push(createCompilerDiagnostic(message, arg0, arg1));
    }
  }
}
function isErrorNoInputFiles(error: Diagnostic) {
  return error.code === qd.No_inputs_were_found_in_config_file_0_Specified_include_paths_were_1_and_exclude_paths_were_2.code;
}
function getErrorForNoInputFiles({ includeSpecs, excludeSpecs }: qt.ConfigFileSpecs, configFileName: string | undefined) {
  return createCompilerDiagnostic(
    qd.No_inputs_were_found_in_config_file_0_Specified_include_paths_were_1_and_exclude_paths_were_2,
    configFileName || 'tsconfig.json',
    JSON.stringify(includeSpecs || []),
    JSON.stringify(excludeSpecs || [])
  );
}
function shouldReportNoInputFiles(result: qt.ExpandResult, canJsonReportNoInutFiles: boolean, resolutionStack?: qt.Path[]) {
  return result.fileNames.length === 0 && canJsonReportNoInutFiles && (!resolutionStack || resolutionStack.length === 0);
}
export function canJsonReportNoInutFiles(raw: any) {
  return !hasProperty(raw, 'files') && !hasProperty(raw, 'references');
}
export function updateErrorForNoInputFiles(
  result: qt.ExpandResult,
  configFileName: string,
  configFileSpecs: qt.ConfigFileSpecs,
  configParseDiagnostics: Diagnostic[],
  canJsonReportNoInutFiles: boolean
) {
  const existingErrors = configParseqd.length;
  if (shouldReportNoInputFiles(result, canJsonReportNoInutFiles)) {
    configParseqd.push(getErrorForNoInputFiles(configFileSpecs, configFileName));
  } else {
    filterMutate(configParseDiagnostics, (error) => !isErrorNoInputFiles(error));
  }
  return existingErrors !== configParseqd.length;
}
export interface ParsedTsconfig {
  raw: any;
  opts?: qt.CompilerOpts;
  watchOpts?: qt.WatchOpts;
  typeAcquisition?: qt.TypeAcquisition;
  extendedConfigPath?: string;
}
function isSuccessfulParsedTsconfig(value: ParsedTsconfig) {
  return !!value.opts;
}
function parseConfig(
  json: any,
  sourceFile: qt.TsConfigSourceFile | undefined,
  host: qt.ParseConfigHost,
  basePath: string,
  configFileName: string | undefined,
  resolutionStack: string[],
  errors: Push<Diagnostic>,
  extendedConfigCache?: qu.QMap<ExtendedConfigCacheEntry>
): ParsedTsconfig {
  basePath = normalizeSlashes(basePath);
  const resolvedPath = getNormalizedAbsolutePath(configFileName || '', basePath);
  if (resolutionStack.indexOf(resolvedPath) >= 0) {
    errors.push(createCompilerDiagnostic(qd.Circularity_detected_while_resolving_configuration_Colon_0, [...resolutionStack, resolvedPath].join(' -> ')));
    return { raw: json || convertToObject(sourceFile!, errors) };
  }
  const ownConfig = json ? parseOwnConfigOfJson(json, host, basePath, configFileName, errors) : parseOwnConfigOfJsonSourceFile(sourceFile!, host, basePath, configFileName, errors);
  if (ownConfig.extendedConfigPath) {
    resolutionStack = resolutionStack.concat([resolvedPath]);
    const extendedConfig = getExtendedConfig(sourceFile, ownConfig.extendedConfigPath, host, basePath, resolutionStack, errors, extendedConfigCache);
    if (extendedConfig && isSuccessfulParsedTsconfig(extendedConfig)) {
      const baseRaw = extendedConfig.raw;
      const raw = ownConfig.raw;
      const setPropertyInRawIfNotUndefined = (propertyName: string) => {
        const value = raw[propertyName] || baseRaw[propertyName];
        if (value) {
          raw[propertyName] = value;
        }
      };
      setPropertyInRawIfNotUndefined('include');
      setPropertyInRawIfNotUndefined('exclude');
      setPropertyInRawIfNotUndefined('files');
      if (raw.compileOnSave === undefined) {
        raw.compileOnSave = baseRaw.compileOnSave;
      }
      ownConfig.opts = assign({}, extendedConfig.opts, ownConfig.opts);
      ownConfig.watchOpts = ownConfig.watchOpts && extendedConfig.watchOpts ? assign({}, extendedConfig.watchOpts, ownConfig.watchOpts) : ownConfig.watchOpts || extendedConfig.watchOpts;
    }
  }
  return ownConfig;
}
function parseOwnConfigOfJson(json: any, host: qt.ParseConfigHost, basePath: string, configFileName: string | undefined, errors: Push<Diagnostic>): ParsedTsconfig {
  if (hasProperty(json, 'excludes')) {
    errors.push(createCompilerDiagnostic(qd.Unknown_option_excludes_Did_you_mean_exclude));
  }
  const opts = convertCompilerOptsFromJsonWorker(json.compilerOpts, basePath, errors, configFileName);
  const typeAcquisition = convertTypeAcquisitionFromJsonWorker(json.typeAcquisition || json.typingOpts, basePath, errors, configFileName);
  const watchOpts = convertWatchOptsFromJsonWorker(json.watchOpts, basePath, errors);
  json.compileOnSave = convertCompileOnSaveOptionFromJson(json, basePath, errors);
  let extendedConfigPath: string | undefined;
  if (json.extends) {
    if (!isString(json.extends)) {
      errors.push(createCompilerDiagnostic(qd.Compiler_option_0_requires_a_value_of_type_1, 'extends', 'string'));
    } else {
      const newBase = configFileName ? directoryOfCombinedPath(configFileName, basePath) : basePath;
      extendedConfigPath = getExtendsConfigPath(json.extends, host, newBase, errors, createCompilerDiagnostic);
    }
  }
  return { raw: json, opts, watchOpts, typeAcquisition, extendedConfigPath };
}
function parseOwnConfigOfJsonSourceFile(sourceFile: qt.TsConfigSourceFile, host: qt.ParseConfigHost, basePath: string, configFileName: string | undefined, errors: Push<Diagnostic>): ParsedTsconfig {
  const opts = getDefaultCompilerOpts(configFileName);
  let typeAcquisition: qt.TypeAcquisition | undefined, typingOptstypeAcquisition: qt.TypeAcquisition | undefined;
  let watchOpts: qt.WatchOpts | undefined;
  let extendedConfigPath: string | undefined;
  const optsIterator: JsonConversionNotifier = {
    onSetValidOptionKeyValueInParent(parentOption: string, option: qt.CommandLineOption, value: qt.CompilerOptsValue) {
      let currentOption;
      switch (parentOption) {
        case 'compilerOpts':
          currentOption = opts;
          break;
        case 'watchOpts':
          currentOption = watchOpts || (watchOpts = {});
          break;
        case 'typeAcquisition':
          currentOption = typeAcquisition || (typeAcquisition = getDefaultTypeAcquisition(configFileName));
          break;
        case 'typingOpts':
          currentOption = typingOptstypeAcquisition || (typingOptstypeAcquisition = getDefaultTypeAcquisition(configFileName));
          break;
        default:
          fail('Unknown option');
      }
      currentOption[option.name] = normalizeOptionValue(option, basePath, value);
    },
    onSetValidOptionKeyValueInRoot(key: string, _keyNode: qt.PropertyName, value: qt.CompilerOptsValue, valueNode: qt.Expression) {
      switch (key) {
        case 'extends':
          const newBase = configFileName ? directoryOfCombinedPath(configFileName, basePath) : basePath;
          extendedConfigPath = getExtendsConfigPath(<string>value, host, newBase, errors, (message, arg0) => qf.create.diagnosticForNodeInSourceFile(sourceFile, valueNode, message, arg0));
          return;
      }
    },
    onSetUnknownOptionKeyValueInRoot(key: string, keyNode: qt.PropertyName, _value: qt.CompilerOptsValue, _valueNode: qt.Expression) {
      if (key === 'excludes') {
        errors.push(qf.create.diagnosticForNodeInSourceFile(sourceFile, keyNode, qd.Unknown_option_excludes_Did_you_mean_exclude));
      }
    },
  };
  const json = convertToObjectWorker(sourceFile, errors, true, getTsconfigRootOptsMap(), optsIterator);
  if (!typeAcquisition) {
    if (typingOptstypeAcquisition) {
      typeAcquisition =
        typingOptstypeAcquisition.enableAutoDiscovery !== undefined
          ? {
              enable: typingOptstypeAcquisition.enableAutoDiscovery,
              include: typingOptstypeAcquisition.include,
              exclude: typingOptstypeAcquisition.exclude,
            }
          : typingOptstypeAcquisition;
    } else {
      typeAcquisition = getDefaultTypeAcquisition(configFileName);
    }
  }
  return { raw: json, opts, watchOpts, typeAcquisition, extendedConfigPath };
}
function getExtendsConfigPath(extendedConfig: string, host: qt.ParseConfigHost, basePath: string, errors: Push<Diagnostic>, createDiagnostic: (message: qd.Message, arg1?: string) => Diagnostic) {
  extendedConfig = normalizeSlashes(extendedConfig);
  if (isRootedDiskPath(extendedConfig) || startsWith(extendedConfig, './') || startsWith(extendedConfig, '../')) {
    let extendedConfigPath = getNormalizedAbsolutePath(extendedConfig, basePath);
    if (!host.fileExists(extendedConfigPath) && !endsWith(extendedConfigPath, qt.Extension.Json)) {
      extendedConfigPath = `${extendedConfigPath}.json`;
      if (!host.fileExists(extendedConfigPath)) {
        errors.push(createDiagnostic(qd.File_0_not_found, extendedConfig));
        return;
      }
    }
    return extendedConfigPath;
  }
  const resolved = nodeModuleNameResolver(extendedConfig, combinePaths(basePath, 'tsconfig.json'), { moduleResolution: qt.ModuleResolutionKind.NodeJs }, host, undefined, undefined, true);
  if (resolved.resolvedModule) return resolved.resolvedModule.resolvedFileName;
  errors.push(createDiagnostic(qd.File_0_not_found, extendedConfig));
  return;
}
export interface ExtendedConfigCacheEntry {
  extendedResult: qt.TsConfigSourceFile;
  extendedConfig: ParsedTsconfig | undefined;
}
function getExtendedConfig(
  sourceFile: qt.TsConfigSourceFile | undefined,
  extendedConfigPath: string,
  host: qt.ParseConfigHost,
  basePath: string,
  resolutionStack: string[],
  errors: Push<Diagnostic>,
  extendedConfigCache?: qu.QMap<ExtendedConfigCacheEntry>
): ParsedTsconfig | undefined {
  const path = host.useCaseSensitiveFileNames ? extendedConfigPath : toFileNameLowerCase(extendedConfigPath);
  let value: ExtendedConfigCacheEntry | undefined;
  let extendedResult: qt.TsConfigSourceFile;
  let extendedConfig: ParsedTsconfig | undefined;
  if (extendedConfigCache && (value = extendedConfigCache.get(path))) {
    ({ extendedResult, extendedConfig } = value);
  } else {
    extendedResult = readJsonConfigFile(extendedConfigPath, (path) => host.readFile(path));
    if (!extendedResult.parseqd.length) {
      const extendedDirname = getDirectoryPath(extendedConfigPath);
      extendedConfig = parseConfig(undefined, extendedResult, host, extendedDirname, getBaseFileName(extendedConfigPath), resolutionStack, errors, extendedConfigCache);
      if (isSuccessfulParsedTsconfig(extendedConfig)) {
        const relativeDifference = convertToRelativePath(extendedDirname, basePath, identity);
        const updatePath = (path: string) => (isRootedDiskPath(path) ? path : combinePaths(relativeDifference, path));
        const mapPropertiesInRawIfNotUndefined = (propertyName: string) => {
          if (raw[propertyName]) {
            raw[propertyName] = map(raw[propertyName], updatePath);
          }
        };
        const { raw } = extendedConfig;
        mapPropertiesInRawIfNotUndefined('include');
        mapPropertiesInRawIfNotUndefined('exclude');
        mapPropertiesInRawIfNotUndefined('files');
      }
    }
    if (extendedConfigCache) {
      extendedConfigCache.set(path, { extendedResult, extendedConfig });
    }
  }
  if (sourceFile) {
    sourceFile.extendedSourceFiles = [extendedResult.fileName];
    if (extendedResult.extendedSourceFiles) {
      sourceFile.extendedSourceFiles.push(...extendedResult.extendedSourceFiles);
    }
  }
  if (extendedResult.parseqd.length) {
    errors.push(...extendedResult.parseDiagnostics);
    return;
  }
  return extendedConfig!;
}
function convertCompileOnSaveOptionFromJson(jsonOption: any, basePath: string, errors: Push<Diagnostic>): boolean {
  if (!hasProperty(jsonOption, compileOnSaveCommandLineOption.name)) return false;
  const result = convertJsonOption(compileOnSaveCommandLineOption, jsonOption.compileOnSave, basePath, errors);
  return typeof result === 'boolean' && result;
}
export function convertCompilerOptsFromJson(jsonOpts: any, basePath: string, configFileName?: string): { opts: qt.CompilerOpts; errors: Diagnostic[] } {
  const errors: Diagnostic[] = [];
  const opts = convertCompilerOptsFromJsonWorker(jsonOpts, basePath, errors, configFileName);
  return { opts, errors };
}
export function convertTypeAcquisitionFromJson(jsonOpts: any, basePath: string, configFileName?: string): { opts: qt.TypeAcquisition; errors: Diagnostic[] } {
  const errors: Diagnostic[] = [];
  const opts = convertTypeAcquisitionFromJsonWorker(jsonOpts, basePath, errors, configFileName);
  return { opts, errors };
}
function getDefaultCompilerOpts(configFileName?: string) {
  const opts: qt.CompilerOpts =
    configFileName && getBaseFileName(configFileName) === 'jsconfig.json' ? { allowJs: true, maxNodeModuleJsDepth: 2, allowSyntheticDefaultImports: true, skipLibCheck: true, noEmit: true } : {};
  return opts;
}
function convertCompilerOptsFromJsonWorker(jsonOpts: any, basePath: string, errors: Push<Diagnostic>, configFileName?: string): qt.CompilerOpts {
  const opts = getDefaultCompilerOpts(configFileName);
  convertOptsFromJson(getCommandLineCompilerOptsMap(), jsonOpts, basePath, opts, compilerOptsDidYouMeanDiagnostics, errors);
  if (configFileName) {
    opts.configFilePath = normalizeSlashes(configFileName);
  }
  return opts;
}
function getDefaultTypeAcquisition(configFileName?: string): qt.TypeAcquisition {
  return { enable: !!configFileName && getBaseFileName(configFileName) === 'jsconfig.json', include: [], exclude: [] };
}
function convertTypeAcquisitionFromJsonWorker(jsonOpts: any, basePath: string, errors: Push<Diagnostic>, configFileName?: string): qt.TypeAcquisition {
  const opts = getDefaultTypeAcquisition(configFileName);
  const typeAcquisition = convertEnableAutoDiscoveryToEnable(jsonOpts);
  convertOptsFromJson(getCommandLineTypeAcquisitionMap(), typeAcquisition, basePath, opts, typeAcquisitionDidYouMeanDiagnostics, errors);
  return opts;
}
function convertWatchOptsFromJsonWorker(jsonOpts: any, basePath: string, errors: Push<Diagnostic>): qt.WatchOpts | undefined {
  return convertOptsFromJson(getCommandLineWatchOptsMap(), jsonOpts, basePath, undefined, watchOptsDidYouMeanDiagnostics, errors);
}
function convertOptsFromJson(
  optsNameMap: qu.QMap<qt.CommandLineOption>,
  jsonOpts: any,
  basePath: string,
  defaultOpts: undefined,
  diagnostics: qt.DidYouMeanOptsDiagnostics,
  errors: Push<Diagnostic>
): qt.WatchOpts | undefined;
function convertOptsFromJson(
  optsNameMap: qu.QMap<qt.CommandLineOption>,
  jsonOpts: any,
  basePath: string,
  defaultOpts: qt.CompilerOpts | qt.TypeAcquisition,
  diagnostics: qt.DidYouMeanOptsDiagnostics,
  errors: Push<Diagnostic>
): qt.CompilerOpts | qt.TypeAcquisition;
function convertOptsFromJson(
  optsNameMap: qu.QMap<qt.CommandLineOption>,
  jsonOpts: any,
  basePath: string,
  defaultOpts: qt.CompilerOpts | qt.TypeAcquisition | qt.WatchOpts | undefined,
  diagnostics: qt.DidYouMeanOptsDiagnostics,
  errors: Push<Diagnostic>
) {
  if (!jsonOpts) {
    return;
  }
  for (const id in jsonOpts) {
    const opt = optsNameMap.get(id);
    if (opt) {
      (defaultOpts || (defaultOpts = {}))[opt.name] = convertJsonOption(opt, jsonOpts[id], basePath, errors);
    } else {
      errors.push(createUnknownOptionError(id, diagnostics, createCompilerDiagnostic));
    }
  }
  return defaultOpts;
}
function convertJsonOption(opt: qt.CommandLineOption, value: any, basePath: string, errors: Push<Diagnostic>): qt.CompilerOptsValue {
  if (isCompilerOptsValue(opt, value)) {
    const optType = opt.type;
    if (optType === 'list' && isArray(value)) return convertJsonOptionOfListType(<qt.CommandLineOptionOfListType>opt, value, basePath, errors);
    if (!isString(optType)) return convertJsonOptionOfCustomType(<qt.CommandLineOptionOfCustomType>opt, <string>value, errors);
    return normalizeNonListOptionValue(opt, basePath, value);
  } else {
    errors.push(createCompilerDiagnostic(qd.Compiler_option_0_requires_a_value_of_type_1, opt.name, getCompilerOptionValueTypeString(opt)));
  }
  return;
}
function normalizeOptionValue(option: qt.CommandLineOption, basePath: string, value: any): qt.CompilerOptsValue {
  if (isNullOrUndefined(value)) return;
  if (option.type === 'list') {
    const listOption = option;
    if (listOption.elem.isFilePath || !isString(listOption.elem.type)) {
      return <qt.CompilerOptsValue>filter(
        map(value, (v) => normalizeOptionValue(listOption.elem, basePath, v)),
        (v) => !!v
      );
    }
    return value;
  } else if (!isString(option.type)) {
    return option.type.get(isString(value) ? value.toLowerCase() : value);
  }
  return normalizeNonListOptionValue(option, basePath, value);
}
function normalizeNonListOptionValue(option: qt.CommandLineOption, basePath: string, value: any): qt.CompilerOptsValue {
  if (option.isFilePath) {
    value = getNormalizedAbsolutePath(value, basePath);
    if (value === '') {
      value = '.';
    }
  }
  return value;
}
function convertJsonOptionOfCustomType(opt: qt.CommandLineOptionOfCustomType, value: string, errors: Push<Diagnostic>) {
  if (isNullOrUndefined(value)) return;
  const key = value.toLowerCase();
  const val = opt.type.get(key);
  if (val !== undefined) return val;
  else {
    errors.push(createCompilerDiagnosticForInvalidCustomType(opt));
  }
  return;
}
function convertJsonOptionOfListType(option: qt.CommandLineOptionOfListType, values: readonly any[], basePath: string, errors: Push<Diagnostic>): any[] {
  return filter(
    map(values, (v) => convertJsonOption(option.elem, v, basePath, errors)),
    (v) => !!v
  );
}
function trimString(s: string) {
  return typeof s.trim === 'function' ? s.trim() : s.replace(/^[\s]+|[\s]+$/g, '');
}
const invalidTrailingRecursionPattern = /(^|\/)\*\*\/?$/;
const invalidDotDotAfterRecursiveWildcardPattern = /(^|\/)\*\*\/(.*\/)?\.\.($|\/)/;
const watchRecursivePattern = /\/[^/]*?[*?][^/]*\//;
const wildcardDirectoryPattern = /^[^*?]*(?=\/[^/]*[*?])/;
function matchFileNames(
  filesSpecs: readonly string[] | undefined,
  includeSpecs: readonly string[] | undefined,
  excludeSpecs: readonly string[] | undefined,
  basePath: string,
  opts: qt.CompilerOpts,
  host: qt.ParseConfigHost,
  errors: Push<Diagnostic>,
  extraFileExtensions: readonly qt.FileExtensionInfo[],
  jsonSourceFile: qt.TsConfigSourceFile | undefined
): qt.ExpandResult {
  basePath = normalizePath(basePath);
  let validatedIncludeSpecs: readonly string[] | undefined, validatedExcludeSpecs: readonly string[] | undefined;
  if (includeSpecs) {
    validatedIncludeSpecs = validateSpecs(includeSpecs, errors, false, jsonSourceFile, 'include');
  }
  if (excludeSpecs) {
    validatedExcludeSpecs = validateSpecs(excludeSpecs, errors, true, jsonSourceFile, 'exclude');
  }
  const wildcardDirectories = getWildcardDirectories(validatedIncludeSpecs, validatedExcludeSpecs, basePath, host.useCaseSensitiveFileNames);
  const spec: qt.ConfigFileSpecs = { filesSpecs, includeSpecs, excludeSpecs, validatedIncludeSpecs, validatedExcludeSpecs, wildcardDirectories };
  return getFileNamesFromConfigSpecs(spec, basePath, opts, host, extraFileExtensions);
}
export function getFileNamesFromConfigSpecs(
  spec: qt.ConfigFileSpecs,
  basePath: string,
  opts: qt.CompilerOpts,
  host: qt.ParseConfigHost,
  extraFileExtensions: readonly qt.FileExtensionInfo[] = []
): qt.ExpandResult {
  basePath = normalizePath(basePath);
  const keyMapper = createGetCanonicalFileName(host.useCaseSensitiveFileNames);
  const literalFileMap = qu.createMap<string>();
  const wildcardFileMap = qu.createMap<string>();
  const wildCardJsonFileMap = qu.createMap<string>();
  const { filesSpecs, validatedIncludeSpecs, validatedExcludeSpecs, wildcardDirectories } = spec;
  const supportedExtensions = getSupportedExtensions(opts, extraFileExtensions);
  const supportedExtensionsWithJsonIfResolveJsonModule = getSuppoertedExtensionsWithJsonIfResolveJsonModule(opts, supportedExtensions);
  if (filesSpecs) {
    for (const fileName of filesSpecs) {
      const file = getNormalizedAbsolutePath(fileName, basePath);
      literalFileMap.set(keyMapper(file), file);
    }
  }
  let jsonOnlyIncludeRegexes: readonly RegExp[] | undefined;
  if (validatedIncludeSpecs && validatedIncludeSpecs.length > 0) {
    for (const file of host.readDirectory(basePath, supportedExtensionsWithJsonIfResolveJsonModule, validatedExcludeSpecs, validatedIncludeSpecs, undefined)) {
      if (fileExtensionIs(file, qt.Extension.Json)) {
        if (!jsonOnlyIncludeRegexes) {
          const includes = validatedIncludeSpecs.filter((s) => endsWith(s, qt.Extension.Json));
          const includeFilePatterns = map(getRegularExpressionsForWildcards(includes, basePath, 'files'), (pattern) => `^${pattern}$`);
          jsonOnlyIncludeRegexes = includeFilePatterns ? includeFilePatterns.map((pattern) => getRegexFromPattern(pattern, host.useCaseSensitiveFileNames)) : emptyArray;
        }
        const includeIndex = findIndex(jsonOnlyIncludeRegexes, (re) => re.test(file));
        if (includeIndex !== -1) {
          const key = keyMapper(file);
          if (!literalFileMap.has(key) && !wildCardJsonFileMap.has(key)) {
            wildCardJsonFileMap.set(key, file);
          }
        }
        continue;
      }
      if (hasFileWithHigherPriorityExtension(file, literalFileMap, wildcardFileMap, supportedExtensions, keyMapper)) {
        continue;
      }
      removeWildcardFilesWithLowerPriorityExtension(file, wildcardFileMap, supportedExtensions, keyMapper);
      const key = keyMapper(file);
      if (!literalFileMap.has(key) && !wildcardFileMap.has(key)) {
        wildcardFileMap.set(key, file);
      }
    }
  }
  const literalFiles = arrayFrom(literalFileMap.values());
  const wildcardFiles = arrayFrom(wildcardFileMap.values());
  return {
    fileNames: literalFiles.concat(wildcardFiles, arrayFrom(wildCardJsonFileMap.values())),
    wildcardDirectories,
    spec,
  };
}
function validateSpecs(specs: readonly string[], errors: Push<Diagnostic>, allowTrailingRecursion: boolean, jsonSourceFile: qt.TsConfigSourceFile | undefined, specKey: string): readonly string[] {
  return specs.filter((spec) => {
    const diag = specToDiagnostic(spec, allowTrailingRecursion);
    if (diag !== undefined) {
      errors.push(createDiagnostic(diag, spec));
    }
    return diag === undefined;
  });
  function createDiagnostic(message: qd.Message, spec: string): Diagnostic {
    const elem = qf.get.tsConfigPropArrayElemValue(jsonSourceFile, specKey, spec);
    return elem ? qf.create.diagnosticForNodeInSourceFile(jsonSourceFile!, elem, message, spec) : createCompilerDiagnostic(message, spec);
  }
}
function specToDiagnostic(spec: string, allowTrailingRecursion: boolean): qd.Message | undefined {
  if (!allowTrailingRecursion && invalidTrailingRecursionPattern.test(spec)) return qd.File_specification_cannot_end_in_a_recursive_directory_wildcard_Asterisk_Asterisk_Colon_0;
  else if (invalidDotDotAfterRecursiveWildcardPattern.test(spec))
    return qd.File_specification_cannot_contain_a_parent_directory_that_appears_after_a_recursive_directory_wildcard_Asterisk_Asterisk_Colon_0;
  return;
}
function getWildcardDirectories(include: readonly string[] | undefined, exclude: readonly string[] | undefined, path: string, useCaseSensitiveFileNames: boolean): MapLike<WatchDirectoryFlags> {
  const rawExcludeRegex = getRegularExpressionForWildcard(exclude, path, 'exclude');
  const excludeRegex = rawExcludeRegex && new RegExp(rawExcludeRegex, useCaseSensitiveFileNames ? '' : 'i');
  const wildcardDirectories: MapLike<WatchDirectoryFlags> = {};
  if (include !== undefined) {
    const recursiveKeys: string[] = [];
    for (const file of include) {
      const spec = normalizePath(combinePaths(path, file));
      if (excludeRegex && excludeRegex.test(spec)) {
        continue;
      }
      const match = getWildcardDirectoryFromSpec(spec, useCaseSensitiveFileNames);
      if (match) {
        const { key, flags } = match;
        const existingFlags = wildcardDirectories[key];
        if (existingFlags === undefined || existingFlags < flags) {
          wildcardDirectories[key] = flags;
          if (flags === WatchDirectoryFlags.Recursive) {
            recursiveKeys.push(key);
          }
        }
      }
    }
    for (const key in wildcardDirectories) {
      if (hasProperty(wildcardDirectories, key)) {
        for (const recursiveKey of recursiveKeys) {
          if (key !== recursiveKey && containsPath(recursiveKey, key, path, !useCaseSensitiveFileNames)) {
            delete wildcardDirectories[key];
          }
        }
      }
    }
  }
  return wildcardDirectories;
}
function getWildcardDirectoryFromSpec(spec: string, useCaseSensitiveFileNames: boolean): { key: string; flags: WatchDirectoryFlags } | undefined {
  const match = wildcardDirectoryPattern.exec(spec);
  if (match) {
    return {
      key: useCaseSensitiveFileNames ? match[0] : toFileNameLowerCase(match[0]),
      flags: watchRecursivePattern.test(spec) ? WatchDirectoryFlags.Recursive : WatchDirectoryFlags.None,
    };
  }
  if (isImplicitGlob(spec)) return { key: spec, flags: WatchDirectoryFlags.Recursive };
  return;
}
function hasFileWithHigherPriorityExtension(file: string, literalFiles: qu.QMap<string>, wildcardFiles: qu.QMap<string>, extensions: readonly string[], keyMapper: (value: string) => string) {
  const extensionPriority = getExtensionPriority(file, extensions);
  const adjustedExtensionPriority = adjustExtensionPriority(extensionPriority, extensions);
  for (let i = ExtensionPriority.Highest; i < adjustedExtensionPriority; i++) {
    const higherPriorityExtension = extensions[i];
    const higherPriorityPath = keyMapper(changeExtension(file, higherPriorityExtension));
    if (literalFiles.has(higherPriorityPath) || wildcardFiles.has(higherPriorityPath)) return true;
  }
  return false;
}
function removeWildcardFilesWithLowerPriorityExtension(file: string, wildcardFiles: qu.QMap<string>, extensions: readonly string[], keyMapper: (value: string) => string) {
  const extensionPriority = getExtensionPriority(file, extensions);
  const nextExtensionPriority = getNextLowestExtensionPriority(extensionPriority, extensions);
  for (let i = nextExtensionPriority; i < extensions.length; i++) {
    const lowerPriorityExtension = extensions[i];
    const lowerPriorityPath = keyMapper(changeExtension(file, lowerPriorityExtension));
    wildcardFiles.delete(lowerPriorityPath);
  }
}
export function convertCompilerOptsForTelemetry(opts: qt.CompilerOpts): qt.CompilerOpts {
  const out: qt.CompilerOpts = {};
  for (const key in opts) {
    if (opts.hasOwnProperty(key)) {
      const type = getOptionFromName(key);
      if (type !== undefined) {
        out[key] = getOptionValueWithEmptyStrings(opts[key], type);
      }
    }
  }
  return out;
}
function getOptionValueWithEmptyStrings(value: any, option: qt.CommandLineOption): {} {
  switch (option.type) {
    case 'object':
      return '';
    case 'string':
      return '';
    case 'number':
      return typeof value === 'number' ? value : '';
    case 'boolean':
      return typeof value === 'boolean' ? value : '';
    case 'list':
      const elemType = option.elem;
      return isArray(value) ? value.map((v) => getOptionValueWithEmptyStrings(v, elemType)) : '';
    default:
      return qu.forEachEntry(option.type, (optionEnumValue, optionStringValue) => {
        if (optionEnumValue === value) return optionStringValue;
        return;
      })!;
  }
}
function getFileNames(): qt.ExpandResult {
  let filesSpecs: readonly string[] | undefined;
  if (hasProperty(raw, 'files') && !isNullOrUndefined(raw.files)) {
    if (isArray(raw.files)) {
      filesSpecs = <readonly string[]>raw.files;
      const hasReferences = hasProperty(raw, 'references') && !isNullOrUndefined(raw.references);
      const hasZeroOrNoReferences = !hasReferences || raw.references.length === 0;
      const hasExtends = hasProperty(raw, 'extends');
      if (filesSpecs.length === 0 && hasZeroOrNoReferences && !hasExtends) {
        if (sourceFile) {
          const fileName = configFileName || 'tsconfig.json';
          const diagnosticMessage = qd.The_files_list_in_config_file_0_is_empty;
          const nodeValue = firstDefined(qf.get.tsConfigPropArray(sourceFile, 'files'), (property) => property.initer);
          const error = nodeValue ? qf.create.diagnosticForNodeInSourceFile(sourceFile, nodeValue, diagnosticMessage, fileName) : createCompilerDiagnostic(diagnosticMessage, fileName);
          errors.push(error);
        } else {
          createCompilerDiagnosticOnlyIfJson(qd.The_files_list_in_config_file_0_is_empty, configFileName || 'tsconfig.json');
        }
      }
    } else {
      createCompilerDiagnosticOnlyIfJson(qd.Compiler_option_0_requires_a_value_of_type_1, 'files', 'Array');
    }
  }
  let includeSpecs: readonly string[] | undefined;
  if (hasProperty(raw, 'include') && !isNullOrUndefined(raw.include)) {
    if (isArray(raw.include)) {
      includeSpecs = <readonly string[]>raw.include;
    } else {
      createCompilerDiagnosticOnlyIfJson(qd.Compiler_option_0_requires_a_value_of_type_1, 'include', 'Array');
    }
  }
  let excludeSpecs: readonly string[] | undefined;
  if (hasProperty(raw, 'exclude') && !isNullOrUndefined(raw.exclude)) {
    if (isArray(raw.exclude)) {
      excludeSpecs = <readonly string[]>raw.exclude;
    } else {
      createCompilerDiagnosticOnlyIfJson(qd.Compiler_option_0_requires_a_value_of_type_1, 'exclude', 'Array');
    }
  } else if (raw.compilerOpts) {
    const outDir = raw.compilerOpts.outDir;
    const declarationDir = raw.compilerOpts.declarationDir;
    if (outDir || declarationDir) {
      excludeSpecs = [outDir, declarationDir].filter((d) => !!d);
    }
  }
  if (filesSpecs === undefined && includeSpecs === undefined) {
    includeSpecs = ['**/*'];
  }
  const result = matchFileNames(
    filesSpecs,
    includeSpecs,
    excludeSpecs,
    configFileName ? directoryOfCombinedPath(configFileName, basePath) : basePath,
    opts,
    host,
    errors,
    extraFileExtensions,
    sourceFile
  );
  if (shouldReportNoInputFiles(result, canJsonReportNoInutFiles(raw), resolutionStack)) {
    errors.push(getErrorForNoInputFiles(result.spec, configFileName));
  }
  if (hasProperty(raw, 'references') && !isNullOrUndefined(raw.references)) {
    if (isArray(raw.references)) {
      for (const ref of raw.references) {
        if (typeof ref.path !== 'string') {
          createCompilerDiagnosticOnlyIfJson(qd.Compiler_option_0_requires_a_value_of_type_1, 'reference.path', 'string');
        } else {
          (projectReferences || (projectReferences = [])).push({
            path: getNormalizedAbsolutePath(ref.path, basePath),
            originalPath: ref.path,
            prepend: ref.prepend,
            circular: ref.circular,
          });
        }
      }
    } else {
      createCompilerDiagnosticOnlyIfJson(qd.Compiler_option_0_requires_a_value_of_type_1, 'references', 'Array');
    }
  }
  return result;
}
function filterSameAsDefaultInclude(specs: readonly string[] | undefined) {
  if (!length(specs)) return;
  if (length(specs) !== 1) return specs;
  if (specs![0] === '**/*') return;
  return specs;
}
export function getEmitScriptTarget(compilerOpts: qt.CompilerOpts) {
  return compilerOpts.target || qt.ScriptTarget.ES2020;
}
export function getEmitModuleKind(compilerOpts: { module?: qt.CompilerOpts['module']; target?: qt.CompilerOpts['target'] }) {
  return typeof compilerOpts.module === 'number' ? compilerOpts.module : ModuleKind.ES2015;
}
export function getEmitModuleResolutionKind(compilerOpts: qt.CompilerOpts) {
  let moduleResolution = compilerOpts.moduleResolution;
  if (moduleResolution === undefined) {
    moduleResolution = getEmitModuleKind(compilerOpts) === ModuleKind.CommonJS ? qt.ModuleResolutionKind.NodeJs : qt.ModuleResolutionKind.Classic;
  }
  return moduleResolution;
}
export function hasJsonModuleEmitEnabled(opts: qt.CompilerOpts) {
  switch (getEmitModuleKind(opts)) {
    case ModuleKind.CommonJS:
    case ModuleKind.AMD:
    case ModuleKind.ES2015:
    case ModuleKind.ES2020:
    case ModuleKind.ESNext:
      return true;
    default:
      return false;
  }
}
export function unreachableCodeIsError(opts: qt.CompilerOpts): boolean {
  return opts.allowUnreachableCode === false;
}
export function unusedLabelIsError(opts: qt.CompilerOpts): boolean {
  return opts.allowUnusedLabels === false;
}
export function getAreDeclarationMapsEnabled(opts: qt.CompilerOpts) {
  return !!(getEmitDeclarations(opts) && opts.declarationMap);
}
export function getAllowSyntheticDefaultImports(compilerOpts: qt.CompilerOpts) {
  const moduleKind = getEmitModuleKind(compilerOpts);
  return compilerOpts.allowSyntheticDefaultImports !== undefined ? compilerOpts.allowSyntheticDefaultImports : compilerOpts.esModuleInterop || moduleKind === ModuleKind.System;
}
export function getEmitDeclarations(compilerOpts: qt.CompilerOpts): boolean {
  return !!(compilerOpts.declaration || compilerOpts.composite);
}
export function isIncrementalCompilation(opts: qt.CompilerOpts) {
  return !!(opts.incremental || opts.composite);
}
export type StrictOptionName = 'noImplicitAny' | 'noImplicitThis' | 'strictNullChecks' | 'strictFunctionTypes' | 'strictBindCallApply' | 'strictPropertyInitialization' | 'alwaysStrict';
export function getStrictOptionValue(compilerOpts: qt.CompilerOpts, flag: StrictOptionName): boolean {
  return compilerOpts[flag] === undefined ? !!compilerOpts.strict : !!compilerOpts[flag];
}
export function compilerOptsAffectSemanticDiagnostics(newOpts: qt.CompilerOpts, oldOpts: qt.CompilerOpts): boolean {
  return oldOpts !== newOpts && semanticDiagnosticsOptionDeclarations.some((option) => !isJsonEqual(getCompilerOptionValue(oldOpts, option), getCompilerOptionValue(newOpts, option)));
}
export function compilerOptsAffectEmit(newOpts: qt.CompilerOpts, oldOpts: qt.CompilerOpts): boolean {
  return oldOpts !== newOpts && affectsEmitOptionDeclarations.some((option) => !isJsonEqual(getCompilerOptionValue(oldOpts, option), getCompilerOptionValue(newOpts, option)));
}
export function getCompilerOptionValue(opts: qt.CompilerOpts, option: qt.CommandLineOption): unknown {
  return option.strictFlag ? getStrictOptionValue(opts, option.name as StrictOptionName) : opts[option.name];
}
