import * as vscode from 'vscode';
import type * as Proto from '../protocol';
import { IServiceClient } from '../typescriptService';
import * as typeConverters from './convert';

export function getEditForCodeAction(client: IServiceClient, action: Proto.CodeAction) {
  return action.changes && action.changes.length
    ? typeConverters.WorkspaceEdit.fromFileCodeEdits(client, action.changes)
    : undefined;
}

export async function applyCodeAction(
  client: IServiceClient,
  action: Proto.CodeAction,
  ct: vscode.CancellationToken
) {
  const e = getEditForCodeAction(client, action);
  if (e) {
    if (!(await vscode.workspace.applyEdit(e))) return false;
  }
  return applyCodeActionCommands(client, action.commands, token);
}

export async function applyCodeActionCommands(
  client: IServiceClient,
  commands: ReadonlyArray<{}> | undefined,
  ct: vscode.CancellationToken
) {
  if (commands && commands.length) {
    for (const command of commands) {
      await client.execute('applyCodeActionCommand', { command }, token);
    }
  }
  return true;
}
