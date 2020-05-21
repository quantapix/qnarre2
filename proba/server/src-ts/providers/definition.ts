import * as vsc from 'vscode';

import * as qs from '../service';
import * as qc from '../utils/convert';

export class DefBase {
  constructor(protected readonly client: qs.IServiceClient) {}

  protected async symbolLocations(
    t: 'definition' | 'implementation' | 'typeDefinition',
    d: vsc.TextDocument,
    p: vsc.Position,
    ct: vsc.CancellationToken
  ): Promise<vsc.Location[] | undefined> {
    const f = this.client.toOpenedPath(d);
    if (!f) return;
    const args = qc.Position.toFileLocationRequestArgs(f, p);
    const r = await this.client.execute(t, args, ct);
    if (r.type !== 'response' || !r.body) return;
    return r.body.map((l) => qc.Location.fromTextSpan(this.client.toResource(l.file), l));
  }
}

class Definition extends DefBase implements vsc.DefinitionProvider {
  async provideDefinition(
    d: vsc.TextDocument,
    p: vsc.Position,
    ct: vsc.CancellationToken
  ): Promise<vsc.DefinitionLink[] | vsc.Definition | undefined> {
    const f = this.client.toOpenedPath(d);
    if (!f) return;
    const args = qc.Position.toFileLocationRequestArgs(f, p);
    const r = await this.client.execute('definitionAndBoundSpan', args, ct);
    if (r.type !== 'response' || !r.body) return;
    const s = r.body.textSpan ? qc.Range.fromTextSpan(r.body.textSpan) : undefined;
    return r.body.definitions.map(
      (l): vsc.DefinitionLink => {
        const t = qc.Location.fromTextSpan(this.client.toResource(l.file), l);
        if (l.contextStart) {
          return {
            originSelectionRange: s,
            targetRange: qc.Range.fromLocations(l.contextStart, l.contextEnd),
            targetUri: t.uri,
            targetSelectionRange: t.range,
          };
        }
        return {
          originSelectionRange: s,
          targetRange: t.range,
          targetUri: t.uri,
        };
      }
    );
  }
}

export function register(s: vsc.DocumentSelector, c: qs.IServiceClient) {
  return vsc.languages.registerDefinitionProvider(s, new Definition(c));
}
