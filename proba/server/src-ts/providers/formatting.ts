import * as vscode from 'vscode';
import type * as proto from '../protocol';
import * as qc from '../utils/convert';
import { ITypeScriptServiceClient } from '../service';
import { ConfigurationDependentRegistration } from '../utils/dependentRegistration';
import FileConfigs from './configs';

class Formatting
  implements
    vscode.DocumentRangeFormattingEditProvider,
    vscode.OnTypeFormattingEditProvider {
  constructor(
    private readonly client: ITypeScriptServiceClient,
    private readonly configs: FileConfigs
  ) {}

  async provideDocumentRangeFormattingEdits(
    d: vscode.TextDocument,
    range: vscode.Range,
    opts: vscode.FormattingOptions,
    ct: vscode.CancellationToken
  ): Promise<vscode.TextEdit[] | undefined> {
    const f = this.client.toOpenedFilePath(d);
    if (!f) return;
    await this.configs.ensureConfigurationOptions(d, opts, ct);
    const args = qc.Range.toFormatRequestArgs(f, range);
    const r = await this.client.execute('format', args, ct);
    if (r.type !== 'response' || !r.body) return;
    return r.body.map(qc.TextEdit.fromCodeEdit);
  }

  async provideOnTypeFormattingEdits(
    d: vscode.TextDocument,
    p: vscode.Position,
    ch: string,
    opts: vscode.FormattingOptions,
    ct: vscode.CancellationToken
  ): Promise<vscode.TextEdit[]> {
    const f = this.client.toOpenedFilePath(d);
    if (!f) return [];
    await this.configs.ensureConfigurationOptions(d, opts, ct);
    const args: proto.FormatOnKeyRequestArgs = {
      ...qc.Position.toFileLocationRequestArgs(f, p),
      key: ch,
    };
    const res = await this.client.execute('formatonkey', args, ct);
    if (res.type !== 'response' || !res.body) return [];
    const es: vscode.TextEdit[] = [];
    for (const e of res.body) {
      const te = qc.TextEdit.fromCodeEdit(e);
      const r = te.range;
      if (r.start.character === 0 && r.start.line === r.end.line && te.newText === '') {
        const t = d.lineAt(r.start.line).text;
        if (t.trim().length > 0 || t.length > r.end.character) es.push(te);
      } else es.push(te);
    }
    return es;
  }
}

export function register(
  s: vscode.DocumentSelector,
  mode: string,
  c: ITypeScriptServiceClient,
  cs: FileConfigs
) {
  return new ConfigurationDependentRegistration(mode, 'format.enable', () => {
    const f = new Formatting(c, cs);
    return vscode.Disposable.from(
      vscode.languages.registerOnTypeFormattingEditProvider(s, f, ';', '}', '\n'),
      vscode.languages.registerDocumentRangeFormattingEditProvider(s, f)
    );
  });
}
