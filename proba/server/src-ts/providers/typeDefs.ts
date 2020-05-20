import * as vscode from 'vscode';
import { IServiceClient } from '../service';
import DefBase from './definition';

class TypeDefinition extends DefBase implements vscode.TypeDefinitionProvider {
  public provideTypeDefinition(
    d: vscode.TextDocument,
    p: vscode.Position,
    ct: vscode.CancellationToken
  ): Promise<vscode.Definition | undefined> {
    return this.symbolLocations('typeDefinition', d, p, ct);
  }
}

export function register(s: vscode.DocumentSelector, c: IServiceClient) {
  return vscode.languages.registerTypeDefinitionProvider(s, new TypeDefinition(c));
}
