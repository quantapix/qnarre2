import * as nls from 'vscode-nls';
import * as vsc from 'vscode';
import type * as proto from '../protocol';

import * as qs from '../service';
import * as qx from '../utils/extras';
import * as qr from '../utils/registration';
import * as qc from '../utils/convert';
import { FileConfigs } from '../utils/configs';
import { TelemetryReporter } from '../utils/telemetry';
import * as qu from '../utils';

const localize = nls.loadMessageBundle();

class OrganizeImports implements qx.Command {
  static readonly Id = '_typescript.organizeImports';
  readonly id = OrganizeImports.Id;

  constructor(
    private readonly client: qs.IServiceClient,
    private readonly telemetry: TelemetryReporter
  ) {}

  async execute(file: string): Promise<boolean> {
    this.telemetry.logTelemetry('organizeImports.execute', {});
    const args: proto.OrganizeImportsRequestArgs = {
      scope: {
        type: 'file',
        args: {
          file,
        },
      },
    };
    const response = await this.client.interruptGetErr(() =>
      this.client.execute('organizeImports', args, qx.nulToken)
    );
    if (response.type !== 'response' || !response.body) return false;
    const edits = qc.WorkspaceEdit.fromFileCodeEdits(this.client, response.body);
    return vsc.workspace.applyEdit(edits);
  }
}

export class ImportsAction implements vsc.CodeActionProvider {
  static readonly minApi = qr.API.default;

  constructor(
    private readonly client: qs.IServiceClient,
    public commandManager: qx.Commands,
    private readonly fileConfigManager: FileConfigs,
    public telemetry: TelemetryReporter
  ) {
    commandManager.register(new OrganizeImports(client, telemetry));
  }

  readonly metadata: vsc.CodeActionProviderMetadata = {
    providedCodeActionKinds: [vsc.CodeActionKind.SourceOrganizeImports],
  };

  provideCodeActions(
    document: vsc.TextDocument,
    _range: vsc.Range,
    context: vsc.CodeActionContext,
    ct: vsc.CancellationToken
  ): vsc.CodeAction[] {
    const file = this.client.toOpenedPath(document);
    if (!file) return [];
    if (
      !context.only ||
      !context.only.contains(vsc.CodeActionKind.SourceOrganizeImports)
    ) {
      return [];
    }
    this.fileConfigManager.ensureConfigurationForDocument(document, ct);
    const action = new vsc.CodeAction(
      localize('organizeImportsAction.title', 'Organize Imports'),
      vsc.CodeActionKind.SourceOrganizeImports
    );
    action.command = { title: '', command: OrganizeImports.Id, arguments: [file] };
    return [action];
  }
}

export function register(
  selector: vsc.DocumentSelector,
  client: qs.IServiceClient,
  commandManager: qx.Commands,
  fileConfigurationManager: FileConfigs,
  telemetry: TelemetryReporter
) {
  return new qr.VersionDependent(client, ImportsAction.minApi, () => {
    const organizeImportsProvider = new ImportsAction(
      client,
      commandManager,
      fileConfigurationManager,
      telemetry
    );
    return vsc.languages.registerCodeActionsProvider(
      selector,
      organizeImportsProvider,
      organizeImportsProvider.metadata
    );
  });
}
