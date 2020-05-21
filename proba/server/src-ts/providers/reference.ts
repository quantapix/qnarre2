import * as vsc from 'vscode';

import * as qs from '../service';
import * as qc from '../utils/convert';

class Reference implements vsc.ReferenceProvider {
  public constructor(private readonly client: qs.IServiceClient) {}

  public async provideReferences(
    document: vsc.TextDocument,
    position: vsc.Position,
    options: vsc.ReferenceContext,
    ct: vsc.CancellationToken
  ): Promise<vsc.Location[]> {
    const filepath = this.client.toOpenedPath(document);
    if (!filepath) return [];
    const args = qc.Position.toFileLocationRequestArgs(filepath, position);
    const response = await this.client.execute('references', args, ct);
    if (response.type !== 'response' || !response.body) return [];
    const result: vsc.Location[] = [];
    for (const ref of response.body.refs) {
      if (!options.includeDeclaration && ref.isDefinition) continue;
      const url = this.client.toResource(ref.file);
      const location = qc.Location.fromTextSpan(url, ref);
      result.push(location);
    }
    return result;
  }
}

export function register(s: vsc.DocumentSelector, c: qs.IServiceClient) {
  return vsc.languages.registerReferenceProvider(s, new Reference(c));
}
