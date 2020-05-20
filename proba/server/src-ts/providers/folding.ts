import * as vscode from 'vscode';
import type * as proto from '../protocol';
import * as qc from '../utils/convert';
import { IServiceClient } from '../service';
import { coalesce } from '../utils';
import { VersionDependentRegistration } from '../utils/dependentRegistration';

class Folding implements vscode.FoldingRangeProvider {
  static readonly minVersion = API.v280;

  constructor(private readonly client: IServiceClient) {}

  async provideFoldingRanges(
    d: vscode.TextDocument,
    _: vscode.FoldingContext,
    ct: vscode.CancellationToken
  ): Promise<vscode.FoldingRange[] | undefined> {
    const file = this.client.toOpenedPath(d);
    if (!file) return;
    const args: proto.FileRequestArgs = { file };
    const r = await this.client.execute('getOutliningSpans', args, ct);
    if (r.type !== 'response' || !r.body) return;
    return coalesce(r.body.map((span) => this.convertOutliningSpan(span, d)));
  }

  private convertOutliningSpan(
    o: proto.OutliningSpan,
    d: vscode.TextDocument
  ): vscode.FoldingRange | undefined {
    const r = qc.Range.fromTextSpan(o.textSpan);
    const kind = Folding.foldingRangeKind(o);
    if (o.kind === 'comment') {
      const l = d.lineAt(r.start.line).text;
      if (l.match(/\/\/\s*#endregion/gi)) return;
    }
    const s = r.start.line;
    const e =
      r.end.character > 0 &&
      ['}', ']'].includes(d.getText(new vscode.Range(r.end.translate(0, -1), r.end)))
        ? Math.max(r.end.line - 1, r.start.line)
        : r.end.line;
    return new vscode.FoldingRange(s, e, kind);
  }

  private static foldingRangeKind(
    s: proto.OutliningSpan
  ): vscode.FoldingRangeKind | undefined {
    switch (s.kind) {
      case 'comment':
        return vscode.FoldingRangeKind.Comment;
      case 'region':
        return vscode.FoldingRangeKind.Region;
      case 'imports':
        return vscode.FoldingRangeKind.Imports;
      case 'code':
      default:
        return;
    }
  }
}

export function register(
  s: vscode.DocumentSelector,
  c: IServiceClient
): vscode.Disposable {
  return new VersionDependentRegistration(c, Folding.minVersion, () => {
    return vscode.languages.registerFoldingRangeProvider(s, new Folding(c));
  });
}
