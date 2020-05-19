/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* --------------------------------------------------------------------------------------------
 * Includes code from typescript-sublime-plugin project, obtained from
 * https://github.com/Microsoft/TypeScript-Sublime-Plugin/blob/master/TypeScript%20Indent.tmPreferences
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import { DiagnosticKind } from './providers/diagnostics';
import FileConfigs from './providers/fileConfigurationManager';
import LanguageProvider from './language';
import * as Proto from './protocol';
import * as PConst from './protocol.const';
import TypeScriptServiceClient from './serviceClient';
import { coalesce, flatten } from './utils/arrays';
import { Commands } from './utils/extras';
import { Disposable } from './utils/disposable';
import * as errorCodes from './utils/errorCodes';
import { DiagnosticLanguage, LanguageDescription } from './utils/language';
import LogDirectory from './utils/providers';
import { Plugins } from './utils/plugin';
import * as typeConverters from './utils/convert';
import TypingsStatus, { AtaProgressReporter } from './utils/typingsStatus';
import VersionStatus from './utils/versionStatus';

// Style check diagnostics that can be reported as warnings
const styleCheckDiagnostics = [
  errorCodes.variableDeclaredButNeverUsed,
  errorCodes.propertyDeclaretedButNeverUsed,
  errorCodes.allImportsAreUnused,
  errorCodes.unreachableCode,
  errorCodes.unusedLabel,
  errorCodes.fallThroughCaseInSwitch,
  errorCodes.notAllCodePathsReturnAValue,
];

export default class TypeScriptServiceClientHost extends Disposable {
  private readonly client: TypeScriptServiceClient;
  private readonly languages: LanguageProvider[] = [];
  private readonly languagePerId = new Map<string, LanguageProvider>();

  private readonly typingsStatus: TypingsStatus;
  private readonly versionStatus: VersionStatus;

  private readonly fileConfigurationManager: FileConfigs;

  private reportStyleCheckAsWarnings = true;

  constructor(
    descriptions: LanguageDescription[],
    workspaceState: vscode.Memento,
    pluginManager: Plugins,
    private readonly commandManager: Commands,
    logDirectoryProvider: LogDirectory,
    onCompletionAccepted: (item: vscode.CompletionItem) => void
  ) {
    super();

    const allModeIds = this.getAllModeIds(descriptions, pluginManager);
    this.client = this._register(
      new TypeScriptServiceClient(
        workspaceState,
        (version) => this.versionStatus.onDidChangeTypeScriptVersion(version),
        pluginManager,
        logDirectoryProvider,
        allModeIds
      )
    );

    this.client.onDiagnosticsReceived(
      ({ kind, resource, diagnostics }) => {
        this.diagnosticsReceived(kind, resource, diagnostics);
      },
      null,
      this._disposables
    );

    this.client.onConfigDiagnosticsReceived(
      (diag) => this.configFileDiagnosticsReceived(diag),
      null,
      this._disposables
    );
    this.client.onResendModelsRequested(
      () => this.populateService(),
      null,
      this._disposables
    );

    this.versionStatus = this._register(new VersionStatus(this.client, commandManager));

    this._register(new AtaProgressReporter(this.client));
    this.typingsStatus = this._register(new TypingsStatus(this.client));
    this.fileConfigurationManager = this._register(new FileConfigs(this.client));

    for (const description of descriptions) {
      const manager = new LanguageProvider(
        this.client,
        description,
        this.commandManager,
        this.client.telemetryReporter,
        this.typingsStatus,
        this.fileConfigurationManager,
        onCompletionAccepted
      );
      this.languages.push(manager);
      this._register(manager);
      this.languagePerId.set(description.id, manager);
    }

    import('./providers/updatePathsOnRename').then((module) =>
      this._register(
        module.register(this.client, this.fileConfigurationManager, (uri) =>
          this.handles(uri)
        )
      )
    );

    import('./providers/workspaceSymbols').then((module) =>
      this._register(module.register(this.client, allModeIds))
    );

    this.client.ensureServiceStarted();
    this.client.onReady(() => {
      const languages = new Set<string>();
      for (const plugin of pluginManager.plugins) {
        if (plugin.configNamespace && plugin.languages.length) {
          this.registerExtensionLanguageProvider(
            {
              id: plugin.configNamespace,
              modeIds: Array.from(plugin.languages),
              diagnosticSource: 'ts-plugin',
              diagnosticLanguage: DiagnosticLanguage.TypeScript,
              diagnosticOwner: 'typescript',
              isExternal: true,
            },
            onCompletionAccepted
          );
        } else {
          for (const language of plugin.languages) {
            languages.add(language);
          }
        }
      }

      if (languages.size) {
        this.registerExtensionLanguageProvider(
          {
            id: 'typescript-plugins',
            modeIds: Array.from(languages.values()),
            diagnosticSource: 'ts-plugin',
            diagnosticLanguage: DiagnosticLanguage.TypeScript,
            diagnosticOwner: 'typescript',
            isExternal: true,
          },
          onCompletionAccepted
        );
      }
    });

    this.client.onTsServerStarted(() => {
      this.triggerAllDiagnostics();
    });

    vscode.workspace.onDidChangeConfiguration(
      this.configurationChanged,
      this,
      this._disposables
    );
    this.configurationChanged();
  }

  private registerExtensionLanguageProvider(
    description: LanguageDescription,
    onCompletionAccepted: (item: vscode.CompletionItem) => void
  ) {
    const manager = new LanguageProvider(
      this.client,
      description,
      this.commandManager,
      this.client.telemetryReporter,
      this.typingsStatus,
      this.fileConfigurationManager,
      onCompletionAccepted
    );
    this.languages.push(manager);
    this._register(manager);
    this.languagePerId.set(description.id, manager);
  }

  private getAllModeIds(descriptions: LanguageDescription[], pluginManager: Plugins) {
    const allModeIds = flatten([
      ...descriptions.map((x) => x.modeIds),
      ...pluginManager.plugins.map((x) => x.languages),
    ]);
    return allModeIds;
  }

  public get serviceClient(): TypeScriptServiceClient {
    return this.client;
  }

  public reloadProjects(): void {
    this.client.executeWithoutWaitingForResponse('reloadProjects', null);
    this.triggerAllDiagnostics();
  }

  public async handles(resource: vscode.Uri): Promise<boolean> {
    const provider = await this.findLanguage(resource);
    if (provider) {
      return true;
    }
    return this.client.bufferSyncSupport.handles(resource);
  }

  private configurationChanged(): void {
    const typescriptConfig = vscode.workspace.getConfiguration('typescript');

    this.reportStyleCheckAsWarnings = typescriptConfig.get(
      'reportStyleChecksAsWarnings',
      true
    );
  }

  private async findLanguage(
    resource: vscode.Uri
  ): Promise<LanguageProvider | undefined> {
    try {
      const doc = await vscode.workspace.openTextDocument(resource);
      return this.languages.find((language) => language.handles(resource, doc));
    } catch {
      return;
    }
  }

  private triggerAllDiagnostics() {
    for (const language of this.languagePerId.values()) {
      language.triggerAllDiagnostics();
    }
  }

  private populateService(): void {
    this.fileConfigurationManager.reset();

    for (const language of this.languagePerId.values()) {
      language.reInitialize();
    }
  }

  private async diagnosticsReceived(
    kind: DiagnosticKind,
    resource: vscode.Uri,
    diagnostics: Proto.Diagnostic[]
  ): Promise<void> {
    const language = await this.findLanguage(resource);
    if (language) {
      language.diagnosticsReceived(
        kind,
        resource,
        this.createMarkerDatas(diagnostics, language.diagnosticSource)
      );
    }
  }

  private configFileDiagnosticsReceived(event: Proto.ConfigFileDiagnosticEvent): void {
    // See https://github.com/Microsoft/TypeScript/issues/10384
    const body = event.body;
    if (!body || !body.diagnostics || !body.configFile) {
      return;
    }

    this.findLanguage(this.client.toResource(body.configFile)).then((language) => {
      if (!language) {
        return;
      }

      language.configFileDiagnosticsReceived(
        this.client.toResource(body.configFile),
        body.diagnostics.map((tsDiag) => {
          const range =
            tsDiag.start && tsDiag.end
              ? typeConverters.Range.fromTextSpan(tsDiag)
              : new vscode.Range(0, 0, 0, 1);
          const diagnostic = new vscode.Diagnostic(
            range,
            body.diagnostics[0].text,
            this.getDiagnosticSeverity(tsDiag)
          );
          diagnostic.source = language.diagnosticSource;
          return diagnostic;
        })
      );
    });
  }

  private createMarkerDatas(
    diagnostics: Proto.Diagnostic[],
    source: string
  ): (vscode.Diagnostic & { reportUnnecessary: any })[] {
    return diagnostics.map((tsDiag) => this.tsDiagnosticToVsDiagnostic(tsDiag, source));
  }

  private tsDiagnosticToVsDiagnostic(
    diagnostic: Proto.Diagnostic,
    source: string
  ): vscode.Diagnostic & { reportUnnecessary: any } {
    const { start, end, text } = diagnostic;
    const range = new vscode.Range(
      typeConverters.Position.fromLocation(start),
      typeConverters.Position.fromLocation(end)
    );
    const converted = new vscode.Diagnostic(
      range,
      text,
      this.getDiagnosticSeverity(diagnostic)
    );
    converted.source = diagnostic.source || source;
    if (diagnostic.code) {
      converted.code = diagnostic.code;
    }
    const relatedInformation = diagnostic.relatedInformation;
    if (relatedInformation) {
      converted.relatedInformation = coalesce(
        relatedInformation.map((info: any) => {
          const span = info.span;
          if (!span) {
            return;
          }
          return new vscode.DiagnosticRelatedInformation(
            typeConverters.Location.fromTextSpan(this.client.toResource(span.file), span),
            info.message
          );
        })
      );
    }
    if (diagnostic.reportsUnnecessary) {
      converted.tags = [vscode.DiagnosticTag.Unnecessary];
    }
    (converted as vscode.Diagnostic & { reportUnnecessary: any }).reportUnnecessary =
      diagnostic.reportsUnnecessary;
    return converted as vscode.Diagnostic & { reportUnnecessary: any };
  }

  private getDiagnosticSeverity(diagnostic: Proto.Diagnostic): vscode.DiagnosticSeverity {
    if (
      this.reportStyleCheckAsWarnings &&
      this.isStyleCheckDiagnostic(diagnostic.code) &&
      diagnostic.category === PConst.DiagnosticCategory.error
    ) {
      return vscode.DiagnosticSeverity.Warning;
    }

    switch (diagnostic.category) {
      case PConst.DiagnosticCategory.error:
        return vscode.DiagnosticSeverity.Error;

      case PConst.DiagnosticCategory.warning:
        return vscode.DiagnosticSeverity.Warning;

      case PConst.DiagnosticCategory.suggestion:
        return vscode.DiagnosticSeverity.Hint;

      default:
        return vscode.DiagnosticSeverity.Error;
    }
  }

  private isStyleCheckDiagnostic(code: number | undefined): boolean {
    return code ? styleCheckDiagnostics.includes(code) : false;
  }
}
