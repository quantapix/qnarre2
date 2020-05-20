import * as vscode from 'vscode';
import type * as Proto from '../protocol';
import { IServiceClient } from '../typescriptService';
import { flatten } from '../utils/arrays';
import * as typeConverters from '../utils/convert';

class TypeScriptDocumentHighlightProvider implements vscode.DocumentHighlightProvider {
  public constructor(private readonly client: IServiceClient) {}

  public async provideDocumentHighlights(
    document: vscode.TextDocument,
    position: vscode.Position,
    ct: vscode.CancellationToken
  ): Promise<vscode.DocumentHighlight[]> {
    const file = this.client.toOpenedPath(document);
    if (!file) {
      return [];
    }

    const args = {
      ...typeConverters.Position.toFileLocationRequestArgs(file, position),
      filesToSearch: [file],
    };
    const response = await this.client.execute('documentHighlights', args, token);
    if (response.type !== 'response' || !response.body) {
      return [];
    }

    return flatten(
      response.body
        .filter((highlight) => highlight.file === file)
        .map(convertDocumentHighlight)
    );
  }
}

function convertDocumentHighlight(
  highlight: Proto.DocumentHighlightsItem
): ReadonlyArray<vscode.DocumentHighlight> {
  return highlight.highlightSpans.map(
    (span) =>
      new vscode.DocumentHighlight(
        typeConverters.Range.fromTextSpan(span),
        span.kind === 'writtenReference'
          ? vscode.DocumentHighlightKind.Write
          : vscode.DocumentHighlightKind.Read
      )
  );
}

export function register(selector: vscode.DocumentSelector, client: IServiceClient) {
  return vscode.languages.registerDocumentHighlightProvider(
    selector,
    new TypeScriptDocumentHighlightProvider(client)
  );
}
