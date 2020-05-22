import * as vsc from 'vscode';
import * as nls from 'vscode-nls';
import * as qs from '../service';

const localize = nls.loadMessageBundle();

interface Directive {
  readonly value: string;
  readonly desc: string;
}

const tsDirectives: Directive[] = [
  {
    value: '@ts-check',
    desc: localize('ts-check', 'Enables semantic checking at the top of a file.'),
  },
  {
    value: '@ts-nocheck',
    desc: localize('ts-nocheck', 'Disables semantic checking.'),
  },
  {
    value: '@ts-ignore',
    desc: localize('ts-ignore', 'Suppresses @ts-check errors on the next line.'),
  },
  {
    value: '@ts-expect-error',
    desc: localize('ts-expect-error', 'Suppresses at least one @ts-check error.'),
  },
];

class DirectiveCompletion implements vsc.CompletionItemProvider {
  constructor(private readonly client: qs.IServiceClient) {}

  public provideCompletionItems(
    t: vsc.TextDocument,
    p: vsc.Position,
    _ct: vsc.CancellationToken
  ): vsc.CompletionItem[] {
    const f = this.client.toOpenedPath(t);
    if (!f) return [];
    const l = t.lineAt(p.line).text;
    const pre = l.slice(0, p.character);
    const m = /^\s*\/\/+\s?(@[a-zA-Z-]*)?$/.exec(pre);
    if (m) {
      const ds = tsDirectives;
      return ds.map((d) => {
        const i = new vsc.CompletionItem(d.value, vsc.CompletionItemKind.Snippet);
        i.detail = d.desc;
        i.range = new vsc.Range(
          p.line,
          Math.max(0, p.character - (m[1] ? m[1].length : 0)),
          p.line,
          p.character
        );
        return i;
      });
    }
    return [];
  }
}

export function register(s: vsc.DocumentSelector, c: qs.IServiceClient) {
  return vsc.languages.registerCompletionItemProvider(s, new DirectiveCompletion(c), '@');
}
