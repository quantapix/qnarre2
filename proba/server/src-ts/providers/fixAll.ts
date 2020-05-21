import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import type * as Proto from '../protocol';
import { IServiceClient } from '../service';
import API from '../utils/api';
import { VersionDependentRegistration } from '../utils/dependentRegistration';
import { fix, codes } from '../utils/names';
import * as qc from '../utils/convert';
import { DiagnosticsManager } from './diagnostics';
import { FileConfigs } from './configs';

const localize = nls.loadMessageBundle();

interface AutoFix {
  readonly code: number;
  readonly fixName: string;
}

async function buildIndividualFixes(
  fixes: readonly AutoFix[],
  edit: vscode.WorkspaceEdit,
  client: IServiceClient,
  file: string,
  diagnostics: readonly vscode.Diagnostic[],
  ct: vscode.CancellationToken
): Promise<void> {
  for (const diagnostic of diagnostics) {
    for (const { code, fixName } of fixes) {
      if (ct.isCancellationRequested) return;
      if (diagnostic.code !== code) continue;
      const args: Proto.CodeFixRequestArgs = {
        ...qc.Range.toFileRangeRequestArgs(file, diagnostic.range),
        errorCodes: [+diagnostic.code],
      };
      const response = await client.execute('getCodeFixes', args, ct);
      if (response.type !== 'response') continue;
      const fix = response.body?.find((fix) => fix.fixName === fixName);
      if (fix) {
        qc.WorkspaceEdit.withFileCodeEdits(edit, client, fix.changes);
        break;
      }
    }
  }
}

async function buildCombinedFix(
  fixes: readonly AutoFix[],
  edit: vscode.WorkspaceEdit,
  client: IServiceClient,
  file: string,
  diagnostics: readonly vscode.Diagnostic[],
  ct: vscode.CancellationToken
): Promise<void> {
  for (const diagnostic of diagnostics) {
    for (const { code, fixName } of fixes) {
      if (ct.isCancellationRequested) return;
      if (diagnostic.code !== code) continue;
      const args: Proto.CodeFixRequestArgs = {
        ...qc.Range.toFileRangeRequestArgs(file, diagnostic.range),
        errorCodes: [+diagnostic.code],
      };
      const response = await client.execute('getCodeFixes', args, ct);
      if (response.type !== 'response' || !response.body?.length) continue;
      const fix = response.body?.find((fix) => fix.fixName === fixName);
      if (!fix) continue;
      if (!fix.fixId) {
        qc.WorkspaceEdit.withFileCodeEdits(edit, client, fix.changes);
        return;
      }
      const combinedArgs: Proto.GetCombinedCodeFixRequestArgs = {
        scope: {
          type: 'file',
          args: { file },
        },
        fixId: fix.fixId,
      };
      const combinedResponse = await client.execute(
        'getCombinedCodeFix',
        combinedArgs,
        ct
      );
      if (combinedResponse.type !== 'response' || !combinedResponse.body) return;
      qc.WorkspaceEdit.withFileCodeEdits(edit, client, combinedResponse.body.changes);
      return;
    }
  }
}

abstract class SourceAction extends vscode.CodeAction {
  abstract async build(
    client: IServiceClient,
    file: string,
    diagnostics: readonly vscode.Diagnostic[],
    ct: vscode.CancellationToken
  ): Promise<void>;
}

class SourceFixAll extends SourceAction {
  static readonly kind = vscode.CodeActionKind.SourceFixAll.append('ts');
  constructor() {
    super(localize('autoFix.label', 'Fix All'), SourceFixAll.kind);
  }

  async build(
    client: IServiceClient,
    file: string,
    diagnostics: readonly vscode.Diagnostic[],
    ct: vscode.CancellationToken
  ): Promise<void> {
    this.edit = new vscode.WorkspaceEdit();
    await buildIndividualFixes(
      [
        {
          code: codes.incorrectlyImplementsInterface,
          fixName: fix.classIncorrectlyImplementsInterface,
        },
        {
          code: codes.asyncOnlyAllowedInAsyncFunctions,
          fixName: fix.awaitInSyncFunction,
        },
      ],
      this.edit,
      client,
      file,
      diagnostics,
      ct
    );

    await buildCombinedFix(
      [{ code: codes.unreachableCode, fixName: fix.unreachableCode }],
      this.edit,
      client,
      file,
      diagnostics,
      ct
    );
  }
}

class SourceRemoveUnused extends SourceAction {
  static readonly kind = vscode.CodeActionKind.Source.append('removeUnused').append('ts');

  constructor() {
    super(
      localize('autoFix.unused.label', 'Remove all unused code'),
      SourceRemoveUnused.kind
    );
  }

  async build(
    client: IServiceClient,
    file: string,
    diagnostics: readonly vscode.Diagnostic[],
    ct: vscode.CancellationToken
  ): Promise<void> {
    this.edit = new vscode.WorkspaceEdit();
    await buildCombinedFix(
      [
        {
          code: codes.variableDeclaredButNeverUsed,
          fixName: fix.unusedIdentifier,
        },
      ],
      this.edit,
      client,
      file,
      diagnostics,
      ct
    );
  }
}

class SourceAddMissingImports extends SourceAction {
  static readonly kind = vscode.CodeActionKind.Source.append('addMissingImports').append(
    'ts'
  );

  constructor() {
    super(
      localize('autoFix.missingImports.label', 'Add all missing imports'),
      SourceAddMissingImports.kind
    );
  }

  async build(
    client: IServiceClient,
    file: string,
    diagnostics: readonly vscode.Diagnostic[],
    ct: vscode.CancellationToken
  ): Promise<void> {
    this.edit = new vscode.WorkspaceEdit();
    await buildCombinedFix(
      codes.cannotFindName.map((code) => ({ code, fixName: fix.fixImport })),
      this.edit,
      client,
      file,
      diagnostics,
      ct
    );
  }
}

class TypeScriptAutoFixProvider implements vscode.CodeActionProvider {
  public static readonly metadata: vscode.CodeActionProviderMetadata = {
    providedCodeActionKinds: [
      SourceFixAll.kind,
      SourceRemoveUnused.kind,
      SourceAddMissingImports.kind,
    ],
  };

  constructor(
    private readonly client: IServiceClient,
    private readonly fileConfigurationManager: FileConfigs,
    private readonly diagnosticsManager: DiagnosticsManager
  ) {}

  public async provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext,
    ct: vscode.CancellationToken
  ): Promise<vscode.CodeAction[] | undefined> {
    if (!context.only || !vscode.CodeActionKind.Source.intersects(context.only)) return;
    const file = this.client.toOpenedPath(document);
    if (!file) return;
    const actions = this.getFixAllActions(context.only);
    if (this.client.bufferSync.hasDiags(document.uri)) return actions;
    const diagnostics = this.diagnosticsManager.getDiagnostics(document.uri);
    if (!diagnostics.length) return actions;
    await this.fileConfigurationManager.ensureConfigurationForDocument(document, ct);
    if (ct.isCancellationRequested) return;
    await Promise.all(
      actions.map((action) => action.build(this.client, file, diagnostics, ct))
    );
    return actions;
  }

  private getFixAllActions(only: vscode.CodeActionKind): SourceAction[] {
    const fixes = [];
    if (only.intersects(SourceFixAll.kind)) fixes.push(new SourceFixAll());
    if (only.intersects(SourceRemoveUnused.kind)) fixes.push(new SourceRemoveUnused());
    if (only.intersects(SourceAddMissingImports.kind))
      fixes.push(new SourceAddMissingImports());
    return fixes;
  }
}

export function register(
  s: vscode.DocumentSelector,
  c: IServiceClient,
  cfgs: FileConfigs,
  diags: DiagnosticsManager
) {
  return new VersionDependentRegistration(c, API.v300, () =>
    vscode.languages.registerCodeActionsProvider(
      s,
      new TypeScriptAutoFixProvider(c, cfgs, diags),
      TypeScriptAutoFixProvider.metadata
    )
  );
}
