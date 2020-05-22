import * as os from 'os';
import * as path from 'path';
import * as vsc from 'vscode';
import type * as proto from '../protocol';

import { isTsDocument } from './language';
import * as qs from '../service';
import * as qu from '.';
import * as qx from './extras';

interface FileConfig {
  readonly formatOptions: proto.FormatCodeSettings;
  readonly preferences: proto.UserPreferences;
}

function areFileConfigsEqual(a: FileConfig, b: FileConfig) {
  return qu.equals(a, b);
}

export class FileConfigs extends qx.Disposable {
  private readonly formatOptions = new qx.ResourceMap<Promise<FileConfig | undefined>>();

  constructor(private readonly client: qs.IServiceClient) {
    super();
    vsc.workspace.onDidCloseTextDocument(
      (d) => {
        this.formatOptions.delete(d.uri);
      },
      undefined,
      this.dispos
    );
  }

  async ensureConfigurationForDocument(
    document: vsc.TextDocument,
    ct: vsc.CancellationToken
  ): Promise<void> {
    const formattingOptions = this.getFormattingOptions(document);
    if (formattingOptions) {
      return this.ensureConfigurationOptions(document, formattingOptions, ct);
    }
  }

  private getFormattingOptions(
    document: vsc.TextDocument
  ): vsc.FormattingOptions | undefined {
    const editor = vsc.window.visibleTextEditors.find(
      (editor) => editor.document.fileName === document.fileName
    );
    return editor
      ? ({
          tabSize: editor.options.tabSize,
          insertSpaces: editor.options.insertSpaces,
        } as vsc.FormattingOptions)
      : undefined;
  }

  async ensureConfigurationOptions(
    document: vsc.TextDocument,
    options: vsc.FormattingOptions,
    ct: vsc.CancellationToken
  ): Promise<void> {
    const file = this.client.toOpenedPath(document);
    if (!file) {
      return;
    }

    const currentOptions = this.getFileOptions(document, options);
    const cachedOptions = this.formatOptions.get(document.uri);
    if (cachedOptions) {
      const cachedOptionsValue = await cachedOptions;
      if (cachedOptionsValue && areFileConfigsEqual(cachedOptionsValue, currentOptions)) {
        return;
      }
    }

    let resolve: (x: FileConfig | undefined) => void;
    this.formatOptions.set(
      document.uri,
      new Promise<FileConfig | undefined>((r) => (resolve = r))
    );

    const args: proto.ConfigureRequestArguments = {
      file,
      ...currentOptions,
    };
    try {
      const response = await this.client.execute('configure', args, ct);
      resolve!(response.type === 'response' ? currentOptions : undefined);
    } finally {
      resolve!(undefined);
    }
  }

  async setGlobalConfigurationFromDocument(
    document: vsc.TextDocument,
    ct: vsc.CancellationToken
  ): Promise<void> {
    const formattingOptions = this.getFormattingOptions(document);
    if (!formattingOptions) {
      return;
    }

    const args: proto.ConfigureRequestArguments = {
      file: undefined /*global*/,
      ...this.getFileOptions(document, formattingOptions),
    };
    await this.client.execute('configure', args, ct);
  }

  reset() {
    this.formatOptions.clear();
  }

  private getFileOptions(
    document: vsc.TextDocument,
    options: vsc.FormattingOptions
  ): FileConfig {
    return {
      formatOptions: this.getFormatOptions(document, options),
      preferences: this.getPreferences(document),
    };
  }

  private getFormatOptions(
    document: vsc.TextDocument,
    options: vsc.FormattingOptions
  ): proto.FormatCodeSettings {
    const config = vsc.workspace.getConfiguration(
      isTsDocument(document) ? 'typescript.format' : 'javascript.format',
      document.uri
    );

    return {
      tabSize: options.tabSize,
      indentSize: options.tabSize,
      convertTabsToSpaces: options.insertSpaces,
      // We can use \n here since the editor normalizes later on to its line endings.
      newLineCharacter: '\n',
      insertSpaceAfterCommaDelimiter: config.get<boolean>(
        'insertSpaceAfterCommaDelimiter'
      ),
      insertSpaceAfterConstructor: config.get<boolean>('insertSpaceAfterConstructor'),
      insertSpaceAfterSemicolonInForStatements: config.get<boolean>(
        'insertSpaceAfterSemicolonInForStatements'
      ),
      insertSpaceBeforeAndAfterBinaryOperators: config.get<boolean>(
        'insertSpaceBeforeAndAfterBinaryOperators'
      ),
      insertSpaceAfterKeywordsInControlFlowStatements: config.get<boolean>(
        'insertSpaceAfterKeywordsInControlFlowStatements'
      ),
      insertSpaceAfterFunctionKeywordForAnonymousFunctions: config.get<boolean>(
        'insertSpaceAfterFunctionKeywordForAnonymousFunctions'
      ),
      insertSpaceBeforeFunctionParenthesis: config.get<boolean>(
        'insertSpaceBeforeFunctionParenthesis'
      ),
      insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: config.get<boolean>(
        'insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis'
      ),
      insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: config.get<boolean>(
        'insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets'
      ),
      insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: config.get<boolean>(
        'insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces'
      ),
      insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: config.get<boolean>(
        'insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces'
      ),
      insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces: config.get<boolean>(
        'insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces'
      ),
      insertSpaceAfterTypeAssertion: config.get<boolean>('insertSpaceAfterTypeAssertion'),
      placeOpenBraceOnNewLineForFunctions: config.get<boolean>(
        'placeOpenBraceOnNewLineForFunctions'
      ),
      placeOpenBraceOnNewLineForControlBlocks: config.get<boolean>(
        'placeOpenBraceOnNewLineForControlBlocks'
      ),
      semicolons: config.get<proto.SemicolonPreference>('semicolons'),
    };
  }

  private getPreferences(document: vsc.TextDocument): proto.UserPreferences {
    const config = vsc.workspace.getConfiguration(
      isTsDocument(document) ? 'typescript' : 'javascript',
      document.uri
    );
    const preferencesConfig = vsc.workspace.getConfiguration(
      isTsDocument(document) ? 'typescript.preferences' : 'javascript.preferences',
      document.uri
    );
    const preferences: proto.UserPreferences = {
      quotePreference: this.getQuoteStylePreference(preferencesConfig),
      importModuleSpecifierPreference: getImportModuleSpecifierPreference(
        preferencesConfig
      ),
      importModuleSpecifierEnding: getImportModuleSpecifierEndingPreference(
        preferencesConfig
      ),
      allowTextChangesInNewFiles: document.uri.scheme === qx.file,
      providePrefixAndSuffixTextForRename:
        preferencesConfig.get<boolean>('renameShorthandProperties', true) === false
          ? false
          : preferencesConfig.get<boolean>('useAliasesForRenames', true),
      allowRenameOfImportPath: true,
      includeAutomaticOptionalChainCompletions: config.get<boolean>(
        'suggest.includeAutomaticOptionalChainCompletions',
        true
      ),
    };
    return preferences;
  }

  private getQuoteStylePreference(config: vsc.WorkspaceConfiguration) {
    switch (config.get<string>('quoteStyle')) {
      case 'single':
        return 'single';
      case 'double':
        return 'double';
      default:
        return 'auto';
    }
  }
}

function getImportModuleSpecifierPreference(config: vsc.WorkspaceConfiguration) {
  switch (config.get<string>('importModuleSpecifier')) {
    case 'relative':
      return 'relative';
    case 'non-relative':
      return 'non-relative';
    default:
      return;
  }
}

function getImportModuleSpecifierEndingPreference(config: vsc.WorkspaceConfiguration) {
  switch (config.get<string>('importModuleSpecifierEnding')) {
    case 'minimal':
      return 'minimal';
    case 'index':
      return 'index';
    case 'js':
      return 'js';
    default:
      return 'auto';
  }
}

export enum TsServerLogLevel {
  Off,
  Normal,
  Terse,
  Verbose,
}

export namespace TsServerLogLevel {
  export function fromString(value: string): TsServerLogLevel {
    switch (value && value.toLowerCase()) {
      case 'normal':
        return TsServerLogLevel.Normal;
      case 'terse':
        return TsServerLogLevel.Terse;
      case 'verbose':
        return TsServerLogLevel.Verbose;
      case 'off':
      default:
        return TsServerLogLevel.Off;
    }
  }

  export function toString(value: TsServerLogLevel): string {
    switch (value) {
      case TsServerLogLevel.Normal:
        return 'normal';
      case TsServerLogLevel.Terse:
        return 'terse';
      case TsServerLogLevel.Verbose:
        return 'verbose';
      case TsServerLogLevel.Off:
      default:
        return 'off';
    }
  }
}

export class ServiceConfig {
  public readonly locale: string | null;
  public readonly globalTsdk: string | null;
  public readonly localTsdk: string | null;
  public readonly npmLocation: string | null;
  public readonly tsServerLogLevel: TsServerLogLevel = TsServerLogLevel.Off;
  public readonly tsServerPluginPaths: readonly string[];
  public readonly checkJs: boolean;
  public readonly experimentalDecorators: boolean;
  public readonly disableAutomaticTypeAcquisition: boolean;
  public readonly useSeparateSyntaxServer: boolean;
  public readonly enableProjectDiagnostics: boolean;
  public readonly maxTsServerMemory: number;
  public readonly enablePromptUseWorkspaceTsdk: boolean;
  public readonly watchOptions: protocol.WatchOptions | undefined;

  public static loadFromWorkspace(): ServiceConfig {
    return new ServiceConfig();
  }

  private constructor() {
    const configuration = vsc.workspace.getConfiguration();

    this.locale = ServiceConfig.extractLocale(configuration);
    this.globalTsdk = ServiceConfig.extractGlobalTsdk(configuration);
    this.localTsdk = ServiceConfig.extractLocalTsdk(configuration);
    this.npmLocation = ServiceConfig.readNpmLocation(configuration);
    this.tsServerLogLevel = ServiceConfig.readTsServerLogLevel(configuration);
    this.tsServerPluginPaths = ServiceConfig.readTsServerPluginPaths(configuration);
    this.checkJs = ServiceConfig.readCheckJs(configuration);
    this.experimentalDecorators = ServiceConfig.readExperimentalDecorators(configuration);
    this.disableAutomaticTypeAcquisition = ServiceConfig.readDisableAutomaticTypeAcquisition(
      configuration
    );
    this.useSeparateSyntaxServer = ServiceConfig.readUseSeparateSyntaxServer(
      configuration
    );
    this.enableProjectDiagnostics = ServiceConfig.readEnableProjectDiagnostics(
      configuration
    );
    this.maxTsServerMemory = ServiceConfig.readMaxTsServerMemory(configuration);
    this.enablePromptUseWorkspaceTsdk = ServiceConfig.readEnablePromptUseWorkspaceTsdk(
      configuration
    );
    this.watchOptions = ServiceConfig.readWatchOptions(configuration);
  }

  public isEqualTo(other: ServiceConfig) {
    return (
      this.locale === other.locale &&
      this.globalTsdk === other.globalTsdk &&
      this.localTsdk === other.localTsdk &&
      this.npmLocation === other.npmLocation &&
      this.tsServerLogLevel === other.tsServerLogLevel &&
      this.checkJs === other.checkJs &&
      this.experimentalDecorators === other.experimentalDecorators &&
      this.disableAutomaticTypeAcquisition === other.disableAutomaticTypeAcquisition &&
      qu.equals(this.tsServerPluginPaths, other.tsServerPluginPaths) &&
      this.useSeparateSyntaxServer === other.useSeparateSyntaxServer &&
      this.enableProjectDiagnostics === other.enableProjectDiagnostics &&
      this.maxTsServerMemory === other.maxTsServerMemory &&
      qu.equals(this.watchOptions, other.watchOptions) &&
      this.enablePromptUseWorkspaceTsdk === other.enablePromptUseWorkspaceTsdk
    );
  }

  private static fixPathPrefixes(inspectValue: string) {
    const pathPrefixes = ['~' + path.sep];
    for (const pathPrefix of pathPrefixes) {
      if (inspectValue.startsWith(pathPrefix))
        return path.join(os.homedir(), inspectValue.slice(pathPrefix.length));
    }
    return inspectValue;
  }

  private static extractGlobalTsdk(
    configuration: vsc.WorkspaceConfiguration
  ): string | undefined {
    const inspect = configuration.inspect('typescript.tsdk');
    if (inspect && typeof inspect.globalValue === 'string')
      return this.fixPathPrefixes(inspect.globalValue);

    return;
  }

  private static extractLocalTsdk(
    configuration: vsc.WorkspaceConfiguration
  ): string | undefined {
    const inspect = configuration.inspect('typescript.tsdk');
    if (inspect && typeof inspect.workspaceValue === 'string')
      return this.fixPathPrefixes(inspect.workspaceValue);

    return;
  }

  private static readTsServerLogLevel(
    configuration: vsc.WorkspaceConfiguration
  ): TsServerLogLevel {
    const setting = configuration.get<string>('typescript.tsserver.log', 'off');
    return TsServerLogLevel.fromString(setting);
  }

  private static readTsServerPluginPaths(
    configuration: vsc.WorkspaceConfiguration
  ): string[] {
    return configuration.get<string[]>('typescript.tsserver.pluginPaths', []);
  }

  private static readCheckJs(configuration: vsc.WorkspaceConfiguration): boolean {
    return configuration.get<boolean>('javascript.implicitProjectConfig.checkJs', false);
  }

  private static readExperimentalDecorators(
    configuration: vsc.WorkspaceConfiguration
  ): boolean {
    return configuration.get<boolean>(
      'javascript.implicitProjectConfig.experimentalDecorators',
      false
    );
  }

  private static readNpmLocation(
    configuration: vsc.WorkspaceConfiguration
  ): string | null {
    return configuration.get<string | null>('typescript.npm', null);
  }

  private static readDisableAutomaticTypeAcquisition(
    configuration: vsc.WorkspaceConfiguration
  ): boolean {
    return configuration.get<boolean>(
      'typescript.disableAutomaticTypeAcquisition',
      false
    );
  }

  private static extractLocale(configuration: vsc.WorkspaceConfiguration): string | null {
    return configuration.get<string | null>('typescript.locale', null);
  }

  private static readUseSeparateSyntaxServer(
    configuration: vsc.WorkspaceConfiguration
  ): boolean {
    return configuration.get<boolean>(
      'typescript.tsserver.useSeparateSyntaxServer',
      true
    );
  }

  private static readEnableProjectDiagnostics(
    configuration: vsc.WorkspaceConfiguration
  ): boolean {
    return configuration.get<boolean>(
      'typescript.tsserver.experimental.enableProjectDiagnostics',
      false
    );
  }

  private static readWatchOptions(
    configuration: vsc.WorkspaceConfiguration
  ): protocol.WatchOptions | undefined {
    return configuration.get<protocol.WatchOptions>('typescript.tsserver.watchOptions');
  }

  private static readMaxTsServerMemory(
    configuration: vsc.WorkspaceConfiguration
  ): number {
    const defaultMaxMemory = 3072;
    const minimumMaxMemory = 128;
    const memoryInMB = configuration.get<number>(
      'typescript.tsserver.maxTsServerMemory',
      defaultMaxMemory
    );
    if (!Number.isSafeInteger(memoryInMB)) {
      return defaultMaxMemory;
    }
    return Math.max(memoryInMB, minimumMaxMemory);
  }

  private static readEnablePromptUseWorkspaceTsdk(
    configuration: vsc.WorkspaceConfiguration
  ): boolean {
    return configuration.get<boolean>('typescript.enablePromptUseWorkspaceTsdk', false);
  }
}
