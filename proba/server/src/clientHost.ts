/* eslint-disable @typescript-eslint/unbound-method */
import * as vsc from 'vscode';
import * as proto from './protocol';
import * as cproto from './protocol.const';

import { Kind, Lang } from './utils/diagnostic';
import { FileConfigs } from './utils/configs';
import { LanguageProvider } from './language';
import { ServiceClient } from './serviceClient';
import * as qu from './utils';
import * as qx from './utils/extras';
import { codes } from './utils/names';
import { Language } from './utils/language';
import { LogDirectory } from './utils/providers';
import { Plugins } from './utils/plugin';
import * as qc from './utils/convert';
import { TypingsStatus, ProgressReporter } from './utils/typingsStatus';
import { VersionStatus } from './utils/versionStatus';

// Style check diagnostics that can be reported as warnings
const styleCheckDiagnostics = [
  codes.variableDeclaredButNeverUsed,
  codes.propertyDeclaretedButNeverUsed,
  codes.allImportsAreUnused,
  codes.unreachableCode,
  codes.unusedLabel,
  codes.fallThroughCaseInSwitch,
  codes.notAllCodePathsReturnAValue,
];

export class ServiceClientHost extends qx.Disposable {
  private readonly client: ServiceClient;
  private readonly languages: LanguageProvider[] = [];
  private readonly languagePerId = new Map<string, LanguageProvider>();

  private readonly typingsStatus: TypingsStatus;
  private readonly versionStatus: VersionStatus;

  private readonly fileConfigurationManager: FileConfigs;

  private reportStyleCheckAsWarnings = true;

  constructor(
    descriptions: Language[],
    workspaceState: vsc.Memento,
    plugins: Plugins,
    private readonly commandManager: qx.Commands,
    logDirectoryProvider: LogDirectory,
    onCompletionAccepted: (item: vsc.CompletionItem) => void
  ) {
    super();

    const allModeIds = this.getAllModeIds(descriptions, plugins);
    this.client = this.register(
      new ServiceClient(
        workspaceState,
        (version) => this.versionStatus.onDidChangeTypeScriptVersion(version),
        plugins,
        logDirectoryProvider,
        allModeIds
      )
    );

    this.client.onDiagnosticsReceived(
      ({ kind, uri, diag }) => {
        this.diagnosticsReceived(kind, uri, diag);
      },
      null,
      this.dispos
    );

    this.client.onConfigDiagnosticsReceived(
      (diag) => this.configFileDiagnosticsReceived(diag),
      null,
      this.dispos
    );
    this.client.onResendModelsRequested(() => this.populateService(), null, this.dispos);

    this.versionStatus = this.register(new VersionStatus(this.client, commandManager));

    this.register(new ProgressReporter(this.client));
    this.typingsStatus = this.register(new TypingsStatus(this.client));
    this.fileConfigurationManager = this.register(new FileConfigs(this.client));

    for (const description of descriptions) {
      const manager = new LanguageProvider(
        this.client,
        description,
        this.commandManager,
        this.client.telemetry,
        this.typingsStatus,
        this.fileConfigurationManager,
        onCompletionAccepted
      );
      this.languages.push(manager);
      this.register(manager);
      this.languagePerId.set(description.id, manager);
    }

    import('./providers/updatePathsOnRename').then((m) =>
      this.register(
        m.register(this.client, this.fileConfigurationManager, (uri) => this.handles(uri))
      )
    );
    import('./providers/workspaceSymbols').then((m) =>
      this.register(m.register(this.client, allModeIds))
    );
    this.client.ensureServiceStarted();
    this.client.onReady(() => {
      const languages = new Set<string>();
      for (const p of plugins.all) {
        if (p.configNamespace && p.languages.length) {
          this.registerExtensionLanguageProvider(
            {
              id: p.configNamespace,
              modes: Array.from(p.languages),
              diagSource: 'ts-plugin',
              diagLang: Lang.TypeScript,
              diagOwner: 'typescript',
              isExternal: true,
            },
            onCompletionAccepted
          );
        } else {
          for (const l of p.languages) {
            languages.add(l);
          }
        }
      }
      if (languages.size) {
        this.registerExtensionLanguageProvider(
          {
            id: 'typescript-plugins',
            modes: Array.from(languages.values()),
            diagSource: 'ts-plugin',
            diagLang: Lang.TypeScript,
            diagOwner: 'typescript',
            isExternal: true,
          },
          onCompletionAccepted
        );
      }
    });
    this.client.onServerStarted(() => {
      this.triggerAllDiagnostics();
    });
    vsc.workspace.onDidChangeConfiguration(this.configurationChanged, this, this.dispos);
    this.configurationChanged();
  }

  private registerExtensionLanguageProvider(
    lang: Language,
    onCompletionAccepted: (item: vsc.CompletionItem) => void
  ) {
    const manager = new LanguageProvider(
      this.client,
      lang,
      this.commandManager,
      this.client.telemetry,
      this.typingsStatus,
      this.fileConfigurationManager,
      onCompletionAccepted
    );
    this.languages.push(manager);
    this.register(manager);
    this.languagePerId.set(lang.id, manager);
  }

  private getAllModeIds(ls: Language[], plugins: Plugins) {
    const allModeIds = qu.flatten([
      ...ls.map((x) => x.modes),
      ...plugins.all.map((x) => x.languages),
    ]);
    return allModeIds;
  }

  public get serviceClient() {
    return this.client;
  }

  public reloadProjects() {
    this.client.executeNoResponse('reloadProjects', null);
    this.triggerAllDiagnostics();
  }

  public async handles(r: vsc.Uri) {
    const p = await this.findLanguage(r);
    if (p) return true;
    return this.client.buffer.handles(r);
  }

  private configurationChanged() {
    const c = vsc.workspace.getConfiguration('typescript');
    this.reportStyleCheckAsWarnings = c.get('reportStyleChecksAsWarnings', true);
  }

  private async findLanguage(r: vsc.Uri) {
    try {
      const d = await vsc.workspace.openTextDocument(r);
      return this.languages.find((language) => language.handles(r, d));
    } catch {}
    return;
  }

  private triggerAllDiagnostics() {
    for (const l of this.languagePerId.values()) {
      l.triggerAllDiagnostics();
    }
  }

  private populateService() {
    this.fileConfigurationManager.reset();
    for (const l of this.languagePerId.values()) {
      l.reInitialize();
    }
  }

  private async diagnosticsReceived(k: Kind, r: vsc.Uri, ds: proto.Diagnostic[]) {
    const l = await this.findLanguage(r);
    if (l) l.diagnosticsReceived(k, r, this.createMarkerDatas(ds, l.diagSource));
  }

  private configFileDiagnosticsReceived(e: proto.ConfigFileDiagnosticEvent) {
    const b = e.body;
    if (!b || !b.diagnostics || !b.configFile) return;
    this.findLanguage(this.client.toResource(b.configFile)).then((l) => {
      if (!l) return;
      l.configFileDiagnosticsReceived(
        this.client.toResource(b.configFile),
        b.diagnostics.map((d) => {
          const r =
            d.start && d.end ? qc.Range.fromTextSpan(d) : new vsc.Range(0, 0, 0, 1);
          const d2 = new vsc.Diagnostic(
            r,
            b.diagnostics[0].text,
            this.getDiagnosticSeverity(d)
          );
          d2.source = l.diagSource;
          return d2;
        })
      );
    });
  }

  private createMarkerDatas(
    ds: proto.Diagnostic[],
    source: string
  ): (vsc.Diagnostic & { reportUnnecessary: any })[] {
    return ds.map((d) => this.tsDiagnosticToVsDiagnostic(d, source));
  }

  private tsDiagnosticToVsDiagnostic(
    d: proto.Diagnostic,
    source: string
  ): vsc.Diagnostic & { reportUnnecessary: any } {
    const { start, end, text } = d;
    const r = new vsc.Range(
      qc.Position.fromLocation(start),
      qc.Position.fromLocation(end)
    );
    const n = new vsc.Diagnostic(r, text, this.getDiagnosticSeverity(d));
    n.source = d.source || source;
    if (d.code) n.code = d.code;
    const i = d.relatedInformation;
    if (i) {
      n.relatedInformation = qu.coalesce(
        i.map((i2: any) => {
          const s = i2.span;
          if (!s) return;
          return new vsc.DiagnosticRelatedInformation(
            qc.Location.fromTextSpan(this.client.toResource(s.file), s),
            i2.message
          );
        })
      );
    }
    if (d.reportsUnnecessary) n.tags = [vsc.DiagnosticTag.Unnecessary];
    (n as vsc.Diagnostic & { reportUnnecessary: any }).reportUnnecessary =
      d.reportsUnnecessary;
    return n as vsc.Diagnostic & { reportUnnecessary: any };
  }

  private getDiagnosticSeverity(d: proto.Diagnostic): vsc.DiagnosticSeverity {
    if (
      this.reportStyleCheckAsWarnings &&
      this.isStyleCheckDiagnostic(d.code) &&
      d.category === cproto.DiagnosticCategory.error
    ) {
      return vsc.DiagnosticSeverity.Warning;
    }
    switch (d.category) {
      case cproto.DiagnosticCategory.error:
        return vsc.DiagnosticSeverity.Error;
      case cproto.DiagnosticCategory.warning:
        return vsc.DiagnosticSeverity.Warning;
      case cproto.DiagnosticCategory.suggestion:
        return vsc.DiagnosticSeverity.Hint;
      default:
        return vsc.DiagnosticSeverity.Error;
    }
  }

  private isStyleCheckDiagnostic(code: number | undefined) {
    return code ? styleCheckDiagnostics.includes(code) : false;
  }
}
