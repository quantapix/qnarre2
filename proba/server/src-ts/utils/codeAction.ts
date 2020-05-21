import * as vscode from 'vscode';
import type * as proto from '../protocol';

import * as qc from './convert';
import * as qs from '../service';

export function getEditForCodeAction(c: qs.IServiceClient, a: proto.CodeAction) {
  return a.changes?.length ? qc.WorkspaceEdit.fromFileCodeEdits(c, a.changes) : undefined;
}

export async function applyCodeAction(
  c: qs.IServiceClient,
  a: proto.CodeAction,
  ct: vscode.CancellationToken
) {
  const e = getEditForCodeAction(c, a);
  if (e) {
    if (!(await vscode.workspace.applyEdit(e))) return false;
  }
  return applyCodeActionCommands(c, a.commands, ct);
}

export async function applyCodeActionCommands(
  c: qs.IServiceClient,
  cs: ReadonlyArray<{}> | undefined,
  ct: vscode.CancellationToken
) {
  if (cs?.length) {
    for (const command of cs) {
      await c.execute('applyCodeActionCommand', { command }, ct);
    }
  }
  return true;
}
