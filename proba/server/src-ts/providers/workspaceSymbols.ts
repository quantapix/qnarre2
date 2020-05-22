import * as cproto from '../protocol.const';
import * as vsc from 'vscode';
import type * as proto from '../protocol';

import * as qs from '../service';
import * as qr from '../utils/registration';
import * as qx from '../utils/extras';
import {
  doesResourceLookLikeAJavaScriptFile,
  doesResourceLookLikeATypeScriptFile,
} from '../utils/language';
import * as qc from '../utils/convert';

class WorkspaceSymbol implements vsc.WorkspaceSymbolProvider {
  constructor(
    private readonly client: qs.IServiceClient,
    private readonly modes: readonly string[]
  ) {}

  async provideWorkspaceSymbols(
    search: string,
    ct: vsc.CancellationToken
  ): Promise<vsc.SymbolInformation[]> {
    let file: string | undefined;
    if (this.searchAllOpenProjects) file = undefined;
    else {
      const document = this.document();
      file = document ? await this.openedPath(document) : undefined;
    }
    const args: proto.NavtoRequestArgs = {
      file,
      searchValue: search,
      maxResultCount: 256,
    };
    const response = await this.client.execute('navto', args, ct);
    if (response.type !== 'response' || !response.body) return [];
    return response.body
      .filter((n) => n.containerName || n.kind !== 'alias')
      .map((n) => this.symbolInfo(n));
  }

  private get searchAllOpenProjects() {
    return (
      vsc.workspace
        .getConfiguration('typescript')
        .get('workspaceSymbols.scope', 'allOpenProjects') === 'allOpenProjects'
    );
  }

  private async openedPath(document: vsc.TextDocument) {
    if (document.uri.scheme === qx.git) {
      try {
        const p = vsc.Uri.file(JSON.parse(document.uri.query)?.p);
        if (
          doesResourceLookLikeATypeScriptFile(p) ||
          doesResourceLookLikeAJavaScriptFile(p)
        ) {
          const document = await vsc.workspace.openTextDocument(p);
          return this.client.toOpenedPath(document);
        }
      } catch {}
    }
    return this.client.toOpenedPath(document);
  }

  private symbolInfo(n: proto.NavtoItem) {
    const l = WorkspaceSymbol.label(n);
    return new vsc.SymbolInformation(
      l,
      symbolKind(n),
      n.containerName || '',
      qc.Location.fromTextSpan(this.client.toResource(n.file), n)
    );
  }

  private static label(n: proto.NavtoItem) {
    const l = n.name;
    if (n.kind === 'method' || n.kind === 'function') return l + '()';
    return l;
  }

  private document() {
    const d = vsc.window.activeTextEditor?.document;
    if (d) if (this.modes.includes(d.languageId)) return d;

    const ds = vsc.workspace.textDocuments;
    for (const d of ds) {
      if (this.modes.includes(d.languageId)) return d;
    }
    return;
  }
}

function symbolKind(n: proto.NavtoItem): vsc.SymbolKind {
  switch (n.kind) {
    case cproto.Kind.method:
      return vsc.SymbolKind.Method;
    case cproto.Kind.enum:
      return vsc.SymbolKind.Enum;
    case cproto.Kind.enumMember:
      return vsc.SymbolKind.EnumMember;
    case cproto.Kind.function:
      return vsc.SymbolKind.Function;
    case cproto.Kind.class:
      return vsc.SymbolKind.Class;
    case cproto.Kind.interface:
      return vsc.SymbolKind.Interface;
    case cproto.Kind.type:
      return vsc.SymbolKind.Class;
    case cproto.Kind.memberVariable:
      return vsc.SymbolKind.Field;
    case cproto.Kind.memberGetAccessor:
      return vsc.SymbolKind.Field;
    case cproto.Kind.memberSetAccessor:
      return vsc.SymbolKind.Field;
    case cproto.Kind.variable:
      return vsc.SymbolKind.Variable;
    default:
      return vsc.SymbolKind.Variable;
  }
}

export function register(c: qs.IServiceClient, langs: readonly string[]) {
  return vsc.languages.registerWorkspaceSymbolProvider(new WorkspaceSymbol(c, langs));
}
