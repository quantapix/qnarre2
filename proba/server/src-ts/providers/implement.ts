import * as vscode from 'vscode';
import { ITypeScriptServiceClient } from '../service';
import DefBase from './definition';

class Implementation extends DefBase implements vscode.ImplementationProvider {
  public provideImplementation(
    d: vscode.TextDocument,
    p: vscode.Position,
    ct: vscode.CancellationToken
  ): Promise<vscode.Definition | undefined> {
    return this.symbolLocations('implementation', d, p, ct);
  }
}

export function register(s: vscode.DocumentSelector, c: ITypeScriptServiceClient) {
  return vscode.languages.registerImplementationProvider(s, new Implementation(c));
}
