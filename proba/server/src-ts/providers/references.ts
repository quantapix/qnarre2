/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IServiceClient } from '../typescriptService';
import * as typeConverters from '../utils/convert';

class TypeScriptReferenceSupport implements vscode.ReferenceProvider {
  public constructor(private readonly client: IServiceClient) {}

  public async provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    options: vscode.ReferenceContext,
    ct: vscode.CancellationToken
  ): Promise<vscode.Location[]> {
    const filepath = this.client.toOpenedPath(document);
    if (!filepath) {
      return [];
    }

    const args = typeConverters.Position.toFileLocationRequestArgs(filepath, position);
    const response = await this.client.execute('references', args, token);
    if (response.type !== 'response' || !response.body) {
      return [];
    }

    const result: vscode.Location[] = [];
    for (const ref of response.body.refs) {
      if (!options.includeDeclaration && ref.isDefinition) {
        continue;
      }
      const url = this.client.toResource(ref.file);
      const location = typeConverters.Location.fromTextSpan(url, ref);
      result.push(location);
    }
    return result;
  }
}

export function register(selector: vscode.DocumentSelector, client: IServiceClient) {
  return vscode.languages.registerReferenceProvider(
    selector,
    new TypeScriptReferenceSupport(client)
  );
}
