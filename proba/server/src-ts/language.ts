import { basename } from 'path';
import * as vscode from 'vscode';
import { CachedResponse } from './server';
import { DiagnosticKind } from './providers/diagnostics';
import FileConfigs from './providers/configs';
import ServiceClient from './serviceClient';
import { Commands, Disposable } from './utils/extras';
import * as fileSchemes from './utils/fileSchemes';
import { LanguageDescription } from './utils/language';
import { memoize } from './utils';
import { TelemetryReporter } from './utils/telemetry';
import TypingsStatus from './utils/typingsStatus';

const validateSetting = 'validate.enable';
const suggestionSetting = 'suggestionActions.enabled';

export class LanguageProvider extends Disposable {
  constructor(
    private readonly client: ServiceClient,
    private readonly description: LanguageDescription,
    private readonly commandManager: Commands,
    private readonly telemetry: TelemetryReporter,
    private readonly typingsStatus: TypingsStatus,
    private readonly fileConfigurationManager: FileConfigs,
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
      import('./providers/completions').then((p) =>
        this.register(
          p.register(
            selector,
            this.description.id,
            this.client,
            this.typingsStatus,
            this.fileConfigurationManager,
            this.commandManager,
            this.telemetry,
            this.onCompletionAccepted
          )
        )
      ),
      import('./providers/defs').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./providers/directiveCommentCompletions').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./providers/documentHighlight').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./providers/documentSymbol').then((p) =>
        this.register(p.register(selector, this.client, cachedResponse))
      ),
      import('./providers/folding').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./providers/formatting').then((p) =>
        this.register(
          p.register(
            selector,
            this.description.id,
            this.client,
            this.fileConfigurationManager
          )
        )
      ),
      import('./providers/hover').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./providers/implement').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./providers/clImplements').then((p) =>
        this.register(
          p.register(selector, this.description.id, this.client, cachedResponse)
        )
      ),
      import('./providers/jsDocCompletions').then((p) =>
        this.register(p.register(selector, this.description.id, this.client))
      ),
      import('./providers/organizeImports').then((p) =>
        this.register(
          p.register(
            selector,
            this.client,
            this.commandManager,
            this.fileConfigurationManager,
            this.telemetry
          )
        )
      ),
      import('./providers/quickFix').then((p) =>
        this.register(
          p.register(
            selector,
            this.client,
            this.fileConfigurationManager,
            this.commandManager,
            this.client.diagnosticsManager,
            this.telemetry
          )
        )
      ),
      import('./providers/fixAll').then((p) =>
        this.register(
          p.register(
            selector,
            this.client,
            this.fileConfigurationManager,
            this.client.diagnosticsManager
          )
        )
      ),
      import('./providers/refactor').then((p) =>
        this.register(
          p.register(
            selector,
            this.client,
            this.fileConfigurationManager,
            this.commandManager,
            this.telemetry
          )
        )
      ),
      import('./providers/references').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./providers/clReferences').then((p) =>
        this.register(
          p.register(selector, this.description.id, this.client, cachedResponse)
        )
      ),
      import('./providers/rename').then((p) =>
        this.register(p.register(selector, this.client, this.fileConfigurationManager))
      ),
      import('./providers/smartSelect').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./providers/signatureHelp').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./providers/tagClosing').then((p) =>
        this.register(p.register(selector, this.description.id, this.client))
      ),
      import('./providers/typeDefs').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./providers/semanticTokens').then((p) =>
        this.register(p.register(selector, this.client))
      ),
      import('./providers/callHierarchy').then((p) =>
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
