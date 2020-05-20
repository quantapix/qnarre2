/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import type * as Proto from '../protocol';
import { IServiceClient } from '../typescriptService';
import { markdownDocumentation } from '../utils/previewer';
import * as typeConverters from '../utils/convert';

class TypeScriptHoverProvider implements vscode.HoverProvider {
  public constructor(private readonly client: IServiceClient) {}

  public async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    ct: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    const filepath = this.client.toOpenedPath(document);
    if (!filepath) {
      return;
    }

    const args = typeConverters.Position.toFileLocationRequestArgs(filepath, position);
    const response = await this.client.interruptGetErr(() =>
      this.client.execute('quickinfo', args, token)
    );
    if (response.type !== 'response' || !response.body) {
      return;
    }

    return new vscode.Hover(
      TypeScriptHoverProvider.getContents(response.body),
      typeConverters.Range.fromTextSpan(response.body)
    );
  }

  private static getContents(data: Proto.QuickInfoResponseBody) {
    const parts = [];

    if (data.displayString) {
      parts.push({ language: 'typescript', value: data.displayString });
    }
    parts.push(markdownDocumentation(data.documentation, data.tags));
    return parts;
  }
}

export function register(
  selector: vscode.DocumentSelector,
  client: IServiceClient
): vscode.Disposable {
  return vscode.languages.registerHoverProvider(
    selector,
    new TypeScriptHoverProvider(client)
  );
}
