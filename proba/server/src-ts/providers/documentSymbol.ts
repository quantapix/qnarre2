import * as vscode from 'vscode';
import type * as proto from '../protocol';
import * as cproto from '../protocol.const';
import { IServiceClient } from '../service';
import * as qc from '../utils/convert';
import { CachedResponse } from '../server';

const getSymbolKind = (kind: string): vscode.SymbolKind => {
  switch (kind) {
    case cproto.Kind.module:
      return vscode.SymbolKind.Module;
    case cproto.Kind.class:
      return vscode.SymbolKind.Class;
    case cproto.Kind.enum:
      return vscode.SymbolKind.Enum;
    case cproto.Kind.interface:
      return vscode.SymbolKind.Interface;
    case cproto.Kind.method:
      return vscode.SymbolKind.Method;
    case cproto.Kind.memberVariable:
      return vscode.SymbolKind.Property;
    case cproto.Kind.memberGetAccessor:
      return vscode.SymbolKind.Property;
    case cproto.Kind.memberSetAccessor:
      return vscode.SymbolKind.Property;
    case cproto.Kind.variable:
      return vscode.SymbolKind.Variable;
    case cproto.Kind.const:
      return vscode.SymbolKind.Variable;
    case cproto.Kind.localVariable:
      return vscode.SymbolKind.Variable;
    case cproto.Kind.function:
      return vscode.SymbolKind.Function;
    case cproto.Kind.localFunction:
      return vscode.SymbolKind.Function;
    case cproto.Kind.constructSignature:
      return vscode.SymbolKind.Constructor;
    case cproto.Kind.constructorImplementation:
      return vscode.SymbolKind.Constructor;
  }
  return vscode.SymbolKind.Variable;
};

class DocumentSymbol implements vscode.DocumentSymbolProvider {
  constructor(
    private readonly client: IServiceClient,
    private cached: CachedResponse<proto.NavTreeResponse>
  ) {}

  async provideDocumentSymbols(
    document: vscode.TextDocument,
    ct: vscode.CancellationToken
  ): Promise<vscode.DocumentSymbol[] | undefined> {
    const file = this.client.toOpenedPath(document);
    if (!file) return;
    const args: proto.FileRequestArgs = { file };
    const response = await this.cached.execute(document, () =>
      this.client.execute('navtree', args, ct)
    );
    if (response.type !== 'response' || !response.body?.childItems) return;
    const result: vscode.DocumentSymbol[] = [];
    for (const item of response.body.childItems) {
      DocumentSymbol.convertNavTree(document.uri, result, item);
    }
    return result;
  }

  private static convertNavTree(
    resource: vscode.Uri,
    output: vscode.DocumentSymbol[],
    item: proto.NavigationTree
  ): boolean {
    let shouldInclude = DocumentSymbol.shouldInclueEntry(item);
    if (!shouldInclude && !item.childItems?.length) return false;
    const children = new Set(item.childItems || []);
    for (const span of item.spans) {
      const range = qc.Range.fromTextSpan(span);
      const selectionRange = item.nameSpan ? qc.Range.fromTextSpan(item.nameSpan) : range;
      const symbolInfo = new vscode.DocumentSymbol(
        item.text,
        '',
        getSymbolKind(item.kind),
        range,
        range.contains(selectionRange) ? selectionRange : range
      );
      for (const child of children) {
        if (
          child.spans.some((span) => !!range.intersection(qc.Range.fromTextSpan(span)))
        ) {
          const includedChild = DocumentSymbol.convertNavTree(
            resource,
            symbolInfo.children,
            child
          );
          shouldInclude = shouldInclude || includedChild;
          children.delete(child);
        }
      }
      if (shouldInclude) output.push(symbolInfo);
    }
    return shouldInclude;
  }

  private static shouldInclueEntry(
    item: proto.NavigationTree | proto.NavigationBarItem
  ): boolean {
    if (item.kind === cproto.Kind.alias) return false;
    return !!(item.text && item.text !== '<function>' && item.text !== '<class>');
  }
}

export function register(
  s: vscode.DocumentSelector,
  c: IServiceClient,
  cached: CachedResponse<proto.NavTreeResponse>
) {
  return vscode.languages.registerDocumentSymbolProvider(
    s,
    new DocumentSymbol(c, cached),
    { label: 'TypeScript' }
  );
}
