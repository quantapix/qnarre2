import * as vsc from 'vscode';
import type * as proto from '../protocol';

import * as qc from '../utils/convert';
import * as qr from '../utils/registration';
import * as qs from '../service';
import * as qu from '../utils';

class FoldingRange implements vsc.FoldingRangeProvider {
  static readonly minApi = qr.API.default;

  constructor(private readonly client: qs.IServiceClient) {}

  async provideFoldingRanges(
    d: vsc.TextDocument,
    _: vsc.FoldingContext,
    ct: vsc.CancellationToken
  ): Promise<vsc.FoldingRange[] | undefined> {
    const file = this.client.toOpenedPath(d);
    if (!file) return;
    const args: proto.FileRequestArgs = { file };
    const r = await this.client.execute('getOutliningSpans', args, ct);
    if (r.type !== 'response' || !r.body) return;
    return qu.coalesce(r.body.map((span) => this.outliningSpan(span, d)));
  }

  private outliningSpan(
    o: proto.OutliningSpan,
    d: vsc.TextDocument
  ): vsc.FoldingRange | undefined {
    const r = qc.Range.fromTextSpan(o.textSpan);
    const k = foldingRangeKind(o);
    if (o.kind === 'comment') {
      const l = d.lineAt(r.start.line).text;
      if (l.match(/\/\/\s*#endregion/gi)) return;
    }
    const s = r.start.line;
    const e =
      r.end.character > 0 &&
      ['}', ']'].includes(d.getText(new vsc.Range(r.end.translate(0, -1), r.end)))
        ? Math.max(r.end.line - 1, r.start.line)
        : r.end.line;
    return new vsc.FoldingRange(s, e, k);
  }
}

function foldingRangeKind(s: proto.OutliningSpan): vsc.FoldingRangeKind | undefined {
  switch (s.kind) {
    case 'comment':
      return vsc.FoldingRangeKind.Comment;
    case 'region':
      return vsc.FoldingRangeKind.Region;
    case 'imports':
      return vsc.FoldingRangeKind.Imports;
    case 'code':
    default:
      return;
  }
}

export function register(s: vsc.DocumentSelector, c: qs.IServiceClient): vsc.Disposable {
  return new qr.VersionDependent(c, FoldingRange.minApi, () => {
    return vsc.languages.registerFoldingRangeProvider(s, new FoldingRange(c));
  });
}
