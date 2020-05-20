/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import type * as Proto from '../protocol';
import { IServiceClient } from '../typescriptService';
import API from '../utils/api';
import { VersionDependentRegistration } from '../utils/dependentRegistration';
import * as typeConverters from '../utils/convert';

class SmartSelection implements vscode.SelectionRangeProvider {
  public static readonly minVersion = API.v350;

  public constructor(private readonly client: IServiceClient) {}

  public async provideSelectionRanges(
    document: vscode.TextDocument,
    positions: vscode.Position[],
    ct: vscode.CancellationToken
  ): Promise<vscode.SelectionRange[] | undefined> {
    const file = this.client.toOpenedPath(document);
    if (!file) {
      return;
    }

    const args: Proto.SelectionRangeRequestArgs = {
      file,
      locations: positions.map(typeConverters.Position.toLocation),
    };
    const response = await this.client.execute('selectionRange', args, token);
    if (response.type !== 'response' || !response.body) {
      return;
    }
    return response.body.map(SmartSelection.convertSelectionRange);
  }

  private static convertSelectionRange(
    selectionRange: Proto.SelectionRange
  ): vscode.SelectionRange {
    return new vscode.SelectionRange(
      typeConverters.Range.fromTextSpan(selectionRange.textSpan),
      selectionRange.parent
        ? SmartSelection.convertSelectionRange(selectionRange.parent)
        : undefined
    );
  }
}

export function register(selector: vscode.DocumentSelector, client: IServiceClient) {
  return new VersionDependentRegistration(client, SmartSelection.minVersion, () =>
    vscode.languages.registerSelectionRangeProvider(selector, new SmartSelection(client))
  );
}
