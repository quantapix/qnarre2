import * as nls from 'vscode-nls';
import * as vsc from 'vscode';
import type * as proto from '../protocol';

import { Diags } from '../utils/diagnostic';
import { FileConfigs } from '../utils/configs';
import { fix, codes } from '../utils/names';
import * as qc from '../utils/convert';
import * as qr from '../utils/registration';
import * as qs from '../service';

const localize = nls.loadMessageBundle();

interface AutoFix {
  readonly code: number;
  readonly fixName: string;
}

async function buildIndividualFixes(
  fixes: readonly AutoFix[],
  edit: vsc.WorkspaceEdit,
  client: qs.IServiceClient,
  file: string,
  diagnostics: readonly vsc.Diagnostic[],
  ct: vsc.CancellationToken
): Promise<void> {
  for (const diagnostic of diagnostics) {
    for (const { code, fixName } of fixes) {
      if (ct.isCancellationRequested) return;
      if (diagnostic.code !== code) continue;
      const args: proto.CodeFixRequestArgs = {
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
  edit: vsc.WorkspaceEdit,
  client: qs.IServiceClient,
  file: string,
  diagnostics: readonly vsc.Diagnostic[],
  ct: vsc.CancellationToken
): Promise<void> {
  for (const diagnostic of diagnostics) {
    for (const { code, fixName } of fixes) {
      if (ct.isCancellationRequested) return;
      if (diagnostic.code !== code) continue;
      const args: proto.CodeFixRequestArgs = {
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
      const combinedArgs: proto.GetCombinedCodeFixRequestArgs = {
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

abstract class SourceAction extends vsc.CodeAction {
  abstract async build(
    client: qs.IServiceClient,
    file: string,
    diagnostics: readonly vsc.Diagnostic[],
    ct: vsc.CancellationToken
  ): Promise<void>;
}

class SourceFixAll extends SourceAction {
  static readonly kind = vsc.CodeActionKind.SourceFixAll.append('ts');
  constructor() {
    super(localize('autoFix.label', 'Fix All'), SourceFixAll.kind);
  }

  async build(
    client: qs.IServiceClient,
    file: string,
    diagnostics: readonly vsc.Diagnostic[],
    ct: vsc.CancellationToken
  ): Promise<void> {
    this.edit = new vsc.WorkspaceEdit();
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
  static readonly kind = vsc.CodeActionKind.Source.append('removeUnused').append('ts');

  constructor() {
    super(
      localize('autoFix.unused.label', 'Remove all unused code'),
      SourceRemoveUnused.kind
    );
  }

  async build(
    client: qs.IServiceClient,
    file: string,
    diagnostics: readonly vsc.Diagnostic[],
    ct: vsc.CancellationToken
  ): Promise<void> {
    this.edit = new vsc.WorkspaceEdit();
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
  static readonly kind = vsc.CodeActionKind.Source.append('addMissingImports').append(
    'ts'
  );

  constructor() {
    super(
      localize('autoFix.missingImports.label', 'Add all missing imports'),
      SourceAddMissingImports.kind
    );
  }

  async build(
    client: qs.IServiceClient,
    file: string,
    diagnostics: readonly vsc.Diagnostic[],
    ct: vsc.CancellationToken
  ): Promise<void> {
    this.edit = new vsc.WorkspaceEdit();
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

class TypeScriptAutoFixProvider implements vsc.CodeActionProvider {
  public static readonly metadata: vsc.CodeActionProviderMetadata = {
    providedCodeActionKinds: [
      SourceFixAll.kind,
      SourceRemoveUnused.kind,
      SourceAddMissingImports.kind,
    ],
  };

  constructor(
    private readonly client: qs.IServiceClient,
    private readonly fileConfigurationManager: FileConfigs,
    private readonly diagnosticsManager: Diags
  ) {}

  public async provideCodeActions(
    document: vsc.TextDocument,
    _range: vsc.Range,
    context: vsc.CodeActionContext,
    ct: vsc.CancellationToken
  ): Promise<vsc.CodeAction[] | undefined> {
    if (!context.only || !vsc.CodeActionKind.Source.intersects(context.only)) return;
    const file = this.client.toOpenedPath(document);
    if (!file) return;
    const actions = this.getFixAllActions(context.only);
    if (this.client.buffer.hasDiags(document.uri)) return actions;
    const diagnostics = this.diagnosticsManager.diagnostics(document.uri);
    if (!diagnostics.length) return actions;
    await this.fileConfigurationManager.ensureConfigurationForDocument(document, ct);
    if (ct.isCancellationRequested) return;
    await Promise.all(
      actions.map((action) => action.build(this.client, file, diagnostics, ct))
    );
    return actions;
  }

  private getFixAllActions(only: vsc.CodeActionKind): SourceAction[] {
    const fixes = [];
    if (only.intersects(SourceFixAll.kind)) fixes.push(new SourceFixAll());
    if (only.intersects(SourceRemoveUnused.kind)) fixes.push(new SourceRemoveUnused());
    if (only.intersects(SourceAddMissingImports.kind))
      fixes.push(new SourceAddMissingImports());
    return fixes;
  }
}

export function register(
  s: vsc.DocumentSelector,
  c: qs.IServiceClient,
  cfgs: FileConfigs,
  diags: Diags
) {
  return new qr.VersionDependent(c, qr.API.default, () =>
    vsc.languages.registerCodeActionsProvider(
      s,
      new TypeScriptAutoFixProvider(c, cfgs, diags),
      TypeScriptAutoFixProvider.metadata
    )
  );
}
