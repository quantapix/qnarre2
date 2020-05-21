import * as vsc from 'vscode';
import type * as proto from '../protocol';

import * as qs from '../service';
import * as qr from '../utils/registration';
import * as qc from '../utils/convert';

class SmartSelection implements vsc.SelectionRangeProvider {
  static readonly minApi = qr.API.default;

  public constructor(private readonly client: qs.IServiceClient) {}

  async provideSelectionRanges(
    d: vsc.TextDocument,
    ps: vsc.Position[],
    ct: vsc.CancellationToken
  ): Promise<vsc.SelectionRange[] | undefined> {
    const file = this.client.toOpenedPath(d);
    if (!file) return;
    const args: proto.SelectionRangeRequestArgs = {
      file,
      locations: ps.map(qc.Position.toLocation),
    };
    const r = await this.client.execute('selectionRange', args, ct);
    if (r.type !== 'response' || !r.body) return;
    return r.body.map(convert);
  }
}

function convert(r: proto.SelectionRange): vsc.SelectionRange {
  return new vsc.SelectionRange(
    qc.Range.fromTextSpan(r.textSpan),
    r.parent ? convert(r.parent) : undefined
  );
}

export function register(s: vsc.DocumentSelector, c: qs.IServiceClient) {
  return new qr.VersionDependent(c, SmartSelection.minApi, () =>
    vsc.languages.registerSelectionRangeProvider(s, new SmartSelection(c))
  );
}
