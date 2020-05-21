import * as vsc from 'vscode';
import type * as proto from '../protocol';

import { mdDocumentation } from '../utils/previewer';
import * as qc from '../utils/convert';
import * as qs from '../service';

class Hover implements vsc.HoverProvider {
  public constructor(private readonly client: qs.IServiceClient) {}

  public async provideHover(
    d: vsc.TextDocument,
    p: vsc.Position,
    ct: vsc.CancellationToken
  ): Promise<vsc.Hover | undefined> {
    const f = this.client.toOpenedPath(d);
    if (!f) return;
    const args = qc.Position.toFileLocationRequestArgs(f, p);
    const r = await this.client.interruptGetErr(() =>
      this.client.execute('quickinfo', args, ct)
    );
    if (r.type !== 'response' || !r.body) return;
    return new vsc.Hover(Hover.contents(r.body), qc.Range.fromTextSpan(r.body));
  }

  private static contents(b: proto.QuickInfoResponseBody) {
    const ps = [];
    if (b.displayString) ps.push({ language: 'typescript', value: b.displayString });
    ps.push(mdDocumentation(b.documentation, b.tags));
    return ps;
  }
}

export function register(s: vsc.DocumentSelector, c: qs.IServiceClient): vsc.Disposable {
  return vsc.languages.registerHoverProvider(s, new Hover(c));
}
