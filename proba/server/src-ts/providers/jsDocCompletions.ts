/* eslint-disable @typescript-eslint/prefer-regexp-exec */
import * as vsc from 'vscode';
import * as nls from 'vscode-nls';

import * as qc from '../utils/convert';
import * as qr from '../utils/registration';
import * as qs from '../service';

const localize = nls.loadMessageBundle();

const defaultJsDoc = new vsc.SnippetString(`/**\n * $0\n */`);

class JsDocCompletionItem extends vsc.CompletionItem {
  constructor(
    public readonly document: vsc.TextDocument,
    public readonly position: vsc.Position
  ) {
    super('/** */', vsc.CompletionItemKind.Snippet);
    this.detail = localize(
      'typescript.jsDocCompletionItem.documentation',
      'JSDoc comment'
    );
    this.sortText = '\0';

    const line = document.lineAt(position.line).text;
    const prefix = line.slice(0, position.character).match(/\/\**\s*$/);
    const suffix = line.slice(position.character).match(/^\s*\**\//);
    const start = position.translate(0, prefix ? -prefix[0].length : 0);
    const range = new vsc.Range(
      start,
      position.translate(0, suffix ? suffix[0].length : 0)
    );
    this.range = { inserting: range, replacing: range };
  }
}

class JsDocCompletionProvider implements vsc.CompletionItemProvider {
  constructor(private readonly client: qs.IServiceClient) {}

  public async provideCompletionItems(
    document: vsc.TextDocument,
    position: vsc.Position,
    ct: vsc.CancellationToken
  ): Promise<vsc.CompletionItem[] | undefined> {
    const file = this.client.toOpenedPath(document);
    if (!file) return;
    if (!this.isPotentiallyValidDocCompletionPosition(document, position)) return;
    const args = qc.Position.toFileLocationRequestArgs(file, position);
    const response = await this.client.execute('docCommentTemplate', args, ct);
    if (response.type !== 'response' || !response.body) return;
    const item = new JsDocCompletionItem(document, position);
    if (response.body.newText === '/** */') {
      item.insertText = defaultJsDoc;
    } else {
      item.insertText = templateToSnippet(response.body.newText);
    }
    return [item];
  }

  private isPotentiallyValidDocCompletionPosition(
    document: vsc.TextDocument,
    position: vsc.Position
  ): boolean {
    const line = document.lineAt(position.line).text;
    const prefix = line.slice(0, position.character);
    if (!/^\s*$|\/\*\*\s*$|^\s*\/\*\*+\s*$/.test(prefix)) return false;
    const suffix = line.slice(position.character);
    return /^\s*(\*+\/)?\s*$/.test(suffix);
  }
}

export function templateToSnippet(template: string): vsc.SnippetString {
  let snippetIndex = 1;
  template = template.replace(/\$/g, '\\$');
  template = template.replace(/^\s*(?=(\/|[ ]\*))/gm, '');
  template = template.replace(/^(\/\*\*\s*\*[ ]*)$/m, (x) => x + `$0`);
  template = template.replace(
    /\* @param([ ]\{\S+\})?\s+(\S+)\s*$/gm,
    (_param, type, post) => {
      let out = '* @param ';
      if (type === ' {any}' || type === ' {*}') {
        out += `{$\{${snippetIndex++}:*}} `;
      } else if (type) {
        out += type + ' ';
      }
      out += post + ` \${${snippetIndex++}}`;
      return out;
    }
  );
  return new vsc.SnippetString(template);
}

export function register(s: vsc.DocumentSelector, lang: string, c: qs.IServiceClient) {
  return new qr.ConfigDependent(lang, 'suggest.completeJSDocs', () => {
    return vsc.languages.registerCompletionItemProvider(
      s,
      new JsDocCompletionProvider(c),
      '*'
    );
  });
}
