/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import type * as Proto from '../protocol';
import { IServiceClient } from '../typescriptService';
import API from '../utils/api';
import { nulToken } from '../utils/cancellation';
import { applyCodeActionCommands, getEditForCodeAction } from '../utils/codeAction';
import { Command, Commands } from '../utils/extras';
import * as fixNames from '../utils/names';
import { memoize } from '../utils/memoize';
import { TelemetryReporter } from '../utils/telemetry';
import * as typeConverters from '../utils/convert';
import { Diags } from '../utils/diagnostic';
import FileConfigs from '../utils/configs';

const localize = nls.loadMessageBundle();

class ApplyCodeActionCommand implements Command {
  public static readonly ID = '_typescript.applyCodeActionCommand';
  public readonly id = ApplyCodeActionCommand.ID;

  constructor(
    private readonly client: IServiceClient,
    private readonly telemetry: TelemetryReporter
  ) {}

  public async execute(action: Proto.CodeFixAction): Promise<boolean> {
    /* __GDPR__
			"quickFix.execute" : {
				"fixName" : { "classification": "PublicNonPersonalData", "purpose": "FeatureInsight" },
				"${include}": [
					"${TypeScriptCommonProperties}"
				]
			}
		*/
    this.telemetry.logTelemetry('quickFix.execute', {
      fixName: action.fixName,
    });

    return applyCodeActionCommands(this.client, action.commands, nulToken);
  }
}

class ApplyFixAllCodeAction implements Command {
  public static readonly ID = '_typescript.applyFixAllCodeAction';
  public readonly id = ApplyFixAllCodeAction.ID;

  constructor(
    private readonly client: IServiceClient,
    private readonly telemetry: TelemetryReporter
  ) {}

  public async execute(file: string, tsAction: Proto.CodeFixAction): Promise<void> {
    if (!tsAction.fixId) {
      return;
    }

    /* __GDPR__
			"quickFixAll.execute" : {
				"fixName" : { "classification": "PublicNonPersonalData", "purpose": "FeatureInsight" },
				"${include}": [
					"${TypeScriptCommonProperties}"
				]
			}
		*/
    this.telemetry.logTelemetry('quickFixAll.execute', {
      fixName: tsAction.fixName,
    });

    const args: Proto.GetCombinedCodeFixRequestArgs = {
      scope: {
        type: 'file',
        args: { file },
      },
      fixId: tsAction.fixId,
    };

    const response = await this.client.execute('getCombinedCodeFix', args, nulToken);
    if (response.type !== 'response' || !response.body) {
      return;
    }

    const edit = typeConverters.WorkspaceEdit.fromFileCodeEdits(
      this.client,
      response.body.changes
    );
    await vscode.workspace.applyEdit(edit);
    await applyCodeActionCommands(this.client, response.body.commands, nulToken);
  }
}

/**
 * Unique set of diagnostics keyed on diagnostic range and error code.
 */
class DiagnosticsSet {
  public static from(diagnostics: vscode.Diagnostic[]) {
    const values = new Map<string, vscode.Diagnostic>();
    for (const diagnostic of diagnostics) {
      values.set(DiagnosticsSet.key(diagnostic), diagnostic);
    }
    return new DiagnosticsSet(values);
  }

  private static key(diagnostic: vscode.Diagnostic) {
    const { start, end } = diagnostic.range;
    return `${diagnostic.code}-${start.line},${start.character}-${end.line},${end.character}`;
  }

  private constructor(private readonly _values: Map<string, vscode.Diagnostic>) {}

  public get values(): Iterable<vscode.Diagnostic> {
    return this._values.values();
  }

  public get size() {
    return this._values.size;
  }
}

class VsCodeCodeAction extends vscode.CodeAction {
  constructor(
    public readonly tsAction: Proto.CodeFixAction,
    title: string,
    kind: vscode.CodeActionKind,
    public readonly isFixAll: boolean
  ) {
    super(title, kind);
  }
}

class CodeActionSet {
  private readonly _actions = new Set<VsCodeCodeAction>();
  private readonly _fixAllActions = new Map<{}, VsCodeCodeAction>();

  public get values(): Iterable<VsCodeCodeAction> {
    return this._actions;
  }

  public addAction(action: VsCodeCodeAction) {
    this._actions.add(action);
  }

  public addFixAllAction(fixId: {}, action: VsCodeCodeAction) {
    const existing = this._fixAllActions.get(fixId);
    if (existing) {
      // reinsert action at back of actions list
      this._actions.delete(existing);
    }
    this.addAction(action);
    this._fixAllActions.set(fixId, action);
  }

  public hasFixAllAction(fixId: {}) {
    return this._fixAllActions.has(fixId);
  }
}

class SupportedCodeActionProvider {
  public constructor(private readonly client: IServiceClient) {}

  public async getFixableDiagnosticsForContext(
    context: vscode.CodeActionContext
  ): Promise<DiagnosticsSet> {
    const fixableCodes = await this.fixableDiagnosticCodes;
    return DiagnosticsSet.from(
      context.diagnostics.filter(
        (diagnostic) =>
          typeof diagnostic.code !== 'undefined' && fixableCodes.has(diagnostic.code + '')
      )
    );
  }

  @memoize
  private get fixableDiagnosticCodes(): Thenable<Set<string>> {
    return this.client
      .execute('getSupportedCodeFixes', null, nulToken)
      .then((response) => (response.type === 'response' ? response.body || [] : []))
      .then((codes) => new Set(codes));
  }
}

class TypeScriptQuickFixProvider implements vscode.CodeActionProvider {
  public static readonly metadata: vscode.CodeActionProviderMetadata = {
    providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
  };

  private readonly supportedCodeActionProvider: SupportedCodeActionProvider;

  constructor(
    private readonly client: IServiceClient,
    private readonly formattingConfigurationManager: FileConfigs,
    commandManager: Commands,
    private readonly diagnosticsManager: Diags,
    telemetry: TelemetryReporter
  ) {
    commandManager.register(new ApplyCodeActionCommand(client, telemetry));
    commandManager.register(new ApplyFixAllCodeAction(client, telemetry));

    this.supportedCodeActionProvider = new SupportedCodeActionProvider(client);
  }

  public async provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext,
    ct: vscode.CancellationToken
  ): Promise<vscode.CodeAction[]> {
    const file = this.client.toOpenedPath(document);
    if (!file) {
      return [];
    }

    const fixableDiagnostics = await this.supportedCodeActionProvider.getFixableDiagnosticsForContext(
      context
    );
    if (!fixableDiagnostics.size) {
      return [];
    }

    if (this.client.buffer.hasPendingDiagnostics(document.uri)) {
      return [];
    }

    await this.formattingConfigurationManager.ensureConfigurationForDocument(
      document,
      token
    );

    const results = new CodeActionSet();
    for (const diagnostic of fixableDiagnostics.values) {
      await this.getFixesForDiagnostic(document, file, diagnostic, results, token);
    }

    const allActions = Array.from(results.values);
    for (const action of allActions) {
      action.isPreferred = isPreferredFix(action, allActions);
    }
    return allActions;
  }

  private async getFixesForDiagnostic(
    document: vscode.TextDocument,
    file: string,
    diagnostic: vscode.Diagnostic,
    results: CodeActionSet,
    ct: vscode.CancellationToken
  ): Promise<CodeActionSet> {
    const args: Proto.CodeFixRequestArgs = {
      ...typeConverters.Range.toFileRangeRequestArgs(file, diagnostic.range),
      errorCodes: [+diagnostic.code!],
    };
    const response = await this.client.execute('getCodeFixes', args, token);
    if (response.type !== 'response' || !response.body) {
      return results;
    }

    for (const tsCodeFix of response.body) {
      this.addAllFixesForTsCodeAction(results, document, file, diagnostic, tsCodeFix);
    }
    return results;
  }

  private addAllFixesForTsCodeAction(
    results: CodeActionSet,
    document: vscode.TextDocument,
    file: string,
    diagnostic: vscode.Diagnostic,
    tsAction: Proto.CodeFixAction
  ): CodeActionSet {
    results.addAction(this.getSingleFixForTsCodeAction(diagnostic, tsAction));
    this.addFixAllForTsCodeAction(results, document, file, diagnostic, tsAction);
    return results;
  }

  private getSingleFixForTsCodeAction(
    diagnostic: vscode.Diagnostic,
    tsAction: Proto.CodeFixAction
  ): VsCodeCodeAction {
    const codeAction = new VsCodeCodeAction(
      tsAction,
      tsAction.description,
      vscode.CodeActionKind.QuickFix,
      false
    );
    codeAction.edit = getEditForCodeAction(this.client, tsAction);
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
    document: vscode.TextDocument,
    file: string,
    diagnostic: vscode.Diagnostic,
    tsAction: Proto.CodeFixAction
  ): CodeActionSet {
    if (
      !tsAction.fixId ||
      this.client.api.lt(API.v270) ||
      results.hasFixAllAction(tsAction.fixId)
    ) {
      return results;
    }

    // Make sure there are multiple diagnostics of the same type in the file
    if (
      !this.diagnosticsManager.getDiagnostics(document.uri).some((x) => {
        if (x === diagnostic) {
          return false;
        }
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
      vscode.CodeActionKind.QuickFix,
      true
    );
    action.diagnostics = [diagnostic];
    action.command = {
      command: ApplyFixAllCodeAction.ID,
      arguments: [file, tsAction],
      title: '',
    };
    results.addFixAllAction(tsAction.fixId, action);
    return results;
  }
}

// Some fix all actions can actually fix multiple differnt diagnostics. Make sure we still show the fix all action
// in such cases
const fixAllErrorCodes = new Map<number, number>([
  // Missing async
  [2339, 2339],
  [2345, 2339],
]);

const preferredFixes = new Map<
  string,
  { readonly value: number; readonly thereCanOnlyBeOne?: boolean }
>([
  [fixNames.annotateWithTypeFromJSDoc, { value: 1 }],
  [fixNames.constructorForDerivedNeedSuperCall, { value: 1 }],
  [fixNames.extendsInterfaceBecomesImplements, { value: 1 }],
  [fixNames.awaitInSyncFunction, { value: 1 }],
  [fixNames.classIncorrectlyImplementsInterface, { value: 1 }],
  [fixNames.unreachableCode, { value: 1 }],
  [fixNames.unusedIdentifier, { value: 1 }],
  [fixNames.forgottenThisPropertyAccess, { value: 1 }],
  [fixNames.spelling, { value: 2 }],
  [fixNames.addMissingAwait, { value: 1 }],
  [fixNames.fixImport, { value: 0, thereCanOnlyBeOne: true }],
]);

function isPreferredFix(
  action: VsCodeCodeAction,
  allActions: readonly VsCodeCodeAction[]
): boolean {
  if (action.isFixAll) {
    return false;
  }

  const fixPriority = preferredFixes.get(action.tsAction.fixName);
  if (!fixPriority) {
    return false;
  }

  return allActions.every((otherAction) => {
    if (otherAction === action) {
      return true;
    }

    if (otherAction.isFixAll) {
      return true;
    }

    const otherFixPriority = preferredFixes.get(otherAction.tsAction.fixName);
    if (!otherFixPriority || otherFixPriority.value < fixPriority.value) {
      return true;
    }

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
  selector: vscode.DocumentSelector,
  client: IServiceClient,
  fileConfigurationManager: FileConfigs,
  commandManager: Commands,
  diagnosticsManager: Diags,
  telemetry: TelemetryReporter
) {
  return vscode.languages.registerCodeActionsProvider(
    selector,
    new TypeScriptQuickFixProvider(
      client,
      fileConfigurationManager,
      commandManager,
      diagnosticsManager,
      telemetry
    ),
    TypeScriptQuickFixProvider.metadata
  );
}