/* eslint-disable @typescript-eslint/prefer-regexp-exec */
import * as vsc from 'vscode';
import * as nls from 'vscode-nls';
import * as qs from '../service';

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

class DirectiveCompletion implements vsc.CompletionItemProvider {
  constructor(private readonly client: qs.IServiceClient) {}

  public provideCompletionItems(
    document: vsc.TextDocument,
    position: vsc.Position,
    _ct: vsc.CancellationToken
  ): vsc.CompletionItem[] {
    const file = this.client.toOpenedPath(document);
    if (!file) return [];
    const line = document.lineAt(position.line).text;
    const prefix = line.slice(0, position.character);
    const match = prefix.match(/^\s*\/\/+\s?(@[a-zA-Z-]*)?$/);
    if (match) {
      const directives = tsDirectives;
      return directives.map((directive) => {
        const item = new vsc.CompletionItem(
          directive.value,
          vsc.CompletionItemKind.Snippet
        );
        item.detail = directive.description;
        item.range = new vsc.Range(
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

export function register(s: vsc.DocumentSelector, c: qs.IServiceClient) {
  return vsc.languages.registerCompletionItemProvider(s, new DirectiveCompletion(c), '@');
}
