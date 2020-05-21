import * as vsc from 'vscode';
import type * as proto from '../protocol';

import * as qs from '../service';
import * as qu from '../utils';
import * as qc from '../utils/convert';

class DocumentHighlight implements vsc.DocumentHighlightProvider {
  public constructor(private readonly client: qs.IServiceClient) {}

  public async provideDocumentHighlights(
    d: vsc.TextDocument,
    p: vsc.Position,
    ct: vsc.CancellationToken
  ): Promise<vsc.DocumentHighlight[]> {
    const f = this.client.toOpenedPath(d);
    if (!f) return [];
    const args = {
      ...qc.Position.toFileLocationRequestArgs(f, p),
      filesToSearch: [f],
    };
    const r = await this.client.execute('documentHighlights', args, ct);
    if (r.type !== 'response' || !r.body) return [];
    return qu.flatten(r.body.filter((h) => h.file === f).map(convert));
  }
}

function convert(h: proto.DocumentHighlightsItem): ReadonlyArray<vsc.DocumentHighlight> {
  return h.highlightSpans.map(
    (s) =>
      new vsc.DocumentHighlight(
        qc.Range.fromTextSpan(s),
        s.kind === 'writtenReference'
          ? vsc.DocumentHighlightKind.Write
          : vsc.DocumentHighlightKind.Read
      )
  );
}

export function register(s: vsc.DocumentSelector, c: qs.IServiceClient) {
  return vsc.languages.registerDocumentHighlightProvider(s, new DocumentHighlight(c));
}
