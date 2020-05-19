import * as vscode from 'vscode';
import { ITypeScriptServiceClient } from '../service';
import * as qc from '../utils/convert';

export default class DefBase {
  constructor(protected readonly client: ITypeScriptServiceClient) {}

  protected async symbolLocations(
    t: 'definition' | 'implementation' | 'typeDefinition',
    d: vscode.TextDocument,
    p: vscode.Position,
    ct: vscode.CancellationToken
  ): Promise<vscode.Location[] | undefined> {
    const f = this.client.toOpenedFilePath(d);
    if (!f) return;
    const args = qc.Position.toFileLocationRequestArgs(f, p);
    const r = await this.client.execute(t, args, ct);
    if (r.type !== 'response' || !r.body) return;
    return r.body.map((l) => qc.Location.fromTextSpan(this.client.toResource(l.file), l));
  }
}

class Definition extends DefBase implements vscode.DefinitionProvider {
  constructor(client: ITypeScriptServiceClient) {
    super(client);
  }

  async provideDefinition(
    d: vscode.TextDocument,
    p: vscode.Position,
    ct: vscode.CancellationToken
  ): Promise<vscode.DefinitionLink[] | vscode.Definition | undefined> {
    const f = this.client.toOpenedFilePath(d);
    if (!f) return;
    const args = qc.Position.toFileLocationRequestArgs(f, p);
    const r = await this.client.execute('definitionAndBoundSpan', args, ct);
    if (r.type !== 'response' || !r.body) return;
    const s = r.body.textSpan ? qc.Range.fromTextSpan(r.body.textSpan) : undefined;
    return r.body.definitions.map(
      (l): vscode.DefinitionLink => {
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

export function register(s: vscode.DocumentSelector, c: ITypeScriptServiceClient) {
  return vscode.languages.registerDefinitionProvider(s, new Definition(c));
}
