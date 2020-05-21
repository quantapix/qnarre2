import * as vscode from 'vscode';
import type * as proto from '../protocol';
import { IServiceClient } from '../service';
import { API } from '../utils/api';
import { VersionDependentRegistration } from '../utils/registration';
import * as qc from '../utils/convert';

class SmartSelection implements vscode.SelectionRangeProvider {
  static readonly minVersion = API.v350;

  public constructor(private readonly client: IServiceClient) {}

  async provideSelectionRanges(
    d: vscode.TextDocument,
    ps: vscode.Position[],
    ct: vscode.CancellationToken
  ): Promise<vscode.SelectionRange[] | undefined> {
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

function convert(r: proto.SelectionRange): vscode.SelectionRange {
  return new vscode.SelectionRange(
    qc.Range.fromTextSpan(r.textSpan),
    r.parent ? convert(r.parent) : undefined
  );
}

export function register(s: vscode.DocumentSelector, c: IServiceClient) {
  return new VersionDependentRegistration(c, SmartSelection.minVersion, () =>
    vscode.languages.registerSelectionRangeProvider(s, new SmartSelection(c))
  );
}
