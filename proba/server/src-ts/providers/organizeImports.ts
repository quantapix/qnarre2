/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import type * as Proto from '../protocol';
import { IServiceClient } from '../typescriptService';
import API from '../utils/api';
import { Command, Commands } from '../utils/extras';
import { VersionDependent } from '../utils/registration';
import * as typeconverts from '../utils/convert';
import FileConfigs from './configs';
import { TelemetryReporter } from '../utils/telemetry';
import { nulToken } from '../utils/cancellation';

const localize = nls.loadMessageBundle();

class OrganizeImportsCommand implements Command {
  public static readonly Id = '_typescript.organizeImports';

  public readonly id = OrganizeImportsCommand.Id;

  constructor(
    private readonly client: IServiceClient,
    private readonly telemetry: TelemetryReporter
  ) {}

  public async execute(file: string): Promise<boolean> {
    /* __GDPR__
			"organizeImports.execute" : {
				"${include}": [
					"${TypeScriptCommonProperties}"
				]
			}
		*/
    this.telemetry.logTelemetry('organizeImports.execute', {});

    const args: Proto.OrganizeImportsRequestArgs = {
      scope: {
        type: 'file',
        args: {
          file,
        },
      },
    };
    const response = await this.client.interruptGetErr(() =>
      this.client.execute('organizeImports', args, nulToken)
    );
    if (response.type !== 'response' || !response.body) {
      return false;
    }

    const edits = typeconverts.WorkspaceEdit.fromFileCodeEdits(
      this.client,
      response.body
    );
    return vscode.workspace.applyEdit(edits);
  }
}

export class OrganizeImportsCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly minApi = API.v280;

  public constructor(
    private readonly client: IServiceClient,
    commandManager: Commands,
    private readonly fileConfigManager: FileConfigs,
    telemetry: TelemetryReporter
  ) {
    commandManager.register(new OrganizeImportsCommand(client, telemetry));
  }

  public readonly metadata: vscode.CodeActionProviderMetadata = {
    providedCodeActionKinds: [vscode.CodeActionKind.SourceOrganizeImports],
  };

  public provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext,
    ct: vscode.CancellationToken
  ): vscode.CodeAction[] {
    const file = this.client.toOpenedPath(document);
    if (!file) {
      return [];
    }

    if (
      !context.only ||
      !context.only.contains(vscode.CodeActionKind.SourceOrganizeImports)
    ) {
      return [];
    }

    this.fileConfigManager.ensureConfigurationForDocument(document, token);

    const action = new vscode.CodeAction(
      localize('organizeImportsAction.title', 'Organize Imports'),
      vscode.CodeActionKind.SourceOrganizeImports
    );
    action.command = { title: '', command: OrganizeImportsCommand.Id, arguments: [file] };
    return [action];
  }
}

export function register(
  selector: vscode.DocumentSelector,
  client: IServiceClient,
  commandManager: Commands,
  fileConfigurationManager: FileConfigs,
  telemetry: TelemetryReporter
) {
  return new VersionDependent(client, OrganizeImportsCodeActionProvider.minApi, () => {
    const organizeImportsProvider = new OrganizeImportsCodeActionProvider(
      client,
      commandManager,
      fileConfigurationManager,
      telemetry
    );
    return vscode.languages.registerCodeActionsProvider(
      selector,
      organizeImportsProvider,
      organizeImportsProvider.metadata
    );
  });
}
