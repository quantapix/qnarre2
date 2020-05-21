import * as vscode from 'vscode';
import type * as proto from '../protocol';
import * as cproto from '../protocol.const';
import * as qs from '../service';
import API from '../utils/api';
import * as fileSchemes from '../utils/fileSchemes';
import {
  doesResourceLookLikeAJavaScriptFile,
  doesResourceLookLikeATypeScriptFile,
} from '../utils/language';
import * as qc from '../utils/convert';

class WorkspaceSymbol implements vscode.WorkspaceSymbolProvider {
  constructor(
    private readonly client: IServiceClient,
    private readonly modes: readonly string[]
  ) {}

  async provideWorkspaceSymbols(
    search: string,
    ct: vscode.CancellationToken
  ): Promise<vscode.SymbolInformation[]> {
    let file: string | undefined;
    if (this.searchAllOpenProjects) {
      file = undefined;
    } else {
      const document = this.document();
      file = document ? await this.openedPath(document) : undefined;

      if (!file && this.client.api.lt(API.v390)) {
        return [];
      }
    }

    const args: proto.NavtoRequestArgs = {
      file,
      searchValue: search,
      maxResultCount: 256,
    };

    const response = await this.client.execute('navto', args, token);
    if (response.type !== 'response' || !response.body) {
      return [];
    }

    return response.body
      .filter((n) => n.containerName || n.kind !== 'alias')
      .map((n) => this.symbolInfo(n));
  }

  private get searchAllOpenProjects() {
    return (
      this.client.api.gte(API.v390) &&
      vscode.workspace
        .getConfiguration('typescript')
        .get('workspaceSymbols.scope', 'allOpenProjects') === 'allOpenProjects'
    );
  }

  private async openedPath(document: vscode.TextDocument) {
    if (document.uri.scheme === fileSchemes.git) {
      try {
        const p = vscode.Uri.file(JSON.parse(document.uri.query)?.p);
        if (
          doesResourceLookLikeATypeScriptFile(p) ||
          doesResourceLookLikeAJavaScriptFile(p)
        ) {
          const document = await vscode.workspace.openTextDocument(p);
          return this.client.toOpenedPath(document);
        }
      } catch {}
    }
    return this.client.toOpenedPath(document);
  }

  private symbolInfo(n: proto.NavtoItem) {
    const l = WorkspaceSymbol.label(n);
    return new vscode.SymbolInformation(
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
    const d = vscode.window.activeTextEditor?.document;
    if (d) {
      if (this.modes.includes(d.languageId)) return d;
    }
    const ds = vscode.workspace.textDocuments;
    for (const d of ds) {
      if (this.modes.includes(d.languageId)) return d;
    }
    return;
  }
}

function symbolKind(n: proto.NavtoItem): vscode.SymbolKind {
  switch (n.kind) {
    case cproto.Kind.method:
      return vscode.SymbolKind.Method;
    case cproto.Kind.enum:
      return vscode.SymbolKind.Enum;
    case cproto.Kind.enumMember:
      return vscode.SymbolKind.EnumMember;
    case cproto.Kind.function:
      return vscode.SymbolKind.Function;
    case cproto.Kind.class:
      return vscode.SymbolKind.Class;
    case cproto.Kind.interface:
      return vscode.SymbolKind.Interface;
    case cproto.Kind.type:
      return vscode.SymbolKind.Class;
    case cproto.Kind.memberVariable:
      return vscode.SymbolKind.Field;
    case cproto.Kind.memberGetAccessor:
      return vscode.SymbolKind.Field;
    case cproto.Kind.memberSetAccessor:
      return vscode.SymbolKind.Field;
    case cproto.Kind.variable:
      return vscode.SymbolKind.Variable;
    default:
      return vscode.SymbolKind.Variable;
  }
}

export function register(c: IServiceClient, modes: readonly string[]) {
  return vscode.languages.registerWorkspaceSymbolProvider(new WorkspaceSymbol(c, modes));
}
