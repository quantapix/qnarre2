import { basename } from 'path';
import * as vscode from 'vscode';
import { CachedResponse } from './server';
import { DiagnosticKind } from './features/diagnostics';
import FileConfigurationManager from './features/fileConfigurationManager';
import TypeScriptServiceClient from './serviceClient';
import { Commands, Disposable } from './utils/extras';
import * as fileSchemes from './utils/fileSchemes';
import { LanguageDescription } from './utils/language';
import { memoize } from './utils';
import { TelemetryReporter } from './utils/telemetry';
import TypingsStatus from './utils/typingsStatus';

const validateSetting = 'validate.enable';
const suggestionSetting = 'suggestionActions.enabled';

export default class LanguageProvider extends Disposable {
  constructor(
    private readonly client: TypeScriptServiceClient,
    private readonly description: LanguageDescription,
    private readonly commandManager: Commands,
    private readonly telemetryReporter: TelemetryReporter,
    private readonly typingsStatus: TypingsStatus,
    private readonly fileConfigurationManager: FileConfigurationManager,
    private readonly onCompletionAccepted: (item: vscode.CompletionItem) => void
  ) {
    super();
    vscode.workspace.onDidChangeConfiguration(
      this.configurationChanged,
      this,
      this._disposables
    );
    this.configurationChanged();

    client.onReady(() => this.registerProviders());
  }

  @memoize
  private get documentSelector(): vscode.DocumentFilter[] {
    const documentSelector = [];
    for (const language of this.description.modeIds) {
      for (const scheme of fileSchemes.supportedSchemes) {
        documentSelector.push({ language, scheme });
      }
    }
    return documentSelector;
  }

  private async registerProviders(): Promise<void> {
    const selector = this.documentSelector;

    const cachedResponse = new CachedResponse();

    await Promise.all([
      import('./features/completions').then((p) =>
        this.register(
          p.register(
            selector,
            this.description.id,
            this.client,
            this.typingsStatus,
            this.fileConfigurationManager,
            this.commandManager,
            this.telemetryReporter,
            this.onCompletionAccepted
          )
        )
      ),
      import('./features/definitions').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./features/directiveCommentCompletions').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./features/documentHighlight').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./features/documentSymbol').then((p) =>
        this.register(p.register(selector, this.client, cachedResponse))
      ),
      import('./features/folding').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./features/formatting').then((p) =>
        this.register(
          p.register(
            selector,
            this.description.id,
            this.client,
            this.fileConfigurationManager
          )
        )
      ),
      import('./features/hover').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./features/implementations').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./features/implementationsCodeLens').then((p) =>
        this.register(
          p.register(selector, this.description.id, this.client, cachedResponse)
        )
      ),
      import('./features/jsDocCompletions').then((p) =>
        this.register(p.register(selector, this.description.id, this.client))
      ),
      import('./features/organizeImports').then((p) =>
        this.register(
          p.register(
            selector,
            this.client,
            this.commandManager,
            this.fileConfigurationManager,
            this.telemetryReporter
          )
        )
      ),
      import('./features/quickFix').then((p) =>
        this.register(
          p.register(
            selector,
            this.client,
            this.fileConfigurationManager,
            this.commandManager,
            this.client.diagnosticsManager,
            this.telemetryReporter
          )
        )
      ),
      import('./features/fixAll').then((p) =>
        this.register(
          p.register(
            selector,
            this.client,
            this.fileConfigurationManager,
            this.client.diagnosticsManager
          )
        )
      ),
      import('./features/refactor').then((p) =>
        this.register(
          p.register(
            selector,
            this.client,
            this.fileConfigurationManager,
            this.commandManager,
            this.telemetryReporter
          )
        )
      ),
      import('./features/references').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./features/referencesCodeLens').then((p) =>
        this.register(
          p.register(selector, this.description.id, this.client, cachedResponse)
        )
      ),
      import('./features/rename').then((p) =>
        this.register(p.register(selector, this.client, this.fileConfigurationManager))
      ),
      import('./features/smartSelect').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./features/signatureHelp').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./features/tagClosing').then((p) =>
        this.register(p.register(selector, this.description.id, this.client))
      ),
      import('./features/typeDefinitions').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./features/semanticTokens').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./features/callHierarchy').then((p) =>
        this.register(p.register(selector, this.client))
      ),
    ]);
  }

  private configurationChanged(): void {
    const config = vscode.workspace.getConfiguration(this.id, null);
    this.updateValidate(config.get(validateSetting, true));
    this.updateSuggestionDiagnostics(config.get(suggestionSetting, true));
  }

  public handles(resource: vscode.Uri, doc: vscode.TextDocument): boolean {
    if (doc && this.description.modeIds.includes(doc.languageId)) {
      return true;
    }

    const base = basename(resource.fsPath);
    return (
      !!base &&
      !!this.description.configFilePattern &&
      this.description.configFilePattern.test(base)
    );
  }

  private get id(): string {
    return this.description.id;
  }

  public get diagnosticSource(): string {
    return this.description.diagnosticSource;
  }

  private updateValidate(value: boolean) {
    this.client.diagnosticsManager.setValidate(this._diagnosticLanguage, value);
  }

  private updateSuggestionDiagnostics(value: boolean) {
    this.client.diagnosticsManager.setEnableSuggestions(this._diagnosticLanguage, value);
  }

  public reInitialize(): void {
    this.client.diagnosticsManager.reInitialize();
  }

  public triggerAllDiagnostics(): void {
    this.client.bufferSyncSupport.requestAllDiagnostics();
  }

  public diagnosticsReceived(
    diagnosticsKind: DiagnosticKind,
    file: vscode.Uri,
    diagnostics: (vscode.Diagnostic & { reportUnnecessary: any })[]
  ): void {
    const config = vscode.workspace.getConfiguration(this.id, file);
    const reportUnnecessary = config.get<boolean>('showUnused', true);
    this.client.diagnosticsManager.updateDiagnostics(
      file,
      this._diagnosticLanguage,
      diagnosticsKind,
      diagnostics.filter((diag) => {
        if (!reportUnnecessary) {
          diag.tags = undefined;
          if (
            diag.reportUnnecessary &&
            diag.severity === vscode.DiagnosticSeverity.Hint
          ) {
            return false;
          }
        }
        return true;
      })
    );
  }

  public configFileDiagnosticsReceived(
    file: vscode.Uri,
    diagnostics: vscode.Diagnostic[]
  ): void {
    this.client.diagnosticsManager.configFileDiagnosticsReceived(file, diagnostics);
  }

  private get _diagnosticLanguage() {
    return this.description.diagnosticLanguage;
  }
}
