import { basename } from 'path';
import * as vscode from 'vscode';
import { CachedResponse } from './server';
import { DiagnosticKind } from './providers/diagnostics';
import FileConfigs from './providers/configs';
import { ServiceClient } from './serviceClient';
import { Commands, Disposable } from './utils/extras';
import * as fileSchemes from './utils/fileSchemes';
import { LangDesc } from './utils/language';
import { memoize } from './utils';
import { TelemetryReporter } from './utils/telemetry';
import TypingsStatus from './utils/typingsStatus';

const validateSetting = 'validate.enable';
const suggestionSetting = 'suggestionActions.enabled';

export class LanguageProvider extends Disposable {
  constructor(
    private readonly client: ServiceClient,
    private readonly description: LangDesc,
    private readonly cmds: Commands,
    private readonly telemetry: TelemetryReporter,
    private readonly typingsStatus: TypingsStatus,
    private readonly configs: FileConfigs,
    private readonly onCompletionAccepted: (_: vscode.CompletionItem) => void
  ) {
    super();
    vscode.workspace.onDidChangeConfiguration(
      this.configurationChanged,
      this,
      this.dispos
    );
    this.configurationChanged();
    client.onReady(() => this.registerProviders());
  }

  @memoize
  private get documentSelector(): vscode.DocumentFilter[] {
    const fs = [];
    for (const language of this.description.modes) {
      for (const scheme of fileSchemes.supportedSchemes) {
        fs.push({ language, scheme });
      }
    }
    return fs;
  }

  private async registerProviders(): Promise<void> {
    const s = this.documentSelector;
    const r = new CachedResponse();
    await Promise.all([
      import('./providers/completions').then((p) =>
        this.register(
          p.register(
            s,
            this.description.id,
            this.client,
            this.typingsStatus,
            this.configs,
            this.cmds,
            this.telemetry,
            this.onCompletionAccepted
          )
        )
      ),
      import('./providers/defs').then((p) => this.register(p.register(s, this.client))),
      import('./providers/directiveCompletion').then((p) =>
        this.register(p.register(s, this.client))
      ),
      import('./providers/documentHighlight').then((p) =>
        this.register(p.register(s, this.client))
      ),
      import('./providers/documentSymbol').then((p) =>
        this.register(p.register(s, this.client, r))
      ),
      import('./providers/folding').then((p) =>
        this.register(p.register(s, this.client))
      ),
      import('./providers/formatting').then((p) =>
        this.register(p.register(s, this.description.id, this.client, this.configs))
      ),
      import('./providers/hover').then((p) => this.register(p.register(s, this.client))),
      import('./providers/implement').then((p) =>
        this.register(p.register(s, this.client))
      ),
      import('./providers/clImplements').then((p) =>
        this.register(p.register(s, this.description.id, this.client, r))
      ),
      import('./providers/jsDocCompletions').then((p) =>
        this.register(p.register(s, this.description.id, this.client))
      ),
      import('./providers/organizeImports').then((p) =>
        this.register(p.register(s, this.client, this.cmds, this.configs, this.telemetry))
      ),
      import('./providers/quickFix').then((p) =>
        this.register(
          p.register(
            s,
            this.client,
            this.configs,
            this.cmds,
            this.client.diagnosticsManager,
            this.telemetry
          )
        )
      ),
      import('./providers/fixAll').then((p) =>
        this.register(
          p.register(s, this.client, this.configs, this.client.diagnosticsManager)
        )
      ),
      import('./providers/refactor').then((p) =>
        this.register(p.register(s, this.client, this.configs, this.cmds, this.telemetry))
      ),
      import('./providers/references').then((p) =>
        this.register(p.register(s, this.client))
      ),
      import('./providers/clReferences').then((p) =>
        this.register(p.register(s, this.description.id, this.client, r))
      ),
      import('./providers/rename').then((p) =>
        this.register(p.register(s, this.client, this.configs))
      ),
      import('./providers/smartSelect').then((p) =>
        this.register(p.register(s, this.client))
      ),
      import('./providers/signatureHelp').then((p) =>
        this.register(p.register(s, this.client))
      ),
      import('./providers/tagClosing').then((p) =>
        this.register(p.register(s, this.description.id, this.client))
      ),
      import('./providers/typeDefs').then((p) =>
        this.register(p.register(s, this.client))
      ),
      import('./providers/semanticTokens').then((p) =>
        this.register(p.register(s, this.client))
      ),
      import('./providers/callHierarchy').then((p) =>
        this.register(p.register(s, this.client))
      ),
    ]);
  }

  private configurationChanged() {
    const config = vscode.workspace.getConfiguration(this.id, null);
    this.updateValidate(config.get(validateSetting, true));
    this.updateSuggestionDiags(config.get(suggestionSetting, true));
  }

  public handles(r: vscode.Uri, d: vscode.TextDocument) {
    if (d && this.description.modes.includes(d.languageId)) return true;
    const b = basename(r.fsPath);
    return (
      !!b &&
      !!this.description.configFilePattern &&
      this.description.configFilePattern.test(b)
    );
  }

  private get id() {
    return this.description.id;
  }

  public get diagSource() {
    return this.description.diagSource;
  }

  private updateValidate(v: boolean) {
    this.client.diagnosticsManager.setValidate(this._diagLang, v);
  }

  private updateSuggestionDiags(v: boolean) {
    this.client.diagnosticsManager.setEnableSuggestions(this._diagLang, v);
  }

  public reInitialize() {
    this.client.diagnosticsManager.reInitialize();
  }

  public triggerAllDiagnostics() {
    this.client.bufferSync.requestAllDiagnostics();
  }

  public diagnosticsReceived(
    k: DiagnosticKind,
    r: vscode.Uri,
    ds: (vscode.Diagnostic & { reportUnnecessary: any })[]
  ) {
    const config = vscode.workspace.getConfiguration(this.id, r);
    const reportUnnecessary = config.get<boolean>('showUnused', true);
    this.client.diagnosticsManager.updateDiagnostics(
      r,
      this._diagLang,
      k,
      ds.filter((d) => {
        if (!reportUnnecessary) {
          d.tags = undefined;
          if (d.reportUnnecessary && d.severity === vscode.DiagnosticSeverity.Hint) {
            return false;
          }
        }
        return true;
      })
    );
  }

  public configFileDiagnosticsReceived(r: vscode.Uri, ds: vscode.Diagnostic[]) {
    this.client.diagnosticsManager.configFileDiagnosticsReceived(r, ds);
  }

  private get _diagLang() {
    return this.description.diagLang;
  }
}
