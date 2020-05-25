import * as vsc from 'vscode';
import * as nls from 'vscode-nls';

import * as qc from '../utils/convert';
import * as qr from '../utils/registration';
import * as qs from '../service';

const localize = nls.loadMessageBundle();

const defaultJsDoc = new vsc.SnippetString(`/**\n * $0\n */`);

class CompletionItem extends vsc.CompletionItem {
  constructor(public readonly doc: vsc.TextDocument, public readonly pos: vsc.Position) {
    super('/** */', vsc.CompletionItemKind.Snippet);
    this.detail = localize(
      'typescript.jsDocCompletionItem.documentation',
      'JSDoc comment'
    );
    this.sortText = '\0';
    const line = doc.lineAt(pos.line).text;
    const pre = /\/\**\s*$/.exec(line.slice(0, pos.character));
    const suf = /^\s*\**\//.exec(line.slice(pos.character));
    const s = pos.translate(0, pre ? -pre[0].length : 0);
    const r = new vsc.Range(s, pos.translate(0, suf ? suf[0].length : 0));
    this.range = { inserting: r, replacing: r };
  }
}

class Completion implements vsc.CompletionItemProvider {
  constructor(private readonly client: qs.IServiceClient) {}

  async provideCompletionItems(
    d: vsc.TextDocument,
    p: vsc.Position,
    ct: vsc.CancellationToken
  ): Promise<vsc.CompletionItem[] | undefined> {
    const f = this.client.toOpenedPath(d);
    if (!f) return;
    if (!this.isValidPosition(d, p)) return;
    const args = qc.Position.toFileLocationRequestArgs(f, p);
    const r = await this.client.execute('docCommentTemplate', args, ct);
    if (r.type !== 'response' || !r.body) return;
    const i = new CompletionItem(d, p);
    if (r.body.newText === '/** */') i.insertText = defaultJsDoc;
    else i.insertText = toSnippet(r.body.newText);
    return [i];
  }

  private isValidPosition(d: vsc.TextDocument, p: vsc.Position) {
    const line = d.lineAt(p.line).text;
    const pre = line.slice(0, p.character);
    if (!/^\s*$|\/\*\*\s*$|^\s*\/\*\*+\s*$/.test(pre)) return false;
    const suf = line.slice(p.character);
    return /^\s*(\*+\/)?\s*$/.test(suf);
  }
}

export function toSnippet(templ: string) {
  let i = 1;
  templ = templ.replace(/\$/g, '\\$');
  templ = templ.replace(/^\s*(?=(\/|[ ]\*))/gm, '');
  templ = templ.replace(/^(\/\*\*\s*\*[ ]*)$/m, (x) => x + `$0`);
  templ = templ.replace(/\* @param([ ]\{\S+\})?\s+(\S+)\s*$/gm, (_param, type, post) => {
    let r = '* @param ';
    if (type === ' {any}' || type === ' {*}') r += `{$\{${i++}:*}} `;
    else if (type) r += type + ' ';
    r += post + ` \${${i++}}`;
    return r;
  });
  return new vsc.SnippetString(templ);
}

export function register(s: vsc.DocumentSelector, lang: string, c: qs.IServiceClient) {
  return new qr.ConfigDependent(lang, 'suggest.completeJSDocs', () => {
    return vsc.languages.registerCompletionItemProvider(s, new Completion(c), '*');
  });
}
