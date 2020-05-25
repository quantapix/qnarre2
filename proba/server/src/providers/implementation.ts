import * as vsc from 'vscode';

import { DefBase } from './definition';
import * as qs from '../service';

class Implementation extends DefBase implements vsc.ImplementationProvider {
  public provideImplementation(
    d: vsc.TextDocument,
    p: vsc.Position,
    ct: vsc.CancellationToken
  ): Promise<vsc.Definition | undefined> {
    return this.symbolLocations('implementation', d, p, ct);
  }
}

export function register(s: vsc.DocumentSelector, c: qs.IServiceClient) {
  return vsc.languages.registerImplementationProvider(s, new Implementation(c));
}
