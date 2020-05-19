import * as path from 'path';
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import type * as Proto from '../protocol';
import * as qc from '../utils/convert';
import FileConfigs from './fileConfigurationManager';
import { ITypeScriptServiceClient, ServerResponse } from '../service';

const localize = nls.loadMessageBundle();

class TypeScriptRenameProvider implements vscode.RenameProvider {
  constructor(
    private readonly client: ITypeScriptServiceClient,
    private readonly configs: FileConfigs
  ) {}

  async prepareRename(
    d: vscode.TextDocument,
    p: vscode.Position,
    ct: vscode.CancellationToken
  ): Promise<vscode.Range | null> {
    const r = await this.execRename(d, p, ct);
    if (r?.type !== 'r' || !r.body) return null;
    const i = r.body.info;
    if (!i.canRename) return Promise.reject<vscode.Range>(i.localizedErrorMessage);
    return qc.Range.fromTextSpan(i.triggerSpan);
  }

  async provideRenameEdits(
    d: vscode.TextDocument,
    p: vscode.Position,
    newName: string,
    ct: vscode.CancellationToken
  ): Promise<vscode.WorkspaceEdit | null> {
    const r = await this.execRename(d, p, ct);
    if (!r || r.type !== 'response' || !r.body) return null;
    const i = r.body.info;
    if (!i.canRename) {
      return Promise.reject<vscode.WorkspaceEdit>(i.localizedErrorMessage);
    }
    if (i.fileToRename) {
      const es = await this.renameFile(i.fileToRename, newName, ct);
      if (es) return es;
      return Promise.reject<vscode.WorkspaceEdit>(
        localize('fileRenameFail', 'Error while renaming')
      );
    }
    return this.updateLocs(r.body.locs, newName);
  }

  async execRename(
    d: vscode.TextDocument,
    p: vscode.Position,
    ct: vscode.CancellationToken
  ): Promise<ServerResponse.Response<Proto.RenameResponse> | undefined> {
    const file = this.client.toOpenedFilePath(d);
    if (!file) return;
    const args: Proto.RenameRequestArgs = {
      ...qc.Position.toFileLocationRequestArgs(file, p),
      findInStrings: false,
      findInComments: false,
    };
    return this.client.interruptGetErr(() => {
      this.configs.ensureConfigurationForDocument(d, ct);
      return this.client.execute('rename', args, ct);
    });
  }

  private updateLocs(gs: ReadonlyArray<Proto.SpanGroup>, n: string) {
    const e = new vscode.WorkspaceEdit();
    for (const g of gs) {
      const r = this.client.toResource(g.file);
      for (const s of g.locs) {
        e.replace(
          r,
          qc.Range.fromTextSpan(s),
          (s.prefixText || '') + n + (s.suffixText || '')
        );
      }
    }
    return e;
  }

  private async renameFile(
    f: string,
    n: string,
    ct: vscode.CancellationToken
  ): Promise<vscode.WorkspaceEdit | undefined> {
    if (!path.extname(n)) n += path.extname(f);
    const d = path.dirname(f);
    const p = path.join(d, n);
    const args: Proto.GetEditsForFileRenameRequestArgs & { file: string } = {
      file: f,
      oldFilePath: f,
      newFilePath: p,
    };
    const r = await this.client.execute('getEditsForFileRename', args, ct);
    if (r.type !== 'response' || !r.body) return;
    const es = qc.WorkspaceEdit.fromFileCodeEdits(this.client, r.body);
    es.renameFile(vscode.Uri.file(f), vscode.Uri.file(p));
    return es;
  }
}

export function register(
  s: vscode.DocumentSelector,
  c: ITypeScriptServiceClient,
  cs: FileConfigs
) {
  return vscode.languages.registerRenameProvider(s, new TypeScriptRenameProvider(c, cs));
}
