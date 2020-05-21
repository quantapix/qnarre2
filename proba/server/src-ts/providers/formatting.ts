import * as vsc from 'vscode';
import type * as proto from '../protocol';

import { FileConfigs } from './configs';
import * as qc from '../utils/convert';
import * as qr from '../utils/registration';
import * as qs from '../service';

class Formatting
  implements vsc.DocumentRangeFormattingEditProvider, vsc.OnTypeFormattingEditProvider {
  constructor(
    private readonly client: qs.IServiceClient,
    private readonly configs: FileConfigs
  ) {}

  async provideDocumentRangeFormattingEdits(
    d: vsc.TextDocument,
    range: vsc.Range,
    opts: vsc.FormattingOptions,
    ct: vsc.CancellationToken
  ): Promise<vsc.TextEdit[] | undefined> {
    const f = this.client.toOpenedPath(d);
    if (!f) return;
    await this.configs.ensureConfigurationOptions(d, opts, ct);
    const args = qc.Range.toFormatRequestArgs(f, range);
    const r = await this.client.execute('format', args, ct);
    if (r.type !== 'response' || !r.body) return;
    return r.body.map(qc.TextEdit.fromCodeEdit);
  }

  async provideOnTypeFormattingEdits(
    d: vsc.TextDocument,
    p: vsc.Position,
    ch: string,
    opts: vsc.FormattingOptions,
    ct: vsc.CancellationToken
  ): Promise<vsc.TextEdit[]> {
    const f = this.client.toOpenedPath(d);
    if (!f) return [];
    await this.configs.ensureConfigurationOptions(d, opts, ct);
    const args: proto.FormatOnKeyRequestArgs = {
      ...qc.Position.toFileLocationRequestArgs(f, p),
      key: ch,
    };
    const res = await this.client.execute('formatonkey', args, ct);
    if (res.type !== 'response' || !res.body) return [];
    const es: vsc.TextEdit[] = [];
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
  s: vsc.DocumentSelector,
  lang: string,
  c: qs.IServiceClient,
  cs: FileConfigs
) {
  return new qr.ConfigDependent(lang, 'format.enable', () => {
    const f = new Formatting(c, cs);
    return vsc.Disposable.from(
      vsc.languages.registerOnTypeFormattingEditProvider(s, f, ';', '}', '\n'),
      vsc.languages.registerDocumentRangeFormattingEditProvider(s, f)
    );
  });
}
