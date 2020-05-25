import * as path from 'path';
import * as vsc from 'vscode';
import * as nls from 'vscode-nls';
import type * as proto from '../protocol';

import * as qc from '../utils/convert';
import { FileConfigs } from '../utils/configs';
import * as qs from '../service';

const localize = nls.loadMessageBundle();

class TypeScriptRenameProvider implements vsc.RenameProvider {
  constructor(
    private readonly client: qs.IServiceClient,
    private readonly configs: FileConfigs
  ) {}

  async prepareRename(
    d: vsc.TextDocument,
    p: vsc.Position,
    ct: vsc.CancellationToken
  ): Promise<vsc.Range | null> {
    const r = await this.execRename(d, p, ct);
    if (r?.type !== 'response' || !r.body) return null;
    const i = r.body.info;
    if (!i.canRename) return Promise.reject<vsc.Range>(i.localizedErrorMessage);
    return qc.Range.fromTextSpan(i.triggerSpan);
  }

  async provideRenameEdits(
    d: vsc.TextDocument,
    p: vsc.Position,
    n: string,
    ct: vsc.CancellationToken
  ): Promise<vsc.WorkspaceEdit | null> {
    const r = await this.execRename(d, p, ct);
    if (!r || r.type !== 'response' || !r.body) return null;
    const i = r.body.info;
    if (!i.canRename) return Promise.reject<vsc.WorkspaceEdit>(i.localizedErrorMessage);
    if (i.fileToRename) {
      const es = await this.renameFile(i.fileToRename, n, ct);
      if (es) return es;
      return Promise.reject<vsc.WorkspaceEdit>(
        localize('fileRenameFail', 'Error while renaming')
      );
    }
    return this.updateLocs(r.body.locs, n);
  }

  async execRename(
    d: vsc.TextDocument,
    p: vsc.Position,
    ct: vsc.CancellationToken
  ): Promise<qs.ServerResponse.Response<proto.RenameResponse> | undefined> {
    const f = this.client.toOpenedPath(d);
    if (!f) return;
    const args: proto.RenameRequestArgs = {
      ...qc.Position.toFileLocationRequestArgs(f, p),
      findInStrings: false,
      findInComments: false,
    };
    return this.client.interruptGetErr(() => {
      this.configs.ensureConfigurationForDocument(d, ct);
      return this.client.execute('rename', args, ct);
    });
  }

  private updateLocs(gs: ReadonlyArray<proto.SpanGroup>, n: string) {
    const e = new vsc.WorkspaceEdit();
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
    ct: vsc.CancellationToken
  ): Promise<vsc.WorkspaceEdit | undefined> {
    if (!path.extname(n)) n += path.extname(f);
    const d = path.dirname(f);
    const p = path.join(d, n);
    const args: proto.GetEditsForFileRenameRequestArgs & { file: string } = {
      file: f,
      oldFilePath: f,
      newFilePath: p,
    };
    const r = await this.client.execute('getEditsForFileRename', args, ct);
    if (r.type !== 'response' || !r.body) return;
    const es = qc.WorkspaceEdit.fromFileCodeEdits(this.client, r.body);
    es.renameFile(vsc.Uri.file(f), vsc.Uri.file(p));
    return es;
  }
}

export function register(s: vsc.DocumentSelector, c: qs.IServiceClient, cs: FileConfigs) {
  return vsc.languages.registerRenameProvider(s, new TypeScriptRenameProvider(c, cs));
}
