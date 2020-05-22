import * as nls from 'vscode-nls';
import * as vsc from 'vscode';
import type * as proto from '../protocol';

import * as qs from '../service';
import { applyCodeActionCommands, editForCodeAction } from '../utils/codeAction';
import * as qx from '../utils/extras';
import { fix } from '../utils/names';
import { TelemetryReporter } from '../utils/telemetry';
import * as qu from '../utils';
import * as qc from '../utils/convert';
import { Diags } from '../utils/diagnostic';
import { FileConfigs } from '../utils/configs';

const localize = nls.loadMessageBundle();

class ApplyCodeActionCommand implements qx.Command {
  static readonly ID = '_typescript.applyCodeActionCommand';
  readonly id = ApplyCodeActionCommand.ID;

  constructor(
    private readonly client: qs.IServiceClient,
    private readonly tele: TelemetryReporter
  ) {}

  async execute(action: proto.CodeFixAction): Promise<boolean> {
    this.tele.logTelemetry('quickFix.execute', {
      fixName: action.fixName,
    });
    return applyCodeActionCommands(this.client, action.commands, qx.nulToken);
  }
}

class Apply implements qx.Command {
  static readonly ID = '_typescript.applyFixAllCodeAction';
  readonly id = Apply.ID;

  constructor(
    private readonly client: qs.IServiceClient,
    private readonly tele: TelemetryReporter
  ) {}

  async execute(file: string, tsAction: proto.CodeFixAction): Promise<void> {
    if (!tsAction.fixId) return;
    this.tele.logTelemetry('quickFixAll.execute', { fixName: tsAction.fixName });
    const args: proto.GetCombinedCodeFixRequestArgs = {
      scope: {
        type: 'file',
        args: { file },
      },
      fixId: tsAction.fixId,
    };
    const response = await this.client.execute('getCombinedCodeFix', args, qx.nulToken);
    if (response.type !== 'response' || !response.body) return;
    const edit = qc.WorkspaceEdit.fromFileCodeEdits(this.client, response.body.changes);
    await vsc.workspace.applyEdit(edit);
    await applyCodeActionCommands(this.client, response.body.commands, qx.nulToken);
  }
}

class DiagnosticsSet {
  static from(diagnostics: vsc.Diagnostic[]) {
    const values = new Map<string, vsc.Diagnostic>();
    for (const d of diagnostics) {
      values.set(DiagnosticsSet.key(d), d);
    }
    return new DiagnosticsSet(values);
  }

  private static key(diagnostic: vsc.Diagnostic) {
    const { start, end } = diagnostic.range;
    return `${diagnostic.code}-${start.line},${start.character}-${end.line},${end.character}`;
  }

  private constructor(private readonly _values: Map<string, vsc.Diagnostic>) {}

  get values(): Iterable<vsc.Diagnostic> {
    return this._values.values();
  }

  get size() {
    return this._values.size;
  }
}

class VsCodeCodeAction extends vsc.CodeAction {
  constructor(
    public readonly tsAction: proto.CodeFixAction,
    title: string,
    kind: vsc.CodeActionKind,
    public readonly isFixAll: boolean
  ) {
    super(title, kind);
  }
}

class CodeActionSet {
  private readonly _actions = new Set<VsCodeCodeAction>();
  private readonly _fixAllActions = new Map<{}, VsCodeCodeAction>();

  get values(): Iterable<VsCodeCodeAction> {
    return this._actions;
  }

  addAction(action: VsCodeCodeAction) {
    this._actions.add(action);
  }

  addFixAllAction(fixId: {}, action: VsCodeCodeAction) {
    const existing = this._fixAllActions.get(fixId);
    if (existing) this._actions.delete(existing);

    this.addAction(action);
    this._fixAllActions.set(fixId, action);
  }

  hasFixAllAction(fixId: {}) {
    return this._fixAllActions.has(fixId);
  }
}

class SupportedCodeActionProvider {
  constructor(private readonly client: qs.IServiceClient) {}

  async getFixableDiagnosticsForContext(
    context: vsc.CodeActionContext
  ): Promise<DiagnosticsSet> {
    const fixableCodes = await this.fixableDiagnosticCodes;
    return DiagnosticsSet.from(
      context.diagnostics.filter(
        (diagnostic) =>
          typeof diagnostic.code !== 'undefined' && fixableCodes.has(diagnostic.code + '')
      )
    );
  }

  @qu.memoize
  private get fixableDiagnosticCodes(): Thenable<Set<string>> {
    return this.client
      .execute('getSupportedCodeFixes', null, qx.nulToken)
      .then((response) => (response.type === 'response' ? response.body || [] : []))
      .then((codes) => new Set(codes));
  }
}

class QuickFix implements vsc.CodeActionProvider {
  static readonly metadata: vsc.CodeActionProviderMetadata = {
    providedCodeActionKinds: [vsc.CodeActionKind.QuickFix],
  };

  private readonly supportedCodeActionProvider: SupportedCodeActionProvider;

  constructor(
    private readonly client: qs.IServiceClient,
    private readonly formattingConfigurationManager: FileConfigs,
    commandManager: qx.Commands,
    private readonly diagnosticsManager: Diags,
    tele: TelemetryReporter
  ) {
    commandManager.register(new ApplyCodeActionCommand(client, tele));
    commandManager.register(new Apply(client, tele));
    this.supportedCodeActionProvider = new SupportedCodeActionProvider(client);
  }

  async provideCodeActions(
    document: vsc.TextDocument,
    _range: vsc.Range,
    context: vsc.CodeActionContext,
    ct: vsc.CancellationToken
  ): Promise<vsc.CodeAction[]> {
    const file = this.client.toOpenedPath(document);
    if (!file) return [];
    const fixableDiagnostics = await this.supportedCodeActionProvider.getFixableDiagnosticsForContext(
      context
    );
    if (!fixableDiagnostics.size) return [];
    if (this.client.buffer.hasDiags(document.uri)) return [];
    await this.formattingConfigurationManager.ensureConfigurationForDocument(
      document,
      ct
    );
    const results = new CodeActionSet();
    for (const diagnostic of fixableDiagnostics.values) {
      await this.getFixesForDiagnostic(document, file, diagnostic, results, ct);
    }
    const allActions = Array.from(results.values);
    for (const action of allActions)
      action.isPreferred = isPreferredFix(action, allActions);
    return allActions;
  }

  private async getFixesForDiagnostic(
    document: vsc.TextDocument,
    file: string,
    diagnostic: vsc.Diagnostic,
    results: CodeActionSet,
    ct: vsc.CancellationToken
  ): Promise<CodeActionSet> {
    const args: proto.CodeFixRequestArgs = {
      ...qc.Range.toFileRangeRequestArgs(file, diagnostic.range),
      errorCodes: [+diagnostic.code!],
    };
    const response = await this.client.execute('getCodeFixes', args, ct);
    if (response.type !== 'response' || !response.body) return results;

    for (const tsCodeFix of response.body) {
      this.addAllFixesForTsCodeAction(results, document, file, diagnostic, tsCodeFix);
    }
    return results;
  }

  private addAllFixesForTsCodeAction(
    results: CodeActionSet,
    document: vsc.TextDocument,
    file: string,
    diagnostic: vsc.Diagnostic,
    tsAction: proto.CodeFixAction
  ): CodeActionSet {
    results.addAction(this.getSingleFixForTsCodeAction(diagnostic, tsAction));
    this.addFixAllForTsCodeAction(results, document, file, diagnostic, tsAction);
    return results;
  }

  private getSingleFixForTsCodeAction(
    diagnostic: vsc.Diagnostic,
    tsAction: proto.CodeFixAction
  ): VsCodeCodeAction {
    const codeAction = new VsCodeCodeAction(
      tsAction,
      tsAction.description,
      vsc.CodeActionKind.QuickFix,
      false
    );
    codeAction.edit = editForCodeAction(this.client, tsAction);
    codeAction.diagnostics = [diagnostic];
    codeAction.command = {
      command: ApplyCodeActionCommand.ID,
      arguments: [tsAction],
      title: '',
    };
    return codeAction;
  }

  private addFixAllForTsCodeAction(
    results: CodeActionSet,
    document: vsc.TextDocument,
    file: string,
    diagnostic: vsc.Diagnostic,
    tsAction: proto.CodeFixAction
  ): CodeActionSet {
    if (!tsAction.fixId || results.hasFixAllAction(tsAction.fixId)) return results;

    if (
      !this.diagnosticsManager.diagnostics(document.uri).some((x) => {
        if (x === diagnostic) return false;

        return (
          x.code === diagnostic.code ||
          (fixAllErrorCodes.has(x.code as number) &&
            fixAllErrorCodes.get(x.code as number) ===
              fixAllErrorCodes.get(diagnostic.code as number))
        );
      })
    ) {
      return results;
    }
    const action = new VsCodeCodeAction(
      tsAction,
      tsAction.fixAllDescription ||
        localize('fixAllInFileLabel', '{0} (Fix all in file)', tsAction.description),
      vsc.CodeActionKind.QuickFix,
      true
    );
    action.diagnostics = [diagnostic];
    action.command = {
      command: Apply.ID,
      arguments: [file, tsAction],
      title: '',
    };
    results.addFixAllAction(tsAction.fixId, action);
    return results;
  }
}

const fixAllErrorCodes = new Map<number, number>([
  // Missing async
  [2339, 2339],
  [2345, 2339],
]);

const preferredFixes = new Map<
  string,
  { readonly value: number; readonly thereCanOnlyBeOne?: boolean }
>([
  [fix.annotateWithTypeFromJSDoc, { value: 1 }],
  [fix.constructorForDerivedNeedSuperCall, { value: 1 }],
  [fix.extendsInterfaceBecomesImplements, { value: 1 }],
  [fix.awaitInSyncFunction, { value: 1 }],
  [fix.classIncorrectlyImplementsInterface, { value: 1 }],
  [fix.unreachableCode, { value: 1 }],
  [fix.unusedIdentifier, { value: 1 }],
  [fix.forgottenThisPropertyAccess, { value: 1 }],
  [fix.spelling, { value: 2 }],
  [fix.addMissingAwait, { value: 1 }],
  [fix.fixImport, { value: 0, thereCanOnlyBeOne: true }],
]);

function isPreferredFix(
  action: VsCodeCodeAction,
  allActions: readonly VsCodeCodeAction[]
): boolean {
  if (action.isFixAll) return false;
  const fixPriority = preferredFixes.get(action.tsAction.fixName);
  if (!fixPriority) return false;
  return allActions.every((otherAction) => {
    if (otherAction === action) return true;
    if (otherAction.isFixAll) return true;
    const otherFixPriority = preferredFixes.get(otherAction.tsAction.fixName);
    if (!otherFixPriority || otherFixPriority.value < fixPriority.value) return true;
    if (
      fixPriority.thereCanOnlyBeOne &&
      action.tsAction.fixName === otherAction.tsAction.fixName
    ) {
      return false;
    }
    return true;
  });
}

export function register(
  s: vsc.DocumentSelector,
  c: qs.IServiceClient,
  cfgs: FileConfigs,
  cs: qx.Commands,
  ds: Diags,
  tele: TelemetryReporter
) {
  return vsc.languages.registerCodeActionsProvider(
    s,
    new QuickFix(c, cfgs, cs, ds, tele),
    QuickFix.metadata
  );
}
