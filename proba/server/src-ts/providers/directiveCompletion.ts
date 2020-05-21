/* eslint-disable @typescript-eslint/prefer-regexp-exec */
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { IServiceClient } from '../service';

const localize = nls.loadMessageBundle();

interface Directive {
  readonly value: string;
  readonly description: string;
}

const tsDirectives: Directive[] = [
  {
    value: '@ts-check',
    description: localize(
      'ts-check',
      'Enables semantic checking in a JavaScript file. Must be at the top of a file.'
    ),
  },
  {
    value: '@ts-nocheck',
    description: localize(
      'ts-nocheck',
      'Disables semantic checking in a JavaScript file. Must be at the top of a file.'
    ),
  },
  {
    value: '@ts-ignore',
    description: localize(
      'ts-ignore',
      'Suppresses @ts-check errors on the next line of a file.'
    ),
  },
  {
    value: '@ts-expect-error',
    description: localize(
      'ts-expect-error',
      'Suppresses @ts-check errors on the next line of a file, expecting at least one to exist.'
    ),
  },
];

class DirectiveCompletion implements vscode.CompletionItemProvider {
  constructor(private readonly client: IServiceClient) {}

  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _ct: vscode.CancellationToken
  ): vscode.CompletionItem[] {
    const file = this.client.toOpenedPath(document);
    if (!file) return [];
    const line = document.lineAt(position.line).text;
    const prefix = line.slice(0, position.character);
    const match = prefix.match(/^\s*\/\/+\s?(@[a-zA-Z-]*)?$/);
    if (match) {
      const directives = tsDirectives;
      return directives.map((directive) => {
        const item = new vscode.CompletionItem(
          directive.value,
          vscode.CompletionItemKind.Snippet
        );
        item.detail = directive.description;
        item.range = new vscode.Range(
          position.line,
          Math.max(0, position.character - (match[1] ? match[1].length : 0)),
          position.line,
          position.character
        );
        return item;
      });
    }
    return [];
  }
}

export function register(s: vscode.DocumentSelector, c: IServiceClient) {
  return vscode.languages.registerCompletionItemProvider(
    s,
    new DirectiveCompletion(c),
    '@'
  );
}
