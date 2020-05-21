import * as vscode from 'vscode';
import { DiagKind } from './providers/diagnostics';
import FileConfigs from './utils/configs';
import LanguageProvider from './language';
import * as Proto from './protocol';
import * as PConst from './protocol.const';
import { ServiceClient } from './serviceClient';
import { coalesce, flatten } from './utils';
import { Commands } from './utils/extras';
import { Disposable } from './utils/extras';
import * as errorCodes from './utils/errorCodes';
import { DiagLang, LangDesc } from './utils/language';
import { LogDirectory } from './utils/providers';
import { Plugins } from './utils/plugin';
import * as qc from './utils/convert';
import TypingsStatus, { ProgressReporter } from './utils/typingsStatus';
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

export class ServiceClientHost extends Disposable {
  private readonly client: ServiceClient;
  private readonly languages: LanguageProvider[] = [];
  private readonly languagePerId = new Map<string, LanguageProvider>();

  private readonly typingsStatus: TypingsStatus;
  private readonly versionStatus: VersionStatus;

  private readonly fileConfigurationManager: FileConfigs;

  private reportStyleCheckAsWarnings = true;

  constructor(
    descriptions: LangDesc[],
    workspaceState: vscode.Memento,
    plugins: Plugins,
    private readonly commandManager: Commands,
    logDirectoryProvider: LogDirectory,
    onCompletionAccepted: (item: vscode.CompletionItem) => void
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
      ({ kind, resource, diagnostics }) => {
        this.diagnosticsReceived(kind, resource, diagnostics);
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

    import('./providers/updatePathsOnRename').then((module) =>
      this.register(
        module.register(this.client, this.fileConfigurationManager, (uri) =>
          this.handles(uri)
        )
      )
    );

    import('./providers/workspaceSymbols').then((module) =>
      this.register(module.register(this.client, allModeIds))
    );

    this.client.ensureServiceStarted();
    this.client.onReady(() => {
      const languages = new Set<string>();
      for (const plugin of plugins.plugins) {
        if (plugin.configNamespace && plugin.languages.length) {
          this.registerExtensionLanguageProvider(
            {
              id: plugin.configNamespace,
              modes: Array.from(plugin.languages),
              diagSource: 'ts-plugin',
              diagLang: DiagLang.TypeScript,
              diagOwner: 'typescript',
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
            modes: Array.from(languages.values()),
            diagSource: 'ts-plugin',
            diagLang: DiagLang.TypeScript,
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

    vscode.workspace.onDidChangeConfiguration(
      this.configurationChanged,
      this,
      this.dispos
    );
    this.configurationChanged();
  }

  private registerExtensionLanguageProvider(
    description: LangDesc,
    onCompletionAccepted: (item: vscode.CompletionItem) => void
  ) {
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

  private getAllModeIds(descriptions: LangDesc[], plugins: Plugins) {
    const allModeIds = flatten([
      ...descriptions.map((x) => x.modes),
      ...plugins.plugins.map((x) => x.languages),
    ]);
    return allModeIds;
  }

  public get serviceClient(): ServiceClient {
    return this.client;
  }

  public reloadProjects(): void {
    this.client.executeNoResponse('reloadProjects', null);
    this.triggerAllDiagnostics();
  }

  public async handles(resource: vscode.Uri): Promise<boolean> {
    const provider = await this.findLanguage(resource);
    if (provider) {
      return true;
    }
    return this.client.buffer.handles(resource);
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
    kind: DiagKind,
    resource: vscode.Uri,
    diagnostics: Proto.Diagnostic[]
  ): Promise<void> {
    const language = await this.findLanguage(resource);
    if (language) {
      language.diagnosticsReceived(
        kind,
        resource,
        this.createMarkerDatas(diagnostics, language.diagSource)
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
      if (!language) return;
      language.configFileDiagnosticsReceived(
        this.client.toResource(body.configFile),
        body.diagnostics.map((tsDiag) => {
          const range =
            tsDiag.start && tsDiag.end
              ? qc.Range.fromTextSpan(tsDiag)
              : new vscode.Range(0, 0, 0, 1);
          const diagnostic = new vscode.Diagnostic(
            range,
            body.diagnostics[0].text,
            this.getDiagnosticSeverity(tsDiag)
          );
          diagnostic.source = language.diagSource;
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
      qc.Position.fromLocation(start),
      qc.Position.fromLocation(end)
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
            qc.Location.fromTextSpan(this.client.toResource(span.file), span),
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
