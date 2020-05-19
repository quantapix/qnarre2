import * as vscode from 'vscode';
import type * as Proto from '../protocol';
import { ITypeScriptServiceClient } from '../typescriptService';
import * as typeConverters from './convert';

export function getEditForCodeAction(
  client: ITypeScriptServiceClient,
  action: Proto.CodeAction
) {
  return action.changes && action.changes.length
    ? typeConverters.WorkspaceEdit.fromFileCodeEdits(client, action.changes)
    : undefined;
}

export async function applyCodeAction(
  client: ITypeScriptServiceClient,
  action: Proto.CodeAction,
  token: vscode.CancellationToken
) {
  const e = getEditForCodeAction(client, action);
  if (e) {
    if (!(await vscode.workspace.applyEdit(e))) return false;
  }
  return applyCodeActionCommands(client, action.commands, token);
}

export async function applyCodeActionCommands(
  client: ITypeScriptServiceClient,
  commands: ReadonlyArray<{}> | undefined,
  token: vscode.CancellationToken
) {
  if (commands && commands.length) {
    for (const command of commands) {
      await client.execute('applyCodeActionCommand', { command }, token);
    }
  }
  return true;
}
