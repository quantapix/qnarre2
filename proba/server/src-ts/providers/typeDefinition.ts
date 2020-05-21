import * as vsc from 'vscode';

import { DefBase } from './definition';
import * as qs from '../service';

class TypeDefinition extends DefBase implements vsc.TypeDefinitionProvider {
  public provideTypeDefinition(
    d: vsc.TextDocument,
    p: vsc.Position,
    ct: vsc.CancellationToken
  ): Promise<vsc.Definition | undefined> {
    return this.symbolLocations('typeDefinition', d, p, ct);
  }
}

export function register(s: vsc.DocumentSelector, c: qs.IServiceClient) {
  return vsc.languages.registerTypeDefinitionProvider(s, new TypeDefinition(c));
}
