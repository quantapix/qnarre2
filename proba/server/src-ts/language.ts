/* eslint-disable @typescript-eslint/unbound-method */
import { basename } from 'path';
import * as vsc from 'vscode';

import { CachedResponse } from './server';
import { Kind } from './utils/diagnostic';
import { FileConfigs } from './utils/configs';
import * as qs from './serviceClient';
import * as qx from './utils/extras';
import { LangDesc } from './utils/language';
import * as qu from './utils';
import { TelemetryReporter } from './utils/telemetry';
import { TypingsStatus } from './utils/typingsStatus';

const validateSetting = 'validate.enable';
const suggestionSetting = 'suggestionActions.enabled';

export class LanguageProvider extends qx.Disposable {
  constructor(
    private readonly client: qs.ServiceClient,
    private readonly description: LangDesc,
    private readonly cmds: qx.Commands,
    private readonly telemetry: TelemetryReporter,
    private readonly typingsStatus: TypingsStatus,
    private readonly configs: FileConfigs,
    private readonly onCompletionAccepted: (_: vsc.CompletionItem) => void
  ) {
    super();
    vsc.workspace.onDidChangeConfiguration(this.configurationChanged, this, this.dispos);
    this.configurationChanged();
    client.onReady(() => this.registerProviders());
  }

  @qu.memoize
  private get documentSelector(): vsc.DocumentFilter[] {
    const fs = [];
    for (const language of this.description.modes) {
      for (const scheme of qx.schemes) {
        fs.push({ language, scheme });
      }
    }
    return fs;
  }

  private async registerProviders(): Promise<void> {
    const s = this.documentSelector;
    const r = new CachedResponse();
    await Promise.all([
      import('./providers/completion').then((p) =>
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
      import('./providers/definition').then((p) =>
        this.register(p.register(s, this.client))
      ),
      import('./providers/directive').then((p) =>
        this.register(p.register(s, this.client))
      ),
      import('./providers/highlight').then((p) =>
        this.register(p.register(s, this.client))
      ),
      import('./providers/symbol').then((p) =>
        this.register(p.register(s, this.client, r))
      ),
      import('./providers/folding').then((p) =>
        this.register(p.register(s, this.client))
      ),
      import('./providers/formatting').then((p) =>
        this.register(p.register(s, this.description.id, this.client, this.configs))
      ),
      import('./providers/hover').then((p) => this.register(p.register(s, this.client))),
      import('./providers/implementation').then((p) =>
        this.register(p.register(s, this.client))
      ),
      import('./providers/codeLens2').then((p) =>
        this.register(p.register(s, this.description.id, this.client, r))
      ),
      import('./providers/jsDoc').then((p) =>
        this.register(p.register(s, this.description.id, this.client))
      ),
      import('./providers/import').then((p) =>
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
      import('./providers/reference').then((p) =>
        this.register(p.register(s, this.client))
      ),
      import('./providers/codeLens').then((p) =>
        this.register(p.register(s, this.description.id, this.client, r))
      ),
      import('./providers/rename').then((p) =>
        this.register(p.register(s, this.client, this.configs))
      ),
      import('./providers/smartSelect').then((p) =>
        this.register(p.register(s, this.client))
      ),
      import('./providers/signature').then((p) =>
        this.register(p.register(s, this.client))
      ),
      import('./providers/tagClosing').then((p) =>
        this.register(p.register(s, this.description.id, this.client))
      ),
      import('./providers/typeDefinition').then((p) =>
        this.register(p.register(s, this.client))
      ),
      import('./providers/semantic').then((p) =>
        this.register(p.register(s, this.client))
      ),
      import('./providers/hierarchy').then((p) =>
        this.register(p.register(s, this.client))
      ),
    ]);
  }

  private configurationChanged() {
    const config = vsc.workspace.getConfiguration(this.id, null);
    this.updateValidate(config.get(validateSetting, true));
    this.updateSuggestionDiags(config.get(suggestionSetting, true));
  }

  public handles(r: vsc.Uri, d: vsc.TextDocument) {
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
    this.client.diagnosticsManager.setSuggestions(this._diagLang, v);
  }

  public reInitialize() {
    this.client.diagnosticsManager.reInitialize();
  }

  public triggerAllDiagnostics() {
    this.client.buffer.requestAllDiags();
  }

  public diagnosticsReceived(
    k: Kind,
    r: vsc.Uri,
    ds: (vsc.Diagnostic & { reportUnnecessary: any })[]
  ) {
    const config = vsc.workspace.getConfiguration(this.id, r);
    const reportUnnecessary = config.get<boolean>('showUnused', true);
    this.client.diagnosticsManager.update(
      r,
      this._diagLang,
      k,
      ds.filter((d) => {
        if (!reportUnnecessary) {
          d.tags = undefined;
          if (d.reportUnnecessary && d.severity === vsc.DiagnosticSeverity.Hint) {
            return false;
          }
        }
        return true;
      })
    );
  }

  public configFileDiagnosticsReceived(r: vsc.Uri, ds: vsc.Diagnostic[]) {
    this.client.diagnosticsManager.configFileDiagsReceived(r, ds);
  }

  private get _diagLang() {
    return this.description.diagLang;
  }
}
