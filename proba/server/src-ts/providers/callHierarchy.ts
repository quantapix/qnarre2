/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IServiceClient } from '../typescriptService';
import * as typeConverters from '../utils/convert';
import API from '../utils/api';
import { VersionDependentRegistration } from '../utils/dependentRegistration';
import type * as Proto from '../protocol';
import * as path from 'path';
import * as PConst from '../protocol.const';

class TypeScriptCallHierarchySupport implements vscode.CallHierarchyProvider {
  public static readonly minVersion = API.v380;

  public constructor(private readonly client: IServiceClient) {}

  public async prepareCallHierarchy(
    document: vscode.TextDocument,
    position: vscode.Position,
    ct: vscode.CancellationToken
  ): Promise<vscode.CallHierarchyItem | vscode.CallHierarchyItem[] | undefined> {
    const filepath = this.client.toOpenedPath(document);
    if (!filepath) {
      return;
    }

    const args = typeConverters.Position.toFileLocationRequestArgs(filepath, position);
    const response = await this.client.execute('prepareCallHierarchy', args, token);
    if (response.type !== 'response' || !response.body) {
      return;
    }

    return Array.isArray(response.body)
      ? response.body.map(fromProtocolCallHierarchyItem)
      : fromProtocolCallHierarchyItem(response.body);
  }

  public async provideCallHierarchyIncomingCalls(
    item: vscode.CallHierarchyItem,
    ct: vscode.CancellationToken
  ): Promise<vscode.CallHierarchyIncomingCall[] | undefined> {
    const filepath = this.client.toPath(item.uri);
    if (!filepath) {
      return;
    }

    const args = typeConverters.Position.toFileLocationRequestArgs(
      filepath,
      item.selectionRange.start
    );
    const response = await this.client.execute(
      'provideCallHierarchyIncomingCalls',
      args,
      token
    );
    if (response.type !== 'response' || !response.body) {
      return;
    }

    return response.body.map(fromProtocolCallHierchyIncomingCall);
  }

  public async provideCallHierarchyOutgoingCalls(
    item: vscode.CallHierarchyItem,
    ct: vscode.CancellationToken
  ): Promise<vscode.CallHierarchyOutgoingCall[] | undefined> {
    const filepath = this.client.toPath(item.uri);
    if (!filepath) {
      return;
    }

    const args = typeConverters.Position.toFileLocationRequestArgs(
      filepath,
      item.selectionRange.start
    );
    const response = await this.client.execute(
      'provideCallHierarchyOutgoingCalls',
      args,
      token
    );
    if (response.type !== 'response' || !response.body) {
      return;
    }

    return response.body.map(fromProtocolCallHierchyOutgoingCall);
  }
}

function isSourceFileItem(item: Proto.CallHierarchyItem) {
  return (
    item.kind === PConst.Kind.script ||
    (item.kind === PConst.Kind.module &&
      item.selectionSpan.start.line === 1 &&
      item.selectionSpan.start.offset === 1)
  );
}

function fromProtocolCallHierarchyItem(
  item: Proto.CallHierarchyItem
): vscode.CallHierarchyItem {
  const useFileName = isSourceFileItem(item);
  const name = useFileName ? path.basename(item.file) : item.name;
  const detail = useFileName
    ? vscode.workspace.asRelativePath(path.dirname(item.file))
    : '';
  return new vscode.CallHierarchyItem(
    typeConverters.SymbolKind.fromScriptElem(item.kind),
    name,
    detail,
    vscode.Uri.file(item.file),
    typeConverters.Range.fromTextSpan(item.span),
    typeConverters.Range.fromTextSpan(item.selectionSpan)
  );
}

function fromProtocolCallHierchyIncomingCall(
  item: Proto.CallHierarchyIncomingCall
): vscode.CallHierarchyIncomingCall {
  return new vscode.CallHierarchyIncomingCall(
    fromProtocolCallHierarchyItem(item.from),
    item.fromSpans.map(typeConverters.Range.fromTextSpan)
  );
}

function fromProtocolCallHierchyOutgoingCall(
  item: Proto.CallHierarchyOutgoingCall
): vscode.CallHierarchyOutgoingCall {
  return new vscode.CallHierarchyOutgoingCall(
    fromProtocolCallHierarchyItem(item.to),
    item.fromSpans.map(typeConverters.Range.fromTextSpan)
  );
}

export function register(selector: vscode.DocumentSelector, client: IServiceClient) {
  return new VersionDependentRegistration(
    client,
    TypeScriptCallHierarchySupport.minVersion,
    () =>
      vscode.languages.registerCallHierarchyProvider(
        selector,
        new TypeScriptCallHierarchySupport(client)
      )
  );
}
