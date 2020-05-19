import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import * as objects from '.';
import * as arrays from './arrays';

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
    const configuration = vscode.workspace.getConfiguration();

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

  public isEqualTo(other: ServiceConfig): boolean {
    return (
      this.locale === other.locale &&
      this.globalTsdk === other.globalTsdk &&
      this.localTsdk === other.localTsdk &&
      this.npmLocation === other.npmLocation &&
      this.tsServerLogLevel === other.tsServerLogLevel &&
      this.checkJs === other.checkJs &&
      this.experimentalDecorators === other.experimentalDecorators &&
      this.disableAutomaticTypeAcquisition === other.disableAutomaticTypeAcquisition &&
      arrays.equals(this.tsServerPluginPaths, other.tsServerPluginPaths) &&
      this.useSeparateSyntaxServer === other.useSeparateSyntaxServer &&
      this.enableProjectDiagnostics === other.enableProjectDiagnostics &&
      this.maxTsServerMemory === other.maxTsServerMemory &&
      objects.equals(this.watchOptions, other.watchOptions) &&
      this.enablePromptUseWorkspaceTsdk === other.enablePromptUseWorkspaceTsdk
    );
  }

  private static fixPathPrefixes(inspectValue: string): string {
    const pathPrefixes = ['~' + path.sep];
    for (const pathPrefix of pathPrefixes) {
      if (inspectValue.startsWith(pathPrefix)) {
        return path.join(os.homedir(), inspectValue.slice(pathPrefix.length));
      }
    }
    return inspectValue;
  }

  private static extractGlobalTsdk(
    configuration: vscode.WorkspaceConfiguration
  ): string | null {
    const inspect = configuration.inspect('typescript.tsdk');
    if (inspect && typeof inspect.globalValue === 'string') {
      return this.fixPathPrefixes(inspect.globalValue);
    }
    return null;
  }

  private static extractLocalTsdk(
    configuration: vscode.WorkspaceConfiguration
  ): string | null {
    const inspect = configuration.inspect('typescript.tsdk');
    if (inspect && typeof inspect.workspaceValue === 'string') {
      return this.fixPathPrefixes(inspect.workspaceValue);
    }
    return null;
  }

  private static readTsServerLogLevel(
    configuration: vscode.WorkspaceConfiguration
  ): TsServerLogLevel {
    const setting = configuration.get<string>('typescript.tsserver.log', 'off');
    return TsServerLogLevel.fromString(setting);
  }

  private static readTsServerPluginPaths(
    configuration: vscode.WorkspaceConfiguration
  ): string[] {
    return configuration.get<string[]>('typescript.tsserver.pluginPaths', []);
  }

  private static readCheckJs(configuration: vscode.WorkspaceConfiguration): boolean {
    return configuration.get<boolean>('javascript.implicitProjectConfig.checkJs', false);
  }

  private static readExperimentalDecorators(
    configuration: vscode.WorkspaceConfiguration
  ): boolean {
    return configuration.get<boolean>(
      'javascript.implicitProjectConfig.experimentalDecorators',
      false
    );
  }

  private static readNpmLocation(
    configuration: vscode.WorkspaceConfiguration
  ): string | null {
    return configuration.get<string | null>('typescript.npm', null);
  }

  private static readDisableAutomaticTypeAcquisition(
    configuration: vscode.WorkspaceConfiguration
  ): boolean {
    return configuration.get<boolean>(
      'typescript.disableAutomaticTypeAcquisition',
      false
    );
  }

  private static extractLocale(
    configuration: vscode.WorkspaceConfiguration
  ): string | null {
    return configuration.get<string | null>('typescript.locale', null);
  }

  private static readUseSeparateSyntaxServer(
    configuration: vscode.WorkspaceConfiguration
  ): boolean {
    return configuration.get<boolean>(
      'typescript.tsserver.useSeparateSyntaxServer',
      true
    );
  }

  private static readEnableProjectDiagnostics(
    configuration: vscode.WorkspaceConfiguration
  ): boolean {
    return configuration.get<boolean>(
      'typescript.tsserver.experimental.enableProjectDiagnostics',
      false
    );
  }

  private static readWatchOptions(
    configuration: vscode.WorkspaceConfiguration
  ): protocol.WatchOptions | undefined {
    return configuration.get<protocol.WatchOptions>('typescript.tsserver.watchOptions');
  }

  private static readMaxTsServerMemory(
    configuration: vscode.WorkspaceConfiguration
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
    configuration: vscode.WorkspaceConfiguration
  ): boolean {
    return configuration.get<boolean>('typescript.enablePromptUseWorkspaceTsdk', false);
  }
}
